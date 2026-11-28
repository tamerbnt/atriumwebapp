import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Scale,
  Gavel,
  CalendarDays,
  Landmark,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import {
  computeCarpaReconciliation,
  computeClientG50Declaration,
  createBailiffActWithOptionalCpcaDeadline,
  evaluateArbitrationTimelineStatus,
  hashEscrowPin,
  summarizeMultiClientBooks,
} from '../../../utils/legalDepth';
import { t } from '../../../utils/i18n';
import type {
  CPCADeadline,
  EscrowAccount,
  SupportedLanguage as Language,
  LegalArbitrationTimeline,
  LegalBailiffAct,
  LegalClientLedgerBook,
  LegalHolidayEntry,
  LegalMatter,
} from '../../../types';
import type { CPCARecourseType } from '../../../utils/legalRules';

interface LegalTradeSpecialtyPanelProps {
  language: Language;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  activeLegalRole: string;
  matters: LegalMatter[];
  escrowAccounts: EscrowAccount[];
  holidays: LegalHolidayEntry[];
  bailiffActs: LegalBailiffAct[];
  arbitrationTimelines: LegalArbitrationTimeline[];
  clientLedgers: LegalClientLedgerBook[];
  onAddClientLedger: (book: LegalClientLedgerBook) => void;
  onUpdateClientLedger: (book: LegalClientLedgerBook) => void;
  onAddBailiffAct: (act: LegalBailiffAct) => void;
  onAddCPCADeadline: (dl: CPCADeadline) => void;
  onAddArbitrationTimeline: (params: {
    matterId?: string;
    matterNumber?: string;
    arbitrationSeat: string;
    rulesFramework: string;
    tribunalChair?: string;
    claimantName: string;
    respondentName: string;
    amountInDisputeDzd: number;
    startDate: string;
  }) => void;
  onUpdateArbitrationTimeline: (arb: LegalArbitrationTimeline) => void;
  onUpdateEscrowAccount: (acc: EscrowAccount) => void;
  onAddHoliday: (entry: Omit<LegalHolidayEntry, 'id' | 'accountId' | 'businessId' | 'branchId' | 'createdAt'>) => void;
  onDeleteHoliday: (id: string) => void;
  onRecalculateDeadlines: () => number;
}

export const LegalTradeSpecialtyPanel: React.FC<LegalTradeSpecialtyPanelProps> = ({
  language,
  accountId,
  businessId,
  branchId,
  staffId,
  activeLegalRole,
  matters,
  escrowAccounts,
  holidays,
  bailiffActs,
  arbitrationTimelines,
  clientLedgers,
  onAddClientLedger,
  onUpdateClientLedger,
  onAddBailiffAct,
  onAddCPCADeadline,
  onAddArbitrationTimeline,
  onUpdateArbitrationTimeline,
  onUpdateEscrowAccount,
  onAddHoliday,
  onDeleteHoliday,
  onRecalculateDeadlines,
}) => {
  const defaultTab =
    activeLegalRole === 'expert_comptable'
      ? 'g50'
      : activeLegalRole === 'notaire_titulaire'
      ? 'carpa'
      : 'bailiff';
  const [tab, setTab] = useState<'g50' | 'bailiff' | 'arbitration' | 'carpa'>(defaultTab);

  // G50 Multi-client book form
  const [g50ClientName, setG50ClientName] = useState('');
  const [g50ClientNif, setG50ClientNif] = useState('');
  const [g50Period, setG50Period] = useState(new Date().toISOString().slice(0, 7));
  const [g50TvaCollectee, setG50TvaCollectee] = useState(57000);
  const [g50TvaDeductible, setG50TvaDeductible] = useState(19000);
  const [g50CreditPrev, setG50CreditPrev] = useState(0);
  const [g50Irg, setG50Irg] = useState(8500);
  const [g50Ibs, setG50Ibs] = useState(0);

  // Bailiff signification form
  const [bailiffName, setBailiffName] = useState('Me Kaci Huissier de Justice');
  const [recipientName, setRecipientName] = useState('');
  const [bailiffKind, setBailiffKind] = useState<LegalBailiffAct['actKind']>('signification');
  const [serviceMode, setServiceMode] = useState<LegalBailiffAct['serviceMode']>('a_personne');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bailiffMatterId, setBailiffMatterId] = useState(matters[0]?.id || '');
  const [bailiffFeeDzd, setBailiffFeeDzd] = useState(6500);
  const [triggerCpcaRecourse, setTriggerCpcaRecourse] = useState<CPCARecourseType | ''>('appel_commercial');

  // Arbitration form
  const [arbClaimant, setArbClaimant] = useState('');
  const [arbRespondent, setArbRespondent] = useState('');
  const [arbSeat, setArbSeat] = useState('Alger (CACI)');
  const [arbAmountDzd, setArbAmountDzd] = useState(12000000);

  // CARPA statement & Holiday form
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});
  const [stmtDrafts, setStmtDrafts] = useState<Record<string, string>>({});
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');

  const g50Preview = useMemo(
    () =>
      computeClientG50Declaration({
        tvaCollecteeCentimes: Math.round(g50TvaCollectee * 100),
        tvaDeductibleCentimes: Math.round(g50TvaDeductible * 100),
        creditTvaAnterieurCentimes: Math.round(g50CreditPrev * 100),
        irgSalairesCentimes: Math.round(g50Irg * 100),
        ibsAcompteCentimes: Math.round(g50Ibs * 100),
      }),
    [g50TvaCollectee, g50TvaDeductible, g50CreditPrev, g50Irg, g50Ibs]
  );

  const booksSummary = useMemo(() => summarizeMultiClientBooks(clientLedgers), [clientLedgers]);

  const handleSaveG50 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!g50ClientName.trim()) {
      showToast(t('legal_depth_client_name_required', language), 'error');
      return;
    }
    const code = `EXP-${new Date().getFullYear()}-${String(clientLedgers.length + 1).padStart(5, '0')}`;
    const book: LegalClientLedgerBook = {
      id: `ledger_${Date.now().toString(36)}`,
      accountId,
      businessId,
      branchId,
      staffId,
      dossierCode: code,
      clientName: g50ClientName.trim(),
      clientNif: g50ClientNif.trim() || undefined,
      fiscalRegime: 'Reel',
      fiscalPeriod: g50Period,
      tvaCollecteeCentimes: g50Preview.tvaCollecteeCentimes,
      tvaDeductibleCentimes: g50Preview.tvaDeductibleCentimes,
      creditTvaAnterieurCentimes: g50Preview.creditTvaReportableCentimes,
      tvaNetDueCentimes: g50Preview.tvaNetDueCentimes,
      tapBaseCentimes: 0,
      irgSalairesCentimes: g50Preview.irgSalairesCentimes,
      ibsAcompteCentimes: g50Preview.ibsAcompteCentimes,
      timbreFiscalCentimes: 0,
      totalG50DueCentimes: g50Preview.totalG50DueCentimes,
      trialBalanceJson: [
        { accountNumber: '445700', label: 'TVA Collectée', debitDzd: 0, creditDzd: g50TvaCollectee },
        { accountNumber: '445660', label: 'TVA Déductible', debitDzd: g50TvaDeductible, creditDzd: 0 },
        { accountNumber: '442100', label: 'IRG Salaires', debitDzd: 0, creditDzd: g50Irg },
      ],
      g50Status: 'validated',
      liasseReady: false,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    onAddClientLedger(book);
    setG50ClientName('');
    setG50ClientNif('');
    showToast(`${t('legal_depth_g50_saved', language)} (${code})`, 'success');
  };

  const handleSaveBailiffAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      showToast(t('legal_depth_recipient_required', language), 'error');
      return;
    }
    const targetMatter = matters.find((m) => m.id === bailiffMatterId);
    const actNumber = `HUI-${new Date().getFullYear()}-${String(bailiffActs.length + 1).padStart(5, '0')}`;
    const activeHolidayDates = holidays.filter((h) => h.isActive).map((h) => h.holidayDate);

    const { act, cpcaCalculation } = createBailiffActWithOptionalCpcaDeadline({
      accountId,
      businessId,
      branchId,
      staffId,
      actNumber,
      matterId: targetMatter?.id,
      matterNumber: targetMatter?.matterNumber,
      actKind: bailiffKind,
      bailiffName,
      recipientName: recipientName.trim(),
      serviceMode,
      serviceDate,
      feeDzd: bailiffFeeDzd,
      recourseToTrigger: triggerCpcaRecourse || undefined,
      domicileCategory: 'local',
      holidays: activeHolidayDates,
    });

    if (cpcaCalculation && targetMatter) {
      const dlId = `cpca_${Date.now().toString(36)}`;
      act.linkedCpcaDeadlineId = dlId;
      onAddCPCADeadline({
        id: dlId,
        accountId,
        businessId,
        branchId,
        staffId,
        matterId: targetMatter.id,
        caseNumber: targetMatter.matterNumber,
        courtJurisdiction: targetMatter.courtJurisdiction || 'Tribunal Compétent',
        chamber: targetMatter.chamber || 'Chambre Civile/Com',
        recourseType: cpcaCalculation.recourseType,
        notificationDate: serviceDate,
        bailiffName,
        domicileCategory: 'local',
        statutoryBaseDays: cpcaCalculation.baseDays,
        distanceExtensionDays: cpcaCalculation.distanceExtensionDays,
        terminalExpiryDate: cpcaCalculation.terminalExpiryDate,
        isRolledOver: cpcaCalculation.isRolledOver,
        rolloverReason: cpcaCalculation.rolloverReason,
        status: cpcaCalculation.isCritical ? 'critical' : 'running',
        notes: `Généré depuis acte d'huissier ${actNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    onAddBailiffAct(act);
    setRecipientName('');
    showToast(`${t('legal_depth_bailiff_saved', language)} (${actNumber})`, 'success');
  };

  const handleSaveArbitration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arbClaimant.trim() || !arbRespondent.trim()) {
      showToast(t('legal_depth_arb_parties_required', language), 'error');
      return;
    }
    const targetMatter = matters[0];
    onAddArbitrationTimeline({
      matterId: targetMatter?.id,
      matterNumber: targetMatter?.matterNumber,
      arbitrationSeat: arbSeat,
      rulesFramework: 'CPCA Art. 1006+ / CCI',
      claimantName: arbClaimant.trim(),
      respondentName: arbRespondent.trim(),
      amountInDisputeDzd: arbAmountDzd,
      startDate: new Date().toISOString().split('T')[0],
    });
    setArbClaimant('');
    setArbRespondent('');
    showToast(t('legal_depth_arb_created', language), 'success');
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayLabel.trim()) return;
    onAddHoliday({
      holidayDate: newHolidayDate,
      label: newHolidayLabel.trim(),
      holidayKind: 'custom',
      isActive: true,
    });
    setNewHolidayDate('');
    setNewHolidayLabel('');
    showToast(t('legal_depth_holiday_added', language), 'success');
  };

  const handleSaveEscrowPin = (acc: EscrowAccount) => {
    const pin = (pinDrafts[acc.id] || '').trim();
    if (pin.length < 4) {
      showToast('PIN minimum 4 caractères', 'error');
      return;
    }
    onUpdateEscrowAccount({
      ...acc,
      releasePinHash: hashEscrowPin(pin),
    });
    setPinDrafts((p) => ({ ...p, [acc.id]: '' }));
    showToast(t('legal_depth_pin_configured', language), 'success');
  };

  const handleRecalcAllDeadlines = () => {
    const count = onRecalculateDeadlines();
    showToast(`${count} ${t('legal_depth_deadlines_recalculated', language)}`, 'success');
  };

  return (
    <div
      data-testid="legal-trade-specialty-panel"
      className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setTab('g50')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              tab === 'g50'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Calculator size={13} />
              {t('legal_depth_tab_g50', language)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('bailiff')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              tab === 'bailiff'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Gavel size={13} />
              {t('legal_depth_tab_bailiff', language)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('arbitration')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              tab === 'arbitration'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Scale size={13} />
              {t('legal_depth_tab_arbitration', language)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('carpa')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              tab === 'carpa'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Landmark size={13} />
              {t('legal_depth_tab_carpa_holidays', language)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-500 tabular-nums">
          <span>G50 Net Portfolio: {formatMoney(booksSummary.aggregateG50DueDzd, language)}</span>
          <span aria-hidden="true">·</span>
          <span>{bailiffActs.length} Huissier</span>
          <span aria-hidden="true">·</span>
          <span>{arbitrationTimelines.length} Arbitrage</span>
        </div>
      </div>

      {tab === 'g50' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveG50} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <input
              type="text"
              value={g50ClientName}
              onChange={(e) => setG50ClientName(e.target.value)}
              placeholder={t('legal_depth_client_entity_placeholder', language)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
            <input
              type="text"
              value={g50ClientNif}
              onChange={(e) => setG50ClientNif(e.target.value)}
              placeholder="NIF (15 chiffres)"
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
            />
            <input
              type="month"
              value={g50Period}
              onChange={(e) => setG50Period(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
            />
            <AtriumButton type="submit" variant="primary" icon={<Plus size={14} />}>
              {t('legal_depth_save_g50_btn', language)} ({formatMoney(g50Preview.totalG50DueCentimes / 100, language)})
            </AtriumButton>

            <div>
              <label className="block text-[11px] text-stone-500 mb-1">TVA Collectée (DZD)</label>
              <input
                type="number"
                min={0}
                value={g50TvaCollectee}
                onChange={(e) => setG50TvaCollectee(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">TVA Déductible (DZD)</label>
              <input
                type="number"
                min={0}
                value={g50TvaDeductible}
                onChange={(e) => setG50TvaDeductible(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">IRG Salaires (DZD)</label>
              <input
                type="number"
                min={0}
                value={g50Irg}
                onChange={(e) => setG50Irg(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Acompte IBS / Précompte (DZD)</label>
              <input
                type="number"
                min={0}
                value={g50Ibs}
                onChange={(e) => setG50Ibs(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
          </form>

          {clientLedgers.length > 0 && (
            <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg">
              {clientLedgers.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold">{book.dossierCode}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100">{book.clientName}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="font-mono text-stone-500">{book.fiscalPeriod}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold tabular-nums">
                      G50 Net: {formatMoney(book.totalG50DueCentimes / 100, language)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateClientLedger({
                          ...book,
                          liasseReady: !book.liasseReady,
                          g50Status: !book.liasseReady ? 'filed_dgi' : 'validated',
                          version: (book.version || 1) + 1,
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
                        book.liasseReady
                          ? 'bg-emerald-600 text-white'
                          : 'border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      {book.liasseReady ? 'Liasse DGI Prête' : 'Marquer Liasse Prête'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'bailiff' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveBailiffAct} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <select
              value={bailiffKind}
              onChange={(e) => setBailiffKind(e.target.value as LegalBailiffAct['actKind'])}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            >
              <option value="signification">Signification Jugement / Arrêt</option>
              <option value="constat">PV de Constat</option>
              <option value="commandement">Commandement de Payer</option>
              <option value="saisie_execution">PV Saisie-Exécution</option>
              <option value="expulsion">PV Expulsion</option>
            </select>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t('legal_depth_bailiff_recipient', language)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
            />
            <select
              value={triggerCpcaRecourse}
              onChange={(e) => setTriggerCpcaRecourse(e.target.value as CPCARecourseType | '')}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            >
              <option value="appel_commercial">Lier délai CPCA : Appel Commercial (30j)</option>
              <option value="appel_civil">Lier délai CPCA : Appel Civil (30j)</option>
              <option value="opposition">Lier délai CPCA : Opposition (10j)</option>
              <option value="pourvoi_cassation">Lier délai CPCA : Cassation (60j)</option>
              <option value="">Sans délai CPCA lié</option>
            </select>
            <input
              type="text"
              value={bailiffName}
              onChange={(e) => setBailiffName(e.target.value)}
              placeholder="Nom de l'Huissier"
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            <select
              value={serviceMode}
              onChange={(e) => setServiceMode(e.target.value as LegalBailiffAct['serviceMode'])}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            >
              <option value="a_personne">Signifié à personne</option>
              <option value="a_domicile">Signifié à domicile</option>
              <option value="mairie">Dépôt Mairie / APC</option>
              <option value="parquet">Remis au Parquet</option>
              <option value="refus">Refus constaté</option>
            </select>
            <input
              type="number"
              min={0}
              value={bailiffFeeDzd}
              onChange={(e) => setBailiffFeeDzd(Number(e.target.value) || 0)}
              placeholder="Émoluments DZD"
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 tabular-nums"
            />
            <AtriumButton type="submit" variant="primary" icon={<Plus size={14} />}>
              {t('legal_depth_log_bailiff_btn', language)}
            </AtriumButton>
          </form>

          {bailiffActs.length > 0 && (
            <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg">
              {bailiffActs.map((act) => (
                <div key={act.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                  <div>
                    <span className="font-mono font-semibold">{act.actNumber}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span>{act.recipientName}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="text-stone-500">{act.serviceDate} ({act.serviceMode})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span>{formatMoney(act.feeCentimes / 100, language)}</span>
                    {act.linkedCpcaDeadlineId && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium">
                        Délai CPCA lié
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'arbitration' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveArbitration} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <input
              type="text"
              value={arbClaimant}
              onChange={(e) => setArbClaimant(e.target.value)}
              placeholder={t('legal_depth_arb_claimant', language)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            <input
              type="text"
              value={arbRespondent}
              onChange={(e) => setArbRespondent(e.target.value)}
              placeholder={t('legal_depth_arb_respondent', language)}
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            <input
              type="text"
              value={arbSeat}
              onChange={(e) => setArbSeat(e.target.value)}
              placeholder="Siège (Alger / Paris / Genève)"
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
            />
            <input
              type="number"
              min={0}
              value={arbAmountDzd}
              onChange={(e) => setArbAmountDzd(Number(e.target.value) || 0)}
              placeholder="Montant en litige DZD"
              className="px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 tabular-nums"
            />
            <AtriumButton type="submit" variant="primary" icon={<Plus size={14} />}>
              {t('legal_depth_open_arb_btn', language)}
            </AtriumButton>
          </form>

          {arbitrationTimelines.map((arb) => {
            const prog = evaluateArbitrationTimelineStatus(arb);
            return (
              <div
                key={arb.id}
                className="border border-stone-200 dark:border-stone-800 rounded-lg p-3 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold">{arb.caseCode}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="font-medium">{arb.claimantName} c/ {arb.respondentName}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="text-stone-500">{arb.arbitrationSeat} ({arb.rulesFramework})</span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold">
                    {prog.completedCount}/{prog.totalCount} jalons ({prog.progressPercent}%)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {arb.milestones.map((ms) => (
                    <button
                      key={ms.id}
                      type="button"
                      onClick={() => {
                        const nextMilestones = arb.milestones.map((x) =>
                          x.id === ms.id
                            ? {
                                ...x,
                                status: x.status === 'done' ? ('pending' as const) : ('done' as const),
                                completedDate:
                                  x.status === 'done'
                                    ? undefined
                                    : new Date().toISOString().split('T')[0],
                              }
                            : x
                        );
                        onUpdateArbitrationTimeline({
                          ...arb,
                          milestones: nextMilestones,
                          version: (arb.version || 1) + 1,
                        });
                      }}
                      className={`p-2 rounded border text-left transition-colors ${
                        ms.status === 'done'
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-medium">
                        <CheckCircle2 size={12} />
                        <span className="truncate">{ms.label}</span>
                      </div>
                      <div className="font-mono text-[11px] opacity-75 mt-0.5">{ms.targetDate}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'carpa' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* CARPA Bank Statement Reconciliation & Escrow PIN Hash Setup */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
              <Landmark size={14} className="text-emerald-700 dark:text-emerald-400" />
              {t('legal_depth_carpa_reconcil_heading', language)}
            </h4>
            {escrowAccounts.length === 0 ? (
              <div className="text-xs text-stone-400 p-4 border border-stone-200 dark:border-stone-800 rounded-lg">
                {t('legal_depth_no_escrow', language)}
              </div>
            ) : (
              escrowAccounts.map((acc) => {
                const recon = computeCarpaReconciliation(acc);
                return (
                  <div
                    key={acc.id}
                    className="border border-stone-200 dark:border-stone-800 rounded-lg p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {acc.matterReference} · {acc.clientName}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${
                          recon.isReconciled ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {recon.statusLabel} ({formatMoney(recon.varianceCentimes / 100, language)})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={stmtDrafts[acc.id] ?? String(acc.bankStatementBalanceDzd ?? acc.currentBalanceDzd)}
                          onChange={(e) => setStmtDrafts((p) => ({ ...p, [acc.id]: e.target.value }))}
                          placeholder="Solde relevé bancaire"
                          className="flex-1 px-2 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 tabular-nums"
                        />
                        <AtriumButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const val = Number(stmtDrafts[acc.id] ?? acc.currentBalanceDzd) || 0;
                            onUpdateEscrowAccount({
                              ...acc,
                              bankStatementBalanceDzd: val,
                              reconciledAt: new Date().toISOString(),
                            });
                            showToast(t('legal_depth_carpa_updated', language), 'success');
                          }}
                        >
                          Rapprocher
                        </AtriumButton>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="password"
                          value={pinDrafts[acc.id] ?? ''}
                          onChange={(e) => setPinDrafts((p) => ({ ...p, [acc.id]: e.target.value }))}
                          placeholder="Définir PIN Titulaire"
                          className="flex-1 px-2 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                        />
                        <AtriumButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveEscrowPin(acc)}
                        >
                          PIN
                        </AtriumButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Judicial & Religious Holiday Calendar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
                <CalendarDays size={14} className="text-emerald-700 dark:text-emerald-400" />
                {t('legal_depth_holiday_calendar_title', language)}
              </h4>
              <AtriumButton
                size="sm"
                variant="outline"
                icon={<RefreshCw size={12} />}
                onClick={handleRecalcAllDeadlines}
              >
                {t('legal_depth_recalc_cpca_btn', language)}
              </AtriumButton>
            </div>
            <form onSubmit={handleCreateHoliday} className="flex gap-2">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono"
              />
              <input
                type="text"
                value={newHolidayLabel}
                onChange={(e) => setNewHolidayLabel(e.target.value)}
                placeholder={t('legal_depth_holiday_label_ph', language)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
              />
              <AtriumButton type="submit" size="sm" variant="primary" icon={<Plus size={12} />}>
                {t('add', language)}
              </AtriumButton>
            </form>
            <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <div>
                    <span className="font-mono font-medium mr-2">{h.holidayDate}</span>
                    <span className="text-stone-700 dark:text-stone-200">{h.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(h.id)}
                    className="text-stone-400 hover:text-red-600 text-[11px]"
                  >
                    {t('delete', language)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
