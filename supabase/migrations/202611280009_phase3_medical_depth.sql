-- ============================================================================
-- Phase 3 Step 9 (7.9 medical_clinic): Clinical & CNAS Chifa Operations Depth
-- Covers:
--   * Normalized patient Chifa/ALD & CRM party linkage + vitals timeline
--   * Appointment double-booking overlap trigger & atomic upsert RPC
--     (allows overlap ONLY with is_emergency_bypass = true and clinical reason)
--   * Consultation NGAP fee/copay/insurance centimes, 6.1/6.3 bridge IDs,
--     and prescription allergy override audit metadata
--   * FEFO consumables lot tracking & expiry-safe atomic depletion RPC
--   * Normalized medical_ngap_acts, medical_chifa_bordereaux,
--     medical_doctor_payouts, and medical_cash_closures with tenant+branch RLS
-- ============================================================================

-- 1) Extend medical_patients with Chifa ALD, NSS, CRM party & vitals history
ALTER TABLE public.medical_patients
  ADD COLUMN IF NOT EXISTS crm_party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS social_security_number text,
  ADD COLUMN IF NOT EXISTS has_chifa_100_percent_ald boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS vitals_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_medical_patients_crm_party
  ON public.medical_patients (business_id, crm_party_id)
  WHERE deleted_at IS NULL AND crm_party_id IS NOT NULL;

-- 2) Extend medical_appointments with emergency bypass metadata & consultation link
ALTER TABLE public.medical_appointments
  ADD COLUMN IF NOT EXISTS is_emergency_bypass boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_bypass_reason text,
  ADD COLUMN IF NOT EXISTS consultation_id uuid;

-- 3) Extend medical_consultations with NGAP, centimes, 6.1/6.3 refs & allergy audit
ALTER TABLE public.medical_consultations
  ADD COLUMN IF NOT EXISTS ngap_code text NOT NULL DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS urgency_level text NOT NULL DEFAULT 'Normal'
    CHECK (urgency_level IN ('Normal', 'Prioritaire', 'Urgence')),
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS fee_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copay_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_share_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS unified_document_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allergy_override_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergy_override_reason text,
  ADD COLUMN IF NOT EXISTS prescription_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) Extend medical_consumables with multi-lot FEFO payload
ALTER TABLE public.medical_consumables
  ADD COLUMN IF NOT EXISTS lots jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fefo_policy boolean NOT NULL DEFAULT true;

-- 5) Extend medical_invoices with bordereau & 6.1/6.3 bridge columns
ALTER TABLE public.medical_invoices
  ADD COLUMN IF NOT EXISTS chifa_bordereau_id uuid,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL;

-- 6) Normalized medical_ngap_acts
CREATE TABLE IF NOT EXISTS public.medical_ngap_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'Consultation',
  convention_fee_centimes bigint NOT NULL DEFAULT 250000 CHECK (convention_fee_centimes >= 0),
  cnas_reimbursement_centimes bigint NOT NULL DEFAULT 200000 CHECK (cnas_reimbursement_centimes >= 0),
  ticket_moderateur_centimes bigint NOT NULL DEFAULT 50000 CHECK (ticket_moderateur_centimes >= 0),
  linked_consumables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_ngap_acts_branch_code
  ON public.medical_ngap_acts (business_id, branch_id, code)
  WHERE deleted_at IS NULL;

-- 7) Normalized medical_chifa_bordereaux
CREATE TABLE IF NOT EXISTS public.medical_chifa_bordereaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  bordereau_number text NOT NULL,
  period_month text NOT NULL,
  cnas_center_code text NOT NULL DEFAULT '1601',
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Transmitted', 'Reimbursed', 'Rejected')),
  claims_count int NOT NULL DEFAULT 0 CHECK (claims_count >= 0),
  total_fee_centimes bigint NOT NULL DEFAULT 0 CHECK (total_fee_centimes >= 0),
  total_cnas_centimes bigint NOT NULL DEFAULT 0 CHECK (total_cnas_centimes >= 0),
  total_copay_centimes bigint NOT NULL DEFAULT 0 CHECK (total_copay_centimes >= 0),
  claim_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  transmitted_at timestamptz,
  reimbursed_at timestamptz,
  settlement_reference text,
  unified_payment_id uuid REFERENCES public.unified_payments(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_chifa_bordereaux_num
  ON public.medical_chifa_bordereaux (business_id, branch_id, bordereau_number)
  WHERE deleted_at IS NULL;

-- 8) Normalized medical_doctor_payouts (Honoraires rétrocession)
CREATE TABLE IF NOT EXISTS public.medical_doctor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  practitioner_id uuid REFERENCES public.medical_staff(id) ON DELETE SET NULL,
  practitioner_ref text,
  practitioner_name text NOT NULL,
  period_month text NOT NULL,
  consultations_count int NOT NULL DEFAULT 0 CHECK (consultations_count >= 0),
  gross_turnover_centimes bigint NOT NULL DEFAULT 0 CHECK (gross_turnover_centimes >= 0),
  commission_rate_bps int NOT NULL DEFAULT 7000 CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  doctor_payout_centimes bigint NOT NULL DEFAULT 0 CHECK (doctor_payout_centimes >= 0),
  polyclinic_share_centimes bigint NOT NULL DEFAULT 0 CHECK (polyclinic_share_centimes >= 0),
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('pending', 'issued', 'posted_to_payroll')),
  payroll_run_id uuid REFERENCES public.staff_payroll_runs(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_medical_doctor_payouts_branch_period
  ON public.medical_doctor_payouts (business_id, branch_id, period_month)
  WHERE deleted_at IS NULL;

-- 9) Normalized medical_cash_closures
CREATE TABLE IF NOT EXISTS public.medical_cash_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  closure_date date NOT NULL DEFAULT CURRENT_DATE,
  closed_by_name text NOT NULL,
  opening_float_centimes bigint NOT NULL DEFAULT 0,
  expected_cash_centimes bigint NOT NULL DEFAULT 0,
  counted_cash_centimes bigint NOT NULL DEFAULT 0,
  total_cash_collected_centimes bigint NOT NULL DEFAULT 0,
  total_baridimob_centimes bigint NOT NULL DEFAULT 0,
  total_card_centimes bigint NOT NULL DEFAULT 0,
  total_chifa_vouchers_centimes bigint NOT NULL DEFAULT 0,
  discrepancy_centimes bigint NOT NULL DEFAULT 0,
  consultations_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'balanced'
    CHECK (status IN ('balanced', 'variance_flagged')),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_medical_cash_closures_branch_date
  ON public.medical_cash_closures (business_id, branch_id, closure_date DESC)
  WHERE deleted_at IS NULL;

-- 10) RLS + updated_at/version triggers for new tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medical_ngap_acts',
    'medical_chifa_bordereaux',
    'medical_doctor_payouts',
    'medical_cash_closures'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_branch_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_branch_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_branch_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_branch_delete ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY tenant_branch_select ON public.%I FOR SELECT TO authenticated USING (public.is_tenant_branch_member(business_id, branch_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_branch_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_tenant_branch_member(business_id, branch_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_branch_update ON public.%I FOR UPDATE TO authenticated USING (public.is_tenant_branch_member(business_id, branch_id)) WITH CHECK (public.is_tenant_branch_member(business_id, branch_id))',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_branch_delete ON public.%I FOR DELETE TO authenticated USING (public.is_tenant_branch_member(business_id, branch_id))',
      t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bump_version ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_bump_version BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_bump_version()',
      t
    );
  END LOOP;
END $$;

-- 11) Appointment half-open [start, end) double-booking trigger
CREATE OR REPLACE FUNCTION public.fn_guard_medical_appointment_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_min int;
  v_end_min int;
  v_conflict_patient text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.status IN ('Cancelled') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_emergency_bypass, false) THEN
    IF length(trim(COALESCE(NEW.emergency_bypass_reason, ''))) = 0 THEN
      RAISE EXCEPTION 'MEDICAL_BYPASS_REASON_REQUIRED: emergency bypass requires a non-empty clinical reason';
    END IF;
    RETURN NEW;
  END IF;

  v_start_min :=
    COALESCE(NULLIF(split_part(COALESCE(NEW.start_time, '09:00'), ':', 1), '')::int, 9) * 60 +
    COALESCE(NULLIF(split_part(COALESCE(NEW.start_time, '09:00'), ':', 2), '')::int, 0);
  v_end_min := v_start_min + GREATEST(5, COALESCE(NEW.duration_minutes, 30));

  SELECT patient_name INTO v_conflict_patient
  FROM public.medical_appointments a
  WHERE a.id <> NEW.id
    AND a.deleted_at IS NULL
    AND a.business_id = NEW.business_id
    AND a.branch_id = NEW.branch_id
    AND a.appointment_date = NEW.appointment_date
    AND a.status NOT IN ('Cancelled')
    AND (
      (NEW.doctor_id IS NOT NULL AND a.doctor_id = NEW.doctor_id)
      OR (NEW.doctor_id IS NULL AND lower(trim(COALESCE(a.doctor_name, ''))) = lower(trim(COALESCE(NEW.doctor_name, ''))))
    )
    AND GREATEST(
      v_start_min,
      COALESCE(NULLIF(split_part(COALESCE(a.start_time, '09:00'), ':', 1), '')::int, 9) * 60 +
      COALESCE(NULLIF(split_part(COALESCE(a.start_time, '09:00'), ':', 2), '')::int, 0)
    ) < LEAST(
      v_end_min,
      COALESCE(NULLIF(split_part(COALESCE(a.start_time, '09:00'), ':', 1), '')::int, 9) * 60 +
      COALESCE(NULLIF(split_part(COALESCE(a.start_time, '09:00'), ':', 2), '')::int, 0) +
      GREATEST(5, COALESCE(a.duration_minutes, 30))
    )
  LIMIT 1;

  IF v_conflict_patient IS NOT NULL THEN
    RAISE EXCEPTION 'MEDICAL_APPOINTMENT_OVERLAP: Practitioner already booked for % on % at %',
      v_conflict_patient, NEW.appointment_date, NEW.start_time;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_medical_appointment_no_overlap ON public.medical_appointments;
CREATE TRIGGER trg_guard_medical_appointment_no_overlap
BEFORE INSERT OR UPDATE ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_medical_appointment_no_overlap();

-- 12) RPC: Atomic appointment upsert honoring overlap guard
CREATE OR REPLACE FUNCTION public.medical_upsert_appointment_atomic(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := COALESCE(NULLIF(p_payload ->> 'id', '')::uuid, gen_random_uuid());
  v_account_id uuid := (p_payload ->> 'account_id')::uuid;
  v_business_id uuid := (p_payload ->> 'business_id')::uuid;
  v_branch_id uuid := (p_payload ->> 'branch_id')::uuid;
BEGIN
  IF NOT public.is_tenant_branch_member(v_business_id, v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  INSERT INTO public.medical_appointments (
    id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
    patient_id, patient_name, patient_phone, doctor_id, doctor_name, department_name,
    appointment_date, start_time, duration_minutes, reason, triage_priority, status,
    is_emergency_bypass, emergency_bypass_reason, notes
  ) VALUES (
    v_id, v_account_id, v_business_id, v_branch_id,
    NULLIF(p_payload ->> 'staff_id', '')::uuid,
    NULLIF(p_payload ->> 'updated_by_staff_id', '')::uuid,
    p_payload ->> 'device_id',
    NULLIF(p_payload ->> 'patient_id', '')::uuid,
    COALESCE(p_payload ->> 'patient_name', 'Patient'),
    p_payload ->> 'patient_phone',
    NULLIF(p_payload ->> 'doctor_id', '')::uuid,
    COALESCE(p_payload ->> 'doctor_name', 'Médecin'),
    p_payload ->> 'department_name',
    COALESCE(NULLIF(p_payload ->> 'appointment_date', '')::date, CURRENT_DATE),
    COALESCE(p_payload ->> 'start_time', '09:00'),
    COALESCE((p_payload ->> 'duration_minutes')::int, 30),
    p_payload ->> 'reason',
    COALESCE(p_payload ->> 'triage_priority', 'Normal'),
    COALESCE(p_payload ->> 'status', 'Scheduled'),
    COALESCE((p_payload ->> 'is_emergency_bypass')::boolean, false),
    p_payload ->> 'emergency_bypass_reason',
    p_payload ->> 'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    patient_id = EXCLUDED.patient_id,
    patient_name = EXCLUDED.patient_name,
    patient_phone = EXCLUDED.patient_phone,
    doctor_id = EXCLUDED.doctor_id,
    doctor_name = EXCLUDED.doctor_name,
    appointment_date = EXCLUDED.appointment_date,
    start_time = EXCLUDED.start_time,
    duration_minutes = EXCLUDED.duration_minutes,
    reason = EXCLUDED.reason,
    triage_priority = EXCLUDED.triage_priority,
    status = EXCLUDED.status,
    is_emergency_bypass = EXCLUDED.is_emergency_bypass,
    emergency_bypass_reason = EXCLUDED.emergency_bypass_reason,
    notes = EXCLUDED.notes,
    updated_by_staff_id = EXCLUDED.updated_by_staff_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- 13) RPC: FEFO consumable depletion (blocks expired batches & insufficient non-expired stock)
CREATE OR REPLACE FUNCTION public.medical_consume_supply_fefo(
  p_consumable_id uuid,
  p_qty numeric,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.medical_consumables%ROWTYPE;
  v_need numeric := GREATEST(0, COALESCE(p_qty, 0));
  v_remaining numeric;
  v_lot jsonb;
  v_lot_qty numeric;
  v_lot_exp date;
  v_new_lots jsonb := '[]'::jsonb;
  v_deducted jsonb := '[]'::jsonb;
  v_total_valid numeric := 0;
  v_first_exp date;
  v_first_lot text;
BEGIN
  IF v_need <= 0 THEN
    RAISE EXCEPTION 'MEDICAL_INVALID_CONSUME_QTY: quantity must be positive';
  END IF;

  SELECT * INTO v_row
  FROM public.medical_consumables
  WHERE id = p_consumable_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEDICAL_CONSUMABLE_NOT_FOUND';
  END IF;

  IF NOT public.is_tenant_branch_member(v_row.business_id, v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF jsonb_array_length(COALESCE(v_row.lots, '[]'::jsonb)) = 0 THEN
    IF v_row.expiry_date IS NOT NULL AND v_row.expiry_date < p_reference_date THEN
      RAISE EXCEPTION 'MEDICAL_BATCH_EXPIRED: lot % expired on %', COALESCE(v_row.lot_number, 'DEFAULT'), v_row.expiry_date;
    END IF;
    IF COALESCE(v_row.stock_quantity, 0) < v_need THEN
      RAISE EXCEPTION 'MEDICAL_INSUFFICIENT_STOCK: available %, requested %', COALESCE(v_row.stock_quantity, 0), v_need;
    END IF;

    UPDATE public.medical_consumables
    SET stock_quantity = COALESCE(stock_quantity, 0) - v_need
    WHERE id = p_consumable_id;

    RETURN jsonb_build_object(
      'ok', true,
      'consumableId', p_consumable_id,
      'remainingStock', COALESCE(v_row.stock_quantity, 0) - v_need,
      'deductedLots', jsonb_build_array(jsonb_build_object('lotNumber', COALESCE(v_row.lot_number, 'DEFAULT'), 'qty', v_need))
    );
  END IF;

  -- Sum valid (non-expired) lot quantities
  SELECT COALESCE(SUM((l ->> 'quantity')::numeric), 0) INTO v_total_valid
  FROM jsonb_array_elements(v_row.lots) l
  WHERE (l ->> 'quantity')::numeric > 0
    AND (NULLIF(l ->> 'expiryDate', '') IS NULL OR (l ->> 'expiryDate')::date >= p_reference_date);

  IF v_total_valid < v_need THEN
    RAISE EXCEPTION 'MEDICAL_INSUFFICIENT_UNEXPIRED_STOCK: valid %, requested %', v_total_valid, v_need;
  END IF;

  v_remaining := v_need;

  FOR v_lot IN
    SELECT value
    FROM jsonb_array_elements(v_row.lots) value
    ORDER BY COALESCE(NULLIF(value ->> 'expiryDate', ''), '9999-12-31') ASC, COALESCE(value ->> 'lotNumber', '') ASC
  LOOP
    v_lot_qty := COALESCE((v_lot ->> 'quantity')::numeric, 0);
    v_lot_exp := NULLIF(v_lot ->> 'expiryDate', '')::date;

    IF v_lot_qty <= 0 THEN
      CONTINUE;
    END IF;

    IF v_lot_exp IS NOT NULL AND v_lot_exp < p_reference_date THEN
      -- Preserve expired lot for quarantine visibility without consuming it
      v_new_lots := v_new_lots || jsonb_build_array(v_lot);
      CONTINUE;
    END IF;

    IF v_remaining > 0 THEN
      IF v_lot_qty <= v_remaining THEN
        v_deducted := v_deducted || jsonb_build_array(jsonb_build_object(
          'lotNumber', v_lot ->> 'lotNumber',
          'expiryDate', v_lot ->> 'expiryDate',
          'qty', v_lot_qty
        ));
        v_remaining := v_remaining - v_lot_qty;
      ELSE
        v_deducted := v_deducted || jsonb_build_array(jsonb_build_object(
          'lotNumber', v_lot ->> 'lotNumber',
          'expiryDate', v_lot ->> 'expiryDate',
          'qty', v_remaining
        ));
        v_new_lots := v_new_lots || jsonb_build_array(
          jsonb_set(v_lot, '{quantity}', to_jsonb(v_lot_qty - v_remaining))
        );
        IF v_first_exp IS NULL THEN
          v_first_exp := v_lot_exp;
          v_first_lot := v_lot ->> 'lotNumber';
        END IF;
        v_remaining := 0;
      END IF;
    ELSE
      v_new_lots := v_new_lots || jsonb_build_array(v_lot);
      IF v_first_exp IS NULL THEN
        v_first_exp := v_lot_exp;
        v_first_lot := v_lot ->> 'lotNumber';
      END IF;
    END IF;
  END LOOP;

  UPDATE public.medical_consumables
  SET lots = v_new_lots,
      stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_need),
      expiry_date = COALESCE(v_first_exp, expiry_date),
      lot_number = COALESCE(v_first_lot, lot_number)
  WHERE id = p_consumable_id;

  RETURN jsonb_build_object(
    'ok', true,
    'consumableId', p_consumable_id,
    'remainingStock', GREATEST(0, COALESCE(v_row.stock_quantity, 0) - v_need),
    'deductedLots', v_deducted
  );
END;
$$;

-- 14) RPC: Transmit CHIFA Bordereau batch atomically
CREATE OR REPLACE FUNCTION public.medical_transmit_chifa_bordereau(
  p_bordereau_id uuid,
  p_account_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_bordereau_number text,
  p_period_month text,
  p_cnas_center_code text,
  p_claim_ids jsonb,
  p_claims_count int,
  p_total_fee_centimes bigint,
  p_total_cnas_centimes bigint,
  p_total_copay_centimes bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := COALESCE(p_bordereau_id, gen_random_uuid());
BEGIN
  IF NOT public.is_tenant_branch_member(p_business_id, p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF COALESCE(p_claims_count, 0) <= 0 THEN
    RAISE EXCEPTION 'MEDICAL_BORDEREAU_EMPTY: cannot transmit empty bordereau';
  END IF;

  INSERT INTO public.medical_chifa_bordereaux (
    id, account_id, business_id, branch_id, bordereau_number, period_month, cnas_center_code,
    status, claims_count, total_fee_centimes, total_cnas_centimes, total_copay_centimes,
    claim_ids, transmitted_at
  ) VALUES (
    v_id, p_account_id, p_business_id, p_branch_id, p_bordereau_number, p_period_month, COALESCE(p_cnas_center_code, '1601'),
    'Transmitted', p_claims_count, GREATEST(0, p_total_fee_centimes), GREATEST(0, p_total_cnas_centimes),
    GREATEST(0, p_total_copay_centimes), COALESCE(p_claim_ids, '[]'::jsonb), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'Transmitted',
    claims_count = EXCLUDED.claims_count,
    total_fee_centimes = EXCLUDED.total_fee_centimes,
    total_cnas_centimes = EXCLUDED.total_cnas_centimes,
    total_copay_centimes = EXCLUDED.total_copay_centimes,
    claim_ids = EXCLUDED.claim_ids,
    transmitted_at = COALESCE(medical_chifa_bordereaux.transmitted_at, now());

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'status', 'Transmitted');
END;
$$;

-- 15) RPC: Settle transmitted CHIFA Bordereau
CREATE OR REPLACE FUNCTION public.medical_settle_chifa_bordereau(
  p_bordereau_id uuid,
  p_settlement_reference text,
  p_unified_payment_id uuid DEFAULT NULL,
  p_journal_entry_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.medical_chifa_bordereaux%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.medical_chifa_bordereaux
  WHERE id = p_bordereau_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEDICAL_BORDEREAU_NOT_FOUND';
  END IF;

  IF NOT public.is_tenant_branch_member(v_row.business_id, v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF v_row.status = 'Reimbursed' THEN
    RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'status', 'Reimbursed', 'idempotent', true);
  END IF;

  IF v_row.status <> 'Transmitted' THEN
    RAISE EXCEPTION 'MEDICAL_BORDEREAU_NOT_TRANSMITTED: bordereau must be transmitted before settlement';
  END IF;

  UPDATE public.medical_chifa_bordereaux
  SET status = 'Reimbursed',
      reimbursed_at = now(),
      settlement_reference = NULLIF(trim(COALESCE(p_settlement_reference, '')), ''),
      unified_payment_id = COALESCE(p_unified_payment_id, unified_payment_id),
      journal_entry_id = COALESCE(p_journal_entry_id, journal_entry_id)
  WHERE id = p_bordereau_id;

  RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'status', 'Reimbursed');
END;
$$;

-- 16) RPC: Issue practitioner honoraires rétrocession payout
CREATE OR REPLACE FUNCTION public.medical_issue_practitioner_payout(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := COALESCE(NULLIF(p_payload ->> 'id', '')::uuid, gen_random_uuid());
  v_account_id uuid := (p_payload ->> 'account_id')::uuid;
  v_business_id uuid := (p_payload ->> 'business_id')::uuid;
  v_branch_id uuid := (p_payload ->> 'branch_id')::uuid;
  v_doctor_centimes bigint := COALESCE((p_payload ->> 'doctor_payout_centimes')::bigint, 0);
BEGIN
  IF NOT public.is_tenant_branch_member(v_business_id, v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF v_doctor_centimes <= 0 THEN
    RAISE EXCEPTION 'MEDICAL_ZERO_PAYOUT: practitioner payout must be greater than zero';
  END IF;

  INSERT INTO public.medical_doctor_payouts (
    id, account_id, business_id, branch_id, staff_id,
    practitioner_id, practitioner_ref, practitioner_name, period_month,
    consultations_count, gross_turnover_centimes, commission_rate_bps,
    doctor_payout_centimes, polyclinic_share_centimes, status,
    payroll_run_id, journal_entry_id, notes
  ) VALUES (
    v_id, v_account_id, v_business_id, v_branch_id, NULLIF(p_payload ->> 'staff_id', '')::uuid,
    NULLIF(p_payload ->> 'practitioner_id', '')::uuid,
    p_payload ->> 'practitioner_ref',
    COALESCE(p_payload ->> 'practitioner_name', 'Dr. Praticien'),
    COALESCE(p_payload ->> 'period_month', to_char(CURRENT_DATE, 'YYYY-MM')),
    COALESCE((p_payload ->> 'consultations_count')::int, 0),
    COALESCE((p_payload ->> 'gross_turnover_centimes')::bigint, 0),
    COALESCE((p_payload ->> 'commission_rate_bps')::int, 7000),
    v_doctor_centimes,
    COALESCE((p_payload ->> 'polyclinic_share_centimes')::bigint, 0),
    COALESCE(p_payload ->> 'status', 'issued'),
    NULLIF(p_payload ->> 'payroll_run_id', '')::uuid,
    NULLIF(p_payload ->> 'journal_entry_id', '')::uuid,
    p_payload ->> 'notes'
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'doctorPayoutCentimes', v_doctor_centimes);
END;
$$;

-- 17) RPC: Close daily medical cash drawer with discrepancy classification
CREATE OR REPLACE FUNCTION public.medical_close_daily_cash(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := COALESCE(NULLIF(p_payload ->> 'id', '')::uuid, gen_random_uuid());
  v_account_id uuid := (p_payload ->> 'account_id')::uuid;
  v_business_id uuid := (p_payload ->> 'business_id')::uuid;
  v_branch_id uuid := (p_payload ->> 'branch_id')::uuid;
  v_expected bigint := COALESCE((p_payload ->> 'expected_cash_centimes')::bigint, 0);
  v_counted bigint := COALESCE((p_payload ->> 'counted_cash_centimes')::bigint, 0);
  v_diff bigint := v_counted - v_expected;
  v_status text := CASE WHEN v_diff = 0 THEN 'balanced' ELSE 'variance_flagged' END;
BEGIN
  IF NOT public.is_tenant_branch_member(v_business_id, v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  INSERT INTO public.medical_cash_closures (
    id, account_id, business_id, branch_id, staff_id,
    closure_date, closed_by_name, opening_float_centimes,
    expected_cash_centimes, counted_cash_centimes,
    total_cash_collected_centimes, total_baridimob_centimes,
    total_card_centimes, total_chifa_vouchers_centimes,
    discrepancy_centimes, consultations_count, status, notes
  ) VALUES (
    v_id, v_account_id, v_business_id, v_branch_id, NULLIF(p_payload ->> 'staff_id', '')::uuid,
    COALESCE(NULLIF(p_payload ->> 'closure_date', '')::date, CURRENT_DATE),
    COALESCE(p_payload ->> 'closed_by_name', 'Secrétariat'),
    COALESCE((p_payload ->> 'opening_float_centimes')::bigint, 0),
    v_expected, v_counted,
    COALESCE((p_payload ->> 'total_cash_collected_centimes')::bigint, 0),
    COALESCE((p_payload ->> 'total_baridimob_centimes')::bigint, 0),
    COALESCE((p_payload ->> 'total_card_centimes')::bigint, 0),
    COALESCE((p_payload ->> 'total_chifa_vouchers_centimes')::bigint, 0),
    v_diff,
    COALESCE((p_payload ->> 'consultations_count')::int, 0),
    v_status,
    p_payload ->> 'notes'
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'discrepancyCentimes', v_diff, 'status', v_status);
END;
$$;
