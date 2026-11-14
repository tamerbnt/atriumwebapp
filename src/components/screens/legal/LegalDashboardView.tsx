import React, { useMemo, useState } from 'react';
import { CalendarClock, FolderKanban, Plus, Scale, ShieldAlert, Users } from 'lucide-react';
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
import { useCardFilters } from '../../../hooks/useCardFilters';
import { SkeletonDashboardLegal } from '../../ui/skeleton/StructuralSkeletons';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import {
  DashboardBentoFrame,
  DashboardHeader,
  DashboardPod,
  DashboardPodGrid,
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

      <DashboardPodGrid>
        <DashboardPod
          title={localizeText(language, 'Honoraires & Trajectoire', 'Fee Collection & Trend', 'الأتعاب ومنحنى التحصيل')}
          subtitle={localizeText(language, 'Encaissements nets et évolution périodique', 'Collected legal fees and period inflow trend', 'الأتعاب المحصلة وتطور التحصيل')}
          icon={<Scale size={16} />}
        >
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
            filter={makeFilter('honoraires', fullTf)}
            emptyMessage={localizeText(
              language,
              'Aucun reçu d’honoraires enregistré.',
              'No fee receipts recorded yet.',
              'لا توجد وصولات أتعاب مسجلة بعد.'
            )}
          />

          <AreaTrendChart
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Échéances CPCA & CARPA', 'Procedural Risk & Escrow', 'الآجال القضائية والضمان')}
          subtitle={localizeText(language, 'Délais impératifs et provisions séquestrées', 'Critical deadlines and CARPA trust balances', 'الآجال الحاسمة وأرصدة الودائع')}
          icon={<ShieldAlert size={16} />}
        >
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
            series={[]}
            filter={makeFilter('deadlines', deadlineOptions)}
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
            filter={makeFilter('bullets', bulletsOptions)}
            emptyMessage={localizeText(
              language,
              'Aucun compte séquestre ouvert.',
              'No escrow accounts opened.',
              'لا توجد حسابات ضمان مفتوحة.'
            )}
          />
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Avancement & Facturation', 'Docket & Billing Gap', 'مسار الملفات والتحصيل')}
          subtitle={localizeText(language, 'Entonnoir d’instruction et écarts d’honoraires', 'Case stages and retainer vs collected fee gap', 'مراحل المعالجة والفارق المالي')}
          icon={<FolderKanban size={16} />}
        >
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
            filter={makeFilter('funnel', compactTf)}
            emptyMessage={localizeText(
              language,
              'Aucun dossier ou acte enregistré.',
              'No matters or notary deeds recorded.',
              'لا توجد قضايا أو عقود مسجلة.'
            )}
          />

          <DumbbellChart
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
        </DashboardPod>

        <DashboardPod
          title={localizeText(language, 'Charge par Avocat', 'Caseload by Advocate', 'توزيع القضايا حسب المحامي')}
          subtitle={localizeText(language, 'Répartition des dossiers et provisions', 'Active matters and agreed retainers per lawyer', 'توزيع الملفات والأتعاب على المحامين')}
          icon={<Users size={16} />}
        >
          <RankedBarList
            className="flex-1"
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
        </DashboardPod>
      </DashboardPodGrid>

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
