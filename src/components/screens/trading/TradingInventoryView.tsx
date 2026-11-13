import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
  Search,
  Filter,
  Home,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Clock,
  Warehouse,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovementVoucher, WarehouseDepot, Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StockMovementModal } from './StockMovementModal';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type ViewMode = 'stock_state' | 'vouchers';



export const TradingInventoryView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { products, warehouses, stockVouchers, createWarehouseDepot, currentBranch, branches, switchBranch, resetTradingMockData, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const [selectedDepotId, setSelectedDepotId] = React.useState("all");
	const [viewMode, setViewMode] = React.useState("stock_state");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [movementModalOpen, setMovementModalOpen] = React.useState(false);
	const [newDepotModalOpen, setNewDepotModalOpen] = React.useState(false);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [depotCode, setDepotCode] = React.useState("");
	const [depotName, setDepotName] = React.useState("");
	const [depotAddress, setDepotAddress] = React.useState("");
	const [depotCity, setDepotCity] = React.useState("Alger");
	const metrics = React.useMemo(() => {
		return {
			totalValuation: products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0), 0),
			lowStockCount: products.filter((p) => (p.stockQuantity || 0) <= (p.reorderLevel || 10)).length,
			totalUnits: products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
			depotsCount: warehouses.length,
			vouchersCount: stockVouchers.length
		};
	}, [
		products,
		warehouses,
		stockVouchers
	]);
	const filteredProducts = React.useMemo(() => {
		return products.filter((p) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = p.name.toLowerCase().includes(q);
				const matchesSku = (p.sku || "").toLowerCase().includes(q);
				const matchesCat = (p.category || "").toLowerCase().includes(q);
				if (!matchesName && !matchesSku && !matchesCat) return false;
			}
			return true;
		});
	}, [products, searchQuery]);
	const filteredVouchers = React.useMemo(() => {
		return stockVouchers.filter((v) => {
			if (selectedDepotId !== "all") {
				if (v.depotSourceId !== selectedDepotId && v.depotTargetId !== selectedDepotId) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesNum = v.voucherNumber.toLowerCase().includes(q);
				const matchesReason = v.reason.toLowerCase().includes(q);
				const matchesOp = (v.operatorName || "").toLowerCase().includes(q);
				if (!matchesNum && !matchesReason && !matchesOp) return false;
			}
			return true;
		});
	}, [
		stockVouchers,
		selectedDepotId,
		searchQuery
	]);
	const handleCreateDepot = (e: any) => {
		e.preventDefault();
		if (!depotCode || !depotName) return;
		createWarehouseDepot({
			businessId: "biz_trading",
			branchId: "branch_trading_main",
			tenantId: "acc_01",
			facilityId: "branch_trading_main",
			code: depotCode.trim().toUpperCase(),
			name: depotName.trim(),
			address: depotAddress.trim() || "Alger",
			city: depotCity.trim() || "Alger",
			isMain: false,
			totalSkusCount: 0,
			totalValuationDzd: 0
		});
		setDepotCode("");
		setDepotName("");
		setDepotAddress("");
		setNewDepotModalOpen(false);
	};
	const stockColumns = [
		{
			key: "sku",
			header: "Code SKU",
			width: "130px",
			renderCell: (prod: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">{prod.sku || "N/A"}</span>
		},
		{
			key: "name",
			header: "Désignation de l'Article",
			minWidth: "240px",
			renderCell: (prod: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-neutral-900 dark:text-neutral-100 block">{prod.name}</span>
<span className="text-[10px] text-neutral-400">
{prod.category}
{" "}
{prod.supplier ? `• Fournisseur: ${prod.supplier}` : ""}
</span>
</div>
		},
		{
			key: "stock",
			header: t("trading_inventory_col_qty_on_hand", "Stock Réel"),
			width: "120px",
			renderCell: (prod: any) => {
				const isLow = (prod.stockQuantity || 0) <= (prod.reorderLevel || 10);
				return /* @__PURE__ */ <div className="text-xs font-mono">
<span className={`font-bold tabular-nums ${isLow ? "text-rose-600 dark:text-rose-400" : "text-neutral-900 dark:text-neutral-100"}`}>
{prod.stockQuantity || 0}
{" "}
{prod.unit || "u"}
</span>
{isLow && /* @__PURE__ */ <span className="block text-[9px] text-rose-500 font-semibold uppercase">{t("trading_inventory_low_stock_warning", "Alerte Réappro")}</span>}
</div>;
			}
		},
		{
			key: "cost",
			header: t("trading_inventory_col_cost", "Coût PMP (HT)"),
			width: "120px",
			renderCell: (prod: any) => /* @__PURE__ */ <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">{formatMoney(prod.cost?.amount || prod.costPrice || 0)}</span>
		},
		{
			key: "price",
			header: t("trading_catalog_col_price", "Prix Vente HT"),
			width: "120px",
			renderCell: (prod: any) => /* @__PURE__ */ <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{formatMoney(prod.price?.amount || 0)}</span>
		},
		{
			key: "valuation",
			header: t("trading_inventory_col_total_val", "Valorisation Stock"),
			width: "150px",
			renderCell: (prod: any) => {
				const val = (prod.stockQuantity || 0) * (prod.cost?.amount || prod.costPrice || 0);
				return /* @__PURE__ */ <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums">{formatMoney(val)}</span>;
			}
		}
	];
	const voucherColumns = [
		{
			key: "voucherNumber",
			header: "N° Bon de Mouvement",
			width: "180px",
			renderCell: (v: any) => {
				const badgeColor = v.type === "entree" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : v.type === "sortie" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400" : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400";
				return /* @__PURE__ */ <div className="flex items-center gap-2 font-mono text-xs font-bold">
<span className={`px-2 py-0.5 rounded text-[10px] uppercase ${badgeColor}`}>{v.type === "entree" ? "BE" : v.type === "sortie" ? "BS" : "BT"}</span>
<span className="text-neutral-900 dark:text-neutral-100">{v.voucherNumber}</span>
</div>;
			}
		},
		{
			key: "date",
			header: "Date",
			width: "110px",
			renderCell: (v: any) => /* @__PURE__ */ <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{v.date}</span>
		},
		{
			key: "depots",
			header: "Trajet / Dépôts",
			minWidth: "220px",
			renderCell: (v: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-medium text-neutral-900 dark:text-neutral-100">{v.depotSourceName}</span>
{v.type === "transfert" && v.depotTargetName && /* @__PURE__ */ <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
{"→ "}
{v.depotTargetName}
</span>}
</div>
		},
		{
			key: "reason",
			header: "Motif",
			width: "160px",
			renderCell: (v: any) => /* @__PURE__ */ <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{v.reason.replace("_", " ")}</span>
		},
		{
			key: "valuation",
			header: "Valeur du Bon",
			width: "140px",
			renderCell: (v: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">{formatMoney(v.totalValuationDzd)}</span>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: products.length > 0 || warehouses.length > 0
	});
	if (showSkeleton && (products.length === 0 && warehouses.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Boxes size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("trading_inventory_title", "Dépôts Logistiques & Inventaire")}</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">
{warehouses.length}
{" "}
{language === "ar" ? "مستودعات" : "dépôts actifs"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="outline" size="sm" onClick={() => setNewDepotModalOpen(true)} icon={<Building2 size={14} className="text-[#d4522f]" />}>{t("trading_inventory_new_depot", "Nouveau Dépôt")}</AtriumButton>
<AtriumButton variant="primary" size="sm" onClick={() => setMovementModalOpen(true)} icon={<Plus size={15} />}>{t("trading_inventory_new_movement", "Nouveau Bon de Mouvement")}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{language === "ar" ? "المقالات والوحدات المخزنة" : "Références & Volume Réel"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{products.length}
{" SKUs"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
{metrics.totalUnits.toLocaleString()}
{" "}
<span className="text-xs text-neutral-400 font-normal">unités</span>
</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
{metrics.lowStockCount > 0 ? /* @__PURE__ */ <span className="text-rose-500 font-semibold flex items-center gap-1">
<AlertTriangle size={13} />
{metrics.lowStockCount}
{" référence(s) en rupture imminente"}
</span> : /* @__PURE__ */ <span className="text-emerald-500 font-medium flex items-center gap-1">
<ShieldCheck size={13} />
Niveaux de stocks nominaux
</span>}
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{language === "ar" ? "المستودعات وسندات النقل" : "Maillage & Mouvements"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
{metrics.depotsCount}
{" sites"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{metrics.vouchersCount}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
<Clock size={13} className="text-blue-500" />
<span>Bons d'entrée, sortie et transferts inter-dépôts</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">
{language === "ar" ? "إجمالي قيمة المخزون الحالية" : "Valorisation Totale du Stock"}
</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">Coût PMP (HT)</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">{formatMoney(metrics.totalValuation)}</div>
<div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
<span className="flex items-center gap-1">
<Warehouse size={12} className="text-[#FB923C]" />
<span>Actif circulant multi-dépôts</span>
</span>
<span className="font-mono text-stone-300">DZD</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between pb-2 border-b border-[#E6DED6] dark:border-neutral-800/60">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Warehouse size={16} /></div>
<div>
<span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">{t("trading_inventory_depots_hub", "Réseau des Dépôts & Hubs Logistiques")}</span>
<span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Filtrage actif du stock par entrepôt physique ou valorisation consolidée</span>
</div>
</div>
<span className="text-xs font-mono font-semibold text-neutral-500">
{warehouses.length}
{" "}
{t("trading_depots_active", "dépôts configurés")}
</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
<button type="button" onClick={() => setSelectedDepotId("all")} className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${selectedDepotId === "all" ? "border-[#d4522f] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#d4522f]/20" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300"}`}>
<div className="flex items-center justify-between mb-1">
<span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{t("trading_inventory_all_depots", "Tous les Dépôts")}</span>
<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">GLOBAL</span>
</div>
<div className="text-xs font-bold font-mono text-[#d4522f]">{formatMoney(metrics.totalValuation)}</div>
</button>
{warehouses.map((w) => /* @__PURE__ */ <button key={w.id} type="button" onClick={() => setSelectedDepotId(w.id)} className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${selectedDepotId === w.id ? "border-[#d4522f] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#d4522f]/20" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300"}`}>
<div className="flex items-center justify-between mb-1">
<span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{w.name}</span>
<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">{w.code}</span>
</div>
<div className="text-[11px] text-neutral-500 mb-0.5">{w.city}</div>
<div className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">{formatMoney(w.totalValuationDzd || 0)}</div>
</button>)}
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Boxes size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-neutral-900 dark:text-white">
{viewMode === "stock_state" ? t("trading_inventory_tab_state", "État des Stocks") : t("trading_inventory_tab_vouchers", "Bons de Mouvements")}
</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-[#d4522f]/10 text-[#d4522f] font-semibold font-mono">
{viewMode === "stock_state" ? filteredProducts.length : filteredVouchers.length}
</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
<div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
<button type="button" onClick={() => setViewMode("stock_state")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${viewMode === "stock_state" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"}`}>
<span>{t("trading_inventory_tab_state", "État des Stocks")}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${viewMode === "stock_state" ? "bg-[#d4522f]/15 text-[#d4522f]" : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500"}`}>{products.length}</span>
</button>
<button type="button" onClick={() => setViewMode("vouchers")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${viewMode === "vouchers" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"}`}>
<span>{t("trading_inventory_tab_vouchers", "Bons de Mouvements")}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${viewMode === "vouchers" ? "bg-[#d4522f]/15 text-[#d4522f]" : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500"}`}>{stockVouchers.length}</span>
</button>
</div>
<div className="self-end sm:self-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث برمز المادة، التسمية، السند..." : "Filtrer article, bon, SKU..."} shutSize={36} openWidth={280} />
</div>
</div>
</div>
<div className="w-full">
{viewMode === "stock_state" ? /* @__PURE__ */ <UniversalDataCollection items={filteredProducts} keyExtractor={(p) => p.id} columns={stockColumns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} renderCard={(p) => /* @__PURE__ */ <div className="p-4 border rounded-xl space-y-1">
<span className="font-mono text-xs">{p.sku}</span>
<p className="font-bold text-xs">{p.name}</p>
<div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
<span>
{"Stock : "}
{p.stockQuantity}
</span>
<span className="font-bold text-[#d4522f]">{formatMoney(p.price?.amount || 0)}</span>
</div>
</div>} emptyTitle={language === "ar" ? "لا توجد مقالات في هذا المستودع" : "Aucun article dans ce dépôt"} emptyDescription={language === "ar" ? "قم بإدخال مواد للمستودع عبر سندات الاستلام أو حركات المخزون." : "Effectuez une réception à quai ou un bon de mouvement d'entrée pour approvisionner ce dépôt."} /> : /* @__PURE__ */ <UniversalDataCollection items={filteredVouchers} keyExtractor={(v) => v.id} columns={voucherColumns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} renderCard={(v) => /* @__PURE__ */ <div className="p-4 border rounded-xl space-y-1">
<span className="font-mono text-xs">{v.voucherNumber}</span>
<p className="font-bold text-xs">{v.reason}</p>
<div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
<span>{v.date}</span>
<span className="font-bold text-[#d4522f]">{formatMoney(v.totalValuationDzd)}</span>
</div>
</div>} emptyTitle={language === "ar" ? "لا توجد حركات مخزون مسجلة" : "Aucun mouvement de stock enregistré"} emptyDescription={language === "ar" ? "أنشئ أول سند دخول، خروج أو تحويل بين المستودعات." : "Créez votre premier bon d'entrée, de sortie ou de transfert inter-dépôts ci-dessus."} />}
</div>
</div>
</div>
<StockMovementModal isOpen={movementModalOpen} onClose={() => setMovementModalOpen(false)} />
{newDepotModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
<h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
<Building2 size={18} className="text-[#d4522f]" />
<span>Ajouter un Nouveau Dépôt</span>
</h2>
<form onSubmit={handleCreateDepot} className="space-y-3 text-xs">
<LabelInput label="Code Dépôt *" placeholder="Ex: DEP-03" value={depotCode} onChange={(e) => setDepotCode(e.target.value)} required />
<LabelInput label="Nom du Dépôt / Hangar *" placeholder="Ex: Dépôt Annaba Port" value={depotName} onChange={(e) => setDepotName(e.target.value)} required />
<LabelInput label="Adresse Logistique" placeholder="Ex: Quai Ouest, Zone Portuaire" value={depotAddress} onChange={(e) => setDepotAddress(e.target.value)} />
<LabelInput label="Ville" placeholder="Ex: Annaba" value={depotCity} onChange={(e) => setDepotCity(e.target.value)} />
<div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
<AtriumButton type="button" variant="ghost" size="sm" onClick={() => setNewDepotModalOpen(false)}>Annuler</AtriumButton>
<AtriumButton type="submit" variant="primary" size="sm">Créer le Dépôt</AtriumButton>
</div>
</form>
</div>
</div>}
</div>;
};
