import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  Plus,
  Printer,
  CheckCircle2,
  X,
  ShieldCheck,
  Pin,
  Building2,
  Cloud,
  MapPin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  selectCurrentBusinessConfigFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ContractorDgp } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { calculateDecompteProvisoire } from '../../../utils/contractorRules';
import { ContractorDecomptePrintModal } from './ContractorDecomptePrintModal';
import { CacobatphDossierModal } from './CacobatphDossierModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticModalShell,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ContractorBillingView: React.FC<any> = () => {
  const {
    account,
    language,
    currentBusiness,
    currentBusinessConfig,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      currentUser: s.currentUser,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const defaultRetPct = currentBusinessConfig.categorySettings?.retenueGarantiePercent ?? 5;
  const defaultTvaPct = currentBusinessConfig.defaultTvaRate ?? 19;
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { dgps, projects, selectedProjectId, setSelectedProjectId, addDgp, updateDgpStatus } =
    useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [billingStatus, setBillingStatus] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [sortBy, setSortBy] = useState<string>('issuedDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());

  const [selectedDgp, setSelectedDgp] = useState<ContractorDgp | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>('decompte');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCacobatphModalOpen, setIsCacobatphModalOpen] = useState(false);

  const [periodLabel, setPeriodLabel] = useState('Situation Travaux - Mois Courant');
  const [periodGross, setPeriodGross] = useState('');
  const [retentionPct, setRetentionPct] = useState(String(defaultRetPct));
  const [advanceAmort, setAdvanceAmort] = useState('');
  const [hasBankCaution, setHasBankCaution] = useState(false);
  const [penaltiesDzd, setPenaltiesDzd] = useState('0');
  const [vatRate, setVatRate] = useState(String(defaultTvaPct));

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectDgps = useMemo(
    () => dgps.filter((d) => d.projectId === (selectedProject?.id || selectedProjectId)),
    [dgps, selectedProject?.id, selectedProjectId]
  );

  const activeDgp = useMemo(() => {
    if (!selectedDgp) return null;
    return projectDgps.find((d) => d.id === selectedDgp.id) || selectedDgp;
  }, [selectedDgp, projectDgps]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    projectDgps.forEach((d) => {
      const b = resolveRecordBranch(d, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [projectDgps, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: projectDgps.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || projectDgps.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, projectDgps.length, isAr, isEn]);

  const filteredDgps = useMemo(() => {
    return projectDgps.filter((d) => {
      if (billingStatus === 'paid' && d.status !== 'Paid') return false;
      if (billingStatus === 'bet' && d.status === 'Paid') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(d, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !d.dgpNumber.toLowerCase().includes(q) &&
          !d.periodLabel.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [projectDgps, billingStatus, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedDgps = useMemo(() => {
    const list = [...filteredDgps];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      if (sortBy === 'netPayableDzd') {
        return sortDir === 'asc'
          ? a.netPayableDzd - b.netPayableDzd
          : b.netPayableDzd - a.netPayableDzd;
      }
      if (sortBy === 'periodGrossDzd') {
        return sortDir === 'asc'
          ? a.periodGrossDzd - b.periodGrossDzd
          : b.periodGrossDzd - a.periodGrossDzd;
      }
      if (sortBy === 'dgpNumber') {
        return sortDir === 'asc'
          ? a.dgpNumber.localeCompare(b.dgpNumber)
          : b.dgpNumber.localeCompare(a.dgpNumber);
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc'
        ? (a.issuedDate || '').localeCompare(b.issuedDate || '')
        : (b.issuedDate || '').localeCompare(a.issuedDate || '');
    });
    return list;
  }, [filteredDgps, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalBilledGross = useMemo(
    () => projectDgps.reduce((acc, d) => acc + d.periodGrossDzd, 0),
    [projectDgps]
  );
  const totalRetention = useMemo(
    () => projectDgps.reduce((acc, d) => acc + d.retentionGuaranteeDzd, 0),
    [projectDgps]
  );
  const totalNetPayable = useMemo(
    () => projectDgps.reduce((acc, d) => acc + d.netPayableDzd, 0),
    [projectDgps]
  );
  const betApprovedCount = useMemo(
    () => projectDgps.filter((d) => d.status !== 'Paid').length,
    [projectDgps]
  );
  const paidCount = useMemo(
    () => projectDgps.filter((d) => d.status === 'Paid').length,
    [projectDgps]
  );

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

  const handleTogglePin = useCallback(
    (d: ContractorDgp) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(d.id)) next.delete(d.id);
        else next.add(d.id);
        return next;
      });
      showToast(isAr ? 'تم تحديث التثبيت' : 'Situation épinglée', 'info');
    },
    [isAr]
  );

  const handlePrintDgp = useCallback((d: ContractorDgp) => {
    setSelectedDgp(d);
    setIsPrintModalOpen(true);
  }, []);

  const handleSelectDgp = useCallback((d: ContractorDgp, originEl?: HTMLElement | null) => {
    if (originEl) setDrawerOpenerEl(originEl);
    setSelectedDgp(d);
    setActiveInspectorTab('decompte');
  }, []);

  const handleCreateDgp = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAccountId = (selectedProject?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (selectedProject?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const gross = parseFloat(periodGross);
    if (!Number.isFinite(gross) || gross <= 0) {
      showToast(isAr ? 'يرجى إدخال مبلغ الكشف' : 'Veuillez saisir un montant brut valide', 'error');
      return;
    }
    const retPercent = parseFloat(retentionPct) || 5;
    const advance = advanceAmort.trim() ? parseFloat(advanceAmort) || 0 : 0;
    const penDzd = parseFloat(penaltiesDzd) || 0;
    const vatPercent = parseFloat(vatRate) || 19;
    const calc = calculateDecompteProvisoire({
      grossAmountCurrentHtDzd: gross,
      cumulativePreviousGrossHtDzd: totalBilledGross,
      retentionPercent: retPercent,
      hasBankCautionReplacement: hasBankCaution,
      advanceReimbursementRate: gross > 0 ? advance / gross : 0,
      penaltiesDeductedDzd: penDzd,
      vatRatePercent: vatPercent,
    });
    const newDgp: ContractorDgp = {
      id: `dgp_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      projectId: selectedProject?.id || selectedProjectId,
      dgpNumber: `DGP-${String(projectDgps.length + 1).padStart(2, '0')}-${
        selectedProject?.projectCode || 'CHANT'
      }`,
      periodLabel: periodLabel.trim(),
      grossCompletedDzd: calc.cumulativeGrossHtDzd,
      previousCumulDzd: totalBilledGross,
      periodGrossDzd: gross,
      retentionGuaranteePercent: retPercent,
      retentionGuaranteeDzd: calc.retentionGuaranteeDzd,
      hasBankCautionReplacement: hasBankCaution,
      advanceAmortizationDzd: calc.advanceReimbursementDzd,
      penaltiesDeductedDzd: calc.penaltiesDeductedDzd,
      tvaPercent: calc.vatRatePercent,
      tvaAmountDzd: calc.vatAmountDzd,
      netPayableDzd: calc.netPayableDzd,
      status: 'ApprovedBE',
      issuedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    addDgp(newDgp);
    setIsModalOpen(false);
    setSelectedDgp(newDgp);
  };

  const handleExportCsv = useCallback(() => {
    const headers = [
      'N° Situation',
      'Période',
      'Agence / Direction',
      'Montant Brut HT',
      'Retenue 5%',
      'Net à Payer TTC',
      'Statut',
      'Date',
    ];
    const rows = sortedDgps.map((d) => {
      const b = resolveRecordBranch(d, branchesById, currentBranch, language);
      return [
        d.dgpNumber,
        d.periodLabel,
        b.name,
        d.periodGrossDzd,
        d.retentionGuaranteeDzd,
        d.netPayableDzd,
        d.status,
        d.issuedDate || '',
      ];
    });
    downloadCsvSafe(
      `decomptes_dgp_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير كشوف الحساب CSV' : 'Export CSV des décomptes généré', 'info');
  }, [sortedDgps, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (billingStatus !== 'all') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [billingStatus, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (billingStatus !== 'all') {
      chips.push({
        key: 'status',
        label: billingStatus === 'paid' ? 'Réglées' : 'Validées BET',
        onRemove: () => setBillingStatus('all'),
      });
    }
    if (branchFilter !== 'All') {
      const opt = branchOptions.find((o) => o.value === branchFilter);
      chips.push({
        key: 'branch',
        label: opt?.label || branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [billingStatus, branchFilter, branchOptions]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setBillingStatus('all');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة الدفع' : isEn ? 'Status' : 'Statut Situation',
        value: billingStatus,
        onChange: setBillingStatus,
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: projectDgps.length },
          { value: 'bet', label: isAr ? 'مقبولة BET' : 'Validées BET', count: betApprovedCount },
          { value: 'paid', label: isAr ? 'مسددة' : 'Réglées', count: paidCount },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المديرية' : isEn ? 'Branch' : 'Agence / Direction',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, billingStatus, branchFilter, projectDgps.length, betApprovedCount, paidCount, branchOptions]
  );

  const getRowMeta = useCallback(
    (d: ContractorDgp): Partial<KineticRowData> => {
      const b = resolveRecordBranch(d, branchesById, currentBranch, language);
      const isPaid = d.status === 'Paid';
      return {
        subline: `${d.periodLabel} · ${d.issuedDate || '—'}`,
        categoryLabel: isPaid ? (isAr ? 'مدفوع' : 'Réglé') : 'BET Validé',
        statusLabel: isPaid ? (isAr ? 'مدفوع' : isEn ? 'Paid' : 'Réglé') : isAr ? 'معتمد BET' : 'Approuvé BET',
        statusVariant: isPaid ? 'active' : 'warning',
        metricPrimary: formatMoney(d.netPayableDzd, language),
        metricSecondary: `Ret. 5%: ${formatMoney(d.retentionGuaranteeDzd, language)}`,
        detailCol1: {
          heading: isAr ? 'الوضعية والفرع' : isEn ? 'Situation & Branch' : 'Situation & Agence',
          primaryText: d.dgpNumber,
          secondaryText: d.periodLabel,
          tertiaryText: b.name,
        },
        detailCol2: {
          heading: isAr ? 'التقييم المالي' : isEn ? 'Valuation' : 'Montants HT / Retenue',
          primaryText: formatMoney(d.periodGrossDzd, language),
          secondaryText: `Retenue 5%: -${formatMoney(d.retentionGuaranteeDzd, language)}`,
          tertiaryText: `TVA ${d.tvaPercent || 19}%: +${formatMoney(d.tvaAmountDzd || 0, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'الصافي للدفع' : isEn ? 'Net Payable' : 'Mandatement TTC',
          primaryText: formatMoney(d.netPayableDzd, language),
          secondaryText: `${isAr ? 'بتاريخ' : 'Émis le'} ${d.issuedDate || '—'}`,
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (d: ContractorDgp): KineticRowFanAction[] => [
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => handlePrintDgp(d),
      },
      ...(d.status !== 'Paid'
        ? [
            {
              id: 'mark-paid',
              label: isAr ? 'تسديد' : isEn ? 'Settle' : 'Régler',
              icon: <CheckCircle2 className="w-[15px] h-[15px]" />,
              onClick: () => {
                updateDgpStatus(d.id, 'Paid');
              },
            },
          ]
        : []),
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <ShieldCheck className="w-[15px] h-[15px]" />,
        onClick: (e) => handleSelectDgp(d, e.currentTarget),
      },
    ],
    [handlePrintDgp, updateDgpStatus, handleSelectDgp, isAr, isEn]
  );

  const getDetailActions = useCallback(
    (d: ContractorDgp): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'معاينة الكشف' : isEn ? 'Inspect' : 'Ouvrir fiche',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        onClick: () => handleSelectDgp(d),
      },
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => handlePrintDgp(d),
      },
      ...(d.status !== 'Paid'
        ? [
            {
              id: 'settle',
              label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Marquer réglée',
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#096b40]" />,
              onClick: () => {
                updateDgpStatus(d.id, 'Paid');
              },
            },
          ]
        : []),
    ],
    [handleSelectDgp, handlePrintDgp, updateDgpStatus, isAr, isEn]
  );

  const columns: ColumnDefinition<ContractorDgp>[] = useMemo(
    () => [
      {
        key: 'dgpNumber',
        header: isAr ? 'رقم الكشف / الفترة' : 'Situation & Période',
        width: '2.2*',
        sortable: true,
        renderCell: (d) => {
          const isPinned = pinnedIds.has(d.id);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div
                data-sq="ctl-sm"
                data-sq-border="solid"
                className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0 [--sq-stroke:rgba(212,82,47,0.22)] dark:[--sq-stroke:rgba(255,143,99,0.22)]"
              >
                <Building2 size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2 truncate">
                  {d.dgpNumber}
                  {isPinned && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
                </div>
                <div className="t-cap text-black/55 dark:text-white/55 truncate max-w-[180px]">
                  {d.periodLabel}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.3*',
        sortable: true,
        renderCell: (d) => {
          const b = resolveRecordBranch(d, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-1 t-cap text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'periodGrossDzd',
        header: isAr ? 'المبلغ الإجمالي HT' : 'Montant Brut HT',
        width: '1.4*',
        sortable: true,
        renderCell: (d) => (
          <div className="tabular-nums t-cap text-black dark:text-white">
            {formatMoney(d.periodGrossDzd, language)}
          </div>
        ),
      },
      {
        key: 'retentionGuaranteeDzd',
        header: isAr ? 'اقتطاع الضمان (5%)' : 'Retenue (5%)',
        width: '1.3*',
        renderCell: (d) => (
          <div className="tabular-nums t-cap text-amber-600 dark:text-amber-400">
            {formatMoney(d.retentionGuaranteeDzd, language)}
          </div>
        ),
      },
      {
        key: 'netPayableDzd',
        header: isAr ? 'الصافي للدفع TTC' : 'Net à Payer TTC',
        width: '1.5*',
        sortable: true,
        renderCell: (d) => (
          <div className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            {formatMoney(d.netPayableDzd, language)}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الاعتماد' : 'Validation',
        width: '1.2*',
        renderCell: (d) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full t-small font-semibold ${
              d.status === 'Paid'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            {d.status === 'Paid' ? (isAr ? 'مدفوع' : 'Réglé') : isAr ? 'معتمد BET' : 'Approuvé BET'}
          </span>
        ),
      },
    ],
    [pinnedIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: dgps.length > 0,
  });

  if (showSkeleton && (dgps.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.4*', minWidth: '140px' },
          { width: '1.2*', minWidth: '120px' },
          { width: '1.4*', minWidth: '140px' },
          { width: '1.5*', minWidth: '150px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={isAr ? 'الفواتير' : isEn ? 'Billings' : 'Décomptes'}
        primaryAction={{
          label: isAr ? 'كشف جديد (DGP)' : isEn ? 'New DGP' : 'Nouvelle Situation DGP',
          onClick: () => setIsModalOpen(true),
          dataAction: 'add-dgp',
        }}
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => setIsCacobatphModalOpen(true)}
            icon={<Cloud size={14} />}
          >
            {isAr ? 'ملف CACOBATPH' : 'Dossier CACOBATPH 48h'}
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr ? 'الوضعية المالية للمشروع' : 'Situation Financière & Retenues du Projet'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'وضعيات مقبولة BET' : isEn ? 'BET Approved' : 'Approuvées BET',
          badgeText: isAr ? 'مقبولة' : 'Validées',
          count: betApprovedCount,
          tone: 'terracotta',
          isActive: billingStatus === 'bet',
          onToggle: () => setBillingStatus((prev) => (prev === 'bet' ? 'all' : 'bet')),
        }}
        secondaryCard={{
          label: isAr ? 'وضعيات مسددة' : isEn ? 'Paid Situations' : 'Situations Réglées',
          badgeText: isAr ? 'مسددة' : 'Réglées',
          count: paidCount,
          tone: 'emerald',
          isActive: billingStatus === 'paid',
          onToggle: () => setBillingStatus((prev) => (prev === 'paid' ? 'all' : 'paid')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي الصافي المستحق' : isEn ? 'Net Situations TTC' : 'Net des Situations Travaux',
          badgeCount: totalRetention,
          badgePrefix: `Ret. ${defaultRetPct}% `,
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => Math.round(v).toLocaleString(),
          valueCount: totalNetPayable,
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? `بعد خصم التسبيق واقتطاع الضمان (TVA ${defaultTvaPct}%)` : `Déduction avances & TVA ${defaultTvaPct}% incluse`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'كشوف الحساب والوضعيات المالية (DGP)'
              : 'Décomptes Généraux & Situations de Travaux (DGP)'
          }
          liveRegionText={`${sortedDgps.length} ${isAr ? 'كشوفات' : 'situations'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برقم الكشف...' : 'Filtrer situation, libellé...'}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: projectDgps.length },
            { value: 'bet', label: isAr ? 'مقبولة' : 'Validées', count: betApprovedCount },
            { value: 'paid', label: isAr ? 'مسددة' : 'Réglées', count: paidCount },
          ]}
          statusValue={billingStatus}
          onStatusChange={setBillingStatus}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          extraTrailingControls={
            <div className="w-52">
              <FilterSelect
                value={selectedProject?.id || selectedProjectId}
                onChange={setSelectedProjectId}
                options={projectOptions}
              />
            </div>
          }
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<ContractorDgp>
          hideToolbar
          items={sortedDgps}
          columns={columns}
          keyExtractor={(d) => d.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isPinned={(d) => pinnedIds.has(d.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeDgp?.id || null}
          onItemClick={handleSelectDgp}
          onViewDetails={handleSelectDgp}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          customActions={(d) => [
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer size={13} />,
              variant: 'primary',
              onClick: () => handlePrintDgp(d),
            },
            {
              id: 'cert',
              label: isAr ? 'شهادة الدفع' : 'Certificat',
              icon: <ShieldCheck size={13} />,
              onClick: () => handleSelectDgp(d),
            },
          ]}
          emptyTitle={isAr ? 'لا توجد كشوفات' : 'Aucune situation DGP'}
          emptyDescription={
            isAr ? 'قم بتحرير أول كشف أشغال للمشروع' : 'Créez votre première situation de travaux'
          }
          primaryActionLabel={isAr ? 'كشف جديد (DGP)' : 'Nouvelle Situation DGP'}
          onAddFirstItem={() => setIsModalOpen(true)}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedDgps.length}
        entityPluralLabel={isAr ? 'وضعيات' : 'situations'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeDgp)}
        item={activeDgp}
        allItems={sortedDgps}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeDgp?.dgpNumber || ''}
        subtitle={activeDgp ? `${activeDgp.periodLabel} · ${activeDgp.issuedDate}` : undefined}
        categoryLabel={selectedProject?.projectCode || 'BTP DGP'}
        avatarText="DG"
        branchName={
          activeDgp
            ? resolveRecordBranch(activeDgp, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeDgp?.status === 'Paid' ? (isAr ? 'مدفوع' : 'Réglé') : isAr ? 'معتمد BET' : 'Approuvé BET'
        }
        statusClassName={
          activeDgp?.status === 'Paid'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
        }
        tabs={[
          { id: 'decompte', label: isAr ? 'البيان المالي' : isEn ? 'Breakdown' : 'Décompte' },
          { id: 'certificat', label: isAr ? 'الشهادة والضمان' : isEn ? 'Certificate' : 'Certificat' },
          { id: 'actions', label: isAr ? 'السجل' : isEn ? 'Audit' : 'Traçabilité' },
        ]}
        activeTab={activeInspectorTab}
        onTabChange={setActiveInspectorTab}
        onSelectItem={(d) => handleSelectDgp(d)}
        onClose={() => setSelectedDgp(null)}
        renderBody={(d, tab) => {
          if (tab === 'certificat') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'شهادة الدفع' : isEn ? 'Payment Certificate' : 'Certificat de Paiement BTP'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Marché" value={selectedProject?.projectCode || '—'} />
                    <InspectorKeyValue label="Maître d’Ouvrage" value={selectedProject?.clientName || 'Ministère / Promoteur'} mono={false} />
                    <InspectorKeyValue label="Bureau d’Études" value="BET Technique & Architecture" mono={false} />
                    <InspectorKeyValue label="Caution bancaire" value={d.hasBankCautionReplacement ? 'Oui (Art. 99)' : 'Retenue 5%'} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'اقتطاع الضمان' : 'Libération de la caution'}>
                  <InspectorBigStat
                    value={formatMoney(totalRetention, language)}
                    tone="default"
                    caption="Retenue de garantie cumulée (déblocable 12 mois après réception provisoire)"
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'actions') {
            return (
              <InspectorSection index={0} title={isAr ? 'سجل الاعتماد' : isEn ? 'Validation Trail' : 'Étapes de mandatement'}>
                <InspectorCard>
                  <InspectorListItem
                    title="Attachements contradictoires signés"
                    subtitle={`Conducteur travaux & BET · ${d.issuedDate || '—'}`}
                    badge={{ label: 'Validé', tone: 'ok' }}
                  />
                  <InspectorListItem
                    title={d.status === 'Paid' ? 'Virement Trésorerie exécuté' : 'En attente de mandatement'}
                    subtitle={`${d.dgpNumber} · TVA ${d.tvaPercent || 19}%`}
                    metaRight={formatMoney(d.netPayableDzd, language)}
                    badge={{ label: d.status === 'Paid' ? 'Réglé' : 'BET OK', tone: d.status === 'Paid' ? 'ok' : 'warn' }}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer DGP',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handlePrintDgp(d),
                    },
                    ...(d.status !== 'Paid'
                      ? [
                          {
                            id: 'settle',
                            label: isAr ? 'تأكيد الدفع' : isEn ? 'Mark Paid' : 'Marquer réglée',
                            icon: <CheckCircle2 className="w-[18px] h-[18px]" />,
                            onClick: () => {
                              updateDgpStatus(d.id, 'Paid');
                              setSelectedDgp({ ...d, status: 'Paid' });
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'pin',
                      label: pinnedIds.has(d.id) ? 'Désépingler' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(d),
                    },
                    {
                      id: 'cacobatph',
                      label: 'CACOBATPH',
                      icon: <Cloud className="w-[18px] h-[18px]" />,
                      onClick: () => setIsCacobatphModalOpen(true),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={formatMoney(d.netPayableDzd, language)}
                  tone={d.status === 'Paid' ? 'ok' : 'accent'}
                  caption={`${d.periodLabel} · TVA ${d.tvaPercent || 19}% incluse`}
                  action={
                    d.status !== 'Paid'
                      ? {
                          label: isAr ? 'تأكيد التسديد' : 'Marquer comme réglée',
                          onClick: () => {
                            updateDgpStatus(d.id, 'Paid');
                            setSelectedDgp({ ...d, status: 'Paid' });
                          },
                        }
                      : undefined
                  }
                />
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'تفاصيل الكشف' : isEn ? 'Calculation Details' : 'Détail du décompte'}>
                <InspectorCard>
                  <InspectorKeyValue label="Cumul précédent" value={formatMoney(d.previousCumulDzd || 0, language)} />
                  <InspectorKeyValue label="Montant du mois HT" value={formatMoney(d.periodGrossDzd, language)} />
                  <InspectorKeyValue label="Retenue garantie (5%)" value={`-${formatMoney(d.retentionGuaranteeDzd, language)}`} tone="warn" />
                  <InspectorKeyValue label="Amortissement avances" value={`-${formatMoney(d.advanceAmortizationDzd || 0, language)}`} />
                  <InspectorKeyValue label={`TVA (${d.tvaPercent || 19}%)`} value={`+${formatMoney(d.tvaAmountDzd || 0, language)}`} tone="accent" isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
                  >
                    <Plus size={16} />
                  </div>
                  <h3 className="font-semibold t-label text-black dark:text-white">
                    {isAr ? 'تحرير كشف حساب جديد (DGP)' : 'Établir une Nouvelle Situation DGP'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            <form onSubmit={handleCreateDgp} className="space-y-4">
              <LabelInput
                field="periodLabel"
                width="100%"
                height={40}
                corner={12}
                label="Libellé de la période"
                value={periodLabel}
                onChange={setPeriodLabel}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="periodGross"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Montant brut du mois (HT DZD)"
                  type="number"
                  placeholder="15000000"
                  value={periodGross}
                  onChange={setPeriodGross}
                  required
                />
                <LabelInput
                  field="retentionPct"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Retenue de garantie (%)"
                  type="number"
                  value={retentionPct}
                  onChange={setRetentionPct}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="advanceAmort"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Amortissement avances forfaitaires (DZD)"
                  type="number"
                  placeholder="0"
                  value={advanceAmort}
                  onChange={setAdvanceAmort}
                />
                <LabelInput
                  field="penaltiesDzd"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Pénalités éventuelles déduites (DZD)"
                  type="number"
                  value={penaltiesDzd}
                  onChange={setPenaltiesDzd}
                />
              </div>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-3 bg-neutral-50 dark:bg-[#22201E] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="t-small font-semibold text-black dark:text-white">
                    {isAr ? 'تعويض اقتطاع الضمان بكفالة بنكية' : 'Caution bancaire de substitution'}
                  </div>
                  <div className="t-cap text-black/55 dark:text-white/55">
                    {isAr
                      ? 'إلغاء الاقتطاع المالي 5% بموجب كفالة معتمدة'
                      : 'Dispense de retenue 5% (Art. 99 Décret 15-247)'}
                  </div>
                </div>
                <LiveSwitch
                  checked={hasBankCaution}
                  onCheckedChange={setHasBankCaution}
                  aria-label={isAr ? 'تعويض اقتطاع الضمان بكفالة بنكية' : 'Caution bancaire de substitution'}
                />
              </div>
              <div>
                <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
                  Taux TVA Applicable
                </label>
                <LiveSegmentedControl
                  size="md"
                  fullWidth
                  value={vatRate}
                  onChange={setVatRate}
                  options={[
                    { value: '19', label: '19% (Travaux BTP Standard)' },
                    { value: '9', label: '9% (Logement Social)' },
                  ]}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </Button>
                <Button tone="accent" size={40} type="submit">
                  {isAr ? 'حفظ الكشف' : 'Enregistrer situation'}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>

      <ContractorDecomptePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        dgp={activeDgp}
        project={selectedProject}
      />
      <CacobatphDossierModal
        isOpen={isCacobatphModalOpen}
        onClose={() => setIsCacobatphModalOpen(false)}
        project={selectedProject}
      />
    </div>
  );
};
