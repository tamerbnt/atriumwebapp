# Data Traceability Architecture & Supabase Schema Audit: Quadruple-Key Standard (`account_id`, `business_id`, `branch_id`, `staff_id`)

An exhaustive architectural audit and non-destructive schema migration plan across all 7 business verticals and 28+ screens in Atrium ERP & CRM, enforcing strict accountability and data lineage for every record.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive consultation and govern this audit:

- **Staff Attribution Fallback**: Records created outside a direct staff PIN session (e.g., self-service admissions, public client bookings, or automated batch migrations) will have `staff_id` configured as nullable with automatic fallback attribution to the active branch manager or account owner.
- **Migration Methodology**: Migration will execute via **non-destructive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** queries coupled with deterministic SQL backfill routines joining `branches.business_id` and `businesses.account_id`, avoiding data loss or downtime.
- **Unified TypeScript Model**: All frontend interfaces, state stores, and Supabase client mappers will deprecate ambiguous legacy keys (`tenantId`, `facilityId`) and standardize on the explicit quadruple: `accountId`, `businessId`, `branchId`, and `staffId`.

---

## 1. Overview & Audit Summary

Atrium operates as an enterprise multi-tenant, multi-vertical operating system supporting 7 distinct industry domains:
1. **Gym & Fitness** (`membership_session`)
2. **Salon & Beauty** (`appointment_service`)
3. **Retail & Restaurant POS** (`pos_inventory`)
4. **Project & Agency 6-Roles** (`project_milestone`)
5. **Venue & Rental Spaces** (`rental_booking`)
6. **Education & Academies** (`education_cohort`)
7. **Freelancer & Solo Studio** (`freelance_solo`)

### The Quadruple Traceability Requirement
To guarantee audit compliance, regulatory accountability (e.g. Algerian CCP financial slips, tax invoicing, security deposits, payroll audits), and multi-branch data isolation, **every table must carry four universal tracking columns**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   UNIVERSAL TRACEABILITY QUADRUPLE                     │
├─────────────────────────┬──────────────────────────────────────────────┤
│ 1. account_id (UUID)    │ Organization root / primary tenant owner     │
│ 2. business_id (UUID)   │ Specific commercial venture / vertical brand │
│ 3. branch_id (UUID)     │ Physical site, facility, campus, or studio   │
│ 4. staff_id (UUID NULL) │ Operator, manager, teacher, or cashier       │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Table-by-Table Audit & Deficit Matrix

The following comprehensive matrix reveals the exact status of each table in `supabase_schema.sql`, `supabase_project_milestone.sql`, and application state:

| Category / Vertical | Database Table Name | Current Columns | Missing Required Columns | Audit Findings & Required Remediation |
|---|---|---|---|---|
| **Core Tenancy** | `public.businesses` | `id`, `account_id`, `name`, `category` | None | Root brand entity. Valid. |
| **Core Tenancy** | `public.branches` | `id`, `account_id`, `business_id`, `name` | None | Physical location. Valid. |
| **Core Tenancy** | `public.devices` | `id`, `account_id`, `branch_id`, `hardware_id` | `business_id` | Missing direct brand lineage. Add `business_id`. |
| **Core Tenancy** | `public.staff` | `id`, `account_id`, `full_name`, `role` | `business_id`, `branch_id` | Staff currently unassigned to specific branch/business. Add both. |
| **Gym & Fitness** | `public.members_directory` | `id`, `account_id`, `branch_id`, `full_name` | `business_id`, `staff_id` | Missing brand link & registration agent attribution. Add both. |
| **Gym & Fitness** | `public.registration_requests` | `id`, `account_id`, `branch_id`, `payload` | `business_id`, `staff_id` | Missing business context and processor staff ID. Add both. |
| **Salon & Spa** | `public.appointments` | `id`, `account_id`, `branch_id`, `staff_id (text)` | `business_id`, `staff_id (uuid fk)` | `staff_id` is raw text; convert to relational UUID FK + add `business_id`. |
| **Retail POS** | `public.products` | `id`, `account_id`, `branch_id`, `name` | `business_id`, `staff_id` | Missing creator/inventory manager attribution and `business_id`. |
| **Retail POS** | `public.sales` | `id`, `account_id`, `branch_id`, `total_amount` | `business_id`, `staff_id` | Critical: sales must record the cashier `staff_id` who rang up the order. |
| **Freelance** | `public.freelance_clients` | `id`, `account_id`, `branch_id`, `name` | `business_id`, `staff_id` | Solo accounts need `business_id` and creator `staff_id`. |
| **Freelance** | `public.freelance_projects` | `id`, `account_id`, `branch_id`, `title` | `business_id`, `staff_id` | Missing `business_id` and `staff_id`. |
| **Freelance** | `public.freelance_time_logs` | `id`, `account_id`, `branch_id`, `duration_seconds` | `business_id`, `staff_id` | Critical for billing disputes: who logged the time. Add both. |
| **Freelance** | `public.freelance_invoices` | `id`, `account_id`, `branch_id`, `invoice_number` | `business_id`, `staff_id` | Invoices must identify the issuer staff/owner and `business_id`. |
| **Freelance** | `public.freelance_proposals` | `id`, `account_id`, `branch_id`, `title` | `business_id`, `staff_id` | Missing `business_id` and `staff_id`. |
| **Freelance** | `public.freelance_expenses` | `id`, `account_id`, `branch_id`, `amount` | `business_id`, `staff_id` | Tax deductor staff member missing. Add both. |
| **Venue & Rentals** | `public.rentable_units` | `id`, `account_id`, `branch_id`, `name` | `business_id`, `staff_id` | Missing inventory creator and `business_id`. |
| **Venue & Rentals** | `public.rental_renters` | `id`, `account_id`, `branch_id`, `full_name` | `business_id`, `staff_id` | Missing onboarding staff member and `business_id`. |
| **Venue & Rentals** | `public.rental_bookings` | `id`, `account_id`, `branch_id`, `unit_id` | `business_id`, `staff_id` | Contract booking agent missing. Add both. |
| **Venue & Rentals** | `public.security_deposits` | `id`, `account_id`, `branch_id`, `amount` | `business_id`, `staff_id` | High financial audit risk: who held or refunded the deposit. Add both. |
| **Project & Agency** | `public.pm_clients` | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Legacy text IDs must be migrated to standard UUID relational FKs. |
| **Project & Agency** | `public.pm_projects` | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Migrate text columns to UUIDs; track creating Project Manager. |
| **Project & Agency** | `public.pm_print_orders` | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Print orders must record Chef de Projet creator. |
| **Project & Agency** | `public.pm_bat_deliverables` | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Track Creative Studio artist who uploaded BAT proof. |
| **Project & Agency** | `public.pm_talent_pool` | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Track RH officer who registered talent/animator. |
| **Project & Agency** | `public.pm_field_attendance`| `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Track Terrain Supervisor who conducted roll call. |
| **Project & Agency** | `public.pm_field_expenses`  | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Track Field Agent declaring emergency fuel/supplies. |
| **Project & Agency** | `public.pm_ccp_slips`       | `id`, `tenant_id (text)`, `facility_id (text)` | `account_id`, `business_id`, `branch_id`, `staff_id` | Track Accountant who generated Algerian Postal SFP 01 slip. |
| **Education** | `public.education_students` | *Store-only (No SQL Table yet)* | `account_id`, `business_id`, `branch_id`, `staff_id` | Create PostgreSQL table with full Quadruple Keys. |
| **Education** | `public.education_cohorts`  | *Store-only (No SQL Table yet)* | `account_id`, `business_id`, `branch_id`, `staff_id` | Create PostgreSQL table with full Quadruple Keys. |
| **Education** | `public.education_attendance`| *Store-only (No SQL Table yet)* | `account_id`, `business_id`, `branch_id`, `staff_id` | Create table to record teacher taking attendance. |
| **Education** | `public.education_invoices`  | *Store-only (No SQL Table yet)* | `account_id`, `business_id`, `branch_id`, `staff_id` | Create table for tuition fees and payment receipts. |

---

## 3. Screen-by-Screen User Flow & Form Action Traceability

Every screen in the application will inject the current active context into all create/update mutations:

```
┌────────────────────────────────────────────────────────────┐
│                    GLOBAL SESSION STATE                    │
│   Account ID    : useAtriumStore.getState().currentAccount │
│   Business ID   : useAtriumStore.getState().currentBusiness│
│   Branch ID     : useAtriumStore.getState().currentBranch  │
│   Active Staff  : useAtriumStore.getState().currentUser    │
└──────────────────────────────┬─────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     FRONTEND UI       │             │   SUPABASE DATABASE   │
│ Screen Form / Action  │────Insert──▶│ Row Level Security    │
│  - New Member Modal   │             │ Enforces Quadruple    │
│  - POS Checkout Cart  │             │ Composite Indexes     │
│  - BAT Proof Upload   │             │ Multi-tenant Filter   │
│  - CCP Slip Stamp     │             └───────────────────────┘
│  - Roll Call Register │
└───────────────────────┘
```

### Detailed Screen Traceability Mappings:
1. **Gym / Salon / POS (Screens 1 to 8)**:
   - `MembersScreen`: `MemberModal` binds `accountId`, `businessId`, `branchId`, `staffId` (logged-in receptionist).
   - `ShopScreen`: Checkout slip writes `sales` record capturing cashier `staffId`, active `branchId`, and `businessId`.
   - `SchedulerScreen`: Bookings attach stylist `staff_id` plus booking agent `created_by_staff_id`.
   - `RegistrationsScreen`: Inbound public leads record `accountId`, `businessId`, `branchId`, and `processed_by_staff_id`.
2. **Venue Management (Venue Screens 1 to 6)**:
   - `BookingModal`: Generates `rental_bookings` and `security_deposits` stamped with front-desk staff ID.
   - `VenueRentersView`: Renter CRM entries tagged with onboarding agent.
   - `VenueInventoryView`: Space/hall configuration stamped with facility manager.
3. **Project & Agency (6 Roles / 21 Screens)**:
   - `ProjectDirectionView`: New projects stamped with Direction staff ID (`account_id`, `business_id`, `branch_id`).
   - `ProjectChefProjetView`: Collateral orders and BAT handoffs stamped with CDP staff ID.
   - `ProjectCreaView`: Artwork proof uploads stamped with Lead Creative staff ID.
   - `ProjectSuperviseurView`: GPS field attendance roll call and emergency terrain expenses stamped with Supervisor staff ID.
   - `ProjectRhView`: Talent onboarding dossiers stamped with HR staff ID.
   - `ProjectComptaView`: CCP SFP 01 slips and validation stamps stamped with Accountant staff ID.
4. **Education & Academies (Education Screens 1 to 8)**:
   - `RollCallModal`: Roll call registers teacher `staffId`, cohort, room, and branch.
   - `EducationAdmissionsView`: Lead conversion tags registrar `staffId`.
   - `CertificateModal`: Issued diplomas and attestations cryptographically signed with academy director staff ID.

---

## 4. Supabase SQL Migration Blueprint

The planned migration script applies changes without breaking existing data:

### Phase A: Core Tenancy Upgrades
```sql
-- 1. Staff assignment to branches
ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- 2. POS Devices brand linkage
ALTER TABLE public.devices 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
```

### Phase B: Vertical Table Enrichments
```sql
-- Members Directory
ALTER TABLE public.members_directory 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Products & POS Sales
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Venue & Rentals
ALTER TABLE public.rentable_units 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.rental_bookings 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.security_deposits 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Freelance Suite
ALTER TABLE public.freelance_clients 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.freelance_projects 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.freelance_time_logs 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

ALTER TABLE public.freelance_invoices 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;
```

### Phase C: Automatic Historical Data Backfill
```sql
-- Automatically backfill business_id from parent branches table
UPDATE public.members_directory m
SET business_id = b.business_id
FROM public.branches b
WHERE m.branch_id = b.id AND m.business_id IS NULL;

UPDATE public.products p
SET business_id = b.business_id
FROM public.branches b
WHERE p.branch_id = b.id AND p.business_id IS NULL;

UPDATE public.sales s
SET business_id = b.business_id
FROM public.branches b
WHERE s.branch_id = b.id AND s.business_id IS NULL;

UPDATE public.rental_bookings rb
SET business_id = b.business_id
FROM public.branches b
WHERE rb.branch_id = b.id AND rb.business_id IS NULL;

UPDATE public.freelance_clients fc
SET business_id = b.business_id
FROM public.branches b
WHERE fc.branch_id = b.id AND fc.business_id IS NULL;
```

### Phase D: Dedicated Education SQL Tables
```sql
CREATE TABLE IF NOT EXISTS public.education_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'Enrolled',
  cohort_id text,
  cohort_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  program text NOT NULL,
  teacher_name text NOT NULL,
  capacity int NOT NULL DEFAULT 20,
  enrolled_count int NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Technical Implementation Steps

1. **Schema Migration Script (`supabase_schema.sql` & `supabase_project_milestone.sql`)**:
   - Add all missing columns and foreign key constraints non-destructively.
   - Include deterministic backfill queries.
   - Add composite indexes `(account_id, business_id, branch_id)` for sub-millisecond query performance.
2. **TypeScript Types Modernization (`src/types/index.ts` & `src/lib/supabase/types.ts`)**:
   - Update interfaces (`Member`, `Product`, `Sale`, `Appointment`, `RentalBooking`, `FreelanceClient`, `EducationStudent`, `PmProject`, etc.) with `accountId`, `businessId`, `branchId`, `staffId`.
   - Update Database type definitions to include new columns.
3. **Database Mappers & Service Layer (`src/lib/supabase/mappers.ts` & services)**:
   - Ensure all Supabase service insert/upsert payloads inject the 4 IDs from active store context.
   - Fall back to the current logged-in staff member or account owner if `staff_id` is omitted.
4. **App Store State Integration (`src/services/store.ts`)**:
   - Verify that all entity creation helpers (`addMember`, `addSale`, `addBooking`, `addEducationStudent`, `addPmProject`) automatically populate `accountId`, `businessId`, `branchId`, and `staffId`.

---

## 6. Verification & Validation Protocol

- **Schema Check**: Validate syntax of SQL migration script and verify idempotency (`IF NOT EXISTS` / duplicate column handlers).
- **TypeScript Compilation**: Run `compile_applet` and `lint_applet` to confirm 0 type errors across all screen components and Supabase services.
- **Unit & Logic Tests**: Verify `npm test` passes all rules, voucher checks, and business calculations.
- **Zero Interruption**: Confirm UI behavior and offline demo data modes remain 100% operational.
