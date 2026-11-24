-- ============================================================================
-- ATRIUM ERP & CRM — PHASE 1 TRUST INFRASTRUCTURE (STEP 2)
-- Covers:
--   Infra-A: platform_admins + is_platform_admin() / is_platform_super_admin()
--   Infra-B: statutory_rates (effective_from-only versioning, verify-only lock,
--            unverified code-only baseline seed with snmg_dzd = NULL)
--   Infra-C: wilayas_ref (58 legacy unverified rows + global RLS)
--   Infra-D: sequence_counters + device_sequence_blocks +
--            allocate_sequence_number & reserve_sequence_block RPCs
--   Infra-E: Private Storage buckets (expense-receipts, bat-deliverables) + RLS
--            (guarded cleanly when storage schema is absent in CI Postgres)
-- Target: Supabase PostgreSQL 15+ & CI Postgres 16
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Infra-A: Platform Admins (Global Reference Governance, Manual SQL Bootstrap)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'super_admin')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_active_account
  ON public.platform_admins (account_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.account_id = auth.uid()
      AND pa.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.account_id = auth.uid()
      AND pa.is_active = true
      AND pa.role = 'super_admin'
  );
$$;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_self_or_super_read" ON public.platform_admins;
CREATE POLICY "platform_admins_self_or_super_read"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (
    account_id = auth.uid()
    OR public.is_platform_super_admin()
  );

DROP POLICY IF EXISTS "platform_admins_super_insert" ON public.platform_admins;
CREATE POLICY "platform_admins_super_insert"
  ON public.platform_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS "platform_admins_super_update" ON public.platform_admins;
CREATE POLICY "platform_admins_super_update"
  ON public.platform_admins
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

DROP POLICY IF EXISTS "platform_admins_super_delete" ON public.platform_admins;
CREATE POLICY "platform_admins_super_delete"
  ON public.platform_admins
  FOR DELETE
  TO authenticated
  USING (public.is_platform_super_admin());

-- ----------------------------------------------------------------------------
-- Infra-B: Statutory Rates (effective_from-only, no effective_to / exclusion)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statutory_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code text NOT NULL UNIQUE,
  effective_from date,
  is_legacy_baseline boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'superseded')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  cnas_salarial_rate numeric(6,4),
  cnas_patronal_rate numeric(6,4),
  irg_brackets jsonb,
  irg_abatement_rate numeric(6,4),
  irg_abatement_min_dzd bigint,
  irg_abatement_max_dzd bigint,
  irg_exemption_threshold_dzd bigint,
  irg_transitional_max_dzd bigint,
  irg_transitional_config jsonb,
  snmg_dzd bigint,
  overtime_multiplier_50 numeric(5,2),
  overtime_multiplier_100 numeric(5,2),
  tva_rates jsonb,
  timbre_config jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_statutory_rates_effective_from CHECK (is_legacy_baseline OR effective_from IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_statutory_rates_effective_from
  ON public.statutory_rates (effective_from DESC NULLS LAST, created_at DESC);

ALTER TABLE public.statutory_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statutory_rates_auth_read" ON public.statutory_rates;
CREATE POLICY "statutory_rates_auth_read"
  ON public.statutory_rates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "statutory_rates_admin_insert" ON public.statutory_rates;
CREATE POLICY "statutory_rates_admin_insert"
  ON public.statutory_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "statutory_rates_admin_update" ON public.statutory_rates;
CREATE POLICY "statutory_rates_admin_update"
  ON public.statutory_rates
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "statutory_rates_admin_delete" ON public.statutory_rates;
CREATE POLICY "statutory_rates_admin_delete"
  ON public.statutory_rates
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.fn_protect_referenced_statutory_rates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_fk_col boolean := false;
  v_is_referenced boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'staff_payroll_runs'
      AND c.column_name = 'rate_set_id'
  ) INTO v_has_fk_col;

  IF v_has_fk_col THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.staff_payroll_runs WHERE rate_set_id = $1 AND deleted_at IS NULL)'
      INTO v_is_referenced
      USING OLD.id;
  END IF;

  IF v_is_referenced AND TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'STATUTORY_RATE_REFERENCED_IMMUTABLE' USING ERRCODE = '23503';
  END IF;

  IF v_is_referenced AND TG_OP = 'UPDATE' THEN
    IF (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.version_code IS DISTINCT FROM OLD.version_code
      OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
      OR NEW.is_legacy_baseline IS DISTINCT FROM OLD.is_legacy_baseline
      OR NEW.cnas_salarial_rate IS DISTINCT FROM OLD.cnas_salarial_rate
      OR NEW.cnas_patronal_rate IS DISTINCT FROM OLD.cnas_patronal_rate
      OR NEW.irg_brackets IS DISTINCT FROM OLD.irg_brackets
      OR NEW.irg_abatement_rate IS DISTINCT FROM OLD.irg_abatement_rate
      OR NEW.irg_abatement_min_dzd IS DISTINCT FROM OLD.irg_abatement_min_dzd
      OR NEW.irg_abatement_max_dzd IS DISTINCT FROM OLD.irg_abatement_max_dzd
      OR NEW.irg_exemption_threshold_dzd IS DISTINCT FROM OLD.irg_exemption_threshold_dzd
      OR NEW.irg_transitional_max_dzd IS DISTINCT FROM OLD.irg_transitional_max_dzd
      OR NEW.irg_transitional_config IS DISTINCT FROM OLD.irg_transitional_config
      OR NEW.snmg_dzd IS DISTINCT FROM OLD.snmg_dzd
      OR NEW.overtime_multiplier_50 IS DISTINCT FROM OLD.overtime_multiplier_50
      OR NEW.overtime_multiplier_100 IS DISTINCT FROM OLD.overtime_multiplier_100
      OR NEW.tva_rates IS DISTINCT FROM OLD.tva_rates
      OR NEW.timbre_config IS DISTINCT FROM OLD.timbre_config
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'STATUTORY_RATE_REFERENCED_VERIFY_ONLY' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    IF NEW.verification_status = 'verified' AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, auth.uid());
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_referenced_statutory_rates ON public.statutory_rates;
CREATE TRIGGER trg_protect_referenced_statutory_rates
  BEFORE UPDATE OR DELETE ON public.statutory_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_referenced_statutory_rates();

CREATE OR REPLACE FUNCTION public.get_effective_statutory_rates(
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.statutory_rates
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT sr.*
  FROM public.statutory_rates sr
  WHERE (sr.effective_from IS NULL OR sr.effective_from <= COALESCE(p_target_date, CURRENT_DATE))
    AND sr.verification_status <> 'superseded'
  ORDER BY sr.effective_from DESC NULLS LAST, sr.created_at DESC
  LIMIT 1;
$$;

-- Seed strictly from values currently present in code (effective_from NULL = baseline unknown decree date; snmg_dzd NULL until admin verifies)
INSERT INTO public.statutory_rates (
  version_code,
  effective_from,
  is_legacy_baseline,
  verification_status,
  cnas_salarial_rate,
  cnas_patronal_rate,
  irg_brackets,
  irg_abatement_rate,
  irg_abatement_min_dzd,
  irg_abatement_max_dzd,
  irg_exemption_threshold_dzd,
  irg_transitional_max_dzd,
  irg_transitional_config,
  snmg_dzd,
  overtime_multiplier_50,
  overtime_multiplier_100,
  tva_rates,
  timbre_config,
  notes
) VALUES (
  'DZ-CODE-BASELINE-UNVERIFIED',
  NULL,
  true,
  'unverified',
  0.0900,
  0.2600,
  '[
    {"min_dzd": 0, "max_dzd": 20000, "rate": 0},
    {"min_dzd": 20001, "max_dzd": 40000, "rate": 0.23},
    {"min_dzd": 40001, "max_dzd": 80000, "rate": 0.27},
    {"min_dzd": 80001, "max_dzd": 160000, "rate": 0.30},
    {"min_dzd": 160001, "max_dzd": null, "rate": 0.35}
  ]'::jsonb,
  0.4000,
  1000,
  1500,
  30000,
  35000,
  '{
    "min_dzd": 30001,
    "max_exclusive_dzd": 35000,
    "active_code_formula": "round(irgAfterRebate * (brutImp - 30000) / 5000)",
    "code_comment_formula": "IRG_normal * (137 / 51) - (27925 / 51)",
    "requires_accountant_verification": true
  }'::jsonb,
  NULL,
  1.50,
  2.00,
  '[0, 9, 19]'::jsonb,
  '{
    "commercial_cash": {"rate": 0.01, "min_dzd": 20, "max_dzd": 2500},
    "art_317_brackets": [
      {"max_dzd": 500, "stamp_dzd": 0},
      {"max_dzd": 3000, "stamp_dzd": 20},
      {"max_dzd": 10000, "stamp_dzd": 50},
      {"max_dzd": 50000, "stamp_dzd": 100},
      {"max_dzd": 100000, "stamp_dzd": 200}
    ],
    "art_317_over_limit": {"rate": 0.01, "max_dzd": 2500}
  }'::jsonb,
  'Unverified code baseline (effective date unknown; snmg_dzd intentionally NULL). Seeded strictly from existing code (algerianPayroll.ts, rules.ts) pending platform-admin verification.'
)
ON CONFLICT (version_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Infra-C: Algerian 58 Wilayas Reference Table (Global Auth Read / Admin Write)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wilayas_ref (
  code smallint PRIMARY KEY CHECK (code BETWEEN 1 AND 99),
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  default_zone text NOT NULL CHECK (
    default_zone IN (
      'Zone1_Local',
      'Zone2_Proche',
      'Zone3_Nord',
      'Zone4_Plateaux',
      'Zone5_Sud',
      'Zone6_GrandSud'
    )
  ),
  communes jsonb NOT NULL DEFAULT '[]'::jsonb,
  valid_from date DEFAULT NULL,
  valid_to date,
  is_legacy boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wilayas_ref ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wilayas_ref_auth_read" ON public.wilayas_ref;
CREATE POLICY "wilayas_ref_auth_read"
  ON public.wilayas_ref
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "wilayas_ref_admin_insert" ON public.wilayas_ref;
CREATE POLICY "wilayas_ref_admin_insert"
  ON public.wilayas_ref
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "wilayas_ref_admin_update" ON public.wilayas_ref;
CREATE POLICY "wilayas_ref_admin_update"
  ON public.wilayas_ref
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "wilayas_ref_admin_delete" ON public.wilayas_ref;
CREATE POLICY "wilayas_ref_admin_delete"
  ON public.wilayas_ref
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

INSERT INTO public.wilayas_ref (
  code, name_fr, name_ar, name_en, default_zone, communes, valid_from, valid_to, is_legacy, verification_status
) VALUES
  (1, 'Adrar', 'أدرار', 'Adrar', 'Zone5_Sud', '["Adrar","Reggane","Timimoun","Aoulef"]'::jsonb, NULL, NULL, true, 'unverified'),
  (2, 'Chlef', 'الشلف', 'Chlef', 'Zone3_Nord', '["Chlef","Ténès","El Karimia","Boukadir"]'::jsonb, NULL, NULL, true, 'unverified'),
  (3, 'Laghouat', 'الأغواط', 'Laghouat', 'Zone5_Sud', '["Laghouat","Aflou","Ksar El Hirane"]'::jsonb, NULL, NULL, true, 'unverified'),
  (4, 'Oum El Bouaghi', 'أم البواقي', 'Oum El Bouaghi', 'Zone4_Plateaux', '["Oum El Bouaghi","Aïn Beïda","Aïn M''lila"]'::jsonb, NULL, NULL, true, 'unverified'),
  (5, 'Batna', 'باتنة', 'Batna', 'Zone4_Plateaux', '["Batna","Barika","Aïn Touta","Merouana"]'::jsonb, NULL, NULL, true, 'unverified'),
  (6, 'Béjaïa', 'بجاية', 'Bejaia', 'Zone3_Nord', '["Béjaïa","Akbou","Amizour","El Kseur"]'::jsonb, NULL, NULL, true, 'unverified'),
  (7, 'Biskra', 'بسكرة', 'Biskra', 'Zone5_Sud', '["Biskra","Tolga","Ouled Djellal","Sidi Okba"]'::jsonb, NULL, NULL, true, 'unverified'),
  (8, 'Béchar', 'بشار', 'Bechar', 'Zone5_Sud', '["Béchar","Béni Abbès","Kenadsa","Taghit"]'::jsonb, NULL, NULL, true, 'unverified'),
  (9, 'Blida', 'البليدة', 'Blida', 'Zone2_Proche', '["Blida","Boufarik","Ouled Yaïch","Mouzaïa","El Affroun"]'::jsonb, NULL, NULL, true, 'unverified'),
  (10, 'Bouira', 'البويرة', 'Bouira', 'Zone3_Nord', '["Bouira","Lakhdaria","Sour El Ghozlane","Aïn Bessem"]'::jsonb, NULL, NULL, true, 'unverified'),
  (11, 'Tamanrasset', 'تمنراست', 'Tamanrasset', 'Zone6_GrandSud', '["Tamanrasset","In Salah","Abalessa"]'::jsonb, NULL, NULL, true, 'unverified'),
  (12, 'Tébessa', 'تبسة', 'Tebessa', 'Zone4_Plateaux', '["Tébessa","Chréa","Bir El Ater","El Aouinet"]'::jsonb, NULL, NULL, true, 'unverified'),
  (13, 'Tlemcen', 'تلمسان', 'Tlemcen', 'Zone3_Nord', '["Tlemcen","Mansourah","Maghnia","Ghazaouet","Chetouane"]'::jsonb, NULL, NULL, true, 'unverified'),
  (14, 'Tiaret', 'تيارت', 'Tiaret', 'Zone4_Plateaux', '["Tiaret","Sougueur","Frenda","Ksar Chellala"]'::jsonb, NULL, NULL, true, 'unverified'),
  (15, 'Tizi Ouzou', 'تيزي وزو', 'Tizi Ouzou', 'Zone3_Nord', '["Tizi Ouzou","Draâ Ben Khedda","Azazga","Boghni","Larbaâ Nath Irathen"]'::jsonb, NULL, NULL, true, 'unverified'),
  (16, 'Alger', 'الجزائر', 'Algiers', 'Zone1_Local', '["Kouba","Bab Ezzouar","Hydra","Chéraga","Hussein Dey","Sidi M''Hamed","El Biar","Dely Ibrahim","Zéralda","Birtouta","Rouïba","Bordj El Kiffan","El Harrach"]'::jsonb, NULL, NULL, true, 'unverified'),
  (17, 'Djelfa', 'الجلفة', 'Djelfa', 'Zone4_Plateaux', '["Djelfa","Aïn Oussera","Messaâd","Hassi Bahbah"]'::jsonb, NULL, NULL, true, 'unverified'),
  (18, 'Jijel', 'جيجل', 'Jijel', 'Zone3_Nord', '["Jijel","Taher","El Milia","El Aouana"]'::jsonb, NULL, NULL, true, 'unverified'),
  (19, 'Sétif', 'سطيف', 'Setif', 'Zone3_Nord', '["Sétif","El Eulma","Aïn Oulmene","Aïn Arnat","Bougaa"]'::jsonb, NULL, NULL, true, 'unverified'),
  (20, 'Saïda', 'سعيدة', 'Saida', 'Zone4_Plateaux', '["Saïda","Aïn El Hadjar","Youb"]'::jsonb, NULL, NULL, true, 'unverified'),
  (21, 'Skikda', 'سكيكدة', 'Skikda', 'Zone3_Nord', '["Skikda","El Harrouch","Azzaba","Collo"]'::jsonb, NULL, NULL, true, 'unverified'),
  (22, 'Sidi Bel Abbès', 'سيدي بلعباس', 'Sidi Bel Abbes', 'Zone3_Nord', '["Sidi Bel Abbès","Telagh","Sfisef","Ben Badis"]'::jsonb, NULL, NULL, true, 'unverified'),
  (23, 'Annaba', 'عنابة', 'Annaba', 'Zone3_Nord', '["Annaba","El Bouni","El Hadjar","Berrahal","Seraïdi"]'::jsonb, NULL, NULL, true, 'unverified'),
  (24, 'Guelma', 'قالمة', 'Guelma', 'Zone3_Nord', '["Guelma","Oued Zenati","Bouchegouf","Héliopolis"]'::jsonb, NULL, NULL, true, 'unverified'),
  (25, 'Constantine', 'قسنطينة', 'Constantine', 'Zone3_Nord', '["Constantine","El Khroub","Ali Mendjeli","Hamma Bouziane","Didouche Mourad"]'::jsonb, NULL, NULL, true, 'unverified'),
  (26, 'Médéa', 'المدية', 'Medea', 'Zone3_Nord', '["Médéa","Berrouaghia","Ksar El Boukhari","Beni Slimane"]'::jsonb, NULL, NULL, true, 'unverified'),
  (27, 'Mostaganem', 'مستغانم', 'Mostaganem', 'Zone3_Nord', '["Mostaganem","Aïn Tedeles","Hassi Mameche","Sidi Ali"]'::jsonb, NULL, NULL, true, 'unverified'),
  (28, 'M''Sila', 'المسيلة', 'M''Sila', 'Zone4_Plateaux', '["M''Sila","Boussaâda","Sidi Aïssa","Magra"]'::jsonb, NULL, NULL, true, 'unverified'),
  (29, 'Mascara', 'معسكر', 'Mascara', 'Zone3_Nord', '["Mascara","Sig","Tighennif","Mohammadia"]'::jsonb, NULL, NULL, true, 'unverified'),
  (30, 'Ouargla', 'ورقلة', 'Ouargla', 'Zone5_Sud', '["Ouargla","Hassi Messaoud","Touggourt","Rouissat"]'::jsonb, NULL, NULL, true, 'unverified'),
  (31, 'Oran', 'وهران', 'Oran', 'Zone3_Nord', '["Oran","Bir El Djir","Es Senia","Arzew","Aïn El Turk","Bethioua"]'::jsonb, NULL, NULL, true, 'unverified'),
  (32, 'El Bayadh', 'البيض', 'El Bayadh', 'Zone5_Sud', '["El Bayadh","Rogassa","Brezina"]'::jsonb, NULL, NULL, true, 'unverified'),
  (33, 'Illizi', 'إيليزي', 'Illizi', 'Zone6_GrandSud', '["Illizi","Djanet","In Amenas"]'::jsonb, NULL, NULL, true, 'unverified'),
  (34, 'Bordj Bou Arréridj', 'برج بوعريريج', 'Bordj Bou Arreridj', 'Zone3_Nord', '["Bordj Bou Arréridj","Ras El Oued","Mansoura"]'::jsonb, NULL, NULL, true, 'unverified'),
  (35, 'Boumerdès', 'بومرداس', 'Boumerdes', 'Zone2_Proche', '["Boumerdès","Zemmouri","Dellys","Khemis El Khechna","Boudouaou"]'::jsonb, NULL, NULL, true, 'unverified'),
  (36, 'El Tarf', 'الطارف', 'El Tarf', 'Zone3_Nord', '["El Tarf","Ben M''Hidi","Besbes","El Kala"]'::jsonb, NULL, NULL, true, 'unverified'),
  (37, 'Tindouf', 'تندوف', 'Tindouf', 'Zone6_GrandSud', '["Tindouf","Oum El Assel"]'::jsonb, NULL, NULL, true, 'unverified'),
  (38, 'Tissemsilt', 'تيسمسيلت', 'Tissemsilt', 'Zone4_Plateaux', '["Tissemsilt","Theniet El Had","Khemisti"]'::jsonb, NULL, NULL, true, 'unverified'),
  (39, 'El Oued', 'الوادي', 'El Oued', 'Zone5_Sud', '["El Oued","Djamaa","Guemar","Robbah"]'::jsonb, NULL, NULL, true, 'unverified'),
  (40, 'Khenchela', 'خنشلة', 'Khenchela', 'Zone4_Plateaux', '["Khenchela","Kaïs","Chechar"]'::jsonb, NULL, NULL, true, 'unverified'),
  (41, 'Souk Ahras', 'سوق أهراس', 'Souk Ahras', 'Zone3_Nord', '["Souk Ahras","Seddrata","Taoura"]'::jsonb, NULL, NULL, true, 'unverified'),
  (42, 'Tipaza', 'تيبازة', 'Tipaza', 'Zone2_Proche', '["Tipaza","Koléa","Cherchell","Bou Ismaïl","Hadout"]'::jsonb, NULL, NULL, true, 'unverified'),
  (43, 'Mila', 'ميلة', 'Mila', 'Zone4_Plateaux', '["Mila","Chelghoum Laïd","Tadjenanet","Ferdjioua"]'::jsonb, NULL, NULL, true, 'unverified'),
  (44, 'Aïn Defla', 'عين الدفلى', 'Ain Defla', 'Zone3_Nord', '["Aïn Defla","Khemis Miliana","El Attaf"]'::jsonb, NULL, NULL, true, 'unverified'),
  (45, 'Naâma', 'النعامة', 'Naama', 'Zone5_Sud', '["Naâma","Mécheria","Aïn Sefra"]'::jsonb, NULL, NULL, true, 'unverified'),
  (46, 'Aïn Témouchent', 'عين تموشنت', 'Ain Temouchent', 'Zone3_Nord', '["Aïn Témouchent","Béni Saf","Hammam Bou Hadjar"]'::jsonb, NULL, NULL, true, 'unverified'),
  (47, 'Ghardaïa', 'غرداية', 'Ghardaia', 'Zone5_Sud', '["Ghardaïa","El Guerrara","Metlili","Béni Isguen"]'::jsonb, NULL, NULL, true, 'unverified'),
  (48, 'Relizane', 'غليزان', 'Relizane', 'Zone3_Nord', '["Relizane","Oued Rhiou","Mazouna"]'::jsonb, NULL, NULL, true, 'unverified'),
  (49, 'Timimoun', 'تيميمون', 'Timimoun', 'Zone5_Sud', '["Timimoun","Aougrout","Tinerkouk"]'::jsonb, NULL, NULL, true, 'unverified'),
  (50, 'Bordj Badji Mokhtar', 'برج باجي مختار', 'Bordj Badji Mokhtar', 'Zone6_GrandSud', '["Bordj Badji Mokhtar","Timiaouine"]'::jsonb, NULL, NULL, true, 'unverified'),
  (51, 'Ouled Djellal', 'أولاد جلال', 'Ouled Djellal', 'Zone5_Sud', '["Ouled Djellal","Sidi Khaled","Ras El Miaad"]'::jsonb, NULL, NULL, true, 'unverified'),
  (52, 'Béni Abbès', 'بني عباس', 'Beni Abbes', 'Zone5_Sud', '["Béni Abbès","Kerzaz","Tabelbala"]'::jsonb, NULL, NULL, true, 'unverified'),
  (53, 'In Salah', 'عين صالح', 'In Salah', 'Zone6_GrandSud', '["In Salah","Foggaret Ezzaouia","In Ghar"]'::jsonb, NULL, NULL, true, 'unverified'),
  (54, 'In Guezzam', 'عين قزام', 'In Guezzam', 'Zone6_GrandSud', '["In Guezzam","Tin Zaouatine"]'::jsonb, NULL, NULL, true, 'unverified'),
  (55, 'Touggourt', 'تقرت', 'Touggourt', 'Zone5_Sud', '["Touggourt","Taibet","Temacine"]'::jsonb, NULL, NULL, true, 'unverified'),
  (56, 'Djanet', 'جانت', 'Djanet', 'Zone6_GrandSud', '["Djanet","Bordj El Haouas"]'::jsonb, NULL, NULL, true, 'unverified'),
  (57, 'El M''Ghair', 'المغير', 'El M''Ghair', 'Zone5_Sud', '["El M''Ghair","Djamaa"]'::jsonb, NULL, NULL, true, 'unverified'),
  (58, 'El Meniaa', 'المنيعة', 'El Meniaa', 'Zone5_Sud', '["El Meniaa","Hassi Gara"]'::jsonb, NULL, NULL, true, 'unverified')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Infra-D: Sequence Counters, Device Reserved Blocks & Atomic RPCs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sequence_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (
    doc_type IN (
      'z_report',
      'walk_in_ticket',
      'deposit_receipt',
      'payroll_run',
      'ncr',
      'inspection'
    )
  ),
  fiscal_year smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  last_number bigint NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, branch_id, doc_type, fiscal_year)
);

ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequence_counters_tenant_read" ON public.sequence_counters;
CREATE POLICY "sequence_counters_tenant_read"
  ON public.sequence_counters
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

-- Direct client INSERT/UPDATE/DELETE blocked: sequences are mutated strictly via SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.sequence_counters FROM anon, authenticated, public;

CREATE TABLE IF NOT EXISTS public.device_sequence_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  -- Strictly limited to offline gap-tolerant operational receipts/tickets (never fiscal_invoice / z_report)
  doc_type text NOT NULL CHECK (doc_type IN ('walk_in_ticket', 'deposit_receipt')),
  fiscal_year smallint NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  range_start bigint NOT NULL CHECK (range_start > 0),
  range_end bigint NOT NULL CHECK (range_end >= range_start),
  allocated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_sequence_blocks_lookup
  ON public.device_sequence_blocks (business_id, branch_id, device_id, doc_type, fiscal_year, range_end DESC);

ALTER TABLE public.device_sequence_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_sequence_blocks_tenant_read" ON public.device_sequence_blocks;
CREATE POLICY "device_sequence_blocks_tenant_read"
  ON public.device_sequence_blocks
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND public.can_access_branch(branch_id)
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.device_sequence_blocks FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public._sequence_prefix(p_doc_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_doc_type
    WHEN 'z_report' THEN 'Z'
    WHEN 'walk_in_ticket' THEN 'WI'
    WHEN 'deposit_receipt' THEN 'DR'
    WHEN 'payroll_run' THEN 'PAY'
    WHEN 'ncr' THEN 'NCR'
    WHEN 'inspection' THEN 'INSP'
    ELSE 'DOC'
  END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_sequence_number(
  p_business_id uuid,
  p_branch_id uuid,
  p_doc_type text,
  p_fiscal_year smallint DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_branch_business_id uuid;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_counter_id uuid;
  v_next_number bigint;
  v_prefix text;
  v_formatted text;
  v_year smallint := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::smallint);
BEGIN
  IF p_business_id IS NULL OR p_branch_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SEQUENCE_CONTEXT' USING ERRCODE = '22023';
  END IF;

  IF p_doc_type NOT IN ('z_report', 'walk_in_ticket', 'deposit_receipt', 'payroll_run', 'ncr', 'inspection') THEN
    RAISE EXCEPTION 'UNSUPPORTED_SEQUENCE_DOC_TYPE' USING ERRCODE = '22023';
  END IF;

  SELECT b.account_id, b.business_id
    INTO v_account_id, v_branch_business_id
  FROM public.branches b
  WHERE b.id = p_branch_id
    AND b.is_active = true
  LIMIT 1;

  IF v_account_id IS NULL
     OR v_branch_business_id IS DISTINCT FROM p_business_id
     OR v_caller_account_id IS DISTINCT FROM v_account_id
     OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SEQUENCE_ACCESS' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sequence_counters (
    account_id, business_id, branch_id, doc_type, fiscal_year, last_number
  ) VALUES (
    v_account_id, p_business_id, p_branch_id, p_doc_type, v_year, 0
  )
  ON CONFLICT (business_id, branch_id, doc_type, fiscal_year) DO NOTHING;

  SELECT sc.id, sc.last_number
    INTO v_counter_id, v_next_number
  FROM public.sequence_counters sc
  WHERE sc.business_id = p_business_id
    AND sc.branch_id = p_branch_id
    AND sc.doc_type = p_doc_type
    AND sc.fiscal_year = v_year
  FOR UPDATE;

  v_next_number := v_next_number + 1;

  UPDATE public.sequence_counters
  SET last_number = v_next_number,
      updated_at = now()
  WHERE id = v_counter_id;

  v_prefix := public._sequence_prefix(p_doc_type);
  v_formatted := format('%s-%s-%s', v_prefix, v_year, lpad(v_next_number::text, 5, '0'));

  RETURN jsonb_build_object(
    'doc_type', p_doc_type,
    'fiscal_year', v_year,
    'seq_number', v_next_number,
    'prefix', v_prefix,
    'formatted_number', v_formatted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_sequence_block(
  p_business_id uuid,
  p_branch_id uuid,
  p_device_id text,
  p_doc_type text,
  p_block_size integer DEFAULT 50,
  p_fiscal_year smallint DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_branch_business_id uuid;
  v_caller_account_id uuid := public.get_auth_account_id();
  v_counter_id uuid;
  v_prev_number bigint;
  v_range_start bigint;
  v_range_end bigint;
  v_prefix text;
  v_year smallint := COALESCE(p_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::smallint);
BEGIN
  IF p_business_id IS NULL OR p_branch_id IS NULL OR p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RAISE EXCEPTION 'INVALID_SEQUENCE_BLOCK_CONTEXT' USING ERRCODE = '22023';
  END IF;

  IF p_doc_type NOT IN ('walk_in_ticket', 'deposit_receipt') THEN
    RAISE EXCEPTION 'DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE' USING ERRCODE = '22023';
  END IF;

  IF p_block_size IS NULL OR p_block_size < 1 OR p_block_size > 500 THEN
    RAISE EXCEPTION 'INVALID_SEQUENCE_BLOCK_SIZE' USING ERRCODE = '22023';
  END IF;

  SELECT b.account_id, b.business_id
    INTO v_account_id, v_branch_business_id
  FROM public.branches b
  WHERE b.id = p_branch_id
    AND b.is_active = true
  LIMIT 1;

  IF v_account_id IS NULL
     OR v_branch_business_id IS DISTINCT FROM p_business_id
     OR v_caller_account_id IS DISTINCT FROM v_account_id
     OR NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SEQUENCE_ACCESS' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sequence_counters (
    account_id, business_id, branch_id, doc_type, fiscal_year, last_number
  ) VALUES (
    v_account_id, p_business_id, p_branch_id, p_doc_type, v_year, 0
  )
  ON CONFLICT (business_id, branch_id, doc_type, fiscal_year) DO NOTHING;

  SELECT sc.id, sc.last_number
    INTO v_counter_id, v_prev_number
  FROM public.sequence_counters sc
  WHERE sc.business_id = p_business_id
    AND sc.branch_id = p_branch_id
    AND sc.doc_type = p_doc_type
    AND sc.fiscal_year = v_year
  FOR UPDATE;

  v_range_start := v_prev_number + 1;
  v_range_end := v_prev_number + p_block_size;

  UPDATE public.sequence_counters
  SET last_number = v_range_end,
      updated_at = now()
  WHERE id = v_counter_id;

  INSERT INTO public.device_sequence_blocks (
    account_id, business_id, branch_id, device_id, doc_type, fiscal_year, range_start, range_end
  ) VALUES (
    v_account_id, p_business_id, p_branch_id, trim(p_device_id), p_doc_type, v_year, v_range_start, v_range_end
  );

  v_prefix := public._sequence_prefix(p_doc_type);

  RETURN jsonb_build_object(
    'doc_type', p_doc_type,
    'fiscal_year', v_year,
    'device_id', trim(p_device_id),
    'range_start', v_range_start,
    'range_end', v_range_end,
    'prefix', v_prefix
  );
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_sequence_number(uuid, uuid, text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_sequence_number(uuid, uuid, text, smallint) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_sequence_block(uuid, uuid, text, text, integer, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_sequence_block(uuid, uuid, text, text, integer, smallint) TO authenticated;

-- ----------------------------------------------------------------------------
-- Infra-E: Private Storage Buckets & Tenant/Branch Path-Prefix RLS
-- Guarded with to_regclass() so plain CI Postgres 16 skips storage DDL cleanly
-- while real Supabase creates private buckets & object-level RLS policies.
-- Path contract: <account_id>/<business_id>/<branch_id>/<object_name>
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'expense-receipts',
        'expense-receipts',
        false,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      )
      ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $sql$;

    EXECUTE $sql$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'bat-deliverables',
        'bat-deliverables',
        false,
        26214400,
        ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml', 'application/postscript']
      )
      ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_select" ON storage.objects';
    EXECUTE $sql$
      CREATE POLICY "atrium_storage_tenant_select"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
          bucket_id IN ('expense-receipts', 'bat-deliverables')
          AND split_part(name, '/', 1) = public.get_auth_account_id()::text
          AND split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.can_access_branch(split_part(name, '/', 3)::uuid)
        )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_insert" ON storage.objects';
    EXECUTE $sql$
      CREATE POLICY "atrium_storage_tenant_insert"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id IN ('expense-receipts', 'bat-deliverables')
          AND split_part(name, '/', 1) = public.get_auth_account_id()::text
          AND split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.can_access_branch(split_part(name, '/', 3)::uuid)
        )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_update" ON storage.objects';
    EXECUTE $sql$
      CREATE POLICY "atrium_storage_tenant_update"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
          bucket_id IN ('expense-receipts', 'bat-deliverables')
          AND split_part(name, '/', 1) = public.get_auth_account_id()::text
          AND split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.can_access_branch(split_part(name, '/', 3)::uuid)
        )
        WITH CHECK (
          bucket_id IN ('expense-receipts', 'bat-deliverables')
          AND split_part(name, '/', 1) = public.get_auth_account_id()::text
          AND split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.can_access_branch(split_part(name, '/', 3)::uuid)
        )
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS "atrium_storage_tenant_delete" ON storage.objects';
    EXECUTE $sql$
      CREATE POLICY "atrium_storage_tenant_delete"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id IN ('expense-receipts', 'bat-deliverables')
          AND split_part(name, '/', 1) = public.get_auth_account_id()::text
          AND split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND public.can_access_branch(split_part(name, '/', 3)::uuid)
        )
    $sql$;
  END IF;
END $$;

COMMIT;
