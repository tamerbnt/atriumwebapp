-- ============================================================================
-- ROLLBACK FOR PHASE 4: 202611180004_phase4_enterprise_hardening.sql
-- Reverses role-based policies, core audit triggers, soft-delete columns,
-- and Phase 4 covering indexes.
-- ============================================================================

BEGIN;

-- 1. Drop Phase 4 Audit Triggers on Core Tables
DO $$
DECLARE
  core_tbl text;
BEGIN
  FOREACH core_tbl IN ARRAY ARRAY[
    'accounts', 'businesses', 'branches', 'devices', 'account_subscriptions'
  ]
  LOOP
    IF to_regclass('public.' || core_tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', core_tbl, core_tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Revert Role-Based Granular Policies back to Phase 1 Tenant Policies
DROP POLICY IF EXISTS "staff_owner_delete" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_update" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_tenant_read" ON public.staff;

DROP POLICY IF EXISTS "branches_admin_delete" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_update" ON public.branches;
DROP POLICY IF EXISTS "branches_admin_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_tenant_read" ON public.branches;

DROP POLICY IF EXISTS "businesses_owner_delete" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_update" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_insert" ON public.businesses;
DROP POLICY IF EXISTS "businesses_tenant_read" ON public.businesses;

DROP POLICY IF EXISTS "accounts_self_access" ON public.accounts;

-- 3. Drop Phase 4 Role Helpers & Covering Indexes
DROP FUNCTION IF EXISTS public.is_tenant_admin();
DROP FUNCTION IF EXISTS public.is_tenant_owner();

DROP INDEX IF EXISTS public.idx_branches_active_partial;
DROP INDEX IF EXISTS public.idx_businesses_active_partial;
DROP INDEX IF EXISTS public.idx_sba_access_lookup;
DROP INDEX IF EXISTS public.idx_staff_access_lookup;
DROP INDEX IF EXISTS public.idx_branches_access_lookup;

ALTER TABLE IF EXISTS public.branches DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE IF EXISTS public.businesses DROP COLUMN IF EXISTS deleted_at;

COMMIT;
