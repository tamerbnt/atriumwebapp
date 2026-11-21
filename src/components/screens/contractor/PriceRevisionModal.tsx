import React, { useState, useMemo } from 'react';
import { X, Calculator, Printer, CheckCircle2, TrendingUp, Info, Building2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculatePriceRevisionCoeff } from '../../../utils/contractorRules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { ContractorProject } from '../../../types';

interface PriceRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ContractorProject;
}



export const PriceRevisionModal: React.FC<PriceRevisionModalProps> = ({ isOpen, onClose, project }) => {
	const { language } = useAtriumStore();
	const isAr = language === "ar";
	const [baseLaborS0, setBaseLaborS0] = React.useState("120.0");
	const [currentLaborS, setCurrentLaborS] = React.useState("134.5");
	const [baseMaterialM0, setBaseMaterialM0] = React.useState("145.0");
	const [currentMaterialM, setCurrentMaterialM] = React.useState("178.2");
	const [coeffA, setCoeffA] = React.useState("0.15");
	const [coeffB, setCoeffB] = React.useState("0.35");
	const [coeffC, setCoeffC] = React.useState("0.50");
	const [contractBaseAmount, setContractBaseAmount] = React.useState(String(project.contractAmountDzd || 85e6));
	const calculation = React.useMemo(() => {
		const s0 = parseFloat(baseLaborS0) || 120;
		const s = parseFloat(currentLaborS) || 134.5;
		const m0 = parseFloat(baseMaterialM0) || 145;
		const m = parseFloat(currentMaterialM) || 178.2;
		const a = parseFloat(coeffA) || .15;
		const b = parseFloat(coeffB) || .35;
		const c = parseFloat(coeffC) || .5;
		const baseP0 = parseFloat(contractBaseAmount) || 0;
		const res = calculatePriceRevisionCoeff(s, s0, m, m0, a, b, c);
		const revisedTotalDzd = Math.round(baseP0 * res.revisionCoefficient);
		const revisionAllowanceDzd = revisedTotalDzd - baseP0;
		const laborRatio = s / s0;
		const materialRatio = m / m0;
		return {
			kCoeff: res.revisionCoefficient,
			adjustmentRatio: res.priceAdjustmentRatio,
			percentChange: Math.round(res.priceAdjustmentRatio * 1e4) / 100,
			revisedTotalDzd,
			revisionAllowanceDzd,
			laborRatio: Number(laborRatio.toFixed(3)),
			materialRatio: Number(materialRatio.toFixed(3))
		};
	}, [
		baseLaborS0,
		currentLaborS,
		baseMaterialM0,
		currentMaterialM,
		coeffA,
		coeffB,
		coeffC,
		contractBaseAmount
	]);
	if (!isOpen) return null;
	const handlePrintNote = () => {
		window.print();
		showToast(isAr ? "تم تجهيز مذكرة مراجعة الأسعار التعاقدية" : "Note de calcul de révision des prix prête pour visa", "success");
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
<div className="sq-elev-pop w-full max-w-2xl">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-5 max-h-[90vh] overflow-y-auto">
<div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
<div className="flex items-center gap-2">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0"><Calculator size={20} /></div>
<div>
<h2 className="t-card font-semibold text-black dark:text-white">
{isAr ? "حاسبة مراجعة الأسعار التعاقدية (CCAG المادة 54)" : "Calculateur de Révision des Prix (CCAG Art. 54)"}
</h2>
<p className="t-cap text-black/55 dark:text-white/55">
{project.projectCode}
{" · "}
{project.projectName}
</p>
</div>
</div>
<button type="button" aria-label={isAr ? "إغلاق" : "Fermer"} onClick={onClose} className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={18} /></button>
</div>
<div data-sq="card" data-sq-border="solid" className="p-4 bg-neutral-50 dark:bg-[#22201E] space-y-1">
<div className="flex items-center gap-2 t-small font-semibold text-black dark:text-white">
<Info size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
<span>Formule Paramétrique Réglementaire Algérienne</span>
</div>
<p className="t-cap text-black/55 dark:text-white/55 tabular-nums">P = P0 × [a + b × (S / S0) + c × (M / M0)]</p>
<p className="t-cap text-black/55 dark:text-white/55">
Indices officiels de l’Office National des Statistiques (ONS) et mercuriale du Ministère des Travaux Publics.
</p>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3">
<span className="t-small font-semibold text-black dark:text-white block">Main d'Œuvre & Salaires (S)</span>
<div className="grid grid-cols-2 gap-2">
<LabelInput label="Indice Base S0" type="number" value={baseLaborS0} onChange={setBaseLaborS0} />
<LabelInput label="Indice Actuel S" type="number" value={currentLaborS} onChange={setCurrentLaborS} />
</div>
<div className="flex justify-between items-center t-cap text-black/55 dark:text-white/55 pt-1">
<span>Ratio S / S0:</span>
<span className="tabular-nums font-semibold text-black dark:text-white">
{calculation.laborRatio}
{" (+"}
{Math.round((calculation.laborRatio - 1) * 100)}
%)
</span>
</div>
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3">
<span className="t-small font-semibold text-black dark:text-white block">Matériaux & Carburant (M)</span>
<div className="grid grid-cols-2 gap-2">
<LabelInput label="Indice Base M0" type="number" value={baseMaterialM0} onChange={setBaseMaterialM0} />
<LabelInput label="Indice Actuel M" type="number" value={currentMaterialM} onChange={setCurrentMaterialM} />
</div>
<div className="flex justify-between items-center t-cap text-black/55 dark:text-white/55 pt-1">
<span>Ratio M / M0:</span>
<span className="tabular-nums font-semibold text-black dark:text-white">
{calculation.materialRatio}
{" (+"}
{Math.round((calculation.materialRatio - 1) * 100)}
%)
</span>
</div>
</div>
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2">
<div className="flex justify-between items-center t-cap">
<span className="font-semibold text-black dark:text-white">Pondération Contractuelle du Marché</span>
<span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
{"Total = "}
{(parseFloat(coeffA) + parseFloat(coeffB) + parseFloat(coeffC)).toFixed(2)}
</span>
</div>
<div className="grid grid-cols-3 gap-3">
<LabelInput label="Marge Fixe (a)" type="number" value={coeffA} onChange={setCoeffA} />
<LabelInput label="Part M.O. (b)" type="number" value={coeffB} onChange={setCoeffB} />
<LabelInput label="Part Matériaux (c)" type="number" value={coeffC} onChange={setCoeffC} />
</div>
</div>
<div>
<LabelInput label="Montant Initial des Travaux HT (DZD)" type="number" value={contractBaseAmount} onChange={setContractBaseAmount} />
</div>
<div className="sq-elev-card">
<div data-sq="card" data-sq-border="solid" data-surface="dark" className="p-4 bg-[#1F1D1B] [--sq-stroke:var(--sq-stroke-obsidian)] text-white space-y-3">
<div className="flex items-center justify-between">
<span className="t-small font-semibold text-white/80">Résultat Paramétrique (Coefficient K)</span>
<span className="px-2.5 py-1 rounded-full t-small tabular-nums font-semibold bg-[#3D2817] text-[#FB923C]">
{"K = "}
{calculation.kCoeff}
</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.12]">
<div>
<span className="t-cap text-white/75 block">Montant Initial HT</span>
<span className="t-card font-semibold tabular-nums">{formatMoney(parseFloat(contractBaseAmount) || 0)}</span>
</div>
<div>
<span className="t-cap text-white/75 block">Plus-value Révision</span>
<span className="t-card font-semibold tabular-nums text-emerald-400">
+
{formatMoney(calculation.revisionAllowanceDzd)}
</span>
<span className="t-cap text-emerald-500 block">
(+
{calculation.percentChange}
%)
</span>
</div>
<div>
<span className="t-cap text-white/75 block">Nouveau Montant Révisé HT</span>
<span className="t-card font-semibold tabular-nums text-[#FB923C]">{formatMoney(calculation.revisedTotalDzd)}</span>
</div>
</div>
</div>
<div className="flex items-center justify-between pt-2">
<AtriumButton variant="secondary" onClick={onClose}>{isAr ? "إغلاق" : "Fermer"}</AtriumButton>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" onClick={handlePrintNote} icon={<Printer size={14} />}>{isAr ? "طباعة مذكرة المراجعة" : "Imprimer Note CCAG"}</AtriumButton>
</div>
</div>
</div>
</div>
</div>
</div>;
};
