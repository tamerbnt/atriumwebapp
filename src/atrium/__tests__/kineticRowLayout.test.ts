import { describe, it, expect } from 'vitest';
import { Sp, clamp, TUNES } from '../../components/screens/membership/motion/adherentsMotion';
import {
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
  computeRowTargets,
  computeRowVisualGeometry,
} from '../../components/screens/membership/motion/adherentsMath';

describe('useKineticRowLayout math & physics', () => {
  it('correctly calculates row height and container height at rest (RH=62, G=8, DH=150)', () => {
    expect(ROW_H).toBe(62);
    expect(ROW_G).toBe(8);
    expect(ROW_DH).toBe(150);
    expect(ROW_B).toBe(38);
    expect(CARD_H).toBe(172);

    const expanded = new Set<string>(['m2']);
    const { targets, totalHeight } = computeRowTargets(['m1', 'm2', 'm3'], expanded, 1200, 'list');

    expect(targets.get('m1')?.y).toBe(0);
    expect(targets.get('m2')?.y).toBe(70); // 62 + 8
    expect(targets.get('m3')?.y).toBe(298); // 70 + 70 + 158
    expect(totalHeight).toBe(368); // 298 + 70
  });

  it('presence collapse brings qv to 0 and collapses slab height smoothly', () => {
    const s = new Sp(100, TUNES.rowPresence);
    s.t = 0;

    for (let i = 0; i < 60; i++) {
      s.step(1);
    }

    expect(s.rest()).toBe(true);
    expect(s.x).toBe(0);

    const geom = computeRowVisualGeometry(s.x, 0, 1200, ROW_H, 'list');
    expect(geom.slabHeight).toBe(0);

    s.destroy();
  });
});
