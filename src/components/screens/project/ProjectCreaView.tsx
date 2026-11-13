import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMBatDeliverable } from '../../../types/index';
import {
  Palette,
  UploadCloud,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  FileText,
  Lock,
  Download,
  Eye,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKanbanPipeline, SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface ProjectCreaViewProps {
  initialTab?: 'demandes' | 'kanban' | 'production' | 'upload' | 'briefs';
}



export const ProjectCreaView: React.FC<ProjectCreaViewProps> = ({ initialTab }) => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, pmProjects, pmPrintOrders, pmBatDeliverables, addPmBatDeliverable, updatePmPrintOrderStatus, reviewPmBatDeliverable, batchReviewPmBatDeliverables, batchDeletePmBatDeliverables, resetPmMockData, activePmSubScreen, setActivePmSubScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
	const activeTab = activePmSubScreen === "upload" || activePmSubScreen === "livrables" || initialTab === "upload" ? "upload" : activePmSubScreen === "production" || initialTab === "production" ? "production" : activePmSubScreen === "briefs" || initialTab === "briefs" ? "briefs" : activePmSubScreen === "demandes" || initialTab === "demandes" ? "demandes" : "kanban";
	const setActiveTab = (tab: any) => {
		setActivePmSubScreen(tab);
	};
	const [selectedProjectId, setSelectedProjectId] = React.useState(pmProjects[0]?.id || "");
	const [selectedOrderId, setSelectedOrderId] = React.useState("");
	const [selectedPreviewBat, setSelectedPreviewBat] = React.useState<any>(null);
	const [artworkTitle, setArtworkTitle] = React.useState("");
	const [fileFormat, setFileFormat] = React.useState("pdf");
	const [colorSpace, setColorSpace] = React.useState("CMJN");
	const [resolutionDpi, setResolutionDpi] = React.useState("300");
	const [hasBleedIncluded, setHasBleedIncluded] = React.useState(true);
	const [previewUrl, setPreviewUrl] = React.useState("https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80");
	const [uploadSuccess, setUploadSuccess] = React.useState(false);
	const [creaSearch, setCreaSearch] = React.useState("");
	const [selectedBatIds, setSelectedBatIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedBatIds, setPinnedBatIds] = React.useState(/* @__PURE__ */ new Set());
	const [batSortBy, setBatSortBy] = React.useState("title");
	const [batSortDir, setBatSortDir] = React.useState("asc");
	const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];
	const filteredDeliverables = React.useMemo(() => {
		return pmBatDeliverables.filter((b) => {
			const q = creaSearch.toLowerCase().trim();
			return !q || b.title.toLowerCase().includes(q) || b.projectTitle.toLowerCase().includes(q) || b.fileFormat.toLowerCase().includes(q);
		});
	}, [pmBatDeliverables, creaSearch]);
	const sortedDeliverables = React.useMemo(() => {
		return [...filteredDeliverables].sort((a, b) => {
			const aPinned = pinnedBatIds.has(a.id);
			const bPinned = pinnedBatIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (batSortBy === "title") {
				const cmp = a.title.localeCompare(b.title);
				return batSortDir === "asc" ? cmp : -cmp;
			}
			if (batSortBy === "project") {
				const cmp = a.projectTitle.localeCompare(b.projectTitle);
				return batSortDir === "asc" ? cmp : -cmp;
			}
			if (batSortBy === "version") return batSortDir === "asc" ? a.version - b.version : b.version - a.version;
			return 0;
		});
	}, [
		filteredDeliverables,
		pinnedBatIds,
		batSortBy,
		batSortDir
	]);
	const batColumns = React.useMemo(() => [
		{
			key: "title",
			header: "Fichier & Version BAT",
			width: "2.5*",
			minWidth: "220px",
			sortable: true,
			renderCell: (bat: any) => {
				const isPinned = pinnedBatIds.has(bat.id);
				return /* @__PURE__ */ <div className="flex items-center gap-2.5">
<button type="button" onClick={(e) => {
								e.stopPropagation();
								setPinnedBatIds((prev) => {
									const next = new Set(prev);
									if (next.has(bat.id)) next.delete(bat.id);
									else next.add(bat.id);
									return next;
								});
							}} className={`p-1 rounded-lg transition-colors cursor-pointer ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}><Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} /></button>
<img src={bat.previewUrl} alt={bat.title} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#E6DED6] dark:border-neutral-800" />
<div className="min-w-0">
<div className="font-semibold text-xs text-black dark:text-white truncate max-w-[190px]">{bat.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{bat.versionCode}
{" · "}
{bat.fileFormat.toUpperCase()}
</div>
</div>
</div>;
			}
		},
		{
			key: "project",
			header: "Campagne",
			width: "2*",
			minWidth: "180px",
			sortable: true,
			renderCell: (bat: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75 font-medium truncate max-w-[170px]">{bat.projectTitle}</div>
		},
		{
			key: "specs",
			header: "Spécifications Imprimeur",
			width: "1.8*",
			minWidth: "180px",
			renderCell: (bat: any) => /* @__PURE__ */ <div className="flex items-center gap-1.5 text-[11px] font-mono">
<span className={`px-1.5 py-0.5 rounded font-bold ${bat.colorSpace === "CMJN" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-100 text-red-700"}`}>{bat.colorSpace}</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-black/70 dark:text-white/75">
{bat.resolutionDpi}
{" DPI"}
</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-black/55 dark:text-white/55">
+
{bat.bleedMm}
mm
</span>
</div>
		},
		{
			key: "status",
			header: "Statut Validation",
			width: "1.5*",
			minWidth: "150px",
			align: "center",
			renderCell: (bat: any) => {
				const badge = ({
					approved: {
						label: "Validé BAT",
						bg: "bg-emerald-100 dark:bg-emerald-950/60",
						text: "text-emerald-800 dark:text-emerald-300"
					},
					revision_requested: {
						label: "Corrections",
						bg: "bg-red-100 dark:bg-red-950/60",
						text: "text-red-800 dark:text-red-300"
					},
					pending_review: {
						label: "En Revue CDP",
						bg: "bg-amber-100 dark:bg-amber-950/60",
						text: "text-amber-800 dark:text-amber-300"
					}
				} as Record<string, any>)[bat.approvalStatus] || {
					label: bat.approvalStatus,
					bg: "bg-[#F3EDE7]",
					text: "text-black/70 dark:text-white/75"
				};
				return /* @__PURE__ */ <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
			}
		},
		{
			key: "actions",
			header: "Aperçu",
			width: "1*",
			minWidth: "100px",
			align: "right",
			renderCell: (bat: any) => /* @__PURE__ */ <button type="button" onClick={() => setSelectedPreviewBat(bat)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 rounded-lg cursor-pointer ml-auto" title="Inspecter le BAT"><Eye className="w-4 h-4" /></button>
		}
	], [pinnedBatIds]);
	const handleUploadSubmit = (e: any) => {
		e.preventDefault();
		if (!selectedProject || !artworkTitle) return;
		const nextVersion = pmBatDeliverables.filter((b) => b.projectId === selectedProject.id).length + 1;
		addPmBatDeliverable({
			tenantId: "acc_01",
			facilityId: "branch_agency_main",
			projectId: selectedProject.id,
			projectTitle: selectedProject.title,
			printOrderId: selectedOrderId || void 0,
			title: artworkTitle.endsWith(".pdf") ? artworkTitle : `${artworkTitle}_v${nextVersion}.pdf`,
			fileFormat: fileFormat as any,
			colorSpace: colorSpace as any,
			resolutionDpi: Number(resolutionDpi) || 300,
			bleedMm: 3,
			hasBleedIncluded,
			version: nextVersion,
			versionCode: `v${nextVersion}`,
			previewUrl: previewUrl || "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80",
			fileSizeBytes: 35e6,
			uploadedByCreativeId: "crea_lead_01",
			uploadedByCreativeName: "Lina Hadj-Ali (Art Director)",
			approvalStatus: "pending_review"
		});
		if (selectedOrderId) updatePmPrintOrderStatus(selectedOrderId, "bat_in_progress");
		setUploadSuccess(true);
		setTimeout(() => {
			setUploadSuccess(false);
			setActiveTab("production");
		}, 1800);
		setArtworkTitle("");
	};
	const handleExportBatCsv = () => {
		const headers = [
			"Livrable",
			"Campagne",
			"Format",
			"Espace Couleur",
			"Résolution DPI",
			"Version",
			"Statut BAT"
		];
		const rows = sortedDeliverables.map((b) => [
			`"${b.title}"`,
			`"${b.projectTitle.replace(/"/g, "\"\"")}"`,
			b.fileFormat,
			b.colorSpace,
			b.resolutionDpi,
			b.versionCode,
			b.approvalStatus
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `livrables_bat_crea_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: pmBatDeliverables.length > 0 || pmPrintOrders.length > 0
	});
	if (showSkeleton && (pmBatDeliverables.length === 0 && pmPrintOrders.length === 0 || networkMode === "force_skeleton")) {
		if (activeTab === "kanban") return /* @__PURE__ */ <SkeletonKanbanPipeline columnsCount={4} isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
		return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
				{
					width: "2.5*",
					minWidth: "180px"
				},
				{
					width: "1.5*",
					minWidth: "140px"
				},
				{
					width: "1.2*",
					minWidth: "120px"
				},
				{
					width: "1.5*",
					minWidth: "140px"
				}
			]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	}
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<div>
<div className="flex items-center gap-2">
<span className="text-xs font-semibold uppercase tracking-wider text-[#d4522f]">Studio Créa</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs text-black/55 dark:text-white/55">Conception Graphique & Pré-Presse</span>
</div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{activeTab === "kanban" ? "Tableau Kanban des Créations" : activeTab === "production" ? "Livrables & Fichiers BAT" : activeTab === "upload" ? "Dépôt & Conformité Technique" : "Demandes & Briefs Reçus"}
</h1>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton variant="primary" size="sm" onClick={() => setActiveTab("upload")} icon={<UploadCloud className="w-4 h-4" />}>Déposer un BAT</AtriumButton>
</div>
</div>
<div className="pb-2">
<LiveSegmentedControl size="sm" value={activeTab} onValueChange={(val) => setActiveTab(val)} options={[
						{
							value: "kanban",
							label: language === "ar" ? "كانبان" : "Kanban",
							tooltip: language === "ar" ? "لوحة الاستوديو" : language === "fr" ? "Kanban Studio" : "Studio Kanban",
							icon: /* @__PURE__ */ <Layers className="w-3.5 h-3.5 inline mr-1" />
						},
						{
							value: "production",
							label: language === "ar" ? "مخرجات" : language === "fr" ? "Livrables" : "Deliverables",
							tooltip: language === "ar" ? "ملفات BAT" : language === "fr" ? "Livrables BAT" : "Artwork deliverables",
							icon: /* @__PURE__ */ <FileCheck2 className="w-3.5 h-3.5 inline mr-1" />,
							count: pmBatDeliverables.length
						},
						{
							value: "upload",
							label: language === "ar" ? "رفع" : language === "fr" ? "Importer" : "Upload",
							tooltip: language === "ar" ? "رفع ملف مطابق" : language === "fr" ? "Uploader Conforme" : "Compliant artwork upload",
							icon: /* @__PURE__ */ <UploadCloud className="w-3.5 h-3.5 inline mr-1" />
						},
						{
							value: "briefs",
							label: language === "ar" ? "موجزات" : "Briefs",
							tooltip: language === "ar" ? "موجزات وتصاميم رئيسية" : language === "fr" ? "Briefs & Key Visuals" : "Briefs & key visuals",
							icon: /* @__PURE__ */ <FileText className="w-3.5 h-3.5 inline mr-1" />,
							count: pmProjects.length
						}
					]} aria-label="Creative Studio Subtab" />
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">Indicateurs Pré-Presse & Livrables BAT</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Livrables BAT Conçus</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmBatDeliverables.length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{pmBatDeliverables.filter((b) => b.approvalStatus === "pending_review").length}
{" en cours de validation"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">BAT Bons à Tirer Validés</span>
<div>
<div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmBatDeliverables.filter((b) => b.approvalStatus === "approved").length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">Prêts pour transfert aux imprimeurs</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">Norme Déblocage Imprimerie</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">CMJN · 300 DPI</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{pmBatDeliverables.length > 0 ? Math.round(pmBatDeliverables.filter((b) => b.colorSpace === "CMJN" && b.resolutionDpi >= 300).length / pmBatDeliverables.length * 100) : 100}
%
</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>Fonds perdus +3mm certifiés</span>
</p>
</div>
</div>
</div>
</div>
{activeTab === "kanban" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="space-y-3">
<div className="flex items-center justify-between pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<span className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/75">1. Reçus du Chef de Projet</span>
<span className="w-5 h-5 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 font-mono text-xs flex items-center justify-center font-bold">{pmPrintOrders.filter((o) => o.status === "sent_to_crea").length}</span>
</div>
{pmPrintOrders.filter((o) => o.status === "sent_to_crea").map((order) => /* @__PURE__ */ <div key={order.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs space-y-2.5">
<div className="flex items-center justify-between text-[11px]">
<span className="font-mono font-bold text-[#d4522f]">{order.orderNumber}</span>
<span className="text-black/55 dark:text-white/55">
{order.items.length}
{" support(s)"}
</span>
</div>
<h4 className="text-xs font-bold text-black dark:text-white">{order.projectTitle}</h4>
<div className="text-[11px] text-black/55 dark:text-white/55">{order.items.map((i) => i.itemTitle).join(", ")}</div>
<AtriumButton type="button" size="xs" variant="primary" className="w-full" icon={<UploadCloud className="w-3.5 h-3.5" />} onClick={() => {
											setSelectedOrderId(order.id);
											setSelectedProjectId(order.projectId);
											setActiveTab("upload");
										}}>Créer le BAT ➔</AtriumButton>
</div>)}
</div>
<div className="space-y-3">
<div className="flex items-center justify-between pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<span className="text-xs font-bold uppercase tracking-wider text-amber-600">2. En Revue CDP & Client</span>
<span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-xs flex items-center justify-center font-bold">{pmBatDeliverables.filter((b) => b.approvalStatus === "pending_review").length}</span>
</div>
{pmBatDeliverables.filter((b) => b.approvalStatus === "pending_review").map((bat) => /* @__PURE__ */ <div key={bat.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs space-y-2.5">
<img src={bat.previewUrl} alt={bat.title} className="w-full h-28 rounded-xl object-cover" />
<div className="flex items-center justify-between text-[11px]">
<span className="font-bold text-black dark:text-white">{bat.title}</span>
<span className="font-mono text-black/55 dark:text-white/55">{bat.versionCode}</span>
</div>
<p className="text-[11px] text-black/55 dark:text-white/55">{bat.projectTitle}</p>
</div>)}
</div>
<div className="space-y-3">
<div className="flex items-center justify-between pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<span className="text-xs font-bold uppercase tracking-wider text-emerald-600">3. BAT Prêt Imprimeur</span>
<span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs flex items-center justify-center font-bold">{pmBatDeliverables.filter((b) => b.approvalStatus === "approved").length}</span>
</div>
{pmBatDeliverables.filter((b) => b.approvalStatus === "approved").map((bat) => /* @__PURE__ */ <div key={bat.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs space-y-2.5">
<img src={bat.previewUrl} alt={bat.title} className="w-full h-28 rounded-xl object-cover" />
<div className="flex items-center justify-between text-[11px]">
<span className="font-bold text-emerald-700 dark:text-emerald-400">{bat.title}</span>
<span className="font-mono text-emerald-600">{bat.versionCode}</span>
</div>
<div className="text-[11px] text-black/55 dark:text-white/55">Conforme CMJN 300 DPI · Prêt pour déblocage imprimeur.</div>
</div>)}
</div>
</div>
</div>}
{activeTab === "production" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<Seek value={creaSearch} onChange={setCreaSearch} placeholder="Rechercher par livrable, campagne ou format..." openWidth={360} shutSize={38} />
<button onClick={handleExportBatCsv} className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/75 bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700 hover:bg-[#FBF8F5] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
<Download className="w-3.5 h-3.5" />
<span>Export CSV</span>
</button>
</div>
{selectedBatIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between px-4 py-3 bg-[#d4522f]/10 border border-[#d4522f]/30 rounded-2xl animate-in fade-in">
<div className="flex items-center gap-3 text-xs font-semibold text-[#d4522f]">
<span>
{selectedBatIds.size}
{" livrable(s) sélectionné(s)"}
</span>
<button type="button" onClick={() => setSelectedBatIds(/* @__PURE__ */ new Set())} className="text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white underline cursor-pointer">Désélectionner</button>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => {
									batchReviewPmBatDeliverables(Array.from(selectedBatIds), "approved");
									setSelectedBatIds(/* @__PURE__ */ new Set());
								}} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer">Valider Bon à Tirer</button>
<button type="button" onClick={() => {
									batchDeletePmBatDeliverables(Array.from(selectedBatIds));
									setSelectedBatIds(/* @__PURE__ */ new Set());
								}} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
<Trash2 className="w-3.5 h-3.5" />
Supprimer
</button>
</div>
</div>}
<UniversalDataCollection items={sortedDeliverables} keyExtractor={(b) => b.id} defaultViewMode="list" columns={batColumns} sortBy={batSortBy} sortDirection={batSortDir} onSortChange={(key) => {
							if (batSortBy === key) setBatSortDir((prev) => prev === "asc" ? "desc" : "asc");
							else {
								setBatSortBy(key);
								setBatSortDir("asc");
							}
						}} selectedIds={selectedBatIds} onSelectionChange={setSelectedBatIds} renderCard={(bat) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-2">
<img src={bat.previewUrl} alt={bat.title} className="w-full h-36 rounded-xl object-cover border border-[#E6DED6]/60 dark:border-neutral-800" />
<div className="flex justify-between items-center text-xs">
<span className="font-bold text-[#d4522f]">{bat.versionCode}</span>
<span className="font-mono text-black/55 dark:text-white/55">{bat.fileFormat.toUpperCase()}</span>
</div>
<h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">{bat.title}</h4>
<p className="text-xs text-black/55 dark:text-white/55 line-clamp-1">{bat.projectTitle}</p>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
<span>
{bat.colorSpace}
{" · "}
{bat.resolutionDpi}
{" DPI"}
</span>
<button type="button" onClick={() => setSelectedPreviewBat(bat)} className="text-[#d4522f] font-semibold hover:underline cursor-pointer">Inspecter ➔</button>
</div>
</div>} />
</div>}
{activeTab === "upload" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="p-6 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs max-w-3xl mx-auto space-y-6">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Dépôt & Conformité Pré-Presse (Slide 8)</span>
<h2 className="text-xl font-bold text-black dark:text-white mt-1">Validation Technique des Fichiers Imprimeur</h2>
</div>
{uploadSuccess && /* @__PURE__ */ <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold">
<CheckCircle className="w-5 h-5 text-emerald-600" />
Livrable BAT enregistré et transmis au Chef de Projet !
</div>}
<form onSubmit={handleUploadSubmit} className="space-y-4">
<LabelSelect field="Project" label="Projet / Campagne" value={selectedProjectId} onChange={(val) => setSelectedProjectId(typeof val === "string" ? val : val.target?.value || val)} options={pmProjects.map((p) => ({
										value: p.id,
										label: `${p.title} (${p.clientName})`
									}))} height={46} corner={12} />
<LabelInput field="ArtworkTitle" label="Nom du Fichier d'Exécution" placeholder="Ex: ROLLUP_OOREDOO_85x200_BAT" value={artworkTitle} onChange={setArtworkTitle} required height={46} corner={12} />
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<FilterSelect label="Format Fichier" value={fileFormat} onChange={(val) => setFileFormat(typeof val === "string" ? val : val.target?.value || val)} options={[
												{
													value: "pdf",
													label: "PDF",
													tooltip: "PDF Haute Résolution"
												},
												{
													value: "ai",
													label: "Illustrator",
													tooltip: "Adobe Illustrator (.ai)"
												},
												{
													value: "psd",
													label: "Photoshop",
													tooltip: "Photoshop (.psd)"
												},
												{
													value: "tiff",
													label: "TIFF",
													tooltip: "TIFF Pré-presse"
												}
											]} />
<FilterSelect label="Espace Colorimétrique" value={colorSpace} onChange={(val) => setColorSpace(typeof val === "string" ? val : val.target?.value || val)} options={[{
												value: "CMJN",
												label: "CMJN",
												tooltip: "CMJN (Quadrichromie)"
											}, {
												value: "RVB",
												label: "RVB",
												tooltip: "RVB (Rejeté imprimeur)"
											}]} />
<LabelInput field="Resolution" label="Résolution (DPI)" type="number" value={resolutionDpi} onChange={setResolutionDpi} required height={46} corner={12} />
</div>
<div className="p-4 rounded-xl bg-[#FBF8F5] dark:bg-neutral-800/40 border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between text-xs">
<div className="space-y-0.5">
<span className="font-semibold text-black dark:text-white">Fond Perdu & Traits de Coupe (+3mm)</span>
<p className="text-[11px] text-black/55 dark:text-white/55">Indispensable pour éviter tout liseré blanc au massicotage.</p>
</div>
<input type="checkbox" checked={hasBleedIncluded} onChange={(e) => setHasBleedIncluded(e.target.checked)} className="w-4 h-4 rounded text-[#d4522f] focus:ring-[#d4522f]" />
</div>
<AtriumButton type="submit" variant="primary" size="md" className="w-full justify-center" disabled={colorSpace !== "CMJN" || Number(resolutionDpi) < 300 || !hasBleedIncluded} icon={<UploadCloud className="w-4 h-4" />}>Valider la Conformité & Déposer le BAT</AtriumButton>
</form>
</div>
</div>}
{activeTab === "briefs" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{pmProjects.map((p) => /* @__PURE__ */ <div key={p.id} className="p-5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs space-y-3">
<div className="flex items-center justify-between text-xs">
<span className="font-bold text-[#d4522f] uppercase">{p.clientName}</span>
<span className="font-mono text-black/55 dark:text-white/55">
{"Échéance KV: "}
{p.kvDeadline}
</span>
</div>
<h3 className="text-sm font-bold text-black dark:text-white">{p.title}</h3>
<p className="text-xs text-black/70 dark:text-white/75 line-clamp-3">{p.scopeOfWork}</p>
</div>)}
</div>
</div>}
{selectedPreviewBat && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between">
<div>
<h3 className="text-sm font-bold text-black dark:text-white">{selectedPreviewBat.title}</h3>
<span className="text-xs text-black/55 dark:text-white/55">{selectedPreviewBat.projectTitle}</span>
</div>
<button type="button" onClick={() => setSelectedPreviewBat(null)} className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<img src={selectedPreviewBat.previewUrl} alt={selectedPreviewBat.title} className="w-full h-80 object-cover rounded-xl border border-[#E6DED6] dark:border-neutral-800" />
<div className="flex justify-between items-center text-xs font-mono text-black/55 dark:text-white/55">
<span>
{selectedPreviewBat.colorSpace}
{" · "}
{selectedPreviewBat.resolutionDpi}
{" DPI"}
</span>
<span>
Fond perdu : +
{selectedPreviewBat.bleedMm}
mm
</span>
</div>
<div className="flex justify-end gap-2 pt-2 border-t border-[#E6DED6]/60 dark:border-neutral-800">
<button type="button" onClick={() => setSelectedPreviewBat(null)} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 rounded-xl cursor-pointer">Fermer</button>
</div>
</div>
</div>}
</div>;
};
