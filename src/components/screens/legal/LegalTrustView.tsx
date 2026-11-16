import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Scale,
  CreditCard,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Lock,
  Unlock,
  Building2,
  X,
  FileCheck,
  Plus,
  AlertTriangle,
  Key,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import {
  LegalMatter,
  EscrowAccount,
  SCFJournalEntry,
  CashReceipt,
} from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  canReleaseEscrow,
  validateAndBalanceSCFEntry,
  calculateArticle317Stamp,
} from '../../../utils/legalRules';
import { CashClosureModal } from '../../modals/CashClosureModal';
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

const extractStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as { target?: { value?: unknown }; value?: unknown };
    if (obj.target?.value !== undefined) return String(obj.target.value);
    if (obj.value !== undefined) return String(obj.value);
  }
  return String(v ?? '');
};

export const LegalTrustView: React.FC<any> = () => {
  const {
    language,
    activeLegalRole,
    currentBusiness,
    currentBranch,
    currentUser,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    matters,
    updateMatter,
    escrowAccounts,
    updateEscrowAccount,
    scfEntries,
    addSCFEntry,
    cashReceipts,
    addCashReceipt,
    dailyClosure,
    updateDailyClosure,
  } = useLegalData();

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  // Shared Collection States
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  // Role-specific Filters & Drawers
  const [escrowLockFilter, setEscrowLockFilter] = useState<string>('All');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowAccount | null>(null);
  const [escrowTab, setEscrowTab] = useState<string>('double_lock');
  const [cadastralVolume, setCadastralVolume] = useState('');
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [notaryPin, setNotaryPin] = useState('');
  const [releaseAmount, setReleaseAmount] = useState(0);

  const [scfJournalFilter, setScfJournalFilter] = useState<string>('ALL');
  const [selectedSCFEntry, setSelectedSCFEntry] = useState<SCFJournalEntry | null>(null);
  const [scfTab, setScfTab] = useState<string>('lignes');
  const [isSCFModalOpen, setIsSCFModalOpen] = useState(false);
  const [scfLibelle, setScfLibelle] = useState('');
  const [scfJournal, setScfJournal] = useState<SCFJournalEntry['journalCode']>('VE');
  const [scfRefPiece, setScfRefPiece] = useState('');
  const [scfDebitAmount, setScfDebitAmount] = useState(100000);
  const [scfTvaRate, setScfTvaRate] = useState(19);

  const [receiptMethodFilter, setReceiptMethodFilter] = useState<string>('All');
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(null);
  const [receiptTab, setReceiptTab] = useState<string>('quittance');
  const [receiptClientName, setReceiptClientName] = useState('');
  const [receiptMatterTitle, setReceiptMatterTitle] = useState('');
  const [receiptAmountHt, setReceiptAmountHt] = useState(50000);

  const [carpaFilter, setCarpaFilter] = useState<string>('All');
  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [carpaTab, setCarpaTab] = useState<string>('sequestre');

  // Keep open inspector record synced with updates
  const activeEscrow = useMemo(() => {
    if (!selectedEscrow) return null;
    return escrowAccounts.find((a) => a.id === selectedEscrow.id) || selectedEscrow;
  }, [selectedEscrow, escrowAccounts]);

  const activeScfEntry = useMemo(() => {
    if (!selectedSCFEntry) return null;
    return scfEntries.find((e) => e.id === selectedSCFEntry.id) || selectedSCFEntry;
  }, [selectedSCFEntry, scfEntries]);

  const activeReceipt = useMemo(() => {
    if (!selectedReceipt) return null;
    return cashReceipts.find((r) => r.id === selectedReceipt.id) || selectedReceipt;
  }, [selectedReceipt, cashReceipts]);

  const activeCarpaMatter = useMemo(() => {
    if (!selectedMatter) return null;
    return matters.find((m) => m.id === selectedMatter.id) || selectedMatter;
  }, [selectedMatter, matters]);

  const currentDataset: readonly any[] =
    activeLegalRole === 'notaire_titulaire'
      ? escrowAccounts
      : activeLegalRole === 'expert_comptable'
      ? scfEntries
      : activeLegalRole === 'secretaire_caisse'
      ? cashReceipts
      : matters;

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    currentDataset.forEach((item) => {
      const b = resolveRecordBranch(item, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [currentDataset, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: currentDataset.length },
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
        count: branchCounts.get(currentBranch.id) || currentDataset.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, currentDataset.length, isAr, isEn]);

  // Handlers
  const handleVerifyCadastre = () => {
    if (!activeEscrow) return;
    if (!cadastralVolume.trim() || !cadastralNumber.trim()) {
      showToast(
        isAr
          ? 'يرجى إدخال رقم المجلد ورقم الشهر العقاري'
          : 'Veuillez saisir le volume et numéro de conservation',
        'error'
      );
      return;
    }
    const updated: EscrowAccount = {
      ...activeEscrow,
      cadastralClearanceProof: {
        volume: cadastralVolume.trim(),
        number: cadastralNumber.trim(),
        recordedAt: new Date().toISOString().split('T')[0],
      },
    };
    updateEscrowAccount(updated);
    setSelectedEscrow(updated);
    showToast(
      isAr
        ? `تم التحقق وتثبيت الإشهار العقاري (${cadastralVolume} / ${cadastralNumber})`
        : `Publicité foncière validée : ${cadastralVolume} ${cadastralNumber}`,
      'success'
    );
  };

  const handleExecuteDoubleLockRelease = () => {
    if (!activeEscrow) return;
    const amountToRelease =
      releaseAmount > 0 ? releaseAmount : activeEscrow.currentBalanceDzd;
    const hasClearance = Boolean(activeEscrow.cadastralClearanceProof?.volume);
    const validation = canReleaseEscrow(
      activeEscrow.currentBalanceDzd,
      amountToRelease,
      hasClearance,
      notaryPin,
      '2026'
    );
    if (!validation.allowed) {
      showToast(
        validation.reason || (isAr ? 'فشل فك الحراسة' : 'Déblocage refusé'),
        'error'
      );
      return;
    }
    const newTx = {
      id: `tx_${Date.now()}`,
      escrowAccountId: activeEscrow.id,
      date: new Date().toISOString().split('T')[0],
      type: 'seller_final_payout' as const,
      amountDzd: amountToRelease,
      paymentMode: 'virement_bancaire' as const,
      bankReference: `VIR-NOT-${Math.floor(1000 + Math.random() * 9000)}`,
      authorizedByStaff: 'Me Notaire Titulaire',
      notes: `Déblocage de séquestre post-publicité foncière (${activeEscrow.cadastralClearanceProof?.volume})`,
    };
    const newBalance = activeEscrow.currentBalanceDzd - amountToRelease;
    const updated: EscrowAccount = {
      ...activeEscrow,
      currentBalanceDzd: newBalance,
      totalDisbursedDzd: activeEscrow.totalDisbursedDzd + amountToRelease,
      isLocked: newBalance > 0,
      transactions: [newTx, ...activeEscrow.transactions],
    };
    updateEscrowAccount(updated);
    setSelectedEscrow(updated);
    setNotaryPin('');
    showToast(
      isAr
        ? `تم فك القفل المزدوج وتحويل ${formatMoney(amountToRelease, language)}`
        : `Double-verrou validé : ${formatMoney(amountToRelease, language)} transférés`,
      'success'
    );
  };

  const handleSaveSCFEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scfLibelle.trim()) {
      showToast(
        isAr ? 'يرجى إدخال البيان' : "Veuillez saisir le libellé de l'écriture",
        'error'
      );
      return;
    }
    const baseAmount = Number(scfDebitAmount) || 0;
    const tvaAmount = Math.round(baseAmount * (scfTvaRate / 100));
    const totalTtc = baseAmount + tvaAmount;
    const lines = [
      {
        id: `l_${Date.now()}_1`,
        accountNumber: '411000',
        accountLabel: 'Clients - Créances sur prestations',
        debitDzd: totalTtc,
        creditDzd: 0,
      },
      {
        id: `l_${Date.now()}_2`,
        accountNumber: '706000',
        accountLabel: 'Prestations de services juridiques/audit',
        debitDzd: 0,
        creditDzd: baseAmount,
      },
      {
        id: `l_${Date.now()}_3`,
        accountNumber: '445700',
        accountLabel: 'TVA collectée sur prestations (19%)',
        debitDzd: 0,
        creditDzd: tvaAmount,
      },
    ];
    const balancing = validateAndBalanceSCFEntry(lines);
    if (!balancing.isBalanced) {
      showToast(balancing.error || "Erreur d'équilibrage", 'error');
      return;
    }
    const newEntry: SCFJournalEntry = {
      id: `scf_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      entryNumber: `EC-2026-${Math.floor(500 + Math.random() * 500)}`,
      journalCode: scfJournal,
      date: new Date().toISOString().split('T')[0],
      pieceJustificativeRef:
        scfRefPiece.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
      libelle: scfLibelle.trim(),
      lines,
      totalDebitDzd: balancing.totalDebitDzd,
      totalCreditDzd: balancing.totalCreditDzd,
      isBalanced: true,
      status: 'validated',
    };
    addSCFEntry(newEntry);
    setSelectedSCFEntry(newEntry);
    setIsSCFModalOpen(false);
    setScfLibelle('');
    showToast(
      isAr
        ? `تم تسجيل وترحيل القيد المحاسبي SCF رقم ${newEntry.entryNumber}`
        : `Écriture SCF ${newEntry.entryNumber} équilibrée et validée au Grand Livre`,
      'success'
    );
  };

  const handleSaveCashReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptClientName.trim()) {
      showToast(
        isAr ? 'يرجى إدخال اسم الموكل' : 'Veuillez saisir le nom du client',
        'error'
      );
      return;
    }
    const ht = Number(receiptAmountHt) || 0;
    const tva = Math.round(ht * 0.19);
    const ttc = ht + tva;
    const stamp = calculateArticle317Stamp(ttc, 'especes');
    const netCollected = ttc + stamp;
    const newRc: CashReceipt = {
      id: `cr_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      receiptNumber: `RC-2026-${Math.floor(200 + Math.random() * 800)}`,
      clientName: receiptClientName.trim(),
      matterTitle: receiptMatterTitle.trim() || 'Provision sur honoraires et diligences',
      totalHtDzd: ht,
      tvaDzd: tva,
      paymentMethod: 'especes',
      timbreFiscalDzd: stamp,
      netCollectedDzd: netCollected,
      cashierName: 'Samia Khelifa (Secrétaire)',
      createdAt: new Date().toISOString(),
    };
    addCashReceipt(newRc);
    setSelectedReceipt(newRc);
    setIsNewReceiptModalOpen(false);
    setReceiptClientName('');
    setReceiptMatterTitle('');
    showToast(
      isAr
        ? `تم استلام ${formatMoney(newRc.netCollectedDzd, language)} نقداً`
        : `Encaissement espèces enregistré : ${formatMoney(newRc.netCollectedDzd, language)}`,
      'success'
    );
  };

  const handleReleaseTrustFunds = useCallback(
    (matter: LegalMatter) => {
      if (!matter.trustEscrowBalanceDzd || matter.trustEscrowBalanceDzd === 0) {
        showToast(
          isAr ? 'لا يوجد رصيد ودائع متبقي في هذا الحساب' : 'Aucun fond séquestre à débloquer',
          'info'
        );
        return;
      }
      const amount = matter.trustEscrowBalanceDzd;
      const updated: LegalMatter = {
        ...matter,
        trustEscrowBalanceDzd: 0,
      };
      updateMatter(updated);
      if (selectedMatter?.id === matter.id) setSelectedMatter(updated);
      showToast(
        isAr
          ? `تم الإفراج عن الوديعة (${formatMoney(amount, language)})`
          : `Déblocage des fonds séquestre (${formatMoney(amount, language)}) validé par CARPA`,
        'success'
      );
    },
    [isAr, language, selectedMatter, updateMatter]
  );

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setBranchFilter('All');
    setEscrowLockFilter('All');
    setScfJournalFilter('ALL');
    setReceiptMethodFilter('All');
    setCarpaFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (activeLegalRole === 'notaire_titulaire' && escrowLockFilter !== 'All') {
      chips.push({
        key: 'lock',
        label: escrowLockFilter,
        onRemove: () => setEscrowLockFilter('All'),
      });
    }
    if (activeLegalRole === 'expert_comptable' && scfJournalFilter !== 'ALL') {
      chips.push({
        key: 'journal',
        label: scfJournalFilter,
        onRemove: () => setScfJournalFilter('ALL'),
      });
    }
    if (activeLegalRole === 'secretaire_caisse' && receiptMethodFilter !== 'All') {
      chips.push({
        key: 'method',
        label: receiptMethodFilter,
        onRemove: () => setReceiptMethodFilter('All'),
      });
    }
    if (
      activeLegalRole !== 'notaire_titulaire' &&
      activeLegalRole !== 'expert_comptable' &&
      activeLegalRole !== 'secretaire_caisse' &&
      carpaFilter !== 'All'
    ) {
      chips.push({
        key: 'carpa',
        label: carpaFilter,
        onRemove: () => setCarpaFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const lbl = branchOptions.find((o) => o.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: lbl,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [
    activeLegalRole,
    escrowLockFilter,
    scfJournalFilter,
    receiptMethodFilter,
    carpaFilter,
    branchFilter,
    branchOptions,
  ]);

  const hasAnyFilters = Boolean(searchQuery.trim()) || activeChips.length > 0;
  const activeAdvancedCount = activeChips.length;

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: escrowAccounts.length > 0 || matters.length > 0,
  });

  if (
    showSkeleton &&
    ((escrowAccounts.length === 0 && matters.length === 0) || networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
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

  // =========================================================
  // PERSONA 1: NOTAIRE TITULAIRE (ESCROW DOUBLE-LOCK)
  // =========================================================
  if (activeLegalRole === 'notaire_titulaire') {
    const totalEscrowDeposited = escrowAccounts.reduce((acc, a) => acc + a.totalDepositedDzd, 0);
    const totalEscrowBalance = escrowAccounts.reduce((acc, a) => acc + a.currentBalanceDzd, 0);
    const lockedEscrowsCount = escrowAccounts.filter((a) => a.isLocked).length;

    const filteredEscrows = escrowAccounts
      .filter((a) => {
        if (escrowLockFilter === 'Locked' && !a.isLocked) return false;
        if (escrowLockFilter === 'Released' && a.isLocked) return false;
        if (branchFilter !== 'All') {
          const b = resolveRecordBranch(a, branchesById, currentBranch, language);
          if ((b.id || b.name) !== branchFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !a.matterReference.toLowerCase().includes(q) &&
            !a.clientName.toLowerCase().includes(q) &&
            !a.beneficiaryName.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'branch') {
          cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
            resolveRecordBranch(b, branchesById, currentBranch, language).name
          );
        } else if (sortBy === 'balance') {
          cmp = a.currentBalanceDzd - b.currentBalanceDzd;
        } else {
          cmp = a.matterReference.localeCompare(b.matterReference);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

    const escrowColumns: ColumnDefinition<EscrowAccount>[] = [
      {
        key: 'matterReference',
        header: isAr ? 'رقم الملف' : 'Réf Dossier',
        width: '1.5*',
        sortable: true,
        renderCell: (a) => (
          <div className="font-mono font-bold text-xs text-[#d4522f]">{a.matterReference}</div>
        ),
      },
      {
        key: 'parties',
        header: isAr ? 'المشتري ➔ البائع المستفيد' : 'Acquéreur ➔ Vendeur',
        width: '2.6*',
        renderCell: (a) => (
          <div className="text-xs min-w-0">
            <span className="font-bold text-black dark:text-white block truncate">
              {a.clientName}
            </span>
            <span className="text-[11px] text-black/55 dark:text-white/55 truncate block">
              ➔ {a.beneficiaryName}
            </span>
          </div>
        ),
      },
      {
        key: 'balance',
        header: isAr ? 'الرصيد المحجوز' : 'Solde Séquestre',
        width: '1.7*',
        sortable: true,
        renderCell: (a) => (
          <div className="font-mono text-xs font-bold text-[#d4522f] tabular-nums">
            {formatMoney(a.currentBalanceDzd, language)}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche',
        width: '1.6*',
        sortable: true,
        renderCell: (a) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
            <span className="truncate">
              {resolveRecordBranch(a, branchesById, currentBranch, language).name}
            </span>
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة القفل' : 'Verrou & Cadastre',
        width: '1.6*',
        renderCell: (a) => (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
              a.isLocked
                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {a.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
            {a.isLocked ? (isAr ? 'مقفل' : 'Verrouillé') : isAr ? 'محرر' : 'Libéré'}
          </span>
        ),
      },
    ];

    const escrowFilters: KineticFilterSection[] = [
      {
        id: 'lockStatus',
        label: isAr ? 'حالة القفل العقاري' : 'Statut Double-Verrou',
        value: escrowLockFilter,
        onChange: setEscrowLockFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'Locked', label: isAr ? 'مقفل' : 'Verrouillés' },
          { value: 'Released', label: isAr ? 'محرر' : 'Libérés' },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <ScreenHeaderBar
          icon={<Lock size={22} />}
          title={isAr ? 'الودائع' : isEn ? 'Escrow' : 'Séquestre'}
          subtitle={
            isAr
              ? 'حسابات الودائع العقارية مع نظام القفل المزدوج الإلزامي'
              : 'Séquestre notarial · Double-Verrou Obligatoire (Cadastre + PIN)'
          }
          secondaryActions={
            <AtriumButton
              variant="outline"
              onClick={() => {
                showToast(
                  isAr ? 'طباعة كشف الودائع العقارية' : 'Relevé des comptes séquestres imprimé',
                  'info'
                );
                window.print();
              }}
              icon={<Printer size={14} />}
            >
              {isAr ? 'طباعة السجل' : 'Imprimer Registre'}
            </AtriumButton>
          }
        />

        <ScreenKpiBanner
          heading={
            isAr
              ? 'مؤشرات حسابات الودائع والحراسة العقارية'
              : 'Fonds Mandants & Prix de Vente Séquestrés'
          }
          language={language}
          primaryCard={{
            label: isAr ? 'إجمالي الودائع المودعة' : 'Total Fonds Consignés',
            badgeText: isAr ? 'محرر ومفرج' : 'Libérés',
            count: totalEscrowDeposited,
            formatValue: (v) => formatMoney(v, language),
            isActive: escrowLockFilter === 'Released',
            onToggle: () =>
              setEscrowLockFilter((p) => (p === 'Released' ? 'All' : 'Released')),
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'بانتظار الإشهار العقاري' : 'En Attente Publicité Foncière',
            badgeText: isAr ? 'حساب مقفل' : 'verrouillés',
            count: lockedEscrowsCount,
            isActive: escrowLockFilter === 'Locked',
            onToggle: () =>
              setEscrowLockFilter((p) => (p === 'Locked' ? 'All' : 'Locked')),
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'الرصيد المحمي تحت الحراسة' : 'Solde Séquestre Actuel',
            badgeCount: escrowAccounts.length,
            badgePrefix: '',
            badgeSuffix: isAr ? 'حساب' : 'mandats',
            valueCount: totalEscrowBalance,
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'حساب مصرفي مخصص مستقل' : 'Sous-compte Trésor séparé',
          }}
        />

        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr ? 'سجل حسابات الحراسة العقارية' : 'Registre des Comptes Séquestres Immobiliers'
            }
            liveRegionText={`${filteredEscrows.length}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr
                ? 'بحث برقم الملف، المشتري أو البائع...'
                : 'Rechercher dossier, acheteur, vendeur...'
            }
            statusOptions={[
              { value: 'All', label: isAr ? 'الكل' : 'Tous' },
              { value: 'Locked', label: isAr ? 'مقفل' : 'Verrouillés' },
              { value: 'Released', label: isAr ? 'محرر' : 'Libérés' },
            ]}
            statusValue={escrowLockFilter}
            onStatusChange={setEscrowLockFilter}
            hasActiveAdvancedFilters={activeAdvancedCount > 0}
            activeFiltersCount={activeAdvancedCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={() => {
              downloadCsvSafe(
                'atrium-notary-escrow.csv',
                ['Réf Dossier', 'Acquéreur', 'Vendeur', 'Solde DZD', 'Statut', 'Branche'],
                filteredEscrows.map((a) => [
                  a.matterReference,
                  a.clientName,
                  a.beneficiaryName,
                  a.currentBalanceDzd,
                  a.isLocked ? 'Verrouillé' : 'Libéré',
                  resolveRecordBranch(a, branchesById, currentBranch, language).name,
                ])
              );
              showToast(isAr ? 'تم تصدير السجل' : 'Export CSV généré', 'success');
            }}
            activeChips={activeChips}
            onResetAllFilters={resetAllFilters}
          />

          <UniversalDataCollection<EscrowAccount>
            hideToolbar
            data={filteredEscrows}
            keyExtractor={(a) => a.id}
            defaultViewMode={viewMode}
            columns={escrowColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            openItemId={activeEscrow?.id ?? null}
            onItemClick={(a, el) => {
              setSelectedEscrow(a);
              setDrawerOpenerEl(el || null);
            }}
            onViewDetails={(a, el) => {
              setSelectedEscrow(a);
              setDrawerOpenerEl(el || null);
            }}
            customActions={(a) => [
              {
                id: 'double_lock',
                label: isAr ? 'فك القفل المزدوج' : 'Double-Verrou',
                icon: <Unlock size={14} />,
                onClick: () => {
                  setSelectedEscrow(a);
                  setEscrowTab('double_lock');
                },
              },
              {
                id: 'virement',
                label: isAr ? 'أمر تحويل بنكي' : 'Ordre Virement',
                icon: <Printer size={14} />,
                onClick: () => {
                  setSelectedEscrow(a);
                  setEscrowTab('virement');
                },
              },
            ]}
            renderCard={(a) => (
              <div className="space-y-2.5 text-left rtl:text-right">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {a.matterReference}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      a.isLocked
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {a.isLocked ? 'Verrouillé' : 'Libéré'}
                  </span>
                </div>
                <div className="text-xs font-bold text-black dark:text-white truncate">
                  {a.clientName}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                  ➔ {a.beneficiaryName}
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 font-mono text-xs font-bold text-[#d4522f]">
                  {formatMoney(a.currentBalanceDzd, language)}
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد حسابات حراسة' : 'Aucun compte séquestre'}
            emptyDescription={
              isAr ? 'أعد ضبط المرشحات لعرض جميع الحسابات.' : 'Réinitialisez les filtres actifs.'
            }
            hasActiveFilters={hasAnyFilters}
            onResetFilters={resetAllFilters}
          />
        </ScreenPod>

        <KineticFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          triggerRef={filterButtonRef}
          language={language}
          displayCount={filteredEscrows.length}
          entityPluralLabel={isAr ? 'حساب' : 'séquestres'}
          hasActiveFilters={hasAnyFilters}
          onResetFilters={resetAllFilters}
          sections={escrowFilters}
        />

        <KineticSlideOverInspector<EscrowAccount>
          isOpen={Boolean(activeEscrow)}
          item={activeEscrow}
          allItems={filteredEscrows}
          keyExtractor={(a) => a.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={activeEscrow?.matterReference || ''}
          subtitle={`${activeEscrow?.clientName || ''} ➔ ${activeEscrow?.beneficiaryName || ''}`}
          avatarText="SQ"
          branchName={
            activeEscrow
              ? resolveRecordBranch(activeEscrow, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel={activeEscrow?.isLocked ? 'Verrouillé 🔒' : 'Libéré 🔓'}
          tabs={[
            { id: 'double_lock', label: isAr ? 'القفل المزدوج' : 'Double-Verrou' },
            { id: 'transactions', label: isAr ? 'المعاملات' : 'Historique' },
            { id: 'virement', label: isAr ? 'أمر التحويل' : 'Ordre Virement' },
          ]}
          activeTab={escrowTab}
          onTabChange={setEscrowTab}
          onSelectItem={(a) => setSelectedEscrow(a)}
          onClose={() => setSelectedEscrow(null)}
          renderBody={(esc, tab) => {
            if (tab === 'transactions') {
              return (
                <div className="space-y-3 text-xs">
                  <span className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider block">
                    Mouvements Bancaires & Trésor
                  </span>
                  {esc.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1 bg-white dark:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[10px] text-black/55 dark:text-white/55">
                          {tx.date}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            tx.type === 'deposit_received'
                              ? 'text-emerald-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {tx.type === 'deposit_received' ? '+' : '-'}{' '}
                          {formatMoney(tx.amountDzd, language)}
                        </span>
                      </div>
                      <p className="text-xs text-black dark:text-white font-medium">{tx.notes}</p>
                      <div className="text-[10px] text-black/55 dark:text-white/55 flex items-center justify-between">
                        <span>Mode : {tx.paymentMode}</span>
                        <span className="font-mono">{tx.bankReference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (tab === 'virement') {
              return (
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3 text-xs">
                  <div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="font-bold uppercase tracking-wider text-[#d4522f] block">
                      Étude Notariale · Ordre de Virement Séquestre
                    </span>
                    <span className="text-[10px] text-black/55 dark:text-white/55">
                      République Algérienne Démocratique et Populaire
                    </span>
                  </div>
                  <div className="space-y-1.5 text-black/75 dark:text-white/80">
                    <div>
                      <strong>Donneur d'ordre :</strong> Maître Notaire Titulaire
                    </div>
                    <div>
                      <strong>Compte débité :</strong> Compte Séquestre Trésor BNA N° 0010 0987 6543
                    </div>
                    <div>
                      <strong>Bénéficiaire :</strong> {esc.beneficiaryName}
                    </div>
                    <div>
                      <strong>Montant :</strong>{' '}
                      <span className="font-mono font-bold text-black dark:text-white">
                        {formatMoney(esc.currentBalanceDzd, language)}
                      </span>
                    </div>
                    <div>
                      <strong>Motif :</strong> Vente immobilière dossier {esc.matterReference}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-no-liquid="true"
                    onClick={() => {
                      showToast(
                        isAr
                          ? 'جاري طباعة أمر التحويل الرسمي'
                          : 'Ordre de virement officiel imprimé',
                        'info'
                      );
                      window.print();
                    }}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    {isAr ? 'طباعة أمر التحويل' : 'Imprimer le Virement'}
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2">
                  <div className="flex items-center justify-between text-white/80 text-[11px]">
                    <span>Solde Sous Séquestre Notarial</span>
                    <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {esc.isLocked ? 'Verrouillé 🔒' : 'Prêt / Libéré 🔓'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                    {formatMoney(esc.currentBalanceDzd, language)}
                  </div>
                  <p className="text-[10px] text-white/75">
                    Bénéficiaire désigné : {esc.beneficiaryName}
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                      <Building2 size={14} className="text-[#d4522f]" />
                      {isAr
                        ? 'الشرط الأول: الإشهار بالمحافظة العقارية'
                        : 'Verrou 1 : Publicité Foncière'}
                    </span>
                    {esc.cadastralClearanceProof?.volume ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {isAr ? 'تم التحقق' : 'Conforme'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600">En attente</span>
                    )}
                  </div>

                  {esc.cadastralClearanceProof?.volume ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 space-y-1">
                      <div className="font-mono text-xs font-bold">
                        Volume : {esc.cadastralClearanceProof.volume} · Numéro :{' '}
                        {esc.cadastralClearanceProof.number}
                      </div>
                      <div className="text-[10px]">
                        Date d'enregistrement : {esc.cadastralClearanceProof.recordedAt}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <LabelInput
                          label={isAr ? 'رقم المجلد *' : 'Volume *'}
                          placeholder="Vol. 418"
                          value={cadastralVolume}
                          onChange={(e) => setCadastralVolume(e.target.value)}
                        />
                        <LabelInput
                          label={isAr ? 'رقم الشهر *' : 'Numéro *'}
                          placeholder="N° 22"
                          value={cadastralNumber}
                          onChange={(e) => setCadastralNumber(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        data-no-liquid="true"
                        onClick={handleVerifyCadastre}
                        className="w-full py-2 rounded-lg bg-[#d4522f] text-white font-bold text-xs hover:bg-[#b03b1b] transition-colors cursor-pointer"
                      >
                        {isAr ? 'تأكيد الإشهار العقاري' : 'Valider la Publicité'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                    <Key size={14} className="text-[#d4522f]" />
                    {isAr
                      ? 'الشرط الثاني: رمز الأمان للموثق Titulaire'
                      : 'Verrou 2 : Code PIN Notaire Titulaire'}
                  </span>
                  <div className="space-y-2">
                    <LabelInput
                      label={
                        isAr
                          ? 'رمز الأمان PIN (الافتراضي: 2026)'
                          : 'Code PIN Notaire (Défaut: 2026)'
                      }
                      type="password"
                      placeholder="••••"
                      value={notaryPin}
                      onChange={(e) => setNotaryPin(e.target.value)}
                    />
                    <LabelInput
                      label={
                        isAr
                          ? 'مبلغ الإفراج (DZD)'
                          : 'Montant à Débloquer (DZD)'
                      }
                      type="number"
                      placeholder={esc.currentBalanceDzd.toString()}
                      value={releaseAmount || ''}
                      onChange={(e) => setReleaseAmount(Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    data-no-liquid="true"
                    onClick={handleExecuteDoubleLockRelease}
                    disabled={esc.currentBalanceDzd <= 0}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    <Unlock size={14} />
                    {isAr
                      ? 'فك القفل المزدوج وإصدار أمر التحويل'
                      : 'Débloquer & Émettre Virement'}
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }

  // =========================================================
  // PERSONA 2: EXPERT COMPTABLE (SCF LEDGER)
  // =========================================================
  if (activeLegalRole === 'expert_comptable') {
    const totalDebitAll = scfEntries.reduce((acc, e) => acc + e.totalDebitDzd, 0);
    const totalCreditAll = scfEntries.reduce((acc, e) => acc + e.totalCreditDzd, 0);
    const isLedgerBalanced = Math.abs(totalDebitAll - totalCreditAll) === 0;

    const filteredEntries = scfEntries
      .filter((e) => {
        if (scfJournalFilter !== 'ALL' && e.journalCode !== scfJournalFilter) return false;
        if (branchFilter !== 'All') {
          const b = resolveRecordBranch(e, branchesById, currentBranch, language);
          if ((b.id || b.name) !== branchFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !e.entryNumber.toLowerCase().includes(q) &&
            !e.libelle.toLowerCase().includes(q) &&
            !e.pieceJustificativeRef.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'branch') {
          cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
            resolveRecordBranch(b, branchesById, currentBranch, language).name
          );
        } else if (sortBy === 'debit') {
          cmp = a.totalDebitDzd - b.totalDebitDzd;
        } else if (sortBy === 'credit') {
          cmp = a.totalCreditDzd - b.totalCreditDzd;
        } else {
          cmp = a.entryNumber.localeCompare(b.entryNumber);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

    const scfColumns: ColumnDefinition<SCFJournalEntry>[] = [
      {
        key: 'entryNumber',
        header: isAr ? 'رقم القيد' : 'N° Écriture',
        width: '1.5*',
        sortable: true,
        renderCell: (e) => (
          <div className="font-mono font-bold text-xs text-[#d4522f]">{e.entryNumber}</div>
        ),
      },
      {
        key: 'journal',
        header: 'Jrn',
        width: '0.8*',
        renderCell: (e) => (
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-black/75 dark:text-white/80">
            {e.journalCode}
          </span>
        ),
      },
      {
        key: 'libelle',
        header: isAr ? 'البيان والمرجع' : 'Libellé & Justificatif',
        width: '2.8*',
        renderCell: (e) => (
          <div className="min-w-0">
            <span className="font-bold text-xs text-black dark:text-white block truncate">
              {e.libelle}
            </span>
            <span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
              Réf: {e.pieceJustificativeRef} · {e.date}
            </span>
          </div>
        ),
      },
      {
        key: 'debit',
        header: isAr ? 'المدين' : 'Débit',
        width: '1.5*',
        sortable: true,
        renderCell: (e) => (
          <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {formatMoney(e.totalDebitDzd, language)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.5*',
        sortable: true,
        renderCell: (e) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
            <span className="truncate">
              {resolveRecordBranch(e, branchesById, currentBranch, language).name}
            </span>
          </span>
        ),
      },
    ];

    const scfFilters: KineticFilterSection[] = [
      {
        id: 'journal',
        label: isAr ? 'دفتر اليومية' : 'Journal Comptable',
        value: scfJournalFilter,
        onChange: setScfJournalFilter,
        resetValue: 'ALL',
        kind: 'segmented',
        options: [
          { value: 'ALL', label: isAr ? 'الكل' : 'Tous' },
          { value: 'VE', label: 'VE' },
          { value: 'CA', label: 'CA' },
          { value: 'BQ', label: 'BQ' },
          { value: 'OD', label: 'OD' },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <ScreenHeaderBar
          icon={<Scale size={22} />}
          title={isAr ? 'المحاسبة' : isEn ? 'Ledger' : 'Comptabilité'}
          subtitle={
            isAr
              ? 'النظام المحاسبي المالي SCF · القيد المزدوج المتوازن'
              : 'Plan Comptable National SCF 07-11 · Partie Double Équilibrée'
          }
          primaryAction={{
            label: isAr ? 'قيد محاسبي جديد' : 'Nouvelle Écriture SCF',
            onClick: () => setIsSCFModalOpen(true),
          }}
        />

        <ScreenKpiBanner
          heading={
            isAr
              ? 'المؤشرات المحاسبية وميزان المراجعة'
              : 'Balance des Écritures & Conformité SCF'
          }
          language={language}
          primaryCard={{
            label: isAr ? 'إجمالي حركات المدين (Débit)' : 'Total Mouvements Débit',
            badgeText: `${scfEntries.length} ${isAr ? 'قيد' : 'écritures'}`,
            count: totalDebitAll,
            formatValue: (v) => formatMoney(v, language),
            isActive: scfJournalFilter === 'VE',
            onToggle: () => setScfJournalFilter((p) => (p === 'VE' ? 'ALL' : 'VE')),
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'إجمالي حركات الدائن (Crédit)' : 'Total Mouvements Crédit',
            badgeText: isLedgerBalanced ? 'Δ = 0 DZD' : 'Écart',
            count: totalCreditAll,
            formatValue: (v) => formatMoney(v, language),
            isActive: scfJournalFilter === 'CA',
            onToggle: () => setScfJournalFilter((p) => (p === 'CA' ? 'ALL' : 'CA')),
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'توازن النظام المحاسبي' : 'Statut Grand Livre SCF 07-11',
            badgeCount: scfEntries.length,
            badgePrefix: '',
            badgeSuffix: isAr ? 'قيود' : 'validées',
            valueCount: isLedgerBalanced ? 100 : 0,
            valuePrefix: '',
            valueSuffix: '%',
            caption: isAr ? 'قيود مدققة ومطابقة' : 'Zéro écart de clôture',
          }}
        />

        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'سجل القيود المحاسبية' : 'Écritures Comptables SCF'}
            liveRegionText={`${filteredEntries.length}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr
                ? 'بحث برقم القيد، البيان، المرجع...'
                : 'Rechercher N° écriture, libellé, pièce...'
            }
            statusOptions={[
              { value: 'ALL', label: isAr ? 'الكل' : 'Tous' },
              { value: 'VE', label: 'VE' },
              { value: 'CA', label: 'CA' },
              { value: 'BQ', label: 'BQ' },
              { value: 'OD', label: 'OD' },
            ]}
            statusValue={scfJournalFilter}
            onStatusChange={setScfJournalFilter}
            hasActiveAdvancedFilters={activeAdvancedCount > 0}
            activeFiltersCount={activeAdvancedCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={() => {
              downloadCsvSafe(
                'atrium-scf-ledger.csv',
                ['N° Écriture', 'Journal', 'Date', 'Pièce', 'Libellé', 'Débit DZD', 'Crédit DZD', 'Branche'],
                filteredEntries.map((e) => [
                  e.entryNumber,
                  e.journalCode,
                  e.date,
                  e.pieceJustificativeRef,
                  e.libelle,
                  e.totalDebitDzd,
                  e.totalCreditDzd,
                  resolveRecordBranch(e, branchesById, currentBranch, language).name,
                ])
              );
              showToast(isAr ? 'تم تصدير دفتر القيود' : 'Export Grand Livre généré', 'success');
            }}
            activeChips={activeChips}
            onResetAllFilters={resetAllFilters}
          />

          <UniversalDataCollection<SCFJournalEntry>
            hideToolbar
            data={filteredEntries}
            keyExtractor={(e) => e.id}
            defaultViewMode={viewMode}
            columns={scfColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            openItemId={activeScfEntry?.id ?? null}
            onItemClick={(e, el) => {
              setSelectedSCFEntry(e);
              setDrawerOpenerEl(el || null);
            }}
            onViewDetails={(e, el) => {
              setSelectedSCFEntry(e);
              setDrawerOpenerEl(el || null);
            }}
            renderCard={(e) => (
              <div className="space-y-2 text-left rtl:text-right">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {e.entryNumber}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700">
                    {e.journalCode}
                  </span>
                </div>
                <div className="text-xs font-bold text-black dark:text-white line-clamp-2">
                  {e.libelle}
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex justify-between font-mono text-xs font-bold">
                  <span>{e.date}</span>
                  <span className="text-[#d4522f]">{formatMoney(e.totalDebitDzd, language)}</span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد قيود مطابقة' : 'Aucune écriture comptable'}
            emptyDescription={
              isAr ? 'سجل قيداً جديداً أو عدّل المرشحات.' : 'Saisissez une écriture ou réinitialisez les filtres.'
            }
            primaryActionLabel={isAr ? 'قيد جديد' : 'Nouvelle Écriture SCF'}
            onAddFirstItem={() => setIsSCFModalOpen(true)}
            hasActiveFilters={hasAnyFilters}
            onResetFilters={resetAllFilters}
          />
        </ScreenPod>

        <KineticFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          triggerRef={filterButtonRef}
          language={language}
          displayCount={filteredEntries.length}
          entityPluralLabel={isAr ? 'قيد' : 'écritures'}
          hasActiveFilters={hasAnyFilters}
          onResetFilters={resetAllFilters}
          sections={scfFilters}
        />

        <KineticSlideOverInspector<SCFJournalEntry>
          isOpen={Boolean(activeScfEntry)}
          item={activeScfEntry}
          allItems={filteredEntries}
          keyExtractor={(e) => e.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={activeScfEntry?.entryNumber || ''}
          subtitle={`Journal ${activeScfEntry?.journalCode || ''} · ${activeScfEntry?.date || ''}`}
          avatarText={activeScfEntry?.journalCode || 'EC'}
          branchName={
            activeScfEntry
              ? resolveRecordBranch(activeScfEntry, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel="Équilibré ✓"
          tabs={[
            { id: 'lignes', label: isAr ? 'تفصيل الأسطر' : 'Ventilation SCF' },
            { id: 'justif', label: isAr ? 'المرجع' : 'Justificatif' },
          ]}
          activeTab={scfTab}
          onTabChange={setScfTab}
          onSelectItem={(e) => setSelectedSCFEntry(e)}
          onClose={() => setSelectedSCFEntry(null)}
          renderBody={(entry, tab) => {
            if (tab === 'justif') {
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block">
                      Objet & Pièce Justificative
                    </span>
                    <p className="font-semibold text-black dark:text-white">{entry.libelle}</p>
                    <p className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                      Pièce: {entry.pieceJustificativeRef}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-3 text-xs">
                <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block">
                  Ventilation des Lignes Comptables
                </span>
                {entry.lines.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[#d4522f]">
                        {l.accountNumber}
                      </span>
                      <div className="font-mono text-xs font-bold">
                        {l.debitDzd > 0 ? (
                          <span className="text-black dark:text-white">
                            D: {formatMoney(l.debitDzd, language)}
                          </span>
                        ) : (
                          <span className="text-black/60 dark:text-white/65">
                            C: {formatMoney(l.creditDzd, language)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-black/70 dark:text-white/75 truncate">
                      {l.accountLabel}
                    </p>
                  </div>
                ))}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-center font-bold font-mono">
                  Total Débit = Total Crédit = {formatMoney(entry.totalDebitDzd, language)}
                </div>
              </div>
            );
          }}
        />

        {isSCFModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale size={20} className="text-[#d4522f]" />
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {isAr
                      ? 'تسجيل قيد محاسبي مزدوج (SCF)'
                      : "Saisie d'une Écriture Comptable SCF"}
                  </h2>
                </div>
                <button
                  type="button"
                  data-no-liquid="true"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsSCFModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveSCFEntry} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <LabelSelect
                    label={isAr ? 'دفتر اليومية' : 'Code Journal'}
                    value={scfJournal}
                    onChange={(v) =>
                      setScfJournal(extractStr(v) as SCFJournalEntry['journalCode'])
                    }
                    options={[
                      { value: 'VE', label: 'VE - Ventes' },
                      { value: 'CA', label: 'CA - Caisse' },
                      { value: 'BQ', label: 'BQ - Banque' },
                      { value: 'OD', label: 'OD - Opérations Diverses' },
                    ]}
                  />
                  <LabelInput
                    label={isAr ? 'مرجع الوثيقة' : 'Réf Pièce Justificative'}
                    placeholder="FAC-2026-092"
                    value={scfRefPiece}
                    onChange={(e) => setScfRefPiece(e.target.value)}
                  />
                </div>
                <LabelInput
                  label={isAr ? 'البيان المحاسبي *' : "Libellé de l'écriture *"}
                  placeholder="Ex: Facturation honoraires audit légal"
                  value={scfLibelle}
                  onChange={(e) => setScfLibelle(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <LabelInput
                    label={isAr ? 'المبلغ الصافي الخاضع (HT) *' : 'Montant HT (Prestation) *'}
                    type="number"
                    value={scfDebitAmount}
                    onChange={(e) => setScfDebitAmount(Number(e.target.value))}
                    required
                  />
                  <LabelSelect
                    label={isAr ? 'نسبة الرسم TVA' : 'Taux TVA'}
                    value={scfTvaRate.toString()}
                    onChange={(v) => setScfTvaRate(Number(extractStr(v)))}
                    options={[
                      { value: '19', label: '19% (Taux Normal)' },
                      { value: '9', label: '9% (Taux Réduit)' },
                      { value: '0', label: '0% (Exonéré)' },
                    ]}
                  />
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Compte 706000 (Crédit HT):</span>
                    <span className="font-bold">{formatMoney(scfDebitAmount, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compte 445700 (TVA {scfTvaRate}%):</span>
                    <span className="font-bold">
                      {formatMoney(Math.round(scfDebitAmount * (scfTvaRate / 100)), language)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1 font-bold text-[#d4522f]">
                    <span>Compte 411000 (Débit TTC):</span>
                    <span>
                      {formatMoney(
                        scfDebitAmount + Math.round(scfDebitAmount * (scfTvaRate / 100)),
                        language
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <AtriumButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setIsSCFModalOpen(false)}
                  >
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </AtriumButton>
                  <AtriumButton variant="primary" size="sm" type="submit">
                    {isAr ? 'تسجيل القيد' : 'Enregistrer au Grand Livre'}
                  </AtriumButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // PERSONA 3: SECRETAIRE CAISSE (QUITTANCES & ART 317 TIMBRE)
  // =========================================================
  if (activeLegalRole === 'secretaire_caisse') {
    const filteredReceipts = cashReceipts
      .filter((r) => {
        if (receiptMethodFilter !== 'All' && r.paymentMethod !== receiptMethodFilter) return false;
        if (branchFilter !== 'All') {
          const b = resolveRecordBranch(r, branchesById, currentBranch, language);
          if ((b.id || b.name) !== branchFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !r.receiptNumber.toLowerCase().includes(q) &&
            !r.clientName.toLowerCase().includes(q) &&
            !r.matterTitle.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'branch') {
          cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
            resolveRecordBranch(b, branchesById, currentBranch, language).name
          );
        } else if (sortBy === 'net') {
          cmp = a.netCollectedDzd - b.netCollectedDzd;
        } else {
          cmp = a.receiptNumber.localeCompare(b.receiptNumber);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });

    const receiptColumns: ColumnDefinition<CashReceipt>[] = [
      {
        key: 'receiptNumber',
        header: isAr ? 'رقم الوصل' : 'N° Quittance',
        width: '1.5*',
        sortable: true,
        renderCell: (r) => (
          <div className="font-mono font-bold text-xs text-[#d4522f]">{r.receiptNumber}</div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الموكل والملف' : 'Client & Prestation',
        width: '2.6*',
        renderCell: (r) => (
          <div className="min-w-0">
            <span className="font-bold text-xs text-black dark:text-white block truncate">
              {r.clientName}
            </span>
            <span className="text-[11px] text-black/55 dark:text-white/55 truncate block">
              {r.matterTitle}
            </span>
          </div>
        ),
      },
      {
        key: 'timbre',
        header: isAr ? 'طابع م 317' : 'Timbre Art. 317',
        width: '1.4*',
        renderCell: (r) => (
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            +{formatMoney(r.timbreFiscalDzd, language)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.5*',
        sortable: true,
        renderCell: (r) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
            <span className="truncate">
              {resolveRecordBranch(r, branchesById, currentBranch, language).name}
            </span>
          </span>
        ),
      },
      {
        key: 'net',
        header: isAr ? 'الصافي المقبوض' : 'Net Encaissé',
        width: '1.6*',
        sortable: true,
        renderCell: (r) => (
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(r.netCollectedDzd, language)}
          </span>
        ),
      },
    ];

    const caisseFilters: KineticFilterSection[] = [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <ScreenHeaderBar
          icon={<CreditCard size={22} />}
          title={isAr ? 'الصندوق' : isEn ? 'Closing' : 'Caisse'}
          subtitle={
            isAr
              ? 'وصولات القبض النقدية وحساب طابع المادة 317'
              : 'Espèces & Droit de Timbre Fiscal Progressif (Art. 317)'
          }
          secondaryActions={
            <AtriumButton
              variant="outline"
              onClick={() => setIsClosureModalOpen(true)}
              icon={<ShieldCheck size={14} />}
            >
              {isAr ? 'محضر إغلاق الصندوق' : 'Arrêté de Caisse (PV)'}
            </AtriumButton>
          }
          primaryAction={{
            label: isAr ? 'قبض نقدي جديد' : 'Encaisser Espèces',
            onClick: () => setIsNewReceiptModalOpen(true),
          }}
        />

        <ScreenKpiBanner
          heading={
            isAr ? 'حالة الصندوق والسيولة النقدية' : 'Situation de Caisse & Droits de Timbre'
          }
          language={language}
          primaryCard={{
            label: isAr ? 'الرصيد النظري للصندوق' : 'Solde Théorique en Caisse',
            badgeText: `${cashReceipts.length} ${isAr ? 'وصولات' : 'quittances'}`,
            count: dailyClosure.theoreticalCashDzd || 0,
            formatValue: (v) => formatMoney(v, language),
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'طابع المادة 317 المحصل' : 'Timbre Fiscal Art. 317 Collecté',
            badgeText: isAr ? 'مصلحة الضرائب' : 'Recette Impôts',
            count: dailyClosure.totalTimbreAccruedDzd || 0,
            formatValue: (v) => formatMoney(v, language),
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'مطابقة الجرد الفعلي' : 'Arrêté Physique',
            badgeCount: cashReceipts.length,
            badgePrefix: '',
            badgeSuffix:
              dailyClosure.status === 'balanced'
                ? isAr
                  ? 'مطابق'
                  : 'Conforme'
                : 'Écart',
            valueCount: dailyClosure.actualPhysicalCashCountedDzd || 0,
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'مطابق تماماً بدون أي فارق' : 'Écart = 0 DZD (Validé)',
          }}
        />

        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr ? 'سجل وصولات القبض النقدية' : 'Quittances de Caisse & Timbre Fiscal'
            }
            liveRegionText={`${filteredReceipts.length}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr
                ? 'بحث برقم الوصل، الموكل أو الملف...'
                : 'Rechercher N° quittance, client, affaire...'
            }
            hasActiveAdvancedFilters={activeAdvancedCount > 0}
            activeFiltersCount={activeAdvancedCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={() => {
              downloadCsvSafe(
                'atrium-cash-receipts.csv',
                ['N° Quittance', 'Client', 'Prestation', 'HT DZD', 'TVA DZD', 'Timbre Art.317', 'Net Encaissé', 'Branche'],
                filteredReceipts.map((r) => [
                  r.receiptNumber,
                  r.clientName,
                  r.matterTitle,
                  r.totalHtDzd,
                  r.tvaDzd,
                  r.timbreFiscalDzd,
                  r.netCollectedDzd,
                  resolveRecordBranch(r, branchesById, currentBranch, language).name,
                ])
              );
              showToast(isAr ? 'تم تصدير الوصولات' : 'Export CSV généré', 'success');
            }}
            activeChips={activeChips}
            onResetAllFilters={resetAllFilters}
          />

          <UniversalDataCollection<CashReceipt>
            hideToolbar
            data={filteredReceipts}
            keyExtractor={(r) => r.id}
            defaultViewMode={viewMode}
            columns={receiptColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            openItemId={activeReceipt?.id ?? null}
            onItemClick={(r, el) => {
              setSelectedReceipt(r);
              setDrawerOpenerEl(el || null);
            }}
            onViewDetails={(r, el) => {
              setSelectedReceipt(r);
              setDrawerOpenerEl(el || null);
            }}
            renderCard={(r) => (
              <div className="space-y-2 text-left rtl:text-right">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {r.receiptNumber}
                  </span>
                  <span className="text-[10px] font-mono text-amber-600 font-bold">
                    +{formatMoney(r.timbreFiscalDzd, language)}
                  </span>
                </div>
                <div className="text-xs font-bold text-black dark:text-white truncate">
                  {r.clientName}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                  {r.matterTitle}
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 font-mono text-xs font-bold text-emerald-600">
                  {formatMoney(r.netCollectedDzd, language)}
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد وصولات نقدية' : 'Aucune quittance enregistrée'}
            emptyDescription={
              isAr ? 'قم بتسجيل قبض نقدي جديد.' : 'Enregistrez un nouvel encaissement.'
            }
            primaryActionLabel={isAr ? 'قبض نقدي' : 'Encaisser Espèces'}
            onAddFirstItem={() => setIsNewReceiptModalOpen(true)}
            hasActiveFilters={hasAnyFilters}
            onResetFilters={resetAllFilters}
          />
        </ScreenPod>

        <KineticFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          triggerRef={filterButtonRef}
          language={language}
          displayCount={filteredReceipts.length}
          entityPluralLabel={isAr ? 'وصل' : 'quittances'}
          hasActiveFilters={hasAnyFilters}
          onResetFilters={resetAllFilters}
          sections={caisseFilters}
        />

        <KineticSlideOverInspector<CashReceipt>
          isOpen={Boolean(activeReceipt)}
          item={activeReceipt}
          allItems={filteredReceipts}
          keyExtractor={(r) => r.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={activeReceipt?.receiptNumber || ''}
          subtitle={activeReceipt?.clientName}
          avatarText="RC"
          branchName={
            activeReceipt
              ? resolveRecordBranch(activeReceipt, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel="Encaissé ✓"
          tabs={[{ id: 'quittance', label: isAr ? 'الوصل الرسمي' : 'Quittance Art. 317' }]}
          activeTab={receiptTab}
          onTabChange={setReceiptTab}
          onSelectItem={(r) => setSelectedReceipt(r)}
          onClose={() => setSelectedReceipt(null)}
          renderBody={(rc) => (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
                <div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="font-bold text-sm text-[#d4522f] block">
                    وصل تسليم نقدية رسمي
                  </span>
                  <span className="text-[10px] text-black/55 dark:text-white/55">
                    Quittance de Versement en Espèces
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Reçu de :</span>
                    <span className="font-bold text-black dark:text-white">{rc.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Motif :</span>
                    <span className="font-medium text-black dark:text-white">{rc.matterTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Montant HT :</span>
                    <span className="font-mono">{formatMoney(rc.totalHtDzd, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">TVA 19% :</span>
                    <span className="font-mono">{formatMoney(rc.tvaDzd, language)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Droit de Timbre (Art. 317) :</span>
                    <span className="font-mono">+{formatMoney(rc.timbreFiscalDzd, language)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm text-emerald-600">
                    <span>Net Encaissé :</span>
                    <span className="font-mono">{formatMoney(rc.netCollectedDzd, language)}</span>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-black/55 dark:text-white/55 border-t border-neutral-100 dark:border-neutral-800 flex justify-between">
                  <span>Caissier : {rc.cashierName}</span>
                  <span className="font-mono">{rc.createdAt.slice(0, 10)}</span>
                </div>
              </div>
              <button
                type="button"
                data-no-liquid="true"
                onClick={() => {
                  showToast(
                    isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée',
                    'success'
                  );
                  window.print();
                }}
                className="w-full py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                {isAr ? 'طباعة وصل الموكل' : 'Imprimer Quittance Client'}
              </button>
            </div>
          )}
        />

        {isNewReceiptModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-[#d4522f]" />
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {isAr
                      ? 'قبض مبلغ نقدي مع طابع المادة 317'
                      : 'Encaissement Espèces & Timbre Art. 317'}
                  </h2>
                </div>
                <button
                  type="button"
                  data-no-liquid="true"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsNewReceiptModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveCashReceipt} className="space-y-3 text-xs">
                <LabelInput
                  label={isAr ? 'اسم الموكل / الدافع *' : 'Nom du Client / Payeur *'}
                  placeholder="Ex: Hadj Amine Mansouri"
                  value={receiptClientName}
                  onChange={(e) => setReceiptClientName(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'موضوع الدفعة / القضية' : 'Objet du Versement'}
                  placeholder="Ex: Provision sur honoraires dossier 26/01482"
                  value={receiptMatterTitle}
                  onChange={(e) => setReceiptMatterTitle(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'المبلغ الصافي الخاضع (HT) بالدينار *' : 'Montant HT (DZD) *'}
                  type="number"
                  value={receiptAmountHt}
                  onChange={(e) => setReceiptAmountHt(Number(e.target.value))}
                  required
                />
                {(() => {
                  const ht = Number(receiptAmountHt) || 0;
                  const tva = Math.round(ht * 0.19);
                  const ttc = ht + tva;
                  const stamp = calculateArticle317Stamp(ttc, 'especes');
                  const netCollected = ttc + stamp;
                  return (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span>Montant HT:</span>
                        <span>{formatMoney(ht, language)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA (19%):</span>
                        <span>{formatMoney(tva, language)}</span>
                      </div>
                      <div className="flex justify-between text-amber-600 font-bold">
                        <span>Timbre Fiscal Progressif (Art. 317):</span>
                        <span>+{formatMoney(stamp, language)}</span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1 font-bold text-sm text-emerald-600">
                        <span>Total Net à Encaisser en Espèces:</span>
                        <span>{formatMoney(netCollected, language)}</span>
                      </div>
                      <p className="text-[10px] text-black/55 dark:text-white/55 font-sans mt-1">
                        Droit de timbre gradué (Art. 317) : Exonéré &lt; 500 DA, 20-200 DA, puis 1% plafonné à 2 500 DA.
                      </p>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <AtriumButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setIsNewReceiptModalOpen(false)}
                  >
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </AtriumButton>
                  <AtriumButton variant="primary" size="sm" type="submit">
                    {isAr ? 'توليد الوصل والقبض' : "Valider l'Encaissement"}
                  </AtriumButton>
                </div>
              </form>
            </div>
          </div>
        )}

        <CashClosureModal
          isOpen={isClosureModalOpen}
          onClose={() => setIsClosureModalOpen(false)}
          closure={dailyClosure}
          cashReceipts={cashReceipts}
          onSaveClosure={(cl) => {
            updateDailyClosure(cl);
            setIsClosureModalOpen(false);
          }}
        />
      </div>
    );
  }

  // =========================================================
  // PERSONA 4: AVOCAT / DEFAULT (HONORAIRES & CARPA ESCROW)
  // =========================================================
  const totalTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);
  const escrowedCount = matters.filter((m) => (m.trustEscrowBalanceDzd || 0) > 0).length;

  const filteredCarpaMatters = matters
    .filter((m) => {
      if (carpaFilter === 'WithEscrow' && (m.trustEscrowBalanceDzd || 0) <= 0) return false;
      if (carpaFilter === 'Settled' && (m.trustEscrowBalanceDzd || 0) > 0) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !m.title.toLowerCase().includes(q) &&
          !m.clientName.toLowerCase().includes(q) &&
          !m.matterNumber.toLowerCase().includes(q) &&
          !(m.assignedLawyer || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else if (sortBy === 'retainer') {
        cmp = a.retainerAmountDzd - b.retainerAmountDzd;
      } else if (sortBy === 'trust') {
        cmp = (a.trustEscrowBalanceDzd || 0) - (b.trustEscrowBalanceDzd || 0);
      } else {
        cmp = a.matterNumber.localeCompare(b.matterNumber);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const carpaColumns: ColumnDefinition<LegalMatter>[] = [
    {
      key: 'matterNumber',
      header: isAr ? 'رقم القضية' : 'N° Dossier',
      width: '1.4*',
      sortable: true,
      renderCell: (m) => (
        <div className="font-mono font-bold text-xs text-[#d4522f]">{m.matterNumber}</div>
      ),
    },
    {
      key: 'matter',
      header: isAr ? 'الموضوع والعميل' : 'Affaire & Mandant',
      width: '2.6*',
      renderCell: (m) => (
        <div className="min-w-0">
          <span className="font-bold text-xs text-black dark:text-white block truncate">
            {isAr && m.titleAr ? m.titleAr : m.title}
          </span>
          <span className="text-[11px] text-black/55 dark:text-white/55 truncate block">
            {m.clientName} · {m.category}
          </span>
        </div>
      ),
    },
    {
      key: 'retainer',
      header: isAr ? 'أتعاب المكتب' : 'Honoraires',
      width: '1.4*',
      sortable: true,
      renderCell: (m) => (
        <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
          {formatMoney(m.retainerAmountDzd, language)}
        </span>
      ),
    },
    {
      key: 'trust',
      header: isAr ? 'رصيد CARPA' : 'Séquestre CARPA',
      width: '1.5*',
      sortable: true,
      renderCell: (m) => (
        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
          {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
        </div>
      ),
    },
    {
      key: 'branch',
      header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      width: '1.5*',
      sortable: true,
      renderCell: (m) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
          <MapPin size={12} className="text-[#d4522f] shrink-0" />
          <span className="truncate">
            {resolveRecordBranch(m, branchesById, currentBranch, language).name}
          </span>
        </span>
      ),
    },
  ];

  const carpaFilters: KineticFilterSection[] = [
    {
      id: 'carpaStatus',
      label: isAr ? 'حالة الوديعة CARPA' : 'Situation CARPA',
      value: carpaFilter,
      onChange: setCarpaFilter,
      resetValue: 'All',
      kind: 'segmented',
      options: [
        { value: 'All', label: isAr ? 'الكل' : 'Tous' },
        { value: 'WithEscrow', label: isAr ? 'تحت الحراسة' : 'Sous Séquestre' },
        { value: 'Settled', label: isAr ? 'مصفي' : 'Soldés' },
      ],
    },
    {
      id: 'branch',
      label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      value: branchFilter,
      onChange: setBranchFilter,
      resetValue: 'All',
      kind: 'tiles',
      columns: 2,
      options: branchOptions,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<CreditCard size={22} />}
        title={isAr ? 'الأتعاب' : isEn ? 'Fees' : 'Honoraires'}
        subtitle={
          isAr
            ? 'إدارة الأتعاب وحسابات الحراسة القضائية CARPA · نقابة المحامين'
            : 'Comptabilité des Fonds Mandants · Ordre des Avocats (CARPA)'
        }
        secondaryActions={
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(
                isAr ? 'طباعة كشف حساب الودائع CARPA' : 'Relevé séquestre CARPA imprimé',
                'info'
              );
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'كشف CARPA' : 'Relevé CARPA'}
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'إدارة أموال الموكلين والودائع القضائية'
            : 'Comptabilité des Fonds Mandants & Diligences'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'أتعاب الدفاع والخدمات' : 'Honoraires & Diligences',
          badgeText: `${matters.length} ${isAr ? 'قضية' : 'affaires'}`,
          count: totalRetainers,
          formatValue: (v) => formatMoney(v, language),
          isActive: carpaFilter === 'Settled',
          onToggle: () => setCarpaFilter((p) => (p === 'Settled' ? 'All' : 'Settled')),
          tone: 'emerald',
        }}
        secondaryCard={{
          label: isAr ? 'قضايا مودعة تحت الحراسة' : 'Dossiers Sous Séquestre',
          badgeText: isAr ? 'مراقبة نقابية' : 'CARPA actifs',
          count: escrowedCount,
          isActive: carpaFilter === 'WithEscrow',
          onToggle: () => setCarpaFilter((p) => (p === 'WithEscrow' ? 'All' : 'WithEscrow')),
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr ? 'إجمالي الودائع (Séquestre)' : 'Fonds Séquestre Protégés',
          badgeCount: matters.length,
          badgePrefix: '',
          badgeSuffix: 'CARPA',
          valueCount: totalTrust,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'حسابات مصفاة ومدققة' : 'Comptes audités sous égide du barreau',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'سجل الحسابات والودائع'
              : 'Relevé des Comptes Séquestres CARPA & Honoraires'
          }
          liveRegionText={`${filteredCarpaMatters.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث برقم القضية، الموكل، الموضوع...'
              : 'Rechercher dossier, client, affaire, CARPA...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous' },
            { value: 'WithEscrow', label: isAr ? 'ودائع CARPA' : 'Sous Séquestre' },
            { value: 'Settled', label: isAr ? 'مصفي' : 'Soldés' },
          ]}
          statusValue={carpaFilter}
          onStatusChange={setCarpaFilter}
          hasActiveAdvancedFilters={activeAdvancedCount > 0}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={() => {
            downloadCsvSafe(
              'atrium-carpa-trust.csv',
              ['N° Dossier', 'Client', 'Affaire', 'Honoraires DZD', 'CARPA DZD', 'Branche'],
              filteredCarpaMatters.map((m) => [
                m.matterNumber,
                m.clientName,
                m.title,
                m.retainerAmountDzd,
                m.trustEscrowBalanceDzd || 0,
                resolveRecordBranch(m, branchesById, currentBranch, language).name,
              ])
            );
            showToast(isAr ? 'تم تصدير كشف CARPA' : 'Export CARPA généré', 'success');
          }}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<LegalMatter>
          hideToolbar
          data={filteredCarpaMatters}
          keyExtractor={(m) => m.id}
          defaultViewMode={viewMode}
          columns={carpaColumns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          openItemId={activeCarpaMatter?.id ?? null}
          onItemClick={(m, el) => {
            setSelectedMatter(m);
            setDrawerOpenerEl(el || null);
          }}
          onViewDetails={(m, el) => {
            setSelectedMatter(m);
            setDrawerOpenerEl(el || null);
          }}
          customActions={(m) => [
            {
              id: 'inspect',
              label: isAr ? 'معاينة الحساب' : 'Consulter Compte',
              icon: <Eye size={14} />,
              onClick: () => setSelectedMatter(m),
            },
            {
              id: 'release',
              label: isAr ? 'إفراج عن الوديعة' : 'Débloquer Séquestre',
              icon: <Unlock size={14} />,
              onClick: () => handleReleaseTrustFunds(m),
            },
            {
              id: 'statement',
              label: isAr ? 'كشف CARPA' : 'Relevé CARPA',
              icon: <Printer size={14} />,
              onClick: () => {
                showToast(
                  isAr
                    ? `طباعة كشف حساب الوديعة للقضية ${m.matterNumber}`
                    : `Génération du relevé officiel CARPA (${m.matterNumber})`,
                  'info'
                );
              },
            },
          ]}
          renderCard={(m) => (
            <div className="space-y-2.5 text-left rtl:text-right">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#d4522f]">
                  {m.matterNumber}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  Conforme
                </span>
              </div>
              <div className="text-xs font-bold text-black dark:text-white line-clamp-2">
                {m.title}
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                {m.clientName}
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex justify-between font-mono text-xs font-bold">
                <span>{formatMoney(m.retainerAmountDzd, language)}</span>
                <span className="text-blue-600">
                  CARPA: {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                </span>
              </div>
            </div>
          )}
          emptyTitle={isAr ? 'لا توجد حسابات CARPA' : 'Aucun compte CARPA'}
          emptyDescription={
            isAr ? 'أعد ضبط المرشحات لعرض كافة الحسابات.' : 'Réinitialisez les filtres actifs.'
          }
          hasActiveFilters={hasAnyFilters}
          onResetFilters={resetAllFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={filteredCarpaMatters.length}
        entityPluralLabel={isAr ? 'حساب' : 'comptes'}
        hasActiveFilters={hasAnyFilters}
        onResetFilters={resetAllFilters}
        sections={carpaFilters}
      />

      <KineticSlideOverInspector<LegalMatter>
        isOpen={Boolean(activeCarpaMatter)}
        item={activeCarpaMatter}
        allItems={filteredCarpaMatters}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeCarpaMatter?.matterNumber || ''}
        subtitle={activeCarpaMatter?.clientName}
        avatarText="CA"
        branchName={
          activeCarpaMatter
            ? resolveRecordBranch(activeCarpaMatter, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel="Conforme CARPA"
        tabs={[
          { id: 'sequestre', label: isAr ? 'الودائع Séquestre' : 'Séquestre' },
          { id: 'honoraires', label: isAr ? 'الأتعاب والمصاريف' : 'Honoraires' },
          { id: 'deontologie', label: isAr ? 'المطابقة النقابية' : 'CARPA & Éthique' },
        ]}
        activeTab={carpaTab}
        onTabChange={setCarpaTab}
        onSelectItem={(m) => setSelectedMatter(m)}
        onClose={() => setSelectedMatter(null)}
        renderBody={(m, tab) => {
          if (tab === 'honoraires') {
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Décompte d'Honoraires & Diligences
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      Convention d'honoraires:
                    </span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      Droits de plaidoirie & timbres:
                    </span>
                    <span className="font-mono text-black/75 dark:text-white/80">12 000 DZD</span>
                  </div>
                </div>
              </div>
            );
          }

          if (tab === 'deontologie') {
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Conformité Déontologique Ordre des Avocats
                  </span>
                  <div className="space-y-1.5 text-black/75 dark:text-white/80">
                    <div className="flex items-center gap-2">
                      <FileCheck size={14} className="text-emerald-500" />
                      <span>Séparation hermétique des comptes de cabinet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileCheck size={14} className="text-emerald-500" />
                      <span>Contrôle périodique du Conseil de l'Ordre</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-white/80 text-[11px]">
                  <span>Fonds Mandant Sous Séquestre</span>
                  <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Inaliénable
                  </span>
                </div>
                <div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                  {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                </div>
                <p className="text-[10px] text-white/75">
                  Montant bloqué sur sous-compte CARPA jusqu'à décision judiciaire exécutoire.
                </p>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-black dark:text-white">
                    Déblocage de Séquestre
                  </span>
                  <span className="text-[10px] text-black/55 dark:text-white/55">
                    Sur présentation du jugement définitif
                  </span>
                </div>
                <button
                  type="button"
                  data-no-liquid="true"
                  onClick={() => handleReleaseTrustFunds(m)}
                  disabled={!m.trustEscrowBalanceDzd || m.trustEscrowBalanceDzd === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b03b1b] text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Débloquer
                </button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};
