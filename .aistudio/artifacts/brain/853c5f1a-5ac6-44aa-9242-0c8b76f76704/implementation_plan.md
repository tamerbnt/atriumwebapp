# Pixel-Perfect Dynamic Motion Scale & Coordinate Alignment Plan

Eliminate the onboarding logo size jump, vertical coordinate shift, and kerning flicker by dynamically calculating the exact scale and translation offsets from the live target element bounding rect, while synchronizing the geometric ratios between the animated monolith and the stationary lockup.

## User Review & Critical Decisions

> [!IMPORTANT]
> Rather than relying on a hardcoded scale factor (`scale(0.55)`), the landing animation will dynamically measure the target lockup's exact live dimensions (`left`, `top`, `width`, `height`) via `getBoundingClientRect()`. The unscaled source lockup will be calibrated to the exact 72px-logo-to-64px-text ratio so that both elements match to 0.0px precision across all viewport sizes.

- **Confirmed Decision 1 (Dynamic Calculation)**: Compute the exact scale factor (`targetHeight / sourceHeight`) and coordinate delta (`targetLeft - sourceLeft`, `targetTop - sourceTop`) directly from the rendered DOM element when the glide begins.
- **Confirmed Decision 2 (Logo & Typography Ratio)**: Standardize on a balanced 72px 5-cubes mark paired with 64px ATRIUM wordmark and 18px gap. Match this exact ratio in `AtriumMonolith`'s unscaled state (144px logo to 128px text to 36px gap) so the aspect ratio is mathematically identical.
- **Confirmed Decision 3 (Sub-Pixel Target Anchor)**: Attach the measurement ref directly to the inner lockup (`<div className="flex items-center gap-4.5">`) rather than the outer flex container, removing the 8px vertical baseline error.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces heuristic scaling with automated geometric interpolation. When the kinetic sweep finishes and the logo begins its glide toward the right-hand panel, the system reads the live bounding rectangle of the target lockup on screen and glides to its exact sub-pixel boundaries.
- **Key Value**: Provides a smooth, continuous animation with zero perceptible jump, size change, or rasterization flash as the intro completes.

---

## 2. Mathematical Model & Geometry Synchronization

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ GEOMETRIC SYNCHRONIZATION MODEL                                                             │
│                                                                                             │
│  AtriumMonolith (Unscaled Source)               PowerOnboardingScreen (Target Lockup)       │
│  ┌───────────┐                                  ┌─────────┐                                 │
│  │ 5-Cubes   │  ATRIUM                          │ 5-Cubes │  ATRIUM                         │
│  │ 144px     │  128px                           │ 72px    │  64px                           │
│  └───────────┘                                  └─────────┘                                 │
│  Ratio: 144 / 128 = 1.125                       Ratio: 72 / 64 = 1.125                      │
│                                                                                             │
│  Dynamic Scale = Target Height / Source Height = 72px / 144px = 0.50000                     │
│  Delta X = Target.left - Source.left                                                        │
│  Delta Y = Target.top - Source.top                                                          │
│  Result: 100.0% Identical Bounding Geometry on Landing Frame                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### The Math Behind the Previous Jump
- **Previous Moving Logo Size**: 104px source $\times$ 0.55 scale = **57.2px**.
- **Previous Target Logo Size**: **72px**.
- **The Discrepancy**: The logo was landing at 57.2px, then jumping to 72px (a +14.8px / +26% pop).
- **The Correction**:
  - Target lockup: 72px logo, 64px text, 18px gap.
  - Source lockup: 144px logo (`size={144}`), 128px text (`text-9xl`), 36px gap.
  - Dynamic scale computed from live DOM: $s = \text{targetHeight} / \text{sourceHeight} = 72 / 144 = 0.5000$.
  - Scaled logo: $144 \times 0.5000 = 72.0\text{px}$.
  - Scaled text: $128 \times 0.5000 = 64.0\text{px}$.
  - Scaled gap: $36 \times 0.5000 = 18.0\text{px}$.
  - Every component matches with zero deviation.

---

## 3. Technical Implementation Architecture

### A. Refine Measurement in `PowerOnboardingScreen.tsx`
1. Attach `targetLockupRef` directly to the inner lockup `<div>` containing the 72px logo and 64px text.
2. In `updateAnchor`, capture the full rect (`left`, `top`, `width`, `height`) of `targetLockupRef.current`.
3. Pass `targetRect` to `AtriumMonolith` instead of just the outer container's top-left coordinates.

### B. Dynamic Glide Matrix in `AtriumMonolith.tsx`
1. Calibrate unscaled dimensions:
   - `FiveCubesLogo`: Set `size={144}`.
   - Letters container: 128px height, `gap-0`, total gap to logo: 36px (`gap-9`).
2. Calculate glide transform dynamically when entering `phase === 'glide'`:
   ```typescript
   const sourceRect = lockupRef.current.getBoundingClientRect();
   const exactScale = targetRect.height / sourceRect.height;
   const deltaX = targetRect.left - sourceRect.left;
   const deltaY = targetRect.top - sourceRect.top;
   setGlideTransform(`translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0) scale(${exactScale.toFixed(4)})`);
   ```
3. Set `transformOrigin: 'left top'` so the translation and scaling match the target rectangle's origin.
4. Smoothly cross-fade `opacity` over 300ms at the landing frame so the visual transition is seamless.

---

## 4. Verification Plan

1. **Pixel-Perfect Alignment Inspection**:
   - Inspect the landing frame at 5650ms. Verify that the 5-cubes mark does not grow, shrink, or shift horizontally/vertically.
   - Confirm that the ATRIUM text stays at its exact size with zero letter-spacing jitter.
2. **Replay Motion Verification**:
   - Trigger the "Replay Motion" button multiple times.
   - Verify that the Quincunx Convergence prelude, kinetic wave, and glide complete without any visual pop.
3. **Multi-Resolution Responsiveness**:
   - Test across 1280px, 1440px, and 1920px viewports to verify that the dynamic calculation handles different display scales cleanly.
4. **Build & Automated Testing**:
   - Run `compile_applet`, `lint_applet`, and `npm test` to verify zero errors or regressions.
