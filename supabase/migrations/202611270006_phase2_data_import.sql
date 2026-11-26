-- ============================================================================
-- Atrium Phase 2 Migration (Step 6): Section 6.7 CSV / Excel Import Engine
--   - `import_column_mappings`: saved reusable column mapping presets per business
--   - `import_jobs`: chunked import job audit log, dry-run summary, and rollback IDs
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 6.7a Saved Column Mapping Templates (`import_column_mappings`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  entity_type text NOT NULL
    CHECK (
      entity_type IN (
        'members',
        'clients',
        'patients',
        'products',
        'suppliers',
        'staff',
        'vehicles',
        'parcels',
        'properties',
        'students'
      )
    ),
  template_name text NOT NULL,
  encoding text NOT NULL DEFAULT 'auto'
    CHECK (encoding IN ('auto', 'utf-8', 'utf-16le', 'windows-1256', 'iso-8859-1')),
  delimiter text NOT NULL DEFAULT 'auto'
    CHECK (delimiter IN ('auto', ',', ';', E'\t')),
  duplicate_policy text NOT NULL DEFAULT 'skip'
    CHECK (duplicate_policy IN ('skip', 'update', 'merge')),
  column_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_staff_id uuid,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_import_column_mappings_active
  ON public.import_column_mappings (business_id, entity_type, template_name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_import_column_mappings_biz
  ON public.import_column_mappings (business_id, entity_type)
  WHERE deleted_at IS NULL;

ALTER TABLE public.import_column_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_column_mappings_tenant_access" ON public.import_column_mappings;
CREATE POLICY "import_column_mappings_tenant_access"
  ON public.import_column_mappings
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  );

-- ----------------------------------------------------------------------------
-- 6.7b Chunked Import Jobs & Audit Ledger (`import_jobs`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  entity_type text NOT NULL
    CHECK (
      entity_type IN (
        'members',
        'clients',
        'patients',
        'products',
        'suppliers',
        'staff',
        'vehicles',
        'parcels',
        'properties',
        'students'
      )
    ),
  mapping_id uuid REFERENCES public.import_column_mappings(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  encoding text NOT NULL DEFAULT 'utf-8',
  delimiter text NOT NULL DEFAULT ',',
  duplicate_policy text NOT NULL DEFAULT 'skip'
    CHECK (duplicate_policy IN ('skip', 'update', 'merge')),
  status text NOT NULL DEFAULT 'previewed'
    CHECK (
      status IN (
        'previewed',
        'dry_run',
        'committing',
        'committed',
        'rolled_back',
        'partial_failed',
        'failed'
      )
    ),
  total_rows int NOT NULL DEFAULT 0,
  valid_rows int NOT NULL DEFAULT 0,
  inserted_rows int NOT NULL DEFAULT 0,
  updated_rows int NOT NULL DEFAULT 0,
  merged_rows int NOT NULL DEFAULT 0,
  skipped_rows int NOT NULL DEFAULT 0,
  error_rows int NOT NULL DEFAULT 0,
  chunk_size int NOT NULL DEFAULT 500,
  chunks_total int NOT NULL DEFAULT 0,
  chunks_committed int NOT NULL DEFAULT 0,
  error_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_record_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by_staff_id uuid,
  created_by_name text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_biz_created
  ON public.import_jobs (business_id, created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_jobs_tenant_access" ON public.import_jobs;
CREATE POLICY "import_jobs_tenant_access"
  ON public.import_jobs
  FOR ALL
  TO authenticated
  USING (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  )
  WITH CHECK (
    account_id = (SELECT public.get_auth_account_id())
    AND business_id IN (SELECT id FROM public.businesses WHERE account_id = (SELECT public.get_auth_account_id()))
  );

-- ----------------------------------------------------------------------------
-- 6.7c Atomic Rollback Tracking RPC for Chunked Import Jobs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_import_job_rolled_back(
  p_job_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.import_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job
  FROM public.import_jobs
  WHERE id = p_job_id
    AND deleted_at IS NULL
    AND account_id = public.get_auth_account_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IMPORT_JOB_NOT_FOUND';
  END IF;

  UPDATE public.import_jobs
  SET
    status = 'rolled_back',
    error_summary = COALESCE(error_summary, '[]'::jsonb) ||
      CASE
        WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN
          jsonb_build_array(jsonb_build_object('rowNumber', 0, 'errorCode', 'ROLLBACK', 'message', p_reason))
        ELSE '[]'::jsonb
      END,
    completed_at = COALESCE(completed_at, now()),
    updated_at = now(),
    version = version + 1
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN jsonb_build_object(
    'id', v_job.id,
    'status', v_job.status,
    'rolledBackCount', jsonb_array_length(COALESCE(v_job.created_record_ids, '[]'::jsonb))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_import_job_rolled_back(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_import_job_rolled_back(uuid, text) TO authenticated;

COMMIT;
