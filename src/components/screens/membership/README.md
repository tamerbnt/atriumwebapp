# Membership Screen Component Suite (Adhérents Extraction)

This directory contains the production React + TypeScript + Tailwind implementation of the four interactive behaviors extracted from the `Adherents.dc.html` design prototype, following Atrium's design tokens and motion engine.

---

## 0. Shared Motion Engine (`motion/adherentsMotion.ts`)

- **Prototype Source Functions**: `class Sp`, `frame(t)`, `wake()`, `cleanup()`, `still` prefers-reduced-motion check.
- **Physics Specifications**:
  - Velocity and damping update:
    $$\Delta v = (t - x) \cdot k \cdot \Delta t$$
    $$v = v \cdot d^{\Delta t}$$
    $$x = x + v \cdot \Delta t$$
  - Coefficients:
    $$k = 0.08 + \frac{\text{tune}}{100} \cdot 0.16$$
    $$d = 0.62 + \frac{\text{tune}}{100} \cdot 0.2$$
  - Normalized frame delta $\Delta t$ in 60ths of a second:
    $$\Delta t = \text{clamp}\left(\frac{t - \text{prev}}{16.67}, 0, 2.5\right)$$
  - Settle threshold: $|t - x| < 0.02$ and $|v| < 0.02$.
  - Values operate in $0..100$ or pixel space.
- **Exported Hooks & Utilities**:
  - `Sp`: Frame-based spring class with `.step(dt)`, `.rest()`, `.snap()`, `.setTarget(t)`, and `.subscribe(listener)`.
  - `useSpring(target, tune, options)`: React hook connected to the central auto-parking rAF loop.
  - `wake()`, `frame()`: Central requestAnimationFrame loop that parks itself when all registered springs settle.
  - `setReducedMotionOverride(boolean)`: Programmatic toggle for testing and user preference detection.
- **Unit Tests**:
  - Located in `src/atrium/__tests__/adherentsMotion.test.ts`. Tests settle condition, snap, tune coefficients, and reduced motion bypass.

---

## 1. List Rows (Island Style) + Hover Fan Actions (`MemberRow.tsx` & `RowFan.tsx`)

- **Prototype Source Elements**: `.row`, `.slab`, `.in`, `fill(r)`, `.act`, `.rb`.
- **Key Behaviors**:
  - **Rounded Island Slab**: Each row is rendered as an isolated white slab with 16px border-radius, 1px border, and distinct visual states for hover, selected (`data-sel`), and open/inspected (`data-open`).
  - **Hover Fan Actions (`<RowFan>`)**: Three round buttons (`--i: 0..2`) hidden underneath the trailing button that slide out to the left with bouncy spring-like easing:
    $$\text{translate} = \text{calc}(\text{var}(--i) \times -40\text{px} - 46\text{px})$$
    $$\text{easing} = \text{cubic-bezier}(.24, 1.34, .38, 1)$$
    $$\text{delay} = \text{calc}(\text{var}(--i) \times 45\text{ms})$$
    Activated on `:hover` and `:focus-within` for full keyboard accessibility. When closed, buttons use `visibility: hidden` (with a delayed transition) to prevent tab focus traps.
  - **Selection Controls**: Tri-state select-all (`aria-checked="mixed"`), shift-click range selection, and animated bulk action bar.
- **Props**:
  - `<MemberRow>`:
    - `member`: `MemberRowData` (`id`, `name`, `phone`, `email`, `planName`, `status`, `expiryDate`, `daysRemainingLabel`, `balance`, `avatarColor`, `notes`, etc.)
    - `isSelected?: boolean`
    - `isOpen?: boolean` (slide-in panel open)
    - `isExpanded?: boolean` (dropdown island expanded)
    - `viewMode?: 'list' | 'grid'`
    - `x?, y?, width?, height?`: Optional Spring coordinates
    - `pValue?: number`: Presence spring ($0..100$)
    - `eValue?: number`: Expand spring ($0..100$)
    - `onSelect?: (id, e) => void`
    - `onToggleExpand?: (id) => void`
    - `onOpenDetails?: (id) => void`
    - `onEdit?, onMessage?, onDelete?, onRenew?, onArchive?`: Action callbacks
  - `<RowFan>`:
    - `actions?: RowFanAction[]`
    - `onEdit?, onMessage?, onDelete?`: Action callbacks
    - `memberName?: string`

---

## 2. The Expandable Drop-Down Island (`RowDetailIsland.tsx`)

- **Prototype Source Functions**: `.rb`, `.det`, `.dc`, `place()`, `draw()`.
- **Key Behaviors**:
  - Pressing the chevron button expands a second island out of the $38\text{px}$ button circle into the full-width panel via spring $e$ ($0..100$).
  - **Geometric Interpolation**:
    - $\text{left} = (w - 14 - B) \cdot (1 - e)$
    - $\text{top} = (RH/2 - B/2) \cdot (1 - e) + (RH + G) \cdot e$
    - $\text{width} = \max(0, B + (w - B) \cdot e)$
    - $\text{height} = \max(0, B + (DH - B) \cdot e)$
    - $\text{radius} = 19 + 3 \cdot e$
  - **Content Fade & Interactivity Gate**: Content (`.dc`) fades in only once $e > 0.55$, with pointer events and button `tabIndex` enabled only when $e > 0.6$.
  - Chevron rotates $180^\circ \times (e / 100)$ in lockstep with the spring.
- **Props**:
  - `eValue: number`
  - `rowWidth?: number` (default 1200)
  - `rowHeight?: number` (default 62)
  - `detailHeight?: number` (default 150)
  - `buttonSize?: number` (default 38)
  - `contactInfo?: { phone?: string; email?: string }`
  - `planInfo?: { planName?: string; expiry?: string; daysLeft?: string; remainingSessions?: number }`
  - `notes?: string`
  - `onOpenDetails?, onRenew?, onArchive?`: Callbacks
  - `actions?: Array<{ id, label, icon, onClick }>`
  - `children?: React.ReactNode`

---

## 3. Switching Tabs & Row Presence Animation (`StatusTabs.tsx`)

- **Prototype Source Functions**: `sync()`, `place()`, `cleanup()`, `vis()`, `order()`, `.tabs`.
- **Key Behaviors**:
  - Rows are keyed by client ID. When filtering or switching tabs, rows that stop matching receive presence spring $p \to 0$:
    - The slab collapses vertically towards its center: $\text{top} = (h \cdot (1 - q_v)) / 2$, $\text{height} = h \cdot q_v$ where $q_v = \text{clamp}(p, 0, 1.05)$.
    - Content opacity fades: $\text{opacity} = \text{clamp}((p - 0.5) / 0.4, 0, 1)$.
  - Incoming matching rows animate $p: 0 \to 100$, growing in place while neighboring rows glide to new positions.
  - Tab counts update reactively with pill badges.
- **Props**:
  - `tabs: StatusTabItem[]` (`id`, `label`, `count`)
  - `activeTab: string`
  - `onChange: (tabId: string) => void`
  - `ariaLabel?: string`

---

## 4. Slide-in Fiche Panel (`SlideInPanel.tsx`)

- **Prototype Source Functions**: `.pnl`, `.scrim`, `openPanel()`, `closePanel()`, `renderPanel()`, `go()`, `trap()`.
- **Key Behaviors**:
  - **Spring-Driven Slide**: Driven by spring $pp$ ($0..100$):
    $$\text{translateX} = (1 - p_q) \times 620\text{px}$$
    $p_q$ is clamped to $1.08$ allowing a natural overshoot and settle bounce.
  - **Backdrop Scrim**: Fades smoothly with opacity $\text{clamp}(p_q, 0, 1)$ and `backdrop-filter: blur(6px)`.
  - **Morphing Tab Underline (`#pind`)**: Animated with two springs (`ix` for `offsetLeft` and `iw` for `offsetWidth`), snapping on first open and smoothly sliding on tab change.
  - **Staggered Section Entrance**: Keyframes `up` with delay $\text{calc}(\text{var}(--k) \times 55\text{ms})$.
  - **Accessibility & Focus Management**:
    - Focus automatically moves to the close button on open and returns to the originating trigger element on close.
    - Keyboard focus trap (`Tab` / `Shift+Tab`) stays inside the active dialog.
    - `Escape` closes the panel.
    - Up / Down arrow keys navigate to previous and next records in the current filtered/sorted list.
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `title: string`
  - `subtitle?: string`
  - `avatar?: { text: string; bg: string }`
  - `pills?: React.ReactNode`
  - `tabs?: SlideInTab[]`
  - `activeTab?: string`
  - `onTabChange?: (tabId: string) => void`
  - `onPrev?, onNext?`: Navigation callbacks
  - `hasPrev?, hasNext?`: Navigation flags
  - `deleteLabel?, onDelete?, closeLabel?`: Footer controls
  - `originElement?: HTMLElement | null`: Trigger element for focus restoration
  - `children: React.ReactNode`

---

## 5. Mutation Helper Pattern (`useMutationUndo.ts`)

- **Prototype Source**: `mut(ids, fn, msg)`, `commit(ids)`.
- **Implementation**:
  - Takes a list of items, captures an immutable JSON snapshot of targeted IDs.
  - Applies mutation in place and triggers undo toast with a 6.5s timer.
  - Clicking "Annuler" restores the exact prior snapshot and shows feedback.

---

## Purposeful Design & Architecture Adaptations

1. **Decoupled from Monolithic DOM**: Replaced manual `document.getElementById` and `innerHTML` template strings with modular, typed React components with zero sample data inside them.
2. **CSS Isolation & `@property --zoom`**: Added `@property --zoom` to `src/index.css` so that individual CSS transforms (`scale`, `translate`, `rotate`) don't conflict or overwrite spring transforms.
3. **Dual Positioning Mode**: `<MemberRow>` supports both fluid layout (for standard flex lists) and absolute coordinate springs (`sx`, `sy`, `sw`, `sh`) matching the prototype's virtualized physics canvas.
4. **Enhanced Accessibility**: Maintained all prototype ARIA specifications: `role="dialog"`, `aria-modal="true"`, `aria-checked="mixed"`, `tablist`/`tab`, polite live regions for toast announcements, and forced-colors fallbacks.
