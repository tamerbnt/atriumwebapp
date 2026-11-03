# Atrium UI

Liquid controls for Atrium: buttons, segmented control, menu, select, toggle, badge and the logo.
Motion is simulated with springs, not authored with easing curves. TypeScript, React 18, Next 14 App Router, vanilla CSS with custom properties. No runtime dependencies.

```
src/atrium/            ← the library: copy this folder into your app
  motion/              engine: springs, shared loop, performance tiers
  styles/tokens.css    colours, sizes, themes
  components/          Button, IconButton (+Badge, StatusDot), Segmented, Menu, Select, Toggle, Logo
  __tests__/           unit tests (springs, loop, tokens contrast, placement)
src/app/               demo page (not needed in your app)
e2e/verify.mjs         browser checks (Playwright)
```

## Install in your app

1. Copy `src/atrium/` into your project (e.g. `src/atrium/`).
2. Import the tokens once, in `app/layout.tsx`:
   ```tsx
   import '@/atrium/styles/tokens.css';
   ```
3. Choose a theme with an attribute on `<html>` or any container (containers can nest):
   ```tsx
   <html lang="fr" data-atrium-theme={theme}>   // 'light' | 'dark', e.g. from your Zustand store
   ```
4. Use the components:
   ```tsx
   import { Button, Segmented, Select, Menu, Toggle, IconButton, AtriumLogo } from '@/atrium';
   ```

Components are client components (`'use client'`); you can render them from server components.
Lucide icons work as they are: pass `<Plus />` as `leading`, `trailing` or `icon`. Every inline SVG inside a control is restyled to the brand stroke (2.2, round caps, 0.42 × height).

## Components

### Button
```tsx
<Button leading={<Plus />}>Action rapide</Button>
<Button tone="outline" leading={<Sparkles />}>Données démo</Button>
<Button tone="soft" trailing={<ChevronDown />}>Siège principal</Button>
<Button tone="success">Synchronisé</Button>
```
`tone`: `accent` (default) · `outline` · `soft` · `success`. `size`: `sm | md | lg`, a number of px, or omit to inherit. Everything else is a normal `<button>` prop (`type` defaults to `"button"`, `disabled`, `onClick`, `ref`…).

### IconButton, Badge, StatusDot
```tsx
<IconButton aria-label="Actualiser" icon={<RefreshCw />} kick="spin" />
<IconButton aria-label={`Notifications, ${n} non lues`} icon={<Bell />} badge={n} />
<Button tone="soft" leading={<StatusDot />}>Online</Button>
```
`aria-label` is required on IconButton. The badge pops on a spring when its number goes up, and renders nothing at 0.

### Segmented
```tsx
<Segmented
  aria-label="Mode"
  value={mode}
  onValueChange={setMode}
  options={[
    { value: 'manager', label: 'Gérant salle' },
    { value: 'scan', label: 'Accueil & scan', icon: <Zap /> },
  ]}
/>
```
Controlled (`value`) or uncontrolled (`defaultValue`). Icon-only options need an `aria-label`. ← → ↑ ↓ Home End move the selection.

### Menu
```tsx
<Menu
  aria-label="Compte"
  header={<><b>Mehdi Samih</b><small>mehdi@example.com</small></>}
  items={[
    { id: 'lock', label: 'Verrouiller', icon: <Lock />, onSelect: lock },
    { id: 'diag', label: 'Diagnostic', description: 'Audit live', icon: <Activity /> },
    { type: 'separator' },
    { id: 'out', label: 'Se déconnecter', icon: <LogOut />, danger: true, onSelect: signOut },
  ]}
  trigger={(p) => <Button {...p} tone="soft" trailing={<ChevronDown />}>Mehdi</Button>}
/>
```
Spread `p` onto any element that accepts a ref (an Atrium Button, or your own). The panel is portalled to `<body>`, so no `overflow: hidden` ancestor can clip it; it flips above the trigger when there is no room below, stays inside the viewport, and follows the trigger on scroll. It carries the theme and size of its trigger.
Keyboard: Enter / Space / ↓ opens on the first row, ↑ on the last; ↑ ↓ Home End move; type to jump; Esc or Tab closes and returns focus.

### Select
```tsx
<Select aria-label="Période" value={period} onValueChange={setPeriod}
  options={[{ value: 'daily', label: 'Journalier' }, { value: 'weekly', label: 'Hebdomadaire' }]} />
```
Works controlled or uncontrolled, and with React Hook Form via `<Controller>` (`value` + `onValueChange`). `name` adds a hidden input for native forms.

### Toggle
```tsx
<Toggle aria-label="Notifications" checked={on} onCheckedChange={setOn} />
```
`role="switch"`. Click, Space/Enter, or drag the pool. Note: on/off is shown by the pool's position and the knob, not by a colour change.

### LiquidButton — the showpieces (Scan, Import, Export, Confirm, Continue, Create)
```tsx
// 1. Give it a promise. Busy until it settles; resolve → done, reject → error.
<LiquidButton kind="import" onPress={() => uploadFiles()} />

// 2. Real progress (import / export): drops fall and the level rises as `progress` grows.
<LiquidButton kind="export" progress={p} onPress={() => start()} />

// 3. Fully controlled, e.g. from React Query or React Hook Form.
<LiquidButton
  kind="confirm"
  status={m.isPending ? 'busy' : m.isSuccess ? 'done' : m.isError ? 'error' : 'idle'}
  onPress={() => m.mutate(values)}
/>
// RHF: status={formState.isSubmitting ? 'busy' : 'idle'} type="submit"
```
- `kind`: `scan` flexible bar sweeps · `import` drops fall and splash · `export` a neck stretches and pinches off a drop · `confirm` a weighted pen draws the check · `continue` slingshot arrow · `create` five squares merge, success floods from the plus.
- `labels={{ idle, busy, done, error }}` (upper-cased by default, `uppercase={false}` to keep case). Import / export append the percentage while busy (`showPercent={false}` to hide it).
- `tone`: `accent` (brand orange body, cream liquid) or `ink` (dark body; on a dark surface it flips to a cream body with orange liquid). Both pass the contrast tests in both themes.
- Size: same `--atr-h` / `size` as every control (28 / 34 / 44 px, any number). Width is free: set `style={{ width }}` or a class; the drawing follows the real aspect ratio. Default width is 4.17 × height (the design's 300 : 72).
- Without `status`, a handler that returns nothing makes the button play its own short run (a demo-style pace). `onCancel` makes a press while busy cancel the run.
- `error` shows a flinch, the "failed" label and a red outline; it returns to idle after `holdMs` (default 1.5–2.4 s; `Infinity` keeps it until `status` changes).
- `alive`: the corners twitch occasionally while idle. Off by default; costs a few frames each time and nothing in between.
- It is a real `<button>` (focus ring, Enter/Space, `disabled`, `type="submit"`). The drawing is `aria-hidden`; a polite live region announces "Working" and the done / error label. Drops fall into the button from just above it, so leave a little room over it.
- Reduced motion and tier `off`: no drops, pours or sweeps. The level and label show progress, completion lands after a short dwell.

### LiquidLoader
```tsx
<LiquidLoader size={56} />                    // four squares melt, swirl, re-solidify
<LiquidLoader active={loading} label="Syncing" />
```
Click to stir (`stirrable={false}` to disable). Runs only while mounted, visible and `active`; parked it costs nothing. Reduced motion / tier `off` show the solid mark with a soft CSS pulse. The squares use `--atr-ink`, the ring `--atr-acc`.

### AtriumLogo
```tsx
<AtriumLogo height={32} style={{ color: '#0A0A0A' }} />                 // ink on light
<AtriumLogo height={32} style={{ color: '#E8643F' }} />                 // orange on dark
<AtriumLogo variant="mark" height={24} />
```
Exact geometry from the final logo sheet, drawn in `currentColor`. `clearSpace` adds the one-mark clear space.

## Sizing and theming

Every control derives its radius, padding, gap, icon size and type size from one number, `--atr-h` (its height), so 24 px and 44 px controls have the same shape.

```tsx
<Button size="lg" />                       // 44 px
<div style={{ '--atr-h': '30px' }}>…</div>   // everything inside is 30 px
```

Colours are tokens in `tokens.css`. The brand orange is `#D4522F`. Because white on that orange only reaches 4.2:1, filled accent controls use ink text (4.7:1), and orange used as *text or borders* uses `--atr-acc-text` (a deeper orange on light, a brighter one on dark). The unit tests check WCAG contrast for every pair, so a colour edit cannot silently break legibility.

Typography is intentionally not set yet: controls inherit the page font, or use `--atr-font-ui` and `--atr-font-mono` if you define them.

## How the motion works

- Every moving value is a spring `x'' = k(t − x) − 2ζ√k·x'` with ζ = 1/φ ≈ 0.618 (one soft 8.5 % overshoot). The step uses the exact analytic solution, so it is stable at any frame rate and keeps its velocity when retargeted: every interaction can be interrupted mid-flight.
- One shared `requestAnimationFrame` loop serves the whole app and **stops completely when nothing moves**. An idle screen runs zero frames.
- Buttons are driven by one delegated listener for the whole page; a button costs nothing until you first hover or press it.
- Only `transform` and `clip-path` are written per frame, with no layout reads in the loop.
- `prefers-reduced-motion`: springs become critically damped (no overshoot) and flicks (badge pop, tilt kicks) are skipped.
- Performance governor: if at least 80 % of ~45 consecutive active frames are slower than ~30 fps, the tier drops `full → lite` (no overshoot) and then `lite → off` (controls jump to their state and plain CSS `:hover` / `:active` carry the feedback). Pin a tier yourself if you prefer:
  ```ts
  import { configureMotion } from '@/atrium';
  configureMotion({ tier: 'full' });   // or 'lite' | 'off' | 'auto' (default)
  ```
- Forced-colors (Windows high contrast) is supported: liquid effects are hidden and system colours are used.

Framer Motion can stay in your app for page and layout transitions. Don't drive the same element with both.

## Tests

```
npm test            # springs, loop + governor, token contrast, panel placement, wave field, showpiece state machines
npm run e2e         # needs `next dev` (or start) running; BASE_URL=http://localhost:3000
```
`e2e/showpiece.mjs` drives every showpiece (idle → busy → done / error → idle, async + progress wiring, keyboard, reduced motion, loader, everything asleep afterwards). `e2e/verify.mjs` drives the demo page in a real Chromium: hover/press/click liquid, idle cost (zero frames), segmented blob landing, measured 8.5 % overshoot, menu in a portal with theme carry-over, keyboard, Escape/outside-click, re-opening mid-drain, select, toggle (click, Space, drag), resizing through `--atr-h`, reduced motion, tier `off`, phone width.

## Known limits

- Toggle is not mirrored in right-to-left layouts (the pool still rests left = off). Segmented keyboard navigation does respect RTL.
- Touch targets follow `--atr-h` (28–44 px). Use `size="lg"` or a larger `--atr-h` where 44 px targets are required.
- Showpiece text is drawn in SVG and fitted to the button (smaller type first, then squeezed). Fonts are not decided yet, so very long labels will look condensed.
- A running LiquidLoader keeps one animation frame going for as long as it is on screen; use `active={false}` when it is not needed.
- The Create button here is the plus-and-flood design from the controls sheet; the SVG "wave surface" Toggle and Menu variants were not ported, the DOM versions cover them.
