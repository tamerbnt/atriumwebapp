import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  FileText,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { CommercialDocument } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { numberToWordsFrench, numberToWordsArabic } from '../../../utils/algerianPtt';
import { useAtriumStore } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';

interface CommercialDocPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CommercialDocument | null;
}

export const CommercialDocPrintModal: React.FC<CommercialDocPrintModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentBusiness, currentBranch } = useAtriumStore();

  if (!isOpen || !doc) return null;

  const handlePrint = () => {
    window.print();
  };

  // Legal amount in words
  const roundedNetToPay = Math.round(doc.netToPay);
  const amountInWordsFr = numberToWordsFrench(roundedNetToPay);
  const amountInWordsAr = numberToWordsArabic(roundedNetToPay);

  const docTitleFr =
    doc.type === 'facture'
      ? 'FACTURE'
      : doc.type === 'bl'
      ? 'BON DE LIVRAISON'
      : doc.type === 'devis'
      ? 'DEVIS / FACTURE PROFORMA'
      : doc.type === 'commande'
      ? 'BON DE COMMANDE'
      : 'FACTURE D\'AVOIR';

  const docTitleAr =
    doc.type === 'facture'
      ? 'فاتورة تجارية'
      : doc.type === 'bl'
      ? 'وصل تسليم بضاعة'
      : doc.type === 'devis'
      ? 'عرض سعر / فاتورة شكلية'
      : doc.type === 'commande'
      ? 'طلبية شراء'
      : 'فاتورة إشعار دائن';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      <div className="relative w-full max-w-4xl my-auto bg-white border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Floating Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-white">
              {doc.docNumber}
            </span>
            <span className="text-xs text-stone-300 font-medium">
              Aperçu officiel & Format A4 conforme
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="primary"
              size="xs"
              onClick={handlePrint}
              icon={<Printer size={14} />}
            >
              Imprimer (Ctrl+P)
            </AtriumButton>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Body */}
        <div
          ref={printRef}
          className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-stone-900 font-sans print:p-0 print:overflow-visible text-xs leading-relaxed"
        >
          {/* Header: Company Identity & Legal Information */}
          <div className="flex justify-between items-start border-b-2 border-stone-800 pb-5 mb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-stone-900">
                  {currentBusiness?.displayName || 'MAGHREB NÉGOCE & DISTRIBUTION SARL'}
                </span>
              </div>
              <p className="text-stone-600 font-medium text-[11px]">
                Importation, Exportation & Distribution de Matériaux de Construction et Équipements
              </p>
              <p className="text-stone-500 text-[10px]">
                {currentBranch?.address || 'Zone Industrielle Oued Smar, Lot 42, Alger'}
              </p>
              <p className="text-stone-500 text-[10px]">
                Tél : {currentBusiness?.phone || '+213 23 93 40 10'} — Email : commercial@maghreb-negoce.dz
              </p>
            </div>

            {/* Algerian Legal Identifiers */}
            <div className="text-right text-[10px] space-y-0.5 text-stone-600 border border-stone-300 rounded-lg p-2.5 bg-stone-50/60 font-mono">
              <div><span className="font-bold text-stone-800">R.C. N° :</span> 16/00-0198421B21 Alger</div>
              <div><span className="font-bold text-stone-800">N.I.F. :</span> 002116019842189</div>
              <div><span className="font-bold text-stone-800">N.I.S. :</span> 0021160100412</div>
              <div><span className="font-bold text-stone-800">Art. d'Imposition :</span> 16041290123</div>
              <div><span className="font-bold text-stone-800">RIB (BNA) :</span> 00100 00123 0000456789 22</div>
            </div>
          </div>

          {/* Document Banner & Client Box */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Document Metadata Banner */}
            <div className="border border-stone-800 rounded-xl p-4 bg-stone-50/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black tracking-wider text-stone-900 uppercase">
                  {docTitleFr}
                </span>
                <span className="text-xs font-bold text-stone-700 font-sans">
                  {docTitleAr}
                </span>
              </div>
              <div className="text-base font-black font-mono text-[#C4785A] mb-3">
                N° {doc.docNumber}
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                <span className="text-stone-500">Date d'émission :</span>
                <span className="font-mono font-bold text-stone-900">{doc.date}</span>

                {doc.dueDate && (
                  <>
                    <span className="text-stone-500">Date d'échéance :</span>
                    <span className="font-mono font-bold text-stone-900">{doc.dueDate}</span>
                  </>
                )}

                <span className="text-stone-500">Mode de paiement :</span>
                <span className="font-semibold text-stone-900">{doc.paymentMethod}</span>

                <span className="text-stone-500">Conditions :</span>
                <span className="font-semibold text-stone-900">{doc.paymentTerms}</span>

                {doc.linkedDocNumber && (
                  <>
                    <span className="text-stone-500">Réf. Pièce Liée :</span>
                    <span className="font-mono text-stone-700 font-medium">{doc.linkedDocNumber}</span>
                  </>
                )}
              </div>
            </div>

            {/* Client Legal Information Box */}
            <div className="border border-stone-300 rounded-xl p-4 bg-white space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Client / Destinataire
              </span>
              <div className="text-sm font-black text-stone-900">
                {doc.clientName}
              </div>

              <div className="space-y-0.5 text-[10.5px] font-mono text-stone-700 pt-1">
                {doc.clientRc && (
                  <div>
                    <span className="text-stone-400 font-sans">R.C. N° : </span>
                    <span className="font-semibold">{doc.clientRc}</span>
                  </div>
                )}
                {doc.clientNif && (
                  <div>
                    <span className="text-stone-400 font-sans">N.I.F. : </span>
                    <span className="font-semibold">{doc.clientNif}</span>
                  </div>
                )}
                {doc.clientAi && (
                  <div>
                    <span className="text-stone-400 font-sans">Art. Imp. : </span>
                    <span className="font-semibold">{doc.clientAi}</span>
                  </div>
                )}
                <div className="text-[10px] text-stone-500 font-sans pt-1">
                  Dépôt d'enlèvement : <span className="font-medium text-stone-800">{doc.depotName || 'Dépôt Central Oued Smar'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Notes (if any) */}
          {doc.notesTop && (
            <div className="mb-4 p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-700 italic">
              <strong>Objet / Chantier :</strong> {doc.notesTop}
            </div>
          )}

          {/* Line Items Dense Table */}
          <div className="border border-stone-800 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900 text-white font-semibold text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-[36px] text-center">N°</th>
                  <th className="py-2.5 px-3">Désignation des Marchandises ou Prestations</th>
                  <th className="py-2.5 px-3 w-[60px] text-center">Unité</th>
                  <th className="py-2.5 px-3 w-[70px] text-right">Qté</th>
                  <th className="py-2.5 px-3 w-[110px] text-right">P.U. HT</th>
                  <th className="py-2.5 px-3 w-[65px] text-right">TVA</th>
                  <th className="py-2.5 px-3 w-[120px] text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {doc.items.map((item, idx) => (
                  <tr key={item.id || idx} className="text-[11px]">
                    <td className="py-2 px-3 text-center text-stone-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-stone-900">{item.description}</div>
                      {item.discountPercent ? (
                        <div className="text-[10px] text-stone-500">
                          Remise ligne : {item.discountPercent}%
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-stone-600">
                      {item.unit || 'u'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-stone-700">
                      {formatMoney(item.unitPriceHt)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-stone-600">
                      {item.tvaPercent}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 tabular-nums">
                      {formatMoney(item.totalHt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Financial Recap Box */}
          <div className="flex justify-end mb-6">
            <div className="w-80 border border-stone-800 rounded-xl overflow-hidden font-mono text-xs">
              <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 bg-stone-50">
                <span className="text-stone-600">Total Brut HT :</span>
                <span className="font-bold text-stone-900">{formatMoney(doc.totalHtRaw)}</span>
              </div>

              {doc.generalDiscountPercent > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 text-rose-600">
                  <span>Remise Générale ({doc.generalDiscountPercent}%) :</span>
                  <span>-{formatMoney(doc.totalHtRaw - doc.totalHtFinal)}</span>
                </div>
              )}

              <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 bg-stone-50/50">
                <span className="text-stone-600">Total Net HT :</span>
                <span className="font-bold text-stone-900">{formatMoney(doc.totalHtFinal)}</span>
              </div>

              <div className="flex justify-between px-3 py-1.5 border-b border-stone-200">
                <span className="text-stone-600">Total TVA :</span>
                <span className="font-bold text-stone-900">{formatMoney(doc.totalTva)}</span>
              </div>

              {doc.timbreFiscal > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 text-amber-700 bg-amber-50/50">
                  <span>Droit de Timbre (1%) :</span>
                  <span className="font-bold">+{formatMoney(doc.timbreFiscal)}</span>
                </div>
              )}

              <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 bg-stone-100 font-bold">
                <span>Total TTC :</span>
                <span>{formatMoney(doc.totalTtc)}</span>
              </div>

              {doc.guaranteeRetentionAmount > 0 && (
                <div className="flex justify-between px-3 py-1.5 border-b border-stone-200 text-blue-700 bg-blue-50/50">
                  <span>Retenue Garantie ({doc.guaranteeRetentionPercent}%) :</span>
                  <span className="font-bold">-{formatMoney(doc.guaranteeRetentionAmount)}</span>
                </div>
              )}

              <div className="flex justify-between px-3 py-2.5 bg-stone-900 text-white font-bold text-sm">
                <span className="uppercase tracking-wider">Net à Payer :</span>
                <span className="tabular-nums text-amber-400">{formatMoney(doc.netToPay)}</span>
              </div>
            </div>
          </div>

          {/* Legal Algerian Number-to-Words Statement */}
          <div className="p-3.5 border-2 border-stone-800 rounded-xl bg-stone-50/80 mb-6 space-y-2">
            <div className="text-[11px] text-stone-800 leading-normal">
              <strong>Arrêtée la présente pièce à la somme de :</strong>{' '}
              <span className="capitalize font-bold text-stone-950 underline decoration-stone-400 decoration-1 underline-offset-2">
                {amountInWordsFr} Dinars Algériens
              </span>
            </div>

            <div className="text-[12px] font-sans text-stone-800 leading-normal text-right" dir="rtl">
              <strong>أوقفت هذه المعاملة عند مبلغ :</strong>{' '}
              <span className="font-bold text-stone-950 underline decoration-stone-400 decoration-1 underline-offset-2">
                {amountInWordsAr} دينار جزائري
              </span>
            </div>
          </div>

          {/* Footer & Signatures Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-stone-300 text-xs">
            <div className="border border-stone-300 rounded-xl p-4 h-32 flex flex-col justify-between">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px]">
                Visa & Cachet du Client / Réceptionnaire
              </span>
              <p className="text-[10px] text-stone-400 italic">
                Signature précédée de la mention manuscrite « Lu et approuvé »
              </p>
            </div>

            <div className="border border-stone-300 rounded-xl p-4 h-32 flex flex-col justify-between">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px]">
                Pour la Société — Direction Commerciale & Facturation
              </span>
              {doc.includeStampSignature && (
                <div className="w-24 h-12 border-2 border-dashed border-[#C4785A]/60 rounded-lg flex items-center justify-center text-[10px] text-[#C4785A] font-bold uppercase rotate-[-3deg] ml-auto">
                  Cachet & Signé
                </div>
              )}
            </div>
          </div>

          {/* Bottom Legal Mention */}
          {doc.notesBottom ? (
            <p className="text-[10px] text-stone-500 text-center mt-6 italic">
              {doc.notesBottom}
            </p>
          ) : (
            <p className="text-[9.5px] text-stone-400 text-center mt-6 italic">
              En cas de contestation, seul le Tribunal de Commerce compétent du ressort du siège de notre société est habilité.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
