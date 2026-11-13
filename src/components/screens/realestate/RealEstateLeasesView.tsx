import React, { useState, useMemo } from 'react';
import {
  Key,
  Plus,
  Calendar,
  Home,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  FileText,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { RealEstateLease } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Seek } from '../../ui/Seek';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import { QuittanceModal } from './QuittanceModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const RealEstateLeasesView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { leases, properties, quittances, addLease, updateLease, deleteLease, addQuittance } = useRealEstateData();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [viewMode, setViewMode] = React.useState("list");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["lease_01"]));
	const [sortBy, setSortBy] = React.useState("propertyTitle");
	const [sortDir, setSortDir] = React.useState("asc");
	const [isLeaseModalOpen, setIsLeaseModalOpen] = React.useState(false);
	const [isQuittanceModalOpen, setIsQuittanceModalOpen] = React.useState(false);
	const [leaseForQuittance, setLeaseForQuittance] = React.useState<any>(null);
	const [selectedLease, setSelectedLease] = React.useState<any>(() => {
		return leases[0] || null;
	});
	const [activeTab, setActiveTab] = React.useState("bail");
	const [inspectorNotes, setInspectorNotes] = React.useState("");
	const [noteSaved, setNoteSaved] = React.useState(false);
	const filteredLeases = React.useMemo(() => {
		return leases.filter((l) => {
			if (statusFilter === "Renew") {
				const end = new Date(l.endDate).getTime();
				const diffDays = Math.ceil((end - Date.now()) / 864e5);
				if (diffDays > 30 || diffDays < 0) return false;
			} else if (statusFilter === "Caution") {
				if (l.securityDepositDzd <= 0) return false;
			} else if (statusFilter !== "All" && l.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesProp = l.propertyTitle.toLowerCase().includes(q);
				const matchesTenant = l.tenantName.toLowerCase().includes(q);
				const matchesPhone = l.tenantPhone.includes(q);
				if (!matchesProp && !matchesTenant && !matchesPhone) return false;
			}
			return true;
		});
	}, [
		leases,
		statusFilter,
		searchQuery
	]);
	const leaseCounts = React.useMemo(() => ({
		all: leases.length,
		active: leases.filter((l) => l.status === "Active").length,
		renew: leases.filter((l) => {
			const end = new Date(l.endDate).getTime();
			const diffDays = Math.ceil((end - Date.now()) / 864e5);
			return diffDays <= 30 && diffDays >= 0;
		}).length,
		terminated: leases.filter((l) => l.status === "Terminated").length,
		caution: leases.filter((l) => l.securityDepositDzd > 0).length
	}), [leases]);
	const activeLeases = leases.filter((l) => l.status === "Active").length;
	const totalDeposits = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);
	const totalMonthlyRent = leases.filter((l) => l.status === "Active").reduce((acc, l) => acc + l.monthlyRentDzd, 0);
	const handlePin = (l: any) => {
		setPinnedIds((prev) => {
			const next = new Set(prev);
			if (next.has(l.id)) next.delete(l.id);
			else next.add(l.id);
			return next;
		});
		showToast(pinnedIds.has(l.id) ? isAr ? "تم إلغاء التثبيت" : "Bail désépinglé" : isAr ? "تم تثبيت عقد الإيجار" : "Bail épinglé", "info");
	};
	const handleDelete = (l: any) => {
		deleteLease(l.id);
		if (selectedLease?.id === l.id) setSelectedLease(null);
		showToast(isAr ? "تم حذف عقد الإيجار" : "Bail de location supprimé", "success");
	};
	const handleEmitReceipt = (l: any) => {
		setLeaseForQuittance(l);
		setIsQuittanceModalOpen(true);
	};
	const handleRenewLease = (l: any) => {
		const nextStatus = l.status === "Active" ? "Terminated" : "Active";
		const updated = {
			...l,
			status: nextStatus
		};
		updateLease(updated);
		if (selectedLease?.id === l.id) setSelectedLease(updated);
		showToast(nextStatus === "Active" ? isAr ? "تم تجديد عقد الكراء" : "Bail renouvelé avec succès" : isAr ? "تم إنهاء عقد الكراء" : "Bail clôturé / résilié", "info");
	};
	const handleExportCsv = () => {
		const headers = [
			"Bien Immobilier",
			"Locataire",
			"Téléphone",
			"Loyer Mensuel DZD",
			"Dépôt Garantie DZD",
			"Date Début",
			"Date Fin",
			"Périodicité",
			"Statut"
		];
		const rows = filteredLeases.map((l) => [
			`"${l.propertyTitle.replace(/"/g, "\"\"")}"`,
			`"${l.tenantName.replace(/"/g, "\"\"")}"`,
			l.tenantPhone,
			l.monthlyRentDzd,
			l.securityDepositDzd,
			l.startDate,
			l.endDate,
			l.paymentFrequency,
			l.status
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `baux_locatifs_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast(isAr ? "تم تصدير عقود الكراء CSV" : "Export CSV des baux généré", "info");
	};
	const handleSaveNotes = () => {
		if (!selectedLease) return;
		setNoteSaved(true);
		setTimeout(() => setNoteSaved(false), 2e3);
		showToast(isAr ? "تم حفظ بنود العقد" : "Clauses particulières enregistrées", "success");
	};
	const columns = [
		{
			id: "propertyTitle",
			header: isAr ? "العقار المؤجر" : "Bien Loué",
			accessorKey: "propertyTitle",
			sortable: true,
			minWidth: "220px",
			cell: (l: any) => /* @__PURE__ */ <div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0"><Key size={16} /></div>
<div>
<div className="font-semibold text-xs text-black dark:text-white flex items-center gap-1.5 line-clamp-1">
{l.propertyTitle}
{pinnedIds.has(l.id) && /* @__PURE__ */ <Pin size={10} className="fill-[#d4522f] text-[#d4522f]" />}
</div>
<div className="text-[10px] text-black/55 dark:text-white/55">
{"Du "}
{l.startDate}
{" au "}
{l.endDate}
</div>
</div>
</div>
		},
		{
			id: "tenantName",
			header: isAr ? "المستأجر" : "Locataire & Contact",
			accessorKey: "tenantName",
			sortable: true,
			minWidth: "170px",
			cell: (l: any) => /* @__PURE__ */ <div>
<div className="font-semibold text-xs text-black dark:text-white">{l.tenantName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55">{l.tenantPhone}</div>
</div>
		},
		{
			id: "monthlyRent",
			header: isAr ? "الإيجار الشهري" : "Loyer Mensuel",
			accessorKey: "monthlyRentDzd",
			sortable: true,
			minWidth: "130px",
			cell: (l: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-black dark:text-white">{formatMoney(l.monthlyRentDzd)}</div>
		},
		{
			id: "securityDeposit",
			header: isAr ? "الوديعة الضامنة" : "Caution Déposée",
			accessorKey: "securityDepositDzd",
			sortable: true,
			minWidth: "130px",
			cell: (l: any) => /* @__PURE__ */ <div className="font-mono text-xs text-black/70 dark:text-white/75">{formatMoney(l.securityDepositDzd)}</div>
		},
		{
			id: "status",
			header: isAr ? "الحالة" : "Statut",
			accessorKey: "status",
			sortable: true,
			minWidth: "110px",
			cell: (l: any) => /* @__PURE__ */ <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${l.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-neutral-100 text-black/70 border-neutral-200 dark:bg-neutral-800 dark:text-white/75"}`}>{l.status === "Active" ? "Actif" : "Clôturé"}</span>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: leases.length > 0
	});
	if (showSkeleton && (leases.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "2*",
				minWidth: "140px"
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
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Key size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{isAr ? "عقود الكراء والاتفاقيات" : "Baux & Contrats de Location"}</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">
{leases.length}
{" "}
{isAr ? "عقد" : "baux"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap">
<AtriumButton variant="ghost" size="sm" onClick={handleExportCsv} icon={<Download size={14} />}>{isAr ? "تصدير CSV" : "Export CSV"}</AtriumButton>
<AtriumButton variant="primary" onClick={() => setIsLeaseModalOpen(true)} icon={<Plus size={14} />}>{isAr ? "تحرير عقد كراء" : "Nouveau Bail"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "التزامات الإيجار والضمانات المالية" : "Engagements Locatifs & Cautions Déposées"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "عقود الإيجار السارية" : "Baux Actifs en Cours"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{activeLeases}</div>
<p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
{"100% "}
{isAr ? "موثقة قانونياً" : "conformes et signés"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "مجموع الودائع الضامنة (Cautions)" : "Dépôts de Garantie Séquestrés"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalDeposits)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "ودائع في الحساب الضامن" : "Comptes séquestre agence"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "الكتلة الإيجارية الشهرية" : "Quittancement Mensuel"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Loyers Encaissés</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalMonthlyRent)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{activeLeases}
{" "}
{isAr ? "إيجار جاري" : "baux actifs"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "سجل عقود الإيجار والالتزامات" : "Registre des Baux & Contrats de Location"}
</h2>
</div>
<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
							{
								value: "All",
								label: isAr ? "الكل" : language === "fr" ? "Tous" : "All",
								tooltip: isAr ? "جميع العقود" : language === "fr" ? "Tous les baux" : "All leases",
								count: leaseCounts.all
							},
							{
								value: "Active",
								label: isAr ? "سارية" : language === "fr" ? "Actifs" : "Active",
								tooltip: isAr ? "عقود سارية" : language === "fr" ? "Baux actifs" : "Active leases",
								count: leaseCounts.active
							},
							{
								value: "Renew",
								label: isAr ? "تجديد" : language === "fr" ? "Renouveler" : "Renew",
								tooltip: isAr ? "تجديد < 30 يوم" : language === "fr" ? "Renouvellement < 30j" : "Renewal < 30 days",
								count: leaseCounts.renew
							},
							{
								value: "Terminated",
								label: isAr ? "مفسوخة" : language === "fr" ? "Résiliés" : "Terminated",
								tooltip: isAr ? "عقود مفسوخة" : language === "fr" ? "Baux résiliés" : "Terminated leases",
								count: leaseCounts.terminated
							},
							{
								value: "Caution",
								label: isAr ? "ودائع" : language === "fr" ? "Cautions" : "Deposits",
								tooltip: isAr ? "الودائع الضامنة" : language === "fr" ? "Cautions séquestre" : "Escrow deposits",
								count: leaseCounts.caution
							}
						]} aria-label="Real Estate Lease Filter" />
</div>
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection data={filteredLeases} columns={columns} keyExtractor={(l) => l.id} searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder={isAr ? "بحث بالعقار، المستأجر، الهاتف..." : "Rechercher par bien, locataire, téléphone..."} filterValue={statusFilter} onFilterChange={setStatusFilter} filterOptions={[
								{
									value: "All",
									label: isAr ? "الكل" : language === "fr" ? "Tous" : "All",
									tooltip: isAr ? "جميع العقود" : language === "fr" ? "Tous les baux" : "All leases"
								},
								{
									value: "Active",
									label: isAr ? "سارية" : language === "fr" ? "Actifs" : "Active",
									tooltip: isAr ? "عقود سارية" : language === "fr" ? "Baux Actifs" : "Active leases"
								},
								{
									value: "Terminated",
									label: isAr ? "مغلقة" : language === "fr" ? "Clôturés" : "Closed",
									tooltip: isAr ? "عقود مغلقة" : language === "fr" ? "Baux Clôturés" : "Closed leases"
								}
							]} viewMode={viewMode} onViewModeChange={setViewMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} pinnedIds={pinnedIds} onPinToggle={handlePin} sortBy={sortBy} sortDir={sortDir} onSortChange={(field, dir) => {
								setSortBy(field);
								setSortDir(dir);
							}} onItemClick={(l) => {
								setSelectedLease(l);
							}} onDelete={handleDelete} emptyIcon={<Key size={32} className="text-black/55 dark:text-white/55" />} emptyTitle={isAr ? "لا توجد عقود كراء" : "Aucun bail trouvé"} emptyDescription={searchQuery ? isAr ? "لا توجد نتائج مطابقة لبحثك" : "Aucun résultat ne correspond à votre recherche" : isAr ? "قم بتحرير أول عقد إيجار للبدء" : "Créez votre premier contrat de bail"} customActions={[{
								id: "receipt",
								label: isAr ? "إصدار مخالصة" : "Quittance de Loyer",
								icon: /* @__PURE__ */ <FileText size={14} />,
								onClick: handleEmitReceipt
							}, {
								id: "renew",
								label: isAr ? "تجديد/إنهاء" : "Reconduire/Résilier",
								icon: /* @__PURE__ */ <ArrowRight size={14} />,
								onClick: handleRenewLease
							}]} renderGridCard={(l) => /* @__PURE__ */ <div className="space-y-3">
<div className="flex items-center justify-between">
<span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
{formatMoney(l.monthlyRentDzd)}
{" /mois"}
</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75"}`}>{l.status === "Active" ? "Actif" : "Clôturé"}</span>
</div>
<div>
<h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">{l.propertyTitle}</h3>
<div className="text-xs text-black/55 dark:text-white/55 font-medium mt-0.5">
{"Locataire: "}
{l.tenantName}
{" ("}
{l.tenantPhone}
)
</div>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55">
<span>
{"Période: "}
{l.startDate}
{" → "}
{l.endDate}
</span>
<span className="font-mono text-black/70 dark:text-white/75">
{"Caution: "}
{formatMoney(l.securityDepositDzd)}
</span>
</div>
</div>} />
</div>
{selectedLease && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
<div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold"><Key size={18} /></div>
<div>
<div className="flex items-center gap-1.5">
<span className="font-bold text-xs text-black dark:text-white">
{"Bail "}
{selectedLease.id}
</span>
<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedLease.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75"}`}>{selectedLease.status}</span>
</div>
<p className="text-xs font-semibold text-black/70 dark:text-white/75 line-clamp-1">{selectedLease.propertyTitle}</p>
</div>
</div>
<button onClick={() => setSelectedLease(null)} className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={16} /></button>
</div>
<div className="flex items-center gap-1.5 flex-wrap">
<button onClick={() => handleEmitReceipt(selectedLease)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#d4522f] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors">
<FileText size={12} />
{isAr ? "مخالصة" : "Quittance"}
</button>
<button onClick={() => handleRenewLease(selectedLease)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors">
<ArrowRight size={12} />
{selectedLease.status === "Active" ? "Clôturer" : "Réactiver"}
</button>
<button onClick={() => handleDelete(selectedLease)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"><Trash2 size={12} /></button>
</div>
<div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
<button onClick={() => setActiveTab("bail")} className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === "bail" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "العقد" : "Dossier Bail"}</button>
<button onClick={() => setActiveTab("finance")} className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === "finance" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "المالية" : "Finances"}</button>
<button onClick={() => setActiveTab("quittances")} className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === "quittances" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "المخالصات" : "Quittances"}</button>
<button onClick={() => setActiveTab("notes")} className={`pb-2 px-2 font-medium border-b-2 transition-colors ${activeTab === "notes" ? "border-[#d4522f] text-[#d4522f] font-bold" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "البنود" : "Clauses"}</button>
</div>
{activeTab === "bail" && /* @__PURE__ */ <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Bien loué:</span>
<span className="font-semibold text-black dark:text-white truncate max-w-[190px]">{selectedLease.propertyTitle}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Locataire:</span>
<span className="font-semibold text-black dark:text-white">{selectedLease.tenantName}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Téléphone:</span>
<span className="font-mono text-black dark:text-white">{selectedLease.tenantPhone}</span>
</div>
</div>
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Date d'effet:</span>
<span className="font-mono text-black dark:text-white">{selectedLease.startDate}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Échéance de fin:</span>
<span className="font-mono text-black dark:text-white">{selectedLease.endDate}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Périodicité:</span>
<span className="font-semibold text-[#d4522f]">{selectedLease.paymentFrequency}</span>
</div>
</div>
</div>}
{activeTab === "finance" && /* @__PURE__ */ <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
<div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Loyer mensuel:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedLease.monthlyRentDzd)}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Caution de garantie:</span>
<span className="font-mono text-black dark:text-white font-semibold">{formatMoney(selectedLease.securityDepositDzd)}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Honoraires d'agence:</span>
<span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(selectedLease.agencyCommissionDzd || 0)}</span>
</div>
</div>
</div>}
{activeTab === "quittances" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
{quittances.filter((q) => q.leaseId === selectedLease.id).map((q) => /* @__PURE__ */ <div key={q.id} className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5">
<div className="flex items-center justify-between font-semibold text-[11px]">
<span className="font-mono text-[#d4522f] font-bold">{q.quittanceNumber}</span>
<span className="text-emerald-600 font-mono text-[10px]">
{"Paiement "}
{q.paymentMethod}
</span>
</div>
<div className="flex justify-between items-center text-black/70 dark:text-white/75">
<span>
{"Période: Mois "}
{q.periodMonth}
/
{q.periodYear}
</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(q.totalCollectedDzd)}</span>
</div>
<div className="flex justify-between text-[10px] text-black/55 dark:text-white/55">
<span>
{"Timbre fiscal: "}
{formatMoney(q.timbreFiscalDzd)}
</span>
<span>
{"Date: "}
{q.paymentDate}
</span>
</div>
</div>)}
{quittances.filter((q) => q.leaseId === selectedLease.id).length === 0 && /* @__PURE__ */ <div className="text-center py-4 text-black/55 dark:text-white/55 text-xs">Aucune quittance émise pour ce bail.</div>}
<button onClick={() => handleEmitReceipt(selectedLease)} className="w-full py-2.5 rounded-xl bg-[#d4522f] text-white hover:bg-[#a86246] font-semibold text-xs shadow-xs transition-colors">+ Encaisser Loyer & Émettre Quittance</button>
</div>}
{activeTab === "notes" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<p className="text-black/55 dark:text-white/55 text-[11px]">
Clauses particulières, état des lieux d'entrée et interdictions (sous-location, animaux) :
</p>
<textarea rows={6} value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)} placeholder="Noter les conditions spécifiques d'entretien chaudière, taxe d'habitation..." className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none" />
<button onClick={handleSaveNotes} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#d4522f] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs">
{noteSaved ? /* @__PURE__ */ <>
<Check size={14} />
{isAr ? "تم الحفظ" : "Clauses enregistrées"}
</> : /* @__PURE__ */ <>
<Save size={14} />
{isAr ? "حفظ" : "Enregistrer"}
</>}
</button>
</div>}
</div>}
</div>
</div>
<RealEstateLeaseModal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} properties={properties} onSave={(newLease: any) => {
					addLease(newLease);
					setSelectedLease(newLease);
					setIsLeaseModalOpen(false);
				}} />
{isQuittanceModalOpen && /* @__PURE__ */ <QuittanceModal isOpen={isQuittanceModalOpen} onClose={() => {
					setIsQuittanceModalOpen(false);
					setLeaseForQuittance(null);
				}} leases={leases} selectedLease={leaseForQuittance || selectedLease} onSave={(newQ) => {
					addQuittance(newQ);
					showToast(isAr ? "تم إدراج مخالصة الإيجار بنجاح" : "Quittance de loyer avec timbre fiscal enregistrée", "success");
					setIsQuittanceModalOpen(false);
					setLeaseForQuittance(null);
				}} />}
</div>;
};
