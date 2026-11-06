/**
 * kineticPhysics.ts
 * High-performance Euler sub-step spring engine, 1D shallow water wave simulator,
 * and idle sleep governor derived directly from Atrium's Members2.dc.html specification.
 */

export interface Spring {
  x: number;       // Current position
  v: number;       // Current velocity
  t: number;       // Target position
  k: number;       // Stiffness (default: 160-260)
  z: number;       // Damping ratio (default: 0.618 golden ratio)
}

export const createSpring = (initial: number, stiffness = 160, damping = 0.618): Spring => ({
  x: initial,
  v: 0,
  t: initial,
  k: stiffness,
  z: damping,
});

export const stepSpring = (s: Spring, dt: number): void => {
  const a = s.k * (s.t - s.x) - 2 * s.z * Math.sqrt(s.k) * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

export const isSpringCalm = (s: Spring): boolean => {
  return Math.abs(s.v) < 0.02 && Math.abs(s.t - s.x) < 0.003;
};

export const clamp = (v: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, v));
};

export const formatDec = (n: number): string => {
  return (Math.round(n * 100) / 100).toString();
};

/**
 * 1D Shallow Water Wave Vessel Simulator (14 nodes)
 */
export const NUM_WAVE_NODES = 14;

export interface WaveVessel {
  level: Spring;
  h: Float32Array;
  hv: Float32Array;
  poke: (strength?: number) => void;
  tick: (dt: number) => void;
  isSettled: () => boolean;
  computeSvgPath: (width: number, height: number) => string;
}

export const createWaveVessel = (initialLevel = 0.5): WaveVessel => {
  const level = createSpring(initialLevel, 70, 0.6);
  const h = new Float32Array(NUM_WAVE_NODES);
  const hv = new Float32Array(NUM_WAVE_NODES);

  const poke = (strength = 40) => {
    for (let i = 0; i < NUM_WAVE_NODES; i++) {
      hv[i] += strength * Math.sin((Math.PI * i) / (NUM_WAVE_NODES - 1));
    }
  };

  const tick = (dt: number) => {
    stepSpring(level, dt);
    for (let i = 0; i < NUM_WAVE_NODES; i++) {
      const l = h[i > 0 ? i - 1 : 0];
      const r = h[i < NUM_WAVE_NODES - 1 ? i + 1 : NUM_WAVE_NODES - 1];
      hv[i] += (260 * (l + r - 2 * h[i]) - 22 * h[i] - 1.6 * hv[i]) * dt;
    }
    for (let i = 0; i < NUM_WAVE_NODES; i++) {
      h[i] = clamp(h[i] + hv[i] * dt, -4, 4);
    }
  };

  const isSettled = (): boolean => {
    if (!isSpringCalm(level)) return false;
    for (let i = 0; i < NUM_WAVE_NODES; i++) {
      if (Math.abs(h[i]) > 0.01 || Math.abs(hv[i]) > 0.05) return false;
    }
    return true;
  };

  const computeSvgPath = (width: number, height: number): string => {
    const y0 = (height - 1) - (height - 2) * clamp(level.x, 0, 1.02);
    let d = `M0 ${height}L0 ${formatDec(y0 - h[0])}`;
    for (let i = 0; i < NUM_WAVE_NODES; i++) {
      const x = (i * width) / (NUM_WAVE_NODES - 1);
      const y = y0 - h[i];
      d += `L${formatDec(x)} ${formatDec(y)}`;
    }
    return `${d}L${width} ${height}Z`;
  };

  return { level, h, hv, poke, tick, isSettled, computeSvgPath };
};
