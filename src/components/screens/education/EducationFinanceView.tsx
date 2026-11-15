import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  CheckCircle2,
  Plus,
  Printer,
  X,
  Bell,
  Receipt,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { EduEnrollment } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

type PaymentFilterKey = 'all' | 'pending' | 'partial' | 'overdue' | 'paid';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const EducationFinanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    eduEnrollments,
    recordTuitionPayment,
    currentBusiness,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();

  const [filterKey, setFilterKey] = useState<PaymentFilterKey>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedEnrollmentIds, setPinnedEnrollmentIds] = useState<Set<string>>(() => new Set<string>());
  const [financeSortBy, setFinanceSortBy] = useState<string>('student');
  const [financeSortDir, setFinanceSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedEnrollmentForPayment, setSelectedEnrollmentForPayment] = useState<EduEnrollment | null>(null);
  const [detailEnrollment, setDetailEnrollment] = useState<EduEnrollment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [receiptToPrint, setReceiptToPrint] = useState<{
    studentName: string;
    cohortName: string;
    amount: number;
    method: string;
    date: string;
    receiptNumber: string;
  } | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduEnrollments.forEach((enr) => {
      const b = resolveRecordBranch(enr, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduEnrollments, branchesById, currentBranch, language]);

  const totalBilled = eduEnrollments.reduce((sum, e) => sum + (e.agreedTuition || 0), 0);
  const totalCollected = eduEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const collectionVelocity = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const overdueBalance = eduEnrollments
    .filter((e) => e.paymentStatus === 'Overdue')
    .reduce((sum, e) => sum + e.balanceDue, 0);

  const filteredEnrollments = useMemo(() => {
    return eduEnrollments.filter((e) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(e, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (!(filterKey === 'all' || e.paymentStatus.toLowerCase() === filterKey.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.studentName.toLowerCase().includes(q) ||
          e.cohortName.toLowerCase().includes(q) ||
          e.studentId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eduEnrollments, branchFilter, filterKey, searchQuery, branchesById, currentBranch, language]);

  const sortedEnrollments = useMemo(() => {
    return [...filteredEnrollments].sort((a, b) => {
      const aPinned = pinnedEnrollmentIds.has(a.id);
      const bPinned = pinnedEnrollmentIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (financeSortBy === 'agreedTuition') {
        cmp = (a.agreedTuition || 0) - (b.agreedTuition || 0);
      } else if (financeSortBy === 'paidAndBalance') {
        cmp = (a.balanceDue || 0) - (b.balanceDue || 0);
      } else if (financeSortBy === 'status') {
        cmp = a.paymentStatus.localeCompare(b.paymentStatus);
      } else if (financeSortBy === 'cohort') {
        cmp = a.cohortName.localeCompare(b.cohortName);
      } else if (financeSortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.studentName.localeCompare(b.studentName);
      }
      return financeSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredEnrollments, pinnedEnrollmentIds, financeSortBy, financeSortDir, branchesById, currentBranch, language]);

  const activeEnrollment = useMemo(() => {
    if (!detailEnrollment) return null;
    return eduEnrollments.find((e) => e.id === detailEnrollment.id) || detailEnrollment;
  }, [detailEnrollment, eduEnrollments]);

  const handleOpenPayment = useCallback((enrollment: EduEnrollment, instIndex = 0) => {
    setSelectedEnrollmentForPayment(enrollment);
    setSelectedInstallmentIndex(instIndex);
    const inst = enrollment.installments?.[instIndex];
    setPaymentAmount(inst && !inst.isPaid ? inst.amount : enrollment.balanceDue);
  }, []);

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentForPayment) return;
    recordTuitionPayment(selectedEnrollmentForPayment.id, selectedInstallmentIndex, paymentAmount, paymentMethod);
    setReceiptToPrint({
      studentName: selectedEnrollmentForPayment.studentName,
      cohortName: selectedEnrollmentForPayment.cohortName,
      amount: paymentAmount,
      method: paymentMethod,
      date: new Date().toISOString().split('T')[0],
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    });
    showToast({
      type: 'success',
      title: 'Paiement Enregistré',
      message: `${formatMoney(paymentAmount)} encaissés pour ${selectedEnrollmentForPayment.studentName} (${paymentMethod}).`,
    });
    setSelectedEnrollmentForPayment(null);
  };

  const handleBatchMarkInstallmentPaid = () => {
    if (selectedEnrollmentIds.size === 0) return;
    let count = 0;
    eduEnrollments.forEach((enr) => {
      if (selectedEnrollmentIds.has(enr.id) && enr.balanceDue > 0) {
        const nextIndex = enr.installments?.findIndex((i) => !i.isPaid) ?? 0;
        const inst = enr.installments?.[nextIndex];
        const amt = inst ? inst.amount : enr.balanceDue;
        recordTuitionPayment(enr.id, Math.max(0, nextIndex), amt, 'Cash');
        count++;
      }
    });
    showToast({
      type: 'success',
      title: isAr ? 'تم تسجيل الدفعات' : 'Versements Encaissés',
      message: `${count} échéances ont été validées en lot.`,
    });
    setSelectedEnrollmentIds(new Set<string>());
  };

  const handleBatchSendReminder = () => {
    showToast({
      type: 'info',
      title: isAr ? 'تم إرسال التنبيهات' : 'Rappels Émis',
      message: `${selectedEnrollmentIds.size} rappels de paiement transmis via SMS & WhatsApp.`,
    });
    setSelectedEnrollmentIds(new Set<string>());
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID Inscription',
      'Apprenant',
      'ID Étudiant',
      'Branche',
      'Formation / Cohorte',
      'Date Inscription',
      'Frais de Scolarité (DZD)',
      'Remise (DZD)',
      'Montant Payé (DZD)',
      'Reste à Payer (DZD)',
      'Statut Paiement',
      'Nombre Échéances',
      'Échéances Payées',
      'Statut Dossier',
    ];
    const rows = sortedEnrollments.map((enr) => {
      const paidInstCount = enr.installments?.filter((i) => i.isPaid).length || 0;
      const totalInstCount = enr.installments?.length || 0;
      return [
        enr.id,
        enr.studentName,
        enr.studentId,
        resolveRecordBranch(enr, branchesById, currentBranch, language).name,
        enr.cohortName,
        enr.enrolledAt ? enr.enrolledAt.split('T')[0] : '',
        String(enr.agreedTuition),
        String(enr.discountAmount || 0),
        String(enr.paidAmount),
        String(enr.balanceDue),
        enr.paymentStatus,
        String(totalInstCount),
        String(paidInstCount),
        enr.status,
      ];
    });
    downloadCsvSafe(`scolarite_reglements_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast({
      type: 'success',
      title: 'Grand Livre Exporté',
      message: `${sortedEnrollments.length} contrats de scolarité exportés au format CSV.`,
    });
  }, [sortedEnrollments, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduEnrollments.length },
      ...Array.from(branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المؤسسة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'paymentStatus',
        label: isAr ? 'وضعية السداد' : isEn ? 'Payment Status' : 'Statut Paiement',
        value: filterKey,
        onChange: (v) => setFilterKey(v as PaymentFilterKey),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: t('edu_filter_all') },
          { value: 'pending', label: isAr ? 'معلق' : isEn ? 'Unpaid' : 'Impayé' },
          { value: 'partial', label: isAr ? 'جزئي' : isEn ? 'Partial' : 'Partiel' },
          { value: 'overdue', label: isAr ? 'متأخر' : isEn ? 'Overdue' : 'Retard' },
          { value: 'paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé' },
        ],
      },
    ];
  }, [branchFilter, filterKey, branchCounts, eduEnrollments.length, isAr, isEn, t]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (filterKey !== 'all') {
      chips.push({
        key: 'status',
        label: filterKey,
        onRemove: () => setFilterKey('all'),
      });
    }
    return chips;
  }, [branchFilter, filterKey, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (filterKey !== 'all' ? 1 : 0);

  const columns: ColumnDefinition<EduEnrollment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('edu_col_student'),
        width: '2.2*',
        minWidth: '185px',
        sortable: true,
        renderCell: (enr) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              {enr.studentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{enr.studentName}</div>
              <div className="text-[10px] text-black/55 dark:text-white/55">ID: {enr.studentId}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (enr) => {
          const b = resolveRecordBranch(enr, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'cohort',
        header: t('edu_col_cohort'),
        width: '1.8*',
        minWidth: '160px',
        sortable: true,
        renderCell: (enr) => (
          <div className="min-w-0">
            <span className="font-medium text-black dark:text-white block truncate">{enr.cohortName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">
              {enr.enrolledAt ? `Depuis ${enr.enrolledAt.split('T')[0]}` : 'Actif'}
            </span>
          </div>
        ),
      },
      {
        key: 'agreedTuition',
        header: t('edu_field_tuition_fee'),
        width: '1.3*',
        minWidth: '115px',
        sortable: true,
        renderCell: (enr) => (
          <span className="font-bold text-black dark:text-white tabular-nums">{formatMoney(enr.agreedTuition)}</span>
        ),
      },
      {
        key: 'paidAndBalance',
        header: isAr ? 'المسدد / الرصيد' : isEn ? 'Paid / Balance' : 'Payé / Solde',
        width: '2*',
        minWidth: '160px',
        sortable: true,
        renderCell: (enr) => {
          const percent = enr.agreedTuition > 0 ? Math.round((enr.paidAmount / enr.agreedTuition) * 100) : 0;
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatMoney(enr.paidAmount)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatMoney(enr.balanceDue)}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    percent >= 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-amber-500' : 'bg-neutral-300'
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: t('common_status'),
        width: '1.2*',
        minWidth: '105px',
        sortable: true,
        renderCell: (enr) => (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
              enr.paymentStatus === 'Paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : enr.paymentStatus === 'Overdue'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {enr.paymentStatus === 'Paid'
              ? t('edu_tuition_paid')
              : enr.paymentStatus === 'Overdue'
              ? t('edu_tuition_overdue')
              : t('edu_tuition_partial')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('edu_col_actions'),
        width: '1.3*',
        minWidth: '115px',
        renderCell: (enr) => (
          <div className="flex items-center gap-1.5 justify-end rtl:justify-start">
            {enr.balanceDue > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPayment(enr, 0);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#d4522f] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {t('edu_btn_log_payment')}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptToPrint({
                    studentName: enr.studentName,
                    cohortName: enr.cohortName,
                    amount: enr.paidAmount,
                    method: 'Comptant / Virement',
                    date: enr.enrolledAt ? enr.enrolledAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    receiptNumber: `REC-${enr.id.slice(-6)}`,
                  });
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Receipt size={12} />
                <span>Reçu</span>
              </button>
            )}
          </div>
        ),
      },
    ],
    [isAr, isEn, t, branchesById, currentBranch, language, handleOpenPayment]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduEnrollments.length > 0,
  });

  if (showSkeleton && (eduEnrollments.length === 0 || networkMode === 'force_skeleton')) {
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
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={t('edu_finance_title')}
        subtitle={`${eduEnrollments.length} ${isAr ? 'عقد تسجيل مالي' : isEn ? 'tuition accounts' : 'comptes de scolarité'}`}
        secondaryActions={
          <AtriumButton variant="outline" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            <span>{isAr ? 'طباعة كشف الحساب' : isEn ? 'Print Ledger' : 'Grand Livre'}</span>
          </AtriumButton>
        }
        primaryAction={
          eduEnrollments.length > 0
            ? {
                label: t('edu_btn_log_payment'),
                icon: <Plus size={14} />,
                onClick: () => handleOpenPayment(eduEnrollments[0], 0),
              }
            : undefined
        }
      />

      {selectedEnrollmentIds.size > 0 && (
        <div className="p-3 bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-xs font-bold">
              {selectedEnrollmentIds.size}
            </span>
            <span className="text-xs font-semibold text-black dark:text-white">
              {selectedEnrollmentIds.size} {isAr ? 'عقود محددة' : 'dossiers sélectionnés'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedEnrollmentIds(new Set<string>())}
              className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
            >
              {isAr ? 'إلغاء التحديد' : 'Désélectionner'}
            </button>
            <button
              type="button"
              onClick={handleBatchMarkInstallmentPaid}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={13} />
              <span>{isAr ? 'تسجيل سداد القسط' : 'Encaisser Versement'}</span>
            </button>
            <button
              type="button"
              onClick={handleBatchSendReminder}
              className="px-3.5 py-1.5 rounded-xl bg-[#d4522f] hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Bell size={13} />
              <span>{isAr ? 'إرسال تذكير بالسداد' : 'Envoyer Rappel SMS'}</span>
            </button>
          </div>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات التحصيل والذمم المالية'
            : isEn
            ? 'Tuition & Receivables Performance'
            : 'Performance Financière & Recouvrement'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'سرعة التحصيل' : isEn ? 'Collection Rate' : 'Taux de Recouvrement',
          count: totalCollected,
          formatValue: (v) => formatMoney(v),
          badgeText: `↗ ${collectionVelocity}%`,
          tone: 'emerald',
          isActive: filterKey === 'paid',
          onToggle: () => setFilterKey((p) => (p === 'paid' ? 'all' : 'paid')),
        }}
        secondaryCard={{
          label: t('edu_fin_receivables'),
          count: totalOutstanding,
          formatValue: (v) => formatMoney(v),
          badgeText: `${eduEnrollments.filter((e) => e.balanceDue > 0).length} en attente`,
          tone: 'terracotta',
          isActive: filterKey === 'pending',
          onToggle: () => setFilterKey((p) => (p === 'pending' ? 'all' : 'pending')),
        }}
        darkCard={{
          label: t('edu_fin_overdue'),
          valueCount: overdueBalance,
          formatValue: (v) => formatMoney(v),
          badgeCount: eduEnrollments.filter((e) => e.paymentStatus === 'Overdue').length,
          badgeSuffix: isAr ? ' متأخر' : ' retards',
          caption: isAr ? 'متأخرات تستوجب المتابعة' : 'Créances échues avec relance',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('edu_finance_title')}
          liveRegionText={`${sortedEnrollments.length} ${isAr ? 'حساب' : 'contrats'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search accounts by learner name or cohort..."
          statusOptions={[
            { value: 'all', label: t('edu_filter_all'), count: eduEnrollments.length },
            { value: 'pending', label: isAr ? 'معلق' : isEn ? 'Unpaid' : 'Impayé' },
            { value: 'partial', label: isAr ? 'جزئي' : isEn ? 'Partial' : 'Partiel' },
            { value: 'overdue', label: isAr ? 'متأخر' : isEn ? 'Overdue' : 'Retard' },
            { value: 'paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payé' },
          ]}
          statusValue={filterKey}
          onStatusChange={(val) => setFilterKey(val as PaymentFilterKey)}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setFilterKey('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<EduEnrollment>
          hideToolbar
          data={sortedEnrollments}
          keyExtractor={(enr) => enr.id}
          selectedIds={selectedEnrollmentIds}
          onSelectionChange={setSelectedEnrollmentIds}
          pinnedIds={pinnedEnrollmentIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedEnrollmentIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          viewMode={viewMode}
          columns={columns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={financeSortBy}
          sortDirection={financeSortDir}
          onSortChange={(key, dir) => {
            setFinanceSortBy(key);
            setFinanceSortDir(dir);
          }}
          openItemId={activeEnrollment?.id ?? null}
          onItemClick={(enr, el) => {
            setDrawerOpenerEl(el || null);
            setDetailEnrollment(enr);
          }}
          onViewDetails={(enr, el) => {
            setDrawerOpenerEl(el || null);
            setDetailEnrollment(enr);
          }}
          onEdit={(enr) => handleOpenPayment(enr, 0)}
          renderCard={(enr) => {
            const percent = enr.agreedTuition > 0 ? Math.round((enr.paidAmount / enr.agreedTuition) * 100) : 0;
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center text-xl font-bold shadow-xs mb-3 select-none border border-neutral-200 dark:border-neutral-700">
                  {enr.studentName.charAt(0)}
                </div>
                <h3 className="text-sm font-bold text-black dark:text-white truncate max-w-[210px] mb-0.5 tracking-tight">
                  {enr.studentName}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] border border-[#F5E2D8] dark:border-neutral-700 mb-3 truncate max-w-[200px]">
                  {enr.cohortName}
                </span>
                <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-black/55 dark:text-white/55">Contrat Total</span>
                    <span className="font-bold text-black dark:text-white tabular-nums">
                      {formatMoney(enr.agreedTuition)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-semibold">{formatMoney(enr.paidAmount)}</span>
                    <span className="text-rose-600 font-semibold">{formatMoney(enr.balanceDue)} dû</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-[#d4522f]'}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        enr.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : enr.paymentStatus === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {enr.paymentStatus}
                    </span>
                    {enr.balanceDue > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPayment(enr, 0);
                        }}
                        className="px-2 py-1 bg-[#d4522f] text-white rounded-lg text-[10px] font-semibold hover:opacity-90 cursor-pointer"
                      >
                        Encaisser
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedEnrollments.length}
        entityPluralLabel={isAr ? 'عقد' : isEn ? 'accounts' : 'contrats'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setFilterKey('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduEnrollment>
        isOpen={Boolean(activeEnrollment)}
        item={activeEnrollment}
        allItems={sortedEnrollments}
        keyExtractor={(e) => e.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeEnrollment?.studentName || ''}
        subtitle={activeEnrollment?.cohortName || ''}
        avatarText={(activeEnrollment?.studentName || 'F').charAt(0).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeEnrollment
            ? resolveRecordBranch(activeEnrollment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeEnrollment?.paymentStatus}
        onSelectItem={(e) => setDetailEnrollment(e)}
        onClose={() => setDetailEnrollment(null)}
        renderBody={(enr) => (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-[#141312] border border-[#E6DED6] dark:border-[#33302D]">
                <span className="text-[11px] text-black/55 dark:text-white/55 block mb-0.5">Frais de Scolarité</span>
                <span className="text-lg font-bold text-black dark:text-white tabular-nums">
                  {formatMoney(enr.agreedTuition)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-[#141312] border border-[#E6DED6] dark:border-[#33302D]">
                <span className="text-[11px] text-black/55 dark:text-white/55 block mb-0.5">Solde Restant</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatMoney(enr.balanceDue)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black/55 dark:text-white/55">
                Échéancier des versements
              </h3>
              <div className="space-y-2">
                {enr.installments?.map((inst, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-black dark:text-white">Versement #{idx + 1}</div>
                      <div className="text-[11px] text-black/55 dark:text-white/55">
                        Échéance : {inst.dueDate} {inst.paidAt && `· Payé le ${inst.paidAt.split('T')[0]}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-black dark:text-white tabular-nums">
                        {formatMoney(inst.amount)}
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          inst.isPaid ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {inst.isPaid ? '✓ Soldé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
              {enr.balanceDue > 0 && (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  icon={<Plus size={14} />}
                  className="flex-1 justify-center"
                  onClick={() => {
                    handleOpenPayment(enr, 0);
                    setDetailEnrollment(null);
                  }}
                >
                  Encaisser un versement
                </AtriumButton>
              )}
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Printer size={14} />}
                onClick={() => {
                  setReceiptToPrint({
                    studentName: enr.studentName,
                    cohortName: enr.cohortName,
                    amount: enr.paidAmount,
                    method: 'Comptant / Virement',
                    date: new Date().toISOString().split('T')[0],
                    receiptNumber: `REC-${enr.id.slice(-6)}`,
                  });
                }}
              >
                Reçu
              </AtriumButton>
            </div>
          </div>
        )}
      />

      {selectedEnrollmentForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {t('edu_payment_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedEnrollmentForPayment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="font-bold text-black dark:text-white">{selectedEnrollmentForPayment.studentName}</div>
                <div className="text-black/55 dark:text-white/55">
                  {t('edu_label_cohort')}: {selectedEnrollmentForPayment.cohortName}
                </div>
                <div className="text-[#d4522f] font-bold">
                  {t('edu_fin_receivables')}: {formatMoney(selectedEnrollmentForPayment.balanceDue)}
                </div>
              </div>
              {selectedEnrollmentForPayment.installments && selectedEnrollmentForPayment.installments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-black/70 dark:text-white/75">
                    Sélectionner l'échéance à solder
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEnrollmentForPayment.installments.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedInstallmentIndex(idx);
                          setPaymentAmount(inst.isPaid ? 0 : inst.amount);
                        }}
                        className={`p-2 rounded-xl border text-left rtl:text-right transition-colors cursor-pointer ${
                          selectedInstallmentIndex === idx
                            ? 'bg-[#FCEEE8] dark:bg-neutral-800 border-[#d4522f] text-[#d4522f] font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                        }`}
                      >
                        <div className="text-[10px] text-black/55 dark:text-white/55">Échéance #{idx + 1}</div>
                        <div className="font-bold tabular-nums">{formatMoney(inst.amount)}</div>
                        <div className="text-[10px] text-black/55 dark:text-white/55">
                          {inst.isPaid ? '✓ Soldée' : `Due le ${inst.dueDate}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <LabelInput
                id="payment-amount"
                label={t('edu_field_pay_amount')}
                type="number"
                min="1"
                max={selectedEnrollmentForPayment.balanceDue}
                value={paymentAmount}
                onChange={(v) => setPaymentAmount(parseInt(extractStr(v), 10) || 0)}
                required
              />
              <LabelSelect
                field="Method"
                label={t('edu_field_pay_method')}
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(extractStr(val))}
                options={[
                  { value: 'Cash', label: 'Cash (Campus Bureau)' },
                  { value: 'Card / POS', label: 'Card (CIB / Dahabia POS)' },
                  { value: 'Bank Transfer', label: 'Bank / CCP Transfer' },
                  { value: 'Scholarship Voucher', label: 'Scholarship Voucher' },
                ]}
                height={44}
                corner={14}
              />
              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedEnrollmentForPayment(null)}
                >
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {t('edu_btn_save_payment')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4522f]">
                Official Tuition Receipt
              </div>
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-center py-2 space-y-1">
              <div className="font-bold text-black dark:text-white text-sm">
                {currentBusiness?.displayName || 'Atlas Academy'}
              </div>
              <div className="text-xs text-black/55 dark:text-white/55">
                Receipt #{receiptToPrint.receiptNumber} · {receiptToPrint.date}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">
                  {isAr ? 'المترشح / المتدرب:' : isEn ? 'Learner:' : 'Apprenant :'}
                </span>
                <span className="font-bold text-black dark:text-white">{receiptToPrint.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">
                  {isAr ? 'الفوج / الدورة التدريبية:' : isEn ? 'Cohort / Course:' : 'Promotion / Formation :'}
                </span>
                <span className="font-semibold text-black dark:text-white">{receiptToPrint.cohortName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">{t('edu_field_pay_method')}:</span>
                <span className="font-semibold">{receiptToPrint.method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm">
                <span>{isAr ? 'المبلغ المسدد:' : isEn ? 'Amount Paid:' : 'Montant payé :'}</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatMoney(receiptToPrint.amount)}
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton
                variant="primary"
                size="md"
                glow
                icon={<Printer size={15} />}
                className="w-full justify-center"
                onClick={() => window.print()}
              >
                Print Official Receipt
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
