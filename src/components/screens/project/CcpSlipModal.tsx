import React from 'react';
import { PMCcpSlip } from '../../../types/index';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface CcpSlipModalProps {
  isOpen: boolean;
  slip: PMCcpSlip | null;
  onClose: () => void;
  onMarkPrinted?: (slipId: string) => void;
}

export const CcpSlipModal: React.FC<CcpSlipModalProps> = ({
  isOpen,
  slip,
  onClose,
  onMarkPrinted,
}) => {
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    if (onMarkPrinted && slip) {
      onMarkPrinted(slip.id);
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center font-bold text-xs">
              SFP01
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Bordereau Officiel Algérie Poste — SFP 01
              </h3>
              <p className="text-xs text-zinc-500">
                Opération Financière Postale · Mandat de Virement CCP Conforme
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer (Format A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Postal Slip Document Canvas */}
        <div className="p-6 overflow-y-auto bg-zinc-100/60 dark:bg-zinc-950/40 flex justify-center">
          <div className="w-full max-w-2xl bg-amber-50/70 dark:bg-zinc-900 border-2 border-dashed border-amber-300 dark:border-zinc-700 rounded-xl p-6 shadow-sm text-zinc-800 dark:text-zinc-200 font-sans print:shadow-none print:border-solid print:border-black">
            {/* Header Stamp */}
            <div className="flex justify-between items-start border-b-2 border-zinc-800 dark:border-zinc-300 pb-3 mb-4">
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                </p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  MINISTÈRE DE LA POSTE ET DES TÉLÉCOMMUNICATIONS
                </p>
                <p className="text-xs font-bold text-[#C4785A] mt-0.5">
                  ALGÉRIE POSTE · OPÉRATIONS FINANCIÈRES SFP 01
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block border-2 border-zinc-800 dark:border-zinc-200 px-3 py-1 font-mono font-bold text-xs rounded">
                  SFP 01
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Édition Atrium ERP</p>
              </div>
            </div>

            {/* Financial Amount & CCP Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                  Bénéficiaire (Nom & Prénom)
                </span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 block">
                  {slip.beneficiaryName}
                </span>
                <span className="text-xs text-zinc-500 block mt-0.5">
                  Wilaya de rattachement : {slip.wilayaName}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 text-right">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                  Montant en Chiffres
                </span>
                <span className="font-mono font-extrabold text-lg text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {slip.amountDzd.toLocaleString()} DA
                </span>
              </div>
            </div>

            {/* CCP Account Box */}
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                  Numéro de Compte Courant Postal (N° CCP)
                </span>
                <span className="font-mono font-black text-xl tracking-widest text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {slip.ccpNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                  Clé CCP
                </span>
                <span className="font-mono font-black text-xl text-[#C4785A] tracking-wider tabular-nums">
                  {slip.ccpKey}
                </span>
              </div>
            </div>

            {/* Legal Amount in Words: French */}
            <div className="mb-3 p-3 bg-white/80 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                Somme en toutes lettres (Français légal) :
              </span>
              <p className="font-serif italic text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                « {slip.amountInWordsFr} »
              </p>
            </div>

            {/* Legal Amount in Words: Arabic */}
            <div className="mb-4 p-3 bg-white/80 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 text-right" dir="rtl">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                المبلغ بالأحرف كاملة (اللغة العربية القانونية) :
              </span>
              <p className="font-serif text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                « {slip.amountInWordsAr} »
              </p>
            </div>

            {/* Transaction Reference & Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-300 dark:border-zinc-700 text-xs">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Motif de l'opération :</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{slip.transactionReference}</p>
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block">Signature et Cachet du Donneur d'Ordre :</span>
                  <div className="h-12 flex items-center gap-1.5 text-zinc-400 text-xs italic">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Validé par Direction Générale NCH</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-zinc-500 block">Réservé à la Poste :</span>
                <div className="h-24 border border-zinc-300 dark:border-zinc-700 rounded bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center text-[10px] text-zinc-400 mt-1">
                  Timbre à date du bureau postal
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format standard SFP 01 conforme aux guichets Algérie Poste</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
