import React, { useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import {
  AreaTrendChart,
  BulletChart,
  ConversionFunnel,
  DumbbellChart,
  KpiMetricInverseCard,
  KpiSparkCard,
  RankedBarList,
} from '@/atrium';
import { useDashboardShellState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useLegalData } from './legalData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardLegal } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import {
  BENTO_SPAN,
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import {
  getCompactTimeframeOptions,
  getFullTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectLegalDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const LegalDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useDashboardShellState();

  const {
    matters,
    hearings,
    deadlines,
    notaryDeeds,
    escrowAccounts,
    cashReceipts,
    scfEntries,
    addMatter,
    addCPCADeadline,
    resetLegalMockData,
  } = useLegalData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (matters || []).length > 0,
  });

  const { filters, makeFilter } = useCardFilters({
    honoraires: '30d',
    trend: '30d',
    deadlines: 'critical',
    bullets: 'all',
    funnel: '30d',
    dumbbell: 'all',
  });
  const [lawyerCriterion, setLawyerCriterion] = useState<'matters' | 'retainer'>('matters');
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

  const fullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const compactTf = useMemo(() => getCompactTimeframeOptions(language), [language]);
  const deadlineOptions = useMemo(
    () => [
      { id: 'critical', label: localizeText(language, 'Critiques', 'Critical', 'الحرجة') },
      { id: 'all', label: localizeText(language, 'Toutes', 'All', 'الكل') },
    ],
    [language]
  );
  const bulletsOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'locked', label: localizeText(language, 'Actifs', 'Active', 'النشطة') },
    ],
    [language]
  );
  const dumbbellOptions = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'unpaid', label: localizeText(language, 'Solde dû', 'Balance Due', 'المتبقي') },
    ],
    [language]
  );
  const lawyerCriteria = useMemo(
    () => [
      { id: 'matters', label: localizeText(language, 'Dossiers', 'Matters', 'القضايا'), format: 'number' as const },
      { id: 'retainer', label: localizeText(language, 'Provisions', 'Retainer', 'الأتعاب'), format: 'currency' as const, currency: 'DZD' },
    ],
    [language]
  );

  const data = useMemo(
    () =>
      selectLegalDashboard({
        matters,
        hearings,
        deadlines,
        notaryDeeds,
        escrowAccounts,
        cashReceipts,
        scfEntries,
        period: '30d',
        cardFilters: filters,
        language,
      }),
    [matters, hearings, deadlines, notaryDeeds, escrowAccounts, cashReceipts, scfEntries, filters, language]
  );

  if (showSkeleton && matters.length === 0) {
    return (
      <SkeletonDashboardLegal
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <DashboardBentoFrame
      theme={theme}
      isRtl={isRtl}
      isOffline={isOffline}
      isTimedOut={isTimedOut}
      isSyncing={isSyncing}
      lastSyncedAt={lastSyncedAt}
      onRetry={retryCloudSync}
      data-testid="legal-dashboard"
    >
      <DashboardHeader
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="md"
              icon={<CalendarClock size={15} />}
              onClick={() => setIsDeadlineModalOpen(true)}
            >
              {localizeText(language, 'Délai CPCA', 'Deadline', 'أجل قضائي')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="md"
              icon={<Plus size={15} />}
              onClick={() => setIsMatterModalOpen(true)}
            >
              {localizeText(language, 'Nouveau dossier', 'New Matter', 'ملف جديد')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        <KpiSparkCard
          className={BENTO_SPAN.kpiHalf}
          title={localizeText(language, 'Honoraires encaissés', 'Collected Fees', 'الأتعاب المحصلة')}
          subtitle={localizeText(
            language,
            `${matters.length} dossiers · ${notaryDeeds.length} actes`,
            `${matters.length} matters · ${notaryDeeds.length} deeds`,
            `${matters.length} قضايا · ${notaryDeeds.length} عقود`
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(cashReceipts.length > 0)}
          value={data.collectedHonoraires}
          deltaPercent={data.receiptDelta}
          format="currency"
          currency="DZD"
          series={data.receiptSpark}
          filter={makeFilter('honoraires', fullTf)}
          emptyMessage={localizeText(
            language,
            'Aucun reçu d’honoraires enregistré.',
            'No fee receipts recorded yet.',
            'لا توجد وصولات أتعاب مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
          className={BENTO_SPAN.kpiHalf}
          title={localizeText(language, 'Échéances critiques CPCA', 'Critical CPCA Deadlines', 'الآجال الحاسمة')}
          subtitle={localizeText(
            language,
            `CARPA : ${data.escrowTotal.toLocaleString()} DZD séquestrés`,
            `Escrow balance: ${data.escrowTotal.toLocaleString()} DZD`,
            `رصيد الودائع: ${data.escrowTotal.toLocaleString()} دج`
          )}
          locale={locale}
          {...featuredSurface}
          state={resolveChartState(deadlines.length > 0 || escrowAccounts.length > 0)}
          value={data.criticalDeadlines}
          format="number"
          series={[]}
          filter={makeFilter('deadlines', deadlineOptions)}
          emptyMessage={localizeText(
            language,
            'Aucune échéance CPCA suivie.',
            'No procedural deadlines tracked.',
            'لا توجد آجال إجرائية مسجلة.'
          )}
        />

        <AreaTrendChart
          className={BENTO_SPAN.wide7}
          title={localizeText(language, 'Trajectoire des honoraires', 'Fee Collection Trend', 'منحنى تحصيل الأتعاب')}
          subtitle={localizeText(
            language,
            'Comparatif entre la période active et précédente',
            'Current fee inflow vs previous timeframe',
            'مقارنة التحصيل الحالي بالفترة السابقة'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(cashReceipts.length > 0)}
          points={data.areaPoints}
          format="currency"
          currency="DZD"
          filter={makeFilter('trend', compactTf)}
          emptyMessage={localizeText(
            language,
            'Aucun encaissement enregistré.',
            'No fee receipts recorded in window.',
            'لا توجد مداخيل مسجلة في هذه الفترة.'
          )}
        />

        <BulletChart
          className={BENTO_SPAN.medium5}
          title={localizeText(language, 'Comptes CARPA séquestrés', 'CARPA Escrow Balances', 'حسابات الضمان CARPA')}
          subtitle={localizeText(
            language,
            'Solde disponible vs provision initiale déposée',
            'Remaining escrow vs initial client deposit',
            'الرصيد المتاح مقابل الإيداع الأولي'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.escrowBullets.length > 0)}
          items={data.escrowBullets}
          format="currency"
          currency="DZD"
          actualLegendLabel={localizeText(language, 'Solde', 'Balance', 'الرصيد')}
          targetLegendLabel={localizeText(language, 'Déposé', 'Deposited', 'المودع')}
          filter={makeFilter('bullets', bulletsOptions)}
          emptyMessage={localizeText(
            language,
            'Aucun compte séquestre ouvert.',
            'No escrow accounts opened.',
            'لا توجد حسابات ضمان مفتوحة.'
          )}
        />

        <ConversionFunnel
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Avancement des dossiers', 'Docket & Deed Funnel', 'مسار الملفات والعقود')}
          subtitle={localizeText(
            language,
            'De l’ouverture à la clôture / publication',
            'From intake to hearing, minute, and closure',
            'من فتح الملف إلى الجلسة والغلق'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.funnelStages.length > 0)}
          stages={data.funnelStages}
          filter={makeFilter('funnel', compactTf)}
          emptyMessage={localizeText(
            language,
            'Aucun dossier ou acte enregistré.',
            'No matters or notary deeds recorded.',
            'لا توجد قضايا أو عقود مسجلة.'
          )}
        />

        <DumbbellChart
          className={BENTO_SPAN.thirdCompact}
          title={localizeText(language, 'Provision vs Honoraires perçus', 'Retainer vs Collected per Matter', 'المتفق عليه مقابل المحصل')}
          subtitle={localizeText(
            language,
            'Écart entre montant convenu et encaissements cumulés',
            'Agreed retainer against cumulative paid receipts',
            'مقارنة قيمة التعاقد مع المبالغ المحصلة فعلياً'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.feeDumbbell.length > 0)}
          items={data.feeDumbbell}
          prevLabel={localizeText(language, 'Provision', 'Retainer', 'المتفق عليه')}
          currentLabel={localizeText(language, 'Encaissé', 'Collected', 'المحصل')}
          format="currency"
          currency="DZD"
          filter={makeFilter('dumbbell', dumbbellOptions)}
          emptyMessage={localizeText(
            language,
            'Ajoutez des dossiers et quittances pour comparer.',
            'Add matters and receipts to compare billing.',
            'أضف ملفات ووصولات للمقارنة.'
          )}
        />

        <RankedBarList
          className={BENTO_SPAN.thirdWideTablet}
          title={localizeText(language, 'Charge par avocat', 'Caseload by Advocate', 'توزيع القضايا حسب المحامي')}
          subtitle={localizeText(
            language,
            'Nombre de dossiers et provisions conventionnelles',
            'Assigned matters and agreed retainer fees',
            'عدد القضايا ومبالغ الأتعاب المتفق عليها'
          )}
          locale={locale}
          {...standardSurface}
          state={resolveChartState(data.rankedLawyers.length > 0)}
          criteria={lawyerCriteria}
          activeCriterionId={lawyerCriterion}
          onCriterionChange={(id) => setLawyerCriterion(id as 'matters' | 'retainer')}
          items={data.rankedLawyers}
          emptyMessage={localizeText(
            language,
            'Aucun dossier attribué.',
            'No matters assigned to advocates.',
            'لا توجد ملفات موزعة على المحامين.'
          )}
        />
      </DashboardBentoGrid>

      {isMatterModalOpen && (
        <LegalMatterModal
          isOpen={isMatterModalOpen}
          onClose={() => setIsMatterModalOpen(false)}
          onSave={addMatter}
        />
      )}
      {isDeadlineModalOpen && (
        <CpcaDeadlineModal
          isOpen={isDeadlineModalOpen}
          onClose={() => setIsDeadlineModalOpen(false)}
          matters={matters || []}
          onSaveDeadline={addCPCADeadline}
        />
      )}
    </DashboardBentoFrame>
  );
};
