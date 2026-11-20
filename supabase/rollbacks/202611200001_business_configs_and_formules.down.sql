-- ============================================================================
-- ROLLBACK: PHASE 6 — BUSINESS CONFIGS & CATEGORY FORMULES ENGINE
-- Reverts 202611200001_business_configs_and_formules.sql cleanly.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.update_business_identity(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.upsert_business_config(uuid, uuid, text, text, numeric, boolean, jsonb, jsonb, jsonb, jsonb, bigint, text);

DROP TABLE IF EXISTS public.category_formules CASCADE;
DROP TABLE IF EXISTS public.business_configs CASCADE;

COMMIT;
