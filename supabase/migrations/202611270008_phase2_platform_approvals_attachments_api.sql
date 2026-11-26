-- ============================================================================
-- Atrium Phase 2 Migration (Step 8): Section 6.9 Platform Governance,
-- Maker-Checker Approvals, Shared Attachments + Legal Hold, Custom Fields &
-- Print Templates, Scoped REST API Keys & Signed Outbound Webhooks
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.9a Approval Rules (`platform_approval_rules`) & Requests (`platform_approval_requests`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  action_scope text NOT NULL
    CHECK (action_scope IN ('discount', 'refund', 'expense', 'payroll_release', 'price_change')),
  rule_name text NOT NULL,
  threshold_centimes bigint NOT NULL DEFAULT 0 CHECK (threshold_centimes >= 0),
  threshold_percent numeric(6,2) CHECK (threshold_percent IS NULL OR (threshold_percent >= 0 AND threshold_percent <= 100)),
  approver_roles jsonb NOT NULL DEFAULT '["owner"]'::jsonb,
  require_dual_control boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  updated_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_approval_rules_scope_active
  ON public.platform_approval_rules (business_id, action_scope)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_approval_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_approval_rules_tenant_read" ON public.platform_approval_rules;
CREATE POLICY "platform_approval_rules_tenant_read"
  ON public.platform_approval_rules
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "platform_approval_rules_owner_write" ON public.platform_approval_rules;
CREATE POLICY "platform_approval_rules_owner_write"
  ON public.platform_approval_rules
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

CREATE TABLE IF NOT EXISTS public.platform_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.platform_approval_rules(id) ON DELETE SET NULL,
  action_scope text NOT NULL
    CHECK (action_scope IN ('discount', 'refund', 'expense', 'payroll_release', 'price_change')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text NOT NULL,
  amount_centimes bigint NOT NULL DEFAULT 0 CHECK (amount_centimes >= 0),
  percent_delta numeric(6,2),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by_staff_id uuid,
  requested_by_name text,
  decided_by_staff_id uuid,
  decided_by_name text,
  decision_note text,
  decided_at timestamptz,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_platform_approval_requests_biz_status
  ON public.platform_approval_requests (business_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_approval_requests_tenant_access" ON public.platform_approval_requests;
CREATE POLICY "platform_approval_requests_tenant_access"
  ON public.platform_approval_requests
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

-- Maker-checker approval decision RPC (blocks self-approval when dual control applies)
CREATE OR REPLACE FUNCTION public.decide_platform_approval(
  p_request_id uuid,
  p_decision text,
  p_decision_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req        public.platform_approval_requests%ROWTYPE;
  v_rule       public.platform_approval_rules%ROWTYPE;
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id   uuid := public.get_auth_staff_id();
  v_new_status text;
  v_dual       boolean := true;
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req
  FROM public.platform_approval_requests
  WHERE id = p_request_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPROVAL_REQUEST_NOT_FOUND';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'APPROVAL_ALREADY_DECIDED';
  END IF;

  IF NOT (
    public.can_rbac(v_req.business_id, 'finance', 'approve')
    OR public.can_rbac(v_req.business_id, 'rbac', 'approve')
  ) THEN
    RAISE EXCEPTION 'APPROVAL_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_new_status := CASE lower(COALESCE(p_decision, ''))
    WHEN 'approve' THEN 'approved'
    WHEN 'approved' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'cancel' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_APPROVAL_DECISION';
  END IF;

  IF v_req.rule_id IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM public.platform_approval_rules
    WHERE id = v_req.rule_id AND deleted_at IS NULL;
    IF FOUND THEN
      v_dual := COALESCE(v_rule.require_dual_control, true);
    END IF;
  END IF;

  IF v_new_status IN ('approved', 'rejected')
     AND v_dual = true
     AND v_req.requested_by_staff_id IS NOT NULL
     AND v_staff_id IS NOT NULL
     AND v_req.requested_by_staff_id = v_staff_id THEN
    RAISE EXCEPTION 'APPROVAL_SELF_DECISION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.platform_approval_requests
  SET status = v_new_status,
      decided_by_staff_id = v_staff_id,
      decision_note = COALESCE(NULLIF(btrim(p_decision_note), ''), decision_note),
      decided_at = now(),
      updated_at = now(),
      version = version + 1
  WHERE id = v_req.id
  RETURNING * INTO v_req;

  INSERT INTO public.immutable_audit_logs (
    account_id, business_id, branch_id, actor_auth_id, actor_staff_id,
    table_name, record_id, action, new_data, occurred_at
  ) VALUES (
    v_account_id, v_req.business_id, v_req.branch_id, auth.uid(), v_staff_id,
    'platform_approval_requests', v_req.id, 'UPDATE',
    jsonb_build_object(
      'event', 'APPROVAL_DECIDED',
      'actionScope', v_req.action_scope,
      'entityType', v_req.entity_type,
      'entityId', v_req.entity_id,
      'status', v_req.status,
      'amountCentimes', v_req.amount_centimes
    ),
    now()
  );

  RETURN jsonb_build_object('id', v_req.id, 'status', v_req.status);
END;
$$;

REVOKE ALL ON FUNCTION public.decide_platform_approval(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_platform_approval(uuid, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.9b Shared File Attachments, Virus-Scan Metadata, Signed URLs & Legal Hold
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text NOT NULL,
  bucket text NOT NULL DEFAULT 'platform-attachments',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 26214400),
  sha256 text NOT NULL,
  virus_scan_status text NOT NULL DEFAULT 'clean'
    CHECK (virus_scan_status IN ('pending', 'clean', 'quarantined')),
  signed_url_token text,
  signed_url_expires_at timestamptz,
  retention_days int NOT NULL DEFAULT 1825 CHECK (retention_days BETWEEN 7 AND 36500),
  legal_hold boolean NOT NULL DEFAULT false,
  e_signature_data_url text,
  custom_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by_staff_id uuid,
  purged_at timestamptz,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_platform_attachments_entity
  ON public.platform_attachments (business_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_attachments_tenant_access" ON public.platform_attachments;
CREATE POLICY "platform_attachments_tenant_access"
  ON public.platform_attachments
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

-- Provision Storage Bucket safely if storage schema exists
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'platform-attachments',
      'platform-attachments',
      false,
      26214400,
      ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.purge_expired_platform_attachment(
  p_attachment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_att        public.platform_attachments%ROWTYPE;
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id   uuid := public.get_auth_staff_id();
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'ATTACHMENT_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_att
  FROM public.platform_attachments
  WHERE id = p_attachment_id
    AND account_id = v_account_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTACHMENT_NOT_FOUND';
  END IF;

  IF v_att.legal_hold THEN
    RAISE EXCEPTION 'ATTACHMENT_LEGAL_HOLD_ACTIVE';
  END IF;

  UPDATE public.platform_attachments
  SET purged_at = now(),
      deleted_at = now(),
      updated_at = now(),
      version = version + 1
  WHERE id = v_att.id;

  INSERT INTO public.immutable_audit_logs (
    account_id, business_id, branch_id, actor_auth_id, actor_staff_id,
    table_name, record_id, action, new_data, occurred_at
  ) VALUES (
    v_account_id, v_att.business_id, v_att.branch_id, auth.uid(), v_staff_id,
    'platform_attachments', v_att.id, 'DELETE',
    jsonb_build_object(
      'event', 'ATTACHMENT_PURGED',
      'fileName', v_att.file_name,
      'entityType', v_att.entity_type,
      'entityId', v_att.entity_id
    ),
    now()
  );

  RETURN jsonb_build_object('id', v_att.id, 'purged', true);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_platform_attachment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_platform_attachment(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.9c Custom Fields (`platform_custom_fields`) & Print Templates (`platform_print_templates`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  field_key text NOT NULL,
  label_en text NOT NULL,
  label_fr text NOT NULL,
  label_ar text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')),
  options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_custom_fields_key_active
  ON public.platform_custom_fields (business_id, entity_type, field_key)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_custom_fields_tenant_access" ON public.platform_custom_fields;
CREATE POLICY "platform_custom_fields_tenant_access"
  ON public.platform_custom_fields
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
  );

CREATE TABLE IF NOT EXISTS public.platform_print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  doc_type text NOT NULL
    CHECK (doc_type IN ('invoice', 'quote', 'receipt', 'payslip', 'credit_note', 'report')),
  header_note text,
  footer_note text,
  accent_color text NOT NULL DEFAULT '#D4522F',
  show_qr boolean NOT NULL DEFAULT true,
  show_stamp boolean NOT NULL DEFAULT true,
  show_signature boolean NOT NULL DEFAULT true,
  rtl_mirror_layout boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_print_templates_doc_active
  ON public.platform_print_templates (business_id, doc_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_print_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_print_templates_tenant_access" ON public.platform_print_templates;
CREATE POLICY "platform_print_templates_tenant_access"
  ON public.platform_print_templates
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
  );

-- ----------------------------------------------------------------------------
-- 6.9d Scoped REST API Keys (SHA-256 Hashed Only — Zero Plaintext Storage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["invoices:read","bi:read"]'::jsonb,
  rate_limit_per_minute int NOT NULL DEFAULT 120 CHECK (rate_limit_per_minute BETWEEN 10 AND 6000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_api_keys_hash_active
  ON public.platform_api_keys (key_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_api_keys_biz
  ON public.platform_api_keys (business_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_api_keys_owner_access" ON public.platform_api_keys;
CREATE POLICY "platform_api_keys_owner_access"
  ON public.platform_api_keys
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

-- ----------------------------------------------------------------------------
-- 6.9e Signed Outbound Webhooks (`HMAC-SHA256`) + Retry / Dead-Letter Queue
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  label text NOT NULL,
  endpoint_url text NOT NULL,
  subscribed_events jsonb NOT NULL DEFAULT '["invoice.issued","payment.recorded"]'::jsonb,
  signing_secret_masked text NOT NULL,
  signing_secret_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  max_retries int NOT NULL DEFAULT 5 CHECK (max_retries BETWEEN 1 AND 10),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_platform_webhooks_biz
  ON public.platform_webhooks (business_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_webhooks_owner_access" ON public.platform_webhooks;
CREATE POLICY "platform_webhooks_owner_access"
  ON public.platform_webhooks
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

CREATE TABLE IF NOT EXISTS public.platform_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  webhook_id uuid NOT NULL REFERENCES public.platform_webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  idempotency_key text NOT NULL,
  payload_json jsonb NOT NULL,
  signature_header text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'retrying', 'dead_letter')),
  attempt_count int NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  http_status int,
  response_snippet text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_webhook_deliveries_idempotency
  ON public.platform_webhook_deliveries (webhook_id, idempotency_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_webhook_deliveries_status
  ON public.platform_webhook_deliveries (business_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.platform_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_webhook_deliveries_owner_access" ON public.platform_webhook_deliveries;
CREATE POLICY "platform_webhook_deliveries_owner_access"
  ON public.platform_webhook_deliveries
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

CREATE OR REPLACE FUNCTION public.dispatch_webhook_delivery_idempotent(
  p_webhook_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_payload jsonb,
  p_signature_header text,
  p_status text DEFAULT 'delivered',
  p_http_status int DEFAULT 200,
  p_response_snippet text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wh         public.platform_webhooks%ROWTYPE;
  v_account_id uuid := public.get_auth_account_id();
  v_existing   public.platform_webhook_deliveries%ROWTYPE;
  v_created_id uuid;
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'WEBHOOK_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_wh
  FROM public.platform_webhooks
  WHERE id = p_webhook_id
    AND account_id = v_account_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WEBHOOK_NOT_FOUND';
  END IF;

  SELECT * INTO v_existing
  FROM public.platform_webhook_deliveries
  WHERE webhook_id = p_webhook_id
    AND idempotency_key = p_idempotency_key
    AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('id', v_existing.id, 'deduped', true, 'status', v_existing.status);
  END IF;

  INSERT INTO public.platform_webhook_deliveries (
    account_id, business_id, branch_id, webhook_id, event_type,
    idempotency_key, payload_json, signature_header, status,
    attempt_count, http_status, response_snippet,
    delivered_at
  ) VALUES (
    v_account_id, v_wh.business_id, v_wh.branch_id, v_wh.id, p_event_type,
    p_idempotency_key, COALESCE(p_payload, '{}'::jsonb), p_signature_header,
    CASE WHEN p_status IN ('pending','delivered','retrying','dead_letter') THEN p_status ELSE 'pending' END,
    1,
    p_http_status,
    p_response_snippet,
    CASE WHEN p_status = 'delivered' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_created_id;

  RETURN jsonb_build_object('id', v_created_id, 'deduped', false, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_webhook_delivery_idempotent(uuid, text, text, jsonb, text, text, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_webhook_delivery_idempotent(uuid, text, text, jsonb, text, text, int, text) TO authenticated;

-- Attach immutable audit triggers to new platform governance tables
DO $$
DECLARE
  gov_tbl text;
BEGIN
  FOREACH gov_tbl IN ARRAY ARRAY[
    'platform_approval_rules',
    'platform_approval_requests',
    'platform_attachments',
    'platform_api_keys',
    'platform_webhooks'
  ]
  LOOP
    IF to_regclass(format('public.%I', gov_tbl)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', gov_tbl, gov_tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
        gov_tbl, gov_tbl
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
