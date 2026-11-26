-- ============================================================================
-- Atrium Step 6 Migration: Section 1 Kiosk & POS Atomic Persistence (1.1 - 1.5)
-- Items:
--   1.1 Gym front-desk check-in override columns & duplicate-window RPC
--   1.2 Education attendance lock/audit columns, active dedupe & partial unique index
--   1.3 Salon chair station persisted fields & started_at backfill
--   1.4 POS cash drawer sessions, cash movements & immutable Z-reports (Option B)
--   1.5 Atomic POS partial/full refund + stock restoration & symmetric undo RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Gym Check-In Override Columns & Duplicate Guarded RPC
-- ----------------------------------------------------------------------------
ALTER TABLE public.gym_check_ins
  ADD COLUMN IF NOT EXISTS override_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS override_reason text;

DROP FUNCTION IF EXISTS public.gym_record_check_in(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.gym_record_check_in(uuid, uuid, text, text, uuid, int, uuid, text);

CREATE OR REPLACE FUNCTION public.gym_record_check_in(
  p_branch_id uuid,
  p_member_id uuid,
  p_method text DEFAULT 'rfid',
  p_device_id text DEFAULT NULL,
  p_check_in_id uuid DEFAULT NULL,
  p_duplicate_window_minutes int DEFAULT 5,
  p_override_by_staff_id uuid DEFAULT NULL,
  p_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member record;
  v_existing record;
  v_recent record;
  v_status text := 'granted';
  v_new_sessions int;
  v_checkin_id uuid := COALESCE(p_check_in_id, gen_random_uuid());
  v_window_mins int := GREATEST(0, COALESCE(p_duplicate_window_minutes, 5));
  v_has_override boolean := length(trim(COALESCE(p_override_reason, ''))) > 0;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  -- Idempotent client-UUID check: if this check-in ID was already persisted, return it cleanly
  SELECT * INTO v_existing
  FROM public.gym_check_ins
  WHERE id = v_checkin_id AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', (v_existing.status = 'granted'),
      'status', v_existing.status,
      'checkInId', v_existing.id,
      'remainingSessions', v_existing.remaining_sessions_after,
      'duplicateBlocked', false,
      'idempotentReplay', true
    );
  END IF;

  SELECT * INTO v_member
  FROM public.gym_members
  WHERE id = p_member_id AND branch_id = p_branch_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MEMBER_NOT_FOUND');
  END IF;

  IF v_member.status IN ('Banned', 'Suspended', 'Frozen') THEN
    v_status := 'denied_frozen';
  ELSIF v_member.status = 'Expired'
     OR (v_member.expiration_date IS NOT NULL AND v_member.expiration_date < CURRENT_DATE) THEN
    v_status := 'denied_expired';
  ELSIF v_member.remaining_sessions IS NOT NULL AND v_member.remaining_sessions <= 0 THEN
    v_status := 'denied_quota';
  END IF;

  -- Duplicate check-in guard within configurable window unless owner override reason is provided
  IF v_status = 'granted' AND v_window_mins > 0 AND NOT v_has_override THEN
    SELECT id, checked_in_at INTO v_recent
    FROM public.gym_check_ins
    WHERE branch_id = p_branch_id
      AND member_id = p_member_id
      AND status = 'granted'
      AND deleted_at IS NULL
      AND checked_in_at >= (now() - make_interval(mins => v_window_mins))
    ORDER BY checked_in_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'duplicate_blocked',
        'duplicateBlocked', true,
        'existingCheckInAt', v_recent.checked_in_at,
        'remainingSessions', v_member.remaining_sessions
      );
    END IF;
  END IF;

  v_new_sessions := v_member.remaining_sessions;
  IF v_status = 'granted' AND v_member.remaining_sessions IS NOT NULL THEN
    v_new_sessions := GREATEST(0, v_member.remaining_sessions - 1);
    UPDATE public.gym_members
    SET remaining_sessions = v_new_sessions,
        updated_at = now(),
        updated_by_staff_id = COALESCE(public.get_auth_staff_id(), p_override_by_staff_id)
    WHERE id = v_member.id;
  END IF;

  INSERT INTO public.gym_check_ins (
    id, account_id, business_id, branch_id, staff_id, device_id,
    member_id, member_name, method, status, remaining_sessions_after,
    override_by_staff_id, override_reason
  ) VALUES (
    v_checkin_id,
    v_member.account_id,
    v_member.business_id,
    v_member.branch_id,
    public.get_auth_staff_id(),
    p_device_id,
    v_member.id,
    v_member.full_name,
    COALESCE(p_method, 'rfid'),
    v_status,
    v_new_sessions,
    CASE WHEN v_has_override THEN COALESCE(p_override_by_staff_id, public.get_auth_staff_id()) ELSE NULL END,
    NULLIF(trim(COALESCE(p_override_reason, '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', (v_status = 'granted'),
    'status', v_status,
    'checkInId', v_checkin_id,
    'remainingSessions', v_new_sessions,
    'duplicateBlocked', false
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 1.2 Education Attendance Audit Columns, Dedupe & Partial Unique Index
-- ----------------------------------------------------------------------------
ALTER TABLE public.edu_attendance
  ADD COLUMN IF NOT EXISTS marked_by uuid,
  ADD COLUMN IF NOT EXISTS marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Soft-delete duplicate active attendance rows before enforcing unique index
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY business_id, session_id, student_id
           ORDER BY updated_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.edu_attendance
  WHERE deleted_at IS NULL
)
UPDATE public.edu_attendance ea
SET deleted_at = now(),
    updated_at = now()
FROM ranked r
WHERE ea.id = r.id
  AND r.rn > 1
  AND ea.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_edu_attendance_session_student_active
  ON public.edu_attendance (business_id, session_id, student_id)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 1.3 Salon Chair Stations Persisted Columns & Backfill
-- ----------------------------------------------------------------------------
ALTER TABLE public.salon_chair_stations
  ADD COLUMN IF NOT EXISTS current_appointment_id uuid,
  ADD COLUMN IF NOT EXISTS service_price_centimes bigint,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'waiting';

UPDATE public.salon_chair_stations
SET started_at = COALESCE(started_at, updated_at, created_at)
WHERE status <> 'Free'
  AND deleted_at IS NULL
  AND started_at IS NULL;

-- ----------------------------------------------------------------------------
-- 1.4 POS Cash Drawer Sessions, Cash Movements & Immutable Z-Reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  opened_by_staff_id uuid,
  opened_by_name text NOT NULL,
  closed_by_staff_id uuid,
  closed_by_name text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_float_centimes bigint NOT NULL DEFAULT 0 CHECK (opening_float_centimes >= 0),
  expected_cash_centimes bigint NOT NULL DEFAULT 0,
  actual_cash_centimes bigint,
  variance_centimes bigint NOT NULL DEFAULT 0,
  variance_pin_verified boolean NOT NULL DEFAULT false,
  variance_verified_by_staff_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_cash_sessions_open_branch
  ON public.pos_cash_sessions (branch_id)
  WHERE status = 'open' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_branch_opened
  ON public.pos_cash_sessions (branch_id, opened_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_pos_cash_sessions_updated_at ON public.pos_cash_sessions;
CREATE TRIGGER trg_pos_cash_sessions_updated_at
  BEFORE UPDATE ON public.pos_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pos_cash_sessions_optimistic_version ON public.pos_cash_sessions;
CREATE TRIGGER trg_pos_cash_sessions_optimistic_version
  BEFORE UPDATE ON public.pos_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();

DROP TRIGGER IF EXISTS trg_pos_cash_sessions_audit ON public.pos_cash_sessions;
CREATE TRIGGER trg_pos_cash_sessions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pos_cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.pos_cash_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_cash_sessions_tenant_isolated" ON public.pos_cash_sessions;
CREATE POLICY "pos_cash_sessions_tenant_isolated"
  ON public.pos_cash_sessions
  FOR ALL TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

CREATE TABLE IF NOT EXISTS public.pos_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  session_id uuid REFERENCES public.pos_cash_sessions(id) ON DELETE SET NULL,
  reference text NOT NULL,
  payee text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'BaridiMob')),
  direction text NOT NULL DEFAULT 'out' CHECK (direction IN ('in', 'out')),
  amount_centimes bigint NOT NULL CHECK (amount_centimes >= 0),
  paid_by text NOT NULL,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_branch_occurred
  ON public.pos_cash_movements (branch_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_pos_cash_movements_updated_at ON public.pos_cash_movements;
CREATE TRIGGER trg_pos_cash_movements_updated_at
  BEFORE UPDATE ON public.pos_cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pos_cash_movements_optimistic_version ON public.pos_cash_movements;
CREATE TRIGGER trg_pos_cash_movements_optimistic_version
  BEFORE UPDATE ON public.pos_cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();

DROP TRIGGER IF EXISTS trg_pos_cash_movements_audit ON public.pos_cash_movements;
CREATE TRIGGER trg_pos_cash_movements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pos_cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.pos_cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_cash_movements_tenant_isolated" ON public.pos_cash_movements;
CREATE POLICY "pos_cash_movements_tenant_isolated"
  ON public.pos_cash_movements
  FOR ALL TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

CREATE TABLE IF NOT EXISTS public.pos_z_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  session_id uuid REFERENCES public.pos_cash_sessions(id) ON DELETE SET NULL,
  z_number text,
  local_close_ref text NOT NULL,
  status text NOT NULL DEFAULT 'finalized' CHECK (status IN ('finalized', 'provisional_pending_sync', 'drift_flagged')),
  business_date date NOT NULL DEFAULT CURRENT_DATE,
  closed_by_staff_id uuid,
  closed_by_name text NOT NULL,
  opening_float_centimes bigint NOT NULL DEFAULT 0,
  cash_sales_centimes bigint NOT NULL DEFAULT 0,
  card_sales_centimes bigint NOT NULL DEFAULT 0,
  baridimob_sales_centimes bigint NOT NULL DEFAULT 0,
  refunds_total_centimes bigint NOT NULL DEFAULT 0,
  cash_in_centimes bigint NOT NULL DEFAULT 0,
  cash_out_centimes bigint NOT NULL DEFAULT 0,
  expected_cash_centimes bigint NOT NULL DEFAULT 0,
  actual_cash_centimes bigint NOT NULL DEFAULT 0,
  variance_centimes bigint NOT NULL DEFAULT 0,
  variance_pin_verified boolean NOT NULL DEFAULT false,
  closed_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  drift_detected boolean NOT NULL DEFAULT false,
  drift_details text,
  reprinted_count int NOT NULL DEFAULT 0 CHECK (reprinted_count >= 0),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_z_reports_number
  ON public.pos_z_reports (business_id, z_number)
  WHERE z_number IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_z_reports_local_ref
  ON public.pos_z_reports (branch_id, local_close_ref)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pos_z_reports_branch_date
  ON public.pos_z_reports (branch_id, business_date DESC, closed_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.fn_protect_immutable_pos_z_report()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reprint_only boolean;
  v_provisional_finalize boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'POS_Z_REPORT_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Z-reports are immutable fiscal closing records and cannot be deleted.';
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'POS_Z_REPORT_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Z-reports cannot be soft-deleted.';
  END IF;

  -- Immutable monetary & session fields may never change
  IF (NEW.opening_float_centimes IS DISTINCT FROM OLD.opening_float_centimes)
     OR (NEW.cash_sales_centimes IS DISTINCT FROM OLD.cash_sales_centimes)
     OR (NEW.card_sales_centimes IS DISTINCT FROM OLD.card_sales_centimes)
     OR (NEW.baridimob_sales_centimes IS DISTINCT FROM OLD.baridimob_sales_centimes)
     OR (NEW.refunds_total_centimes IS DISTINCT FROM OLD.refunds_total_centimes)
     OR (NEW.cash_in_centimes IS DISTINCT FROM OLD.cash_in_centimes)
     OR (NEW.cash_out_centimes IS DISTINCT FROM OLD.cash_out_centimes)
     OR (NEW.expected_cash_centimes IS DISTINCT FROM OLD.expected_cash_centimes)
     OR (NEW.actual_cash_centimes IS DISTINCT FROM OLD.actual_cash_centimes)
     OR (NEW.variance_centimes IS DISTINCT FROM OLD.variance_centimes)
     OR (NEW.business_date IS DISTINCT FROM OLD.business_date)
     OR (NEW.local_close_ref IS DISTINCT FROM OLD.local_close_ref)
     OR (NEW.session_id IS DISTINCT FROM OLD.session_id) THEN
    RAISE EXCEPTION 'POS_Z_REPORT_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Z-report financial figures and session bindings are immutable.';
  END IF;

  -- Allowed update 1: finalizing a provisional offline close (only when z_number was NULL)
  v_provisional_finalize :=
    OLD.status = 'provisional_pending_sync'
    AND OLD.z_number IS NULL
    AND NEW.z_number IS NOT NULL
    AND NEW.status IN ('finalized', 'drift_flagged');

  -- Allowed update 2: incrementing reprint counter cleanly without altering status/z_number
  v_reprint_only :=
    NEW.reprinted_count > OLD.reprinted_count
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.z_number IS NOT DISTINCT FROM OLD.z_number
    AND NEW.finalized_at IS NOT DISTINCT FROM OLD.finalized_at
    AND NEW.drift_detected IS NOT DISTINCT FROM OLD.drift_detected
    AND NEW.drift_details IS NOT DISTINCT FROM OLD.drift_details;

  IF NOT (v_provisional_finalize OR v_reprint_only) THEN
    RAISE EXCEPTION 'POS_Z_REPORT_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Only provisional Z-report finalization or reprint counter increments are permitted.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_z_reports_immutable ON public.pos_z_reports;
CREATE TRIGGER trg_pos_z_reports_immutable
  BEFORE UPDATE OR DELETE ON public.pos_z_reports
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_pos_z_report();

DROP TRIGGER IF EXISTS trg_pos_z_reports_updated_at ON public.pos_z_reports;
CREATE TRIGGER trg_pos_z_reports_updated_at
  BEFORE UPDATE ON public.pos_z_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pos_z_reports_optimistic_version ON public.pos_z_reports;
CREATE TRIGGER trg_pos_z_reports_optimistic_version
  BEFORE UPDATE ON public.pos_z_reports
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();

DROP TRIGGER IF EXISTS trg_pos_z_reports_audit ON public.pos_z_reports;
CREATE TRIGGER trg_pos_z_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pos_z_reports
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.pos_z_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_z_reports_tenant_isolated" ON public.pos_z_reports;
CREATE POLICY "pos_z_reports_tenant_isolated"
  ON public.pos_z_reports
  FOR ALL TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

-- ----------------------------------------------------------------------------
-- 1.5 Atomic POS Refund & Stock Restoration (+ Symmetric Undo) RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_refund_with_stock(
  p_branch_id uuid,
  p_sale_id uuid,
  p_items jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_movement_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale record;
  v_prod record;
  v_sale_item record;
  v_req jsonb;
  v_req_prod_id uuid;
  v_req_name text;
  v_req_qty numeric;
  v_sold_qty numeric;
  v_already_refunded numeric;
  v_remaining_qty numeric;
  v_mv_id uuid;
  v_mv_idx int := 0;
  v_created_mv_ids jsonb := '[]'::jsonb;
  v_skipped_services int := 0;
  v_staff_id uuid := public.get_auth_staff_id();
  v_reason_text text := COALESCE(NULLIF(trim(COALESCE(p_reason, '')), ''), 'Customer Return');
  v_total_sold numeric := 0;
  v_total_refunded_now numeric := 0;
  v_fully_refunded boolean := false;
BEGIN
  IF p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sale
  FROM public.pos_sales
  WHERE id = p_sale_id
    AND branch_id = p_branch_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SALE_NOT_FOUND');
  END IF;

  IF v_sale.status = 'Refunded' THEN
    RETURN jsonb_build_object(
      'success', true,
      'saleId', v_sale.id,
      'alreadyRefunded', true,
      'fullyRefunded', true,
      'movementIds', '[]'::jsonb
    );
  END IF;

  -- Build effective items list: explicit partial items if supplied, otherwise all sale items
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'productId', psi.product_id,
      'productName', psi.product_name,
      'quantity', psi.quantity
    )), '[]'::jsonb)
    INTO p_items
    FROM public.pos_sale_items psi
    WHERE psi.sale_id = v_sale.id AND psi.deleted_at IS NULL;
  END IF;

  FOR v_req IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_req_prod_id := NULLIF(trim(COALESCE(v_req->>'productId', '')), '')::uuid;
    v_req_name := COALESCE(v_req->>'productName', 'Item');
    v_req_qty := COALESCE((v_req->>'quantity')::numeric, 0);

    IF v_req_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Verify line quantity exists on sale & enforce sold - already_refunded cap
    SELECT COALESCE(SUM(psi.quantity), 0) INTO v_sold_qty
    FROM public.pos_sale_items psi
    WHERE psi.sale_id = v_sale.id
      AND psi.deleted_at IS NULL
      AND (
        (v_req_prod_id IS NOT NULL AND psi.product_id = v_req_prod_id)
        OR (v_req_prod_id IS NULL AND psi.product_id IS NULL AND psi.product_name = v_req_name)
      );

    IF v_sold_qty <= 0 THEN
      RAISE EXCEPTION 'REFUND_ITEM_NOT_ON_SALE' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(SUM(sm.quantity), 0) INTO v_already_refunded
    FROM public.pos_stock_movements sm
    WHERE sm.reference_id = v_sale.id
      AND sm.movement_type = 'refund'
      AND sm.deleted_at IS NULL
      AND (
        (v_req_prod_id IS NOT NULL AND sm.product_id = v_req_prod_id)
        OR (v_req_prod_id IS NULL AND sm.product_id IS NULL AND sm.product_name = v_req_name)
      );

    v_remaining_qty := GREATEST(0, v_sold_qty - v_already_refunded);
    IF v_req_qty > v_remaining_qty THEN
      RAISE EXCEPTION 'REFUND_QTY_EXCEEDS_SOLD: requested %, remaining %', v_req_qty, v_remaining_qty
        USING ERRCODE = '22023';
    END IF;

    -- Resolve optional client-supplied movement UUID for clean local/offline parity
    v_mv_id := NULL;
    IF p_movement_ids IS NOT NULL AND jsonb_typeof(p_movement_ids) = 'array' AND v_mv_idx < jsonb_array_length(p_movement_ids) THEN
      v_mv_id := NULLIF(trim(COALESCE(p_movement_ids->>v_mv_idx, '')), '')::uuid;
    END IF;
    v_mv_idx := v_mv_idx + 1;

    -- Clean skip of service/custom lines (productId NULL or deleted/non-existent product)
    IF v_req_prod_id IS NULL THEN
      v_skipped_services := v_skipped_services + 1;
      CONTINUE;
    END IF;

    SELECT * INTO v_prod
    FROM public.pos_products
    WHERE id = v_req_prod_id
      AND branch_id = p_branch_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      v_skipped_services := v_skipped_services + 1;
      CONTINUE;
    END IF;

    v_mv_id := COALESCE(v_mv_id, gen_random_uuid());

    UPDATE public.pos_products
    SET stock_quantity = COALESCE(stock_quantity, 0) + v_req_qty,
        updated_at = now(),
        updated_by_staff_id = v_staff_id
    WHERE id = v_prod.id;

    INSERT INTO public.pos_stock_movements (
      id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
      product_id, product_name, movement_type, quantity,
      previous_stock, new_stock, reason, reference_id
    ) VALUES (
      v_mv_id, v_sale.account_id, v_sale.business_id, p_branch_id, v_staff_id, v_staff_id, p_device_id,
      v_prod.id, v_prod.name, 'refund', v_req_qty,
      v_prod.stock_quantity, v_prod.stock_quantity + v_req_qty,
      'Refund #' || upper(right(v_sale.id::text, 6)) || ': ' || v_reason_text,
      v_sale.id
    )
    ON CONFLICT (id) DO NOTHING;

    v_created_mv_ids := v_created_mv_ids || to_jsonb(v_mv_id);
  END LOOP;

  -- Check if all tracked lines are now refunded OR a full refund with 0 items / all services
  SELECT COALESCE(SUM(psi.quantity), 0) INTO v_total_sold
  FROM public.pos_sale_items psi
  WHERE psi.sale_id = v_sale.id AND psi.deleted_at IS NULL;

  SELECT COALESCE(SUM(sm.quantity), 0) INTO v_total_refunded_now
  FROM public.pos_stock_movements sm
  WHERE sm.reference_id = v_sale.id AND sm.movement_type = 'refund' AND sm.deleted_at IS NULL;

  v_fully_refunded := (v_total_sold <= v_total_refunded_now + v_skipped_services)
    OR (
      SELECT count(*) = 0
      FROM public.pos_sale_items psi
      WHERE psi.sale_id = v_sale.id
        AND psi.deleted_at IS NULL
        AND psi.product_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.pos_products p
          WHERE p.id = psi.product_id AND p.branch_id = p_branch_id AND p.deleted_at IS NULL
        )
        AND psi.quantity > COALESCE((
          SELECT SUM(sm2.quantity) FROM public.pos_stock_movements sm2
          WHERE sm2.reference_id = v_sale.id
            AND sm2.product_id = psi.product_id
            AND sm2.movement_type = 'refund'
            AND sm2.deleted_at IS NULL
        ), 0)
    );

  UPDATE public.pos_sales
  SET status = CASE WHEN v_fully_refunded THEN 'Refunded' ELSE v_sale.status END,
      notes = CASE
        WHEN v_fully_refunded THEN 'Refund: ' || v_reason_text
        ELSE COALESCE(v_sale.notes || ' | ', '') || 'Partial Refund: ' || v_reason_text
      END,
      updated_at = now(),
      updated_by_staff_id = v_staff_id
  WHERE id = v_sale.id;

  RETURN jsonb_build_object(
    'success', true,
    'saleId', v_sale.id,
    'fullyRefunded', v_fully_refunded,
    'skippedServices', v_skipped_services,
    'movementIds', v_created_mv_ids
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_undo_refund_with_stock(
  p_branch_id uuid,
  p_sale_id uuid,
  p_movement_ids jsonb DEFAULT '[]'::jsonb,
  p_prev_status text DEFAULT 'Completed',
  p_prev_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale record;
  v_mv record;
  v_prod record;
  v_mv_id_text text;
  v_staff_id uuid := public.get_auth_staff_id();
  v_reversed_count int := 0;
BEGIN
  IF p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sale
  FROM public.pos_sales
  WHERE id = p_sale_id AND branch_id = p_branch_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SALE_NOT_FOUND');
  END IF;

  IF p_movement_ids IS NOT NULL AND jsonb_typeof(p_movement_ids) = 'array' AND jsonb_array_length(p_movement_ids) > 0 THEN
    FOR v_mv_id_text IN SELECT jsonb_array_elements_text(p_movement_ids) LOOP
      SELECT * INTO v_mv
      FROM public.pos_stock_movements
      WHERE id = NULLIF(trim(v_mv_id_text), '')::uuid
        AND branch_id = p_branch_id
        AND reference_id = v_sale.id
        AND movement_type = 'refund'
        AND deleted_at IS NULL
      FOR UPDATE;

      IF FOUND THEN
        IF v_mv.product_id IS NOT NULL THEN
          SELECT * INTO v_prod
          FROM public.pos_products
          WHERE id = v_mv.product_id AND branch_id = p_branch_id AND deleted_at IS NULL
          FOR UPDATE;
          IF FOUND THEN
            UPDATE public.pos_products
            SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_mv.quantity),
                updated_at = now(),
                updated_by_staff_id = v_staff_id
            WHERE id = v_prod.id;
          END IF;
        END IF;

        UPDATE public.pos_stock_movements
        SET deleted_at = now(),
            updated_at = now(),
            updated_by_staff_id = v_staff_id
        WHERE id = v_mv.id;

        v_reversed_count := v_reversed_count + 1;
      END IF;
    END LOOP;
  ELSE
    FOR v_mv IN
      SELECT * FROM public.pos_stock_movements
      WHERE reference_id = v_sale.id
        AND branch_id = p_branch_id
        AND movement_type = 'refund'
        AND deleted_at IS NULL
      FOR UPDATE
    LOOP
      IF v_mv.product_id IS NOT NULL THEN
        SELECT * INTO v_prod
        FROM public.pos_products
        WHERE id = v_mv.product_id AND branch_id = p_branch_id AND deleted_at IS NULL
        FOR UPDATE;
        IF FOUND THEN
          UPDATE public.pos_products
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_mv.quantity),
              updated_at = now(),
              updated_by_staff_id = v_staff_id
          WHERE id = v_prod.id;
        END IF;
      END IF;

      UPDATE public.pos_stock_movements
      SET deleted_at = now(),
          updated_at = now(),
          updated_by_staff_id = v_staff_id
      WHERE id = v_mv.id;

      v_reversed_count := v_reversed_count + 1;
    END LOOP;
  END IF;

  UPDATE public.pos_sales
  SET status = COALESCE(NULLIF(trim(COALESCE(p_prev_status, '')), ''), 'Completed'),
      notes = p_prev_notes,
      updated_at = now(),
      updated_by_staff_id = v_staff_id
  WHERE id = v_sale.id;

  RETURN jsonb_build_object(
    'success', true,
    'saleId', v_sale.id,
    'reversedMovements', v_reversed_count
  );
END;
$$;
