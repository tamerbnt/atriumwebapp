import React, { useState } from 'react';
import { X, Calculator, Printer, Landmark, Building, FileCheck } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { calculateNotaryClosingCosts } from '../../../utils/realEstateRules';

interface NotarySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPriceDzd?: number;
  propertyTitle?: string;
}



const extractStr = (v: any): string => (typeof v === 'string' ? v : String(v?.target?.value ?? v?.value ?? v ?? ''));

export const NotarySimulatorModal: React.FC<NotarySimulatorModalProps> = ({ isOpen, onClose, defaultPriceDzd = 2e7, propertyTitle = "Simulation d'Acquisition Immobilière" }) => {
	const [priceDzd, setPriceDzd] = React.useState(defaultPriceDzd);
	const [propertyType, setPropertyType] = React.useState("Residential");
	const [deboursDzd, setDeboursDzd] = React.useState(25e3);
	if (!isOpen) return null;
	const sim = calculateNotaryClosingCosts(priceDzd, propertyType as any, deboursDzd);
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
<div className="sq-elev-pop relative w-full max-w-2xl my-8">
<div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 md:p-8 text-black dark:text-white">
<div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)] mb-5">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Landmark className="w-5 h-5" /></div>
<div>
<h2 className="t-dialog font-semibold">Simulateur de Frais de Notaire & Enregistrement</h2>
</div>
</div>
<button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="p-2 text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
<LabelInput type="number" label="Prix Déclaré du Bien (DZD)" value={priceDzd} onChange={(e) => setPriceDzd(Number(e.target.value))} required />
<LabelSelect label="Typologie Fiscale du Bien" value={propertyType} onChange={(val) => setPropertyType(extractStr(val))} options={[
							{
								value: "Residential",
								label: "Habitation Bâtie (Droits 2.5%)"
							},
							{
								value: "Commercial",
								label: "Commercial / Professionnel (Droits 5.0%)"
							},
							{
								value: "Land",
								label: "Terrain Urbain Constructible (Droits 5.0%)"
							},
							{
								value: "NewDevelopment",
								label: "Neuf Promoteur VEFA (Droits 2.5%)"
							}
						]} />
</div>
<div data-sq="card" data-sq-border="none" className="p-5 bg-[#F3EDE7] dark:bg-[#22201E] space-y-4">
<div className="flex items-center justify-between">
<span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">Décomposition Détaillée de l'Acquisition</span>
<span className="t-small font-semibold px-2 py-1 rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
Taux Moyen: ~
{sim.effectivePercentage}
% du prix
</span>
</div>
<div className="space-y-2 t-cap">
<div className="flex justify-between items-center py-2 border-b border-[var(--atr-divider)]">
<div>
<div className="font-semibold text-black dark:text-white">Droits d'Enregistrement (DGI / Trésor Public)</div>
<div className="t-cap text-black/70 dark:text-white/75">
{propertyType === "Commercial" || propertyType === "Land" ? "Taux légal 5.0%" : "Taux légal 2.5%"}
{" reversé à l'inspection des impôts"}
</div>
</div>
<span className="tabular-nums font-semibold t-label">
{sim.droitsEnregistrementDzd.toLocaleString()}
{" DZD"}
</span>
</div>
<div className="flex justify-between items-center py-2 border-b border-[var(--atr-divider)]">
<div>
<div className="font-semibold text-black dark:text-white">Taxe de Publicité Foncière (TPF)</div>
<div className="t-cap text-black/70 dark:text-white/75">Taux uniforme 1.0% pour inscription à la Conservation Foncière (Livret foncier)</div>
</div>
<span className="tabular-nums font-semibold t-label">
{sim.taxePubliciteFonciereDzd.toLocaleString()}
{" DZD"}
</span>
</div>
<div className="flex justify-between items-center py-2 border-b border-[var(--atr-divider)]">
<div>
<div className="font-semibold text-black dark:text-white">Émoluments Officiels du Notaire (Décret 08-243)</div>
<div className="t-cap text-black/70 dark:text-white/75">Barème dégressif par tranches (3% ≤500k, 2% ≤1M, 1% au-delà) + TVA 19%</div>
</div>
<div className="text-right">
<span className="tabular-nums font-semibold t-label">
{(sim.notaryEmolumentsHtDzd + sim.notaryTvaDzd).toLocaleString()}
{" DZD"}
</span>
<div className="t-cap text-black/70 dark:text-white/75">
{"HT: "}
{sim.notaryEmolumentsHtDzd.toLocaleString()}
{" · TVA: "}
{sim.notaryTvaDzd.toLocaleString()}
</div>
</div>
</div>
<div className="flex justify-between items-center py-2 border-b border-[var(--atr-divider)]">
<div>
<div className="font-semibold text-black dark:text-white">Timbres Fiscaux & Débours Administratifs</div>
<div className="t-cap text-black/70 dark:text-white/75">Certificats d'urbanisme, extraits cadastraux, timbres de dimension</div>
</div>
<span className="tabular-nums font-semibold">
{sim.deboursAndStampsDzd.toLocaleString()}
{" DZD"}
</span>
</div>
<div className="flex justify-between items-center pt-2 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
<span className="font-semibold t-label">Total des Frais de Notaire & Taxes</span>
<span className="tabular-nums font-semibold t-pod">
{sim.totalClosingCostsDzd.toLocaleString()}
{" DZD"}
</span>
</div>
<div data-sq="card" data-sq-border="none" className="p-3 bg-white dark:bg-[#22201E] flex justify-between items-center mt-2">
<div>
<span className="t-small font-semibold text-black/70 dark:text-white/75">Budget Global d'Acquisition (Prix + Frais)</span>
<div className="t-cap text-black/70 dark:text-white/75">Montant total à mobiliser par l'acquéreur</div>
</div>
<span className="tabular-nums font-semibold t-dialog text-black dark:text-white">
{sim.totalAcquisitionBudgetDzd.toLocaleString()}
{" DZD"}
</span>
</div>
</div>
</div>
<div className="flex items-center justify-between pt-5 border-t border-[var(--atr-divider)] mt-5">
<span className="t-cap text-black/70 dark:text-white/75">
* Calcul indicatif soumis à la vérification finale de l'étude notariale instrumentante.
</span>
<div className="flex items-center gap-2">
<AtriumButton variant="secondary" onClick={onClose} type="button">Fermer</AtriumButton>
<AtriumButton variant="primary" icon={<Printer size={14} />} onClick={() => {
								if (typeof window !== "undefined") window.print();
							}}>Imprimer Devis Acquéreur</AtriumButton>
</div>
</div>
</div>
</div>
</div>;
};
