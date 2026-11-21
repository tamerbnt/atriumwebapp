import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonCircle, SkeletonButton } from './SkeletonPrimitives';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

// ==========================================
// 1. KPI Metric Grid Skeleton
// ==========================================
interface SkeletonKpiGridProps {
  count?: number; // Default 4 pods
  columns?: string; // Responsive grid class
}

export const SkeletonKpiGrid: React.FC<SkeletonKpiGridProps> = ({
  count = 4,
  columns = 'grid-cols-2 md:grid-cols-4',
}) => {
  return (
    <div
      role="status"
      aria-label="Loading metric summaries"
      className={`grid ${columns} gap-[var(--card-gap,12px)]`}
    >
      <span className="sr-only">Loading metrics...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`kpi_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)]"
        >
          <div className="flex items-center justify-between gap-[var(--s2,8px)]">
            <SkeletonText size="xs" width="45%" />
            <SkeletonCircle size={32} />
          </div>
          <div className="flex flex-col gap-[var(--s3,12px)] mt-auto">
            <SkeletonText size="2xl" width="60%" />
            <SkeletonText size="xs" width="35%" />
          </div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 2. Table & Collection Skeleton
// ==========================================
interface SkeletonColumnDef {
  header?: string;
  width?: string;
  minWidth?: string;
}

interface SkeletonTableProps {
  columns?: SkeletonColumnDef[];
  rowCount?: number;
  showHeaderControls?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns = [
    { width: '2.5*' },
    { width: '1.5*' },
    { width: '1.2*' },
    { width: '1.0*' },
    { width: '100px' },
  ],
  rowCount = 6,
  showHeaderControls = true,
}) => {
  return (
    <div
      role="status"
      aria-label="Loading data records"
      className="w-full flex flex-col gap-[var(--card-gap,12px)]"
    >
      <span className="sr-only">Loading records...</span>

      {/* Top Filter & Search Bar Skeleton */}
      {showHeaderControls && (
        <div
          data-sq="card"
          data-sq-border="solid"
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--s3,12px)] p-[var(--s3,12px)] bg-white dark:bg-[#22201E]"
        >
          <div className="flex items-center gap-[var(--s2,8px)] flex-1 max-w-sm">
            <SkeletonBox height={40} className="w-full" sq="ctl" />
          </div>
          <div className="flex items-center gap-[var(--s2,8px)]">
            <SkeletonBox width={100} height={40} sq="ctl" />
            <SkeletonBox width={80} height={40} sq="ctl" />
            <SkeletonCircle size={40} />
          </div>
        </div>
      )}

      {/* Table Surface */}
      <div
        data-sq="table"
        data-sq-border="solid"
        className="w-full p-[var(--table-pad,8px)] bg-white dark:bg-[#22201E]"
      >
        {/* Table Header Row */}
        <div className="h-[var(--head-h,36px)] flex items-center px-[var(--row-inset,12px)] border-b border-[var(--atr-divider)] bg-[#F3EDE7]/80 dark:bg-[#191716]/70 gap-[var(--col-gap,16px)]">
          <SkeletonBox width={20} height={20} rounded="rounded-[var(--r-check,6px)]" className="shrink-0" />
          {columns.map((col, idx) => (
            <div
              key={`th_skel_${idx}`}
              style={{
                flex: col.width?.includes('*') ? col.width.replace('*', '') : undefined,
                width: !col.width?.includes('*') ? col.width : undefined,
                minWidth: col.minWidth || '80px',
              }}
              className="flex items-center"
            >
              <SkeletonText size="xs" width="70%" />
            </div>
          ))}
          <div className="w-8 shrink-0" />
        </div>

        {/* Table Body Rows */}
        <div className="flex flex-col gap-[var(--row-gap,8px)] pt-[var(--s2,8px)]">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={`tr_skel_${rowIdx}`}
              className="min-h-[var(--row-h,64px)] flex items-center px-[var(--row-inset,12px)] gap-[var(--col-gap,16px)]"
            >
              <SkeletonBox width={20} height={20} rounded="rounded-[var(--r-check,6px)]" className="shrink-0" />
              {columns.map((col, colIdx) => (
                <div
                  key={`td_skel_${rowIdx}_${colIdx}`}
                  style={{
                    flex: col.width?.includes('*') ? col.width.replace('*', '') : undefined,
                    width: !col.width?.includes('*') ? col.width : undefined,
                    minWidth: col.minWidth || '80px',
                  }}
                  className="flex items-center gap-[var(--av-to-text,12px)]"
                >
                  {colIdx === 0 ? (
                    <>
                      <SkeletonCircle size={40} />
                      <div className="flex flex-col gap-[var(--s1,4px)] w-full max-w-[140px]">
                        <SkeletonText size="sm" width="85%" />
                        <SkeletonText size="xs" width="55%" />
                      </div>
                    </>
                  ) : (
                    <SkeletonText size="sm" width={colIdx === columns.length - 1 ? '50%' : '75%'} />
                  )}
                </div>
              ))}
              <div className="w-8 shrink-0 flex justify-end">
                <SkeletonCircle size={24} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. Card Grid Skeleton (Grid View Mode)
// ==========================================
interface SkeletonCardGridProps {
  count?: number;
}

export const SkeletonCardGrid: React.FC<SkeletonCardGridProps> = ({ count = 6 }) => {
  return (
    <div
      role="status"
      aria-label="Loading grid items"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--card-gap,12px)] w-full"
    >
      <span className="sr-only">Loading grid items...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s4,16px)] min-h-[168px]"
        >
          <div className="flex items-start justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--s3,12px)]">
              <SkeletonCircle size={32} />
              <div className="flex flex-col gap-[var(--s1,4px)] w-32">
                <SkeletonText size="base" width="90%" />
                <SkeletonText size="xs" width="60%" />
              </div>
            </div>
            <SkeletonCircle size={24} />
          </div>

          <div className="flex flex-col gap-[var(--s2,8px)] py-[var(--s2,8px)] border-y border-[var(--atr-divider)]">
            <div className="flex justify-between items-center">
              <SkeletonText size="xs" width="30%" />
              <SkeletonText size="xs" width="40%" />
            </div>
            <div className="flex justify-between items-center">
              <SkeletonText size="xs" width="25%" />
              <SkeletonText size="xs" width="35%" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <SkeletonButton width={76} height={32} />
            <SkeletonCircle size={32} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 4. Modal Form Skeleton
// ==========================================
interface SkeletonModalFormProps {
  fieldsCount?: number;
}

export const SkeletonModalForm: React.FC<SkeletonModalFormProps> = ({ fieldsCount = 5 }) => {
  return (
    <div
      role="status"
      aria-label="Loading form options"
      className="flex flex-col gap-[var(--modal-gap,20px)] py-[var(--s2,8px)]"
    >
      <span className="sr-only">Loading form data...</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4,16px)]">
        {Array.from({ length: fieldsCount }).map((_, i) => (
          <div key={`field_skel_${i}`} className={`flex flex-col gap-[var(--s2,8px)] ${i === 0 ? 'md:col-span-2' : ''}`}>
            <SkeletonText size="xs" width="35%" />
            <SkeletonBox height={40} className="w-full" sq="ctl" />
          </div>
        ))}
      </div>

      <div className="pt-[var(--s4,16px)] border-t border-[var(--atr-divider)] flex items-center justify-end gap-[var(--s3,12px)]">
        <SkeletonButton width={80} height={40} />
        <SkeletonButton width={120} height={40} />
      </div>
    </div>
  );
};

// ==========================================
// 5. Kiosk Grid Skeleton (Touch Big Tiles)
// ==========================================
export const SkeletonKioskGrid: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div
      role="status"
      aria-label="Loading kiosk terminal"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[var(--card-gap,12px)] p-[var(--s4,16px)]"
    >
      <span className="sr-only">Loading kiosk options...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`kiosk_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-[var(--s4,16px)] bg-white dark:bg-[#22201E] flex flex-col items-center justify-center text-center min-h-[128px] gap-[var(--s2,8px)]"
        >
          <SkeletonCircle size={40} />
          <SkeletonText size="sm" width="70%" />
          <SkeletonText size="xs" width="40%" />
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 6. Analytics & Chart Skeleton
// ==========================================
export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 280 }) => {
  return (
    <div
      role="status"
      aria-label="Loading visual analytics"
      style={{ height }}
      data-sq="card"
      data-sq-border="solid"
      className="w-full p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--card-body-gap,20px)]"
    >
      <span className="sr-only">Loading chart data...</span>
      <div className="flex items-center justify-between gap-[var(--s3,12px)]">
        <div className="flex flex-col gap-[var(--s1,4px)] w-40">
          <SkeletonText size="base" width="80%" />
          <SkeletonText size="xs" width="50%" />
        </div>
        <div className="flex gap-[var(--s2,8px)]">
          <SkeletonButton width={60} height={32} />
          <SkeletonButton width={60} height={32} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-[var(--s3,12px)] h-[var(--chart-h,160px)] px-[var(--s4,16px)] py-[var(--s2,8px)] border-b border-l border-[var(--atr-divider)]">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['55%', '85%', '40%', '95%', '65%', '75%', '50%', '90%'];
          return (
            <div key={`chart_bar_${i}`} className="flex-1 flex flex-col items-center gap-[var(--s2,8px)]">
              <SkeletonBox
                width="80%"
                height={heights[i % heights.length]}
                rounded="rounded-t-[var(--r-check,6px)]"
              />
              <SkeletonText size="xs" width="60%" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 7. Standard Page Header Skeleton
// ==========================================
export interface SkeletonPageHeaderProps {
  hasIcon?: boolean;
  hasViewToggle?: boolean;
  hasFacility?: boolean;
  hasActionBtn?: boolean;
  actionBtnWidth?: number;
}

export const SkeletonPageHeader: React.FC<SkeletonPageHeaderProps> = ({
  hasIcon = true,
  hasViewToggle = false,
  hasFacility = false,
  hasActionBtn = true,
  actionBtnWidth = 160,
}) => {
  return (
    <div
      role="status"
      aria-label="Loading page navigation"
      className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--s4,16px)]"
    >
      <div className="flex items-center gap-[var(--ph-gap,16px)]">
        {hasIcon && (
          <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
        )}
        <div className="flex flex-col gap-[var(--ph-sub-gap,4px)]">
          <SkeletonText size="xl" width="180px" />
          <SkeletonText size="xs" width="280px" />
        </div>
      </div>

      <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
        {hasViewToggle && (
          <SkeletonBox width={190} height={40} sq="ctl" />
        )}
        {hasActionBtn && (
          <SkeletonBox
            width={actionBtnWidth}
            height={40}
            sq="ctl"
            className="!bg-[#d4522f]/25"
          />
        )}
      </div>
    </div>
  );
};

// ==========================================
// 8. Scheduler / Class Matrix Skeleton (MembershipSchedulerView)
// ==========================================
export interface SkeletonSchedulerViewProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
  columnsCount?: number;
  hasFacility?: boolean;
  hasActionBtn?: boolean;
  actionBtnWidth?: number;
}

export const SkeletonSchedulerView: React.FC<SkeletonSchedulerViewProps> = ({
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
  hasFacility = false,
  hasActionBtn = true,
  actionBtnWidth = 175,
}) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading schedule roster">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={onRetry}
      />

      {/* Header */}
      <div className="pb-[var(--s2,8px)]">
        <SkeletonPageHeader hasViewToggle hasFacility={hasFacility} hasActionBtn={hasActionBtn} actionBtnWidth={actionBtnWidth} />
      </div>

      {/* KPI Pod Tray matching Screenshot_69 (Weekly Session Matrix & Attendance Roster) */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--s3,12px)]"
      >
        <div className="flex flex-col gap-[var(--s1,4px)] px-[var(--s3,12px)] pt-[var(--s1,4px)]">
          <SkeletonText size="sm" width="240px" />
          <SkeletonText size="xs" width="340px" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--card-gap,12px)]">
          {/* Card 1: Scheduled Class Roster */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)]"
          >
            <div className="flex flex-col gap-[var(--s2,8px)]">
              <SkeletonText size="xs" width="130px" />
              <SkeletonBox width={88} height={24} rounded="rounded-full" />
            </div>
            <div className="flex items-baseline gap-[var(--s2,8px)] mt-auto">
              <SkeletonText size="2xl" width="50px" />
              <SkeletonText size="xs" width="60px" />
            </div>
          </div>

          {/* Card 2: Athlètes Inscrits au total */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)]"
          >
            <div className="flex flex-col gap-[var(--s2,8px)]">
              <SkeletonText size="xs" width="140px" />
              <SkeletonBox width={96} height={24} rounded="rounded-full" />
            </div>
            <div className="flex items-baseline gap-[var(--s2,8px)] mt-auto">
              <SkeletonText size="2xl" width="50px" />
              <SkeletonText size="xs" width="65px" />
            </div>
          </div>

          {/* Card 3: Affluence maximale en salle */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)]"
          >
            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <SkeletonText size="xs" width="150px" />
              <SkeletonBox width={76} height={24} rounded="rounded-full" />
            </div>
            <div className="flex flex-col gap-[var(--s1,4px)] mt-auto">
              <SkeletonText size="2xl" width="120px" className="!bg-[#d4522f]/30" />
              <SkeletonText size="xs" width="110px" />
            </div>
          </div>
        </div>
      </div>

      {/* Universal Schedule Collection Table Wireframe */}
      <SkeletonTable
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '160px' },
          { width: '1.8*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.8*', minWidth: '140px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        rowCount={6}
        showHeaderControls={true}
      />
    </div>
  );
};

// ==========================================
// Unified Dashboard Pod Skeleton Primitives
// ==========================================
export interface SkeletonDashboardProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}

export type SkeletonDashboardGymProps = SkeletonDashboardProps;

type SkeletonCardKind =
  | 'kpi-spark'
  | 'kpi-inverse'
  | 'bars'
  | 'area'
  | 'donut'
  | 'gauge'
  | 'waffle'
  | 'heatmap'
  | 'timeline'
  | 'funnel'
  | 'bullet'
  | 'ranked'
  | 'treemap'
  | 'bubble'
  | 'radar'
  | 'histogram'
  | 'dumbbell';

const SkeletonPodHeader: React.FC<{ extraActionsCount?: 0 | 1 | 2 }> = ({
  extraActionsCount = 1,
}) => (
  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-[var(--s4,16px)] pb-[var(--s2,8px)] min-w-0">
    <div className="flex items-center gap-[var(--ph-gap,16px)] min-w-0">
      <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
      <SkeletonText size="2xl" width="210px" />
    </div>
    <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
      {extraActionsCount >= 2 && <SkeletonBox width={132} height={40} sq="ctl" />}
      {extraActionsCount >= 1 && (
        <SkeletonBox
          width={142}
          height={40}
          sq="ctl"
          className="!bg-[#d4522f]/25"
        />
      )}
      <SkeletonBox width={108} height={40} sq="ctl" />
    </div>
  </div>
);

const SkeletonPodSection: React.FC<{
  layout?: 'equal' | 'split75' | 'split84';
  titleWidth?: string;
  children: React.ReactNode;
}> = ({ layout = 'equal', titleWidth = '210px', children }) => {
  const gridClass =
    layout === 'equal'
      ? 'grid-cols-1 md:grid-cols-2 gap-[var(--card-gap,12px)]'
      : 'grid-cols-1 lg:grid-cols-12 gap-[var(--card-gap,12px)]';

  return (
    <section
      data-sq="panel"
      data-sq-border="solid"
      className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--s3,12px)]"
    >
      <div className="flex items-center justify-between gap-[var(--s3,12px)] px-[var(--s3,12px)] pt-[var(--s1,4px)]">
        <SkeletonText size="base" width={titleWidth} />
      </div>
      <div className={`grid ${gridClass} items-stretch`}>{children}</div>
    </section>
  );
};

const SkeletonPodCard: React.FC<{
  kind: SkeletonCardKind;
  spanClass: string;
  featured?: boolean;
  hasFilter?: boolean;
}> = ({ kind, spanClass, featured = false, hasFilter = true }) => {
  const isKpi = kind === 'kpi-spark' || kind === 'kpi-inverse';
  const surfaceClass = featured
    ? 'bg-[#22201E] [--sq-stroke:var(--sq-stroke-obsidian)]'
    : 'bg-white dark:bg-[#22201E]';
  const mutedBoxClass = featured ? '!bg-white/10' : '';
  const accentBoxClass = featured ? '!bg-[#ee7452]/35' : '!bg-[#d4522f]/25';

  return (
    <div
      data-sq="card"
      data-sq-border="solid"
      className={`${spanClass} ${surfaceClass} p-[var(--card-pad,20px)] flex flex-col justify-between gap-[var(--card-body-gap,20px)] ${
        isKpi ? 'min-h-[var(--kpi-min-h,168px)]' : 'min-h-[248px]'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-[var(--card-head-gap,12px)]">
        <div className="flex flex-col gap-[var(--s1,4px)] min-w-0 flex-1">
          <div className="flex items-center gap-[var(--s2,8px)]">
            <SkeletonText size="sm" width="52%" className={mutedBoxClass} />
            <SkeletonCircle size={16} className={mutedBoxClass} />
          </div>
          <SkeletonText size="xs" width="68%" className={mutedBoxClass} />
        </div>
        {hasFilter && (
          <SkeletonBox
            width={92}
            height={32}
            rounded="rounded-full"
            className={`shrink-0 ${mutedBoxClass}`}
          />
        )}
      </div>

      {/* Card Body */}
      {isKpi ? (
        <div className="flex items-end justify-between gap-[var(--s4,16px)] mt-auto">
          <div className="flex flex-col gap-[var(--s3,12px)] flex-1">
            <SkeletonText size="2xl" width="136px" className={mutedBoxClass} />
            <SkeletonBox
              width={68}
              height={24}
              rounded="rounded-full"
              className={kind === 'kpi-inverse' ? accentBoxClass : mutedBoxClass}
            />
          </div>
          <div className="flex items-end gap-[var(--chart-bar-gap,4px)] h-12 shrink-0">
            {[42, 68, 54, 84, 62, 92].map((pct, i) => (
              <SkeletonBox
                key={`kpi_bar_${i}`}
                width={8}
                height={`${pct}%`}
                rounded="rounded-t-[var(--r-check,6px)]"
                className={i === 5 ? accentBoxClass : mutedBoxClass}
              />
            ))}
          </div>
        </div>
      ) : kind === 'donut' || kind === 'gauge' ? (
        <div className="flex items-center justify-between gap-[var(--s4,16px)] flex-1">
          <SkeletonCircle size={128} className={mutedBoxClass} />
          <div className="flex flex-col gap-[var(--s3,12px)] flex-1">
            {[75, 58, 66].map((w, i) => (
              <div key={`leg_${i}`} className="flex items-center justify-between gap-[var(--s2,8px)]">
                <SkeletonText size="xs" width={`${w}%`} className={mutedBoxClass} />
                <SkeletonText size="xs" width="28px" className={mutedBoxClass} />
              </div>
            ))}
          </div>
        </div>
      ) : kind === 'waffle' ? (
        <div className="flex flex-col gap-[var(--s3,12px)] flex-1 justify-end">
          <div className="flex items-baseline justify-between">
            <SkeletonText size="2xl" width="84px" className={mutedBoxClass} />
            <SkeletonText size="xs" width="70px" className={mutedBoxClass} />
          </div>
          <div className="grid grid-cols-10 gap-[var(--s2,8px)]">
            {Array.from({ length: 30 }).map((_, i) => (
              <SkeletonBox
                key={`waf_${i}`}
                height={16}
                rounded="rounded-[var(--r-check,6px)]"
                className={i < 19 ? accentBoxClass : mutedBoxClass}
              />
            ))}
          </div>
        </div>
      ) : kind === 'heatmap' ? (
        <div className="grid grid-cols-8 gap-[var(--s2,8px)] flex-1 items-center">
          {Array.from({ length: 32 }).map((_, i) => (
            <SkeletonBox
              key={`hm_${i}`}
              height={24}
              rounded="rounded-[var(--r-check,6px)]"
              className={i % 5 === 0 ? accentBoxClass : mutedBoxClass}
            />
          ))}
        </div>
      ) : kind === 'timeline' ? (
        <div className="flex flex-col gap-[var(--s3,12px)] flex-1 justify-center">
          {[68, 52, 78, 44].map((w, i) => (
            <div key={`tl_${i}`} className="flex items-center gap-[var(--s3,12px)]">
              <SkeletonText size="xs" width="82px" className={mutedBoxClass} />
              <SkeletonBox
                width={`${w}%`}
                height={24}
                rounded="rounded-[var(--r-ctl-sm,10px)]"
                className={i % 2 === 0 ? accentBoxClass : mutedBoxClass}
              />
            </div>
          ))}
        </div>
      ) : kind === 'treemap' ? (
        <div className="grid grid-cols-12 gap-[var(--s2,8px)] h-[var(--chart-h,160px)]">
          <SkeletonBox height="100%" sq="ctl" className={`col-span-7 ${accentBoxClass}`} />
          <div className="col-span-5 grid grid-rows-2 gap-[var(--s2,8px)]">
            <SkeletonBox height="100%" sq="ctl" className={mutedBoxClass} />
            <SkeletonBox height="100%" sq="ctl" className={mutedBoxClass} />
          </div>
        </div>
      ) : kind === 'bubble' ? (
        <div className="relative h-[var(--chart-h,160px)] border-b border-l border-[var(--atr-divider)] flex items-center justify-around px-[var(--s4,16px)]">
          <SkeletonCircle size={28} className={mutedBoxClass} />
          <SkeletonCircle size={40} className={accentBoxClass} />
          <SkeletonCircle size={24} className={mutedBoxClass} />
          <SkeletonCircle size={32} className={mutedBoxClass} />
          <SkeletonCircle size={32} className={accentBoxClass} />
        </div>
      ) : kind === 'radar' ? (
        <div className="flex items-center justify-center flex-1">
          <SkeletonCircle size={140} className={mutedBoxClass} />
        </div>
      ) : kind === 'bullet' || kind === 'ranked' || kind === 'funnel' || kind === 'dumbbell' ? (
        <div className="flex flex-col gap-[var(--s3,12px)] flex-1 justify-center">
          {[88, 72, 58, 44].map((w, i) => (
            <div key={`hb_${i}`} className="flex flex-col gap-[var(--s1,4px)]">
              <div className="flex justify-between">
                <SkeletonText size="xs" width="96px" className={mutedBoxClass} />
                <SkeletonText size="xs" width="48px" className={mutedBoxClass} />
              </div>
              <SkeletonBox
                width={`${w}%`}
                height={12}
                rounded="rounded-full"
                className={i === 0 ? accentBoxClass : mutedBoxClass}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-end justify-between gap-[var(--s3,12px)] h-[var(--chart-h,160px)] pt-[var(--s2,8px)] px-[var(--s1,4px)] border-b border-[var(--atr-divider)]">
          {[48, 76, 62, 92, 56, 82, 68, 86].map((h, i) => (
            <SkeletonBox
              key={`vb_${i}`}
              width="100%"
              height={`${h}%`}
              rounded="rounded-t-[var(--r-check,6px)]"
              className={i === 3 || i === 7 ? accentBoxClass : mutedBoxClass}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SkeletonDashboardShellProps extends SkeletonDashboardProps {
  ariaLabel: string;
  extraActionsCount?: 0 | 1 | 2;
  children: React.ReactNode;
}

const SkeletonDashboardShell: React.FC<SkeletonDashboardShellProps> = ({
  ariaLabel,
  extraActionsCount = 1,
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
  children,
}) => (
  <div
    className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200"
    role="status"
    aria-label={ariaLabel}
  >
    <span className="sr-only">{ariaLabel}</span>
    <OfflineRetryBanner
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      lastSyncedAt={lastSyncedAt}
      onRetry={onRetry}
    />
    <SkeletonPodHeader extraActionsCount={extraActionsCount} />
    {children}
  </div>
);

// ==========================================
// 9. Dedicated Gym Dashboard Skeleton (MembershipDashboardView)
// ==========================================
export const SkeletonDashboardGym: React.FC<SkeletonDashboardGymProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading gym dashboard" extraActionsCount={0} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="185px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="220px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="waffle" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="250px">
      <SkeletonPodCard kind="heatmap" spanClass="col-span-full" />
      <SkeletonPodCard kind="heatmap" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 10. Split POS Register Skeleton (PosRegisterView)
// ==========================================
export interface SkeletonPosRegisterProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonPosRegister: React.FC<SkeletonPosRegisterProps> = ({
  isOffline,
  isTimedOut,
  onRetry,
}) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading POS register">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={onRetry}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-[var(--s3,12px)] pb-[var(--s2,8px)]">
        <div className="flex items-center gap-[var(--ph-gap,16px)]">
          <SkeletonBox width={48} height={48} sq="tile-lg" />
          <div className="flex flex-col gap-[var(--ph-sub-gap,4px)]">
            <SkeletonText size="lg" width="160px" />
            <SkeletonText size="xs" width="220px" />
          </div>
        </div>
        <div className="flex items-center gap-[var(--s2,8px)]">
          <SkeletonBox width={120} height={40} sq="ctl" />
          <SkeletonBox width={140} height={40} sq="ctl" className="!bg-[#d4522f]/25" />
        </div>
      </div>

      {/* Split 65 / 35 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--s4,16px)] min-h-[580px]">
        {/* Left Column (65%): Category Pills + Product Catalog Grid */}
        <div className="lg:col-span-8 flex flex-col gap-[var(--s4,16px)]">
          {/* Category Capsules */}
          <div className="flex items-center gap-[var(--s2,8px)] overflow-hidden py-[var(--s1,4px)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={`cat_pill_${i}`} width={i === 0 ? 60 : 92} height={32} rounded="rounded-full" />
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-[var(--card-gap,12px)] flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`pos_prod_${i}`}
                data-sq="card"
                data-sq-border="solid"
                className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[168px]"
              >
                <div className="flex items-start gap-[var(--s3,12px)]">
                  <SkeletonBox width={40} height={40} sq="tile" className="shrink-0" />
                  <div className="flex flex-col gap-[var(--s1,4px)] flex-1 min-w-0">
                    <SkeletonText size="sm" width="90%" />
                    <SkeletonText size="xs" width="60%" />
                  </div>
                </div>
                <div className="pt-[var(--s2,8px)] border-t border-[var(--atr-divider)] flex items-center justify-between">
                  <SkeletonText size="base" width="70px" className="!bg-[#d4522f]/25" />
                  <SkeletonCircle size={32} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (35%): Cashier Ticket Receipt */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="lg:col-span-4 p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col justify-between gap-[var(--s4,16px)]"
        >
          <div className="flex flex-col gap-[var(--s4,16px)]">
            <div className="flex items-center justify-between pb-[var(--s3,12px)] border-b border-[var(--atr-divider)]">
              <SkeletonText size="sm" width="120px" />
              <SkeletonBox width={72} height={24} rounded="rounded-full" />
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-[var(--s3,12px)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`ticket_line_${i}`} className="flex items-center justify-between gap-[var(--s2,8px)]">
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <SkeletonText size="xs" width="110px" />
                    <SkeletonText size="xs" width="60px" />
                  </div>
                  <SkeletonText size="sm" width="64px" />
                </div>
              ))}
            </div>
          </div>

          {/* Subtotals & Payment CTA */}
          <div className="pt-[var(--s4,16px)] border-t border-[var(--atr-divider)] flex flex-col gap-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s2,8px)]">
              <div className="flex justify-between">
                <SkeletonText size="xs" width="70px" />
                <SkeletonText size="xs" width="60px" />
              </div>
              <div className="flex justify-between">
                <SkeletonText size="xs" width="50px" />
                <SkeletonText size="xs" width="50px" />
              </div>
              <div className="flex justify-between pt-[var(--s1,4px)]">
                <SkeletonText size="base" width="80px" />
                <SkeletonText size="lg" width="90px" className="!bg-[#d4522f]/30" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-[var(--s2,8px)] pt-[var(--s2,8px)]">
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
            </div>

            <SkeletonButton height={48} className="w-full !bg-[#d4522f]/35" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 11. Multi-Column Calendar & Timetable Skeleton
// ==========================================
export interface SkeletonCalendarTimelineProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonCalendarTimeline: React.FC<SkeletonCalendarTimelineProps> = ({
  isOffline,
  isTimedOut,
  onRetry,
}) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading calendar timetable">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} onRetry={onRetry} />
      <SkeletonPageHeader hasViewToggle hasFacility hasActionBtn />

      {/* Date ribbon bar */}
      <div
        data-sq="card"
        data-sq-border="solid"
        className="p-[var(--pod-pad,12px)] bg-white dark:bg-[#22201E] flex items-center justify-between gap-[var(--s3,12px)]"
      >
        <div className="flex items-center gap-[var(--s2,8px)]">
          <SkeletonCircle size={32} />
          <SkeletonText size="sm" width="130px" />
          <SkeletonCircle size={32} />
        </div>
        <div className="flex items-center gap-[var(--s2,8px)] overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBox key={`day_ribbon_${i}`} width={56} height={40} sq="ctl" />
          ))}
        </div>
      </div>

      {/* Resource Column Grid */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,12px)]"
      >
        {/* Column Headers (Stylists / Rooms) */}
        <div className="grid grid-cols-4 gap-[var(--s4,16px)] px-[var(--s2,8px)] py-[var(--s2,8px)] pb-[var(--s3,12px)] border-b border-[var(--atr-divider)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`col_hdr_${i}`} className="flex items-center gap-[var(--s2,8px)]">
              <SkeletonCircle size={32} />
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <SkeletonText size="xs" width="80px" />
                <SkeletonText size="xs" width="50px" />
              </div>
            </div>
          ))}
        </div>

        {/* Time-Slot Rows */}
        <div className="grid grid-cols-4 gap-[var(--s3,12px)] pt-[var(--s3,12px)] min-h-[380px]">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div key={`slot_col_${colIdx}`} className="flex flex-col gap-[var(--s3,12px)]">
              {Array.from({ length: 3 }).map((_, slotIdx) => (
                <div
                  key={`slot_card_${colIdx}_${slotIdx}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-[var(--s4,16px)] bg-[#F3EDE7] dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)]"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonText size="xs" width="60px" />
                    <SkeletonBox width={48} height={16} rounded="rounded-full" />
                  </div>
                  <SkeletonText size="sm" width="95%" />
                  <div className="flex items-center gap-[var(--s2,8px)] pt-[var(--s1,4px)]">
                    <SkeletonCircle size={20} />
                    <SkeletonText size="xs" width="70px" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 12. Kanban Pipeline Skeleton
// ==========================================
export interface SkeletonKanbanPipelineProps {
  columnsCount?: number;
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonKanbanPipeline: React.FC<SkeletonKanbanPipelineProps> = ({
  columnsCount = 4,
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
}) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading kanban pipeline">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasActionBtn />

      {/* Multi-column Kanban swimlanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[var(--s4,16px)] min-h-[500px]">
        {Array.from({ length: columnsCount }).map((_, colIdx) => (
          <div
            key={`kanban_col_${colIdx}`}
            data-sq="panel"
            data-sq-border="solid"
            className="p-[var(--pod-pad,12px)] bg-[#F3EDE7] dark:bg-[#191716] flex flex-col gap-[var(--s3,12px)]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-[var(--s2,8px)] pt-[var(--s1,4px)] pb-[var(--s2,8px)] border-b border-[var(--atr-divider)]">
              <SkeletonText size="sm" width="110px" />
              <SkeletonBox width={28} height={20} rounded="rounded-full" />
            </div>

            {/* Draggable Task Cards */}
            <div className="flex flex-col gap-[var(--card-gap,12px)] flex-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div
                  key={`kcard_${colIdx}_${cardIdx}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-[var(--s4,16px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s3,12px)]"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBox width={64} height={16} rounded="rounded-full" />
                    <SkeletonCircle size={20} />
                  </div>
                  <SkeletonText size="sm" width="90%" />
                  <SkeletonText size="xs" width="60%" />
                  <div className="pt-[var(--s2,8px)] border-t border-[var(--atr-divider)] flex items-center justify-between">
                    <SkeletonCircle size={24} />
                    <SkeletonText size="xs" width="56px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 13. Finance & Audit Desk Skeleton
// ==========================================
export interface SkeletonFinanceAuditProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonFinanceAudit: React.FC<SkeletonFinanceAuditProps> = ({
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
}) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading finance overview">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={170} />

      {/* 4 Financial Stat Cards */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />

      {/* Split Finance View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--s4,16px)]">
        <div className="lg:col-span-5">
          <SkeletonChart height={340} />
        </div>
        <div className="lg:col-span-7">
          <SkeletonTable
            columns={[
              { width: '2*', minWidth: '130px' },
              { width: '1.5*', minWidth: '100px' },
              { width: '1.5*', minWidth: '100px' },
              { width: '1.2*', minWidth: '90px' },
            ]}
            rowCount={5}
            showHeaderControls={false}
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 14. Universal Full-Screen Collection Skeleton (Header + 3-Card Pod Tray + Table/Grid)
// ==========================================
export interface SkeletonCollectionScreenProps {
  kpiCount?: number;
  kpiLayout?: string;
  columns?: SkeletonColumnDef[];
  viewMode?: 'list' | 'grid';
  hasIcon?: boolean;
  hasViewToggle?: boolean;
  hasFacility?: boolean;
  hasActionBtn?: boolean;
  actionBtnWidth?: number;
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonCollectionScreen: React.FC<SkeletonCollectionScreenProps> = ({
  kpiCount = 3,
  kpiLayout,
  columns = [
    { width: '2.5*', minWidth: '180px' },
    { width: '1.8*', minWidth: '140px' },
    { width: '1.5*', minWidth: '120px' },
    { width: '1.2*', minWidth: '100px' },
    { width: '1.2*', minWidth: '100px' },
    { width: '100px' },
  ],
  viewMode = 'list',
  hasIcon = true,
  hasViewToggle = true,
  hasFacility = false,
  hasActionBtn = true,
  actionBtnWidth = 156,
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
}) => {
  const gridColsClass = kpiLayout || (kpiCount === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3');

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading collection view">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      
      {/* 1. Member-style Header Bar */}
      <div className="pb-[var(--s2,8px)]">
        <SkeletonPageHeader
          hasIcon={hasIcon}
          hasViewToggle={false}
          hasFacility={hasFacility}
          hasActionBtn={hasActionBtn}
          actionBtnWidth={actionBtnWidth}
        />
      </div>

      {/* 2. Top Metric Pod Tray (#F3EDE7, CornerRadius 28px) with 2 White + 1 Dark #1F1D1B Cards */}
      {kpiCount > 0 && (
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--s3,12px)]"
        >
          <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)]">
            <SkeletonText size="sm" width="220px" />
          </div>
          <div className={`grid ${gridColsClass} gap-[var(--card-gap,12px)]`}>
            {Array.from({ length: kpiCount }).map((_, i) => {
              const isDarkCard = kpiCount >= 3 && i === kpiCount - 1;
              return (
                <div
                  key={`coll_kpi_${i}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className={`p-[var(--card-pad,20px)] flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)] ${
                    isDarkCard
                      ? 'bg-[#22201E] [--sq-stroke:var(--sq-stroke-obsidian)]'
                      : 'bg-white dark:bg-[#22201E]'
                  }`}
                >
                  <div className="flex flex-col gap-[var(--s2,8px)]">
                    <div className="flex items-center justify-between gap-[var(--s2,8px)]">
                      <SkeletonText size="xs" width="128px" className={isDarkCard ? '!bg-white/15' : ''} />
                      {isDarkCard && <SkeletonBox width={72} height={24} rounded="rounded-full" className="!bg-[#3D2817]" />}
                    </div>
                    {!isDarkCard && <SkeletonBox width={88} height={24} rounded="rounded-full" />}
                  </div>
                  <div className="flex flex-col gap-[var(--s2,8px)] mt-auto">
                    <SkeletonText
                      size="2xl"
                      width="72px"
                      className={isDarkCard ? '!bg-[#FB923C]/40' : ''}
                    />
                    {isDarkCard && <SkeletonText size="xs" width="160px" className="!bg-white/10" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Collection Pod (#F3EDE7): 5 Toolbar Controls + Table / Grid */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--s3,12px)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-[var(--s3,12px)] px-[var(--s3,12px)] pt-[var(--s1,4px)]">
          <SkeletonText size="sm" width="180px" />
          <div className="flex flex-wrap items-center gap-[var(--s2,8px)] ms-auto">
            <SkeletonBox width={40} height={40} sq="ctl" />
            <SkeletonBox width={210} height={40} sq="ctl" />
            <SkeletonBox width={96} height={40} sq="ctl" />
            {hasViewToggle && <SkeletonBox width={84} height={40} sq="ctl" />}
            <SkeletonBox width={148} height={40} sq="ctl" className="!bg-[#d4522f]/25" />
          </div>
        </div>

        {viewMode === 'list' ? (
          <SkeletonTable columns={columns} rowCount={6} showHeaderControls={false} />
        ) : (
          <SkeletonCardGrid count={6} />
        )}
      </div>
    </div>
  );
};

// ==========================================
// 15. Dedicated Salon & Beauty Dashboard Skeleton (AppointmentDashboardView)
// ==========================================
export const SkeletonDashboardSalon: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading salon dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="190px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="220px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="donut" spanClass="col-span-1 lg:col-span-4" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="230px">
      <SkeletonPodCard kind="timeline" spanClass="col-span-full" />
      <SkeletonPodCard kind="waffle" spanClass="col-span-1" featured />
      <SkeletonPodCard kind="ranked" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 16. Dedicated POS & Retail Dashboard Skeleton (PosDashboardView)
// ==========================================
export const SkeletonDashboardPos: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading POS dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="195px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="215px">
      <SkeletonPodCard kind="area" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-5" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="250px">
      <SkeletonPodCard kind="heatmap" spanClass="col-span-full" />
      <SkeletonPodCard kind="treemap" spanClass="col-span-1" />
      <SkeletonPodCard kind="ranked" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 17. Dedicated Education & Academy Dashboard Skeleton (EducationDashboardView)
// ==========================================
export const SkeletonDashboardEducation: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading education dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="195px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="225px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="histogram" spanClass="col-span-full" />
      <SkeletonPodCard kind="heatmap" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 18. Dedicated Medical & Clinic Dashboard Skeleton (MedicalDashboardView)
// ==========================================
export const SkeletonDashboardMedical: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading medical dashboard" extraActionsCount={2} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="205px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="245px">
      <SkeletonPodCard kind="heatmap" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="radar" spanClass="col-span-1 lg:col-span-5" featured />
      <SkeletonPodCard kind="timeline" spanClass="col-span-full" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="220px">
      <SkeletonPodCard kind="donut" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 19. Dedicated Auto Garage Dashboard Skeleton (AutoGarageDashboardView)
// ==========================================
export const SkeletonDashboardGarage: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading garage dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="200px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="215px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="230px">
      <SkeletonPodCard kind="timeline" spanClass="col-span-full" />
      <SkeletonPodCard kind="waffle" spanClass="col-span-1" />
      <SkeletonPodCard kind="ranked" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 20. Dedicated Real Estate Dashboard Skeleton (RealEstateDashboardView)
// ==========================================
export const SkeletonDashboardRealEstate: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading real estate dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="210px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="220px">
      <SkeletonPodCard kind="bubble" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="donut" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="bullet" spanClass="col-span-full" />
      <SkeletonPodCard kind="dumbbell" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 21. Dedicated Manufacturing Dashboard Skeleton (ManufacturingDashboardView)
// ==========================================
export const SkeletonDashboardManufacturing: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading manufacturing dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="split84" titleWidth="215px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1 lg:col-span-6" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1 lg:col-span-6" />
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="gauge" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="bars" spanClass="col-span-full" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1" />
      <SkeletonPodCard kind="radar" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 22. Dedicated Legal & Notary Dashboard Skeleton (LegalDashboardView)
// ==========================================
export const SkeletonDashboardLegal: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading legal dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="195px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="215px">
      <SkeletonPodCard kind="area" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="ranked" spanClass="col-span-full" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
      <SkeletonPodCard kind="dumbbell" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 23. Dedicated Logistics & Delivery Dashboard Skeleton (LogisticsDashboardView)
// ==========================================
export const SkeletonDashboardLogistics: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading logistics dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="205px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="220px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="235px">
      <SkeletonPodCard kind="histogram" spanClass="col-span-full" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
      <SkeletonPodCard kind="ranked" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 24. Dedicated Contractor / BTP Dashboard Skeleton (ContractorDashboardView)
// ==========================================
export const SkeletonDashboardContractor: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading contractor dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="200px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="225px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="gauge" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="dumbbell" spanClass="col-span-full" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1" />
      <SkeletonPodCard kind="treemap" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 25. Dedicated Agriculture Dashboard Skeleton (AgricultureDashboardView)
// ==========================================
export const SkeletonDashboardAgriculture: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading agriculture dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="210px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split75" titleWidth="225px">
      <SkeletonPodCard kind="area" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="radar" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="240px">
      <SkeletonPodCard kind="dumbbell" spanClass="col-span-full" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1" />
      <SkeletonPodCard kind="treemap" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 26. Dedicated Freelance Dashboard Skeleton (FreelanceDashboardView)
// ==========================================
export const SkeletonDashboardFreelance: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading freelance dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="205px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="215px">
      <SkeletonPodCard kind="area" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="gauge" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="dumbbell" spanClass="col-span-full" />
      <SkeletonPodCard kind="donut" spanClass="col-span-1" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 27. Dedicated Venue Dashboard Skeleton (VenueDashboardView)
// ==========================================
export const SkeletonDashboardVenue: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading venue dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="195px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="215px">
      <SkeletonPodCard kind="area" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="gauge" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="235px">
      <SkeletonPodCard kind="timeline" spanClass="col-span-full" />
      <SkeletonPodCard kind="waffle" spanClass="col-span-1" featured />
      <SkeletonPodCard kind="donut" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 28. Dedicated B2B Trading Dashboard Skeleton (TradingDashboardView)
// ==========================================
export const SkeletonDashboardTrading: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading trading dashboard" extraActionsCount={1} {...props}>
    <SkeletonPodSection layout="split75" titleWidth="225px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1 lg:col-span-6" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1 lg:col-span-6" featured />
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-7" />
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-5" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="240px">
      <SkeletonPodCard kind="bubble" spanClass="col-span-full" />
      <SkeletonPodCard kind="treemap" spanClass="col-span-1" />
      <SkeletonPodCard kind="bullet" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 29. Dedicated Project Direction Dashboard Skeleton (ProjectDirectionView)
// ==========================================
export const SkeletonDashboardProject: React.FC<SkeletonDashboardProps> = (props) => (
  <SkeletonDashboardShell ariaLabel="Loading project direction" extraActionsCount={2} {...props}>
    <SkeletonPodSection layout="equal" titleWidth="205px">
      <SkeletonPodCard kind="kpi-spark" spanClass="col-span-1" />
      <SkeletonPodCard kind="kpi-inverse" spanClass="col-span-1" />
    </SkeletonPodSection>
    <SkeletonPodSection layout="split84" titleWidth="220px">
      <SkeletonPodCard kind="bars" spanClass="col-span-1 lg:col-span-8" />
      <SkeletonPodCard kind="gauge" spanClass="col-span-1 lg:col-span-4" featured />
    </SkeletonPodSection>
    <SkeletonPodSection layout="equal" titleWidth="245px">
      <SkeletonPodCard kind="bullet" spanClass="col-span-full" />
      <SkeletonPodCard kind="funnel" spanClass="col-span-1" />
      <SkeletonPodCard kind="ranked" spanClass="col-span-1" />
    </SkeletonPodSection>
  </SkeletonDashboardShell>
);

// ==========================================
// 30. Dedicated Cross-Vertical Analytics Skeleton (AnalyticsScreen)
// ==========================================
export const SkeletonAnalytics: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200" role="status" aria-label="Loading analytics">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={140} />

      {/* 4 BI Metric Pods */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* Multi-series Margin & Revenue Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--s4,16px)]">
        <div className="lg:col-span-8">
          <SkeletonChart height={340} />
        </div>
        <div
          data-sq="card"
          data-sq-border="solid"
          className="lg:col-span-4 p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s4,16px)]"
        >
          <SkeletonText size="base" width="160px" />
          <div className="flex flex-col gap-[var(--s3,12px)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`cat_${i}`} className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex justify-between">
                  <SkeletonText size="xs" width="80px" />
                  <SkeletonText size="xs" width="50px" />
                </div>
                <SkeletonBox height={8} className="w-full" rounded="rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 31. 4-Row Multi-Pod Home Reception Skeleton
// ==========================================
const HOME_RATIO_CLASS_MAP: Record<string, string> = {
  membership_session: 'lg:grid-cols-[38fr_62fr]',
  membership_fitness: 'lg:grid-cols-[38fr_62fr]',
  appointment_service: 'lg:grid-cols-[42fr_58fr]',
  pos_inventory: 'lg:grid-cols-[40fr_60fr]',
  project_milestone: 'lg:grid-cols-[42fr_58fr]',
  rental_booking: 'lg:grid-cols-[40fr_60fr]',
  education_cohort: 'lg:grid-cols-[40fr_60fr]',
  freelance_solo: 'lg:grid-cols-[40fr_60fr]',
  trading_commercial: 'lg:grid-cols-[45fr_55fr]',
  medical_clinic: 'lg:grid-cols-[38fr_62fr]',
  auto_garage: 'lg:grid-cols-[40fr_60fr]',
  real_estate: 'lg:grid-cols-[42fr_58fr]',
  manufacturing_production: 'lg:grid-cols-[36fr_64fr]',
  legal_accounting: 'lg:grid-cols-[42fr_58fr]',
  logistics_delivery: 'lg:grid-cols-[44fr_56fr]',
  construction_contractor: 'lg:grid-cols-[44fr_56fr]',
  agriculture_farming: 'lg:grid-cols-[42fr_58fr]',
};

const SkeletonHomePreviewBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div
    data-sq="card"
    data-sq-border="solid"
    className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] gap-[var(--card-gap,12px)] h-full flex flex-col justify-between"
  >
    <div className="flex flex-col gap-[var(--card-gap,12px)]">
      <div className="flex items-start justify-between gap-[var(--card-head-gap,12px)]">
        <div className="flex items-center gap-[var(--card-head-gap,12px)] min-w-0 flex-1">
          <SkeletonBox width={40} height={40} sq="tile" className="shrink-0" />
          <div className="flex flex-col gap-[var(--s1,4px)] flex-1">
            <SkeletonText size="sm" width="56%" />
            <SkeletonText size="xs" width="40%" />
          </div>
        </div>
        <SkeletonCircle size={32} />
      </div>
      <div className="divide-y divide-[var(--atr-divider)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`hrow_${i}`} className="py-[var(--s2,8px)] flex items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s1,4px)] flex-1">
              <SkeletonText size="sm" width="68%" />
              <SkeletonText size="xs" width="46%" />
            </div>
            <SkeletonText size="xs" width="52px" />
          </div>
        ))}
      </div>
    </div>
    <div className="pt-[var(--s2,8px)] border-t border-[var(--atr-divider)] flex justify-between">
      <SkeletonText size="xs" width="56px" />
      <SkeletonText size="xs" width="64px" />
    </div>
  </div>
);

export const SkeletonHomeView: React.FC<{
  category?: string;
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ category = 'membership_session', isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  const ratioClass = HOME_RATIO_CLASS_MAP[category] || 'lg:grid-cols-[40fr_60fr]';

  return (
    <div
      role="status"
      aria-label="Loading reception hall"
      className="min-h-full flex flex-col gap-[var(--pod-gap,16px)] animate-in fade-in duration-200"
    >
      <span className="sr-only">Loading home screen...</span>
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />

      {/* Welcome Greeting Header Skeleton */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-[var(--s4,16px)] shrink-0">
        <div className="flex items-center gap-[var(--ph-gap,16px)] flex-1">
          <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
          <div className="flex flex-col gap-[var(--ph-sub-gap,4px)] flex-1 max-w-md">
            <SkeletonText size="xl" width="76%" />
            <SkeletonText size="xs" width="58%" />
          </div>
        </div>
        <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
          <SkeletonButton width={140} height={40} />
          <SkeletonButton width={160} height={40} />
        </div>
      </div>

      {/* Row 1: Hero Anchor Pod + Priority Action Pod */}
      <div className={`grid grid-cols-1 ${ratioClass} gap-[var(--pod-gap,16px)] items-stretch`}>
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F2E6DA] dark:bg-[#1D1916] p-[var(--pod-pad,12px)] gap-[var(--s3,12px)] flex flex-col"
        >
          <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)]">
            <SkeletonText size="base" width="150px" />
          </div>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="bg-[#231914] [--sq-stroke:var(--sq-stroke-obsidian)] p-[var(--card-pad,20px)] min-h-[118px] flex flex-col justify-between shrink-0"
          >
            <SkeletonText size="xs" width="45%" />
            <SkeletonText size="xl" width="60%" />
          </div>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="bg-white dark:bg-[#22201E] p-[var(--s3,12px)] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1">
              <SkeletonBox width={36} height={36} sq="tile" className="shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <SkeletonText size="sm" width="52%" />
                <SkeletonText size="xs" width="70%" />
              </div>
            </div>
            <SkeletonText size="xs" width="54px" />
          </div>
        </div>

        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#EFEBF7] dark:bg-[#1D1924] p-[var(--pod-pad,12px)] gap-[var(--s3,12px)] flex flex-col"
        >
          <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)]">
            <SkeletonText size="base" width="165px" />
          </div>
          <SkeletonHomePreviewBlock rows={4} />
        </div>
      </div>

      {/* Row 2: Full-Width Operational Modules Row */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-[#EFEBF7] dark:bg-[#1D1924] p-[var(--pod-pad,12px)] gap-[var(--s3,12px)] flex flex-col"
      >
        <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)]">
          <SkeletonText size="base" width="180px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--card-gap,12px)] auto-rows-fr">
          <SkeletonHomePreviewBlock rows={3} />
          <SkeletonHomePreviewBlock rows={3} />
          <SkeletonHomePreviewBlock rows={3} />
        </div>
      </div>

      {/* Row 3: Live Daily Historique Feed Skeleton */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-[#FAF6F1] dark:bg-[#191716] p-[var(--pod-pad,12px)] gap-[var(--s3,12px)] flex flex-col"
      >
        <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)] flex flex-wrap items-center justify-between gap-3">
          <SkeletonText size="base" width="190px" />
          <div className="flex items-center gap-2">
            <SkeletonButton width={160} height={32} />
            <SkeletonButton width={76} height={28} />
            <SkeletonButton width={76} height={28} />
          </div>
        </div>
        <div
          data-sq="card"
          data-sq-border="solid"
          className="bg-white dark:bg-[#22201E] divide-y divide-[var(--atr-divider)] px-[var(--card-pad,16px)]"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`hhist_${i}`} className="py-[var(--s3,12px)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SkeletonBox width={34} height={34} sq="tile" className="shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <SkeletonText size="sm" width="54%" />
                  <SkeletonText size="xs" width="38%" />
                </div>
              </div>
              <SkeletonText size="sm" width="76px" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Category Setup Checklist Strip Skeleton */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F7F2EC] dark:bg-[#191716] p-[var(--pod-pad,12px)] gap-[var(--s3,12px)] flex flex-col"
        >
          <div className="px-[var(--s3,12px)] pt-[var(--s1,4px)] flex items-center justify-between gap-3">
            <SkeletonText size="base" width="210px" />
            <SkeletonButton width={130} height={32} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[var(--card-gap,12px)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`hstep_${i}`}
                data-sq="card"
                data-sq-border="solid"
                className="bg-white dark:bg-[#22201E] p-[var(--s3,14px)] flex flex-col gap-2"
            >
              <SkeletonText size="xs" width="52%" />
              <SkeletonText size="sm" width="84%" />
              <SkeletonText size="xs" width="66%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
