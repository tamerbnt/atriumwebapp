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
import { useAtriumStore } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { useLegalData } from './legalData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardLegal } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import {
  DashboardBentoFrame,
  DashboardBentoGrid,
  DashboardHeader,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import { resolveChartState, type DashboardPeriodKey } from '../../../utils/dashboardSelectors/common';
import { selectLegalDashboard } from '../../../utils/dashboardSelectors/specializedVerticals';

export const LegalDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    theme,
    currentBranch,
    branches,
    switchBranch,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

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

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');
  const [lawyerCriterion, setLawyerCriterion] = useState<'matters' | 'retainer'>('matters');
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  const locale = toChartLocale(language);
  const featuredSurface = getSurfaceProps(theme, true);
  const standardSurface = getSurfaceProps(theme, false);

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
        period,
        language,
      }),
    [matters, hearings, deadlines, notaryDeeds, escrowAccounts, cashReceipts, scfEntries, period, language]
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
        title={t('nav_dashboard', language)}
        subtitle={localizeText(
          language,
          'Rôle des audiences, suivi des délais procéduraux CPCA et gestion des comptes CARPA.',
          'Live court docket, CPCA procedural deadlines, and CARPA trust accounting.',
          'متابعة القضايا والجلسات، الآجال القضائية وحسابات الودائع الموثقة.'
        )}
        currentBranchName={currentBranch?.name || 'Cabinet Juridique Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetLegalMockData}
        period={period}
        onPeriodChange={(next) => setPeriod(next as DashboardPeriodKey)}
        extraActions={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<CalendarClock size={15} />}
              onClick={() => setIsDeadlineModalOpen(true)}
            >
              {localizeText(language, 'Délai CPCA', 'Deadline', 'أجل قضائي')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsMatterModalOpen(true)}
            >
              {localizeText(language, 'Nouveau dossier', 'New Matter', 'ملف جديد')}
            </AtriumButton>
          </div>
        }
      />

      <DashboardBentoGrid>
        {/* Row 1: Honoraires Spark + Critical CPCA Deadlines Inverse (espresso) + CARPA Escrow Bullets */}
        <KpiSparkCard
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
          emptyMessage={localizeText(
            language,
            'Aucun reçu d’honoraires enregistré.',
            'No fee receipts recorded yet.',
            'لا توجد وصولات أتعاب مسجلة بعد.'
          )}
        />

        <KpiMetricInverseCard
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
          series={data.receiptSpark.map((pt) => ({ ...pt, value: data.criticalDeadlines }))}
          emptyMessage={localizeText(
            language,
            'Aucune échéance CPCA suivie.',
            'No procedural deadlines tracked.',
            'لا توجد آجال إجرائية مسجلة.'
          )}
        />

        <BulletChart
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
          emptyMessage={localizeText(
            language,
            'Aucun compte séquestre ouvert.',
            'No escrow accounts opened.',
            'لا توجد حسابات ضمان مفتوحة.'
          )}
        />

        {/* Row 2: Fee Cashflow Area Trend (wide) + Matters/Deeds Funnel */}
        <AreaTrendChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Aucun encaissement enregistré.',
            'No fee receipts recorded in window.',
            'لا توجد مداخيل مسجلة في هذه الفترة.'
          )}
        />

        <ConversionFunnel
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
          emptyMessage={localizeText(
            language,
            'Aucun dossier ou acte enregistré.',
            'No matters or notary deeds recorded.',
            'لا توجد قضايا أو عقود مسجلة.'
          )}
        />

        {/* Row 3: Ranked Advocates + Retainer vs Paid Fees Dumbbell (wide) */}
        <RankedBarList
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
          criteria={[
            { id: 'matters', label: localizeText(language, 'Dossiers', 'Matters', 'القضايا'), format: 'number' },
            { id: 'retainer', label: localizeText(language, 'Provisions', 'Retainer', 'الأتعاب'), format: 'currency', currency: 'DZD' },
          ]}
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

        <DumbbellChart
          className="md:col-span-2 xl:col-span-2"
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
          emptyMessage={localizeText(
            language,
            'Ajoutez des dossiers et quittances pour comparer.',
            'Add matters and receipts to compare billing.',
            'أضف ملفات ووصولات للمقارنة.'
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
