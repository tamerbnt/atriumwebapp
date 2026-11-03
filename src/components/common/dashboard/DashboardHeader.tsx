import React from 'react';
import { Home, ChevronDown, Sparkles, Download } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';

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
    resetToDefaultDemoData,
    currentBusiness,
    showToast,
  } = useAtriumStore();

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);

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

  const handleSeedDemo = () => {
    if (onRefreshDemoData) {
      onRefreshDemoData();
      return;
    }
    if (onResetDemoData) {
      onResetDemoData();
      return;
    }
    if (currentBusiness?.category) {
      resetToDefaultDemoData(currentBusiness.category);
      showToast({
        type: 'success',
        title:
          language === 'ar'
            ? 'تم تحديث البيانات التجريبية'
            : language === 'fr'
            ? 'Données Démo Réinitialisées'
            : 'Demo Data Refreshed',
        message:
          language === 'ar'
            ? 'تم استرجاع السجلات والمؤشرات النموذجية بنجاح'
            : language === 'fr'
            ? 'Indicateurs opérationnels et données témoins synchronisés.'
            : 'Operational mock records successfully hydrated.',
      });
    }
  };

  const handleExport = () => {
    if (onExportReport) {
      onExportReport();
      return;
    }
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
          ? 'جاري إعداد التقرير المالي والتشغيلي (PDF / CSV)...'
          : language === 'fr'
          ? 'Génération du rapport de synthèse (PDF / CSV)...'
          : 'Compiling executive summary report (PDF / CSV)...',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800 border border-[#EDF1F3] dark:border-neutral-700 flex items-center justify-center text-[#C4785A]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {displaySubtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Branch / Facility Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="h-10 px-3.5 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <Home size={14} className="text-[#C4785A]" />
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
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    <span className="truncate">{biz.name}</span>
                    {isCurrent && <span className="text-[10px] font-bold text-[#C4785A]">Active</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 1-Click Mock Demo Data Seeder */}
        <AtriumButton
          type="button"
          variant="outline"
          size="sm"
          icon={<Sparkles size={14} className="text-[#C4785A]" />}
          onClick={handleSeedDemo}
          title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
        >
          <span className="hidden sm:inline">
            {language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}
          </span>
        </AtriumButton>

        {/* Export Report Action */}
        <button
          type="button"
          onClick={handleExport}
          className="h-10 px-4 rounded-xl bg-[#C4785A] hover:bg-[#B26A4E] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
        >
          <Download size={14} />
          <span>{language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export'}</span>
          <ChevronDown size={12} className="opacity-80" />
        </button>

        {extraActions}
      </div>
    </div>
  );
};
