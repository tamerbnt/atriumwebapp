import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** WCAG contrast checks on the real tokens.css, so a colour edit can never silently break legibility. */

const css = readFileSync(join(__dirname, '../styles/tokens.css'), 'utf8');

function block(selectorStart: string): Record<string, string> {
  const i = css.indexOf(selectorStart);
  if (i < 0) throw new Error('block not found: ' + selectorStart);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

type RGBA = [number, number, number, number];

function parse(v: string, vars: Record<string, string>): RGBA {
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) return parse(vars[ref[1]], vars);
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  m = v.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/);
  if (m) return [+m[1], +m[2], +m[3], +m[4]];
  throw new Error('cannot parse ' + v);
}

function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}

function lum([r, g, b]: RGBA): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGBA, b: RGBA): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes: Array<[string, Record<string, string>]> = [
  ['light', { ...block(':root,') }],
  ['dark', { ...block("[data-atrium-theme='dark']") }],
];
// dark only overrides some tokens: inherit the rest from light
const light = themes[0][1];
themes[1][1] = { ...light, ...themes[1][1] };

for (const [name, v] of themes) {
  const c = (key: string) => parse(v[key], v);
  const bg = c('atr-bg');
  const card = c('atr-card');

  describe(`tokens (${name})`, () => {
    // pairs: [label, foreground, background, minimum ratio]
    const text: Array<[string, RGBA, RGBA, number]> = [
      ['ink on page', c('atr-ink'), bg, 7],
      ['ink on card', c('atr-ink'), card, 7],
      ['muted on page', c('atr-mut'), bg, 4.5],
      ['muted on card', c('atr-mut'), card, 4.5],
      ['ink on soft button', c('atr-ink'), c('atr-soft'), 7],
      ['ink on accent button', c('atr-onacc'), c('atr-acc'), 4.5],
      ['ink on accent liquid (pressed)', c('atr-onacc'), c('atr-accq'), 4.5],
      ['accent text on page (outline button, focus ring)', c('atr-acc-text'), bg, 4.5],
      ['accent text on card', c('atr-acc-text'), card, 4.5],
      ['accent text while the outline wash floods', c('atr-acc-text'), over(c('atr-hl'), bg), 4.5],
      ['success text on its tint, over card', c('atr-ok'), over(c('atr-okbg'), card), 4.5],
      ['success text while its liquid floods', c('atr-ok'), over(c('atr-okq'), card), 4.5],
      ['danger text on card', c('atr-danger'), card, 4.5],
    ];
    it.each(text)('%s ≥ %f', (_label, fg, back, min) => {
      expect(ratio(fg, back)).toBeGreaterThanOrEqual(min);
    });

    it('switch parts are distinguishable (≥ 3:1)', () => {
      expect(ratio(c('atr-sw-liquid'), c('atr-sw-body'))).toBeGreaterThanOrEqual(3);
      expect(ratio(c('atr-sw-knob'), c('atr-sw-liquid'))).toBeGreaterThanOrEqual(3);
    });
  });
}

describe('brand', () => {
  it('uses #D4522F as the light accent and the logo’s #E8643F on dark', () => {
    expect(light['atr-acc'].toLowerCase()).toBe('#d4522f');
    expect(themes[1][1]['atr-acc'].toLowerCase()).toBe('#e8643f');
  });
});

/** showpiece liquid buttons: label over body, label over liquid, liquid against the surface */
for (const [name, v] of themes) {
  const c = (key: string) => parse(v[key], v);
  const ink = parse('#0a0a0a', v);
  describe(`showpiece contrast (${name})`, () => {
    it('accent: label on body ≥ 4.5', () => expect(ratio(c('atr-onacc'), c('atr-acc'))).toBeGreaterThanOrEqual(4.5));
    it('accent: ink over the cream liquid ≥ 4.5', () => expect(ratio(ink, c('atr-sw-liquid'))).toBeGreaterThanOrEqual(4.5));
    it('ink: label on body ≥ 4.5', () => expect(ratio(c('atr-lb-t1'), c('atr-lb-body'))).toBeGreaterThanOrEqual(4.5));
    it('ink: ink over the liquid ≥ 4.5', () => expect(ratio(ink, c('atr-lb-liq'))).toBeGreaterThanOrEqual(4.5));
    it('ink: body stands out from the card ≥ 3', () =>
      expect(ratio(c('atr-lb-body'), over(c('atr-card'), c('atr-bg')))).toBeGreaterThanOrEqual(3));
    it('error outline stands out from the card ≥ 3', () =>
      expect(ratio(c('atr-danger'), c('atr-card'))).toBeGreaterThanOrEqual(3));
  });
}
