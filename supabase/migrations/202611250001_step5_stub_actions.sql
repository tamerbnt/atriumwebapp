-- ============================================================================
-- Atrium Step 5 Migration: Persisted Tables, Locks, Sequence Columns & NCR RPC
-- Items: 3.4 (gym_class_enrollments), 3.5 (gym_schedule_events coach confirm),
--        3.9 (rental_security_deposits sequential receipt + printed_count),
--        3.10 (re_inspections validation & immutability lock trigger),
--        3.12 (mfg_ncr_records + mfg_scrap_with_ncr atomic RPC, CMUP held)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Gym Class Enrollments (3.4) & Schedule Coach Confirmation (3.5)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  event_id uuid NOT NULL REFERENCES public.gym_schedule_events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'waitlisted', 'cancelled')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gym_class_enrollments_active
  ON public.gym_class_enrollments (branch_id, event_id, member_id)
  WHERE deleted_at IS NULL AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_gym_class_enrollments_event
  ON public.gym_class_enrollments (branch_id, event_id, enrolled_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_gym_class_enrollments_updated_at ON public.gym_class_enrollments;
CREATE TRIGGER trg_gym_class_enrollments_updated_at
  BEFORE UPDATE ON public.gym_class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gym_class_enrollments_optimistic_version ON public.gym_class_enrollments;
CREATE TRIGGER trg_gym_class_enrollments_optimistic_version
  BEFORE UPDATE ON public.gym_class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();

DROP TRIGGER IF EXISTS trg_gym_class_enrollments_audit ON public.gym_class_enrollments;
CREATE TRIGGER trg_gym_class_enrollments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.gym_class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.gym_class_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gym_class_enrollments_tenant_isolated" ON public.gym_class_enrollments;
CREATE POLICY "gym_class_enrollments_tenant_isolated"
  ON public.gym_class_enrollments
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

ALTER TABLE public.gym_schedule_events
  ADD COLUMN IF NOT EXISTS coach_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS coach_confirmed_by uuid;

-- ----------------------------------------------------------------------------
-- 2. Rental Security Deposits Receipt Number & Reprint Counter (3.9)
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_security_deposits
  ADD COLUMN IF NOT EXISTS deposit_receipt_number text,
  ADD COLUMN IF NOT EXISTS printed_count int NOT NULL DEFAULT 0 CHECK (printed_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_security_deposits_receipt_number
  ON public.rental_security_deposits (business_id, deposit_receipt_number)
  WHERE deleted_at IS NULL AND deposit_receipt_number IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Real Estate Inspections Validation & Lock Immutability (3.10)
-- ----------------------------------------------------------------------------
ALTER TABLE public.re_inspections
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_prevent_locked_re_inspection_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked IS TRUE THEN
      RAISE EXCEPTION 'RE_INSPECTION_LOCKED_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Validated real-estate inspection reports are legally immutable and cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_locked IS TRUE THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      RAISE EXCEPTION 'RE_INSPECTION_LOCKED_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Validated real-estate inspection reports cannot be soft-deleted.';
    END IF;

    IF (NEW.property_title IS DISTINCT FROM OLD.property_title)
       OR (NEW.inspection_type IS DISTINCT FROM OLD.inspection_type)
       OR (NEW.inspection_date IS DISTINCT FROM OLD.inspection_date)
       OR (NEW.inspector_name IS DISTINCT FROM OLD.inspector_name)
       OR (NEW.checklist IS DISTINCT FROM OLD.checklist)
       OR (NEW.overall_condition IS DISTINCT FROM OLD.overall_condition)
       OR (NEW.notes IS DISTINCT FROM OLD.notes)
       OR (NEW.is_locked IS DISTINCT FROM OLD.is_locked)
       OR (NEW.validated_at IS DISTINCT FROM OLD.validated_at)
       OR (NEW.validated_by IS DISTINCT FROM OLD.validated_by) THEN
      RAISE EXCEPTION 'RE_INSPECTION_LOCKED_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Validated real-estate inspection reports cannot be modified or unlocked once validated.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_re_inspections_immutable_lock ON public.re_inspections;
CREATE TRIGGER trg_re_inspections_immutable_lock
  BEFORE UPDATE OR DELETE ON public.re_inspections
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_locked_re_inspection_mutation();

-- ----------------------------------------------------------------------------
-- 4. Manufacturing Non-Conformance Report (NCR) Table & Scrap RPC (3.12)
--    Gate 1 Condition #2: Stock/WIP/CMUP accounting adjustments are HELD.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mfg_ncr_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  ncr_number text NOT NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  qc_inspection_id uuid REFERENCES public.mfg_qc_inspections(id) ON DELETE SET NULL,
  of_number text NOT NULL,
  lot_number text,
  product_name text NOT NULL,
  scrapped_quantity numeric(14, 3) NOT NULL CHECK (scrapped_quantity > 0),
  reason text NOT NULL,
  disposition text NOT NULL DEFAULT 'Scrapped' CHECK (disposition IN ('Scrapped', 'Quarantined', 'Rework')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Reviewed', 'Closed')),
  cmup_adjustment_held boolean NOT NULL DEFAULT true CHECK (cmup_adjustment_held = true),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfg_ncr_records_number
  ON public.mfg_ncr_records (business_id, ncr_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mfg_ncr_records_branch_created
  ON public.mfg_ncr_records (branch_id, created_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_mfg_ncr_records_updated_at ON public.mfg_ncr_records;
CREATE TRIGGER trg_mfg_ncr_records_updated_at
  BEFORE UPDATE ON public.mfg_ncr_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mfg_ncr_records_optimistic_version ON public.mfg_ncr_records;
CREATE TRIGGER trg_mfg_ncr_records_optimistic_version
  BEFORE UPDATE ON public.mfg_ncr_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();

DROP TRIGGER IF EXISTS trg_mfg_ncr_records_audit ON public.mfg_ncr_records;
CREATE TRIGGER trg_mfg_ncr_records_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.mfg_ncr_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.mfg_ncr_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mfg_ncr_records_tenant_isolated" ON public.mfg_ncr_records;
CREATE POLICY "mfg_ncr_records_tenant_isolated"
  ON public.mfg_ncr_records
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

CREATE OR REPLACE FUNCTION public.mfg_scrap_with_ncr(
  p_business_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_of_number text,
  p_lot_number text,
  p_product_name text,
  p_inspector_name text,
  p_scrapped_quantity numeric,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_qc_id uuid DEFAULT NULL,
  p_ncr_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_qc_id uuid := COALESCE(p_qc_id, gen_random_uuid());
  v_ncr_id uuid := COALESCE(p_ncr_id, gen_random_uuid());
  v_ncr_number text;
  v_seq int;
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF p_business_id IS NULL OR p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'BRANCH_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.account_id = v_account_id
      AND b.deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.branches br
    WHERE br.id = p_branch_id
      AND br.business_id = p_business_id
      AND br.account_id = v_account_id
      AND br.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TENANT_SCOPE_MISMATCH' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(p_scrapped_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'INVALID_SCRAP_QUANTITY' USING ERRCODE = '22023';
  END IF;

  -- Serialize NCR numbering per business safely
  PERFORM pg_advisory_xact_lock(hashtext('mfg_ncr:' || p_business_id::text));

  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
  FROM public.mfg_ncr_records
  WHERE business_id = p_business_id AND deleted_at IS NULL;

  v_ncr_number := 'NCR-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.mfg_qc_inspections (
    id, account_id, business_id, branch_id, staff_id,
    order_id, of_number, inspector_name, sample_size, defects_found,
    result, checklist, notes, inspected_at
  )
  VALUES (
    v_qc_id, v_account_id, p_business_id, p_branch_id, v_staff_id,
    p_order_id, COALESCE(NULLIF(trim(p_of_number), ''), 'OF-NCR'),
    COALESCE(NULLIF(trim(p_inspector_name), ''), 'QC'),
    GREATEST(1, CEIL(p_scrapped_quantity)::int),
    GREATEST(1, CEIL(p_scrapped_quantity)::int),
    'Fail',
    '[]'::jsonb,
    p_notes,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.mfg_ncr_records (
    id, account_id, business_id, branch_id, staff_id,
    ncr_number, order_id, qc_inspection_id, of_number, lot_number,
    product_name, scrapped_quantity, reason, disposition, status,
    cmup_adjustment_held, notes
  )
  VALUES (
    v_ncr_id, v_account_id, p_business_id, p_branch_id, v_staff_id,
    v_ncr_number, p_order_id, v_qc_id,
    COALESCE(NULLIF(trim(p_of_number), ''), 'OF-NCR'),
    NULLIF(trim(COALESCE(p_lot_number, '')), ''),
    COALESCE(NULLIF(trim(p_product_name), ''), 'Produit'),
    p_scrapped_quantity,
    COALESCE(NULLIF(trim(p_reason), ''), 'Rebut qualité'),
    'Scrapped',
    'Open',
    true,
    p_notes
  );

  -- NOTE: Intentionally NO stock/WIP/CMUP deduction per Gate 1 Condition #2.
  RETURN jsonb_build_object(
    'success', true,
    'qc_inspection_id', v_qc_id,
    'ncr_id', v_ncr_id,
    'ncr_number', v_ncr_number,
    'cmup_adjustment_held', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mfg_scrap_with_ncr(uuid, uuid, uuid, text, text, text, text, numeric, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfg_scrap_with_ncr(uuid, uuid, uuid, text, text, text, text, numeric, text, text, uuid, uuid) TO authenticated;
