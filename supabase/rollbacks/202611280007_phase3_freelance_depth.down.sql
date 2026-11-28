-- Rollback for 202611280007_phase3_freelance_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_optimistic_freelance_photo_shoots ON public.freelance_photo_shoots;
DROP TRIGGER IF EXISTS trg_optimistic_freelance_translation_registers ON public.freelance_translation_registers;
DROP TRIGGER IF EXISTS trg_optimistic_freelance_client_contracts ON public.freelance_client_contracts;
DROP TRIGGER IF EXISTS trg_optimistic_freelance_contract_templates ON public.freelance_contract_templates;
DROP TRIGGER IF EXISTS trg_optimistic_freelance_auto_entrepreneur_configs ON public.freelance_auto_entrepreneur_configs;

DROP TRIGGER IF EXISTS trg_audit_freelance_photo_shoots ON public.freelance_photo_shoots;
DROP TRIGGER IF EXISTS trg_audit_freelance_translation_registers ON public.freelance_translation_registers;
DROP TRIGGER IF EXISTS trg_audit_freelance_client_contracts ON public.freelance_client_contracts;
DROP TRIGGER IF EXISTS trg_audit_freelance_contract_templates ON public.freelance_contract_templates;
DROP TRIGGER IF EXISTS trg_audit_freelance_auto_entrepreneur_configs ON public.freelance_auto_entrepreneur_configs;

DROP TRIGGER IF EXISTS trg_guard_freelance_photo_shoot_overlap ON public.freelance_photo_shoots;
DROP TRIGGER IF EXISTS trg_protect_issued_freelance_invoice_currency ON public.freelance_invoices;
DROP TRIGGER IF EXISTS trg_protect_invoiced_freelance_time_logs ON public.freelance_time_logs;

DROP FUNCTION IF EXISTS public.uninvoice_freelance_invoice_logs(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.stop_freelance_active_timer(uuid, timestamptz);
DROP FUNCTION IF EXISTS public.upsert_freelance_active_timer(uuid, uuid, uuid, uuid, uuid, text, uuid, text, uuid, text, text, timestamptz, int, boolean, boolean, boolean, boolean, int, text, text);
DROP FUNCTION IF EXISTS public.fn_guard_freelance_photo_shoot_overlap();
DROP FUNCTION IF EXISTS public.fn_protect_issued_freelance_invoice_currency();
DROP FUNCTION IF EXISTS public.fn_protect_invoiced_freelance_time_logs();

DROP TABLE IF EXISTS public.freelance_photo_shoots;
DROP TABLE IF EXISTS public.freelance_translation_registers;
DROP TABLE IF EXISTS public.freelance_client_contracts;
DROP TABLE IF EXISTS public.freelance_contract_templates;
DROP TABLE IF EXISTS public.freelance_auto_entrepreneur_configs;

DROP INDEX IF EXISTS public.uq_freelance_active_timer_branch_running;

ALTER TABLE public.freelance_expenses
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS receipt_size_bytes,
  DROP COLUMN IF EXISTS receipt_mime_type,
  DROP COLUMN IF EXISTS receipt_file_name,
  DROP COLUMN IF EXISTS receipt_storage_path,
  DROP COLUMN IF EXISTS receipt_url;

ALTER TABLE public.freelance_active_timers
  DROP CONSTRAINT IF EXISTS chk_freelance_active_timers_pomo_mode,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS source_device_id,
  DROP COLUMN IF EXISTS last_heartbeat_at,
  DROP COLUMN IF EXISTS pomodoro_mode,
  DROP COLUMN IF EXISTS pomodoro_remaining_seconds,
  DROP COLUMN IF EXISTS is_pomodoro,
  DROP COLUMN IF EXISTS is_billable,
  DROP COLUMN IF EXISTS deliverable_title,
  DROP COLUMN IF EXISTS project_title,
  DROP COLUMN IF EXISTS client_name,
  DROP COLUMN IF EXISTS client_id;

ALTER TABLE public.freelance_invoices
  DROP CONSTRAINT IF EXISTS chk_freelance_invoices_recurrence_interval,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS share_token,
  DROP COLUMN IF EXISTS last_reminded_at,
  DROP COLUMN IF EXISTS next_recurrence_date,
  DROP COLUMN IF EXISTS recurrence_interval,
  DROP COLUMN IF EXISTS is_recurring,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS total_amount_dzd_centimes,
  DROP COLUMN IF EXISTS fx_rate_to_dzd;

ALTER TABLE public.freelance_time_logs
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS split_group_id,
  DROP COLUMN IF EXISTS ended_at,
  DROP COLUMN IF EXISTS started_at;

ALTER TABLE public.freelance_clients
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS crm_party_id;

COMMIT;
