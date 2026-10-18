# Atrium ERP & CRM — Production-Readiness Master Plan

A comprehensive architectural and user-experience plan to elevate Atrium ERP & CRM into a 100% production-ready web platform across all active business verticals (Gym, Salon/Clinic, Retail POS, Rentals & Venues, Education & Academies, and Freelancers & Solo Practitioners).

***

## User Review & Critical Decisions

> [!IMPORTANT]
> The project milestone vertical (`project_milestone`) is intentionally deferred for a later phase as agreed. All 6 other core business verticals are active and supported.
> 
> Please review the 6 production upgrade pillars below before proceeding:

*   **Pillar 1: Returning User Lifecycle**: Store an explicit `atrium_has_onboarded` flag in local storage upon completing or skipping onboarding. Returning users on browser reload boot directly to their active Dashboard, while an on-demand "Relaunch Setup Wizard" button remains accessible in Settings.
*   **Pillar 2: Disaster Recovery & Data Portability**: Provide a 1-click **JSON Database Export** and **JSON Restore / Import** in Settings, allowing operators to back up and restore their entire business database across devices.
*   **Pillar 3: TopBar Breadcrumb Synchronization**: Extend breadcrumbs in `TopBar.tsx` so Education (`education_cohort`) and Retail POS (`pos_inventory`) reflect authentic vertical terminology rather than falling back to gym defaults.
*   **Pillar 4: Pristine Print Output (`@media print`)**: Guarantee clean, borderless, paper-ready printing for Invoices, Student Graduation Certificates, and POS Cash Receipts by stripping app chrome, sidebars, and modal buttons during print.
*   **Pillar 5: Form Validation & Tactile Error Feedback**: Implement defensive input validation for client, student, invoice, and booking forms with informative toast feedback rather than silent submissions.
*   **Pillar 6: Universal Command Palette (`Ctrl + K` / `/`)**: Add a global keyboard-driven search modal that allows front-desk operators to search across clients, students, bookings, invoices, and app screens from anywhere.

***

## 1. Overview & Core Concept

Atrium ERP & CRM is designed to operate as a high-density, multi-tenant business operating system running seamlessly in the browser with an Apple Spatial aesthetic. For an ERP to be truly production-ready, it must handle the mundane, daily realities of running a business: accidental page refreshes, power cuts, browser cache resets, tax audit requirements, physical paper invoicing, and rapid front-desk keyboard workflows.

### Target Audience & Personas
1.  **Gym & Fitness Operators**: Rapid RFID check-in, quota monitoring, class scheduling.
2.  **Salon & Spa Owners**: Multi-stylist column schedule, package checkouts, repeat client history.
3.  **Retail & Shop Cashiers**: Fast barcode search, cart operations, split cash/card payments, receipt printing.
4.  **Venue & Coworking Managers**: Hourly occupancy timeline, security deposit tracking, space reservations.
5.  **Academy & Tutoring Directors**: 360° student records, conflict-free room timetables, 1-click roll call attendance, cryptographic certificates, multi-installment tuition aging.
6.  **Freelancers & Solo Practitioners**: Live floating Pomodoro stopwatch, scope creep warnings, 1-click time-to-invoice generation, multi-currency retainers.

***

## 2. User Experience & Visual Design

### 2.1 Returning User Boot Experience
*   **First Visit**: Motion typographic intro loop (`AtriumMonolith`), followed by the 5-cubes architectural logo glide and letter-by-letter lockup, presenting the sleek 2-step onboarding card.
*   **Post-Onboarding Visit (Daily Reality)**: On browser reload or return, Atrium immediately restores the last active business and branch directly onto the primary Dashboard canvas. No wizard popups, no intro delays, and zero friction for daily work.
*   **On-Demand Relaunch**: Operators who wish to review the setup wizard can click "Relaunch Setup Wizard" inside the Settings tab or Business Switcher.

### 2.2 Backup & Disaster Recovery Center (Settings)
*   **Location**: `SettingsScreen.tsx` under a new dedicated **"Data Backup & Disaster Recovery"** card.
*   **Export Flow**: 1-click button generates a formatted JSON backup named `atrium_backup_[BusinessName]_[ISO_Date].json` containing businesses, branches, members, products, bookings, attendance, cohorts, invoices, time logs, and settings.
*   **Import / Restore Flow**: Drag-and-drop or file picker modal. Previews backup metadata (Creation Date, Total Records, Business Category) before applying. Includes a safe confirmation modal to prevent accidental data overwrites, followed by instant reactive store hydration.

### 2.3 Universal Command Palette (`Ctrl + K` / `/`)
*   **Trigger**: Global shortcut `Ctrl + K` (Windows/Linux), `Cmd + K` (macOS), or pressing `/` when no input is focused. Also accessible via a search capsule in the TopBar.
*   **Visual Style**: Floating spatial acrylic modal centered on viewport with fuzzy search input.
*   **Search Scope**:
    *   *Navigation Targets*: Jump directly to Timetable, Clients, POS Register, Invoices, Finance, Settings.
    *   *CRM Records*: Search by name, phone, or email across active Members, Clients, Renters, or Students.
    *   *Financial Items*: Jump directly to Invoices, Receipts, or Proposals.

### 2.4 Print Media Styling (`@media print`)
*   **Invoice Preview Modal**: Prints clean A4 invoice with sender details, client VAT/tax info, itemized table, total summary, payment terms, and QR code, hiding browser scrollbars and modal controls.
*   **Student Certificate Modal**: Prints high-resolution, landscape-oriented parchment certificate with gold border, student name, cohort title, completion date, and verification hash.
*   **POS Cash Register Receipt**: Formats to standard 80mm thermal receipt width when triggered from Shop or Transaction History.

***

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Client-Side JSON Backup vs. Cloud-Only Export
*   *Chosen Approach*: Client-side JSON file download + reactive hydration, supplemented by Supabase cloud sync if configured.
*   *Why*: Many business owners using local web apps do not have cloud databases connected initially. Client-side JSON gives them immediate 100% ownership of their operational records without server dependencies.

### Decision 2: LocalStorage Onboarding State Flag
*   *Chosen Approach*: Key `atrium_has_onboarded_v1` in `localStorage`.
*   *Why*: Eliminates the frustrating bug where refreshing the browser repeatedly traps the owner in the onboarding wizard. Allows instant, sub-50ms boot directly to the main stage.

### Decision 3: Defensive Form Validation with User Feedback
*   *Chosen Approach*: Inline requirement checks (name, contact, non-zero invoice rates) with immediate toast notifications (`toastService`).
*   *Why*: Silent form failures frustrate users, while raw browser alerts (`alert()`) break iframe sandboxing. Polished toast notifications preserve the Apple Spatial look while informing operators of missing fields.

***

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Atrium Web Application                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   Boot Orchestrator   │             │   Command Palette (Ctrl+K) │  │
│  │ (hasOnboarded Check)  │             │   Global Search & Jumper   │  │
│  └──────────┬────────────┘             └─────────────┬──────────────┘  │
│             │                                        │                 │
│             ▼                                        ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       TopBar & Dock Sidebar                      │  │
│  │     (Dynamic Breadcrumbs: Gym, Salon, POS, Venue, Education)     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│             ┌───────────────────────┴───────────────────────┐          │
│             ▼                                               ▼          │
│  ┌─────────────────────────┐                 ┌──────────────────────┐  │
│  │  Active Vertical Canvas │                 │   Settings Screen    │  │
│  │ • Education: Cohorts/AR │                 │ • Backup Export JSON │  │
│  │ • Freelance: Timer/Inv  │                 │ • Restore Backup     │  │
│  │ • Venue: Timeline/Slots │                 │ • Lifetime Vouchers  │  │
│  │ • Salon: Stylist Grid   │                 │ • Facility Switcher  │  │
│  │ • POS: Register/Stock   │                 └──────────────────────┘  │
│  │ • Gym: Check-in/Members │                                           │
│  └──────────┬──────────────┘                                           │
│             │                                                          │
│             ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Print Engine (@media print)                 │  │
│  │  • Freelance Invoices  • Education Certificates  • POS Receipts │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Unified Reactive Store                        │  │
│  │    (localStorage: atrium_erp_desktop_v2 + Supabase Sync Relay)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Interaction Specifications

1.  **`src/App.tsx` Lifecycle**:
    *   Read `localStorage.getItem('atrium_has_onboarded_v1')`.
    *   If `'true'`, set `showPowerOnboarding` to `false` on initial mount.
    *   Provide `relaunchOnboarding` method to reopen wizard from settings or topbar.
2.  **`src/components/screens/SettingsScreen.tsx`**:
    *   Add `handleExportDatabase()`: gathers full `globalState` snapshot, sanitizes, and downloads as JSON blob.
    *   Add `handleImportDatabase(file: File)`: reads JSON, validates required root keys (`businesses`, `branches`, `account`), restores state, and alerts user via toast.
3.  **`src/components/layout/TopBar.tsx`**:
    *   Update `getBreadcrumb()` with dedicated cases for `education_cohort` and `pos_inventory`.
4.  **`src/components/modals/CommandPaletteModal.tsx`**:
    *   New high-velocity search modal listening to `keydown` (`k` with `ctrlKey`/`metaKey` or `/`).
    *   Filters across navigation items and active business records with arrow key navigation and Enter to select.
5.  **`src/index.css` Print Styles**:
    *   Add global `@media print` rules enforcing clean backgrounds, zero dock/topbar display, zero backdrop blurs, and 100% width on printing canvases.
