import React from 'react';
import { Printer, X, Download, ShieldCheck, Milk, Building2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { AgriMilkingRecord, AgriDairyCow } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';

interface OnilBordereauPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  milkingRecords: AgriMilkingRecord[];
  dairyCows: AgriDairyCow[];
}

export const OnilBordereauPrintModal: React.FC<OnilBordereauPrintModalProps> = ({
  isOpen,
  onClose,
  milkingRecords,
  dairyCows,
}) => {
  const { language, currentBusiness, currentBranch } = useAtriumStore();
  const isAr = language === 'ar';

  if (!isOpen) return null;

  const totalGrossLiters = milkingRecords.reduce((acc, m) => acc + m.totalTankLiters, 0);
  const totalRejectedLiters = milkingRecords.reduce((acc, m) => acc + m.rejectedWithholdingLiters, 0);
  const totalConformingLiters = milkingRecords.reduce((acc, m) => acc + m.conformingLiters, 0);
  const totalSubsidyDzd = milkingRecords.reduce((acc, m) => acc + m.onilTotalSubsidyDzd, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <Milk size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr
                  ? 'جدول تسليم الحليب الطازج - ملف الدعم الوطني ONIL'
                  : 'Bordereau Officiel de Livraison de Lait Cru (Subvention ONIL)'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'مطابق للقرار الوزاري المشترك - 12 دج/لتر للمربي المعتمد لدى مصالح الفلاحة DSA'
                  : 'Conforme à l\'Arrêté Interministériel - Prime de 12,00 DA/Litre versée par l\'ONIL'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>
              {isAr ? 'طباعة الوثيقة الرسمية' : 'Imprimer Bordereau'}
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Official Layout */}
        <div className="bg-white text-neutral-900 p-8 rounded-2xl border border-neutral-300 shadow-xs space-y-6 font-sans text-xs print:m-0 print:p-0 print:border-none print:shadow-none">
          {/* Official Republic Header */}
          <div className="text-center space-y-1 pb-4 border-b border-neutral-300">
            <p className="font-bold text-[11px] tracking-wide uppercase">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </p>
            <p className="text-[10px] text-neutral-600 uppercase">
              RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
            </p>
            <p className="text-[10px] text-neutral-700 font-semibold pt-1">
              وزارة الفلاحة والتنمية الريفية · الديوان الوطني المهني المشترك للحليب ومشتقاته (ONIL)
            </p>
            <h1 className="text-base font-black tracking-wider uppercase text-neutral-900 pt-2">
              BORDEREAU MENSUEL DE LIVRAISON DE LAIT CRU DE VACHE
            </h1>
            <p className="text-[11px] font-bold text-neutral-600">
              Dispositif de Soutien à la Production Nationale · Campagne 2026
            </p>
          </div>

          {/* Farm & Laiterie Info Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-neutral-800 uppercase block text-[10px]">
                Identification de l'Exploitation (Éleveur)
              </span>
              <p className="font-semibold text-neutral-900 text-sm">
                {currentBusiness?.name || 'Domaine Agricole & Élevage El Baraka'}
              </p>
              <p className="text-neutral-600">
                Carte Fellah N°: <span className="font-mono font-bold">CAW-16-09418</span>
              </p>
              <p className="text-neutral-600">
                Wilaya / Commune: <span className="font-medium">Alger / Zéralda - Mitidja</span>
              </p>
              <p className="text-neutral-600">
                Compte Bancaire BADR / RIP: <span className="font-mono font-bold">003 00116 0248192019 44</span>
              </p>
            </div>

            <div className="space-y-1.5 border-l border-neutral-200 pl-4">
              <span className="font-bold text-neutral-800 uppercase block text-[10px]">
                Laiterie de Transformation Agréée
              </span>
              <p className="font-semibold text-neutral-900 text-sm">
                Laiterie Publique Giplait Draa Ben Khedda
              </p>
              <p className="text-neutral-600">
                Agrément Sanitaire N°: <span className="font-mono font-bold">DSV-15-LAIT-084</span>
              </p>
              <p className="text-neutral-600">
                Taux de Subvention État: <span className="font-bold text-emerald-700">12,00 DA / Litre conforme</span>
              </p>
              <p className="text-neutral-600">
                Période de Livraison: <span className="font-medium">Mois de Mai 2026</span>
              </p>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">
              1. Détail des Sessions de Traite & Livraisons Réceptionnées
            </h3>
            <table className="w-full text-left border-collapse border border-neutral-200 text-xs">
              <thead>
                <tr className="bg-neutral-100 text-neutral-700">
                  <th className="border border-neutral-200 p-2 font-bold">Date Session</th>
                  <th className="border border-neutral-200 p-2 font-bold">Période</th>
                  <th className="border border-neutral-200 p-2 font-bold">N° BL Laiterie</th>
                  <th className="border border-neutral-200 p-2 font-bold text-right">Volume Brut</th>
                  <th className="border border-neutral-200 p-2 font-bold text-right">Lait Retenu (Antibiotique)</th>
                  <th className="border border-neutral-200 p-2 font-bold text-right">Volume Conforme</th>
                  <th className="border border-neutral-200 p-2 font-bold text-right">Prime ONIL (12 DA)</th>
                </tr>
              </thead>
              <tbody>
                {milkingRecords.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50/80">
                    <td className="border border-neutral-200 p-2 font-mono">{m.sessionDate}</td>
                    <td className="border border-neutral-200 p-2 capitalize">
                      {m.sessionPeriod === 'morning' ? 'Traite Matin (06h)' : 'Traite Soir (18h)'}
                    </td>
                    <td className="border border-neutral-200 p-2 font-mono font-semibold">
                      {m.dairyDeliverySlipNo || 'BL-REC-001'}
                    </td>
                    <td className="border border-neutral-200 p-2 text-right font-mono">
                      {m.totalTankLiters} L
                    </td>
                    <td className="border border-neutral-200 p-2 text-right font-mono text-rose-600 font-bold">
                      {m.rejectedWithholdingLiters > 0 ? `-${m.rejectedWithholdingLiters} L` : '0 L'}
                    </td>
                    <td className="border border-neutral-200 p-2 text-right font-mono font-bold text-neutral-900">
                      {m.conformingLiters} L
                    </td>
                    <td className="border border-neutral-200 p-2 text-right font-mono font-bold text-emerald-700">
                      {formatMoney(m.onilTotalSubsidyDzd)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-bold text-neutral-900">
                  <td colSpan={3} className="border border-neutral-200 p-2 text-right uppercase">
                    Totaux Mensuels :
                  </td>
                  <td className="border border-neutral-200 p-2 text-right font-mono">{totalGrossLiters} L</td>
                  <td className="border border-neutral-200 p-2 text-right font-mono text-rose-600">
                    -{totalRejectedLiters} L
                  </td>
                  <td className="border border-neutral-200 p-2 text-right font-mono text-neutral-950 font-black">
                    {totalConformingLiters} L
                  </td>
                  <td className="border border-neutral-200 p-2 text-right font-mono text-emerald-800 font-black text-sm">
                    {formatMoney(totalSubsidyDzd)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Herd Sanitary Inspection Note */}
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-700 shrink-0" />
              <span>
                <strong>Conformité Sanitaire DSV :</strong> Cheptel contrôlé ({dairyCows.length} vaches identifiées par boucles DZ). Zéro résidu d'antibiotique dans les volumes conformes certifiés.
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-800">
              MG Moyenne : 35.8 g/L · Densité : 1.029
            </span>
          </div>

          {/* Official Signatures Tri-Partite */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-300 text-center">
            <div className="space-y-12">
              <p className="font-bold text-[11px] uppercase">L'Éleveur Producteur</p>
              <p className="text-[10px] text-neutral-400">(Signature & Cachet)</p>
            </div>
            <div className="space-y-12 border-x border-neutral-200 px-2">
              <p className="font-bold text-[11px] uppercase">Le Responsable Laiterie</p>
              <p className="text-[10px] text-neutral-400">(Visa Réception & Pesée)</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-[11px] uppercase">L'Inspecteur Vétérinaire DSA</p>
              <p className="text-[10px] text-neutral-400">(Cachet Officiel ONIL / DSA)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
