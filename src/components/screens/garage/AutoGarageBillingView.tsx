import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Printer,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Car,
  Wrench,
  Package,
  Receipt,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Building2,
  FileText,
  AlertTriangle,
  Wallet,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import {
  useGarageData,
  RepairOrder,
  GarageInvoice,
  CorporateFleetAccount,
  computeAlgerianTimbreFiscal,
} from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const AutoGarageBillingView: React.FC<any> = () => {
	const { language, activeGarageRole, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { orders, fleets, invoices, updateOrder, createInvoice, markInvoicePaid } = useGarageData();
	const [activeScreenTab, setActiveScreenTab] = React.useState("orders");
	const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
	const [billingFilter, setBillingFilter] = React.useState("all");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
	const [orderToSettle, setOrderToSettle] = React.useState<any>(null);
	const [billingType, setBillingType] = React.useState("facture_dgi");
	const [paymentMethod, setPaymentMethod] = React.useState("especes");
	const [discountAmount, setDiscountAmount] = React.useState("0");
	const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
	const [activePrintInvoice, setActivePrintInvoice] = React.useState<any>(null);
	const [isTillModalOpen, setIsTillModalOpen] = React.useState(false);
	const filteredBillingOrders = React.useMemo(() => {
		return orders.filter((o) => {
			if (billingFilter === "settled" && o.status !== "Delivered") return false;
			if (billingFilter === "pending" && o.status === "Delivered") return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return o.vehiclePlate.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q) || o.vehicleModel.toLowerCase().includes(q);
			}
			return true;
		});
	}, [
		orders,
		billingFilter,
		searchQuery
	]);
	const totalOrdersAmount = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
	const settledAmount = orders.filter((o) => o.status === "Delivered").reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);
	const pendingCollectionAmount = totalOrdersAmount - settledAmount;
	const corporateFleetArTotal = fleets.reduce((acc, f) => acc + f.currentOutstandingDzd, 0);
	const handleExecutePayment = (e: any) => {
		e.preventDefault();
		if (!orderToSettle) return;
		const laborHt = orderToSettle.laborCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * .25 : 3750);
		const partsHt = orderToSettle.partsCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * .75 : 15500);
		const disc = parseFloat(discountAmount) || 0;
		const subtotalHt = Math.max(0, laborHt + partsHt - disc);
		const tva = billingType === "facture_dgi" ? Math.round(subtotalHt * .19) : 0;
		const ttc = subtotalHt + tva;
		const timbre = computeAlgerianTimbreFiscal(ttc, paymentMethod);
		const net = ttc + timbre;
		const newInvoice = {
			id: `inv_${Date.now()}`,
			accountId: "acc_01",
			businessId: "biz_garage",
			branchId: "branch_garage_main",
			staffId: "stf_01",
			invoiceNumber: billingType === "facture_dgi" ? `FAC-2026-${Math.floor(1e3 + Math.random() * 9e3)}` : `BC-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
			orderId: orderToSettle.id,
			orderNumber: orderToSettle.orderNumber,
			vehiclePlate: orderToSettle.vehiclePlate,
			vehicleModel: orderToSettle.vehicleModel,
			clientId: orderToSettle.fleetId || "client_01",
			clientName: orderToSettle.clientName,
			clientPhone: orderToSettle.clientPhone,
			clientType: orderToSettle.clientType || "individual",
			clientNif: orderToSettle.clientType === "corporate_fleet" ? "001916012345678" : void 0,
			clientNis: orderToSettle.clientType === "corporate_fleet" ? "00191601234" : void 0,
			billingType,
			paymentMethod,
			laborTotalHt: laborHt,
			partsTotalHt: partsHt,
			discountHt: disc,
			subtotalHt,
			tvaRate: billingType === "facture_dgi" ? 19 : 0,
			tvaAmount: tva,
			totalTtc: ttc,
			timbreFiscal: timbre,
			netToPayDzd: net,
			issuedAt: (/* @__PURE__ */ new Date()).toISOString(),
			isPaid: true
		};
		createInvoice(newInvoice as any);
		const updatedOrder = {
			...orderToSettle,
			status: "Delivered",
			finalCostDzd: net,
			isPaid: true,
			billingType,
			invoiceId: newInvoice.id
		};
		updateOrder(updatedOrder as any);
		setIsPaymentModalOpen(false);
		setActivePrintInvoice(newInvoice);
		setIsPrintModalOpen(true);
		showToast(isAr ? `تم تسجيل التحصيل المالي (${formatMoney(net, language)}) وطباعة الفاتورة` : `Règlement enregistré (${formatMoney(net, language)}) & Facture émise avec succès`, "success");
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: orders.length > 0 || invoices.length > 0
	});
	if (showSkeleton && (orders.length === 0 && invoices.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
	return /* @__PURE__ */ <div className="flex-1 flex overflow-hidden bg-neutral-100 dark:bg-neutral-950">
<div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5">
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-black uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white flex items-center gap-2.5 font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
<CreditCard className="text-[#d4522f]" size={32} />
<span>
{isAr ? "الصندوق والفوترة الجبائية (Facturation DGI)" : "Facturation DGI, Caisse & Règlements Flottes"}
</span>
</h1>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="secondary" icon={<Wallet size={15} />} onClick={() => setIsTillModalOpen(true)}>{isAr ? "حالة الصندوق (Z Caisse)" : "Point de Caisse (Z)"}</AtriumButton>
</div>
</div>
<div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs w-fit">
<button type="button" onClick={() => setActiveScreenTab("orders")} title={isAr ? "أوامر التصليح للتسوية" : language === "fr" ? "Ordres de réparation à encaisser" : "Orders ready for settlement"} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeScreenTab === "orders" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "تسوية" : language === "fr" ? "Ordres" : "Orders"}</button>
<button type="button" onClick={() => setActiveScreenTab("fleets")} title={isAr ? "حسابات أساطيل B2B" : language === "fr" ? "Comptes Flottes B2B & Relevés" : "Corporate B2B fleet accounts"} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeScreenTab === "fleets" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "أساطيل" : language === "fr" ? "Flottes" : "Fleets"}</button>
<button type="button" onClick={() => setActiveScreenTab("invoices")} title={isAr ? `سجل الفواتير الصادرة (${invoices.length})` : language === "fr" ? `Factures Émises (${invoices.length})` : `Issued invoices (${invoices.length})`} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeScreenTab === "invoices" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "فواتير" : language === "fr" ? "Factures" : "Invoices"}</button>
</div>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
<div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs">
<span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">{isAr ? "المداخيل المحصلة" : "Chiffre Encaissé (Comptant)"}</span>
<span className="text-xl font-black text-emerald-600 font-mono tabular-nums mt-0.5 block">{formatMoney(settledAmount, language)}</span>
</div>
<div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs">
<span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">{isAr ? "مستحقات قيد التحصيل" : "En Attente Règlement"}</span>
<span className="text-xl font-black text-amber-600 font-mono tabular-nums mt-0.5 block">{formatMoney(pendingCollectionAmount, language)}</span>
</div>
<div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs">
<span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">{isAr ? "ديون أساطيل B2B المؤجلة" : "Créances Flottes (Encours)"}</span>
<span className="text-xl font-black text-[#d4522f] font-mono tabular-nums mt-0.5 block">{formatMoney(corporateFleetArTotal, language)}</span>
</div>
<div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs">
<span className="text-[11px] font-semibold text-black/55 dark:text-white/55 block">{isAr ? "طابع جبائي مجمع (DGI)" : "Droits de Timbre Fiscal"}</span>
<span className="text-xl font-black text-black dark:text-white font-mono tabular-nums mt-0.5 block">
{formatMoney(invoices.reduce((acc, i) => acc + (i.timbreFiscal || 0), 0), language)}
</span>
</div>
</div>
{activeScreenTab === "orders" && /* @__PURE__ */ <div className="w-full">
<UniversalDataCollection data={filteredBillingOrders} keyExtractor={(o) => o.id} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder={isAr ? "البحث عن مركبة أو أمر للتسوية..." : "Recherche véhicule ou ordre à encaisser..."} onItemClick={(order) => setSelectedOrder(order)} columns={[
								{
									id: "orderNumber",
									header: "N° OR",
									width: "130px",
									cell: (o: any) => /* @__PURE__ */ <span className="font-mono font-bold text-[#d4522f]">{o.orderNumber}</span>
								},
								{
									id: "vehicle",
									header: "Véhicule & Immatriculation",
									cell: (o: any) => /* @__PURE__ */ <div>
<span className="font-semibold text-black dark:text-white block font-mono">{o.vehiclePlate}</span>
<span className="text-xs text-black/55 dark:text-white/55 block">{o.vehicleModel}</span>
</div>
								},
								{
									id: "client",
									header: "Client & Compte",
									cell: (o: any) => /* @__PURE__ */ <div>
<span className="font-medium text-black dark:text-white block">{o.clientName}</span>
<span className="text-xs text-[#d4522f]">{o.clientType === "corporate_fleet" ? `Flotte: ${o.fleetName}` : "Particulier"}</span>
</div>
								},
								{
									id: "status",
									header: "Statut Atelier",
									cell: (o: any) => /* @__PURE__ */ <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${o.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{o.status === "Delivered" ? "Réglé & Livré" : "À Encaisser"}</span>
								},
								{
									id: "amount",
									header: "Montant TTC",
									cell: (o: any) => /* @__PURE__ */ <div className="text-right font-mono font-black text-black dark:text-white">{formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}</div>
								}
							]} />
</div>}
{activeScreenTab === "fleets" && /* @__PURE__ */ <div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
{fleets.map((fleet) => {
								const percentUsed = Math.min(100, Math.round(fleet.currentOutstandingDzd / fleet.creditLimitDzd * 100));
								const isOverLimit = fleet.currentOutstandingDzd > fleet.creditLimitDzd;
								return /* @__PURE__ */ <div key={fleet.id} className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-4">
<div className="flex items-start justify-between">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Contrat B2B Flotte</span>
<h3 className="font-bold text-sm text-black dark:text-white mt-0.5">{fleet.companyName}</h3>
<span className="text-xs text-black/55 dark:text-white/55">{fleet.tradeName}</span>
</div>
<span className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75"><Building2 size={18} /></span>
</div>
<div className="space-y-1.5 text-xs font-mono">
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>NIF / NIS :</span>
<span className="font-semibold text-black dark:text-white">{fleet.nif}</span>
</div>
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>Véhicules sous contrat :</span>
<span className="font-semibold text-black dark:text-white">
{fleet.activeVehicleCount}
{" utilitaires"}
</span>
</div>
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>Délai de paiement :</span>
<span className="font-semibold text-black dark:text-white">
{fleet.paymentTermsDays}
{" jours fin de mois"}
</span>
</div>
</div>
<div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between text-xs font-mono">
<span className="text-black/55 dark:text-white/55">Encours Actuel :</span>
<span className={`font-black ${isOverLimit ? "text-rose-600" : "text-black dark:text-white"}`}>{formatMoney(fleet.currentOutstandingDzd, language)}</span>
</div>
<div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
<div style={{ width: `${percentUsed}%` }} className={`h-full rounded-full transition-all ${isOverLimit ? "bg-rose-500" : percentUsed > 75 ? "bg-amber-500" : "bg-[#d4522f]"}`} />
</div>
<div className="flex justify-between text-[10px] text-black/55 dark:text-white/55 font-mono">
<span>
{"Plafond: "}
{formatMoney(fleet.creditLimitDzd, language)}
</span>
<span>
{percentUsed}
% utilisé
</span>
</div>
</div>
<div className="pt-2 flex items-center gap-2">
<button type="button" onClick={() => {
													showToast(`Génération du relevé mensuel pour ${fleet.companyName}...`, "info");
												}} className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black/70 dark:text-white/75 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
<FileText size={13} />
<span>Relevé Mensuel</span>
</button>
</div>
</div>;
							})}
</div>
</div>}
{activeScreenTab === "invoices" && /* @__PURE__ */ <div className="w-full">
<div className="space-y-3">
{invoices.map((inv) => /* @__PURE__ */ <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs gap-3 text-xs">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold"><Receipt size={20} /></div>
<div>
<div className="flex items-center gap-2">
<span className="font-mono font-bold text-black dark:text-white text-sm">{inv.invoiceNumber}</span>
<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.billingType === "facture_dgi" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-neutral-100 text-black/70 dark:text-white/75"}`}>{inv.billingType === "facture_dgi" ? "Facture Fiscale DGI" : "Bon de Caisse"}</span>
</div>
<span className="text-black/55 dark:text-white/55 block mt-0.5">
{inv.clientName}
{" · "}
{inv.vehiclePlate}
{" ("}
{inv.vehicleModel}
)
</span>
</div>
</div>
<div className="flex items-center justify-between sm:justify-end gap-5">
<div className="text-right font-mono">
<span className="text-black/55 dark:text-white/55 block text-[10px]">
{"TVA 19%: "}
{formatMoney(inv.tvaAmount, language)}
{" · Timbre: "}
{formatMoney(inv.timbreFiscal, language)}
</span>
<span className="text-sm font-black text-[#d4522f] block">{formatMoney(inv.netToPayDzd, language)}</span>
</div>
<AtriumButton variant="secondary" icon={<Printer size={13} />} onClick={() => {
											setActivePrintInvoice(inv);
											setIsPrintModalOpen(true);
										}}>Imprimer</AtriumButton>
</div>
</div>)}
</div>
</div>}
</div>
{isPaymentModalOpen && orderToSettle && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
<div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
<div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center"><CreditCard size={18} /></div>
<div>
<h3 className="font-bold text-sm text-black dark:text-white">
{isAr ? "تسوية المستحقات وإصدار الفاتورة" : "Règlement Financier & Facturation"}
</h3>
<span className="text-xs text-black/55 dark:text-white/55 font-mono">
{orderToSettle.orderNumber}
{" · "}
{orderToSettle.vehiclePlate}
</span>
</div>
</div>
<button onClick={() => setIsPaymentModalOpen(false)} className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"><X size={16} /></button>
</div>
<form onSubmit={handleExecutePayment} className="space-y-4">
<div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
<button type="button" onClick={() => setBillingType("facture_dgi")} className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${billingType === "facture_dgi" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55"}`}>Facture DGI (19% TVA)</button>
<button type="button" onClick={() => setBillingType("bon_caisse")} className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${billingType === "bon_caisse" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55"}`}>Bon de Caisse (Atelier)</button>
</div>
<div className="space-y-1.5">
<label className="text-xs font-semibold text-black/70 dark:text-white/75 block">Mode de Paiement</label>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
{[
										{
											id: "especes",
											label: "Espèces (Cash)"
										},
										{
											id: "cib_dahabia",
											label: "Carte CIB/Dahabia"
										},
										{
											id: "cheque",
											label: "Chèque"
										},
										{
											id: "virement",
											label: "Virement"
										}
									].map((pm) => /* @__PURE__ */ <button key={pm.id} type="button" onClick={() => setPaymentMethod(pm.id)} className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${paymentMethod === pm.id ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75"}`}>{pm.label}</button>)}
</div>
</div>
<div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>Main d'œuvre :</span>
<span>{formatMoney(orderToSettle.laborCostDzd || 3750, language)}</span>
</div>
<div className="flex justify-between text-black/55 dark:text-white/55">
<span>Pièces utilisées :</span>
<span>{formatMoney(orderToSettle.partsCostDzd || 15500, language)}</span>
</div>
{billingType === "facture_dgi" && /* @__PURE__ */ <div className="flex justify-between text-black/55 dark:text-white/55">
<span>TVA Réglementaire (19%) :</span>
<span className="text-[#d4522f] font-bold">{formatMoney((orderToSettle.finalCostDzd || 19250) * .19, language)}</span>
</div>}
{paymentMethod === "especes" && /* @__PURE__ */ <div className="flex justify-between text-amber-700 dark:text-amber-400">
<span>Droit de Timbre Fiscal (Espèces) :</span>
<span className="font-bold">
{formatMoney(computeAlgerianTimbreFiscal((orderToSettle.finalCostDzd || 19250) * (billingType === "facture_dgi" ? 1.19 : 1), "especes"), language)}
</span>
</div>}
<div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-sm font-black text-black dark:text-white">
<span>Net à Payer Client :</span>
<span className="text-[#d4522f]">
{formatMoney((orderToSettle.finalCostDzd || 19250) * (billingType === "facture_dgi" ? 1.19 : 1) + (paymentMethod === "especes" ? computeAlgerianTimbreFiscal((orderToSettle.finalCostDzd || 19250) * (billingType === "facture_dgi" ? 1.19 : 1), "especes") : 0), language)}
</span>
</div>
</div>
<div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Annuler</AtriumButton>
<AtriumButton type="submit" variant="primary" icon={<CheckCircle2 size={15} />}>Valider l'Encaissement & Imprimer</AtriumButton>
</div>
</form>
</div>
</div>}
{isPrintModalOpen && activePrintInvoice && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
<div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-neutral-200 text-black space-y-6 max-h-[90vh] overflow-y-auto">
<div className="flex items-start justify-between border-b pb-4 border-neutral-200">
<div>
<h2 className="text-xl font-black tracking-tight text-black">ATRIUM AUTO GARAGE & FLEET DZ</h2>
<p className="text-xs text-black/55 mt-0.5">Réparation Mécanique, Électricité & Maintenance Flottes B2B</p>
<div className="text-[10px] text-black/55 font-mono mt-1 space-x-2">
<span>RC: 16/00-0987654B20</span>
<span>·</span>
<span>NIF: 002016012345678</span>
<span>·</span>
<span>NIS: 00201601234</span>
<span>·</span>
<span>AI: 16012345678</span>
</div>
</div>
<div className="text-right">
<span className="font-mono text-base font-black text-[#d4522f] block">{activePrintInvoice.invoiceNumber}</span>
<span className="text-xs text-black/55 block font-mono">{new Date(activePrintInvoice.issuedAt).toLocaleDateString()}</span>
</div>
</div>
<div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 text-xs font-mono">
<div>
<span className="text-black/55 block">Client / Bénéficiaire :</span>
<span className="font-bold text-black block text-sm">{activePrintInvoice.clientName}</span>
<span className="text-black/55">{activePrintInvoice.clientPhone}</span>
{activePrintInvoice.clientNif && /* @__PURE__ */ <span className="text-black/55 block">
{"NIF Client: "}
{activePrintInvoice.clientNif}
</span>}
</div>
<div>
<span className="text-black/55 block">Véhicule Pris en Charge :</span>
<span className="font-bold text-black block text-sm">{activePrintInvoice.vehiclePlate}</span>
<span className="text-black/55">{activePrintInvoice.vehicleModel}</span>
<span className="text-black/55 block">
{"Réf OR: "}
{activePrintInvoice.orderNumber}
</span>
</div>
</div>
<table className="w-full text-xs font-mono">
<thead>
<tr className="border-b border-neutral-300 text-black/55 text-left">
<th className="py-2">Désignation des Prestations & Pièces</th>
<th className="py-2 text-right">Montant HT</th>
</tr>
</thead>
<tbody className="divide-y divide-neutral-100">
<tr>
<td className="py-2.5">Main d'œuvre mécanique spécialisée & diagnostic</td>
<td className="py-2.5 text-right font-bold">
{activePrintInvoice.laborTotalHt.toLocaleString()}
{" DA"}
</td>
</tr>
<tr>
<td className="py-2.5">Pièces de rechange et lubrifiants certifiés conformes</td>
<td className="py-2.5 text-right font-bold">
{activePrintInvoice.partsTotalHt.toLocaleString()}
{" DA"}
</td>
</tr>
{activePrintInvoice.discountHt > 0 && /* @__PURE__ */ <tr className="text-emerald-700">
<td className="py-2.5">Remise commerciale accordée</td>
<td className="py-2.5 text-right font-bold">
-
{activePrintInvoice.discountHt.toLocaleString()}
{" DA"}
</td>
</tr>}
</tbody>
</table>
<div className="border-t border-neutral-200 pt-3 flex justify-end">
<div className="w-64 space-y-1.5 text-xs font-mono">
<div className="flex justify-between text-black/55">
<span>Total HT :</span>
<span>
{activePrintInvoice.subtotalHt.toLocaleString()}
{" DA"}
</span>
</div>
{activePrintInvoice.tvaAmount > 0 && /* @__PURE__ */ <div className="flex justify-between text-black/55">
<span>TVA (19%) :</span>
<span>
{activePrintInvoice.tvaAmount.toLocaleString()}
{" DA"}
</span>
</div>}
{activePrintInvoice.timbreFiscal > 0 && /* @__PURE__ */ <div className="flex justify-between text-amber-700 font-semibold">
<span>Timbre Fiscal (Espèces) :</span>
<span>
{activePrintInvoice.timbreFiscal.toLocaleString()}
{" DA"}
</span>
</div>}
<div className="flex justify-between pt-2 border-t border-neutral-300 text-sm font-black text-black">
<span>Net à Payer :</span>
<span className="text-[#d4522f]">
{activePrintInvoice.netToPayDzd.toLocaleString()}
{" DA"}
</span>
</div>
</div>
</div>
<div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-black/75 font-serif italic border border-neutral-200">
{"Arrêté la présente facture à la somme de : "}
{activePrintInvoice.netToPayDzd.toLocaleString()}
{" Dinars Algériens."}
</div>
<div className="flex items-center justify-between pt-4 border-t border-neutral-200">
<div className="text-center w-40 border border-neutral-300 rounded-xl p-2 h-20 text-[10px] text-black/55">Cachet de l'Atelier</div>
<div className="flex items-center gap-2">
<AtriumButton variant="secondary" onClick={() => setIsPrintModalOpen(false)}>Fermer</AtriumButton>
<AtriumButton variant="primary" icon={<Printer size={15} />} onClick={() => {
										window.print();
									}}>Imprimer Document</AtriumButton>
</div>
</div>
</div>
</div>}
{isTillModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
<div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
<h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
<Wallet size={16} className="text-[#d4522f]" />
<span>Point de Caisse Journalier (Z de Caisse)</span>
</h3>
<button onClick={() => setIsTillModalOpen(false)} className="text-black/55 dark:text-white/55"><X size={16} /></button>
</div>
<div className="space-y-3 text-xs font-mono">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
<span>Total Espèces en Caisse :</span>
<span className="font-bold text-emerald-600">
{formatMoney(invoices.filter((i) => i.paymentMethod === "especes").reduce((acc, i) => acc + i.netToPayDzd, 0), language)}
</span>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
<span>Total Cartes CIB / Dahabia :</span>
<span className="font-bold text-blue-600">
{formatMoney(invoices.filter((i) => i.paymentMethod === "cib_dahabia").reduce((acc, i) => acc + i.netToPayDzd, 0), language)}
</span>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
<span>Total Chèques & Virements :</span>
<span className="font-bold text-black dark:text-white">
{formatMoney(invoices.filter((i) => i.paymentMethod === "cheque" || i.paymentMethod === "virement").reduce((acc, i) => acc + i.netToPayDzd, 0), language)}
</span>
</div>
</div>
<div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="secondary" onClick={() => setIsTillModalOpen(false)}>Fermer</AtriumButton>
<AtriumButton variant="primary" onClick={() => {
									showToast("Session de caisse clôturée et rapport Z imprimé", "success");
									setIsTillModalOpen(false);
								}}>Clôturer la Caisse (Z)</AtriumButton>
</div>
</div>
</div>}
</div>;
};
