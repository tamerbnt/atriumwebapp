-- Rollback for Phase 3 Step 9 (7.9 medical_clinic) Clinical & CNAS Chifa Depth

DROP FUNCTION IF EXISTS public.medical_close_daily_cash(jsonb);
DROP FUNCTION IF EXISTS public.medical_issue_practitioner_payout(jsonb);
DROP FUNCTION IF EXISTS public.medical_settle_chifa_bordereau(uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.medical_transmit_chifa_bordereau(uuid, uuid, uuid, uuid, text, text, text, jsonb, int, bigint, bigint, bigint);
DROP FUNCTION IF EXISTS public.medical_consume_supply_fefo(uuid, numeric, date);
DROP FUNCTION IF EXISTS public.medical_upsert_appointment_atomic(jsonb);

DROP TRIGGER IF EXISTS trg_guard_medical_appointment_no_overlap ON public.medical_appointments;
DROP FUNCTION IF EXISTS public.fn_guard_medical_appointment_no_overlap();

DROP TABLE IF EXISTS public.medical_cash_closures;
DROP TABLE IF EXISTS public.medical_doctor_payouts;
DROP TABLE IF EXISTS public.medical_chifa_bordereaux;
DROP TABLE IF EXISTS public.medical_ngap_acts;

ALTER TABLE public.medical_invoices
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS chifa_bordereau_id;

ALTER TABLE public.medical_consumables
  DROP COLUMN IF EXISTS fefo_policy,
  DROP COLUMN IF EXISTS lots;

ALTER TABLE public.medical_consultations
  DROP COLUMN IF EXISTS prescription_metadata,
  DROP COLUMN IF EXISTS allergy_override_reason,
  DROP COLUMN IF EXISTS allergy_override_confirmed,
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS is_paid,
  DROP COLUMN IF EXISTS insurance_share_centimes,
  DROP COLUMN IF EXISTS copay_centimes,
  DROP COLUMN IF EXISTS fee_centimes,
  DROP COLUMN IF EXISTS ticket_number,
  DROP COLUMN IF EXISTS urgency_level,
  DROP COLUMN IF EXISTS ngap_code;

ALTER TABLE public.medical_appointments
  DROP COLUMN IF EXISTS consultation_id,
  DROP COLUMN IF EXISTS emergency_bypass_reason,
  DROP COLUMN IF EXISTS is_emergency_bypass;

DROP INDEX IF EXISTS public.idx_medical_patients_crm_party;
ALTER TABLE public.medical_patients
  DROP COLUMN IF EXISTS vitals_history,
  DROP COLUMN IF EXISTS emergency_phone,
  DROP COLUMN IF EXISTS has_chifa_100_percent_ald,
  DROP COLUMN IF EXISTS social_security_number,
  DROP COLUMN IF EXISTS national_id,
  DROP COLUMN IF EXISTS crm_party_id;
