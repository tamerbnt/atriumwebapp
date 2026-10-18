# Atrium Motion Identity: Quincunx Convergence Prelude

An architectural and motion design implementation plan to engineer a luxury geometric prelude before the kinetic typography loop in Atrium's intro sequence.

***

## User Review & Critical Choices Confirmed

Based on your selection, we will implement:
*   **Chosen Concept**: **Quincunx Convergence (5-Cube Architectural Assembly)** — Four solid geometric cubes glide inward from the deep corners along razor-thin blueprint coordinate lines, converging around an expanding hollow central frame cube. The assembly snaps into the official Atrium quincunx geometry, emits a subtle optical pulse, and seamlessly expands outward into the horizontal baseline for the "ATRIUM" kinetic typography loop.
*   **Pacing & Timing**: **Cinematic 2.0 seconds** (1.8s–2.2s range), paced to feel authoritative, deliberate, and exquisitely engineered without delaying access to the platform.

***

## 1. Motion Choreography & Phase Timeline

The entire intro sequence will be orchestrated into five harmonious phases totaling ~5.8 seconds, with the **Skip Intro** (`ESC` or button) available at every millisecond:

```
[0.0s ─────── 2.0s]        [2.0s ─────── 4.4s]        [4.4s ──── 5.1s]     [5.1s ──── 5.8s]     [5.8s+]
Phase 0 & 1: Prelude       Phase 2: Kinetic Wave      Phase 3: Logo Glide  Phase 4: Lockup      Onboarding Card
Quincunx Convergence       ATRIUM Typography Loop     Mark enters right    Letters pop in       Smooth arrival
```

### Phase Breakdown

#### Phase 0: The Void & Axis Guidelines (0.0s – 0.7s)
*   Canvas opens in absolute pitch black (`#000000`).
*   Faint, ultra-crisp hairline blueprint coordinate lines (`stroke: rgba(255, 255, 255, 0.07)`) and subtle corner registration tick-marks trace along golden-ratio diagonal axes.
*   Four solid corner cubes (exact corner squares of the Atrium mark) glide inward from off-center along the diagonals with smooth exponential deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`).

#### Phase 1: Hollow Core Ignition & Magnetic Snap (0.7s – 1.4s)
*   At the central nexus, the larger central cube blossoms outward from scale 0.2 to scale 1.0 with a crisp hollow frame (`stroke: #FFFFFF`, stroke width `6.5px`, `fill: none`).
*   The four solid corner cubes magnetically lock into their exact quincunx stations (quincunx layout: 4 solid corner cubes + 1 large central hollow frame cube).
*   The blueprint guideline hairlines contract and dissolve into the cube boundaries.

#### Phase 2: The Alignment Pulse & Horizontal Aperture (1.4s – 2.0s)
*   Upon perfect geometric alignment, the 5-cube constellation emits a subtle optical pulse (a soft, luxury radial flash of white light with zero glare slop).
*   The central hollow frame softly parts, and the constellation elements smoothly glide horizontally outward to form the baseline anchors for the 6 letters: **`A  T  R  I  U  M`**.
*   Fluidly hands off to the kinetic typography loop at the 2.0s mark.

#### Phase 3: The Kinetic Typography Wave (2.0s – 4.4s)
*   The kinetic typography wave sweeps across **ATRIUM**.
*   Letters outside the light loop stay tight, shrunken, and solid opaque black (`#000000`).
*   The active letter illuminated by the loop expands outward with luminous warmth and wide tracking.

#### Phase 4: Monolith Identity Lockup & Smooth Transition (4.4s – 5.8s)
*   The full 5-cubes mark glides in from the right.
*   The letters pop in letter-by-letter with an 85ms stagger cadence.
*   Brief 400ms brand hold, followed by a 500ms fadeout welcoming the interactive onboarding card.

***

## 2. Technical Architecture & Component Changes

### Component: `src/components/auth/AtriumMonolith.tsx`

1.  **Extended Phase State Machine**:
    ```typescript
    type IntroPhase = 'prelude' | 'wave' | 'logo' | 'lockup' | 'fading' | 'idle';
    ```
2.  **Prelude Geometric Renderer**:
    *   Create a specialized SVG geometric stage for the prelude:
        *   `DiagonalGuideLines`: 4 hairline vectors connecting corner anchors to the center with animated stroke-dashoffset or opacity.
        *   `CornerCube`: 4 dynamic `<rect>` elements moving along vectors `(-dx, -dy) -> (2, 2)`, `(dx, -dy) -> (72, 2)`, etc.
        *   `CenterHollowCube`: Dynamic `<rect fill="none" stroke="#ffffff">` scaling with spring easing.
        *   `OpticalPulseRing`: Micro-radial expansion ring on alignment.
3.  **Timing State Synchronization**:
    *   `tPreludeEnd`: `2000ms`
    *   `tWaveEnd`: `4400ms`
    *   `tLogoEnd`: `5100ms`
    *   `tLockupEnd`: `5800ms`
    *   `onCardArrivalStart`: Triggered at `5300ms` for seamless cross-fade overlap.
    *   `onIntroComplete`: Triggered at `5800ms`.
4.  **Instant Skip & Escape Handling**:
    *   Pressing `ESC` or clicking the top-right `Skip Intro` button instantly clears all phase timeouts, cancels animation frames, and triggers `onCardArrivalStart` / `onIntroComplete` without lag.

### Styles: `src/index.css`

*   Add refined keyframe animations for the geometric prelude:
    *   `@keyframes prelude-axis-trace`: Smooth hairline guideline reveal.
    *   `@keyframes prelude-cube-converge`: Exponential deceleration translation.
    *   `@keyframes prelude-core-bloom`: Smooth scale and hollow frame stroke illumination.
    *   `@keyframes prelude-aperture-burst`: Clean optical bloom fading quickly to transparent.

***

## 3. Verification & Acceptance Criteria

1.  **Visual Precision**: The 4 corner solid cubes and 1 central hollow cube match the exact proportions and corner radii of the Atrium 5-cubes logo.
2.  **Pacing**: Prelude runs for exactly 2.0s before smoothly opening into the typography wave.
3.  **Seamless Handoff**: No flickering, jump cuts, or layout shifts between the geometric prelude and the typography wave.
4.  **Skip Functionality**: Clicking `Skip Intro` or pressing `ESC` skips both the prelude and the wave immediately.
5.  **Replay Capability**: Clicking "Replay Motion Intro" restarts the entire sequence from Phase 0 with the geometric prelude.
6.  **Zero Build & Lint Errors**: Full compilation and test suite pass cleanly.
