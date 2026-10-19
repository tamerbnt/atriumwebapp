-- =====================================================================
-- Atrium ERP & CRM — Complete Supabase PostgreSQL Schema & Migrations
-- Run this script in your Supabase Project: SQL Editor -> New Query -> Run
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enumerated Types
DO $$ BEGIN
  CREATE TYPE staff_role_enum AS ENUM (
    'owner', 'manager', 'cashier', 'technician', 'stylist', 'waiter', 'staff', 'creative'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Core Multi-Tenant Tables

-- Subscription Plans Catalog
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  tier_rank int UNIQUE NOT NULL,
  max_businesses int NOT NULL DEFAULT 1,
  max_branches int NOT NULL DEFAULT 1,
  max_devices int NOT NULL DEFAULT 1,
  max_staff int NOT NULL DEFAULT 3,
  cross_branch_reports bool NOT NULL DEFAULT false,
  shared_members bool NOT NULL DEFAULT false,
  is_free_tier bool NOT NULL DEFAULT false,
  trial_days int NOT NULL DEFAULT 0,
  price_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Modules Catalog
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  icon text,
  description text,
  is_core bool NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

-- Accounts (Tenant Root Owner)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text UNIQUE NOT NULL,
  phone text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- License Vouchers (Prepaid Lifetime Cash Codes)
CREATE TABLE IF NOT EXISTS public.license_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id),
  duration_months int NOT NULL DEFAULT 0, -- 0 = lifetime perpetual
  is_redeemed bool NOT NULL DEFAULT false,
  redeemed_by_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_by_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Account Subscriptions
CREATE TABLE IF NOT EXISTS public.account_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'trial',
  is_lifetime bool NOT NULL DEFAULT false,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  activated_by_voucher uuid REFERENCES public.license_vouchers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Businesses (Multi-Vertical Brand Entities)
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'pos_inventory',
  name text NOT NULL,
  display_name text,
  address text,
  phone text,
  logo_url text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Branches / Facilities (Physical Locations)
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  phone text,
  is_main_branch bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- POS Devices & Terminal Authorizations
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  hardware_id text UNIQUE NOT NULL,
  label text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  registered_at timestamptz DEFAULT now()
);

-- Staff Members
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  role staff_role_enum NOT NULL DEFAULT 'staff',
  pin_hash text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Members Directory (Gym, Spa & Club Clients)
CREATE TABLE IF NOT EXISTS public.members_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  rfid_tag text,
  barcode text,
  status text NOT NULL DEFAULT 'Active',
  gender text,
  photo_url text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Registration Leads / Requests
CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Appointments & Timetables (Salon, Spa & Consultations)
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_id text,
  client_name text NOT NULL,
  client_phone text,
  staff_id text,
  staff_name text NOT NULL,
  service_id text,
  service_name text NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 45,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products & Inventory (POS Shop)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  stock_quantity int NOT NULL DEFAULT 0,
  sku text,
  category text NOT NULL DEFAULT 'General',
  image_url text,
  reorder_level int NOT NULL DEFAULT 5,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sales & Orders
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  member_id text,
  member_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Freelance & Solo Practice Tables
CREATE TABLE IF NOT EXISTS public.freelance_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  currency text NOT NULL DEFAULT 'DZD',
  hourly_rate numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ProjectBased',
  monthly_retainer_hours numeric DEFAULT 0,
  monthly_retainer_amount numeric DEFAULT 0,
  lifetime_billed numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text NOT NULL,
  title text NOT NULL,
  description text,
  pricing_model text NOT NULL DEFAULT 'Fixed',
  currency text NOT NULL DEFAULT 'DZD',
  budget numeric NOT NULL DEFAULT 0,
  estimated_hours numeric NOT NULL DEFAULT 0,
  logged_hours numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'InProgress',
  deadline date,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text NOT NULL,
  project_id text NOT NULL,
  project_title text NOT NULL,
  task_description text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  is_billable bool NOT NULL DEFAULT true,
  is_invoiced bool NOT NULL DEFAULT false,
  rate_at_moment numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text NOT NULL,
  client_company text,
  client_email text NOT NULL,
  invoice_number text NOT NULL,
  currency text NOT NULL DEFAULT 'DZD',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'Sent',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_details jsonb,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_company text,
  client_email text NOT NULL,
  title text NOT NULL,
  overview text,
  scope_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing_model text NOT NULL DEFAULT 'Fixed',
  proposed_budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  estimated_timeline_weeks int NOT NULL DEFAULT 4,
  valid_until date,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Software',
  vendor text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_tax_deductible bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rentals & Venue Management Tables (Category 14)
CREATE TABLE IF NOT EXISTS public.rentable_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'Room', -- 'Hall', 'Room', 'Court', 'Studio', 'Desk', 'Equipment'
  capacity int NOT NULL DEFAULT 10,
  surface_area_sqm numeric,
  hourly_rate numeric NOT NULL DEFAULT 0,
  daily_rate numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  amenities text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Available', -- 'Available', 'Occupied', 'Maintenance'
  description text,
  color_hex text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_renters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text NOT NULL,
  id_doc_number text,
  total_bookings int NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  renter_id text NOT NULL,
  renter_name text NOT NULL,
  renter_phone text NOT NULL,
  renter_email text,
  renter_company text,
  unit_id text NOT NULL,
  unit_name text NOT NULL,
  unit_type text NOT NULL DEFAULT 'Room',
  purpose text NOT NULL,
  start_date_time timestamptz NOT NULL,
  end_date_time timestamptz NOT NULL,
  duration_hours numeric NOT NULL DEFAULT 1,
  attendee_count int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Confirmed', -- 'Tentative', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled'
  base_amount numeric NOT NULL DEFAULT 0,
  addons_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  deposit_amount numeric NOT NULL DEFAULT 0,
  deposit_status text NOT NULL DEFAULT 'Held', -- 'Pending', 'Held', 'Refunded', 'Retained'
  paid_amount numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  contract_signed bool NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  booking_id text NOT NULL,
  renter_name text NOT NULL,
  unit_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  payment_method text NOT NULL DEFAULT 'Cash', -- 'Cash', 'Card', 'Check'
  status text NOT NULL DEFAULT 'Held', -- 'Held', 'Released', 'Deducted'
  deduction_reason text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

-- 4. Stored Procedures & RPCs

-- Onboard Owner Account
CREATE OR REPLACE FUNCTION public.onboard_owner_account(
  p_owner_id uuid,
  p_full_name text,
  p_email text,
  p_business_name text,
  p_branch_name text,
  p_category text DEFAULT 'membership_session',
  p_device_label text DEFAULT 'Web Terminal',
  p_voucher_code text DEFAULT NULL,
  p_modules jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id uuid;
  v_business_id uuid;
  v_branch_id uuid;
  v_plan_id uuid;
  v_voucher_id uuid;
  v_is_lifetime bool := false;
BEGIN
  -- 1. Ensure or create plan
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE is_free_tier = true LIMIT 1;
  IF v_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (name, tier_rank, max_businesses, max_branches, max_devices, max_staff, is_free_tier, trial_days)
    VALUES ('Free Trial', 0, 1, 1, 1, 3, true, 30)
    RETURNING id INTO v_plan_id;
  END IF;

  -- 2. Upsert account
  v_account_id := COALESCE(p_owner_id, gen_random_uuid());
  INSERT INTO public.accounts (id, full_name, email, is_active)
  VALUES (v_account_id, p_full_name, p_email, true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();

  -- 3. Create Subscription
  INSERT INTO public.account_subscriptions (account_id, plan_id, status, is_lifetime, trial_ends_at)
  VALUES (v_account_id, v_plan_id, 'trial', false, now() + interval '30 days')
  ON CONFLICT DO NOTHING;

  -- 4. Create Business
  INSERT INTO public.businesses (account_id, name, display_name, category)
  VALUES (v_account_id, p_business_name, p_business_name, p_category)
  RETURNING id INTO v_business_id;

  -- 5. Create Branch
  INSERT INTO public.branches (account_id, business_id, name, code, is_main_branch)
  VALUES (v_account_id, v_business_id, p_branch_name, 'MAIN-01', true)
  RETURNING id INTO v_branch_id;

  -- 6. Insert Owner Staff entry
  INSERT INTO public.staff (account_id, full_name, email, role, is_active)
  VALUES (v_account_id, p_full_name, p_email, 'owner', true)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'business_id', v_business_id,
    'branch_id', v_branch_id,
    'plan_status', 'trial',
    'is_lifetime', false,
    'tier_rank', 0,
    'plan_name', 'Free Trial'
  );
END;
$$;

-- Create Business RPC
CREATE OR REPLACE FUNCTION public.create_business(
  p_account_id uuid,
  p_name text,
  p_category text DEFAULT 'pos_inventory',
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  INSERT INTO public.businesses (account_id, name, display_name, category, address, phone)
  VALUES (p_account_id, p_name, p_name, p_category, p_address, p_phone)
  RETURNING id INTO v_business_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_business_id
  );
END;
$$;

-- Create Branch RPC
CREATE OR REPLACE FUNCTION public.create_branch(
  p_account_id uuid,
  p_business_id uuid,
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_count int;
BEGIN
  SELECT count(*) + 1 INTO v_count FROM public.branches WHERE business_id = p_business_id;
  INSERT INTO public.branches (account_id, business_id, name, code, address, phone, is_main_branch)
  VALUES (p_account_id, p_business_id, p_name, 'BR-' || lpad(v_count::text, 2, '0'), p_address, p_phone, false)
  RETURNING id INTO v_branch_id;

  RETURN jsonb_build_object(
    'success', true,
    'branch_id', v_branch_id
  );
END;
$$;

-- Get Tenant Facilities RPC
CREATE OR REPLACE FUNCTION public.get_tenant_facilities(p_tenant_id uuid)
RETURNS TABLE (
  branch_id uuid,
  branch_name text,
  business_id uuid,
  business_name text,
  category_code int,
  category_name text,
  is_main boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    br.id AS branch_id,
    br.name AS branch_name,
    b.id AS business_id,
    b.name AS business_name,
    1 AS category_code,
    b.category AS category_name,
    br.is_main_branch AS is_main
  FROM public.branches br
  JOIN public.businesses b ON b.id = br.business_id
  WHERE br.account_id = p_tenant_id AND br.is_active = true;
$$;

-- Get Staff Profiles by Email RPC
CREATE OR REPLACE FUNCTION public.get_staff_profiles(p_email text)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  role_rank int,
  pin_code text,
  account_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    s.id,
    s.full_name,
    s.email,
    s.role::text,
    CASE s.role
      WHEN 'owner' THEN 8
      WHEN 'manager' THEN 1
      WHEN 'cashier' THEN 2
      WHEN 'technician' THEN 3
      WHEN 'stylist' THEN 7
      WHEN 'waiter' THEN 4
      ELSE 7
    END AS role_rank,
    '1234'::text AS pin_code,
    s.account_id
  FROM public.staff s
  WHERE lower(s.email) = lower(p_email) AND s.is_active = true;
$$;

-- Get Staff for Sync RPC
CREATE OR REPLACE FUNCTION public.get_staff_for_sync(
  p_account_id uuid,
  p_facility_id uuid DEFAULT NULL,
  p_updated_after timestamptz DEFAULT NULL
)
RETURNS SETOF public.staff
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.staff
  WHERE account_id = p_account_id
    AND is_active = true
    AND (p_updated_after IS NULL OR updated_at >= p_updated_after);
$$;

-- Redeem License Voucher RPC
CREATE OR REPLACE FUNCTION public.redeem_license_voucher(
  p_account_id uuid,
  p_voucher_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher record;
  v_plan record;
BEGIN
  SELECT * INTO v_voucher 
  FROM public.license_vouchers 
  WHERE upper(code) = upper(p_voucher_code) AND is_redeemed = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already redeemed voucher code');
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_voucher.plan_id;

  UPDATE public.license_vouchers 
  SET is_redeemed = true, redeemed_by_account_id = p_account_id, redeemed_at = now()
  WHERE id = v_voucher.id;

  UPDATE public.account_subscriptions
  SET plan_id = v_voucher.plan_id, status = 'active', is_lifetime = (v_voucher.duration_months = 0), updated_at = now()
  WHERE account_id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan', jsonb_build_object('name', v_plan.name, 'tier_rank', v_plan.tier_rank, 'is_lifetime', (v_voucher.duration_months = 0)),
    'message', 'License activated successfully!'
  );
END;
$$;

-- 5. Seed Catalog Data
INSERT INTO public.subscription_plans (name, tier_rank, max_businesses, max_branches, max_devices, max_staff, is_free_tier, trial_days, price_label)
VALUES 
  ('Free Trial', 0, 1, 1, 1, 3, true, 30, 'Free (30 Days)'),
  ('Starter', 1, 1, 2, 2, 10, false, 0, 'Starter Lifetime'),
  ('Pro', 2, 3, 5, 5, 25, false, 0, 'Pro Lifetime'),
  ('Enterprise', 3, 999, 999, 999, 999, false, 0, 'Enterprise Lifetime')
ON CONFLICT (name) DO NOTHING;

-- 6. Enable Row Level Security (RLS) with Permissive Policy for Web App
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentable_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_renters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_deposits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read for subscription plans" ON public.subscription_plans FOR SELECT USING (true);
  CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true);
  CREATE POLICY "Allow all access to businesses" ON public.businesses FOR ALL USING (true);
  CREATE POLICY "Allow all access to branches" ON public.branches FOR ALL USING (true);
  CREATE POLICY "Allow all access to devices" ON public.devices FOR ALL USING (true);
  CREATE POLICY "Allow all access to staff" ON public.staff FOR ALL USING (true);
  CREATE POLICY "Allow all access to members_directory" ON public.members_directory FOR ALL USING (true);
  CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true);
  CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true);
  CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_clients" ON public.freelance_clients FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_projects" ON public.freelance_projects FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_time_logs" ON public.freelance_time_logs FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_invoices" ON public.freelance_invoices FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_proposals" ON public.freelance_proposals FOR ALL USING (true);
  CREATE POLICY "Allow all access to freelance_expenses" ON public.freelance_expenses FOR ALL USING (true);
  CREATE POLICY "Allow all access to rentable_units" ON public.rentable_units FOR ALL USING (true);
  CREATE POLICY "Allow all access to rental_renters" ON public.rental_renters FOR ALL USING (true);
  CREATE POLICY "Allow all access to rental_bookings" ON public.rental_bookings FOR ALL USING (true);
  CREATE POLICY "Allow all access to security_deposits" ON public.security_deposits FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 7. PROJECT & MILESTONE (ProjectMilestone) — NCH Market Activator
-- Activation Agencies, Field Marketing, Brand Operations & Production
-- =====================================================================

-- PM Clients (Brand Advertisers: Ooredoo, Danone, Cevital...)
CREATE TABLE IF NOT EXISTS public.pm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  name text NOT NULL,
  logo_url text,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  wilaya text NOT NULL DEFAULT '16 - Alger',
  address text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Projects (Cahier des charges, Budgets, Deadlines, Leadership)
CREATE TABLE IF NOT EXISTS public.pm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.pm_clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  title text NOT NULL,
  scope_of_work text NOT NULL, -- Cahier des charges
  budget_cap_dzd numeric NOT NULL DEFAULT 0,
  max_field_expenses_dzd numeric NOT NULL DEFAULT 0,
  target_gross_margin_percent numeric NOT NULL DEFAULT 25,
  start_date date NOT NULL,
  end_date date NOT NULL,
  kv_deadline date,
  print_deadline date,
  execution_start_date date,
  project_manager_id uuid,
  project_manager_name text,
  lead_creative_id uuid,
  lead_creative_name text,
  status text NOT NULL DEFAULT 'framing', -- framing, crea_active, print_ready, field_active, closed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PM Milestones (Project Sub-phases)
CREATE TABLE IF NOT EXISTS public.pm_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  phase text NOT NULL, -- brief, concept_kv, client_signoff, print_order, bat_production, field_rollcall, ccp_payroll
  target_date date NOT NULL,
  completed_at timestamptz,
  is_completed bool NOT NULL DEFAULT false,
  assigned_role text NOT NULL DEFAULT 'chef_projet'
);

-- PM Print Collateral Catalog
CREATE TABLE IF NOT EXISTS public.pm_collateral_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL, -- banner, flyer, pos_display, apparel, stand, podium
  dimensions text NOT NULL,
  material text NOT NULL,
  unit_cost_dzd numeric NOT NULL DEFAULT 0,
  image_url text,
  is_customizable bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Print Orders (Internal PM Purchase Orders to Créa & Print Shops)
CREATE TABLE IF NOT EXISTS public.pm_print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  order_number text UNIQUE NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost_dzd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent_to_crea', -- sent_to_crea, bat_in_progress, bat_approved, in_print, delivered
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM BAT Deliverables (High-Res Proof Artwork with Technical Specs)
CREATE TABLE IF NOT EXISTS public.pm_bat_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  print_order_id uuid REFERENCES public.pm_print_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_format text NOT NULL DEFAULT 'pdf', -- pdf, ai, psd, tiff, png, mp4
  color_space text NOT NULL DEFAULT 'CMJN', -- CMJN, RVB
  resolution_dpi int NOT NULL DEFAULT 300,
  bleed_mm numeric NOT NULL DEFAULT 3,
  has_bleed_included bool NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  version_code text NOT NULL DEFAULT 'v1',
  preview_url text NOT NULL,
  master_source_url text,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by_creative_id uuid,
  uploaded_by_creative_name text,
  approval_status text NOT NULL DEFAULT 'pending_review', -- pending_review, approved, revision_requested
  revision_comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Talents (Animators, Hostesses, Field Supervisors across 58 Wilayas)
CREATE TABLE IF NOT EXISTS public.pm_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  full_name text NOT NULL,
  gender text NOT NULL DEFAULT 'Female',
  birth_date date,
  age int,
  phone text NOT NULL,
  email text,
  wilaya_code text NOT NULL DEFAULT '16',
  wilaya_name text NOT NULL DEFAULT 'Alger',
  commune text NOT NULL DEFAULT 'Bab Ezzouar',
  has_driver_license bool NOT NULL DEFAULT false,
  is_vehicle_owner bool NOT NULL DEFAULT false,
  desired_roles text[] DEFAULT ARRAY['Animator'],
  languages text[] DEFAULT ARRAY['Arabic', 'French'],
  portrait_photo_url text,
  full_body_photo_url text,
  cv_document_url text,
  cni_document_url text,
  ccp_number text NOT NULL, -- 10 digits
  ccp_key text NOT NULL,    -- 2 digits
  initial_hr_score numeric NOT NULL DEFAULT 4.0,
  average_mission_rating numeric NOT NULL DEFAULT 4.5,
  consolidated_score numeric NOT NULL DEFAULT 4.25,
  completed_missions_count int NOT NULL DEFAULT 0,
  absences_count int NOT NULL DEFAULT 0,
  is_hr_verified bool NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active', -- active, in_review, paused, blacklisted
  hr_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Missions (On-Site Activations)
CREATE TABLE IF NOT EXISTS public.pm_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  client_name text NOT NULL,
  code text NOT NULL, -- MIS-104
  title text NOT NULL,
  activation_type text NOT NULL DEFAULT 'GMS_InStore', -- GMS_InStore, Roadshow, Street_Marketing, Sampling, Mall_Expo, Custom
  venue_name text NOT NULL,
  address text NOT NULL,
  wilaya_code text NOT NULL DEFAULT '16',
  wilaya_name text NOT NULL DEFAULT 'Alger',
  start_date date NOT NULL,
  end_date date NOT NULL,
  daily_start_hour text NOT NULL DEFAULT '09:00',
  daily_end_hour text NOT NULL DEFAULT '18:00',
  supervisor_id uuid,
  supervisor_name text,
  required_staff_count int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'upcoming', -- upcoming, live_today, completed, cancelled
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Mission Staff Rostering
CREATE TABLE IF NOT EXISTS public.pm_mission_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.pm_missions(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  talent_name text NOT NULL,
  talent_photo text,
  phone text NOT NULL,
  day_rate_dzd numeric NOT NULL DEFAULT 3500,
  assigned_role_title text NOT NULL DEFAULT 'Animator',
  invitation_status text NOT NULL DEFAULT 'confirmed' -- confirmed, standby, declined
);

-- PM Attendances (Live Mobile Daily Roll Call)
CREATE TABLE IF NOT EXISTS public.pm_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.pm_missions(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  talent_name text NOT NULL,
  talent_photo text,
  date date NOT NULL DEFAULT current_date,
  check_in_time timestamptz,
  status text NOT NULL DEFAULT 'present', -- present, late, absent, replacement
  minutes_late int DEFAULT 0,
  replacement_for_talent_id uuid REFERENCES public.pm_talents(id),
  replacement_talent_name text,
  shift_rating int NOT NULL DEFAULT 5, -- 1 to 5
  day_rate_dzd numeric NOT NULL DEFAULT 3500,
  gross_payable_dzd numeric NOT NULL DEFAULT 3500,
  is_locked bool NOT NULL DEFAULT false,
  locked_at timestamptz,
  supervisor_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Field Expenses (Double-Lock Audited Purchases)
CREATE TABLE IF NOT EXISTS public.pm_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  mission_id uuid REFERENCES public.pm_missions(id) ON DELETE SET NULL,
  mission_code text,
  title text NOT NULL,
  category text NOT NULL, -- transport, catering, materials, venue_rental, emergency_supplies, equipment
  amount_dzd numeric NOT NULL,
  declared_by_user_id uuid,
  declared_by_user_name text NOT NULL,
  declared_by_role text NOT NULL, -- superviseur, chef_projet
  receipt_photo_url text,
  has_fiscal_invoice bool NOT NULL DEFAULT false,
  fiscal_nif text,
  status text NOT NULL DEFAULT 'pending_direction_approval', -- pending_direction_approval, approved_by_direction, rejected, audited_and_paid
  direction_approved_at timestamptz,
  direction_notes text,
  is_equipment_auto_created bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Payroll Batches (Supervisor Attendance -> Executive Sign-off)
CREATE TABLE IF NOT EXISTS public.pm_payroll_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.pm_missions(id) ON DELETE CASCADE,
  mission_code text NOT NULL,
  batch_number text UNIQUE NOT NULL,
  total_beneficiaries int NOT NULL DEFAULT 0,
  total_amount_dzd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_direction_approval', -- pending_direction_approval, approved_by_direction, ccp_generated, disbursed
  direction_approved_at timestamptz,
  ccp_generated_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Algerian Post (CCP SFP 01) Slips with Legal Numbers-to-Words
CREATE TABLE IF NOT EXISTS public.pm_ccp_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.pm_payroll_batches(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  beneficiary_name text NOT NULL,
  ccp_number text NOT NULL,
  ccp_key text NOT NULL,
  wilaya_name text NOT NULL,
  amount_dzd numeric NOT NULL,
  amount_in_words_fr text NOT NULL,
  amount_in_words_ar text NOT NULL,
  transaction_reference text NOT NULL,
  is_printed bool NOT NULL DEFAULT false,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Equipment & Indirect Collateral Stock
CREATE TABLE IF NOT EXISTS public.pm_equipment_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  asset_code text UNIQUE NOT NULL, -- NCH-EQ-00214
  title text NOT NULL,
  category text NOT NULL, -- rollup_base, umbrella_stand, counter_desk, sound_system, uniform, display_stand
  acquisition_cost_dzd numeric NOT NULL DEFAULT 0,
  current_status text NOT NULL DEFAULT 'in_stock', -- in_stock, deployed_on_mission, in_maintenance, decommissioned
  current_custodian_id uuid,
  current_custodian_name text,
  assigned_mission_id uuid REFERENCES public.pm_missions(id) ON DELETE SET NULL,
  condition_report text NOT NULL DEFAULT 'good', -- good, minor_wear, damaged
  qr_label_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 8. Stored Procedures / RPCs for Project & Milestone Operations
-- =====================================================================

-- RPC: Close Daily Mobile Roll Call (Supervisor locks shift -> feeds payroll)
CREATE OR REPLACE FUNCTION public.pm_close_roll_call(
  p_mission_id uuid,
  p_supervisor_id uuid,
  p_attendances jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_batch_id uuid;
  v_mission record;
  v_total_amount numeric := 0;
  v_count int := 0;
BEGIN
  SELECT * INTO v_mission FROM public.pm_missions WHERE id = p_mission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  -- Update each attendance record and lock it
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_attendances)
  LOOP
    UPDATE public.pm_attendances
    SET status = (v_item->>'status'),
        minutes_late = COALESCE((v_item->>'minutesLate')::int, 0),
        shift_rating = COALESCE((v_item->>'shiftRating')::int, 5),
        gross_payable_dzd = CASE 
          WHEN (v_item->>'status') IN ('present', 'late', 'replacement') THEN COALESCE((v_item->>'dayRateDzd')::numeric, 3500)
          ELSE 0
        END,
        is_locked = true,
        locked_at = now()
    WHERE id = (v_item->>'id')::uuid;

    IF (v_item->>'status') IN ('present', 'late', 'replacement') THEN
      v_total_amount := v_total_amount + COALESCE((v_item->>'dayRateDzd')::numeric, 3500);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Create pending payroll batch awaiting Direction approval
  INSERT INTO public.pm_payroll_batches (
    tenant_id, facility_id, project_id, project_title, mission_id, mission_code,
    batch_number, total_beneficiaries, total_amount_dzd, status
  ) VALUES (
    v_mission.tenant_id, v_mission.facility_id, v_mission.project_id, v_mission.project_title,
    v_mission.id, v_mission.code, 'PAY-' || to_char(now(), 'YYYYMMDD-HH24MI'),
    v_count, v_total_amount, 'pending_direction_approval'
  ) RETURNING id INTO v_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'totalBeneficiaries', v_count,
    'totalAmountDzd', v_total_amount
  );
END;
$$;

-- RPC: Double-Lock Approval (Direction Authorizes Disbursement)
CREATE OR REPLACE FUNCTION public.pm_approve_disbursement(
  p_type text, -- 'expense' or 'payroll_batch'
  p_id uuid,
  p_approver_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_type = 'expense' THEN
    UPDATE public.pm_expenses
    SET status = 'approved_by_direction',
        direction_approved_at = now(),
        direction_notes = p_notes
    WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'type', 'expense', 'id', p_id);

  ELSIF p_type = 'payroll_batch' THEN
    UPDATE public.pm_payroll_batches
    SET status = 'approved_by_direction',
        direction_approved_at = now()
    WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'type', 'payroll_batch', 'id', p_id);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid disbursement type');
  END IF;
END;
$$;

-- RPC: Check Budget Burn Rate
CREATE OR REPLACE FUNCTION public.pm_check_budget_burn(
  p_project_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project record;
  v_total_expenses numeric := 0;
  v_total_payroll numeric := 0;
  v_total_spent numeric := 0;
  v_burn_rate numeric := 0;
BEGIN
  SELECT * INTO v_project FROM public.pm_projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;

  SELECT COALESCE(SUM(amount_dzd), 0) INTO v_total_expenses
  FROM public.pm_expenses 
  WHERE project_id = p_project_id AND status != 'rejected';

  SELECT COALESCE(SUM(total_amount_dzd), 0) INTO v_total_payroll
  FROM public.pm_payroll_batches
  WHERE project_id = p_project_id;

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

-- Enable RLS for all PM tables
ALTER TABLE public.pm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_collateral_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_bat_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_talents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_mission_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_ccp_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_equipment_stock ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all access to pm_clients" ON public.pm_clients FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_projects" ON public.pm_projects FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_milestones" ON public.pm_milestones FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_collateral_catalog" ON public.pm_collateral_catalog FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_print_orders" ON public.pm_print_orders FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_bat_deliverables" ON public.pm_bat_deliverables FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_talents" ON public.pm_talents FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_missions" ON public.pm_missions FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_mission_staff" ON public.pm_mission_staff FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_attendances" ON public.pm_attendances FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_expenses" ON public.pm_expenses FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_payroll_batches" ON public.pm_payroll_batches FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_ccp_slips" ON public.pm_ccp_slips FOR ALL USING (true);
  CREATE POLICY "Allow all access to pm_equipment_stock" ON public.pm_equipment_stock FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

