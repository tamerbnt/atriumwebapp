-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 4: ENTERPRISE RBAC, AUDIT & RLS HARDENING
-- Target: Supabase PostgreSQL 15+ (Supavisor Port 6543 Transaction Mode safe)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Covering Indexes & InitPlan-Optimized Role/Access Helpers
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_branches_access_lookup
  ON public.branches (id, account_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_access_lookup
  ON public.staff (auth_user_id, account_id, branch_id, role)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sba_access_lookup
  ON public.staff_branch_assignments (staff_id, branch_id)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_auth_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT a.id FROM public.accounts a WHERE a.id = (SELECT auth.uid()) AND a.is_active = true LIMIT 1),
    (SELECT s.account_id FROM public.staff s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.is_active = true AND s.deleted_at IS NULL LIMIT 1)
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
  WHERE s.auth_user_id = (SELECT auth.uid())
    AND s.is_active = true
    AND s.deleted_at IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = (SELECT auth.uid())
        AND a.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.auth_user_id = (SELECT auth.uid())
        AND s.is_active = true
        AND s.deleted_at IS NULL
        AND s.role IN ('owner', 'agency_director')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_tenant_owner()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.auth_user_id = (SELECT auth.uid())
        AND s.is_active = true
        AND s.deleted_at IS NULL
        AND s.role = 'manager'
    );
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
      EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = p_branch_id
          AND b.account_id = (SELECT auth.uid())
          AND b.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.staff s
        JOIN public.branches b ON b.account_id = s.account_id
        WHERE b.id = p_branch_id
          AND b.is_active = true
          AND s.auth_user_id = (SELECT auth.uid())
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
-- 2. Soft-Delete Alignment & Audit Coverage on Core Tenant Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_active_partial
  ON public.businesses (account_id)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_active_partial
  ON public.branches (account_id, business_id)
  WHERE is_active = true AND deleted_at IS NULL;

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
    CASE WHEN TG_TABLE_NAME = 'accounts' THEN NULLIF(COALESCE(v_row, v_old)->>'id', '')::uuid ELSE NULL END,
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

DO $$
DECLARE
  core_tbl text;
BEGIN
  FOREACH core_tbl IN ARRAY ARRAY[
    'accounts',
    'businesses',
    'branches',
    'devices',
    'account_subscriptions'
  ]
  LOOP
    IF to_regclass('public.' || core_tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', core_tbl, core_tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
        core_tbl, core_tbl
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Role-Based RLS Hardening for accounts, businesses, branches, staff
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "accounts_self_access" ON public.accounts;
CREATE POLICY "accounts_self_access"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING (id = (SELECT public.get_auth_account_id()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "businesses_tenant_isolated" ON public.businesses;
DROP POLICY IF EXISTS "businesses_tenant_read" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_delete" ON public.businesses;

CREATE POLICY "businesses_tenant_read"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND is_active = true
    AND deleted_at IS NULL
  );

CREATE POLICY "businesses_owner_insert"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  );

CREATE POLICY "businesses_owner_update"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  );

CREATE POLICY "businesses_owner_delete"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  );

DROP POLICY IF EXISTS "branches_tenant_isolated" ON public.branches;
DROP POLICY IF EXISTS "branches_tenant_read" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_update" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_delete" ON public.branches;

CREATE POLICY "branches_tenant_read"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND is_active = true
    AND deleted_at IS NULL
  );

CREATE POLICY "branches_admin_insert"
  ON public.branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

CREATE POLICY "branches_admin_update"
  ON public.branches
  FOR UPDATE
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

CREATE POLICY "branches_admin_delete"
  ON public.branches
  FOR DELETE
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  );

DROP POLICY IF EXISTS "staff_tenant_isolated" ON public.staff;
DROP POLICY IF EXISTS "staff_tenant_read" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_update" ON public.staff;
DROP POLICY IF EXISTS "staff_owner_delete" ON public.staff;

CREATE POLICY "staff_tenant_read"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      auth_user_id = (SELECT auth.uid())
      OR (
        account_id = (SELECT public.get_auth_account_id())
        AND (
          (SELECT public.is_tenant_admin())
          OR branch_id IS NULL
          OR public.can_access_branch(branch_id)
        )
      )
    )
  );

CREATE POLICY "staff_admin_insert"
  ON public.staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND (
      role NOT IN ('owner', 'agency_director')
      OR (SELECT public.is_tenant_owner())
    )
  );

CREATE POLICY "staff_admin_update"
  ON public.staff
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND (
      role NOT IN ('owner', 'agency_director')
      OR (SELECT public.is_tenant_owner())
    )
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND (
      role NOT IN ('owner', 'agency_director')
      OR (SELECT public.is_tenant_owner())
    )
  );

CREATE POLICY "staff_owner_delete"
  ON public.staff
  FOR DELETE
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_owner())
  );

-- ----------------------------------------------------------------------------
-- 4. RPC Security Hardening: set_staff_pin, get_staff_profiles, create_*
-- ----------------------------------------------------------------------------
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
  v_clean_pin text := trim(COALESCE(p_new_pin, ''));
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  IF length(v_clean_pin) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN_LENGTH');
  END IF;

  IF NOT public.is_tenant_admin() AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = p_staff_id
      AND s.account_id = v_account_id
      AND s.auth_user_id = (SELECT auth.uid())
      AND s.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_PIN_UPDATE');
  END IF;

  UPDATE public.staff
  SET pin_hash = crypt(v_clean_pin, gen_salt('bf')),
      updated_at = now(),
      updated_by_staff_id = public.get_auth_staff_id()
  WHERE id = p_staff_id
    AND account_id = v_account_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'STAFF_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true);
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
  WHERE s.account_id = public.get_auth_account_id()
    AND lower(trim(s.email)) = lower(trim(p_email))
    AND s.is_active = true
    AND s.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_staff_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_profiles(text) TO authenticated;

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
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id OR NOT public.is_tenant_owner() THEN
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
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id OR NOT public.is_tenant_admin() THEN
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
-- 5. Close Anon Bypasses & Mask Payroll Fields in Core Tenant/Sync RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_facilities(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_auth_acc uuid := COALESCE(public.get_auth_account_id(), auth.uid());
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_tenant_id THEN
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
    AND br.is_active = true
    AND br.deleted_at IS NULL;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

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
  v_auth_acc uuid := COALESCE(public.get_auth_account_id(), auth.uid());
  v_is_admin boolean := public.is_tenant_admin();
  v_uid uuid := auth.uid();
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id THEN
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
    'salary',              CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.salary ELSE 0 END,
    'payment_day',         CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.payment_day ELSE 1 END,
    'ccp_number',          CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.ccp_number ELSE NULL END,
    'ccp_key',             CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.ccp_key ELSE NULL END,
    'bank_rib',            CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.bank_rib ELSE NULL END,
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
  v_auth_acc uuid := COALESCE(public.get_auth_account_id(), auth.uid());
  v_is_lifetime boolean;
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id THEN
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

REVOKE ALL ON FUNCTION public.get_tenant_facilities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_facilities(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_staff_for_sync(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_for_sync(uuid, uuid, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_license_voucher(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_license_voucher(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.onboard_owner_account(uuid, text, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.onboard_owner_account(uuid, text, text, text, text, text, text, text, jsonb) TO authenticated;

COMMIT;
