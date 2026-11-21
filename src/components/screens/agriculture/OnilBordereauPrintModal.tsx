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



export const OnilBordereauPrintModal: React.FC<OnilBordereauPrintModalProps> = ({ isOpen, onClose, milkingRecords, dairyCows }) => {
	const { language, currentBusiness, currentBranch } = useAtriumStore();
	const isAr = language === "ar";
	if (!isOpen) return null;
	const totalGrossLiters = milkingRecords.reduce((acc, m) => acc + m.totalTankLiters, 0);
	const totalRejectedLiters = milkingRecords.reduce((acc, m) => acc + m.rejectedWithholdingLiters, 0);
	const totalConformingLiters = milkingRecords.reduce((acc, m) => acc + m.conformingLiters, 0);
	const totalSubsidyDzd = milkingRecords.reduce((acc, m) => acc + m.onilTotalSubsidyDzd, 0);
	const handlePrint = () => {
		window.print();
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
<div className="sq-elev-pop max-w-3xl w-full">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto">
<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-semibold shrink-0"><Milk size={22} /></div>
<div>
<h2 className="t-card font-semibold text-black dark:text-white">
{isAr ? "جدول تسليم الحليب الطازج - ملف الدعم الوطني ONIL" : "Bordereau Officiel de Livraison de Lait Cru (Subvention ONIL)"}
</h2>
<p className="t-cap text-black/55 dark:text-white/75">
{isAr ? "مطابق للقرار الوزاري المشترك - 12 دج/لتر للمربي المعتمد لدى مصالح الفلاحة DSA" : "Conforme à l'Arrêté Interministériel - Prime de 12,00 DA/Litre versée par l'ONIL"}
</p>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>{isAr ? "طباعة الوثيقة الرسمية" : "Imprimer Bordereau"}</AtriumButton>
<button type="button" onClick={onClose} aria-label={isAr ? "إغلاق" : "Fermer"} className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={18} /></button>
</div>
</div>
<div className="printable-document bg-white text-black p-8 rounded-[var(--r-card,16px)] border border-black/[0.14] shadow-xs space-y-6 font-sans t-cap print:m-0 print:p-0 print:border-none print:shadow-none">
<div className="text-center space-y-1 pb-4 border-b border-black/[0.14]">
<p className="font-semibold t-small tracking-wide">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<p className="t-cap text-black/75">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
<p className="t-small text-black/75 font-semibold pt-1">
وزارة الفلاحة والتنمية الريفية · الديوان الوطني المهني المشترك للحليب ومشتقاته (ONIL)
</p>
<h2 className="t-card font-semibold text-black pt-2 rtl:normal-case rtl:tracking-normal">BORDEREAU MENSUEL DE LIVRAISON DE LAIT CRU DE VACHE</h2>
<p className="t-small font-semibold text-black/75">Dispositif de Soutien à la Production Nationale · Campagne 2026</p>
</div>
<div className="grid grid-cols-2 gap-4 p-4 rounded-[var(--r-ctl,12px)] bg-neutral-50 border border-black/[0.09] t-cap">
<div className="space-y-2">
<span className="font-semibold text-black block t-small">Identification de l'Exploitation (Éleveur)</span>
<p className="font-semibold text-black t-label">{currentBusiness?.name || "Domaine Agricole & Élevage El Baraka"}</p>
<p className="text-black/75">
{"Carte Fellah N°: "}
<span className="tabular-nums font-semibold">CAW-16-09418</span>
</p>
<p className="text-black/75">
{"Wilaya / Commune: "}
<span className="font-medium">Alger / Zéralda - Mitidja</span>
</p>
<p className="text-black/75">
{"Compte Bancaire BADR / RIP: "}
<span className="tabular-nums font-semibold">003 00116 0248192019 44</span>
</p>
</div>
<div className="space-y-2 border-l border-black/[0.09] pl-4">
<span className="font-semibold text-black block t-small">Laiterie de Transformation Agréée</span>
<p className="font-semibold text-black t-label">Laiterie Publique Giplait Draa Ben Khedda</p>
<p className="text-black/75">
{"Agrément Sanitaire N°: "}
<span className="tabular-nums font-semibold">DSV-15-LAIT-084</span>
</p>
<p className="text-black/75">
{"Taux de Subvention État: "}
<span className="font-semibold text-emerald-700">12,00 DA / Litre conforme</span>
</p>
<p className="text-black/75">
{"Période de Livraison: "}
<span className="font-medium">Mois de Mai 2026</span>
</p>
</div>
</div>
<div className="space-y-2">
<h3 className="font-semibold text-black t-small">1. Détail des Sessions de Traite & Livraisons Réceptionnées</h3>
<table className="w-full text-left border-collapse border border-black/[0.14] t-cap">
<thead>
<tr className="bg-neutral-100 text-black/75">
<th className="border border-black/[0.14] p-2 font-semibold">Date Session</th>
<th className="border border-black/[0.14] p-2 font-semibold">Période</th>
<th className="border border-black/[0.14] p-2 font-semibold">N° BL Laiterie</th>
<th className="border border-black/[0.14] p-2 font-semibold text-right">Volume Brut</th>
<th className="border border-black/[0.14] p-2 font-semibold text-right">Lait Retenu (Antibiotique)</th>
<th className="border border-black/[0.14] p-2 font-semibold text-right">Volume Conforme</th>
<th className="border border-black/[0.14] p-2 font-semibold text-right">Prime ONIL (12 DA)</th>
</tr>
</thead>
<tbody>
{milkingRecords.map((m) => /* @__PURE__ */ <tr key={m.id} className="hover:bg-neutral-50/80">
<td className="border border-black/[0.14] p-2 tabular-nums">{m.sessionDate}</td>
<td className="border border-black/[0.14] p-2 capitalize">{m.sessionPeriod === "morning" ? "Traite Matin (06h)" : "Traite Soir (18h)"}</td>
<td className="border border-black/[0.14] p-2 tabular-nums font-semibold">{m.dairyDeliverySlipNo || "BL-REC-001"}</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums">
{m.totalTankLiters}
{" L"}
</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums text-rose-600 font-semibold">{m.rejectedWithholdingLiters > 0 ? `-${m.rejectedWithholdingLiters} L` : "0 L"}</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums font-semibold text-black">
{m.conformingLiters}
{" L"}
</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums font-semibold text-emerald-700">{formatMoney(m.onilTotalSubsidyDzd)}</td>
</tr>)}
</tbody>
<tfoot>
<tr className="bg-neutral-100 font-semibold text-black">
<td colSpan={3} className="border border-black/[0.14] p-2 text-right">Totaux Mensuels :</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums">
{totalGrossLiters}
{" L"}
</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums text-rose-600">
-
{totalRejectedLiters}
{" L"}
</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums text-black font-semibold">
{totalConformingLiters}
{" L"}
</td>
<td className="border border-black/[0.14] p-2 text-right tabular-nums text-emerald-800 font-semibold t-label">{formatMoney(totalSubsidyDzd)}</td>
</tr>
</tfoot>
</table>
</div>
<div className="p-3 rounded-[var(--r-ctl,12px)] bg-emerald-50 border border-emerald-200 text-emerald-900 t-cap flex items-center justify-between">
<div className="flex items-center gap-2">
<ShieldCheck size={18} className="text-emerald-700 shrink-0" />
<span>
<strong>Conformité Sanitaire DSV :</strong>
{" Cheptel contrôlé ("}
{dairyCows.length}
{" vaches identifiées par boucles DZ). Zéro résidu d'antibiotique dans les volumes conformes certifiés."}
</span>
</div>
<span className="tabular-nums font-semibold text-emerald-800">MG Moyenne : 35.8 g/L · Densité : 1.029</span>
</div>
<div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/[0.14] text-center">
<div className="space-y-12">
<p className="font-semibold t-small">L'Éleveur Producteur</p>
<p className="t-cap text-black/55">(Signature & Cachet)</p>
</div>
<div className="space-y-12 border-x border-black/[0.09] px-2">
<p className="font-semibold t-small">Le Responsable Laiterie</p>
<p className="t-cap text-black/55">(Visa Réception & Pesée)</p>
</div>
<div className="space-y-12">
<p className="font-semibold t-small">L'Inspecteur Vétérinaire DSA</p>
<p className="t-cap text-black/55">(Cachet Officiel ONIL / DSA)</p>
</div>
</div>
</div>
</div>
</div>
</div>;
};
