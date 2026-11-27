-- Rollback for 202611280003_phase3_pos_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_audit_pos_optical_prescriptions ON public.pos_optical_prescriptions;
DROP TRIGGER IF EXISTS trg_audit_pos_customer_credit_entries ON public.pos_customer_credit_entries;
DROP TRIGGER IF EXISTS trg_audit_pos_kitchen_orders ON public.pos_kitchen_orders;
DROP TRIGGER IF EXISTS trg_audit_pos_floor_tables ON public.pos_floor_tables;

DROP FUNCTION IF EXISTS public.pos_record_carnet_entry(uuid, uuid, uuid, text, text, bigint, text, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.pos_void_kitchen_or_sale_order(text, uuid, text, boolean, uuid);
DROP FUNCTION IF EXISTS public.pos_transfer_table_order(uuid, uuid);
DROP FUNCTION IF EXISTS public.pos_send_kitchen_order(uuid, uuid, jsonb, jsonb, text);

DROP TABLE IF EXISTS public.pos_optical_prescriptions;
DROP TABLE IF EXISTS public.pos_customer_credit_entries;
DROP TABLE IF EXISTS public.pos_kitchen_orders;
DROP TABLE IF EXISTS public.pos_floor_tables;

ALTER TABLE public.pos_sales
  DROP COLUMN IF EXISTS voided_at,
  DROP COLUMN IF EXISTS void_pin_verified,
  DROP COLUMN IF EXISTS void_reason,
  DROP COLUMN IF EXISTS voided_by_staff_id,
  DROP COLUMN IF EXISTS delivery_fee_centimes,
  DROP COLUMN IF EXISTS delivery_courier,
  DROP COLUMN IF EXISTS delivery_address,
  DROP COLUMN IF EXISTS table_label,
  DROP COLUMN IF EXISTS table_id,
  DROP COLUMN IF EXISTS order_channel,
  DROP COLUMN IF EXISTS tip_centimes;

DROP INDEX IF EXISTS idx_pos_products_expiry;
DROP INDEX IF EXISTS idx_pos_products_plu;

ALTER TABLE public.pos_products
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS plu_code,
  DROP COLUMN IF EXISTS is_weighted,
  DROP COLUMN IF EXISTS recipe_bom,
  DROP COLUMN IF EXISTS modifier_groups,
  DROP COLUMN IF EXISTS variants;

COMMIT;
