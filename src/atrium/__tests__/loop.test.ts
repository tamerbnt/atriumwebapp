import { Loop, Body, Scheduler } from '../motion/loop';
import { Spring } from '../motion/spring';
import { motion, configureMotion, __resetMotionEnvForTests } from '../motion/env';

/** a hand-cranked requestAnimationFrame */
function fakeScheduler() {
  let next = 1;
  const queue = new Map<number, (t: number) => void>();
  const sched: Scheduler = {
    request(cb) {
      const id = next++;
      queue.set(id, cb);
      return id;
    },
    cancel(id) {
      queue.delete(id);
    },
  };
  let now = 0;
  return {
    sched,
    get pending() {
      return queue.size;
    },
    /** run one frame, `ms` after the previous one */
    frame(ms = 1000 / 60) {
      now += ms;
      const cbs = [...queue.values()];
      queue.clear();
      cbs.forEach((cb) => cb(now));
    },
  };
}

class TestBody implements Body {
  s = new Spring(0, 260);
  visible = true;
  slept = 0;
  woke = 0;
  constructor(target = 1) {
    this.s.t = target;
  }
  step(dt: number) {
    this.s.step(dt);
  }
  render() {}
  settled() {
    return this.s.calm();
  }
  snap() {
    this.s.snap();
  }
  onWake() {
    this.woke++;
  }
  onSleep() {
    this.slept++;
  }
  isVisible() {
    return this.visible;
  }
}

beforeEach(() => __resetMotionEnvForTests());

describe('Loop', () => {
  it('runs nothing until something wakes, and nothing again once everything is at rest', () => {
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    expect(t.pending).toBe(0);

    const b = new TestBody();
    loop.wake(b);
    expect(t.pending).toBe(1);
    expect(b.woke).toBe(1);

    let frames = 0;
    while (t.pending && frames < 600) {
      t.frame();
      frames++;
    }
    expect(frames).toBeLessThan(120); // settles in under 2 s at 60 fps
    expect(b.slept).toBe(1);
    expect(b.s.x).toBe(1);
    expect(t.pending).toBe(0); // no frame is scheduled: an idle screen costs nothing
    expect(loop.running).toBe(false);
  });

  it('waking a body twice does not double-step or double-register', () => {
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    const b = new TestBody();
    loop.wake(b);
    loop.wake(b);
    expect(loop.size).toBe(1);
    expect(b.woke).toBe(1);
    expect(t.pending).toBe(1);
  });

  it('puts offscreen / disconnected bodies straight to rest', () => {
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    const b = new TestBody();
    b.visible = false;
    loop.wake(b);
    t.frame();
    expect(b.s.x).toBe(1);
    expect(b.slept).toBe(1);
    expect(t.pending).toBe(0);
  });

  it('caps the physics step so a returning background tab does not fast-forward', () => {
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    const b = new TestBody();
    loop.wake(b);
    t.frame(); // first frame
    t.frame(60_000); // one minute later
    // with a 50 ms cap the spring cannot have finished a 1-unit move at k=260 in one step
    expect(b.slept).toBe(0);
  });

  it('jumps straight to the target on the "off" tier', () => {
    configureMotion({ tier: 'off' });
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    const b = new TestBody();
    loop.wake(b);
    t.frame();
    expect(b.s.x).toBe(1);
    expect(b.slept).toBe(1);
  });

  it('survives a body that throws', () => {
    const t = fakeScheduler();
    const loop = new Loop(t.sched);
    const bad = new TestBody();
    bad.step = () => {
      throw new Error('boom');
    };
    const good = new TestBody();
    const quiet = console.error;
    console.error = () => {};
    loop.wake(bad);
    loop.wake(good);
    t.frame();
    console.error = quiet;
    expect(loop.size).toBe(1);
    expect(good.s.x).toBeGreaterThan(0);
  });

  describe('performance governor', () => {
    function runSlow(frames: number, ms: number) {
      const t = fakeScheduler();
      const loop = new Loop(t.sched);
      const b = new TestBody(1e9); // keeps the loop busy
      b.settled = () => false;
      loop.wake(b);
      for (let i = 0; i < frames; i++) t.frame(ms);
    }

    it('lowers full → lite → off after sustained slow frames', () => {
      expect(motion.tier).toBe('full');
      runSlow(46, 50); // 20 fps for a whole window
      expect(motion.tier).toBe('lite');
      runSlow(46, 50);
      expect(motion.tier).toBe('off');
    });

    it('ignores isolated hitches', () => {
      const t = fakeScheduler();
      const loop = new Loop(t.sched);
      const b = new TestBody(1e9);
      b.settled = () => false;
      loop.wake(b);
      for (let i = 0; i < 200; i++) t.frame(i % 10 === 0 ? 60 : 16);
      expect(motion.tier).toBe('full');
    });

    it('ignores long gaps (tab switches)', () => {
      runSlow(60, 2000);
      expect(motion.tier).toBe('full');
    });

    it('never downgrades a pinned tier', () => {
      configureMotion({ tier: 'full' });
      runSlow(200, 50);
      expect(motion.tier).toBe('full');
    });
  });

  it('lite tier removes overshoot (ζ → 1)', () => {
    configureMotion({ tier: 'lite' });
    const s = new Spring(0, 260);
    s.t = 1;
    let max = 0;
    for (let i = 0; i < 600; i++) {
      s.step(1 / 240);
      max = Math.max(max, s.x);
    }
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
  });
});
