import React, { useState, useMemo } from 'react';
import {
  Scale,
  CreditCard,
  Printer,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Eye,
  Send,
  Lock,
  Unlock,
  Receipt,
  Building2,
  X,
  FileCheck,
  Plus,
  Coins,
  AlertTriangle,
  Key,
  BookOpen,
  ArrowRightLeft,
  FileSpreadsheet,
  Check,
  FileText,
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
  DailyCashClosure,
} from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import {
  canReleaseEscrow,
  validateAndBalanceSCFEntry,
  calculateArticle317Stamp,
} from '../../../utils/legalRules';
import { CashClosureModal } from '../../modals/CashClosureModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const LegalTrustView: React.FC = () => {
  const { language, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
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

  // State for Avocat Associe (CARPA)
  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [carpaTab, setCarpaTab] = useState<'sequestre' | 'honoraires' | 'deontologie'>('sequestre');

  // State for Notaire Titulaire (Fiduciary Escrow)
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowAccount | null>(() => escrowAccounts[0] || null);
  const [escrowTab, setEscrowTab] = useState<'double_lock' | 'transactions' | 'virement'>('double_lock');
  const [cadastralVolume, setCadastralVolume] = useState('');
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [notaryPin, setNotaryPin] = useState('');
  const [releaseAmount, setReleaseAmount] = useState<number>(0);

  // State for Expert Comptable (SCF)
  const [selectedSCFEntry, setSelectedSCFEntry] = useState<SCFJournalEntry | null>(() => scfEntries[0] || null);
  const [scfJournalFilter, setScfJournalFilter] = useState<'ALL' | 'VE' | 'CA' | 'BQ' | 'OD'>('ALL');
  const [isSCFModalOpen, setIsSCFModalOpen] = useState(false);
  const [scfLibelle, setScfLibelle] = useState('');
  const [scfJournal, setScfJournal] = useState<'VE' | 'CA' | 'BQ' | 'OD'>('VE');
  const [scfRefPiece, setScfRefPiece] = useState('');
  const [scfDebitAmount, setScfDebitAmount] = useState<number>(100000);
  const [scfTvaRate, setScfTvaRate] = useState<number>(19);

  // State for Secretaire Caisse (Cash Desk & Art 317)
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(() => cashReceipts[0] || null);
  const [receiptClientName, setReceiptClientName] = useState('');
  const [receiptMatterTitle, setReceiptMatterTitle] = useState('');
  const [receiptAmountHt, setReceiptAmountHt] = useState<number>(50000);

  // -------------------------------------------------------------
  // NOTAIRE TITULAIRE HANDLERS
  // -------------------------------------------------------------
  const handleVerifyCadastre = () => {
    if (!selectedEscrow) return;
    if (!cadastralVolume.trim() || !cadastralNumber.trim()) {
      showToast(
        isAr ? 'يرجى إدخال رقم المجلد ورقم الشهر العقاري' : 'Veuillez saisir le volume et numéro de conservation',
        'error'
      );
      return;
    }
    const updated: EscrowAccount = {
      ...selectedEscrow,
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
        ? `تم التحقق وتثبيت الإشهار العقاري بالمحافظة العقارية (${cadastralVolume} / ${cadastralNumber})`
        : `Publicité foncière validée : ${cadastralVolume} ${cadastralNumber} enregistrée avec succès`,
      'success'
    );
  };

  const handleExecuteDoubleLockRelease = () => {
    if (!selectedEscrow) return;
    const amountToRelease = releaseAmount > 0 ? releaseAmount : selectedEscrow.currentBalanceDzd;
    const hasClearance = !!selectedEscrow.cadastralClearanceProof?.volume;

    const validation = canReleaseEscrow(
      selectedEscrow.currentBalanceDzd,
      amountToRelease,
      hasClearance,
      notaryPin,
      '2026'
    );

    if (!validation.allowed) {
      showToast(validation.reason || (isAr ? 'فشل فك الحراسة' : 'Déblocage refusé'), 'error');
      return;
    }

    const newTx = {
      id: `tx_${Date.now()}`,
      escrowAccountId: selectedEscrow.id,
      date: new Date().toISOString().split('T')[0],
      type: 'seller_final_payout' as const,
      amountDzd: amountToRelease,
      paymentMode: 'virement_bancaire' as const,
      bankReference: `VIR-NOT-${Math.floor(1000 + Math.random() * 9000)}`,
      authorizedByStaff: 'Me Notaire Titulaire',
      notes: `Déblocage de séquestre post-publicité foncière (${selectedEscrow.cadastralClearanceProof?.volume})`,
    };

    const newBalance = selectedEscrow.currentBalanceDzd - amountToRelease;
    const updated: EscrowAccount = {
      ...selectedEscrow,
      currentBalanceDzd: newBalance,
      totalDisbursedDzd: selectedEscrow.totalDisbursedDzd + amountToRelease,
      isLocked: newBalance > 0,
      transactions: [newTx, ...selectedEscrow.transactions],
    };

    updateEscrowAccount(updated);
    setSelectedEscrow(updated);
    setNotaryPin('');
    showToast(
      isAr
        ? `تم فك القفل المزدوج بنجاح وتحويل ${formatMoney(amountToRelease, language)} إلى حساب المستفيد`
        : `Double-verrou validé : ${formatMoney(amountToRelease, language)} transférés avec ordre de virement`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // EXPERT COMPTABLE HANDLERS (SCF)
  // -------------------------------------------------------------
  const handleSaveSCFEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scfLibelle.trim()) {
      showToast(isAr ? 'يرجى إدخال البيان' : 'Veuillez saisir le libellé de l\'écriture', 'error');
      return;
    }

    const baseAmount = Number(scfDebitAmount) || 0;
    const tvaAmount = Math.round(baseAmount * (scfTvaRate / 100));
    const totalTtc = baseAmount + tvaAmount;

    // Build balanced double-entry lines: 411000 Clients (Debit TTC) vs 706000 Prestations (Credit HT) + 445700 TVA (Credit TVA)
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
      showToast(balancing.error || 'Erreur d\'équilibrage', 'error');
      return;
    }

    const newEntry: SCFJournalEntry = {
      id: `scf_${Date.now()}`,
      accountId: 'acc_01',
      businessId: 'biz_legal',
      branchId: 'branch_legal_main',
      staffId: 'staff_01',
      entryNumber: `EC-2026-${Math.floor(500 + Math.random() * 500)}`,
      journalCode: scfJournal,
      date: new Date().toISOString().split('T')[0],
      pieceJustificativeRef: scfRefPiece.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
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
        ? `تم تسجيل وترحيل القيد المحاسبي SCF رقم ${newEntry.entryNumber} بنجاح`
        : `Écriture SCF ${newEntry.entryNumber} équilibrée et validée au Grand Livre`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // SECRETAIRE CAISSE HANDLERS (Cashier & Art 317)
  // -------------------------------------------------------------
  const handleSaveCashReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptClientName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم الموكل' : 'Veuillez saisir le nom du client', 'error');
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
      businessId: 'biz_legal',
      branchId: 'branch_legal_main',
      staffId: 'staff_01',
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
        ? `تم استلام ${formatMoney(newRc.netCollectedDzd, language)} نقداً وتوليد الوصل مع طابع المادة 317 (${formatMoney(newRc.timbreFiscalDzd, language)})`
        : `Encaissement espèces enregistré : ${formatMoney(newRc.netCollectedDzd, language)} (dont timbre Art. 317 : ${formatMoney(newRc.timbreFiscalDzd, language)})`,
      'success'
    );
  };

  // -------------------------------------------------------------
  // AVOCAT ASSOCIE (CARPA TRUST)
  // -------------------------------------------------------------
  const totalTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);

  const handleReleaseTrustFunds = (matter: LegalMatter) => {
    if (!matter.trustEscrowBalanceDzd || matter.trustEscrowBalanceDzd === 0) {
      showToast(isAr ? 'لا يوجد رصيد ودائع متبقي في هذا الحساب' : 'Aucun fond séquestre à débloquer', 'info');
      return;
    }
    const amount = matter.trustEscrowBalanceDzd;
    const updated: LegalMatter = {
      ...matter,
      trustEscrowBalanceDzd: 0,
    };
    updateMatter(updated);
    if (selectedMatter?.id === matter.id) {
      setSelectedMatter(updated);
    }
    showToast(
      isAr
        ? `تم الإفراج عن الوديعة (${formatMoney(amount, language)}) وتحويلها لحساب الموكل`
        : `Déblocage des fonds séquestre (${formatMoney(amount, language)}) validé par CARPA`,
      'success'
    );
  };

  const getCarpaActions = (m: LegalMatter): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الحساب' : 'Consulter Compte',
      icon: <Eye size={14} />,
      onClick: () => setSelectedMatter(m),
    },
    {
      label: isAr ? 'إفراج عن الوديعة' : 'Débloquer Séquestre',
      icon: <Unlock size={14} />,
      onClick: () => handleReleaseTrustFunds(m),
    },
    {
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
  ];

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: escrowAccounts.length > 0 || matters.length > 0,
  });

  if (showSkeleton && ((escrowAccounts.length === 0 && matters.length === 0) || networkMode === 'force_skeleton')) {
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

  // =========================================================================
  // RENDER WORKSPACE BASED ON OPERATIONAL ROLE
  // =========================================================================

  // 1. NOTAIRE TITULAIRE WORKSPACE: FIDUCIARY ESCROW VAULT (DOUBLE-LOCK)
  if (activeLegalRole === 'notaire_titulaire') {
    const totalEscrowDeposited = escrowAccounts.reduce((acc, a) => acc + a.totalDepositedDzd, 0);
    const totalEscrowBalance = escrowAccounts.reduce((acc, a) => acc + a.currentBalanceDzd, 0);
    const lockedEscrowsCount = escrowAccounts.filter((a) => a.isLocked).length;

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'حساب الحراسة والودائع العقارية (Séquestre Notarial)' : 'Compte Séquestre Notarial & Consignations'}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                  Double-Verrou Obligatoire
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'فك القفل المزدوج المشروط بالإشهار العقاري بالمحافظة العقارية ورمز الأمان للموثق'
                  : 'Libération conditionnelle des fonds de vente sous réserve de publicité foncière et validation PIN'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="outline"
              onClick={() => {
                showToast(isAr ? 'طباعة كشف الودائع العقارية' : 'Relevé des comptes séquestres imprimé', 'info');
                window.print();
              }}
              icon={<Printer size={14} />}
            >
              {isAr ? 'طباعة السجل' : 'Imprimer Registre'}
            </AtriumButton>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات حسابات الودائع والحراسة العقارية' : 'Fonds Mandants & Prix de Vente Séquestrés'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'ضمان حقوق الأطراف إلى غاية نشر العقد بالمحافظة العقارية' : 'Sécurisation des transactions immobilières jusqu\'à formalités cadastrales'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'إجمالي الودائع المودعة' : 'Total Fonds Consignés'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {formatMoney(totalEscrowDeposited, language)}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  {escrowAccounts.length} {isAr ? 'حسابات مودعة' : 'comptes sous mandat'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'حسابات بانتظار الإشهار العقاري' : 'En Attente Publicité Foncière'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {lockedEscrowsCount}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  {isAr ? 'معلقة إلى حين صدور رقم المجلد' : 'Bloqués (Conservation Foncière)'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">
                  {isAr ? 'الرصيد المحمي تحت الحراسة' : 'Solde Séquestre Actuel'}
                </span>
                <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Protégé Trésor
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatMoney(totalEscrowBalance, language)}
                </div>
                <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={11} />
                  {isAr ? 'حساب مصرفي مخصص مستقل' : 'Sous-compte Trésor séparé'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* UniversalDataCollection & 390px Inspector */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              <UniversalDataCollection<EscrowAccount>
                title={isAr ? 'سجل حسابات الحراسة العقارية' : 'Registre des Comptes Séquestres Immobiliers'}
                subtitle={isAr ? 'متابعة مبالغ الشراء المحجوزة لحين نقل الملكية' : 'Comptes affectés aux ventes immobilières et mainlevées'}
                items={escrowAccounts}
                keyExtractor={(a) => a.id}
                searchPlaceholder={isAr ? 'بحث برقم الملف، المشتري أو البائع...' : 'Rechercher dossier, acheteur, vendeur, conservation...'}
                searchFilter={(a, q) =>
                  a.matterReference.toLowerCase().includes(q.toLowerCase()) ||
                  a.clientName.toLowerCase().includes(q.toLowerCase()) ||
                  a.beneficiaryName.toLowerCase().includes(q.toLowerCase())
                }
                onSelectRow={(a) => setSelectedEscrow(a)}
                customActions={(a) => [
                  {
                    label: isAr ? 'فك القفل المزدوج' : 'Double-Verrou',
                    icon: <Unlock size={14} />,
                    onClick: () => {
                      setSelectedEscrow(a);
                      setEscrowTab('double_lock');
                    },
                  },
                  {
                    label: isAr ? 'أمر تحويل بنكي' : 'Ordre Virement',
                    icon: <Printer size={14} />,
                    onClick: () => {
                      setSelectedEscrow(a);
                      setEscrowTab('virement');
                    },
                  },
                ]}
                columns={[
                  {
                    id: 'matterReference',
                    header: isAr ? 'رقم الملف' : 'Réf Dossier',
                    width: '130px',
                    sortable: true,
                    renderCell: (a) => (
                      <div className="font-mono font-bold text-xs text-[#C4785A]">
                        {a.matterReference}
                      </div>
                    ),
                  },
                  {
                    id: 'parties',
                    header: isAr ? 'المشتري ➔ البائع المستفيد' : 'Acquéreur ➔ Vendeur',
                    renderCell: (a) => (
                      <div className="text-xs">
                        <span className="font-bold text-neutral-900 dark:text-white block">
                          {a.clientName}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          ➔ {a.beneficiaryName}
                        </span>
                      </div>
                    ),
                  },
                  {
                    id: 'balance',
                    header: isAr ? 'الرصيد المحجوز' : 'Solde Séquestre',
                    width: '150px',
                    sortable: true,
                    renderCell: (a) => (
                      <div className="font-mono text-xs font-bold text-[#C4785A]">
                        {formatMoney(a.currentBalanceDzd, language)}
                      </div>
                    ),
                  },
                  {
                    id: 'cadastre',
                    header: isAr ? 'المحافظة العقارية' : 'Publicité Foncière',
                    width: '160px',
                    renderCell: (a) =>
                      a.cadastralClearanceProof?.volume ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          {a.cadastralClearanceProof.volume} {a.cadastralClearanceProof.number}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 inline-flex items-center gap-1">
                          <AlertTriangle size={11} />
                          {isAr ? 'في انتظار الإشهار' : 'Attente Conservation'}
                        </span>
                      ),
                  },
                  {
                    id: 'status',
                    header: isAr ? 'حالة القفل' : 'Verrou',
                    width: '120px',
                    renderCell: (a) => (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          a.isLocked
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {a.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                        {a.isLocked ? (isAr ? 'مقفل 🔒' : 'Verrouillé') : (isAr ? 'محرر 🔓' : 'Libéré')}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* 390px Side Inspector */}
            {selectedEscrow && (
              <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-neutral-900 dark:text-white font-mono">
                        {selectedEscrow.matterReference}
                      </h3>
                      <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                        {selectedEscrow.clientName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEscrow(null)}
                    className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2 text-xs">
                  <button
                    onClick={() => setEscrowTab('double_lock')}
                    className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                      escrowTab === 'double_lock'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'القفل المزدوج' : 'Double-Verrou'}
                  </button>
                  <button
                    onClick={() => setEscrowTab('transactions')}
                    className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                      escrowTab === 'transactions'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'المعاملات' : 'Historique'}
                  </button>
                  <button
                    onClick={() => setEscrowTab('virement')}
                    className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                      escrowTab === 'virement'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'أمر التحويل' : 'Ordre Virement'}
                  </button>
                </div>

                {/* Inspector Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {escrowTab === 'double_lock' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2">
                        <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                          <span>Solde Sous Séquestre Notarial</span>
                          <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {selectedEscrow.isLocked ? 'Verrouillé 🔒' : 'Prêt / Libéré 🔓'}
                          </span>
                        </div>
                        <div className="text-2xl font-black font-mono text-white">
                          {formatMoney(selectedEscrow.currentBalanceDzd, language)}
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Bénéficiaire désigné : {selectedEscrow.beneficiaryName}
                        </p>
                      </div>

                      {/* Lock 1: Cadastral clearance */}
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <Building2 size={14} className="text-[#C4785A]" />
                            {isAr ? 'الشرط الأول: الإشهار بالمحافظة العقارية' : 'Verrou 1 : Publicité Foncière'}
                          </span>
                          {selectedEscrow.cadastralClearanceProof?.volume ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              {isAr ? 'تم التحقق' : 'Conforme'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600">En attente</span>
                          )}
                        </div>

                        {selectedEscrow.cadastralClearanceProof?.volume ? (
                          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 space-y-1">
                            <div className="font-mono text-xs font-bold">
                              Volume : {selectedEscrow.cadastralClearanceProof.volume} · Numéro : {selectedEscrow.cadastralClearanceProof.number}
                            </div>
                            <div className="text-[10px]">
                              Date d'enregistrement : {selectedEscrow.cadastralClearanceProof.recordedAt}
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
                              onClick={handleVerifyCadastre}
                              className="w-full py-1.5 rounded-lg bg-[#C4785A] text-white font-bold text-xs hover:bg-[#b06a4e] transition-colors"
                            >
                              {isAr ? 'تأكيد الإشهار العقاري' : 'Valider la Publicité'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Lock 2: Master PIN Code & Execution */}
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <Key size={14} className="text-[#C4785A]" />
                          {isAr ? 'الشرط الثاني: رمز الأمان للموثق Titulaire' : 'Verrou 2 : Code PIN Notaire Titulaire'}
                        </span>
                        <div className="space-y-2">
                          <LabelInput
                            label={isAr ? 'رمز الأمان PIN (الافتراضي: 2026)' : 'Code PIN Notaire (Défaut: 2026)'}
                            type="password"
                            placeholder="••••"
                            value={notaryPin}
                            onChange={(e) => setNotaryPin(e.target.value)}
                          />
                          <LabelInput
                            label={isAr ? 'مبلغ الإفراج (DZD) - اتركه فارغاً للكل' : 'Montant à Débloquer (DZD)'}
                            type="number"
                            placeholder={selectedEscrow.currentBalanceDzd.toString()}
                            value={releaseAmount || ''}
                            onChange={(e) => setReleaseAmount(Number(e.target.value))}
                          />
                        </div>

                        <button
                          onClick={handleExecuteDoubleLockRelease}
                          disabled={selectedEscrow.currentBalanceDzd <= 0}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                        >
                          <Unlock size={14} />
                          {isAr ? 'فك القفل المزدوج وإصدار أمر التحويل' : 'Débloquer & Émettre Virement'}
                        </button>
                      </div>
                    </div>
                  )}

                  {escrowTab === 'transactions' && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Mouvements Bancaires & Trésor
                      </span>
                      {selectedEscrow.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1 bg-white dark:bg-neutral-900"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-[10px] text-neutral-400">{tx.date}</span>
                            <span
                              className={`text-xs font-bold ${
                                tx.type === 'deposit_received' ? 'text-emerald-600' : 'text-blue-600'
                              }`}
                            >
                              {tx.type === 'deposit_received' ? '+' : '-'} {formatMoney(tx.amountDzd, language)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">
                            {tx.notes}
                          </p>
                          <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                            <span>Mode : {tx.paymentMode}</span>
                            <span className="font-mono">{tx.bankReference}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {escrowTab === 'virement' && (
                    <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3 text-xs">
                      <div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        <span className="font-bold uppercase tracking-wider text-[#C4785A] block">
                          Étude Notariale · Ordre de Virement Séquestre
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          République Algérienne Démocratique et Populaire
                        </span>
                      </div>
                      <div className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
                        <div>
                          <strong>Donneur d'ordre :</strong> Maître Notaire Titulaire
                        </div>
                        <div>
                          <strong>Compte débité :</strong> Compte Séquestre Trésor BNA N° 0010 0987 6543
                        </div>
                        <div>
                          <strong>Bénéficiaire :</strong> {selectedEscrow.beneficiaryName}
                        </div>
                        <div>
                          <strong>Montant :</strong>{' '}
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">
                            {formatMoney(selectedEscrow.currentBalanceDzd, language)}
                          </span>
                        </div>
                        <div>
                          <strong>Motif :</strong> Vente immobilière dossier {selectedEscrow.matterReference}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          showToast(isAr ? 'جاري طباعة أمر التحويل الرسمي' : 'Ordre de virement officiel imprimé', 'info');
                          window.print();
                        }}
                        className="w-full mt-2 py-2 rounded-lg bg-[#C4785A] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Printer size={13} />
                        {isAr ? 'طباعة أمر التحويل' : 'Imprimer le Virement'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. EXPERT COMPTABLE WORKSPACE: SCF GENERAL LEDGER (LOI 07-11)
  if (activeLegalRole === 'expert_comptable') {
    const totalDebitAll = scfEntries.reduce((acc, e) => acc + e.totalDebitDzd, 0);
    const totalCreditAll = scfEntries.reduce((acc, e) => acc + e.totalCreditDzd, 0);
    const isLedgerBalanced = Math.abs(totalDebitAll - totalCreditAll) === 0;

    const filteredEntries = scfJournalFilter === 'ALL'
      ? scfEntries
      : scfEntries.filter((e) => e.journalCode === scfJournalFilter);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
              <Scale size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'دفتر الأستاذ وميزان المراجعة SCF (القانون 07-11)' : 'Grand Livre & Journaux SCF (Loi 07-11)'}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Partie Double Équilibrée
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'محاسبة الالتزام، تسجيل القيود المزدوجة، متابعة حسابات الفئة 4، 5 و 7'
                  : 'Comptabilité d\'engagement, validation stricte Débit = Crédit et écritures auxiliaires'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="primary"
              onClick={() => setIsSCFModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'قيد محاسبي جديد' : 'Nouvelle Écriture SCF'}
            </AtriumButton>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'المؤشرات المحاسبية وميزان المراجعة' : 'Balance des Écritures & Conformité SCF'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الرقابة الصارمة على توازن القيد المحاسبي وحسابات الضرائب' : 'Équilibre fondamental des flux et traçabilité des pièces'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'إجمالي حركات المدين (Débit)' : 'Total Mouvements Débit'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {formatMoney(totalDebitAll, language)}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  {scfEntries.length} {isAr ? 'قيد مسجل' : 'écritures passées'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'إجمالي حركات الدائن (Crédit)' : 'Total Mouvements Crédit'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {formatMoney(totalCreditAll, language)}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  {isLedgerBalanced ? '✓ Équilibre Parfait (Δ = 0)' : 'Déséquilibre détecté'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">
                  {isAr ? 'توازن النظام المحاسبي' : 'Statut Grand Livre'}
                </span>
                <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                  SCF 07-11
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  100% Conforme
                </div>
                <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={11} />
                  {isAr ? 'قيود مدققة ومطابقة' : 'Zéro écart de clôture'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Area */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'سجل القيود المحاسبية اليومية' : 'Journal Général des Écritures Comptables'}
            </h2>
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-2xs">
              {(['ALL', 'VE', 'CA', 'BQ', 'OD'] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setScfJournalFilter(code)}
                  className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    backgroundColor: scfJournalFilter === code ? '#FCEEE8' : 'transparent',
                    color: scfJournalFilter === code ? 'var(--color-accent)' : '#71717A',
                  }}
                >
                  {code === 'ALL' ? (isAr ? 'الكل' : 'Tous') : code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              <UniversalDataCollection<SCFJournalEntry>
                title={isAr ? 'القيود المحاسبية' : 'Écritures SCF'}
                subtitle={isAr ? 'تسجيل القيود وفق مدونة الحسابات الوطنية' : 'Plan comptable général & justificatifs'}
                items={filteredEntries}
                keyExtractor={(e) => e.id}
                searchPlaceholder={isAr ? 'بحث برقم القيد، البيان، المرجع...' : 'Rechercher N° écriture, libellé, pièce...'}
                searchFilter={(e, q) =>
                  e.entryNumber.toLowerCase().includes(q.toLowerCase()) ||
                  e.libelle.toLowerCase().includes(q.toLowerCase()) ||
                  e.pieceJustificativeRef.toLowerCase().includes(q.toLowerCase())
                }
                onSelectRow={(e) => setSelectedSCFEntry(e)}
                columns={[
                  {
                    id: 'entryNumber',
                    header: isAr ? 'رقم القيد' : 'N° Écriture',
                    width: '130px',
                    sortable: true,
                    renderCell: (e) => (
                      <div className="font-mono font-bold text-xs text-[#C4785A]">
                        {e.entryNumber}
                      </div>
                    ),
                  },
                  {
                    id: 'journal',
                    header: 'Jrn',
                    width: '60px',
                    renderCell: (e) => (
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {e.journalCode}
                      </span>
                    ),
                  },
                  {
                    id: 'libelle',
                    header: isAr ? 'البيان والمرجع' : 'Libellé & Justificatif',
                    renderCell: (e) => (
                      <div>
                        <span className="font-bold text-xs text-neutral-900 dark:text-white block">
                          {e.libelle}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          Réf: {e.pieceJustificativeRef} · {e.date}
                        </span>
                      </div>
                    ),
                  },
                  {
                    id: 'debit',
                    header: isAr ? 'المدين' : 'Débit',
                    width: '130px',
                    sortable: true,
                    renderCell: (e) => (
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                        {formatMoney(e.totalDebitDzd, language)}
                      </span>
                    ),
                  },
                  {
                    id: 'credit',
                    header: isAr ? 'الدائن' : 'Crédit',
                    width: '130px',
                    sortable: true,
                    renderCell: (e) => (
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                        {formatMoney(e.totalCreditDzd, language)}
                      </span>
                    ),
                  },
                  {
                    id: 'status',
                    header: isAr ? 'التوازن' : 'Équilibre',
                    width: '100px',
                    renderCell: (e) => (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Équilibré
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* 390px Side Inspector */}
            {selectedSCFEntry && (
              <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                      <Scale size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-neutral-900 dark:text-white font-mono">
                        {selectedSCFEntry.entryNumber}
                      </h3>
                      <p className="text-[10px] text-neutral-500">
                        Journal {selectedSCFEntry.journalCode} · {selectedSCFEntry.date}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSCFEntry(null)}
                    className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Objet & Pièce Justificative
                    </span>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {selectedSCFEntry.libelle}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Pièce: {selectedSCFEntry.pieceJustificativeRef}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Ventilation des Lignes Comptables
                    </span>
                    {selectedSCFEntry.lines.map((l) => (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#C4785A]">
                            {l.accountNumber}
                          </span>
                          <div className="font-mono text-xs font-bold">
                            {l.debitDzd > 0 ? (
                              <span className="text-neutral-900 dark:text-white">
                                D: {formatMoney(l.debitDzd, language)}
                              </span>
                            ) : (
                              <span className="text-neutral-500">
                                C: {formatMoney(l.creditDzd, language)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                          {l.accountLabel}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-center font-bold font-mono">
                    Total Débit = Total Crédit = {formatMoney(selectedSCFEntry.totalDebitDzd, language)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Add SCF Entry */}
        {isSCFModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale size={20} className="text-[#C4785A]" />
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {isAr ? 'تسجيل قيد محاسبي مزدوج (SCF)' : 'Saisie d\'une Écriture Comptable SCF'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsSCFModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSCFEntry} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <LabelSelect
                    label={isAr ? 'دفتر اليومية' : 'Code Journal'}
                    value={scfJournal}
                    onChange={(e) => setScfJournal(e.target.value as any)}
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
                  label={isAr ? 'البيان المحاسبي *' : 'Libellé de l\'écriture *'}
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
                    label={isAr ? 'نسبة الرسم على القيمة المضافة TVA' : 'Taux TVA'}
                    value={scfTvaRate.toString()}
                    onChange={(e) => setScfTvaRate(Number(e.target.value))}
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
                    <span className="font-bold">{formatMoney(Math.round(scfDebitAmount * (scfTvaRate / 100)), language)}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1 font-bold text-[#C4785A]">
                    <span>Compte 411000 (Débit TTC):</span>
                    <span>{formatMoney(scfDebitAmount + Math.round(scfDebitAmount * (scfTvaRate / 100)), language)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <AtriumButton variant="ghost" size="sm" onClick={() => setIsSCFModalOpen(false)}>
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

  // 3. SECRETAIRE CAISSE WORKSPACE: CASH REGISTER & ART 317 TIMBRE FISCAL
  if (activeLegalRole === 'secretaire_caisse') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'الصندوق وطابع المادة 317 ومحضر الإغلاق' : 'Caisse Journalière & Timbre Art. 317 (Arrêté)'}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Espèces & Droit de Timbre
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'حساب الطابع الجبائي التصاعدي على الدفع نقداً وفق المادة 317 ومحضر المطابقة اليومي'
                  : 'Calcul automatique du timbre fiscal gradué pour tout paiement en espèces et procès-verbal d\'arrêté'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="outline"
              onClick={() => setIsClosureModalOpen(true)}
              icon={<ShieldCheck size={14} />}
            >
              {isAr ? 'محضر إغلاق الصندوق' : 'Arrêté de Caisse (PV)'}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              onClick={() => setIsNewReceiptModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'قبض نقدي جديد' : 'Encaisser Espèces'}
            </AtriumButton>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'حالة الصندوق والسيولة النقدية' : 'Situation de Caisse & Droits de Timbre'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الرقابة اليومية على النقدية المستلمة وطوابع الخزينة العمومية' : 'Recettes du jour et droits de timbre reversés au Trésor'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'الرصيد النظري للصندوق' : 'Solde Théorique en Caisse'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                  {formatMoney(dailyClosure.theoreticalCashDzd || 0, language)}
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  {cashReceipts.length} {isAr ? 'وصولات مقبوضة' : 'quittances émises'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {isAr ? 'طابع المادة 317 المحصل' : 'Timbre Fiscal Art. 317 Collecté'}
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {formatMoney(dailyClosure.totalTimbreAccruedDzd || 0, language)}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  {isAr ? 'مستحق الدفع لمفتشية الضرائب' : 'À reverser à la recette des impôts'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">
                  {isAr ? 'مطابقة الجرد الفعلي' : 'Arrêté Physique'}
                </span>
                <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {dailyClosure.status === 'balanced' ? 'Conforme' : 'Écart'}
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatMoney(dailyClosure.actualPhysicalCashCountedDzd || 0, language)}
                </div>
                <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={11} />
                  {isAr ? 'مطابق تماماً بدون أي فارق' : 'Écart = 0 DZD (Validé)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Area */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
              <UniversalDataCollection<CashReceipt>
                title={isAr ? 'سجل وصولات القبض النقدية' : 'Quittances de Caisse & Timbre Fiscal'}
                subtitle={isAr ? 'الوصولات المسلمة للزبائن مع تفصيل الطابع الجبائي' : 'Reçus de paiement en espèces selon Art. 317'}
                items={cashReceipts}
                keyExtractor={(r) => r.id}
                searchPlaceholder={isAr ? 'بحث برقم الوصل، الموكل أو الملف...' : 'Rechercher N° quittance, client, affaire...'}
                searchFilter={(r, q) =>
                  r.receiptNumber.toLowerCase().includes(q.toLowerCase()) ||
                  r.clientName.toLowerCase().includes(q.toLowerCase()) ||
                  r.matterTitle.toLowerCase().includes(q.toLowerCase())
                }
                onSelectRow={(r) => setSelectedReceipt(r)}
                columns={[
                  {
                    id: 'receiptNumber',
                    header: isAr ? 'رقم الوصل' : 'N° Quittance',
                    width: '130px',
                    sortable: true,
                    renderCell: (r) => (
                      <div className="font-mono font-bold text-xs text-[#C4785A]">
                        {r.receiptNumber}
                      </div>
                    ),
                  },
                  {
                    id: 'client',
                    header: isAr ? 'الموكل والملف' : 'Client & Prestation',
                    renderCell: (r) => (
                      <div>
                        <span className="font-bold text-xs text-neutral-900 dark:text-white block">
                          {r.clientName}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {r.matterTitle}
                        </span>
                      </div>
                    ),
                  },
                  {
                    id: 'totalHt',
                    header: 'HT',
                    width: '110px',
                    renderCell: (r) => (
                      <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                        {formatMoney(r.totalHtDzd, language)}
                      </span>
                    ),
                  },
                  {
                    id: 'timbre',
                    header: isAr ? 'طابع م 317' : 'Timbre Art. 317',
                    width: '120px',
                    renderCell: (r) => (
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        +{formatMoney(r.timbreFiscalDzd, language)}
                      </span>
                    ),
                  },
                  {
                    id: 'net',
                    header: isAr ? 'الصافي المقبوض' : 'Net Encaissé',
                    width: '130px',
                    sortable: true,
                    renderCell: (r) => (
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(r.netCollectedDzd, language)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* 390px Side Inspector */}
            {selectedReceipt && (
              <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                      <Receipt size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-neutral-900 dark:text-white font-mono">
                        {selectedReceipt.receiptNumber}
                      </h3>
                      <p className="text-[10px] text-neutral-500">
                        {selectedReceipt.clientName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
                    <div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="font-bold text-sm text-[#C4785A] block">
                        وصل تسليم نقدية رسمي
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Quittance de Versement en Espèces
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Reçu de :</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{selectedReceipt.clientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Motif :</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedReceipt.matterTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Montant HT :</span>
                        <span className="font-mono">{formatMoney(selectedReceipt.totalHtDzd, language)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">TVA 19% :</span>
                        <span className="font-mono">{formatMoney(selectedReceipt.tvaDzd, language)}</span>
                      </div>
                      <div className="flex justify-between text-amber-600 font-bold">
                        <span>Droit de Timbre (Art. 317) :</span>
                        <span className="font-mono">+{formatMoney(selectedReceipt.timbreFiscalDzd, language)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm text-emerald-600">
                        <span>Net Encaissé :</span>
                        <span className="font-mono">{formatMoney(selectedReceipt.netCollectedDzd, language)}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-[10px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 flex justify-between">
                      <span>Caissier : {selectedReceipt.cashierName}</span>
                      <span className="font-mono">{selectedReceipt.createdAt.slice(0, 10)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      showToast(isAr ? 'طباعة الوصل الرسمي للزبون' : 'Quittance officielle imprimée', 'success');
                      window.print();
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#C4785A] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Printer size={14} />
                    {isAr ? 'طباعة وصل الموكل' : 'Imprimer Quittance Client'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: New Cash Receipt */}
        {isNewReceiptModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-[#C4785A]" />
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {isAr ? 'قبض مبلغ نقدي مع طابع المادة 317' : 'Encaissement Espèces & Timbre Art. 317'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsNewReceiptModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
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

                {/* Live Timbre Preview */}
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
                      <p className="text-[10px] text-neutral-400 font-sans mt-1">
                        Droit de timbre gradué (Art. 317 du Code du Timbre) : Exonéré &lt; 500 DA, 20-200 DA, puis 1% plafonné à 2 500 DA.
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <AtriumButton variant="ghost" size="sm" onClick={() => setIsNewReceiptModalOpen(false)}>
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </AtriumButton>
                  <AtriumButton variant="primary" size="sm" type="submit">
                    {isAr ? 'توليد الوصل والقبض' : 'Valider l\'Encaissement'}
                  </AtriumButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Daily Cash Closure */}
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

  // 4. DEFAULT: AVOCAT ASSOCIE (CARPA TRUST & DILIGENCES)
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'حساب الحراسة والودائع والأتعاب (Séquestre CARPA)' : 'Compte Séquestre CARPA & Honoraires Avocat'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Ordre des Avocats
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'فصل أموال الموكلين المودعة تحت الحراسة القضائية عن الأتعاب التشغيلية للمكتب'
                : 'Séparation stricte des fonds mandants (séquestre) et des honoraires de diligence'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(isAr ? 'طباعة كشف حساب الودائع CARPA' : 'Relevé séquestre CARPA imprimé', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'كشف CARPA' : 'Relevé CARPA'}
          </AtriumButton>
        </div>
      </div>

      {/* 3 Metrics Cards */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'إدارة أموال الموكلين والودائع القضائية' : 'Comptabilité des Fonds Mandants & Diligences'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'الفصل المحاسبي الصارم بين أتعاب المحامي والمبالغ المودعة على ذمة الأحكام'
              : 'Fonds séquestre protégés et décomptes d\'honoraires selon déontologie du barreau'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'أتعاب الدفاع والخدمات' : 'Honoraires & Diligences'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalRetainers, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {matters.length} {isAr ? 'قضية محصلة' : 'affaires conventionnées'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'قضايا مودعة تحت الحراسة' : 'Dossiers Sous Séquestre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {matters.filter((m) => (m.trustEscrowBalanceDzd || 0) > 0).length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'خاضعة لإشراف نقابة المحامين' : 'Contrôlés sous égide déontologique'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الودائع (Séquestre)' : 'Fonds Séquestre Protégés'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Séquestre CARPA
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalTrust, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {matters.length} {isAr ? 'حساب مصفى' : 'comptes audités'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection Area */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<LegalMatter>
              title={isAr ? 'سجل الحسابات والودائع' : 'Relevé des Comptes Séquestres CARPA & Honoraires'}
              subtitle={isAr ? 'متابعة الودائع وتصفية الأموال' : 'Comptes affectés et décomptes déontologiques du barreau'}
              items={matters}
              keyExtractor={(m) => m.id}
              searchPlaceholder={isAr ? 'بحث برقم القضية، الموكل، الموضوع...' : 'Rechercher dossier, client, affaire, CARPA...'}
              searchFilter={(m, query) =>
                m.title.toLowerCase().includes(query.toLowerCase()) ||
                m.clientName.toLowerCase().includes(query.toLowerCase()) ||
                m.matterNumber.toLowerCase().includes(query.toLowerCase()) ||
                (m.assignedLawyer || '').toLowerCase().includes(query.toLowerCase())
              }
              onSelectRow={(m) => setSelectedMatter(m)}
              customActions={(m) => getCarpaActions(m)}
              columns={[
                {
                  id: 'matterNumber',
                  header: isAr ? 'رقم القضية' : 'N° Dossier',
                  width: '130px',
                  sortable: true,
                  renderCell: (m) => (
                    <div className="font-mono font-bold text-xs text-[#C4785A]">
                      {m.matterNumber}
                    </div>
                  ),
                },
                {
                  id: 'matter',
                  header: isAr ? 'الموضوع' : 'Affaire & Objet',
                  renderCell: (m) => (
                    <div>
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                        {m.title}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {m.category} · {m.courtJurisdiction || 'Tribunal'}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'client',
                  header: isAr ? 'الموكل' : 'Client Mandant',
                  width: '180px',
                  renderCell: (m) => (
                    <div className="text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                        {m.clientName}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {m.clientPhone || '0550 00 00 00'}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'retainer',
                  header: isAr ? 'أتعاب المكتب' : 'Honoraires',
                  width: '140px',
                  sortable: true,
                  renderCell: (m) => (
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </span>
                  ),
                },
                {
                  id: 'trust',
                  header: isAr ? 'رصيد Séquestre' : 'Séquestre CARPA',
                  width: '160px',
                  sortable: true,
                  renderCell: (m) => (
                    <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: isAr ? 'الرقابة' : 'Audit CARPA',
                  width: '130px',
                  renderCell: () => (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                      <ShieldCheck size={11} />
                      {isAr ? 'مطابق ومحمي' : 'Conforme'}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {/* 390px Side Inspector */}
          {selectedMatter && (
            <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 dark:text-white font-mono">
                      {selectedMatter.matterNumber}
                    </h3>
                    <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                      {selectedMatter.clientName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatter(null)}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2 text-xs">
                <button
                  onClick={() => setCarpaTab('sequestre')}
                  className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                    carpaTab === 'sequestre'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'الودائع Séquestre' : 'Séquestre'}
                </button>
                <button
                  onClick={() => setCarpaTab('honoraires')}
                  className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                    carpaTab === 'honoraires'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'الأتعاب والمصاريف' : 'Honoraires'}
                </button>
                <button
                  onClick={() => setCarpaTab('deontologie')}
                  className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${
                    carpaTab === 'deontologie'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {isAr ? 'المطابقة النقابية' : 'CARPA & Éthique'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {carpaTab === 'sequestre' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                      <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                        <span>Fonds Mandant Sous Séquestre</span>
                        <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Inaliénable
                        </span>
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-white">
                        {formatMoney(selectedMatter.trustEscrowBalanceDzd || 0, language)}
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Montant bloqué sur sous-compte CARPA jusqu'à décision judiciaire exécutoire.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold block text-neutral-900 dark:text-white">Déblocage de Séquestre</span>
                        <span className="text-[10px] text-neutral-500">Sur présentation du jugement définitif</span>
                      </div>
                      <button
                        onClick={() => handleReleaseTrustFunds(selectedMatter)}
                        disabled={!selectedMatter.trustEscrowBalanceDzd || selectedMatter.trustEscrowBalanceDzd === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors"
                      >
                        Débloquer
                      </button>
                    </div>
                  </div>
                )}

                {carpaTab === 'honoraires' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Décompte d'Honoraires & Diligences
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Convention d'honoraires:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {formatMoney(selectedMatter.retainerAmountDzd, language)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Droits de plaidoirie & timbres:</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">12 000 DZD</span>
                      </div>
                    </div>
                  </div>
                )}

                {carpaTab === 'deontologie' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                        Conformité Déontologique Ordre des Avocats
                      </span>
                      <div className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
