# Atrium Enterprise 100% Production-Readiness Plan

Upgrade the Atrium ERP/CRM platform across its PostgreSQL schema, client sync and service layers, operational UI, and DevOps verification tooling so every item on the 14-point production-readiness checklist—especially pagination past Supabase's 1,000-row cap, batch writes, atomic multi-table transactions, optimistic concurrency control, partial unique indexes, paired migration rollbacks, automated backups, and restore testing—reaches 100%.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Scope & Architecture Decisions**
> All four architectural directions below were confirmed in Phase 1 and govern this implementation:

- **Upgrade Scope (Full Stack)**: Deliver coordinated database SQL migrations, client application updates, UI conflict/pagination controls, and operational backup/CI/test scripts.
- **Pagination Strategy (Auto-Chunked Full Sync + UI Load More)**: Automatically paginate background sync queries in bounded chunks (1,000 rows per page via `.range()`) to bypass PostgREST's default `max-rows` truncation limit without sacrificing offline availability, paired with explicit "Load More" and live item counters on high-volume ledgers and histories.
- **Concurrent Edit Protection (Optimistic Version Checks + Conflict Resolution)**: Introduce monotonic row `version` checks across mutable records with a clear conflict resolution modal whenever two users edit the same record concurrently, allowing the user to inspect both versions and choose to overwrite, reload server state, or merge.
- **Rollbacks, Backups & DB Restore Testing**: Generate paired `down` SQL rollback scripts for every migration (`0001`–`0005`), automated `pg_dump` / restore verification shell scripts, GitHub Actions CI migration-and-test workflows, and live PostgreSQL integration tests.

> [!WARNING]
> **Managed Infrastructure Prerequisite (Supabase Tier)**
> Even with automated `pg_dump` scripts in the repository, continuous **Point-in-Time Recovery (PITR)** and zero-downtime managed daily snapshots require the hosted Supabase project to run on **Supabase Pro + PITR** rather than the Free tier.

---

### 1. Overview & Core Concept

- **What It Does**: Closes every remaining gap from the 14-point production-readiness audit so the platform safely supports high-volume multi-branch tenants (10,000+ sales, check-ins, parcels, and audit logs), multi-user concurrent edits, single-transaction multi-table mutations, safe schema rollbacks, and repeatable backup/restore verification.
- **Target Audience / Persona**: Multi-branch business owners, reception/POS operators, clinic/garage/warehouse staff working concurrently on shared records, and platform operators deploying or recovering production databases.
- **Key Value**:
  - **Zero Silent Data Truncation**: High-volume branches never lose visibility into records past row 1,000.
  - **Zero Silent Overwrites**: Concurrent form saves detect stale `version` numbers before overwriting another staff member's work.
  - **Atomic Integrity & Batch Throughput**: Sequential write loops become single-request batch upserts or single-transaction SQL RPCs.
  - **Recoverable Operations**: Every migration has a tested rollback counterpart, repeatable backup/restore drill script, and automated CI validation.

---

### 2. User Experience & Visual Design

All new UI elements strictly preserve Atrium's existing **Terracotta & Warm Limestone** (Light) and **Obsidian & Copper** (Dark) design tokens, `Barlow Condensed` display headers, `Inter` / `Cairo` body typography, single-elevation flat borders, and tabular numerals (`tabular-nums`).

- **Key User Flows**:
  1. **High-Volume Ledger & History Paging (`Load More`)**:
     - When viewing high-volume tables (POS Sales, Gym Check-ins, Logistics Parcels, Audit Logs, Financial Ledgers), initial rows render immediately from the local synced store with an unboxed tabular summary (e.g., `Showing 100 of 2,480 records`).
     - Scrolling to the end or clicking the clean `Load More` action fetches the next page or expands the visible slice smoothly with skeleton row placeholders (`<= 2px` geometry delta) during network fetches, plus a clear empty state or inline retry action if offline/errored.
  2. **Optimistic Concurrency Conflict Resolution Dialog**:
     - When a user clicks `Save` on an edited record (member, client, product, work order, property, etc.) whose server `version` increased since they opened the form, the mutation safely aborts before overwriting.
     - A focused single-elevation modal opens showing a clean side-by-side comparison of **Your Unsaved Edits** vs. **Latest Server State** (with timestamp and `tabular-nums` version numbers), offering three clear actions: `Keep Server Version` (discard & reload), `Overwrite with Mine` (re-submit with latest version), or `Apply Selected Fields` (field-level merge).
  3. **Settings Backup & Restore Readiness Controls**:
     - Enhances the existing Settings data management section with clear backup export/import actions, structured validation feedback before restoring a JSON snapshot, and explicit confirmation prompts—free of fake telemetry tickers or decorative status dots.

- **Visual Identity & Discipline**:
  - *Surfaces & Contrast*: Uses `--atr-card` (`#FBF8F5` light / `#262422` dark) with 1px `--atr-line` hairline borders, zero nested card-in-card clutter, and zero thick left accent stripes.
  - *Typography & Numbers*: Monospace / `tabular-nums` alignment for all record counts, version tags, and timestamps; clean `·` separators for inline metadata instead of pill badge clusters.
  - *Motion & Latency*: Modals and conflict banners settle within `160ms–200ms` using compositor-only `opacity` and `transform`, honoring `prefers-reduced-motion`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Chunked `.range()` Pagination on Sync + Bounded Windowing in UI**:
  - *Chosen Approach*: Upgrade all Supabase `fetch*` services to loop in deterministic `1,000`-row pages ordered by `(updated_at ASC, id ASC)` (or `(created_at DESC, id DESC)` for UI-driven cursor loads) and introduce explicit paginated query helpers for audit logs and transaction histories.
  - *Why*: Eliminates PostgREST's silent 1,000-row ceiling while keeping offline-first IndexedDB/Zustand filtering instant across branches.
  - *Alternatives Considered*: Pure server-side 50-row paging everywhere (breaks instant offline branch operation) or raising PostgREST `max-rows` blindly (causes massive single-payload timeouts on large tenants).

- **Decision 2 — Batch Array Upserts + Atomic SQL RPCs for Multi-Table Writes**:
  - *Chosen Approach*: Replace the remaining sequential `for`-loop upserts (CCP batch slips, BOM ingredients, wilaya tariffs) with single batch array upserts inside one SQL RPC for parent+child writes (e.g., BOM recipe + ingredients saved atomically).
  - *Why*: Eliminates write-side N+1 latency and prevents half-saved child records if a network drop happens mid-operation.
  - *Alternatives Considered*: Leaving multi-table client loops with retry queues (still allows temporary orphan or partial BOM states on failure).

- **Decision 3 — Optimistic Concurrency Control via Integer `version` Column**:
  - *Chosen Approach*: Add a `version BIGINT NOT NULL DEFAULT 1` column and a lightweight `BEFORE UPDATE` Postgres trigger that auto-increments `version` and rejects stale updates (`RAISE EXCEPTION 'CONFLICT_STALE_VERSION'` when a caller supplies an older `expected_version`), wired through `syncCoordinator` and offline replay checks.
  - *Why*: Prevents two concurrent managers from silently overwriting each other on plain CRUD forms while keeping reads lock-free (`0` deadlock risk).
  - *Alternatives Considered*: Pessimistic `SELECT ... FOR UPDATE` row locks on forms (holds DB connections open across user think-time and breaks offline editing).

- **Decision 4 — Partial Unique Indexes (`WHERE deleted_at IS NULL`)**:
  - *Chosen Approach*: Convert soft-deletable unique constraints (product SKUs, barcodes, voucher/document codes, staff emails/codes) from table-wide `UNIQUE` constraints into partial unique indexes scoped to active rows (`WHERE deleted_at IS NULL`).
  - *Why*: Allows businesses to soft-delete a SKU or code and later recreate a record with the same code without hitting false duplicate-key errors.
  - *Alternatives Considered*: Appending deleted timestamps onto deleted codes (pollutes audit history and financial receipts).

- **Decision 5 — Paired Migration Rollbacks, CI Pipeline & Backup/Restore Verification**:
  - *Chosen Approach*: Add `0005_enterprise_100pct_hardening.sql` (versions, partial unique indexes, atomic BOM/tariff RPCs, keyset/range pagination indexes), paired `down` rollback scripts for migrations `0001`–`0005`, an automated `pg_dump`/restore drill script, a Supabase CLI migration CI workflow, and a database integration test suite verifying RLS, concurrency conflicts, transactions, and rollbacks.
  - *Why*: Makes schema changes, disaster recovery, and backup restoration verifiable and repeatable rather than manual guesswork.
  - *Alternatives Considered*: Forward-fix-only scripts without tested rollbacks (leaves teams scrambling during a botched deploy).

---

### 4. Technical Architecture & Data Strategy

#### System & Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        ATRIUM CLIENT APPLICATION                           │
│                                                                            │
│  ┌──────────────────────┐    ┌─────────────────────┐   ┌────────────────┐  │
│  │ Operational Modules  │───▶│ Conflict Resolution │   │ Load More /    │  │
│  │ & Settings Views     │    │ & Merge Modal       │   │ Paged Lists    │  │
│  └──────────┬───────────┘    └──────────▲──────────┘   └───────┬────────┘  │
│             │                           │ stale version        │           │
│             ▼                           │ error                ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │               Sync Coordinator & Offline Mutation Queue              │  │
│  │  • Chunked Pagination (.range 0..999) + Keyset Cursor Sync           │  │
│  │  • Batch Array Upserts (Zero Write Loops) + expected_version Guard   │  │
│  │  • Single-Flight Coalescing & Bounded Concurrency Pool (max 4)       │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────────┘
                                      │ HTTPS / PostgREST / WebSocket Realtime
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE CLOUD (MANAGED INFRASTRUCTURE)                  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │           PostgREST Gateway + Supavisor Connection Pooler            │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         PostgreSQL Engine                            │  │
│  │  • Version-Checked Triggers (Optimistic Concurrency Control)         │  │
│  │  • Atomic Parent+Child RPCs & FOR UPDATE Row Locks                   │  │
│  │  • Partial Unique Indexes (WHERE deleted_at IS NULL)                 │  │
│  │  • Composite Keyset Indexes (branch_id, updated_at, id)              │  │
│  │  • Soft Deletes + Immutable Audit Log Triggers + Strict RLS          │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    DEVOPS, MIGRATION & RECOVERY PIPELINE                   │
│                                                                            │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ Up & Paired Down    │  │ Backup & Restore     │  │ Automated CI &    │  │
│  │ SQL Migrations      │  │ Drill Scripts        │  │ Live DB Test      │  │
│  │ (0001..0005 + Down) │  │ (pg_dump -> Staging) │  │ Suite (RLS/Locks) │  │
│  └─────────────────────┘  └──────────────────────┘  └───────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State Updates

- **Schema Additions (`0005` Migration)**:
  - `version BIGINT NOT NULL DEFAULT 1` added across all mutable domain and workforce tables, enforced by an automatic `BEFORE UPDATE` trigger (`fn_enforce_optimistic_version`) that increments `version` on commit and raises a structured `P0002` / `40001` conflict error when an incoming update specifies a stale `expected_version`.
  - Partial unique indexes (`CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`) replacing rigid table-wide unique indexes on soft-deletable codes/SKUs/emails so archived records never block active reuse.
  - Deterministic keyset pagination indexes `(branch_id, updated_at, id) WHERE deleted_at IS NULL` across all high-volume tables to keep chunked `.range()` and cursor fetches index-only.
  - Atomic PL/pgSQL RPCs for multi-table writes currently orchestrated client-side (e.g., saving a manufacturing BOM recipe and its ingredient list inside one transaction; batching wilaya tariff and CCP slip inserts).
- **Client Sync & Store State**:
  - Pagination helper in the data/sync layer fetches `.range(from, to)` pages of 1,000 rows until exhausted (or loads incremental windows on demand for archive/audit screens), removing silent PostgREST truncation across all 21 service modules.
  - Every domain entity carries `version?: number`; `syncCoordinator` attaches `expected_version` (or `.eq('version', currentVersion)`) on updates and catches conflict responses cleanly without discarding the user's unsaved form state or spamming the offline retry queue.

#### 14-Point Coverage Mapping (Bringing Every Item to 100%)

| Production Standard | Closing Action to Reach 100% |
|---|---|
| **1. Indexes (95% → 100%)** | Add deterministic `(branch_id, updated_at, id)` & keyset pagination indexes across high-volume tables. |
| **2. N+1 Queries (80% → 100%)** | Eliminate the 3 remaining sequential write `for` loops (CCP slips, BOM ingredients, wilaya tariffs) via batch array upserts / single RPCs. |
| **3. Connection Pooling (100%)** | Preserve HTTPS PostgREST + Supavisor pooling, keep bounded `runWithConcurrency(4)`, and verify all `0005` SQL is Transaction-Mode safe. |
| **4. Migrations (90% → 100%)** | Add Supabase CLI config & automated GitHub Actions CI migration workflow with dry-run validation. |
| **5. Migration Rollbacks (0% → 100%)** | Author paired `down` SQL rollback scripts for phases `0001`–`0005`, ordered to reverse triggers, policies, indexes, and columns cleanly. |
| **6. Backups (40% → 100%)** | Add encrypted `pg_dump` scheduled backup script + Supabase Pro/PITR runbook + verified JSON snapshot validation in Settings. |
| **7. Testing & Restore (50% → 100%)** | Add automated staging DB restore drill script (`pg_restore` + smoke checks) and Vitest DB/concurrency/pagination test suites. |
| **8. Transactions (85% → 100%)** | Move remaining multi-table client writes (e.g., BOM recipe + ingredients) into single atomic Postgres RPC transactions. |
| **9. Race Conditions (85% → 100%)** | Enforce optimistic `version` concurrency control on form edits + Conflict Resolution modal + replay conflict detection in offline queue. |
| **10. Row Locking (90% → 100%)** | Audit and confirm `FOR UPDATE` locks cover any newly added multi-table atomic RPCs alongside the 16 existing locked RPCs. |
| **11. Unique Constraints (95% → 100%)** | Migrate soft-deletable unique indexes to partial `WHERE deleted_at IS NULL` unique indexes. |
| **12. Foreign Keys (95% → 100%)** | Verify all new batch/version tables and child references enforce strict FKs with explicit `ON DELETE` rules and no orphan vectors. |
| **13. Soft Deletes (95% → 100%)** | Ensure partial unique indexes, optimistic version triggers, and chunked pagination consistently preserve `deleted_at` filtering and live pruning. |
| **14. Pagination (5% → 100%)** | Implement `.range()` chunked paging across all 21 Supabase service fetchers, paginated audit log viewer, and UI `Load More` controls with loading/empty/error states. |
