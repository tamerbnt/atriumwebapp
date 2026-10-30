import React from 'react';
import { Printer, X, Scale, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { AgriWeighbridgeTicket } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';

interface AgriWeighbridgePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AgriWeighbridgeTicket | null;
}

export const AgriWeighbridgePrintModal: React.FC<AgriWeighbridgePrintModalProps> = ({
  isOpen,
  onClose,
  ticket,
}) => {
  const { language, currentBusiness } = useAtriumStore();
  const isAr = language === 'ar';

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCash = ticket.paymentMethod === 'cash' || (ticket.paymentMethod as any) === 'especes';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Scale size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'تذكرة ميزان الجسر ووصل التسليم' : 'Ticket Pont-Bascule & Bon de Livraison'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'وصل تسليم رسمي مزدوج اللغة مع حساب طابع المادة 317'
                  : 'Document commercial bilingue avec pesée brute/tare et droit de timbre Art. 317'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>
              {isAr ? 'طباعة الوصل' : 'Imprimer Ticket'}
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

        {/* Printable Ticket Voucher (A5 Format) */}
        <div className="bg-white text-neutral-900 p-6 rounded-2xl border border-neutral-300 shadow-xs space-y-5 font-sans text-xs print:m-0 print:p-0 print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-300 pb-4">
            <div className="space-y-1">
              <h1 className="text-sm font-black tracking-tight text-neutral-950 uppercase">
                {currentBusiness?.name || 'DOMAINE AGRICOLE & ÉLEVAGE EL BARAKA'}
              </h1>
              <p className="text-[10px] text-neutral-600">
                Exploitation Maraîchère, Arboricole & Céréalière · Mitidja
              </p>
              <p className="text-[10px] text-neutral-600 font-mono">
                Carte Fellah: CAW-16-09418 · RC/NIF: 001916024810931
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                N° Ticket Pesée
              </span>
              <span className="text-sm font-mono font-black text-[#C4785A]">
                {ticket.ticketNumber}
              </span>
              <span className="text-[10px] text-neutral-500 block">
                Date: {ticket.date}
              </span>
            </div>
          </div>

          {/* Client / Destination Grid */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <div>
              <span className="text-[9px] font-bold text-neutral-500 uppercase block">
                Acheteur / Mandataire de Gros
              </span>
              <p className="font-bold text-neutral-900 text-xs mt-0.5">
                {ticket.buyerName}
              </p>
              <p className="text-[10px] text-neutral-600">
                Destination : {ticket.destinationWholesaleMarket}
              </p>
            </div>
            <div className="border-l border-neutral-200 pl-3">
              <span className="text-[9px] font-bold text-neutral-500 uppercase block">
                Véhicule & Chauffeur
              </span>
              <p className="font-bold text-neutral-900 font-mono text-xs mt-0.5">
                Matricule : {ticket.truckPlate}
              </p>
              <p className="text-[10px] text-neutral-600">
                Chauffeur : {ticket.driverName || 'Non spécifié'}
              </p>
            </div>
          </div>

          {/* Weighbridge Double Pesée Breakdown */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
              Détail de la Double Pesée Pont-Bascule
            </span>
            <table className="w-full text-left border-collapse border border-neutral-200 text-xs">
              <tbody>
                <tr className="border-b border-neutral-200">
                  <td className="p-2 font-medium text-neutral-600">Désignation du Produit Récolté</td>
                  <td className="p-2 font-bold text-neutral-900 text-right">{ticket.cropDesignation}</td>
                </tr>
                <tr className="border-b border-neutral-200 bg-neutral-50/50">
                  <td className="p-2 font-medium text-neutral-600">Pesée 1 : Poids Brut Véhicule Chargé</td>
                  <td className="p-2 font-mono font-bold text-neutral-900 text-right">
                    {ticket.grossWeightKg.toLocaleString()} kg
                  </td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="p-2 font-medium text-neutral-600">Pesée 2 : Tare Véhicule à Vide</td>
                  <td className="p-2 font-mono text-neutral-700 text-right">
                    -{ticket.truckTareKg.toLocaleString()} kg
                  </td>
                </tr>
                {ticket.crateCount > 0 && (
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    <td className="p-2 font-medium text-neutral-600">
                      Déduction Tare Caisses ({ticket.crateCount} caisses × {ticket.crateUnitTareKg} kg)
                    </td>
                    <td className="p-2 font-mono text-neutral-700 text-right">
                      -{ticket.totalCrateTareKg.toLocaleString()} kg
                    </td>
                  </tr>
                )}
                <tr className="bg-amber-50/60 font-bold border-b border-neutral-200">
                  <td className="p-2.5 text-amber-900 uppercase">Poids Net Marchand Facturable</td>
                  <td className="p-2.5 font-mono text-amber-950 text-right text-sm font-black">
                    {ticket.netWeightKg.toLocaleString()} kg ({ticket.netWeightQuintaux} Qtx)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Settlement & Timbre Fiscal Art. 317 */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-600">
                Prix Unitaire Convenu ({ticket.unitPriceDzdPerKg} DA/kg) :
              </span>
              <span className="font-mono font-bold text-neutral-900">
                {formatMoney(ticket.subtotalProduceDzd)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-600 flex items-center gap-1.5">
                <span>Droit de Timbre Fiscal (Art. 317 Code du Timbre) :</span>
                {isCash ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-neutral-200 text-neutral-700 font-medium">
                    Espèces (Plafond 2 500 DA)
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 font-medium">
                    Paiement bancaire (Exonéré)
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-neutral-800">
                {ticket.timbreFiscalDzd > 0 ? formatMoney(ticket.timbreFiscalDzd) : '0,00 DA'}
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-300 flex justify-between items-center">
              <span className="font-black text-neutral-900 uppercase text-xs">
                Total Net Reçu / À Régler :
              </span>
              <span className="font-mono font-black text-sm text-[#C4785A]">
                {formatMoney(ticket.totalAmountDzd)}
              </span>
            </div>
          </div>

          {/* Legal Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-300 text-center">
            <div className="space-y-8">
              <p className="font-bold text-[10px] uppercase text-neutral-700">
                Le Magasinier Peseur (Pont-Bascule)
              </p>
              <p className="text-[9px] text-neutral-400">(Visa & Signature)</p>
            </div>
            <div className="space-y-8 border-l border-neutral-200">
              <p className="font-bold text-[10px] uppercase text-neutral-700">
                Le Chauffeur / Acheteur
              </p>
              <p className="text-[9px] text-neutral-400">(Lu et approuvé - Bon pour Accord)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
