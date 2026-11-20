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
  Key,
  MapPin,
  Pin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
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
  const language = useAtriumSelector((s) => s.language);
  const activeLegalRole = useAtriumSelector((s) => s.activeLegalRole);
  const currentBusiness = useAtriumSelector(selectCurrentBusinessFromState);
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const currentUser = useAtriumSelector((s) => s.currentUser);
  const branches = useAtriumSelector((s) => s.branches);
  const isSyncing = useAtriumSelector((s) => s.isSyncing);
  const networkMode = useAtriumSelector((s) => s.networkMode);
  const { retryCloudSync } = useAtriumActions();
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
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast(
          nowPinned
            ? isAr ? 'تم التثبيت بالأعلى' : 'Élément épinglé en tête de liste'
            : isAr ? 'تم إلغاء التثبيت' : 'Élément désépinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

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

  const getEscrowRowMeta = useCallback(
    (a: EscrowAccount): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(a, branchesById, currentBranch, language);
      return {
        isPinned: pinnedIds.has(a.id),
        avatarText: 'SQ',
        subline: `${a.clientName} ➔ ${a.beneficiaryName}`,
        categoryLabel: isAr ? 'حساب حراسة' : isEn ? 'Escrow' : 'Séquestre',
        statusVariant: a.isLocked ? 'blocked' : 'active',
        statusLabel: a.isLocked
          ? isAr ? 'مقفل' : isEn ? 'Locked' : 'Verrouillé'
          : isAr ? 'محرر' : isEn ? 'Released' : 'Libéré',
        metricPrimary: formatMoney(a.currentBalanceDzd, language),
        detailCol1: {
          heading: isAr ? 'الأطراف' : isEn ? 'Parties' : 'Parties Séquestre',
          primaryText: a.clientName,
          secondaryText: `➔ ${a.beneficiaryName}`,
        },
        detailCol2: {
          heading: isAr ? 'الرصيد والمصروف' : isEn ? 'Balance & Out' : 'Solde & Débours',
          primaryText: formatMoney(a.currentBalanceDzd, language),
          secondaryText: `${isAr ? 'مصروف' : isEn ? 'Disbursed' : 'Déboursé'}: ${formatMoney(a.totalDisbursedDzd, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'الإشهار والفرع' : isEn ? 'Cadastre & Branch' : 'Cadastre & Branche',
          primaryText: a.cadastralClearanceProof?.volume
            ? `${a.cadastralClearanceProof.volume} / ${a.cadastralClearanceProof.number}`
            : isAr ? 'بانتظار الإشهار' : isEn ? 'Pending clearance' : 'Attente pub. foncière',
          secondaryText: branchInfo.name,
        },
      };
    },
    [pinnedIds, branchesById, currentBranch, isAr, isEn, language]
  );

  const getEscrowFanActions = useCallback(
    (a: EscrowAccount): KineticRowFanAction[] => [
      {
        id: 'double_lock',
        label: isAr ? 'فك القفل المزدوج' : 'Double-Verrou',
        icon: <Unlock className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedEscrow(a);
          setEscrowTab('double_lock');
        },
      },
      {
        id: 'virement',
        label: isAr ? 'أمر التحويل' : 'Ordre Virement',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedEscrow(a);
          setEscrowTab('virement');
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(a.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(a.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(a.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getEscrowDetailActions = useCallback(
    (a: EscrowAccount): KineticDetailAction[] => [
      {
        id: 'double_lock',
        label: isAr ? 'القفل المزدوج' : 'Double-Verrou',
        icon: <Unlock className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedEscrow(a);
          setEscrowTab('double_lock');
        },
      },
      {
        id: 'transactions',
        label: isAr ? 'المعاملات' : 'Historique',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedEscrow(a);
          setEscrowTab('transactions');
        },
      },
      {
        id: 'virement',
        label: isAr ? 'أمر التحويل' : 'Ordre Virement',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedEscrow(a);
          setEscrowTab('virement');
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(a.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(a.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(a.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getScfRowMeta = useCallback(
    (e: SCFJournalEntry): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(e, branchesById, currentBranch, language);
      return {
        isPinned: pinnedIds.has(e.id),
        avatarText: (e.journalCode || 'EC').slice(0, 2).toUpperCase(),
        subline: `${e.libelle} · Réf ${e.pieceJustificativeRef}`,
        categoryLabel: `Journal ${e.journalCode}`,
        statusVariant: 'active',
        statusLabel: isAr ? 'متوازن' : isEn ? 'Balanced' : 'Équilibré',
        metricPrimary: formatMoney(e.totalDebitDzd, language),
        metricSecondary: e.date,
        detailCol1: {
          heading: isAr ? 'القيد والمرجع' : isEn ? 'Entry & Ref' : 'Écriture & Pièce',
          primaryText: e.entryNumber,
          secondaryText: `Réf: ${e.pieceJustificativeRef}`,
        },
        detailCol2: {
          heading: isAr ? 'المبلغ والأسطر' : isEn ? 'Debit & Lines' : 'Montant & Lignes',
          primaryText: formatMoney(e.totalDebitDzd, language),
          secondaryText: `${e.lines.length} ${isAr ? 'أسطر' : isEn ? 'lines' : 'lignes'} · Journal ${e.journalCode}`,
        },
        detailCol3: {
          heading: isAr ? 'التاريخ والفرع' : isEn ? 'Date & Branch' : 'Date & Branche',
          primaryText: e.date,
          secondaryText: branchInfo.name,
        },
      };
    },
    [pinnedIds, branchesById, currentBranch, isAr, isEn, language]
  );

  const getScfFanActions = useCallback(
    (e: SCFJournalEntry): KineticRowFanAction[] => [
      {
        id: 'lignes',
        label: isAr ? 'تفصيل الأسطر' : 'Ventilation SCF',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (ev) => {
          setDrawerOpenerEl(ev.currentTarget);
          setSelectedSCFEntry(e);
          setScfTab('lignes');
        },
      },
      {
        id: 'justif',
        label: isAr ? 'المرجع' : 'Justificatif',
        icon: <FileCheck className="w-[15px] h-[15px]" />,
        onClick: (ev) => {
          setDrawerOpenerEl(ev.currentTarget);
          setSelectedSCFEntry(e);
          setScfTab('justif');
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(e.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(e.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(e.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getScfDetailActions = useCallback(
    (e: SCFJournalEntry): KineticDetailAction[] => [
      {
        id: 'lignes',
        label: isAr ? 'تفصيل الأسطر' : 'Ventilation SCF',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedSCFEntry(e);
          setScfTab('lignes');
        },
      },
      {
        id: 'justif',
        label: isAr ? 'المرجع' : 'Justificatif',
        icon: <FileCheck className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedSCFEntry(e);
          setScfTab('justif');
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(e.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(e.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(e.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getReceiptRowMeta = useCallback(
    (r: CashReceipt): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(r, branchesById, currentBranch, language);
      return {
        isPinned: pinnedIds.has(r.id),
        avatarText: 'RC',
        subline: `${r.clientName} · ${r.matterTitle}`,
        categoryLabel: 'Art. 317',
        statusVariant: 'active',
        statusLabel: isAr ? 'مقبوض' : isEn ? 'Collected' : 'Encaissé',
        metricPrimary: formatMoney(r.netCollectedDzd, language),
        metricSecondary: `+${formatMoney(r.timbreFiscalDzd, language)}`,
        detailCol1: {
          heading: isAr ? 'الموكل والقضية' : isEn ? 'Client & Matter' : 'Client & Dossier',
          primaryText: r.clientName,
          secondaryText: r.matterTitle,
        },
        detailCol2: {
          heading: isAr ? 'الصافي والطابع' : isEn ? 'Net & Stamp' : 'Net & Timbre 317',
          primaryText: formatMoney(r.netCollectedDzd, language),
          secondaryText: `HT ${formatMoney(r.totalHtDzd, language)} + ${formatMoney(r.timbreFiscalDzd, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'رقم الوصل والفرع' : isEn ? 'Receipt & Branch' : 'Quittance & Branche',
          primaryText: r.receiptNumber,
          secondaryText: branchInfo.name,
        },
      };
    },
    [pinnedIds, branchesById, currentBranch, isAr, isEn, language]
  );

  const getReceiptFanActions = useCallback(
    (r: CashReceipt): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'الوصل' : 'Quittance',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedReceipt(r);
          setReceiptTab('quittance');
        },
      },
      {
        id: 'print',
        label: isAr ? 'طباعة' : 'Imprimer',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => {
          showToast(isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée', 'success');
          window.print();
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(r.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(r.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(r.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getReceiptDetailActions = useCallback(
    (r: CashReceipt): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'الوصل الرسمي' : 'Quittance Art. 317',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedReceipt(r);
          setReceiptTab('quittance');
        },
      },
      {
        id: 'timbre',
        label: isAr ? 'طابع م 317' : 'Calcul Timbre',
        icon: <CreditCard className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedReceipt(r);
          setReceiptTab('timbre');
        },
      },
      {
        id: 'print',
        label: isAr ? 'طباعة' : 'Imprimer',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => {
          showToast(isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée', 'success');
          window.print();
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(r.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(r.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(r.id),
      },
    ],
    [isAr, pinnedIds, handleTogglePin]
  );

  const getCarpaRowMeta = useCallback(
    (m: LegalMatter): KineticRowMeta => {
      const hasEscrow = (m.trustEscrowBalanceDzd || 0) > 0;
      const branchInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
      return {
        isPinned: pinnedIds.has(m.id),
        avatarText: 'CA',
        subline: `${m.clientName} · ${m.title}`,
        categoryLabel: m.category,
        statusVariant: hasEscrow ? 'info' : 'active',
        statusLabel: hasEscrow
          ? isAr ? 'تحت الحراسة' : isEn ? 'Escrowed' : 'Sous Séquestre'
          : isAr ? 'مصفى' : isEn ? 'Settled' : 'Soldé',
        metricPrimary: formatMoney(m.trustEscrowBalanceDzd || 0, language),
        metricSecondary: formatMoney(m.retainerAmountDzd, language),
        detailCol1: {
          heading: isAr ? 'الموكل والملف' : isEn ? 'Client & Matter' : 'Client & Dossier',
          primaryText: m.clientName,
          secondaryText: m.matterNumber,
        },
        detailCol2: {
          heading: isAr ? 'وديعة CARPA والأتعاب' : isEn ? 'CARPA & Retainer' : 'Séquestre & Honoraires',
          primaryText: formatMoney(m.trustEscrowBalanceDzd || 0, language),
          secondaryText: `${isAr ? 'أتعاب' : isEn ? 'Retainer' : 'Honoraires'}: ${formatMoney(m.retainerAmountDzd, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'المحكمة والفرع' : isEn ? 'Court & Branch' : 'Juridiction & Branche',
          primaryText: m.courtJurisdiction || m.category,
          secondaryText: branchInfo.name,
        },
      };
    },
    [pinnedIds, branchesById, currentBranch, isAr, isEn, language]
  );

  const getCarpaFanActions = useCallback(
    (m: LegalMatter): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'معاينة الحساب' : 'Consulter Compte',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedMatter(m);
          setCarpaTab('sequestre');
        },
      },
      {
        id: 'release',
        label: isAr ? 'إفراج' : 'Débloquer',
        icon: <Unlock className="w-[15px] h-[15px]" />,
        onClick: () => handleReleaseTrustFunds(m),
      },
      {
        id: 'pin',
        label: pinnedIds.has(m.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(m.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(m.id),
      },
    ],
    [isAr, handleReleaseTrustFunds, pinnedIds, handleTogglePin]
  );

  const getCarpaDetailActions = useCallback(
    (m: LegalMatter): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'الوديعة' : 'Séquestre',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedMatter(m);
          setCarpaTab('sequestre');
        },
      },
      {
        id: 'release',
        label: isAr ? 'إفراج عن الوديعة' : 'Débloquer Séquestre',
        icon: <Unlock className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () => handleReleaseTrustFunds(m),
      },
      {
        id: 'statement',
        label: isAr ? 'كشف CARPA' : 'Relevé CARPA',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => {
          showToast(
            isAr
              ? `طباعة كشف حساب الوديعة للقضية ${m.matterNumber}`
              : `Génération du relevé officiel CARPA (${m.matterNumber})`,
            'info'
          );
        },
      },
      {
        id: 'pin',
        label: pinnedIds.has(m.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(m.id) ? 'fill-current' : ''}`} />,
        onClick: () => handleTogglePin(m.id),
      },
    ],
    [isAr, handleReleaseTrustFunds, pinnedIds, handleTogglePin]
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
        const aPinned = pinnedIds.has(a.id);
        const bPinned = pinnedIds.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
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
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
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
            items={filteredEscrows}
            keyExtractor={(a) => a.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            getRowMeta={getEscrowRowMeta}
            getFanActions={getEscrowFanActions}
            getDetailActions={getEscrowDetailActions}
            isPinned={(a) => pinnedIds.has(a.id)}
            onTogglePin={(a) => handleTogglePin(a.id)}
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
          categoryLabel={isAr ? 'حراسة عقارية' : 'Séquestre Notarial'}
          avatarText="SQ"
          branchName={
            activeEscrow
              ? resolveRecordBranch(activeEscrow, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel={activeEscrow?.isLocked ? 'Verrouillé' : 'Libéré'}
          statusClassName={
            activeEscrow?.isLocked
              ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
              : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
          }
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
                <InspectorSection index={0} title={isAr ? 'الحركات المصرفية والخزينة' : 'Mouvements Bancaires & Trésor'}>
                  {esc.transactions.length > 0 ? (
                    <InspectorCard>
                      {esc.transactions.map((tx, idx) => (
                        <InspectorListItem
                          key={tx.id}
                          title={tx.notes}
                          subtitle={`${tx.date} · ${tx.paymentMode} · ${tx.bankReference || ''}`}
                          metaRight={`${tx.type === 'deposit_received' ? '+' : '-'}${formatMoney(
                            tx.amountDzd,
                            language
                          )}`}
                          badge={{
                            label: tx.type === 'deposit_received' ? 'Crédit' : 'Virement',
                            tone: tx.type === 'deposit_received' ? 'ok' : 'accent',
                          }}
                          isLast={idx === esc.transactions.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  ) : (
                    <InspectorCard>
                      <InspectorKeyValue label="Historique" value="Aucun mouvement" mono={false} isLast />
                    </InspectorCard>
                  )}
                </InspectorSection>
              );
            }

            if (tab === 'virement') {
              return (
                <>
                  <InspectorSection index={0} title="Ordre de Virement Séquestre">
                    <InspectorCard>
                      <InspectorKeyValue label="Donneur d'ordre" value="Maître Notaire Titulaire" mono={false} />
                      <InspectorKeyValue label="Compte débité" value="Trésor BNA 0010 0987 6543" />
                      <InspectorKeyValue label="Bénéficiaire" value={esc.beneficiaryName} mono={false} />
                      <InspectorKeyValue
                        label="Montant"
                        value={formatMoney(esc.currentBalanceDzd, language)}
                        tone="accent"
                      />
                      <InspectorKeyValue label="Motif" value={`Dossier ${esc.matterReference}`} mono={false} isLast />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={isAr ? 'طباعة أمر التحويل' : 'Imprimer le Virement'}
                      icon={<Printer size={14} />}
                      onClick={() => {
                        showToast(
                          isAr
                            ? 'جاري طباعة أمر التحويل الرسمي'
                            : 'Ordre de virement officiel imprimé',
                          'info'
                        );
                        window.print();
                      }}
                    />
                  </InspectorSection>
                </>
              );
            }

            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(esc.currentBalanceDzd, language)}
                    tone={esc.isLocked ? 'accent' : 'ok'}
                    caption={`Bénéficiaire : ${esc.beneficiaryName}`}
                  />
                </InspectorSection>

                <InspectorSection
                  index={1}
                  title={isAr ? 'الشرط الأول: الإشهار العقاري' : 'Verrou 1 : Publicité Foncière'}
                  action={
                    esc.cadastralClearanceProof?.volume ? (
                      <span className="text-[10px] font-bold text-[#096b40] dark:text-[#5BE3A3] flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {isAr ? 'تم التحقق' : 'Conforme'}
                      </span>
                    ) : undefined
                  }
                >
                  {esc.cadastralClearanceProof?.volume ? (
                    <InspectorCard>
                      <InspectorKeyValue
                        label="Volume / Numéro"
                        value={`${esc.cadastralClearanceProof.volume} · N° ${esc.cadastralClearanceProof.number}`}
                        tone="ok"
                      />
                      <InspectorKeyValue
                        label="Enregistrement"
                        value={esc.cadastralClearanceProof.recordedAt}
                        isLast
                      />
                    </InspectorCard>
                  ) : (
                    <div
                      data-sq="card"
                      data-sq-border="solid"
                      className="p-3.5 bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] space-y-2.5"
                    >
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
                      <InspectorWideButton
                        label={isAr ? 'تأكيد الإشهار العقاري' : 'Valider la Publicité'}
                        icon={<Building2 size={14} />}
                        onClick={handleVerifyCadastre}
                      />
                    </div>
                  )}
                </InspectorSection>

                <InspectorSection index={2} title={isAr ? 'الشرط الثاني: رمز الأمان PIN' : 'Verrou 2 : Code PIN Notaire'}>
                  <div
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-3.5 bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] space-y-2.5"
                  >
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
                    <InspectorWideButton
                      label={isAr ? 'فك القفل المزدوج وإصدار أمر التحويل' : 'Débloquer & Émettre Virement'}
                      icon={<Key size={14} />}
                      tone="dark"
                      disabled={esc.currentBalanceDzd <= 0}
                      onClick={handleExecuteDoubleLockRelease}
                    />
                  </div>
                </InspectorSection>
              </>
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
        const aPinned = pinnedIds.has(a.id);
        const bPinned = pinnedIds.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
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
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[var(--r-check,6px)] bg-neutral-100 dark:bg-neutral-800 text-black/75 dark:text-white/80">
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
            items={filteredEntries}
            keyExtractor={(e) => e.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            getRowMeta={getScfRowMeta}
            getFanActions={getScfFanActions}
            getDetailActions={getScfDetailActions}
            isPinned={(e) => pinnedIds.has(e.id)}
            onTogglePin={(e) => handleTogglePin(e.id)}
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
          categoryLabel={`Journal ${activeScfEntry?.journalCode || 'SCF'}`}
          avatarText={(activeScfEntry?.journalCode || 'EC').slice(0, 2).toUpperCase()}
          branchName={
            activeScfEntry
              ? resolveRecordBranch(activeScfEntry, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel="Équilibré"
          statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]"
          tabs={[
            { id: 'lignes', label: isAr ? 'تفصيل الأسطر' : 'Ventilation SCF' },
            { id: 'justif', label: isAr ? 'المرجع' : 'Justificatif' },
            { id: 'audit', label: isAr ? 'المطابقة' : 'Conformité' },
          ]}
          activeTab={scfTab}
          onTabChange={setScfTab}
          onSelectItem={(e) => setSelectedSCFEntry(e)}
          onClose={() => setSelectedSCFEntry(null)}
          renderBody={(entry, tab) => {
            if (tab === 'justif') {
              return (
                <InspectorSection index={0} title={isAr ? 'البيان والمرجع' : 'Objet & Pièce Justificative'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Libellé" value={entry.libelle} mono={false} />
                    <InspectorKeyValue
                      label="Pièce Justificative"
                      value={entry.pieceJustificativeRef}
                      copyText={entry.pieceJustificativeRef}
                      onCopied={() => showToast('Référence copiée', 'info')}
                    />
                    <InspectorKeyValue label="Date" value={entry.date} isLast />
                  </InspectorCard>
                </InspectorSection>
              );
            }
            if (tab === 'audit') {
              return (
                <InspectorSection index={0} title={isAr ? 'مراقبة التوازن SCF 07-11' : 'Contrôle Partie Double SCF 07-11'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Total Débit" value={formatMoney(entry.totalDebitDzd, language)} />
                    <InspectorKeyValue label="Total Crédit" value={formatMoney(entry.totalCreditDzd, language)} />
                    <InspectorKeyValue label="Écart" value="0 DZD" tone="ok" isLast />
                  </InspectorCard>
                </InspectorSection>
              );
            }
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(entry.totalDebitDzd, language)}
                    tone="ok"
                    caption={`Total Débit = Total Crédit · Journal ${entry.journalCode}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'أسطر القيد المحاسبي' : 'Ventilation des Lignes Comptables'}>
                  <InspectorCard>
                    {entry.lines.map((l, idx) => (
                      <InspectorListItem
                        key={l.id}
                        title={`${l.accountNumber} · ${l.accountLabel}`}
                        metaRight={
                          l.debitDzd > 0
                            ? `D: ${formatMoney(l.debitDzd, language)}`
                            : `C: ${formatMoney(l.creditDzd, language)}`
                        }
                        badge={{
                          label: l.debitDzd > 0 ? 'Débit' : 'Crédit',
                          tone: l.debitDzd > 0 ? 'accent' : 'neutral',
                        }}
                        isLast={idx === entry.lines.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }}
        />

        {isSCFModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="sq-elev-pop max-w-lg w-full">
              <div
                data-sq="panel"
                data-sq-border="solid"
                className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-4"
              >
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
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
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
                <div
                  data-sq="card"
                  data-sq-border="none"
                  className="p-3 bg-neutral-50 dark:bg-neutral-800/60 space-y-1 font-mono text-[11px]"
                >
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
        const aPinned = pinnedIds.has(a.id);
        const bPinned = pinnedIds.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
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
            items={filteredReceipts}
            keyExtractor={(r) => r.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            getRowMeta={getReceiptRowMeta}
            getFanActions={getReceiptFanActions}
            getDetailActions={getReceiptDetailActions}
            isPinned={(r) => pinnedIds.has(r.id)}
            onTogglePin={(r) => handleTogglePin(r.id)}
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
          categoryLabel="Quittance Art. 317"
          avatarText="RC"
          branchName={
            activeReceipt
              ? resolveRecordBranch(activeReceipt, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel="Encaissé"
          statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]"
          tabs={[
            { id: 'quittance', label: isAr ? 'الوصل الرسمي' : 'Quittance' },
            { id: 'timbre', label: isAr ? 'طابع م 317' : 'Timbre Art. 317' },
            { id: 'actions', label: isAr ? 'الطباعة والصندوق' : 'Caisse & Print' },
          ]}
          activeTab={receiptTab}
          onTabChange={setReceiptTab}
          onSelectItem={(r) => setSelectedReceipt(r)}
          onClose={() => setSelectedReceipt(null)}
          renderBody={(rc, tab) => {
            if (tab === 'timbre') {
              return (
                <InspectorSection index={0} title={isAr ? 'تفصيل طابع المادة 317' : 'Calcul Timbre Progressif (Art. 317)'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Montant HT" value={formatMoney(rc.totalHtDzd, language)} />
                    <InspectorKeyValue label="TVA 19%" value={formatMoney(rc.tvaDzd, language)} />
                    <InspectorKeyValue label="Timbre Art. 317" value={`+${formatMoney(rc.timbreFiscalDzd, language)}`} tone="warn" />
                    <InspectorKeyValue label="Net Encaissé" value={formatMoney(rc.netCollectedDzd, language)} tone="ok" isLast />
                  </InspectorCard>
                </InspectorSection>
              );
            }
            if (tab === 'actions') {
              return (
                <>
                  <InspectorSection index={0} title={isAr ? 'بيانات أمين الصندوق' : 'Traçabilité Caissier'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Caissier" value={rc.cashierName} mono={false} />
                      <InspectorKeyValue label="Date" value={rc.createdAt.slice(0, 10)} isLast />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={isAr ? 'طباعة وصل الموكل' : 'Imprimer Quittance Client'}
                      icon={<Printer size={14} />}
                      onClick={() => {
                        showToast(
                          isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée',
                          'success'
                        );
                        window.print();
                      }}
                    />
                  </InspectorSection>
                </>
              );
            }
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(rc.netCollectedDzd, language)}
                    tone="ok"
                    caption={`Net Encaissé · Timbre Art. 317 : +${formatMoney(rc.timbreFiscalDzd, language)}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'وصل تسليم نقدية رسمي' : 'Quittance de Versement'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Reçu de" value={rc.clientName} mono={false} />
                    <InspectorKeyValue label="Motif" value={rc.matterTitle} mono={false} />
                    <InspectorKeyValue label="Caissier" value={rc.cashierName} mono={false} />
                    <InspectorKeyValue label="Date" value={rc.createdAt.slice(0, 10)} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة وصل الموكل' : 'Imprimer Quittance Client'}
                    icon={<Printer size={14} />}
                    onClick={() => {
                      showToast(
                        isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée',
                        'success'
                      );
                      window.print();
                    }}
                  />
                </InspectorSection>
              </>
            );
          }}
        />

        {isNewReceiptModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="sq-elev-pop max-w-lg w-full">
              <div
                data-sq="panel"
                data-sq-border="solid"
                className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-4"
              >
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
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
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
                    <div
                      data-sq="card"
                      data-sq-border="none"
                      className="p-3 bg-neutral-50 dark:bg-neutral-800/60 space-y-1 font-mono text-[11px]"
                    >
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
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
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
          items={filteredCarpaMatters}
          keyExtractor={(m) => m.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
          getRowMeta={getCarpaRowMeta}
          getFanActions={getCarpaFanActions}
          getDetailActions={getCarpaDetailActions}
          isPinned={(m) => pinnedIds.has(m.id)}
          onTogglePin={(m) => handleTogglePin(m.id)}
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
        categoryLabel="CARPA Séquestre"
        avatarText="CA"
        branchName={
          activeCarpaMatter
            ? resolveRecordBranch(activeCarpaMatter, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={(activeCarpaMatter?.trustEscrowBalanceDzd || 0) > 0 ? 'Sous Séquestre' : 'Soldé'}
        statusClassName={
          (activeCarpaMatter?.trustEscrowBalanceDzd || 0) > 0
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
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
              <InspectorSection index={0} title={isAr ? 'تفصيل الأتعاب والمصاريف' : "Décompte d'Honoraires & Diligences"}>
                <InspectorCard>
                  <InspectorKeyValue
                    label="Convention d'honoraires"
                    value={formatMoney(m.retainerAmountDzd, language)}
                    tone="accent"
                  />
                  <InspectorKeyValue label="Droits de plaidoirie & timbres" value="12 000 DZD" isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'deontologie') {
            return (
              <InspectorSection index={0} title="Conformité Ordre des Avocats">
                <InspectorCard>
                  <InspectorKeyValue label="Séparation des comptes" value="Hermétique" tone="ok" mono={false} />
                  <InspectorKeyValue label="Contrôle Conseil de l'Ordre" value="Périodique" tone="ok" mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                  tone={(m.trustEscrowBalanceDzd || 0) > 0 ? 'accent' : 'ok'}
                  caption="Fonds Mandant Sous Séquestre CARPA (Inaliénable)"
                  action={
                    (m.trustEscrowBalanceDzd || 0) > 0
                      ? {
                          label: isAr ? 'الإفراج عن الوديعة' : 'Débloquer Séquestre',
                          onClick: () => handleReleaseTrustFunds(m),
                          tone: 'accent',
                        }
                      : undefined
                  }
                />
              </InspectorSection>
              <InspectorSection index={1}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'release',
                      label: isAr ? 'إفراج' : 'Débloquer',
                      icon: <Unlock size={16} />,
                      primary: true,
                      disabled: !m.trustEscrowBalanceDzd || m.trustEscrowBalanceDzd === 0,
                      onClick: () => handleReleaseTrustFunds(m),
                    },
                    {
                      id: 'statement',
                      label: isAr ? 'كشف CARPA' : 'Relevé CARPA',
                      icon: <Printer size={16} />,
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
                />
              </InspectorSection>
              <InspectorSection index={2} title={isAr ? 'بيانات الحساب' : 'Détails Séquestre'}>
                <InspectorCard>
                  <InspectorKeyValue label="Mandant" value={m.clientName} mono={false} />
                  <InspectorKeyValue label="Honoraires" value={formatMoney(m.retainerAmountDzd, language)} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
};
