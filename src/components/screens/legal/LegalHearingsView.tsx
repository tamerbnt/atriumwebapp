import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Printer,
  Eye,
  Check,
  X,
  FileText,
  AlertCircle,
  Briefcase,
  Users,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalHearing, CPCADeadline } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const LegalHearingsView: React.FC = () => {
  const { language, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    hearings,
    deadlines,
    matters,
    updateHearing,
    addHearing,
    addCPCADeadline,
    updateCPCADeadline,
  } = useLegalData();

  const [activeWorkflowView, setActiveWorkflowView] = useState<'audiences' | 'cpca_radar'>('audiences');
  const [selectedHearing, setSelectedHearing] = useState<LegalHearing | null>(null);
  const [selectedDeadline, setSelectedDeadline] = useState<CPCADeadline | null>(null);
  const [isCpcaModalOpen, setIsCpcaModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'magistrats' | 'delibere'>('fiche');

  const pendingHearings = hearings.filter((h) => !h.isCompleted).length;
  const criticalDeadlines = deadlines.filter((d) => d.status === 'critical' || d.status === 'approaching').length;

  const toggleHearingCompleted = (hearing: LegalHearing) => {
    const updated: LegalHearing = {
      ...hearing,
      isCompleted: !hearing.isCompleted,
      resultSummary: !hearing.isCompleted ? 'Audience tenue & plaidée au fond' : 'En attente d’audience',
    };
    updateHearing(updated);
    if (selectedHearing?.id === hearing.id) {
      setSelectedHearing(updated);
    }
    showToast(
      isAr
        ? updated.isCompleted ? 'تم تسجيل حضور ومرافعة الجلسة' : 'تمت إعادة تعيين الجلسة كقادمة'
        : updated.isCompleted ? 'Audience marquée comme plaidée' : 'Audience replacée en attente',
      'success'
    );
  };

  const markDeadlineFiled = (deadline: CPCADeadline) => {
    const receiptNum = prompt(
      isAr ? 'أدخل رقم إيداع عريضة الطعن لدى كتابة الضبط:' : 'Numéro d\'enregistrement de la requête d\'appel au Greffe :'
    );
    if (!receiptNum) return;

    const updated: CPCADeadline = {
      ...deadline,
      status: 'filed',
      appealFilingReceipt: {
        filingDate: new Date().toISOString().split('T')[0],
        greffeRegistrationNumber: receiptNum,
        greffierName: 'Greffier en chef',
      },
    };
    updateCPCADeadline(updated);
    showToast(
      isAr
        ? `تم تسجيل إيداع الطعن تحت رقم ${receiptNum} وتبرئة الأجل القانوني`
        : `Recours d'appel déposé au Greffe sous le n° ${receiptNum}. Délai CPCA régularisé.`,
      'success'
    );
  };

  const getHearingActions = (hearing: LegalHearing): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الجلسة' : 'Consulter Fiche',
      icon: <Eye size={14} />,
      onClick: () => setSelectedHearing(hearing),
    },
    {
      label: hearing.isCompleted ? (isAr ? 'إعادة للجدول' : 'Replacer') : (isAr ? 'تمت المرافعة' : 'Plaider'),
      icon: <Check size={14} />,
      onClick: () => toggleHearingCompleted(hearing),
    },
    {
      label: isAr ? 'ورقة الجلسة' : 'Fiche d’Audience',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `طباعة بطاقة الجلسة لقضية ${(hearing.matterTitle || '').substring(0, 20)}...`
            : `Génération de la fiche de plaidoirie (${hearing.courtName || ''})`,
          'info'
        );
      },
    },
  ];

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: hearings.length > 0,
  });

  if (showSkeleton && (hearings.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={4}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {activeLegalRole === 'notaire_titulaire'
                  ? (isAr ? 'متابعة الشهر العقاري ورادار المحافظة العقارية' : 'Conservation Foncière & Calendrier Cadastral')
                  : activeLegalRole === 'expert_comptable'
                  ? (isAr ? 'رزنامة التصريحات الجبائية G50 وCNAS' : 'Échéancier Fiscal G50, IBS & CNAS')
                  : activeLegalRole === 'secretaire_caisse'
                  ? (isAr ? 'محاضر التبليغ القضائي وسجل المحضرين' : 'Registre des Huissiers & Significations')
                  : (isAr ? 'الجلسات القضائية ورادار مواعيد CPCA' : 'Rôle des Audiences & Délais Légaux (CPCA)')}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {hearings.length} audiences · {deadlines.length} délais
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeLegalRole === 'notaire_titulaire'
                ? (isAr ? 'متابعة المهل القانونية للنشر بالمحافظة العقارية والرسوم الإشهارية' : 'Suivi des réquisitions cadastrales et des délais d\'enregistrement trentenaires')
                : activeLegalRole === 'expert_comptable'
                ? (isAr ? 'متابعة الأجل الأقصى ليوم 20 من كل شهر (G50 جباية تيك) والتأمينات الاجتماعية' : 'Échéance légale du 20 de chaque mois (G50 Jibayatic) et cotisations CNAS/CASNOS')
                : activeLegalRole === 'secretaire_caisse'
                ? (isAr ? 'إرسال واستلام أصول التكليف بالحضور مع المحضرين القضائيين' : 'Gestion des significations à personne, exploits d\'huissiers et retours d\'audience')
                : (isAr
                    ? 'جدول الجلسات بالمحاكم والمجالس، آجال الاستئناف الحاسمة، وتمديد الجمعة والسبت (المادة 405)'
                    : 'Calendrier des plaidoiries, composition des chambres et compte à rebours légal Art. 405')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Segmented Toggle */}
          <div className="flex items-center bg-[#F8F9FA] dark:bg-neutral-800/80 p-1 rounded-full border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
            <button
              onClick={() => setActiveWorkflowView('audiences')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeWorkflowView === 'audiences'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Calendar size={13} />
              <span>{isAr ? 'جدول الجلسات' : 'Rôle Audiences'}</span>
            </button>
            <button
              onClick={() => setActiveWorkflowView('cpca_radar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeWorkflowView === 'cpca_radar'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Clock size={13} />
              <span>{isAr ? 'رادار مواعيد CPCA' : 'Radar CPCA'}</span>
              {criticalDeadlines > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          <AtriumButton
            variant="primary"
            onClick={() => setIsCpcaModalOpen(true)}
            icon={<Clock size={14} />}
          >
            {isAr ? 'تسليح أجل CPCA' : 'Armer Délai CPCA'}
          </AtriumButton>
        </div>
      </div>

      {/* Pod Tray KPI Strip */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[110px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{isAr ? 'الجلسات القادمة' : 'Audiences en Attente'}</span>
            <div>
              <div className="text-2xl font-bold font-mono text-amber-600">{pendingHearings}</div>
              <p className="text-[10px] text-neutral-400 mt-0.5">{isAr ? 'قضايا مبرمجة بالمحاكم' : 'affaires inscrites au rôle'}</p>
            </div>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[110px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{isAr ? 'مواعيد الاستئناف الحرجة' : 'Délais CPCA Critiques (<=48h)'}</span>
            <div>
              <div className="text-2xl font-bold font-mono text-rose-600">{criticalDeadlines}</div>
              <p className="text-[10px] text-rose-600/80 mt-0.5">{isAr ? 'تتطلب إيداع عريضة فوري' : 'dépôt urgent au greffe requis'}</p>
            </div>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[110px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{isAr ? 'الطعون المودعة والمبرأة' : 'Recours Déposés au Greffe'}</span>
            <div>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {deadlines.filter((d) => d.status === 'filed').length}
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">{isAr ? 'مع رقم إيصال كتابة الضبط' : 'avec récépissé de dépôt'}</p>
            </div>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[110px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">{isAr ? 'الجلسات المفصولة' : 'Audiences Plaidées'}</span>
            <div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                {hearings.filter((h) => h.isCompleted).length}
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">{isAr ? 'تمت المرافعة وإيداع المستندات' : 'mises en délibéré'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeWorkflowView === 'audiences' ? (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[28px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <UniversalDataCollection<LegalHearing>
            items={hearings}
            keyExtractor={(h) => h.id}
            columns={[
              {
                key: 'hearingDate',
                header: isAr ? 'التاريخ والوقت' : 'Date & Heure',
                width: '2*',
                sortable: true,
                renderCell: (h) => (
                  <div className="text-xs">
                    <span className="font-bold text-neutral-900 dark:text-white font-mono block">
                      {h.hearingDate}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {h.hearingTime || '09:30'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'matterTitle',
                header: isAr ? 'القضية والموضوع' : 'Dossier & Objet',
                width: '4*',
                renderCell: (h) => (
                  <div className="text-xs min-w-0 pr-2">
                    <span className="font-bold text-neutral-900 dark:text-white truncate block">
                      {h.matterTitle}
                    </span>
                    <span className="text-[10px] text-[#C4785A] font-mono mt-0.5 block">
                      {h.purpose || 'Plaidoirie sur le fond'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'court',
                header: isAr ? 'المحكمة والغرفة' : 'Juridiction & Chambre',
                width: '3*',
                renderCell: (h) => (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {h.courtName}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      {h.courtRoom || 'Salle d\'audience'} · {h.benchJudge || 'Président'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'status',
                header: isAr ? 'الوضعية' : 'Statut & Code Renvoi',
                width: '2*',
                renderCell: (h) => (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.isCompleted
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {h.isCompleted ? 'Plaidé' : (h.postponementCode || 'RPP')}
                    </span>
                  </div>
                ),
              },
            ]}
            searchPlaceholder={isAr ? 'بحث في الجلسات، المحكمة، أو الموضوع...' : 'Rechercher une audience, juridiction, juge...'}
            onItemClick={(h: LegalHearing) => setSelectedHearing(h)}
            customActions={(hearing: LegalHearing) => getHearingActions(hearing)}
          />
        </div>
      ) : (
        /* CPCA Procedural Deadline Radar Grid */
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[28px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#C4785A]" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'جدول المواعيد والطعون القانونية (CPCA)' : 'Registre des Délais de Recours (CPCA - Loi 08-09)'}
              </h3>
            </div>
            <span className="text-xs text-neutral-500">
              {isAr ? 'تحديث آلي حسب قانون الإجراءات المدنية والإدارية' : 'Calcul automatique et prorogation Art. 405'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deadlines.map((dl) => {
              const expiry = new Date(dl.terminalExpiryDate);
              const now = new Date();
              const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 5 && dl.status !== 'filed';

              return (
                <div
                  key={dl.id}
                  className={`p-5 rounded-2xl bg-white dark:bg-neutral-800 border transition-all space-y-3 ${
                    dl.status === 'filed'
                      ? 'border-emerald-200 dark:border-emerald-900/50'
                      : isUrgent
                      ? 'border-rose-300 dark:border-rose-900 shadow-md'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                        {dl.caseNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                        {dl.recourseType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dl.status === 'filed'
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : isUrgent
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-500/15 text-amber-700'
                      }`}
                    >
                      {dl.status === 'filed' ? '✓ Déposé au Greffe' : `${diffDays} jours restants`}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {dl.courtJurisdiction} — {dl.chamber}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {isAr ? 'تاريخ التبليغ:' : 'Signifié le :'} {dl.notificationDate} par {dl.bailiffName}
                    </p>
                  </div>

                  {/* Terminal Expiration Box */}
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'السقوط النهائي:' : 'Expiration Finale :'}</span>
                      <span className="font-mono font-bold text-[#C4785A]">
                        {expiry.toLocaleDateString('fr-DZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} à 16:30
                      </span>
                    </div>
                    {dl.isRolledOver && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        Prorogé Art. 405
                      </span>
                    )}
                  </div>

                  {dl.appealFilingReceipt ? (
                    <div className="text-[11px] text-emerald-600 font-mono font-semibold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 size={14} />
                      <span>Récépissé Greffe N° {dl.appealFilingReceipt.greffeRegistrationNumber} ({dl.appealFilingReceipt.filingDate})</span>
                    </div>
                  ) : (
                    <div className="pt-2 flex justify-end gap-2">
                      <AtriumButton
                        variant="secondary"
                        size="sm"
                        onClick={() => markDeadlineFiled(dl)}
                        icon={<Check size={13} />}
                      >
                        {isAr ? 'تسجيل إيداع العريضة' : 'Enregistrer Dépôt Greffe'}
                      </AtriumButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hearing Side Inspector Drawer */}
      {selectedHearing && (
        <div className="fixed inset-y-0 right-0 z-50 w-[390px] bg-white dark:bg-neutral-800 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                  {selectedHearing.hearingDate}
                </span>
              </div>
              <button
                onClick={() => setSelectedHearing(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {selectedHearing.matterTitle}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">{selectedHearing.courtName}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'القاضي الرئيس' : 'Président de Chambre'}</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedHearing.benchJudge || 'Magistrat'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'القاعة' : 'Salle d\'Audience'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedHearing.courtRoom || 'Salle 04'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isAr ? 'طبيعة الإجراء' : 'Objet Audience'}</span>
                <span className="font-semibold text-[#C4785A]">{selectedHearing.purpose || 'Plaidoirie'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
            <AtriumButton
              variant={selectedHearing.isCompleted ? 'secondary' : 'primary'}
              className="flex-1 justify-center"
              onClick={() => toggleHearingCompleted(selectedHearing)}
              icon={<Check size={14} />}
            >
              {selectedHearing.isCompleted ? (isAr ? 'إعادة للجدول' : 'Replacer') : (isAr ? 'تمت المرافعة' : 'Marquer Plaidé')}
            </AtriumButton>
            <AtriumButton
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => setSelectedHearing(null)}
            >
              {isAr ? 'إغلاق' : 'Fermer'}
            </AtriumButton>
          </div>
        </div>
      )}

      {/* Cpca Deadline Modal */}
      {isCpcaModalOpen && (
        <CpcaDeadlineModal
          isOpen={isCpcaModalOpen}
          onClose={() => setIsCpcaModalOpen(false)}
          matters={matters}
          onSaveDeadline={addCPCADeadline}
        />
      )}
    </div>
  );
};
