-- ============================================================================
-- Atrium Phase 2 Migration (Step 1): Sections 6.1 & 6.2
--   6.1 Unified Document & Invoicing Engine (deferred final numbering,
--       bigint centimes, multi-currency FX snapshot, immutability triggers,
--       issue_unified_document RPC)
--   6.2 Unified Payments Ledger & Post-Dated Instruments (cheques / traites,
--       multi-invoice allocations, idempotency, bounce reopening RPC)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.1a Extend server-side sequence_counters for fiscal/shared documents
-- Note: device_sequence_blocks remains strictly restricted to walk_in_ticket
-- and deposit_receipt (Phase 1 Confirmed Decision 3: fiscal invoices use
-- deferred final numbering via allocate_sequence_number only).
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
      'payment'
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
    'quote', 'order', 'delivery_note', 'invoice', 'credit_note', 'receipt', 'proforma', 'payment'
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
-- 6.1b Unified Documents Table (shared across verticals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  source_vertical text NOT NULL DEFAULT 'trading_commercial',
  doc_type text NOT NULL CHECK (
    doc_type IN ('devis', 'commande', 'bl', 'facture', 'avoir', 'retour', 'receipt', 'proforma')
  ),
  draft_number text NOT NULL,
  doc_number text,
  fiscal_year smallint NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint CHECK (fiscal_year BETWEEN 2000 AND 2100),
  status text NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Issued', 'PartiallyPaid', 'Paid', 'Delivered', 'Voided', 'Canceled')
  ),
  party_id text,
  party_name text NOT NULL,
  party_nif text,
  party_nis text,
  party_rc text,
  party_ai text,
  party_address text,
  party_phone text,
  depot_id text,
  depot_name text,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  validity_days int,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_terms text NOT NULL DEFAULT 'Comptant',
  currency text NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR', 'USD')),
  fx_rate numeric(14, 6) NOT NULL DEFAULT 1.000000 CHECK (fx_rate > 0),
  fx_rate_date date NOT NULL DEFAULT CURRENT_DATE,
  timbre_basis text NOT NULL DEFAULT 'commercial_cash' CHECK (timbre_basis IN ('commercial_cash', 'art_317', 'exempt')),
  rate_set_id uuid REFERENCES public.statutory_rates(id) ON DELETE RESTRICT,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tva_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_ht_raw_centimes bigint NOT NULL DEFAULT 0,
  general_discount_percent numeric(6, 3) NOT NULL DEFAULT 0,
  total_ht_final_centimes bigint NOT NULL DEFAULT 0,
  total_tva_centimes bigint NOT NULL DEFAULT 0,
  timbre_fiscal_centimes bigint NOT NULL DEFAULT 0,
  total_ttc_centimes bigint NOT NULL DEFAULT 0,
  guarantee_retention_percent numeric(6, 3) NOT NULL DEFAULT 0,
  guarantee_retention_centimes bigint NOT NULL DEFAULT 0,
  net_to_pay_centimes bigint NOT NULL DEFAULT 0,
  paid_centimes bigint NOT NULL DEFAULT 0 CHECK (paid_centimes >= 0),
  balance_due_centimes bigint NOT NULL DEFAULT 0 CHECK (balance_due_centimes >= 0),
  fiscal_header_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  totals_in_words_fr text,
  totals_in_words_ar text,
  include_stamp_signature boolean NOT NULL DEFAULT true,
  notes_top text,
  notes_bottom text,
  linked_doc_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  linked_doc_number text,
  credit_note_for_doc_id uuid REFERENCES public.unified_documents(id) ON DELETE SET NULL,
  source_entity_type text,
  source_entity_id text,
  issued_at timestamptz,
  issued_by_staff_id uuid,
  voided_at timestamptz,
  voided_reason text,
  printed_count int NOT NULL DEFAULT 0 CHECK (printed_count >= 0),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_unified_documents_number_active
  ON public.unified_documents (business_id, doc_type, fiscal_year, doc_number)
  WHERE doc_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_documents_branch_date
  ON public.unified_documents (business_id, branch_id, doc_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_documents_party
  ON public.unified_documents (business_id, party_id)
  WHERE deleted_at IS NULL AND party_id IS NOT NULL;

ALTER TABLE public.unified_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unified_documents_tenant_access" ON public.unified_documents;
CREATE POLICY "unified_documents_tenant_access"
  ON public.unified_documents
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

-- Immutability Trigger: Once Issued/PartiallyPaid/Paid/Delivered/Voided, lines,
-- numbers, currencies, FX, and calculated totals cannot be edited or deleted.
CREATE OR REPLACE FUNCTION public.fn_protect_immutable_unified_documents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_locked boolean := false;
  v_allowed_settlement_update boolean := false;
  v_allowed_print_update boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Issued', 'PartiallyPaid', 'Paid', 'Delivered', 'Voided') THEN
      RAISE EXCEPTION 'UNIFIED_DOC_IMMUTABLE'
        USING ERRCODE = '42501',
              DETAIL = 'Issued or settled fiscal documents cannot be deleted; issue a credit note (avoir) or void instead.';
    END IF;
    RETURN OLD;
  END IF;

  v_is_locked := OLD.status IN ('Issued', 'PartiallyPaid', 'Paid', 'Delivered', 'Voided');
  IF NOT v_is_locked THEN
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'UNIFIED_DOC_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Issued fiscal documents cannot be soft-deleted.';
  END IF;

  IF OLD.status = 'Voided' THEN
    RAISE EXCEPTION 'UNIFIED_DOC_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Voided fiscal documents are permanently immutable.';
  END IF;

  -- Structural & financial core must never drift after issuance
  IF NEW.account_id IS DISTINCT FROM OLD.account_id
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.doc_type IS DISTINCT FROM OLD.doc_type
     OR NEW.doc_number IS DISTINCT FROM OLD.doc_number
     OR NEW.fiscal_year IS DISTINCT FROM OLD.fiscal_year
     OR NEW.party_id IS DISTINCT FROM OLD.party_id
     OR NEW.party_name IS DISTINCT FROM OLD.party_name
     OR NEW.doc_date IS DISTINCT FROM OLD.doc_date
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.fx_rate IS DISTINCT FROM OLD.fx_rate
     OR NEW.items IS DISTINCT FROM OLD.items
     OR NEW.total_ht_raw_centimes IS DISTINCT FROM OLD.total_ht_raw_centimes
     OR NEW.total_ht_final_centimes IS DISTINCT FROM OLD.total_ht_final_centimes
     OR NEW.total_tva_centimes IS DISTINCT FROM OLD.total_tva_centimes
     OR NEW.timbre_fiscal_centimes IS DISTINCT FROM OLD.timbre_fiscal_centimes
     OR NEW.total_ttc_centimes IS DISTINCT FROM OLD.total_ttc_centimes
     OR NEW.guarantee_retention_centimes IS DISTINCT FROM OLD.guarantee_retention_centimes
     OR NEW.net_to_pay_centimes IS DISTINCT FROM OLD.net_to_pay_centimes THEN
    RAISE EXCEPTION 'UNIFIED_DOC_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Issued document totals, lines, FX rates, and document numbers are immutable; issue a credit note instead.';
  END IF;

  -- Allowed post-issue transitions: settlement balances, print counter, or voiding
  v_allowed_settlement_update :=
    NEW.status IN ('Issued', 'PartiallyPaid', 'Paid', 'Delivered', 'Voided');
  v_allowed_print_update := NEW.printed_count >= OLD.printed_count;

  IF NOT (v_allowed_settlement_update AND v_allowed_print_update) THEN
    RAISE EXCEPTION 'UNIFIED_DOC_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Invalid post-issuance transition on unified_documents.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_unified_documents_immutable ON public.unified_documents;
CREATE TRIGGER trg_00_unified_documents_immutable
  BEFORE UPDATE OR DELETE ON public.unified_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_unified_documents();

-- ----------------------------------------------------------------------------
-- 6.2 Unified Payments Ledger & Allocations (with Cheques / Traites)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  source_vertical text NOT NULL DEFAULT 'trading_commercial',
  party_id text,
  party_name text NOT NULL,
  payment_number text,
  method text NOT NULL CHECK (
    method IN ('cash', 'ccp', 'bank_transfer', 'cib', 'baridimob', 'cheque', 'traite', 'member_balance', 'credit')
  ),
  direction text NOT NULL DEFAULT 'inflow' CHECK (direction IN ('inflow', 'outflow')),
  amount_centimes bigint NOT NULL CHECK (amount_centimes > 0),
  unallocated_credit_centimes bigint NOT NULL DEFAULT 0 CHECK (unallocated_credit_centimes >= 0),
  currency text NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR', 'USD')),
  fx_rate numeric(14, 6) NOT NULL DEFAULT 1.000000 CHECK (fx_rate > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by_staff_id uuid,
  cash_session_id uuid REFERENCES public.pos_cash_sessions(id) ON DELETE SET NULL,
  idempotency_key text,
  status text NOT NULL DEFAULT 'posted' CHECK (
    status IN ('posted', 'pending_clearance', 'bounced', 'reversed')
  ),
  instrument_status text CHECK (
    instrument_status IS NULL OR instrument_status IN ('received', 'deposited', 'cleared', 'bounced')
  ),
  instrument_number text,
  instrument_bank text,
  instrument_due_date date,
  bounced_reason text,
  reversed_payment_id uuid REFERENCES public.unified_payments(id) ON DELETE SET NULL,
  reversal_reason text,
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_unified_payments_idempotency
  ON public.unified_payments (business_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_payments_branch_date
  ON public.unified_payments (business_id, branch_id, payment_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.unified_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unified_payments_tenant_access" ON public.unified_payments;
CREATE POLICY "unified_payments_tenant_access"
  ON public.unified_payments
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

CREATE TABLE IF NOT EXISTS public.unified_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.unified_payments(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.unified_documents(id) ON DELETE RESTRICT,
  allocated_centimes bigint NOT NULL CHECK (allocated_centimes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_unified_payment_allocations_payment
  ON public.unified_payment_allocations (payment_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unified_payment_allocations_document
  ON public.unified_payment_allocations (document_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.unified_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unified_payment_allocations_tenant_access" ON public.unified_payment_allocations;
CREATE POLICY "unified_payment_allocations_tenant_access"
  ON public.unified_payment_allocations
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

-- ----------------------------------------------------------------------------
-- RPC 1: issue_unified_document (deferred gap-free final numbering on issue)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_unified_document(
  p_doc_id uuid,
  p_fiscal_year smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doc public.unified_documents%ROWTYPE;
  v_seq_type text;
  v_seq jsonb;
  v_year smallint;
  v_doc_number text;
  v_staff_id uuid := public.get_auth_staff_id();
BEGIN
  SELECT * INTO v_doc
  FROM public.unified_documents
  WHERE id = p_doc_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNIFIED_DOC_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_doc.account_id IS DISTINCT FROM public.get_auth_account_id()
     OR NOT public.can_access_branch(v_doc.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_UNIFIED_DOC_ACCESS' USING ERRCODE = '42501';
  END IF;

  -- Idempotent return if already issued with an assigned fiscal doc_number
  IF v_doc.status IN ('Issued', 'PartiallyPaid', 'Paid', 'Delivered') AND v_doc.doc_number IS NOT NULL THEN
    RETURN jsonb_build_object(
      'document_id', v_doc.id,
      'doc_number', v_doc.doc_number,
      'fiscal_year', v_doc.fiscal_year,
      'status', v_doc.status,
      'idempotent', true
    );
  END IF;

  IF v_doc.status IN ('Voided', 'Canceled') THEN
    RAISE EXCEPTION 'CANNOT_ISSUE_VOIDED_OR_CANCELED_DOC' USING ERRCODE = '42501';
  END IF;

  v_year := COALESCE(p_fiscal_year, v_doc.fiscal_year, EXTRACT(YEAR FROM v_doc.doc_date)::smallint);
  v_seq_type := CASE v_doc.doc_type
    WHEN 'devis' THEN 'quote'
    WHEN 'commande' THEN 'order'
    WHEN 'bl' THEN 'delivery_note'
    WHEN 'facture' THEN 'invoice'
    WHEN 'avoir' THEN 'credit_note'
    WHEN 'retour' THEN 'credit_note'
    WHEN 'receipt' THEN 'receipt'
    WHEN 'proforma' THEN 'proforma'
    ELSE 'invoice'
  END;

  v_seq := public.allocate_sequence_number(v_doc.business_id, v_doc.branch_id, v_seq_type, v_year);
  v_doc_number := v_seq ->> 'formatted_number';

  UPDATE public.unified_documents
  SET doc_number = v_doc_number,
      fiscal_year = v_year,
      status = CASE WHEN v_doc.doc_type = 'bl' THEN 'Delivered' ELSE 'Issued' END,
      issued_at = COALESCE(issued_at, now()),
      issued_by_staff_id = COALESCE(issued_by_staff_id, v_staff_id),
      updated_at = now(),
      version = version + 1
  WHERE id = v_doc.id;

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'doc_number', v_doc_number,
    'fiscal_year', v_year,
    'status', CASE WHEN v_doc.doc_type = 'bl' THEN 'Delivered' ELSE 'Issued' END,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_unified_document(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_unified_document(uuid, smallint) TO authenticated;

-- ----------------------------------------------------------------------------
-- RPC 2: record_unified_payment_with_allocations (atomic + idempotent)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_unified_payment_with_allocations(
  p_payment_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_source_vertical text,
  p_party_id text,
  p_party_name text,
  p_method text,
  p_direction text,
  p_amount_centimes bigint,
  p_currency text,
  p_fx_rate numeric,
  p_payment_date date,
  p_idempotency_key text,
  p_allocations jsonb DEFAULT '[]'::jsonb,
  p_cash_session_id uuid DEFAULT NULL,
  p_instrument_number text DEFAULT NULL,
  p_instrument_bank text DEFAULT NULL,
  p_instrument_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_existing public.unified_payments%ROWTYPE;
  v_alloc_item jsonb;
  v_doc_id uuid;
  v_alloc_centimes bigint;
  v_total_allocated bigint := 0;
  v_doc public.unified_documents%ROWTYPE;
  v_next_paid bigint;
  v_next_balance bigint;
  v_next_status text;
  v_payment_number text;
  v_is_instrument boolean := p_method IN ('cheque', 'traite');
  v_initial_status text;
  v_instrument_status text;
BEGIN
  IF p_amount_centimes IS NULL OR p_amount_centimes <= 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_AMOUNT' USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PAYMENT_ACCESS' USING ERRCODE = '42501';
  END IF;

  -- Idempotent replay guard
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing
    FROM public.unified_payments
    WHERE business_id = p_business_id
      AND idempotency_key = p_idempotency_key
      AND deleted_at IS NULL
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'payment_id', v_existing.id,
        'payment_number', v_existing.payment_number,
        'status', v_existing.status,
        'idempotent', true
      );
    END IF;
  END IF;

  v_payment_number := (public.allocate_sequence_number(
    p_business_id,
    p_branch_id,
    'payment',
    EXTRACT(YEAR FROM COALESCE(p_payment_date, CURRENT_DATE))::smallint
  )) ->> 'formatted_number';

  v_initial_status := CASE WHEN v_is_instrument THEN 'pending_clearance' ELSE 'posted' END;
  v_instrument_status := CASE WHEN v_is_instrument THEN 'received' ELSE NULL END;

  INSERT INTO public.unified_payments (
    id, account_id, business_id, branch_id, source_vertical,
    party_id, party_name, payment_number, method, direction,
    amount_centimes, unallocated_credit_centimes, currency, fx_rate, payment_date,
    recorded_by_staff_id, cash_session_id, idempotency_key,
    status, instrument_status, instrument_number, instrument_bank, instrument_due_date, notes
  ) VALUES (
    COALESCE(p_payment_id, gen_random_uuid()),
    v_account_id,
    p_business_id,
    p_branch_id,
    COALESCE(p_source_vertical, 'trading_commercial'),
    p_party_id,
    COALESCE(NULLIF(trim(p_party_name), ''), 'Client'),
    v_payment_number,
    p_method,
    COALESCE(p_direction, 'inflow'),
    p_amount_centimes,
    0,
    COALESCE(p_currency, 'DZD'),
    COALESCE(p_fx_rate, 1.0),
    COALESCE(p_payment_date, CURRENT_DATE),
    v_staff_id,
    p_cash_session_id,
    NULLIF(trim(COALESCE(p_idempotency_key, '')), ''),
    v_initial_status,
    v_instrument_status,
    p_instrument_number,
    p_instrument_bank,
    p_instrument_due_date,
    p_notes
  )
  RETURNING * INTO v_existing;

  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) = 'array' THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_doc_id := (v_alloc_item ->> 'document_id')::uuid;
      v_alloc_centimes := (v_alloc_item ->> 'allocated_centimes')::bigint;
      IF v_alloc_centimes IS NULL OR v_alloc_centimes <= 0 THEN
        RAISE EXCEPTION 'INVALID_ALLOCATION_AMOUNT' USING ERRCODE = '22023';
      END IF;
      v_total_allocated := v_total_allocated + v_alloc_centimes;
      IF v_total_allocated > p_amount_centimes THEN
        RAISE EXCEPTION 'PAYMENT_ALLOCATION_EXCEEDS_AMOUNT' USING ERRCODE = '22023';
      END IF;

      SELECT * INTO v_doc
      FROM public.unified_documents
      WHERE id = v_doc_id
        AND business_id = p_business_id
        AND deleted_at IS NULL
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'ALLOCATED_DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0002';
      END IF;

      INSERT INTO public.unified_payment_allocations (
        account_id, business_id, branch_id, payment_id, document_id, allocated_centimes
      ) VALUES (
        v_account_id, p_business_id, p_branch_id, v_existing.id, v_doc_id, v_alloc_centimes
      );

      v_next_paid := LEAST(v_doc.net_to_pay_centimes, v_doc.paid_centimes + v_alloc_centimes);
      v_next_balance := GREATEST(0, v_doc.net_to_pay_centimes - v_next_paid);
      v_next_status := CASE
        WHEN v_next_balance = 0 THEN 'Paid'
        WHEN v_next_paid > 0 THEN 'PartiallyPaid'
        ELSE v_doc.status
      END;

      UPDATE public.unified_documents
      SET paid_centimes = v_next_paid,
          balance_due_centimes = v_next_balance,
          status = v_next_status,
          updated_at = now(),
          version = version + 1
      WHERE id = v_doc.id;
    END LOOP;
  END IF;

  IF p_amount_centimes > v_total_allocated THEN
    UPDATE public.unified_payments
    SET unallocated_credit_centimes = p_amount_centimes - v_total_allocated
    WHERE id = v_existing.id;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_existing.id,
    'payment_number', v_payment_number,
    'status', v_initial_status,
    'allocated_centimes', v_total_allocated,
    'unallocated_credit_centimes', GREATEST(0, p_amount_centimes - v_total_allocated),
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_unified_payment_with_allocations(
  uuid, uuid, uuid, text, text, text, text, text, bigint, text, numeric, date, text, jsonb, uuid, text, text, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_unified_payment_with_allocations(
  uuid, uuid, uuid, text, text, text, text, text, bigint, text, numeric, date, text, jsonb, uuid, text, text, date, text
) TO authenticated;

-- ----------------------------------------------------------------------------
-- RPC 3: transition_cheque_traite_status (bounce automatically reopens balances)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_cheque_traite_status(
  p_payment_id uuid,
  p_next_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pay public.unified_payments%ROWTYPE;
  v_alloc record;
  v_doc public.unified_documents%ROWTYPE;
  v_reopened_paid bigint;
  v_reopened_balance bigint;
  v_reopened_status text;
  v_reopened_docs int := 0;
BEGIN
  IF p_next_status NOT IN ('deposited', 'cleared', 'bounced') THEN
    RAISE EXCEPTION 'INVALID_INSTRUMENT_STATUS' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_pay
  FROM public.unified_payments
  WHERE id = p_payment_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_pay.account_id IS DISTINCT FROM public.get_auth_account_id()
     OR NOT public.can_access_branch(v_pay.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PAYMENT_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF v_pay.method NOT IN ('cheque', 'traite') THEN
    RAISE EXCEPTION 'PAYMENT_NOT_AN_INSTRUMENT' USING ERRCODE = '22023';
  END IF;

  IF v_pay.instrument_status = 'bounced' THEN
    RAISE EXCEPTION 'BOUNCED_INSTRUMENT_FINAL' USING ERRCODE = '42501';
  END IF;

  UPDATE public.unified_payments
  SET instrument_status = p_next_status,
      status = CASE
        WHEN p_next_status = 'cleared' THEN 'posted'
        WHEN p_next_status = 'bounced' THEN 'bounced'
        ELSE 'pending_clearance'
      END,
      bounced_reason = CASE WHEN p_next_status = 'bounced' THEN COALESCE(NULLIF(trim(p_reason), ''), 'Cheque/Traite impayé') ELSE bounced_reason END,
      updated_at = now(),
      version = version + 1
  WHERE id = v_pay.id;

  IF p_next_status = 'bounced' THEN
    FOR v_alloc IN
      SELECT document_id, allocated_centimes
      FROM public.unified_payment_allocations
      WHERE payment_id = v_pay.id
        AND deleted_at IS NULL
    LOOP
      SELECT * INTO v_doc
      FROM public.unified_documents
      WHERE id = v_alloc.document_id
        AND deleted_at IS NULL
      FOR UPDATE;
      IF FOUND THEN
        v_reopened_paid := GREATEST(0, v_doc.paid_centimes - v_alloc.allocated_centimes);
        v_reopened_balance := LEAST(v_doc.net_to_pay_centimes, v_doc.net_to_pay_centimes - v_reopened_paid);
        v_reopened_status := CASE
          WHEN v_reopened_paid > 0 AND v_reopened_balance > 0 THEN 'PartiallyPaid'
          WHEN v_reopened_paid = 0 AND v_doc.doc_number IS NOT NULL THEN 'Issued'
          ELSE v_doc.status
        END;

        UPDATE public.unified_documents
        SET paid_centimes = v_reopened_paid,
            balance_due_centimes = v_reopened_balance,
            status = v_reopened_status,
            updated_at = now(),
            version = version + 1
        WHERE id = v_doc.id;
        v_reopened_docs := v_reopened_docs + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_pay.id,
    'instrument_status', p_next_status,
    'reopened_documents_count', v_reopened_docs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_cheque_traite_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_cheque_traite_status(uuid, text, text) TO authenticated;

COMMIT;
