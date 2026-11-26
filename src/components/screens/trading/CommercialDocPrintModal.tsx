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
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
} from '../../../services/store';
import { buildUnifiedFiscalHeader } from '../../../utils/invoicingEngine';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface CommercialDocPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CommercialDocument | null;
}

export const CommercialDocPrintModal: React.FC<CommercialDocPrintModalProps> = ({ isOpen, onClose, document: rawDoc }) => {
	const printRef = React.useRef<any>(null);
	const { currentBusiness, currentBranch, currentBusinessConfig } = useAtriumSelector(
	  (s) => ({
	    currentBusiness: selectCurrentBusinessFromState(s),
	    currentBranch: selectCurrentBranchFromState(s),
	    currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
	  }),
	  shallowEqualObjects
	);
	const fiscalHeader = React.useMemo(
	  () => buildUnifiedFiscalHeader(currentBusiness, currentBranch, currentBusinessConfig),
	  [currentBusiness, currentBranch, currentBusinessConfig]
	);
	const doc = useRetainedModalValue(isOpen ? rawDoc : null);
	const handlePrint = () => {
		window.print();
	};
	const roundedNetToPay = doc ? Math.round(doc.netToPay) : 0;
	const amountInWordsFr = doc ? numberToWordsFrench(roundedNetToPay) : "";
	const amountInWordsAr = doc ? numberToWordsArabic(roundedNetToPay) : "";
	const docTitleFr = !doc ? "" : doc.type === "facture" ? "FACTURE" : doc.type === "bl" ? "BON DE LIVRAISON" : doc.type === "devis" ? "DEVIS / FACTURE PROFORMA" : doc.type === "commande" ? "BON DE COMMANDE" : "FACTURE D'AVOIR";
	const docTitleAr = !doc ? "" : doc.type === "facture" ? "فاتورة تجارية" : doc.type === "bl" ? "وصل تسليم بضاعة" : doc.type === "devis" ? "عرض سعر / فاتورة شكلية" : doc.type === "commande" ? "طلبية شراء" : "فاتورة إشعار دائن";
	return (
		<KineticModalShell
			isOpen={isOpen && Boolean(rawDoc)}
			onClose={onClose}
			maxWidthClass="max-w-4xl print:max-w-none"
			scrimClassName="bg-black/70 print:p-0 print:bg-white print:static print:z-auto"
			ariaLabel={docTitleFr || "Document Commercial"}
		>
			{doc && (
				<div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:border-none print:rounded-none print:shadow-none">
<div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.10] bg-stone-900 text-white shrink-0 print:hidden">
<div className="flex items-center gap-2">
<span className="tabular-nums t-cap px-2 py-1 rounded-[var(--r-check,6px)] bg-white/10 text-white">{doc.docNumber}</span>
<span className="t-small text-white/75 font-medium">Aperçu officiel & Format A4 conforme</span>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" size="xs" onClick={handlePrint} icon={<Printer size={14} />}>Imprimer (Ctrl+P)</AtriumButton>
<button onClick={onClose} data-sq="ctl-sm" data-sq-border="none" className="p-2 text-white/75 hover:text-white transition-colors"><X size={18} /></button>
</div>
</div>
<div ref={printRef} className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-black font-sans print:p-0 print:overflow-visible t-cap leading-relaxed">
<div className="flex justify-between items-start border-b-2 border-black/80 pb-5 mb-5 gap-4">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="t-dialog font-semibold text-black">{fiscalHeader.companyName}</span>
</div>
{currentBranch?.name && (
<p className="text-black/75 font-medium t-small">
{currentBranch.name}
</p>
)}
{fiscalHeader.address && <p className="text-black/55 t-cap">{fiscalHeader.address}</p>}
{(fiscalHeader.phone || fiscalHeader.email) && (
<p className="text-black/55 t-cap">
{fiscalHeader.phone ? `Tél : ${fiscalHeader.phone}` : ''}
{fiscalHeader.phone && fiscalHeader.email ? ' — ' : ''}
{fiscalHeader.email ? `Email : ${fiscalHeader.email}` : ''}
</p>
)}
</div>
{(fiscalHeader.rc || fiscalHeader.nif || fiscalHeader.nis || fiscalHeader.ai || fiscalHeader.ribCcp) && (
<div data-sq="ctl" data-sq-border="solid" className="text-right t-cap space-y-0.5 text-black/75 [--sq-stroke:rgba(23,19,15,0.14)] p-3 bg-stone-50/60 tabular-nums">
{fiscalHeader.rc && <div><span className="font-semibold text-black">R.C. N° :</span> {fiscalHeader.rc}</div>}
{fiscalHeader.nif && <div><span className="font-semibold text-black">N.I.F. :</span> {fiscalHeader.nif}</div>}
{fiscalHeader.nis && <div><span className="font-semibold text-black">N.I.S. :</span> {fiscalHeader.nis}</div>}
{fiscalHeader.ai && <div><span className="font-semibold text-black">Art. d'Imposition :</span> {fiscalHeader.ai}</div>}
{fiscalHeader.ribCcp && <div><span className="font-semibold text-black">RIB / CCP :</span> {fiscalHeader.ribCcp}</div>}
</div>
)}
</div>
<div className="grid grid-cols-2 gap-6 mb-6">
<div data-sq="card" data-sq-border="solid" className="[--sq-stroke:rgba(23,19,15,0.75)] p-4 bg-stone-50/40">
<div className="flex items-center justify-between mb-2">
<span className="t-label font-semibold text-black">{docTitleFr}</span>
<span className="t-small font-semibold text-black/75 font-sans">{docTitleAr}</span>
</div>
<div className="t-card font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mb-3">
{"N° "}
{doc.docNumber}
</div>
<div className="grid grid-cols-2 gap-y-1.5 t-cap">
<span className="text-black/55">Date d'émission :</span>
<span className="tabular-nums font-semibold text-black">{doc.date}</span>
{doc.dueDate && /* @__PURE__ */ <>
<span className="text-black/55">Date d'échéance :</span>
<span className="tabular-nums font-semibold text-black">{doc.dueDate}</span>
</>}
<span className="text-black/55">Mode de paiement :</span>
<span className="font-semibold text-black">{doc.paymentMethod}</span>
<span className="text-black/55">Conditions :</span>
<span className="font-semibold text-black">{doc.paymentTerms}</span>
{doc.linkedDocNumber && /* @__PURE__ */ <>
<span className="text-black/55">Réf. Pièce Liée :</span>
<span className="tabular-nums text-black/75 font-medium">{doc.linkedDocNumber}</span>
</>}
</div>
</div>
<div data-sq="card" data-sq-border="solid" className="[--sq-stroke:rgba(23,19,15,0.14)] p-4 bg-white space-y-2">
<span className="t-small font-semibold text-black/55 block mb-1">Client / Destinataire</span>
<div className="t-label font-semibold text-black">{doc.clientName}</div>
<div className="space-y-0.5 t-cap tabular-nums text-black/75 pt-1">
{doc.clientRc && /* @__PURE__ */ <div>
<span className="text-black/55 font-sans">{"R.C. N° : "}</span>
<span className="font-semibold">{doc.clientRc}</span>
</div>}
{doc.clientNif && /* @__PURE__ */ <div>
<span className="text-black/55 font-sans">{"N.I.F. : "}</span>
<span className="font-semibold">{doc.clientNif}</span>
</div>}
{doc.clientAi && /* @__PURE__ */ <div>
<span className="text-black/55 font-sans">{"Art. Imp. : "}</span>
<span className="font-semibold">{doc.clientAi}</span>
</div>}
<div className="t-cap text-black/55 font-sans pt-1">
{"Dépôt d'enlèvement : "}
<span className="font-medium text-black">{doc.depotName || "Dépôt Central Oued Smar"}</span>
</div>
</div>
</div>
</div>
{doc.notesTop && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="solid" className="mb-4 p-3 bg-stone-50 [--sq-stroke:rgba(23,19,15,0.10)] t-cap text-black/75 italic">
<strong>Objet / Chantier :</strong>
{" "}
{doc.notesTop}
</div>}
<div data-sq="table" data-sq-border="solid" className="[--sq-stroke:rgba(23,19,15,0.75)] overflow-hidden mb-6">
<table className="w-full text-left t-cap">
<thead className="bg-stone-900 text-white font-semibold t-small">
<tr>
<th className="py-2 px-3 w-[36px] text-center">N°</th>
<th className="py-2 px-3">Désignation des Marchandises ou Prestations</th>
<th className="py-2 px-3 w-[60px] text-center">Unité</th>
<th className="py-2 px-3 w-[70px] text-right">Qté</th>
<th className="py-2 px-3 w-[110px] text-right">P.U. HT</th>
<th className="py-2 px-3 w-[65px] text-right">TVA</th>
<th className="py-2 px-3 w-[120px] text-right">Montant HT</th>
</tr>
</thead>
<tbody className="divide-y divide-black/[0.08]">
{doc.items.map((item: any, idx: number) => /* @__PURE__ */ <tr key={item.id || idx} className="t-cap">
<td className="py-2 px-3 text-center text-black/55 tabular-nums">{idx + 1}</td>
<td className="py-2 px-3">
<div className="font-semibold text-black">{item.description}</div>
{item.discountPercent ? /* @__PURE__ */ <div className="t-cap text-black/55">
{"Remise ligne : "}
{item.discountPercent}
%
</div> : null}
</td>
<td className="py-2 px-3 text-center tabular-nums text-black/75">{item.unit || "u"}</td>
<td className="py-2 px-3 text-right tabular-nums font-semibold text-black">{item.quantity}</td>
<td className="py-2 px-3 text-right tabular-nums text-black/75">{formatMoney(item.unitPriceHt)}</td>
<td className="py-2 px-3 text-right tabular-nums text-black/75">
{item.tvaPercent}
%
</td>
<td className="py-2 px-3 text-right tabular-nums font-semibold text-black">{formatMoney(item.totalHt)}</td>
</tr>)}
</tbody>
</table>
</div>
<div className="flex justify-end mb-6">
<div data-sq="card" data-sq-border="solid" className="w-80 [--sq-stroke:rgba(23,19,15,0.75)] overflow-hidden tabular-nums t-cap">
<div className="flex justify-between px-3 py-2 border-b border-black/[0.08] bg-stone-50">
<span className="text-black/75">Total Brut HT :</span>
<span className="font-semibold text-black">{formatMoney(doc.totalHtRaw)}</span>
</div>
{doc.generalDiscountPercent > 0 && /* @__PURE__ */ <div className="flex justify-between px-3 py-2 border-b border-black/[0.08] text-rose-600">
<span>
Remise Générale (
{doc.generalDiscountPercent}
%) :
</span>
<span>
-
{formatMoney(doc.totalHtRaw - doc.totalHtFinal)}
</span>
</div>}
<div className="flex justify-between px-3 py-2 border-b border-black/[0.08] bg-stone-50/50">
<span className="text-black/75">Total Net HT :</span>
<span className="font-semibold text-black">{formatMoney(doc.totalHtFinal)}</span>
</div>
<div className="flex justify-between px-3 py-2 border-b border-black/[0.08]">
<span className="text-black/75">Total TVA :</span>
<span className="font-semibold text-black">{formatMoney(doc.totalTva)}</span>
</div>
{doc.timbreFiscal > 0 && /* @__PURE__ */ <div className="flex justify-between px-3 py-2 border-b border-black/[0.08] text-amber-700 bg-amber-50/50">
<span>Droit de Timbre (1%) :</span>
<span className="font-semibold">
+
{formatMoney(doc.timbreFiscal)}
</span>
</div>}
<div className="flex justify-between px-3 py-2 border-b border-black/[0.08] bg-stone-100 font-semibold">
<span>Total TTC :</span>
<span>{formatMoney(doc.totalTtc)}</span>
</div>
{doc.guaranteeRetentionAmount > 0 && /* @__PURE__ */ <div className="flex justify-between px-3 py-2 border-b border-black/[0.08] text-blue-700 bg-blue-50/50">
<span>
Retenue Garantie (
{doc.guaranteeRetentionPercent}
%) :
</span>
<span className="font-semibold">
-
{formatMoney(doc.guaranteeRetentionAmount)}
</span>
</div>}
<div className="flex justify-between px-3 py-2 bg-stone-900 text-white font-semibold t-label">
<span className="">Net à Payer :</span>
<span className="tabular-nums text-amber-400">{formatMoney(doc.netToPay)}</span>
</div>
</div>
</div>
<div data-sq="card" data-sq-border="solid" data-sq-stroke-w="2" className="p-4 [--sq-stroke:rgba(23,19,15,0.75)] bg-stone-50/80 mb-6 space-y-2">
<div className="t-cap text-black leading-normal">
<strong>Arrêtée la présente pièce à la somme de :</strong>
{" "}
<span className="capitalize font-semibold text-black underline decoration-stone-400 decoration-1 underline-offset-2">
{amountInWordsFr}
{" Dinars Algériens"}
</span>
</div>
<div className="t-cap font-sans text-black leading-normal text-right" dir="rtl">
<strong>أوقفت هذه المعاملة عند مبلغ :</strong>
{" "}
<span className="font-semibold text-black underline decoration-stone-400 decoration-1 underline-offset-2">
{amountInWordsAr}
{" دينار جزائري"}
</span>
</div>
</div>
<div className="grid grid-cols-2 gap-6 pt-4 border-t border-black/[0.16] t-cap">
<div data-sq="card" data-sq-border="solid" className="[--sq-stroke:rgba(23,19,15,0.14)] p-4 h-32 flex flex-col justify-between">
<span className="font-semibold text-black t-small">Visa & Cachet du Client / Réceptionnaire</span>
<p className="t-cap text-black/55 italic">Signature précédée de la mention manuscrite « Lu et approuvé »</p>
</div>
<div data-sq="card" data-sq-border="solid" className="[--sq-stroke:rgba(23,19,15,0.14)] p-4 h-32 flex flex-col justify-between">
<span className="font-semibold text-black t-small">Pour la Société — Direction Commerciale & Facturation</span>
{doc.includeStampSignature && /* @__PURE__ */ <div data-sq="ctl-sm" data-sq-border="dashed" data-sq-stroke-w="2" className="w-24 h-12 [--sq-stroke:rgba(212,82,47,0.6)] flex items-center justify-center t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold rotate-[-3deg] ml-auto">Cachet & Signé</div>}
</div>
</div>
{doc.notesBottom ? /* @__PURE__ */ <p className="t-cap text-black/55 text-center mt-6 italic">{doc.notesBottom}</p> : /* @__PURE__ */ <p className="t-cap text-black/55 text-center mt-6 italic">
En cas de contestation, seul le Tribunal de Commerce compétent du ressort du siège de notre société est habilité.
</p>}
</div>
				</div>
			)}
		</KineticModalShell>
	);
};
