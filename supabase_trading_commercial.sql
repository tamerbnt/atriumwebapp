-- =====================================================================
-- Atrium ERP & CRM — Category 8: Commercial Trading & Distribution (Négoce & B2B)
-- Dedicated Supabase PostgreSQL Schema & RPC Migration Script
-- Enforces Quadruple Traceability Standard:
--   1. account_id (Account Tenant / Owner)
--   2. business_id (Commercial Venture / Sarl Maghreb Négoce)
--   3. branch_id (Physical Facility / Central Warehouse)
--   4. staff_id (Operator / Commercial Officer / Magasinier)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. B2B Corporate Clients
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  company_name text NOT NULL,
  sector text NOT NULL DEFAULT 'BTPH & Gros Œuvre',
  email text,
  phone text,
  fax text,
  address text,
  city text NOT NULL DEFAULT 'Alger',
  country text NOT NULL DEFAULT 'Algérie',
  rc text,                  -- Registre de Commerce
  nif text,                 -- Numéro d'Identification Fiscale (15 chiffres)
  nis text,                 -- Numéro d'Identification Statistique
  ai text,                  -- Article d'Imposition
  rib_ccp text,             -- RIB Bancaire ou CCP
  contact_name text,
  contact_role text,
  contact_email text,
  contact_phone text,
  credit_limit numeric NOT NULL DEFAULT 1000000,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  payment_terms_days integer NOT NULL DEFAULT 30,
  default_payment_method text NOT NULL DEFAULT 'Virement bancaire',
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. B2B Referenced Suppliers & Subcontractors
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  supplier_name text NOT NULL,
  sector text NOT NULL DEFAULT 'Fabricant / Importateur',
  email text,
  phone text,
  fax text,
  address text,
  city text NOT NULL DEFAULT 'Alger',
  country text NOT NULL DEFAULT 'Algérie',
  rc text,
  nif text,
  nis text,
  ai text,
  rib_ccp text,
  contact_name text,
  contact_email text,
  contact_phone text,
  payment_terms_days integer NOT NULL DEFAULT 30,
  outstanding_payable numeric NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. Warehouse Depots & Storage Locations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_depots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  name text NOT NULL,
  code text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'Alger',
  manager_name text,
  manager_phone text,
  is_main bool NOT NULL DEFAULT false,
  total_valuation_dzd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. Commercial Sales Documents (Devis, Commandes, BL, Factures, Avoirs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  type text NOT NULL,          -- devis, commande, bl, facture, avoir, retour
  doc_number text NOT NULL,    -- DEV-2026-0001, BL-2026-0001, FAC-2026-0001
  client_id uuid REFERENCES public.b2b_clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_nif text,
  client_rc text,
  client_ai text,
  depot_id uuid REFERENCES public.warehouse_depots(id) ON DELETE SET NULL,
  depot_name text NOT NULL,
  parent_doc_id uuid REFERENCES public.commercial_documents(id) ON DELETE SET NULL,
  parent_doc_number text,
  converted_to_doc_id uuid,
  converted_to_doc_number text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  validity_days integer DEFAULT 30,
  due_date date,
  payment_method text NOT NULL DEFAULT 'Virement bancaire',
  payment_terms text NOT NULL DEFAULT '30 jours',
  status text NOT NULL DEFAULT 'Validated', -- Draft, Validated, Delivered, Paid, Cancelled, Overdue
  total_ht_raw numeric NOT NULL DEFAULT 0,
  general_discount_percent numeric NOT NULL DEFAULT 0,
  total_ht_final numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  timbre_fiscal numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  guarantee_retention_percent numeric NOT NULL DEFAULT 0,
  guarantee_retention_amount numeric NOT NULL DEFAULT 0,
  net_to_pay numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  notes_top text,
  notes_bottom text,
  include_stamp_signature bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. Commercial Document Line Items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_doc_id uuid NOT NULL REFERENCES public.commercial_documents(id) ON DELETE CASCADE,
  product_id text,
  description text NOT NULL,
  is_service bool NOT NULL DEFAULT false,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'u',
  unit_price_ht numeric NOT NULL DEFAULT 0,
  tva_percent numeric NOT NULL DEFAULT 19,
  discount_percent numeric NOT NULL DEFAULT 0,
  total_ht numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 6. Purchase Documents (PO, BR, Factures Fournisseurs)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  type text NOT NULL,          -- po, br, bill
  doc_number text NOT NULL,    -- PO-2026-0001, BR-2026-0001, FF-2026-0001
  supplier_id uuid REFERENCES public.b2b_suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  depot_target_id uuid REFERENCES public.warehouse_depots(id) ON DELETE SET NULL,
  depot_target_name text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  received_date date,
  status text NOT NULL DEFAULT 'Ordered', -- Draft, Ordered, Partial, Received, Paid, Cancelled
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DZD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Line Items for Purchases
CREATE TABLE IF NOT EXISTS public.purchase_document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_doc_id uuid NOT NULL REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  quantity_ordered numeric NOT NULL DEFAULT 1,
  quantity_received numeric NOT NULL DEFAULT 0,
  unit_cost_ht numeric NOT NULL DEFAULT 0,
  tva_percent numeric NOT NULL DEFAULT 19,
  total_cost_ht numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'u'
);

-- ---------------------------------------------------------------------
-- 7. Physical Stock Movement Vouchers (BE, BS, BT)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movement_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  business_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  staff_id uuid,
  voucher_number text NOT NULL,  -- BE-2026-0001, BS-2026-0001, BT-2026-0001
  type text NOT NULL,           -- entree, sortie, transfert
  date date NOT NULL DEFAULT CURRENT_DATE,
  depot_source_id uuid REFERENCES public.warehouse_depots(id) ON DELETE SET NULL,
  depot_source_name text NOT NULL,
  depot_target_id uuid REFERENCES public.warehouse_depots(id) ON DELETE SET NULL,
  depot_target_name text,
  reason text NOT NULL,         -- reception_achat, ajustement_inventaire, sortie_client, consommation_interne, rebut_casse, transfert
  operator_name text NOT NULL,
  total_valuation_dzd numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Movement Voucher Items
CREATE TABLE IF NOT EXISTS public.stock_movement_voucher_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.stock_movement_vouchers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost_dzd numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'u'
);

-- ---------------------------------------------------------------------
-- 8. Performance Indexes for Ultra-Fast Queries
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_b2b_clients_tenant ON public.b2b_clients(account_id, business_id);
CREATE INDEX IF NOT EXISTS idx_b2b_suppliers_tenant ON public.b2b_suppliers(account_id, business_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON public.warehouse_depots(account_id, business_id);
CREATE INDEX IF NOT EXISTS idx_comm_docs_tenant_type ON public.commercial_documents(account_id, business_id, type, status);
CREATE INDEX IF NOT EXISTS idx_comm_docs_client ON public.commercial_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_purch_docs_tenant ON public.purchase_documents(account_id, business_id, type);
CREATE INDEX IF NOT EXISTS idx_stock_vouchers_tenant ON public.stock_movement_vouchers(account_id, business_id, type);

-- ---------------------------------------------------------------------
-- 9. Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------
ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement_voucher_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'b2b_clients_isolation') THEN
    CREATE POLICY b2b_clients_isolation ON public.b2b_clients FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'b2b_suppliers_isolation') THEN
    CREATE POLICY b2b_suppliers_isolation ON public.b2b_suppliers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'warehouses_isolation') THEN
    CREATE POLICY warehouses_isolation ON public.warehouse_depots FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_docs_isolation') THEN
    CREATE POLICY comm_docs_isolation ON public.commercial_documents FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comm_items_isolation') THEN
    CREATE POLICY comm_items_isolation ON public.commercial_document_items FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'purch_docs_isolation') THEN
    CREATE POLICY purch_docs_isolation ON public.purchase_documents FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'purch_items_isolation') THEN
    CREATE POLICY purch_items_isolation ON public.purchase_document_items FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_vouchers_isolation') THEN
    CREATE POLICY stock_vouchers_isolation ON public.stock_movement_vouchers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_items_isolation') THEN
    CREATE POLICY stock_items_isolation ON public.stock_movement_voucher_items FOR ALL USING (true);
  END IF;
END $$;
