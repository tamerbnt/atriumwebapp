# Viewport-Fit Layout & Single-Action Progression Optimization

A focused ergonomic overhaul of the Atrium ERP & CRM guided onboarding experience to enforce a strict viewport-height budget (100vh lock, zero document scrolling), eliminate visual card cropping on laptop and desktop displays, and unify single-action progression by removing redundant "Continue" buttons on auto-advancing selection screens.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned and confirmed with the user:
> 
> - **Viewport Budget & Scrolling**: Screen is strictly locked to `100vh` (`max-h-screen overflow-hidden`) with zero global document scrolling. Only the 160+ business activity catalog in Step 6 utilizes an internal scrollable list.
> - **Progression Mechanics**: Single-choice question cards (Steps 1, 3, 4, 5, 7) utilize auto-advance on click and hide the redundant bottom "Continue" button. Only multi-input forms (Step 0) and the final launch screen (Step 8) feature a primary progression button.
> - **Card Density & Spatial Proportions**: Transitioned to responsive compact card grids with proportional vertical padding (`p-3 sm:p-3.5`), optimized title leading, and balanced right-column preview scaling so all elements remain 100% visible without cropping across 768p, 900p, and 1080p viewports.

---

## 1. Overview & Core Concept

- **What It Delivers**: A crisp, unified onboarding screen that sits effortlessly within the user's browser viewport without triggering vertical page scrollbars or cutting off bottom buttons and cards.
- **Target Experience**: Seamless, cinematic, and fast-paced interaction inspired by Higgsfield, Claude, and Google, keeping the user in full flow.
- **Key Problem Solved**: Eliminates accidental scroll jumping, cut-off cards, and double-action confusion where users had both an auto-advancing card click and a bottom "Continue" button.

---

## 2. User Experience & Visual Design

### A. Viewport Lock Architecture
- Container converted to `h-screen max-h-screen overflow-hidden flex flex-col justify-between`.
- Top bar and footer maintain compact single-row layouts (`py-2 sm:py-3` and `py-2`).
- Main workstation area occupies `flex-1 min-h-0 flex items-center justify-center`.

### B. Progression & Navigation Contract

| Step Index | Question Description | Input Pattern | Progression Mechanism | Bottom Action Footer |
| :--- | :--- | :--- | :--- | :--- |
| **Step 0** | Claim Workspace & Admin Credentials | Multi-field form + Wilaya + Promo | Explicit Continue Button click | `[Back] (hidden) ... [Continuer →]` |
| **Step 1** | Core Operational Challenge | Single card select (6 options) | Instant 220ms Auto-Advance | `[← Précédent] ... (No Continue btn)` |
| **Step 2** | Strategic Goal Blueprint | Blueprint Modal Trigger (6 goals) | "Appliquer & Continuer" inside modal | `[← Précédent] ... (No Continue btn)` |
| **Step 3** | Daily Customer Interaction | Single card select (6 options) | Instant 220ms Auto-Advance | `[← Précédent] ... (No Continue btn)` |
| **Step 4** | Team Scale & Hierarchy | Single card select (4 options) | Instant 220ms Auto-Advance | `[← Précédent] ... (No Continue btn)` |
| **Step 5** | Primary Settlement Flow | Single card select (4 options) | Instant 220ms Auto-Advance | `[← Précédent] ... (No Continue btn)` |
| **Step 6** | Specific Business Domain (160+ Catalog) | Search input + Trade chips | Trade chip click auto-advances | `[← Précédent] ... [Continuer →]` (if query typed) |
| **Step 7** | Referral Discovery Source | Single pill select (11 options) | Instant 220ms Auto-Advance | `[← Précédent] ... (No Continue btn)` |
| **Step 8** | Tailored OS Reveal & Launch | Synthesis card + Override dropdown | Launch Button click | `[← Précédent] ... [🚀 Lancer mon espace Atrium]` |

### C. Responsive Spatial Math & Anti-Crop Sizing
- **Card Padding**: Reduced from bulky `p-5`/`p-4` to balanced `p-3` (mobile) / `p-3.5` (desktop), maintaining generous internal touch areas without vertical height blowout.
- **Card Icon Lockup**: Compact `w-8 h-8 rounded-xl` container with `w-4 h-4` Lucide icons.
- **Typography Sizing**:
  - Main question titles: `text-xl sm:text-2xl font-black tracking-tight` (preventing multiline push).
  - Subtitles: `text-xs sm:text-sm text-neutral-400 line-clamp-1 sm:line-clamp-none`.
  - Option titles: `text-xs sm:text-sm font-bold text-white`.
  - Option descriptions: `text-[11px] sm:text-xs text-neutral-400 line-clamp-2`.
- **Right Column Preview Scale**:
  - Max container width constrained to `max-w-sm lg:max-w-md`.
  - Padding adjusted to `p-4 sm:p-5`.
  - Micro-mockup UI snippet heights scaled cleanly to prevent vertical push.

---

## 3. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOP BAR (py-2 sm:py-3)                          │
│  [Logo: Atrium OS] ─────────── [Replay Intro] [Language: FR | AR | EN] │
├────────────────────────────────────────────────────────────────────────┤
│             MAIN VIEWPORT (flex-1 min-h-0 items-center)                │
│ ┌──────────────────────────────────────┐ ┌───────────────────────────┐ │
│ │ LEFT COLUMN: FOCUSED CARD CONTAINER  │ │ RIGHT COLUMN: IDENTITY    │ │
│ │                                      │ │                           │ │
│ │  [ • • • • • • • • • ] (9 Micro-dashes)│ [Atrium OS Live Badge]    │ │
│ │                                      │ │                           │ │
│ │  <h1> Title (text-xl sm:text-2xl)    │ │ [Workspace Entity Card]   │ │
│ │  <p>  Subtext (text-xs sm:text-sm)   │ │  Mehdi Samih • Alger      │ │
│ │                                      │ │                           │ │
│ │  ┌────────────────────────────────┐  │ │ [Adaptive Vertical Badge] │ │
│ │  │ 2x3 or 2x2 Responsive Grid     │  │ │  99% Match • Category     │ │
│ │  │ (Auto-advance on click)        │  │ │                           │ │
│ │  │ (p-3 sm:p-3.5 compact cards)   │  │ │ [Micro Mockup Screen]     │ │
│ │  └────────────────────────────────┘  │ │  Terminal / Invoicing / BL│ │
│ │                                      │ └───────────────────────────┘ │
│ │  [← Précédent]        (Single Action)│                               │
│ └──────────────────────────────────────┘                               │
├────────────────────────────────────────────────────────────────────────┤
│                        FOOTER BAR (py-2)                               │
│  © 2026 Atrium ERP & CRM                    Version 4.3 • Algeria/MENA │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Verification & Testing Strategy

1. **Viewport Integrity Check**: Verify on standard resolutions (`1366x768`, `1440x900`, `1920x1080`) that no outer document scrollbar appears at 100% zoom.
2. **Progression Test**:
   - Verify that clicking an option in Steps 1, 3, 4, 5, 7 smoothly advances to the next card after 220ms without any flickering.
   - Verify that no redundant "Continue" button is shown on single-click steps.
   - Verify that the "Précédent" button remains accessible on all steps > 0 to allow easy backtracking.
   - Verify that micro-dashes remain clickable for non-linear step jumping.
3. **Modal Verification**: Ensure the `FeatureBlueprintModal` retains its rich interactive display with zero interference from viewport lock.
4. **Automated Suite**: Run `tsc --noEmit` and `npm test` (all 14 test suites pass).
