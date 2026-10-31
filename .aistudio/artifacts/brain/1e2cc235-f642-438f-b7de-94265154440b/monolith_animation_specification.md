# Atrium Monolith: Complete Cinematic Intro Animation Specification

This document provides an exhaustive, mathematical, chromatic, and geometric specification of the **Atrium Monolith** 5-stage cinematic intro animation that launches the application before seamlessly dissolving into the workspace.

---

## 1. Architectural Overview & Stage Timeline

The intro animation is engineered with a strict 5-stage sequential architecture executed across Canvas SVG, CSS3 GPU keyframes, and a 60fps / 120fps `requestAnimationFrame` kinetic typography physics engine.

| Stage | Name | Timestamp | Duration | Canvas / Background | Core Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Quincunx Convergence** | `0.00s` – `1.20s` | 1200ms | Pure White `#FFFFFF` | 4 solid corner cubes glide from $\pm 140\text{px}$ diagonally; 1 central hollow cube unfolds with Swiss modernist crosshairs & pulse ring. |
| **Stage 2** | **Cinematic Portal Wipe** | `1.20s` – `1.85s` | 650ms | White $\to$ Terracotta `#D3542E` | Shockwave ring ($176\times 176\text{px}$) + rounded diamond squircle expanding ($0\times \to 42\times$) with $45^\circ$ spin flooding the entire viewport. |
| **Stage 3** | **Kinetic Typography Wave** | `1.85s` – `3.85s` | 2000ms | Terracotta `#D3542E` | Real-time `requestAnimationFrame` loop: horizontal beam sweeps from $-1.4 \to +7.2$, illuminating `ATRIUM` with radiant white bloom & 2D optical expansion before settling to normal size. |
| **Stage 4** | **Logo Revelation** | `3.85s` – `4.75s` | 900ms | Terracotta `#D3542E` | The authentic 5-cubes architectural logo enters from the left via `cubic-bezier(0.16, 1, 0.3, 1)` and docks firmly beside the settled ATRIUM wordmark. |
| **Stage 5** | **Settled & Dissolve** | `≥ 4.75s` | 700ms | Terracotta $\to$ Obsidian Backdrop | `onIntroComplete()` fires; overlay dissolves with `transition-opacity duration-700 ease-out` revealing the Higgsfield onboarding workstation. |

---

## 2. Stage 1: 'Quincunx Convergence' (0.0s – 1.2s)

### 2.1 Coordinate Space & Background
- **Viewport Canvas**: Fullscreen pure white (`#FFFFFF`) background.
- **Architectural Dot Grid**: Radial dot pattern repeating at $24\times 24\text{px}$:
  $$\text{radial-gradient}(\#\text{D3542E } 1.5\text{px}, \text{transparent } 1.5\text{px}),\quad \text{opacity} = 0.05$$
- **SVG ViewBox**: Coordinate space `viewBox="-50 -50 200 200"` centered on $(50, 50)$.

### 2.2 Swiss Modernist Coordinate Grid
The alignment grid renders in terracotta `#D3542E` with hairline precision:
1. **Center Hairline Axes**:
   - Horizontal: $X \in [-40, 140], Y = 50$, stroke width $0.75\text{px}$, stroke dasharray `3 4`, opacity $0.22$.
   - Vertical: $X = 50, Y \in [-40, 140]$, stroke width $0.75\text{px}$, stroke dasharray `3 4`, opacity $0.22$.
2. **Diagonal Assembly Trajectory Axes**:
   - Primary Diagonal: $(-30, -30) \to (130, 130)$, stroke width $0.5\text{px}$, dasharray `2 4`, opacity $0.18$.
   - Secondary Diagonal: $(130, -30) \to (-30, 130)$, stroke width $0.5\text{px}$, dasharray `2 4`, opacity $0.18$.
3. **Corner Registration Crosshairs (+)**:
   - Top-Left: $X \in [-20, -10], Y=15$ and $X=-15, Y \in [10, 20]$, stroke width $1.2\text{px}$, opacity $0.38$.
   - Top-Right: $X \in [110, 120], Y=15$ and $X=115, Y \in [10, 20]$, stroke width $1.2\text{px}$, opacity $0.38$.
   - Bottom-Left: $X \in [-20, -10], Y=85$ and $X=-15, Y \in [80, 90]$, stroke width $1.2\text{px}$, opacity $0.38$.
   - Bottom-Right: $X \in [110, 120], Y=85$ and $X=115, Y \in [80, 90]$, stroke width $1.2\text{px}$, opacity $0.38$.
4. **Outer Boundary Frame**:
   - $\text{Rect}(-2, -2, 104, 104)$, corner radius $r_x = 12\text{px}$, stroke width $0.75\text{px}$, dasharray `4 6`, opacity $0.22$.

### 2.3 The 4 Solid Corner Cubes (Convergence Physics)
Each corner cube has dimensions $26 \times 26\text{px}$ with corner radius $r_x = 6.5\text{px}$ and fill `#D3542E`. They follow an elastic overshoot harmonic curve `cubic-bezier(0.16, 1, 0.3, 1)`:

$$\vec{T}_{\text{TL}}(t): (-140\text{px}, -140\text{px}) \xrightarrow{35\%} (+10\text{px}, +10\text{px}) \xrightarrow{55\%} (-4\text{px}, -4\text{px}) \xrightarrow{75\%-100\%} (0, 0)$$
$$\vec{T}_{\text{TR}}(t): (+140\text{px}, -140\text{px}) \xrightarrow{35\%} (-10\text{px}, +10\text{px}) \xrightarrow{55\%} (+4\text{px}, -4\text{px}) \xrightarrow{75\%-100\%} (0, 0)$$
$$\vec{T}_{\text{BL}}(t): (-140\text{px}, +140\text{px}) \xrightarrow{35\%} (+10\text{px}, -10\text{px}) \xrightarrow{55\%} (-4\text{px}, +4\text{px}) \xrightarrow{75\%-100\%} (0, 0)$$
$$\vec{T}_{\text{BR}}(t): (+140\text{px}, +140\text{px}) \xrightarrow{35\%} (-10\text{px}, -10\text{px}) \xrightarrow{55\%} (+4\text{px}, +4\text{px}) \xrightarrow{75\%-100\%} (0, 0)$$

- **Scale Trajectory**: Begins at $\text{scale}(0.40)$, overshoots to $\text{scale}(1.12)$ at $35\%$, counter-bounces to $\text{scale}(0.96)$ at $55\%$, settling at $\text{scale}(1.0)$ at $75\%$.
- **Shadow**: `filter: drop-shadow(0 4px 12px rgba(211, 84, 46, 0.22))`.

### 2.4 Central Hollow Cube (Unfolding Physics)
- **Geometry**: $X = 28.5, Y = 28.5$, width $43\text{px}$, height $43\text{px}$, corner radius $r_x = 9.5\text{px}$, $\text{fill} = \text{none}$, $\text{stroke} = \#\text{D3542E}$, $\text{strokeWidth} = 6.5\text{px}$.
- **Transform Origin**: Center $(50\text{px}, 50\text{px})$.
- **Elastic Rotation & Scale Progression**:
  - $0\%$: $\text{opacity} = 0$, $\text{scale}(0)$, $\text{rotate}(+90^\circ)$
  - $40\%$: $\text{opacity} = 1$, $\text{scale}(1.22)$, $\text{rotate}(-8^\circ)$
  - $60\%$: $\text{scale}(0.94)$, $\text{rotate}(+3^\circ)$
  - $80\% - 100\%$: $\text{scale}(1.0)$, $\text{rotate}(0^\circ)$

### 2.5 Convergence Pulse Ring Shockwave
- **Geometry**: $X = 24, Y = 24$, width $52\text{px}$, height $52\text{px}$, $r_x = 12\text{px}$, stroke width $2\text{px}$ `#D3542E`.
- **Timing & Scale**:
  - $0\% - 65\%$: Invisible ($\text{opacity} = 0$, $\text{scale}(0.40)$)
  - $75\%$: Peak flash ($\text{opacity} = 0.65$, $\text{scale}(1.05)$)
  - $92\%$: Dissolving ($\text{opacity} = 0$, $\text{scale}(2.40)$)
  - $100\%$: Extinguished ($\text{opacity} = 0$, $\text{scale}(2.80)$)

---

## 3. Stage 2: Dedicated Cinematic Portal Wipe (1.2s – 1.85s)

At $t = 1.20\text{s}$, the 5 converged cubes trigger a geometric iris portal wipe that transitions the entire screen from pure white to signature terracotta `#D3542E`.

### 3.1 Shockwave Ring
- **Geometry**: $176 \times 176\text{px}$ circular squircle (`rounded-[44px]`), border $2\text{px}$ `#D3542E`.
- **Keyframe Progression** (`cool-portal-ring 0.65s`):
  - $0\% - 25\%$: $\text{scale}(0)$, $\text{rotate}(0^\circ)$, $\text{opacity} = 0$
  - $40\%$: $\text{scale}(1.40)$, $\text{rotate}(15^\circ)$, $\text{opacity} = 0.85$
  - $75\%$: $\text{scale}(7.50)$, $\text{rotate}(32^\circ)$, $\text{opacity} = 0.45$
  - $100\%$: $\text{scale}(20.0)$, $\text{rotate}(45^\circ)$, $\text{opacity} = 0$

### 3.2 Rounded Diamond Squircle Wipe
- **Geometry**: $128 \times 128\text{px}$ solid monolith in `#D3542E`.
- **Keyframe Progression** (`cool-terracotta-portal-wipe 0.65s`):
  - $0\%$: $\text{scale}(0)$, $\text{rotate}(0^\circ)$, $r = 32\text{px}$
  - $8\%$: $\text{scale}(0.12)$, $\text{rotate}(4^\circ)$, $r = 34\text{px}$
  - $45\%$: $\text{scale}(3.20)$, $\text{rotate}(22^\circ)$, $r = 54\text{px}$
  - $80\%$: $\text{scale}(16.0)$, $\text{rotate}(38^\circ)$, $r = 76\text{px}$
  - $100\%$: $\text{scale}(42.0)$, $\text{rotate}(45^\circ)$, $r = 96\text{px}$
- **Result**: At $\text{scale}(42.0)$, the squircle covers over $5300\text{px}$ in diagonal span, seamlessly flooding any screen or mobile viewport with terracotta `#D3542E`.

---

## 4. Stage 3: Kinetic Typography Wave (1.85s – 3.85s)

At $t = 1.85\text{s}$, the phase shifts to `'wave'`. A 60fps / 120fps physics loop sweeps a beam of intense photonic illumination across the wordmark **`A-T-R-I-U-M`**.

### 4.1 Typography & Base Metrics
- **Font**: Inter Black (`font-black`), `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`.
- **Text Size**: `text-6xl sm:text-8xl md:text-9xl` (dynamic height $H \approx 120\text{px}$).
- **Proportional Letter Width Ratios** $[w_0, \dots, w_5]$:
  $$\text{A}: 0.82 \cdot H,\quad \text{T}: 0.72 \cdot H,\quad \text{R}: 0.78 \cdot H,\quad \text{I}: 0.32 \cdot H,\quad \text{U}: 0.78 \cdot H,\quad \text{M}: 0.98 \cdot H$$

### 4.2 Mathematical Formulas

#### 1. Time Progression & Ease-In-Out
For elapsed time $\Delta t = t - t_{\text{start}}$ with sweep duration $D = 2000\text{ms}$:
$$p_{\text{raw}} = \min\left(1, \max\left(0, \frac{\Delta t}{D}\right)\right)$$
$$E(p) = \begin{cases} 2 \cdot p^2 & \text{if } p < 0.5 \\ 1 - \frac{(-2p + 2)^2}{2} & \text{if } p \ge 0.5 \end{cases}$$

#### 2. Beam Center Vector
The illuminated beam travels from off-left ($-1.40$) to off-right ($+7.20$):
$$C_{\text{beam}} = -1.40 + 8.60 \cdot E(p)$$

#### 3. Letter Distance & Smoothstep Intensity
For each letter index $i \in \{0, 1, 2, 3, 4, 5\}$:
$$d_i = |i - C_{\text{beam}}|$$
$$\text{raw}_i = \min\left(1, \max\left(0, \frac{1.30 - d_i}{0.80}\right)\right)$$
$$I_i = \text{raw}_i^2 \cdot (3 - 2 \cdot \text{raw}_i) \quad (\text{Hermite cubic smoothstep})$$

#### 4. Normalization Window (Restoration to Un-Shrunk Size)
During the final third of the sweep ($p_{\text{raw}} \in [0.68, 0.95]$), the letters smoothly de-shrink back to normal scale $1.0\times$ so the text is crisp and un-deformed when the logo docks:
$$p_{\text{norm}} = \min\left(1, \max\left(0, \frac{p_{\text{raw}} - 0.68}{0.27}\right)\right)$$
$$E_{\text{norm}} = \begin{cases} 2 \cdot p_{\text{norm}}^2 & \text{if } p_{\text{norm}} < 0.5 \\ 1 - \frac{(-2p_{\text{norm}} + 2)^2}{2} & \text{if } p_{\text{norm}} \ge 0.5 \end{cases}$$
$$S_{x, \text{base}} = 0.38 + E_{\text{norm}} \cdot (1.0 - 0.38)$$
$$S_{y, \text{base}} = 0.88 + E_{\text{norm}} \cdot (1.0 - 0.88)$$
$$\text{gap}_{\min} = 0.5\text{px} + E_{\text{norm}} \cdot 3.0\text{px}$$
$$\text{gap}_{\text{extra}} = 10.0\text{px} \cdot (1 - E_{\text{norm}})$$

#### 5. 2D Letter Scaling
Letters illuminated by the beam expand up to $+195\%$ horizontally and $+122\%$ vertically:
$$S_{x, i} = S_{x, \text{base}} + I_i \cdot (1.95 - S_{x, \text{base}})$$
$$S_{y, i} = S_{y, \text{base}} + I_i \cdot (1.22 - S_{y, \text{base}})$$
$$W_{\text{vis}, i} = W_{\text{base}, i} \cdot S_{x, i}$$

#### 6. Dynamic Non-Overlapping Spacing & Optical Centering
$$\text{gap}_i = \text{gap}_{\min} + \max(I_i, I_{i+1}) \cdot \text{gap}_{\text{extra}}$$
$$X_{\text{center}, 0} = \frac{W_{\text{vis}, 0}}{2}$$
$$X_{\text{center}, i} = X_{\text{center}, i-1} + \frac{W_{\text{vis}, i-1}}{2} + \text{gap}_{i-1} + \frac{W_{\text{vis}, i}}{2}$$
$$X_{\text{offset}} = \frac{X_{\text{center}, 5} + \frac{W_{\text{vis}, 5}}{2}}{2}$$
$$\Delta X_i = (X_{\text{center}, i} - X_{\text{offset}}) - (X_{\text{baseCenter}, i} - X_{\text{baseOffset}})$$

Each letter's style is updated on every frame without DOM repaints:
$$\text{transform} = \text{translate3d}(\Delta X_i\text{px}, 0, 0)\ \text{scaleX}(S_{x, i})\ \text{scaleY}(S_{y, i})$$

### 4.3 Chromatic & Photometric Styling
- **Untouched Letters** ($I_i \le 0.12$):
  - `color`: Solid deep black `#000000`.
  - `textShadow`: `none`.
  - `filter`: `none`.
- **Beam-Illuminated Letters** ($I_i > 0.12$):
  - `color`: Pure radiant white `#FFFFFF` (or warm white `#FFF0EA` if $I_i \le 0.40$).
  - `textShadow`:
    $$\text{textShadow} = 0\ 0\ (32 \cdot I_i)\text{px}\ \text{rgba}(255, 255, 255, 0.98),\ 0\ 0\ (56 \cdot I_i)\text{px}\ \text{rgba}(255, 225, 195, 0.85)$$
  - `filter`:
    $$\text{filter} = \text{drop-shadow}(0\ 0\ (20 \cdot I_i)\text{px}\ \text{rgba}(255, 255, 255, 0.95))$$

---

## 5. Stage 4: 5-Cubes Architectural Logo Revelation (3.85s – 4.75s)

At $t = 3.85\text{s}$, the kinetic sweep finishes and the letters settle at `scale(1, 1)` in solid black `#000000`. The authentic **FiveCubesLogo** enters beside `ATRIUM`:

### 5.1 Authentic Logo Geometry ($100 \times 100\text{px}$ ViewBox)
- **Top-Left Cube**: $X = 2, Y = 2$, $26 \times 26\text{px}$, $r_x = 6.5\text{px}$, fill `#000000`.
- **Top-Right Cube**: $X = 72, Y = 2$, $26 \times 26\text{px}$, $r_x = 6.5\text{px}$, fill `#000000`.
- **Central Hollow Cube**: $X = 28.5, Y = 28.5$, $43 \times 43\text{px}$, $r_x = 9.5\text{px}$, fill `none`, stroke `#000000`, stroke width $6.5\text{px}$.
- **Bottom-Left Cube**: $X = 2, Y = 72$, $26 \times 26\text{px}$, $r_x = 6.5\text{px}$, fill `#000000`.
- **Bottom-Right Cube**: $X = 72, Y = 72$, $26 \times 26\text{px}$, $r_x = 6.5\text{px}$, fill `#000000`.

### 5.2 Docking Mechanics
- **Entrance Transition**:
  - `transition: all 700ms cubic-bezier(0.16, 1, 0.3, 1)`
  - Pre-dock state: `opacity-0 -translate-x-12 scale-75 max-w-0`
  - Docked state: `opacity-100 translate-x-0 scale-100 max-w-[180px]`
- **Rendering Size**: Rendered at $132 \times 132\text{px}$ (`size={132}`) in solid black `#000000` alongside `ATRIUM` with `gap-6 sm:gap-10`.

---

## 6. Stage 5: Settled & Workspace Dissolve (≥ 4.75s)

1. At $t = 4.75\text{s}$, `callbacksRef.current.onIntroComplete?.()` fires.
2. In `PowerOnboardingScreen.tsx`:
   - `isIntroDissolving` becomes `true`.
   - The overlay container transitions to `opacity-0 pointer-events-none` over $700\text{ms}$ (`transition-opacity duration-700 ease-out`).
   - At $t = 5.45\text{s}$, `showIntroAnimation` sets to `false`, unmounting the overlay and revealing the dark terracotta-orange mesh workstation.
3. **Skip & Keyboard Escape**: Pressing `ESC` or clicking the "Skip Intro" button instantly resets letters, triggers callbacks, and transitions smoothly into the onboarding screen.
4. **Manual Replay**: Clicking "↺ Replay Intro Animation" in the footer resets `replayKey` and replays the 5-stage animation from $0.0\text{s}$.

---

## 7. Complete Color Palette Reference

| Token Name | Hex Code | Usage in Animation |
| :--- | :--- | :--- |
| `White` | `#FFFFFF` | Stage 1 Canvas background; peak illumination bloom of kinetic beam |
| `Terracotta Signature` | `#D3542E` | Stage 1 crosshairs, convergence cubes, portal squircle, and Stage 2–4 background |
| `Solid Obsidian Black` | `#000000` | Untouched letters outside beam; final settled wordmark; 5-cubes architectural logo |
| `Warm White Bloom` | `#FFF0EA` | Falloff glow boundary around letters touched by kinetic beam |
| `Specular White Halo` | `rgba(255, 255, 255, 0.98)` | Inner concentrated text drop shadow ($32\text{px}$ radius) |
| `Warm Amber Halo` | `rgba(255, 225, 195, 0.85)` | Outer ambient text drop shadow ($56\text{px}$ radius) |

---

## 8. Summary of Integration Code

### State Management (`PowerOnboardingScreen.tsx`)
```tsx
const [showIntroAnimation, setShowIntroAnimation] = useState(true);
const [isIntroDissolving, setIsIntroDissolving] = useState(false);
const [introReplayKey, setIntroReplayKey] = useState(0);

const handleIntroCompleteOrSkip = () => {
  setIsIntroDissolving(true);
  setTimeout(() => {
    setShowIntroAnimation(false);
    setIsIntroDissolving(false);
  }, 700);
};

const handleReplayIntro = () => {
  setIntroReplayKey((k) => k + 1);
  setIsIntroDissolving(false);
  setShowIntroAnimation(true);
};
```

### Overlay JSX Injection
```tsx
{showIntroAnimation && (
  <div
    className={`fixed inset-0 z-50 transition-opacity duration-700 ease-out ${
      isIntroDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
    }`}
  >
    <AtriumMonolith
      isIntroActive={true}
      replayKey={introReplayKey}
      onIntroComplete={handleIntroCompleteOrSkip}
      onSkip={handleIntroCompleteOrSkip}
    />
  </div>
)}
```
