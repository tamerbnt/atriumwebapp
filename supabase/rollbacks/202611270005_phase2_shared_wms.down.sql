-- ============================================================================
-- Rollback: Atrium Phase 2 Migration (Step 5) — Section 6.6 Shared Inventory / WMS
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.wms_transition_stock_transfer(uuid, text);
DROP FUNCTION IF EXISTS public.wms_post_cycle_count(uuid);
DROP FUNCTION IF EXISTS public.wms_atomic_consume_stock(uuid, uuid, uuid, numeric, uuid, uuid, text, text);

DROP TABLE IF EXISTS public.wms_consignment_ledger;
DROP TABLE IF EXISTS public.wms_landed_cost_allocations;
DROP TABLE IF EXISTS public.wms_stock_transfers;
DROP TABLE IF EXISTS public.wms_cycle_count_lines;
DROP TABLE IF EXISTS public.wms_cycle_counts;
DROP TABLE IF EXISTS public.wms_reorder_rules;
DROP TABLE IF EXISTS public.wms_unit_conversions;
DROP TABLE IF EXISTS public.wms_serial_numbers;
DROP TABLE IF EXISTS public.wms_stock_lots;
DROP TABLE IF EXISTS public.wms_bins;

-- Restore sequence_counters constraint & _sequence_prefix to 6.3 state
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

COMMIT;
