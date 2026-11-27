-- ============================================================================
-- Atrium Phase 3 Migration (Step 3): Section 7.3 POS & Inventory Depth
-- Product variants, modifier groups, recipe BOMs, scale PLU/weight & expiry,
-- Floor tables, Kitchen Display System (KDS) delta snapshots & revisions,
-- Table transfers, Manager-PIN voids, Customer credit ledger (Carnet de dettes),
-- and Optical prescription tracking (trade_optical_store).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 7.3a Extend pos_products with variants, modifiers, recipe BOM, PLU & expiry
-- ----------------------------------------------------------------------------
ALTER TABLE public.pos_products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modifier_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recipe_bom jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_weighted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plu_code text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS idx_pos_products_plu
  ON public.pos_products (business_id, branch_id, plu_code)
  WHERE deleted_at IS NULL AND plu_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pos_products_expiry
  ON public.pos_products (business_id, branch_id, expiry_date)
  WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7.3b Extend pos_sales with tip, channel, table, delivery & PIN-void audit
-- ----------------------------------------------------------------------------
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS tip_centimes bigint NOT NULL DEFAULT 0 CHECK (tip_centimes >= 0),
  ADD COLUMN IF NOT EXISTS order_channel text NOT NULL DEFAULT 'counter'
    CHECK (order_channel IN ('counter', 'dine_in', 'takeaway', 'delivery')),
  ADD COLUMN IF NOT EXISTS table_id uuid,
  ADD COLUMN IF NOT EXISTS table_label text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_courier text,
  ADD COLUMN IF NOT EXISTS delivery_fee_centimes bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_centimes >= 0),
  ADD COLUMN IF NOT EXISTS voided_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS void_pin_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

-- ----------------------------------------------------------------------------
-- 7.3c Floor Tables (`pos_floor_tables`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_floor_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_code text NOT NULL,
  label text NOT NULL,
  zone text NOT NULL DEFAULT 'Main Hall',
  seats integer NOT NULL DEFAULT 4 CHECK (seats > 0),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  current_order_id uuid,
  waiter_staff_id uuid,
  waiter_name text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_floor_tables_code_active
  ON public.pos_floor_tables (business_id, branch_id, lower(table_code))
  WHERE deleted_at IS NULL;

ALTER TABLE public.pos_floor_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_floor_tables_tenant_read" ON public.pos_floor_tables;
CREATE POLICY "pos_floor_tables_tenant_read"
  ON public.pos_floor_tables
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "pos_floor_tables_tenant_write" ON public.pos_floor_tables;
CREATE POLICY "pos_floor_tables_tenant_write"
  ON public.pos_floor_tables
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.3d Kitchen Display Orders & Snapshots (`pos_kitchen_orders`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_kitchen_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  order_channel text NOT NULL DEFAULT 'dine_in'
    CHECK (order_channel IN ('counter', 'dine_in', 'takeaway', 'delivery')),
  table_id uuid REFERENCES public.pos_floor_tables(id) ON DELETE SET NULL,
  table_label text,
  waiter_staff_id uuid,
  waiter_name text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_courier text,
  delivery_fee_centimes bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_centimes >= 0),
  kds_status text NOT NULL DEFAULT 'sent'
    CHECK (kds_status IN ('draft', 'sent', 'preparing', 'ready', 'served', 'settled', 'voided')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  current_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_snapshot_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  delta_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount_centimes bigint NOT NULL DEFAULT 0 CHECK (discount_centimes >= 0),
  tip_centimes bigint NOT NULL DEFAULT 0 CHECK (tip_centimes >= 0),
  subtotal_centimes bigint NOT NULL DEFAULT 0 CHECK (subtotal_centimes >= 0),
  total_centimes bigint NOT NULL DEFAULT 0 CHECK (total_centimes >= 0),
  settled_sale_id uuid,
  void_reason text,
  void_pin_verified boolean NOT NULL DEFAULT false,
  voided_by_staff_id uuid,
  voided_at timestamptz,
  notes text,
  sent_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  settled_at timestamptz,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pos_kitchen_orders_kds
  ON public.pos_kitchen_orders (business_id, branch_id, kds_status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pos_kitchen_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_kitchen_orders_tenant_read" ON public.pos_kitchen_orders;
CREATE POLICY "pos_kitchen_orders_tenant_read"
  ON public.pos_kitchen_orders
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "pos_kitchen_orders_tenant_write" ON public.pos_kitchen_orders;
CREATE POLICY "pos_kitchen_orders_tenant_write"
  ON public.pos_kitchen_orders
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.3e Customer Credit Book / Carnet de dettes (`pos_customer_credit_entries`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_customer_credit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  entry_type text NOT NULL CHECK (entry_type IN ('charge', 'repayment', 'adjustment')),
  amount_centimes bigint NOT NULL CHECK (amount_centimes >= 0),
  credit_limit_centimes bigint NOT NULL DEFAULT 5000000 CHECK (credit_limit_centimes >= 0),
  payment_method text,
  sale_id uuid,
  unified_payment_id uuid,
  reference text NOT NULL,
  notes text,
  recorded_by_staff_id uuid,
  recorded_by_name text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pos_credit_entries_customer
  ON public.pos_customer_credit_entries (business_id, branch_id, customer_name, occurred_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pos_customer_credit_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_customer_credit_entries_tenant_read" ON public.pos_customer_credit_entries;
CREATE POLICY "pos_customer_credit_entries_tenant_read"
  ON public.pos_customer_credit_entries
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "pos_customer_credit_entries_tenant_write" ON public.pos_customer_credit_entries;
CREATE POLICY "pos_customer_credit_entries_tenant_write"
  ON public.pos_customer_credit_entries
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.3f Optical Store Prescriptions (`pos_optical_prescriptions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_optical_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  prescriber_name text,
  prescribed_at date NOT NULL DEFAULT CURRENT_DATE,
  od_sphere numeric(5,2),
  od_cylinder numeric(5,2),
  od_axis integer CHECK (od_axis IS NULL OR (od_axis >= 0 AND od_axis <= 180)),
  od_add numeric(4,2),
  os_sphere numeric(5,2),
  os_cylinder numeric(5,2),
  os_axis integer CHECK (os_axis IS NULL OR (os_axis >= 0 AND os_axis <= 180)),
  os_add numeric(4,2),
  pd_mm numeric(4,1),
  lens_type text,
  frame_model text,
  lab_status text NOT NULL DEFAULT 'measured'
    CHECK (lab_status IN ('measured', 'ordered_lab', 'edging', 'ready', 'delivered')),
  sale_id uuid,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pos_optical_rx_customer
  ON public.pos_optical_prescriptions (business_id, branch_id, prescribed_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pos_optical_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_optical_prescriptions_tenant_read" ON public.pos_optical_prescriptions;
CREATE POLICY "pos_optical_prescriptions_tenant_read"
  ON public.pos_optical_prescriptions
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "pos_optical_prescriptions_tenant_write" ON public.pos_optical_prescriptions;
CREATE POLICY "pos_optical_prescriptions_tenant_write"
  ON public.pos_optical_prescriptions
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.3g Transactional RPC: Send / Revise Kitchen Order + Occupy Table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_send_kitchen_order(
  p_order_id uuid,
  p_table_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_delta_items jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ord record;
  v_tbl record;
  v_next_rev integer;
  v_table_label text;
BEGIN
  SELECT * INTO v_ord
  FROM public.pos_kitchen_orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KITCHEN_ORDER_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_ord.business_id, v_ord.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF v_ord.kds_status IN ('settled', 'voided') THEN
    RAISE EXCEPTION 'KITCHEN_ORDER_CLOSED';
  END IF;

  v_table_label := v_ord.table_label;
  IF p_table_id IS NOT NULL THEN
    SELECT * INTO v_tbl
    FROM public.pos_floor_tables
    WHERE id = p_table_id AND branch_id = v_ord.branch_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'FLOOR_TABLE_NOT_FOUND';
    END IF;

    IF v_tbl.status = 'occupied' AND v_tbl.current_order_id IS NOT NULL AND v_tbl.current_order_id <> v_ord.id THEN
      RAISE EXCEPTION 'TARGET_TABLE_OCCUPIED';
    END IF;

    v_table_label := v_tbl.label;
    UPDATE public.pos_floor_tables
    SET status = 'occupied',
        current_order_id = v_ord.id,
        updated_at = now(),
        version = version + 1
    WHERE id = v_tbl.id;
  END IF;

  v_next_rev := CASE
    WHEN v_ord.sent_at IS NULL THEN GREATEST(1, coalesce(v_ord.revision, 1))
    ELSE coalesce(v_ord.revision, 1) + 1
  END;

  UPDATE public.pos_kitchen_orders
  SET table_id = COALESCE(p_table_id, table_id),
      table_label = COALESCE(v_table_label, table_label),
      current_items = COALESCE(p_items, current_items),
      sent_snapshot_items = COALESCE(p_items, sent_snapshot_items),
      delta_items = COALESCE(p_delta_items, '[]'::jsonb),
      kds_status = 'sent',
      revision = v_next_rev,
      sent_at = COALESCE(sent_at, now()),
      notes = COALESCE(p_notes, notes),
      updated_at = now(),
      version = version + 1
  WHERE id = v_ord.id;

  RETURN jsonb_build_object(
    'order_id', v_ord.id,
    'revision', v_next_rev,
    'kds_status', 'sent',
    'table_label', v_table_label
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_send_kitchen_order(uuid, uuid, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_send_kitchen_order(uuid, uuid, jsonb, jsonb, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.3h Transactional RPC: Transfer Order Between Floor Tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_transfer_table_order(
  p_order_id uuid,
  p_target_table_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ord record;
  v_target record;
  v_source_id uuid;
BEGIN
  SELECT * INTO v_ord
  FROM public.pos_kitchen_orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KITCHEN_ORDER_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_ord.business_id, v_ord.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF v_ord.kds_status IN ('settled', 'voided') THEN
    RAISE EXCEPTION 'KITCHEN_ORDER_CLOSED';
  END IF;

  SELECT * INTO v_target
  FROM public.pos_floor_tables
  WHERE id = p_target_table_id AND branch_id = v_ord.branch_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FLOOR_TABLE_NOT_FOUND';
  END IF;

  IF v_target.status = 'occupied' AND v_target.current_order_id IS NOT NULL AND v_target.current_order_id <> v_ord.id THEN
    RAISE EXCEPTION 'TARGET_TABLE_OCCUPIED';
  END IF;

  v_source_id := v_ord.table_id;

  IF v_source_id IS NOT NULL AND v_source_id <> v_target.id THEN
    UPDATE public.pos_floor_tables
    SET status = 'available',
        current_order_id = NULL,
        updated_at = now(),
        version = version + 1
    WHERE id = v_source_id AND current_order_id = v_ord.id;
  END IF;

  UPDATE public.pos_floor_tables
  SET status = 'occupied',
      current_order_id = v_ord.id,
      updated_at = now(),
      version = version + 1
  WHERE id = v_target.id;

  UPDATE public.pos_kitchen_orders
  SET table_id = v_target.id,
      table_label = v_target.label,
      order_channel = 'dine_in',
      updated_at = now(),
      version = version + 1
  WHERE id = v_ord.id;

  RETURN jsonb_build_object(
    'order_id', v_ord.id,
    'from_table_id', v_source_id,
    'to_table_id', v_target.id,
    'to_table_label', v_target.label
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_transfer_table_order(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_transfer_table_order(uuid, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.3i Transactional RPC: Manager-PIN Void of Kitchen Order or Completed Sale
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_void_kitchen_or_sale_order(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_pin_verified boolean,
  p_voided_by_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ord record;
  v_sale record;
BEGIN
  IF NOT COALESCE(p_pin_verified, false) THEN
    RAISE EXCEPTION 'VOID_PIN_REQUIRED';
  END IF;

  IF p_target_type = 'kitchen_order' THEN
    SELECT * INTO v_ord
    FROM public.pos_kitchen_orders
    WHERE id = p_target_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'KITCHEN_ORDER_NOT_FOUND';
    END IF;

    IF NOT (SELECT public.has_branch_access(v_ord.business_id, v_ord.branch_id)) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;

    UPDATE public.pos_kitchen_orders
    SET kds_status = 'voided',
        void_reason = NULLIF(trim(COALESCE(p_reason, '')), ''),
        void_pin_verified = true,
        voided_by_staff_id = p_voided_by_staff_id,
        voided_at = now(),
        updated_at = now(),
        version = version + 1
    WHERE id = v_ord.id;

    IF v_ord.table_id IS NOT NULL THEN
      UPDATE public.pos_floor_tables
      SET status = 'available',
          current_order_id = NULL,
          updated_at = now(),
          version = version + 1
      WHERE id = v_ord.table_id AND current_order_id = v_ord.id;
    END IF;

    RETURN jsonb_build_object('target_type', 'kitchen_order', 'id', v_ord.id, 'status', 'voided');
  ELSIF p_target_type = 'sale' THEN
    SELECT * INTO v_sale
    FROM public.pos_sales
    WHERE id = p_target_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SALE_NOT_FOUND';
    END IF;

    IF NOT (SELECT public.has_branch_access(v_sale.business_id, v_sale.branch_id)) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;

    UPDATE public.pos_sales
    SET status = 'Voided',
        void_reason = NULLIF(trim(COALESCE(p_reason, '')), ''),
        void_pin_verified = true,
        voided_by_staff_id = p_voided_by_staff_id,
        voided_at = now(),
        updated_at = now(),
        version = version + 1
    WHERE id = v_sale.id;

    RETURN jsonb_build_object('target_type', 'sale', 'id', v_sale.id, 'status', 'Voided');
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_VOID_TARGET';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.pos_void_kitchen_or_sale_order(text, uuid, text, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_void_kitchen_or_sale_order(text, uuid, text, boolean, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.3j Transactional RPC: Record Customer Carnet de Dettes Entry
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_record_carnet_entry(
  p_business_id uuid,
  p_branch_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_entry_type text,
  p_amount_centimes bigint,
  p_reference text,
  p_payment_method text DEFAULT 'Cash',
  p_sale_id uuid DEFAULT NULL,
  p_unified_payment_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch record;
  v_entry_id uuid;
  v_signed_dzd numeric(12,2);
BEGIN
  IF NOT (SELECT public.has_branch_access(p_business_id, p_branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF p_entry_type NOT IN ('charge', 'repayment', 'adjustment') THEN
    RAISE EXCEPTION 'INVALID_CARNET_ENTRY_TYPE';
  END IF;

  IF COALESCE(p_amount_centimes, 0) < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_CARNET_AMOUNT';
  END IF;

  SELECT id, account_id, business_id INTO v_branch
  FROM public.branches
  WHERE id = p_branch_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BRANCH_NOT_FOUND';
  END IF;

  INSERT INTO public.pos_customer_credit_entries (
    account_id, business_id, branch_id, customer_id, customer_name,
    entry_type, amount_centimes, payment_method, sale_id, unified_payment_id,
    reference, notes
  ) VALUES (
    v_branch.account_id, p_business_id, p_branch_id, p_customer_id, p_customer_name,
    p_entry_type, p_amount_centimes, p_payment_method, p_sale_id, p_unified_payment_id,
    p_reference, p_notes
  ) RETURNING id INTO v_entry_id;

  IF p_customer_id IS NOT NULL THEN
    v_signed_dzd := CASE
      WHEN p_entry_type = 'repayment' THEN -(p_amount_centimes / 100.0)
      ELSE (p_amount_centimes / 100.0)
    END;
    UPDATE public.pos_customers
    SET credit_balance_dzd = GREATEST(0, COALESCE(credit_balance_dzd, 0) + v_signed_dzd),
        updated_at = now()
    WHERE id = p_customer_id AND branch_id = p_branch_id AND deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'entry_id', v_entry_id,
    'entry_type', p_entry_type,
    'amount_centimes', p_amount_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pos_record_carnet_entry(uuid, uuid, uuid, text, text, bigint, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_record_carnet_entry(uuid, uuid, uuid, text, text, bigint, text, text, uuid, uuid, text) TO authenticated;

-- Attach audit triggers when immutable audit trigger function is present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'pos_floor_tables',
      'pos_kitchen_orders',
      'pos_customer_credit_entries',
      'pos_optical_prescriptions'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl,
          v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
