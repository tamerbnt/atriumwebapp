-- ============================================================================
-- Atrium Phase 2 Migration (Step 7): Section 6.8 Configurable RBAC, Full RLS,
-- Owner 2FA Policy, Sensitive Read Audit & Law 18-07 Data Protection Aid
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.8a Configurable RBAC Matrix (`rbac_role_permissions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category text NOT NULL,
  role_key text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL
    CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export')),
  allowed boolean NOT NULL DEFAULT false,
  updated_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rbac_role_permissions_active
  ON public.rbac_role_permissions (business_id, role_key, resource, action)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_lookup
  ON public.rbac_role_permissions (account_id, business_id, role_key)
  WHERE deleted_at IS NULL;

ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbac_role_permissions_tenant_read" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_tenant_read"
  ON public.rbac_role_permissions
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "rbac_role_permissions_owner_write" ON public.rbac_role_permissions;
CREATE POLICY "rbac_role_permissions_owner_write"
  ON public.rbac_role_permissions
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

-- ----------------------------------------------------------------------------
-- 6.8b Unified Server Authorization Helper `can_rbac(business_id, resource, action)`
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_rbac(
  p_business_id uuid,
  p_resource text,
  p_action text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid   uuid := auth.uid();
  v_account_id uuid;
  v_staff_role text;
  v_override   boolean;
BEGIN
  IF v_auth_uid IS NULL OR p_business_id IS NULL THEN
    RETURN false;
  END IF;

  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RETURN false;
  END IF;

  -- Business must belong to caller account
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.account_id = v_account_id
      AND COALESCE(b.deleted_at, NULL) IS NULL
  ) THEN
    RETURN false;
  END IF;

  -- Account owner or executive admin always retains governance/rbac access
  IF v_auth_uid = v_account_id OR public.is_tenant_owner() THEN
    RETURN true;
  END IF;

  SELECT lower(trim(COALESCE(s.role, 'staff')))
  INTO v_staff_role
  FROM public.staff s
  WHERE s.auth_user_id = v_auth_uid
    AND s.account_id = v_account_id
    AND s.is_active = true
    AND s.deleted_at IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1;

  v_staff_role := COALESCE(NULLIF(v_staff_role, ''), 'staff');

  -- Normalize 5.5 legacy aliases
  IF v_staff_role = 'conducteur_travaux' THEN v_staff_role := 'conducteur';
  ELSIF v_staff_role = 'daf_metreur' THEN v_staff_role := 'metreur';
  ELSIF v_staff_role = 'controleur' THEN v_staff_role := 'qualite';
  END IF;

  IF v_staff_role IN (
    'owner', 'gerant', 'directeur_general', 'admin', 'direction',
    'agency_director', 'avocat_associe', 'notaire_titulaire', 'expert_comptable'
  ) THEN
    RETURN true;
  END IF;

  -- Check explicit owner-configured permission matrix override first
  SELECT r.allowed INTO v_override
  FROM public.rbac_role_permissions r
  WHERE r.business_id = p_business_id
    AND r.account_id = v_account_id
    AND lower(r.role_key) = v_staff_role
    AND lower(r.resource) = lower(COALESCE(p_resource, ''))
    AND lower(r.action) = lower(COALESCE(p_action, 'view'))
    AND r.deleted_at IS NULL
  ORDER BY r.updated_at DESC
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Restricted sensitive domains fail closed unless explicitly granted
  IF lower(COALESCE(p_resource, '')) IN ('rbac', 'data_protection', 'settings') THEN
    RETURN false;
  END IF;

  IF lower(COALESCE(p_resource, '')) = 'medical_records' THEN
    RETURN v_staff_role IN ('doctor', 'infirmier', 'medecin_chef', 'cadre_sante');
  END IF;

  IF lower(COALESCE(p_resource, '')) = 'legal_records' THEN
    IF v_staff_role = 'secretaire_caisse' THEN
      RETURN lower(COALESCE(p_action, 'view')) IN ('view', 'create');
    END IF;
    RETURN v_staff_role IN ('avocat_collaborateur', 'clerc_notaire', 'premier_clerc');
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.can_rbac(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_rbac(uuid, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.8c Workspace Security Policy (Owner 2FA, Session Timeout, PIN Lockout)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_workspace_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_2fa_enabled boolean NOT NULL DEFAULT false,
  owner_2fa_secret_masked text,
  owner_2fa_recovery_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_2fa_verified_at timestamptz,
  session_timeout_minutes int NOT NULL DEFAULT 15
    CHECK (session_timeout_minutes BETWEEN 1 AND 480),
  pin_lock_max_attempts int NOT NULL DEFAULT 5
    CHECK (pin_lock_max_attempts BETWEEN 3 AND 20),
  pin_lockout_seconds int NOT NULL DEFAULT 300
    CHECK (pin_lockout_seconds BETWEEN 30 AND 3600),
  require_pin_on_idle boolean NOT NULL DEFAULT true,
  log_sensitive_reads boolean NOT NULL DEFAULT true,
  data_retention_days int NOT NULL DEFAULT 1825
    CHECK (data_retention_days BETWEEN 30 AND 36500),
  law_18_07_review_status text NOT NULL DEFAULT 'pending_counsel_review'
    CHECK (law_18_07_review_status IN ('pending_counsel_review', 'counsel_reviewed')),
  counsel_review_notes text,
  updated_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_security_workspace_policies_biz
  ON public.security_workspace_policies (business_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.security_workspace_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_workspace_policies_read" ON public.security_workspace_policies;
CREATE POLICY "security_workspace_policies_read"
  ON public.security_workspace_policies
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "security_workspace_policies_owner_write" ON public.security_workspace_policies;
CREATE POLICY "security_workspace_policies_owner_write"
  ON public.security_workspace_policies
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

-- ----------------------------------------------------------------------------
-- 6.8d Personal-Data Consents & Subject Export/Erase Requests (Law 18-07 Aid)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_protection_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  subject_type text NOT NULL
    CHECK (subject_type IN ('member', 'patient', 'legal_client', 'student', 'customer', 'staff', 'party')),
  subject_id text NOT NULL,
  subject_name text NOT NULL,
  purpose text NOT NULL,
  legal_basis text NOT NULL DEFAULT 'consent'
    CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation')),
  status text NOT NULL DEFAULT 'granted'
    CHECK (status IN ('granted', 'withdrawn', 'expired')),
  consent_method text NOT NULL DEFAULT 'digital_pin'
    CHECK (consent_method IN ('signed_paper', 'digital_pin', 'portal_checkbox')),
  captured_by_staff_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_data_protection_consents_biz
  ON public.data_protection_consents (business_id, subject_type, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.data_protection_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_protection_consents_tenant_access" ON public.data_protection_consents;
CREATE POLICY "data_protection_consents_tenant_access"
  ON public.data_protection_consents
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  );

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  subject_type text NOT NULL
    CHECK (subject_type IN ('member', 'patient', 'legal_client', 'student', 'customer', 'staff', 'party')),
  subject_id text NOT NULL,
  subject_name text NOT NULL,
  request_type text NOT NULL
    CHECK (request_type IN ('export', 'erase', 'rectify')),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'exported', 'erased', 'rejected')),
  requested_by_staff_id uuid,
  processed_by_staff_id uuid,
  export_summary jsonb,
  reason text,
  processed_at timestamptz,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_biz
  ON public.data_subject_requests (business_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_subject_requests_tenant_access" ON public.data_subject_requests;
CREATE POLICY "data_subject_requests_tenant_access"
  ON public.data_subject_requests
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  );

-- ----------------------------------------------------------------------------
-- 6.8e Sensitive-Data Read Audit RPC (`log_sensitive_read_event`)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_immutable_audit_logs_sensitive_read
  ON public.immutable_audit_logs (account_id, actor_auth_id, occurred_at DESC)
  WHERE table_name = 'sensitive_data_read';

CREATE OR REPLACE FUNCTION public.log_sensitive_read_event(
  p_business_id uuid,
  p_branch_id uuid DEFAULT NULL,
  p_target_table text DEFAULT 'medical_patients',
  p_record_label text DEFAULT NULL,
  p_vertical text DEFAULT 'medical_clinic',
  p_role text DEFAULT 'Staff',
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid      uuid := auth.uid();
  v_account_id    uuid;
  v_staff_id      uuid;
  v_target_table  text := COALESCE(NULLIF(btrim(p_target_table), ''), 'medical_patients');
  v_record_label  text := COALESCE(NULLIF(btrim(p_record_label), ''), 'workspace_list');
  v_inserted_id   uuid;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record sensitive read audit events'
      USING ERRCODE = '42501';
  END IF;

  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not bound to an active tenant account'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id AND b.account_id = v_account_id
  ) THEN
    RAISE EXCEPTION 'Forbidden business scope for sensitive read audit event'
      USING ERRCODE = '42501';
  END IF;

  IF p_branch_id IS NOT NULL AND NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'Forbidden branch scope for sensitive read audit event'
      USING ERRCODE = '42501';
  END IF;

  v_staff_id := public.get_auth_staff_id();

  -- 10-second dedupe window per actor + target_table + record_label
  IF EXISTS (
    SELECT 1 FROM public.immutable_audit_logs l
    WHERE l.account_id = v_account_id
      AND l.actor_auth_id = v_auth_uid
      AND l.table_name = 'sensitive_data_read'
      AND l.new_data->>'targetTable' = v_target_table
      AND l.new_data->>'recordLabel' = v_record_label
      AND l.occurred_at >= now() - interval '10 seconds'
  ) THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'DEDUPED');
  END IF;

  INSERT INTO public.immutable_audit_logs (
    account_id, business_id, branch_id, actor_auth_id, actor_staff_id,
    table_name, record_id, action, new_data, occurred_at
  ) VALUES (
    v_account_id,
    p_business_id,
    p_branch_id,
    v_auth_uid,
    v_staff_id,
    'sensitive_data_read',
    NULL,
    'INSERT',
    jsonb_build_object(
      'event', 'SENSITIVE_READ',
      'targetTable', v_target_table,
      'recordLabel', v_record_label,
      'vertical', COALESCE(NULLIF(btrim(p_vertical), ''), 'medical_clinic'),
      'role', COALESCE(NULLIF(btrim(p_role), ''), 'Staff'),
      'clientOccurredAt', COALESCE(p_occurred_at, now())
    ),
    now()
  )
  RETURNING id INTO v_inserted_id;

  RETURN jsonb_build_object('recorded', true, 'id', v_inserted_id);
END;
$$;

REVOKE ALL ON FUNCTION public.log_sensitive_read_event(uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_sensitive_read_event(uuid, uuid, text, text, text, text, timestamptz) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.8f Data Subject Request Processing RPC + Audit Entry
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_data_subject_request(
  p_request_id uuid,
  p_action text,
  p_export_summary jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req        public.data_subject_requests%ROWTYPE;
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id   uuid := public.get_auth_staff_id();
  v_new_status text;
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'DATA_PROTECTION_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req
  FROM public.data_subject_requests
  WHERE id = p_request_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DATA_SUBJECT_REQUEST_NOT_FOUND';
  END IF;

  IF NOT public.can_rbac(v_req.business_id, 'data_protection', 'approve') THEN
    RAISE EXCEPTION 'DATA_PROTECTION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_new_status := CASE lower(COALESCE(p_action, ''))
    WHEN 'export' THEN 'exported'
    WHEN 'erase' THEN 'erased'
    WHEN 'reject' THEN 'rejected'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_DSR_ACTION';
  END IF;

  UPDATE public.data_subject_requests
  SET status = v_new_status,
      processed_by_staff_id = v_staff_id,
      export_summary = COALESCE(p_export_summary, export_summary),
      reason = COALESCE(NULLIF(btrim(p_reason), ''), reason),
      processed_at = now(),
      updated_at = now(),
      version = version + 1
  WHERE id = v_req.id
  RETURNING * INTO v_req;

  INSERT INTO public.immutable_audit_logs (
    account_id, business_id, branch_id, actor_auth_id, actor_staff_id,
    table_name, record_id, action, new_data, occurred_at
  ) VALUES (
    v_account_id, v_req.business_id, v_req.branch_id, auth.uid(), v_staff_id,
    'data_subject_requests', v_req.id, 'UPDATE',
    jsonb_build_object(
      'event', 'DSR_PROCESSED',
      'requestType', v_req.request_type,
      'status', v_req.status,
      'subjectType', v_req.subject_type,
      'subjectId', v_req.subject_id
    ),
    now()
  );

  RETURN jsonb_build_object('id', v_req.id, 'status', v_req.status);
END;
$$;

REVOKE ALL ON FUNCTION public.process_data_subject_request(uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_data_subject_request(uuid, text, jsonb, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.8g Harden pm_collateral_catalog RLS + Attach Immutable Financial Audit
-- Triggers + Assert Every Public Table Has RLS Enabled
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.pm_collateral_catalog') IS NOT NULL THEN
    DROP POLICY IF EXISTS "pm_collateral_catalog_tenant_isolated" ON public.pm_collateral_catalog;
    CREATE POLICY "pm_collateral_catalog_tenant_isolated"
      ON public.pm_collateral_catalog
      FOR ALL
      TO authenticated
      USING (
        account_id = (SELECT public.get_auth_account_id())
        AND deleted_at IS NULL
        AND (branch_id IS NULL OR public.can_access_branch(branch_id))
      )
      WITH CHECK (
        account_id = (SELECT public.get_auth_account_id())
        AND (branch_id IS NULL OR public.can_access_branch(branch_id))
      );
  END IF;
END $$;

DO $$
DECLARE
  fin_tbl text;
  missing_rls_tbl record;
BEGIN
  -- Attach fn_audit_log_mutation to Phase 1/2 financial tables if not already present
  FOREACH fin_tbl IN ARRAY ARRAY[
    'pos_cash_sessions',
    'pos_cash_movements',
    'pos_z_reports',
    'rental_security_deposits',
    'staff_payroll_runs',
    'staff_payroll_slips',
    'staff_salary_advances',
    'unified_documents',
    'unified_payments',
    'unified_payment_allocations',
    'journal_entries',
    'journal_lines',
    'data_protection_consents',
    'rbac_role_permissions'
  ]
  LOOP
    IF to_regclass(format('public.%I', fin_tbl)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', fin_tbl, fin_tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
        fin_tbl, fin_tbl
      );
    END IF;
  END LOOP;

  -- Verify no public table was left with rowsecurity = false
  FOR missing_rls_tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', missing_rls_tbl.tablename);
  END LOOP;
END $$;

COMMIT;
