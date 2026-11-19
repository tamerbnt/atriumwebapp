-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 2: GROUP A CATEGORY ISOLATION & MIGRATION (7 LIVE)
-- Verticals: gym_*, salon_*, pos_*, pm_*, rental_*, edu_*, freelance_*
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MEMBERSHIP_SESSION (gym_*) — Dedicated Vertical Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gym_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'Coach',
  specialty text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  description text,
  duration_days int NOT NULL DEFAULT 30,
  session_quota int,
  price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  access_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  plan_id uuid REFERENCES public.gym_plans(id) ON DELETE SET NULL,
  plan_name text,
  full_name text NOT NULL,
  email text,
  phone_number text,
  status text NOT NULL DEFAULT 'Active',
  card_id text,
  rfid_tag text,
  barcode text,
  profile_image_url text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,
  remaining_sessions int,
  gender text NOT NULL DEFAULT 'Other',
  notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  segment_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_registration_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  email text,
  phone_number text,
  source text NOT NULL DEFAULT 'Web Form',
  preferred_plan_name text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  member_id uuid REFERENCES public.gym_members(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.gym_plans(id) ON DELETE SET NULL,
  plan_name text,
  amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  member_id uuid NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  method text NOT NULL DEFAULT 'rfid' CHECK (method IN ('rfid', 'qr', 'manual', 'turnstile')),
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'denied_expired', 'denied_frozen', 'denied_quota')),
  remaining_sessions_after int,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_walk_in_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  visitor_name text NOT NULL,
  phone_number text,
  ticket_code text NOT NULL,
  amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  valid_date date NOT NULL DEFAULT CURRENT_DATE,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  title text NOT NULL,
  coach_name text,
  room_name text,
  day_of_week int,
  start_time text NOT NULL,
  end_time text NOT NULL,
  capacity int NOT NULL DEFAULT 20,
  enrolled_count int NOT NULL DEFAULT 0,
  color_hex text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  description text,
  sku text,
  category text NOT NULL DEFAULT 'Supplements',
  price_amount numeric(12,2) NOT NULL DEFAULT 0,
  cost_amount numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level numeric(12,2) NOT NULL DEFAULT 5,
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  member_id uuid REFERENCES public.gym_members(id) ON DELETE SET NULL,
  member_name text,
  receipt_number text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  notes text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gym_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sale_id uuid NOT NULL REFERENCES public.gym_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.gym_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 2. APPOINTMENT_SERVICE (salon_*) — Dedicated Vertical Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.salon_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  specialty text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 40,
  color_hex text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_workstations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  zone text NOT NULL DEFAULT 'Main Floor',
  status text NOT NULL DEFAULT 'Available',
  assigned_stylist_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_chair_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  chair_number text NOT NULL,
  stylist_id uuid REFERENCES public.salon_staff(id) ON DELETE SET NULL,
  stylist_name text,
  current_client_name text,
  current_service_name text,
  status text NOT NULL DEFAULT 'Free' CHECK (status IN ('Free', 'Occupied', 'Cleaning', 'Break')),
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  phone text,
  email text,
  hair_skin_notes text,
  color_formula text,
  loyalty_points int NOT NULL DEFAULT 0,
  total_visits int NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Styling',
  duration_minutes int NOT NULL DEFAULT 45,
  price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  commission_percent numeric(5,2) NOT NULL DEFAULT 40,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  sku text,
  category text NOT NULL DEFAULT 'Retail Care',
  price_amount numeric(12,2) NOT NULL DEFAULT 0,
  cost_amount numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level numeric(12,2) NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  client_id uuid REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  stylist_id uuid REFERENCES public.salon_staff(id) ON DELETE SET NULL,
  staff_name text NOT NULL,
  service_id uuid REFERENCES public.salon_services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  appointment_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 45,
  price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Booked', 'InChair', 'Completed', 'Cancelled', 'NoShow')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salon_appointments_status_check'
      AND conrelid = 'public.salon_appointments'::regclass
  ) THEN
    ALTER TABLE public.salon_appointments DROP CONSTRAINT salon_appointments_status_check;
    ALTER TABLE public.salon_appointments
      ADD CONSTRAINT salon_appointments_status_check
      CHECK (status IN ('Confirmed', 'Booked', 'InChair', 'Completed', 'Cancelled', 'NoShow'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.salon_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  appointment_id uuid REFERENCES public.salon_appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  client_name text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  notes text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sale_id uuid NOT NULL REFERENCES public.salon_sales(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'service' CHECK (item_type IN ('service', 'product')),
  item_ref_id uuid,
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.salon_stylist_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  stylist_id uuid REFERENCES public.salon_staff(id) ON DELETE SET NULL,
  stylist_name text NOT NULL,
  period_label text NOT NULL,
  services_count int NOT NULL DEFAULT 0,
  gross_revenue_dzd numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL DEFAULT 40,
  commission_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid')),
  payment_method text,
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 3. POS_INVENTORY (pos_*) — Dedicated Vertical Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pos_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Cashier',
  drawer_limit_dzd numeric(12,2) NOT NULL DEFAULT 100000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  phone text,
  email text,
  loyalty_points int NOT NULL DEFAULT 0,
  credit_balance_dzd numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  category text NOT NULL DEFAULT 'General',
  price_amount numeric(12,2) NOT NULL DEFAULT 0,
  cost_amount numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level numeric(12,2) NOT NULL DEFAULT 5,
  tax_rate numeric(5,2) NOT NULL DEFAULT 19,
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  customer_id uuid REFERENCES public.pos_customers(id) ON DELETE SET NULL,
  customer_name text,
  receipt_number text NOT NULL,
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Refunded', 'Voided')),
  notes text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_parked_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  label text NOT NULL,
  customer_name text,
  table_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.pos_parked_orders
  ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.pos_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'sale', 'refund')),
  quantity numeric(12,2) NOT NULL,
  previous_stock numeric(12,2) NOT NULL DEFAULT 0,
  new_stock numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pos_receipt_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  header_title text NOT NULL DEFAULT 'ATRIUM POS',
  footer_message text,
  show_tax_breakdown boolean NOT NULL DEFAULT true,
  paper_width_mm int NOT NULL DEFAULT 80,
  nif text,
  rc_number text,
  nis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (branch_id)
);

-- Migrate legacy shared gym/salon/pos rows into isolated tables safely
DO $$
DECLARE
  v_price_col text;
  v_cost_col text;
  v_active_expr text;
  v_receipt_expr text;
  v_sold_at_expr text;
  v_member_name_expr text;
  v_apt_date_expr text;
  v_apt_start_expr text;
  v_apt_end_expr text;
  v_apt_dur_expr text;
BEGIN
  -- 1a. Live members -> gym_members
  IF to_regclass('public.members') IS NOT NULL THEN
    INSERT INTO public.gym_members (
      id, account_id, business_id, branch_id, staff_id, full_name, email, phone_number,
      status, card_id, profile_image_url, start_date, expiration_date,
      remaining_sessions, gender, notes, emergency_contact_name, emergency_contact_phone,
      segment_data_json, created_at, updated_at, deleted_at
    )
    SELECT
      m.id, m.account_id, COALESCE(m.business_id, br.business_id), m.branch_id, m.registered_by_staff_id,
      m.full_name, m.email, m.phone_number,
      CASE m.status::text
        WHEN '0' THEN 'Active'
        WHEN '1' THEN 'Expired'
        WHEN '2' THEN 'Frozen'
        WHEN '3' THEN 'Suspended'
        ELSE COALESCE(NULLIF(m.status::text, ''), 'Active')
      END,
      m.card_id, m.profile_image_url,
      COALESCE(m.start_date::date, CURRENT_DATE), m.expiration_date::date,
      m.remaining_sessions,
      CASE m.gender::text
        WHEN '0' THEN 'Male'
        WHEN '1' THEN 'Female'
        ELSE COALESCE(NULLIF(m.gender::text, ''), 'Other')
      END,
      m.notes, m.emergency_contact_name, m.emergency_contact_phone,
      CASE
        WHEN m.segment_data_json IS NOT NULL AND left(trim(m.segment_data_json::text), 1) = '{' THEN m.segment_data_json::jsonb
        ELSE '{}'::jsonb
      END,
      COALESCE(m.created_at, now()), COALESCE(m.updated_at, m.created_at, now()),
      CASE WHEN COALESCE(m.is_deleted, false) THEN COALESCE(m.updated_at, now()) ELSE NULL END
    FROM public.members m
    JOIN public.branches br ON br.id = m.branch_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 1b. Members Directory -> gym_members / salon_clients (supports both live & base schema)
  IF to_regclass('public.members_directory') IS NOT NULL THEN
    INSERT INTO public.gym_members (
      id, account_id, business_id, branch_id, staff_id, full_name, email, phone_number,
      status, rfid_tag, barcode, profile_image_url, gender, created_at, updated_at
    )
    SELECT
      m.id, m.account_id, COALESCE(m.business_id, br.business_id), m.branch_id, m.staff_id,
      m.full_name,
      to_jsonb(m)->>'email',
      m.phone,
      COALESCE(NULLIF(to_jsonb(m)->>'status', ''), CASE WHEN COALESCE(m.is_active, true) THEN 'Active' ELSE 'Suspended' END),
      m.rfid_tag, m.barcode,
      to_jsonb(m)->>'photo_url',
      COALESCE(NULLIF(to_jsonb(m)->>'gender', ''), 'Other'),
      COALESCE((to_jsonb(m)->>'created_at')::timestamptz, (to_jsonb(m)->>'synced_at')::timestamptz, now()),
      COALESCE((to_jsonb(m)->>'updated_at')::timestamptz, (to_jsonb(m)->>'synced_at')::timestamptz, now())
    FROM public.members_directory m
    JOIN public.branches br ON br.id = m.branch_id
    JOIN public.businesses biz ON biz.id = br.business_id
    WHERE biz.category = 'membership_session'
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.salon_clients (
      id, account_id, business_id, branch_id, staff_id, full_name, phone, email, created_at, updated_at
    )
    SELECT
      m.id, m.account_id, COALESCE(m.business_id, br.business_id), m.branch_id, m.staff_id,
      m.full_name, m.phone,
      to_jsonb(m)->>'email',
      COALESCE((to_jsonb(m)->>'created_at')::timestamptz, (to_jsonb(m)->>'synced_at')::timestamptz, now()),
      COALESCE((to_jsonb(m)->>'updated_at')::timestamptz, (to_jsonb(m)->>'synced_at')::timestamptz, now())
    FROM public.members_directory m
    JOIN public.branches br ON br.id = m.branch_id
    JOIN public.businesses biz ON biz.id = br.business_id
    WHERE biz.category = 'appointment_service'
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 2. Legacy products -> pos_products / gym_products / salon_products
  IF to_regclass('public.products') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price_amount'
    ) THEN 'COALESCE(p.price_amount, 0)' ELSE 'COALESCE(p.price, 0)' END INTO v_price_col;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='cost_amount'
    ) THEN 'COALESCE(p.cost_amount, 0)' ELSE 'COALESCE(p.cost, 0)' END INTO v_cost_col;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_deleted'
    ) THEN 'NOT COALESCE(p.is_deleted, false)' ELSE 'COALESCE(p.is_active, true)' END INTO v_active_expr;

    EXECUTE format('
      INSERT INTO public.pos_products (
        id, account_id, business_id, branch_id, staff_id, name, description, sku, category,
        price_amount, cost_amount, stock_quantity, reorder_level, image_url, is_active, created_at, updated_at
      )
      SELECT
        p.id, p.account_id, COALESCE(p.business_id, br.business_id), p.branch_id, p.staff_id,
        p.name, p.description, p.sku, COALESCE(NULLIF(p.category::text, ''''), ''General''),
        %s, %s, COALESCE(p.stock_quantity, 0), COALESCE(p.reorder_level, 5), p.image_url,
        %s, COALESCE(p.created_at, now()), COALESCE(p.created_at, now())
      FROM public.products p
      JOIN public.branches br ON br.id = p.branch_id
      JOIN public.businesses biz ON biz.id = br.business_id
      WHERE biz.category = ''pos_inventory''
      ON CONFLICT (id) DO NOTHING;
    ', v_price_col, v_cost_col, v_active_expr);

    EXECUTE format('
      INSERT INTO public.gym_products (
        id, account_id, business_id, branch_id, staff_id, name, description, sku, category,
        price_amount, cost_amount, stock_quantity, reorder_level, image_url, is_active, created_at, updated_at
      )
      SELECT
        p.id, p.account_id, COALESCE(p.business_id, br.business_id), p.branch_id, p.staff_id,
        p.name, p.description, p.sku, COALESCE(NULLIF(p.category::text, ''''), ''Supplements''),
        %s, %s, COALESCE(p.stock_quantity, 0), COALESCE(p.reorder_level, 5), p.image_url,
        %s, COALESCE(p.created_at, now()), COALESCE(p.created_at, now())
      FROM public.products p
      JOIN public.branches br ON br.id = p.branch_id
      JOIN public.businesses biz ON biz.id = br.business_id
      WHERE biz.category = ''membership_session''
      ON CONFLICT (id) DO NOTHING;
    ', v_price_col, v_cost_col, v_active_expr);

    EXECUTE format('
      INSERT INTO public.salon_products (
        id, account_id, business_id, branch_id, staff_id, name, sku, category,
        price_amount, cost_amount, stock_quantity, reorder_level, is_active, created_at, updated_at
      )
      SELECT
        p.id, p.account_id, COALESCE(p.business_id, br.business_id), p.branch_id, p.staff_id,
        p.name, p.sku, COALESCE(NULLIF(p.category::text, ''''), ''Retail Care''),
        %s, %s, COALESCE(p.stock_quantity, 0), COALESCE(p.reorder_level, 5),
        %s, COALESCE(p.created_at, now()), COALESCE(p.created_at, now())
      FROM public.products p
      JOIN public.branches br ON br.id = p.branch_id
      JOIN public.businesses biz ON biz.id = br.business_id
      WHERE biz.category = ''appointment_service''
      ON CONFLICT (id) DO NOTHING;
    ', v_price_col, v_cost_col, v_active_expr);
  END IF;

  -- 3. Legacy sales -> pos_sales (+ sale_items -> pos_sale_items)
  IF to_regclass('public.sales') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales' AND column_name='receipt_number'
    ) THEN 'COALESCE(s.receipt_number, ''REC-'' || LEFT(s.id::text, 8))' ELSE '''REC-'' || LEFT(s.id::text, 8)' END INTO v_receipt_expr;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales' AND column_name='timestamp'
    ) THEN 'COALESCE(s.timestamp, s.created_at, now())' ELSE 'COALESCE(s.created_at, now())' END INTO v_sold_at_expr;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales' AND column_name='member_name'
    ) THEN 's.member_name' ELSE 'NULL::text' END INTO v_member_name_expr;

    EXECUTE format('
      INSERT INTO public.pos_sales (
        id, account_id, business_id, branch_id, staff_id, customer_name, receipt_number,
        total_amount, payment_method, notes, sold_at, created_at
      )
      SELECT
        s.id, s.account_id, COALESCE(s.business_id, br.business_id), s.branch_id, s.staff_id,
        %s, %s, COALESCE(s.total_amount, 0),
        CASE
          WHEN s.payment_method::text IN (''1'', ''Cash'') THEN ''Cash''
          WHEN s.payment_method::text IN (''2'', ''Card'') THEN ''Card''
          WHEN s.payment_method::text IN (''3'', ''Check'') THEN ''Check''
          ELSE COALESCE(NULLIF(s.payment_method::text, ''''), ''Cash'')
        END,
        s.notes, %s, COALESCE(s.created_at, now())
      FROM public.sales s
      JOIN public.branches br ON br.id = s.branch_id
      JOIN public.businesses biz ON biz.id = br.business_id
      WHERE biz.category = ''pos_inventory''
      ON CONFLICT (id) DO NOTHING;
    ', v_member_name_expr, v_receipt_expr, v_sold_at_expr);

    IF to_regclass('public.sale_items') IS NOT NULL THEN
      INSERT INTO public.pos_sale_items (
        id, account_id, business_id, branch_id, staff_id,
        sale_id, product_id, product_name, quantity, unit_price, tax_amount, total_price, created_at
      )
      SELECT
        si.id, ps.account_id, ps.business_id, ps.branch_id, ps.staff_id,
        si.sale_id,
        CASE WHEN EXISTS (SELECT 1 FROM public.pos_products pp WHERE pp.id = si.product_id) THEN si.product_id ELSE NULL END,
        COALESCE(NULLIF(si.product_name, ''), si.name_snapshot, 'Item'),
        COALESCE(si.quantity, 1),
        COALESCE(si.unit_price, si.price_snapshot, 0),
        COALESCE(si.tax_amount, 0),
        COALESCE(si.total_price, COALESCE(si.quantity, 1) * COALESCE(si.unit_price, si.price_snapshot, 0)),
        COALESCE(si.created_at, now())
      FROM public.sale_items si
      JOIN public.pos_sales ps ON ps.id = si.sale_id
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  -- 4. Legacy appointments -> salon_appointments (supports both live timestamptz & base date/text)
  IF to_regclass('public.appointments') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='date'
    ) THEN 'a.date' ELSE 'COALESCE(a.start_time::date, CURRENT_DATE)' END INTO v_apt_date_expr;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='start_time' AND data_type LIKE '%timestamp%'
    ) THEN 'COALESCE(to_char(a.start_time, ''HH24:MI''), ''09:00'')' ELSE 'COALESCE(a.start_time::text, ''09:00'')' END INTO v_apt_start_expr;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='end_time' AND data_type LIKE '%timestamp%'
    ) THEN 'COALESCE(to_char(a.end_time, ''HH24:MI''), ''10:00'')' ELSE 'COALESCE(a.end_time::text, ''10:00'')' END INTO v_apt_end_expr;

    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='duration_minutes'
    ) THEN 'COALESCE(a.duration_minutes, 45)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='start_time' AND data_type LIKE '%timestamp%'
    ) THEN 'GREATEST(15, COALESCE(EXTRACT(EPOCH FROM (a.end_time - a.start_time))::int / 60, 45))'
    ELSE '45' END INTO v_apt_dur_expr;

    EXECUTE format('
      INSERT INTO public.salon_appointments (
        id, account_id, business_id, branch_id, staff_id,
        client_name, client_phone, staff_name, service_name,
        appointment_date, start_time, end_time, duration_minutes, price, status, notes, created_at
      )
      SELECT
        a.id, a.account_id, COALESCE(a.business_id, br.business_id), a.branch_id, a.created_by_staff_id,
        a.client_name, a.client_phone, COALESCE(to_jsonb(a)->>''staff_name'', ''Staff''), a.service_name,
        %s, %s, %s, %s, COALESCE(a.price, 0),
        CASE WHEN a.status IN (''Confirmed'', ''Booked'', ''InChair'', ''Completed'', ''Cancelled'', ''NoShow'') THEN a.status ELSE ''Confirmed'' END,
        a.notes, COALESCE(a.created_at, now())
      FROM public.appointments a
      JOIN public.branches br ON br.id = a.branch_id
      JOIN public.businesses biz ON biz.id = br.business_id
      WHERE biz.category = ''appointment_service''
      ON CONFLICT (id) DO NOTHING;
    ', v_apt_date_expr, v_apt_start_expr, v_apt_end_expr, v_apt_dur_expr);
  END IF;
END $$;

-- ============================================================================
-- 4. PROJECT_MILESTONE (pm_*) — Harden 15 Tables + Add pm_staff
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pm_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  agency_role text NOT NULL DEFAULT 'project_manager',
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
DECLARE
  pm_tbl text;
BEGIN
  FOREACH pm_tbl IN ARRAY ARRAY[
    'pm_clients',
    'pm_projects',
    'pm_milestones',
    'pm_collateral_catalog',
    'pm_print_orders',
    'pm_bat_deliverables',
    'pm_talents',
    'pm_missions',
    'pm_mission_staff',
    'pm_attendances',
    'pm_expenses',
    'pm_payroll_batches',
    'pm_ccp_slips',
    'pm_equipment_stock'
  ]
  LOOP
    EXECUTE format('
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS account_id uuid,
        ADD COLUMN IF NOT EXISTS business_id uuid,
        ADD COLUMN IF NOT EXISTS branch_id uuid,
        ADD COLUMN IF NOT EXISTS staff_id uuid,
        ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
        ADD COLUMN IF NOT EXISTS device_id text,
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ', pm_tbl);

    -- Backfill account_id / business_id / branch_id from tenant_id / facility_id where present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = pm_tbl AND column_name = 'facility_id'
    ) THEN
      EXECUTE format('
        UPDATE public.%I t
        SET branch_id = COALESCE(t.branch_id, CASE WHEN t.facility_id::text ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN t.facility_id::text::uuid ELSE NULL END),
            account_id = COALESCE(t.account_id, CASE WHEN t.tenant_id::text ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN t.tenant_id::text::uuid ELSE NULL END)
        WHERE (t.branch_id IS NULL OR t.account_id IS NULL);
      ', pm_tbl);
    END IF;

    EXECUTE format('
      UPDATE public.%I t
      SET business_id = b.business_id,
          account_id = COALESCE(t.account_id, b.account_id)
      FROM public.branches b
      WHERE t.branch_id = b.id AND (t.business_id IS NULL OR t.account_id IS NULL);
    ', pm_tbl);

    -- Drop legacy tenant_id / facility_id if present
    EXECUTE format('
      ALTER TABLE public.%I
        DROP COLUMN IF EXISTS tenant_id,
        DROP COLUMN IF EXISTS facility_id;
    ', pm_tbl);
  END LOOP;
END $$;

ALTER TABLE public.pm_projects ALTER COLUMN client_id DROP NOT NULL;

UPDATE public.pm_milestones m
SET account_id = p.account_id,
    business_id = p.business_id,
    branch_id = p.branch_id
FROM public.pm_projects p
WHERE m.project_id = p.id
  AND (m.account_id IS NULL OR m.business_id IS NULL OR m.branch_id IS NULL);

UPDATE public.pm_mission_staff ms
SET account_id = mi.account_id,
    business_id = mi.business_id,
    branch_id = mi.branch_id
FROM public.pm_missions mi
WHERE ms.mission_id = mi.id
  AND (ms.account_id IS NULL OR ms.business_id IS NULL OR ms.branch_id IS NULL);

-- ============================================================================
-- 5. RENTAL_BOOKING (rental_*) — Standardize, UUID FKs & Overlap Guard
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rental_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Concierge',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF to_regclass('public.rentable_units') IS NOT NULL AND to_regclass('public.rental_units') IS NULL THEN
    ALTER TABLE public.rentable_units RENAME TO rental_units;
  END IF;
  IF to_regclass('public.security_deposits') IS NOT NULL AND to_regclass('public.rental_security_deposits') IS NULL THEN
    ALTER TABLE public.security_deposits RENAME TO rental_security_deposits;
  END IF;
END $$;

DO $$
DECLARE
  r_tbl text;
BEGIN
  FOREACH r_tbl IN ARRAY ARRAY[
    'rental_units',
    'rental_renters',
    'rental_bookings',
    'rental_security_deposits'
  ]
  LOOP
    IF to_regclass('public.' || r_tbl) IS NOT NULL THEN
      EXECUTE format('
        ALTER TABLE public.%I
          ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
          ADD COLUMN IF NOT EXISTS device_id text,
          ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
          ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
          ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
      ', r_tbl);
    END IF;
  END LOOP;
END $$;

-- Convert text FK IDs safely to UUIDs on rental_bookings & rental_security_deposits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_bookings' AND column_name = 'unit_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.rental_bookings ALTER COLUMN unit_id DROP NOT NULL;
    ALTER TABLE public.rental_bookings ALTER COLUMN renter_id DROP NOT NULL;
    ALTER TABLE public.rental_bookings
      ALTER COLUMN unit_id TYPE uuid USING (
        CASE WHEN unit_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN unit_id::uuid ELSE NULL END
      ),
      ALTER COLUMN renter_id TYPE uuid USING (
        CASE WHEN renter_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN renter_id::uuid ELSE NULL END
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_security_deposits' AND column_name = 'booking_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.rental_security_deposits ALTER COLUMN booking_id DROP NOT NULL;
    ALTER TABLE public.rental_security_deposits
      ALTER COLUMN booking_id TYPE uuid USING (
        CASE WHEN booking_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN booking_id::uuid ELSE NULL END
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.rental_booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION public.fn_rental_check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.status IN ('Cancelled', 'CheckedOut') THEN
    RETURN NEW;
  END IF;

  IF NEW.end_date_time <= NEW.start_date_time THEN
    RAISE EXCEPTION 'INVALID_RENTAL_WINDOW: end_date_time must be after start_date_time';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.rental_bookings b
    WHERE b.id <> NEW.id
      AND b.unit_id = NEW.unit_id
      AND b.branch_id = NEW.branch_id
      AND b.deleted_at IS NULL
      AND b.status NOT IN ('Cancelled', 'CheckedOut')
      AND tstzrange(b.start_date_time, b.end_date_time, '[)')
          && tstzrange(NEW.start_date_time, NEW.end_date_time, '[)')
  ) THEN
    RAISE EXCEPTION 'RENTAL_DOUBLE_BOOKING: Unit % already reserved for overlapping time window.', NEW.unit_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rental_booking_overlap ON public.rental_bookings;
CREATE TRIGGER trg_rental_booking_overlap
  BEFORE INSERT OR UPDATE ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_rental_check_booking_overlap();

-- ============================================================================
-- 6. EDUCATION_COHORT (edu_*) — Traceability, Soft Delete & Legacy Cleanup
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.edu_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  academic_role text NOT NULL DEFAULT 'Instructor',
  specialty text,
  hourly_rate_dzd numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Language',
  description text,
  duration_weeks int NOT NULL DEFAULT 8,
  total_hours numeric(8,2) NOT NULL DEFAULT 0,
  default_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  capacity int NOT NULL DEFAULT 20,
  has_projector boolean NOT NULL DEFAULT false,
  has_computers boolean NOT NULL DEFAULT false,
  color_hex text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  name text NOT NULL,
  course_id uuid,
  course_title text NOT NULL,
  instructor_id text,
  instructor_name text NOT NULL DEFAULT '',
  classroom_name text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + 90),
  max_students int NOT NULL DEFAULT 25,
  enrolled_count int NOT NULL DEFAULT 0,
  tuition_fee numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  schedule_summary text,
  status text NOT NULL DEFAULT 'Enrolling',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  email text,
  phone text,
  guardian_name text,
  guardian_phone text,
  guardian_relation text,
  birth_date date,
  rfid_badge_code text,
  school_grade text,
  attendance_rate_percent numeric(5,2) NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'Active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  cohort_id uuid NOT NULL,
  cohort_name text NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  agreed_tuition numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_reason text,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance_due numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  payment_status text NOT NULL DEFAULT 'Pending',
  status text NOT NULL DEFAULT 'Active',
  installments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  cohort_id uuid NOT NULL,
  cohort_name text NOT NULL,
  classroom_id uuid,
  classroom_name text,
  instructor_id text,
  instructor_name text NOT NULL DEFAULT '',
  topic text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  status text NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  session_id uuid NOT NULL,
  cohort_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  minutes_late int NOT NULL DEFAULT 0,
  excuse_note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  cohort_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  assessment_title text NOT NULL,
  score numeric(8,2) NOT NULL DEFAULT 0,
  max_score numeric(8,2) NOT NULL DEFAULT 20,
  weight_percent numeric(5,2) NOT NULL DEFAULT 100,
  teacher_remarks text,
  graded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  cohort_id uuid NOT NULL,
  course_title text NOT NULL,
  certificate_number text NOT NULL,
  verification_hash text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  average_grade_score numeric(5,2),
  honors text,
  signatory_name text NOT NULL DEFAULT 'Direction Académique',
  signatory_title text NOT NULL DEFAULT 'Directeur Pédagogique',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.edu_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  student_name text NOT NULL,
  email text,
  phone text,
  desired_course_id uuid,
  desired_course_title text NOT NULL,
  guardian_name text,
  placement_score numeric(5,2),
  source text,
  stage text NOT NULL DEFAULT 'Inquiry',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
DECLARE
  e_tbl text;
BEGIN
  FOREACH e_tbl IN ARRAY ARRAY[
    'edu_courses',
    'edu_classrooms',
    'edu_cohorts',
    'edu_students',
    'edu_enrollments',
    'edu_sessions',
    'edu_attendance',
    'edu_grades',
    'edu_certificates',
    'edu_admissions'
  ]
  LOOP
    EXECUTE format('
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS business_id uuid,
        ADD COLUMN IF NOT EXISTS staff_id uuid,
        ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
        ADD COLUMN IF NOT EXISTS device_id text,
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ', e_tbl);

    EXECUTE format('
      UPDATE public.%I t
      SET business_id = b.business_id,
          account_id = COALESCE(t.account_id, b.account_id)
      FROM public.branches b
      WHERE t.branch_id = b.id AND t.business_id IS NULL;
    ', e_tbl);
  END LOOP;
END $$;

ALTER TABLE public.edu_cohorts
  ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'edu_cohorts' AND column_name = 'cohort_code'
  ) THEN
    UPDATE public.edu_cohorts
    SET code = COALESCE(NULLIF(code, ''), cohort_code, '')
    WHERE code = '';
  END IF;
END $$;

-- Migrate any stray rows from education_* duplicates then drop them
DO $$
DECLARE
  v_instructor_expr text;
BEGIN
  IF to_regclass('public.education_students') IS NOT NULL THEN
    INSERT INTO public.edu_students (
      id, account_id, business_id, branch_id, staff_id, full_name, email, phone,
      guardian_name, guardian_phone, guardian_relation, birth_date, rfid_badge_code,
      school_grade, status, notes, created_at
    )
    SELECT
      es.id, es.account_id, COALESCE(es.business_id, br.business_id), es.branch_id, es.staff_id,
      es.full_name, es.email, COALESCE(es.phone, ''), es.guardian_name, es.guardian_phone, es.guardian_relation,
      es.birth_date, es.rfid_badge_code, es.school_grade, es.status, es.notes, es.created_at
    FROM public.education_students es
    JOIN public.branches br ON br.id = es.branch_id
    ON CONFLICT (id) DO NOTHING;
    DROP TABLE public.education_students CASCADE;
  END IF;

  IF to_regclass('public.education_cohorts') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'edu_cohorts' AND column_name = 'instructor_id' AND data_type = 'uuid'
    ) THEN 'CASE WHEN ec.instructor_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN ec.instructor_id::uuid ELSE NULL END'
    ELSE 'ec.instructor_id' END INTO v_instructor_expr;

    EXECUTE format('
      INSERT INTO public.edu_cohorts (
        id, account_id, business_id, branch_id, staff_id, code, name, course_id, course_title,
        instructor_id, instructor_name, classroom_name, start_date, end_date, max_students,
        enrolled_count, tuition_fee, currency, schedule_summary, status, created_at
      )
      SELECT
        ec.id, ec.account_id, COALESCE(ec.business_id, br.business_id), ec.branch_id, ec.staff_id,
        ec.code, ec.name,
        CASE WHEN ec.course_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN ec.course_id::uuid ELSE NULL END,
        ec.course_title, %s, ec.instructor_name, ec.classroom_name,
        ec.start_date, ec.end_date, ec.max_students, ec.enrolled_count, ec.tuition_fee,
        ec.currency, ec.schedule_summary, ec.status, ec.created_at
      FROM public.education_cohorts ec
      JOIN public.branches br ON br.id = ec.branch_id
      ON CONFLICT (id) DO NOTHING;
    ', v_instructor_expr);
    DROP TABLE public.education_cohorts CASCADE;
  END IF;

  IF to_regclass('public.education_attendance') IS NOT NULL THEN
    DROP TABLE public.education_attendance CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 7. FREELANCE_SOLO (freelance_*) — Missing Tables & Full Traceability
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.freelance_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  specialty text,
  default_hourly_rate numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.freelance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  title text NOT NULL,
  description text,
  pricing_model text NOT NULL DEFAULT 'Fixed' CHECK (pricing_model IN ('Fixed', 'Hourly', 'Retainer')),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.freelance_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.freelance_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stage text NOT NULL DEFAULT 'Backlog',
  estimated_hours numeric(8,2) NOT NULL DEFAULT 0,
  logged_hours numeric(8,2) NOT NULL DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.freelance_active_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid REFERENCES public.freelance_projects(id) ON DELETE SET NULL,
  deliverable_id uuid REFERENCES public.freelance_deliverables(id) ON DELETE SET NULL,
  task_description text,
  started_at timestamptz NOT NULL DEFAULT now(),
  accumulated_seconds int NOT NULL DEFAULT 0,
  is_running boolean NOT NULL DEFAULT true,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.freelance_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  invoice_id uuid NOT NULL REFERENCES public.freelance_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.freelance_projects
  ADD COLUMN IF NOT EXISTS client_name text;

ALTER TABLE public.freelance_time_logs
  ADD COLUMN IF NOT EXISTS deliverable_id uuid,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS project_title text;

ALTER TABLE public.freelance_invoices
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS client_email text;

ALTER TABLE public.freelance_proposals
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overview text,
  ADD COLUMN IF NOT EXISTS scope_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'Fixed',
  ADD COLUMN IF NOT EXISTS proposed_budget numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_timeline_weeks int NOT NULL DEFAULT 4;

ALTER TABLE public.freelance_expenses
  ADD COLUMN IF NOT EXISTS expense_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS is_tax_deductible boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelance_expenses' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.freelance_expenses ALTER COLUMN date SET DEFAULT CURRENT_DATE;
    ALTER TABLE public.freelance_expenses ALTER COLUMN date DROP NOT NULL;
    UPDATE public.freelance_expenses
    SET expense_date = COALESCE(expense_date, date, CURRENT_DATE)
    WHERE expense_date IS NULL;
  ELSE
    UPDATE public.freelance_expenses
    SET expense_date = CURRENT_DATE
    WHERE expense_date IS NULL;
  END IF;
END $$;

DO $$
DECLARE
  f_tbl text;
BEGIN
  FOREACH f_tbl IN ARRAY ARRAY[
    'freelance_clients',
    'freelance_projects',
    'freelance_time_logs',
    'freelance_invoices',
    'freelance_proposals',
    'freelance_expenses'
  ]
  LOOP
    EXECUTE format('
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS updated_by_staff_id uuid,
        ADD COLUMN IF NOT EXISTS device_id text,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ', f_tbl);

    EXECUTE format('
      UPDATE public.%I t
      SET business_id = b.business_id
      FROM public.branches b
      WHERE t.branch_id = b.id AND t.business_id IS NULL;
    ', f_tbl);
  END LOOP;
END $$;

-- ============================================================================
-- 8. Group A Indexes, Traceability + Audit Triggers & InitPlan RLS
-- ============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    -- Gym
    'gym_staff', 'gym_plans', 'gym_members', 'gym_registration_leads',
    'gym_registrations', 'gym_check_ins', 'gym_walk_in_tickets',
    'gym_schedule_events', 'gym_products', 'gym_sales', 'gym_sale_items',
    -- Salon
    'salon_staff', 'salon_workstations', 'salon_chair_stations', 'salon_clients',
    'salon_services', 'salon_products', 'salon_appointments',
    'salon_sales', 'salon_sale_items', 'salon_stylist_payouts',
    -- POS
    'pos_staff', 'pos_customers', 'pos_products', 'pos_sales',
    'pos_sale_items', 'pos_parked_orders', 'pos_stock_movements', 'pos_receipt_configs',
    -- PM
    'pm_staff', 'pm_clients', 'pm_projects', 'pm_milestones', 'pm_collateral_catalog',
    'pm_print_orders', 'pm_bat_deliverables', 'pm_talents', 'pm_missions',
    'pm_mission_staff', 'pm_attendances', 'pm_expenses', 'pm_payroll_batches',
    'pm_ccp_slips', 'pm_equipment_stock',
    -- Rental
    'rental_staff', 'rental_units', 'rental_renters',
    'rental_bookings', 'rental_booking_addons', 'rental_security_deposits',
    -- Education
    'edu_staff', 'edu_courses', 'edu_classrooms', 'edu_cohorts', 'edu_students',
    'edu_enrollments', 'edu_sessions', 'edu_attendance', 'edu_grades',
    'edu_certificates', 'edu_admissions',
    -- Freelance
    'freelance_staff', 'freelance_services', 'freelance_clients', 'freelance_projects',
    'freelance_deliverables', 'freelance_active_timers', 'freelance_time_logs',
    'freelance_invoices', 'freelance_invoice_items', 'freelance_proposals', 'freelance_expenses'
  ]
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_scope_active ON public.%I (account_id, business_id, branch_id) WHERE deleted_at IS NULL;',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_updated_delta ON public.%I (branch_id, updated_at DESC) WHERE deleted_at IS NULL;',
      tbl, tbl
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_trace ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_trace BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_traceability_envelope();',
      tbl, tbl
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation();',
      tbl, tbl
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_tenant_isolated" ON public.%I;', tbl, tbl);
    IF tbl = 'pm_collateral_catalog' THEN
      EXECUTE format(
        'CREATE POLICY "%I_tenant_isolated" ON public.%I FOR ALL TO authenticated USING (deleted_at IS NULL AND (branch_id IS NULL OR (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id)))) WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id));',
        tbl, tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "%I_tenant_isolated" ON public.%I FOR ALL TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id) AND deleted_at IS NULL) WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id));',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 9. Group A Atomic RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gym_record_check_in(
  p_branch_id uuid,
  p_member_id uuid,
  p_method text DEFAULT 'rfid',
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member record;
  v_status text := 'granted';
  v_new_sessions int;
  v_checkin_id uuid;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  SELECT * INTO v_member
  FROM public.gym_members
  WHERE id = p_member_id AND branch_id = p_branch_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MEMBER_NOT_FOUND');
  END IF;

  IF v_member.status IN ('Banned', 'Suspended', 'Frozen') THEN
    v_status := 'denied_frozen';
  ELSIF v_member.status = 'Expired' OR (v_member.expiration_date IS NOT NULL AND v_member.expiration_date < CURRENT_DATE) THEN
    v_status := 'denied_expired';
  ELSIF v_member.remaining_sessions IS NOT NULL AND v_member.remaining_sessions <= 0 THEN
    v_status := 'denied_quota';
  END IF;

  v_new_sessions := v_member.remaining_sessions;
  IF v_status = 'granted' AND v_member.remaining_sessions IS NOT NULL THEN
    v_new_sessions := GREATEST(0, v_member.remaining_sessions - 1);
    UPDATE public.gym_members
    SET remaining_sessions = v_new_sessions,
        updated_at = now()
    WHERE id = v_member.id;
  END IF;

  INSERT INTO public.gym_check_ins (
    account_id, business_id, branch_id, staff_id, device_id,
    member_id, member_name, method, status, remaining_sessions_after
  ) VALUES (
    v_member.account_id, v_member.business_id, v_member.branch_id, public.get_auth_staff_id(), p_device_id,
    v_member.id, v_member.full_name, COALESCE(p_method, 'rfid'), v_status, v_new_sessions
  ) RETURNING id INTO v_checkin_id;

  RETURN jsonb_build_object(
    'success', (v_status = 'granted'),
    'status', v_status,
    'checkInId', v_checkin_id,
    'remainingSessions', v_new_sessions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salon_checkout_appointment(
  p_appointment_id uuid,
  p_payment_method text DEFAULT 'Cash',
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_apt record;
  v_sale_id uuid;
BEGIN
  SELECT * INTO v_apt
  FROM public.salon_appointments
  WHERE id = p_appointment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR NOT public.can_access_branch(v_apt.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'APPOINTMENT_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  UPDATE public.salon_appointments
  SET status = 'Completed',
      updated_at = now(),
      updated_by_staff_id = public.get_auth_staff_id()
  WHERE id = v_apt.id;

  INSERT INTO public.salon_sales (
    account_id, business_id, branch_id, staff_id, device_id,
    appointment_id, client_id, client_name, total_amount, payment_method, notes
  ) VALUES (
    v_apt.account_id, v_apt.business_id, v_apt.branch_id, public.get_auth_staff_id(), p_device_id,
    v_apt.id, v_apt.client_id, v_apt.client_name, v_apt.price, COALESCE(p_payment_method, 'Cash'),
    'Salon Checkout — Stylist: ' || v_apt.staff_name
  ) RETURNING id INTO v_sale_id;

  INSERT INTO public.salon_sale_items (
    account_id, business_id, branch_id, staff_id, device_id,
    sale_id, item_type, item_ref_id, item_name, quantity, unit_price, total_price
  ) VALUES (
    v_apt.account_id, v_apt.business_id, v_apt.branch_id, public.get_auth_staff_id(), p_device_id,
    v_sale_id, 'service', v_apt.service_id, v_apt.service_name, 1, v_apt.price, v_apt.price
  );

  RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'appointmentId', v_apt.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_process_sale(
  p_branch_id uuid,
  p_receipt_number text,
  p_payment_method text,
  p_items jsonb,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch record;
  v_sale_id uuid;
  v_item jsonb;
  v_prod record;
  v_qty numeric;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total numeric := 0;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  SELECT * INTO v_branch FROM public.branches WHERE id = p_branch_id LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_price := COALESCE((v_item->>'unitPrice')::numeric, 0);
    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount_amount, 0));

  INSERT INTO public.pos_sales (
    account_id, business_id, branch_id, staff_id, device_id,
    customer_id, customer_name, receipt_number,
    subtotal_amount, discount_amount, tax_amount, total_amount,
    payment_method, status, notes
  ) VALUES (
    v_branch.account_id, v_branch.business_id, p_branch_id, public.get_auth_staff_id(), p_device_id,
    p_customer_id, p_customer_name, p_receipt_number,
    v_subtotal, COALESCE(p_discount_amount, 0), 0, v_total,
    COALESCE(p_payment_method, 'Cash'), 'Completed', p_notes
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    v_price := COALESCE((v_item->>'unitPrice')::numeric, 0);
    v_line_total := v_qty * v_price;

    INSERT INTO public.pos_sale_items (
      account_id, business_id, branch_id, staff_id, device_id,
      sale_id, product_id, product_name, quantity, unit_price, total_price
    ) VALUES (
      v_branch.account_id, v_branch.business_id, p_branch_id, public.get_auth_staff_id(), p_device_id,
      v_sale_id, NULLIF(v_item->>'productId', '')::uuid,
      COALESCE(v_item->>'productName', 'Item'), v_qty, v_price, v_line_total
    );

    IF NULLIF(v_item->>'productId', '') IS NOT NULL THEN
      SELECT * INTO v_prod FROM public.pos_products
      WHERE id = (v_item->>'productId')::uuid AND branch_id = p_branch_id AND deleted_at IS NULL
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.pos_products
        SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
            updated_at = now()
        WHERE id = v_prod.id;

        INSERT INTO public.pos_stock_movements (
          account_id, business_id, branch_id, staff_id, device_id,
          product_id, product_name, movement_type, quantity,
          previous_stock, new_stock, reason, reference_id
        ) VALUES (
          v_branch.account_id, v_branch.business_id, p_branch_id, public.get_auth_staff_id(), p_device_id,
          v_prod.id, v_prod.name, 'sale', v_qty,
          v_prod.stock_quantity, GREATEST(0, v_prod.stock_quantity - v_qty),
          'POS Receipt ' || p_receipt_number, v_sale_id
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'saleId', v_sale_id, 'totalAmount', v_total);
END;
$$;

-- Fix pm_close_roll_call, pm_approve_disbursement & pm_check_budget_burn (drop stale uuid overload)
DROP FUNCTION IF EXISTS public.pm_close_roll_call(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.pm_close_roll_call(
  p_mission_id uuid,
  p_supervisor_id text,
  p_attendances jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_batch_id uuid;
  v_mission record;
  v_total_amount numeric := 0;
  v_count int := 0;
BEGIN
  SELECT * INTO v_mission
  FROM public.pm_missions
  WHERE id = p_mission_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR NOT public.can_access_branch(v_mission.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSION_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_attendances) LOOP
    UPDATE public.pm_attendances
    SET status = (v_item->>'status'),
        minutes_late = COALESCE((v_item->>'minutesLate')::int, 0),
        shift_rating = COALESCE((v_item->>'shiftRating')::int, 5),
        gross_payable_dzd = CASE
          WHEN (v_item->>'status') IN ('present', 'late', 'replacement')
          THEN COALESCE((v_item->>'dayRateDzd')::numeric, 3500)
          ELSE 0
        END,
        is_locked = true,
        locked_at = now(),
        updated_at = now()
    WHERE id = (v_item->>'id')::uuid
      AND branch_id = v_mission.branch_id
      AND deleted_at IS NULL;

    IF (v_item->>'status') IN ('present', 'late', 'replacement') THEN
      v_total_amount := v_total_amount + COALESCE((v_item->>'dayRateDzd')::numeric, 3500);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.pm_payroll_batches (
    account_id, business_id, branch_id, staff_id,
    project_id, project_title, mission_id, mission_code,
    batch_number, total_beneficiaries, total_amount_dzd, status
  ) VALUES (
    v_mission.account_id, v_mission.business_id, v_mission.branch_id, public.get_auth_staff_id(),
    v_mission.project_id, v_mission.project_title, v_mission.id, v_mission.code,
    'PAY-' || to_char(now(), 'YYYYMMDD-HH24MI'), v_count, v_total_amount, 'pending_direction_approval'
  ) RETURNING id INTO v_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'totalBeneficiaries', v_count,
    'totalAmountDzd', v_total_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pm_approve_disbursement(
  p_type text,
  p_id uuid,
  p_approver_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exp record;
  v_batch record;
BEGIN
  IF p_type = 'expense' THEN
    SELECT * INTO v_exp FROM public.pm_expenses WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR NOT public.can_access_branch(v_exp.branch_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'EXPENSE_NOT_FOUND_OR_UNAUTHORIZED');
    END IF;
    UPDATE public.pm_expenses
    SET status = 'approved_by_direction',
        direction_approved_at = now(),
        direction_notes = p_notes,
        updated_by_staff_id = COALESCE(public.get_auth_staff_id(), p_approver_id),
        updated_at = now()
    WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'type', 'expense', 'id', p_id);

  ELSIF p_type = 'payroll_batch' THEN
    SELECT * INTO v_batch FROM public.pm_payroll_batches WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND OR NOT public.can_access_branch(v_batch.branch_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'BATCH_NOT_FOUND_OR_UNAUTHORIZED');
    END IF;
    UPDATE public.pm_payroll_batches
    SET status = 'approved_by_direction',
        direction_approved_at = now(),
        updated_by_staff_id = COALESCE(public.get_auth_staff_id(), p_approver_id),
        updated_at = now()
    WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'type', 'payroll_batch', 'id', p_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DISBURSEMENT_TYPE');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pm_check_budget_burn(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project record;
  v_total_expenses numeric := 0;
  v_total_payroll numeric := 0;
  v_total_spent numeric := 0;
  v_burn_rate numeric := 0;
BEGIN
  SELECT * INTO v_project FROM public.pm_projects WHERE id = p_project_id AND deleted_at IS NULL;
  IF NOT FOUND OR NOT public.can_access_branch(v_project.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROJECT_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  SELECT COALESCE(SUM(amount_dzd), 0) INTO v_total_expenses
  FROM public.pm_expenses
  WHERE project_id = p_project_id AND deleted_at IS NULL AND status <> 'rejected';

  SELECT COALESCE(SUM(total_amount_dzd), 0) INTO v_total_payroll
  FROM public.pm_payroll_batches
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  v_total_spent := v_total_expenses + v_total_payroll;
  IF v_project.budget_cap_dzd > 0 THEN
    v_burn_rate := ROUND((v_total_spent / v_project.budget_cap_dzd) * 100, 2);
  END IF;

  RETURN jsonb_build_object(
    'projectId', p_project_id,
    'budgetCapDzd', v_project.budget_cap_dzd,
    'totalSpentDzd', v_total_spent,
    'burnRatePercent', v_burn_rate,
    'isWarningThreshold', (v_burn_rate >= 85),
    'isBudgetExceeded', (v_burn_rate >= 100)
  );
END;
$$;

-- Publish Group A Tables to Supabase Realtime safely
DO $$
DECLARE
  rt_tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH rt_tbl IN ARRAY ARRAY[
      'gym_staff', 'gym_plans', 'gym_members', 'gym_registration_leads',
      'gym_registrations', 'gym_check_ins', 'gym_walk_in_tickets',
      'gym_schedule_events', 'gym_products', 'gym_sales', 'gym_sale_items',
      'salon_staff', 'salon_workstations', 'salon_chair_stations', 'salon_clients',
      'salon_services', 'salon_products', 'salon_appointments',
      'salon_sales', 'salon_sale_items', 'salon_stylist_payouts',
      'pos_staff', 'pos_customers', 'pos_products', 'pos_sales',
      'pos_sale_items', 'pos_parked_orders', 'pos_stock_movements', 'pos_receipt_configs',
      'pm_staff', 'pm_clients', 'pm_projects', 'pm_milestones', 'pm_collateral_catalog',
      'pm_print_orders', 'pm_bat_deliverables', 'pm_talents', 'pm_missions',
      'pm_mission_staff', 'pm_attendances', 'pm_expenses', 'pm_payroll_batches',
      'pm_ccp_slips', 'pm_equipment_stock',
      'rental_staff', 'rental_units', 'rental_renters',
      'rental_bookings', 'rental_booking_addons', 'rental_security_deposits',
      'edu_staff', 'edu_courses', 'edu_classrooms', 'edu_cohorts', 'edu_students',
      'edu_enrollments', 'edu_sessions', 'edu_attendance', 'edu_grades',
      'edu_certificates', 'edu_admissions',
      'freelance_staff', 'freelance_services', 'freelance_clients', 'freelance_projects',
      'freelance_deliverables', 'freelance_active_timers', 'freelance_time_logs',
      'freelance_invoices', 'freelance_invoice_items', 'freelance_proposals', 'freelance_expenses'
    ]
    LOOP
      IF to_regclass('public.' || rt_tbl) IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = rt_tbl
         ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rt_tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
