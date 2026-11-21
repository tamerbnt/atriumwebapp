import React from 'react';
import { clamp, ROW_H, ROW_G, ROW_DH, ROW_B } from './kineticMath';

export interface KineticDetailColumn {
  heading: string;
  primaryText: React.ReactNode;
  secondaryText?: React.ReactNode;
  tertiaryText?: React.ReactNode;
}

export interface KineticDetailAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDanger?: boolean;
  onClick: () => void;
}

export interface KineticDetailIslandProps {
  eValue?: number;
  rowWidth?: number;
  column1?: KineticDetailColumn;
  column2?: KineticDetailColumn;
  column3?: KineticDetailColumn;
  overflowFields?: Array<{ label: string; value: React.ReactNode }>;
  notes?: string;
  actions?: KineticDetailAction[];
  detRef?: React.Ref<HTMLDivElement>;
  dcRef?: React.Ref<HTMLDivElement>;
  renderContent?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const DET_CONTROLLED_BASE_STYLE: React.CSSProperties = {
  display: 'none',
  left: 0,
  top: 0,
};

const DC_CONTROLLED_BASE_STYLE: React.CSSProperties = {
  display: 'none',
  top: `${ROW_H + ROW_G}px`,
  height: `${ROW_DH}px`,
  gridTemplateColumns: '1fr 1fr 1.2fr auto',
  gap: '24px',
  padding: '16px 20px',
};

export const KineticDetailIsland: React.FC<KineticDetailIslandProps> = React.memo(({
  eValue = 0,
  rowWidth = 1200,
  column1,
  column2,
  column3,
  overflowFields,
  notes,
  actions = [],
  detRef,
  dcRef,
  renderContent = true,
  children,
  className = '',
}) => {
  const W = Math.max(ROW_B, rowWidth || 1200);
  const e = clamp(eValue / 100, 0, 1.1);
  const isHidden = e < 0.01;
  const opacity = clamp((e - 0.55) / 0.35, 0, 1);
  const isInteractive = opacity > 0.6;

  const islandLeft = (W - 12 - ROW_B) * (1 - e);
  const islandTop = (ROW_H / 2 - ROW_B / 2) * (1 - e) + (ROW_H + ROW_G) * e;
  const islandWidth = ROW_B + (W - ROW_B) * e;
  const islandHeight = ROW_B + (ROW_DH - ROW_B) * e;
  const islandRadius = 19 - 3 * e;

  return (
    <>
      <div
        ref={detRef}
        className="det absolute bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] rounded-[var(--r-card,16px)] box-border z-0 pointer-events-none"
        style={
          detRef
            ? DET_CONTROLLED_BASE_STYLE
            : {
                display: isHidden ? 'none' : 'block',
                left: `${islandLeft}px`,
                top: `${islandTop}px`,
                width: `${islandWidth}px`,
                height: `${islandHeight}px`,
                borderRadius: `${islandRadius}px`,
              }
        }
      />

      <div
        ref={dcRef}
        className={`dc absolute left-0 right-0 z-[2] select-text box-border ${className}`}
        style={
          dcRef
            ? DC_CONTROLLED_BASE_STYLE
            : {
                display: isHidden ? 'none' : 'grid',
                top: `${ROW_H + ROW_G}px`,
                height: `${ROW_DH}px`,
                opacity,
                pointerEvents: isInteractive ? 'auto' : 'none',
                gridTemplateColumns: '1fr 1fr 1.2fr auto',
                gap: '24px',
                padding: '16px 20px',
              }
        }
        aria-hidden={dcRef ? true : !isInteractive}
      >
        {!renderContent ? null : children ? (
          children
        ) : (
          <>
            {/* Col 1 */}
            <div className="flex flex-col min-w-0 justify-center gap-[var(--s1,4px)]">
              <h4 className="m-0 t-small font-semibold text-[var(--text-3)]">
                {column1?.heading || 'Contact / Info'}
              </h4>
              <div className="m-0 t-label font-semibold tabular-nums text-[var(--text-1)] truncate">
                {column1?.primaryText ?? '—'}
              </div>
              {column1?.secondaryText && (
                <div className="m-0 t-cap text-[var(--text-2)] truncate">
                  {column1.secondaryText}
                </div>
              )}
              {column1?.tertiaryText && (
                <div className="m-0 t-cap text-[var(--text-2)] truncate">
                  {column1.tertiaryText}
                </div>
              )}
            </div>

            {/* Col 2 */}
            <div className="flex flex-col min-w-0 justify-center gap-[var(--s1,4px)]">
              <h4 className="m-0 t-small font-semibold text-[var(--text-3)]">
                {column2?.heading || 'Détails'}
              </h4>
              <div className="m-0 t-label font-semibold text-[var(--text-1)] truncate">
                {column2?.primaryText ?? '—'}
              </div>
              {column2?.secondaryText && (
                <div className="m-0 t-cap tabular-nums text-[var(--text-2)] truncate">
                  {column2.secondaryText}
                </div>
              )}
              {column2?.tertiaryText && (
                <div className="m-0 t-small font-semibold tabular-nums text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3] truncate">
                  {column2.tertiaryText}
                </div>
              )}
            </div>

            {/* Col 3: Overflow fields or Notes */}
            <div className="flex flex-col min-w-0 justify-center gap-[var(--s1,4px)]">
              <h4 className="m-0 t-small font-semibold text-[var(--text-3)]">
                {column3?.heading || (overflowFields && overflowFields.length > 0 ? 'Attributs' : 'Notes')}
              </h4>
              {column3 ? (
                <>
                  <div className="m-0 t-small font-semibold text-[var(--text-1)] truncate">
                    {column3.primaryText}
                  </div>
                  {column3.secondaryText && (
                    <div className="m-0 t-cap text-[var(--text-2)] line-clamp-2">
                      {column3.secondaryText}
                    </div>
                  )}
                </>
              ) : overflowFields && overflowFields.length > 0 ? (
                <div className="flex flex-col gap-[var(--s1,4px)] min-w-0">
                  {overflowFields.slice(0, 3).map((ov, i) => (
                    <div key={`${ov.label}_${i}`} className="flex items-center gap-[var(--s2,8px)] t-cap min-w-0">
                      <span className="text-[var(--text-3)] shrink-0">
                        {ov.label}:
                      </span>
                      <span className="t-small font-semibold text-[var(--text-1)] truncate">
                        {ov.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 t-cap text-[var(--text-2)] line-clamp-3">
                  {notes || '—'}
                </p>
              )}
            </div>

            {/* Col 4: 2-Column Action Cluster (.db) */}
            {actions.length > 0 && (
              <div className="db grid grid-cols-2 gap-[var(--s2,8px)] self-center shrink-0">
                {actions.slice(0, 6).map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl-sm"
                    data-sq-border="solid"
                    tabIndex={dcRef ? -1 : isInteractive ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      btn.onClick();
                    }}
                    className={`relative h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] t-small flex items-center gap-[var(--btn-sm-gap,6px)] transition-colors duration-140 cursor-pointer whitespace-nowrap ${
                      btn.isDanger
                        ? '[--sq-stroke:#F5BDB3] dark:[--sq-stroke:#5C2B24] bg-[#FDE4DF]/60 dark:bg-[#3D1E1A]/60 text-[#B8321C] dark:text-[#FF8D7A] hover:bg-[#c0283d] hover:text-white hover:[--sq-stroke:#c0283d]'
                        : '[--sq-stroke:var(--sq-stroke-ctl)] bg-white dark:bg-[#262422] hover:bg-[#1F1D1B] hover:text-white hover:[--sq-stroke:#1F1D1B] dark:hover:bg-[var(--brand-fill)] dark:hover:text-white dark:hover:[--sq-stroke:var(--brand-fill)] text-[var(--text-1)]'
                    }`}
                  >
                    {btn.icon}
                    <span className="truncate">{btn.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});

KineticDetailIsland.displayName = 'KineticDetailIsland';
