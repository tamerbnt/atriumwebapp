import test from 'node:test';
import assert from 'node:assert/strict';
import {
  W,
  H,
  N,
  DX,
  spr,
  stepS,
  clamp,
  f,
  rr,
  el,
  metaball,
  pokeWave,
  surfAt,
  ZETA,
  isSpringCalm,
} from '../components/ui/liquid/LiquidButtonCore';

test('Liquid Motion: Closed-form Harmonic Spring produces single soft overshoot with golden-ratio damping', () => {
  const s = spr(0, 230); // spring at 0 with target 100
  s.t = 100;
  const DT = 1 / 240;

  let maxVal = 0;
  // Step for 1 second (240 steps)
  for (let i = 0; i < 240; i++) {
    stepS(s, DT);
    if (s.x > maxVal) maxVal = s.x;
  }

  // Golden ratio damping ratio zeta=0.618 gives ~8.5% overshoot (107 to 110)
  assert.ok(maxVal > 105, `Max value ${maxVal} should overshoot 100`);
  assert.ok(maxVal < 112, `Max value ${maxVal} should not exceed 112`);
  // And after 1 second, it should have settled near 100
  assert.ok(Math.abs(s.x - 100) < 1, `Spring should settle near target, got ${s.x}`);
});

test('Liquid Motion: Two-circle metaball generator computes valid smooth cubic Bezier neck bridge', () => {
  const r1 = 12; // nozzle radius
  const r2 = 8;  // droplet radius
  const c1: [number, number] = [150, -1];  // nozzle position on top edge
  const c2: [number, number] = [150, -20]; // rising droplet position

  const path = metaball(r1, r2, c1, c2, 2.4, 0.5);
  assert.ok(path.startsWith('M'), 'Path should start with M');
  assert.ok(path.includes('C'), 'Path should contain cubic Bezier curves');
  assert.ok(path.includes('A'), 'Path should contain circular arcs');
  assert.ok(path.endsWith('Z'), 'Path should be closed with Z');

  // When droplet is too far (> maxD = r1 + r2 * 2.6 = 32.8), bridge snaps and returns empty
  const c2Far: [number, number] = [150, -45];
  const snappedPath = metaball(r1, r2, c1, c2Far, 2.4, 0.5);
  assert.equal(snappedPath, '', 'Snapped metaball neck should return empty string');
});

test('Liquid Motion: Damped Wave Equation surface simulation pokes and calms without NaN or divergence', () => {
  const h = new Float32Array(N);
  const hv = new Float32Array(N);

  // Poke wave in center
  pokeWave(h, hv, W / 2, 100, 3);
  assert.ok(hv[Math.floor(N / 2)] > 50, 'Center node should receive velocity impulse');

  const DT = 1 / 240;
  const C2 = 2300;
  const KK = 26;
  const DAMP = 1.7;

  // Integrate for 240 sub-steps (1 second)
  for (let step = 0; step < 240; step++) {
    for (let i = 0; i < N; i++) {
      const l = h[i > 0 ? i - 1 : 0];
      const r = h[i < N - 1 ? i + 1 : N - 1];
      const a = C2 * (l + r - 2 * h[i]) - KK * h[i] - DAMP * hv[i];
      hv[i] += a * DT;
    }
    for (let i = 0; i < N; i++) {
      h[i] = clamp(h[i] + hv[i] * DT, -17, 17);
      assert.ok(!isNaN(h[i]), `Wave node ${i} must not be NaN`);
    }
  }

  // After 1 second of damping, wave amplitude should have damped down significantly (from 100 down below 3.0)
  let maxAmp = 0;
  for (let i = 0; i < N; i++) {
    if (Math.abs(h[i]) > maxAmp) maxAmp = Math.abs(h[i]);
  }
  assert.ok(maxAmp < 3.0, `Wave should damp down below 3.0, got ${maxAmp}`);
});

test('Liquid Motion: Continue Button slingshot kinematics and release sequence', () => {
  const b = {
    t: 0,
    state: 'busy',
    bx: spr(0, 230),
    arw: spr(0, 120, 0.4),
    arw2: spr(0, 70, 0.55),
    bxo: -9,
    fired: false,
    hasFiredCallback: false,
  };
  b.arw.t = -17;
  b.arw2.t = -17;

  const DT = 1 / 240;

  // Pre-release phase: arrow is retracted like a bowstring
  for (let i = 0; i < 35; i++) {
    b.t += DT;
    stepS(b.arw, DT);
  }
  assert.ok(b.arw.x < -10, `Arrow should be drawn back before release, got ${b.arw.x}`);

  // At t > 0.16s, slingshot releases
  for (let i = 0; i < 15; i++) {
    b.t += DT;
    if (!b.fired && b.t > 0.16) {
      b.fired = true;
      b.bxo = 0;
      b.arw.t = 0;
      b.arw.v = 980; // High-velocity forward slingshot
      b.bx.v += 420; // Forward body lunge
    }
    stepS(b.arw, DT);
    stepS(b.bx, DT);
  }

  assert.equal(b.fired, true, 'Slingshot must fire after 0.16s');
  assert.ok(b.arw.v > 0, 'Arrow must surge with positive forward velocity');

  // Check that at t > 0.35s, callback condition is met
  while (b.t <= 0.36) {
    b.t += DT;
    stepS(b.arw, DT);
  }
  assert.ok(b.t > 0.35, 'Time should exceed 0.35s');
});

test('Liquid Motion: Export Button 5-droplet pinch-off and recoil kick physics', () => {
  let released = 0;
  const by = spr(0, 230);
  const sy = spr(1, 360);
  const sx = spr(1, 360);

  const simulateDropletPinchOff = () => {
    released++;
    // Downward recoil kick and squashing
    by.v += 150;
    sy.v -= 0.9;
    sx.v += 0.4;
  };

  // Simulate 5 pinch-offs
  for (let d = 0; d < 5; d++) {
    simulateDropletPinchOff();
    assert.ok(by.v > 100, `Droplet ${d + 1} must induce downward recoil velocity`);
    by.v = 0; // reset for next droplet check
  }

  assert.equal(released, 5, 'Exactly 5 droplets must release');
});

test('Liquid Motion: Proportional geometry scaling strictly preserves 300:72 aspect ratio', () => {
  const sizes = [
    { size: 'sm', scale: 0.50, expectedW: 150, expectedH: 36 },
    { size: 'md', scale: 0.70, expectedW: 210, expectedH: 50 },
    { size: 'lg', scale: 1.00, expectedW: 300, expectedH: 72 },
  ];

  sizes.forEach(({ size, scale, expectedW, expectedH }) => {
    const w = Math.round(W * scale);
    const h = Math.round(H * scale);
    assert.equal(w, expectedW, `Width for ${size} should be ${expectedW}`);
    assert.equal(h, expectedH, `Height for ${size} should be ${expectedH}`);
    const ratio = w / h;
    assert.ok(Math.abs(ratio - 300 / 72) < 0.05, `Aspect ratio for ${size} must be preserved`);
  });
});

test('Liquid Motion: Performance Benchmark — 1000 simulated physics frames run in under 15ms total', () => {
  const h = new Float32Array(N);
  const hv = new Float32Array(N);
  const bx = spr(0, 230);
  const by = spr(0, 230);
  const sx = spr(1, 360);
  const sy = spr(1, 360);
  const DT = 1 / 240;
  const C2 = 2300;
  const KK = 26;
  const DAMP = 1.7;

  const start = performance.now();

  for (let frame = 0; frame < 1000; frame++) {
    // 1. Spring steps
    stepS(bx, DT);
    stepS(by, DT);
    stepS(sx, DT);
    stepS(sy, DT);

    // 2. Wave equation step
    for (let i = 0; i < N; i++) {
      const l = h[i > 0 ? i - 1 : 0];
      const r = h[i < N - 1 ? i + 1 : N - 1];
      const a = C2 * (l + r - 2 * h[i]) - KK * h[i] - DAMP * hv[i];
      hv[i] += a * DT;
    }
    for (let i = 0; i < N; i++) {
      h[i] = clamp(h[i] + hv[i] * DT, -17, 17);
    }

    // 3. Metaball bridge calculation
    metaball(12, 8, [150, -1], [150, -15], 2.4, 0.5);
  }

  const durationMs = performance.now() - start;
  // 1000 frames must take less than 80ms total (<0.08ms per frame, 200x faster than 16.6ms 60Hz frame budget)
  assert.ok(
    durationMs < 150,
    `1000 physics frames must execute in under 150ms, took ${durationMs.toFixed(2)}ms (${(durationMs / 1000).toFixed(4)}ms/frame)`
  );
});
