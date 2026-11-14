import React from 'react';
import { showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { LiquidButton } from '@/atrium';

export interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  categoryName?: string;
  onAddMember?: () => void;
  addMemberLabel?: string;
  onRefreshDemoData?: () => void;
  onResetDemoData?: () => void;
  onExportReport?: () => void;
  exportFileName?: string;
  extraActions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  onExportReport,
  extraActions,
}) => {
  const { language } = useTranslation();

  const displayTitle =
    title ||
    (language === 'ar'
      ? 'لوحة القيادة'
      : language === 'fr'
      ? 'Tableau de bord'
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

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4 pb-1 min-w-0 max-w-full">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
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
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
        {extraActions}

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
