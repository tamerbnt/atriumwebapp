import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Percent,
  Printer,
  Award,
  Package,
  Wrench,
  DollarSign,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Layers,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrder } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const ManufacturingQcView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { orders, updateOrder } = useManufacturingData();
	const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
	const [orderForCertificate, setOrderForCertificate] = React.useState<any>(null);
	const [inspectorTab, setInspectorTab] = React.useState("cq");
	const handleReleaseLot = (order: any) => {
		const updated = {
			...order,
			status: "Completed"
		};
		if (updateOrder) updateOrder(updated);
		if (selectedOrder?.id === order.id) setSelectedOrder(updated);
		showToast(isAr ? `تم اعتماد وتحرير الدفعة ${order.orderNumber} كدفعة مطابقة للمواصفات ISO 9001` : `Lot ${order.orderNumber} libéré et certifié conforme ISO 9001`, "success");
	};
	const getQcActions = (order: any) => [
		{
			label: isAr ? "معاينة الفحص" : "Consulter CQ",
			icon: /* @__PURE__ */ <Eye size={14} />,
			onClick: () => setSelectedOrder(order)
		},
		{
			label: isAr ? "تحرير الدفعة" : "Libérer Lot",
			icon: /* @__PURE__ */ <Check size={14} />,
			onClick: () => handleReleaseLot(order)
		},
		{
			label: isAr ? "شهادة المطابقة" : "Certificat ISO",
			icon: /* @__PURE__ */ <Printer size={14} />,
			onClick: () => {
				setOrderForCertificate(order);
			}
		},
		{
			label: isAr ? "تسجيل تالف" : "Signaler Rebut",
			icon: /* @__PURE__ */ <AlertCircle size={14} />,
			onClick: () => {
				showToast(isAr ? `تم تسجيل تقرير عدم مطابقة للدفعة ${order.orderNumber}` : `Fiche de non-conformité ouverte pour le lot ${order.orderNumber}`, "info");
			}
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: orders.length > 0
	});
	if (showSkeleton && (orders.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn={false} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><ShieldCheck size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "الجودة" : language === "en" ? "Quality" : "Qualité"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Norme ISO 9001</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="outline" onClick={() => {
							showToast(isAr ? "طباعة تقرير مراقبة الجودة" : "Impression du rapport qualité", "info");
							window.print();
						}} icon={<Printer size={14} />}>{isAr ? "تقرير الجودة" : "Rapport Qualité"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "مؤشرات المطابقة ونسب الفاقد" : "Indicateurs de Conformité & Maîtrise des Rebuts"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "معدل المطابقة للمواصفات" : "Taux de Conformité Moyen"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">98.8%</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "مطابق لشهادة الجودة ISO 9001" : "Conforme aux tolérances ISO"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "نسبة الفاقد / التالف (Scrap)" : "Taux de Rebut (Scrap)"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">1.2%</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "ضمن الحدود الآمنة المقبولة" : "Inférieur au seuil max (2%)"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "شهادات الإفراج عن الدفعات" : "Libération des Lots"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Contrôle 100%</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">100%</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{orders.length}
{" "}
{isAr ? "دفعة مفحوصة ومطابقة" : "lots inspectés"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "سجل الفحص المخبري ومراقبة الجودة (QC / ISO)" : "Registre des Contrôles Qualité Libératoires (AQL)"}
</h2>
</div>
<div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
{[
								{
									id: "all",
									label: isAr ? "جميع الدفعات" : "Tous les lots"
								},
								{
									id: "libere",
									label: isAr ? "دفعات مطابقة" : "Lots libérés"
								},
								{
									id: "quarantaine",
									label: isAr ? "في الحجر" : "En quarantaine"
								}
							].map((tab, idx) => /* @__PURE__ */ <button key={tab.id} className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer" style={{
									backgroundColor: idx === 0 ? "#FCEEE8" : "transparent",
									color: idx === 0 ? "var(--color-accent)" : "#71717A"
								}}>{tab.label}</button>)}
</div>
</div>
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "سجل الفحص والاختبارات" : "Registre des Contrôles Qualité Libératoires"} subtitle={isAr ? "تتبع الدفعات والمطابقة للمواصفات" : "Inspection dimensionnelle, tests de résistance et libération"} items={orders} keyExtractor={(o) => o.id} searchPlaceholder={isAr ? "بحث بالمنتج أو رقم الدفعة..." : "Rechercher OF, article, lot, conformité..."} searchFilter={(o, query) => o.productName.toLowerCase().includes(query.toLowerCase()) || o.orderNumber.toLowerCase().includes(query.toLowerCase()) || (o.batchLotNumber || "").toLowerCase().includes(query.toLowerCase())} onSelectRow={(o) => setSelectedOrder(o)} customActions={(o) => getQcActions(o)} columns={[
									{
										id: "orderNumber",
										header: isAr ? "رقم OF" : "N° OF",
										width: "130px",
										sortable: true,
										renderCell: (o: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">{o.orderNumber}</span>
									},
									{
										id: "product",
										header: isAr ? "المنتج & الدفعة" : "Article Fabriqué & Lot",
										renderCell: (o: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{o.productName}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{"Lot: "}
{o.batchLotNumber || "LOT-2026-STD"}
</span>
</div>
									},
									{
										id: "qty",
										header: isAr ? "الكمية" : "Quantité",
										width: "120px",
										sortable: true,
										renderCell: (o: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">
{o.actualQuantityProduced || o.targetQuantity}
{" pcs"}
</span>
									},
									{
										id: "conformity",
										header: isAr ? "المطابقة" : "Conformité",
										width: "120px",
										renderCell: () => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">98.8%</span>
									},
									{
										id: "unitCost",
										header: isAr ? "تكلفة الوحدة" : "Coût Unitaire",
										width: "140px",
										sortable: true,
										renderCell: (o: any) => {
											const qty = o.actualQuantityProduced || o.targetQuantity || 1;
											const unitCost = Math.round(o.totalCostDzd / qty);
											return /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black/70 dark:text-white/75">{formatMoney(unitCost, language)}</span>;
										}
									},
									{
										id: "status",
										header: isAr ? "قرار CQ" : "Décision CQ",
										width: "140px",
										renderCell: (o: any) => /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
<ShieldCheck size={11} />
{o.status === "Completed" ? isAr ? "مقبول ومعتمد" : "Libéré Conforme" : isAr ? "قيد الفحص" : "En Contrôle"}
</span>
									}
								]} renderCard={(o) => {
									const qty = o.actualQuantityProduced || o.targetQuantity || 1;
									const unitCost = Math.round(o.totalCostDzd / qty);
									return /* @__PURE__ */ <div className="p-4 flex flex-col justify-between h-full space-y-3">
<div className="flex items-start justify-between gap-2">
<span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded">{o.orderNumber}</span>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">98.8% Conforme</span>
</div>
<div>
<h4 className="font-bold text-xs text-black dark:text-white line-clamp-2">{o.productName}</h4>
<p className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5">
{"Lot: "}
{o.batchLotNumber || "LOT-2026-STD"}
{" · "}
{qty}
{" pcs"}
</p>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
<div>
<span className="text-[10px] text-black/55 dark:text-white/55 block">Coût Unitaire</span>
<span className="font-mono font-bold text-black/70 dark:text-white/75">{formatMoney(unitCost, language)}</span>
</div>
<span className="text-emerald-600 font-bold text-xs">Libéré ✓</span>
</div>
</div>;
								}} />
</div>
{selectedOrder && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Award size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 font-mono">{selectedOrder.orderNumber}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[210px]">
{"Lot: "}
{selectedOrder.batchLotNumber || "LOT-2026-05"}
</p>
</div>
</div>
<button onClick={() => setSelectedOrder(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
<button onClick={() => setInspectorTab("cq")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "cq" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "فحص الجودة" : "Contrôle CQ"}</button>
<button onClick={() => setInspectorTab("metrologie")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "metrologie" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "القياس والتفاوت" : "Métrologie"}</button>
<button onClick={() => setInspectorTab("couts")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "couts" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "التكلفة والتالف" : "Coûts & Scrap"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{inspectorTab === "cq" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
<div className="flex items-center justify-between text-white/80 text-[11px]">
<span>Statut Libération du Lot</span>
<span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">ISO 9001</span>
</div>
<div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">98.8% Conforme</div>
<p className="text-[10px] text-white/75">Échantillonnage AQL 1.5 validé par le laboratoire de métrologie interne.</p>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Spécifications de Fabrication</span>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Désignation:</span>
<span className="font-bold text-black dark:text-white">{selectedOrder.productName}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Taille du Lot:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedOrder.actualQuantityProduced || selectedOrder.targetQuantity}
{" unités"}
</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Inspecteur Responsable:</span>
<span className="font-medium text-black dark:text-white">Ing. Sami Mansour (CQ)</span>
</div>
</div>
<div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<div>
<span className="font-semibold block text-black dark:text-white">Libération du Lot</span>
<span className="text-[10px] text-black/55 dark:text-white/55">Autoriser l'expédition vers stock fini</span>
</div>
<button onClick={() => handleReleaseLot(selectedOrder)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b06a4e] text-white transition-colors">Libérer ✓</button>
</div>
</div>}
{inspectorTab === "metrologie" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Rapport Dimensionnel & Tolérances</span>
<div className="space-y-2">
<div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
<span>Cote Critique Longueur (±0.5mm):</span>
<span className="font-mono font-bold text-emerald-600">+0.12mm (OK)</span>
</div>
<div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
<span>Épaisseur & Planéité (±0.2mm):</span>
<span className="font-mono font-bold text-emerald-600">-0.05mm (OK)</span>
</div>
<div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
<span>Adhérence Finition / Revêtement:</span>
<span className="font-mono font-bold text-emerald-600">Grade 5B (Parfait)</span>
</div>
</div>
</div>
</div>}
{inspectorTab === "couts" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Décomposition Coût de Revient</span>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Matières Premières:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedOrder.totalMaterialCostDzd)}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Main d'Œuvre Directe:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedOrder.totalLaborCostDzd)}</span>
</div>
<div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
<span className="font-semibold text-black dark:text-white">Coût Total Lot:</span>
<span className="font-mono font-bold text-[#d4522f]">{formatMoney(selectedOrder.totalCostDzd)}</span>
</div>
</div>
</div>}
</div>
<div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
<AtriumButton variant="primary" className="w-full justify-center" icon={<Printer size={14} />} onClick={() => setOrderForCertificate(selectedOrder)}>{isAr ? "طباعة شهادة المطابقة ISO" : "Imprimer Certificat de Conformité"}</AtriumButton>
</div>
</div>}
</div>
{orderForCertificate && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
<div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold"><ShieldCheck size={22} /></div>
<div>
<h3 className="font-bold text-base text-black dark:text-white">
{isAr ? "شهادة المطابقة الصناعية IANOR / ISO" : "Certificat de Conformité & Libération Lot"}
</h3>
<p className="text-xs text-black/55 dark:text-white/55">Norme ISO 9001:2015 & IANOR NA 1620</p>
</div>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors">
<Printer size={14} />
<span>{isAr ? "طباعة" : "Imprimer"}</span>
</button>
<button type="button" onClick={() => setOrderForCertificate(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"><X size={18} /></button>
</div>
</div>
<div className="p-6 rounded-2xl bg-white border-2 border-emerald-600/40 text-black space-y-5 font-sans shadow-xs">
<div className="flex justify-between items-start border-b pb-4">
<div>
<div className="font-black text-sm tracking-tight text-black">ATRIUM MANUFACTURE & CONTRÔLE QUALITÉ</div>
<div className="text-[10px] text-black/55 font-medium">Laboratoire de Métrologie Industrielle • Alger • Agrément ONML N° 2026/88</div>
<div className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-wide">BULLETIN D'ANALYSE & CERTIFICAT DE CONFORMITÉ PRODUIT FINI</div>
</div>
<div className="text-right">
<div className="font-mono font-bold text-xs text-emerald-700">
CERT-2026-
{orderForCertificate.orderNumber.replace(/[^0-9]/g, "")}
</div>
<div className="text-[11px] text-black/55 mt-0.5">
{"Date : "}
{(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
</div>
</div>
</div>
<div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs space-y-1.5">
<div className="flex justify-between">
<span className="text-black/55">Article inspecté :</span>
<span className="font-bold text-black">{orderForCertificate.productName}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55">Ordre de Fabrication :</span>
<span className="font-mono font-semibold text-black">{orderForCertificate.orderNumber}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55">N° de Lot de Traçabilité :</span>
<span className="font-mono font-bold text-[#d4522f]">{orderForCertificate.batchLotNumber || "LOT-202610-0089"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55">Quantité libérée :</span>
<span className="font-mono font-bold text-emerald-700">
{orderForCertificate.actualQuantityProduced || orderForCertificate.quantityProduced || orderForCertificate.targetQuantity}
{" unités conformes"}
</span>
</div>
</div>
<div className="space-y-1.5">
<div className="text-xs font-bold text-black uppercase tracking-wider">Résultats des Contrôles Métrologiques & Essais</div>
<div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1">
<div className="flex justify-between">
<span>Tolérance dimensionnelle (Calibre Vernier) :</span>
<span className="font-bold text-emerald-800">Conforme (+/- 0.2mm)</span>
</div>
<div className="flex justify-between">
<span>Essai de résistance mécanique / charge :</span>
<span className="font-bold text-emerald-800">Validé 100% sans déformation</span>
</div>
<div className="flex justify-between">
<span>Adhérence et état de surface (Aspect A) :</span>
<span className="font-bold text-emerald-800">Grade 5B ISO 2409</span>
</div>
</div>
</div>
<div className="p-3 bg-neutral-100 rounded-xl text-[11px] text-black/75 font-medium">
Le Responsable Assurance Qualité atteste que le lot ci-dessus référencé répond strictement aux spécifications techniques du cahier des charges et est libéré pour livraison client.
</div>
<div className="grid grid-cols-2 gap-4 pt-6 border-t text-center text-xs">
<div>
<span className="text-black/55 text-[10px] block">Ingénieur Métrologie & CQ</span>
<div className="h-10 flex items-center justify-center font-serif text-black italic">Ing. Sofiane Mokrani</div>
</div>
<div>
<span className="text-black/55 text-[10px] block">Cachet & Signature Direction</span>
<div className="h-10 flex items-center justify-center font-serif text-black italic">Direction Qualité Atrium</div>
</div>
</div>
</div>
</div>
</div>}
</div>
</div>;
};
