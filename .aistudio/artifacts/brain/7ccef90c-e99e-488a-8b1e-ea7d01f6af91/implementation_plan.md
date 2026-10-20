# Comprehensive Freelance Suite Localization & Translation Plan

A complete audit and systematic localization plan for the Freelancer & Solo Practitioner category (`freelance_solo`) across all 7 operational sub-views, 8 modals, kinetic notification toasts, input placeholders, missing dictionary keys, and demo data presets in French, Modern Standard Arabic, and English.

> [!IMPORTANT]
> **User Clarifications Confirmed**:
> 1. **Scope**: Full UI, modals, placeholders, toasts, and demo presets.
> 2. **Arabic Terminology Style**: Modern Standard Arabic with North African business terminology (e.g. فاتورة, عرض سعر / Devis, بريد الجزائر / BaridiMob, اقتطاع ضريبي).
> 3. **Demo Presets**: Seed demo clients, projects, deliverables, and invoices will be fully localized per language.
> 4. **No Code Written Yet**: As instructed, this turn performs the complete investigation and structural plan without modifying source code.

---

## 1. Overview & Core Concept

The Freelance & Solo Practitioner vertical in Atrium ERP & CRM provides solo developers, designers, translators, and creative consultants with a dedicated operating system (stopwatch time tracker, deliverables Kanban, retainer CRM, 1-click invoicing, proposal pipeline, and tax cashflow simulation).

While basic navigation headers were previously wired, an in-depth audit revealed 5 categories of untranslated elements:
1. **Broken Translation Keys**: Missing keys in `i18n.ts` that cause raw key strings (such as `free_clients_field_contact`, `free_clients_field_company`, `free_clients_field_email`, `free_invoices_currency`, and `common_active`) to display literally in the UI.
2. **Hardcoded English Fallbacks & Attribute Placeholders**: Dozens of `placeholder="e.g. ..."`, select option labels, tooltips, and fallback strings like `'Private Client'`, `'Direct Client'`, `'Fixed Milestone'`, and `'Select Client...'`.
3. **Incomplete Bilinguality in Inline Ternaries**: Ternaries providing Arabic and English but defaulting French to raw English (e.g., `'Pomodoro (25m)'`, `'Exempt'`, `'Standard Solo'`, `'Gross'`).
4. **Hardcoded Kinetic Toasts in Store & Components**: Notification toasts for time logging, invoice generation, status settlement, and proposal conversion containing hardcoded English strings.
5. **Static English Seed Data**: Demo client accounts, project titles, scope items, and sample time logs remaining in English regardless of active language.

---

## 2. Exhaustive Audit Findings by Screen & Modal

### A. Freelance Dashboard (`FreelanceDashboardView.tsx`)
- **Broken Keys**:
  - `t('common_active', language)` -> Key does not exist in `i18n.ts`; displays literally as `common_active` on client roster cards.
- **Hardcoded Strings**:
  - Line 220: `"EUR · USD · DZD"` currency indicator.
  - Line 254: `{activeDeliverablesCount} {t('common_all', language)}` -> Uses "All" instead of "Deliverables".
  - Lines 316–324: Inline ternaries for `"Deliverable"` / `"Le livrable"` / `"التسليمة"`, `"for"` / `"pour"` / `"للعميل"`, and `"hours"` / `"heures"` / `"ساعة"`.
  - Line 350: `'Pomodoro (25m)'` / `'Standard Chrono'`.
  - Line 385: Fallback task names `'Focus Sprint Session'` / `'Session focus'` / `'جلسة تركيز سريعة'`.
  - Line 558: `'Contact'` / `'جهة الاتصال'`.
  - Line 583: `'Session for'` / `'Session pour'` / `'جلسة لصالح'`.
  - Fallback business brand name `'Atlas Studio'`.

### B. Clients CRM & Client Modals (`FreelanceClientsView.tsx`)
- **Hardcoded Placeholders & Fallbacks**:
  - Line 768: `placeholder="e.g. 20"` (Retainer hours).
  - Line 779: `placeholder="e.g. 1500"` (Monthly flat fee).
  - Line 835 (Delete confirmation modal): `({clientToDelete.company || 'Private Client'})` -> `'Private Client'` is hardcoded English.
  - Line 192: Fallback project title `'Sprint & Advisory'`.
  - Line 130: Default country `'Algeria'`.
  - Line 539: Fallback stage names `'Briefing'` and `'Billed'` (missing localized terminology).

### C. Deliverables Kanban & Project Modals (`FreelanceDeliverablesView.tsx`)
- **Hardcoded Attributes & Options**:
  - Line 466: `placeholder="Stage..."`.
  - Line 516: `placeholder="Select Target Project..."`.
  - Line 523: `placeholder="e.g. Design System Tokens & Color Guidelines"`.
  - Line 534: `placeholder="Key acceptance criteria, Figma links, required formats..."`.
  - Line 611: `${c.name} (${c.company || 'Private'})` -> `'Private'` is hardcoded English.
  - Line 613: `placeholder="Select Client..."`.
  - Lines 625–627:
    - `{ value: 'Fixed', label: 'Fixed Milestone' }` (hardcoded English).
    - `{ value: 'Hourly', label: 'Hourly Time & Materials' }` (hardcoded English).
    - `{ value: 'Retainer', label: 'Monthly Retainer' }` (hardcoded English).
  - Line 636: `placeholder="e.g. Mobile Banking App UX Audit & Redesign"`.
  - Line 647: `placeholder="Key milestones, tech stack requirements, deliverables..."`.
  - Line 164: Fallback client name `'Client'`.
  - Lines 379, 396, 405: Inline ternaries for `"Hours:"`, `"Over estimate"`, and `"Due:"`.

### D. Focus Time Tracker & Manual Entry Modal (`FreelanceTimeTrackerView.tsx`)
- **Hardcoded State & Buttons**:
  - Line 56: Default input state `'Sprint execution & feature implementation'`.
  - Line 167: Fallback `'Sprint Task'`.
  - Line 199: Fallback `'Client'`.
  - Line 201: Fallback `'Project'`.
  - Line 305: French defaults Pomodoro modes to English (`'Sprint (25m)'` and `'Rest (5m)'`).
  - Line 444: `<span>Pomodoro (25m)</span>` button text hardcoded in English.
- **Hardcoded Toasts**:
  - Lines 221–230: `showToast` has hardcoded English `title: 'Time Logged'`, `message: "... logged to ..."`, and button label `Invoice`.
  - Lines 236–245: `showToast` has hardcoded English `title: 'Invoice Generated'`, `message: "Drafted invoice for ... from unbilled hours."`, and button label `Preview`.
- **Manual & Edit Modals**:
  - Line 703: `${p.pricingModel} · ${p.clientName}` (`p.pricingModel` prints raw English enum `'Fixed'`, `'Hourly'`, `'Retainer'`).
  - Line 715: Inline ternary for task summary placeholder.
  - Lines 825, 957, 964–969: Edit and delete modal headers and confirmation prompts use ad-hoc string concatenation rather than dedicated translation keys.

### E. Invoices Hub & Generation Modal (`FreelanceInvoicesView.tsx`)
- **Hardcoded Terms & Placeholders**:
  - Line 65: Default terms `'Payment due within 15 days via SEPA wire or BaridiMob. Reverse charge VAT applies.'`.
  - Line 68: Default line item description `'Sprint Deliverable & Engineering Milestones'`.
  - Line 294: `{inv.clientCompany || 'Direct Client'}` -> `'Direct Client'` is hardcoded English.
  - Line 433: `placeholder="Select client..."`.
  - Line 444: Client sublabel `${c.company || 'Private'} · ${c.currency}` -> `'Private'` is hardcoded English.
  - Line 523: `placeholder="Qty"`.
  - Line 533: `placeholder="Rate"`.
  - Line 147: Fallback account holder `'Amine Bentouati'`.
  - Lines 321–326: Status values like `'Draft'` or `'Cancelled'` fallback to raw English enum.

### F. Proposals & Devis Pipeline (`FreelanceProposalsView.tsx`)
- **Missing / Broken Keys (Showing raw keys on screen)**:
  - Line 364: `t('free_clients_field_contact')` -> MISSING KEY.
  - Line 372: `t('free_clients_field_company')` -> MISSING KEY.
  - Line 381: `t('free_clients_field_email')` -> MISSING KEY.
  - Line 456: `t('free_invoices_currency')` -> MISSING KEY.
- **Hardcoded Attributes & Initial State**:
  - Line 62: Default scope items:
    - `'Discovery & user journey architecture'`
    - `'High-fidelity Figma UI design'`
    - `'Full-stack engineering & unit tests'`
  - Line 307: `title="Client accepted: spawn project deliverables and deposit invoice"`.
  - Line 366: `placeholder="e.g. Dr. Sofiane Cherbal"`.
  - Line 373: `placeholder="e.g. BioHealth Labs"`.
  - Line 384: `placeholder="contact@company.com"`.
  - Line 393: `placeholder="e.g. Laboratory Sample Tracking Portal & UI Architecture"`.

### G. Tax & Cashflow Finance (`FreelanceFinanceView.tsx`)
- **Hardcoded Tax Brackets & Sliders**:
  - Lines 221–224:
    - `0% (Exempt)` -> French renders English `'Exempt'`.
    - `20% (Standard Solo)` -> French renders English `'Standard Solo'`.
    - `35% (High Bracket)` -> French renders English `'High Bracket'`.
  - Line 249: `€{netEhr}/hr (Gross €{grossEhr}/hr)` -> French renders English `'Gross'` and `'/hr'`.
- **Expense Modal**:
  - Line 365: `placeholder="e.g. OpenAI / Claude"`.
  - Lines 384–385: Subcontractor and Travel categories use inline ternaries.
  - Line 398: `placeholder="e.g. API usage and inference tokens for client prototypes"`.

### H. Invoice Preview & Printable Sheet (`InvoicePreviewModal.tsx`)
- Line 37: Fallback `'Atlas Studio'` (should be localized).
- Line 39: Fallback `'Algiers, Algeria'` (should be localized).
- Line 169: `'Net 15 · '` is hardcoded English.
- Line 173: Date formatting using system default instead of Arabic/French locale format.

### I. Freelance Store Actions & System Toasts (`src/services/store.ts`)
- Line 3204 (`billUnbilledHours`): `notes: \`Itemized bill for ${totalHours.toFixed(1)} hours of professional services.\``.
- Line 3206: `bankName: 'BEA / International Wire or Algérie Poste'`.
- Lines 3261–3265: `title: 'Invoice Created'`, `message: 'Invoice #... drafted.'`, `label: 'Preview'`.
- Lines 3302–3306: `title: 'Invoice Settled'`, `message: 'Client ... paid Invoice #... .'`, `label: 'Receipt'`.
- Lines 3313–3316: `title: 'Invoice Dispatched'`, `message: 'Invoice #... marked Sent to ... .'`.
- Lines 3492–3496: `title: 'Proposal Converted'`, `message: 'Proposal "..." accepted; project initialized with ... deliverables.'`, `label: 'Kanban'`.

### J. Seed Data Presets (`src/services/seedData.ts`)
- Demo clients, projects, deliverables, time logs, and proposals currently exist only in English.
- When switching language to French or Arabic, users see English demo project names ("Cloud Billing & Dashboard Refactor", "Casbah Media Group") and English notes ("Key European client...").

---

## 3. Architecture & Execution Plan

```
┌───────────────────────────────────────────────────────────────┐
│                     ATRIUM i18n DICTIONARY                    │
│   (src/utils/i18n.ts: EN, FR, AR — 45+ new consolidated keys)  │
└───────────────────────────────┬───────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ FREELANCE VIEWS  │    │ MODALS & SHEETS  │    │ TOASTS & STORE   │
│  - Dashboard     │    │  - Client Modal  │    │  - Time Logged   │
│  - Clients CRM   │    │  - Deliv Modal   │    │  - Inv Drafted   │
│  - Deliverables  │    │  - Project Modal │    │  - Inv Settled   │
│  - Time Tracker  │    │  - Manual Modal  │    │  - Prop Convert  │
│  - Invoices Hub  │    │  - Invoice Modal │    │  - Escrow Deduct │
│  - Proposals     │    │  - Proposal Mod  │    │  - Localized     │
│  - Finance & Tax │    │  - Print Preview │    │    Seed Data     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Proposed Action Steps (Ready for Execution Upon Approval):

1. **Dictionary Expansion (`src/utils/i18n.ts`)**:
   - Add all 45+ identified missing keys across `TRANSLATIONS_EN`, `TRANSLATIONS_FR`, and `TRANSLATIONS_AR`:
     - Fix broken keys: `common_active`, `free_clients_field_contact`, `free_clients_field_company`, `free_clients_field_email`, `free_invoices_currency`.
     - Add missing UI placeholders: `free_deliv_ph_stage`, `free_deliv_ph_select_project`, `free_deliv_ph_select_client`, `free_inv_ph_select_client`, `free_inv_ph_qty`, `free_inv_ph_rate`, `free_fin_ph_vendor`, `free_fin_ph_expense_desc`.
     - Add toast titles and messages: `toast_time_logged_title`, `toast_time_logged_msg`, `toast_invoice_gen_title`, `toast_invoice_gen_msg`, `toast_invoice_settled_title`, `toast_invoice_settled_msg`, `toast_prop_converted_title`, `toast_prop_converted_msg`.
     - Add tax slider labels: `free_fin_tax_exempt_label`, `free_fin_tax_auto_entrepreneur_label`, `free_fin_tax_standard_solo_label`, `free_fin_tax_high_bracket_label`, `free_fin_gross_label`.
     - Add generic fallbacks: `free_clients_private_badge`, `free_clients_direct_badge`.

2. **Clean Up Views & Modals (Remove Hardcoded Strings & Ternaries)**:
   - In `FreelanceDashboardView.tsx`, replace inline strings with dictionary lookups.
   - In `FreelanceClientsView.tsx`, replace `'Private Client'` and placeholders with `t(...)`.
   - In `FreelanceDeliverablesView.tsx`, replace pricing options and placeholders with `t(...)`.
   - In `FreelanceTimeTrackerView.tsx`, replace Pomodoro strings and toast messages with `t(...)`.
   - In `FreelanceInvoicesView.tsx`, replace `'Direct Client'`, placeholders, and default terms with `t(...)`.
   - In `FreelanceProposalsView.tsx`, fix the 4 broken key calls and hardcoded tooltips.
   - In `FreelanceFinanceView.tsx`, localize slider labels and expense placeholders.
   - In `InvoicePreviewModal.tsx`, localize `'Net 15'` and studio metadata.

3. **Localized Seed Data Engine (`src/services/seedData.ts`)**:
   - Provide localized demo datasets or dynamic getter functions for demo clients, projects, and deliverables matching the active language (e.g. French: "Refonte Tableau de Bord SaaS", Arabic: "تطوير لوحة التحكم السحابية").

4. **Verification & Testing**:
   - Execute `compile_applet` and `lint_applet` to confirm 0 TypeScript errors.
   - Run `npm run test` to verify all unit tests pass.
   - Verify layout direction (RTL/LTR) and UI rendering in English, French, and Arabic.
