import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  Sp,
  setReducedMotionOverride,
} from '../screens/membership/motion/adherentsMotion';
import {
  MODAL_SPRING_TUNE,
  computeMemberModalMetrics,
  shouldFinishClosing,
  computeModalTransformOrigin,
  shouldCloseOnScrimMouseUp,
} from './memberModalMotion';

describe('MemberModal Spring Physics, Checkpoints & Lifecycle Math', () => {
  beforeEach(() => {
    setReducedMotionOverride(false);
  });

  it('matches all Section 1 opening checkpoints (17ms..400ms) with tune 28 (k=0.1248, d=0.676)', () => {
    const dp = new Sp(0, MODAL_SPRING_TUNE);
    assert.ok(Math.abs(dp.k - 0.1248) < 1e-6);
    assert.ok(Math.abs(dp.d - 0.676) < 1e-6);

    dp.t = 100;

    const frameValues = new Map<number, { scale: number; opacity: number }>();
    for (let frame = 1; frame <= 24; frame++) {
      dp.step(1);
      const m = computeMemberModalMetrics(dp.x, false);
      frameValues.set(frame, { scale: m.scale, opacity: m.opacity });
    }

    // 17ms (frame 1): 0.744 / 0.12
    assert.ok(Math.abs(frameValues.get(1)!.scale - 0.744) < 0.005);
    assert.ok(Math.abs(frameValues.get(1)!.opacity - 0.12) < 0.015);

    // 33ms (frame 2): 0.78 / 0.30
    assert.ok(Math.abs(frameValues.get(2)!.scale - 0.78) < 0.01);
    assert.ok(Math.abs(frameValues.get(2)!.opacity - 0.30) < 0.02);

    // 50ms (frame 3): 0.825 / 0.53
    assert.ok(Math.abs(frameValues.get(3)!.scale - 0.825) < 0.01);
    assert.ok(Math.abs(frameValues.get(3)!.opacity - 0.53) < 0.03);

    // 67ms (frame 4): 0.87 / 0.75
    assert.ok(Math.abs(frameValues.get(4)!.scale - 0.87) < 0.01);
    assert.ok(Math.abs(frameValues.get(4)!.opacity - 0.75) < 0.03);

    // 100ms (frame 6): 0.946 / 1.0
    assert.ok(Math.abs(frameValues.get(6)!.scale - 0.946) < 0.01);
    assert.equal(frameValues.get(6)!.opacity, 1);

    // 133ms (frame 8): 0.995 / 1.0
    assert.ok(Math.abs(frameValues.get(8)!.scale - 0.995) < 0.01);
    assert.equal(frameValues.get(8)!.opacity, 1);

    // 167ms (frame 10): 1.02
    assert.ok(Math.abs(frameValues.get(10)!.scale - 1.02) < 0.01);

    // 200ms (frame 12): ~1.025 (peak)
    assert.ok(Math.abs(frameValues.get(12)!.scale - 1.025) < 0.006);

    // 250ms (frame 15): ~1.017
    assert.ok(Math.abs(frameValues.get(15)!.scale - 1.017) < 0.006);

    // 300ms (frame 18): ~1.006
    assert.ok(Math.abs(frameValues.get(18)!.scale - 1.006) < 0.006);

    // 400ms (frame 24): ~0.998
    assert.ok(Math.abs(frameValues.get(24)!.scale - 0.998) < 0.006);

    dp.destroy();
  });

  it('closes back to scale 0.72 without bounce in <= 150ms (dq < 0.01)', () => {
    const dp = new Sp(100, MODAL_SPRING_TUNE);
    dp.t = 0;

    let closeFrame = -1;
    let minScaleSeen = 1;
    for (let frame = 1; frame <= 20; frame++) {
      dp.step(1);
      const m = computeMemberModalMetrics(dp.x, false);
      minScaleSeen = Math.min(minScaleSeen, m.scale);
      if (shouldFinishClosing(dp.x, dp.t)) {
        closeFrame = frame;
        break;
      }
    }

    // 9 frames * 16.67ms = 150ms (8 frames = 133ms); must never bounce below 0.72
    assert.ok(closeFrame > 0 && closeFrame <= 9, `expected close <= 9 frames (150ms), got ${closeFrame}`);
    assert.ok(minScaleSeen >= 0.72, `close must not bounce below 0.72, saw ${minScaleSeen}`);

    dp.destroy();
  });

  it('supports mid-flight re-entrancy keeping current x and v', () => {
    const dp = new Sp(100, MODAL_SPRING_TUNE);
    dp.t = 0;
    for (let i = 0; i < 4; i++) dp.step(1);
    const midX = dp.x;
    const midV = dp.v;
    assert.ok(midX > 20 && midX < 80);
    assert.ok(midV < 0);

    // Reopen mid-close without resetting x or v
    dp.setTarget(100);
    assert.equal(dp.x, midX);
    assert.equal(dp.v, midV);
    assert.equal(dp.t, 100);

    dp.destroy();
  });

  it('disables scale under reduced motion (fade-only)', () => {
    const mStart = computeMemberModalMetrics(0, true);
    const mMid = computeMemberModalMetrics(50, true);
    const mFull = computeMemberModalMetrics(100, true);

    assert.equal(mStart.scale, 1);
    assert.equal(mMid.scale, 1);
    assert.equal(mFull.scale, 1);
    assert.equal(mMid.transform, 'scale(1)');
    assert.ok(mMid.opacity > 0.5 && mMid.opacity < 1);
  });

  it('computes transform-origin from trigger center in dialog coords and falls back when off-screen or null', () => {
    const dialog = { left: 432, top: 150, width: 576, height: 600 };
    const trigger = { left: 1200, top: 88, width: 180, height: 40 };

    const origin = computeModalTransformOrigin(trigger, dialog, 1440, 900);
    // cx = 1290 -> 1290 - 432 = 858px; cy = 108 -> 108 - 150 = -42px
    assert.equal(origin, '858px -42px');

    assert.equal(computeModalTransformOrigin(null, dialog, 1440, 900), 'center center');
    assert.equal(
      computeModalTransformOrigin({ left: 10, top: -60, width: 100, height: 40 }, dialog, 1440, 900),
      'center center'
    );
  });

  it('enforces scrim mousedown+mouseup matching and 150ms open guard', () => {
    assert.equal(shouldCloseOnScrimMouseUp(true, true, 1050, 1000), false); // within 150ms
    assert.equal(shouldCloseOnScrimMouseUp(false, true, 1300, 1000), false); // dragged from inside dialog
    assert.equal(shouldCloseOnScrimMouseUp(true, false, 1300, 1000), false);
    assert.equal(shouldCloseOnScrimMouseUp(true, true, 1150, 1000), true);
  });
});
