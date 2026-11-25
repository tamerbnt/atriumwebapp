# Atrium ERP & CRM — Phase 1 Remediation Log

**Governance**: One logical unit per item (`fix(<vertical|all>): <ID> <summary>`), FR/AR/EN i18n parity for touched UI strings, additive timestamped migrations with `.down.sql` rollbacks, and test verification via both `npm test` (`tsx --test`) and `npm run test:atrium` (`vitest run`).

---

## Step 0 — Read-Only Verification & Gate 1 Summary

- **Test Baseline**: `npm test` (100/100 passed), `npm run test:atrium` (21 files, 220/220 passed). Playwright not installed (Phase 5 scope).
- **Schema Check (`edu_attendance.deleted_at`)**: Confirmed `deleted_at timestamptz` ALREADY exists on `public.edu_attendance` (`supabase/migrations/202611180002_phase2_group_a_isolation.sql:1327`), so no column-addition migration is needed for soft-delete dedupe.
- **Extended Production Query 1 (`acc_01` across `account_id`, `business_id`, `branch_id`)**:
  ```sql
  SELECT
    c.table_name,
    c.column_name,
    (xpath('/row/cnt/text()', query_to_xml(
      format(
        'SELECT count(*) AS cnt FROM %I.%I WHERE %I::text = %L',
        c.table_schema, c.table_name, c.column_name, 'acc_01'
      ),
      false, true, ''
    )))[1]::text::bigint AS row_count
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('account_id', 'tenant_id', 'business_id', 'branch_id')
  ORDER BY row_count DESC, c.table_name, c.column_name;
  ```
- **Gate 1 Conditions Locked**:
  1. 8-file / 16-handler sweep classified below; implement only simple print/export of existing data with existing templates; disable rest with `"Not available yet"` and log `DEFERRED` (zero CI guard exceptions).
  2. `3.12`: Ship only `Scrapped` status + `mfg_ncr_records`; hold stock/WIP/CMUP adjustment until owner confirms valuation rule.
  3. `edu_attendance` dedupe (`1.2`): Keep newest `updated_at` (tie-break `id`), soft-delete older rows; groups with differing statuses flagged for manual review before Step 6.
  4. `4.2`: Remove every `|| 'acc_01'` fallback in production paths and fail closed (block write, visible error, nothing queued); demo workspace sets tenant explicitly behind demo flag.
  5. `5.6`: Document `trading_commercial` and `rental_booking` effective roles & `canViewSensitivePayroll` before/after at Gate 3 with least-privilege diffs; treat over-privilege as blocker.
  6. `1.1`: Merge `addMemberCheckIn` and `checkInMember` into one action with remote-reversing undo.
  7. `1.6`: Freelance active timer cross-device sync moved to **Phase 3 backlog (`7.7`)**; random salon receipt numbers moved to **Phase 2 backlog (`6.1`)**.
  8. New tests in `vitest`, both runners kept green in CI, no Playwright in Phase 1; SQL test harness proposed below.
  9. `5.11`: Audit `ToastContainer`, dynamic imports, and barrel exports before proposing deletions at Gate 3.
  10. `4.11`: Replace hardcoded modal amount defaults with empty/placeholder fields and config-backed defaults.

---

### 1.6 Full Group A Store Actions Audit (`src/services/store.ts`)

| Exported Action | Lines | Remote Service Sync? | Classification / Remediation Action |
|---|---|---|---|
| `setScreen`, `setTheme`, `setDensity`, `setLanguage`, `setSystemDefaultLanguage` | `4735-4739` | `NO` | Intentional UI/preference state (`localStorage` theme/lang/density) |
| `switchFacility`, `switchBusiness`, `switchBranch`, `selectMember`, `closeDetail` | `4740-4753` | `NO` | Intentional active-context / UI selection state |
| `addMember`, `updateMember`, `deleteMember` | `4777-4891` | `YES` (`memberService`, `syncCoordinator`) | Synced + undo reverses remote |
| `checkInMember` | `4942-5055` | `YES` (`memberService.recordCheckIn`) | Partial undo gap (`1.1` merges with `addMemberCheckIn` + deletes remote check-in on undo) |
| `addMemberCheckIn` | `15555-15581` | `NO` | **Local-only gap (`1.1`)** — merged into `checkInMember` in Step 6 |
| `addWalkInTicket` | `15582-15631` | `YES` (`memberService.upsertWalkInTicket`, `syncCoordinator`) | Synced (`1.1` adds reserved-block sequential numbering) |
| `addLead`, `updateLeadStatus`, `deleteLead`, `convertLeadToMember` | `5058-5192` | `YES` (`memberService`, `syncCoordinator`) | Synced |
| `processSale`, `adjustStock`, `updateProduct`, `deleteProduct`, `deleteSale`, `batchDeleteSales`, `addProduct`, `batchDeleteProducts`, `batchRestockProducts` | `5275-5840`, `7273-7452`, `8556` | `YES` (`posService`, `tradingService`, `syncCoordinator`) | Synced |
| `refundSale` | `5428-5581` | `PARTIAL` (`posService.upsertProduct` + `pos_sales`) | **Gap (`1.5`)** — return `StockMovement` stays local; fixed via `pos_refund_with_stock` RPC in Step 6 |
| `parkOrder`, `resumeParkedOrder`, `deleteParkedOrder`, `updateReceiptConfig` | `6960-7140` | `YES` (`posService`, `syncCoordinator`) | Synced |
| `upsertScheduleEvent`, `deleteScheduleEvent`, `batchDeleteScheduleEvents` | `5889-6010` | `YES` (`memberService`, `syncCoordinator`) | Synced |
| `createStaffMember`, `updateStaffMember`, `freezeStaffMember`, `vacationStaffMember`, `terminateStaffMember`, `deleteStaffMember`, `addStaff` | `6057-6360`, `8197` | `YES` (`staffService`, `syncCoordinator`) | Synced |
| `punchStaffAttendance`, `logStaffAttendanceManual`, `createStaffSalaryAdvance`, `waiveStaffSalaryAdvance`, `generateStaffPayrollRun`, `approveStaffPayrollRun`, `markStaffPayrollSlipPaid` | `6361-6959` | `PARTIAL` (`staffService` + `localStorage` shadow in hooks/util) | **Section 2 (`Step 7a/7b`)** — DB becomes strict source of truth, transactional RPC, immutable approved runs/logs |
| `createAppointment`, `updateAppointmentStatus`, `rescheduleAppointment`, `deleteAppointment`, `addServiceItem`, `checkoutAppointment`, `batchDeleteAppointments`, `batchUpdateAppointmentStatus`, `updateServiceItem`, `deleteServiceItem`, `batchDeleteServiceItems`, `updateStylistPayoutStatus` | `7525-8132` | `YES` (`appointmentService`, `syncCoordinator`) | Synced (`SalonQuickChairKiosk` random receipt string deferred to **Phase 2 backlog `6.1`**) |
| `updateSalonChairStation` | `15632-15692` | `YES` (`appointmentService.upsertChairStation`, `syncCoordinator`) | Synced (`1.3` wires `SalonQuickChairKiosk` UI to store + adds `started_at` column) |
| `addBusiness`, `addBranch`, `registerDevice`, `revokeDevice`, `redeemVoucher` | `8254-8554` | `YES` (`tenantService`, `syncCoordinator`, `licenseService`) | Synced |
| `resolveSubRolesForUser`, `login`, `loginWithPin`, `switchStaffUser`, `logout`, `open*`, `close*`, `completeOnboarding` | `8619-9166` | `NO` (except `completeOnboarding` calls `tenantService`) | Intentional auth/modal/session state |
| `startTimer`, `pauseTimer`, `resumeTimer`, `resetTimer` | `2140-2320` | `NO` | **Deferred to Phase 3 backlog (`7.7`)** — live tick microstate; `stopTimer` (`2187`) already syncs completed logs to `freelance_time_logs` |
| `stopTimer`, `addFreelance*`, `updateFreelance*`, `deleteFreelance*`, `addDeliverable`, `updateDeliverable*`, `deleteDeliverable`, `logTimeEntry`, `updateTimeLog`, `deleteTimeLog`, `billUnbilledHours`, `updateInvoiceStatus`, `convertProposalToProject` | `2187-2309`, `9178-10606` | `YES` (`freelanceService`, `syncCoordinator`) | Synced (`updateDeliverableStage` delegates to `updateDeliverable`) |
| `createRentalBooking`, `updateRentalBooking`, `deleteRentalBooking`, `checkInBooking`, `checkOutBooking`, `createRentableUnit`, `updateRentableUnit`, `deleteRentableUnit`, `createRentalRenter`, `updateRentalRenter`, `deleteRentalRenter`, `releaseSecurityDeposit`, `deductSecurityDeposit` | `10612-11308` | `YES` (`rentalService`, `syncCoordinator`) | Synced |
| `addEduStudent`, `updateEduStudent`, `deleteEduStudent`, `addEduCohort`, `updateEduCohort`, `deleteEduCohort`, `addEduSession`, `updateEduSession`, `deleteEduSession`, `batchRecordAttendance`, `recordEduGrade`, `deleteEduGrade`, `recordTuitionPayment`, `addEduEnrollment`, `addEduAdmissionLead`, `updateAdmissionStage`, `updateEduAdmissionLead`, `deleteEduAdmissionLead`, `convertAdmissionToStudent`, `issueEduCertificate`, `addEduClassroom`, `addEduCourse` | `11561-12696` | `YES` (`educationService`, `syncCoordinator`) | Synced |
| `recordQuickAttendance` | `15693-15716` | `NO` | **Local-only gap (`1.2`)** — wired to `educationService.upsertAttendance` + partial unique index in Step 6 |
| `setActive*Role`, `setActivePmSubScreen`, `toggleTopBar*`, `setTopBar*`, `toggleListPodExpanded`, `setListPodExpanded`, `openSettingsTab`, `setSettingsTab`, `clearSettingsFocusSection`, `canAccessStaffScreen`, `canViewSensitivePayroll` | `1917-2420`, `12703-12746`, `15531-15554`, `15717-15755` | `NO` | Intentional UI/navigation/permission helpers |
| `addPm*`, `updatePm*`, `reviewPm*`, `closePmRollCall`, `approvePm*`, `rejectPm*`, `generatePmCcpSlipsForBatch`, `markPmCcpSlipPrinted`, `deletePmProject`, `batch*Pm*` | `2422-3007`, `12752-14424` | `YES` (`projectMilestoneService`, `syncCoordinator`) | Synced |
| `createCommercialDoc`, `updateCommercialDoc`, `deleteCommercialDoc`, `convertCommercialDoc`, `createPurchaseDoc`, `updatePurchaseDoc`, `receivePurchaseDoc`, `createStockVoucher`, `createB2bClient`, `updateB2bClient`, `deleteB2bClient`, `createB2bSupplier`, `updateB2bSupplier`, `deleteB2bSupplier`, `createWarehouseDepot` | `14571-15422` | `YES` (`tradingService`, `syncCoordinator`) | Synced |
| `updateBusinessIdentity`, `updateBusinessConfig`, `dismissSetupBanner`, `restoreSetupBanner`, `addMembershipPlan`, `updateMembershipPlan`, `toggleMembershipPlanActive`, `deleteMembershipPlan`, `addCategoryFormule`, `updateCategoryFormule`, `toggleCategoryFormuleActive`, `duplicateCategoryFormule`, `deleteCategoryFormule` | `15757-16361` | `YES` (`configService`, `memberService`, `syncCoordinator`) | Synced |
| `seedDemoInventory`, `reset*MockData`, `resetAllData`, `resetToDefaultDemoData`, `exportDatabase`, `importDatabase`, `validateBackupSnapshot`, `resolveConcurrencyConflict`, `dismissConcurrencyConflict`, `setNetworkMode`, `retryCloudSync`, `syncWithSupabase` | `3131-4239`, `7142-7523`, `11310-11555`, `13624-13780`, `14426-15534` | `YES` (`syncWithSupabase`, `retryCloudSync`) / `NO` (demo resets & backup helpers) | Demo reset / local backup / sync orchestration helpers |

---

### 3.x Sweep — 8 Files / 16 Toast-Only Handlers Classification

Per Gate 1 Condition #1: **simple print/export of existing data using existing templates** are implemented in Step 5; all **fake-success** handlers with no backend/delivery capability are **disabled with `"Not available yet"`** and logged `DEFERRED` (no CI guard exceptions).

| # | File & Line | UI Label | Classification | Planned Step 5 Resolution |
|---|---|---|---|---|
| 1 | `MembershipFinanceView.tsx:595` | `Relancer impayés` | `fake-success` (no SMS/email gateway; also uses synthesized rows) | **DEFERRED**: Disable with `"Not available yet"` tooltip (Phase 2 reminders `6.5`) |
| 2 | `MembershipFinanceView.tsx:877` | `Relancer` (drawer quick action) | `fake-success` | **DEFERRED**: Disable with `"Not available yet"` tooltip (`6.5`) |
| 3 | `AutoGarageBillingView.tsx:1090` | `Relevé Mensuel` (fleet card) | `legitimate` (print/export of existing fleet & invoice data) | **IMPLEMENT**: Print/CSV fleet monthly statement from live store data |
| 4 | `MedicalBillingView.tsx:1219` | `Émettre Règlement` (practitioner payout) | `fake-success` (no persisted payout ledger/bank transfer) | **DEFERRED**: Disable with `"Not available yet"` tooltip (Phase 2 payments `6.2`) |
| 5 | `ContractorDailyLogsView.tsx:1305` | `Contrôle` (fuel fan action) | `fake-success` (repeats anomaly metric already shown in row badge without audit record) | **DEFERRED**: Disable with `"Not available yet"` or open detail inspector tab (check at Step 5) |
| 6 | `ContractorDailyLogsView.tsx:1465` | `Imprimer PV` (drawer quick action) | `legitimate` (print existing daily log sheet) | **IMPLEMENT**: Trigger real print sheet (`window.print()` with formatted PV block) |
| 7 | `ContractorDailyLogsView.tsx:1490` | `Audit HSE` (drawer quick action) | `fake-success` (claims safety control validated with no DB write) | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 8 | `RealEstateFinanceView.tsx:601` | `Partager Reçu` (fan action) | `fake-success` (claims receipt transmitted without copy/PDF/link) | **DEFERRED**: Disable with `"Not available yet"` tooltip (or copy existing quittance summary — classify cleanly in Step 5; no fake transmission claim) |
| 9 | `RealEstateFinanceView.tsx:684` | `Partager` (drawer quick action) | `fake-success` | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 10 | `LogisticsCodView.tsx:430` | `Avis SMS` (fan action) | `fake-success` (no SMS provider integration) | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 11 | `LogisticsCodView.tsx:878` | `Reçu Virement` (row action) | `legitimate` (print/export COD settlement slip from live shipment record) | **IMPLEMENT**: Print COD settlement slip (`window.print()` formatted slip) |
| 12 | `LogisticsCodView.tsx:890` | `Avis SMS` (row action) | `fake-success` | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 13 | `LogisticsCodView.tsx:1447` | `Reçu Virement` (drawer action) | `legitimate` | **IMPLEMENT**: Print COD settlement slip |
| 14 | `LogisticsCodView.tsx:1459` | `Avis SMS` (drawer action) | `fake-success` | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 15 | `LogisticsScannerView.tsx:906, 1040, 1064` | `Imprimer Barcode` / `Étiquette AWB` | `legitimate` (print AWB shipping label from existing shipment) | **IMPLEMENT**: Open/print real AWB label layout |
| 16 | `LogisticsScannerView.tsx:918, 1050` | `Partager Bordereau` / `Partager` | `fake-success` (claims tracking link copied with no real public portal or clipboard copy) | **DEFERRED**: Disable with `"Not available yet"` tooltip |
| 17 | `AgricultureWholesaleView.tsx:957, 1085, 1139` | `Partager Bordereau` / `Partager lien télé-déclaration` | `fake-success` (claims tele-declaration link copied with no portal/clipboard) | **DEFERRED**: Disable with `"Not available yet"` tooltip |

*(Note: handlers #6, #11, #13, #15 in the scanned files were additional toast-only print handlers discovered while mapping the 8 files, brought into scope cleanly.)*

---

### SQL Test Harness Proposal (Gate 1 Condition #8)

- **Harness File**: `scripts/db/test_rls_rpc_triggers.sql`
- **Mechanism**: Pure `BEGIN; ... ROLLBACK;` PostgreSQL transaction harness executed against `psql "$DATABASE_URL" -v ON_ERROR_STOP=1`:
  1. Sets simulated JWT claims (`SET LOCAL role authenticated; SELECT set_config('request.jwt.claim.sub', '<uuid>', true);`) for:
     - **User A** (Tenant A, Business A, Branch A)
     - **User B** (Tenant B, Business B, Branch B)
     - **Platform Admin** (`platform_admins.is_active = true`)
  2. Verifies **RLS isolation**:
     - Global ref (`statutory_rates`, `wilayas_ref`): User A can `SELECT`; User A `INSERT`/`UPDATE` fails (`insufficient_privilege`); Platform Admin `INSERT`/`UPDATE` succeeds.
     - Tenant tables (`logistics_wilaya_tariffs`, `pos_cash_sessions`, `mfg_ncr_records`, `edu_attendance`): User A cannot `SELECT`/`UPDATE` Tenant B rows (`0` rows returned/affected).
  3. Verifies **RPC caller checks & atomicity**:
     - `allocate_sequence_number` / `reserve_sequence_block`: fails when caller is not a member of `(business_id, branch_id)`; increments atomically and monotonically when caller is a valid member.
     - `pos_refund_with_stock`, `mfg_scrap_with_ncr`, `approve_payroll_run`: rollback/reject on unauthorized branch or invalid state transition.
  4. Verifies **DB Triggers**:
     - `statutory_rates`: updating rate values or `effective_from` on a referenced row raises exception; updating `verification_status` succeeds for platform admin.
     - `staff_attendance_logs`: `UPDATE` / `DELETE` raises append-only exception.
     - `staff_payroll_runs` / `staff_payroll_slips`: direct edits to approved/paid runs raise exception; duplicate `(business_id, branch_id, period_year, period_month, run_type, adjustment_seq)` raises unique violation.
- **Do We Need a Live Staging Project?**:
  - **Not for RLS/RPC/Trigger logic tests**: `.github/workflows/ci-db-hardening.yml` already spins up `postgres:16-alpine` with Supabase `auth.users`, `auth.uid()`, `anon`, `authenticated`, and `service_role` stubs, so `test_rls_rpc_triggers.sql` runs hermetically in CI and local Docker Postgres.
  - **Yes, before Production Deploy** for Storage bucket upload/MIME/RLS integration and real Supabase Auth session verification (`Step 2` storage policies + `Step 8` pre-release checklist), because the CI Postgres container does not run Supabase's `storage-api` or `gotrue` HTTP services.

---

## Step 1 — Queue Hardening (`6.11`) & Report-Only CI Guards (`12.5`)

- **Commit Reference**: `fix(all): 6.11 harden offline queue and add 12.5 phase-1 report-only CI guards`
- **Changes**:
  - `src/lib/supabase/offlineQueue.ts`: Added max capacity thresholds (`WARN_QUEUE_SIZE = 200`, `MAX_QUEUE_SIZE = 500`) with alert listeners; poison-message quarantine (`atrium_offline_quarantine_v1`) on max attempts or non-retryable 4xx Postgres/PostgREST errors (`22P02`, `23503`, `23505`, `42501`, etc.); dependency-ordered replay priority (`TABLE_REPLAY_PRIORITY`) + `dependsOnId` cycle deferral; exponential backoff (`nextRetryAt`, `ignoreBackoff` override); and `exportOfflineQueueSnapshot()` / quarantine retry & dismiss helpers.
  - `src/components/common/ErrorBoundary.tsx`: Preserves `atrium_offline_mutation_queue_v1` and `atrium_offline_quarantine_v1` during cache reset, displays pending/quarantined mutation count, provides JSON export download, and translates UI strings via FR/AR/EN keys.
  - `src/utils/locales/{en,fr,ar}.json`: Added `recovery_*` and `offline_queue_*` keys in EN/FR/AR.
  - `src/config/localStorageRegistry.ts` + `scripts/ci/phase1-guards.mjs` + `package.json`: Added report-only `npm run ci:guards` covering `showToast`-only handlers, forbidden literals, `localStorage` key registry, and FR/AR/EN i18n parity.
  - `scripts/db/test_rls_rpc_triggers.sql`: Added transactional RLS/RPC/trigger verification harness skeleton (extended per step as migrations land).
  - `src/lib/supabase/__tests__/offlineQueueHardening.test.ts`: Added Vitest suite for queue cap, quarantine, dependency ordering, backoff, export, and `ErrorBoundary` preservation.

---

## Step 2 — Phase 1 Trust Infrastructure (Gate 2 Pending Approval)

- **Commit Reference**: `feat(infra): step-2 platform admins, effective_from statutory rates, wilayas_ref, sequence RPCs, centimes helper & storage RLS`
- **Database Migration & Rollback**:
  - `supabase/migrations/202611240001_phase1_trust_infrastructure.sql` & `supabase/rollbacks/202611240001_phase1_trust_infrastructure.down.sql`:
    - `public.platform_admins` + `is_platform_admin()` / `is_platform_super_admin()` (manual SQL bootstrap; zero hardcoded IDs).
    - `public.statutory_rates` (`effective_from`-only versioning, no `effective_to`, no exclusion constraint, `fn_protect_referenced_statutory_rates` verify-only lock trigger on referenced runs, `get_effective_statutory_rates(date)` RPC, seeded strictly from existing code with `verification_status = 'unverified'` and `snmg_dzd = NULL`).
    - `public.wilayas_ref` (58 legacy wilayas seeded as `unverified`, `valid_from = '2021-01-01'`, `valid_to = NULL`, global auth-read / platform-admin-write RLS). Existing `public.logistics_wilaya_tariffs` (tenant + branch RLS) verified.
    - `public.sequence_counters`, `public.device_sequence_blocks` (strictly restricted to `'walk_in_ticket'` and `'deposit_receipt'`), `allocate_sequence_number`, and `reserve_sequence_block` `SECURITY DEFINER` RPCs with explicit `business_id` / `branch_id` caller membership checks and `FOR UPDATE` locks.
    - Private Storage buckets (`expense-receipts`, `bat-deliverables`) + tenant/branch path-prefix RLS guarded cleanly with `to_regclass('storage.buckets')` for CI Postgres 16 compatibility.
  - `scripts/db/test_rls_rpc_triggers.sql` & `.github/workflows/ci-db-hardening.yml`: Added transactional RLS/RPC/trigger assertions for Step 2 and wired harness + Step 2 rollback/re-apply parity into CI.
- **Application Services, Helper & UI**:
  - `src/utils/money.ts` + `src/utils/__tests__/money.test.ts`: Shared integer-centimes helper enforcing `HALF_AWAY_FROM_ZERO` (`roundHalfAwayFromZero`, `scaleAndRoundHalfAwayFromZero`) via decimal-string scaling (immune to IEEE-754 half-centime drift), verified on positive and negative amounts/refund mirroring. Scoped strictly to **app money** (POS/invoices/deposits/sales); statutory payroll rounding rules (IRG/CNAS) remain explicitly subject to Algerian accountant verification before Step 7.
  - `src/lib/supabase/services/referenceDataService.ts`: `effective_from` lookup (non-null dates outrank `NULL` code-baseline rows), missing-parameter detection (`snmg_dzd`), platform-admin verification & new-version publishing, and 58-wilaya catalog service (`validFrom: null`).
  - `src/lib/supabase/services/sequenceService.ts`: Server sequence RPC wrapper and offline device block manager (strictly rejecting `'fiscal_invoice'` and `'z_report'`).
  - `src/lib/supabase/__tests__/referenceAndSequence.test.ts`: Vitest coverage for `effective_from` resolution, `NULL` baseline seed dates, `irg_transitional_config` dual-formula payload, null SNMG detection, 58-wilaya fallback, offline block allocation/exhaustion, and `fiscal_invoice`/`z_report` rejection.
  - `src/components/screens/settings/SettingsReferenceRatesTab.tsx` + `src/components/screens/SettingsScreen.tsx` + `src/types/index.ts` + `src/utils/locales/{en,fr,ar}.json`: Added `Reference & Tariffs` Settings tab exposing Tenant Wilaya Tariff Zone editing (`WilayaTariffModal`), `statutory_rates` unverified/SNMG banners (`ref_date_unknown` when `effectiveFrom === null`) + Platform Admin version creation/verification, and searchable `wilayas_ref` verification table.
  - `src/components/screens/logistics/WilayaTariffModal.tsx` & `src/lib/supabase/services/logisticsService.ts`: Removed `'acc_01'` fallbacks on tariff writes (now fail closed with explicit tenant-context error).

### Gate 2 Resolution & Conditions Locked (Pre-Step 3)

- **Decision 1 — Money Rounding Scope**: Renamed helper mode to `HALF_AWAY_FROM_ZERO` (`roundHalfAwayFromZero` / `scaleAndRoundHalfAwayFromZero`) with negative-number & refund-mirroring tests; scoped solely to app money (accountant consultation required before Step 7 for statutory IRG/CNAS rounding).
- **Decision 2 — Z-Report (`1.4`) Policy Locked (Option B — Provisional Offline Close)**:
  1. Server remains sole issuer of final sequential Z-report numbers via `allocate_sequence_number(..., 'z_report', ...)` — `reserve_sequence_block` explicitly rejects `'z_report'`.
  2. When offline, cashiers may still close shifts as `"Provisional Close (pending server Z-number)"` (`local_close_ref` + `status = 'provisional_pending_sync'`).
  3. On reconnect, `syncCoordinator` syncs the provisional Z-report and calls `allocate_sequence_number('z_report')` to stamp the permanent gap-free Z-number (`Z-YYYY-NNNNN`).
  4. Reconnect reconciliation checks closed-day drift; mismatched/late closures are flagged for owner review.
  5. Both offline Z-reports and provisional closes are **forbidden** from reusing `pos_sales` or `device_sequence_blocks` numbering.
  6. Printed provisional Z-slips carry a clear `"PROVISIONAL — NOT FINAL Z"` header/watermark (EN/FR/AR).
- **Condition (a) — SQL Harness & Sandbox Disclosure**: Extended `scripts/db/test_rls_rpc_triggers.sql` with cross-tenant `logistics_wilaya_tariffs` RLS isolation, non-overlapping sequential `reserve_sequence_block` ranges (`1..25`, `26..50`), `trg_protect_referenced_statutory_rates` trigger attachment check, `NULL` vs `2026-01-01` effective-date fallback, and `chk_statutory_rates_effective_from` check. **Sandbox disclosure**: `psql`, `pg_ctl`, and `docker` are not installed in this container, so `test_rls_rpc_triggers.sql` was **not executed locally** and runs via `.github/workflows/ci-db-hardening.yml` against CI `postgres:16-alpine`; Supabase `storage.buckets`/`storage.objects` policies require a live Supabase staging project before production deploy.
- **Conditions (c) & (d) — Exact Seed Provenance & Dual Transitional IRG Rule**: Removed `'2021-01-01'` and `'2022-01-01'` from `wilayas_ref.valid_from` and `statutory_rates.effective_from` (now `NULL`, `version_code = 'DZ-CODE-BASELINE-UNVERIFIED'`, `is_legacy_baseline = true`). Added `irg_transitional_config` recording both `active_code_formula` (`round(irgAfterRebate * (brutImp - 30000) / 5000)` at `algerianPayroll.ts:124`) and `code_comment_formula` (`IRG_normal * (137 / 51) - (27925 / 51)` at `algerianPayroll.ts:121`).
  - Statutory seed provenance: CNAS `0.09`/`0.26` (`algerianPayroll.ts:170-172`), IRG brackets (`0..20k 0%`, `20001..40k 23%`, `40001..80k 27%`, `80001..160k 30%`, `>160k 35%`, `algerianPayroll.ts:88-109`), Abatement `40%` min `1000` / max `1500` (`algerianPayroll.ts:114-116`), Exemption `<= 30000` & Transitional `30001..<35000` (`algerianPayroll.ts:79,122`), Overtime `1.5` / `2.0` (`algerianPayroll.ts:156`), SNMG `NULL` (not in code), TVA `[0, 9, 19]` (`rules.ts` / presets), Commercial Timbre `1% min 20 max 2500` (`rules.ts:487-489`), Art. 317 Timbre `rules.ts:511-519` (`<=500:0, <=3000:20, <=10000:50, <=50000:100, <=100000:200, >100000: 1% max 2500`).
- **Condition (e) — Queue Cap Fails Closed Without Data Loss**: Removed `'queue_overflow'` quarantine writes; hitting `MAX_QUEUE_SIZE = 500` emits `at_capacity`, throws `OfflineQueueCapacityError` (`QUEUE_AT_CAPACITY`), keeps all 500 pending items intact, returns `{ success: false, queued: false, blockedByCapacity: true }` from `syncCoordinator`, and displays visible localized toasts in `store.ts`.
- **Condition (f) — Active CI Guard Ratchet**: Created `scripts/ci/phase1-guards-baseline.json` (`showToastOnly: 66` classified table, `forbiddenLiterals: 143`, `unregisteredStorageKeys: 0`, `i18nAsymmetry: 0`), switched `scripts/ci/phase1-guards.mjs` default mode to exit `1` on any regression above baseline, and added `npm run ci:guards` to `.github/workflows/ci-db-hardening.yml`.

---

## Step 3 — Hardcoded Values & Fixtures (`4.1`–`4.11`)

- **Guard & Tenant Context Hardening (`4.1`–`4.5`, `4.8`–`4.9`)**:
  - Removed all runtime `'acc_01'` fallbacks across components, services, and Group B `*Data.ts` hooks (`src/lib/supabase/tenantContext.ts` fails closed on missing tenant context).
  - Removed hardcoded demo tax/fiscal literals (`001916010044589`, `16/00-0988421`, `CAW-16-09418`), hardcoded PM/salon staff/member fallbacks (`stf_pm_01`, `crea_lead_01`, `mem_salon_`, `stf_salon_01`), and stale `"58 Wilayas"` UI/code references (updated to `"69 Wilayas"`, preserving `ref_wilayas_legacy_badge` for the legacy 58-wilaya catalog flag).
  - Hardened `VenueCloudSyncModal` / cloud diagnostic gating behind dev-build or `platform_admins` check (`useCanAccessVenueCloudDiagnostics`) and removed hardcoded staging Supabase host literal.
- **Safe Binary BAT Metadata & Real Project Metrics (`4.6`–`4.7`)**:
  - `src/utils/batMetadata.ts` (`inspectBatFileBytes` / `inspectBatFile`): Reads PNG (`IHDR` / `pHYs`), TIFF (`ImageWidth` / `ImageLength` / `PhotometricInterpretation` / `XResolution`), and PDF/AI (`/DeviceCMYK`, `/DeviceRGB`, `/BleedBox`) headers safely without fabricating defaults; missing/unreadable fields remain `null` and tag uploads as `'manual / unverified'`.
  - `src/utils/projectMetrics.ts` (`computeAvailableAuditYears`, `computeDirectionFinancialAudit`, `computeSuperviseurSlaSummary`): Computes direction audit and SLA metrics strictly from live project/expense/mission/attendance/payroll records.
- **Nullable Membership Plan Quotas (`4.10`)**:
  - `src/lib/supabase/services/memberService.ts` (`mapMembershipPlanFromDb` / `upsertPlan`) & `MembershipPlans` / `MembershipRegistrationsView`: Preserved `null` `durationDays` and `totalSessions` without name-substring heuristics.
- **Modal Numeric Defaults Sweep (`4.11`)**:
  - Cleared hardcoded numeric/sample creation defaults to `''` with descriptive placeholders and explicit validation across `RealEstateLeaseModal`, `ContractorProjectModal`, `ContractorBoqView`, `AutoOrderModal`, `ContractorBillingView`, `LogisticsShipmentModal`, `AutoGaragePartsView`, `AgriCropCycleModal`, `AgricultureHarvestView`, `AgriMilkingModal`, `AgricultureParcelModal`, `PosRegisterView`, `PosInventoryView`, `TradingCatalogView`, `ContractorDailyLogsView`, `MedicalConsultationModal`, `MedicalPatientsView`, `MedicalBillingView`, `VenueInventoryView`, and `AppointmentModal`.
- **CI Guards & Step 3 Unit Tests**:
  - Tightened `scripts/ci/phase1-guards.mjs` Guard 2 (`FORBIDDEN_PATTERNS`) to catch `acc_01`, staging Supabase host, Unsplash URLs, demo NIF/RC/Carte Fellah, `stf_pm_01`, `crea_lead_01`, `mem_salon_`, `stf_salon_01`, and stale `58 wilaya` literals; lowered `scripts/ci/phase1-guards-baseline.json` `metrics.forbiddenLiterals` from `143` to `0`.
  - Added Vitest unit tests: `src/utils/__tests__/batMetadata.test.ts`, `src/utils/__tests__/projectMetrics.test.ts`, and `src/lib/supabase/__tests__/storageAndPlans.test.ts`.

---

## Section 14 Backlog (Deferred Verifications — Untouched in Phase 1)

1. **Art. 317 Fiscal Stamp Duty Bracket Divergence (`src/utils/rules.ts:511-519` vs `src/utils/logisticsRules.ts:103-113`)**:
   - `calculateArt317Timbre` (`rules.ts:511-519`): `<= 500 → 0`, `<= 3 000 → 20`, `<= 10 000 → 50`, `<= 50 000 → 100`, `<= 100 000 → 200`, `> 100 000 → min(2 500, round(amount * 0.01))`.
   - `computeAlgerianFiscalStamp` (`logisticsRules.ts:103-113`): `<= 500 → 0`, `<= 3 000 → 20`, `<= 10 000 → 30`, `<= 20 000 → 40`, `<= 50 000 → 50`, `> 50 000 → min(2 500, round(amount * 0.01))`.
   - **Action**: Both implementations remain untouched in Phase 1; flagged for statutory verification against the current Algerian Code du Timbre before Step 7/Phase 2 rate verification.
2. **IRG Transitional Band (`30 001`–`35 000` DZD) Formula Conflict (`src/utils/algerianPayroll.ts:121-124`)**:
   - Comment cites `IRG_normal * (137/51) - (27925/51)` while active code computes `round(irgAfterRebate * (brutImp - 30000) / 5000)`; both preserved explicitly in `statutory_rates.irg_transitional_config` pending accountant verification before Step 7.
3. **Freelance Active Timer Cross-Device Sync (`7.7`)** & **Salon Receipt Random Numbering (`6.1`)** — deferred from `1.6` / `1.3` per Gate 1.

---

## Step 4 — Routing, Roles & Access (`5.1`–`5.11` & Reconciled Gate 3 Package)

> **Pre-Step 4 Continuity (Step 3 & Gate 2 `(a)`–`(f)` Already Completed Above)**:
> - **(a)** SQL harness `scripts/db/test_rls_rpc_triggers.sql` extended for RLS/RPC/triggers + CI `.github/workflows/ci-db-hardening.yml` (*sandbox note: no `psql`/`pg_ctl`/`docker` in container; executes in GitHub CI Postgres 16*).
> - **(b)** Section 14 Art. 317 divergence (`rules.ts:511-519` vs `logisticsRules.ts:103-113`) documented & left untouched pending accountant verification.
> - **(c)–(d)** `statutory_rates.effective_from`, `wilayas_ref.valid_from`, and `snmg_dzd` seeded `NULL` (`DZ-CODE-BASELINE-UNVERIFIED`), preserving dual transitional IRG formulas.
> - **(e)** Offline queue `MAX_QUEUE_SIZE = 500` fails closed (`OfflineQueueCapacityError`, zero silent drops/overflows).
> - **(f)** Ratchet baseline saved (`scripts/ci/phase1-guards-baseline.json`): `showToastOnly: 66`, `forbiddenLiterals: 143 -> 0`, `unregisteredStorageKeys: 0`, `i18nAsymmetry: 0`.
> - **Scope Boundaries**: Zero Step 5 (`3.x`) handlers modified; zero `5.11` files deleted prior to explicit user authorization.

---

### 1. Full 16-Vertical × Every-Role Golden Matrix & `5.5` / `5.9` (`DONE`) Proof

`src/utils/routePermissions.ts` (`ROUTE_ALLOWLIST_BY_CATEGORY_ROLE` + `PM_ROLE_ROUTES` + `OPERATIONAL_ROUTES_NO_SWITCHER`) is the **single source of truth**. Verified in `src/utils/__tests__/routePermissions.test.ts`:

- **`5.5` (`DONE`) Stored Operational Role Migration**: `migrateStoredOperationalRole()` (`src/utils/staffRules.ts`) migrates legacy persisted role tokens (`conducteur` → `conducteur_travaux`, `metreur` → `daf_metreur`, `controleur` → `qualite`) during `loadState()` (`src/services/store.ts`), and `resolveSubRolesForUserGlobal()` emits `'conducteur_travaux'` and `'daf_metreur'` while preserving equivalence in permission checks (**zero diff** on existing workflows).
- **`5.9` (`DONE`) Semantic Route IDs**: `resolveSemanticRoute()` resolves canonical semantic IDs (`qc`, `orders`, `attendance`) plus legacy PM aliases (`pm_dir_projects` → `pm_dir_dashboard`, `pm_cp_files` → `pm_cp_deliverables`) inside both `canAccessRoute()` and `setScreenAction()`:
  - `orders` → `pm_cp_orders` (`project_milestone`), `registrations` (`pos_inventory`), `trading_purchases` (`trading_commercial`), `scheduler` (`auto_garage`, `manufacturing_production`).
  - `qc` → `finance` (`manufacturing_production`), `scheduler` (`construction_contractor`), `pm_cp_deliverables` (`project_milestone`).
  - `attendance` → `pm_sup_attendance` (`project_milestone`), `analytics` (`education_cohort`), `scheduler` (`construction_contractor`), `shop` (`agriculture_farming`).

| # | Vertical | Roles Verified | Allowed Routes Matrix |
|---|---|---|---|
| 1 | `membership_session` | `owner`, `staff` | `owner`: `home, dashboard, members, registrations, shop, scheduler, finance*, history, analytics, staff, settings` · `staff`: `home, dashboard, members, registrations` (+ `preferences`) |
| 2 | `appointment_service` | `owner`, `staff` | `owner`: full executive routes · `staff`: `home, dashboard, scheduler, members` (+ `preferences`) |
| 3 | `pos_inventory` | `owner`, `staff` | `owner`: full executive routes · `staff`: `home, dashboard, shop, scheduler, registrations, members` (+ `preferences`) |
| 4 | `education_cohort` | `owner`, `staff` | `owner`: full executive routes · `staff`: `home, dashboard, analytics, scheduler, members, shop, registrations` (+ `preferences`) |
| 5 | `project_milestone` | `direction`, `chef_projet`, `crea`, `superviseur`, `rh`, `compta` | `direction`: all `pm_*` + executive workspace routes · `chef_projet`: `home, pm_cp_*, scheduler, staff` · `crea`: `home, pm_crea_*, registrations` · `superviseur`: `home, pm_sup_*, analytics` · `rh`: `home, pm_rh_*, members, staff` · `compta`: `home, pm_compta_*, finance, shop` |
| 6 | `freelance_solo` | `Owner`, `Assistant` | `Assistant`: `home, dashboard, analytics, members, registrations, scheduler, shop, finance` (+ `preferences`); `Owner` adds `history, staff, settings` |
| 7 | `rental_booking` | `Owner`, `Reception` | `Reception`: `home, dashboard, scheduler, registrations, shop, members, finance, analytics` (+ `preferences`); `Owner` adds `history, staff, settings` |
| 8 | `trading_commercial` | `Owner`, `Cashier` | `Cashier`: `home, dashboard, trading_dashboard, trading_sales, registrations, trading_purchases, scheduler, trading_inventory, shop, trading_directory, members, trading_catalog, trading_finance, finance, analytics` (+ `preferences`); `Owner` adds `history, staff, settings` |
| 9 | `medical_clinic` | `Owner`, `Doctor`, `Infirmier` | `Infirmier`: `home, dashboard, scheduler, agenda, members, shop, registrations, finance` (+ `preferences`); `Doctor` adds `staff`; `Owner` adds `history, settings` |
| 10 | `auto_garage` | `gerant`, `reception`, `mecanicien`, `magasinier`, `caisse` | `gerant`: full executive · `reception`: `home, dashboard, scheduler, registrations, members, shop, finance` · `mecanicien`: `home, dashboard, scheduler, registrations, members, shop` · `magasinier`: `home, dashboard, shop, scheduler, registrations` (`finance` removed per `5.2`) · `caisse`: `home, dashboard, finance, members, scheduler` |
| 11 | `real_estate` | `direction`, `negociateur`, `gestionnaire_locatif`, `notaire_compta` | `direction`: full executive · `negociateur`: `home, dashboard, realestate_mandates, shop, members, registrations` · `gestionnaire_locatif`: `home, dashboard, members, scheduler, registrations, finance` · `notaire_compta`: `home, dashboard, realestate_mandates, shop, scheduler, finance` |
| 12 | `manufacturing_production` | `gerant`, `chef_atelier`, `operateur`, `magasinier`, `qualite`/`controleur` | `gerant`: full executive · `chef_atelier`: `home, dashboard, scheduler, registrations, shop, members, finance, staff` · `operateur`: `home, dashboard, scheduler, registrations` · `magasinier`: `home, dashboard, shop, members, finance` · `qualite`: `home, dashboard, scheduler, registrations, finance` |
| 13 | `legal_accounting` | `avocat_associe`, `notaire_titulaire`, `expert_comptable`, `avocat_collaborateur`, `clerc_notaire`, `secretaire_caisse` | Executives: full · Collaborateurs/Clercs: `home, dashboard, members, scheduler, registrations, finance, history` · `secretaire_caisse`: `home, dashboard, finance, members, scheduler, registrations* (filing-only), settings* (preferences-only)` |
| 14 | `logistics_delivery` | `gerant`, `dispatcher`, `hub_sorter`, `stop_desk_agent` | `gerant`: full executive · `dispatcher`: `home, dashboard, members, scheduler, registrations, staff, settings* (preferences-only)` · `hub_sorter`: `home, dashboard, registrations, members, scheduler` (no `finance` per `5.4`) · `stop_desk_agent`: `home, dashboard, registrations, members, scheduler, finance` |
| 15 | `construction_contractor` | `gerant`, `conducteur_travaux`, `chef_chantier`, `daf_metreur`, `comptable` | `gerant`: full executive · `conducteur_travaux`: `home, dashboard, members, registrations, shop, scheduler, finance, staff` · `chef_chantier`: same · `daf_metreur`: `home, dashboard, shop, scheduler, finance, members, registrations, settings* (preferences-only)` · `comptable`: `home, dashboard, finance, scheduler, shop, members` |
| 16 | `agriculture_farming` | `gerant`, `chef_culture`, `zootechnicien`, `magasinier` | `gerant`: full executive · `chef_culture`: `home, members, scheduler, shop, staff` · `zootechnicien`: `home, registrations` · `magasinier`: `home, finance, shop` |

*Intentional changes vs. pre-Step-4 baseline (separate list)*:
1. **`5.1`**: `membership_session` owner gains `'finance'` (`MembershipFinanceView` with `"Estimated, ledger pending"` banner & CSV tag).
2. **`5.2`**: `auto_garage` `magasinier` `'finance'` (`Réceptions`) removed from `Sidebar.tsx` and `routePermissions.ts`.
3. **`5.3`**: `legal_accounting` `secretaire_caisse` keeps `'registrations'` routed to `LegalVaultView` strictly in **filing-only mode** (`isFilingOnly = true`), excluding `avocat` & `Confidential` records and hiding edit/delete/bulk-delete actions; restored home link in `FieldAdvisoryHomeViews.tsx`.
4. **`5.4`**: `logistics_delivery` `hub_sorter` vs `stop_desk_agent` separated in `App.tsx` (`hub_sorter` cannot hit COD `finance`).
5. **Catalog Scoped `Settings` + Universal Language & Density**: `secretaire_caisse`, `dispatcher`, and `metreur`/`daf_metreur` retain catalog `'settings'` rendered strictly in **preferences-only mode** (`effectivePreferencesOnly = true`: Language, Theme, Compact Density/Auto-Hide only; executive tabs, fiscal config, backup/restore, desktop upgrade, and setup wizard hidden). All authenticated non-executive users can also switch **EN / FR / AR (RTL)** and **Compact Density** anytime via `TopBar` operator menu, `CommandPaletteModal`, or `'preferences'`.
6. **`5.6` / `5.7` / `5.8` / `5.10`**: Fail-closed role resolution, semantic alias normalization, non-mutating navigation, `<AccessRestrictedView />`, and server-bound audit logging.

---

### 2. Least-Privilege Before/After Diff, Owner Lockout Prevention & 16-Vertical Onboarding Test

| Scenario | Before (Fail-Open Escalation) | After (`staffRules.ts` + `routePermissions.ts`) | `canViewSensitivePayroll` | `settings` / `staff` |
|---|---|---|---|---|
| `trading_commercial` + `currentUser: null` | Escalated to `'Owner'` | Resolves `'Staff'` (fail-closed) | `false` | `false` / `false` |
| `trading_commercial` + `Cashier` | `'Cashier'` (blocked only where overridden) | `'Cashier'` (+ `'preferences'` for personal locale/density) | `false` | `false` / `false` |
| `trading_commercial` + `Owner` | `'Owner'` | `'Owner'` | `true` | `true` / `true` |
| `rental_booking` + `currentUser: null` | Escalated to `'Owner'` | Resolves `'Staff'` (fail-closed) | `false` | `false` / `false` |
| `rental_booking` + `Reception` | `'Reception'` | `'Reception'` (+ `'preferences'`) | `false` | `false` / `false` |
| `rental_booking` + `Owner` | `'Owner'` | `'Owner'` | `true` | `true` / `true` |
| Existing Owner with unset `role` in `localStorage` | Escalated implicitly | `hydrateCurrentUserSafe()` recovers `'Owner'` when matching active Owner record / `account.email` | `true` | `true` / `true` |
| Existing non-owner with unset `role` in `localStorage` | Escalated to `'Owner'` | `hydrateCurrentUserSafe()` fails closed to `'Staff'` | `false` | `false` / `false` |

- **16-Vertical Onboarding Invariant (`routePermissions.test.ts`)**: Executed `completeOnboarding()` across all **16 categories** while pre-polluted with restricted sub-roles (`chef_chantier`, `secretaire_caisse`) — verified every newly onboarded owner keeps `currentUser.role === 'Owner'`, `canViewSensitivePayroll('Owner') === true`, and full `settings` access.

---

### 3. Protective Fixes Added Alongside the Plan (Explicit Diffs)

1. **`switchStaffUser`, `login`, `loginWithPinAction`, `loginWithPin` (`src/services/store.ts`)**: Reject `frozen`/`terminated` staff switches/logins with localized FR/AR/EN messages while enforcing sole-active-owner immunity (`!isSoleActiveOwner(target, state.staff)`) so the last active Owner can **never** be locked out (same protection added to `vacationStaffMember`).
2. **`setScreenAction` (`src/services/store.ts`)**: Applies `resolveSemanticRoute` for semantic IDs (`qc`, `orders`, `attendance`, legacy aliases) without modifying `activePmRole`.

---

### 4. Server-Side Access-Denied Audit Trail (`log_access_denied_event` RPC) & Anti-Tampering Proof

- **Migration & Rollback**: `supabase/migrations/202611240003_phase1_security_audit_rpc.sql` + `supabase/rollbacks/202611240003_phase1_security_audit_rpc.down.sql`.
  - `public.log_access_denied_event(...)` is `SECURITY DEFINER` (`REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`).
  - **Anti-forgery**: Server derives `actor_auth_id := auth.uid()` and `actor_staff_id := get_auth_staff_id(v_account_id)` from the JWT/staff table — client cannot supply or forge `actor_auth_id` or `actor_staff_id`, nor pass non-UUID `record_id` (`record_id = NULL`).
  - **Tenant/Branch authorization**: Validates caller belongs to `v_account_id` and any supplied `business_id`/`branch_id`; rejects unauthorized/unauthenticated callers (`42501`).
  - **Server Rate Limit + Dedupe**: Partial index `idx_audit_access_denied_rate_limit` enforces 4-second server deduplication (`DEDUPED`) and caps events at **20 per 60 seconds** per `(actor_auth_id, actor_staff_id)` (`RATE_LIMITED`), independent of the client's 4-second map.
- **Offline Replay & Local Fallback**: `auditService.logAccessDeniedEvent()` (`src/lib/supabase/services/auditService.ts`) calls `.rpc('log_access_denied_event', ...)`, enqueues `kind: 'rpc'` against `table: 'immutable_audit_logs'` (`TABLE_REPLAY_PRIORITY = 50`) when offline or on transient errors, honors `OfflineQueueCapacityError` safely without crashing, and skips queuing on non-retryable `42501`/`22P02`/`PGRST202` errors. Local `atrium_security_audit_logs_v1` remains strictly a read cache/offline UX log.
- **Tests**: Covered in `auditService.test.ts` (3/3 Vitest), `migrationsAndRollbacks.test.ts`, and `scripts/db/test_rls_rpc_triggers.sql` Section 6 (CI Postgres 16).

---

### 5. Single-Source-of-Truth Grep Parity & Negative Mutation Proof

- **Grep Proof (`grep -rnE "ROUTE_ALLOWLIST_BY_CATEGORY_ROLE|canAccessHistoryScreen" src`)**:
  - `ROUTE_ALLOWLIST_BY_CATEGORY_ROLE` exists **only** at `src/utils/routePermissions.ts:216,535`.
  - Duplicate inline allowlist table removed from `App.tsx` (`isFocusEligibleScreen`) and duplicate `canAccessHistoryScreen` table removed from `CommandPaletteModal.tsx` (`canAccessRoute(category, permState, 'history')`).
  - `App.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `CommandPaletteModal.tsx`, and `SettingsScreen.tsx` all evaluate the exact same `canAccessRoute()` / `getEffectivePermissionContext()` helpers.
- **Negative Mutation Check**: `routePermissions.test.ts` includes an explicit assertion proving changing any restricted role permission (e.g., `hub_sorter` → `finance`) causes the test suite to fail immediately.

---

### 6. `5.11` Reconciled Orphan Inventory (All 20 Scanned Files — Zero Deleted, Pending Approval)

Static import, dynamic `React.lazy`, test reference, and barrel `export *` scan across `src/`:

| # | File Path | Classification | External Imports / Barrel / Test Refs | Decision Recommendation |
|---|---|---|---|---|
| 1 | `src/components/common/ToastContainer.tsx` | **Confirmed Orphan** | Zero imports, lazy loads, barrel re-exports, or tests (`App.tsx` uses `ToastStack.tsx`) | **Ready to Delete (awaiting user confirm)** |
| 2 | `src/components/modals/GoogleOAuthGuideModal.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | **Owner Decision Needed (keep for OAuth setup or delete)** |
| 3 | `src/components/common/AppleOverscrollContainer.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 4 | `src/components/common/staff/StaffSubTabSwitcher.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 5 | `src/components/screens/membership/MemberKineticRow.tsx` | **Candidate Orphan** | Zero imports/references across `src/` (superseded by `UniversalDataCollection`) | Hold for approval |
| 6 | `src/components/ui/ActionNode.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 7 | `src/components/ui/ConfirmDialog.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 8 | `src/components/ui/FilterCapsules.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 9 | `src/components/ui/SearchBox.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 10 | `src/components/ui/StatTile.tsx` | **Candidate Orphan** | Zero imports/references across `src/` | Hold for approval |
| 11 | `src/components/screens/membership/components/FloatingBulkBar.tsx` | **Candidate Orphan (Legacy Kit)** | Re-exported only inside `membership/components/index.ts`; zero external consumers (`UniversalDataCollection` uses `KineticFloatingBulkBar`) | Hold for approval |
| 12 | `src/components/screens/membership/components/MemberRow.tsx` | **Candidate Orphan (Legacy Kit)** | Self-internal (`RowFan`, `RowDetailIsland`) + `membership/components/index.ts`; zero external consumers | Hold for approval |
| 13 | `src/components/screens/membership/components/RowDetailIsland.tsx` | **Candidate Orphan (Legacy Kit)** | Used only by `MemberRow.tsx` + `membership/components/index.ts`; superseded by `KineticDetailIsland` | Hold for approval |
| 14 | `src/components/screens/membership/components/RowFan.tsx` | **Candidate Orphan (Legacy Kit)** | Used only by `MemberRow.tsx` + `membership/components/index.ts`; superseded by `KineticRowFan` | Hold for approval |
| 15 | `src/components/screens/membership/components/SlideInPanel.tsx` | **Candidate Orphan (Legacy Kit)** | Re-exported only inside `membership/components/index.ts`; zero external consumers | Hold for approval |
| 16 | `src/components/screens/membership/components/StatusTabs.tsx` | **Candidate Orphan (Legacy Kit)** | Re-exported only inside `membership/components/index.ts`; zero external consumers | Hold for approval |
| 17 | `src/components/screens/membership/components/index.ts` | **Candidate Orphan (Legacy Barrel)** | Barrel for items #11–#16 above; zero external imports anywhere in `src/` | Hold for approval |
| 18 | `src/components/ui/AtriumIntroOverlay.tsx` | **Keep (Active)** | Lazy-loaded by `App.tsx:200` + imported by `AtriumMonolith.tsx:2` | **Keep** |
| 19 | `src/components/ui/UndoHistoryPopover.tsx` | **Keep (Active)** | Imported & tested by `src/atrium/__tests__/undoEngine.test.tsx:24` | **Keep** |
| 20 | `src/atrium/components/EmptyState/EmptyState.stories.tsx` | **Keep (Active Test/Story)** | Imported by `src/atrium/components/EmptyState/EmptyState.test.tsx:15` | **Keep** |

---

### 7. Post-Remediation Verification Counts (Observed After Final Edit)

- **`npx tsc --noEmit` / `lint_applet`**: **0 errors** (PASS).
- **`npm run build` / `compile_applet`**: **0 errors** (PASS).
- **`npm test` (`tsx --test`)**: **102 / 102 passed** (3 suites, 0 failed).
- **`npm run test:atrium` (`vitest run`)**: **32 / 32 files, 269 / 269 tests passed** (`routePermissions.test.ts`, `section5Access.test.tsx`, `auditService.test.ts`, `migrationsAndRollbacks.test.ts`, plus full existing suite).
- **`npm run ci:guards`**: **RATCHET PASS** — `showToastOnly: 66` (`baseline: 66`), `forbiddenLiterals: 0` (`down from 143`), `unregisteredStorageKeys: 0`, `i18nAsymmetry: 0`.
- **SQL Test Harness (`scripts/db/test_rls_rpc_triggers.sql` Section 6)**: Extended with `log_access_denied_event` auth forgery, dedupe, and rate-limit assertions; **not run locally** (container has no `psql`/`docker`), runs in `.github/workflows/ci-db-hardening.yml`.
- **Live Browser Verification (`playwright-cli` on `http://localhost:3000`, `1440×900`)**:
  - `logistics_delivery` + `dispatcher` → `Settings` renders strictly `"Workspace Preferences"` (`data-testid="settings-preferences-only-banner"`), hides fiscal/license/backup tabs, and TopBar menu Language cycle flips cleanly to Arabic RTL (`dir="rtl"`, `lang="ar"`).
  - `legal_accounting` + `secretaire_caisse` → `Filing` renders `<LegalVaultView />` with `"Filing-only scope:"` banner, displays `DEP-2026-101`, and excludes `DOC-2026-999` (`avocat` `Confidential`).
  - `pos_inventory` + `staff` → `Settings` renders `<AccessRestrictedView />`, and `Return Home` navigates cleanly to Home with **`0` console errors / `0` uncaught page errors**.




