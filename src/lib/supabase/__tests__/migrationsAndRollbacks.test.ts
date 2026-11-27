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

  it('verifies Step 2 Phase 1 infrastructure migration contracts and rollback parity', () => {
    const step2Path = path.join(MIGRATIONS_DIR, '202611240001_phase1_trust_infrastructure.sql');
    const step2DownPath = path.join(ROLLBACKS_DIR, '202611240001_phase1_trust_infrastructure.down.sql');
    const sql = fs.readFileSync(step2Path, 'utf8');
    const downSql = fs.readFileSync(step2DownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_admins');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.statutory_rates');
    expect(sql).toContain('irg_transitional_config jsonb');
    expect(sql).not.toMatch(/\beffective_to\s+date\b/i);
    expect(sql).not.toContain("'2021-01-01'");
    expect(sql).not.toContain("'2022-01-01'");
    expect(sql).not.toContain('EXCLUDE USING gist');
    expect(sql).toContain('STATUTORY_RATE_REFERENCED_VERIFY_ONLY');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wilayas_ref');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.allocate_sequence_number(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.reserve_sequence_block(');
    expect(sql).toContain("CHECK (doc_type IN ('walk_in_ticket', 'deposit_receipt'))");
    expect(sql).toContain("to_regclass('storage.buckets')");

    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_admins');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.statutory_rates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wilayas_ref');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.reserve_sequence_block(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.allocate_sequence_number(');
  });

  it('verifies Step 4 security audit RPC migration enforces server-derived actor identity, dedupe, and rate-limiting', () => {
    const step4Path = path.join(MIGRATIONS_DIR, '202611240003_phase1_security_audit_rpc.sql');
    const step4DownPath = path.join(ROLLBACKS_DIR, '202611240003_phase1_security_audit_rpc.down.sql');
    const sql = fs.readFileSync(step4Path, 'utf8');
    const downSql = fs.readFileSync(step4DownPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.log_access_denied_event(');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('public.get_auth_account_id()');
    expect(sql).toContain('public.get_auth_staff_id()');
    expect(sql).toContain('public.can_access_branch(p_branch_id)');
    expect(sql).toContain("interval '4 seconds'");
    expect(sql).toContain("interval '60 seconds'");
    expect(sql).toContain('v_recent_count >= 20');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.log_access_denied_event(');
  });

  it('verifies Step 5 stub-remediation migration contracts, lock trigger, CMUP hold, and rollback parity', () => {
    const step5Path = path.join(MIGRATIONS_DIR, '202611250001_step5_stub_actions.sql');
    const step5DownPath = path.join(ROLLBACKS_DIR, '202611250001_step5_stub_actions.down.sql');
    const sql = fs.readFileSync(step5Path, 'utf8');
    const downSql = fs.readFileSync(step5DownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.gym_class_enrollments');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS coach_confirmed boolean');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS deposit_receipt_number text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS printed_count int');
    expect(sql).toContain('trg_re_inspections_immutable_lock');
    expect(sql).toContain('RE_INSPECTION_LOCKED_IMMUTABLE');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_ncr_records');
    expect(sql).toContain('cmup_adjustment_held boolean NOT NULL DEFAULT true CHECK (cmup_adjustment_held = true)');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_scrap_with_ncr(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_scrap_with_ncr(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_ncr_records');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_re_inspections_immutable_lock');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.gym_class_enrollments');
  });

  it('verifies Step 6 Section 1 atomic persistence migration (gym check-in, edu dedupe, salon, POS cash & refund RPC) and rollback parity', () => {
    const step6Path = path.join(MIGRATIONS_DIR, '202611260001_step6_section1_persistence.sql');
    const step6DownPath = path.join(ROLLBACKS_DIR, '202611260001_step6_section1_persistence.down.sql');
    const sql = fs.readFileSync(step6Path, 'utf8');
    const downSql = fs.readFileSync(step6DownPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.gym_record_check_in(');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_edu_attendance_session_student_active');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_cash_sessions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_z_reports');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pos_refund_with_stock(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pos_refund_with_stock(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pos_z_reports');
  });

  it('verifies Step 7b payroll/attendance SoT migration defines append-only logs, period unique index, immutability triggers, transactional RPC & rollback parity', () => {
    const step7bPath = path.join(MIGRATIONS_DIR, '202611260002_step7b_payroll_attendance_sot.sql');
    const step7bDownPath = path.join(ROLLBACKS_DIR, '202611260002_step7b_payroll_attendance_sot.down.sql');
    const sql = fs.readFileSync(step7bPath, 'utf8');
    const downSql = fs.readFileSync(step7bDownPath, 'utf8');

    expect(sql).toContain('trg_00_staff_attendance_logs_append_only');
    expect(sql).toContain('STAFF_ATTENDANCE_APPEND_ONLY');
    expect(sql).toContain('chk_staff_payroll_runs_adjustment_seq');
    expect(sql).toContain('idx_staff_payroll_runs_period_unique');
    expect(sql).toContain('WHERE deleted_at IS NULL');
    expect(sql).toContain('trg_00_staff_payroll_runs_immutable');
    expect(sql).toContain('trg_00_staff_payroll_slips_immutable');
    expect(sql).toContain('trg_00_staff_salary_advances_immutable');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.approve_payroll_run(');
    expect(sql).toContain('app.payroll_approval_tx');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.approve_payroll_run(');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_00_staff_attendance_logs_append_only');
    expect(downSql).toContain('DROP INDEX IF EXISTS public.idx_staff_payroll_runs_period_unique');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_00_staff_payroll_runs_immutable');
  });

  it('verifies Phase 2 Step 1 (6.1 & 6.2) unified invoicing & payments migration and rollback parity', () => {
    const p2Path = path.join(MIGRATIONS_DIR, '202611270001_phase2_invoicing_payments.sql');
    const p2DownPath = path.join(ROLLBACKS_DIR, '202611270001_phase2_invoicing_payments.down.sql');
    const sql = fs.readFileSync(p2Path, 'utf8');
    const downSql = fs.readFileSync(p2DownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unified_documents');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unified_payments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unified_payment_allocations');
    expect(sql).toContain('uq_unified_documents_number_active');
    expect(sql).toContain('uq_unified_payments_idempotency');
    expect(sql).toContain('trg_00_unified_documents_immutable');
    expect(sql).toContain('UNIFIED_DOC_IMMUTABLE');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.issue_unified_document(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.record_unified_payment_with_allocations(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.transition_cheque_traite_status(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.transition_cheque_traite_status(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.record_unified_payment_with_allocations(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.issue_unified_document(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.unified_payment_allocations');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.unified_payments');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.unified_documents');
    expect(downSql).toContain('CREATE OR REPLACE FUNCTION public.allocate_sequence_number(');
  });

  it('verifies Phase 2 Step 2 (6.3) shared SCF accounting migration and rollback parity', () => {
    const scfPath = path.join(MIGRATIONS_DIR, '202611270002_phase2_shared_accounting_scf.sql');
    const scfDownPath = path.join(ROLLBACKS_DIR, '202611270002_phase2_shared_accounting_scf.down.sql');
    const sql = fs.readFileSync(scfPath, 'utf8');
    const downSql = fs.readFileSync(scfDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.scf_chart_of_accounts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.scf_fiscal_years');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.scf_accounting_periods');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.journal_entries');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.journal_lines');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.scf_posting_failures');
    expect(sql).toContain('chk_journal_entry_balanced');
    expect(sql).toContain('trg_00_journal_entries_period_open');
    expect(sql).toContain('trg_00_journal_entries_immutable');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.post_scf_journal_entry(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.reverse_scf_journal_entry(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.set_scf_period_status(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.reconcile_scf_journal_lines(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.set_scf_period_status(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.reverse_scf_journal_entry(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.post_scf_journal_entry(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.scf_posting_failures');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.journal_lines');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.journal_entries');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.scf_accounting_periods');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.scf_fiscal_years');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.scf_chart_of_accounts');
  });

  it('verifies Phase 2 Step 3 (6.4) unified CRM party migration and rollback parity', () => {
    const crmPath = path.join(MIGRATIONS_DIR, '202611270003_phase2_unified_crm_party.sql');
    const crmDownPath = path.join(ROLLBACKS_DIR, '202611270003_phase2_unified_crm_party.down.sql');
    const sql = fs.readFileSync(crmPath, 'utf8');
    const downSql = fs.readFileSync(crmDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_parties');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_party_links');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_party_notes');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_follow_up_tasks');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_message_templates');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.crm_communication_logs');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.merge_crm_parties(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.record_crm_communication_attempt(');
    expect(sql).toContain('blocked_opt_out');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.record_crm_communication_attempt(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.merge_crm_parties(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_communication_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_message_templates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_follow_up_tasks');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_party_notes');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_party_links');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.crm_parties');
  });

  it('verifies Phase 2 Step 4 (6.5) reminder engine migration and rollback parity', () => {
    const remPath = path.join(MIGRATIONS_DIR, '202611270004_phase2_reminder_engine.sql');
    const remDownPath = path.join(ROLLBACKS_DIR, '202611270004_phase2_reminder_engine.down.sql');
    const sql = fs.readFileSync(remPath, 'utf8');
    const downSql = fs.readFileSync(remDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.reminder_quiet_hours_configs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.reminder_rules');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.reminder_delivery_logs');
    expect(sql).toContain('uq_reminder_delivery_idempotency');
    expect(sql).toContain('vehicle_documents_expiry');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.dispatch_reminder_idempotent(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.dispatch_reminder_idempotent(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.reminder_delivery_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.reminder_rules');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.reminder_quiet_hours_configs');
  });

  it('verifies Phase 2 Step 5 (6.6) shared WMS migration and rollback parity', () => {
    const wmsPath = path.join(MIGRATIONS_DIR, '202611270005_phase2_shared_wms.sql');
    const wmsDownPath = path.join(ROLLBACKS_DIR, '202611270005_phase2_shared_wms.down.sql');
    const sql = fs.readFileSync(wmsPath, 'utf8');
    const downSql = fs.readFileSync(wmsDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_bins');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_stock_lots');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_serial_numbers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_unit_conversions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_reorder_rules');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_cycle_counts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_cycle_count_lines');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_stock_transfers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_landed_cost_allocations');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.wms_consignment_ledger');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.wms_atomic_consume_stock(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.wms_post_cycle_count(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.wms_transition_stock_transfer(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.wms_transition_stock_transfer(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.wms_post_cycle_count(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.wms_atomic_consume_stock(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_consignment_ledger');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_landed_cost_allocations');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_stock_transfers');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_cycle_count_lines');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_cycle_counts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_reorder_rules');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_unit_conversions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_serial_numbers');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_stock_lots');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.wms_bins');
  });

  it('verifies Phase 2 Step 6 (6.7) CSV/Excel data import migration and rollback parity', () => {
    const impPath = path.join(MIGRATIONS_DIR, '202611270006_phase2_data_import.sql');
    const impDownPath = path.join(ROLLBACKS_DIR, '202611270006_phase2_data_import.down.sql');
    const sql = fs.readFileSync(impPath, 'utf8');
    const downSql = fs.readFileSync(impDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.import_column_mappings');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.import_jobs');
    expect(sql).toContain('windows-1256');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mark_import_job_rolled_back(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mark_import_job_rolled_back(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.import_jobs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.import_column_mappings');
  });

  it('verifies Phase 2 Step 7 (6.8) configurable RBAC, full RLS, 2FA policy, sensitive read & DSR migration and rollback parity', () => {
    const rbacPath = path.join(MIGRATIONS_DIR, '202611270007_phase2_rbac_rls.sql');
    const rbacDownPath = path.join(ROLLBACKS_DIR, '202611270007_phase2_rbac_rls.down.sql');
    const sql = fs.readFileSync(rbacPath, 'utf8');
    const downSql = fs.readFileSync(rbacDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.rbac_role_permissions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.can_rbac(');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.security_workspace_policies');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.data_protection_consents');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.data_subject_requests');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.log_sensitive_read_event(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.process_data_subject_request(');
    expect(sql).toContain('law_18_07_review_status');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.process_data_subject_request(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.log_sensitive_read_event(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.can_rbac(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.data_subject_requests');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.data_protection_consents');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.security_workspace_policies');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.rbac_role_permissions');
  });

  it('verifies Phase 2 Step 8 (6.9) platform approvals, legal-hold attachments, custom fields, API keys & webhooks migration and rollback parity', () => {
    const platPath = path.join(MIGRATIONS_DIR, '202611270008_phase2_platform_approvals_attachments_api.sql');
    const platDownPath = path.join(ROLLBACKS_DIR, '202611270008_phase2_platform_approvals_attachments_api.down.sql');
    const sql = fs.readFileSync(platPath, 'utf8');
    const downSql = fs.readFileSync(platDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_approval_rules');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_approval_requests');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_attachments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_custom_fields');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_print_templates');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_api_keys');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_webhooks');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.platform_webhook_deliveries');
    expect(sql).toContain('APPROVAL_SELF_DECISION_FORBIDDEN');
    expect(sql).toContain('ATTACHMENT_LEGAL_HOLD_ACTIVE');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.decide_platform_approval(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.purge_expired_platform_attachment(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.dispatch_webhook_delivery_idempotent(');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.dispatch_webhook_delivery_idempotent(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.purge_expired_platform_attachment(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.decide_platform_approval(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_webhook_deliveries');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_webhooks');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_api_keys');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_print_templates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_custom_fields');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_attachments');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_approval_requests');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.platform_approval_rules');
  });

  it('verifies Phase 2 Step 9 (6.10) unified BI KPI registry, saved reports & snapshots migration and rollback parity', () => {
    const biPath = path.join(MIGRATIONS_DIR, '202611270009_phase2_bi_kpi_registry.sql');
    const biDownPath = path.join(ROLLBACKS_DIR, '202611270009_phase2_bi_kpi_registry.down.sql');
    const sql = fs.readFileSync(biPath, 'utf8');
    const downSql = fs.readFileSync(biDownPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.bi_kpi_definitions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.bi_saved_reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.bi_report_snapshots');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.record_bi_report_snapshot(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.record_bi_report_snapshot(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.bi_report_snapshots');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.bi_saved_reports');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.bi_kpi_definitions');
  });

  it('verifies Phase 3 Step 1 (7.1) membership depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280001_phase3_membership_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280001_phase3_membership_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS auto_renew boolean');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.gym_member_freeze_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.gym_trainer_commissions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.cancel_and_promote_gym_class_enrollment(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.cancel_and_promote_gym_class_enrollment(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.gym_trainer_commissions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.gym_member_freeze_logs');
    expect(downSql).toContain('DROP COLUMN IF EXISTS auto_renew');
  });

  it('verifies Phase 3 Step 2 (7.2) appointment service depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280002_phase3_appointment_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280002_phase3_appointment_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS client_type text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS consumables jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS deposit_centimes bigint');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_stylist_schedules');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_prepaid_packages');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_gift_cards');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_loyalty_ledger');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_consent_forms');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.salon_hammam_sessions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.cancel_salon_appointment_with_deposit(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.redeem_salon_package_or_gift_card(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.redeem_salon_package_or_gift_card(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.cancel_salon_appointment_with_deposit(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_hammam_sessions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_consent_forms');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_loyalty_ledger');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_gift_cards');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_prepaid_packages');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.salon_stylist_schedules');
    expect(downSql).toContain('DROP COLUMN IF EXISTS deposit_centimes');
  });

  it('verifies Phase 3 Step 3 (7.3) POS & inventory depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280003_phase3_pos_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280003_phase3_pos_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS variants jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS modifier_groups jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS recipe_bom jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS tip_centimes bigint');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_floor_tables');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_kitchen_orders');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_customer_credit_entries');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pos_optical_prescriptions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pos_send_kitchen_order(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pos_transfer_table_order(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pos_void_kitchen_or_sale_order(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pos_record_carnet_entry(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pos_record_carnet_entry(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pos_void_kitchen_or_sale_order(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pos_transfer_table_order(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pos_send_kitchen_order(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pos_optical_prescriptions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pos_customer_credit_entries');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pos_kitchen_orders');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pos_floor_tables');
    expect(downSql).toContain('DROP COLUMN IF EXISTS variants');
  });
});


