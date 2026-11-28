-- Rollback for Phase 3 Step 14 (7.14 logistics_delivery) Depth Migration

BEGIN;

DROP FUNCTION IF EXISTS public.logistics_execute_remittance_validated(uuid, boolean);
DROP FUNCTION IF EXISTS public.logistics_record_discharge_with_variance(uuid, uuid, uuid, text, numeric, int, int, int, bigint, bigint, numeric);
DROP FUNCTION IF EXISTS public.logistics_verify_stopdesk_otp(uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.logistics_scan_parcel_guarded(uuid, text, uuid, text, boolean);

DROP TABLE IF EXISTS public.logistics_towing_dispatches;
DROP TABLE IF EXISTS public.logistics_customs_dossiers;
DROP TABLE IF EXISTS public.logistics_cold_chain_logs;
DROP TABLE IF EXISTS public.logistics_moving_quotes;
DROP TABLE IF EXISTS public.logistics_freight_waybills;
DROP TABLE IF EXISTS public.logistics_carrier_integrations;
DROP TABLE IF EXISTS public.logistics_merchant_fee_invoices;
DROP TABLE IF EXISTS public.logistics_vehicle_logs;
DROP TABLE IF EXISTS public.logistics_driver_payouts;
DROP TABLE IF EXISTS public.logistics_delivery_pods;

ALTER TABLE public.logistics_remittances
  DROP COLUMN IF EXISTS net_paid_centimes,
  DROP COLUMN IF EXISTS sfp01_exported_at,
  DROP COLUMN IF EXISTS ccp_validated;

ALTER TABLE public.logistics_discharges
  DROP COLUMN IF EXISTS supervisor_approved_at,
  DROP COLUMN IF EXISTS supervisor_approved_by,
  DROP COLUMN IF EXISTS requires_supervisor_review,
  DROP COLUMN IF EXISTS expected_parcel_count,
  DROP COLUMN IF EXISTS damaged_amount_centimes,
  DROP COLUMN IF EXISTS counterfeit_amount_centimes;

ALTER TABLE public.logistics_parcel_events
  DROP COLUMN IF EXISTS notification_status,
  DROP COLUMN IF EXISTS notification_recipient,
  DROP COLUMN IF EXISTS notification_channel;

ALTER TABLE public.logistics_parcels
  DROP COLUMN IF EXISTS settled_batch_id,
  DROP COLUMN IF EXISTS settled_at,
  DROP COLUMN IF EXISTS volumetric_weight_kg,
  DROP COLUMN IF EXISTS public_share_code,
  DROP COLUMN IF EXISTS assigned_driver_name,
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS return_reason_code,
  DROP COLUMN IF EXISTS otp_hash,
  DROP COLUMN IF EXISTS otp_locked_until,
  DROP COLUMN IF EXISTS otp_attempts,
  DROP COLUMN IF EXISTS pod_signed_by,
  DROP COLUMN IF EXISTS pod_signed_at,
  DROP COLUMN IF EXISTS pod_gps_lng,
  DROP COLUMN IF EXISTS pod_gps_lat,
  DROP COLUMN IF EXISTS pod_photo_path,
  DROP COLUMN IF EXISTS pod_signature_url;

-- Restore prior 28 sequence doc types from 202611280013
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.sequence_counters'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%doc_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.sequence_counters DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.sequence_counters
  ADD CONSTRAINT chk_sequence_counters_doc_type
  CHECK (
    doc_type IN (
      'z_report',
      'walk_in_ticket',
      'deposit_receipt',
      'payroll_run',
      'ncr',
      'inspection',
      'quote',
      'order',
      'delivery_note',
      'invoice',
      'credit_note',
      'receipt',
      'proforma',
      'payment',
      'journal_entry',
      'quittance',
      're_mandate',
      're_lease',
      're_fund_call',
      'mfg_alert',
      'mfg_maint',
      'mfg_fg_lot',
      'mfg_cut',
      'legal_inv',
      'legal_bailiff',
      'legal_arb',
      'legal_tpl',
      'legal_ledger'
    )
  );

CREATE OR REPLACE FUNCTION public._sequence_prefix(p_doc_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_doc_type
    WHEN 'z_report' THEN 'Z'
    WHEN 'walk_in_ticket' THEN 'WI'
    WHEN 'deposit_receipt' THEN 'DR'
    WHEN 'payroll_run' THEN 'PAY'
    WHEN 'ncr' THEN 'NCR'
    WHEN 'inspection' THEN 'INSP'
    WHEN 'quote' THEN 'DEV'
    WHEN 'order' THEN 'BC'
    WHEN 'delivery_note' THEN 'BL'
    WHEN 'invoice' THEN 'FAC'
    WHEN 'credit_note' THEN 'AV'
    WHEN 'receipt' THEN 'REC'
    WHEN 'proforma' THEN 'PRO'
    WHEN 'payment' THEN 'REG'
    WHEN 'journal_entry' THEN 'EC'
    WHEN 'quittance' THEN 'QTC'
    WHEN 're_mandate' THEN 'MND'
    WHEN 're_lease' THEN 'BAIL'
    WHEN 're_fund_call' THEN 'APP'
    WHEN 'mfg_alert' THEN 'ANDN'
    WHEN 'mfg_maint' THEN 'MNT'
    WHEN 'mfg_fg_lot' THEN 'PFG'
    WHEN 'mfg_cut' THEN 'CUT'
    WHEN 'legal_inv' THEN 'HNR'
    WHEN 'legal_bailiff' THEN 'HUI'
    WHEN 'legal_arb' THEN 'ARB'
    WHEN 'legal_tpl' THEN 'TPL'
    WHEN 'legal_ledger' THEN 'EXP'
    ELSE 'DOC'
  END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_sequence_number(
  p_business_id uuid,
  p_branch_id uuid,
  p_doc_type text,
  p_fiscal_year smallint DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_branch_business_id uuid;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_counter_id uuid;
  v_next_number bigint;
  v_prefix text;
  v_formatted text;
  v_year smallint := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::smallint);
BEGIN
  IF p_business_id IS NULL OR p_branch_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SEQUENCE_CONTEXT' USING ERRCODE = '22023';
  END IF;

  IF p_doc_type NOT IN (
    'z_report', 'walk_in_ticket', 'deposit_receipt', 'payroll_run', 'ncr', 'inspection',
    'quote', 'order', 'delivery_note', 'invoice', 'credit_note', 'receipt', 'proforma',
    'payment', 'journal_entry',
    'quittance', 're_mandate', 're_lease', 're_fund_call',
    'mfg_alert', 'mfg_maint', 'mfg_fg_lot', 'mfg_cut',
    'legal_inv', 'legal_bailiff', 'legal_arb', 'legal_tpl', 'legal_ledger'
  ) THEN
    RAISE EXCEPTION 'UNSUPPORTED_SEQUENCE_DOC_TYPE' USING ERRCODE = '22023';
  END IF;

  SELECT b.account_id, b.business_id
    INTO v_account_id, v_branch_business_id
  FROM public.branches b
  WHERE b.id = p_branch_id
    AND b.is_active = true
  LIMIT 1;

  IF v_account_id IS NULL
     OR v_branch_business_id IS DISTINCT FROM p_business_id
     OR v_caller_account_id IS DISTINCT FROM v_account_id
     OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SEQUENCE_ACCESS' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sequence_counters (
    account_id, business_id, branch_id, doc_type, fiscal_year, last_number
  ) VALUES (
    v_account_id, p_business_id, p_branch_id, p_doc_type, v_year, 0
  )
  ON CONFLICT (business_id, branch_id, doc_type, fiscal_year) DO NOTHING;

  SELECT sc.id, sc.last_number
    INTO v_counter_id, v_next_number
  FROM public.sequence_counters sc
  WHERE sc.business_id = p_business_id
    AND sc.branch_id = p_branch_id
    AND sc.doc_type = p_doc_type
    AND sc.fiscal_year = v_year
  FOR UPDATE;

  v_next_number := v_next_number + 1;

  UPDATE public.sequence_counters
  SET last_number = v_next_number,
      updated_at = now()
  WHERE id = v_counter_id;

  v_prefix := public._sequence_prefix(p_doc_type);
  v_formatted := format('%s-%s-%s', v_prefix, v_year, lpad(v_next_number::text, 5, '0'));

  RETURN jsonb_build_object(
    'doc_type', p_doc_type,
    'fiscal_year', v_year,
    'seq_number', v_next_number,
    'prefix', v_prefix,
    'formatted_number', v_formatted
  );
END;
$$;

COMMIT;
