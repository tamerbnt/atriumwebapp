#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Atrium ERP & CRM — Encrypted PostgreSQL Logical Backup & Retention Script
# Produces a custom-format pg_dump (.dump), optionally AES-256-CBC encrypts
# it when BACKUP_PASSPHRASE is provided, writes and verifies a SHA-256
# checksum file, and prunes snapshots older than RETENTION_DAYS.
# ============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_PREFIX="${BACKUP_PREFIX:-atrium_prod}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ -z "${DATABASE_URL:-}" && -z "${PGHOST:-}" ]]; then
  echo "ERROR: Set DATABASE_URL (or PGHOST/PGDATABASE/PGUSER/PGPASSWORD) before running backup." >&2
  exit 1
fi

for cmd in pg_dump find; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required binary '$cmd' not found in PATH." >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"

RAW_DUMP="${BACKUP_DIR}/${BACKUP_PREFIX}_${TIMESTAMP}.dump"
FINAL_ARTIFACT="$RAW_DUMP"

echo "[backup] Starting logical dump -> ${RAW_DUMP}"
if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "$DATABASE_URL" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$RAW_DUMP"
else
  pg_dump \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$RAW_DUMP"
fi

if [[ ! -s "$RAW_DUMP" ]]; then
  echo "ERROR: pg_dump produced an empty archive: ${RAW_DUMP}" >&2
  rm -f "$RAW_DUMP"
  exit 1
fi

if [[ -n "${BACKUP_PASSPHRASE:-}" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: BACKUP_PASSPHRASE is set but 'openssl' is not installed." >&2
    rm -f "$RAW_DUMP"
    exit 1
  fi
  ENC_ARTIFACT="${RAW_DUMP}.enc"
  echo "[backup] Encrypting archive with AES-256-CBC (PBKDF2) -> ${ENC_ARTIFACT}"
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$RAW_DUMP" \
    -out "$ENC_ARTIFACT" \
    -pass env:BACKUP_PASSPHRASE
  rm -f "$RAW_DUMP"
  FINAL_ARTIFACT="$ENC_ARTIFACT"
fi

CHECKSUM_FILE="${FINAL_ARTIFACT}.sha256"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$(dirname "$FINAL_ARTIFACT")" && sha256sum "$(basename "$FINAL_ARTIFACT")" > "$(basename "$CHECKSUM_FILE")")
  (cd "$(dirname "$FINAL_ARTIFACT")" && sha256sum -c "$(basename "$CHECKSUM_FILE")")
elif command -v shasum >/dev/null 2>&1; then
  (cd "$(dirname "$FINAL_ARTIFACT")" && shasum -a 256 "$(basename "$FINAL_ARTIFACT")" > "$(basename "$CHECKSUM_FILE")")
  (cd "$(dirname "$FINAL_ARTIFACT")" && shasum -a 256 -c "$(basename "$CHECKSUM_FILE")")
else
  echo "ERROR: Neither sha256sum nor shasum is available for checksum verification." >&2
  exit 1
fi

echo "[backup] Pruning snapshots older than ${RETENTION_DAYS} days in ${BACKUP_DIR}"
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name "${BACKUP_PREFIX}_*.dump" -o -name "${BACKUP_PREFIX}_*.dump.enc" -o -name "${BACKUP_PREFIX}_*.sha256" \) \
  -mtime +"$RETENTION_DAYS" -delete

SIZE_BYTES="$(wc -c < "$FINAL_ARTIFACT" | tr -d ' ')"
echo "[backup] SUCCESS artifact=${FINAL_ARTIFACT} size_bytes=${SIZE_BYTES} checksum=${CHECKSUM_FILE}"
