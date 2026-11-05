# Pixel-Perfect Replication of Member Screen Experience on Staff Screen

Comprehensive architectural and design plan to bring the **Staff ERP Screen (`MembershipStaffView`)** into 1:1 structural, visual, and experiential alignment with the **Member Screen (`MembershipMembersView`)**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following issues and discrepancies between `MembershipMembersView` and `MembershipStaffView` were identified during deep inspection and are resolved in this plan:
> 1. **Duplicated List/Grid Toggle Eliminated**: `UniversalDataCollection` defaults `showViewToggle` to `true`, while the staff action bar also rendered a separate `LiveSegmentedControl` toggle. We will set `showViewToggle={false}` on `UniversalDataCollection` and provide a **single, unified 40px view switcher** on the right side of the master toolbar, exactly like `MembershipMembersView`.
> 2. **Pod Container Architecture**: Every functional block (Metrics Pulse and Master Collection/Sub-Tabs) will be wrapped in Atrium's signature grey pod container: `bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs`.
> 3. **40px Squircle Height Discipline**: All interactive elements in the toolbar and header will strictly enforce the 40px squircle standard:
>    - `Seek` search box: `shutSize={40}`, `openWidth={240}`, `className="!rounded-xl"`.
>    - Status filter switcher: `LiveSegmentedControl size="md"` (exact 40px height).
>    - Filter popover button: `h-10 px-3.5 rounded-xl border shadow-2xs`.
>    - View mode switcher: `LiveSegmentedControl size="md"` (exact 40px height).
>    - Export button: Branded `LiquidButton kind="export" size={40} tone="accent"`.
>    - Primary button in header: `AtriumButton variant="primary" size="md"` (`h-10 px-4 rounded-xl`).
> 4. **124px Metric Card Parity**: The workforce metrics pod will replicate the exact 3-card, 124px-tall grid layout (`h-[124px] p-5 rounded-[20px] flex flex-col justify-between`):
>    - Tile 1 (Pure White): Base Active Staff with `text-3xl font-black text-neutral-900 tabular-nums` and green indicator badge.
>    - Tile 2 (Pure White): Pointage & Attendance Alert with `text-3xl font-black tabular-nums font-mono` and terracotta badge.
>    - Tile 3 (`#1F1D1B` Dark Espresso Anchor): Monthly Payroll Budget & Inflow with `text-2xl font-black text-[#FB923C] font-mono tabular-nums`, border `#FB923C]/30`, and pulsing amber indicator dot.
> 5. **Sub-Tab Alignment**: The remaining sub-tabs (`Pointage & Présence`, `Salaires & Paie`, `Historique & Audit`) will also be wrapped in the same `#F8F9FA` pod container with 40px squircle Atrium controls, filter popovers, and universal table styling.

---

## 1. Overview & Core Concept

In `MembershipMembersView`, every element follows a disciplined hierarchy:
- Clean 1-line top header row with 44px squircle icon on the left, and 40px branch switcher + 40px primary CTA on the right.
- Elevated `#F8F9FA` banner pod with three 124px cards (two white, one dark espresso anchor).
- Master collection pod (`#F8F9FA`) with a three-zone toolbar: Section title & count badge on the left, search/filter controls in the middle, and view switcher + branded liquid export on the right.
- Zero duplicate toggles, zero mismatched button heights, and consistent 24px container radiuses.

This plan ports this exact experience to `MembershipStaffView`, preserving all staff ERP domain logic (pointage kiosk, weekly matrix, Algerian statutory payroll, and audit trails) while achieving 1:1 visual parity with the Member screen.

---

## 2. User Experience & Visual Design

### A. Layout Blueprint & Element Positions

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 0: TOP HEADER (Exact Member Screen Layout)                                         │
│ ┌───┐                                                                                 │
│ │ 👥│ Staff & Équipe                     [ 🏢 Atrium 1 ▾ ]  [ + Nouveau Collaborateur] │
│ └───┘ (44px Squircle)                    (40px Squircle)    (40px Primary AtriumButton)│
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 1: WORKFORCE HEALTH POD (bg-[#F8F9FA] rounded-[24px] p-5 border border-[#EDF1F3]) │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Section Header: Effectif & Santé Opérationnelle (فريق العمل ومؤشرات الحضور)         │ │
│ │ ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐  │ │
│ │ │ Tile 1: White Card    │ │ Tile 2: White Card    │ │ Tile 3: #1F1D1B Dark Anchor│  │ │
│ │ │ Base Active Staff     │ │ Pointage & Retards    │ │ Masse Salariale Mensuelle  │  │ │
│ │ │ ↗ 100% En Poste       │ │ 1 En retard (<30m)    │ │ +420 000 DZD · Clôture 28  │  │ │
│ │ │                       │ │                       │ │                            │  │ │
│ │ │ 7                     │ │ 88%                   │ │ 420 000 DZD                │  │ │
│ │ │ (3xl font-black)      │ │ (3xl font-black mono) │ │ (2xl font-black #FB923C)   │  │ │
│ │ └───────────────────────┘ └───────────────────────┘ └───────────────────────────┘  │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 2: BRANDED LIQUID TAB SWITCHER (40px Squircle, LiveSegmentedControl)               │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [ 👥 Annuaire & RH (8) ]  [ ⏱️ Pointage (7) ]  [ 💵 Salaires ]  [ 📜 Historique ]    │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 3: MASTER COLLECTION POD (bg-[#F8F9FA] rounded-[24px] p-5 border border-[#EDF1F3])│
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ UNIFIED 40px TOOLBAR (Exact Member Screen Three-Zone Pattern):                     │ │
│ │                                                                                    │ │
│ │ [Left Zone]                                                                        │ │
│ │ Liste des collaborateurs  ( 8 )                                                    │ │
│ │                                                                                    │ │
│ │ [Middle Zone]                                                                      │ │
│ │ [ 🔍 Seek (40px) ]  [ Quick Tabs (40px): Tous | En Poste | Congé ]  [ ⚡ Kiosk ]   │ │
│ │                                                                                    │ │
│ │ [Right Zone]                                                                       │ │
│ │ [ View Switcher: ≡ | ⊞ (40px) ]   [ 📥 Exporter (LiquidButton 40px) ]              │ │
│ │                                                                                    │ │
│ │ ────────────────────────────────────────────────────────────────────────────────── │ │
│ │ UniversalDataCollection<StaffMember> (showViewToggle={false})                      │ │
│ │ - Clean high-density rows with avatar, role, studio, RFID, contract, salary        │ │
│ │ - Pinned rows, multi-select floating action bar, and ActionNode [⋮]                │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Detailed Comparison & Fix Matrix

| Visual Dimension | Member Screen (`MembershipMembersView`) | Previous Staff Screen Failure | Target Parity Fix |
| :--- | :--- | :--- | :--- |
| **Top Header Primary Button** | `AtriumButton variant="primary" size="md"` (40px) next to branch switcher | Button was missing from top row, or rendered twice | Primary `+ Nouveau Collaborateur` strictly in top header row alongside branch dropdown |
| **KPI Pod Background** | `bg-[#F8F9FA]` with `rounded-[24px] p-5 border border-[#EDF1F3]` | Cluttered floating cards or custom container | Wrap in standard `#F8F9FA` container with identical padding |
| **Metric Card Height** | Exactly `h-[124px]` with `flex flex-col justify-between` | Variable heights without flex distribution | Enforce `h-[124px] p-5 rounded-[20px]` across 3 balanced columns |
| **Anchor Card Colors** | `#1F1D1B` background, `#FB923C` orange text, `#3D2817` pill badge | Inconsistent espresso styling | Exact color tokens: `#1F1D1B`, `#FB923C`, `#3D2817` with pulsing orange dot |
| **Toolbar Architecture** | Single 3-zone row inside the master pod (Title Left, Search/Filter Middle, View/Export Right) | Split across `StaffActionToolbar` and `UniversalDataCollection` | Single integrated toolbar directly inside the master pod container |
| **List/Grid Switcher** | Exactly ONE 40px `LiveSegmentedControl` in the right utility group | TWO toggles rendered simultaneously (one in toolbar, one in collection) | Single toggle via `LiveSegmentedControl size="md"`; set `showViewToggle={false}` in `UniversalDataCollection` |
| **Export Button** | `LiquidButton kind="export" size={40} tone="accent"` | Missing or standard text button | Official Atrium `LiquidButton` size 40 with animated state feedback |
| **Sub-Tabs (Pointage, Payroll, History)** | Unified card & table container | Inconsistent white card layouts | Wrap each sub-tab inside the `#F8F9FA` rounded pod with 40px squircle controls |

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removal of Separate `StaffActionToolbar.tsx`**:
  - *Chosen Approach*: Absorb all toolbar logic directly into `MembershipStaffView.tsx` matching `MembershipMembersView.tsx`.
  - *Why*: In `MembershipMembersView`, the toolbar is directly integrated into the master pod header, creating seamless alignment between title, search, filters, view toggle, and liquid export. Having a separate component created prop drilling, duplicated toggles, and layout fractures.
- **Decision 2: 3-Card KPI Pulse (Matching Member Screen)**:
  - *Chosen Approach*: Consolidate the workforce pulse into 3 cards (Active Headcount, Pointage Status, and Monthly Payroll Anchor) instead of 4 squished cards.
  - *Why*: The 3-card layout on desktop creates a spacious, readable grid that matches the Member screen's `grid-cols-1 sm:grid-cols-3 gap-4` and allows large 3xl numerals.
- **Decision 3: Single Master View Mode Switcher**:
  - *Chosen Approach*: Control view mode (`list` | `grid`) exclusively through the top-right `LiveSegmentedControl` and pass `showViewToggle={false}` to `UniversalDataCollection`.
  - *Why*: Completely eliminates the duplicate toggle bug reported by the user.

---

## 4. Technical Architecture & Component Mapping

```
src/components/screens/membership/MembershipStaffView.tsx
│
├── TopHeaderRow (H1 + 44px Icon + Branch Squircle Selector + 40px Primary AtriumButton)
│
├── WorkforceHealthPod (bg-[#F8F9FA] rounded-[24px] p-5 border border-[#EDF1F3])
│   └── 3-Metric Grid (h-[124px]):
│       ├── Tile 1: Active Staff Base (White Card, 3xl numeral)
│       ├── Tile 2: Pointage & Late Attendance Alert (White Card, 3xl mono numeral)
│       └── Tile 3: #1F1D1B Dark Espresso Anchor (Monthly Payroll, 2xl #FB923C mono)
│
├── SubTabSwitcher (LiveSegmentedControl size="md", 40px squircle height with liquid spring blob)
│
└── MasterContentPod (bg-[#F8F9FA] rounded-[24px] p-5 border border-[#EDF1F3]):
    │
    ├── [Tab: directory]
    │   ├── MasterToolbar (Title + Seek + Quick Status + Kiosk Scan + View Switcher + LiquidButton Export)
    │   └── UniversalDataCollection<StaffMember> (showViewToggle={false})
    │
    ├── [Tab: attendance]
    │   └── StaffAttendanceSubView (Integrated inside #F8F9FA pod with 40px week nav and punch matrix)
    │
    ├── [Tab: payroll]
    │   └── StaffPayrollSubView (Integrated inside #F8F9FA pod with 40px month nav, advances, and slips)
    │
    └── [Tab: history]
        └── StaffHistorySubView (Integrated inside #F8F9FA pod with 40px archive toggle)
```

---

## 5. Verification & Rollout Plan

1. **Step 1: Layout Refactoring in `MembershipStaffView.tsx`**:
   - Replicate the exact container classes, padding (`p-5`, `space-y-4`), and border colors (`border-[#EDF1F3] dark:border-neutral-800/60`).
   - Implement the 3-card 124px KPI grid.
   - Build the 3-zone master toolbar with 40px controls (`Seek`, `LiveSegmentedControl`, `LiquidButton`).
   - Set `showViewToggle={false}` on `UniversalDataCollection`.
2. **Step 2: Sub-View Harmonization**:
   - Wrap `StaffAttendanceSubView`, `StaffPayrollSubView`, and `StaffHistorySubView` to ensure their internal action bars and table wrappers match the `#F8F9FA` pod aesthetic and 40px control heights.
3. **Step 3: Verification Gate**:
   - Run unit test suite (`npm test`).
   - Run strict compilation and linting (`compile_applet` and `lint_applet` co-executed).
   - Restart dev server and verify responsive layout at 1440px desktop.
