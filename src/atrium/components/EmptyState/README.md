# EmptyState

Self-contained, dependency-free empty state component (`island` + `compact` variants) with container-aware ghost rows, CSS custom-property theming, strict accessibility semantics, and zero animations.

## Files

- `EmptyState.tsx` — Component + pure layout helpers (`computeGhostRowCount`, `resolveGhostTrackCount`)
- `EmptyState.css` — CSS-variable-only stylesheet (Warm Atrium default, Neutral palette, Dark mode, RTL, `forced-colors`)
- `presets.tsx` — `resolveEmptyState()` + i18n-ready copy decks (`fr` default, `en`, `ar`) + compact helpers + inline SVG icon set
- `index.ts` — Barrel exports
- `EmptyState.stories.tsx` — 6 island situations (`A–F`) + 2 compact variants (`G–H`)
- `EmptyState.test.tsx` — Unit & DOM semantics tests

## Usage

### With `resolveEmptyState(ctx)`

```tsx
import { EmptyState, resolveEmptyState } from './EmptyState';

const emptyProps = resolveEmptyState(ctx);

return emptyProps ? <EmptyState {...emptyProps} /> : <MembersList rows={rows} />;
```

Or inline when you know `resolveEmptyState(ctx)` is defined (e.g. inside an empty branch):

```tsx
<EmptyState {...resolveEmptyState(ctx)} />
```

### Manual compact variant (drawer tabs, cards, small panels)

```tsx
import { EmptyState, EMPTY_STATE_ICONS } from './EmptyState';

<EmptyState
  variant="compact"
  icon={<EMPTY_STATE_ICONS.ClockCounterClockwise />}
  title="Aucun passage enregistré"
  description="Les entrées au portique de Amira Cherif apparaîtront ici."
  secondaryAction={{
    label: 'Enregistrer une présence',
    onClick: () => checkInMember(member.id),
  }}
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `'island' \| 'compact'` | `'island'` | `island` = ghost rows + centered card; `compact` = dashed box |
| `icon` | `ReactNode` | **required** | Any icon component or inline SVG (`24px` island, `20px` compact) |
| `tone` | `'neutral' \| 'positive' \| 'warning' \| 'error'` | `'neutral'` | Controls only the status dot on the icon tile and `role="alert"` on error |
| `title` | `ReactNode` | **required** | Primary heading |
| `titleAs` | `'h2' \| 'h3'` | `'h3'` | Heading tag |
| `description` | `ReactNode` | — | Supporting explanation text |
| `primaryAction` | `Action` | — | At most one primary button (`--accent` fill) |
| `secondaryAction` | `Action` | — | At most one secondary button (`--card` fill, `--ghost-border` border) |
| `hint` | `ReactNode` | — | Small monospace line below actions |
| `width` | `number` | `420` | Island card width in px (`500` for hero `total === 0`) |
| `ghostRows` | `number \| 'auto'` | `'auto'` | `'auto'` computes `floor(availableHeight / 70)` clamped to `2..4` |
| `ghostTracks` | `3 \| 4 \| 6 \| 'auto'` | `'auto'` | `'auto'` uses container width (`>=1000` → `6`, `600–999` → `4`, `<600` → `3`) |
| `autoFocusPrimary` | `boolean` | `false` | Moves focus to the primary action **only** when `tone === 'error'` |
| `className` | `string` | — | Optional class on root element |

## Design Tokens

| Token | Warm Default | Neutral Alternative | Usage |
| --- | --- | --- | --- |
| `--panel` | `#FBF8F5` | `#FAFAFA` | Compact box background |
| `--pod` | `#F3EDE7` | `#F1F1F1` | Icon tile background |
| `--card` | `#FFFFFF` | `#FFFFFF` | Island card & secondary button background |
| `--border` | `#E6DED6` | `#E2E2E2` | Island card & icon tile border |
| `--ghost-border` | `#D5C9BE` | `#D4D4D4` | Ghost row, checkbox, compact box & secondary button border |
| `--skeleton-1` | `#E9E1D9` | `#E6E6E6` | Avatar, primary skeleton bars |
| `--skeleton-2` | `#EFE8E1` | `#EEEEEE` | Sub-bars & status pill skeleton |
| `--ink` | `#1B1917` | `#1B1917` | Primary text & icon color |
| `--muted` | `#6B635C` | `#6B635C` | Description & hint text |
| `--accent` | `#C9441F` | `#C9441F` | Primary action fill & focus ring |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | Primary action text |

### Swapping to the Neutral Palette

No component code changes are needed. Apply `data-es-palette="neutral"` (or `.es-palette-neutral`) on any ancestor, or override the tokens in CSS:

```css
.my-theme {
  --panel: #FAFAFA;
  --pod: #F1F1F1;
  --border: #E2E2E2;
  --ghost-border: #D4D4D4;
  --skeleton-1: #E6E6E6;
  --skeleton-2: #EEEEEE;
}
```
