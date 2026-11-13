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
import { useAtriumStore } from '../../../services/store';
import {
  CommercialDocument,
  CommercialDocType,
  CommercialDocItem,
  B2bClient,
  WarehouseDepot,
} from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney, calculateCommercialTotals } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

interface CommercialDocComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CommercialDocType;
  editingDoc?: CommercialDocument | null;
  onSaved?: (doc: CommercialDocument) => void;
}



const CommercialDocComposerModal = ({ isOpen, onClose, initialType = "devis", editingDoc, onSaved }) => {
	const { t, isRtl, language } = useTranslation();
	const { b2bClients, warehouses, products, createCommercialDoc, updateCommercialDoc, allCommercialDocs, currentBusiness, currentBranchId } = useAtriumStore();
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
	const handleSubmit = (targetStatus = "Validated") => {
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
	if (!isOpen) return null;
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
<div className="relative w-full max-w-5xl my-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
<div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold"><FileText size={20} /></div>
<div>
<div className="flex items-center gap-2">
<h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">{isEdit ? t("trading_composer_edit_title") : t("trading_composer_title")}</h2>
<span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#d4522f]/15 text-[#d4522f]">{generatedDocNumber}</span>
</div>
<p className="text-xs text-stone-500 dark:text-stone-400">{t("trading_composer_fiscal_standards")}</p>
</div>
</div>
<button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"><X size={20} /></button>
</div>
<div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
<div>
<label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-2">{t("trading_composer_doc_type")}</label>
<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
{[
								{
									type: "devis",
									label: t("trading_doc_devis"),
									badge: "DEV"
								},
								{
									type: "commande",
									label: t("trading_doc_commande"),
									badge: "BC"
								},
								{
									type: "bl",
									label: t("trading_doc_bl"),
									badge: "BL"
								},
								{
									type: "facture",
									label: t("trading_doc_facture"),
									badge: "FAC"
								},
								{
									type: "avoir",
									label: t("trading_doc_avoir"),
									badge: "AV"
								}
							].map((item) => {
								const isSelected = docType === item.type;
								return /* @__PURE__ */ <button key={item.type} type="button" onClick={() => setDocType(item.type)} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${isSelected ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f] shadow-xs font-bold" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300"}`}>
<span className="w-2 h-2 rounded-full bg-current opacity-70" />
<span>{item.label}</span>
</button>;
							})}
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/20">
<div className="md:col-span-1">
<LabelSelect label={t("trading_composer_client_label")} value={clientId} onChange={(val) => setClientId(typeof val === "string" ? val : val?.target?.value || val)} options={b2bClients.map((c) => ({
											value: c.id,
											label: `${c.companyName} ${c.city ? `(${c.city})` : ""}`
										}))} />
{selectedClient && /* @__PURE__ */ <div className="mt-2 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] space-y-1 text-stone-500">
<div className="flex justify-between">
<span>NIF (15 chiffres):</span>
<span className="font-mono text-stone-700 dark:text-stone-300">{selectedClient.nif || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span>Registre Comm. (RC):</span>
<span className="font-mono text-stone-700 dark:text-stone-300">{selectedClient.rc || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span>Encours / Crédit:</span>
<span className="font-mono text-stone-700 dark:text-stone-300">
{formatMoney(selectedClient.outstandingBalance || 0)}
{" / "}
{formatMoney(selectedClient.creditLimit || 0)}
</span>
</div>
</div>}
</div>
<div>
<LabelSelect label={t("trading_composer_depot_label")} value={depotId} onChange={(val) => setDepotId(typeof val === "string" ? val : val?.target?.value || val)} options={warehouses.map((w) => ({
										value: w.id,
										label: `${w.code} — ${w.name}`
									}))} />
<div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
<Building2 size={13} className="text-[#d4522f]" />
<span>
{selectedDepot?.address}
{", "}
{selectedDepot?.city}
</span>
</div>
</div>
<div className="space-y-3">
<div className="grid grid-cols-2 gap-2">
<LabelInput type="date" label={t("trading_composer_issue_date")} value={date} onChange={(e) => setDate(e.target.value)} />
<LabelInput type="date" label={t("trading_composer_due_date")} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
</div>
<div className="grid grid-cols-2 gap-2">
<LabelSelect label={t("trading_composer_payment_method")} value={paymentMethod} onChange={(val) => {
												const v = typeof val === "string" ? val : val?.target?.value || val;
												setPaymentMethod(v);
												if (String(v).toLowerCase().includes("espèces")) setIsCashFiscalStampEnabled(true);
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
<LabelSelect label={t("trading_composer_payment_terms")} value={paymentTerms} onChange={(val) => setPaymentTerms(typeof val === "string" ? val : val?.target?.value || val)} options={[
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
<h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
{t("trading_composer_items_services")}
{" ("}
{items.length}
)
</h3>
<button type="button" onClick={addItemRow} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#d4522f]/10 text-[#d4522f] hover:bg-[#d4522f]/20 transition-colors">
<Plus size={14} />
<span>{t("trading_composer_add_line")}</span>
</button>
</div>
<div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900">
<table className="w-full text-left text-xs">
<thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
<tr>
<th className="py-2.5 px-3 w-[260px]">Article / Service</th>
<th className="py-2.5 px-2 w-[80px]">Unité</th>
<th className="py-2.5 px-2 w-[70px] text-right">Qté</th>
<th className="py-2.5 px-2 w-[110px] text-right">P.U. HT (DA)</th>
<th className="py-2.5 px-2 w-[70px] text-right">TVA %</th>
<th className="py-2.5 px-2 w-[70px] text-right">Remise %</th>
<th className="py-2.5 px-3 w-[110px] text-right">Total HT</th>
<th className="py-2.5 px-2 w-[40px] text-center" />
</tr>
</thead>
<tbody className="divide-y divide-stone-100 dark:divide-stone-800">
{items.map((item: any, idx: number) => /* @__PURE__ */ <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
<td className="p-2 space-y-1">
<select className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-[#d4522f]" value={item.productId || ""} onChange={(e) => handleProductSelect(idx, e.target.value)}>
<option value="">-- Choisir dans le catalogue --</option>
{products.map((p) => /* @__PURE__ */ <option key={p.id} value={p.id}>
{p.sku ? `[${p.sku}] ` : ""}
{p.name}
{" ("}
{p.price?.amount}
{" DA)"}
</option>)}
</select>
<input type="text" placeholder="Désignation détaillée / référence" value={item.description} onChange={(e) => handleItemChange(idx, "description", e.target.value)} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-[#d4522f]" />
</td>
<td className="p-2">
<select value={item.unit} onChange={(e) => handleItemChange(idx, "unit", e.target.value)} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-1 py-1">
<option value="u">u</option>
<option value="pcs">pcs</option>
<option value="sac">sac</option>
<option value="barre">barre</option>
<option value="fut">fût</option>
<option value="tonne">tonne</option>
<option value="m">m</option>
<option value="m²">m²</option>
<option value="pack">pack</option>
<option value="carton">carton</option>
<option value="forfait">forfait</option>
</select>
</td>
<td className="p-2">
<input type="number" min="0.01" step="any" value={item.quantity} onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono" />
</td>
<td className="p-2">
<input type="number" min="0" step="any" value={item.unitPriceHt} onChange={(e) => handleItemChange(idx, "unitPriceHt", parseFloat(e.target.value) || 0)} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono" />
</td>
<td className="p-2">
<select value={item.tvaPercent} onChange={(e) => handleItemChange(idx, "tvaPercent", parseInt(e.target.value, 10))} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-1 py-1 text-right font-mono">
<option value="19">19%</option>
<option value="9">9%</option>
<option value="0">0%</option>
</select>
</td>
<td className="p-2">
<input type="number" min="0" max="100" value={item.discountPercent || 0} onChange={(e) => handleItemChange(idx, "discountPercent", parseFloat(e.target.value) || 0)} className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono" />
</td>
<td className="p-2 text-right font-mono font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{formatMoney(item.totalHt)}</td>
<td className="p-2 text-center">
<button type="button" onClick={() => removeItemRow(idx)} disabled={items.length <= 1} className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"><Trash2 size={14} /></button>
</td>
</tr>)}
</tbody>
</table>
</div>
</div>
<div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
<button type="button" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors">
<div className="flex items-center gap-2">
<span>{t("trading_composer_advanced_accordion")}</span>
{(generalDiscountPercent > 0 || guaranteeRetentionPercent > 0 || isCashFiscalStampEnabled) && /* @__PURE__ */ <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#d4522f]/15 text-[#d4522f] font-mono">{t("trading_composer_options_active")}</span>}
</div>
{showAdvancedOptions ? /* @__PURE__ */ <ChevronUp size={16} /> : /* @__PURE__ */ <ChevronDown size={16} />}
</button>
{showAdvancedOptions && /* @__PURE__ */ <div className="p-4 bg-white dark:bg-stone-900 space-y-4 border-t border-stone-200 dark:border-stone-800">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div>
<LabelInput type="number" label={t("trading_composer_general_discount")} value={generalDiscountPercent} min={0} max={100} step={0.5} onChange={(e) => setGeneralDiscountPercent(parseFloat(e.target.value) || 0)} />
<p className="text-[11px] text-stone-400 mt-1">S'applique après les remises à la ligne.</p>
</div>
<div>
<LabelInput type="number" label={t("trading_composer_guarantee_retention")} value={guaranteeRetentionPercent} min={0} max={20} step={1} onChange={(e) => setGuaranteeRetentionPercent(parseFloat(e.target.value) || 0)} />
<p className="text-[11px] text-stone-400 mt-1">Usuellement 5% ou 10% pour les marchés et chantiers.</p>
</div>
<div className="flex flex-col justify-end">
<label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
<input type="checkbox" checked={isCashFiscalStampEnabled} onChange={(e) => setIsCashFiscalStampEnabled(e.target.checked)} className="rounded text-[#d4522f] focus:ring-[#d4522f]" />
<span className="text-xs font-medium text-stone-700 dark:text-stone-300">{t("trading_composer_fiscal_stamp")}</span>
</label>
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
<LabelInput label={t("trading_composer_notes_top")} placeholder="Ex: Marché N° 14/2026 — Chantier Nouvelle Ville Sidi Abdellah" value={notesTop} onChange={(e) => setNotesTop(e.target.value)} />
<LabelInput label={t("trading_composer_notes_bottom")} placeholder="Ex: Marchandise vendue agréée, aucun retour après 48h..." value={notesBottom} onChange={(e) => setNotesBottom(e.target.value)} />
</div>
<div className="pt-1">
<label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 dark:text-stone-400">
<input type="checkbox" checked={includeStampSignature} onChange={(e) => setIncludeStampSignature(e.target.checked)} className="rounded text-[#d4522f] focus:ring-[#d4522f]" />
<span>{t("trading_composer_include_stamp")}</span>
</label>
</div>
</div>}
</div>
<div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2">
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
<div>
<span className="text-stone-500 block text-[11px]">{t("trading_composer_total_raw_ht")}</span>
<span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">{formatMoney(calculations.totalHtRaw)}</span>
</div>
{generalDiscountPercent > 0 && /* @__PURE__ */ <div>
<span className="text-stone-500 block text-[11px]">
{t("trading_composer_general_discount")}
{" ("}
{generalDiscountPercent}
%)
</span>
<span className="text-rose-600 font-semibold text-sm">
-
{formatMoney(calculations.totalHtRaw - calculations.totalHtFinal)}
</span>
</div>}
<div>
<span className="text-stone-500 block text-[11px]">{t("trading_composer_total_final_ht")}</span>
<span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">{formatMoney(calculations.totalHtFinal)}</span>
</div>
<div>
<span className="text-stone-500 block text-[11px]">{t("trading_composer_total_tva")}</span>
<span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">{formatMoney(calculations.totalTva)}</span>
</div>
{calculations.timbreFiscal > 0 && /* @__PURE__ */ <div>
<span className="text-stone-500 block text-[11px]">{t("trading_composer_fiscal_stamp")}</span>
<span className="text-amber-600 font-semibold text-sm">
+
{formatMoney(calculations.timbreFiscal)}
</span>
</div>}
{calculations.guaranteeRetentionAmount > 0 && /* @__PURE__ */ <div>
<span className="text-stone-500 block text-[11px]">
{t("trading_composer_guarantee_retention")}
{" ("}
{guaranteeRetentionPercent}
%)
</span>
<span className="text-blue-600 font-semibold text-sm">
-
{formatMoney(calculations.guaranteeRetentionAmount)}
</span>
</div>}
<div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-[#d4522f]/10 border border-[#d4522f]/30 sm:ml-auto w-full text-right">
<span className="text-[#d4522f] block text-[11px] font-semibold uppercase">{t("trading_composer_net_to_pay")}</span>
<span className="text-[#d4522f] font-bold text-base tabular-nums">{formatMoney(calculations.netToPay)}</span>
</div>
</div>
</div>
</div>
<div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
<AtriumButton type="button" variant="ghost" onClick={onClose}>{t("trading_composer_btn_cancel")}</AtriumButton>
<div className="flex items-center gap-2">
<AtriumButton type="button" variant="secondary" onClick={() => handleSubmit("Draft")}>{t("trading_composer_save_draft")}</AtriumButton>
<AtriumButton type="button" variant="primary" onClick={() => handleSubmit("Validated")} icon={<CheckCircle size={15} />}>
{isEdit ? t("trading_composer_btn_save_changes") : t("trading_composer_btn_validate")}
</AtriumButton>
</div>
</div>
</div>
</div>;
};
