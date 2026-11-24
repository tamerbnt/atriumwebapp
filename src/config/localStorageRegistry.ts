/**
 * Canonical registry of browser localStorage keys permitted across Atrium.
 * Guarded by scripts/ci/phase1-guards.mjs (Section 12.5).
 */
export interface LocalStorageKeyEntry {
  key: string;
  scope: 'ui_preference' | 'offline_sync' | 'legacy_migration' | 'auth_onboarding' | 'vertical_cache';
  preserveOnCacheReset: boolean;
  notes: string;
}

export const LOCAL_STORAGE_REGISTRY: readonly LocalStorageKeyEntry[] = [
  // Sync & offline mutation resilience (NEVER wipe on ErrorBoundary reset)
  {
    key: 'atrium_offline_mutation_queue_v1',
    scope: 'offline_sync',
    preserveOnCacheReset: true,
    notes: 'Pending Supabase mutations waiting for replay',
  },
  {
    key: 'atrium_offline_quarantine_v1',
    scope: 'offline_sync',
    preserveOnCacheReset: true,
    notes: 'Poison/non-retryable failed offline mutations quarantined for export/inspection',
  },
  {
    key: 'atrium_client_device_id_v1',
    scope: 'offline_sync',
    preserveOnCacheReset: true,
    notes: 'Persistent terminal/device UUID for trace envelopes and reserved number blocks',
  },
  {
    key: 'atrium_delta_sync_cursors_v1',
    scope: 'offline_sync',
    preserveOnCacheReset: false,
    notes: 'Per-branch Supabase delta-sync cursor timestamps',
  },
  {
    key: 'atrium_device_seq_blocks_v1',
    scope: 'offline_sync',
    preserveOnCacheReset: true,
    notes: 'Device-reserved offline numbering blocks (walk-in tickets & deposit receipts only)',
  },

  // Primary app cache & UI preferences
  {
    key: 'atrium_erp_desktop_v2',
    scope: 'legacy_migration',
    preserveOnCacheReset: false,
    notes: 'Primary store snapshot (also used for Step 7a/7b local payroll/attendance migration)',
  },
  {
    key: 'atrium_app_state_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: false,
    notes: 'Legacy state snapshot cleared on recovery reset',
  },
  {
    key: 'atrium_app_state_v2',
    scope: 'legacy_migration',
    preserveOnCacheReset: false,
    notes: 'Legacy state snapshot cleared on recovery reset',
  },
  {
    key: 'atrium_v2_full',
    scope: 'legacy_migration',
    preserveOnCacheReset: false,
    notes: 'Legacy v2 hydration marker',
  },
  {
    key: 'atrium_has_onboarded_v1',
    scope: 'auth_onboarding',
    preserveOnCacheReset: false,
    notes: 'Browser onboarding completion flag',
  },
  {
    key: 'atrium_language',
    scope: 'ui_preference',
    preserveOnCacheReset: true,
    notes: 'Selected UI language (en|fr|ar)',
  },
  {
    key: 'atrium_language_mode',
    scope: 'ui_preference',
    preserveOnCacheReset: true,
    notes: 'Language selection mode (auto|manual)',
  },
  {
    key: 'atrium_density',
    scope: 'ui_preference',
    preserveOnCacheReset: true,
    notes: 'UI layout density (default|compact)',
  },
  {
    key: 'atrium_list_pod_expanded',
    scope: 'ui_preference',
    preserveOnCacheReset: true,
    notes: 'List pod expanded preference',
  },

  // Step 7 Payroll & Attendance Migration keys (retained 1 release as read-only backup)
  {
    key: 'atrium_staff_attendance_logs_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: true,
    notes: 'Legacy staff attendance punch cache for Step 7a dry-run / 7b backfill',
  },
  {
    key: 'atrium_staff_salary_advances_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: true,
    notes: 'Legacy staff salary advances cache for Step 7a dry-run / 7b backfill',
  },
  {
    key: 'atrium_staff_payroll_runs_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: true,
    notes: 'Legacy payroll runs cache for Step 7a dry-run / 7b backfill',
  },
  {
    key: 'atrium_staff_payroll_slips_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: true,
    notes: 'Legacy payroll slips cache for Step 7a dry-run / 7b backfill',
  },
  {
    key: 'atrium_logistics_tariffs_v1',
    scope: 'legacy_migration',
    preserveOnCacheReset: false,
    notes: 'Legacy wilaya tariff cache migrated to logistics_wilaya_tariffs in Step 2',
  },

  // Vertical local caches (Group B — Phase 5 consolidation tracked in Section 9)
  { key: 'atrium_agri_cycles_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_dairy_cows_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_milking_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_parcels_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_pointages_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_treatments_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_weighbridge_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_agri_workers_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_boq', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_concrete', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_dgps', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_equipment', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_logs', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_os', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_projects', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_contractor_subcontractors', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_bays_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_fleets_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_invoices_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_orders_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_parts_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_garage_vehicles_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_cash_receipts', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_cpca_deadlines', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_daily_closure', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_entities', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_escrow_accounts', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_hearings', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_matters', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_notary_deeds', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_scf_entries', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_legal_vault_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_logistics_bags_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_logistics_discharges_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_logistics_manifests_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_logistics_remittances_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_logistics_shipments_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_appointments_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_cash_closures_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_certificates_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_chifa_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_consultations_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_consumables_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_doctor_configs_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_emergency_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_labs_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_patients_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_practitioners_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_medical_prescriptions_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_mfg_boms', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_mfg_orders', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_mfg_qc_records', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_mfg_raw_materials_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_mfg_vouchers', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_buyers_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_inspections_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_leases_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_mandates_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_props_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_quittances_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
  { key: 'atrium_realestate_visits_v2', scope: 'vertical_cache', preserveOnCacheReset: false, notes: 'Group B cache' },
];

export const REGISTERED_LOCAL_STORAGE_KEYS = new Set(LOCAL_STORAGE_REGISTRY.map((e) => e.key));
