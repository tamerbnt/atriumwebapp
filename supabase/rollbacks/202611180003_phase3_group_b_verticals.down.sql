-- ============================================================================
-- ROLLBACK FOR PHASE 3: 202611180003_phase3_group_b_verticals.sql
-- Reverses Group B vertical RPCs, validation triggers, realtime publication
-- entries, RLS policies, and Group B vertical tables.
-- ============================================================================

BEGIN;

-- 1. Drop Group B Trigger & Business RPCs
DROP TRIGGER IF EXISTS trg_agri_milking_withholding ON public.agri_milking_logs;
DROP FUNCTION IF EXISTS public.fn_agri_validate_milking_withholding();

DROP TRIGGER IF EXISTS trg_agri_harvest_dar ON public.agri_harvests;
DROP FUNCTION IF EXISTS public.fn_agri_validate_harvest_dar();

DROP TRIGGER IF EXISTS trg_agri_treatment_dar ON public.agri_treatments;
DROP FUNCTION IF EXISTS public.fn_agri_validate_treatment();

DROP FUNCTION IF EXISTS public.logistics_seal_bag(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.legal_escrow_movement(uuid, uuid, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.mfg_process_material_voucher(uuid, uuid, text, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.garage_requisition_part(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.garage_release_bay(uuid);
DROP FUNCTION IF EXISTS public.garage_assign_bay(uuid, uuid);
DROP FUNCTION IF EXISTS public.trading_convert_commercial_doc(uuid, text);

-- 2. Remove Group B Tables from Realtime & Drop Tables in Reverse Dependency Order
DO $$
DECLARE
  tbl text;
  group_b_tables text[] := ARRAY[
    'agri_sales', 'agri_stock_items', 'agri_cold_storage', 'agri_harvests',
    'agri_treatments', 'agri_milking_logs', 'agri_livestock', 'agri_crop_cycles', 'agri_parcels', 'agri_staff',
    'btp_cacobatph_dossiers', 'btp_safety_incidents', 'btp_equipment', 'btp_materials',
    'btp_daily_logs', 'btp_subcontract_claims', 'btp_subcontractors', 'btp_decomptes',
    'btp_boq_items', 'btp_projects', 'btp_staff',
    'logistics_tickets', 'logistics_discharges', 'logistics_remittances', 'logistics_parcel_events',
    'logistics_parcels', 'logistics_courier_bags', 'logistics_merchants', 'logistics_wilaya_tariffs',
    'logistics_drivers', 'logistics_fleet', 'logistics_staff',
    'legal_documents', 'legal_cash_receipts', 'legal_invoices', 'legal_disbursements',
    'legal_escrow_movements', 'legal_time_entries', 'legal_deadlines', 'legal_hearings',
    'legal_matters', 'legal_clients', 'legal_staff',
    'mfg_batches', 'mfg_material_vouchers', 'mfg_qc_inspections', 'mfg_workstation_logs',
    'mfg_orders', 'mfg_bom_ingredients', 'mfg_bom_recipes', 'mfg_raw_materials', 'mfg_workstations', 'mfg_staff',
    're_sales', 're_owner_ledger', 're_inspections', 're_rent_schedules', 're_leases',
    're_mandates', 're_visits', 're_leads', 're_clients', 're_properties', 're_staff',
    'garage_invoices', 'garage_fleet_contracts', 'garage_purchase_orders', 'garage_suppliers',
    'garage_part_requisitions', 'garage_parts', 'garage_work_order_items', 'garage_work_orders',
    'garage_vehicles', 'garage_bays', 'garage_staff',
    'medical_invoices', 'medical_consumables', 'medical_consultations', 'medical_appointments',
    'medical_patients', 'medical_departments', 'medical_staff',
    'trading_stock_voucher_items', 'trading_stock_vouchers', 'trading_purchase_doc_items',
    'trading_purchase_docs', 'trading_commercial_doc_items', 'trading_commercial_docs',
    'trading_products', 'trading_b2b_suppliers', 'trading_b2b_clients', 'trading_warehouses', 'trading_staff'
  ];
BEGIN
  FOREACH tbl IN ARRAY group_b_tables
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
