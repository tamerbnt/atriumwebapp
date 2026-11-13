import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  ArrowUpRight,
  Building2,
  Send,
  ShieldCheck,
  Package,
  Truck,
  Printer,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Receipt,
  FileText,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment, CourierCashDischarge, MerchantRemittanceBatch } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { AlgeriePosteSfp01Modal } from './AlgeriePosteSfp01Modal';
import { calculateDriverPayout } from '../../../utils/logisticsRules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const LogisticsCodView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { shipments, discharges, remittances, executeRemittance } = useLogisticsData();
	const [settledIds, setSettledIds] = React.useState(["shp_01"]);
	const [selectedShipment, setSelectedShipment] = React.useState<any>(null);
	const [isSfp01ModalOpen, setIsSfp01ModalOpen] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("shipments");
	const formatMoney = (amount: any) => {
		return `${amount.toLocaleString()} DZD`;
	};
	const deliveredShipments = shipments.filter((s) => s.status === "Delivered");
	const totalCodCollected = deliveredShipments.reduce((acc, s) => acc + s.codAmountDzd, 0);
	const totalShippingFees = deliveredShipments.reduce((acc, s) => acc + s.shippingFeeDzd, 0);
	const totalNetToMerchants = totalCodCollected - totalShippingFees;
	const handleSettle = (id: any, merchant: any, netAmount: any) => {
		if (!settledIds.includes(id)) {
			setSettledIds((prev) => [...prev, id]);
			showToast(isAr ? `تم تحويل مستحقات التاجر (${formatMoney(netAmount)}) بنجاح` : `Virement net de ${formatMoney(netAmount)} validé pour ${merchant}`, "success");
		}
	};
	const salariedDriverPay = calculateDriverPayout({
		employmentType: "salaried",
		completedDeliveries: 18,
		returnedDeliveries: 2,
		baseSalaryMonthlyDzd: 48e3,
		fuelAllowanceDzd: 1500
	});
	const freelanceDriverPay = calculateDriverPayout({
		employmentType: "freelance_commission",
		completedDeliveries: 26,
		returnedDeliveries: 3,
		commissionPerDeliveredDzd: 220,
		commissionPerReturnDzd: 50,
		fuelAllowanceDzd: 1e3,
		withholdingTaxRatePercent: 5
	});
	const getCodActions = (s: any) => {
		const net = s.codAmountDzd - s.shippingFeeDzd;
		const isSettled = settledIds.includes(s.id);
		return [
			{
				label: isAr ? "معاينة التسوية" : "Consulter Détail",
				icon: /* @__PURE__ */ <Eye size={14} />,
				onClick: () => setSelectedShipment(s)
			},
			...!isSettled ? [{
				label: isAr ? "تحويل للمتجر" : "Virer Net",
				icon: /* @__PURE__ */ <Send size={14} />,
				onClick: () => handleSettle(s.id, s.merchantName, net)
			}] : [],
			{
				label: isAr ? "وصل التحويل" : "Reçu Virement",
				icon: /* @__PURE__ */ <Printer size={14} />,
				onClick: () => {
					showToast(isAr ? `طباعة كشف تحويل المستحقات للطرد ${s.trackingCode}` : `Bordereau de reversement émis pour ${s.trackingCode}`, "info");
				}
			},
			{
				label: isAr ? "إشعار التاجر" : "Avis SMS",
				icon: /* @__PURE__ */ <Share2 size={14} />,
				onClick: () => {
					showToast(isAr ? `تم إرسال إشعار الدفع إلى ${s.merchantName}` : `Notification SMS de reversement envoyée à ${s.merchantName}`, "success");
				}
			}
		];
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: deliveredShipments.length > 0
	});
	if (showSkeleton && (deliveredShipments.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
				width: "1.2*",
				minWidth: "100px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><CreditCard size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "تحصيل COD" : language === "en" ? "COD Cash" : "Caisse COD"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Paiement à la Livraison</span>
</div>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap">
<AtriumButton variant="outline" size="sm" onClick={() => setIsSfp01ModalOpen(true)} icon={<Building2 size={14} />}>{isAr ? "بريد الجزائر SFP 01 / B1" : "Export CCP SFP 01"}</AtriumButton>
<AtriumButton variant="primary" size="sm" onClick={() => {
							showToast(isAr ? "تم تصدير كشف تسوية COD للمتاجر" : "Bordereau de reversement exporté", "info");
							window.print();
						}} icon={<ArrowUpRight size={14} />}>{isAr ? "تصدير كشف التسوية" : "Bordereau Marchands"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "مؤشرات صندوق التحصيل وأموال التجار" : "Trésorerie des Encaissements & Reversements"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي المقبوض نقداً عند الاستلام" : "Total Brut Encaissé (Livreurs)"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalCodCollected)}</div>
<p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
{deliveredShipments.length}
{" "}
{isAr ? "طرد تم تسليمه بنجاح" : "expéditions encaissées"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "رسوم التوصيل المستحقة للشركة" : "Commissions & Frais Livraison"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-[#d4522f] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalShippingFees)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">Chiffre d'affaires prestations</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "صافي مستحقات المتاجر للتحويل" : "Solde Net à Reverser"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Marchands</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalNetToMerchants)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
Prêt pour virement CCP / BaridiMob
</p>
</div>
</div>
</div>
</div>
<LiveSegmentedControl value={activeTab} onChange={(val) => setActiveTab(val)} size="sm" options={[
					{
						id: "shipments",
						label: isAr ? "تسويات" : language === "fr" ? "Colis" : "Parcels",
						tooltip: isAr ? "تسويات الطرود المسلّمة" : language === "fr" ? "Rapprochement Colis" : "Delivered parcels reconciliation",
						count: deliveredShipments.length
					},
					{
						id: "discharges",
						label: isAr ? "تبرئة" : language === "fr" ? "Décharges" : "Discharges",
						tooltip: isAr ? "تبرئة الذمة ومستندات السائقين" : language === "fr" ? "Bons de Décharge" : "Courier discharge vouchers",
						count: discharges.length
					},
					{
						id: "remittances",
						label: isAr ? "دفعات" : language === "fr" ? "Lots" : "Batches",
						tooltip: isAr ? "دفعات حوالات CCP SFP 01" : language === "fr" ? "Lots CCP SFP 01" : "Postal remittance batches (CCP SFP 01)",
						count: remittances.length
					},
					{
						id: "driver_payroll",
						label: isAr ? "أجور" : language === "fr" ? "Paie" : "Payroll",
						tooltip: isAr ? "أجور وعمولات السائقين" : language === "fr" ? "Paie Livreurs" : "Driver payroll & commissions"
					}
				]} />
{activeTab === "shipments" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex items-center justify-between">
<div>
<h2 className="text-sm font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{isAr ? "طرود جاهزة لتسوية المستحقات" : "Colis Livrés & Encaissements"}</h2>
</div>
<div className="text-xs font-mono font-bold text-[#d4522f]">
{deliveredShipments.length}
{" "}
{isAr ? "طرد" : "colis"}
</div>
</div>
<UniversalDataCollection items={deliveredShipments} keyExtractor={(s) => s.id} defaultViewMode="list" selectedIds={new Set(settledIds)} onSelectionChange={(newSet) => setSettledIds(Array.from(newSet))} onItemClick={setSelectedShipment} customActions={getCodActions} columns={[
						{
							id: "code",
							header: "AWB",
							width: "130px",
							renderCell: (s: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-[#d4522f]">{s.trackingCode}</span>
						},
						{
							id: "merchant",
							header: isAr ? "المتجر والتاريخ" : "Marchand / E-Boutique",
							renderCell: (s: any) => /* @__PURE__ */ <div>
<div className="font-semibold text-xs text-black dark:text-white">{s.merchantName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{s.createdAt.split("T")[0]}
{" • Dest: "}
{s.recipientName}
</div>
</div>
						},
						{
							id: "cod",
							header: "Brut Encaissé",
							width: "120px",
							renderCell: (s: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-black dark:text-white">{formatMoney(s.codAmountDzd)}</span>
						},
						{
							id: "fee",
							header: "Commission",
							width: "110px",
							renderCell: (s: any) => /* @__PURE__ */ <span className="font-mono text-xs text-black/55 dark:text-white/55">
-
{formatMoney(s.shippingFeeDzd)}
</span>
						},
						{
							id: "net",
							header: "Net Marchand",
							width: "120px",
							renderCell: (s: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">{formatMoney(s.codAmountDzd - s.shippingFeeDzd)}</span>
						},
						{
							id: "settled",
							header: "Statut",
							width: "110px",
							renderCell: (s: any) => {
								const isSettled = settledIds.includes(s.id);
								return /* @__PURE__ */ <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSettled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>{isSettled ? "Viré" : "À Régler"}</span>;
							}
						}
					]} />
</div>}
{activeTab === "discharges" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between">
<div>
<h3 className="text-sm font-bold text-black dark:text-white">
{isAr ? "محاضر تبرئة ذمة السائقين (Double-Lock Vault)" : "Registre des Billets de Décharge Chauffeurs"}
</h3>
</div>
<span className="text-xs font-mono font-bold text-black/70 dark:text-white/75">
{discharges.length}
{" procès-verbaux"}
</span>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left text-xs">
<thead>
<tr className="border-b border-neutral-200 dark:border-neutral-700 text-black/55 dark:text-white/55 font-medium">
<th className="py-2 px-3">N° Décharge</th>
<th className="py-2 px-3">Chauffeur</th>
<th className="py-2 px-3">Date & Heure</th>
<th className="py-2 px-3 text-right">Attendu</th>
<th className="py-2 px-3 text-right">Compté</th>
<th className="py-2 px-3 text-right">Écart</th>
<th className="py-2 px-3">Statut</th>
<th className="py-2 px-3 text-right">Action</th>
</tr>
</thead>
<tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
{discharges.map((d) => /* @__PURE__ */ <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
<td className="py-2.5 px-3 font-bold text-[#d4522f]">{d.dischargeNumber}</td>
<td className="py-2.5 px-3 font-sans font-semibold text-black dark:text-white">{d.courierStaffId}</td>
<td className="py-2.5 px-3 text-black/55 dark:text-white/55">{d.timestamp.replace("T", " ").slice(0, 16)}</td>
<td className="py-2.5 px-3 text-right">{formatMoney(d.expectedCodDzd)}</td>
<td className="py-2.5 px-3 text-right font-bold text-black dark:text-white">{formatMoney(d.actualCashTurnedInDzd)}</td>
<td className={`py-2.5 px-3 text-right font-bold ${d.discrepancyDzd === 0 ? "text-emerald-600" : d.discrepancyDzd < 0 ? "text-red-600" : "text-blue-600"}`}>{d.discrepancyDzd === 0 ? "0 DZD" : `${d.discrepancyDzd} DZD`}</td>
<td className="py-2.5 px-3 font-sans">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === "Clean" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"}`}>{d.status === "Clean" ? "Décharge Conforme" : "Manquant (Shortage)"}</span>
</td>
<td className="py-2.5 px-3 text-right font-sans">
<AtriumButton variant="ghost" size="xs" onClick={() => {
												showToast(isAr ? "طباعة محضر التبرئة" : "Impression décharge", "info");
												window.print();
											}} icon={<Printer size={12} />}>Reçu</AtriumButton>
</td>
</tr>)}
</tbody>
</table>
</div>
</div>}
{activeTab === "remittances" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between">
<div>
<h3 className="text-sm font-bold text-black dark:text-white">
{isAr ? "دفعات التحويل البريدي للتجار (Algérie Poste & BaridiMob)" : "Lots de Règlements E-Commerçants"}
</h3>
</div>
<AtriumButton variant="primary" size="sm" onClick={() => setIsSfp01ModalOpen(true)} icon={<Building2 size={14} />}>{isAr ? "تصدير SFP 01" : "Générer Fichier ASCII"}</AtriumButton>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left text-xs">
<thead>
<tr className="border-b border-neutral-200 dark:border-neutral-700 text-black/55 dark:text-white/55 font-medium">
<th className="py-2 px-3">Lot N°</th>
<th className="py-2 px-3">Commerçant</th>
<th className="py-2 px-3">Compte CCP / Clé</th>
<th className="py-2 px-3">Canal</th>
<th className="py-2 px-3 text-right">Net à Verser</th>
<th className="py-2 px-3">Statut</th>
<th className="py-2 px-3 text-right">Action</th>
</tr>
</thead>
<tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
{remittances.map((r) => /* @__PURE__ */ <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
<td className="py-2.5 px-3 font-bold text-[#d4522f]">{r.batchNumber}</td>
<td className="py-2.5 px-3 font-sans font-semibold text-black dark:text-white">{r.merchantName}</td>
<td className="py-2.5 px-3 text-black/70 dark:text-white/75">
{r.ccpAccount}
{" "}
<span className="text-[#d4522f] font-bold">
{"Clé "}
{r.ccpKey}
</span>
</td>
<td className="py-2.5 px-3 font-sans">
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">{r.paymentChannel}</span>
</td>
<td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(r.netPayoutDzd)}</td>
<td className="py-2.5 px-3 font-sans">
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "Executed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>{r.status === "Executed" ? "Exécuté" : "En Attente"}</span>
</td>
<td className="py-2.5 px-3 text-right font-sans">
{r.status !== "Executed" ? /* @__PURE__ */ <AtriumButton variant="primary" size="xs" onClick={() => {
												executeRemittance(r.id);
												showToast(isAr ? `تم تنفيذ التحويل للدفعة ${r.batchNumber}` : `Virement ${r.batchNumber} exécuté`, "success");
											}} icon={<Send size={12} />}>Exécuter</AtriumButton> : /* @__PURE__ */ <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">Archivé</span>}
</td>
</tr>)}
</tbody>
</table>
</div>
</div>}
{activeTab === "driver_payroll" && /* @__PURE__ */ <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="p-5 rounded-[24px] bg-[#F3EDE7] dark:bg-neutral-800/40 border border-[#E6DED6] dark:border-neutral-800/60 space-y-4">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold"><Truck size={18} /></div>
<div>
<h3 className="font-bold text-sm text-black dark:text-white">{isAr ? "سائق أجير دائم (Salarié CDI)" : "Chauffeur Salarié Flotte Interne"}</h3>
</div>
</div>
<div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Base Journalière (48 000 DZD / 26j):</span>
<span className="font-mono font-bold">1 846 DZD</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Prime de Rendement (18 colis × 50 DZD):</span>
<span className="font-mono font-bold text-emerald-600">+900 DZD</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Indemnité Carburant / Péage:</span>
<span className="font-mono font-bold">+1 500 DZD</span>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
<span>Net Journalier à Payer:</span>
<span className="font-mono text-[#d4522f]">{formatMoney(salariedDriverPay.netPayoutDzd)}</span>
</div>
</div>
</div>
<div className="p-5 rounded-[24px] bg-[#F3EDE7] dark:bg-neutral-800/40 border border-[#E6DED6] dark:border-neutral-800/60 space-y-4">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold"><UserCheck size={18} /></div>
<div>
<h3 className="font-bold text-sm text-black dark:text-white">
{isAr ? "سائق مقاول ذاتي (Auto-Entrepreneur)" : "Livreur Sous-Traitant Auto-Entrepreneur"}
</h3>
</div>
</div>
<div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Colis Livrés (26 × 220 DZD):</span>
<span className="font-mono font-bold">5 720 DZD</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Retours Traités (3 × 50 DZD):</span>
<span className="font-mono font-bold">+150 DZD</span>
</div>
<div className="flex justify-between text-red-600">
<span>Retenue Impôt Libératoire IFU 5%:</span>
<span className="font-mono font-bold">
-
{formatMoney(freelanceDriverPay.taxWithheldDzd)}
</span>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between font-bold text-sm">
<span>Net Viré au Chauffeur:</span>
<span className="font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(freelanceDriverPay.netPayoutDzd)}</span>
</div>
</div>
</div>
</div>}
<AlgeriePosteSfp01Modal isOpen={isSfp01ModalOpen} onClose={() => setIsSfp01ModalOpen(false)} batches={remittances} />
</div>;
};
