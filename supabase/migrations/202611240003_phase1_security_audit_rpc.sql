-- ============================================================================
-- Atrium Phase 1 Trust Remediation — Server-Side Security Audit RPC (5.10)
-- Migration: 202611240003_phase1_security_audit_rpc.sql
-- Purpose:
--   1. Allow authenticated clients to record route/screen access-denied events
--      into immutable_audit_logs ONLY via SECURITY DEFINER RPC
--      (log_access_denied_event), preserving the ban on direct client INSERT.
--   2. Enforce server-derived actor identity (auth.uid() + get_auth_staff_id())
--      and tenant/branch scope checks (get_auth_account_id() + can_access_branch)
--      so clients cannot forge another user or tenant.
--   3. Store non-UUID metadata (attemptedScreen, category, role, reason) inside
--      new_data JSONB with record_id = NULL (preventing UUID cast error 22P02).
--   4. Enforce server-side 4-second deduplication and rolling 20-per-60s flood
--      rate limit per (account_id, actor_auth_id).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_immutable_audit_logs_sec_denied_rate
  ON public.immutable_audit_logs (account_id, actor_auth_id, occurred_at DESC)
  WHERE table_name = 'security_access_denied';

CREATE OR REPLACE FUNCTION public.log_access_denied_event(
  p_attempted_screen text,
  p_category text,
  p_effective_role text,
  p_raw_role text DEFAULT NULL,
  p_reason text DEFAULT 'ROLE_NOT_AUTHORIZED',
  p_business_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid      uuid := auth.uid();
  v_account_id    uuid;
  v_staff_id      uuid;
  v_screen        text := COALESCE(NULLIF(btrim(p_attempted_screen), ''), 'unknown');
  v_category      text := COALESCE(NULLIF(btrim(p_category), ''), 'unknown');
  v_eff_role      text := COALESCE(NULLIF(btrim(p_effective_role), ''), 'Staff');
  v_reason        text := COALESCE(NULLIF(btrim(p_reason), ''), 'ROLE_NOT_AUTHORIZED');
  v_client_ts     timestamptz := COALESCE(p_occurred_at, now());
  v_recent_count  integer := 0;
  v_inserted_id   uuid;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record security audit events'
      USING ERRCODE = '42501';
  END IF;

  v_account_id := public.get_auth_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Caller is not bound to an active tenant account'
      USING ERRCODE = '42501';
  END IF;

  -- Server-derived staff identity: client cannot pass or spoof actor_auth_id / actor_staff_id.
  v_staff_id := public.get_auth_staff_id();

  IF p_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.account_id = v_account_id
  ) THEN
    RAISE EXCEPTION 'Forbidden business scope for security audit event'
      USING ERRCODE = '42501';
  END IF;

  IF p_branch_id IS NOT NULL AND NOT public.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'Forbidden branch scope for security audit event'
      USING ERRCODE = '42501';
  END IF;

  -- Server-side 4-second dedupe window per (account, actor_auth_id, attemptedScreen)
  IF EXISTS (
    SELECT 1
    FROM public.immutable_audit_logs l
    WHERE l.account_id = v_account_id
      AND l.actor_auth_id = v_auth_uid
      AND l.table_name = 'security_access_denied'
      AND l.new_data->>'attemptedScreen' = v_screen
      AND l.occurred_at >= now() - interval '4 seconds'
  ) THEN
    RETURN jsonb_build_object(
      'recorded', false,
      'reason', 'DEDUPED'
    );
  END IF;

  -- Server-side rolling flood rate limit: max 20 access-denied rows per actor per 60 seconds
  SELECT count(*) INTO v_recent_count
  FROM public.immutable_audit_logs l
  WHERE l.account_id = v_account_id
    AND l.actor_auth_id = v_auth_uid
    AND l.table_name = 'security_access_denied'
    AND l.occurred_at >= now() - interval '60 seconds';

  IF v_recent_count >= 20 THEN
    RETURN jsonb_build_object(
      'recorded', false,
      'reason', 'RATE_LIMITED'
    );
  END IF;

  INSERT INTO public.immutable_audit_logs (
    account_id,
    business_id,
    branch_id,
    actor_auth_id,
    actor_staff_id,
    table_name,
    record_id,
    action,
    new_data,
    occurred_at
  )
  VALUES (
    v_account_id,
    p_business_id,
    p_branch_id,
    v_auth_uid,
    v_staff_id,
    'security_access_denied',
    NULL,
    'INSERT',
    jsonb_build_object(
      'event', 'ACCESS_DENIED',
      'attemptedScreen', v_screen,
      'category', v_category,
      'effectiveRole', v_eff_role,
      'rawRole', p_raw_role,
      'reason', v_reason,
      'clientOccurredAt', v_client_ts
    ),
    now()
  )
  RETURNING id INTO v_inserted_id;

  RETURN jsonb_build_object(
    'recorded', true,
    'id', v_inserted_id,
    'actor_auth_id', v_auth_uid,
    'actor_staff_id', v_staff_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_access_denied_event(text, text, text, text, text, uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_access_denied_event(text, text, text, text, text, uuid, uuid, timestamptz) TO authenticated;
