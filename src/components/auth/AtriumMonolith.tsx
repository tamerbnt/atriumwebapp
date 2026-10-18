import React, { useEffect, useRef, useState } from 'react';

export interface AtriumMonolithProps {
  isIntroActive: boolean;
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

export const AtriumMonolith: React.FC<AtriumMonolithProps> = ({
  isIntroActive,
  onCardArrivalStart,
  onIntroComplete,
  onSkip,
  replayKey = 0,
}) => {
  // Motion Timeline:
  // 1. 0.0s – 1.8s: 'wave' -> Kinetic letter loop sweeps across ATRIUM.
  //    - Letters untouched by light are SOLID OPAQUE BLACK (#000000, opacity 1, zero gray).
  //    - Letters touched by light turn glowing white and stretch strictly horizontally (LEFT & RIGHT ONLY on X-axis, scaleX up to 2.20),
  //      while maintaining the exact same height as non-looped letters (scaleY = 1 locked, zero translateY).
  // 2. 1.8s – 2.35s: 'logo' -> After the letters loop finishes, the 5 Cubes Logo glides in FROM THE RIGHT to the needed place (NO CONTAINER BOX).
  // 3. 2.35s – 3.3s: 'lockup' -> THEN the ATRIUM text enters LETTER BY LETTER next to the logo.
  // 4. 3.3s – 3.7s: 'fadeout' -> Smooth fadeout, onboarding card begins its smooth arrival.
  // 5. 3.7s+: unmounted completely (returns null, nothing stays on background).
  const [phase, setPhase] = useState<'wave' | 'logo' | 'lockup' | 'fadeout'>('wave');
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Keyboard shortcut (Escape to skip intro)
  useEffect(() => {
    if (!isIntroActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onSkip) {
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIntroActive, onSkip]);

  useEffect(() => {
    if (!isIntroActive) return;

    setPhase('wave');

    // 1.8s: Letters loop ends -> The 5 Cubes Logo arrives FROM THE RIGHT into its needed place
    const tLogo = setTimeout(() => {
      setPhase('logo');
    }, 1800);

    // 2.35s: Logo is now in place -> ATRIUM text enters LETTER BY LETTER
    const tLockup = setTimeout(() => {
      setPhase('lockup');
    }, 2350);

    // 3.3s: Smooth fadeout starts, card begins smooth arrival
    const tFadeout = setTimeout(() => {
      setPhase('fadeout');
      onCardArrivalStart?.();
    }, 3300);

    // 3.7s: Intro sequence completely completes
    const tComplete = setTimeout(() => {
      onIntroComplete?.();
    }, 3700);

    return () => {
      clearTimeout(tLogo);
      clearTimeout(tLockup);
      clearTimeout(tFadeout);
      clearTimeout(tComplete);
    };
  }, [isIntroActive, replayKey, onCardArrivalStart, onIntroComplete]);

  // Real-time animation loop for Stage 1 (Kinetic Typography Wave):
  // - Sweeps side-to-side across ATRIUM letters
  // - Touches exactly two letters at a time with luminous white light
  // - All untouched letters are 100% SOLID BLACK (#000000, opacity 1, zero gray)
  // - STRICT X-AXIS ONLY: scales purely left and right (scaleX 0.72 -> 2.20 in an exaggerated way)
  // - STRICT SAME HEIGHT: scaleY is strictly 1.0, zero translateY, identical height to non-looped letters
  useEffect(() => {
    if (!isIntroActive || phase !== 'wave') return;

    let animId: number;
    const startTime = performance.now();
    const cycleDuration = 1250; // 1.25s full ping-pong period

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      // Ping-pong between letters A & T (0.5) and U & M (4.5)
      const waveNorm = 0.5 - 0.5 * Math.cos(progress * 2 * Math.PI);
      const beamCenter = 0.5 + waveNorm * 4.0;

      // Effective beam touch radius = 1.25
      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(i - beamCenter);
        const rawIntensity = Math.max(0, Math.min(1, (1.25 - dist) / 1.25));
        // Smoothstep curve for velvety organic falloff
        const intensity = rawIntensity * rawIntensity * (3 - 2 * rawIntensity);

        // Strict Requirement: Grow left and right ONLY, with exaggerated scaleX, and identical height (scaleY = 1)
        const scaleX = 0.72 + intensity * 1.48; // 0.72 when untouched, up to 2.20 when touched
        el.style.transform = `scaleX(${scaleX.toFixed(3)}) scaleY(1)`;

        // User explicit requirement: untouched letters must be SOLID BLACK (never gray!)
        el.style.opacity = '1';

        if (intensity > 0.12) {
          // Touched: Illuminated with radiant warm white light & soft bloom
          el.style.color = intensity > 0.45 ? '#FFFFFF' : '#FFF0EA';
          el.style.textShadow = `0 0 ${(intensity * 26).toFixed(1)}px rgba(255, 255, 255, 0.98), 0 0 ${(intensity * 46).toFixed(1)}px rgba(255, 225, 195, 0.75)`;
          el.style.filter = `drop-shadow(0 0 ${(intensity * 16).toFixed(1)}px rgba(255, 255, 255, 0.9))`;
        } else {
          // Untouched: SOLID DEEP BLACK, NO GRAY, FULL OPAQUE
          el.style.color = '#000000';
          el.style.textShadow = 'none';
          el.style.filter = 'none';
        }
      });

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isIntroActive, phase, replayKey]);

  if (!isIntroActive) {
    return null;
  }

  const letters = ['A', 'T', 'R', 'I', 'U', 'M'];

  return (
    <div
      key={replayKey}
      className={`fixed inset-0 z-30 pointer-events-none select-none flex items-center justify-center bg-[#D3542E] transition-opacity duration-300 ${
        phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* STAGE 1: LETTERS LOOP SWEEP (SOLID BLACK UNTOUCHED, GROWS LEFT & RIGHT ONLY, EXAGGERATED STRETCH, SAME HEIGHT) */}
      {phase === 'wave' && (
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 select-none overflow-visible h-32 sm:h-44 md:h-52">
            {letters.map((char, index) => (
              <span
                key={char + index}
                ref={(el) => {
                  letterRefs.current[index] = el;
                }}
                className="text-7xl sm:text-9xl md:text-[140px] font-black tracking-normal inline-flex items-center justify-center select-none transform-gpu origin-center will-change-transform leading-none h-full"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  // Initial state: A & T touched with light on X axis, remaining letters are SOLID BLACK
                  transform: index <= 1 ? 'scaleX(2.15) scaleY(1)' : 'scaleX(0.72) scaleY(1)',
                  opacity: 1,
                  color: index <= 1 ? '#FFFFFF' : '#000000',
                  lineHeight: 1,
                  textShadow:
                    index <= 1
                      ? '0 0 24px rgba(255, 255, 255, 0.98), 0 0 44px rgba(255, 225, 195, 0.75)'
                      : 'none',
                  filter:
                    index <= 1
                      ? 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.9))'
                      : 'none',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* STAGE 2: 5 CUBES LOGO GLIDES IN FROM THE RIGHT TO THE NEEDED PLACE (NO CONTAINER BOX) */}
      {/* STAGE 3: THEN THE ATRIUM TEXT ENTERS LETTER BY LETTER */}
      {(phase === 'logo' || phase === 'lockup' || phase === 'fadeout') && (
        <div className="flex items-center justify-center gap-4 sm:gap-7 select-none transition-all duration-300">
          {/* Authentic 5-Cubes Logo - Glides in from the right to the needed place (NO CONTAINER BOX) */}
          <div
            className="shrink-0"
            style={{
              animation: 'logo-enter-from-right 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}
          >
            <FiveCubesLogo
              cubeColor="#000000"
              className="w-16 h-16 sm:w-22 sm:h-22 md:w-26 md:h-26"
            />
          </div>

          {/* Full normal ATRIUM text enters LETTER BY LETTER after logo arrives in place */}
          {(phase === 'lockup' || phase === 'fadeout') && (
            <div className="flex items-center select-none leading-none">
              {letters.map((char, index) => (
                <span
                  key={char + index}
                  className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-black select-none leading-none inline-block transform-gpu"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    animation: 'letter-stagger-pop 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
                    animationDelay: `${index * 75}ms`,
                    transformOrigin: 'center center',
                    textShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skip Intro Button */}
      {onSkip && phase !== 'fadeout' && (
        <div className="absolute bottom-6 right-6 pointer-events-auto z-40 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#000000] hover:text-white flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-black/10 hover:bg-black/30 border border-black/20 backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
          >
            <span>Skip Intro</span>
            <span className="text-[10px] opacity-60">ESC</span>
          </button>
        </div>
      )}
    </div>
  );
};
