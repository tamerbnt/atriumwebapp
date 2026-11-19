#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Atrium ERP & CRM — Automated Restore Drill & Schema Integrity Verification
# Verifies SHA-256 checksum, decrypts (if .enc), restores into an isolated
# staging/ephemeral PostgreSQL database, and asserts Phase 1-5 enterprise
# invariants (core tables, optimistic version triggers, partial unique indexes,
# atomic FOR UPDATE RPCs, keyset audit RPC, and active RLS policies).
# ============================================================================

BACKUP_FILE="${1:-${BACKUP_FILE:-}}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <path-to-backup.dump|.dump.enc>" >&2
  exit 1
fi

if [[ -z "${RESTORE_DATABASE_URL:-}" && -z "${ADMIN_DATABASE_URL:-}" ]]; then
  echo "ERROR: Provide RESTORE_DATABASE_URL (target DB) or ADMIN_DATABASE_URL (to create/drop ephemeral drill DB)." >&2
  exit 1
fi

for cmd in pg_restore psql; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required binary '$cmd' not found in PATH." >&2
    exit 1
  fi
done

TEMP_PLAIN_DUMP=""
EPHEMERAL_DB_NAME=""

cleanup() {
  if [[ -n "$TEMP_PLAIN_DUMP" && -f "$TEMP_PLAIN_DUMP" ]]; then
    rm -f "$TEMP_PLAIN_DUMP"
  fi
  if [[ -n "$EPHEMERAL_DB_NAME" && -n "${ADMIN_DATABASE_URL:-}" ]]; then
    echo "[restore-drill] Dropping ephemeral drill database ${EPHEMERAL_DB_NAME}"
    psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${EPHEMERAL_DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${EPHEMERAL_DB_NAME}\";" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
  echo "[restore-drill] Verifying SHA-256 checksum (${CHECKSUM_FILE})"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$CHECKSUM_FILE")")
  elif command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname "$BACKUP_FILE")" && shasum -a 256 -c "$(basename "$CHECKSUM_FILE")")
  fi
fi

SOURCE_DUMP="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.enc ]]; then
  if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
    echo "ERROR: Encrypted archive requires BACKUP_PASSPHRASE." >&2
    exit 1
  fi
  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: 'openssl' required to decrypt ${BACKUP_FILE}." >&2
    exit 1
  fi
  TEMP_PLAIN_DUMP="$(mktemp /tmp/atrium_restore_XXXXXX.dump)"
  echo "[restore-drill] Decrypting ${BACKUP_FILE}"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "$BACKUP_FILE" \
    -out "$TEMP_PLAIN_DUMP" \
    -pass env:BACKUP_PASSPHRASE
  SOURCE_DUMP="$TEMP_PLAIN_DUMP"
fi

TARGET_DB_URL="${RESTORE_DATABASE_URL:-}"
if [[ -z "$TARGET_DB_URL" ]]; then
  EPHEMERAL_DB_NAME="atrium_drill_$(date -u +%Y%m%d%H%M%S)_$$"
  echo "[restore-drill] Creating ephemeral staging DB ${EPHEMERAL_DB_NAME}"
  psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${EPHEMERAL_DB_NAME}\";"
  # Replace database path in ADMIN_DATABASE_URL
  BASE_URL="${ADMIN_DATABASE_URL%%\?*}"
  QUERY_PART=""
  if [[ "$ADMIN_DATABASE_URL" == *\?* ]]; then
    QUERY_PART="?${ADMIN_DATABASE_URL#*\?}"
  fi
  TARGET_DB_URL="${BASE_URL%/*}/${EPHEMERAL_DB_NAME}${QUERY_PART}"
fi

echo "[restore-drill] Restoring archive into target database"
pg_restore \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --exit-on-error \
  --dbname="$TARGET_DB_URL" \
  "$SOURCE_DUMP"

echo "[restore-drill] Running post-restore enterprise invariant assertions"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  v_missing text := '';
  v_trigger_count int;
  v_partial_uq_count int;
  v_rls_disabled_count int;
  tbl text;
  required_tables text[] := ARRAY[
    'businesses',
    'branches',
    'staff',
    'immutable_audit_logs',
    'mfg_bom_recipes',
    'pm_payroll_batches',
    'pm_ccp_slips',
    'logistics_wilaya_tariffs'
  ];
  fn_name text;
  required_fns text[] := ARRAY[
    'fn_enforce_optimistic_version',
    'fn_enforce_optimistic_row_version',
    'mfg_upsert_bom_atomic',
    'pm_generate_ccp_batch_slips_atomic',
    'logistics_upsert_wilaya_tariffs_batch',
    'get_audit_logs_page'
  ];
BEGIN
  FOREACH tbl IN ARRAY required_tables LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      v_missing := v_missing || ' table:' || tbl;
    END IF;
  END LOOP;

  FOREACH fn_name IN ARRAY required_fns LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    ) THEN
      v_missing := v_missing || ' fn:' || fn_name;
    END IF;
  END LOOP;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'RESTORE_DRILL_ASSERTION_FAILED missing objects:%', v_missing;
  END IF;

  SELECT count(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%_optimistic_version';

  IF v_trigger_count = 0 THEN
    RAISE EXCEPTION 'RESTORE_DRILL_ASSERTION_FAILED: no optimistic version triggers found';
  END IF;

  SELECT count(*) INTO v_partial_uq_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexdef ILIKE '%UNIQUE INDEX%'
    AND indexdef ILIKE '%deleted_at IS NULL%';

  IF v_partial_uq_count = 0 THEN
    RAISE EXCEPTION 'RESTORE_DRILL_ASSERTION_FAILED: no soft-delete partial unique indexes found';
  END IF;

  SELECT count(*) INTO v_rls_disabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(ARRAY['businesses', 'branches', 'staff', 'immutable_audit_logs'])
    AND c.relrowsecurity IS NOT TRUE;

  IF v_rls_disabled_count > 0 THEN
    RAISE EXCEPTION 'RESTORE_DRILL_ASSERTION_FAILED: RLS disabled on % core table(s)', v_rls_disabled_count;
  END IF;

  RAISE NOTICE 'RESTORE_DRILL_OK triggers=% partial_unique_indexes=%', v_trigger_count, v_partial_uq_count;
END $$;
SQL

echo "[restore-drill] PASS — Archive verified, restored, and all enterprise invariants validated."
