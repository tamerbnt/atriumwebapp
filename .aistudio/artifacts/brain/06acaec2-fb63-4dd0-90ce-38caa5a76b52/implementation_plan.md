# Atrium OS — TopBar Streamlining, Official Brand Orange Unification & Authenticated Onboarding Flow

Eliminates top bar clutter by removing all 11 category role pill switchers in favor of strict authenticated operator sign-in, replaces all legacy terracotta tones with Atrium's official vibrant brand orange across the entire platform, and adds authenticated workspace shortcuts to the onboarding interface.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed with the user during Phase 1:
> - **TopBar Role Switcher Removal**: Only the category role pill switchers (Membership, Appointment, POS, Education, Garage, Legal, Logistics, Contractor, Real Estate, Manufacturing, Agriculture) are stripped from the top bar. All standard utility controls (brand wordmark, Seek expanding search, command palette shortcut, date/time, notification center, and operator profile menu) remain intact.
> - **Role Switching Route**: Operators switch roles strictly by logging out and signing in with the staff or owner account assigned to that role. No secondary switcher popup is maintained in the header.
> - **Brand Orange Harmonization**: Full replacement of ancient terracotta (`#C4785A` and `#b3684a`) across all styles, components, and views with the official Atrium orange (`#d4522f` in light mode, `#E8643F` in dark mode, `#b03b1b` hover, and matching soft washes `rgba(212, 82, 47, 0.12)`).
> - **Onboarding Experience for Signed-In Users**: Authenticated users accessing the onboarding wizard are presented with a branded `AtriumButton` to "Return to Workspace", accompanied by a subtle "Login with another account" option that initiates a clean logout.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Purges the crowded category role pill clusters from the top navigation bar, restoring adherence to the 3-zone Top Bar Contract and preventing inadvertent role changes in operational environments.
  2. Aligns the entire color palette to the official Atrium brand orange (`#d4522f` / `#E8643F`), replacing muted brownish-terracotta tones with the vibrant, luxurious ceramic finish used in the logo, sidebar, and buttons.
  3. Provides seamless navigation within the onboarding screen for authenticated operators: first-time users explore the 10-step wizard, while logged-in operators can instantly jump back to their active workspace or log in as a different user.
- **Target Audience / Persona**: Multi-role team members, salon/clinic/garage staff, and enterprise managers operating on shared or dedicated workstations.
- **Key Value**: Clean, uncluttered desktop navigation; brand color consistency across all 16 business verticals; and secure, role-separated account authentication.

---

### 2. User Experience & Visual Design

#### A. TopBar Contract & Clean Header
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [Atrium Wordmark]  [Branch Indicator]       [Search Ctrl+K]  [Clock]  [Bell 🔔]  [Operator Avatar ▾]  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Zone 1 (Left)**: Single Atrium wordmark element with subtle facility/branch indicator.
- **Zone 2 (Center)**: Clean negative space without horizontal role pills or category badges.
- **Zone 3 (Right)**: Expanding `Seek` search lens (Cmd/Ctrl+K), real-time clock, notification center bell with live unread badge, and the operator avatar dropdown (featuring Fullscreen toggle, Settings, and Sign Out).

#### B. Unified Brand Orange Color Architecture
- **Primary Light Accent**: `#d4522f` (Executive Terracotta / Radiant Atrium Orange)
- **Primary Dark Accent**: `#E8643F` (Luminous Amber-Orange for dark surfaces)
- **Interactive Hover**: `#b03b1b` (Deep roasted copper)
- **Light Washes & Backdrops**:
  - `rgba(212, 82, 47, 0.12)` for subtle card highlights and active state backgrounds
  - `rgba(212, 82, 47, 0.18)` for focus rings and badges
  - `#FDF4F0` for ultra-light tinted container surfaces
- **Legacy Purge**: Systematic migration of all hardcoded `#C4785A`, `#c4785a`, and `#b3684a` declarations across `index.css`, layout components, modals, and screen views.

#### C. Onboarding Navigation for Authenticated Operators
- **First-Time Users (`!isAuthenticated`)**: Direct sequential progression through the 10-step strategic questionnaire (Frustrations → Goals → Workflows → Scale → Settlement → Trade Catalog → Referral → Workspace Identity → Plans).
- **Authenticated Users (`isAuthenticated === true`)**:
  - Right questionnaire header displays a primary branded `AtriumButton` (`size="sm"`, `variant="primary"`): **"Return to Workspace"** (`Retour à l'espace de travail` / `العودة إلى مساحة العمل`).
  - Directly beneath or adjacent to the button, a subtle text link: **"Login with another account"** (`Se connecter avec un autre compte` / `تسجيل الدخول بحساب آخر`), triggering `logout()` and opening `LoginScreen`.
  - First-time boot directly enters the workspace when authenticated, bypassing onboarding unless opened manually from settings.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Elimination of In-Bar Role Switching**
  - *Chosen Approach*: Remove all category role switcher pill clusters from `TopBar.tsx`. Role selection is governed exclusively by authenticated login session (staff credentials or 4-digit PIN).
  - *Why*: Eliminates security bypasses where any terminal user could click a pill to adopt owner or manager privileges, reduces header visual noise by over 60%, and complies with production RBAC standards.
  - *Alternatives Considered*: Retaining role pills behind a password modal. Rejected because true production environments authenticate users at login, not through ephemeral header toggles.

- **Decision 2: Automated Role Resolution on Operator Login**
  - *Chosen Approach*: When a staff member logs in via email/password or PIN, `login()` and `loginWithPin()` in `store.ts` automatically synchronize the active category role (`activeGarageRole`, `activeContractorRole`, `activeLogisticsRole`, etc.) from their assigned `StaffMember.role`.
  - *Why*: Ensures operators immediately land on their designated role view (e.g. Mechanic gets repair orders; Receptionist gets check-in desk; Dispatcher gets manifest scanner) without requiring manual role selection.

- **Decision 3: Global Color Variable Anchoring with Backward-Compatible Fallbacks**
  - *Chosen Approach*: Update `:root` and `.dark` CSS tokens in `src/index.css` and `src/atrium/styles/tokens.css` to canonical `#d4522f` and `#E8643F`, and batch-replace inline Tailwind arbitrary color classes (`bg-[#C4785A]` → `bg-[#d4522f]`).
  - *Why*: Guarantees that both modern tokenized components (`AtriumButton`, `LiveButton`, `AppShell`) and domain operational screens share the identical calibrated orange.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authentication & Role Flow                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                     ┌────────────────────────────┐
                     │        LoginScreen         │
                     │  - Email / Password Login  │
                     │  - 4-Digit Staff PIN Pad   │
                     │  - Fast Owner Access       │
                     └──────────────┬─────────────┘
                                    │
                     login() / loginWithPin()
                                    │
                                    ▼
                     ┌────────────────────────────┐
                     │      useAtriumStore        │
                     │  - currentUser (role, id)  │
                     │  - syncs activeRole for    │
                     │    current category        │
                     └──────────────┬─────────────┘
                                    │
                     ┌──────────────┴─────────────┐
                     ▼                            ▼
        ┌─────────────────────────┐  ┌─────────────────────────┐
        │        AppShell         │  │   PowerOnboardingScreen │
        │  - TopBar (No Role Pill)│  │   (if opened from menu) │
        │  - Sidebar (Role-Locked)│  │   - "Return to Work"    │
        │  - Domain Screen View   │  │   - "Login with another"│
        └─────────────────────────┘  └─────────────────────────┘
```

#### Planned Implementation Steps:
1. **TopBar Cleanup (`src/components/layout/TopBar.tsx`)**:
   - Remove lines 840–1495 containing all category role pill switchers and associated inline PIN verification modals (`agriPinTargetRole`, `pendingPinAction`).
   - Clean up unused role-switching props and local state.
   - Ensure the TopBar maintains a sleek, single-row height adhering to the Top Bar Contract.

2. **Store Role Synchronization (`src/services/store.ts`)**:
   - In `login` and `loginWithPin`, ensure the newly logged-in user's role maps appropriately to the active category's sub-role state (`activeGarageRole`, `activeLogisticsRole`, `activeContractorRole`, `activeLegalRole`, `activeRealEstateRole`, `activeManufacturingRole`, `activeAgriRole`, `activeMembershipRole`, etc.).
   - Ensure `logout` cleanly resets authentication and routes to `LoginScreen`.

3. **Onboarding Action Integration (`src/components/auth/PowerOnboardingScreen.tsx`)**:
   - In the right-side questionnaire container, detect `isAuthenticated`.
   - When authenticated, render the top action row containing:
     - `AtriumButton` (`variant="primary"`, `size="sm"`, `onClick={onSkipToDashboard}`) with localized text "Return to Workspace".
     - Secondary subtle action button with text "Login with another account" triggering `logout()`.

4. **System-Wide Orange Color Sweep**:
   - `src/index.css`: replace all legacy `#C4785A`, `#c4785a`, and `#b3684a` values with `#d4522f` and `#b03b1b`.
   - Component & View sweep: batch-update arbitrary class occurrences (`bg-[#C4785A]`, `text-[#C4785A]`, `border-[#C4785A]`, `ring-[#C4785A]`, `bg-[#C4785A]/15`, `bg-[#b3684a]`) across all components and vertical views to `#d4522f` and matching light washes.

5. **Verification & Testing**:
   - Run unit test suites (`npm test` and `npm run test:atrium`).
   - Run `compile_applet` and `lint_applet` to ensure zero compilation or type errors.
