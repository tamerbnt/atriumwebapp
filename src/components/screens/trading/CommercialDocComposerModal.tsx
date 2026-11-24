import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Percent,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentB2bClientsFromState,
  selectCurrentWarehousesFromState,
  selectCurrentProductsFromState,
  selectCurrentBusinessFromState,
  useAtriumActions,
} from '../../../services/store';
import {
  CommercialDocument,
  CommercialDocType,
  CommercialDocItem,
  B2bClient,
  WarehouseDepot,
} from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSelect } from '../../ui/live/LiveSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney, calculateCommercialTotals } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface CommercialDocComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CommercialDocType;
  editingDoc?: CommercialDocument | null;
  onSaved?: (doc: CommercialDocument) => void;
}



export const CommercialDocComposerModal: React.FC<CommercialDocComposerModalProps> = ({ isOpen, onClose, initialType = "devis", editingDoc, onSaved }) => {
	const { t, isRtl, language } = useTranslation();
	const { b2bClients, warehouses, products, allCommercialDocs, currentBusiness, currentBranchId } = useAtriumSelector(
	  (s) => ({
	    b2bClients: selectCurrentB2bClientsFromState(s),
	    warehouses: selectCurrentWarehousesFromState(s),
	    products: selectCurrentProductsFromState(s),
	    allCommercialDocs: s.commercialDocs || [],
	    currentBusiness: selectCurrentBusinessFromState(s),
	    currentBranchId: s.currentBranchId,
	  }),
	  shallowEqualObjects
	);
	const { createCommercialDoc, updateCommercialDoc } = useAtriumActions();
	const isEdit = !!editingDoc;
	const [docType, setDocType] = React.useState(editingDoc?.type || initialType);
	const [clientId, setClientId] = React.useState(editingDoc?.clientId || b2bClients[0]?.id || "");
	const [depotId, setDepotId] = React.useState(editingDoc?.depotId || warehouses[0]?.id || "depot_01");
	const [date, setDate] = React.useState(editingDoc?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	const [validityDays, setValidityDays] = React.useState(editingDoc?.validityDays || 30);
	const [dueDate, setDueDate] = React.useState(editingDoc?.dueDate || "");
	const [paymentMethod, setPaymentMethod] = React.useState(editingDoc?.paymentMethod || "Virement bancaire");
	const [paymentTerms, setPaymentTerms] = React.useState(editingDoc?.paymentTerms || "30 jours");
	const [showAdvancedOptions, setShowAdvancedOptions] = React.useState((editingDoc?.generalDiscountPercent || 0) > 0 || (editingDoc?.guaranteeRetentionPercent || 0) > 0 || !!editingDoc?.notesTop || !!editingDoc?.notesBottom);
	const [generalDiscountPercent, setGeneralDiscountPercent] = React.useState(editingDoc?.generalDiscountPercent || 0);
	const [guaranteeRetentionPercent, setGuaranteeRetentionPercent] = React.useState(editingDoc?.guaranteeRetentionPercent || 0);
	const [isCashFiscalStampEnabled, setIsCashFiscalStampEnabled] = React.useState(editingDoc?.timbreFiscal !== void 0 ? editingDoc.timbreFiscal > 0 : editingDoc?.paymentMethod?.toLowerCase().includes("espèces") || false);
	const [notesTop, setNotesTop] = React.useState(editingDoc?.notesTop || "");
	const [notesBottom, setNotesBottom] = React.useState(editingDoc?.notesBottom || "");
	const [includeStampSignature, setIncludeStampSignature] = React.useState(editingDoc?.includeStampSignature ?? true);
	const [items, setItems] = React.useState(() => {
		if (editingDoc?.items && editingDoc.items.length > 0) return editingDoc.items;
		return [{
			id: `item_${Date.now()}_1`,
			productId: products[0]?.id || "",
			description: products[0]?.name || "Article standard",
			isService: false,
			quantity: 1,
			unit: "u",
			unitPriceHt: products[0]?.price?.amount || 1e3,
			tvaPercent: 19,
			discountPercent: 0,
			totalHt: products[0]?.price?.amount || 1e3,
			totalTtc: Math.round((products[0]?.price?.amount || 1e3) * 1.19)
		}];
	});
	const retainedEditingDoc = useRetainedModalValue(isOpen ? editingDoc ?? null : null);
	const isEditDisplay = !!(isOpen ? editingDoc : retainedEditingDoc);
	React.useEffect(() => {
		if (!isOpen) return;
		setDocType(editingDoc?.type || initialType);
		setClientId(editingDoc?.clientId || b2bClients[0]?.id || "");
		setDepotId(editingDoc?.depotId || warehouses[0]?.id || "depot_01");
		setDate(editingDoc?.date || (new Date()).toISOString().split("T")[0]);
		setValidityDays(editingDoc?.validityDays || 30);
		setDueDate(editingDoc?.dueDate || "");
		setPaymentMethod(editingDoc?.paymentMethod || "Virement bancaire");
		setPaymentTerms(editingDoc?.paymentTerms || "30 jours");
		setShowAdvancedOptions((editingDoc?.generalDiscountPercent || 0) > 0 || (editingDoc?.guaranteeRetentionPercent || 0) > 0 || !!editingDoc?.notesTop || !!editingDoc?.notesBottom);
		setGeneralDiscountPercent(editingDoc?.generalDiscountPercent || 0);
		setGuaranteeRetentionPercent(editingDoc?.guaranteeRetentionPercent || 0);
		setIsCashFiscalStampEnabled(editingDoc?.timbreFiscal !== void 0 ? editingDoc.timbreFiscal > 0 : editingDoc?.paymentMethod?.toLowerCase().includes("espèces") || false);
		setNotesTop(editingDoc?.notesTop || "");
		setNotesBottom(editingDoc?.notesBottom || "");
		setIncludeStampSignature(editingDoc?.includeStampSignature ?? true);
		if (editingDoc?.items && editingDoc.items.length > 0) {
			setItems(editingDoc.items);
		} else {
			setItems([{
				id: `item_${Date.now()}_1`,
				productId: products[0]?.id || "",
				description: products[0]?.name || "Article standard",
				isService: false,
				quantity: 1,
				unit: "u",
				unitPriceHt: products[0]?.price?.amount || 1e3,
				tvaPercent: 19,
				discountPercent: 0,
				totalHt: products[0]?.price?.amount || 1e3,
				totalTtc: Math.round((products[0]?.price?.amount || 1e3) * 1.19)
			}]);
		}
	}, [isOpen, editingDoc, initialType]);
	const selectedClient = React.useMemo(() => {
		return b2bClients.find((c) => c.id === clientId) || b2bClients[0];
	}, [b2bClients, clientId]);
	const selectedDepot = React.useMemo(() => {
		return warehouses.find((w) => w.id === depotId) || warehouses[0];
	}, [warehouses, depotId]);
	const generatedDocNumber = React.useMemo(() => {
		if (editingDoc) return editingDoc.docNumber;
		const year = (/* @__PURE__ */ new Date()).getFullYear();
		const count = allCommercialDocs.filter((d) => d.type === docType).length + 1;
		return `${docType === "devis" ? "DEV" : docType === "bl" ? "BL" : docType === "facture" ? "FAC" : docType === "commande" ? "BC" : docType === "avoir" ? "AV" : "RET"}-${year}-${count.toString().padStart(4, "0")}`;
	}, [
		docType,
		editingDoc,
		allCommercialDocs
	]);
	const handleItemChange = (index: any, field: any, value: any) => {
		setItems((prev: any) => {
			const next = [...prev];
			const target = {
				...next[index],
				[field]: value
			};
			const qty = Number(target.quantity) || 0;
			const puHt = Number(target.unitPriceHt) || 0;
			const disc = Number(target.discountPercent) || 0;
			const tva = Number(target.tvaPercent) || 0;
			const netHt = qty * puHt * (1 - disc / 100);
			const ttc = netHt * (1 + tva / 100);
			target.totalHt = Math.round(netHt * 100) / 100;
			target.totalTtc = Math.round(ttc * 100) / 100;
			next[index] = target;
			return next;
		});
	};
	const handleProductSelect = (index: any, prodId: any) => {
		const prod = products.find((p) => p.id === prodId);
		if (!prod) return;
		setItems((prev: any) => {
			const next = [...prev];
			const unitPrice = prod.price?.amount || 0;
			const tva = prod.taxRate ?? 19;
			const isSrv = prod.category?.toLowerCase().includes("service") || false;
			next[index] = {
				...next[index],
				productId: prod.id,
				description: prod.name,
				isService: isSrv,
				unit: prod.unit || "u",
				unitPriceHt: unitPrice,
				tvaPercent: tva,
				discountPercent: 0,
				totalHt: unitPrice * (next[index].quantity || 1),
				totalTtc: Math.round(unitPrice * (next[index].quantity || 1) * (1 + tva / 100))
			};
			return next;
		});
	};
	const addItemRow = () => {
		const newId = `item_${Date.now()}_${items.length + 1}`;
		setItems((prev: any) => [...prev, {
			id: newId,
			productId: "",
			description: "",
			isService: false,
			quantity: 1,
			unit: "u",
			unitPriceHt: 0,
			tvaPercent: 19,
			discountPercent: 0,
			totalHt: 0,
			totalTtc: 0
		}]);
	};
	const removeItemRow = (index: any) => {
		if (items.length <= 1) return;
		setItems((prev: any) => prev.filter((_: any, i: any) => i !== index));
	};
	const calculations = React.useMemo(() => {
		return calculateCommercialTotals({
			items,
			generalDiscountPercent,
			guaranteeRetentionPercent,
			paymentMethod,
			isCashFiscalStampEnabled
		});
	}, [
		items,
		generalDiscountPercent,
		guaranteeRetentionPercent,
		paymentMethod,
		isCashFiscalStampEnabled
	]);
	const handleSubmit = (targetStatus: CommercialDocument["status"] = "Validated") => {
		if (!clientId) {
			alert(t("trading_composer_alert_select_client"));
			return;
		}
		if (items.length === 0 || items.every((it: any) => !it.description)) {
			alert(t("trading_composer_alert_add_item"));
			return;
		}
		const docPayload = {
			tenantId: currentBusiness?.id || "acc_01",
			facilityId: currentBranchId || "fac_01",
			type: docType,
			docNumber: generatedDocNumber,
			clientId,
			clientName: selectedClient?.companyName || "Client Inconnu",
			clientNif: selectedClient?.nif,
			clientRc: selectedClient?.rc,
			clientAi: selectedClient?.ai,
			depotId,
			depotName: selectedDepot?.name || "Dépôt Central",
			date,
			validityDays,
			dueDate: dueDate || void 0,
			paymentMethod,
			paymentTerms,
			status: targetStatus,
			items: items.filter((it: any) => it.description.trim() !== ""),
			totalHtRaw: calculations.totalHtRaw,
			generalDiscountPercent,
			totalHtFinal: calculations.totalHtFinal,
			totalTva: calculations.totalTva,
			timbreFiscal: calculations.timbreFiscal,
			totalTtc: calculations.totalTtc,
			guaranteeRetentionPercent,
			guaranteeRetentionAmount: calculations.guaranteeRetentionAmount,
			netToPay: calculations.netToPay,
			currency: "DZD",
			notesTop: notesTop.trim() || void 0,
			notesBottom: notesBottom.trim() || void 0,
			includeStampSignature
		};
		if (isEdit && editingDoc) {
			updateCommercialDoc(editingDoc.id, docPayload as any);
			if (onSaved) onSaved({
				...editingDoc,
				...docPayload,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
		} else {
			const created = createCommercialDoc(docPayload as any);
			if (onSaved) onSaved(created);
		}
		onClose();
	};
	return (
		<KineticModalShell
			isOpen={isOpen}
			onClose={onClose}
			maxWidthClass="max-w-5xl"
			scrimClassName="bg-black/60"
			ariaLabel={isEditDisplay ? t("trading_composer_edit_title") : t("trading_composer_title")}
		>
			<div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[92vh] overflow-hidden">
<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F5F1EC]/70 dark:bg-[#22201E] shrink-0">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><FileText size={20} /></div>
<div>
<div className="flex items-center gap-2">
<h2 className="t-pod font-semibold text-black dark:text-white">{isEditDisplay ? t("trading_composer_edit_title") : t("trading_composer_title")}</h2>
<span className="px-2 py-1 rounded-[var(--r-check,6px)] t-small tabular-nums font-medium bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{generatedDocNumber}</span>
</div>
</div>
</div>
<button onClick={onClose} data-sq="ctl-sm" data-sq-border="none" className="p-2 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors"><X size={20} /></button>
</div>
<div className="p-6 overflow-y-auto space-y-6 flex-1 t-body">
<div>
<LabelSelect
label={t("trading_composer_doc_type")}
value={docType}
onChange={(val) => setDocType(val as CommercialDocType)}
options={[
								{ value: "devis", label: t("trading_doc_devis"), sublabel: "DEV" },
								{ value: "commande", label: t("trading_doc_commande"), sublabel: "BC" },
								{ value: "bl", label: t("trading_doc_bl"), sublabel: "BL" },
								{ value: "facture", label: t("trading_doc_facture"), sublabel: "FAC" },
								{ value: "avoir", label: t("trading_doc_avoir"), sublabel: "AV" },
							]}
/>
</div>
<div data-sq="card" data-sq-border="none" className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F5F1EC]/70 dark:bg-[#22201E]">
<div className="md:col-span-1">
<LabelSelect label={t("trading_composer_client_label")} value={clientId} onChange={setClientId} options={b2bClients.map((c) => ({
											value: c.id,
											label: `${c.companyName} ${c.city ? `(${c.city})` : ""}`
										}))} />
{selectedClient && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="none" className="mt-2 p-2.5 bg-white dark:bg-[#22201E] t-cap space-y-1 text-black/55 dark:text-white/55">
<div className="flex justify-between">
<span>NIF (15 chiffres):</span>
<span className="tabular-nums text-black/70 dark:text-white/75">{selectedClient.nif || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span>Registre Comm. (RC):</span>
<span className="tabular-nums text-black/70 dark:text-white/75">{selectedClient.rc || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span>Encours / Crédit:</span>
<span className="tabular-nums text-black/70 dark:text-white/75">
{formatMoney(selectedClient.outstandingBalance || 0)}
{" / "}
{formatMoney(selectedClient.creditLimit || 0)}
</span>
</div>
</div>}
</div>
<div>
<LabelSelect label={t("trading_composer_depot_label")} value={depotId} onChange={setDepotId} options={warehouses.map((w) => ({
										value: w.id,
										label: `${w.code} — ${w.name}`
									}))} />
<div className="mt-2 t-cap text-black/55 dark:text-white/55 flex items-center gap-2">
<Building2 size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
<span>
{selectedDepot?.address}
{", "}
{selectedDepot?.city}
</span>
</div>
</div>
<div className="space-y-3">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
<LabelInput type="date" label={t("trading_composer_issue_date")} value={date} onChange={setDate} />
<LabelInput type="date" label={t("trading_composer_due_date")} value={dueDate} onChange={setDueDate} />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
<LabelSelect label={t("trading_composer_payment_method")} value={paymentMethod} onChange={(v) => {
												setPaymentMethod(v);
												if (v.toLowerCase().includes("espèces")) setIsCashFiscalStampEnabled(true);
											}} options={[
												{
													value: "Virement bancaire",
													label: "Virement bancaire"
												},
												{
													value: "Chèque barré",
													label: "Chèque barré"
												},
												{
													value: "Chèque certifié",
													label: "Chèque certifié"
												},
												{
													value: "Espèces (Timbré)",
													label: "Espèces (Timbre fiscal)"
												},
												{
													value: "Traite / Effet",
													label: "Traite / Effet commercial"
												}
											]} />
<LabelSelect label={t("trading_composer_payment_terms")} value={paymentTerms} onChange={setPaymentTerms} options={[
												{
													value: "Comptant",
													label: "Comptant à livraison"
												},
												{
													value: "15 jours",
													label: "15 jours"
												},
												{
													value: "30 jours",
													label: "30 jours fin de mois"
												},
												{
													value: "45 jours",
													label: "45 jours"
												},
												{
													value: "60 jours",
													label: "60 jours"
												},
												{
													value: "90 jours",
													label: "90 jours"
												}
											]} />
</div>
</div>
</div>
<div>
<div className="flex items-center justify-between mb-2">
<h3 className="t-small font-semibold text-black/70 dark:text-white/75">
{t("trading_composer_items_services")}
{" ("}
{items.length}
)
</h3>
<button type="button" onClick={addItemRow} data-sq="ctl-sm" data-sq-border="none" className="inline-flex items-center gap-2 px-3 py-1 t-small font-medium bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:bg-[#d4522f]/20 transition-colors">
<Plus size={14} />
<span>{t("trading_composer_add_line")}</span>
</button>
</div>
<div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
<table className="w-full text-left t-cap">
<thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
<tr>
<th className="py-2 px-3 w-[260px]">Article / Service</th>
<th className="py-2 px-2 w-[80px]">Unité</th>
<th className="py-2 px-2 w-[70px] text-right">Qté</th>
<th className="py-2 px-2 w-[110px] text-right">P.U. HT (DA)</th>
<th className="py-2 px-2 w-[70px] text-right">TVA %</th>
<th className="py-2 px-2 w-[70px] text-right">Remise %</th>
<th className="py-2 px-3 w-[110px] text-right">Total HT</th>
<th className="py-2 px-2 w-[40px] text-center" />
</tr>
</thead>
<tbody className="divide-y divide-[var(--atr-divider)]">
{items.map((item: any, idx: number) => /* @__PURE__ */ <tr key={item.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
<td className="p-2 space-y-1.5">
<LiveSelect
size="sm"
tone="soft"
aria-label="Article / Service"
className="w-full justify-between"
placeholder="-- Choisir dans le catalogue --"
value={item.productId || ""}
onValueChange={(val) => handleProductSelect(idx, val)}
options={products.map((p) => ({
value: p.id,
label: `${p.sku ? `[${p.sku}] ` : ""}${p.name} (${p.price?.amount} DA)`
}))}
/>
<LabelInput
label="Désignation détaillée / référence"
value={item.description}
onChange={(val) => handleItemChange(idx, "description", val)}
height={40}
/>
</td>
<td className="p-2 align-top">
<LiveSelect
size="sm"
tone="soft"
aria-label="Unité"
className="w-full justify-between"
value={item.unit}
onValueChange={(val) => handleItemChange(idx, "unit", val)}
options={[
{ value: "u", label: "u" },
{ value: "pcs", label: "pcs" },
{ value: "sac", label: "sac" },
{ value: "barre", label: "barre" },
{ value: "fut", label: "fût" },
{ value: "tonne", label: "tonne" },
{ value: "m", label: "m" },
{ value: "m²", label: "m²" },
{ value: "pack", label: "pack" },
{ value: "carton", label: "carton" },
{ value: "forfait", label: "forfait" }
]}
/>
</td>
<td className="p-2 align-top">
<input type="number" min="0.01" step="any" aria-label="Quantité" value={item.quantity} onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-full h-8 t-cap rounded-[var(--r-check,6px)] border-0 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] focus:bg-[var(--lbi-bg-focus,#FFFFFF)] dark:focus:bg-[var(--lbi-bg-focus,#2E2B28)] px-2 py-1 text-end tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30 transition-colors" />
</td>
<td className="p-2 align-top">
<input type="number" min="0" step="any" aria-label="P.U. HT" value={item.unitPriceHt} onChange={(e) => handleItemChange(idx, "unitPriceHt", parseFloat(e.target.value) || 0)} className="w-full h-8 t-cap rounded-[var(--r-check,6px)] border-0 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] focus:bg-[var(--lbi-bg-focus,#FFFFFF)] dark:focus:bg-[var(--lbi-bg-focus,#2E2B28)] px-2 py-1 text-end tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30 transition-colors" />
</td>
<td className="p-2 align-top">
<LiveSelect
size="sm"
tone="soft"
aria-label="TVA %"
className="w-full justify-between"
value={String(item.tvaPercent)}
onValueChange={(val) => handleItemChange(idx, "tvaPercent", parseInt(val, 10))}
options={[
{ value: "19", label: "19%" },
{ value: "9", label: "9%" },
{ value: "0", label: "0%" }
]}
/>
</td>
<td className="p-2 align-top">
<input type="number" min="0" max="100" aria-label="Remise %" value={item.discountPercent || 0} onChange={(e) => handleItemChange(idx, "discountPercent", parseFloat(e.target.value) || 0)} className="w-full h-8 t-cap rounded-[var(--r-check,6px)] border-0 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] focus:bg-[var(--lbi-bg-focus,#FFFFFF)] dark:focus:bg-[var(--lbi-bg-focus,#2E2B28)] px-2 py-1 text-end tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30 transition-colors" />
</td>
<td className="p-2 text-end tabular-nums font-semibold text-black dark:text-white align-top pt-3">{formatMoney(item.totalHt)}</td>
<td className="p-2 text-center align-top pt-2.5">
<button type="button" onClick={() => removeItemRow(idx)} disabled={items.length <= 1} className="p-1 text-black/55 dark:text-white/55 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-black/55 dark:disabled:hover:text-white/55 transition-colors"><Trash2 size={14} /></button>
</td>
</tr>)}
</tbody>
</table>
</div>
</div>
<div data-sq="card" data-sq-border="none" className="overflow-hidden bg-[#F5F1EC]/70 dark:bg-[#22201E]">
<button type="button" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="w-full px-4 py-3 bg-[#F5F1EC] dark:bg-[#22201E] flex items-center justify-between t-small font-semibold text-black/70 dark:text-white/75 hover:bg-[#EAE1D8]/70 dark:hover:bg-[#282523] transition-colors cursor-pointer">
<div className="flex items-center gap-2">
<span>{t("trading_composer_advanced_accordion")}</span>
{(generalDiscountPercent > 0 || guaranteeRetentionPercent > 0 || isCashFiscalStampEnabled) && /* @__PURE__ */ <span className="px-2 py-1 rounded-full t-cap bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">{t("trading_composer_options_active")}</span>}
</div>
{showAdvancedOptions ? /* @__PURE__ */ <ChevronUp size={16} /> : /* @__PURE__ */ <ChevronDown size={16} />}
</button>
{showAdvancedOptions && /* @__PURE__ */ <div className="p-4 bg-white/80 dark:bg-[#22201E] space-y-4 border-t border-[var(--atr-divider)]">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div>
<LabelInput type="number" label={t("trading_composer_general_discount")} value={generalDiscountPercent} min={0} max={100} step={0.5} onChange={(val) => setGeneralDiscountPercent(parseFloat(val) || 0)} />
<p className="t-cap text-black/55 dark:text-white/55 mt-1">S'applique après les remises à la ligne.</p>
</div>
<div>
<LabelInput type="number" label={t("trading_composer_guarantee_retention")} value={guaranteeRetentionPercent} min={0} max={20} step={1} onChange={(val) => setGuaranteeRetentionPercent(parseFloat(val) || 0)} />
<p className="t-cap text-black/55 dark:text-white/55 mt-1">Usuellement 5% ou 10% pour les marchés et chantiers.</p>
</div>
<div className="flex flex-col justify-end">
<div data-sq="ctl-sm" data-sq-border="none" className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]">
<span className="t-small font-medium text-black/70 dark:text-white/75">{t("trading_composer_fiscal_stamp")}</span>
<LiveSwitch checked={isCashFiscalStampEnabled} onCheckedChange={setIsCashFiscalStampEnabled} aria-label={t("trading_composer_fiscal_stamp")} />
</div>
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
<LabelInput label={t("trading_composer_notes_top")} placeholder="Ex: Marché N° 14/2026 — Chantier Nouvelle Ville Sidi Abdellah" value={notesTop} onChange={setNotesTop} />
<LabelInput label={t("trading_composer_notes_bottom")} placeholder="Ex: Marchandise vendue agréée, aucun retour après 48h..." value={notesBottom} onChange={setNotesBottom} />
</div>
<div className="pt-1 flex items-center justify-between gap-3">
<span className="t-cap text-black/70 dark:text-white/75">{t("trading_composer_include_stamp")}</span>
<LiveSwitch checked={includeStampSignature} onCheckedChange={setIncludeStampSignature} aria-label={t("trading_composer_include_stamp")} />
</div>
</div>}
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC]/80 dark:bg-[#22201E] space-y-2">
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 t-cap tabular-nums">
<div>
<span className="text-black/55 dark:text-white/55 block t-cap">{t("trading_composer_total_raw_ht")}</span>
<span className="text-black dark:text-white font-semibold t-label">{formatMoney(calculations.totalHtRaw)}</span>
</div>
{generalDiscountPercent > 0 && /* @__PURE__ */ <div>
<span className="text-black/55 dark:text-white/55 block t-cap">
{t("trading_composer_general_discount")}
{" ("}
{generalDiscountPercent}
%)
</span>
<span className="text-rose-600 font-semibold t-label">
-
{formatMoney(calculations.totalHtRaw - calculations.totalHtFinal)}
</span>
</div>}
<div>
<span className="text-black/55 dark:text-white/55 block t-cap">{t("trading_composer_total_final_ht")}</span>
<span className="text-black dark:text-white font-semibold t-label">{formatMoney(calculations.totalHtFinal)}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block t-cap">{t("trading_composer_total_tva")}</span>
<span className="text-black dark:text-white font-semibold t-label">{formatMoney(calculations.totalTva)}</span>
</div>
{calculations.timbreFiscal > 0 && /* @__PURE__ */ <div>
<span className="text-black/55 dark:text-white/55 block t-cap">{t("trading_composer_fiscal_stamp")}</span>
<span className="text-amber-600 font-semibold t-label">
+
{formatMoney(calculations.timbreFiscal)}
</span>
</div>}
{calculations.guaranteeRetentionAmount > 0 && /* @__PURE__ */ <div>
<span className="text-black/55 dark:text-white/55 block t-cap">
{t("trading_composer_guarantee_retention")}
{" ("}
{guaranteeRetentionPercent}
%)
</span>
<span className="text-blue-600 font-semibold t-label">
-
{formatMoney(calculations.guaranteeRetentionAmount)}
</span>
</div>}
<div data-sq="ctl-sm" data-sq-border="none" className="col-span-2 sm:col-span-1 p-2 bg-[#d4522f]/10 sm:ml-auto w-full text-right">
<span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block t-small font-semibold">{t("trading_composer_net_to_pay")}</span>
<span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-card tabular-nums">{formatMoney(calculations.netToPay)}</span>
</div>
</div>
</div>
</div>
<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--atr-divider)] bg-[#F5F1EC]/70 dark:bg-[#22201E] shrink-0">
<AtriumButton type="button" variant="ghost" onClick={onClose}>{t("trading_composer_btn_cancel")}</AtriumButton>
<div className="flex items-center gap-2">
<AtriumButton type="button" variant="secondary" onClick={() => handleSubmit("Draft")}>{t("trading_composer_save_draft")}</AtriumButton>
<AtriumButton type="button" variant="primary" onClick={() => handleSubmit("Validated")} icon={<CheckCircle size={15} />}>
{isEdit ? t("trading_composer_btn_save_changes") : t("trading_composer_btn_validate")}
</AtriumButton>
</div>
</div>
			</div>
		</KineticModalShell>
	);
};
