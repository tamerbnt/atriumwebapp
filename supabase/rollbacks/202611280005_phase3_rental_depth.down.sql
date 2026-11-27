-- Rollback for 202611280005_phase3_rental_depth.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_optimistic_rental_coworking_subscriptions ON public.rental_coworking_subscriptions;
DROP TRIGGER IF EXISTS trg_optimistic_rental_asset_check_logs ON public.rental_asset_check_logs;
DROP TRIGGER IF EXISTS trg_optimistic_rental_contract_templates ON public.rental_contract_templates;
DROP TRIGGER IF EXISTS trg_optimistic_rental_pricing_rules ON public.rental_pricing_rules;

DROP TRIGGER IF EXISTS trg_audit_rental_coworking_subscriptions ON public.rental_coworking_subscriptions;
DROP TRIGGER IF EXISTS trg_audit_rental_asset_check_logs ON public.rental_asset_check_logs;
DROP TRIGGER IF EXISTS trg_audit_rental_contract_templates ON public.rental_contract_templates;
DROP TRIGGER IF EXISTS trg_audit_rental_pricing_rules ON public.rental_pricing_rules;

DROP FUNCTION IF EXISTS public.consume_coworking_subscription_hours(uuid, numeric);
DROP FUNCTION IF EXISTS public.settle_rental_deposit_atomic(uuid, text, numeric, text);
DROP FUNCTION IF EXISTS public.upsert_rental_booking_atomic(uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, timestamptz, timestamptz, text, numeric, numeric, jsonb);

DROP TABLE IF EXISTS public.rental_coworking_subscriptions;
DROP TABLE IF EXISTS public.rental_asset_check_logs;
DROP TABLE IF EXISTS public.rental_contract_templates;
DROP TABLE IF EXISTS public.rental_pricing_rules;

ALTER TABLE public.rental_security_deposits
  DROP CONSTRAINT IF EXISTS chk_rental_deposit_deduction,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS deducted_amount,
  DROP COLUMN IF EXISTS original_amount;

ALTER TABLE public.rental_bookings
  DROP CONSTRAINT IF EXISTS excl_rental_bookings_no_overlap,
  DROP CONSTRAINT IF EXISTS chk_rental_bookings_window,
  DROP CONSTRAINT IF EXISTS chk_rental_bookings_late_fee,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS inspection_notes,
  DROP COLUMN IF EXISTS fuel_in_pct,
  DROP COLUMN IF EXISTS fuel_out_pct,
  DROP COLUMN IF EXISTS mileage_in,
  DROP COLUMN IF EXISTS mileage_out,
  DROP COLUMN IF EXISTS driver_license_expiry,
  DROP COLUMN IF EXISTS driver_license_number,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS ical_uid,
  DROP COLUMN IF EXISTS contract_signature_data,
  DROP COLUMN IF EXISTS contract_signer_name,
  DROP COLUMN IF EXISTS contract_signed_at,
  DROP COLUMN IF EXISTS contract_template_id,
  DROP COLUMN IF EXISTS staged_payment_schedule,
  DROP COLUMN IF EXISTS actual_return_at,
  DROP COLUMN IF EXISTS late_fee_dzd,
  DROP COLUMN IF EXISTS seasonal_rule_id,
  DROP COLUMN IF EXISTS pricing_breakdown,
  DROP COLUMN IF EXISTS rental_mode;

ALTER TABLE public.rental_renters
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS crm_party_id,
  DROP COLUMN IF EXISTS driver_license_expiry,
  DROP COLUMN IF EXISTS driver_license_number;

ALTER TABLE public.rental_units
  DROP CONSTRAINT IF EXISTS chk_rental_units_weekend_mult,
  DROP CONSTRAINT IF EXISTS chk_rental_units_fuel_pct,
  DROP CONSTRAINT IF EXISTS chk_rental_units_mode,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS late_hourly_rate,
  DROP COLUMN IF EXISTS grace_minutes,
  DROP COLUMN IF EXISTS weekend_multiplier,
  DROP COLUMN IF EXISTS maintenance_interval_km,
  DROP COLUMN IF EXISTS last_maintenance_at,
  DROP COLUMN IF EXISTS tech_control_expiry,
  DROP COLUMN IF EXISTS insurance_expiry,
  DROP COLUMN IF EXISTS fuel_level_pct,
  DROP COLUMN IF EXISTS odometer_km,
  DROP COLUMN IF EXISTS make_model,
  DROP COLUMN IF EXISTS vin,
  DROP COLUMN IF EXISTS plate_number,
  DROP COLUMN IF EXISTS serial_number,
  DROP COLUMN IF EXISTS rental_mode;

COMMIT;
