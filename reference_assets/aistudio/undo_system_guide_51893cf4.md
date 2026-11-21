# Atrium Undo System — Web Agent Guide

> This document is written for the web agent building the browser version of Atrium.
> It describes exactly how the undo system works in the desktop (WPF) app — its logic,
> its visual design, its animations, and where it lives — so the web version can faithfully reproduce it.

---

## 1. What Is the Undo System?

Atrium uses a **"deferred-delete with undo" pattern**. When a user performs a destructive
action (deleting a member, cancelling an appointment, removing an item, etc.) the app does
**not** ask the user "Are you sure?". Instead:

1. The action is **executed immediately** in the database.
2. A **toast notification** appears telling the user what happened.
3. The toast includes an **Undo button** — the user has **6 seconds** to click it.
4. If the user clicks Undo, the action is **reversed** (the record is restored).
5. If the user does nothing, the toast disappears and the delete is permanent.

This pattern is the same philosophy used by Gmail's "Undo Send" and Google Drive's delete toasts.

---

## 2. Architecture — How It Works Under the Hood

### 2.1 The Two Services Involved

There are two separate services. Understanding both is critical.

#### `NotificationService` (primary — toast UI)
**File:** `Management.Presentation/Services/NotificationService.cs`

This is the service that actually shows the toast on screen. It has a special overload of `ShowSuccess`:

```csharp
void ShowSuccess(string message, Func<Task> undoAction, string undoLabel = "Undo")
```

When called with an `undoAction`:
- A `ToastViewModel` is created with `HasUndo = true`.
- An `UndoCommand` is wired to an async relay command that executes the undo lambda.
- The toast auto-dismisses after **6 seconds** (vs 3 seconds for a regular toast with no undo).
- On Undo click: `IsExiting = true` is set immediately (to trigger the exit animation), then `undoAction()` is awaited, then the toast is removed.

#### `UndoService` (secondary — stack-based history)
**File:** `Management.Presentation/Services/UndoService.cs`

This is a simpler, stack-based undo history that holds up to 10 undoable actions. It has its
own `IsBannerVisible` flag with a **5-second** auto-hide timer. It is used in fewer places
and is more of a lower-level API. The toast-based approach via `NotificationService` is what
the user actually sees.

### 2.2 The Data Model

**`ToastViewModel`** (`Management.Presentation/ViewModels/Shared/ToastViewModel.cs`):

| Property | Type | Purpose |
|---|---|---|
| `Id` | `Guid` | Unique identifier for the toast |
| `Type` | `ToastType` | `Info`, `Success`, `Warning`, `Error` |
| `Message` | `string` | The text shown in the pill |
| `UndoCommand` | `ICommand?` | The command to execute on undo |
| `UndoLabel` | `string` | Button text — defaults to `"Undo"` |
| `HasUndo` | `bool` (computed) | `true` if `UndoCommand != null` |
| `IsExiting` | `bool` (observable) | When set to `true`, triggers the exit animation |
| `IsPaused` | `bool` | Auto-dismiss pause flag (hover) |
| `DismissCommand` | `ICommand` | The "×" button command |
| `CreatedAt` | `DateTime` | Used to calculate auto-dismiss timing |

The `HasUndo` property is the **primary data-binding flag** that controls whether the undo
button and the fuse bar are shown or hidden.

### 2.3 Timing Rules

| Condition | Auto-dismiss after |
|---|---|
| Regular toast (no undo) | **3 seconds** |
| Toast with undo button | **6 seconds** |
| Toast while hovered (paused) | Paused; resumes with 2-second grace on mouse-leave |

The timer runs on a `DispatcherTimer` that fires every **500ms** and checks all active toasts.

### 2.4 Queue Management

**Only 1 toast is visible at a time** (`MaxVisibleToasts = 1`).

If a new toast is shown while one is already visible:
- The oldest toast is **instantly removed** (no animation) to make room.
- The new toast enters with its entrance animation.

---

## 3. Visual Design — The Toast Pill

### 3.1 Where It Lives

The toast container is placed in the **main window's root grid**, spanning the entire
window area. It sits at:
- **Horizontal alignment:** Center (horizontally centered over the whole app window)
- **Vertical alignment:** Top
- **Top margin:** 96px from the top of the window (below the custom title bar)
- **Z-Index:** 9999 (floats above all content — modals, drawers, everything)

This means the toast pill **always appears at the top-center of the app**, regardless
of which screen the user is on.

### 3.2 The Toast Pill Shape

The toast is a **rounded pill/card** (`CornerRadius="22"`) with:

| Property | Value |
|---|---|
| Min height | 44px |
| Min width | 220px |
| Max width | 520px |
| Corner radius | 22px (fully pill-shaped) |
| Background | `CardBackgroundBrush` (theme-adaptive: dark in dark mode, light in light mode) |
| Border | 1px `CardBorderBrush` |
| Padding | `16px left, 0 top, 18px right, 0 bottom` |
| Drop shadow | Blur 28, Depth 4, 30% black opacity |
| Spacing between stacked toasts | 10px bottom margin |

### 3.3 Internal Layout — 4-Column Grid

Inside the pill there are **4 horizontal zones**:

```
[ Icon ]  [ Message text ... ]  [ Undo button ]  [ × ]
   Col 0         Col 1               Col 2         Col 3
  Auto         Stretch (*)           Auto          Auto
```

#### Col 0 — Status Icon (Lucide vector icons)
A small 12–14px Lucide-style SVG icon indicating the toast type:

| Type | Icon path (SVG d attribute) | Color |
|---|---|---|
| `Success` | `M20 6L9 17L4 12` (checkmark) | `#10B981` (emerald) |
| `Error` | `M18 6L6 18M6 6l12 12` (X) | `#EF4444` (red) |
| `Warning` | Triangle alert path | `#F59E0B` (amber) |
| `Info` | Circle with `i` path | `FacilityAccentBrush` (facility brand color) |

Only the icon matching the `Type` is shown; others are `Visibility=Collapsed`.
Margin: `0 0 10 0` (10px gap right before the message).

#### Col 1 — Message Text
- Font size: **13px**
- Font weight: **Medium**
- Color: `TextPrimaryBrush` (theme-adaptive)
- Text trimming: `CharacterEllipsis`
- Right margin: **16px** (breathing room before undo button)
- Vertical alignment: Center

#### Col 2 — Undo Button (only when `HasUndo = true`)
This is the key element. It is a fully custom-templated `Button`:

- **Visibility:** bound to `HasUndo` — `Collapsed` when there is no undo
- **Background:** `Transparent` (no default button chrome)
- **Padding:** `6px horizontal, 3px vertical`
- **Cursor:** Hand

Inside the button template is a `Border` named `UndoPill` with:
- `CornerRadius="8"` (slightly rounded inner pill)
- `Background="Transparent"` (default), `FacilityAccentDimBrush` on hover/pressed

The button content is a horizontal `StackPanel` containing:

1. **Lucide Undo2 icon** (SVG path):
   ```
   M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11
   ```
   - Size: 13×13px
   - Stroke: `FacilityAccentBrush` (the facility's brand/theme color)
   - Margin: `0 0 6 0` (6px gap before text)

2. **Label text** bound to `UndoLabel` (default: "Undo")
   - Font size: 13px
   - Font weight: **SemiBold**
   - Color: `FacilityAccentBrush`

**Hover state**: Background of `UndoPill` becomes `FacilityAccentDimBrush` (a dimmed/tinted version of the accent color).

> **Key design point:** The undo button uses the facility's **brand/accent color** (not a generic blue). In a sport gym it might be orange; in a salon it might be rose pink; in a martial arts academy it might be red. The web version should use a CSS variable equivalent for this.

#### Col 3 — Dismiss (×) Button
- Size: 18×18px
- Icon: `M18 6L6 18M6 6l12 12` (Lucide X, 8×8px stretched)
- Stroke: `TextSecondaryBrush`, **0.5 opacity** (very subtle by default)
- On hover: opacity goes to 1.0, stroke changes to `TextPrimaryBrush`
- Left margin: 6px

### 3.4 The Fuse Bar (Countdown Indicator)

Below the 4-column row, there is a **Row 1** in the pill's inner grid:

```
[ track bar (dim)    ]
[ ████████..... fuse ]  ← shrinks left-to-right over 6 seconds
```

- **Height:** 2px
- **Horizontal margin:** 16px on each side
- **Bottom margin:** 2px from pill edge
- **Visibility:** bound to `HasUndo` — only visible when the undo button is shown

It consists of two stacked `Border` elements:
1. **Track** (`SurfaceBgDim` background, `CornerRadius="1"`) — the gray background "rail"
2. **Fuse** (`FacilityAccentBrush` background, `CornerRadius="1"`) — the colored bar

The fuse bar uses a `ScaleTransform` anchored at the **left edge** (`CenterX=0`):
- **Start:** `ScaleX = 1.0` (full width)
- **End:** `ScaleX = 0.0` (width collapses to zero from right to left)
- **Duration:** exactly **6 seconds** (matching the 6-second undo window)
- The animation starts on `Loaded` (when the toast element enters the visual tree)

This creates the "burning fuse" countdown effect that communicates the time limit visually.

---

## 4. Animations

### 4.1 Entrance Animation (Toast Appears)

Triggered by the `Loaded` event on the toast `Border`.

Two animations run **simultaneously**:

| Property | From | To | Duration | Easing |
|---|---|---|---|---|
| `TranslateTransform.Y` | `-24px` | `0px` | **320ms** | `CubicEase EaseOut` |
| `Opacity` | `0` | `1` | **200ms** | `CubicEase EaseOut` |

Effect: The pill **drops in from 24px above** its final position while fading in.
The position animation is longer (320ms) than the opacity (200ms), making the slide feel
"spring-like" — the pill arrives at its position after it becomes mostly visible.

The `TranslateTransform` is pre-set to `Y="-24"` before the animation starts
(the element starts above its position in the layout).

### 4.2 Exit Animation (Toast Disappears)

Triggered when `IsExiting` changes to `true` (data trigger).

Two animations run **simultaneously**:

| Property | From | To | Duration | Easing |
|---|---|---|---|---|
| `TranslateTransform.Y` | `0px` | `-20px` | **220ms** | `CubicEase EaseIn` |
| `Opacity` | `1` | `0` | **180ms** | `CubicEase EaseIn` |

Effect: The pill **slides upward 20px** while fading out.
This is the reverse of the entrance — `EaseIn` makes the movement accelerate toward the end
for a snappy, decisive exit.

After the exit animation, the code waits `AnimationDurationMs` (300ms) then removes the
toast from the `ActiveToasts` collection, which destroys the DOM element.

### 4.3 Hover Pause (Toast Freezes Timer)

- When the mouse enters the toast (`MouseEnter`), `IsPaused = true` → the auto-dismiss timer
  stops counting down.
- When the mouse leaves (`MouseLeave`), `IsPaused = false` and `CreatedAt` is reset to
  `DateTime.Now - 2 seconds` (giving a 2-second "reading grace period").

> **For the web version:** Use `mouseover` / `mouseleave` events. On hover, pause the
> dismiss timer and pause the fuse bar CSS animation. On mouse leave, resume both.

---

## 5. Where Undo Is Currently Used

The undo-enabled toast is triggered in these specific scenarios:

### Salon / Appointments
| Action | Message | Undo Does |
|---|---|---|
| Cancel appointment (from list) | `"Appointment for {name} cancelled."` | Restores appointment, refreshes list |
| Cancel appointment (from detail modal) | `"Appointment for {name} cancelled."` | Restores appointment, sends refresh message |
| Reschedule appointment (drag/drop) | Move success message with new time | Re-schedules back to old time, refreshes list |

Regular toasts (no undo) are used for: status changes, service saves, service deletion,
bulk archive, price increases, exports — any action that is lower-risk or easily reversible
through the normal UI.

---

## 6. How a ViewModel Triggers an Undo Toast

This is the single API call a ViewModel makes. No UI code is needed in the ViewModel.

```csharp
// Inject: INotificationService _notificationService

var itemId = item.Id;  // capture before any async work

await service.DeleteAsync(itemId);  // execute the action immediately

_notificationService.ShowSuccess(
    message: "Item deleted successfully.",
    undoAction: async () =>
    {
        await service.RestoreAsync(itemId);   // reverse the action
        await RefreshList();                  // update the UI
    },
    undoLabel: "Undo"  // optional, defaults to "Undo"
);
```

Key points:
1. **Delete first, notify second.** The action always runs before the toast.
2. **Capture IDs before async.** Never capture `SelectedItem` in the lambda — it may change.
3. The `undoAction` lambda is an `async () => Task`.
4. The `NotificationService` handles everything else: creating the command, wiring the timer, setting `HasUndo`, etc.

---

## 7. Web Implementation Recipe

To faithfully reproduce this in the web version, your implementation needs:

### State
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  undoAction?: () => Promise<void>;
  undoLabel?: string;          // default: "Undo"
  hasUndo: boolean;
  isExiting: boolean;
  isPaused: boolean;
  createdAt: Date;
}
```

### Timing Constants
```typescript
const REGULAR_DISMISS_MS = 3000;   // 3s for plain toasts
const UNDO_DISMISS_MS = 6000;      // 6s for undo toasts
const EXIT_ANIMATION_MS = 300;     // wait before removing from DOM
const CHECK_INTERVAL_MS = 500;     // polling interval
```

### Lifecycle
1. On action: execute action → call `showToast({ message, undoAction })`
2. Toast renders with entrance animation (translateY -24→0, opacity 0→1)
3. Fuse bar CSS animation starts immediately (width 100%→0% over 6s)
4. On hover: pause timer + pause fuse bar animation
5. On mouse-leave: resume timer (with 2s grace) + resume animation
6. On undo click: set `isExiting=true` → run exit animation → call `undoAction()` → remove toast
7. On dismiss (×): set `isExiting=true` → run exit animation → remove toast
8. On timeout: same as dismiss

### CSS Animations

```css
/* Entrance */
@keyframes toast-enter {
  from { transform: translateY(-24px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

/* Exit */
@keyframes toast-exit {
  from { transform: translateY(0);     opacity: 1; }
  to   { transform: translateY(-20px); opacity: 0; }
}

/* Fuse bar */
@keyframes fuse-burn {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

.toast-card {
  animation: toast-enter 320ms cubic-bezier(0.215, 0.61, 0.355, 1) both;
}

.toast-card.exiting {
  animation: toast-exit 220ms cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
}

.fuse-bar {
  transform-origin: left center;
  animation: fuse-burn 6s linear forwards;
}

.fuse-bar.paused {
  animation-play-state: paused;
}
```

### Toast Positioning
```css
.toast-container {
  position: fixed;
  top: 96px;            /* below the top bar */
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none; /* container is click-through */
}

.toast-card {
  pointer-events: all;  /* but each card is interactive */
}
```

### Toast Pill Styling
```css
.toast-card {
  border-radius: 22px;
  min-height: 44px;
  min-width: 220px;
  max-width: 520px;
  padding: 0 18px 0 16px;
  background: var(--card-background);
  border: 1px solid var(--card-border);
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.30);
}
```

### Undo Button Styling
```css
.undo-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--facility-accent);    /* brand color, NOT hard-coded */
  font-size: 13px;
  font-weight: 600;
  transition: background 150ms ease;
}

.undo-btn:hover,
.undo-btn:active {
  background: var(--facility-accent-dim);  /* dimmed accent */
}
```

### Dismiss Button Styling
```css
.dismiss-btn {
  opacity: 0.5;
  transition: opacity 150ms, color 150ms;
  color: var(--text-secondary);
}
.dismiss-btn:hover {
  opacity: 1;
  color: var(--text-primary);
}
```

---

## 8. Key Design Decisions to Preserve

1. **No confirmation dialogs.** The undo toast IS the safety net. Never add "Are you sure?" before a delete.
2. **Execute first, undo-toast second.** The operation always completes before the toast shows.
3. **Single toast at a time.** If a second toast fires while one is visible, the old one is instantly replaced.
4. **Fuse bar only appears on undo toasts.** Plain informational toasts have no fuse bar.
5. **Accent color is dynamic.** The undo icon, undo label, and fuse bar all use the facility's brand color — not a global fixed color. Use a CSS variable.
6. **The undo button is inline.** It lives inside the toast pill itself — it is NOT a separate banner or sidebar element.
7. **6-second window matches fuse animation.** Do not change one without changing the other.
8. **Hover pauses everything.** Both the JS timer and the CSS fuse animation must pause on hover.
