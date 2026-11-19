import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(__dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');
const ROLLBACKS_DIR = path.join(ROOT_DIR, 'supabase', 'rollbacks');

describe('Migrations, Paired Rollbacks & Database Hardening Contracts', () => {
  it('ensures every forward migration in supabase/migrations has a paired .down.sql rollback', () => {
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    expect(migrationFiles.length).toBeGreaterThanOrEqual(5);

    const rollbackFiles = new Set(fs.readdirSync(ROLLBACKS_DIR));
    for (const file of migrationFiles) {
      const expectedDown = file.replace(/\.sql$/, '.down.sql');
      expect(
        rollbackFiles.has(expectedDown),
        `Missing rollback file ${expectedDown} for migration ${file}`
      ).toBe(true);

      const downSql = fs.readFileSync(path.join(ROLLBACKS_DIR, expectedDown), 'utf8');
      expect(downSql.trim().length).toBeGreaterThan(20);
    }
  });

  it('verifies Phase 5 hardening migration defines optimistic triggers, partial unique indexes, FOR UPDATE RPCs, and audit keyset RPC', () => {
    const phase5Path = path.join(MIGRATIONS_DIR, '202611190005_enterprise_100pct_hardening.sql');
    const sql = fs.readFileSync(phase5Path, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_enforce_optimistic_version()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_enforce_optimistic_row_version()');
    expect(sql).toContain("ERRCODE = '40001'");
    expect(sql).toContain('CONFLICT_STALE_VERSION');
    expect(sql).toContain('WHERE deleted_at IS NULL');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_upsert_bom_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pm_generate_ccp_batch_slips_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.logistics_upsert_wilaya_tariffs_batch(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_audit_logs_page(');

    const phase5DownPath = path.join(
      ROLLBACKS_DIR,
      '202611190005_enterprise_100pct_hardening.down.sql'
    );
    const downSql = fs.readFileSync(phase5DownPath, 'utf8');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.get_audit_logs_page(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.logistics_upsert_wilaya_tariffs_batch(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pm_generate_ccp_batch_slips_atomic(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_upsert_bom_atomic(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_enforce_optimistic_version()');
  });

  it('verifies Supabase pooler & max_rows config plus backup/restore drill scripts and runbook exist', () => {
    const configToml = fs.readFileSync(path.join(ROOT_DIR, 'supabase', 'config.toml'), 'utf8');
    expect(configToml).toContain('max_rows = 1000');
    expect(configToml).toContain('pool_mode = "transaction"');

    const backupScript = fs.readFileSync(
      path.join(ROOT_DIR, 'scripts', 'db', 'backup_postgres.sh'),
      'utf8'
    );
    expect(backupScript).toContain('pg_dump');
    expect(backupScript).toContain('sha256');
    expect(backupScript).toContain('RETENTION_DAYS');

    const restoreScript = fs.readFileSync(
      path.join(ROOT_DIR, 'scripts', 'db', 'restore_drill.sh'),
      'utf8'
    );
    expect(restoreScript).toContain('pg_restore');
    expect(restoreScript).toContain('fn_enforce_optimistic_version');
    expect(restoreScript).toContain('deleted_at IS NULL');

    const runbook = fs.readFileSync(
      path.join(ROOT_DIR, 'docs', 'PRODUCTION_BACKUP_PITR_RUNBOOK.md'),
      'utf8'
    );
    expect(runbook).toContain('PITR');
    expect(runbook).toContain('restore_drill.sh');
  });
});
