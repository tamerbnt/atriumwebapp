# Atrium Staff Screen — List View & Grid View Complete Guide

> This document is written for the web agent building the browser version of Atrium.
> It covers everything about the Staff screen's two view modes — **List View** and **Grid/Card View** —
> with full detail on layout, states, hover behavior, the expanding action strip, the corner-fan,
> the kebab context menu, spacing, animations, and every visual nuance.

---

## 1. Overview: Two View Modes

The Staff screen has a toggle between two display modes. Both show the same data (`FilteredStaffMembers`)
but present it differently. The toggle is a `ViewMode` value: `"List"` or `"Grid"`.

- **List View** → Classic table-style rows with an expandable action strip below each row
- **Grid/Card View** → Card grid with corner-fan action buttons that spray out on hover

This document covers both, but focuses heavily on **List View** since that is where most of the
interaction complexity lives.

---

## 2. List View — Overall Structure

The List View is a 2-row layout:

```
┌───────────────────────────────────────────────────────┐
│  Row 0: Column Headers Bar (sticky floating card)     │  ← Height: Auto
├───────────────────────────────────────────────────────┤
│  Row 1: Scrollable list of staff rows                 │  ← Height: *
│  (Each item = Main Row Card + Action Strip below it)  │
└───────────────────────────────────────────────────────┘
```

### 2.1 Column Headers Bar

A standalone card floating above the list:
- Background: `CardBackgroundBrush` (theme-adaptive)
- Border: 1px `CardBorderBrush`
- Corner radius: **12px**
- Padding: `16px horizontal, 10px vertical`
- Bottom margin: **8px** (gap between header and first row)

**Six columns** — same proportions used in every data row below it:

| Col | Width | Min Width | Content |
|---|---|---|---|
| 0 | Auto | 38px | Multi-select "select all" checkbox |
| 1 | 2.2* | 180px | "Team Member" name column (sortable) |
| 2 | 1.2* | 120px | Role column (sortable) |
| 3 | 1.2* | 120px | Phone column (sortable) |
| 4 | 1* | 90px | Status column (sortable) |
| 5 | Auto | 36px | (empty — kebab placeholder) |

Every column header (except col 0) is a clickable sort button. Each has:
- The column label text: 12px, SemiBold, `TextSecondaryBrush` by default
- A small **sort arrow badge** inline: a `↕` icon (Lucide up-down arrows) in a rounded pill
  - Pill background: `SurfaceBgDim`, corner radius 5px, padding `4px h, 2px v`
  - Arrow icon: 10×14px, stroke 1.5px, color inherits from button foreground
- On hover: column header text color shifts to `TextPrimaryBrush` (the button style handles this)
- Sort command fires with parameter: `"Name"`, `"Role"`, `"Phone"`, or `"Status"`

### 2.2 The Scrollable List

The list itself (`ListBox`):
- Background: `Transparent`
- No border
- Padding: `0 0 4 8` (4px right, 8px bottom)
- Horizontal scroll: Disabled
- Vertical scroll: Auto (native scrollbar appears when needed)
- Item spacing: each `ListBoxItem` has bottom margin **6px**
- The `ListBoxItem` container is a **transparent pass-through** — no selection highlight at the container level, no padding, no border. All visual states are handled inside the `DataTemplate`.

---

## 3. List View — The Row Item Structure

Every staff member in the list is rendered as a **vertical StackPanel** containing two children:

```
┌─────────────────────────────────────────────────────┐  ← RowCard (always visible)
│  Checkbox | Avatar+Name+Email | Role | Phone | Status | ⋮  │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐  ← ActionRowStrip (hidden by default)
│         [ 👁 ]  [ ✏ ]  [ ❄ ]  [ 📌 ]  [ 🗑 ]      │
└─────────────────────────────────────────────────────┘
       ↑ This expands below the card on hover and pushes all rows below it down
```

### 3.1 The Main Row Card (`RowCard`)

A rounded card border that wraps the entire data row.

**Default (resting) appearance:**
- Background: `CardBackgroundBrush`
- Border: 1px `CardBorderBrush`
- Corner radius: **10px**
- Padding: `16px horizontal, 8px vertical`
- Min height: **50px**
- Cursor: `Hand` (entire row is clickable)
- Click action: opens the Staff Detail screen for this staff member

---

### 3.2 The Six Columns Inside the Row Card

The row uses the **exact same 6-column proportions** as the header bar above it.

#### Column 0 — Multi-Select Checkbox

- A standard modern styled checkbox
- Bound two-way to `IsSelectedForBulk` on the staff model
- Has `PreviewMouseLeftButtonDown` handler to stop event propagation (prevents row click from firing when checkbox is clicked)
- Left-aligned, vertically centered
- Right margin: 4px

#### Column 1 — Avatar + Name + Email

This column itself is a 2-column sub-grid:

**Sub-column 0: Avatar Circle (36×36px)**
- A circle `Ellipse` filled with a color derived from the staff member's `Role` via a converter (`RoleToBrushConverter`, parameter `Avatar`)
- Each role has its own distinct color — this is not a user photo, it is a colored circle
- On top of the circle: the staff member's **initials** (via `NameToInitialConverter`)
  - White text, Bold, 13px font size, centered
- Margin: 12px gap to the right before the text column

**Sub-column 1: Name + Email stacked vertically**
- **Name row** (horizontal StackPanel):
  - Full name text: 13px, `SemiBold`, `Segoe UI Variable Display`, `TextPrimaryBrush`, truncates with ellipsis
  - **Pin indicator icon**: a small filled pin icon (🟡 golden) that is `Collapsed` by default, shown only when `IsPinned = true`. Amber color `#F59E0B`, 6px left margin.

- **Email button** (click-to-copy, below the name):
  - A transparent `Button` styled as an inline pill
  - Default: `Background = Transparent`
  - Contains a small envelope SVG icon (11×10px, stroke 1.2px, `TextTertiaryBrush`) + email text (11px, `TextTertiaryBrush`)
  - On hover: pill background becomes `SurfaceBgDim`, icon stroke and text color shift to `FacilityAccentBrush` (brand color)
  - Click fires `CopyEmailCommand` with the email string — copies to clipboard and shows a toast
  - Left margin: `-3px` (slight negative to align text with name above it)
  - Top margin: `2px` gap below name

#### Column 2 — Role Badge

A colored pill badge showing the staff member's role:
- Corner radius: **8px**
- Padding: `8px horizontal, 4px vertical`
- Background color: from `RoleToBrushConverter` (parameter `BadgeBg`) — a soft tinted background per role
- Text color: from `RoleToBrushConverter` (parameter `BadgeFg`) — a readable foreground per role
- Font size: 11px, SemiBold, truncates with ellipsis
- Left-aligned, vertically centered

#### Column 3 — Phone Number (click-to-copy)

Similar pattern to the email button — a transparent button that looks like plain text:
- Contains a phone handset SVG icon (12×12px, stroke 1.5px, `TextTertiaryBrush`) + phone number text (12px, `TextSecondaryBrush`)
- Default: transparent background
- On hover: background becomes `SurfaceBgDim` (rounded 6px), icon stroke and text shift to `FacilityAccentBrush`
- Click fires `CopyPhoneCommand` — copies number to clipboard
- If no phone number: shows an em dash `—`
- Left-aligned, vertically centered

#### Column 4 — Status Badge + Last Active Timestamp

A vertical StackPanel:

**Status badge** (top):
- A rounded pill: corner radius 10px, padding `8px h, 4px v`
- Default (Active): background `StatusSuccessBackground`, text `StatusSuccessBrush` (green family)
- Contains: animated pulsing dot + status text label

**The Status Dot** (pulsing when Active):
- 7×7px `Ellipse`
- When `EmploymentStatus = Active`: dot fill is `StatusSuccessBrush` and it **pulses** — opacity animates from 1.0 → 0.3 → 1.0 in a 1.2-second loop (`AutoReverse=True`, `RepeatBehavior=Forever`). This is the "live heartbeat" effect.
- When `EmploymentStatus = Inactive`: dot fill changes to `TextTertiaryBrush`, opacity fixed at 0.6 (no pulse), status background changes to `SurfaceBgDim`, status text changes to `TextTertiaryBrush`

**Status text**: 11px, Bold, color matches dot

**Last Active timestamp** (below badge): 10px, `TextTertiaryBrush`, top margin 3px. Shows relative time (e.g. "2 days ago").

#### Column 5 — Kebab Menu Button (⋮)

A 28×28px circular icon button at the far right of each row:
- Default: transparent background, three-dot vertical icon (14×14px) in `TextTertiaryBrush`
- On hover: background becomes `SurfaceBgDim` (corner radius 6px), icon color shifts to `TextPrimaryBrush`
- Does NOT navigate — it opens a **context menu dropdown** aligned below it

---

## 4. The Kebab Context Menu Dropdown

When the user clicks the ⋮ button, a **floating context menu** opens below it.

### 4.1 Menu Container

- Placement: below the button, 6px vertical offset
- No drop shadow from the OS — custom shadow via `DropShadowEffect`
- Background: `CardBackgroundBrush`
- Border: 1px `BorderBrush`
- Corner radius: **14px**
- Padding: **6px** around the items
- Drop shadow: BlurRadius 24, ShadowDepth 6, Opacity 0.18, black, direction 270 (downward)
- Min width: **180px**

### 4.2 Menu Items

Each menu item (except Delete) uses this layout:
- Padding: `10px horizontal, 8px vertical`
- Corner radius: **8px**
- Background: `Transparent` by default → `SurfaceBgDim` on highlight (hover)
- Two-column sub-grid: 24px icon column + flex text column with 6px gap
- Font: 13px, Medium, `TextPrimaryBrush`
- Cursor: Hand

**Menu Items in order:**

| # | Label | Icon | Icon color |
|---|---|---|---|
| 1 | View Details | Eye icon | `TextSecondaryBrush` |
| 2 | Edit | Pencil/edit icon | `BrandPrimaryBrush` |
| 3 | Pay Staff | Finance/money icon | `BrandPrimaryBrush` |
| 4 | Pin | Pin icon | `TextSecondaryBrush` |
| 5 | Freeze / Reactivate | Snowflake icon | `#06B6D4` (cyan) |
| — | **Separator** | 1px divider line | `BorderBrush` |
| 6 | **Delete** | Trash icon | `StatusErrorBrush` (red) |

**Delete item is special:**
- Text color is `StatusErrorBrush` (red)
- On highlight (hover): background becomes `#12EF4444` (very light red tint, 7% opacity red)
- No `SurfaceBgDim` hover — it gets the red tint instead

**Separator styling:**
- A 1px-height border
- Background: `BorderBrush`
- Margin: `8px horizontal, 4px vertical`

---

## 5. The Action Strip — The Core Hover Interaction

This is the most important and unique behavior in the list view.

### 5.1 What Is the Action Strip?

The **Action Strip** (`ActionRowStrip`) is a `Border` element that lives **below the main row card** in the same vertical `StackPanel`. It contains **5 circular action buttons** arranged horizontally.

**In its resting (hidden) state:**
- `Height = 0` (collapsed to zero height — takes no space in the layout)
- `Opacity = 0` (invisible)
- `Margin = 0`
- `ClipToBounds = True` — buttons cannot bleed out of the 0-height container

**This means: no space is reserved for it. It doesn't exist visually until you hover.**

### 5.2 What Happens on Row Hover

When the mouse enters the row area, **three things happen simultaneously**:

**A. The Row Card appearance changes (instant, no animation):**
- Background → `Brush.Surface.Hover` (a subtle lighter/hover tint)
- Border brush → `FacilityAccentBrush` (the facility brand accent color)
- Border thickness → `3px left, 1px top, 1px right, 1px bottom` — the **left edge gets a thick accent stripe**

**B. The Action Strip container expands (animated):**
Three animations fire together (all `CubicEase EaseOut`, duration 240ms):
- `Height`: 0 → **46px**
- `Opacity`: 0 → 1.0 (slightly faster, 180ms)
- `Margin`: 0 → `0, 6, 0, 4` (top 6px gap, bottom 4px gap added)

**This expansion pushes all rows below the hovered row downward in real layout space.** The list items reflowing naturally because `StackPanel` layout recalculates. The row below visually slides down to make room.

**C. The 5 circular buttons animate in (staggered cascade):**

Each button starts hidden at:
- `ScaleX = 0.82`, `ScaleY = 0.82` (slightly small)
- `TranslateY = -14px` (positioned 14px above its final resting position)
- `Opacity = 0`

Then they animate to their natural position with a **staggered delay**, each button 40ms after the previous, using `BackEase EaseOut` (amplitude 0.35 — this gives a slight springy overshoot):

| Button | Action | Delay | Final position |
|---|---|---|---|
| 0 | View Details (👁) | 0ms | Scale 1.0, Y 0 |
| 1 | Edit (✏) | 40ms | Scale 1.0, Y 0 |
| Freeze/Renew (❄/🔄) | Freeze or Reactivate | 80ms | Scale 1.0, Y 0 |
| 2 | Pin (📌) | 120ms | Scale 1.0, Y 0 |
| 3 | Delete (🗑) | 160ms | Scale 1.0, Y 0 |

The **opacity** fade-in for each button is 140ms (slightly faster than the scale/translate), starting at the same time as the scale. All buttons are in the same `StackPanel` with `Orientation="Horizontal"` and `HorizontalAlignment="Center"` — they appear **centered** under the row.

The result: the strip grows down, and buttons pop in one by one from left to right like a cascade, each with a tiny spring bounce.

### 5.3 What Happens on Mouse Leave

The reverse sequence fires:

**A. Row card appearance resets (instant):**
- Background returns to `CardBackgroundBrush`
- Border returns to `CardBorderBrush`, 1px uniform

**B. Buttons retract in reverse order (right-to-left collapse):**
The last button (Delete) collapses first, then Pin, then Freeze, then Edit, then Details last.

Each button retracts with `CubicEase EaseIn` (acceleration inward, snappy):
- Scale → `0.82`
- TranslateY → `-14`
- Opacity → `0.0` (100ms, slightly faster)
- Delays: Delete 0ms, Pin 30ms, Freeze 60ms, Edit 90ms, Details 120ms

**C. The strip container collapses (starts at 80ms after first button retracts):**
- Height → 0 (180ms, `CubicEase EaseIn`)
- Opacity → 0 (140ms)
- Margin → 0 (180ms)

**The 80ms delay** before the strip closes means: the first few buttons have already started folding before the container starts shrinking. This prevents an abrupt layout jump.

### 5.4 The Circular Action Buttons

Each of the 5 action buttons uses a shared `CircularActionButtonStyle`. They are:
- 36×36px circular buttons (border radius 50%)
- White/card background (from the style)
- Margin: `8px` on each side (so 16px total gap between buttons)
- Contains a small Lucide SVG icon (13×13px)
- Each has a tooltip

**The 5 buttons and their icons:**

| Button | Icon | Stroke color | Tooltip | Command |
|---|---|---|---|---|
| View Details | Eye (IconEye) | `TextSecondaryBrush` | "Détails" | `OpenStaffDetailCommand` |
| Edit | Pencil (IconEdit) | `BrandPrimaryBrush` | "Modifier" | `EditStaffCommand` |
| Freeze/Renew | Snowflake (IconSnowflake) OR Refresh (IconRefresh) | `#06B6D4` cyan OR `StatusSuccessBrush` | "Geler le collaborateur" / "Réactiver" | `ToggleStaffStatusCommand` |
| Pin | Pin outline / Pin filled | `TextSecondaryBrush` / `#F59E0B` amber | "Épingler" | `PinStaffCommand` |
| Delete | Trash (IconDelete) | `StatusErrorBrush` (red) | "Supprimer" | `DeleteStaffCommand` |

**Freeze/Renew button is context-sensitive:**
- If `EmploymentStatus = Active`: shows the **snowflake** icon (cyan) — tooltip says "Freeze"
- If `EmploymentStatus = Inactive`: shows the **refresh/renew** icon (green) — tooltip says "Reactivate/Renew"
- The icon swap is controlled by visibility of `FreezeIcon` and `RenewIcon` inside the button, triggered by the `Inactive` data trigger

**Pin button is context-sensitive:**
- If `IsPinned = false`: shows pin outline icon in `TextSecondaryBrush`
- If `IsPinned = true`: shows **filled** pin icon in `#F59E0B` amber gold
- This is triggered by the `IsPinned` data trigger

**Important:** All buttons have `PreviewMouseLeftButtonDown` wired to `OnActionButtonPreviewMouseDown` handler. This stops the mouse click from bubbling up to the row card's own click handler — otherwise clicking a button would also open the staff detail view.

---

## 6. Row States Summary

### State 1 — Default (resting, not hovered, not selected)

- `RowCard` background: `CardBackgroundBrush`
- `RowCard` border: 1px `CardBorderBrush` uniform
- `ActionRowStrip`: Height 0, invisible — takes no space
- All action buttons: invisible

### State 2 — Hovered

- `RowCard` background: `Brush.Surface.Hover`
- `RowCard` border: **3px left** `FacilityAccentBrush` + 1px rest
- `ActionRowStrip`: animates to Height 46px, margin `0,6,0,4`, fully visible
- Buttons animate in left-to-right cascade
- All rows below this one **push down** by ~56px (46px strip + 10px margin)

### State 3 — Selected (clicked / highlighted)

- `RowCard` background: `FacilityAccentDimBrush` (tinted accent background)
- `RowCard` border: **3px left** `FacilityAccentBrush` + 1px rest (same as hover)
- Selection is maintained until another row is selected or clicking outside
- The action strip **still appears on hover even when selected**

### State 4 — Pinned (`IsPinned = true`)

- `RowCard` border color: `#EAB308` (golden yellow)
- `RowCard` border thickness: **2px left**, 1px rest
- The pin indicator (small filled gold pin icon 📌) appears next to the staff name
- The pin action button in the action strip shows the filled amber pin icon
- All other states still apply on top of this (hover still highlights, etc.)

### State 5 — Inactive (`EmploymentStatus = Inactive`)

- Status badge: background → `SurfaceBgDim`, text → `TextTertiaryBrush` (gray)
- Status dot: no pulse, fixed at 60% opacity, tertiary color
- Freeze button in action strip → shows Renew/Refresh icon instead of snowflake
- All other states still apply

---

## 7. Spacing and Rhythm

| Element | Value |
|---|---|
| Between each row (item margin) | **6px** bottom margin per `ListBoxItem` |
| Between header bar and first row | **8px** (margin on header card) |
| Row card padding | 16px horizontal, 8px vertical |
| Row card corner radius | 10px |
| Action strip default height | 0px |
| Action strip expanded height | **46px** |
| Action strip top margin (expanded) | **6px** (gap between row card and strip) |
| Action strip bottom margin (expanded) | **4px** (gap before next row's top) |
| Total height added by hover expansion | ~56px (46px strip + 6px top + 4px bottom) |
| Gap between circular buttons | 8px on each side (16px between centers) |

---

## 8. Grid / Card View

The Grid View shows staff members as cards in a **horizontal WrapPanel** — cards wrap to the next line when the container is full.

### 8.1 Card Dimensions and Layout

- Card width: **260px** fixed
- Card padding: `24px` all sides
- Card corner radius: **20px**
- Card background: `CardBackgroundBrush`
- Border: 1px `Transparent` by default (becomes visible on hover and pinned states)
- Each card is wrapped in a grid with outer margin: `12px top, 48px top (for fan headroom), 44px right (for fan headroom), 16px bottom`

> **The extra top and right margin** (48px top, 44px right) is intentional — it creates space for the corner-fan action buttons that fly out beyond the card boundaries when hovered.

### 8.2 Card Internal Content (centered vertically and horizontally)

```
         ┌──────────────────────┐
         │                      │
         │   ⬤ (96×96px avatar) │
         │                      │
         │  Full Name (16px, Bold)│
         │                      │
         │ [  Role Badge Pill  ] │
         │                      │
         └──────────────────────┘
```

- **Avatar**: 96×96px `Ellipse`, filled with role color (same `RoleToBrushConverter Avatar` parameter as list view). Initials overlaid: White, Bold, 32px, centered.
- **Name**: 16px, Bold, `Segoe UI Variable Display`, `TextPrimaryBrush`, centered, max width truncates. 16px top margin (below avatar), 8px bottom margin.
- **Role badge**: pill with `CornerRadius="8"`, padding `12px h, 4px v`, background and foreground from role color converters, 12px font, SemiBold, horizontally centered.

### 8.3 Card Click Behavior

Clicking anywhere on the card background fires `OpenStaffDetailCommand`. The card has a `MouseBinding` for `LeftClick`.

### 8.4 Card States

**Default:**
- Border: 1px `Transparent` (invisible)
- Scale: 1.0

**Hovered:**
- Border: 1px `BrandPrimaryBrush` (brand color becomes visible as border highlight)
- Scale: `ScaleX = 1.01`, `ScaleY = 1.01` (very subtle 1% lift, 200ms duration)
- The corner-fan buttons animate out (see Section 8.5 below)

**Selected (clicked):**
- Background: a `LinearGradientBrush` using `FacilityAccentColor` (diagonal gradient from top-left to bottom-right)
- Border: `Transparent`
- Name text: `RowOnAccentPrimary` (on-accent text color)
- Avatar fill: `#000000` at 20% opacity (dark overlay)
- Role badge background: `#000000` at 20% opacity, foreground: `RowOnAccentPrimary`

**Pinned (`IsPinned = true`):**
- Border: `#EAB308` (gold), thickness **2px**

---

## 9. The Corner-Fan Action Buttons (Grid View Only)

This is the signature animation of the card view. When a card is hovered, **6 circular action buttons** fly out from the card's top-right corner in a **fan/arc pattern**.

### 9.1 Resting State of Each Button

All 6 buttons start "collapsed into the corner" at:
- `ScaleX = 0.82`, `ScaleY = 0.82`
- `TranslateX = -20`, `TranslateY = 20` (offset toward the top-right corner origin)
- `Opacity = 0`
- `Margin = 0, -18, -18, 0` (positioned at the corner of the card)

They are anchored to a `Canvas` at the top-right of the card with `ClipToBounds="False"` — this allows them to render outside the card boundaries.

### 9.2 Fan Animation on Hover — Enter

Each button animates to its own unique arc position. All use `BackEase EaseOut, Amplitude=0.35` (spring overshoot). Duration: **240ms** each. Opacity fades in at 150ms.

**Staggered delays and final arc positions (TranslateX, TranslateY):**

| Button | Action | Icon | Icon color | Delay | Final X | Final Y |
|---|---|---|---|---|---|---|
| 0 | View Details | Eye | `TextSecondaryBrush` | 0ms | **-72** | **-18** |
| 1 | Edit | Pencil | `BrandPrimaryBrush` | 30ms | **-50** | **-38** |
| 2 | Pay | Finance | `BrandPrimaryBrush` | 60ms | **-18** | **-44** |
| 3 | Freeze/Reactivate | Snowflake | `#06B6D4` | 90ms | **+16** | **-34** |
| 4 | Pin | Pin | `TextSecondaryBrush` | 120ms | **+38** | **-6** |
| 5 | Delete | Trash | `StatusErrorBrush` | 150ms | **+44** | **+28** |

The arc goes: left-horizontal → upper-left → upper → upper-right → right → lower-right. It forms a **quarter-circle fan** spreading from the top of the card around to the right side and slightly below.

The scale also animates to 1.0 with the same BackEase spring — giving a subtle overshoot/bounce.

### 9.3 Fan Animation on Mouse Leave — Exit (Reverse Cascade)

The fold-back is the **opposite order** — last out (Button 5 Delete) folds first.

| Fold order | Button | Delay | Returns to |
|---|---|---|---|
| 1st | Delete (5) | 0ms | X=-20, Y=20, Scale 0.82 |
| 2nd | Pin (4) | 25ms | same |
| 3rd | Freeze (3) | 50ms | same |
| 4th | Pay (2) | 75ms | same |
| 5th | Edit (1) | 100ms | same |
| 6th | Details (0) | 125ms | same |

Exit uses `QuadraticEase EaseIn` (accelerating inward). Duration: **160ms** each. Opacity fades to 0 in 100ms.

The card scale returns to 1.0 in 180ms (no easing specified — linear).

### 9.4 Z-Index Management (Grid View)

Each `ListBoxItem` in the grid has:
- Default `Panel.ZIndex = 1`
- On hover: `Panel.ZIndex = 999`

This ensures that the fan buttons of the hovered card render **on top of all adjacent cards** — they won't be clipped or hidden by neighboring cards.

---

## 10. Empty State

Both views show an empty state when `FilteredStaffMembers.Count = 0`.

The empty state is a centered card containing:
1. A large accent-colored circle (160px) with low opacity (3%) as a soft background glow
2. A 68×68px rounded icon container (`FacilityAccentDimBrush` bg, corner radius 34px) with a team/members icon (`FacilityAccentBrush` filled) — 16px bottom margin
3. Primary title text: 20px, SemiBold, `TextPrimaryBrush`, centered — 6px bottom margin
4. Description text: 14px, `TextSecondaryBrush`, centered, max width 320px, wraps — 24px bottom margin
5. Two buttons in a row:
   - Primary "Add Staff" button (fires `OpenAddStaffCommand`)
   - Secondary "Reset Filters" button (fires `ResetFiltersCommand`) — only visible if `SearchQuery` is non-empty

---

## 11. Key Behavioral Rules for the Web Agent

1. **The action strip uses real layout height** — not `overflow: hidden` on a fixed parent. When `height` animates from 0 to 46px, the row takes up more physical space and rows below it shift down. Use CSS `height` animation on a real block element, not `max-height`.

2. **Clicking a button in the action strip must NOT trigger the row click.** Use `event.stopPropagation()` on the buttons in the action strip and the kebab button.

3. **The kebab (⋮) button opens a dropdown, not a full detail view.** Only clicking the main row card body opens the detail view.

4. **The left border accent (3px left on hover/selection)** is asymmetric — 3px left, 1px on the other three sides. Use `border-left: 3px solid var(--facility-accent)` with separate `border-top/right/bottom: 1px`.

5. **The status dot pulsing animation only runs when the staff member is Active.** It is a continuous loop. It must stop for Inactive staff.

6. **The pin icon in the row is always in the DOM** but `display: none` (or `visibility: hidden`) until `IsPinned = true`. This prevents layout shift.

7. **In the grid view, cards render at 260px fixed width** and wrap naturally. Do not use a fixed-column CSS grid — use `flex-wrap: wrap` so the number of columns adapts to screen width.

8. **Both the email cell and phone cell are clickable copy buttons**, not plain text. They have their own hover state independent of the row hover. The row hover and the cell hover are independent — hovering a cell does not cancel the row hover.

9. **The Freeze button in both views shows a different icon depending on staff status.** The icon and tooltip switch together.

10. **The stagger delay between action strip buttons is 40ms in list view and 30ms in grid view.** These are different — do not use the same value for both.
