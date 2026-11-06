# Membership Members Screen — 1:1 Kinetic Island Rows, Extreme-Right Dropdown & Accordion Push Engine

Upgrade the **Adhérents (Membership Members)** screen to achieve 100% visual, architectural, and physics parity with the official reference HTML prototype (`members2_reference.html`). Eliminates the misplaced left chevron and misaligned terracotta box by establishing the shared frame-based spring engine (`Sp`), anchoring the chevron button (`.rb`) at the extreme right (`right: 14px`), positioning the pure card detail drawer (`.dt`) at `top: 80px` with a 150px spring-driven accordion row push, and preserving all operational actions (Freeze, Pin, Pay, Archive, Edit, Delete).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed in the Phase 1 clarification:
> - **Row Positioning Architecture**: Full absolute spring physics matching `members2_reference.html` 1:1. Each row calculates its target coordinates (`sx`, `sy`, `sw`, `sh`) and smoothly glides into place, while expanding a row pushes all rows below down by $(150 + 8)\text{px} \times e$.
> - **Detail Drawer Palette**: Pure card background (`#FFFFFF` in light mode, `#1A1A1A` in dark mode) with a subtle 1px border (`var(--line)`), completely eradicating the awkward peach/salmon fill.
> - **Secondary Operational Actions**: Integrated directly into the expanded drawer's actions column (`.db`), housing `Ouvrir la fiche`, `Archiver`, `Geler badge`, `Épingler en haut`, and `Encaisser / Solde`.

---

### 1. Root Cause Analysis & Core Concept

#### Why Previous Attempts Failed to Meet Requirements
1. **Misplaced Chevron Button**: The chevron toggle was erroneously injected as a column at the start of the row or constrained inside a generic data-collection column grid, placing it to the left of the checkbox instead of anchoring it at the extreme right (`right: 14px`, `top: 18px`, `z-index: 3`).
2. **Detail Drawer Mispositioning & Miscoloring**: The detail container was styled with a hardcoded terracotta/salmon background (`#FBE7DF`) and floating offset calculations that leaked outside the row bounds rather than operating as an internal absolute layer (`top: 80px`, `height: 150px`, spanning `left: 0` to `right: 0`) within an expanding row container (`height = p*(H + G) + pm*e*(DH + G)`).
3. **Decoupled Physics**: Without the shared single-loop spring engine (`Sp`) controlling both the chevron rotation ($e \times 180^\circ$) and the row container height ($72\text{px} \to 230\text{px}$), expanding a drawer caused awkward margin jumps and overlapping elements rather than a fluid mechanical push.

#### What This Solution Delivers
- **Shared Motion Engine (`src/components/screens/membership/motion/adherentsMotion.ts`)**:
  - Class `Sp` implementing frame-based integration:
    $$\begin{aligned}
    v &\mathrel{+}= (\text{target} - x) \cdot k \cdot dt \\
    v &\mathrel{*}= d^{dt} \\
    x &\mathrel{+}= v \cdot dt
    \end{aligned}$$
    where $k = 0.08 + \frac{\text{tune}}{100} \cdot 0.16$ and $d = 0.62 + \frac{\text{tune}}{100} \cdot 0.2$ ($dt$ clamped $0 \dots 2.5$).
  - Settled condition: $|\text{target} - x| < 0.02$ and $|v| < 0.02$. Values run in $0 \dots 100$ or pixels.
  - Single shared `requestAnimationFrame` loop that sleeps at rest ($0\%$ CPU) and auto-wakes whenever a target changes.
  - `prefers-reduced-motion` compliance: springs snap immediately without oscillation or stagger.
- **72px Island Rows (`.rw`, `.ri`, `.slab`, `.in`)**:
  - Pure white slab container (`--rc: 14px`), subtle border (`var(--line)`), with states: default, hover, selected (`data-sel`), and open (`data-open`).
  - `.in` content grid: Checkbox ($22\text{px}$), Avatar ($40\text{px}$), Member Name & Info ($\min 200\text{px}$), Plan ($\min 150\text{px}$), Status ($100\text{px}$), Due Date ($150\text{px}$), Balance in DZD ($110\text{px}$). Right padding is reserved ($130\text{px}$) for the action buttons.
- **Extreme-Right Dropdown Chevron (`.rb`)**:
  - Fixed at `top: 18px`, `right: 14px`, `z-index: 3`. Rotates $180^\circ \times e$ smoothly as the drawer expands.
- **Hover Fan Action Cluster (`.act`)**:
  - Three round buttons ($36\text{px} \times 36\text{px}$, `--i: 2` Edit, `--i: 1` Email, `--i: 0` Delete) sitting under `.rb` at `right: 18px`.
  - On row `:hover` or `:focus-within`: slides out to the left with bounce curve:
    $$\text{translate: } \text{calc}(\text{var}(--i) \cdot -42\text{px} - 44\text{px}) \quad 0$$
    with stagger delay $\text{calc}(\text{var}(--i) \cdot 45\text{ms})$ and `cubic-bezier(0.24, 1.34, 0.38, 1)`.
- **Pure Card Expandable Detail Drawer (`.dt`)**:
  - Positioned at `top: 80px`, `height: 150px`, spanning full row width.
  - Pure card surface (`bg-white dark:bg-[#1A1A1A]`, border `var(--line)`).
  - 4 clean columns: Contact, Forfait, Notes, and Actions (`.db`).
  - Actions column houses:
    1. `Ouvrir la fiche` (primary inspector trigger)
    2. `Archiver` (soft action with undo toast)
    3. Operational cluster: `Geler badge` (or Reactivate), `Épingler en haut` (VIP pin), and `Encaisser / Solde`.
- **Accordion Row Push Mechanics**:
  - Base row height $H = 72\text{px}$, gap $G = 8\text{px}$, detail height $DH = 150\text{px}$.
  - Container total height:
    $$\text{height} = p \cdot (72 + 8) + \min(p, 1) \cdot e \cdot (150 + 8)\text{px}$$
  - Pushes all succeeding rows down with identical physics, ensuring zero overlap or clipping.

---

### 2. User Experience & Visual Design

#### Row Geometry & Spatial Hierarchy

```
Default Row State (72px)
┌───┬────┬──────────────────┬───────────┬─────────┬──────────────┬───────────┬──────────────────┐
│ ☑ │ AV │ Amira Cherif     │ Full Pass │ ● Actif │ 2026-12-06   │ Soldé     │      [ ✎  ✉  🗑 ] [ v ] │
│   │    │ ID: 100201 · Tel │           │         │ 30 j rest.   │           │       (.act)       (.rb)│
└───┴────┴──────────────────┴───────────┴─────────┴──────────────┴───────────┴──────────────────┘
                                                                           Hover slides out left ◄───┘

Expanded Row State (230px = 72px + 8px gap + 150px drawer)
┌───┬────┬──────────────────┬───────────┬─────────┬──────────────┬───────────┬──────────────────┐
│ ☑ │ AV │ Amira Cherif     │ Full Pass │ ● Actif │ 2026-12-06   │ Soldé     │                   [ ^ ] │
├───┴────┴──────────────────┴───────────┴─────────┴──────────────┴───────────┴──────────────────┤
│ Inline Quick Drawer (.dt) — Pure White / Dark Obsidian Card Surface                           │
│ ┌─────────────────┬─────────────────┬─────────────────────────┬─────────────────────────────┐ │
│ │ Contact         │ Forfait         │ Notes                   │ Actions (.db)               │ │
│ │ +213 550 112233 │ Full Access     │ Welcome member. Prefers │ [ Ouvrir la fiche ]         │ │
│ │ amira@gmail.com │ 30 j restants   │ morning slots.          │ [ Archiver ]                │ │
│ │                 │ 24 séances      │                         │ [ Geler ] [ Épingler ] [ ₽ ]│ │
│ └─────────────────┴─────────────────┴─────────────────────────┴─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Motion Timeline & Interaction Specs
| Trigger | Target Element | Transform / Property | Easing / Formula | Duration / Settle |
|---|---|---|---|---|
| Row Hover / Focus | `.act` buttons ($--i: 0, 1, 2$) | `translate: calc(var(--i) * -42px - 44px) 0`, `scale: 1` | `cubic-bezier(0.24, 1.34, 0.38, 1)` with `--i * 45ms` delay | 280ms |
| Row Unhover | `.act` buttons | `translate: 0 0`, `scale: 0.7`, `opacity: 0` | Linear exit, `visibility: 0s 160ms` | 140ms |
| Chevron Press | `.rb` button | `rotate: e * 180deg` | Spring $e \in [0, 100]$, $k=0.12$, $d=0.75$ | $\approx 220\text{ms}$ |
| Chevron Press | `.rw` row container | `height: 80px -> 238px` | Spring $e \in [0, 100]$ via sub-step Euler | $\approx 240\text{ms}$ |
| Chevron Press | `.dt` detail card | `opacity: clamp((e - 50) / 40)` | Spring $e$, interactive when $e > 80$ | Fades in after $e > 50$ |
| Filter Switch | Outgoing `.rw` | `p -> 0`: `scale(1, 0.86 + 0.14p)`, height collapses | Spring $p \in [100, 0]$ | Settles & removed |
| Filter Switch | Incoming `.rw` | `p -> 100`: vertical grow from center | Spring $p \in [0, 100]$ | Settles at full height |

---

### 3. Key Product Decisions & Trade-Offs

- **Dedicated Spring List Canvas vs. Generic Table Column Overrides**:
  - *Chosen Approach*: Replace the nested `UniversalDataCollection` table row wrapping in `MembershipMembersView.tsx` with the native virtualized spring list canvas from `members2_reference.html`.
  - *Why*: The generic table component enforces column-based `flex` cells and an external checkbox container that conflicts with absolute coordinate interpolation, hover spray bounds, and row-level accordion height expansion.
  - *Trade-off*: Preserves `UniversalDataCollection` for all other 15 platform verticals while granting the Membership vertical 100% exact fidelity with the reference prototype.
- **Operational Action Relocation**:
  - *Chosen Approach*: Place Freeze, Pin, and Quick Payment directly inside the `.dt` drawer's action cluster (`.db`).
  - *Why*: Eliminates the cluttered bottom-hover bar from the previous iteration, cleanly grouping all secondary actions alongside `Ouvrir la fiche` and `Archiver`.

---

### 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MembershipMembersView                                                                   │
│ ├── Dashboard Header & Branch Switcher                                                 │
│ ├── Retention Metric Pods (Base active, Alertes renouvellement, Inverted New Members)  │
│ └── Directory Collection Pod                                                           │
│      ├── Command Toolbar (Expanding Seek, Segmented Filter, Filter Modal Sheet, Export)│
│      ├── Floating Column Headers Bar (.lh: Checkbox, Member, Plan, Access, Due, Bal)   │
│      └── Kinetic Row Canvas (#rows)                                                    │
│           └── MemberRow (.rw: height controlled by spring p and e)                     │
│                ├── Main Row Item (.ri: 72px)                                          │
│                │    ├── Background Slab (.slab: white card, active ring on selection)  │
│                │    ├── Content Grid (.in: Checkbox, Avatar, Name/ID, Plan, St, Due)   │
│                │    ├── Hover Action Fan (.act: --i=2 Edit, --i=1 Mail, --i=0 Delete)  │
│                │    └── Chevron Toggle (.rb: right: 14px, top: 18px, rotates 180deg)   │
│                │                                                                       │
│                └── Inline Accordion Quick Drawer (.dt: top: 80px, height: 150px)       │
│                     ├── Col 1: Contact (Phone, Email, Address)                         │
│                     ├── Col 2: Forfait (Plan, Days remaining, Session count)           │
│                     ├── Col 3: Notes (Staff notes preview)                             │
│                     └── Col 4: Action Cluster (.db: Fiche, Archive, Freeze, Pin, Pay)  │
│                                                                                        │
│ ├── Kinetic Slide-Over Inspector (.sv -> .sp)                                          │
│ │    ├── Header (.sh: 56px Avatar, Verified badge, RFID chip, Prev/Next, Close)        │
│ │    ├── Segmented Tab Switcher (Aperçu, Accès portique, Ventes & Factures)            │
│ │    ├── Tab 1: 4 Quick Tiles + 2 Liquid Wave Vessels (Days/Sessions) + Notes Area     │
│ │    ├── Tab 2: Live Turnstile Passage Logs                                            │
│ │    ├── Tab 3: Sales & Invoice History with 1-click Invoice Composer                  │
│ │    └── Footer (.sf: "Hold to Delete" progress button + Close)                        │
│                                                                                        │
│ └── Floating Multi-Select Toolbar (.bar) & Undo Toast Stack (.toast)                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Shared Motion Engine Interface (`adherentsMotion.ts`)
```typescript
export class Sp {
  x: number;
  v = 0;
  t: number;
  k: number;
  d: number;
  tune: number;
  constructor(x: number, tune = 22);
  step(dt: number, reduced?: boolean): void;
  rest(): boolean;
  snap(): void;
  setTarget(target: number): void;
  subscribe(fn: (v: number, s: Sp) => void): () => void;
  destroy(): void;
}

export function useSpring(target: number, tune?: number, options?: { immediate?: boolean; onRest?: () => void }): number;
```

---

### 5. Implementation Slices & Verification Plan

1. **Verify Motion Engine (`adherentsMotion.ts`)**:
   - Verify `Sp` mathematical equations ($k = 0.08 + \frac{\text{tune}}{100} \cdot 0.16$, $d = 0.62 + \frac{\text{tune}}{100} \cdot 0.2$), auto-parking loop, and unit tests.
2. **Re-architect `MemberRow.tsx`**:
   - Anchor `.rb` at `top: 18px`, `right: 14px`, `z-index: 3`.
   - Remove any chevron from the left of the checkbox.
   - Set `.in` grid to `padding: 0 130px 0 16px` matching prototype column widths.
   - Anchor `.act` buttons at `top: 18px`, `right: 18px`, `z-index: 2` with `--i: 0, 1, 2` horizontal bounce spray.
   - Wire `.dt` drawer at `top: 80px`, `height: 150px`, `background: white / #1A1A1A`, with Contact, Forfait, Notes, and `.db` operational action buttons.
3. **Harmonize `MembershipMembersView.tsx`**:
   - Replace the generic table wrapper in the Members view with the reference list container (`.scr`, `#rows`).
   - Wire selection, status tabs (`Tous`, `Actifs`, `À renouveler`), search, and sort to the row spring pipeline.
   - Ensure `isDetailOpen` connects seamlessly with `MemberSlideOverInspector`.
4. **Verification**:
   - Run `npm test` and `npm run test:atrium`.
   - Run `compile_applet` and `lint_applet` concurrently.
   - Verify that the dropdown chevron is permanently anchored at the extreme right and the drawer expands with exact prototype physics.
