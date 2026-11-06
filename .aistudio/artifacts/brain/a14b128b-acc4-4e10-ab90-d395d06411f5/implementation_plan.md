# Membership Members Screen — Kinetic Horizontal Spray, Accordion Drawer & Fluid Wave Inspector

Upgrade the **Adhérents (Membership Members)** screen with the exact physics, geometry, and component architecture from `Members2.dc.html`. Replaces the bottom-expanding hover bar with high-speed right-aligned horizontal spray action buttons (`.act`), adds a 72px-to-230px inline accordion quick drawer (`.dt`) housing metadata and the previous row actions (Freeze, Pin, Pay), and replaces the member slide-over drawer with the authentic 560px Atrium panel featuring real-time 1D shallow water wave gauges and a spring-loaded "Hold to Delete" button.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the Phase 1 clarification:
> - **Action Relocation**: The previous bottom-hover action buttons (Freeze/Reactivate, Pin to Top, Pay/Finance) will be cleanly relocated into a dedicated action cluster inside the expanded accordion drawer (`.dt`), ensuring zero loss of operational capabilities while cleaning up the main row card.
> - **Fluid Wave Simulation**: The remaining days and sessions vessels in the slide-over inspector will run the authentic 14-node 1D shallow water wave equation in real time, calculating levels from actual member expiration dates and session counters.
> - **Row Geometry**: 1:1 adoption of the 72px card height (`H = 72px`, `DH = 150px`), squircle initial avatars, and right-aligned staggered horizontal action button spray.
> - **Scope Isolation**: All changes are strictly contained to the Membership Members screen (`MembershipMembersView.tsx`), preserving stability across all other 15 platform verticals.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Right-Aligned Horizontal Action Fan (`.act`)**: On row hover or keyboard focus, three circular kinetic buttons spray out smoothly from right to left (`--i: 2` Modifier, `--i: 1` Écrire à, `--i: 0` Supprimer), accompanied by a rotatable chevron button (`.rb`) to toggle the accordion drawer.
2. **Inline Accordion Quick Drawer (`.dt`)**: Toggling `.rb` smoothly morphs the row height from 72px to 230px via a sub-step Euler spring (`sp(0, 150, 0.7)`). Inside, three rich metadata columns (Contact, Forfait, Notes) are displayed alongside primary actions (`Ouvrir la fiche`, `Archiver`) and the relocated operational action cluster (Freeze/Reactivate, Pin, Pay).
3. **Authentic 560px Slide-Over Detail Inspector (`.sp`)**: Replaces the generic drawer with the reference inspector:
   - **Header (`.sh`)**: 56px initials avatar, verified badge, RFID chip identifier (`ID: RFID-XXXXXX`), previous/next member cycle buttons, and close button.
   - **Tabbed Switcher**: Smooth segmented tabs (`Aperçu & Forfait`, `Accès & Séances`, `Ventes & Factures`).
   - **4 Quick Action Tiles (`.tl4`)**: `Enregistrer passage` (primary orange, triggers live session deduction and water ripple), `Modifier`, `Bloquer/Débloquer badge`, `Renouveler abonnement`.
   - **2 Dynamic Liquid Wave Vessels (`.sub`, `.gv`, `.vs`)**: Real-time water tanks for `Jours restants` and `Séances restantes` running a 14-node wave equation with interactive `.poke()` sloshing impulses.
   - **Plan & Contact Cards**: Real-time formula info, balance in DZD, and 1-click clipboard copy buttons for phone and email.
   - **Staff Notes**: Live auto-saving textarea.
   - **"Hold to Delete" Safety Button (`#phold`)**: Spring-driven fill animation requiring continuous press to confirm deletion, with instant undo toast support.
4. **Performance & Sleep Governor**: A unified 240Hz animation loop that automatically pauses (`cancelAnimationFrame`) when all springs settle, guaranteeing 0% CPU consumption at rest.

---

## 2. User Experience & Visual Design

```
Row Default (72px)
┌───┬────┬──────────────────┬───────────┬─────────┬──────────────┬───────────┬───────────┐
│ ☑ │ AV │ Karim Haddad     │ Full Pass │ ● Actif │ 2026-12-20   │ 6,500 DZD │ [ ⌕ ✎ ✉ 🗑 ⌄ ]
└───┴────┴──────────────────┴───────────┴─────────┴──────────────┴───────────┴───────────┘
                                                                        Hover Spray (.act)
Row Expanded (+150px = 230px)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Row Card (Same as above, chevron rotated 180°)                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Inline Quick Drawer (.dt)                                                               │
│ ┌───────────────┬───────────────┬───────────────────────┬─────────────────────────────┐ │
│ │ Contact       │ Forfait       │ Notes                 │ Actions (.db)               │ │
│ │ +213 661...   │ Full Access   │ Adhérent régulier...  │ [ Ouvrir la fiche ]         │ │
│ │ karim@...     │ 24 j restants │                       │ [ Archiver ]                │ │
│ │               │ 18 séances    │                       │ [ Geler ] [ Épingler ] [ ₽ ]│ │
│ └───────────────┴───────────────┴───────────────────────┴─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Tokens
- **Container & Card Radii**: `--rc: 14px` for row cards, squircle factor `0.147` for 40px controls (`--r: calc(var(--h) * 0.147)`).
- **Brand Colors**: Atrium Terracotta `#E8643F` (Light & Dark), Dark Espresso `#0A0A0A` for inverted accents and rail, `#F6F3F0` (light) / `#232323` (dark) for pod trays.
- **Typography**: `Barlow Condensed` for headers and caps, `Inter` for body and labels, `JetBrains Mono` for IDs, phone numbers, dates, and DZD currency.

---

## 3. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MembershipMembersView                                                                   │
│ ├── Dashboard Header & Branch Switcher                                                 │
│ ├── Retention Metrics Pod (Base active, Alertes renouvellement, Inverted New Members)  │
│ └── Directory Collection Pod                                                           │
│      ├── Command Toolbar (Expanding Seek, Segmented Filter, Filter Modal, CSV Export) │
│      ├── Floating Column Headers (.lh)                                                 │
│      └── Member Row List (.scr -> .rw)                                                 │
│           ├── Main Slab (.slab + .in: Checkbox, Avatar, Name/ID, Plan, Status, Due)    │
│           ├── Kinetic Horizontal Action Fan (.act: Edit, Email, Delete)                │
│           ├── Expand Chevron Button (.rb: 180° rotation)                               │
│           └── Accordion Quick Drawer (.dt: Contact, Plan, Notes, Relocated Actions)    │
│                                                                                        │
│ ├── Kinetic Slide-Over Inspector (.sv -> .sp)                                          │
│ │    ├── Header (.sh: Avatar, Name, Formula, RFID, Prev/Next, Close)                   │
│ │    ├── Segmented Tab Bar (.sg#tsg: Overview, Access, Invoices)                       │
│ │    ├── Tab 1: 4 Quick Tiles + 2 Liquid Wave Vessels (Days/Sessions) + Notes         │
│ │    ├── Tab 2: Recent Turnstile Entries (Date, Gate, Status)                          │
│ │    ├── Tab 3: Sales & Invoices + "+ Créer une facture"                              │
│ │    └── Footer (.sf: "Hold to Delete" progress fill + Close)                          │
│                                                                                        │
│ └── Floating Multi-Select Toolbar (.bar) & Undo Toast Stack (.toast)                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Motion & Kinematics Engine
1. **Euler Spring Sub-Step Integrator**:
   ```typescript
   interface Spring { x: number; v: number; t: number; k: number; z: number; }
   const stepSpring = (s: Spring, dt: number) => {
     const a = s.k * (s.t - s.x) - 2 * s.z * Math.sqrt(s.k) * s.v;
     s.v += a * dt;
     s.x += s.v * dt;
   };
   ```
2. **1D Shallow Water Wave Equation (14 Nodes)**:
   ```typescript
   // Height and velocity buffers for liquid surface nodes
   const h = new Float32Array(14);
   const hv = new Float32Array(14);
   // In each physics frame:
   for (let i = 0; i < 14; i++) {
     const left = h[i > 0 ? i - 1 : 0];
     const right = h[i < 13 ? i + 1 : 13];
     hv[i] += (260 * (left + right - 2 * h[i]) - 22 * h[i] - 1.6 * hv[i]) * dt;
   }
   for (let i = 0; i < 14; i++) {
     h[i] = Math.max(-4, Math.min(4, h[i] + hv[i] * dt));
   }
   ```
3. **Hold-to-Delete Continuous Fill**:
   - `Hd.l` spring progresses from `0` to `1` while `pointerdown` is held.
   - A red background fill progressively reveals via `clip-path: inset((1 - v)*100% 0 0 0)`.
   - When progress reaches `> 0.96`, deletion triggers with a cancellation toast. If released early, the spring recoils smoothly back to `0`.

---

## 4. Implementation Steps & Validation

### Step 1: Extract & Modularize Kinetic Physics Primitives
- Create `src/components/screens/membership/kineticPhysics.ts` containing the high-performance Euler spring engine, 1D wave solver, and sleep governor to avoid bloating UI components.

### Step 2: Build the Member Row Component with Horizontal Fan & Accordion
- Implement `MemberKineticRow.tsx` replacing the current list row layout in `MembershipMembersView.tsx`:
  - 72px base card height.
  - Hover/focus horizontal spray (`.act`) with staggered cubic-bezier transitions.
  - 180° rotatable chevron button (`.rb`).
  - Spring-interpolated accordion height expansion (`0 -> 150px`).
  - Three metadata columns + `.db` actions (`Ouvrir la fiche`, `Archiver`, plus the dedicated secondary action cluster: Freeze/Reactivate, Pin to top, and Finance/Pay).

### Step 3: Build the Authentic 560px Slide-Over Inspector
- Implement `MemberSlideOverInspector.tsx` replacing `StaffInspectorDrawer` on the Members screen:
  - Slide-in transition from right (`translateX((1 - x) * 100%)`).
  - 4 quick action tiles (`Enregistrer passage`, `Modifier`, `Bloquer badge`, `Renouveler`).
  - 2 interactive SVG fluid vessels (`V1`, `V2`) with live water waves calculating remaining days from expiration and sessions from member state.
  - Plan details, copy-to-clipboard phone/email rows, auto-saving notes.
  - Access logs and invoices sub-tabs.
  - "Hold to Delete" progress button with immediate keyboard fallback.

### Step 4: Wire to Store & Verify Zero Regression
- Connect all actions (check-in/passage, edit modal trigger, block badge toggle, renewal, delete with undo toast, archive, pin) to the existing Zustand store.
- Run `npm test`, `npm run test:atrium`, `compile_applet`, and `lint_applet` to ensure full TypeScript typing and build stability.
