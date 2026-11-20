-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 6: BUSINESS CONFIGS & CATEGORY FORMULES ENGINE
-- Covers:
--   1. public.business_configs (per-business fiscal, TVA, onboarding & category settings)
--   2. public.category_formules (relational formules/tariffs/packs across verticals)
--   3. Optimistic Concurrency, Traceability, Audit & Tenant-Isolated RBAC RLS
--   4. Atomic RPCs (upsert_business_config, update_business_identity)
--   5. Realtime Publication Registration
-- Target: Supabase PostgreSQL 15+ (Supavisor Port 6543 Transaction Mode safe)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. public.business_configs (Per-Business Configuration & Onboarding Context)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (
    category IN (
      'membership_session',
      'appointment_service',
      'pos_inventory',
      'project_milestone',
      'rental_booking',
      'education_cohort',
      'freelance_solo',
      'trading_commercial',
      'medical_clinic',
      'auto_garage',
      'real_estate',
      'manufacturing_production',
      'legal_accounting',
      'logistics_delivery',
      'construction_contractor',
      'agriculture_farming'
    )
  ),
  currency text NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR', 'USD')),
  default_tva_rate numeric(5,2) NOT NULL DEFAULT 19.00 CHECK (default_tva_rate >= 0 AND default_tva_rate <= 100),
  apply_timbre_fiscal boolean NOT NULL DEFAULT true,
  fiscal_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarding_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  setup_state jsonb NOT NULL DEFAULT '{"dismissed":false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_configs_business_active
  ON public.business_configs (business_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_configs_account_updated
  ON public.business_configs (account_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. public.category_formules (Sellable Formules, Packs, Tariffs & Rate Sheets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category_formules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (
    category IN (
      'membership_session',
      'appointment_service',
      'pos_inventory',
      'project_milestone',
      'rental_booking',
      'education_cohort',
      'freelance_solo',
      'trading_commercial',
      'medical_clinic',
      'auto_garage',
      'real_estate',
      'manufacturing_production',
      'legal_accounting',
      'logistics_delivery',
      'construction_contractor',
      'agriculture_farming'
    )
  ),
  formule_type text NOT NULL,
  code text,
  name text NOT NULL,
  description text,
  price_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  rate_percent numeric(6,2) NOT NULL DEFAULT 0 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  duration_value integer NOT NULL DEFAULT 0 CHECK (duration_value >= 0),
  duration_unit text NOT NULL DEFAULT 'days' CHECK (duration_unit IN ('minutes', 'hours', 'days', 'months', 'sessions', 'unit')),
  currency text NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR', 'USD')),
  tax_rate numeric(5,2) NOT NULL DEFAULT 19.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_formules_biz_cat_code_active
  ON public.category_formules (business_id, category, code)
  WHERE deleted_at IS NULL AND code IS NOT NULL AND trim(code) <> '';

CREATE INDEX IF NOT EXISTS idx_category_formules_biz_cat_updated
  ON public.category_formules (business_id, category, sort_order ASC, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_category_formules_branch_updated
  ON public.category_formules (branch_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 3. Traceability, Optimistic Locking, Audit Triggers & Hardened RLS
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['business_configs', 'category_formules']
  LOOP
    -- Note: Traceability envelope resolves business_id/account_id when branch_id is supplied
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_trace ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_trace BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_traceability_envelope();',
      tbl, tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_optimistic_version ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_optimistic_version BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();',
      tbl, tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
      tbl, tbl
    );

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%I_tenant_read" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_tenant_read" ON public.%I FOR SELECT TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND deleted_at IS NULL AND (branch_id IS NULL OR public.can_access_branch(branch_id)));',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_admin_insert" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND (SELECT public.is_tenant_admin()));',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_admin_update" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_admin_update" ON public.%I FOR UPDATE TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND deleted_at IS NULL AND (SELECT public.is_tenant_admin())) WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND (SELECT public.is_tenant_admin()));',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_admin_delete" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_admin_delete" ON public.%I FOR DELETE TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND (SELECT public.is_tenant_admin()));',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Atomic Tenant Configuration RPCs (Transaction-Mode Safe)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_business_config(
  p_business_id uuid,
  p_branch_id uuid DEFAULT NULL,
  p_category text DEFAULT 'membership_session',
  p_currency text DEFAULT 'DZD',
  p_default_tva_rate numeric DEFAULT 19.00,
  p_apply_timbre_fiscal boolean DEFAULT true,
  p_fiscal_ids jsonb DEFAULT '{}'::jsonb,
  p_onboarding_context jsonb DEFAULT '{}'::jsonb,
  p_category_settings jsonb DEFAULT '{}'::jsonb,
  p_setup_state jsonb DEFAULT '{"dismissed":false}'::jsonb,
  p_expected_version bigint DEFAULT NULL,
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_existing record;
  v_saved record;
BEGIN
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF NOT public.is_tenant_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ADMIN_ONLY');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.account_id = v_account_id
      AND b.is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BUSINESS_NOT_FOUND');
  END IF;

  SELECT id, version INTO v_existing
  FROM public.business_configs
  WHERE business_id = p_business_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_version IS NOT NULL AND p_expected_version < v_existing.version THEN
      RAISE EXCEPTION 'CONFLICT_STALE_VERSION: expected version %, current version %', p_expected_version, v_existing.version
        USING ERRCODE = '40001',
              DETAIL = jsonb_build_object(
                'table', 'business_configs',
                'id', v_existing.id,
                'expected_version', p_expected_version,
                'current_version', v_existing.version
              )::text;
    END IF;

    UPDATE public.business_configs
    SET branch_id = COALESCE(p_branch_id, branch_id),
        category = COALESCE(p_category, category),
        currency = COALESCE(p_currency, currency),
        default_tva_rate = COALESCE(p_default_tva_rate, default_tva_rate),
        apply_timbre_fiscal = COALESCE(p_apply_timbre_fiscal, apply_timbre_fiscal),
        fiscal_ids = COALESCE(p_fiscal_ids, fiscal_ids),
        onboarding_context = COALESCE(p_onboarding_context, onboarding_context),
        category_settings = COALESCE(p_category_settings, category_settings),
        setup_state = COALESCE(p_setup_state, setup_state),
        device_id = COALESCE(p_device_id, device_id),
        updated_by_staff_id = public.get_auth_staff_id(),
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_saved;
  ELSE
    INSERT INTO public.business_configs (
      account_id, business_id, branch_id, category, currency,
      default_tva_rate, apply_timbre_fiscal, fiscal_ids,
      onboarding_context, category_settings, setup_state,
      device_id, staff_id
    ) VALUES (
      v_account_id, p_business_id, p_branch_id, p_category, COALESCE(p_currency, 'DZD'),
      COALESCE(p_default_tva_rate, 19.00), COALESCE(p_apply_timbre_fiscal, true), COALESCE(p_fiscal_ids, '{}'::jsonb),
      COALESCE(p_onboarding_context, '{}'::jsonb), COALESCE(p_category_settings, '{}'::jsonb), COALESCE(p_setup_state, '{"dismissed":false}'::jsonb),
      p_device_id, public.get_auth_staff_id()
    )
    RETURNING * INTO v_saved;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_saved.id,
    'business_id', v_saved.business_id,
    'version', v_saved.version,
    'updated_at', v_saved.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_identity(
  p_business_id uuid,
  p_name text,
  p_display_name text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_updated record;
BEGIN
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF NOT public.is_tenant_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ADMIN_ONLY');
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'BUSINESS_NAME_REQUIRED');
  END IF;

  UPDATE public.businesses
  SET name = trim(p_name),
      display_name = COALESCE(NULLIF(trim(p_display_name), ''), trim(p_name)),
      address = COALESCE(NULLIF(trim(p_address), ''), address),
      phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
      updated_at = now()
  WHERE id = p_business_id
    AND account_id = v_account_id
    AND is_active = true
  RETURNING id, name, display_name, address, phone, version, updated_at INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BUSINESS_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'business', to_jsonb(v_updated)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_business_config(uuid, uuid, text, text, numeric, boolean, jsonb, jsonb, jsonb, jsonb, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_business_config(uuid, uuid, text, text, numeric, boolean, jsonb, jsonb, jsonb, jsonb, bigint, text) TO authenticated;

REVOKE ALL ON FUNCTION public.update_business_identity(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_business_identity(uuid, text, text, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Publish Tables to Supabase Realtime Safely
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rt_tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH rt_tbl IN ARRAY ARRAY['business_configs', 'category_formules']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = rt_tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rt_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
