-- ============================================================================
-- ROLLBACK FOR PHASE 5: 202611190005_enterprise_100pct_hardening.sql
-- Reverses RPCs, keyset indexes, partial unique indexes, optimistic triggers,
-- and version/row_version columns in strict dependency order.
-- ============================================================================

BEGIN;

-- 1. Drop Phase 5 RPCs
DROP FUNCTION IF EXISTS public.get_audit_logs_page(uuid, uuid, timestamptz, uuid, int, text, text);
DROP FUNCTION IF EXISTS public.logistics_upsert_wilaya_tariffs_batch(uuid, jsonb);
DROP FUNCTION IF EXISTS public.pm_generate_ccp_batch_slips_atomic(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.mfg_upsert_bom_atomic(jsonb, jsonb);

-- 2. Drop Keyset Pagination Indexes
DROP INDEX IF EXISTS public.idx_immutable_audit_logs_branch_keyset;
DROP INDEX IF EXISTS public.idx_immutable_audit_logs_keyset;
DROP INDEX IF EXISTS public.idx_branches_account_keyset;
DROP INDEX IF EXISTS public.idx_businesses_account_keyset;

DO $$
DECLARE
  idx_rec record;
BEGIN
  FOR idx_rec IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE '%_keyset_sync' OR indexname LIKE '%_keyset_created')
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I;', idx_rec.indexname);
  END LOOP;
END $$;

-- 3. Drop Partial Unique Indexes added in Phase 5 & restore original table constraints
DROP INDEX IF EXISTS public.idx_logistics_parcels_branch_tracking_active_unique;
DROP INDEX IF EXISTS public.idx_mfg_bom_recipes_branch_code_active_unique;
DROP INDEX IF EXISTS public.idx_pos_products_branch_sku_active_unique;
DROP INDEX IF EXISTS public.idx_logistics_tariffs_branch_zone_active_unique;
DROP INDEX IF EXISTS public.idx_pos_receipt_configs_branch_active_unique;
DROP INDEX IF EXISTS public.idx_sba_staff_branch_active_unique;

DO $$
DECLARE
  idx_rec record;
BEGIN
  FOR idx_rec IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%_active_uq'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I;', idx_rec.indexname);
  END LOOP;

  IF to_regclass('public.staff_branch_assignments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.staff_branch_assignments'::regclass AND contype = 'u'
     ) THEN
    ALTER TABLE public.staff_branch_assignments
      ADD CONSTRAINT staff_branch_assignments_staff_id_branch_id_key UNIQUE (staff_id, branch_id);
  END IF;

  IF to_regclass('public.pos_receipt_configs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.pos_receipt_configs'::regclass AND contype = 'u'
     ) THEN
    ALTER TABLE public.pos_receipt_configs
      ADD CONSTRAINT pos_receipt_configs_branch_id_key UNIQUE (branch_id);
  END IF;

  IF to_regclass('public.logistics_wilaya_tariffs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.logistics_wilaya_tariffs'::regclass AND contype = 'u'
     ) THEN
    ALTER TABLE public.logistics_wilaya_tariffs
      ADD CONSTRAINT logistics_wilaya_tariffs_branch_id_zone_id_key UNIQUE (branch_id, zone_id);
  END IF;
END $$;

-- 4. Drop Optimistic Version Triggers & Columns
DO $$
DECLARE
  trig_rec record;
BEGIN
  FOR trig_rec IN
    SELECT event_object_table AS tbl, trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE '%_optimistic_version'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', trig_rec.trigger_name, trig_rec.tbl);
  END LOOP;
END $$;

DO $$
DECLARE
  col_rec record;
BEGIN
  FOR col_rec IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'version'
      AND data_type = 'bigint'
      AND table_name <> 'mfg_bom_recipes'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS version;', col_rec.table_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.mfg_bom_recipes
  DROP COLUMN IF EXISTS row_version;

DROP FUNCTION IF EXISTS public.fn_enforce_optimistic_row_version();
DROP FUNCTION IF EXISTS public.fn_enforce_optimistic_version();

COMMIT;
