import React, { useEffect, useRef, useState } from 'react';

export interface AtriumMonolithProps {
  isIntroActive: boolean;
  onCardArrivalStart?: () => void;
  onIntroComplete?: () => void;
  onSkip?: () => void;
  replayKey?: number;
}

/**
 * Authentic 5-Cubes Architectural Logo (Quincunx 3x3 layout: 4 Corners + 1 Center)
 */
export const FiveCubesLogo: React.FC<{
  size?: number;
  cubeColor?: string;
  className?: string;
}> = ({ size = 48, cubeColor = '#D3542E', className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`grid grid-cols-3 grid-rows-3 gap-[10%] p-[8%] shrink-0 ${className}`}
      aria-label="Atrium 5 Cubes Logo"
    >
      {/* Row 1: Left & Right cubes */}
      <div className="rounded-[22%] shadow-xs" style={{ backgroundColor: cubeColor }} />
      <div />
      <div className="rounded-[22%] shadow-xs" style={{ backgroundColor: cubeColor }} />

      {/* Row 2: Center cube */}
      <div />
      <div className="rounded-[22%] shadow-xs" style={{ backgroundColor: cubeColor }} />
      <div />

      {/* Row 3: Left & Right cubes */}
      <div className="rounded-[22%] shadow-xs" style={{ backgroundColor: cubeColor }} />
      <div />
      <div className="rounded-[22%] shadow-xs" style={{ backgroundColor: cubeColor }} />
    </div>
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
  // 0.0s – 1.6s: 'wave' (side-to-side loop passing through letters: touches two letters with light, X-axis only)
  // 1.6s – 2.4s: 'lockup' (5 cubes logo pops in on left, ATRIUM text sits neatly on right, NO subtitle)
  // 2.4s – 2.8s: 'fadeout' (smooth fadeout, card smoothly begins arrival)
  // 2.8s+: unmounted completely (returns null, nothing appears on background)
  const [phase, setPhase] = useState<'wave' | 'lockup' | 'fadeout'>('wave');
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

    // 1.6s: Logo pops in, text sits next to it
    const tLockup = setTimeout(() => {
      setPhase('lockup');
    }, 1600);

    // 2.4s: Intro fades out, card starts smooth arrival
    const tFadeout = setTimeout(() => {
      setPhase('fadeout');
      onCardArrivalStart?.();
    }, 2400);

    // 2.8s: Intro sequence completely completes
    const tComplete = setTimeout(() => {
      onIntroComplete?.();
    }, 2800);

    return () => {
      clearTimeout(tLockup);
      clearTimeout(tFadeout);
      clearTimeout(tComplete);
    };
  }, [isIntroActive, replayKey, onCardArrivalStart, onIntroComplete]);

  // Real-time animation loop for Stage 1:
  // - Sweeps side-to-side across ATRIUM letters
  // - Touches exactly two letters at a time with luminous light
  // - Strict X-axis only distortion (scaleX 0.72 -> 1.42, scaleY is strictly 1.0, NO translateY)
  useEffect(() => {
    if (!isIntroActive || phase !== 'wave') return;

    let animId: number;
    const startTime = performance.now();
    const cycleDuration = 1350; // 1.35s full ping-pong period

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      // Ping-pong between 0.5 (letters A & T) and 4.5 (letters U & M)
      // waveNorm: 0 at t=0, 1 at t=0.5, 0 at t=1.0
      const waveNorm = 0.5 - 0.5 * Math.cos(progress * 2 * Math.PI);
      const beamCenter = 0.5 + waveNorm * 4.0; // Sweeps from 0.5 to 4.5 and back

      // Effective beam touch radius = 1.15
      // When beamCenter is at 0.5:
      // Letter 0 (A) dist = 0.5 -> intensity = 0.565
      // Letter 1 (T) dist = 0.5 -> intensity = 0.565
      // Letter 2 (R) dist = 1.5 -> intensity = 0 (untouched)
      // Thus exactly two letters are touched simultaneously by the light!
      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(i - beamCenter);
        const rawIntensity = Math.max(0, Math.min(1, (1.15 - dist) / 1.15));
        // Smoothstep curve for velvety organic falloff
        const intensity = rawIntensity * rawIntensity * (3 - 2 * rawIntensity);

        // Strict Requirement 2: X-AXIS ONLY (no Y-axis scaling, zero translateY)
        const scaleX = 0.72 + intensity * 0.70; // 0.72 when untouched, 1.42 when touched
        el.style.transform = `scaleX(${scaleX.toFixed(3)}) scaleY(1)`;

        // Strict Requirement 1: Put light on the touched two letters
        const opacity = 0.38 + intensity * 0.62;
        el.style.opacity = opacity.toFixed(3);

        if (intensity > 0.08) {
          // Touched: Illuminated with radiant warm white light & soft bloom
          el.style.color = intensity > 0.35 ? '#FFFFFF' : '#FCE7DF';
          el.style.textShadow = `0 0 ${(intensity * 20).toFixed(1)}px rgba(255, 255, 255, 0.95), 0 0 ${(intensity * 38).toFixed(1)}px rgba(255, 225, 195, 0.65)`;
          el.style.filter = `drop-shadow(0 0 ${(intensity * 14).toFixed(1)}px rgba(255, 255, 255, 0.85))`;
        } else {
          // Untouched: Dark tone, no light, no shadow
          el.style.color = '#18181B';
          el.style.textShadow = 'none';
          el.style.filter = 'none';
        }
      });

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isIntroActive, phase, replayKey]);

  // CRITICAL REQUIREMENT:
  // "the moment the motion ends the atrium logo and text shouldn't appear on the background"
  // "it keeps on runging on the background the moment i don't want that"
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
      {/* STAGE 1: TWO-LETTER LIGHT LOOP SWEEP (X-AXIS ONLY) (0.0s – 1.6s) */}
      {/* Sweeps side to side, touches 2 letters at a time, illuminates with light, scales on X-axis only */}
      {phase === 'wave' && (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 select-none overflow-visible">
            {letters.map((char, index) => (
              <span
                key={char + index}
                ref={(el) => {
                  letterRefs.current[index] = el;
                }}
                className="text-7xl sm:text-9xl md:text-[140px] font-black tracking-normal inline-block select-none transform-gpu origin-center will-change-transform"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  // Initial state: A & T touched with light on X axis
                  transform: index <= 1 ? 'scaleX(1.36) scaleY(1)' : 'scaleX(0.72) scaleY(1)',
                  opacity: index <= 1 ? 1 : 0.38,
                  color: index <= 1 ? '#FFFFFF' : '#18181B',
                  textShadow:
                    index <= 1
                      ? '0 0 20px rgba(255, 255, 255, 0.95), 0 0 38px rgba(255, 225, 195, 0.65)'
                      : 'none',
                  filter:
                    index <= 1
                      ? 'drop-shadow(0 0 14px rgba(255, 255, 255, 0.85))'
                      : 'none',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* STAGE 2: 5 CUBES LOGO + ATRIUM TEXT LOCKUP (1.6s – 2.4s) */}
      {/* Authentic 5 cubes logo on left, ATRIUM text next to it. NO 'by stoa studio' or subtitles! */}
      {(phase === 'lockup' || phase === 'fadeout') && (
        <div className="flex items-center justify-center gap-4 sm:gap-7 select-none animate-in fade-in zoom-in-95 duration-200">
          {/* Authentic 5-Cubes Logo Badge */}
          <div
            className="p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-[#18181B] flex items-center justify-center shadow-2xl"
            style={{
              animation: 'cubes-lockup-pop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            }}
          >
            <FiveCubesLogo size={60} cubeColor="#D3542E" />
          </div>

          {/* Clean ATRIUM Wordmark */}
          <h1
            className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-[#18181B] select-none"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              animation: 'text-lockup-slide 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
              textShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
            }}
          >
            ATRIUM
          </h1>
        </div>
      )}

      {/* Skip Intro Button */}
      {onSkip && phase !== 'fadeout' && (
        <div className="absolute bottom-6 right-6 pointer-events-auto z-40 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#18181B] hover:text-white flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-black/10 hover:bg-black/30 border border-black/20 backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
          >
            <span>Skip Intro</span>
            <span className="text-[10px] opacity-60">ESC</span>
          </button>
        </div>
      )}
    </div>
  );
};
