import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, FileText, Building2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { ContractorDgp, ContractorProject } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { numberToAlgerianWords } from '../../../utils/algerianPtt';
import { AtriumButton } from '../../ui/AtriumButton';

interface ContractorDecomptePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dgp: ContractorDgp | null;
  project?: ContractorProject;
}

export const ContractorDecomptePrintModal: React.FC<ContractorDecomptePrintModalProps> = ({
  isOpen,
  onClose,
  dgp,
  project,
}) => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

  if (!isOpen || !dgp) return null;

  const handlePrint = () => {
    window.print();
  };

  const netPayableWords = numberToAlgerianWords(dgp.netPayableDzd);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 my-8">
        {/* Modal Action Header (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                {isAr ? 'الكشف المالي المؤقت الرسمي (Décret 15-247)' : 'Bordereau Officiel de Décompte Provisoire'}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {dgp.dgpNumber} · {project?.projectName || 'Marché BTP'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>
              {isAr ? 'طباعة الكشف' : 'Imprimer le Décompte'}
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Official Document Sheet */}
        <div className="p-6 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white text-neutral-900 text-xs space-y-6 shadow-xs font-serif">
          {/* Official Republic Header */}
          <div className="text-center space-y-1 border-b border-neutral-300 pb-4">
            <p className="font-bold text-[13px] tracking-wider uppercase font-sans">
              RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
            </p>
            <p className="text-neutral-600 text-[11px] font-sans">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </p>
            <div className="pt-2 text-[11px] font-sans font-semibold text-neutral-700">
              {project?.clientName?.includes('DLEP') || project?.clientName?.includes('OPGI')
                ? project.clientName
                : 'MINISTÈRE DE L\'HABITAT, DE L\'URBANISME ET DE LA VILLE'}
            </div>
            <p className="text-[10px] text-neutral-500 font-sans">
              DIRECTION DU LOGEMENT ET DES ÉQUIPEMENTS PUBLICS (DLEP)
            </p>
          </div>

          {/* Title & Decree Stamp */}
          <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200 font-sans">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500">Document Légal</span>
              <h2 className="text-base font-black text-neutral-900">
                SITUATION DE TRAVAUX N° {dgp.dgpNumber}
              </h2>
              <p className="text-[11px] text-neutral-600 font-medium">
                Période: {dgp.periodLabel} · Établie le {dgp.issuedDate || new Date().toISOString().split('T')[0]}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-md text-[11px] font-bold">
                <ShieldCheck size={13} />
                Décret Présidentiel 15-247
              </span>
              <p className="text-[10px] text-neutral-500 mt-1">CCAG Travaux (Art. 93-100)</p>
            </div>
          </div>

          {/* Project & Contract Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 font-sans text-[11px]">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Marché & Opération</span>
              <div className="font-bold text-neutral-900">{project?.projectName || 'Construction Siège'}</div>
              <div className="text-neutral-600">Code Marché: {project?.projectCode || 'CHANT-2026-08'}</div>
              <div className="text-neutral-600">Lieu: {project?.siteLocation || 'Alger'} (Wilaya {project?.wilayaNumber || 16})</div>
              <div className="text-neutral-600 font-mono">Montant Initial Marché: {formatMoney(project?.contractAmountDzd || 0)}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Intervenants</span>
              <div className="text-neutral-800"><span className="font-semibold">Maître de l'Ouvrage:</span> {project?.clientName || 'Administration'}</div>
              <div className="text-neutral-800"><span className="font-semibold">Maître d'Œuvre (BET):</span> BET Ingénierie & Architecture</div>
              <div className="text-neutral-800"><span className="font-semibold">Organisme Contrôle CTC:</span> CTC Région Centre</div>
              <div className="text-neutral-800"><span className="font-semibold">Chef de Projet:</span> {project?.supervisorName || 'Ing. Responsable'}</div>
            </div>
          </div>

          {/* Cumulative Financial Statement Table */}
          <div className="space-y-2 font-sans">
            <h4 className="font-bold text-xs uppercase tracking-wide text-neutral-700">
              Décompte Financier Contradictoire (Dinar Algérien)
            </h4>
            <table className="w-full border-collapse border border-neutral-300 text-[11px]">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800 font-bold">
                  <th className="border border-neutral-300 p-2 text-left">Désignation des Éléments de Calcul</th>
                  <th className="border border-neutral-300 p-2 text-center w-28">Référence</th>
                  <th className="border border-neutral-300 p-2 text-right w-44">Montant (DZD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="border border-neutral-300 p-2 font-medium">Cumul général des travaux exécutés à ce jour HT</td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">Total Attachements</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono font-bold">
                    {formatMoney((dgp.previousCumulDzd || 0) + (dgp.periodGrossDzd || 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-2 font-medium text-neutral-600">À déduire: Situations antérieures déjà certifiées HT</td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">Précédent Cumul</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-neutral-600">
                    -{formatMoney(dgp.previousCumulDzd || 0)}
                  </td>
                </tr>
                <tr className="bg-neutral-50 font-bold">
                  <td className="border border-neutral-300 p-2 text-neutral-900">Montant Brut de la présente situation HT</td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">[A]</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-neutral-900">
                    {formatMoney(dgp.periodGrossDzd)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-2">
                    <span className="font-medium">Retenue de Garantie (5%)</span>
                    {project?.hasBankCautionReplacement ? (
                      <span className="block text-[10px] text-emerald-600 font-bold">
                        (Couverte par Caution Bancaire N° {project.bankCautionReference || 'BNA-2026'})
                      </span>
                    ) : (
                      <span className="block text-[10px] text-neutral-500">
                        (Dépôt légal libérable 12 mois après réception provisoire)
                      </span>
                    )}
                  </td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">Art. 99</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-amber-700">
                    {project?.hasBankCautionReplacement ? '0,00 DZD' : `-${formatMoney(dgp.retentionGuaranteeDzd)}`}
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-2">
                    <span className="font-medium">Remboursement d'Avance Forfaitaire</span>
                    <span className="block text-[10px] text-neutral-500">Amortissement contractuel sur acomptes</span>
                  </td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">Art. 109</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-neutral-600">
                    -{formatMoney(dgp.advanceAmortizationDzd || 0)}
                  </td>
                </tr>
                {dgp.penaltiesDeductedDzd && dgp.penaltiesDeductedDzd > 0 ? (
                  <tr>
                    <td className="border border-neutral-300 p-2 text-rose-700">
                      <span className="font-medium">Pénalités de retard (Décret 15-247 Art. 116)</span>
                      <span className="block text-[10px] text-rose-600">Plafonnées à 10% maximum du marché</span>
                    </td>
                    <td className="border border-neutral-300 p-2 text-center text-neutral-500">Art. 116</td>
                    <td className="border border-neutral-300 p-2 text-right font-mono text-rose-700">
                      -{formatMoney(dgp.penaltiesDeductedDzd)}
                    </td>
                  </tr>
                ) : null}
                <tr className="bg-neutral-50 font-bold">
                  <td className="border border-neutral-300 p-2">Total Net HT à mandater</td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">[B]</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-neutral-900">
                    {formatMoney(dgp.netPayableDzd - (dgp.tvaAmountDzd || 0))}
                  </td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-2 font-medium">
                    TVA ({dgp.tvaPercent || 19}%)
                    <span className="block text-[10px] text-neutral-500">
                      {dgp.tvaPercent === 9 ? 'Taux réduit Logement Social' : 'Taux normal Travaux BTP'}
                    </span>
                  </td>
                  <td className="border border-neutral-300 p-2 text-center text-neutral-500">CIDTA</td>
                  <td className="border border-neutral-300 p-2 text-right font-mono text-blue-700">
                    +{formatMoney(dgp.tvaAmountDzd || 0)}
                  </td>
                </tr>
                <tr className="bg-[#1F1D1B] text-white font-black text-xs">
                  <td className="border border-neutral-800 p-2.5 uppercase tracking-wide">
                    Montant Total Net à Mandater TTC
                  </td>
                  <td className="border border-neutral-800 p-2.5 text-center text-neutral-400">NET TTC</td>
                  <td className="border border-neutral-800 p-2.5 text-right font-mono text-sm text-[#FB923C]">
                    {formatMoney(dgp.netPayableDzd)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 font-sans space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">
              Arrêté de la présente situation (En Toutes Lettres)
            </span>
            <p className="font-semibold text-neutral-900 italic">
              « Arrêtée la présente situation de travaux à la somme nette à mandater de : {netPayableWords} »
            </p>
          </div>

          {/* Legal Signatures Strip */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-300 text-center font-sans">
            <div className="p-2 border border-neutral-200 rounded-lg h-28 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-600 uppercase">L'Entrepreneur</span>
              <p className="text-[9px] text-neutral-400">Signature & Cachet Humide</p>
            </div>
            <div className="p-2 border border-neutral-200 rounded-lg h-28 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-600 uppercase">Le Maître d'Œuvre (BET)</span>
              <p className="text-[9px] text-neutral-400">Visa pour vérification et métrés</p>
            </div>
            <div className="p-2 border border-neutral-200 rounded-lg h-28 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-600 uppercase">Le Maître de l'Ouvrage</span>
              <p className="text-[9px] text-neutral-400">Bon pour mandatement Trésor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
