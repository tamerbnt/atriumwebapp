import React, { useState } from 'react';
import {
  Scale,
  Briefcase,
  Plus,
  Calendar,
  Lock,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Landmark,
  Coins,
  TrendingUp,
  FileText,
  Users,
  Clock,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import { NotaryDeedModal } from '../../modals/NotaryDeedModal';
import { CashClosureModal } from '../../modals/CashClosureModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonKpiGrid } from '../../ui/skeleton/StructuralSkeletons';

export const LegalDashboardView: React.FC = () => {
  const {
    language,
    setScreen,
    activeLegalRole,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    matters,
    hearings,
    deadlines,
    notaryDeeds,
    escrowAccounts,
    scfEntries,
    cashReceipts,
    dailyClosure,
    addMatter,
    addCPCADeadline,
    addNotaryDeed,
    updateDailyClosure,
  } = useLegalData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: matters.length > 0 || notaryDeeds.length > 0,
  });

  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [isCpcaModalOpen, setIsCpcaModalOpen] = useState(false);
  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);
  const [isCashClosureModalOpen, setIsCashClosureModalOpen] = useState(false);

  // Computed metrics
  const activeMatters = matters.filter((m) => m.status === 'Active' || m.status === 'PendingHearing').length;
  const upcomingHearings = hearings.filter((h) => !h.isCompleted).length;
  const criticalCpcaDeadlines = deadlines.filter((d) => d.status === 'critical' || d.status === 'approaching');
  const totalEscrow = escrowAccounts.reduce((acc, a) => acc + a.currentBalanceDzd, 0);
  const totalNotaryFeesHt = notaryDeeds.reduce((acc, d) => acc + d.financials.honorairesHtDzd, 0);
  const totalCashCollectedToday = cashReceipts.reduce((acc, r) => acc + r.netCollectedDzd, 0);
  const totalStampDutyToday = cashReceipts.reduce((acc, r) => acc + r.timbreFiscalDzd, 0);

  // SCF Trial Balance validation
  const totalDebitSCF = scfEntries.reduce((acc, e) => acc + e.totalDebitDzd, 0);
  const totalCreditSCF = scfEntries.reduce((acc, e) => acc + e.totalCreditDzd, 0);
  const isScfBalanced = totalDebitSCF === totalCreditSCF && scfEntries.length > 0;

  // Title and subtitle per role
  const roleHeaders = {
    avocat_associe: {
      titleFr: 'Cabinet d\'Avocats — Pilotage du Contentieux & Délais CPCA',
      titleAr: 'مكتب المحاماة — قيادة القضايا ومواعيد الاستئناف (ق.إ.م.إ)',
      subFr: 'Suivi des affaires au rôle, délais de recours légaux, audiences et comptes CARPA',
      subAr: 'متابعة الملفات بالجدول، مواعيد الطعون القانونية، الجلسات وحسابات الودائع',
    },
    notaire_titulaire: {
      titleFr: 'Étude Notariale — Répertoire des Actes & Fidéicommis',
      titleAr: 'مكتب التوثيق — سجل العقود الرسمية وحسابات الحراسة العقارية',
      subFr: 'Gestion du répertoire chronologique (Décret 08-243), séquestres et conservation foncière',
      subAr: 'تسيير الفهرس الرسمي (المرسوم 08-243)، ودائع البيع ومتابعة الشهر العقاري',
    },
    expert_comptable: {
      titleFr: 'Cabinet d\'Expertise Comptable & Commissariat aux Comptes',
      titleAr: 'مكتب الخبير المحاسب ومحافظ الحسابات — المراقبة والتصريحات الجبائية',
      subFr: 'Grand Livre SCF (Loi 07-11), échéancier fiscal G50, liasses fiscales et mandats d\'audit',
      subAr: 'دفتر الأستاذ المالي SCF، الرزنامة الجبائية G50، الحزم الجبائية وملفات التدقيق',
    },
    secretaire_caisse: {
      titleFr: 'Accueil & Caisse Centrale — Enregistrement & Timbre Art. 317',
      titleAr: 'أمانة الاستقبال والصندوق المركزي — التبليغات وطابع المادة 317',
      subFr: 'Encaissement des provisions en espèces avec droit de timbre fiscal et arrêtés de caisse',
      subAr: 'تحصيل تسبيقات الموكلين نقداً مع اقتطاع رسم الطابع الجبائي ومحاضر إقفال الصندوق',
    },
  };

  const currentRoleHeader = roleHeaders[activeLegalRole] || roleHeaders.avocat_associe;

  if (showSkeleton && (matters.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <SkeletonKpiGrid count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            {activeLegalRole === 'notaire_titulaire' ? (
              <BookOpen size={22} />
            ) : activeLegalRole === 'expert_comptable' ? (
              <TrendingUp size={22} />
            ) : activeLegalRole === 'secretaire_caisse' ? (
              <CreditCard size={22} />
            ) : (
              <Scale size={22} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? currentRoleHeader.titleAr : currentRoleHeader.titleFr}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-mono">
                {activeLegalRole.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr ? currentRoleHeader.subAr : currentRoleHeader.subFr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeLegalRole === 'avocat_associe' && (
            <>
              <AtriumButton
                variant="secondary"
                onClick={() => setIsCpcaModalOpen(true)}
                icon={<Clock size={14} />}
              >
                {isAr ? 'تسليح أجل CPCA' : 'Armer Délai CPCA'}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={() => setIsMatterModalOpen(true)}
                icon={<Plus size={14} />}
              >
                {isAr ? 'ملف قضية جديد' : 'Nouveau Dossier'}
              </AtriumButton>
            </>
          )}

          {activeLegalRole === 'notaire_titulaire' && (
            <AtriumButton
              variant="primary"
              onClick={() => setIsNotaryModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'عقد رسمي في الفهرس' : 'Nouvel Acte Répertoire'}
            </AtriumButton>
          )}

          {activeLegalRole === 'expert_comptable' && (
            <AtriumButton
              variant="primary"
              onClick={() => setScreen('finance')}
              icon={<Plus size={14} />}
            >
              {isAr ? 'كتابة قيد في دفتر الأستاذ' : 'Écriture Grand Livre'}
            </AtriumButton>
          )}

          {activeLegalRole === 'secretaire_caisse' && (
            <AtriumButton
              variant="primary"
              onClick={() => setIsCashClosureModalOpen(true)}
              icon={<CheckCircle2 size={14} />}
            >
              {isAr ? 'محضر إغلاق الصندوق' : 'Arrêté de Caisse'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* Role-Specific Canonical Pod Tray */}
      {activeLegalRole === 'avocat_associe' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات القضايا والودائع ومواعيد الطعن (CPCA)' : 'Contentieux Actif & Radar des Délais Légaux CPCA'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متابعة الملفات بالجدول، آجال الاستئناف الحاسمة، والجلسات المقبلة' : 'Dossiers au rôle, calendrier des audiences et alertes sous 48h'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الملفات الجارية بالجدول' : 'Dossiers Actifs au Rôle'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {activeMatters}
                </div>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  {matters.length} {isAr ? 'قضية مسجلة' : 'affaires au cabinet'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'مواعيد الاستئناف الحرجة (CPCA)' : 'Délais d\'Appel Critiques'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-rose-600 font-mono tabular-nums">
                  {criticalCpcaDeadlines.length}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-0.5 font-medium">
                  {isAr ? 'أقل من 5 أيام قبل السقوط' : 'expiration sous 5 jours'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الجلسات المبرمجة' : 'Audiences Programmées'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 font-mono tabular-nums">
                  {upcomingHearings}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  {hearings.length} {isAr ? 'جلسة بالجدول' : 'inscriptions au rôle'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'ودائع الموكلين بحساب CARPA' : 'Fonds Séquestre CARPA'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums truncate">
                  {formatMoney(totalEscrow, language)}
                </div>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  {escrowAccounts.length} {isAr ? 'حسابات حراسة مؤمنة' : 'comptes sous séquestre'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeLegalRole === 'notaire_titulaire' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات مكتب التوثيق وسجل العقود وحسابات الحراسة' : 'Étude Notariale — Répertoire des Actes & Décret 08-243'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'العقود المحررة، التعريفات الرسمية المحصلة ومبالغ الحراسة المعلقة' : 'Volume d\'actes authentiques, honoraires légaux et séquestres sous condition'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'العقود المسجلة بالفهرس' : 'Actes au Répertoire'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {notaryDeeds.length}
                </div>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  Dernier Index: {notaryDeeds[notaryDeeds.length - 1]?.repertoireNumber || '2026/00001'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'أتعاب التوثيق (المرسوم 08-243)' : 'Honoraires Décret 08-243 HT'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums truncate">
                  {formatMoney(totalNotaryFeesHt, language)}
                </div>
                <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                  {formatMoney(totalNotaryFeesHt * 0.19, language)} TVA 19%
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الودائع العقارية تحت الحراسة' : 'Prix de Vente sous Séquestre'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums truncate">
                  {formatMoney(totalEscrow, language)}
                </div>
                <p className="text-[11px] text-amber-600 mt-0.5 font-medium">
                  {isAr ? 'مشروطة بالشهر العقاري' : 'conditionnée publication'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الشهر بالمحافظة العقارية' : 'Conservation Foncière'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 font-mono tabular-nums">
                  {notaryDeeds.filter((d) => d.status === 'publie_conservation').length}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  {notaryDeeds.filter((d) => d.status === 'minute_signed').length} {isAr ? 'في انتظار الإيداع' : 'en cours de publication'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeLegalRole === 'expert_comptable' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات المحاسبة المالية SCF والرزنامة الجبائية G50' : 'Cabinet d\'Audit & Comptabilité SCF (Loi 07-11)'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'توازن القيود المحاسبية، التصريحات الجبائية G50، ومتابعة ملفات التدقيق' : 'Équilibre Débit/Crédit, calendrier Jibayatic et mandats de commissariat'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'حالة التوازن المحاسبي SCF' : 'Équilibre Grand Livre SCF'}
              </span>
              <div>
                <div className={`text-xl font-bold tracking-tight font-mono ${isScfBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isScfBalanced ? '✓ Équilibré (0.00)' : '⚠️ Déséquilibre'}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  Total : {formatMoney(totalDebitSCF, language)}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الأجل القادم لتصريح G50' : 'Échéance G50 DGI'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 font-mono tabular-nums">
                  20 Mai
                </div>
                <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">
                  TVA Avril & IRG Salaires
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'القيود المحاسبية المسجلة' : 'Écritures Validées'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {scfEntries.length}
                </div>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  {scfEntries.reduce((acc, e) => acc + e.lines.length, 0)} lignes de journaux
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الملفات المفتوحة للتدقيق' : 'Mandats d\'Audit CAC'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums">
                  {matters.filter((m) => m.category === 'TaxAdvisory').length || 3}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  SARL, EURL & SPA clientes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeLegalRole === 'secretaire_caisse' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'الصندوق المركزي وطابع المادة 317 والتبليغات اليومية' : 'Caisse Centrale & Rapprochement Fiscal Art. 317'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'السيولة المقبوضة نقداً، رسوم الطابع المقتطعة، وتطابق العد الفعلي' : 'Encaissements du jour en espèces, droits de timbre collectés et rapprochement'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'المقبوضات النقدية اليوم' : 'Espèces Encaissées Aujourd\'hui'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums truncate">
                  {formatMoney(totalCashCollectedToday, language)}
                </div>
                <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                  {cashReceipts.length} {isAr ? 'وصولات رسمية' : 'reçus fiscaux émis'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'طابع المادة 317 المستحق' : 'Timbre Art. 317 Collecté'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-amber-600 font-mono tabular-nums">
                  {formatMoney(totalStampDutyToday, language)}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  {isAr ? 'يتم تحويله للقباضة' : 'à reverser à la Recette DGI'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'حالة إغلاق الصندوق' : 'État de Caisse Journalier'}
              </span>
              <div>
                <div className="text-xl font-bold tracking-tight text-emerald-600 font-mono">
                  {dailyClosure.status === 'balanced' ? '✓ Conforme (0 DA)' : '⚠️ Écart Détecté'}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  Physique : {formatMoney(dailyClosure.actualPhysicalCashCountedDzd || 0, language)}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'إجراءات ومحاضر اليوم' : 'Formalités & Huissiers'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums">
                  {deadlines.length}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                  {isAr ? 'إخطارات بالجدول' : 'notifications au registre'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Operational Feed & Urgent CPCA Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* CPCA Statutory Deadline Radar Banner */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {isAr ? 'رادار مواعيد الاستئناف والطعن القانوني (ق.إ.م.إ)' : 'Radar des Délais de Recours Légaux (CPCA - Loi 08-09)'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isAr ? 'حساب آلي للمواعيد مع تمديد الجمعة والسبت والأعياد (المادة 405)' : 'Compte à rebours légal automatisé avec prorogation Art. 405'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScreen('scheduler')}
                className="text-xs text-[#C4785A] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                {isAr ? 'عرض كل المواعيد' : 'Voir tout'} <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2.5">
              {deadlines.map((d) => {
                const expiryDate = new Date(d.terminalExpiryDate);
                const isCritical = d.status === 'critical' || d.status === 'approaching';
                return (
                  <div
                    key={d.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCritical
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                        : 'bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200/60 dark:border-neutral-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                          {d.caseNumber}
                        </span>
                        <span className="text-[11px] text-neutral-400">·</span>
                        <span className="text-xs font-semibold text-[#C4785A]">
                          {d.recourseType.replace('_', ' ').toUpperCase()}
                        </span>
                        {d.isRolledOver && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            Prorogé Art. 405
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                        {d.courtJurisdiction} — {d.chamber}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {isAr ? 'المحضر:' : 'Huissier :'} {d.bailiffName}
                      </p>
                    </div>

                    <div className="text-right sm:shrink-0">
                      <span className="text-[10px] text-neutral-400 block">
                        {isAr ? 'السقوط النهائي:' : 'Expiration Finale au Greffe :'}
                      </span>
                      <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 block">
                        {expiryDate.toLocaleDateString('fr-DZ')} à 16:30
                      </span>
                      <span className="text-[10px] font-medium text-amber-600">
                        {d.notes || 'Mémoire en préparation'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hearings Table Quick View */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#C4785A]" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'جلسات المحاكم القادمة بالجدول' : 'Prochaines Audiences au Rôle'}
                </h3>
              </div>
              <button
                onClick={() => setScreen('scheduler')}
                className="text-xs text-[#C4785A] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                {isAr ? 'فتح جدول الجلسات' : 'Ouvrir le Rôle'} <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {hearings.slice(0, 3).map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-white">{h.hearingDate}</span>
                      <span className="text-neutral-400">·</span>
                      <span className="font-mono text-neutral-500">{h.hearingTime || '09:30'}</span>
                      <span className="text-neutral-400">·</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">{h.courtName}</span>
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate max-w-md">
                      {h.matterTitle}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A]">
                    {h.postponementCode || 'RPP'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Escrow Breakdown */}
        <div className="space-y-6">
          {/* Trust Escrow Summary Card */}
          <div className="bg-[#1F1D1B] text-white rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {isAr ? 'حساب الحراسة والودائع' : 'Fonds Séquestre & CARPA'}
              </span>
              <Lock size={16} className="text-[#C4785A]" />
            </div>

            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-white">
                {formatMoney(totalEscrow, language)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {escrowAccounts.length} {isAr ? 'ملفات معلقة تحت الحراسة' : 'dossiers sous séquestre fiducière'}
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>{isAr ? 'ودائع البيع العقاري الموثق' : 'Séquestres Immobiliers Notariés'}</span>
                <span className="font-mono font-semibold">8.5M DA</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>{isAr ? 'الودائع القضائية (المحكمة)' : 'Consignations Judiciaires'}</span>
                <span className="font-mono font-semibold">1.2M DA</span>
              </div>
            </div>

            <AtriumButton
              variant="primary"
              className="w-full justify-center"
              onClick={() => setScreen('finance')}
            >
              {isAr ? 'إدارة حسابات الحراسة' : 'Consulter le Coffre Séquestre'}
            </AtriumButton>
          </div>

          {/* Cash Drawer Status Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <CreditCard size={16} className="text-[#C4785A]" />
                {isAr ? 'صندوق السيولة وطابع المادة 317' : 'Caisse Espèces & Timbre Art. 317'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
                Conforme
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'رصيد الصندوق اليومي' : 'Solde Caisse du Jour'}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-white">
                  {formatMoney(dailyClosure.actualPhysicalCashCountedDzd || 0, language)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isAr ? 'رسم الطابع الجبائي المستحق' : 'Droits de Timbre Collectés'}</span>
                <span className="font-bold font-mono text-amber-600">
                  {formatMoney(dailyClosure.totalTimbreAccruedDzd || 0, language)}
                </span>
              </div>
            </div>

            <AtriumButton
              variant="secondary"
              className="w-full justify-center"
              onClick={() => setIsCashClosureModalOpen(true)}
            >
              {isAr ? 'إجراء الجرد وإقفال الصندوق' : 'Effectuer l\'Arrêté de Caisse'}
            </AtriumButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isMatterModalOpen && (
        <LegalMatterModal
          isOpen={isMatterModalOpen}
          onClose={() => setIsMatterModalOpen(false)}
          onSave={addMatter}
        />
      )}

      {isCpcaModalOpen && (
        <CpcaDeadlineModal
          isOpen={isCpcaModalOpen}
          onClose={() => setIsCpcaModalOpen(false)}
          matters={matters}
          onSaveDeadline={addCPCADeadline}
        />
      )}

      {isNotaryModalOpen && (
        <NotaryDeedModal
          isOpen={isNotaryModalOpen}
          onClose={() => setIsNotaryModalOpen(false)}
          nextIndex={notaryDeeds.length + 1}
          onSaveDeed={addNotaryDeed}
        />
      )}

      {isCashClosureModalOpen && (
        <CashClosureModal
          isOpen={isCashClosureModalOpen}
          onClose={() => setIsCashClosureModalOpen(false)}
          closure={dailyClosure}
          cashReceipts={cashReceipts}
          onSaveClosure={updateDailyClosure}
        />
      )}
    </div>
  );
};
