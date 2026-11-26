import React from 'react';
import { AlertTriangle, Printer, X } from 'lucide-react';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import {
  getG50PreparationDisclaimer,
  type GeneralLedgerRow,
  type TrialBalanceReport,
  type TvaG50AidReport,
} from '../../../utils/scfAccountingEngine';
import { useAtriumSelector, selectCurrentBusinessFromState, selectCurrentBusinessConfigFromState } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';

export type ScfPrintReportKind = 'trial_balance' | 'general_ledger' | 'g50_aid';

interface ScfPrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kind: ScfPrintReportKind;
  periodLabel: string;
  trialBalance?: TrialBalanceReport;
  generalLedger?: {
    accountCode: string;
    accountLabel: string;
    rows: GeneralLedgerRow[];
    totalDebitCentimes: number;
    totalCreditCentimes: number;
    endingBalanceCentimes: number;
  };
  g50Report?: TvaG50AidReport;
}

export const ScfPrintReportModal: React.FC<ScfPrintReportModalProps> = ({
  isOpen,
  onClose,
  kind,
  periodLabel,
  trialBalance,
  generalLedger,
  g50Report,
}) => {
  const { language, isRtl } = useTranslation();
  const business = useAtriumSelector(selectCurrentBusinessFromState);
  const config = useAtriumSelector(selectCurrentBusinessConfigFromState);
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const fp = config?.fiscalProfile;
  const disclaimer = g50Report?.disclaimer || getG50PreparationDisclaimer(language);

  const reportTitle =
    kind === 'trial_balance'
      ? isAr
        ? 'ميزان المراجعة العام (SCF)'
        : isEn
          ? 'SCF Trial Balance'
          : 'Balance Générale des Comptes (SCF 07-11)'
      : kind === 'general_ledger'
        ? isAr
          ? 'دفتر الأستاذ العام'
          : isEn
            ? 'General Ledger Account'
            : 'Grand Livre Auxiliaire & Général'
        : isAr
          ? 'تقرير مساعدة التصريح الضريبي G50 / TVA'
          : isEn
            ? 'TVA / G50 Preparation Aid'
            : 'État Préparatoire TVA / G50';

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl print:max-w-none"
      scrimClassName="bg-black/70 print:p-0 print:bg-white print:static print:z-auto"
      ariaLabel={reportTitle}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        data-sq="panel"
        data-sq-border="solid"
        className="w-full bg-white text-black flex flex-col max-h-[94vh] overflow-hidden print:max-h-none print:border-none"
      >
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 bg-stone-900 text-white shrink-0 print:hidden">
          <span className="t-small font-semibold truncate">{reportTitle}</span>
          <div className="flex items-center gap-2">
            <AtriumButton
              variant="primary"
              size="xs"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              {isAr ? 'طباعة A4' : isEn ? 'Print A4' : 'Imprimer A4'}
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-white/75 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 sm:p-8 print:p-0 print:overflow-visible bg-white text-black space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-300 pb-4">
            <div>
              <h1 className="text-lg font-bold text-stone-900">
                {fp?.companyLegalName || business?.displayName || business?.name || 'Atrium'}
              </h1>
              <div className="text-xs text-stone-600 space-x-3 mt-1 font-mono">
                {fp?.nif && <span>NIF: {fp.nif}</span>}
                {fp?.nis && <span>NIS: {fp.nis}</span>}
                {fp?.rc && <span>RC: {fp.rc}</span>}
                {fp?.ai && <span>AI: {fp.ai}</span>}
              </div>
            </div>
            <div className="text-end">
              <div className="text-base font-bold text-stone-900">{reportTitle}</div>
              <div className="text-xs text-stone-600 tabular-nums mt-0.5">
                {isAr ? 'الفترة:' : isEn ? 'Period:' : 'Période :'} {periodLabel} ·{' '}
                {new Date().toISOString().slice(0, 10)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-400 bg-amber-50 text-amber-950 text-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-700" />
            <span className="font-medium">{disclaimer}</span>
          </div>

          {kind === 'trial_balance' && trialBalance && (
            <table className="w-full text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b-2 border-stone-800 text-stone-700">
                  <th className="py-2 text-start font-mono">Code</th>
                  <th className="py-2 text-start">Intitulé</th>
                  <th className="py-2 text-end">Mvt Débit</th>
                  <th className="py-2 text-end">Mvt Crédit</th>
                  <th className="py-2 text-end">Solde Déb.</th>
                  <th className="py-2 text-end">Solde Créd.</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((r) => (
                  <tr key={r.accountCode} className="border-b border-stone-200">
                    <td className="py-1.5 font-mono font-semibold">{r.accountCode}</td>
                    <td className="py-1.5">{r.accountLabel}</td>
                    <td className="py-1.5 text-end">{formatMoney(centimesToDzd(r.totalDebitCentimes), language)}</td>
                    <td className="py-1.5 text-end">{formatMoney(centimesToDzd(r.totalCreditCentimes), language)}</td>
                    <td className="py-1.5 text-end">{formatMoney(centimesToDzd(r.closingDebitBalanceCentimes), language)}</td>
                    <td className="py-1.5 text-end">{formatMoney(centimesToDzd(r.closingCreditBalanceCentimes), language)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-800 font-bold">
                  <td colSpan={2} className="py-2">TOTAUX GÉNÉRAUX</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(trialBalance.totalMovementsDebitCentimes), language)}</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(trialBalance.totalMovementsCreditCentimes), language)}</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(trialBalance.totalClosingDebitCentimes), language)}</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(trialBalance.totalClosingCreditCentimes), language)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {kind === 'general_ledger' && generalLedger && (
            <div className="space-y-3">
              <div className="text-sm font-semibold font-mono text-stone-900">
                {generalLedger.accountCode} — {generalLedger.accountLabel}
              </div>
              <table className="w-full text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b-2 border-stone-800 text-stone-700">
                    <th className="py-2 text-start">Date</th>
                    <th className="py-2 text-start font-mono">N° Écriture</th>
                    <th className="py-2 text-start">Pièce</th>
                    <th className="py-2 text-start">Libellé</th>
                    <th className="py-2 text-end">Débit</th>
                    <th className="py-2 text-end">Crédit</th>
                    <th className="py-2 text-end">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {generalLedger.rows.map((r) => (
                    <tr key={r.lineId} className="border-b border-stone-200">
                      <td className="py-1.5">{r.entryDate}</td>
                      <td className="py-1.5 font-mono">{r.entryNumber}</td>
                      <td className="py-1.5 font-mono">{r.pieceRef}</td>
                      <td className="py-1.5">{r.libelle}</td>
                      <td className="py-1.5 text-end">{r.debitCentimes > 0 ? formatMoney(centimesToDzd(r.debitCentimes), language) : '—'}</td>
                      <td className="py-1.5 text-end">{r.creditCentimes > 0 ? formatMoney(centimesToDzd(r.creditCentimes), language) : '—'}</td>
                      <td className="py-1.5 text-end font-semibold">{formatMoney(centimesToDzd(r.runningBalanceCentimes), language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {kind === 'g50_aid' && g50Report && (
            <table className="w-full text-sm border-collapse tabular-nums">
              <thead>
                <tr className="border-b-2 border-stone-800">
                  <th className="py-2 text-start">Rubrique Fiscale (Aide G50)</th>
                  <th className="py-2 text-start font-mono">Compte SCF</th>
                  <th className="py-2 text-end">Montant (DZD)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-200">
                  <td className="py-2">Chiffre d’Affaires Imposable HT</td>
                  <td className="py-2 font-mono">700 / 706</td>
                  <td className="py-2 text-end font-semibold">{formatMoney(centimesToDzd(g50Report.taxableTurnoverHtCentimes), language)}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2">TVA Collectée</td>
                  <td className="py-2 font-mono">445700</td>
                  <td className="py-2 text-end font-semibold">{formatMoney(centimesToDzd(g50Report.tvaCollectedCentimes), language)}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2">TVA Déductible</td>
                  <td className="py-2 font-mono">445600</td>
                  <td className="py-2 text-end font-semibold">{formatMoney(centimesToDzd(g50Report.tvaDeductibleCentimes), language)}</td>
                </tr>
                <tr className="border-b border-stone-300 font-bold bg-stone-50">
                  <td className="py-2.5">TVA Nette à Payer / (Précompte)</td>
                  <td className="py-2.5 font-mono">4457 - 4456</td>
                  <td className="py-2.5 text-end">
                    {g50Report.netTvaPayableCentimes > 0
                      ? formatMoney(centimesToDzd(g50Report.netTvaPayableCentimes), language)
                      : `(${formatMoney(centimesToDzd(g50Report.tvaCreditCarryForwardCentimes), language)})`}
                  </td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2">Droits de Timbre Fiscal</td>
                  <td className="py-2 font-mono">447000</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(g50Report.timbreFiscalCentimes), language)}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2">IRG Salaires Retenu</td>
                  <td className="py-2 font-mono">442000</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(g50Report.irgSalariesCentimes), language)}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2">Cotisations Sociales CNAS</td>
                  <td className="py-2 font-mono">431000</td>
                  <td className="py-2 text-end">{formatMoney(centimesToDzd(g50Report.cnasPayableCentimes), language)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </KineticModalShell>
  );
};
