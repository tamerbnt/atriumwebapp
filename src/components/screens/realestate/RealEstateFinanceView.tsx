import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Receipt,
  Printer,
  CheckCircle2,
  Send,
  Share2,
  Clock,
  Calculator,
  MapPin,
  Eye,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  useAtriumActions,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { buildRealEstateScfJournalDraft, formatRealEstateSequentialCode } from '../../../utils/realEstateDepth';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstateLease } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { NotarySimulatorModal } from './NotarySimulatorModal';
import { ShareArtifactModal } from '../../modals/ShareArtifactModal';
import { PrintSheetModal, PrintSheetPage } from '../../modals/PrintSheetModal';
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
  InspectorBigStat,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const RealEstateFinanceView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode, businessConfig } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      businessConfig: selectCurrentBusinessConfigFromState(s),
    }),
    shallowEqualObjects
  );
  const {
    retryCloudSync,
    ensurePartyForEntity,
    createUnifiedDocument,
    recordUnifiedPayment,
    postManualJournalEntry,
  } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { leases, ownerLedger, recordOwnerPayout } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('rent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<RealEstateLease | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('quittance');
  const [sharePayload, setSharePayload] = useState<{ title: string; subtitle: string; text: string; printPage: PrintSheetPage } | null>(null);
  const [printPage, setPrintPage] = useState<PrintSheetPage | null>(null);

  const settledBailleurIds = useMemo(
    () =>
      Array.from(
        new Set(
          ownerLedger
            .filter((e) => e.entryType === 'Payout' && e.leaseId)
            .map((e) => e.leaseId as string)
        )
      ),
    [ownerLedger]
  );

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    leases.forEach((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [leases, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: leases.length },
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
        count: branchCounts.get(currentBranch.id) || leases.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, leases.length, isAr, isEn]);

  const filteredFinanceLeases = useMemo(() => {
    return leases.filter((l) => {
      if (settlementFilter === 'reversements' && !settledBailleurIds.includes(l.id)) return false;
      if (settlementFilter === 'impayes' && l.status === 'Active') return false;
      if (settlementFilter === 'loyers' && l.status !== 'Active') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(l, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(l, branchesById, currentBranch, language);
        const matches =
          l.propertyTitle.toLowerCase().includes(q) ||
          l.tenantName.toLowerCase().includes(q) ||
          (l.tenantPhone || '').toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [leases, settlementFilter, settledBailleurIds, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedFinanceLeases = useMemo(() => {
    const list = [...filteredFinanceLeases];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'rent') cmp = a.monthlyRentDzd - b.monthlyRentDzd;
      else if (sortBy === 'netOwner') cmp = a.monthlyRentDzd * 0.9 - b.monthlyRentDzd * 0.9;
      else if (sortBy === 'property') cmp = a.propertyTitle.localeCompare(b.propertyTitle);
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredFinanceLeases, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalMonthlyRents = useMemo(() => leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0), [leases]);
  const totalCommissions = useMemo(() => leases.reduce((acc, l) => acc + l.monthlyRentDzd * 0.1, 0), [leases]);
  const netOwnerDisbursal = totalMonthlyRents - totalCommissions;

  const buildReceiptPrintPage = useCallback(
    (lease: RealEstateLease): PrintSheetPage => {
      const fee = Math.round(lease.monthlyRentDzd * 0.1);
      const net = lease.monthlyRentDzd - fee;
      const isSettled = settledBailleurIds.includes(lease.id);
      return {
        id: `qtc_${lease.id}`,
        title: `${isAr ? 'وصل إيجار وكشف حساب المالك' : 'Quittance de Loyer & Décompte Bailleur'}`,
        subtitle: `${lease.propertyTitle} · ${lease.tenantName}`,
        badgeText: isSettled ? (isAr ? 'محوّل' : 'Reversé') : isAr ? 'بانتظار التحويل' : 'En attente',
        sections: [
          {
            rows: [
              { label: isAr ? 'المستأجر' : 'Locataire', value: lease.tenantName },
              { label: isAr ? 'المالك / المؤجر' : 'Bailleur', value: lease.ownerName || 'Propriétaire' },
              { label: isAr ? 'الإيجار الشهري' : 'Loyer Quittancé', value: formatMoney(lease.monthlyRentDzd, language) },
              { label: isAr ? 'أتعاب الوكالة (10%)' : 'Honoraires Agence (10%)', value: formatMoney(fee, language) },
              { label: isAr ? 'صافي مستحق المالك' : 'Net Bailleur', value: formatMoney(net, language) },
              { label: isAr ? 'الضمان المودع' : 'Caution Séquestrée', value: formatMoney(lease.securityDepositDzd, language) },
            ],
          },
        ],
        signatureLeft: isAr ? 'توقيع المستأجر / المالك' : 'Signature Client / Bailleur',
        signatureRight: isAr ? 'ختم الوكالة' : 'Cachet Agence',
      };
    },
    [settledBailleurIds, isAr, language]
  );

  const handlePrintQuittance = useCallback(
    (leaseOrTenant: RealEstateLease | string, propertyTitle?: string) => {
      if (typeof leaseOrTenant !== 'string') {
        setPrintPage(buildReceiptPrintPage(leaseOrTenant));
        return;
      }
      setPrintPage({
        id: `qtc_summary_${Date.now()}`,
        title: `${isAr ? 'وصل إيجار' : 'Quittance de Loyer'} — ${leaseOrTenant}`,
        subtitle: propertyTitle,
        sections: [{ rows: [{ label: isAr ? 'العقار' : 'Bien', value: propertyTitle || '—' }] }],
      });
    },
    [buildReceiptPrintPage, isAr]
  );

  const handleOpenShareReceipt = useCallback(
    (lease: RealEstateLease) => {
      const fee = Math.round(lease.monthlyRentDzd * 0.1);
      const net = lease.monthlyRentDzd - fee;
      const page = buildReceiptPrintPage(lease);
      const shareText = [
        `Atrium Immobilier — ${page.title}`,
        `Bien : ${lease.propertyTitle}`,
        `Locataire : ${lease.tenantName}`,
        `Loyer : ${formatMoney(lease.monthlyRentDzd, language)}`,
        `Honoraires gestion (10%) : ${formatMoney(fee, language)}`,
        `Net Bailleur : ${formatMoney(net, language)}`,
      ].join('\n');
      setSharePayload({
        title: `Quittance · ${lease.tenantName}`,
        subtitle: lease.propertyTitle,
        text: shareText,
        printPage: page,
      });
    },
    [buildReceiptPrintPage, language]
  );

  const handleDisburseToOwner = useCallback(
    (lease: RealEstateLease) => {
      if (settledBailleurIds.includes(lease.id)) return;
      const tvaRate = businessConfig.defaultTvaRate ?? 19;
      const feeHt = Math.round(lease.monthlyRentDzd * 0.1);
      const feeTva = Math.round(feeHt * (tvaRate / 100));
      const net = Math.max(0, lease.monthlyRentDzd - feeHt - feeTva);
      const refCode = formatRealEstateSequentialCode('QTC', ownerLedger.map((e) => e.reference));
      const todayIso = new Date().toISOString().slice(0, 10);

      let paymentId: string | undefined;
      let journalId: string | undefined;

      try {
        const ownerParty = ensurePartyForEntity({
          businessId: lease.businessId,
          branchId: lease.branchId,
          sourceVertical: 'real_estate',
          entityType: 'owner',
          entityId: lease.ownerName || lease.id,
          displayName: lease.ownerName || 'Bailleur',
          phone: lease.ownerPhone,
        });

        const doc = createUnifiedDocument({
          docType: 'facture',
          sourceVertical: 'real_estate',
          partyId: ownerParty.party.id,
          partyName: lease.ownerName || 'Bailleur',
          partyPhone: lease.ownerPhone,
          docDate: todayIso,
          paymentMethod: 'bank_transfer',
          sourceEntityType: 're_owner_payout',
          sourceEntityId: lease.id,
          items: [
            {
              description: `Honoraires gestion locative · ${lease.propertyTitle} (${lease.leaseNumber || lease.id})`,
              isService: true,
              quantity: 1,
              unit: 'mois',
              unitPriceHt: feeHt,
              tvaPercent: tvaRate,
            },
          ],
          issueImmediately: true,
        });

        const payment = recordUnifiedPayment({
          sourceVertical: 'real_estate',
          partyId: ownerParty.party.id,
          partyName: lease.ownerName || 'Bailleur',
          method: 'bank_transfer',
          direction: 'outflow',
          amountDzd: net,
          paymentDate: todayIso,
          allocations: [{ documentId: doc.id, requestedDzd: net }],
          idempotencyKey: `re_payout_${lease.id}_${todayIso}`,
        });
        if (payment && typeof payment === 'object' && 'id' in payment) {
          paymentId = payment.id;
        }

        const scfDraft = buildRealEstateScfJournalDraft({
          reference: refCode,
          label: lease.propertyTitle,
          grossCollectedDzd: lease.monthlyRentDzd,
          agencyFeeHtDzd: feeHt,
          agencyFeeTvaDzd: feeTva,
          paymentMethod: 'Virement',
        });
        if (scfDraft.balanced) {
          const entry = postManualJournalEntry({
            journalCode: scfDraft.journalCode,
            entryDate: todayIso,
            pieceRef: refCode,
            libelle: `Reversement bailleur ${lease.ownerName || ''} · ${lease.propertyTitle}`,
            lines: scfDraft.lines.map((l) => ({
              accountCode: l.accountCode,
              accountLabel: l.accountLabel,
              debitCentimes: l.debitCentimes,
              creditCentimes: l.creditCentimes,
              partyId: ownerParty.party.id,
              partyName: lease.ownerName || 'Bailleur',
            })),
            sourceVertical: 'real_estate',
            sourceEventType: 'payment',
            sourceDocId: doc.id,
            idempotencyKey: `re_payout_scf_${lease.id}_${todayIso}`,
            silentSuccessToast: true,
          });
          if (entry && typeof entry === 'object' && 'id' in entry) {
            journalId = (entry as { id: string }).id;
          }
        }
      } catch (err: any) {
        if (err?.message === 'PERIOD_CLOSED_LOCKED') {
          showToast(
            isAr ? 'الفترة المحاسبية مغلقة' : 'Période comptable clôturée : reversement bloqué.',
            'error'
          );
          return;
        }
      }

      recordOwnerPayout({
        ownerName: lease.ownerName || 'Bailleur',
        propertyTitle: lease.propertyTitle,
        propertyId: lease.propertyId,
        leaseId: lease.id,
        amountDzd: net,
        reference: refCode,
        unifiedPaymentId: paymentId,
        journalEntryId: journalId,
        notes: `Reversement net bailleur après honoraires (${formatMoney(feeHt + feeTva, language)})`,
      });
      showToast(
        isAr
          ? `تم تحويل صافي الإيجار للمالك (${formatMoney(net, language)})`
          : isEn
          ? `Owner disbursement persisted (${formatMoney(net, language)})`
          : `Reversement bailleur enregistré (${formatMoney(net, language)})`,
        'success'
      );
    },
    [
      settledBailleurIds,
      businessConfig.defaultTvaRate,
      ownerLedger,
      ensurePartyForEntity,
      createUnifiedDocument,
      recordUnifiedPayment,
      postManualJournalEntry,
      recordOwnerPayout,
      isAr,
      isEn,
      language,
    ]
  );

  const handleTogglePin = useCallback((l: RealEstateLease) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(l.id)) next.delete(l.id);
      else next.add(l.id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = [
      'ID Bail',
      'Bien Immobilier',
      'Locataire',
      'Téléphone',
      'Agence / Branche',
      'Loyer Quittancé (DZD)',
      'Commission Agence 10% (DZD)',
      'Net Bailleur (DZD)',
      'Statut Reversement',
    ];
    const rows = sortedFinanceLeases.map((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      const isSettled = settledBailleurIds.includes(l.id);
      return [
        l.id,
        l.propertyTitle,
        l.tenantName,
        l.tenantPhone,
        b.name,
        l.monthlyRentDzd,
        Math.round(l.monthlyRentDzd * 0.1),
        Math.round(l.monthlyRentDzd * 0.9),
        isSettled ? 'Reversé' : 'À reverser',
      ];
    });
    downloadCsvSafe(`quittances_bailleurs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير كشف التحويلات' : 'Export CSV des règlements bailleurs généré', 'info');
  }, [sortedFinanceLeases, branchesById, currentBranch, language, settledBailleurIds, isAr]);

  const activeFiltersCount = branchFilter !== 'All' ? 1 : 0;
  const hasAnyFilters = settlementFilter !== 'all' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSettlementFilter('all');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (settlementFilter !== 'all') {
      chips.push({ key: 'settlement', label: settlementFilter, onRemove: () => setSettlementFilter('all') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [settlementFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Agence / Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ],
    [branchFilter, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<RealEstateLease>[] = useMemo(
    () => [
      {
        key: 'property',
        header: isAr ? 'العقار' : 'Bien Immobilier',
        width: '2.6*',
        sortable: true,
        renderCell: (l) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block truncate">{l.propertyTitle}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              Bail du {l.startDate} au {l.endDate}
            </span>
          </div>
        ),
      },
      {
        key: 'tenant',
        header: isAr ? 'المستأجر' : 'Locataire Titulaire',
        width: '1.8*',
        renderCell: (l) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block truncate">{l.tenantName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{l.tenantPhone}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => {
          const b = resolveRecordBranch(l, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'rent',
        header: isAr ? 'مبلغ الإيجار' : 'Loyer Quittancé',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => <span className="tabular-nums t-small font-semibold text-black dark:text-white">{formatMoney(l.monthlyRentDzd, language)}</span>,
      },
      {
        key: 'commission',
        header: isAr ? 'عمولة الوكالة' : 'Com. (10%)',
        width: '1.3*',
        renderCell: (l) => (
          <span className="tabular-nums t-small text-blue-600 dark:text-blue-400 font-semibold">
            {formatMoney(l.monthlyRentDzd * 0.1, language)}
          </span>
        ),
      },
      {
        key: 'netOwner',
        header: isAr ? 'صافي المالك' : 'Net Bailleur',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => (
          <span className="tabular-nums t-small font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(l.monthlyRentDzd * 0.9, language)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'التسوية' : 'Reversement',
        width: '1.3*',
        renderCell: (l) => {
          const isSettled = settledBailleurIds.includes(l.id);
          return (
            <span
              className={`px-2.5 py-1 rounded-full t-small font-semibold inline-flex items-center gap-1 ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {isSettled ? (isAr ? 'تم التحويل' : 'Reversé') : isAr ? 'بانتظار التحويل' : 'À reverser'}
            </span>
          );
        },
      },
    ],
    [branchesById, currentBranch, language, settledBailleurIds, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: leases.length > 0,
  });

  if (showSkeleton && (leases.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const activeBranchInfo = selectedLease ? resolveRecordBranch(selectedLease, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Receipt size={22} />}
        title={isAr ? 'الوصولات' : isEn ? 'Receipts & Payouts' : 'Quittances & Bailleurs'}
        secondaryActions={
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (leases[0]) setPrintPage(buildReceiptPrintPage(leases[0]));
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة كشف الحسابات' : 'Bordereau Bailleurs'}
          </AtriumButton>
        }
        primaryAction={{
          label: isAr ? 'حاسبة الموثق (08-243)' : 'Simulateur Notaire (08-243)',
          onClick: () => setIsNotaryModalOpen(true),
          icon: <Calculator size={15} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات التحصيل وعمولات الوكالة' : 'Encaissement des Loyers & Reversements Bailleurs'}
        language={language}
        primaryCard={{
          label: isAr ? 'إجمالي الإيجارات المحصلة' : 'Masse des Loyers Appelée',
          badgeText: isAr ? `${leases.length} وصل سارٍ` : `${leases.length} baux quittancés`,
          count: totalMonthlyRents,
          formatValue: (v) => formatMoney(v, language),
          tone: 'emerald',
          isActive: settlementFilter === 'loyers',
          onToggle: () => setSettlementFilter((prev) => (prev === 'loyers' ? 'all' : 'loyers')),
        }}
        secondaryCard={{
          label: isAr ? 'عمولة التسيير (10%)' : 'Honoraires Gestion Agence',
          badgeText: isAr ? 'إيراد الوكالة' : 'Revenu agence 10%',
          count: totalCommissions,
          formatValue: (v) => formatMoney(v, language),
          tone: 'terracotta',
          isActive: settlementFilter === 'commissions',
          onToggle: () => setSettlementFilter((prev) => (prev === 'commissions' ? 'all' : 'commissions')),
        }}
        darkCard={{
          label: isAr ? 'صافي مستحقات الملاك' : 'Reversements Net Bailleurs',
          badgeCount: settledBailleurIds.length,
          badgePrefix: '',
          badgeSuffix: isAr ? ' مسوى' : ' réglés',
          valueCount: netOwnerDisbursal,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'صافي التحويل البنكي بعد خصم العمولة' : 'Net propriétaire après prélèvement 10%',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل الوصولات ومستحقات الملاك' : 'Registre des Quittances & Règlements Bailleurs'}
          liveRegionText={`${sortedFinanceLeases.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالعقار، المستأجر...' : 'Rechercher bien, locataire, téléphone...'}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: leases.length },
            { value: 'loyers', label: isAr ? 'إيجارات' : 'Loyers', count: leases.filter((l) => l.status === 'Active').length },
            { value: 'reversements', label: isAr ? 'تحويلات' : 'Reversés', count: settledBailleurIds.length },
            { value: 'impayes', label: isAr ? 'متأخرات' : 'Impayés', count: leases.filter((l) => l.status !== 'Active').length },
          ]}
          statusValue={settlementFilter}
          onStatusChange={setSettlementFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedFinanceLeases}
          keyExtractor={(l) => l.id}
          defaultViewMode="list"
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isPinned={(l) => pinnedIds.has(l.id)}
          onTogglePin={handleTogglePin}
          openItemId={selectedLease?.id}
          onItemClick={(l, el) => {
            setSelectedLease(l);
            setDrawerOpenerEl(el || null);
            setInspectorTab('quittance');
          }}
          onViewDetails={(l, el) => {
            setSelectedLease(l);
            setDrawerOpenerEl(el || null);
            setInspectorTab('quittance');
          }}
          getRowMeta={(l): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(l, branchesById, currentBranch, language);
            const isSettled = settledBailleurIds.includes(l.id);
            return {
              title: l.propertyTitle,
              subline: `${l.tenantName} · ${l.tenantPhone}`,
              avatarText: (l.tenantName || 'QT').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: isAr ? 'وصل إيجار' : 'Quittance',
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(l.id),
              statusLabel: isSettled ? (isAr ? 'تم التحويل' : 'Reversé') : isAr ? 'بانتظار التحويل' : 'À reverser',
              statusVariant: isSettled ? 'active' : 'warning',
              metricPrimary: formatMoney(l.monthlyRentDzd, language),
              metricSecondary: `Net: ${formatMoney(l.monthlyRentDzd * 0.9, language)}`,
              detailCol1: { heading: isAr ? 'المستأجر' : 'Locataire', primaryText: l.tenantName },
              detailCol2: { heading: 'Com. 10%', primaryText: formatMoney(l.monthlyRentDzd * 0.1, language) },
              detailCol3: { heading: 'Net Bailleur', primaryText: formatMoney(l.monthlyRentDzd * 0.9, language) },
            };
          }}
          getFanActions={(l): KineticRowFanAction[] => {
            const isSettled = settledBailleurIds.includes(l.id);
            const list: KineticRowFanAction[] = [];
            if (!isSettled) {
              list.push({
                id: 'disburse',
                label: isAr ? 'تحويل للمالك' : 'Reverser',
                icon: <Send size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleDisburseToOwner(l);
                },
              });
            }
            list.push(
              {
                id: 'print',
                label: isAr ? 'طباعة' : 'Imprimer',
                icon: <Printer size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handlePrintQuittance(l);
                },
              },
              {
                id: 'inspect',
                label: isAr ? 'عرض' : 'Détails',
                icon: <Eye size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedLease(l);
                  setDrawerOpenerEl(e.currentTarget);
                  setInspectorTab('quittance');
                },
              }
            );
            return list;
          }}
          getDetailActions={(l): KineticDetailAction[] => {
            const isSettled = settledBailleurIds.includes(l.id);
            return [
              ...(!isSettled
                ? [
                    {
                      id: 'disburse',
                      label: isAr ? 'تحويل للمالك' : 'Reverser Bailleur',
                      icon: <Send size={14} />,
                      onClick: () => handleDisburseToOwner(l),
                    },
                  ]
                : []),
              {
                id: 'print',
                label: isAr ? 'طباعة Quittance' : 'Imprimer Quittance',
                icon: <Printer size={14} />,
                onClick: () => handlePrintQuittance(l),
              },
              {
                id: 'share',
                label: isAr ? 'مشاركة الوصل' : 'Partager Reçu',
                icon: <Share2 size={14} />,
                onClick: () => handleOpenShareReceipt(l),
              },
            ];
          }}
          emptyTitle={isAr ? 'لا توجد تسويات مطابقة' : 'Aucun règlement trouvé'}
          emptyDescription={isAr ? 'أعد ضبط المرشحات للعرض' : 'Réinitialisez les filtres pour afficher les quittances'}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedFinanceLeases.length}
        entityPluralLabel={isAr ? 'وصل' : 'quittances'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => setBranchFilter('All')}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(selectedLease)}
        item={selectedLease}
        allItems={sortedFinanceLeases}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedLease ? `Quittance · ${selectedLease.tenantName}` : ''}
        subtitle={selectedLease?.propertyTitle}
        avatarText={(selectedLease?.tenantName || 'QT').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={activeBranchInfo?.name}
        statusLabel={
          selectedLease && settledBailleurIds.includes(selectedLease.id)
            ? isAr ? 'تم التحويل' : 'Reversé'
            : isAr ? 'بانتظار التحويل' : 'À reverser'
        }
        statusClassName={
          selectedLease && settledBailleurIds.includes(selectedLease.id)
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'quittance', label: isAr ? 'الوصل والرسوم' : 'Quittance' },
          { id: 'caution', label: isAr ? 'عقد الإيجار والضمان' : 'Bail & Caution' },
          { id: 'reversement', label: isAr ? 'تحويل المالك' : 'Reversement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(l) => setSelectedLease(l)}
        onClose={() => setSelectedLease(null)}
        renderBody={(lease, tab) => {
          const isSettled = settledBailleurIds.includes(lease.id);
          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: isAr ? 'طباعة الوصل' : 'Imprimer',
                      icon: <Printer size={16} />,
                      primary: true,
                      onClick: () => handlePrintQuittance(lease),
                    },
                    {
                      id: 'disburse',
                      label: isSettled ? 'Reversé ✓' : 'Reverser Net',
                      icon: <Send size={16} />,
                      disabled: isSettled,
                      onClick: () => handleDisburseToOwner(lease),
                    },
                    {
                      id: 'share',
                      label: isAr ? 'مشاركة' : 'Partager',
                      icon: <Share2 size={16} />,
                      onClick: () => handleOpenShareReceipt(lease),
                    },
                  ]}
                />
              </InspectorSection>

              {tab === 'quittance' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'مبلغ الإيجار المحصل' : 'Loyer Mensuel Quittancé'}>
                    <InspectorBigStat
                      value={formatMoney(lease.monthlyRentDzd, language)}
                      tone="ok"
                      caption="Quittance de loyer délivrée au locataire valant décharge intégrale."
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'تفصيل التوزيع' : 'Détails de Répartition'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Bien loué" value={lease.propertyTitle} mono={false} />
                      <InspectorKeyValue label="Locataire" value={lease.tenantName} mono={false} />
                      <InspectorKeyValue label="Honoraires Agence (10%)" value={`-${formatMoney(lease.monthlyRentDzd * 0.1, language)}`} tone="warn" />
                      <InspectorKeyValue label="Solde Net Bailleur" value={formatMoney(lease.monthlyRentDzd * 0.9, language)} tone="ok" isLast />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'caution' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'الضمان المالي' : 'Dépôt de Garantie Séquestré'}>
                    <InspectorBigStat
                      value={formatMoney(lease.securityDepositDzd, language)}
                      tone="default"
                      caption={`${lease.paymentFrequency || lease.paymentCycle} · Échéance ${lease.endDate}`}
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'بيانات العقد' : 'Paramètres du Bail'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Périodicité" value={lease.paymentFrequency || lease.paymentCycle} mono={false} />
                      <InspectorKeyValue label="Date d'échéance" value={lease.endDate} isLast />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'reversement' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'أمر التحويل للمالك' : 'Ordre de Virement Propriétaire'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Bénéficiaire" value={lease.ownerName || 'Propriétaire du bien'} mono={false} />
                      <InspectorKeyValue label="Montant Net" value={formatMoney(lease.monthlyRentDzd * 0.9, language)} tone="ok" />
                      <InspectorKeyValue label="Statut" value={isSettled ? 'Virement exécuté' : 'En attente de virement'} mono={false} tone={isSettled ? 'ok' : 'warn'} isLast />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={2}>
                    <InspectorWideButton
                      label={isSettled ? 'Virement Exécuté ✓' : 'Reverser le Net Bailleur'}
                      icon={<Send size={15} />}
                      tone="accent"
                      disabled={isSettled}
                      onClick={() => handleDisburseToOwner(lease)}
                    />
                  </InspectorSection>
                </>
              )}
            </div>
          );
        }}
      />

      <ScreenPod>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="t-pod font-semibold text-black dark:text-white">
              {isAr ? 'دفتر حسابات الملاك (التحويلات والخصومات)' : isEn ? 'Owner Ledger Entries' : 'Grand Livre Bailleurs (Reversements & Débits Travaux)'}
            </h3>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{ownerLedger.length}</span>
          </div>
          {ownerLedger.length > 0 && (
            <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
              <table className="w-full text-left rtl:text-right t-cap">
                <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                  <tr>
                    <th className="py-2 px-3">{isAr ? 'المرجع' : 'Réf'}</th>
                    <th className="py-2 px-3">{isAr ? 'المالك' : 'Bailleur'}</th>
                    <th className="py-2 px-3">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="py-2 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2 px-3 text-right">{isAr ? 'المبلغ' : 'Montant'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                  {ownerLedger.slice(0, 10).map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 px-3 font-semibold text-black dark:text-white">{entry.reference}</td>
                      <td className="py-2 px-3 text-black/80 dark:text-white/80">{entry.ownerName}</td>
                      <td className="py-2 px-3">{entry.entryType}</td>
                      <td className="py-2 px-3 text-black/60 dark:text-white/60">{entry.entryDate}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${entry.entryType === 'MaintenanceDebit' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {entry.entryType === 'MaintenanceDebit' ? '-' : ''}
                        {formatMoney(entry.amountDzd, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScreenPod>

      <NotarySimulatorModal isOpen={isNotaryModalOpen} onClose={() => setIsNotaryModalOpen(false)} />

      <ShareArtifactModal
        isOpen={Boolean(sharePayload)}
        onClose={() => setSharePayload(null)}
        language={language as 'fr' | 'en' | 'ar'}
        title={sharePayload?.title || ''}
        subtitle={sharePayload?.subtitle}
        shareText={sharePayload?.text || ''}
        onOpenPrintPdf={sharePayload ? () => setPrintPage(sharePayload.printPage) : undefined}
      />

      <PrintSheetModal
        isOpen={Boolean(printPage)}
        onClose={() => setPrintPage(null)}
        language={language}
        format="a4"
        title={printPage?.title || 'Quittance'}
        subtitle={printPage?.subtitle}
        pages={printPage ? [printPage] : []}
      />
    </div>
  );
};
