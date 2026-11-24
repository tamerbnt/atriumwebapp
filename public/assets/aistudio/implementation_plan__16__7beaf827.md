# Atrium ERP & CRM — Production-Readiness Remediation Plan

This plan defines the 5-phase remediation architecture for Atrium ERP & CRM (16 verticals, 160 trades), scoped for immediate execution of **Phase 1 (Trust)** only. Execution is protected by a read-only verification pass, **five human-in-the-loop review gates**, additive reversible migrations, and per-item commits with automated tests.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Execution stops at **five explicit review gates** across Phase 1 before reaching Phase 2 (and **every step begins by re-reading `implementation_plan.md` and `REMEDIATION_LOG.md`** before touching any code):
> 1. **Gate 1 (After Step 0)**: Verification table (`CONFIRMED` / `ALREADY FIXED` / `NOT FOUND`), test-runner inventory, staging/code `acc_01` scan + **read-only production SQL queries** for `acc_01` and `edu_attendance` duplicates (used to approve soft-delete dedupe right here at Gate 1), and the **3.12 CMUP stock/WIP valuation rule question** (resolved before Step 5).
> 2. **Gate 2 (After Step 2 — Infrastructure)**: Review of `platform_admins`, `statutory_rates` (code-only unverified seed + `effective_from`-only versioning) & `wilayas_ref` schema/seed, editable tenant tariff zones, `allocate_sequence_number` + offline Z-report policy, **centimes rounding mode (`round half up`)** approval, and storage buckets.
> 3. **Gate 3 (After Step 4 — Routing & Permissions)**: Golden matrix baseline vs. `5.5`/`5.9` zero-diff proof, explicit diffs for `5.1`–`5.4`/`5.6`–`5.8`/`5.10`, and `5.11` orphan candidate list before any file deletion.
> 4. **Gate 4 (Between Step 7a Dry-Run and Step 7b Write — Payroll & Attendance Only)**: Owner runs Step 7a dry-run migration on real devices via the built-in read-only **Migration Dry-Run Inspector** UI in the preview/client build and reviews the exported report (**same-ID / different-content conflicts** + **period collisions** on `(business_id, branch_id, period_year, period_month, run_type, adjustment_seq)`) before Step 7b write is enabled.
> 5. **Gate 5 (After Step 8 — Phase 1 Exit)**: Final Phase 1 Exit Report + enforced CI guards before Phase 2 begins.

- **Confirmed Decision 1 — Global Reference Data & Platform Admin in Step 2**: Create `platform_admins`, `statutory_rates`, and `wilayas_ref` in **Step 2** with global RLS (**authenticated read, platform-admin write**). Keep per-tenant logistics tariff zones in `logistics_wilaya_tariffs` (tenant+branch RLS), editable in Step 2/Section 4. Bootstrap the first platform admin via a **one-time manual SQL command or environment variable**—never commit an ID in migrations.
- **Confirmed Decision 2 — Simplified `effective_from` Rate Versioning, Snapshots & Legacy Runs**: Seed `statutory_rates` **only** with values actually present in existing code (`verification_status = 'unverified'`). **Drop `effective_to` and any exclusion constraint**: validity for any payroll date is derived solely as the latest version whose `effective_from <= target_date` (ordered by `effective_from DESC, created_at DESC`). Missing parameters stay `NULL` and block only that component until entered and verified. On rows referenced by a payroll run, a DB trigger blocks **every** column edit **except `verification_status` / `verified_by` / `verified_at`**; all rate or date changes insert a new version. New payroll runs store **both `rate_set_id` and an immutable `rate_snapshot`** of all rate values; imported historical runs allow **nullable `rate_set_id`** tagged **`"legacy basis"`** with original computed amounts untouched.
- **Confirmed Decision 3 — Server Sequence RPC vs. Offline Numbering Policy**: `allocate_sequence_number` validates caller membership in `business_id` and `branch_id` inside the `SECURITY DEFINER` function. **Device-reserved blocks** (`reserve_sequence_block`, which may leave gaps) are strictly **for walk-in tickets (`1.1`) and deposit receipts (`3.9`) only**; **POS Z-reports (`1.4`)** follow the policy approved at Gate 2; **Phase 2 fiscal invoices** will NOT use device blocks and will instead use **deferred final numbering** (draft IDs offline → gap-free server number on issue/sync).
- **Confirmed Decision 4 — Safe Backfills, Money Rules & Two-Stage Step 7**:
  - New Phase 1 monetary columns use **integer centimes (`bigint`)** via one shared pure helper (proposed rounding mode: **round half up**, confirmed at Gate 2); **existing money columns are NOT converted in Phase 1**.
  - `edu_attendance` dedupe (`1.2`) uses the **read-only SQL query** reviewed at **Gate 1** to approve marking production duplicates via **soft-delete (`deleted_at`)** before enforcing the **partial unique index (`WHERE deleted_at IS NULL`)** in Step 6.
  - Step 7 is split into **7a (dry-run only, zero writes, tested on fixtures, exposed via an in-app read-only Dry-Run Inspector button/report export so you can run it directly on your real devices before Step 7b migrations are applied)** and **7b (write enabled after Gate 4 approval)**. Backfill is **insert-only (`ON CONFLICT DO NOTHING`)** while explicitly detecting and listing both **same-ID / different-content conflicts** and **local period collisions** (e.g., duplicate or regenerated `regular` drafts for the same `(business_id, branch_id, period_year, period_month)`) so a unique constraint never aborts backfill silently. DB triggers enforce append-only attendance punch logs and transactional `approve_payroll_run` transitions (`project_milestone` RH/Compta excluded).
- **Confirmed Decision 5 — Stubs, Sharing & Per-Item Governance**: Defer `3.1`/`3.2` (`"Not available yet"`); deliver `3.11` via **print/PDF + share sheet** with Arabic RTL verification (no public links). One commit per item (`fix(<vertical|all>): <ID> <summary>`), immediate `REMEDIATION_LOG.md` entry, FR/AR/EN i18n for touched strings, unit/integration + network-kill tests, and **report-only CI guards starting in Step 1** (enforced in Step 8).

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates client-only persistence gaps, hardcoded business fixtures, toast-only dead buttons, and permission/routing inconsistencies across Atrium ERP & CRM while establishing versioned global reference tables, atomic sequential numbering, transactional payroll immutability, and a hardened offline mutation queue.
- **Target Audience / Persona**: Multi-tenant Algerian SMB owners, cashiers, front-desk operators, supervisors, clinicians, legal staff, logistics dispatchers, and platform administrators working in French, Arabic (RTL), and English across desktop and intermittently connected terminals.
- **Key Value**: Guarantees auditable financial, payroll, attendance, and inventory integrity with strict separation between unverified defaults, legacy imported runs, tenant operational data, and platform-admin reference controls.

---

## 2. User Experience & Visual Design

Atrium's existing kinetic design system, typography (Inter, Barlow Condensed, Cairo), and themes remain untouched—Phase 1 adds transparent status, verification, access, and print behaviors:

- **Transparent Status & Verification Banners**:
  - Disabled `3.1`/`3.2` controls display `"Not available yet"` with a clear tooltip.
  - `MembershipFinanceView` synthesized rows (`5.1`) display `"Estimated, ledger pending"`.
  - Payroll runs and payslips display a persistent `"Rates not verified"` warning whenever `verification_status = 'unverified'`, a `"Legacy basis"` badge on imported pre-migration runs, and clear blocking prompts for any unseeded/missing statutory parameter.
  - Plans with `NULL` `total_sessions`/`duration_days` (`4.10`) prompt the owner to enter explicit values; BAT uploads (`4.6`) tag unreadable `colorSpace`/`DPI`/`bleed` fields as `"manual / unverified"`.
- **Platform Admin & Dry-Run Migration UX**:
  - Platform Admin Reference screen allows viewing, creating new effective-dated versions of, and verifying `statutory_rates` and `wilayas_ref`, plus gating tenant cloud-sync tooling (`4.8`).
  - Step 7a ships as a read-only **Migration Dry-Run Inspector** inside the normal preview/client build (zero database writes, safe to open on every real device before Step 7b migrations run), letting you inspect and export record counts, deterministic IDs, **same-ID / different-content conflicts**, and **local period collisions** prior to enabling 7b writes; `localStorage` data is preserved for one release.
- **Access, Sync & Print UX**:
  - Unauthorized routes render an explicit **Access Restricted** screen with an audit log entry.
  - Offline queue surfaces pending-sync count, poison-message quarantine alert, and export before reset; `ErrorBoundary` recovery preserves the queue.
  - Print templates (`3.7`, `3.8`, `3.9` with `"Duplicata"` on reprints, `3.11`) support A4/80 mm, RTL Arabic shaping, missing fiscal fields, popup-block fallback, and 0 or 1,000+ selections.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Split Step 7 into Real-Device Dry-Run (7a) and Write (7b) with Full Conflict & Collision Reporting**:
  - *Chosen Approach*: Ship 7a dry-run code as an in-app read-only inspector/exporter in the client build for real-device execution, surface both **same-ID / different-content conflicts** and **period unique-key collisions** (duplicate/regenerated drafts for the same period and `run_type`), and unlock 7b writes only after Gate 4 approval.
  - *Why*: Local payroll/attendance data lives on real devices that the agent cannot inspect directly; `ON CONFLICT (id) DO NOTHING` neither catches divergent device edits nor prevents a period unique-index violation from aborting backfill.
- **Decision 2 — Nullable Legacy Runs + Embedded Rate Snapshots**:
  - *Chosen Approach*: Allow `rate_set_id IS NULL` (`"legacy basis"`) for imported historical runs while storing both `rate_set_id` and `rate_snapshot` (JSONB) on all new runs.
  - *Why*: Preserves historical financial records untouched (Section 14) while guaranteeing exact payslip reprints regardless of future catalog changes.
- **Decision 3 — Document-Type Split for Offline Numbering**:
  - *Chosen Approach*: Use reserved device blocks for walk-in tickets (`1.1`) and deposit receipts (`3.9`), confirm Z-report policy (`1.4`) at Gate 2, and explicitly reserve **deferred final numbering** for Phase 2 fiscal invoices.
  - *Why*: Prevents accidental reuse of gap-prone device blocks for legal invoicing in Phase 2.
- **Decision 4 — Early Resolution of 3.12 CMUP Impact**:
  - *Chosen Approach*: Raise the 3.12 CMUP scrap/WIP valuation question at **Gate 1** (or hold stock/WIP adjustment behind confirmation while shipping NCR + inspection status in Step 5).
  - *Why*: Avoids building an unconfirmed cost-valuation mutation in Step 5 before Gate 4.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION & GUARDED ROUTING                        │
│  Sidebar ──► Unified Permission Matrix (can + normalizeRole) ──► Route View  │
│                    │                                               │         │
│                    ├─► Denied? ──► Access Restricted + Audit Log   │         │
│                    └─► Platform Admin? ──► Rate/Wilaya Version UI  │         │
└────────────────────────────────────┬───────────────────────────────┴─────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               STATE, ROUND-HALF-UP CENTIMES & OFFLINE QUEUE (6.11)           │
│  Store / Hooks ──► Shared Centimes Helper ──► Undo (remote reverse)          │
│        │                                                                     │
│        ▼                                                                     │
│  Offline Queue: max-cap alert, dependency order, exponential backoff,        │
│  poison-message quarantine, queue export, non-destructive ErrorBoundary,     │
│  device reserved blocks (WI tickets & deposit receipts ONLY)                 │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │  HTTPS / RLS + Graceful Fallback
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE SCHEMA, RPCS & STORAGE                        │
│  Global Ref (Auth Read / Admin Write):                                       │
│    platform_admins | statutory_rates (effective_from-only + verify-only lock)│
│    wilayas_ref (valid_from/to, legacy, unverified)                           │
│  Shared RPCs (Explicit Caller Membership Check + Row Locking):               │
│    allocate_sequence_number | reserve_sequence_block | pos_refund_with_stock │
│    mfg_scrap_with_ncr | approve_payroll_run (run + advances atomic tx)       │
│  Tenant-Scoped (Tenant+Branch RLS):                                          │
│    logistics_wilaya_tariffs | pos_cash_sessions/movements/z_reports (bigint) │
│    gym_plans | gym_check_ins | gym_class_enrollments | edu_attendance        │
│    salon_chair_stations | re_inspections | mfg_ncr_records |                 │
│    staff_attendance_logs (append-only) | staff_payroll_runs (run_type+seq)   │
│  Storage Buckets (Tenant/Branch RLS + MIME/Size Validation):                 │
│    expense-receipts | bat-deliverables                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1 Migration Manifest (Shipped Alongside Each Item)

All migrations are additive, timestamped SQL files with `.down.sql` rollbacks, never executed against production by the agent (deploy order: **Staging SQL → Owner Production Backup → Production SQL → Client Release**, with graceful client degradation):

| Step / Item | Schema / RPC / Storage Change | RLS, Caller Check, Constraints & Money Rule | Backfill / Dedupe & Rollback |
|---|---|---|---|
| **Step 2: Infra-A** | `platform_admins` (`account_id`, `role`, `granted_at`, `is_active`) | Auth self-read; super-admin write | Bootstrapped via **manual SQL or env** (no hardcoded ID in repo); rollback drops table |
| **Step 2: Infra-B** | `statutory_rates` (`effective_from`, `verification_status`, `verified_by`, `verified_at`, CNAS/IRG/abatement/exemption/SNMG/overtime/TVA/Timbre — **no `effective_to`, no exclusion constraint**) + DB trigger blocking edits on referenced rows **except `verification_status`/`verified_by`/`verified_at`** | **Global RLS**: authenticated read, `platform_admins` write | Seed **only values present in code** as `unverified`; validity derived via latest `effective_from <= target_date`; missing params stay `NULL` & block their component; rate/date changes insert a new version; rollback drops trigger/table |
| **Step 2: Infra-C** | `wilayas_ref` (`code`, `name_fr`, `name_ar`, `name_en`, `valid_from`, `valid_to`, `is_legacy`, `verification_status`) + editable per-tenant `logistics_wilaya_tariffs` | `wilayas_ref`: **global RLS** (auth read, admin write); `logistics_wilaya_tariffs`: tenant+branch RLS | Seed 58 legacy wilayas as `unverified`; rollback drops table/policies |
| **Step 2: Infra-D** | `sequence_counters` + `device_sequence_blocks` + `allocate_sequence_number` & `reserve_sequence_block` RPCs | `SECURITY DEFINER` with **explicit caller membership check** (`business_id`, `branch_id`) + `FOR UPDATE` row lock | Device blocks for **WI tickets (`1.1`) & deposit receipts (`3.9`) only** (Phase 2 invoices reserved for deferred final numbering); Z-report policy confirmed at Gate 2; rollback drops RPCs/tables |
| **Step 2: Infra-E** | Storage buckets (`expense-receipts`, `bat-deliverables`) + MIME/size validation | Tenant+branch storage object RLS | No backfill; rollback drops policies/buckets |
| **Step 3: 4.10** | Nullable `total_sessions`, `duration_days` on `gym_plans` | Existing tenant+branch RLS | **No name-substring SQL backfill**: leave existing plans `NULL` and prompt owner to set; rollback drops columns |
| **Step 5: 3.4 / 3.5** | `gym_class_enrollments` table + `coach_confirmed`, `coach_confirmed_at`, `coach_confirmed_by` on `gym_schedule_events` | Tenant+branch RLS | No backfill; rollback drops columns/table |
| **Step 5: 3.9** | `deposit_receipt_number` + `UNIQUE (business_id, deposit_receipt_number)` + `printed_count` on `rental_security_deposits` | Existing tenant+branch RLS | Reprints auto-marked `"Duplicata"`; rollback drops index/columns |
| **Step 5: 3.10** | `validated_by`, `validated_at`, `is_locked` on `re_inspections` + DB update-block trigger when locked | Existing tenant+branch RLS | Existing rows default `is_locked = false`; rollback drops trigger/columns |
| **Step 5: 3.12** | `mfg_ncr_records` + `mfg_scrap_with_ncr(...)` RPC | Tenant+branch RLS + explicit caller check inside RPC | CMUP stock/WIP question raised at **Gate 1** (or hold stock/WIP adjustment until confirmed); rollback drops RPC/table |
| **Step 6: 1.1** | `gym_check_ins` delta-sync indexes + `override_by_staff_id`, `override_reason`; configurable window/override policy in `business_configs.category_settings` | Existing tenant+branch RLS | WI numbers via Infra-D device block/RPC; rollback drops columns/index |
| **Step 6: 1.2** | `marked_by`, `marked_at`, `change_history` (JSONB) on `edu_attendance` + **partial unique index** `UNIQUE (business_id, session_id, student_id) WHERE deleted_at IS NULL` | Existing tenant+branch RLS | Uses **Gate 1** read-only SQL results & soft-delete approval (`deleted_at`) for duplicates; local `eduQuickAttendance` migrated on load (keep 1 release); rollback drops index/columns |
| **Step 6: 1.3** | `started_at timestamptz` on `salon_chair_stations` | Existing tenant+branch RLS | Active chairs without `started_at` backfill from `updated_at`; rollback drops column |
| **Step 6: 1.4** | `pos_cash_sessions`, `pos_cash_movements`, `pos_z_reports` + immutable Z-report trigger | Tenant+branch RLS; **all new money columns in integer centimes (`bigint`, round half up)** | No default 15000 float; sequential Z-number per Gate 2 policy; rollback drops triggers/tables |
| **Step 6: 1.5** | `pos_refund_with_stock(...)` atomic RPC (`pos_sales` + `pos_stock_movements`) | Tenant+branch caller check inside RPC; preserves existing money column types | Rollback drops RPC |
| **Step 7a/7b: 2.x** | `source`, `entered_by` on `staff_attendance_logs` + **append-only trigger blocking UPDATE/DELETE**; nullable `rate_set_id` + `rate_basis` (`'legacy'`/`'versioned'`) + `rate_snapshot` (JSONB) + `run_type` (`'regular'`/`'adjustment'`) + `adjustment_seq` (`0` for regular, `>0` for adjustment) on `staff_payroll_runs`; **unique constraint** `UNIQUE (business_id, branch_id, period_year, period_month, run_type, adjustment_seq) WHERE deleted_at IS NULL`; DB immutability trigger on approved/paid runs & slips; **`approve_payroll_run(...)` transactional RPC** (run `draft → approved` + advances `pending → deducted/waived` atomically) | Tenant+branch RLS + explicit caller check inside RPC; trigger permits `draft → approved → paid` and advance deduction transitions | **7a dry-run only** in client build (run on real devices via read-only UI, lists **same-ID / different-content conflicts** AND **local period collisions**) → **Gate 4 approval** → **7b insert-only (`ON CONFLICT DO NOTHING`)** backfill preserving `localStorage` 1 release & leaving imported runs untouched (`"legacy basis"`); excludes `project_milestone` RH/Compta; rollback drops RPC/triggers/constraints/columns |

### Phased Execution & Review Gate Schedule

*Step-Start Discipline: At the start of every step (Steps 1–8), re-read `implementation_plan.md` and `REMEDIATION_LOG.md` before modifying any file.*

1. **Step 0 — Read-Only Verification Pass**: Verify every item (`CONFIRMED`, `ALREADY FIXED`, `NOT FOUND`, plus `[VERIFY]` checks), confirm repo test runners, scan code/fixtures/staging for `acc_01`, provide **read-only production SQL queries** (`acc_01` count + `edu_attendance` duplicates to approve dedupe right here), and pose the **3.12 CMUP stock/WIP question**. → **GATE 1: Stop for Approval.**
2. **Step 1 — Queue Hardening (`6.11`) & Report-Only CI Guards (`12.5`)**: Harden `offlineQueue.ts` (max cap alert, poison quarantine, dependency ordering, exponential backoff, queue export, non-destructive `ErrorBoundary`), initialize `REMEDIATION_LOG.md`, and activate report-only CI guards (forbidden literals, toast-only handlers, `localStorage` key registry, touched i18n).
3. **Step 2 — Phase 1 Infrastructure**: Ship `platform_admins`, `statutory_rates` (code-only unverified seed + `effective_from`-only versioning + verify-only update rule on referenced rows), `wilayas_ref` (58 legacy unverified) + tenant tariff-zone editor, Platform Admin Rate Verification view, `allocate_sequence_number` / `reserve_sequence_block` RPCs + proposed Z-report offline policy, shared centimes helper (**round half up**), and storage buckets + RLS. → **GATE 2: Stop for Approval.**
4. **Step 3 — Section 4 (Hardcoded Values & Fixtures)**: Execute `4.1`–`4.11` one commit per item (`4.6` safe file-header BAT metadata with `"manual / unverified"` fallback, `4.10` nullable plan fields without substring backfill).
5. **Step 4 — Section 5 (Routing, Roles & Access)**: Golden `role × route` baseline snapshot → `5.9`/`5.5` zero-diff proof → intentional fixes (`5.1`–`5.4`, `5.6`–`5.8`, `5.10`) with `"Access restricted"` + audit log → `5.11` orphan inventory for deletion approval. → **GATE 3: Stop for Approval.**
6. **Step 5 — Section 3 (Toast-Only Stubs)**: Disable/defer `3.1`/`3.2`; implement `3.3`–`3.13` one commit per item (`3.9` sequential `"Duplicata"` receipts, `3.11` Arabic-verified PDF + share sheet, `3.12` NCR/scrap per Gate 1 CMUP decision, and 0/1,000+/popup-block/partial-failure edge cases).
7. **Step 6 — Section 1 (Local-Only Persistence)**: Implement `1.1`–`1.6` one commit per item with network-kill and undo-reverses-remote tests (applying Gate 1-approved `edu_attendance` soft-delete dedupe before partial unique index).
8. **Step 7a → Gate 4 → Step 7b (Payroll & Attendance Source of Truth)**: Ship 7a dry-run migration tool (in-app read-only UI/export, fixture-tested, conflict + period-collision reporting, zero writes) in the client build for owner execution on real devices. → **GATE 4: Stop for Payroll Dry-Run Report Approval** → Enable 7b insert-only writes + transactional `approve_payroll_run` + immutability triggers + `"rates not verified"` / `"legacy basis"` UI.
9. **Step 8 — CI Guard Enforcement & Phase 1 Exit Report**: Switch Phase 1 CI guards (`12.5`) to failing mode, verify `tsc --noEmit`, lint, and all tests pass, and deliver the Phase 1 Exit Report. → **GATE 5: Stop Before Phase 2.**

### Full 5-Phase Roadmap *(Post-Phase 1 Approval)*

| Phase | Scope | Key Deliverables & Exit Criteria |
|---|---|---|
| **Phase 1: Trust** *(Immediate)* | Sections 1–5, 6.11, 6.12 touched i18n, 12.5 Phase 1 guards | All 5 Phase 1 gates passed; zero local-only actions, toast-only stubs, or hardcoded literals; role-route matrix & CI guards green |
| **Phase 2: Foundations** | Sections 6.1–6.10 | Unified invoicing (deferred final numbering for gap-free fiscal sequences), unified payments ledger (cheques/traites), shared SCF ledger, Party/CRM 360, reminders, shared WMS, CSV/Excel import, configurable RBAC + full RLS, approvals/attachments/API, BI KPI registry |
| **Phase 3: Vertical Depth** | Section 7 (`7.1`–`7.16`) | Adopt Phase 2 modules across all 16 verticals; execute approved medical/legal packed-JSON backfills; ship `magasinier` Réceptions & trade gaps |
| **Phase 4: Trade Presets** | Section 8 | Data-driven presets (`category_formules`) for 160 trades; `"Coming soon"` capability gating; automated 160-trade provisioning suite |
| **Phase 5: Consolidation & Hardening** | Sections 9–11 & remaining 12.x | Unified Group A/B data contract, schema-drift check, security checklist (2FA, PIN lockouts, Law 18-07 review, backup/restore drill), Playwright E2E golden paths, print visual regression QA |
