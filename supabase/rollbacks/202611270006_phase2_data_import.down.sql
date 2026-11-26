-- ============================================================================
-- Rollback: Atrium Phase 2 Migration (Step 6) — Section 6.7 CSV/Excel Import
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.mark_import_job_rolled_back(uuid, text);

DROP TABLE IF EXISTS public.import_jobs;
DROP TABLE IF EXISTS public.import_column_mappings;

COMMIT;
