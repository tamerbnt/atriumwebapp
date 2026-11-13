import React, { useState } from 'react';
import {
  DollarSign,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Building2,
  Send,
  Clock,
  Printer,
  Scale,
  Truck,
  Eye,
  FileText,
  Share2,
  X,
  Check,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateArt317Timbre } from '../../../utils/agriRules';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { AgriHarvestTicket } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { AgriWeighbridgePrintModal } from './AgriWeighbridgePrintModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const AgricultureWholesaleView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const isAr = language === "ar";
	const { harvestTickets } = useAgricultureData();
	const [statusFilter, setStatusFilter] = React.useState("all");
	const [settledTickets, setSettledTickets] = React.useState(["pes_01"]);
	const [selectedTicket, setSelectedTicket] = React.useState<any>(null);
	const [inspectorTab, setInspectorTab] = React.useState("decompte");
	const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
	const getTicketGross = (t: any) => t.totalGrossDzd ?? t.subtotalProduceDzd ?? t.netWeightKg * t.unitPriceDzdPerKg;
	const getTicketFeePct = (t: any) => t.mandataireFeePercent ?? 6;
	const getTicketNet = (t: any) => {
		if (t.netFarmPayoutDzd !== void 0) return t.netFarmPayoutDzd;
		const gross = getTicketGross(t);
		return gross - gross * getTicketFeePct(t) / 100;
	};
	const totalGrossSales = harvestTickets.reduce((acc, t) => acc + getTicketGross(t), 0);
	const totalMandataireFees = harvestTickets.reduce((acc, t) => acc + getTicketGross(t) * getTicketFeePct(t) / 100, 0);
	const totalNetFarm = totalGrossSales - totalMandataireFees;
	const filteredTickets = harvestTickets.filter((t) => {
		const isSettled = settledTickets.includes(t.id);
		if (statusFilter === "settled") return isSettled;
		if (statusFilter === "pending") return !isSettled;
		return true;
	});
	const handleSettle = (id: any, ticketNumber: any, netAmount: any) => {
		if (!settledTickets.includes(id)) {
			setSettledTickets((prev) => [...prev, id]);
			showToast(isAr ? `تم استلام صافي مستحقات البيع (${formatMoney(netAmount)}) للوصل ${ticketNumber}` : `Encaissement du net mandataire ${formatMoney(netAmount)} confirmé`, "success");
		}
	};
	const statusOptions = [
		{
			value: "all",
			label: isAr ? "جميع المعاملات" : "Toutes les expéditions"
		},
		{
			value: "settled",
			label: isAr ? "تم التحصيل" : "Encaissés"
		},
		{
			value: "pending",
			label: isAr ? "قيد التحصيل" : "En attente de règlement"
		}
	];
	const getTicketActions = (t: any) => {
		const isSettled = settledTickets.includes(t.id);
		return [
			{
				label: isAr ? "معاينة التذكرة" : "Consulter Bordereau",
				icon: /* @__PURE__ */ <Eye size={14} />,
				onClick: () => setSelectedTicket(t)
			},
			...!isSettled ? [{
				label: isAr ? "تأكيد القبض" : "Encaisser Net",
				icon: /* @__PURE__ */ <Send size={14} />,
				onClick: () => handleSettle(t.id, t.ticketNumber, getTicketNet(t))
			}] : [],
			{
				label: isAr ? "وصل الوزن والتسليم" : "Bon de Pesée & BL",
				icon: /* @__PURE__ */ <Printer size={14} />,
				onClick: () => {
					setSelectedTicket(t);
					setIsPrintModalOpen(true);
				}
			},
			{
				label: isAr ? "مشاركة الوصل" : "Partager Bordereau",
				icon: /* @__PURE__ */ <Share2 size={14} />,
				onClick: () => {
					showToast(isAr ? `تم نسخ رابط تتبع الشحنة ${t.ticketNumber}` : `Lien de télé-déclaration mandataire ${t.ticketNumber} copié`, "success");
				}
			}
		];
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: harvestTickets.length > 0
	});
	if (showSkeleton && (harvestTickets.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.4*",
				minWidth: "130px"
			},
			{
				width: "1.2*",
				minWidth: "110px"
			},
			{
				width: "1.4*",
				minWidth: "130px"
			},
			{
				width: "1.5*",
				minWidth: "150px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Wallet size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isAr ? "مبيعات سوق الجملة والسيولة الفلاحية" : "Comptabilité Mandataires & Ventes Gros"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">Commission 6%</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<div className="w-48">
<FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
</div>
<AtriumButton variant="outline" onClick={() => window.print()} icon={<Printer size={14} />}>{isAr ? "طباعة الكشف" : "Imprimer Grand-Livre"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "حسابات الوكلاء والمبيعات الإجمالية" : "Comptabilité Ventes Gros & Mandataires"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي المبيعات الإجمالية (Brut)" : "Chiffre d’Affaires Brut Gros"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalGrossSales)}</div>
<p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
{harvestTickets.length}
{" "}
{isAr ? "شحنات مسوقة" : "expéditions aux mandataires"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "عمولة الوكلاء المقتطعة (6%)" : "Commissions Mandataires (6%)"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalMandataireFees)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "حسب القوانين السارية" : "Tarification légale marchés"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "صافي مستحقات المزرعة" : "Net à Verser Domaine"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Trésorerie Gros</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalNetFarm)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{settledTickets.length}
{" "}
{isAr ? "وصولات مسددة بالكامل" : "bordereaux encaissés"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "وصولات البيع وتسويات أسواق الجملة" : "Bordereaux de Criée & Ventes Mandataires"}
</h2>
</div>
<LiveSegmentedControl value={statusFilter} onChange={setStatusFilter} size="sm" options={[
							{
								id: "all",
								label: isAr ? "الكل" : "Tous",
								tooltip: isAr ? "جميع التسويات" : "Tous les bordereaux",
								count: harvestTickets.length
							},
							{
								id: "settled",
								label: isAr ? "مقبوضة" : "Encaissés",
								tooltip: isAr ? "تسويات مقبوضة" : "Bordereaux encaissés",
								count: settledTickets.length
							},
							{
								id: "pending",
								label: isAr ? "معلق" : "Attente",
								tooltip: isAr ? "قيد التحصيل عند الوكيل" : "En attente mandataire",
								count: harvestTickets.filter((t) => !settledTickets.includes(t.id)).length
							}
						]} />
</div>
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "وصولات وسجلات سوق الجملة" : "Bordereaux de Pesée & Ventes Mandataires"} subtitle={isAr ? "متابعة الشحنات والعمولات الفلاحية" : "Suivi des réceptions en criée, pesées et nets payés"} items={filteredTickets} keyExtractor={(t) => t.id} searchPlaceholder={isAr ? "بحث بالمنتج، الوكيل، الوصل..." : "Rechercher produit, mandataire, ticket, marché..."} searchFilter={(t, query) => t.cropDesignation.toLowerCase().includes(query.toLowerCase()) || t.destinationWholesaleMarket.toLowerCase().includes(query.toLowerCase()) || t.ticketNumber.toLowerCase().includes(query.toLowerCase()) || (t.driverName ? t.driverName.toLowerCase().includes(query.toLowerCase()) : false)} onSelectRow={(t) => setSelectedTicket(t)} customActions={(t) => getTicketActions(t)} columns={[
								{
									id: "ticketNumber",
									header: isAr ? "رقم الوصل" : "N° Bordereau",
									width: "130px",
									sortable: true,
									renderCell: (t: any) => /* @__PURE__ */ <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
<span className="bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">{t.ticketNumber}</span>
</div>
								},
								{
									id: "crop",
									header: isAr ? "المنتوج الفلاحي" : "Culture & Variété",
									renderCell: (t: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{t.cropDesignation}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{t.destinationWholesaleMarket}</span>
</div>
								},
								{
									id: "weight",
									header: isAr ? "الوزن الصافي" : "Poids Net",
									width: "120px",
									sortable: true,
									renderCell: (t: any) => /* @__PURE__ */ <div className="font-mono text-xs">
<span className="font-bold text-black dark:text-white">
{t.netWeightKg.toLocaleString()}
{" kg"}
</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">
{"Brut: "}
{t.grossWeightKg.toLocaleString()}
{" kg"}
</span>
</div>
								},
								{
									id: "unitPrice",
									header: isAr ? "سعر الكريّة" : "Cours Criée",
									width: "120px",
									renderCell: (t: any) => /* @__PURE__ */ <span className="font-mono text-xs font-semibold text-black/70 dark:text-white/75">
{t.unitPriceDzdPerKg}
{" DZD/kg"}
</span>
								},
								{
									id: "fee",
									header: isAr ? "العمولة (6%)" : "Com. Mandataire",
									width: "130px",
									renderCell: (t: any) => /* @__PURE__ */ <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-medium">
-
{formatMoney(getTicketGross(t) * getTicketFeePct(t) / 100)}
</span>
								},
								{
									id: "netPayout",
									header: isAr ? "صافي المزرعة" : "Net à Verser",
									width: "140px",
									sortable: true,
									renderCell: (t: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(getTicketNet(t))}</span>
								},
								{
									id: "status",
									header: isAr ? "الوضعية" : "Statut Trésorerie",
									width: "130px",
									renderCell: (t: any) => {
										const isSettled = settledTickets.includes(t.id);
										return /* @__PURE__ */ <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${isSettled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}`}>
{isSettled ? /* @__PURE__ */ <CheckCircle2 size={11} /> : /* @__PURE__ */ <Clock size={11} />}
{isSettled ? isAr ? "مقبوض" : "Encaissé" : isAr ? "في الانتظار" : "En attente"}
</span>;
									}
								}
							]} renderCard={(t) => {
								const isSettled = settledTickets.includes(t.id);
								return /* @__PURE__ */ <div className="p-4 flex flex-col justify-between h-full space-y-3">
<div className="flex items-start justify-between gap-2">
<span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">{t.ticketNumber}</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSettled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}`}>{isSettled ? isAr ? "مقبوض" : "Encaissé" : isAr ? "En attente" : "En attente"}</span>
</div>
<div>
<h4 className="font-bold text-xs text-black dark:text-white">{t.cropDesignation}</h4>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{t.destinationWholesaleMarket}
{" · "}
{t.driverName || "Non assigné"}
</p>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
<div>
<span className="text-[10px] text-black/55 dark:text-white/55 block">Poids Net</span>
<span className="font-mono font-bold text-black/70 dark:text-white/75">
{t.netWeightKg.toLocaleString()}
{" kg"}
</span>
</div>
<div className="text-right">
<span className="text-[10px] text-black/55 dark:text-white/55 block">Net Domaine</span>
<span className="font-mono font-bold text-[#d4522f] text-sm">{formatMoney(getTicketNet(t))}</span>
</div>
</div>
</div>;
							}} />
</div>
{selectedTicket && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Receipt size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 font-mono">{selectedTicket.ticketNumber}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55">{selectedTicket.destinationWholesaleMarket}</p>
</div>
</div>
<button onClick={() => setSelectedTicket(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
<button onClick={() => setInspectorTab("decompte")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "decompte" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "البيان المالي" : "Décompte"}</button>
<button onClick={() => setInspectorTab("pesee")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "pesee" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "ميزان الجسر" : "Pont-Bascule"}</button>
<button onClick={() => setInspectorTab("tracabilite")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "tracabilite" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "النقل والتتبع" : "Suivi lot"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{inspectorTab === "decompte" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Calcul Décompte Mandataire (Criée)</span>
<div className="flex items-center justify-between">
<span className="text-black/70 dark:text-white/75">Poids Facturé:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedTicket.netWeightKg.toLocaleString()}
{" kg"}
</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/70 dark:text-white/75">Prix Moyen Vente:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedTicket.unitPriceDzdPerKg}
{" DZD/kg"}
</span>
</div>
<div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
<span className="text-black dark:text-white font-medium">Chiffre d'Affaires Brut:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(getTicketGross(selectedTicket))}</span>
</div>
<div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
<span>Commission Mandataire (6%):</span>
<span className="font-mono font-bold">
-
{formatMoney(getTicketGross(selectedTicket) * getTicketFeePct(selectedTicket) / 100)}
</span>
</div>
</div>
<div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
<div className="flex items-center justify-between text-white/80 text-[11px]">
<span>Net Liquide à Verser Domaine</span>
<span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">Règlement</span>
</div>
<div className="text-2xl font-black tracking-tight text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(getTicketNet(selectedTicket))}</div>
<p className="text-[10px] text-white/75">
Versement direct sur compte d'exploitation agricole après déduction des frais de carreau.
</p>
</div>
<div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
<div>
<span className="font-semibold block text-black dark:text-white">Statut du Règlement</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{settledTickets.includes(selectedTicket.id) ? "Reçu et pointé en banque" : "En attente de chèque / virement"}
</span>
</div>
<button onClick={() => handleSettle(selectedTicket.id, selectedTicket.ticketNumber, getTicketNet(selectedTicket))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settledTickets.includes(selectedTicket.id) ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default" : "bg-[#d4522f] hover:bg-[#b06a4e] text-white"}`}>
{settledTickets.includes(selectedTicket.id) ? "Encaissé ✓" : "Marquer Encaissé"}
</button>
</div>
</div>}
{inspectorTab === "pesee" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2.5">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block flex items-center gap-1.5">
<Scale size={13} className="text-[#d4522f]" />
Ticket Pont-Bascule Électronique
</span>
<div className="grid grid-cols-2 gap-2 text-xs">
<div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block">Poids Brut (Entrée)</span>
<span className="font-mono font-bold text-black dark:text-white text-sm">
{selectedTicket.grossWeightKg.toLocaleString()}
{" kg"}
</span>
</div>
<div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block">Tare Camion (Sortie)</span>
<span className="font-mono font-bold text-black/70 dark:text-white/75 text-sm">
{(selectedTicket.truckTareKg || selectedTicket.tareWeightKg || 0).toLocaleString()}
{" kg"}
</span>
</div>
</div>
{(selectedTicket.crateCount || 0) > 0 && /* @__PURE__ */ <div className="p-2 bg-neutral-100 dark:bg-neutral-800/70 rounded-lg border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between text-xs">
<span className="text-black/70 dark:text-white/75">{isAr ? "خصم وزن الصناديق الفارغة :" : "Tare Caisses Déduite :"}</span>
<span className="font-mono font-semibold text-black dark:text-white">
{selectedTicket.crateCount}
{" × "}
{selectedTicket.crateUnitTareKg || 1.8}
{" kg = -"}
{selectedTicket.totalCrateTareKg || selectedTicket.crateCount * 1.8}
{" kg"}
</span>
</div>}
<div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
<span className="text-emerald-800 dark:text-emerald-200 font-semibold">Poids Net Marchandise:</span>
<span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
{selectedTicket.netWeightKg.toLocaleString()}
{" kg ("}
{((selectedTicket.netWeightKg || 0) / 100).toFixed(2)}
{" Qx)"}
</span>
</div>
<div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1">
<div className="flex items-center justify-between text-xs">
<span className="text-black/70 dark:text-white/75 font-medium">{isAr ? "رسم الطابع الجبائي (المادة 317) :" : "Droit de Timbre (Art. 317) :"}</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedTicket.paymentMethod === "cash" || selectedTicket.paymentMethod === "especes" ? `${selectedTicket.timbreFiscalDzd || calculateArt317Timbre(selectedTicket.subtotalProduceDzd || selectedTicket.totalGrossDzd || 0)} DZD (Plafonné à 2.500)` : "0 DZD (Exonéré hors espèces)"}
</span>
</div>
<p className="text-[10px] text-black/55 dark:text-white/55">
{isAr ? "1% على المبالغ النقدية وفق قانون الضرائب المباشرة والرسوم المماثلة الجزائري" : "1% gradué plafonné à 2.500 DA applicable aux paiements en espèces (Art. 317 CID)"}
</p>
</div>
</div>
<div className="space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Spécifications Récolte</span>
<div className="space-y-1 text-black/70 dark:text-white/75">
<div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40">
<span>Désignation:</span>
<strong className="text-black dark:text-white">{selectedTicket.cropDesignation}</strong>
</div>
<div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40">
<span>Variété & Calibre:</span>
<span className="font-mono">{selectedTicket.cropVariety || "Standard Calibre 1"}</span>
</div>
<div className="flex justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40">
<span>Qualité d'agréage:</span>
<span className="font-semibold text-emerald-600">{selectedTicket.qualityGrade || "Extra / Grade A"}</span>
</div>
</div>
</div>
</div>}
{inspectorTab === "tracabilite" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Données d'Acheminement</span>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Marché de Gros:</span>
<span className="font-bold text-black dark:text-white">{selectedTicket.destinationWholesaleMarket}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Chauffeur assigné:</span>
<span className="font-medium text-black dark:text-white">{selectedTicket.driverName || "Non assigné"}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Matricule Camion:</span>
<span className="font-mono font-bold text-black dark:text-white">{selectedTicket.truckPlate || selectedTicket.vehiclePlate}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Date d'expédition:</span>
<span className="font-mono text-black dark:text-white">{selectedTicket.date}</span>
</div>
</div>
</div>
<div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-1">
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono block">QR Code Sécurisé Bordereau</span>
<p className="font-bold text-xs text-black dark:text-white">
AGRI-PESEE-
{selectedTicket.ticketNumber}
</p>
<span className="text-[9px] text-black/55 dark:text-white/55 font-mono">Conforme aux règlements de police des marchés</span>
</div>
</div>}
</div>
<div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
<AtriumButton variant="primary" className="w-full justify-center" icon={<Printer size={14} />} onClick={() => setIsPrintModalOpen(true)}>{isAr ? "طباعة وصل ميزان الجسر والتسليم" : "Imprimer Bon de Pesée & BL"}</AtriumButton>
</div>
</div>}
</div>
</div>
<AgriWeighbridgePrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} ticket={selectedTicket} />
</div>;
};
