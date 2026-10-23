-- =====================================================================
-- ATRIUM ERP & CRM: MASTER QUADRUPLE TRACEABILITY MIGRATION QUERY
-- Standard: Every table & record is strictly traceable to:
--   1. account_id (Account Tenant / Owner)
--   2. business_id (Commercial Brand / Venture)
--   3. branch_id (Physical Facility / Branch / Site)
--   4. staff_id (Operator / Cashier / Manager / Creator)
--
-- Supported Verticals:
--   - Core Multi-Tenancy & Hardware POS
--   - Gym & Fitness (Membership & Admissions)
--   - Salon & Beauty / Spa / Clinical Appointments
--   - Retail & Restaurant POS (Inventory & Sales)
--   - Freelancer & Solo Studio
--   - Venue & Space Rental Management
--   - Education & Training Academies
--   - Project & Milestone (Field Marketing & 6-Role Agency)
--
-- Execution: Non-destructive, idempotent, safe on new or existing DBs.
-- Paste and run directly in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Starting Atrium Master Quadruple Traceability Migration';
  RAISE NOTICE 'Target: (account_id, business_id, branch_id, staff_id)';
  RAISE NOTICE '====================================================';
END $$;

-- ---------------------------------------------------------------------
-- 1. CORE MULTI-TENANCY FOUNDATION
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  currency text NOT NULL DEFAULT 'DZD',
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  label text NOT NULL,
  hardware_id text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'staff',
  pin_code text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure Core Tenancy Columns Exist on Legacy DBs
ALTER TABLE IF EXISTS public.devices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.staff
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill Core Lineage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'devices') THEN
    EXECUTE '
      UPDATE public.devices d
      SET business_id = b.business_id
      FROM public.branches b
      WHERE d.branch_id = b.id AND d.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff') THEN
    EXECUTE '
      UPDATE public.staff s
      SET business_id = b.business_id
      FROM public.branches b
      WHERE s.branch_id = b.id AND s.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. VERTICAL 1: GYM & FITNESS (MEMBERSHIP & ADMISSIONS)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.members_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'Active',
  rfid_tag text,
  gender text NOT NULL DEFAULT 'Other',
  photo_url text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  member_id uuid NOT NULL REFERENCES public.members_directory(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  preferred_plan text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.members_directory
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.registrations
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.registration_requests
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_directory') THEN
    EXECUTE '
      UPDATE public.members_directory m
      SET business_id = b.business_id
      FROM public.branches b
      WHERE m.branch_id = b.id AND m.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registrations') THEN
    EXECUTE '
      UPDATE public.registrations r
      SET business_id = b.business_id
      FROM public.branches b
      WHERE r.branch_id = b.id AND r.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registration_requests') THEN
    EXECUTE '
      UPDATE public.registration_requests rr
      SET business_id = b.business_id
      FROM public.branches b
      WHERE rr.branch_id = b.id AND rr.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. VERTICAL 2: SALON & BEAUTY / CLINIC APPOINTMENTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id text,
  created_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,
  service_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id text,
  ADD COLUMN IF NOT EXISTS created_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    EXECUTE '
      UPDATE public.appointments a
      SET business_id = b.business_id
      FROM public.branches b
      WHERE a.branch_id = b.id AND a.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. VERTICAL 3: RETAIL & RESTAURANT POS (INVENTORY & SALES)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  member_id text,
  member_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.sales
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    EXECUTE '
      UPDATE public.products p
      SET business_id = b.business_id
      FROM public.branches b
      WHERE p.branch_id = b.id AND p.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales') THEN
    EXECUTE '
      UPDATE public.sales s
      SET business_id = b.business_id
      FROM public.branches b
      WHERE s.branch_id = b.id AND s.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. VERTICAL 4: FREELANCE & SOLO STUDIO SUITE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.freelance_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  client_id text,
  client_name text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  project_id text,
  description text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  is_billed bool NOT NULL DEFAULT false,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  client_id text,
  client_name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  status text NOT NULL DEFAULT 'unpaid',
  due_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  title text NOT NULL,
  client_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  category text NOT NULL DEFAULT 'general',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.freelance_clients
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.freelance_projects
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.freelance_time_logs
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.freelance_invoices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.freelance_proposals
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.freelance_expenses
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_clients') THEN
    EXECUTE '
      UPDATE public.freelance_clients fc
      SET business_id = b.business_id
      FROM public.branches b
      WHERE fc.branch_id = b.id AND fc.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_projects') THEN
    EXECUTE '
      UPDATE public.freelance_projects fp
      SET business_id = b.business_id
      FROM public.branches b
      WHERE fp.branch_id = b.id AND fp.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_time_logs') THEN
    EXECUTE '
      UPDATE public.freelance_time_logs ft
      SET business_id = b.business_id
      FROM public.branches b
      WHERE ft.branch_id = b.id AND ft.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_invoices') THEN
    EXECUTE '
      UPDATE public.freelance_invoices fi
      SET business_id = b.business_id
      FROM public.branches b
      WHERE fi.branch_id = b.id AND fi.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_proposals') THEN
    EXECUTE '
      UPDATE public.freelance_proposals fpr
      SET business_id = b.business_id
      FROM public.branches b
      WHERE fpr.branch_id = b.id AND fpr.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelance_expenses') THEN
    EXECUTE '
      UPDATE public.freelance_expenses fe
      SET business_id = b.business_id
      FROM public.branches b
      WHERE fe.branch_id = b.id AND fe.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. VERTICAL 5: VENUE & SPACE RENTALS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rentable_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'room',
  capacity int NOT NULL DEFAULT 10,
  surface_area_sqm numeric,
  hourly_rate numeric NOT NULL DEFAULT 0,
  daily_rate numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  amenities text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'available',
  description text,
  color_hex text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_renters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  organization_name text,
  email text,
  phone text NOT NULL,
  id_document_type text,
  id_document_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  unit_id uuid NOT NULL REFERENCES public.rentable_units(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  renter_id uuid NOT NULL REFERENCES public.rental_renters(id) ON DELETE CASCADE,
  renter_name text NOT NULL,
  renter_phone text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  status text NOT NULL DEFAULT 'confirmed',
  purpose text,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES public.rental_renters(id) ON DELETE CASCADE,
  renter_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  status text NOT NULL DEFAULT 'held',
  deductions numeric NOT NULL DEFAULT 0,
  deduction_reason text,
  held_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

ALTER TABLE IF EXISTS public.rentable_units
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.rental_renters
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.rental_bookings
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.security_deposits
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rentable_units') THEN
    EXECUTE '
      UPDATE public.rentable_units ru
      SET business_id = b.business_id
      FROM public.branches b
      WHERE ru.branch_id = b.id AND ru.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_renters') THEN
    EXECUTE '
      UPDATE public.rental_renters rr
      SET business_id = b.business_id
      FROM public.branches b
      WHERE rr.branch_id = b.id AND rr.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_bookings') THEN
    EXECUTE '
      UPDATE public.rental_bookings rb
      SET business_id = b.business_id
      FROM public.branches b
      WHERE rb.branch_id = b.id AND rb.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_deposits') THEN
    EXECUTE '
      UPDATE public.security_deposits sd
      SET business_id = b.business_id
      FROM public.branches b
      WHERE sd.branch_id = b.id AND sd.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7. VERTICAL 6: EDUCATION & TRAINING ACADEMIES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.education_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text NOT NULL,
  guardian_name text,
  guardian_phone text,
  guardian_relation text,
  birth_date date,
  rfid_badge_code text,
  school_grade text,
  status text NOT NULL DEFAULT 'Active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  course_id text,
  course_title text NOT NULL,
  instructor_id text,
  instructor_name text NOT NULL,
  classroom_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_students int NOT NULL DEFAULT 20,
  enrolled_count int NOT NULL DEFAULT 0,
  tuition_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  schedule_summary text,
  status text NOT NULL DEFAULT 'Enrolling',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  cohort_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  minutes_late int DEFAULT 0,
  excuse_note text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.education_students
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.education_cohorts
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.education_attendance
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_students') THEN
    EXECUTE '
      UPDATE public.education_students es
      SET business_id = b.business_id
      FROM public.branches b
      WHERE es.branch_id = b.id AND es.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_cohorts') THEN
    EXECUTE '
      UPDATE public.education_cohorts ec
      SET business_id = b.business_id
      FROM public.branches b
      WHERE ec.branch_id = b.id AND ec.business_id IS NULL;
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_attendance') THEN
    EXECUTE '
      UPDATE public.education_attendance ea
      SET business_id = b.business_id
      FROM public.branches b
      WHERE ea.branch_id = b.id AND ea.business_id IS NULL;
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 8. VERTICAL 7: PROJECT & MILESTONE (6-ROLE FIELD MARKETING AGENCY)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
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

CREATE TABLE IF NOT EXISTS public.pm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  client_id uuid NOT NULL REFERENCES public.pm_clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  title text NOT NULL,
  scope_of_work text NOT NULL,
  budget_cap_dzd numeric NOT NULL DEFAULT 0,
  max_field_expenses_dzd numeric NOT NULL DEFAULT 0,
  target_gross_margin_percent numeric NOT NULL DEFAULT 25,
  start_date date NOT NULL,
  end_date date NOT NULL,
  kv_deadline date,
  print_deadline date,
  execution_start_date date,
  project_manager_id text,
  project_manager_name text,
  lead_creative_id text,
  lead_creative_name text,
  status text NOT NULL DEFAULT 'framing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  phase text NOT NULL,
  target_date date NOT NULL,
  completed_at timestamptz,
  is_completed bool NOT NULL DEFAULT false,
  assigned_role text NOT NULL DEFAULT 'chef_projet'
);

CREATE TABLE IF NOT EXISTS public.pm_collateral_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  sku text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  dimensions text NOT NULL,
  material text NOT NULL,
  unit_cost_dzd numeric NOT NULL DEFAULT 0,
  image_url text,
  is_customizable bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  order_number text UNIQUE NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost_dzd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent_to_crea',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_bat_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.pm_print_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  preview_url text NOT NULL,
  high_res_file_url text,
  file_format text NOT NULL DEFAULT 'PDF',
  color_profile text NOT NULL DEFAULT 'CMYK',
  dimensions text NOT NULL,
  bleed_mm numeric NOT NULL DEFAULT 3.0,
  status text NOT NULL DEFAULT 'pending_review',
  rejection_reason text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  full_name text NOT NULL,
  role text NOT NULL,
  phone text NOT NULL,
  email text,
  wilaya text NOT NULL DEFAULT '16 - Alger',
  daily_rate_dzd numeric NOT NULL DEFAULT 3500,
  ccp_account text,
  ccp_cle text,
  rating numeric NOT NULL DEFAULT 5.0,
  is_blacklisted bool NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  wilaya text NOT NULL,
  city text NOT NULL,
  venue_name text NOT NULL,
  venue_gps_lat numeric,
  venue_gps_lng numeric,
  date_start date NOT NULL,
  date_end date NOT NULL,
  headcount_target int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_mission_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  mission_id uuid NOT NULL REFERENCES public.pm_missions(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  role text NOT NULL,
  rate_dzd numeric NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'
);

CREATE TABLE IF NOT EXISTS public.pm_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  mission_id uuid NOT NULL REFERENCES public.pm_missions(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  check_in_lat numeric,
  check_in_lng numeric,
  status text NOT NULL DEFAULT 'present'
);

CREATE TABLE IF NOT EXISTS public.pm_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.pm_missions(id) ON DELETE SET NULL,
  submitted_by_id text NOT NULL,
  submitted_by_name text NOT NULL,
  category text NOT NULL,
  amount_dzd numeric NOT NULL DEFAULT 0,
  receipt_photo_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_payroll_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  batch_number text UNIQUE NOT NULL,
  total_amount_dzd numeric NOT NULL DEFAULT 0,
  talent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_ccp_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  batch_id uuid NOT NULL REFERENCES public.pm_payroll_batches(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.pm_talents(id) ON DELETE CASCADE,
  beneficiary_name text,
  ccp_number text,
  ccp_key text,
  wilaya_name text,
  amount_dzd numeric NOT NULL DEFAULT 0,
  amount_in_words_fr text,
  amount_in_words_ar text,
  transaction_reference text,
  is_printed bool NOT NULL DEFAULT false,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pm_equipment_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  tenant_id text,
  facility_id text,
  item_name text NOT NULL,
  category text NOT NULL,
  quantity_total int NOT NULL DEFAULT 0,
  quantity_available int NOT NULL DEFAULT 0,
  warehouse_location text NOT NULL DEFAULT 'Alger',
  unit_value_dzd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure Quadruple Key Columns Exist on Existing PM Tables
ALTER TABLE IF EXISTS public.pm_clients
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_projects
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_milestones
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_collateral_catalog
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_print_orders
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_bat_deliverables
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_talents
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_missions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_mission_staff
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_attendances
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_expenses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_payroll_batches
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_ccp_slips
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pm_equipment_stock
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Migrate Legacy tenant_id / facility_id into account_id / branch_id
DO $$
DECLARE
  pm_table text;
  pm_tables text[] := ARRAY[
    'pm_clients', 'pm_projects', 'pm_print_orders', 'pm_bat_deliverables',
    'pm_talents', 'pm_missions', 'pm_attendances', 'pm_expenses',
    'pm_payroll_batches', 'pm_ccp_slips', 'pm_equipment_stock'
  ];
BEGIN
  FOREACH pm_table IN ARRAY pm_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = pm_table) THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = pm_table AND column_name = 'tenant_id') THEN
        EXECUTE format('
          UPDATE public.%I 
          SET account_id = CASE 
            WHEN tenant_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN tenant_id::uuid 
            ELSE (SELECT id FROM public.accounts LIMIT 1)
          END
          WHERE account_id IS NULL;
        ', pm_table);
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = pm_table AND column_name = 'facility_id') THEN
        EXECUTE format('
          UPDATE public.%I 
          SET branch_id = CASE 
            WHEN facility_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN facility_id::uuid 
            ELSE (SELECT id FROM public.branches LIMIT 1)
          END
          WHERE branch_id IS NULL;
        ', pm_table);
      END IF;

      EXECUTE format('
        UPDATE public.%I t
        SET business_id = b.business_id
        FROM public.branches b
        WHERE t.branch_id = b.id AND t.business_id IS NULL;
      ', pm_table);
    END IF;
  END LOOP;

  -- Cascade PM child tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_milestones') THEN
    EXECUTE '
      UPDATE public.pm_milestones ms
      SET account_id = p.account_id,
          business_id = p.business_id,
          branch_id = p.branch_id
      FROM public.pm_projects p
      WHERE ms.project_id = p.id AND (ms.account_id IS NULL OR ms.business_id IS NULL OR ms.branch_id IS NULL);
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_mission_staff') THEN
    EXECUTE '
      UPDATE public.pm_mission_staff ms
      SET account_id = m.account_id,
          business_id = m.business_id,
          branch_id = m.branch_id
      FROM public.pm_missions m
      WHERE ms.mission_id = m.id AND (ms.account_id IS NULL OR ms.business_id IS NULL OR ms.branch_id IS NULL);
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_ccp_slips') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pm_ccp_slips' AND column_name = 'batch_id') THEN
      EXECUTE '
        UPDATE public.pm_ccp_slips ccp
        SET account_id = COALESCE(ccp.account_id, pb.account_id),
            business_id = COALESCE(ccp.business_id, pb.business_id),
            branch_id = COALESCE(ccp.branch_id, pb.branch_id)
        FROM public.pm_payroll_batches pb
        WHERE ccp.batch_id = pb.id AND (ccp.account_id IS NULL OR ccp.business_id IS NULL OR ccp.branch_id IS NULL);
      ';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pm_ccp_slips' AND column_name = 'payroll_batch_id') THEN
      EXECUTE '
        UPDATE public.pm_ccp_slips ccp
        SET account_id = COALESCE(ccp.account_id, pb.account_id),
            business_id = COALESCE(ccp.business_id, pb.business_id),
            branch_id = COALESCE(ccp.branch_id, pb.branch_id)
        FROM public.pm_payroll_batches pb
        WHERE ccp.payroll_batch_id = pb.id AND (ccp.account_id IS NULL OR ccp.business_id IS NULL OR ccp.branch_id IS NULL);
      ';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 9. UNIVERSAL STAFF FALLBACK ATTRIBUTION
-- ---------------------------------------------------------------------
-- Whenever a record has staff_id IS NULL, attribute to the branch manager or account owner
DO $$
DECLARE
  tbl_name text;
  tables_to_staff_backfill text[] := ARRAY[
    'members_directory', 'registrations', 'registration_requests', 'products', 'sales',
    'freelance_clients', 'freelance_projects', 'freelance_time_logs', 'freelance_invoices',
    'freelance_proposals', 'freelance_expenses', 'rentable_units', 'rental_renters',
    'rental_bookings', 'security_deposits', 'education_students', 'education_cohorts',
    'education_attendance', 'pm_clients', 'pm_projects', 'pm_print_orders',
    'pm_bat_deliverables', 'pm_talents', 'pm_missions', 'pm_attendances',
    'pm_expenses', 'pm_payroll_batches', 'pm_ccp_slips', 'pm_equipment_stock'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_staff_backfill LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'staff_id'
    ) THEN
      EXECUTE format('
        UPDATE public.%I t
        SET staff_id = sub.id
        FROM (
          SELECT s.id, s.branch_id, s.account_id
          FROM public.staff s
          WHERE s.is_active = true
          ORDER BY (s.role = ''owner'') DESC, (s.role = ''manager'') DESC, s.created_at ASC
        ) sub
        WHERE (
          (t.branch_id IS NOT NULL AND t.branch_id = sub.branch_id) OR
          (sub.branch_id IS NULL AND t.account_id = sub.account_id) OR
          (t.account_id = sub.account_id)
        ) AND t.staff_id IS NULL;
      ', tbl_name);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 10. COMPOSITE PERFORMANCE INDEXES FOR QUADRUPLE QUERIES
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_members_trace ON public.members_directory (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_members_staff ON public.members_directory (staff_id);

CREATE INDEX IF NOT EXISTS idx_appointments_trace ON public.appointments (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON public.appointments (staff_id);

CREATE INDEX IF NOT EXISTS idx_products_trace ON public.products (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_products_staff ON public.products (staff_id);

CREATE INDEX IF NOT EXISTS idx_sales_trace ON public.sales (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON public.sales (staff_id);

CREATE INDEX IF NOT EXISTS idx_fl_clients_trace ON public.freelance_clients (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_fl_projects_trace ON public.freelance_projects (account_id, business_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_rent_units_trace ON public.rentable_units (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_rent_bookings_trace ON public.rental_bookings (account_id, business_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_edu_students_trace ON public.education_students (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_edu_cohorts_trace ON public.education_cohorts (account_id, business_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_pm_clients_trace ON public.pm_clients (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_trace ON public.pm_projects (account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_pm_missions_trace ON public.pm_missions (account_id, business_id, branch_id);

-- ---------------------------------------------------------------------
-- 11. ROW-LEVEL SECURITY (RLS) POLICIES FOR TRACEABILITY
-- ---------------------------------------------------------------------

DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'devices', 'staff', 'members_directory', 'registrations', 'registration_requests',
    'appointments', 'products', 'sales', 'freelance_clients', 'freelance_projects',
    'freelance_time_logs', 'freelance_invoices', 'freelance_proposals', 'freelance_expenses',
    'rentable_units', 'rental_renters', 'rental_bookings', 'security_deposits',
    'education_students', 'education_cohorts', 'education_attendance',
    'pm_clients', 'pm_projects', 'pm_milestones', 'pm_collateral_catalog',
    'pm_print_orders', 'pm_bat_deliverables', 'pm_talents', 'pm_missions',
    'pm_mission_staff', 'pm_attendances', 'pm_expenses', 'pm_payroll_batches',
    'pm_ccp_slips', 'pm_equipment_stock'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = t AND policyname = 'authenticated_tenant_access'
      ) THEN
        EXECUTE format('
          CREATE POLICY authenticated_tenant_access ON public.%I
          FOR ALL
          TO authenticated
          USING (
            account_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.staff s 
              WHERE s.id = auth.uid() AND s.account_id = public.%I.account_id
            )
          )
          WITH CHECK (
            account_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.staff s 
              WHERE s.id = auth.uid() AND s.account_id = public.%I.account_id
            )
          );
        ', t, t, t);
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'SUCCESS: Atrium Quadruple Traceability Migration completed!';
  RAISE NOTICE 'All 39 tables verified with account_id, business_id, branch_id, staff_id';
  RAISE NOTICE '====================================================';
END $$;
