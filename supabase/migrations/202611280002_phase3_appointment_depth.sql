-- ============================================================================
-- Atrium Phase 3 Migration (Step 2): Section 7.2 Appointment Service Depth
-- Walk-in client normalization, stylist schedules/breaks/time-off,
-- prepaid packages, gift cards, loyalty ledger, tattoo/laser consent forms,
-- Hammam cabin/session workflow, service consumables & deposit cancellation RPCs
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 7.2a Extend gym_members & salon_clients with canonical client_type
-- ----------------------------------------------------------------------------
ALTER TABLE public.gym_members
  ADD COLUMN IF NOT EXISTS client_type text
    CHECK (client_type IS NULL OR client_type IN ('regular', 'vip', 'walkin'));

ALTER TABLE public.salon_clients
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'regular'
    CHECK (client_type IN ('regular', 'vip', 'walkin')),
  ADD COLUMN IF NOT EXISTS segment_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_salon_clients_client_type
  ON public.salon_clients (business_id, branch_id, client_type)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 7.2b Extend salon_services with consumables, allergies, buffer & consent flag
-- ----------------------------------------------------------------------------
ALTER TABLE public.salon_services
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  ADD COLUMN IF NOT EXISTS cost_price_centimes bigint NOT NULL DEFAULT 0 CHECK (cost_price_centimes >= 0),
  ADD COLUMN IF NOT EXISTS consumables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allergy_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS requires_consent boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 7.2c Extend salon_appointments with deposits, channel, loyalty & consumables lock
-- ----------------------------------------------------------------------------
ALTER TABLE public.salon_appointments
  ADD COLUMN IF NOT EXISTS deposit_centimes bigint NOT NULL DEFAULT 0 CHECK (deposit_centimes >= 0),
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none'
    CHECK (deposit_status IN ('none', 'held', 'applied', 'refunded', 'forfeited')),
  ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours integer NOT NULL DEFAULT 24 CHECK (cancellation_cutoff_hours >= 0),
  ADD COLUMN IF NOT EXISTS refunded_deposit_centimes bigint NOT NULL DEFAULT 0 CHECK (refunded_deposit_centimes >= 0),
  ADD COLUMN IF NOT EXISTS allergy_override_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_channel text NOT NULL DEFAULT 'desk'
    CHECK (booking_channel IN ('desk', 'online', 'whatsapp', 'walkin')),
  ADD COLUMN IF NOT EXISTS consumables_deducted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS gift_card_code text,
  ADD COLUMN IF NOT EXISTS loyalty_points_used integer NOT NULL DEFAULT 0 CHECK (loyalty_points_used >= 0),
  ADD COLUMN IF NOT EXISTS loyalty_points_earned integer NOT NULL DEFAULT 0 CHECK (loyalty_points_earned >= 0),
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE INDEX IF NOT EXISTS idx_salon_appointments_stylist_slot
  ON public.salon_appointments (business_id, branch_id, stylist_id, appointment_date)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 7.2d Stylist Working Hours, Breaks & Time Off (`salon_stylist_schedules`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_stylist_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  staff_name text NOT NULL DEFAULT '',
  salon_closing_time text NOT NULL DEFAULT '20:00',
  weekly_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_off_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_stylist_schedules_active
  ON public.salon_stylist_schedules (business_id, branch_id, staff_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_stylist_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_stylist_schedules_tenant_read" ON public.salon_stylist_schedules;
CREATE POLICY "salon_stylist_schedules_tenant_read"
  ON public.salon_stylist_schedules
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_stylist_schedules_tenant_write" ON public.salon_stylist_schedules;
CREATE POLICY "salon_stylist_schedules_tenant_write"
  ON public.salon_stylist_schedules
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2e Prepaid Packages (`salon_prepaid_packages`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_prepaid_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  client_id uuid,
  client_name text NOT NULL,
  package_name text NOT NULL,
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_filter text,
  total_sessions integer NOT NULL CHECK (total_sessions > 0),
  remaining_sessions integer NOT NULL CHECK (remaining_sessions >= 0 AND remaining_sessions <= total_sessions),
  price_centimes bigint NOT NULL DEFAULT 0 CHECK (price_centimes >= 0),
  expires_at date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'refunded')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_salon_prepaid_packages_client
  ON public.salon_prepaid_packages (business_id, branch_id, client_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_prepaid_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_prepaid_packages_tenant_read" ON public.salon_prepaid_packages;
CREATE POLICY "salon_prepaid_packages_tenant_read"
  ON public.salon_prepaid_packages
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_prepaid_packages_tenant_write" ON public.salon_prepaid_packages;
CREATE POLICY "salon_prepaid_packages_tenant_write"
  ON public.salon_prepaid_packages
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2f Gift Cards (`salon_gift_cards`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  code text NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text,
  purchaser_name text,
  initial_centimes bigint NOT NULL CHECK (initial_centimes > 0),
  remaining_centimes bigint NOT NULL CHECK (remaining_centimes >= 0 AND remaining_centimes <= initial_centimes),
  expires_at date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'void')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_gift_cards_code_active
  ON public.salon_gift_cards (business_id, lower(code))
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_gift_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_gift_cards_tenant_read" ON public.salon_gift_cards;
CREATE POLICY "salon_gift_cards_tenant_read"
  ON public.salon_gift_cards
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_gift_cards_tenant_write" ON public.salon_gift_cards;
CREATE POLICY "salon_gift_cards_tenant_write"
  ON public.salon_gift_cards
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2g Loyalty Ledger (`salon_loyalty_ledger`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  client_id uuid NOT NULL,
  client_name text,
  appointment_id uuid REFERENCES public.salon_appointments(id) ON DELETE SET NULL,
  points_delta integer NOT NULL,
  balance_after integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_salon_loyalty_ledger_client
  ON public.salon_loyalty_ledger (business_id, client_id, recorded_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_loyalty_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_loyalty_ledger_tenant_read" ON public.salon_loyalty_ledger;
CREATE POLICY "salon_loyalty_ledger_tenant_read"
  ON public.salon_loyalty_ledger
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_loyalty_ledger_tenant_write" ON public.salon_loyalty_ledger;
CREATE POLICY "salon_loyalty_ledger_tenant_write"
  ON public.salon_loyalty_ledger
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2h Tattoo & Laser Consent Forms + Signature & Before/After Photos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  client_id uuid,
  client_name text NOT NULL,
  appointment_id uuid REFERENCES public.salon_appointments(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.salon_services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  protocol_type text NOT NULL CHECK (protocol_type IN ('tattoo', 'laser', 'chemical', 'aesthetic', 'other')),
  medical_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  allergies_acknowledged boolean NOT NULL DEFAULT false,
  signature_data_url text NOT NULL,
  before_photo_path text,
  after_photo_path text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_salon_consent_forms_client
  ON public.salon_consent_forms (business_id, branch_id, client_id, signed_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_consent_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_consent_forms_tenant_read" ON public.salon_consent_forms;
CREATE POLICY "salon_consent_forms_tenant_read"
  ON public.salon_consent_forms
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_consent_forms_tenant_write" ON public.salon_consent_forms;
CREATE POLICY "salon_consent_forms_tenant_write"
  ON public.salon_consent_forms
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2i Hammam Room / Cabin Session Flow (`salon_hammam_sessions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salon_hammam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  cabin_name text NOT NULL,
  gender_block text NOT NULL CHECK (gender_block IN ('women', 'men', 'private')),
  client_id uuid,
  client_name text NOT NULL,
  client_phone text,
  attendant_id uuid,
  attendant_name text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  booked_count integer NOT NULL DEFAULT 1 CHECK (booked_count >= 0 AND booked_count <= capacity),
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_centimes bigint NOT NULL DEFAULT 0 CHECK (price_centimes >= 0),
  status text NOT NULL DEFAULT 'Booked' CHECK (status IN ('Booked', 'InSession', 'Completed', 'Cancelled')),
  notes text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_salon_hammam_sessions_slot
  ON public.salon_hammam_sessions (business_id, branch_id, session_date, cabin_name)
  WHERE deleted_at IS NULL;

ALTER TABLE public.salon_hammam_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_hammam_sessions_tenant_read" ON public.salon_hammam_sessions;
CREATE POLICY "salon_hammam_sessions_tenant_read"
  ON public.salon_hammam_sessions
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "salon_hammam_sessions_tenant_write" ON public.salon_hammam_sessions;
CREATE POLICY "salon_hammam_sessions_tenant_write"
  ON public.salon_hammam_sessions
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.has_business_access(business_id))
    AND (SELECT public.has_branch_access(business_id, branch_id))
  );

-- ----------------------------------------------------------------------------
-- 7.2j Transactional RPC: Appointment Cancellation + Deposit Refund/Forfeit
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_salon_appointment_with_deposit(
  p_appointment_id uuid,
  p_cancelled_at timestamptz DEFAULT now(),
  p_new_status text DEFAULT 'Cancelled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_apt record;
  v_appt_ts timestamptz;
  v_hours_before double precision;
  v_deposit_status text := 'none';
  v_refund_centimes bigint := 0;
BEGIN
  IF p_new_status NOT IN ('Cancelled', 'NoShow') THEN
    RAISE EXCEPTION 'INVALID_CANCEL_STATUS';
  END IF;

  SELECT id, business_id, branch_id, appointment_date, start_time, deposit_centimes, deposit_status, cancellation_cutoff_hours
  INTO v_apt
  FROM public.salon_appointments
  WHERE id = p_appointment_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND';
  END IF;

  IF NOT (SELECT public.has_branch_access(v_apt.business_id, v_apt.branch_id)) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_appt_ts := ((v_apt.appointment_date::text || ' ' || coalesce(nullif(v_apt.start_time, ''), '09:00') || ':00')::timestamp AT TIME ZONE 'UTC');
  v_hours_before := EXTRACT(EPOCH FROM (v_appt_ts - coalesce(p_cancelled_at, now()))) / 3600.0;

  IF coalesce(v_apt.deposit_centimes, 0) > 0 AND v_apt.deposit_status = 'held' THEN
    IF p_new_status = 'Cancelled' AND v_hours_before >= coalesce(v_apt.cancellation_cutoff_hours, 24) THEN
      v_deposit_status := 'refunded';
      v_refund_centimes := v_apt.deposit_centimes;
    ELSE
      v_deposit_status := 'forfeited';
      v_refund_centimes := 0;
    END IF;
  ELSE
    v_deposit_status := coalesce(v_apt.deposit_status, 'none');
  END IF;

  UPDATE public.salon_appointments
  SET status = p_new_status,
      deposit_status = v_deposit_status,
      refunded_deposit_centimes = v_refund_centimes,
      updated_at = now()
  WHERE id = v_apt.id;

  RETURN jsonb_build_object(
    'appointment_id', v_apt.id,
    'status', p_new_status,
    'deposit_status', v_deposit_status,
    'refunded_deposit_centimes', v_refund_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_salon_appointment_with_deposit(uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_salon_appointment_with_deposit(uuid, timestamptz, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7.2k Transactional RPC: Prepaid Package Session or Gift Card Redemption
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_salon_package_or_gift_card(
  p_package_id uuid DEFAULT NULL,
  p_gift_card_id uuid DEFAULT NULL,
  p_amount_centimes bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pkg record;
  v_gc record;
  v_applied_centimes bigint := 0;
  v_pkg_remaining integer := NULL;
BEGIN
  IF p_package_id IS NULL AND p_gift_card_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_REDEMPTION_TARGET';
  END IF;

  IF p_package_id IS NOT NULL THEN
    SELECT id, business_id, branch_id, remaining_sessions, status
    INTO v_pkg
    FROM public.salon_prepaid_packages
    WHERE id = p_package_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PREPAID_PACKAGE_NOT_FOUND';
    END IF;

    IF NOT (SELECT public.has_branch_access(v_pkg.business_id, v_pkg.branch_id)) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;

    IF v_pkg.status <> 'active' OR v_pkg.remaining_sessions <= 0 THEN
      RAISE EXCEPTION 'PREPAID_PACKAGE_EXHAUSTED';
    END IF;

    v_pkg_remaining := v_pkg.remaining_sessions - 1;
    UPDATE public.salon_prepaid_packages
    SET remaining_sessions = v_pkg_remaining,
        status = CASE WHEN v_pkg_remaining = 0 THEN 'exhausted' ELSE status END,
        updated_at = now(),
        version = version + 1
    WHERE id = v_pkg.id;
  END IF;

  IF p_gift_card_id IS NOT NULL THEN
    IF coalesce(p_amount_centimes, 0) <= 0 THEN
      RAISE EXCEPTION 'INVALID_GIFT_CARD_AMOUNT';
    END IF;

    SELECT id, business_id, branch_id, remaining_centimes, status
    INTO v_gc
    FROM public.salon_gift_cards
    WHERE id = p_gift_card_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GIFT_CARD_NOT_FOUND';
    END IF;

    IF NOT (SELECT public.has_branch_access(v_gc.business_id, v_gc.branch_id)) THEN
      RAISE EXCEPTION 'ACCESS_DENIED';
    END IF;

    IF v_gc.status <> 'active' OR v_gc.remaining_centimes <= 0 THEN
      RAISE EXCEPTION 'GIFT_CARD_UNAVAILABLE';
    END IF;

    v_applied_centimes := LEAST(v_gc.remaining_centimes, p_amount_centimes);
    UPDATE public.salon_gift_cards
    SET remaining_centimes = v_gc.remaining_centimes - v_applied_centimes,
        status = CASE WHEN (v_gc.remaining_centimes - v_applied_centimes) = 0 THEN 'redeemed' ELSE status END,
        updated_at = now(),
        version = version + 1
    WHERE id = v_gc.id;
  END IF;

  RETURN jsonb_build_object(
    'package_remaining_sessions', v_pkg_remaining,
    'gift_card_applied_centimes', v_applied_centimes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_salon_package_or_gift_card(uuid, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_salon_package_or_gift_card(uuid, uuid, bigint) TO authenticated;

-- Attach audit triggers when immutable audit trigger function is present
DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'salon_stylist_schedules',
      'salon_prepaid_packages',
      'salon_gift_cards',
      'salon_loyalty_ledger',
      'salon_consent_forms',
      'salon_hammam_sessions'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl,
          v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
