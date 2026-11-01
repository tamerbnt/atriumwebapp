import React from 'react';
import { AtriumIntroOverlay } from '../ui/AtriumIntroOverlay';

export interface AtriumMonolithProps {
  isIntroActive: boolean;
  targetRect?: { left: number; top: number; width: number; height: number } | null;
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
 * Replaced with the official Atrium Confluence Intro Animation.
 * Mounts above all content and dispatches 'atrium:introcomplete'.
 */
export const AtriumMonolith: React.FC<AtriumMonolithProps> = ({
  isIntroActive,
  onIntroComplete,
  onSkip,
  replayKey,
}) => {
  if (!isIntroActive) return null;

  return (
    <AtriumIntroOverlay
      key={replayKey}
      forcePlay={true}
      onComplete={() => {
        onIntroComplete?.();
        onSkip?.();
      }}
    />
  );
};
