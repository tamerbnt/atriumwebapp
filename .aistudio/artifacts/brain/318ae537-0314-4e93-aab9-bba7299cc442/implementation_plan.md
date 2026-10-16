# Supabase Connection & Data Synchronization Architecture Plan (Atrium ERP)

Comprehensive architectural blueprint to connect Atrium ERP & CRM to **Supabase** (PostgreSQL + Auth + Realtime + Storage) as specified in `/docs/SPECIFICATION.md`. This plan details the client SDK integration, auth flow, schema typing, RPC invocation layer, real-time sync, and offline-resilient fallback strategy without breaking any existing multi-vertical functionality.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions define how Supabase will be integrated into the Atrium web platform:
> - **Dual-Mode Adapter (Hybrid Cloud / Offline Fallback)**: The application will support live Supabase connectivity when configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, while automatically falling back to the existing in-memory / local storage engine when credentials are absent or during network interruptions.
> - **Client-Side Environment in Vite**: In this React Vite SPA, public credentials will follow `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and be consumed via `@supabase/supabase-js`.
> - **Strict Multi-Tenant Row-Level Security (RLS)**: Client requests will use authenticated JWTs scoped via `account_id = get_auth_account_id()` and `branch_id IN (SELECT id FROM branches WHERE account_id = get_auth_account_id())`. Service role keys will never be exposed client-side.
> - **RPC-First Business Operations**: Tenant onboarding (`onboard_owner_account`), voucher redemption (`redeem_license_voucher`), and entity creation (`create_business`, `create_branch`, `register_device`) will strictly use the defined Supabase stored procedures for transactional integrity and server-side quota enforcement.

---

## 1. Overview & Core Concept

### What It Does
This architecture transitions Atrium from purely client-side mock/local storage persistence into an enterprise multi-tenant cloud application backed by Supabase PostgreSQL. 

It implements:
1. **Supabase Auth**: Owner signup/login via Supabase Auth, staff PIN/profile resolution, and session persistence.
2. **PostgreSQL Relational Storage (17 Tables)**: Synchronizing accounts, subscriptions, businesses, branches, devices, staff, members, registrations, and transactions.
3. **14 Stored RPCs**: Bootstrapping tenant onboarding, quota enforcement, and voucher activation.
4. **Realtime Channels**: Live updates for member check-ins, appointments, POS sales, and system notifications across multiple devices/terminals.

### Target Personas
- **Business Owners**: Secure authentication, cloud-persisted tenant data, voucher redemption, and multi-branch visibility.
- **Front-Desk Staff & Cashiers**: Fast session PIN login, instant sync of bookings and admissions, real-time terminal sync.

---

## 2. User Experience & Flows

### 1. Authentication & Onboarding Flow
- **Owner Sign In**: Email & password authentication directly against Supabase Auth.
- **New Tenant Onboarding**: When a new owner registers, the app invokes `onboard_owner_account(...)` RPC, which atomically provisions:
  - `accounts` entry linked to `auth.users.id`.
  - `businesses` and primary `branches` records for the selected category.
  - Active `account_subscriptions` record (trial or voucher).
  - Default `branch_modules`.
- **Staff Switch & PIN Authentication**: For terminal usage, staff can switch profiles using fast PIN verification backed by `get_staff_profiles` or direct `staff` table validation.

### 2. Multi-Branch & Vertical Switching
- Selecting a facility (e.g., Gym vs. Salon) re-scopes data queries to the selected `branch_id` under the current `account_id`.
- The UI reflects cloud sync status with a live connection badge (`Cloud Synced` / `Syncing...` / `Offline Mode`).

### 3. Realtime Updates Across Terminals
- Member check-ins on one terminal automatically broadcast via Supabase Realtime to update the Dashboard and Member Inspector on all other connected devices without manual refresh.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Official `@supabase/supabase-js` SDK**
  - *Chosen Approach*: Install `@supabase/supabase-js` to handle PostgreSQL queries, Auth state listeners, and WebSocket Realtime subscriptions.
  - *Why*: Provides first-class TypeScript inference with generated/crafted database types, automatic token refresh, and connection heartbeat management.
  - *Alternatives Considered*: Custom REST fetch wrappers (rejected: lacks automatic reconnection, token refresh, and realtime WebSockets).

- **Decision 2: Repository / Adapter Pattern in `store.ts`**
  - *Chosen Approach*: Maintain a unified service API (`DataService`) in the store. When Supabase is configured and online, operations write to Supabase and update local state; if unconfigured or offline, operations persist to local storage.
  - *Why*: Prevents screen components from having to know whether data is cloud or local; preserves fast optimistic UI updates and instant screen rendering.

- **Decision 3: Server-Enforced Quotas via Supabase RPCs**
  - *Chosen Approach*: Call Supabase stored procedures (`create_business`, `create_branch`, `register_device`) rather than direct `INSERT` statements when creating quota-limited entities.
  - *Why*: Prevents client-side manipulation of plan tiers and ensures atomic rollback if quotas are exceeded.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Atrium React Application                         │
│                                                                             │
│  ┌───────────────────────┐  ┌─────────────────────────────────────────────┐ │
│  │   UI Screens & Views  │  │  TopBar & Settings (Cloud Status & Sync)    │ │
│  └───────────┬───────────┘  └──────────────────────┬──────────────────────┘ │
│              │                                     │                        │
│              ▼                                     ▼                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                 Store & State Manager (store.ts)                       │ │
│  │  - Optimistic In-Memory State & React Context / Zustand                │ │
│  │  - Category Terminology & Branch Scoping                               │ │
│  └───────────────────┬─────────────────────────────┬──────────────────────┘ │
│                      │                             │                        │
│         [Online]     ▼                             ▼   [Offline / Demo]     │
│  ┌────────────────────────────────────┐   ┌───────────────────────────────┐ │
│  │    Supabase Client Adapter Layer   │   │  Local Storage Fallback Cache │ │
│  │    (/src/lib/supabase)             │   │  (atrium_erp_desktop_v2)      │ │
│  └───────────────────┬────────────────┘   └───────────────────────────────┘ │
└──────────────────────┼──────────────────────────────────────────────────────┘
                       │ HTTPS / WSS
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Supabase Cloud                                  │
│                                                                             │
│  ┌───────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐ │
│  │   Supabase Auth   │  │   17 Tables + RLS    │  │   14 Stored RPCs      │ │
│  │   (JWT Tokens)    │  │   (Tenant Scoped)    │  │   (Quota & Onboarding)│ │
│  └───────────────────┘  └──────────────────────┘  └───────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                   Supabase Realtime Channels (postgres_changes)        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Table Schema Directory (17 Tables from Specification)

1. **`subscription_plans`**: Plan catalog (Free Trial, Starter, Pro, Enterprise) with quota limits.
2. **`modules`**: Feature catalog (`members`, `pos`, `classes`, `inventory`, `payroll`).
3. **`accounts`**: Owner profile linked 1:1 to `auth.users`.
4. **`account_subscriptions`**: Active billing/license status and lifetime voucher status.
5. **`businesses`**: Brand/company entity with category (`membership_session`, `appointment_service`, `pos_inventory`, etc.).
6. **`branches`**: Physical facilities/locations scoped to a business.
7. **`devices`**: Authorized POS terminals with hardware IDs and heartbeat tracking.
8. **`license_vouchers`**: Prepaid lifetime codes (`ATR-PLAN-LIFE-XXXX-XXXX`).
9. **`account_audit_logs`**: Security and operational event ledger.
10. **`branch_modules`**: Module toggle states per branch.
11. **`branch_sync_logs`**: Checkpoints for offline/desktop data sync.
12. **`device_heartbeats`**: POS terminal telemetry and health pings.
13. **`system_notifications`**: In-app notifications and alerts.
14. **`staff`**: Team member directory with roles (`Owner`, `Manager`, `Cashier`, `Technician`, `Stylist`, `Staff`).
15. **`staff_branch_assignments`**: Branch scoping for staff members.
16. **`staff_module_permissions`**: Fine-grained view/edit/delete module permissions.
17. **`members_directory`** & **`registrations`** / **`registration_requests`**: Member CRM, check-ins, and intake leads.

### Key RPC Function Mapping

| Stored RPC | App Functionality & Trigger |
|---|---|
| `onboard_owner_account` | Invoked on initial owner registration to initialize account, business, branch, and trial/lifetime subscription. |
| `redeem_license_voucher` | Invoked from Settings > License to activate lifetime vouchers. |
| `create_business` | Invoked when creating an additional brand/business (with plan limit verification). |
| `create_branch` | Invoked when creating a new branch/facility under a business. |
| `register_device` / `revoke_device` | Device terminal authorization from Settings > Devices. |
| `get_staff_profiles` / `get_staff_context` | Rapid staff profile resolution and PIN authentication. |
| `get_tenant_facilities` | Fast multi-facility listing on app startup. |

---

## 5. Planned Implementation Phases (For Execution When Approved)

### Phase 1: Dependencies & Environment Setup
- Install `@supabase/supabase-js`.
- Update `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Create `/src/lib/supabase/client.ts` with typed client initialization and graceful fallback initialization.

### Phase 2: Database Schema & TypeScript Contract Definitions
- Create `/src/lib/supabase/types.ts` containing complete type definitions for all 17 tables and 14 RPC signatures matching `/docs/SPECIFICATION.md`.
- Create mapping helpers between database snake_case columns and Atrium's camelCase domain models.

### Phase 3: Supabase Service Layer & RPC Integrations
- Create `/src/lib/supabase/services/`:
  - `authService.ts`: `signIn`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`.
  - `tenantService.ts`: `onboardOwnerAccount`, `fetchTenantHierarchy`, `createBusinessRpc`, `createBranchRpc`.
  - `licenseService.ts`: `redeemVoucherRpc`, `fetchSubscriptionStatus`.
  - `memberService.ts`: `fetchMembers`, `createMember`, `updateMember`, `deleteMember`.
  - `staffService.ts`: `fetchStaff`, `getStaffProfilesRpc`, `verifyPin`.
  - `realtimeService.ts`: Realtime subscription channels for table changes.

### Phase 4: Integration with `store.ts` (Hybrid Mode)
- Enhance `store.ts` with an asynchronous sync engine:
  - On app load: Check Supabase session; if active, hydrate state from Supabase tables.
  - On data mutations (`addMember`, `checkoutAppointment`, `addSale`, `addBranch`): Perform mutation via Supabase client when online; maintain optimistic local state; fallback to localStorage when disconnected.
  - Add connection status indicator state (`'connected'` | `'connecting'` | `'offline'` | `'local_demo'`).

### Phase 5: Verification & Quality Assurance
- Test authentication flows (Login, Sign-up, Onboarding RPC).
- Test tenant data isolation between multiple facilities.
- Verify that compiling `npm run build` passes with zero TypeScript errors.
