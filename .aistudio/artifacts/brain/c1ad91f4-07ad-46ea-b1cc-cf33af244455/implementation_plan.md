# Systematic Adoption of Kinetic LabelInput & Expanding Seek

Implement a unified kinetic input and search experience across all screens, modals, and navigation surfaces of the Atrium ERP & CRM platform by replacing legacy HTML `<input>` elements with the notched hopping `LabelInput` component (extended for date, time, and barcode inputs) and replacing static search bars with the expanding `Seek` component (including TopBar Command Palette integration).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during Phase 1 clarification:

- **Confirmed Rollout Scope**: Full systematic sweep across all core modals, settings panels, legacy wizard flows, and vertical-specific screens (Freelance, Education, Rentals/Venue, Project & Milestone).
- **Date, Time & Barcode Handling**: Extend `LabelInput` with native date/time picker support, auto-floating notched states for preset calendar values, and clean tabular styling for RFID and barcode scanners.
- **TopBar Search Experience**: Embed the expanding `Seek` component into `TopBar.tsx`, opening an inline query field on click/expansion and triggering the universal Command Palette on `Enter` or hotkey.

---

## 1. Overview & Core Concept

Atrium ERP & CRM features a distinct desktop spatial interface styled in terracotta and obsidian tokens. While primary auth and member creation forms adopted the kinetic notched `LabelInput` and expanding `Seek` lens, secondary modals, administrative settings, and vertical screens still rely on standard HTML `<input>` boxes and static search fields.

This upgrade unifies the tactile kinetic design system throughout the entire platform:
1. **Kinetic Notched Text Boxes (`LabelInput`)**: Every text, numeric, date, time, password, and barcode input will use the animated SVG notched outline whose label hovers into the upper gap with letter-by-letter hopping physics on focus or value presence.
2. **Expanding Search Lens (`Seek`)**: Every table filter, catalog query, and directory search will use the compact circular lens that smoothly expands into an active search field with clear-out and keyboard shortcuts.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **TopBar Global Search**:
   - The user clicks the compact circular search lens in the TopBar.
   - The lens smoothly expands into an inline search bar with keyboard indicator `⌘K`.
   - Pressing `Enter` or typing a global query seamlessly launches the full Command Palette modal.
2. **Form Entry & Modal Dialogs**:
   - As users tab or click into any field (e.g., Staff salary, Product SKU, Project budget cap, CCP account number, Date of birth), the SVG border parts open at the exact width of the label.
   - Letters hop upward into the notch; on blur, if text is present, the notch remains neatly opened without overlapping content.
   - For `type="date"` and `type="time"`, the label docks safely in the notch, exposing the styled native picker without visual collision.
3. **Data Grid & Directory Filtering**:
   - In lists (Talents in HR, Timetable sessions in Education, Deliverables in Freelance, CCP slips in Compta), clicking the search lens glides open the field with live debounced filtering and an instant clear button `(×)`.

### Visual Identity & Theme Tokens

- **Accent Palette**: Desktop Terracotta (`#C4785A`, `--color-accent`), Hover (`#B3684A`), Accent Dim (`rgba(196, 120, 90, 0.15)`).
- **Surfaces**: Window Canvas (`#E8ECEF` light / `#0C0C0E` dark), Card Surface (`#FFFFFF` light / `#18181B` dark), Group Borders (`#EDF1F3` / `#232328`).
- **Typography**: Display headings in `Plus Jakarta Sans`, UI prose in `Inter`, all numbers, currency, dates, and CCP/RFID codes formatted with `font-variant-numeric: tabular-nums` or `font-mono`.

---

## 3. Key Product Decisions & Trade-Offs

- **Enhancing `LabelInput` vs. Multiple Separate Specialized Components**:
  - *Chosen Approach*: Enhance `src/components/ui/LabelInput.tsx` to directly support `type="date"`, `type="time"`, `min`, `max`, `step`, and prefix/suffix slot elements while preserving backward compatibility with existing usages.
  - *Why*: Maintains a single cohesive notch-geometry physics engine across the entire codebase rather than fragmenting into separate pickers.
- **TopBar Hybrid Seek + Command Palette**:
  - *Chosen Approach*: Embed `Seek` directly in `TopBar.tsx` with a custom `onSearch` handler that delegates to `onOpenCommandPalette()`.
  - *Why*: Delivers an immediate tactile micro-interaction in the navigation bar while maintaining access to deep system-wide command palette search.

---

## 4. Technical Architecture & Component Mapping

### Component Interaction Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TopBar Navigation Header                        │
│  [Facility / Role Selector] ────── [Active Category Title] ──── [Seek] │
│                                                                   │    │
│  (Click lens -> expands 260px -> Enter / Focus -> CommandPalette) ┘    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Active Workspace Screen                         │
├────────────────────────────────────────────────────────────────────────┤
│  List & Table Header:                                                  │
│    [Action Buttons] ────── [Filter Tabs] ─────── [Seek (live filter)]  │
│                                                                        │
│  Forms, Drawers & Modals:                                              │
│    ┌────────────────────────────────────────────────────────────┐      │
│    │  LabelInput [field="Full Name"] (text)                     │      │
│    │  LabelInput [field="Birth Date"] (date, auto-up notch)     │      │
│    │  LabelInput [field="Hourly Rate"] (number + tabular-nums)  │      │
│    │  LabelInput [field="CCP Account"] (10-digit validation)    │      │
│    └────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

### Phased File Implementation Roadmap

#### Phase A: Kinetic Foundation (`LabelInput` & `Seek` Enhancements)
1. **`src/components/ui/LabelInput.tsx`**:
   - Add specialized notch floating detection for `type="date"`, `type="time"`, `type="datetime-local"` so preset empty states never collide with browser picker placeholders.
   - Inject webkit calendar/time picker indicator styling to harmonize with terracotta theme.
   - Support optional `prefix` and `suffix` elements (e.g. currency symbols `DA`, `€`, `$`, or RFID scanner icons).
2. **`src/components/ui/Seek.tsx`**:
   - Ensure clean hit-state propagation, responsive `openWidth`, and keyboard shortcuts (`Enter`, `Escape`).

#### Phase B: TopBar & Core Application Modals
1. **`src/components/layout/TopBar.tsx`**:
   - Replace static trigger button with expanding `Seek` wired to `onOpenCommandPalette`.
2. **`src/components/modals/MemberModal.tsx`**:
   - Replace remaining raw `<input>` elements (Date of birth, Emergency contact name & phone, RFID / Barcode card ID) with `LabelInput`.
3. **`src/components/modals/AppointmentModal.tsx`**:
   - Replace custom service name, duration, price, and appointment date/time inputs with `LabelInput`.
4. **`src/components/screens/ShopScreen.tsx`**:
   - Replace raw inputs in all 4 POS modals (New/Edit Product, Custom Item, Park Order, POS Receipt Settings) with `LabelInput`.
5. **`src/components/screens/SchedulerScreen.tsx`**:
   - Replace raw inputs in New Session modal (Title, Capacity, Room, Coach) with `LabelInput`.
6. **`src/components/screens/FinanceStaffScreen.tsx`**:
   - Replace raw inputs in Add Staff modal (Salary, Payday, Name, Email, Phone) with `LabelInput`.
7. **`src/components/screens/SettingsScreen.tsx`**:
   - Replace raw inputs in Profile, Business/Branch Info, and Receipt/Fiscal settings with `LabelInput`.
8. **`src/components/auth/OnboardingWizard.tsx`**:
   - Modernize the legacy wizard steps and search inputs with `LabelInput` and `Seek`.

#### Phase C: Vertical Modules
1. **Project & Milestone (Category 13)**:
   - `ProjectRhView.tsx`: Replace static search bar on line 202 with `Seek`; convert Add Talent modal and walk-in forms to `LabelInput`.
   - `ProjectDirectionView.tsx`: Embed `Seek` for project portfolio filtering; use `LabelInput` for new project creation form.
   - `ProjectChefProjetView.tsx`: Embed `Seek` for collateral items and print orders; use `LabelInput` in print order creation.
   - `ProjectSuperviseurView.tsx`: Embed `Seek` for attendance and missions; use `LabelInput` in field expense declaration.
   - `ProjectComptaView.tsx`: Embed `Seek` for CCP payroll slips; use `LabelInput` in batch editing and search.
   - `ProjectCreaView.tsx`: Embed `Seek` for BAT deliverables list.
   - `CcpSlipModal.tsx`: Convert transaction reference inputs to `LabelInput`.
2. **Freelance & Solo (Category 16)**:
   - `FreelanceDeliverablesView.tsx`: Add `Seek` filter for deliverables; convert project & task creation inputs to `LabelInput`.
   - `FreelanceTimeTrackerView.tsx`: Add `Seek` for historical time logs; convert manual time entry to `LabelInput`.
   - `FreelanceProposalsView.tsx`: Add `Seek` for proposals; convert proposal draft inputs to `LabelInput`.
   - `FreelanceClientsView.tsx`, `FreelanceInvoicesView.tsx`, `FreelanceFinanceView.tsx`: Convert any remaining raw inputs to `LabelInput`.
3. **Education & Academies (Category 15)**:
   - `EducationTimetableView.tsx`: Add `Seek` for sessions and rooms.
   - `EducationAttendanceView.tsx`: Add `Seek` for students and roll-call search.
   - `RollCallModal.tsx`: Convert minutes late and excuse notes to `LabelInput`.
   - `EducationStudentsView.tsx`, `EducationCohortsView.tsx`, `EducationAdmissionsView.tsx`, `EducationFinanceView.tsx`: Convert remaining modal inputs to `LabelInput`.
4. **Venue & Rentals (Category 14)**:
   - `VenueRentersView.tsx`, `VenueInventoryView.tsx`: Convert raw inputs in space/renter modals to `LabelInput`.

---

## 5. Verification & Quality Gates

1. **Compilation**: Run `compile_applet` to ensure TypeScript builds with zero errors.
2. **Lint Validation**: Run `lint_applet` (`tsc --noEmit`) to verify strict typing on all form bindings and event signatures.
3. **Automated Unit Tests**: Execute `npm test` to verify voucher, quota, and Algerian PTT formatting integrity.
4. **Interactive Audit**: Verify that all inputs animate smoothly without layout shifts, label notches align correctly with input borders, and `Seek` expansion operates smoothly in both light and dark modes.
