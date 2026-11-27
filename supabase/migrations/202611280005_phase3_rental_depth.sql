-- ============================================================================
-- Phase 3 Step 5 (7.5): rental_booking Deepening
-- Concurrent Double-Booking GiST Exclusion, Seasonal & Weekend Pricing Rules,
-- Wedding Staged Schedules, E-Signature Contract Templates, iCal Sync UID,
-- Late-Return Fees, Deposit Deduction Guards, Car Fleet Compliance & Checks,
-- Gear Serial Custody Logs, Coworking Desk Subscriptions & Atomic RPCs.
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 7.5a Extend rental_units for multi-mode (venue, vehicle, gear, coworking)
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS rental_mode text NOT NULL DEFAULT 'venue',
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS plate_number text,
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS make_model text,
  ADD COLUMN IF NOT EXISTS odometer_km int,
  ADD COLUMN IF NOT EXISTS fuel_level_pct int,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS tech_control_expiry date,
  ADD COLUMN IF NOT EXISTS last_maintenance_at date,
  ADD COLUMN IF NOT EXISTS maintenance_interval_km int,
  ADD COLUMN IF NOT EXISTS weekend_multiplier numeric(6,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grace_minutes int NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS late_hourly_rate numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_units_mode') THEN
    ALTER TABLE public.rental_units
      ADD CONSTRAINT chk_rental_units_mode CHECK (rental_mode IN ('venue', 'vehicle', 'gear', 'coworking_desk'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_units_fuel_pct') THEN
    ALTER TABLE public.rental_units
      ADD CONSTRAINT chk_rental_units_fuel_pct CHECK (fuel_level_pct IS NULL OR (fuel_level_pct BETWEEN 0 AND 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_units_weekend_mult') THEN
    ALTER TABLE public.rental_units
      ADD CONSTRAINT chk_rental_units_weekend_mult CHECK (weekend_multiplier >= 1);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5b Extend rental_renters for driver license & 6.4 CRM party link
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_renters
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS driver_license_expiry date,
  ADD COLUMN IF NOT EXISTS crm_party_id uuid,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 7.5c Extend rental_bookings & add GiST double-booking exclusion constraint
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS rental_mode text NOT NULL DEFAULT 'venue',
  ADD COLUMN IF NOT EXISTS pricing_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS seasonal_rule_id uuid,
  ADD COLUMN IF NOT EXISTS late_fee_dzd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_return_at timestamptz,
  ADD COLUMN IF NOT EXISTS staged_payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_template_id uuid,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signer_name text,
  ADD COLUMN IF NOT EXISTS contract_signature_data text,
  ADD COLUMN IF NOT EXISTS ical_uid text,
  ADD COLUMN IF NOT EXISTS unified_document_id uuid,
  ADD COLUMN IF NOT EXISTS driver_license_number text,
  ADD COLUMN IF NOT EXISTS driver_license_expiry date,
  ADD COLUMN IF NOT EXISTS mileage_out int,
  ADD COLUMN IF NOT EXISTS mileage_in int,
  ADD COLUMN IF NOT EXISTS fuel_out_pct int,
  ADD COLUMN IF NOT EXISTS fuel_in_pct int,
  ADD COLUMN IF NOT EXISTS inspection_notes text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_bookings_late_fee') THEN
    ALTER TABLE public.rental_bookings
      ADD CONSTRAINT chk_rental_bookings_late_fee CHECK (late_fee_dzd >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_bookings_window') THEN
    ALTER TABLE public.rental_bookings
      ADD CONSTRAINT chk_rental_bookings_window CHECK (end_date_time > start_date_time);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_rental_bookings_no_overlap') THEN
    ALTER TABLE public.rental_bookings
      ADD CONSTRAINT excl_rental_bookings_no_overlap
      EXCLUDE USING gist (
        unit_id WITH =,
        tstzrange(start_date_time, end_date_time, '[)') WITH &&
      )
      WHERE (deleted_at IS NULL AND unit_id IS NOT NULL AND status NOT IN ('Cancelled', 'CheckedOut'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5d Extend rental_security_deposits with bounded deduction guard
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_security_deposits
  ADD COLUMN IF NOT EXISTS original_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS deducted_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_deposit_deduction') THEN
    ALTER TABLE public.rental_security_deposits
      ADD CONSTRAINT chk_rental_deposit_deduction CHECK (
        deducted_amount >= 0
        AND (
          (original_amount IS NOT NULL AND deducted_amount <= original_amount)
          OR (original_amount IS NULL AND deducted_amount <= amount)
        )
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5e Seasonal & Weekend Pricing Rules (rental_pricing_rules)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  unit_type text DEFAULT 'All',
  rental_mode text DEFAULT 'all',
  unit_id uuid REFERENCES public.rental_units(id) ON DELETE CASCADE,
  weekend_multiplier numeric(6,2) NOT NULL DEFAULT 1 CHECK (weekend_multiplier >= 1),
  weekend_days int[] NOT NULL DEFAULT '{5,6}',
  season_start_date date,
  season_end_date date,
  seasonal_multiplier numeric(6,2) NOT NULL DEFAULT 1 CHECK (seasonal_multiplier > 0),
  flat_daily_override numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.rental_pricing_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rental_pricing_rules' AND policyname = 'rental_pricing_rules_tenant_isolation'
  ) THEN
    CREATE POLICY rental_pricing_rules_tenant_isolation ON public.rental_pricing_rules
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5f Contract Templates with E-Signature Config (rental_contract_templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  rental_mode text NOT NULL DEFAULT 'all',
  body_template text NOT NULL,
  require_signature boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.rental_contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rental_contract_templates' AND policyname = 'rental_contract_templates_tenant_isolation'
  ) THEN
    CREATE POLICY rental_contract_templates_tenant_isolation ON public.rental_contract_templates
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5g Car Fleet & Gear Check-out/Check-in Logs (rental_asset_check_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_asset_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  unit_id uuid NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  log_type text NOT NULL CHECK (log_type IN ('checkout', 'checkin', 'maintenance')),
  mileage_km int,
  fuel_level_pct int CHECK (fuel_level_pct IS NULL OR (fuel_level_pct BETWEEN 0 AND 100)),
  serial_number text,
  condition_notes text,
  damage_detected boolean NOT NULL DEFAULT false,
  damage_amount_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (damage_amount_dzd >= 0),
  performed_by text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rental_asset_check_logs_unit
  ON public.rental_asset_check_logs (branch_id, unit_id, logged_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.rental_asset_check_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rental_asset_check_logs' AND policyname = 'rental_asset_check_logs_tenant_isolation'
  ) THEN
    CREATE POLICY rental_asset_check_logs_tenant_isolation ON public.rental_asset_check_logs
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5h Coworking Desk Subscriptions (rental_coworking_subscriptions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_coworking_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  renter_id uuid NOT NULL REFERENCES public.rental_renters(id) ON DELETE CASCADE,
  renter_name text NOT NULL,
  unit_id uuid REFERENCES public.rental_units(id) ON DELETE SET NULL,
  unit_name text,
  plan_name text NOT NULL,
  plan_kind text NOT NULL DEFAULT 'monthly_pass' CHECK (plan_kind IN ('monthly_pass', 'hour_pack')),
  included_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (included_hours >= 0),
  used_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (used_hours >= 0),
  monthly_fee_dzd numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_fee_dzd >= 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'paused')),
  auto_renew boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.rental_coworking_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rental_coworking_subscriptions' AND policyname = 'rental_coworking_subs_tenant_isolation'
  ) THEN
    CREATE POLICY rental_coworking_subs_tenant_isolation ON public.rental_coworking_subscriptions
      USING (public.has_branch_access(business_id, branch_id))
      WITH CHECK (public.has_branch_access(business_id, branch_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7.5i Atomic SECURITY DEFINER RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_rental_booking_atomic(
  p_booking_id uuid,
  p_account_id uuid,
  p_business_id uuid,
  p_branch_id uuid,
  p_unit_id uuid,
  p_unit_name text,
  p_unit_type text,
  p_renter_id uuid,
  p_renter_name text,
  p_renter_phone text,
  p_purpose text,
  p_start_date_time timestamptz,
  p_end_date_time timestamptz,
  p_status text DEFAULT 'Confirmed',
  p_total_amount numeric DEFAULT 0,
  p_deposit_amount numeric DEFAULT 0,
  p_staged_schedule jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := COALESCE(p_booking_id, gen_random_uuid());
  v_hours numeric;
BEGIN
  IF NOT (SELECT public.has_branch_access(p_business_id, p_branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF p_end_date_time <= p_start_date_time THEN
    RAISE EXCEPTION 'INVALID_RENTAL_WINDOW';
  END IF;

  v_hours := GREATEST(0.5, ROUND((EXTRACT(EPOCH FROM (p_end_date_time - p_start_date_time)) / 3600.0)::numeric, 2));

  INSERT INTO public.rental_bookings (
    id, account_id, business_id, branch_id,
    unit_id, unit_name, unit_type,
    renter_id, renter_name, renter_phone,
    purpose, start_date_time, end_date_time, duration_hours,
    status, base_amount, total_amount, balance_due, deposit_amount,
    staged_payment_schedule, ical_uid
  ) VALUES (
    v_id, p_account_id, p_business_id, p_branch_id,
    p_unit_id, p_unit_name, p_unit_type,
    p_renter_id, p_renter_name, p_renter_phone,
    p_purpose, p_start_date_time, p_end_date_time, v_hours,
    COALESCE(p_status, 'Confirmed'), COALESCE(p_total_amount, 0), COALESCE(p_total_amount, 0),
    COALESCE(p_total_amount, 0), COALESCE(p_deposit_amount, 0),
    COALESCE(p_staged_schedule, '[]'::jsonb), v_id::text || '@atrium.local'
  )
  ON CONFLICT (id) DO UPDATE SET
    unit_id = EXCLUDED.unit_id,
    unit_name = EXCLUDED.unit_name,
    unit_type = EXCLUDED.unit_type,
    start_date_time = EXCLUDED.start_date_time,
    end_date_time = EXCLUDED.end_date_time,
    duration_hours = EXCLUDED.duration_hours,
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    staged_payment_schedule = EXCLUDED.staged_payment_schedule,
    updated_at = now();

  RETURN jsonb_build_object(
    'booking_id', v_id,
    'duration_hours', v_hours,
    'status', COALESCE(p_status, 'Confirmed')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_rental_booking_atomic(uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, timestamptz, timestamptz, text, numeric, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_rental_booking_atomic(uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, timestamptz, timestamptz, text, numeric, numeric, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_rental_deposit_atomic(
  p_deposit_id uuid,
  p_action text,
  p_deducted_amount numeric DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dep record;
  v_held numeric;
  v_deduct numeric;
BEGIN
  IF p_action NOT IN ('release', 'deduct') THEN
    RAISE EXCEPTION 'INVALID_DEPOSIT_ACTION';
  END IF;

  SELECT * INTO v_dep
  FROM public.rental_security_deposits
  WHERE id = p_deposit_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_dep.business_id, v_dep.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_held := COALESCE(v_dep.original_amount, v_dep.amount, 0);

  IF p_action = 'release' THEN
    UPDATE public.rental_security_deposits
    SET status = 'Released',
        released_at = now(),
        updated_at = now()
    WHERE id = v_dep.id;

    IF v_dep.booking_id IS NOT NULL THEN
      UPDATE public.rental_bookings
      SET deposit_status = 'Refunded', updated_at = now()
      WHERE id = v_dep.booking_id;
    END IF;

    RETURN jsonb_build_object('deposit_id', v_dep.id, 'status', 'Released', 'amount', v_held);
  END IF;

  v_deduct := COALESCE(p_deducted_amount, 0);
  IF v_deduct <= 0 THEN
    RAISE EXCEPTION 'DEDUCTION_MUST_BE_POSITIVE';
  END IF;
  IF v_deduct > v_held THEN
    RAISE EXCEPTION 'DEDUCTION_EXCEEDS_DEPOSIT';
  END IF;
  IF NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'DEDUCTION_REASON_REQUIRED';
  END IF;

  UPDATE public.rental_security_deposits
  SET status = 'Deducted',
      original_amount = v_held,
      deducted_amount = v_deduct,
      amount = v_deduct,
      deduction_reason = trim(p_reason),
      released_at = now(),
      updated_at = now()
  WHERE id = v_dep.id;

  IF v_dep.booking_id IS NOT NULL THEN
    UPDATE public.rental_bookings
    SET deposit_status = 'Retained', updated_at = now()
    WHERE id = v_dep.booking_id;
  END IF;

  RETURN jsonb_build_object(
    'deposit_id', v_dep.id,
    'status', 'Deducted',
    'original_amount', v_held,
    'deducted_amount', v_deduct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_rental_deposit_atomic(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_rental_deposit_atomic(uuid, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_coworking_subscription_hours(
  p_subscription_id uuid,
  p_hours numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub record;
  v_next_used numeric;
BEGIN
  IF p_hours IS NULL OR p_hours <= 0 THEN
    RAISE EXCEPTION 'INVALID_HOURS';
  END IF;

  SELECT * INTO v_sub
  FROM public.rental_coworking_subscriptions
  WHERE id = p_subscription_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_sub.business_id, v_sub.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF v_sub.status <> 'active' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_NOT_ACTIVE';
  END IF;

  IF v_sub.end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EXPIRED';
  END IF;

  v_next_used := COALESCE(v_sub.used_hours, 0) + p_hours;
  IF v_sub.plan_kind = 'hour_pack' AND v_next_used > v_sub.included_hours THEN
    RAISE EXCEPTION 'INSUFFICIENT_HOURS';
  END IF;

  UPDATE public.rental_coworking_subscriptions
  SET used_hours = v_next_used,
      updated_at = now()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'subscription_id', v_sub.id,
    'used_hours', v_next_used,
    'remaining_hours', GREATEST(0, v_sub.included_hours - v_next_used)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_coworking_subscription_hours(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_coworking_subscription_hours(uuid, numeric) TO authenticated;

-- Attach optimistic & audit triggers when present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'rental_pricing_rules',
      'rental_contract_templates',
      'rental_asset_check_logs',
      'rental_coworking_subscriptions'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl, v_tbl
        );
      END IF;
    END LOOP;
  END IF;

  IF to_regprocedure('public.fn_enforce_optimistic_version()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'rental_pricing_rules',
      'rental_contract_templates',
      'rental_asset_check_logs',
      'rental_coworking_subscriptions'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_optimistic_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_optimistic_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version()',
          v_tbl, v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
