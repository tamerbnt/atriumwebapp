-- ============================================================================
-- Atrium Phase 2 Migration (Step 3): Section 6.4 Unified CRM & Communication
--   - `crm_parties`: master person/company record with +213 phone normalization,
--     shared family phone support, NIF/RC/email, consent & opt-out controls
--   - `crm_party_links`: cross-vertical entity linkage (member, b2b_client,
--     b2b_supplier, patient, renter, student, freelance_client, lead, etc.)
--   - `crm_party_notes`: timestamped CRM notes & interaction log
--   - `crm_follow_up_tasks`: follow-up tasks & due reminders
--   - `crm_message_templates`: FR/AR/EN SMS/WhatsApp/Email templates with {{vars}}
--   - `crm_communication_logs`: outbound delivery log + opt-out guard + retries
--   - Transactional RPCs: `merge_crm_parties`, `record_crm_communication_attempt`,
--     `retry_crm_communication`
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.4a Master `crm_parties`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  party_kind text NOT NULL DEFAULT 'person'
    CHECK (party_kind IN ('person', 'company')),
  display_name text NOT NULL,
  phone_raw text,
  phone_e164 text,
  phone_local text,
  phone_valid boolean NOT NULL DEFAULT false,
  shared_phone_group boolean NOT NULL DEFAULT false,
  email text,
  nif text,
  rc text,
  nis text,
  ai text,
  address text,
  wilaya_code text,
  preferred_language text NOT NULL DEFAULT 'fr'
    CHECK (preferred_language IN ('en', 'fr', 'ar')),
  consent_sms boolean NOT NULL DEFAULT true,
  consent_whatsapp boolean NOT NULL DEFAULT true,
  consent_email boolean NOT NULL DEFAULT true,
  opt_out_all boolean NOT NULL DEFAULT false,
  opt_out_reason text,
  opt_out_at timestamptz,
  merged_into_party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  merged_at timestamptz,
  merged_by_staff_id uuid,
  notes text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_parties_business_phone
  ON public.crm_parties (business_id, phone_e164)
  WHERE deleted_at IS NULL AND phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_parties_business_nif
  ON public.crm_parties (business_id, nif)
  WHERE deleted_at IS NULL AND nif IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_parties_business_email
  ON public.crm_parties (business_id, lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

ALTER TABLE public.crm_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_parties_tenant_access" ON public.crm_parties;
CREATE POLICY "crm_parties_tenant_access"
  ON public.crm_parties
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4b Cross-Vertical Entity Links (`crm_party_links`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_party_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  party_id uuid NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
  source_vertical text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_party_links_entity_active
  ON public.crm_party_links (business_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_party_links_party
  ON public.crm_party_links (party_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_party_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_party_links_tenant_access" ON public.crm_party_links;
CREATE POLICY "crm_party_links_tenant_access"
  ON public.crm_party_links
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4c Party Notes (`crm_party_notes`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_party_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  party_id uuid NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
  source_vertical text,
  author_staff_id uuid,
  author_name text,
  note_type text NOT NULL DEFAULT 'note'
    CHECK (note_type IN ('note', 'call', 'visit', 'incident')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_party_notes_party_date
  ON public.crm_party_notes (party_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_party_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_party_notes_tenant_access" ON public.crm_party_notes;
CREATE POLICY "crm_party_notes_tenant_access"
  ON public.crm_party_notes
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4d Follow-Up Tasks (`crm_follow_up_tasks`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  party_id uuid NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
  assigned_staff_id uuid,
  assigned_staff_name text,
  title text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email', 'call')),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'snoozed', 'cancelled')),
  completed_at timestamptz,
  created_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_follow_up_tasks_party_due
  ON public.crm_follow_up_tasks (business_id, status, due_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_follow_up_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_follow_up_tasks_tenant_access" ON public.crm_follow_up_tasks;
CREATE POLICY "crm_follow_up_tasks_tenant_access"
  ON public.crm_follow_up_tasks
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4e Message Templates (`crm_message_templates` — FR/AR/EN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  code text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  name text NOT NULL,
  subject_fr text,
  subject_ar text,
  subject_en text,
  body_fr text NOT NULL,
  body_ar text NOT NULL,
  body_en text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_message_templates_code_active
  ON public.crm_message_templates (business_id, code, channel)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_message_templates_tenant_access" ON public.crm_message_templates;
CREATE POLICY "crm_message_templates_tenant_access"
  ON public.crm_message_templates
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4f Communication Delivery Log (`crm_communication_logs`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  party_id uuid NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.crm_message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  recipient_address text NOT NULL,
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('en', 'fr', 'ar')),
  subject text,
  rendered_body text NOT NULL,
  missing_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'blocked_opt_out')),
  provider_name text,
  provider_message_id text,
  error_code text,
  error_message text,
  attempts int NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  sent_by_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_communication_logs_party
  ON public.crm_communication_logs (party_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_communication_logs_status
  ON public.crm_communication_logs (business_id, status, last_attempt_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_communication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_communication_logs_tenant_access" ON public.crm_communication_logs;
CREATE POLICY "crm_communication_logs_tenant_access"
  ON public.crm_communication_logs
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.4g Transactional Party Merge RPC with Immutable Audit Log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_crm_parties(
  p_source_party_id uuid,
  p_target_party_id uuid,
  p_reason text DEFAULT 'Duplicate merge'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_source public.crm_parties%ROWTYPE;
  v_target public.crm_parties%ROWTYPE;
  v_links_moved int := 0;
  v_notes_moved int := 0;
  v_tasks_moved int := 0;
  v_comms_moved int := 0;
BEGIN
  IF p_source_party_id IS NULL OR p_target_party_id IS NULL OR p_source_party_id = p_target_party_id THEN
    RAISE EXCEPTION 'CRM_MERGE_INVALID_PARTIES' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_source
  FROM public.crm_parties
  WHERE id = p_source_party_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM_SOURCE_PARTY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_target
  FROM public.crm_parties
  WHERE id = p_target_party_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM_TARGET_PARTY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_source.account_id <> v_account_id OR v_target.account_id <> v_account_id OR v_source.business_id <> v_target.business_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_CRM_MERGE' USING ERRCODE = '42501';
  END IF;

  UPDATE public.crm_party_links
  SET party_id = p_target_party_id,
      updated_at = now()
  WHERE party_id = p_source_party_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_links_moved = ROW_COUNT;

  UPDATE public.crm_party_notes
  SET party_id = p_target_party_id,
      updated_at = now()
  WHERE party_id = p_source_party_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_notes_moved = ROW_COUNT;

  UPDATE public.crm_follow_up_tasks
  SET party_id = p_target_party_id,
      updated_at = now()
  WHERE party_id = p_source_party_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_tasks_moved = ROW_COUNT;

  UPDATE public.crm_communication_logs
  SET party_id = p_target_party_id,
      updated_at = now()
  WHERE party_id = p_source_party_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_comms_moved = ROW_COUNT;

  UPDATE public.crm_parties
  SET phone_raw = COALESCE(phone_raw, v_source.phone_raw),
      phone_e164 = COALESCE(phone_e164, v_source.phone_e164),
      phone_local = COALESCE(phone_local, v_source.phone_local),
      phone_valid = phone_valid OR v_source.phone_valid,
      email = COALESCE(email, v_source.email),
      nif = COALESCE(nif, v_source.nif),
      rc = COALESCE(rc, v_source.rc),
      nis = COALESCE(nis, v_source.nis),
      ai = COALESCE(ai, v_source.ai),
      address = COALESCE(address, v_source.address),
      wilaya_code = COALESCE(wilaya_code, v_source.wilaya_code),
      opt_out_all = opt_out_all OR v_source.opt_out_all,
      consent_sms = consent_sms AND v_source.consent_sms,
      consent_whatsapp = consent_whatsapp AND v_source.consent_whatsapp,
      consent_email = consent_email AND v_source.consent_email,
      version = version + 1,
      updated_at = now()
  WHERE id = p_target_party_id;

  UPDATE public.crm_parties
  SET merged_into_party_id = p_target_party_id,
      merged_at = now(),
      merged_by_staff_id = v_staff_id,
      deleted_at = now(),
      version = version + 1,
      updated_at = now()
  WHERE id = p_source_party_id;

  INSERT INTO public.immutable_audit_logs (
    account_id,
    business_id,
    branch_id,
    actor_auth_id,
    actor_staff_id,
    event_type,
    table_name,
    record_id,
    metadata
  ) VALUES (
    v_account_id,
    v_target.business_id,
    v_target.branch_id,
    auth.uid(),
    v_staff_id,
    'crm_party_merge',
    'crm_parties',
    p_target_party_id,
    jsonb_build_object(
      'source_party_id', p_source_party_id,
      'target_party_id', p_target_party_id,
      'reason', COALESCE(NULLIF(trim(p_reason), ''), 'Duplicate merge'),
      'links_moved', v_links_moved,
      'notes_moved', v_notes_moved,
      'tasks_moved', v_tasks_moved,
      'comms_moved', v_comms_moved
    )
  );

  RETURN jsonb_build_object(
    'source_party_id', p_source_party_id,
    'target_party_id', p_target_party_id,
    'links_moved', v_links_moved,
    'notes_moved', v_notes_moved,
    'tasks_moved', v_tasks_moved,
    'comms_moved', v_comms_moved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_crm_parties(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_crm_parties(uuid, uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6.4h Consent-Enforced Communication Recording & Retry RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_crm_communication_attempt(
  p_log_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_party_id uuid,
  p_template_id uuid,
  p_channel text,
  p_recipient_address text,
  p_language text,
  p_subject text,
  p_rendered_body text,
  p_missing_variables jsonb,
  p_requested_status text,
  p_provider_name text DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_party public.crm_parties%ROWTYPE;
  v_effective_status text := p_requested_status;
  v_effective_error_code text := p_error_code;
  v_effective_error_msg text := p_error_message;
  v_log_id uuid := COALESCE(p_log_id, gen_random_uuid());
BEGIN
  IF p_branch_id IS NOT NULL AND NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_CRM_BRANCH' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_party
  FROM public.crm_parties
  WHERE id = p_party_id AND deleted_at IS NULL;

  IF NOT FOUND OR v_party.account_id <> v_account_id THEN
    RAISE EXCEPTION 'CRM_PARTY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_party.opt_out_all
     OR (p_channel = 'sms' AND NOT v_party.consent_sms)
     OR (p_channel = 'whatsapp' AND NOT v_party.consent_whatsapp)
     OR (p_channel = 'email' AND NOT v_party.consent_email) THEN
    v_effective_status := 'blocked_opt_out';
    v_effective_error_code := 'CRM_CONSENT_OPT_OUT';
    v_effective_error_msg := 'Party opted out of channel communications.';
  END IF;

  INSERT INTO public.crm_communication_logs (
    id,
    account_id,
    business_id,
    branch_id,
    party_id,
    template_id,
    channel,
    recipient_address,
    language,
    subject,
    rendered_body,
    missing_variables,
    status,
    provider_name,
    error_code,
    error_message,
    attempts,
    last_attempt_at,
    sent_at,
    sent_by_staff_id
  ) VALUES (
    v_log_id,
    v_account_id,
    p_business_id,
    p_branch_id,
    p_party_id,
    p_template_id,
    p_channel,
    COALESCE(p_recipient_address, ''),
    COALESCE(p_language, 'fr'),
    p_subject,
    COALESCE(p_rendered_body, ''),
    COALESCE(p_missing_variables, '[]'::jsonb),
    v_effective_status,
    p_provider_name,
    v_effective_error_code,
    v_effective_error_msg,
    1,
    now(),
    CASE WHEN v_effective_status = 'sent' THEN now() ELSE NULL END,
    v_staff_id
  )
  ON CONFLICT (id) DO UPDATE
  SET status = EXCLUDED.status,
      provider_name = EXCLUDED.provider_name,
      error_code = EXCLUDED.error_code,
      error_message = EXCLUDED.error_message,
      attempts = public.crm_communication_logs.attempts + 1,
      last_attempt_at = now(),
      sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN now() ELSE public.crm_communication_logs.sent_at END,
      updated_at = now();

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'status', v_effective_status,
    'error_code', v_effective_error_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_crm_communication_attempt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_crm_communication_attempt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text
) TO authenticated;

COMMIT;
