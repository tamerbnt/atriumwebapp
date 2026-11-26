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

---

## Step 5 — Toast-Only Stubs (`3.1`–`3.13` & Guard 1 Full Sweep)

- **Shared Infrastructure & Pure Helpers**:
  - `src/utils/step5Actions.ts` + `src/utils/step5Actions.test.ts`: Added pure helpers `resolveBatchSelection` (`0`, deleted IDs, `1000` print cap / `5000` CSV cap), `evaluateClassEnrollment` (capacity + waitlist + duplicate check), `planWeekDuplication` (room/coach overlap conflict detection), `prepareDepositReceiptPrint` (`deposit_receipt` sequence + `printedCount > 1` `DUPLICATA` trigger), `isInspectionEditable`, `buildRealEstateInspectionShareText` / `buildRealEstateVisitSlipShareText`, and `buildScrapNcrArtifacts` (`cmupAdjustmentHeld: true`).
  - `src/components/modals/PrintSheetModal.tsx`: Unified print sheet preview (`a4` / `80mm` / `label`), `dir={isRtl ? 'rtl' : 'ltr'}`, watermark (`DUPLICATA` / `ANNULÉ` / `REMBOURSÉ`), plain-text clipboard fallback, and CSV callback.
  - `src/components/modals/ShareArtifactModal.tsx`: Real Clipboard + `navigator.share()` + `wa.me` share modal with optional print-to-PDF handoff (zero `window.open()` or fabricated share URLs).
  - `src/lib/supabase/migrations` & `src/services/store.ts` / `*Data.ts`: Persisted `gym_class_enrollments`, `gym_schedule_events`, `rental_security_deposits` (`deposit_receipt_number`, `printed_count`), `re_inspections` (`is_locked`, `validated_at`, `validated_by_staff_id`), and `mfg_ncr_records` (`cmup_adjustment_held = true`) with offline queue priority registration.

| Item | File(s) | Status | Implementation Summary |
|---|---|---|---|
| `3.1`–`3.2` Collect balance / New invoice | `src/components/screens/membership/MemberSlideOverInspector.tsx` | **DEFERRED** | Disabled buttons + localized tooltip `t('feature_not_available_phase2', locale)` |
| `3.3` New sale from Member drawer | `MemberSlideOverInspector.tsx`, `MembershipShopView.tsx`, `src/services/store.ts` | **DONE** | Closes inspector, navigates to POS Shop (`openShopForMember`), pre-binds member into cart checkout |
| `3.4` Enroll member in class | `src/components/screens/membership/MembershipSchedulerView.tsx` | **DONE** | Real enrollment modal (`enrollMemberInClass`) + live session roster + waitlist/duplicate validation |
| `3.5` Confirm coach | `src/components/screens/membership/MembershipSchedulerView.tsx` | **DONE** | `confirmScheduleCoach` store mutation + confirmed status badge |
| `3.6` Duplicate schedule week | `src/components/screens/membership/MembershipSchedulerView.tsx` | **DONE** | Real week-duplication modal with day offset + room/coach conflict feedback |
| `3.7` POS batch print receipts | `src/components/screens/pos/PosOrdersView.tsx` | **DONE** | `PrintSheetModal` (`80mm`) over `resolveBatchSelection(..., 1000)` with Voided/Refunded watermarks |
| `3.8` Education attendance sheets | `src/components/screens/education/EducationTimetableView.tsx` | **DONE** | `PrintSheetModal` (`a4`) generating printable cohort attendance sheets from live rosters |
| `3.9` Venue deposit receipt | `src/components/screens/venue/VenueFinanceView.tsx` | **DONE** | Sequential `issueDepositReceiptPrint()` (`deposit_receipt`) + `printed_count` + `DUPLICATA` watermark |
| `3.10` Validate real estate inspection | `src/components/screens/realestate/RealEstateInspectionsView.tsx` | **DONE** | `validateInspection(insp.id)` sets `isLocked: true` + disables further validation/edits |
| `3.11` Share inspection / GPS slip | `src/components/screens/realestate/RealEstateInspectionsView.tsx` | **DONE** | Wired to `ShareArtifactModal` (Clipboard / Web Share / `wa.me`) and `PrintSheetModal` (`a4`) |
| `3.12` Manufacturing Scrap & NCR | `src/components/screens/manufacturing/ManufacturingQcView.tsx` | **DONE** | Scrap + NCR modal (`recordScrapWithNcr`) sets `Scrapped` + `cmupAdjustmentHeld: true`; zero stock/WIP/CMUP mutation |
| `3.13` Trading bulk CSV export | `TradingSalesView.tsx`, `TradingDirectoryView.tsx` | **DONE** | Wired to `resolveBatchSelection` + `downloadCsvSafe` |
| Unbacked Reminders / Transfers / SMS / Links | `MembershipFinanceView.tsx`, `RealEstateFinanceView.tsx`, `AgricultureWholesaleView.tsx`, `LogisticsCodView.tsx`, `LogisticsScannerView.tsx`, `ContractorDailyLogsView.tsx`, `MedicalBillingView.tsx` | **DEFERRED** | Disabled payment reminders (`Relancer`), RE `Partager Reçu`, Agri tele-declaration link, Logistics SMS/tracking share, Contractor HSE audit, and Medical practitioner payout (`Émettre Règlement`) with `disabled` + `t('feature_not_available_phase2', language)` |
| Legitimate Print / Export / State Mutations | `AutoGarageBillingView.tsx`, `AutoGaragePartsView.tsx`, `ContractorDailyLogsView.tsx`, `LegalMattersView.tsx`, `LegalTrustView.tsx`, `LogisticsCodView.tsx`, `LogisticsScannerView.tsx`, `LogisticsShipmentsView.tsx`, `RealEstateMandatesView.tsx`, `MedicalBillingView.tsx`, `MedicalPrescriptionsView.tsx`, `MedicalQueueView.tsx` | **DONE** | Wired Garage fleet statement & Z-close receipt (`closeCashRegisterZ`), Garage bulk parts restock modal (`updatePart`), Contractor PV `PrintSheetModal` & fuel anomaly diagnostic modal, Legal Grosse & CARPA `PrintSheetModal`, Logistics COD 80mm receipt & AWB thermal label & bulk status modal (`updateShipmentStatus`), Mandate `PrintSheetModal`, Medical CNAS `PrintSheetModal`, Prescription renewal (`addPrescription`), and Waiting Queue 80mm ticket |

- **CI Guard Ratchet (`scripts/ci/phase1-guards-baseline.json`)**: Lowered `showToastOnly` from `66` → **`0`** (`0` forbidden literals, `0` unregistered `localStorage` keys, `0` FR/EN/AR i18n asymmetry; `npm run ci:guards -- --strict` passes cleanly).
- **Step 5 Final Verification Counts (Observed After Final Code Edit)**:
  - **`npx tsc --noEmit` / `lint_applet`**: **0 errors** (PASS).
  - **`npm run build` / `compile_applet`**: **0 errors** (PASS).
  - **`npm test` (`tsx --test`)**: **108 / 108 passed** (4 suites, incl. `src/utils/step5Actions.test.ts` 6/6).
  - **`npm run test:atrium` (`vitest run`)**: **33 / 33 files, 274 / 274 tests passed** (incl. `src/atrium/__tests__/step5Workflows.test.tsx` 4/4).
  - **`npm run ci:guards -- --strict`**: **0 total findings** (`showToastOnly: 0`, `forbiddenLiterals: 0`, `unregisteredStorageKeys: 0`, `i18nAsymmetry: 0`).
  - **Live Browser Verification (`playwright-cli` on `http://localhost:3000`, `1440×900`)**: Verified workspace launch, `Schedule` session creation (`Morning Workout`), `Enroll Member in Session` dropdown (`Amira Cherif`), enrollment confirmation (`1 / 20`, `Roster` check-in update), and **`0` console errors / `0` console warnings**.
  - **`5.11` Orphans**: **Zero** files deleted (awaiting explicit approval).

---

## Step 6 — Section 1 Kiosk & POS Atomic Persistence (`1.1`–`1.6`)

- **Database Schema & Rollback**: `supabase/migrations/202611260001_step6_section1_persistence.sql` + `supabase/rollbacks/202611260001_step6_section1_persistence.down.sql`.
- **Shared Helpers**: `src/utils/step6Persistence.ts` + `src/utils/step6Persistence.test.ts`.
- **Completed Items**:
  1. **`1.1` Gym Check-In Unification & Walk-In Sequence**: Merged `addMemberCheckIn` into `checkInMember` in `src/services/store.ts`; enforced 5-minute duplicate check-in block (`evaluateMemberCheckIn`, `gym_record_check_in` RPC) with owner PIN override reason (`override_by_staff_id`, `override_reason`), remote-reversing undo, and sequential `walk_in_ticket` number allocation.
  2. **`1.2` Education Attendance Source of Truth**: Server dedupe + partial unique index `uq_edu_attendance_session_student_active` on `edu_attendance (business_id, session_id, student_id) WHERE deleted_at IS NULL`, `change_history` audit trail (`appendEduAttendanceChange`), lock/unlock with reason, and elimination of `eduQuickAttendance` split state.
  3. **`1.3` Salon Chair Stations Persistence**: Persisted `salon_chair_stations` with `started_at` ISO timestamp, `elapsedMinutes` calculation (`buildPersistedChairStation`, `computeElapsedMinutesFromIso`), and undo support.
  4. **`1.4` POS Cash Drawer & Option B Z-Reports**: Persisted `pos_cash_sessions`, `pos_cash_movements`, and `pos_z_reports` using exact `bigint` centimes (`computeDrawerExpectedCentimes`, `computeVarianceCentimes`, `requiresVarianceManagerPin` at `-500.00 DZD` / `-50,000` centimes), offline provisional Z-numbers (`PROV-*`), reconnect drift comparison (`evaluateProvisionalZReportDrift` -> `'drift_flagged'`), and `printed_count`.
  5. **`1.5` Atomic POS Partial/Full Refund + Stock Restoration**: Added `pos_refund_with_stock` and symmetric `pos_undo_refund_with_stock` RPCs alongside client clamping helpers (`computeRefundableQuantities`, `clampPartialRefundItems`) preventing over-refunding.
  6. **`1.6` Timer / Store Sync Boundary**: `stopTimer` synced to remote service; live freelance active-timer cross-device sync remains explicitly scoped to **Phase 3 backlog (`7.7`)**.
- **Tests**: `src/utils/step6Persistence.test.ts`, `src/lib/supabase/__tests__/step6AndStep7a.test.ts` (6/6 Vitest), and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts`.

---

## Step 7a & Gate 4 — Read-Only Payroll Migration Dry Run

- **Read-Only Inspector (`src/utils/payrollMigrationDryRun.ts`)**: `analyzePayrollMigrationDryRun()` scans `LEGACY_PAYROLL_STORAGE_KEYS` (`atrium_staff_attendance_logs_v1`, `atrium_staff_salary_advances_v1`, `atrium_staff_payroll_runs_v1`, `atrium_staff_payroll_slips_v1`, `atrium_erp_desktop_v2`) with **zero** DB writes (`isReadOnlyDryRun: true`, `dbWritesExecuted: 0`, `gateStatus: 'AWAITING_GATE_4_APPROVAL'`), producing:
  - Deterministic UUID mapping (`deterministicLegacyUuid` matching `toValidUuid`),
  - Field-drift diffs against current remote store state,
  - Period collision diagnostics (`periodCollisions`),
  - Missing CCP/RIB coordinate warnings (`missingAccountWarnings`).
- **UI Diagnostics (`src/components/common/staff/PayrollMigrationDryRunPanel.tsx`)**: Exposes JSON/CSV export and summary cards gated behind Gate 4 approval (`data-testid="step7a-payroll-dry-run-panel"`).
- **Tests**: `src/utils/payrollMigrationDryRun.test.ts` (`tsx --test`) + `step6AndStep7a.test.ts` (Vitest).

---

## Step 7b — Workforce ERP DB Source of Truth (`staff_attendance_logs`, `staff_salary_advances`, `staff_payroll_runs`, `staff_payroll_slips`)

- **Scope Boundary**: Covers Workforce ERP (`StaffPayrollSubView`, `PayslipPrintModal`, `PayrollMigrationDryRunPanel`, `store.ts`, `staffService.ts`). Excludes `project_milestone` RH/Compta payroll (`pm_payroll_batches`, `pm_ccp_slips`). Default Algerian IRG/CNAS statutory constants in `algerianPayroll.ts` remain untouched pending human accountant sign-off.
- **Database Migration, Rollback & SQL Harness**:
  - `supabase/migrations/202611260002_step7b_payroll_attendance_sot.sql` + `supabase/rollbacks/202611260002_step7b_payroll_attendance_sot.down.sql`:
    - `staff_attendance_logs`: Added `source`, `entered_by`, `entered_by_name` + append-only trigger blocking `UPDATE`/`DELETE` (`SQLSTATE '42501'`).
    - `staff_payroll_runs` & `staff_payroll_slips`: Added `rate_set_id`, `rate_basis` (`'legacy' | 'versioned'`), `rate_snapshot` (`jsonb`), `run_type` (`'regular' | 'adjustment'`), `adjustment_seq`, `approved_by`, period check constraint (`chk_staff_payroll_runs_adjustment_seq`), partial unique index `idx_staff_payroll_runs_period_unique`, and immutability triggers locking `'approved'`/`'paid'` runs, slips, and `'deducted'`/`'waived'` advances (allowing only `'approved' -> 'paid'` and `is_paid: false -> true`).
    - Transactional `approve_payroll_run(...)` RPC (`SECURITY DEFINER`) transitioning `'draft'` runs to `'approved'`/`'paid'` and atomically settling pending salary advances (`'deducted'` / `'waived'`).
  - `scripts/db/test_rls_rpc_triggers.sql` (Section 9) + `.github/workflows/ci-db-hardening.yml`: Added SQL contract assertions for append-only attendance logs, run/slip immutability, adjustment period uniqueness, `approve_payroll_run` RPC, and `statutory_rates` verify-only lock.
- **Service, Offline Replay, Payroll Engine & Store Wiring**:
  - `src/lib/supabase/offlineQueue.ts`: Assigned `approve_payroll_run` RPC replay priority **`480`** (strictly ordered after `staff_salary_advances` `401` and `staff_payroll_slips` `461`).
  - `src/lib/supabase/services/staffService.ts` & `src/lib/supabase/mappers.ts`: Added `approvePayrollRun`, `waiveSalaryAdvance`, `markPayrollSlipPaid`, `insertOnlyBackfillPayroll`, and full mapping of statutory snapshots & run adjustment fields.
  - `src/utils/algerianPayroll.ts`: Added `buildStatutoryRateSnapshot`, `StatutoryRateSet` optional override path, SNMG missing/below checks, and `advanceCarryover` calculation when pending advances exceed net pay.
  - `src/utils/payrollMigrationDryRun.ts` & `src/config/localStorageRegistry.ts`: Added `resolveNextAdjustmentSeq`, `collectLegacyPayrollBackfillPayload`, and idempotent `executePayrollMigrationBackfill` gated by `atrium_payroll_migration_v1_done`, preserving `LEGACY_PAYROLL_STORAGE_KEYS` for 1 release as read-only backup.
  - `src/services/store.ts`: Wired `effectiveStatutoryRate`, append-only attendance logging, duplicate regular run lock (`generateStaffPayrollRun`), sequential adjustment runs (`isAdjustment`), `approveStaffPayrollRun` (`{ markPaid }`), `waiveStaffSalaryAdvance`, `markStaffPayrollSlipPaid`, and `executePayrollMigrationBackfill`.
- **Workforce UI**:
  - `src/components/common/staff/useStaffFoundation.ts` & `src/components/screens/membership/MembershipStaffView.tsx`: Propagated `effectiveStatutoryRate`, `fiscalProfile`, `businessName`, `onApprovePayroll`, `onWaiveAdvance`, and backfill handlers.
  - `src/components/common/staff/StaffPayrollSubView.tsx`: Multi-run period selector, `'draft'` -> `'Approve (Lock)'` & `'Close & Pay'`, `'approved'` -> `'Approved (Locked)'` pill & `'Mark All Paid'`, `'Adjustment Run'` replacement for locked runs, `"Rates not verified"` / `"Legacy basis"` / SNMG badges, `'Waive'` advance action, and `advanceCarryover` slip detail row.
  - `src/components/common/staff/PayslipPrintModal.tsx`: Eliminated all hardcoded demo NIF (`002416098124589`), RC (`16/00-88124`), and NSS (`89 04 16 0000 00`) fallbacks (`'—'` when unset), added `dir={isAr ? 'rtl' : 'ltr'}`, verification/basis badges, and `advanceCarryover` row.
  - `src/components/common/staff/PayrollMigrationDryRunPanel.tsx`: Added Step 7b insert-only backfill trigger (`data-testid="step7b-execute-backfill-btn"`) and completion banner alongside Step 7a read-only diagnostics.
- **Tests**: `src/utils/algerianPayroll.test.ts`, `src/utils/step7bPayroll.test.ts` (4/4 `tsx --test`), `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts` (Step 6 + Step 7b SQL & `.down.sql` parity), and `src/atrium/__tests__/step7bPayrollWorkflow.test.tsx` (4/4 Vitest).

---

## Step 8 — Phase 1 Exit Report (Gate 5)

### 1. CI Guards Strict Mode Promotion
- Switched `scripts/ci/phase1-guards.mjs` to strict blocking by default (`const STRICT = !process.argv.includes('--ratchet');`) so `npm run ci:guards` exits non-zero whenever any violation exists (`--ratchet` kept optional only).
- **Strict Scan Output (`npm run ci:guards`)**: **`[STRICT PASS]` — `0` total findings**:
  - Guard 1 (`showToast`-only handlers): **`0`**
  - Guard 2 (Forbidden demo/tenant fallback literals): **`0`**
  - Guard 3 (Unregistered `localStorage` keys): **`0`**
  - Guard 4 (`FR / EN / AR` i18n key asymmetry): **`0`**

### 2. Section 13 Phase 1 Production Readiness Checklist

| # | Gate / Requirement | Status | Verification Proof |
|---|---|---|---|
| 1 | Tenant isolation, fail-closed roles & zero `acc_01` fallbacks | **PASS** | `routePermissions.test.ts`, `tenantContext.test.ts`, `ci:guards` Guard 2 (`0`) |
| 2 | Server-side access-denied audit RPC + anti-forgery + rate limits | **PASS** | `auditService.test.ts`, `202611240003_phase1_security_audit_rpc.sql`, Section 6 SQL |
| 3 | Atomic money (centimes), sequential numbering & POS Z/refund RPCs | **PASS** | `money.test.ts`, `referenceAndSequence.test.ts`, `step6Persistence.test.ts`, `step6AndStep7a.test.ts` |
| 4 | Toast-only stubs remediated or honestly deferred (`disabled`) | **PASS** | `step5Actions.test.ts`, `step5Workflows.test.tsx`, `ci:guards` Guard 1 (`0`) |
| 5 | Workforce ERP DB source of truth, append-only attendance, immutable payroll | **PASS** | `202611260002_step7b_payroll_attendance_sot.sql`, `step7bPayroll.test.ts`, `step7bPayrollWorkflow.test.tsx` |
| 6 | Registered `localStorage` usage & FR/EN/AR i18n parity | **PASS** | `ci:guards` Guard 3 (`0`) & Guard 4 (`0`), `localStorageRegistry.ts` |
| 7 | Pairwise forward `.sql` & `.down.sql` migrations validated | **PASS** | `migrationsAndRollbacks.test.ts` (8/8), `.github/workflows/ci-db-hardening.yml` |
| 8 | TypeScript, production bundle, test suites & dev server health | **PASS** | Observed counts listed below |

### 3. Final Observed Verification Metrics (Post-Final Code Edit)
- **`npx tsc --noEmit` (`npm run lint`)**: **0 errors**.
- **`npm run build` / `compile_applet` + `lint_applet`**: **0 errors**.
- **`npm test` (`tsx --test`)**: **121 / 121 passed** across all suites (incl. `algerianPayroll.test.ts`, `step5Actions.test.ts`, `step6Persistence.test.ts`, `payrollMigrationDryRun.test.ts`, `step7bPayroll.test.ts`).
- **`npm run test:atrium` (`vitest run`)**: **35 / 35 files, 286 / 286 tests passed**.
- **`npm run ci:guards` (strict default)**: **`[STRICT PASS]`** — **`0`** total violations.
- **SQL Harness (`scripts/db/test_rls_rpc_triggers.sql`, Sections 1–9)**: Statically verified by Vitest (`migrationsAndRollbacks.test.ts`); **not executed locally** in this sandbox because `psql`/`docker` are unavailable, and runs automatically against PostgreSQL 16 in `.github/workflows/ci-db-hardening.yml`.
- **Dev Server (`http://localhost:3000`)**: HTTP **`200`** verified cleanly.

### 4. Pending Human Sign-Offs & Phase 2–5 Deferrals (Explicitly Preserved)
- **Human Sign-Off Required Before Statutory Lock / Cleanup**:
  1. Chartered Algerian accountant review & verification of default IRG/CNAS transitional formula (`algerianPayroll.ts`) and Art. 317 fiscal stamp brackets before inserting `'verified'` rows into `statutory_rates`.
  2. Catalog check of **58 vs. 69 Algerian wilayas** across address/jurisdiction dropdowns.
  3. Owner confirmation of `5.11` orphan deletion list (`ToastContainer.tsx` and remaining candidate files listed above — **0** deleted in Phase 1).
  4. Owner confirmation of CMUP / WIP valuation adjustment rule for `3.12` Manufacturing Scrap & NCR (`cmup_adjustment_held = true`).
  5. Extended production `acc_01` SQL row-count query executed in live DB before removing legacy backfill compatibility.
- **Deferred to Phases 2–5**:
  - Phase 2: Remainder (`6.3`–`6.10`: Shared SCF Accounting, Unified CRM `party`, Reminder Engine, Shared WMS, CSV/Excel Import, Configurable RBAC + Full RLS, Approvals/Attachments/API, BI KPI Registry).
  - Phase 3: Cross-device live active-timer sync for Freelance (`7.7`), SMS/WhatsApp server dispatch integrations deferred behind `"Not available yet"`.
  - Phases 4–5: Performance budgets & full Playwright end-to-end verification suite.

---

## Phase 2 Step 1 — Unified Document & Invoicing Engine + Payments Ledger (`6.1` & `6.2`)

- **Database Schema, RPCs & Rollback**: `supabase/migrations/202611270001_phase2_invoicing_payments.sql` + `supabase/rollbacks/202611270001_phase2_invoicing_payments.down.sql`.
  - Extended `sequence_counters` & `allocate_sequence_number` (`quote`/`DEV`, `order`/`BC`, `delivery_note`/`BL`, `invoice`/`FAC`, `credit_note`/`AV`, `receipt`/`REC`, `proforma`/`PRO`, `payment`/`REG`) using deferred final gap-free numbering (`draft_number` offline -> server sequential number on issue; `device_sequence_blocks` remains disallowed).
  - Created `unified_documents`, `unified_payments`, and `unified_payment_allocations` with tenant/branch RLS, `fn_protect_immutable_unified_documents` trigger locking issued/paid/voided financial cores, `issue_unified_document`, `record_unified_payment_with_allocations` (idempotent + multi-invoice allocation + unallocated credit tracking), and `transition_cheque_traite_status` (automatic invoice balance reopening on bounce).
  - Extended `scripts/db/test_rls_rpc_triggers.sql` (Section 10) and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts`.
- **Application Services, Pure Engine & UI**:
  - `src/utils/invoicingEngine.ts` + `src/utils/invoicingEngine.test.ts`: Integer-centimes multi-rate TVA (`0/9/19`), discounts, Timbre Fiscal (`commercial_cash`, `art_317`, `exempt`), retenue de garantie, FX equivalent, FR/AR totals in words, fiscal header snapshot without hardcoded demo constants, credit-note draft builder, and closed-period date guard.
  - `src/lib/supabase/services/invoicingService.ts`, `src/lib/supabase/offlineQueue.ts`, and `src/services/store.ts`: Wired `createUnifiedDocument`, `updateUnifiedDraft`, `deleteUnifiedDraft`, `issueUnifiedDraft`, `createCreditNoteForDocument`, `recordUnifiedPayment`, and `transitionChequeStatus`, integrated into `TradingSalesView`, `TradingFinanceView`, `PosOrdersView`, `MembershipFinanceView`, and `MemberSlideOverInspector`.
  - `src/components/common/invoicing/` (`UnifiedInvoiceComposerModal`, `UnifiedInvoicePrintModal`, `UnifiedPaymentModal`, `UnifiedPaymentsLedgerPanel`): Fixed `LiveSwitch` `onCheckedChange` wiring, `LabelSelect` button `relative z-[1]` stacking above `.lbi-bg` so selected option values and chevrons render visibly, currency-aware print formatting (`DZD` / `EUR` / `USD` + DZD FX counter-value), document notes & `Cachet & Signature` block, and editable `invoiceFooter` template setting in `SettingsBusinessFiscalTab.tsx`.
- **Verified Checks (Post-Final Edit)**:
  - `npx tsc --noEmit` (`npm run lint`) & `npm run build` (`compile_applet`): **0 errors**.
  - `npm test` (`tsx --test`): **126 / 126 passed** (6 suites).
  - `npm run test:atrium` (`vitest run`): **36 / 36 files, 291 / 291 tests passed**.
  - `npm run ci:guards` (strict): **0 findings**.
  - Live headless Chromium (`playwright-cli` at `1440x900`): Verified `Members -> Amira Cherif -> Sales -> New` (`LabelSelect` dropdowns & values rendered cleanly), `Issue & Number` (`FAC-2026-00001`), A4 print view with notes and `Stamp & Signature`, `Finance -> Collect Payment` (cheque `#CHQ-2026-88`), and `Deposit -> Bounce` reopening invoice balance with `0` console/page errors.
- **Remaining Phase 2 Scope (`6.3`–`6.10`)**: Shared SCF accounting layer (`6.3`), Unified CRM `party` (`6.4`), Reminder engine (`6.5`), Shared WMS (`6.6`), CSV/Excel import (`6.7`), Configurable RBAC & full RLS (`6.8`), Platform approvals/attachments/REST API (`6.9`), and BI KPI registry (`6.10`) remain queued next.

---

## Phase 2 Step 2 — Shared Accounting Layer (`6.3` SCF Loi 07-11)

- **Database Schema, RPCs & Rollback**: `supabase/migrations/202611270002_phase2_shared_accounting_scf.sql` + `supabase/rollbacks/202611270002_phase2_shared_accounting_scf.down.sql`.
  - Extended `sequence_counters` (`journal_entry` / `EC`), created `scf_chart_of_accounts`, `scf_accounting_periods`, `journal_entries`, `journal_lines`, and `scf_posting_failures` with tenant/branch RLS, double-entry immutability triggers (`fn_protect_immutable_scf_entries`), and transactional RPCs (`post_scf_journal_entry`, `reverse_scf_journal_entry`, `set_scf_period_status`, `reconcile_scf_journal_lines`, `seed_scf_chart_of_accounts`).
  - Extended `scripts/db/test_rls_rpc_triggers.sql` (Section 11) and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts`.
- **Application Services, Pure Engine & UI**:
  - `src/utils/scfAccountingEngine.ts` + `src/utils/scfAccountingEngine.test.ts`: Double-entry validator (`validateScfJournalLines` reusing `validateAndBalanceSCFEntry`), FX/rounding absorption (`656000`/`756000`), posting builders for unified invoices/payments/cheque transitions, payroll runs (`buildPostingForPayrollRun` accounting for `primesNonImposables` allowances & `slips` advances/deductions), purchase receipts, stock vouchers, and POS sales; Trial Balance, General Ledger, Bank/Cash Reconciliation, TVA/G50 preparation aid with mandatory non-filing disclaimer, and CSV export.
  - `src/lib/supabase/services/scfAccountingService.ts`, `src/lib/supabase/offlineQueue.ts`, and `src/services/store.ts`: Auto-posting hooks with closed-period / imbalance failure queuing (`scfPostingFailures`) + retry & reversal (`contre-passation`) actions, integrated into `TradingFinanceView`, `MembershipFinanceView`, and `LegalTrustView`.
  - `src/components/common/accounting/` (`ScfAccountingWorkspace`, `ScfManualEntryModal`, `ScfPrintReportModal`): Journal, Unposted Queue, Trial Balance, General Ledger, Bank/Cash Reconciliation, TVA / G50 Aid, and Periods & Chart views with A4 print + CSV export.
- **Verified Checks (Post-Final Edit)**:
  - `npx tsc --noEmit` (`npm run lint`) & `npm run build` (`compile_applet`): **0 errors**.
  - `npm test` (`tsx --test`): **130 / 130 passed** (6 suites, incl. `scfAccountingEngine.test.ts`).
  - `npm run test:atrium` (`vitest run`): **37 / 37 files, 297 / 297 tests passed** (incl. `phase2ScfAccounting.test.tsx` 5/5).
  - `npm run ci:guards` (strict): **0 findings**.
  - Live headless Chromium (`playwright-cli` at `1440x900`): Verified `Finance -> SCF Accounting (Loi 07-11)` workspace and `TVA / G50 Aid` tab with visible G50 preparation disclaimer and `0` console errors / `0` warnings.
- **Remaining Phase 2 Scope (`6.4`–`6.10`)**: Unified CRM `party` (`6.4`), Reminder engine (`6.5`), Shared WMS (`6.6`), CSV/Excel import (`6.7`), Configurable RBAC & full RLS (`6.8`), Platform approvals/attachments/REST API (`6.9`), and BI KPI registry (`6.10`) remain queued next.

---

## Phase 2 Step 3 — Unified CRM & Communication (`6.4`)

- **Database Schema, RPCs & Rollback**: `supabase/migrations/202611270003_phase2_unified_crm_party.sql` + `supabase/rollbacks/202611270003_phase2_unified_crm_party.down.sql`.
  - Created `crm_parties` (single `party` master for persons & companies with normalized E.164 phone/operator, NIF/RC/NIS/AI, `shared_phone_group`, granular channel consent flags, `opt_out_all`, and merge audit columns), `crm_party_links` (unique active vertical entity links across `member`, `lead`, `b2b_client`, `b2b_supplier`, `patient`, `renter`, `student`, `freelance_client`, `appointment_client`, `owner`, `merchant`), `crm_party_notes`, `crm_follow_up_tasks`, `crm_message_templates` (FR/AR/EN + variables), and `crm_communication_logs`.
  - Added atomic `merge_crm_parties` RPC (re-pointing links, notes, tasks, and communication logs while preserving strictest opt-out/consent state and writing immutable audit logs) and `record_crm_communication_attempt` RPC (server-enforced `blocked_opt_out` guard).
  - Extended `scripts/db/test_rls_rpc_triggers.sql` (Section 12) and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts` (11/11).
- **Application Services, Pure Engine & UI**:
  - `src/utils/crmPartyEngine.ts` + `src/utils/crmPartyEngine.test.ts`: Algerian `+213` phone normalization reusing `validateAlgerianPhone`, duplicate detection (NIF, email, phone with shared-family-phone policy), merge planner, FR/AR/EN variable rendering with missing-variable guard, channel opt-out / provider failure evaluation, and cross-vertical `buildParty360Summary`.
  - `src/lib/supabase/services/crmService.ts`, `src/lib/supabase/offlineQueue.ts` (dependency-ordered replay priorities + merge/comms RPC replay), and `src/services/store.ts` (CRM slices, selectors, and 10 actions exported via `atriumActions` & `useAtriumStore`).
  - `src/components/common/crm/` (`Customer360Panel`, `CrmPartyMergeModal`): Integrated into `MemberSlideOverInspector`, `TradingDirectoryView`, and `FreelanceClientsView`, plus `phase2_crm_*` keys in `en/fr/ar.json`.
- **Verified Checks (Post-Final Edit)**:
  - `npx tsc --noEmit` (`npm run lint`) & `npm run build` (`compile_applet`): **0 errors**.
  - `npm test` (`tsx --test`): **135 / 135 passed** (6 suites, incl. `crmPartyEngine.test.ts`).
  - `npm run test:atrium` (`vitest run --maxWorkers=2`): **38 / 38 files, 302 / 302 tests passed** (incl. `phase2UnifiedCrm.test.tsx` 4/4).
  - `npm run ci:guards` (strict): **0 findings**.
  - Live headless Chromium (`playwright-cli` at `1440x900`): Verified `Members -> Amira Cherif -> CRM`, `+213550112233 · Ooredoo` operator badge, 2×2 consent/opt-out switches, `Messages` tab opt-out block banner (`blocked_opt_out` in Delivery Log), and `0` console errors / `0` warnings.
- **Remaining Phase 2 Scope (`6.5`–`6.10`)**: Reminder engine (`6.5`), Shared WMS (`6.6`), CSV/Excel import (`6.7`), Configurable RBAC & full RLS (`6.8`), Platform approvals/attachments/REST API (`6.9`), and BI KPI registry (`6.10`) remain queued next.

---

## Phase 2 Step 4 — Reminder & Notification Engine (`6.5`)

- **Database Schema, RPCs & Rollback**: `supabase/migrations/202611270004_phase2_reminder_engine.sql` + `supabase/rollbacks/202611270004_phase2_reminder_engine.down.sql`.
  - Created `reminder_quiet_hours_configs` (default `Africa/Algiers`, configurable `start_time`/`end_time` quiet window and `allow_in_app_during_quiet`), `reminder_rules` (13 event rules covering `membership_expiring`, `invoice_overdue`, `installment_due`, `rent_due`, `appointment_tomorrow`, `low_stock`, `expiry_date`, `service_due`, `dar_lockout`, `cheque_due`, `cpca_deadline`, `contract_expiry`, `vehicle_documents_expiry`), and `reminder_delivery_logs` with `uq_reminder_delivery_idempotency` partial unique index and `dispatch_reminder_idempotent` RPC preventing duplicate reminders per window.
  - Extended `scripts/db/test_rls_rpc_triggers.sql` (Section 13) and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts`.
- **Application Services, Pure Engine & UI**:
  - `src/utils/reminderEngine.ts` + `src/utils/reminderEngine.test.ts`: `REMINDER_EVENT_CATALOG` (13 triggers EN/FR/AR), `isWithinQuietHours` (Africa/Algiers wrap-around midnight logic), idempotency key derivation per target/rule/window, CRM opt-out & template variable rendering via `crmPartyEngine`, and deferred quiet-hours queue flushing.
  - `src/lib/supabase/services/reminderService.ts`, `src/lib/supabase/offlineQueue.ts`, `src/services/store.ts`, and `src/components/common/reminders/ReminderEngineWorkspace.tsx` (mounted in `SettingsScreen` under `Reminders & Alerts`).
- **Verified Checks**:
  - `npx tsc --noEmit` & `npm run build`: **0 errors**; `npm run ci:guards` (strict): **0 findings**.
  - `src/atrium/__tests__/phase2ReminderEngine.test.tsx`: All 3/3 integration specs passing (idempotent scan deduplication, quiet hours deferral/flush, and workspace UI SSR).
  - Live headless Chromium (`playwright-cli` at `1440x900`): Verified `Settings -> Reminders & Alerts` quiet hours toggle (`21:00–08:00`) and all 13 event rules rendered with `0` console errors.

---

## Phase 2 Step 5 — Shared Inventory / WMS Services (`6.6`)

- **Database Schema, RPCs & Rollback**: `supabase/migrations/202611270005_phase2_shared_wms.sql` + `supabase/rollbacks/202611270005_phase2_shared_wms.down.sql`.
  - Created 10 tenant/branch-isolated WMS tables (`wms_bins`, `wms_stock_lots`, `wms_serial_numbers`, `wms_unit_conversions`, `wms_reorder_rules`, `wms_cycle_counts`, `wms_cycle_count_lines`, `wms_stock_transfers`, `wms_landed_cost_allocations`, `wms_consignment_ledger`) and transactional RPCs (`wms_atomic_consume_stock`, `wms_post_cycle_count`, `wms_transition_stock_transfer`).
  - Extended `scripts/db/test_rls_rpc_triggers.sql` (Section 14) and `src/lib/supabase/__tests__/migrationsAndRollbacks.test.ts` (13/13).
- **Application Services, Pure Engine & UI**:
  - `src/utils/wmsEngine.ts` + `src/utils/wmsEngine.test.ts`: FEFO expiry sorting & sellability filtering (blocking expired & recalled/quarantined lots), negative stock policy (`block`/`warn`/`allow`), unit conversions (`piece`/`carton`/`pallet`), cycle count variance with active-sales delta deduction, integer-centimes landed cost allocation (`freight + customs + insurance * fxRate`), reorder suggestion builder, returnable consignment balance summary, and deterministic Code-128 style barcode bar builder.
  - `src/lib/supabase/services/wmsService.ts`, `src/lib/supabase/offlineQueue.ts` (dependency-ordered replay priorities), and `src/services/store.ts` (`processSale` POS FEFO & open-cycle-count active sales hook, `createPurchaseOrdersFromReorderSuggestions`, and `createWarehouseDepot` fixed to `generateClientUuid()`).
  - `src/components/common/wms/WmsWorkspace.tsx` & `src/components/common/wms/WmsBarcodePrintModal.tsx`: Integrated into `TradingInventoryView` (`WMS / FEFO` tab) and `PosInventoryView` (`WMS / FEFO` tab), with responsive mobile breakpoints (`sm:grid-cols-*`), A4/80mm printable barcode sheets, and EN/FR/AR `phase2_wms_*` i18n keys.
- **Verified Checks (Post-Final Edit)**:
  - `npx tsc --noEmit` (`npm run lint`) & `npm run build` (`compile_applet`): **0 errors**.
  - `npm test` (`tsx --test`): **148 / 148 passed** (6 suites, incl. `wmsEngine.test.ts`).
  - `npm run test:atrium` (`vitest run --maxWorkers=2`): **40 / 40 files, 312 / 312 tests passed** (incl. `phase2Wms.test.tsx` 5/5 and `migrationsAndRollbacks.test.ts` 13/13).
  - `npm run ci:guards` (strict): **0 findings**.
  - Live headless Chromium (`playwright-cli`): Verified `Wholesale Food & Groceries -> Stock -> WMS / FEFO`, lot registration (`LOT-2026-A1`), `WmsBarcodePrintModal` A4/80mm SVG barcode render, `Reorder, Units & Landed Cost` tab, mobile (`390x844`) responsive audit & fix, and `0` console errors.
- **Remaining Phase 2 Scope (`6.7`–`6.10`)**: CSV/Excel import (`6.7`), Configurable RBAC & full RLS (`6.8`), Platform approvals/attachments/REST API (`6.9`), and BI KPI registry (`6.10`) remain queued next.

