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
      <div className="sq-elev-pop max-w-2xl w-full">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-neutral-900 [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto"
        >
          {/* Modal Controls */}
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0"
              >
                <Scale size={22} />
              </div>
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {isAr ? 'تذكرة ميزان الجسر ووصل التسليم' : 'Ticket Pont-Bascule & Bon de Livraison'}
              </h2>
              <p className="t-cap text-black/70 dark:text-white/70">
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
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Ticket Voucher (A5 Format) */}
        <div className="printable-document bg-white text-black p-6 rounded-[var(--r-card,16px)] border border-black/[0.14] shadow-xs space-y-5 font-sans t-cap print:m-0 print:p-0 print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-black/[0.14] pb-4">
            <div className="space-y-1">
              <h2 className="t-label font-semibold text-black rtl:normal-case rtl:tracking-normal">
                {currentBusiness?.name || 'DOMAINE AGRICOLE & ÉLEVAGE EL BARAKA'}
              </h2>
              <p className="t-cap text-black/75">
                Exploitation Maraîchère, Arboricole & Céréalière · Mitidja
              </p>
              <p className="t-cap text-black/75 tabular-nums">
                Carte Fellah: CAW-16-09418 · RC/NIF: 001916024810931
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <span className="t-small font-semibold text-black/75 block rtl:normal-case">
                N° Ticket Pesée
              </span>
              <span className="t-label tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {ticket.ticketNumber}
              </span>
              <span className="t-cap text-black/75 block">
                Date: {ticket.date}
              </span>
            </div>
          </div>

          {/* Client / Destination Grid */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-[var(--r-ctl,12px)] bg-neutral-50 border border-black/[0.09]">
            <div>
              <span className="t-small font-semibold text-black/75 block rtl:normal-case">
                Acheteur / Mandataire de Gros
              </span>
              <p className="font-semibold text-black t-small mt-0.5">
                {ticket.buyerName}
              </p>
              <p className="t-cap text-black/75">
                Destination : {ticket.destinationWholesaleMarket}
              </p>
            </div>
            <div className="border-l border-black/[0.09] pl-3">
              <span className="t-small font-semibold text-black/75 block rtl:normal-case">
                Véhicule & Chauffeur
              </span>
              <p className="font-semibold text-black tabular-nums t-small mt-0.5">
                Matricule : {ticket.truckPlate}
              </p>
              <p className="t-cap text-black/75">
                Chauffeur : {ticket.driverName || 'Non spécifié'}
              </p>
            </div>
          </div>

          {/* Weighbridge Double Pesée Breakdown */}
          <div className="space-y-2">
            <span className="t-small font-semibold text-black block rtl:normal-case rtl:tracking-normal">
              Détail de la Double Pesée Pont-Bascule
            </span>
            <table className="w-full text-left border-collapse border border-black/[0.14] t-cap">
              <tbody>
                <tr className="border-b border-black/[0.10]">
                  <td className="p-2 font-medium text-black/75">Désignation du Produit Récolté</td>
                  <td className="p-2 font-semibold text-black text-right">{ticket.cropDesignation}</td>
                </tr>
                <tr className="border-b border-black/[0.10] bg-neutral-50/50">
                  <td className="p-2 font-medium text-black/75">Pesée 1 : Poids Brut Véhicule Chargé</td>
                  <td className="p-2 tabular-nums font-semibold text-black text-right">
                    {ticket.grossWeightKg.toLocaleString()} kg
                  </td>
                </tr>
                <tr className="border-b border-black/[0.10]">
                  <td className="p-2 font-medium text-black/75">Pesée 2 : Tare Véhicule à Vide</td>
                  <td className="p-2 tabular-nums text-black text-right">
                    -{ticket.truckTareKg.toLocaleString()} kg
                  </td>
                </tr>
                {ticket.crateCount > 0 && (
                  <tr className="border-b border-black/[0.10] bg-neutral-50/50">
                    <td className="p-2 font-medium text-black/75">
                      Déduction Tare Caisses ({ticket.crateCount} caisses × {ticket.crateUnitTareKg} kg)
                    </td>
                    <td className="p-2 tabular-nums text-black text-right">
                      -{ticket.totalCrateTareKg.toLocaleString()} kg
                    </td>
                  </tr>
                )}
                <tr className="bg-amber-50/60 font-semibold border-b border-black/[0.10]">
                  <td className="p-3 text-amber-900 rtl:normal-case">Poids Net Marchand Facturable</td>
                  <td className="p-3 tabular-nums text-amber-950 text-right t-label font-semibold">
                    {ticket.netWeightKg.toLocaleString()} kg ({ticket.netWeightQuintaux} Qtx)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Settlement & Timbre Fiscal Art. 317 */}
          <div className="p-4 rounded-[var(--r-ctl,12px)] bg-neutral-50 border border-black/[0.09] space-y-2">
            <div className="flex justify-between items-center t-cap">
              <span className="text-black/75">
                Prix Unitaire Convenu ({ticket.unitPriceDzdPerKg} DA/kg) :
              </span>
              <span className="tabular-nums font-semibold text-black">
                {formatMoney(ticket.subtotalProduceDzd)}
              </span>
            </div>

            <div className="flex justify-between items-center t-cap">
              <span className="text-black/75 flex items-center gap-2">
                <span>Droit de Timbre Fiscal (Art. 317 Code du Timbre) :</span>
                {isCash ? (
                  <span className="t-small px-2 py-1 rounded-full bg-neutral-200 text-black font-medium">
                    Espèces (Plafond 2 500 DA)
                  </span>
                ) : (
                  <span className="t-small px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    Paiement bancaire (Exonéré)
                  </span>
                )}
              </span>
              <span className="tabular-nums font-semibold text-black">
                {ticket.timbreFiscalDzd > 0 ? formatMoney(ticket.timbreFiscalDzd) : '0,00 DA'}
              </span>
            </div>

            <div className="pt-2 border-t border-black/[0.14] flex justify-between items-center">
              <span className="font-semibold text-black t-small rtl:normal-case">
                Total Net Reçu / À Régler :
              </span>
              <span className="tabular-nums font-semibold t-label text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {formatMoney(ticket.totalAmountDzd)}
              </span>
            </div>
          </div>

          {/* Legal Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/[0.14] text-center">
            <div className="space-y-8">
              <p className="font-semibold t-small text-black rtl:normal-case">
                Le Magasinier Peseur (Pont-Bascule)
              </p>
              <p className="t-cap text-black/55">(Visa & Signature)</p>
            </div>
            <div className="space-y-8 border-l border-black/[0.09]">
              <p className="font-semibold t-small text-black rtl:normal-case">
                Le Chauffeur / Acheteur
              </p>
              <p className="t-cap text-black/55">(Lu et approuvé - Bon pour Accord)</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
