import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Building2,
  Home,
  ChevronDown,
  Sparkles,
  Layers,
  TrendingUp,
  Percent,
  Download,
  Maximize2,
  Package,
  Boxes,
  Check,
  X,
  PackagePlus,
  ArrowUpRight,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type CatalogTab = 'products' | 'services';



export const TradingCatalogView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { products, addProduct, updateProduct, deleteProduct, currentBranch, branches, switchBranch, resetTradingMockData, showToast, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [activeTab, setActiveTab] = React.useState("products");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [modalOpen, setModalOpen] = React.useState(false);
	const [editingProduct, setEditingProduct] = React.useState<any>(null);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set());
	const [sortBy, setSortBy] = React.useState("name");
	const [sortDir, setSortDir] = React.useState("asc");
	const [drawerTab, setDrawerTab] = React.useState("fiche");
	const [productNotes, setProductNotes] = React.useState("");
	const [isSavingNotes, setIsSavingNotes] = React.useState(false);
	const [notesSavedNotice, setNotesSavedNotice] = React.useState(false);
	const activeProduct = React.useMemo(() => {
		if (!selectedProduct) return null;
		return products.find((p) => p.id === selectedProduct.id) || selectedProduct;
	}, [selectedProduct, products]);
	React.useEffect(() => {
		if (activeProduct) setProductNotes(activeProduct.description || "");
	}, [activeProduct?.id]);
	const handleNotesChange = (val: any) => {
		setProductNotes(val);
		if (!activeProduct) return;
		setIsSavingNotes(true);
		updateProduct(activeProduct.id, { description: val });
		setTimeout(() => {
			setIsSavingNotes(false);
			setNotesSavedNotice(true);
			setTimeout(() => setNotesSavedNotice(false), 2e3);
		}, 400);
	};
	const handleReplenishStock = (prod: any, delta = 10) => {
		const nextStock = (prod.stockQuantity || 0) + delta;
		updateProduct(prod.id, { stockQuantity: nextStock });
		showToast?.({
			type: "success",
			title: "Stock Réapprovisionné",
			message: `+${delta} ${prod.unit || "u"} ajoutés à ${prod.name} (Nouveau stock: ${nextStock})`
		});
	};
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [priceAmount, setPriceAmount] = React.useState(1e3);
	const [costAmount, setCostAmount] = React.useState(700);
	const [sku, setSku] = React.useState("");
	const [unit, setUnit] = React.useState("u");
	const [taxRate, setTaxRate] = React.useState(19);
	const [category, setCategory] = React.useState("Matériaux BTP");
	const [reorderLevel, setReorderLevel] = React.useState(10);
	const [stockQuantity, setStockQuantity] = React.useState(50);
	const filteredItems = React.useMemo(() => {
		return products.filter((p) => {
			const isSrv = p.category?.toLowerCase().includes("service") || p.category?.toLowerCase().includes("prestation") || p.unit === "forfait";
			if (activeTab === "services" && !isSrv) return false;
			if (activeTab === "products" && isSrv) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = p.name.toLowerCase().includes(q);
				const matchesSku = (p.sku || "").toLowerCase().includes(q);
				const matchesCat = (p.category || "").toLowerCase().includes(q);
				if (!matchesName && !matchesSku && !matchesCat) return false;
			}
			return true;
		});
	}, [
		products,
		activeTab,
		searchQuery
	]);
	const sortedItems = React.useMemo(() => {
		return [...filteredItems].sort((a, b) => {
			const aPinned = pinnedIds.has(a.id);
			const bPinned = pinnedIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (sortBy === "name") {
				const cmp = a.name.localeCompare(b.name);
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "sku") {
				const cmp = (a.sku || "").localeCompare(b.sku || "");
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "price") {
				const aP = a.price?.amount || 0;
				const bP = b.price?.amount || 0;
				return sortDir === "asc" ? aP - bP : bP - aP;
			}
			if (sortBy === "stock") {
				const aS = a.stockQuantity || 0;
				const bS = b.stockQuantity || 0;
				return sortDir === "asc" ? aS - bS : bS - aS;
			}
			return 0;
		});
	}, [
		filteredItems,
		pinnedIds,
		sortBy,
		sortDir
	]);
	const handleExportCSV = () => {
		const headers = [
			"SKU",
			"Désignation",
			"Catégorie",
			"Type",
			"Unité",
			"TVA %",
			"Prix Vente HT",
			"Coût Achat HT",
			"Stock Réel",
			"Seuil Alerte"
		];
		const rows = filteredItems.map((p) => [
			`"${p.sku || ""}"`,
			`"${p.name}"`,
			`"${p.category || ""}"`,
			`"${p.unit === "forfait" ? "Service" : "Produit"}"`,
			`"${p.unit || "u"}"`,
			`"${p.taxRate ?? 19}"`,
			`"${p.price?.amount || 0}"`,
			`"${p.cost?.amount || p.costPrice || 0}"`,
			`"${p.stockQuantity ?? ""}"`,
			`"${p.reorderLevel ?? ""}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `atrium-trading-catalog-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const stats = React.useMemo(() => {
		const physicalProducts = products.filter((p) => !p.category?.toLowerCase().includes("service") && !p.category?.toLowerCase().includes("prestation") && p.unit !== "forfait");
		const services = products.filter((p) => p.category?.toLowerCase().includes("service") || p.category?.toLowerCase().includes("prestation") || p.unit === "forfait");
		const totalValuation = physicalProducts.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0), 0);
		const totalSalesPotential = physicalProducts.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.price?.amount || 0), 0);
		const avgMargin = totalSalesPotential > 0 ? Math.round((totalSalesPotential - totalValuation) / totalSalesPotential * 100) : 32;
		return {
			productsCount: physicalProducts.length,
			servicesCount: services.length,
			totalValuation,
			totalSalesPotential,
			avgMargin
		};
	}, [products]);
	const handleOpenAdd = () => {
		setEditingProduct(null);
		setName("");
		setDescription("");
		setPriceAmount(1e3);
		setCostAmount(700);
		setSku("");
		setUnit(activeTab === "services" ? "forfait" : "u");
		setTaxRate(activeTab === "services" ? 9 : 19);
		setCategory(activeTab === "services" ? "Prestations & Services" : "Matériaux BTP");
		setReorderLevel(10);
		setStockQuantity(50);
		setModalOpen(true);
	};
	const handleEdit = (p: any) => {
		setEditingProduct(p);
		setName(p.name);
		setDescription(p.description || "");
		setPriceAmount(p.price?.amount || 0);
		setCostAmount(p.cost?.amount || p.costPrice || 0);
		setSku(p.sku || "");
		setUnit(p.unit || "u");
		setTaxRate(p.taxRate ?? 19);
		setCategory(p.category || "Général");
		setReorderLevel(p.reorderLevel || 10);
		setStockQuantity(p.stockQuantity || 0);
		setModalOpen(true);
	};
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (!name.trim()) return;
		if (editingProduct) updateProduct(editingProduct.id, {
			name: name.trim(),
			description: description.trim(),
			price: {
				amount: priceAmount,
				currency: "DZD"
			},
			cost: {
				amount: costAmount,
				currency: "DZD"
			},
			sku: sku.trim() || void 0,
			unit,
			taxRate,
			category,
			reorderLevel,
			stockQuantity: activeTab === "services" ? 999 : stockQuantity
		});
		else addProduct({
			name: name.trim(),
			description: description.trim(),
			price: {
				amount: priceAmount,
				currency: "DZD"
			},
			cost: {
				amount: costAmount,
				currency: "DZD"
			},
			sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
			unit,
			taxRate,
			category,
			reorderLevel,
			stockQuantity: activeTab === "services" ? 999 : stockQuantity,
			isActive: true,
			isPinned: false
		});
		setModalOpen(false);
	};
	const columns = [
		{
			key: "sku",
			header: "Réf. SKU",
			width: "120px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">{p.sku || "N/A"}</span>
		},
		{
			key: "name",
			header: "Désignation",
			minWidth: "220px",
			renderCell: (p: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-black dark:text-white block">{p.name}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{p.category}</span>
</div>
		},
		{
			key: "unit",
			header: "Unité",
			width: "70px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="text-xs font-mono text-black/55 dark:text-white/55">{p.unit || "u"}</span>
		},
		{
			key: "tva",
			header: "TVA %",
			width: "70px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="text-xs font-mono text-black/70 dark:text-white/75">
{p.taxRate ?? 19}
%
</span>
		},
		{
			key: "price",
			header: "Prix Vente HT",
			width: "130px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">{formatMoney(p.price?.amount || 0)}</span>
		},
		{
			key: "cost",
			header: "Coût d'Achat HT",
			width: "120px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="font-mono text-xs text-black/55 dark:text-white/55 tabular-nums">{formatMoney(p.cost?.amount || p.costPrice || 0)}</span>
		},
		...activeTab === "products" ? [{
			key: "stock",
			header: "Stock Réel",
			width: "100px",
			renderCell: (p: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs tabular-nums text-black dark:text-white">{p.stockQuantity || 0}</span>
		}] : [],
		{
			key: "actions",
			header: "",
			width: "80px",
			renderCell: (p: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1">
<button onClick={() => handleEdit(p)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white rounded-lg"><Edit size={14} /></button>
<button onClick={() => deleteProduct(p.id)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg"><Trash2 size={14} /></button>
</div>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: products.length > 0
	});
	if (showSkeleton && (products.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? "rtl" : "ltr"}>
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><ShoppingBag size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{t("trading_catalog_title", "Catalogue")}</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">
{products.length}
{" "}
{language === "ar" ? "عنصر" : "références"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="primary" size="sm" onClick={handleOpenAdd} icon={<Plus size={15} />}>
{activeTab === "products" ? language === "ar" ? "مادة جديدة" : "Nouvel Article" : language === "ar" ? "خدمة جديدة" : "Nouvelle Prestation"}
</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">{language === "ar" ? "مواد وسلع المخزن" : "Articles & Matériaux"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{stats.productsCount}
{" références"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{stats.productsCount}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
<Tag size={13} className="text-[#d4522f]" />
<span>
{"Prix de vente HT moyen: "}
<strong>{formatMoney(1850)}</strong>
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">{language === "ar" ? "الخدمات والاستشارات" : "Prestations & Services"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
{stats.servicesCount}
{" forfaits"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{stats.servicesCount}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
<Percent size={13} className="text-emerald-500" />
<span>
{"Marge commerciale brute: "}
<strong className="text-black dark:text-white">
{stats.avgMargin}
%
</strong>
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">
{language === "ar" ? "القيمة الإجمالية للكتالوج المخزني" : "Valorisation Globale du Stock"}
</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">Coût d'Achat</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(stats.totalValuation)}</div>
<div className="flex items-center justify-between text-[11px] text-white/75 mt-0.5">
<span className="flex items-center gap-1">
<TrendingUp size={12} className="text-[#FB923C]" />
<span>
{"Potentiel Vente HT: "}
{formatMoney(stats.totalSalesPotential)}
</span>
</span>
<span className="font-mono text-white/80">DZD</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><ShoppingBag size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-black dark:text-white">
{activeTab === "products" ? t("trading_catalog_articles_title", "Articles de Négoce") : t("trading_catalog_services_title", "Prestations & Forfaits")}
</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
<div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl overflow-x-auto self-start">
<button type="button" onClick={() => setActiveTab("products")} title={`${t("trading_catalog_tab_products", "Articles & Matériaux de Stock")} (${stats.productsCount})`} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "products" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "منتجات" : language === "fr" ? "Produits" : "Products"}</button>
<button type="button" onClick={() => setActiveTab("services")} title={`${t("trading_catalog_tab_services", "Prestations & Services Immatériels")} (${stats.servicesCount})`} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === "services" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "خدمات" : language === "fr" ? "Services" : "Services"}</button>
</div>
<div className="self-end sm:self-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث بالاسم، الرمز، الفئة..." : "Filtrer nom, SKU, catégorie..."} shutSize={36} openWidth={240} />
</div>
<button type="button" onClick={handleExportCSV} className="h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
<Download size={13} />
<span>Exporter</span>
</button>
<button type="button" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs" title="Plein écran"><Maximize2 size={14} /></button>
</div>
</div>
{selectedIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
<div className="flex items-center gap-3">
<span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
<span className="text-xs font-bold text-black dark:text-white">
{selectedIds.size}
{" articles sélectionnés"}
</span>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => setSelectedIds(/* @__PURE__ */ new Set())} className="px-3 py-1 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer">Désélectionner</button>
<button type="button" onClick={() => {
										if (window.confirm(`Supprimer ${selectedIds.size} articles ?`)) {
											selectedIds.forEach((id) => deleteProduct(id));
											setSelectedIds(/* @__PURE__ */ new Set());
										}
									}} className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs">
<Trash2 size={13} />
<span>Supprimer</span>
</button>
</div>
</div>}
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection items={sortedItems} keyExtractor={(p) => p.id} defaultViewMode="list" columns={columns} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key) => {
										if (sortBy === key) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
										else {
											setSortBy(key);
											setSortDir("asc");
										}
									}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(p) => pinnedIds.has(p.id)} onTogglePin={(p) => {
										setPinnedIds((prev) => {
											const next = new Set(prev);
											if (next.has(p.id)) next.delete(p.id);
											else next.add(p.id);
											return next;
										});
									}} onItemClick={(p) => setSelectedProduct(p)} onViewDetails={(p) => setSelectedProduct(p)} onEdit={(p) => handleEdit(p)} onDelete={(p) => {
										if (window.confirm(`Supprimer ${p.name} ?`)) {
											deleteProduct(p.id);
											if (selectedProduct?.id === p.id) setSelectedProduct(null);
										}
									}} customActions={(p) => p.unit !== "forfait" ? [{
										id: "replenish",
										label: "+10 Stock",
										icon: /* @__PURE__ */ <PackagePlus size={13} />,
										variant: "primary",
										onClick: () => handleReplenishStock(p, 10)
									}] : []} renderCard={(p) => {
										const marginPercent = (p.price?.amount || 0) > 0 ? Math.round(((p.price?.amount || 0) - (p.cost?.amount || p.costPrice || 0)) / (p.price?.amount || 1) * 100) : 0;
										const isLowStock = (p.stockQuantity || 0) <= (p.reorderLevel || 10);
										return /* @__PURE__ */ <div className="flex flex-col justify-between w-full h-full">
<div>
<div className="flex items-center justify-between mb-2.5">
<span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white">{p.sku || "N/A"}</span>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d4522f]/10 text-[#d4522f]">{p.category || "Général"}</span>
</div>
<h3 className="font-bold text-sm text-black dark:text-white line-clamp-1 mb-1">{p.name}</h3>
<p className="text-xs text-black/55 dark:text-white/55 line-clamp-2 min-h-[32px]">{p.description || "Article standard de négoce et distribution Atrium."}</p>
<div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Prix Vente HT :</span>
<span className="font-mono font-bold text-[#d4522f] text-sm tabular-nums">{formatMoney(p.price?.amount || 0)}</span>
</div>
<div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
<span>Coût d'Achat :</span>
<span className="font-mono tabular-nums">{formatMoney(p.cost?.amount || p.costPrice || 0)}</span>
</div>
<div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Marge Brute :</span>
<span className={`font-semibold font-mono ${marginPercent >= 25 ? "text-emerald-600" : "text-amber-600"}`}>
{marginPercent}
%
</span>
</div>
</div>
</div>
<div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
{p.unit !== "forfait" ? /* @__PURE__ */ <>
<div className="flex items-center gap-1.5">
<span className={`w-2 h-2 rounded-full ${(p.stockQuantity || 0) === 0 ? "bg-rose-500" : isLowStock ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
<span className="font-mono font-semibold text-black/70 dark:text-white/75">
{p.stockQuantity || 0}
{" "}
{p.unit || "u"}
{" en stock"}
</span>
</div>
<button type="button" onClick={(e) => {
														e.stopPropagation();
														handleReplenishStock(p, 10);
													}} className="px-2.5 py-1 rounded-lg bg-[#d4522f]/10 hover:bg-[#d4522f]/20 text-[#d4522f] text-[11px] font-bold transition-colors cursor-pointer">+10 Stock</button>
</> : /* @__PURE__ */ <div className="flex items-center gap-1.5 text-black/55 dark:text-white/55">
<Sparkles size={13} className="text-[#d4522f]" />
<span>Prestation au Forfait</span>
</div>}
</div>
</div>;
									}} emptyTitle="Aucun article trouvé" />
</div>
{activeProduct && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
<div className="flex items-start justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-12 h-12 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-lg font-bold shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs"><ShoppingBag size={22} /></div>
<div className="min-w-0">
<h3 className="font-bold text-black dark:text-white truncate text-base">{activeProduct.name}</h3>
<div className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
<span className="font-mono font-semibold">{activeProduct.sku || "SANS SKU"}</span>
<span>·</span>
<span>{activeProduct.category || "Général"}</span>
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedProduct(null)} className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={16} /></button>
</div>
<div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
{activeProduct.unit !== "forfait" && /* @__PURE__ */ <button type="button" onClick={() => handleReplenishStock(activeProduct, 10)} className="flex-1 py-1.5 px-3 rounded-xl bg-[#d4522f] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
<PackagePlus size={13} />
<span>+10 Stock</span>
</button>}
<button type="button" onClick={() => handleEdit(activeProduct)} className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold flex items-center gap-1 transition-colors">
<Edit size={13} />
<span>Modifier</span>
</button>
<button type="button" onClick={() => {
													if (window.confirm(`Supprimer ${activeProduct.name} ?`)) {
														deleteProduct(activeProduct.id);
														setSelectedProduct(null);
													}
												}} className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-black/55 dark:text-white/55 hover:text-rose-600 transition-colors"><Trash2 size={13} /></button>
</div>
<div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl text-xs font-semibold">
<button type="button" onClick={() => setDrawerTab("fiche")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "fiche" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Fiche</button>
<button type="button" onClick={() => setDrawerTab("stock")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "stock" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Stock</button>
<button type="button" onClick={() => setDrawerTab("marge")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "marge" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Marge</button>
<button type="button" onClick={() => setDrawerTab("notes")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "notes" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Notes</button>
</div>
{drawerTab === "fiche" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Référence SKU :</span>
<span className="font-mono font-bold text-black dark:text-white">{activeProduct.sku || "SANS SKU"}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Catégorie :</span>
<span className="font-semibold text-black dark:text-white">{activeProduct.category || "Général"}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Unité de vente :</span>
<span className="font-mono text-black/70 dark:text-white/75">{activeProduct.unit || "u"}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Taux de TVA :</span>
<span className="font-mono font-bold text-emerald-600">
{activeProduct.taxRate ?? 19}
%
</span>
</div>
</div>
</div>}
{drawerTab === "stock" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
{activeProduct.unit === "forfait" ? /* @__PURE__ */ <div className="p-4 text-center text-black/55 dark:text-white/55 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">Cet article est un service/forfait immatériel. Aucun stock physique géré.</div> : /* @__PURE__ */ <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Stock Réel Disponible :</span>
<span className="font-mono font-bold text-base text-black dark:text-white">
{activeProduct.stockQuantity || 0}
{" "}
{activeProduct.unit || "u"}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Seuil Réapprovisionnement :</span>
<span className="font-mono text-black dark:text-white">
{activeProduct.reorderLevel || 10}
{" "}
{activeProduct.unit || "u"}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Valorisation Stock HT :</span>
<span className="font-mono font-bold text-[#d4522f]">
{formatMoney((activeProduct.stockQuantity || 0) * (activeProduct.cost?.amount || activeProduct.costPrice || 0))}
</span>
</div>
<div className="pt-2">
<button type="button" onClick={() => handleReplenishStock(activeProduct, 10)} className="w-full py-2 rounded-xl bg-[#d4522f] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
<PackagePlus size={14} />
<span>
{"Ajouter +10 "}
{activeProduct.unit || "u"}
{" au stock"}
</span>
</button>
</div>
</div>}
</div>}
{drawerTab === "marge" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Prix de Vente HT :</span>
<span className="font-mono font-bold text-base text-black dark:text-white">{formatMoney(activeProduct.price?.amount || 0)}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Coût d'Achat HT :</span>
<span className="font-mono text-black dark:text-white">{formatMoney(activeProduct.cost?.amount || activeProduct.costPrice || 0)}</span>
</div>
<div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
<span className="text-black/55 dark:text-white/55">Marge Brute Unitaire :</span>
<span className="font-mono font-bold text-emerald-600">
{formatMoney((activeProduct.price?.amount || 0) - (activeProduct.cost?.amount || activeProduct.costPrice || 0))}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Taux de Marque :</span>
<span className="font-mono font-bold text-emerald-600">
{(activeProduct.price?.amount || 0) > 0 ? Math.round(((activeProduct.price?.amount || 0) - (activeProduct.cost?.amount || activeProduct.costPrice || 0)) / (activeProduct.price?.amount || 1) * 100) : 0}
%
</span>
</div>
</div>
</div>}
{drawerTab === "notes" && /* @__PURE__ */ <div className="space-y-2 text-xs animate-in fade-in duration-150">
<div className="flex items-center justify-between">
<label className="text-black/55 dark:text-white/55 font-medium">Spécifications & Consignes :</label>
{isSavingNotes ? /* @__PURE__ */ <span className="text-[10px] text-black/55 dark:text-white/55 animate-pulse">Sauvegarde...</span> : notesSavedNotice ? /* @__PURE__ */ <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
<Check size={11} />
{" Sauvegardé"}
</span> : null}
</div>
<textarea rows={6} value={productNotes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Spécifications techniques, fiches de sécurité, fournisseur de référence, conditionnement..." className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>}
</div>}
</div>
</div>
{modalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{editingProduct ? "Modifier l'Article" : "Ajouter au Catalogue"}</h2>
<form onSubmit={handleSubmit} className="space-y-3 text-xs">
<LabelInput label="Désignation Commerciale *" placeholder="Ex: Ciment Portland CPJ-42.5" value={name} onChange={(e) => setName(e.target.value)} required />
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Référence / SKU" placeholder="Ex: MAT-CIM-50" value={sku} onChange={(e) => setSku(e.target.value)} />
<LabelSelect label="Unité de Mesure" value={unit} onChange={(val) => setUnit(typeof val === "string" ? val : val?.target?.value || val)} options={[
											{
												value: "u",
												label: "u (Unité)"
											},
											{
												value: "pcs",
												label: "pcs (Pièces)"
											},
											{
												value: "sac",
												label: "sac (Sac)"
											},
											{
												value: "barre",
												label: "barre (Barre)"
											},
											{
												value: "fut",
												label: "fût (Fût)"
											},
											{
												value: "tonne",
												label: "tonne (Tonne)"
											},
											{
												value: "m",
												label: "m (Mètre)"
											},
											{
												value: "m²",
												label: "m² (Mètre carré)"
											},
											{
												value: "pack",
												label: "pack (Couronne/Lot)"
											},
											{
												value: "forfait",
												label: "forfait (Prestation)"
											}
										]} />
</div>
<div className="grid grid-cols-3 gap-3">
<LabelInput type="number" label="Prix Vente HT (DA) *" value={priceAmount} step={10} onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)} required />
<LabelInput type="number" label="Coût d'Achat HT" value={costAmount} step={10} onChange={(e) => setCostAmount(parseFloat(e.target.value) || 0)} />
<LabelSelect label="Taux TVA" value={taxRate} onChange={(val) => setTaxRate(Number(typeof val === "object" && val?.target ? val.target.value : val))} options={[
												{
													value: 19,
													label: "19% (Standard)"
												},
												{
													value: 9,
													label: "9% (Réduit)"
												},
												{
													value: 0,
													label: "0% (Exonéré)"
												}
											]} />
</div>
<div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
<AtriumButton type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Annuler</AtriumButton>
<AtriumButton type="submit" variant="primary" size="sm">Enregistrer</AtriumButton>
</div>
</form>
</div>
</div>}
</div>
</div>;
};
