# Atrium Modal, Input, Dropdown & Toggle Unification Plan

A comprehensive design-system and component overhaul that fixes every modal, popover, form drawer, input, dropdown, and toggle across all business verticals through a single unified primitive layer. By eliminating popover clipping, boxed-string state corruption, floating-label notch collisions, mixed color tokens, unbranded form controls, and crowded modal/dropdown headers, every dialog becomes crisp, fluid, RTL-safe, and visually cohesive in both light and dark themes.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The plan incorporates all four architectural and visual decisions confirmed during clarification. One minor rollout default is highlighted below for confirmation before execution.

- **Confirmed Decision 1 — Single Modal Dropdown Standard**: `LabelSelect` stays the universal form dropdown inside modals and drawers, refactored to render its listbox menu through a portal-backed `LivePopoverPanel` so it inherits liquid highlight tracking, keyboard/focus management, and viewport collision detection without ever being clipped by modal scroll containers.
- **Confirmed Decision 2 — Header & Dropdown Decluttering**: All header bars inside dropdowns and popovers (account menu header, notification header, undo popover header, and the `header` slot/divider inside popover and menu primitives) are removed. Modal headers drop secondary subtitles everywhere in favor of a clean single-line title and close action.
- **Confirmed Decision 3 — Toggle & Multi-Option Standardization**: All binary, tri-state, and compact option switches up to 4 items use the branded `LiveSegmentedControl`. Any toggle group, radio group, or filter section with 5 or more options is promoted to a branded dropdown (`LabelSelect` in forms, `LiveSelect` in filter bars), while true multi-select preferences (such as multi-channel login permissions) keep clean multi-select controls or convert cleanly where mutually exclusive.
- **Confirmed Decision 4 — Full Rollout Scope**: Execution covers both the shared UI primitive layer and all ~163 modals/dialogs plus the 8 form-bearing slide-over drawers across every vertical module, alongside cross-cutting RTL directional and localization (`language` binding) fixes inside those modals.
- **Open Default — Multi-Select Checkbox Groups**: Where a modal currently uses independent checkboxes for non-exclusive boolean flags (e.g., property amenities or multi-credential sign-in toggles), single-choice pairs convert to 2-option `LiveSegmentedControl` (`Yes / No` or named states), while multi-flag groups convert to compact branded multi-state segmented rows or clean uniform toggle controls with identical surface tokens—confirm if you prefer independent `LiveSegmentedControl` Yes/No rows or a multi-select variant for those rare multi-flag cases.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes a single, deterministic modal form grammar across the entire workspace—spanning core dialogs, POS, Membership, Medical, Legal, Contractor, Agriculture, Education, Freelance, Auto Garage, Logistics, Manufacturing, Project Management, Real Estate, Trading, Venue, Settings, and Slide-Over Inspectors.
- **Target Audience / Persona**: Business owners, front-desk operators, clinicians, legal/accounting staff, and dispatchers working rapidly across desktop (`1440px`), tablet (`768px`), and mobile (`320px+`) terminals in French, English, and Arabic (RTL).
- **Key Value**:
  - **Zero Broken Interactions**: No clipped dropdown menus behind scroll wrappers, no nested double scrollbars, and zero boxed `new String()` state bugs breaking strict equality checks.
  - **Instant Visual Harmony**: Every text field, textarea, dropdown, segmented toggle, and action footer shares identical heights, corner radii, focus rings, and theme-calibrated warm neutral tokens.
  - **Breathable, Fluid Dialogs**: Removing dropdown headers, modal subtitles, nested card-in-card chrome, and rigid multi-column grids prevents overcrowding on smaller screens while keeping wide desktop workflows balanced.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Opening Any Modal or Form Drawer**:
   - The modal animates cleanly with a **single-line header** (concise title + close icon button, zero `subtitle`, zero multi-line badge clusters) and a **single scroll region** inside the dialog body.
2. **Interacting with Text Fields & Textareas**:
   - Every single-line input (`LabelInput`) and multi-line note box (`LabelTextarea`) rests on the unified field canvas (`#F5F1EC` light / `#292624` dark), brightening smoothly on focus (`#FFFFFF` light / `#2E2B28` dark) with the brand accent ring (`#BF431F` light / `#FF8F63` dark).
   - When focused or filled, the floating label rises cleanly into a precisely measured SVG border notch with vertical and horizontal clearance for tall Latin accents and Arabic Cairo diacritics—never colliding with the stroke.
3. **Selecting Options & Toggling Modes**:
   - Clicking any dropdown opens a **headerless**, floating `LivePopoverPanel` rendered at the document portal root, flipping upward automatically near viewport edges and never truncated by modal boundaries.
   - Switching modes (e.g., Walk-in vs Registered, Cash vs Card, Paid vs Pending, Gender) uses a full-width or balanced `LiveSegmentedControl` matching the Membership filter aesthetic. Groups exceeding 4 options present cleanly inside `LabelSelect`.
4. **Opening Top-Bar & Action Dropdowns**:
   - Account menu, notifications, undo history, and toolbar menus open directly into crisp option lists with **zero header chrome or top dividers**, putting actionable items immediately under the pointer.

### Visual Identity & Theme

- **Aesthetic Direction**: Warm, tactile precision workstation—restrained Swiss-grid discipline over warm paper/stone light neutrals and charcoal/obsidian dark surfaces, keeping decorative chrome out of forms.
- **Unified Color & Surface Token System**:
  - **60% Modal & Drawer Canvas**: Elevated panel surface (`#FFFFFF` light / `#262422` dark) with hairline dividers (`--atr-divider`).
  - **30% Unified Textbox & Control Surfaces**:
    - Rest state: `--lbi-bg` (`#F5F1EC` light / `#292624` dark) across **all** `LabelInput`, `LabelTextarea`, `LabelSelect` triggers, and read-only summary readouts—eliminating `bg-neutral-*`, `bg-white` dark mismatches, `--color-surface-bg` dark inversions (`#131211`), and ad-hoc `bg-[#2B2825]`/`#312D2A` drifts.
    - Focus state: `--lbi-bg-focus` (`#FFFFFF` light / `#2E2B28` dark) with `1.5px` brand ring.
    - Inset option cards / summary strips (only 1 elevation level below modal, never nested card-inside-card): `--atr-soft` / `#F3EDE7` light and `#1F1D1B` dark.
  - **10% High-Intent Brand Accent**: `--brand-fill` (`#C9461F`) for primary confirm CTAs, `--atr-acc-text` (`#BF431F` light / `#FF8F63` dark) for active focus strokes, floating active labels, and selected `LiveSegmentedControl` indicators. Status semantics (`#096B40`/`#5BE3A3` success, `#D97706` warning, `#C0283D`/`#FF7A8A` danger) always pair color with explicit text or icons.
- **Typography & Tabular Discipline**:
  - Preserves existing brand typography (`Barlow Condensed` display + `Inter` UI + `Cairo` Arabic RTL) with strict hierarchy: modal titles (`20px/24px` semibold, `text-wrap: balance`), floating labels (`13px` medium scaled smoothly in the notch), field values (`13px` regular), captions (`12px`).
  - All numeric quantities, prices, dates, durations, and currency fields strictly enforce `tabular-nums` and proper RTL `unicode-bidi` / logical alignment (`text-start` / `text-end`, `ms-*` / `me-*`, `ps-*` / `pe-*`).
- **Spatial & Fluid Layout Geometry**:
  - **Standardized Control Height**: `40px` (`--btn-h`) default across all `LabelInput`, `LabelSelect`, `LiveSegmentedControl` (`md` / `lg` aligned cleanly), and action footer buttons (`AtriumButton` / `Button` + optional `LiquidButton` primary confirm). Removes arbitrary `42px / 44px / 46px / 48px` and `h-6..h-16` sizing discrepancies within and across modals.
  - **Responsive Grid Grammar**: Replaces brittle 4-, 5-, 6-, and 12-column form rows inside narrow modals with fluid CSS grids (`grid-cols-1 sm:grid-cols-2` default, `sm:grid-cols-3` only for compact triple-fields inside `max-w-lg+` modals, and `minmax()` auto-fit for banknote/metric grids), eliminating fixed pixel field widths (`w-16`..`w-96`).
  - **Single Elevation & Footer Discipline**: Modal padding (`24px`) exceeds inner field gap (`12px–16px`), avoiding cards-inside-cards, thick left accent borders, and unnecessary inner `<h4>` headers where whitespace or a hairline divider suffices.

### Interactive Feedback & Motion

- **Floating Label & Notch Math**: Dynamic SVG notch geometry matches the actual CSS active transform scale (`0.88` or `0.92` synced identically between JS measurement and CSS) plus dynamic vertical lift computed from the exact container height (`-H / 2`) rather than a hardcoded `-20px`. Long labels clamp cleanly with ellipsis at `calc(100% - 28px)` and compensate vertical clearance for Arabic Cairo glyphs so text never touches borders.
- **Portal Dropdown Kinetics**: `LabelSelect` popovers smoothly open/close in $\le 180\text{ms}$ via `LivePopoverPanel` with automatic collision flipping, `prefers-reduced-motion` support, and pointer/keyboard hover liquid indicator.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Synchronous Notch Calibration + Height-Aware Lift in Floating Controls**:
  - *Chosen Approach*: Unify the scale factor between CSS and JS notch calculation (`S` synced to actual scale), compute `translateY` from `--lbi-h` / dynamic height instead of hardcoded `-20px`, measure rendered glyph width accurately (accounting for Arabic/accented glyphs and `max-width` clamping), and build a companion `LabelTextarea` sharing the exact `.lbi` ring, background tokens, and top-anchored floating label behavior.
  - *Why*: Eliminates Issue #3 (raw `<textarea>`) and Issue #4 (tall/long label border overlap) across 100+ modals simultaneously from one root fix.
  - *Alternatives Considered*: Switching away from notched floating labels to static top labels everywhere was rejected because the user explicitly wants floating-label textboxes (`LabelInput` style) consistently used without border overlap.

- **Decision 2 — Portal-Backed `LabelSelect` + Unified Primitive Values**:
  - *Chosen Approach*: Refactor `LabelSelect` to render its dropdown menu inside a portalled `LivePopoverPanel` (headerless, matching `LiveSelect` keyboard & liquid motion), and fix `LabelInput`, `LabelSelect`, and `FilterSelect` to emit primitive `string` values (or clean event adapters without `new String()` wrappers) while migrating remaining call sites to `(val: string) => ...`.
  - *Why*: Fixes Issue #1 (dropdown clipping inside `Modal` / `KineticModalShell` + boxed `String` object bugs) and Issue #5 (unified branded dropdown behavior across forms, replacing all 17 native `<select>` elements).
  - *Alternatives Considered*: Keeping `position: absolute` with `overflow: visible` on modals would break scrollable tall forms on laptops and mobile screens.

- **Decision 3 — Strict 4-Option Cutoff for `LiveSegmentedControl` vs `LabelSelect`**:
  - *Chosen Approach*: Convert all custom pill bars, radio toggles, and compact 2–4 option selectors (including `KineticFilterModal` tile sections with $\le 4$ choices) to `LiveSegmentedControl`. Promote 5+ option selectors (e.g., 5-way audit action filters or multi-tier lists) to `LabelSelect` / `LiveSelect`, and standardize multi-select option tiles cleanly.
  - *Why*: Matches the Membership filter pattern, keeps `LiveSegmentedControl` single-line without horizontal overflow (`whitespace-nowrap shrink-0`), and directly satisfies Decision 3.

- **Decision 4 — Complete De-Headering of Dropdowns & Subtitles**:
  - *Chosen Approach*: Remove `header` rendering and top `<hr>` dividers from `LivePopoverPanel`, `LiveDropdownMenu`, `Menu`, `LiquidPanel`, `TopBar` account menu, `NotificationDropdown`, `UndoHistoryPopover`, and `LabelSelect` search chrome overhead; remove `subtitle` props from `Modal` headers and trim redundant header icon tiles/subtitles and excessive inner headings in custom `KineticModalShell` headers.
  - *Why*: Directly fulfills Issue #7 and removes vertical crowding so the modal's primary form sits higher above the fold.

- **Decision 5 — Canonical Modal Token & Button Contract**:
  - *Chosen Approach*: Remove all `bg-neutral-*` and ad-hoc hex textbox wrappers inside modals, enforce `--lbi-*` and `--atr-*` variables, unify all modal form inputs/selects at `40px` (`--btn-h`), standardize modal footer buttons to soft secondary `Button` + `AtriumButton`/`LiquidButton` primary action (eliminating raw `<button>` action mixes), and fix `t(..., language)` and logical CSS properties (`text-start`, `ps-*`, `pe-*`, `ms-*`, `me-*`) across every modal and drawer.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        SHARED DIALOG & POPOVER LAYER                       │
│                                                                            │
│  ┌──────────────────────┐   ┌────────────────────────┐   ┌──────────────┐ │
│  │   Modal / Kinetic    │   │   LivePopoverPanel     │   │  Dropdowns   │ │
│  │     ModalShell       │   │   (Portal @ body)      │   │  & Popovers  │ │
│  │ • Headerless sub     │   │ • Zero header / <hr>   │   │ • Menu       │ │
│  │ • Single scroll body │   │ • Viewport flip + z    │   │ • Notif      │ │
│  │ • Logical RTL layout │   │ • Shared by LiveSelect │   │ • Undo       │ │
│  └──────────┬───────────┘   │   & LabelSelect        │   └──────────────┘ │
│             │               └───────────┬────────────┘                    │
└─────────────┼───────────────────────────┼──────────────────────────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED FORM CONTROL PRIMITIVES                        │
│                                                                            │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │   LabelInput    │ │  LabelTextarea   │ │         LabelSelect          │ │
│  │ • CSS tokens    │ │ • Same .lbi ring │ │ • Floating .lbi trigger      │ │
│  │ • Synced notch  │ │ • Multi-line lift│ │ • LivePopoverPanel portal    │ │
│  │ • Height-aware  │ │ • Auto-clamp     │ │ • Searchable + primitive val │ │
│  │ • Primitive str │ │ • Primitive str  │ └──────────────┬───────────────┘ │
│  └────────┬────────┘ └────────┬─────────┘                │                 │
│           │                   │                          │                 │
│           ▼                   ▼                          ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                 Toggle & Grid Standardization Rule                   │  │
│  │   ≤ 4 options  ──▶  LiveSegmentedControl (size="md", single-line)     │  │
│  │   ≥ 5 options  ──▶  LabelSelect (in forms) / LiveSelect (in filters) │  │
│  │   All fields   ──▶  40px base height · fluid sm:grid-cols-1..3       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│            ALL APPLICATION MODALS (163) & FORM DRAWERS (8)                 │
│                                                                            │
│  Auth & Shell · Core Modals · Common/Staff · Settings · Print Modals       │
│  Agriculture · Appointment · Contractor · Education · Freelance · Garage   │
│  Legal/Notary · Logistics · Manufacturing · Medical · Membership · POS     │
│  Project Management · Real Estate · Trading · Venue/Rental · Filter Modal  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model, State & Style Contracts

- **String Primitive Emission Contract**:
  - `LabelInput`, `LabelSelect`, and `FilterSelect` expose clean string values (`onChange: (value: string) => void`) with optional typed legacy event helper only if explicitly needed—removing `new String(val)` boxed objects everywhere so React state, Zod/rule validators, and strict equality checks behave deterministically.
- **Notch & CSS Token Contract**:
  - Global `.lbi` CSS variables (`--lbi-h`, `--lbi-bg`, `--lbi-bg-focus`, `--lbi-scale`, `--lbi-lift`) replace static `-20px` and split hex colors.
  - `[data-up="true"]` label uses `translateY(calc(-50% - var(--lbi-lift))) scale(var(--lbi-scale))` with `max-width` clamping and `text-overflow: ellipsis` so long translations or Arabic glyphs stay inside the open SVG notch without colliding with side/top strokes.
- **Dropdown & Header Contract**:
  - `LivePopoverPanel`, `LiveDropdownMenu`, `Menu`, and `LiquidPanel` stop rendering top `header` slots/dividers.
  - `Modal` deprecates/ignores crowded `subtitle` rendering inside the header bar so every dialog uses a consistent, spacious single-line title + close trigger.

### Interactive Component & Rollout Mapping

1. **Wave 1 — Core Primitives & Token Layer (Resolves Systemic Root Causes)**:
   - Update `.lbi` styles and color tokens in global styles (`--lbi-bg`, focus rings, height-aware lift, synced scale, RTL text alignment, tall-glyph vertical clearance).
   - Fix `LabelInput` notch measurement + primitive string emission; create `LabelTextarea` with matching `.lbi` chrome; rebuild `LabelSelect` trigger + portalled `LivePopoverPanel` dropdown + primitive string emission; standardize `FilterSelect` primitive emission.
   - Strip `header` blocks from `LivePopoverPanel`, `LiveDropdownMenu`, `Menu`, `LiquidPanel`, `NotificationDropdown`, `UndoHistoryPopover`, and account menu; update `Modal` and `KineticFilterModal` to drop subtitle/header clutter and switch $\le 4$-option sections to `LiveSegmentedControl`.
2. **Wave 2 — Auth, Core Shared Modals, Staff, Settings & Print Modals**:
   - Refactor all shared core modals (`AppointmentModal`, `AuditLogViewerModal`, `CashClosureModal`, `CommandPaletteModal`, `ConcurrencyConflictModal`, `CpcaDeadlineModal`, `DesktopUpgradeModal`, `FeatureBlueprintModal`, `GoogleOAuthGuideModal`, `LeadModal`, `MemberModal`, `NotaryDeedModal`, `PinVerificationModal`, `StaffModal`, `VoucherModal`), Auth/Staff/Settings dialogs (`SalaryAdvanceModal`, `QuickPointageModal`, `StaffAttendanceSubView`, `PayslipPrintModal`, `SettingsFormulesTab`, `SettingsScreen` modals, Auth recovery/license modals), and `MemberSlideOverInspector` / `SlideInPanel`:
     - Replace every raw `<input>`, `<textarea>`, and `<select>` with `LabelInput`, `LabelTextarea`, and `LabelSelect`.
     - Replace `useKineticSpring=false` static fallback in `MemberModal` and `--color-surface-bg` in `LeadModal`.
     - Replace custom pill/checkbox toggles with `LiveSegmentedControl` ($\le 4$) or `LabelSelect` ($\ge 5$).
     - Remove nested `overflow-y-auto` containers inside `Modal`, equalize field heights to `40px`, convert dense 4/5/6/12-col grids to fluid responsive columns, unify footer buttons, fix hardcoded `text-left`/`text-right` RTL leaks, and localize remaining hardcoded French/English strings.
3. **Wave 3 — Vertical Modals & Form-Bearing Drawers (All Remaining Business Modules)**:
   - Systematically migrate all inline and standalone modals plus the 8 form-bearing slide-over drawers across **POS** (14 modals), **Freelance** (17 modals), **Education** (11 modals), **Contractor** (9 modals), **Agriculture** (9 modals), **Medical** (9 modals + 2 drawers), **Auto Garage** (8 modals + 1 drawer), **Logistics** (8 modals), **Manufacturing** (8 modals + 2 drawers), **Project Management** (8 modals/drawers + 1 drawer), **Trading** (8 modals), **Real Estate** (6 modals), **Venue** (6 modals), **Membership** (5 modals + inspector), **Legal** (5 modals + 1 drawer), and **Appointment** (4 modals + 1 drawer):
     - Eliminate all remaining raw `<input>`/`<textarea>`/`<select>`, `bg-neutral-*` input container mismatches, custom toggles, mixed field heights (`42/44/46/48` → `40`), fixed widths, nested headings, and missing `language` arguments in `t(key, language)` calls.
4. **Verification Gate**:
   - Run automated static verification (`compile_applet` and `lint_applet`) plus an automated modal sweep verifying zero native `<select>`, zero raw form `<input>`/`<textarea>` outside specialized widgets (e.g., PIN keypad hidden input / command palette search), zero boxed `new String()` handlers, zero `header=` dropdown renders, and clean rendering across Light/Dark and French/Arabic RTL.
