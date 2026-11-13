import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Printer,
  ArrowRight,
  TrendingUp,
  FileText,
  Warehouse,
  PackagePlus,
  Receipt,
  ScanLine,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateCmupWeightedAverage } from '../../../utils/manufacturingRules';
import { RawMaterialStockItem, MaterialTransferVoucher } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const ManufacturingMaterialsView: React.FC<any> = () => {
	const { language, currentUser, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { materials, vouchers, addMaterial, updateMaterial, addVoucher } = useManufacturingData();
	const [activeSubTab, setActiveSubTab] = React.useState("inventory");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [categoryFilter, setCategoryFilter] = React.useState("All");
	const [viewMode, setViewMode] = React.useState("list");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["raw_01"]));
	const [sortBy, setSortBy] = React.useState("name");
	const [sortDir, setSortDir] = React.useState("asc");
	const [isMaterialModalOpen, setIsMaterialModalOpen] = React.useState(false);
	const [materialToEdit, setMaterialToEdit] = React.useState<any>(null);
	const [sku, setSku] = React.useState("");
	const [name, setName] = React.useState("");
	const [category, setCategory] = React.useState("Wood");
	const [stock, setStock] = React.useState("10");
	const [unit, setUnit] = React.useState("m³");
	const [minThreshold, setMinThreshold] = React.useState("3");
	const [unitCostDzd, setUnitCostDzd] = React.useState("180000");
	const [warehouseLocation, setWarehouseLocation] = React.useState("Dépôt Bois - Rack A-01");
	const [selectedMaterial, setSelectedMaterial] = React.useState<any>(() => materials[0] || null);
	const [activeDrawerTab, setActiveDrawerTab] = React.useState("fiche");
	const [isVoucherModalOpen, setIsVoucherModalOpen] = React.useState(false);
	const [voucherType, setVoucherType] = React.useState("BonDeSortie");
	const [voucherMaterialId, setVoucherMaterialId] = React.useState(materials[0]?.id || "");
	const [voucherQty, setVoucherQty] = React.useState("1");
	const [voucherRecipient, setVoucherRecipient] = React.useState("M. Karim Bouzid (Opérateur)");
	const [voucherNotes, setVoucherNotes] = React.useState("Sortie pour Ordre de Fabrication OF-2026-0089");
	const [printableVoucher, setPrintableVoucher] = React.useState<any>(null);
	const filteredMaterials = React.useMemo(() => {
		return materials.filter((m) => {
			if (categoryFilter !== "All" && m.category !== categoryFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesSku = m.sku.toLowerCase().includes(q);
				const matchesName = m.name.toLowerCase().includes(q);
				const matchesLoc = m.warehouseLocation?.toLowerCase().includes(q) || false;
				if (!matchesSku && !matchesName && !matchesLoc) return false;
			}
			return true;
		});
	}, [
		materials,
		categoryFilter,
		searchQuery
	]);
	const sortedMaterials = React.useMemo(() => {
		const list = [...filteredMaterials];
		list.sort((a, b) => {
			const aPinned = pinnedIds.has(a.id);
			const bPinned = pinnedIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (sortBy === "name") {
				const cmp = a.name.localeCompare(b.name);
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "stock") {
				const cmp = a.currentStock - b.currentStock;
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "valuation") {
				const valA = a.currentStock * a.unitCostPmpDzd;
				const valB = b.currentStock * b.unitCostPmpDzd;
				return sortDir === "asc" ? valA - valB : valB - valA;
			}
			return 0;
		});
		return list;
	}, [
		filteredMaterials,
		pinnedIds,
		sortBy,
		sortDir
	]);
	const totalValuation = React.useMemo(() => {
		return materials.reduce((acc, m) => acc + m.currentStock * m.unitCostPmpDzd, 0);
	}, [materials]);
	const lowStockCount = React.useMemo(() => {
		return materials.filter((m) => m.currentStock <= m.reorderThreshold).length;
	}, [materials]);
	const handleOpenAdd = () => {
		setMaterialToEdit(null);
		setSku(`RAW-ALG-${Math.floor(100 + Math.random() * 900)}`);
		setName("");
		setCategory("Wood");
		setStock("10");
		setUnit("m³");
		setMinThreshold("3");
		setUnitCostDzd("15000");
		setWarehouseLocation("Dépôt Central A-01");
		setIsMaterialModalOpen(true);
	};
	const handleOpenEdit = (m: any) => {
		setMaterialToEdit(m);
		setSku(m.sku);
		setName(m.name);
		setCategory(m.category);
		setStock(String(m.currentStock));
		setUnit(m.unit);
		setMinThreshold(String(m.reorderThreshold));
		setUnitCostDzd(String(m.unitCostPmpDzd));
		setWarehouseLocation(m.warehouseLocation || "Dépôt Central A-01");
		setIsMaterialModalOpen(true);
	};
	const handleSaveMaterial = (e: any) => {
		e.preventDefault();
		const stockNum = parseFloat(stock) || 0;
		const threshNum = parseFloat(minThreshold) || 1;
		const costNum = parseFloat(unitCostDzd) || 0;
		if (materialToEdit) {
			const updated = {
				...materialToEdit,
				sku,
				name,
				category,
				currentStock: stockNum,
				availableStock: Math.max(0, stockNum - materialToEdit.allocatedStock),
				reorderThreshold: threshNum,
				unit,
				unitCostPmpDzd: costNum,
				totalValuationDzd: stockNum * costNum,
				warehouseLocation
			};
			updateMaterial(updated);
			if (selectedMaterial?.id === updated.id) setSelectedMaterial(updated);
			showToast(isAr ? "تم تحديث بطاقة المادة الأولية" : "Fiche matière première mise à jour", "success");
		} else {
			const newItem: any = {
				id: `raw_${Date.now()}`,
				accountId: "acc_01",
				businessId: "biz_manufacturing",
				branchId: "branch_manufacturing_main",
				staffId: currentUser?.id || "staff_01",
				sku,
				name,
				category,
				currentStock: stockNum,
				allocatedStock: 0,
				availableStock: stockNum,
				reorderThreshold: threshNum,
				unit,
				unitCostPmpDzd: costNum,
				totalValuationDzd: stockNum * costNum,
				warehouseLocation,
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			addMaterial(newItem);
			setSelectedMaterial(newItem);
			showToast(isAr ? "تمت إضافة المادة الأولية بنجاح" : "Nouvelle matière première enregistrée", "success");
		}
		setIsMaterialModalOpen(false);
	};
	const handleCreateVoucher = (e: any) => {
		e.preventDefault();
		const mat = materials.find((m) => m.id === voucherMaterialId) || materials[0];
		if (!mat) return;
		const qty = parseFloat(voucherQty) || 1;
		const unitCost = mat.unitCostPmpDzd;
		const totalVal = qty * unitCost;
		const prefix = voucherType === "BonDeSortie" ? "BSM" : voucherType === "BonDeReception" ? "BR" : "BT";
		const newVoucher: any = {
			id: `v_${Date.now()}`,
			accountId: "acc_01",
			businessId: "biz_manufacturing",
			branchId: "branch_manufacturing_main",
			staffId: currentUser?.id || "staff_01",
			voucherNumber: `${prefix}-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
			voucherType,
			recipientStaffName: voucherRecipient,
			transferDate: (/* @__PURE__ */ new Date()).toISOString(),
			items: [{
				materialId: mat.id,
				materialName: mat.name,
				quantity: qty,
				unit: mat.unit,
				unitCostDzd: unitCost,
				lotNumber: mat.supplierLotNumber || "LOT-2026"
			}],
			totalValueDzd: totalVal,
			notes: voucherNotes
		};
		if (voucherType === "BonDeSortie") {
			const updatedStock = Math.max(0, mat.currentStock - qty);
			updateMaterial({
				...mat,
				currentStock: updatedStock,
				availableStock: Math.max(0, updatedStock - mat.allocatedStock),
				totalValuationDzd: updatedStock * mat.unitCostPmpDzd
			});
		} else if (voucherType === "BonDeReception") {
			const newCmup = calculateCmupWeightedAverage(mat.currentStock, mat.unitCostPmpDzd, qty, unitCost);
			const newQty = mat.currentStock + qty;
			updateMaterial({
				...mat,
				currentStock: newQty,
				availableStock: newQty - mat.allocatedStock,
				unitCostPmpDzd: newCmup,
				totalValuationDzd: newQty * newCmup
			});
		}
		addVoucher(newVoucher);
		setIsVoucherModalOpen(false);
		setPrintableVoucher(newVoucher);
		showToast(isAr ? `تم إصدار السند ${newVoucher.voucherNumber} وفق المرسوم 05-468` : `Bon ${newVoucher.voucherNumber} enregistré selon le Décret 05-468`, "success");
	};
	const columns = React.useMemo(() => [
		{
			key: "name",
			header: isAr ? "المادة الأولية / الرمز" : "Matière Première & SKU",
			width: "3.6*",
			sortable: true,
			renderCell: (m: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8]"><Boxes size={18} /></div>
<div className="min-w-0">
<div className="font-bold text-xs text-black dark:text-white truncate">{m.name}</div>
<div className="flex items-center gap-2 text-[11px] text-black/55 dark:text-white/55 font-mono mt-0.5">
<span className="font-bold text-[#d4522f]">{m.sku}</span>
<span>•</span>
<span>{m.warehouseLocation || "Allée A-01"}</span>
</div>
</div>
</div>
		},
		{
			key: "stock",
			header: isAr ? "المخزون المتاح / الإجمالي" : "Stock (Dispo / Total)",
			width: "2.5*",
			sortable: true,
			renderCell: (m: any) => {
				const isLow = m.currentStock <= m.reorderThreshold;
				return /* @__PURE__ */ <div>
<div className="flex items-center gap-1.5 font-mono text-xs font-bold text-black dark:text-white">
<span>{m.availableStock ?? m.currentStock}</span>
<span className="text-black/55 dark:text-white/55 font-sans font-normal">
{"/ "}
{m.currentStock}
{" "}
{m.unit}
</span>
</div>
<div className="text-[10px] mt-0.5">
{isLow ? /* @__PURE__ */ <span className="text-red-500 font-bold flex items-center gap-1">
<AlertCircle size={10} />
{" "}
{isAr ? "تحت العتبة الحرجة" : "Seuil Réappro atteint"}
</span> : /* @__PURE__ */ <span className="text-emerald-600 font-medium">Stock normal</span>}
</div>
</div>;
			}
		},
		{
			key: "valuation",
			header: isAr ? "سعر الوحدة PMP / القيمة" : "Coût PMP / Valeur Dépôt",
			width: "2.5*",
			sortable: true,
			renderCell: (m: any) => /* @__PURE__ */ <div>
<div className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(m.currentStock * m.unitCostPmpDzd)}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5">
{"PMP: "}
{formatMoney(m.unitCostPmpDzd)}
{" / "}
{m.unit}
</div>
</div>
		},
		{
			key: "category",
			header: isAr ? "الصنف" : "Catégorie",
			width: "2.0*",
			renderCell: (m: any) => /* @__PURE__ */ <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-neutral-200 dark:border-neutral-700">{m.category}</span>
		}
	], [isAr]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: materials.length > 0
	});
	if (showSkeleton && (materials.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Warehouse size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "المواد" : language === "en" ? "Materials" : "Matières"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">
{materials.length}
{" "}
{isAr ? "صنف" : "références"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton type="button" variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => setIsVoucherModalOpen(true)}><span>{isAr ? "سند صرف / استلام BSM" : "Nouveau Bon BSM / BR"}</span></AtriumButton>
<AtriumButton type="button" variant="primary" onClick={handleOpenAdd} icon={<Plus size={15} strokeWidth={2.5} />}><span>{isAr ? "مادة أولية جديدة" : "Nouvelle Matière"}</span></AtriumButton>
</div>
</div>
<LiveSegmentedControl size="sm" value={activeSubTab} onValueChange={(val) => setActiveSubTab(val)} options={[{
					value: "inventory",
					label: isAr ? "مخزون" : "Stock",
					tooltip: isAr ? "مخزون المواد الأولية PMP" : language === "fr" ? "Stock & Valorisation PMP" : "Raw material stock & PMP valuation",
					count: materials.length
				}, {
					value: "vouchers",
					label: isAr ? "سندات" : language === "fr" ? "Bons" : "Vouchers",
					tooltip: isAr ? "سجل السندات (BSM / BR)" : language === "fr" ? "Registre Bons Décret 05-468" : "Movement vouchers registry",
					count: vouchers.length
				}]} aria-label="Manufacturing Materials Subtab" />
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{isAr ? "إجمالي قيمة المخزون PMP" : "Valeur Totale du Dépôt"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(totalValuation)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">{isAr ? "طريقة المتوسط المرجح PMP" : "Calculé au Coût Moyen Unitaire Pondéré"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{isAr ? "المواد تحت العتبة الحرجة" : "Alertes Réapprovisionnement"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{lowStockCount}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">{isAr ? "تتطلب طلبيات شراء فورية" : "Références sous le stock de sécurité"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-white/80">{isAr ? "الامتثال للمرسوم 05-468" : "Traçabilité Décret 05-468"}</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C]">Conforme</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
{vouchers.length}
{" Bons"}
</div>
<p className="text-[11px] text-white/75 mt-0.5">Bons de Sortie (BSM) & Réception (BR) signés</p>
</div>
</div>
</div>
</div>
{activeSubTab === "inventory" ? /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-black dark:text-white">{isAr ? "دليل المواد الأولية" : "Catalogue Matières Premières"}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={isAr ? "بحث بالاسم، الرمز، أو الرف..." : "Recherche SKU, matière, casier..."} shutSize={36} openWidth={220} />
<FilterSelect label={isAr ? "الصنف" : language === "fr" ? "Catégorie" : "Category"} value={categoryFilter} onChange={(val) => setCategoryFilter(typeof val === "string" ? val : val.target?.value || val)} options={[
								{
									value: "All",
									label: isAr ? "الكل" : language === "fr" ? "Toutes" : "All",
									tooltip: isAr ? "جميع الأصناف" : language === "fr" ? "Toutes Catégories" : "All categories"
								},
								{
									value: "Wood",
									label: isAr ? "خشب" : language === "fr" ? "Bois" : "Wood",
									tooltip: isAr ? "مواد الخشب" : "Matières bois"
								},
								{
									value: "Metals",
									label: isAr ? "معادن" : language === "fr" ? "Métaux" : "Metals",
									tooltip: isAr ? "المعادن والصلب" : "Métaux & alliages"
								},
								{
									value: "Plastics",
									label: isAr ? "بلاستيك" : language === "fr" ? "Plastiques" : "Plastics",
									tooltip: isAr ? "البلاستيك والبوليمرات" : "Plastiques & polymères"
								},
								{
									value: "Chemicals",
									label: isAr ? "كيمياء" : language === "fr" ? "Chimie" : "Chemicals",
									tooltip: isAr ? "المواد الكيميائية" : "Produits chimiques"
								},
								{
									value: "Textiles",
									label: "Textiles"
								},
								{
									value: "Hardware",
									label: "Quincaillerie"
								}
							]} />
</div>
</div>
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection items={sortedMaterials} keyExtractor={(m) => m.id} defaultViewMode={viewMode} columns={columns} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key) => {
								if (sortBy === key) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
								else {
									setSortBy(key);
									setSortDir("asc");
								}
							}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(m) => pinnedIds.has(m.id)} onTogglePin={(m) => {
								setPinnedIds((prev) => {
									const next = new Set(prev);
									if (next.has(m.id)) next.delete(m.id);
									else next.add(m.id);
									return next;
								});
							}} onItemClick={(m) => setSelectedMaterial(m)} onEdit={handleOpenEdit} renderCard={(m) => /* @__PURE__ */ <div className="flex flex-col items-center justify-center w-full">
<div className="w-16 h-16 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-xl font-bold mb-3 border border-[#F5E2D8]"><Boxes size={28} /></div>
<h3 className="text-sm font-bold text-black dark:text-white text-center truncate max-w-[200px]">{m.name}</h3>
<span className="text-[11px] font-mono text-[#d4522f] font-bold mt-0.5">{m.sku}</span>
<div className="w-full pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs flex justify-between">
<span className="text-black/55 dark:text-white/55">Stock :</span>
<span className="font-mono font-bold text-black dark:text-white">
{m.currentStock}
{" "}
{m.unit}
</span>
</div>
</div>} emptyTitle={isAr ? "لا توجد مواد مطابقة" : "Aucune matière trouvée"} emptyDescription={isAr ? "أضف أول مادة أولية للمخزن" : "Enregistrez votre première matière première"} primaryActionLabel={isAr ? "مادة جديدة" : "Nouvelle Matière"} onAddFirstItem={handleOpenAdd} />
</div>
{selectedMaterial && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[650px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-800/60 flex items-center justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#d4522f] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]"><Boxes size={20} /></div>
<div className="min-w-0">
<h3 className="font-bold text-sm text-black dark:text-white truncate">{selectedMaterial.name}</h3>
<div className="text-xs text-black/55 dark:text-white/55 font-mono truncate">
{selectedMaterial.sku}
{" • "}
{selectedMaterial.category}
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedMaterial(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"><X size={16} /></button>
</div>
<div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider block">Données d'Emplacement & Seuil</span>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Emplacement Rack :</span>
<span className="font-semibold text-black dark:text-white">{selectedMaterial.warehouseLocation || "Allée A-01"}</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Stock Physique Total :</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedMaterial.currentStock}
{" "}
{selectedMaterial.unit}
</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Stock Réservé (OFs) :</span>
<span className="font-mono text-amber-600 font-bold">
{selectedMaterial.allocatedStock}
{" "}
{selectedMaterial.unit}
</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Stock Net Disponible :</span>
<span className="font-mono text-emerald-600 font-bold">
{selectedMaterial.availableStock}
{" "}
{selectedMaterial.unit}
</span>
</div>
<div className="flex justify-between py-1">
<span className="text-black/55 dark:text-white/55">Seuil Réappro :</span>
<span className="font-mono font-semibold text-black/70 dark:text-white/75">
{selectedMaterial.reorderThreshold}
{" "}
{selectedMaterial.unit}
</span>
</div>
</div>
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider block">Valorisation Comptable PMP</span>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Coût Unitaire PMP :</span>
<span className="font-mono font-bold text-[#d4522f]">
{formatMoney(selectedMaterial.unitCostPmpDzd)}
{" / "}
{selectedMaterial.unit}
</span>
</div>
<div className="flex justify-between py-1 font-bold text-sm">
<span className="text-black dark:text-white">Valeur Totale :</span>
<span className="font-mono text-black dark:text-white">{formatMoney(selectedMaterial.currentStock * selectedMaterial.unitCostPmpDzd)}</span>
</div>
</div>
<div className="pt-2 flex gap-2">
<button type="button" onClick={() => handleOpenEdit(selectedMaterial)} className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white text-xs font-bold transition-colors cursor-pointer">Modifier Fiche</button>
<button type="button" onClick={() => {
											setVoucherMaterialId(selectedMaterial.id);
											setIsVoucherModalOpen(true);
										}} className="flex-1 py-2 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer">Émettre Bon BSM</button>
</div>
</div>
</div>}
</div>
</div> : /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div>
<h2 className="text-sm font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isAr ? "سجل السندات الرسمية (المرسوم التنفيذي 05-468)" : "Registre Officiel des Bons de Mouvement (Décret 05-468)"}
</h2>
</div>
<AtriumButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsVoucherModalOpen(true)}>{isAr ? "إصدار سند جديد" : "Nouveau Bon"}</AtriumButton>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
{vouchers.map((v) => /* @__PURE__ */ <div key={v.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between">
<span className="font-mono text-xs font-bold text-[#d4522f]">{v.voucherNumber}</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.voucherType === "BonDeSortie" ? "bg-amber-100 text-amber-800" : v.voucherType === "BonDeReception" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
{v.voucherType === "BonDeSortie" ? "BSM (Sortie)" : v.voucherType === "BonDeReception" ? "BR (Réception)" : "BT (Transfert)"}
</span>
</div>
<div className="space-y-1">
<div className="text-xs font-bold text-black dark:text-white">{v.items[0]?.materialName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{"Quantité : "}
{v.items[0]?.quantity}
{" "}
{v.items[0]?.unit}
{" • "}
{formatMoney(v.totalValueDzd)}
</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{"Bénéficiaire : "}
{v.recipientStaffName}
</div>
</div>
<div className="pt-2 border-t border-[#E6DED6] dark:border-neutral-700 flex items-center justify-between text-xs">
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{v.transferDate?.split("T")[0]}</span>
<button type="button" onClick={() => setPrintableVoucher(v)} className="text-[#d4522f] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer">
<Printer size={12} />
<span>{isAr ? "معاينة وطباعة" : "Imprimer"}</span>
</button>
</div>
</div>)}
</div>
</div>}
{isMaterialModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 animate-in zoom-in-95 duration-150">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<h3 className="font-bold text-base text-black dark:text-white">
{materialToEdit ? isAr ? "تعديل المادة الأولية" : "Modifier la Matière Première" : isAr ? "إضافة مادة أولية جديدة" : "Nouvelle Référence Matière"}
</h3>
<button onClick={() => setIsMaterialModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer">✕</button>
</div>
<form onSubmit={handleSaveMaterial} className="space-y-4">
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Code SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
<LabelSelect label={isAr ? "الصنف الصناعي" : "Catégorie"} value={category} onChange={(v) => setCategory(v)} options={[
										{
											value: "Wood",
											label: "Bois & Dérivés"
										},
										{
											value: "Metals",
											label: "Métallurgie & Aciers"
										},
										{
											value: "Plastics",
											label: "Polymères & Plastiques"
										},
										{
											value: "Chemicals",
											label: "Chimie, Peintures & Résines"
										},
										{
											value: "Textiles",
											label: "Textiles & Confection"
										},
										{
											value: "Hardware",
											label: "Quincaillerie & Visserie"
										}
									]} />
</div>
<LabelInput label={isAr ? "اسم المادة والمواصفات" : "Désignation de la matière"} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bois Chêne Brut Séché 50mm..." required />
<div className="grid grid-cols-3 gap-3">
<LabelInput label={isAr ? "الكمية" : "Stock Initial"} type="number" step="any" value={stock} onChange={(e) => setStock(e.target.value)} required />
<LabelInput label={isAr ? "الوحدة" : "Unité"} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, m³, Pièce..." required />
<LabelInput label={isAr ? "عتبة التنبيه" : "Seuil Mini"} type="number" step="any" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} required />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "سعر الوحدة PMP (دج)" : "Coût Unitaire PMP (DZD)"} type="number" value={unitCostDzd} onChange={(e) => setUnitCostDzd(e.target.value)} required />
<LabelInput label={isAr ? "موقع التخزين (الرف/الممر)" : "Emplacement Casier"} value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="Ex: Rack A-02..." required />
</div>
<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="secondary" onClick={() => setIsMaterialModalOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton type="submit" variant="primary">{isAr ? "حفظ المادة" : "Enregistrer"}</AtriumButton>
</div>
</form>
</div>
</div>}
{isVoucherModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 animate-in zoom-in-95 duration-150">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<h3 className="font-bold text-base text-black dark:text-white">
{isAr ? "إصدار سند حركة مخزون (مرسوم 05-468)" : "Émission d'un Bon de Mouvement (Décret 05-468)"}
</h3>
<button onClick={() => setIsVoucherModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer">✕</button>
</div>
<form onSubmit={handleCreateVoucher} className="space-y-4">
<LabelSelect label={isAr ? "نوع السند" : "Type de Bon"} value={voucherType} onChange={(v) => setVoucherType(v)} options={[
									{
										value: "BonDeSortie",
										label: "Bon de Sortie Magasin (BSM) vers Atelier"
									},
									{
										value: "BonDeReception",
										label: "Bon de Réception Fournisseur (BR) avec calcul PMP"
									},
									{
										value: "BonDeTransfert",
										label: "Bon de Transfert Inter-Dépôts (BT)"
									}
								]} />
<LabelSelect label={isAr ? "المادة الأولية المعنية" : "Matière Première"} value={voucherMaterialId} onChange={setVoucherMaterialId} options={materials.map((m) => ({
									value: m.id,
									label: `${m.name} (${m.sku} - Stock: ${m.currentStock} ${m.unit})`
								}))} />
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "الكمية المنقولة" : "Quantité du Bon"} type="number" step="any" value={voucherQty} onChange={(e) => setVoucherQty(e.target.value)} required />
<LabelInput label={isAr ? "المستلم / المشغل" : "Bénéficiaire / Demandeur"} value={voucherRecipient} onChange={(e) => setVoucherRecipient(e.target.value)} required />
</div>
<LabelInput label={isAr ? "سبب التحويل / رقم أمر التصنيع" : "Motif / N° Ordre de Fabrication lié"} value={voucherNotes} onChange={(e) => setVoucherNotes(e.target.value)} placeholder="Ex: Sortie pour OF-2026-0089..." />
<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="secondary" onClick={() => setIsVoucherModalOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton type="submit" variant="primary">{isAr ? "إصدار وطباعة السند" : "Valider & Imprimer le Bon"}</AtriumButton>
</div>
</form>
</div>
</div>}
{printableVoucher && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 animate-in zoom-in-95 duration-150">
<div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Printer size={20} /></div>
<div>
<h3 className="font-bold text-base text-black dark:text-white">{printableVoucher.voucherNumber}</h3>
<p className="text-xs text-black/55 dark:text-white/55">Document officiel d'inventaire • Décret exécutif N° 05-468</p>
</div>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors">
<Printer size={14} />
<span>{isAr ? "طباعة" : "Imprimer"}</span>
</button>
<button type="button" onClick={() => setPrintableVoucher(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"><X size={18} /></button>
</div>
</div>
<div className="p-6 rounded-2xl bg-white border-2 border-dashed border-neutral-300 text-black space-y-5 font-sans">
<div className="flex justify-between items-start border-b pb-4">
<div>
<div className="font-black text-sm tracking-tight text-black">ATRIUM MANUFACTURE & ATELIER PME</div>
<div className="text-[10px] text-black/55 font-medium">RC: 16/00-0988421 • NIF: 001916010044589 • Alger</div>
<div className="text-xs font-bold text-[#d4522f] mt-1 uppercase">
{printableVoucher.voucherType === "BonDeSortie" ? "Bon de Sortie Magasin (BSM)" : printableVoucher.voucherType === "BonDeReception" ? "Bon de Réception Magasin (BR)" : "Bon de Transfert Interne (BT)"}
</div>
</div>
<div className="text-right">
<div className="font-mono font-bold text-sm text-[#d4522f]">{printableVoucher.voucherNumber}</div>
<div className="text-[11px] text-black/55 mt-0.5">
{"Date : "}
{printableVoucher.transferDate?.split("T")[0]}
</div>
</div>
</div>
<div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs space-y-1">
<div className="flex justify-between">
<span className="text-black/55">Demandeur / Bénéficiaire :</span>
<span className="font-bold text-black">{printableVoucher.recipientStaffName}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55">Motif de transfert :</span>
<span className="font-semibold text-black">{printableVoucher.notes || "Ordre de fabrication"}</span>
</div>
</div>
<table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
<thead className="bg-neutral-100 text-black/75 font-semibold border-b border-neutral-200">
<tr>
<th className="p-2 text-left">Désignation Matière</th>
<th className="p-2 text-center w-24">Quantité</th>
<th className="p-2 text-right w-28">Prix PMP</th>
<th className="p-2 text-right w-28">Total DZD</th>
</tr>
</thead>
<tbody className="divide-y divide-neutral-200">
{printableVoucher.items.map((item: any, idx: number) => /* @__PURE__ */ <tr key={idx}>
<td className="p-2 font-medium">{item.materialName}</td>
<td className="p-2 text-center font-mono font-bold">
{item.quantity}
{" "}
{item.unit}
</td>
<td className="p-2 text-right font-mono">{formatMoney(item.unitCostDzd)}</td>
<td className="p-2 text-right font-mono font-bold">{formatMoney(item.quantity * item.unitCostDzd)}</td>
</tr>)}
</tbody>
</table>
<div className="flex justify-end pt-2 text-xs font-bold text-black">
<span>{"Total Mouvement : "}</span>
<span className="font-mono text-[#d4522f]">{formatMoney(printableVoucher.totalValueDzd)}</span>
</div>
<div className="grid grid-cols-2 gap-4 pt-6 border-t text-center text-xs">
<div>
<span className="text-black/55 text-[10px] block">Visa Magasinier (Émetteur)</span>
<div className="h-10 flex items-center justify-center font-serif text-black/75 italic">M. Amine T.</div>
</div>
<div>
<span className="text-black/55 text-[10px] block">Visa Réceptionnaire (Atelier)</span>
<div className="h-10 flex items-center justify-center font-serif text-black/75 italic">M. Karim B.</div>
</div>
</div>
</div>
</div>
</div>}
</div>;
};
