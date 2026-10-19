import React, { useEffect, useRef, useState } from 'react';

export interface AtriumMonolithProps {
  isIntroActive: boolean;
  anchorCoords?: { left: number; top: number } | null;
  onCardArrivalStart?: () => void;
  onIntroComplete?: () => void;
  onSkip?: () => void;
  replayKey?: number;
}

/**
 * Authentic 5-Cubes Architectural Logo (Quincunx layout: 4 Corner Cubes + 1 Central Cube)
 * - Corner cubes are bigger and positioned closer to the central cube.
 * - The central cube is larger and blank from the inside (hollow open frame).
 */
export const FiveCubesLogo: React.FC<{
  size?: number;
  cubeColor?: string;
  className?: string;
}> = ({ size, cubeColor = '#000000', className = '' }) => {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={`shrink-0 ${
        size ? '' : 'w-16 h-16 sm:w-22 sm:h-22 md:w-26 md:h-26'
      } ${className}`}
      aria-label="Atrium 5 Cubes Logo"
    >
      {/* Top-Left Cube (Solid, Bigger, Closer to center) */}
      <rect x="2" y="2" width="26" height="26" rx="6.5" fill={cubeColor} />

      {/* Top-Right Cube (Solid, Bigger, Closer to center) */}
      <rect x="72" y="2" width="26" height="26" rx="6.5" fill={cubeColor} />

      {/* Central Cube (Noticeably Bigger, Blank/Hollow from the Inside) */}
      <rect
        x="28.5"
        y="28.5"
        width="43"
        height="43"
        rx="9.5"
        fill="none"
        stroke={cubeColor}
        strokeWidth="6.5"
      />

      {/* Bottom-Left Cube (Solid, Bigger, Closer to center) */}
      <rect x="2" y="72" width="26" height="26" rx="6.5" fill={cubeColor} />

      {/* Bottom-Right Cube (Solid, Bigger, Closer to center) */}
      <rect x="72" y="72" width="26" height="26" rx="6.5" fill={cubeColor} />
    </svg>
  );
};

/**
 * Stage 1: 'Quincunx Convergence' 5-Cube Architectural Assembly Prelude
 * - Clean Pure White Canvas (#FFFFFF)
 * - 4 Solid Corner Cubes glide along diagonal trajectory axes to converge into Quincunx
 * - 1 Central Larger Hollow Cube unfolds and locks with Swiss coordinate crosshairs
 * - Duration: 1.2s (Fast, Crisp, High-precision)
 * - Zero Text / Pure Geometry
 */
export const QuincunxConvergencePrelude: React.FC<{ isPortalActive?: boolean; className?: string }> = ({
  isPortalActive = false,
  className = '',
}) => {
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none bg-white ${className}`}>
      {/* Subtle modern architectural dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#D3542E 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Central Geometry Canvas */}
      <div className="relative z-10 flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
        <svg
          viewBox="-50 -50 200 200"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minimal Swiss Modernist Coordinate Grid & Diagonal Trajectory Axes */}
          <g
            style={{
              animation: 'modern-swiss-grid-fade 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            {/* Center Hairline Axes */}
            <line x1="-40" y1="50" x2="140" y2="50" stroke="#D3542E" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.22" />
            <line x1="50" y1="-40" x2="50" y2="140" stroke="#D3542E" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.22" />

            {/* Diagonal Assembly Trajectory Axes */}
            <line x1="-30" y1="-30" x2="130" y2="130" stroke="#D3542E" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.18" />
            <line x1="130" y1="-30" x2="-30" y2="130" stroke="#D3542E" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.18" />

            {/* Corner Registration Crosshair Ticks (+) in Terracotta */}
            <path d="M -20 15 L -10 15 M -15 10 L -15 20" stroke="#D3542E" strokeWidth="1.2" opacity="0.38" />
            <path d="M 110 15 L 120 15 M 115 10 L 115 20" stroke="#D3542E" strokeWidth="1.2" opacity="0.38" />
            <path d="M -20 85 L -10 85 M -15 80 L -15 90" stroke="#D3542E" strokeWidth="1.2" opacity="0.38" />
            <path d="M 110 85 L 120 85 M 115 80 L 115 90" stroke="#D3542E" strokeWidth="1.2" opacity="0.38" />

            {/* Outer Alignment Perimeter */}
            <rect x="-2" y="-2" width="104" height="104" rx="12" stroke="#D3542E" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.22" />
          </g>

          {/* Minimal Terracotta Pulse Ring at Quincunx Convergence Lock */}
          <rect
            x="24"
            y="24"
            width="52"
            height="52"
            rx="12"
            fill="none"
            stroke="#D3542E"
            strokeWidth="2"
            style={{
              transformOrigin: '50px 50px',
              animation: 'quincunx-pulse-ring 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          />

          {/* THE 5 QUINCUNX CONVERGENCE CUBES */}
          {/* Top-Left Cube: Glides along diagonal axis to Quincunx lock */}
          <g
            style={{
              transformOrigin: '15px 15px',
              animation: 'quincunx-cube-tl 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <rect
              x="2"
              y="2"
              width="26"
              height="26"
              rx="6.5"
              fill="#D3542E"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(211, 84, 46, 0.22))',
              }}
            />
          </g>

          {/* Top-Right Cube: Glides along diagonal axis to Quincunx lock */}
          <g
            style={{
              transformOrigin: '85px 15px',
              animation: 'quincunx-cube-tr 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <rect
              x="72"
              y="2"
              width="26"
              height="26"
              rx="6.5"
              fill="#D3542E"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(211, 84, 46, 0.22))',
              }}
            />
          </g>

          {/* Bottom-Left Cube: Glides along diagonal axis to Quincunx lock */}
          <g
            style={{
              transformOrigin: '15px 85px',
              animation: 'quincunx-cube-bl 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <rect
              x="2"
              y="72"
              width="26"
              height="26"
              rx="6.5"
              fill="#D3542E"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(211, 84, 46, 0.22))',
              }}
            />
          </g>

          {/* Bottom-Right Cube: Glides along diagonal axis to Quincunx lock */}
          <g
            style={{
              transformOrigin: '85px 85px',
              animation: 'quincunx-cube-br 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <rect
              x="72"
              y="72"
              width="26"
              height="26"
              rx="6.5"
              fill="#D3542E"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(211, 84, 46, 0.22))',
              }}
            />
          </g>

          {/* Central Larger Hollow Cube: Elastic unfolding and lock */}
          <g
            style={{
              transformOrigin: '50px 50px',
              animation: 'quincunx-center-hollow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <rect
              x="28.5"
              y="28.5"
              width="43"
              height="43"
              rx="9.5"
              fill="none"
              stroke="#D3542E"
              strokeWidth="6.5"
              style={{
                filter: 'drop-shadow(0 4px 14px rgba(211, 84, 46, 0.25))',
              }}
            />
          </g>
        </svg>
      </div>

      {/* STAGE 2: DEDICATED CINEMATIC PORTAL WIPE OVERLAY (White -> Terracotta) */}
      {/* Originates from converged central cube at 1.2s to flood viewport into signature terracotta */}
      {isPortalActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
          {/* Secondary Concentric Shockwave Ring */}
          <div
            className="absolute w-44 h-44 rounded-[44px] border-2 border-[#D3542E]"
            style={{
              animation: 'cool-portal-ring 0.65s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          />

          {/* Full-Screen Terracotta Rounded Diamond Portal Monolith */}
          <div
            className="w-32 h-32 bg-[#D3542E] shadow-2xl"
            style={{
              animation: 'cool-terracotta-portal-wipe 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
            }}
          />
        </div>
      )}
    </div>
  );
};

export const AtriumMonolith: React.FC<AtriumMonolithProps> = ({
  isIntroActive,
  anchorCoords,
  onCardArrivalStart,
  onIntroComplete,
  onSkip,
  replayKey = 0,
}) => {
  const lockupRef = useRef<HTMLDivElement>(null);
  // Master Unified 6-Stage Sequential Intro Architecture:
  // (1) 0.0s – 1.2s: 'quincunx' -> Fast 1.2s 'Quincunx Convergence' geometric prelude on pure white background.
  // (2) 1.2s – 1.85s: 'portal' -> Dedicated cinematic portal wipe flooding screen into terracotta (#D3542E).
  // (3) 1.85s – 3.85s: 'wave' -> 'Atrium' kinetic loop (sweeps across with light, expands to un-shrunk normal size).
  // (4) 3.85s – 4.75s: 'revelation' -> 5-cubes logo docks beside normal-size ATRIUM at screen center.
  // (5) 4.75s – 5.65s: 'glide' -> Continuity glide! Logo + ATRIUM glides to the right, loading onboarding card on the left.
  // (6) >= 5.65s: 'settled' -> Intro complete, background becomes transparent, brand lockup settled in place on the right.
  const [phase, setPhase] = useState<'quincunx' | 'portal' | 'wave' | 'revelation' | 'glide' | 'settled'>('quincunx');
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [glideTransform, setGlideTransform] = useState<string | null>(null);

  // When glide starts, measure current centered rect and compute exact pixel translation to anchorCoords
  useEffect(() => {
    if (phase === 'glide' && lockupRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024 && anchorCoords) {
        const rect = lockupRef.current.getBoundingClientRect();
        const deltaX = anchorCoords.left - rect.left;
        const deltaY = anchorCoords.top - rect.top;
        setGlideTransform(`translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0) scale(0.42)`);
      } else {
        setGlideTransform('translate3d(0, -36vh, 0) scale(0.55)');
      }
    } else if (phase === 'quincunx' || phase === 'portal' || phase === 'wave' || phase === 'revelation') {
      setGlideTransform(null);
    }
  }, [phase, anchorCoords]);

  const resetLettersToNormal = () => {
    letterRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transform = 'scaleX(1) scaleY(1)';
      el.style.opacity = '1';
      el.style.color = '#000000';
      el.style.textShadow = 'none';
      el.style.filter = 'none';
    });
  };

  const handleSkip = () => {
    resetLettersToNormal();
    setPhase('settled');
    onCardArrivalStart?.();
    onIntroComplete?.();
    onSkip?.();
  };

  // Keyboard shortcut (Escape to skip intro)
  useEffect(() => {
    if (!isIntroActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIntroActive]);

  useEffect(() => {
    if (!isIntroActive) {
      setPhase('settled');
      resetLettersToNormal();
      return;
    }

    // (1) Start immediately with Quincunx Convergence on white
    setPhase('quincunx');

    // (2) 1.2s: Dedicated cinematic portal wipe into terracotta background
    const tPortal = setTimeout(() => {
      setPhase('portal');
    }, 1200);

    // (3) 1.85s: 'Atrium' kinetic sweep begins on terracotta
    const tWave = setTimeout(() => {
      setPhase('wave');
    }, 1850);

    // (4) 3.85s: 5-cubes logo docks beside ATRIUM at center
    const tRevelation = setTimeout(() => {
      setPhase('revelation');
    }, 3850);

    // (5) 4.75s: Continuity glide! Logo + ATRIUM glides to the right, card arrives on left
    const tGlide = setTimeout(() => {
      setPhase('glide');
      onCardArrivalStart?.();
    }, 4750);

    // (6) 5.65s: Transition completely settles
    const tComplete = setTimeout(() => {
      setPhase('settled');
      onIntroComplete?.();
    }, 5650);

    return () => {
      clearTimeout(tPortal);
      clearTimeout(tWave);
      clearTimeout(tRevelation);
      clearTimeout(tGlide);
      clearTimeout(tComplete);
    };
  }, [isIntroActive, replayKey, onCardArrivalStart, onIntroComplete]);

  // Real-time animation loop for Stage 2 (Kinetic Typography Wave):
  // - HAPPENS ONCE ONLY: Enters from the left, sweeps slowly and gracefully across A-T-R-I-U-M, and exits to the right.
  // - Background is Terracotta (#D3542E).
  // - Letters outside the beam are shrunk (scaleX: 0.32) during the sweep.
  // - Letters touched by the beam illuminate in glowing radiant white (#FFFFFF) & stretch horizontally (scaleX up to 2.25).
  // - AT THE END OF THE LOOP EFFECT: Letters smoothly expand back to NORMAL SIZE (scaleX: 1.0) and normal spacing,
  //   so the text appears in its normal size right when the loop finishes, perfectly ready for the logo to enter next to it!
  const baseWidthsRef = useRef<number[] | null>(null);

  useEffect(() => {
    if (!isIntroActive || phase !== 'wave') return;

    let animId: number;
    const startTime = performance.now();
    const sweepDuration = 2000; // 2.0s smooth single pass across ATRIUM

    const measureBaseWidths = () => {
      const measured = letterRefs.current.map((el) => (el ? el.offsetWidth : 0));
      if (measured.length === 6 && measured.every((w) => w > 10)) {
        return measured;
      }
      // Accurate proportional widths for ATRIUM (Inter Black font)
      const h = letterRefs.current[0]?.offsetHeight || 120;
      return [0.82 * h, 0.72 * h, 0.78 * h, 0.32 * h, 0.78 * h, 0.98 * h];
    };

    const handleResize = () => {
      baseWidthsRef.current = null;
    };
    window.addEventListener('resize', handleResize);

    const frame = (now: number) => {
      if (!baseWidthsRef.current || baseWidthsRef.current.some((w) => w === 0)) {
        baseWidthsRef.current = measureBaseWidths();
      }
      const baseWidths = baseWidthsRef.current;

      const elapsed = now - startTime;
      // Single pass progress: 0.0 to 1.0 (NO modulo % looping - happens once only)
      const rawProgress = Math.min(1, Math.max(0, elapsed / sweepDuration));

      // Cinematic easeInOut curve for single sweep
      const easeProgress =
        rawProgress < 0.5
          ? 2 * rawProgress * rawProgress
          : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      // Beam center sweeps from off-left (-1.4) to off-right (7.2)
      const beamCenter = -1.4 + easeProgress * 8.6;

      // As the loop effect finishes (rawProgress 0.68 -> 0.95), letters smoothly expand from shrunk back to NORMAL SIZE!
      const normProgress = Math.max(0, Math.min(1, (rawProgress - 0.68) / 0.27));
      const easeNorm =
        normProgress < 0.5
          ? 2 * normProgress * normProgress
          : 1 - Math.pow(-2 * normProgress + 2, 2) / 2;

      // Base scale: smoothly transitions from shrunk (0.32) to full normal size (1.0)!
      const currentBaseScale = 0.32 + easeNorm * (1.0 - 0.32);

      // Minimum gap smoothly opens up to normal tracking (0.5px -> 3.5px)
      const currentMinGap = 0.5 + easeNorm * 3.0;
      const extraGap = 10.0 * (1 - easeNorm);

      // 1. Calculate intensity and scaleX for all 6 letters
      const intensities: number[] = new Array(6);
      const scaleXs: number[] = new Array(6);
      const visualWidths: number[] = new Array(6);

      for (let i = 0; i < 6; i++) {
        const dist = Math.abs(i - beamCenter);
        const rawIntensity = Math.max(0, Math.min(1, (1.3 - dist) / 0.8));
        const intensity = rawIntensity * rawIntensity * (3 - 2 * rawIntensity);
        intensities[i] = intensity;

        // Letters touched by beam grow up to 2.25; outside letters follow currentBaseScale (0.32 -> 1.0)
        const scaleX = currentBaseScale + intensity * (2.25 - currentBaseScale);
        scaleXs[i] = scaleX;
        visualWidths[i] = baseWidths[i] * scaleX;
      }

      // 2. Dynamic gaps between letters
      const gaps: number[] = new Array(5);
      for (let i = 0; i < 5; i++) {
        gaps[i] = currentMinGap + Math.max(intensities[i], intensities[i + 1]) * extraGap;
      }

      // 3. Compute dynamic target visual centers
      const targetCenters: number[] = new Array(6);
      targetCenters[0] = visualWidths[0] / 2;
      for (let i = 1; i < 6; i++) {
        targetCenters[i] =
          targetCenters[i - 1] + visualWidths[i - 1] / 2 + gaps[i - 1] + visualWidths[i] / 2;
      }
      const totalVisualWidth = targetCenters[5] + visualWidths[5] / 2;
      const visualCenterOffset = totalVisualWidth / 2;

      // 4. Compute unscaled base centers in container (gap-0)
      const baseCenters: number[] = new Array(6);
      baseCenters[0] = baseWidths[0] / 2;
      for (let i = 1; i < 6; i++) {
        baseCenters[i] = baseCenters[i - 1] + baseWidths[i - 1] / 2 + baseWidths[i] / 2;
      }
      const totalBaseWidth = baseCenters[5] + baseWidths[5] / 2;
      const baseCenterOffset = totalBaseWidth / 2;

      // 5. Apply translate3d + scaleX to position each letter perfectly
      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const targetX = targetCenters[i] - visualCenterOffset;
        const baseX = baseCenters[i] - baseCenterOffset;
        const translateX = targetX - baseX;
        const intensity = intensities[i];

        el.style.transform = `translate3d(${translateX.toFixed(2)}px, 0, 0) scaleX(${scaleXs[i].toFixed(3)}) scaleY(1)`;
        el.style.opacity = '1';

        if (intensity > 0.12) {
          // Touched: Illuminated with radiant glowing white light & soft bloom
          el.style.color = intensity > 0.4 ? '#FFFFFF' : '#FFF0EA';
          el.style.textShadow = `0 0 ${(intensity * 32).toFixed(1)}px rgba(255, 255, 255, 0.98), 0 0 ${(intensity * 56).toFixed(1)}px rgba(255, 225, 195, 0.85)`;
          el.style.filter = `drop-shadow(0 0 ${(intensity * 20).toFixed(1)}px rgba(255, 255, 255, 0.95))`;
        } else {
          // Untouched / outside loop: SOLID DEEP BLACK, NO GRAY, SHRUNK & STICKING TO NEIGHBORS
          el.style.color = '#000000';
          el.style.textShadow = 'none';
          el.style.filter = 'none';
        }
      });

      if (rawProgress < 1) {
        animId = requestAnimationFrame(frame);
      }
    };

    // Run first frame immediately
    frame(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isIntroActive, phase, replayKey]);

  const letters = ['A', 'T', 'R', 'I', 'U', 'M'];

  return (
    <div
      key={replayKey}
      className={`fixed inset-0 z-30 pointer-events-none select-none flex items-center justify-center transition-colors duration-300 ${
        phase === 'quincunx'
          ? 'bg-white'
          : phase === 'portal' || phase === 'wave' || phase === 'revelation'
          ? 'bg-[#D3542E]'
          : 'bg-transparent'
      }`}
    >
      {/* STAGE (1) & (2): 1.2s 'QUINCUNX CONVERGENCE' ON WHITE CANVAS + EXPANDING PORTAL WIPE TO TERRACOTTA */}
      {(phase === 'quincunx' || phase === 'portal') && (
        <div className="w-full h-full flex flex-col items-center justify-center text-center">
          <QuincunxConvergencePrelude isPortalActive={phase === 'portal'} />
        </div>
      )}

      {/* STAGES (2, 3, 4, 5): 'ATRIUM' KINETIC SWEEP, LOGO DOCKING, AND SEAMLESS CONTINUITY GLIDE */}
      {(phase === 'wave' || phase === 'revelation' || phase === 'glide' || phase === 'settled') && (
        <div
          ref={lockupRef}
          className={`flex items-center justify-start gap-4 sm:gap-7 select-none transition-opacity duration-300 ${
            phase === 'settled' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            transform: glideTransform ?? 'translate3d(0, 0, 0) scale(1)',
            transformOrigin: 'left top',
            transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          }}
        >
          {/* Authentic 5-Cubes Logo in Solid Black: Enters beside text and glides with it to the right */}
          <div
            className={`shrink-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              phase === 'revelation' || phase === 'glide' || phase === 'settled'
                ? 'opacity-100 translate-x-0 scale-100 max-w-[140px] pointer-events-auto'
                : 'opacity-0 -translate-x-12 scale-75 max-w-0 pointer-events-none overflow-hidden -mr-4 sm:-mr-7'
            }`}
          >
            <FiveCubesLogo
              cubeColor="#000000"
              className="w-16 h-16 sm:w-22 sm:h-22 md:w-26 md:h-26"
            />
          </div>

          {/* ATRIUM Text: Stays continuously mounted with zero disconnect! */}
          <div className="flex items-center justify-center gap-0 select-none overflow-visible leading-none">
            {letters.map((char, index) => (
              <span
                key={char + index}
                ref={(el) => {
                  letterRefs.current[index] = el;
                }}
                className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-black inline-flex items-center justify-center select-none transform-gpu origin-center will-change-transform leading-none"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  // Initial state: letters start shrunk (scaleX: 0.32), expand to un-shrunk normal size (1.0) at loop end
                  transform: phase === 'wave' ? 'scaleX(0.32) scaleY(1)' : 'scaleX(1) scaleY(1)',
                  opacity: 1,
                  color: '#000000',
                  lineHeight: 1,
                  textShadow: 'none',
                  filter: 'none',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skip Intro Button */}
      {onSkip && phase !== 'glide' && phase !== 'settled' && (
        <div className="absolute bottom-6 right-6 pointer-events-auto z-40 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs flex items-center gap-2 py-1.5 px-3.5 rounded-full border border-black/20 backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-sm font-semibold text-black hover:text-white bg-black/10 hover:bg-black/30"
          >
            <span>Skip Intro</span>
            <span className="text-[10px] opacity-60">ESC</span>
          </button>
        </div>
      )}
    </div>
  );
};
