-- =====================================================================
-- Atrium ERP & CRM — Project & Milestone (Field Marketing & Activation)
-- Dedicated Supabase PostgreSQL Schema & RPC Migration Script
-- Run this in Supabase Dashboard: SQL Editor -> New Query -> Run
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core PM Tables

-- PM Clients (Brand Advertisers: Ooredoo, Danone, Cevital...)
CREATE TABLE IF NOT EXISTS public.pm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  project_manager_id text,
  project_manager_name text,
  lead_creative_id text,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  uploaded_by_creative_id text,
  uploaded_by_creative_name text,
  approval_status text NOT NULL DEFAULT 'pending_review', -- pending_review, approved, revision_requested
  revision_comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PM Talents (Animators, Hostesses, Field Supervisors across 58 Wilayas)
CREATE TABLE IF NOT EXISTS public.pm_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  supervisor_id text,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  mission_id uuid REFERENCES public.pm_missions(id) ON DELETE SET NULL,
  mission_code text,
  title text NOT NULL,
  category text NOT NULL, -- transport, catering, materials, venue_rental, emergency_supplies, equipment
  amount_dzd numeric NOT NULL,
  declared_by_user_id text,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
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
  tenant_id text NOT NULL,
  facility_id text NOT NULL,
  asset_code text UNIQUE NOT NULL, -- NCH-EQ-00214
  title text NOT NULL,
  category text NOT NULL, -- rollup_base, umbrella_stand, counter_desk, sound_system, uniform, display_stand
  acquisition_cost_dzd numeric NOT NULL DEFAULT 0,
  current_status text NOT NULL DEFAULT 'in_stock', -- in_stock, deployed_on_mission, in_maintenance, decommissioned
  current_custodian_id text,
  current_custodian_name text,
  assigned_mission_id uuid REFERENCES public.pm_missions(id) ON DELETE SET NULL,
  condition_report text NOT NULL DEFAULT 'good', -- good, minor_wear, damaged
  qr_label_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Stored Procedures / RPC Functions

-- RPC: Close Daily Mobile Roll Call (Supervisor locks shift -> feeds payroll)
CREATE OR REPLACE FUNCTION public.pm_close_roll_call(
  p_mission_id uuid,
  p_supervisor_id text,
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
  p_approver_id text,
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

-- 4. Enable Row Level Security (RLS) & Policies
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

-- =====================================================================
-- 5. Quadruple Traceability Migration (account_id, business_id, branch_id, staff_id)
-- =====================================================================
ALTER TABLE public.pm_clients ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_clients ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_clients ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_clients ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_projects ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_projects ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_projects ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_projects ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_print_orders ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_print_orders ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_print_orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_print_orders ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_bat_deliverables ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_bat_deliverables ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_bat_deliverables ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_bat_deliverables ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_talents ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_talents ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_talents ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_talents ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_missions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_missions ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_missions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_missions ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_attendances ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_attendances ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_attendances ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_attendances ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_expenses ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_expenses ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_expenses ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_payroll_batches ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_payroll_batches ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_payroll_batches ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_payroll_batches ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_ccp_slips ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ccp_slips ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ccp_slips ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_ccp_slips ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.pm_equipment_stock ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.pm_equipment_stock ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.pm_equipment_stock ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.pm_equipment_stock ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_clients_tracing ON public.pm_clients(account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_tracing ON public.pm_projects(account_id, business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_pm_missions_tracing ON public.pm_missions(account_id, business_id, branch_id);

