# Implementation Plan: Full-Height Edge Slide-Over Drawer (480px) for Adhérents

Transform the member inspection panel in Category 1 (**Adhérents / Membership**) into an edge slide-over drawer anchored to the viewport's extreme right side with an dimming backdrop, fluid entrance animation, rounded container geometry matching Atrium's design tokens, and comprehensive member profile tools.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following requirements:
> 1. **Interaction Pattern**: Slide-over drawer with backdrop originating from the extreme right edge of the screen (`fixed inset-y-0 right-0 z-50`), instead of squeezing or shrinking the table container.
> 2. **Drawer Width**: Standard 480px (`max-w-[480px] w-full`) allowing full, unclipped visibility of all member tabs, sales, check-in history, and biometric RFID cards.
> 3. **Design Language**: Follows Atrium's visual identity with soft rounded corners (`rounded-l-[28px]` or floating inset margin), `#F8F9FA` background trays, tactile kinetic action buttons, and frosted backdrop dismissal.

---

## 1. Overview & Core Concept

- **What It Does**: Clicking any member row or card in `MembershipMembersView` smoothly slides open a 480px slide-over inspection drawer from the right edge of the window. The underlying table remains at full 100% width without layout shifts.
- **Backdrop & Dismissal**: A translucent darkened glass backdrop (`bg-black/35 backdrop-blur-xs`) fades in. Clicking the backdrop, pressing `Escape`, or clicking the top-right `✕` dismisses the drawer smoothly.
- **RTL Support**: On Arabic locale, automatically mirrors to slide from the extreme left edge (`fixed inset-y-0 left-0 rounded-r-[28px] animate-in slide-in-from-left`) with RTL typography and alignment.

---

## 2. Visual Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Viewport & Slide-Over Drawer Architecture                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Main Viewport (Full 100% Width Table / Grid)                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Pod Header: "Liste des adhérents" (Total Count Badge)                 │  │
│  │ Sub-Row: [Seek Kinetic] [Tous|Actifs] [Filtres] [List|Grid] [Export]  │  │
│  │ UniversalDataCollection (Members List / Grid)                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Backdrop (fixed inset-0 bg-black/35 backdrop-blur-xs z-50) ──────────┐  │
│  │                                                                       │  │
│  │                              ┌─ Slide-Over Drawer (w-[480px]) ──────┐ │  │
│  │                              │ • Header: Avatar + Name + Plan + [X] │ │  │
│  │                              │ • Quick Actions (4 Squircle Tiles)   │ │  │
│  │                              │   - Quick Check-in                   │ │  │
│  │                              │   - Edit Member                      │ │  │
│  │                              │   - Lock / Unlock Access             │ │  │
│  │                              │   - Renew / Add Sessions             │ │  │
│  │                              │ • Subscription Card (Days left, RFID)│ │  │
│  │                              │ • Tabbed Activity Segmented Control  │ │  │
│  │                              │   [Historique | Ventes | Réserv.]    │ │  │
│  │                              │ • Scrollable Tab Details Container   │ │  │
│  │                              │ • Footer Actions: Call, Book, Delete │ │  │
│  │                              └──────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key UX Details & Apple / Atrium Polish

1. **Unconstrained Table Layout**:
   - Removing the `max-w-[calc(100%-406px)]` restriction ensures the table maintains comfortable padding, column alignment, and zero awkward column wrapping when inspecting members.
2. **Apple Inset Groups & Atrium Squircle Tiles**:
   - Quick Action buttons feature 12px rounded squircles with dual icons and micro-labels.
   - Subscription overview box features dual metrics: expiration countdown pill and sessions progress meter.
   - Live segmented tab switcher with fluid active slider for **Historique**, **Ventes**, and **Réservations**.
3. **Keyboard & Touch Accessibility**:
   - Pressing `Escape` closes the drawer immediately.
   - Outside click on backdrop closes the drawer with smooth ease-out transition.

---

## 4. Technical Strategy

- In `src/components/screens/membership/MembershipMembersView.tsx`:
  - Keep the table wrapper at `w-full`.
  - Render the drawer using `createPortal(..., document.body)` so it floats cleanly above all layouts and docks.
  - Implement backdrop with `onClick={closeDetail}` and `aria-modal="true"`.
  - Add `useEffect` listener for `Escape` key to close detail.
  - Handle body scroll lock while drawer is open (`document.body.style.overflow = 'hidden'`).
- Verify build with `compile_applet` and run test suite.
