-- ============================================================================
-- Atrium Phase 3 Step 13 (7.13 legal_accounting): Legal, Notary & Advisory Depth
--   - Sequence extensions: legal_inv (HNR), legal_bailiff (HUI), legal_arb (ARB),
--     legal_tpl (TPL), legal_ledger (EXP)
--   - Guarded private Storage bucket: legal-vault (15 MB max, PDF/Image/DOCX)
--   - Matter confidentiality scoping, conflict-of-interest check & client portal
--   - Real legal_time_entries vs scf_journal separation & TVA fee invoice RPC
--   - legal_documents vault metadata, SHA-256 digest & SVG e-signature columns
--   - Persistent holiday calendars & bulk CPCA deadline recalculation RPC
--   - Server-side guarded escrow release RPC & CARPA reconciliation ledger
--   - Document templates, Bailiff significations/PVs, Arbitration timelines,
--     and Multi-client advisory books / G50 liasse preparation tables
--   - Tenant+Branch RLS, Optimistic Versioning & Integrity Triggers
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Extend sequence_counters doc_type CHECK & allocate_sequence_number RPC
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.sequence_counters'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%doc_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.sequence_counters DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.sequence_counters
  ADD CONSTRAINT chk_sequence_counters_doc_type
  CHECK (
    doc_type IN (
      'z_report',
      'walk_in_ticket',
      'deposit_receipt',
      'payroll_run',
      'ncr',
      'inspection',
      'quote',
      'order',
      'delivery_note',
      'invoice',
      'credit_note',
      'receipt',
      'proforma',
      'payment',
      'journal_entry',
      'quittance',
      're_mandate',
      're_lease',
      're_fund_call',
      'mfg_alert',
      'mfg_maint',
      'mfg_fg_lot',
      'mfg_cut',
      'legal_inv',
      'legal_bailiff',
      'legal_arb',
      'legal_tpl',
      'legal_ledger'
    )
  );

CREATE OR REPLACE FUNCTION public._sequence_prefix(p_doc_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_doc_type
    WHEN 'z_report' THEN 'Z'
    WHEN 'walk_in_ticket' THEN 'WI'
    WHEN 'deposit_receipt' THEN 'DR'
    WHEN 'payroll_run' THEN 'PAY'
    WHEN 'ncr' THEN 'NCR'
    WHEN 'inspection' THEN 'INSP'
    WHEN 'quote' THEN 'DEV'
    WHEN 'order' THEN 'BC'
    WHEN 'delivery_note' THEN 'BL'
    WHEN 'invoice' THEN 'FAC'
    WHEN 'credit_note' THEN 'AV'
    WHEN 'receipt' THEN 'REC'
    WHEN 'proforma' THEN 'PRO'
    WHEN 'payment' THEN 'REG'
    WHEN 'journal_entry' THEN 'EC'
    WHEN 'quittance' THEN 'QTC'
    WHEN 're_mandate' THEN 'MND'
    WHEN 're_lease' THEN 'BAIL'
    WHEN 're_fund_call' THEN 'APP'
    WHEN 'mfg_alert' THEN 'ANDN'
    WHEN 'mfg_maint' THEN 'MNT'
    WHEN 'mfg_fg_lot' THEN 'PFG'
    WHEN 'mfg_cut' THEN 'CUT'
    WHEN 'legal_inv' THEN 'HNR'
    WHEN 'legal_bailiff' THEN 'HUI'
    WHEN 'legal_arb' THEN 'ARB'
    WHEN 'legal_tpl' THEN 'TPL'
    WHEN 'legal_ledger' THEN 'EXP'
    ELSE 'DOC'
  END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_sequence_number(
  p_business_id uuid,
  p_branch_id uuid,
  p_doc_type text,
  p_fiscal_year smallint DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_branch_business_id uuid;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_counter_id uuid;
  v_next_number bigint;
  v_prefix text;
  v_formatted text;
  v_year smallint := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::smallint);
BEGIN
  IF p_business_id IS NULL OR p_branch_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SEQUENCE_CONTEXT' USING ERRCODE = '22023';
  END IF;

  IF p_doc_type NOT IN (
    'z_report', 'walk_in_ticket', 'deposit_receipt', 'payroll_run', 'ncr', 'inspection',
    'quote', 'order', 'delivery_note', 'invoice', 'credit_note', 'receipt', 'proforma',
    'payment', 'journal_entry',
    'quittance', 're_mandate', 're_lease', 're_fund_call',
    'mfg_alert', 'mfg_maint', 'mfg_fg_lot', 'mfg_cut',
    'legal_inv', 'legal_bailiff', 'legal_arb', 'legal_tpl', 'legal_ledger'
  ) THEN
    RAISE EXCEPTION 'UNSUPPORTED_SEQUENCE_DOC_TYPE' USING ERRCODE = '22023';
  END IF;

  SELECT b.account_id, b.business_id
    INTO v_account_id, v_branch_business_id
  FROM public.branches b
  WHERE b.id = p_branch_id
    AND b.is_active = true
  LIMIT 1;

  IF v_account_id IS NULL
     OR v_branch_business_id IS DISTINCT FROM p_business_id
     OR v_caller_account_id IS DISTINCT FROM v_account_id
     OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SEQUENCE_ACCESS' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sequence_counters (
    account_id, business_id, branch_id, doc_type, fiscal_year, last_number
  ) VALUES (
    v_account_id, p_business_id, p_branch_id, p_doc_type, v_year, 0
  )
  ON CONFLICT (business_id, branch_id, doc_type, fiscal_year) DO NOTHING;

  SELECT sc.id, sc.last_number
    INTO v_counter_id, v_next_number
  FROM public.sequence_counters sc
  WHERE sc.business_id = p_business_id
    AND sc.branch_id = p_branch_id
    AND sc.doc_type = p_doc_type
    AND sc.fiscal_year = v_year
  FOR UPDATE;

  v_next_number := v_next_number + 1;

  UPDATE public.sequence_counters
  SET last_number = v_next_number,
      updated_at = now()
  WHERE id = v_counter_id;

  v_prefix := public._sequence_prefix(p_doc_type);
  v_formatted := format('%s-%s-%s', v_prefix, v_year, lpad(v_next_number::text, 5, '0'));

  RETURN jsonb_build_object(
    'doc_type', p_doc_type,
    'fiscal_year', v_year,
    'seq_number', v_next_number,
    'prefix', v_prefix,
    'formatted_number', v_formatted
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2) Guarded Private Storage Bucket (legal-vault)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'legal-vault',
      'legal-vault',
      false,
      15728640,
      ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Extend Existing legal_* Tables (Matters, Hearings, Time, Invoices, Vault)
-- ----------------------------------------------------------------------------
ALTER TABLE public.legal_matters
  ADD COLUMN IF NOT EXISTS confidentiality_level text NOT NULL DEFAULT 'Internal'
    CHECK (confidentiality_level IN ('PublicClient', 'Internal', 'Restricted', 'SecretDefense', 'NotarialMinute')),
  ADD COLUMN IF NOT EXISTS allowed_roles text[] NOT NULL DEFAULT ARRAY['avocat_associe', 'notaire_titulaire', 'expert_comptable']::text[],
  ADD COLUMN IF NOT EXISTS conflict_status text NOT NULL DEFAULT 'clear'
    CHECK (conflict_status IN ('clear', 'warning', 'conflict', 'overridden')),
  ADD COLUMN IF NOT EXISTS conflict_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS conflict_override_reason text,
  ADD COLUMN IF NOT EXISTS client_portal_token text,
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_arbitration boolean NOT NULL DEFAULT false;

ALTER TABLE public.legal_hearings
  ADD COLUMN IF NOT EXISTS original_requested_date date,
  ADD COLUMN IF NOT EXISTS auto_shifted_reason text,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_channel text;

ALTER TABLE public.legal_time_entries
  ADD COLUMN IF NOT EXISTS entry_kind text NOT NULL DEFAULT 'time'
    CHECK (entry_kind IN ('time', 'scf_journal')),
  ADD COLUMN IF NOT EXISTS matter_number text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS tva_rate numeric(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS amount_ht_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_id uuid,
  ADD COLUMN IF NOT EXISTS billed_at timestamptz;

UPDATE public.legal_time_entries
SET entry_kind = 'scf_journal'
WHERE description LIKE '__atrium_legal__:%'
  AND entry_kind <> 'scf_journal';

ALTER TABLE public.legal_invoices
  ADD COLUMN IF NOT EXISTS matter_number text,
  ADD COLUMN IF NOT EXISTS tva_rate numeric(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS timbre_dzd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ttc_centimes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_entry_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS disbursement_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS vault_code text,
  ADD COLUMN IF NOT EXISTS matter_reference text,
  ADD COLUMN IF NOT EXISTS role_scope text NOT NULL DEFAULT 'avocat'
    CHECK (role_scope IN ('avocat', 'notaire', 'comptable', 'secretaire')),
  ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'OriginalScanned'
    CHECK (vault_status IN ('OriginalScanned', 'Confidential', 'MinuteOfficielle', 'DossierAudit', 'PieceClient')),
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS sha256_hash text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS official_seal_number text,
  ADD COLUMN IF NOT EXISTS cadastral_volume text,
  ADD COLUMN IF NOT EXISTS cadastral_number text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS rendered_body text,
  ADD COLUMN IF NOT EXISTS signature_svg text,
  ADD COLUMN IF NOT EXISTS signed_by_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_portal_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_date date;

-- ----------------------------------------------------------------------------
-- 4) Holiday Calendar Table (CPCA Art. 405 & Hearing Holiday Guard)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_holiday_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  holiday_date date NOT NULL,
  label text NOT NULL,
  label_ar text,
  holiday_kind text NOT NULL DEFAULT 'islamic'
    CHECK (holiday_kind IN ('fixed', 'islamic', 'judicial', 'custom')),
  is_active boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_holiday_calendars_branch_date
  ON public.legal_holiday_calendars (branch_id, holiday_date)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5) Escrow Accounts Ledger & CARPA Reconciliation (legal_escrow_accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_escrow_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  matter_reference text NOT NULL,
  client_name text NOT NULL,
  beneficiary_name text NOT NULL,
  bank_account_ref text,
  bank_statement_balance_centimes bigint NOT NULL DEFAULT 0 CHECK (bank_statement_balance_centimes >= 0),
  total_deposited_centimes bigint NOT NULL DEFAULT 0 CHECK (total_deposited_centimes >= 0),
  total_disbursed_centimes bigint NOT NULL DEFAULT 0 CHECK (total_disbursed_centimes >= 0),
  current_balance_centimes bigint NOT NULL DEFAULT 0 CHECK (current_balance_centimes >= 0),
  is_locked boolean NOT NULL DEFAULT true,
  cadastral_volume text,
  cadastral_number text,
  cadastral_recorded_at date,
  release_pin_hash text,
  reconciled_at timestamptz,
  transactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_legal_escrow_accounts_branch
  ON public.legal_escrow_accounts (branch_id, is_locked)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 6) Document Templates & E-Signature Registry (legal_doc_templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_doc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  title text NOT NULL,
  title_ar text,
  template_type text NOT NULL DEFAULT 'mise_en_demeure'
    CHECK (template_type IN ('mise_en_demeure', 'requete', 'conclusions', 'procuration', 'bail', 'quittance', 'custom')),
  body_template text NOT NULL,
  variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_system boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 7) Bailiff Significations & PV Acts (legal_bailiff_acts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_bailiff_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  act_number text NOT NULL,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  matter_number text,
  act_kind text NOT NULL DEFAULT 'signification'
    CHECK (act_kind IN ('signification', 'constat', 'commandement', 'saisie_execution', 'expulsion')),
  bailiff_name text NOT NULL,
  recipient_name text NOT NULL,
  service_mode text NOT NULL DEFAULT 'a_personne'
    CHECK (service_mode IN ('a_personne', 'a_domicile', 'mairie', 'parquet', 'refus')),
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  linked_cpca_deadline_id uuid REFERENCES public.legal_deadlines(id) ON DELETE SET NULL,
  pv_summary text,
  status text NOT NULL DEFAULT 'served'
    CHECK (status IN ('draft', 'served', 'pv_logged', 'returned_unserved')),
  fee_centimes bigint NOT NULL DEFAULT 0 CHECK (fee_centimes >= 0),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 8) Arbitration Case Timelines (legal_arbitration_timelines)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_arbitration_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  case_code text NOT NULL,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  matter_number text,
  arbitration_seat text NOT NULL DEFAULT 'Alger',
  rules_framework text NOT NULL DEFAULT 'CPCA Art. 1006+ / CCI',
  tribunal_chair text,
  claimant_name text NOT NULL,
  respondent_name text NOT NULL,
  amount_in_dispute_centimes bigint NOT NULL DEFAULT 0 CHECK (amount_in_dispute_centimes >= 0),
  phase text NOT NULL DEFAULT 'tribunal_constitution',
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  award_due_date date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'award_rendered', 'exequatur', 'closed')),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 9) Multi-Client Accounting Books & G50/Liasse (legal_client_ledgers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_client_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  dossier_code text NOT NULL,
  client_id uuid REFERENCES public.legal_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_nif text,
  fiscal_regime text NOT NULL DEFAULT 'Reel' CHECK (fiscal_regime IN ('Reel', 'IFU', 'Liberal')),
  fiscal_period text NOT NULL,
  tva_collectee_centimes bigint NOT NULL DEFAULT 0 CHECK (tva_collectee_centimes >= 0),
  tva_deductible_centimes bigint NOT NULL DEFAULT 0 CHECK (tva_deductible_centimes >= 0),
  credit_tva_anterieur_centimes bigint NOT NULL DEFAULT 0 CHECK (credit_tva_anterieur_centimes >= 0),
  tva_net_due_centimes bigint NOT NULL DEFAULT 0 CHECK (tva_net_due_centimes >= 0),
  tap_base_centimes bigint NOT NULL DEFAULT 0 CHECK (tap_base_centimes >= 0),
  irg_salaires_centimes bigint NOT NULL DEFAULT 0 CHECK (irg_salaires_centimes >= 0),
  ibs_acompte_centimes bigint NOT NULL DEFAULT 0 CHECK (ibs_acompte_centimes >= 0),
  timbre_fiscal_centimes bigint NOT NULL DEFAULT 0 CHECK (timbre_fiscal_centimes >= 0),
  total_g50_due_centimes bigint NOT NULL DEFAULT 0 CHECK (total_g50_due_centimes >= 0),
  trial_balance_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  g50_status text NOT NULL DEFAULT 'draft' CHECK (g50_status IN ('draft', 'validated', 'filed_dgi', 'paid')),
  liasse_ready boolean NOT NULL DEFAULT false,
  filed_at timestamptz,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_legal_client_ledgers_branch_period
  ON public.legal_client_ledgers (branch_id, fiscal_period, g50_status)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 10) Server-Side Guarded RPCs (Escrow Release, CPCA Recalc, Time Billing)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.legal_release_escrow_guarded(
  p_escrow_id uuid,
  p_payout_centimes bigint,
  p_pin_entered text,
  p_required_pin text DEFAULT NULL,
  p_require_cadastre boolean DEFAULT true,
  p_actor_name text DEFAULT 'Maître',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
  v_expected_pin text;
  v_new_balance bigint;
  v_tx jsonb;
BEGIN
  SELECT * INTO v_row
  FROM public.legal_escrow_accounts
  WHERE id = p_escrow_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ESCROW_ACCOUNT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_branch(v_row.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF p_payout_centimes IS NULL OR p_payout_centimes <= 0 THEN
    RAISE EXCEPTION 'INVALID_ESCROW_PAYOUT_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF p_payout_centimes > v_row.current_balance_centimes THEN
    RAISE EXCEPTION 'INSUFFICIENT_ESCROW_BALANCE' USING ERRCODE = '23514';
  END IF;

  IF p_require_cadastre AND (COALESCE(btrim(v_row.cadastral_volume), '') = '' OR COALESCE(btrim(v_row.cadastral_number), '') = '') THEN
    RAISE EXCEPTION 'CADASTRE_CLEARANCE_REQUIRED' USING ERRCODE = '23514';
  END IF;

  v_expected_pin := NULLIF(btrim(COALESCE(v_row.release_pin_hash, p_required_pin)), '');
  IF v_expected_pin IS NULL OR NULLIF(btrim(p_pin_entered), '') IS DISTINCT FROM v_expected_pin THEN
    RAISE EXCEPTION 'INVALID_ESCROW_PIN' USING ERRCODE = '42501';
  END IF;

  v_new_balance := v_row.current_balance_centimes - p_payout_centimes;
  v_tx := jsonb_build_object(
    'id', format('tx_%s', extract(epoch from clock_timestamp())::bigint),
    'escrowAccountId', v_row.id,
    'date', CURRENT_DATE::text,
    'type', 'seller_final_payout',
    'amountDzd', round(p_payout_centimes::numeric / 100.0, 2),
    'paymentMode', 'virement_bancaire',
    'bankReference', format('VIR-ESC-%s', substr(replace(v_row.id::text, '-', ''), 1, 6)),
    'authorizedByStaff', COALESCE(NULLIF(p_actor_name, ''), 'Maître'),
    'notes', COALESCE(p_notes, 'Déblocage séquestre contrôlé côté serveur')
  );

  UPDATE public.legal_escrow_accounts
  SET current_balance_centimes = v_new_balance,
      total_disbursed_centimes = total_disbursed_centimes + p_payout_centimes,
      is_locked = (v_new_balance > 0),
      transactions = jsonb_build_array(v_tx) || COALESCE(transactions, '[]'::jsonb),
      updated_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'escrow_id', v_row.id,
    'released_centimes', p_payout_centimes,
    'remaining_balance_centimes', v_new_balance,
    'is_locked', (v_new_balance > 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_recalculate_deadlines_on_holidays(
  p_branch_id uuid,
  p_holiday_dates date[] DEFAULT ARRAY[]::date[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dl record;
  v_candidate date;
  v_dow int;
  v_mmdd text;
  v_changed int := 0;
BEGIN
  IF p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  FOR v_dl IN
    SELECT id, due_date, deadline_type
    FROM public.legal_deadlines
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL
      AND is_completed = false
    FOR UPDATE
  LOOP
    v_candidate := v_dl.due_date;
    LOOP
      v_dow := EXTRACT(DOW FROM v_candidate)::int; -- 5=Fri, 6=Sat
      v_mmdd := to_char(v_candidate, 'MM-DD');
      EXIT WHEN v_dow NOT IN (5, 6)
        AND v_mmdd NOT IN ('01-01', '05-01', '07-05', '11-01')
        AND NOT (v_candidate = ANY(COALESCE(p_holiday_dates, ARRAY[]::date[])));
      v_candidate := v_candidate + 1;
    END LOOP;

    IF v_candidate IS DISTINCT FROM v_dl.due_date THEN
      UPDATE public.legal_deadlines
      SET due_date = v_candidate,
          updated_at = now()
      WHERE id = v_dl.id;
      v_changed := v_changed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('branch_id', p_branch_id, 'recalculated_count', v_changed);
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_generate_fee_invoice_from_time_entries(
  p_business_id uuid,
  p_branch_id uuid,
  p_matter_id uuid,
  p_client_name text,
  p_time_entry_ids uuid[],
  p_tva_rate numeric DEFAULT 19,
  p_disbursement_centimes bigint DEFAULT 0,
  p_payment_method text DEFAULT 'virement'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_entry record;
  v_fees_ht_centimes bigint := 0;
  v_tva_centimes bigint := 0;
  v_timbre_centimes bigint := 0;
  v_ttc_centimes bigint := 0;
  v_inv_id uuid := gen_random_uuid();
  v_inv_num text;
  v_matter_num text := '';
  v_lines jsonb := '[]'::jsonb;
  v_matched_count int := 0;
BEGIN
  IF p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF p_time_entry_ids IS NULL OR array_length(p_time_entry_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_TIME_ENTRIES_SELECTED' USING ERRCODE = '22023';
  END IF;

  SELECT account_id INTO v_account_id
  FROM public.branches WHERE id = p_branch_id LIMIT 1;

  IF p_matter_id IS NOT NULL THEN
    SELECT matter_number INTO v_matter_num
    FROM public.legal_matters WHERE id = p_matter_id AND deleted_at IS NULL LIMIT 1;
  END IF;

  FOR v_entry IN
    SELECT *
    FROM public.legal_time_entries
    WHERE id = ANY(p_time_entry_ids)
      AND branch_id = p_branch_id
      AND deleted_at IS NULL
    FOR UPDATE
  LOOP
    IF v_entry.entry_kind <> 'time' OR v_entry.is_billable = false THEN
      RAISE EXCEPTION 'NON_BILLABLE_TIME_ENTRY' USING ERRCODE = '23514';
    END IF;
    IF v_entry.is_billed THEN
      RAISE EXCEPTION 'TIME_ENTRY_ALREADY_BILLED' USING ERRCODE = '23514';
    END IF;

    v_matched_count := v_matched_count + 1;
    v_fees_ht_centimes := v_fees_ht_centimes + GREATEST(
      COALESCE(v_entry.amount_ht_centimes, 0),
      round((v_entry.duration_minutes::numeric / 60.0) * v_entry.hourly_rate_dzd * 100.0)::bigint
    );
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'entry_id', v_entry.id,
        'description', v_entry.description,
        'duration_minutes', v_entry.duration_minutes,
        'hourly_rate_dzd', v_entry.hourly_rate_dzd
      )
    );
  END LOOP;

  IF v_matched_count = 0 THEN
    RAISE EXCEPTION 'TIME_ENTRIES_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_tva_centimes := round(v_fees_ht_centimes::numeric * (COALESCE(p_tva_rate, 19) / 100.0))::bigint;
  IF p_payment_method = 'especes' THEN
    v_timbre_centimes := LEAST(250000, GREATEST(0, round((v_fees_ht_centimes + v_tva_centimes + GREATEST(0, COALESCE(p_disbursement_centimes, 0)))::numeric * 0.01)::bigint));
  END IF;
  v_ttc_centimes := v_fees_ht_centimes + v_tva_centimes + GREATEST(0, COALESCE(p_disbursement_centimes, 0)) + v_timbre_centimes;

  v_inv_num := (public.allocate_sequence_number(p_business_id, p_branch_id, 'legal_inv'))->>'formatted_number';

  INSERT INTO public.legal_invoices (
    id, account_id, business_id, branch_id, invoice_number,
    matter_id, matter_number, client_name,
    fees_ht_dzd, disbursements_dzd, tva_dzd, timbre_dzd, total_ttc_dzd, total_ttc_centimes,
    tva_rate, line_items, time_entry_ids, status, issue_date
  ) VALUES (
    v_inv_id, v_account_id, p_business_id, p_branch_id, v_inv_num,
    p_matter_id, v_matter_num, p_client_name,
    round(v_fees_ht_centimes::numeric / 100.0, 2),
    round(GREATEST(0, COALESCE(p_disbursement_centimes, 0))::numeric / 100.0, 2),
    round(v_tva_centimes::numeric / 100.0, 2),
    round(v_timbre_centimes::numeric / 100.0, 2),
    round(v_ttc_centimes::numeric / 100.0, 2),
    v_ttc_centimes,
    COALESCE(p_tva_rate, 19),
    v_lines,
    p_time_entry_ids,
    'Sent',
    CURRENT_DATE
  );

  UPDATE public.legal_time_entries
  SET is_billed = true,
      invoice_id = v_inv_id,
      billed_at = now(),
      updated_at = now()
  WHERE id = ANY(p_time_entry_ids)
    AND branch_id = p_branch_id;

  RETURN jsonb_build_object(
    'invoice_id', v_inv_id,
    'invoice_number', v_inv_num,
    'fees_ht_centimes', v_fees_ht_centimes,
    'tva_centimes', v_tva_centimes,
    'timbre_centimes', v_timbre_centimes,
    'total_ttc_centimes', v_ttc_centimes,
    'billed_entries_count', v_matched_count
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 11) Enable RLS + Tenant+Branch Policies + Triggers on New Tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  v_new_tables text[] := ARRAY[
    'legal_holiday_calendars',
    'legal_escrow_accounts',
    'legal_doc_templates',
    'legal_bailiff_acts',
    'legal_arbitration_timelines',
    'legal_client_ledgers'
  ];
BEGIN
  FOREACH t IN ARRAY v_new_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'p_delete_' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (deleted_at IS NULL AND account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_select_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_insert_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id)) WITH CHECK (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_update_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (account_id = public.get_auth_account_id() AND public.can_access_branch(branch_id));',
      'p_delete_' || t, t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'trg_' || t || '_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_updated_at();',
      'trg_' || t || '_updated_at', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'trg_' || t || '_optimistic_version', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();',
      'trg_' || t || '_optimistic_version', t
    );
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.legal_release_escrow_guarded(uuid, bigint, text, text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_release_escrow_guarded(uuid, bigint, text, text, boolean, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.legal_recalculate_deadlines_on_holidays(uuid, date[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_recalculate_deadlines_on_holidays(uuid, date[]) TO authenticated;

REVOKE ALL ON FUNCTION public.legal_generate_fee_invoice_from_time_entries(uuid, uuid, uuid, text, uuid[], numeric, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_generate_fee_invoice_from_time_entries(uuid, uuid, uuid, text, uuid[], numeric, bigint, text) TO authenticated;

COMMIT;
