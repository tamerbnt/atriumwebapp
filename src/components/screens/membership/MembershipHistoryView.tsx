import React, { useState, useMemo } from 'react';
import {
  History,
  Receipt,
  CreditCard,
  Banknote,
  User,
  Home,
  ChevronDown,
  Download,
  Maximize2,
  X,
  Check,
  Building2,
  Printer,
  Scissors,
  RotateCcw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LabelSelect } from '../../ui/LabelSelect';
import { t } from '../../../utils/i18n';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonFinanceAudit } from '../../ui/skeleton/StructuralSkeletons';



export const MembershipHistoryView: React.FC<any> = () => {
	const { sales, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, setScreen, refundSale, language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [methodFilter, setMethodFilter] = React.useState("All");
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [selectedSale, setSelectedSale] = React.useState<any>(null);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);
	const [refundReason, setRefundReason] = React.useState("Customer return / exchange");
	const [refundSuccessToast, setRefundSuccessToast] = React.useState<any>(null);
	const [selectedSaleIds, setSelectedSaleIds] = React.useState<Set<string>>(() => new Set());
	const [pinnedSaleIds, setPinnedSaleIds] = React.useState<Set<string>>(() => new Set());
	const [saleSortBy, setSaleSortBy] = React.useState("date");
	const [saleSortDir, setSaleSortDir] = React.useState<"asc" | "desc">("desc");
	const filteredSales = React.useMemo(() => {
		return sales.filter((s) => {
			if (statusFilter === "Settled" && s.status === "Refunded") return false;
			if (statusFilter === "Refunded" && s.status !== "Refunded") return false;
			if (methodFilter !== "All" && s.paymentMethod !== methodFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchId = s.id.toLowerCase().includes(q);
				const matchName = s.memberName?.toLowerCase().includes(q);
				const matchMethod = s.paymentMethod.toLowerCase().includes(q);
				const matchItem = s.items.some((i) => i.productName.toLowerCase().includes(q));
				if (!matchId && !matchName && !matchMethod && !matchItem) return false;
			}
			return true;
		});
	}, [
		sales,
		statusFilter,
		methodFilter,
		searchQuery
	]);
	const statusCounts = React.useMemo(() => ({
		all: sales.length,
		settled: sales.filter((s) => s.status !== "Refunded").length,
		refunded: sales.filter((s) => s.status === "Refunded").length
	}), [sales]);
	const totalSettledAmount = React.useMemo(() => {
		return sales.reduce((sum, s) => sum + s.totalAmount, 0);
	}, [sales]);
	const cashShare = React.useMemo(() => {
		const cashTotal = sales.filter((s) => s.paymentMethod === "Cash").reduce((sum, s) => sum + s.totalAmount, 0);
		return totalSettledAmount > 0 ? Math.round(cashTotal / totalSettledAmount * 100) : 0;
	}, [sales, totalSettledAmount]);
	const sortedSales = React.useMemo(() => {
		return [...filteredSales].sort((a, b) => {
			const aPinned = pinnedSaleIds.has(a.id);
			const bPinned = pinnedSaleIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (saleSortBy === "date") {
				const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				return saleSortDir === "asc" ? cmp : -cmp;
			}
			if (saleSortBy === "id") {
				const cmp = a.id.localeCompare(b.id);
				return saleSortDir === "asc" ? cmp : -cmp;
			}
			if (saleSortBy === "customer") {
				const cmp = (a.memberName || "").localeCompare(b.memberName || "");
				return saleSortDir === "asc" ? cmp : -cmp;
			}
			if (saleSortBy === "total") {
				const cmp = a.totalAmount - b.totalAmount;
				return saleSortDir === "asc" ? cmp : -cmp;
			}
			if (saleSortBy === "method") {
				const cmp = a.paymentMethod.localeCompare(b.paymentMethod);
				return saleSortDir === "asc" ? cmp : -cmp;
			}
			return 0;
		});
	}, [
		filteredSales,
		pinnedSaleIds,
		saleSortBy,
		saleSortDir
	]);
	const handleExportCSV = () => {
		const headers = [
			"Receipt ID",
			"Date",
			"Time",
			"Customer",
			"Items Count",
			"Payment Method",
			"Total (DA)"
		];
		const rows = filteredSales.map((s) => [
			`"${s.id}"`,
			`"${new Date(s.createdAt).toLocaleDateString()}"`,
			`"${new Date(s.createdAt).toLocaleTimeString()}"`,
			`"${s.memberName || "Guest Walk-In"}"`,
			`"${s.items.length}"`,
			`"${s.paymentMethod}"`,
			`"${s.totalAmount}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `atrium-sales-audit-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const getLocalizedPaymentMethod = (method: any) => {
		if (method === "Cash") return language === "ar" ? "نقداً" : language === "fr" ? "Espèces" : "Cash";
		if (method === "Card") return language === "ar" ? "بطاقة بنكية" : language === "fr" ? "Carte bancaire" : "Card";
		if (method === "Split") return language === "ar" ? "مقسم" : language === "fr" ? "Mixte" : "Split";
		if (method === "MemberBalance") return language === "ar" ? "رصيد المشترك" : language === "fr" ? "Solde adhérent" : "Member Balance";
		return method;
	};
	const saleColumns = React.useMemo(() => [
		{
			key: "id",
			header: language === "ar" ? "رقم الوصل" : language === "fr" ? "N° Ticket" : "Receipt ID",
			width: "1.2*",
			minWidth: "110px",
			sortable: true,
			renderCell: (sale: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-[#d4522f]">
#
{sale.id}
</span>
		},
		{
			key: "date",
			header: language === "ar" ? "التاريخ والوقت" : language === "fr" ? "Date & Heure" : "Date & Time",
			width: "1.5*",
			minWidth: "130px",
			sortable: true,
			renderCell: (sale: any) => /* @__PURE__ */ <div className="text-xs text-black/72 dark:text-white/75 tabular-nums">
<span>{new Date(sale.createdAt).toLocaleDateString()}</span>
<span className="text-black/62 dark:text-white/65 ml-1.5 font-mono text-[11px]">
{new Date(sale.createdAt).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit"
					})}
</span>
</div>
		},
		{
			key: "customer",
			header: language === "ar" ? "العميل / المشترك" : language === "fr" ? "Client / Adhérent" : "Customer",
			width: "2*",
			minWidth: "150px",
			sortable: true,
			renderCell: (sale: any) => /* @__PURE__ */ <div className="flex items-center gap-2">
<div className="w-7 h-7 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center text-xs font-bold text-black/72 dark:text-white/80 shrink-0">{(sale.memberName || "G").charAt(0).toUpperCase()}</div>
<div className="min-w-0">
<span className="text-xs font-bold text-black dark:text-white truncate block">
{sale.memberName || (language === "ar" ? "زائر غير مسجل" : language === "fr" ? "Client de passage" : "Guest Walk-In")}
</span>
{sale.customerPhone && /* @__PURE__ */ <span className="text-[11px] text-black/62 dark:text-white/65 font-mono block tabular-nums">{sale.customerPhone}</span>}
</div>
</div>
		},
		{
			key: "items",
			header: language === "ar" ? "الأصناف المشتراة" : language === "fr" ? "Articles achetés" : "Purchased Items",
			width: "2.5*",
			minWidth: "180px",
			renderCell: (sale: any) => /* @__PURE__ */ <div className="flex items-center gap-1.5 flex-wrap">
{sale.items.slice(0, 3).map((it: any, idx: number) => /* @__PURE__ */ <span key={idx} className="px-2 py-0.5 rounded-md bg-[#F3EDE7] dark:bg-[#262422] text-[11px] font-medium text-black/72 dark:text-white/80">
{it.quantity}
{"x "}
{it.productName}
</span>)}
{sale.items.length > 3 && /* @__PURE__ */ <span className="text-[11px] text-black/62 dark:text-white/65 font-bold tabular-nums">
+
{sale.items.length - 3}
</span>}
{sale.notes && /* @__PURE__ */ <span className="px-2 py-0.5 rounded-md bg-[#d4522f]/10 text-[#d4522f] text-[11px] font-semibold flex items-center gap-1 border border-[#d4522f]/20">
<Scissors size={10} />
<span className="truncate max-w-[120px]">{sale.notes.replace("Salon Appointment Checkout — ", "")}</span>
</span>}
</div>
		},
		{
			key: "method",
			header: language === "ar" ? "طريقة الدفع" : language === "fr" ? "Mode de règlement" : "Tender Method",
			width: "1.8*",
			minWidth: "130px",
			sortable: true,
			renderCell: (sale: any) => /* @__PURE__ */ <div className="flex items-center gap-1.5">
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#F3EDE7] dark:bg-[#262422] text-black/72 dark:text-white/80">
{sale.paymentMethod === "Cash" && /* @__PURE__ */ <Banknote size={13} className="text-emerald-600" />}
{sale.paymentMethod === "Card" && /* @__PURE__ */ <CreditCard size={13} className="text-blue-600" />}
{sale.paymentMethod === "Split" && /* @__PURE__ */ <CreditCard size={13} className="text-purple-600" />}
{sale.paymentMethod === "MemberBalance" && /* @__PURE__ */ <User size={13} className="text-[#d4522f]" />}
<span>{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
</span>
{sale.status === "Refunded" && /* @__PURE__ */ <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{language === "ar" ? "مسترجع" : language === "fr" ? "Remboursé" : "Refunded"}</span>}
</div>
		},
		{
			key: "total",
			header: language === "ar" ? "المبلغ المحصل" : language === "fr" ? "Montant réglé" : "Settled Amount",
			width: "1.4*",
			minWidth: "110px",
			sortable: true,
			renderCell: (sale: any) => /* @__PURE__ */ <div className="text-right tabular-nums">
<div className={`text-xs font-black font-mono ${sale.status === "Refunded" ? "line-through text-black/62 dark:text-white/65" : "text-black dark:text-white"}`}>{formatMoney(sale.totalAmount)}</div>
{sale.status === "Refunded" && /* @__PURE__ */ <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{language === "ar" ? "تم الإلغاء" : language === "fr" ? "Annulé" : "Cancelled"}</div>}
</div>
		}
	], [language]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: sales.length > 0
	});
	if (showSkeleton && (sales.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonFinanceAudit isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200 relative">
{refundSuccessToast && /* @__PURE__ */ <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded-2xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
<div className="flex items-center gap-2">
<Check size={16} className="text-rose-600" />
<span>{refundSuccessToast}</span>
</div>
<button type="button" onClick={() => setRefundSuccessToast(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer"><X size={14} /></button>
</div>}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
<div className="flex items-center gap-3.5 sm:gap-4">
<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white"><History size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">{t("history_sales_ledger", language)}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative">
<AtriumButton type="button" variant="primary" onClick={() => setScreen("shop")} icon={<Receipt size={15} strokeWidth={2.5} />}><span>{t("shop_title", language)}</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div>
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
{language === "ar" ? "التسويات المالية ومؤشرات التدقيق" : language === "fr" ? "Règlements financiers & Piste d'audit" : "Payments & Audit"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{language === "ar" ? "إجمالي الحجم المحصل" : language === "fr" ? "Volume total rapproché" : "Total Reconciled Volume"}
</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md tabular-nums">
{"↗ 100% "}
{language === "ar" ? "مدقق" : language === "fr" ? "Audité" : "Audited"}
</span>
</div>
</div>
<div className="text-[26px] lg:text-[28px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalSettledAmount)}</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{language === "ar" ? "نسبة الدفع النقدي" : language === "fr" ? "Part des espèces" : "Cash Tender Ratio"}
</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-md tabular-nums">
{cashShare}
{"% "}
{language === "ar" ? "نقداً" : language === "fr" ? "Espèces" : "Cash"}
</span>
</div>
</div>
<div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{sales.length}
{" "}
<span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">
{language === "ar" ? "وصل صادر" : language === "fr" ? "reçus émis" : "receipts issued"}
</span>
</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-sm">
<div className="flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-white/75">
{language === "ar" ? "حالة نقطة البيع النشطة" : language === "fr" ? "État du terminal actif" : "Active Terminal State"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25">POS-01</span>
</div>
<div>
<div className="text-[22px] lg:text-[24px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{language === "ar" ? "متصل ومحدث" : language === "fr" ? "En Ligne & Synchronisé" : "Online & Synchronized"}
</div>
<p className="text-[11.5px] text-white/68 mt-1.5">
{language === "ar" ? "صندوق الاستقبال POS-01" : language === "fr" ? "Caisse d'accueil POS-01" : "Frontdesk Register POS-01"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<Receipt size={16} className="text-black/62 dark:text-white/65" />
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
{language === "ar" ? "سجل العمليات والوصولات" : language === "fr" ? "Journal des transactions" : "Transactions & Sales Collection"}
</h2>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "البحث عن رقم الوصل، المشترك، المنتج..." : language === "fr" ? "Rechercher ticket, client, produit..." : "Search receipt ID, member, item..."} shutSize={36} openWidth={230} />
<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
									{
										value: "All",
										label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
										tooltip: language === "ar" ? "جميع المعاملات" : language === "fr" ? "Toutes les transactions" : "All transactions",
										count: statusCounts.all
									},
									{
										value: "Settled",
										label: language === "ar" ? "مسدد" : language === "fr" ? "Encaissé" : "Settled",
										tooltip: language === "ar" ? "العمليات المسددة" : language === "fr" ? "Transactions encaissées" : "Settled payments",
										count: statusCounts.settled
									},
									{
										value: "Refunded",
										label: language === "ar" ? "مسترجع" : language === "fr" ? "Remboursé" : "Refunded",
										tooltip: language === "ar" ? "العمليات المسترجعة" : language === "fr" ? "Transactions remboursées" : "Refunded transactions",
										count: statusCounts.refunded
									}
								]} aria-label="Billing Status Filter" />
<LiveSegmentedControl size="sm" value={methodFilter} onValueChange={(val) => setMethodFilter(val)} options={[
									{
										value: "All",
										label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
										tooltip: language === "ar" ? "كل طرق الدفع" : language === "fr" ? "Tous moyens de paiement" : "All payment methods"
									},
									{
										value: "Cash",
										label: language === "ar" ? "نقداً" : language === "fr" ? "Espèces" : "Cash",
										tooltip: language === "ar" ? "نقداً" : language === "fr" ? "Paiement en espèces" : "Cash payment"
									},
									{
										value: "Card",
										label: language === "ar" ? "بطاقة" : language === "fr" ? "Carte" : "Card",
										tooltip: language === "ar" ? "بطاقة CIB / الذهبية" : language === "fr" ? "Carte CIB / Dahabia" : "Card (CIB / Dahabia)"
									},
									{
										value: "Split",
										label: language === "ar" ? "مقسم" : language === "fr" ? "Mixte" : "Split",
										tooltip: language === "ar" ? "دفع مقسم" : language === "fr" ? "Paiement mixte" : "Split payment"
									},
									{
										value: "MemberBalance",
										label: language === "ar" ? "الرصيد" : language === "fr" ? "Solde" : "Balance",
										tooltip: language === "ar" ? "من رصيد المشترك" : language === "fr" ? "Débit sur solde adhérent" : "Member balance"
									}
								]} aria-label="Payment Method Filter" />
<AtriumButton variant="secondary" onClick={handleExportCSV} icon={<Download size={13} />} size="sm">
<span>
{language === "ar" ? "تصدير السجل" : language === "fr" ? "Exporter le journal" : "Export Ledger"}
</span>
</AtriumButton>
<button type="button" onClick={toggleFullscreen} className="w-9 h-9 rounded-xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer transition-colors shadow-2xs" title="Toggle Fullscreen"><Maximize2 size={13} /></button>
</div>
</div>
<UniversalDataCollection items={sortedSales} keyExtractor={(s) => s.id} defaultViewMode="list" sortBy={saleSortBy} sortDirection={saleSortDir} onSortChange={(key) => {
						if (saleSortBy === key) setSaleSortDir((prev) => prev === "asc" ? "desc" : "asc");
						else {
							setSaleSortBy(key);
							setSaleSortDir("desc");
						}
					}} selectedIds={selectedSaleIds} onSelectionChange={setSelectedSaleIds} isPinned={(s) => pinnedSaleIds.has(s.id)} onTogglePin={(s) => {
						setPinnedSaleIds((prev) => {
							const next = new Set<string>(prev);
							if (next.has(s.id)) next.delete(s.id);
							else next.add(s.id);
							return next;
						});
					}} onItemClick={(sale) => setSelectedSale(sale)} columns={saleColumns} renderCard={(sale) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div>
<div className="flex items-center justify-between gap-2 mb-2">
<span className="font-mono text-xs font-bold text-[#d4522f] tabular-nums">
#
{sale.id}
</span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3EDE7] dark:bg-[#262422] text-black/72 dark:text-white/80">
{sale.paymentMethod === "Cash" && /* @__PURE__ */ <Banknote size={12} className="text-emerald-600" />}
{sale.paymentMethod === "Card" && /* @__PURE__ */ <CreditCard size={12} className="text-blue-600" />}
{sale.paymentMethod === "Split" && /* @__PURE__ */ <CreditCard size={12} className="text-purple-600" />}
{sale.paymentMethod === "MemberBalance" && /* @__PURE__ */ <User size={12} className="text-[#d4522f]" />}
<span>{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
</span>
</div>
<div className="flex items-center gap-2 mb-2">
<div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center text-xs font-bold text-black/72 dark:text-white/80 shrink-0">{(sale.memberName || "G").charAt(0).toUpperCase()}</div>
<div className="min-w-0">
<h3 className="text-xs font-bold text-black dark:text-white truncate">
{sale.memberName || (language === "ar" ? "زائر غير مسجل" : language === "fr" ? "Client de passage" : "Guest Walk-In")}
</h3>
<p className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums">
{new Date(sale.createdAt).toLocaleDateString()}
{" "}
{new Date(sale.createdAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											})}
</p>
</div>
</div>
<div className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6]/60 dark:border-[#3A3734] p-2.5 rounded-xl space-y-1 text-xs">
{sale.items.map((it: any, idx: number) => /* @__PURE__ */ <div key={idx} className="flex justify-between text-[11px] text-black/72 dark:text-white/75">
<span className="truncate max-w-[150px]">
{it.quantity}
{"x "}
{it.productName}
</span>
<span className="font-mono text-black/62 dark:text-white/65 tabular-nums">{formatMoney(it.totalPrice)}</span>
</div>)}
</div>
</div>
<div className="pt-2.5 border-t border-[#E6DED6]/60 dark:border-[#3A3734] flex items-center justify-between">
<div>
<span className="text-[11px] text-black/62 dark:text-white/65 block uppercase font-semibold tracking-[0.04em] rtl:normal-case rtl:tracking-normal">{language === "ar" ? "الإجمالي" : "Total"}</span>
<span className={`text-sm font-bold font-mono tabular-nums ${sale.status === "Refunded" ? "line-through text-black/62 dark:text-white/65" : "text-black dark:text-white"}`}>{formatMoney(sale.totalAmount)}</span>
</div>
<div className="flex items-center gap-1.5">
<button type="button" onClick={(e) => {
										e.stopPropagation();
										setSelectedSale(sale);
									}} className="px-2.5 py-1 rounded-lg bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 flex items-center gap-1 cursor-pointer transition-colors">
<Eye size={12} />
<span>{language === "ar" ? "عرض" : "View"}</span>
</button>
{sale.status !== "Refunded" && /* @__PURE__ */ <button type="button" onClick={(e) => {
										e.stopPropagation();
										setSelectedSale(sale);
										setIsRefundModalOpen(true);
									}} className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors">
<RotateCcw size={12} />
<span>{language === "ar" ? "استرجاع" : "Refund"}</span>
</button>}
</div>
</div>
</div>} emptyTitle={language === "ar" ? "لا توجد معاملات تطابق خيارات البحث" : "No sales transactions found"} emptyDescription={language === "ar" ? "جرب تغيير شروط البحث أو مسح المرشحات لتظهر جميع العمليات" : "Try adjusting your search terms or clearing filters to display transactions."} />
</div>
{selectedSale && /* @__PURE__ */ <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white dark:bg-[#1C1B1A] border-l border-[#E6DED6] dark:border-[#3A3734] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
<div className="px-6 py-5 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
<div className="flex items-center gap-2">
<Receipt size={17} className="text-[#d4522f]" />
<span className="text-sm font-semibold text-black dark:text-white">
{language === "ar" ? "معاينة وتدقيق الوصل" : language === "fr" ? "Inspecteur du reçu" : "Receipt Audit Inspector"}
</span>
</div>
<button type="button" onClick={() => setSelectedSale(null)} className="p-1.5 rounded-lg text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] cursor-pointer"><X size={18} /></button>
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
{selectedSale.status === "Refunded" && /* @__PURE__ */ <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 space-y-1">
<div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
<RotateCcw size={15} className="text-rose-600" />
<span>
{language === "ar" ? "معاملة مسترجعة ومعاد تخزينها" : language === "fr" ? "TRANSACTION REMBOURSÉE & RÉINTÉGRÉE" : "TRANSACTION REFUNDED & RESTOCKED"}
</span>
</div>
<p className="text-[11px] text-rose-700 dark:text-rose-300">
{selectedSale.notes || (language === "ar" ? "تم استرجاع المعاملة بالكامل وإرجاع الأصناف للمخزون." : language === "fr" ? "Remboursement effectué. Les articles ont été réintégrés au stock." : "Full refund processed. Inventory levels have been automatically returned to stock.")}
</p>
</div>}
<div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
<div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">
{language === "ar" ? "رقم الوصل:" : language === "fr" ? "Réf ticket :" : "Receipt Ref:"}
</span>
<span className="font-mono font-bold text-[#d4522f] tabular-nums">
#
{selectedSale.id}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">
{language === "ar" ? "الوقت والتاريخ:" : language === "fr" ? "Date & heure :" : "Timestamp:"}
</span>
<span className="font-semibold text-black dark:text-white tabular-nums">{new Date(selectedSale.createdAt).toLocaleString()}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">{language === "ar" ? "العميل:" : language === "fr" ? "Client :" : "Customer:"}</span>
<span className="font-bold text-black dark:text-white">
{selectedSale.memberName || (language === "ar" ? "زائر غير مسجل" : language === "fr" ? "Client de passage" : "Guest Walk-In")}
</span>
</div>
{selectedSale.customerPhone && /* @__PURE__ */ <div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">{language === "ar" ? "الهاتف:" : language === "fr" ? "Téléphone :" : "Phone:"}</span>
<span className="font-mono font-semibold text-black dark:text-white tabular-nums">{selectedSale.customerPhone}</span>
</div>}
<div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">
{language === "ar" ? "طريقة الدفع:" : language === "fr" ? "Mode de règlement :" : "Payment Tender:"}
</span>
<span className="font-bold text-black dark:text-white">{selectedSale.paymentMethod}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/62 dark:text-white/65">
{language === "ar" ? "نقطة البيع:" : language === "fr" ? "Poste de caisse :" : "Facility Station:"}
</span>
<span className="font-semibold text-black dark:text-white">
{currentBranch?.name || "Atrium 1"}
{" (POS-01)"}
</span>
</div>
</div>
{selectedSale.notes && !selectedSale.notes.includes("REFUNDED") && /* @__PURE__ */ <div className="p-3.5 rounded-2xl bg-[#d4522f]/10 border border-[#d4522f]/20 space-y-1">
<span className="text-[11px] font-semibold uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal text-[#d4522f] flex items-center gap-1">
<Scissors size={12} />
<span>
{language === "ar" ? "الملاحظات / الإسناد" : language === "fr" ? "Attribution / Notes" : "Attribution / Notes"}
</span>
</span>
<p className="text-xs font-semibold text-black dark:text-white">{selectedSale.notes}</p>
</div>}
<div className="space-y-2">
<span className="text-[11.5px] font-semibold text-black/68 dark:text-white/72 uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal">
{language === "ar" ? "الأصناف المشتراة" : language === "fr" ? "Articles" : "Line Items"}
{" ("}
{selectedSale.items.length}
)
</span>
<div className="border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl divide-y divide-[#E6DED6]/60 dark:divide-[#3A3734] overflow-hidden">
{selectedSale.items.map((item: any, idx: number) => /* @__PURE__ */ <div key={idx} className="p-3.5 flex justify-between items-center bg-white dark:bg-[#262422]">
<div>
<div className="font-bold text-black dark:text-white">{item.productName}</div>
<div className="text-[11px] text-black/62 dark:text-white/65 tabular-nums mt-0.5">
{item.quantity}
{" × "}
{formatMoney(item.unitPrice)}
{item.discount ? ` (disc: -${formatMoney(item.discount)})` : ""}
</div>
</div>
<span className="font-bold text-black dark:text-white tabular-nums">{formatMoney(item.totalPrice)}</span>
</div>)}
</div>
</div>
<div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
<div>
<span className="text-xs font-bold text-[#d4522f]">
{language === "ar" ? "إجمالي المدفوع" : language === "fr" ? "Total Encaissé" : "Total Settled"}
</span>
<div className="text-[11px] text-black/62 dark:text-white/65">
{language === "ar" ? "شامل الرسوم والضرائب" : language === "fr" ? "TTC (Toutes taxes comprises)" : "Includes VAT & taxes"}
</div>
</div>
<span className={`text-2xl font-bold tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans ${selectedSale.status === "Refunded" ? "line-through text-black/62 dark:text-white/65" : "text-[#d4522f]"}`}>{formatMoney(selectedSale.totalAmount)}</span>
</div>
<div className="space-y-2 pt-2">
{selectedSale.status !== "Refunded" && /* @__PURE__ */ <button type="button" onClick={() => setIsRefundModalOpen(true)} className="w-full h-10 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
<RotateCcw size={14} />
<span>
{language === "ar" ? "استرجاع الوصل وإعادة المنتجات للمخزون" : language === "fr" ? "Rembourser & Réintégrer au stock" : "Process Refund & Restock Items"}
</span>
</button>}
<AtriumButton type="button" variant="secondary" onClick={() => window.print()} icon={<Printer size={15} />} className="w-full justify-center">
<span>
{language === "ar" ? "طباعة الوصل الحراري" : language === "fr" ? "Imprimer le ticket thermique" : "Print Thermal Receipt"}
</span>
</AtriumButton>
<AtriumButton type="button" variant="primary" onClick={() => setSelectedSale(null)} className="w-full justify-center">
<span>
{language === "ar" ? "إغلاق المعاينة" : language === "fr" ? "Fermer l'inspecteur" : "Close Inspector"}
</span>
</AtriumButton>
</div>
</div>
</div>}
{isRefundModalOpen && selectedSale && /* @__PURE__ */ <div className="fixed inset-0 z-60 bg-[#1F1D1B]/50 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-[#1C1B1A] rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#E6DED6] dark:border-[#3A3734] shadow-2xl animate-in zoom-in-95 duration-150">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center"><RotateCcw size={20} /></div>
<div>
<h3 className="text-base font-bold text-black dark:text-white">
{language === "ar" ? "تأكيد استرجاع المعاملة" : language === "fr" ? "Confirmer le remboursement" : "Confirm Transaction Refund"}
</h3>
<p className="text-xs text-black/62 dark:text-white/65 tabular-nums">
{language === "ar" ? "معاملة" : "Sale"}
{" #"}
{selectedSale.id}
{" • "}
{formatMoney(selectedSale.totalAmount)}
</p>
</div>
</div>
<div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
<AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
<span>
{language === "ar" ? `سيؤدي الاسترجاع إلى إعادة جميع الأصناف (${selectedSale.items.reduce((s: any, i: any) => s + i.quantity, 0)}) إلى مخزون الفرع المتاح وتوثيق العملية في سجل التدقيق.` : language === "fr" ? `Ce remboursement réintégrera l'ensemble des ${selectedSale.items.reduce((s: any, i: any) => s + i.quantity, 0)} articles au stock du magasin et tracera l'opération.` : `Refunding will return all ${selectedSale.items.reduce((s: any, i: any) => s + i.quantity, 0)} items back to available branch stock and create an audit log.`}
</span>
</div>
<div>
<LabelSelect field="RefundReason" label={`${language === "ar" ? "سبب الاسترجاع / الإرجاع" : language === "fr" ? "Motif de retour / remboursement" : "Reason for Refund / Return"} *`} value={refundReason} onChange={(val) => setRefundReason(val?.target?.value ?? String(val))} options={[
								language === "ar" ? "إرجاع أو استبدال من العميل" : language === "fr" ? "Retour ou échange client" : "Customer return / exchange",
								language === "ar" ? "خطأ في إدخال الصنف من الكاشير" : language === "fr" ? "Erreur de saisie par le caissier" : "Wrong item rung up by cashier",
								language === "ar" ? "منتج معيب أو تالف" : language === "fr" ? "Article défectueux ou endommagé" : "Defective or damaged product",
								language === "ar" ? "تراجع العميل قبل المغادرة" : language === "fr" ? "Changement d'avis avant départ" : "Customer changed mind before leaving",
								language === "ar" ? "تعديل السعر أو الخصم" : language === "fr" ? "Ajustement de tarif ou remise" : "Pricing / discount adjustment"
							]} width="100%" height={46} corner={14} />
</div>
<div className="flex items-center justify-end gap-3 pt-2">
<AtriumButton type="button" variant="ghost" onClick={() => setIsRefundModalOpen(false)}><span>{t("action_cancel", language)}</span></AtriumButton>
<AtriumButton type="button" variant="danger" onClick={() => {
									refundSale(selectedSale.id, refundReason);
									setRefundSuccessToast(language === "ar" ? `تم استرجاع الوصل #${selectedSale.id} وإعادة الأصناف للمخزون.` : language === "fr" ? `Vente #${selectedSale.id} remboursée. Articles réintégrés au stock.` : `Refunded Sale #${selectedSale.id}. Items returned to inventory.`);
									setSelectedSale({
										...selectedSale,
										status: "Refunded",
										notes: `REFUNDED: ${refundReason}`
									});
									setIsRefundModalOpen(false);
									setTimeout(() => setRefundSuccessToast(null), 5e3);
								}}>
<span>
{language === "ar" ? "تأكيد الاسترجاع وإعادة التخزين" : language === "fr" ? "Confirmer le remboursement" : "Confirm Refund & Restock"}
</span>
</AtriumButton>
</div>
</div>
</div>}
</div>;
};

export const HistoryScreen = MembershipHistoryView;
