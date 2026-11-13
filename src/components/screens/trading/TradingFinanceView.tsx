import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Building2,
  Home,
  ChevronDown,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  X,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { CommercialDocument } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type FinanceFilter = 'all' | 'unpaid' | 'paid';



export const TradingFinanceView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { commercialDocs, b2bClients, b2bSuppliers, updateCommercialDoc, updateB2bClient, currentBranch, branches, switchBranch, resetTradingMockData, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [settlementDoc, setSettlementDoc] = React.useState<any>(null);
	const [settleMethod, setSettleMethod] = React.useState("Virement bancaire");
	const [settleRef, setSettleRef] = React.useState("");
	const [settleDate, setSettleDate] = React.useState((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	const [filterMode, setFilterMode] = React.useState("unpaid");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const invoices = React.useMemo(() => {
		return commercialDocs.filter((d) => d.type === "facture");
	}, [commercialDocs]);
	const agingAnalysis = React.useMemo(() => {
		const today = (/* @__PURE__ */ new Date()).getTime();
		let bucketCurrent = 0;
		let bucket31_60 = 0;
		let bucket61_90 = 0;
		let bucket90Plus = 0;
		invoices.forEach((inv) => {
			if (inv.status === "Paid") return;
			const invDate = new Date(inv.date).getTime();
			const diffDays = Math.max(0, Math.floor((today - invDate) / 864e5));
			if (diffDays <= 30) bucketCurrent += inv.netToPay;
			else if (diffDays <= 60) bucket31_60 += inv.netToPay;
			else if (diffDays <= 90) bucket61_90 += inv.netToPay;
			else bucket90Plus += inv.netToPay;
		});
		const totalUnpaid = bucketCurrent + bucket31_60 + bucket61_90 + bucket90Plus;
		const totalPaidInvoices = invoices.filter((i) => i.status === "Paid");
		const totalPaidAmount = totalPaidInvoices.reduce((sum, i) => sum + (i.netToPay || 0), 0);
		const totalSupplierPayable = b2bSuppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0);
		return {
			bucketCurrent,
			bucket31_60,
			bucket61_90,
			bucket90Plus,
			totalUnpaid,
			totalPaidAmount,
			paidCount: totalPaidInvoices.length,
			unpaidCount: invoices.length - totalPaidInvoices.length,
			totalSupplierPayable
		};
	}, [invoices, b2bSuppliers]);
	const filteredInvoices = React.useMemo(() => {
		return invoices.filter((inv) => {
			if (filterMode === "unpaid" && inv.status === "Paid") return false;
			if (filterMode === "paid" && inv.status !== "Paid") return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesNum = inv.docNumber.toLowerCase().includes(q);
				const matchesClient = inv.clientName.toLowerCase().includes(q);
				if (!matchesNum && !matchesClient) return false;
			}
			return true;
		});
	}, [
		invoices,
		filterMode,
		searchQuery
	]);
	const handleConfirmSettlement = (e: any) => {
		e.preventDefault();
		if (!settlementDoc) return;
		updateCommercialDoc(settlementDoc.id, {
			status: "Paid",
			paymentMethod: settleMethod,
			notesBottom: `Réglé le ${settleDate} par ${settleMethod}${settleRef ? ` (Réf: ${settleRef})` : ""}.`
		});
		const client = b2bClients.find((c) => c.id === settlementDoc.clientId);
		if (client) {
			const newBal = Math.max(0, (client.outstandingBalance || 0) - settlementDoc.netToPay);
			updateB2bClient(client.id, { outstandingBalance: newBal });
		}
		setSettlementDoc(null);
	};
	const columns = [
		{
			key: "docNumber",
			header: t("trading_sales_col_doc_num", "N° Facture"),
			width: "180px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">{doc.docNumber}</span>
		},
		{
			key: "date",
			header: t("trading_sales_col_date_due", "Date & Échéance"),
			width: "140px",
			renderCell: (doc: any) => /* @__PURE__ */ <div className="text-xs font-mono">
<div className="text-neutral-800 dark:text-neutral-200">{doc.date}</div>
<div className="text-[10px] text-neutral-400">
{"Éch: "}
{doc.dueDate || "30j"}
</div>
</div>
		},
		{
			key: "client",
			header: t("trading_sales_col_client", "Client B2B"),
			minWidth: "220px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{doc.clientName}</span>
		},
		{
			key: "netToPay",
			header: t("trading_sales_col_net_to_pay", "Montant Net TTC"),
			width: "150px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">{formatMoney(doc.netToPay)}</span>
		},
		{
			key: "status",
			header: t("trading_sales_col_status", "État du Paiement"),
			width: "140px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${doc.status === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"}`}>
{doc.status === "Paid" ? language === "ar" ? "مسددة / مدفوعة" : "Encaissée / Soldée" : language === "ar" ? "غير مسددة" : "Non Encaissée"}
</span>
		},
		{
			key: "actions",
			header: "",
			width: "140px",
			renderCell: (doc: any) => /* @__PURE__ */ <div className="flex items-center justify-end">
{doc.status !== "Paid" ? /* @__PURE__ */ <button onClick={() => setSettlementDoc(doc)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer">
<CheckCircle size={13} />
<span>{t("trading_finance_settle_invoice", "Encaisser")}</span>
</button> : /* @__PURE__ */ <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">Soldée ✓</span>}
</div>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: commercialDocs.length > 0
	});
	if (showSkeleton && (commercialDocs.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2*",
				minWidth: "150px"
			},
			{
				width: "2.5*",
				minWidth: "180px"
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
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn={false} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Wallet size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("trading_finance_title", "Règlements, Trésorerie & Balance Âgée")}</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">{language === "ar" ? "تحصيل الشركات" : "Recouvrement B2B"}</span>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
{language === "ar" ? "التحصيلات المحققة الفعلية" : "Encaissements Clientèle Réalisés"}
</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
{agingAnalysis.paidCount}
{" soldées"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{formatMoney(agingAnalysis.totalPaidAmount)}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
<CheckCircle size={13} className="text-emerald-500" />
<span>Règlements reçus par virement, chèque ou espèces</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
{language === "ar" ? "المستحقات الواجبة للموردين" : "Dettes Fournisseurs Exigibles"}
</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
{b2bSuppliers.length}
{" fournisseurs"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{formatMoney(agingAnalysis.totalSupplierPayable)}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
<Clock size={13} className="text-blue-500" />
<span>Échéancier de trésorerie décaissable</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">
{language === "ar" ? "إجمالي مستحقات العملاء غير المحصلة" : "Créances Clients Non Encaissées"}
</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
{agingAnalysis.unpaidCount}
{" ouvertes"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">{formatMoney(agingAnalysis.totalUnpaid)}</div>
<div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
<span className="flex items-center gap-1">
{agingAnalysis.bucket90Plus > 0 ? /* @__PURE__ */ <span className="text-[#FB923C] font-semibold">
{formatMoney(agingAnalysis.bucket90Plus)}
{" en contentieux (>90j)"}
</span> : /* @__PURE__ */ <span className="text-emerald-400">Aucun dossier en contentieux</span>}
</span>
<span className="font-mono text-stone-300">Total B2B</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
{language === "ar" ? "تحليل أعمار الديون (Balance Âgée)" : "Balance Âgée des Créances Commerciales (4 Paliers)"}
</span>
<span className="text-[11px] font-mono text-neutral-400">Base de calcul: Date d'émission de la facture fiscale</span>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
<div className="p-4 rounded-[18px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs">
<span className="text-xs font-semibold text-neutral-500 block mb-1">{t("trading_finance_aging_current", "0 à 30 jours (Courant)")}</span>
<div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(agingAnalysis.bucketCurrent)}</div>
<span className="text-[10px] text-neutral-400 mt-1 block">{language === "ar" ? "مستحقات اعتيادية" : "Créances normales sous délai légal"}</span>
</div>
<div className="p-4 rounded-[18px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs">
<span className="text-xs font-semibold text-neutral-500 block mb-1">{t("trading_finance_aging_31_60", "31 à 60 jours")}</span>
<div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">{formatMoney(agingAnalysis.bucket31_60)}</div>
<span className="text-[10px] text-amber-600/80 mt-1 block">{language === "ar" ? "تذكير ودي" : "Relance commerciale de courtoisie"}</span>
</div>
<div className="p-4 rounded-[18px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs">
<span className="text-xs font-semibold text-neutral-500 block mb-1">{t("trading_finance_aging_61_90", "61 à 90 jours")}</span>
<div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 tabular-nums">{formatMoney(agingAnalysis.bucket61_90)}</div>
<span className="text-[10px] text-orange-600/80 mt-1 block">{language === "ar" ? "إشعار بالسداد مطلوب" : "Mise en demeure requise"}</span>
</div>
<div className="p-4 rounded-[18px] border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
<span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-1">{t("trading_finance_aging_90_plus", "> 90 jours (Contentieux)")}</span>
<div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">{formatMoney(agingAnalysis.bucket90Plus)}</div>
<span className="text-[10px] text-rose-500 mt-1 block">
{language === "ar" ? "ملف نزاع قضائي تجاري" : "Dossier contentieux / recouvrement forcé"}
</span>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
<div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
<button type="button" onClick={() => setFilterMode("unpaid")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${filterMode === "unpaid" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"}`}>
<span>{language === "ar" ? "غير مسددة" : "En Attente d'Encaissement"}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${filterMode === "unpaid" ? "bg-[#d4522f]/15 text-[#d4522f]" : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500"}`}>{agingAnalysis.unpaidCount}</span>
</button>
<button type="button" onClick={() => setFilterMode("paid")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${filterMode === "paid" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"}`}>
<span>{language === "ar" ? "المسددة" : "Factures Soldées"}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${filterMode === "paid" ? "bg-[#d4522f]/15 text-[#d4522f]" : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500"}`}>{agingAnalysis.paidCount}</span>
</button>
<button type="button" onClick={() => setFilterMode("all")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${filterMode === "all" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"}`}>
<span>{language === "ar" ? "الكل" : "Toutes les Factures"}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${filterMode === "all" ? "bg-[#d4522f]/15 text-[#d4522f]" : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500"}`}>{invoices.length}</span>
</button>
</div>
<div className="self-end sm:self-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث برقم الفاتورة، العميل..." : "Filtrer N° facture, client..."} shutSize={36} openWidth={280} />
</div>
</div>
<div className="w-full">
<UniversalDataCollection items={filteredInvoices} keyExtractor={(inv) => inv.id} columns={columns} renderCard={(inv) => /* @__PURE__ */ <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-1">
<span className="font-mono text-xs font-bold">{inv.docNumber}</span>
<p className="font-bold text-xs">{inv.clientName}</p>
<div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
<span className="text-neutral-500">Net TTC:</span>
<span className="font-bold text-[#d4522f]">{formatMoney(inv.netToPay)}</span>
</div>
</div>} emptyTitle={language === "ar" ? "لا توجد فواتير مطابقة" : "Aucune facture trouvée"} emptyDescription={language === "ar" ? "جميع الفواتير التجارية مسددة أو لا توجد نتائج للبحث." : "Toutes les factures sont soldées ou aucun résultat ne correspond à votre filtre."} />
</div>
</div>
</div>
{settlementDoc && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
<div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
<h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
<CheckCircle size={18} className="text-emerald-600" />
<span>Enregistrer le Règlement Client</span>
</h2>
<button onClick={() => setSettlementDoc(null)} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"><X size={18} /></button>
</div>
<div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5 font-mono">
<div className="flex justify-between">
<span className="text-neutral-500 font-sans">Facture :</span>
<span className="font-bold text-neutral-900 dark:text-neutral-100">{settlementDoc.docNumber}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-500 font-sans">Client :</span>
<span className="text-neutral-900 dark:text-neutral-100">{settlementDoc.clientName}</span>
</div>
<div className="flex justify-between text-emerald-600 font-bold text-sm pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
<span className="font-sans">Montant Net :</span>
<span>{formatMoney(settlementDoc.netToPay)}</span>
</div>
</div>
<form onSubmit={handleConfirmSettlement} className="space-y-3 text-xs">
<LabelSelect label="Mode de Règlement Encaissé *" value={settleMethod} onChange={(val) => setSettleMethod(typeof val === "string" ? val : val?.target?.value || val)} options={[
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
										label: "Espèces (Timbre fiscal 1%)"
									},
									{
										value: "Traite / Effet",
										label: "Traite / Effet commercial"
									}
								]} />
<LabelInput label="N° Chèque / Référence Virement" placeholder="Ex: CHQ-0091823" value={settleRef} onChange={(e) => setSettleRef(e.target.value)} />
<LabelInput type="date" label="Date d'Encaissement *" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} required />
<div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
<AtriumButton type="button" variant="ghost" size="sm" onClick={() => setSettlementDoc(null)}>Annuler</AtriumButton>
<AtriumButton type="submit" variant="primary" size="sm">Valider l'Encaissement</AtriumButton>
</div>
</form>
</div>
</div>}
</div>;
};
