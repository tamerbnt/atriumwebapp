import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCcpSlip, PMExpense, PMEquipmentStock, PMPayrollBatch } from '../../../types/index';
import { CcpSlipModal } from './CcpSlipModal';
import {
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Boxes,
  CheckCircle,
  AlertCircle,
  Printer,
  Eye,
  Lock,
  Download,
  Filter,
  Search,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Check,
  Tag,
  History,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  X,
} from 'lucide-react';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonFinanceAudit } from '../../ui/skeleton/StructuralSkeletons';

interface ProjectComptaViewProps {
  initialTab?: 'payroll' | 'ccp' | 'expenses' | 'stock';
}



export const ProjectComptaView: React.FC<ProjectComptaViewProps> = ({ initialTab }) => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, pmPayrollBatches, pmCcpSlips, pmExpenses, pmEquipmentStock, generatePmCcpSlipsForBatch, markPmCcpSlipPrinted, batchMarkPmCcpSlipsPrinted, approvePmExpense, batchApprovePmExpenses, batchDeletePmExpenses, updatePmEquipmentStatus, batchUpdatePmEquipmentStatus, batchDeletePmEquipmentStock, resetPmMockData, activePmSubScreen, setActivePmSubScreen, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
	const activeTab = activePmSubScreen === "ccp" || initialTab === "ccp" ? "ccp" : activePmSubScreen === "expenses" || initialTab === "expenses" ? "expenses" : activePmSubScreen === "stock" || initialTab === "stock" ? "stock" : "payroll";
	const setActiveTab = (tab: any) => {
		setActivePmSubScreen(tab);
	};
	const [selectedSlip, setSelectedSlip] = React.useState<any>(null);
	const [selectedReceiptUrl, setSelectedReceiptUrl] = React.useState<any>(null);
	const [selectedStockAssetId, setSelectedStockAssetId] = React.useState(pmEquipmentStock[0]?.id || "eq_00");
	const [stockCategoryFilter, setStockCategoryFilter] = React.useState("all");
	const [batchGeneratedSuccess, setBatchGeneratedSuccess] = React.useState(false);
	const [ccpSearch, setCcpSearch] = React.useState("");
	const [selectedSlipIds, setSelectedSlipIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedSlipIds, setPinnedSlipIds] = React.useState(/* @__PURE__ */ new Set());
	const [slipSortBy, setSlipSortBy] = React.useState("beneficiary");
	const [slipSortDir, setSlipSortDir] = React.useState("asc");
	const [expenseSearch, setExpenseSearch] = React.useState("");
	const [selectedExpenseIds, setSelectedExpenseIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedExpenseIds, setPinnedExpenseIds] = React.useState(/* @__PURE__ */ new Set());
	const [stockSearch, setStockSearch] = React.useState("");
	const [selectedStockIds, setSelectedStockIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedStockIds, setPinnedStockIds] = React.useState(/* @__PURE__ */ new Set());
	const filteredSlips = React.useMemo(() => {
		return pmCcpSlips.filter((s) => {
			const q = ccpSearch.toLowerCase().trim();
			return !q || s.beneficiaryName.toLowerCase().includes(q) || s.ccpNumber.includes(q) || s.wilayaName.toLowerCase().includes(q) || s.transactionReference.toLowerCase().includes(q);
		});
	}, [pmCcpSlips, ccpSearch]);
	const sortedSlips = React.useMemo(() => {
		return [...filteredSlips].sort((a, b) => {
			const aPinned = pinnedSlipIds.has(a.id);
			const bPinned = pinnedSlipIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (slipSortBy === "beneficiary") {
				const cmp = a.beneficiaryName.localeCompare(b.beneficiaryName);
				return slipSortDir === "asc" ? cmp : -cmp;
			}
			if (slipSortBy === "amount") return slipSortDir === "asc" ? a.amountDzd - b.amountDzd : b.amountDzd - a.amountDzd;
			return 0;
		});
	}, [
		filteredSlips,
		pinnedSlipIds,
		slipSortBy,
		slipSortDir
	]);
	const filteredExpenses = React.useMemo(() => {
		return pmExpenses.filter((e) => {
			const q = expenseSearch.toLowerCase().trim();
			return !q || e.title.toLowerCase().includes(q) || e.projectTitle.toLowerCase().includes(q) || e.declaredByUserName.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
		});
	}, [pmExpenses, expenseSearch]);
	const filteredStock = React.useMemo(() => {
		return pmEquipmentStock.filter((eq) => {
			const q = stockSearch.toLowerCase().trim();
			const matchQ = !q || eq.assetCode.toLowerCase().includes(q) || eq.title.toLowerCase().includes(q) || eq.currentCustodianName?.toLowerCase().includes(q);
			const matchCat = stockCategoryFilter === "all" || eq.category === stockCategoryFilter;
			return matchQ && matchCat;
		});
	}, [
		pmEquipmentStock,
		stockSearch,
		stockCategoryFilter
	]);
	const ccpColumns = React.useMemo(() => [
		{
			key: "beneficiary",
			header: "Bénéficiaire Animateur",
			width: "2.5*",
			minWidth: "220px",
			sortable: true,
			renderCell: (slip: any) => {
				const isPinned = pinnedSlipIds.has(slip.id);
				return /* @__PURE__ */ <div className="flex items-center gap-2.5">
<button type="button" onClick={(e) => {
							e.stopPropagation();
							setPinnedSlipIds((prev) => {
								const next = new Set(prev);
								if (next.has(slip.id)) next.delete(slip.id);
								else next.add(slip.id);
								return next;
							});
						}} className={`p-1 rounded-lg transition-colors cursor-pointer ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}><Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} /></button>
<div>
<div className="font-semibold text-xs text-black dark:text-white">{slip.beneficiaryName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[190px]">
{slip.wilayaName}
{" · "}
{slip.transactionReference}
</div>
</div>
</div>;
			}
		},
		{
			key: "ccp",
			header: "Compte CCP & Clé",
			width: "1.8*",
			minWidth: "170px",
			renderCell: (slip: any) => /* @__PURE__ */ <div className="font-mono text-xs text-black/70 dark:text-white/75">
<span className="font-bold">{slip.ccpNumber}</span>
{" / Clé "}
<span className="font-bold">{slip.ccpKey}</span>
</div>
		},
		{
			key: "amount",
			header: "Montant Net DZD",
			width: "1.5*",
			minWidth: "140px",
			sortable: true,
			align: "right",
			renderCell: (slip: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{formatMoney(slip.amountDzd, "DZD")}</div>
		},
		{
			key: "status",
			header: "Statut Mandat",
			width: "1.3*",
			minWidth: "130px",
			align: "center",
			renderCell: (slip: any) => /* @__PURE__ */ <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${slip.isPrinted ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}`}>{slip.isPrinted ? "Bordereau Imprimé" : "À Imprimer (SFP 01)"}</span>
		},
		{
			key: "actions",
			header: "Imprimer SFP 01",
			width: "1.2*",
			minWidth: "130px",
			align: "right",
			renderCell: (slip: any) => /* @__PURE__ */ <button type="button" onClick={() => setSelectedSlip(slip)} className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto">
<Printer className="w-3.5 h-3.5" />
<span>Mandat</span>
</button>
		}
	], [pinnedSlipIds]);
	const expenseColumns = React.useMemo(() => [
		{
			key: "expense",
			header: "Désignation & Déclarant",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (exp: any) => /* @__PURE__ */ <div>
<div className="font-semibold text-xs text-black dark:text-white">{exp.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{"Par "}
{exp.declaredByUserName}
{" ("}
{exp.declaredByRole}
{") · "}
{exp.projectTitle}
</div>
</div>
		},
		{
			key: "category",
			header: "Catégorie",
			width: "1.5*",
			minWidth: "140px",
			renderCell: (exp: any) => /* @__PURE__ */ <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75">{exp.category}</span>
		},
		{
			key: "amount",
			header: "Montant DZD",
			width: "1.5*",
			minWidth: "140px",
			align: "right",
			renderCell: (exp: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{formatMoney(exp.amountDzd, "DZD")}</div>
		},
		{
			key: "fiscal",
			header: "Fiscalité",
			width: "1.2*",
			minWidth: "120px",
			align: "center",
			renderCell: (exp: any) => /* @__PURE__ */ <span className={`text-[11px] font-bold ${exp.hasFiscalInvoice ? "text-emerald-600" : "text-black/55 dark:text-white/55"}`}>{exp.hasFiscalInvoice ? "Facture NIF" : "Reçu simple"}</span>
		},
		{
			key: "actions",
			header: "Justificatif",
			width: "1*",
			minWidth: "100px",
			align: "right",
			renderCell: (exp: any) => /* @__PURE__ */ <button type="button" onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer ml-auto" title="Inspecter le scan"><Eye className="w-4 h-4" /></button>
		}
	], []);
	const stockColumns = React.useMemo(() => [
		{
			key: "code",
			header: "Code Actif & Désignation",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (eq: any) => /* @__PURE__ */ <div className="flex items-center gap-2.5">
<div className="font-mono text-xs font-bold text-[#d4522f]">{eq.assetCode}</div>
<div>
<div className="font-semibold text-xs text-black dark:text-white">{eq.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{"Affecté à : "}
{eq.currentCustodianName || "Agence"}
</div>
</div>
</div>
		},
		{
			key: "cost",
			header: "Coût Acquisition",
			width: "1.5*",
			minWidth: "140px",
			align: "right",
			renderCell: (eq: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{formatMoney(eq.acquisitionCostDzd, "DZD")}</div>
		},
		{
			key: "status",
			header: "État Actif",
			width: "1.5*",
			minWidth: "150px",
			align: "center",
			renderCell: (eq: any) => {
				const b = ({
					in_warehouse: {
						label: "En Stock Agence",
						bg: "bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75",
						text: ""
					},
					deployed_on_mission: {
						label: "Déployé sur Terrain",
						bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
						text: ""
					},
					under_repair: {
						label: "En Maintenance",
						bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
						text: ""
					},
					retired_scrapped: {
						label: "Réformé / Amorti",
						bg: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
						text: ""
					}
				} as Record<string, any>)[eq.currentStatus] || {
					label: eq.currentStatus,
					bg: "bg-[#F3EDE7] text-black/70 dark:text-white/75"
				};
				return /* @__PURE__ */ <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${b.bg}`}>{b.label}</span>;
			}
		}
	], []);
	const handleExportCcpCsv = () => {
		const headers = [
			"Bénéficiaire",
			"Numéro CCP",
			"Clé",
			"Wilaya",
			"Montant DZD",
			"Montant en Lettres",
			"Référence",
			"Imprimé"
		];
		const rows = sortedSlips.map((s) => [
			`"${s.beneficiaryName.replace(/"/g, "\"\"")}"`,
			`"${s.ccpNumber}"`,
			`"${s.ccpKey}"`,
			`"${s.wilayaName}"`,
			s.amountDzd,
			`"${s.amountInWordsFr}"`,
			`"${s.transactionReference}"`,
			s.isPrinted ? "Oui" : "Non"
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `bordereaux_ccp_sfp01_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const handleGenerateAllCcpBatch = () => {
		pmPayrollBatches.filter((b) => b.status === "approved_by_direction").forEach((batch) => {
			generatePmCcpSlipsForBatch(batch.id);
		});
		setBatchGeneratedSuccess(true);
		setTimeout(() => {
			setBatchGeneratedSuccess(false);
			setActiveTab("ccp");
		}, 1500);
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: pmPayrollBatches.length > 0 || pmCcpSlips.length > 0
	});
	if (showSkeleton && (pmPayrollBatches.length === 0 && pmCcpSlips.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonFinanceAudit isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<div>
<div className="flex items-center gap-2">
<span className="text-xs font-semibold uppercase tracking-wider text-[#d4522f]">Comptabilité & Trésorerie</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs text-black/55 dark:text-white/55">Décaissements & Mandats CCP SFP 01</span>
</div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{activeTab === "payroll" ? "Lots de Paie Validés DG" : activeTab === "ccp" ? "Bordereaux CCP SFP 01 (Algérie Poste)" : activeTab === "expenses" ? "Remboursements Achats & Frais" : "Suivi Stock & Matériel"}
</h1>
</div>
<div className="flex items-center gap-2.5">
{activeTab === "ccp" && /* @__PURE__ */ <button onClick={handleExportCcpCsv} className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/75 bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700 hover:bg-[#FBF8F5] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
<Download className="w-3.5 h-3.5" />
<span>Export CSV</span>
</button>}
</div>
</div>
<div className="flex border-b border-[#E6DED6] dark:border-neutral-800 gap-1 overflow-x-auto">
{[
					{
						id: "payroll",
						label: "Paies Validées DG",
						icon: CreditCard,
						count: pmPayrollBatches.filter((b) => b.status === "approved_by_direction").length
					},
					{
						id: "ccp",
						label: "Bordereaux CCP SFP 01",
						icon: Printer,
						count: pmCcpSlips.length
					},
					{
						id: "expenses",
						label: "Remboursements Achats",
						icon: Receipt,
						count: pmExpenses.filter((e) => e.status === "approved_by_direction").length
					},
					{
						id: "stock",
						label: "Stock & Mobilier",
						icon: Boxes,
						count: pmEquipmentStock.length
					}
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return /* @__PURE__ */ <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${isActive ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>
<Icon className="w-4 h-4" />
<span>{tab.label}</span>
{tab.count !== void 0 && tab.count > 0 && /* @__PURE__ */ <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75">{tab.count}</span>}
</button>;
				})}
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">Trésorerie Agence & Décaissements Postaux</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Bordereaux CCP Émis</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmCcpSlips.length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{pmCcpSlips.filter((s) => s.isPrinted).length}
{" imprimés et remis à la poste"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Remboursements DG Validés</span>
<div>
<div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmExpenses.filter((e) => e.status === "approved_by_direction").length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{"Sur "}
{pmExpenses.length}
{" justificatifs déclarés"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">Volume Mandats CCP SFP 01</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">POSTE ALGÉRIE</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(pmCcpSlips.reduce((sum, s) => sum + s.amountDzd, 0), "DZD")}</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>Liquidité postale décaissement effectif</span>
</p>
</div>
</div>
</div>
</div>
{activeTab === "payroll" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="p-5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Génération des Mandats Postaux (Slide 10)</span>
<h2 className="text-lg font-bold text-black dark:text-white mt-0.5 font-['Barlow_Condensed',sans-serif] rtl:font-sans">Déblocage Trésorerie Postale</h2>
</div>
{pmPayrollBatches.some((b) => b.status === "approved_by_direction") && /* @__PURE__ */ <button type="button" onClick={handleGenerateAllCcpBatch} className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0">
<Printer className="w-4 h-4" />
Générer Tous les Bordereaux CCP ➔
</button>}
</div>
<div className="space-y-3">
{pmPayrollBatches.map((batch) => /* @__PURE__ */ <div key={batch.id} className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="font-mono font-bold text-xs text-black dark:text-white">{batch.batchNumber}</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs text-black/70 dark:text-white/75 font-semibold">{batch.projectTitle}</span>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${batch.status === "ccp_generated" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
{batch.status === "ccp_generated" ? "Bordereaux CCP Prêts" : "Validé DG — Prêt CCP"}
</span>
</div>
<p className="text-xs text-black/55 dark:text-white/55">
{"Mission "}
{batch.missionCode}
{" · "}
{batch.totalBeneficiaries}
{" animateurs avec numéros CCP et clés vérifiés."}
</p>
</div>
<div className="flex items-center gap-4 shrink-0">
<div className="text-right">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">Montant Global</span>
<span className="font-mono font-bold text-lg text-black dark:text-white tabular-nums">{formatMoney(batch.totalAmountDzd, "DZD")}</span>
</div>
{batch.status !== "ccp_generated" && /* @__PURE__ */ <button type="button" onClick={() => generatePmCcpSlipsForBatch(batch.id)} className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
<Printer className="w-4 h-4" />
Générer CCP
</button>}
</div>
</div>)}
</div>
</div>}
{activeTab === "ccp" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex items-center justify-between">
<Seek value={ccpSearch} onChange={setCcpSearch} placeholder="Rechercher par animateur, compte CCP ou wilaya..." openWidth={360} shutSize={38} />
<span className="text-xs text-black/55 dark:text-white/55 font-semibold">
{filteredSlips.length}
{" bordereau(x) prêt(s) pour Algérie Poste"}
</span>
</div>
{selectedSlipIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between px-4 py-3 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-2xl animate-in fade-in">
<div className="flex items-center gap-3 text-xs font-semibold text-[#DC2626]">
<span>
{selectedSlipIds.size}
{" mandat(s) postal(aux) sélectionné(s)"}
</span>
<button type="button" onClick={() => setSelectedSlipIds(/* @__PURE__ */ new Set())} className="text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white underline cursor-pointer">Désélectionner</button>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => {
									batchMarkPmCcpSlipsPrinted(Array.from(selectedSlipIds));
									setSelectedSlipIds(/* @__PURE__ */ new Set());
								}} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
<Printer className="w-3.5 h-3.5" />
Marquer Imprimés
</button>
</div>
</div>}
<UniversalDataCollection items={sortedSlips} keyExtractor={(s) => s.id} defaultViewMode="list" columns={ccpColumns} sortBy={slipSortBy} sortDirection={slipSortDir} onSortChange={(key) => {
							if (slipSortBy === key) setSlipSortDir((prev) => prev === "asc" ? "desc" : "asc");
							else {
								setSlipSortBy(key);
								setSlipSortDir("asc");
							}
						}} selectedIds={selectedSlipIds} onSelectionChange={setSelectedSlipIds} renderCard={(slip) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-1">
<div className="flex items-center justify-between text-xs font-bold text-black dark:text-white">
<span>{slip.beneficiaryName}</span>
<span className="font-mono text-black/55 dark:text-white/55">{slip.wilayaName}</span>
</div>
<div className="font-mono text-xs text-black/70 dark:text-white/75">
{"CCP : "}
{slip.ccpNumber}
{" / "}
{slip.ccpKey}
</div>
<p className="text-[11px] text-black/55 dark:text-white/55 truncate">{slip.transactionReference}</p>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
<span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">{formatMoney(slip.amountDzd, "DZD")}</span>
<button type="button" onClick={() => setSelectedSlip(slip)} className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg flex items-center gap-1 cursor-pointer">
<Printer className="w-3 h-3" />
Mandat
</button>
</div>
</div>} />
</div>}
{activeTab === "expenses" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex items-center justify-between">
<Seek value={expenseSearch} onChange={setExpenseSearch} placeholder="Rechercher par titre de frais ou déclarant..." openWidth={360} shutSize={38} />
{selectedExpenseIds.size > 0 && /* @__PURE__ */ <div className="flex items-center gap-2">
<button type="button" onClick={() => {
								batchApprovePmExpenses(Array.from(selectedExpenseIds));
								setSelectedExpenseIds(/* @__PURE__ */ new Set());
							}} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer">Valider Remboursement</button>
<button type="button" onClick={() => {
								batchDeletePmExpenses(Array.from(selectedExpenseIds));
								setSelectedExpenseIds(/* @__PURE__ */ new Set());
							}} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
<Trash2 className="w-3.5 h-3.5" />
Supprimer
</button>
</div>}
</div>
<UniversalDataCollection items={filteredExpenses} keyExtractor={(e) => e.id} defaultViewMode="list" columns={expenseColumns} selectedIds={selectedExpenseIds} onSelectionChange={setSelectedExpenseIds} renderCard={(exp) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-1">
<div className="flex items-center justify-between text-xs">
<span className="font-mono text-black/55 dark:text-white/55">{exp.missionCode || exp.projectTitle}</span>
<span className="capitalize text-black/55 dark:text-white/55 font-semibold">{exp.category}</span>
</div>
<h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">{exp.title}</h4>
<p className="text-xs text-black/55 dark:text-white/55">
{"Par "}
{exp.declaredByUserName}
</p>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
<span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">{formatMoney(exp.amountDzd, "DZD")}</span>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${exp.status === "approved_by_direction" ? "bg-emerald-100 text-emerald-700" : exp.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{exp.status.replace(/_/g, " ")}</span>
</div>
</div>} />
</div>}
{activeTab === "stock" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-wrap items-center justify-between gap-4">
<div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
<Seek value={stockSearch} onChange={setStockSearch} placeholder="Rechercher équipement par code actif ou nom..." openWidth={360} shutSize={38} />
<FilterSelect label="Catégorie" value={stockCategoryFilter} onChange={(val) => setStockCategoryFilter(typeof val === "string" ? val : val.target?.value || val)} options={[
								{
									value: "all",
									label: language === "ar" ? "الكل" : language === "fr" ? "Toutes" : "All",
									tooltip: language === "ar" ? "جميع الفئات" : language === "fr" ? "Toutes les catégories" : "All categories"
								},
								{
									value: "counter_desk",
									label: language === "ar" ? "منصات" : language === "fr" ? "Comptoirs" : "Counters",
									tooltip: language === "ar" ? "منصات ومكاتب عرض" : language === "fr" ? "Comptoirs & Stands" : "Counters & booths"
								},
								{
									value: "display_totem",
									label: language === "ar" ? "هياكل" : language === "fr" ? "Totems" : "Totems",
									tooltip: language === "ar" ? "أعمدة وهياكل" : language === "fr" ? "Totems & Structures" : "Totems & structures"
								},
								{
									value: "sound_tech",
									label: language === "ar" ? "صوتيات" : language === "fr" ? "Sono" : "Audio",
									tooltip: language === "ar" ? "صوتيات وإلكترونيات" : language === "fr" ? "Sono & Électronique" : "Audio & electronics"
								},
								{
									value: "uniforms",
									label: language === "ar" ? "أزياء" : language === "fr" ? "Textiles" : "Apparel",
									tooltip: language === "ar" ? "أزياء الوكالة" : language === "fr" ? "Textiles Agence" : "Agency uniforms"
								}
							]} />
</div>
<div className="text-xs text-black/55 dark:text-white/55 font-semibold">
{filteredStock.length}
{" actif(s) en inventaire"}
</div>
</div>
<UniversalDataCollection items={filteredStock} keyExtractor={(eq) => eq.id} defaultViewMode="list" columns={stockColumns} selectedIds={selectedStockIds} onSelectionChange={setSelectedStockIds} renderCard={(eq) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-1">
<div className="flex items-center justify-between text-xs font-mono font-bold text-[#d4522f]">
<span>{eq.assetCode}</span>
<span className="text-black/55 dark:text-white/55 font-normal">{eq.category}</span>
</div>
<h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">{eq.title}</h4>
<p className="text-xs text-black/55 dark:text-white/55">
{"État : "}
{eq.conditionReport}
</p>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
<span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">{formatMoney(eq.acquisitionCostDzd, "DZD")}</span>
<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 capitalize">{eq.currentStatus.replace(/_/g, " ")}</span>
</div>
</div>} />
</div>}
{selectedSlip && /* @__PURE__ */ <CcpSlipModal isOpen={Boolean(selectedSlip)} onClose={() => setSelectedSlip(null)} slip={selectedSlip} onMarkPrinted={() => {
					markPmCcpSlipPrinted(selectedSlip.id);
					setSelectedSlip(null);
				}} />}
{selectedReceiptUrl && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
<Receipt className="w-4 h-4 text-[#d4522f]" />
Justificatif Fiscal d'Achat
</h3>
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<img src={selectedReceiptUrl} alt="Scan Justificatif" className="w-full h-72 object-cover rounded-xl" />
<div className="flex justify-end">
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 rounded-xl cursor-pointer">Fermer</button>
</div>
</div>
</div>}
</div>;
};
