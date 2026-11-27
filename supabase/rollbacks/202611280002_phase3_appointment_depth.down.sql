-- ============================================================================
-- Rollback: Atrium Phase 3 Migration (Step 2) — Section 7.2 Appointment Depth
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.redeem_salon_package_or_gift_card(uuid, uuid, bigint);
DROP FUNCTION IF EXISTS public.cancel_salon_appointment_with_deposit(uuid, timestamptz, text);

DROP TRIGGER IF EXISTS trg_audit_salon_hammam_sessions ON public.salon_hammam_sessions;
DROP TRIGGER IF EXISTS trg_audit_salon_consent_forms ON public.salon_consent_forms;
DROP TRIGGER IF EXISTS trg_audit_salon_loyalty_ledger ON public.salon_loyalty_ledger;
DROP TRIGGER IF EXISTS trg_audit_salon_gift_cards ON public.salon_gift_cards;
DROP TRIGGER IF EXISTS trg_audit_salon_prepaid_packages ON public.salon_prepaid_packages;
DROP TRIGGER IF EXISTS trg_audit_salon_stylist_schedules ON public.salon_stylist_schedules;

DROP TABLE IF EXISTS public.salon_hammam_sessions;
DROP TABLE IF EXISTS public.salon_consent_forms;
DROP TABLE IF EXISTS public.salon_loyalty_ledger;
DROP TABLE IF EXISTS public.salon_gift_cards;
DROP TABLE IF EXISTS public.salon_prepaid_packages;
DROP TABLE IF EXISTS public.salon_stylist_schedules;

DROP INDEX IF EXISTS public.idx_salon_appointments_stylist_slot;
DROP INDEX IF EXISTS public.idx_salon_clients_client_type;

ALTER TABLE public.salon_appointments
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS is_paid,
  DROP COLUMN IF EXISTS loyalty_points_earned,
  DROP COLUMN IF EXISTS loyalty_points_used,
  DROP COLUMN IF EXISTS gift_card_code,
  DROP COLUMN IF EXISTS package_id,
  DROP COLUMN IF EXISTS consumables_deducted,
  DROP COLUMN IF EXISTS booking_channel,
  DROP COLUMN IF EXISTS allergy_override_confirmed,
  DROP COLUMN IF EXISTS refunded_deposit_centimes,
  DROP COLUMN IF EXISTS cancellation_cutoff_hours,
  DROP COLUMN IF EXISTS deposit_status,
  DROP COLUMN IF EXISTS deposit_centimes;

ALTER TABLE public.salon_services
  DROP COLUMN IF EXISTS requires_consent,
  DROP COLUMN IF EXISTS allergy_keywords,
  DROP COLUMN IF EXISTS consumables,
  DROP COLUMN IF EXISTS cost_price_centimes,
  DROP COLUMN IF EXISTS buffer_minutes;

ALTER TABLE public.salon_clients
  DROP COLUMN IF EXISTS segment_data,
  DROP COLUMN IF EXISTS client_type;

ALTER TABLE public.gym_members
  DROP COLUMN IF EXISTS client_type;

COMMIT;
