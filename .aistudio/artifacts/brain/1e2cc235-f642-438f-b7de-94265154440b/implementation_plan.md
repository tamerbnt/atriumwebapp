# Onboarding Layout Fix & Refined Terracotta Selection Plan

An architectural and visual design plan to resolve vertical text overlapping on the questionnaire workstation, eliminate harsh orange borders across the interface, and implement refined hover-scaling interactions with terracotta typographic selection states.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned and confirmed with the user:
> - **Vertical Overflow Resolution**: Compact layout with smooth internal scrolling (`overflow-y-auto scrollbar-thin`) for taller questionnaire steps to guarantee zero text collision at any screen height.
> - **Card Border Restyling**: Elimination of harsh orange borders from both main container cards and all inner option cards, adopting sleek neutral translucent glass borders (`border-white/[0.08]`).
> - **Interactive Micro-Animation**: Smooth scale growth on hover (`scale-[1.018]`, `duration-200`) replacing border flashes.
> - **Selection State**: Selected cards feature distinct terracotta text coloring (`#E8622C` / `#C4785A`) paired with a subtle warm dark-glass background tint (`rgba(232,98,44,0.08)`), free from thick perimeter borders.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the Atrium onboarding experience by stabilizing the right questionnaire column against text overlaps across all 9 steps, while modernizing the card design system from aggressive orange outlines to quiet, ultra-premium dark glass with micro-scale hover feedback and terracotta typographic selection highlights.
- **Target Audience / Persona**: Business owners and operators onboarding their enterprises in Algeria (French, Arabic, and English locales) across desktop, laptop, and tablet displays.
- **Key Value**: Crisp typographic hierarchy without layout clipping, effortless scannability, and a tactile, fluid interaction feel.

---

## 2. User Experience & Visual Design

### 2.1 Layout De-Clustering & Overflow Engine
- **Right Column Shell**:
  - The right questionnaire card maintains its centered, elegant proportion (`max-w-2xl mx-auto h-[84vh] max-h-[820px]`).
  - The internal content area is restructured into a flex-column with `w-full min-h-0 flex-1 overflow-y-auto pr-1.5 scrollbar-thin` to cleanly accommodate multi-input steps (Step 0 credentials, Step 2 feature blueprints, Step 8 plan selector) without squeezing header titles or footer controls.
- **Card Content Spacing**:
  - Balanced item heights and margins so 2-column grids (Frustrations, Workflows, Team Sizes, Payment Methods) flow naturally without overlapping neighboring text.
  - Distinct typographic separation between card titles (`text-sm font-semibold tracking-tight`) and descriptions (`text-xs text-[#D9BEB0]/80 leading-relaxed`).

### 2.2 Glass Border & Palette Refinement
- **Two Main Outer Cards**:
  - Left Portrait Image Card: Removed `border-[rgba(230,74,25,0.25)]`. Updated to sleek dark glass perimeter: `border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.85)]`.
  - Right Questionnaire Card: Removed `border-[rgba(230,74,25,0.25)]`. Updated to matching neutral glass: `border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7)]`.
- **Option Cards (Steps 1 through 8)**:
  - Default State: Translucent neutral background (`bg-white/[0.035]`), subtle neutral border (`border border-white/[0.07]`), crisp warm white title (`text-[#FFF5EE]`), and soft muted copy (`text-[#D9BEB0]`).
  - Zero harsh orange borders in default or idle states.

### 2.3 Interactive Hover & Selection Motion
- **Hover State**:
  - Micro-scale transform: `group-hover:scale-[1.018]` with `transition-transform duration-200 ease-out`.
  - Gentle surface illumination: `hover:bg-white/[0.065]` with a subtle neutral highlight `hover:border-white/20`.
- **Selected State**:
  - Title and iconography illuminate in brand terracotta (`text-[#E8622C]`).
  - Surface transitions to a subtle warm glass tint (`bg-[rgba(232,98,44,0.08)] border-white/[0.14]`).
  - Minimalist selection badge with terracotta indicator, avoiding loud solid badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Internal Scrolling Container vs. Shrinking Font Sizes**
  - *Chosen Approach*: Standardize the active step wrapper with `min-h-0 flex-1 overflow-y-auto` while maintaining legible font sizes ($\ge 12\text{px}$).
  - *Why*: Accommodates localized Arabic and French translations that expand text length by 20–30% without clipping or causing microscopic fonts.
  - *Alternatives Considered*: Scaling down all typography (rejected: impairs accessibility and readability).

- **Decision 2: Typographic Highlight vs. Heavy Border on Selection**
  - *Chosen Approach*: Highlight selected cards through terracotta text color (`#E8622C`), subtle background warm tint, and gentle scale, without thick orange borders.
  - *Why*: Creates an airy, high-end Swiss modernist feel reminiscent of Higgsfield and modern design software, preventing visual heaviness.
  - *Alternatives Considered*: Glowing neon orange border (rejected: user explicitly requested removal of orange borders).

---

## 4. Technical Architecture & Component Structure

### Architecture & Component Hierarchy Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PowerOnboardingScreen                           │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │     Left Image Card           │  │     Right Questionnaire Card    │ │
│  │  - Border: border-white/[0.08]│  │  - Border: border-white/[0.08] │ │
│  │  - Higgsfield Portrait Frame  │  │  - Top Progress Micro-Dashes   │ │
│  │  - Dynamic Slide / Upload     │  │  - Step Title Header           │ │
│  └───────────────────────────────┘  │  ┌───────────────────────────┐ │ │
│                                     │  │ Step View (overflow-y-auto)│ │ │
│                                     │  │  - Step 0: Auth Form      │ │ │
│                                     │  │  - Step 1: Frustrations   │ │ │
│                                     │  │  - Step 2: Goal Blueprint │ │ │
│                                     │  │  - Step 3: Workflows      │ │ │
│                                     │  │  - Step 4: Team Scale     │ │ │
│                                     │  │  - Step 5: Settlement     │ │ │
│                                     │  │  - Step 6: Catalog Search │ │ │
│                                     │  │  - Step 7: Referral       │ │ │
│                                     │  │  - Step 8: Plan Selection │ │ │
│                                     │  │ (Cards: hover:scale-101.8,│ │ │
│                                     │  │  selected: text-terracotta│ │ │
│                                     │  │  border: border-white/7)  │ │ │
│                                     │  └───────────────────────────┘ │ │
│                                     │  - Bottom Helper & Navigation  │ │
│                                     └────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Component State & Handler Mapping

| Step / Flow | State Variable | Interaction & Style Change |
| :--- | :--- | :--- |
| **Main Containers** | `Left & Right Cards` | Replace `border-[rgba(230,74,25,0.25)]` with `border border-white/[0.08]`. |
| **Active Body Container** | `currentStep` | `w-full min-h-0 flex-1 overflow-y-auto pr-1.5 scrollbar-thin` preventing vertical collision. |
| **Step 1: Frustrations** | `primaryFrustration` | `border-white/[0.07] hover:scale-[1.018]`, selected title `text-[#E8622C] bg-[rgba(232,98,44,0.08)]`. |
| **Step 2: Goals** | `selectedGoalId` | Goal cards with clear vertical spacing, blueprint inspection button, selected title `text-[#E8622C]`. |
| **Step 3: Workflows** | `dailyWorkflow` | 2-column cards, `hover:scale-[1.018]`, selected `text-[#E8622C] bg-[rgba(232,98,44,0.08)]`. |
| **Step 4: Team Scale** | `teamScale` | 2-column cards with unboxed metadata badge, `hover:scale-[1.018]`, selected `text-[#E8622C]`. |
| **Step 5: Settlement** | `settlementStyle` | 2-column cards, `hover:scale-[1.018]`, selected `text-[#E8622C] bg-[rgba(232,98,44,0.08)]`. |
| **Step 6: Trade Catalog** | `selectedTradeId` | Search box, clean filter buttons, trade rows with `hover:scale-[1.015]`, selected `text-[#E8622C]`. |
| **Step 7: Referrals** | `referralSource` | Referral buttons with `hover:scale-[1.02]`, selected `text-[#E8622C] bg-[rgba(232,98,44,0.08)]`. |
| **Step 8: Plan Selector** | `selectedPlanTier` | 4 plan cards with pricing, `hover:scale-[1.02]`, selected `text-[#E8622C] border-white/20`. |
