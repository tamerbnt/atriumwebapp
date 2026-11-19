-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 3: GROUP B VERTICALS (9 MISSING CATEGORIES)
-- Verticals: trading_*, medical_*, garage_*, re_*, mfg_*, legal_*,
--            logistics_*, btp_*, agri_*
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TRADING_COMMERCIAL (trading_*) — Replaces undeployed unprefixed script
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trading_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Commercial',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  name text NOT NULL,
  wilaya text,
  address text,
  manager_name text,
  capacity_pallets int NOT NULL DEFAULT 100,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_b2b_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  company_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  wilaya text,
  rc_number text,
  nif text,
  nis text,
  article_imposition text,
  credit_limit_dzd numeric(14,2) NOT NULL DEFAULT 0,
  current_balance_dzd numeric(14,2) NOT NULL DEFAULT 0,
  payment_terms text NOT NULL DEFAULT 'Comptant',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_b2b_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  supplier_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  wilaya text,
  rc_number text,
  nif text,
  nis text,
  balance_payable_dzd numeric(14,2) NOT NULL DEFAULT 0,
  lead_time_days int NOT NULL DEFAULT 7,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Wholesale',
  unit text NOT NULL DEFAULT 'U',
  purchase_price_ht numeric(12,2) NOT NULL DEFAULT 0,
  selling_price_ht numeric(12,2) NOT NULL DEFAULT 0,
  tva_rate numeric(5,2) NOT NULL DEFAULT 19,
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  min_stock_alert numeric(12,2) NOT NULL DEFAULT 10,
  depot_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_commercial_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  doc_type text NOT NULL CHECK (doc_type IN ('devis', 'commande', 'bl', 'facture', 'avoir')),
  doc_number text NOT NULL,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  client_id uuid REFERENCES public.trading_b2b_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  depot_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Draft',
  payment_method text NOT NULL DEFAULT 'Virement',
  payment_status text NOT NULL DEFAULT 'Unpaid',
  total_ht numeric(14,2) NOT NULL DEFAULT 0,
  total_tva numeric(14,2) NOT NULL DEFAULT 0,
  timbre_fiscal numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  linked_doc_id uuid,
  linked_doc_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_commercial_doc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  commercial_doc_id uuid NOT NULL REFERENCES public.trading_commercial_docs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.trading_products(id) ON DELETE SET NULL,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'U',
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price_ht numeric(12,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tva_rate numeric(5,2) NOT NULL DEFAULT 19,
  total_ht numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_purchase_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  doc_type text NOT NULL CHECK (doc_type IN ('da', 'po', 'br', 'facture_achat')),
  doc_number text NOT NULL,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  supplier_id uuid REFERENCES public.trading_b2b_suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  depot_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  depot_name text,
  status text NOT NULL DEFAULT 'Draft',
  total_ht numeric(14,2) NOT NULL DEFAULT 0,
  total_tva numeric(14,2) NOT NULL DEFAULT 0,
  total_ttc numeric(14,2) NOT NULL DEFAULT 0,
  linked_po_id uuid,
  linked_po_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_purchase_doc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  purchase_doc_id uuid NOT NULL REFERENCES public.trading_purchase_docs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.trading_products(id) ON DELETE SET NULL,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'U',
  ordered_qty numeric(12,2) NOT NULL DEFAULT 1,
  received_qty numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost_ht numeric(12,2) NOT NULL DEFAULT 0,
  total_ht numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_stock_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  voucher_number text NOT NULL,
  voucher_type text NOT NULL CHECK (voucher_type IN ('entree', 'sortie', 'transfert', 'inventaire')),
  voucher_date date NOT NULL DEFAULT CURRENT_DATE,
  depot_source_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  depot_source_name text,
  depot_dest_id uuid REFERENCES public.trading_warehouses(id) ON DELETE SET NULL,
  depot_dest_name text,
  reason text NOT NULL,
  operator_name text,
  total_valuation_dzd numeric(14,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trading_stock_voucher_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  voucher_id uuid NOT NULL REFERENCES public.trading_stock_vouchers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.trading_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'U',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 2. MEDICAL_CLINIC (medical_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medical_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  specialty text NOT NULL,
  cnom_license text,
  consultation_fee_dzd numeric(12,2) NOT NULL DEFAULT 2500,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  code text,
  head_doctor_name text,
  room_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  file_number text NOT NULL,
  full_name text NOT NULL,
  birth_date date,
  gender text NOT NULL DEFAULT 'Female',
  blood_group text,
  phone text,
  email text,
  chifa_card_number text,
  allergies text,
  chronic_conditions text,
  emergency_contact text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  patient_id uuid REFERENCES public.medical_patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_phone text,
  doctor_id uuid REFERENCES public.medical_staff(id) ON DELETE SET NULL,
  doctor_name text NOT NULL,
  department_name text,
  appointment_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  reason text,
  triage_priority text NOT NULL DEFAULT 'Normal' CHECK (triage_priority IN ('Normal', 'Urgent', 'Emergency')),
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'WaitingRoom', 'InConsultation', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  patient_id uuid REFERENCES public.medical_patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  doctor_id uuid REFERENCES public.medical_staff(id) ON DELETE SET NULL,
  doctor_name text NOT NULL,
  appointment_id uuid REFERENCES public.medical_appointments(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  chief_complaint text,
  diagnosis text,
  icd10_code text,
  prescription_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  medical_acts jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_consumables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Consumable',
  unit text NOT NULL DEFAULT 'Boite',
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  min_stock_alert numeric(12,2) NOT NULL DEFAULT 10,
  expiry_date date,
  lot_number text,
  unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  invoice_number text NOT NULL,
  patient_id uuid REFERENCES public.medical_patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  consultation_id uuid REFERENCES public.medical_consultations(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  cnas_coverage_dzd numeric(12,2) NOT NULL DEFAULT 0,
  patient_due_dzd numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  status text NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 3. AUTO_GARAGE (garage_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.garage_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  specialty text NOT NULL DEFAULT 'Mécanique',
  hourly_labor_rate_dzd numeric(12,2) NOT NULL DEFAULT 2000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_bays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  bay_code text NOT NULL,
  name text NOT NULL,
  bay_type text NOT NULL DEFAULT 'Pont Élévateur',
  status text NOT NULL DEFAULT 'Free' CHECK (status IN ('Free', 'Occupied', 'Maintenance')),
  active_work_order_id uuid,
  assigned_mechanic_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  plate_number text NOT NULL,
  vin text,
  make text NOT NULL,
  model text NOT NULL,
  model_year int,
  fuel_type text DEFAULT 'Essence',
  mileage_km int NOT NULL DEFAULT 0,
  owner_name text NOT NULL,
  owner_phone text,
  fleet_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  order_number text NOT NULL,
  vehicle_id uuid REFERENCES public.garage_vehicles(id) ON DELETE SET NULL,
  plate_number text NOT NULL,
  vehicle_label text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  bay_id uuid REFERENCES public.garage_bays(id) ON DELETE SET NULL,
  mechanic_name text,
  intake_mileage_km int NOT NULL DEFAULT 0,
  diagnostic_summary text,
  status text NOT NULL DEFAULT 'Intake' CHECK (status IN ('Intake', 'Diagnosing', 'WaitingParts', 'InProgress', 'QualityCheck', 'Ready', 'Delivered')),
  labor_total_dzd numeric(12,2) NOT NULL DEFAULT 0,
  parts_total_dzd numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc_dzd numeric(12,2) NOT NULL DEFAULT 0,
  promised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  work_order_id uuid NOT NULL REFERENCES public.garage_work_orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('labor', 'part', 'diagnostic')),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  total_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  part_number text NOT NULL,
  name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Pièces Moteur',
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  min_stock numeric(12,2) NOT NULL DEFAULT 2,
  cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  sell_price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  bin_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_part_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  work_order_id uuid NOT NULL REFERENCES public.garage_work_orders(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.garage_parts(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Requested', 'Issued', 'Returned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  phone text,
  wilaya text,
  specialty text,
  balance_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES public.garage_suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_dzd numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Ordered' CHECK (status IN ('Draft', 'Ordered', 'Received', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_fleet_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  company_name text NOT NULL,
  contact_name text,
  phone text,
  vehicles_count int NOT NULL DEFAULT 1,
  discount_percent numeric(5,2) NOT NULL DEFAULT 10,
  monthly_retainer_dzd numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.garage_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  invoice_number text NOT NULL,
  work_order_id uuid REFERENCES public.garage_work_orders(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  plate_number text,
  total_ht_dzd numeric(12,2) NOT NULL DEFAULT 0,
  tva_dzd numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc_dzd numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  status text NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 4. REAL_ESTATE (re_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.re_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Agent',
  commission_split_percent numeric(5,2) NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  reference_code text NOT NULL,
  title text NOT NULL,
  property_type text NOT NULL DEFAULT 'Appartement',
  transaction_type text NOT NULL DEFAULT 'Location' CHECK (transaction_type IN ('Vente', 'Location', 'Saisonnier')),
  wilaya text NOT NULL DEFAULT '16 Alger',
  commune text,
  address text,
  surface_sqm numeric(10,2) NOT NULL DEFAULT 0,
  rooms int NOT NULL DEFAULT 3,
  asking_price_dzd numeric(16,2) NOT NULL DEFAULT 0,
  monthly_rent_dzd numeric(14,2) NOT NULL DEFAULT 0,
  owner_name text,
  owner_phone text,
  status text NOT NULL DEFAULT 'Disponible',
  legal_act_type text DEFAULT 'Acte Notarié',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  client_type text NOT NULL DEFAULT 'Buyer' CHECK (client_type IN ('Buyer', 'Tenant', 'Landlord', 'Investor')),
  phone text,
  email text,
  nin text,
  budget_dzd numeric(16,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'Ouedkniss',
  interest_type text NOT NULL DEFAULT 'Achat',
  preferred_wilaya text,
  budget_dzd numeric(16,2) NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'New' CHECK (stage IN ('New', 'Contacted', 'Qualified', 'VisitBooked', 'Negotiation', 'ClosedWon', 'Lost')),
  assigned_agent_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  agent_name text,
  visit_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'NoShow')),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  mandate_number text NOT NULL,
  property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  owner_name text NOT NULL,
  mandate_type text NOT NULL DEFAULT 'Exclusif' CHECK (mandate_type IN ('Exclusif', 'Simple', 'GestionLocative')),
  commission_percent numeric(5,2) NOT NULL DEFAULT 2.5,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  lease_number text NOT NULL,
  property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  tenant_name text NOT NULL,
  tenant_phone text,
  monthly_rent_dzd numeric(14,2) NOT NULL DEFAULT 0,
  security_deposit_dzd numeric(14,2) NOT NULL DEFAULT 0,
  agency_fee_dzd numeric(14,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Renewed', 'Terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_rent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  lease_id uuid NOT NULL REFERENCES public.re_leases(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  due_date date NOT NULL,
  amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Due' CHECK (status IN ('Due', 'Partial', 'Paid', 'Overdue')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  lease_id uuid REFERENCES public.re_leases(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  inspection_type text NOT NULL CHECK (inspection_type IN ('Entrée', 'Sortie', 'Périodique')),
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspector_name text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_condition text NOT NULL DEFAULT 'Bon',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_owner_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  owner_name text NOT NULL,
  property_title text,
  entry_type text NOT NULL CHECK (entry_type IN ('RentCredit', 'AgencyFee', 'MaintenanceDebit', 'Payout')),
  amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.re_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  property_id uuid REFERENCES public.re_properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  buyer_name text NOT NULL,
  seller_name text NOT NULL,
  sale_price_dzd numeric(16,2) NOT NULL DEFAULT 0,
  commission_dzd numeric(14,2) NOT NULL DEFAULT 0,
  notary_name text,
  stage text NOT NULL DEFAULT 'Promesse' CHECK (stage IN ('Promesse', 'Notaire', 'Enregistrement', 'Finalisé')),
  closing_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 5. MANUFACTURING_PRODUCTION (mfg_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mfg_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Opérateur',
  shift text NOT NULL DEFAULT 'Matin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_workstations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL DEFAULT 'Assemblage',
  hourly_cost_dzd numeric(12,2) NOT NULL DEFAULT 1500,
  status text NOT NULL DEFAULT 'Idle' CHECK (status IN ('Idle', 'Running', 'Setup', 'Maintenance')),
  current_order_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sku text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  stock_quantity numeric(14,3) NOT NULL DEFAULT 0,
  min_stock_alert numeric(14,3) NOT NULL DEFAULT 20,
  unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  supplier_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_bom_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  code text NOT NULL,
  finished_product_name text NOT NULL,
  output_unit text NOT NULL DEFAULT 'U',
  batch_size numeric(12,2) NOT NULL DEFAULT 1,
  estimated_unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  standard_cycle_minutes int NOT NULL DEFAULT 30,
  version text NOT NULL DEFAULT 'v1.0',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_bom_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  bom_id uuid NOT NULL REFERENCES public.mfg_bom_recipes(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.mfg_raw_materials(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  quantity_per_batch numeric(12,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'kg',
  scrap_factor_percent numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  of_number text NOT NULL,
  bom_id uuid REFERENCES public.mfg_bom_recipes(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  target_quantity numeric(12,2) NOT NULL DEFAULT 1,
  produced_quantity numeric(12,2) NOT NULL DEFAULT 0,
  scrap_quantity numeric(12,2) NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Released', 'InProgress', 'QualityHold', 'Completed', 'Cancelled')),
  due_date date,
  workstation_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_workstation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  workstation_id uuid REFERENCES public.mfg_workstations(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  operator_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  good_units numeric(12,2) NOT NULL DEFAULT 0,
  scrap_units numeric(12,2) NOT NULL DEFAULT 0,
  downtime_minutes int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  of_number text NOT NULL,
  inspector_name text NOT NULL,
  sample_size int NOT NULL DEFAULT 10,
  defects_found int NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'Pass' CHECK (result IN ('Pass', 'Conditional', 'Fail')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.mfg_material_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  voucher_number text NOT NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.mfg_raw_materials(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  voucher_type text NOT NULL CHECK (voucher_type IN ('consumption', 'return', 'restock')),
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  operator_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.mfg_material_vouchers ALTER COLUMN material_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.mfg_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  lot_number text NOT NULL,
  order_id uuid REFERENCES public.mfg_orders(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  produced_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  qc_status text NOT NULL DEFAULT 'Approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 6. LEGAL_ACCOUNTING (legal_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.legal_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  title text NOT NULL DEFAULT 'Avocat',
  bar_number text,
  hourly_rate_dzd numeric(12,2) NOT NULL DEFAULT 8000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  client_kind text NOT NULL DEFAULT 'Individual' CHECK (client_kind IN ('Individual', 'Corporate')),
  phone text,
  email text,
  nif text,
  rc_number text,
  address text,
  escrow_balance_dzd numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_number text NOT NULL,
  title text NOT NULL,
  practice_area text NOT NULL DEFAULT 'Droit des Affaires',
  jurisdiction text,
  court_case_number text,
  client_id uuid REFERENCES public.legal_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  opposing_party text,
  lead_counsel_name text,
  fee_model text NOT NULL DEFAULT 'Forfait' CHECK (fee_model IN ('Forfait', 'Horaire', 'Abonnement', 'Résultat')),
  agreed_fee_dzd numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Instruction', 'Hearing', 'Deliberation', 'Appeal', 'Closed', 'Archived')),
  opened_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid NOT NULL REFERENCES public.legal_matters(id) ON DELETE CASCADE,
  matter_title text NOT NULL,
  court_name text NOT NULL,
  chamber text,
  hearing_at timestamptz NOT NULL,
  counsel_name text,
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Postponed', 'Held', 'JudgmentRendered')),
  outcome_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid NOT NULL REFERENCES public.legal_matters(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline_type text NOT NULL DEFAULT 'Appel' CHECK (deadline_type IN ('Appel', 'Cassation', 'FiscalG50', 'CNAS', 'DepotMemoire', 'Autre')),
  due_date date NOT NULL,
  is_forclusion_critical boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  counsel_name text NOT NULL,
  description text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  hourly_rate_dzd numeric(12,2) NOT NULL DEFAULT 8000,
  is_billable boolean NOT NULL DEFAULT true,
  is_billed boolean NOT NULL DEFAULT false,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.legal_time_entries ALTER COLUMN matter_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.legal_escrow_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  client_id uuid NOT NULL REFERENCES public.legal_clients(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'fee_transfer')),
  amount_dzd numeric(14,2) NOT NULL CHECK (amount_dzd > 0),
  reference text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid NOT NULL REFERENCES public.legal_matters(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'Timbre & Enregistrement',
  amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  is_rebilled boolean NOT NULL DEFAULT false,
  incurred_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  invoice_number text NOT NULL,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.legal_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  fees_ht_dzd numeric(14,2) NOT NULL DEFAULT 0,
  disbursements_dzd numeric(14,2) NOT NULL DEFAULT 0,
  tva_dzd numeric(14,2) NOT NULL DEFAULT 0,
  total_ttc_dzd numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Sent' CHECK (status IN ('Draft', 'Sent', 'Partial', 'Paid')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_cash_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  receipt_number text NOT NULL,
  invoice_id uuid REFERENCES public.legal_invoices(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  matter_id uuid REFERENCES public.legal_matters(id) ON DELETE SET NULL,
  title text NOT NULL,
  doc_category text NOT NULL DEFAULT 'Acte',
  file_url text,
  confidentiality_level text NOT NULL DEFAULT 'Confidential',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.legal_documents ALTER COLUMN matter_id DROP NOT NULL;

-- ============================================================================
-- 7. LOGISTICS_DELIVERY (logistics_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.logistics_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Dispatcher',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_fleet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  plate_number text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'Fourgon',
  capacity_kg numeric(10,2) NOT NULL DEFAULT 1500,
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'OnRoute', 'Maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  phone text NOT NULL,
  assigned_wilaya text,
  vehicle_id uuid REFERENCES public.logistics_fleet(id) ON DELETE SET NULL,
  cash_on_hand_dzd numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_wilaya_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  zone_id text NOT NULL,
  base_weight_kg numeric(6,2) NOT NULL DEFAULT 5,
  home_base_price_dzd numeric(10,2) NOT NULL DEFAULT 600,
  stop_desk_base_price_dzd numeric(10,2) NOT NULL DEFAULT 400,
  overweight_per_kg_dzd numeric(10,2) NOT NULL DEFAULT 50,
  fragile_handling_surcharge_dzd numeric(10,2) NOT NULL DEFAULT 150,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (branch_id, zone_id)
);

CREATE TABLE IF NOT EXISTS public.logistics_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  store_name text NOT NULL,
  contact_name text,
  phone text NOT NULL,
  rib_ccp text,
  cod_fee_percent numeric(5,2) NOT NULL DEFAULT 1.5,
  pending_cod_balance_dzd numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_courier_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  bag_code text NOT NULL,
  seal_number text,
  origin_hub text NOT NULL,
  destination_wilaya text NOT NULL,
  driver_id uuid REFERENCES public.logistics_drivers(id) ON DELETE SET NULL,
  driver_name text,
  parcel_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Sealed', 'InTransit', 'Discharged')),
  sealed_at timestamptz,
  discharged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  tracking_code text NOT NULL,
  merchant_id uuid REFERENCES public.logistics_merchants(id) ON DELETE SET NULL,
  merchant_name text NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  wilaya_code text NOT NULL,
  wilaya_name text NOT NULL,
  commune text,
  delivery_mode text NOT NULL DEFAULT 'Domicile' CHECK (delivery_mode IN ('Domicile', 'StopDesk')),
  weight_kg numeric(8,2) NOT NULL DEFAULT 1,
  is_fragile boolean NOT NULL DEFAULT false,
  cod_amount_dzd numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee_dzd numeric(12,2) NOT NULL DEFAULT 0,
  bag_id uuid REFERENCES public.logistics_courier_bags(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.logistics_drivers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Created' CHECK (status IN ('Created', 'PickedUp', 'InHub', 'InTransit', 'OutForDelivery', 'Delivered', 'Returned', 'Cancelled')),
  is_cod_remitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_parcel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  parcel_id uuid NOT NULL REFERENCES public.logistics_parcels(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  remittance_number text NOT NULL,
  merchant_id uuid NOT NULL REFERENCES public.logistics_merchants(id) ON DELETE CASCADE,
  merchant_name text NOT NULL,
  gross_cod_dzd numeric(14,2) NOT NULL DEFAULT 0,
  fees_deducted_dzd numeric(14,2) NOT NULL DEFAULT 0,
  net_paid_dzd numeric(14,2) NOT NULL DEFAULT 0,
  parcel_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text NOT NULL DEFAULT 'Virement CCP/BaridiMob',
  status text NOT NULL DEFAULT 'Paid',
  remitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_discharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  discharge_number text NOT NULL,
  driver_id uuid NOT NULL REFERENCES public.logistics_drivers(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  bag_id uuid REFERENCES public.logistics_courier_bags(id) ON DELETE SET NULL,
  collected_cash_dzd numeric(14,2) NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  returned_count int NOT NULL DEFAULT 0,
  discharged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.logistics_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  parcel_id uuid REFERENCES public.logistics_parcels(id) ON DELETE SET NULL,
  tracking_code text,
  subject text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Investigating', 'Resolved', 'Closed')),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 8. CONSTRUCTION_CONTRACTOR (btp_*)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.btp_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Chef de Chantier',
  qualification_level text,
  daily_rate_dzd numeric(12,2) NOT NULL DEFAULT 4000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_code text NOT NULL,
  title text NOT NULL,
  client_name text NOT NULL,
  wilaya text,
  location text,
  contract_amount_ht_dzd numeric(16,2) NOT NULL DEFAULT 0,
  retention_guarantee_percent numeric(5,2) NOT NULL DEFAULT 5,
  advance_forfaitaire_percent numeric(5,2) NOT NULL DEFAULT 15,
  progress_percent numeric(5,2) NOT NULL DEFAULT 0,
  start_date date,
  expected_end_date date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Tendering', 'Active', 'Suspended', 'ProvisionalReception', 'FinalReception')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_boq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.btp_projects(id) ON DELETE CASCADE,
  lot_code text NOT NULL,
  designation text NOT NULL,
  unit text NOT NULL DEFAULT 'm3',
  contract_qty numeric(14,3) NOT NULL DEFAULT 0,
  executed_qty numeric(14,3) NOT NULL DEFAULT 0,
  unit_price_dzd numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_decomptes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.btp_projects(id) ON DELETE CASCADE,
  situation_number int NOT NULL DEFAULT 1,
  period_label text NOT NULL,
  gross_cumulative_dzd numeric(16,2) NOT NULL DEFAULT 0,
  previous_cumulative_dzd numeric(16,2) NOT NULL DEFAULT 0,
  period_gross_dzd numeric(16,2) NOT NULL DEFAULT 0,
  retention_deducted_dzd numeric(16,2) NOT NULL DEFAULT 0,
  price_revision_dzd numeric(16,2) NOT NULL DEFAULT 0,
  net_payable_ttc_dzd numeric(16,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Certified', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  company_name text NOT NULL,
  specialty text NOT NULL,
  phone text,
  nif text,
  rc_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_subcontract_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.btp_projects(id) ON DELETE CASCADE,
  subcontractor_id uuid NOT NULL REFERENCES public.btp_subcontractors(id) ON DELETE CASCADE,
  claim_number text NOT NULL,
  amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Verified', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.btp_projects(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weather text DEFAULT 'Ensoleillé',
  workers_count int NOT NULL DEFAULT 0,
  activities_summary text NOT NULL,
  incidents_noted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid REFERENCES public.btp_projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'Tonne',
  stock_quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  asset_code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Engin',
  assigned_project_id uuid REFERENCES public.btp_projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'OnSite', 'Maintenance')),
  hourly_rate_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  project_id uuid NOT NULL REFERENCES public.btp_projects(id) ON DELETE CASCADE,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  severity text NOT NULL DEFAULT 'Minor' CHECK (severity IN ('NearMiss', 'Minor', 'Major', 'Critical')),
  description text NOT NULL,
  corrective_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.btp_cacobatph_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  period_label text NOT NULL,
  workers_declared int NOT NULL DEFAULT 0,
  total_taxable_payroll_dzd numeric(14,2) NOT NULL DEFAULT 0,
  contribution_due_dzd numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Filed', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 9. AGRICULTURE_FARMING (agri_*) + DAR & Antibiotic Withholding Guards
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agri_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by_staff_id uuid,
  device_id text,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Agronome',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  parcel_code text NOT NULL,
  name text NOT NULL,
  surface_hectares numeric(10,3) NOT NULL DEFAULT 1,
  soil_type text DEFAULT 'Argilo-Limoneux',
  irrigation_mode text DEFAULT 'Goutte-à-goutte',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_crop_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  parcel_id uuid NOT NULL REFERENCES public.agri_parcels(id) ON DELETE CASCADE,
  parcel_name text NOT NULL,
  crop_name text NOT NULL,
  variety text,
  sowing_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_harvest_date date,
  stage text NOT NULL DEFAULT 'Sown' CHECK (stage IN ('Planned', 'Sown', 'Vegetative', 'Flowering', 'Harvesting', 'Closed')),
  estimated_yield_tons numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_livestock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  ear_tag text NOT NULL,
  species text NOT NULL DEFAULT 'Bovin Laitier',
  breed text,
  birth_date date,
  gender text NOT NULL DEFAULT 'Female',
  weight_kg numeric(8,2) NOT NULL DEFAULT 0,
  health_status text NOT NULL DEFAULT 'Healthy' CHECK (health_status IN ('Healthy', 'UnderTreatment', 'Quarantine', 'Sold')),
  antibiotic_withholding_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_milking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  animal_id uuid REFERENCES public.agri_livestock(id) ON DELETE SET NULL,
  lot_label text NOT NULL,
  milking_date date NOT NULL DEFAULT CURRENT_DATE,
  session_period text NOT NULL DEFAULT 'Matin' CHECK (session_period IN ('Matin', 'Soir')),
  volume_liters numeric(10,2) NOT NULL DEFAULT 0,
  fat_rate_percent numeric(4,2),
  is_tank_approved boolean NOT NULL DEFAULT true,
  is_discarded boolean NOT NULL DEFAULT false,
  onil_bordereau_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  target_type text NOT NULL CHECK (target_type IN ('crop', 'livestock')),
  parcel_id uuid REFERENCES public.agri_parcels(id) ON DELETE SET NULL,
  animal_id uuid REFERENCES public.agri_livestock(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  active_ingredient text,
  dosage text,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  dar_days int NOT NULL DEFAULT 0,
  withholding_until_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  parcel_id uuid NOT NULL REFERENCES public.agri_parcels(id) ON DELETE CASCADE,
  crop_cycle_id uuid REFERENCES public.agri_crop_cycles(id) ON DELETE SET NULL,
  crop_name text NOT NULL,
  harvest_date date NOT NULL DEFAULT CURRENT_DATE,
  gross_weight_kg numeric(12,2) NOT NULL DEFAULT 0,
  net_weight_kg numeric(12,2) NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'Extra',
  weighbridge_ticket_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_cold_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  chamber_code text NOT NULL,
  name text NOT NULL,
  target_temp_c numeric(5,2) NOT NULL DEFAULT 4.0,
  current_temp_c numeric(5,2) NOT NULL DEFAULT 4.0,
  humidity_percent numeric(5,2) NOT NULL DEFAULT 85,
  capacity_tons numeric(10,2) NOT NULL DEFAULT 50,
  occupied_tons numeric(10,2) NOT NULL DEFAULT 0,
  stored_product text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Engrais',
  unit text NOT NULL DEFAULT 'kg',
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost_dzd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.agri_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid,
  updated_by_staff_id uuid,
  device_id text,
  sale_number text NOT NULL,
  buyer_name text NOT NULL,
  product_description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  unit_price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  total_amount_dzd numeric(14,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Paid',
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Paid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.agri_sales
  ADD COLUMN IF NOT EXISTS unit_price_dzd numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Paid';

-- ============================================================================
-- 10. Group B Indexes, Traceability + Audit Triggers & InitPlan RLS
-- ============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    -- Trading
    'trading_staff', 'trading_warehouses', 'trading_b2b_clients', 'trading_b2b_suppliers',
    'trading_products', 'trading_commercial_docs', 'trading_commercial_doc_items',
    'trading_purchase_docs', 'trading_purchase_doc_items', 'trading_stock_vouchers', 'trading_stock_voucher_items',
    -- Medical
    'medical_staff', 'medical_departments', 'medical_patients', 'medical_appointments',
    'medical_consultations', 'medical_consumables', 'medical_invoices',
    -- Garage
    'garage_staff', 'garage_bays', 'garage_vehicles', 'garage_work_orders',
    'garage_work_order_items', 'garage_parts', 'garage_part_requisitions',
    'garage_suppliers', 'garage_purchase_orders', 'garage_fleet_contracts', 'garage_invoices',
    -- Real Estate
    're_staff', 're_properties', 're_clients', 're_leads', 're_visits',
    're_mandates', 're_leases', 're_rent_schedules', 're_inspections', 're_owner_ledger', 're_sales',
    -- Manufacturing
    'mfg_staff', 'mfg_workstations', 'mfg_raw_materials', 'mfg_bom_recipes',
    'mfg_bom_ingredients', 'mfg_orders', 'mfg_workstation_logs', 'mfg_qc_inspections',
    'mfg_material_vouchers', 'mfg_batches',
    -- Legal
    'legal_staff', 'legal_clients', 'legal_matters', 'legal_hearings', 'legal_deadlines',
    'legal_time_entries', 'legal_escrow_movements', 'legal_disbursements', 'legal_invoices',
    'legal_cash_receipts', 'legal_documents',
    -- Logistics
    'logistics_staff', 'logistics_fleet', 'logistics_drivers', 'logistics_wilaya_tariffs',
    'logistics_merchants', 'logistics_courier_bags', 'logistics_parcels', 'logistics_parcel_events',
    'logistics_remittances', 'logistics_discharges', 'logistics_tickets',
    -- Construction
    'btp_staff', 'btp_projects', 'btp_boq_items', 'btp_decomptes', 'btp_subcontractors',
    'btp_subcontract_claims', 'btp_daily_logs', 'btp_materials', 'btp_equipment',
    'btp_safety_incidents', 'btp_cacobatph_dossiers',
    -- Agriculture
    'agri_staff', 'agri_parcels', 'agri_crop_cycles', 'agri_livestock', 'agri_milking_logs',
    'agri_treatments', 'agri_harvests', 'agri_cold_storage', 'agri_stock_items', 'agri_sales'
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
    EXECUTE format(
      'CREATE POLICY "%I_tenant_isolated" ON public.%I FOR ALL TO authenticated USING (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id) AND deleted_at IS NULL) WITH CHECK (account_id = (SELECT public.get_auth_account_id()) AND public.can_access_branch(branch_id));',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- 11. Group B Transactional RPCs & Compliance Validation Triggers
-- ============================================================================

-- Trading: Convert commercial doc (Devis -> BC -> BL -> Facture)
CREATE OR REPLACE FUNCTION public.trading_convert_commercial_doc(
  p_source_doc_id uuid,
  p_target_type text,
  p_new_doc_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src record;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_src FROM public.trading_commercial_docs WHERE id = p_source_doc_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_src.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'DOC_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  INSERT INTO public.trading_commercial_docs (
    account_id, business_id, branch_id, staff_id,
    doc_type, doc_number, doc_date, client_id, client_name, depot_id,
    status, payment_method, payment_status,
    total_ht, total_tva, timbre_fiscal, total_ttc, paid_amount,
    linked_doc_id, linked_doc_number, items, notes
  ) VALUES (
    v_src.account_id, v_src.business_id, v_src.branch_id, public.get_auth_staff_id(),
    p_target_type, p_new_doc_number, CURRENT_DATE, v_src.client_id, v_src.client_name, v_src.depot_id,
    CASE WHEN p_target_type = 'bl' THEN 'Delivered' WHEN p_target_type = 'facture' THEN 'Validated' ELSE 'Draft' END,
    v_src.payment_method, 'Unpaid',
    v_src.total_ht, v_src.total_tva, v_src.timbre_fiscal, v_src.total_ttc, 0,
    v_src.id, v_src.doc_number, v_src.items, v_src.notes
  ) RETURNING id INTO v_new_id;

  UPDATE public.trading_commercial_docs
  SET status = CASE WHEN p_target_type = 'bl' THEN 'Delivered' ELSE 'Validated' END,
      updated_at = now()
  WHERE id = v_src.id;

  RETURN jsonb_build_object('success', true, 'newDocId', v_new_id);
END;
$$;

-- Garage: Assign & Release Bay
CREATE OR REPLACE FUNCTION public.garage_assign_bay(
  p_bay_id uuid,
  p_work_order_id uuid,
  p_mechanic_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bay record;
BEGIN
  SELECT * INTO v_bay FROM public.garage_bays WHERE id = p_bay_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_bay.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAY_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  UPDATE public.garage_bays
  SET status = 'Occupied',
      active_work_order_id = p_work_order_id,
      assigned_mechanic_name = p_mechanic_name,
      updated_at = now()
  WHERE id = v_bay.id;

  UPDATE public.garage_work_orders
  SET bay_id = v_bay.id,
      mechanic_name = p_mechanic_name,
      status = 'InProgress',
      updated_at = now()
  WHERE id = p_work_order_id AND branch_id = v_bay.branch_id AND deleted_at IS NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.garage_release_bay(p_bay_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bay record;
BEGIN
  SELECT * INTO v_bay FROM public.garage_bays WHERE id = p_bay_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_bay.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAY_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  UPDATE public.garage_bays
  SET status = 'Free',
      active_work_order_id = NULL,
      assigned_mechanic_name = NULL,
      updated_at = now()
  WHERE id = v_bay.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Garage: Atomic Part Requisition (deducts stock + adds item to work order)
CREATE OR REPLACE FUNCTION public.garage_requisition_part(
  p_work_order_id uuid,
  p_part_id uuid,
  p_quantity numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo record;
  v_part record;
  v_line_total numeric;
BEGIN
  SELECT * INTO v_wo FROM public.garage_work_orders WHERE id = p_work_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_wo.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'WORK_ORDER_NOT_FOUND');
  END IF;

  SELECT * INTO v_part FROM public.garage_parts WHERE id = p_part_id AND branch_id = v_wo.branch_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PART_NOT_FOUND');
  END IF;

  IF v_part.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_PART_STOCK');
  END IF;

  v_line_total := p_quantity * v_part.sell_price_dzd;

  UPDATE public.garage_parts
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = now()
  WHERE id = v_part.id;

  INSERT INTO public.garage_part_requisitions (
    account_id, business_id, branch_id, staff_id,
    work_order_id, part_id, part_name, quantity, unit_price_dzd, status
  ) VALUES (
    v_wo.account_id, v_wo.business_id, v_wo.branch_id, public.get_auth_staff_id(),
    v_wo.id, v_part.id, v_part.name, p_quantity, v_part.sell_price_dzd, 'Issued'
  );

  INSERT INTO public.garage_work_order_items (
    account_id, business_id, branch_id, staff_id,
    work_order_id, item_type, description, quantity, unit_price_dzd, total_dzd
  ) VALUES (
    v_wo.account_id, v_wo.business_id, v_wo.branch_id, public.get_auth_staff_id(),
    v_wo.id, 'part', v_part.name, p_quantity, v_part.sell_price_dzd, v_line_total
  );

  UPDATE public.garage_work_orders
  SET parts_total_dzd = parts_total_dzd + v_line_total,
      total_ttc_dzd = labor_total_dzd + parts_total_dzd + v_line_total,
      updated_at = now()
  WHERE id = v_wo.id;

  RETURN jsonb_build_object('success', true, 'newStock', v_part.stock_quantity - p_quantity);
END;
$$;

-- Manufacturing: Atomic Material Voucher Processing
CREATE OR REPLACE FUNCTION public.mfg_process_material_voucher(
  p_branch_id uuid,
  p_voucher_number text,
  p_order_id uuid,
  p_material_id uuid,
  p_voucher_type text,
  p_quantity numeric,
  p_operator_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mat record;
  v_new_qty numeric;
  v_voucher_id uuid;
BEGIN
  IF NOT public.can_access_branch(p_branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_ACCESS_DENIED');
  END IF;

  SELECT * INTO v_mat FROM public.mfg_raw_materials
  WHERE id = p_material_id AND branch_id = p_branch_id AND deleted_at IS NULL FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MATERIAL_NOT_FOUND');
  END IF;

  v_new_qty := CASE
    WHEN p_voucher_type = 'consumption' THEN GREATEST(0, v_mat.stock_quantity - p_quantity)
    ELSE v_mat.stock_quantity + p_quantity
  END;

  UPDATE public.mfg_raw_materials
  SET stock_quantity = v_new_qty, updated_at = now()
  WHERE id = v_mat.id;

  INSERT INTO public.mfg_material_vouchers (
    account_id, business_id, branch_id, staff_id,
    voucher_number, order_id, material_id, material_name,
    voucher_type, quantity, operator_name, notes
  ) VALUES (
    v_mat.account_id, v_mat.business_id, p_branch_id, public.get_auth_staff_id(),
    p_voucher_number, p_order_id, v_mat.id, v_mat.name,
    p_voucher_type, p_quantity, p_operator_name, p_notes
  ) RETURNING id INTO v_voucher_id;

  RETURN jsonb_build_object('success', true, 'voucherId', v_voucher_id, 'newStock', v_new_qty);
END;
$$;

-- Legal: Atomic Escrow Movement (CARPA)
CREATE OR REPLACE FUNCTION public.legal_escrow_movement(
  p_client_id uuid,
  p_matter_id uuid,
  p_movement_type text,
  p_amount_dzd numeric,
  p_reference text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client record;
  v_new_bal numeric;
  v_mov_id uuid;
BEGIN
  SELECT * INTO v_client FROM public.legal_clients WHERE id = p_client_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_client.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'CLIENT_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  IF p_movement_type IN ('withdrawal', 'fee_transfer') AND v_client.escrow_balance_dzd < p_amount_dzd THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_ESCROW_BALANCE');
  END IF;

  v_new_bal := CASE
    WHEN p_movement_type = 'deposit' THEN v_client.escrow_balance_dzd + p_amount_dzd
    ELSE v_client.escrow_balance_dzd - p_amount_dzd
  END;

  UPDATE public.legal_clients SET escrow_balance_dzd = v_new_bal, updated_at = now() WHERE id = v_client.id;

  INSERT INTO public.legal_escrow_movements (
    account_id, business_id, branch_id, staff_id,
    client_id, matter_id, movement_type, amount_dzd, reference, notes
  ) VALUES (
    v_client.account_id, v_client.business_id, v_client.branch_id, public.get_auth_staff_id(),
    v_client.id, p_matter_id, p_movement_type, p_amount_dzd, p_reference, p_notes
  ) RETURNING id INTO v_mov_id;

  RETURN jsonb_build_object('success', true, 'movementId', v_mov_id, 'newBalanceDzd', v_new_bal);
END;
$$;

-- Logistics: Seal Courier Bag & Execute COD Remittance
CREATE OR REPLACE FUNCTION public.logistics_seal_bag(
  p_bag_id uuid,
  p_seal_number text,
  p_parcel_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bag record;
  v_count int;
BEGIN
  SELECT * INTO v_bag FROM public.logistics_courier_bags WHERE id = p_bag_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_branch(v_bag.branch_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'BAG_NOT_FOUND_OR_UNAUTHORIZED');
  END IF;

  UPDATE public.logistics_parcels
  SET bag_id = v_bag.id,
      status = 'InTransit',
      updated_at = now()
  WHERE id = ANY(p_parcel_ids)
    AND branch_id = v_bag.branch_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.logistics_courier_bags
  SET seal_number = p_seal_number,
      parcel_count = v_count,
      status = 'Sealed',
      sealed_at = now(),
      updated_at = now()
  WHERE id = v_bag.id;

  RETURN jsonb_build_object('success', true, 'parcelCount', v_count);
END;
$$;

-- Agriculture: DAR (Délai Avant Récolte) & Antibiotic Milk Withholding Enforcement
CREATE OR REPLACE FUNCTION public.fn_agri_validate_treatment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.withholding_until_date := NEW.application_date + GREATEST(0, COALESCE(NEW.dar_days, 0));

  IF NEW.target_type = 'livestock' AND NEW.animal_id IS NOT NULL AND NEW.dar_days > 0 THEN
    UPDATE public.agri_livestock
    SET health_status = 'UnderTreatment',
        antibiotic_withholding_until = GREATEST(
          COALESCE(antibiotic_withholding_until, NEW.withholding_until_date),
          NEW.withholding_until_date
        ),
        updated_at = now()
    WHERE id = NEW.animal_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agri_treatment_dar ON public.agri_treatments;
CREATE TRIGGER trg_agri_treatment_dar
  BEFORE INSERT OR UPDATE ON public.agri_treatments
  FOR EACH ROW EXECUTE FUNCTION public.fn_agri_validate_treatment();

CREATE OR REPLACE FUNCTION public.fn_agri_validate_harvest_dar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_blocked_until date;
BEGIN
  SELECT MAX(t.withholding_until_date) INTO v_blocked_until
  FROM public.agri_treatments t
  WHERE t.parcel_id = NEW.parcel_id
    AND t.target_type = 'crop'
    AND t.deleted_at IS NULL
    AND t.withholding_until_date > NEW.harvest_date;

  IF v_blocked_until IS NOT NULL THEN
    RAISE EXCEPTION 'AGRI_DAR_VIOLATION: Harvest blocked until % due to active phytosanitary DAR withholding period.', v_blocked_until;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agri_harvest_dar ON public.agri_harvests;
CREATE TRIGGER trg_agri_harvest_dar
  BEFORE INSERT OR UPDATE ON public.agri_harvests
  FOR EACH ROW EXECUTE FUNCTION public.fn_agri_validate_harvest_dar();

CREATE OR REPLACE FUNCTION public.fn_agri_validate_milking_withholding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_until date;
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    SELECT antibiotic_withholding_until INTO v_until
    FROM public.agri_livestock
    WHERE id = NEW.animal_id AND deleted_at IS NULL;

    IF v_until IS NOT NULL AND NEW.milking_date < v_until THEN
      NEW.is_tank_approved := false;
      NEW.is_discarded := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agri_milking_withholding ON public.agri_milking_logs;
CREATE TRIGGER trg_agri_milking_withholding
  BEFORE INSERT OR UPDATE ON public.agri_milking_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_agri_validate_milking_withholding();

-- Publish Group B Tables to Supabase Realtime safely
DO $$
DECLARE
  rt_tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH rt_tbl IN ARRAY ARRAY[
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
      'mfg_staff', 'mfg_workstations', 'mfg_raw_materials', 'mfg_bom_recipes',
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
