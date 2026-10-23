# Backend Production Readiness Audit & Interactive CRUD Diagnostic Panel

This plan outlines the end-to-end verification and architectural hardening required to validate that Atrium's backend—both the local reactive store and cloud Supabase persistence layer—is fully production-ready across all 7 business verticals, complete with an interactive in-app diagnostic testing console.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during interactive clarification and shape this plan:
>
> - **Primary Scope**: Full end-to-end CRUD audit across all 7 business verticals (`membership_session`, `appointment_service`, `pos_inventory`, `freelance_solo`, `rental_booking`, `education_cohort`, `project_milestone`).
> - **Presentation**: Build an **interactive in-app diagnostic panel** that allows the user and operators to run live, non-destructive test suites verifying Create, Read, Update, and Delete operations with real latency, schema validation, and Quadruple Traceability compliance.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Audits all Supabase service clients and local store dispatchers for full CRUD parity, error boundaries, and offline resilience.
  2. Embeds an enterprise-grade **Backend Diagnostics & Live CRUD Runner** into the application (accessible from Settings or top-bar system health status).
  3. Executes automated end-to-end CRUD probes for each vertical:
     - **Create**: Inserts isolated test records with full quadruple trace keys (`account_id`, `business_id`, `branch_id`, `staff_id`).
     - **Read**: Fetches and verifies column mapping and lineage isolation.
     - **Update**: Performs optimistic local and remote mutations.
     - **Delete**: Cleans up test fixtures cleanly without leaving test debris.
- **Target Audience**: Business owners, technical administrators, and auditors verifying multi-branch isolation and data integrity prior to scale.
- **Key Value**: Immediate, visual proof of backend readiness with zero guesswork—showing exact HTTP response codes, latency in milliseconds, and schema conformance across both local and cloud layers.

---

### 2. User Experience & Visual Design

Following the **SaaS & Enterprise Dashboard** guidelines (`frontend_design/references/3_saas_dashboard.md`):

- **Single-Elevation Diagnostic Console**:
  - Located within Settings (`Settings -> Backend & Database Health`) with an optional quick-access modal.
  - Clean, high-density layout: Top summary bar with connection latency (`ms`), active Supabase project status, local cache integrity, and an overall **"Production Ready"** badge.
  - Zero-pill discipline: Statuses rendered via unboxed text with subtle color tokens (`text-emerald-700 dark:text-emerald-400 font-medium` for Passed, `text-amber-700` for Warning, `text-rose-700` for Error) and typographic dot separators (`·`).
- **Interactive Vertical Test Matrix (7 Verticals)**:
  - Table showing all 7 verticals with individual test triggers:
    1. **Gym & Fitness**: Member registration, plan assignment, RFID check-in event.
    2. **Salon & Spa**: Client appointment booking, technician allocation, reschedule.
    3. **Retail & Restaurant POS**: Inventory adjustment, register sale, parked order hold & recall.
    4. **Freelance Studio**: Client onboarding, deliverable time log, invoice generation.
    5. **Venue & Space Rental**: Space booking, security deposit release, check-out status.
    6. **Education Academy**: Student enrollment, cohort session attendance, grade record.
    7. **Project & Agency**: Mission staffing, expense declaration, CCP payroll batch & SFP 01 slip generation.
  - "Run Full Audit" button (`bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-medium px-4 py-2 hover:opacity-90 active:scale-98 transition-all`).
  - Monospace tabular numbers (`font-mono tabular-nums`) for execution latency (`e.g., 42ms`) and timestamp records.
- **Payload & Traceability Inspector**:
  - Collapsible detail drawer for each test showing exact JSON payloads passed, Supabase response headers, and verification of `account_id`, `business_id`, `branch_id`, and `staff_id`.

---

### 3. Key Technical Decisions & Audit Matrix

- **Decision 1: Non-Destructive Test Sandbox Keys**
  - *Strategy*: All diagnostic test probes will write with an explicit `is_diagnostic_test: true` metadata flag and temporary IDs prefixed with `diag_test_*`.
  - *Safety*: The runner cleans up test entries immediately upon test completion, or within a designated `cleanupDiagnosticFixtures()` sweep, ensuring production database hygiene.

- **Decision 2: Dual Mode (Offline/Local & Supabase Cloud)**
  - *Strategy*: The runner checks `isSupabaseConfigured()`.
    - If connected: Executes live round-trip REST RPC/PostgREST queries to Supabase, recording round-trip latency and RLS policy acceptance.
    - If local-only: Tests in-memory state mutations, reactive subscriptions, and `localStorage` persistence, reporting local store readiness.

- **Decision 3: Complete Vertical Coverage (The 7 Pillars)**
  | Vertical | Primary Table / State Entity | Tested CRUD Mutation | Quadruple Key Check |
  | :--- | :--- | :--- | :--- |
  | **1. Gym & Fitness** | `members_directory` / `members` | Register & RFID check-in | Yes (`acc`, `biz`, `branch`, `staff`) |
  | **2. Salon & Spa** | `salon_appointments` / `appointments` | Book appointment & update status | Yes |
  | **3. POS & Retail** | `pos_sales`, `pos_stock_movements` | Process sale, park order, adjust stock | Yes |
  | **4. Freelance Solo** | `freelance_projects`, `freelance_timelogs` | Log hours, add milestone invoice | Yes |
  | **5. Venue Rental** | `rental_bookings`, `rental_deposits` | Create booking, record deposit | Yes |
  | **6. Education** | `education_attendance`, `education_students` | Enroll student, log attendance mark | Yes |
  | **7. PM Agency** | `pm_ccp_slips`, `pm_expenses` | Expense approval & SFP 01 slip generation | Yes |

---

### 4. Implementation Steps & Planned Changes

1. **Diagnostic Service Engine (`src/services/diagnosticRunner.ts`)**:
   - Implement the test runner engine executing isolated CRUD lifecycle tests for all 7 verticals.
   - Measures response duration (`performance.now()`), payload conformance, and verifies quadruple keys.
   - Provides clean teardown functions to delete temporary records.

2. **In-App Diagnostic UI Component (`src/components/BackendDiagnosticPanel.tsx`)**:
   - Build a clean, high-density diagnostic dashboard adhering to `frontend_design` principles (flat surfaces, subtle 1px borders, zero-pill styling, monospace timings).
   - Features:
     - "Run All Diagnostics" primary action.
     - Vertical-by-vertical status cards with step-by-step progress bars.
     - Live inspection modal/drawer showing sent and received JSON payloads.
     - Summary scorecard (e.g., `14/14 CRUD Probes Passed · 100% Traceability Verified`).

3. **Settings Integration (`src/components/SettingsScreen.tsx` / Navigation)**:
   - Add a dedicated "Backend Health & CRUD Diagnostics" tab/button in Settings and top status bar so the user can run the audit at any time.

4. **Service Hardening (Catch & Log Missing Paths)**:
   - Verify that any minor edge cases uncovered during the diagnostic suite (such as Supabase service error handlers) gracefully fall back without unhandled promise rejections.

---

### 5. Verification & Acceptance Criteria

1. **Live CRUD Verification**: Run all 7 vertical diagnostics directly inside the app; verify 100% pass rate.
2. **Traceability Validation**: Confirm every test payload includes valid non-null `account_id`, `business_id`, `branch_id`, and `staff_id`.
3. **Clean Teardown**: Verify that test records created during the live audit are automatically purged without polluting user data.
4. **Build & Lint**: Verify `compile_applet` and `lint_applet` pass with 0 errors.
