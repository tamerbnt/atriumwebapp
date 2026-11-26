-- ============================================================================
-- Rollback: Phase 2 Step 3 (6.4) Unified CRM & Communication
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.record_crm_communication_attempt(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, text, text, text, text
);
DROP FUNCTION IF EXISTS public.merge_crm_parties(uuid, uuid, text);

DROP TABLE IF EXISTS public.crm_communication_logs;
DROP TABLE IF EXISTS public.crm_message_templates;
DROP TABLE IF EXISTS public.crm_follow_up_tasks;
DROP TABLE IF EXISTS public.crm_party_notes;
DROP TABLE IF EXISTS public.crm_party_links;
DROP TABLE IF EXISTS public.crm_parties;

COMMIT;
