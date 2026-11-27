-- Rollback for 202611280006_phase3_education_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_optimistic_edu_k12_services ON public.edu_k12_services;
DROP TRIGGER IF EXISTS trg_optimistic_edu_driving_logs ON public.edu_driving_logs;
DROP TRIGGER IF EXISTS trg_optimistic_edu_vacataire_logs ON public.edu_vacataire_logs;
DROP TRIGGER IF EXISTS trg_optimistic_edu_parent_communications ON public.edu_parent_communications;

DROP TRIGGER IF EXISTS trg_audit_edu_k12_services ON public.edu_k12_services;
DROP TRIGGER IF EXISTS trg_audit_edu_driving_logs ON public.edu_driving_logs;
DROP TRIGGER IF EXISTS trg_audit_edu_vacataire_logs ON public.edu_vacataire_logs;
DROP TRIGGER IF EXISTS trg_audit_edu_parent_communications ON public.edu_parent_communications;

DROP FUNCTION IF EXISTS public.edu_post_vacataire_hours_to_payroll(uuid[], uuid);
DROP FUNCTION IF EXISTS public.edu_reissue_or_revoke_certificate(uuid, text, text);
DROP FUNCTION IF EXISTS public.edu_transfer_student_cohort_atomic(uuid, uuid, date, boolean, text);

DROP TABLE IF EXISTS public.edu_k12_services;
DROP TABLE IF EXISTS public.edu_driving_logs;
DROP TABLE IF EXISTS public.edu_vacataire_logs;
DROP TABLE IF EXISTS public.edu_parent_communications;

ALTER TABLE public.edu_certificates
  DROP CONSTRAINT IF EXISTS chk_edu_certificates_status,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS reissue_count,
  DROP COLUMN IF EXISTS reissued_from_id,
  DROP COLUMN IF EXISTS revoked_reason,
  DROP COLUMN IF EXISTS revoked_at,
  DROP COLUMN IF EXISTS status;

ALTER TABLE public.edu_sessions
  DROP CONSTRAINT IF EXISTS chk_edu_sessions_time_window,
  DROP CONSTRAINT IF EXISTS chk_edu_sessions_kind,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS session_kind,
  DROP COLUMN IF EXISTS vehicle_label,
  DROP COLUMN IF EXISTS vehicle_id,
  DROP COLUMN IF EXISTS payroll_run_id,
  DROP COLUMN IF EXISTS payroll_posted,
  DROP COLUMN IF EXISTS duration_hours,
  DROP COLUMN IF EXISTS hourly_rate_dzd,
  DROP COLUMN IF EXISTS is_vacataire;

ALTER TABLE public.edu_enrollments
  DROP CONSTRAINT IF EXISTS chk_edu_enrollments_refund_nonneg,
  DROP CONSTRAINT IF EXISTS chk_edu_enrollments_status,
  DROP CONSTRAINT IF EXISTS chk_edu_enrollments_discount_type,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS last_dunning_at,
  DROP COLUMN IF EXISTS dunning_level,
  DROP COLUMN IF EXISTS transfer_history,
  DROP COLUMN IF EXISTS transferred_from_cohort_id,
  DROP COLUMN IF EXISTS credit_note_document_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS contract_signer_name,
  DROP COLUMN IF EXISTS contract_signed_at,
  DROP COLUMN IF EXISTS contract_number,
  DROP COLUMN IF EXISTS refunded_amount_centimes,
  DROP COLUMN IF EXISTS refunded_amount,
  DROP COLUMN IF EXISTS sibling_discount_amount,
  DROP COLUMN IF EXISTS scholarship_amount,
  DROP COLUMN IF EXISTS discount_type;

ALTER TABLE public.edu_students
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS k12_canteen_plan,
  DROP COLUMN IF EXISTS k12_transport_route,
  DROP COLUMN IF EXISTS driving_category,
  DROP COLUMN IF EXISTS portal_token,
  DROP COLUMN IF EXISTS portal_access_enabled,
  DROP COLUMN IF EXISTS crm_party_id,
  DROP COLUMN IF EXISTS family_group_id,
  DROP COLUMN IF EXISTS student_card_qr,
  DROP COLUMN IF EXISTS student_card_number;

ALTER TABLE public.edu_cohorts
  DROP CONSTRAINT IF EXISTS chk_edu_cohorts_capacity_nonneg,
  DROP CONSTRAINT IF EXISTS chk_edu_cohorts_trade_mode,
  DROP CONSTRAINT IF EXISTS chk_edu_cohorts_grade_scale,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS waitlist_enabled,
  DROP COLUMN IF EXISTS trade_mode,
  DROP COLUMN IF EXISTS grade_scale,
  DROP COLUMN IF EXISTS classroom_id;

ALTER TABLE public.edu_courses
  DROP CONSTRAINT IF EXISTS chk_edu_courses_trade_mode,
  DROP CONSTRAINT IF EXISTS chk_edu_courses_grade_scale,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS trade_mode,
  DROP COLUMN IF EXISTS grade_scale;

COMMIT;
