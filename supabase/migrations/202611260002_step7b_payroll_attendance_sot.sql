-- ============================================================================
-- Atrium Step 7b Migration: Payroll, Attendance & Advances Source-of-Truth
-- Items:
--   2.1 staff_attendance_logs provenance (source, entered_by, entered_by_name)
--       + append-only trigger blocking UPDATE/DELETE
--   2.2 staff_payroll_runs & staff_payroll_slips rate_set_id, rate_basis,
--       rate_snapshot, run_type, adjustment_seq, approved_by
--   2.3 Partial unique period index (business_id, branch_id, period_year,
--       period_month, run_type, adjustment_seq) WHERE deleted_at IS NULL
--   2.4 Immutability triggers on approved/paid runs, slips & settled advances
--   2.5 Transactional approve_payroll_run(...) RPC (draft -> approved/paid +
--       atomic pending -> deducted/waived advance transitions)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 2.1 Attendance Logs Provenance + Append-Only Enforcement
-- ----------------------------------------------------------------------------
ALTER TABLE public.staff_attendance_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'kiosk',
  ADD COLUMN IF NOT EXISTS entered_by uuid,
  ADD COLUMN IF NOT EXISTS entered_by_name text;

UPDATE public.staff_attendance_logs
SET source = method
WHERE source = 'kiosk'
  AND method IS NOT NULL
  AND method <> 'kiosk';

CREATE OR REPLACE FUNCTION public.fn_protect_append_only_attendance_logs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'STAFF_ATTENDANCE_APPEND_ONLY'
    USING ERRCODE = '42501',
          DETAIL = 'staff_attendance_logs is strictly append-only; record a compensating entry instead of modifying or deleting historical punches.';
END;
$$;

DROP TRIGGER IF EXISTS trg_00_staff_attendance_logs_append_only ON public.staff_attendance_logs;
CREATE TRIGGER trg_00_staff_attendance_logs_append_only
  BEFORE UPDATE OR DELETE ON public.staff_attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_append_only_attendance_logs();

-- ----------------------------------------------------------------------------
-- 2.2 Payroll Runs & Slips Statutory Snapshot + Adjustment Versioning
-- ----------------------------------------------------------------------------
ALTER TABLE public.staff_payroll_runs
  ADD COLUMN IF NOT EXISTS rate_set_id uuid REFERENCES public.statutory_rates(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS rate_basis text NOT NULL DEFAULT 'versioned' CHECK (rate_basis IN ('legacy', 'versioned')),
  ADD COLUMN IF NOT EXISTS rate_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS run_type text NOT NULL DEFAULT 'regular' CHECK (run_type IN ('regular', 'adjustment')),
  ADD COLUMN IF NOT EXISTS adjustment_seq int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

UPDATE public.staff_payroll_runs
SET rate_basis = 'legacy'
WHERE rate_set_id IS NULL
  AND rate_basis = 'versioned'
  AND rate_snapshot IS NULL;

ALTER TABLE public.staff_payroll_runs
  DROP CONSTRAINT IF EXISTS chk_staff_payroll_runs_adjustment_seq;
ALTER TABLE public.staff_payroll_runs
  ADD CONSTRAINT chk_staff_payroll_runs_adjustment_seq
  CHECK (
    (run_type = 'regular' AND adjustment_seq = 0)
    OR (run_type = 'adjustment' AND adjustment_seq > 0)
  );

-- Re-sequence any historical duplicate active regular runs into adjustment sequences
-- before creating the partial unique index so pre-Step 7b data is preserved intact.
WITH ranked_runs AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY business_id, branch_id, period_year, period_month, run_type, adjustment_seq
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.staff_payroll_runs
  WHERE deleted_at IS NULL
)
UPDATE public.staff_payroll_runs spr
SET run_type = 'adjustment',
    adjustment_seq = r.rn - 1
FROM ranked_runs r
WHERE spr.id = r.id
  AND r.rn > 1
  AND spr.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_payroll_runs_period_unique
  ON public.staff_payroll_runs (business_id, branch_id, period_year, period_month, run_type, adjustment_seq)
  WHERE deleted_at IS NULL;

ALTER TABLE public.staff_payroll_slips
  ADD COLUMN IF NOT EXISTS rate_set_id uuid REFERENCES public.statutory_rates(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS rate_basis text NOT NULL DEFAULT 'versioned' CHECK (rate_basis IN ('legacy', 'versioned')),
  ADD COLUMN IF NOT EXISTS rate_snapshot jsonb;

UPDATE public.staff_payroll_slips
SET rate_basis = 'legacy'
WHERE rate_set_id IS NULL
  AND rate_basis = 'versioned'
  AND rate_snapshot IS NULL;

-- ----------------------------------------------------------------------------
-- 2.3 Immutability Triggers for Payroll Runs, Slips & Salary Advances
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_immutable_payroll_runs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mark_paid_only boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved', 'paid') THEN
      RAISE EXCEPTION 'PAYROLL_RUN_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Approved or paid payroll runs cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status NOT IN ('approved', 'paid') THEN
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'PAYROLL_RUN_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Approved or paid payroll runs cannot be soft-deleted.';
  END IF;

  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'PAYROLL_RUN_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Paid payroll runs are permanently immutable.';
  END IF;

  -- When OLD.status = 'approved', allow ONLY status transition 'approved' -> 'paid'
  -- with every financial, period, statutory, and structural column untouched.
  v_mark_paid_only :=
    NEW.status = 'paid'
    AND NEW.account_id IS NOT DISTINCT FROM OLD.account_id
    AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id
    AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
    AND NEW.category IS NOT DISTINCT FROM OLD.category
    AND NEW.period_month IS NOT DISTINCT FROM OLD.period_month
    AND NEW.period_year IS NOT DISTINCT FROM OLD.period_year
    AND NEW.title IS NOT DISTINCT FROM OLD.title
    AND NEW.total_gross_cotisable IS NOT DISTINCT FROM OLD.total_gross_cotisable
    AND NEW.total_cnas_salarial IS NOT DISTINCT FROM OLD.total_cnas_salarial
    AND NEW.total_cnas_patronal IS NOT DISTINCT FROM OLD.total_cnas_patronal
    AND NEW.total_irg IS NOT DISTINCT FROM OLD.total_irg
    AND NEW.total_net IS NOT DISTINCT FROM OLD.total_net
    AND NEW.slips_count IS NOT DISTINCT FROM OLD.slips_count
    AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at
    AND NEW.approved_by IS NOT DISTINCT FROM OLD.approved_by
    AND NEW.rate_set_id IS NOT DISTINCT FROM OLD.rate_set_id
    AND NEW.rate_basis IS NOT DISTINCT FROM OLD.rate_basis
    AND NEW.rate_snapshot IS NOT DISTINCT FROM OLD.rate_snapshot
    AND NEW.run_type IS NOT DISTINCT FROM OLD.run_type
    AND NEW.adjustment_seq IS NOT DISTINCT FROM OLD.adjustment_seq;

  IF NOT v_mark_paid_only THEN
    RAISE EXCEPTION 'PAYROLL_RUN_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Approved payroll runs only allow transitioning status from approved to paid.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_staff_payroll_runs_immutable ON public.staff_payroll_runs;
CREATE TRIGGER trg_00_staff_payroll_runs_immutable
  BEFORE UPDATE OR DELETE ON public.staff_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_payroll_runs();

CREATE OR REPLACE FUNCTION public.fn_protect_immutable_payroll_slips()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_run_status text;
  v_mark_paid_only boolean := false;
BEGIN
  SELECT spr.status INTO v_run_status
  FROM public.staff_payroll_runs spr
  WHERE spr.id = OLD.payroll_run_id;

  IF TG_OP = 'DELETE' THEN
    IF OLD.is_paid = true OR COALESCE(v_run_status, 'draft') IN ('approved', 'paid') THEN
      RAISE EXCEPTION 'PAYROLL_SLIP_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Paid payslips and slips belonging to approved or paid runs cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_paid = false AND COALESCE(v_run_status, 'draft') NOT IN ('approved', 'paid') THEN
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'PAYROLL_SLIP_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Locked payslips cannot be soft-deleted.';
  END IF;

  IF OLD.is_paid = true THEN
    RAISE EXCEPTION 'PAYROLL_SLIP_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Paid payslips are permanently immutable.';
  END IF;

  -- On an approved unpaid slip, allow ONLY marking is_paid = true and setting paid_date.
  v_mark_paid_only :=
    OLD.is_paid = false
    AND NEW.is_paid = true
    AND NEW.payroll_run_id IS NOT DISTINCT FROM OLD.payroll_run_id
    AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id
    AND NEW.matricule IS NOT DISTINCT FROM OLD.matricule
    AND NEW.staff_full_name IS NOT DISTINCT FROM OLD.staff_full_name
    AND NEW.role IS NOT DISTINCT FROM OLD.role
    AND NEW.period_month IS NOT DISTINCT FROM OLD.period_month
    AND NEW.period_year IS NOT DISTINCT FROM OLD.period_year
    AND NEW.period_label IS NOT DISTINCT FROM OLD.period_label
    AND NEW.base_salary IS NOT DISTINCT FROM OLD.base_salary
    AND NEW.actual_base_salary IS NOT DISTINCT FROM OLD.actual_base_salary
    AND NEW.worked_days IS NOT DISTINCT FROM OLD.worked_days
    AND NEW.standard_days IS NOT DISTINCT FROM OLD.standard_days
    AND NEW.coaching_commission IS NOT DISTINCT FROM OLD.coaching_commission
    AND NEW.primes_cotisables IS NOT DISTINCT FROM OLD.primes_cotisables
    AND NEW.salaire_brut_cotisable IS NOT DISTINCT FROM OLD.salaire_brut_cotisable
    AND NEW.cnas_salarial IS NOT DISTINCT FROM OLD.cnas_salarial
    AND NEW.cnas_patronal IS NOT DISTINCT FROM OLD.cnas_patronal
    AND NEW.salaire_brut_imposable IS NOT DISTINCT FROM OLD.salaire_brut_imposable
    AND NEW.irg_tax IS NOT DISTINCT FROM OLD.irg_tax
    AND NEW.primes_non_imposables IS NOT DISTINCT FROM OLD.primes_non_imposables
    AND NEW.acomptes_deduits IS NOT DISTINCT FROM OLD.acomptes_deduits
    AND NEW.autres_retenues IS NOT DISTINCT FROM OLD.autres_retenues
    AND NEW.net_a_payer IS NOT DISTINCT FROM OLD.net_a_payer
    AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method
    AND NEW.ccp_number IS NOT DISTINCT FROM OLD.ccp_number
    AND NEW.ccp_key IS NOT DISTINCT FROM OLD.ccp_key
    AND NEW.bank_rib IS NOT DISTINCT FROM OLD.bank_rib
    AND NEW.nss IS NOT DISTINCT FROM OLD.nss
    AND NEW.receipt_number IS NOT DISTINCT FROM OLD.receipt_number
    AND NEW.rate_set_id IS NOT DISTINCT FROM OLD.rate_set_id
    AND NEW.rate_basis IS NOT DISTINCT FROM OLD.rate_basis
    AND NEW.rate_snapshot IS NOT DISTINCT FROM OLD.rate_snapshot;

  IF NOT v_mark_paid_only THEN
    RAISE EXCEPTION 'PAYROLL_SLIP_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Approved payslips only allow transitioning is_paid from false to true.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_staff_payroll_slips_immutable ON public.staff_payroll_slips;
CREATE TRIGGER trg_00_staff_payroll_slips_immutable
  BEFORE UPDATE OR DELETE ON public.staff_payroll_slips
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_payroll_slips();

CREATE OR REPLACE FUNCTION public.fn_protect_salary_advance_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('deducted', 'waived') THEN
      RAISE EXCEPTION 'SALARY_ADVANCE_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Deducted or waived salary advances cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('deducted', 'waived') THEN
    RAISE EXCEPTION 'SALARY_ADVANCE_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Deducted or waived salary advances are permanently immutable.';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'deducted' THEN
    IF COALESCE(current_setting('app.payroll_approval_tx', true), '') <> 'on' THEN
      RAISE EXCEPTION 'SALARY_ADVANCE_DIRECT_DEDUCTION_FORBIDDEN'
        USING ERRCODE = '42501',
              DETAIL = 'Pending salary advances can only transition to deducted inside approve_payroll_run().';
    END IF;
    IF NEW.amount_dzd IS DISTINCT FROM OLD.amount_dzd
       OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
       OR NEW.voucher_number IS DISTINCT FROM OLD.voucher_number THEN
      RAISE EXCEPTION 'SALARY_ADVANCE_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Salary advance amount, staff_id, and voucher_number cannot change during deduction.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_staff_salary_advances_immutable ON public.staff_salary_advances;
CREATE TRIGGER trg_00_staff_salary_advances_immutable
  BEFORE UPDATE OR DELETE ON public.staff_salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_salary_advance_transitions();

-- ----------------------------------------------------------------------------
-- 2.4 Transactional approve_payroll_run(...) RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payroll_run(
  p_run_id uuid,
  p_mark_paid boolean DEFAULT false,
  p_advance_ids uuid[] DEFAULT NULL,
  p_waive_advance_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_auth_account uuid := public.get_auth_account_id();
  v_staff_actor uuid := public.get_auth_staff_id();
  v_run record;
  v_period_key text;
  v_target_status text;
  v_approved_at timestamptz := now();
  v_deducted_ids uuid[] := ARRAY[]::uuid[];
  v_waived_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_uid IS NULL OR v_auth_account IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED_PAYROLL_APPROVAL' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_run
  FROM public.staff_payroll_runs
  WHERE id = p_run_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PAYROLL_RUN_NOT_FOUND');
  END IF;

  IF v_run.account_id <> v_auth_account OR NOT public.can_access_branch(v_run.branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF v_run.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'runId', v_run.id,
      'status', 'paid',
      'alreadyApproved', true,
      'alreadyPaid', true,
      'approvedAt', v_run.approved_at,
      'approvedBy', v_run.approved_by,
      'deductedAdvanceIds', to_jsonb(v_deducted_ids),
      'waivedAdvanceIds', to_jsonb(v_waived_ids)
    );
  END IF;

  IF v_run.status = 'approved' THEN
    IF p_mark_paid THEN
      UPDATE public.staff_payroll_runs
      SET status = 'paid',
          updated_at = now(),
          updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
      WHERE id = v_run.id;

      UPDATE public.staff_payroll_slips
      SET is_paid = true,
          paid_date = COALESCE(paid_date, CURRENT_DATE),
          updated_at = now(),
          updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
      WHERE payroll_run_id = v_run.id
        AND is_paid = false
        AND deleted_at IS NULL;

      RETURN jsonb_build_object(
        'success', true,
        'runId', v_run.id,
        'status', 'paid',
        'alreadyApproved', true,
        'approvedAt', v_run.approved_at,
        'approvedBy', v_run.approved_by,
        'deductedAdvanceIds', to_jsonb(v_deducted_ids),
        'waivedAdvanceIds', to_jsonb(v_waived_ids)
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'runId', v_run.id,
      'status', 'approved',
      'alreadyApproved', true,
      'approvedAt', v_run.approved_at,
      'approvedBy', v_run.approved_by,
      'deductedAdvanceIds', to_jsonb(v_deducted_ids),
      'waivedAdvanceIds', to_jsonb(v_waived_ids)
    );
  END IF;

  v_period_key := format('%s-%s', v_run.period_year, lpad(v_run.period_month::text, 2, '0'));
  v_target_status := CASE WHEN p_mark_paid THEN 'paid' ELSE 'approved' END;

  PERFORM set_config('app.payroll_approval_tx', 'on', true);

  IF p_waive_advance_ids IS NOT NULL AND COALESCE(array_length(p_waive_advance_ids, 1), 0) > 0 THEN
    WITH waived AS (
      UPDATE public.staff_salary_advances
      SET status = 'waived',
          updated_at = now(),
          updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
      WHERE id = ANY(p_waive_advance_ids)
        AND branch_id = v_run.branch_id
        AND account_id = v_run.account_id
        AND status = 'pending'
        AND deleted_at IS NULL
      RETURNING id
    )
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_waived_ids FROM waived;
  END IF;

  IF p_advance_ids IS NOT NULL THEN
    IF COALESCE(array_length(p_advance_ids, 1), 0) > 0 THEN
      WITH deducted AS (
        UPDATE public.staff_salary_advances
        SET status = 'deducted',
            deducted_in_period = v_period_key,
            updated_at = now(),
            updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
        WHERE id = ANY(p_advance_ids)
          AND branch_id = v_run.branch_id
          AND account_id = v_run.account_id
          AND status = 'pending'
          AND deleted_at IS NULL
        RETURNING id
      )
      SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_deducted_ids FROM deducted;
    END IF;
  ELSE
    WITH deducted AS (
      UPDATE public.staff_salary_advances adv
      SET status = 'deducted',
          deducted_in_period = v_period_key,
          updated_at = now(),
          updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
      WHERE adv.branch_id = v_run.branch_id
        AND adv.account_id = v_run.account_id
        AND adv.status = 'pending'
        AND adv.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.staff_payroll_slips s
          WHERE s.payroll_run_id = v_run.id
            AND s.staff_id = adv.staff_id
            AND s.acomptes_deduits > 0
            AND s.deleted_at IS NULL
        )
      RETURNING adv.id
    )
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_deducted_ids FROM deducted;
  END IF;

  PERFORM set_config('app.payroll_approval_tx', 'off', true);

  UPDATE public.staff_payroll_runs
  SET status = v_target_status,
      approved_at = COALESCE(approved_at, v_approved_at),
      approved_by = COALESCE(approved_by, v_staff_actor, v_uid),
      updated_at = now(),
      updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
  WHERE id = v_run.id;

  IF p_mark_paid THEN
    UPDATE public.staff_payroll_slips
    SET is_paid = true,
        paid_date = COALESCE(paid_date, CURRENT_DATE),
        updated_at = now(),
        updated_by_staff_id = COALESCE(v_staff_actor, v_uid)
    WHERE payroll_run_id = v_run.id
      AND is_paid = false
      AND deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'runId', v_run.id,
    'status', v_target_status,
    'alreadyApproved', false,
    'approvedAt', v_approved_at,
    'approvedBy', COALESCE(v_staff_actor, v_uid),
    'periodKey', v_period_key,
    'deductedAdvanceIds', to_jsonb(v_deducted_ids),
    'waivedAdvanceIds', to_jsonb(v_waived_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payroll_run(uuid, boolean, uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payroll_run(uuid, boolean, uuid[], uuid[]) TO authenticated;

COMMIT;
