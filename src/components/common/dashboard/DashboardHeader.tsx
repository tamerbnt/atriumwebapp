import React from 'react';
import { Home, ChevronDown, Sparkles, Download } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { Button, LiquidButton } from '@/atrium';

export interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  categoryName?: string;
  currentBranchName?: string;
  branches?: any[];
  onSwitchBranch?: (branchId: string) => void;
  onRefreshDemoData?: () => void;
  onResetDemoData?: () => void;
  onExportReport?: () => void;
  exportFileName?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  periodOptions?: Array<{ value: string; label: string; count?: number | string }>;
  extraActions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  categoryName,
  currentBranchName,
  branches: propsBranches,
  onSwitchBranch,
  onRefreshDemoData,
  onResetDemoData,
  onExportReport,
  exportFileName,
  period,
  onPeriodChange,
  periodOptions,
  extraActions,
}) => {
  const { language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    businesses,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    currentBusiness,
    showToast,
  } = useAtriumStore();

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
  const [internalPeriod, setInternalPeriod] = React.useState('today');
  const activePeriod = period !== undefined ? period : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  const defaultPeriodOptions = [
    { value: 'today', label: language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today' },
    { value: '7d', label: language === 'ar' ? '٧ أيام' : language === 'fr' ? '7J' : '7D' },
    { value: '30d', label: language === 'ar' ? '٣٠ يوماً' : language === 'fr' ? '30J' : '30D' },
    { value: 'year', label: language === 'ar' ? 'السنة' : language === 'fr' ? 'Année' : 'Year' },
  ];

  const displayTitle =
    title ||
    (language === 'ar'
      ? 'لوحة القيادة'
      : language === 'fr'
      ? 'Tableau de bord'
      : 'Dashboard');

  const displaySubtitle =
    subtitle ||
    (language === 'ar'
      ? 'النشاط التشغيلي ومؤشرات الأداء اللحظية للمنشأة اليوم'
      : language === 'fr'
      ? "Voici l'activité opérationnelle et les indicateurs en direct."
      : "Here's what's happening in your facility today.");

  const [exportProgress, setExportProgress] = React.useState<number | undefined>(undefined);

  const handleExport = async () => {
    setExportProgress(0.15);
    if (onExportReport) {
      await Promise.resolve(onExportReport());
    }
    for (let step = 1; step <= 5; step++) {
      await new Promise((r) => setTimeout(r, 220));
      setExportProgress(step / 5);
    }
    setExportProgress(undefined);
    showToast({
      type: 'info',
      title:
        language === 'ar'
          ? 'تصدير التقرير التنفيذي'
          : language === 'fr'
          ? 'Export Rapport Exécutif'
          : 'Executive Report Export',
      message:
        language === 'ar'
          ? 'تم إعداد التقرير المالي والتشغيلي بنجاح (PDF / CSV).'
          : language === 'fr'
          ? 'Rapport de synthèse (PDF / CSV) exporté avec succès.'
          : 'Executive summary report successfully generated.',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {displayTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Branch / Facility Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="h-10 px-3.5 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Home size={14} className="text-[#d4522f]" />
            <div className="flex flex-col text-left rtl:text-right leading-tight">
              <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || currentBusiness?.name || 'Club Principal'}
              </span>
              <span className="text-[9px] text-neutral-500 dark:text-neutral-400">
                {categoryName || currentBusiness?.displayName || 'Atrium'}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-neutral-500 transition-transform ${
                isBranchDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isBranchDropdownOpen && (
            <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'المواقع والفروع' : language === 'fr' ? 'Établissements & Sites' : 'Sites & Facilities'}
              </div>
              {businesses.map((biz) => {
                const isCurrent = biz.id === currentBusinessId;
                const matchingBranch = branches.find((b) => b.businessId === biz.id);
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      switchBusiness(biz.id);
                      if (matchingBranch) switchBranch(matchingBranch.id);
                      setIsBranchDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    <span className="truncate">{biz.name}</span>
                    {isCurrent && <span className="text-[10px] font-bold text-[#d4522f]">Active</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Liquid Export Report Action - 40px height matching primary buttons */}
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

        {extraActions}
      </div>
    </div>
  );
};
