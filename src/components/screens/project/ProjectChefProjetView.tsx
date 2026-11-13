import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCollateralItem, PMPrintOrder, PMBatDeliverable, PMExpense } from '../../../types/index';
import {
  FolderKanban,
  ShoppingBag,
  FileCheck2,
  DollarSign,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle,
  Eye,
  MessageSquare,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Printer,
  Building2,
  ChevronDown,
  Download,
  Check,
  Pin,
  X,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface ProjectChefProjetViewProps {
  initialTab?: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses';
}



export const ProjectChefProjetView: React.FC<ProjectChefProjetViewProps> = ({ initialTab }) => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, pmProjects, pmMilestones, pmCollateralCatalog, pmPrintOrders, pmBatDeliverables, pmExpenses, pmEquipmentStock, addPmPrintOrder, batchUpdatePmPrintOrderStatus, batchDeletePmPrintOrders, reviewPmBatDeliverable, batchReviewPmBatDeliverables, batchDeletePmBatDeliverables, addPmExpense, batchDeletePmExpenses, resetPmMockData, activePmSubScreen, setActivePmSubScreen, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
	const activeTab = activePmSubScreen === "catalog" || initialTab === "catalog" ? "catalog" : activePmSubScreen === "orders" || initialTab === "orders" ? "orders" : activePmSubScreen === "bat" || activePmSubScreen === "files" || initialTab === "bat" ? "bat" : activePmSubScreen === "expenses" || initialTab === "expenses" ? "expenses" : "portfolio";
	const setActiveTab = (tab: any) => {
		setActivePmSubScreen(tab);
	};
	const [selectedProjectId, setSelectedProjectId] = React.useState(pmProjects[0]?.id || "");
	const [cartItems, setCartItems] = React.useState<any[]>([]);
	const [isCartOpen, setIsCartOpen] = React.useState(false);
	const [activeBatId, setActiveBatId] = React.useState<any>(null);
	const [correctionNote, setCorrectionNote] = React.useState("");
	const [isCorrectionModalOpen, setIsCorrectionModalOpen] = React.useState(false);
	const [selectedReceiptUrl, setSelectedReceiptUrl] = React.useState<any>(null);
	const [catalogSearch, setCatalogSearch] = React.useState("");
	const [catalogCategory, setCatalogCategory] = React.useState("all");
	const [ordersSearch, setOrdersSearch] = React.useState("");
	const [ordersStatusFilter, setOrdersStatusFilter] = React.useState("all");
	const [selectedOrderIds, setSelectedOrderIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedOrderIds, setPinnedOrderIds] = React.useState(/* @__PURE__ */ new Set());
	const [ordersSortBy, setOrdersSortBy] = React.useState("orderNumber");
	const [ordersSortDir, setOrdersSortDir] = React.useState("desc");
	const [batSearch, setBatSearch] = React.useState("");
	const [selectedBatIds, setSelectedBatIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedBatIds, setPinnedBatIds] = React.useState(/* @__PURE__ */ new Set());
	const [expenseSearch, setExpenseSearch] = React.useState("");
	const [selectedExpenseIds, setSelectedExpenseIds] = React.useState(/* @__PURE__ */ new Set());
	const [purchaseTitle, setPurchaseTitle] = React.useState("Nappe comptoir brandée");
	const [purchaseAmount, setPurchaseAmount] = React.useState("8400");
	const [purchaseCategory, setPurchaseCategory] = React.useState("materials");
	const [purchaseSuccessMessage, setPurchaseSuccessMessage] = React.useState<any>(null);
	const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];
	const projectExpenses = pmExpenses.filter((e) => e.projectId === selectedProject?.id);
	const totalExpensesSpent = projectExpenses.reduce((acc, e) => acc + e.amountDzd, 0);
	const fieldExpensesLimit = selectedProject?.maxFieldExpensesDzd || 1;
	const burnRatePercent = Math.min(Math.round(totalExpensesSpent / fieldExpensesLimit * 100), 100);
	const isOverThreshold = burnRatePercent >= 85;
	const handleAddToCart = (item: any) => {
		setCartItems((prev) => {
			if (prev.find((i) => i.item.id === item.id)) return prev.map((i) => i.item.id === item.id ? {
				...i,
				quantity: i.quantity + 1
			} : i);
			return [...prev, {
				item,
				quantity: 1
			}];
		});
		setIsCartOpen(true);
	};
	const handleUpdateQuantity = (itemId: any, delta: any) => {
		setCartItems((prev) => prev.map((i) => i.item.id === itemId ? {
			...i,
			quantity: Math.max(1, i.quantity + delta)
		} : i).filter((i) => i.quantity > 0));
	};
	const handleRemoveFromCart = (itemId: any) => {
		setCartItems((prev) => prev.filter((i) => i.item.id !== itemId));
	};
	const cartTotalDzd = cartItems.reduce((acc, i) => acc + i.item.unitCostDzd * i.quantity, 0);
	const handleTransmitToCrea = () => {
		if (cartItems.length === 0 || !selectedProject) return;
		const orderNumber = `CMD-PRINT-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
		addPmPrintOrder({
			tenantId: "acc_01",
			facilityId: "branch_agency_main",
			projectId: selectedProject.id,
			projectTitle: selectedProject.title,
			orderNumber,
			items: cartItems.map((ci) => ({
				collateralItemId: ci.item.id,
				itemTitle: ci.item.title,
				quantity: ci.quantity,
				unitPriceDzd: ci.item.unitCostDzd
			})),
			totalCostDzd: cartTotalDzd,
			status: "sent_to_crea"
		});
		setCartItems([]);
		setIsCartOpen(false);
		setActiveTab("orders");
	};
	const handleApproveBat = (batId: any) => {
		reviewPmBatDeliverable(batId, "approved");
	};
	const handleRequestRevision = () => {
		if (activeBatId) {
			reviewPmBatDeliverable(activeBatId, "revision_requested", correctionNote);
			setIsCorrectionModalOpen(false);
			setCorrectionNote("");
			setActiveBatId(null);
		}
	};
	const handleDeclarePurchase = (e: any) => {
		e.preventDefault();
		if (!purchaseTitle || !purchaseAmount || !selectedProject) return;
		addPmExpense({
			tenantId: "acc_01",
			facilityId: "branch_agency_main",
			projectId: selectedProject.id,
			projectTitle: selectedProject.title,
			declaredByUserId: "stf_pm_01",
			declaredByUserName: "K. Yacine (CDP)",
			declaredByRole: "chef_projet",
			title: purchaseTitle,
			category: purchaseCategory as any,
			amountDzd: Number(purchaseAmount),
			receiptPhotoUrl: "https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80",
			fiscalNif: "001916001234567",
			hasFiscalInvoice: true
		});
		const msg = t("pm_cp_toast_purchase_desc", { title: purchaseTitle });
		setPurchaseSuccessMessage(msg);
		setTimeout(() => setPurchaseSuccessMessage(null), 3e3);
		setPurchaseTitle("");
	};
	const filteredCatalog = React.useMemo(() => {
		return pmCollateralCatalog.filter((item) => {
			const q = catalogSearch.toLowerCase().trim();
			const matchQ = !q || item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
			const matchCat = catalogCategory === "all" || item.category === catalogCategory;
			return matchQ && matchCat;
		});
	}, [
		pmCollateralCatalog,
		catalogSearch,
		catalogCategory
	]);
	const filteredOrders = React.useMemo(() => {
		return pmPrintOrders.filter((order) => {
			const q = ordersSearch.toLowerCase().trim();
			const matchQ = !q || order.orderNumber.toLowerCase().includes(q) || order.projectTitle.toLowerCase().includes(q) || order.items.some((i) => i.itemTitle.toLowerCase().includes(q));
			const matchStatus = ordersStatusFilter === "all" || order.status === ordersStatusFilter;
			return matchQ && matchStatus;
		});
	}, [
		pmPrintOrders,
		ordersSearch,
		ordersStatusFilter
	]);
	const sortedOrders = React.useMemo(() => {
		return [...filteredOrders].sort((a, b) => {
			const aPinned = pinnedOrderIds.has(a.id);
			const bPinned = pinnedOrderIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (ordersSortBy === "orderNumber") {
				const cmp = a.orderNumber.localeCompare(b.orderNumber);
				return ordersSortDir === "asc" ? cmp : -cmp;
			}
			if (ordersSortBy === "totalCost") return ordersSortDir === "asc" ? a.totalCostDzd - b.totalCostDzd : b.totalCostDzd - a.totalCostDzd;
			return 0;
		});
	}, [
		filteredOrders,
		pinnedOrderIds,
		ordersSortBy,
		ordersSortDir
	]);
	const catalogColumns = React.useMemo(() => [
		{
			key: "item",
			header: "Support & Réf. POSM",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (item: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-800" />
<div className="min-w-0">
<div className="font-semibold text-black dark:text-white text-xs truncate max-w-[200px]">{item.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{item.sku}
{" · "}
{item.category}
</div>
</div>
</div>
		},
		{
			key: "dimensions",
			header: "Format & Spécifications",
			width: "1.5*",
			minWidth: "160px",
			renderCell: (item: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75 font-mono">{item.dimensions}</div>
		},
		{
			key: "cost",
			header: "Coût Unitaire DZD",
			width: "1.2*",
			minWidth: "130px",
			align: "right",
			renderCell: (item: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{formatMoney(item.unitCostDzd, "DZD")}</div>
		},
		{
			key: "actions",
			header: "Commande",
			width: "1*",
			minWidth: "120px",
			align: "right",
			renderCell: (item: any) => /* @__PURE__ */ <AtriumButton type="button" size="xs" variant="primary" icon={<ShoppingBag className="w-3.5 h-3.5" />} onClick={() => handleAddToCart(item)} className="ml-auto">Ajouter</AtriumButton>
		}
	], []);
	const orderColumns = React.useMemo(() => [
		{
			key: "orderNumber",
			header: "Réf. Bon de Commande",
			width: "2*",
			minWidth: "200px",
			sortable: true,
			renderCell: (order: any) => {
				const isPinned = pinnedOrderIds.has(order.id);
				return /* @__PURE__ */ <div className="flex items-center gap-2">
<button type="button" onClick={(e) => {
							e.stopPropagation();
							setPinnedOrderIds((prev) => {
								const next = new Set(prev);
								if (next.has(order.id)) next.delete(order.id);
								else next.add(order.id);
								return next;
							});
						}} className={`p-1 rounded-lg transition-colors cursor-pointer ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}><Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} /></button>
<div>
<div className="font-mono font-bold text-xs text-black dark:text-white">{order.orderNumber}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[170px]">{order.projectTitle}</div>
</div>
</div>;
			}
		},
		{
			key: "items",
			header: "Détails des Articles POSM",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (order: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75 space-y-0.5">
{order.items.slice(0, 2).map((it: any, idx: number) => /* @__PURE__ */ <div key={idx} className="truncate">
{"• "}
{it.quantity}
{"x "}
{it.itemTitle}
</div>)}
{order.items.length > 2 && /* @__PURE__ */ <div className="text-[10px] text-black/55 dark:text-white/55 italic">
{"+ "}
{order.items.length - 2}
{" autre(s) référence(s)"}
</div>}
</div>
		},
		{
			key: "totalCost",
			header: "Montant Impression",
			width: "1.5*",
			minWidth: "150px",
			sortable: true,
			align: "right",
			renderCell: (order: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">{formatMoney(order.totalCostDzd, "DZD")}</div>
		},
		{
			key: "status",
			header: "Statut Production",
			width: "1.5*",
			minWidth: "150px",
			align: "center",
			renderCell: (order: any) => {
				const badge = ({
					sent_to_crea: {
						label: "Transmis Créa",
						bg: "bg-blue-100 dark:bg-blue-950/60",
						text: "text-blue-700 dark:text-blue-300"
					},
					bat_in_progress: {
						label: "BAT en cours",
						bg: "bg-amber-100 dark:bg-amber-950/60",
						text: "text-amber-700 dark:text-amber-300"
					},
					sent_to_printer: {
						label: "Chez l'Imprimeur",
						bg: "bg-purple-100 dark:bg-purple-950/60",
						text: "text-purple-700 dark:text-purple-300"
					},
					printed: {
						label: "Imprimé & Livré",
						bg: "bg-emerald-100 dark:bg-emerald-950/60",
						text: "text-emerald-700 dark:text-emerald-300"
					}
				} as Record<string, any>)[order.status] || {
					label: order.status,
					bg: "bg-zinc-100",
					text: "text-black/70 dark:text-white/75"
				};
				return /* @__PURE__ */ <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
			}
		}
	], [pinnedOrderIds]);
	const handleExportOrdersCsv = () => {
		const headers = [
			"N° Commande",
			"Projet",
			"Nombre Articles",
			"Montant Total DZD",
			"Statut"
		];
		const rows = sortedOrders.map((o) => [
			`"${o.orderNumber}"`,
			`"${o.projectTitle.replace(/"/g, "\"\"")}"`,
			o.items.reduce((acc, i) => acc + i.quantity, 0),
			o.totalCostDzd,
			o.status
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `commandes_print_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: pmProjects.length > 0 || pmPrintOrders.length > 0
	});
	if (showSkeleton && (pmProjects.length === 0 && pmPrintOrders.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "2.5*",
				minWidth: "220px"
			},
			{
				width: "1.5*",
				minWidth: "150px"
			},
			{
				width: "1.5*",
				minWidth: "150px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div>
<div className="flex items-center gap-2">
<span className="text-xs font-semibold uppercase tracking-wider text-[#d4522f]">Chef de Projet</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs text-black/55 dark:text-white/55">Coordination & Suivi Print</span>
</div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{activeTab === "portfolio" ? "Pilotage Projets & Alertes" : activeTab === "catalog" ? "Catalogue Supports POSM" : activeTab === "orders" ? "Commandes Imprimeur & BAT" : activeTab === "bat" ? "Revue BAT Bon à Tirer" : "Dépenses & Achats Terrain"}
</h1>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton variant="primary" size="sm" onClick={() => setIsCartOpen(true)} icon={<ShoppingBag className="w-3.5 h-3.5" />} className="relative">
<span>Panier Print</span>
{cartItems.length > 0 && /* @__PURE__ */ <span className="w-5 h-5 rounded-full bg-white text-[#d4522f] font-bold text-[10px] flex items-center justify-center ml-1">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>}
</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{language === "ar" ? "مؤشرات التنسيق الميداني والإنتاج الطباعي" : language === "fr" ? "Indicateurs de Coordination & Production Print" : "Coordination & Print Production Metrics"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">
{language === "ar" ? "المشاريع الخاضعة للمتابعة" : language === "fr" ? "Campagnes Supervisées" : "Supervised Projects"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
{pmProjects.length}
{" "}
{language === "ar" ? "نشطة" : "actives"}
</span>
</div>
<div>
<div className="text-2xl font-black text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{pmProjects.length}</div>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">
{language === "ar" ? "مخططات الإنتاج قيد الإنجاز" : "plannings opérationnels en cours"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">
{language === "ar" ? "أوامر الطباعة ومراجعة BAT" : language === "fr" ? "Commandes Print & BAT" : "Print Orders & BAT"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
{pmPrintOrders.length}
{" "}
{language === "ar" ? "أمر" : "ordres"}
</span>
</div>
<div>
<div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{pmBatDeliverables.filter((b) => b.approvalStatus === "pending_review").length}
{" "}
{language === "ar" ? "BAT بانتظار التأشير" : "BAT en attente"}
</div>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">
{pmPrintOrders.length}
{" "}
{language === "ar" ? "طلبيات طباعة في المطبعة" : "commandes POSM transmises"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">
{language === "ar" ? "المشتريات الميدانية (Slide 11)" : language === "fr" ? "Dépenses Terrain Consommées" : "Field Expenses Spent"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
{burnRatePercent}
{"% "}
{language === "ar" ? "مستهلك" : "consommé"}
</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalExpensesSpent, "DZD")}</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>
{language === "ar" ? `سقف المشروع: ${formatMoney(fieldExpensesLimit, "DZD")}` : `Plafond : ${formatMoney(fieldExpensesLimit, "DZD")}`}
</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{language === "ar" ? "سير العمليات ومخطط الإنتاج والتنفيذ" : "Matrice de Déploiement & Pipeline Opérationnel"}
</h2>
</div>
<LiveSegmentedControl size="sm" value={activeTab} onValueChange={(val) => setActiveTab(val)} options={[
								{
									value: "portfolio",
									label: language === "ar" ? "المشاريع" : language === "fr" ? "Pilotage" : "Projects",
									tooltip: language === "ar" ? "متابعة المشاريع والتنفيذ" : language === "fr" ? "Pilotage du portefeuille" : "Portfolio oversight",
									count: pmProjects.length
								},
								{
									value: "catalog",
									label: language === "ar" ? "الكتالوج" : language === "fr" ? "Catalogue" : "Catalog",
									tooltip: language === "ar" ? "كتالوج POSM والدعائم" : language === "fr" ? "Catalogue POSM & PLV" : "POSM & print catalog",
									count: pmCollateralCatalog.length
								},
								{
									value: "orders",
									label: language === "ar" ? "الطباعة" : language === "fr" ? "Commandes" : "Orders",
									tooltip: language === "ar" ? "طلبات الطباعة" : language === "fr" ? "Commandes Print" : "Print orders",
									count: pmPrintOrders.length
								},
								{
									value: "bat",
									label: language === "ar" ? "الاعتماد" : language === "fr" ? "BAT" : "Proofs",
									tooltip: language === "ar" ? "مراجعة BAT" : language === "fr" ? "Revue BAT" : "Artwork proofs review",
									count: pmBatDeliverables.length
								},
								{
									value: "expenses",
									label: language === "ar" ? "المصاريف" : language === "fr" ? "Dépenses" : "Expenses",
									tooltip: language === "ar" ? "مصاريف المشروع" : language === "fr" ? "Dépenses terrain" : "Project expenses",
									count: pmExpenses.length
								}
							]} aria-label="Project Chef de Projet Stages Filter" />
</div>
{activeTab === "portfolio" && /* @__PURE__ */ <div className="space-y-6">
<div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Contrôle des Plafonds Dépenses Terrain (Slide 6 & 11)</span>
<h2 className="text-lg font-bold text-black dark:text-white mt-0.5 font-['Barlow_Condensed',sans-serif] rtl:font-sans">{selectedProject?.title}</h2>
<div className="text-xs text-black/55 dark:text-white/55">
{"Client : "}
<span className="font-semibold text-black/70 dark:text-white/75">{selectedProject?.clientName}</span>
{" · Plafond autorisé : "}
<span className="font-mono font-bold">{formatMoney(selectedProject?.maxFieldExpensesDzd || 0, "DZD")}</span>
</div>
</div>
<div className="w-full sm:w-64 space-y-1.5">
<div className="flex justify-between text-xs font-semibold">
<span className="text-black/55 dark:text-white/55">Consommé Terrain :</span>
<span className={`font-mono tabular-nums ${isOverThreshold ? "text-red-600 font-bold" : "text-black dark:text-white"}`}>
{formatMoney(totalExpensesSpent, "DZD")}
{" ("}
{burnRatePercent}
%)
</span>
</div>
<div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
<div className={`h-full transition-all ${isOverThreshold ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${burnRatePercent}%` }} />
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{pmProjects.map((p) => {
								const spent = pmExpenses.filter((e) => e.projectId === p.id).reduce((acc, e) => acc + e.amountDzd, 0);
								const limit = p.maxFieldExpensesDzd || 1;
								const pct = Math.min(Math.round(spent / limit * 100), 100);
								return /* @__PURE__ */ <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${selectedProject?.id === p.id ? "border-[#d4522f] bg-[#d4522f]/5 dark:bg-[#d4522f]/10 ring-1 ring-[#d4522f]" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"}`}>
<div className="flex items-start justify-between gap-2 mb-2">
<span className="text-[11px] font-bold text-[#d4522f] uppercase truncate">{p.clientName}</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-black/70 dark:text-white/75">{p.status}</span>
</div>
<h3 className="text-sm font-bold text-black dark:text-white mb-2 truncate">{p.title}</h3>
<div className="space-y-1 text-xs text-black/55 dark:text-white/55">
<div className="flex justify-between">
<span>Plafond Global:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(p.budgetCapDzd, "DZD")}</span>
</div>
<div className="flex justify-between">
<span>Dépenses Terrain:</span>
<span className="font-mono">
{formatMoney(spent, "DZD")}
{" / "}
{formatMoney(limit, "DZD")}
</span>
</div>
</div>
<div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-3">
<div className={`h-full ${pct >= 85 ? "bg-red-500" : "bg-[#d4522f]"}`} style={{ width: `${pct}%` }} />
</div>
</div>;
							})}
</div>
</div>}
{activeTab === "catalog" && /* @__PURE__ */ <div className="space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
<div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
<Seek value={catalogSearch} onChange={setCatalogSearch} placeholder="Rechercher totem, rollup, kakemono, stand..." openWidth={360} shutSize={38} />
<FilterSelect label="Catégorie" value={catalogCategory} onChange={(val) => setCatalogCategory(typeof val === "string" ? val : val.target?.value || val)} options={[
										{
											value: "all",
											label: language === "ar" ? "الكل" : language === "fr" ? "Toutes" : "All",
											tooltip: language === "ar" ? "جميع الفئات" : language === "fr" ? "Toutes les catégories" : "All categories"
										},
										{
											value: "stand",
											label: language === "ar" ? "منصات" : language === "fr" ? "Stands" : "Booths",
											tooltip: language === "ar" ? "منصات ومكاتب عرض" : language === "fr" ? "Stands & Comptoirs" : "Booths & counters"
										},
										{
											value: "display",
											label: language === "ar" ? "حوامل" : language === "fr" ? "Totems" : "Displays",
											tooltip: language === "ar" ? "أعمدة ولافتات" : language === "fr" ? "Totems & Roll-ups" : "Totems & roll-ups"
										},
										{
											value: "print",
											label: language === "ar" ? "مطبوعات" : language === "fr" ? "Imprimés" : "Print",
											tooltip: language === "ar" ? "منشورات وملصقات" : language === "fr" ? "Flyers & Affiches" : "Flyers & posters"
										},
										{
											value: "textile",
											label: language === "ar" ? "ألبسة" : language === "fr" ? "Textiles" : "Apparel",
											tooltip: language === "ar" ? "ملابس وقبعات" : language === "fr" ? "Textiles & Casquettes" : "Apparel & caps"
										}
									]} />
</div>
<div className="text-xs text-black/55 dark:text-white/55 font-semibold">
{filteredCatalog.length}
{" support(s) configuré(s)"}
</div>
</div>
<UniversalDataCollection items={filteredCatalog} keyExtractor={(i) => i.id} defaultViewMode="grid" columns={catalogColumns} renderCard={(item) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-2">
<img src={item.imageUrl} alt={item.title} className="w-full h-36 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800" />
<div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55 font-mono">
<span>{item.sku}</span>
<span className="uppercase text-[#d4522f] font-bold">{item.category}</span>
</div>
<h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">{item.title}</h3>
<p className="text-xs text-black/55 dark:text-white/55 font-mono">
{"Format : "}
{item.dimensions}
</p>
</div>
<div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
<span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">{formatMoney(item.unitCostDzd, "DZD")}</span>
<AtriumButton type="button" size="xs" variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => handleAddToCart(item)}>Commander</AtriumButton>
</div>
</div>} />
</div>}
{activeTab === "orders" && /* @__PURE__ */ <div className="space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
<div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
<Seek value={ordersSearch} onChange={setOrdersSearch} placeholder="Rechercher par n° de bon ou campagne..." openWidth={360} shutSize={38} />
<FilterSelect label="Statut" value={ordersStatusFilter} onChange={(val) => setOrdersStatusFilter(typeof val === "string" ? val : val.target?.value || val)} options={[
											{
												value: "all",
												label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
												tooltip: language === "ar" ? "جميع الحالات" : language === "fr" ? "Tous les statuts" : "All statuses"
											},
											{
												value: "sent_to_crea",
												label: language === "ar" ? "التصميم" : language === "fr" ? "Créa" : "Studio",
												tooltip: language === "ar" ? "محال إلى التصميم" : language === "fr" ? "Transmis Créa" : "Sent to creative studio"
											},
											{
												value: "bat_in_progress",
												label: language === "ar" ? "مراجعة" : language === "fr" ? "BAT" : "Proofing",
												tooltip: language === "ar" ? "BAT قيد الإنجاز" : language === "fr" ? "BAT en cours" : "Proofing in progress"
											},
											{
												value: "sent_to_printer",
												label: language === "ar" ? "المطبعة" : language === "fr" ? "Imprimeur" : "Printer",
												tooltip: language === "ar" ? "لدى المطبعة" : language === "fr" ? "Chez l'Imprimeur" : "At printer"
											},
											{
												value: "printed",
												label: language === "ar" ? "مطبوع" : language === "fr" ? "Livré" : "Delivered",
												tooltip: language === "ar" ? "مطبوع ومُسلّم" : language === "fr" ? "Imprimé & Livré" : "Printed & delivered"
											}
										]} />
</div>
<button onClick={handleExportOrdersCsv} className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/75 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
<Download className="w-3.5 h-3.5" />
<span>Export CSV</span>
</button>
</div>
{selectedOrderIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between px-4 py-3 bg-[#d4522f]/10 border border-[#d4522f]/30 rounded-2xl animate-in fade-in">
<div className="flex items-center gap-3 text-xs font-semibold text-[#d4522f]">
<span>
{selectedOrderIds.size}
{" commande(s) sélectionnée(s)"}
</span>
<button type="button" onClick={() => setSelectedOrderIds(/* @__PURE__ */ new Set())} className="text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white underline cursor-pointer">Désélectionner</button>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => {
												batchUpdatePmPrintOrderStatus(Array.from(selectedOrderIds), "in_print");
												setSelectedOrderIds(/* @__PURE__ */ new Set());
											}} className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors cursor-pointer">Envoyer à l'Imprimeur</button>
<button type="button" onClick={() => {
												batchUpdatePmPrintOrderStatus(Array.from(selectedOrderIds), "delivered");
												setSelectedOrderIds(/* @__PURE__ */ new Set());
											}} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer">Marquer Imprimé & Reçu</button>
<button type="button" onClick={() => {
												batchDeletePmPrintOrders(Array.from(selectedOrderIds));
												setSelectedOrderIds(/* @__PURE__ */ new Set());
											}} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
<Trash2 className="w-3.5 h-3.5" />
Supprimer
</button>
</div>
</div>}
<UniversalDataCollection items={sortedOrders} keyExtractor={(o) => o.id} defaultViewMode="list" columns={orderColumns} sortBy={ordersSortBy} sortDirection={ordersSortDir} onSortChange={(key) => {
									if (ordersSortBy === key) setOrdersSortDir((prev) => prev === "asc" ? "desc" : "asc");
									else {
										setOrdersSortBy(key);
										setOrdersSortDir("asc");
									}
								}} selectedIds={selectedOrderIds} onSelectionChange={setSelectedOrderIds} renderCard={(order) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div>
<div className="flex items-center justify-between text-xs font-mono font-bold text-black dark:text-white mb-1">
<span>{order.orderNumber}</span>
<span className="text-black/55 dark:text-white/55 font-normal">{order.status}</span>
</div>
<h4 className="text-sm font-semibold text-black dark:text-white">{order.projectTitle}</h4>
<div className="text-xs text-black/55 dark:text-white/55 mt-2 space-y-1">
{order.items.map((it, idx) => /* @__PURE__ */ <div key={idx}>
{"• "}
{it.quantity}
{"x "}
{it.itemTitle}
</div>)}
</div>
</div>
<div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
<span className="text-black/55 dark:text-white/55">Total :</span>
<span className="font-mono font-bold text-black dark:text-white tabular-nums">{formatMoney(order.totalCostDzd, "DZD")}</span>
</div>
</div>} />
</div>}
{activeTab === "bat" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
<Seek value={batSearch} onChange={setBatSearch} placeholder="Rechercher par livrable ou campagne..." openWidth={360} shutSize={38} />
{selectedBatIds.size > 0 && /* @__PURE__ */ <div className="flex items-center gap-2">
<button type="button" onClick={() => {
										batchReviewPmBatDeliverables(Array.from(selectedBatIds), "approved");
										setSelectedBatIds(/* @__PURE__ */ new Set());
									}} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer">
Valider Bon à Tirer (
{selectedBatIds.size}
)
</button>
</div>}
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{pmBatDeliverables.filter((b) => !batSearch.trim() || b.title.toLowerCase().includes(batSearch.toLowerCase()) || b.projectTitle.toLowerCase().includes(batSearch.toLowerCase())).map((bat) => /* @__PURE__ */ <div key={bat.id} className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
<img src={bat.previewUrl} alt={bat.title} className="w-full h-44 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800" />
<div className="flex items-start justify-between gap-2">
<span className="text-xs font-bold text-[#d4522f] uppercase truncate">{bat.projectTitle}</span>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bat.approvalStatus === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : bat.approvalStatus === "revision_requested" ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}`}>
{bat.approvalStatus === "approved" ? "Bon à Tirer Validé" : bat.approvalStatus === "revision_requested" ? "Corrections Demandées" : "En Attente de Revue"}
</span>
</div>
<h3 className="text-sm font-bold text-black dark:text-white truncate">{bat.title}</h3>
<div className="flex items-center gap-3 text-xs text-black/55 dark:text-white/55 font-mono">
<span>{bat.colorSpace}</span>
<span>·</span>
<span>
{bat.resolutionDpi}
{" DPI"}
</span>
<span>·</span>
<span>
{"Fond perdu : "}
{bat.bleedMm}
mm
</span>
</div>
{bat.revisionComments && /* @__PURE__ */ <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
{"Note CDP : "}
{bat.revisionComments}
</div>}
<div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
<button type="button" onClick={() => {
												setActiveBatId(bat.id);
												setIsCorrectionModalOpen(true);
											}} className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/75 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer">Demander Révision</button>
<button type="button" onClick={() => handleApproveBat(bat.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer">Valider BAT</button>
</div>
</div>)}
</div>
</div>}
{activeTab === "expenses" && /* @__PURE__ */ <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-7 space-y-4">
<div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
<Seek value={expenseSearch} onChange={setExpenseSearch} placeholder="Rechercher par titre de dépense..." openWidth={300} shutSize={38} />
<span className="text-xs text-black/55 dark:text-white/55 font-semibold">
{projectExpenses.length}
{" dépense(s) pour ce projet"}
</span>
</div>
<div className="space-y-3">
{projectExpenses.map((exp) => /* @__PURE__ */ <div key={exp.id} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-4">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">{exp.category}</span>
<span className="font-semibold text-xs text-black dark:text-white">{exp.title}</span>
{exp.hasFiscalInvoice && /* @__PURE__ */ <span className="text-[10px] text-emerald-600 font-bold">Facture Fiscale</span>}
</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{"Par "}
{exp.declaredByUserName}
{" · Statut : "}
<span className="font-semibold">{exp.status}</span>
</div>
</div>
<div className="flex items-center gap-3 shrink-0">
<span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">{formatMoney(exp.amountDzd, "DZD")}</span>
{exp.receiptPhotoUrl && /* @__PURE__ */ <button type="button" onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer" title="Voir le justificatif"><Eye className="w-4 h-4" /></button>}
</div>
</div>)}
</div>
</div>
<div className="lg:col-span-5 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Déclaration d'Achat Terrain (Slide 11)</span>
<h3 className="text-base font-bold text-black dark:text-white mt-0.5">Saisie Immédiate & Codage Stock</h3>
<p className="text-xs text-black/55 dark:text-white/55">Génère automatiquement une référence d'immobilisation indirecte pour l'agence.</p>
</div>
{purchaseSuccessMessage && /* @__PURE__ */ <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">{purchaseSuccessMessage}</div>}
<form onSubmit={handleDeclarePurchase} className="space-y-4">
<LabelInput field="PurchaseTitle" label="Désignation du Matériel" value={purchaseTitle} onChange={setPurchaseTitle} required height={44} corner={12} />
<LabelInput field="PurchaseAmount" label="Montant TTC (DZD)" type="number" value={purchaseAmount} onChange={setPurchaseAmount} required height={44} corner={12} />
<FilterSelect label="Nature de l'Achat" value={purchaseCategory} onChange={(val) => setPurchaseCategory(typeof val === "string" ? val : val.target?.value || val)} options={[
												{
													value: "materials",
													label: language === "ar" ? "معدات" : language === "fr" ? "Matériel" : "Equipment",
													tooltip: language === "ar" ? "معدات وأثاث المنصة" : language === "fr" ? "Matériel & Mobilier Stand" : "Booth equipment & furniture"
												},
												{
													value: "catering",
													label: language === "ar" ? "إطعام" : language === "fr" ? "Restauration" : "Catering",
													tooltip: language === "ar" ? "إطعام المنشطين" : language === "fr" ? "Restauration Animateurs" : "Promoter catering"
												},
												{
													value: "transport",
													label: language === "ar" ? "نقل" : language === "fr" ? "Transport" : "Transport",
													tooltip: language === "ar" ? "وقود ونقل" : language === "fr" ? "Carburant & Transport" : "Fuel & transport"
												}
											]} />
<AtriumButton type="submit" variant="primary" className="w-full" icon={<Plus className="w-4 h-4" />}>Déclarer & Imputer au Projet</AtriumButton>
</form>
</div>
</div>}
{isCartOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
<div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full p-6 flex flex-col justify-between shadow-2xl border-l border-zinc-200 dark:border-zinc-800">
<div className="space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
<h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
<ShoppingBag className="w-5 h-5 text-[#d4522f]" />
Bon de Commande Impression
</h3>
<button type="button" onClick={() => setIsCartOpen(false)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<div className="space-y-1">
<span className="text-xs text-black/55 dark:text-white/55">Campagne Associée :</span>
<div className="font-bold text-xs text-black dark:text-white">{selectedProject?.title}</div>
</div>
<div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
{cartItems.length === 0 ? /* @__PURE__ */ <div className="py-8 text-center text-xs text-black/55 dark:text-white/55">Le panier est vide. Sélectionnez des supports dans le catalogue.</div> : cartItems.map((ci) => /* @__PURE__ */ <div key={ci.item.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
<div className="min-w-0">
<div className="font-semibold text-black dark:text-white truncate">{ci.item.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{formatMoney(ci.item.unitCostDzd, "DZD")}
{" / unité"}
</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<button type="button" onClick={() => handleUpdateQuantity(ci.item.id, -1)} className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer">-</button>
<span className="font-mono font-bold w-6 text-center">{ci.quantity}</span>
<button type="button" onClick={() => handleUpdateQuantity(ci.item.id, 1)} className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer">+</button>
<button type="button" onClick={() => handleRemoveFromCart(ci.item.id)} className="p-1 text-red-500 hover:text-red-700 ml-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
</div>
</div>)}
</div>
</div>
<div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
<div className="flex justify-between items-center text-sm font-bold">
<span>Total Estimé HT :</span>
<span className="font-mono text-base text-[#d4522f] tabular-nums">{formatMoney(cartTotalDzd, "DZD")}</span>
</div>
<AtriumButton type="button" variant="primary" className="w-full" onClick={handleTransmitToCrea} disabled={cartItems.length === 0} icon={<Send className="w-4 h-4" />}>Transmettre au Studio Créa pour BAT ➔</AtriumButton>
</div>
</div>
</div>}
</div>
{isCorrectionModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
<MessageSquare className="w-4 h-4 text-[#d4522f]" />
Demande de Correction BAT
</h3>
<button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<textarea rows={4} value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} placeholder="Indiquez les modifications requises (ex: logo client flou, fond perdu insuffisant, coquille dans le texte légal)..." className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
<div className="flex justify-end gap-2">
<AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsCorrectionModalOpen(false)}>Annuler</AtriumButton>
<AtriumButton type="button" variant="primary" size="sm" onClick={handleRequestRevision}>Envoyer au Studio Créa</AtriumButton>
</div>
</div>
</div>}
{selectedReceiptUrl && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
<Receipt className="w-4 h-4 text-[#d4522f]" />
Justificatif d'Achat Terrain
</h3>
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<img src={selectedReceiptUrl} alt="Justificatif" className="w-full h-72 object-cover rounded-xl" />
<div className="flex justify-end">
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer">Fermer</button>
</div>
</div>
</div>}
</div>;
};
