-- ============================================================================
-- ROLLBACK FOR PHASE 1: 202611180001_phase1_security_foundation.sql
-- Reverses workforce ERP tables, immutable audit log, traceability triggers,
-- Phase 1 policies, and security helper RPCs.
-- ============================================================================

BEGIN;

-- 1. Drop Workforce ERP Triggers & Tables
DO $$
DECLARE
  wf_tbl text;
BEGIN
  FOREACH wf_tbl IN ARRAY ARRAY[
    'staff_attendance_logs',
    'staff_salary_advances',
    'staff_payroll_runs',
    'staff_payroll_slips'
  ]
  LOOP
    IF to_regclass('public.' || wf_tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_trace ON public.%I;', wf_tbl, wf_tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', wf_tbl, wf_tbl);
      EXECUTE format('DROP POLICY IF EXISTS "%I_tenant_isolated" ON public.%I;', wf_tbl, wf_tbl);
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', wf_tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Drop Phase 1 RPCs
DROP FUNCTION IF EXISTS public.create_branch(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.create_business(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.onboard_owner_account(uuid, text, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.redeem_license_voucher(uuid, text);
DROP FUNCTION IF EXISTS public.get_staff_for_sync(uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.get_staff_profiles(text);
DROP FUNCTION IF EXISTS public.get_tenant_facilities(uuid);
DROP FUNCTION IF EXISTS public.revoke_device(uuid, uuid);
DROP FUNCTION IF EXISTS public.generate_license_vouchers(text, int, int);
DROP FUNCTION IF EXISTS public.admin_activate_account(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.set_staff_pin(uuid, text);
DROP FUNCTION IF EXISTS public.verify_staff_pin(uuid, text);

-- 3. Drop Phase 1 Core Policies & Triggers
DROP POLICY IF EXISTS "branches_tenant_isolated" ON public.branches;
DROP POLICY IF EXISTS "businesses_tenant_isolated" ON public.businesses;
DROP POLICY IF EXISTS "license_vouchers_no_direct_access" ON public.license_vouchers;
DROP POLICY IF EXISTS "account_subscriptions_self_read" ON public.account_subscriptions;
DROP POLICY IF EXISTS "accounts_self_access" ON public.accounts;
DROP POLICY IF EXISTS "devices_tenant_isolated" ON public.devices;
DROP POLICY IF EXISTS "staff_tenant_isolated" ON public.staff;
DROP TRIGGER IF EXISTS trg_staff_audit ON public.staff;

DROP INDEX IF EXISTS public.idx_account_subscriptions_account_id_unique;
DROP INDEX IF EXISTS public.idx_staff_auth_user_id;

-- 4. Drop Immutable Audit Log & Traceability Functions
DROP POLICY IF EXISTS "audit_logs_tenant_read" ON public.immutable_audit_logs;
DROP INDEX IF EXISTS public.idx_immutable_audit_logs_account_time;
DROP TABLE IF EXISTS public.immutable_audit_logs CASCADE;

DROP FUNCTION IF EXISTS public.fn_audit_log_mutation();
DROP FUNCTION IF EXISTS public.fn_enforce_traceability_envelope();
DROP FUNCTION IF EXISTS public.can_access_branch(uuid);
DROP FUNCTION IF EXISTS public.get_auth_staff_id();
DROP FUNCTION IF EXISTS public.get_auth_account_id();

-- 5. Drop staff_branch_assignments & Phase 1 staff columns
DROP TABLE IF EXISTS public.staff_branch_assignments CASCADE;

ALTER TABLE IF EXISTS public.staff
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS device_id,
  DROP COLUMN IF EXISTS updated_by_staff_id,
  DROP COLUMN IF EXISTS auth_user_id;

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_category_check;

COMMIT;
