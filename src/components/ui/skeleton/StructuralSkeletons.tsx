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
      className={`grid ${columns} gap-3 md:gap-4 mb-6`}
    >
      <span className="sr-only">Loading metrics...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`kpi_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-4 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col justify-between h-[104px]"
        >
          <div className="flex items-center justify-between">
            <SkeletonText size="xs" width="45%" />
            <SkeletonCircle size={28} />
          </div>
          <div className="space-y-1.5 mt-2">
            <SkeletonText size="xl" width="60%" />
            <SkeletonText size="xs" width="30%" />
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
      className="w-full flex flex-col gap-3"
    >
      <span className="sr-only">Loading records...</span>

      {/* Top Filter & Search Bar Skeleton */}
      {showHeaderControls && (
        <div
          data-sq="card"
          data-sq-border="solid"
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
        >
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <SkeletonBox height={36} className="w-full" sq="ctl" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox width={100} height={36} sq="ctl" />
            <SkeletonBox width={80} height={36} sq="ctl" />
            <SkeletonCircle size={36} />
          </div>
        </div>
      )}

      {/* Table Surface */}
      <div
        data-sq="table"
        data-sq-border="solid"
        className="w-full bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
      >
        {/* Table Header Row */}
        <div className="flex items-center px-4 py-3 border-b border-[#E6DED6] dark:border-neutral-800 bg-[#F3EDE7]/80 dark:bg-neutral-900/50 gap-3">
          <SkeletonBox width={18} height={18} rounded="rounded-[var(--r-check,6px)]" className="shrink-0 mr-1" />
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
        <div className="divide-y divide-[#E6DED6] dark:divide-neutral-800/80">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={`tr_skel_${rowIdx}`}
              className="flex items-center px-4 py-3.5 gap-3"
            >
              <SkeletonBox width={18} height={18} rounded="rounded-[var(--r-check,6px)]" className="shrink-0 mr-1" />
              {columns.map((col, colIdx) => (
                <div
                  key={`td_skel_${rowIdx}_${colIdx}`}
                  style={{
                    flex: col.width?.includes('*') ? col.width.replace('*', '') : undefined,
                    width: !col.width?.includes('*') ? col.width : undefined,
                    minWidth: col.minWidth || '80px',
                  }}
                  className="flex items-center gap-2"
                >
                  {colIdx === 0 ? (
                    <>
                      <SkeletonCircle size={28} />
                      <div className="space-y-1 w-full max-w-[140px]">
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
    >
      <span className="sr-only">Loading grid items...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-5 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={40} />
              <div className="space-y-1.5 w-32">
                <SkeletonText size="base" width="90%" />
                <SkeletonText size="xs" width="60%" />
              </div>
            </div>
            <SkeletonCircle size={24} />
          </div>

          <div className="my-3 space-y-2 py-2 border-y border-[#E6DED6] dark:border-neutral-800/80">
            <div className="flex justify-between items-center">
              <SkeletonText size="xs" width="30%" />
              <SkeletonText size="xs" width="40%" />
            </div>
            <div className="flex justify-between items-center">
              <SkeletonText size="xs" width="25%" />
              <SkeletonText size="xs" width="35%" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <SkeletonButton width={75} height={28} />
            <SkeletonCircle size={28} />
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
      className="space-y-4 py-2"
    >
      <span className="sr-only">Loading form data...</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fieldsCount }).map((_, i) => (
          <div key={`field_skel_${i}`} className={`space-y-1.5 ${i === 0 ? 'md:col-span-2' : ''}`}>
            <SkeletonText size="xs" width="35%" />
            <SkeletonBox height={42} className="w-full" sq="ctl" />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-end gap-3 mt-6">
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
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 p-4"
    >
      <span className="sr-only">Loading kiosk options...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`kiosk_skel_${i}`}
          data-sq="card"
          data-sq-border="solid"
          className="p-4 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col items-center justify-center text-center h-[130px] space-y-2.5"
        >
          <SkeletonCircle size={44} />
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
      className="w-full p-5 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col justify-between"
    >
      <span className="sr-only">Loading chart data...</span>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5 w-40">
          <SkeletonText size="base" width="80%" />
          <SkeletonText size="xs" width="50%" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton width={60} height={28} />
          <SkeletonButton width={60} height={28} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 h-44 px-4 py-2 border-b border-l border-[#E6DED6] dark:border-neutral-800">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['55%', '85%', '40%', '95%', '65%', '75%', '50%', '90%'];
          return (
            <div key={`chart_bar_${i}`} className="flex-1 flex flex-col items-center gap-2">
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
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1"
    >
      <div className="flex items-center gap-3">
        {hasIcon && (
          <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
        )}
        <div className="space-y-1.5">
          <SkeletonText size="xl" width="180px" />
          <SkeletonText size="xs" width="280px" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
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
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading schedule roster">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={onRetry}
      />

      {/* Header */}
      <SkeletonPageHeader hasViewToggle hasFacility={hasFacility} hasActionBtn={hasActionBtn} actionBtnWidth={actionBtnWidth} />

      {/* KPI Pod Tray matching Screenshot_69 (Weekly Session Matrix & Attendance Roster) */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-[#F3EDE7] dark:bg-[#141312] p-3 space-y-3 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D]"
      >
        <div className="space-y-1 px-2 pt-1">
          <SkeletonText size="sm" width="240px" />
          <SkeletonText size="xs" width="340px" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Scheduled Class Roster */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-5 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] flex flex-col justify-between h-[124px]"
          >
            <div>
              <SkeletonText size="xs" width="130px" />
              <div className="mt-2">
                <SkeletonBox width={85} height={18} rounded="rounded-full" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <SkeletonText size="2xl" width="50px" />
              <SkeletonText size="xs" width="60px" />
            </div>
          </div>

          {/* Card 2: Athlètes Inscrits au total */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-5 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] flex flex-col justify-between h-[124px]"
          >
            <div>
              <SkeletonText size="xs" width="140px" />
              <div className="mt-2">
                <SkeletonBox width={95} height={18} rounded="rounded-full" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <SkeletonText size="2xl" width="50px" />
              <SkeletonText size="xs" width="65px" />
            </div>
          </div>

          {/* Card 3: Affluence maximale en salle */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-5 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] flex flex-col justify-between h-[124px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="150px" />
              <SkeletonBox width={75} height={18} rounded="rounded-full" />
            </div>
            <div className="space-y-1">
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
  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4 pb-1 min-w-0">
    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
      <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
      <SkeletonText size="2xl" width="210px" />
    </div>
    <div className="flex items-center gap-2 flex-wrap">
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
      ? 'grid-cols-1 md:grid-cols-2 gap-3'
      : 'grid-cols-1 lg:grid-cols-12 gap-3';

  return (
    <section
      data-sq="panel"
      data-sq-border="solid"
      className="bg-[#F3EDE7] dark:bg-[#141312] p-3 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] space-y-3"
    >
      <div className="flex items-center justify-between gap-3 px-2 pt-1">
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
    ? 'bg-[#151413] [--sq-stroke:#2A2826]'
    : 'bg-white dark:bg-[#151413] [--sq-stroke:#E4DCD5] dark:[--sq-stroke:#2A2826]';
  const mutedBoxClass = featured ? '!bg-white/10' : '';
  const accentBoxClass = featured ? '!bg-[#ee7452]/35' : '!bg-[#d4522f]/25';

  return (
    <div
      data-sq="card"
      data-sq-border="solid"
      className={`${spanClass} ${surfaceClass} p-5 flex flex-col justify-between gap-4 ${
        isKpi ? 'min-h-[164px]' : 'min-h-[250px]'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SkeletonText size="sm" width="52%" className={mutedBoxClass} />
            <SkeletonCircle size={16} className={mutedBoxClass} />
          </div>
          <SkeletonText size="xs" width="68%" className={mutedBoxClass} />
        </div>
        {hasFilter && (
          <SkeletonBox
            width={92}
            height={28}
            rounded="rounded-full"
            className={`shrink-0 ${mutedBoxClass}`}
          />
        )}
      </div>

      {/* Card Body */}
      {isKpi ? (
        <div className="flex items-end justify-between gap-4 pt-1">
          <div className="space-y-2 flex-1">
            <SkeletonText size="2xl" width="136px" className={mutedBoxClass} />
            <SkeletonBox
              width={68}
              height={22}
              rounded="rounded-full"
              className={kind === 'kpi-inverse' ? accentBoxClass : mutedBoxClass}
            />
          </div>
          <div className="flex items-end gap-1.5 h-12 shrink-0">
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
        <div className="flex items-center justify-between gap-4 py-2 flex-1">
          <SkeletonCircle size={126} className={`mx-auto ${mutedBoxClass}`} />
          <div className="space-y-2.5 flex-1">
            {[75, 58, 66].map((w, i) => (
              <div key={`leg_${i}`} className="flex items-center justify-between gap-2">
                <SkeletonText size="xs" width={`${w}%`} className={mutedBoxClass} />
                <SkeletonText size="xs" width="28px" className={mutedBoxClass} />
              </div>
            ))}
          </div>
        </div>
      ) : kind === 'waffle' ? (
        <div className="space-y-3 flex-1 flex flex-col justify-end">
          <div className="flex items-baseline justify-between">
            <SkeletonText size="2xl" width="84px" className={mutedBoxClass} />
            <SkeletonText size="xs" width="70px" className={mutedBoxClass} />
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 30 }).map((_, i) => (
              <SkeletonBox
                key={`waf_${i}`}
                height={14}
                rounded="rounded-[var(--r-check,6px)]"
                className={i < 19 ? accentBoxClass : mutedBoxClass}
              />
            ))}
          </div>
        </div>
      ) : kind === 'heatmap' ? (
        <div className="grid grid-cols-8 gap-1.5 py-1 flex-1 items-center">
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
        <div className="space-y-2.5 py-1 flex-1 flex flex-col justify-center">
          {[68, 52, 78, 44].map((w, i) => (
            <div key={`tl_${i}`} className="flex items-center gap-3">
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
        <div className="grid grid-cols-12 gap-2 h-[156px]">
          <SkeletonBox height="100%" sq="ctl" className={`col-span-7 ${accentBoxClass}`} />
          <div className="col-span-5 grid grid-rows-2 gap-2">
            <SkeletonBox height="100%" sq="ctl" className={mutedBoxClass} />
            <SkeletonBox height="100%" sq="ctl" className={mutedBoxClass} />
          </div>
        </div>
      ) : kind === 'bubble' ? (
        <div className="relative h-[160px] border-b border-l border-[#E6DED6] dark:border-neutral-800 flex items-center justify-around px-4">
          <SkeletonCircle size={26} className={mutedBoxClass} />
          <SkeletonCircle size={42} className={accentBoxClass} />
          <SkeletonCircle size={22} className={mutedBoxClass} />
          <SkeletonCircle size={34} className={mutedBoxClass} />
          <SkeletonCircle size={30} className={accentBoxClass} />
        </div>
      ) : kind === 'radar' ? (
        <div className="flex items-center justify-center py-2 flex-1">
          <SkeletonCircle size={142} className={mutedBoxClass} />
        </div>
      ) : kind === 'bullet' || kind === 'ranked' || kind === 'funnel' || kind === 'dumbbell' ? (
        <div className="space-y-3 py-1 flex-1 flex flex-col justify-center">
          {[88, 72, 58, 44].map((w, i) => (
            <div key={`hb_${i}`} className="space-y-1">
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
        <div className="flex items-end justify-between gap-2.5 h-[156px] pt-2 px-1 border-b border-[#E6DED6] dark:border-neutral-800">
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
    className="space-y-5 sm:space-y-6 animate-in fade-in duration-200"
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
    <div className="space-y-4 animate-in fade-in duration-200" role="status" aria-label="Loading POS register">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={onRetry}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <SkeletonBox width={40} height={40} sq="tile" />
          <div className="space-y-1">
            <SkeletonText size="lg" width="160px" />
            <SkeletonText size="xs" width="220px" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox width={120} height={38} sq="ctl" />
          <SkeletonBox width={140} height={38} sq="ctl" className="!bg-[#d4522f]/25" />
        </div>
      </div>

      {/* Split 65 / 35 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left Column (65%): Category Pills + Product Catalog Grid */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Category Capsules */}
          <div className="flex items-center gap-2 overflow-hidden py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={`cat_pill_${i}`} width={i === 0 ? 60 : 90} height={34} rounded="rounded-full" />
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`pos_prod_${i}`}
                data-sq="card"
                data-sq-border="solid"
                className="p-3.5 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col justify-between h-[155px]"
              >
                <div className="flex items-start gap-2.5">
                  <SkeletonBox width={44} height={44} sq="tile" className="shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <SkeletonText size="sm" width="90%" />
                    <SkeletonText size="xs" width="60%" />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between">
                  <SkeletonText size="base" width="70px" className="!bg-[#d4522f]/25" />
                  <SkeletonCircle size={28} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (35%): Cashier Ticket Receipt */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="lg:col-span-4 p-5 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
              <SkeletonText size="sm" width="120px" />
              <SkeletonBox width={70} height={22} rounded="rounded-full" />
            </div>

            {/* Line items */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`ticket_line_${i}`} className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <SkeletonText size="xs" width="110px" />
                    <SkeletonText size="xs" width="60px" />
                  </div>
                  <SkeletonText size="sm" width="65px" />
                </div>
              ))}
            </div>
          </div>

          {/* Subtotals & Payment CTA */}
          <div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <SkeletonText size="xs" width="70px" />
                <SkeletonText size="xs" width="60px" />
              </div>
              <div className="flex justify-between">
                <SkeletonText size="xs" width="50px" />
                <SkeletonText size="xs" width="50px" />
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <SkeletonText size="base" width="80px" />
                <SkeletonText size="lg" width="90px" className="!bg-[#d4522f]/30" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
              <SkeletonBox height={36} sq="ctl" sqBorder="none" />
            </div>

            <SkeletonButton height={46} className="w-full !bg-[#d4522f]/35" />
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
    <div className="space-y-5 animate-in fade-in duration-200" role="status" aria-label="Loading calendar timetable">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} onRetry={onRetry} />
      <SkeletonPageHeader hasViewToggle hasFacility hasActionBtn />

      {/* Date ribbon bar */}
      <div
        data-sq="card"
        data-sq-border="solid"
        className="p-3 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-1.5">
          <SkeletonCircle size={32} />
          <SkeletonText size="sm" width="130px" />
          <SkeletonCircle size={32} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBox key={`day_ribbon_${i}`} width={55} height={42} sq="ctl" />
          ))}
        </div>
      </div>

      {/* Resource Column Grid */}
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] p-3"
      >
        {/* Column Headers (Stylists / Rooms) */}
        <div className="grid grid-cols-4 gap-4 px-2 py-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`col_hdr_${i}`} className="flex items-center gap-2">
              <SkeletonCircle size={30} />
              <div className="space-y-1">
                <SkeletonText size="xs" width="80px" />
                <SkeletonText size="xs" width="50px" />
              </div>
            </div>
          ))}
        </div>

        {/* Time-Slot Rows */}
        <div className="grid grid-cols-4 gap-3 pt-3 min-h-[380px]">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div key={`slot_col_${colIdx}`} className="space-y-3">
              {Array.from({ length: 3 }).map((_, slotIdx) => (
                <div
                  key={`slot_card_${colIdx}_${slotIdx}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-800/60 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonText size="xs" width="60px" />
                    <SkeletonBox width={45} height={16} rounded="rounded-full" />
                  </div>
                  <SkeletonText size="sm" width="95%" />
                  <div className="flex items-center gap-2 pt-1">
                    <SkeletonCircle size={18} />
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
    <div className="space-y-5 animate-in fade-in duration-200" role="status" aria-label="Loading kanban pipeline">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasActionBtn />

      {/* Multi-column Kanban swimlanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[500px]">
        {Array.from({ length: columnsCount }).map((_, colIdx) => (
          <div
            key={`kanban_col_${colIdx}`}
            data-sq="panel"
            data-sq-border="solid"
            className="p-3 bg-[#F3EDE7] dark:bg-[#141312] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] flex flex-col space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-[#E6DED6] dark:border-neutral-700/60">
              <SkeletonText size="sm" width="110px" />
              <SkeletonBox width={26} height={20} rounded="rounded-full" />
            </div>

            {/* Draggable Task Cards */}
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div
                  key={`kcard_${colIdx}_${cardIdx}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-4 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBox width={65} height={16} rounded="rounded-full" />
                    <SkeletonCircle size={18} />
                  </div>
                  <SkeletonText size="sm" width="90%" />
                  <SkeletonText size="xs" width="60%" />
                  <div className="pt-2 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between">
                    <SkeletonCircle size={22} />
                    <SkeletonText size="xs" width="55px" />
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
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading finance overview">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={170} />

      {/* 4 Financial Stat Cards */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />

      {/* Split Finance View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading collection view">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      
      {/* 1. Member-style Header Bar */}
      <SkeletonPageHeader
        hasIcon={hasIcon}
        hasViewToggle={false}
        hasFacility={hasFacility}
        hasActionBtn={hasActionBtn}
        actionBtnWidth={actionBtnWidth}
      />

      {/* 2. Top Metric Pod Tray (#F3EDE7, CornerRadius 28px) with 2 White + 1 Dark #1F1D1B Cards */}
      {kpiCount > 0 && (
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F3EDE7] dark:bg-[#141312] p-3 space-y-3 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D]"
        >
          <div className="px-2 pt-1">
            <SkeletonText size="sm" width="220px" />
          </div>
          <div className={`grid ${gridColsClass} gap-3`}>
            {Array.from({ length: kpiCount }).map((_, i) => {
              const isDarkCard = kpiCount >= 3 && i === kpiCount - 1;
              return (
                <div
                  key={`coll_kpi_${i}`}
                  data-sq="card"
                  data-sq-border="solid"
                  className={`p-4.5 sm:p-5 flex flex-col justify-between min-h-[132px] ${
                    isDarkCard
                      ? 'bg-[#1F1D1B] [--sq-stroke:rgba(255,255,255,0.08)]'
                      : 'bg-white dark:bg-neutral-800/90 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <SkeletonText size="xs" width="128px" className={isDarkCard ? '!bg-white/15' : ''} />
                      {isDarkCard && <SkeletonBox width={72} height={20} rounded="rounded-full" className="!bg-[#3D2817]" />}
                    </div>
                    {!isDarkCard && <SkeletonBox width={88} height={20} rounded="rounded-full" />}
                  </div>
                  <div className="space-y-1.5">
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
        className="bg-[#F3EDE7] dark:bg-[#141312] p-3 space-y-3 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1">
          <SkeletonText size="sm" width="180px" />
          <div className="flex flex-wrap items-center gap-2.5 ms-auto">
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
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading analytics">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={140} />

      {/* 4 BI Metric Pods */}
      <SkeletonKpiGrid count={4} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* Multi-series Margin & Revenue Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SkeletonChart height={340} />
        </div>
        <div
          data-sq="card"
          data-sq-border="solid"
          className="lg:col-span-4 p-6 bg-white dark:bg-[#18181B] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-4"
        >
          <SkeletonText size="base" width="160px" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`cat_${i}`} className="space-y-1">
                <div className="flex justify-between text-xs">
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
// 31. Asymmetric Two-Column Pod Home Reception Skeleton
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
  agriculture_farming: 'lg:grid-cols-[58fr_42fr]',
};

const SkeletonHomePreviewBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div
    data-sq="card"
    data-sq-border="solid"
    className="bg-white dark:bg-[#161413] [--sq-stroke:#E2D6CC] dark:[--sq-stroke:#2E2724] p-3.5 sm:p-4 space-y-2.5 h-full flex flex-col justify-between"
  >
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <SkeletonBox width={36} height={36} sq="tile" className="shrink-0" />
          <div className="space-y-1 flex-1">
            <SkeletonText size="sm" width="56%" />
            <SkeletonText size="xs" width="40%" />
          </div>
        </div>
        <SkeletonCircle size={36} />
      </div>
      <div className="divide-y divide-[#EFE6DF] dark:divide-[#27211E]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`hrow_${i}`} className="py-1.5 flex items-center justify-between gap-2.5">
            <div className="space-y-1 flex-1">
              <SkeletonText size="sm" width="68%" />
              <SkeletonText size="xs" width="46%" />
            </div>
            <SkeletonText size="xs" width="52px" />
          </div>
        ))}
      </div>
    </div>
    <div className="pt-2 border-t border-[#EFE6DF] dark:border-[#27211E] flex justify-between">
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
      className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col space-y-3.5 animate-in fade-in duration-200"
    >
      <span className="sr-only">Loading home screen...</span>
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />

      {/* Welcome Greeting Header Skeleton */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-0.5 shrink-0">
        <div className="flex items-center gap-3.5 flex-1">
          <SkeletonBox width={48} height={48} sq="tile-lg" className="shrink-0" />
          <div className="space-y-1.5 flex-1 max-w-md">
            <SkeletonText size="xl" width="76%" />
            <SkeletonText size="xs" width="58%" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <SkeletonButton width={140} height={38} />
          <SkeletonButton width={160} height={38} />
        </div>
      </div>

      {/* Fixed-Viewport Asymmetric Two-Column Pods */}
      <div className={`lg:flex-1 lg:min-h-0 grid grid-cols-1 ${ratioClass} gap-4 items-stretch`}>
        {/* Left Pulse Pod (Warm Sandstone/Brown) */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F2E6DA] dark:bg-[#191512] [--sq-stroke:#DFCFC0] dark:[--sq-stroke:#382E25] p-3 space-y-3 flex flex-col"
        >
          <div className="px-2 pt-1">
            <SkeletonText size="base" width="150px" />
          </div>
          <div
            data-sq="card"
            data-sq-border="none"
            className="bg-[#231914] p-4 min-h-[108px] flex flex-col justify-between shrink-0"
          >
            <SkeletonText size="xs" width="45%" />
            <SkeletonText size="xl" width="60%" />
          </div>
          <div className="flex-1 min-h-0">
            <SkeletonHomePreviewBlock rows={3} />
          </div>
        </div>

        {/* Right Workspaces Pod (Soft Lavender-Linen 2x2) */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#EFEBF7] dark:bg-[#171420] [--sq-stroke:#DDD4EC] dark:[--sq-stroke:#312A44] p-3 space-y-3 flex flex-col"
        >
          <div className="px-2 pt-1">
            <SkeletonText size="base" width="165px" />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
            <SkeletonHomePreviewBlock rows={3} />
            <SkeletonHomePreviewBlock rows={3} />
            <SkeletonHomePreviewBlock rows={3} />
            <SkeletonHomePreviewBlock rows={3} />
          </div>
        </div>
      </div>
    </div>
  );
};



