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

  it('verifies Phase 3 Step 4 (7.4) project_milestone depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280004_phase3_project_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280004_phase3_project_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS currency text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS fx_rate_to_dzd numeric');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS approved_pct numeric');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS revision_count int');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS missing_receipt_flagged boolean');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pm_timesheets');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pm_client_portal_reviews');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pm_record_deliverable_review_with_limit(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.pm_approve_milestone_for_billing(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pm_approve_milestone_for_billing(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.pm_record_deliverable_review_with_limit(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pm_client_portal_reviews');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.pm_timesheets');
    expect(downSql).toContain('DROP COLUMN IF EXISTS missing_receipt_flagged');
    expect(downSql).toContain('DROP COLUMN IF EXISTS revision_count');
    expect(downSql).toContain('DROP COLUMN IF EXISTS approved_pct');
    expect(downSql).toContain('DROP COLUMN IF EXISTS currency');
  });

  it('verifies Phase 3 Step 5 (7.5) rental_booking depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280005_phase3_rental_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280005_phase3_rental_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(sql).toContain('ADD CONSTRAINT excl_rental_bookings_no_overlap');
    expect(sql).toContain('ADD CONSTRAINT chk_rental_deposit_deduction');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.rental_pricing_rules');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.rental_contract_templates');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.rental_asset_check_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.rental_coworking_subscriptions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.upsert_rental_booking_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.settle_rental_deposit_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.consume_coworking_subscription_hours(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.consume_coworking_subscription_hours(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.settle_rental_deposit_atomic(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.upsert_rental_booking_atomic(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.rental_coworking_subscriptions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.rental_asset_check_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.rental_contract_templates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.rental_pricing_rules');
    expect(downSql).toContain('DROP CONSTRAINT IF EXISTS excl_rental_bookings_no_overlap');
    expect(downSql).toContain('DROP CONSTRAINT IF EXISTS chk_rental_deposit_deduction');
  });

  it('verifies Phase 3 Step 6 (7.6) education_cohort depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280006_phase3_education_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280006_phase3_education_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS grade_scale int');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS trade_mode text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS discount_type text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS refunded_amount_centimes bigint');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS reissue_count int');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.edu_parent_communications');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.edu_vacataire_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.edu_driving_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.edu_k12_services');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.edu_transfer_student_cohort_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.edu_reissue_or_revoke_certificate(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.edu_post_vacataire_hours_to_payroll(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.edu_post_vacataire_hours_to_payroll(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.edu_reissue_or_revoke_certificate(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.edu_transfer_student_cohort_atomic(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.edu_k12_services');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.edu_driving_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.edu_vacataire_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.edu_parent_communications');
    expect(downSql).toContain('DROP COLUMN IF EXISTS reissue_count');
    expect(downSql).toContain('DROP COLUMN IF EXISTS grade_scale');
  });

  it('verifies Phase 3 Step 7 (7.7) freelance_solo depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280007_phase3_freelance_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280007_phase3_freelance_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS crm_party_id uuid');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS split_group_id text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS fx_rate_to_dzd numeric');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS total_amount_dzd_centimes bigint');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS source_device_id text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS receipt_storage_path text');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.freelance_auto_entrepreneur_configs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.freelance_contract_templates');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.freelance_client_contracts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.freelance_translation_registers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.freelance_photo_shoots');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_protect_invoiced_freelance_time_logs(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_protect_issued_freelance_invoice_currency(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.upsert_freelance_active_timer(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.stop_freelance_active_timer(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.uninvoice_freelance_invoice_logs(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.uninvoice_freelance_invoice_logs(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.stop_freelance_active_timer(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.upsert_freelance_active_timer(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.freelance_photo_shoots');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.freelance_translation_registers');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.freelance_client_contracts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.freelance_contract_templates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.freelance_auto_entrepreneur_configs');
    expect(downSql).toContain('DROP COLUMN IF EXISTS fx_rate_to_dzd');
    expect(downSql).toContain('DROP COLUMN IF EXISTS split_group_id');
  });

  it('verifies Phase 3 Step 8 (7.8) trading_commercial depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280008_phase3_trading_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280008_phase3_trading_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS price_tier text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS depot_stock_map jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS credit_override_reason text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS guarantee_retention_status text');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.trading_price_lists');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.trading_delivery_rounds');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.trading_rep_commissions');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_trading_avoir_not_exceed_invoice(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.trading_convert_commercial_doc_partial(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.trading_execute_stock_voucher(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.trading_release_guarantee_retention(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.trading_release_guarantee_retention(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.trading_execute_stock_voucher(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.trading_convert_commercial_doc_partial(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_trading_avoir_not_exceed_invoice(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.trading_rep_commissions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.trading_delivery_rounds');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.trading_price_lists');
    expect(downSql).toContain('DROP COLUMN IF EXISTS guarantee_retention_status');
    expect(downSql).toContain('DROP COLUMN IF EXISTS depot_stock_map');
    expect(downSql).toContain('DROP COLUMN IF EXISTS price_tier');
  });

  it('verifies Phase 3 Step 9 (7.9) medical_clinic depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280009_phase3_medical_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280009_phase3_medical_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS has_chifa_100_percent_ald boolean');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_emergency_bypass boolean');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS allergy_override_reason text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS lots jsonb');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.medical_ngap_acts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.medical_chifa_bordereaux');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.medical_doctor_payouts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.medical_cash_closures');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_medical_appointment_no_overlap(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_upsert_appointment_atomic(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_consume_supply_fefo(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_transmit_chifa_bordereau(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_settle_chifa_bordereau(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_issue_practitioner_payout(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.medical_close_daily_cash(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_close_daily_cash(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_issue_practitioner_payout(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_settle_chifa_bordereau(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_transmit_chifa_bordereau(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_consume_supply_fefo(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.medical_upsert_appointment_atomic(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_medical_appointment_no_overlap(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.medical_cash_closures');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.medical_doctor_payouts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.medical_chifa_bordereaux');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.medical_ngap_acts');
    expect(downSql).toContain('DROP COLUMN IF EXISTS lots');
    expect(downSql).toContain('DROP COLUMN IF EXISTS has_chifa_100_percent_ald');
  });

  it('verifies Phase 3 Step 10 (7.10) auto_garage depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280010_phase3_auto_garage_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280010_phase3_auto_garage_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS vehicle_type text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS plate_format text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS ownership_history jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS quote_unit_prices_snapshot jsonb');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_locked_invoiced boolean');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS delivery_note_number text');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_flat_rate_labor');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_technician_time_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_tech_commissions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_insurance_claims');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_inspection_pvs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_detailing_packages');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.garage_tire_storage');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_garage_bay_double_assignment(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.garage_assign_bay(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.garage_receive_purchase_order(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.garage_reopen_invoiced_order(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.garage_reopen_invoiced_order(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.garage_receive_purchase_order(');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_guard_garage_bay_double_assignment');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_garage_bay_double_assignment()');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_tire_storage');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_detailing_packages');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_inspection_pvs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_insurance_claims');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_tech_commissions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_technician_time_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.garage_flat_rate_labor');
    expect(downSql).toContain('DROP COLUMN IF EXISTS delivery_note_number');
    expect(downSql).toContain('DROP COLUMN IF EXISTS is_locked_invoiced');
    expect(downSql).toContain('DROP COLUMN IF EXISTS vehicle_type');
  });

  it('verifies Phase 3 Step 11 (7.11) real_estate depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280011_phase3_real_estate_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280011_phase3_real_estate_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain("'quittance'");
    expect(sql).toContain("'re_mandate'");
    expect(sql).toContain("'re_lease'");
    expect(sql).toContain("'re_fund_call'");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS primary_split_bps');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS indexation_history');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS gps_status');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_maintenance_tickets');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_agent_commissions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_syndic_buildings');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_syndic_fund_calls');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_syndic_assemblies');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_dev_programs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_dev_lots');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_student_beds');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.re_vacation_stays');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_re_exclusive_mandate_overlap(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_re_vacation_stay_overlap(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.re_record_partial_rent_payment(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.re_apply_lease_indexation(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.re_apply_lease_indexation(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.re_record_partial_rent_payment(');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_guard_re_vacation_stay_overlap');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_re_vacation_stay_overlap()');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_guard_re_exclusive_mandate_overlap');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_re_exclusive_mandate_overlap()');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_vacation_stays');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_student_beds');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_dev_lots');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_dev_programs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_syndic_assemblies');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_syndic_fund_calls');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_syndic_buildings');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_agent_commissions');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.re_maintenance_tickets');
    expect(downSql).toContain('DROP COLUMN IF EXISTS gps_status');
    expect(downSql).toContain('DROP COLUMN IF EXISTS indexation_history');
    expect(downSql).toContain('DROP COLUMN IF EXISTS primary_split_bps');
  });

  it('verifies Phase 3 Step 12 (7.12) manufacturing_production depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280012_phase3_manufacturing_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280012_phase3_manufacturing_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain("'mfg_alert'");
    expect(sql).toContain("'mfg_maint'");
    expect(sql).toContain("'mfg_fg_lot'");
    expect(sql).toContain("'mfg_cut'");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS bom_family_id');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS version_number');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS pinned_bom_version');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS ppe_checklist');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_alerts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_finished_goods');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_machine_maintenance');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_piece_rate_entries');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.mfg_cutting_plans');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fn_guard_mfg_bom_immutable_on_active_orders(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_create_bom_version(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_trigger_andon_alert(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_resolve_andon_alert(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_release_finished_goods_lot(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_complete_machine_maintenance(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.mfg_post_piece_rate_to_payroll(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_post_piece_rate_to_payroll(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_complete_machine_maintenance(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_release_finished_goods_lot(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_resolve_andon_alert(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_trigger_andon_alert(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.mfg_create_bom_version(');
    expect(downSql).toContain('DROP TRIGGER IF EXISTS trg_guard_mfg_bom_immutable_on_active_orders');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.fn_guard_mfg_bom_immutable_on_active_orders()');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_cutting_plans');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_piece_rate_entries');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_machine_maintenance');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_finished_goods');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.mfg_alerts');
    expect(downSql).toContain('DROP COLUMN IF EXISTS ppe_checklist');
    expect(downSql).toContain('DROP COLUMN IF EXISTS pinned_bom_version');
    expect(downSql).toContain('DROP COLUMN IF EXISTS bom_family_id');
  });

  it('verifies Phase 3 Step 13 (7.13) legal_accounting depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280013_phase3_legal_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280013_phase3_legal_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain("'legal_inv'");
    expect(sql).toContain("'legal_bailiff'");
    expect(sql).toContain("'legal_arb'");
    expect(sql).toContain("'legal_tpl'");
    expect(sql).toContain("'legal_ledger'");
    expect(sql).toContain("'legal-vault'");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS confidentiality_level');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS conflict_status');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS entry_kind');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS sha256_hash');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_holiday_calendars');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_escrow_accounts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_doc_templates');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_bailiff_acts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_arbitration_timelines');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_client_ledgers');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.legal_release_escrow_guarded(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.legal_recalculate_deadlines_on_holidays(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.legal_generate_fee_invoice_from_time_entries(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.legal_generate_fee_invoice_from_time_entries(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.legal_recalculate_deadlines_on_holidays(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.legal_release_escrow_guarded(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_client_ledgers');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_arbitration_timelines');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_bailiff_acts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_doc_templates');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_escrow_accounts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.legal_holiday_calendars');
    expect(downSql).toContain('DROP COLUMN IF EXISTS sha256_hash');
    expect(downSql).toContain('DROP COLUMN IF EXISTS entry_kind');
    expect(downSql).toContain('DROP COLUMN IF EXISTS conflict_status');
    expect(downSql).toContain('DROP COLUMN IF EXISTS confidentiality_level');
  });

  it('verifies Phase 3 Step 14 (7.14) logistics_delivery depth migration and rollback parity', () => {
    const mPath = path.join(MIGRATIONS_DIR, '202611280014_phase3_logistics_depth.sql');
    const downPath = path.join(ROLLBACKS_DIR, '202611280014_phase3_logistics_depth.down.sql');
    const sql = fs.readFileSync(mPath, 'utf8');
    const downSql = fs.readFileSync(downPath, 'utf8');

    expect(sql).toContain("'log_parcel'");
    expect(sql).toContain("'log_manifest'");
    expect(sql).toContain("'log_discharge'");
    expect(sql).toContain("'log_remittance'");
    expect(sql).toContain("'log_waybill'");
    expect(sql).toContain("'log_towing'");
    expect(sql).toContain("'log_customs'");
    expect(sql).toContain("'log_driver_pay'");
    expect(sql).toContain("'logistics-pod'");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS pod_signature_url');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS otp_attempts');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS counterfeit_amount_centimes');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS ccp_validated');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_delivery_pods');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_driver_payouts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_vehicle_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_merchant_fee_invoices');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_carrier_integrations');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_freight_waybills');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_moving_quotes');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_cold_chain_logs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_customs_dossiers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.logistics_towing_dispatches');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.logistics_scan_parcel_guarded(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.logistics_verify_stopdesk_otp(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.logistics_record_discharge_with_variance(');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.logistics_execute_remittance_validated(');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.logistics_execute_remittance_validated(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.logistics_record_discharge_with_variance(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.logistics_verify_stopdesk_otp(');
    expect(downSql).toContain('DROP FUNCTION IF EXISTS public.logistics_scan_parcel_guarded(');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_towing_dispatches');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_customs_dossiers');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_cold_chain_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_moving_quotes');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_freight_waybills');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_carrier_integrations');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_merchant_fee_invoices');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_vehicle_logs');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_driver_payouts');
    expect(downSql).toContain('DROP TABLE IF EXISTS public.logistics_delivery_pods');
    expect(downSql).toContain('DROP COLUMN IF EXISTS ccp_validated');
    expect(downSql).toContain('DROP COLUMN IF EXISTS counterfeit_amount_centimes');
    expect(downSql).toContain('DROP COLUMN IF EXISTS otp_attempts');
    expect(downSql).toContain('DROP COLUMN IF EXISTS pod_signature_url');
  });
});






