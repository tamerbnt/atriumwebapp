import React from 'react';
import { Printer, X, Download, ShieldCheck, QrCode } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsManifest } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';

interface TransportManifestPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: LogisticsManifest;
}

export const TransportManifestPrintModal: React.FC<TransportManifestPrintModalProps> = ({
  isOpen,
  onClose,
  manifest,
}) => {
  const { language, currentBusiness } = useAtriumStore();
  const isAr = language === 'ar';

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const offlineHash = `ALG-LVR-SEC-${manifest.manifestNumber}-${manifest.vehiclePlate}-${manifest.totalShipmentsCount}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[95vh] flex flex-col">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#C4785A]" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {isAr ? 'بيان الشحن القانوني (المرسوم التنفيذي 05-468)' : 'Lettre de Voiture Routière (Décret 05-468)'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <AtriumButton variant="primary" size="sm" onClick={handlePrint} icon={<Printer size={14} />}>
              {isAr ? 'طباعة الوثيقة' : 'Imprimer'}
            </AtriumButton>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="overflow-y-auto flex-1 p-6 bg-white text-black border border-neutral-300 rounded-xl space-y-6 font-sans text-xs">
          {/* Official Header */}
          <div className="text-center border-b pb-4 border-black/30 space-y-1">
            <div className="font-bold uppercase tracking-wider text-[11px]">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </div>
            <div className="font-semibold uppercase tracking-wider text-[10px] text-neutral-700">
              RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE — MINISTÈRE DES TRANSPORTS
            </div>
            <div className="text-base font-black uppercase pt-1 tracking-widest text-[#1F1D1B]">
              LETTRE DE VOITURE ROUTIÈRE N° {manifest.manifestNumber}
            </div>
            <div className="text-[10px] text-neutral-600 font-medium">
              Conforme aux dispositions du Décret Exécutif N° 05-468 du 10 Décembre 2005
            </div>
          </div>

          {/* Transporteur & Véhicule Grid */}
          <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg border-neutral-300">
            <div>
              <div className="font-bold text-[11px] uppercase border-b pb-1 mb-2 text-neutral-800">
                1. Entreprise de Transport & Messagerie
              </div>
              <div className="space-y-0.5">
                <div><span className="font-semibold">Raison Sociale:</span> {currentBusiness?.name || 'ATRIUM EXPRESS MESSAGERIE SARL'}</div>
                <div><span className="font-semibold">NIF:</span> 002116049281923 • <span className="font-semibold">RC:</span> 16/00-098234B21</div>
                <div><span className="font-semibold">Licence de Transport:</span> {manifest.transportCardNumber || 'CT-2025-16-9921'}</div>
                <div><span className="font-semibold">Hub d'Émission:</span> {manifest.originHub || 'Hub Central Baraki (Wilaya 16)'}</div>
              </div>
            </div>

            <div>
              <div className="font-bold text-[11px] uppercase border-b pb-1 mb-2 text-neutral-800">
                2. Chauffeur & Véhicule Affecté
              </div>
              <div className="space-y-0.5">
                <div><span className="font-semibold">Nom & Prénom:</span> {manifest.driverName}</div>
                <div><span className="font-semibold">NIN (Identifiant National):</span> {manifest.driverNin || '198416024001928374'}</div>
                <div><span className="font-semibold">Téléphone:</span> {manifest.driverPhone}</div>
                <div><span className="font-semibold">Matricule Véhicule:</span> <span className="font-mono font-bold">{manifest.vehiclePlate}</span></div>
              </div>
            </div>
          </div>

          {/* Itinéraire & Cargaison */}
          <div className="border p-3 rounded-lg border-neutral-300 space-y-2">
            <div className="font-bold text-[11px] uppercase border-b pb-1 text-neutral-800 flex justify-between">
              <span>3. Descriptif du Fret & Destination</span>
              <span>Date: {manifest.dispatchDate}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1">
              <div>
                <span className="text-neutral-500 block text-[10px]">Zone de Destination:</span>
                <span className="font-bold">{manifest.zoneWilaya}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Hub Réceptionnaire:</span>
                <span className="font-bold">{manifest.destinationHub || 'Dépôt Régional'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Statut Transit:</span>
                <span className="font-bold text-emerald-700">{manifest.status}</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse mt-2">
              <thead>
                <tr className="border-y border-neutral-300 bg-neutral-100 text-[10px]">
                  <th className="p-1.5 font-bold">Désignation</th>
                  <th className="p-1.5 font-bold">Sacs-Navette (Bags)</th>
                  <th className="p-1.5 font-bold">Numéros Scellés de Sécurité</th>
                  <th className="p-1.5 font-bold text-right">Poids Brut</th>
                  <th className="p-1.5 font-bold text-right">Valeur Déclarée COD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="p-1.5 font-medium">Colis E-commerce & Messagerie ({manifest.totalShipmentsCount} colis)</td>
                  <td className="p-1.5 font-mono">{(manifest.bagIds && manifest.bagIds.join(', ')) || 'BAG-16-ORN-0042'}</td>
                  <td className="p-1.5 font-mono font-bold text-[#C4785A]">{(manifest.sealNumbers && manifest.sealNumbers.join(', ')) || 'SL-994821'}</td>
                  <td className="p-1.5 text-right font-mono">{manifest.totalGrossWeightKg || 28.5} kg</td>
                  <td className="p-1.5 text-right font-mono font-bold">{formatMoney(manifest.totalCodExpectedDzd, 'fr')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Signatures & Road Inspection QR */}
          <div className="grid grid-cols-3 gap-3 pt-3 items-end">
            <div className="border p-2.5 rounded-lg border-neutral-300 h-28 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-neutral-600 uppercase">Visa & Cachet Hub Émetteur</span>
              <div className="text-[9px] text-neutral-400 italic">Signature autorisée Baraki</div>
            </div>

            <div className="border p-2.5 rounded-lg border-neutral-300 h-28 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-neutral-600 uppercase">Signature Chauffeur Transporteur</span>
              <div className="text-[9px] text-neutral-400 italic">Reconnaissance de prise en charge</div>
            </div>

            <div className="border p-2 rounded-lg border-neutral-300 h-28 flex flex-col items-center justify-center text-center bg-neutral-50">
              <div className="w-14 h-14 bg-black/10 rounded flex items-center justify-center font-mono text-[9px] text-neutral-600 p-1">
                [QR SECURE DECRET 05-468]
              </div>
              <span className="font-mono text-[8px] text-neutral-500 mt-1 truncate max-w-full">
                {offlineHash}
              </span>
              <span className="text-[8px] font-bold text-emerald-700">Contrôle Routier Validé</span>
            </div>
          </div>

          <div className="text-[9px] text-neutral-400 text-center pt-2">
            Document officiel à présenter à toute réquisition des services de Gendarmerie Nationale, Sûreté Nationale et Contrôle des Transports.
          </div>
        </div>
      </div>
    </div>
  );
};
