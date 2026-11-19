# Atrium ERP & CRM — Production Backup, PITR & Rollback Runbook

## 1. Recovery Objectives & Pooling Architecture

| Dimension | Production Target | Implementation |
| --- | --- | --- |
| **RPO (Recovery Point Objective)** | `<= 5 minutes` (PITR) / `<= 24 hours` (cold archive) | Supabase Pro WAL PITR + nightly encrypted `pg_dump` |
| **RTO (Recovery Time Objective)** | `<= 30 minutes` | Supabase PITR branch/point restore or `pg_restore` drill target |
| **Connection Pooling** | Supavisor Transaction Mode (`6543` prod / `54329` local) | Bounded client concurrency (`maxConcurrency = 4`) + `max_rows = 1000` |
| **Client Pagination** | Unbounded zero-truncation sync | `fetchAllPages` (1,000-row range pages with `id` tiebreakers) |

---

## 2. Supabase Pro PITR Checklist

1. Upgrade the Supabase project to **Pro** and enable the **Point-in-Time Recovery (PITR)** add-on in **Project Settings -> Database -> Backups**.
2. Confirm WAL archiving cadence and retain at least **7–14 days** of PITR history.
3. Configure **Supavisor Transaction Pooler** (`port 6543`) for application traffic and reserve **Direct Session** (`port 5432`) strictly for migrations, `pg_dump`, and `pg_restore`.
4. Never bypass RLS or disable `immutable_audit_logs` triggers during routine operations.

---

## 3. Off-Site Encrypted Logical Backups (`backup_postgres.sh`)

Run automated daily logical snapshots against the direct session PostgreSQL connection string:

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
export BACKUP_DIR="/var/backups/atrium/postgres"
export RETENTION_DAYS=30
export BACKUP_PASSPHRASE="<kms-managed-32-byte-passphrase>"

./scripts/db/backup_postgres.sh
```

What this guarantees:
- Produces a compressed PostgreSQL custom archive (`atrium_prod_<UTC>.dump`).
- Encrypts the archive with AES-256-CBC (`PBKDF2`, 100,000 iterations) when `BACKUP_PASSPHRASE` is supplied.
- Writes and immediately verifies a `.sha256` integrity digest.
- Prunes local artifacts older than `RETENTION_DAYS`.
- Replicate the `.dump.enc` + `.sha256` pair to immutable object storage (S3 Object Lock / GCS Bucket Lock) immediately after completion.

---

## 4. Weekly Automated Restore Drill (`restore_drill.sh`)

A backup is unproven until restored and queried. Execute weekly in CI or staging:

```bash
export ADMIN_DATABASE_URL="postgresql://postgres:<password>@staging-pg.internal:5432/postgres"
export BACKUP_PASSPHRASE="<kms-managed-32-byte-passphrase>"

./scripts/db/restore_drill.sh /var/backups/atrium/postgres/atrium_prod_20261119T020000Z.dump.enc
```

The drill automatically:
1. Validates the `.sha256` checksum.
2. Decrypts the `.enc` payload into an ephemeral temp archive cleaned up on exit.
3. Provisions an isolated ephemeral database `atrium_drill_<timestamp>`, executes `pg_restore --exit-on-error`, and drops the drill database on exit.
4. Asserts that all core tables, `fn_enforce_optimistic_version` / `fn_enforce_optimistic_row_version` triggers, soft-delete partial unique indexes (`WHERE deleted_at IS NULL`), atomic `FOR UPDATE` RPCs (`mfg_upsert_bom_atomic`, `pm_generate_ccp_batch_slips_atomic`, `logistics_upsert_wilaya_tariffs_batch`), `get_audit_logs_page`, and RLS policies are active.

---

## 5. Forward Migrations & Safe Rollback Playbook

Every forward migration in `supabase/migrations/` has a paired down-migration in `supabase/rollbacks/`:

| Phase | Forward Migration | Paired Rollback |
| --- | --- | --- |
| Phase 1 | `202611180001_phase1_security_foundation.sql` | `202611180001_phase1_security_foundation.down.sql` |
| Phase 2 | `202611180002_phase2_group_a_isolation.sql` | `202611180002_phase2_group_a_isolation.down.sql` |
| Phase 3 | `202611180003_phase3_group_b_verticals.sql` | `202611180003_phase3_group_b_verticals.down.sql` |
| Phase 4 | `202611180004_phase4_enterprise_hardening.sql` | `202611180004_phase4_enterprise_hardening.down.sql` |
| Phase 5 | `202611190005_enterprise_100pct_hardening.sql` | `202611190005_enterprise_100pct_hardening.down.sql` |

### Pre-Migration Checklist
1. Capture a fresh backup with `./scripts/db/backup_postgres.sh`.
2. Verify CI green on `.github/workflows/ci-db-hardening.yml`.
3. Apply forward migration inside a short `lock_timeout` window (`SET lock_timeout = '5s';`) over the direct session port (`5432`).

### Emergency Rollback Procedure
1. Pause background sync jobs / place maintenance banner if rolling back breaking schema changes.
2. Execute the paired `.down.sql` file in reverse chronological order (e.g., Phase 5 first):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/202611190005_enterprise_100pct_hardening.down.sql
   ```
3. If data corruption occurred before detection, restore via Supabase PITR to the exact UTC timestamp immediately preceding the incident, then run `restore_drill.sh` verification queries before reopening traffic.
