# Unified Island Canvas Alignment: Fixed-Elevation Content Card with Internal Scroll

## Summary
Architectural and visual design plan to align the primary white content container with the navigation sidebar dock so that its top and bottom borders and 32px rounded corners are permanently visible on screen. Rather than allowing the white card to stretch infinitely beyond the viewport, the white card becomes an anchored, floating spatial island matching the sidebar's 12px bottom baseline, with content scrolling freely inside an internal viewport (`#main-content-scroll`) and floating controls (ScrollJumpPill and bulk toolbar) anchored cleanly above the lower card boundary.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural direction below incorporates all confirmed choices from Phase 1 interactive clarification:

- **Confirmed Decision 1 (Internal Card Scrolling)**: The white container will maintain a fixed, responsive height matching the viewport (`flex-1 min-h-0`) with `overflow-hidden`. The inner viewport (`#main-content-scroll`) will handle smooth vertical scrolling (`overflow-y-auto`) so the outer card frame, borders, and rounded corners never clip or bleed off-screen.
- **Confirmed Decision 2 (Exact Sidebar Baseline Alignment)**: The bottom padding of the viewport (`pb-3` / 12px) will align the white card's bottom edge to the exact same horizontal baseline as the dark sidebar dock (`my-3`), creating a harmonious two-island desktop layout.
- **Confirmed Decision 3 (Anchored Floating Controls)**: The `ScrollJumpPill` and bulk selection toolbar will be positioned relative to the white container (`absolute bottom-5 left-1/2 -translate-x-1/2 z-40`), keeping them cleanly contained within the white canvas above its lower border rather than detached over the window background.
- **Confirmed Decision 4 (100% Futureproof & Universal)**: Applied centrally in `App.tsx` around `{renderActiveScreen()}`. Every current view across all 16 verticals—and every future screen created in the platform—will inherit this layout automatically with zero per-screen boilerplate.

---

## 1. Overview & Core Concept

### What It Does
Currently, `<main id="main-content-scroll">` is configured as the scrolling container, causing the inner white card (`<div className="bg-white rounded-[32px] ... min-h-[calc(100vh-80px)]">`) to stretch vertically without limit. In screens with extensive datasets (such as Salon Dashboard in Screenshot_79, POS ledgers, or Member lists), the white card extends far below the display, hiding its bottom border and rounded corners.

This enhancement converts the layout into a **Two-Island Spatial Desktop Architecture**:
1. **Left Island**: The slim dark obsidian navigation dock (`my-3 ml-3`, 12px margin, rounded-28px).
2. **Right Island**: The main content stage (`pb-3 pr-3 pl-2`, 12px margin, rounded-32px), whose top and bottom edges are permanently anchored and visible in the viewport.
3. **Internal Scroll Chamber**: All headers, charts, lists, and tables scroll smoothly *within* the white card, clipping naturally at the card's 32px border radius.

### Key Value & Visual Refinement
- **Desktop Elegance**: Eliminates awkward bottom cutoff seen in Screenshot_79; frames the application as a purposeful native desktop app (macOS / iPadOS Spatial style).
- **Constant Spatial Context**: Users always see the complete card boundary, giving immediate visual cues of the app's structural containment.
- **Unbroken Tooling**: Keeps `#main-content-scroll` intact for `ScrollJumpPill`, `AppleOverscrollProvider` rubber-band physics, and keyboard shortcuts.

---

## 2. User Experience & Visual Design

### Visual Layout & Spatial Math

```
┌─ Viewport (h-screen, bg-[var(--color-window-bg)] #E8ECEF / #0C0C0E) ────────────────────────────────────────────────────────┐
│                                                                                                                             │
│  ┌─ Left Dock (my-3 ml-3) ──┐  ┌─ Right Column (flex-1 h-screen flex flex-col) ──────────────────────────────────────────┐  │
│  │                          │  │                                                                                          │  │
│  │  [5-Cubes Logo]          │  │  ┌─ TopBar (pt-3 pr-3 pl-2 pb-2) ─────────────────────────────────────────────────────┐  │  │
│  │                          │  │  │  [Accueil]   [Role Switcher]            [Seek Search]  [Sync]  [Online]  [Avatar]       │  │  │
│  │  [Accueil] (active)      │  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  [Calendrier]            │  │                                                                                          │  │
│  │  [Clients]               │  │  ┌─ Anchored White Island (flex-1 min-h-0 pr-3 pl-2 pb-3 mb-0) ───────────────────────┐  │  │
│  │  [Boutique]              │  │  │  bg-white dark:bg-[#18181B] rounded-[32px] border border-[#E9EEF0] overflow-hidden │  │  │
│  │  [Historique]            │  │  │                                                                                    │  │  │
│  │  [Finances]              │  │  │  ┌─ Internal Scroll Chamber (#main-content-scroll overflow-y-auto p-6 sm:p-8) ───┐ │  │  │
│  │  [Paramètres]            │  │  │  │                                                                               │ │  │  │
│  │                          │  │  │  │  [Header & Title]                      [Siège Principal] [Recharge] [Nouveau] │ │  │  │
│  │                          │  │  │  │  [3-KPI Elevated Pods]                 [Velocity Histogram]                   │ │  │  │
│  │                          │  │  │  │  [UniversalDataCollection List/Grid]   [Dynamic Table Rows...]                │ │  │  │
│  │                          │  │  │  │  ...                                                                          │ │  │  │
│  │                          │  │  │  └───────────────────────────────────────────────────────────────────────────────┘ │  │  │
│  │                          │  │  │                                                                                    │  │  │
│  │                          │  │  │  ┌─ Floating Jump Pill (absolute bottom-4 left-1/2 -translate-x-1/2 z-40) ───────┐ │  │  │
│  │                          │  │  │  │  [ ↓ Défiler vers le bas / ↑ Revenir en haut ]                                 │ │  │  │
│  │  [NCH Platform]          │  │  │  └─────────────────────────────────────────────────────────────────────────────────┘ │  │  │
│  │                          │  │  │                                                                                    │  │  │
│  │  (Bottom: 12px baseline) │  │  │  (Bottom: Exact 12px baseline matching Left Dock)                                  │  │  │
│  └──────────────────────────┘  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│                                └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Motion & Physics
- **Inner Rubber-Band Overscroll**: Handled seamlessly by `AppleOverscrollProvider` because `#main-content-scroll` remains an `overflow-y-auto` container with spring resistance.
- **Scrollbar Styling**: Custom, slim, rounded scrollbar thumb (`rgba(196, 120, 90, 0.25)`) inside the white card that does not bleed into the outer window margin.
- **Bottom Cushioning**: `p-6 sm:p-8` inside `#main-content-scroll` with an extra `pb-12` ensuring the final row or footer elements never sit tight against the card's lower curved corner.

---

## 3. Technical Architecture & Implementation Steps

### 1. Structural Transformation in `App.tsx`
Change the main layout block from:
```tsx
{/* Current: Outer main scrolls, inner div stretches infinitely */}
<main id="main-content-scroll" className="flex-1 overflow-y-auto pr-3 pl-2 pb-3 min-w-0">
  <div className="bg-white dark:bg-[#18181B] rounded-[32px] p-6 sm:p-8 min-h-[calc(100vh-80px)] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
    {renderActiveScreen()}
  </div>
</main>
```
To the anchored two-island architecture:
```tsx
{/* Target: Anchored white island matching sidebar baseline with internal scroll chamber */}
<main className="flex-1 min-h-0 pr-3 pl-2 pb-3 min-w-0 flex flex-col">
  <div className="flex-1 min-h-0 bg-white dark:bg-[#18181B] rounded-[32px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden flex flex-col relative">
    {/* Inner Scrollable Viewport */}
    <div
      id="main-content-scroll"
      className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 overscroll-contain"
    >
      {renderActiveScreen()}
    </div>

    {/* Anchored Floating Smart Scroll Jump Pill */}
    <ScrollJumpPill
      targetContainerId="main-content-scroll"
      className="!absolute"
    />
  </div>
</main>
```

### 2. Positioning Adaptation in `ScrollJumpPill.tsx`
- When `className="!absolute"` is applied, the pill anchors to the bottom of the white card (`absolute bottom-4 left-1/2 -translate-x-1/2 z-40`) rather than `fixed` on the window.
- When bulk toolbar is visible inside the card, adjusts to `bottom-20` (`bottom-5` normally).

### 3. Bulk Selection Toolbar Coordination in `UniversalDataCollection.tsx`
- The floating bulk selection action toolbar (`data-atrium-bulk-toolbar="true"`) will also be adjusted so it floats cleanly within the white container boundary without clipping.

---

## 4. Verification & Testing Plan

1. **Geometry & Baseline Alignment**: Inspect in browser that the bottom of the white card and the bottom of the sidebar align precisely to the same 12px baseline.
2. **Scroll Continuity Across All 16 Verticals**:
   - Salon & Spa Dashboard (as shown in Screenshot_79)
   - Gym & Fitness Members CRM table
   - Contractor BOQ & Décomptes Provisoires
   - Real Estate Mandate Registry
   - Agriculture Parcels & Milking Parlor
   - Timetable & Class Schedules
3. **Scroll Jump & Physics**: Verify that clicking the jump pill scrolls `#main-content-scroll` smoothly to bottom and back to top within the card frame.
4. **Compilation & Test Suite**: Run `npm test`, `tsc --noEmit`, and `vite build` to guarantee zero regressions.
