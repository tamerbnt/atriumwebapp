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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 my-8 relative">
        {/* Header Toolbar (hidden on print) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#d4522f] bg-[#d4522f]/10 px-2.5 py-1 rounded-lg">
              {slip.receiptNumber}
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              {slip.periodLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AtriumButton onClick={handlePrint} className="h-9 px-4 text-xs flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة القسيمة' : isEn ? 'Print Payslip' : 'Imprimer le Bulletin'}</span>
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Algerian Bulletin de Paie */}
        <div id="payslip-document" className="bg-white text-black p-6 md:p-8 rounded-xl border border-neutral-300 font-sans text-xs">
          {/* Header Block */}
          <div className="text-center pb-4 border-b-2 border-black/80 mb-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-600">
              République Algérienne Démocratique et Populaire
            </p>
            <h2 className="text-lg font-black tracking-tight text-neutral-900 uppercase mt-1">
              {businessName}
            </h2>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Complexe Sportif & Salle de Musculation · Alger Centre · NIF: 002416098124589 · RC: 16/00-88124
            </p>
            <div className="inline-block mt-2 px-4 py-1 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-sm">
              Bulletin de Paie · {slip.periodLabel}
            </div>
          </div>

          {/* Employee & Administrative Information */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-4">
            <div className="space-y-1">
              <p><span className="font-bold text-neutral-600">Collaborateur :</span> <strong className="text-neutral-900 text-sm">{slip.staffFullName}</strong></p>
              <p><span className="font-bold text-neutral-600">Matricule :</span> <span className="font-mono font-bold">{slip.matricule}</span></p>
              <p><span className="font-bold text-neutral-600">Poste / Fonction :</span> {slip.role}</p>
              <p><span className="font-bold text-neutral-600">N° Sécurité Sociale (NSS) :</span> <span className="font-mono">{slip.nss || '89 04 16 0000 00'}</span></p>
            </div>
            <div className="space-y-1 text-right">
              <p><span className="font-bold text-neutral-600">Mode de Règlement :</span> <strong className="uppercase">{slip.paymentMethod === 'ccp' ? 'Virement CCP Poste' : slip.paymentMethod === 'bank_transfer' ? 'Virement Bancaire' : 'Espèces (Caisse)'}</strong></p>
              {slip.ccpNumber && (
                <p><span className="font-bold text-neutral-600">Compte CCP :</span> <span className="font-mono font-bold">{slip.ccpNumber} / {slip.ccpKey}</span></p>
              )}
              {slip.bankRib && (
                <p><span className="font-bold text-neutral-600">RIB Bancaire :</span> <span className="font-mono text-[10px]">{slip.bankRib}</span></p>
              )}
              <p><span className="font-bold text-neutral-600">Jours travaillés :</span> <span className="font-mono font-bold">{slip.workedDays} / {slip.standardDays} j</span></p>
              <p><span className="font-bold text-neutral-600">Date d'édition :</span> {slip.paidDate || new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <table className="w-full border-collapse border border-neutral-300 text-[11px] mb-4">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 text-left">
                <th className="border border-neutral-300 p-2 font-bold">Rubriques de Paie</th>
                <th className="border border-neutral-300 p-2 text-right font-bold w-24">Base (DZD)</th>
                <th className="border border-neutral-300 p-2 text-center font-bold w-16">Taux</th>
                <th className="border border-neutral-300 p-2 text-right font-bold w-28">Gains (DZD)</th>
                <th className="border border-neutral-300 p-2 text-right font-bold w-28">Retenues (DZD)</th>
              </tr>
            </thead>
            <tbody>
              {/* Base wage */}
              <tr>
                <td className="border border-neutral-300 p-1.5 font-medium">Salaire de Base</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono">{slip.baseSalary.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-center font-mono">100%</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold">{slip.actualBaseSalary.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
              </tr>

              {/* Primes cotisables */}
              {slip.primesCotisables?.map((prime, idx) => (
                <tr key={`prime_${idx}`}>
                  <td className="border border-neutral-300 p-1.5">{prime.label}</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono">{prime.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">-</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold">{prime.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
                </tr>
              ))}

              {/* Total Brut Cotisable Row */}
              <tr className="bg-neutral-50 font-bold">
                <td colSpan={3} className="border border-neutral-300 p-1.5 uppercase text-neutral-700">Total Salaire Brut Cotisable</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-900">{slip.salaireBrutCotisable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
              </tr>

              {/* CNAS Salarial 9% */}
              <tr>
                <td className="border border-neutral-300 p-1.5">Cotisation Sécurité Sociale (CNAS Salariale)</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono">{slip.salaireBrutCotisable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-center font-mono font-bold text-red-600">9.0%</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold text-red-600">{slip.cnasSalarial.toLocaleString()}</td>
              </tr>

              {/* Total Brut Imposable Row */}
              <tr className="bg-neutral-50 font-bold">
                <td colSpan={3} className="border border-neutral-300 p-1.5 uppercase text-neutral-700">Salaire Brut Imposable</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-900">{slip.salaireBrutImposable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
              </tr>

              {/* IRG 2022 */}
              <tr>
                <td className="border border-neutral-300 p-1.5">Impôt sur le Revenu Global (IRG - Barème 2022)</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono">{slip.salaireBrutImposable.toLocaleString()}</td>
                <td className="border border-neutral-300 p-1.5 text-center font-mono">Barème</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold text-red-600">{slip.irgTax.toLocaleString()}</td>
              </tr>

              {/* Primes Non Imposables (Panier, Transport) */}
              {slip.primesNonImposables?.map((allowance, idx) => (
                <tr key={`allowance_${idx}`}>
                  <td className="border border-neutral-300 p-1.5">{allowance.label} (Non Cotisable / Non Imposable)</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono">{allowance.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">-</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold text-emerald-700">{allowance.amount.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
                </tr>
              ))}

              {/* Acomptes déduits */}
              {slip.acomptesDeduits > 0 && (
                <tr className="bg-amber-50">
                  <td className="border border-neutral-300 p-1.5 font-bold text-amber-900">Acomptes sur Salaire Déduits</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono">{slip.acomptesDeduits.toLocaleString()}</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">-</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-400">-</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold text-amber-900">{slip.acomptesDeduits.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Employer Contributions (Quote-part patronale) */}
          <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 mb-4 text-[10px] text-neutral-600 flex justify-between items-center">
            <span><strong>Quote-part patronale Sécurité Sociale (26%) :</strong> <span className="font-mono">{slip.cnasPatronal.toLocaleString()} DZD</span></span>
            <span><strong>Coût global du poste pour l'employeur :</strong> <span className="font-mono font-bold text-neutral-900">{(slip.salaireBrutCotisable + slip.cnasPatronal + (slip.primesNonImposables?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString()} DZD</span></span>
          </div>

          {/* Net to Pay Box */}
          <div className="flex items-center justify-between p-4 bg-black text-white rounded-lg mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Net à Payer (DZD)</p>
              <p className="text-xl font-black font-mono tracking-tight mt-0.5">
                {slip.netAPayer.toLocaleString()} <span className="text-xs font-normal text-neutral-400">Dinars Algériens</span>
              </p>
            </div>
            <div className="text-right max-w-sm">
              <p className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">Arrêté en toutes lettres :</p>
              <p className="text-xs italic font-serif leading-snug mt-0.5 text-neutral-200">
                "{amountInWords}"
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-300 text-[10px]">
            <div className="h-20 flex flex-col justify-between">
              <span className="font-bold text-neutral-600">Cachet & Signature de l'Employeur :</span>
              <span className="italic text-neutral-400 text-[9px]">[Document validé électroniquement par la Direction]</span>
            </div>
            <div className="h-20 flex flex-col justify-between text-right">
              <span className="font-bold text-neutral-600">Signature du Salarié :</span>
              <span className="italic text-neutral-400 text-[9px]">Pour acquit et acceptation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
