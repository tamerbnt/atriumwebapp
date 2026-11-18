import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Printer,
  Download,
  Pin,
  Receipt,
  Users,
  Send,
  Coins,
  Check,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'FC').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const MEMBER_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]';

export const MedicalBillingView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    consultations,
    markConsultationPaid,
    practitioners,
    chifaClaims,
    dailyClosures,
    addDailyClosure,
    consumables,
    restockConsumable,
    depleteConsumable,
  } = useMedicalData();

  const [billingMainTab, setBillingMainTab] = useState<
    'invoices' | 'bordereau' | 'honoraires' | 'caisse' | 'consumables'
  >('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [coverageFilter, setCoverageFilter] = useState<'All' | '100' | '80'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('consultationDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['cons_02']));
  const [pinnedClaimIds, setPinnedClaimIds] = useState<Set<string>>(() => new Set<string>());
  const [bordereauSearch, setBordereauSearch] = useState('');
  const [bordereauViewMode, setBordereauViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [inspectedConsultation, setInspectedConsultation] = useState<MedicalConsultation | null>(
    null
  );
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>('decompte');

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [countedCash, setCountedCash] = useState('24500');
  const [closureNotes, setClosureNotes] = useState(
    'Caisse journalière équilibrée. Aucune anomalie constatée.'
  );

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeConsultation = useMemo(() => {
    if (!inspectedConsultation) return null;
    return consultations.find((c) => c.id === inspectedConsultation.id) || null;
  }, [inspectedConsultation, consultations]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    consultations.forEach((c) => {
      const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [consultations, branchesById, currentBranch, language]);

  const billingCounts = useMemo(
    () => ({
      all: consultations.length,
      paid: consultations.filter((c) => c.isPaid).length,
      pending: consultations.filter((c) => !c.isPaid).length,
    }),
    [consultations]
  );

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (coverageFilter === '100' && (c.copayAmountDzd || 0) !== 0) return false;
      if (coverageFilter === '80' && (c.copayAmountDzd || 0) === 0) return false;
      if (statusFilter === 'paid' && !c.isPaid) return false;
      if (statusFilter === 'pending' && c.isPaid) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !(
            c.patientName.toLowerCase().includes(q) ||
            c.chiefComplaint.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q)
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    consultations,
    branchFilter,
    coverageFilter,
    statusFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedConsultations = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      if (sortBy === 'consultationFeeDzd') {
        return sortDir === 'asc'
          ? a.consultationFeeDzd - b.consultationFeeDzd
          : b.consultationFeeDzd - a.consultationFeeDzd;
      }
      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      if (sortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'isPaid') {
        const cmp = Number(a.isPaid) - Number(b.isPaid);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc'
        ? a.consultationDate.localeCompare(b.consultationDate)
        : b.consultationDate.localeCompare(a.consultationDate);
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalFee = useMemo(
    () => consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0),
    [consultations]
  );
  const totalPaid = useMemo(
    () => consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0),
    [consultations]
  );
  const totalInsurance = useMemo(
    () => consultations.reduce((acc, c) => acc + c.insuranceShareDzd, 0),
    [consultations]
  );
  const expectedCashTotal = useMemo(
    () =>
      consultations
        .filter((c) => c.isPaid)
        .reduce((acc, c) => acc + (c.copayAmountDzd || c.consultationFeeDzd * 0.2), 0),
    [consultations]
  );

  const totalClaimsCount = chifaClaims.length;
  const totalCnasShare = chifaClaims.reduce(
    (acc, cl) => acc + (cl.cnasShareDzd ?? cl.chifaShareDzd ?? 0),
    0
  );
  const totalTicketModerateur = chifaClaims.reduce(
    (acc, cl) => acc + (cl.ticketModerateurDzd ?? cl.copayPaidDzd ?? 0),
    0
  );
  const transmittedCount = chifaClaims.filter(
    (cl) => cl.isTransmitted ?? cl.status === 'Submitted'
  ).length;

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast({
        type: 'info',
        title: isAr ? 'التثبيت' : 'Épinglage',
        message: isAr ? 'تم تحديث التثبيت' : 'Statut épinglé mis à jour',
      });
    },
    [isAr]
  );

  const handleTogglePinClaim = useCallback(
    (id: string) => {
      setPinnedClaimIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast({
        type: 'info',
        title: isAr ? 'التثبيت' : 'Épinglage',
        message: isAr ? 'تم تحديث تثبيت الملف' : 'Dossier CNAS mis à jour',
      });
    },
    [isAr]
  );

  const sortedChifaClaims = useMemo(() => {
    const q = bordereauSearch.trim().toLowerCase();
    const list = chifaClaims.filter((cl) => {
      if (!q) return true;
      return (
        cl.id.toLowerCase().includes(q) ||
        cl.patientName.toLowerCase().includes(q) ||
        cl.chifaNumber.toLowerCase().includes(q) ||
        cl.ngapCode.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const ap = pinnedClaimIds.has(a.id);
      const bp = pinnedClaimIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [chifaClaims, bordereauSearch, pinnedClaimIds]);

  const handleSelectConsultation = useCallback(
    (c: MedicalConsultation, opener?: HTMLElement | null) => {
      if (opener) setDrawerOpenerEl(opener);
      setInspectedConsultation(c);
      setActiveInspectorTab('decompte');
    },
    []
  );

  const handlePay = useCallback(
    (c: MedicalConsultation) => {
      markConsultationPaid(c.id);
      setInspectedConsultation({ ...c, isPaid: true });
      showToast({
        type: 'success',
        title: isAr ? 'تم التحصيل' : 'Paiement validé',
        message: isAr
          ? 'تم تسجيل الدفع وإصدار المخالصة'
          : `Paiement (${paymentMethod}) enregistré & quittance validée`,
      });
    },
    [markConsultationPaid, paymentMethod, isAr]
  );

  const handlePrintReceipt = useCallback(
    (_c: MedicalConsultation) => {
      showToast({
        type: 'info',
        title: isAr ? 'الطباعة' : 'Impression Quittance',
        message: isAr ? 'جاري طباعة إيصال الدفع...' : 'Génération de la quittance médicale...',
      });
      window.print();
    },
    [isAr]
  );

  const handleTransmitBordereau = () => {
    showToast({
      type: 'success',
      title: 'Télétransmission CNAS',
      message: isAr
        ? 'تم إرسال الجدول الإلكتروني للضمان الاجتماعي CNAS بنجاح'
        : 'Télétransmission du bordereau CNAS/Chifa réussie avec accusé de réception',
    });
  };

  const handleSaveCashClosure = () => {
    const counted = parseFloat(countedCash) || 0;
    const diff = counted - expectedCashTotal;
    const closure = {
      id: `closure_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      closedBySecretary: 'Secrétariat Principal (Rania M.)',
      totalConsultationsCount: consultations.length,
      expectedCashDzd: expectedCashTotal,
      countedCashDzd: counted,
      discrepancyDzd: diff,
      notes: closureNotes,
      verifiedAt: new Date().toLocaleTimeString(),
    };
    addDailyClosure(closure as any);
    showToast({
      type: 'success',
      title: 'Clôture de Caisse',
      message: isAr
        ? 'تم إغلاق الصندوق اليومي وحفظ تقرير الكاسة'
        : 'Clôture de caisse validée et consignée',
    });
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Date',
      'Ticket',
      'Patient',
      'Branch',
      'NGAP',
      'Total Fee DZD',
      'Copay DZD',
      'Chifa Share DZD',
      'Status',
    ];
    const rows = sortedConsultations.map((c) => [
      c.id,
      c.consultationDate.split('T')[0],
      c.ticketNumber || '',
      c.patientName,
      resolveRecordBranch(c, branchesById, currentBranch, language).name,
      c.ngapCode || 'C',
      c.consultationFeeDzd,
      c.copayAmountDzd || 0,
      c.insuranceShareDzd || 0,
      c.isPaid ? 'Encaissé' : 'En attente',
    ]);
    downloadCsvSafe(`medical_billing_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تم التصدير' : isFr ? 'Export terminé' : 'Export Complete',
      message: isAr ? 'تم تصدير سجل الفواتير' : 'Journal de facturation CSV exporté',
    });
  }, [sortedConsultations, branchesById, currentBranch, language, isAr, isFr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setBranchFilter('All');
    setCoverageFilter('All');
  }, []);

  const activeFiltersCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (coverageFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: statusFilter === 'paid' ? 'Encaissées' : 'En attente',
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (coverageFilter !== 'All') {
      chips.push({
        key: 'coverage',
        label: coverageFilter === '100' ? 'ALD 100%' : 'Régime 80%',
        onRemove: () => setCoverageFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, branchFilter, coverageFilter, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'حالة التحصيل' : isFr ? 'Statut Recouvrement' : 'Payment Status',
        value: statusFilter,
        resetValue: 'all',
        onChange: (val) => setStatusFilter(val as 'all' | 'paid' | 'pending'),
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: billingCounts.all },
          { value: 'paid', label: isAr ? 'محصل' : 'Encaissées', count: billingCounts.paid },
          { value: 'pending', label: isAr ? 'منتظر' : 'En attente', count: billingCounts.pending },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / العيادة' : isFr ? 'Branche / Clinique' : 'Branch / Clinic',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الفروع' : isFr ? 'Toutes' : 'All Branches',
            count: consultations.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'coverage',
        label: isAr ? 'نسبة التأمين Chifa' : isFr ? 'Régime Chifa' : 'Chifa Tier',
        value: coverageFilter,
        onChange: (val) => setCoverageFilter(val as 'All' | '100' | '80'),
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: '80', label: '80% Standard' },
          { value: '100', label: '100% ALD' },
        ],
      },
    ],
    [
      statusFilter,
      branchFilter,
      coverageFilter,
      billingCounts,
      consultations.length,
      branchCounts,
      isAr,
      isFr,
    ]
  );

  const columns: ColumnDefinition<MedicalConsultation>[] = useMemo(
    () => [
      {
        key: 'patientName',
        header: isAr ? 'المريض / الفحص' : 'Patient & Acte Médical',
        sortable: true,
        width: '2.4*',
        renderCell: (c) => {
          const isPinned = pinnedIds.has(c.id);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-neutral-800">
                <Receipt size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                  {c.patientName}
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">PIN</span>}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 font-mono truncate">
                  {c.ticketNumber ? `Ticket: ${c.ticketNumber} · ` : ''}
                  {c.ngapCode || 'C'} · {c.consultationDate.split('T')[0]}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        sortable: true,
        width: '1.5*',
        renderCell: (c) => (
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {resolveRecordBranch(c, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'consultationFeeDzd',
        header: isAr ? 'الأتعاب الإجمالية' : 'Total Honoraires',
        sortable: true,
        width: '1.4*',
        renderCell: (c) => (
          <div className="font-mono font-bold text-xs text-black dark:text-white">
            {formatMoney(c.consultationFeeDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'copayAmountDzd',
        header: isAr ? 'حصة المريض' : 'Part Patient (TM)',
        width: '1.4*',
        renderCell: (c) => (
          <div className="font-mono text-xs text-black/70 dark:text-white/75">
            {formatMoney(c.copayAmountDzd || 0, 'DZD')}
          </div>
        ),
      },
      {
        key: 'insuranceShareDzd',
        header: isAr ? 'تغطية Chifa' : 'Tiers Payant Chifa',
        width: '1.4*',
        renderCell: (c) => (
          <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
            {formatMoney(c.insuranceShareDzd || 0, 'DZD')}
          </div>
        ),
      },
      {
        key: 'isPaid',
        header: isAr ? 'حالة التحصيل' : 'Statut Recouvrement',
        sortable: true,
        width: '1.3*',
        renderCell: (c) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              c.isPaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            {c.isPaid ? (isAr ? 'مدفوع' : 'Encaissé') : isAr ? 'معلق' : 'En attente'}
          </span>
        ),
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isFr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: consultations.length > 0,
  });

  if (showSkeleton && (consultations.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn={false}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<CreditCard size={22} />}
        title={isAr ? 'الفوترة' : language === 'en' ? 'Billing' : 'Facturation'}
        secondaryActions={
          <div className="flex flex-wrap items-center p-1 rounded-xl bg-[#F3EDE7] dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs gap-1">
            {(
              [
                { id: 'invoices', label: isAr ? 'الفواتير والتحصيل' : 'Factures & Tiers-Payant' },
                { id: 'bordereau', label: isAr ? 'جدول CNAS' : 'Bordereau CNAS' },
                { id: 'honoraires', label: isAr ? 'أتعاب الأطباء' : 'Honoraires' },
                { id: 'caisse', label: isAr ? 'إغلاق الصندوق' : 'Clôture Caisse' },
                { id: 'consumables', label: isAr ? 'المستهلكات' : 'Consommables' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBillingMainTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  billingMainTab === t.id
                    ? 'bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold'
                    : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr ? 'مؤشرات التحصيل الطبي والتأمين' : 'Indicateurs de Recouvrement & Tiers-Payant'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'فواتير محصلة' : 'Factures Encaissées',
          badgeText: isAr ? 'محصل' : 'Encaissé',
          count: billingCounts.paid,
          tone: 'emerald',
          isActive: statusFilter === 'paid' && billingMainTab === 'invoices',
          onToggle: () => {
            setBillingMainTab('invoices');
            setStatusFilter((prev) => (prev === 'paid' ? 'all' : 'paid'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'قيد الانتظار' : 'En Attente de Règlement',
          badgeText: isAr ? 'معلق' : 'Attente',
          count: billingCounts.pending,
          tone: 'terracotta',
          isActive: statusFilter === 'pending' && billingMainTab === 'invoices',
          onToggle: () => {
            setBillingMainTab('invoices');
            setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
          },
        }}
        darkCard={{
          label: isAr ? 'المتحصلات الفعلية' : 'Encaissements & Chifa',
          badgeCount: totalInsurance,
          badgeSuffix: ' DA Chifa',
          valueCount: totalPaid,
          valueSuffix: ' DA',
          caption: `${isAr ? 'المتبقي' : 'Reste à percevoir'}: ${formatMoney(
            Math.max(0, totalFee - totalPaid),
            'DZD'
          )}`,
        }}
      />

      {billingMainTab === 'invoices' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'دفتر الفواتير والتحصيل الطبي' : 'Journal de Facturation & Recouvrement'}
            liveRegionText={`${sortedConsultations.length} ${isAr ? 'فاتورة' : 'factures'}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr ? 'بحث برقم الفاتورة أو اسم المريض...' : 'Rechercher facture, patient...'
            }
            statusValue={statusFilter}
            onStatusChange={(val) => setStatusFilter(val as 'all' | 'paid' | 'pending')}
            statusOptions={[
              {
                value: 'all',
                label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All',
                count: billingCounts.all,
              },
              {
                value: 'paid',
                label: isAr ? 'محصل' : isFr ? 'Encaissées' : 'Paid',
                count: billingCounts.paid,
              },
              {
                value: 'pending',
                label: isAr ? 'منتظر' : isFr ? 'Attente' : 'Pending',
                count: billingCounts.pending,
              },
            ]}
            hasActiveAdvancedFilters={activeFiltersCount > 0}
            activeFiltersCount={activeFiltersCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle
            onExport={handleExportCSV}
            activeChips={activeChips}
            onResetAllFilters={handleResetFilters}
          />

          <UniversalDataCollection
            hideToolbar
            items={sortedConsultations}
            keyExtractor={(c) => c.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(c) => pinnedIds.has(c.id)}
            onTogglePin={(c) => handleTogglePin(c.id)}
            openItemId={activeConsultation?.id ?? null}
            onItemClick={handleSelectConsultation}
            onViewDetails={handleSelectConsultation}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير' : 'Exporter CSV',
              icon: <Download size={14} />,
              onClick: handleExportCSV,
            }}
            getRowMeta={(c): KineticRowMeta => ({
              title: c.patientName,
              subline: `${c.ticketNumber ? `${c.ticketNumber} · ` : ''}${c.ngapCode || 'C'} · ${
                c.consultationDate.split('T')[0]
              }`,
              avatarText: getInitials2(c.patientName),
              categoryLabel: c.ngapCode || 'NGAP',
              statusLabel: c.isPaid ? (isAr ? 'مدفوع' : 'Encaissé') : isAr ? 'معلق' : 'En attente',
              statusVariant: c.isPaid ? 'active' : 'warning',
              metricPrimary: formatMoney(c.consultationFeeDzd, 'DZD'),
              metricSecondary: `TM: ${formatMoney(c.copayAmountDzd || 0, 'DZD')} · Chifa: ${formatMoney(
                c.insuranceShareDzd || 0,
                'DZD'
              )}`,
              isPinned: pinnedIds.has(c.id),
              detailCol1: { heading: 'NGAP', primaryText: c.ngapCode || 'C' },
              detailCol2: { heading: 'Ticket Modérateur', primaryText: formatMoney(c.copayAmountDzd || 0, 'DZD') },
              detailCol3: { heading: 'Part Chifa', primaryText: formatMoney(c.insuranceShareDzd || 0, 'DZD') },
            })}
            getFanActions={(c): KineticRowFanAction<MedicalConsultation>[] => [
              ...(!c.isPaid
                ? [
                    {
                      id: 'pay',
                      label: isAr ? 'تحصيل' : 'Encaisser',
                      icon: <CheckCircle2 size={13} />,
                      onClick: () => handlePay(c),
                    },
                  ]
                : []),
              {
                id: 'print',
                label: isAr ? 'إيصال' : 'Quittance',
                icon: <Printer size={13} />,
                onClick: () => handlePrintReceipt(c),
              },
              {
                id: 'pin',
                label: pinnedIds.has(c.id) ? 'Détacher' : 'Épingler',
                icon: <Pin size={13} />,
                onClick: () => handleTogglePin(c.id),
              },
            ]}
            getDetailActions={(c): KineticDetailAction[] => [
              ...(!c.isPaid
                ? [
                    {
                      id: 'pay',
                      label: isAr ? 'تحصيل' : 'Encaisser',
                      icon: <CheckCircle2 size={14} />,
                      onClick: () => handlePay(c),
                    },
                  ]
                : []),
              {
                id: 'print',
                label: isAr ? 'إيصال' : 'Quittance',
                icon: <Printer size={14} />,
                onClick: () => handlePrintReceipt(c),
              },
            ]}
            emptyTitle={isAr ? 'لا توجد فواتير' : 'Aucune consultation facturée'}
            emptyDescription={
              isAr
                ? 'تظهر الفواتير بمجرد إتمام الفحص'
                : 'Les consultations terminées apparaissent automatiquement dans ce journal'
            }
            onResetFilters={handleResetFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          />
        </ScreenPod>
      )}

      {billingMainTab === 'bordereau' && (
        <ScreenPod>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  <span>Bordereau Mensuel de Télétransmission Chifa / CNAS</span>
                </h2>
                <p className="text-[11px] text-black/55 dark:text-white/55">
                  Période: Mai 2026 · Bordereau N° BOR-2026-05-ALGER · Centre de Paiement CNAS 1601
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    showToast({
                      type: 'info',
                      title: 'Export CNAS',
                      message: 'Export du bordereau officiel CNAS au format PDF réglementaire',
                    });
                    window.print();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>Exporter PDF CNAS</span>
                </button>
                <AtriumButton
                  variant="primary"
                  size="md"
                  icon={<Send size={14} />}
                  onClick={handleTransmitBordereau}
                >
                  <span>Télétransmettre à la CNAS</span>
                </AtriumButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">
                  Total Fiches Chifa
                </span>
                <div className="text-xl font-bold font-mono text-black dark:text-white mt-1">
                  {totalClaimsCount} dossiers
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">
                  {transmittedCount} télétransmis
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
                <span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">
                  Total Honoraires NGAP
                </span>
                <div className="text-xl font-bold font-mono tabular-nums text-black dark:text-white mt-1">
                  {formatMoney(totalClaimsCount * 2800, 'DZD')}
                </div>
                <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                  Tarifs conventionnels
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
                <span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">
                  Créance Due par la CNAS
                </span>
                <div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                  {formatMoney(totalCnasShare, 'DZD')}
                </div>
                <span className="text-[10px] text-blue-500 font-medium">
                  À virer au compte polyclinique
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
                <span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">
                  Ticket Modérateur Encaissé
                </span>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatMoney(totalTicketModerateur, 'DZD')}
                </div>
                <span className="text-[10px] text-black/55 dark:text-white/55">
                  Payé par les assurés
                </span>
              </div>
            </div>

            <ScreenCollectionToolbar
              title={isAr ? 'كشوفات CNAS / Chifa' : 'Fiches de Télétransmission Chifa'}
              liveRegionText={`${sortedChifaClaims.length} dossiers`}
              language={language}
              searchQuery={bordereauSearch}
              onSearchChange={setBordereauSearch}
              searchPlaceholder="Rechercher assuré, N° Chifa, acte NGAP..."
              viewMode={bordereauViewMode}
              onViewModeChange={setBordereauViewMode}
              showViewToggle
              onExport={() => {
                const headers = ['N° Dossier', 'Assuré(e)', 'N° Carte Chifa', 'NGAP', 'Taux %', 'Part CNAS', 'Ticket Modérateur', 'Statut'];
                const rows = sortedChifaClaims.map((claim) => {
                  const rate = claim.coverageRate ?? claim.chifaCoveragePercent ?? 80;
                  const transmitted = claim.isTransmitted ?? claim.status === 'Submitted';
                  return [
                    claim.id,
                    claim.patientName,
                    claim.chifaNumber,
                    claim.ngapCode,
                    `${rate}%`,
                    claim.cnasShareDzd ?? claim.chifaShareDzd ?? 0,
                    claim.ticketModerateurDzd ?? claim.copayPaidDzd ?? 0,
                    transmitted ? 'Transmis' : "Prêt à l'envoi",
                  ];
                });
                downloadCsvSafe(`bordereau_cnas_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
                showToast({ type: 'info', title: 'Export CNAS', message: 'Bordereau CNAS exporté en CSV' });
              }}
              onResetAllFilters={() => setBordereauSearch('')}
            />

            <UniversalDataCollection
              hideToolbar
              items={sortedChifaClaims}
              keyExtractor={(claim) => claim.id}
              viewMode={bordereauViewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={bordereauViewMode === 'grid' ? 'grid' : 'list'}
              isPinned={(claim) => pinnedClaimIds.has(claim.id)}
              onTogglePin={(claim) => handleTogglePinClaim(claim.id)}
              columns={[
                {
                  key: 'id',
                  header: 'N° Dossier',
                  width: '1.1*',
                  renderCell: (claim) => (
                    <span className="font-mono font-semibold text-xs text-black dark:text-white">{claim.id}</span>
                  ),
                },
                {
                  key: 'patientName',
                  header: 'Assuré(e) & Chifa',
                  width: '2.2*',
                  renderCell: (claim) => (
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-black dark:text-white truncate">{claim.patientName}</div>
                      <div className="text-[11px] font-mono text-black/55 dark:text-white/55 truncate">{claim.chifaNumber}</div>
                    </div>
                  ),
                },
                {
                  key: 'ngapCode',
                  header: 'Cotation & Taux',
                  width: '1.4*',
                  renderCell: (claim) => {
                    const rate = claim.coverageRate ?? claim.chifaCoveragePercent ?? 80;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#d4522f]">{claim.ngapCode}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rate === 100
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {rate}% {rate === 100 ? 'ALD' : ''}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'cnasShare',
                  header: 'Part CNAS',
                  width: '1.3*',
                  renderCell: (claim) => (
                    <span className="font-mono font-bold text-xs text-blue-600">
                      {formatMoney(claim.cnasShareDzd ?? claim.chifaShareDzd ?? 0, 'DZD')}
                    </span>
                  ),
                },
                {
                  key: 'tm',
                  header: 'Ticket Mod.',
                  width: '1.2*',
                  renderCell: (claim) => (
                    <span className="font-mono text-xs text-black/70 dark:text-white/75">
                      {formatMoney(claim.ticketModerateurDzd ?? claim.copayPaidDzd ?? 0, 'DZD')}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Statut',
                  width: '1.2*',
                  renderCell: (claim) => {
                    const transmitted = claim.isTransmitted ?? claim.status === 'Submitted';
                    return (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          transmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {transmitted ? 'Transmis ✓' : "Prêt à l'envoi"}
                      </span>
                    );
                  },
                },
              ]}
              getRowMeta={(claim): KineticRowMeta => {
                const rate = claim.coverageRate ?? claim.chifaCoveragePercent ?? 80;
                const transmitted = claim.isTransmitted ?? claim.status === 'Submitted';
                const cnasShare = claim.cnasShareDzd ?? claim.chifaShareDzd ?? 0;
                const tm = claim.ticketModerateurDzd ?? claim.copayPaidDzd ?? 0;
                return {
                  title: claim.patientName,
                  subline: `${claim.id} · Chifa ${claim.chifaNumber}`,
                  avatarText: getInitials2(claim.patientName),
                  categoryLabel: `${claim.ngapCode} · ${rate}%`,
                  statusLabel: transmitted ? 'Transmis ✓' : "Prêt à l'envoi",
                  statusVariant: transmitted ? 'active' : 'warning',
                  metricPrimary: formatMoney(cnasShare, 'DZD'),
                  metricSecondary: `TM ${formatMoney(tm, 'DZD')}`,
                  isPinned: pinnedClaimIds.has(claim.id),
                  detailCol1: {
                    heading: 'Assuré & Chifa',
                    primaryText: claim.patientName,
                    secondaryText: `Chifa ${claim.chifaNumber}`,
                  },
                  detailCol2: {
                    heading: 'Cotation NGAP & Taux',
                    primaryText: `NGAP ${claim.ngapCode} · ${rate}%`,
                    secondaryText: claim.id,
                  },
                  detailCol3: {
                    heading: 'Décompte CNAS / TM',
                    primaryText: `CNAS ${formatMoney(cnasShare, 'DZD')}`,
                    secondaryText: `TM ${formatMoney(tm, 'DZD')}`,
                  },
                };
              }}
              getFanActions={(claim): KineticRowFanAction[] => [
                {
                  id: 'transmit',
                  label: 'Télétransmettre',
                  icon: <Send size={13} />,
                  onClick: handleTransmitBordereau,
                },
                {
                  id: 'pdf-cnas',
                  label: 'PDF CNAS',
                  icon: <Download size={13} />,
                  onClick: () => {
                    showToast({
                      type: 'info',
                      title: 'Export CNAS',
                      message: `Fiche CNAS ${claim.id} prête pour impression PDF`,
                    });
                    window.print();
                  },
                },
                {
                  id: 'pin',
                  label: pinnedClaimIds.has(claim.id) ? 'Détacher' : 'Épingler',
                  icon: <Pin size={13} />,
                  onClick: () => handleTogglePinClaim(claim.id),
                },
              ]}
              getDetailActions={(claim): KineticDetailAction[] => [
                {
                  id: 'transmit',
                  label: 'Télétransmettre',
                  icon: <Send size={14} />,
                  onClick: handleTransmitBordereau,
                },
                {
                  id: 'pdf-cnas',
                  label: 'PDF CNAS',
                  icon: <Download size={14} />,
                  onClick: () => {
                    showToast({
                      type: 'info',
                      title: 'Export CNAS',
                      message: `Fiche CNAS ${claim.id} prête pour impression PDF`,
                    });
                    window.print();
                  },
                },
                {
                  id: 'pin',
                  label: pinnedClaimIds.has(claim.id) ? 'Détacher' : 'Épingler',
                  icon: <Pin size={14} />,
                  onClick: () => handleTogglePinClaim(claim.id),
                },
              ]}
              emptyTitle="Aucun dossier Chifa"
              emptyDescription="Aucune fiche ne correspond à votre recherche"
              onResetFilters={() => setBordereauSearch('')}
              hasActiveFilters={bordereauSearch.trim().length > 0}
            />
          </div>
        </ScreenPod>
      )}

      {billingMainTab === 'honoraires' && (
        <ScreenPod>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <Users size={16} className="text-[#d4522f]" />
                <span>Rétrocession des Honoraires Médicaux &amp; Quotes-parts Polyclinique</span>
              </h2>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Bordereau Comptable CSV</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practitioners.map((doc) => {
                const docName = doc.fullName || doc.name || 'Dr. Praticien';
                const docRoom = doc.roomNumber || doc.cabinetRoom || 'Cabinet 1';
                const docShare = doc.commissionRatePercent ?? doc.commissionPercent ?? 70;
                const grossTurnover = 125000;
                const doctorPayout = (grossTurnover * docShare) / 100;
                const polyclinicRetention = grossTurnover - doctorPayout;
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-black dark:text-white truncate">
                          {docName}
                        </h3>
                        <p className="text-[11px] text-black/55 dark:text-white/55 truncate">
                          {doc.specialty}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#d4522f] font-bold text-[10px] font-mono border border-orange-200/50 shrink-0">
                        {docShare}% Rétrocession
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-black/55 dark:text-white/55">
                        <span>Chiffre d&apos;affaires brut:</span>
                        <span className="font-bold text-black dark:text-white">
                          {formatMoney(grossTurnover, 'DZD')}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Net Médecin ({docShare}%):</span>
                        <span className="font-bold">{formatMoney(doctorPayout, 'DZD')}</span>
                      </div>
                      <div className="flex justify-between text-black/55 dark:text-white/55 text-[11px]">
                        <span>Quote-part Polyclinique:</span>
                        <span>{formatMoney(polyclinicRetention, 'DZD')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                        Cabinet: {docRoom}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          showToast({
                            type: 'success',
                            title: 'Règlement Praticien',
                            message: `Virement généré pour ${docName}: ${formatMoney(
                              doctorPayout,
                              'DZD'
                            )}`,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white font-semibold text-[11px] shadow-2xs hover:bg-[#b3694c] transition-colors cursor-pointer"
                      >
                        Émettre Règlement
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScreenPod>
      )}

      {billingMainTab === 'caisse' && (
        <ScreenPod>
          <div className="space-y-5">
            <div className="pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <Coins size={16} className="text-amber-500" />
                <span>Feuille de Caisse Journalière &amp; Clôture Secrétariat</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4 text-xs">
                <h3 className="font-bold text-black dark:text-white text-xs uppercase tracking-wider">
                  Comptage Physique du Tiroir Caisse (Aujourd&apos;hui)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">
                      Espèces Attendues (Système)
                    </span>
                    <div className="text-xl font-bold font-mono tabular-nums text-black dark:text-white mt-1">
                      {formatMoney(expectedCashTotal, 'DZD')}
                    </div>
                    <span className="text-[10px] text-black/55 dark:text-white/55">
                      Base tickets modérateurs encaissés
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
                    <label className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase block mb-1">
                      Espèces Comptées Physiquement (DZD)
                    </label>
                    <input
                      type="number"
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold text-base text-black dark:text-white"
                    />
                    {(() => {
                      const diff = (parseFloat(countedCash) || 0) - expectedCashTotal;
                      return (
                        <span
                          className={`text-[10px] font-bold block mt-1 ${
                            diff === 0
                              ? 'text-emerald-600'
                              : diff > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          Écart: {diff >= 0 ? `+${diff}` : diff} DZD{' '}
                          {diff === 0
                            ? '(Caisse Juste ✓)'
                            : diff > 0
                            ? '(Excédent)'
                            : '(Déficit de caisse)'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase mb-1">
                    Observations et Justificatifs
                  </label>
                  <textarea
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs text-black dark:text-white"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <AtriumButton
                    variant="primary"
                    size="md"
                    icon={<Check size={14} />}
                    onClick={handleSaveCashClosure}
                  >
                    <span>Valider &amp; Signer la Clôture de Caisse</span>
                  </AtriumButton>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3 text-xs">
                <h3 className="font-bold text-black dark:text-white text-xs uppercase tracking-wider">
                  Historique des Clôtures de Caisse
                </h3>
                <div className="space-y-2">
                  {dailyClosures.map((cl) => (
                    <div
                      key={cl.id}
                      className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-black dark:text-white font-mono">
                          {cl.date}
                        </span>
                        <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                          {cl.verifiedAt || '17:30'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-black/70 dark:text-white/75">
                        <span>
                          Compté:{' '}
                          {formatMoney(
                            cl.countedCashDzd ?? cl.actualCashInDrawerDzd ?? 0,
                            'DZD'
                          )}
                        </span>
                        <span
                          className={
                            cl.discrepancyDzd === 0
                              ? 'text-emerald-600 font-bold'
                              : 'text-rose-600 font-bold'
                          }
                        >
                          Écart:{' '}
                          {cl.discrepancyDzd >= 0
                            ? `+${cl.discrepancyDzd}`
                            : cl.discrepancyDzd}{' '}
                          DZD
                        </span>
                      </div>
                      <p className="text-[11px] text-black/55 dark:text-white/55 italic">
                        &ldquo;{cl.notes || 'Clôture normale'}&rdquo; —{' '}
                        {cl.closedBySecretary || cl.closedByStaffName || 'Secrétariat'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScreenPod>
      )}

      {billingMainTab === 'consumables' && (
        <ScreenPod>
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                  <Building2 size={16} className="text-[#d4522f]" />
                  <span>
                    {isAr
                      ? 'المخزون والمستهلكات السريرية'
                      : 'Pharmacie Interne & Consommables de Soins'}
                  </span>
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  {isAr
                    ? 'متابعة حية لاستهلاك القفازات، الحقن، المحاليل والمستلزمات الطبية مع الإنذار المبكر'
                    : 'Niveaux de stock temps réel, auto-décrémentation par consultation/acte et alertes de réapprovisionnement'}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75">
                {consumables.length} {isAr ? 'عنصر مراقب' : 'fournitures tracées'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {consumables.map((item) => {
                const currentStock = item.currentStockUnits ?? item.currentStock ?? 0;
                const threshold = item.reorderThresholdUnits ?? item.minStockAlert ?? 10;
                const isCritical = currentStock <= threshold;
                const code = item.itemCode ?? item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-neutral-800 border flex flex-col justify-between shadow-2xs space-y-3 transition-all ${
                      isCritical
                        ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-black/55 dark:text-white/55 block uppercase font-bold">
                          {code} · {item.category}
                        </span>
                        <h4 className="font-bold text-sm text-black dark:text-white mt-0.5">
                          {item.name}
                        </h4>
                      </div>
                      {isCritical ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
                          Seuil Critique
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Stock Optimal
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 text-xs">
                      <div>
                        <span className="text-[10px] text-black/55 dark:text-white/55 uppercase font-semibold block">
                          Stock Actuel
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`text-xl font-bold font-mono ${
                              isCritical ? 'text-rose-600' : 'text-black dark:text-white'
                            }`}
                          >
                            {currentStock}
                          </span>
                          <span className="text-[10px] text-black/55 dark:text-white/55">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-black/55 dark:text-white/55 uppercase font-semibold block">
                          Seuil d&apos;Alerte
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold font-mono text-black/55 dark:text-white/55">
                            {threshold}
                          </span>
                          <span className="text-[10px] text-black/55 dark:text-white/55">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isCritical ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(8, (currentStock / (threshold * 2.5)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          depleteConsumable(code, 1);
                          showToast({
                            type: 'info',
                            title: 'Stock Consommable',
                            message: `-1 ${item.unit} déduit pour ${item.name}`,
                          });
                        }}
                        className="px-2 py-1 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                        title="Déduire manuellement pour un acte"
                      >
                        -1 Unité
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          restockConsumable(code, 50);
                          showToast({
                            type: 'success',
                            title: 'Réapprovisionnement',
                            message: `+50 ${item.unit} réapprovisionnés pour ${item.name}`,
                          });
                        }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#d4522f] text-white font-semibold hover:bg-[#b0674b] transition-colors cursor-pointer"
                      >
                        +50 Réappro
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedConsultations.length}
        entityPluralLabel={isAr ? 'فاتورة' : 'factures'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={!!activeConsultation}
        item={activeConsultation}
        allItems={sortedConsultations}
        keyExtractor={(c) => c.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeConsultation?.patientName || ''}
        subtitle={
          activeConsultation
            ? `Réf: ${activeConsultation.id} · ${activeConsultation.ngapCode || 'C'}`
            : ''
        }
        avatarText={activeConsultation ? getInitials2(activeConsultation.patientName) : 'FC'}
        avatarColor="#d4522f"
        categoryLabel={isAr ? 'فوترة طبية' : isFr ? 'FACTURATION CLINIQUE' : 'MEDICAL BILLING'}
        branchName={
          activeConsultation
            ? resolveRecordBranch(activeConsultation, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={
          activeConsultation?.isPaid
            ? isAr
              ? 'مدفوع'
              : 'Encaissé'
            : isAr
            ? 'معلق'
            : 'En attente'
        }
        statusClassName={activeConsultation?.isPaid ? MEMBER_PILL_OK : MEMBER_PILL_WARN}
        tabs={[
          { id: 'decompte', label: isAr ? 'البيان المالي' : isFr ? 'Décompte' : 'Breakdown' },
          { id: 'tiers_payant', label: isAr ? 'الشفاء Chifa' : 'Chifa & NGAP' },
          { id: 'actions', label: isAr ? 'الإجراءات' : 'Actions' },
        ]}
        activeTab={activeInspectorTab}
        onTabChange={setActiveInspectorTab}
        onSelectItem={(c) => handleSelectConsultation(c)}
        onClose={() => setInspectedConsultation(null)}
        renderBody={(consultation, tab) => (
          <div className="space-y-5">
            {tab === 'decompte' && (
              <>
                <InspectorSection
                  title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}
                  index={0}
                >
                  <InspectorQuickActions
                    actions={[
                      ...(!consultation.isPaid
                        ? [
                            {
                              id: 'pay',
                              label: isAr ? 'تحصيل' : `Encaisser (${paymentMethod})`,
                              icon: <CheckCircle2 size={15} />,
                              onClick: () => handlePay(consultation),
                            },
                          ]
                        : []),
                      {
                        id: 'print',
                        label: isAr ? 'إيصال' : 'Quittance',
                        icon: <Printer size={15} />,
                        onClick: () => handlePrintReceipt(consultation),
                      },
                      {
                        id: 'pin',
                        label: pinnedIds.has(consultation.id) ? 'Détacher' : 'Épingler',
                        icon: <Pin size={15} />,
                        onClick: () => handleTogglePin(consultation.id),
                      },
                    ]}
                  />
                </InspectorSection>

                <InspectorSection
                  title={isAr ? 'تفاصيل الأتعاب' : 'Ventilation des Honoraires'}
                  index={1}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'المبلغ الإجمالي' : 'Montant Total Acte'}
                      value={formatMoney(consultation.consultationFeeDzd, 'DZD')}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'حصة المريض' : 'Ticket Modérateur (Part Patient)'}
                      value={formatMoney(consultation.copayAmountDzd || 600, 'DZD')}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'تغطية CNAS / Chifa' : 'Prise en charge CNAS/CASNOS'}
                      value={formatMoney(consultation.insuranceShareDzd || 2400, 'DZD')}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'حالة التحصيل' : "Statut d'encaissement"}
                      value={consultation.isPaid ? 'Règlement effectué ✓' : 'Solde débiteur'}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection
                  title={isAr ? 'وسيلة الدفع' : "Mode d'encaissement"}
                  index={2}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Dahabia', 'BaridiMob'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          paymentMethod === method
                            ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                            : 'border-[#E6DED6] dark:border-neutral-700 bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  {!consultation.isPaid && (
                    <div className="mt-3">
                      <InspectorWideButton
                        label={`Encaisser via ${paymentMethod}`}
                        icon={<CheckCircle2 size={15} />}
                        tone="accent"
                        onClick={() => handlePay(consultation)}
                      />
                    </div>
                  )}
                </InspectorSection>
              </>
            )}

            {tab === 'tiers_payant' && (
              <InspectorSection
                title="Convention Tiers-Payant Chifa"
                index={0}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label="Protocole"
                    value="Télétransmission dématérialisée CNAS Algérie"
                  />
                  <InspectorKeyValue
                    label="Cotation NGAP"
                    value={consultation.ngapCode || 'C (Médecine Générale)'}
                    mono
                  />
                  <InspectorKeyValue
                    label="Numéro Ticket Triage"
                    value={consultation.ticketNumber || 'T-102'}
                    mono
                  />
                  <InspectorKeyValue
                    label="Taux de couverture"
                    value={
                      consultation.copayAmountDzd === 0
                        ? '100% (ALD Exonéré)'
                        : '80% Régime Standard'
                    }
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'actions' && (
              <InspectorSection
                title={isAr ? 'الطباعة والإجراءات' : 'Quittance & Suivi'}
                index={0}
              >
                <div className="space-y-2.5">
                  <InspectorWideButton
                    label="Imprimer quittance patient"
                    icon={<Printer size={15} />}
                    tone="accent"
                    onClick={() => handlePrintReceipt(consultation)}
                  />
                  <InspectorWideButton
                    label={pinnedIds.has(consultation.id) ? 'Détacher' : 'Épingler la facture'}
                    icon={<Pin size={15} />}
                    onClick={() => handleTogglePin(consultation.id)}
                  />
                </div>
              </InspectorSection>
            )}
          </div>
        )}
      />
    </div>
  );
};
