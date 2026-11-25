-- Rollback for 202611250001_step5_stub_actions.sql

REVOKE EXECUTE ON FUNCTION public.mfg_scrap_with_ncr(uuid, uuid, uuid, text, text, text, text, numeric, text, text, uuid, uuid) FROM authenticated;
DROP FUNCTION IF EXISTS public.mfg_scrap_with_ncr(uuid, uuid, uuid, text, text, text, text, numeric, text, text, uuid, uuid);

DROP POLICY IF EXISTS "mfg_ncr_records_tenant_isolated" ON public.mfg_ncr_records;
DROP TRIGGER IF EXISTS trg_mfg_ncr_records_audit ON public.mfg_ncr_records;
DROP TRIGGER IF EXISTS trg_mfg_ncr_records_optimistic_version ON public.mfg_ncr_records;
DROP TRIGGER IF EXISTS trg_mfg_ncr_records_updated_at ON public.mfg_ncr_records;
DROP INDEX IF EXISTS public.idx_mfg_ncr_records_branch_created;
DROP INDEX IF EXISTS public.uq_mfg_ncr_records_number;
DROP TABLE IF EXISTS public.mfg_ncr_records;

DROP TRIGGER IF EXISTS trg_re_inspections_immutable_lock ON public.re_inspections;
DROP FUNCTION IF EXISTS public.fn_prevent_locked_re_inspection_mutation();
ALTER TABLE public.re_inspections
  DROP COLUMN IF EXISTS is_locked,
  DROP COLUMN IF EXISTS validated_at,
  DROP COLUMN IF EXISTS validated_by;

DROP INDEX IF EXISTS public.uq_rental_security_deposits_receipt_number;
ALTER TABLE public.rental_security_deposits
  DROP COLUMN IF EXISTS printed_count,
  DROP COLUMN IF EXISTS deposit_receipt_number;

ALTER TABLE public.gym_schedule_events
  DROP COLUMN IF EXISTS coach_confirmed_by,
  DROP COLUMN IF EXISTS coach_confirmed_at,
  DROP COLUMN IF EXISTS coach_confirmed;

DROP POLICY IF EXISTS "gym_class_enrollments_tenant_isolated" ON public.gym_class_enrollments;
DROP TRIGGER IF EXISTS trg_gym_class_enrollments_audit ON public.gym_class_enrollments;
DROP TRIGGER IF EXISTS trg_gym_class_enrollments_optimistic_version ON public.gym_class_enrollments;
DROP TRIGGER IF EXISTS trg_gym_class_enrollments_updated_at ON public.gym_class_enrollments;
DROP INDEX IF EXISTS public.idx_gym_class_enrollments_event;
DROP INDEX IF EXISTS public.uq_gym_class_enrollments_active;
DROP TABLE IF EXISTS public.gym_class_enrollments;
