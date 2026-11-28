-- ============================================================================
-- Atrium Phase 3 Step 14 (7.14 logistics_delivery): Logistics, Courier & Freight Depth
--   - Sequence extensions: log_parcel (AWB), log_manifest (LVR),
--     log_discharge (DECH), log_remittance (REM), log_waybill (FRT),
--     log_towing (TOW), log_customs (D10), log_driver_pay (LPAY)
--   - Guarded private Storage bucket: logistics-pod (10 MB max, PNG/JPEG/WEBP/PDF)
--   - Parcel POD, OTP lockout, attempt counter & volumetric extensions
--   - Guarded discharge variance & remittance CCP Mod-97 extensions
--   - 10 new depth & [trade gap] tables:
--       logistics_delivery_pods, logistics_driver_payouts, logistics_vehicle_logs,
--       logistics_merchant_fee_invoices, logistics_carrier_integrations,
--       logistics_freight_waybills, logistics_moving_quotes,
--       logistics_cold_chain_logs, logistics_customs_dossiers,
--       logistics_towing_dispatches
--   - Guarded RPCs:
--       logistics_scan_parcel_guarded, logistics_verify_stopdesk_otp,
--       logistics_record_discharge_with_variance, logistics_execute_remittance_validated
--   - Tenant+Branch RLS, Optimistic Versioning & Integrity Triggers
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Extend sequence_counters doc_type CHECK & allocate_sequence_number RPC
-- ----------------------------------------------------------------------------
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
      'legal_ledger',
      'log_parcel',
      'log_manifest',
      'log_discharge',
      'log_remittance',
      'log_waybill',
      'log_towing',
      'log_customs',
      'log_driver_pay'
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
    WHEN 'log_parcel' THEN 'AWB'
    WHEN 'log_manifest' THEN 'LVR'
    WHEN 'log_discharge' THEN 'DECH'
    WHEN 'log_remittance' THEN 'REM'
    WHEN 'log_waybill' THEN 'FRT'
    WHEN 'log_towing' THEN 'TOW'
    WHEN 'log_customs' THEN 'D10'
    WHEN 'log_driver_pay' THEN 'LPAY'
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
    'legal_inv', 'legal_bailiff', 'legal_arb', 'legal_tpl', 'legal_ledger',
    'log_parcel', 'log_manifest', 'log_discharge', 'log_remittance',
    'log_waybill', 'log_towing', 'log_customs', 'log_driver_pay'
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

-- ----------------------------------------------------------------------------
-- 2) Guarded Private Storage Bucket (logistics-pod)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'logistics-pod',
      'logistics-pod',
      false,
      10485760,
      ARRAY[
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/svg+xml',
        'application/pdf'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Extend Existing logistics_* Tables (Parcels, Events, Discharges, Remittances)
-- ----------------------------------------------------------------------------
ALTER TABLE public.logistics_parcels
  ADD COLUMN IF NOT EXISTS pod_signature_url text,
  ADD COLUMN IF NOT EXISTS pod_photo_path text,
  ADD COLUMN IF NOT EXISTS pod_gps_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS pod_gps_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS pod_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pod_signed_by text,
  ADD COLUMN IF NOT EXISTS otp_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS otp_hash text,
  ADD COLUMN IF NOT EXISTS return_reason_code text,
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_driver_name text,
  ADD COLUMN IF NOT EXISTS public_share_code text,
  ADD COLUMN IF NOT EXISTS volumetric_weight_kg numeric(8,2),
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS settled_batch_id uuid;

ALTER TABLE public.logistics_parcel_events
  ADD COLUMN IF NOT EXISTS notification_channel text CHECK (notification_channel IS NULL OR notification_channel IN ('sms', 'whatsapp', 'email', 'system')),
  ADD COLUMN IF NOT EXISTS notification_recipient text,
  ADD COLUMN IF NOT EXISTS notification_status text CHECK (notification_status IS NULL OR notification_status IN ('Queued', 'Sent', 'Failed'));

ALTER TABLE public.logistics_discharges
  ADD COLUMN IF NOT EXISTS counterfeit_amount_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damaged_amount_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_parcel_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_supervisor_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_approved_by uuid,
  ADD COLUMN IF NOT EXISTS supervisor_approved_at timestamptz;

ALTER TABLE public.logistics_remittances
  ADD COLUMN IF NOT EXISTS ccp_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sfp01_exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS net_paid_centimes bigint NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 4) 10 New Depth & Specialty Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_delivery_pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  parcel_id uuid REFERENCES public.logistics_parcels(id) ON DELETE CASCADE,
  tracking_code text NOT NULL,
  driver_name text NOT NULL,
  outcome text NOT NULL DEFAULT 'Delivered' CHECK (outcome IN ('Delivered', 'Postponed', 'Returned')),
  reason_code text,
  signature_svg text,
  photo_storage_path text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  recipient_signed_name text,
  notes text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  payout_number text NOT NULL,
  driver_name text NOT NULL,
  employment_type text NOT NULL DEFAULT 'salaried' CHECK (employment_type IN ('salaried', 'freelance_commission')),
  period_label text NOT NULL,
  delivered_count int NOT NULL DEFAULT 0,
  returned_count int NOT NULL DEFAULT 0,
  shortage_deduction_centimes bigint NOT NULL DEFAULT 0,
  gross_compensation_centimes bigint NOT NULL DEFAULT 0,
  tax_withheld_centimes bigint NOT NULL DEFAULT 0,
  net_payable_centimes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_vehicle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  vehicle_id uuid REFERENCES public.logistics_fleet(id) ON DELETE SET NULL,
  vehicle_plate text NOT NULL,
  log_kind text NOT NULL DEFAULT 'Fuel' CHECK (log_kind IN ('Fuel', 'Maintenance', 'Insurance', 'Toll')),
  odometer_km numeric(12,1) NOT NULL DEFAULT 0,
  liters numeric(8,2) NOT NULL DEFAULT 0,
  cost_centimes bigint NOT NULL DEFAULT 0,
  provider_name text,
  notes text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_merchant_fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  invoice_number text NOT NULL,
  merchant_id uuid REFERENCES public.logistics_merchants(id) ON DELETE SET NULL,
  merchant_name text NOT NULL,
  period_label text NOT NULL,
  delivered_count int NOT NULL DEFAULT 0,
  returned_count int NOT NULL DEFAULT 0,
  gross_cod_centimes bigint NOT NULL DEFAULT 0,
  total_fees_ttc_centimes bigint NOT NULL DEFAULT 0,
  net_merchant_payable_centimes bigint NOT NULL DEFAULT 0,
  scf_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  unified_document_id uuid,
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Settled')),
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_carrier_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  store_name text NOT NULL,
  platform text NOT NULL DEFAULT 'WooCommerce' CHECK (platform IN ('Shopify', 'WooCommerce', 'YouCan', 'CustomAPI')),
  webhook_url text NOT NULL,
  signing_secret_hint text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  orders_imported_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_freight_waybills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  waybill_number text NOT NULL,
  shipper_name text NOT NULL,
  consignee_name text NOT NULL,
  origin_wilaya text NOT NULL,
  destination_wilaya text NOT NULL,
  cargo_description text NOT NULL,
  weight_tons numeric(10,3) NOT NULL DEFAULT 1,
  distance_km numeric(10,1) NOT NULL DEFAULT 100,
  rate_per_km_dzd numeric(10,2) NOT NULL DEFAULT 120,
  fuel_surcharge_percent numeric(5,2) NOT NULL DEFAULT 8,
  loading_fee_dzd numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc_centimes bigint NOT NULL DEFAULT 0,
  vehicle_plate text,
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Loading', 'InTransit', 'Delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_moving_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  quote_number text NOT NULL,
  client_name text NOT NULL,
  origin_address text NOT NULL,
  destination_address text NOT NULL,
  volume_m3 numeric(8,2) NOT NULL DEFAULT 15,
  distance_km numeric(10,1) NOT NULL DEFAULT 25,
  origin_floor int NOT NULL DEFAULT 0,
  destination_floor int NOT NULL DEFAULT 0,
  has_elevator_origin boolean NOT NULL DEFAULT false,
  has_elevator_dest boolean NOT NULL DEFAULT false,
  packing_included boolean NOT NULL DEFAULT true,
  crew_size int NOT NULL DEFAULT 3,
  total_ttc_centimes bigint NOT NULL DEFAULT 0,
  move_date date,
  status text NOT NULL DEFAULT 'Quoted' CHECK (status IN ('Quoted', 'Confirmed', 'Completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_cold_chain_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  vehicle_plate text NOT NULL,
  cargo_type text NOT NULL,
  recorded_temp_c numeric(6,2) NOT NULL,
  min_allowed_temp_c numeric(6,2) NOT NULL DEFAULT 2,
  max_allowed_temp_c numeric(6,2) NOT NULL DEFAULT 8,
  excursion_minutes int NOT NULL DEFAULT 0,
  compliance_status text NOT NULL DEFAULT 'Compliant' CHECK (compliance_status IN ('Compliant', 'Warning', 'Breach')),
  requires_quarantine boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_customs_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  dossier_number text NOT NULL,
  importer_name text NOT NULL,
  bl_awb_reference text NOT NULL,
  port_name text NOT NULL,
  hs_code text NOT NULL,
  fob_value_dzd numeric(14,2) NOT NULL DEFAULT 0,
  freight_dzd numeric(14,2) NOT NULL DEFAULT 0,
  insurance_dzd numeric(14,2) NOT NULL DEFAULT 0,
  customs_duty_rate_percent numeric(6,2) NOT NULL DEFAULT 15,
  total_payable_centimes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Lodged' CHECK (status IN ('Lodged', 'Inspecting', 'Cleared', 'Released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_towing_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  version bigint NOT NULL DEFAULT 1,
  dispatch_number text NOT NULL,
  caller_name text NOT NULL,
  caller_phone text NOT NULL,
  vehicle_class text NOT NULL DEFAULT 'VL' CHECK (vehicle_class IN ('VL', 'Utilitaire', 'PoidsLourd')),
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  distance_km numeric(8,1) NOT NULL DEFAULT 15,
  is_night_or_weekend boolean NOT NULL DEFAULT false,
  needs_winch_extraction boolean NOT NULL DEFAULT false,
  total_centimes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Dispatched' CHECK (status IN ('Dispatched', 'OnScene', 'Completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 5) Guarded Server RPCs for Scan Dedup, Stop-Desk Lockout, Discharge & CCP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.logistics_scan_parcel_guarded(
  p_parcel_id uuid,
  p_stage text,
  p_bag_id uuid DEFAULT NULL,
  p_location text DEFAULT 'Hub National Alger',
  p_allow_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parcel public.logistics_parcels%ROWTYPE;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_next_db_status text;
BEGIN
  SELECT * INTO v_parcel
  FROM public.logistics_parcels
  WHERE id = p_parcel_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARCEL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_caller_account_id IS DISTINCT FROM v_parcel.account_id
     OR NOT public.can_access_branch(v_parcel.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PARCEL_ACCESS' USING ERRCODE = '42501';
  END IF;

  v_next_db_status := CASE p_stage
    WHEN 'Bagging' THEN 'InHub'
    WHEN 'Intake' THEN 'PickedUp'
    ELSE 'InHub'
  END;

  IF NOT p_allow_override AND (
    (p_stage = 'Bagging' AND v_parcel.bag_id IS NOT NULL AND v_parcel.bag_id = p_bag_id)
    OR (p_stage <> 'Bagging' AND v_parcel.status = v_next_db_status)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_PARCEL_SCAN' USING ERRCODE = '23505';
  END IF;

  UPDATE public.logistics_parcels
  SET status = v_next_db_status,
      bag_id = COALESCE(p_bag_id, bag_id),
      updated_at = now()
  WHERE id = p_parcel_id;

  INSERT INTO public.logistics_parcel_events (
    account_id, business_id, branch_id, parcel_id, status, location, notes
  ) VALUES (
    v_parcel.account_id, v_parcel.business_id, v_parcel.branch_id,
    v_parcel.id, v_next_db_status, COALESCE(p_location, 'Hub'),
    format('Scan %s (override=%s)', p_stage, p_allow_override::text)
  );

  RETURN jsonb_build_object(
    'parcel_id', v_parcel.id,
    'tracking_code', v_parcel.tracking_code,
    'status', v_next_db_status,
    'bag_id', COALESCE(p_bag_id, v_parcel.bag_id),
    'overridden', p_allow_override
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.logistics_verify_stopdesk_otp(
  p_parcel_id uuid,
  p_entered_otp text,
  p_expected_otp text,
  p_recipient_id_number text DEFAULT NULL,
  p_manager_unlock boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parcel public.logistics_parcels%ROWTYPE;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_attempts int;
BEGIN
  SELECT * INTO v_parcel
  FROM public.logistics_parcels
  WHERE id = p_parcel_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARCEL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_caller_account_id IS DISTINCT FROM v_parcel.account_id
     OR NOT public.can_access_branch(v_parcel.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PARCEL_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF p_manager_unlock THEN
    UPDATE public.logistics_parcels
    SET otp_attempts = 0,
        otp_locked_until = NULL,
        updated_at = now()
    WHERE id = p_parcel_id;

    RETURN jsonb_build_object('unlocked', true, 'attempts', 0);
  END IF;

  IF COALESCE(v_parcel.otp_attempts, 0) >= 3 OR (v_parcel.otp_locked_until IS NOT NULL AND v_parcel.otp_locked_until > now()) THEN
    RAISE EXCEPTION 'OTP_LOCKED_OUT' USING ERRCODE = '42501';
  END IF;

  IF trim(COALESCE(p_entered_otp, '')) <> trim(COALESCE(p_expected_otp, '')) THEN
    v_attempts := COALESCE(v_parcel.otp_attempts, 0) + 1;
    UPDATE public.logistics_parcels
    SET otp_attempts = v_attempts,
        otp_locked_until = CASE WHEN v_attempts >= 3 THEN now() + interval '1 hour' ELSE NULL END,
        updated_at = now()
    WHERE id = p_parcel_id;

    RETURN jsonb_build_object(
      'verified', false,
      'attempts', v_attempts,
      'locked_out', v_attempts >= 3
    );
  END IF;

  UPDATE public.logistics_parcels
  SET status = 'Delivered',
      otp_attempts = 0,
      otp_locked_until = NULL,
      pod_signed_by = COALESCE(p_recipient_id_number, pod_signed_by),
      pod_signed_at = now(),
      updated_at = now()
  WHERE id = p_parcel_id;

  RETURN jsonb_build_object(
    'verified', true,
    'parcel_id', p_parcel_id,
    'status', 'Delivered'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.logistics_record_discharge_with_variance(
  p_business_id uuid,
  p_branch_id uuid,
  p_driver_id uuid,
  p_driver_name text,
  p_collected_cash_dzd numeric,
  p_delivered_count int,
  p_returned_count int,
  p_expected_parcel_count int,
  p_counterfeit_centimes bigint DEFAULT 0,
  p_damaged_centimes bigint DEFAULT 0,
  p_expected_cash_dzd numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_discharge_id uuid := gen_random_uuid();
  v_discharge_num text;
  v_usable_centimes bigint;
  v_requires_review boolean;
BEGIN
  SELECT b.account_id INTO v_account_id
  FROM public.branches b WHERE b.id = p_branch_id LIMIT 1;

  IF v_account_id IS NULL
     OR v_caller_account_id IS DISTINCT FROM v_account_id
     OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_DISCHARGE_ACCESS' USING ERRCODE = '42501';
  END IF;

  v_usable_centimes := GREATEST(0, round(COALESCE(p_collected_cash_dzd, 0) * 100)::bigint - GREATEST(0, COALESCE(p_counterfeit_centimes, 0)) - GREATEST(0, COALESCE(p_damaged_centimes, 0)));
  v_requires_review := (v_usable_centimes <> round(COALESCE(p_expected_cash_dzd, 0) * 100)::bigint)
    OR COALESCE(p_counterfeit_centimes, 0) > 0
    OR COALESCE(p_damaged_centimes, 0) > 0
    OR (COALESCE(p_expected_parcel_count, 0) > 0 AND (COALESCE(p_delivered_count, 0) + COALESCE(p_returned_count, 0)) <> p_expected_parcel_count);

  v_discharge_num := (public.allocate_sequence_number(p_business_id, p_branch_id, 'log_discharge'))->>'formatted_number';

  INSERT INTO public.logistics_discharges (
    id, account_id, business_id, branch_id, discharge_number,
    driver_id, driver_name, collected_cash_dzd, delivered_count, returned_count,
    expected_parcel_count, counterfeit_amount_centimes, damaged_amount_centimes,
    requires_supervisor_review
  ) VALUES (
    v_discharge_id, v_account_id, p_business_id, p_branch_id, v_discharge_num,
    p_driver_id, p_driver_name, round(v_usable_centimes::numeric / 100.0, 2),
    COALESCE(p_delivered_count, 0), COALESCE(p_returned_count, 0),
    COALESCE(p_expected_parcel_count, 0), GREATEST(0, COALESCE(p_counterfeit_centimes, 0)),
    GREATEST(0, COALESCE(p_damaged_centimes, 0)), v_requires_review
  );

  RETURN jsonb_build_object(
    'discharge_id', v_discharge_id,
    'discharge_number', v_discharge_num,
    'usable_centimes', v_usable_centimes,
    'requires_supervisor_review', v_requires_review
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.logistics_execute_remittance_validated(
  p_remittance_id uuid,
  p_ccp_validated boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rem public.logistics_remittances%ROWTYPE;
  v_caller_account_id uuid := public.get_auth_account_id();
BEGIN
  SELECT * INTO v_rem
  FROM public.logistics_remittances
  WHERE id = p_remittance_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REMITTANCE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_caller_account_id IS DISTINCT FROM v_rem.account_id
     OR NOT public.can_access_branch(v_rem.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_REMITTANCE_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF NOT p_ccp_validated AND NOT v_rem.ccp_validated THEN
    RAISE EXCEPTION 'CCP_CHECKSUM_NOT_VALIDATED' USING ERRCODE = '23514';
  END IF;

  IF COALESCE(v_rem.net_paid_dzd, 0) <= 0 THEN
    RAISE EXCEPTION 'REMITTANCE_NET_AMOUNT_NON_POSITIVE' USING ERRCODE = '23514';
  END IF;

  UPDATE public.logistics_remittances
  SET ccp_validated = true,
      status = 'Executed',
      remitted_at = now(),
      net_paid_centimes = round(net_paid_dzd * 100)::bigint,
      updated_at = now()
  WHERE id = p_remittance_id;

  RETURN jsonb_build_object(
    'remittance_id', p_remittance_id,
    'status', 'Executed',
    'net_paid_dzd', v_rem.net_paid_dzd
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6) Enable RLS + Tenant+Branch Policies + Triggers on New Tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  v_new_tables text[] := ARRAY[
    'logistics_delivery_pods',
    'logistics_driver_payouts',
    'logistics_vehicle_logs',
    'logistics_merchant_fee_invoices',
    'logistics_carrier_integrations',
    'logistics_freight_waybills',
    'logistics_moving_quotes',
    'logistics_cold_chain_logs',
    'logistics_customs_dossiers',
    'logistics_towing_dispatches'
  ];
BEGIN
  FOREACH t IN ARRAY v_new_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_delete_' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (deleted_at IS NULL AND account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_select_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_insert_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id)) WITH CHECK (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_update_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_delete_' || t, t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'trg_' || t || '_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_updated_at();',
      'trg_' || t || '_updated_at', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'trg_' || t || '_optimistic_version', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();',
      'trg_' || t || '_optimistic_version', t
    );
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.logistics_scan_parcel_guarded(uuid, text, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_scan_parcel_guarded(uuid, text, uuid, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.logistics_verify_stopdesk_otp(uuid, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_verify_stopdesk_otp(uuid, text, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.logistics_record_discharge_with_variance(uuid, uuid, uuid, text, numeric, int, int, int, bigint, bigint, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_record_discharge_with_variance(uuid, uuid, uuid, text, numeric, int, int, int, bigint, bigint, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.logistics_execute_remittance_validated(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_execute_remittance_validated(uuid, boolean) TO authenticated;

COMMIT;
