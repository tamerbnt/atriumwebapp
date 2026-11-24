-- ============================================================================
-- ROLLBACK FOR 202611240001_phase1_trust_infrastructure.sql
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_delete" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_update" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_insert" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_select" ON storage.objects';
  END IF;

  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE 'DELETE FROM storage.buckets WHERE id IN (''expense-receipts'', ''bat-deliverables'')';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.reserve_sequence_block(uuid, uuid, text, text, integer, smallint);
DROP FUNCTION IF EXISTS public.allocate_sequence_number(uuid, uuid, text, smallint);
DROP FUNCTION IF EXISTS public._sequence_prefix(text);
DROP TABLE IF EXISTS public.device_sequence_blocks CASCADE;
DROP TABLE IF EXISTS public.sequence_counters CASCADE;

DROP TABLE IF EXISTS public.wilayas_ref CASCADE;

DROP FUNCTION IF EXISTS public.get_effective_statutory_rates(date);
DROP TRIGGER IF EXISTS trg_protect_referenced_statutory_rates ON public.statutory_rates;
DROP FUNCTION IF EXISTS public.fn_protect_referenced_statutory_rates();
DROP TABLE IF EXISTS public.statutory_rates CASCADE;

DROP FUNCTION IF EXISTS public.is_platform_super_admin();
DROP FUNCTION IF EXISTS public.is_platform_admin();
DROP TABLE IF EXISTS public.platform_admins CASCADE;

COMMIT;
