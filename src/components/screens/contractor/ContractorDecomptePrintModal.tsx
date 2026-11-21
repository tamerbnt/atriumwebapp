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



export const ContractorDecomptePrintModal: React.FC<ContractorDecomptePrintModalProps> = ({ isOpen, onClose, dgp, project }) => {
	const { language } = useAtriumStore();
	const isAr = language === "ar";
	if (!isOpen || !dgp) return null;
	const handlePrint = () => {
		window.print();
	};
	const netPayableWords = numberToAlgerianWords(dgp.netPayableDzd);
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
<div className="sq-elev-pop max-w-3xl w-full my-8">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-6">
<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 print:hidden">
<div className="flex items-center gap-2">
<div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0"><FileText size={18} /></div>
<div>
<h3 className="font-semibold t-label text-black dark:text-white">
{isAr ? "الكشف المالي المؤقت الرسمي (Décret 15-247)" : "Bordereau Officiel de Décompte Provisoire"}
</h3>
<p className="t-cap text-black/55 dark:text-white/75">
{dgp.dgpNumber}
{" · "}
{project?.projectName || "Marché BTP"}
</p>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>{isAr ? "طباعة الكشف" : "Imprimer le Décompte"}</AtriumButton>
<button type="button" onClick={onClose} aria-label={isAr ? "إغلاق" : "Fermer"} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X size={18} /></button>
</div>
</div>
<div className="printable-document p-6 border border-black/[0.14] rounded-[var(--r-card,16px)] bg-white text-black t-cap space-y-6 shadow-xs">
<div className="text-center space-y-1 border-b border-black/[0.14] pb-4">
<p className="font-semibold t-label font-sans">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
<p className="text-black/75 t-cap font-sans">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<div className="pt-2 t-small font-sans font-semibold text-black/75">
{project?.clientName?.includes("DLEP") || project?.clientName?.includes("OPGI") ? project.clientName : "MINISTÈRE DE L'HABITAT, DE L'URBANISME ET DE LA VILLE"}
</div>
<p className="t-cap text-black/55 font-sans">DIRECTION DU LOGEMENT ET DES ÉQUIPEMENTS PUBLICS (DLEP)</p>
</div>
<div className="flex items-center justify-between bg-neutral-50 p-3 rounded-[var(--r-ctl,12px)] border border-black/[0.09] font-sans">
<div>
<span className="t-small font-semibold text-black/55">Document Légal</span>
<h2 className="t-card font-semibold text-black">
{"SITUATION DE TRAVAUX N° "}
{dgp.dgpNumber}
</h2>
<p className="t-small text-black/75 font-medium">
{"Période: "}
{dgp.periodLabel}
{" · Établie le "}
{dgp.issuedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
</p>
</div>
<div className="text-right">
<span className="inline-flex items-center gap-1 bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] px-2.5 py-1 rounded-full t-small font-semibold">
<ShieldCheck size={13} />
Décret Présidentiel 15-247
</span>
<p className="t-cap text-black/55 mt-1">CCAG Travaux (Art. 93-100)</p>
</div>
</div>
<div className="grid grid-cols-2 gap-4 font-sans t-cap">
<div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-black/[0.09] space-y-1">
<span className="t-small font-semibold text-black/55">Marché & Opération</span>
<div className="font-semibold text-black">{project?.projectName || "Construction Siège"}</div>
<div className="text-black/75">
{"Code Marché: "}
{project?.projectCode || "CHANT-2026-08"}
</div>
<div className="text-black/75">
{"Lieu: "}
{project?.siteLocation || "Alger"}
{" (Wilaya "}
{project?.wilayaNumber || 16}
)
</div>
<div className="text-black/75 tabular-nums">
{"Montant Initial Marché: "}
{formatMoney(project?.contractAmountDzd || 0)}
</div>
</div>
<div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-black/[0.09] space-y-1">
<span className="t-small font-semibold text-black/55">Intervenants</span>
<div className="text-black">
<span className="font-semibold">Maître de l'Ouvrage:</span>
{" "}
{project?.clientName || "Administration"}
</div>
<div className="text-black">
<span className="font-semibold">Maître d'Œuvre (BET):</span>
{" BET Ingénierie & Architecture"}
</div>
<div className="text-black">
<span className="font-semibold">Organisme Contrôle CTC:</span>
{" CTC Région Centre"}
</div>
<div className="text-black">
<span className="font-semibold">Chef de Projet:</span>
{" "}
{project?.supervisorName || "Ing. Responsable"}
</div>
</div>
</div>
<div className="space-y-2 font-sans">
<h4 className="font-semibold t-small tracking-wide text-black/75">Décompte Financier Contradictoire (Dinar Algérien)</h4>
<table className="w-full border-collapse border border-black/[0.16] t-cap">
<thead>
<tr className="bg-neutral-100 text-black font-semibold">
<th className="border border-black/[0.16] p-2 text-left">Désignation des Éléments de Calcul</th>
<th className="border border-black/[0.16] p-2 text-center w-28">Référence</th>
<th className="border border-black/[0.16] p-2 text-right w-44">Montant (DZD)</th>
</tr>
</thead>
<tbody className="divide-y divide-black/[0.10]">
<tr>
<td className="border border-black/[0.16] p-2 font-medium">Cumul général des travaux exécutés à ce jour HT</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">Total Attachements</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums font-semibold">{formatMoney((dgp.previousCumulDzd || 0) + (dgp.periodGrossDzd || 0))}</td>
</tr>
<tr>
<td className="border border-black/[0.16] p-2 font-medium text-black/75">À déduire: Situations antérieures déjà certifiées HT</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">Précédent Cumul</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-black/75">
-
{formatMoney(dgp.previousCumulDzd || 0)}
</td>
</tr>
<tr className="bg-neutral-50 font-semibold">
<td className="border border-black/[0.16] p-2 text-black">Montant Brut de la présente situation HT</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">[A]</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-black">{formatMoney(dgp.periodGrossDzd)}</td>
</tr>
<tr>
<td className="border border-black/[0.16] p-2">
<span className="font-medium">Retenue de Garantie (5%)</span>
{project?.hasBankCautionReplacement ? /* @__PURE__ */ <span className="block t-small text-emerald-600 font-semibold">
{"(Couverte par Caution Bancaire N° "}
{project.bankCautionReference || "BNA-2026"}
)
</span> : /* @__PURE__ */ <span className="block t-cap text-black/55">(Dépôt légal libérable 12 mois après réception provisoire)</span>}
</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">Art. 99</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-amber-700">
{project?.hasBankCautionReplacement ? "0,00 DZD" : `-${formatMoney(dgp.retentionGuaranteeDzd)}`}
</td>
</tr>
<tr>
<td className="border border-black/[0.16] p-2">
<span className="font-medium">Remboursement d'Avance Forfaitaire</span>
<span className="block t-cap text-black/55">Amortissement contractuel sur acomptes</span>
</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">Art. 109</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-black/75">
-
{formatMoney(dgp.advanceAmortizationDzd || 0)}
</td>
</tr>
{dgp.penaltiesDeductedDzd && dgp.penaltiesDeductedDzd > 0 ? /* @__PURE__ */ <tr>
<td className="border border-black/[0.16] p-2 text-rose-700">
<span className="font-medium">Pénalités de retard (Décret 15-247 Art. 116)</span>
<span className="block t-cap text-rose-600">Plafonnées à 10% maximum du marché</span>
</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">Art. 116</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-rose-700">
-
{formatMoney(dgp.penaltiesDeductedDzd)}
</td>
</tr> : null}
<tr className="bg-neutral-50 font-semibold">
<td className="border border-black/[0.16] p-2">Total Net HT à mandater</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">[B]</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-black">{formatMoney(dgp.netPayableDzd - (dgp.tvaAmountDzd || 0))}</td>
</tr>
<tr>
<td className="border border-black/[0.16] p-2 font-medium">
TVA (
{dgp.tvaPercent || 19}
%)
<span className="block t-cap text-black/55">
{dgp.tvaPercent === 9 ? "Taux réduit Logement Social" : "Taux normal Travaux BTP"}
</span>
</td>
<td className="border border-black/[0.16] p-2 text-center text-black/55">CIDTA</td>
<td className="border border-black/[0.16] p-2 text-right tabular-nums text-blue-700">
+
{formatMoney(dgp.tvaAmountDzd || 0)}
</td>
</tr>
<tr className="bg-[#1F1D1B] text-white font-semibold t-small">
<td className="border border-black/50 p-3 tracking-wide">Montant Total Net à Mandater TTC</td>
<td className="border border-black/50 p-3 text-center text-white/60">NET TTC</td>
<td className="border border-black/50 p-3 text-right tabular-nums t-body text-[#FB923C]">{formatMoney(dgp.netPayableDzd)}</td>
</tr>
</tbody>
</table>
</div>
<div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-black/[0.09] font-sans space-y-1">
<span className="t-small font-semibold text-black/55">Arrêté de la présente situation (En Toutes Lettres)</span>
<p className="font-semibold text-black italic">
{"« Arrêtée la présente situation de travaux à la somme nette à mandater de : "}
{netPayableWords}
{" »"}
</p>
</div>
<div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/[0.14] text-center font-sans">
<div className="p-2 border border-black/[0.09] rounded-[var(--r-ctl-sm,10px)] h-28 flex flex-col justify-between">
<span className="t-small font-semibold text-black/75">L'Entrepreneur</span>
<p className="t-cap text-black/55">Signature & Cachet Humide</p>
</div>
<div className="p-2 border border-black/[0.09] rounded-[var(--r-ctl-sm,10px)] h-28 flex flex-col justify-between">
<span className="t-small font-semibold text-black/75">Le Maître d'Œuvre (BET)</span>
<p className="t-cap text-black/55">Visa pour vérification et métrés</p>
</div>
<div className="p-2 border border-black/[0.09] rounded-[var(--r-ctl-sm,10px)] h-28 flex flex-col justify-between">
<span className="t-small font-semibold text-black/75">Le Maître de l'Ouvrage</span>
<p className="t-cap text-black/55">Bon pour mandatement Trésor</p>
</div>
</div>
</div>
</div>
</div>
</div>;
};
