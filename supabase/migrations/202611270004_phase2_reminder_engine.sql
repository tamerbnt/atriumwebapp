-- ============================================================================
-- Atrium Phase 2 Migration (Step 4): Section 6.5 Reminder & Notification Engine
--   - `reminder_quiet_hours_configs`: per-business quiet hours & timezone
--   - `reminder_rules`: rule-based triggers for 13 cross-vertical events
--   - `reminder_delivery_logs`: delivery audit + idempotency key constraint
--   - Transactional RPC: `dispatch_reminder_idempotent`
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.5a Per-Business Quiet Hours (`reminder_quiet_hours_configs`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_quiet_hours_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  start_time text NOT NULL DEFAULT '21:00'
    CHECK (start_time ~ '^\d{2}:\d{2}$'),
  end_time text NOT NULL DEFAULT '08:00'
    CHECK (end_time ~ '^\d{2}:\d{2}$'),
  timezone text NOT NULL DEFAULT 'Africa/Algiers',
  allow_in_app_during_quiet boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reminder_quiet_hours_business_active
  ON public.reminder_quiet_hours_configs (business_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.reminder_quiet_hours_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_quiet_hours_tenant_access" ON public.reminder_quiet_hours_configs;
CREATE POLICY "reminder_quiet_hours_tenant_access"
  ON public.reminder_quiet_hours_configs
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.5b Reminder Rules (`reminder_rules`) — 13 Supported Cross-Vertical Events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  event_type text NOT NULL
    CHECK (
      event_type IN (
        'membership_expiring',
        'invoice_overdue',
        'installment_due',
        'rent_due',
        'appointment_tomorrow',
        'low_stock',
        'expiry_date',
        'service_due',
        'dar_lockout',
        'cheque_due',
        'deadline_cpca',
        'contract_expiry',
        'vehicle_documents_expiry'
      )
    ),
  name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  lead_days int NOT NULL DEFAULT 3,
  channels jsonb NOT NULL DEFAULT '["in_app"]'::jsonb,
  template_id uuid REFERENCES public.crm_message_templates(id) ON DELETE SET NULL,
  respect_quiet_hours boolean NOT NULL DEFAULT true,
  cooldown_hours int NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 1),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reminder_rules_business_event_active
  ON public.reminder_rules (business_id, event_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_rules_tenant_access" ON public.reminder_rules;
CREATE POLICY "reminder_rules_tenant_access"
  ON public.reminder_rules
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.5c Idempotent Reminder Delivery Log (`reminder_delivery_logs`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminder_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.reminder_rules(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text,
  party_id uuid REFERENCES public.crm_parties(id) ON DELETE SET NULL,
  channel text NOT NULL
    CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email')),
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'sent'
    CHECK (
      status IN (
        'scheduled',
        'sent',
        'deferred_quiet_hours',
        'blocked_opt_out',
        'failed',
        'skipped_duplicate'
      )
    ),
  scheduled_for timestamptz,
  delivered_at timestamptz,
  title text NOT NULL,
  message text NOT NULL,
  crm_comm_log_id uuid REFERENCES public.crm_communication_logs(id) ON DELETE SET NULL,
  error_code text,
  error_message text,
  attempts int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reminder_delivery_idempotency
  ON public.reminder_delivery_logs (business_id, idempotency_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminder_delivery_business_date
  ON public.reminder_delivery_logs (business_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.reminder_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_delivery_logs_tenant_access" ON public.reminder_delivery_logs;
CREATE POLICY "reminder_delivery_logs_tenant_access"
  ON public.reminder_delivery_logs
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.5d Transactional Idempotent Reminder Dispatch RPC
--   Enforces caller membership, opt-out guard, quiet-hours deferral, and
--   strict at-most-once delivery per (business_id, idempotency_key).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_reminder_idempotent(
  p_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_rule_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_party_id uuid,
  p_channel text,
  p_idempotency_key text,
  p_title text,
  p_message text,
  p_status text DEFAULT 'sent',
  p_scheduled_for timestamptz DEFAULT NULL,
  p_crm_comm_log_id uuid DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_party public.crm_parties%ROWTYPE;
  v_qh public.reminder_quiet_hours_configs%ROWTYPE;
  v_final_status text := p_status;
  v_final_err_code text := p_error_code;
  v_final_err_msg text := p_error_message;
  v_inserted_id uuid;
  v_local_time time;
  v_in_quiet boolean := false;
BEGIN
  SELECT account_id INTO v_account_id
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'REMINDER_BUSINESS_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_account_id = public.get_auth_account_id()
    OR public.is_business_member(p_business_id)
  ) THEN
    RAISE EXCEPTION 'REMINDER_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  -- Check CRM party opt-out / consent when external channel is requested
  IF p_party_id IS NOT NULL AND p_channel IN ('sms', 'whatsapp', 'email') THEN
    SELECT * INTO v_party
    FROM public.crm_parties
    WHERE id = p_party_id AND business_id = p_business_id AND deleted_at IS NULL;

    IF v_party.id IS NOT NULL THEN
      IF v_party.opt_out_all THEN
        v_final_status := 'blocked_opt_out';
        v_final_err_code := 'CRM_OPT_OUT_ALL';
        v_final_err_msg := 'Party opted out of all communications.';
      ELSIF (p_channel = 'sms' AND NOT v_party.consent_sms)
         OR (p_channel = 'whatsapp' AND NOT v_party.consent_whatsapp)
         OR (p_channel = 'email' AND NOT v_party.consent_email) THEN
        v_final_status := 'blocked_opt_out';
        v_final_err_code := 'CRM_CHANNEL_OPT_OUT';
        v_final_err_msg := 'Channel consent revoked on CRM party.';
      END IF;
    END IF;
  END IF;

  -- Check quiet hours unless already blocked or explicitly scheduled
  IF v_final_status = 'sent' AND p_channel IN ('sms', 'whatsapp', 'email') THEN
    SELECT * INTO v_qh
    FROM public.reminder_quiet_hours_configs
    WHERE business_id = p_business_id AND deleted_at IS NULL
    LIMIT 1;

    IF v_qh.id IS NOT NULL AND v_qh.enabled THEN
      v_local_time := (now() AT TIME ZONE COALESCE(NULLIF(v_qh.timezone, ''), 'Africa/Algiers'))::time;
      IF v_qh.start_time::time > v_qh.end_time::time THEN
        v_in_quiet := v_local_time >= v_qh.start_time::time OR v_local_time < v_qh.end_time::time;
      ELSE
        v_in_quiet := v_local_time >= v_qh.start_time::time AND v_local_time < v_qh.end_time::time;
      END IF;

      IF v_in_quiet THEN
        v_final_status := 'deferred_quiet_hours';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.reminder_delivery_logs (
    id, account_id, business_id, branch_id, rule_id, event_type,
    entity_type, entity_id, entity_label, party_id, channel,
    idempotency_key, status, scheduled_for, delivered_at,
    title, message, crm_comm_log_id, error_code, error_message, attempts
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()),
    v_account_id,
    p_business_id,
    p_branch_id,
    p_rule_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_party_id,
    p_channel,
    p_idempotency_key,
    v_final_status,
    p_scheduled_for,
    CASE WHEN v_final_status = 'sent' THEN now() ELSE NULL END,
    p_title,
    p_message,
    p_crm_comm_log_id,
    v_final_err_code,
    v_final_err_msg,
    1
  )
  ON CONFLICT (business_id, idempotency_key) WHERE deleted_at IS NULL
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'skipped', true,
      'status', 'skipped_duplicate'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'skipped', false,
    'id', v_inserted_id,
    'status', v_final_status
  );
END;
$$;

COMMIT;
