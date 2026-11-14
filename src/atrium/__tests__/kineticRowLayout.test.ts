import { describe, it, expect } from 'vitest';
import { Sp, TUNES } from '../../components/screens/membership/motion/adherentsMotion';
import {
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
  WINDOW_OVERSCAN_PX,
  computeRowTargets,
  computeRowVisualGeometry,
  doesRowOverlapWindow,
  computePanelMetrics,
  computeBulkBarMetrics,
} from '../../components/screens/membership/motion/adherentsMath';
import {
  computeMemberModalMetrics,
  computeModalTransformOrigin,
} from '../../components/modals/memberModalMotion';

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

  it('computes 1,000-row list & grid placements accurately and fast (< 15ms)', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `mem_${i}`);
    const expanded = new Set<string>(['mem_0', 'mem_500']);

    const t0 = performance.now();
    const listRes = computeRowTargets(ids, expanded, 1200, 'list');
    const gridRes = computeRowTargets(ids, expanded, 1200, 'grid');
    const elapsedMs = performance.now() - t0;

    expect(listRes.targets.size).toBe(1000);
    expect(gridRes.targets.size).toBe(1000);

    // 1000 rows * 70 + 2 expanded * 158 = 70316
    expect(listRes.totalHeight).toBe(1000 * (ROW_H + ROW_G) + 2 * (ROW_DH + ROW_G));
    expect(listRes.targets.get('mem_999')?.y).toBe(999 * (ROW_H + ROW_G) + 2 * (ROW_DH + ROW_G));

    // Grid 3-column layout: ceil(1000/3) = 334 rows * (172 + 8) = 60120
    expect(gridRes.totalHeight).toBe(Math.ceil(1000 / 3) * (CARD_H + ROW_G));
    const item999 = gridRes.targets.get('mem_999')!;
    expect(item999.x).toBe(0);
    expect(item999.y).toBe(333 * (CARD_H + ROW_G));

    // Verify fast budget for both passes combined
    expect(elapsedMs).toBeLessThan(15);
  });

  it('bounds visible windowed slice to <= 26 rows out of 1,000 at any scroll position', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `mem_${i}`);
    const expanded = new Set<string>();
    const { targets } = computeRowTargets(ids, expanded, 1200, 'list');

    const viewportH = 640;
    for (const scrollTop of [0, 15000, 35000, 69000]) {
      const minY = scrollTop - WINDOW_OVERSCAN_PX;
      const maxY = scrollTop + viewportH + WINDOW_OVERSCAN_PX;
      let count = 0;
      for (let i = 0; i < ids.length; i++) {
        const tgt = targets.get(ids[i])!;
        if (doesRowOverlapWindow(tgt.y, tgt.h, false, minY, maxY)) count++;
      }
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(26);
    }
  });

  it('computes GPU slide-in panel, bulk bar, and origin-aware modal metrics cleanly', () => {
    const closedPanel = computePanelMetrics(0, 0);
    expect(closedPanel.visible).toBe(false);
    expect(closedPanel.translateX).toBe(620);

    const openPanel = computePanelMetrics(100, 100);
    expect(openPanel.visible).toBe(true);
    expect(openPanel.translateX).toBe(0);
    expect(openPanel.scrimOpacity).toBe(1);

    const bulk = computeBulkBarMetrics(100, 100);
    expect(bulk.visible).toBe(true);
    expect(bulk.translateY).toBe(0);
    expect(bulk.scale).toBe(1);

    const modalOpen = computeMemberModalMetrics(100, false);
    expect(modalOpen.opacity).toBe(1);
    expect(modalOpen.scale).toBe(1);

    const origin = computeModalTransformOrigin(
      { left: 100, top: 80, width: 40, height: 32 },
      { left: 300, top: 200, width: 520, height: 480 },
      1280,
      800
    );
    expect(origin).toBe('-180px -104px');
  });
});
