import React, { useState, useMemo } from 'react';
import { Factory, X, AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ManufacturingBom, ManufacturingOrder } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { validateStockAvailabilityForOf } from '../../../utils/manufacturingRules';
import { useManufacturingData } from './manufacturingData';

interface ManufacturingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  boms: ManufacturingBom[];
  onSave: (order: ManufacturingOrder) => void;
  orderToEdit?: ManufacturingOrder | null;
}



const ManufacturingOrderModal = ({ isOpen, onClose, boms, onSave, orderToEdit }) => {
	const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
	const isAr = language === "ar";
	const { materials } = useManufacturingData();
	const [bomId, setBomId] = React.useState(orderToEdit?.bomId || boms[0]?.id || "");
	const [quantity, setQuantity] = React.useState(orderToEdit ? String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || 10) : "10");
	const [dueDate, setDueDate] = React.useState(orderToEdit?.dueDate?.split("T")[0] || "2026-06-15");
	const [station, setStation] = React.useState(orderToEdit?.assignedStation || "Poste 03 - Découpe & Usinage CNC");
	const [clientName, setClientName] = React.useState(orderToEdit?.clientName || "");
	const [notes, setNotes] = React.useState(orderToEdit?.notes || "");
	React.useEffect(() => {
		if (orderToEdit) {
			setBomId(orderToEdit.bomId || boms[0]?.id || "");
			setQuantity(String(orderToEdit.targetQuantity || orderToEdit.quantityOrdered || 10));
			setDueDate(orderToEdit.dueDate ? orderToEdit.dueDate.split("T")[0] : "2026-06-15");
			setStation(orderToEdit.assignedStation || "Poste 03 - Découpe & Usinage CNC");
			setClientName(orderToEdit.clientName || "");
			setNotes(orderToEdit.notes || "");
		} else {
			setBomId(boms[0]?.id || "");
			setQuantity("10");
			setDueDate("2026-06-15");
			setStation("Poste 03 - Découpe & Usinage CNC");
			setClientName("");
			setNotes("");
		}
	}, [orderToEdit, boms]);
	const selectedBom = React.useMemo(() => {
		return boms.find((b: any) => b.id === bomId) || boms[0] || null;
	}, [boms, bomId]);
	const parsedQty = parseInt(quantity, 10) || 1;
	const stockCheck = React.useMemo(() => {
		if (!selectedBom || !selectedBom.components) return {
			canFulfill: true,
			missingComponents: []
		};
		return validateStockAvailabilityForOf(selectedBom.components, parsedQty, materials);
	}, [
		selectedBom,
		parsedQty,
		materials
	]);
	if (!isOpen) return null;
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (!selectedBom) {
			showToast(isAr ? "يرجى تحديد التركيبة (BOM)" : "Veuillez sélectionner une nomenclature (BOM)", "error");
			return;
		}
		onSave({
			id: orderToEdit ? orderToEdit.id : `of_${Date.now()}`,
			accountId: "acc_01",
			businessId: currentBusiness?.id || "biz_manufacturing",
			branchId: currentBranch?.id || "branch_manufacturing_main",
			staffId: currentUser?.id || "staff_01",
			orderNumber: orderToEdit ? orderToEdit.orderNumber : `OF-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
			bomId: selectedBom.id,
			bomCode: selectedBom.bomCode,
			productName: selectedBom.finishedProductName,
			targetQuantity: parsedQty,
			quantityOrdered: parsedQty,
			actualQuantityProduced: orderToEdit?.actualQuantityProduced || orderToEdit?.quantityProduced || 0,
			quantityProduced: orderToEdit?.actualQuantityProduced || orderToEdit?.quantityProduced || 0,
			scrapQuantity: orderToEdit?.scrapQuantity || 0,
			batchLotNumber: orderToEdit?.batchLotNumber || `LOT-202610-${Math.floor(1e3 + Math.random() * 9e3)}`,
			startDate: orderToEdit?.startDate || (/* @__PURE__ */ new Date()).toISOString(),
			dueDate: new Date(dueDate).toISOString(),
			targetDueDate: new Date(dueDate).toISOString(),
			status: orderToEdit?.status || "Planned",
			assignedStation: station,
			totalMaterialCostDzd: (selectedBom.estimatedCostDzd || 0) * parsedQty,
			totalLaborCostDzd: orderToEdit?.totalLaborCostDzd || Math.round((selectedBom.standardLaborHours || 10) * 1200 * parsedQty),
			totalCostDzd: orderToEdit?.totalCostDzd || Math.round(((selectedBom.estimatedCostDzd || 0) + (selectedBom.standardLaborHours || 10) * 1200) * parsedQty),
			clientName: clientName.trim() || void 0,
			notes: notes.trim() || void 0,
			createdAt: orderToEdit?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
		});
		onClose();
	};
	const bomOptions = boms.map((b: any) => ({
		value: b.id,
		label: `${b.finishedProductName} (${b.bomCode})`
	}));
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 animate-in zoom-in-95 duration-150">
<div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Factory size={20} /></div>
<div>
<h3 className="font-bold text-base text-neutral-900 dark:text-white">
{orderToEdit ? isAr ? "تعديل أمر التصنيع" : "Modifier l'Ordre de Fabrication" : isAr ? "أمر تصنيع جديد (OF)" : "Nouvel Ordre de Fabrication (OF)"}
</h3>
</div>
</div>
<button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"><X size={18} /></button>
</div>
<form onSubmit={handleSubmit} className="space-y-4">
<LabelSelect label={isAr ? "المنتج النهائي والتركيبة (BOM)" : "Produit & Nomenclature (BOM)"} value={bomId} onChange={setBomId} options={bomOptions} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput label={isAr ? "الكمية المستهدفة" : "Quantité à fabriquer"} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
<LabelInput label={isAr ? "تاريخ التسليم المستهدف" : "Date d'échéance atelier"} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
</div>
<div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 transition-all ${stockCheck.canFulfill ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300"}`}>
{stockCheck.canFulfill ? /* @__PURE__ */ <PackageCheck size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" /> : /* @__PURE__ */ <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />}
<div>
<div className="font-bold">
{stockCheck.canFulfill ? isAr ? "المخزون متاح بالكامل لإطلاق الدفعة" : "Matières premières disponibles en stock" : isAr ? "تنبيه: عجز جزئي في بعض المواد الأولية" : "Attention : Stock insuffisant pour certains composants"}
</div>
<p className="text-[11px] opacity-90 mt-0.5">
{stockCheck.canFulfill ? isAr ? "يمكن للمخزن تسليم إذن الصرف (BSM) فوراً" : "Le magasinier peut éditer le Bon de Sortie (BSM) sans rupture." : isAr ? `${stockCheck.missingComponents.length} مادة أولية تتطلب إعادة تموين` : `${stockCheck.missingComponents.length} composant(s) sous le seuil requis.`}
</p>
</div>
</div>
<LabelSelect label={isAr ? "محطة أو خط التشغيل" : "Poste / Ligne d'assemblage"} value={station} onChange={setStation} options={[
							{
								value: "Poste 03 - Découpe & Usinage CNC",
								label: "Poste 03 - Découpe & Usinage CNC"
							},
							{
								value: "Presse Injection Plastique 350T",
								label: "Presse Injection Plastique 350T"
							},
							{
								value: "Atelier Métallerie & Soudure MIG",
								label: "Atelier Métallerie & Soudure MIG"
							},
							{
								value: "Ligne Piqueuses Industrielles (Textile)",
								label: "Ligne Piqueuses Industrielles (Textile)"
							},
							{
								value: "Cabine Peinture & Vernis",
								label: "Cabine Peinture & Vernis"
							},
							{
								value: "Poste Contrôle Qualité Final",
								label: "Poste Contrôle Qualité Final"
							}
						]} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput label={isAr ? "اسم العميل / الوجهة" : "Client ou Destination"} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: Sonatrach, BNA, Sur stock..." />
<LabelInput label={isAr ? "تعليمات فنية للورشة" : "Instructions techniques"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tolérances, priorité haute..." />
</div>
<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="secondary" onClick={onClose}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton type="submit" variant="primary" icon={<Factory size={15} />}>{isAr ? "إطلاق أمر التصنيع" : "Lancer l'Ordre de Fabrication"}</AtriumButton>
</div>
</form>
</div>
</div>;
};
