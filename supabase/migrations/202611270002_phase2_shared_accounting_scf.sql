-- ============================================================================
-- Atrium Phase 2 Migration (Step 2): Section 6.3 Shared Accounting Layer (SCF)
--   - Shared Double-Entry SCF Engine (Loi 07-11) across all 16 verticals
--   - Chart of Accounts (`scf_chart_of_accounts`), Fiscal Years & Period Locks
--   - Immutable `journal_entries` & `journal_lines` in bigint centimes
--   - Visible Posting Failure / Retry Queue (`scf_posting_failures`)
--   - Transactional RPCs: post_scf_journal_entry, reverse_scf_journal_entry,
--     set_scf_period_status, reconcile_scf_journal_lines, seed_scf_chart_of_accounts
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.3a Extend server-side sequence_counters for Shared SCF Journal Entries
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
      'journal_entry'
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
    'payment', 'journal_entry'
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
-- 6.3b Chart of Accounts (SCF Loi 07-11 Classes 1–7)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scf_chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (char_length(trim(code)) BETWEEN 3 AND 16),
  label_fr text NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  scf_class smallint NOT NULL CHECK (scf_class BETWEEN 1 AND 7),
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'expense', 'revenue')),
  is_reconcilable boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scf_chart_of_accounts_code_active
  ON public.scf_chart_of_accounts (business_id, code)
  WHERE deleted_at IS NULL;

ALTER TABLE public.scf_chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scf_chart_of_accounts_tenant_access" ON public.scf_chart_of_accounts;
CREATE POLICY "scf_chart_of_accounts_tenant_access"
  ON public.scf_chart_of_accounts
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.3c Fiscal Years & Accounting Periods (Period Locking & Reopen Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scf_fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  fiscal_year smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_at timestamptz,
  closed_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scf_fiscal_years_active
  ON public.scf_fiscal_years (business_id, fiscal_year)
  WHERE deleted_at IS NULL;

ALTER TABLE public.scf_fiscal_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scf_fiscal_years_tenant_access" ON public.scf_fiscal_years;
CREATE POLICY "scf_fiscal_years_tenant_access"
  ON public.scf_fiscal_years
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

CREATE TABLE IF NOT EXISTS public.scf_accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_key text NOT NULL CHECK (period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  fiscal_year smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  period_month smallint NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at timestamptz,
  closed_by_staff_id uuid,
  reopened_at timestamptz,
  reopened_by_staff_id uuid,
  reopen_reason text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scf_accounting_periods_active
  ON public.scf_accounting_periods (business_id, period_key)
  WHERE deleted_at IS NULL;

ALTER TABLE public.scf_accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scf_accounting_periods_tenant_access" ON public.scf_accounting_periods;
CREATE POLICY "scf_accounting_periods_tenant_access"
  ON public.scf_accounting_periods
  FOR ALL
  TO authenticated
  USING (account_id = (SELECT public.get_auth_account_id()))
  WITH CHECK (account_id = (SELECT public.get_auth_account_id()));

-- ----------------------------------------------------------------------------
-- 6.3d Double-Entry Journal Entries & Journal Lines (Immutable Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  entry_number text NOT NULL,
  journal_code text NOT NULL CHECK (journal_code IN ('VE', 'AC', 'BQ', 'CA', 'PA', 'ST', 'OD')),
  entry_date date NOT NULL,
  period_key text NOT NULL CHECK (period_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  fiscal_year smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  piece_ref text NOT NULL,
  libelle text NOT NULL,
  source_vertical text NOT NULL DEFAULT 'trading_commercial',
  source_event_type text NOT NULL DEFAULT 'manual',
  source_doc_id text,
  idempotency_key text,
  currency text NOT NULL DEFAULT 'DZD' CHECK (currency IN ('DZD', 'EUR', 'USD')),
  fx_rate numeric(14, 6) NOT NULL DEFAULT 1.000000 CHECK (fx_rate > 0),
  total_debit_centimes bigint NOT NULL CHECK (total_debit_centimes > 0),
  total_credit_centimes bigint NOT NULL CHECK (total_credit_centimes > 0),
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  reversed_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  reversal_reason text,
  posted_by_staff_id uuid,
  posted_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_journal_entry_balanced CHECK (total_debit_centimes = total_credit_centimes)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_number_active
  ON public.journal_entries (business_id, entry_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_idempotency
  ON public.journal_entries (business_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_branch_period
  ON public.journal_entries (business_id, branch_id, period_key, entry_date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_tenant_access" ON public.journal_entries;
CREATE POLICY "journal_entries_tenant_access"
  ON public.journal_entries
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

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_no int NOT NULL CHECK (line_no >= 1),
  account_code text NOT NULL,
  account_label text NOT NULL,
  party_id text,
  party_name text,
  debit_centimes bigint NOT NULL DEFAULT 0 CHECK (debit_centimes >= 0),
  credit_centimes bigint NOT NULL DEFAULT 0 CHECK (credit_centimes >= 0),
  original_currency text NOT NULL DEFAULT 'DZD' CHECK (original_currency IN ('DZD', 'EUR', 'USD')),
  original_amount_centimes bigint NOT NULL DEFAULT 0,
  fx_rate numeric(14, 6) NOT NULL DEFAULT 1.000000 CHECK (fx_rate > 0),
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  reconciliation_ref text,
  statement_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_journal_line_single_side CHECK (
    (debit_centimes > 0 AND credit_centimes = 0)
    OR (credit_centimes > 0 AND debit_centimes = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
  ON public.journal_lines (journal_entry_id, line_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code
  ON public.journal_lines (business_id, account_code, reconciled)
  WHERE deleted_at IS NULL;

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_lines_tenant_access" ON public.journal_lines;
CREATE POLICY "journal_lines_tenant_access"
  ON public.journal_lines
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
-- 6.3e Visible Posting Retry Queue / Unposted Report
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scf_posting_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  source_vertical text NOT NULL DEFAULT 'trading_commercial',
  source_event_type text NOT NULL,
  source_doc_id text,
  source_ref text NOT NULL,
  entry_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text NOT NULL,
  error_message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  attempts int NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  resolved_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scf_posting_failures_pending
  ON public.scf_posting_failures (business_id, status, last_attempt_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.scf_posting_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scf_posting_failures_tenant_access" ON public.scf_posting_failures;
CREATE POLICY "scf_posting_failures_tenant_access"
  ON public.scf_posting_failures
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
-- 6.3f Triggers: Closed Period Blocking & Ledger Immutability
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_block_closed_period_journal_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period_status text;
  v_year_status text;
BEGIN
  SELECT status INTO v_year_status
  FROM public.scf_fiscal_years
  WHERE business_id = NEW.business_id
    AND fiscal_year = NEW.fiscal_year
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_year_status IN ('closed', 'locked') THEN
    RAISE EXCEPTION 'SCF_PERIOD_CLOSED'
      USING ERRCODE = '42501',
            DETAIL = format('Fiscal year %s is closed/locked.', NEW.fiscal_year);
  END IF;

  SELECT status INTO v_period_status
  FROM public.scf_accounting_periods
  WHERE business_id = NEW.business_id
    AND period_key = NEW.period_key
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_period_status = 'closed' THEN
    RAISE EXCEPTION 'SCF_PERIOD_CLOSED'
      USING ERRCODE = '42501',
            DETAIL = format('Accounting period %s is closed.', NEW.period_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_journal_entries_period_open ON public.journal_entries;
CREATE TRIGGER trg_00_journal_entries_period_open
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_closed_period_journal_insert();

CREATE OR REPLACE FUNCTION public.fn_protect_immutable_journal_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SCF_JOURNAL_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Posted journal entries cannot be deleted; use reverse_scf_journal_entry instead.';
  END IF;

  IF current_setting('app.scf_reversal_tx', true) = 'on' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'SCF_JOURNAL_IMMUTABLE'
    USING ERRCODE = '42501',
          DETAIL = 'Posted journal entries are immutable; create a reversal entry (contre-passation) instead.';
END;
$$;

DROP TRIGGER IF EXISTS trg_00_journal_entries_immutable ON public.journal_entries;
CREATE TRIGGER trg_00_journal_entries_immutable
  BEFORE UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_journal_entries();

CREATE OR REPLACE FUNCTION public.fn_protect_immutable_journal_lines()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'SCF_JOURNAL_LINE_IMMUTABLE'
      USING ERRCODE = '42501',
            DETAIL = 'Posted journal lines cannot be deleted.';
  END IF;

  IF current_setting('app.scf_reconcile_tx', true) = 'on' THEN
    IF NEW.account_code IS DISTINCT FROM OLD.account_code
       OR NEW.debit_centimes IS DISTINCT FROM OLD.debit_centimes
       OR NEW.credit_centimes IS DISTINCT FROM OLD.credit_centimes
       OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id THEN
      RAISE EXCEPTION 'SCF_JOURNAL_LINE_IMMUTABLE' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'SCF_JOURNAL_LINE_IMMUTABLE'
    USING ERRCODE = '42501',
          DETAIL = 'Posted journal lines are immutable except bank/cash reconciliation flags.';
END;
$$;

DROP TRIGGER IF EXISTS trg_00_journal_lines_immutable ON public.journal_lines;
CREATE TRIGGER trg_00_journal_lines_immutable
  BEFORE UPDATE OR DELETE ON public.journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_immutable_journal_lines();

-- ----------------------------------------------------------------------------
-- 6.3g Security-Definer RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_scf_chart_of_accounts(
  p_business_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_biz_account_id uuid;
  v_inserted int := 0;
BEGIN
  SELECT b.account_id INTO v_biz_account_id
  FROM public.businesses b
  WHERE b.id = p_business_id
  LIMIT 1;

  IF v_biz_account_id IS NULL OR v_biz_account_id IS DISTINCT FROM v_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SCF_ACCOUNT_SEED' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.scf_chart_of_accounts (
    account_id, business_id, code, label_fr, label_ar, label_en,
    scf_class, normal_balance, account_type, is_reconcilable, is_system
  ) VALUES
    (v_account_id, p_business_id, '101000', 'Capital social', 'رأس المال الاجتماعي', 'Share Capital', 1, 'credit', 'equity', false, true),
    (v_account_id, p_business_id, '300000', 'Stocks de marchandises', 'مخزون البضائع', 'Merchandise Inventory', 3, 'debit', 'asset', false, true),
    (v_account_id, p_business_id, '310000', 'Matières premières et fournitures', 'المواد الأولية واللوازم', 'Raw Materials & Supplies', 3, 'debit', 'asset', false, true),
    (v_account_id, p_business_id, '401000', 'Fournisseurs de stocks et services', 'الموردون', 'Trade Payables', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '411000', 'Clients', 'الزبائن', 'Trade Receivables', 4, 'debit', 'asset', false, true),
    (v_account_id, p_business_id, '421000', 'Personnel - Rémunérations dues', 'المستخدمون - الأجور المستحقة', 'Salaries Payable', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '425000', 'Personnel - Avances et acomptes', 'المستخدمون - التسبيقات', 'Staff Salary Advances', 4, 'debit', 'asset', false, true),
    (v_account_id, p_business_id, '431000', 'Sécurité sociale (CNAS)', 'الضمان الاجتماعي (CNAS)', 'Social Security (CNAS)', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '442000', 'État - Impôts et taxes recouvrables / IRG', 'الدولة - الضريبة على الدخل الإجمالي', 'IRG Payroll Withholding', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '445600', 'TVA déductible sur achats et services', 'الرسم على القيمة المضافة القابل للاسترجاع', 'Deductible Input VAT', 4, 'debit', 'asset', false, true),
    (v_account_id, p_business_id, '445700', 'TVA collectée sur ventes et prestations', 'الرسم على القيمة المضافة المحصل', 'Collected Output VAT', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '447000', 'Autres impôts, taxes et droits de timbre', 'حقوق الطابع والضرائب الأخرى', 'Fiscal Stamp & Other Taxes', 4, 'credit', 'liability', false, true),
    (v_account_id, p_business_id, '511300', 'Effets et chèques à encaisser', 'شيكات وأوراق تجارية قيد التحصيل', 'Cheques & Traites Clearing', 5, 'debit', 'asset', true, true),
    (v_account_id, p_business_id, '512000', 'Banques comptes courants', 'البنوك الحسابات الجارية', 'Bank Current Accounts', 5, 'debit', 'asset', true, true),
    (v_account_id, p_business_id, '517000', 'CCP Algérie Poste / BaridiMob', 'الحساب البريدي الجاري / بريدي موب', 'CCP & BaridiMob Clearing', 5, 'debit', 'asset', true, true),
    (v_account_id, p_business_id, '530000', 'Caisse centrale', 'الصندوق المركزي', 'Main Cash Register', 5, 'debit', 'asset', true, true),
    (v_account_id, p_business_id, '600000', 'Achats de marchandises vendues', 'مشتريات البضائع المستهلكة', 'Cost of Goods Purchased', 6, 'debit', 'expense', false, true),
    (v_account_id, p_business_id, '601000', 'Matières premières consommées', 'المواد الأولية المستهلكة', 'Raw Materials Consumed', 6, 'debit', 'expense', false, true),
    (v_account_id, p_business_id, '631000', 'Rémunérations du personnel', 'أجور المستخدمين', 'Payroll Wages & Salaries', 6, 'debit', 'expense', false, true),
    (v_account_id, p_business_id, '635000', 'Cotisations patronales aux organismes sociaux', 'اشتراكات صاحب العمل في الضمان الاجتماعي', 'Employer CNAS Contributions', 6, 'debit', 'expense', false, true),
    (v_account_id, p_business_id, '656000', 'Pertes de change et écarts d’arrondi', 'خسائر الصرف وفروق التقريب', 'FX & Rounding Losses', 6, 'debit', 'expense', false, true),
    (v_account_id, p_business_id, '700000', 'Ventes de marchandises', 'مبيعات البضائع', 'Merchandise Sales', 7, 'credit', 'revenue', false, true),
    (v_account_id, p_business_id, '706000', 'Prestations de services', 'أداء الخدمات', 'Service Revenue', 7, 'credit', 'revenue', false, true),
    (v_account_id, p_business_id, '756000', 'Gains de change et écarts d’arrondi', 'أرباح الصرف وفروق التقريب', 'FX & Rounding Gains', 7, 'credit', 'revenue', false, true)
  ON CONFLICT (business_id, code) WHERE deleted_at IS NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_scf_chart_of_accounts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_scf_chart_of_accounts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_scf_journal_entry(
  p_entry_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_journal_code text,
  p_entry_date date,
  p_piece_ref text,
  p_libelle text,
  p_source_vertical text,
  p_source_event_type text,
  p_source_doc_id text,
  p_idempotency_key text,
  p_currency text,
  p_fx_rate numeric,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_existing public.journal_entries%ROWTYPE;
  v_entry_id uuid := COALESCE(p_entry_id, gen_random_uuid());
  v_entry_date date := COALESCE(p_entry_date, CURRENT_DATE);
  v_period_key text := to_char(COALESCE(p_entry_date, CURRENT_DATE), 'YYYY-MM');
  v_year smallint := EXTRACT(YEAR FROM COALESCE(p_entry_date, CURRENT_DATE))::smallint;
  v_entry_number text;
  v_line jsonb;
  v_line_no int := 0;
  v_total_debit bigint := 0;
  v_total_credit bigint := 0;
  v_debit bigint;
  v_credit bigint;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SCF_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing
    FROM public.journal_entries
    WHERE business_id = p_business_id
      AND idempotency_key = p_idempotency_key
      AND deleted_at IS NULL
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'entry_id', v_existing.id,
        'entry_number', v_existing.entry_number,
        'period_key', v_existing.period_key,
        'status', v_existing.status,
        'idempotent', true
      );
    END IF;
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'SCF_ENTRY_UNBALANCED'
      USING ERRCODE = '22023',
            DETAIL = 'A double-entry journal posting requires at least 2 lines.';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_debit := COALESCE((v_line ->> 'debit_centimes')::bigint, 0);
    v_credit := COALESCE((v_line ->> 'credit_centimes')::bigint, 0);
    IF (v_debit > 0 AND v_credit > 0) OR (v_debit = 0 AND v_credit = 0) OR v_debit < 0 OR v_credit < 0 THEN
      RAISE EXCEPTION 'SCF_LINE_INVALID'
        USING ERRCODE = '22023',
              DETAIL = 'Each journal line must have strictly one positive debit or credit amount.';
    END IF;
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  END LOOP;

  IF v_total_debit <= 0 OR v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'SCF_ENTRY_UNBALANCED'
      USING ERRCODE = '22023',
            DETAIL = format('Debits (%s) must equal Credits (%s).', v_total_debit, v_total_credit);
  END IF;

  v_entry_number := (public.allocate_sequence_number(
    p_business_id,
    p_branch_id,
    'journal_entry',
    v_year
  )) ->> 'formatted_number';

  INSERT INTO public.journal_entries (
    id, account_id, business_id, branch_id, entry_number, journal_code,
    entry_date, period_key, fiscal_year, piece_ref, libelle,
    source_vertical, source_event_type, source_doc_id, idempotency_key,
    currency, fx_rate, total_debit_centimes, total_credit_centimes,
    status, posted_by_staff_id
  ) VALUES (
    v_entry_id, v_account_id, p_business_id, p_branch_id, v_entry_number,
    COALESCE(p_journal_code, 'OD'), v_entry_date, v_period_key, v_year,
    COALESCE(NULLIF(trim(p_piece_ref), ''), v_entry_number),
    COALESCE(NULLIF(trim(p_libelle), ''), v_entry_number),
    COALESCE(p_source_vertical, 'trading_commercial'),
    COALESCE(p_source_event_type, 'manual'),
    p_source_doc_id,
    NULLIF(trim(COALESCE(p_idempotency_key, '')), ''),
    COALESCE(p_currency, 'DZD'),
    COALESCE(p_fx_rate, 1.0),
    v_total_debit,
    v_total_credit,
    'posted',
    v_staff_id
  );

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_no := v_line_no + 1;
    INSERT INTO public.journal_lines (
      account_id, business_id, branch_id, journal_entry_id, line_no,
      account_code, account_label, party_id, party_name,
      debit_centimes, credit_centimes, original_currency, original_amount_centimes, fx_rate
    ) VALUES (
      v_account_id,
      p_business_id,
      p_branch_id,
      v_entry_id,
      v_line_no,
      trim(v_line ->> 'account_code'),
      COALESCE(NULLIF(trim(v_line ->> 'account_label'), ''), trim(v_line ->> 'account_code')),
      NULLIF(trim(COALESCE(v_line ->> 'party_id', '')), ''),
      NULLIF(trim(COALESCE(v_line ->> 'party_name', '')), ''),
      COALESCE((v_line ->> 'debit_centimes')::bigint, 0),
      COALESCE((v_line ->> 'credit_centimes')::bigint, 0),
      COALESCE(v_line ->> 'original_currency', COALESCE(p_currency, 'DZD')),
      COALESCE((v_line ->> 'original_amount_centimes')::bigint, COALESCE((v_line ->> 'debit_centimes')::bigint, 0) + COALESCE((v_line ->> 'credit_centimes')::bigint, 0)),
      COALESCE((v_line ->> 'fx_rate')::numeric, COALESCE(p_fx_rate, 1.0))
    );
  END LOOP;

  RETURN jsonb_build_object(
    'entry_id', v_entry_id,
    'entry_number', v_entry_number,
    'period_key', v_period_key,
    'status', 'posted',
    'total_debit_centimes', v_total_debit,
    'total_credit_centimes', v_total_credit,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_scf_journal_entry(
  uuid, uuid, uuid, text, date, text, text, text, text, text, text, text, numeric, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_scf_journal_entry(
  uuid, uuid, uuid, text, date, text, text, text, text, text, text, text, numeric, jsonb
) TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_scf_journal_entry(
  p_entry_id uuid,
  p_reversal_date date DEFAULT CURRENT_DATE,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.journal_entries%ROWTYPE;
  v_rev_id uuid := gen_random_uuid();
  v_rev_lines jsonb;
  v_res jsonb;
BEGIN
  SELECT * INTO v_orig
  FROM public.journal_entries
  WHERE id = p_entry_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCF_ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_orig.account_id IS DISTINCT FROM public.get_auth_account_id()
     OR NOT public.can_access_branch(v_orig.branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SCF_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF v_orig.status = 'reversed' THEN
    RAISE EXCEPTION 'SCF_ENTRY_ALREADY_REVERSED' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'account_code', jl.account_code,
      'account_label', jl.account_label,
      'party_id', jl.party_id,
      'party_name', jl.party_name,
      'debit_centimes', jl.credit_centimes,
      'credit_centimes', jl.debit_centimes,
      'original_currency', jl.original_currency,
      'original_amount_centimes', jl.original_amount_centimes,
      'fx_rate', jl.fx_rate
    )
    ORDER BY jl.line_no
  ) INTO v_rev_lines
  FROM public.journal_lines jl
  WHERE jl.journal_entry_id = v_orig.id
    AND jl.deleted_at IS NULL;

  v_res := public.post_scf_journal_entry(
    v_rev_id,
    v_orig.business_id,
    v_orig.branch_id,
    v_orig.journal_code,
    COALESCE(p_reversal_date, CURRENT_DATE),
    v_orig.entry_number,
    format('Contre-passation %s: %s', v_orig.entry_number, COALESCE(NULLIF(trim(p_reason), ''), v_orig.libelle)),
    v_orig.source_vertical,
    'reversal',
    v_orig.id::text,
    format('rev:%s', v_orig.id),
    v_orig.currency,
    v_orig.fx_rate,
    v_rev_lines
  );

  PERFORM set_config('app.scf_reversal_tx', 'on', true);

  UPDATE public.journal_entries
  SET status = 'reversed',
      reversed_entry_id = v_rev_id,
      reversal_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Contre-passation'),
      updated_at = now(),
      version = version + 1
  WHERE id = v_orig.id;

  PERFORM set_config('app.scf_reversal_tx', 'off', true);

  RETURN jsonb_build_object(
    'original_entry_id', v_orig.id,
    'reversal_entry_id', v_rev_id,
    'reversal_entry_number', v_res ->> 'entry_number',
    'status', 'reversed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_scf_journal_entry(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_scf_journal_entry(uuid, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_scf_period_status(
  p_business_id uuid,
  p_period_key text,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_staff_id uuid := public.get_auth_staff_id();
  v_staff_role text;
  v_year smallint;
  v_month smallint;
  v_biz_account_id uuid;
BEGIN
  IF p_period_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR p_status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'INVALID_SCF_PERIOD_PARAMS' USING ERRCODE = '22023';
  END IF;

  SELECT b.account_id INTO v_biz_account_id
  FROM public.businesses b
  WHERE b.id = p_business_id
  LIMIT 1;

  IF v_biz_account_id IS NULL OR v_biz_account_id IS DISTINCT FROM v_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SCF_PERIOD_ACCESS' USING ERRCODE = '42501';
  END IF;

  SELECT lower(role) INTO v_staff_role
  FROM public.staff
  WHERE id = v_staff_id
  LIMIT 1;

  IF v_staff_role IS NOT NULL AND v_staff_role NOT IN ('owner', 'manager', 'admin', 'directeur', 'gerant', 'expert_comptable', 'direction') THEN
    RAISE EXCEPTION 'SCF_PERIOD_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_year := substring(p_period_key FROM 1 FOR 4)::smallint;
  v_month := substring(p_period_key FROM 6 FOR 2)::smallint;

  INSERT INTO public.scf_accounting_periods (
    account_id, business_id, period_key, fiscal_year, period_month, status,
    closed_at, closed_by_staff_id, reopened_at, reopened_by_staff_id, reopen_reason
  ) VALUES (
    v_account_id, p_business_id, p_period_key, v_year, v_month, p_status,
    CASE WHEN p_status = 'closed' THEN now() ELSE NULL END,
    CASE WHEN p_status = 'closed' THEN v_staff_id ELSE NULL END,
    CASE WHEN p_status = 'open' THEN now() ELSE NULL END,
    CASE WHEN p_status = 'open' THEN v_staff_id ELSE NULL END,
    p_reason
  )
  ON CONFLICT (business_id, period_key) WHERE deleted_at IS NULL
  DO UPDATE SET
    status = EXCLUDED.status,
    closed_at = CASE WHEN EXCLUDED.status = 'closed' THEN now() ELSE scf_accounting_periods.closed_at END,
    closed_by_staff_id = CASE WHEN EXCLUDED.status = 'closed' THEN v_staff_id ELSE scf_accounting_periods.closed_by_staff_id END,
    reopened_at = CASE WHEN EXCLUDED.status = 'open' THEN now() ELSE scf_accounting_periods.reopened_at END,
    reopened_by_staff_id = CASE WHEN EXCLUDED.status = 'open' THEN v_staff_id ELSE scf_accounting_periods.reopened_by_staff_id END,
    reopen_reason = COALESCE(EXCLUDED.reopen_reason, scf_accounting_periods.reopen_reason),
    updated_at = now(),
    version = scf_accounting_periods.version + 1;

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'period_key', p_period_key,
    'status', p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_scf_period_status(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_scf_period_status(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_scf_journal_lines(
  p_line_ids uuid[],
  p_reconciled boolean,
  p_reconciliation_ref text DEFAULT NULL,
  p_statement_date date DEFAULT CURRENT_DATE
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid := public.get_auth_account_id();
  v_updated int := 0;
BEGIN
  IF p_line_ids IS NULL OR array_length(p_line_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM set_config('app.scf_reconcile_tx', 'on', true);

  UPDATE public.journal_lines
  SET reconciled = p_reconciled,
      reconciled_at = CASE WHEN p_reconciled THEN now() ELSE NULL END,
      reconciliation_ref = CASE WHEN p_reconciled THEN p_reconciliation_ref ELSE NULL END,
      statement_date = CASE WHEN p_reconciled THEN COALESCE(p_statement_date, CURRENT_DATE) ELSE NULL END
  WHERE id = ANY(p_line_ids)
    AND account_id = v_account_id
    AND public.can_access_branch(branch_id)
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM set_config('app.scf_reconcile_tx', 'off', true);
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_scf_journal_lines(uuid[], boolean, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_scf_journal_lines(uuid[], boolean, text, date) TO authenticated;

COMMIT;
