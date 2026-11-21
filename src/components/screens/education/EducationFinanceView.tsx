import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  CheckCircle2,
  Plus,
  Printer,
  X,
  Bell,
  Receipt,
  Eye,
  CreditCard,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduEnrollmentsFromState,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
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

  const { eduEnrollments, currentBusiness, currentBranch, branches, isSyncing, networkMode, lastSyncedAt, isSyncTimeout } = useAtriumSelector(
    (s) => ({
      eduEnrollments: selectCurrentEduEnrollmentsFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );
  const { recordTuitionPayment, retryCloudSync } = useAtriumActions();

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
  const [inspectorTab, setInspectorTab] = useState<'summary' | 'installments' | 'actions'>('summary');
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
    setSelectedEnrollmentForPayment(null);
  };

  const handleBatchMarkInstallmentPaid = () => {
    if (selectedEnrollmentIds.size === 0) return;
    const targets = eduEnrollments.filter((enr) => selectedEnrollmentIds.has(enr.id) && enr.balanceDue > 0);
    if (targets.length === 0) {
      setSelectedEnrollmentIds(new Set<string>());
      return;
    }
    runUndoBatch(
      {
        vertical: 'education_cohort',
        operationType: 'bulk',
        affectedCount: targets.length,
        summary: isAr
          ? `تسجيل دفعات (${targets.length})`
          : isEn
          ? `Log payments (${targets.length})`
          : `Encaissement échéances (${targets.length})`,
      },
      () => {
        targets.forEach((enr) => {
          const nextIndex = enr.installments?.findIndex((i) => !i.isPaid) ?? 0;
          const inst = enr.installments?.[nextIndex];
          const amt = inst ? inst.amount : enr.balanceDue;
          recordTuitionPayment(enr.id, Math.max(0, nextIndex), amt, 'Cash');
        });
      }
    );
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

  const getEnrollmentRowMeta = useCallback(
    (enr: EduEnrollment): KineticRowMeta => ({
      avatarText: enr.studentName.slice(0, 2).toUpperCase(),
      subline: `${enr.cohortName} · ID ${enr.studentId}`,
      categoryLabel: `${enr.installments?.length || 1} ${isAr ? 'أقساط' : 'échéances'}`,
      statusVariant:
        enr.paymentStatus === 'Paid'
          ? 'active'
          : enr.paymentStatus === 'Overdue'
          ? 'blocked'
          : 'warning',
      statusLabel:
        enr.paymentStatus === 'Paid'
          ? t('edu_tuition_paid')
          : enr.paymentStatus === 'Overdue'
          ? t('edu_tuition_overdue')
          : t('edu_tuition_partial'),
      metricPrimary: formatMoney(enr.paidAmount),
      metricSecondary: enr.balanceDue > 0 ? `${formatMoney(enr.balanceDue)} dû` : formatMoney(enr.agreedTuition),
      detailCol1: {
        heading: isAr ? 'الطالب والفوج' : isEn ? 'Student & Cohort' : 'Apprenant & Cohorte',
        primaryText: enr.studentName,
        secondaryText: enr.cohortName,
        tertiaryText: `ID: ${enr.studentId}`,
      },
      detailCol2: {
        heading: isAr ? 'الرسوم والمدفوع' : isEn ? 'Tuition & Paid' : 'Scolarité & Encaissé',
        primaryText: `${formatMoney(enr.paidAmount)} / ${formatMoney(enr.agreedTuition)}`,
        secondaryText: `${enr.installments?.length || 1} ${isAr ? 'أقساط' : 'tranches'}`,
      },
      detailCol3: {
        heading: isAr ? 'المتبقي والحالة' : isEn ? 'Balance Due' : 'Reste & Statut',
        primaryText: enr.balanceDue > 0 ? formatMoney(enr.balanceDue) : (isAr ? 'مسدد بالكامل' : 'Soldé'),
        secondaryText:
          enr.paymentStatus === 'Paid'
            ? t('edu_tuition_paid')
            : enr.paymentStatus === 'Overdue'
            ? t('edu_tuition_overdue')
            : t('edu_tuition_partial'),
      },
    }),
    [isAr, isEn, t]
  );

  const getEnrollmentFanActions = useCallback(
    (enr: EduEnrollment): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setDetailEnrollment(enr);
          setInspectorTab('summary');
        },
      },
      ...(enr.balanceDue > 0
        ? [
            {
              id: 'pay',
              label: isAr ? 'تحصيل' : isEn ? 'Collect' : 'Encaisser',
              icon: <CreditCard className="w-[15px] h-[15px]" />,
              onClick: () => handleOpenPayment(enr, 0),
            },
          ]
        : [
            {
              id: 'receipt',
              label: isAr ? 'وصل' : isEn ? 'Receipt' : 'Reçu',
              icon: <Printer className="w-[15px] h-[15px]" />,
              onClick: () =>
                setReceiptToPrint({
                  studentName: enr.studentName,
                  cohortName: enr.cohortName,
                  amount: enr.paidAmount,
                  method: 'Comptant / Virement',
                  date: enr.enrolledAt ? enr.enrolledAt.split('T')[0] : new Date().toISOString().split('T')[0],
                  receiptNumber: `REC-${enr.id.slice(-6)}`,
                }),
            },
          ]),
    ],
    [isAr, isEn, handleOpenPayment]
  );

  const getEnrollmentDetailActions = useCallback(
    (enr: EduEnrollment): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setDetailEnrollment(enr);
          setInspectorTab('summary');
        },
      },
      ...(enr.balanceDue > 0
        ? [
            {
              id: 'pay',
              label: t('edu_btn_log_payment'),
              icon: <CreditCard className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
              onClick: () => handleOpenPayment(enr, 0),
            },
          ]
        : []),
      {
        id: 'receipt',
        label: 'Reçu',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () =>
          setReceiptToPrint({
            studentName: enr.studentName,
            cohortName: enr.cohortName,
            amount: enr.paidAmount,
            method: 'Comptant / Virement',
            date: enr.enrolledAt ? enr.enrolledAt.split('T')[0] : new Date().toISOString().split('T')[0],
            receiptNumber: `REC-${enr.id.slice(-6)}`,
          }),
      },
    ],
    [isAr, isEn, t, handleOpenPayment]
  );

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
            <div
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="w-8 h-8 bg-neutral-100 dark:bg-[#2B2825] text-black dark:text-white flex items-center justify-center font-semibold t-small shrink-0"
            >
              {enr.studentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{enr.studentName}</div>
              <div className="t-cap text-black/55 dark:text-white/55">ID: {enr.studentId}</div>
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
            <span className="t-cap text-black/55 dark:text-white/55">
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
          <span className="font-semibold text-black dark:text-white tabular-nums">{formatMoney(enr.agreedTuition)}</span>
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
              <div className="flex items-center justify-between t-cap tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatMoney(enr.paidAmount)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {formatMoney(enr.balanceDue)}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-[#2B2825] overflow-hidden">
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
            className={`px-2 py-1 rounded-full t-small font-semibold ${
              enr.paymentStatus === 'Paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : enr.paymentStatus === 'Overdue'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
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
          <div className="flex items-center gap-2 justify-end rtl:justify-start">
            {enr.balanceDue > 0 ? (
              <button
                type="button"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPayment(enr, 0);
                }}
                className="px-2.5 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                {t('edu_btn_log_payment')}
              </button>
            ) : (
              <button
                type="button"
                data-sq="ctl-sm"
                data-sq-border="solid"
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
                className="px-2.5 py-2 text-black/70 dark:text-white/75 t-small font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
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
        <div
          data-sq="card"
          data-sq-border="solid"
          className="p-3 bg-[#FCEEE8] dark:bg-[#22201E] [--sq-stroke:rgba(212,82,47,0.24)] dark:[--sq-stroke:rgba(255,143,99,0.22)] flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center t-small font-semibold">
              {selectedEnrollmentIds.size}
            </span>
            <span className="t-small font-semibold text-black dark:text-white">
              {selectedEnrollmentIds.size} {isAr ? 'عقود محددة' : 'dossiers sélectionnés'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedEnrollmentIds(new Set<string>())}
              className="px-3 py-2 t-small text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
            >
              {isAr ? 'إلغاء التحديد' : 'Désélectionner'}
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchMarkInstallmentPaid}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{isAr ? 'تسجيل سداد القسط' : 'Encaisser Versement'}</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchSendReminder}
              className="px-4 py-2 bg-[var(--brand-fill,#C9461F)] hover:opacity-90 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
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
          items={sortedEnrollments}
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
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            setInspectorTab('summary');
          }}
          onViewDetails={(enr, el) => {
            setDrawerOpenerEl(el || null);
            setDetailEnrollment(enr);
            setInspectorTab('summary');
          }}
          getRowMeta={getEnrollmentRowMeta}
          getFanActions={getEnrollmentFanActions}
          getDetailActions={getEnrollmentDetailActions}
          onEdit={(enr) => handleOpenPayment(enr, 0)}
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
        categoryLabel={activeEnrollment?.cohortName || (isAr ? 'رسوم' : 'Scolarité')}
        avatarText={(activeEnrollment?.studentName || 'FN').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeEnrollment
            ? resolveRecordBranch(activeEnrollment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeEnrollment
            ? activeEnrollment.paymentStatus === 'Paid'
              ? t('edu_tuition_paid')
              : activeEnrollment.paymentStatus === 'Overdue'
              ? t('edu_tuition_overdue')
              : t('edu_tuition_partial')
            : undefined
        }
        statusClassName={
          activeEnrollment?.paymentStatus === 'Paid'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : activeEnrollment?.paymentStatus === 'Overdue'
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'summary', label: isAr ? 'الملخص' : isEn ? 'Summary' : 'Synthèse' },
          { id: 'installments', label: isAr ? 'الأقساط' : isEn ? 'Installments' : 'Échéancier' },
          { id: 'actions', label: isAr ? 'التسوية' : isEn ? 'Settlement' : 'Règlement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'summary' | 'installments' | 'actions')}
        onSelectItem={(e) => {
          setDetailEnrollment(e);
          setInspectorTab('summary');
        }}
        onClose={() => setDetailEnrollment(null)}
        renderBody={(enr, tab) => {
          const pct = enr.agreedTuition > 0 ? Math.round((enr.paidAmount / enr.agreedTuition) * 100) : 0;
          if (tab === 'installments') {
            return (
              <InspectorSection
                index={0}
                title={isAr ? 'جدول الأقساط' : isEn ? 'Installments Schedule' : 'Échéancier des versements'}
              >
                <InspectorCard>
                  {!enr.installments || enr.installments.length === 0 ? (
                    <InspectorListItem title={isAr ? 'دفعة واحدة' : 'Single installment'} isLast />
                  ) : (
                    enr.installments.map((inst, idx) => (
                      <InspectorListItem
                        key={idx}
                        title={`${isAr ? 'القسط' : 'Versement'} #${idx + 1}`}
                        subtitle={`${inst.dueDate}${inst.paidAt ? ` · ${inst.paidAt.split('T')[0]}` : ''}`}
                        metaRight={formatMoney(inst.amount)}
                        badge={{ label: inst.isPaid ? 'Soldé' : 'En attente', tone: inst.isPaid ? 'ok' : 'warn' }}
                        isLast={idx === enr.installments!.length - 1}
                      />
                    ))
                  )}
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorQuickActions
                    actions={[
                      ...(enr.balanceDue > 0
                        ? [
                            {
                              id: 'pay',
                              label: t('edu_btn_log_payment'),
                              icon: <Plus size={16} />,
                              primary: true,
                              onClick: () => {
                                handleOpenPayment(enr, 0);
                                setDetailEnrollment(null);
                              },
                            },
                          ]
                        : []),
                      {
                        id: 'print',
                        label: isAr ? 'طباعة الوصل' : isEn ? 'Print Receipt' : 'Imprimer Reçu',
                        icon: <Printer size={16} />,
                        primary: enr.balanceDue <= 0,
                        onClick: () =>
                          setReceiptToPrint({
                            studentName: enr.studentName,
                            cohortName: enr.cohortName,
                            amount: enr.paidAmount,
                            method: 'Comptant / Virement',
                            date: new Date().toISOString().split('T')[0],
                            receiptNumber: `REC-${enr.id.slice(-6)}`,
                          }),
                      },
                    ]}
                  />
                </InspectorSection>
                {enr.balanceDue > 0 && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={t('edu_btn_log_payment')}
                      icon={<CreditCard size={15} />}
                      tone="accent"
                      onClick={() => {
                        handleOpenPayment(enr, 0);
                        setDetailEnrollment(null);
                      }}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(enr.balanceDue)}
                  tone={enr.balanceDue > 0 ? 'danger' : 'ok'}
                  caption={isAr ? 'الرصيد المتبقي' : isEn ? 'Remaining Balance' : 'Solde Restant'}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'نسبة التحصيل' : isEn ? 'Collection Progress' : 'Recouvrement'}>
                <InspectorCard>
                  <InspectorKeyValue label={t('edu_field_tuition_fee')} value={formatMoney(enr.agreedTuition)} />
                  <InspectorKeyValue
                    label={isAr ? 'المبلغ المدفوع' : isEn ? 'Paid Amount' : 'Montant Payé'}
                    value={formatMoney(enr.paidAmount)}
                    tone="ok"
                  />
                  <InspectorKeyValue label={isAr ? 'النسبة' : 'Taux'} value={`${pct}%`} isLast />
                  <InspectorProgressBar percent={pct} tone={pct >= 100 ? 'ok' : 'accent'} animateKey={enr.id} />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title={isAr ? 'معلومات العقد' : isEn ? 'Contract Info' : 'Contrat'}>
                <InspectorCard>
                  <InspectorKeyValue label={t('edu_col_student')} value={enr.studentName} mono={false} />
                  <InspectorKeyValue label={t('edu_col_cohort')} value={enr.cohortName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {selectedEnrollmentForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop w-full max-w-md">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white">
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
            <form onSubmit={handleConfirmPayment} className="space-y-4 t-cap">
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-1"
              >
                <div className="font-semibold text-black dark:text-white">{selectedEnrollmentForPayment.studentName}</div>
                <div className="text-black/55 dark:text-white/55">
                  {t('edu_label_cohort')}: {selectedEnrollmentForPayment.cohortName}
                </div>
                <div className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
                  {t('edu_fin_receivables')}: {formatMoney(selectedEnrollmentForPayment.balanceDue)}
                </div>
              </div>
              {selectedEnrollmentForPayment.installments && selectedEnrollmentForPayment.installments.length > 0 && (
                <div className="space-y-2">
                  <label className="t-small font-semibold text-black/70 dark:text-white/75">
                    Sélectionner l'échéance à solder
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEnrollmentForPayment.installments.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        data-sq="ctl"
                        data-sq-border="solid"
                        onClick={() => {
                          setSelectedInstallmentIndex(idx);
                          setPaymentAmount(inst.isPaid ? 0 : inst.amount);
                        }}
                        className={`p-2 text-left rtl:text-right transition-colors cursor-pointer ${
                          selectedInstallmentIndex === idx
                            ? 'bg-[#FCEEE8] dark:bg-[#2B2825] [--sq-stroke:#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold'
                            : 'bg-white dark:bg-[#22201E] text-black/70 dark:text-white/75'
                        }`}
                      >
                        <div className="t-cap text-black/55 dark:text-white/55">Échéance #{idx + 1}</div>
                        <div className="font-semibold tabular-nums">{formatMoney(inst.amount)}</div>
                        <div className="t-cap text-black/55 dark:text-white/55">
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
                corner={12}
              />
              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--atr-divider)]">
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
        </div>
      )}

      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop w-full max-w-sm">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
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
              <div className="font-semibold text-black dark:text-white t-label">
                {currentBusiness?.displayName || 'Atlas Academy'}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55">
                Receipt #{receiptToPrint.receiptNumber} · {receiptToPrint.date}
              </div>
            </div>
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-2 t-cap"
            >
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">
                  {isAr ? 'المترشح / المتدرب:' : isEn ? 'Learner:' : 'Apprenant :'}
                </span>
                <span className="font-semibold text-black dark:text-white">{receiptToPrint.studentName}</span>
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
              <div className="flex justify-between pt-2 border-t border-[var(--atr-divider)] font-semibold t-label">
                <span>{isAr ? 'المبلغ المسدد:' : isEn ? 'Amount Paid:' : 'Montant payé :'}</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatMoney(receiptToPrint.amount)}
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--atr-divider)]">
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
        </div>
      )}
    </div>
  );
};
