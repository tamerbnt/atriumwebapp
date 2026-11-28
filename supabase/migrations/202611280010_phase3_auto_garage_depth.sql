-- ============================================================================
-- Phase 3 Step 10 (7.10 auto_garage): Workshop, Purchasing, Fleet, Body Shop &
-- Inspection Operations Depth
-- Covers:
--   * Normalized vehicle_type ('car' | 'utility' | 'truck' | 'moto'), plate_format,
--     CRM party linkage, reminder dates (tech_control_expiry, insurance_expiry),
--     and immutable ownership_history log on garage_vehicles
--   * Customer estimate approval + photo URLs/attachments, quote unit price snapshot
--     (drift detection), flat-rate labor lines, mileage override reason, detailing
--     package link, locked-invoiced flag + reopen credit-note audit fields on
--     garage_work_orders
--   * DB double-assignment bay guard trigger + upgraded atomic garage_assign_bay
--   * Extended garage_parts, garage_suppliers & garage_purchase_orders (goods receipt,
--     BL number, warranty tracking) + garage_receive_purchase_order &
--     garage_reopen_invoiced_order SECURITY DEFINER RPCs
--   * Normalized RLS-isolated tables: garage_flat_rate_labor, garage_technician_time_logs,
--     garage_tech_commissions, garage_insurance_claims, garage_inspection_pvs,
--     garage_detailing_packages, garage_tire_storage
-- ============================================================================

-- 1) Extend garage_vehicles
ALTER TABLE public.garage_vehicles
  ADD COLUMN IF NOT EXISTS crm_party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'car'
    CHECK (vehicle_type IN ('car', 'utility', 'truck', 'moto')),
  ADD COLUMN IF NOT EXISTS plate_format text NOT NULL DEFAULT 'algeria_standard'
    CHECK (plate_format IN ('algeria_standard', 'algeria_new', 'temporary', 'foreign', 'moto')),
  ADD COLUMN IF NOT EXISTS last_service_km int,
  ADD COLUMN IF NOT EXISTS last_service_date date,
  ADD COLUMN IF NOT EXISTS next_service_km int,
  ADD COLUMN IF NOT EXISTS next_service_date date,
  ADD COLUMN IF NOT EXISTS daily_avg_km int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tech_control_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS carte_grise_number text,
  ADD COLUMN IF NOT EXISTS ownership_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_garage_vehicles_crm_party
  ON public.garage_vehicles (business_id, crm_party_id)
  WHERE deleted_at IS NULL AND crm_party_id IS NOT NULL;

-- 2) Extend garage_work_orders
ALTER TABLE public.garage_work_orders
  ADD COLUMN IF NOT EXISTS client_crm_party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimate_status text NOT NULL DEFAULT 'draft'
    CHECK (estimate_status IN ('draft', 'sent', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS estimate_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimate_approved_by text,
  ADD COLUMN IF NOT EXISTS estimate_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_unit_prices_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS labor_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mileage_override_reason text,
  ADD COLUMN IF NOT EXISTS detailing_package_id uuid,
  ADD COLUMN IF NOT EXISTS is_locked_invoiced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reopen_credit_note_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL;

-- 3) Extend garage_parts, garage_suppliers & garage_purchase_orders (Fix 5.2 real purchasing)
ALTER TABLE public.garage_parts
  ADD COLUMN IF NOT EXISTS oem_reference text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.garage_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compatibility jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_warranty_months int NOT NULL DEFAULT 6 CHECK (default_warranty_months >= 0);

ALTER TABLE public.garage_suppliers
  ADD COLUMN IF NOT EXISTS crm_party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS rc_number text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS payment_terms_days int NOT NULL DEFAULT 30;

ALTER TABLE public.garage_purchase_orders
  ADD COLUMN IF NOT EXISTS delivery_note_number text,
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by_name text,
  ADD COLUMN IF NOT EXISTS warranty_months int NOT NULL DEFAULT 6 CHECK (warranty_months >= 0),
  ADD COLUMN IF NOT EXISTS warranty_expiry_date date,
  ADD COLUMN IF NOT EXISTS lines_received jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.scf_journal_entries(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_garage_purchase_orders_branch_num
  ON public.garage_purchase_orders (business_id, branch_id, po_number)
  WHERE deleted_at IS NULL;

-- 4) Normalized garage_flat_rate_labor (Barème temps constructeur / atelier)
CREATE TABLE IF NOT EXISTS public.garage_flat_rate_labor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'Mécanique',
  standard_hours numeric(8,2) NOT NULL DEFAULT 1.00 CHECK (standard_hours >= 0),
  hourly_rate_centimes bigint NOT NULL DEFAULT 250000 CHECK (hourly_rate_centimes >= 0),
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garage_flat_rate_labor_code
  ON public.garage_flat_rate_labor (business_id, branch_id, code)
  WHERE deleted_at IS NULL;

-- 5) Normalized garage_technician_time_logs (Pointage intervention mécanicien)
CREATE TABLE IF NOT EXISTS public.garage_technician_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  work_order_id uuid NOT NULL REFERENCES public.garage_work_orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  technician_staff_id uuid,
  technician_name text NOT NULL,
  task_label text NOT NULL DEFAULT 'Intervention atelier',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes int NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  labor_revenue_centimes bigint NOT NULL DEFAULT 0 CHECK (labor_revenue_centimes >= 0),
  commission_rate_bps int NOT NULL DEFAULT 1500 CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  commission_centimes bigint NOT NULL DEFAULT 0 CHECK (commission_centimes >= 0),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'voided')),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_garage_time_logs_order
  ON public.garage_technician_time_logs (business_id, work_order_id)
  WHERE deleted_at IS NULL;

-- 6) Normalized garage_tech_commissions (Primes / Commissions Mécaniciens vers Paie)
CREATE TABLE IF NOT EXISTS public.garage_tech_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  technician_staff_id uuid NOT NULL,
  technician_name text NOT NULL,
  work_order_id uuid REFERENCES public.garage_work_orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  period_month text NOT NULL,
  labor_base_centimes bigint NOT NULL DEFAULT 0 CHECK (labor_base_centimes >= 0),
  commission_rate_bps int NOT NULL DEFAULT 1500 CHECK (commission_rate_bps >= 0 AND commission_rate_bps <= 10000),
  commission_centimes bigint NOT NULL DEFAULT 0 CHECK (commission_centimes >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted_to_payroll', 'cancelled')),
  payroll_run_id uuid REFERENCES public.staff_payroll_runs(id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_garage_tech_commissions_period
  ON public.garage_tech_commissions (business_id, branch_id, period_month)
  WHERE deleted_at IS NULL;

-- 7) Normalized garage_insurance_claims (Dossiers sinistres Carrosserie & Experts)
CREATE TABLE IF NOT EXISTS public.garage_insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  claim_number text NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.garage_work_orders(id) ON DELETE CASCADE,
  insurer_name text NOT NULL,
  policy_number text,
  expert_name text,
  accident_date date,
  claimed_centimes bigint NOT NULL DEFAULT 0 CHECK (claimed_centimes >= 0),
  deductible_centimes bigint NOT NULL DEFAULT 0 CHECK (deductible_centimes >= 0),
  approved_centimes bigint NOT NULL DEFAULT 0 CHECK (approved_centimes >= 0),
  status text NOT NULL DEFAULT 'declared'
    CHECK (status IN ('declared', 'expert_pending', 'agreed', 'repaired', 'settled', 'rejected')),
  expert_pv_ref text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garage_insurance_claims_num
  ON public.garage_insurance_claims (business_id, branch_id, claim_number)
  WHERE deleted_at IS NULL;

-- 8) Normalized garage_inspection_pvs (Centres Contrôle Technique & Checklist PV)
CREATE TABLE IF NOT EXISTS public.garage_inspection_pvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  pv_number text NOT NULL,
  vehicle_id uuid REFERENCES public.garage_vehicles(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.garage_work_orders(id) ON DELETE SET NULL,
  plate_number text NOT NULL,
  odometer_km int NOT NULL DEFAULT 0,
  inspector_name text NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  verdict text NOT NULL DEFAULT 'favorable'
    CHECK (verdict IN ('favorable', 'contre_visite', 'immobilise')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  defects_count int NOT NULL DEFAULT 0 CHECK (defects_count >= 0),
  major_defects_count int NOT NULL DEFAULT 0 CHECK (major_defects_count >= 0),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garage_inspection_pvs_num
  ON public.garage_inspection_pvs (business_id, branch_id, pv_number)
  WHERE deleted_at IS NULL;

-- 9) Normalized garage_detailing_packages (Formules Esthétique / Detailing / Céramique)
CREATE TABLE IF NOT EXISTS public.garage_detailing_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('express', 'standard', 'ceramic', 'ppf')),
  duration_minutes int NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  price_centimes bigint NOT NULL DEFAULT 800000 CHECK (price_centimes >= 0),
  included_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 10) Normalized garage_tire_storage (Hôtel Pneus & Gardiennage saisonnier)
CREATE TABLE IF NOT EXISTS public.garage_tire_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  storage_tag text NOT NULL,
  vehicle_id uuid REFERENCES public.garage_vehicles(id) ON DELETE SET NULL,
  plate_number text NOT NULL,
  owner_name text NOT NULL,
  season text NOT NULL DEFAULT 'winter' CHECK (season IN ('summer', 'winter', 'all_season')),
  tire_size text NOT NULL,
  brand text,
  quantity int NOT NULL DEFAULT 4 CHECK (quantity BETWEEN 1 AND 8),
  tread_depth_mm numeric(4,1) NOT NULL DEFAULT 6.0 CHECK (tread_depth_mm >= 0),
  rack_location text NOT NULL DEFAULT 'Rack A-01',
  stored_at date NOT NULL DEFAULT CURRENT_DATE,
  due_swap_date date,
  status text NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'mounted', 'disposed')),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_garage_tire_storage_tag
  ON public.garage_tire_storage (business_id, branch_id, storage_tag)
  WHERE deleted_at IS NULL;

-- 11) RLS + updated_at / version triggers on new normalized tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'garage_flat_rate_labor',
    'garage_technician_time_logs',
    'garage_tech_commissions',
    'garage_insurance_claims',
    'garage_inspection_pvs',
    'garage_detailing_packages',
    'garage_tire_storage'
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

-- 12) Double-assignment guard trigger on garage_bays & hardened garage_assign_bay RPC
CREATE OR REPLACE FUNCTION public.fn_guard_garage_bay_double_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deleted_at IS NULL
     AND TG_OP = 'UPDATE'
     AND OLD.status = 'Occupied'
     AND NEW.status = 'Occupied'
     AND OLD.active_work_order_id IS NOT NULL
     AND NEW.active_work_order_id IS NOT NULL
     AND OLD.active_work_order_id <> NEW.active_work_order_id THEN
    RAISE EXCEPTION 'GARAGE_BAY_ALREADY_OCCUPIED: Bay % is already assigned to work order %',
      NEW.bay_code, OLD.active_work_order_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_garage_bay_double_assignment ON public.garage_bays;
CREATE TRIGGER trg_guard_garage_bay_double_assignment
BEFORE UPDATE ON public.garage_bays
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_garage_bay_double_assignment();

CREATE OR REPLACE FUNCTION public.garage_assign_bay(
  p_bay_id uuid,
  p_work_order_id uuid,
  p_mechanic_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bay record;
BEGIN
  SELECT * INTO v_bay FROM public.garage_bays WHERE id = p_bay_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_bay.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAY_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  IF v_bay.status = 'Occupied'
     AND v_bay.active_work_order_id IS NOT NULL
     AND v_bay.active_work_order_id <> p_work_order_id THEN
    RAISE EXCEPTION 'GARAGE_BAY_ALREADY_OCCUPIED: Bay % already holds work order %',
      v_bay.bay_code, v_bay.active_work_order_id;
  END IF;

  UPDATE public.garage_bays
  SET status = 'Occupied',
      active_work_order_id = p_work_order_id,
      assigned_mechanic_name = p_mechanic_name,
      updated_at = now()
  WHERE id = v_bay.id;

  UPDATE public.garage_work_orders
  SET bay_id = v_bay.id,
      mechanic_name = p_mechanic_name,
      status = 'InProgress',
      updated_at = now()
  WHERE id = p_work_order_id AND branch_id = v_bay.branch_id AND deleted_at IS NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13) RPC: Atomic Purchase Order Goods Receipt (updates PO status, BL, warranty & spare parts stock)
CREATE OR REPLACE FUNCTION public.garage_receive_purchase_order(
  p_po_id uuid,
  p_delivery_note text,
  p_received_by text DEFAULT 'Magasinier',
  p_lines jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_po public.garage_purchase_orders%ROWTYPE;
  v_line jsonb;
  v_lines jsonb;
  v_part_id uuid;
  v_qty numeric;
  v_unit_cost numeric;
  v_warranty_months int;
BEGIN
  SELECT * INTO v_po
  FROM public.garage_purchase_orders
  WHERE id = p_po_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GARAGE_PO_NOT_FOUND';
  END IF;

  IF NOT public.is_tenant_branch_member(v_po.business_id, v_po.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF v_po.status = 'Received' THEN
    RAISE EXCEPTION 'GARAGE_PO_ALREADY_RECEIVED: % already received', v_po.po_number;
  END IF;
  IF v_po.status = 'Cancelled' THEN
    RAISE EXCEPTION 'GARAGE_PO_CANCELLED: cannot receive cancelled PO %', v_po.po_number;
  END IF;
  IF length(trim(COALESCE(p_delivery_note, ''))) = 0 THEN
    RAISE EXCEPTION 'GARAGE_BL_REQUIRED: delivery note number is required';
  END IF;

  v_lines := COALESCE(p_lines, v_po.items, '[]'::jsonb);

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_lines) value
  LOOP
    v_part_id := NULLIF(v_line ->> 'partId', '')::uuid;
    v_qty := GREATEST(0, COALESCE((v_line ->> 'quantityReceived')::numeric, (v_line ->> 'quantity')::numeric, 0));
    v_unit_cost := COALESCE((v_line ->> 'unitCostDzd')::numeric, 0);
    IF v_part_id IS NOT NULL AND v_qty > 0 THEN
      UPDATE public.garage_parts
      SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty,
          cost_dzd = CASE WHEN v_unit_cost > 0 THEN v_unit_cost ELSE cost_dzd END,
          supplier_id = COALESCE(v_po.supplier_id, supplier_id),
          updated_at = now()
      WHERE id = v_part_id
        AND business_id = v_po.business_id
        AND branch_id = v_po.branch_id
        AND deleted_at IS NULL;
    END IF;
  END LOOP;

  v_warranty_months := GREATEST(0, COALESCE(v_po.warranty_months, 6));

  UPDATE public.garage_purchase_orders
  SET status = 'Received',
      delivery_note_number = trim(p_delivery_note),
      received_at = now(),
      received_by_name = COALESCE(NULLIF(trim(p_received_by), ''), 'Magasinier'),
      lines_received = v_lines,
      warranty_expiry_date = (CURRENT_DATE + make_interval(months => v_warranty_months))::date,
      updated_at = now()
  WHERE id = v_po.id;

  RETURN jsonb_build_object(
    'ok', true,
    'poId', v_po.id,
    'poNumber', v_po.po_number,
    'deliveryNoteNumber', trim(p_delivery_note),
    'warrantyExpiryDate', (CURRENT_DATE + make_interval(months => v_warranty_months))::date
  );
END;
$$;

-- 14) RPC: Reopen Invoiced Work Order ONLY via issued Credit Note (Avoir) & Reason
CREATE OR REPLACE FUNCTION public.garage_reopen_invoiced_order(
  p_work_order_id uuid,
  p_credit_note_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo public.garage_work_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_wo
  FROM public.garage_work_orders
  WHERE id = p_work_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GARAGE_WORK_ORDER_NOT_FOUND';
  END IF;

  IF NOT public.is_tenant_branch_member(v_wo.business_id, v_wo.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_TENANT_ACCESS';
  END IF;

  IF p_credit_note_id IS NULL THEN
    RAISE EXCEPTION 'GARAGE_REOPEN_REQUIRES_CREDIT_NOTE: A credit note (Avoir) is required to reopen an invoiced RO';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'GARAGE_REOPEN_REASON_REQUIRED: Reopening an invoiced RO requires an audit reason';
  END IF;

  UPDATE public.garage_work_orders
  SET is_locked_invoiced = false,
      status = 'InProgress',
      reopen_credit_note_id = p_credit_note_id,
      reopen_reason = trim(p_reason),
      reopened_at = now(),
      updated_at = now()
  WHERE id = v_wo.id;

  RETURN jsonb_build_object(
    'ok', true,
    'workOrderId', v_wo.id,
    'reopenCreditNoteId', p_credit_note_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.garage_receive_purchase_order(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garage_receive_purchase_order(uuid, text, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.garage_reopen_invoiced_order(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garage_reopen_invoiced_order(uuid, uuid, text) TO authenticated;
