# Atrium ERP — Freelancer & Solo Practitioner Vertical Architecture (7th Business Category)

Comprehensive architecture and full-featured design plan for Atrium’s 7th business vertical: **Freelancers & Solo Practitioners** (`freelance_solo` / FacilityType: `16`). This vertical equips solo multi-discipline professionals (designers, developers, consultants, media creators) to manage their entire client pipeline, billable hours, deliverables, multi-currency invoicing, retainers, and tax reserves in a cohesive Apple Spatial workspace.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and workflow parameters were confirmed via Phase 1 clarification:
> - **Primary Discipline Focus**: Multi-Discipline (software development, UI/UX design, strategic consulting, copy, and media production).
> - **Financial & Billing Model**: Multi-Currency (`DZD`, `EUR`, `USD`) support with automated tax reserve calculation, milestone installment deposits, and recurring monthly retainers.
> - **Time & Activity Tracking**: Live floating stopwatch with Pomodoro technique intervals, active task scoping, and instant 1-click invoicing from accumulated unbilled hours.
> - **Scope Creep Protection**: Built-in visual alerts when logged billable hours exceed initial client milestone estimates.

---

## 1. Overview & Core Concept

### What It Delivers
The **Freelance Solo** category transforms Atrium into an end-to-end command center tailored for single-operator professional businesses. It eliminates fragmented subscriptions (Toggl + Notion + QuickBooks + Bonsai) by providing:
1. **Client CRM & 360° Inspector**: Complete client history, lifetime value, payment reliability rating, and active contracts.
2. **Proposals & Inquiries Pipeline**: Intake brief evaluation, proposal drafting, and 1-click conversion into an active project and deposit invoice.
3. **Interactive Project & Deliverable Kanban**: Progress stages (`Briefing`, `In Progress`, `Client Review`, `Approved`, `Billed`).
4. **Live Floating Stopwatch & Pomodoro**: Unobtrusive persistent timer widget linked directly to client and task.
5. **1-Click Invoicing & Retainer Manager**: Multi-currency itemized billing, unbilled hour roll-up, and automated aging tracking.
6. **Finance, Overhead & Tax Reserves**: Real-time net take-home calculation subtracting tool subscriptions, expenses, and local tax reserves.

### Target Personas
- **Full-Stack Freelancers**: Developers and designers balancing multiple simultaneous sprint deliverables.
- **Fractional Consultants & Advisors**: Retainer-based professionals tracking weekly advisory quotas and fixed monthly hours.
- **Creative Media Producers**: Video editors, photographers, and copywriters billing by deliverable milestone and revisions.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow 1: New Inquiry to Signed Contract & Deposit
1. Freelancer receives a client brief in the **Inquiries & Proposals** screen.
2. Selects *"Create Proposal"* $\rightarrow$ specifies scope, milestone deliverables, rate model (fixed deposit vs. hourly cap), and currency (`DZD`, `EUR`, `USD`).
3. Once accepted by the client, clicks *"Convert to Active Project"*:
   - Automatically adds client to the **Clients CRM**.
   - Spawns the milestone boards in **Deliverables**.
   - Generates the initial upfront deposit invoice in **Invoicing**.

#### Flow 2: Live Time Tracking to 1-Click Invoice
1. Freelancer opens any screen and clicks *"Start Focus Timer"* in the TopBar or Time Tracking view.
2. Selects Client (*"TechNova Corp"*) and Deliverable (*"API Integration Sprint"*).
3. Stopwatch ticks with optional Pomodoro audio chimes (25m work / 5m pause).
4. At week's end, opens **Invoicing** $\rightarrow$ clicks *"Bill Unbilled Hours (14.5 hrs)"*.
5. The system generates an itemized invoice formatted with hours, hourly rate, subtotal, and payment bank coordinates.

#### Flow 3: Retainer Hours Consumption & Burn-down
1. For retainer clients (e.g., 20 hours/month at 60,000 DZD or €1,200/mo), the system displays a visual fuel gauge: `14 / 20 hrs consumed`.
2. Warns the freelancer when 80% and 100% of the monthly retainer has been reached, with option to bill overage at standard rates.

### Visual Identity & Theme (Apple Spatial Desktop)
- **Palette & Atmosphere**:
  - Accent: Desktop Terracotta (`#C4785A`) with subtle glassmorphic glows (`rgba(196, 120, 90, 0.12)`).
  - Background: Crisp Pure White (`#FFFFFF`) interior canvas with `#E8ECEF` outer desktop window backdrop in light mode; Obsidian `#18181B` with deep zinc borders in dark mode.
  - Neutral Grouping Surfaces: `#F8F9FA` rounded grouping zones with `#EDF1F3` subtle dividers.
- **Zero-Pill & Metadata Discipline**:
  - Tags, currencies, and timestamps are rendered as unboxed typographic strings separated by quiet middle-dots (`DZD · Active Retainer · Due Oct 24`).
  - Interactive filter controls use segmented button bars rather than candy-colored status pills.
- **Tabular Figures & Metrics**:
  - All monetary values, stopwatches, hours, and rates strictly enforce `font-variant-numeric: tabular-nums` to eliminate layout jitter.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Floating Sticky Stopwatch in TopBar & Dedicated Screen**
  - *Chosen Approach*: The timer state lives in global store (`globalState.activeTimer`), remaining running and visible across every screen navigation.
  - *Why*: Freelancers constantly switch between reviewing briefs, checking invoices, and working; interrupting the timer on route changes breaks productivity.
  - *Alternatives Considered*: Isolated page timer (rejected: lost when navigating to CRM or invoices).

- **Decision 2: Multi-Currency Support with Native Base Currency**
  - *Chosen Approach*: Each client has their designated billing currency (`DZD`, `EUR`, `USD`), with invoices rendered in client currency while Dashboard analytics aggregate to the tenant's primary base currency.
  - *Why*: International freelancers receive foreign wire transfers (EUR/USD) while paying local living/tax expenses in local currency (DZD).

- **Decision 3: Seamless Category Switching in Multi-Tenant Architecture**
  - *Chosen Approach*: Freelance vertical is treated as category code `16` (`freelance_solo`) alongside existing Gym (`membership_session`) and Salon (`appointment_service`) categories, completely reusing Atrium's top facility switcher.
  - *Why*: A business owner can operate both a physical salon/gym and a freelance consultancy under the exact same Atrium account without data leakage.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Atrium ERP: Freelance Solo Workspace                     │
│                                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────────────────────────────┐ │
│  │ Global Persistent Dock │  │ TopBar: Live Pomodoro Stopwatch & Currency Bar │ │
│  └───────────┬────────────┘  └───────────────────────┬────────────────────────┘ │
│              │                                       │                          │
│              ▼                                       ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Freelance Screen Router & Controller                    │ │
│  │                                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │ │
│  │  │ Solo Command │ │ Clients CRM  │ │ Deliverables │ │ Time Tracker &    │  │ │
│  │  │ Dashboard    │ │ & 360 Drawer │ │ Kanban Board │ │ 1-Click Invoicing │  │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘  │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │ │
│  │  │ Proposals &  │ │ Retainers &  │ │ Tax & Net    │ │ Subcontractors &  │  │ │
│  │  │ Inquiries    │ │ Invoices     │ │ Profit Gauge │ │ Tool Expenses     │  │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘  │ │
│  └────────────────────────────────────┬───────────────────────────────────────┘ │
│                                       │                                         │
│                                       ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │               Freelance Domain State Engine (src/services/store.ts)        │ │
│  │   - activeTimer (stopwatch / pomodoro mode, elapsed, billable)             │ │
│  │   - freelanceClients, projects, deliverables, timeEntries, invoices        │ │
│  │   - currencyExchangeRates, taxReserveRate (e.g. 15-25%), expenseLedger     │ │
│  └────────────────────────────────────┬───────────────────────────────────────┘ │
│                                       │                                         │
│                 ┌─────────────────────┴──────────────────────┐                  │
│                 ▼                                            ▼                  │
│  ┌─────────────────────────────┐            ┌────────────────────────────────┐  │
│  │  Supabase Cloud Database    │            │ Local Storage Fallback Cache   │  │
│  │  (PostgreSQL + RLS + Sync)  │            │ (atrium_erp_desktop_v2)        │  │
│  └─────────────────────────────┘            └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Entity Specifications

1. **`FreelanceClient`** (Extends generic entity):
   - `id`, `tenantId`, `facilityId`, `name`, `company`, `email`, `phone`, `currency` (`'DZD' | 'EUR' | 'USD'`), `hourlyRate`, `status` (`'ActiveRetainer' | 'ProjectBased' | 'Prospect' | 'Archived'`), `lifetimeBilled`, `notes`.
2. **`FreelanceProject` & `Deliverable`**:
   - `id`, `clientId`, `title`, `description`, `pricingModel` (`'Fixed' | 'Hourly' | 'Retainer'`), `budget`, `estimatedHours`, `loggedHours`, `stage` (`'Briefing' | 'InProgress' | 'ClientReview' | 'Approved' | 'Billed'`), `deadline`, `scopeCreepWarning`.
3. **`TimeLogEntry`**:
   - `id`, `clientId`, `projectId`, `taskDescription`, `durationSeconds`, `isBillable`, `isInvoiced`, `rateAtMoment`, `timestamp`.
4. **`FreelanceInvoice`**:
   - `id`, `clientId`, `clientName`, `invoiceNumber` (e.g. `INV-2026-001`), `currency`, `issueDate`, `dueDate`, `status` (`'Draft' | 'Sent' | 'Paid' | 'Overdue'`), `lineItems` (description, qty, rate, total), `subtotal`, `taxPercent`, `totalAmount`, `paymentNotes`.
5. **`FreelanceProposal`**:
   - `id`, `clientName`, `projectTitle`, `proposedBudget`, `scopeItems`, `validUntil`, `status` (`'Pending' | 'Accepted' | 'Declined'`).
6. **`FreelanceExpense`**:
   - `id`, `category` (`'Software' | 'Hardware' | 'Office' | 'Subcontractor' | 'Travel'`), `vendor`, `amount`, `currency`, `date`, `isDeductible`.

### Screen & Component Breakdown

1. **`FreelanceDashboardView.tsx`**:
   - 4 Hero stat cards: *Monthly Invoiced*, *Effective Hourly Rate (EHR)*, *Active Deliverables*, *Weekly Billable Gauge*.
   - Urgent Attention Strip: Approaching deadlines and overdue invoices.
   - Quick Timer Dock: Start immediate focus session.
2. **`FreelanceClientsView.tsx`**:
   - Client card grid + table with currency tags and unbilled balance.
   - Slide-over Client 360° inspector with time logs and invoice ledger.
3. **`FreelanceDeliverablesView.tsx`**:
   - Kanban board with drag-and-drop or column select.
   - Scope creep indicators with visual ratio (`logged / estimated`).
4. **`FreelanceTimeTrackerView.tsx`**:
   - Live digital chronometer + Pomodoro cycles.
   - Filterable timeline of daily logs with quick unbilled-to-invoice action.
5. **`FreelanceInvoicesView.tsx`**:
   - Multi-currency invoice table with aging status pills (`Draft`, `Sent`, `Paid`, `Overdue`).
   - Clean preview modal with printable layout and copyable payment RIB.
6. **`FreelanceFinanceView.tsx`**:
   - Overhead subscriptions tracking + Net Profit & Tax Reserve slider (adjust percentage to see net earnings).

---

## 5. Execution Steps (For Approval)

1. **Step 1: Domain Models & Terminology Updates**:
   - Add `freelance_solo` to `BusinessCategory` in `src/types/index.ts`.
   - Add comprehensive `freelance_solo` terminology dictionary in `src/utils/rules.ts`.
2. **Step 2: Mock Seed Data & Freelance Generator**:
   - Seed realistic multi-discipline freelance clients (Tech startups, marketing agencies, local brands), active deliverables, time logs, and multi-currency invoices in `src/services/seedData.ts`.
3. **Step 3: State Store Extensions in `src/services/store.ts`**:
   - Add active stopwatch timer state, timer tick actions, start/pause/stop handlers, billable hour conversion, and invoice status transitions.
4. **Step 4: Composite Freelance Views**:
   - Implement `FreelanceDashboardView`, `FreelanceClientsView`, `FreelanceDeliverablesView`, `FreelanceTimeTrackerView`, `FreelanceInvoicesView`, and `FreelanceFinanceView`.
   - Wire dynamic screen rendering in `App.tsx` based on `currentBusiness.category === 'freelance_solo'`.
5. **Step 5: TopBar Floating Timer Integration**:
   - Integrate sticky chronometer pill in TopBar when a timer is running.
6. **Step 6: Verification & Test Suite**:
   - Verify zero TypeScript compiler issues via `lint_applet` and successful production build via `compile_applet`.
