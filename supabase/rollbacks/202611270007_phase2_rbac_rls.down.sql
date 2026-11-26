-- ============================================================================
-- Rollback for 202611270007_phase2_rbac_rls.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE
  fin_tbl text;
BEGIN
  FOREACH fin_tbl IN ARRAY ARRAY[
    'pos_cash_sessions',
    'pos_cash_movements',
    'pos_z_reports',
    'rental_security_deposits',
    'staff_payroll_runs',
    'staff_payroll_slips',
    'staff_salary_advances',
    'unified_documents',
    'unified_payments',
    'unified_payment_allocations',
    'journal_entries',
    'journal_lines',
    'data_protection_consents',
    'rbac_role_permissions'
  ]
  LOOP
    IF to_regclass(format('public.%I', fin_tbl)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', fin_tbl, fin_tbl);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.process_data_subject_request(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.log_sensitive_read_event(uuid, uuid, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.can_rbac(uuid, text, text);

DROP TABLE IF EXISTS public.data_subject_requests CASCADE;
DROP TABLE IF EXISTS public.data_protection_consents CASCADE;
DROP TABLE IF EXISTS public.security_workspace_policies CASCADE;
DROP TABLE IF EXISTS public.rbac_role_permissions CASCADE;

COMMIT;
