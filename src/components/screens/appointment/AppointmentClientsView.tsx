import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Sparkles,
  Scissors,
  Calendar,
  CreditCard,
  Plus,
  Building2,
  ChevronDown,
  Download,
  Trash2,
  Star,
  Pin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Coffee,
  X,
  Edit2,
  Send,
  Heart,
  Droplet,
  Home,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Member } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { formatMoney } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface AppointmentClientsViewProps {
  onAddMember?: () => void;
  onEditMember?: (member: Member) => void;
}

type ClientSegmentFilter = 'all' | 'vip' | 'allergies';



export const AppointmentClientsView: React.FC<AppointmentClientsViewProps> = ({ onAddMember, onEditMember }) => {
	const { members, appointments, staff, currentBranch, branches, switchBranch, addMember, updateMember, deleteMember, resetSalonMockData, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout, language } = useAtriumStore();
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [isNewBookingModalOpen, setIsNewBookingModalOpen] = React.useState(false);
	const [segmentFilter, setSegmentFilter] = React.useState("all");
	const [selectedStylistFilter, setSelectedStylistFilter] = React.useState("All");
	const [selectedHairFilter, setSelectedHairFilter] = React.useState("All");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedClientIds, setSelectedClientIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedClientIds, setPinnedClientIds] = React.useState(/* @__PURE__ */ new Set(["mem_salon_01", "mem_salon_03"]));
	const [inspectingClient, setInspectingClient] = React.useState<any>(null);
	const [drawerTab, setDrawerTab] = React.useState("diagnostic");
	const [newFormulaText, setNewFormulaText] = React.useState("");
	const [newFormulaStylist, setNewFormulaStylist] = React.useState("Sarah Louati");
	const [newFormulaNotes, setNewFormulaNotes] = React.useState("");
	const salonClients = React.useMemo(() => {
		return (members || []).filter((m) => m.id.startsWith("mem_salon_") || m.segmentData?.hairType);
	}, [members]);
	const salonStylists = React.useMemo(() => {
		return staff || [
			{
				id: "st_01",
				fullName: "Sarah Louati",
				role: "Coloriste Senior"
			},
			{
				id: "st_02",
				fullName: "Nadia Belkacem",
				role: "Coiffeuse Styliste"
			},
			{
				id: "st_03",
				fullName: "Amel Mansouri",
				role: "Esthéticienne Cabine"
			},
			{
				id: "st_04",
				fullName: "Lyna Cherif",
				role: "Nail Artist"
			}
		];
	}, [staff]);
	const metrics = React.useMemo(() => {
		const totalClients = salonClients.length;
		const vipCount = salonClients.filter((c) => c.segmentData?.isVip || c.membershipPlanName === "VIP").length;
		return {
			totalClients,
			vipCount,
			allergiesCount: salonClients.filter((c) => c.segmentData?.allergies && c.segmentData.allergies.length > 0).length,
			totalFormulasCount: salonClients.reduce((sum, c) => sum + (c.segmentData?.colorFormulas?.length || 0), 0),
			totalLifetimeSpend: salonClients.reduce((sum, c) => sum + (c.segmentData?.lifetimeSpent || 0), 0),
			vipRatio: totalClients > 0 ? Math.round(vipCount / totalClients * 100) : 0
		};
	}, [salonClients]);
	const filteredClients = React.useMemo(() => {
		return salonClients.filter((client) => {
			if (segmentFilter === "vip" && !client.segmentData?.isVip && client.membershipPlanName !== "VIP") return false;
			if (segmentFilter === "allergies" && (!client.segmentData?.allergies || client.segmentData.allergies.length === 0)) return false;
			if (selectedStylistFilter !== "All") {
				if (client.segmentData?.preferredStylistName !== selectedStylistFilter) return false;
			}
			if (selectedHairFilter !== "All") {
				if (client.segmentData?.hairType !== selectedHairFilter) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = client.fullName.toLowerCase().includes(q);
				const matchesPhone = (client.phoneNumber || "").toLowerCase().includes(q);
				const matchesAllergies = (client.segmentData?.allergies || []).some((a: any) => a.toLowerCase().includes(q));
				const matchesFormula = (client.segmentData?.colorFormulas || []).some((f: any) => f.formula.toLowerCase().includes(q));
				if (!matchesName && !matchesPhone && !matchesAllergies && !matchesFormula) return false;
			}
			return true;
		});
	}, [
		salonClients,
		segmentFilter,
		selectedStylistFilter,
		selectedHairFilter,
		searchQuery
	]);
	const handleTogglePin = (clientId: any) => {
		setPinnedClientIds((prev) => {
			const next = new Set(prev);
			if (next.has(clientId)) next.delete(clientId);
			else next.add(clientId);
			return next;
		});
	};
	const handleBatchSetVIP = () => {
		selectedClientIds.forEach((id) => {
			const client = salonClients.find((c) => c.id === id);
			if (client) updateMember(id, {
				membershipPlanName: "VIP",
				segmentData: {
					...client.segmentData,
					isVip: true
				}
			});
		});
		showToast({
			type: "success",
			title: "Statut VIP attribué",
			message: `${selectedClientIds.size} clientes ont été promues au statut VIP Lounge.`,
			category: "appointment_service"
		});
		setSelectedClientIds(/* @__PURE__ */ new Set());
	};
	const handleBatchDelete = () => {
		selectedClientIds.forEach((id) => {
			deleteMember(id);
		});
		showToast({
			type: "info",
			title: "Dossiers supprimés",
			message: `${selectedClientIds.size} fiches clientes ont été retirées.`,
			category: "appointment_service"
		});
		setSelectedClientIds(/* @__PURE__ */ new Set());
	};
	const handleAddFormula = (e: any) => {
		e.preventDefault();
		if (!inspectingClient || !newFormulaText.trim()) return;
		const updatedFormulas = [{
			id: `form_${Date.now()}`,
			date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			formula: newFormulaText.trim(),
			stylist: newFormulaStylist,
			notes: newFormulaNotes.trim() || void 0
		}, ...inspectingClient.segmentData?.colorFormulas || []];
		updateMember(inspectingClient.id, { segmentData: {
			...inspectingClient.segmentData,
			colorFormulas: updatedFormulas
		} });
		setInspectingClient({
			...inspectingClient,
			segmentData: {
				...inspectingClient.segmentData,
				colorFormulas: updatedFormulas
			}
		});
		setNewFormulaText("");
		setNewFormulaNotes("");
		showToast({
			type: "success",
			title: "Formulation enregistrée",
			message: `La recette technique a été ajoutée au dossier de ${inspectingClient.fullName}.`,
			category: "appointment_service"
		});
	};
	const handleExportCSV = () => {
		const headers = [
			"Nom Complet",
			"Téléphone",
			"Email",
			"Type Cheveux",
			"Longueur",
			"Styliste Attitré",
			"Visites",
			"Dépense Cumulée (DZD)",
			"Allergies"
		];
		const rows = filteredClients.map((c) => [
			`"${c.fullName}"`,
			`"${c.phoneNumber || ""}"`,
			`"${c.email || ""}"`,
			`"${c.segmentData?.hairType || "Ondulé"}"`,
			`"${c.segmentData?.hairLength || "Mi-long"}"`,
			`"${c.segmentData?.preferredStylistName || "Sarah Louati"}"`,
			c.segmentData?.totalVisits || 1,
			c.segmentData?.lifetimeSpent || 0,
			`"${(c.segmentData?.allergies || []).join("; ")}"`
		]);
		const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `Salon_Clientes_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const columns = [
		{
			key: "name",
			header: "Cliente & Contact",
			minWidth: "220px",
			sortable: true,
			renderCell: (client: any) => {
				const isVip = client.segmentData?.isVip || client.membershipPlanName === "VIP";
				const hasAllergies = client.segmentData?.allergies && client.segmentData.allergies.length > 0;
				return /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">{client.fullName.charAt(0)}</div>
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className="font-bold text-xs text-black dark:text-white truncate">{client.fullName}</span>
{isVip && /* @__PURE__ */ <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">VIP</span>}
{hasAllergies && /* @__PURE__ */ <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center gap-0.5">
<AlertTriangle className="w-2.5 h-2.5" />
<span>Alerte</span>
</span>}
</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono truncate">{client.phoneNumber || "Sans téléphone"}</div>
</div>
</div>;
			}
		},
		{
			key: "diagnostic",
			header: "Diagnostic Capillaire",
			minWidth: "180px",
			renderCell: (client: any) => {
				const seg = client.segmentData;
				const hairType = seg?.hairType || "Ondulé";
				const hairLength = seg?.hairLength || "Mi-long";
				return /* @__PURE__ */ <div className="text-xs">
<span className="font-semibold text-black dark:text-white block">
{hairType}
{" · "}
{hairLength}
</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{"Cuir: "}
{seg?.scalpCondition || "Sensible"}
</span>
</div>;
			}
		},
		{
			key: "formula",
			header: "Dernière Formule",
			minWidth: "200px",
			renderCell: (client: any) => {
				const formulas = client.segmentData?.colorFormulas;
				if (!formulas || formulas.length === 0) return /* @__PURE__ */ <span className="text-[11px] text-black/55 dark:text-white/55 italic">Aucune formule</span>;
				const lastFormula = formulas[0];
				return /* @__PURE__ */ <div className="text-xs">
<span className="font-mono text-black dark:text-white font-semibold block truncate max-w-[200px]">{lastFormula.formula}</span>
<div className="flex items-center gap-1.5 text-[10px] text-black/55 dark:text-white/55">
<span>{lastFormula.date}</span>
<span>·</span>
<span>{lastFormula.stylist}</span>
</div>
</div>;
			}
		},
		{
			key: "stylist",
			header: "Styliste Attitré",
			width: "160px",
			sortable: true,
			renderCell: (client: any) => {
				const stylistName = client.segmentData?.preferredStylistName || "Sarah Louati";
				return /* @__PURE__ */ <div className="flex items-center gap-1.5 text-xs text-black/70 dark:text-white/75">
<User className="w-3.5 h-3.5 text-[#d4522f]" />
<span className="font-medium">{stylistName}</span>
</div>;
			}
		},
		{
			key: "visits",
			header: "Visites",
			width: "110px",
			sortable: true,
			renderCell: (client: any) => {
				const visits = client.segmentData?.totalVisits || client.remainingSessions || 1;
				return /* @__PURE__ */ <span className="text-xs font-semibold tabular-nums text-black dark:text-white">
{visits}
{" visites"}
</span>;
			}
		},
		{
			key: "spent",
			header: "Total Dépensé (DZD)",
			width: "150px",
			sortable: true,
			renderCell: (client: any) => {
				const spent = client.segmentData?.lifetimeSpent || 0;
				return /* @__PURE__ */ <span className="text-xs font-bold font-mono text-[#d4522f] tabular-nums">{formatMoney(spent)}</span>;
			}
		},
		{
			key: "actions",
			header: "",
			width: "100px",
			renderCell: (client: any) => /* @__PURE__ */ <div className="flex items-center justify-end">
<button onClick={() => setInspectingClient(client)} className="px-2.5 py-1 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-[#d4522f] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-lg transition-colors cursor-pointer">Fiche</button>
</div>
		}
	];
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: salonClients.length > 0
	});
	if (showSkeleton && (salonClients.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "200px"
			},
			{
				width: "1.5*",
				minWidth: "160px"
			},
			{
				width: "1.5*",
				minWidth: "160px"
			},
			{
				width: "1.2*",
				minWidth: "130px"
			},
			{
				width: "1.2*",
				minWidth: "130px"
			},
			{
				width: "100px",
				minWidth: "90px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={130} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Scissors size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">Fiches & Diagnostics Clientes</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">
{salonClients.length}
{" Clientes"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="outline" size="sm" onClick={handleExportCSV} icon={<Download size={14} className="text-[#d4522f]" />}>Export CSV</AtriumButton>
<AtriumButton variant="primary" size="sm" onClick={() => setIsNewBookingModalOpen(true)} icon={<Plus size={15} />}>Prendre RDV</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">Fiches & Dossiers VIP</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{metrics.vipCount}
{" clientes VIP"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{metrics.totalClients}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
<Star size={13} className="text-amber-500" />
<span>
{metrics.vipRatio}
% de clientes régulières VIP
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">Formulations & Sécurité</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75">
{metrics.totalFormulasCount}
{" recettes"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{metrics.totalFormulasCount}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{metrics.allergiesCount > 0 ? /* @__PURE__ */ <span className="text-rose-500 font-semibold flex items-center gap-1">
<AlertTriangle size={13} />
{metrics.allergiesCount}
{" dossier(s) avec alertes allergies"}
</span> : /* @__PURE__ */ <span className="text-emerald-500 font-medium flex items-center gap-1">
<CheckCircle2 size={13} />
Tolérances cutanées validées
</span>}
</div>
</div>
</div>
<div className="bg-[#1F1D1B] rounded-[20px] p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">Volume Recettes Clientes Globales</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">Dossiers Salon</span>
</div>
<div className="mt-3">
<div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(metrics.totalLifetimeSpend)}</div>
<div className="flex items-center justify-between text-[11px] text-white/75 mt-1.5">
<span className="flex items-center gap-1">
<Award size={12} className="text-[#FB923C]" />
<span>Cumul historique prestations & soins</span>
</span>
<span className="font-mono text-white/80">DZD</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Scissors size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-black dark:text-white">Dossiers Clientes & Diagnostics</span>
<span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#d4522f]/10 text-[#d4522f]">{filteredClients.length}</span>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
<LiveSegmentedControl size="sm" value={segmentFilter} onValueChange={(val) => setSegmentFilter(val)} options={[
											{
												value: "all",
												label: language === "ar" ? "الكل" : "Toutes",
												tooltip: language === "ar" ? "جميع الزبائن" : "Toutes les clientes",
												count: salonClients.length
											},
											{
												value: "vip",
												label: "VIP",
												tooltip: language === "ar" ? "زبائن VIP" : "Clientes VIP",
												count: metrics.vipCount
											},
											{
												value: "allergies",
												label: language === "ar" ? "الحساسيات" : "Allergies",
												tooltip: language === "ar" ? "تنبيهات الحساسية" : "Clientes avec allergies signalées",
												count: metrics.allergiesCount
											}
										]} aria-label="Salon Clients Filter" />
<FilterSelect value={selectedStylistFilter} onChange={(val) => setSelectedStylistFilter(val?.target?.value ?? String(val))} options={[{
											value: "All",
											label: language === "ar" ? "الكل" : "Toutes",
											tooltip: language === "ar" ? "جميع المصففات" : "Toutes stylistes"
										}, ...salonStylists.map((s) => ({
											value: s.fullName,
											label: s.fullName,
											tooltip: s.fullName
										}))]} />
<FilterSelect value={selectedHairFilter} onChange={(val) => setSelectedHairFilter(val?.target?.value ?? String(val))} options={[
											{
												value: "All",
												label: language === "ar" ? "الكل" : "Tous",
												tooltip: language === "ar" ? "كل أنواع الشعر" : "Tous types de cheveux"
											},
											{
												value: "Lisse",
												label: "Lisses",
												tooltip: "Cheveux lisses"
											},
											{
												value: "Ondulé",
												label: "Ondulés",
												tooltip: "Cheveux ondulés"
											},
											{
												value: "Bouclé",
												label: "Bouclés",
												tooltip: "Cheveux bouclés"
											},
											{
												value: "Frisé",
												label: "Frisés",
												tooltip: "Cheveux frisés"
											}
										]} />
<Seek value={searchQuery} onChange={setSearchQuery} placeholder="Filtrer cliente, tel, allergie..." shutSize={34} openWidth={220} />
</div>
</div>
<div className="w-full">
<UniversalDataCollection items={filteredClients} keyExtractor={(c) => c.id} defaultViewMode="list" columns={columns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} onItemClick={(c) => setInspectingClient(c)} onViewDetails={(c) => setInspectingClient(c)} onEdit={(c) => onEditMember ? onEditMember(c) : setInspectingClient(c)} onDelete={(c) => {
									if (window.confirm(`Supprimer le dossier de ${c.fullName} ?`)) {
										deleteMember(c.id);
										if (inspectingClient?.id === c.id) setInspectingClient(null);
									}
								}} customActions={(c) => [{
									id: "book",
									label: "Prendre RDV",
									icon: /* @__PURE__ */ <Calendar size={13} />,
									variant: "primary",
									onClick: () => {
										setInspectingClient(c);
										setIsNewBookingModalOpen(true);
									}
								}]} selectedIds={selectedClientIds} onSelectionChange={setSelectedClientIds} bulkSecondaryAction={{
									label: "Promouvoir VIP",
									icon: /* @__PURE__ */ <Star size={13} />,
									onClick: handleBatchSetVIP,
									variant: "warning"
								}} onBulkDelete={handleBatchDelete} isPinned={(c) => pinnedClientIds.has(c.id)} onTogglePin={(c) => handleTogglePin(c.id)} emptyTitle="Aucun dossier cliente trouvé" emptyDescription="Aucune cliente ne correspond aux filtres de recherche sélectionnés." renderCard={(client) => {
									const isPinned = pinnedClientIds.has(client.id);
									const seg = client.segmentData || {};
									return /* @__PURE__ */ <div className={`p-4 rounded-xl border transition-all ${isPinned ? "border-[#d4522f] bg-[#d4522f]/5" : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs"}`}>
<div className="flex items-start justify-between mb-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-sm flex items-center justify-center">{client.fullName.charAt(0)}</div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white">{client.fullName}</h3>
<p className="text-[11px] text-black/55 dark:text-white/55 font-mono">{client.phoneNumber}</p>
</div>
</div>
<button type="button" onClick={() => handleTogglePin(client.id)} className={`p-1.5 rounded-lg transition-colors ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80"}`}><Pin className="w-3.5 h-3.5" /></button>
</div>
<div className="space-y-2 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-700">
<div className="flex items-center justify-between text-black/70 dark:text-white/75">
<span>Styliste attitré:</span>
<span className="font-semibold text-black dark:text-white">{seg.preferredStylistName || "Sarah Louati"}</span>
</div>
<div className="flex items-center justify-between text-black/70 dark:text-white/75">
<span>Diagnostic:</span>
<span className="font-medium text-black dark:text-white">
{seg.hairType || "Ondulé"}
{" · "}
{seg.hairLength || "Mi-long"}
</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/70 dark:text-white/75">Total Dépensé:</span>
<span className="font-bold text-[#d4522f] tabular-nums font-mono">{formatMoney(seg.lifetimeSpent || 0)}</span>
</div>
</div>
{seg.colorFormulas?.[0] && /* @__PURE__ */ <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-700/60 rounded-xl text-[11px] font-mono text-black/70 dark:text-white/75 truncate">
{"🧪 "}
{seg.colorFormulas[0].formula}
</div>}
<div className="mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
<span className="text-[11px] text-black/55 dark:text-white/55">
{seg.totalVisits || 1}
{" visites"}
</span>
<button type="button" onClick={() => setInspectingClient(client)} className="px-3 py-1 text-xs font-semibold text-[#d4522f] hover:bg-[#d4522f]/10 rounded-lg transition-colors cursor-pointer">Voir la fiche</button>
</div>
</div>;
								}} />
</div>
</div>
</div>
{inspectingClient && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
<div className="w-full max-w-xl h-full bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
<div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
<div className="flex items-center gap-3">
<div className="w-12 h-12 rounded-full bg-[#d4522f]/20 text-[#d4522f] text-lg font-bold flex items-center justify-center">{inspectingClient.fullName.charAt(0)}</div>
<div>
<div className="flex items-center gap-2">
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{inspectingClient.fullName}</h2>
{inspectingClient.segmentData?.isVip && /* @__PURE__ */ <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">VIP LOUNGE</span>}
</div>
<p className="text-xs text-black/55 dark:text-white/55 font-mono mt-0.5">
{inspectingClient.phoneNumber}
{" · "}
{inspectingClient.email || "Sans email"}
</p>
</div>
</div>
<button type="button" onClick={() => setInspectingClient(null)} className="p-1.5 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
</div>
<div className="flex items-center gap-1 px-5 pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
<button type="button" onClick={() => setDrawerTab("diagnostic")} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${drawerTab === "diagnostic" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80"}`}>Diagnostic & Sécurité</button>
<button type="button" onClick={() => setDrawerTab("formulas")} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${drawerTab === "formulas" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80"}`}>
Formulations Chimiques (
{inspectingClient.segmentData?.colorFormulas?.length || 0}
)
</button>
<button type="button" onClick={() => setDrawerTab("history")} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${drawerTab === "history" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80"}`}>Historique Visites</button>
<button type="button" onClick={() => setDrawerTab("preferences")} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${drawerTab === "preferences" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80"}`}>Préférences</button>
</div>
<div className="flex-1 overflow-y-auto p-5 space-y-6">
{drawerTab === "diagnostic" && /* @__PURE__ */ <div className="space-y-5">
<div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
<h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Fiche Morpho-Capillaire</h3>
<div className="grid grid-cols-2 gap-3 text-xs">
<div>
<span className="text-black/55 dark:text-white/55 block text-[11px]">Nature des cheveux</span>
<span className="font-semibold text-black dark:text-white">{inspectingClient.segmentData?.hairType || "Ondulé"}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[11px]">Longueur</span>
<span className="font-semibold text-black dark:text-white">{inspectingClient.segmentData?.hairLength || "Long"}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[11px]">Cuir Chevelu</span>
<span className="font-semibold text-black dark:text-white">{inspectingClient.segmentData?.scalpCondition || "Sensible"}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[11px]">Test de Tolérance (Patch)</span>
<span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
<CheckCircle2 className="w-3.5 h-3.5" />
<span>
Validé (
{inspectingClient.segmentData?.patchTestDate || "2026-09-15"}
)
</span>
</span>
</div>
</div>
</div>
<div className="p-4 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-2">
<div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
<AlertTriangle className="w-4 h-4" />
<span>Alertes & Contre-indications Cosmétiques</span>
</div>
{inspectingClient.segmentData?.allergies && inspectingClient.segmentData.allergies.length > 0 ? /* @__PURE__ */ <div className="flex items-center gap-2 flex-wrap pt-1">
{inspectingClient.segmentData.allergies.map((all: any, idx: number) => /* @__PURE__ */ <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-lg">
{"⚠️ "}
{all}
</span>)}
</div> : /* @__PURE__ */ <p className="text-xs text-black/55 dark:text-white/55">Aucune allergie cutanée ou sensibilité déclarée par la cliente.</p>}
</div>
</div>}
{drawerTab === "formulas" && /* @__PURE__ */ <div className="space-y-5">
<form onSubmit={handleAddFormula} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
<h3 className="text-xs font-bold text-black dark:text-white">Ajouter une Formulation Réalisée</h3>
<div className="space-y-3">
<LabelInput label="Formule exacte (Dosages, tubes, oxydant, patine)" value={newFormulaText} onChange={(e) => setNewFormulaText(e.target.value)} placeholder="Ex: Base 6.1 (40g) + Oxy 20vol (40g) + Dialight 9.11" required />
<div className="grid grid-cols-2 gap-3">
<LabelSelect label="Styliste" value={newFormulaStylist} onChange={(val) => setNewFormulaStylist(val?.target?.value ?? String(val))} options={staff.map((s) => ({
															value: s.fullName,
															label: s.fullName
														}))} />
<LabelInput label="Temps de pose / Remarques" value={newFormulaNotes} onChange={(e) => setNewFormulaNotes(e.target.value)} placeholder="Pose: 35 min" />
</div>
</div>
<div className="pt-1">
<AtriumButton type="submit" variant="primary" size="sm">Enregistrer la Formule</AtriumButton>
</div>
</form>
<div className="space-y-3">
<h3 className="text-xs font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
Historique des Recettes (
{inspectingClient.segmentData?.colorFormulas?.length || 0}
)
</h3>
{(inspectingClient.segmentData?.colorFormulas || []).map((f: any) => /* @__PURE__ */ <div key={f.id} className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 space-y-1.5 shadow-2xs">
<div className="flex items-center justify-between text-xs font-semibold">
<span className="font-mono text-[#d4522f] font-bold">{f.formula}</span>
<span className="text-[11px] text-black/55 dark:text-white/55 font-mono">{f.date}</span>
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 flex items-center justify-between">
<span>
{"Styliste: "}
{f.stylist}
</span>
{f.notes && /* @__PURE__ */ <span className="italic">{f.notes}</span>}
</div>
</div>)}
</div>
</div>}
{drawerTab === "history" && /* @__PURE__ */ <div className="space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-xs font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">Prestations Effectuées au Salon</h3>
<span className="text-xs font-bold font-mono text-[#d4522f]">
{"Cumul: "}
{formatMoney(inspectingClient.segmentData?.lifetimeSpent || 0)}
</span>
</div>
<div className="space-y-2.5">
{appointments.filter((a) => a.clientName === inspectingClient.fullName).map((apt) => /* @__PURE__ */ <div key={apt.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-between text-xs shadow-2xs">
<div>
<span className="font-semibold text-black dark:text-white block">{apt.serviceName}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">
{apt.date}
{" à "}
{apt.startTime}
{" · Styliste: "}
{apt.staffName}
</span>
</div>
<span className="font-bold font-mono text-black dark:text-white tabular-nums">{formatMoney(apt.price)}</span>
</div>)}
</div>
</div>}
{drawerTab === "preferences" && /* @__PURE__ */ <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
<h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Confort & Accueil Salon</h3>
<div className="space-y-2 text-xs">
<div className="flex items-center gap-2">
<Coffee className="w-4 h-4 text-amber-600" />
<span className="text-black/55 dark:text-white/55">Boisson Préférée:</span>
<span className="font-semibold text-black dark:text-white">{inspectingClient.segmentData?.preferredDrink || "Café noir sans sucre"}</span>
</div>
<div className="flex items-center gap-2">
<User className="w-4 h-4 text-[#d4522f]" />
<span className="text-black/55 dark:text-white/55">Styliste Dédié:</span>
<span className="font-semibold text-black dark:text-white">{inspectingClient.segmentData?.preferredStylistName || "Sarah Louati"}</span>
</div>
{inspectingClient.notes && /* @__PURE__ */ <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">Notes d'accueil</span>
<p className="text-xs text-black/70 dark:text-white/75 italic">
"
{inspectingClient.notes}
"
</p>
</div>}
</div>
</div>}
</div>
<div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
<span className="text-xs text-black/55 dark:text-white/55 font-mono">
{"ID: "}
{inspectingClient.id}
</span>
<AtriumButton variant="primary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />} onClick={() => {
									setInspectingClient(null);
									setIsNewBookingModalOpen(true);
								}}>Programmer un Soin</AtriumButton>
</div>
</div>
</div>}
{isNewBookingModalOpen && /* @__PURE__ */ <AppointmentModal isOpen={isNewBookingModalOpen} onClose={() => setIsNewBookingModalOpen(false)} />}
</div>;
};
