-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 5: 100% PRODUCTION-READINESS HARDENING
-- Covers:
--   1. Deterministic Keyset & Range Pagination Indexes (Item 1, Item 14)
--   2. Partial Unique Indexes WHERE deleted_at IS NULL (Item 11, Item 13)
--   3. Optimistic Concurrency Control via monotonic version + BEFORE UPDATE triggers (Item 9)
--   4. Atomic Multi-Table & Batch RPCs with FOR UPDATE Row Locking (Item 2, Item 8, Item 10)
--   5. Keyset-Paginated Immutable Audit Log Query RPC (Item 14)
-- Target: Supabase PostgreSQL 15+ (Supavisor Port 6543 Transaction Mode safe)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Optimistic Concurrency Control (version column & trigger enforcement)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_optimistic_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.version IS NOT NULL AND OLD.version IS NOT NULL AND NEW.version < OLD.version THEN
    RAISE EXCEPTION 'CONFLICT_STALE_VERSION: expected version %, current version %', NEW.version, OLD.version
      USING ERRCODE = '40001',
            DETAIL = jsonb_build_object(
              'table', TG_TABLE_NAME,
              'id', OLD.id,
              'expected_version', NEW.version,
              'current_version', OLD.version
            )::text;
  END IF;
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_enforce_optimistic_row_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.row_version IS NOT NULL AND OLD.row_version IS NOT NULL AND NEW.row_version < OLD.row_version THEN
    RAISE EXCEPTION 'CONFLICT_STALE_VERSION: expected row_version %, current row_version %', NEW.row_version, OLD.row_version
      USING ERRCODE = '40001',
            DETAIL = jsonb_build_object(
              'table', TG_TABLE_NAME,
              'id', OLD.id,
              'expected_version', NEW.row_version,
              'current_version', OLD.row_version
            )::text;
  END IF;
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END;
$$;

-- Attach optimistic version column + trigger to all mutable core and vertical tables
DO $$
DECLARE
  tbl text;
  all_mutable_tables text[] := ARRAY[
    -- Core tenant & workforce tables
    'businesses', 'branches', 'staff', 'staff_branch_assignments',
    'staff_attendance_logs', 'staff_salary_advances', 'staff_payroll_runs', 'staff_payroll_slips',
    'devices',
    -- Group A verticals
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
    'freelance_invoices', 'freelance_invoice_items', 'freelance_proposals', 'freelance_expenses',
    -- Group B verticals
    'trading_staff', 'trading_warehouses', 'trading_b2b_clients', 'trading_b2b_suppliers',
    'trading_products', 'trading_commercial_docs', 'trading_commercial_doc_items',
    'trading_purchase_docs', 'trading_purchase_doc_items', 'trading_stock_vouchers', 'trading_stock_voucher_items',
    'medical_staff', 'medical_departments', 'medical_patients', 'medical_appointments',
    'medical_consultations', 'medical_consumables', 'medical_invoices',
    'garage_staff', 'garage_bays', 'garage_vehicles', 'garage_work_orders',
    'garage_work_order_items', 'garage_parts', 'garage_part_requisitions',
    'garage_suppliers', 'garage_purchase_orders', 'garage_fleet_contracts', 'garage_invoices',
    're_staff', 're_properties', 're_clients', 're_leads', 're_visits',
    're_mandates', 're_leases', 're_rent_schedules', 're_inspections', 're_owner_ledger', 're_sales',
    'mfg_staff', 'mfg_workstations', 'mfg_raw_materials',
    'mfg_bom_ingredients', 'mfg_orders', 'mfg_workstation_logs', 'mfg_qc_inspections',
    'mfg_material_vouchers', 'mfg_batches',
    'legal_staff', 'legal_clients', 'legal_matters', 'legal_hearings', 'legal_deadlines',
    'legal_time_entries', 'legal_escrow_movements', 'legal_disbursements', 'legal_invoices',
    'legal_cash_receipts', 'legal_documents',
    'logistics_staff', 'logistics_fleet', 'logistics_drivers', 'logistics_wilaya_tariffs',
    'logistics_merchants', 'logistics_courier_bags', 'logistics_parcels', 'logistics_parcel_events',
    'logistics_remittances', 'logistics_discharges', 'logistics_tickets',
    'btp_staff', 'btp_projects', 'btp_boq_items', 'btp_decomptes', 'btp_subcontractors',
    'btp_subcontract_claims', 'btp_daily_logs', 'btp_materials', 'btp_equipment',
    'btp_safety_incidents', 'btp_cacobatph_dossiers',
    'agri_staff', 'agri_parcels', 'agri_crop_cycles', 'agri_livestock', 'agri_milking_logs',
    'agri_treatments', 'agri_harvests', 'agri_cold_storage', 'agri_stock_items', 'agri_sales'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_mutable_tables
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'version'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN version bigint NOT NULL DEFAULT 1;', tbl);
      END IF;

      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_optimistic_version ON public.%I;', tbl, tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_optimistic_version BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_version();',
        tbl, tbl
      );
    END IF;
  END LOOP;

  -- mfg_bom_recipes already uses "version text" for semantic recipe revision metadata;
  -- enforce optimistic concurrency on row_version bigint.
  IF to_regclass('public.mfg_bom_recipes') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mfg_bom_recipes' AND column_name = 'row_version'
    ) THEN
      ALTER TABLE public.mfg_bom_recipes ADD COLUMN row_version bigint NOT NULL DEFAULT 1;
    END IF;
    DROP TRIGGER IF EXISTS trg_mfg_bom_recipes_optimistic_version ON public.mfg_bom_recipes;
    CREATE TRIGGER trg_mfg_bom_recipes_optimistic_version
      BEFORE UPDATE ON public.mfg_bom_recipes
      FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_optimistic_row_version();
  END IF;
END $$;

-- Include version in get_staff_for_sync projection so staff edits carry optimistic version
CREATE OR REPLACE FUNCTION public.get_staff_for_sync(
  p_account_id uuid,
  p_facility_id uuid DEFAULT NULL,
  p_updated_after timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_auth_acc uuid := COALESCE(public.get_auth_account_id(), auth.uid());
  v_is_admin boolean := public.is_tenant_admin();
  v_uid uuid := auth.uid();
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id',                  s.id,
    'account_id',          s.account_id,
    'tenant_id',           s.account_id,
    'business_id',         s.business_id,
    'branch_id',           COALESCE(s.branch_id, sba.branch_id),
    'primary_facility_id', COALESCE(
                             s.branch_id,
                             sba.branch_id,
                             (SELECT b.id FROM public.branches b
                              WHERE b.account_id = s.account_id AND b.is_main_branch = true LIMIT 1)
                           ),
    'full_name',           s.full_name,
    'email',               s.email,
    'phone',               s.phone,
    'role',                s.role,
    'salary',              CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.salary ELSE 0 END,
    'payment_day',         CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.payment_day ELSE 1 END,
    'ccp_number',          CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.ccp_number ELSE NULL END,
    'ccp_key',             CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.ccp_key ELSE NULL END,
    'bank_rib',            CASE WHEN v_is_admin OR s.auth_user_id = v_uid THEN s.bank_rib ELSE NULL END,
    'payment_method',      s.payment_method,
    'card_id',             s.card_id,
    'badge_token',         s.badge_token,
    'status',              s.status,
    'is_owner',            (s.role IN ('owner', 'agency_director')),
    'is_active',           s.is_active,
    'auth_user_id',        s.auth_user_id,
    'version',             s.version,
    'created_at',          s.created_at,
    'updated_at',          s.updated_at
  ) ORDER BY s.updated_at ASC, s.id ASC)
  INTO v_result
  FROM public.staff s
  LEFT JOIN public.staff_branch_assignments sba
    ON sba.staff_id = s.id AND sba.deleted_at IS NULL
  WHERE s.account_id = p_account_id
    AND s.deleted_at IS NULL
    AND s.is_active = true
    AND (p_updated_after IS NULL OR s.updated_at > p_updated_after)
    AND (p_facility_id IS NULL OR s.branch_id = p_facility_id OR sba.branch_id = p_facility_id OR (s.branch_id IS NULL AND sba.branch_id IS NULL));

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_for_sync(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_for_sync(uuid, uuid, timestamptz) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Partial Unique Indexes (WHERE deleted_at IS NULL) for Soft-Deletables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
  col_list text;
  idx_name text;
BEGIN
  -- Convert table-wide UNIQUE constraints on any soft-deletable public table
  -- into partial unique indexes scoped to active rows (WHERE deleted_at IS NULL).
  FOR rec IN
    SELECT
      c.conname,
      c.conrelid,
      cl.relname AS tbl_name,
      c.conkey
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'u'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns ic
        WHERE ic.table_schema = 'public'
          AND ic.table_name = cl.relname
          AND ic.column_name = 'deleted_at'
      )
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO col_list
    FROM unnest(rec.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = rec.conrelid AND a.attnum = k.attnum;

    IF col_list IS NOT NULL THEN
      idx_name := left('idx_' || rec.tbl_name || '_' || replace(rec.conname, '.', '_') || '_active_uq', 60);
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', rec.tbl_name, rec.conname);
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (%s) WHERE deleted_at IS NULL;',
        idx_name, rec.tbl_name, col_list
      );
    END IF;
  END LOOP;
END $$;

-- Explicit canonical partial unique indexes for upserts & active code reuse
CREATE UNIQUE INDEX IF NOT EXISTS idx_sba_staff_branch_active_unique
  ON public.staff_branch_assignments (staff_id, branch_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_receipt_configs_branch_active_unique
  ON public.pos_receipt_configs (branch_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_tariffs_branch_zone_active_unique
  ON public.logistics_wilaya_tariffs (branch_id, zone_id)
  WHERE deleted_at IS NULL;

-- Create scoped active partial unique indexes on branch-level codes/SKUs when clean
DO $$
BEGIN
  IF to_regclass('public.pos_products') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.pos_products
       WHERE deleted_at IS NULL AND sku IS NOT NULL AND sku <> ''
       GROUP BY branch_id, sku HAVING count(*) > 1
     ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_products_branch_sku_active_unique
      ON public.pos_products (branch_id, sku)
      WHERE deleted_at IS NULL AND sku IS NOT NULL AND sku <> '';
  END IF;

  IF to_regclass('public.mfg_bom_recipes') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.mfg_bom_recipes
       WHERE deleted_at IS NULL AND code IS NOT NULL AND code <> ''
       GROUP BY branch_id, code HAVING count(*) > 1
     ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mfg_bom_recipes_branch_code_active_unique
      ON public.mfg_bom_recipes (branch_id, code)
      WHERE deleted_at IS NULL AND code IS NOT NULL AND code <> '';
  END IF;

  IF to_regclass('public.logistics_parcels') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.logistics_parcels
       WHERE deleted_at IS NULL AND tracking_code IS NOT NULL AND tracking_code <> ''
       GROUP BY branch_id, tracking_code HAVING count(*) > 1
     ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_parcels_branch_tracking_active_unique
      ON public.logistics_parcels (branch_id, tracking_code)
      WHERE deleted_at IS NULL AND tracking_code IS NOT NULL AND tracking_code <> '';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Deterministic Keyset & Range Pagination Indexes
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  has_branch boolean;
  has_updated boolean;
  has_created boolean;
  has_deleted boolean;
  idx_sync text;
  idx_desc text;
  paged_tables text[] := ARRAY[
    'staff', 'staff_attendance_logs', 'staff_salary_advances', 'staff_payroll_runs', 'staff_payroll_slips',
    'gym_members', 'gym_registration_leads', 'gym_check_ins', 'gym_plans', 'gym_schedule_events', 'gym_sales',
    'salon_appointments', 'salon_services', 'salon_workstations', 'salon_stylist_payouts', 'salon_sales',
    'pos_products', 'pos_sales', 'pos_parked_orders', 'pos_stock_movements',
    'pm_staff', 'pm_clients', 'pm_projects', 'pm_milestones', 'pm_collateral_catalog',
    'pm_print_orders', 'pm_bat_deliverables', 'pm_talents', 'pm_missions', 'pm_mission_staff',
    'pm_attendances', 'pm_expenses', 'pm_payroll_batches', 'pm_ccp_slips', 'pm_equipment_stock',
    'rental_units', 'rental_renters', 'rental_bookings', 'rental_security_deposits',
    'edu_courses', 'edu_classrooms', 'edu_cohorts', 'edu_students', 'edu_enrollments',
    'edu_sessions', 'edu_attendance', 'edu_grades', 'edu_certificates', 'edu_admissions',
    'freelance_clients', 'freelance_projects', 'freelance_time_logs', 'freelance_invoices',
    'freelance_proposals', 'freelance_expenses',
    'trading_warehouses', 'trading_b2b_clients', 'trading_b2b_suppliers', 'trading_products',
    'trading_commercial_docs', 'trading_purchase_docs', 'trading_stock_vouchers',
    'medical_staff', 'medical_departments', 'medical_patients', 'medical_appointments', 'medical_consultations',
    'garage_bays', 'garage_vehicles', 'garage_work_orders', 'garage_parts', 'garage_fleet_contracts', 'garage_invoices',
    're_properties', 're_clients', 're_leads', 're_visits', 're_mandates', 're_leases', 're_rent_schedules', 're_inspections',
    'mfg_raw_materials', 'mfg_bom_recipes', 'mfg_bom_ingredients', 'mfg_orders',
    'mfg_workstation_logs', 'mfg_qc_inspections', 'mfg_material_vouchers',
    'legal_clients', 'legal_matters', 'legal_hearings', 'legal_deadlines', 'legal_time_entries',
    'legal_escrow_movements', 'legal_disbursements', 'legal_documents',
    'logistics_fleet', 'logistics_wilaya_tariffs', 'logistics_courier_bags', 'logistics_parcels',
    'logistics_remittances', 'logistics_discharges',
    'btp_projects', 'btp_boq_items', 'btp_decomptes', 'btp_subcontractors',
    'btp_daily_logs', 'btp_materials', 'btp_equipment',
    'agri_staff', 'agri_parcels', 'agri_crop_cycles', 'agri_livestock',
    'agri_milking_logs', 'agri_treatments', 'agri_harvests', 'agri_sales'
  ];
BEGIN
  FOREACH tbl IN ARRAY paged_tables
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      SELECT
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'branch_id'),
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'),
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'created_at'),
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'deleted_at')
      INTO has_branch, has_updated, has_created, has_deleted;

      idx_sync := left('idx_' || tbl || '_keyset_sync', 60);
      idx_desc := left('idx_' || tbl || '_keyset_created', 60);

      IF has_branch AND has_updated AND has_deleted THEN
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON public.%I (branch_id, updated_at ASC, id ASC) WHERE deleted_at IS NULL;',
          idx_sync, tbl
        );
      END IF;

      IF has_branch AND has_created AND has_deleted THEN
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON public.%I (branch_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;',
          idx_desc, tbl
        );
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_account_keyset
  ON public.businesses (account_id, updated_at ASC, id ASC)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_account_keyset
  ON public.branches (account_id, updated_at ASC, id ASC)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_immutable_audit_logs_keyset
  ON public.immutable_audit_logs (account_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_logs_branch_keyset
  ON public.immutable_audit_logs (account_id, branch_id, occurred_at DESC, id DESC);

-- ----------------------------------------------------------------------------
-- 4. Atomic Multi-Table & Batch RPCs (Eliminate Remaining Write Loops)
-- ----------------------------------------------------------------------------

-- 4A. Atomic Manufacturing BOM Recipe + Ingredients Upsert with FOR UPDATE Lock
CREATE OR REPLACE FUNCTION public.mfg_upsert_bom_atomic(
  p_recipe jsonb,
  p_ingredients jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bom_id uuid := NULLIF(p_recipe->>'id', '')::uuid;
  v_branch_id uuid := NULLIF(p_recipe->>'branch_id', '')::uuid;
  v_account_id uuid := COALESCE(NULLIF(p_recipe->>'account_id', '')::uuid, public.get_auth_account_id());
  v_business_id uuid := NULLIF(p_recipe->>'business_id', '')::uuid;
  v_staff_id uuid := NULLIF(p_recipe->>'staff_id', '')::uuid;
  v_expected_ver bigint := NULLIF(p_recipe->>'expected_row_version', '')::bigint;
  v_existing record;
  v_new_ver bigint := 1;
  v_ing jsonb;
  v_ing_ids uuid[] := ARRAY[]::uuid[];
  v_ing_id uuid;
BEGIN
  IF v_bom_id IS NULL OR v_branch_id IS NULL OR NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing
  FROM public.mfg_bom_recipes
  WHERE id = v_bom_id AND deleted_at IS NULL
  FOR UPDATE;

  IF FOUND AND v_expected_ver IS NOT NULL AND v_existing.row_version <> v_expected_ver THEN
    RAISE EXCEPTION 'CONFLICT_STALE_VERSION: expected row_version %, current row_version %', v_expected_ver, v_existing.row_version
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.mfg_bom_recipes (
    id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
    code, finished_product_name, output_unit, batch_size, estimated_unit_cost_dzd,
    standard_cycle_minutes, version, is_active, updated_at
  ) VALUES (
    v_bom_id,
    v_account_id,
    v_business_id,
    v_branch_id,
    v_staff_id,
    NULLIF(p_recipe->>'updated_by_staff_id', '')::uuid,
    p_recipe->>'device_id',
    COALESCE(p_recipe->>'code', 'BOM-001'),
    COALESCE(p_recipe->>'finished_product_name', 'Product'),
    COALESCE(p_recipe->>'output_unit', 'U'),
    COALESCE((p_recipe->>'batch_size')::numeric, 1),
    COALESCE((p_recipe->>'estimated_unit_cost_dzd')::numeric, 0),
    COALESCE((p_recipe->>'standard_cycle_minutes')::int, 60),
    COALESCE(p_recipe->>'version', 'v1.0'),
    COALESCE((p_recipe->>'is_active')::boolean, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    finished_product_name = EXCLUDED.finished_product_name,
    output_unit = EXCLUDED.output_unit,
    batch_size = EXCLUDED.batch_size,
    estimated_unit_cost_dzd = EXCLUDED.estimated_unit_cost_dzd,
    standard_cycle_minutes = EXCLUDED.standard_cycle_minutes,
    version = EXCLUDED.version,
    is_active = EXCLUDED.is_active,
    row_version = COALESCE(v_expected_ver, public.mfg_bom_recipes.row_version),
    updated_by_staff_id = EXCLUDED.updated_by_staff_id,
    device_id = EXCLUDED.device_id,
    deleted_at = NULL,
    updated_at = now()
  RETURNING row_version INTO v_new_ver;

  FOR v_ing IN SELECT * FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb))
  LOOP
    v_ing_id := COALESCE(NULLIF(v_ing->>'id', '')::uuid, gen_random_uuid());
    v_ing_ids := array_append(v_ing_ids, v_ing_id);

    INSERT INTO public.mfg_bom_ingredients (
      id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
      bom_id, material_id, material_name, quantity_per_batch, unit, scrap_factor_percent, updated_at
    ) VALUES (
      v_ing_id,
      v_account_id,
      v_business_id,
      v_branch_id,
      v_staff_id,
      NULLIF(p_recipe->>'updated_by_staff_id', '')::uuid,
      p_recipe->>'device_id',
      v_bom_id,
      NULLIF(v_ing->>'material_id', '')::uuid,
      COALESCE(v_ing->>'material_name', 'Material'),
      COALESCE((v_ing->>'quantity_per_batch')::numeric, 1),
      COALESCE(v_ing->>'unit', 'kg'),
      COALESCE((v_ing->>'scrap_factor_percent')::numeric, 0),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      material_id = EXCLUDED.material_id,
      material_name = EXCLUDED.material_name,
      quantity_per_batch = EXCLUDED.quantity_per_batch,
      unit = EXCLUDED.unit,
      scrap_factor_percent = EXCLUDED.scrap_factor_percent,
      deleted_at = NULL,
      updated_at = now();
  END LOOP;

  -- Soft-delete removed BOM ingredients atomically
  UPDATE public.mfg_bom_ingredients
  SET deleted_at = now(), updated_at = now()
  WHERE bom_id = v_bom_id
    AND branch_id = v_branch_id
    AND deleted_at IS NULL
    AND NOT (id = ANY(v_ing_ids));

  RETURN jsonb_build_object(
    'success', true,
    'bom_id', v_bom_id,
    'row_version', v_new_ver,
    'ingredients_count', array_length(v_ing_ids, 1)
  );
END;
$$;

-- 4B. Atomic PM CCP Payroll Batch + Slips Generation with FOR UPDATE Lock
CREATE OR REPLACE FUNCTION public.pm_generate_ccp_batch_slips_atomic(
  p_batch jsonb,
  p_slips jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id uuid := NULLIF(p_batch->>'id', '')::uuid;
  v_branch_id uuid := NULLIF(p_batch->>'branch_id', '')::uuid;
  v_account_id uuid := COALESCE(NULLIF(p_batch->>'account_id', '')::uuid, public.get_auth_account_id());
  v_business_id uuid := NULLIF(p_batch->>'business_id', '')::uuid;
  v_staff_id uuid := NULLIF(p_batch->>'staff_id', '')::uuid;
  v_slip jsonb;
  v_count int := 0;
BEGIN
  IF v_batch_id IS NULL OR v_branch_id IS NULL OR NOT public.can_access_branch(v_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.pm_payroll_batches
  WHERE id = v_batch_id AND deleted_at IS NULL
  FOR UPDATE;

  INSERT INTO public.pm_payroll_batches (
    id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
    project_id, project_title, mission_id, mission_code, batch_number,
    total_beneficiaries, total_amount_dzd, status, ccp_generated_at, updated_at
  ) VALUES (
    v_batch_id,
    v_account_id,
    v_business_id,
    v_branch_id,
    v_staff_id,
    NULLIF(p_batch->>'updated_by_staff_id', '')::uuid,
    p_batch->>'device_id',
    NULLIF(p_batch->>'project_id', '')::uuid,
    COALESCE(p_batch->>'project_title', ''),
    NULLIF(p_batch->>'mission_id', '')::uuid,
    COALESCE(p_batch->>'mission_code', ''),
    COALESCE(p_batch->>'batch_number', 'BATCH-001'),
    COALESCE((p_batch->>'total_beneficiaries')::int, 0),
    COALESCE((p_batch->>'total_amount_dzd')::numeric, 0),
    'ccp_generated',
    COALESCE(NULLIF(p_batch->>'ccp_generated_at', '')::timestamptz, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_beneficiaries = EXCLUDED.total_beneficiaries,
    total_amount_dzd = EXCLUDED.total_amount_dzd,
    status = 'ccp_generated',
    ccp_generated_at = EXCLUDED.ccp_generated_at,
    deleted_at = NULL,
    updated_at = now();

  FOR v_slip IN SELECT * FROM jsonb_array_elements(COALESCE(p_slips, '[]'::jsonb))
  LOOP
    INSERT INTO public.pm_ccp_slips (
      id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
      batch_id, talent_id, beneficiary_name, ccp_number, ccp_key, wilaya_name,
      amount_dzd, amount_in_words_fr, amount_in_words_ar, transaction_reference,
      is_printed, created_at, updated_at
    ) VALUES (
      COALESCE(NULLIF(v_slip->>'id', '')::uuid, gen_random_uuid()),
      v_account_id,
      v_business_id,
      v_branch_id,
      v_staff_id,
      NULLIF(p_batch->>'updated_by_staff_id', '')::uuid,
      p_batch->>'device_id',
      v_batch_id,
      NULLIF(v_slip->>'talent_id', '')::uuid,
      COALESCE(v_slip->>'beneficiary_name', ''),
      COALESCE(v_slip->>'ccp_number', ''),
      COALESCE(v_slip->>'ccp_key', ''),
      COALESCE(v_slip->>'wilaya_name', ''),
      COALESCE((v_slip->>'amount_dzd')::numeric, 0),
      COALESCE(v_slip->>'amount_in_words_fr', ''),
      COALESCE(v_slip->>'amount_in_words_ar', ''),
      COALESCE(v_slip->>'transaction_reference', ''),
      COALESCE((v_slip->>'is_printed')::boolean, false),
      COALESCE(NULLIF(v_slip->>'created_at', '')::timestamptz, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      beneficiary_name = EXCLUDED.beneficiary_name,
      ccp_number = EXCLUDED.ccp_number,
      ccp_key = EXCLUDED.ccp_key,
      wilaya_name = EXCLUDED.wilaya_name,
      amount_dzd = EXCLUDED.amount_dzd,
      amount_in_words_fr = EXCLUDED.amount_in_words_fr,
      amount_in_words_ar = EXCLUDED.amount_in_words_ar,
      transaction_reference = EXCLUDED.transaction_reference,
      deleted_at = NULL,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'slips_count', v_count
  );
END;
$$;

-- 4C. Atomic Batch Logistics Wilaya Tariffs Upsert with FOR UPDATE Lock
CREATE OR REPLACE FUNCTION public.logistics_upsert_wilaya_tariffs_batch(
  p_branch_id uuid,
  p_rules jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_business_id uuid;
  v_staff_id uuid := public.get_auth_staff_id();
  v_rule jsonb;
  v_count int := 0;
BEGIN
  IF p_branch_id IS NULL OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_BRANCH_ACCESS' USING ERRCODE = '42501';
  END IF;

  SELECT b.account_id, b.business_id
    INTO v_account_id, v_business_id
  FROM public.branches b
  WHERE b.id = p_branch_id
  LIMIT 1;

  -- Lock existing branch tariff rows to prevent concurrent tariff matrix drift
  PERFORM 1 FROM public.logistics_wilaya_tariffs
  WHERE branch_id = p_branch_id AND deleted_at IS NULL
  FOR UPDATE;

  FOR v_rule IN SELECT * FROM jsonb_array_elements(COALESCE(p_rules, '[]'::jsonb))
  LOOP
    INSERT INTO public.logistics_wilaya_tariffs (
      id, account_id, business_id, branch_id, staff_id, updated_by_staff_id, device_id,
      zone_id, base_weight_kg, home_base_price_dzd, stop_desk_base_price_dzd,
      overweight_per_kg_dzd, fragile_handling_surcharge_dzd, updated_at
    ) VALUES (
      COALESCE(NULLIF(v_rule->>'id', '')::uuid, gen_random_uuid()),
      COALESCE(NULLIF(v_rule->>'account_id', '')::uuid, v_account_id),
      COALESCE(NULLIF(v_rule->>'business_id', '')::uuid, v_business_id),
      p_branch_id,
      COALESCE(NULLIF(v_rule->>'staff_id', '')::uuid, v_staff_id),
      v_staff_id,
      v_rule->>'device_id',
      v_rule->>'zone_id',
      COALESCE((v_rule->>'base_weight_kg')::numeric, 5),
      COALESCE((v_rule->>'home_base_price_dzd')::numeric, 600),
      COALESCE((v_rule->>'stop_desk_base_price_dzd')::numeric, 400),
      COALESCE((v_rule->>'overweight_per_kg_dzd')::numeric, 50),
      COALESCE((v_rule->>'fragile_handling_surcharge_dzd')::numeric, 150),
      now()
    )
    ON CONFLICT (branch_id, zone_id) WHERE deleted_at IS NULL DO UPDATE SET
      base_weight_kg = EXCLUDED.base_weight_kg,
      home_base_price_dzd = EXCLUDED.home_base_price_dzd,
      stop_desk_base_price_dzd = EXCLUDED.stop_desk_base_price_dzd,
      overweight_per_kg_dzd = EXCLUDED.overweight_per_kg_dzd,
      fragile_handling_surcharge_dzd = EXCLUDED.fragile_handling_surcharge_dzd,
      updated_by_staff_id = EXCLUDED.updated_by_staff_id,
      device_id = EXCLUDED.device_id,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'branch_id', p_branch_id,
    'tariffs_upserted', v_count
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Keyset-Paginated Audit Log Viewer RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_audit_logs_page(
  p_account_id uuid,
  p_branch_id uuid DEFAULT NULL,
  p_cursor_occurred_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_table_name text DEFAULT NULL,
  p_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_acc uuid := public.get_auth_account_id();
  v_safe_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_rows jsonb;
  v_total bigint := 0;
BEGIN
  IF v_auth_acc IS NULL OR v_auth_acc <> p_account_id THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'hasMore', false, 'totalCount', 0);
  END IF;

  IF p_branch_id IS NOT NULL AND NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'hasMore', false, 'totalCount', 0);
  END IF;

  SELECT count(*) INTO v_total
  FROM public.immutable_audit_logs l
  WHERE l.account_id = p_account_id
    AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
    AND (p_table_name IS NULL OR p_table_name = '' OR l.table_name = p_table_name)
    AND (p_action IS NULL OR p_action = '' OR l.action = p_action);

  SELECT jsonb_agg(sub ORDER BY sub.occurred_at DESC, sub.id DESC) INTO v_rows
  FROM (
    SELECT
      l.id,
      l.account_id,
      l.business_id,
      l.branch_id,
      l.actor_staff_id,
      l.device_id,
      l.table_name,
      l.record_id,
      l.action,
      l.old_data,
      l.new_data,
      l.occurred_at
    FROM public.immutable_audit_logs l
    WHERE l.account_id = p_account_id
      AND (p_branch_id IS NULL OR l.branch_id = p_branch_id)
      AND (p_table_name IS NULL OR p_table_name = '' OR l.table_name = p_table_name)
      AND (p_action IS NULL OR p_action = '' OR l.action = p_action)
      AND (
        p_cursor_occurred_at IS NULL
        OR (l.occurred_at, l.id) < (p_cursor_occurred_at, COALESCE(p_cursor_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
    ORDER BY l.occurred_at DESC, l.id DESC
    LIMIT v_safe_limit + 1
  ) sub;

  RETURN jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(elem) FROM (SELECT elem FROM jsonb_array_elements(COALESCE(v_rows, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord) WHERE ord <= v_safe_limit) q), '[]'::jsonb),
    'hasMore', COALESCE(jsonb_array_length(v_rows), 0) > v_safe_limit,
    'totalCount', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mfg_upsert_bom_atomic(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfg_upsert_bom_atomic(jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.pm_generate_ccp_batch_slips_atomic(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pm_generate_ccp_batch_slips_atomic(jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.logistics_upsert_wilaya_tariffs_batch(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_upsert_wilaya_tariffs_batch(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_audit_logs_page(uuid, uuid, timestamptz, uuid, int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_logs_page(uuid, uuid, timestamptz, uuid, int, text, text) TO authenticated;

COMMIT;
