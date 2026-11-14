import React from 'react';
import { Building2, RotateCcw } from 'lucide-react';
import { useAtriumSelector, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { ChartSegmented, LiquidButton } from '@/atrium';

export interface DashboardPeriodOption {
  value: string;
  label: string;
  count?: number | string;
}

export interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  categoryName?: string;
  currentBranchName?: string;
  branches?: Array<{ id: string; name: string; businessId?: string }>;
  onSwitchBranch?: (branchId: string) => void;
  onRefreshDemoData?: () => void;
  onResetDemoData?: () => void;
  onExportReport?: () => void;
  exportFileName?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  periodOptions?: DashboardPeriodOption[];
  extraActions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  currentBranchName,
  branches: propsBranches,
  onSwitchBranch,
  onResetDemoData,
  onExportReport,
  period,
  onPeriodChange,
  periodOptions,
  extraActions,
}) => {
  const { language } = useTranslation();
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);

  const [internalPeriod, setInternalPeriod] = React.useState('30d');
  const activePeriod = period !== undefined ? period : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  const defaultPeriodOptions: DashboardPeriodOption[] = [
    { value: 'today', label: language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today' },
    { value: '7d', label: language === 'ar' ? '7 أيام' : language === 'fr' ? '7J' : '7D' },
    { value: '30d', label: language === 'ar' ? '30 يوماً' : language === 'fr' ? '30J' : '30D' },
    { value: 'year', label: language === 'ar' ? 'السنة' : language === 'fr' ? 'Année' : 'Year' },
  ];

  const resolvedPeriodOptions = (periodOptions && periodOptions.length > 0 ? periodOptions : defaultPeriodOptions).map((opt) => ({
    id: opt.value,
    label: opt.count !== undefined ? `${opt.label} · ${opt.count}` : opt.label,
  }));

  const displayTitle =
    title ||
    (language === 'ar'
      ? 'الرئيسية'
      : language === 'fr'
      ? 'Tableau'
      : 'Dashboard');

  const [exportProgress, setExportProgress] = React.useState<number | undefined>(undefined);

  const handleExport = async () => {
    setExportProgress(0.15);
    if (onExportReport) {
      await Promise.resolve(onExportReport());
    }
    for (let step = 1; step <= 5; step++) {
      await new Promise((r) => setTimeout(r, 180));
      setExportProgress(step / 5);
    }
    setExportProgress(undefined);
    showToast({
      type: 'info',
      title:
        language === 'ar'
          ? 'تصدير التقرير'
          : language === 'fr'
          ? 'Export Rapport'
          : 'Report Export',
      message:
        language === 'ar'
          ? 'تم إنشاء التقرير'
          : language === 'fr'
          ? 'Rapport généré'
          : 'Report generated',
    });
  };

  const rawBranches = Array.isArray(propsBranches) ? propsBranches : [];
  const scopedByBiz = currentBusinessId
    ? rawBranches.filter((b) => !b.businessId || b.businessId === currentBusinessId)
    : rawBranches;
  const branchList = scopedByBiz.length > 0 ? scopedByBiz : rawBranches;
  const showBranchSelector = branchList.length > 1 && typeof onSwitchBranch === 'function';

  return (
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3.5 sm:gap-4 pb-1 min-w-0 max-w-full">
      <div className="min-w-0 flex-1">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[30px] sm:text-[40px] font-extrabold uppercase leading-[0.98] tracking-[0.012em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:text-[26px] rtl:sm:text-[32px] rtl:leading-tight rtl:tracking-normal">
              {displayTitle}
            </h1>
            {(subtitle || currentBranchName) && (
              <p className="mt-1 text-xs sm:text-[13px] leading-snug text-black/62 dark:text-white/65 max-w-xl">
                {currentBranchName && (
                  <span className="font-semibold text-black/80 dark:text-white/85">
                    {currentBranchName}
                  </span>
                )}
                {currentBranchName && subtitle && <span aria-hidden="true"> · </span>}
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
        {onPeriodChange && (
          <div className="max-w-full overflow-x-auto">
            <ChartSegmented
              ariaLabel={language === 'ar' ? 'الفترة الزمنية' : language === 'fr' ? 'Période' : 'Timeframe'}
              value={activePeriod}
              onChange={handlePeriodChange}
              options={resolvedPeriodOptions}
            />
          </div>
        )}

        {showBranchSelector && (
          <label className="inline-flex items-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/90 text-xs font-medium text-black dark:text-white max-w-full">
            <Building2 size={14} className="text-[#d4522f] shrink-0" aria-hidden="true" />
            <select
              aria-label={language === 'ar' ? 'الفرع' : language === 'fr' ? 'Établissement' : 'Branch'}
              value={currentBranchId || branchList[0]?.id || ''}
              onChange={(e) => onSwitchBranch(e.target.value)}
              className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-semibold text-black dark:text-white max-w-[160px] sm:max-w-[180px] truncate"
            >
              {branchList.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-neutral-900 text-black dark:text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {extraActions}

        {typeof onResetDemoData === 'function' && (
          <button
            type="button"
            onClick={onResetDemoData}
            id="dash-header-reset-btn"
            title={language === 'ar' ? 'إعادة ضبط البيانات التجريبية' : language === 'fr' ? 'Réinitialiser les données démo' : 'Reset demo data'}
            aria-label={language === 'ar' ? 'إعادة ضبط البيانات التجريبية' : language === 'fr' ? 'Réinitialiser les données démo' : 'Reset demo data'}
            className="inline-flex items-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/90 text-xs font-semibold text-black/75 dark:text-white/80 hover:text-black dark:hover:text-white hover:bg-[#FAF7F2] dark:hover:bg-neutral-800 transition-colors shrink-0"
          >
            <RotateCcw size={14} className="shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">
              {language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}
            </span>
          </button>
        )}

        <LiquidButton
          kind="export"
          size={40}
          progress={exportProgress}
          onPress={handleExport}
          id="dash-header-export-btn"
          labels={{
            idle: language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export',
            busy: language === 'ar' ? 'جاري التصدير' : language === 'fr' ? 'Exportation' : 'Exporting',
            done: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exporté' : 'Exported',
            error: language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed',
          }}
          aria-label={language === 'ar' ? 'تصدير التقرير' : language === 'fr' ? 'Exporter le rapport' : 'Export report'}
        />
      </div>
    </div>
  );
};
