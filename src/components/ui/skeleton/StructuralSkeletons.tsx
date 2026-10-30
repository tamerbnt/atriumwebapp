import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonCircle, SkeletonButton } from './SkeletonPrimitives';

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
