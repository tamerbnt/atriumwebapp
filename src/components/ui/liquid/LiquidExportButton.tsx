import React, { useEffect, useRef, useState, useId } from 'react';
import { useAtriumStore } from '../../../services/store';
import {
  W,
  H,
  R0,
  N,
  DX,
  IC,
  IX,
  IY,
  CS,
  CR,
  RO,
  ROR,
  RI,
  HOME,
  DIR,
  PW,
  spr,
  stepS,
  clamp,
  rnd,
  f,
  rr,
  el,
  metaball,
  pokeWave,
  Spring,
} from './LiquidButtonCore';

export interface LiquidExportButtonProps {
  onExport: () => Promise<void> | void;
  idleLabel?: string;
  busyLabel?: string;
  doneLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'orange' | 'dark';
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

interface ExportDrop {
  st: 'form' | 'free';
  x: number;
  y: number;
  vy: number;
  r: number;
  ft: number;
  e: Spring;
  k: number;
}

export const LiquidExportButton: React.FC<LiquidExportButtonProps> = ({
  onExport,
  idleLabel,
  busyLabel,
  doneLabel,
  size = 'sm',
  variant = 'orange',
  disabled = false,
  className = '',
  id: customId,
  'aria-label': ariaLabelProp,
}) => {
  const { theme, language } = useAtriumStore();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const defaultIdle = isAr ? 'تصدير' : isFr ? 'EXPORTER' : 'EXPORT';
  const defaultDone = isAr ? 'تم التصدير' : isFr ? 'EXPORTÉ' : 'EXPORTED';

  const idleText = idleLabel || defaultIdle;
  const doneText = doneLabel || defaultDone;

  // Unique clip-path instance ID avoiding collision with multiple buttons
  const autoId = useId().replace(/[:]/g, '');
  const instanceId = customId || `exp-${autoId}`;

  // Standard action bar density: size="sm" is 40px tall (h-10) with 168px width
  const scale = size === 'sm' ? 0.56 : size === 'md' ? 0.72 : 1.0;
  const containerW = size === 'sm' ? 168 : Math.round(W * scale);
  const containerH = size === 'sm' ? 40 : Math.round(H * scale);

  // Element references
  const hitBtnRef = useRef<HTMLButtonElement | null>(null);
  const rootGroupRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGRectElement | null>(null);
  const cliprRef = useRef<SVGRectElement | null>(null);
  const liqRef = useRef<SVGPathElement | null>(null);
  const lqcpRef = useRef<SVGPathElement | null>(null);
  const airRef = useRef<SVGPathElement | null>(null);
  const markRef = useRef<SVGPathElement | null>(null);
  const chkRef = useRef<SVGPathElement | null>(null);

  // Sliding labels
  const l0Ref = useRef<SVGGElement | null>(null);
  const l1Ref = useRef<SVGGElement | null>(null);
  const l2Ref = useRef<SVGGElement | null>(null);
  const t0Ref = useRef<SVGTextElement | null>(null);
  const t1Ref = useRef<SVGTextElement | null>(null);
  const t2Ref = useRef<SVGTextElement | null>(null);

  const [announcement, setAnnouncement] = useState('');

  // Signature Atrium Terracotta Orange palette
  const isOrangeVariant = variant === 'orange' || !isDark;
  const bodyFill = isOrangeVariant ? (isDark ? '#E8643F' : '#D4522F') : '#0A0A0A';
  const liqFill = isDark && !isOrangeVariant ? '#262422' : '#F4EDE6';
  const t1Color = isDark && isOrangeVariant ? '#0A0A0A' : '#F4EDE6';
  const t2Color = isOrangeVariant ? (isDark ? '#E8643F' : '#D4522F') : '#0A0A0A';
  const strokeColor = t1Color;
  const strokeLiqColor = t2Color;

  const onExportRef = useRef(onExport);
  useEffect(() => {
    onExportRef.current = onExport;
  }, [onExport]);

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
      level: spr(0.35, 58), // Visible 35% liquid waterline at rest
      h: new Float32Array(N),
      hv: new Float32Array(N),
      lab: [spr(0, 280), spr(1, 280), spr(1, 280)],
      cx: [spr(0, 520, 0.5), spr(0, 520, 0.5), spr(0, 520, 0.5), spr(0, 520, 0.5)],
      cy: [spr(0, 520, 0.5), spr(0, 520, 0.5), spr(0, 520, 0.5), spr(0, 520, 0.5)],
      cs: spr(1, 420),
      ring: spr(1, 260),
      chk: spr(0, 260),
      pen: { x: 0, y: 0, vx: 0, vy: 0, wp: 1, on: false },
      trail: [] as [number, number][],
      ex: [] as ExportDrop[],
      nz: spr(0, 520, 0.45),
      nzx: W / 2,
      exStarted: 0,
      released: 0,
      lastEv: 0,
      noise: rnd(0.4, 1.6),
      lastBusyText: '',
      hasExportExecuted: false,
      active: true,
    };

    const poke = (x: number, amp: number, w: number) => {
      pokeWave(b.h, b.hv, x, amp, w);
    };

    const getBusyText = () => {
      const pct = Math.min(100, Math.round((100 * b.released) / 5));
      if (busyLabel) return `${busyLabel} ${pct}%`;
      if (isAr) return `جاري التصدير ${pct}%`;
      if (isFr) return `EXPORTATION ${pct}%`;
      return `EXPORTING ${pct}%`;
    };

    const render = () => {
      if (!rootGroupRef.current || !bodyRef.current || !cliprRef.current || !liqRef.current || !lqcpRef.current || !airRef.current) {
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

      // Airborne droplets & neck bridges above the button
      let air = '';
      const nr = 12 * clamp(b.nz.x, 0, 1.3);
      for (let i = 0; i < b.ex.length; i++) {
        const dr = b.ex[i];
        const eVal = clamp(dr.e.x, -0.35, 0.35);
        const ry = dr.r * (1 + eVal);
        const rx = (dr.r * dr.r) / ry;
        air += el(dr.x, dr.y, rx, ry);
        if (dr.st === 'form') {
          air += metaball(nr, dr.r, [b.nzx, -1], [dr.x, dr.y], 2.4, 0.5);
        }
      }
      if (nr > 0.6) air += el(b.nzx, -1, nr, nr);
      airRef.current.setAttribute('d', air || 'M0 0');

      // Sliding labels
      if (l0Ref.current && l1Ref.current && l2Ref.current) {
        l0Ref.current.setAttribute('transform', `translate(0 ${f(b.lab[0].x * 46)})`);
        l0Ref.current.setAttribute('opacity', f(clamp(1 - Math.abs(b.lab[0].x) * 1.3, 0, 1)));
        l1Ref.current.setAttribute('transform', `translate(0 ${f(b.lab[1].x * 46)})`);
        l1Ref.current.setAttribute('opacity', f(clamp(1 - Math.abs(b.lab[1].x) * 1.3, 0, 1)));
        l2Ref.current.setAttribute('transform', `translate(0 ${f(b.lab[2].x * 46)})`);
        l2Ref.current.setAttribute('opacity', f(clamp(1 - Math.abs(b.lab[2].x) * 1.3, 0, 1)));
      }

      // Atrium 4-Cube Insignia Mark & Ring
      const cs = CS * b.cs.x;
      let m = '';
      for (let j = 0; j < 4; j++) {
        const cx = IX + HOME[j][0] + CS / 2 + b.cx[j].x;
        const cy = IY + HOME[j][1] + CS / 2 + b.cy[j].x;
        m += rr(cx - cs / 2, cy - cs / 2, cs, cs, CR * b.cs.x);
      }
      const rs = Math.max(0, b.ring.x);
      if (rs > 0.03) {
        const c = IX + IC / 2;
        const c2 = IY + IC / 2;
        const o = (RO * rs) / 2;
        const i = (RI * rs) / 2;
        m += rr(c - o, c2 - o, o * 2, o * 2, ROR * rs);
        m += `M${f(c - i)} ${f(c2 - i)}h${f(i * 2)}v${f(i * 2)}h${f(-i * 2)}Z`;
      }
      if (markRef.current) markRef.current.setAttribute('d', m);

      // Checkmark trail
      if (chkRef.current) {
        const p = b.pen;
        if (p.on && b.trail.length > 0) {
          const tr = b.trail;
          const last = tr[tr.length - 1];
          if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.45) {
            tr.push([p.x, p.y]);
          }
          let cPath = `M${f(IX + tr[0][0])} ${f(IY + tr[0][1])}`;
          for (let nIdx = 1; nIdx < tr.length; nIdx++) {
            cPath += `L${f(IX + tr[nIdx][0])} ${f(IY + tr[nIdx][1])}`;
          }
          cPath += `L${f(IX + p.x)} ${f(IY + p.y)}`;
          chkRef.current.setAttribute('d', cPath);
          const s = Math.max(0, b.chk.x);
          const cc = IX + IC / 2;
          const c3 = IY + IC / 2;
          chkRef.current.setAttribute(
            'transform',
            `translate(${f(cc)} ${f(c3)}) scale(${f(s)}) translate(${f(-cc)} ${f(-c3)})`
          );
        } else {
          chkRef.current.setAttribute('d', 'M0 0');
        }
      }

      // Live percentage update
      const bt = getBusyText();
      if (bt !== b.lastBusyText) {
        b.lastBusyText = bt;
        if (t1Ref.current) t1Ref.current.textContent = bt;
      }
    };

    const step = (dt: number) => {
      b.t += dt;
      const busy = b.state === 'busy';

      b.bx.t = b.hover ? clamp((b.px - W / 2) * 0.05, -8, 8) : 0;
      b.by.t = (b.hover ? clamp((b.py - H / 2) * 0.1, -4, 4) : 0) + (b.press ? 2 : 0);
      b.sx.t = b.press ? 1.03 : 1;
      b.sy.t = b.press ? 0.945 : 1;
      b.rad.t = (busy ? 18 : R0) + (b.hover && b.state === 'idle' ? 3 : 0);
      b.cs.t = b.press ? 0.86 : 1;

      if (b.state === 'idle') {
        b.noise -= dt;
        if (b.noise <= 0) {
          b.noise = rnd(0.8, 2.4);
          const j = (Math.random() * 4) | 0;
          b.cx[j].v += rnd(-16, 16);
          b.cy[j].v += rnd(-16, 16);
          b.ring.v += rnd(-0.5, 0.5);
          poke(rnd(W * 0.25, W * 0.75), rnd(-15, 15), 3);
        }
      }

      // Snappy 5-droplet pinch-off cycle (~1.2s total)
      if (b.state === 'busy') {
        const k = b.exStarted;
        if (k < 5 && b.t > 0.12 + k * 0.24 && !b.ex.some((d) => d.st === 'form')) {
          const x = rnd(W * 0.32, W * 0.76);
          b.ex.push({
            st: 'form',
            x,
            y: -3,
            vy: 0,
            r: rnd(7.5, 9.5),
            ft: 0,
            e: spr(0, 1100, 0.1),
            k,
          });
          b.nzx = x;
          b.nz.t = 1;
          b.exStarted++;
          poke(x, 160, 3);
        }

        if (b.released >= 5 && b.t - b.lastEv > 0.28) {
          b.state = 'done';
          b.t = 0;
          b.ring.t = 0;
          b.level.t = 0.35; // Settle back to resting 35% waterline
          b.pen.x = PW[0][0];
          b.pen.y = PW[0][1];
          b.pen.vx = 0;
          b.pen.vy = 0;
          b.pen.wp = 1;
          b.pen.on = true;
          b.trail = [[b.pen.x, b.pen.y]];
          b.chk.x = 1;
          b.chk.v = 0;
          b.chk.t = 1;
          for (let j = 0; j < 4; j++) {
            b.cx[j].t = -DIR[j][0] * 2.2;
            b.cy[j].t = -DIR[j][1] * 2.2;
          }
          setAnnouncement(doneText);

          // Execute download callback at completion
          if (!b.hasExportExecuted && onExportRef.current) {
            b.hasExportExecuted = true;
            try {
              onExportRef.current();
            } catch (err) {
              console.error('Export execution error:', err);
            }
          }
        }
      }

      // Step droplets
      for (let idx = b.ex.length - 1; idx >= 0; idx--) {
        const d = b.ex[idx];
        stepS(d.e, dt);
        if (d.st === 'form') {
          d.ft += dt;
          const fp = 3200 * clamp(d.ft / 0.18, 0, 1);
          const a = -fp - 80 * (d.y + 5) - 10 * d.vy;
          d.vy += a * dt;
          d.y += d.vy * dt;
          if (d.y < -34) {
            d.st = 'free';
            d.vy -= 180;
            d.e.v = (Math.random() < 0.5 ? -1 : 1) * 15;
            b.nz.t = 0;
            b.released++;
            b.lastEv = b.t;

            // Recoil kick downwards
            b.by.v += 150;
            b.sy.v -= 0.9;
            b.sx.v += 0.4;
            b.level.t = Math.max(0.35, 1 - (b.released / 5) * 0.65);
            poke(d.x, -200, 3);
            for (let j = 0; j < 4; j++) {
              b.cx[j].v += DIR[j][0] * 170;
              b.cy[j].v += DIR[j][1] * 170;
            }
            b.ring.v += 2.6;
          }
        } else {
          d.vy += 320 * dt;
          d.y += d.vy * dt;
          if (d.y < -120) b.ex.splice(idx, 1);
        }
      }

      // Reset to idle after 1.4s done hold
      if (b.state === 'done' && b.t > 1.4) {
        b.state = 'idle';
        b.t = 0;
        b.level.t = 0.35;
        b.nz.t = 0;
        b.ring.t = 1;
        b.chk.t = 0;
        b.hasExportExecuted = false;
        setAnnouncement('');
      }

      // Label positions
      const L = b.state === 'idle' ? 0 : b.state === 'busy' ? 1 : 2;
      for (let j = 0; j < 3; j++) {
        b.lab[j].t = j === L ? 0 : j < L ? -1 : 1;
        stepS(b.lab[j], dt);
      }

      // Springs integration
      stepS(b.bx, dt);
      stepS(b.by, dt);
      stepS(b.sx, dt);
      stepS(b.sy, dt);
      stepS(b.rad, dt);
      stepS(b.level, dt);
      stepS(b.cs, dt);
      stepS(b.ring, dt);
      stepS(b.chk, dt);
      stepS(b.nz, dt);
      for (let j = 0; j < 4; j++) {
        stepS(b.cx[j], dt);
        stepS(b.cy[j], dt);
      }

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

      // Pen with mass
      const p = b.pen;
      if (p.on) {
        const tg = PW[Math.min(p.wp, PW.length - 1)];
        const dx = tg[0] - p.x;
        const dy = tg[1] - p.y;
        p.vx += (860 * dx - 40 * p.vx) * dt;
        p.vy += (860 * dy - 40 * p.vy) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.wp < PW.length - 1 && Math.hypot(dx, dy) < 5.5) p.wp++;
      }
      if (b.state === 'idle' && b.chk.x < 0.03 && p.on) {
        p.on = false;
        b.trail = [];
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
        b.ex.length === 0 &&
        Math.abs(b.bx.x) < 0.02 &&
        Math.abs(b.by.x) < 0.02 &&
        Math.abs(b.sx.x - 1) < 0.01 &&
        Math.abs(b.sy.x - 1) < 0.01 &&
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
        b.ex = [];
        b.exStarted = 0;
        b.released = 0;
        b.lastEv = 0;
        b.level.t = 1;
        b.hasExportExecuted = false;
        setAnnouncement('Exporting...');
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
  }, [disabled, doneText, busyLabel, isAr, isFr]);

  return (
    <div
      className={`relative inline-block select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{
        width: `${containerW}px`,
        height: `${containerH}px`,
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Normalized 0 0 300 72 viewBox: Button occupies 100% of container height without artificial vertical shrinkage */}
      <svg
        viewBox="0 0 300 72"
        width="100%"
        height="100%"
        aria-hidden="true"
        className="pointer-events-none block overflow-visible"
        style={{
          transformOrigin: 'center center',
        }}
      >
        <defs>
          <clipPath id={`ex-clip-${instanceId}`}>
            <rect ref={cliprRef} x="0" y="0" width={W} height={H} rx={R0} />
          </clipPath>
          <clipPath id={`ex-lqc-${instanceId}`}>
            <path ref={lqcpRef} d="M0 0" />
          </clipPath>
        </defs>

        <g ref={rootGroupRef}>
          {/* Main Button Body Shell in Signature Terracotta Orange */}
          <rect
            ref={bodyRef}
            x="0"
            y="0"
            width={W}
            height={H}
            rx={R0}
            style={{ fill: bodyFill }}
          />

          {/* Liquid Wave inside Body */}
          <g clipPath={`url(#ex-clip-${instanceId})`}>
            <path ref={liqRef} d="M0 0" style={{ fill: liqFill }} />
          </g>

          {/* Airborne Droplets & Necks above the button (overflows visible above the top rim) */}
          <path ref={airRef} d="M0 0" style={{ fill: liqFill }} />

          {/* Layer 1 (on Body Fill) */}
          <g clipPath={`url(#ex-clip-${instanceId})`} style={{ fill: t1Color, stroke: strokeColor }}>
            <g id={`ex-ct-${instanceId}`}>
              <path ref={markRef} fillRule="evenodd" stroke="none" d="M0 0" />
              <path
                ref={chkRef}
                fill="none"
                strokeWidth={scale < 0.7 ? 4.2 : 5.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M0 0"
              />
              <g ref={l0Ref}>
                <text
                  ref={t0Ref}
                  x={isAr ? W - 92 : 92}
                  y="46"
                  stroke="none"
                  textAnchor={isAr ? 'end' : 'start'}
                  fontFamily={isAr ? "'Cairo', sans-serif" : "'Barlow Condensed', sans-serif"}
                  fontWeight="600"
                  fontSize="28"
                  letterSpacing={isAr ? '0.5' : '1.8'}
                >
                  {idleText}
                </text>
              </g>
              <g ref={l1Ref} opacity="0">
                <text
                  ref={t1Ref}
                  x={isAr ? W - 92 : 92}
                  y="46"
                  stroke="none"
                  textAnchor={isAr ? 'end' : 'start'}
                  fontFamily={isAr ? "'Cairo', sans-serif" : "'Barlow Condensed', sans-serif"}
                  fontWeight="600"
                  fontSize="28"
                  letterSpacing={isAr ? '0.5' : '1.8'}
                >
                  {isAr ? 'جاري التصدير 0%' : isFr ? 'EXPORTATION 0%' : 'EXPORTING 0%'}
                </text>
              </g>
              <g ref={l2Ref} opacity="0">
                <text
                  ref={t2Ref}
                  x={isAr ? W - 92 : 92}
                  y="46"
                  stroke="none"
                  textAnchor={isAr ? 'end' : 'start'}
                  fontFamily={isAr ? "'Cairo', sans-serif" : "'Barlow Condensed', sans-serif"}
                  fontWeight="600"
                  fontSize="28"
                  letterSpacing={isAr ? '0.5' : '1.8'}
                >
                  {doneText}
                </text>
              </g>
            </g>
          </g>

          {/* Layer 2 (Clipped to Liquid Wave with Inverted Terracotta Color) */}
          <g clipPath={`url(#ex-clip-${instanceId})`}>
            <g clipPath={`url(#ex-lqc-${instanceId})`} style={{ fill: t2Color, stroke: strokeLiqColor }}>
              <use href={`#ex-ct-${instanceId}`} />
            </g>
          </g>
        </g>
      </svg>

      {/* Accessible Interactive Hit Overlay — Locked to EXACT container boundaries */}
      <button
        ref={hitBtnRef}
        type="button"
        id={customId || `btn-${instanceId}`}
        aria-label={ariaLabelProp || idleText}
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
