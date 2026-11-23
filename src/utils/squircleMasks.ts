import { computeSquircleParams } from '@/atrium/motion/shapes';

const STYLE_ID = 'atrium-sq-masks';
const SMOOTHING = 0.6;

interface MaskPresetSpec {
  tokens: ReadonlyArray<string>;
  radius: number;
  scopedSelector?: string;
}

const MASK_PRESETS: ReadonlyArray<MaskPresetSpec> = [
  { tokens: ['row', 'ctl', 'tile', 'empty'], radius: 12 },
  { tokens: ['ctl-sm'], radius: 10 },
  { tokens: ['thumb'], radius: 9 },
  { tokens: ['tile-lg'], radius: 15 },
  { tokens: ['check'], radius: 6 },
  {
    tokens: ['card'],
    radius: 16,
    scopedSelector: '.slab[data-sq="card"]:not([data-sq-border="dashed"]):not([data-sq-dash]), [role="status"] [data-sq="card"]:not([data-sq-border="dashed"]):not([data-sq-dash])',
  },
  {
    tokens: ['table'],
    radius: 20,
    scopedSelector: '[role="status"] [data-sq="table"]:not([data-sq-border="dashed"]):not([data-sq-dash])',
  },
  {
    tokens: ['panel'],
    radius: 28,
    scopedSelector: '[role="status"] [data-sq="panel"]:not([data-sq-border="dashed"]):not([data-sq-dash])',
  },
];

const f3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

function svgToDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function buildTopLeftCornerCommands(
  sx: number,
  sy: number,
  r: number,
  params: ReturnType<typeof computeSquircleParams>,
): string {
  if (params.s <= 1e-4 || r <= 0) {
    return `A${f3(r)} ${f3(r)} 0 0 1 ${f3(sx + r)} ${f3(sy - r)}`;
  }
  const { a, b, c, d, L } = params;
  // Moving up (0, -1), turning right (1, 0), sweep = 1
  const c1x = sx;
  const c1y = sy - a;
  const c2x = sx;
  const c2y = sy - (a + b);
  const p1x = sx + d;
  const p1y = sy - (a + b + c);

  const p2x = p1x + L;
  const p2y = p1y - L;

  const d1x = p2x + c;
  const d1y = p2y - d;
  const d2x = p2x + (b + c);
  const d2y = p2y - d;
  const endX = p2x + (a + b + c);
  const endY = p2y - d;

  return (
    `C${f3(c1x)} ${f3(c1y)} ${f3(c2x)} ${f3(c2y)} ${f3(p1x)} ${f3(p1y)}` +
    `A${f3(params.r)} ${f3(params.r)} 0 0 1 ${f3(p2x)} ${f3(p2y)}` +
    `C${f3(d1x)} ${f3(d1y)} ${f3(d2x)} ${f3(d2y)} ${f3(endX)} ${f3(endY)}`
  );
}

function buildFillMaskDecls(radius: number): string {
  const params = computeSquircleParams(1000, 1000, radius, SMOOTHING);
  const p = params.p > 0 ? params.p : radius;
  const P = Math.ceil(p);
  const cornerCurve = buildTopLeftCornerCommands(0, p, radius, params);
  const cornerPath = `M0 ${P}L0 ${f3(p)}${cornerCurve}L${P} 0L${P} ${P}Z`;

  const mkSvg = (transform?: string) =>
    svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P} ${P}" preserveAspectRatio="none">${
        transform ? `<g transform="${transform}">` : ''
      }<path d="${cornerPath}" fill="#000"/>${transform ? '</g>' : ''}</svg>`,
    );

  const tl = mkSvg();
  const tr = mkSvg(`translate(${P},0) scale(-1,1)`);
  const br = mkSvg(`translate(${P},${P}) scale(-1,-1)`);
  const bl = mkSvg(`translate(0,${P}) scale(1,-1)`);
  const band = 'linear-gradient(#000,#000)';

  const imgs = `${tl},${tr},${br},${bl},${band},${band}`;
  const pos = '0 0,100% 0,100% 100%,0 100%,center 0,0 center';
  const overlap = Math.max(0, 2 * P - 1);
  const cornerSize = `min(${P}px,50%) min(${P}px,50%)`;
  const sizes = `${cornerSize},${cornerSize},${cornerSize},${cornerSize},max(0px,calc(100% - ${overlap}px)) 100%,100% max(0px,calc(100% - ${overlap}px))`;

  return [
    `-webkit-mask-image:${imgs};`,
    `mask-image:${imgs};`,
    `-webkit-mask-position:${pos};`,
    `mask-position:${pos};`,
    `-webkit-mask-size:${sizes};`,
    `mask-size:${sizes};`,
    '-webkit-mask-repeat:no-repeat;',
    'mask-repeat:no-repeat;',
    '-webkit-mask-composite:source-over;',
    'mask-composite:add;',
  ].join('');
}

function buildStrokeMaskDecls(radius: number, strokeWidth: number): string {
  const sw = Math.max(0.5, strokeWidth);
  const inset = sw * 0.5;
  const ir = Math.max(0.5, radius - inset);
  const params = computeSquircleParams(1000, 1000, ir, SMOOTHING);
  const p = params.p > 0 ? params.p : ir;
  const span = inset + p;
  const P = Math.max(4, Math.ceil(span));
  const curve = buildTopLeftCornerCommands(inset, span, ir, params);
  const strokePath = `M${f3(inset)} ${P}L${f3(inset)} ${f3(span)}${curve}L${P} ${f3(inset)}`;

  const mkSvg = (transform?: string) =>
    svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P} ${P}" preserveAspectRatio="none">${
        transform ? `<g transform="${transform}">` : ''
      }<path d="${strokePath}" fill="none" stroke="#000" stroke-width="${f3(sw)}" stroke-linecap="butt"/>${
        transform ? '</g>' : ''
      }</svg>`,
    );

  const tl = mkSvg();
  const tr = mkSvg(`translate(${P},0) scale(-1,1)`);
  const br = mkSvg(`translate(${P},${P}) scale(-1,-1)`);
  const bl = mkSvg(`translate(0,${P}) scale(1,-1)`);
  const line = 'linear-gradient(#000,#000)';

  const imgs = `${tl},${tr},${br},${bl},${line},${line},${line},${line}`;
  const pos = '0 0,100% 0,100% 100%,0 100%,center 0,center 100%,0 center,100% center';
  const overlap = Math.max(0, 2 * P - 2);
  const cornerSize = `min(${P}px,50%) min(${P}px,50%)`;
  const hBar = `max(0px,calc(100% - ${overlap}px)) ${f3(sw)}px`;
  const vBar = `${f3(sw)}px max(0px,calc(100% - ${overlap}px))`;
  const sizes = `${cornerSize},${cornerSize},${cornerSize},${cornerSize},${hBar},${hBar},${vBar},${vBar}`;

  return [
    `-webkit-mask-image:${imgs};`,
    `mask-image:${imgs};`,
    `-webkit-mask-position:${pos};`,
    `mask-position:${pos};`,
    `-webkit-mask-size:${sizes};`,
    `mask-size:${sizes};`,
    '-webkit-mask-repeat:no-repeat;',
    'mask-repeat:no-repeat;',
    '-webkit-mask-composite:source-over;',
    'mask-composite:add;',
  ].join('');
}

function getSelectorForPreset(spec: MaskPresetSpec, pseudo = ''): string {
  if (spec.scopedSelector) {
    if (!pseudo) return spec.scopedSelector;
    return spec.scopedSelector
      .split(',')
      .map((part) => `${part.trim()}${pseudo}`)
      .join(',');
  }
  return spec.tokens
    .map(
      (t) =>
        `[data-sq="${t}"]:not([data-sq-border="dashed"]):not([data-sq-dash])${pseudo}`,
    )
    .join(',');
}

function defaultStrokeForToken(token: string): string {
  if (token === 'row' || token === 'card' || token === 'table') {
    return 'var(--sq-css-row, var(--sq-stroke-row, rgba(23, 19, 15, 0.035)))';
  }
  if (token === 'panel') {
    return 'var(--sq-css-pod, var(--sq-stroke-pod, transparent))';
  }
  return 'var(--sq-css-ctl, var(--sq-stroke-ctl, rgba(23, 19, 15, 0.065)))';
}

function buildMaskStylesheet(hairlinePx: number): string {
  const rules: string[] = [];

  // 0-specificity positioning fallback so ::after anchors correctly even on static elements
  const allHostSelectors = MASK_PRESETS.map((p) => getSelectorForPreset(p)).join(',');
  rules.push(`:where(${allHostSelectors}){position:relative;}`);

  // Common ::after stroke layer base
  const allAfterSelectors = MASK_PRESETS.map((p) => getSelectorForPreset(p, '::after')).join(',');
  rules.push(
    `${allAfterSelectors}{content:"";position:absolute;inset:var(--sq-b-inset,0px);pointer-events:none;z-index:2;border-radius:inherit;transition:background-color 160ms ease,opacity 160ms ease;}`,
  );

  // Per-preset fill clip mask + hairline / 1.5px / 2px stroke masks + default stroke colors
  for (const spec of MASK_PRESETS) {
    const hostSel = getSelectorForPreset(spec);
    const afterSel = getSelectorForPreset(spec, '::after');
    rules.push(`${hostSel}{${buildFillMaskDecls(spec.radius)}}`);
    rules.push(`${afterSel}{${buildStrokeMaskDecls(spec.radius, hairlinePx)}}`);

    // 1.5px and 2px width overrides + :focus-visible
    const sel15 = spec.scopedSelector
      ? spec.scopedSelector
          .split(',')
          .map((p) => `${p.trim()}[data-sq-stroke-w="1.5"]::after`)
          .join(',')
      : spec.tokens
          .map((t) => `[data-sq="${t}"][data-sq-stroke-w="1.5"]:not([data-sq-border="dashed"]):not([data-sq-dash])::after`)
          .join(',');
    const sel2 = spec.scopedSelector
      ? spec.scopedSelector
          .split(',')
          .map((p) => `${p.trim()}[data-sq-stroke-w="2"]::after,${p.trim()}:focus-visible::after`)
          .join(',')
      : spec.tokens
          .map(
            (t) =>
              `[data-sq="${t}"][data-sq-stroke-w="2"]:not([data-sq-border="dashed"]):not([data-sq-dash])::after,[data-sq="${t}"]:focus-visible:not([data-sq-border="dashed"]):not([data-sq-dash])::after`,
          )
          .join(',');

    rules.push(`${sel15}{${buildStrokeMaskDecls(spec.radius, 1.5)}}`);
    rules.push(`${sel2}{${buildStrokeMaskDecls(spec.radius, 2)}}`);

    for (const token of spec.tokens) {
      const defStroke = defaultStrokeForToken(token);
      if (spec.scopedSelector) {
        rules.push(
          `${getSelectorForPreset(spec, '::after')}{background:var(--sq-stroke,${defStroke});}`,
        );
      } else {
        rules.push(
          `[data-sq="${token}"]:not([data-sq-border="dashed"]):not([data-sq-dash]):not([data-atr-tone="accent"]):not([data-atr-tone="success"])::after{background:var(--sq-stroke,${defStroke});}`,
        );
      }
    }
  }

  // Respect dark surface attribute + border="none"
  rules.push(
    `[data-sq][data-surface="dark"]:not([data-atr-liquid])::after{background:var(--sq-stroke,var(--sq-css-card,rgba(255,255,255,0.115)));}`,
  );
  rules.push('[data-sq][data-sq-border="none"]::after{display:none!important;}');

  return rules.join('\n');
}

let appliedHairline: number | null = null;

/**
 * Injects cached 60% squircle CSS mask-image rules into <head> once (or updates if DPR changes).
 * Eliminates thousands of MutationObserver / ResizeObserver registrations & child <svg> nodes.
 */
export function injectSquircleMaskStyles(hairlinePx = 1): void {
  if (typeof document === 'undefined' || !document.head || typeof document.createElement !== 'function') {
    return;
  }
  const normalized = hairlinePx < 0.9 ? 0.65 : 1;
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (styleEl && appliedHairline === normalized) return;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildMaskStylesheet(normalized);
  appliedHairline = normalized;
}
