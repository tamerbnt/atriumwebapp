-- ============================================================================
-- Atrium Step 7b Rollback: Revert Payroll, Attendance & Advances SoT Hardening
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.approve_payroll_run(uuid, boolean, uuid[], uuid[]);

DROP TRIGGER IF EXISTS trg_00_staff_salary_advances_immutable ON public.staff_salary_advances;
DROP FUNCTION IF EXISTS public.fn_protect_salary_advance_transitions();

DROP TRIGGER IF EXISTS trg_00_staff_payroll_slips_immutable ON public.staff_payroll_slips;
DROP FUNCTION IF EXISTS public.fn_protect_immutable_payroll_slips();

DROP TRIGGER IF EXISTS trg_00_staff_payroll_runs_immutable ON public.staff_payroll_runs;
DROP FUNCTION IF EXISTS public.fn_protect_immutable_payroll_runs();

ALTER TABLE public.staff_payroll_slips
  DROP COLUMN IF EXISTS rate_snapshot,
  DROP COLUMN IF EXISTS rate_basis,
  DROP COLUMN IF EXISTS rate_set_id;

DROP INDEX IF EXISTS public.idx_staff_payroll_runs_period_unique;

ALTER TABLE public.staff_payroll_runs
  DROP CONSTRAINT IF EXISTS chk_staff_payroll_runs_adjustment_seq;

ALTER TABLE public.staff_payroll_runs
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS adjustment_seq,
  DROP COLUMN IF EXISTS run_type,
  DROP COLUMN IF EXISTS rate_snapshot,
  DROP COLUMN IF EXISTS rate_basis,
  DROP COLUMN IF EXISTS rate_set_id;

DROP TRIGGER IF EXISTS trg_00_staff_attendance_logs_append_only ON public.staff_attendance_logs;
DROP FUNCTION IF EXISTS public.fn_protect_append_only_attendance_logs();

ALTER TABLE public.staff_attendance_logs
  DROP COLUMN IF EXISTS entered_by_name,
  DROP COLUMN IF EXISTS entered_by,
  DROP COLUMN IF EXISTS source;

COMMIT;
