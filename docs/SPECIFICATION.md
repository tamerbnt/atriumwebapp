# Atrium — Web Application Build Specification

> **Purpose**: This document gives an AI agent every detail it needs to build a pixel-perfect, fully functional web version of the Atrium business management platform. Read it completely before writing a single line of code.

---

## Table of Contents

1. [Project Overview & Philosophy](#1-project-overview--philosophy)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Supabase Backend — Tables, RPCs & RLS](#3-supabase-backend--tables-rpcs--rls)
4. [License & Subscription System](#4-license--subscription-system)
5. [Business Categories (Verticals)](#5-business-categories-verticals)
6. [Domain Data Models](#6-domain-data-models)
7. [Design System — Colors, Typography, Spacing](#7-design-system--colors-typography-spacing)
8. [Component Library](#8-component-library)
9. [Screen Architecture & Navigation](#9-screen-architecture--navigation)
10. [Membership Category — Template Screens (Reference Implementation)](#10-membership-category--template-screens-reference-implementation)
11. [Authentication & Onboarding Flow](#11-authentication--onboarding-flow)
12. [Localization (3 Languages)](#12-localization-3-languages)
13. [Roles & Permissions](#13-roles--permissions)
14. [API Layer Guidelines](#14-api-layer-guidelines)
15. [Offline & Sync Strategy](#15-offline--sync-strategy)

---

## 1. Project Overview & Philosophy

**Atrium** is a multi-tenant, multi-category business management SaaS platform. The original desktop version is a WPF (C#) application following Clean Architecture + DDD + CQRS. The web version must reproduce the **exact same UX, data model, and business logic** in a browser environment.

### Core Principles

| Principle | Meaning |
|---|---|
| **Multi-tenant** | Every record is scoped to an `account_id` (the owning business). Row-Level Security (RLS) in Supabase enforces this at the DB layer. |
| **Multi-facility** | A tenant can own multiple **businesses**, each with multiple **branches**. All operational data is scoped to a `branch_id`. |
| **Multi-category** | The system supports 6 different business verticals (Gym, Salon, Restaurant, Project, Rental, Education). UI layouts and terminology adapt per vertical. |
| **Offline-first (desktop only)** | The desktop app uses SQLite locally. The web app should work with realtime Supabase subscriptions instead. |
| **Lifetime/Cash Licensing** | Unique business model: customers pay cash for a lifetime voucher code (`ATR-PLAN-LIFE-XXXX-XXXX`). No recurring subscription management in the UI. |
| **Apple Spatial Aesthetic** | The entire UI follows an Apple 2025 / glassmorphism design language with Terracotta (#C4785A) as the brand accent. |

---

## 2. Tech Stack & Architecture

### Recommended Stack

| Layer | Technology |
|---|---|
| **Framework** | **Next.js 14** (App Router) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS with CSS Custom Properties (no Tailwind) |
| **Backend** | **Supabase** (PostgreSQL + Auth + Realtime + Storage) |
| **State Management** | Zustand (global) + React Query / TanStack Query (server state) |
| **Forms** | React Hook Form + Zod validation |
| **Icons** | Lucide React (matches the Lucide Line Art system used in the desktop app) |
| **Fonts** | Inter (body) + system-ui (fallback) — load from Google Fonts |
| **Animations** | CSS transitions + Framer Motion for complex animations |
| **Realtime** | Supabase Realtime channels for live data updates |
| **Deployment** | Vercel |

### Project Structure

```
/app
  /(auth)           — login, onboarding, license entry
  /(dashboard)      — protected shell with sidebar
    /members        — Membership category screens
    /registrations  — Lead/Registration management
    /shop           — POS / Inventory
    /salon          — Appointment & Service (AppointmentService)
    /finance        — Finance, payroll, staff
    /history        — Transaction history
    /settings       — Account, branches, devices, preferences
  /api              — Next.js API routes (if needed for server logic)
/components
  /ui               — Primitives (Button, Input, Badge, Card, Avatar)
  /layout           — Sidebar, TopBar, Shell
  /screens          — Screen-specific composite components
/lib
  /supabase         — Supabase client, typed DB helpers
  /stores           — Zustand stores
  /hooks            — Custom React hooks
  /utils            — Formatting, validation utilities
/styles
  /tokens.css       — Design tokens (colors, spacing, radii, shadows)
  /typography.css   — Text style classes
  /components.css   — Component-level styles
  /globals.css      — Base reset & utilities
```

### Supabase Client Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

---

## 3. Supabase Backend — Tables, RPCs & RLS

### 3.1 Complete Table Directory (17 Tables)

#### Catalog & Plans

**`subscription_plans`** — Read-only catalog of available plan tiers.
```sql
id             uuid PK
name           text UNIQUE         -- 'Free Trial', 'Starter', 'Pro', 'Enterprise'
tier_rank      int UNIQUE          -- 0=Trial, 1=Starter, 2=Pro, 3=Enterprise
max_businesses int
max_branches   int
max_devices    int
max_staff      int
cross_branch_reports bool
shared_members bool
is_free_tier   bool
trial_days     int
price_label    text
created_at     timestamptz
```

**`modules`** — Feature module catalog.
```sql
id           uuid PK
key          text UNIQUE   -- 'members', 'pos', 'classes', 'inventory', 'payroll'
display_name text
icon         text
description  text
is_core      bool
sort_order   int
```

#### Multi-Tenant Core

**`accounts`** — One record per owner tenant, linked 1:1 to auth.users.
```sql
id         uuid PK  REFERENCES auth.users ON DELETE CASCADE
full_name  text
email      text UNIQUE
phone      text
is_active  bool
created_at timestamptz
updated_at timestamptz
```

**`account_subscriptions`** — Active billing/license record per account.
```sql
id                  uuid PK
account_id          uuid FK → accounts
plan_id             uuid FK → subscription_plans
status              text          -- 'active', 'trial', 'expired', 'grace'
is_lifetime         bool          -- true for cash voucher customers
trial_ends_at       timestamptz
current_period_end  timestamptz
grace_ends_at       timestamptz
activated_by_voucher uuid FK → license_vouchers (nullable)
created_at          timestamptz
updated_at          timestamptz
```

**`businesses`** — Brand/company entity under an account.
```sql
id           uuid PK
account_id   uuid FK → accounts
category     text NOT NULL DEFAULT 'pos_inventory'
              -- Valid values: 'pos_inventory', 'appointment_service',
              --   'membership_session', 'project_milestone',
              --   'rental_booking', 'education_cohort'
name         text
display_name text
address      text
phone        text
logo_url     text
is_active    bool
created_at   timestamptz
updated_at   timestamptz
```

**`branches`** — Physical locations under a business.
```sql
id             uuid PK
account_id     uuid FK → accounts
business_id    uuid FK → businesses
name           text
code           text
address        text
phone          text
is_main_branch bool
is_active      bool
created_at     timestamptz
updated_at     timestamptz
```

**`devices`** — Authorized POS terminals.
```sql
id           uuid PK
account_id   uuid FK → accounts
branch_id    uuid FK → branches
hardware_id  text UNIQUE
label        text
is_active    bool
last_seen_at timestamptz
registered_at timestamptz
```

**`license_vouchers`** — Cash voucher codes (ATR-PLAN-LIFE-XXXX-XXXX).
```sql
id                    uuid PK
code                  text UNIQUE
plan_id               uuid FK → subscription_plans
duration_months       int   -- 0 = lifetime perpetual
is_redeemed           bool
redeemed_by_account_id uuid FK → accounts (nullable)
redeemed_at           timestamptz (nullable)
created_by_note       text
created_at            timestamptz
```

**`account_audit_logs`** — Security event trail.
```sql
id         uuid PK
account_id uuid FK → accounts
event_type text
actor_id   uuid
metadata   jsonb
ip_address text
created_at timestamptz
```

#### Observability

**`branch_modules`** — Toggle active modules per branch.
```sql
id         uuid PK
branch_id  uuid FK → branches
module_id  uuid FK → modules
is_enabled bool
enabled_at timestamptz
```

**`branch_sync_logs`** — Desktop sync checkpoints (web app reads only).
```sql
id             uuid PK
branch_id      uuid FK → branches
direction      text  -- 'push' | 'pull'
status         text
records_synced int
error_message  text
synced_at      timestamptz
```

**`device_heartbeats`** — Desktop device telemetry.
```sql
id             uuid PK
device_id      uuid FK → devices
client_version text
os_info        text
ping_at        timestamptz
```

**`system_notifications`** — In-app alerts for tenants.
```sql
id         uuid PK
account_id uuid FK → accounts
title      text
message    text
type       text  -- 'warning' | 'info' | 'alert'
is_read    bool
created_at timestamptz
```

#### Staff & Roles

**`staff`** — Team members with role-based access.
```sql
id           uuid PK
account_id   uuid FK → accounts
auth_user_id uuid REFERENCES auth.users (nullable — for staff with login)
full_name    text
email        text
phone        text
role         staff_role_enum  -- 'owner','manager','cashier','technician','waiter','staff'
pin_hash     text
is_active    bool
created_at   timestamptz
updated_at   timestamptz
```

**`staff_branch_assignments`** — Which branches a staff member is assigned to.
```sql
id         uuid PK
staff_id   uuid FK → staff
branch_id  uuid FK → branches
is_primary bool
created_at timestamptz
```

**`staff_module_permissions`** — Granular per-module access overrides.
```sql
id         uuid PK
staff_id   uuid FK → staff
branch_id  uuid FK → branches
module_id  uuid FK → modules
can_view   bool
can_edit   bool
can_delete bool
granted_at timestamptz
```

#### Customers & Admissions

**`members_directory`** — Customer/member directory (cloud-synced from desktop).
```sql
id         uuid PK
account_id uuid FK → accounts
branch_id  uuid FK → branches
full_name  text
email      text
phone      text
rfid_tag   text
barcode    text
is_active  bool
created_at timestamptz
```

**`registrations`** — Operational admission records (check-ins, payments).
```sql
id         uuid PK
account_id uuid FK → accounts
branch_id  uuid FK → branches
member_id  uuid FK → members_directory (nullable)
type       text
amount_paid numeric
created_at timestamptz
```

**`registration_requests`** — Self-service web form submissions awaiting review.
```sql
id           uuid PK
account_id   uuid FK → accounts
branch_id    uuid FK → branches
payload      jsonb   -- flexible per-category lead data
status       text    -- 'pending', 'approved', 'declined'
requested_at timestamptz
processed_at timestamptz (nullable)
```

---

### 3.2 Stored RPC Functions (14 Functions)

All RPCs are `SECURITY DEFINER` and run with `SET search_path = public, pg_temp`. Always call via `supabase.rpc('function_name', params)`.

#### RPC 1: `check_device_registration(p_hardware_id text)`
- **Use**: Desktop-only boot check. Web app does not need this.
- **Returns**: `{ status, device_id, account_id, branch_id, business_id }`

#### RPC 2: `check_subscription_status(p_hardware_id text)`
- **Use**: Desktop-only license check. Web app uses `account_subscriptions` table with RLS instead.
- **Returns**: `{ status, plan_rank, days_remaining, cross_branch_reports, shared_members }`

#### RPC 3: `onboard_owner_account(...)` ⭐ KEY FOR WEB ONBOARDING
- **Use**: Called once during new owner registration to bootstrap the entire tenant.
- **Parameters**:
  ```typescript
  {
    p_owner_id: string,        // UUID from auth.uid()
    p_full_name: string,
    p_email: string,
    p_business_name: string,
    p_branch_name: string,
    p_category: string,        // e.g. 'membership_session'
    p_hardware_id?: string,    // null for web
    p_device_label?: string,   // 'Web App'
    p_voucher_code?: string,   // null = free trial
    p_modules?: string[]       // null = defaults
  }
  ```
- **Returns**: `{ success: true, account_id, business_id, branch_id, device_id, plan_status, is_lifetime, tier_rank, plan_name }`
- **GRANT**: `anon`, `authenticated`, `service_role`

#### RPC 4: `redeem_license_voucher(p_account_id uuid, p_voucher_code text)`
- **Use**: Called from Settings > License to activate a prepaid lifetime code.
- **Returns**: `{ success: true, plan, message }`
- **GRANT**: `authenticated`, `service_role`

#### RPC 5: `admin_activate_account(p_email, p_tier_rank, p_admin_secret, p_notes)`
- **Use**: Super-admin manual upgrade. Not exposed in user UI.

#### RPC 6: `register_device(p_account_id, p_branch_id, p_hardware_id, p_label)`
- **Use**: Called from Settings > Devices to authorize a new PC.
- **Quota**: Enforces `subscription_plans.max_devices`. Returns `DEVICE_LIMIT_REACHED` error if exceeded.

#### RPC 7: `revoke_device(p_device_id, p_account_id)`
- **Use**: Called from Settings > Devices to deactivate a PC.

#### RPC 8: `get_staff_context(p_account_id, p_staff_id)`
- **Use**: Load a staff member's full profile with branches and permissions.
- **Returns**: `{ staff_profile, branches: [], permissions: [] }`

#### RPC 9: `generate_license_vouchers(p_tier_rank, p_count, p_admin_secret, p_notes)`
- **Use**: Admin-only. Generates ATR-PLAN-LIFE-XXXX-XXXX codes.

#### RPC 10: `create_business(p_account_id, p_name, p_category, p_address, p_phone)`
- **Use**: Add a second business under the same account (Pro/Enterprise plan).
- **Quota**: Enforces `max_businesses`. Returns error if exceeded.

#### RPC 11: `create_branch(p_account_id, p_business_id, p_name, p_address, p_phone)`
- **Use**: Add a branch to an existing business.
- **Quota**: Enforces `max_branches`. Auto-enables core modules on the new branch.

#### RPC 12: `get_staff_profiles(p_email text)` [PATCH v1.2]
- **Use**: Recover staff list by email for new device setup.
- **Returns**: `jsonb[]` of staff with integer role mapping:
  - `'owner'` → `8`, `'manager'` → `1`, `'cashier'` → `2`, `'technician'` → `3`, `'waiter'` → `4`, `'staff'`/other → `7`

#### RPC 13: `get_tenant_facilities(p_tenant_id uuid)` [PATCH v1.2]
- **Use**: Get all active branches with their business category for a tenant.
- **Category → Integer mapping**:
  - `'membership_session'` / `'gym'` → `1`
  - `'appointment_service'` / `'salon'` → `5`
  - `'pos_inventory'` / `'restaurant'` → `6`
  - fallback → `1`

#### RPC 14: `get_staff_for_sync(p_account_id, p_updated_after?, p_facility_id?)` [PATCH v1.3]
- **Use**: Pull staff records for sync. Web app can use this to load staff list.
- **Filtering**: By account, incremental cutoff timestamp, and optional branch scope.

---

### 3.3 Row-Level Security Rules

**Helper function**: `get_auth_account_id()` — Resolves the tenant UUID from either `public.accounts` (owners) or `public.staff` (staff members with auth).

**Standard tenant filter** (applied to most tables):
```sql
USING (account_id = get_auth_account_id())
WITH CHECK (account_id = get_auth_account_id())
```

**Branch-level filter** (for branch-scoped tables):
```sql
USING (branch_id IN (
  SELECT id FROM public.branches WHERE account_id = get_auth_account_id()
))
```

**Public catalogs** (`subscription_plans`, `modules`): `USING (true)` — any anonymous user can read.

**Web App Implication**: Always use the Supabase client with a valid JWT. Never bypass RLS by using the service role key on the client side. Only use service role in server-side API routes when necessary.

---

## 4. License & Subscription System

### 4.1 Plan Tiers

| Tier Rank | Name | Key Features |
|---|---|---|
| 0 | Free Trial | Limited to 1 business, 1 branch, 1 device, 3 staff. 30-day trial. |
| 1 | Starter | 1 business, 2 branches, 2 devices, 10 staff |
| 2 | Pro | 3 businesses, 5 branches, 5 devices, unlimited staff, cross-branch reports |
| 3 | Enterprise | Unlimited businesses, unlimited branches, unlimited devices, shared members |

### 4.2 Voucher Code Format

Format: `ATR-{TIER}-LIFE-{XXXX}-{XXXX}` where TIER is the plan abbreviation (e.g., `ATR-PRO-LIFE-A4B2-C9D1`).

These are **perpetual lifetime codes** — once redeemed, the subscription never expires. This is the primary monetization model (cash payment at point of sale).

### 4.3 License Status Calculation (Web App)

```typescript
interface LicenseStatus {
  isLifetime: boolean
  isActive: boolean
  planRank: number          // 0-3
  planName: string
  daysRemaining: number     // -1 = infinite (lifetime)
  crossBranchReports: boolean
  sharedMembers: boolean
}

async function getLicenseStatus(accountId: string): Promise<LicenseStatus> {
  const { data } = await supabase
    .from('account_subscriptions')
    .select(`
      status, is_lifetime, trial_ends_at, current_period_end, grace_ends_at,
      subscription_plans(tier_rank, name, cross_branch_reports, shared_members)
    `)
    .eq('account_id', accountId)
    .single()
}
```

### 4.4 Quota Enforcement

Before creating a business, branch, device, or staff member, check the current count against `subscription_plans.max_*`. The RPCs (`create_business`, `create_branch`, `register_device`) do this server-side and return error codes. Always surface quota errors clearly:

```typescript
// UI quota limit warning component
<QuotaLimitBanner 
  resource="branches" 
  current={3} 
  max={planLimits.max_branches}
  onUpgrade={() => router.push('/settings/license')}
/>
```

---

## 5. Business Categories (Verticals)

Atrium supports **6 business archetypes**. The `businesses.category` column stores the text key. The UI adapts terminology, navigation, and feature modules per category.

| Category Key | Display Name | Examples | FacilityType Int |
|---|---|---|---|
| `membership_session` | Gym & Fitness | Gyms, Martial Arts, Sports Clubs | 1 |
| `appointment_service` | Salon & Beauty | Salons, Spas, Barbershops, Clinics | 5 |
| `pos_inventory` | Restaurant & Retail | Restaurants, Retail, Pharmacy, Café | 6 |
| `project_milestone` | Projects & Agency | Architecture, Law, Creative Agencies | 13 |
| `rental_booking` | Rentals & Venue | Coworking, Event Venues, Equipment | 14 |
| `education_cohort` | Education & Training | Schools, Bootcamps, Academies | 15 |

### Category-Specific Terminology

Each category has its own terminology set (3 languages). The web app must load terminology dynamically based on the selected branch's business category.

```typescript
// Terminology loading pattern
const terminology = {
  membership_session: {
    members: { en: 'Members', fr: 'Membres', ar: 'الأعضاء' },
    registration: { en: 'Registration', fr: 'Inscription', ar: 'التسجيل' },
    plan: { en: 'Membership Plan', fr: 'Forfait', ar: 'خطة العضوية' },
  },
  appointment_service: {
    members: { en: 'Clients', fr: 'Clients', ar: 'العملاء' },
    registration: { en: 'Appointment', fr: 'Rendez-vous', ar: 'الموعد' },
    plan: { en: 'Service Package', fr: 'Forfait Service', ar: 'باقة الخدمة' },
  },
  pos_inventory: {
    members: { en: 'Customers', fr: 'Clients', ar: 'العملاء' },
    registration: { en: 'Order', fr: 'Commande', ar: 'الطلب' },
    plan: { en: 'Product', fr: 'Produit', ar: 'منتج' },
  },
}
```

### Navigation Per Category

| Module | membership_session | appointment_service | pos_inventory | project_milestone |
|---|---|---|---|---|
| Members | ✅ Members | ✅ Clients | ✅ Customers | ✅ Contacts |
| Registration | ✅ Sign-ups | ✅ Appointments | ✅ Orders | ✅ Project Requests |
| Shop / POS | ✅ Supplements | ✅ Products | ✅ Full POS | ❌ |
| Scheduler | ✅ Classes | ✅ Calendar | ❌ | ✅ Timeline |
| Finance | ✅ | ✅ | ✅ | ✅ |
| Projects | ❌ | ❌ | ❌ | ✅ Projects |

---

## 6. Domain Data Models

### 6.1 Member

```typescript
interface Member {
  id: string                    // UUID v7 (time-ordered)
  tenantId: string              // account_id
  facilityId: string            // branch_id
  fullName: string
  email: string
  phoneNumber: string
  profileImageUrl?: string
  cardId?: string               // RFID/Barcode
  status: MemberStatus
  startDate: Date
  expirationDate: Date
  membershipPlanId?: string
  remainingSessions: number
  dateOfBirth?: Date
  gender: Gender
  source?: string               // 'Walk-in', 'Instagram', 'Referral', etc.
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  segmentDataJson: string       // JSON blob for category-specific metadata
  createdAt: Date
  updatedAt: Date
}

type MemberStatus = 
  | 'Unknown'    // 0
  | 'Active'     // 1
  | 'Expired'    // 2
  | 'Frozen'     // 3
  | 'Suspended'  // 4
  | 'Pending'    // 5
  | 'Banned'     // 6
  | 'Lead'       // 7

type Gender = 'Male' | 'Female' | 'Other'
```

---

## 7. Design System — Colors, Typography, Spacing

### 7.1 Color System

The Atrium design system uses a **Terracotta + Dark Espresso Sidebar** language. There is a **Light Mode** and a **Dark Mode**. The Sidebar is **always dark** regardless of theme.

#### Brand Accent — Terracotta (All categories share this)

```css
--color-accent: #C4785A;          /* Primary brand accent */
--color-accent-dim: rgba(196, 120, 90, 0.15); /* Accent tint for hover states, selected rows */
--color-accent-shadow: #8C3D28;   /* Deep accent for gradients */
--color-accent-light: #FCEFEA;    /* Very light tint for badge backgrounds */
--color-accent-gradient-start: #C4785A;
--color-accent-gradient-end: #D96B43;
```

---

## 8. Component Library

1. Buttons (Primary, Secondary, Ghost, Icon, Danger)
2. Filter Pills (Apple Capsule Style)
3. Search Box (Rounded 18px, Icon inset)
4. Data Table (72px comfortable row height, flex avatar + stack)
5. Cards (Grid view, 20px radius)
6. Avatar Component (Deterministic pastel color palette by initial)
7. Status Badge (Colored dot + pill background)
8. Slide-In Detail Panel (390px fixed width, slide from right)
9. Segmented View Switcher (List vs Grid)
10. KPI Stat Tiles

---

## 9. Screen Architecture & Navigation

Every page follows the 3-row layout:
- Row 0: Screen Header (Icon + Title + Subtitle + Primary Action)
- Row 1: Filter Bar (Pills + Search + Export + View toggle)
- Row 2: Content (List/Grid + Slide-in Detail Panel)

---

## 10. Membership Category — Template Screens (Reference Implementation)

- Members List Screen (`/members`)
- Member Detail Panel (Slide-In 390px)
- Create/Edit Member Modal
- Registrations Screen (`/registrations`) with Approval workflow

---

## 11. Authentication & Onboarding Flow

- Sign In Screen
- New Owner Onboarding (Account → Business & Category → License/Trial → Launch)
- Staff Sign In (with PIN and role permissions)

---

## 12. Localization (3 Languages)

- English (`en`), French (`fr`), Arabic (`ar` with RTL)
- Dynamic terminology dictionary per vertical and language

---

## 13. Roles & Permissions

- Owner (Full Access)
- Manager (Operational Access)
- Cashier (POS only)
- Staff (Limited read)

---

## 14. API Layer Guidelines & 15. Offline Strategy

- Scoped queries with `account_id` and `branch_id`
- Realtime channels
- Optimistic cache updates
- Quota alerts and banners
