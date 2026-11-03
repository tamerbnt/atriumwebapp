import type { CSSProperties, SVGAttributes } from 'react';

/*
 * Geometry is taken from the final logo sheet and kept exact:
 *   mark height = name height · mark stroke = one letter stem · gap mark→name = stem × φ
 *   gap between letters = stem ÷ φ (A–T and T–R tightened by eye) · corner squares = mark ÷ φ³
 *   clear space = one mark
 * The artwork uses currentColor, so colour it with CSS `color`.
 */

const MARK = (
  <>
    <g fill="currentColor">
      <rect x="0" y="0" width="199.9" height="199.9" rx="29.4" />
      <rect x="647.1" y="0" width="199.9" height="199.9" rx="29.4" />
      <rect x="0" y="647.1" width="199.9" height="199.9" rx="29.4" />
      <rect x="647.1" y="647.1" width="199.9" height="199.9" rx="29.4" />
    </g>
    <rect x="238.4" y="238.4" width="370.1" height="370.1" rx="8.7" fill="none" stroke="currentColor" strokeWidth="77" />
  </>
);

const WORD = (
  <g fill="currentColor">
    <path d="M1035.6 847.0V308.0H1061.6V847.0H1125.6V77.0C1125.6 35.0 1090.6 0.0 1048.6 0.0C1006.6 0.0 971.6 35.0 971.6 77.0V847.0ZM1035.6 90.0C1035.6 83.0 1041.6 77.0 1048.6 77.0C1055.6 77.0 1061.6 83.0 1061.6 90.0V231.0H1035.6Z" />
    <path d="M1155.2 77.0H1200.2V847.0H1264.2V77.0H1309.2V0.0H1155.2Z" />
    <path d="M1338.8 847.0H1402.8V308.0H1415.8C1422.8 308.0 1428.8 314.0 1428.8 321.0V847.0H1492.8V307.0C1492.8 286.0 1475.8 269.0 1454.8 269.0C1475.8 269.0 1492.8 252.0 1492.8 232.0V77.0C1492.8 35.0 1457.8 0.0 1415.8 0.0H1338.8ZM1402.8 78.0H1415.8C1422.8 78.0 1428.8 83.0 1428.8 90.0V219.0C1428.8 226.0 1422.8 231.0 1415.8 231.0H1402.8Z" />
    <path d="M1617.4 0.0H1540.4V847.0H1617.4Z" />
    <path d="M1664.9 770.0C1664.9 813.0 1698.9 847.0 1741.9 847.0C1783.9 847.0 1818.9 813.0 1818.9 770.0V0.0H1754.9V757.0C1754.9 764.0 1748.9 770.0 1741.9 770.0C1734.9 770.0 1728.9 764.0 1728.9 757.0V0.0H1664.9Z" />
    <path d="M1930.5 847.0V77.0H1956.5V847.0H2009.5V77.0H2021.5C2028.5 77.0 2034.5 83.0 2034.5 90.0V847.0H2098.5V77.0C2098.5 35.0 2064.5 0.0 2021.5 0.0H1866.5V847.0Z" />
  </g>
);

export interface AtriumLogoProps extends Omit<SVGAttributes<SVGSVGElement>, 'height' | 'width'> {
  /** 'full': mark + name · 'mark': the symbol alone */
  variant?: 'full' | 'mark';
  /** rendered height in px (width follows the artwork's proportions) */
  height?: number;
  /** adds the clear space the brand sheet requires: one mark (= the logo's height) on every side */
  clearSpace?: boolean;
  /** accessible name; default "Atrium" */
  title?: string;
}

/**
 * The Atrium logo as inline SVG. Colour it with `color`:
 *   ink on light      color: #0A0A0A
 *   orange on dark    color: #E8643F
 *   on the brand orange ground, use ink.
 */
export function AtriumLogo({ variant = 'full', height = 40, clearSpace = false, title = 'Atrium', style, ...rest }: AtriumLogoProps) {
  const full = variant === 'full';
  const width = full ? (height * 2098.5) / 847 : height;
  const pad: CSSProperties = clearSpace ? { padding: height } : {};
  return (
    <svg
      role="img"
      aria-label={variant === 'mark' ? `${title} mark` : title}
      viewBox={full ? '0 0 2098.5 847' : '0 0 847 847'}
      width={width}
      height={height}
      style={{ display: 'block', boxSizing: 'content-box', ...pad, ...style }}
      {...rest}
    >
      {MARK}
      {full ? WORD : null}
    </svg>
  );
}
