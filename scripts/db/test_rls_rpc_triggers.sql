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
  v_staff_a uuid;
  v_member_a uuid := '55555555-0000-4000-8000-000000000001';
  v_prod_a   uuid := '66666666-0000-4000-8000-000000000001';
  v_sale_a   uuid := '77777777-0000-4000-8000-000000000001';
  v_z_a      uuid := '88888888-0000-4000-8000-000000000001';
  v_chk_id   uuid := '99999999-0000-4000-8000-000000000001';
  v_sess_a   uuid := 'abababab-0000-4000-8000-000000000001';
  v_stu_a    uuid := 'cdcdcdcd-0000-4000-8000-000000000001';
  v_mv_id    uuid := 'efefefef-0000-4000-8000-000000000001';
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

  -- 8. Verify Step 6 (1.1 duplicate check-in, 1.2 edu_attendance unique index, 1.4 immutable Z-report, 1.5 refund/undo RPC)
  INSERT INTO public.gym_members (
    id, account_id, business_id, branch_id, full_name, status, start_date, expiration_date, remaining_sessions
  ) VALUES (
    v_member_a, v_user_a, v_biz_a, v_br_a, 'Adherent Step6', 'Active', CURRENT_DATE, CURRENT_DATE + 30, 10
  );

  v_seq_1 := public.gym_record_check_in(v_br_a, v_member_a, 'rfid', 'dev-a', v_chk_id, 5, NULL, NULL);
  IF COALESCE((v_seq_1->>'success')::boolean, false) IS NOT TRUE
     OR (v_seq_1->>'remainingSessions')::int <> 9 THEN
    RAISE EXCEPTION 'Expected first gym_record_check_in to decrement sessions to 9: %', v_seq_1;
  END IF;

  -- Second check-in within 5 minutes with a different ID must be blocked
  v_seq_2 := public.gym_record_check_in(v_br_a, v_member_a, 'rfid', 'dev-a', gen_random_uuid(), 5, NULL, NULL);
  IF COALESCE((v_seq_2->>'duplicateBlocked')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected duplicate check-in within 5m to be blocked: %', v_seq_2;
  END IF;

  -- With override reason, check-in proceeds & decrements to 8
  v_seq_2 := public.gym_record_check_in(v_br_a, v_member_a, 'manual', 'dev-a', gen_random_uuid(), 5, v_user_a, 'Card re-entry verified');
  IF COALESCE((v_seq_2->>'success')::boolean, false) IS NOT TRUE
     OR (v_seq_2->>'remainingSessions')::int <> 8 THEN
    RAISE EXCEPTION 'Expected overridden gym_record_check_in to succeed with 8 remaining: %', v_seq_2;
  END IF;

  -- 1.2 Active edu_attendance partial unique index must reject duplicates
  INSERT INTO public.edu_attendance (
    account_id, business_id, branch_id, session_id, cohort_id, student_id, student_name, status
  ) VALUES (
    v_user_a, v_biz_a, v_br_a, v_sess_a, v_sess_a, v_stu_a, 'Student One', 'Present'
  );
  BEGIN
    INSERT INTO public.edu_attendance (
      account_id, business_id, branch_id, session_id, cohort_id, student_id, student_name, status
    ) VALUES (
      v_user_a, v_biz_a, v_br_a, v_sess_a, v_sess_a, v_stu_a, 'Student One', 'Late'
    );
    RAISE EXCEPTION 'Duplicate active edu_attendance unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- 1.4 POS Z-report immutability: provisional finalize allowed once; money edits and deletes blocked
  INSERT INTO public.pos_z_reports (
    id, account_id, business_id, branch_id, local_close_ref, status, closed_by_name,
    opening_float_centimes, expected_cash_centimes, actual_cash_centimes
  ) VALUES (
    v_z_a, v_user_a, v_biz_a, v_br_a, 'LOC-CLOSE-001', 'provisional_pending_sync', 'Manager A',
    1500000, 2500000, 2500000
  );

  UPDATE public.pos_z_reports
  SET status = 'finalized', z_number = 'Z-2026-00001', finalized_at = now()
  WHERE id = v_z_a;

  BEGIN
    UPDATE public.pos_z_reports
    SET actual_cash_centimes = 100
    WHERE id = v_z_a;
    RAISE EXCEPTION 'Immutable Z-report allowed monetary mutation';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- 1.5 POS partial refund restores stock & undo reverses it
  INSERT INTO public.pos_products (
    id, account_id, business_id, branch_id, name, price_amount, cost_amount, stock_quantity
  ) VALUES (
    v_prod_a, v_user_a, v_biz_a, v_br_a, 'Bottle Water', 100, 60, 10
  );
  INSERT INTO public.pos_sales (
    id, account_id, business_id, branch_id, receipt_number, total_amount, payment_method, status
  ) VALUES (
    v_sale_a, v_user_a, v_biz_a, v_br_a, 'POS-TEST-01', 300, 'Cash', 'Completed'
  );
  INSERT INTO public.pos_sale_items (
    account_id, business_id, branch_id, sale_id, product_id, product_name, quantity, unit_price, total_price
  ) VALUES (
    v_user_a, v_biz_a, v_br_a, v_sale_a, v_prod_a, 'Bottle Water', 3, 100, 300
  );

  v_seq_1 := public.pos_refund_with_stock(
    v_br_a,
    v_sale_a,
    jsonb_build_array(jsonb_build_object('productId', v_prod_a, 'productName', 'Bottle Water', 'quantity', 2)),
    'Damaged cap',
    'dev-a',
    jsonb_build_array(v_mv_id)
  );
  IF COALESCE((v_seq_1->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'pos_refund_with_stock failed: %', v_seq_1;
  END IF;
  IF (SELECT stock_quantity FROM public.pos_products WHERE id = v_prod_a) <> 12 THEN
    RAISE EXCEPTION 'Expected stock_quantity = 12 after refund of 2';
  END IF;

  v_seq_2 := public.pos_undo_refund_with_stock(
    v_br_a, v_sale_a, jsonb_build_array(v_mv_id), 'Completed', NULL
  );
  IF COALESCE((v_seq_2->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'pos_undo_refund_with_stock failed: %', v_seq_2;
  END IF;
  IF (SELECT stock_quantity FROM public.pos_products WHERE id = v_prod_a) <> 10 THEN
    RAISE EXCEPTION 'Expected stock_quantity = 10 after undo refund';
  END IF;

  -- 9. Verify Step 7b (append-only attendance, payroll period unique + adjustment seq, approve_payroll_run RPC, immutability, statutory verify-only lock)
  v_staff_a := 'dddddddd-0000-4000-8000-000000000001';

  RESET ROLE;
  INSERT INTO public.staff (
    id, account_id, business_id, branch_id, full_name, role, salary, is_active
  ) VALUES (
    v_staff_a, v_user_a, v_biz_a, v_br_a, 'Staff Step7b', 'Coach', 80000, true
  )
  ON CONFLICT (id) DO NOTHING;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- 9.1 Append-only staff_attendance_logs blocks UPDATE & DELETE
  INSERT INTO public.staff_attendance_logs (
    id, account_id, business_id, branch_id, staff_id, staff_name, staff_role, log_date, type, method, source
  ) VALUES (
    v_chk_id, v_user_a, v_biz_a, v_br_a, v_staff_a, 'Staff Step7b', 'Coach', CURRENT_DATE, 'in', 'manual', 'manual'
  );

  BEGIN
    UPDATE public.staff_attendance_logs SET type = 'out' WHERE id = v_chk_id;
    RAISE EXCEPTION 'staff_attendance_logs unexpectedly allowed UPDATE';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.staff_attendance_logs WHERE id = v_chk_id;
    RAISE EXCEPTION 'staff_attendance_logs unexpectedly allowed DELETE';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- 9.2 Salary advance cannot be marked deducted directly outside approve_payroll_run()
  INSERT INTO public.staff_salary_advances (
    id, account_id, business_id, branch_id, staff_id, staff_name, amount_dzd, payment_method, voucher_number, status
  ) VALUES (
    v_mv_id, v_user_a, v_biz_a, v_br_a, v_staff_a, 'Staff Step7b', 10000, 'cash', 'VCH-STEP7B-01', 'pending'
  );

  BEGIN
    UPDATE public.staff_salary_advances SET status = 'deducted' WHERE id = v_mv_id;
    RAISE EXCEPTION 'staff_salary_advances unexpectedly allowed direct client deducted update';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- 9.3 Payroll run unique period index + adjustment_seq check + statutory rate reference
  SELECT * INTO v_rate FROM public.get_effective_statutory_rates('2026-06-01');

  INSERT INTO public.staff_payroll_runs (
    id, account_id, business_id, branch_id, category, period_month, period_year, title, status,
    total_gross_cotisable, total_cnas_salarial, total_cnas_patronal, total_irg, total_net, slips_count,
    rate_set_id, rate_basis, rate_snapshot, run_type, adjustment_seq
  ) VALUES (
    v_z_a, v_user_a, v_biz_a, v_br_a, 'membership_session', 11, 2026, 'Paie Novembre 2026', 'draft',
    80000, 7200, 20800, 12000, 50800, 1,
    v_rate.id, 'versioned', jsonb_build_object('versionCode', v_rate.version_code), 'regular', 0
  );

  -- Duplicate regular run in same period must fail partial unique index
  BEGIN
    INSERT INTO public.staff_payroll_runs (
      account_id, business_id, branch_id, category, period_month, period_year, title, status,
      run_type, adjustment_seq
    ) VALUES (
      v_user_a, v_biz_a, v_br_a, 'membership_session', 11, 2026, 'Duplicate Regular', 'draft',
      'regular', 0
    );
    RAISE EXCEPTION 'Duplicate regular staff_payroll_runs unexpectedly allowed';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Regular run with adjustment_seq > 0 must fail check constraint
  BEGIN
    INSERT INTO public.staff_payroll_runs (
      account_id, business_id, branch_id, category, period_month, period_year, title, status,
      run_type, adjustment_seq
    ) VALUES (
      v_user_a, v_biz_a, v_br_a, 'membership_session', 12, 2026, 'Invalid Regular Seq', 'draft',
      'regular', 1
    );
    RAISE EXCEPTION 'Regular run with adjustment_seq = 1 unexpectedly allowed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.staff_payroll_slips (
    id, account_id, business_id, branch_id, staff_id, payroll_run_id, matricule, staff_full_name, role,
    period_month, period_year, period_label, base_salary, actual_base_salary,
    salaire_brut_cotisable, cnas_salarial, cnas_patronal, salaire_brut_imposable, irg_tax,
    acomptes_deduits, net_a_payer, payment_method, receipt_number,
    rate_set_id, rate_basis, rate_snapshot
  ) VALUES (
    v_sale_a, v_user_a, v_biz_a, v_br_a, v_staff_a, v_z_a, 'MAT-7B-01', 'Staff Step7b', 'Coach',
    11, 2026, 'Novembre 2026', 80000, 80000,
    80000, 7200, 20800, 72800, 12000,
    10000, 50800, 'cash', 'FP-2026-11-001',
    v_rate.id, 'versioned', jsonb_build_object('versionCode', v_rate.version_code)
  );

  -- Cross-tenant approve_payroll_run call must fail
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.approve_payroll_run(v_z_a, false, ARRAY[v_mv_id], NULL);
    RAISE EXCEPTION 'Tenant B unexpectedly approved Tenant A payroll run';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Tenant A approves payroll run atomically (draft -> approved, pending -> deducted)
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_seq_1 := public.approve_payroll_run(v_z_a, false, ARRAY[v_mv_id], NULL);
  IF COALESCE((v_seq_1->>'success')::boolean, false) IS NOT TRUE
     OR v_seq_1->>'status' <> 'approved' THEN
    RAISE EXCEPTION 'approve_payroll_run failed: %', v_seq_1;
  END IF;

  IF (SELECT status FROM public.staff_salary_advances WHERE id = v_mv_id) <> 'deducted' THEN
    RAISE EXCEPTION 'Expected salary advance % to be deducted after approve_payroll_run', v_mv_id;
  END IF;

  -- Approved run blocks monetary mutation and soft delete
  BEGIN
    UPDATE public.staff_payroll_runs SET total_net = 999999 WHERE id = v_z_a;
    RAISE EXCEPTION 'Approved payroll run unexpectedly allowed total_net edit';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  BEGIN
    UPDATE public.staff_payroll_slips SET net_a_payer = 999999 WHERE id = v_sale_a;
    RAISE EXCEPTION 'Approved payroll slip unexpectedly allowed net_a_payer edit';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Deducted advance cannot be deleted or reverted
  BEGIN
    UPDATE public.staff_salary_advances SET status = 'pending' WHERE id = v_mv_id;
    RAISE EXCEPTION 'Deducted salary advance unexpectedly reverted to pending';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Verify statutory_rates verify-only lock now triggers because staff_payroll_runs references v_rate.id
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  BEGIN
    UPDATE public.statutory_rates SET cnas_salarial_rate = 0.12 WHERE id = v_rate.id;
    RAISE EXCEPTION 'Referenced statutory_rates row unexpectedly allowed numeric edit';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  RESET ROLE;
END $$;

-- 10. Phase 2 (Sections 6.1 & 6.2): Unified Invoicing, Deferred Numbering,
--     Issued Immutability, Payment Allocations & Cheque Bounce Reopening
DO $$
DECLARE
  v_user_a   uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_user_b   uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_biz_a    uuid := '11111111-0000-4000-8000-000000000001';
  v_br_a     uuid := '33333333-0000-4000-8000-000000000001';
  v_doc_id   uuid := '12121212-0000-4000-8000-000000000001';
  v_pay_id   uuid := '34343434-0000-4000-8000-000000000001';
  v_res      jsonb;
  v_doc_row  public.unified_documents%ROWTYPE;
  v_pay_row  public.unified_payments%ROWTYPE;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO public.unified_documents (
    id, account_id, business_id, branch_id, source_vertical, doc_type, draft_number,
    fiscal_year, status, party_id, party_name, doc_date, payment_method, currency, fx_rate,
    total_ht_raw_centimes, total_ht_final_centimes, total_tva_centimes, timbre_fiscal_centimes,
    total_ttc_centimes, net_to_pay_centimes, paid_centimes, balance_due_centimes, items
  ) VALUES (
    v_doc_id, v_user_a, v_biz_a, v_br_a, 'trading_commercial', 'facture', 'DRAFT-2026-TEST1',
    2026, 'Draft', 'cli_1', 'SARL Atlas', '2026-11-26', 'cheque', 'DZD', 1.0,
    10000000, 10000000, 1900000, 0,
    11900000, 11900000, 0, 11900000, '[{"id":"i1","description":"Article","quantity":1,"unitPriceHt":100000,"tvaPercent":19}]'::jsonb
  );

  -- Cross-tenant issue attempt must fail
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.issue_unified_document(v_doc_id, 2026::smallint);
    RAISE EXCEPTION 'Tenant B unexpectedly issued Tenant A unified document';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Tenant A issues draft -> deferred final gap-free number allocated
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_res := public.issue_unified_document(v_doc_id, 2026::smallint);
  IF v_res->>'doc_number' <> 'FAC-2026-00001' OR v_res->>'status' <> 'Issued' THEN
    RAISE EXCEPTION 'Unexpected issue_unified_document result: %', v_res;
  END IF;

  -- Issued document blocks line/total/number tampering & delete
  BEGIN
    UPDATE public.unified_documents SET net_to_pay_centimes = 100 WHERE id = v_doc_id;
    RAISE EXCEPTION 'Issued unified_documents unexpectedly allowed financial mutation';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.unified_documents WHERE id = v_doc_id;
    RAISE EXCEPTION 'Issued unified_documents unexpectedly allowed DELETE';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Record cheque payment with idempotency key
  v_res := public.record_unified_payment_with_allocations(
    v_pay_id, v_biz_a, v_br_a, 'trading_commercial', 'cli_1', 'SARL Atlas',
    'cheque', 'inflow', 11900000, 'DZD', 1.0, '2026-11-26', 'idem-cheque-001',
    jsonb_build_array(jsonb_build_object('document_id', v_doc_id, 'allocated_centimes', 11900000)),
    NULL, 'CHQ-88412', 'BNA', '2026-12-10', 'Cheque test'
  );
  IF (v_res->>'idempotent')::boolean IS TRUE OR v_res->>'status' <> 'pending_clearance' THEN
    RAISE EXCEPTION 'Unexpected initial cheque payment result: %', v_res;
  END IF;

  SELECT * INTO v_doc_row FROM public.unified_documents WHERE id = v_doc_id;
  IF v_doc_row.status <> 'Paid' OR v_doc_row.balance_due_centimes <> 0 THEN
    RAISE EXCEPTION 'Expected Paid document after allocation, got status=% bal=%', v_doc_row.status, v_doc_row.balance_due_centimes;
  END IF;

  -- Replay same idempotency_key must NOT double-pay
  v_res := public.record_unified_payment_with_allocations(
    gen_random_uuid(), v_biz_a, v_br_a, 'trading_commercial', 'cli_1', 'SARL Atlas',
    'cheque', 'inflow', 11900000, 'DZD', 1.0, '2026-11-26', 'idem-cheque-001',
    jsonb_build_array(jsonb_build_object('document_id', v_doc_id, 'allocated_centimes', 11900000)),
    NULL, 'CHQ-88412', 'BNA', '2026-12-10', 'Cheque duplicate'
  );
  IF (v_res->>'idempotent')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected idempotent replay for duplicate key, got %', v_res;
  END IF;

  -- Transition cheque: received -> deposited -> bounced -> invoice balance reopens!
  PERFORM public.transition_cheque_traite_status(v_pay_id, 'deposited', NULL);
  v_res := public.transition_cheque_traite_status(v_pay_id, 'bounced', 'Provision insuffisante');
  IF (v_res->>'reopened_documents_count')::int <> 1 THEN
    RAISE EXCEPTION 'Expected 1 reopened document on cheque bounce, got %', v_res;
  END IF;

  SELECT * INTO v_doc_row FROM public.unified_documents WHERE id = v_doc_id;
  SELECT * INTO v_pay_row FROM public.unified_payments WHERE id = v_pay_id;
  IF v_doc_row.status <> 'Issued' OR v_doc_row.balance_due_centimes <> 11900000 OR v_pay_row.status <> 'bounced' THEN
    RAISE EXCEPTION 'Expected invoice reopened after bounce (status=%, bal=%, payStatus=%)',
      v_doc_row.status, v_doc_row.balance_due_centimes, v_pay_row.status;
  END IF;

  RESET ROLE;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 11: Phase 2 Step 2 (6.3) Shared SCF Accounting Layer (Loi 07-11)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_biz_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_br_a  uuid := '11111111-1111-1111-1111-111111111111';
  v_user_a uuid := '99999999-9999-9999-9999-999999999991';
  v_entry_id uuid := gen_random_uuid();
  v_res jsonb;
  v_entry public.journal_entries%ROWTYPE;
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claim.sub = %L', v_user_a::text);
  SET LOCAL ROLE authenticated;

  -- Seed default SCF chart of accounts
  PERFORM public.seed_scf_chart_of_accounts(v_biz_a);

  -- Unbalanced posting MUST fail (SQLSTATE 22023)
  BEGIN
    PERFORM public.post_scf_journal_entry(
      gen_random_uuid(), v_biz_a, v_br_a, 'VE', '2026-11-26', 'FAC-BAD', 'Unbalanced test',
      'trading_commercial', 'manual', NULL, 'scf-bad-1', 'DZD', 1.0,
      jsonb_build_array(
        jsonb_build_object('account_code', '411000', 'account_label', 'Clients', 'debit_centimes', 119000, 'credit_centimes', 0),
        jsonb_build_object('account_code', '700000', 'account_label', 'Ventes', 'debit_centimes', 0, 'credit_centimes', 100000)
      )
    );
    RAISE EXCEPTION 'Unbalanced SCF entry unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  -- Close period 2026-10 and confirm backdated insert into 2026-10 is blocked
  PERFORM public.set_scf_period_status(v_biz_a, '2026-10', 'closed', 'Cloture octobre test');
  BEGIN
    PERFORM public.post_scf_journal_entry(
      gen_random_uuid(), v_biz_a, v_br_a, 'OD', '2026-10-15', 'BACKDATE', 'Backdated closed test',
      'trading_commercial', 'manual', NULL, 'scf-closed-1', 'DZD', 1.0,
      jsonb_build_array(
        jsonb_build_object('account_code', '411000', 'account_label', 'Clients', 'debit_centimes', 50000, 'credit_centimes', 0),
        jsonb_build_object('account_code', '706000', 'account_label', 'Services', 'debit_centimes', 0, 'credit_centimes', 50000)
      )
    );
    RAISE EXCEPTION 'Closed period SCF insert unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Balanced posting in open period succeeds with EC-2026-XXXXX
  v_res := public.post_scf_journal_entry(
    v_entry_id, v_biz_a, v_br_a, 'VE', '2026-11-26', 'FAC-2026-00001', 'Vente B2B',
    'trading_commercial', 'sale_invoice', 'doc-1', 'scf-ok-1', 'DZD', 1.0,
    jsonb_build_array(
      jsonb_build_object('account_code', '411000', 'account_label', 'Clients', 'debit_centimes', 11900000, 'credit_centimes', 0),
      jsonb_build_object('account_code', '700000', 'account_label', 'Ventes marchandises', 'debit_centimes', 0, 'credit_centimes', 10000000),
      jsonb_build_object('account_code', '445700', 'account_label', 'TVA collectee', 'debit_centimes', 0, 'credit_centimes', 1900000)
    )
  );
  IF NOT ((v_res ->> 'entry_number') LIKE 'EC-2026-%') THEN
    RAISE EXCEPTION 'Expected EC-2026- sequence number, got %', v_res;
  END IF;

  -- Direct UPDATE on posted entry MUST fail
  BEGIN
    UPDATE public.journal_entries SET libelle = 'Tampered' WHERE id = v_entry_id;
    RAISE EXCEPTION 'Direct UPDATE on journal_entries unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  -- Reversal RPC succeeds cleanly and marks original reversed
  v_res := public.reverse_scf_journal_entry(v_entry_id, '2026-11-26', 'Erreur imputation');
  SELECT * INTO v_entry FROM public.journal_entries WHERE id = v_entry_id;
  IF v_entry.status <> 'reversed' OR v_entry.reversed_entry_id IS NULL THEN
    RAISE EXCEPTION 'Expected original entry reversed with reversed_entry_id, got status=%', v_entry.status;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 12: Phase 2 Step 3 (6.4) — Unified CRM Party Merge & Opt-Out Guard
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_acc_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_party_src uuid := gen_random_uuid();
  v_party_tgt uuid := gen_random_uuid();
  v_res jsonb;
  v_count int;
  v_target public.crm_parties%ROWTYPE;
BEGIN
  INSERT INTO public.crm_parties (
    id, account_id, business_id, branch_id, party_kind, display_name,
    phone_raw, phone_e164, opt_out_all, consent_sms
  ) VALUES
    (v_party_src, v_acc_a, v_biz_a, v_br_a, 'person', 'Amira Dup', '0661223344', '+213661223344', true, false),
    (v_party_tgt, v_acc_a, v_biz_a, v_br_a, 'person', 'Amira Cherif', '0661223344', '+213661223344', false, true);

  INSERT INTO public.crm_party_links (
    account_id, business_id, branch_id, party_id, source_vertical, entity_type, entity_id
  ) VALUES
    (v_acc_a, v_biz_a, v_br_a, v_party_src, 'membership_session', 'member', 'mem_crm_1');

  -- Tenant B cannot read Tenant A CRM parties
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.crm_parties WHERE id = v_party_tgt;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A crm_parties row';
  END IF;
  RESET ROLE;

  -- Tenant A merges v_party_src into v_party_tgt (preserves opt_out_all & migrates link)
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.merge_crm_parties(v_party_src, v_party_tgt, 'Same member profile');
  IF COALESCE((v_res ->> 'links_moved')::int, 0) <> 1 THEN
    RAISE EXCEPTION 'Expected 1 CRM link moved during merge, got %', v_res;
  END IF;

  SELECT * INTO v_target FROM public.crm_parties WHERE id = v_party_tgt;
  IF NOT v_target.opt_out_all OR v_target.consent_sms THEN
    RAISE EXCEPTION 'Expected merged CRM target to preserve opt_out_all=true and consent_sms=false';
  END IF;

  -- Communication attempt against opted-out party MUST force blocked_opt_out
  v_res := public.record_crm_communication_attempt(
    gen_random_uuid(), v_biz_a, v_br_a, v_party_tgt, NULL, 'whatsapp',
    '+213661223344', 'fr', 'Test', 'Body', '[]'::jsonb, 'sent', 'wa_gateway', NULL, NULL
  );
  IF (v_res ->> 'status') <> 'blocked_opt_out' THEN
    RAISE EXCEPTION 'Expected blocked_opt_out on opted-out party, got %', v_res;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 13: Phase 2 Step 4 (6.5) — Reminder Engine Idempotency & Opt-Out
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_rule_id uuid := gen_random_uuid();
  v_res1 jsonb;
  v_res2 jsonb;
  v_count int;
BEGIN
  INSERT INTO public.reminder_quiet_hours_configs (
    account_id, business_id, enabled, start_time, end_time, timezone, allow_in_app_during_quiet
  ) VALUES (
    v_acc_a, v_biz_a, false, '21:00', '08:00', 'Africa/Algiers', true
  )
  ON CONFLICT (business_id) WHERE deleted_at IS NULL DO NOTHING;

  INSERT INTO public.reminder_rules (
    id, account_id, business_id, branch_id, event_type, name, is_enabled, lead_days, channels
  ) VALUES (
    v_rule_id, v_acc_a, v_biz_a, v_br_a, 'membership_expiring', 'Abonnement expirant', true, 7, '["in_app","whatsapp"]'::jsonb
  );

  -- Tenant B cannot read Tenant A reminder rules
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.reminder_rules WHERE id = v_rule_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A reminder_rules';
  END IF;
  RESET ROLE;

  -- First dispatch sends; second dispatch with same idempotency_key is skipped
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res1 := public.dispatch_reminder_idempotent(
    gen_random_uuid(), v_biz_a, v_br_a, v_rule_id, 'membership_expiring',
    'member', 'mem_1', 'Amira Cherif', NULL, 'in_app',
    'rule_1:membership_expiring:mem_1:2026-12-06:in_app',
    'Abonnement expirant', 'Renouvellement proche', 'sent', NULL, NULL, NULL, NULL
  );
  IF (v_res1 ->> 'skipped')::boolean IS TRUE OR (v_res1 ->> 'status') <> 'sent' THEN
    RAISE EXCEPTION 'Expected initial dispatch_reminder_idempotent to send, got %', v_res1;
  END IF;

  v_res2 := public.dispatch_reminder_idempotent(
    gen_random_uuid(), v_biz_a, v_br_a, v_rule_id, 'membership_expiring',
    'member', 'mem_1', 'Amira Cherif', NULL, 'in_app',
    'rule_1:membership_expiring:mem_1:2026-12-06:in_app',
    'Abonnement expirant', 'Renouvellement proche', 'sent', NULL, NULL, NULL, NULL
  );
  IF (v_res2 ->> 'skipped')::boolean IS NOT TRUE OR (v_res2 ->> 'status') <> 'skipped_duplicate' THEN
    RAISE EXCEPTION 'Expected duplicate dispatch_reminder_idempotent to skip, got %', v_res2;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 14: Phase 2 Step 5 (6.6) — Shared WMS RLS, FEFO & Atomic RPCs
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_wh1 uuid := gen_random_uuid();
  v_wh2 uuid := gen_random_uuid();
  v_prod uuid := gen_random_uuid();
  v_lot_exp uuid := gen_random_uuid();
  v_lot_ok uuid := gen_random_uuid();
  v_cc_id uuid := gen_random_uuid();
  v_trf_id uuid := gen_random_uuid();
  v_res jsonb;
  v_count int;
  v_blocked boolean := false;
BEGIN
  INSERT INTO public.trading_warehouses (id, account_id, business_id, branch_id, code, name)
  VALUES (v_wh1, v_acc_a, v_biz_a, v_br_a, 'DEP-A', 'Dépôt Alger'),
         (v_wh2, v_acc_a, v_biz_a, v_br_a, 'DEP-B', 'Dépôt Oran');

  INSERT INTO public.pos_products (id, account_id, business_id, branch_id, name, stock_quantity, price_amount, cost_amount)
  VALUES (v_prod, v_acc_a, v_biz_a, v_br_a, 'Filtre Gasoil', 25, 1800, 1200);

  INSERT INTO public.wms_stock_lots (
    id, account_id, business_id, branch_id, warehouse_id, product_id, product_name,
    lot_number, expiry_date, qty_on_hand, unit_cost_centimes, recall_status
  ) VALUES
    (v_lot_exp, v_acc_a, v_biz_a, v_br_a, v_wh1, v_prod, 'Filtre Gasoil', 'LOT-EXP', CURRENT_DATE - 5, 10, 120000, 'active'),
    (v_lot_ok,  v_acc_a, v_biz_a, v_br_a, v_wh1, v_prod, 'Filtre Gasoil', 'LOT-OK',  CURRENT_DATE + 90, 15, 120000, 'active');

  -- Tenant B cannot read Tenant A WMS lots
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.wms_stock_lots WHERE id = v_lot_ok;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A wms_stock_lots';
  END IF;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;

  -- Explicit expired lot consumption MUST fail
  BEGIN
    PERFORM public.wms_atomic_consume_stock(v_biz_a, v_br_a, v_prod, 2, v_wh1, v_lot_exp, 'allow', 'SALE-EXP');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected expired lot consumption to be blocked';
  END IF;

  -- Negative stock policy = block MUST fail when qty > available
  v_blocked := false;
  BEGIN
    PERFORM public.wms_atomic_consume_stock(v_biz_a, v_br_a, v_prod, 99, v_wh1, NULL, 'block', 'SALE-NEG');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected WMS_NEGATIVE_STOCK_BLOCKED';
  END IF;

  -- FEFO valid consume picks active non-expired lot
  v_res := public.wms_atomic_consume_stock(v_biz_a, v_br_a, v_prod, 5, v_wh1, NULL, 'block', 'SALE-OK');
  IF jsonb_array_length(v_res -> 'allocations') <> 1 THEN
    RAISE EXCEPTION 'Expected 1 FEFO lot allocation, got %', v_res;
  END IF;

  -- Cycle count variance posting
  INSERT INTO public.wms_cycle_counts (id, account_id, business_id, branch_id, warehouse_id, count_number, status)
  VALUES (v_cc_id, v_acc_a, v_biz_a, v_br_a, v_wh1, 'INV-TEST-01', 'counting');
  INSERT INTO public.wms_cycle_count_lines (
    account_id, business_id, branch_id, cycle_count_id, product_id, product_name, lot_id, lot_number,
    system_qty, active_sales_delta_qty, counted_qty, unit_cost_centimes
  ) VALUES (
    v_acc_a, v_biz_a, v_br_a, v_cc_id, v_prod, 'Filtre Gasoil', v_lot_ok, 'LOT-OK',
    10, 1, 8, 120000
  );
  v_res := public.wms_post_cycle_count(v_cc_id);
  IF (v_res ->> 'status') <> 'posted' OR (v_res ->> 'totalVarianceUnits')::numeric <> -1 THEN
    RAISE EXCEPTION 'Unexpected cycle count variance result %', v_res;
  END IF;

  -- Transfer in transit dispatch -> receive
  INSERT INTO public.wms_stock_transfers (
    id, account_id, business_id, branch_id, transfer_number, from_warehouse_id, to_warehouse_id, status, items
  ) VALUES (
    v_trf_id, v_acc_a, v_biz_a, v_br_a, 'TRF-TEST-01', v_wh1, v_wh2, 'draft',
    jsonb_build_array(jsonb_build_object('productId', v_prod, 'productName', 'Filtre Gasoil', 'lotId', v_lot_ok, 'lotNumber', 'LOT-OK', 'quantity', 3))
  );
  v_res := public.wms_transition_stock_transfer(v_trf_id, 'dispatch');
  IF (v_res ->> 'status') <> 'in_transit' THEN
    RAISE EXCEPTION 'Expected in_transit, got %', v_res;
  END IF;
  v_res := public.wms_transition_stock_transfer(v_trf_id, 'receive');
  IF (v_res ->> 'status') <> 'received' THEN
    RAISE EXCEPTION 'Expected received, got %', v_res;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 15: Phase 2 Step 6 (6.7) — CSV / Excel Import RLS & Rollback RPC
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_map_id uuid := gen_random_uuid();
  v_job_id uuid := gen_random_uuid();
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.import_column_mappings (
    id, account_id, business_id, entity_type, template_name, column_map
  ) VALUES (
    v_map_id, v_acc_a, v_biz_a, 'products', 'Sage Products FR', '{"Désignation": "name", "Prix": "priceAmount"}'::jsonb
  );

  INSERT INTO public.import_jobs (
    id, account_id, business_id, entity_type, mapping_id, file_name,
    status, total_rows, valid_rows, inserted_rows, created_record_ids
  ) VALUES (
    v_job_id, v_acc_a, v_biz_a, 'products', v_map_id, 'catalogue_test.csv',
    'committed', 2, 2, 2, '["11111111-0000-0000-0000-000000000001","11111111-0000-0000-0000-000000000002"]'::jsonb
  );

  -- Tenant B must not read Tenant A import mappings or jobs
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.import_jobs WHERE id = v_job_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A import_jobs';
  END IF;
  RESET ROLE;

  -- Tenant A can mark import job rolled_back via RPC
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.mark_import_job_rolled_back(v_job_id, 'Chunk verification rollback');
  IF (v_res ->> 'status') <> 'rolled_back' OR (v_res ->> 'rolledBackCount')::int <> 2 THEN
    RAISE EXCEPTION 'Unexpected rollback RPC result %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 16: Phase 2 Step 7 (6.8) — Configurable RBAC, Sensitive Read Audit,
-- DSR Processing & 100% Public Table RLS Coverage
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_dsr_id uuid := gen_random_uuid();
  v_unprotected_count int;
  v_count int;
  v_res jsonb;
BEGIN
  -- Assert EVERY public table has RLS enabled
  SELECT count(*) INTO v_unprotected_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;
  IF v_unprotected_count <> 0 THEN
    RAISE EXCEPTION 'Found % public tables without Row Level Security enabled', v_unprotected_count;
  END IF;

  INSERT INTO public.rbac_role_permissions (
    account_id, business_id, branch_id, category, role_key, resource, action, allowed
  ) VALUES (
    v_acc_a, v_biz_a, v_br_a, 'membership_session', 'staff', 'finance', 'export', true
  );

  INSERT INTO public.data_subject_requests (
    id, account_id, business_id, branch_id, subject_type, subject_id, subject_name, request_type
  ) VALUES (
    v_dsr_id, v_acc_a, v_biz_a, v_br_a, 'patient', 'pat_sec_1', 'Karim Mansouri', 'export'
  );

  -- Tenant B must not read Tenant A RBAC matrix or DSR records
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.rbac_role_permissions WHERE business_id = v_biz_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A rbac_role_permissions';
  END IF;
  IF public.can_rbac(v_biz_a, 'finance', 'export') THEN
    RAISE EXCEPTION 'Tenant B unexpectedly passed can_rbac for Tenant A business';
  END IF;
  RESET ROLE;

  -- Tenant A owner executes sensitive read audit + dedupe + DSR export processing
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  IF NOT public.can_rbac(v_biz_a, 'rbac', 'edit') THEN
    RAISE EXCEPTION 'Tenant A owner failed can_rbac check for rbac edit';
  END IF;

  v_res := public.log_sensitive_read_event(
    v_biz_a, v_br_a, 'medical_patients', 'Karim Mansouri', 'medical_clinic', 'Doctor', now()
  );
  IF (v_res ->> 'recorded')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected initial sensitive read audit to record, got %', v_res;
  END IF;

  v_res := public.log_sensitive_read_event(
    v_biz_a, v_br_a, 'medical_patients', 'Karim Mansouri', 'medical_clinic', 'Doctor', now()
  );
  IF (v_res ->> 'recorded')::boolean IS TRUE OR (v_res ->> 'reason') <> 'DEDUPED' THEN
    RAISE EXCEPTION 'Expected duplicate sensitive read within 10s to dedupe, got %', v_res;
  END IF;

  v_res := public.process_data_subject_request(
    v_dsr_id, 'export', '{"recordCount": 3}'::jsonb, 'Owner verified export'
  );
  IF (v_res ->> 'status') <> 'exported' THEN
    RAISE EXCEPTION 'Expected DSR exported status, got %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 17: Phase 2 Step 8 (6.9) — Approvals Maker-Checker, Legal Hold
-- Attachments, Scoped SHA-256 API Keys & Idempotent Signed Webhooks
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_staff_a uuid := '33333333-1111-1111-1111-111111111111';
  v_rule_id uuid := gen_random_uuid();
  v_req_id uuid := gen_random_uuid();
  v_att_id uuid := gen_random_uuid();
  v_wh_id uuid := gen_random_uuid();
  v_blocked boolean := false;
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.platform_approval_rules (
    id, account_id, business_id, branch_id, action_scope, rule_name, threshold_centimes, require_dual_control
  ) VALUES (
    v_rule_id, v_acc_a, v_biz_a, v_br_a, 'discount', 'Discount > 10,000 DZD', 1000000, true
  );

  INSERT INTO public.platform_approval_requests (
    id, account_id, business_id, branch_id, rule_id, action_scope,
    entity_type, entity_id, entity_label, amount_centimes, reason, requested_by_staff_id
  ) VALUES (
    v_req_id, v_acc_a, v_biz_a, v_br_a, v_rule_id, 'discount',
    'invoice', 'FAC-2026-009', 'VIP Wholesale Rebate', 1500000, 'Annual commitment', v_staff_a
  );

  INSERT INTO public.platform_attachments (
    id, account_id, business_id, branch_id, entity_type, entity_id, entity_label,
    storage_path, file_name, mime_type, size_bytes, sha256, legal_hold
  ) VALUES (
    v_att_id, v_acc_a, v_biz_a, v_br_a, 'invoice', 'FAC-2026-009', 'Contract PDF',
    v_acc_a::text || '/' || v_biz_a::text || '/contract.pdf', 'contract.pdf', 'application/pdf', 24576,
    repeat('a', 64), true
  );

  INSERT INTO public.platform_webhooks (
    id, account_id, business_id, branch_id, label, endpoint_url,
    signing_secret_masked, signing_secret_hash
  ) VALUES (
    v_wh_id, v_acc_a, v_biz_a, v_br_a, 'ERP Webhook', 'https://hooks.example.dz/events',
    'whsec_••••9999', repeat('b', 64)
  );

  -- Tenant B must not read Tenant A approvals, attachments, or webhooks
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.platform_approval_requests WHERE id = v_req_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A platform_approval_requests';
  END IF;
  RESET ROLE;

  -- Tenant A: purge of legal-hold attachment MUST be blocked; webhook delivery MUST dedupe
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_blocked := false;
  BEGIN
    PERFORM public.purge_expired_platform_attachment(v_att_id);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected legal hold attachment purge to be blocked';
  END IF;

  v_res := public.dispatch_webhook_delivery_idempotent(
    v_wh_id, 'invoice.issued', 'idem_wh_001', '{"invoice":"FAC-2026-009"}'::jsonb,
    't=1700000000,v1=' || repeat('c', 64), 'delivered', 200, 'OK'
  );
  IF (v_res ->> 'deduped')::boolean IS TRUE THEN
    RAISE EXCEPTION 'Expected first webhook dispatch not to be deduped';
  END IF;

  v_res := public.dispatch_webhook_delivery_idempotent(
    v_wh_id, 'invoice.issued', 'idem_wh_001', '{"invoice":"FAC-2026-009"}'::jsonb,
    't=1700000000,v1=' || repeat('c', 64), 'delivered', 200, 'OK'
  );
  IF (v_res ->> 'deduped')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Expected duplicate webhook idempotency key to dedupe';
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 18: Phase 2 Step 9 (6.10) — Unified BI KPI Registry & Snapshot RPC
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_kpi_id uuid := gen_random_uuid();
  v_rep_id uuid := gen_random_uuid();
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.bi_kpi_definitions (
    id, account_id, business_id, kpi_code, category,
    label_en, label_fr, label_ar, formula_spec, unit_type, target_value
  ) VALUES (
    v_kpi_id, v_acc_a, v_biz_a, 'gross_invoiced_revenue', 'revenue',
    'Gross Invoiced Revenue', 'Chiffre d''affaires facturé', 'الإيرادات المفوترة',
    'SUM(issued_invoices - credit_notes) + unbridged_sales', 'centimes', 10000000
  );

  INSERT INTO public.bi_saved_reports (
    id, account_id, business_id, branch_id, title, report_type,
    kpi_codes, date_range_preset, compare_previous_period
  ) VALUES (
    v_rep_id, v_acc_a, v_biz_a, v_br_a, 'Monthly Executive Digest', 'executive_overview',
    '["gross_invoiced_revenue","cash_collections"]'::jsonb, '30d', true
  );

  -- Tenant B must not read Tenant A BI KPI definitions or saved reports
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.bi_saved_reports WHERE id = v_rep_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A bi_saved_reports';
  END IF;
  RESET ROLE;

  -- Tenant A owner records BI report snapshot atomically
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.record_bi_report_snapshot(
    v_biz_a,
    v_br_a,
    v_rep_id,
    'Monthly Executive Digest — Nov 2026',
    CURRENT_DATE - 30,
    CURRENT_DATE,
    CURRENT_DATE - 60,
    CURRENT_DATE - 31,
    '{"gross_invoiced_revenue": 2500000}'::jsonb,
    '[{"branchId": "22222222-2222-2222-2222-222222222222", "revenueCentimes": 2500000}]'::jsonb,
    '[{"bucket": "current", "amountCentimes": 400000}]'::jsonb
  );
  IF (v_res ->> 'snapshot_id') IS NULL THEN
    RAISE EXCEPTION 'Expected snapshot_id from record_bi_report_snapshot, got %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 19: Phase 3 Step 1 (7.1) — Membership Freeze Logs, Trainer
-- Commissions RLS & Transactional Waitlist Promotion RPC
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_staff_a uuid := '33333333-1111-1111-1111-111111111111';
  v_mem_1 uuid := gen_random_uuid();
  v_mem_2 uuid := gen_random_uuid();
  v_ev_id uuid := gen_random_uuid();
  v_enr_1 uuid := gen_random_uuid();
  v_enr_2 uuid := gen_random_uuid();
  v_freeze_id uuid := gen_random_uuid();
  v_comm_id uuid := gen_random_uuid();
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.gym_members (
    id, account_id, business_id, branch_id, full_name, status,
    start_date, expiration_date, remaining_sessions, auto_renew, family_group_id, family_role
  ) VALUES
    (v_mem_1, v_acc_a, v_biz_a, v_br_a, 'Member One', 'Active', CURRENT_DATE, CURRENT_DATE + 30, 12, true, 'FAM-001', 'primary'),
    (v_mem_2, v_acc_a, v_biz_a, v_br_a, 'Member Two', 'Active', CURRENT_DATE, CURRENT_DATE + 30, 12, false, 'FAM-001', 'dependent');

  INSERT INTO public.gym_schedule_events (
    id, account_id, business_id, branch_id, title, day_of_week, start_time, end_time, capacity, enrolled_count
  ) VALUES (
    v_ev_id, v_acc_a, v_biz_a, v_br_a, 'HIIT Elite', 1, '18:00', '19:00', 1, 1
  );

  INSERT INTO public.gym_class_enrollments (
    id, account_id, business_id, branch_id, event_id, member_id, member_name, status, enrolled_at
  ) VALUES
    (v_enr_1, v_acc_a, v_biz_a, v_br_a, v_ev_id, v_mem_1, 'Member One', 'enrolled', now() - interval '1 hour'),
    (v_enr_2, v_acc_a, v_biz_a, v_br_a, v_ev_id, v_mem_2, 'Member Two', 'waitlisted', now());

  INSERT INTO public.gym_member_freeze_logs (
    id, account_id, business_id, branch_id, member_id, action, days_frozen, fee_centimes
  ) VALUES (
    v_freeze_id, v_acc_a, v_biz_a, v_br_a, v_mem_1, 'freeze', 7, 100000
  );

  INSERT INTO public.gym_trainer_commissions (
    id, account_id, business_id, branch_id, staff_id, member_id, schedule_event_id,
    source_label, gross_amount_centimes, commission_rate_bps, commission_centimes
  ) VALUES (
    v_comm_id, v_acc_a, v_biz_a, v_br_a, v_staff_a, v_mem_1, v_ev_id,
    'HIIT Elite Coaching', 500000, 1500, 75000
  );

  -- Tenant B must not read Tenant A freeze logs or trainer commissions
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.gym_member_freeze_logs WHERE id = v_freeze_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A gym_member_freeze_logs';
  END IF;
  SELECT count(*) INTO v_count FROM public.gym_trainer_commissions WHERE id = v_comm_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A gym_trainer_commissions';
  END IF;
  RESET ROLE;

  -- Tenant A cancels enrolled seat -> auto-promotes waitlisted member
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.cancel_and_promote_gym_class_enrollment(v_enr_1);
  IF (v_res ->> 'promoted_id')::uuid <> v_enr_2 THEN
    RAISE EXCEPTION 'Expected waitlisted enrollment % to promote, got %', v_enr_2, v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION 20: Phase 3 Step 2 (7.2) — Appointment Service Depth RLS & RPCs
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_biz_a uuid := '11111111-1111-1111-1111-111111111111';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_staff_a uuid := '33333333-1111-1111-1111-111111111111';
  v_client_id uuid := gen_random_uuid();
  v_apt_id uuid := gen_random_uuid();
  v_pkg_id uuid := gen_random_uuid();
  v_gc_id uuid := gen_random_uuid();
  v_consent_id uuid := gen_random_uuid();
  v_hammam_id uuid := gen_random_uuid();
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.salon_clients (
    id, account_id, business_id, branch_id, full_name, client_type
  ) VALUES (
    v_client_id, v_acc_a, v_biz_a, v_br_a, 'Walkin Amira', 'walkin'
  );

  INSERT INTO public.salon_appointments (
    id, account_id, business_id, branch_id, client_id, client_name, staff_name, service_name,
    appointment_date, start_time, end_time, duration_minutes, price, status,
    deposit_centimes, deposit_status, cancellation_cutoff_hours
  ) VALUES (
    v_apt_id, v_acc_a, v_biz_a, v_br_a, v_client_id, 'Walkin Amira', 'Lina', 'Laser Session',
    CURRENT_DATE + 3, '14:00', '15:00', 60, 4500, 'Confirmed',
    150000, 'held', 24
  );

  INSERT INTO public.salon_prepaid_packages (
    id, account_id, business_id, branch_id, client_id, client_name, package_name,
    total_sessions, remaining_sessions, price_centimes
  ) VALUES (
    v_pkg_id, v_acc_a, v_biz_a, v_br_a, v_client_id, 'Walkin Amira', 'Pack 5 Brushing',
    5, 5, 600000
  );

  INSERT INTO public.salon_gift_cards (
    id, account_id, business_id, branch_id, code, recipient_name, initial_centimes, remaining_centimes
  ) VALUES (
    v_gc_id, v_acc_a, v_biz_a, v_br_a, 'GIFT-72-TEST', 'Walkin Amira', 500000, 500000
  );

  INSERT INTO public.salon_consent_forms (
    id, account_id, business_id, branch_id, client_id, client_name, service_name,
    protocol_type, allergies_acknowledged, signature_data_url
  ) VALUES (
    v_consent_id, v_acc_a, v_biz_a, v_br_a, v_client_id, 'Walkin Amira', 'Laser Session',
    'laser', true, 'data:image/png;base64,iVBORw0KGgo='
  );

  INSERT INTO public.salon_hammam_sessions (
    id, account_id, business_id, branch_id, cabin_name, gender_block, client_id, client_name,
    attendant_id, attendant_name, session_date, start_time, end_time, capacity, booked_count, price_centimes
  ) VALUES (
    v_hammam_id, v_acc_a, v_biz_a, v_br_a, 'Hammam Royal 1', 'women', v_client_id, 'Walkin Amira',
    v_staff_a, 'Lina', CURRENT_DATE + 1, '16:00', '17:00', 2, 1, 350000
  );

  -- Tenant B must not read Tenant A salon 7.2 records
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.salon_prepaid_packages WHERE id = v_pkg_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A salon_prepaid_packages';
  END IF;
  SELECT count(*) INTO v_count FROM public.salon_gift_cards WHERE id = v_gc_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A salon_gift_cards';
  END IF;
  SELECT count(*) INTO v_count FROM public.salon_consent_forms WHERE id = v_consent_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A salon_consent_forms';
  END IF;
  SELECT count(*) INTO v_count FROM public.salon_hammam_sessions WHERE id = v_hammam_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A salon_hammam_sessions';
  END IF;
  RESET ROLE;

  -- Tenant A cancels > 24h before appointment -> held deposit refunds cleanly
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.cancel_salon_appointment_with_deposit(v_apt_id, now(), 'Cancelled');
  IF (v_res ->> 'deposit_status') <> 'refunded' OR (v_res ->> 'refunded_deposit_centimes')::bigint <> 150000 THEN
    RAISE EXCEPTION 'Expected refunded deposit 150000, got %', v_res;
  END IF;

  -- Tenant A redeems 1 package session + 200000 gift card centimes atomically
  v_res := public.redeem_salon_package_or_gift_card(v_pkg_id, v_gc_id, 200000);
  IF (v_res ->> 'package_remaining_sessions')::int <> 4 OR (v_res ->> 'gift_card_applied_centimes')::bigint <> 200000 THEN
    RAISE EXCEPTION 'Expected package=4 and gift=200000, got %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- 21. Phase 3 Step 3 (7.3 pos_inventory): Floor tables, KDS snapshots/transfers,
--     Manager-PIN voids, Carnet de dettes, Optical prescriptions & Tenant RLS
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := '11111111-1111-1111-1111-111111111111';
  v_biz_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_tbl1_id uuid := gen_random_uuid();
  v_tbl2_id uuid := gen_random_uuid();
  v_kds_id uuid := gen_random_uuid();
  v_carnet_id uuid := gen_random_uuid();
  v_rx_id uuid := gen_random_uuid();
  v_count int;
  v_res jsonb;
BEGIN
  INSERT INTO public.pos_floor_tables (
    id, account_id, business_id, branch_id, table_code, label, zone, seats, status
  ) VALUES
    (v_tbl1_id, v_acc_a, v_biz_a, v_br_a, 'T-73-1', 'Table 1', 'Terrace', 4, 'available'),
    (v_tbl2_id, v_acc_a, v_biz_a, v_br_a, 'T-73-2', 'Table 2', 'Main Hall', 6, 'available');

  INSERT INTO public.pos_kitchen_orders (
    id, account_id, business_id, branch_id, order_number, order_channel,
    table_id, table_label, kds_status, revision, current_items, subtotal_centimes, total_centimes
  ) VALUES (
    v_kds_id, v_acc_a, v_biz_a, v_br_a, 'KDS-73-001', 'dine_in',
    v_tbl1_id, 'Table 1', 'draft', 1, '[{"productName":"Pizza Margherita","quantity":2,"unitPriceDzd":1200}]'::jsonb, 240000, 240000
  );

  INSERT INTO public.pos_optical_prescriptions (
    id, account_id, business_id, branch_id, customer_name, od_sphere, od_axis, os_sphere, os_axis, pd_mm, lab_status
  ) VALUES (
    v_rx_id, v_acc_a, v_biz_a, v_br_a, 'Karim Optics', -1.25, 90, -1.50, 85, 63.0, 'measured'
  );

  -- Tenant B must not read Tenant A POS 7.3 records
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.pos_floor_tables WHERE id = v_tbl1_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A pos_floor_tables';
  END IF;
  SELECT count(*) INTO v_count FROM public.pos_kitchen_orders WHERE id = v_kds_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A pos_kitchen_orders';
  END IF;
  SELECT count(*) INTO v_count FROM public.pos_optical_prescriptions WHERE id = v_rx_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A pos_optical_prescriptions';
  END IF;
  RESET ROLE;

  -- Tenant A sends kitchen order -> occupies Table 1 & snapshots revision 1
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.pos_send_kitchen_order(
    v_kds_id,
    v_tbl1_id,
    '[{"productName":"Pizza Margherita","quantity":2,"unitPriceDzd":1200}]'::jsonb,
    '[]'::jsonb,
    'No olives'
  );
  IF (v_res ->> 'kds_status') <> 'sent' OR (v_res ->> 'revision')::int <> 1 THEN
    RAISE EXCEPTION 'Expected sent rev 1, got %', v_res;
  END IF;

  -- Transfer order from Table 1 to Table 2 atomically
  v_res := public.pos_transfer_table_order(v_kds_id, v_tbl2_id);
  IF (v_res ->> 'to_table_id')::uuid <> v_tbl2_id THEN
    RAISE EXCEPTION 'Expected transfer to Table 2, got %', v_res;
  END IF;

  -- Record Carnet de dettes charge
  v_res := public.pos_record_carnet_entry(
    v_biz_a, v_br_a, NULL, 'Client Carnet A', 'charge', 180000, 'CARNET-73-1', 'Credit', NULL, NULL, 'Weekly groceries'
  );
  IF (v_res ->> 'amount_centimes')::bigint <> 180000 THEN
    RAISE EXCEPTION 'Expected carnet amount 180000, got %', v_res;
  END IF;

  -- Manager PIN void releases Table 2 back to available
  v_res := public.pos_void_kitchen_or_sale_order('kitchen_order', v_kds_id, 'Customer left', true, NULL);
  IF (v_res ->> 'status') <> 'voided' THEN
    RAISE EXCEPTION 'Expected voided kitchen order, got %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- 22. Phase 3 Step 4 (7.4 project_milestone): Multi-currency, Timesheets,
--     Client Portal Revision Loop Cap RPC & Partial-Approval Milestone Billing
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := '11111111-1111-1111-1111-111111111111';
  v_biz_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_br_a  uuid := '22222222-2222-2222-2222-222222222222';
  v_user_a uuid := '99999999-1111-1111-1111-111111111111';
  v_user_b uuid := '99999999-2222-2222-2222-222222222222';
  v_proj_id uuid := gen_random_uuid();
  v_ms_id uuid := gen_random_uuid();
  v_bat_id uuid := gen_random_uuid();
  v_ts_id uuid := gen_random_uuid();
  v_count int;
  v_blocked boolean := false;
  v_res jsonb;
BEGIN
  INSERT INTO public.pm_projects (
    id, account_id, business_id, branch_id, client_name, title, scope_of_work,
    budget_cap_dzd, max_field_expenses_dzd, target_gross_margin_percent,
    start_date, end_date, kv_deadline, print_deadline, execution_start_date,
    project_manager_name, lead_creative_name, status,
    currency, fx_rate_to_dzd, budget_alert_threshold_pct, is_non_print_preset, max_revision_loops
  ) VALUES (
    v_proj_id, v_acc_a, v_biz_a, v_br_a, 'Client SaaS DZ', 'Platform Launch', 'Web & App Rollout',
    2900000, 300000, 35,
    CURRENT_DATE, CURRENT_DATE + 30, CURRENT_DATE + 7, CURRENT_DATE + 14, CURRENT_DATE + 15,
    'Rami PM', 'Lina Crea', 'production',
    'EUR', 145.0000, 85, true, 2
  );

  INSERT INTO public.pm_milestones (
    id, account_id, business_id, branch_id, project_id, title, phase, target_date,
    is_completed, assigned_role, start_date, amount_dzd, billing_pct, approval_status, approved_pct
  ) VALUES (
    v_ms_id, v_acc_a, v_biz_a, v_br_a, v_proj_id, 'Design & UX Lot 1', 'concept_kv', CURRENT_DATE + 10,
    false, 'crea', CURRENT_DATE, 1000000, 40, 'pending', 0
  );

  INSERT INTO public.pm_bat_deliverables (
    id, account_id, business_id, branch_id, project_id, project_title, title,
    file_format, color_space, resolution_dpi, bleed_mm, has_bleed_included,
    version, version_code, preview_url, file_size_bytes, uploaded_by_creative_id, uploaded_by_creative_name,
    approval_status, revision_count, max_revision_loops, deliverable_kind
  ) VALUES (
    v_bat_id, v_acc_a, v_biz_a, v_br_a, v_proj_id, 'Platform Launch', 'Homepage Prototype v1',
    'pdf', 'RVB', 150, 0, false,
    1, 'v1', 'https://example.dz/proto.pdf', 102400, v_user_a, 'Lina Crea',
    'pending_review', 1, 2, 'digital_asset'
  );

  INSERT INTO public.pm_timesheets (
    id, account_id, business_id, branch_id, project_id, project_title, milestone_id,
    staff_name, work_date, hours_worked, capacity_hours, billable, hourly_cost_dzd, hourly_bill_dzd, task_summary
  ) VALUES (
    v_ts_id, v_acc_a, v_biz_a, v_br_a, v_proj_id, 'Platform Launch', v_ms_id,
    'Yacine Dev', CURRENT_DATE, 6.5, 8, true, 2500, 6000, 'Frontend architecture sprint'
  );

  -- Tenant B must not read Tenant A pm_timesheets or pm_projects
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.pm_timesheets WHERE id = v_ts_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A pm_timesheets';
  END IF;
  RESET ROLE;

  -- Tenant A exercises revision loop cap + override + partial milestone billing RPC
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;

  -- Round 2 allowed (1 -> 2, max = 2)
  v_res := public.pm_record_deliverable_review_with_limit(
    v_bat_id, 'Client Contact', 'revision_requested', 'Adjust hero spacing', false
  );
  IF (v_res ->> 'revision_count')::int <> 2 THEN
    RAISE EXCEPTION 'Expected revision_count=2, got %', v_res;
  END IF;

  -- Round 3 MUST block when p_override_limit = false
  v_blocked := false;
  BEGIN
    PERFORM public.pm_record_deliverable_review_with_limit(
      v_bat_id, 'Client Contact', 'revision_requested', 'One more tweak', false
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected revision loop beyond max_revision_loops to fail';
  END IF;

  -- Over-billing above approved_pct (50% of 1,000,000 = 500,000) MUST block
  v_blocked := false;
  BEGIN
    PERFORM public.pm_approve_milestone_for_billing(v_ms_id, 50, NULL, 700000);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected milestone over-billing beyond approved_pct to fail';
  END IF;

  v_res := public.pm_approve_milestone_for_billing(v_ms_id, 50, NULL, 500000);
  IF (v_res ->> 'approval_status') <> 'partial_approved' THEN
    RAISE EXCEPTION 'Expected partial_approved status, got %', v_res;
  END IF;
  RESET ROLE;
END $$;

-- ============================================================================
-- 23. Phase 3 Step 5 (7.5 rental_booking): GiST Double-Booking Exclusion,
--     Tenant B RLS Isolation, Deposit Deduction Cap & Coworking Consumption RPC
-- ============================================================================
DO $$
DECLARE
  v_acc_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_biz_a uuid := '11111111-0000-4000-8000-000000000001';
  v_br_a  uuid := '33333333-0000-4000-8000-000000000001';
  v_user_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_user_b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_unit_id uuid := gen_random_uuid();
  v_renter_id uuid := gen_random_uuid();
  v_bk_1 uuid := gen_random_uuid();
  v_bk_2 uuid := gen_random_uuid();
  v_dep_id uuid := gen_random_uuid();
  v_rule_id uuid := gen_random_uuid();
  v_sub_id uuid := gen_random_uuid();
  v_count int;
  v_blocked boolean := false;
  v_res jsonb;
BEGIN
  INSERT INTO public.rental_units (
    id, account_id, business_id, branch_id, name, code, type, rental_mode,
    capacity, hourly_rate, daily_rate, weekend_multiplier
  ) VALUES (
    v_unit_id, v_acc_a, v_biz_a, v_br_a, 'Salle Zighoud', 'HAL-75', 'Hall', 'venue',
    180, 12000, 90000, 1.2
  );

  INSERT INTO public.rental_renters (
    id, account_id, business_id, branch_id, full_name, email, phone, driver_license_number
  ) VALUES (
    v_renter_id, v_acc_a, v_biz_a, v_br_a, 'Karim Event', 'karim@event.dz', '+213550750000', 'DL-16-99402'
  );

  INSERT INTO public.rental_pricing_rules (
    id, account_id, business_id, branch_id, name, unit_type, weekend_multiplier, seasonal_multiplier
  ) VALUES (
    v_rule_id, v_acc_a, v_biz_a, v_br_a, 'Weekend Peak', 'Hall', 1.25, 1.1
  );

  INSERT INTO public.rental_coworking_subscriptions (
    id, account_id, business_id, branch_id, renter_id, renter_name,
    plan_name, plan_kind, included_hours, used_hours, monthly_fee_dzd, start_date, end_date, status
  ) VALUES (
    v_sub_id, v_acc_a, v_biz_a, v_br_a, v_renter_id, 'Karim Event',
    'Flex 10h Pack', 'hour_pack', 10, 8, 8000, CURRENT_DATE, CURRENT_DATE + 30, 'active'
  );

  -- Tenant B must NOT read Tenant A pricing rules or coworking subscriptions
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.rental_pricing_rules WHERE id = v_rule_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A rental_pricing_rules';
  END IF;
  SELECT count(*) INTO v_count FROM public.rental_coworking_subscriptions WHERE id = v_sub_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B unexpectedly read Tenant A rental_coworking_subscriptions';
  END IF;
  RESET ROLE;

  -- Tenant A books overnight slot 18:00 -> +1 day 02:00
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;
  v_res := public.upsert_rental_booking_atomic(
    v_bk_1, v_acc_a, v_biz_a, v_br_a, v_unit_id, 'Salle Zighoud', 'Hall',
    v_renter_id, 'Karim Event', '+213550750000', 'Wedding Reception',
    (CURRENT_DATE + 5)::timestamptz + interval '18 hours',
    (CURRENT_DATE + 6)::timestamptz + interval '2 hours',
    'Confirmed', 120000, 40000, '[]'::jsonb
  );
  IF (v_res ->> 'duration_hours')::numeric <> 8 THEN
    RAISE EXCEPTION 'Expected overnight duration_hours=8, got %', v_res;
  END IF;

  -- Overlapping booking on same unit MUST fail via GiST/overlap guard
  v_blocked := false;
  BEGIN
    PERFORM public.upsert_rental_booking_atomic(
      v_bk_2, v_acc_a, v_biz_a, v_br_a, v_unit_id, 'Salle Zighoud', 'Hall',
      v_renter_id, 'Concurrent Client', '+213550750001', 'Conflict Test',
      (CURRENT_DATE + 5)::timestamptz + interval '21 hours',
      (CURRENT_DATE + 6)::timestamptz + interval '1 hour',
      'Confirmed', 50000, 10000, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected overlapping booking on same unit to fail';
  END IF;

  RESET ROLE;

  -- Deposit deduction exceeding held deposit MUST block; valid partial deduction succeeds
  INSERT INTO public.rental_security_deposits (
    id, account_id, business_id, branch_id, booking_id, renter_name, unit_name,
    amount, original_amount, deducted_amount, payment_method, status
  ) VALUES (
    v_dep_id, v_acc_a, v_biz_a, v_br_a, v_bk_1, 'Karim Event', 'Salle Zighoud',
    40000, 40000, 0, 'Cash', 'Held'
  );

  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SET LOCAL ROLE authenticated;

  v_blocked := false;
  BEGIN
    PERFORM public.settle_rental_deposit_atomic(v_dep_id, 'deduct', 55000, 'Overheld claim');
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected deposit deduction > held amount to fail';
  END IF;

  v_res := public.settle_rental_deposit_atomic(v_dep_id, 'deduct', 15000, 'Sound cable damaged');
  IF (v_res ->> 'deducted_amount')::numeric <> 15000 THEN
    RAISE EXCEPTION 'Expected deducted_amount=15000, got %', v_res;
  END IF;

  -- Coworking hours consumption: 2h ok, another 1h blocked
  v_res := public.consume_coworking_subscription_hours(v_sub_id, 2);
  IF (v_res ->> 'remaining_hours')::numeric <> 0 THEN
    RAISE EXCEPTION 'Expected remaining_hours=0, got %', v_res;
  END IF;
  v_blocked := false;
  BEGIN
    PERFORM public.consume_coworking_subscription_hours(v_sub_id, 1);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Expected coworking over-consumption to fail';
  END IF;

  RESET ROLE;
END $$;

ROLLBACK;
