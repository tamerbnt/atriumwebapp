import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  Sp,
  setReducedMotionOverride,
} from './adherentsMotion';
import {
  clamp,
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
  WINDOW_OVERSCAN_PX,
  computeRowTargets,
  computeRowVisualGeometry,
  computePanelMetrics,
  computeBulkBarMetrics,
  doesRowOverlapWindow,
} from './adherentsMath';

describe('Adherents Spring Engine & Geometry Math', () => {
  beforeEach(() => {
    setReducedMotionOverride(false);
  });

  it('matches tune 24 checkpoints (33ms ~20.5, 67ms ~50, 100ms ~76, 133ms ~94, 200ms ~107 peak)', () => {
    const s = new Sp(0, 24);
    s.t = 100;

    // Frame 2 (~33.3ms)
    s.step(1);
    s.step(1);
    assert.ok(Math.abs(s.x - 20.5) < 1.5, `at 33ms expected ~20.5, got ${s.x}`);

    // Frame 4 (~66.7ms)
    s.step(1);
    s.step(1);
    assert.ok(Math.abs(s.x - 50.1) < 2.0, `at 67ms expected ~50, got ${s.x}`);

    // Frame 6 (~100ms)
    s.step(1);
    s.step(1);
    assert.ok(Math.abs(s.x - 76) < 2.5, `at 100ms expected ~76, got ${s.x}`);

    // Frame 8 (~133.3ms)
    s.step(1);
    s.step(1);
    assert.ok(Math.abs(s.x - 94) < 2.5, `at 133ms expected ~94, got ${s.x}`);

    // Frame 12 (~200ms) -> peak ~107
    s.step(1);
    s.step(1);
    s.step(1);
    s.step(1);
    assert.ok(s.x >= 105 && s.x <= 108, `at 200ms expected ~107 peak, got ${s.x}`);

    // Frame 24 (~400ms) -> ~100
    for (let f = 13; f <= 24; f++) s.step(1);
    assert.ok(Math.abs(s.x - 100) < 1.0, `at 400ms expected ~100, got ${s.x}`);

    // Settled (<0.02) by frame 60
    for (let f = 25; f <= 60; f++) s.step(1);
    assert.equal(s.rest(), true);
    s.destroy();
  });

  it('produces exact panel translateX checkpoints (67ms ~309px, 200ms ~-42px)', () => {
    const pp = new Sp(0, 24);
    pp.t = 100;

    // 4 frames -> ~67ms
    for (let i = 0; i < 4; i++) pp.step(1);
    const m67 = computePanelMetrics(pp.x, pp.t);
    assert.ok(Math.abs(m67.translateX - 309) < 15, `expected translateX ~309px at 67ms, got ${m67.translateX}`);

    // 12 frames total -> ~200ms
    for (let i = 4; i < 12; i++) pp.step(1);
    const m200 = computePanelMetrics(pp.x, pp.t);
    assert.ok(m200.translateX < -30 && m200.translateX >= -50, `expected translateX ~-42px at 200ms, got ${m200.translateX}`);

    // Panel visibility stays visible while closing until pp < 1
    pp.t = 0;
    pp.step(1);
    assert.equal(computePanelMetrics(pp.x, pp.t).visible, true);

    for (let i = 0; i < 40; i++) pp.step(1);
    pp.snap();
    assert.equal(computePanelMetrics(pp.x, pp.t).visible, false);
    assert.equal(computePanelMetrics(pp.x, pp.t).translateX, 620);

    pp.destroy();
  });

  it('preserves velocity and position when retargeted mid-motion', () => {
    const sx = new Sp(0, 22);
    sx.t = 400;
    for (let i = 0; i < 4; i++) sx.step(1);
    const midX = sx.x;
    const midV = sx.v;
    assert.ok(midX > 0 && midV > 0);

    sx.t = 0; // retarget mid-flight without resetting x or v
    assert.equal(sx.x, midX);
    assert.equal(sx.v, midV);
    sx.destroy();
  });

  it('snaps immediately to target under reduced motion', () => {
    setReducedMotionOverride(true);
    const s = new Sp(0, 24);
    s.setTarget(100);
    assert.equal(s.x, 100);
    assert.equal(s.v, 0);
    assert.equal(s.rest(), true);
    s.destroy();
  });

  it('computes exact list and grid targets per Adherents.dc.html spec', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const expanded = new Set<string>(['b']);
    const listLayout = computeRowTargets(ids, expanded, 1200, 'list');

    assert.deepEqual(listLayout.targets.get('a'), { x: 0, y: 0, w: 1200, h: ROW_H, eTarget: 0 });
    assert.deepEqual(listLayout.targets.get('b'), { x: 0, y: ROW_H + ROW_G, w: 1200, h: ROW_H, eTarget: 100 });
    assert.deepEqual(listLayout.targets.get('c'), {
      x: 0,
      y: (ROW_H + ROW_G) * 2 + (ROW_DH + ROW_G),
      w: 1200,
      h: ROW_H,
      eTarget: 0,
    });
    assert.equal(listLayout.totalHeight, 4 * (ROW_H + ROW_G) + (ROW_DH + ROW_G));

    const gridLayout = computeRowTargets(ids, expanded, 1216, 'grid');
    // cw = (1216 - 16) / 3 = 400
    assert.deepEqual(gridLayout.targets.get('a'), { x: 0, y: 0, w: 400, h: CARD_H, eTarget: 0 });
    assert.deepEqual(gridLayout.targets.get('b'), { x: 408, y: 0, w: 400, h: CARD_H, eTarget: 0 });
    assert.deepEqual(gridLayout.targets.get('c'), { x: 816, y: 0, w: 400, h: CARD_H, eTarget: 0 });
    assert.deepEqual(gridLayout.targets.get('d'), { x: 0, y: CARD_H + ROW_G, w: 400, h: CARD_H, eTarget: 0 });
    assert.equal(gridLayout.totalHeight, 2 * (CARD_H + ROW_G));
  });

  it('computes exact detail island geometry matching Section E formulas', () => {
    // At e = 0: hidden
    const closed = computeRowVisualGeometry(100, 0, 1200, ROW_H, 'list');
    assert.equal(closed.islandVisible, false);
    assert.equal(closed.detailOpacity, 0);
    assert.equal(closed.detailInteractive, false);

    // At e = 100: open
    const open = computeRowVisualGeometry(100, 100, 1200, ROW_H, 'list');
    assert.equal(open.islandVisible, true);
    assert.equal(open.islandLeft, 0);
    assert.equal(open.islandTop, ROW_H + ROW_G); // 70
    assert.equal(open.islandWidth, 1200);
    assert.equal(open.islandHeight, ROW_DH); // 150
    assert.equal(open.islandRadius, 22);
    assert.equal(open.detailOpacity, 1);
    assert.equal(open.detailInteractive, true);
    assert.equal(open.chevronRotateDeg, 180);

    // In grid view: island hidden even if e > 0
    const grid = computeRowVisualGeometry(100, 50, 400, CARD_H, 'grid');
    assert.equal(grid.islandVisible, false);
    assert.equal(grid.detailInteractive, false);
  });

  it('computes floating bulk bar geometry cleanly', () => {
    const hidden = computeBulkBarMetrics(0, 0);
    assert.equal(hidden.visible, false);
    const shown = computeBulkBarMetrics(100, 100);
    assert.equal(shown.visible, true);
    assert.equal(shown.opacity, 1);
    assert.equal(shown.translateY, 0);
    assert.equal(shown.scale, 1);
    assert.equal(ROW_B, 38);
    assert.equal(clamp(10, 0, 5), 5);
  });

  it('scales cleanly to 1,000 members with bounded O(visible) viewport windowing', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `m-${i}`);
    const expanded = new Set<string>(['m-500']);

    // Warmup JIT before timing
    computeRowTargets(['w-1'], expanded, 1200, 'list');
    const t0 = performance.now();
    const listLayout = computeRowTargets(ids, expanded, 1200, 'list');
    const gridLayout = computeRowTargets(ids, expanded, 1200, 'grid');
    const elapsedMs = performance.now() - t0;

    assert.equal(listLayout.targets.size, 1000);
    assert.equal(listLayout.totalHeight, 1000 * (ROW_H + ROW_G) + (ROW_DH + ROW_G));
    assert.equal(gridLayout.targets.size, 1000);
    assert.equal(gridLayout.totalHeight, Math.ceil(1000 / 3) * (CARD_H + ROW_G));
    assert.ok(elapsedMs < 100, `1,000-row target compute should be fast, got ${elapsedMs.toFixed(2)}ms`);

    // Viewport around y = 35,000 (viewport height 640 + 440px overscan above & below)
    const minY = 35000 - WINDOW_OVERSCAN_PX;
    const maxY = 35000 + 640 + WINDOW_OVERSCAN_PX;

    let visibleListCount = 0;
    listLayout.targets.forEach((tgt) => {
      if (doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY)) {
        visibleListCount++;
      }
    });
    assert.ok(
      visibleListCount >= 18 && visibleListCount <= 30,
      `expected ~22 visible list rows in 1520px window, got ${visibleListCount}`
    );

    let visibleGridCount = 0;
    gridLayout.targets.forEach((tgt) => {
      if (doesRowOverlapWindow(tgt.y, tgt.h, false, minY, maxY)) {
        visibleGridCount++;
      }
    });
    assert.ok(
      visibleGridCount >= 24 && visibleGridCount <= 36,
      `expected ~30 visible grid cards in 1520px window, got ${visibleGridCount}`
    );
  });
});
