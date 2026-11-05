# Implementation Plan - Members Screen & Filter Refinements

## User Requirements Summary
1. **Second Pod Header ("Liste des adhérents")**:
   - Remove the orange `<Users />` icon box.
   - Remove the small explanatory subtitle text.
   - Remove the separation divider line (`border-b`).
   - Merge the title and tools onto a single row: Title on left, search and filters in middle, export on right.
2. **Fullscreen Toggle**:
   - Remove the fullscreen toggle button from the members pod utility bar.
   - Add a fullscreen toggle entry inside the TopBar profile menu dropdown (`Account menu`).
3. **Branded Atrium "Exporter" Button**:
   - Replace the legacy export button with the genuine `@/atrium` `Button` (`size={40}`, `tone="soft"` or `"outline"`).
   - Ensure its height matches the 40px standard of adjacent tools with liquid bloom motion.
4. **Apple-Style Centered Filters Modal**:
   - Eliminate the off-screen bottom placement bug.
   - Implement as a centered Apple-style modal sheet with frosted backdrop (`backdrop-blur-2xl`), concentric squircle corners (`rounded-[26px]`), inset grouped filter sections, and Atrium terracotta accent triggers.

---

## Technical Changes

### 1. Second Pod Header & Tools Row Unification (`MembershipMembersView.tsx`)
- Transform the two-tier structure in `MembershipMembersView.tsx` into a single responsive flex row:
  - **Left Section**:
    - Clean title: `"Liste des adhérents"` (or Arabic localized text) in bold typography (`text-base font-bold`).
    - Pill count badge (`displayMembers.length`) adjacent to the title.
  - **Middle Section**:
    - `Seek` search pill (`shutSize={40}`).
    - `LiveSegmentedControl` quick status pills (Tous / Actifs / En attente).
    - Refined 40px Filters button with active badge indicator.
  - **Right Section**:
    - `LiveSegmentedControl` view switcher (List | Grid).
    - Branded Atrium `Button` for CSV Export (`size={40}`, `tone="soft"`, leading download icon).
  - Remove the fullscreen button completely from this row.

### 2. TopBar Fullscreen Toggle Integration (`TopBar.tsx`)
- Detect fullscreen status via `document.fullscreenElement`.
- Add a new entry to the `Menu` items in `TopBar.tsx`:
  - `id: 'fullscreen'`
  - Label: `"Mode plein écran"` / `"Quitter plein écran"` (with Arabic and English localizations).
  - Description: `"Basculer en plein écran"` / `"Exit Fullscreen"`.
  - Icon: `<Maximize2 size={15} />` / `<Minimize2 size={15} />`.
  - `onSelect`: Toggles `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`.

### 3. Apple-Style Centered Filters Modal Sheet (`MembershipMembersView.tsx`)
- Re-architect the filter popover into a centered modal dialog portalled to `document.body`:
  - **Backdrop**: `fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4`.
  - **Container**: `w-full max-w-lg max-h-[85vh] bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-2xl rounded-[26px] border border-black/5 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150`.
  - **Header**: Frosted bar with filter title, active match count, Reset button, and Close (`<X />`) circular button.
  - **Body**: Smooth scrollable content with Apple inset grouped segmented tiles for Gender, Age Groups, Dynamic Membership Plans, and Account Status.
  - **Footer**: Atrium primary action button (`size={40}`, `tone="accent"`) displaying matching member count, plus reset action.
  - **Accessibility**: Keyboard escape listener, backdrop click-to-close, focus trap.

---

## Verification Plan
1. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to verify TypeScript types and imports.
2. **Test Suites**: Run `npm test` and `npm run test:atrium` to ensure 100% test pass rate.
3. **Visual Verification**:
   - Inspect the Members view: verify single consolidated row, no icon, no subtitle, no divider line.
   - Verify Exporter button height is exactly 40px with Atrium liquid animation.
   - Open Filters: verify it opens centered in the viewport with Apple frosted glass design and Atrium brand accents.
   - Open TopBar profile dropdown: verify the fullscreen toggle functions properly.
