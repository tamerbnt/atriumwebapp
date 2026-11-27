-- ============================================================================
-- Atrium Phase 2 Migration (Step 9): Section 6.10 Unified BI KPI Registry,
-- Cross-Vertical Executive Reports, Branch Comparisons & Snapshot Scheduling
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.10a Canonical BI KPI Definitions (`bi_kpi_definitions`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bi_kpi_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  kpi_code text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('revenue', 'collections', 'receivables', 'inventory', 'workforce', 'operations')),
  label_en text NOT NULL,
  label_fr text NOT NULL,
  label_ar text NOT NULL,
  formula_spec text NOT NULL,
  unit_type text NOT NULL
    CHECK (unit_type IN ('centimes', 'count', 'percent', 'days')),
  source_tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_value numeric(16,2),
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bi_kpi_definitions_scope_code
  ON public.bi_kpi_definitions (
    account_id,
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    kpi_code
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bi_kpi_definitions_biz
  ON public.bi_kpi_definitions (business_id, category)
  WHERE deleted_at IS NULL;

ALTER TABLE public.bi_kpi_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_kpi_definitions_tenant_read" ON public.bi_kpi_definitions;
CREATE POLICY "bi_kpi_definitions_tenant_read"
  ON public.bi_kpi_definitions
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "bi_kpi_definitions_owner_write" ON public.bi_kpi_definitions;
CREATE POLICY "bi_kpi_definitions_owner_write"
  ON public.bi_kpi_definitions
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.is_tenant_admin())
  );

-- ----------------------------------------------------------------------------
-- 6.10b Saved & Scheduled BI Reports (`bi_saved_reports`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bi_saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  title text NOT NULL,
  report_type text NOT NULL
    CHECK (report_type IN ('executive_overview', 'receivables_aging', 'inventory_valuation', 'workforce_payroll', 'branch_comparison')),
  kpi_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_range_preset text NOT NULL DEFAULT '30d'
    CHECK (date_range_preset IN ('today', '7d', '30d', '90d', 'ytd', 'custom')),
  compare_previous_period boolean NOT NULL DEFAULT true,
  schedule_cron text,
  schedule_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_dispatched_at timestamptz,
  created_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bi_saved_reports_biz
  ON public.bi_saved_reports (business_id, report_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.bi_saved_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_saved_reports_tenant_read" ON public.bi_saved_reports;
CREATE POLICY "bi_saved_reports_tenant_read"
  ON public.bi_saved_reports
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (business_id IS NULL OR (SELECT public.has_business_access(business_id)))
    AND (branch_id IS NULL OR (SELECT public.has_branch_access(business_id, branch_id)))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "bi_saved_reports_owner_write" ON public.bi_saved_reports;
CREATE POLICY "bi_saved_reports_owner_write"
  ON public.bi_saved_reports
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.can_rbac(business_id, 'analytics', 'view'))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.can_rbac(business_id, 'analytics', 'view'))
  );

-- ----------------------------------------------------------------------------
-- 6.10c Immutable Point-in-Time Report Snapshots (`bi_report_snapshots`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bi_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.bi_saved_reports(id) ON DELETE SET NULL,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  previous_period_start date NOT NULL,
  previous_period_end date NOT NULL,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  branch_breakdown_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  aging_buckets_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bi_report_snapshots_biz_created
  ON public.bi_report_snapshots (business_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.bi_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_report_snapshots_tenant_read" ON public.bi_report_snapshots;
CREATE POLICY "bi_report_snapshots_tenant_read"
  ON public.bi_report_snapshots
  FOR SELECT
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (business_id IS NULL OR (SELECT public.has_business_access(business_id)))
    AND (branch_id IS NULL OR (SELECT public.has_branch_access(business_id, branch_id)))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "bi_report_snapshots_authorized_write" ON public.bi_report_snapshots;
CREATE POLICY "bi_report_snapshots_authorized_write"
  ON public.bi_report_snapshots
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.can_rbac(business_id, 'analytics', 'view'))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND (SELECT public.can_rbac(business_id, 'analytics', 'view'))
  );

-- ----------------------------------------------------------------------------
-- 6.10d Transactional Snapshot Recorder RPC & Audit Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_bi_report_snapshot(
  p_business_id uuid,
  p_branch_id uuid,
  p_report_id uuid,
  p_title text,
  p_period_start date,
  p_period_end date,
  p_previous_period_start date,
  p_previous_period_end date,
  p_metrics_json jsonb DEFAULT '{}'::jsonb,
  p_branch_breakdown_json jsonb DEFAULT '[]'::jsonb,
  p_aging_buckets_json jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_snapshot_id uuid;
BEGIN
  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT public.can_rbac(p_business_id, 'analytics', 'view') THEN
    RAISE EXCEPTION 'RBAC_DENIED: analytics.view required';
  END IF;

  INSERT INTO public.bi_report_snapshots (
    account_id,
    business_id,
    branch_id,
    report_id,
    title,
    period_start,
    period_end,
    previous_period_start,
    previous_period_end,
    metrics_json,
    branch_breakdown_json,
    aging_buckets_json,
    generated_by_staff_id
  )
  VALUES (
    v_account_id,
    p_business_id,
    p_branch_id,
    p_report_id,
    COALESCE(NULLIF(trim(p_title), ''), 'Executive BI Snapshot'),
    p_period_start,
    p_period_end,
    p_previous_period_start,
    p_previous_period_end,
    COALESCE(p_metrics_json, '{}'::jsonb),
    COALESCE(p_branch_breakdown_json, '[]'::jsonb),
    COALESCE(p_aging_buckets_json, '[]'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_snapshot_id;

  IF p_report_id IS NOT NULL THEN
    UPDATE public.bi_saved_reports
    SET last_dispatched_at = now(),
        updated_at = now(),
        version = version + 1
    WHERE id = p_report_id
      AND business_id = p_business_id
      AND deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'business_id', p_business_id,
    'recorded_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_bi_report_snapshot(uuid, uuid, uuid, text, date, date, date, date, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_bi_report_snapshot(uuid, uuid, uuid, text, date, date, date, date, jsonb, jsonb, jsonb) TO authenticated;

DO $$
DECLARE
  v_tbl text;
BEGIN
  IF to_regprocedure('public.fn_audit_log_mutation()') IS NOT NULL THEN
    FOREACH v_tbl IN ARRAY ARRAY[
      'bi_kpi_definitions',
      'bi_saved_reports',
      'bi_report_snapshots'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl AND t.tgname = 'trg_audit_' || v_tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_mutation()',
          v_tbl,
          v_tbl
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
