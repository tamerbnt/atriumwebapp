-- ============================================================================
-- ROLLBACK FOR PHASE 2: 202611180002_phase2_group_a_isolation.sql
-- Reverses Group A vertical RPCs, triggers, realtime publication entries,
-- and Group A vertical tables.
-- ============================================================================

BEGIN;

-- 1. Drop Group A Business RPCs & Overlap Trigger
DROP FUNCTION IF EXISTS public.pm_check_budget_burn(uuid);
DROP FUNCTION IF EXISTS public.pm_approve_disbursement(text, uuid, text);
DROP FUNCTION IF EXISTS public.pm_close_roll_call(uuid, text);
DROP FUNCTION IF EXISTS public.pos_process_sale(uuid, jsonb, text, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.salon_checkout_appointment(uuid, text, numeric);
DROP FUNCTION IF EXISTS public.gym_record_check_in(uuid, uuid, text, text);

DROP TRIGGER IF EXISTS trg_rental_booking_overlap ON public.rental_bookings;
DROP FUNCTION IF EXISTS public.fn_rental_check_booking_overlap();

-- 2. Remove Group A Tables from Realtime & Drop Tables in Reverse Dependency Order
DO $$
DECLARE
  tbl text;
  group_a_tables text[] := ARRAY[
    'freelance_expenses', 'freelance_proposals', 'freelance_invoice_items', 'freelance_invoices',
    'freelance_time_logs', 'freelance_active_timers', 'freelance_deliverables', 'freelance_projects',
    'freelance_clients', 'freelance_services', 'freelance_staff',
    'edu_admissions', 'edu_certificates', 'edu_grades', 'edu_attendance', 'edu_sessions',
    'edu_enrollments', 'edu_students', 'edu_cohorts', 'edu_classrooms', 'edu_courses', 'edu_staff',
    'rental_security_deposits', 'rental_booking_addons', 'rental_bookings', 'rental_renters',
    'rental_units', 'rental_staff',
    'pm_equipment_stock', 'pm_ccp_slips', 'pm_payroll_batches', 'pm_expenses',
    'pm_attendances', 'pm_mission_staff', 'pm_missions', 'pm_talents', 'pm_bat_deliverables',
    'pm_print_orders', 'pm_collateral_catalog', 'pm_milestones', 'pm_projects', 'pm_clients', 'pm_staff',
    'pos_receipt_configs', 'pos_stock_movements', 'pos_parked_orders', 'pos_sale_items',
    'pos_sales', 'pos_products', 'pos_customers', 'pos_staff',
    'salon_stylist_payouts', 'salon_sale_items', 'salon_sales', 'salon_appointments',
    'salon_products', 'salon_services', 'salon_clients', 'salon_chair_stations',
    'salon_workstations', 'salon_staff',
    'gym_sale_items', 'gym_sales', 'gym_products', 'gym_schedule_events', 'gym_walk_in_tickets',
    'gym_check_ins', 'gym_registrations', 'gym_registration_leads', 'gym_members', 'gym_plans', 'gym_staff'
  ];
BEGIN
  FOREACH tbl IN ARRAY group_a_tables
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I;', tbl);
      END IF;
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;
