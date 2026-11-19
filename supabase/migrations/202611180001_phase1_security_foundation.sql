-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 1: SECURITY FOUNDATION, WORKFORCE ERP & AUDIT
-- Target: Supabase PostgreSQL 15+ (Supavisor Port 6543 Transaction Mode safe)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Enforce 16 Canonical Business Categories on public.businesses
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'businesses_category_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses DROP CONSTRAINT businesses_category_check;
  END IF;
END $$;

UPDATE public.businesses
SET category = CASE
  WHEN category IN (
    'membership_session', 'appointment_service', 'pos_inventory',
    'project_milestone', 'rental_booking', 'education_cohort',
    'freelance_solo', 'trading_commercial', 'medical_clinic',
    'auto_garage', 'real_estate', 'manufacturing_production',
    'legal_accounting', 'logistics_delivery', 'construction_contractor',
    'agriculture_farming'
  ) THEN category
  WHEN lower(coalesce(category, '')) IN ('gym', 'fitness', 'club') THEN 'membership_session'
  WHEN lower(coalesce(category, '')) IN ('salon', 'spa', 'barber', 'aesthetics') THEN 'appointment_service'
  WHEN lower(coalesce(category, '')) IN ('pos', 'retail', 'restaurant', 'cafe') THEN 'pos_inventory'
  WHEN lower(coalesce(category, '')) IN ('project', 'agency', 'pm') THEN 'project_milestone'
  WHEN lower(coalesce(category, '')) IN ('rental', 'venue', 'coworking') THEN 'rental_booking'
  WHEN lower(coalesce(category, '')) IN ('education', 'academy', 'school') THEN 'education_cohort'
  WHEN lower(coalesce(category, '')) IN ('freelance', 'solo') THEN 'freelance_solo'
  ELSE 'pos_inventory'
END
WHERE category IS NULL OR category NOT IN (
  'membership_session', 'appointment_service', 'pos_inventory',
  'project_milestone', 'rental_booking', 'education_cohort',
  'freelance_solo', 'trading_commercial', 'medical_clinic',
  'auto_garage', 'real_estate', 'manufacturing_production',
  'legal_accounting', 'logistics_delivery', 'construction_contractor',
  'agriculture_farming'
);

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_category_check CHECK (
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
  );

-- ----------------------------------------------------------------------------
-- 2. Pre-Function Schema Alignment & InitPlan-Optimized Security Helpers
-- ----------------------------------------------------------------------------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id
  ON public.staff (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'role' AND udt_name = 'staff_role_enum'
  ) THEN
    ALTER TABLE public.staff ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.staff ALTER COLUMN role TYPE text USING role::text;
    ALTER TABLE public.staff ALTER COLUMN role SET DEFAULT 'staff';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role_enum') THEN
    DROP TYPE staff_role_enum;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  updated_by_staff_id uuid,
  device_id text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (staff_id, branch_id)
);

-- Reconcile pre-existing staff_branch_assignments table on live DBs
ALTER TABLE public.staff_branch_assignments
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.staff_branch_assignments sba
SET account_id = COALESCE(sba.account_id, b.account_id),
    business_id = COALESCE(sba.business_id, b.business_id),
    created_at = COALESCE(sba.created_at, now())
FROM public.branches b
WHERE b.id = sba.branch_id
  AND (sba.account_id IS NULL OR sba.business_id IS NULL);

CREATE OR REPLACE FUNCTION public.get_auth_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT a.id FROM public.accounts a WHERE a.id = auth.uid() AND a.is_active = true LIMIT 1),
    (SELECT s.account_id FROM public.staff s WHERE s.auth_user_id = auth.uid() AND s.is_active = true AND s.deleted_at IS NULL LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.id
  FROM public.staff s
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active = true
    AND s.deleted_at IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p_branch_id IS NOT NULL AND (
      -- Account Owner has access to all active branches in their account
      EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = p_branch_id
          AND b.account_id = auth.uid()
          AND b.is_active = true
      )
      OR
      -- Owner-role staff member in the branch's account
      EXISTS (
        SELECT 1
        FROM public.staff s
        JOIN public.branches b ON b.account_id = s.account_id
        WHERE b.id = p_branch_id
          AND s.auth_user_id = auth.uid()
          AND s.is_active = true
          AND s.deleted_at IS NULL
          AND (
            s.role IN ('owner', 'agency_director')
            OR s.branch_id = p_branch_id
            OR EXISTS (
              SELECT 1 FROM public.staff_branch_assignments sba
              WHERE sba.staff_id = s.id AND sba.branch_id = p_branch_id AND sba.deleted_at IS NULL
            )
          )
      )
    );
$$;

-- ----------------------------------------------------------------------------
-- 3. Immutable Audit Trail & Automatic Traceability Envelope Triggers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.immutable_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid,
  branch_id uuid,
  actor_auth_id uuid,
  actor_staff_id uuid,
  device_id text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'SOFT_DELETE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_logs_account_time
  ON public.immutable_audit_logs (account_id, branch_id, occurred_at DESC);

ALTER TABLE public.immutable_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_tenant_read" ON public.immutable_audit_logs;
CREATE POLICY "audit_logs_tenant_read"
  ON public.immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (branch_id IS NULL OR public.can_access_branch(branch_id))
  );

-- Prevent client tampering on immutable audit trail
REVOKE UPDATE, DELETE, TRUNCATE ON public.immutable_audit_logs FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.fn_enforce_traceability_envelope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_account_id  uuid;
  v_staff_id    uuid;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    SELECT b.business_id, b.account_id
      INTO v_business_id, v_account_id
    FROM public.branches b
    WHERE b.id = NEW.branch_id
    LIMIT 1;

    IF v_business_id IS NOT NULL THEN
      NEW.business_id := COALESCE(NEW.business_id, v_business_id);
    END IF;
    IF v_account_id IS NOT NULL THEN
      NEW.account_id := COALESCE(NEW.account_id, v_account_id);
    END IF;
  END IF;

  NEW.account_id := COALESCE(NEW.account_id, public.get_auth_account_id());
  v_staff_id := public.get_auth_staff_id();

  IF TG_OP = 'INSERT' THEN
    NEW.staff_id := COALESCE(NEW.staff_id, v_staff_id);
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
  ELSE
    NEW.updated_by_staff_id := COALESCE(NEW.updated_by_staff_id, v_staff_id, NEW.staff_id);
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row jsonb;
  v_old jsonb;
  v_action text;
  v_acc_id uuid;
  v_biz_id uuid;
  v_br_id uuid;
  v_rec_id uuid;
  v_dev_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    v_old := NULL;
    v_action := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    v_row := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    IF (v_old->>'deleted_at') IS NULL AND (v_row->>'deleted_at') IS NOT NULL THEN
      v_action := 'SOFT_DELETE';
    ELSE
      v_action := 'UPDATE';
    END IF;
  ELSE
    v_row := NULL;
    v_old := to_jsonb(OLD);
    v_action := 'DELETE';
  END IF;

  v_acc_id := COALESCE(
    NULLIF(COALESCE(v_row, v_old)->>'account_id', '')::uuid,
    public.get_auth_account_id()
  );
  IF v_acc_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    v_biz_id := NULLIF(COALESCE(v_row, v_old)->>'business_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_biz_id := NULL;
  END;

  BEGIN
    v_br_id := NULLIF(COALESCE(v_row, v_old)->>'branch_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_br_id := NULL;
  END;

  BEGIN
    v_rec_id := NULLIF(COALESCE(v_row, v_old)->>'id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_rec_id := NULL;
  END;

  v_dev_id := COALESCE(v_row, v_old)->>'device_id';

  INSERT INTO public.immutable_audit_logs (
    account_id, business_id, branch_id,
    actor_auth_id, actor_staff_id, device_id,
    table_name, record_id, action, old_data, new_data
  ) VALUES (
    v_acc_id, v_biz_id, v_br_id,
    auth.uid(), public.get_auth_staff_id(), v_dev_id,
    TG_TABLE_NAME, v_rec_id, v_action, v_old, v_row
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Drop Broken & Permissive RLS Policies Across All Live Tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname LIKE 'Allow all access to %'
        OR policyname = 'authenticated_tenant_access'
        OR policyname = 'sba_tenant_all'
        OR (tablename LIKE 'edu_%' AND policyname LIKE 'Tenant isolation for %')
        OR (qual = 'true' AND tablename NOT IN ('modules', 'subscription_plans', 'facility_templates'))
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Staff PIN Hashing (Bcrypt), Soft Delete & Traceability Hardening
-- ----------------------------------------------------------------------------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS salary numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_day int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ccp_number text,
  ADD COLUMN IF NOT EXISTS ccp_key text,
  ADD COLUMN IF NOT EXISTS bank_rib text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS card_id text,
  ADD COLUMN IF NOT EXISTS badge_token text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'pin'
  ) THEN
    UPDATE public.staff
    SET pin_hash = crypt(pin, gen_salt('bf'))
    WHERE pin IS NOT NULL AND trim(pin) <> '' AND pin_hash IS NULL;

    ALTER TABLE public.staff DROP COLUMN IF EXISTS pin;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_branch_id uuid,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_staff record;
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  SELECT s.id, s.full_name, s.email, s.role, s.business_id, s.branch_id
  INTO v_staff
  FROM public.staff s
  WHERE s.account_id = v_account_id
    AND s.is_active = true
    AND s.deleted_at IS NULL
    AND s.pin_hash IS NOT NULL
    AND s.pin_hash = crypt(p_pin, s.pin_hash)
    AND (
      s.role IN ('owner', 'agency_director')
      OR s.branch_id = p_branch_id
      OR EXISTS (
        SELECT 1 FROM public.staff_branch_assignments sba
        WHERE sba.staff_id = s.id AND sba.branch_id = p_branch_id AND sba.deleted_at IS NULL
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'full_name', v_staff.full_name,
      'email', v_staff.email,
      'role', v_staff.role,
      'business_id', v_staff.business_id,
      'branch_id', COALESCE(v_staff.branch_id, p_branch_id)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_pin(
  p_staff_id uuid,
  p_new_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  UPDATE public.staff
  SET pin_hash = crypt(p_new_pin, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_staff_id
    AND account_id = v_account_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'STAFF_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_audit ON public.staff;
CREATE TRIGGER trg_staff_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
DROP POLICY IF EXISTS "staff_tenant_all" ON public.staff;
CREATE POLICY "staff_tenant_isolated"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      auth_user_id = auth.uid()
      OR account_id = (SELECT public.get_auth_account_id())
    )
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
  );

-- ----------------------------------------------------------------------------
-- 6. Devices Soft Delete, Duplicate Trigger Removal & Function Hygiene
-- ----------------------------------------------------------------------------
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS staff_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_devices_active_partial
  ON public.devices (account_id, branch_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devices_tenant_all" ON public.devices;
CREATE POLICY "devices_tenant_isolated"
  ON public.devices
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

DO $$
BEGIN
  IF to_regclass('public.dashboard_snapshots') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_dash_resolve_hierarchy ON public.dashboard_snapshots;
  END IF;
END $$;

-- Drop stale template-based overload of create_business
DROP FUNCTION IF EXISTS public.create_business(uuid, text, uuid, text, text);

-- Ensure 1:1 unique index on account_subscriptions(account_id) for safe upsert
DELETE FROM public.account_subscriptions a
USING public.account_subscriptions b
WHERE a.account_id = b.account_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_subscriptions_account_id_unique
  ON public.account_subscriptions (account_id);

-- Harden Core Account/Business/Branch/Subscription RLS with InitPlan
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_self_access" ON public.accounts;
CREATE POLICY "accounts_self_access"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING (id = (SELECT public.get_auth_account_id()))
  WITH CHECK (id = auth.uid());

ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_subscriptions_self_read" ON public.account_subscriptions;
CREATE POLICY "account_subscriptions_self_read"
  ON public.account_subscriptions
  FOR SELECT
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()));

ALTER TABLE public.license_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "license_vouchers_no_direct_access" ON public.license_vouchers;
CREATE POLICY "license_vouchers_no_direct_access"
  ON public.license_vouchers
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "businesses_tenant_all" ON public.businesses;
DROP POLICY IF EXISTS "businesses_tenant_isolated" ON public.businesses;
CREATE POLICY "businesses_tenant_isolated"
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()) AND is_active = true)
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_tenant_all" ON public.branches;
DROP POLICY IF EXISTS "branches_tenant_isolated" ON public.branches;
CREATE POLICY "branches_tenant_isolated"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()) AND is_active = true)
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 7. Remove Hardcoded Admin Secret & Harden Core Tenant RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_activate_account(
  p_email text,
  p_tier_rank integer,
  p_admin_secret text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret text := NULLIF(current_setting('app.admin_secret', true), '');
  v_caller_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_account_id uuid;
  v_plan record;
  v_now timestamptz := now();
BEGIN
  IF v_caller_role <> 'service_role' AND (
    v_expected_secret IS NULL OR p_admin_secret IS DISTINCT FROM v_expected_secret
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_ADMIN_OPERATION');
  END IF;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_NOT_FOUND');
  END IF;

  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE tier_rank = p_tier_rank
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TIER_RANK');
  END IF;

  INSERT INTO public.account_subscriptions (
    account_id, plan_id, status, is_lifetime, trial_ends_at, created_at, updated_at
  ) VALUES (
    v_account_id, v_plan.id, 'active', true, NULL, v_now, v_now
  )
  ON CONFLICT (account_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        is_lifetime = true,
        trial_ends_at = NULL,
        updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'plan_name', v_plan.name,
    'tier_rank', p_tier_rank
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_license_vouchers(
  p_tier_rank integer,
  p_count integer DEFAULT 1,
  p_admin_secret text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_secret text := NULLIF(current_setting('app.admin_secret', true), '');
  v_caller_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_plan record;
  v_plan_code text;
  v_code text;
  v_codes text[] := '{}';
  i integer;
BEGIN
  IF v_caller_role <> 'service_role' AND (
    v_expected_secret IS NULL OR p_admin_secret IS DISTINCT FROM v_expected_secret
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_ADMIN_OPERATION');
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE tier_rank = p_tier_rank LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TIER_RANK');
  END IF;

  v_plan_code := CASE p_tier_rank WHEN 1 THEN 'START' WHEN 2 THEN 'PRO' WHEN 3 THEN 'ENT' ELSE 'UNK' END;

  FOR i IN 1..GREATEST(1, LEAST(p_count, 500)) LOOP
    v_code := 'ATR-' || v_plan_code || '-LIFE-'
      || UPPER(SUBSTRING(encode(gen_random_bytes(2), 'hex'), 1, 4))
      || '-'
      || UPPER(SUBSTRING(encode(gen_random_bytes(2), 'hex'), 1, 4));
    WHILE EXISTS (SELECT 1 FROM public.license_vouchers WHERE UPPER(code) = UPPER(v_code)) LOOP
      v_code := 'ATR-' || v_plan_code || '-LIFE-'
        || UPPER(SUBSTRING(encode(gen_random_bytes(2), 'hex'), 1, 4))
        || '-'
        || UPPER(SUBSTRING(encode(gen_random_bytes(2), 'hex'), 1, 4));
    END LOOP;

    INSERT INTO public.license_vouchers (code, plan_id, duration_months, is_redeemed, created_by_note)
    VALUES (v_code, v_plan.id, -1, false, p_notes);
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'plan_name', v_plan.name,
    'tier_rank', p_tier_rank,
    'count', array_length(v_codes, 1),
    'codes', to_jsonb(v_codes)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_account(text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_license_vouchers(integer, integer, text, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.revoke_device(
  p_device_id uuid,
  p_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows integer;
  v_auth_acc uuid := public.get_auth_account_id();
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  UPDATE public.devices
  SET is_active = false,
      revoked_at = now(),
      deleted_at = now(),
      updated_at = now(),
      updated_by_staff_id = public.get_auth_staff_id()
  WHERE id = p_device_id
    AND account_id = p_account_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DEVICE_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  RETURN jsonb_build_object('success', true, 'device_id', p_device_id);
END;
$$;

DROP FUNCTION IF EXISTS public.get_tenant_facilities(uuid);
CREATE OR REPLACE FUNCTION public.get_tenant_facilities(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_auth_acc uuid := public.get_auth_account_id();
BEGIN
  IF v_auth_acc IS NOT NULL AND v_auth_acc <> p_tenant_id THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id',          br.id,
    'tenant_id',   br.account_id,
    'business_id', br.business_id,
    'name',        br.name,
    'description', COALESCE(b.name, br.name),
    'slug',        LOWER(REPLACE(br.name, ' ', '-')),
    'address',     COALESCE(br.address, b.address),
    'phone',       COALESCE(br.phone, b.phone),
    'category',    b.category,
    'type',        CASE b.category
                     WHEN 'membership_session'       THEN 1
                     WHEN 'appointment_service'      THEN 5
                     WHEN 'pos_inventory'            THEN 6
                     WHEN 'project_milestone'        THEN 13
                     WHEN 'rental_booking'           THEN 14
                     WHEN 'education_cohort'         THEN 15
                     WHEN 'freelance_solo'           THEN 16
                     WHEN 'trading_commercial'       THEN 17
                     WHEN 'medical_clinic'           THEN 18
                     WHEN 'auto_garage'              THEN 19
                     WHEN 'real_estate'              THEN 20
                     WHEN 'manufacturing_production' THEN 21
                     WHEN 'legal_accounting'         THEN 22
                     WHEN 'logistics_delivery'       THEN 23
                     WHEN 'construction_contractor'  THEN 24
                     WHEN 'agriculture_farming'      THEN 25
                     ELSE 12
                   END,
    'is_active',   br.is_active,
    'created_at',  br.created_at
  ))
  INTO v_result
  FROM public.branches br
  LEFT JOIN public.businesses b ON b.id = br.business_id
  WHERE br.account_id = p_tenant_id
    AND br.is_active = true;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

DROP FUNCTION IF EXISTS public.get_staff_profiles(text);
CREATE OR REPLACE FUNCTION public.get_staff_profiles(p_email text)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  role_rank int,
  has_pin boolean,
  account_id uuid,
  branch_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.id,
    s.full_name,
    s.email,
    s.role::text,
    CASE s.role
      WHEN 'owner' THEN 8
      WHEN 'agency_director' THEN 8
      WHEN 'manager' THEN 1
      WHEN 'cashier' THEN 2
      WHEN 'technician' THEN 3
      WHEN 'stylist' THEN 7
      WHEN 'waiter' THEN 4
      ELSE 7
    END AS role_rank,
    (s.pin_hash IS NOT NULL) AS has_pin,
    s.account_id,
    s.branch_id
  FROM public.staff s
  WHERE lower(trim(s.email)) = lower(trim(p_email))
    AND s.is_active = true
    AND s.deleted_at IS NULL;
$$;

DROP FUNCTION IF EXISTS public.get_staff_for_sync(uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.get_staff_for_sync(uuid, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.get_staff_for_sync(
  p_account_id uuid,
  p_facility_id uuid DEFAULT NULL,
  p_updated_after timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_auth_acc uuid := public.get_auth_account_id();
BEGIN
  IF v_auth_acc IS NOT NULL AND v_auth_acc <> p_account_id THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id',                  s.id,
    'account_id',          s.account_id,
    'tenant_id',           s.account_id,
    'business_id',         s.business_id,
    'branch_id',           COALESCE(s.branch_id, sba.branch_id),
    'primary_facility_id', COALESCE(
                             s.branch_id,
                             sba.branch_id,
                             (SELECT b.id FROM public.branches b
                              WHERE b.account_id = s.account_id AND b.is_main_branch = true LIMIT 1)
                           ),
    'full_name',           s.full_name,
    'email',               s.email,
    'phone',               s.phone,
    'role',                s.role,
    'salary',              s.salary,
    'payment_day',         s.payment_day,
    'ccp_number',          s.ccp_number,
    'ccp_key',             s.ccp_key,
    'bank_rib',            s.bank_rib,
    'payment_method',      s.payment_method,
    'card_id',             s.card_id,
    'badge_token',         s.badge_token,
    'status',              s.status,
    'is_owner',            (s.role IN ('owner', 'agency_director')),
    'is_active',           s.is_active,
    'auth_user_id',        s.auth_user_id,
    'created_at',          s.created_at,
    'updated_at',          s.updated_at
  ))
  INTO v_result
  FROM public.staff s
  LEFT JOIN public.staff_branch_assignments sba
    ON sba.staff_id = s.id AND sba.deleted_at IS NULL
  WHERE s.account_id = p_account_id
    AND s.deleted_at IS NULL
    AND s.is_active = true
    AND (p_updated_after IS NULL OR s.updated_at > p_updated_after)
    AND (p_facility_id IS NULL OR s.branch_id = p_facility_id OR sba.branch_id = p_facility_id OR (s.branch_id IS NULL AND sba.branch_id IS NULL));

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

ALTER TABLE public.license_vouchers
  ADD COLUMN IF NOT EXISTS redeemed_by_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'license_vouchers' AND column_name = 'redeemed_by'
  ) THEN
    UPDATE public.license_vouchers
    SET redeemed_by_account_id = redeemed_by
    WHERE redeemed_by_account_id IS NULL AND redeemed_by IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_license_voucher(
  p_account_id uuid,
  p_voucher_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_voucher record;
  v_plan record;
  v_auth_acc uuid := public.get_auth_account_id();
  v_is_lifetime boolean;
BEGIN
  IF v_auth_acc IS NOT NULL AND v_auth_acc <> p_account_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized account operation');
  END IF;

  SELECT * INTO v_voucher
  FROM public.license_vouchers
  WHERE upper(trim(code)) = upper(trim(p_voucher_code))
    AND is_redeemed = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already redeemed voucher code');
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_voucher.plan_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Plan configuration missing for voucher');
  END IF;

  v_is_lifetime := (COALESCE(v_voucher.duration_months, 0) <= 0);

  UPDATE public.license_vouchers
  SET is_redeemed = true,
      redeemed_by_account_id = p_account_id,
      redeemed_at = now()
  WHERE id = v_voucher.id;

  INSERT INTO public.account_subscriptions (
    account_id, plan_id, status, is_lifetime, activated_by_voucher, created_at, updated_at
  ) VALUES (
    p_account_id, v_voucher.plan_id, 'active', v_is_lifetime, v_voucher.id, now(), now()
  )
  ON CONFLICT (account_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        is_lifetime = EXCLUDED.is_lifetime,
        activated_by_voucher = EXCLUDED.activated_by_voucher,
        updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'plan', jsonb_build_object('name', v_plan.name, 'tier_rank', v_plan.tier_rank, 'is_lifetime', v_is_lifetime),
    'message', 'License activated successfully!'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.onboard_owner_account(
  p_owner_id uuid,
  p_full_name text,
  p_email text,
  p_business_name text,
  p_branch_name text,
  p_category text DEFAULT 'membership_session',
  p_device_label text DEFAULT 'Web Terminal',
  p_voucher_code text DEFAULT NULL,
  p_modules jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_business_id uuid;
  v_branch_id uuid;
  v_plan_id uuid;
  v_plan_name text := 'Free Trial';
  v_tier_rank int := 0;
  v_is_lifetime boolean := false;
  v_status text := 'trial';
  v_voucher_res jsonb;
BEGIN
  v_account_id := COALESCE(auth.uid(), p_owner_id, gen_random_uuid());

  SELECT id, name, tier_rank INTO v_plan_id, v_plan_name, v_tier_rank
  FROM public.subscription_plans WHERE is_free_tier = true LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (name, tier_rank, max_businesses, max_branches, max_devices, max_staff, is_free_tier, trial_days)
    VALUES ('Free Trial', 0, 1, 1, 1, 3, true, 30)
    RETURNING id, name, tier_rank INTO v_plan_id, v_plan_name, v_tier_rank;
  END IF;

  INSERT INTO public.accounts (id, full_name, email, is_active)
  VALUES (v_account_id, p_full_name, p_email, true)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

  INSERT INTO public.account_subscriptions (account_id, plan_id, status, is_lifetime, trial_ends_at)
  VALUES (v_account_id, v_plan_id, 'trial', false, now() + interval '30 days')
  ON CONFLICT (account_id) DO NOTHING;

  INSERT INTO public.businesses (account_id, name, display_name, category)
  VALUES (v_account_id, p_business_name, p_business_name, p_category)
  RETURNING id INTO v_business_id;

  INSERT INTO public.branches (account_id, business_id, name, code, is_main_branch)
  VALUES (v_account_id, v_business_id, p_branch_name, 'MAIN-01', true)
  RETURNING id INTO v_branch_id;

  INSERT INTO public.staff (account_id, business_id, branch_id, auth_user_id, full_name, email, role, is_active)
  VALUES (v_account_id, v_business_id, v_branch_id, auth.uid(), p_full_name, p_email, 'owner', true);

  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) <> '' THEN
    v_voucher_res := public.redeem_license_voucher(v_account_id, p_voucher_code);
    IF COALESCE((v_voucher_res->>'success')::boolean, false) THEN
      v_status := 'active';
      v_is_lifetime := COALESCE((v_voucher_res->'plan'->>'is_lifetime')::boolean, true);
      v_tier_rank := COALESCE((v_voucher_res->'plan'->>'tier_rank')::int, v_tier_rank);
      v_plan_name := COALESCE(v_voucher_res->'plan'->>'name', v_plan_name);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'business_id', v_business_id,
    'branch_id', v_branch_id,
    'plan_status', v_status,
    'is_lifetime', v_is_lifetime,
    'tier_rank', v_tier_rank,
    'plan_name', v_plan_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_business(
  p_account_id uuid,
  p_name text,
  p_category text DEFAULT 'pos_inventory',
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_auth_acc uuid := public.get_auth_account_id();
BEGIN
  IF v_auth_acc IS NOT NULL AND v_auth_acc <> p_account_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  INSERT INTO public.businesses (account_id, name, display_name, category, address, phone)
  VALUES (p_account_id, p_name, p_name, p_category, p_address, p_phone)
  RETURNING id INTO v_business_id;

  RETURN jsonb_build_object('success', true, 'business_id', v_business_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_branch(
  p_account_id uuid,
  p_business_id uuid,
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch_id uuid;
  v_count int;
  v_auth_acc uuid := public.get_auth_account_id();
BEGIN
  IF v_auth_acc IS NOT NULL AND v_auth_acc <> p_account_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT count(*) + 1 INTO v_count FROM public.branches WHERE business_id = p_business_id;
  INSERT INTO public.branches (account_id, business_id, name, code, address, phone, is_main_branch)
  VALUES (p_account_id, p_business_id, p_name, 'BR-' || lpad(v_count::text, 2, '0'), p_address, p_phone, false)
  RETURNING id INTO v_branch_id;

  RETURN jsonb_build_object('success', true, 'branch_id', v_branch_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Workforce ERP Module (Unified Cross-Category Payroll & Attendance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  updated_by_staff_id uuid,
  device_id text,
  staff_name text NOT NULL,
  staff_role text NOT NULL DEFAULT 'Staff',
  log_timestamp timestamptz NOT NULL DEFAULT now(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  method text NOT NULL DEFAULT 'kiosk' CHECK (method IN ('pin', 'rfid', 'kiosk', 'manual')),
  terminal_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.staff_salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  updated_by_staff_id uuid,
  device_id text,
  staff_name text NOT NULL,
  amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  date_issued date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'ccp', 'bank_transfer')),
  reason text,
  voucher_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deducted', 'waived')),
  deducted_in_period text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.staff_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  category text NOT NULL DEFAULT 'membership_session',
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year int NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  total_gross_cotisable numeric(14,2) NOT NULL DEFAULT 0,
  total_cnas_salarial numeric(14,2) NOT NULL DEFAULT 0,
  total_cnas_patronal numeric(14,2) NOT NULL DEFAULT 0,
  total_irg numeric(14,2) NOT NULL DEFAULT 0,
  total_net numeric(14,2) NOT NULL DEFAULT 0,
  slips_count int NOT NULL DEFAULT 0,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.staff_payroll_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  updated_by_staff_id uuid,
  device_id text,
  payroll_run_id uuid NOT NULL REFERENCES public.staff_payroll_runs(id) ON DELETE CASCADE,
  matricule text NOT NULL,
  staff_full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Staff',
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year int NOT NULL,
  period_label text NOT NULL,
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  actual_base_salary numeric(12,2) NOT NULL DEFAULT 0,
  worked_days numeric(5,2) NOT NULL DEFAULT 22,
  standard_days numeric(5,2) NOT NULL DEFAULT 22,
  coaching_commission numeric(12,2) NOT NULL DEFAULT 0,
  primes_cotisables jsonb NOT NULL DEFAULT '[]'::jsonb,
  salaire_brut_cotisable numeric(12,2) NOT NULL DEFAULT 0,
  cnas_salarial numeric(12,2) NOT NULL DEFAULT 0,
  cnas_patronal numeric(12,2) NOT NULL DEFAULT 0,
  salaire_brut_imposable numeric(12,2) NOT NULL DEFAULT 0,
  irg_tax numeric(12,2) NOT NULL DEFAULT 0,
  primes_non_imposables jsonb NOT NULL DEFAULT '[]'::jsonb,
  acomptes_deduits numeric(12,2) NOT NULL DEFAULT 0,
  autres_retenues numeric(12,2) NOT NULL DEFAULT 0,
  net_a_payer numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  ccp_number text,
  ccp_key text,
  bank_rib text,
  nss text,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  receipt_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_payroll_slips'
      AND column_name = 'primes_non_imposables' AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE public.staff_payroll_slips ALTER COLUMN primes_non_imposables DROP DEFAULT;
    ALTER TABLE public.staff_payroll_slips
      ALTER COLUMN primes_non_imposables TYPE jsonb USING '[]'::jsonb;
    ALTER TABLE public.staff_payroll_slips
      ALTER COLUMN primes_non_imposables SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Indexes, Traceability & Audit Triggers + InitPlan RLS for Workforce ERP
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'staff_branch_assignments',
    'staff_attendance_logs',
    'staff_salary_advances',
    'staff_payroll_runs',
    'staff_payroll_slips'
  ]
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_scope_active ON public.%I (account_id, business_id, branch_id) WHERE deleted_at IS NULL;',
      t, t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_updated_at ON public.%I (branch_id, updated_at DESC) WHERE deleted_at IS NULL;',
      t, t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_trace ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_trace BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_traceability_envelope();',
      t, t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
      t, t
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%I_tenant_isolated" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "%I_tenant_isolated" ON public.%I FOR ALL TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id) AND deleted_at IS NULL) WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id));',
      t, t
    );
  END LOOP;
END $$;

-- Publish Core & Workforce Tables to Supabase Realtime safely
DO $$
DECLARE
  rt_tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH rt_tbl IN ARRAY ARRAY[
      'businesses', 'branches', 'devices', 'staff',
      'staff_branch_assignments', 'staff_attendance_logs',
      'staff_salary_advances', 'staff_payroll_runs', 'staff_payroll_slips'
    ]
    LOOP
      IF to_regclass('public.' || rt_tbl) IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = rt_tbl
         ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rt_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
