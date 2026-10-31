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
          className="p-4 rounded-[20px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs flex flex-col justify-between h-[104px]"
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <SkeletonBox height={36} className="w-full" rounded="rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox width={100} height={36} rounded="rounded-xl" />
            <SkeletonBox width={80} height={36} rounded="rounded-xl" />
            <SkeletonCircle size={36} />
          </div>
        </div>
      )}

      {/* Table Surface */}
      <div className="w-full bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 rounded-[20px] overflow-hidden shadow-xs">
        {/* Table Header Row */}
        <div className="flex items-center px-4 py-3 border-b border-[#EDF1F3] dark:border-neutral-800 bg-[#F8F9FA]/80 dark:bg-neutral-900/50 gap-3">
          <SkeletonBox width={18} height={18} rounded="rounded-xs" className="shrink-0 mr-1" />
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
        <div className="divide-y divide-[#EDF1F3] dark:divide-neutral-800/80">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={`tr_skel_${rowIdx}`}
              className="flex items-center px-4 py-3.5 gap-3"
            >
              <SkeletonBox width={18} height={18} rounded="rounded-xs" className="shrink-0 mr-1" />
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
          className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs flex flex-col justify-between min-h-[170px]"
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

          <div className="my-3 space-y-2 py-2 border-y border-[#EDF1F3] dark:border-neutral-800/80">
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
            <SkeletonBox height={42} className="w-full" rounded="rounded-xl" />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-[#EDF1F3] dark:border-neutral-800 flex items-center justify-end gap-3 mt-6">
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
          className="p-4 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 flex flex-col items-center justify-center text-center h-[130px] space-y-2.5"
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
      className="w-full p-5 bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 rounded-[24px] flex flex-col justify-between"
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

      <div className="flex items-end justify-between gap-3 h-44 px-4 py-2 border-b border-l border-[#EDF1F3] dark:border-neutral-800">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['55%', '85%', '40%', '95%', '65%', '75%', '50%', '90%'];
          return (
            <div key={`chart_bar_${i}`} className="flex-1 flex flex-col items-center gap-2">
              <SkeletonBox
                width="80%"
                height={heights[i % heights.length]}
                rounded="rounded-t-md"
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
  hasFacility = true,
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
          <SkeletonBox width={46} height={46} rounded="rounded-2xl" className="shrink-0" />
        )}
        <div className="space-y-1.5">
          <SkeletonText size="xl" width="180px" />
          <SkeletonText size="xs" width="280px" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {hasViewToggle && (
          <SkeletonBox width={190} height={40} rounded="rounded-2xl" />
        )}
        {hasFacility && (
          <SkeletonBox width={140} height={40} rounded="rounded-xl" />
        )}
        {hasActionBtn && (
          <SkeletonBox
            width={actionBtnWidth}
            height={40}
            rounded="rounded-xl"
            className="!bg-[#C4785A]/25"
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
}

export const SkeletonSchedulerView: React.FC<SkeletonSchedulerViewProps> = ({
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
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
      <SkeletonPageHeader hasViewToggle hasFacility hasActionBtn actionBtnWidth={175} />

      {/* KPI Pod Tray matching Screenshot_69 (Weekly Session Matrix & Attendance Roster) */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="space-y-1">
          <SkeletonText size="sm" width="240px" />
          <SkeletonText size="xs" width="340px" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Scheduled Class Roster */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
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
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
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
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="150px" />
              <SkeletonBox width={75} height={18} rounded="rounded-md" />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="120px" className="!bg-[#C4785A]/30" />
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
// 9. Dedicated Gym Dashboard Skeleton (MembershipDashboardView)
// ==========================================
export interface SkeletonDashboardGymProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}

export const SkeletonDashboardGym: React.FC<SkeletonDashboardGymProps> = ({
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading gym dashboard">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={onRetry}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <SkeletonText size="xl" width="220px" />
          <SkeletonText size="xs" width="300px" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox width={140} height={40} rounded="rounded-xl" />
          <SkeletonBox width={130} height={40} rounded="rounded-xl" className="!bg-[#C4785A]/25" />
        </div>
      </div>

      {/* Row 1: Left Dark Espresso Turnstile Card + Right 3-KPI Cards & Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dark Espresso Pod */}
        <div className="lg:col-span-1 p-6 rounded-[28px] bg-[#18181B] dark:bg-[#121214] border border-neutral-800 shadow-lg flex flex-col justify-between min-h-[340px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="120px" />
              <SkeletonBox width={60} height={20} rounded="rounded-full" />
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <SkeletonCircle size={100} />
              <div className="mt-3 text-center space-y-1">
                <SkeletonText size="2xl" width="70px" />
                <SkeletonText size="xs" width="90px" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <SkeletonText size="xs" width="60px" />
              <SkeletonText size="base" width="40px" />
            </div>
            <SkeletonBox width={110} height={36} rounded="rounded-xl" className="!bg-[#C4785A]/30" />
          </div>
        </div>

        {/* Right Column: 3 KPI Cards + Onboarding Tips */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`gym_kpi_${i}`}
                className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <SkeletonText size="xs" width="60%" />
                  <SkeletonCircle size={24} />
                </div>
                <div className="space-y-1">
                  <SkeletonText size="xl" width="50%" />
                  <SkeletonText size="xs" width="70%" />
                </div>
              </div>
            ))}
          </div>

          {/* Onboarding Tips Carousel Pod */}
          <div className="p-6 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between min-h-[190px]">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <SkeletonBox width={45} height={18} rounded="rounded-md" />
                  <SkeletonText size="sm" width="140px" />
                </div>
                <SkeletonText size="xs" width="380px" />
                <SkeletonText size="xs" width="300px" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#EDF1F3] dark:border-neutral-700/60">
              <SkeletonBox width={130} height={32} rounded="rounded-xl" />
              <div className="flex gap-1.5">
                <SkeletonCircle size={28} />
                <SkeletonCircle size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Live Activity Feed */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <SkeletonText size="base" width="160px" />
            <SkeletonText size="xs" width="220px" />
          </div>
          <div className="flex gap-2">
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
          </div>
        </div>

        <div className="divide-y divide-[#EDF1F3] dark:divide-neutral-800/80">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`act_skel_${idx}`} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={36} />
                <div className="space-y-1">
                  <SkeletonText size="sm" width="130px" />
                  <SkeletonText size="xs" width="190px" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SkeletonText size="xs" width="50px" />
                <SkeletonBox width={70} height={22} rounded="rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
          <SkeletonBox width={40} height={40} rounded="rounded-xl" />
          <div className="space-y-1">
            <SkeletonText size="lg" width="160px" />
            <SkeletonText size="xs" width="220px" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox width={120} height={38} rounded="rounded-xl" />
          <SkeletonBox width={140} height={38} rounded="rounded-xl" className="!bg-[#C4785A]/25" />
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
                className="p-3.5 rounded-[20px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[155px]"
              >
                <div className="flex items-start gap-2.5">
                  <SkeletonBox width={44} height={44} rounded="rounded-xl" className="shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <SkeletonText size="sm" width="90%" />
                    <SkeletonText size="xs" width="60%" />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-800 flex items-center justify-between">
                  <SkeletonText size="base" width="70px" className="!bg-[#C4785A]/25" />
                  <SkeletonCircle size={28} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (35%): Cashier Ticket Receipt */}
        <div className="lg:col-span-4 p-5 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F3] dark:border-neutral-800">
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
          <div className="pt-4 border-t border-[#EDF1F3] dark:border-neutral-800 space-y-3">
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
                <SkeletonText size="lg" width="90px" className="!bg-[#C4785A]/30" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <SkeletonBox height={36} rounded="rounded-xl" />
              <SkeletonBox height={36} rounded="rounded-xl" />
              <SkeletonBox height={36} rounded="rounded-xl" />
            </div>

            <SkeletonButton height={46} className="w-full !bg-[#C4785A]/35" />
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
      <div className="p-3 bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <SkeletonCircle size={32} />
          <SkeletonText size="sm" width="130px" />
          <SkeletonCircle size={32} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBox key={`day_ribbon_${i}`} width={55} height={42} rounded="rounded-xl" />
          ))}
        </div>
      </div>

      {/* Resource Column Grid */}
      <div className="bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 rounded-[24px] p-4 shadow-xs">
        {/* Column Headers (Stylists / Rooms) */}
        <div className="grid grid-cols-4 gap-4 pb-3 border-b border-[#EDF1F3] dark:border-neutral-800">
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
        <div className="grid grid-cols-4 gap-4 pt-4 min-h-[380px]">
          {Array.from({ length: 4 }).map((_, colIdx) => (
            <div key={`slot_col_${colIdx}`} className="space-y-3">
              {Array.from({ length: 3 }).map((_, slotIdx) => (
                <div
                  key={`slot_card_${colIdx}_${slotIdx}`}
                  className="p-3.5 rounded-[18px] bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2"
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
  onRetry?: () => Promise<void> | void;
}

export const SkeletonKanbanPipeline: React.FC<SkeletonKanbanPipelineProps> = ({
  columnsCount = 4,
  isOffline,
  isTimedOut,
  onRetry,
}) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-200" role="status" aria-label="Loading kanban pipeline">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} onRetry={onRetry} />
      <SkeletonPageHeader hasActionBtn />

      {/* Multi-column Kanban swimlanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[500px]">
        {Array.from({ length: columnsCount }).map((_, colIdx) => (
          <div
            key={`kanban_col_${colIdx}`}
            className="p-4 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 flex flex-col space-y-3.5"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F3] dark:border-neutral-700/60">
              <SkeletonText size="sm" width="110px" />
              <SkeletonBox width={26} height={20} rounded="rounded-full" />
            </div>

            {/* Draggable Task Cards */}
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div
                  key={`kcard_${colIdx}_${cardIdx}`}
                  className="p-4 rounded-[20px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBox width={65} height={16} rounded="rounded-full" />
                    <SkeletonCircle size={18} />
                  </div>
                  <SkeletonText size="sm" width="90%" />
                  <SkeletonText size="xs" width="60%" />
                  <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-800 flex items-center justify-between">
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
  onRetry?: () => Promise<void> | void;
}

export const SkeletonFinanceAudit: React.FC<SkeletonFinanceAuditProps> = ({
  isOffline,
  isTimedOut,
  onRetry,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading finance overview">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} onRetry={onRetry} />
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
    { width: '100px' },
  ],
  viewMode = 'list',
  hasIcon = true,
  hasViewToggle = true,
  hasFacility = true,
  hasActionBtn = true,
  actionBtnWidth = 150,
  isOffline,
  isTimedOut,
  lastSyncedAt,
  onRetry,
}) => {
  const gridColsClass = kpiLayout || (kpiCount === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3');

  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading collection view">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      
      {/* 1. Full Page Header Skeleton */}
      <SkeletonPageHeader
        hasIcon={hasIcon}
        hasViewToggle={hasViewToggle}
        hasFacility={hasFacility}
        hasActionBtn={hasActionBtn}
        actionBtnWidth={actionBtnWidth}
      />

      {/* 2. Top Metric Pod Tray (#F8F9FA, CornerRadius 24px) with 3 Cards */}
      {kpiCount > 0 && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="space-y-1">
            <SkeletonText size="sm" width="220px" />
            <SkeletonText size="xs" width="320px" />
          </div>
          <div className={`grid ${gridColsClass} gap-4`}>
            {Array.from({ length: kpiCount }).map((_, i) => (
              <div
                key={`coll_kpi_${i}`}
                className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]"
              >
                <div className="flex items-center justify-between">
                  <SkeletonText size="xs" width="120px" />
                  <SkeletonBox width={65} height={18} rounded="rounded-md" />
                </div>
                <div>
                  <SkeletonText size="2xl" width="80px" />
                  <div className="flex items-center gap-1.5 mt-1">
                    <SkeletonCircle size={14} />
                    <SkeletonText size="xs" width="130px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Collection Body: List Table or Card Grid */}
      {viewMode === 'list' ? (
        <SkeletonTable columns={columns} rowCount={6} showHeaderControls={true} />
      ) : (
        <SkeletonCardGrid count={6} />
      )}
    </div>
  );
};

// ==========================================
// 15. Dedicated Salon & Beauty Dashboard Skeleton (AppointmentDashboardView)
// ==========================================
export const SkeletonDashboardSalon: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading salon dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={140} />

      {/* 6-Chair Workstations Grid */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <SkeletonText size="sm" width="220px" />
            <SkeletonText size="xs" width="320px" />
          </div>
          <SkeletonBox width={100} height={32} rounded="rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`chair_skel_${i}`}
              className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[155px]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <SkeletonCircle size={36} />
                  <div className="space-y-1">
                    <SkeletonText size="sm" width="130px" />
                    <SkeletonText size="xs" width="90px" />
                  </div>
                </div>
                <SkeletonBox width={60} height={20} rounded="rounded-full" />
              </div>
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-700/40 flex items-center justify-between">
                <SkeletonText size="xs" width="110px" />
                <SkeletonBox width={70} height={26} rounded="rounded-lg" className="!bg-[#C4785A]/25" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 KPI Pods + Tips Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`salon_kpi_${i}`}
              className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[124px]"
            >
              <div className="flex items-center justify-between">
                <SkeletonText size="xs" width="60%" />
                <SkeletonCircle size={24} />
              </div>
              <div className="space-y-1">
                <SkeletonText size="xl" width="55%" />
                <SkeletonText size="xs" width="70%" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between min-h-[124px]">
          <div className="space-y-1.5">
            <SkeletonText size="sm" width="140px" />
            <SkeletonText size="xs" width="220px" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60">
            <SkeletonBox width={100} height={28} rounded="rounded-xl" />
            <div className="flex gap-1.5">
              <SkeletonCircle size={24} />
              <SkeletonCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonText size="base" width="180px" />
          <div className="flex gap-2">
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
            <SkeletonBox width={70} height={32} rounded="rounded-xl" />
          </div>
        </div>
        <div className="divide-y divide-[#EDF1F3] dark:divide-neutral-800/80">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`salon_feed_${idx}`} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={36} />
                <div className="space-y-1">
                  <SkeletonText size="sm" width="140px" />
                  <SkeletonText size="xs" width="180px" />
                </div>
              </div>
              <SkeletonBox width={80} height={24} rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 16. Dedicated POS & Retail Dashboard Skeleton (PosDashboardView)
// ==========================================
export const SkeletonDashboardPos: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading POS dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonText size="xl" width="220px" />
          <SkeletonText size="xs" width="300px" />
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <SkeletonBox width={140} height={40} rounded="rounded-xl" />
          <SkeletonBox width={130} height={40} rounded="rounded-xl" />
          <SkeletonBox width={140} height={40} rounded="rounded-xl" className="!bg-[#C4785A]/25" />
        </div>
      </div>

      {/* Top Split: Dark Espresso Hero Pod (Left) + 3 KPI Cards & Carousel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Dark Espresso Pod */}
        <div className="lg:col-span-1 p-6 rounded-[28px] bg-[#18181B] dark:bg-[#121214] border border-neutral-800 shadow-lg flex flex-col justify-between min-h-[320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="130px" />
              <SkeletonBox width={70} height={22} rounded="rounded-full" />
            </div>
            <div className="py-4 space-y-2">
              <SkeletonText size="3xl" width="180px" />
              <SkeletonText size="xs" width="140px" />
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <SkeletonText size="xs" width="70px" />
              <SkeletonText size="lg" width="60px" />
            </div>
            <div className="space-y-1">
              <SkeletonText size="xs" width="80px" />
              <SkeletonText size="lg" width="70px" />
            </div>
          </div>
        </div>

        {/* Right 3 KPI Pods + Tips */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`pos_top_kpi_${i}`}
                className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <SkeletonText size="xs" width="60%" />
                  <SkeletonCircle size={24} />
                </div>
                <div className="space-y-1">
                  <SkeletonText size="xl" width="50%" />
                  <SkeletonText size="xs" width="70%" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div className="space-y-1.5">
              <SkeletonText size="sm" width="150px" />
              <SkeletonText size="xs" width="340px" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#EDF1F3] dark:border-neutral-700/60">
              <SkeletonBox width={120} height={32} rounded="rounded-xl" />
              <div className="flex gap-1.5">
                <SkeletonCircle size={28} />
                <SkeletonCircle size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Hourly Sales Velocity Chart + Top Selling Products Pod */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <SkeletonChart height={280} />
        </div>
        <div className="lg:col-span-5 p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-3">
          <SkeletonText size="base" width="160px" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`top_prod_${i}`} className="flex items-center justify-between py-2 border-b border-[#EDF1F3] dark:border-neutral-800">
                <div className="space-y-1">
                  <SkeletonText size="sm" width="120px" />
                  <SkeletonText size="xs" width="80px" />
                </div>
                <SkeletonText size="sm" width="60px" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Sales Transactions Ledger */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonText size="base" width="180px" />
          <div className="flex gap-2">
            <SkeletonBox width={80} height={32} rounded="rounded-xl" />
            <SkeletonBox width={80} height={32} rounded="rounded-xl" />
          </div>
        </div>
        <SkeletonTable
          columns={[
            { width: '1.5*', minWidth: '100px' },
            { width: '2*', minWidth: '140px' },
            { width: '2*', minWidth: '140px' },
            { width: '1.2*', minWidth: '90px' },
            { width: '1.2*', minWidth: '90px' },
          ]}
          rowCount={4}
          showHeaderControls={false}
        />
      </div>
    </div>
  );
};

// ==========================================
// 17. Dedicated Education & Academy Dashboard Skeleton (EducationDashboardView)
// ==========================================
export const SkeletonDashboardEducation: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading education dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={160} />

      {/* Top Split: Attendance Hero Pod (Left) + 3 KPI Pods & Carousel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 rounded-[28px] bg-[#18181B] dark:bg-[#121214] border border-neutral-800 shadow-lg flex flex-col justify-between min-h-[320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="120px" />
              <SkeletonBox width={65} height={20} rounded="rounded-full" />
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <SkeletonCircle size={90} />
              <div className="mt-2 text-center space-y-1">
                <SkeletonText size="2xl" width="60px" />
                <SkeletonText size="xs" width="80px" />
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <SkeletonText size="xs" width="90px" />
            <SkeletonBox width={100} height={32} rounded="rounded-xl" className="!bg-[#C4785A]/30" />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`edu_kpi_${i}`}
                className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <SkeletonText size="xs" width="60%" />
                  <SkeletonCircle size={24} />
                </div>
                <div className="space-y-1">
                  <SkeletonText size="xl" width="50%" />
                  <SkeletonText size="xs" width="70%" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div className="space-y-1.5">
              <SkeletonText size="sm" width="140px" />
              <SkeletonText size="xs" width="320px" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#EDF1F3] dark:border-neutral-700/60">
              <SkeletonBox width={110} height={32} rounded="rounded-xl" />
              <div className="flex gap-1.5">
                <SkeletonCircle size={28} />
                <SkeletonCircle size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Class Hourly Attendance Histogram */}
      <SkeletonChart height={280} />

      {/* Bottom Feed: Admissions & Roll-Call Logs */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <div className="divide-y divide-[#EDF1F3] dark:divide-neutral-800/80">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`edu_feed_${idx}`} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={32} />
                <div className="space-y-1">
                  <SkeletonText size="sm" width="130px" />
                  <SkeletonText size="xs" width="190px" />
                </div>
              </div>
              <SkeletonBox width={70} height={22} rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 18. Dedicated Medical & Clinic Dashboard Skeleton (MedicalDashboardView)
// ==========================================
export const SkeletonDashboardMedical: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading medical dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Clinical KPI Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`med_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="55%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Doctor Agenda Slot Matrix & Queue Triage Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonText size="base" width="160px" />
            <SkeletonBox width={90} height={28} rounded="rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`slot_${i}`} className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2">
                <SkeletonText size="xs" width="50px" />
                <SkeletonText size="sm" width="90%" />
                <SkeletonBox width={60} height={18} rounded="rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 p-6 rounded-[26px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-xs space-y-4">
          <SkeletonText size="base" width="140px" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`queue_${i}`} className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between">
                <div className="space-y-1">
                  <SkeletonText size="sm" width="100px" />
                  <SkeletonText size="xs" width="70px" />
                </div>
                <SkeletonCircle size={28} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 19. Dedicated Auto Garage Dashboard Skeleton (AutoGarageDashboardView)
// ==========================================
export const SkeletonDashboardGarage: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading garage dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Garage KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`gar_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="65%" />
            </div>
          </div>
        ))}
      </div>

      {/* Workshop Bays in Repair Matrix */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonText size="base" width="180px" />
          <SkeletonBox width={90} height={28} rounded="rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`bay_${i}`} className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-3">
              <div className="flex justify-between items-center">
                <SkeletonText size="xs" width="60px" />
                <SkeletonBox width={50} height={18} rounded="rounded-full" />
              </div>
              <SkeletonText size="sm" width="90%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 20. Dedicated Real Estate Dashboard Skeleton (RealEstateDashboardView)
// ==========================================
export const SkeletonDashboardRealEstate: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading real estate dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Real Estate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`re_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="55%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Mandate & Leases Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <SkeletonChart height={280} />
        </div>
        <div className="lg:col-span-5 p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
          <SkeletonText size="base" width="160px" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`re_card_${i}`} className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2">
                <SkeletonText size="sm" width="85%" />
                <div className="flex justify-between items-center">
                  <SkeletonText size="xs" width="60px" />
                  <SkeletonText size="xs" width="80px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 21. Dedicated Manufacturing Dashboard Skeleton (ManufacturingDashboardView)
// ==========================================
export const SkeletonDashboardManufacturing: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading manufacturing dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Manufacturing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`mfg_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Machine Workstations Touch Grid */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`mach_${i}`} className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2">
              <div className="flex justify-between items-center">
                <SkeletonText size="xs" width="50px" />
                <SkeletonBox width={50} height={18} rounded="rounded-full" />
              </div>
              <SkeletonText size="sm" width="80%" />
              <SkeletonBox height={8} className="w-full mt-2" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 22. Dedicated Legal & Notary Dashboard Skeleton (LegalDashboardView)
// ==========================================
export const SkeletonDashboardLegal: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading legal dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Legal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`leg_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Urgent CPCA Deadlines & Hearing Docket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 rounded-[26px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-xs space-y-4">
          <SkeletonText size="base" width="160px" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`cpc_${i}`} className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1.5">
                <SkeletonText size="sm" width="90%" />
                <SkeletonText size="xs" width="60%" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-7">
          <SkeletonTable
            columns={[
              { width: '2*', minWidth: '120px' },
              { width: '1.5*', minWidth: '100px' },
              { width: '1.2*', minWidth: '80px' },
            ]}
            rowCount={4}
            showHeaderControls={false}
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 23. Dedicated Logistics & Delivery Dashboard Skeleton (LogisticsDashboardView)
// ==========================================
export const SkeletonDashboardLogistics: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading logistics dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Logistics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`log_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Parcel Transit Radar & Manifest Feed */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <SkeletonTable
          columns={[
            { width: '2*', minWidth: '130px' },
            { width: '1.8*', minWidth: '120px' },
            { width: '1.2*', minWidth: '90px' },
            { width: '1.2*', minWidth: '90px' },
          ]}
          rowCount={4}
          showHeaderControls={false}
        />
      </div>
    </div>
  );
};

// ==========================================
// 24. Dedicated Contractor / BTP Dashboard Skeleton (ContractorDashboardView)
// ==========================================
export const SkeletonDashboardContractor: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading contractor dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 BTP KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`btp_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Chantier Physical Progress & Journal de Chantier */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`site_skel_${i}`} className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-3">
              <SkeletonText size="sm" width="85%" />
              <SkeletonBox height={8} className="w-full" rounded="rounded-full" />
              <div className="flex justify-between items-center text-xs">
                <SkeletonText size="xs" width="60px" />
                <SkeletonText size="xs" width="40px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 25. Dedicated Agriculture Dashboard Skeleton (AgricultureDashboardView)
// ==========================================
export const SkeletonDashboardAgriculture: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading agriculture dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Farm KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`agri_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Parcel Irrigation & Milk Yield Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <SkeletonChart height={280} />
        </div>
        <div className="lg:col-span-5 p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
          <SkeletonText size="base" width="160px" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`parcel_skel_${i}`} className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2">
                <SkeletonText size="sm" width="85%" />
                <div className="flex justify-between items-center">
                  <SkeletonText size="xs" width="70px" />
                  <SkeletonBox width={50} height={18} rounded="rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 26. Dedicated Freelance Dashboard Skeleton (FreelanceDashboardView)
// ==========================================
export const SkeletonDashboardFreelance: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading freelance dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={140} />

      {/* Top Split: Pomodoro Timer Pod + 3 KPI Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 rounded-[28px] bg-[#18181B] dark:bg-[#121214] border border-neutral-800 shadow-lg flex flex-col justify-between min-h-[300px]">
          <div className="space-y-3">
            <SkeletonText size="xs" width="120px" />
            <div className="text-center py-6 space-y-2">
              <SkeletonText size="3xl" width="140px" />
              <SkeletonText size="xs" width="90px" />
            </div>
          </div>
          <SkeletonBox height={40} className="w-full !bg-[#C4785A]/30" rounded="rounded-xl" />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`freelance_kpi_${i}`}
                className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <SkeletonText size="xs" width="60%" />
                  <SkeletonCircle size={24} />
                </div>
                <div className="space-y-1">
                  <SkeletonText size="xl" width="50%" />
                  <SkeletonText size="xs" width="70%" />
                </div>
              </div>
            ))}
          </div>
          <SkeletonChart height={170} />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 27. Dedicated Venue Dashboard Skeleton (VenueDashboardView)
// ==========================================
export const SkeletonDashboardVenue: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading venue dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Rental KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`venue_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* Space Occupancy Gantt / Timeline Preview */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`space_${i}`} className="flex items-center gap-3">
              <SkeletonText size="xs" width="90px" />
              <SkeletonBox height={28} className="flex-1" rounded="rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 28. Dedicated B2B Trading Dashboard Skeleton (TradingDashboardView)
// ==========================================
export const SkeletonDashboardTrading: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading trading dashboard">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 4 Commercial Hub Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`trade_hub_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <SkeletonCircle size={32} />
              <SkeletonBox width={50} height={18} rounded="rounded-full" />
            </div>
            <SkeletonText size="base" width="80%" />
            <SkeletonText size="xs" width="60%" />
          </div>
        ))}
      </div>

      {/* Recent Transactions & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <SkeletonTable
            columns={[
              { width: '2*', minWidth: '130px' },
              { width: '1.5*', minWidth: '100px' },
              { width: '1.2*', minWidth: '80px' },
            ]}
            rowCount={4}
            showHeaderControls={false}
          />
        </div>
        <div className="lg:col-span-5 p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-3">
          <SkeletonText size="base" width="160px" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`alert_${i}`} className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-1">
              <SkeletonText size="sm" width="80%" />
              <SkeletonText size="xs" width="50%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 29. Dedicated Project Direction Dashboard Skeleton (ProjectDirectionView)
// ==========================================
export const SkeletonDashboardProject: React.FC<{
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
}> = ({ isOffline, isTimedOut, lastSyncedAt, onRetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" role="status" aria-label="Loading project direction">
      <OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={onRetry} />
      <SkeletonPageHeader hasFacility hasActionBtn actionBtnWidth={150} />

      {/* 3 Project KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`proj_kpi_${i}`}
            className="p-5 rounded-[22px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between h-[120px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonText size="xs" width="60%" />
              <SkeletonCircle size={24} />
            </div>
            <div className="space-y-1">
              <SkeletonText size="2xl" width="50%" />
              <SkeletonText size="xs" width="70%" />
            </div>
          </div>
        ))}
      </div>

      {/* 6-Role Agency Workflow Radar */}
      <div className="p-6 rounded-[26px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
        <SkeletonText size="base" width="180px" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`role_${i}`} className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 text-center space-y-2">
              <SkeletonCircle size={32} className="mx-auto" />
              <SkeletonText size="xs" width="70%" className="mx-auto" />
              <SkeletonBox width={40} height={16} rounded="rounded-full" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
        <div className="lg:col-span-4 p-6 rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-xs space-y-4">
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


