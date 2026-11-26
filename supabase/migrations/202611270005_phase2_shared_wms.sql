-- ============================================================================
-- Atrium Phase 2 Migration (Step 5): Section 6.6 Shared Inventory / WMS Services
--   - Warehouses/Bins (`wms_bins`)
--   - Lots / Batches with Expiry, Recall & FEFO (`wms_stock_lots`)
--   - Serial Numbers (`wms_serial_numbers`)
--   - Unit Conversions (`wms_unit_conversions`: piece / carton / pallet)
--   - Reorder Rules (`wms_reorder_rules`: min / max -> suggested PO)
--   - Cycle Counts (`wms_cycle_counts` & `wms_cycle_count_lines`)
--   - Transfers in Transit (`wms_stock_transfers`)
--   - Landed Cost Allocations (`wms_landed_cost_allocations`)
--   - Consignment / Returnable Packaging Ledger (`wms_consignment_ledger`)
--   - Transactional RPCs:
--       * `wms_atomic_consume_stock` (FEFO + expired/recalled block + negative policy)
--       * `wms_post_cycle_count` (variance posting accounting for active sales delta)
--       * `wms_transition_stock_transfer` (in-transit dispatch & receipt)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.6a Extend sequence_counters for WMS Transfers (`TRF`) & Cycle Counts (`INV`)
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
      'wms_transfer',
      'wms_cycle_count'
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
    WHEN 'wms_transfer' THEN 'TRF'
    WHEN 'wms_cycle_count' THEN 'INV'
    ELSE 'DOC'
  END;
$$;

-- ----------------------------------------------------------------------------
-- 6.6b Warehouse Bins (`wms_bins`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.trading_warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  zone text,
  aisle text,
  rack text,
  is_default boolean NOT NULL DEFAULT false,
  capacity_units numeric(14,4),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_bins_warehouse_code_active
  ON public.wms_bins (business_id, warehouse_id, code)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_bins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_bins_tenant_access" ON public.wms_bins;
CREATE POLICY "wms_bins_tenant_access"
  ON public.wms_bins
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6c Stock Lots & Expiry / Recall (`wms_stock_lots`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.wms_bins(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.pos_products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  sku text,
  lot_number text NOT NULL,
  manufacture_date date,
  expiry_date date,
  qty_on_hand numeric(14,4) NOT NULL DEFAULT 0,
  qty_reserved numeric(14,4) NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  unit_cost_centimes bigint NOT NULL DEFAULT 0 CHECK (unit_cost_centimes >= 0),
  recall_status text NOT NULL DEFAULT 'active'
    CHECK (recall_status IN ('active', 'quarantined', 'recalled', 'expired')),
  recall_reason text,
  supplier_name text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_stock_lots_unique_active
  ON public.wms_stock_lots (business_id, COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid), product_id, lot_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wms_stock_lots_fefo
  ON public.wms_stock_lots (business_id, branch_id, product_id, recall_status, expiry_date ASC NULLS LAST)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_stock_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_stock_lots_tenant_access" ON public.wms_stock_lots;
CREATE POLICY "wms_stock_lots_tenant_access"
  ON public.wms_stock_lots
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6d Serial Numbers (`wms_serial_numbers`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.wms_bins(id) ON DELETE SET NULL,
  lot_id uuid REFERENCES public.wms_stock_lots(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.pos_products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'reserved', 'sold', 'returned', 'damaged', 'recalled')),
  source_doc_id text,
  sale_id text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_serial_numbers_active
  ON public.wms_serial_numbers (business_id, product_id, serial_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_serial_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_serial_numbers_tenant_access" ON public.wms_serial_numbers;
CREATE POLICY "wms_serial_numbers_tenant_access"
  ON public.wms_serial_numbers
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6e Unit Conversions (`wms_unit_conversions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE CASCADE,
  product_name text,
  from_unit text NOT NULL,
  to_base_unit text NOT NULL,
  conversion_factor numeric(14,6) NOT NULL CHECK (conversion_factor > 0),
  barcode text,
  is_default_purchase boolean NOT NULL DEFAULT false,
  is_default_sale boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_unit_conversions_active
  ON public.wms_unit_conversions (
    business_id,
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(from_unit),
    lower(to_base_unit)
  )
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_unit_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_unit_conversions_tenant_access" ON public.wms_unit_conversions;
CREATE POLICY "wms_unit_conversions_tenant_access"
  ON public.wms_unit_conversions
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6f Reorder Rules (`wms_reorder_rules`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_reorder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.pos_products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  min_qty numeric(14,4) NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  max_qty numeric(14,4) NOT NULL DEFAULT 0 CHECK (max_qty >= 0),
  reorder_qty numeric(14,4) NOT NULL DEFAULT 0 CHECK (reorder_qty >= 0),
  preferred_supplier_id text,
  preferred_supplier_name text,
  lead_time_days int NOT NULL DEFAULT 3 CHECK (lead_time_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_reorder_rules_active
  ON public.wms_reorder_rules (
    business_id,
    COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid),
    product_id
  )
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_reorder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_reorder_rules_tenant_access" ON public.wms_reorder_rules;
CREATE POLICY "wms_reorder_rules_tenant_access"
  ON public.wms_reorder_rules
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6g Cycle Counts (`wms_cycle_counts` & `wms_cycle_count_lines`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_cycle_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  count_number text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'counting', 'posted', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  counted_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  counted_by_name text,
  snapshot_taken_at timestamptz NOT NULL DEFAULT now(),
  total_variance_units numeric(14,4) NOT NULL DEFAULT 0,
  total_variance_centimes bigint NOT NULL DEFAULT 0,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_cycle_counts_number_active
  ON public.wms_cycle_counts (business_id, count_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_cycle_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_cycle_counts_tenant_access" ON public.wms_cycle_counts;
CREATE POLICY "wms_cycle_counts_tenant_access"
  ON public.wms_cycle_counts
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

CREATE TABLE IF NOT EXISTS public.wms_cycle_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  cycle_count_id uuid NOT NULL REFERENCES public.wms_cycle_counts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.pos_products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  lot_id uuid REFERENCES public.wms_stock_lots(id) ON DELETE SET NULL,
  lot_number text,
  bin_id uuid REFERENCES public.wms_bins(id) ON DELETE SET NULL,
  system_qty numeric(14,4) NOT NULL DEFAULT 0,
  active_sales_delta_qty numeric(14,4) NOT NULL DEFAULT 0,
  counted_qty numeric(14,4) NOT NULL DEFAULT 0,
  variance_qty numeric(14,4) NOT NULL DEFAULT 0,
  unit_cost_centimes bigint NOT NULL DEFAULT 0,
  variance_centimes bigint NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wms_cycle_count_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_cycle_count_lines_tenant_access" ON public.wms_cycle_count_lines;
CREATE POLICY "wms_cycle_count_lines_tenant_access"
  ON public.wms_cycle_count_lines
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6h Transfers in Transit (`wms_stock_transfers`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  transfer_number text NOT NULL,
  from_warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  from_warehouse_name text,
  to_warehouse_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  to_warehouse_name text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_transit', 'received', 'partial', 'cancelled')),
  dispatched_at timestamptz,
  received_at timestamptz,
  carrier_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_stock_transfers_number_active
  ON public.wms_stock_transfers (business_id, transfer_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.wms_stock_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_stock_transfers_tenant_access" ON public.wms_stock_transfers;
CREATE POLICY "wms_stock_transfers_tenant_access"
  ON public.wms_stock_transfers
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6i Landed Cost Allocations (`wms_landed_cost_allocations`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_landed_cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  purchase_doc_id text,
  reference_number text NOT NULL,
  allocation_method text NOT NULL DEFAULT 'by_value'
    CHECK (allocation_method IN ('by_value', 'by_quantity')),
  currency text NOT NULL DEFAULT 'DZD',
  fx_rate numeric(14,6) NOT NULL DEFAULT 1 CHECK (fx_rate > 0),
  freight_centimes bigint NOT NULL DEFAULT 0 CHECK (freight_centimes >= 0),
  customs_centimes bigint NOT NULL DEFAULT 0 CHECK (customs_centimes >= 0),
  insurance_centimes bigint NOT NULL DEFAULT 0 CHECK (insurance_centimes >= 0),
  other_centimes bigint NOT NULL DEFAULT 0 CHECK (other_centimes >= 0),
  total_landed_centimes bigint NOT NULL DEFAULT 0 CHECK (total_landed_centimes >= 0),
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'applied')),
  applied_at timestamptz,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.wms_landed_cost_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_landed_cost_allocations_tenant_access" ON public.wms_landed_cost_allocations;
CREATE POLICY "wms_landed_cost_allocations_tenant_access"
  ON public.wms_landed_cost_allocations
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6j Consignment / Returnable Packaging Ledger (`wms_consignment_ledger`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wms_consignment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  party_name text NOT NULL,
  packaging_code text NOT NULL,
  packaging_name text NOT NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN ('issued', 'returned', 'lost_charged')),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  unit_deposit_centimes bigint NOT NULL DEFAULT 0 CHECK (unit_deposit_centimes >= 0),
  total_deposit_centimes bigint NOT NULL DEFAULT 0 CHECK (total_deposit_centimes >= 0),
  reference_doc text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.wms_consignment_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wms_consignment_ledger_tenant_access" ON public.wms_consignment_ledger;
CREATE POLICY "wms_consignment_ledger_tenant_access"
  ON public.wms_consignment_ledger
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.6k Atomic RPC: `wms_atomic_consume_stock`
--   - Row-locks lots and product
--   - Enforces FEFO (earliest expiry_date first)
--   - Blocks expired (`expiry_date < CURRENT_DATE`) and recalled/quarantined lots
--   - Enforces negative stock policy (`block` raises `WMS_NEGATIVE_STOCK_BLOCKED`)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wms_atomic_consume_stock(
  p_business_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_warehouse_id uuid DEFAULT NULL,
  p_lot_id uuid DEFAULT NULL,
  p_negative_stock_policy text DEFAULT 'block',
  p_reference_doc text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_product record;
  v_lot record;
  v_remaining numeric := COALESCE(p_quantity, 0);
  v_take numeric;
  v_allocations jsonb := '[]'::jsonb;
  v_lot_count int := 0;
  v_new_product_stock numeric;
BEGIN
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'WMS_INVALID_QUANTITY: Quantity must be positive';
  END IF;

  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    JOIN public.branches br ON br.business_id = b.id
    WHERE b.id = p_business_id
      AND br.id = p_branch_id
      AND b.account_id = v_account_id
      AND b.deleted_at IS NULL
      AND br.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized business/branch context' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_product
  FROM public.pos_products
  WHERE id = p_product_id
    AND branch_id = p_branch_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WMS_PRODUCT_NOT_FOUND: Product % not found in branch', p_product_id;
  END IF;

  IF p_lot_id IS NOT NULL THEN
    SELECT * INTO v_lot
    FROM public.wms_stock_lots
    WHERE id = p_lot_id
      AND business_id = p_business_id
      AND account_id = v_account_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'WMS_LOT_NOT_FOUND: Lot % not found', p_lot_id;
    END IF;
    IF v_lot.recall_status IN ('recalled', 'quarantined', 'expired') THEN
      RAISE EXCEPTION 'WMS_LOT_BLOCKED: Lot % status is %', v_lot.lot_number, v_lot.recall_status;
    END IF;
    IF v_lot.expiry_date IS NOT NULL AND v_lot.expiry_date < CURRENT_DATE THEN
      UPDATE public.wms_stock_lots SET recall_status = 'expired', updated_at = now() WHERE id = v_lot.id;
      RAISE EXCEPTION 'WMS_EXPIRED_LOT_BLOCKED: Lot % expired on %', v_lot.lot_number, v_lot.expiry_date;
    END IF;

    v_lot_count := 1;
    v_take := CASE
      WHEN p_negative_stock_policy = 'allow' THEN v_remaining
      ELSE LEAST(GREATEST(v_lot.qty_on_hand - v_lot.qty_reserved, 0), v_remaining)
    END;

    IF v_take <= 0 AND p_negative_stock_policy <> 'allow' THEN
      RAISE EXCEPTION 'WMS_NEGATIVE_STOCK_BLOCKED: Insufficient available qty on lot %', v_lot.lot_number;
    END IF;

    IF v_take < v_remaining AND p_negative_stock_policy = 'block' THEN
      RAISE EXCEPTION 'WMS_NEGATIVE_STOCK_BLOCKED: Requested %, available % on lot %', v_remaining, v_take, v_lot.lot_number;
    END IF;

    UPDATE public.wms_stock_lots
    SET qty_on_hand = qty_on_hand - v_remaining,
        version = version + 1,
        updated_at = now()
    WHERE id = v_lot.id;

    v_allocations := jsonb_build_array(
      jsonb_build_object(
        'lotId', v_lot.id,
        'lotNumber', v_lot.lot_number,
        'quantity', v_remaining
      )
    );
    v_remaining := 0;
  ELSE
    -- FEFO allocation across active non-expired lots
    FOR v_lot IN
      SELECT *
      FROM public.wms_stock_lots
      WHERE business_id = p_business_id
        AND account_id = v_account_id
        AND product_id = p_product_id
        AND deleted_at IS NULL
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND recall_status = 'active'
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        AND (qty_on_hand - qty_reserved) > 0
      ORDER BY expiry_date ASC NULLS LAST, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      v_lot_count := v_lot_count + 1;
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(v_lot.qty_on_hand - v_lot.qty_reserved, v_remaining);
      IF v_take > 0 THEN
        UPDATE public.wms_stock_lots
        SET qty_on_hand = qty_on_hand - v_take,
            version = version + 1,
            updated_at = now()
        WHERE id = v_lot.id;

        v_allocations := v_allocations || jsonb_build_object(
          'lotId', v_lot.id,
          'lotNumber', v_lot.lot_number,
          'quantity', v_take
        );
        v_remaining := v_remaining - v_take;
      END IF;
    END LOOP;
  END IF;

  IF p_negative_stock_policy = 'block' THEN
    IF COALESCE(v_product.stock_quantity, 0) < p_quantity THEN
      RAISE EXCEPTION 'WMS_NEGATIVE_STOCK_BLOCKED: Requested %, on hand % for %', p_quantity, v_product.stock_quantity, v_product.name;
    END IF;
    IF v_lot_count > 0 AND v_remaining > 0 THEN
      RAISE EXCEPTION 'WMS_NEGATIVE_STOCK_BLOCKED: Insufficient active non-expired lot quantity (short %)', v_remaining;
    END IF;
  END IF;

  v_new_product_stock := COALESCE(v_product.stock_quantity, 0) - p_quantity;
  UPDATE public.pos_products
  SET stock_quantity = v_new_product_stock,
      version = COALESCE(version, 1) + 1,
      updated_at = now()
  WHERE id = v_product.id;

  RETURN jsonb_build_object(
    'productId', v_product.id,
    'previousStock', COALESCE(v_product.stock_quantity, 0),
    'newStock', v_new_product_stock,
    'referenceDoc', p_reference_doc,
    'allocations', v_allocations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wms_atomic_consume_stock(uuid, uuid, uuid, numeric, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wms_atomic_consume_stock(uuid, uuid, uuid, numeric, uuid, uuid, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.6l Atomic RPC: `wms_post_cycle_count`
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wms_post_cycle_count(
  p_cycle_count_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_count record;
  v_line record;
  v_effective_sys numeric;
  v_var_qty numeric;
  v_var_centimes bigint;
  v_total_var_units numeric := 0;
  v_total_var_centimes bigint := 0;
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_count
  FROM public.wms_cycle_counts
  WHERE id = p_cycle_count_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WMS_CYCLE_COUNT_NOT_FOUND';
  END IF;

  IF v_count.status NOT IN ('open', 'counting') THEN
    RAISE EXCEPTION 'WMS_CYCLE_COUNT_ALREADY_FINALIZED: status=%', v_count.status;
  END IF;

  FOR v_line IN
    SELECT * FROM public.wms_cycle_count_lines
    WHERE cycle_count_id = v_count.id
      AND account_id = v_account_id
    FOR UPDATE
  LOOP
    v_effective_sys := v_line.system_qty - COALESCE(v_line.active_sales_delta_qty, 0);
    v_var_qty := v_line.counted_qty - v_effective_sys;
    v_var_centimes := ROUND(v_var_qty * COALESCE(v_line.unit_cost_centimes, 0))::bigint;

    UPDATE public.wms_cycle_count_lines
    SET variance_qty = v_var_qty,
        variance_centimes = v_var_centimes,
        updated_at = now()
    WHERE id = v_line.id;

    IF v_line.lot_id IS NOT NULL THEN
      UPDATE public.wms_stock_lots
      SET qty_on_hand = GREATEST(0, qty_on_hand + v_var_qty),
          version = version + 1,
          updated_at = now()
      WHERE id = v_line.lot_id AND account_id = v_account_id;
    END IF;

    UPDATE public.pos_products
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + v_var_qty),
        version = COALESCE(version, 1) + 1,
        updated_at = now()
    WHERE id = v_line.product_id AND account_id = v_account_id;

    v_total_var_units := v_total_var_units + v_var_qty;
    v_total_var_centimes := v_total_var_centimes + v_var_centimes;
  END LOOP;

  UPDATE public.wms_cycle_counts
  SET status = 'posted',
      posted_at = now(),
      total_variance_units = v_total_var_units,
      total_variance_centimes = v_total_var_centimes,
      version = version + 1,
      updated_at = now()
  WHERE id = v_count.id;

  RETURN jsonb_build_object(
    'cycleCountId', v_count.id,
    'status', 'posted',
    'totalVarianceUnits', v_total_var_units,
    'totalVarianceCentimes', v_total_var_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wms_post_cycle_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wms_post_cycle_count(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.6m Atomic RPC: `wms_transition_stock_transfer`
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wms_transition_stock_transfer(
  p_transfer_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_transfer record;
  v_item jsonb;
  v_qty numeric;
  v_product_id uuid;
  v_lot_id uuid;
  v_new_status text;
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_transfer
  FROM public.wms_stock_transfers
  WHERE id = p_transfer_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WMS_TRANSFER_NOT_FOUND';
  END IF;

  IF p_action = 'dispatch' THEN
    IF v_transfer.status <> 'draft' THEN
      RAISE EXCEPTION 'WMS_INVALID_TRANSFER_TRANSITION: expected draft, got %', v_transfer.status;
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_transfer.items)
    LOOP
      v_qty := COALESCE((v_item ->> 'quantity')::numeric, 0);
      v_lot_id := NULLIF(v_item ->> 'lotId', '')::uuid;
      IF v_lot_id IS NOT NULL AND v_qty > 0 THEN
        UPDATE public.wms_stock_lots
        SET qty_on_hand = qty_on_hand - v_qty,
            version = version + 1,
            updated_at = now()
        WHERE id = v_lot_id AND account_id = v_account_id;
      END IF;
    END LOOP;
    v_new_status := 'in_transit';
    UPDATE public.wms_stock_transfers
    SET status = v_new_status,
        dispatched_at = now(),
        version = version + 1,
        updated_at = now()
    WHERE id = v_transfer.id;
  ELSIF p_action IN ('receive', 'partial') THEN
    IF v_transfer.status NOT IN ('in_transit', 'partial') THEN
      RAISE EXCEPTION 'WMS_INVALID_TRANSFER_TRANSITION: expected in_transit, got %', v_transfer.status;
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_transfer.items)
    LOOP
      v_qty := COALESCE((v_item ->> 'receivedQuantity')::numeric, (v_item ->> 'quantity')::numeric, 0);
      v_product_id := NULLIF(v_item ->> 'productId', '')::uuid;
      IF v_product_id IS NOT NULL AND v_qty > 0 AND v_transfer.to_warehouse_id IS NOT NULL THEN
        INSERT INTO public.wms_stock_lots (
          account_id, business_id, branch_id, warehouse_id, product_id, product_name,
          lot_number, qty_on_hand, recall_status
        ) VALUES (
          v_transfer.account_id, v_transfer.business_id, v_transfer.branch_id,
          v_transfer.to_warehouse_id, v_product_id,
          COALESCE(v_item ->> 'productName', 'Item'),
          COALESCE(NULLIF(v_item ->> 'lotNumber', ''), 'TRF-' || v_transfer.transfer_number),
          v_qty,
          'active'
        )
        ON CONFLICT (business_id, COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid), product_id, lot_number)
        WHERE deleted_at IS NULL
        DO UPDATE SET qty_on_hand = public.wms_stock_lots.qty_on_hand + EXCLUDED.qty_on_hand,
                      updated_at = now(),
                      version = public.wms_stock_lots.version + 1;
      END IF;
    END LOOP;
    v_new_status := CASE WHEN p_action = 'partial' THEN 'partial' ELSE 'received' END;
    UPDATE public.wms_stock_transfers
    SET status = v_new_status,
        received_at = CASE WHEN v_new_status = 'received' THEN now() ELSE received_at END,
        version = version + 1,
        updated_at = now()
    WHERE id = v_transfer.id;
  ELSE
    RAISE EXCEPTION 'WMS_INVALID_TRANSFER_ACTION: %', p_action;
  END IF;

  RETURN jsonb_build_object(
    'transferId', v_transfer.id,
    'status', v_new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wms_transition_stock_transfer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wms_transition_stock_transfer(uuid, text) TO authenticated;

COMMIT;
