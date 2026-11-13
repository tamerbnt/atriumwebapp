import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Plus,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  X,
  ExternalLink,
  DollarSign,
  Clock,
  ShieldCheck,
  Home,
  ChevronDown,
  RefreshCw,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Download,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { B2bClient, B2bSupplier } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { B2bEntityModal } from './B2bEntityModal';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type DirectoryMode = 'clients' | 'suppliers';


export const TradingDirectoryView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { b2bClients, b2bSuppliers, commercialDocs, deleteB2bClient, deleteB2bSupplier, currentBranch, branches, switchBranch, resetTradingMockData, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout, showToast } = useAtriumStore();
	const [mode, setMode] = React.useState("clients");
	const [selectedEntityIds, setSelectedEntityIds] = React.useState(/* @__PURE__ */ new Set());
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedEntity, setSelectedEntity] = React.useState<any>(null);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [entityModalOpen, setEntityModalOpen] = React.useState(false);
	const [editingEntity, setEditingEntity] = React.useState<any>(null);
	const [composerOpen, setComposerOpen] = React.useState(false);
	const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
	const metrics = React.useMemo(() => {
		const totalClientDebt = b2bClients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
		const totalCreditLimit = b2bClients.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
		return {
			totalClientDebt,
			totalCreditLimit,
			totalSupplierDebt: b2bSuppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0),
			creditUtilization: totalCreditLimit > 0 ? totalClientDebt / totalCreditLimit * 100 : 0,
			overLimitClients: b2bClients.filter((c) => (c.outstandingBalance || 0) > (c.creditLimit || 0)).length
		};
	}, [b2bClients, b2bSuppliers]);
	const filteredClients = React.useMemo(() => {
		return b2bClients.filter((c) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = c.companyName.toLowerCase().includes(q);
				const matchesContact = (c.contactName || "").toLowerCase().includes(q);
				const matchesNif = (c.nif || "").toLowerCase().includes(q);
				const matchesCity = (c.city || "").toLowerCase().includes(q);
				if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
			}
			return true;
		});
	}, [b2bClients, searchQuery]);
	const filteredSuppliers = React.useMemo(() => {
		return b2bSuppliers.filter((s) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = s.supplierName.toLowerCase().includes(q);
				const matchesContact = (s.contactName || "").toLowerCase().includes(q);
				const matchesNif = (s.nif || "").toLowerCase().includes(q);
				const matchesCity = (s.city || "").toLowerCase().includes(q);
				if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
			}
			return true;
		});
	}, [b2bSuppliers, searchQuery]);
	const clientColumns = [
		{
			key: "company",
			header: t("trading_col_company", "Raison Sociale & Secteur"),
			minWidth: "220px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-black dark:text-white block">{c.companyName}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{c.sector || "Entreprise B2B"}</span>
</div>
		},
		{
			key: "legal",
			header: "N.I.F. / R.C.",
			width: "180px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="text-xs font-mono">
<span className="block font-medium text-black dark:text-white">
{"NIF: "}
{c.nif || "N/A"}
</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{"RC: "}
{c.rc || "N/A"}
</span>
</div>
		},
		{
			key: "contact",
			header: t("trading_col_contact", "Interlocuteur"),
			width: "180px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-semibold text-black dark:text-white block">{c.contactName || "N/A"}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{c.phone || c.contactPhone}</span>
</div>
		},
		{
			key: "city",
			header: t("trading_col_city", "Wilaya"),
			width: "100px",
			renderCell: (c: any) => /* @__PURE__ */ <span className="text-xs text-black/70 dark:text-white/75">{c.city}</span>
		},
		{
			key: "balance",
			header: t("trading_col_balance", "Encours / Crédit"),
			width: "160px",
			renderCell: (c: any) => {
				const isOver = (c.outstandingBalance || 0) > (c.creditLimit || 0);
				return /* @__PURE__ */ <div className="text-xs font-mono tabular-nums">
<span className={`font-bold block ${isOver ? "text-rose-600 dark:text-rose-400" : "text-black dark:text-white"}`}>{formatMoney(c.outstandingBalance || 0)}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{"Plafond: "}
{formatMoney(c.creditLimit || 0)}
</span>
</div>;
			}
		},
		{
			key: "actions",
			header: "",
			width: "90px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1">
<button onClick={(e) => {
						e.stopPropagation();
						setEditingEntity(c);
						setEntityModalOpen(true);
					}} title={t("action_edit", "Modifier")} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><Edit size={14} /></button>
<button onClick={(e) => {
						e.stopPropagation();
						setDeleteTarget(c);
					}} title={t("action_delete", "Supprimer")} className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"><Trash2 size={14} /></button>
</div>
		}
	];
	const supplierColumns = [
		{
			key: "name",
			header: t("trading_col_supplier", "Fournisseur Référencé"),
			minWidth: "220px",
			renderCell: (s: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-black dark:text-white block">{s.supplierName}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{s.sector || "Fournisseur"}</span>
</div>
		},
		{
			key: "legal",
			header: "N.I.F. / R.C.",
			width: "180px",
			renderCell: (s: any) => /* @__PURE__ */ <div className="text-xs font-mono">
<span className="block font-medium text-black dark:text-white">
{"NIF: "}
{s.nif || "N/A"}
</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{"RC: "}
{s.rc || "N/A"}
</span>
</div>
		},
		{
			key: "contact",
			header: t("trading_col_contact", "Contact & Tél"),
			width: "180px",
			renderCell: (s: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-semibold text-black dark:text-white block">{s.contactName || "Standard"}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{s.phone}</span>
</div>
		},
		{
			key: "city",
			header: t("trading_col_city", "Ville"),
			width: "110px",
			renderCell: (s: any) => /* @__PURE__ */ <span className="text-xs text-black/70 dark:text-white/75">{s.city}</span>
		},
		{
			key: "payable",
			header: t("trading_col_debt", "Dette Fournisseur"),
			width: "150px",
			renderCell: (s: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">{formatMoney(s.outstandingPayable || 0)}</span>
		},
		{
			key: "actions",
			header: "",
			width: "90px",
			renderCell: (s: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1">
<button onClick={(e) => {
						e.stopPropagation();
						setEditingEntity(s);
						setEntityModalOpen(true);
					}} title={t("action_edit", "Modifier")} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><Edit size={14} /></button>
<button onClick={(e) => {
						e.stopPropagation();
						setDeleteTarget(s);
					}} title={t("action_delete", "Supprimer")} className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"><Trash2 size={14} /></button>
</div>
		}
	];
	const entityHistory = React.useMemo(() => {
		if (!selectedEntity || mode !== "clients") return [];
		return commercialDocs.filter((d) => d.clientId === selectedEntity.id);
	}, [
		selectedEntity,
		mode,
		commercialDocs
	]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: b2bClients.length > 0 || b2bSuppliers.length > 0
	});
	if (showSkeleton && (b2bClients.length === 0 && b2bSuppliers.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Users size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{t("trading_directory_title", "Répertoire des Partenaires B2B")}</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">
{b2bClients.length}
{" "}
{language === "ar" ? "عميل" : "Clients"}
{" • "}
{b2bSuppliers.length}
{" "}
{language === "ar" ? "مورد" : "Fournisseurs"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="primary" onClick={() => {
									setEditingEntity(null);
									setEntityModalOpen(true);
								}} icon={<Plus size={15} />}>
{mode === "clients" ? language === "ar" ? "عميل تجاري جديد" : "Nouveau Client B2B" : language === "ar" ? "مورد جديد" : "Nouveau Fournisseur"}
</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">{language === "ar" ? "العملاء التجاريون المعتمدون" : "Clients B2B Référencés"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{b2bClients.length}
{" comptes"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{b2bClients.length}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
<ShieldCheck size={13} className="text-emerald-500" />
<span>
{"Plafond global: "}
<strong className="font-mono text-black dark:text-white">{formatMoney(metrics.totalCreditLimit)}</strong>
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-black/55 dark:text-white/75">{language === "ar" ? "الموردون والمستحقات" : "Fournisseurs & Dettes Achats"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75">
{b2bSuppliers.length}
{" fournisseurs"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(metrics.totalSupplierDebt)}</div>
<div className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 mt-0.5">
<Clock size={13} className="text-amber-500" />
<span>Dettes fournisseurs exigibles sous 30/60j</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">
{language === "ar" ? "إجمالي الديون التجارية للعملاء" : "Encours B2B & Risque Crédit"}
</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
{metrics.creditUtilization.toFixed(0)}
% Plafond
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(metrics.totalClientDebt)}</div>
<div className="flex items-center justify-between text-[11px] text-white/75 mt-0.5">
<span>
{metrics.overLimitClients > 0 ? /* @__PURE__ */ <span className="text-[#FB923C] font-semibold">
{metrics.overLimitClients}
{" dépassement(s) de plafond"}
</span> : /* @__PURE__ */ <span className="text-emerald-400">Tous les encours dans les limites</span>}
</span>
<span className="font-mono text-white/80">Total B2B</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Users size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-black dark:text-white">
{mode === "clients" ? t("trading_directory_clients_title", "Portefeuille Clients") : t("trading_directory_suppliers_title", "Fournisseurs Référencés")}
</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-[#d4522f]/10 text-[#d4522f] font-semibold font-mono">{mode === "clients" ? filteredClients.length : filteredSuppliers.length}</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
<div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
<button type="button" onClick={() => {
											setMode("clients");
											setSelectedEntity(null);
											setSelectedEntityIds(/* @__PURE__ */ new Set());
										}} title={`${t("trading_directory_tab_clients", "Clients B2B")} (${b2bClients.length})`} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === "clients" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "العملاء" : language === "fr" ? "Clients" : "Clients"}</button>
<button type="button" onClick={() => {
											setMode("suppliers");
											setSelectedEntity(null);
											setSelectedEntityIds(/* @__PURE__ */ new Set());
										}} title={`${t("trading_directory_tab_suppliers", "Fournisseurs Référencés")} (${b2bSuppliers.length})`} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === "suppliers" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "الموردون" : language === "fr" ? "Fournisseurs" : "Suppliers"}</button>
</div>
<div className="self-end sm:self-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث باسم الشركة، المسؤول، NIF..." : "Rechercher raison sociale, contact, NIF..."} shutSize={36} openWidth={280} />
</div>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
<div className={`w-full ${selectedEntity ? "lg:col-span-2" : "lg:col-span-3"}`}>
{mode === "clients" ? /* @__PURE__ */ <UniversalDataCollection items={filteredClients} keyExtractor={(c) => c.id} columns={clientColumns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} selectedIds={selectedEntityIds} onSelectionChange={setSelectedEntityIds} bulkSecondaryAction={{
										label: language === "ar" ? "تصدير الشركاء" : "Exporter Partenaires",
										icon: /* @__PURE__ */ <Download size={14} />,
										onClick: (ids: any) => {
											showToast(language === "ar" ? `تم تصدير ${ids.size} شركاء بنجاح` : `${ids.size} partenaires exportés en CSV`);
										}
									}} onBulkDelete={(ids) => {
										ids.forEach((id) => deleteB2bClient(id));
										setSelectedEntityIds(/* @__PURE__ */ new Set());
										if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
										showToast(language === "ar" ? "تم حذف الشركاء المحددين" : "Partenaires sélectionnés supprimés");
									}} onItemClick={(c) => setSelectedEntity(c)} onViewDetails={(c) => setSelectedEntity(c)} onEdit={(c) => {
										setEditingEntity(c);
										setEntityModalOpen(true);
									}} onDelete={(c) => setDeleteTarget(c)} customActions={(c) => [{
										id: "doc",
										label: language === "ar" ? "إنشاء مستند" : "Nouveau Document",
										icon: /* @__PURE__ */ <FileText size={13} />,
										variant: "primary",
										onClick: () => {
											setSelectedEntity(c);
											setComposerOpen(true);
										}
									}]} renderCard={(c) => {
										const isOverLimit = (c.outstandingBalance || 0) > (c.creditLimit || 0);
										return /* @__PURE__ */ <div className="flex flex-col justify-between w-full h-full">
<div>
<div className="flex items-start justify-between mb-3">
<div className="w-12 h-12 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-base shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">{c.companyName.charAt(0).toUpperCase()}</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 truncate max-w-[150px]">{c.sector || "Entreprise B2B"}</span>
</div>
<h3 className="font-bold text-base text-black dark:text-white line-clamp-1 mb-0.5">{c.companyName}</h3>
<div className="text-[11px] font-mono text-black/55 dark:text-white/55 mb-3">
{"NIF: "}
{c.nif || "Non renseigné"}
{" "}
{c.city ? `· ${c.city}` : ""}
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Encours Dû :</span>
<span className={`font-mono font-bold tabular-nums ${isOverLimit ? "text-rose-600" : "text-[#d4522f]"}`}>{formatMoney(c.outstandingBalance || 0)}</span>
</div>
<div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
<span>Plafond Autorisé :</span>
<span className="font-mono tabular-nums">{formatMoney(c.creditLimit || 0)}</span>
</div>
</div>
</div>
<div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
<span className="text-black/70 dark:text-white/75 truncate max-w-[160px] font-medium">{c.contactName || c.phone || "Contact Direct"}</span>
<button type="button" onClick={(e) => {
														e.stopPropagation();
														setSelectedEntity(c);
														setComposerOpen(true);
													}} className="px-2.5 py-1 rounded-lg bg-[#d4522f]/10 hover:bg-[#d4522f]/20 text-[#d4522f] text-[11px] font-bold transition-colors cursor-pointer">+ Facture/BL</button>
</div>
</div>;
									}} emptyTitle={language === "ar" ? "لم يتم العثور على عملاء تجاريين" : "Aucun client B2B trouvé"} emptyDescription={language === "ar" ? "أضف أول عميل تجاري بالضغط على زر عميل تجاري جديد أعلاه." : "Ajoutez votre premier client commercial en cliquant sur Nouveau Client B2B."} /> : /* @__PURE__ */ <UniversalDataCollection items={filteredSuppliers} keyExtractor={(s) => s.id} columns={supplierColumns} selectedIds={selectedEntityIds} onSelectionChange={setSelectedEntityIds} bulkSecondaryAction={{
										label: language === "ar" ? "تصدير الموردين" : "Exporter Fournisseurs",
										icon: /* @__PURE__ */ <Download size={14} />,
										onClick: (ids: any) => {
											showToast(language === "ar" ? `تم تصدير ${ids.size} موردين بنجاح` : `${ids.size} fournisseurs exportés en CSV`);
										}
									}} onBulkDelete={(ids) => {
										ids.forEach((id) => deleteB2bSupplier(id));
										setSelectedEntityIds(/* @__PURE__ */ new Set());
										if (selectedEntity && ids.has(selectedEntity.id)) setSelectedEntity(null);
										showToast(language === "ar" ? "تم حذف الموردين المحددين" : "Fournisseurs sélectionnés supprimés");
									}} onItemClick={(s) => setSelectedEntity(s)} onViewDetails={(s) => setSelectedEntity(s)} onEdit={(s) => {
										setEditingEntity(s);
										setEntityModalOpen(true);
									}} onDelete={(s) => setDeleteTarget(s)} customActions={(s) => [{
										id: "doc",
										label: language === "ar" ? "أمر شراء" : "Bon de Commande",
										icon: /* @__PURE__ */ <FileText size={13} />,
										variant: "primary",
										onClick: () => {
											setSelectedEntity(s);
											setComposerOpen(true);
										}
									}]} renderCard={(s) => /* @__PURE__ */ <div className="flex flex-col justify-between w-full h-full">
<div>
<div className="flex items-start justify-between mb-3">
<div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-base shrink-0 border border-neutral-200 dark:border-neutral-700 shadow-2xs">{s.supplierName.charAt(0).toUpperCase()}</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 truncate max-w-[150px]">{s.sector || "Fournisseur Agréé"}</span>
</div>
<h3 className="font-bold text-base text-black dark:text-white line-clamp-1 mb-0.5">{s.supplierName}</h3>
<div className="text-[11px] font-mono text-black/55 dark:text-white/55 mb-3">
{"NIF: "}
{s.nif || "Non renseigné"}
{" "}
{s.city ? `· ${s.city}` : ""}
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Dettes Achats Exigibles :</span>
<span className="font-mono font-bold text-amber-600 tabular-nums">{formatMoney(s.outstandingPayable || 0)}</span>
</div>
<div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
<span>Modalités :</span>
<span>
{s.paymentTermsDays || 30}
{" jours fin de mois"}
</span>
</div>
</div>
</div>
<div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
<span className="text-black/70 dark:text-white/75 truncate max-w-[160px] font-medium">{s.contactName || s.phone || "Contact Commercial"}</span>
<button type="button" onClick={(e) => {
													e.stopPropagation();
													setSelectedEntity(s);
													setComposerOpen(true);
												}} className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-black dark:text-white text-[11px] font-bold transition-colors cursor-pointer">+ Bon Commande</button>
</div>
</div>} emptyTitle={language === "ar" ? "لم يتم العثور على موردين" : "Aucun fournisseur trouvé"} emptyDescription={language === "ar" ? "أضف أول مورد بالضغط على زر مورد جديد أعلاه." : "Ajoutez votre premier fournisseur en cliquant sur Nouveau Fournisseur."} />}
</div>
{selectedEntity && /* @__PURE__ */ <div className="p-5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-5 animate-in fade-in duration-150">
<div className="flex items-start justify-between">
<div>
<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#d4522f]/15 text-[#d4522f] font-bold uppercase">{mode === "clients" ? "Fiche Client B2B" : "Fiche Fournisseur"}</span>
<h3 className="text-base font-bold text-black dark:text-white mt-1.5">
{"companyName" in selectedEntity ? selectedEntity.companyName : selectedEntity.supplierName}
</h3>
<p className="text-xs text-black/55 dark:text-white/55">{selectedEntity.sector}</p>
</div>
<button onClick={() => setSelectedEntity(null)} className="p-1.5 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"><X size={16} /></button>
</div>
<div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/60 text-xs font-mono space-y-1.5">
<span className="font-bold font-sans text-[11px] text-black/70 dark:text-white/75 block uppercase">Identifiants Fiscaux Certifiés</span>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">N.I.F. (15 ch) :</span>
<span className="font-bold text-black dark:text-white">{selectedEntity.nif || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">R.C. N° :</span>
<span className="text-black dark:text-white">{selectedEntity.rc || "Non renseigné"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Art. Imposition :</span>
<span className="text-black dark:text-white">{selectedEntity.ai || "Non renseigné"}</span>
</div>
</div>
<div className="space-y-2 text-xs">
<span className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 text-[10px] block">Contact Direct</span>
<div className="flex items-center gap-2 text-black dark:text-white">
<span className="font-semibold">{selectedEntity.contactName || "Standard"}</span>
{selectedEntity && "contactRole" in selectedEntity && /* @__PURE__ */ <span className="text-black/55 dark:text-white/55">
(
{selectedEntity.contactRole}
)
</span>}
</div>
<div className="flex items-center gap-2 text-black/70 dark:text-white/75 font-mono text-[11px]">
<Phone size={13} className="text-[#d4522f]" />
<span>{selectedEntity.phone || "Non renseigné"}</span>
</div>
</div>
{mode === "clients" && /* @__PURE__ */ <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
<span className="font-bold font-sans text-[11px] text-black/70 dark:text-white/75 block uppercase">Encours & Conditions Commerciales</span>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Encours Actuel :</span>
<span className="font-bold text-rose-600">{formatMoney(selectedEntity.outstandingBalance || 0)}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Plafond Autorisé :</span>
<span className="text-black dark:text-white">{formatMoney(selectedEntity.creditLimit || 0)}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Délai Règlement :</span>
<span className="text-black dark:text-white">
{selectedEntity.paymentTermsDays}
{" jours"}
</span>
</div>
</div>}
{mode === "clients" && /* @__PURE__ */ <div className="space-y-2 text-xs">
<div className="flex items-center justify-between">
<span className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 text-[10px]">
Historique Pièces (
{entityHistory.length}
)
</span>
<button onClick={() => {
													setComposerOpen(true);
												}} className="text-[11px] font-semibold text-[#d4522f] hover:underline">+ Créer document</button>
</div>
<div className="space-y-1.5 max-h-48 overflow-y-auto">
{entityHistory.map((d) => /* @__PURE__ */ <div key={d.id} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px]">
<span className="font-mono font-bold text-black dark:text-white">{d.docNumber}</span>
<span className="font-mono font-bold text-[#d4522f]">{formatMoney(d.netToPay)}</span>
</div>)}
{entityHistory.length === 0 && /* @__PURE__ */ <p className="text-black/55 dark:text-white/55 text-[11px] italic">Aucune transaction pour ce client.</p>}
</div>
</div>}
</div>}
</div>
</div>
</div>
<B2bEntityModal isOpen={entityModalOpen} onClose={() => setEntityModalOpen(false)} entityType={mode === "clients" ? "client" : "supplier"} editingEntity={editingEntity} />
<CommercialDocComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} />
<ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => {
					if (deleteTarget) {
						if (mode === "clients") deleteB2bClient(deleteTarget.id);
						else deleteB2bSupplier(deleteTarget.id);
						setDeleteTarget(null);
						setSelectedEntity(null);
					}
				}} title="Supprimer la fiche partenaire ?" description={`Êtes-vous certain de vouloir supprimer cette fiche ? Cette action retirera les coordonnées associées.`} confirmLabel="Supprimer définitivement" variant="danger" />
</div>;
};
