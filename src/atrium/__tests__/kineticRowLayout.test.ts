import { describe, it, expect } from 'vitest';
import { Sp, clamp, TUNES } from '../../components/screens/membership/motion/adherentsMotion';
import {
  ROW_H,
  ROW_G,
  ROW_DH,
} from '../../components/screens/membership/motion/useKineticRowLayout';

describe('useKineticRowLayout math & physics', () => {
  it('correctly calculates row height and container height at rest', () => {
    // Row height formula: qv*(H+G) + clamp(e,0,1)*qv*(DH+G), where qv = clamp(p/100, 0, 1.05)
    // For p=100 (qv=1.0), e=0:
    // H=68, G=8, DH=176
    const p1 = 100;
    const e1 = 0;
    const qv1 = clamp(p1 / 100, 0, 1.05);
    const eNorm1 = clamp(e1 / 100, 0, 1);
    const rowH1 = qv1 * (ROW_H + ROW_G) + eNorm1 * qv1 * (ROW_DH + ROW_G);

    expect(rowH1).toBe(76); // 68 + 8 = 76

    // For expanded row: p=100, e=100:
    const p2 = 100;
    const e2 = 100;
    const qv2 = clamp(p2 / 100, 0, 1.05);
    const eNorm2 = clamp(e2 / 100, 0, 1);
    const rowH2 = qv2 * (ROW_H + ROW_G) + eNorm2 * qv2 * (ROW_DH + ROW_G);

    expect(rowH2).toBe(76 + 184); // 76 + 184 = 260

    // Running sum y for 3 rows: row0 (collapsed 76), row1 (expanded 260), row2 (collapsed 76)
    const y0 = 0;
    const y1 = rowH1; // 76
    const y2 = y1 + rowH2; // 76 + 260 = 336
    const totalH = y2 + rowH1; // 336 + 76 = 412

    expect(y0).toBe(0);
    expect(y1).toBe(76);
    expect(y2).toBe(336);
    expect(totalH).toBe(412);
  });

  it('presence collapse brings qv to 0 and collapses row height smoothly', () => {
    const s = new Sp(100, TUNES.rowPresence);
    s.t = 0;

    // Step several frames
    for (let i = 0; i < 60; i++) {
      s.step(1);
    }

    expect(s.rest()).toBe(true);
    expect(s.x).toBe(0);

    const qv = clamp(s.x / 100, 0, 1.05);
    const rowH = qv * (ROW_H + ROW_G);
    expect(rowH).toBe(0);

    s.destroy();
  });
});
