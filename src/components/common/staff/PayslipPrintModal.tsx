import React from 'react';
import { X, Printer, Download, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StaffPayrollSlipRecord } from '../../../types/index';
import { AtriumButton } from '../../ui/AtriumButton';
import { numberToAlgerianWordsFR } from '../../../utils/algerianPayroll';

interface PayslipPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: StaffPayrollSlipRecord | null;
  businessName?: string;
  language: string;
}

export const PayslipPrintModal: React.FC<PayslipPrintModalProps> = ({
  isOpen,
  onClose,
  slip,
  businessName = 'ATRIUM FITNESS & WELLNESS CLUB',
  language,
}) => {
  if (!isOpen || !slip) return null;

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const handlePrint = () => {
    window.print();
  };

  const amountInWords = numberToAlgerianWordsFR(slip.netAPayer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--s4,16px)] bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="sq-elev-pop max-w-3xl w-full">
        <div
          data-sq="panel"
          style={{ '--sq-stroke': 'var(--atr-border, #E5E5E5)' } as React.CSSProperties}
          className="bg-white dark:bg-[#18181B] w-full p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] relative"
        >
          {/* Header Toolbar (hidden on print) */}
          <div className="flex items-center justify-between pb-[var(--s4,16px)] border-b border-neutral-200 dark:border-neutral-800 print:hidden">
            <div className="flex items-center gap-[var(--s2,8px)]">
              <span className="inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#d4522f]/10 tabular-nums">
                {slip.receiptNumber}
              </span>
              <span className="t-label text-[var(--text-2)] dark:text-white/75">
                {slip.periodLabel}
              </span>
            </div>
            <div className="flex items-center gap-[var(--s3,12px)]">
              <AtriumButton onClick={handlePrint} icon={<Printer className="w-4 h-4" strokeWidth={1.5} />}>
                <span>{isAr ? 'طباعة القسيمة' : isEn ? 'Print Payslip' : 'Imprimer le Bulletin'}</span>
              </AtriumButton>
              <button
                type="button"
                onClick={onClose}
                className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] flex items-center justify-center rounded-full text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Printable Official Algerian Bulletin de Paie */}
          <div id="payslip-document" className="bg-white text-[var(--text-1)] p-[var(--s6,24px)] rounded-[var(--r-card,16px)] border border-neutral-300 flex flex-col gap-[var(--s4,16px)] t-body">
          {/* Header Block */}
          <div className="text-center pb-[var(--s4,16px)] border-b-2 border-black/80 flex flex-col items-center gap-[var(--s1,4px)]">
            <p className="t-small text-[var(--text-2)]">
              République Algérienne Démocratique et Populaire
            </p>
            <h2 className="t-dialog text-[var(--text-1)]">
              {businessName}
            </h2>
            <p className="t-cap text-[var(--text-2)]">
              Complexe Sportif & Salle de Musculation · Alger Centre · NIF : 002416098124589 · RC : 16/00-88124
            </p>
            <div className="inline-block px-[var(--s4,16px)] py-[var(--s1,4px)] bg-black text-white t-btn rounded-[var(--r-check,6px)]">
              Bulletin de Paie · {slip.periodLabel}
            </div>
          </div>

          {/* Employee & Administrative Information */}
          <div data-sq="card" data-sq-border="solid" className="grid grid-cols-2 gap-[var(--s4,16px)] p-[var(--s3,12px)] bg-neutral-50 border border-neutral-200 [--sq-stroke:#e5e5e5]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <p><span className="font-semibold text-[var(--text-2)]">Collaborateur :</span> <strong className="font-semibold text-[var(--text-1)] t-card">{slip.staffFullName}</strong></p>
              <p><span className="font-semibold text-[var(--text-2)]">Matricule :</span> <span className="font-semibold tabular-nums">{slip.matricule}</span></p>
              <p><span className="font-semibold text-[var(--text-2)]">Poste / Fonction :</span> {slip.role}</p>
              <p><span className="font-semibold text-[var(--text-2)]">N° Sécurité Sociale (NSS) :</span> <span className="tabular-nums">{slip.nss || '89 04 16 0000 00'}</span></p>
            </div>
            <div className="flex flex-col gap-[var(--s1,4px)] text-right">
              <p><span className="font-semibold text-[var(--text-2)]">Mode de Règlement :</span> <strong className="font-semibold">{slip.paymentMethod === 'ccp' ? 'Virement CCP Poste' : slip.paymentMethod === 'bank_transfer' ? 'Virement Bancaire' : 'Espèces (Caisse)'}</strong></p>
              {slip.ccpNumber && (
                <p><span className="font-semibold text-[var(--text-2)]">Compte CCP :</span> <span className="font-semibold tabular-nums">{slip.ccpNumber} / {slip.ccpKey}</span></p>
              )}
              {slip.bankRib && (
                <p><span className="font-semibold text-[var(--text-2)]">RIB Bancaire :</span> <span className="t-cap tabular-nums">{slip.bankRib}</span></p>
              )}
              <p><span className="font-semibold text-[var(--text-2)]">Jours travaillés :</span> <span className="font-semibold tabular-nums">{slip.workedDays} / {slip.standardDays} j</span></p>
              <p><span className="font-semibold text-[var(--text-2)]">Date d'édition :</span> <span className="tabular-nums">{slip.paidDate || new Date().toISOString().slice(0, 10)}</span></p>
            </div>
          </div>

          {/* Breakdown Table */}
          <table className="w-full border-collapse border border-neutral-300 t-cap tabular-nums">
            <thead>
              <tr className="bg-neutral-100 text-[var(--text-1)] text-left">
                <th className="border border-neutral-300 p-[var(--s2,8px)] font-semibold">Rubriques de Paie</th>
                <th className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold w-24">Base (DZD)</th>
                <th className="border border-neutral-300 p-[var(--s2,8px)] text-center font-semibold w-16">Taux</th>
                <th className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold w-28">Gains (DZD)</th>
                <th className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold w-28">Retenues (DZD)</th>
              </tr>
            </thead>
            <tbody>
              {/* Base wage */}
              <tr>
                <td className="border border-neutral-300 p-[var(--s2,8px)] font-medium">Salaire de Base</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{slip.baseSalary.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-center">100 %</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold">{slip.actualBaseSalary.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
              </tr>

              {/* Primes cotisables */}
              {slip.primesCotisables?.map((prime, idx) => (
                <tr key={`prime_${idx}`}>
                  <td className="border border-neutral-300 p-[var(--s2,8px)]">{prime.label}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{prime.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-center">-</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold">{prime.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
                </tr>
              ))}

              {/* Total Brut Cotisable Row */}
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={3} className="border border-neutral-300 p-[var(--s2,8px)] text-[var(--text-1)]">Total Salaire Brut Cotisable</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-1)]">{slip.salaireBrutCotisable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
              </tr>

              {/* CNAS Salarial 9% */}
              <tr>
                <td className="border border-neutral-300 p-[var(--s2,8px)]">Cotisation Sécurité Sociale (CNAS Salariale)</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{slip.salaireBrutCotisable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-center font-semibold text-red-600">9.0 %</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold text-red-600">{slip.cnasSalarial.toLocaleString()}</td>
              </tr>

              {/* Total Brut Imposable Row */}
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={3} className="border border-neutral-300 p-[var(--s2,8px)] text-[var(--text-1)]">Salaire Brut Imposable</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-1)]">{slip.salaireBrutImposable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
              </tr>

              {/* IRG 2022 */}
              <tr>
                <td className="border border-neutral-300 p-[var(--s2,8px)]">Impôt sur le Revenu Global (IRG - Barème 2022)</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{slip.salaireBrutImposable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-center">Barème</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
                <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold text-red-600">{slip.irgTax.toLocaleString()}</td>
              </tr>

              {/* Primes Non Imposables (Panier, Transport) */}
              {slip.primesNonImposables?.map((allowance, idx) => (
                <tr key={`allowance_${idx}`}>
                  <td className="border border-neutral-300 p-[var(--s2,8px)]">{allowance.label} (Non Cotisable / Non Imposable)</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{allowance.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-center">-</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold text-emerald-700">{allowance.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
                </tr>
              ))}

              {/* Acomptes déduits */}
              {slip.acomptesDeduits > 0 && (
                <tr className="bg-amber-50">
                  <td className="border border-neutral-300 p-[var(--s2,8px)] font-semibold text-amber-900">Acomptes sur Salaire Déduits</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right">{slip.acomptesDeduits.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-center">-</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right text-[var(--text-3)]">-</td>
                  <td className="border border-neutral-300 p-[var(--s2,8px)] text-right font-semibold text-amber-900">{slip.acomptesDeduits.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Employer Contributions (Quote-part patronale) */}
          <div data-sq="card" data-sq-border="solid" className="p-[var(--s3,12px)] bg-neutral-50 border border-neutral-200 [--sq-stroke:#e5e5e5] t-cap text-[var(--text-2)] flex justify-between items-center tabular-nums">
            <span><strong className="font-semibold text-[var(--text-1)]">Quote-part patronale Sécurité Sociale (26 %) :</strong> {slip.cnasPatronal.toLocaleString()} DZD</span>
            <span><strong className="font-semibold text-[var(--text-1)]">Coût global du poste pour l'employeur :</strong> <span className="font-semibold text-[var(--text-1)]">{(slip.salaireBrutCotisable + slip.cnasPatronal + (slip.primesNonImposables?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString()} DZD</span></span>
          </div>

          {/* Net to Pay Box */}
          <div data-sq="card" data-sq-border="none" data-surface="dark" className="flex items-center justify-between p-[var(--s4,16px)] bg-black text-white tabular-nums">
            <div className="flex flex-col gap-[var(--title-cap-gap,2px)]">
              <p className="t-small text-[var(--text-dark-2,#A99E92)]">Net à Payer (DZD)</p>
              <p className="t-dialog text-white flex items-baseline gap-[var(--num-unit-gap,6px)]">
                <span>{slip.netAPayer.toLocaleString()}</span>
                <span className="t-small font-normal text-white/75">Dinars Algériens</span>
              </p>
            </div>
            <div className="text-right max-w-sm flex flex-col gap-[var(--title-cap-gap,2px)]">
              <p className="t-small text-[var(--text-dark-2,#A99E92)]">Arrêté en toutes lettres :</p>
              <p className="t-body italic text-white/90">
                « {amountInWords} »
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-[var(--s7,32px)] pt-[var(--s4,16px)] border-t border-neutral-300 t-cap">
            <div className="h-20 flex flex-col justify-between">
              <span className="font-semibold text-[var(--text-1)]">Cachet & Signature de l'Employeur :</span>
              <span className="italic text-[var(--text-2)]">[Document validé électroniquement par la Direction]</span>
            </div>
            <div className="h-20 flex flex-col justify-between text-right">
              <span className="font-semibold text-[var(--text-1)]">Signature du Salarié :</span>
              <span className="italic text-[var(--text-2)]">Pour acquit et acceptation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
