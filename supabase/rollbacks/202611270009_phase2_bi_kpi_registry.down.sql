-- ============================================================================
-- Atrium Phase 2 Rollback (Step 9): Section 6.10 Unified BI KPI Registry & Reports
-- Reverses supabase/migrations/202611270009_phase2_bi_kpi_registry.sql
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.record_bi_report_snapshot(uuid, uuid, uuid, text, date, date, date, date, jsonb, jsonb, jsonb);

DROP TRIGGER IF EXISTS trg_audit_bi_report_snapshots ON public.bi_report_snapshots;
DROP TRIGGER IF EXISTS trg_audit_bi_saved_reports ON public.bi_saved_reports;
DROP TRIGGER IF EXISTS trg_audit_bi_kpi_definitions ON public.bi_kpi_definitions;

DROP POLICY IF EXISTS "bi_report_snapshots_authorized_write" ON public.bi_report_snapshots;
DROP POLICY IF EXISTS "bi_report_snapshots_tenant_read" ON public.bi_report_snapshots;
DROP TABLE IF EXISTS public.bi_report_snapshots CASCADE;

DROP POLICY IF EXISTS "bi_saved_reports_owner_write" ON public.bi_saved_reports;
DROP POLICY IF EXISTS "bi_saved_reports_tenant_read" ON public.bi_saved_reports;
DROP TABLE IF EXISTS public.bi_saved_reports CASCADE;

DROP POLICY IF EXISTS "bi_kpi_definitions_owner_write" ON public.bi_kpi_definitions;
DROP POLICY IF EXISTS "bi_kpi_definitions_tenant_read" ON public.bi_kpi_definitions;
DROP TABLE IF EXISTS public.bi_kpi_definitions CASCADE;

COMMIT;
