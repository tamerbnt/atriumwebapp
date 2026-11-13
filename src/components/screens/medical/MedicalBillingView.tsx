import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Printer,
  ArrowRight,
  DollarSign,
  Activity,
  Download,
  Pin,
  X,
  FileText,
  UserCheck,
  Building2,
  Receipt,
  Users,
  Wallet,
  Clock,
  Send,
  AlertCircle,
  Plus,
  Coins,
  Check,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation, ChifaClaimRecord, DailyCashClosure } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const MedicalBillingView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { consultations, markConsultationPaid, practitioners, chifaClaims, addChifaClaim, dailyClosures, addDailyClosure, consumables, restockConsumable, depleteConsumable } = useMedicalData();
	const [billingMainTab, setBillingMainTab] = React.useState("invoices");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState("all");
	const [viewMode, setViewMode] = React.useState("list");
	const [sortBy, setSortBy] = React.useState("consultationDate");
	const [sortDir, setSortDir] = React.useState("desc");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["cons_02"]));
	const [selectedConsultation, setSelectedConsultation] = React.useState<any>(() => consultations[0] || null);
	const [activeInspectorTab, setActiveInspectorTab] = React.useState("decompte");
	const [paymentMethod, setPaymentMethod] = React.useState("Cash");
	const [countedCash, setCountedCash] = React.useState("24500");
	const [closureNotes, setClosureNotes] = React.useState("Caisse journalière équilibrée. Aucune anomalie constatée.");
	const filtered = React.useMemo(() => {
		return consultations.filter((c) => {
			const q = searchQuery.toLowerCase();
			if (!(c.patientName.toLowerCase().includes(q) || c.chiefComplaint.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))) return false;
			if (statusFilter === "paid") return c.isPaid;
			if (statusFilter === "pending") return !c.isPaid;
			return true;
		});
	}, [
		consultations,
		searchQuery,
		statusFilter
	]);
	const billingCounts = React.useMemo(() => ({
		all: consultations.length,
		paid: consultations.filter((c) => c.isPaid).length,
		pending: consultations.filter((c) => !c.isPaid).length
	}), [consultations]);
	const sortedConsultations = React.useMemo(() => {
		const list = [...filtered];
		list.sort((a, b) => {
			const isPinnedA = pinnedIds.has(a.id);
			const isPinnedB = pinnedIds.has(b.id);
			if (isPinnedA && !isPinnedB) return -1;
			if (!isPinnedA && isPinnedB) return 1;
			if (sortBy === "consultationFeeDzd") return sortDir === "asc" ? a.consultationFeeDzd - b.consultationFeeDzd : b.consultationFeeDzd - a.consultationFeeDzd;
			if (sortBy === "patientName") return sortDir === "asc" ? a.patientName.localeCompare(b.patientName) : b.patientName.localeCompare(a.patientName);
			return sortDir === "asc" ? a.consultationDate.localeCompare(b.consultationDate) : b.consultationDate.localeCompare(a.consultationDate);
		});
		return list;
	}, [
		filtered,
		pinnedIds,
		sortBy,
		sortDir
	]);
	const totalFee = consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0);
	const totalPaid = consultations.reduce((acc, c) => acc + (c.isPaid ? c.consultationFeeDzd : 0), 0);
	const totalInsurance = consultations.reduce((acc, c) => acc + c.insuranceShareDzd, 0);
	const expectedCashTotal = consultations.filter((c) => c.isPaid).reduce((acc, c) => acc + (c.copayAmountDzd || c.consultationFeeDzd * .2), 0);
	const totalClaimsCount = chifaClaims.length;
	const totalCnasShare = chifaClaims.reduce((acc, cl) => acc + (cl.cnasShareDzd ?? cl.chifaShareDzd ?? 0), 0);
	const totalTicketModerateur = chifaClaims.reduce((acc, cl) => acc + (cl.ticketModerateurDzd ?? cl.copayPaidDzd ?? 0), 0);
	const transmittedCount = chifaClaims.filter((cl) => cl.isTransmitted ?? cl.status === "Submitted").length;
	const handleTogglePin = (id: any) => {
		setPinnedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		showToast(isAr ? "تم تحديث التثبيت" : "Statut épinglé mis à jour", "info");
	};
	const handlePay = (c: any) => {
		markConsultationPaid(c.id);
		setSelectedConsultation({
			...c,
			isPaid: true
		});
		showToast(isAr ? "تم تسجيل الدفع وإصدار المخالصة" : "Paiement enregistré & quittance validée", "success");
	};
	const handlePrintReceipt = (c: any) => {
		showToast(isAr ? "جاري طباعة إيصال الدفع..." : "Génération de la quittance médicale...", "info");
		window.print();
	};
	const handleTransmitBordereau = () => {
		showToast(isAr ? "تم إرسال الجدول الإلكتروني للضمان الاجتماعي CNAS بنجاح" : "Télétransmission du bordereau CNAS/Chifa réussie avec accusé de réception", "success");
	};
	const handleSaveCashClosure = () => {
		const counted = parseFloat(countedCash) || 0;
		const diff = counted - expectedCashTotal;
		const closure = {
			id: `closure_${Date.now()}`,
			date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
			closedBySecretary: "Secrétariat Principal (Rania M.)",
			totalConsultationsCount: consultations.length,
			expectedCashDzd: expectedCashTotal,
			countedCashDzd: counted,
			discrepancyDzd: diff,
			notes: closureNotes,
			verifiedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
		};
		addDailyClosure(closure);
		showToast(isAr ? "تم إغلاق الصندوق اليومي وحفظ تقرير الكاسة" : "Clôture de caisse validée et consignée", "success");
	};
	const columns = [
		{
			key: "patientName",
			header: isAr ? "المريض / الفحص" : "Patient & Acte Médical",
			sortable: true,
			minWidth: "220px",
			renderCell: (c: any) => {
				const isPinned = pinnedIds.has(c.id);
				return /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-neutral-800"><Receipt size={16} /></div>
<div className="min-w-0">
<div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
{c.patientName}
{isPinned && /* @__PURE__ */ <span className="text-xs text-amber-500">📌</span>}
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{c.ticketNumber ? `Ticket: ${c.ticketNumber} · ` : ""}
{c.ngapCode || "C"}
{" · "}
{c.consultationDate.split("T")[0]}
</div>
</div>
</div>;
			}
		},
		{
			key: "consultationFeeDzd",
			header: isAr ? "الأتعاب الإجمالية" : "Total Honoraires",
			sortable: true,
			minWidth: "130px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-black dark:text-white">{formatMoney(c.consultationFeeDzd, "DZD")}</div>
		},
		{
			key: "copayAmountDzd",
			header: isAr ? "حصة المريض (Ticket)" : "Part Patient (TM)",
			minWidth: "140px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="font-mono text-xs text-black/70 dark:text-white/75">{formatMoney(c.copayAmountDzd || 0, "DZD")}</div>
		},
		{
			key: "insuranceShareDzd",
			header: isAr ? "تغطية Chifa" : "Tiers Payant Chifa",
			minWidth: "130px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">{formatMoney(c.insuranceShareDzd || 0, "DZD")}</div>
		},
		{
			key: "isPaid",
			header: isAr ? "حالة التحصيل" : "Statut Recouvrement",
			sortable: true,
			minWidth: "120px",
			renderCell: (c: any) => /* @__PURE__ */ <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"}`}>{c.isPaid ? isAr ? "مدفوع" : "Encaissé" : isAr ? "معلق" : "En attente"}</span>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: consultations.length > 0
	});
	if (showSkeleton && (consultations.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2*",
				minWidth: "140px"
			},
			{
				width: "2*",
				minWidth: "140px"
			},
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn={false} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><CreditCard size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "المالية الطبية والضمان الاجتماعي (Chifa / CNAS)" : "Facturation Polyclinique & Tiers Payant Chifa"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">CNAS / CASNOS</span>
</div>
</div>
</div>
<div className="flex items-center p-1 rounded-xl bg-[#F3EDE7] dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<button type="button" onClick={() => setBillingMainTab("invoices")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${billingMainTab === "invoices" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{isAr ? "الفواتير والتحصيل" : "Factures & Tiers-Payant"}</button>
<button type="button" onClick={() => setBillingMainTab("bordereau")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${billingMainTab === "bordereau" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{isAr ? "جدول CNAS" : "Bordereau CNAS"}</button>
<button type="button" onClick={() => setBillingMainTab("honoraires")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${billingMainTab === "honoraires" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{isAr ? "أتعاب الأطباء" : "Honoraires Praticiens"}</button>
<button type="button" onClick={() => setBillingMainTab("caisse")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${billingMainTab === "caisse" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{isAr ? "إغلاق الصندوق" : "Clôture de Caisse"}</button>
<button type="button" onClick={() => setBillingMainTab("consumables")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${billingMainTab === "consumables" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-2xs font-bold" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{isAr ? "المستهلكات والمخزون" : "Consommables & Stock"}</button>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "مؤشرات التحصيل الطبي والتأمين" : "Indicateurs de Recouvrement & Tiers-Payant"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي الأتعاب المقررة" : "Volume d'Honoraires Total"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalFee, "DZD")}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{consultations.length}
{" "}
{isAr ? "فحص مسجل" : "actes facturés"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "حصة التأمين الصحي (Chifa)" : "Prise en Charge CNAS/CASNOS"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalInsurance, "DZD")}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">
{isAr ? "بانتظار التحويل البنكي للصندوق" : "Bordereaux en cours de télétransmission"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "المتحصلات الفعلية" : "Encaissements Encaissés"}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">RECOUVREMENT</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalPaid, "DZD")}</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span>
{"Reste à percevoir: "}
{formatMoney(totalFee - totalPaid, "DZD")}
</span>
</p>
</div>
</div>
</div>
</div>
{billingMainTab === "invoices" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2">
<CreditCard size={16} className="text-black/55 dark:text-white/55" />
<span className="text-sm font-bold text-black dark:text-white">
{isAr ? "دفتر الفواتير والتحصيل الطبي" : "Journal de Facturation & Recouvrement"}
</span>
<span className="text-xs text-black/55 dark:text-white/55 font-semibold tabular-nums ml-1">{sortedConsultations.length}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={isAr ? "بحث برقم الفاتورة أو اسم المريض..." : "Rechercher facture, patient..."} shutSize={36} openWidth={220} />
<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
								{
									value: "all",
									label: isAr ? "الكل" : language === "fr" ? "Toutes" : "All",
									tooltip: isAr ? "جميع الفواتير الطبية" : language === "fr" ? "Toutes les consultations" : "All consultations",
									count: billingCounts.all
								},
								{
									value: "paid",
									label: isAr ? "محصل" : language === "fr" ? "Encaissées" : "Paid",
									tooltip: isAr ? "تم التحصيل" : language === "fr" ? "Factures encaissées" : "Paid consultations",
									count: billingCounts.paid
								},
								{
									value: "pending",
									label: isAr ? "منتظر" : language === "fr" ? "Attente" : "Pending",
									tooltip: isAr ? "قيد الانتظار والتحصيل" : language === "fr" ? "En attente de règlement" : "Pending payment",
									count: billingCounts.pending
								}
							]} aria-label="Medical Billing Filter" />
</div>
</div>
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection items={sortedConsultations} keyExtractor={(c) => c.id} defaultViewMode={viewMode} columns={columns} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key) => {
								if (sortBy === key) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
								else {
									setSortBy(key);
									setSortDir("asc");
								}
							}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(c) => pinnedIds.has(c.id)} onTogglePin={(c) => handleTogglePin(c.id)} onItemClick={(c) => setSelectedConsultation(c)} customActions={(c) => [{
								id: "pay",
								label: isAr ? "تحصيل" : "Encaisser",
								icon: /* @__PURE__ */ <CheckCircle2 size={13} />,
								variant: "primary",
								disabled: c.isPaid,
								onClick: () => handlePay(c)
							}, {
								id: "print",
								label: isAr ? "إيصال" : "Quittance",
								icon: /* @__PURE__ */ <Printer size={13} />,
								onClick: () => handlePrintReceipt(c)
							}]} renderCard={(c) => {
								const isPinned = pinnedIds.has(c.id);
								return /* @__PURE__ */ <div className="flex flex-col w-full space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-black dark:text-white truncate">
{c.patientName}
{" "}
{isPinned && "📌"}
</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{c.isPaid ? "Encaissé" : "En attente"}</span>
</div>
<div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1 text-xs">
<div className="flex justify-between items-center text-black/70 dark:text-white/75">
<span>Total:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(c.consultationFeeDzd, "DZD")}</span>
</div>
<div className="flex justify-between items-center text-black/55 dark:text-white/55">
<span>Part Chifa:</span>
<span className="font-mono text-blue-600 font-semibold">{formatMoney(c.insuranceShareDzd || 0, "DZD")}</span>
</div>
<div className="flex justify-between items-center text-black/55 dark:text-white/55">
<span>Part Patient:</span>
<span className="font-mono text-black dark:text-white">{formatMoney(c.copayAmountDzd || 0, "DZD")}</span>
</div>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55">
<span>{c.consultationDate.split("T")[0]}</span>
<span className="font-mono">{c.ngapCode || "C"}</span>
</div>
</div>;
							}} emptyTitle={isAr ? "لا توجد فواتير" : "Aucune consultation facturée"} emptyDescription={isAr ? "تظهر الفواتير بمجرد إتمام الفحص" : "Les consultations terminées apparaissent automatiquement dans ce journal"} />
</div>
{selectedConsultation && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-800/60 flex items-center justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200/60"><Receipt size={18} /></div>
<div className="min-w-0">
<h3 className="font-bold text-sm text-black dark:text-white truncate">{selectedConsultation.patientName}</h3>
<div className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
<span className="font-mono">
{"Réf: "}
{selectedConsultation.id}
</span>
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedConsultation(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X size={16} /></button>
</div>
<div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
<button type="button" onClick={() => setActiveInspectorTab("decompte")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "decompte" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "البيان المالي" : "Décompte"}</button>
<button type="button" onClick={() => setActiveInspectorTab("tiers_payant")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "tiers_payant" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الشفاء Chifa" : "Chifa & NGAP"}</button>
<button type="button" onClick={() => setActiveInspectorTab("actions")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "actions" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الإجراءات" : "Actions"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{activeInspectorTab === "decompte" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
<div className="flex justify-between items-center text-black/55 dark:text-white/55">
<span>Montant Total Acte:</span>
<span className="font-bold text-black dark:text-white font-mono">{formatMoney(selectedConsultation.consultationFeeDzd, "DZD")}</span>
</div>
<div className="flex justify-between items-center text-black/55 dark:text-white/55">
<span>Ticket Modérateur (Part Patient):</span>
<span className="font-semibold text-black dark:text-white font-mono">{formatMoney(selectedConsultation.copayAmountDzd || 600, "DZD")}</span>
</div>
<div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
<span>Prise en charge CNAS/CASNOS:</span>
<span className="font-semibold font-mono">{formatMoney(selectedConsultation.insuranceShareDzd || 2400, "DZD")}</span>
</div>
<div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center font-bold">
<span>Statut d'encaissement:</span>
<span className={selectedConsultation.isPaid ? "text-emerald-600" : "text-amber-600"}>{selectedConsultation.isPaid ? "Règlement effectué ✓" : "Solde débiteur"}</span>
</div>
</div>
<div className="space-y-2">
<span className="text-[11px] font-semibold text-black/70 dark:text-white/75">Mode d'encaissement</span>
<div className="grid grid-cols-3 gap-2">
{[
														"Cash",
														"Dahabia",
														"BaridiMob"
													].map((method) => /* @__PURE__ */ <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-2 px-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${paymentMethod === method ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75"}`}>{method}</button>)}
</div>
</div>
{!selectedConsultation.isPaid && /* @__PURE__ */ <AtriumButton variant="primary" onClick={() => handlePay(selectedConsultation)} className="w-full justify-center" icon={<CheckCircle2 size={14} />}>
{"Encaisser via "}
{paymentMethod}
</AtriumButton>}
</div>}
{activeInspectorTab === "tiers_payant" && /* @__PURE__ */ <div className="space-y-3">
<div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5">
<div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
<ShieldCheck size={16} />
<span>Convention Tiers-Payant Chifa</span>
</div>
<p className="text-[11px] text-blue-600 dark:text-blue-400">Télétransmission dématérialisée conforme au protocole CNAS Algérie.</p>
</div>
<div className="space-y-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 font-mono text-[11px]">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Cotation NGAP:</span>
<span className="text-black dark:text-white font-bold">{selectedConsultation.ngapCode || "C (Médecine Générale)"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Numéro Ticket Triage:</span>
<span className="text-black dark:text-white font-bold">{selectedConsultation.ticketNumber || "T-102"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Taux de couverture:</span>
<span className="text-emerald-600 font-bold">
{selectedConsultation.copayAmountDzd === 0 ? "100% (ALD Exonéré)" : "80% Régime Standard"}
</span>
</div>
</div>
</div>}
{activeInspectorTab === "actions" && /* @__PURE__ */ <div className="space-y-2.5">
<button type="button" onClick={() => handlePrintReceipt(selectedConsultation)} className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 transition-colors">
<span className="flex items-center gap-2">
<Printer size={16} />
Imprimer quittance patient
</span>
</button>
<button type="button" onClick={() => handleTogglePin(selectedConsultation.id)} className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 transition-colors">
<span className="flex items-center gap-2">
<Pin size={16} />
{pinnedIds.has(selectedConsultation.id) ? "Détacher" : "Épingler la facture"}
</span>
</button>
</div>}
</div>
</div>}
</div>
</div>}
{billingMainTab === "bordereau" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
<div>
<h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
<Building2 size={16} className="text-blue-600" />
<span>Bordereau Mensuel de Télétransmission Chifa / CNAS</span>
</h2>
<p className="text-[11px] text-black/55 dark:text-white/55">
Période: Mai 2026 · Bordereau N° BOR-2026-05-ALGER · Centre de Paiement CNAS 1601
</p>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => {
									showToast("Export du bordereau officiel CNAS au format PDF réglementaire", "info");
									window.print();
								}} className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
<Download size={13} />
<span>Exporter PDF CNAS</span>
</button>
<AtriumButton variant="primary" size="md" icon={<Send size={14} />} onClick={handleTransmitBordereau}><span>Télétransmettre à la CNAS</span></AtriumButton>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
<div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">Total Fiches Chifa</span>
<div className="text-xl font-bold font-mono text-black dark:text-white mt-1">
{totalClaimsCount}
{" dossiers"}
</div>
<span className="text-[10px] text-emerald-600 font-medium">
{transmittedCount}
{" télétransmis"}
</span>
</div>
<div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">Total Honoraires NGAP</span>
<div className="text-xl font-bold font-mono tabular-nums text-black dark:text-white mt-1">{formatMoney(totalClaimsCount * 2800, "DZD")}</div>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">Tarifs conventionnels</span>
</div>
<div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">Créance Due par la CNAS</span>
<div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">{formatMoney(totalCnasShare, "DZD")}</div>
<span className="text-[10px] text-blue-500 font-medium">À virer au compte polyclinique</span>
</div>
<div className="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">Ticket Modérateur Encaissé</span>
<div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(totalTicketModerateur, "DZD")}</div>
<span className="text-[10px] text-black/55 dark:text-white/55">Payé par les assurés</span>
</div>
</div>
<div className="w-full overflow-x-auto text-xs">
<table className="w-full text-left border-separate border-spacing-y-1.5">
<thead className="bg-transparent text-black/55 dark:text-white/55 font-semibold text-[11px]">
<tr>
<th className="p-2.5">N° Dossier</th>
<th className="p-2.5">Assuré(e) / Patient</th>
<th className="p-2.5">N° Carte Chifa</th>
<th className="p-2.5">Cotation</th>
<th className="p-2.5">Taux Prise en Charge</th>
<th className="p-2.5 text-right">Part CNAS</th>
<th className="p-2.5 text-right">Ticket Modérateur</th>
<th className="p-2.5 text-center">Statut</th>
</tr>
</thead>
<tbody className="font-mono">
{chifaClaims.map((claim) => /* @__PURE__ */ <tr key={claim.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs hover:bg-neutral-50/90 dark:hover:bg-neutral-750">
<td className="p-3 font-semibold text-black dark:text-white">{claim.id}</td>
<td className="p-3 font-sans font-medium text-black dark:text-white">{claim.patientName}</td>
<td className="p-3 text-black/55 dark:text-white/55">{claim.chifaNumber}</td>
<td className="p-3 text-[#d4522f] font-bold">{claim.ngapCode}</td>
<td className="p-3 font-sans">
{(() => {
												const rate = claim.coverageRate ?? claim.chifaCoveragePercent ?? 80;
												return /* @__PURE__ */ <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rate === 100 ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
{rate}
{"% "}
{rate === 100 ? "(ALD 100%)" : "(80%)"}
</span>;
											})()}
</td>
<td className="p-3 text-right text-blue-600 font-bold">{formatMoney(claim.cnasShareDzd ?? claim.chifaShareDzd ?? 0, "DZD")}</td>
<td className="p-3 text-right text-black/70 dark:text-white/75">{formatMoney(claim.ticketModerateurDzd ?? claim.copayPaidDzd ?? 0, "DZD")}</td>
<td className="p-3 text-center">
<span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${claim.isTransmitted ?? claim.status === "Submitted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
{claim.isTransmitted ?? claim.status === "Submitted" ? "Transmis ✓" : "Prêt à l'envoi"}
</span>
</td>
</tr>)}
</tbody>
</table>
</div>
</div>}
{billingMainTab === "honoraires" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
<div>
<h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
<Users size={16} className="text-[#d4522f]" />
<span>Rétrocession des Honoraires Médicaux & Quotes-parts Polyclinique</span>
</h2>
</div>
<button type="button" onClick={() => showToast("Exportation du rapport de rétrocession pour la comptabilité", "info")} className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
<Download size={13} />
<span>Bordereau Comptable (Excel)</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{practitioners.map((doc) => {
						const docShare = doc.commissionPercent || 70;
						const grossTurnover = 125e3;
						const doctorPayout = grossTurnover * docShare / 100;
						const polyclinicRetention = grossTurnover - doctorPayout;
						return /* @__PURE__ */ <div key={doc.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3">
<div className="flex items-center justify-between">
<div>
<h3 className="font-bold text-xs text-black dark:text-white">{doc.name}</h3>
<p className="text-[11px] text-black/55 dark:text-white/55">{doc.specialty}</p>
</div>
<span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#d4522f] font-bold text-[10px] font-mono border border-orange-200/50">
{docShare}
% Rétrocession
</span>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 space-y-1.5 text-xs font-mono">
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>Chiffre d'affaires brut:</span>
<span className="font-bold text-black dark:text-white">{formatMoney(grossTurnover, "DZD")}</span>
</div>
<div className="flex justify-between text-emerald-600">
<span>
Net Médecin (
{docShare}
%):
</span>
<span className="font-bold">{formatMoney(doctorPayout, "DZD")}</span>
</div>
<div className="flex justify-between text-black/55 dark:text-white/55 text-[11px]">
<span>Quote-part Polyclinique:</span>
<span>{formatMoney(polyclinicRetention, "DZD")}</span>
</div>
</div>
<div className="flex items-center justify-between pt-1">
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{"Cabinet: "}
{doc.cabinetRoom}
</span>
<button type="button" onClick={() => showToast(`Virement généré pour ${doc.name}: ${formatMoney(doctorPayout, "DZD")}`, "success")} className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white font-semibold text-[11px] shadow-2xs hover:bg-[#b3694c] transition-colors">Émettre Règlement</button>
</div>
</div>;
					})}
</div>
</div>}
{billingMainTab === "caisse" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-700">
<div>
<h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
<Coins size={16} className="text-amber-500" />
<span>Feuille de Caisse Journalière & Clôture Secrétariat</span>
</h2>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
<div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-4 text-xs">
<h3 className="font-bold text-black dark:text-white text-xs uppercase tracking-wider">Comptage Physique du Tiroir Caisse (Aujourd'hui)</h3>
<div className="grid grid-cols-2 gap-3">
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase">Espèces Attendues (Système)</span>
<div className="text-xl font-bold font-mono tabular-nums text-black dark:text-white mt-1">{formatMoney(expectedCashTotal, "DZD")}</div>
<span className="text-[10px] text-black/55 dark:text-white/55">Base tickets modérateurs encaissés</span>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
<label className="text-[10px] text-black/55 dark:text-white/55 font-bold uppercase block mb-1">Espèces Comptées Physiquement (DZD)</label>
<input type="number" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold text-base text-black dark:text-white" />
{(() => {
											const diff = (parseFloat(countedCash) || 0) - expectedCashTotal;
											return /* @__PURE__ */ <span className={`text-[10px] font-bold block mt-1 ${diff === 0 ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-rose-600"}`}>
{"Écart: "}
{diff >= 0 ? `+${diff}` : diff}
{" DZD "}
{diff === 0 ? "(Caisse Juste ✓)" : diff > 0 ? "(Excédent)" : "(Déficit de caisse)"}
</span>;
										})()}
</div>
</div>
<div>
<label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase mb-1">Observations et Justificatifs</label>
<textarea value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} rows={3} className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs text-black dark:text-white" />
</div>
<div className="flex justify-end pt-2">
<AtriumButton variant="primary" size="md" icon={<Check size={14} />} onClick={handleSaveCashClosure}><span>Valider & Signer la Clôture de Caisse</span></AtriumButton>
</div>
</div>
<div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3 text-xs">
<h3 className="font-bold text-black dark:text-white text-xs uppercase tracking-wider">Historique des Clôtures de Caisse</h3>
<div className="space-y-2">
{dailyClosures.map((cl) => /* @__PURE__ */ <div key={cl.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 space-y-1 text-xs">
<div className="flex items-center justify-between">
<span className="font-bold text-black dark:text-white font-mono">{cl.date}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{cl.verifiedAt || "17:30"}</span>
</div>
<div className="flex items-center justify-between text-[11px] font-mono text-black/70 dark:text-white/75">
<span>
{"Compté: "}
{formatMoney(cl.countedCashDzd ?? cl.actualCashInDrawerDzd ?? 0, "DZD")}
</span>
<span className={cl.discrepancyDzd === 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
{"Écart: "}
{cl.discrepancyDzd >= 0 ? `+${cl.discrepancyDzd}` : cl.discrepancyDzd}
{" DZD"}
</span>
</div>
<p className="text-[11px] text-black/55 dark:text-white/55 italic">
"
{cl.notes || "Clôture normale"}
{"\" — "}
{cl.closedBySecretary || cl.closedByStaffName || "Secrétariat"}
</p>
</div>)}
</div>
</div>
</div>
</div>}
{billingMainTab === "consumables" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs animate-in fade-in duration-150">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
<div>
<h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
<Building2 size={16} className="text-[#d4522f]" />
<span>
{isAr ? "المخزون والمستهلكات السريرية" : "Pharmacie Interne & Consommables de Soins"}
</span>
</h3>
<p className="text-xs text-black/55 dark:text-white/55">
{isAr ? "متابعة حية لاستهلاك القفازات، الحقن، المحاليل والمستلزمات الطبية مع الإنذار المبكر" : "Niveaux de stock temps réel, auto-décrémentation par consultation/acte et alertes de réapprovisionnement"}
</p>
</div>
<div className="flex items-center gap-2">
<span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75">
{consumables.length}
{" "}
{isAr ? "عنصر مراقب" : "fournitures tracées"}
</span>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{consumables.map((item) => {
						const currentStock = item.currentStockUnits ?? item.currentStock ?? 0;
						const threshold = item.reorderThresholdUnits ?? item.minStockAlert ?? 10;
						const isCritical = currentStock <= threshold;
						const code = item.itemCode ?? item.id;
						return /* @__PURE__ */ <div key={item.id} className={`p-4 rounded-2xl bg-white dark:bg-neutral-800 border flex flex-col justify-between shadow-2xs space-y-3 transition-all ${isCritical ? "border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20" : "border-neutral-200 dark:border-neutral-700"}`}>
<div className="flex items-start justify-between gap-2">
<div>
<span className="text-[10px] font-mono text-black/55 dark:text-white/55 block uppercase font-bold">
{code}
{" · "}
{item.category}
</span>
<h4 className="font-bold text-sm text-black dark:text-white mt-0.5">{item.name}</h4>
</div>
{isCritical ? /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">Seuil Critique</span> : /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Stock Optimal</span>}
</div>
<div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 text-xs">
<div>
<span className="text-[10px] text-black/55 dark:text-white/55 uppercase font-semibold block">Stock Actuel</span>
<div className="flex items-baseline gap-1 mt-0.5">
<span className={`text-xl font-bold font-mono ${isCritical ? "text-rose-600" : "text-black dark:text-white"}`}>{currentStock}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{item.unit}</span>
</div>
</div>
<div>
<span className="text-[10px] text-black/55 dark:text-white/55 uppercase font-semibold block">Seuil d'Alerte</span>
<div className="flex items-baseline gap-1 mt-0.5">
<span className="text-xl font-bold font-mono text-black/55 dark:text-white/55">{threshold}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{item.unit}</span>
</div>
</div>
</div>
<div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
<div className={`h-full transition-all ${isCritical ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(8, currentStock / (threshold * 2.5) * 100))}%` }} />
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
<button type="button" onClick={() => {
											depleteConsumable(code, 1);
											showToast(`-1 ${item.unit} déduit pour ${item.name}`, "info");
										}} className="px-2 py-1 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" title="Déduire manuellement pour un acte">-1 Unité</button>
<button type="button" onClick={() => {
											restockConsumable(code, 50);
											showToast(`+50 ${item.unit} réapprovisionnés pour ${item.name}`, "success");
										}} className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#d4522f] hover:bg-[#b03b1b] text-white shadow-2xs transition-colors">+50 Réapprovisionner</button>
</div>
</div>;
					})}
</div>
</div>}
</div>;
};
