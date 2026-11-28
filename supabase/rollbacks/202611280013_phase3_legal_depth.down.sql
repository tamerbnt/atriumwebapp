-- Rollback for Phase 3 Step 13 (7.13 legal_accounting) Depth Migration

BEGIN;

DROP FUNCTION IF EXISTS public.legal_generate_fee_invoice_from_time_entries(uuid, uuid, uuid, text, uuid[], numeric, bigint, text);
DROP FUNCTION IF EXISTS public.legal_recalculate_deadlines_on_holidays(uuid, date[]);
DROP FUNCTION IF EXISTS public.legal_release_escrow_guarded(uuid, bigint, text, text, boolean, text, text);

DROP TABLE IF EXISTS public.legal_client_ledgers;
DROP TABLE IF EXISTS public.legal_arbitration_timelines;
DROP TABLE IF EXISTS public.legal_bailiff_acts;
DROP TABLE IF EXISTS public.legal_doc_templates;
DROP TABLE IF EXISTS public.legal_escrow_accounts;
DROP TABLE IF EXISTS public.legal_holiday_calendars;

ALTER TABLE public.legal_documents
  DROP COLUMN IF EXISTS deposit_date,
  DROP COLUMN IF EXISTS is_portal_shared,
  DROP COLUMN IF EXISTS signed_at,
  DROP COLUMN IF EXISTS signed_by_name,
  DROP COLUMN IF EXISTS signature_svg,
  DROP COLUMN IF EXISTS rendered_body,
  DROP COLUMN IF EXISTS template_id,
  DROP COLUMN IF EXISTS cadastral_number,
  DROP COLUMN IF EXISTS cadastral_volume,
  DROP COLUMN IF EXISTS official_seal_number,
  DROP COLUMN IF EXISTS mime_type,
  DROP COLUMN IF EXISTS file_size_bytes,
  DROP COLUMN IF EXISTS sha256_hash,
  DROP COLUMN IF EXISTS storage_path,
  DROP COLUMN IF EXISTS storage_bucket,
  DROP COLUMN IF EXISTS vault_status,
  DROP COLUMN IF EXISTS role_scope,
  DROP COLUMN IF EXISTS matter_reference,
  DROP COLUMN IF EXISTS vault_code;

ALTER TABLE public.legal_invoices
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS disbursement_ids,
  DROP COLUMN IF EXISTS time_entry_ids,
  DROP COLUMN IF EXISTS line_items,
  DROP COLUMN IF EXISTS total_ttc_centimes,
  DROP COLUMN IF EXISTS timbre_dzd,
  DROP COLUMN IF EXISTS tva_rate,
  DROP COLUMN IF EXISTS matter_number;

ALTER TABLE public.legal_time_entries
  DROP COLUMN IF EXISTS billed_at,
  DROP COLUMN IF EXISTS invoice_id,
  DROP COLUMN IF EXISTS amount_ht_centimes,
  DROP COLUMN IF EXISTS tva_rate,
  DROP COLUMN IF EXISTS activity_type,
  DROP COLUMN IF EXISTS client_name,
  DROP COLUMN IF EXISTS matter_number,
  DROP COLUMN IF EXISTS entry_kind;

ALTER TABLE public.legal_hearings
  DROP COLUMN IF EXISTS reminder_channel,
  DROP COLUMN IF EXISTS reminder_sent_at,
  DROP COLUMN IF EXISTS auto_shifted_reason,
  DROP COLUMN IF EXISTS original_requested_date;

ALTER TABLE public.legal_matters
  DROP COLUMN IF EXISTS is_arbitration,
  DROP COLUMN IF EXISTS portal_enabled,
  DROP COLUMN IF EXISTS client_portal_token,
  DROP COLUMN IF EXISTS conflict_override_reason,
  DROP COLUMN IF EXISTS conflict_checked_at,
  DROP COLUMN IF EXISTS conflict_status,
  DROP COLUMN IF EXISTS allowed_roles,
  DROP COLUMN IF EXISTS confidentiality_level;

-- Restore prior 23 sequence doc types from 202611280012
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
      'mfg_cut'
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
    'mfg_alert', 'mfg_maint', 'mfg_fg_lot', 'mfg_cut'
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

COMMIT;
