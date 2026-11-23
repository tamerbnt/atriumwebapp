import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShowcaseSlide {
  id: string;
  src: string;
  alt: string;
}

const PREVIEW_SLIDES: ReadonlyArray<ShowcaseSlide> = [
  {
    id: 'chaos_archives',
    src: '/assets/aistudio/chaos_archives.webp',
    alt: 'Chaos des archives et paperasse manuelle',
  },
  {
    id: 'souvenirs_velours',
    src: '/assets/aistudio/souvenirs_velours.webp',
    alt: 'Surcharge et processus administratifs fragmentés',
  },
  {
    id: 'chaos_vers_serenite',
    src: '/assets/aistudio/du_chaos_vers_serenite.webp',
    alt: 'Du chaos vers la sérénité avec Atrium OS',
  },
  {
    id: 'reseau_futuriste',
    src: '/assets/aistudio/reseau_futuriste.webp',
    alt: 'Réseau futuriste d’espaces de travail interconnectés',
  },
];

export interface OnboardingShowcaseCardProps {
  isAr: boolean;
}

export const OnboardingShowcaseCard: React.FC<OnboardingShowcaseCardProps> = React.memo(
  ({ isAr }) => {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    // Preload and decode slides 1..N gently after first paint so Step 0 renders immediately
    useEffect(() => {
      let cancelled = false;

      const warmRemainingSlides = async () => {
        for (let i = 1; i < PREVIEW_SLIDES.length; i++) {
          if (cancelled) return;
          const img = new Image();
          img.decoding = 'async';
          img.src = PREVIEW_SLIDES[i].src;
          if (typeof img.decode === 'function') {
            try {
              await img.decode();
            } catch {
              // Ignore decode error on aborted preload
            }
          }
        }
      };

      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };

      if (typeof w.requestIdleCallback === 'function') {
        const idleId = w.requestIdleCallback(() => {
          void warmRemainingSlides();
        }, { timeout: 600 });
        return () => {
          cancelled = true;
          w.cancelIdleCallback?.(idleId);
        };
      }

      const tId = setTimeout(() => {
        void warmRemainingSlides();
      }, 250);
      return () => {
        cancelled = true;
        clearTimeout(tId);
      };
    }, []);

    // Auto-swipe showcase imagery every 4.5 seconds without re-rendering parent form state
    useEffect(() => {
      const timer = setInterval(() => {
        setActiveSlideIndex((prev) => (prev + 1) % PREVIEW_SLIDES.length);
      }, 4500);
      return () => clearInterval(timer);
    }, []);

    const activeSlide = PREVIEW_SLIDES[activeSlideIndex] || PREVIEW_SLIDES[0];

    return (
      <div className="sq-elev-pop h-full min-h-0">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#181512]/90 rounded-[var(--r-panel,28px)] [--sq-stroke:rgba(255,255,255,0.1)] p-3 flex flex-col justify-between h-full min-h-0 overflow-hidden relative group/card"
        >
          {/* Main Image Viewport with GPU-only compositor spatial transition */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="relative flex-1 min-h-0 w-full h-full rounded-[var(--r-card,16px)] overflow-hidden bg-[#100D0B] [--sq-stroke:rgba(255,255,255,0.1)] select-none"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeSlide.id}
                initial={{
                  opacity: 0,
                  x: isAr ? -44 : 44,
                  scale: 1.03,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  x: isAr ? 36 : -36,
                  scale: 0.97,
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ willChange: 'transform, opacity' }}
                className="absolute inset-0 w-full h-full"
              >
                <img
                  src={activeSlide.src}
                  alt={activeSlide.alt || 'Atrium OS Showcase'}
                  width={1200}
                  height={1800}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                  fetchPriority={activeSlideIndex === 0 ? 'high' : 'auto'}
                />
              </motion.div>
            </AnimatePresence>

            {/* Luxury Edge Lighting Vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.55)] rounded-[var(--r-card,16px)]" />

            <div className="flex flex-col justify-between gap-[var(--s2,8px)] z-20 pointer-events-none">
              <div className="absolute bottom-[var(--s3,12px)] inset-x-0 flex items-center justify-center gap-[var(--s2,8px)] z-20 pointer-events-none">
                {PREVIEW_SLIDES.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-[var(--s1,4px)] rounded-full transition-[width,background-color] duration-400 ${
                      activeSlideIndex === idx
                        ? 'w-[var(--s6,24px)] bg-[var(--brand-on-dark,#FF8F63)] shadow-[0_0_8px_rgba(255,138,76,0.8)]'
                        : 'w-[var(--s2,8px)] bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

OnboardingShowcaseCard.displayName = 'OnboardingShowcaseCard';
