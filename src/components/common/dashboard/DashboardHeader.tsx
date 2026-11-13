import React from 'react';
import { Sparkles, Download } from 'lucide-react';
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
  const { showToast } = useAtriumStore();

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
      await new Promise((r) => setTimeout(r, 220));
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
      <div className="min-w-0">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-[34px] sm:text-[42px] font-extrabold uppercase leading-[0.98] tracking-[0.012em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:text-[28px] rtl:sm:text-[34px] rtl:leading-tight rtl:tracking-normal">
              {displayTitle}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
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
