-- Rollback for 202611240003_phase1_security_audit_rpc.sql
DROP FUNCTION IF EXISTS public.log_access_denied_event(text, text, text, text, text, uuid, uuid, timestamptz);
DROP INDEX IF EXISTS public.idx_immutable_audit_logs_sec_denied_rate;
