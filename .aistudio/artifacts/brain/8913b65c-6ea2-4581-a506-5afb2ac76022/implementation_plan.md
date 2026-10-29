# Monolith Kinetic Animation Refinement & Seamless Onboarding Dissolve [COMPLETED]

A focused cinematic and transition overhaul of the Atrium introduction animation to eliminate the disjointed layout travel, introduce balanced 2D (X & Y axis) kinetic letter expansion centered on each glyph, and provide a continuous dissolve cross-fade into the dark Atrium OS onboarding workstation.

## Execution Summary & Status: COMPLETE
- **2D Letter Expansion (X & Y Axes)**: Implemented in `AtriumMonolith.tsx`. Letters expand from optical center (`origin-center`) with `scaleX` (0.38 -> 1.95) and `scaleY` (0.88 -> 1.22) under radiant illumination, smoothly settling to normal size (1.0, 1.0).
- **Zero Travel / Zero Glide**: Removed glide phase and coordinate translations. ATRIUM text and 5-cubes logo remain firmly anchored at viewport center.
- **Seamless Dissolve Cross-Fade**: Implemented in `PowerOnboardingScreen.tsx`. The workstation is permanently mounted underneath while the intro overlay executes a 600ms opacity dissolve fade upon conclusion or skip.
- **Verification**: Clean `tsc --noEmit` validation, all 14 unit test suites passed (`npm test`), and production build succeeded.

---

## 1. Overview & Core Concept

- **What It Delivers**: A unified, premium entrance experience that transitions without stutter or layout jumping.
- **Visual Feeling**: High-precision Swiss architecture meets contemporary fluid typography, dissolving naturally into the dark glassmorphic Atrium operating workstation.
- **Problem Solved**: Eliminates the jarring white-to-dark jump when the intro concludes and fixes the unnatural 1D "accordion" stretching of the letters.

---

## 2. Animation & Transition Sequence

```
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: QUINCUNX CONVERGENCE (0.0s – 1.2s)                            │
│ 4 corner solid cubes glide along diagonal trajectory axes into white   │
│ central hollow cube with Swiss registration crosshairs (+)             │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 2: TERRACOTTA PORTAL WIPE (1.2s – 1.85s)                         │
│ Clean architectural portal expander floods viewport into terracotta   │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 3: 2D KINETIC TYPOGRAPHY WAVE (1.85s – 3.85s)                    │
│ Light beam sweeps across A-T-R-I-U-M:                                  │
│ - Outside beam: compact base state (scaleX: 0.38, scaleY: 0.88)        │
│ - Under beam: illuminated in glowing radiant white, expanding in 2D    │
│   (scaleX up to 1.95, scaleY up to 1.22) from letter center            │
│ - End of wave: letters smoothly settle to normal size (1.0, 1.0)       │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 4: CENTRAL DOCKING REVELATION (3.85s – 4.75s)                    │
│ 5-cubes architectural logo reveals and docks beside centered ATRIUM    │
│ (Zero travel / Zero translation across the screen)                     │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 5: SEAMLESS DISSOLVE TRANSITION (4.75s – 5.4s)                   │
│ Intro overlay executes smooth 600ms opacity cross-fade dissolve into  │
│ the dark Atrium OS workstation already mounted underneath              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Architecture

### A. Kinetic Typography 2D Scaling Engine (`AtriumMonolith.tsx`)
- **Center-Anchored Transform**: Set `transform-origin: center center` explicitly on each letter span.
- **Biaxial Scale Math**:
  ```typescript
  // Base scale transitions from compact (0.38 / 0.88) to 1.0 / 1.0
  const currentBaseScaleX = 0.38 + easeNorm * (1.0 - 0.38);
  const currentBaseScaleY = 0.88 + easeNorm * (1.0 - 0.88);

  // Active letter scale under beam
  const scaleX = currentBaseScaleX + intensity * (1.95 - currentBaseScaleX);
  const scaleY = currentBaseScaleY + intensity * (1.22 - currentBaseScaleY);
  
  el.style.transform = `translate3d(${translateX.toFixed(2)}px, 0, 0) scaleX(${scaleX.toFixed(3)}) scaleY(${scaleY.toFixed(3)})`;
  ```
- **Vertical Centering**: Because both axes scale from `center center`, letters remain vertically aligned along the optical baseline without jittering.

### B. Removal of Travel / Glide
- Remove the `glide` phase and `targetRect`/`anchorCoords` translation logic.
- The logo and wordmark settle at screen center with confident presence.

### C. Continuous Dissolve Architecture (`PowerOnboardingScreen.tsx`)
- Instead of conditional conditional rendering (`if (showIntroAnimation) return <Intro />`), the Onboarding Workstation is **always mounted** in the DOM.
- The `AtriumMonolith` intro runs as a fixed overlay (`fixed inset-0 z-50 pointer-events-auto`).
- When the intro completes (or Skip is clicked), it enters a `dissolving` phase (`opacity-0 transition-opacity duration-600 ease-out pointer-events-none`).
- After 600ms, `showIntroAnimation` fully turns false, freeing memory while providing 100% visual continuity without a single frame of black flash or layout stutter.

---

## 4. Key Product Decisions & Trade-Offs

- **Centered Settle vs. Corner Travel**:
  - *Chosen Approach*: Keep the brand lockup centered and dissolve the background directly into the onboarding layout.
  - *Rationale*: Corner travel was visually disruptive, hard to calculate accurately across varying screen aspect ratios, and conflicted with the user's intent.
- **Mounted Underlay Dissolve**:
  - *Chosen Approach*: Mount the onboarding UI behind the intro canvas so the dissolve reveals real elements underneath.
  - *Rationale*: Eliminates white-screen flash and creates a fluid transition into the app.

---

## 5. Verification & Testing Strategy

1. **Typographic 2D Scale Check**: Inspect that each letter expands horizontally and vertically from its center without clipping or shifting its optical baseline.
2. **Dissolve Continuity Check**: Confirm that when the intro finishes or when "Skip Intro" is clicked, the screen fades smoothly into the dark Atrium OS interface with zero sudden jumps.
3. **Replay Intro Test**: Ensure clicking "Rejouer intro" in the top bar cleanly restarts the sequence and dissolves back into the workstation.
4. **Code Quality**: Verify with `lint_applet` (`tsc --noEmit`), `npm test` (all 14 tests pass), and `compile_applet`.
