-- ============================================================================
-- Atrium Phase 3 Step 12 (7.12 manufacturing_production): Manufacturing Depth Migration
--   - Sequence extensions: mfg_alert (ANDN), mfg_maint (MNT), mfg_fg_lot (PFG), mfg_cut (CUT)
--   - Immutable BOM versioning (version_number, bom_family_id, parent_bom_id) & active-OF mutation guard
--   - OF BOM pinning & actual-vs-standard costing / CMUP recalc fields (mfg_orders)
--   - Auditable operator PIN + Loi 88-07 PPE checklist persistence (mfg_workstation_logs)
--   - Persistent Andon Alerts (mfg_alerts) with trigger/resolve RPCs notifying gerant & chef_atelier
--   - Finished Goods Stock & Lots Ledger (mfg_finished_goods) + QC release RPC
--   - Preventive Machine Maintenance (mfg_workstations PM fields + mfg_machine_maintenance)
--   - Piece-Rate Operator Payroll Ledger (mfg_piece_rate_entries) + post-to-payroll RPC
--   - Textile/Wood/Aluminum/Marble 1D/2D Cutting Optimization Plans (mfg_cutting_plans)
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
      'mfg_cut'
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
    'mfg_alert', 'mfg_maint', 'mfg_fg_lot', 'mfg_cut'
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
-- 2) Extend mfg_bom_recipes (Immutable Versioning + Active-OF Guard)
-- ----------------------------------------------------------------------------
ALTER TABLE public.mfg_bom_recipes
  ADD COLUMN IF NOT EXISTS bom_family_id uuid,
  ADD COLUMN IF NOT EXISTS version_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_bom_id uuid REFERENCES public.mfg_bom_recipes(id) ON DELETE SET NULL;

UPDATE public.mfg_bom_recipes
SET bom_family_id = COALESCE(bom_family_id, id)
WHERE bom_family_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfg_bom_recipes_branch_code_ver
  ON public.mfg_bom_recipes (branch_id, code, version_number)
  WHERE deleted_at IS NULL;

-- Prevent structural mutations on BOM recipes referenced by non-cancelled manufacturing orders
CREATE OR REPLACE FUNCTION public.fn_guard_mfg_bom_immutable_on_active_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_orders boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL THEN
    IF (NEW.code IS DISTINCT FROM OLD.code
        OR NEW.batch_size IS DISTINCT FROM OLD.batch_size
        OR NEW.output_unit IS DISTINCT FROM OLD.output_unit
        OR NEW.standard_cycle_minutes IS DISTINCT FROM OLD.standard_cycle_minutes) THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.mfg_orders o
        WHERE o.bom_id = OLD.id
          AND o.deleted_at IS NULL
          AND o.status <> 'Cancelled'
      ) INTO v_has_orders;

      IF v_has_orders THEN
        RAISE EXCEPTION 'BOM_LOCKED_BY_ACTIVE_ORDER: Fork a new BOM version instead of mutating BOM referenced by active OFs'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mfg_bom_immutable_on_active_orders ON public.mfg_bom_recipes;
CREATE TRIGGER trg_guard_mfg_bom_immutable_on_active_orders
  BEFORE UPDATE ON public.mfg_bom_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_mfg_bom_immutable_on_active_orders();

-- Atomic BOM version fork RPC: archives previous active BOM in same family and creates v+1
CREATE OR REPLACE FUNCTION public.mfg_create_bom_version(
  p_source_bom_id uuid,
  p_new_recipe jsonb,
  p_new_ingredients jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src record;
  v_new_bom_id uuid := COALESCE(NULLIF(p_new_recipe->>'id', '')::uuid, gen_random_uuid());
  v_family_id uuid;
  v_next_ver int;
  v_res jsonb;
BEGIN
  SELECT * INTO v_src
  FROM public.mfg_bom_recipes
  WHERE id = p_source_bom_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_branch(v_src.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  v_family_id := COALESCE(v_src.bom_family_id, v_src.id);

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_ver
  FROM public.mfg_bom_recipes
  WHERE branch_id = v_src.branch_id
    AND code = v_src.code
    AND deleted_at IS NULL;

  UPDATE public.mfg_bom_recipes
  SET is_active = false,
      updated_at = now()
  WHERE branch_id = v_src.branch_id
    AND code = v_src.code
    AND is_active = true
    AND deleted_at IS NULL;

  v_res := public.mfg_upsert_bom_atomic(
    jsonb_build_object(
      'id', v_new_bom_id,
      'account_id', v_src.account_id,
      'business_id', v_src.business_id,
      'branch_id', v_src.branch_id,
      'staff_id', COALESCE(NULLIF(p_new_recipe->>'staff_id', '')::uuid, v_src.staff_id),
      'code', v_src.code,
      'finished_product_name', COALESCE(p_new_recipe->>'finished_product_name', v_src.finished_product_name),
      'output_unit', COALESCE(p_new_recipe->>'output_unit', v_src.output_unit),
      'batch_size', COALESCE((p_new_recipe->>'batch_size')::numeric, v_src.batch_size),
      'estimated_unit_cost_dzd', COALESCE((p_new_recipe->>'estimated_unit_cost_dzd')::numeric, v_src.estimated_unit_cost_dzd),
      'standard_cycle_minutes', COALESCE((p_new_recipe->>'standard_cycle_minutes')::int, v_src.standard_cycle_minutes),
      'version', COALESCE(p_new_recipe->>'version', format('v%s', v_next_ver)),
      'is_active', true
    ),
    p_new_ingredients
  );

  UPDATE public.mfg_bom_recipes
  SET bom_family_id = v_family_id,
      version_number = v_next_ver,
      parent_bom_id = v_src.id
  WHERE id = v_new_bom_id;

  RETURN v_res || jsonb_build_object(
    'new_bom_id', v_new_bom_id,
    'bom_family_id', v_family_id,
    'version_number', v_next_ver,
    'parent_bom_id', v_src.id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3) Extend mfg_orders (Pinned BOM Version/Snapshot, Costing & Sales Link)
-- ----------------------------------------------------------------------------
ALTER TABLE public.mfg_orders
  ADD COLUMN IF NOT EXISTS pinned_bom_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bom_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unit_piece_rate_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_material_cost_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_labor_cost_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cmup_recalc_delta_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_unified_doc_id uuid;

-- ----------------------------------------------------------------------------
-- 4) Extend mfg_workstation_logs (Operator PIN + Auditable Loi 88-07 PPE)
-- ----------------------------------------------------------------------------
ALTER TABLE public.mfg_workstation_logs
  ADD COLUMN IF NOT EXISTS operator_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pin_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ppe_checklist jsonb NOT NULL DEFAULT '{"glasses":false,"gloves":false,"shoes":false,"helmet":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS ppe_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_status text NOT NULL DEFAULT 'Submitted' CHECK (session_status IN ('Active', 'Paused', 'Submitted')),
  ADD COLUMN IF NOT EXISTS piece_rate_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downtime_reason text;

-- ----------------------------------------------------------------------------
-- 5) Extend mfg_workstations (Preventive Maintenance Tracking)
-- ----------------------------------------------------------------------------
ALTER TABLE public.mfg_workstations
  ADD COLUMN IF NOT EXISTS machine_type text NOT NULL DEFAULT 'CNC',
  ADD COLUMN IF NOT EXISTS running_hours numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_interval_hours numeric(12,2) NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS maintenance_interval_days int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS last_maintenance_date date,
  ADD COLUMN IF NOT EXISTS next_maintenance_due_date date,
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 6) Persistent Andon Alerts (mfg_alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  alert_number text NOT NULL,
  alert_type text NOT NULL DEFAULT 'AndonStop' CHECK (alert_type IN ('AndonStop', 'MaterialShortage', 'ExcessScrap', 'MaintenanceDue', 'QualityHold')),
  severity text NOT NULL DEFAULT 'critical' CHECK (severity IN ('info', 'warning', 'critical')),
  workstation_id uuid REFERENCES public.mfg_workstations(id) ON DELETE SET NULL,
  workstation_name text,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  order_number text,
  raised_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  raised_by_name text NOT NULL,
  notified_roles text[] NOT NULL DEFAULT ARRAY['gerant', 'chef_atelier']::text[],
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Acknowledged', 'Resolved')),
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_by text,
  resolved_at timestamptz,
  resolution_notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mfg_alerts_branch_status
  ON public.mfg_alerts (branch_id, status)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 7) Finished Goods Stock & Lots Ledger (mfg_finished_goods)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_finished_goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  lot_number text NOT NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  order_number text,
  qc_inspection_id uuid REFERENCES public.mfg_qc_inspections(id) ON DELETE SET NULL,
  qty_produced numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_produced >= 0),
  qty_reserved numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  qty_delivered numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_delivered >= 0),
  unit text NOT NULL DEFAULT 'Unité',
  unit_cmup_centimes bigint NOT NULL DEFAULT 0 CHECK (unit_cmup_centimes >= 0),
  warehouse_location text NOT NULL DEFAULT 'Magasin PF',
  release_status text NOT NULL DEFAULT 'Quarantine' CHECK (release_status IN ('Quarantine', 'Released', 'Shipped', 'Hold')),
  linked_unified_doc_id uuid,
  produced_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  released_by text,
  notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfg_finished_goods_lot_branch
  ON public.mfg_finished_goods (branch_id, lot_number)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 8) Preventive Machine Maintenance Logs (mfg_machine_maintenance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_machine_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  ticket_number text NOT NULL,
  machine_id uuid REFERENCES public.mfg_workstations(id) ON DELETE CASCADE,
  machine_name text NOT NULL,
  maintenance_type text NOT NULL DEFAULT 'Preventive' CHECK (maintenance_type IN ('Preventive', 'Corrective', 'Calibration')),
  trigger_reason text NOT NULL DEFAULT 'ScheduledHours',
  runtime_hours_at_service numeric(12,2) NOT NULL DEFAULT 0,
  cycle_count_at_service bigint NOT NULL DEFAULT 0,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_date date,
  technician_name text,
  cost_centimes bigint NOT NULL DEFAULT 0 CHECK (cost_centimes >= 0),
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'InProgress', 'Completed', 'Overdue')),
  checklist_notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mfg_machine_maintenance_machine_status
  ON public.mfg_machine_maintenance (branch_id, machine_id, status)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 9) Piece-Rate Operator Payroll Ledger (mfg_piece_rate_entries)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_piece_rate_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  operator_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  operator_name text NOT NULL,
  workstation_log_id uuid REFERENCES public.mfg_workstation_logs(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  period_month text NOT NULL,
  good_units numeric(12,2) NOT NULL DEFAULT 0 CHECK (good_units >= 0),
  scrap_units numeric(12,2) NOT NULL DEFAULT 0 CHECK (scrap_units >= 0),
  rate_per_piece_centimes bigint NOT NULL DEFAULT 0 CHECK (rate_per_piece_centimes >= 0),
  gross_amount_centimes bigint NOT NULL DEFAULT 0 CHECK (gross_amount_centimes >= 0),
  status text NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'posted_to_payroll', 'paid')),
  payroll_run_id uuid REFERENCES public.staff_payroll_runs(id) ON DELETE SET NULL,
  notes text,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mfg_piece_rate_entries_branch_status
  ON public.mfg_piece_rate_entries (branch_id, status, operator_staff_id)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 10) Cutting Plans & Dimension Quotes (mfg_cutting_plans)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_cutting_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  plan_number text NOT NULL,
  title text NOT NULL,
  trade_category text NOT NULL DEFAULT 'Wood' CHECK (trade_category IN ('Textile', 'Wood', 'Aluminum', 'Marble')),
  cutting_mode text NOT NULL DEFAULT '1d_linear' CHECK (cutting_mode IN ('1d_linear', '2d_sheet')),
  stock_length_mm numeric(12,2) NOT NULL DEFAULT 6000,
  stock_width_mm numeric(12,2) NOT NULL DEFAULT 1220,
  kerf_mm numeric(6,2) NOT NULL DEFAULT 4,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  stock_units_required int NOT NULL DEFAULT 1,
  waste_percent numeric(6,2) NOT NULL DEFAULT 0,
  reusable_offcuts jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_quote_id uuid,
  unit_price_centimes bigint NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mfg_cutting_plans_branch
  ON public.mfg_cutting_plans (branch_id, trade_category)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 11) Atomic RPCs for Andon Alerts, FG Lot Release, PM Completion & Piece-Rate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mfg_trigger_andon_alert(
  p_alert jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := COALESCE(NULLIF(p_alert->>'id', '')::uuid, gen_random_uuid());
  v_branch_id uuid := NULLIF(p_alert->>'branch_id', '')::uuid;
  v_business_id uuid := NULLIF(p_alert->>'business_id', '')::uuid;
  v_account_id uuid := COALESCE(NULLIF(p_alert->>'account_id', '')::uuid, public.get_auth_account_id());
  v_alert_num text := NULLIF(p_alert->>'alert_number', '');
BEGIN
  IF v_branch_id IS NULL OR NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF v_alert_num IS NULL THEN
    v_alert_num := (public.allocate_sequence_number(v_business_id, v_branch_id, 'mfg_alert'))->>'formatted_number';
  END IF;

  INSERT INTO public.mfg_alerts (
    id, account_id, business_id, branch_id, staff_id,
    alert_number, alert_type, severity, workstation_id, workstation_name,
    order_id, order_number, raised_by_staff_id, raised_by_name,
    notified_roles, message, status
  ) VALUES (
    v_id, v_account_id, v_business_id, v_branch_id, NULLIF(p_alert->>'staff_id', '')::uuid,
    v_alert_num,
    COALESCE(p_alert->>'alert_type', 'AndonStop'),
    COALESCE(p_alert->>'severity', 'critical'),
    NULLIF(p_alert->>'workstation_id', '')::uuid,
    p_alert->>'workstation_name',
    NULLIF(p_alert->>'order_id', '')::uuid,
    p_alert->>'order_number',
    NULLIF(p_alert->>'raised_by_staff_id', '')::uuid,
    COALESCE(p_alert->>'raised_by_name', 'Opérateur'),
    ARRAY['gerant', 'chef_atelier']::text[],
    COALESCE(p_alert->>'message', 'Appel Andon Atelier'),
    'Open'
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    message = EXCLUDED.message,
    updated_at = now();

  RETURN jsonb_build_object('id', v_id, 'alert_number', v_alert_num, 'status', 'Open');
END;
$$;

CREATE OR REPLACE FUNCTION public.mfg_resolve_andon_alert(
  p_alert_id uuid,
  p_action text,
  p_actor_name text DEFAULT 'Chef d''Atelier',
  p_resolution_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_next_status text;
BEGIN
  SELECT * INTO v_row FROM public.mfg_alerts WHERE id = p_alert_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ANDON_ALERT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_branch(v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  v_next_status := CASE WHEN p_action = 'acknowledge' THEN 'Acknowledged' ELSE 'Resolved' END;

  UPDATE public.mfg_alerts
  SET status = v_next_status,
      acknowledged_by = COALESCE(acknowledged_by, p_actor_name),
      acknowledged_at = COALESCE(acknowledged_at, now()),
      resolved_by = CASE WHEN v_next_status = 'Resolved' THEN p_actor_name ELSE resolved_by END,
      resolved_at = CASE WHEN v_next_status = 'Resolved' THEN now() ELSE resolved_at END,
      resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
      updated_at = now()
  WHERE id = p_alert_id;

  RETURN jsonb_build_object('id', p_alert_id, 'status', v_next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.mfg_release_finished_goods_lot(
  p_fg_id uuid,
  p_inspector_name text DEFAULT 'Responsable CQ',
  p_qc_inspection_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT * INTO v_row FROM public.mfg_finished_goods WHERE id = p_fg_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FINISHED_GOODS_LOT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_branch(v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.mfg_finished_goods
  SET release_status = 'Released',
      qc_inspection_id = COALESCE(p_qc_inspection_id, qc_inspection_id),
      released_by = p_inspector_name,
      released_at = now(),
      updated_at = now()
  WHERE id = p_fg_id;

  RETURN jsonb_build_object('id', p_fg_id, 'release_status', 'Released', 'lot_number', v_row.lot_number);
END;
$$;

CREATE OR REPLACE FUNCTION public.mfg_complete_machine_maintenance(
  p_maintenance_id uuid,
  p_technician_name text,
  p_cost_centimes bigint DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_maint record;
  v_machine record;
  v_next_due date;
BEGIN
  SELECT * INTO v_maint FROM public.mfg_machine_maintenance WHERE id = p_maintenance_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAINTENANCE_TICKET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_branch(v_maint.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.mfg_machine_maintenance
  SET status = 'Completed',
      completed_date = CURRENT_DATE,
      technician_name = COALESCE(p_technician_name, technician_name),
      cost_centimes = GREATEST(0, COALESCE(p_cost_centimes, cost_centimes)),
      checklist_notes = COALESCE(p_notes, checklist_notes),
      updated_at = now()
  WHERE id = p_maintenance_id;

  IF v_maint.machine_id IS NOT NULL THEN
    SELECT * INTO v_machine FROM public.mfg_workstations WHERE id = v_maint.machine_id FOR UPDATE;
    IF FOUND THEN
      v_next_due := CURRENT_DATE + GREATEST(1, COALESCE(v_machine.maintenance_interval_days, 90));
      UPDATE public.mfg_workstations
      SET last_maintenance_date = CURRENT_DATE,
          next_maintenance_due_date = v_next_due,
          status = CASE WHEN status = 'Maintenance' THEN 'Idle' ELSE status END,
          updated_at = now()
      WHERE id = v_maint.machine_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('id', p_maintenance_id, 'status', 'Completed', 'next_maintenance_due_date', v_next_due);
END;
$$;

CREATE OR REPLACE FUNCTION public.mfg_post_piece_rate_to_payroll(
  p_entry_ids uuid[],
  p_payroll_run_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_count int := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT id, branch_id FROM public.mfg_piece_rate_entries
    WHERE id = ANY(p_entry_ids) AND deleted_at IS NULL
    FOR UPDATE
  LOOP
    IF NOT public.can_access_branch(v_row.branch_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
    END IF;
    UPDATE public.mfg_piece_rate_entries
    SET status = 'posted_to_payroll',
        payroll_run_id = COALESCE(p_payroll_run_id, payroll_run_id),
        updated_at = now()
    WHERE id = v_row.id AND status = 'accrued';
    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('posted_count', v_updated_count, 'payroll_run_id', p_payroll_run_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 12) Enable RLS + Tenant+Branch Policies + Triggers on New Tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  v_new_tables text[] := ARRAY[
    'mfg_alerts',
    'mfg_finished_goods',
    'mfg_machine_maintenance',
    'mfg_piece_rate_entries',
    'mfg_cutting_plans'
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

DROP TRIGGER IF EXISTS trg_mfg_workstations_optimistic_version ON public.mfg_workstations;
CREATE TRIGGER trg_mfg_workstations_optimistic_version
  BEFORE UPDATE ON public.mfg_workstations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_optimistic_version();

REVOKE ALL ON FUNCTION public.mfg_create_bom_version(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_create_bom_version(uuid, jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.mfg_trigger_andon_alert(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_trigger_andon_alert(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.mfg_resolve_andon_alert(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_resolve_andon_alert(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.mfg_release_finished_goods_lot(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_release_finished_goods_lot(uuid, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mfg_complete_machine_maintenance(uuid, text, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_complete_machine_maintenance(uuid, text, bigint, text) TO authenticated;

REVOKE ALL ON FUNCTION public.mfg_post_piece_rate_to_payroll(uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_post_piece_rate_to_payroll(uuid[], uuid) TO authenticated;

COMMIT;
