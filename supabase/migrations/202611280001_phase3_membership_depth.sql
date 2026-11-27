-- ============================================================================
-- Atrium Phase 3 Migration (Step 1): Section 7.1 Membership Depth
-- Auto-Renewal, Family/Couple Grouping, Freeze/Resume Logs, QR Pass Tokens &
-- Coach/Trainer Payroll Commissions
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 7.1a Extend gym_members with additive Phase 3 subscription & freeze fields
-- ----------------------------------------------------------------------------
ALTER TABLE public.gym_members
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_cycle_days integer,
  ADD COLUMN IF NOT EXISTS family_group_id text,
  ADD COLUMN IF NOT EXISTS family_role text
    CHECK (family_role IS NULL OR family_role IN ('primary', 'dependent')),
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS freeze_until timestamptz,
  ADD COLUMN IF NOT EXISTS freeze_days_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_fee_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_reason text,
  ADD COLUMN IF NOT EXISTS qr_token text;

CREATE INDEX IF NOT EXISTS idx_gym_members_family_group
  ON public.gym_members (business_id, family_group_id)
  WHERE family_group_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gym_members_auto_renew
  ON public.gym_members (business_id, auto_renew, expiration_date)
  WHERE auto_renew = true AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 7.1b Freeze & Resume Audit Ledger (`gym_member_freeze_logs`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_member_freeze_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
  staff_id uuid,
  action text NOT NULL CHECK (action IN ('freeze', 'resume')),
  days_frozen integer NOT NULL DEFAULT 0 CHECK (days_frozen >= 0),
  fee_centimes bigint NOT NULL DEFAULT 0 CHECK (fee_centimes >= 0),
  extended_expiry_to date,
  during_active_checkin_window boolean NOT NULL DEFAULT false,
  override_reason text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gym_member_freeze_logs_member
  ON public.gym_member_freeze_logs (member_id, recorded_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.gym_member_freeze_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gym_member_freeze_logs_tenant_read" ON public.gym_member_freeze_logs;
CREATE POLICY "gym_member_freeze_logs_tenant_read"
  ON public.gym_member_freeze_logs
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "gym_member_freeze_logs_tenant_write" ON public.gym_member_freeze_logs;
CREATE POLICY "gym_member_freeze_logs_tenant_write"
  ON public.gym_member_freeze_logs
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.1c Coach / Trainer Payroll Commissions (`gym_trainer_commissions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_trainer_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.gym_members(id) ON DELETE SET NULL,
  schedule_event_id uuid REFERENCES public.gym_schedule_events(id) ON DELETE SET NULL,
  source_label text NOT NULL,
  gross_amount_centimes bigint NOT NULL DEFAULT 0 CHECK (gross_amount_centimes >= 0),
  commission_rate_bps integer NOT NULL DEFAULT 0 CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  commission_centimes bigint NOT NULL DEFAULT 0 CHECK (commission_centimes >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted_to_payroll', 'cancelled')),
  payroll_run_id uuid REFERENCES public.staff_payroll_runs(id) ON DELETE SET NULL,
  earned_date date NOT NULL DEFAULT CURRENT_DATE,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gym_trainer_commissions_staff_status
  ON public.gym_trainer_commissions (business_id, staff_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.gym_trainer_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gym_trainer_commissions_tenant_read" ON public.gym_trainer_commissions;
CREATE POLICY "gym_trainer_commissions_tenant_read"
  ON public.gym_trainer_commissions
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "gym_trainer_commissions_tenant_write" ON public.gym_trainer_commissions;
CREATE POLICY "gym_trainer_commissions_tenant_write"
  ON public.gym_trainer_commissions
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.1d Transactional RPC for Class Enrollment Cancellation + Waitlist Promotion
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_and_promote_gym_class_enrollment(
  p_enrollment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target record;
  v_promoted record;
BEGIN
  SELECT id, business_id, branch_id, event_id, status
  INTO v_target
  FROM public.gym_class_enrollments
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASS_ENROLLMENT_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_target.business_id, v_target.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF v_target.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'cancelled_id', v_target.id,
      'promoted_id', NULL,
      'already_cancelled', true
    );
  END IF;

  UPDATE public.gym_class_enrollments
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now(),
      version = version + 1
  WHERE id = v_target.id;

  IF v_target.status = 'enrolled' THEN
    SELECT id, member_id, member_name
    INTO v_promoted
    FROM public.gym_class_enrollments
    WHERE event_id = v_target.event_id
      AND status = 'waitlisted'
      AND deleted_at IS NULL
    ORDER BY enrolled_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.gym_class_enrollments
      SET status = 'enrolled',
          updated_at = now(),
          version = version + 1
      WHERE id = v_promoted.id;

      RETURN jsonb_build_object(
        'cancelled_id', v_target.id,
        'promoted_id', v_promoted.id,
        'promoted_member_id', v_promoted.member_id
      );
    ELSE
      UPDATE public.gym_schedule_events
      SET enrolled_count = GREATEST(0, enrolled_count - 1),
          updated_at = now(),
          version = version + 1
      WHERE id = v_target.event_id
        AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'cancelled_id', v_target.id,
    'promoted_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_and_promote_gym_class_enrollment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_and_promote_gym_class_enrollment(uuid) TO authenticated;

-- Attach audit triggers when immutable audit trigger function is present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'gym_member_freeze_logs',
      'gym_trainer_commissions'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl,
          v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
