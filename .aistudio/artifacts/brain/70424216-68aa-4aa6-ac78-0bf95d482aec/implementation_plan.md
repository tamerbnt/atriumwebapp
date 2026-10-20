# Complete Freelance Suite Localization & Multi-Vertical Rollout Plan

Execute complete tri-lingual localization (French, Arabic, and English) across the entire Freelance Project vertical—including all views, forms, modals, and dynamic printable invoice documents—followed by staged localization across the remaining vertical suites (Education, Venue, Project / NCH Activator).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified and confirmed for this phase:
> - **Sequenced Rollout Order**: Prioritize and completely localize the **Freelance Suite** first across all sub-views and modals, followed by the remaining verticals (Education, Venue, Project / NCH Activator).
> - **Dynamic Invoice & Printable Document Localization**: The printable invoice (`InvoicePreviewModal`), receipts, and financial slips will dynamically adapt to the currently selected active language (FR, AR, EN), ensuring accurate cultural formatting (currency tokens, date stamps, RIB/CCP account lines, and RTL/LTR alignments).
> - **Bilingual Algerian Seed Data Preservation**: Realistic client names, Algerian wilaya locations, currencies (DZD / EUR / USD), and client industry scopes will remain realistic and functional.

---

### 1. Overview & Core Concept

Atrium's Freelance vertical provides independent consultants, developers, and agency solos with end-to-end tooling: client CRM, Kanban deliverables, time tracking, proposal quotations, and invoicing.

While the primary navigation and Dashboard summary currently support language switching, all core working screens, nested modals, and documents remained hardcoded in English. This implementation bridges that gap by connecting every Freelance component to Atrium's tri-lingual translation engine (`useTranslation` and `src/utils/i18n.ts`), while introducing dynamic document layouts that seamlessly flip between LTR (English/French) and RTL (Arabic).

---

### 2. User Experience & Visual Design

#### Key User Flows & Screen Touchpoints

1. **Clients & Retainers CRM (`FreelanceClientsView.tsx`)**:
   - Headers, counters, and table headers translated into French and Arabic.
   - **Add / Edit Client Modal**: Form labels, currency pickers, monthly retainer fee inputs, and scope guidelines textarea localized with appropriate text direction.
   - **Delete Confirmation Modal**: Warning typography, destructive action buttons, and cascade deletion options translated with clean spacing.

2. **Deliverables & Sprint Kanban (`FreelanceDeliverablesView.tsx`)**:
   - Kanban column headers (`Briefing & Spec`, `In Progress`, `In Review`, `Delivered`), status chips, and priority tags localized.
   - **Create Deliverable Modal**: Stage selectors, pricing model pickers, due date indicators, and milestone attachments localized.
   - **Deliverable Detail Drawer**: Action buttons, task status toggles, and billable duration tags localized.

3. **Invoicing & Billing Center (`FreelanceInvoicesView.tsx`)**:
   - Filter capsules (`All`, `Draft`, `Sent`, `Paid`, `Overdue`), invoice counters, and action nodes translated.
   - **Create Invoice Modal**: Itemized row descriptors, rate calculation fields, tax rates, and client linkers fully localized.
   - **Mark as Paid Confirmation**: Toast triggers and payment status badges localized.

4. **Printable Document & RIB Preview (`InvoicePreviewModal.tsx`)**:
   - Seamlessly reacts to the active language switcher.
   - When Arabic is active: Header layout mirrors with RTL flow, invoice items table aligns right, and currency suffixes format correctly (`د.ج` / `EUR` / `USD`).
   - When French or English is active: Standard clean left-aligned typography with proper localized date formats and payment terms.
   - Quick "Copy RIB" button and "Print Document" actions localized with tactile micro-feedback.

5. **Focus Stopwatch & Time Tracker (`FreelanceTimeTrackerView.tsx`)**:
   - Live timer controls (`Start`, `Pause`, `Resume`, `Stop & Save`), billable toggles, and Pomodoro controls.
   - Manual log creation modal, task descriptors, and daily time tally strip localized.

6. **Solo Finance & Net Profit (`FreelanceFinanceView.tsx`)**:
   - Tax reserve estimations, business expense breakdown, and expense category selectors localized.
   - **Add Expense Modal**: Category drop-downs, receipt notes, and amount inputs localized.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Component Integration with `useTranslation`**
  - *Chosen Approach*: Import and use `{ t, language, isRtl } = useTranslation()` in each screen and modal component, leveraging standard translation keys already defined in `i18n.ts` and supplementing any missing keys.
  - *Why*: Eliminates duplicated hardcoded strings, ensures reactive language switching without page reloads, and respects global RTL layout attributes.
- **Decision 2: Adaptive Printable Document vs. Static Bilingual PDF**
  - *Chosen Approach*: Make the printable modal react dynamically to the app's current language (`language === 'ar' ? ...`), allowing the user to print client-facing invoices in French, Arabic, or English on demand.
  - *Why*: Freelancers in Algeria and MENA frequently deal with both local clients (requiring Arabic or French invoices) and international clients (requiring English).
- **Decision 3: Architectural Staging (Freelance First, then Remaining Verticals)**
  - *Chosen Approach*: Group implementation into Phase 1 (Freelance screens + modals + printable invoice) followed by Phase 2 (Education, Venue, Project suites).
  - *Why*: Prevents regression, ensures deep validation on the specific screens the user is actively testing, and allows iterative verification.

---

### 4. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────┐
│                   TopBar & App State                   │
│         [Language Selector: EN | FR | AR]              │
└──────────────────────────┬─────────────────────────────┘
                           │ Active Language & dir (RTL/LTR)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Atrium i18n Core Engine                  │
│       src/utils/i18n.ts & src/utils/useTranslation     │
└──────────────────────────┬─────────────────────────────┘
                           │
      ┌────────────────────┴────────────────────┐
      ▼                                         ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│       Freelance Views         │ │       Freelance Modals        │
│ ───────────────────────────── │ │ ───────────────────────────── │
│ • FreelanceClientsView        │ │ • Add / Edit Client Modal     │
│ • FreelanceDeliverablesView   │ │ • Delete Client Cascade Modal │
│ • FreelanceInvoicesView       │ │ • Create Deliverable Modal    │
│ • FreelanceTimeTrackerView    │ │ • Create Invoice Modal        │
│ • FreelanceFinanceView        │ │ • InvoicePreviewModal (Print) │
│ • FreelanceProposalsView      │ │ • Manual Time Log Modal       │
└───────────────────────────────┘ └───────────────────────────────┘
```

#### Deliverable Checklist for Freelance Phase

1. **Dictionary Completeness (`src/utils/i18n.ts`)**:
   - Audit and confirm all form labels, placeholders, confirmation warnings, and empty states exist across `TRANSLATIONS_EN`, `TRANSLATIONS_FR`, and `TRANSLATIONS_AR`.
2. **View Migration (`src/components/screens/freelance/`)**:
   - Update `FreelanceClientsView.tsx` with `useTranslation` and localized modal dialogs.
   - Update `FreelanceDeliverablesView.tsx` with Kanban column translations and deliverable creation forms.
   - Update `FreelanceInvoicesView.tsx` with invoice filters, creation forms, and status badges.
   - Update `InvoicePreviewModal.tsx` with RTL layout support, localized headers, and printable formatting.
   - Update `FreelanceProposalsView.tsx` with proposal statuses, conversion modals, and currency formats.
   - Update `FreelanceTimeTrackerView.tsx` with timer buttons, manual log dialogs, and summary tiles.
   - Update `FreelanceFinanceView.tsx` with tax reserve calculators and expense forms.
3. **Verification**:
   - Run `lint_applet` and `compile_applet` to confirm 0 TypeScript or lint errors.
   - Validate RTL layout integrity and reactive language switching across all 3 locales.
