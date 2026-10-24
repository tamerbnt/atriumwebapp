# Hermès Warm Leather Terracotta & Satin Ceramic Button System

A targeted color and surface refinement of Atrium's button architecture, replacing the electric neon-orange tones with authentic **Hermès warm leather terracotta** (`#D46238`), featuring a satin luxury ceramic surface, 1px top bevel highlight, and tactile micro-etched depth.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following design parameters in Phase 1:
> - **Authentic Terracotta Pigment**: Hermès warm leather terracotta (`#D46238`) blending rich paprika and warm burnt copper—restoring genuine terracotta identity while completely eliminating safety/neon orange.
> - **Surface Texture & Finish**: Satin luxury ceramic with a 1px fine bevel edge highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.32)`) and subtle base grounding (`inset 0 -1px 0 rgba(0, 0, 0, 0.12)`).
> - **Feedback Rationale**: The previous iteration failed because `#FF6B3D` leaned into neon/safety orange. The new palette grounds the button in organic leather and architectural ceramic heritage.

---

## 1. Overview & Core Concept

### What It Does
Updates `AtriumButton.tsx` and core button design tokens to reflect genuine luxury terracotta:
1. Replaces bright neon orange with **Hermès warm leather terracotta** (`#D46238` base, `#DE693F` hover, `#C04E26` active).
2. Introduces a **satin luxury ceramic finish**: a micro-specular top light-catching bevel paired with a hairline perimeter border (`border-white/20`).
3. Retains clean, high-contrast white typography (`tracking-[-0.01em] font-semibold`) and responsive micro-spring click interactions (`active:scale-[0.98]`).
4. Harmonizes secondary, outline, and modal actions with the new warm copper-terracotta standard.

### Target Audience & Persona
Enterprise managers, creative directors, and business operators who demand a distinctive, warm, and distinctly luxury software presence without garish neon distractions.

### Key Value
- **Genuine Terracotta Heritage**: Instantly recognizable as warm Mediterranean / Hermès leather terracotta.
- **Understated Elegance**: Delivers high visual authority without harsh neon glare or muddy 70s brown clay.

---

## 2. User Experience & Visual Design

### Color & Surface Formula

```
┌─────────────────────────────────────────────────────────────┐
│                 PREVIOUS: Neon Safety Orange                │
├─────────────────────────────────────────────────────────────┤
│  Base:          #FF6B3D (neon / traffic cone orange)        │
│  Perception:    Lacked terracotta identity, too bright      │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│       NEW: Hermès Warm Leather Terracotta (#D46238)         │
├─────────────────────────────────────────────────────────────┤
│  Base Pigment:  #D46238 (rich warm paprika & copper)        │
│  Hover Bloom:   #DE693F (sunlit warm ceramic lift)          │
│  Active Press:  #C04E26 (deep copper leather burnish)       │
│  Top Bevel:     inset 0 1px 0 rgba(255, 255, 255, 0.32)     │
│  Bottom Bevel:  inset 0 -1px 0 rgba(0, 0, 0, 0.12)          │
│  Perimeter:     1px hairline border (white/20)              │
│  Resting Lift:  0 2px 8px rgba(212, 98, 56, 0.24)          │
│  Hover Lift:    0 4px 14px rgba(212, 98, 56, 0.36)         │
└─────────────────────────────────────────────────────────────┘
```

### Component Variant Specifications
- **Primary Variant (`variant="primary"`)**:
  - `bg-[#D46238] hover:bg-[#DE693F] active:bg-[#C04E26] text-white`
  - Fine border: `border border-white/20`
  - Satin Bevel: `shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.12),0_2px_8px_rgba(212,98,56,0.24)]`
  - Hover: `hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_0_-1px_0_rgba(0,0,0,0.14),0_4px_14px_rgba(212,98,56,0.36)]`
  - Active: `active:scale-[0.98]`
  - Text: `text-white font-semibold tracking-[-0.01em]`
- **Secondary Variant (`variant="secondary"`)**:
  - Clean solid satin surface in pure white or deep obsidian (`bg-white dark:bg-neutral-850`).
  - Bevel edge: `shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.3)]`.
  - Border: `border border-neutral-200/90 dark:border-neutral-700/80`.
- **Outline Variant (`variant="outline"`)**:
  - `bg-transparent text-[#D46238] border border-[#D46238]/60 hover:bg-[#D46238]/10 hover:border-[#D46238]`.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Paprika-Copper Base vs. Brown Clay
- **Chosen Approach**: Use `#D46238`, which sits precisely at the intersection of rich warm paprika and burnt copper.
- **Why**: Pure orange feels cheap and utilitarian (like traffic signs); pure brown feels dull and muddy. `#D46238` delivers the exact warmth associated with luxury saddlery and high-end Italian terracotta tile.

### Decision 2: Dual Inset Bevel (Top & Bottom)
- **Chosen Approach**: Combine a 1px top highlight with a subtle -1px bottom shadow inside the button.
- **Why**: Recreates the physical tactile edge of ceramic or embossed leather, giving the button tangible physical presence without heavy outer drop shadows.

---

## 4. Technical Architecture & Component Structure

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       AtriumButton Component                    │
├─────────────────────────────────────────────────────────────────┤
│  Top Bevel Highlight: inset 0 1px 0 rgba(255, 255, 255, 0.32)   │
│  Perimeter Border:    1px solid rgba(255, 255, 255, 0.20)       │
│  Core Pigment:        Hermès Warm Terracotta (#D46238)          │
│  Bottom Subtle Edge:  inset 0 -1px 0 rgba(0, 0, 0, 0.12)        │
│  Resting Lift:        0 2px 8px rgba(212, 98, 56, 0.24)         │
│  Hover Lift:          0 4px 14px rgba(212, 98, 56, 0.36)        │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌───────────────────────────┐               ┌───────────────────┐
│ Primary Screen CTAs       │               │ Modals & Drawers  │
│ - New Booking / Rental    │               │ - Confirm Dialog  │
│ - Add Member / Patient    │               │ - Member Modal    │
│ - Post Commercial Doc     │               │ - Lead Modal      │
│ - Save / Confirm          │               │ - Onboarding      │
└───────────────────────────┘               └───────────────────┘
```

### Implementation Checklist
1. Update `src/components/ui/AtriumButton.tsx` with `#D46238` base, `#DE693F` hover, `#C04E26` active, and dual inset bevel lighting.
2. Update button glow tokens in `src/index.css`.
3. Verify via `compile_applet`, `lint_applet`, and regression test suite.
