import React, { useMemo, useState } from 'react';
import { Plus, Scale, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type {
  ScfAccount,
  ScfJournalCode,
  UnifiedCurrency,
} from '../../../types/index';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import {
  absorbRoundingOrFxDelta,
  convertForeignCentimesToDzd,
  validateScfJournalLines,
  type ScfLineDraftInput,
} from '../../../utils/scfAccountingEngine';
import { useAtriumActions } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface ScfManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ScfAccount[];
  defaultJournalCode?: ScfJournalCode;
  sourceVertical?: string;
}

interface EditableLine {
  key: string;
  accountCode: string;
  partyName: string;
  debitStr: string;
  creditStr: string;
}

const createLineKey = () => `ln_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const ScfManualEntryModal: React.FC<ScfManualEntryModalProps> = ({
  isOpen,
  onClose,
  accounts,
  defaultJournalCode = 'OD',
  sourceVertical,
}) => {
  const { language, isRtl } = useTranslation();
  const { postManualJournalEntry } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [journalCode, setJournalCode] = useState<ScfJournalCode>(defaultJournalCode);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pieceRef, setPieceRef] = useState('');
  const [libelle, setLibelle] = useState('');
  const [currency, setCurrency] = useState<UnifiedCurrency>('DZD');
  const [fxRateStr, setFxRateStr] = useState('1');
  const [lines, setLines] = useState<EditableLine[]>([
    { key: 'l1', accountCode: '411000', partyName: '', debitStr: '', creditStr: '' },
    { key: 'l2', accountCode: '706000', partyName: '', debitStr: '', creditStr: '' },
  ]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.isActive)
        .map((a) => ({
          value: a.code,
          label: `${a.code} · ${isAr ? a.labelAr : isEn ? a.labelEn : a.labelFr}`,
        })),
    [accounts, isAr, isEn]
  );

  const fxRate = useMemo(() => {
    if (currency === 'DZD') return 1;
    const n = Number(fxRateStr);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [currency, fxRateStr]);

  const draftLines: ScfLineDraftInput[] = useMemo(() => {
    const raw = lines.map((l) => {
      const acct = accounts.find((a) => a.code === l.accountCode);
      const debitOrig = dzdToCentimes(Math.max(0, Number(l.debitStr || 0)));
      const creditOrig = dzdToCentimes(Math.max(0, Number(l.creditStr || 0)));
      const debitDzd =
        debitOrig > 0 ? convertForeignCentimesToDzd(debitOrig, currency, fxRate) : 0;
      const creditDzd =
        creditOrig > 0 ? convertForeignCentimesToDzd(creditOrig, currency, fxRate) : 0;
      return {
        accountCode: l.accountCode,
        accountLabel: acct?.labelFr || l.accountCode,
        partyName: l.partyName.trim() || undefined,
        debitCentimes: debitDzd,
        creditCentimes: creditDzd,
        originalCurrency: currency,
        originalAmountCentimes: debitOrig > 0 ? debitOrig : creditOrig,
        fxRate,
      };
    });
    return currency !== 'DZD' ? absorbRoundingOrFxDelta(raw, 500) : raw;
  }, [lines, accounts, currency, fxRate]);

  const validation = useMemo(() => validateScfJournalLines(draftLines), [draftLines]);

  const handleUpdateLine = (key: string, patch: Partial<EditableLine>) => {
    setSubmitError(null);
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleAddLine = () => {
    const fallbackCode = accounts[0]?.code || '512000';
    setLines((prev) => [
      ...prev,
      { key: createLineKey(), accountCode: fallbackCode, partyName: '', debitStr: '', creditStr: '' },
    ]);
  };

  const handleRemoveLine = (key: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!libelle.trim()) {
      setSubmitError(
        isAr ? 'يرجى إدخال بيان القيد' : isEn ? 'Entry description is required.' : 'Le libellé de l’écriture est requis.'
      );
      return;
    }
    if (!validation.isValid) {
      setSubmitError(validation.errorMessage || 'Écriture SCF déséquilibrée.');
      return;
    }

    const res = postManualJournalEntry({
      journalCode,
      entryDate,
      pieceRef: pieceRef.trim() || `MAN-${entryDate}`,
      libelle: libelle.trim(),
      currency,
      fxRate,
      lines: draftLines,
      sourceVertical,
    });

    if (res.ok || res.errorCode === 'SCF_PERIOD_CLOSED') {
      // If queued due to closed period, warning toast + Unposted Queue makes it visible
      setPieceRef('');
      setLibelle('');
      setLines([
        { key: 'l1', accountCode: '411000', partyName: '', debitStr: '', creditStr: '' },
        { key: 'l2', accountCode: '706000', partyName: '', debitStr: '', creditStr: '' },
      ]);
      onClose();
      return;
    }

    setSubmitError(res.errorMessage || 'Erreur de comptabilisation SCF.');
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      zIndexClass="z-50"
      scrimClassName="bg-black/60"
      ariaLabel={isAr ? 'قيد محاسبي مزدوج SCF' : isEn ? 'New SCF Journal Entry' : 'Nouvelle Écriture SCF'}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        data-sq="panel"
        data-sq-border="solid"
        className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
          <div className="flex items-center gap-2.5">
            <Scale size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {isAr ? 'قيد محاسبي مزدوج (SCF 07-11)' : isEn ? 'New Double-Entry SCF Journal' : 'Nouvelle Écriture Comptable SCF'}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55">
                {isAr ? 'توازن إجباري بالملّيم (Débit = Crédit)' : isEn ? 'Strict centime balance required (Debit = Credit)' : 'Contrôle strict partie double en centimes (Débit = Crédit)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
            className="p-1.5 rounded-lg text-black/55 dark:text-white/55 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <LabelSelect
              label={isAr ? 'دفتر اليومية' : isEn ? 'Journal' : 'Journal'}
              value={journalCode}
              onChange={(v) => setJournalCode(v as ScfJournalCode)}
              options={[
                { value: 'OD', label: 'OD · Opérations Diverses' },
                { value: 'VE', label: 'VE · Ventes' },
                { value: 'AC', label: 'AC · Achats' },
                { value: 'BQ', label: 'BQ · Banque' },
                { value: 'CA', label: 'CA · Caisse' },
                { value: 'PA', label: 'PA · Paie' },
                { value: 'ST', label: 'ST · Stocks' },
              ]}
            />
            <LabelInput
              type="date"
              label={isAr ? 'التاريخ' : isEn ? 'Entry Date' : 'Date comptable'}
              value={entryDate}
              onChange={setEntryDate}
              required
            />
            <LabelInput
              label={isAr ? 'المرجع' : isEn ? 'Reference' : 'Réf. Pièce'}
              placeholder="FAC-2026-001"
              value={pieceRef}
              onChange={setPieceRef}
            />
            <LabelSelect
              label={isAr ? 'العملة' : isEn ? 'Currency' : 'Devise'}
              value={currency}
              onChange={(v) => setCurrency(v as UnifiedCurrency)}
              options={[
                { value: 'DZD', label: 'DZD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={currency !== 'DZD' ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <LabelInput
                label={isAr ? 'البيان *' : isEn ? 'Description *' : 'Libellé de l’écriture *'}
                placeholder={isAr ? 'بيان العملية...' : isEn ? 'Transaction narrative...' : 'Ex: Régularisation TVA ou honoraires'}
                value={libelle}
                onChange={setLibelle}
                required
              />
            </div>
            {currency !== 'DZD' && (
              <LabelInput
                type="number"
                step="0.0001"
                label={isAr ? 'سعر الصرف' : isEn ? `FX Rate (${currency}→DZD)` : `Taux (${currency}→DZD)`}
                value={fxRateStr}
                onChange={setFxRateStr}
              />
            )}
          </div>

          <div className="space-y-2 border-t border-b border-[var(--atr-divider)] py-3">
            <div className="flex items-center justify-between">
              <span className="t-small font-semibold text-black dark:text-white">
                {isAr ? 'أسطر القيد' : isEn ? 'Journal Lines' : 'Lignes comptables'}
              </span>
              <AtriumButton type="button" variant="outline" size="xs" icon={<Plus size={13} />} onClick={handleAddLine}>
                {isAr ? 'إضافة سطر' : isEn ? 'Add Line' : 'Ajouter une ligne'}
              </AtriumButton>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-[#F7F3EE] dark:bg-[#1E1C1A] p-2.5 rounded-lg"
                >
                  <div className="sm:col-span-5">
                    <LabelSelect
                      label={index === 0 ? (isAr ? 'الحساب' : isEn ? 'Account' : 'Compte SCF') : undefined}
                      value={line.accountCode}
                      onChange={(v) => handleUpdateLine(line.key, { accountCode: v })}
                      options={accountOptions}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <LabelInput
                      label={index === 0 ? (isAr ? 'الطرف' : isEn ? 'Party' : 'Tiers') : undefined}
                      placeholder={isAr ? 'اختياري' : 'Optionnel'}
                      value={line.partyName}
                      onChange={(v) => handleUpdateLine(line.key, { partyName: v })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <LabelInput
                      type="number"
                      step="0.01"
                      min="0"
                      label={index === 0 ? (isAr ? 'مدين' : isEn ? 'Debit' : 'Débit') : undefined}
                      placeholder="0.00"
                      value={line.debitStr}
                      onChange={(v) =>
                        handleUpdateLine(line.key, {
                          debitStr: v,
                          creditStr: Number(v) > 0 ? '' : line.creditStr,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <LabelInput
                      type="number"
                      step="0.01"
                      min="0"
                      label={index === 0 ? (isAr ? 'دائن' : isEn ? 'Credit' : 'Crédit') : undefined}
                      placeholder="0.00"
                      value={line.creditStr}
                      onChange={(v) =>
                        handleUpdateLine(line.key, {
                          creditStr: v,
                          debitStr: Number(v) > 0 ? '' : line.debitStr,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={lines.length <= 2}
                      onClick={() => handleRemoveLine(line.key)}
                      aria-label={isAr ? 'حذف' : 'Remove'}
                      className="p-2 text-black/45 dark:text-white/45 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[#F3EDE7] dark:bg-[#1E1C1A] tabular-nums">
            <div className="flex flex-wrap items-center gap-4 t-small">
              <span>
                <span className="text-black/55 dark:text-white/55 me-1.5">
                  {isAr ? 'مجموع المدين:' : isEn ? 'Total Debit:' : 'Total Débit :'}
                </span>
                <strong className="text-black dark:text-white">
                  {formatMoney(centimesToDzd(validation.totalDebitCentimes), language)}
                </strong>
              </span>
              <span>
                <span className="text-black/55 dark:text-white/55 me-1.5">
                  {isAr ? 'مجموع الدائن:' : isEn ? 'Total Credit:' : 'Total Crédit :'}
                </span>
                <strong className="text-black dark:text-white">
                  {formatMoney(centimesToDzd(validation.totalCreditCentimes), language)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 t-small font-semibold">
              {validation.isValid ? (
                <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Δ = 0.00 DA</span>
                </span>
              ) : (
                <span className="text-rose-700 dark:text-rose-400 inline-flex items-center gap-1.5">
                  <AlertTriangle size={15} />
                  <span>
                    Δ = {centimesToDzd(Math.abs(validation.deltaCentimes)).toFixed(2)} DA
                  </span>
                </span>
              )}
            </div>
          </div>

          {(submitError || (!validation.isValid && lines.some((l) => l.debitStr || l.creditStr))) && (
            <div
              data-testid="scf-balance-error"
              className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 t-cap"
            >
              {submitError || validation.errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <AtriumButton type="button" variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
            </AtriumButton>
            <AtriumButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={!validation.isValid}
              data-testid="scf-submit-entry-btn"
            >
              {isAr ? 'ترحيل القيد' : isEn ? 'Validate & Post' : 'Valider & Comptabiliser'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
