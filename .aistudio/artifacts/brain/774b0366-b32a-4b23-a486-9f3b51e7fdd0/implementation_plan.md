# Production-Ready Elevation: Freelancer & Solo Practitioner Category

Transform the Freelancer & Solo Practitioner vertical (`freelance_solo` / Category 16) from an interactive prototype into a resilient, production-grade business suite with dynamic metric calculations, full multi-entity CRUD capabilities, realistic empty states, dynamic invoice branding, and automated lifecycle transitions.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The existing mock data will remain intact for demonstration and testing, but all views will now gracefully support both active mock data and fresh real-world data (including zero-data states) without hardcoded fallback IDs or static display numbers.

- **Mock Data Retention**: Kept intact as requested. Users can test all features immediately or delete/add records freely.
- **Cascade Deletions**: Deleting a client offers the option to archive or delete associated unbilled time logs and project deliverables, preventing database orphan records.
- **Invoice Immutability**: Paid invoices cannot be edited or deleted (they can only be credited or viewed), while Draft and Sent invoices can be edited, voided, or deleted.
- **Empty States**: If a user has 0 clients or 0 projects, clicking stopwatch or timer action buttons opens a clean "Create Your First Client/Project" modal instead of failing or defaulting to hardcoded mock IDs.

---

## 1. Overview & Core Concept

- **What It Does**: A complete, self-contained operating system for independent consultants, engineers, designers, and solo agency owners. Covers end-to-end client lifecycle: lead intake & scoping proposals, deliverable Kanban planning, live focus tracking with Pomodoro intervals, 1-click unbilled time conversion to multi-currency invoices, tax provision modeling, and business expense management.
- **Target Audience / Persona**: Independent software engineers, UI/UX designers, copywriters, and consultants managing international (EUR/USD) and domestic (DZD) client engagements.
- **Key Value**: Eliminates administrative leakage by converting untracked focus time directly into cashflow while safeguarding the freelancer's bottom line through tax reserves and scope-creep detection.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Intake & Scope Conversion**:
   - The user drafts a project proposal with itemized scope points and a fixed/hourly budget.
   - Upon client acceptance, 1 click on **Convert to Project** automatically registers the client, initializes the project, converts every scope item into a Kanban deliverable with estimated hours, and takes the user straight to the Deliverables board.

2. **Tracking & Scope Protection**:
   - The freelancer clicks **Track** directly from a deliverable card. The live floating stopwatch in the top bar begins ticking with a pulsing emerald status indicator.
   - If tracked hours exceed the estimated hours, an amber **Scope Creep Alert** appears with the exact overrun amount.
   - The user can edit deliverable titles and estimated hours directly from a modal, or delete tasks with instant budget recalculation.

3. **1-Click Billing & Invoice Generation**:
   - From the Client CRM or Time Tracker, clicking **Bill Unbilled Hours** aggregates all unbilled logs into an itemized multi-currency invoice (DZD, EUR, USD), sets time logs to `isInvoiced: true`, and opens the formatted printable invoice modal.
   - Invoices dynamically pull the freelancer's active business name, RIB/IBAN, and tax identifiers from the store rather than hardcoded studio strings.

4. **Tax Reserve & Overhead Health**:
   - The user simulates their tax bracket (0%–35%) using the interactive tax slider.
   - Net take-home revenue and true Effective Hourly Rate (Gross vs. Net EHR) update in real-time as expenses and paid invoices are added or removed.

### Visual Identity & Theme

- **Aesthetic Direction**: Apple Spatial desktop application aesthetic with pure continuous white canvas containers (`rounded-[32px]`), obsidian dock navigation, and crisp Terracotta brand accents (`#C4785A`).
- **Typography & Tabular Discipline**: Inter / Plus Jakarta Sans display typography paired with strict `tabular-nums` monospace numbers (`font-mono tabular-nums`) for currency figures, timer counters, and progress percentages to prevent layout jitter.
- **Zero-Pill Discipline**: Metadata displayed as clean, unboxed text separated by typographic middots (`·`). Interactive controls use subtle segmented controls rather than candy-colored pill badges.
- **Empty & Error States**: Dedicated contextual empty state cards for each view with welcoming icon art, clear explanations, and a primary CTA (e.g. `Log First Time Entry`, `Create First Deliverable`).

---

## 3. Key Product Decisions & Trade-Offs

- **Dynamic Pipeline Calculation vs. Hardcoded Summary**:
  - *Chosen Approach*: Replace static summary text with dynamic calculations of `freelanceInvoices` grouped by currency (`EUR`, `USD`, `DZD`) and payment status (`Paid`, `Sent`, `Overdue`).
  - *Why*: Guarantees that any new invoice created, marked paid, or deleted immediately updates the financial health cards.

- **Full Entity CRUD Implementation**:
  - *Chosen Approach*: Provide full Create, Read, Update, and Delete actions across all 6 freelance collections:
    1. Clients: `addFreelanceClient`, `updateFreelanceClient`, `deleteFreelanceClient`
    2. Projects: `addFreelanceProject`, `updateFreelanceProject`, `deleteFreelanceProject`
    3. Deliverables: `addDeliverable`, `updateDeliverable`, `deleteDeliverable`
    4. Time Logs: `logTimeEntry`, `updateTimeLog`, `deleteTimeLog`
    5. Invoices: `createFreelanceInvoice`, `updateInvoiceStatus`, `deleteFreelanceInvoice`
    6. Proposals: `createFreelanceProposal`, `updateFreelanceProposal`, `deleteFreelanceProposal`
  - *Why*: Essential for real daily use where typos, scope changes, and test logs must be manageable.

- **Dynamic Invoice Branding**:
  - *Chosen Approach*: Pull company name, account holder, bank RIB/IBAN, and email directly from `currentBusiness` and `currentUser` profiles in the store with sensible fallbacks.
  - *Why*: Allows multi-tenant freelancers to issue invoices under their real trade name and bank details.

- **Zero-Data Fallback Protection**:
  - *Chosen Approach*: If the database is empty or mock data is deleted, buttons prompt the user with modal dialogs rather than referencing static fallback IDs (`'fcli_01'`).

---

## 4. Technical Architecture & Data Strategy

### System Component & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Atrium Store (Module Scope)                     │
│  - Global State: clients, projects, timeLogs, invoices, proposals, exp │
│  - Storage Engine: localStorage ('atrium_erp_desktop_v2')              │
│  - Supabase Sync Service: Non-blocking upsert & fetch (freelanceService│
│  - Coordinated Background Singletons: Branch Realtime & Timer Interval│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│           TopBar & Navigation        │  │       Global Modals          │
│ - Floating Stopwatch Pill (Live tick)│  │ - InvoicePreviewModal (A4/RIB│
│ - Breadcrumbs & Multi-Facility Switch│  │ - Client Edit/Delete Modal   │
│ - Theme (Dark/Light) & Supabase Sync │  │ - Deliverable Edit/Delete    │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │                                     │
                   ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Freelance Screen Views (Active Screen)               │
│                                                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │ FreelanceDashboard   │  │ FreelanceClientsView │  │ Deliverables   │ │
│ │ - Dynamic KPI Cards  │  │ - Client 360 Drawer  │  │ - 5-Col Kanban │ │
│ │ - Dynamic Overruns   │  │ - 1-Click Bill Unbill│  │ - Scope Alert  │ │
│ │ - Focus Sprint Dock  │  │ - Full CRUD Actions  │  │ - Edit/Delete  │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │ FreelanceTimeTracker │  │ FreelanceInvoicesView│  │ Finance & Tax  │ │
│ │ - Chrono / Pomodoro  │  │ - Dynamic Builder    │  │ - 0-35% Slider │ │
│ │ - Manual Time Entry  │  │ - Multi-Currency Calc│  │ - EHR Bridge   │ │
│ │ - Edit/Delete Log    │  │ - Mark Paid / Void   │  │ - Expense CRUD │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
│ ┌──────────────────────┐                                               │
│ │ FreelanceProposals   │                                               │
│ │ - Dynamic Scope List │                                               │
│ │ - 1-Click Convert    │                                               │
│ └──────────────────────┘                                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Entity Operations Matrix

| Entity | Create | Read/Filter | Update | Delete | Cascade Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FreelanceClient`** | `addFreelanceClient` | By name, company, status, currency | `updateFreelanceClient` | `deleteFreelanceClient` | Protects invoiced records; warns on active projects. |
| **`FreelanceProject`** | `addFreelanceProject` | By client, stage, search | `updateFreelanceProject` | `deleteFreelanceProject` | Cleans up attached deliverables and logs. |
| **`FreelanceDeliverable`** | `addDeliverable` | By project, stage, creep | `updateDeliverable` / stage move | `deleteDeliverable` | Recalculates project estimated hours. |
| **`TimeLogEntry`** | Stopwatch / manual | By client, project, invoiced status | `updateTimeLog` | `deleteTimeLog` | Recalculates project logged hours. |
| **`FreelanceInvoice`** | Manual or unbilled auto | By number, client, status | `updateInvoiceStatus` | `deleteFreelanceInvoice` | If deleted before paid, unbilled logs revert to uninvoiced. |
| **`FreelanceProposal`** | `createFreelanceProposal` | By client, status | `updateFreelanceProposal` | `deleteFreelanceProposal` | None. |
| **`FreelanceExpense`** | `addFreelanceExpense` | By category, tax deductible | Inline category/amount | `deleteFreelanceExpense` | Recalculates net take-home and EHR. |

---

## 5. Step-by-Step Implementation Sequence

1. **Step 1: Store Actions Expansion (`src/services/store.ts`)**
   - Add missing delete and edit functions: `deleteFreelanceClient`, `updateFreelanceProject`, `deleteFreelanceProject`, `updateDeliverable`, `deleteDeliverable`, `updateTimeLog`, `deleteTimeLog`, `deleteFreelanceInvoice`, `updateFreelanceProposal`, `deleteFreelanceProposal`.
   - Update `billUnbilledHours` reversal logic when an invoice is deleted or voided.
   - Ensure all new actions trigger both `notify()` (localStorage) and the matching Supabase service methods.

2. **Step 2: Supabase Service Alignment (`src/lib/supabase/services/freelanceService.ts`)**
   - Add corresponding delete methods: `deleteClient`, `deleteProject`, `deleteTimeLog`, `deleteInvoice`, `deleteProposal`, `deleteExpense`.

3. **Step 3: Dashboard Dynamic Data Binding (`FreelanceDashboardView.tsx`)**
   - Replace hardcoded pipeline text with dynamic currency sums from `freelanceInvoices`.
   - Bind EHR card to computed `ehrRate`.
   - Replace hardcoded scope-creep string with dynamic lookup of the highest-overrun deliverable.
   - Guard timer quick start against empty client/project lists.

4. **Step 4: Client CRM Enhancements (`FreelanceClientsView.tsx`)**
   - Add Client Delete button with confirmation modal.
   - Add empty state illustration and CTA when 0 clients match filter.

5. **Step 5: Deliverables Board CRUD & Automation (`FreelanceDeliverablesView.tsx`)**
   - Add Edit Deliverable Modal (title, description, estimated hours, due date).
   - Add Delete Deliverable button.
   - Auto-update parent project stage to `Completed` when all deliverables reach `Approved` or `Billed`.

6. **Step 6: Time Tracker Editing & Empty Guards (`FreelanceTimeTrackerView.tsx`)**
   - Add Edit and Delete actions on timesheet rows.
   - Guard quick timer against empty client/project dropdowns.

7. **Step 7: Invoices Dynamic Branding & Management (`FreelanceInvoicesView.tsx` & `InvoicePreviewModal.tsx`)**
   - Bind invoice header and wire transfer holder to `currentBusiness.name` and `currentUser.fullName`.
   - Add Delete / Void Invoice action for Draft/Sent invoices.

8. **Step 8: Verification & Test Execution**
   - Run `lint_applet` and `compile_applet`.
   - Run unit tests (`npm test`) and verify dev server responsiveness.
