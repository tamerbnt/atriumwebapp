-- Rollback for 202611280008_phase3_trading_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_optimistic_trading_rep_commissions ON public.trading_rep_commissions;
DROP TRIGGER IF EXISTS trg_optimistic_trading_delivery_rounds ON public.trading_delivery_rounds;
DROP TRIGGER IF EXISTS trg_optimistic_trading_price_lists ON public.trading_price_lists;

DROP TRIGGER IF EXISTS trg_audit_trading_rep_commissions ON public.trading_rep_commissions;
DROP TRIGGER IF EXISTS trg_audit_trading_delivery_rounds ON public.trading_delivery_rounds;
DROP TRIGGER IF EXISTS trg_audit_trading_price_lists ON public.trading_price_lists;

DROP TRIGGER IF EXISTS trg_guard_trading_avoir_not_exceed_invoice ON public.trading_commercial_docs;

DROP FUNCTION IF EXISTS public.trading_release_guarantee_retention(uuid, numeric, text, text, date);
DROP FUNCTION IF EXISTS public.trading_execute_stock_voucher(jsonb);
DROP FUNCTION IF EXISTS public.trading_convert_commercial_doc_partial(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.fn_guard_trading_avoir_not_exceed_invoice();

DROP TABLE IF EXISTS public.trading_rep_commissions;
DROP TABLE IF EXISTS public.trading_delivery_rounds;
DROP TABLE IF EXISTS public.trading_price_lists;

ALTER TABLE public.trading_commercial_docs
  DROP CONSTRAINT IF EXISTS chk_trading_docs_guarantee_released_cap,
  DROP CONSTRAINT IF EXISTS chk_trading_docs_guarantee_status,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS rep_name,
  DROP COLUMN IF EXISTS rep_staff_id,
  DROP COLUMN IF EXISTS guarantee_released_at,
  DROP COLUMN IF EXISTS guarantee_released_centimes,
  DROP COLUMN IF EXISTS guarantee_retention_status,
  DROP COLUMN IF EXISTS guarantee_retention_centimes,
  DROP COLUMN IF EXISTS guarantee_retention_percent,
  DROP COLUMN IF EXISTS credit_override_at,
  DROP COLUMN IF EXISTS credit_override_reason,
  DROP COLUMN IF EXISTS credit_override_by_name,
  DROP COLUMN IF EXISTS credit_override_by_staff_id;

ALTER TABLE public.trading_products
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS depot_stock_map;

ALTER TABLE public.trading_b2b_clients
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS crm_party_id,
  DROP COLUMN IF EXISTS price_tier;

COMMIT;
