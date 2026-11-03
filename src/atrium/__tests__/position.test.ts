import { computePosition } from '../components/Panel/position';

const anchor = (l: number, t: number, w = 100, h = 34) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
const vp = { width: 1000, height: 800 };

describe('computePosition', () => {
  it('opens below, aligned to the end edge', () => {
    const p = computePosition(anchor(700, 100), 292, 200, 'bottom-end', 6, vp);
    expect(p.side).toBe('down');
    expect(p.top).toBe(140);
    expect(p.left).toBe(800 - 292);
  });

  it('opens below, aligned to the start edge', () => {
    const p = computePosition(anchor(100, 100), 200, 200, 'bottom-start', 6, vp);
    expect(p.left).toBe(100);
  });

  it('flips above when there is no room below', () => {
    const p = computePosition(anchor(100, 700), 200, 200, 'bottom-start', 6, vp);
    expect(p.side).toBe('up');
    expect(p.top).toBe(700 - 6 - 200);
  });

  it('stays below if flipping would not help', () => {
    const p = computePosition(anchor(100, 20), 200, 900, 'bottom-start', 6, vp);
    expect(p.side).toBe('down');
  });

  it('is clamped inside the viewport horizontally', () => {
    const left = computePosition(anchor(0, 100, 40), 292, 100, 'bottom-end', 6, vp);
    expect(left.left).toBeGreaterThanOrEqual(8);
    const right = computePosition(anchor(980, 100, 20), 292, 100, 'bottom-start', 6, vp);
    expect(right.left + 292).toBeLessThanOrEqual(1000 - 8);
  });
});
