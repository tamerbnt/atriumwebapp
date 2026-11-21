# Atrium – GymHome & StaffHome Screen Specification
> **For the web app developer — do not code yet. This document describes the layout, structure, color system, pods, and cards of two screens as they exist in the WPF desktop app. Use this as a faithful reference when rebuilding them for the web.**

---

## 1. Design System Tokens

These are dynamic brush tokens resolved at runtime depending on the active theme (light/dark). Map them to equivalent CSS custom properties.

| WPF Token | Meaning |
|---|---|
| `CardBackgroundBrush` | Card / panel background (white in light mode) |
| `SurfaceBgElevated` | Pod tray background (slightly off-white / very light grey) |
| `SurfaceBgDim` | Subtle hover / pressed surface |
| `CardBorderBrush` | 1px border on cards and pods |
| `TextPrimaryBrush` | Main heading text |
| `TextSecondaryBrush` | Sub-labels, supporting text |
| `TextTertiaryBrush` | Faint captions, relative timestamps |
| `FacilityAccentBrush` | Primary brand accent (per-facility color) |
| `FacilityAccentBrush.Deep` | Darker shade of accent (hover state) |
| `FacilityAccentDimBrush` | Tinted transparent accent background (icon wells, badges) |
| `StatusSuccessBrush` / `StatusSuccessBackground` | Green success states |
| `StatusWarningBrush` / `StatusWarningBackground` | Amber warning states |
| `StatusErrorBrush` / `StatusErrorBackground` | Red error states |
| `StatusInfoBackground` | Blue info dim background |

> **Special hardcoded colors:**
> - Dark Espresso Card: `#1F1D1B` (background), `#E7E5E4` (text), `#3D2817` (badge bg), `#FB923C` (badge text)
> - Blue icon well: `#1A3B82F6` (bg), `#3B82F6` (icon)
> - Green icon well: `#1A10B981` (bg), `#10B981` (icon)
> - Amber icon well: `#1AF59E0B` (bg), `#F59E0B` (icon)
> - Live indicator dot: `#10B981`

---

## 2. GymHome Screen (`GymHomeView.xaml`)

### 2.1 Overall Page Structure

```
Page Background: Transparent (the app shell provides the outer background)
  └── Outer Rounded Workspace Panel
        Background : CardBackgroundBrush
        Border     : 1px CardBorderBrush
        CornerRadius: 28px
        Margin     : 16px horizontal, 12px vertical
        └── Content Grid (Margin 24,20,24,20)
              Row 0 [Auto] — Header Row
              Row 1 [*]    — Two-Column Pod Canvas
```

The page has a **skeleton loader** that is shown while data is loading. Once loaded, it is replaced by the actual content.

---

### 2.2 Row 0 — Header

A horizontal row split into **Left** and **Right**:

**Left side:**
- Large greeting text: `"Welcome back, Tamer!"` — FontSize 28, Bold, `TextPrimaryBrush`
- Subtitle below it: small supporting text from localization — FontSize 12.5, Regular, `TextSecondaryBrush`

**Right side (horizontal stack):**
- `BranchSwitcherView` component (shared widget for switching branches)
- **"Quick Actions" CTA Button** (ToggleButton that opens a popup):
  - Background: `FacilityAccentBrush`
  - White text, white `+` icon to the left
  - Height 42px, CornerRadius 14px, Padding 20px horizontal
  - Hover → `FacilityAccentBrush.Deep` + stronger shadow
  - When clicked → opens a **Floating Popup Menu** (see below)

**Quick Actions Floating Popup:**
- Background: `CardBackgroundBrush`, Border: 1px `CardBorderBrush`, CornerRadius 18px, Width 230px
- Has drop shadow (BlurRadius 24, Opacity 0.12)
- Contains a small bold uppercase section label "Quick Actions"
- 4 flat list buttons (height 40px each), each with:
  - A colored icon well (30×30px, CornerRadius 8px)
  - A label text (FontSize 12.5, `TextPrimaryBrush`)
  - Hover: `SurfaceBgElevated` background

  | Action | Icon Well Color | Label |
  |---|---|---|
  | Quick Sale | `FacilityAccentDimBrush` | Quick Sale |
  | New Member | `StatusSuccessBackground` | New Member |
  | Walk-In | `StatusWarningBackground` | Walk-In |
  | Multi-Sale | `StatusInfoBackground` | Multi-Sale |

---

### 2.3 Row 1 — Two-Column Pod Canvas

Split into two columns:

| Column | Proportion | Content |
|---|---|---|
| Left | ~38% (`3.8*`) | Summary Pod + 2 KPI Tiles + Prompt Banner |
| Gap | 20px fixed | — |
| Right | ~62% (`6.2*`) | Activity Pod + Transactions Pod |

---

### 2.4 Left Column (~38%)

Three stacked sections:

#### 2.4.1 Summary Pod Tray

- **Container (Pod Tray):**
  - Background: `SurfaceBgElevated`
  - Border: 1px `CardBorderBrush`, CornerRadius 24px, Padding 16px

- **Pod Header (inside the tray):**
  - Left: Title `"Summary"` (FontSize 13.5, SemiBold) + subtitle below (FontSize 11, `TextSecondaryBrush`)
  - Right: Pill dropdown `"Daily ▾"` — Background `CardBackgroundBrush`, Border 1px, CornerRadius 12px

- **Inset Floating White Card (nested inside the pod tray):**
  - Background: `CardBackgroundBrush`, Border 1px, CornerRadius 18px, Padding 18,16px
  - Contains two sections stacked vertically:

  **Section A — Two Metric Columns:**
  - Split into 2 columns with a 1px hairline vertical divider between them
  - **Left metric — People Inside:**
    - Small circular icon well (18×18px, CornerRadius 9, `FacilityAccentDimBrush` bg)
    - Label: `"People Inside"` (FontSize 11, `TextSecondaryBrush`)
    - Value: `OccupancyCount` large (FontSize 24, Bold) with `/MaxCapacity` beside it in smaller tertiary text
  - **Right metric — Daily Check-Ins:**
    - Small circular icon well (18×18px, CornerRadius 9, `StatusSuccessBackground` bg)
    - Label: `"Daily Entries"` (FontSize 11, `TextSecondaryBrush`)
    - Value: `DailyCheckInsCount` large (FontSize 24, Bold) with `"entrées"` unit beside it

  **Section B — Occupancy Histogram Chart:**
  - 10 rounded capsule bars (bar chart) rendered via LiveCharts
  - Height 120px, no axis labels, no tooltip, no legend
  - Negative margin on left/right to bleed to card edges (`-8,4,-8,-6`)

---

#### 2.4.2 Dual Compact KPI Tiles

Two side-by-side tiles (equal width, 14px gap):

Each tile:
- Background: `SurfaceBgElevated`, CornerRadius 18px, Padding 16,14px

| Tile | Icon | Label | Badge | Value |
|---|---|---|---|---|
| Weekly Average Revenue | History icon | "Moyenne Semaine" | Trend text in `StatusSuccessBackground` | `WeeklyRevenueAverage` FontSize 22 Bold |
| Monthly Target Progress | Members icon | "Objectif Mensuel" | Status text in `StatusSuccessBackground` | `MonthlyTargetProgressText` FontSize 22 Bold |

---

#### 2.4.3 Sleek Prompt Banner (Atrium Tips Card)

- Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 18px, Padding 16,14px
- Fills remaining vertical space (`Height="*"`)
- 3 internal rows:

  **Row 0 — Header:**
  - Left: Accent-colored badge `"ASTUCE 1/5"` (FontSize 9.5, Bold, `FacilityAccentBrush` bg dim, text accent) + title `"Conseil Atrium"` (SemiBold 11.5)
  - Right: `‹` step fraction `›` navigation arrows (FontSize 10, tertiary)

  **Row 1 — Description:**
  - Multi-line text (FontSize 13, `TextSecondaryBrush`, LineHeight 20, wrapping)

  **Row 2 — CTA Button:**
  - Full-width button, Height 36px, CornerRadius 10px
  - Background: `FacilityAccentDimBrush`
  - Text (SemiBold 12, `FacilityAccentBrush`) + right arrow icon

---

### 2.5 Right Column (~62%)

Two stacked pods:

#### 2.5.1 Activity Pod Tray (top)

- **Container:**
  - Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 24px, Padding 16px

- **Pod Header:**
  - Left: Title `"Activity"` (FontSize 13.5, SemiBold) + subtitle (FontSize 11, `TextSecondaryBrush`)

- **3 Inset Activity Cards (equal width, 12px gap):**

  Each card: CornerRadius 18px, Padding 16,14px, **Height 155px**, ClipToBounds true.
  Each card has a **sparkline chart** (area/line chart, Height 76px) bleeding to the edges via negative margin, rendered behind the text labels.

  | Card | Background | Metric | Badge Color | Value |
  |---|---|---|---|---|
  | Card 1 — Revenue Today | `CardBackgroundBrush` (white) | `RevenueToday` | `StatusSuccessBackground` green | Large bold currency |
  | Card 2 — Active Members | `CardBackgroundBrush` (white) | `ActiveMembersTotal` | `StatusSuccessBackground` green | Large bold number |
  | Card 3 — Expiring Soon | `#1F1D1B` **Dark Espresso** | `ExpiringSoonCount` | `#3D2817` amber bg, `#FB923C` text | Large bold white number |

  Card layout (layered):
  - Bottom layer: sparkline chart (full bleed)
  - Top layer (ZIndex 1): label (FontSize 11) → colored badge pill → large bold value (FontSize 22)

---

#### 2.5.2 Transactions / Recent Activity Pod Tray (bottom, fills remaining height)

- **Container:**
  - Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 24px, Padding 16px

- **Pod Header:**
  - Left: Title `"Recent Activity"` (FontSize 13.5, SemiBold) + subtitle (FontSize 11)
  - Right: **Filter Pill Group** inside a bordered container (CornerRadius 10px, Height 32px, Padding 3px):
    - 3 RadioButtons styled as capsule pills: `"Tous"` | `"Passages"` | `"Ventes"`
    - Active state: `FacilityAccentDimBrush` background, accent-colored text, Bold
    - Hover state: `SurfaceBgElevated` background

- **Column Headers Card:**
  - Background: `CardBackgroundBrush`, Border 1px, CornerRadius 12px, Padding 16,8px
  - 4 sortable columns:

  | Column | Width | Label |
  |---|---|---|
  | Membre | `2.2*` (min 140px) | MEMBRE + ↕ sort arrows pill |
  | Opération | `2*` (min 130px) | OPÉRATION |
  | Statut | 90px fixed | STATUT |
  | Heure | 70px fixed | HEURE |

- **Activity Rows List (ListBox):**
  - Background: Transparent, no border
  - Each row is a **RowCard** (Border):
    - Background: `CardBackgroundBrush`, Border 1px `CardBorderBrush`, CornerRadius 12px, Padding 16,0px, MinHeight 48px
    - Hover: background → `SurfaceBgElevated`
    - 4 columns matching the header widths:

    | Col | Content |
    |---|---|
    | 0 — Membre | 28×28px circular avatar (accent dim bg, initials text) + member name (SemiBold 12.5) |
    | 1 — Opération | Operation description text (FontSize 11.5, `TextSecondaryBrush`) |
    | 2 — Statut | Colored pill badge (CornerRadius 6px, FontSize 10, SemiBold) |
    | 3 — Heure | Relative time (FontSize 11, `TextTertiaryBrush`, right-aligned) |

- **Empty State:** Centered icon + two lines of text when there are no activity entries

---

## 3. StaffHome Screen (`StaffHomeView.xaml`)

### 3.1 Overall Page Structure

```
Page Background: Transparent
  └── Outer Rounded Workspace Panel
        Background : CardBackgroundBrush
        Border     : 1px CardBorderBrush
        CornerRadius: 28px
        Margin     : 16px horizontal, 12px vertical
        └── ScrollViewer (vertical scroll enabled)
              └── Content Grid (Margin 24,20,24,20)
                    Row 0 [Auto] — Header: Greeting + KPI Tiles
                    Row 1 [16px] — Spacer
                    Row 2 [Auto] — Scan / Search Bar
                    Row 3 [16px] — Spacer
                    Row 4 [Auto] — Quick Action Tiles (4 tiles)
                    Row 5 [16px] — Spacer
                    Row 6 [*]   — Bottom: Live Feed Pod + Attention Pod
```

> Note: The entire content is inside a `ScrollViewer` — the page can scroll vertically.

---

### 3.2 Row 0 — Header: Greeting + KPI Tiles

A single horizontal grid with **left greeting block** + **4 KPI stat tiles** on the right:

**Left — Greeting & Clock:**
- Accent-colored greeting label (`FacilityAccentBrush`, FontSize 12, SemiBold) e.g. "Good morning,"
- Staff name (FontSize 22, Bold, `TextPrimaryBrush`)
- Current date below (FontSize 12, `TextSecondaryBrush`)
- Live clock overlaid at the bottom (FontSize 11, Bold, Opacity 0.4)

**Right — 4 KPI Stat Tiles (horizontal, 12px gaps):**

Each tile uses `StatTileStyle`:
- Background: `SurfaceBgElevated`
- Border: 1px `CardBorderBrush`, CornerRadius 18px, Padding 16,12px

| Tile | MinWidth | Label | Value Style | Special |
|---|---|---|---|---|
| Occupancy | 130px | "Live Turnstile" + green live dot (8px `#10B981`) | FontSize 19, Black | Progress bar below (4px height, green or red if overflow) |
| Today Check-ins | 110px | "Daily Entries" | FontSize 26, Black + unit label | — |
| Expiring Soon | 110px | "Attention" | FontSize 26, Black → amber if `HasExpiringToday` | — |
| Cash Drawer | 120px | "Cash Drawer" | FontSize 18, Black — shows total in DA | — |

---

### 3.3 Row 2 — Scan / Search Bar

A single full-width card:
- Background: `CardBackgroundBrush`, Border 1px `CardBorderBrush`, CornerRadius 16px, Padding 16,12px
- Border color dynamically changes based on scan result:
  - Default: `CardBorderBrush`
  - Success: `StatusSuccessBrush` (green)
  - Error: `StatusErrorBrush` (red)
  - Warning: `StatusWarningBrush` (amber)

**Internal layout (4 columns):**
1. **Scan icon** (accent color, 18×18px) — left
2. **Text input** (FontSize 15, Medium, transparent background, no border) — fills remaining width — with placeholder text
3. **Scan result feedback** (shown after scan):
   - Colored badge pill (CornerRadius 8px) with ✓ / ✗ / ⚠ icon + result title + subtitle
4. **Validate / Search button** (`PrimaryButton` style, Height 38px, Padding 18,0px)

---

### 3.4 Row 4 — Quick Action Tiles (4 tiles)

4 equal-width clickable tiles (12px gaps), each using `QuickActionTileStyle`:
- Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 18px, Padding 16,12px, Height 76px
- Hover: background → `CardBackgroundBrush`, border → `FacilityAccentBrush` (accent highlight)
- Pressed: background → `FacilityAccentDimBrush`

Each tile layout (2 columns):
- **Left column:** 38×38px icon well (CornerRadius 10px) with centered icon (18×18px)
- **Right column:** Title (FontSize 13.5, Bold, `TextPrimaryBrush`) + subtitle (FontSize 11, `TextSecondaryBrush`)

| Tile | Icon Well Color | Icon Color | Title |
|---|---|---|---|
| Walk-In | `FacilityAccentDimBrush` | `FacilityAccentBrush` | Walk-In |
| Quick Sale POS | `#1A3B82F6` (blue dim) | `#3B82F6` (blue) | Quick Sale |
| New Member | `#1A10B981` (green dim) | `#10B981` (green) | New Member |
| Multi-Sale Cart | `#1AF59E0B` (amber dim) | `#F59E0B` (amber) | Multi-Cart |

---

### 3.5 Row 6 — Bottom Section: Two-Column Layout

Split into:

| Column | Width | Content |
|---|---|---|
| Left | `*` (fills remaining) | Live Turnstile Feed Pod |
| Gap | 16px | — |
| Right | 320px fixed | Attention / Expiring Members Pod |

---

#### 3.5.1 Live Turnstile Feed Pod (Left, fills width)

- **Container (Pod Tray):**
  - Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 24px, Padding 16px

- **Pod Header:**
  - Left: green live dot (8px `#10B981`) + title `"Live Turnstile"` (Title2 style, `TextPrimaryBrush`)
  - Right: hardware status pills:
    - **RFID pill** (CornerRadius 8px, Padding 8,3px):
      - Green bg (`StatusSuccessBackground`) + green text if online
      - Red bg (`StatusErrorBackground`) + red text if offline
    - **Ticket/Printer pill** (same pattern):
      - Green bg if online, dim bg if offline

- **Feed Items List (scrollable):**
  - `ItemsControl` with no outer border, scrollable
  - Each row uses `FeedRowStyle`:
    - Background: `CardBackgroundBrush`, Border 1px `CardBorderBrush`, CornerRadius 12px, Padding 12,10px, Margin 0,3px
    - Hover: `SurfaceBgDim`
    - 3 columns:

    | Col | Width | Content |
    |---|---|---|
    | Avatar | 36px | 32×32px square-ish avatar (CornerRadius 8px, `FacilityAccentDimBrush` bg, initials text in `FacilityAccentBrush`, FontSize 11, Bold) |
    | Name + Status | `*` | Title text (FontSize 13, Medium, `TextPrimaryBrush`) + Status subtitle (FontSize 11, `TextSecondaryBrush`) |
    | Time | Auto | Relative time (FontSize 11, `TextTertiaryBrush`) |

- **Empty State:** 📋 emoji (FontSize 36, Opacity 0.3) + 2 lines of text (medium + tertiary)

---

#### 3.5.2 Attention / Expiring Members Pod (Right, 320px)

- **Container (Pod Tray):**
  - Background: `SurfaceBgElevated`, Border 1px `CardBorderBrush`, CornerRadius 24px, Padding 16px

- **Pod Header:**
  - Left: Title `"Attention"` (FontSize 13.5, SemiBold, `TextPrimaryBrush`)
  - Right: amber count badge (CornerRadius 8px, bg `#1AF59E0B`, text `#F59E0B`, FontSize 12, Bold) — only shown when there are expiring members

- **Expiring Members List (scrollable):**
  - `ItemsControl`, same `FeedRowStyle` as the feed
  - Each row (3 columns):

  | Col | Width | Content |
  |---|---|---|
  | Avatar | 36px | 32×32px avatar (CornerRadius 8px, bg `#1AF59E0B` amber dim, initials in `#F59E0B` amber) |
  | Name + Days Left | `*` | Member name (FontSize 12.5, Medium) + `"+Xj"` days left (FontSize 11, `TextSecondaryBrush`) |
  | Renew Button | Auto | `SecondaryButton` style, Height 28px, Padding 10,0px, FontSize 11, Label: "Renew" |

- **All Good Empty State (when no expiring members):**
  - Green ✓ checkmark (FontSize 32, `StatusSuccessBrush`, Opacity 0.6)
  - Short success message text below

---

## 4. Key Design Patterns — Summary for the Developer

| Pattern | Details |
|---|---|
| **Pod Tray** | Soft grey container (`SurfaceBgElevated`), CornerRadius 24px. Holds cards inside. |
| **Card** | White container (`CardBackgroundBrush`), CornerRadius 18px, 1px border. Lives inside a pod. |
| **Feed Row** | White row card, CornerRadius 12px, 1px border, padding 12,10px. Hover changes bg. |
| **KPI Stat Tile** | `SurfaceBgElevated`, CornerRadius 18px, no shadow. Used for numbers. |
| **Icon Well** | Square with CornerRadius 8-10px, colored dim background. Icon inside at 18×18px. |
| **Avatar** | Square-ish, CornerRadius 8px, accent-dim bg, initials text in accent color. |
| **Filter Pills** | RadioButtons inside a bordered container. Active = dim accent bg + accent text. |
| **Status Badges** | Small pills (CornerRadius 5-8px), colored bg + colored bold text. |
| **Sparkline Charts** | Background area charts, bleed to card edges via negative margin. No tooltip/legend. |
| **Dark Espresso Card** | Special `#1F1D1B` dark anchor card used in the Activity Pod for contrast. |
| **Outer Workspace** | Single large rounded panel (CornerRadius 28px) that holds all content. Page bg is transparent. |

---

## 5. Typography Reference

| Usage | FontSize | Weight | Color Token |
|---|---|---|---|
| Page greeting | 28px | Bold | `TextPrimaryBrush` |
| Staff name | 22px | Bold | `TextPrimaryBrush` |
| Pod/section title | 13.5px | SemiBold | `TextPrimaryBrush` |
| Tile label | 10.5–11px | Medium | `TextSecondaryBrush` |
| KPI value (large) | 22–26px | Black/Bold | `TextPrimaryBrush` |
| Card metric value | 22px | Bold | `TextPrimaryBrush` |
| Feed item title | 12.5–13px | Medium/SemiBold | `TextPrimaryBrush` |
| Feed item subtitle | 11px | Regular | `TextSecondaryBrush` |
| Relative timestamp | 11px | Regular | `TextTertiaryBrush` |
| Badge / pill text | 10–10.5px | SemiBold/Bold | status color |
| Column header | 12px | SemiBold | `TextPrimaryBrush` |

Font family used throughout: **Segoe UI Variable** (Display for headings, Text for body)
For the web, use: `Inter`, `DM Sans`, or similar modern variable font.
