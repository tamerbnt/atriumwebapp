import React from 'react';

/**
 * OnboardingBackdropProps
 * Configuration parameters for the scoped Atrium OnboardingBackdrop component.
 */
export interface OnboardingBackdropProps {
  children: React.ReactNode;
  variant?: 'dark' | 'light';
  ribPitch?: number; // 12px to 20px (default: 14)
  ribOpacity?: number; // 0.05 to 0.35 (default: 0.12)
  blur?: number; // 2px to 4px (default: 3)
  className?: string;
  dir?: 'ltr' | 'rtl';
  customTokens?: {
    base?: string;
    ember?: string;
    terracotta?: string;
    orange?: string;
    hot?: string;
    peach?: string;
  };
}

/**
 * OnboardingBackdrop
 *
 * Scoped, production-grade 4-layer dark glowing terracotta-orange mesh gradient
 * strictly engineered for Atrium onboarding screens.
 *
 * COLOR PALETTE (Deep obsidian warm base with saturated fiery orange):
 * - --ob-base: #0C0A09 (deep near-black obsidian solid)
 * - --ob-ember: #782307 (deep molten ember transition)
 * - --ob-terracotta: #C4552A (brand anchor for UI and accents)
 * - --ob-orange: #E64A19 (pure saturated fiery orange, zero pale pastel)
 * - --ob-hot: #F4511E (concentrated flame orange hot center)
 * - --ob-peach: #FF7043 (luminous warm orange highlight)
 *
 * LAYERS:
 * 1. Base Layer: Solid deep obsidian warm base (#0C0A09)
 * 2. Mesh Gradient: 3 concentrated glows (lower-left core, upper-right accent, mid accent)
 *    Hot center -> saturated fiery orange -> ember -> transparent with fast falloff and screen blending.
 * 3. Fluted Ribs: 12-20px vertical ribs with soft warm light edge & dark edge, masked to glow
 *    intensity and refracted through a 2-4px backdrop blur.
 * 4. Micro-Grain Dither: 3.5% SVG feTurbulence overlay preventing color banding in dark gradients.
 */
export const OnboardingBackdrop: React.FC<OnboardingBackdropProps> = ({
  children,
  variant = 'dark',
  ribPitch = 14,
  ribOpacity,
  blur = 3,
  className = '',
  dir,
  customTokens,
}) => {
  // Clamp parameters to their safe verified ranges
  const safeRib = Math.min(Math.max(ribPitch, 12), 20);
  const safeBlur = Math.min(Math.max(blur, 2), 4);

  const styleOverrides: React.CSSProperties = {
    '--ob-rib': `${safeRib}px`,
    '--ob-blur': `${safeBlur}px`,
    ...(ribOpacity !== undefined ? { '--ob-rib-opacity': String(ribOpacity) } : {}),
    ...(customTokens?.base ? { '--ob-base': customTokens.base } : {}),
    ...(customTokens?.ember ? { '--ob-ember': customTokens.ember } : {}),
    ...(customTokens?.terracotta ? { '--ob-terracotta': customTokens.terracotta } : {}),
    ...(customTokens?.orange ? { '--ob-orange': customTokens.orange } : {}),
    ...(customTokens?.hot ? { '--ob-hot': customTokens.hot } : {}),
    ...(customTokens?.peach ? { '--ob-peach': customTokens.peach } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`onboarding-backdrop onboarding-backdrop--${variant} ${className}`}
      style={styleOverrides}
      dir={dir}
    >
      {/* LAYER 1 - BASE: Solid Near-Black Warm Base Color (#14110F) */}
      <div className="onboarding-layer-base" aria-hidden="true" />

      {/* LAYER 2 - MESH GRADIENT: 3 Concentrated Glows (screen blend, 40-54s slow transform drift) */}
      <div className="onboarding-layer-mesh" aria-hidden="true">
        {/* Glow 1: Large Lower-Left / Center Radiant Core */}
        <div className="onboarding-glow glow-lower-core" />

        {/* Glow 2: Smaller Upper-Right Luminous Specular Accent */}
        <div className="onboarding-glow glow-upper-right" />

        {/* Glow 3: Faint Mid Accent */}
        <div className="onboarding-glow glow-mid-accent" />
      </div>

      {/* LAYER 3 - FLUTED RIBS: Mask-Tied to Light Areas with 2-4px Optical Refraction */}
      <div className="onboarding-layer-ribs" aria-hidden="true" />

      {/* LAYER 4 - HIGH-PERFORMANCE STATIC NOISE TEXTURE */}
      <div className="onboarding-layer-grain pointer-events-none" aria-hidden="true" />

      {/* FOREGROUND CONTENT WORKSPACE */}
      <div className="onboarding-backdrop-content">
        {children}
      </div>
    </div>
  );
};
