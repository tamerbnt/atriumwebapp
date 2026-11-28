-- Rollback for Phase 3 Step 11 (7.11 real_estate) Depth Migration

BEGIN;

DROP FUNCTION IF EXISTS public.re_apply_lease_indexation(uuid, numeric, date, text);
DROP FUNCTION IF EXISTS public.re_record_partial_rent_payment(uuid, numeric, text, numeric, text);

DROP TRIGGER IF EXISTS trg_guard_re_vacation_stay_overlap ON public.re_vacation_stays;
DROP FUNCTION IF EXISTS public.fn_guard_re_vacation_stay_overlap();

DROP TRIGGER IF EXISTS trg_guard_re_exclusive_mandate_overlap ON public.re_mandates;
DROP FUNCTION IF EXISTS public.fn_guard_re_exclusive_mandate_overlap();

DROP TABLE IF EXISTS public.re_vacation_stays;
DROP TABLE IF EXISTS public.re_student_beds;
DROP TABLE IF EXISTS public.re_dev_lots;
DROP TABLE IF EXISTS public.re_dev_programs;
DROP TABLE IF EXISTS public.re_syndic_assemblies;
DROP TABLE IF EXISTS public.re_syndic_fund_calls;
DROP TABLE IF EXISTS public.re_syndic_buildings;
DROP TABLE IF EXISTS public.re_agent_commissions;
DROP TABLE IF EXISTS public.re_maintenance_tickets;

ALTER TABLE public.re_owner_ledger
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_payment_id,
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS lease_id;

ALTER TABLE public.re_sales
  DROP CONSTRAINT IF EXISTS chk_re_sales_stage,
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_payment_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS closing_checklist,
  DROP COLUMN IF EXISTS deposit_paid_dzd,
  DROP COLUMN IF EXISTS secondary_split_bps,
  DROP COLUMN IF EXISTS primary_split_bps,
  DROP COLUMN IF EXISTS secondary_agent_staff_id,
  DROP COLUMN IF EXISTS primary_agent_staff_id,
  DROP COLUMN IF EXISTS mandate_id,
  DROP COLUMN IF EXISTS deal_number;

ALTER TABLE public.re_sales
  ADD CONSTRAINT re_sales_stage_check
  CHECK (stage IN ('Promesse', 'Notaire', 'Enregistrement', 'Finalisé'));

ALTER TABLE public.re_visits
  DROP COLUMN IF EXISTS gps_accuracy_meters,
  DROP COLUMN IF EXISTS gps_longitude,
  DROP COLUMN IF EXISTS gps_latitude,
  DROP COLUMN IF EXISTS gps_status;

ALTER TABLE public.re_rent_schedules
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_payment_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS partial_payment_seq,
  DROP COLUMN IF EXISTS remaining_due_dzd,
  DROP COLUMN IF EXISTS timbre_fiscal_dzd,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS charges_dzd,
  DROP COLUMN IF EXISTS quittance_number;

ALTER TABLE public.re_leases
  DROP COLUMN IF EXISTS indexation_history,
  DROP COLUMN IF EXISTS next_indexation_date,
  DROP COLUMN IF EXISTS indexation_frequency,
  DROP COLUMN IF EXISTS indexation_rate_percent,
  DROP COLUMN IF EXISTS renewal_count,
  DROP COLUMN IF EXISTS crm_party_id;

DROP INDEX IF EXISTS public.uq_re_mandates_number_branch;
ALTER TABLE public.re_mandates
  DROP CONSTRAINT IF EXISTS chk_re_mandates_split_sum,
  DROP COLUMN IF EXISTS secondary_split_bps,
  DROP COLUMN IF EXISTS primary_split_bps,
  DROP COLUMN IF EXISTS secondary_negotiator_name,
  DROP COLUMN IF EXISTS secondary_staff_id,
  DROP COLUMN IF EXISTS is_exclusive;

ALTER TABLE public.re_properties
  DROP COLUMN IF EXISTS portal_sync,
  DROP COLUMN IF EXISTS featured_photo_url,
  DROP COLUMN IF EXISTS photo_urls,
  DROP COLUMN IF EXISTS crm_party_id;

-- Restore prior 15 sequence doc types from 202611270002
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

COMMIT;
