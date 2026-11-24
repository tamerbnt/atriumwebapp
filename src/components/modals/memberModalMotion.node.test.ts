import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  Sp,
  setReducedMotionOverride,
} from '../screens/membership/motion/adherentsMotion';
import {
  MODAL_SPRING_COEFFS,
  MODAL_START_SCALE,
  computeMemberModalMetrics,
  shouldFinishClosing,
  computeModalTransformOrigin,
  shouldCloseOnScrimMouseUp,
  registerKineticMemberModalOpener,
  triggerKineticMemberModal,
} from './memberModalMotion';

describe('MemberModal Spring Physics, Checkpoints & Lifecycle Math', () => {
  beforeEach(() => {
    setReducedMotionOverride(false);
  });

  it('opens crisply to 99%+ within ~133ms and settles cleanly without excessive overshoot or lag', () => {
    const dp = new Sp(0, MODAL_SPRING_COEFFS);
    assert.equal(dp.k, MODAL_SPRING_COEFFS.k);
    assert.equal(dp.d, MODAL_SPRING_COEFFS.d);

    dp.t = 100;

    let maxScale = 0;
    let reached99Frame = -1;
    let settledFrame = -1;
    for (let frame = 1; frame <= 30; frame++) {
      dp.step(1);
      const m = computeMemberModalMetrics(dp.x, false);
      maxScale = Math.max(maxScale, m.scale);
      if (reached99Frame === -1 && dp.x >= 99) reached99Frame = frame;
      if (settledFrame === -1 && Math.abs(100 - dp.x) < 0.08 && Math.abs(dp.v) < 0.08) {
        settledFrame = frame;
      }
    }

    assert.ok(reached99Frame > 0 && reached99Frame <= 9, `expected >=99% in <=9 frames, got ${reached99Frame}`);
    assert.ok(settledFrame > 0 && settledFrame <= 22, `expected fast settle <=22 frames (~367ms), got ${settledFrame}`);
    assert.ok(maxScale <= 1.01, `expected negligible overshoot <=1.01, got ${maxScale}`);

    dp.destroy();
  });

  it('closes back to start scale without bounce in <= 150ms', () => {
    const dp = new Sp(100, MODAL_SPRING_COEFFS);
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

    assert.ok(closeFrame > 0 && closeFrame <= 9, `expected close <= 9 frames (150ms), got ${closeFrame}`);
    assert.ok(minScaleSeen >= MODAL_START_SCALE, `close must not bounce below ${MODAL_START_SCALE}, saw ${minScaleSeen}`);

    dp.destroy();
  });

  it('supports mid-flight re-entrancy keeping current x and v', () => {
    const dp = new Sp(100, MODAL_SPRING_COEFFS);
    dp.t = 0;
    for (let i = 0; i < 3; i++) dp.step(1);
    const midX = dp.x;
    const midV = dp.v;
    assert.ok(midX > 15 && midX < 85);
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
    assert.equal(origin, '858px -42px');

    assert.equal(computeModalTransformOrigin(null, dialog, 1440, 900), 'center center');
    assert.equal(
      computeModalTransformOrigin({ left: 10, top: -60, width: 100, height: 40 }, dialog, 1440, 900),
      'center center'
    );
  });

  it('enforces scrim mousedown+mouseup matching and 140ms open guard', () => {
    assert.equal(shouldCloseOnScrimMouseUp(true, true, 1050, 1000), false);
    assert.equal(shouldCloseOnScrimMouseUp(false, true, 1300, 1000), false);
    assert.equal(shouldCloseOnScrimMouseUp(true, false, 1300, 1000), false);
    assert.equal(shouldCloseOnScrimMouseUp(true, true, 1140, 1000), true);
  });

  it('dispatches and cleans up zero-render kinetic modal trigger handler', () => {
    assert.equal(triggerKineticMemberModal({ member: null }), false);

    let received: any = undefined;
    const unsub = registerKineticMemberModalOpener((payload) => {
      received = payload;
    });

    assert.equal(triggerKineticMemberModal({ member: { id: 'm1' } }), true);
    assert.equal(received?.member?.id, 'm1');

    unsub();
    assert.equal(triggerKineticMemberModal({ member: null }), false);
  });
});
