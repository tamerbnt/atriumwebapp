import React from 'react';

/**
 * OnboardingBackdropProps
 * Configuration parameters for the scoped Atrium OnboardingBackdrop component.
 */
export interface OnboardingBackdropProps {
  children: React.ReactNode;
  variant?: 'dark' | 'light';
  ribPitch?: number; // 8px to 14px (default: 11)
  ribOpacity?: number; // 0.06 to 0.14 (default: 0.10)
  blur?: number; // 2px to 6px (default: 4)
  className?: string;
  dir?: 'ltr' | 'rtl';
  customTokens?: {
    base?: string;
    brand?: string;
    light?: string;
    highlight?: string;
    deep?: string;
  };
}

/**
 * OnboardingBackdrop
 *
 * Scoped, production-grade 4-layer fluted glass and terracotta mesh background
 * strictly engineered for Atrium onboarding screens.
 *
 * LAYERS:
 * 1. Base Layer: Solid brand base anchor (#1F1D1B dark / #F8F9FA light)
 * 2. Mesh Gradient: 4 asymmetrical soft terracotta radial blobs with 50s slow drift
 * 3. Reeded Rib Texture: Full-bleed repeating vertical ribs (bright edge + soft fade + shadow edge)
 *    refracted through a 2-6px backdrop blur (fluted architectural glass effect)
 * 4. Micro-Grain Dither: Inline SVG feTurbulence overlay preventing 8-bit color banding
 */
export const OnboardingBackdrop: React.FC<OnboardingBackdropProps> = ({
  children,
  variant = 'dark',
  ribPitch = 11,
  ribOpacity = 0.10,
  blur = 4,
  className = '',
  dir,
  customTokens,
}) => {
  // Clamp parameters to their safe verified ranges
  const safeRib = Math.min(Math.max(ribPitch, 8), 14);
  const safeOpacity = Math.min(Math.max(ribOpacity, 0.06), 0.14);
  const safeBlur = Math.min(Math.max(blur, 2), 6);

  const styleOverrides: React.CSSProperties = {
    '--ob-rib': `${safeRib}px`,
    '--ob-rib-opacity': `${safeOpacity}`,
    '--ob-blur': `${safeBlur}px`,
    ...(customTokens?.base ? { '--ob-base': customTokens.base } : {}),
    ...(customTokens?.brand ? { '--ob-brand': customTokens.brand } : {}),
    ...(customTokens?.light ? { '--ob-light': customTokens.light } : {}),
    ...(customTokens?.highlight ? { '--ob-highlight': customTokens.highlight } : {}),
    ...(customTokens?.deep ? { '--ob-deep': customTokens.deep } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`onboarding-backdrop onboarding-backdrop--${variant} ${className}`}
      style={styleOverrides}
      dir={dir}
    >
      {/* LAYER 1 - BASE: Solid Brand Base Color */}
      <div className="onboarding-layer-base" aria-hidden="true" />

      {/* LAYER 2 - MESH GRADIENT: Asymmetrical Brand Blobs (50s slow transform drift) */}
      <div className="onboarding-layer-mesh" aria-hidden="true">
        {/* Bright Upper-Left Highlight Bloom (Peach Amber Tint) */}
        <div className="onboarding-blob blob-upper-left" />

        {/* Center-Right Luminous Brand Streak (Signature Terracotta) */}
        <div className="onboarding-blob blob-center-right" />

        {/* Deep Bottom Anchor (Burnt Sienna Shade) */}
        <div className="onboarding-blob blob-bottom-deep" />

        {/* Mid-Left Diffused Transition (Lighter Terracotta Tint) */}
        <div className="onboarding-blob blob-mid-streak" />
      </div>

      {/* LAYER 3 - REPEATING LINE TEXTURE (MAIN FEATURE): Reeded / Fluted Architectural Glass */}
      <div className="onboarding-layer-ribs" aria-hidden="true" />

      {/* LAYER 4 - GRAIN: Fine Tactile SVG Dither Overlay (Banding Protection) */}
      <svg
        className="onboarding-layer-grain"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="atrium-ob-grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.80"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#atrium-ob-grain-filter)" />
      </svg>

      {/* FOREGROUND CONTENT WORKSPACE */}
      <div className="onboarding-backdrop-content">
        {children}
      </div>
    </div>
  );
};
