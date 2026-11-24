-- ============================================================================
-- ATRIUM ERP & CRM — STEP 3 (SECTION 4.10 & 4.6)
-- Covers:
--   4.10: Nullable total_sessions and duration_days on public.gym_plans
--         (no name-substring SQL backfill; existing rows keep current values
--         and total_sessions starts NULL until explicitly set by owner)
--   4.6:  Ensure bat-deliverables bucket permits TIFF alongside PDF/PNG/JPEG/AI
-- Target: Supabase PostgreSQL 15+ & CI Postgres 16
-- ============================================================================

BEGIN;

ALTER TABLE public.gym_plans
  ADD COLUMN IF NOT EXISTS total_sessions integer;

ALTER TABLE public.gym_plans
  ALTER COLUMN duration_days DROP NOT NULL,
  ALTER COLUMN duration_days DROP DEFAULT;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE storage.buckets
      SET allowed_mime_types = ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/tiff',
        'image/svg+xml',
        'application/postscript'
      ]
      WHERE id = 'bat-deliverables'
    $sql$;
  END IF;
END $$;

COMMIT;
