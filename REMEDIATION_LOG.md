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


