-- ============================================================================
-- Phase 3 Step 8 (7.8): trading_commercial Deepening
-- 1. Client Price Tiers & Effective-Dated Price Lists (trading_price_lists)
-- 2. Credit Limit Override Audit Fields on trading_commercial_docs
-- 3. Partial BL -> Facture / Devis -> BL Conversion RPC & Status ('Partial')
-- 4. Avoir <= Invoice DB Trigger Guard
-- 5. Per-Depot Stock Map & Atomic Stock Voucher Execution RPC (BT/BS guard)
-- 6. Retenue de Garantie Release Lifecycle & Cap RPC
-- 7. Field Sales Reps Commissions & Delivery Rounds + Payroll Link
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 7.8a Extend trading_b2b_clients (price tier, CRM party link, optimistic version)
-- ----------------------------------------------------------------------------
ALTER TABLE public.trading_b2b_clients
  ADD COLUMN IF NOT EXISTS price_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.8b Extend trading_products (per-depot stock map, optimistic version)
-- ----------------------------------------------------------------------------
ALTER TABLE public.trading_products
  ADD COLUMN IF NOT EXISTS depot_stock_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.8c Extend trading_commercial_docs (credit override, guarantee release, rep)
-- ----------------------------------------------------------------------------
ALTER TABLE public.trading_commercial_docs
  ADD COLUMN IF NOT EXISTS credit_override_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS credit_override_by_name text,
  ADD COLUMN IF NOT EXISTS credit_override_reason text,
  ADD COLUMN IF NOT EXISTS credit_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS guarantee_retention_percent numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guarantee_retention_centimes bigint NOT NULL DEFAULT 0 CHECK (guarantee_retention_centimes >= 0),
  ADD COLUMN IF NOT EXISTS guarantee_retention_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS guarantee_released_centimes bigint NOT NULL DEFAULT 0 CHECK (guarantee_released_centimes >= 0),
  ADD COLUMN IF NOT EXISTS guarantee_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS rep_staff_id uuid,
  ADD COLUMN IF NOT EXISTS rep_name text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trading_docs_guarantee_status') THEN
    ALTER TABLE public.trading_commercial_docs
      ADD CONSTRAINT chk_trading_docs_guarantee_status
      CHECK (guarantee_retention_status IN ('none', 'held', 'released'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trading_docs_guarantee_released_cap') THEN
    ALTER TABLE public.trading_commercial_docs
      ADD CONSTRAINT chk_trading_docs_guarantee_released_cap
      CHECK (guarantee_released_centimes <= guarantee_retention_centimes);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.8d Trigger Guard: Avoir cannot exceed linked parent invoice amount
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_trading_avoir_not_exceed_invoice()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_ttc numeric(14,2);
  v_parent_type text;
  v_other_avoirs numeric(14,2);
BEGIN
  IF NEW.deleted_at IS NULL
     AND COALESCE(NEW.status, 'Draft') <> 'Canceled'
     AND NEW.doc_type = 'avoir'
     AND NEW.linked_doc_id IS NOT NULL THEN

    SELECT total_ttc, doc_type
    INTO v_parent_ttc, v_parent_type
    FROM public.trading_commercial_docs
    WHERE id = NEW.linked_doc_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF FOUND AND v_parent_type = 'facture' THEN
      SELECT COALESCE(SUM(COALESCE(total_ttc, 0)), 0)
      INTO v_other_avoirs
      FROM public.trading_commercial_docs
      WHERE id <> NEW.id
        AND linked_doc_id = NEW.linked_doc_id
        AND doc_type = 'avoir'
        AND deleted_at IS NULL
        AND COALESCE(status, 'Draft') <> 'Canceled';

      IF (v_other_avoirs + COALESCE(NEW.total_ttc, 0)) > COALESCE(v_parent_ttc, 0) THEN
        RAISE EXCEPTION 'AVOIR_EXCEEDS_INVOICE' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trading_avoir_not_exceed_invoice ON public.trading_commercial_docs;
CREATE TRIGGER trg_guard_trading_avoir_not_exceed_invoice
  BEFORE INSERT OR UPDATE ON public.trading_commercial_docs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_trading_avoir_not_exceed_invoice();

-- ----------------------------------------------------------------------------
-- 7.8e Client-Tier Price Lists with Effective Dates (trading_price_lists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'standard',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_trading_price_lists_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_trading_price_lists_lookup
  ON public.trading_price_lists (branch_id, tier, effective_from DESC)
  WHERE deleted_at IS NULL AND is_active = true;

ALTER TABLE public.trading_price_lists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trading_price_lists' AND policyname = 'trading_price_lists_tenant_isolation'
  ) THEN
    CREATE POLICY trading_price_lists_tenant_isolation ON public.trading_price_lists
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.8f Delivery Rounds (trading_delivery_rounds)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_delivery_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  round_number text NOT NULL,
  round_date date NOT NULL DEFAULT CURRENT_DATE,
  rep_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  rep_name text NOT NULL,
  vehicle_label text,
  depot_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  wilaya text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_expected_centimes bigint NOT NULL DEFAULT 0 CHECK (total_expected_centimes >= 0),
  total_collected_centimes bigint NOT NULL DEFAULT 0 CHECK (total_collected_centimes >= 0),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_trading_delivery_rounds_branch_date
  ON public.trading_delivery_rounds (branch_id, round_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.trading_delivery_rounds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trading_delivery_rounds' AND policyname = 'trading_delivery_rounds_tenant_isolation'
  ) THEN
    CREATE POLICY trading_delivery_rounds_tenant_isolation ON public.trading_delivery_rounds
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.8g Field Sales Rep Commissions (trading_rep_commissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_rep_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  rep_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  rep_name text NOT NULL,
  commercial_doc_id uuid REFERENCES public.trading_commercial_docs(id) ON DELETE SET NULL,
  doc_number text,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_round_id uuid REFERENCES public.trading_delivery_rounds(id) ON DELETE SET NULL,
  basis_amount_centimes bigint NOT NULL DEFAULT 0 CHECK (basis_amount_centimes >= 0),
  rate_bps int NOT NULL DEFAULT 0 CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  commission_centimes bigint NOT NULL DEFAULT 0 CHECK (commission_centimes >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'posted_to_payroll')),
  payroll_run_id uuid,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_trading_rep_commissions_branch_rep
  ON public.trading_rep_commissions (branch_id, rep_staff_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.trading_rep_commissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trading_rep_commissions' AND policyname = 'trading_rep_commissions_tenant_isolation'
  ) THEN
    CREATE POLICY trading_rep_commissions_tenant_isolation ON public.trading_rep_commissions
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.8h RPC: Partial Document Conversion (Devis -> BC/BL, BL -> Facture)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trading_convert_commercial_doc_partial(
  p_source_doc_id uuid,
  p_target_type text,
  p_new_doc_number text,
  p_line_quantities jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src public.trading_commercial_docs%ROWTYPE;
  v_new_id uuid;
  v_src_items jsonb := '[]'::jsonb;
  v_updated_src_items jsonb := '[]'::jsonb;
  v_child_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_item_id text;
  v_qty numeric;
  v_already numeric;
  v_remaining numeric;
  v_take numeric;
  v_pu numeric;
  v_disc numeric;
  v_tva_pct numeric;
  v_line_ht numeric;
  v_line_tva numeric;
  v_line_ttc numeric;
  v_child_ht numeric := 0;
  v_child_tva numeric := 0;
  v_child_ttc numeric := 0;
  v_has_remaining boolean := false;
  v_next_src_status text;
BEGIN
  SELECT * INTO v_src
  FROM public.trading_commercial_docs
  WHERE id = p_source_doc_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR NOT public.has_branch_access(v_src.business_id, v_src.branch_id) THEN
    RAISE EXCEPTION 'DOC_NOT_FOUND_OR_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF p_target_type NOT IN ('commande', 'bl', 'facture', 'avoir') THEN
    RAISE EXCEPTION 'INVALID_TARGET_DOC_TYPE';
  END IF;

  v_src_items := COALESCE(v_src.items, '[]'::jsonb);

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_src_items)
  LOOP
    v_item_id := COALESCE(v_item ->> 'id', '');
    v_qty := COALESCE((v_item ->> 'quantity')::numeric, 0);
    v_already := COALESCE(
      (v_item ->> 'convertedQty')::numeric,
      CASE
        WHEN p_target_type = 'facture' THEN (v_item ->> 'invoicedQty')::numeric
        ELSE (v_item ->> 'deliveredQty')::numeric
      END,
      0
    );
    v_remaining := GREATEST(0, v_qty - v_already);

    IF p_line_quantities IS NOT NULL AND p_line_quantities ? v_item_id THEN
      v_take := COALESCE((p_line_quantities ->> v_item_id)::numeric, 0);
    ELSE
      v_take := v_remaining;
    END IF;

    IF v_take < 0 OR v_take > v_remaining THEN
      RAISE EXCEPTION 'CONVERSION_QTY_EXCEEDS_REMAINING' USING ERRCODE = '22003';
    END IF;

    IF v_take > 0 THEN
      v_pu := COALESCE((v_item ->> 'unitPriceHt')::numeric, 0);
      v_disc := COALESCE((v_item ->> 'discountPercent')::numeric, 0);
      v_tva_pct := COALESCE((v_item ->> 'tvaPercent')::numeric, 19);
      v_line_ht := round((v_take * v_pu * (1 - v_disc / 100.0))::numeric, 2);
      v_line_tva := round((v_line_ht * (v_tva_pct / 100.0))::numeric, 2);
      v_line_ttc := v_line_ht + v_line_tva;
      v_child_ht := v_child_ht + v_line_ht;
      v_child_tva := v_child_tva + v_line_tva;
      v_child_ttc := v_child_ttc + v_line_ttc;

      v_child_items := v_child_items || jsonb_build_array(
        jsonb_build_object(
          'id', COALESCE(NULLIF(v_item_id, ''), gen_random_uuid()::text),
          'productId', v_item -> 'productId',
          'description', COALESCE(v_item ->> 'description', ''),
          'isService', COALESCE((v_item ->> 'isService')::boolean, false),
          'quantity', v_take,
          'unit', COALESCE(v_item ->> 'unit', 'u'),
          'unitPriceHt', v_pu,
          'tvaPercent', v_tva_pct,
          'discountPercent', v_disc,
          'totalHt', v_line_ht,
          'totalTtc', v_line_ttc
        )
      );
    END IF;

    IF (v_already + v_take) < v_qty THEN
      v_has_remaining := true;
    END IF;

    v_updated_src_items := v_updated_src_items || jsonb_build_array(
      v_item || jsonb_build_object(
        'convertedQty', v_already + v_take,
        CASE WHEN p_target_type = 'facture' THEN 'invoicedQty' ELSE 'deliveredQty' END,
        v_already + v_take
      )
    );
  END LOOP;

  IF jsonb_array_length(v_child_items) = 0 THEN
    RAISE EXCEPTION 'NO_CONVERTIBLE_LINES_SELECTED' USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.trading_commercial_docs (
    account_id, business_id, branch_id, staff_id,
    doc_type, doc_number, doc_date, client_id, client_name, depot_id,
    status, payment_method, payment_status,
    total_ht, total_tva, timbre_fiscal, total_ttc, paid_amount,
    linked_doc_id, linked_doc_number, items, notes,
    rep_staff_id, rep_name
  ) VALUES (
    v_src.account_id, v_src.business_id, v_src.branch_id, public.get_auth_staff_id(),
    p_target_type, p_new_doc_number, CURRENT_DATE, v_src.client_id, v_src.client_name, v_src.depot_id,
    CASE WHEN p_target_type = 'bl' THEN 'Delivered' WHEN p_target_type = 'facture' THEN 'Validated' ELSE 'Draft' END,
    v_src.payment_method, 'Unpaid',
    v_child_ht, v_child_tva, 0, v_child_ttc, 0,
    v_src.id, v_src.doc_number, v_child_items, v_src.notes,
    v_src.rep_staff_id, v_src.rep_name
  ) RETURNING id INTO v_new_id;

  v_next_src_status := CASE
    WHEN v_has_remaining THEN 'Partial'
    WHEN p_target_type = 'bl' THEN 'Delivered'
    ELSE 'Validated'
  END;

  UPDATE public.trading_commercial_docs
  SET items = v_updated_src_items,
      status = v_next_src_status,
      updated_at = now()
  WHERE id = v_src.id;

  RETURN jsonb_build_object(
    'success', true,
    'newDocId', v_new_id,
    'sourceStatus', v_next_src_status,
    'totalHt', v_child_ht,
    'totalTva', v_child_tva,
    'totalTtc', v_child_ttc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trading_convert_commercial_doc_partial(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trading_convert_commercial_doc_partial(uuid, text, text, jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.8i RPC: Depot-Aware Atomic Stock Voucher Execution (BE / BS / BT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trading_execute_stock_voucher(
  p_voucher jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_acc uuid := (p_voucher ->> 'account_id')::uuid;
  v_biz uuid := (p_voucher ->> 'business_id')::uuid;
  v_br uuid := (p_voucher ->> 'branch_id')::uuid;
  v_type text := p_voucher ->> 'voucher_type';
  v_src_depot text := COALESCE(p_voucher ->> 'depot_source_id', '');
  v_dst_depot text := COALESCE(p_voucher ->> 'depot_dest_id', '');
  v_items jsonb := COALESCE(p_voucher -> 'items', '[]'::jsonb);
  v_it jsonb;
  v_prod public.trading_products%ROWTYPE;
  v_prod_id uuid;
  v_qty numeric;
  v_src_avail numeric;
  v_dst_avail numeric;
  v_next_map jsonb;
  v_next_total numeric;
  v_voucher_id uuid;
BEGIN
  IF NOT public.has_branch_access(v_biz, v_br) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF v_type NOT IN ('entree', 'sortie', 'transfert', 'inventaire') THEN
    RAISE EXCEPTION 'INVALID_VOUCHER_TYPE';
  END IF;

  IF v_type = 'transfert' AND (v_src_depot = '' OR v_dst_depot = '' OR v_src_depot = v_dst_depot) THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_DEPOTS';
  END IF;

  FOR v_it IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_prod_id := NULLIF(v_it ->> 'productId', '')::uuid;
    v_qty := COALESCE((v_it ->> 'quantity')::numeric, 0);
    IF v_prod_id IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_VOUCHER_ITEM';
    END IF;

    SELECT * INTO v_prod
    FROM public.trading_products
    WHERE id = v_prod_id AND branch_id = v_br AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    v_next_map := COALESCE(v_prod.depot_stock_map, '{}'::jsonb);
    IF v_next_map = '{}'::jsonb THEN
      -- Legacy unsplit stock falls back to product's assigned depot or the first active source depot
      IF v_prod.depot_id IS NOT NULL THEN
        v_next_map := jsonb_build_object(v_prod.depot_id::text, COALESCE(v_prod.stock_quantity, 0));
      ELSIF v_src_depot <> '' THEN
        v_next_map := jsonb_build_object(v_src_depot, COALESCE(v_prod.stock_quantity, 0));
      END IF;
    END IF;

    v_src_avail := COALESCE((v_next_map ->> v_src_depot)::numeric, 0);

    IF v_type IN ('sortie', 'transfert') AND v_qty > v_src_avail THEN
      RAISE EXCEPTION 'INSUFFICIENT_DEPOT_STOCK' USING ERRCODE = '23514';
    END IF;

    IF v_type IN ('entree', 'inventaire') THEN
      v_next_map := jsonb_set(v_next_map, ARRAY[v_src_depot], to_jsonb(v_src_avail + v_qty), true);
      v_next_total := COALESCE(v_prod.stock_quantity, 0) + v_qty;
    ELSIF v_type = 'sortie' THEN
      v_next_map := jsonb_set(v_next_map, ARRAY[v_src_depot], to_jsonb(GREATEST(0, v_src_avail - v_qty)), true);
      v_next_total := GREATEST(0, COALESCE(v_prod.stock_quantity, 0) - v_qty);
    ELSE
      -- transfert preserves global stock_quantity
      v_dst_avail := COALESCE((v_next_map ->> v_dst_depot)::numeric, 0);
      v_next_map := jsonb_set(v_next_map, ARRAY[v_src_depot], to_jsonb(GREATEST(0, v_src_avail - v_qty)), true);
      v_next_map := jsonb_set(v_next_map, ARRAY[v_dst_depot], to_jsonb(v_dst_avail + v_qty), true);
      v_next_total := COALESCE(v_prod.stock_quantity, 0);
    END IF;

    UPDATE public.trading_products
    SET depot_stock_map = v_next_map,
        stock_quantity = v_next_total,
        updated_at = now()
    WHERE id = v_prod.id;
  END LOOP;

  INSERT INTO public.trading_stock_vouchers (
    id, account_id, business_id, branch_id, staff_id,
    voucher_number, voucher_type, voucher_date,
    depot_source_id, depot_source_name, depot_dest_id, depot_dest_name,
    reason, operator_name, total_valuation_dzd, items, notes
  ) VALUES (
    COALESCE(NULLIF(p_voucher ->> 'id', '')::uuid, gen_random_uuid()),
    v_acc, v_biz, v_br, public.get_auth_staff_id(),
    p_voucher ->> 'voucher_number',
    v_type,
    COALESCE(NULLIF(p_voucher ->> 'voucher_date', '')::date, CURRENT_DATE),
    NULLIF(v_src_depot, '')::uuid,
    p_voucher ->> 'depot_source_name',
    NULLIF(v_dst_depot, '')::uuid,
    p_voucher ->> 'depot_dest_name',
    COALESCE(p_voucher ->> 'reason', 'transfert'),
    p_voucher ->> 'operator_name',
    COALESCE((p_voucher ->> 'total_valuation_dzd')::numeric, 0),
    v_items,
    p_voucher ->> 'notes'
  ) RETURNING id INTO v_voucher_id;

  RETURN jsonb_build_object('success', true, 'voucherId', v_voucher_id);
END;
$$;

REVOKE ALL ON FUNCTION public.trading_execute_stock_voucher(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trading_execute_stock_voucher(jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.8j RPC: Guarantee Retention Release Lifecycle
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trading_release_guarantee_retention(
  p_doc_id uuid,
  p_release_amount numeric,
  p_payment_method text DEFAULT 'Virement bancaire',
  p_reference text DEFAULT NULL,
  p_release_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doc public.trading_commercial_docs%ROWTYPE;
  v_rel_centimes bigint;
  v_new_released bigint;
  v_next_status text;
BEGIN
  SELECT * INTO v_doc
  FROM public.trading_commercial_docs
  WHERE id = p_doc_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR NOT public.has_branch_access(v_doc.business_id, v_doc.branch_id) THEN
    RAISE EXCEPTION 'DOC_NOT_FOUND_OR_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  v_rel_centimes := round(COALESCE(p_release_amount, 0) * 100.0)::bigint;
  IF v_rel_centimes <= 0 THEN
    RAISE EXCEPTION 'INVALID_RELEASE_AMOUNT' USING ERRCODE = '22003';
  END IF;

  IF COALESCE(v_doc.guarantee_retention_centimes, 0) <= 0 THEN
    RAISE EXCEPTION 'NO_GUARANTEE_RETENTION_HELD' USING ERRCODE = '23514';
  END IF;

  v_new_released := COALESCE(v_doc.guarantee_released_centimes, 0) + v_rel_centimes;
  IF v_new_released > v_doc.guarantee_retention_centimes THEN
    RAISE EXCEPTION 'GUARANTEE_RELEASE_EXCEEDS_HELD' USING ERRCODE = '23514';
  END IF;

  v_next_status := CASE
    WHEN v_new_released >= v_doc.guarantee_retention_centimes THEN 'released'
    ELSE 'held'
  END;

  UPDATE public.trading_commercial_docs
  SET guarantee_released_centimes = v_new_released,
      guarantee_retention_status = v_next_status,
      guarantee_released_at = COALESCE(p_release_date, CURRENT_DATE)::timestamptz,
      updated_at = now()
  WHERE id = v_doc.id;

  RETURN jsonb_build_object(
    'success', true,
    'docId', v_doc.id,
    'releasedCentimes', v_new_released,
    'heldCentimes', v_doc.guarantee_retention_centimes,
    'status', v_next_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trading_release_guarantee_retention(uuid, numeric, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trading_release_guarantee_retention(uuid, numeric, text, text, date) TO authenticated;

-- Attach optimistic & audit triggers when present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'trading_price_lists',
      'trading_delivery_rounds',
      'trading_rep_commissions'
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
      'trading_price_lists',
      'trading_delivery_rounds',
      'trading_rep_commissions'
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
