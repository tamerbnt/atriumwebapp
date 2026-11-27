-- ============================================================================
-- Phase 3 Step 6 (7.6): education_cohort Deepening
-- Parent Communication & Portal, Term Report Cards (/20 vs /100 Scales),
-- Installment Dunning (6.5), Vacataire Hourly Payroll, Teacher/Classroom/Vehicle
-- Conflict Guarding, Sibling/Scholarship Discounts & Refunds (6.1/6.2),
-- Enrollment Contracts & Student QR Cards, Mid-Term Cohort Transfers &
-- Capacity Limits, Certificate Reissue (Stable Hash) & Revocation,
-- Driving School Practical Logs & K-12 Canteen / Transport Services.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 7.6a Extend edu_courses & edu_cohorts (Grade scale /20 vs /100, trade mode, waitlist)
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_courses
  ADD COLUMN IF NOT EXISTS grade_scale int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS trade_mode text NOT NULL DEFAULT 'academy',
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_courses_grade_scale') THEN
    ALTER TABLE public.edu_courses
      ADD CONSTRAINT chk_edu_courses_grade_scale CHECK (grade_scale IN (20, 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_courses_trade_mode') THEN
    ALTER TABLE public.edu_courses
      ADD CONSTRAINT chk_edu_courses_trade_mode CHECK (trade_mode IN ('academy', 'k12', 'driving_school', 'tutoring'));
  END IF;
END $$;

ALTER TABLE public.edu_cohorts
  ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES public.edu_classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grade_scale int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS trade_mode text NOT NULL DEFAULT 'academy',
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_cohorts_grade_scale') THEN
    ALTER TABLE public.edu_cohorts
      ADD CONSTRAINT chk_edu_cohorts_grade_scale CHECK (grade_scale IN (20, 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_cohorts_trade_mode') THEN
    ALTER TABLE public.edu_cohorts
      ADD CONSTRAINT chk_edu_cohorts_trade_mode CHECK (trade_mode IN ('academy', 'k12', 'driving_school', 'tutoring'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_cohorts_capacity_nonneg') THEN
    ALTER TABLE public.edu_cohorts
      ADD CONSTRAINT chk_edu_cohorts_capacity_nonneg CHECK (max_students > 0 AND enrolled_count >= 0);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6b Extend edu_students (Student ID QR card, guardian portal, family sibling link, trade metadata)
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_students
  ADD COLUMN IF NOT EXISTS student_card_number text,
  ADD COLUMN IF NOT EXISTS student_card_qr text,
  ADD COLUMN IF NOT EXISTS family_group_id text,
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS portal_access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_token text,
  ADD COLUMN IF NOT EXISTS driving_category text,
  ADD COLUMN IF NOT EXISTS k12_transport_route text,
  ADD COLUMN IF NOT EXISTS k12_canteen_plan text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.6c Extend edu_enrollments (Discounts, refunds, contracts, 6.1/6.2 links, transfers, dunning)
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_enrollments
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS scholarship_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sibling_discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_number text,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signer_name text,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS credit_note_document_id uuid,
  ADD COLUMN IF NOT EXISTS transferred_from_cohort_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dunning_level int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dunning_at timestamptz,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_enrollments_discount_type') THEN
    ALTER TABLE public.edu_enrollments
      ADD CONSTRAINT chk_edu_enrollments_discount_type CHECK (discount_type IN ('none', 'sibling', 'scholarship', 'merit', 'custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_enrollments_status') THEN
    ALTER TABLE public.edu_enrollments
      ADD CONSTRAINT chk_edu_enrollments_status CHECK (status IN ('Active', 'Dropped', 'Completed', 'Transferred', 'Waitlisted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_enrollments_refund_nonneg') THEN
    ALTER TABLE public.edu_enrollments
      ADD CONSTRAINT chk_edu_enrollments_refund_nonneg CHECK (refunded_amount >= 0 AND refunded_amount_centimes >= 0);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6d Extend edu_sessions (Vacataire hours, driving school vehicles/exams)
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_sessions
  ADD COLUMN IF NOT EXISTS is_vacataire boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_rate_dzd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_hours numeric(6,2) NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS payroll_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id text,
  ADD COLUMN IF NOT EXISTS vehicle_label text,
  ADD COLUMN IF NOT EXISTS session_kind text NOT NULL DEFAULT 'lecture',
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_sessions_kind') THEN
    ALTER TABLE public.edu_sessions
      ADD CONSTRAINT chk_edu_sessions_kind CHECK (session_kind IN ('lecture', 'driving_lesson', 'code_exam', 'practical_exam', 'lab'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_sessions_time_window') THEN
    ALTER TABLE public.edu_sessions
      ADD CONSTRAINT chk_edu_sessions_time_window CHECK (end_time > start_time AND duration_hours >= 0);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6e Extend edu_certificates (Reissue keeping hash stable + revocation)
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_certificates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS reissued_from_id uuid REFERENCES public.edu_certificates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reissue_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_edu_certificates_status') THEN
    ALTER TABLE public.edu_certificates
      ADD CONSTRAINT chk_edu_certificates_status CHECK (status IN ('active', 'revoked'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6f Parent Communications & Portal Messages (edu_parent_communications)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edu_parent_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  student_id uuid NOT NULL REFERENCES public.edu_students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  guardian_name text,
  guardian_phone text,
  crm_party_id uuid,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'portal_announcement', 'reply')),
  channel text NOT NULL DEFAULT 'portal' CHECK (channel IN ('portal', 'sms', 'whatsapp', 'email', 'in_app')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'attendance', 'grades', 'dunning', 'announcement')),
  subject text NOT NULL,
  body text NOT NULL,
  portal_token text,
  read_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_edu_parent_comms_student
  ON public.edu_parent_communications (branch_id, student_id, sent_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.edu_parent_communications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'edu_parent_communications' AND policyname = 'edu_parent_comms_tenant_isolation'
  ) THEN
    CREATE POLICY edu_parent_comms_tenant_isolation ON public.edu_parent_communications
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6g Vacataire Hourly Payroll Logs (edu_vacataire_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edu_vacataire_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  instructor_id text NOT NULL,
  instructor_name text NOT NULL,
  session_id uuid REFERENCES public.edu_sessions(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.edu_cohorts(id) ON DELETE SET NULL,
  cohort_name text,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  hours_worked numeric(6,2) NOT NULL CHECK (hours_worked > 0),
  hourly_rate_centimes bigint NOT NULL CHECK (hourly_rate_centimes >= 0),
  gross_amount_centimes bigint NOT NULL CHECK (gross_amount_centimes >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted_to_payroll', 'cancelled')),
  payroll_run_id uuid,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_edu_vacataire_logs_branch_status
  ON public.edu_vacataire_logs (branch_id, status, work_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.edu_vacataire_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'edu_vacataire_logs' AND policyname = 'edu_vacataire_logs_tenant_isolation'
  ) THEN
    CREATE POLICY edu_vacataire_logs_tenant_isolation ON public.edu_vacataire_logs
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6h Driving School Practical Logs & Exam Results (edu_driving_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edu_driving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  student_id uuid NOT NULL REFERENCES public.edu_students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  instructor_id text NOT NULL,
  instructor_name text NOT NULL,
  vehicle_id text,
  vehicle_label text,
  vehicle_plate text,
  log_kind text NOT NULL DEFAULT 'driving_hours' CHECK (log_kind IN ('driving_hours', 'code_session', 'code_exam', 'circuit_exam', 'road_exam')),
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '10:00',
  hours_logged numeric(6,2) NOT NULL DEFAULT 1 CHECK (hours_logged >= 0),
  exam_result text NOT NULL DEFAULT 'pending' CHECK (exam_result IN ('pending', 'passed', 'failed', 'absent')),
  dossier_ref text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_edu_driving_logs_branch_date
  ON public.edu_driving_logs (branch_id, scheduled_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.edu_driving_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'edu_driving_logs' AND policyname = 'edu_driving_logs_tenant_isolation'
  ) THEN
    CREATE POLICY edu_driving_logs_tenant_isolation ON public.edu_driving_logs
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6i K-12 Canteen & Transport Services (edu_k12_services)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edu_k12_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  student_id uuid NOT NULL REFERENCES public.edu_students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('canteen', 'transport')),
  plan_name text NOT NULL,
  route_or_diet text,
  pickup_stop text,
  monthly_fee_centimes bigint NOT NULL DEFAULT 0 CHECK (monthly_fee_centimes >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  check_in_today boolean NOT NULL DEFAULT false,
  last_check_in_at timestamptz,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_edu_k12_services_branch_type
  ON public.edu_k12_services (branch_id, service_type, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.edu_k12_services ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'edu_k12_services' AND policyname = 'edu_k12_services_tenant_isolation'
  ) THEN
    CREATE POLICY edu_k12_services_tenant_isolation ON public.edu_k12_services
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.6j Atomic SECURITY DEFINER RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edu_transfer_student_cohort_atomic(
  p_enrollment_id uuid,
  p_target_cohort_id uuid,
  p_transfer_date date DEFAULT CURRENT_DATE,
  p_allow_waitlist boolean DEFAULT false,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src_enr record;
  v_src_cohort record;
  v_dst_cohort record;
  v_total_days int;
  v_elapsed_days int;
  v_remaining_ratio numeric;
  v_src_tuition_centimes bigint;
  v_unused_credit_centimes bigint;
  v_dst_tuition_centimes bigint;
  v_paid_centimes bigint;
  v_carried_credit_centimes bigint;
  v_new_balance_centimes bigint;
  v_new_enr_id uuid := gen_random_uuid();
  v_is_waitlisted boolean := false;
  v_next_status text := 'Active';
  v_new_pay_status text := 'Pending';
BEGIN
  SELECT * INTO v_src_enr
  FROM public.edu_enrollments
  WHERE id = p_enrollment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENROLLMENT_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_src_enr.business_id, v_src_enr.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF v_src_enr.status = 'Transferred' THEN
    RAISE EXCEPTION 'ENROLLMENT_ALREADY_TRANSFERRED';
  END IF;

  IF v_src_enr.cohort_id = p_target_cohort_id THEN
    RAISE EXCEPTION 'SAME_COHORT_TRANSFER';
  END IF;

  SELECT * INTO v_src_cohort
  FROM public.edu_cohorts
  WHERE id = v_src_enr.cohort_id AND deleted_at IS NULL
  FOR UPDATE;

  SELECT * INTO v_dst_cohort
  FROM public.edu_cohorts
  WHERE id = p_target_cohort_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TARGET_COHORT_NOT_FOUND';
  END IF;

  IF v_dst_cohort.branch_id <> v_src_enr.branch_id THEN
    RAISE EXCEPTION 'CROSS_BRANCH_TRANSFER_FORBIDDEN';
  END IF;

  IF COALESCE(v_dst_cohort.enrolled_count, 0) >= COALESCE(v_dst_cohort.max_students, 0) THEN
    IF p_allow_waitlist AND COALESCE(v_dst_cohort.waitlist_enabled, true) THEN
      v_is_waitlisted := true;
      v_next_status := 'Waitlisted';
    ELSE
      RAISE EXCEPTION 'TARGET_COHORT_FULL';
    END IF;
  END IF;

  v_total_days := GREATEST(1, (v_src_cohort.end_date - v_src_cohort.start_date));
  v_elapsed_days := GREATEST(0, LEAST(v_total_days, (p_transfer_date - v_src_cohort.start_date)));
  v_remaining_ratio := GREATEST(0, LEAST(1, (v_total_days - v_elapsed_days)::numeric / v_total_days::numeric));

  v_src_tuition_centimes := ROUND(COALESCE(v_src_enr.agreed_tuition, 0) * 100)::bigint;
  v_paid_centimes := ROUND(COALESCE(v_src_enr.paid_amount, 0) * 100)::bigint;
  v_unused_credit_centimes := ROUND(v_src_tuition_centimes * v_remaining_ratio)::bigint;
  v_carried_credit_centimes := LEAST(v_paid_centimes, v_unused_credit_centimes);
  v_dst_tuition_centimes := ROUND(COALESCE(v_dst_cohort.tuition_fee, 0) * 100)::bigint;
  v_new_balance_centimes := GREATEST(0, v_dst_tuition_centimes - v_carried_credit_centimes);

  IF v_new_balance_centimes = 0 AND v_dst_tuition_centimes > 0 THEN
    v_new_pay_status := 'Paid';
  ELSIF v_carried_credit_centimes > 0 THEN
    v_new_pay_status := 'Partial';
  ELSE
    v_new_pay_status := 'Pending';
  END IF;

  UPDATE public.edu_enrollments
  SET status = 'Transferred',
      transfer_history = COALESCE(transfer_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'fromCohortId', v_src_enr.cohort_id,
          'toCohortId', v_dst_cohort.id,
          'transferDate', p_transfer_date,
          'carriedCreditCentimes', v_carried_credit_centimes,
          'reason', COALESCE(p_reason, 'Mid-term transfer')
        )
      ),
      updated_at = now()
  WHERE id = v_src_enr.id;

  IF v_src_enr.status = 'Active' AND v_src_cohort.id IS NOT NULL THEN
    UPDATE public.edu_cohorts
    SET enrolled_count = GREATEST(0, COALESCE(enrolled_count, 0) - 1),
        updated_at = now()
    WHERE id = v_src_cohort.id;
  END IF;

  INSERT INTO public.edu_enrollments (
    id, account_id, business_id, branch_id, staff_id,
    student_id, student_name, cohort_id, cohort_name, enrolled_at,
    agreed_tuition, discount_amount, discount_reason, discount_type,
    paid_amount, balance_due, currency, payment_status, status,
    transferred_from_cohort_id, installments
  ) VALUES (
    v_new_enr_id, v_src_enr.account_id, v_src_enr.business_id, v_src_enr.branch_id, v_src_enr.staff_id,
    v_src_enr.student_id, v_src_enr.student_name, v_dst_cohort.id, v_dst_cohort.name, now(),
    v_dst_cohort.tuition_fee, 0, NULL, 'none',
    ROUND(v_carried_credit_centimes::numeric / 100.0, 2),
    ROUND(v_new_balance_centimes::numeric / 100.0, 2),
    COALESCE(v_dst_cohort.currency, 'DZD'),
    v_new_pay_status,
    v_next_status,
    v_src_enr.cohort_id,
    jsonb_build_array(
      jsonb_build_object(
        'dueDate', v_dst_cohort.end_date,
        'amount', ROUND(v_new_balance_centimes::numeric / 100.0, 2),
        'isPaid', v_new_balance_centimes = 0
      )
    )
  );

  IF NOT v_is_waitlisted THEN
    UPDATE public.edu_cohorts
    SET enrolled_count = COALESCE(enrolled_count, 0) + 1,
        updated_at = now()
    WHERE id = v_dst_cohort.id;
  END IF;

  RETURN jsonb_build_object(
    'source_enrollment_id', v_src_enr.id,
    'target_enrollment_id', v_new_enr_id,
    'target_cohort_id', v_dst_cohort.id,
    'status', v_next_status,
    'waitlisted', v_is_waitlisted,
    'carried_credit_centimes', v_carried_credit_centimes,
    'new_balance_centimes', v_new_balance_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edu_transfer_student_cohort_atomic(uuid, uuid, date, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edu_transfer_student_cohort_atomic(uuid, uuid, date, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.edu_reissue_or_revoke_certificate(
  p_certificate_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cert record;
  v_new_id uuid := gen_random_uuid();
  v_next_reissue int;
  v_new_number text;
BEGIN
  IF p_action NOT IN ('reissue', 'revoke') THEN
    RAISE EXCEPTION 'INVALID_CERTIFICATE_ACTION';
  END IF;

  SELECT * INTO v_cert
  FROM public.edu_certificates
  WHERE id = p_certificate_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CERTIFICATE_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_cert.business_id, v_cert.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF p_action = 'revoke' THEN
    IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'REVOCATION_REASON_REQUIRED';
    END IF;

    UPDATE public.edu_certificates
    SET status = 'revoked',
        revoked_at = now(),
        revoked_reason = trim(p_reason),
        updated_at = now()
    WHERE id = v_cert.id;

    RETURN jsonb_build_object(
      'certificate_id', v_cert.id,
      'status', 'revoked',
      'verification_hash', v_cert.verification_hash
    );
  END IF;

  IF v_cert.status = 'revoked' THEN
    RAISE EXCEPTION 'CANNOT_REISSUE_REVOKED_CERTIFICATE';
  END IF;

  v_next_reissue := COALESCE(v_cert.reissue_count, 0) + 1;
  v_new_number := v_cert.certificate_number || '-R' || v_next_reissue::text;

  INSERT INTO public.edu_certificates (
    id, account_id, business_id, branch_id, staff_id,
    student_id, student_name, cohort_id, course_title,
    certificate_number, verification_hash, issue_date,
    average_grade_score, honors, signatory_name, signatory_title,
    status, reissued_from_id, reissue_count
  ) VALUES (
    v_new_id, v_cert.account_id, v_cert.business_id, v_cert.branch_id, v_cert.staff_id,
    v_cert.student_id, v_cert.student_name, v_cert.cohort_id, v_cert.course_title,
    v_new_number, v_cert.verification_hash, CURRENT_DATE,
    v_cert.average_grade_score, v_cert.honors, v_cert.signatory_name, v_cert.signatory_title,
    'active', v_cert.id, v_next_reissue
  );

  RETURN jsonb_build_object(
    'certificate_id', v_new_id,
    'reissued_from_id', v_cert.id,
    'reissue_count', v_next_reissue,
    'certificate_number', v_new_number,
    'verification_hash', v_cert.verification_hash
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edu_reissue_or_revoke_certificate(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edu_reissue_or_revoke_certificate(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.edu_post_vacataire_hours_to_payroll(
  p_log_ids uuid[],
  p_payroll_run_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_posted_count int := 0;
  v_total_centimes bigint := 0;
BEGIN
  IF p_log_ids IS NULL OR array_length(p_log_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('posted_count', 0, 'total_centimes', 0);
  END IF;

  FOR v_row IN
    SELECT * FROM public.edu_vacataire_logs
    WHERE id = ANY(p_log_ids) AND deleted_at IS NULL
    FOR UPDATE
  LOOP
    IF NOT (SELECT public.has_branch_access(v_row.business_id, v_row.branch_id)) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;
    IF v_row.status = 'pending' THEN
      UPDATE public.edu_vacataire_logs
      SET status = 'posted_to_payroll',
          payroll_run_id = COALESCE(p_payroll_run_id, payroll_run_id),
          updated_at = now()
      WHERE id = v_row.id;

      IF v_row.session_id IS NOT NULL THEN
        UPDATE public.edu_sessions
        SET payroll_posted = true,
            payroll_run_id = COALESCE(p_payroll_run_id, payroll_run_id),
            updated_at = now()
        WHERE id = v_row.session_id;
      END IF;

      v_posted_count := v_posted_count + 1;
      v_total_centimes := v_total_centimes + COALESCE(v_row.gross_amount_centimes, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'posted_count', v_posted_count,
    'total_centimes', v_total_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edu_post_vacataire_hours_to_payroll(uuid[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edu_post_vacataire_hours_to_payroll(uuid[], uuid) TO authenticated;

-- Attach optimistic & audit triggers when present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'edu_parent_communications',
      'edu_vacataire_logs',
      'edu_driving_logs',
      'edu_k12_services'
    ] LOOP
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
    FOREACH v_tbl IN ARRAY ARRAY[
      'edu_parent_communications',
      'edu_vacataire_logs',
      'edu_driving_logs',
      'edu_k12_services'
    ] LOOP
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
