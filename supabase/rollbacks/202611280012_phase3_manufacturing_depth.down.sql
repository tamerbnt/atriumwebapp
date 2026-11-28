-- Rollback for Phase 3 Step 12 (7.12 manufacturing_production) Depth Migration

BEGIN;

DROP FUNCTION IF EXISTS public.mfg_post_piece_rate_to_payroll(uuid[], uuid);
DROP FUNCTION IF EXISTS public.mfg_complete_machine_maintenance(uuid, text, bigint, text);
DROP FUNCTION IF EXISTS public.mfg_release_finished_goods_lot(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.mfg_resolve_andon_alert(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.mfg_trigger_andon_alert(jsonb);
DROP FUNCTION IF EXISTS public.mfg_create_bom_version(uuid, jsonb, jsonb);

DROP TRIGGER IF EXISTS trg_guard_mfg_bom_immutable_on_active_orders ON public.mfg_bom_recipes;
DROP FUNCTION IF EXISTS public.fn_guard_mfg_bom_immutable_on_active_orders();

DROP TRIGGER IF EXISTS trg_mfg_workstations_optimistic_version ON public.mfg_workstations;

DROP TABLE IF EXISTS public.mfg_cutting_plans;
DROP TABLE IF EXISTS public.mfg_piece_rate_entries;
DROP TABLE IF EXISTS public.mfg_machine_maintenance;
DROP TABLE IF EXISTS public.mfg_finished_goods;
DROP TABLE IF EXISTS public.mfg_alerts;

ALTER TABLE public.mfg_workstations
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS next_maintenance_due_date,
  DROP COLUMN IF EXISTS last_maintenance_date,
  DROP COLUMN IF EXISTS maintenance_interval_days,
  DROP COLUMN IF EXISTS maintenance_interval_hours,
  DROP COLUMN IF EXISTS cycle_count,
  DROP COLUMN IF EXISTS running_hours,
  DROP COLUMN IF EXISTS machine_type;

ALTER TABLE public.mfg_workstation_logs
  DROP COLUMN IF EXISTS downtime_reason,
  DROP COLUMN IF EXISTS piece_rate_centimes,
  DROP COLUMN IF EXISTS session_status,
  DROP COLUMN IF EXISTS ppe_verified_at,
  DROP COLUMN IF EXISTS ppe_verified,
  DROP COLUMN IF EXISTS ppe_checklist,
  DROP COLUMN IF EXISTS pin_verified_at,
  DROP COLUMN IF EXISTS pin_verified,
  DROP COLUMN IF EXISTS operator_staff_id;

ALTER TABLE public.mfg_orders
  DROP COLUMN IF EXISTS linked_unified_doc_id,
  DROP COLUMN IF EXISTS cmup_recalc_delta_centimes,
  DROP COLUMN IF EXISTS actual_labor_cost_centimes,
  DROP COLUMN IF EXISTS actual_material_cost_centimes,
  DROP COLUMN IF EXISTS unit_piece_rate_centimes,
  DROP COLUMN IF EXISTS bom_snapshot,
  DROP COLUMN IF EXISTS pinned_bom_version;

DROP INDEX IF EXISTS public.uq_mfg_bom_recipes_branch_code_ver;
ALTER TABLE public.mfg_bom_recipes
  DROP COLUMN IF EXISTS parent_bom_id,
  DROP COLUMN IF EXISTS version_number,
  DROP COLUMN IF EXISTS bom_family_id;

-- Restore prior 19 sequence doc types from 202611280011
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
      're_fund_call'
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
    'quittance', 're_mandate', 're_lease', 're_fund_call'
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
