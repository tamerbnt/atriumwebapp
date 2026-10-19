# Onboarding Reveal Choreography & Docking Continuity Plan

Synchronize the onboarding reveal sequence so the canvas remains clean during the logo's travel. The left floating card and right-hand content will only reveal after the 5-cubes mark and ATRIUM wordmark finish their glide and dock into place at 5.65s, cascading the headline and feature cards in a smooth upward glide directly beneath the settled logo.

## User Review & Critical Decisions

> [!IMPORTANT]
> The premature 4.75s reveal trigger (`onCardArrivalStart`) will be eliminated. The terracotta screen will remain pristine with only the brand mark and wordmark traveling across it until 5.65s. Once the logo reaches its exact anchor position, the left card glides in, and the right-hand text and feature tiles cascade in from beneath the docked logo.

- **Confirmed Decision 1 (Reveal Timing)**: Keep all onboarding content (left form card, top controls, headline, and feature tiles) hidden during the 4.75s–5.65s glide. Reveal only after the logo finishes traveling and docks in place.
- **Confirmed Decision 2 (Cascade Animation)**: When the logo docks at 5.65s, the right-hand text, badges, and feature cards will animate in with a smooth fade and gentle upward glide (`translate-y-6` to `translate-y-0`, `duration-700`), blossoming directly underneath the anchored logo.
- **Confirmed Decision 3 (Left Card Entry)**: The left floating onboarding card will glide in horizontally (`translate-x-12` to `translate-x-0`) in tandem with the right-side cascade once the logo locks into position.

---

## 1. Overview & Core Concept

- **What It Does**: Fixes the visual collision seen in Screenshot_908 where the right-panel headline ("The Business Management OS for Modern Facilities") and cards were appearing while the logo was still in mid-air traveling across the screen.
- **Key Value**: Delivers the intended cinematic continuity: the user watches the logo travel across a clean terracotta canvas, dock into its permanent position, and act as the visual anchor from which the rest of the application interface seamlessly emerges.

---

## 2. Reveal Choreography & Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTER CHOREOGRAPHY TIMELINE                                                                │
│                                                                                             │
│  0.0s – 1.2s  │ Quincunx Convergence (Pure white canvas, 4 corner cubes + center hollow)    │
│  1.2s – 1.85s │ Portal Wipe (Shockwave ring & terracotta diamond monolith wipe)             │
│  1.85s – 3.85s│ Kinetic Wave Loop (ATRIUM sweeps with radiant beam, expands to normal)     │
│  3.85s – 4.75s│ 5-Cubes Revelation (Geometric logo docks beside ATRIUM at screen center)     │
│  4.75s – 5.65s│ Continuity Glide (Logo travels across clean terracotta canvas to anchor)    │
│               │ ◄── [NEW]: Right text & left card stay 100% hidden during travel!           │
│  5.65s+       │ Logo Docks in Place!                                                        │
│               │ ├─ Logo cross-fades into stationary anchor                                  │
│               │ ├─ Left onboarding card glides in from left (opacity 0 -> 1, translate-x)   │
│               │ └─ Right headline, badges & cards cascade up from beneath logo (translate-y)│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Implementation Details

### A. Update `src/components/auth/AtriumMonolith.tsx`
1. In the master sequence timer:
   - At 4.75s (`tGlide`): Trigger the glide motion to the measured target coordinates. Do NOT call `onCardArrivalStart` early.
   - At 5.65s (`tComplete`): Settle the monolith (`setPhase('settled')`) and call `callbacksRef.current.onIntroComplete?.()`.

### B. Update `src/components/auth/PowerOnboardingScreen.tsx`
1. Re-wire visibility states:
   - Synchronize `cardVisible` strictly with `introPhase === 'revealed'`.
   - The left floating card animates in when `introPhase === 'revealed'`:
     ```tsx
     className={`... transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
       introPhase === 'revealed'
         ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
         : 'opacity-0 -translate-x-12 scale-95 pointer-events-none'
     }`}
     ```
2. Choreograph the right panel cascade:
   - The logo anchor remains at the top of the column.
   - The text container directly below the logo (supertitle badge, headline, description, and feature cards) enters with a staggered upward glide:
     ```tsx
     className={`space-y-3.5 sm:space-y-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
       introPhase === 'revealed'
         ? 'opacity-100 translate-y-0 pointer-events-auto'
         : 'opacity-0 translate-y-6 pointer-events-none'
     }`}
     ```
   - The top header bar and bottom footer divider also fade in smoothly upon docking:
     ```tsx
     className={`transition-opacity duration-600 delay-100 ${
       introPhase === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
     }`}
     ```
3. Skip and Replay handlers:
   - When skipping (ESC or "Skip Intro"), immediately set `introPhase = 'revealed'` and `cardVisible = true`.
   - When replaying ("Replay Motion"), reset `introPhase = 'intro'` and `cardVisible = false`, and increment `replayKey`.

---

## 4. Verification Plan

1. **Clean Glide Inspection**:
   - Verify that during 4.75s to 5.65s, the screen is clean terracotta with only the traveling logo in flight.
   - Ensure no headline, badge, or card text is visible on the right while the logo is moving.
2. **Docking & Cascade Verification**:
   - At exactly 5.65s, verify that the logo docks into its anchor.
   - Confirm that the headline and feature cards slide up smoothly beneath the logo, while the left card glides in from the left.
3. **Multi-Run & Replay**:
   - Click "Replay Motion" and confirm the sequence replays cleanly from start to finish.
4. **Build & Automated Testing**:
   - Run `compile_applet`, `lint_applet`, and `npm test` to verify clean build and test status.
