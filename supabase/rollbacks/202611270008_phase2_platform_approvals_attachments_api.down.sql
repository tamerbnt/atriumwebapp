-- ============================================================================
-- Rollback for Phase 2 Step 8 (6.9): Platform Governance, Approvals,
-- Attachments, Custom Fields, Print Templates, API Keys & Webhooks
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.dispatch_webhook_delivery_idempotent(uuid, text, text, jsonb, text, text, int, text);
DROP FUNCTION IF EXISTS public.purge_expired_platform_attachment(uuid);
DROP FUNCTION IF EXISTS public.decide_platform_approval(uuid, text, text);

DROP TABLE IF EXISTS public.platform_webhook_deliveries CASCADE;
DROP TABLE IF EXISTS public.platform_webhooks CASCADE;
DROP TABLE IF EXISTS public.platform_api_keys CASCADE;
DROP TABLE IF EXISTS public.platform_print_templates CASCADE;
DROP TABLE IF EXISTS public.platform_custom_fields CASCADE;
DROP TABLE IF EXISTS public.platform_attachments CASCADE;
DROP TABLE IF EXISTS public.platform_approval_requests CASCADE;
DROP TABLE IF EXISTS public.platform_approval_rules CASCADE;

COMMIT;
