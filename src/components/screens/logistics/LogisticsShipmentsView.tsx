import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Package,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  Barcode,
  DollarSign,
  User,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment, LogisticsManifest } from '../../../types';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StopDeskHandoverModal } from './StopDeskHandoverModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';



export const LogisticsShipmentsView: React.FC<any> = () => {
	const { language, showToast, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
	const { shipments, manifests, addShipment, updateShipment, deleteShipment, updateShipmentStatus } = useLogisticsData();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [filterStatus, setFilterStatus] = React.useState("All");
	const [viewMode, setViewMode] = React.useState("list");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["ship_01"]));
	const [sortBy, setSortBy] = React.useState("tracking");
	const [sortDir, setSortDir] = React.useState("asc");
	const [isShipmentModalOpen, setIsShipmentModalOpen] = React.useState(false);
	const [shipmentToEdit, setShipmentToEdit] = React.useState<any>(null);
	const [isHandoverModalOpen, setIsHandoverModalOpen] = React.useState(false);
	const [shipmentForHandover, setShipmentForHandover] = React.useState<any>(null);
	const [selectedShipment, setSelectedShipment] = React.useState<any>(null);
	const [activeTab, setActiveTab] = React.useState("fiche");
	const [inspectorNotes, setInspectorNotes] = React.useState("");
	const [noteSaved, setNoteSaved] = React.useState(false);
	const filteredShipments = React.useMemo(() => {
		return shipments.filter((s) => {
			if (filterStatus !== "All" && s.status !== filterStatus) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesCode = s.trackingCode.toLowerCase().includes(q);
				const matchesRecipient = s.recipientName.toLowerCase().includes(q);
				const matchesPhone = s.recipientPhone.includes(q);
				const matchesWilaya = s.destinationWilaya.toLowerCase().includes(q);
				const matchesMerchant = s.merchantName ? s.merchantName.toLowerCase().includes(q) : false;
				if (!matchesCode && !matchesRecipient && !matchesPhone && !matchesWilaya && !matchesMerchant) return false;
			}
			return true;
		});
	}, [
		shipments,
		filterStatus,
		searchQuery
	]);
	const sortedShipments = React.useMemo(() => {
		const list = [...filteredShipments];
		list.sort((a, b) => {
			const aPinned = pinnedIds.has(a.id);
			const bPinned = pinnedIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (sortBy === "tracking") {
				const cmp = a.trackingCode.localeCompare(b.trackingCode);
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "recipient") {
				const cmp = a.recipientName.localeCompare(b.recipientName);
				return sortDir === "asc" ? cmp : -cmp;
			}
			if (sortBy === "cod") {
				const cmp = a.codAmountDzd - b.codAmountDzd;
				return sortDir === "asc" ? cmp : -cmp;
			}
			return 0;
		});
		return list;
	}, [
		filteredShipments,
		pinnedIds,
		sortBy,
		sortDir
	]);
	const activeInDelivery = React.useMemo(() => {
		return shipments.filter((s) => s.status === "OutForDelivery").length;
	}, [shipments]);
	const totalCodValue = React.useMemo(() => {
		return shipments.reduce((acc, s) => acc + (s.codAmountDzd || 0), 0);
	}, [shipments]);
	const handleOpenAdd = () => {
		setShipmentToEdit(null);
		setIsShipmentModalOpen(true);
	};
	const handleOpenEdit = (s: any) => {
		setShipmentToEdit(s);
		setIsShipmentModalOpen(true);
	};
	const handleDelete = (s: any) => {
		deleteShipment(s.id);
		if (selectedShipment?.id === s.id) setSelectedShipment(null);
		showToast(language === "ar" ? "تم إلغاء الشحنة" : "Colis supprimé du système", "success");
	};
	const handleTogglePin = (id: any) => {
		setPinnedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};
	const handleSelectShipment = (s: any) => {
		setSelectedShipment(s);
		setInspectorNotes(`Colis ${s.trackingCode}. Consignes: Appeler le destinataire 15 min avant livraison. Remise contre signature et montant exact.`);
		setNoteSaved(false);
	};
	const handleToggleDeliveryStatus = (s: any) => {
		const nextStatus = s.status === "ReceivedAtHub" ? "OutForDelivery" : s.status === "OutForDelivery" ? "Delivered" : "ReceivedAtHub";
		updateShipmentStatus(s.id, nextStatus);
		if (selectedShipment?.id === s.id) setSelectedShipment({
			...selectedShipment,
			status: nextStatus
		});
		showToast(language === "ar" ? `تم تحديث حالة الشحنة إلى ${nextStatus}` : `Statut mis à jour : ${nextStatus}`, "info");
	};
	const handleSaveNotes = () => {
		setNoteSaved(true);
		setTimeout(() => setNoteSaved(false), 2e3);
		showToast(language === "ar" ? "تم حفظ تعليمات التسليم" : "Consignes de livraison enregistrées", "success");
	};
	const handleExportCSV = () => {
		const headers = [
			"Tracking Code",
			"Merchant",
			"Recipient",
			"Phone",
			"Wilaya",
			"Address",
			"COD Amount (DZD)",
			"Shipping Fee (DZD)",
			"Status",
			"Driver"
		];
		const rows = sortedShipments.map((s) => [
			`"${s.trackingCode}"`,
			`"${s.merchantName || ""}"`,
			`"${s.recipientName}"`,
			`"${s.recipientPhone}"`,
			`"${s.destinationWilaya}"`,
			`"${s.destinationAddress}"`,
			s.codAmountDzd,
			s.shippingFeeDzd,
			s.status,
			`"${s.assignedDriverName || ""}"`
		]);
		const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `logistics_shipments_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast(language === "ar" ? "تم تصدير سجل الشحنات" : "Export du registre des colis terminé", "info");
	};
	const columns = React.useMemo(() => [
		{
			key: "tracking",
			header: language === "ar" ? "رقم التتبع / الشحنة" : "Code AWB & Destinataire",
			width: "3.5*",
			sortable: true,
			renderCell: (s: any) => {
				const isPinned = pinnedIds.has(s.id);
				return /* @__PURE__ */ <div className="flex items-center gap-3 min-w-0 pr-2">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs"><Package size={18} /></div>
<div className="min-w-0">
<div className="flex items-center gap-2">
<span className="text-xs font-bold text-black dark:text-white truncate">{s.recipientName}</span>
{isPinned && /* @__PURE__ */ <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
</div>
<div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
<span className="font-bold text-[#d4522f]">{s.trackingCode}</span>
<span>·</span>
<span>{s.destinationWilaya.split("-")[0].trim()}</span>
</div>
</div>
</div>;
			}
		},
		{
			key: "address",
			header: language === "ar" ? "العنوان / الهاتف" : "Destination & Contact",
			width: "2.5*",
			renderCell: (s: any) => /* @__PURE__ */ <div>
<div className="text-xs font-semibold text-black dark:text-white truncate">{s.destinationAddress}</div>
<div className="text-[11px] font-mono text-black/55 dark:text-white/55 mt-0.5">{s.recipientPhone}</div>
</div>
		},
		{
			key: "cod",
			header: language === "ar" ? "مبلغ التحصيل (COD)" : "Montant COD",
			width: "2.0*",
			sortable: true,
			renderCell: (s: any) => /* @__PURE__ */ <div>
<span className="text-xs font-mono font-bold text-black dark:text-white">{formatMoney(s.codAmountDzd)}</span>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{"+ "}
{formatMoney(s.shippingFeeDzd)}
{" frais"}
</div>
</div>
		},
		{
			key: "status",
			header: language === "ar" ? "الحالة" : "Statut Colis",
			width: "2.0*",
			renderCell: (s: any) => {
				const isDelivered = s.status === "Delivered";
				const isOut = s.status === "OutForDelivery";
				return /* @__PURE__ */ <div className="text-center">
<span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${isDelivered ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60" : isOut ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60" : "bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 border-neutral-200/60"}`}>
<span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? "bg-emerald-500" : isOut ? "bg-amber-500 animate-[live-heartbeat_1.2s_infinite]" : "bg-neutral-400"}`} />
{isDelivered ? language === "ar" ? "تم التوصيل" : "Livré" : isOut ? language === "ar" ? "في التوزيع" : "En Tournée" : language === "ar" ? "في المستودع" : "Au Hub"}
</span>
</div>;
			}
		}
	], [pinnedIds, language]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: shipments.length > 0
	});
	if (showSkeleton && (shipments.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
		]} viewMode={viewMode} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Truck size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{language === "ar" ? "سجل الشحنات والطرود البريدية" : "Expéditions & Colis COD"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">
{shipments.length}
{" "}
{language === "ar" ? "طرد" : "colis"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton type="button" variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExportCSV}><span>{language === "ar" ? "تصدير" : "Exporter"}</span></AtriumButton>
<AtriumButton type="button" variant="primary" onClick={handleOpenAdd} icon={<Plus size={15} strokeWidth={2.5} />}><span>{language === "ar" ? "طرد جديد" : "Nouveau Colis"}</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div>
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{language === "ar" ? "مؤشرات التوزيع والتحصيل النقدي" : "Indicateurs de Distribution & Cash COD"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "طرود في التوزيع الميداني" : "Colis en Tournée Active"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{activeInDelivery}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{language === "ar" ? "بين أيدي السائقين حالياً" : "Sur les véhicules de livraison"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "إجمالي التحصيل النقدي المتوقع" : "Encours Cash COD Attendu"}
</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(totalCodValue)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{language === "ar" ? "أموال مستحقة للتسوية مع التجار" : "À reverser aux commerçants"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-white/80">{language === "ar" ? "التتبع اللحظي والباركود" : "Suivi AWB"}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">100% SCAN</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">100%</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>Bordereaux scannés et géolocalisés</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-black dark:text-white">{language === "ar" ? "دليل الطرود" : "Registre des Colis"}</span>
<span className="text-xs text-black/55 dark:text-white/55 font-semibold tabular-nums">
(
{sortedShipments.length}
)
</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث بالباركود أو المستلم أو الولاية..." : "Recherche AWB, client, wilaya..."} shutSize={36} openWidth={220} />
<LiveSegmentedControl size="sm" value={filterStatus} onValueChange={(val) => setFilterStatus(val)} options={[
								{
									value: "All",
									label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
									tooltip: language === "ar" ? "جميع الشحنات والطرود" : language === "fr" ? "Tous les colis" : "All shipments",
									count: shipments.length
								},
								{
									value: "OutForDelivery",
									label: language === "ar" ? "توزيع" : language === "fr" ? "Tournée" : "Delivery",
									tooltip: language === "ar" ? "طرود في جولة التوزيع" : language === "fr" ? "Colis en tournée de livraison" : "Out for delivery",
									count: activeInDelivery
								},
								{
									value: "Delivered",
									label: language === "ar" ? "مُسلّم" : language === "fr" ? "Livrés" : "Delivered",
									tooltip: language === "ar" ? "طرود تم توصيلها" : language === "fr" ? "Colis livrés" : "Delivered parcels",
									count: shipments.filter((s) => s.status === "Delivered").length
								}
							]} />
</div>
</div>
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection items={sortedShipments} keyExtractor={(s) => s.id} defaultViewMode={viewMode} columns={columns} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key) => {
								if (sortBy === key) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
								else {
									setSortBy(key);
									setSortDir("asc");
								}
							}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} bulkSecondaryAction={{
								label: language === "ar" ? "تحديث مرحلة التوصيل" : "Mise à jour statut",
								icon: /* @__PURE__ */ <Truck size={14} />,
								onClick: (ids: any) => {
									showToast(language === "ar" ? `تم تحديد ${ids.size} طرد للشحن` : `${ids.size} colis pris en charge pour expédition`);
								}
							}} onBulkDelete={(ids) => {
								ids.forEach((id) => deleteShipment(id));
								setSelectedIds(/* @__PURE__ */ new Set());
								if (selectedShipment && ids.has(selectedShipment.id)) setSelectedShipment(null);
								showToast(language === "ar" ? "تم حذف الطرود المحددة" : "Colis sélectionnés supprimés", "success");
							}} isPinned={(s) => pinnedIds.has(s.id)} onTogglePin={(s) => handleTogglePin(s.id)} onItemClick={handleSelectShipment} onEdit={handleOpenEdit} onDelete={handleDelete} customActions={(s) => [...s.deliveryMode === "StopDesk" && s.status !== "Delivered" ? [{
								id: "stopDeskOtp",
								label: language === "ar" ? "تسليم OTP" : "Retrait Stop-Desk",
								tooltip: "Remise au guichet avec code OTP et CNI",
								icon: /* @__PURE__ */ <CheckCircle2 size={13} />,
								variant: "primary",
								onClick: () => {
									setShipmentForHandover(s);
									setIsHandoverModalOpen(true);
								}
							}] : [], {
								id: "deliver",
								label: language === "ar" ? "توصيل / تحصيل" : "Livrer / Encaissement",
								tooltip: language === "ar" ? "تحديث حالة التسليم" : "Valider la livraison",
								icon: /* @__PURE__ */ <Send size={13} />,
								variant: "primary",
								onClick: () => handleToggleDeliveryStatus(s)
							}]} renderCard={(s) => {
								const isPinned = pinnedIds.has(s.id);
								const isDelivered = s.status === "Delivered";
								return /* @__PURE__ */ <div className="flex flex-col items-center justify-center w-full">
<div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums"><Package size={32} /></div>
<div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
<h3 className="text-base font-bold text-black dark:text-white truncate tracking-tight">{s.recipientName}</h3>
{isPinned && /* @__PURE__ */ <span className="text-xs text-amber-500">📌</span>}
</div>
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-3 border border-neutral-200 dark:border-neutral-700">{s.trackingCode}</span>
<div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
<div className="text-black dark:text-white font-mono font-bold text-[13px]">{formatMoney(s.codAmountDzd)}</div>
<div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
<span className="text-black/55 dark:text-white/55 truncate max-w-[130px]">{s.destinationWilaya}</span>
{isDelivered ? /* @__PURE__ */ <span className="text-emerald-600 font-bold">{language === "ar" ? "تم التوصيل" : "Livré"}</span> : /* @__PURE__ */ <span className="text-amber-600 font-bold">{language === "ar" ? "في التوزيع" : "En Tournée"}</span>}
</div>
</div>
</div>;
							}} emptyTitle={language === "ar" ? "لا توجد شحنات مطابقة" : "Aucun colis trouvé"} emptyDescription={language === "ar" ? "سجل أول طرد أو أعد ضبط معايير البحث" : "Enregistrez un premier colis ou modifiez vos filtres de recherche"} primaryActionLabel={language === "ar" ? "طرد جديد" : "Nouveau Colis"} onAddFirstItem={handleOpenAdd} onResetFilters={() => {
								setSearchQuery("");
								setFilterStatus("All");
							}} hasActiveFilters={searchQuery.length > 0 || filterStatus !== "All"} />
</div>
{selectedShipment && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[700px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-800/60 flex items-center justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] text-[#d4522f] font-bold text-sm flex items-center justify-center shrink-0 border border-[#F5E2D8]"><Package size={20} /></div>
<div className="min-w-0">
<h3 className="font-bold text-sm text-black dark:text-white truncate">{selectedShipment.trackingCode}</h3>
<div className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55 font-mono truncate">
<span>{selectedShipment.recipientName}</span>
<span>·</span>
<span className="text-[#d4522f] font-bold">{formatMoney(selectedShipment.codAmountDzd)}</span>
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedShipment(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition-colors"><X size={16} /></button>
</div>
<div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
<button type="button" onClick={() => handleToggleDeliveryStatus(selectedShipment)} className="flex-1 py-1.5 px-2 rounded-lg bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors">
<Send size={13} />
<span>{language === "ar" ? "تحديث التوصيل" : "Changer Statut"}</span>
</button>
<button type="button" onClick={() => handleOpenEdit(selectedShipment)} className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-neutral-100 text-xs font-semibold transition-colors" title="Modifier"><Edit size={14} /></button>
<button type="button" onClick={() => handleTogglePin(selectedShipment.id)} className={`p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold transition-colors ${pinnedIds.has(selectedShipment.id) ? "text-amber-500" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`} title="Épingler"><Pin size={14} /></button>
</div>
<div className="flex border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold px-2 bg-white dark:bg-neutral-850">
<button type="button" onClick={() => setActiveTab("fiche")} className={`py-2 px-3 border-b-2 transition-colors ${activeTab === "fiche" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "بيانات الطرد" : "Bordereau"}</button>
<button type="button" onClick={() => setActiveTab("cod")} className={`py-2 px-3 border-b-2 transition-colors ${activeTab === "cod" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "التحصيل COD" : "Finance COD"}</button>
<button type="button" onClick={() => setActiveTab("dispatch")} className={`py-2 px-3 border-b-2 transition-colors ${activeTab === "dispatch" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "السائق والتوزيع" : "Livreur"}</button>
<button type="button" onClick={() => setActiveTab("notes")} className={`py-2 px-3 border-b-2 transition-colors ${activeTab === "notes" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "التعليمات" : "Consignes"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4">
{activeTab === "fiche" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">{language === "ar" ? "تفاصيل الإرسالية" : "Destinataire & Acheminement"}</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "المستلم" : "Destinataire"}</span>
<span className="font-bold text-black dark:text-white">{selectedShipment.recipientName}</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "الهاتف" : "Téléphone"}</span>
<span className="font-semibold text-black dark:text-white font-mono">{selectedShipment.recipientPhone}</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "الولاية" : "Wilaya de livraison"}</span>
<span className="font-semibold text-black dark:text-white">{selectedShipment.destinationWilaya}</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "العنوان التفصيلي" : "Adresse"}</span>
<span className="font-medium text-black dark:text-white text-right max-w-[200px] truncate">{selectedShipment.destinationAddress}</span>
</div>
<div className="flex justify-between py-1">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "الوزن التقريبي" : "Poids"}</span>
<span className="font-mono font-semibold text-black dark:text-white">
{selectedShipment.weightKg}
{" kg"}
</span>
</div>
</div>
</div>}
{activeTab === "cod" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
{language === "ar" ? "المبالغ النقدية للتحصيل" : "Règlement & Encaissement COD"}
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "مبلغ السلعة" : "Prix marchandise"}</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedShipment.codAmountDzd)}</span>
</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "رسوم التوصيل" : "Frais d'expédition"}</span>
<span className="font-mono font-semibold text-black dark:text-white">{formatMoney(selectedShipment.shippingFeeDzd)}</span>
</div>
<div className="flex justify-between py-1.5 font-bold text-black dark:text-white text-[13px]">
<span>{language === "ar" ? "المبلغ الإجمالي للتحصيل" : "Total Cash à Récupérer"}</span>
<span className="font-mono text-[#d4522f]">{formatMoney(selectedShipment.codAmountDzd + selectedShipment.shippingFeeDzd)}</span>
</div>
</div>
</div>}
{activeTab === "dispatch" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">{language === "ar" ? "معلومات التوزيع والموزع" : "Affectation & Véhicule"}</div>
<div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "السائق المكلف" : "Livreur"}</span>
<span className="font-bold text-black dark:text-white">{selectedShipment.assignedDriverName || "Non assigné"}</span>
</div>
<div className="flex justify-between py-1">
<span className="text-black/55 dark:text-white/55">{language === "ar" ? "التاجر / المرسل" : "Marchand"}</span>
<span className="font-semibold text-black dark:text-white">{selectedShipment.merchantName || "Comptoir"}</span>
</div>
</div>
</div>}
{activeTab === "notes" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase">
{language === "ar" ? "تعليمات وإرشادات التوصيل" : "Consignes & Remarques Livreur"}
</label>
<textarea value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)} rows={8} placeholder={language === "ar" ? "أدخل تعليمات التوصيل..." : "Précisions d'accès, créneau de livraison, consignes spéciales..."} className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-2 focus:ring-[#d4522f] outline-none" />
<div className="flex items-center justify-between pt-1">
<span className="text-[11px] text-black/55 dark:text-white/55">
{noteSaved && /* @__PURE__ */ <span className="text-emerald-600 font-bold flex items-center gap-1">
<Check size={12} />
{" "}
{language === "ar" ? "تم الحفظ" : "Enregistré"}
</span>}
</span>
<AtriumButton type="button" variant="primary" size="sm" icon={<Save size={13} />} onClick={handleSaveNotes}><span>{language === "ar" ? "حفظ التعليمات" : "Enregistrer"}</span></AtriumButton>
</div>
</div>}
</div>
</div>}
</div>
</div>
{isShipmentModalOpen && /* @__PURE__ */ <LogisticsShipmentModal isOpen={isShipmentModalOpen} onClose={() => {
					setIsShipmentModalOpen(false);
					setShipmentToEdit(null);
				}} shipmentToEdit={shipmentToEdit} onSave={(s) => {
					if (shipmentToEdit) {
						updateShipment(s);
						if (selectedShipment?.id === s.id) setSelectedShipment(s);
						showToast(language === "ar" ? "تم تحديث بيانات الشحنة" : "Colis mis à jour", "success");
					} else {
						addShipment(s);
						showToast(language === "ar" ? "تم إنشاء الشحنة بنجاح" : "Colis enregistré avec succès (AWB)", "success");
					}
					setIsShipmentModalOpen(false);
					setShipmentToEdit(null);
				}} />}
{isHandoverModalOpen && shipmentForHandover && /* @__PURE__ */ <StopDeskHandoverModal isOpen={isHandoverModalOpen} onClose={() => {
					setIsHandoverModalOpen(false);
					setShipmentForHandover(null);
				}} shipment={shipmentForHandover} onConfirmDelivery={(id: any, idNumber: any) => {
					updateShipmentStatus(id, "Delivered");
					if (selectedShipment?.id === id) setSelectedShipment({
						...selectedShipment,
						status: "Delivered",
						recipientIdNumber: idNumber
					});
				}} />}
</div>;
};
