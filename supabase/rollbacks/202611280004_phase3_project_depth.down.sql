-- Rollback for 202611280004_phase3_project_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_optimistic_pm_client_portal_reviews ON public.pm_client_portal_reviews;
DROP TRIGGER IF EXISTS trg_optimistic_pm_timesheets ON public.pm_timesheets;
DROP TRIGGER IF EXISTS trg_audit_pm_client_portal_reviews ON public.pm_client_portal_reviews;
DROP TRIGGER IF EXISTS trg_audit_pm_timesheets ON public.pm_timesheets;

DROP FUNCTION IF EXISTS public.pm_approve_milestone_for_billing(uuid, numeric, uuid, bigint);
DROP FUNCTION IF EXISTS public.pm_record_deliverable_review_with_limit(uuid, text, text, text, boolean);

DROP TABLE IF EXISTS public.pm_client_portal_reviews;
DROP TABLE IF EXISTS public.pm_timesheets;

ALTER TABLE public.pm_expenses
  DROP COLUMN IF EXISTS missing_receipt_override_reason,
  DROP COLUMN IF EXISTS missing_receipt_flagged;

ALTER TABLE public.pm_bat_deliverables
  DROP CONSTRAINT IF EXISTS chk_pm_bat_deliverable_kind,
  DROP CONSTRAINT IF EXISTS chk_pm_bat_revision_bounds,
  DROP COLUMN IF EXISTS deliverable_kind,
  DROP COLUMN IF EXISTS client_feedback,
  DROP COLUMN IF EXISTS client_approved_by_name,
  DROP COLUMN IF EXISTS client_approved_at,
  DROP COLUMN IF EXISTS client_portal_token,
  DROP COLUMN IF EXISTS max_revision_loops,
  DROP COLUMN IF EXISTS revision_count;

ALTER TABLE public.pm_milestones
  DROP CONSTRAINT IF EXISTS chk_pm_milestones_pct,
  DROP CONSTRAINT IF EXISTS chk_pm_milestones_approval_status,
  DROP CONSTRAINT IF EXISTS chk_pm_milestones_amount,
  DROP COLUMN IF EXISTS depends_on_milestone_id,
  DROP COLUMN IF EXISTS invoiced_document_id,
  DROP COLUMN IF EXISTS invoiced_amount_dzd,
  DROP COLUMN IF EXISTS approved_pct,
  DROP COLUMN IF EXISTS approval_status,
  DROP COLUMN IF EXISTS billing_pct,
  DROP COLUMN IF EXISTS amount_dzd,
  DROP COLUMN IF EXISTS start_date;

ALTER TABLE public.pm_projects
  DROP CONSTRAINT IF EXISTS chk_pm_projects_max_rev,
  DROP CONSTRAINT IF EXISTS chk_pm_projects_alert_threshold,
  DROP CONSTRAINT IF EXISTS chk_pm_projects_fx_rate,
  DROP CONSTRAINT IF EXISTS chk_pm_projects_currency,
  DROP COLUMN IF EXISTS max_revision_loops,
  DROP COLUMN IF EXISTS is_non_print_preset,
  DROP COLUMN IF EXISTS budget_alert_threshold_pct,
  DROP COLUMN IF EXISTS fx_rate_to_dzd,
  DROP COLUMN IF EXISTS currency;

COMMIT;
