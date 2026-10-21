-- =====================================================================
-- ATRIUM ERP & CRM: QUADRUPLE TRACEABILITY MIGRATION
-- Standard: Every table & record is traceable to:
--   1. account_id (Account Tenant / Owner)
--   2. business_id (Commercial Entity)
--   3. branch_id (Physical Facility / Branch)
--   4. staff_id (Operator / Creator / Fallback to active staff or owner)
--
-- Migration Strategy: Non-destructive ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- with automatic backfill cascades, foreign keys, and composite indexes.
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting Atrium Quadruple Traceability Migration...';
END $$;

-- ---------------------------------------------------------------------
-- 1. CORE ORGANIZATIONAL TABLES
-- ---------------------------------------------------------------------

-- Devices: ensure business_id exists
ALTER TABLE IF EXISTS public.devices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Backfill devices.business_id from branches.business_id
UPDATE public.devices d
SET business_id = b.business_id
FROM public.branches b
WHERE d.branch_id = b.id AND d.business_id IS NULL;

-- Staff: ensure business_id exists
ALTER TABLE IF EXISTS public.staff
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Backfill staff.business_id from branches.business_id
UPDATE public.staff s
SET business_id = b.business_id
FROM public.branches b
WHERE s.branch_id = b.id AND s.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 2. VERTICAL 1: MEMBERSHIP & GYM
-- ---------------------------------------------------------------------

-- members_directory
ALTER TABLE IF EXISTS public.members_directory
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.members_directory m
SET business_id = b.business_id
FROM public.branches b
WHERE m.branch_id = b.id AND m.business_id IS NULL;

-- registrations
ALTER TABLE IF EXISTS public.registrations
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.registrations r
SET business_id = b.business_id
FROM public.branches b
WHERE r.branch_id = b.id AND r.business_id IS NULL;

-- registration_requests (Leads)
ALTER TABLE IF EXISTS public.registration_requests
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.registration_requests rr
SET business_id = b.business_id
FROM public.branches b
WHERE rr.branch_id = b.id AND rr.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 3. VERTICAL 2: APPOINTMENTS & SALON / CLINIC
-- ---------------------------------------------------------------------

-- appointments
ALTER TABLE IF EXISTS public.appointments
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.appointments a
SET business_id = b.business_id
FROM public.branches b
WHERE a.branch_id = b.id AND a.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 4. VERTICAL 3: POS & INVENTORY / SALES
-- ---------------------------------------------------------------------

-- products
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.products p
SET business_id = b.business_id
FROM public.branches b
WHERE p.branch_id = b.id AND p.business_id IS NULL;

-- sales
ALTER TABLE IF EXISTS public.sales
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.sales s
SET business_id = b.business_id
FROM public.branches b
WHERE s.branch_id = b.id AND s.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 5. VERTICAL 4: FREELANCE & SOLO PRACTITIONER
-- ---------------------------------------------------------------------

-- freelance_clients
ALTER TABLE IF EXISTS public.freelance_clients
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_clients fc
SET business_id = b.business_id
FROM public.branches b
WHERE fc.branch_id = b.id AND fc.business_id IS NULL;

-- freelance_projects
ALTER TABLE IF EXISTS public.freelance_projects
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_projects fp
SET business_id = b.business_id
FROM public.branches b
WHERE fp.branch_id = b.id AND fp.business_id IS NULL;

-- freelance_time_logs
ALTER TABLE IF EXISTS public.freelance_time_logs
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_time_logs ft
SET business_id = b.business_id
FROM public.branches b
WHERE ft.branch_id = b.id AND ft.business_id IS NULL;

-- freelance_invoices
ALTER TABLE IF EXISTS public.freelance_invoices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_invoices fi
SET business_id = b.business_id
FROM public.branches b
WHERE fi.branch_id = b.id AND fi.business_id IS NULL;

-- freelance_proposals
ALTER TABLE IF EXISTS public.freelance_proposals
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_proposals fpr
SET business_id = b.business_id
FROM public.branches b
WHERE fpr.branch_id = b.id AND fpr.business_id IS NULL;

-- freelance_expenses
ALTER TABLE IF EXISTS public.freelance_expenses
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.freelance_expenses fe
SET business_id = b.business_id
FROM public.branches b
WHERE fe.branch_id = b.id AND fe.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 6. VERTICAL 5: RENTAL & VENUE BOOKING
-- ---------------------------------------------------------------------

-- rentable_units
ALTER TABLE IF EXISTS public.rentable_units
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.rentable_units ru
SET business_id = b.business_id
FROM public.branches b
WHERE ru.branch_id = b.id AND ru.business_id IS NULL;

-- rental_renters
ALTER TABLE IF EXISTS public.rental_renters
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.rental_renters rr
SET business_id = b.business_id
FROM public.branches b
WHERE rr.branch_id = b.id AND rr.business_id IS NULL;

-- rental_bookings
ALTER TABLE IF EXISTS public.rental_bookings
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.rental_bookings rb
SET business_id = b.business_id
FROM public.branches b
WHERE rb.branch_id = b.id AND rb.business_id IS NULL;

-- security_deposits
ALTER TABLE IF EXISTS public.security_deposits
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.security_deposits sd
SET business_id = b.business_id
FROM public.branches b
WHERE sd.branch_id = b.id AND sd.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 7. VERTICAL 6: EDUCATION & TRAINING ACADEMY
-- ---------------------------------------------------------------------

-- education_students
ALTER TABLE IF EXISTS public.education_students
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.education_students es
SET business_id = b.business_id
FROM public.branches b
WHERE es.branch_id = b.id AND es.business_id IS NULL;

-- education_cohorts
ALTER TABLE IF EXISTS public.education_cohorts
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.education_cohorts ec
SET business_id = b.business_id
FROM public.branches b
WHERE ec.branch_id = b.id AND ec.business_id IS NULL;

-- education_attendance
ALTER TABLE IF EXISTS public.education_attendance
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.education_attendance ea
SET business_id = b.business_id
FROM public.branches b
WHERE ea.branch_id = b.id AND ea.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 8. VERTICAL 7: PROJECT & MILESTONE (ACTIVATOR / AGENCY)
-- ---------------------------------------------------------------------

-- pm_clients
ALTER TABLE IF EXISTS public.pm_clients
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Migrate legacy tenant_id/facility_id if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_clients' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_clients SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_clients' AND column_name = 'facility_id') THEN
    UPDATE public.pm_clients SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_clients pmc
SET business_id = b.business_id
FROM public.branches b
WHERE pmc.branch_id = b.id AND pmc.business_id IS NULL;

-- pm_projects
ALTER TABLE IF EXISTS public.pm_projects
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_projects' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_projects SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_projects' AND column_name = 'facility_id') THEN
    UPDATE public.pm_projects SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_projects pmp
SET business_id = b.business_id
FROM public.branches b
WHERE pmp.branch_id = b.id AND pmp.business_id IS NULL;

-- Fallback pm_projects.staff_id to project_manager_id if matching staff table
UPDATE public.pm_projects pmp
SET staff_id = s.id
FROM public.staff s
WHERE pmp.project_manager_id = s.id AND pmp.staff_id IS NULL;

-- pm_milestones
ALTER TABLE IF EXISTS public.pm_milestones
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.pm_milestones ms
SET account_id = p.account_id,
    business_id = p.business_id,
    branch_id = p.branch_id
FROM public.pm_projects p
WHERE ms.project_id = p.id AND (ms.account_id IS NULL OR ms.business_id IS NULL OR ms.branch_id IS NULL);

-- pm_collateral_catalog
ALTER TABLE IF EXISTS public.pm_collateral_catalog
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- pm_print_orders
ALTER TABLE IF EXISTS public.pm_print_orders
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_print_orders' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_print_orders SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_print_orders' AND column_name = 'facility_id') THEN
    UPDATE public.pm_print_orders SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_print_orders po
SET business_id = b.business_id
FROM public.branches b
WHERE po.branch_id = b.id AND po.business_id IS NULL;

-- pm_bat_deliverables
ALTER TABLE IF EXISTS public.pm_bat_deliverables
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_bat_deliverables' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_bat_deliverables SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_bat_deliverables' AND column_name = 'facility_id') THEN
    UPDATE public.pm_bat_deliverables SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_bat_deliverables bd
SET business_id = b.business_id
FROM public.branches b
WHERE bd.branch_id = b.id AND bd.business_id IS NULL;

-- pm_talents
ALTER TABLE IF EXISTS public.pm_talents
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_talents' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_talents SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_talents' AND column_name = 'facility_id') THEN
    UPDATE public.pm_talents SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_talents pt
SET business_id = b.business_id
FROM public.branches b
WHERE pt.branch_id = b.id AND pt.business_id IS NULL;

-- pm_missions
ALTER TABLE IF EXISTS public.pm_missions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_missions' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_missions SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_missions' AND column_name = 'facility_id') THEN
    UPDATE public.pm_missions SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_missions pmm
SET business_id = b.business_id
FROM public.branches b
WHERE pmm.branch_id = b.id AND pmm.business_id IS NULL;

-- pm_mission_staff
ALTER TABLE IF EXISTS public.pm_mission_staff
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.pm_mission_staff ms
SET account_id = m.account_id,
    business_id = m.business_id,
    branch_id = m.branch_id
FROM public.pm_missions m
WHERE ms.mission_id = m.id AND (ms.account_id IS NULL OR ms.business_id IS NULL OR ms.branch_id IS NULL);

-- pm_attendances
ALTER TABLE IF EXISTS public.pm_attendances
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_attendances' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_attendances SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_attendances' AND column_name = 'facility_id') THEN
    UPDATE public.pm_attendances SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_attendances pma
SET business_id = b.business_id
FROM public.branches b
WHERE pma.branch_id = b.id AND pma.business_id IS NULL;

-- pm_expenses
ALTER TABLE IF EXISTS public.pm_expenses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_expenses' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_expenses SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_expenses' AND column_name = 'facility_id') THEN
    UPDATE public.pm_expenses SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_expenses pme
SET business_id = b.business_id
FROM public.branches b
WHERE pme.branch_id = b.id AND pme.business_id IS NULL;

-- pm_payroll_batches
ALTER TABLE IF EXISTS public.pm_payroll_batches
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_payroll_batches' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_payroll_batches SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_payroll_batches' AND column_name = 'facility_id') THEN
    UPDATE public.pm_payroll_batches SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_payroll_batches pb
SET business_id = b.business_id
FROM public.branches b
WHERE pb.branch_id = b.id AND pb.business_id IS NULL;

-- pm_ccp_slips
ALTER TABLE IF EXISTS public.pm_ccp_slips
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.pm_ccp_slips ccp
SET account_id = pb.account_id,
    business_id = pb.business_id,
    branch_id = pb.branch_id
FROM public.pm_payroll_batches pb
WHERE ccp.payroll_batch_id = pb.id AND (ccp.account_id IS NULL OR ccp.business_id IS NULL OR ccp.branch_id IS NULL);

-- pm_equipment_stock
ALTER TABLE IF EXISTS public.pm_equipment_stock
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_equipment_stock' AND column_name = 'tenant_id') THEN
    UPDATE public.pm_equipment_stock SET account_id = tenant_id WHERE account_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_equipment_stock' AND column_name = 'facility_id') THEN
    UPDATE public.pm_equipment_stock SET branch_id = facility_id WHERE branch_id IS NULL;
  END IF;
END $$;

UPDATE public.pm_equipment_stock pes
SET business_id = b.business_id
FROM public.branches b
WHERE pes.branch_id = b.id AND pes.business_id IS NULL;

-- ---------------------------------------------------------------------
-- 9. AUTOMATIC STAFF FALLBACK (Owner / First Active Staff)
-- ---------------------------------------------------------------------
-- When staff_id is NULL, backfill with the branch manager or account owner
DO $$
DECLARE
  tbl_name text;
  tables_to_staff_backfill text[] := ARRAY[
    'members_directory', 'registrations', 'products', 'freelance_clients',
    'freelance_projects', 'freelance_invoices', 'rentable_units', 'rental_bookings',
    'education_students', 'education_cohorts', 'pm_clients', 'pm_projects'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_staff_backfill LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
      EXECUTE format('
        UPDATE public.%I t
        SET staff_id = sub.id
        FROM (
          SELECT s.id, s.branch_id
          FROM public.staff s
          WHERE s.is_active = true
          ORDER BY (s.role = ''owner'') DESC, (s.role = ''manager'') DESC, s.created_at ASC
        ) sub
        WHERE t.branch_id = sub.branch_id AND t.staff_id IS NULL;
      ', tbl_name);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 10. COMPOSITE INDEXES FOR HIGH-PERFORMANCE MULTI-TENANT QUERYING
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

-- Enable RLS and verify policies across all updated tables
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
      
      -- Create permissive authenticated policy if none exists
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
  RAISE NOTICE 'Atrium Quadruple Traceability Migration successfully generated and executed!';
END $$;
