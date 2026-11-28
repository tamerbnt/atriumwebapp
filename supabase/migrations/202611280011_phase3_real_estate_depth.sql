-- ============================================================================
-- Atrium Phase 3 Step 11 (7.11 real_estate): Real Estate Depth Migration
--   - Sequence extensions: quittance (QTC), re_mandate (MND), re_lease (BAIL), re_fund_call (APP)
--   - Portfolio/Cadastral + Media & Portal Syndication Readiness (re_properties)
--   - Exclusive Mandate Overlap Guard & Co-Agent Split Bps (re_mandates)
--   - Lease Renewal, Indexation & Partial Rent Payment RPCs (re_leases, re_rent_schedules)
--   - Honest GPS Status & Real Signature Proof (re_visits)
--   - Extended 6-Stage Sales Pipeline & Closing Checklist (re_sales)
--   - Owner Ledger Extensions & Maintenance Tickets (re_owner_ledger, re_maintenance_tickets)
--   - Agent Commission Split & Payroll Bridge (re_agent_commissions)
--   - 4 Trade-Gap Modes: Syndic, VEFA Developers, Student Housing, Vacation Rentals
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
      're_fund_call'
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
    'quittance', 're_mandate', 're_lease', 're_fund_call'
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
-- 2) Extend re_properties (Media Gallery, Portal Sync, CRM Party link)
-- ----------------------------------------------------------------------------
ALTER TABLE public.re_properties
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_photo_url text,
  ADD COLUMN IF NOT EXISTS portal_sync jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- 3) Extend re_mandates (Exclusivity Guard & Co-Agent Split Bps)
-- ----------------------------------------------------------------------------
ALTER TABLE public.re_mandates
  ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_staff_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_negotiator_name text,
  ADD COLUMN IF NOT EXISTS primary_split_bps int NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS secondary_split_bps int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.re_mandates'::regclass
      AND conname = 'chk_re_mandates_split_sum'
  ) THEN
    ALTER TABLE public.re_mandates
      ADD CONSTRAINT chk_re_mandates_split_sum
      CHECK (
        primary_split_bps BETWEEN 0 AND 10000
        AND secondary_split_bps BETWEEN 0 AND 10000
        AND primary_split_bps + secondary_split_bps = 10000
      );
  END IF;
END $$;

UPDATE public.re_mandates
SET is_exclusive = true
WHERE mandate_type = 'Exclusif' AND is_exclusive = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_re_mandates_number_branch
  ON public.re_mandates (business_id, branch_id, mandate_number)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.fn_guard_re_exclusive_mandate_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict_number text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_exclusive, false) = true
     AND NEW.mandate_type = 'Exclusif' IS DISTINCT FROM false
     AND NEW.property_id IS NOT NULL
     AND NEW.status IN ('Active', 'Expiring') THEN
    SELECT m.mandate_number
      INTO v_conflict_number
    FROM public.re_mandates m
    WHERE m.business_id = NEW.business_id
      AND m.property_id = NEW.property_id
      AND m.id <> NEW.id
      AND m.deleted_at IS NULL
      AND COALESCE(m.is_exclusive, false) = true
      AND m.status IN ('Active', 'Expiring')
      AND daterange(m.start_date, COALESCE(m.end_date, '9999-12-31'::date), '[]')
          && daterange(NEW.start_date, COALESCE(NEW.end_date, '9999-12-31'::date), '[]')
    LIMIT 1;

    IF v_conflict_number IS NOT NULL THEN
      RAISE EXCEPTION 'RE_EXCLUSIVE_MANDATE_OVERLAP: Active exclusive mandate (%) already covers this property and period.', v_conflict_number
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_re_exclusive_mandate_overlap ON public.re_mandates;
CREATE TRIGGER trg_guard_re_exclusive_mandate_overlap
  BEFORE INSERT OR UPDATE ON public.re_mandates
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_re_exclusive_mandate_overlap();

-- ----------------------------------------------------------------------------
-- 4) Extend re_leases & re_rent_schedules (Renewal, Indexation, Partial Pay)
-- ----------------------------------------------------------------------------
ALTER TABLE public.re_leases
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS renewal_count int NOT NULL DEFAULT 0 CHECK (renewal_count >= 0),
  ADD COLUMN IF NOT EXISTS indexation_rate_percent numeric(6,2) NOT NULL DEFAULT 0 CHECK (indexation_rate_percent >= 0),
  ADD COLUMN IF NOT EXISTS indexation_frequency text NOT NULL DEFAULT 'Annual'
    CHECK (indexation_frequency IN ('Annual', 'Biennial', 'None')),
  ADD COLUMN IF NOT EXISTS next_indexation_date date,
  ADD COLUMN IF NOT EXISTS indexation_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.re_rent_schedules
  ADD COLUMN IF NOT EXISTS quittance_number text,
  ADD COLUMN IF NOT EXISTS charges_dzd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS timbre_fiscal_dzd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_due_dzd numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_payment_seq int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS unified_payment_id uuid,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid;

-- ----------------------------------------------------------------------------
-- 5) Extend re_visits (Explicit GPS Status — zero fake coordinate fallback)
-- ----------------------------------------------------------------------------
ALTER TABLE public.re_visits
  ADD COLUMN IF NOT EXISTS gps_status text NOT NULL DEFAULT 'unavailable'
    CHECK (gps_status IN ('captured', 'denied', 'unavailable', 'timeout')),
  ADD COLUMN IF NOT EXISTS gps_latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS gps_longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS gps_accuracy_meters int;

-- ----------------------------------------------------------------------------
-- 6) Extend re_sales (6-stage pipeline Offer..Finalisé + Checklist + Ledger)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.re_sales'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%stage%'
  LOOP
    EXECUTE format('ALTER TABLE public.re_sales DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.re_sales
  ADD CONSTRAINT chk_re_sales_stage
  CHECK (stage IN ('Offer', 'Promesse', 'Notaire', 'Enregistrement', 'Acte', 'Finalisé'));

ALTER TABLE public.re_sales
  ADD COLUMN IF NOT EXISTS deal_number text,
  ADD COLUMN IF NOT EXISTS mandate_id uuid REFERENCES public.re_mandates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_agent_staff_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_agent_staff_id uuid,
  ADD COLUMN IF NOT EXISTS primary_split_bps int NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS secondary_split_bps int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_dzd numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS unified_payment_id uuid,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid;

ALTER TABLE public.re_owner_ledger
  ADD COLUMN IF NOT EXISTS lease_id uuid REFERENCES public.re_leases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unified_payment_id uuid,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid,
  ADD COLUMN IF NOT EXISTS notes text;

-- ----------------------------------------------------------------------------
-- 7) Maintenance & Work Orders (re_maintenance_tickets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  ticket_number text NOT NULL,
  property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  lease_id uuid REFERENCES public.re_leases(id) ON DELETE SET NULL,
  owner_name text NOT NULL,
  tenant_name text,
  category text NOT NULL DEFAULT 'General'
    CHECK (category IN ('Plumbing', 'Electrical', 'Hvac', 'Elevator', 'Structural', 'General')),
  priority text NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  title text NOT NULL,
  description text,
  vendor_name text,
  vendor_phone text,
  estimated_cost_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (estimated_cost_dzd >= 0),
  actual_cost_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (actual_cost_dzd >= 0),
  charge_target text NOT NULL DEFAULT 'Owner' CHECK (charge_target IN ('Owner', 'Tenant', 'Agency')),
  owner_ledger_entry_id uuid REFERENCES public.re_owner_ledger(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'Assigned', 'InProgress', 'Resolved', 'Closed')),
  reported_at date NOT NULL DEFAULT CURRENT_DATE,
  resolved_at date,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_re_maintenance_tickets_num
  ON public.re_maintenance_tickets (business_id, branch_id, ticket_number)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 8) Agent Commission Split & Payroll Bridge (re_agent_commissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  agent_staff_id uuid NOT NULL,
  agent_name text NOT NULL,
  role_type text NOT NULL DEFAULT 'primary' CHECK (role_type IN ('primary', 'secondary', 'listing', 'selling')),
  source_type text NOT NULL DEFAULT 'SaleDeal' CHECK (source_type IN ('SaleDeal', 'Lease', 'Manual')),
  source_id uuid,
  reference_number text NOT NULL,
  period_month text NOT NULL,
  gross_commission_centimes bigint NOT NULL DEFAULT 0 CHECK (gross_commission_centimes >= 0),
  split_bps int NOT NULL DEFAULT 10000 CHECK (split_bps BETWEEN 0 AND 10000),
  agent_share_centimes bigint NOT NULL DEFAULT 0 CHECK (agent_share_centimes >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted_to_payroll', 'cancelled')),
  payroll_run_id uuid REFERENCES public.staff_payroll_runs(id) ON DELETE SET NULL,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_re_agent_commissions_period
  ON public.re_agent_commissions (business_id, branch_id, period_month)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 9) Trade-Gap Mode 1: Syndic / Co-Ownership Management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_syndic_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  building_code text NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  wilaya text NOT NULL DEFAULT '16 Alger',
  total_lots int NOT NULL DEFAULT 1 CHECK (total_lots > 0),
  total_tantiemes int NOT NULL DEFAULT 1000 CHECK (total_tantiemes > 0),
  reserve_fund_dzd numeric(14,2) NOT NULL DEFAULT 0,
  manager_name text,
  notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_syndic_fund_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  building_id uuid NOT NULL REFERENCES public.re_syndic_buildings(id) ON DELETE CASCADE,
  building_name text NOT NULL,
  call_number text NOT NULL,
  quarter_label text NOT NULL,
  due_date date NOT NULL,
  total_budget_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_budget_dzd >= 0),
  total_tantiemes int NOT NULL DEFAULT 1000 CHECK (total_tantiemes > 0),
  allocations jsonb NOT NULL DEFAULT '[]'::jsonb,
  collected_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (collected_dzd >= 0),
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Partial', 'Closed')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_re_syndic_fund_calls_num
  ON public.re_syndic_fund_calls (business_id, branch_id, call_number)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.re_syndic_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  building_id uuid NOT NULL REFERENCES public.re_syndic_buildings(id) ON DELETE CASCADE,
  building_name text NOT NULL,
  title text NOT NULL,
  assembly_type text NOT NULL DEFAULT 'AGO' CHECK (assembly_type IN ('AGO', 'AGE')),
  meeting_date date NOT NULL,
  present_tantiemes int NOT NULL DEFAULT 0 CHECK (present_tantiemes >= 0),
  represented_tantiemes int NOT NULL DEFAULT 0 CHECK (represented_tantiemes >= 0),
  total_tantiemes int NOT NULL DEFAULT 1000 CHECK (total_tantiemes > 0),
  quorum_percent numeric(5,2) NOT NULL DEFAULT 0,
  quorum_reached boolean NOT NULL DEFAULT false,
  resolutions_summary text,
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Held', 'Adjourned')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 10) Trade-Gap Mode 2: Property Developers / VEFA (Loi 11-04)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_dev_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  program_code text NOT NULL,
  name text NOT NULL,
  wilaya text NOT NULL DEFAULT '16 Alger',
  commune text,
  promoter_name text NOT NULL,
  fgci_guarantee_ref text,
  delivery_quarter text NOT NULL,
  total_units int NOT NULL DEFAULT 1 CHECK (total_units > 0),
  status text NOT NULL DEFAULT 'Structure'
    CHECK (status IN ('Planning', 'Foundation', 'Structure', 'Finishing', 'Delivered')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_dev_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  program_id uuid NOT NULL REFERENCES public.re_dev_programs(id) ON DELETE CASCADE,
  program_name text NOT NULL,
  lot_code text NOT NULL,
  typology text NOT NULL DEFAULT 'F3' CHECK (typology IN ('F2', 'F3', 'F4', 'F5', 'Duplex', 'Local')),
  floor_number int NOT NULL DEFAULT 1,
  surface_m2 numeric(10,2) NOT NULL DEFAULT 80,
  price_dzd numeric(16,2) NOT NULL DEFAULT 0 CHECK (price_dzd >= 0),
  buyer_name text,
  buyer_phone text,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid_total_dzd numeric(16,2) NOT NULL DEFAULT 0 CHECK (paid_total_dzd >= 0),
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'VefaSigned', 'Delivered')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 11) Trade-Gap Mode 3: Student Housing (Bed Occupancy & Semester Deposit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_student_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  residence_name text NOT NULL,
  room_code text NOT NULL,
  bed_code text NOT NULL,
  semester_label text NOT NULL,
  monthly_rate_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_rate_dzd >= 0),
  semester_deposit_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (semester_deposit_dzd >= 0),
  deposit_paid boolean NOT NULL DEFAULT false,
  student_name text,
  student_phone text,
  university_name text,
  check_in_date date,
  check_out_date date,
  status text NOT NULL DEFAULT 'Vacant' CHECK (status IN ('Vacant', 'Occupied', 'Reserved', 'Maintenance')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 12) Trade-Gap Mode 4: Vacation Rentals (Half-open [check_in, check_out) Guard)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.re_vacation_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  stay_code text NOT NULL,
  property_id uuid NOT NULL REFERENCES public.re_properties(id) ON DELETE CASCADE,
  property_title text NOT NULL,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  nights_count int NOT NULL DEFAULT 1 CHECK (nights_count > 0),
  nightly_rate_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (nightly_rate_dzd >= 0),
  cleaning_fee_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (cleaning_fee_dzd >= 0),
  total_amount_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount_dzd >= 0),
  deposit_dzd numeric(14,2) NOT NULL DEFAULT 0 CHECK (deposit_dzd >= 0),
  cleaning_status text NOT NULL DEFAULT 'Pending' CHECK (cleaning_status IN ('Pending', 'InProgress', 'CleanReady')),
  status text NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled')),
  notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_re_vacation_stay_dates CHECK (check_out_date > check_in_date)
);

CREATE OR REPLACE FUNCTION public.fn_guard_re_vacation_stay_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict_code text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.status = 'Cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT s.stay_code
    INTO v_conflict_code
  FROM public.re_vacation_stays s
  WHERE s.business_id = NEW.business_id
    AND s.property_id = NEW.property_id
    AND s.id <> NEW.id
    AND s.deleted_at IS NULL
    AND s.status IN ('Confirmed', 'CheckedIn')
    AND daterange(s.check_in_date, s.check_out_date, '[)')
        && daterange(NEW.check_in_date, NEW.check_out_date, '[)')
  LIMIT 1;

  IF v_conflict_code IS NOT NULL THEN
    RAISE EXCEPTION 'RE_VACATION_STAY_OVERLAP: Property already booked by stay % for these dates.', v_conflict_code
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_re_vacation_stay_overlap ON public.re_vacation_stays;
CREATE TRIGGER trg_guard_re_vacation_stay_overlap
  BEFORE INSERT OR UPDATE ON public.re_vacation_stays
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_re_vacation_stay_overlap();

-- ----------------------------------------------------------------------------
-- 13) RLS + updated_at + optimistic version triggers on all 9 new tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    're_maintenance_tickets',
    're_agent_commissions',
    're_syndic_buildings',
    're_syndic_fund_calls',
    're_syndic_assemblies',
    're_dev_programs',
    're_dev_lots',
    're_student_beds',
    're_vacation_stays'
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
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_optimistic_version ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_optimistic_version BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version()',
      t, t
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 14) Transactional RPCs: re_record_partial_rent_payment & re_apply_lease_indexation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.re_record_partial_rent_payment(
  p_schedule_id uuid,
  p_payment_dzd numeric,
  p_payment_method text DEFAULT 'Cash',
  p_timbre_fiscal_dzd numeric DEFAULT 0,
  p_quittance_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.re_rent_schedules%ROWTYPE;
  v_new_paid numeric;
  v_remaining numeric;
  v_new_status text;
  v_seq int;
BEGIN
  IF p_payment_dzd IS NULL OR p_payment_dzd <= 0 THEN
    RAISE EXCEPTION 'RE_INVALID_RENT_PAYMENT_AMOUNT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.re_rent_schedules
  WHERE id = p_schedule_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RE_RENT_SCHEDULE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_tenant_branch_member(v_row.business_id, v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_RE_TENANT_ACCESS' USING ERRCODE = '42501';
  END IF;

  v_new_paid := LEAST(v_row.amount_dzd, COALESCE(v_row.paid_amount_dzd, 0) + p_payment_dzd);
  v_remaining := GREATEST(0, v_row.amount_dzd - v_new_paid);
  v_seq := COALESCE(v_row.partial_payment_seq, 0) + 1;
  v_new_status := CASE WHEN v_remaining <= 0 THEN 'Paid' ELSE 'Partial' END;

  UPDATE public.re_rent_schedules
  SET paid_amount_dzd = v_new_paid,
      remaining_due_dzd = v_remaining,
      status = v_new_status,
      payment_method = COALESCE(p_payment_method, payment_method),
      timbre_fiscal_dzd = COALESCE(timbre_fiscal_dzd, 0) + GREATEST(0, COALESCE(p_timbre_fiscal_dzd, 0)),
      quittance_number = COALESCE(NULLIF(trim(p_quittance_number), ''), quittance_number),
      partial_payment_seq = v_seq,
      paid_at = CASE WHEN v_remaining <= 0 THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = p_schedule_id;

  RETURN jsonb_build_object(
    'schedule_id', p_schedule_id,
    'paid_amount_dzd', v_new_paid,
    'remaining_due_dzd', v_remaining,
    'status', v_new_status,
    'partial_payment_seq', v_seq
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.re_apply_lease_indexation(
  p_lease_id uuid,
  p_rate_percent numeric,
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lease public.re_leases%ROWTYPE;
  v_prev_rent numeric;
  v_new_rent numeric;
  v_next_date date;
  v_entry jsonb;
BEGIN
  IF p_rate_percent IS NULL OR p_rate_percent <= 0 THEN
    RAISE EXCEPTION 'RE_INVALID_INDEXATION_RATE' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_lease
  FROM public.re_leases
  WHERE id = p_lease_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RE_LEASE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_tenant_branch_member(v_lease.business_id, v_lease.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_RE_TENANT_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF v_lease.status <> 'Active' THEN
    RAISE EXCEPTION 'RE_INDEXATION_REQUIRES_ACTIVE_LEASE' USING ERRCODE = '22023';
  END IF;

  IF v_lease.indexation_frequency = 'None' THEN
    RAISE EXCEPTION 'RE_LEASE_INDEXATION_DISABLED' USING ERRCODE = '22023';
  END IF;

  IF v_lease.next_indexation_date IS NOT NULL AND p_as_of_date < v_lease.next_indexation_date THEN
    RAISE EXCEPTION 'RE_INDEXATION_DATE_NOT_REACHED: Allowed from %', v_lease.next_indexation_date
      USING ERRCODE = '22023';
  END IF;

  v_prev_rent := v_lease.monthly_rent_dzd;
  v_new_rent := round(v_prev_rent * (1 + p_rate_percent / 100.0));
  v_next_date := CASE
    WHEN v_lease.indexation_frequency = 'Biennial' THEN (p_as_of_date + INTERVAL '2 years')::date
    ELSE (p_as_of_date + INTERVAL '1 year')::date
  END;

  v_entry := jsonb_build_object(
    'appliedAt', p_as_of_date::text,
    'previousRentDzd', v_prev_rent,
    'newRentDzd', v_new_rent,
    'ratePercent', p_rate_percent,
    'note', COALESCE(p_note, '')
  );

  UPDATE public.re_leases
  SET monthly_rent_dzd = v_new_rent,
      indexation_rate_percent = p_rate_percent,
      next_indexation_date = v_next_date,
      indexation_history = COALESCE(indexation_history, '[]'::jsonb) || jsonb_build_array(v_entry),
      updated_at = now()
  WHERE id = p_lease_id;

  RETURN jsonb_build_object(
    'lease_id', p_lease_id,
    'previous_rent_dzd', v_prev_rent,
    'new_rent_dzd', v_new_rent,
    'next_indexation_date', v_next_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.re_record_partial_rent_payment(uuid, numeric, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.re_record_partial_rent_payment(uuid, numeric, text, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.re_apply_lease_indexation(uuid, numeric, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.re_apply_lease_indexation(uuid, numeric, date, text) TO authenticated;

COMMIT;
