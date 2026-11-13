import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Edit,
  Trash2,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  AlertCircle,
  Eye,
  Home,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Receipt,
  Boxes,
  Download,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { CommercialDocument, CommercialDocType } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';


export const TradingSalesView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { commercialDocs, deleteCommercialDoc, convertCommercialDoc, warehouses, currentBranch, branches, switchBranch, resetTradingMockData, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout, showToast } = useAtriumStore();
	const [selectedDocIds, setSelectedDocIds] = React.useState(/* @__PURE__ */ new Set());
	const [activeTab, setActiveTab] = React.useState("all");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [composerOpen, setComposerOpen] = React.useState(false);
	const [composerType, setComposerType] = React.useState("devis");
	const [editingDoc, setEditingDoc] = React.useState<any>(null);
	const [printDoc, setPrintDoc] = React.useState<any>(null);
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
	const metrics = React.useMemo(() => {
		const invoices = commercialDocs.filter((d) => d.type === "facture");
		const totalInvoicedHt = invoices.reduce((sum, d) => sum + (d.totalHtFinal || 0), 0);
		const unpaidInvoices = invoices.filter((d) => d.status !== "Paid");
		const totalUnpaidAmount = unpaidInvoices.reduce((sum, d) => sum + (d.netToPay || 0), 0);
		const blDocs = commercialDocs.filter((d) => d.type === "bl");
		const unbilledBls = blDocs.filter((d) => d.status === "Delivered");
		const unbilledBlAmount = unbilledBls.reduce((sum, d) => sum + (d.netToPay || 0), 0);
		const devisDocs = commercialDocs.filter((d) => d.type === "devis");
		const totalDevisAmount = devisDocs.reduce((sum, d) => sum + (d.netToPay || 0), 0);
		const recoveryRate = invoices.length > 0 ? (invoices.length - unpaidInvoices.length) / invoices.length * 100 : 100;
		return {
			totalInvoicedHt,
			invoicesCount: invoices.length,
			unpaidInvoicesCount: unpaidInvoices.length,
			totalUnpaidAmount,
			blCount: blDocs.length,
			unbilledBlCount: unbilledBls.length,
			unbilledBlAmount,
			devisCount: devisDocs.length,
			totalDevisAmount,
			recoveryRate
		};
	}, [commercialDocs]);
	const filteredDocs = React.useMemo(() => {
		return commercialDocs.filter((doc) => {
			if (activeTab !== "all" && doc.type !== activeTab) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesNum = doc.docNumber.toLowerCase().includes(q);
				const matchesClient = doc.clientName.toLowerCase().includes(q);
				const matchesNif = (doc.clientNif || "").toLowerCase().includes(q);
				if (!matchesNum && !matchesClient && !matchesNif) return false;
			}
			return true;
		});
	}, [
		commercialDocs,
		activeTab,
		searchQuery
	]);
	const tabCounts = React.useMemo(() => {
		return {
			all: commercialDocs.length,
			devis: commercialDocs.filter((d) => d.type === "devis").length,
			commande: commercialDocs.filter((d) => d.type === "commande").length,
			bl: commercialDocs.filter((d) => d.type === "bl").length,
			facture: commercialDocs.filter((d) => d.type === "facture").length,
			avoir: commercialDocs.filter((d) => d.type === "avoir").length
		};
	}, [commercialDocs]);
	const handleCreateNew = (type: any) => {
		setEditingDoc(null);
		setComposerType(type);
		setComposerOpen(true);
	};
	const handleEdit = (doc: any) => {
		setEditingDoc(doc);
		setComposerType(doc.type);
		setComposerOpen(true);
	};
	const handleConvert = (doc: any) => {
		if (doc.type === "devis") convertCommercialDoc(doc.id, "bl");
		else if (doc.type === "bl") convertCommercialDoc(doc.id, "facture");
	};
	const columns = [
		{
			key: "docNumber",
			header: t("trading_sales_col_doc_num", "N° Document"),
			width: "180px",
			renderCell: (doc: any) => {
				const typeBadge = doc.type === "facture" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" : doc.type === "bl" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400" : doc.type === "devis" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400" : doc.type === "commande" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400";
				return /* @__PURE__ */ <div className="flex items-center gap-2">
<span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${typeBadge}`}>{doc.type.slice(0, 3)}</span>
<span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">{doc.docNumber}</span>
</div>;
			}
		},
		{
			key: "date",
			header: t("trading_sales_col_date_due", "Date & Échéance"),
			width: "130px",
			renderCell: (doc: any) => /* @__PURE__ */ <div className="text-xs font-mono">
<div className="text-neutral-800 dark:text-neutral-200">{doc.date}</div>
{doc.dueDate && /* @__PURE__ */ <div className="text-[10px] text-neutral-400">
{"Éch: "}
{doc.dueDate}
</div>}
</div>
		},
		{
			key: "client",
			header: t("trading_sales_col_client", "Client Destinataire"),
			minWidth: "220px",
			renderCell: (doc: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-neutral-900 dark:text-neutral-100 block">{doc.clientName}</span>
<span className="text-[10px] text-neutral-400 font-mono">
{"NIF: "}
{doc.clientNif || "Non renseigné"}
</span>
</div>
		},
		{
			key: "ht",
			header: t("trading_sales_col_total_ht", "Total H.T."),
			width: "140px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">{formatMoney(doc.totalHtFinal || doc.totalHtRaw || 0)}</span>
		},
		{
			key: "netToPay",
			header: t("trading_sales_col_net_to_pay", "Net à Payer (TTC)"),
			width: "150px",
			renderCell: (doc: any) => /* @__PURE__ */ <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white tabular-nums">{formatMoney(doc.netToPay)}</span>
		},
		{
			key: "status",
			header: t("trading_sales_col_status", "Statut"),
			width: "130px",
			renderCell: (doc: any) => {
				const isPaid = doc.status === "Paid";
				const isDelivered = doc.status === "Delivered";
				const isValidated = doc.status === "Validated";
				return /* @__PURE__ */ <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : isDelivered ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : isValidated ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}>{doc.status}</span>;
			}
		},
		{
			key: "actions",
			header: "",
			width: "150px",
			renderCell: (doc: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1">
<button onClick={(e) => {
							e.stopPropagation();
							setPrintDoc(doc);
						}} title={t("action_print", "Imprimer")} className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><Printer size={14} /></button>
<button onClick={(e) => {
							e.stopPropagation();
							handleEdit(doc);
						}} title={t("action_edit", "Modifier")} className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><Edit size={14} /></button>
{doc.type === "devis" && /* @__PURE__ */ <button onClick={(e) => {
							e.stopPropagation();
							handleConvert(doc);
						}} title={t("trading_sales_convert_to_bl", "Convertir en Bon de Livraison")} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer">BL →</button>}
{doc.type === "bl" && doc.status === "Delivered" && /* @__PURE__ */ <button onClick={(e) => {
							e.stopPropagation();
							handleConvert(doc);
						}} title={t("trading_sales_convert_to_invoice", "Facturer ce bon de livraison")} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer">{language === "ar" ? "فوترة ←" : "Facturer →"}</button>}
<button onClick={(e) => {
							e.stopPropagation();
							setDeleteTarget(doc);
						}} title={t("action_delete", "Supprimer")} className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"><Trash2 size={14} /></button>
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
				width: "1.5*",
				minWidth: "120px"
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
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><FileText size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("trading_sales_title", "Cycle des Ventes & Facturation B2B")}</h1>
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d4522f]/15 text-[#d4522f] border border-[#d4522f]/30">
{commercialDocs.length}
{" "}
{language === "ar" ? "معاملة" : "pièces"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="outline" size="sm" onClick={() => handleCreateNew("devis")} icon={<Plus size={14} className="text-[#d4522f]" />}>{t("trading_sales_new_devis", "Nouveau Devis")}</AtriumButton>
<AtriumButton variant="outline" size="sm" onClick={() => handleCreateNew("bl")} icon={<Truck size={14} className="text-[#d4522f]" />}>{t("trading_sales_new_bl", "Nouveau BL")}</AtriumButton>
<AtriumButton variant="primary" size="sm" onClick={() => handleCreateNew("facture")} icon={<Plus size={15} />}>{t("trading_sales_new_invoice", "Nouvelle Facture")}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{language === "ar" ? "إجمالي المبيعات المفوترة HT" : "Facturation Nette H.T."}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{metrics.invoicesCount}
{" factures"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{formatMoney(metrics.totalInvoicedHt)}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
<CheckCircle2 size={13} className="text-emerald-500" />
<span>
{"Taux de recouvrement: "}
<strong className="font-mono text-neutral-800 dark:text-neutral-200">
{metrics.recoveryRate.toFixed(0)}
%
</strong>
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{language === "ar" ? "سندات التسليم غير المفوترة" : "BLs Livrés Non Facturés"}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
{metrics.unbilledBlCount}
{" en attente"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{formatMoney(metrics.unbilledBlAmount)}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
<Truck size={13} className="text-blue-500" />
<span>Convertibles en factures groupées</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">
{language === "ar" ? "الفواتير المستحقة غير المسددة" : "Créances Clients Exigibles"}
</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
{metrics.unpaidInvoicesCount}
{" en attente"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">{formatMoney(metrics.totalUnpaidAmount)}</div>
<div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
<span className="flex items-center gap-1">
<Clock size={12} className="text-[#FB923C]" />
<span>Échéances commerciales ouvertes</span>
</span>
<span className="font-mono text-stone-300">TTC</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><FileText size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-neutral-900 dark:text-white">{t("trading_sales_docs_register", "Registre des Ventes")}</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-[#d4522f]/10 text-[#d4522f] font-semibold font-mono">{filteredDocs.length}</span>
</div>
</div>
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
<LiveSegmentedControl size="sm" value={activeTab} onValueChange={(val) => setActiveTab(val)} options={[
										{
											value: "all",
											label: t("trading_doc_all", "Toutes les Pièces"),
											count: tabCounts.all
										},
										{
											value: "devis",
											label: t("trading_doc_devis", "Devis"),
											count: tabCounts.devis
										},
										{
											value: "commande",
											label: t("trading_doc_commande", "Commandes"),
											count: tabCounts.commande
										},
										{
											value: "bl",
											label: t("trading_doc_bl", "Livraisons (BL)"),
											count: tabCounts.bl
										},
										{
											value: "facture",
											label: t("trading_doc_facture", "Factures Fiscales"),
											count: tabCounts.facture
										},
										{
											value: "avoir",
											label: t("trading_doc_avoir", "Avoirs"),
											count: tabCounts.avoir
										}
									]} />
<div className="self-end sm:self-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("trading_sales_search_placeholder", "Filtrer N° doc, client, NIF...")} shutSize={36} openWidth={280} />
</div>
</div>
</div>
<div className="w-full">
<UniversalDataCollection items={filteredDocs} keyExtractor={(d) => d.id} columns={columns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} selectedIds={selectedDocIds} onSelectionChange={setSelectedDocIds} bulkSecondaryAction={{
									label: language === "ar" ? "تصدير المستندات" : "Exporter Pièces",
									icon: /* @__PURE__ */ <Download size={13} />,
									onClick: (ids: any) => {
										showToast?.({
											type: "info",
											title: "Export commercial",
											message: `${ids.size} pièces sélectionnées pour l'export.`
										});
									},
									variant: "primary"
								}} onBulkDelete={(ids) => {
									ids.forEach((id) => deleteCommercialDoc(id));
									showToast?.({
										type: "info",
										title: "Pièces commerciales supprimées",
										message: `${ids.size} documents retirés.`
									});
								}} renderCard={(doc) => /* @__PURE__ */ <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2">
<div className="flex items-center justify-between">
<span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">{doc.docNumber}</span>
<span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#d4522f]/10 text-[#d4522f]">{doc.type.toUpperCase()}</span>
</div>
<p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{doc.clientName}</p>
<div className="flex justify-between text-xs font-mono pt-2 border-t border-neutral-100 dark:border-neutral-700">
<span className="text-neutral-500">
{t("trading_sales_col_net_to_pay", "Net")}
{" :"}
</span>
<span className="font-bold text-[#d4522f]">{formatMoney(doc.netToPay)}</span>
</div>
</div>} emptyTitle={language === "ar" ? "لا توجد معاملات مسجلة" : "Aucun document commercial trouvé"} emptyDescription={language === "ar" ? "أنشئ أول عرض أسعار، وصل تسليم أو فاتورة تجارية بالنقر على الأزرار أعلاه." : "Créez votre premier devis, bon de livraison ou facture fiscale en cliquant sur les boutons ci-dessus."} />
</div>
</div>
</div>
<CommercialDocComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} initialType={composerType} editingDoc={editingDoc} />
<CommercialDocPrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} document={printDoc} />
<ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => {
					if (deleteTarget) {
						deleteCommercialDoc(deleteTarget.id);
						setDeleteTarget(null);
					}
				}} title={t("trading_sales_delete_title", "Supprimer la pièce commerciale ?")} description={language === "ar" ? `هل أنت متأكد من حذف المستند ${deleteTarget?.docNumber} (${deleteTarget?.clientName})؟ هذا الإجراء لا يمكن التراجع عنه.` : `Êtes-vous certain de vouloir supprimer le document ${deleteTarget?.docNumber} (${deleteTarget?.clientName}) ? Cette opération est irréversible.`} confirmLabel={t("action_delete", "Supprimer définitivement")} variant="danger" />
</div>;
};
