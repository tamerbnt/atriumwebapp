-- ============================================================================
-- Phase 3 Step 4 (7.4): project_milestone Deepening
-- Multi-currency (DZD/EUR/USD + FX), Budget Overrun Thresholds, Non-Print
-- Presets, Milestone Partial-Approval & Billing Links (6.1), Timesheets &
-- Utilization, Deliverable Revision-Loop Limits & Client Approval Portal,
-- Missing-Receipt Compliance Flags, and Transactional SECURITY DEFINER RPCs.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 7.4a Extend pm_projects for multi-currency, alert thresholds, presets & revision cap
-- ----------------------------------------------------------------------------
ALTER TABLE public.pm_projects
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DZD',
  ADD COLUMN IF NOT EXISTS fx_rate_to_dzd numeric(12,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS budget_alert_threshold_pct int NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS is_non_print_preset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_revision_loops int NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_projects_currency') THEN
    ALTER TABLE public.pm_projects
      ADD CONSTRAINT chk_pm_projects_currency CHECK (currency IN ('DZD', 'EUR', 'USD'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_projects_fx_rate') THEN
    ALTER TABLE public.pm_projects
      ADD CONSTRAINT chk_pm_projects_fx_rate CHECK (fx_rate_to_dzd > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_projects_alert_threshold') THEN
    ALTER TABLE public.pm_projects
      ADD CONSTRAINT chk_pm_projects_alert_threshold CHECK (budget_alert_threshold_pct BETWEEN 50 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_projects_max_rev') THEN
    ALTER TABLE public.pm_projects
      ADD CONSTRAINT chk_pm_projects_max_rev CHECK (max_revision_loops BETWEEN 1 AND 20);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.4b Extend pm_milestones for Gantt schedule, partial approval & 6.1 billing
-- ----------------------------------------------------------------------------
ALTER TABLE public.pm_milestones
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS amount_dzd bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_amount_dzd bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_document_id uuid,
  ADD COLUMN IF NOT EXISTS depends_on_milestone_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_milestones_amount') THEN
    ALTER TABLE public.pm_milestones
      ADD CONSTRAINT chk_pm_milestones_amount CHECK (amount_dzd >= 0 AND invoiced_amount_dzd >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_milestones_approval_status') THEN
    ALTER TABLE public.pm_milestones
      ADD CONSTRAINT chk_pm_milestones_approval_status CHECK (approval_status IN ('pending', 'partial_approved', 'approved'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_milestones_pct') THEN
    ALTER TABLE public.pm_milestones
      ADD CONSTRAINT chk_pm_milestones_pct CHECK (billing_pct >= 0 AND billing_pct <= 100 AND approved_pct >= 0 AND approved_pct <= 100);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.4c Extend pm_bat_deliverables for revision loops & Client Approval Portal
-- ----------------------------------------------------------------------------
ALTER TABLE public.pm_bat_deliverables
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_revision_loops int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS client_portal_token text,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_by_name text,
  ADD COLUMN IF NOT EXISTS client_feedback text,
  ADD COLUMN IF NOT EXISTS deliverable_kind text NOT NULL DEFAULT 'print_bat';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_bat_revision_bounds') THEN
    ALTER TABLE public.pm_bat_deliverables
      ADD CONSTRAINT chk_pm_bat_revision_bounds CHECK (revision_count >= 0 AND max_revision_loops >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pm_bat_deliverable_kind') THEN
    ALTER TABLE public.pm_bat_deliverables
      ADD CONSTRAINT chk_pm_bat_deliverable_kind CHECK (deliverable_kind IN ('print_bat', 'digital_asset', 'software_build', 'strategy_deck'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.4d Extend pm_expenses for missing-receipt flagging & Direction override
-- ----------------------------------------------------------------------------
ALTER TABLE public.pm_expenses
  ADD COLUMN IF NOT EXISTS missing_receipt_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_receipt_override_reason text;

-- ----------------------------------------------------------------------------
-- 7.4e Staff Timesheets & Utilization (pm_timesheets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  milestone_id uuid REFERENCES public.pm_milestones(id) ON DELETE SET NULL,
  staff_member_id uuid,
  staff_name text NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  hours_worked numeric(6,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  capacity_hours numeric(6,2) NOT NULL DEFAULT 8 CHECK (capacity_hours > 0 AND capacity_hours <= 24),
  billable boolean NOT NULL DEFAULT true,
  hourly_cost_dzd bigint NOT NULL DEFAULT 0 CHECK (hourly_cost_dzd >= 0),
  hourly_bill_dzd bigint NOT NULL DEFAULT 0 CHECK (hourly_bill_dzd >= 0),
  task_summary text NOT NULL,
  approval_status text NOT NULL DEFAULT 'submitted' CHECK (approval_status IN ('draft', 'submitted', 'approved')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_timesheets_branch_project
  ON public.pm_timesheets (branch_id, project_id, work_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pm_timesheets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_timesheets' AND policyname = 'pm_timesheets_tenant_isolation'
  ) THEN
    CREATE POLICY pm_timesheets_tenant_isolation ON public.pm_timesheets
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.4f Client Portal Reviews (pm_client_portal_reviews)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_client_portal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES public.pm_bat_deliverables(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_requested', 'override_granted')),
  comments text,
  revision_round int NOT NULL DEFAULT 0 CHECK (revision_round >= 0),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_portal_reviews_deliverable
  ON public.pm_client_portal_reviews (branch_id, deliverable_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pm_client_portal_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_client_portal_reviews' AND policyname = 'pm_client_portal_reviews_tenant_isolation'
  ) THEN
    CREATE POLICY pm_client_portal_reviews_tenant_isolation ON public.pm_client_portal_reviews
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.4g Transactional RPC: Client Portal Deliverable Review with Revision Limit
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_record_deliverable_review_with_limit(
  p_deliverable_id uuid,
  p_reviewer_name text,
  p_decision text,
  p_comments text DEFAULT NULL,
  p_override_limit boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bat record;
  v_next_rev int;
  v_review_id uuid;
BEGIN
  IF p_decision NOT IN ('approved', 'revision_requested', 'override_granted') THEN
    RAISE EXCEPTION 'INVALID_PORTAL_DECISION';
  END IF;

  SELECT * INTO v_bat
  FROM public.pm_bat_deliverables
  WHERE id = p_deliverable_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERABLE_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_bat.business_id, v_bat.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_next_rev := COALESCE(v_bat.revision_count, 0);

  IF p_decision = 'revision_requested' THEN
    IF v_next_rev >= COALESCE(v_bat.max_revision_loops, 3) AND NOT COALESCE(p_override_limit, false) THEN
      RAISE EXCEPTION 'REVISION_LOOP_LIMIT_EXCEEDED';
    END IF;
    v_next_rev := v_next_rev + 1;
  END IF;

  INSERT INTO public.pm_client_portal_reviews (
    account_id, business_id, branch_id, project_id, deliverable_id,
    reviewer_name, decision, comments, revision_round
  ) VALUES (
    v_bat.account_id, v_bat.business_id, v_bat.branch_id, v_bat.project_id, v_bat.id,
    COALESCE(NULLIF(trim(COALESCE(p_reviewer_name, '')), ''), 'Client Portal'),
    p_decision,
    NULLIF(trim(COALESCE(p_comments, '')), ''),
    v_next_rev
  ) RETURNING id INTO v_review_id;

  IF p_decision = 'override_granted' THEN
    UPDATE public.pm_bat_deliverables
    SET max_revision_loops = COALESCE(max_revision_loops, 3) + 1,
        client_feedback = NULLIF(trim(COALESCE(p_comments, '')), ''),
        updated_at = now()
    WHERE id = v_bat.id;
  ELSIF p_decision = 'approved' THEN
    UPDATE public.pm_bat_deliverables
    SET approval_status = 'approved',
        client_approved_at = now(),
        client_approved_by_name = COALESCE(NULLIF(trim(COALESCE(p_reviewer_name, '')), ''), 'Client'),
        client_feedback = NULLIF(trim(COALESCE(p_comments, '')), ''),
        updated_at = now()
    WHERE id = v_bat.id;
  ELSE
    UPDATE public.pm_bat_deliverables
    SET approval_status = 'revision_requested',
        revision_count = v_next_rev,
        revision_comments = COALESCE(NULLIF(trim(COALESCE(p_comments, '')), ''), revision_comments),
        client_feedback = NULLIF(trim(COALESCE(p_comments, '')), ''),
        updated_at = now()
    WHERE id = v_bat.id;
  END IF;

  RETURN jsonb_build_object(
    'review_id', v_review_id,
    'deliverable_id', v_bat.id,
    'decision', p_decision,
    'revision_count', v_next_rev,
    'max_revision_loops', CASE WHEN p_decision = 'override_granted' THEN COALESCE(v_bat.max_revision_loops, 3) + 1 ELSE COALESCE(v_bat.max_revision_loops, 3) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pm_record_deliverable_review_with_limit(uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_record_deliverable_review_with_limit(uuid, text, text, text, boolean) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.4h Transactional RPC: Approve Milestone Partial % & Link 6.1 Document
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_approve_milestone_for_billing(
  p_milestone_id uuid,
  p_approved_pct numeric,
  p_invoiced_document_id uuid DEFAULT NULL,
  p_invoiced_amount_dzd bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ms record;
  v_next_status text;
  v_max_allowed bigint;
  v_next_invoiced bigint;
BEGIN
  IF p_approved_pct IS NULL OR p_approved_pct < 0 OR p_approved_pct > 100 THEN
    RAISE EXCEPTION 'INVALID_APPROVED_PCT';
  END IF;

  SELECT * INTO v_ms
  FROM public.pm_milestones
  WHERE id = p_milestone_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MILESTONE_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_ms.business_id, v_ms.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_next_status := CASE
    WHEN p_approved_pct >= 100 THEN 'approved'
    WHEN p_approved_pct > 0 THEN 'partial_approved'
    ELSE 'pending'
  END;

  v_max_allowed := ROUND((COALESCE(v_ms.amount_dzd, 0) * p_approved_pct) / 100.0);
  v_next_invoiced := COALESCE(p_invoiced_amount_dzd, COALESCE(v_ms.invoiced_amount_dzd, 0));

  IF v_ms.amount_dzd > 0 AND v_next_invoiced > v_max_allowed THEN
    RAISE EXCEPTION 'MILESTONE_BILLING_EXCEEDS_APPROVED_PCT';
  END IF;

  UPDATE public.pm_milestones
  SET approved_pct = p_approved_pct,
      approval_status = v_next_status,
      is_completed = CASE WHEN p_approved_pct >= 100 THEN true ELSE is_completed END,
      completed_at = CASE WHEN p_approved_pct >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END,
      invoiced_document_id = COALESCE(p_invoiced_document_id, invoiced_document_id),
      invoiced_amount_dzd = v_next_invoiced,
      updated_at = now()
  WHERE id = v_ms.id;

  RETURN jsonb_build_object(
    'milestone_id', v_ms.id,
    'approval_status', v_next_status,
    'approved_pct', p_approved_pct,
    'invoiced_amount_dzd', v_next_invoiced
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pm_approve_milestone_for_billing(uuid, numeric, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pm_approve_milestone_for_billing(uuid, numeric, uuid, bigint) TO authenticated;

-- Attach optimistic & audit triggers when present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY['pm_timesheets', 'pm_client_portal_reviews'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl, v_tbl
        );
      END IF;
    END LOOP;
  END IF;

  IF to_regprocedure('public.fn_enforce_optimistic_version()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY['pm_timesheets', 'pm_client_portal_reviews'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_optimistic_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_optimistic_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version()',
          v_tbl, v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
