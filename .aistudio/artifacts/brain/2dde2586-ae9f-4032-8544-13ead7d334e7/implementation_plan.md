# Atrium ERP & CRM — Complete Multi-Vertical Platform Implementation Plan

Atrium is an enterprise-grade, multi-tenant, multi-category business management platform. The web version faithfully replicates the desktop C# .NET WPF DDD/CQRS architecture across all 6 business verticals, providing dynamic category-adaptive navigation, multi-branch management, POS shop, staff payroll, scheduling, and perpetual lifetime voucher licensing.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Scope Confirmation**: This implementation plan covers the **ENTIRE multi-category platform**, not just a single category.
>
> - **All 6 Business Verticals Included**:
>   1. `membership_session`: Gym & Fitness (Members, Classes, Session Tracking, Plans)
>   2. `appointment_service`: Salon & Beauty (Clients, Appointments, Service Packages, Stylists)
>   3. `pos_inventory`: Restaurant & Retail (Customers, Table Orders, Full POS Register, Stock)
>   4. `project_milestone`: Projects & Agency (Contacts, Project Milestones, Inquiries, Retainers)
>   5. `rental_booking`: Rentals & Venue (Renters, Occupancy Timeline, Booking Requests, Assets)
>   6. `education_cohort`: Education & Training (Students, Cohorts, Enrollments, Tuitions)
> - **Dynamic Facility Switching**: Users can switch seamlessly between branches and business types from the top of the sidebar. The UI, terminology, active modules, and data immediately adapt to the selected vertical.
> - **Canonical Reference Implementation**: As specified in the specification document, the Gym & Fitness vertical serves as the reference template with preloaded active data, while Salon, Restaurant, and other facilities are fully switchable with their dedicated workflows.
> - **All 8 Modules Built**: Dashboard, Members/Clients Directory, Registrations Pipeline, POS Shop, Scheduler/Calendar, Finance & Staff, Transaction History, and Settings/Licensing.

---

## 1. Overview & Core Concept

- **What It Does**: Atrium Web delivers an end-to-end ERP & CRM operational suite. It allows business owners to manage multiple brands and physical locations under a single account, switch between different business archetypes with customized workflows, process POS sales, oversee staff roles and payroll, and redeem lifetime cash vouchers (`ATR-PLAN-LIFE-XXXX-XXXX`).
- **Target Audience & Roles**:
  - *Business Owners (Role 8)*: Multi-facility dashboard, branch creation, quota monitoring, license upgrades, cross-branch reports.
  - *Managers (Role 1)*: Member approvals, staff assignments, inventory reorders, schedule publishing.
  - *Cashiers & Service Staff (Roles 2, 3, 4, 7)*: Rapid check-in/lookup, POS register sales, appointment check-ins.
- **Key Value**: A single unified web application that replaces disparate software systems across diverse industries while maintaining DDD cleanliness and an Apple Spatial aesthetic.

---

## 2. User Experience & Visual Design

### 2.1 The Apple Spatial & Terracotta Design Language
- **Dual Surface Canvas**:
  - *Light Mode (Default)*: Warm Parchment (`#F0E7D5`) canvas with crisp warm card surfaces (`#FAF8F4`), subtle border strokes (`#DDD4BE`), and high-contrast typography (`#1A1A1A`).
  - *Dark Mode*: Deep Espresso (`#1A1712`) with dark espresso cards (`#231F19`) and border strokes (`#3E3E3E`).
  - *Sidebar (Both Modes)*: Obsidian dark espresso (`#1F1D1B`) with warm subtle hover highlights (`#2A2623`).
- **Brand Accent**: Terracotta (`#C4785A`) with translucent interactive tints (`rgba(196, 120, 90, 0.15)`).
- **Zero-Pill Metadata Discipline**: Unboxed metadata text with quiet `·` separators; clean segmented capsule buttons reserved strictly for interactive filters.
- **Tabular Figures**: Enforced `font-variant-numeric: tabular-nums` for all currencies (`DZD`, `USD`, `EUR`), dates, countdowns, and counters.

### 2.2 Screen Architecture & Standard 3-Row Layout
Every module screen follows this exact structure:
```
┌────────────────────────────────────────────────────────────────────────┐
│ Row 0: Screen Header (Tile Icon + Title + Subtitle + Primary Action)   │
├────────────────────────────────────────────────────────────────────────┤
│ Row 1: Filter Bar (Status Pills + Search Input + Filters + View Mode)  │
├────────────────────────────────────────────────────────────────────────┤
│ Row 2: Master Content (72px Table Rows or Cards) + 390px Detail Panel  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Comprehensive Module Map

| Module | Route | Functionality Across Verticals |
|---|---|---|
| **Dashboard** | `/dashboard` | Live KPI stat tiles (Total Customers, Active, Revenue, New Leads), occupancy/traffic graphs, quick actions. |
| **Members / Directory** | `/members` | Adaptable directory (Members / Clients / Customers / Contacts / Students) with search, RFID lookup, status pills, and 390px slide-in detail panel. |
| **Registrations / Leads** | `/registrations` | Lead capture pipeline (Sign-ups, Appointments, Inquiries) with 1-click conversion to active members. |
| **Shop & POS** | `/shop` | Product catalog, grid view, category filters, quick barcode/SKU search, live cart with cash/card/balance tender, receipt generation. |
| **Scheduler** | `/scheduler` | Interactive calendar and timeline: Class timetable (Gym), Service bookings (Salon), Table reservations (Restaurant), Milestone timeline (Projects). |
| **Finance & Staff** | `/finance` | Staff directory, role ranks (1-25), salary ledger, payment day tracker, module permissions matrix. |
| **History** | `/history` | Transaction audit trail, admission check-in logs, POS sales receipts, filterable by date and branch. |
| **Settings & Licensing** | `/settings` | Account profile, Multi-Business & Branch manager, Device authorization, and Lifetime Voucher redemption (`ATR-PLAN-LIFE-XXXX-XXXX`). |

### 2.4 Localization (EN / FR / AR + RTL)
- Instant language switching across English, French, and Arabic.
- Full right-to-left layout inversion (`dir="rtl"`): sidebar docks right, table columns invert, and the 390px inspector smoothly enters from the left.

---

## 3. Key Product Decisions & Trade-Offs

- **Whole-App Multi-Vertical Architecture vs. Single-Category Silo**:
  - *Decision*: Build the unified multi-tenant multi-category engine from Day 1. The top facility dropdown allows switching instantly between "Apex Fitness Club" (Gym), "Luxe Beauty Lounge" (Salon), "Bistrot Saint-Germain" (Restaurant), and "Studio Creative" (Projects).
  - *Why*: Directly honors the core specification of Atrium as a multi-category ERP.
- **Dynamic Category Adaptation Engine**:
  - *Decision*: Implement a reactive terminology and navigation resolver (`useFacilityStore`) that translates vocabulary and toggles vertical modules (e.g., POS enabled for Restaurant/Gym; Milestones enabled for Projects).
  - *Why*: Eliminates code duplication while providing a bespoke feel for each vertical.
- **Offline-First Reactive Repository with Quota Enforcer**:
  - *Decision*: Maintain an in-memory & `localStorage` reactive data layer simulating all 14 PostgreSQL RPCs, RLS rules, voucher validation, and plan limits (`subscription_plans.max_*`).
  - *Why*: Instant boot and testability in the web sandbox without requiring external cloud database setup.

---

## 4. Technical Architecture & System Modeling

### 4.1 System Topology & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application Root                               │
│            (Theme Manager, RTL Engine, Global Modals, Toast)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     Obsidian Sidebar          │             │     Main Content Viewport     │
│  - Brand Wordmark             │             │  - Top Bar (Facility Dropdown,│
│  - Active Facility Selector   │             │    Quota Alerts, Lang, Theme) │
│  - Category-Dynamic Nav:      │             │  - Dynamic Screen Viewport:   │
│    • 📊 Dashboard             │             │    • Dashboard View           │
│    • 👥 Directory (Adapted)   │             │    • Directory + 390px Panel  │
│    • 📋 Registrations / Leads │             │    • POS Shop & Cart Drawer   │
│    • 🛍️ POS / Shop            │             │    • Scheduler / Calendar     │
│    • 📅 Scheduler / Classes   │             │    • Finance & Staff Ledger   │
│    • 💰 Finance & Staff       │             │    • History Audit Logs       │
│    • 🕐 Transaction History   │             │    • Settings & Voucher Modal │
│    • ⚙️ Settings & License    │             │                               │
│  - Lifetime Plan Tier Badge   │             │                               │
│  - User Profile & Logout      │             │                               │
└───────────────────────────────┘             └───────────────┬───────────────┘
                                                              │
                                       ┌──────────────────────┴───────────────┐
                                       ▼                                      ▼
                      ┌─────────────────────────────────┐   ┌─────────────────┴─┐
                      │    Domain Service Layer (RPC)   │   │ Global Modals     │
                      │  - Multi-Category Terminology   │   │  - New Member     │
                      │  - Quota & License Enforcer     │   │  - Convert Lead   │
                      │  - Branch-Scoped Data Repos     │   │  - Redeem Voucher │
                      │  - Seed Engine (All 6 Verticals)│   │  - POS Checkout   │
                      │  - Local Reactive Persistence   │   │  - Add Branch     │
                      └─────────────────────────────────┘   └───────────────────┘
```

### 4.2 Data Entity Schema Overview
- **Multi-Tenant Entities**: `Account`, `Business` (with `BusinessCategory`), `Branch`, `Device`, `SubscriptionPlan` (ranks 0–3), `AccountSubscription`.
- **Vertical Domain Entities**: `Member` (with category segment data), `MembershipPlan` / `ServicePackage`, `RegistrationLead`, `StaffMember` (rank 1–25), `Product`, `Sale`, `SaleItem`, `ClassSession` / `Appointment`.
- **License Voucher**: `ATR-{TIER}-LIFE-{XXXX}-{XXXX}` format parser with perpetual entitlement unlock.

### 4.3 Phased Execution Steps
1. **Design Tokens & Theme Baseline**: CSS Custom Properties for Terracotta, Warm Parchment, Dark Espresso, buttons, filter capsules, 72px rows, and 390px panel.
2. **Domain Schemas & Multi-Category Seed Data**: Complete TypeScript types and rich seed data for Gym, Salon, Restaurant, and Projects.
3. **Shell, Sidebar & Category-Adaptive Navigation**: 288px obsidian sidebar, facility dropdown switcher, quota bar, and dynamic category router.
4. **Members / Clients Directory & 390px Detail Inspector**: KPI stat tiles, filter bar, list/grid switcher, avatar stack, and animated right detail panel.
5. **Registration & Lead Conversion Flow**: Pipeline view, status updates, and 1-click modal conversion into active members.
6. **POS Register & Product Shop**: Product grid, category pills, cart calculation, and receipt modal.
7. **Scheduler, Finance & Staff Ledger**: Calendar timetable, staff role matrix, salary tracking, and permissions gate.
8. **Settings, Multi-Branch Management & Lifetime Licensing**: Cash voucher redemption modal (`ATR-PLAN-LIFE-XXXX-XXXX`), device authorization, and quota banners.
9. **Localization (EN/FR/AR + RTL) & Quality Verification**: Test RTL inversion, keyboard focus, and complete state persistence.
