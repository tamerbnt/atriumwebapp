import React, { useEffect, useRef, useState, useId } from 'react';
import { useAtriumStore } from '../../../services/store';
import {
  W,
  H,
  R0,
  N,
  DX,
  spr,
  stepS,
  clamp,
  rnd,
  f,
  pokeWave,
} from './LiquidButtonCore';

export interface LiquidContinueButtonProps {
  onClick?: () => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const LiquidContinueButton: React.FC<LiquidContinueButtonProps> = ({
  onClick,
  label,
  size = 'lg',
  disabled = false,
  className = '',
  id: customId,
  'aria-label': ariaLabelProp,
}) => {
  const { theme, language } = useAtriumStore();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const defaultLabel = isAr ? 'متابعة' : language === 'fr' ? 'CONTINUER' : 'CONTINUE';
  const displayLabel = label || defaultLabel;

  // Unique clip-path instance ID avoiding collision with multiple buttons
  const autoId = useId().replace(/[:]/g, '');
  const instanceId = customId || `cont-${autoId}`;

  // Proportional scaling preserving canonical 300:72 aspect ratio
  const scale = size === 'sm' ? 0.50 : size === 'md' ? 0.72 : 1.0;
  const containerW = Math.round(W * scale);
  const containerH = Math.round(H * scale);

  // Dynamic font sizing for long action strings (prevents colliding with arrow)
  const isLongLabel = displayLabel.length > 15;
  const fontSize = isLongLabel ? (displayLabel.length > 22 ? '20' : '23') : '28';

  // Element references
  const hitBtnRef = useRef<HTMLButtonElement | null>(null);
  const rootGroupRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGRectElement | null>(null);
  const cliprRef = useRef<SVGRectElement | null>(null);
  const liqRef = useRef<SVGPathElement | null>(null);
  const lqcpRef = useRef<SVGPathElement | null>(null);
  const arwRef = useRef<SVGPathElement | null>(null);
  const arwLiqRef = useRef<SVGPathElement | null>(null);
  const t0Ref = useRef<SVGTextElement | null>(null);
  const t0TextRef = useRef<SVGTextElement | null>(null);

  const [announcement, setAnnouncement] = useState('');

  // Signature Atrium Terracotta Orange palette
  const bodyFill = isDark ? '#E8643F' : '#D4522F';
  const liqFill = isDark ? '#262422' : '#F4EDE6';
  const t1Color = isDark ? '#0A0A0A' : '#F4EDE6'; // Text & arrow on terracotta body
  const t2Color = isDark ? '#E8643F' : '#D4522F'; // Inverted text & arrow on cream liquid wave
  const strokeColor = t1Color;
  const strokeLiqColor = t2Color;

  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    const hit = hitBtnRef.current;
    if (!hit) return;

    // Direct model state — initialized with resting 35% liquid waterline
    const b = {
      state: 'idle' as 'idle' | 'busy' | 'done',
      t: 0,
      hover: false,
      press: false,
      px: W / 2,
      py: H / 2,
      bx: spr(0, 230),
      by: spr(0, 230),
      sx: spr(1, 360),
      sy: spr(1, 360),
      rad: spr(R0, 170),
      bxo: 0,
      sxo: 1,
      syo: 1,
      level: spr(0.35, 58), // Visible 35% liquid waterline at rest
      h: new Float32Array(N),
      hv: new Float32Array(N),
      arw: spr(0, 120, 0.4),
      arw2: spr(0, 70, 0.55),
      fired: false,
      noise: rnd(0.4, 1.6),
      hasFiredCallback: false,
      active: true,
    };

    const poke = (x: number, amp: number, w: number) => {
      pokeWave(b.h, b.hv, x, amp, w);
    };

    const render = () => {
      if (!rootGroupRef.current || !bodyRef.current || !cliprRef.current || !liqRef.current || !lqcpRef.current) {
        return;
      }

      rootGroupRef.current.setAttribute(
        'transform',
        `translate(${f(b.bx.x)} ${f(b.by.x)}) translate(150 36) scale(${f(b.sx.x)} ${f(b.sy.x)}) translate(-150 -36)`
      );

      const r = f(clamp(b.rad.x, 2, H / 2));
      bodyRef.current.setAttribute('rx', r);
      cliprRef.current.setAttribute('rx', r);

      // Liquid wave path
      const base = H * (1 - b.level.x);
      let d = `M-3 ${H + 4}L-3 ${f(base - b.h[0])}`;
      for (let i = 0; i < N; i++) {
        d += `L${f(i * DX)} ${f(base - b.h[i])}`;
      }
      d += `L${W + 3} ${f(base - b.h[N - 1])}L${W + 3} ${H + 4}Z`;

      liqRef.current.setAttribute('d', d);
      lqcpRef.current.setAttribute('d', d);

      // Slingshot Arrow path
      const y = H / 2;
      const hd = 10;
      let arrowD = '';
      if (isAr) {
        // Mirrored arrow shooting left forward in Arabic RTL
        const x0 = 94 + clamp(b.arw2.x, -140, 30);
        const tip = 46 + b.arw.x;
        arrowD = `M${f(x0)} ${f(y)}H${f(tip)}M${f(tip + hd)} ${f(y - hd)}L${f(tip)} ${f(y)}L${f(tip + hd)} ${f(y + hd)}`;
      } else {
        // Slingshot arrow shooting right forward in LTR
        const x0 = W - 94 + clamp(b.arw2.x, -30, 140);
        const tip = W - 46 + b.arw.x;
        arrowD = `M${f(x0)} ${f(y)}H${f(tip)}M${f(tip - hd)} ${f(y - hd)}L${f(tip)} ${f(y)}L${f(tip - hd)} ${f(y + hd)}`;
      }

      if (arwRef.current) arwRef.current.setAttribute('d', arrowD);
      if (arwLiqRef.current) arwLiqRef.current.setAttribute('d', arrowD);
    };

    const step = (dt: number) => {
      b.t += dt;

      b.bx.t = (b.hover ? clamp((b.px - W / 2) * 0.05, -8, 8) : 0) + b.bxo;
      b.by.t = (b.hover ? clamp((b.py - H / 2) * 0.1, -4, 4) : 0) + (b.press ? 2 : 0);
      b.sx.t = (b.press ? 1.03 : 1) * b.sxo;
      b.sy.t = (b.press ? 0.945 : 1) * b.syo;
      b.rad.t = R0 + (b.hover && b.state === 'idle' ? 3 : 0);

      // Living organic Brownian motion in idle
      if (b.state === 'idle') {
        b.noise -= dt;
        if (b.noise <= 0) {
          b.noise = rnd(0.8, 2.4);
          b.arw.v += rnd(-20, 20);
          poke(rnd(W * 0.2, W * 0.8), rnd(-15, 15), 3);
        }
      }

      if (b.state === 'busy') {
        // Slingshot release at t > 0.16s
        if (!b.fired && b.t > 0.16) {
          b.fired = true;
          b.bxo = 0;
          b.sxo = 1;
          b.syo = 1;
          b.arw.t = 0;
          b.arw.v = isAr ? -980 : 980;
          b.arw2.t = 0;
          b.bx.v += isAr ? -420 : 420;
          b.sx.v += 1.5;
          b.sy.v -= 1.3;
          b.level.t = 0.55; // Surges above halfway mark on release
          poke(isAr ? W - 34 : 34, 320, 5);
        }

        // Fire step transition callback at apex of slingshot launch (t > 0.35s)
        if (b.fired && b.t > 0.35 && !b.hasFiredCallback) {
          b.hasFiredCallback = true;
          if (onClickRef.current) {
            onClickRef.current();
          }
        }

        // Settle smoothly back to resting 35% waterline
        if (b.t > 1.3) {
          b.level.t = 0.35;
          b.state = 'idle';
          b.t = 0;
          b.fired = false;
          b.hasFiredCallback = false;
        }
      }

      b.arw2.t = b.arw.x;

      // Closed-form damped harmonic springs
      stepS(b.bx, dt);
      stepS(b.by, dt);
      stepS(b.sx, dt);
      stepS(b.sy, dt);
      stepS(b.rad, dt);
      stepS(b.level, dt);
      stepS(b.arw, dt);
      stepS(b.arw2, dt);

      // Damped wave equation coupled to vessel acceleration
      const C2 = 2300;
      const KK = 26;
      const DAMP = 1.7;
      const fy = -b.by.a * 0.0035;

      for (let i = 0; i < N; i++) {
        const l = b.h[i > 0 ? i - 1 : 0];
        const r = b.h[i < N - 1 ? i + 1 : N - 1];
        const xi = (i / (N - 1)) * 2 - 1;
        const a = C2 * (l + r - 2 * b.h[i]) - KK * b.h[i] - DAMP * b.hv[i] - b.bx.a * 0.011 * xi + fy;
        b.hv[i] += a * dt;
      }
      for (let i = 0; i < N; i++) {
        b.h[i] = clamp(b.h[i] + b.hv[i] * dt, -17, 17);
      }
    };

    // Synchronous Frame 0 render so elements exist from millisecond 0
    render();

    // On-demand RAF loop manager: sleeps when calm (0% idle CPU)
    let raf = 0;
    let alive = true;
    let last = performance.now();
    let acc = 0;
    const DT = 1 / 240;

    const frame = (now: number) => {
      if (!alive) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      acc += dt;
      let n = 0;
      while (acc >= DT && n < 60) {
        step(DT);
        acc -= DT;
        n++;
      }
      if (n === 60) acc = 0;

      render();

      // Check if settled to sleep loop
      const isSettled =
        b.state === 'idle' &&
        !b.hover &&
        !b.press &&
        Math.abs(b.bx.x) < 0.02 &&
        Math.abs(b.by.x) < 0.02 &&
        Math.abs(b.sx.x - 1) < 0.01 &&
        Math.abs(b.sy.x - 1) < 0.01 &&
        Math.abs(b.arw.x) < 0.05 &&
        Math.abs(b.level.x - 0.35) < 0.01 &&
        Math.abs(b.hv[0]) < 0.02;

      if (!isSettled || b.state !== 'idle') {
        raf = requestAnimationFrame(frame);
      } else {
        b.active = false;
      }
    };

    const wake = () => {
      if (!b.active && alive) {
        b.active = true;
        last = performance.now();
        acc = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);

    // Hit event listeners
    const loc = (e: PointerEvent) => {
      const rect = hit.getBoundingClientRect();
      b.px = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W;
      b.py = ((e.clientY - rect.top) / Math.max(1, rect.height)) * H;
    };

    const handlePointerEnter = (e: PointerEvent) => {
      if (disabled) return;
      loc(e);
      b.hover = true;
      poke(b.px, 70, 3);
      wake();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (disabled) return;
      loc(e);
      wake();
    };

    const handlePointerLeave = () => {
      b.hover = false;
      b.press = false;
      wake();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (disabled) return;
      loc(e);
      b.press = true;
      wake();
    };

    const handlePointerUp = () => {
      b.press = false;
      wake();
    };

    const handleClick = () => {
      if (disabled) return;
      if (b.state === 'idle') {
        b.state = 'busy';
        b.t = 0;
        b.bxo = isAr ? 9 : -9;
        b.arw.t = isAr ? 17 : -17;
        b.arw2.t = isAr ? 17 : -17;
        b.sxo = 0.97;
        b.syo = 1.03;
        b.fired = false;
        b.hasFiredCallback = false;
        setAnnouncement(displayLabel);
        wake();
      }
    };

    hit.addEventListener('pointerenter', handlePointerEnter);
    hit.addEventListener('pointermove', handlePointerMove);
    hit.addEventListener('pointerleave', handlePointerLeave);
    hit.addEventListener('pointerdown', handlePointerDown);
    hit.addEventListener('pointerup', handlePointerUp);
    hit.addEventListener('pointercancel', handlePointerLeave);
    hit.addEventListener('click', handleClick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      hit.removeEventListener('pointerenter', handlePointerEnter);
      hit.removeEventListener('pointermove', handlePointerMove);
      hit.removeEventListener('pointerleave', handlePointerLeave);
      hit.removeEventListener('pointerdown', handlePointerDown);
      hit.removeEventListener('pointerup', handlePointerUp);
      hit.removeEventListener('pointercancel', handlePointerLeave);
      hit.removeEventListener('click', handleClick);
    };
  }, [disabled, displayLabel, isAr]);

  return (
    <div
      className={`relative inline-block select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{
        width: `${containerW}px`,
        height: `${containerH}px`,
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Self-contained SVG Stage matching local button coordinates (0 0 300 72) */}
      <svg
        viewBox="0 0 300 72"
        width="100%"
        height="100%"
        aria-hidden="true"
        className="pointer-events-none block overflow-visible"
      >
        <defs>
          <clipPath id={`cl-clip-${instanceId}`}>
            <rect ref={cliprRef} x="0" y="0" width={W} height={H} rx={R0} />
          </clipPath>
          <clipPath id={`cl-lqc-${instanceId}`}>
            <path ref={lqcpRef} d="M0 0" />
          </clipPath>
        </defs>

        <g ref={rootGroupRef}>
          {/* Main Button Body Shell in Signature Atrium Terracotta Orange */}
          <rect
            ref={bodyRef}
            x="0"
            y="0"
            width={W}
            height={H}
            rx={R0}
            style={{ fill: bodyFill }}
          />

          {/* Liquid Wave inside Button Body */}
          <g clipPath={`url(#cl-clip-${instanceId})`}>
            <path ref={liqRef} d="M0 0" style={{ fill: liqFill }} />
          </g>

          {/* Text & Arrow Layer 1 (on Orange Body Fill) */}
          <g clipPath={`url(#cl-clip-${instanceId})`} style={{ fill: t1Color, stroke: strokeColor }}>
            <path
              ref={arwRef}
              fill="none"
              strokeWidth={scale < 0.7 ? 4.2 : 5.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M0 0"
            />
            <text
              ref={t0Ref}
              x={isAr ? W - 28 : 28}
              y="46"
              stroke="none"
              textAnchor={isAr ? 'end' : 'start'}
              fontFamily={isAr ? "'Cairo', sans-serif" : "'Barlow Condensed', sans-serif"}
              fontWeight="600"
              fontSize={fontSize}
              letterSpacing={isAr ? '0.5' : isLongLabel ? '0.8' : '1.8'}
            >
              {displayLabel}
            </text>
          </g>

          {/* Text & Arrow Layer 2 (Clipped to Liquid Wave with Inverted Terracotta Color) */}
          <g clipPath={`url(#cl-clip-${instanceId})`}>
            <g clipPath={`url(#cl-lqc-${instanceId})`} style={{ fill: t2Color, stroke: strokeLiqColor }}>
              <path
                ref={arwLiqRef}
                fill="none"
                strokeWidth={scale < 0.7 ? 4.2 : 5.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M0 0"
              />
              <text
                ref={t0TextRef}
                x={isAr ? W - 28 : 28}
                y="46"
                stroke="none"
                textAnchor={isAr ? 'end' : 'start'}
                fontFamily={isAr ? "'Cairo', sans-serif" : "'Barlow Condensed', sans-serif"}
                fontWeight="600"
                fontSize={fontSize}
                letterSpacing={isAr ? '0.5' : isLongLabel ? '0.8' : '1.8'}
              >
                {displayLabel}
              </text>
            </g>
          </g>
        </g>
      </svg>

      {/* Accessible Interactive Hit Overlay — Locked to EXACT container boundaries */}
      <button
        ref={hitBtnRef}
        type="button"
        id={customId || `btn-${instanceId}`}
        aria-label={ariaLabelProp || displayLabel}
        disabled={disabled}
        data-no-liquid="true"
        className="!absolute inset-0 z-20 w-full h-full appearance-none border-0 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#D5532F] focus-visible:ring-offset-2"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          borderRadius: `${R0 * scale}px`,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      />

      {announcement && <span className="sr-only" aria-live="polite">{announcement}</span>}
    </div>
  );
};
