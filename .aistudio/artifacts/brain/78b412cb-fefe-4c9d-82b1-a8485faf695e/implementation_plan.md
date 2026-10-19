# Dropdown Modernization & Kinetic Form Controls

Modernize and unify all legacy native HTML `<select>` elements across all 7 verticals of the Atrium platform with kinetic notched `LabelSelect` controls and compact `FilterSelect` toolbar capsules, featuring floating labels, terracotta interactive highlights, and responsive search filtering.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design parameters were confirmed through user clarification:
> - **Form Styling**: Kinetic notched border with floating SVG path label and terracotta interactive glow (`#C4785A`) matching the platform's desktop design system.
> - **Search & Filtering**: Automatic inline search field enabled whenever an option list contains 6 or more items, with instantaneous auto-focus and keyboard navigation.
> - **Modernization Scope**: Comprehensive replacement of all 45+ legacy `<select>` controls across all 7 application verticals (Freelance, Education, Project Studio, Venue & Rentals, Core CRM & Appointments, POS Shop, and Staff/Finance).
> - **Toolbar / Table Filters**: For inline table toolbars and header filters where floating notched borders would disrupt horizontal bar rhythm, a dedicated compact `FilterSelect` pill/capsule component ($32\text{px}$ height, rounded-xl, quiet chevron and filter icon) will be used.

---

### 1. Overview & Core Concept

- **What It Does**: Replaces every default operating system / browser `<select>` dropdown (which renders with harsh blue native rectangles, unstyled arrows, and rigid height) with two purpose-built, accessible, and reactive components:
  1. `LabelSelect`: Full-fidelity kinetic form control with dynamic SVG border notching, floating hopping-letter label, keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), smart upward/downward collision flipping, and auto-search when $\ge 6$ options are present.
  2. `FilterSelect`: Compact, high-density toolbar filter component with inline icon affordance, subtle border, chevron rotation, and instant status filtering for data tables and screen headers.
- **Target Audience / Persona**: Studio administrators, managers, instructors, cashiers, and freelance contractors managing high-volume enterprise operations, scheduling, and invoicing.
- **Key Value**: Delivers seamless visual harmony, prevents form clipping and label collisions in modals, and significantly accelerates option selection through keyboard traversal and auto-search.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Modal Form Selection (e.g. New Project, Client Assignment, Cohort Enrollment)**:
   - User opens the modal (e.g., "New Project" in Freelance Deliverables).
   - The dropdown presents a clean $40\text{px}$ container with a floating notch label ("Pricing Model", "Client *").
   - Clicking or pressing `Space`/`Enter` triggers a smooth $150\text{ms}$ popover animation with subtle backdrop blur and terracotta highlight borders.
   - If the list contains 6+ items (e.g., a list of 15 clients), the search bar appears focused immediately; typing narrows the list instantly.
   - The user traverses with arrow keys or clicks an item; the checkmark appears and the selection updates the form reactively.
2. **Table & Header Filter Selection (e.g. Pipeline Stage, Cohort Filter, Date Range)**:
   - User views a dense data table with a compact filter bar.
   - `FilterSelect` appears as a refined $32\text{px}$ capsule matching adjacent buttons and search inputs.
   - Clicking reveals a streamlined dropdown menu without obscuring adjacent data rows.

#### Visual Identity & Theme
- **Aesthetic Direction**: Functional SaaS / enterprise precision; desktop-first terracotta palette (`#C4785A` active glow, `#FCEEE8` subtle tint).
- **Color Palette & Tokens**:
  - Border default: `border-neutral-200 dark:border-neutral-800`
  - Border active / focus: `#C4785A` (kinetic SVG stroke)
  - Surface: `bg-white dark:bg-zinc-900`
  - Active item selection: `bg-[#C4785A]/10 text-[#C4785A]` with terracotta checkmark
  - Muted placeholders & chevrons: `text-neutral-400 dark:text-neutral-500`
- **Typography & Hierarchy**:
  - Primary text: $13\text{px}$ font size, medium weight (`font-medium`) with `truncate` protection.
  - Floating notch label: $10\text{px}$ uppercase tracking with fluid SVG notch clearance.
  - Sublabels & metadata: $10\text{px}$ neutral text (`text-neutral-400`).
  - Numbers & codes: Tabular figures (`tabular-nums`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Component Architecture (`LabelSelect` vs `FilterSelect`)**
  - *Chosen Approach*: Maintain `LabelSelect` for structured forms and modals (where inputs need floating labels, notch paths, and validation indicators) and create `FilterSelect` for horizontal toolbars, header strips, and table filter bars.
  - *Why*: Forcing kinetic notch borders into a $32\text{px}$ table toolbar looks cluttered and causes vertical rhythm breakage; standardizing on two dedicated components maintains aesthetic discipline across both contexts.
  - *Alternatives Considered*: A single monolithic component with a `variant="toolbar"` flag, which increases bundle complexity and makes SVG path coordinate math cumbersome.

- **Decision 2: Auto-Search Threshold at 6 Options**
  - *Chosen Approach*: Dynamically render the inline search input when `options.length >= 6` or when explicitly enabled with `searchable={true}`.
  - *Why*: Dropdowns with 3–5 items (e.g., "Fixed Milestone", "Hourly", "Monthly Retainer") do not need search overhead; larger lists (clients, students, courses, staff) benefit immensely from instant typing.

- **Decision 3: Universal Event Handler Adapter**
  - *Chosen Approach*: `LabelSelect` and `FilterSelect` emit an event object that simultaneously supports `(e) => setVal(e.target.value)` and `(val) => setVal(val)`.
  - *Why*: Across the 20+ legacy screen files, form handlers use varying conventions (`onChange={(e) => setData({ ...data, field: e.target.value })}` vs `onChange={(val) => setField(val)}`). A hybrid adapter guarantees drop-in replacement with zero regressions.

---

### 4. Technical Architecture & Data Strategy

#### Component Architecture & Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Atrium Web Application                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
           ▼                                                 ▼
┌─────────────────────────────┐                   ┌─────────────────────────────┐
│   Form & Modal Contexts     │                   │  Table & Toolbar Contexts   │
│       (LabelSelect)         │                   │       (FilterSelect)        │
├─────────────────────────────┤                   ├─────────────────────────────┤
│ • Kinetic SVG Notched Ring  │                   │ • Compact 32px Capsule Bar  │
│ • Floating Notched Label    │                   │ • Inline Filter / Sort Icon │
│ • Auto-Search (>= 6 items)  │                   │ • Subtle Chevron Rotation   │
│ • Smart Viewport Flipping   │                   │ • Direct Value / Event Emit │
│ • Height: 40px, Radius: 12px│                   │ • Density-Optimized Menu    │
└──────────────┬──────────────┘                   └──────────────┬──────────────┘
               │                                                 │
               ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           7 Platform Verticals                                │
├───────────────────────────────────────────────────────────────────────────────┤
│ 1. Freelance & Time: Projects, Deliverables, Invoices, Clients, Proposals     │
│ 2. Education & Academy: Admissions, Cohorts, Students, Timetable, Attendance │
│ 3. Creative Studio / Project: RH, Superviseur, Chef Projet, Direction, Crea   │
│ 4. Venue & Space Rentals: Space Categories, Hall Bookings, Event Status       │
│ 5. Core CRM & Members: Memberships, Acquisitions, Appointment Services/Staff  │
│ 6. POS Register & Shop: Split Tender Methods, Categories, Cashier Assignment  │
│ 7. Staff & Finance: Access Permissions, Terminal Roles, Ledger Filters        │
└───────────────────────────────────────────────────────────────────────────────┘
```

#### Systematic Replacement Matrix

| Vertical | File | Target Dropdowns | Replacement Component |
| :--- | :--- | :--- | :--- |
| **Freelance** | `FreelanceDeliverablesView.tsx` | Client selector, Pricing Model | `LabelSelect` |
| | `FreelanceClientsView.tsx` | Currency, Billing Cadence | `LabelSelect` |
| | `FreelanceFinanceView.tsx` | Invoice Client, Tax / Status | `LabelSelect` / `FilterSelect` |
| | `FreelanceProposalsView.tsx` | Proposal Client, Template Type | `LabelSelect` |
| | `FreelanceTimeTrackerView.tsx` | Client selector, Project selector | `LabelSelect` |
| **Education** | `EducationAdmissionsView.tsx` | Application Course, Funnel Stage | `LabelSelect` / `FilterSelect` |
| | `EducationStudentsView.tsx` | Enrollment Cohort, Gender, Guardian | `LabelSelect` |
| | `EducationTimetableView.tsx` | Cohort, Classroom, Instructor, Room Filter | `LabelSelect` / `FilterSelect` |
| | `EducationAttendanceView.tsx` | Session Cohort, Assessment Type | `LabelSelect` / `FilterSelect` |
| | `EducationFinanceView.tsx` | Tuition Payment Method | `LabelSelect` |
| **Creative Project** | `ProjectRhView.tsx` | Department, Employment Type, Status | `LabelSelect` / `FilterSelect` |
| | `ProjectSuperviseurView.tsx`| Project Lead, Milestone Stage | `LabelSelect` / `FilterSelect` |
| | `ProjectChefProjetView.tsx` | Deliverable Type, Priority | `LabelSelect` |
| | `ProjectCreaView.tsx` | Creative Asset Category, Print Type | `LabelSelect` / `FilterSelect` |
| | `ProjectDirectionView.tsx` | Department Filter, Fiscal Quarter | `FilterSelect` |
| **Venue & Rentals** | `VenueInventoryView.tsx` | Space Type (Hall, Studio, Desk), Status | `LabelSelect` / `FilterSelect` |
| **POS & Shop** | `ShopScreen.tsx` | Split Payment Method, Cashier Assignment, Category Filter | `LabelSelect` / `FilterSelect` |
| **Scheduler & CRM** | `SchedulerScreen.tsx` | Assigned Trainer/Coach, Room Selector | `LabelSelect` / `FilterSelect` |
| **Staff & Finance** | `FinanceStaffScreen.tsx` | Terminal Role, Permission Tier | `LabelSelect` |

---

### Implementation Phases (Upon Approval)

1. **Phase 1: Component Refinement**:
   - Update `LabelSelect.tsx` search auto-show threshold from `8` to `6` options.
   - Create `src/components/ui/FilterSelect.tsx` for table/toolbar filter drop-downs.
2. **Phase 2: Form Dropdown Conversions**:
   - Replace native `<select>` in `FreelanceDeliverablesView.tsx` ("Pricing Model", "Client *"), `FreelanceClientsView.tsx`, and `FreelanceProposalsView.tsx`.
   - Modernize Education forms (`EducationStudentsView.tsx`, `EducationTimetableView.tsx`, `EducationAdmissionsView.tsx`, `EducationFinanceView.tsx`).
   - Modernize Creative Studio forms (`ProjectRhView.tsx`, `ProjectSuperviseurView.tsx`, `ProjectCreaView.tsx`).
3. **Phase 3: Toolbar & Screen Filter Conversions**:
   - Replace toolbar filter `<select>` elements in `ShopScreen.tsx`, `VenueInventoryView.tsx`, `EducationAttendanceView.tsx`, and `ProjectDirectionView.tsx` with `FilterSelect`.
4. **Phase 4: Verification & Build Validation**:
   - Run `compile_applet` and `npm run lint` to guarantee clean TypeScript compilation and zero regressions across all views.
