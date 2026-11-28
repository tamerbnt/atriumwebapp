-- ============================================================================
-- Phase 3 Step 7 (7.7): freelance_solo Deepening
-- Timestamp-Authoritative Cross-Device Active Timer + Cross-Midnight Split RPC,
-- Invoiced Time-Log Immutability Trigger, Non-Draft Invoice Currency/FX Lock,
-- Recurrence + Auto-Entrepreneur Configs (unverified seed), Receipt Metadata,
-- Client Contracts/NDA Templates, Translator Sworn Register & Quote Model,
-- Photographer Shoot Scheduling Conflict Guard & Gallery Pipeline.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 7.7a Extend freelance_clients (6.4 CRM Party Link + optimistic version)
-- ----------------------------------------------------------------------------
ALTER TABLE public.freelance_clients
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.7b Extend freelance_time_logs (Span timestamps, split group & lock trigger)
-- ----------------------------------------------------------------------------
ALTER TABLE public.freelance_time_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS split_group_id text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.fn_protect_invoiced_freelance_time_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass text := current_setting('app.uninvoice_time_log_tx', true);
BEGIN
  IF OLD.is_invoiced IS TRUE AND COALESCE(v_bypass, '') <> '1' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'INVOICED_TIME_LOG_IMMUTABLE' USING ERRCODE = '42501';
    END IF;

    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'INVOICED_TIME_LOG_IMMUTABLE' USING ERRCODE = '42501';
    END IF;

    IF NEW.is_invoiced IS DISTINCT FROM OLD.is_invoiced
       OR NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds
       OR NEW.rate_at_moment IS DISTINCT FROM OLD.rate_at_moment
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.is_billable IS DISTINCT FROM OLD.is_billable
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.task_description IS DISTINCT FROM OLD.task_description
    THEN
      RAISE EXCEPTION 'INVOICED_TIME_LOG_IMMUTABLE' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_invoiced_freelance_time_logs ON public.freelance_time_logs;
CREATE TRIGGER trg_protect_invoiced_freelance_time_logs
  BEFORE UPDATE OR DELETE ON public.freelance_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_invoiced_freelance_time_logs();

-- ----------------------------------------------------------------------------
-- 7.7c Extend freelance_invoices (FX to DZD, 6.1 link, recurrence, currency lock)
-- ----------------------------------------------------------------------------
ALTER TABLE public.freelance_invoices
  ADD COLUMN IF NOT EXISTS fx_rate_to_dzd numeric(12,4) NOT NULL DEFAULT 1 CHECK (fx_rate_to_dzd > 0),
  ADD COLUMN IF NOT EXISTS total_amount_dzd_centimes bigint NOT NULL DEFAULT 0 CHECK (total_amount_dzd_centimes >= 0),
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_interval text,
  ADD COLUMN IF NOT EXISTS next_recurrence_date date,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_freelance_invoices_recurrence_interval') THEN
    ALTER TABLE public.freelance_invoices
      ADD CONSTRAINT chk_freelance_invoices_recurrence_interval
      CHECK (recurrence_interval IS NULL OR recurrence_interval IN ('weekly', 'monthly', 'quarterly', 'yearly'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_protect_issued_freelance_invoice_currency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'Draft' THEN
    IF NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.fx_rate_to_dzd IS DISTINCT FROM OLD.fx_rate_to_dzd
    THEN
      RAISE EXCEPTION 'NON_DRAFT_INVOICE_CURRENCY_LOCKED' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_issued_freelance_invoice_currency ON public.freelance_invoices;
CREATE TRIGGER trg_protect_issued_freelance_invoice_currency
  BEFORE UPDATE ON public.freelance_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_issued_freelance_invoice_currency();

-- ----------------------------------------------------------------------------
-- 7.7d Extend freelance_active_timers (Cross-device sync, client & heartbeat)
-- ----------------------------------------------------------------------------
ALTER TABLE public.freelance_active_timers
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS project_title text,
  ADD COLUMN IF NOT EXISTS deliverable_title text,
  ADD COLUMN IF NOT EXISTS is_billable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_pomodoro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pomodoro_remaining_seconds int NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS pomodoro_mode text NOT NULL DEFAULT 'work',
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source_device_id text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_freelance_active_timers_pomo_mode') THEN
    ALTER TABLE public.freelance_active_timers
      ADD CONSTRAINT chk_freelance_active_timers_pomo_mode CHECK (pomodoro_mode IN ('work', 'break'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_freelance_active_timer_branch_running
  ON public.freelance_active_timers (business_id, branch_id, COALESCE(staff_id, account_id))
  WHERE deleted_at IS NULL AND is_running = true;

-- ----------------------------------------------------------------------------
-- 7.7e Extend freelance_expenses (Expense receipt attachment metadata)
-- ----------------------------------------------------------------------------
ALTER TABLE public.freelance_expenses
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS receipt_storage_path text,
  ADD COLUMN IF NOT EXISTS receipt_file_name text,
  ADD COLUMN IF NOT EXISTS receipt_mime_type text,
  ADD COLUMN IF NOT EXISTS receipt_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.7f Auto-Entrepreneur Threshold & Contribution Configs (Versioned + Unverified)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_auto_entrepreneur_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  annual_turnover_ceiling_dzd numeric(14,2) NOT NULL DEFAULT 5000000 CHECK (annual_turnover_ceiling_dzd > 0),
  contribution_rate_pct numeric(6,3) NOT NULL DEFAULT 5.0 CHECK (contribution_rate_pct >= 0 AND contribution_rate_pct <= 100),
  tax_rate_pct numeric(6,3) NOT NULL DEFAULT 0.5 CHECK (tax_rate_pct >= 0 AND tax_rate_pct <= 100),
  trade_specialty text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified')),
  verified_by text,
  verified_at timestamptz,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_freelance_ae_configs_effective
  ON public.freelance_auto_entrepreneur_configs (branch_id, effective_from DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.freelance_auto_entrepreneur_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freelance_auto_entrepreneur_configs' AND policyname = 'freelance_ae_configs_tenant_isolation'
  ) THEN
    CREATE POLICY freelance_ae_configs_tenant_isolation ON public.freelance_auto_entrepreneur_configs
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.7g Contract & NDA Templates (freelance_contract_templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  template_key text NOT NULL,
  category text NOT NULL DEFAULT 'service_agreement'
    CHECK (category IN ('service_agreement', 'nda', 'retainer_sow', 'translation_terms', 'photography_release')),
  title text NOT NULL,
  body_template text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system_preset boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.freelance_contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freelance_contract_templates' AND policyname = 'freelance_contract_templates_tenant_isolation'
  ) THEN
    CREATE POLICY freelance_contract_templates_tenant_isolation ON public.freelance_contract_templates
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.7h Client Contracts & E-Signature Tracking (freelance_client_contracts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  client_id uuid REFERENCES public.freelance_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  template_id uuid REFERENCES public.freelance_contract_templates(id) ON DELETE SET NULL,
  contract_number text NOT NULL,
  category text NOT NULL DEFAULT 'service_agreement',
  title text NOT NULL,
  rendered_body text NOT NULL,
  currency text NOT NULL DEFAULT 'DZD',
  contract_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (contract_value >= 0),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
  signed_at timestamptz,
  signer_name text,
  signature_hash text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_freelance_client_contracts_client
  ON public.freelance_client_contracts (branch_id, client_id, effective_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.freelance_client_contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freelance_client_contracts' AND policyname = 'freelance_client_contracts_tenant_isolation'
  ) THEN
    CREATE POLICY freelance_client_contracts_tenant_isolation ON public.freelance_client_contracts
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.7i Sworn Translator Register & Pricing (freelance_translation_registers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_translation_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  register_number text NOT NULL,
  client_id uuid REFERENCES public.freelance_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  source_language text NOT NULL,
  target_language text NOT NULL,
  document_title text NOT NULL,
  certification_kind text NOT NULL DEFAULT 'sworn_official'
    CHECK (certification_kind IN ('sworn_official', 'certified_copy', 'apostille_prep', 'standard')),
  pricing_unit text NOT NULL DEFAULT 'page' CHECK (pricing_unit IN ('word', 'page', 'fixed')),
  unit_count numeric(10,2) NOT NULL DEFAULT 1 CHECK (unit_count > 0),
  unit_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'DZD',
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  sworn_seal_ref text,
  invoice_id uuid REFERENCES public.freelance_invoices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'logged' CHECK (status IN ('logged', 'certified', 'billed', 'delivered')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_freelance_translation_reg_num
  ON public.freelance_translation_registers (branch_id, register_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.freelance_translation_registers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freelance_translation_registers' AND policyname = 'freelance_translation_registers_tenant_isolation'
  ) THEN
    CREATE POLICY freelance_translation_registers_tenant_isolation ON public.freelance_translation_registers
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.7j Photographer Shoot Scheduling & Gallery (freelance_photo_shoots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_photo_shoots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  client_id uuid REFERENCES public.freelance_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  shoot_title text NOT NULL,
  location text,
  shoot_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  package_name text,
  package_fee numeric(14,2) NOT NULL DEFAULT 0 CHECK (package_fee >= 0),
  currency text NOT NULL DEFAULT 'DZD',
  gallery_url text,
  gallery_status text NOT NULL DEFAULT 'scheduled'
    CHECK (gallery_status IN ('scheduled', 'shot', 'editing', 'proofing', 'watermarked_preview', 'final_delivered', 'cancelled')),
  deliverables_count int NOT NULL DEFAULT 0 CHECK (deliverables_count >= 0),
  selected_count int NOT NULL DEFAULT 0 CHECK (selected_count >= 0),
  watermark_enabled boolean NOT NULL DEFAULT true,
  invoice_id uuid REFERENCES public.freelance_invoices(id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_freelance_photo_shoots_window CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_freelance_photo_shoots_date
  ON public.freelance_photo_shoots (branch_id, shoot_date, start_time)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.fn_guard_freelance_photo_shoot_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.gallery_status <> 'cancelled' THEN
    IF EXISTS (
      SELECT 1
      FROM public.freelance_photo_shoots s
      WHERE s.id <> NEW.id
        AND s.branch_id = NEW.branch_id
        AND s.deleted_at IS NULL
        AND s.gallery_status <> 'cancelled'
        AND s.shoot_date = NEW.shoot_date
        AND s.start_time < NEW.end_time
        AND s.end_time > NEW.start_time
    ) THEN
      RAISE EXCEPTION 'PHOTO_SHOOT_TIME_CONFLICT' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_freelance_photo_shoot_overlap ON public.freelance_photo_shoots;
CREATE TRIGGER trg_guard_freelance_photo_shoot_overlap
  BEFORE INSERT OR UPDATE ON public.freelance_photo_shoots
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_freelance_photo_shoot_overlap();

ALTER TABLE public.freelance_photo_shoots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freelance_photo_shoots' AND policyname = 'freelance_photo_shoots_tenant_isolation'
  ) THEN
    CREATE POLICY freelance_photo_shoots_tenant_isolation ON public.freelance_photo_shoots
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.7k SECURITY DEFINER RPCs: Cross-Device Timer + Midnight Split & Un-invoicing
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_freelance_active_timer(
  p_account_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_staff_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_client_name text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_project_title text DEFAULT NULL,
  p_deliverable_id uuid DEFAULT NULL,
  p_deliverable_title text DEFAULT NULL,
  p_task_description text DEFAULT '',
  p_started_at timestamptz DEFAULT now(),
  p_accumulated_seconds int DEFAULT 0,
  p_is_running boolean DEFAULT true,
  p_is_paused boolean DEFAULT false,
  p_is_billable boolean DEFAULT true,
  p_is_pomodoro boolean DEFAULT false,
  p_pomodoro_remaining_seconds int DEFAULT 1500,
  p_pomodoro_mode text DEFAULT 'work',
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_key uuid := COALESCE(p_staff_id, p_account_id);
  v_timer public.freelance_active_timers%ROWTYPE;
BEGIN
  IF NOT (SELECT public.has_branch_access(p_business_id, p_branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_timer
  FROM public.freelance_active_timers
  WHERE business_id = p_business_id
    AND branch_id = p_branch_id
    AND COALESCE(staff_id, account_id) = v_owner_key
    AND deleted_at IS NULL
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.freelance_active_timers (
      account_id, business_id, branch_id, staff_id,
      client_id, client_name, project_id, project_title,
      deliverable_id, deliverable_title, task_description,
      started_at, accumulated_seconds, is_running, is_paused,
      is_billable, is_pomodoro, pomodoro_remaining_seconds, pomodoro_mode,
      last_heartbeat_at, source_device_id, device_id
    ) VALUES (
      p_account_id, p_business_id, p_branch_id, p_staff_id,
      p_client_id, p_client_name, p_project_id, p_project_title,
      p_deliverable_id, p_deliverable_title, COALESCE(p_task_description, ''),
      COALESCE(p_started_at, now()), GREATEST(0, COALESCE(p_accumulated_seconds, 0)),
      COALESCE(p_is_running, true), COALESCE(p_is_paused, false),
      COALESCE(p_is_billable, true), COALESCE(p_is_pomodoro, false),
      GREATEST(0, COALESCE(p_pomodoro_remaining_seconds, 1500)),
      CASE WHEN p_pomodoro_mode = 'break' THEN 'break' ELSE 'work' END,
      now(), p_device_id, p_device_id
    )
    RETURNING * INTO v_timer;
  ELSE
    UPDATE public.freelance_active_timers
    SET client_id = COALESCE(p_client_id, client_id),
        client_name = COALESCE(p_client_name, client_name),
        project_id = COALESCE(p_project_id, project_id),
        project_title = COALESCE(p_project_title, project_title),
        deliverable_id = p_deliverable_id,
        deliverable_title = p_deliverable_title,
        task_description = COALESCE(p_task_description, task_description),
        started_at = COALESCE(p_started_at, started_at),
        accumulated_seconds = GREATEST(0, COALESCE(p_accumulated_seconds, 0)),
        is_running = COALESCE(p_is_running, true),
        is_paused = COALESCE(p_is_paused, false),
        is_billable = COALESCE(p_is_billable, true),
        is_pomodoro = COALESCE(p_is_pomodoro, false),
        pomodoro_remaining_seconds = GREATEST(0, COALESCE(p_pomodoro_remaining_seconds, pomodoro_remaining_seconds)),
        pomodoro_mode = CASE WHEN p_pomodoro_mode IN ('work', 'break') THEN p_pomodoro_mode ELSE pomodoro_mode END,
        last_heartbeat_at = now(),
        source_device_id = COALESCE(p_device_id, source_device_id),
        device_id = COALESCE(p_device_id, device_id),
        updated_at = now()
    WHERE id = v_timer.id
    RETURNING * INTO v_timer;
  END IF;

  RETURN to_jsonb(v_timer);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_freelance_active_timer(uuid, uuid, uuid, uuid, uuid, text, uuid, text, uuid, text, text, timestamptz, int, boolean, boolean, boolean, boolean, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_freelance_active_timer(uuid, uuid, uuid, uuid, uuid, text, uuid, text, uuid, text, text, timestamptz, int, boolean, boolean, boolean, boolean, int, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stop_freelance_active_timer(
  p_timer_id uuid,
  p_stop_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_timer public.freelance_active_timers%ROWTYPE;
  v_stop_ts timestamptz := COALESCE(p_stop_at, now());
  v_live_delta int := 0;
  v_total_seconds int := 0;
  v_effective_start timestamptz;
  v_cursor timestamptz;
  v_next_midnight timestamptz;
  v_seg_end timestamptz;
  v_seg_seconds int;
  v_split_group text := 'split_' || replace(gen_random_uuid()::text, '-', '');
  v_rate numeric(12,2) := 0;
  v_currency text := 'DZD';
  v_created_ids uuid[] := ARRAY[]::uuid[];
  v_new_log_id uuid;
BEGIN
  SELECT * INTO v_timer
  FROM public.freelance_active_timers
  WHERE id = p_timer_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TIMER_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_timer.business_id, v_timer.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF NOT v_timer.is_paused AND v_timer.is_running AND v_timer.started_at IS NOT NULL THEN
    v_live_delta := GREATEST(0, floor(extract(epoch FROM (v_stop_ts - v_timer.started_at)))::int);
  END IF;

  v_total_seconds := GREATEST(0, COALESCE(v_timer.accumulated_seconds, 0) + v_live_delta);

  IF v_total_seconds >= 10 AND v_timer.client_id IS NOT NULL AND v_timer.project_id IS NOT NULL THEN
    SELECT COALESCE(hourly_rate, 0), COALESCE(currency, 'DZD')
    INTO v_rate, v_currency
    FROM public.freelance_clients
    WHERE id = v_timer.client_id;

    v_effective_start := v_stop_ts - make_interval(secs => v_total_seconds);
    v_cursor := v_effective_start;

    WHILE v_cursor < v_stop_ts LOOP
      v_next_midnight := date_trunc('day', v_cursor AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + interval '1 day';
      v_seg_end := LEAST(v_stop_ts, v_next_midnight);
      v_seg_seconds := GREATEST(1, floor(extract(epoch FROM (v_seg_end - v_cursor)))::int);

      INSERT INTO public.freelance_time_logs (
        account_id, business_id, branch_id, staff_id,
        client_id, client_name, project_id, project_title, deliverable_id,
        task_description, duration_seconds, is_billable, is_invoiced,
        rate_at_moment, currency, date, started_at, ended_at, split_group_id
      ) VALUES (
        v_timer.account_id, v_timer.business_id, v_timer.branch_id, v_timer.staff_id,
        v_timer.client_id, COALESCE(v_timer.client_name, 'Client'),
        v_timer.project_id, COALESCE(v_timer.project_title, 'Project'),
        v_timer.deliverable_id,
        COALESCE(NULLIF(v_timer.task_description, ''), 'Focus session'),
        v_seg_seconds, v_timer.is_billable, false,
        v_rate, v_currency, (v_cursor AT TIME ZONE 'UTC')::date,
        v_cursor, v_seg_end, v_split_group
      )
      RETURNING id INTO v_new_log_id;

      v_created_ids := array_append(v_created_ids, v_new_log_id);
      v_cursor := v_seg_end;
    END LOOP;
  END IF;

  UPDATE public.freelance_active_timers
  SET is_running = false,
      is_paused = false,
      accumulated_seconds = 0,
      last_heartbeat_at = now(),
      updated_at = now()
  WHERE id = v_timer.id;

  RETURN jsonb_build_object(
    'timer_id', v_timer.id,
    'total_seconds', v_total_seconds,
    'segments_created', COALESCE(array_length(v_created_ids, 1), 0),
    'log_ids', v_created_ids,
    'split_group_id', v_split_group
  );
END;
$$;

REVOKE ALL ON FUNCTION public.stop_freelance_active_timer(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stop_freelance_active_timer(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.uninvoice_freelance_invoice_logs(
  p_invoice_id uuid,
  p_time_log_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv public.freelance_invoices%ROWTYPE;
  v_updated_count int := 0;
BEGIN
  SELECT * INTO v_inv
  FROM public.freelance_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_inv.business_id, v_inv.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF p_time_log_ids IS NOT NULL AND array_length(p_time_log_ids, 1) > 0 THEN
    PERFORM set_config('app.uninvoice_time_log_tx', '1', true);
    UPDATE public.freelance_time_logs
    SET is_invoiced = false,
        updated_at = now()
    WHERE id = ANY(p_time_log_ids)
      AND branch_id = v_inv.branch_id
      AND deleted_at IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    PERFORM set_config('app.uninvoice_time_log_tx', '', true);
  END IF;

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'uninvoiced_count', v_updated_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.uninvoice_freelance_invoice_logs(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uninvoice_freelance_invoice_logs(uuid, uuid[]) TO authenticated;

-- Attach optimistic & audit triggers when present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'freelance_auto_entrepreneur_configs',
      'freelance_contract_templates',
      'freelance_client_contracts',
      'freelance_translation_registers',
      'freelance_photo_shoots'
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
      'freelance_auto_entrepreneur_configs',
      'freelance_contract_templates',
      'freelance_client_contracts',
      'freelance_translation_registers',
      'freelance_photo_shoots'
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
