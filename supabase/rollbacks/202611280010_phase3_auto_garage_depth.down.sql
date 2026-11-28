-- Rollback for Phase 3 Step 10 (7.10 auto_garage) Depth Migration

DROP FUNCTION IF EXISTS public.garage_reopen_invoiced_order(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.garage_receive_purchase_order(uuid, text, text, jsonb);

-- Restore prior garage_assign_bay signature without conflict trigger
DROP TRIGGER IF EXISTS trg_guard_garage_bay_double_assignment ON public.garage_bays;
DROP FUNCTION IF EXISTS public.fn_guard_garage_bay_double_assignment();

DROP TABLE IF EXISTS public.garage_tire_storage;
DROP TABLE IF EXISTS public.garage_detailing_packages;
DROP TABLE IF EXISTS public.garage_inspection_pvs;
DROP TABLE IF EXISTS public.garage_insurance_claims;
DROP TABLE IF EXISTS public.garage_tech_commissions;
DROP TABLE IF EXISTS public.garage_technician_time_logs;
DROP TABLE IF EXISTS public.garage_flat_rate_labor;

DROP INDEX IF EXISTS public.uq_garage_purchase_orders_branch_num;
ALTER TABLE public.garage_purchase_orders
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS lines_received,
  DROP COLUMN IF EXISTS warranty_expiry_date,
  DROP COLUMN IF EXISTS warranty_months,
  DROP COLUMN IF EXISTS received_by_name,
  DROP COLUMN IF EXISTS received_at,
  DROP COLUMN IF EXISTS ordered_at,
  DROP COLUMN IF EXISTS delivery_note_number;

ALTER TABLE public.garage_suppliers
  DROP COLUMN IF EXISTS payment_terms_days,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS rc_number,
  DROP COLUMN IF EXISTS nif,
  DROP COLUMN IF EXISTS crm_party_id;

ALTER TABLE public.garage_parts
  DROP COLUMN IF EXISTS default_warranty_months,
  DROP COLUMN IF EXISTS compatibility,
  DROP COLUMN IF EXISTS supplier_id,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS oem_reference;

ALTER TABLE public.garage_work_orders
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS unified_document_id,
  DROP COLUMN IF EXISTS reopened_at,
  DROP COLUMN IF EXISTS reopen_reason,
  DROP COLUMN IF EXISTS reopen_credit_note_id,
  DROP COLUMN IF EXISTS is_locked_invoiced,
  DROP COLUMN IF EXISTS detailing_package_id,
  DROP COLUMN IF EXISTS mileage_override_reason,
  DROP COLUMN IF EXISTS labor_lines,
  DROP COLUMN IF EXISTS quote_unit_prices_snapshot,
  DROP COLUMN IF EXISTS estimate_photos,
  DROP COLUMN IF EXISTS estimate_approved_by,
  DROP COLUMN IF EXISTS estimate_approved_at,
  DROP COLUMN IF EXISTS estimate_status,
  DROP COLUMN IF EXISTS client_crm_party_id;

DROP INDEX IF EXISTS public.idx_garage_vehicles_crm_party;
ALTER TABLE public.garage_vehicles
  DROP COLUMN IF EXISTS ownership_history,
  DROP COLUMN IF EXISTS carte_grise_number,
  DROP COLUMN IF EXISTS insurance_expiry,
  DROP COLUMN IF EXISTS tech_control_expiry,
  DROP COLUMN IF EXISTS daily_avg_km,
  DROP COLUMN IF EXISTS next_service_date,
  DROP COLUMN IF EXISTS next_service_km,
  DROP COLUMN IF EXISTS last_service_date,
  DROP COLUMN IF EXISTS last_service_km,
  DROP COLUMN IF EXISTS plate_format,
  DROP COLUMN IF EXISTS vehicle_type,
  DROP COLUMN IF EXISTS crm_party_id;
