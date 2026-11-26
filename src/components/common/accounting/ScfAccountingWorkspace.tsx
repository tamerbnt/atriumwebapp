import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Landmark,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Unlock,
  X,
} from 'lucide-react';
import type {
  ScfAccountClass,
  ScfAccountType,
  ScfJournalCode,
  ScfJournalEntry,
} from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { isExecutiveRole } from '../../../utils/businessConfig';
import {
  buildScfCsvContent,
  computeBankCashReconciliation,
  computeGeneralLedger,
  computeTrialBalance,
  computeTvaG50AidReport,
  getG50PreparationDisclaimer,
} from '../../../utils/scfAccountingEngine';
import {
  selectCurrentBusinessConfigFromState,
  selectCurrentJournalEntriesFromState,
  selectCurrentScfAccountsFromState,
  selectCurrentScfPeriodsFromState,
  selectCurrentScfPostingFailuresFromState,
  showToast,
  useAtriumActions,
  useAtriumSelector,
  shallowEqualObjects,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { KineticModalShell } from '../../ui/kinetic';
import { ScfManualEntryModal } from './ScfManualEntryModal';
import { ScfPrintReportModal, type ScfPrintReportKind } from './ScfPrintReportModal';

type ScfSubTab =
  | 'journal'
  | 'queue'
  | 'trial_balance'
  | 'general_ledger'
  | 'reconciliation'
  | 'g50_aid'
  | 'periods_chart';

interface ScfAccountingWorkspaceProps {
  sourceVerticalFilter?: string;
  compactHeader?: boolean;
}

function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ScfAccountingWorkspace: React.FC<ScfAccountingWorkspaceProps> = ({
  sourceVerticalFilter,
  compactHeader = false,
}) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    scfAccounts,
    scfPeriods,
    journalEntries,
    scfPostingFailures,
    currentUser,
    businessConfig,
  } = useAtriumSelector(
    (s) => ({
      scfAccounts: selectCurrentScfAccountsFromState(s),
      scfPeriods: selectCurrentScfPeriodsFromState(s),
      journalEntries: selectCurrentJournalEntriesFromState(s),
      scfPostingFailures: selectCurrentScfPostingFailuresFromState(s),
      currentUser: s.currentUser,
      businessConfig: selectCurrentBusinessConfigFromState(s),
    }),
    shallowEqualObjects
  );

  const {
    reverseJournalEntry,
    retryScfPostingFailure,
    dismissScfPostingFailure,
    setAccountingPeriodStatus,
    toggleReconcileJournalLine,
    upsertScfAccount,
  } = useAtriumActions();

  const [activeTab, setActiveTab] = useState<ScfSubTab>('journal');
  const [verticalScope, setVerticalScope] = useState<'all' | 'vertical'>(
    sourceVerticalFilter ? 'vertical' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [journalFilter, setJournalFilter] = useState<ScfJournalCode | 'ALL'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [selectedGlAccount, setSelectedGlAccount] = useState<string>('411000');
  const [selectedReconAccount, setSelectedReconAccount] = useState<string>('512000');
  const [reconStatementRef, setReconStatementRef] = useState('REL-BQ-01');
  const [reconStatementDate, setReconStatementDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [g50Period, setG50Period] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  // Modals & Inline Forms
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<ScfJournalEntry | null>(null);
  const [reversalDate, setReversalDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [reversalReason, setReversalReason] = useState('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [printKind, setPrintKind] = useState<ScfPrintReportKind | null>(null);

  // Period management form
  const [periodInput, setPeriodInput] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [periodReason, setPeriodReason] = useState('');

  // Custom chart account form
  const [newAcctCode, setNewAcctCode] = useState('');
  const [newAcctLabelFr, setNewAcctLabelFr] = useState('');
  const [newAcctClass, setNewAcctClass] = useState<string>('6');
  const [newAcctReconcilable, setNewAcctReconcilable] = useState(false);

  const canManagePeriods =
    isExecutiveRole(currentUser?.role, currentUser?.roleRank) ||
    currentUser?.role === 'expert_comptable';

  const scopedEntries = useMemo(() => {
    if (verticalScope === 'vertical' && sourceVerticalFilter) {
      return journalEntries.filter((e) => e.sourceVertical === sourceVerticalFilter);
    }
    return journalEntries;
  }, [journalEntries, verticalScope, sourceVerticalFilter]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedEntries.filter((e) => {
      if (journalFilter !== 'ALL' && e.journalCode !== journalFilter) return false;
      if (periodFilter !== 'ALL' && e.periodKey !== periodFilter) return false;
      if (q) {
        const lineMatch = e.lines.some(
          (l) =>
            l.accountCode.toLowerCase().includes(q) ||
            (l.partyName || '').toLowerCase().includes(q)
        );
        if (
          !e.entryNumber.toLowerCase().includes(q) &&
          !e.pieceRef.toLowerCase().includes(q) &&
          !e.libelle.toLowerCase().includes(q) &&
          !lineMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [scopedEntries, journalFilter, periodFilter, searchQuery]);

  const pendingFailures = useMemo(
    () => scfPostingFailures.filter((f) => f.status === 'pending'),
    [scfPostingFailures]
  );

  const ledgerTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const e of scopedEntries) {
      debit += e.totalDebitCentimes;
      credit += e.totalCreditCentimes;
    }
    return {
      debit,
      credit,
      balanced: debit === credit,
    };
  }, [scopedEntries]);

  const mergedPeriods = useMemo(() => {
    const map = new Map<
      string,
      {
        periodKey: string;
        status: 'open' | 'closed';
        reopenReason?: string;
        updatedAt?: string;
      }
    >();
    for (const m of businessConfig?.accountingPeriodClosedMonths || []) {
      map.set(m, { periodKey: m, status: 'closed' });
    }
    for (const p of scfPeriods) {
      map.set(p.periodKey, {
        periodKey: p.periodKey,
        status: p.status,
        reopenReason: p.reopenReason,
        updatedAt: p.updatedAt,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      b.periodKey.localeCompare(a.periodKey)
    );
  }, [scfPeriods, businessConfig?.accountingPeriodClosedMonths]);

  const closedPeriodsCount = useMemo(
    () => mergedPeriods.filter((p) => p.status === 'closed').length,
    [mergedPeriods]
  );

  const availablePeriodOptions = useMemo(() => {
    const set = new Set<string>([new Date().toISOString().slice(0, 7)]);
    for (const e of scopedEntries) set.add(e.periodKey);
    for (const p of mergedPeriods) set.add(p.periodKey);
    return [
      { value: 'ALL', label: isAr ? 'كل الفترات' : isEn ? 'All Periods' : 'Toutes périodes' },
      ...Array.from(set)
        .sort((a, b) => b.localeCompare(a))
        .map((pk) => ({ value: pk, label: pk })),
    ];
  }, [scopedEntries, mergedPeriods, isAr, isEn]);

  const accountSelectOptions = useMemo(
    () =>
      scfAccounts.map((a) => ({
        value: a.code,
        label: `${a.code} · ${isAr ? a.labelAr : isEn ? a.labelEn : a.labelFr}`,
      })),
    [scfAccounts, isAr, isEn]
  );

  const reconcilableOptions = useMemo(() => {
    const recs = scfAccounts.filter((a) => a.isReconcilable);
    const list = recs.length > 0 ? recs : scfAccounts.filter((a) => a.code.startsWith('5'));
    return list.map((a) => ({
      value: a.code,
      label: `${a.code} · ${isAr ? a.labelAr : isEn ? a.labelEn : a.labelFr}`,
    }));
  }, [scfAccounts, isAr, isEn]);

  const trialBalance = useMemo(
    () =>
      computeTrialBalance(scopedEntries, scfAccounts, {
        periodKey: periodFilter,
        journalCode: journalFilter,
      }),
    [scopedEntries, scfAccounts, periodFilter, journalFilter]
  );

  const generalLedger = useMemo(() => {
    const res = computeGeneralLedger(scopedEntries, selectedGlAccount, {
      periodKey: periodFilter,
    });
    const acct = scfAccounts.find((a) => a.code === selectedGlAccount);
    return {
      ...res,
      accountLabel: acct ? (isAr ? acct.labelAr : isEn ? acct.labelEn : acct.labelFr) : selectedGlAccount,
    };
  }, [scopedEntries, selectedGlAccount, periodFilter, scfAccounts, isAr, isEn]);

  const bankRecon = useMemo(
    () =>
      computeBankCashReconciliation(scopedEntries, selectedReconAccount, {
        periodKey: periodFilter,
      }),
    [scopedEntries, selectedReconAccount, periodFilter]
  );

  const g50Report = useMemo(
    () => computeTvaG50AidReport(scopedEntries, g50Period, language),
    [scopedEntries, g50Period, language]
  );

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;
    const res = reverseJournalEntry(reversalTarget.id, reversalDate, reversalReason);
    if (res.ok || res.errorCode === 'SCF_PERIOD_CLOSED') {
      setReversalTarget(null);
      setReversalReason('');
    }
  };

  const handleExportJournalCsv = () => {
    const csv = buildScfCsvContent(
      ['N° Écriture', 'Journal', 'Date', 'Période', 'Pièce', 'Libellé', 'Débit DA', 'Crédit DA', 'Statut'],
      filteredEntries.map((e) => [
        e.entryNumber,
        e.journalCode,
        e.entryDate,
        e.periodKey,
        e.pieceRef,
        e.libelle,
        centimesToDzd(e.totalDebitCentimes).toFixed(2),
        centimesToDzd(e.totalCreditCentimes).toFixed(2),
        e.status,
      ])
    );
    triggerCsvDownload(`atrium-scf-journal-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isEn ? 'Journal Exported' : 'Journal SCF exporté',
      message: `${filteredEntries.length} écritures`,
    });
  };

  const handleExportTrialBalanceCsv = () => {
    const csv = buildScfCsvContent(
      ['Compte', 'Intitulé', 'Classe', 'Mvt Débit DA', 'Mvt Crédit DA', 'Solde Débiteur DA', 'Solde Créditeur DA'],
      trialBalance.rows.map((r) => [
        r.accountCode,
        r.accountLabel,
        r.scfClass,
        centimesToDzd(r.totalDebitCentimes).toFixed(2),
        centimesToDzd(r.totalCreditCentimes).toFixed(2),
        centimesToDzd(r.closingDebitBalanceCentimes).toFixed(2),
        centimesToDzd(r.closingCreditBalanceCentimes).toFixed(2),
      ]),
      getG50PreparationDisclaimer(language)
    );
    triggerCsvDownload(`atrium-balance-generale-${periodFilter}.csv`, csv);
    showToast({
      type: 'success',
      title: isAr ? 'تم تصدير الميزان' : isEn ? 'Trial Balance Exported' : 'Balance Générale exportée',
      message: `${trialBalance.rows.length} comptes`,
    });
  };

  const handleExportGlCsv = () => {
    const csv = buildScfCsvContent(
      ['Date', 'N° Écriture', 'Journal', 'Pièce', 'Libellé', 'Débit DA', 'Crédit DA', 'Solde Progressif DA'],
      generalLedger.rows.map((r) => [
        r.entryDate,
        r.entryNumber,
        r.journalCode,
        r.pieceRef,
        r.libelle,
        centimesToDzd(r.debitCentimes).toFixed(2),
        centimesToDzd(r.creditCentimes).toFixed(2),
        centimesToDzd(r.runningBalanceCentimes).toFixed(2),
      ])
    );
    triggerCsvDownload(`atrium-grand-livre-${selectedGlAccount}-${periodFilter}.csv`, csv);
    showToast({
      type: 'success',
      title: isAr ? 'تم تصدير دفتر الأستاذ' : isEn ? 'General Ledger Exported' : 'Grand Livre exporté',
      message: `${selectedGlAccount} · ${generalLedger.rows.length} lignes`,
    });
  };

  const handleExportG50Csv = () => {
    const csv = buildScfCsvContent(
      ['Rubrique', 'Compte SCF', 'Montant DA'],
      [
        ['CA Imposable HT', '700/706', centimesToDzd(g50Report.taxableTurnoverHtCentimes).toFixed(2)],
        ['TVA Collectée', '445700', centimesToDzd(g50Report.tvaCollectedCentimes).toFixed(2)],
        ['TVA Déductible', '445600', centimesToDzd(g50Report.tvaDeductibleCentimes).toFixed(2)],
        ['TVA Nette à Payer', '4457-4456', centimesToDzd(g50Report.netTvaPayableCentimes).toFixed(2)],
        ['Précompte TVA à Reporter', '4456', centimesToDzd(g50Report.tvaCreditCarryForwardCentimes).toFixed(2)],
        ['Droits de Timbre Fiscal', '447000', centimesToDzd(g50Report.timbreFiscalCentimes).toFixed(2)],
        ['IRG Salaires', '442000', centimesToDzd(g50Report.irgSalariesCentimes).toFixed(2)],
        ['Cotisations CNAS', '431000', centimesToDzd(g50Report.cnasPayableCentimes).toFixed(2)],
      ],
      g50Report.disclaimer
    );
    triggerCsvDownload(`atrium-aide-g50-${g50Period}.csv`, csv);
    showToast({
      type: 'success',
      title: isAr ? 'تم تصدير تقرير G50' : isEn ? 'G50 Aid Exported' : 'Aide G50 exportée',
      message: g50Period,
    });
  };

  const handleCreateCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcctCode.trim() || !newAcctLabelFr.trim()) return;
    const clsNum = Number(newAcctClass);
    const scfClass = (clsNum >= 1 && clsNum <= 7 ? clsNum : 4) as ScfAccountClass;
    const accountType: ScfAccountType =
      scfClass === 1
        ? 'equity'
        : scfClass === 2 || scfClass === 3 || scfClass === 5
          ? 'asset'
          : scfClass === 6
            ? 'expense'
            : scfClass === 7
              ? 'revenue'
              : 'liability';
    const normalBalance = scfClass === 1 || scfClass === 7 ? 'credit' : 'debit';
    const saved = upsertScfAccount({
      code: newAcctCode,
      labelFr: newAcctLabelFr,
      scfClass,
      normalBalance,
      accountType,
      isReconcilable: newAcctReconcilable,
    });
    if (saved) {
      setNewAcctCode('');
      setNewAcctLabelFr('');
      setNewAcctReconcilable(false);
    }
  };

  const tabs: Array<{ id: ScfSubTab; label: string; badge?: number }> = [
    { id: 'journal', label: isAr ? 'اليومية' : isEn ? 'Journal' : 'Journal', badge: scopedEntries.length },
    {
      id: 'queue',
      label: isAr ? 'غير مرحّلة' : isEn ? 'Unposted Queue' : 'En attente',
      badge: pendingFailures.length,
    },
    { id: 'trial_balance', label: isAr ? 'ميزان المراجعة' : isEn ? 'Trial Balance' : 'Balance Générale' },
    { id: 'general_ledger', label: isAr ? 'دفتر الأستاذ' : isEn ? 'General Ledger' : 'Grand Livre' },
    { id: 'reconciliation', label: isAr ? 'المطابقة البنكية' : isEn ? 'Reconciliation' : 'Rapprochement' },
    { id: 'g50_aid', label: isAr ? 'تحضير G50 / TVA' : isEn ? 'TVA / G50 Aid' : 'Aide TVA / G50' },
    { id: 'periods_chart', label: isAr ? 'الفترات والحسابات' : isEn ? 'Periods & Chart' : 'Périodes & Plan' },
  ];

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'} data-testid="scf-accounting-workspace">
      {/* Header & KPI Strip */}
      <div
        data-sq="card"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Scale size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <div>
              <h2 className={compactHeader ? 't-label font-semibold text-black dark:text-white' : 't-card font-semibold text-black dark:text-white'}>
                {isAr
                  ? 'المحاسبة العامة المزدوجة (SCF 07-11)'
                  : isEn
                    ? 'Shared SCF Accounting Engine (Loi 07-11)'
                    : 'Comptabilité Générale Partagée SCF (Loi 07-11)'}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55">
                {isAr
                  ? 'الترحيل التلقائي، ميزان المراجعة، المطابقة البنكية ومساعدة G50'
                  : isEn
                    ? 'Cross-vertical double-entry ledger, trial balance, bank reconciliation & G50 prep'
                    : 'Moteur partie double inter-métiers, Balance Générale, Rapprochement & Aide G50'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sourceVerticalFilter && (
              <button
                type="button"
                onClick={() => setVerticalScope((v) => (v === 'vertical' ? 'all' : 'vertical'))}
                className="px-3 py-1.5 rounded-lg border border-[var(--atr-divider)] t-cap font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                {verticalScope === 'vertical'
                  ? isAr ? 'عرض كل النشاطات' : isEn ? 'Show All Verticals' : 'Tout le cabinet / société'
                  : isAr ? 'نشاطي فقط' : isEn ? 'Filter This Vertical' : 'Ce module uniquement'}
              </button>
            )}
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsNewModalOpen(true)}
              data-testid="scf-new-entry-btn"
            >
              {isAr ? 'قيد محاسبي جديد' : isEn ? 'New SCF Entry' : 'Nouvelle Écriture SCF'}
            </AtriumButton>
          </div>
        </div>

        {/* Unified 4-metric strip (flat grid with hairline dividers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[var(--atr-divider)] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[var(--atr-divider)] tabular-nums">
          <div className="p-3">
            <div className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'القيود المرحّلة' : isEn ? 'Posted Entries' : 'Écritures comptables'}
            </div>
            <div className="t-card font-semibold text-black dark:text-white mt-0.5">
              {scopedEntries.length}
            </div>
          </div>
          <div className="p-3">
            <div className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'توازن القيد المزدوج' : isEn ? 'Double-Entry Balance' : 'Équilibre Partie Double'}
            </div>
            <div className="t-card font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>{formatMoney(centimesToDzd(ledgerTotals.debit), language)}</span>
              <span className="t-cap font-mono text-emerald-600 dark:text-emerald-300">
                {ledgerTotals.balanced ? 'Δ=0' : 'Δ≠0'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className="p-3 text-start hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'قيود قيد الانتظار' : isEn ? 'Unposted Queue' : 'File d’attente SCF'}
            </div>
            <div
              className={`t-card font-semibold mt-0.5 flex items-center gap-1.5 ${
                pendingFailures.length > 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-black dark:text-white'
              }`}
            >
              {pendingFailures.length > 0 && <AlertTriangle size={16} />}
              <span data-testid="scf-pending-queue-count">{pendingFailures.length}</span>
            </div>
          </button>
          <div className="p-3">
            <div className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'الفترات المغلقة' : isEn ? 'Closed Periods' : 'Périodes clôturées'}
            </div>
            <div className="t-card font-semibold text-black dark:text-white mt-0.5">
              {closedPeriodsCount}
            </div>
          </div>
        </div>

        {/* Sub-tab Strip */}
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--atr-divider)] pt-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`scf-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg t-cap font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : 'bg-[#F5F1EC] dark:bg-[#1E1C1A] text-black/75 dark:text-white/75 hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] tabular-nums ${
                      tab.id === 'queue'
                        ? 'bg-amber-500 text-white'
                        : isActive
                          ? 'bg-white/20 text-current'
                          : 'bg-black/10 dark:bg-white/10'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: JOURNAL */}
      {activeTab === 'journal' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <LabelInput
                label={isAr ? 'بحث' : isEn ? 'Search' : 'Rechercher'}
                placeholder={isAr ? 'رقم القيد، المرجع، الحساب...' : 'N° EC, pièce, compte, tiers...'}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <LabelSelect
              label={isAr ? 'دفتر اليومية' : 'Journal'}
              value={journalFilter}
              onChange={(v) => setJournalFilter(v as ScfJournalCode | 'ALL')}
              options={[
                { value: 'ALL', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
                { value: 'VE', label: 'VE · Ventes' },
                { value: 'AC', label: 'AC · Achats' },
                { value: 'BQ', label: 'BQ · Banque' },
                { value: 'CA', label: 'CA · Caisse' },
                { value: 'PA', label: 'PA · Paie' },
                { value: 'ST', label: 'ST · Stocks' },
                { value: 'OD', label: 'OD · Divers' },
              ]}
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <LabelSelect
                  label={isAr ? 'الفترة' : isEn ? 'Period' : 'Période'}
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  options={availablePeriodOptions}
                />
              </div>
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportJournalCsv}
              >
                CSV
              </AtriumButton>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-[var(--atr-divider)] rounded-xl">
              <BookOpen size={24} className="mx-auto text-black/35 dark:text-white/35" />
              <p className="t-small font-medium text-black dark:text-white">
                {isAr ? 'لا توجد قيود مسجلة بعد' : isEn ? 'No SCF entries recorded yet' : 'Aucune écriture SCF enregistrée'}
              </p>
              <p className="t-cap text-black/55 dark:text-white/55">
                {isAr
                  ? 'تصدر الفواتير أو المدفوعات تلقائياً قيوداً هنا، أو أضف قيداً يدوياً.'
                  : isEn
                    ? 'Issued invoices, payments, payroll, stock, or POS sales auto-post here, or create a manual entry.'
                    : 'L’émission de factures, règlements, paie, achats ou stocks alimente automatiquement ce journal.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--atr-divider)] border border-[var(--atr-divider)] rounded-xl overflow-hidden">
              {filteredEntries.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                return (
                  <div key={entry.id} className="bg-white dark:bg-[#262422]">
                    <div
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                            {entry.entryNumber}
                          </span>
                          <span className="font-mono t-cap px-1.5 py-0.5 rounded bg-[#F3EDE7] dark:bg-[#1E1C1A] text-black/80 dark:text-white/80">
                            {entry.journalCode}
                          </span>
                          <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
                            {entry.entryDate} · {entry.pieceRef}
                          </span>
                          {entry.currency !== 'DZD' && (
                            <span className="font-mono t-cap text-blue-700 dark:text-blue-300">
                              [{entry.currency} @ {entry.fxRate}]
                            </span>
                          )}
                          {entry.status === 'reversed' && (
                            <span className="t-cap font-semibold text-amber-700 dark:text-amber-300">
                              ({isAr ? 'معكوس' : isEn ? 'Reversed' : 'Contre-passée'})
                            </span>
                          )}
                        </div>
                        <div className="t-small font-medium text-black dark:text-white truncate">
                          {entry.libelle}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 tabular-nums">
                        <span className="t-small font-semibold text-black dark:text-white">
                          {formatMoney(centimesToDzd(entry.totalDebitCentimes), language)}
                        </span>
                        {entry.status === 'posted' && entry.sourceEventType !== 'reversal' && (
                          <AtriumButton
                            variant="outline"
                            size="xs"
                            icon={<ArrowLeftRight size={12} />}
                            data-testid={`scf-reverse-btn-${entry.id}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setReversalTarget(entry);
                              setReversalDate(new Date().toISOString().slice(0, 10));
                              setReversalReason('');
                            }}
                          >
                            {isAr ? 'عكس القيد' : isEn ? 'Reverse' : 'Contre-passer'}
                          </AtriumButton>
                        )}
                      </div>
                    </div>

                    {(isExpanded || filteredEntries.length <= 8) && (
                      <div className="px-3.5 pb-3 pt-1 bg-[#FAF8F5] dark:bg-[#1F1D1B] border-t border-[var(--atr-divider)]">
                        <div className="grid grid-cols-12 gap-2 t-cap font-semibold text-black/55 dark:text-white/55 pb-1">
                          <span className="col-span-2 font-mono">Compte</span>
                          <span className="col-span-6">Intitulé / Tiers</span>
                          <span className="col-span-2 text-end">Débit</span>
                          <span className="col-span-2 text-end">Crédit</span>
                        </div>
                        {entry.lines.map((l) => (
                          <div
                            key={l.id}
                            className="grid grid-cols-12 gap-2 t-cap py-1 border-t border-[var(--atr-divider)]/60 tabular-nums"
                          >
                            <span className="col-span-2 font-mono font-semibold text-black dark:text-white">
                              {l.accountCode}
                            </span>
                            <span className="col-span-6 text-black/80 dark:text-white/80 truncate">
                              {l.accountLabel}
                              {l.partyName ? ` · ${l.partyName}` : ''}
                            </span>
                            <span className="col-span-2 text-end font-medium text-black dark:text-white">
                              {l.debitCentimes > 0
                                ? formatMoney(centimesToDzd(l.debitCentimes), language)
                                : '—'}
                            </span>
                            <span className="col-span-2 text-end font-medium text-black dark:text-white">
                              {l.creditCentimes > 0
                                ? formatMoney(centimesToDzd(l.creditCentimes), language)
                                : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UNPOSTED / RETRY QUEUE */}
      {activeTab === 'queue' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="t-label font-semibold text-black dark:text-white">
                {isAr
                  ? 'قائمة القيود المعلقة وإعادة المحاولة'
                  : isEn
                    ? 'Unposted Queue & Failure Recovery'
                    : 'Écritures en Attente & File de Reprise SCF'}
              </h3>
              <p className="t-cap text-black/55 dark:text-white/55">
                {isAr
                  ? 'لا يتم تجاهل أي قيد مرفوض: أعد فتح الفترة أو أعد المحاولة.'
                  : isEn
                    ? 'No failed posting is silently dropped. Resolve period locks or errors and retry.'
                    : 'Aucun rejet n’est ignoré silencieusement : déverrouillez la période et relancez le traitement.'}
              </p>
            </div>
          </div>

          {scfPostingFailures.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-[var(--atr-divider)] rounded-xl">
              <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
              <p className="t-small font-medium text-black dark:text-white">
                {isAr ? 'لا توجد قيود معلقة' : isEn ? 'Zero unposted items' : 'Aucune écriture en attente'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--atr-divider)] border border-[var(--atr-divider)] rounded-xl overflow-hidden">
              {scfPostingFailures.map((f) => {
                const fPeriodKey = f.entryDate.slice(0, 7);
                return (
                  <div
                    key={f.id}
                    data-testid={`scf-failure-row-${f.id}`}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono t-small font-semibold text-black dark:text-white">
                          {f.sourceRef}
                        </span>
                        <span className="font-mono t-cap px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200">
                          {f.errorCode}
                        </span>
                        <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
                          {f.entryDate} · {f.attempts} {isAr ? 'محاولة' : 'tentative(s)'}
                        </span>
                        <span
                          className={`t-cap font-semibold ${
                            f.status === 'resolved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : f.status === 'dismissed'
                                ? 'text-black/45 dark:text-white/45'
                                : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          [{f.status}]
                        </span>
                      </div>
                      <p className="t-cap text-rose-700 dark:text-rose-300">{f.errorMessage}</p>
                    </div>
                    {f.status === 'pending' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {f.errorCode === 'SCF_PERIOD_CLOSED' && canManagePeriods && (
                          <AtriumButton
                            variant="outline"
                            size="xs"
                            icon={<Unlock size={12} />}
                            onClick={() =>
                              setAccountingPeriodStatus(
                                fPeriodKey,
                                'open',
                                'Reprise file SCF'
                              )
                            }
                          >
                            {isAr ? `فتح ${fPeriodKey}` : `Réouvrir ${fPeriodKey}`}
                          </AtriumButton>
                        )}
                        <AtriumButton
                          variant="primary"
                          size="xs"
                          icon={<RefreshCw size={12} />}
                          data-testid="scf-retry-failure-btn"
                          onClick={() => retryScfPostingFailure(f.id)}
                        >
                          {isAr ? 'إعادة المحاولة' : isEn ? 'Retry' : 'Relancer'}
                        </AtriumButton>
                        <AtriumButton
                          variant="ghost"
                          size="xs"
                          onClick={() => dismissScfPostingFailure(f.id)}
                        >
                          {isAr ? 'تجاهل' : isEn ? 'Dismiss' : 'Ignorer'}
                        </AtriumButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <LabelSelect
                  label={isAr ? 'الفترة' : isEn ? 'Period' : 'Période'}
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  options={availablePeriodOptions}
                />
              </div>
              <div className="w-44">
                <LabelSelect
                  label="Journal"
                  value={journalFilter}
                  onChange={(v) => setJournalFilter(v as ScfJournalCode | 'ALL')}
                  options={[
                    { value: 'ALL', label: isAr ? 'الكل' : 'Tous' },
                    { value: 'VE', label: 'VE' },
                    { value: 'AC', label: 'AC' },
                    { value: 'BQ', label: 'BQ' },
                    { value: 'CA', label: 'CA' },
                    { value: 'PA', label: 'PA' },
                    { value: 'ST', label: 'ST' },
                    { value: 'OD', label: 'OD' },
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AtriumButton variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExportTrialBalanceCsv}>
                CSV
              </AtriumButton>
              <AtriumButton variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => setPrintKind('trial_balance')}>
                {isAr ? 'طباعة A4' : isEn ? 'Print A4' : 'Imprimer A4'}
              </AtriumButton>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--atr-divider)] rounded-xl">
            <table className="w-full text-start border-collapse tabular-nums t-cap">
              <thead>
                <tr className="bg-[#FAF8F5] dark:bg-[#1E1C1A] border-b border-[var(--atr-divider)] text-black/60 dark:text-white/60">
                  <th className="p-2.5 text-start font-mono">Compte</th>
                  <th className="p-2.5 text-start">Intitulé SCF</th>
                  <th className="p-2.5 text-end">Mvt Débit</th>
                  <th className="p-2.5 text-end">Mvt Crédit</th>
                  <th className="p-2.5 text-end">Solde Débiteur</th>
                  <th className="p-2.5 text-end">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)]">
                {trialBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-black/55 dark:text-white/55">
                      {isAr ? 'لا توجد حركات لهذه الفترة' : 'Aucun mouvement sur cette période'}
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((r) => (
                    <tr key={r.accountCode} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="p-2.5 font-mono font-semibold text-black dark:text-white">{r.accountCode}</td>
                      <td className="p-2.5 text-black dark:text-white">{r.accountLabel}</td>
                      <td className="p-2.5 text-end">{formatMoney(centimesToDzd(r.totalDebitCentimes), language)}</td>
                      <td className="p-2.5 text-end">{formatMoney(centimesToDzd(r.totalCreditCentimes), language)}</td>
                      <td className="p-2.5 text-end font-semibold text-black dark:text-white">
                        {r.closingDebitBalanceCentimes > 0
                          ? formatMoney(centimesToDzd(r.closingDebitBalanceCentimes), language)
                          : '—'}
                      </td>
                      <td className="p-2.5 text-end font-semibold text-black dark:text-white">
                        {r.closingCreditBalanceCentimes > 0
                          ? formatMoney(centimesToDzd(r.closingCreditBalanceCentimes), language)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#FAF8F5] dark:bg-[#1E1C1A] border-t-2 border-[var(--atr-divider)] font-semibold">
                <tr>
                  <td colSpan={2} className="p-2.5">
                    TOTAUX ({trialBalance.isBalanced ? 'Équilibré Δ=0' : 'Déséquilibré'})
                  </td>
                  <td className="p-2.5 text-end">{formatMoney(centimesToDzd(trialBalance.totalMovementsDebitCentimes), language)}</td>
                  <td className="p-2.5 text-end">{formatMoney(centimesToDzd(trialBalance.totalMovementsCreditCentimes), language)}</td>
                  <td className="p-2.5 text-end">{formatMoney(centimesToDzd(trialBalance.totalClosingDebitCentimes), language)}</td>
                  <td className="p-2.5 text-end">{formatMoney(centimesToDzd(trialBalance.totalClosingCreditCentimes), language)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL LEDGER */}
      {activeTab === 'general_ledger' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[260px]">
              <div className="flex-1 min-w-[240px]">
                <LabelSelect
                  label={isAr ? 'الحساب المحاسبي' : isEn ? 'SCF Account' : 'Compte SCF'}
                  value={selectedGlAccount}
                  onChange={setSelectedGlAccount}
                  options={accountSelectOptions}
                />
              </div>
              <div className="w-40">
                <LabelSelect
                  label={isAr ? 'الفترة' : isEn ? 'Period' : 'Période'}
                  value={periodFilter}
                  onChange={setPeriodFilter}
                  options={availablePeriodOptions}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AtriumButton variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExportGlCsv}>
                CSV
              </AtriumButton>
              <AtriumButton variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => setPrintKind('general_ledger')}>
                {isAr ? 'طباعة A4' : isEn ? 'Print A4' : 'Imprimer A4'}
              </AtriumButton>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--atr-divider)] rounded-xl">
            <table className="w-full text-start border-collapse tabular-nums t-cap">
              <thead>
                <tr className="bg-[#FAF8F5] dark:bg-[#1E1C1A] border-b border-[var(--atr-divider)] text-black/60 dark:text-white/60">
                  <th className="p-2.5 text-start">Date</th>
                  <th className="p-2.5 text-start font-mono">N° Écriture</th>
                  <th className="p-2.5 text-start">Pièce</th>
                  <th className="p-2.5 text-start">Libellé</th>
                  <th className="p-2.5 text-end">Débit</th>
                  <th className="p-2.5 text-end">Crédit</th>
                  <th className="p-2.5 text-end">Solde progressif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)]">
                {generalLedger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-black/55 dark:text-white/55">
                      {isAr ? 'لا توجد حركات لهذا الحساب' : 'Aucune écriture pour ce compte'}
                    </td>
                  </tr>
                ) : (
                  generalLedger.rows.map((r) => (
                    <tr key={r.lineId}>
                      <td className="p-2.5">{r.entryDate}</td>
                      <td className="p-2.5 font-mono font-semibold">{r.entryNumber}</td>
                      <td className="p-2.5 font-mono">{r.pieceRef}</td>
                      <td className="p-2.5">{r.libelle}</td>
                      <td className="p-2.5 text-end">
                        {r.debitCentimes > 0 ? formatMoney(centimesToDzd(r.debitCentimes), language) : '—'}
                      </td>
                      <td className="p-2.5 text-end">
                        {r.creditCentimes > 0 ? formatMoney(centimesToDzd(r.creditCentimes), language) : '—'}
                      </td>
                      <td className="p-2.5 text-end font-semibold text-black dark:text-white">
                        {formatMoney(centimesToDzd(r.runningBalanceCentimes), language)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BANK & CASH RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <LabelSelect
                label={isAr ? 'حساب الخزينة / البنك' : isEn ? 'Bank / Cash Account' : 'Compte Trésorerie (512/517/530/5113)'}
                value={selectedReconAccount}
                onChange={setSelectedReconAccount}
                options={reconcilableOptions}
              />
            </div>
            <LabelInput
              label={isAr ? 'مرجع الكشف البنكي' : isEn ? 'Statement Ref' : 'Réf. Relevé'}
              value={reconStatementRef}
              onChange={setReconStatementRef}
            />
            <LabelInput
              type="date"
              label={isAr ? 'تاريخ الكشف' : isEn ? 'Statement Date' : 'Date Relevé'}
              value={reconStatementDate}
              onChange={setReconStatementDate}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--atr-divider)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--atr-divider)] tabular-nums">
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">
                {isAr ? 'الرصيد الدفتري' : isEn ? 'Book Balance' : 'Solde Comptable'}
              </div>
              <div className="t-label font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(bankRecon.bookBalanceCentimes), language)}
              </div>
            </div>
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">
                {isAr ? 'الرصيد المطابق' : isEn ? 'Reconciled Balance' : 'Solde Rapproché'} ({bankRecon.reconciledCount})
              </div>
              <div className="t-label font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatMoney(centimesToDzd(bankRecon.reconciledBalanceCentimes), language)}
              </div>
            </div>
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">
                {isAr ? 'الفارق غير المطابق' : isEn ? 'Unreconciled Delta' : 'Écart Non Rapproché'} ({bankRecon.unreconciledCount})
              </div>
              <div className="t-label font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                {formatMoney(centimesToDzd(bankRecon.unreconciledDeltaCentimes), language)}
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--atr-divider)] border border-[var(--atr-divider)] rounded-xl overflow-hidden">
            {bankRecon.lines.length === 0 ? (
              <div className="p-6 text-center t-cap text-black/55 dark:text-white/55">
                <Landmark size={20} className="mx-auto mb-1 opacity-50" />
                {isAr ? 'لا توجد حركات بنكية أو نقدية في هذا الحساب' : 'Aucun mouvement à rapprocher sur ce compte'}
              </div>
            ) : (
              bankRecon.lines.map((row) => (
                <div key={row.lineId} className="p-3 flex flex-wrap items-center justify-between gap-3 tabular-nums">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={row.reconciled}
                      aria-label={`Reconcile ${row.entryNumber}`}
                      onChange={(ev) =>
                        toggleReconcileJournalLine(
                          row.entryId,
                          row.lineId,
                          ev.target.checked,
                          reconStatementRef,
                          reconStatementDate
                        )
                      }
                      className="w-4 h-4 accent-[#BF431F] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 t-small">
                        <span className="font-mono font-semibold text-black dark:text-white">{row.entryNumber}</span>
                        <span className="t-cap text-black/55 dark:text-white/55">{row.entryDate} · {row.pieceRef}</span>
                        {row.reconciled && row.reconciliationRef && (
                          <span className="font-mono t-cap text-emerald-700 dark:text-emerald-400">
                            [{row.reconciliationRef}]
                          </span>
                        )}
                      </div>
                      <div className="t-cap text-black/75 dark:text-white/75 truncate">{row.libelle}</div>
                    </div>
                  </div>
                  <div className="t-small font-semibold">
                    {row.debitCentimes > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{formatMoney(centimesToDzd(row.debitCentimes), language)}
                      </span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">
                        -{formatMoney(centimesToDzd(row.creditCentimes), language)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: TVA / G50 PREPARATION AID */}
      {activeTab === 'g50_aid' && (
        <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
          <div
            data-testid="scf-g50-disclaimer"
            className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 t-small"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
            <span className="font-medium">{g50Report.disclaimer}</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-52">
              <LabelSelect
                label={isAr ? 'الشهر الضريبي' : isEn ? 'Tax Period' : 'Période Fiscale'}
                value={g50Period}
                onChange={setG50Period}
                options={availablePeriodOptions}
              />
            </div>
            <div className="flex items-center gap-2">
              <AtriumButton variant="outline" size="sm" icon={<FileSpreadsheet size={14} />} onClick={handleExportG50Csv}>
                CSV
              </AtriumButton>
              <AtriumButton variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => setPrintKind('g50_aid')}>
                {isAr ? 'طباعة A4' : isEn ? 'Print A4' : 'Imprimer A4'}
              </AtriumButton>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[var(--atr-divider)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--atr-divider)] tabular-nums">
            <div className="p-3.5">
              <div className="t-cap text-black/55 dark:text-white/55">CA Imposable HT (70*)</div>
              <div className="t-card font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.taxableTurnoverHtCentimes), language)}
              </div>
            </div>
            <div className="p-3.5">
              <div className="t-cap text-black/55 dark:text-white/55">TVA Collectée (4457)</div>
              <div className="t-card font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.tvaCollectedCentimes), language)}
              </div>
            </div>
            <div className="p-3.5">
              <div className="t-cap text-black/55 dark:text-white/55">TVA Déductible (4456)</div>
              <div className="t-card font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.tvaDeductibleCentimes), language)}
              </div>
            </div>
            <div className="p-3.5">
              <div className="t-cap text-black/55 dark:text-white/55">
                {g50Report.netTvaPayableCentimes > 0 ? 'TVA Nette à Payer' : 'Précompte TVA'}
              </div>
              <div className="t-card font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mt-0.5">
                {g50Report.netTvaPayableCentimes > 0
                  ? formatMoney(centimesToDzd(g50Report.netTvaPayableCentimes), language)
                  : formatMoney(centimesToDzd(g50Report.tvaCreditCarryForwardCentimes), language)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--atr-divider)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--atr-divider)] tabular-nums">
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">Timbre Fiscal (447000)</div>
              <div className="t-label font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.timbreFiscalCentimes), language)}
              </div>
            </div>
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">IRG Salaires (442000)</div>
              <div className="t-label font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.irgSalariesCentimes), language)}
              </div>
            </div>
            <div className="p-3">
              <div className="t-cap text-black/55 dark:text-white/55">CNAS à Payer (431000)</div>
              <div className="t-label font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(centimesToDzd(g50Report.cnasPayableCentimes), language)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PERIODS & CHART OF ACCOUNTS */}
      {activeTab === 'periods_chart' && (
        <div className="space-y-4">
          <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-[var(--brand-text,#BF431F)]" />
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {isAr ? 'إغلاق وفتح الفترات المحاسبية' : isEn ? 'Accounting Period Locks' : 'Clôture & Réouverture des Périodes'}
                </h3>
              </div>
              {!canManagePeriods && (
                <span className="t-cap text-amber-700 dark:text-amber-300 font-medium">
                  {isAr ? 'يتطلب صلاحية المدير أو الخبير المحاسب' : 'Réservé Dirigeant / Expert-Comptable'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <LabelInput
                type="month"
                label={isAr ? 'الشهر' : isEn ? 'Month' : 'Période (YYYY-MM)'}
                value={periodInput}
                onChange={setPeriodInput}
              />
              <div className="sm:col-span-2">
                <LabelInput
                  label={isAr ? 'السبب / الملاحظة' : isEn ? 'Reason (Audit)' : 'Motif (Journal d’audit)'}
                  placeholder={isAr ? 'تبرير الغلق أو إعادة الفتح' : 'Ex: Clôture mensuelle DGI'}
                  value={periodReason}
                  onChange={setPeriodReason}
                />
              </div>
              <div className="flex items-center gap-2">
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<Lock size={13} />}
                  data-testid="scf-close-period-btn"
                  onClick={() => setAccountingPeriodStatus(periodInput, 'closed', periodReason)}
                >
                  {isAr ? 'غلق' : isEn ? 'Close' : 'Clôturer'}
                </AtriumButton>
                <AtriumButton
                  variant="outline"
                  size="sm"
                  icon={<Unlock size={13} />}
                  data-testid="scf-reopen-period-btn"
                  onClick={() => setAccountingPeriodStatus(periodInput, 'open', periodReason)}
                >
                  {isAr ? 'فتح' : isEn ? 'Reopen' : 'Réouvrir'}
                </AtriumButton>
              </div>
            </div>

            {mergedPeriods.length > 0 && (
              <div className="divide-y divide-[var(--atr-divider)] border border-[var(--atr-divider)] rounded-xl overflow-hidden">
                {mergedPeriods.map((p) => (
                  <div key={p.periodKey} className="p-2.5 px-3.5 flex items-center justify-between gap-2 t-cap">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-black dark:text-white">{p.periodKey}</span>
                      <span
                        className={`font-semibold ${
                          p.status === 'closed'
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {p.status === 'closed' ? 'Clôturée' : 'Ouverte'}
                      </span>
                      {p.reopenReason && <span className="text-black/55 dark:text-white/55">· {p.reopenReason}</span>}
                    </div>
                    <AtriumButton
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setAccountingPeriodStatus(
                          p.periodKey,
                          p.status === 'closed' ? 'open' : 'closed',
                          periodReason
                        )
                      }
                    >
                      {p.status === 'closed' ? 'Réouvrir' : 'Clôturer'}
                    </AtriumButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#262422] p-4 sm:p-5 space-y-4">
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'دليل الحسابات (SCF Classes 1–7)' : isEn ? 'Chart of Accounts (SCF Classes 1–7)' : 'Plan Comptable SCF (Classes 1 à 7)'}
            </h3>

            <form onSubmit={handleCreateCustomAccount} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-2">
                <LabelInput
                  label="Code"
                  placeholder="411100"
                  value={newAcctCode}
                  onChange={setNewAcctCode}
                />
              </div>
              <div className="sm:col-span-5">
                <LabelInput
                  label="Intitulé"
                  placeholder="Clients sous-traitants"
                  value={newAcctLabelFr}
                  onChange={setNewAcctLabelFr}
                />
              </div>
              <div className="sm:col-span-2">
                <LabelSelect
                  label="Classe"
                  value={newAcctClass}
                  onChange={setNewAcctClass}
                  options={[
                    { value: '1', label: '1 · Capitaux' },
                    { value: '2', label: '2 · Immo' },
                    { value: '3', label: '3 · Stocks' },
                    { value: '4', label: '4 · Tiers' },
                    { value: '5', label: '5 · Trésorerie' },
                    { value: '6', label: '6 · Charges' },
                    { value: '7', label: '7 · Produits' },
                  ]}
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 t-cap text-black/75 dark:text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAcctReconcilable}
                    onChange={(e) => setNewAcctReconcilable(e.target.checked)}
                    className="accent-[#BF431F]"
                  />
                  <span>Rapproch.</span>
                </label>
                <AtriumButton type="submit" variant="outline" size="sm" icon={<Plus size={13} />}>
                  Ajouter
                </AtriumButton>
              </div>
            </form>

            <div className="overflow-x-auto border border-[var(--atr-divider)] rounded-xl max-h-80 overflow-y-auto">
              <table className="w-full text-start border-collapse t-cap">
                <thead>
                  <tr className="bg-[#FAF8F5] dark:bg-[#1E1C1A] border-b border-[var(--atr-divider)] text-black/60 dark:text-white/60">
                    <th className="p-2 text-start font-mono">Code</th>
                    <th className="p-2 text-start">Intitulé</th>
                    <th className="p-2 text-start">Classe</th>
                    <th className="p-2 text-start">Nature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--atr-divider)]">
                  {scfAccounts.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2 font-mono font-semibold text-black dark:text-white">{a.code}</td>
                      <td className="p-2 text-black dark:text-white">
                        {isAr ? a.labelAr : isEn ? a.labelEn : a.labelFr}
                      </td>
                      <td className="p-2 tabular-nums">{a.scfClass}</td>
                      <td className="p-2">{a.accountType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <ScfManualEntryModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        accounts={scfAccounts}
        sourceVertical={sourceVerticalFilter}
      />

      {/* Reversal Confirmation Modal (React modal, never window.prompt) */}
      <KineticModalShell
        isOpen={Boolean(reversalTarget)}
        onClose={() => setReversalTarget(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
        ariaLabel={isAr ? 'عكس القيد المحاسبي' : 'Contre-passation SCF'}
      >
        {reversalTarget && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="w-full bg-white dark:bg-[#262422] p-5 space-y-4 [--sq-stroke:var(--sq-stroke-pop)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-2.5">
              <span className="t-label font-semibold text-black dark:text-white">
                {isAr ? 'تأكيد عكس القيد' : isEn ? 'Confirm Reversal' : 'Contre-passation d’écriture'}
              </span>
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="p-1 text-black/50 dark:text-white/50 cursor-pointer"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="t-cap text-black/75 dark:text-white/75">
              <span className="font-mono font-semibold">{reversalTarget.entryNumber}</span> ·{' '}
              {reversalTarget.libelle}
            </p>
            <form onSubmit={handleConfirmReversal} className="space-y-3">
              <LabelInput
                type="date"
                label={isAr ? 'تاريخ العكس' : isEn ? 'Reversal Date' : 'Date de contre-passation'}
                value={reversalDate}
                onChange={setReversalDate}
                required
              />
              <LabelInput
                label={isAr ? 'سبب العكس' : isEn ? 'Reason' : 'Motif de contre-passation'}
                placeholder={isAr ? 'خطأ في الإدخال أو إلغاء' : 'Ex: Erreur d’imputation'}
                value={reversalReason}
                onChange={setReversalReason}
              />
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setReversalTarget(null)}>
                  {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm" data-testid="scf-confirm-reversal-btn">
                  {isAr ? 'تأكيد العكس' : isEn ? 'Post Reversal' : 'Valider Contre-passation'}
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      {/* A4 Print Modal */}
      {printKind && (
        <ScfPrintReportModal
          isOpen={Boolean(printKind)}
          onClose={() => setPrintKind(null)}
          kind={printKind}
          periodLabel={printKind === 'g50_aid' ? g50Period : periodFilter}
          trialBalance={trialBalance}
          generalLedger={generalLedger}
          g50Report={g50Report}
        />
      )}
    </div>
  );
};
