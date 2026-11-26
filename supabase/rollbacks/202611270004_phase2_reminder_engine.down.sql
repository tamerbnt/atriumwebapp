-- Rollback Phase 2 Step 4 (6.5): Reminder & Notification Engine
BEGIN;

DROP FUNCTION IF EXISTS public.dispatch_reminder_idempotent(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text, text, text, text, text, timestamptz, uuid, text, text
);

DROP POLICY IF EXISTS "reminder_delivery_logs_tenant_access" ON public.reminder_delivery_logs;
DROP INDEX IF EXISTS public.idx_reminder_delivery_business_date;
DROP INDEX IF EXISTS public.uq_reminder_delivery_idempotency;
DROP TABLE IF EXISTS public.reminder_delivery_logs;

DROP POLICY IF EXISTS "reminder_rules_tenant_access" ON public.reminder_rules;
DROP INDEX IF EXISTS public.uq_reminder_rules_business_event_active;
DROP TABLE IF EXISTS public.reminder_rules;

DROP POLICY IF EXISTS "reminder_quiet_hours_tenant_access" ON public.reminder_quiet_hours_configs;
DROP INDEX IF EXISTS public.uq_reminder_quiet_hours_business_active;
DROP TABLE IF EXISTS public.reminder_quiet_hours_configs;

COMMIT;
