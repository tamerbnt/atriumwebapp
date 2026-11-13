import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Download,
  Sparkles,
  Home,
  ChevronDown,
  Check,
  Building2,
  Maximize2,
  Eye,
  Printer,
  Share2,
  Unlock,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { SecurityDepositRecord } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const VenueFinanceView: React.FC<any> = () => {
	const { t, language } = useTranslation();
	const isAr = language === "ar";
	const { securityDeposits, rentalBookings, releaseSecurityDeposit, deductSecurityDeposit, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, resetVenueMockData, showToast, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [deductionTarget, setDeductionTarget] = React.useState<any>(null);
	const [deductionReason, setDeductionReason] = React.useState("");
	const [deductionAmount, setDeductionAmount] = React.useState(0);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedDeposit, setSelectedDeposit] = React.useState<any>(null);
	const [inspectorTab, setInspectorTab] = React.useState("caution");
	const totalHeldCount = securityDeposits.filter((d) => d.status === "Held").length;
	const totalHeld = securityDeposits.filter((d) => d.status === "Held").reduce((sum, d) => sum + d.amount, 0);
	const totalReleased = securityDeposits.filter((d) => d.status === "Released").reduce((sum, d) => sum + d.amount, 0);
	const totalBookingRevenue = rentalBookings.reduce((sum, b) => sum + b.totalAmount, 0);
	const filteredDeposits = React.useMemo(() => {
		return securityDeposits.filter((d) => {
			if (statusFilter === "All") return true;
			return d.status === statusFilter;
		});
	}, [securityDeposits, statusFilter]);
	const handleOpenDeduct = (dep: any) => {
		setDeductionTarget(dep);
		setDeductionAmount(dep.amount);
		setDeductionReason("");
	};
	const handleConfirmDeduct = (e: any) => {
		e.preventDefault();
		if (!deductionTarget || !deductionReason.trim()) return;
		deductSecurityDeposit(deductionTarget.id, deductionReason.trim(), deductionAmount);
		setDeductionTarget(null);
	};
	const handleExportCautionCSV = () => {
		if (securityDeposits.length === 0) {
			showToast({
				type: "warning",
				title: "CSV Export",
				message: "No security deposit records to export.",
				category: "rental_booking"
			});
			return;
		}
		const headers = [
			"Deposit ID",
			"Booking ID",
			"Renter Name",
			"Space / Unit",
			"Amount (DZD)",
			"Payment Method",
			"Status",
			"Retention Reason",
			"Collected Date",
			"Released Date"
		];
		const rows = filteredDeposits.map((dep) => [
			`"${dep.id}"`,
			`"${dep.bookingId}"`,
			`"${dep.renterName.replace(/"/g, "\"\"")}"`,
			`"${dep.unitName.replace(/"/g, "\"\"")}"`,
			dep.amount,
			`"${dep.paymentMethod}"`,
			`"${dep.status}"`,
			`"${(dep.deductionReason || "").replace(/"/g, "\"\"")}"`,
			`"${dep.collectedAt}"`,
			`"${dep.releasedAt || ""}"`
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `atrium_caution_escrow_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast({
			type: "success",
			title: "CSV Exported",
			message: `${filteredDeposits.length} caution deposits exported successfully.`,
			category: "rental_booking"
		});
	};
	const getDepositActions = (dep: any) => [
		{
			label: isAr ? "معاينة الضمان" : "Consulter Caution",
			icon: /* @__PURE__ */ <Eye size={14} />,
			onClick: () => setSelectedDeposit(dep)
		},
		...dep.status === "Held" ? [{
			label: isAr ? "استرجاع الوديعة" : "Restituer Caution",
			icon: /* @__PURE__ */ <Unlock size={14} />,
			onClick: () => releaseSecurityDeposit(dep.id)
		}, {
			label: isAr ? "اقتطاع ضرر" : "Retenue Dégâts",
			icon: /* @__PURE__ */ <AlertTriangle size={14} />,
			onClick: () => handleOpenDeduct(dep)
		}] : [],
		{
			label: isAr ? "وصل الضمان" : "Reçu Caution",
			icon: /* @__PURE__ */ <Printer size={14} />,
			onClick: () => {
				showToast({
					type: "info",
					title: "Reçu Caution",
					message: `Reçu de séquestre caution émis pour ${dep.renterName}`,
					category: "rental_booking"
				});
			}
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: securityDeposits.length > 0
	});
	if (showSkeleton && (securityDeposits.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "2*",
				minWidth: "150px"
			},
			{
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn={false} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6">
<div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200"><ShieldCheck size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("venue_fin_page_title")}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative flex-wrap">
<AtriumButton type="button" variant="secondary" onClick={handleExportCautionCSV} icon={<Download size={14} />} size="sm"><span className="hidden sm:inline">CSV</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div>
<h2 className="text-base font-bold text-neutral-900 dark:text-white">
{isAr ? "الودائع الضامنة & سيولة الحسابات" : "Trésorerie & Séquestre des Cautions"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">{t("venue_fin_kpi_gross_rev")}</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
{"↗ "}
{rentalBookings.length}
{" "}
{isAr ? "عقود" : "dossiers"}
</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">{formatCurrencyAmount(totalBookingRevenue, "DZD")}</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">{t("venue_fin_kpi_released")}</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
{"✓ "}
{isAr ? "مستردة بالكامل" : "Restitué"}
</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">{formatCurrencyAmount(totalReleased, "DZD")}</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div>
<span className="text-xs font-medium text-neutral-300">{t("venue_fin_kpi_escrow")}</span>
<div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
<span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
{totalHeldCount}
{" "}
{isAr ? "ودائع محجوزة" : "cautions actives"}
</span>
</div>
</div>
<div className="text-2xl font-black text-white tabular-nums font-mono">{formatCurrencyAmount(totalHeld, "DZD")}</div>
</div>
</div>
</div>
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "سجل الودائع الضامنة" : "Registre des Cautions & Séquestres d'Événements"} subtitle={isAr ? "إدارة أموال التأمين المحجوزة للمناسبات" : "Fonds séquestrés, dégradations constatées et déblocages après événement"} headerActions={<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
									{
										value: "All",
										label: isAr ? "الكل" : "Toutes",
										count: securityDeposits.length
									},
									{
										value: "Held",
										label: isAr ? "محجوزة" : "Bloquées",
										count: totalHeldCount
									},
									{
										value: "Released",
										label: isAr ? "مستردة" : "Restituées",
										count: securityDeposits.filter((d) => d.status === "Released").length
									},
									{
										value: "Deducted",
										label: isAr ? "مقتطعة" : "Déduites",
										count: securityDeposits.filter((d) => d.status === "Deducted").length
									}
								]} aria-label="Security Deposit Status Filter" />} items={filteredDeposits} keyExtractor={(d) => d.id} searchPlaceholder={t("venue_fin_search_ph")} searchFilter={(d, query) => d.renterName.toLowerCase().includes(query.toLowerCase()) || d.unitName.toLowerCase().includes(query.toLowerCase()) || (d.deductionReason || "").toLowerCase().includes(query.toLowerCase())} onSelectRow={(d) => setSelectedDeposit(d)} customActions={(d) => getDepositActions(d)} columns={[
								{
									id: "renter",
									header: t("venue_voucher_renter_name"),
									renderCell: (d: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">{d.renterName}</span>
<span className="text-[10px] text-neutral-400 font-mono">{d.collectedAt}</span>
</div>
								},
								{
									id: "unit",
									header: t("venue_voucher_space"),
									width: "180px",
									renderCell: (d: any) => /* @__PURE__ */ <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{d.unitName}</span>
								},
								{
									id: "amount",
									header: t("venue_col_financials"),
									width: "140px",
									sortable: true,
									renderCell: (d: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">{formatCurrencyAmount(d.amount, d.currency)}</span>
								},
								{
									id: "method",
									header: isAr ? "طريقة الدفع" : "Mode Paiement",
									width: "130px",
									renderCell: (d: any) => /* @__PURE__ */ <span className="text-xs text-neutral-500 font-medium">{d.paymentMethod}</span>
								},
								{
									id: "status",
									header: t("venue_col_status"),
									width: "130px",
									renderCell: (d: any) => /* @__PURE__ */ <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${d.status === "Held" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : d.status === "Released" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
{d.status === "Held" ? t("venue_held_status") : d.status === "Released" ? t("venue_refunded_status") : t("venue_deducted_status")}
</span>
								}
							]} renderCard={(d) => /* @__PURE__ */ <div className="p-4 flex flex-col justify-between h-full space-y-3">
<div className="flex items-start justify-between gap-2">
<span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded">{formatCurrencyAmount(d.amount, d.currency)}</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === "Held" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : d.status === "Released" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
{d.status === "Held" ? "Bloquée" : d.status === "Released" ? "Restituée" : "Retenue"}
</span>
</div>
<div>
<h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-1">{d.renterName}</h4>
<p className="text-[11px] text-neutral-500 mt-0.5">
{d.unitName}
{" · "}
{d.paymentMethod}
</p>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
<span>{d.collectedAt}</span>
<span className="font-bold text-neutral-700 dark:text-neutral-300">{d.currency}</span>
</div>
</div>} />
</div>
{selectedDeposit && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><ShieldCheck size={16} /></div>
<div>
<h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">Dépôt de Garantie Caution</h3>
<p className="text-[10px] text-neutral-500 truncate max-w-[210px]">{selectedDeposit.renterName}</p>
</div>
</div>
<button onClick={() => setSelectedDeposit(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
<button onClick={() => setInspectorTab("caution")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "caution" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{isAr ? "الضمان والوديعة" : "Caution"}</button>
<button onClick={() => setInspectorTab("degradations")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "degradations" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{isAr ? "الأضرار والاقتطاع" : "Dégradations"}</button>
<button onClick={() => setInspectorTab("restitution")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "restitution" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}>{isAr ? "تاريخ الاسترجاع" : "Restitution"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{inspectorTab === "caution" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
<div className="flex items-center justify-between text-neutral-300 text-[11px]">
<span>Montant Caution Sous Séquestre</span>
<span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">{selectedDeposit.status}</span>
</div>
<div className="text-2xl font-black font-mono tracking-tight text-white">{formatCurrencyAmount(selectedDeposit.amount, selectedDeposit.currency)}</div>
<p className="text-[10px] text-neutral-400">
Bloqué sur compte séquestre de l'établissement jusqu'à l'état des lieux de sortie.
</p>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Détails de la Réservation</span>
<div className="flex items-center justify-between">
<span className="text-neutral-500">Espace Loué:</span>
<span className="font-bold text-neutral-900 dark:text-white">{selectedDeposit.unitName}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-neutral-500">Client / Organisateur:</span>
<span className="font-medium text-neutral-900 dark:text-white">{selectedDeposit.renterName}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-neutral-500">Moyen de Caution:</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedDeposit.paymentMethod}</span>
</div>
</div>
{selectedDeposit.status === "Held" && /* @__PURE__ */ <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<div>
<span className="font-semibold block text-neutral-900 dark:text-white">Restitution Intégrale</span>
<span className="text-[10px] text-neutral-500">Après état des lieux sans dégradation</span>
</div>
<button onClick={() => {
														releaseSecurityDeposit(selectedDeposit.id);
														setSelectedDeposit({
															...selectedDeposit,
															status: "Released",
															releasedAt: (/* @__PURE__ */ new Date()).toISOString()
														});
													}} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b06a4e] text-white transition-colors">Restituer ✓</button>
</div>}
</div>}
{inspectorTab === "degradations" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Constat de Dégradation & Retenue</span>
<div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
{selectedDeposit.deductionReason || "Aucune dégradation signalée lors de l'état des lieux."}
</div>
</div>
{selectedDeposit.status === "Held" && /* @__PURE__ */ <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
<span className="font-semibold text-amber-900 dark:text-amber-300 block">Appliquer une Retenue sur Caution</span>
<p className="text-[11px] text-amber-700 dark:text-amber-400">En cas de casse, salissures anormales ou mobilier endommagé.</p>
<button onClick={() => handleOpenDeduct(selectedDeposit)} className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors">Ouvrir Dossier Dégradation</button>
</div>}
</div>}
{inspectorTab === "restitution" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Historique des Mouvements</span>
<div className="space-y-1.5">
<div className="flex justify-between">
<span className="text-neutral-500">Date d'encaissement:</span>
<span className="font-mono text-neutral-900 dark:text-white">{selectedDeposit.collectedAt}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-500">Date de déblocage:</span>
<span className="font-mono text-neutral-900 dark:text-white">{selectedDeposit.releasedAt || "Toujours en cours"}</span>
</div>
</div>
</div>
</div>}
</div>
<div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
<AtriumButton variant="primary" className="w-full justify-center" icon={<Printer size={14} />} onClick={() => {
										showToast({
											type: "info",
											title: "Impression Reçu",
											message: `Bordereau de caution imprimé pour ${selectedDeposit.renterName}`,
											category: "rental_booking"
										});
									}}>{isAr ? "طباعة وصل الوديعة" : "Imprimer Reçu de Caution"}</AtriumButton>
</div>
</div>}
</div>
</div>
{deductionTarget && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md shadow-xl space-y-5">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2">
<AlertTriangle size={20} className="text-red-500" />
<h3 className="font-bold text-base text-neutral-900 dark:text-white">{t("venue_deduct_modal_title")}</h3>
</div>
<button onClick={() => setDeductionTarget(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"><X size={18} /></button>
</div>
<form onSubmit={handleConfirmDeduct} className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-xs space-y-1">
<div>
{"Locataire: "}
<strong className="text-neutral-900 dark:text-white">{deductionTarget.renterName}</strong>
</div>
<div>
{"Montant Caution: "}
<strong className="font-mono text-[#d4522f]">{formatCurrencyAmount(deductionTarget.amount, deductionTarget.currency)}</strong>
</div>
</div>
<LabelInput label="Montant à Retenir (DZD)" type="number" value={deductionAmount.toString()} onChange={(v) => setDeductionAmount(parseFloat(v) || 0)} required />
<LabelInput label="Motif des Dégradations / Réparations" value={deductionReason} onChange={setDeductionReason} placeholder="Ex: Nettoyage spécifique moquette, serrure cassée..." required />
<div className="flex justify-end gap-2 pt-2">
<AtriumButton variant="secondary" onClick={() => setDeductionTarget(null)}>{t("venue_action_cancel")}</AtriumButton>
<AtriumButton variant="primary" type="submit">{t("venue_action_confirm_deduct")}</AtriumButton>
</div>
</form>
</div>
</div>}
</div>;
};
