-- ============================================================================
-- Atrium ERP & CRM — PostgreSQL RLS, RPC & Trigger Verification Harness
-- Runs inside an isolated transaction (ROLLBACK at end) against CI Postgres 16
-- or a Supabase staging database.
-- Executed via: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/test_rls_rpc_triggers.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_user_b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_admin  uuid := 'cccccccc-0000-4000-8000-000000000003';
  v_biz_a  uuid := '11111111-0000-4000-8000-000000000001';
  v_biz_b  uuid := '22222222-0000-4000-8000-000000000002';
  v_br_a   uuid := '33333333-0000-4000-8000-000000000001';
  v_br_b   uuid := '44444444-0000-4000-8000-000000000002';
  v_count  bigint;
  v_seq_1  jsonb;
  v_seq_2  jsonb;
  v_blk_1  jsonb;
  v_rate   public.statutory_rates%ROWTYPE;
BEGIN
  -- 1. Seed isolated fixture users, accounts, businesses, branches & platform admin
  INSERT INTO auth.users (id, email) VALUES
    (v_user_a, 'tenant-a@test.local'),
    (v_user_b, 'tenant-b@test.local'),
    (v_admin,  'platform-admin@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.accounts (id, full_name, email, is_active) VALUES
    (v_user_a, 'Tenant A', 'tenant-a@test.local', true),
    (v_user_b, 'Tenant B', 'tenant-b@test.local', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.businesses (id, account_id, category, name, is_active) VALUES
    (v_biz_a, v_user_a, 'pos_inventory', 'Biz A', true),
    (v_biz_b, v_user_b, 'logistics_delivery', 'Biz B', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.branches (id, account_id, business_id, name, code, is_main_branch, is_active) VALUES
    (v_br_a, v_user_a, v_biz_a, 'Branch A', 'BRA', true, true),
    (v_br_b, v_user_b, v_biz_b, 'Branch B', 'BRB', true, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.platform_admins (account_id, role, is_active) VALUES
    (v_admin, 'super_admin', true)
  ON CONFLICT (account_id) DO NOTHING;

  -- 2. Verify unverified baseline seed & 58-wilaya seed
  SELECT * INTO v_rate FROM public.get_effective_statutory_rates('2026-06-01');
  IF v_rate.id IS NULL OR v_rate.verification_status <> 'unverified' OR v_rate.snmg_dzd IS NOT NULL THEN
    RAISE EXCEPTION 'Expected unverified baseline statutory_rates row with NULL snmg_dzd';
  END IF;

  SELECT count(*) INTO v_count FROM public.wilayas_ref;
  IF v_count <> 58 THEN
    RAISE EXCEPTION 'Expected 58 seeded rows in wilayas_ref, got %', v_count;
  END IF;

  -- 3. Verify Global Reference RLS & Tenant Wilaya Tariff Isolation as User A
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  SELECT count(*) INTO v_count FROM public.wilayas_ref;
  IF v_count <> 58 THEN
    RAISE EXCEPTION 'Authenticated tenant failed to read wilayas_ref';
  END IF;

  BEGIN
    INSERT INTO public.statutory_rates (version_code, effective_from) VALUES ('UNAUTH-TEST', '2026-01-01');
    RAISE EXCEPTION 'Regular tenant unexpectedly inserted into statutory_rates';
  EXCEPTION WHEN insufficient_privilege THEN
    -- Expected RLS denial
    NULL;
  END;

  BEGIN
    UPDATE public.wilayas_ref SET verification_status = 'verified' WHERE code = 16;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Regular tenant unexpectedly updated wilayas_ref';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Tenant A writes its own logistics_wilaya_tariffs row; Tenant B cannot read or mutate it
  INSERT INTO public.logistics_wilaya_tariffs (
    account_id, business_id, branch_id, zone_id, base_weight_kg,
    home_base_price_dzd, stop_desk_base_price_dzd, overweight_per_kg_dzd, fragile_handling_surcharge_dzd
  ) VALUES (
    v_user_a, v_biz_a, v_br_a, 'Zone1_Local', 5, 450, 300, 60, 150
  )
  ON CONFLICT (branch_id, zone_id) DO UPDATE SET home_base_price_dzd = 450;

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);

  SELECT count(*) INTO v_count
  FROM public.logistics_wilaya_tariffs
  WHERE business_id = v_biz_a AND branch_id = v_br_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A logistics_wilaya_tariffs rows (%)', v_count;
  END IF;

  UPDATE public.logistics_wilaya_tariffs
  SET home_base_price_dzd = 999
  WHERE business_id = v_biz_a AND branch_id = v_br_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly updated Tenant A logistics_wilaya_tariffs rows (%)', v_count;
  END IF;

  -- Restore User A JWT context for sequence checks
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- 4. Verify Sequence RPC caller membership check, monotonic increment & non-overlapping device blocks
  v_seq_1 := public.allocate_sequence_number(v_biz_a, v_br_a, 'z_report', 2026::smallint);
  v_seq_2 := public.allocate_sequence_number(v_biz_a, v_br_a, 'z_report', 2026::smallint);
  IF (v_seq_1->>'seq_number')::bigint <> 1 OR (v_seq_2->>'seq_number')::bigint <> 2 THEN
    RAISE EXCEPTION 'allocate_sequence_number did not increment monotonically: % / %', v_seq_1, v_seq_2;
  END IF;

  BEGIN
    PERFORM public.allocate_sequence_number(v_biz_b, v_br_b, 'z_report', 2026::smallint);
    RAISE EXCEPTION 'User A unexpectedly allocated sequence for Tenant B branch';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  v_blk_1 := public.reserve_sequence_block(v_biz_a, v_br_a, 'dev-pos-01', 'walk_in_ticket', 25, 2026::smallint);
  IF (v_blk_1->>'range_start')::bigint <> 1 OR (v_blk_1->>'range_end')::bigint <> 25 THEN
    RAISE EXCEPTION 'reserve_sequence_block returned unexpected first range: %', v_blk_1;
  END IF;

  v_blk_1 := public.reserve_sequence_block(v_biz_a, v_br_a, 'dev-pos-02', 'walk_in_ticket', 25, 2026::smallint);
  IF (v_blk_1->>'range_start')::bigint <> 26 OR (v_blk_1->>'range_end')::bigint <> 50 THEN
    RAISE EXCEPTION 'reserve_sequence_block returned overlapping or non-contiguous second range: %', v_blk_1;
  END IF;

  BEGIN
    PERFORM public.reserve_sequence_block(v_biz_a, v_br_a, 'dev-pos-01', 'fiscal_invoice', 10, 2026::smallint);
    RAISE EXCEPTION 'reserve_sequence_block unexpectedly allowed fiscal_invoice';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.reserve_sequence_block(v_biz_a, v_br_a, 'dev-pos-01', 'z_report', 10, 2026::smallint);
    RAISE EXCEPTION 'reserve_sequence_block unexpectedly allowed z_report';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  -- 5. Verify Platform Admin write access, NULL baseline ordering & protection trigger presence
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

  INSERT INTO public.statutory_rates (
    version_code, effective_from, is_legacy_baseline, verification_status, cnas_salarial_rate, cnas_patronal_rate, snmg_dzd
  ) VALUES (
    'DZ-TEST-2026', '2026-01-01', false, 'unverified', 0.09, 0.26, 20000
  );

  SELECT * INTO v_rate FROM public.get_effective_statutory_rates('2026-06-01');
  IF v_rate.version_code <> 'DZ-TEST-2026' THEN
    RAISE EXCEPTION 'Effective-date lookup did not pick newest effective_from <= target_date (got %)', v_rate.version_code;
  END IF;

  SELECT * INTO v_rate FROM public.get_effective_statutory_rates('2020-01-01');
  IF v_rate.version_code <> 'DZ-CODE-BASELINE-UNVERIFIED' OR v_rate.effective_from IS NOT NULL THEN
    RAISE EXCEPTION 'Target date prior to 2026-01-01 did not fall back to NULL effective_from baseline (got %)', v_rate.version_code;
  END IF;

  UPDATE public.statutory_rates
  SET verification_status = 'verified'
  WHERE version_code = 'DZ-TEST-2026';

  -- Confirm statutory protection trigger is attached; Step 7b extends this with referenced payroll_run tests
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'statutory_rates'
      AND t.tgname = 'trg_protect_referenced_statutory_rates'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected trigger trg_protect_referenced_statutory_rates on public.statutory_rates';
  END IF;

  -- Verify constraint blocks non-baseline rows with NULL effective_from
  BEGIN
    INSERT INTO public.statutory_rates (
      version_code, effective_from, is_legacy_baseline, verification_status
    ) VALUES (
      'INVALID-NO-DATE', NULL, false, 'unverified'
    );
    RAISE EXCEPTION 'Non-legacy statutory_rates row unexpectedly allowed NULL effective_from';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 6. Verify immutable_audit_logs direct INSERT ban & log_access_denied_event RPC anti-forgery, dedupe & rate limit
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- Direct INSERT from authenticated client must fail RLS (no INSERT policy)
  BEGIN
    INSERT INTO public.immutable_audit_logs (
      account_id, actor_auth_id, table_name, record_id, action, new_data
    ) VALUES (
      v_user_b, v_user_b, 'security_access_denied', NULL, 'INSERT', '{"forged":true}'::jsonb
    );
    RAISE EXCEPTION 'Authenticated client unexpectedly inserted directly into immutable_audit_logs';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Cross-tenant business/branch scope in log_access_denied_event must fail
  BEGIN
    PERFORM public.log_access_denied_event('settings', 'logistics_delivery', 'dispatcher', 'dispatcher', 'UNAUTHORIZED_ROUTE', v_biz_b, v_br_b, now());
    RAISE EXCEPTION 'User A unexpectedly recorded audit event against Tenant B business/branch';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Valid call writes row with server-bound actor_auth_id = v_user_a and record_id IS NULL
  v_seq_1 := public.log_access_denied_event('settings', 'pos_inventory', 'Staff', 'Cashier', 'ROUTE_GUARD_DENIED', v_biz_a, v_br_a, now());
  IF COALESCE((v_seq_1->>'recorded')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected first log_access_denied_event to record row: %', v_seq_1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.immutable_audit_logs
    WHERE id = (v_seq_1->>'id')::uuid
      AND (actor_auth_id <> v_user_a OR account_id <> v_user_a OR record_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Security audit row had wrong server-bound actor/account or non-NULL record_id';
  END IF;

  -- Immediate repeat on same attemptedScreen is deduped within 4 seconds
  v_seq_2 := public.log_access_denied_event('settings', 'pos_inventory', 'Staff', 'Cashier', 'ROUTE_GUARD_DENIED', v_biz_a, v_br_a, now());
  IF COALESCE((v_seq_2->>'recorded')::boolean, true) IS NOT FALSE OR v_seq_2->>'reason' <> 'DEDUPED' THEN
    RAISE EXCEPTION 'Expected immediate repeat log_access_denied_event to be DEDUPED: %', v_seq_2;
  END IF;

  -- Different screen names record up to 20 per 60s rolling limit, then return RATE_LIMITED
  FOR i IN 1..19 LOOP
    v_seq_1 := public.log_access_denied_event('screen_' || i::text, 'pos_inventory', 'Staff', 'Cashier', 'ROUTE_GUARD_DENIED', v_biz_a, v_br_a, now());
    IF COALESCE((v_seq_1->>'recorded')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Expected screen_% within rate limit to record: %', i, v_seq_1;
    END IF;
  END LOOP;

  v_seq_2 := public.log_access_denied_event('screen_flood_21', 'pos_inventory', 'Staff', 'Cashier', 'ROUTE_GUARD_DENIED', v_biz_a, v_br_a, now());
  IF COALESCE((v_seq_2->>'recorded')::boolean, true) IS NOT FALSE OR v_seq_2->>'reason' <> 'RATE_LIMITED' THEN
    RAISE EXCEPTION 'Expected 21st event within 60s to be RATE_LIMITED: %', v_seq_2;
  END IF;

  -- 7. Verify Step 5 re_inspections immutability trigger & mfg_scrap_with_ncr RPC
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 're_inspections'
      AND t.tgname = 'trg_re_inspections_immutable_lock'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected trigger trg_re_inspections_immutable_lock on public.re_inspections';
  END IF;

  -- Locked re_inspections row must reject content updates
  INSERT INTO public.re_inspections (
    account_id, business_id, branch_id, property_title, inspection_type, overall_condition, is_locked, validated_at
  ) VALUES (
    v_user_a, v_biz_a, v_br_a, 'Villa Hydra Test', 'Entrée', 'Bon', true, now()
  )
  RETURNING id INTO v_staff_a;

  BEGIN
    UPDATE public.re_inspections
    SET overall_condition = 'Dégradé'
    WHERE id = v_staff_a;
    RAISE EXCEPTION 'Locked re_inspections row unexpectedly allowed mutation';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Cross-tenant mfg_scrap_with_ncr call must fail
  BEGIN
    PERFORM public.mfg_scrap_with_ncr(
      v_biz_b, v_br_b, NULL, 'OF-TEST', 'LOT-X', 'Piece Test', 'QC Lead', 5, 'Casse'
    );
    RAISE EXCEPTION 'User A unexpectedly invoked mfg_scrap_with_ncr on Tenant B';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Valid mfg_scrap_with_ncr inserts NCR with cmup_adjustment_held = true
  v_seq_1 := public.mfg_scrap_with_ncr(
    v_biz_a, v_br_a, NULL, 'OF-2026-01', 'LOT-2026-A', 'Profilé Alu', 'QC Lead', 4, 'Micro-fissures', 'Rebut Step 5'
  );
  IF COALESCE((v_seq_1->>'cmup_adjustment_held')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected mfg_scrap_with_ncr to return cmup_adjustment_held=true: %', v_seq_1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.mfg_ncr_records
    WHERE id = (v_seq_1->>'ncr_id')::uuid
      AND disposition = 'Scrapped'
      AND cmup_adjustment_held = true
  ) THEN
    RAISE EXCEPTION 'Expected mfg_ncr_records row with disposition=Scrapped and cmup_adjustment_held=true';
  END IF;

  RESET ROLE;
END $$;

ROLLBACK;
