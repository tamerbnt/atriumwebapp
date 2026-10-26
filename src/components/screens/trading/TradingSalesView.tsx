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

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';

export const TradingSalesView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    commercialDocs,
    deleteCommercialDoc,
    convertCommercialDoc,
    warehouses,
    currentBranch,
    branches,
    switchBranch,
    resetTradingMockData,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommercialDocType>('devis');
  const [editingDoc, setEditingDoc] = useState<CommercialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Deletion confirm
  const [deleteTarget, setDeleteTarget] = useState<CommercialDocument | null>(null);

  // Metrics
  const metrics = useMemo(() => {
    const invoices = commercialDocs.filter((d) => d.type === 'facture');
    const totalInvoicedHt = invoices.reduce((sum, d) => sum + (d.totalHtFinal || 0), 0);
    const unpaidInvoices = invoices.filter((d) => d.status !== 'Paid');
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    const blDocs = commercialDocs.filter((d) => d.type === 'bl');
    const unbilledBls = blDocs.filter((d) => d.status === 'Delivered');
    const unbilledBlAmount = unbilledBls.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    const devisDocs = commercialDocs.filter((d) => d.type === 'devis');
    const totalDevisAmount = devisDocs.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    const recoveryRate = invoices.length > 0
      ? (((invoices.length - unpaidInvoices.length) / invoices.length) * 100)
      : 100;

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
      recoveryRate,
    };
  }, [commercialDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return commercialDocs.filter((doc) => {
      // Tab filter
      if (activeTab !== 'all' && doc.type !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = doc.docNumber.toLowerCase().includes(q);
        const matchesClient = doc.clientName.toLowerCase().includes(q);
        const matchesNif = (doc.clientNif || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesClient && !matchesNif) return false;
      }
      return true;
    });
  }, [commercialDocs, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: commercialDocs.length,
      devis: commercialDocs.filter((d) => d.type === 'devis').length,
      commande: commercialDocs.filter((d) => d.type === 'commande').length,
      bl: commercialDocs.filter((d) => d.type === 'bl').length,
      facture: commercialDocs.filter((d) => d.type === 'facture').length,
      avoir: commercialDocs.filter((d) => d.type === 'avoir').length,
    };
  }, [commercialDocs]);

  const handleCreateNew = (type: CommercialDocType) => {
    setEditingDoc(null);
    setComposerType(type);
    setComposerOpen(true);
  };

  const handleEdit = (doc: CommercialDocument) => {
    setEditingDoc(doc);
    setComposerType(doc.type);
    setComposerOpen(true);
  };

  const handleConvert = (doc: CommercialDocument) => {
    if (doc.type === 'devis') {
      convertCommercialDoc(doc.id, 'bl');
    } else if (doc.type === 'bl') {
      convertCommercialDoc(doc.id, 'facture');
    }
  };

  // Columns for UniversalDataCollection
  const columns: ColumnDefinition<CommercialDocument>[] = [
    {
      key: 'docNumber',
      header: t('trading_sales_col_doc_num', 'N° Document'),
      width: '180px',
      renderCell: (doc) => {
        const typeBadge =
          doc.type === 'facture'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
            : doc.type === 'bl'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            : doc.type === 'devis'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
            : doc.type === 'commande'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400';

        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${typeBadge}`}>
              {doc.type.slice(0, 3)}
            </span>
            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {doc.docNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: t('trading_sales_col_date_due', 'Date & Échéance'),
      width: '130px',
      renderCell: (doc) => (
        <div className="text-xs font-mono">
          <div className="text-neutral-800 dark:text-neutral-200">{doc.date}</div>
          {doc.dueDate && (
            <div className="text-[10px] text-neutral-400">Éch: {doc.dueDate}</div>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      header: t('trading_sales_col_client', 'Client Destinataire'),
      minWidth: '220px',
      renderCell: (doc) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {doc.clientName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            NIF: {doc.clientNif || 'Non renseigné'}
          </span>
        </div>
      ),
    },
    {
      key: 'ht',
      header: t('trading_sales_col_total_ht', 'Total H.T.'),
      width: '140px',
      renderCell: (doc) => (
        <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
          {formatMoney(doc.totalHtFinal || doc.totalHtRaw || 0)}
        </span>
      ),
    },
    {
      key: 'netToPay',
      header: t('trading_sales_col_net_to_pay', 'Net à Payer (TTC)'),
      width: '150px',
      renderCell: (doc) => (
        <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(doc.netToPay)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('trading_sales_col_status', 'Statut'),
      width: '130px',
      renderCell: (doc) => {
        const isPaid = doc.status === 'Paid';
        const isDelivered = doc.status === 'Delivered';
        const isValidated = doc.status === 'Validated';

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : isDelivered
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : isValidated
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {doc.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '150px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPrintDoc(doc);
            }}
            title={t('action_print', 'Imprimer')}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Printer size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(doc);
            }}
            title={t('action_edit', 'Modifier')}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Edit size={14} />
          </button>

          {doc.type === 'devis' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConvert(doc);
              }}
              title={t('trading_sales_convert_to_bl', 'Convertir en Bon de Livraison')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors cursor-pointer"
            >
              BL &rarr;
            </button>
          )}

          {doc.type === 'bl' && doc.status === 'Delivered' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConvert(doc);
              }}
              title={t('trading_sales_convert_to_invoice', 'Facturer ce bon de livraison')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'فوترة ←' : 'Facturer →'}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(doc);
            }}
            title={t('action_delete', 'Supprimer')}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_sales_title', 'Cycle des Ventes & Facturation B2B')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {commercialDocs.length} {language === 'ar' ? 'معاملة' : 'pièces'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_sales_subtitle', 'Flux commercial complet certifié : Devis → Bon de Commande → Bon de Livraison → Facture Fiscale → Avoir')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Dépôt Central'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'المستودعات والفروع' : 'Dépôts & Points de Vente'}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left rtl:text-right text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      {b.id === currentBranch?.id && <span className="text-[#C4785A] text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Data Reset */}
            <button
              type="button"
              onClick={() => resetTradingMockData && resetTradingMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Réinitialiser les données B2B de test"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo B2B'}</span>
            </button>

            {/* Quick Creation Buttons */}
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew('devis')}
              icon={<Plus size={14} className="text-[#C4785A]" />}
            >
              {t('trading_sales_new_devis', 'Nouveau Devis')}
            </AtriumButton>

            <AtriumButton
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew('bl')}
              icon={<Truck size={14} className="text-[#C4785A]" />}
            >
              {t('trading_sales_new_bl', 'Nouveau BL')}
            </AtriumButton>

            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => handleCreateNew('facture')}
              icon={<Plus size={15} />}
            >
              {t('trading_sales_new_invoice', 'Nouvelle Facture')}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Facturé HT Global */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'إجمالي المبيعات المفوترة HT' : 'Facturation Nette H.T.'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {metrics.invoicesCount} factures
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(metrics.totalInvoicedHt)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Taux de recouvrement: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{metrics.recoveryRate.toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Bons de Livraison en Transit / Non Facturés */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'سندات التسليم غير المفوترة' : 'BLs Livrés Non Facturés'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {metrics.unbilledBlCount} en attente
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(metrics.unbilledBlAmount)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  <Truck size={13} className="text-blue-500" />
                  <span>Convertibles en factures groupées</span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'الفواتير المستحقة غير المسددة' : 'Créances Clients Exigibles'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  {metrics.unpaidInvoicesCount} en attente
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(metrics.totalUnpaidAmount)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-[#FB923C]" />
                    <span>Échéances commerciales ouvertes</span>
                  </span>
                  <span className="font-mono text-stone-300">TTC</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar: Left Anchor + Controls Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Title / Icon / Count Anchor */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <FileText size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t('trading_sales_docs_register', 'Registre des Ventes')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold font-mono">
                  {filteredDocs.length}
                </span>
              </div>
            </div>

            {/* Controls Bar: Segment Tabs + Seek Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Segment Capsules */}
              <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl overflow-x-auto self-start">
                {(
                  [
                    { key: 'all', label: t('trading_doc_all', 'Toutes les Pièces'), count: tabCounts.all },
                    { key: 'devis', label: t('trading_doc_devis', 'Devis'), count: tabCounts.devis },
                    { key: 'commande', label: t('trading_doc_commande', 'Commandes'), count: tabCounts.commande },
                    { key: 'bl', label: t('trading_doc_bl', 'Livraisons (BL)'), count: tabCounts.bl },
                    { key: 'facture', label: t('trading_doc_facture', 'Factures Fiscales'), count: tabCounts.facture },
                    { key: 'avoir', label: t('trading_doc_avoir', 'Avoirs'), count: tabCounts.avoir },
                  ] as const
                ).map((tab) => {
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? 'bg-[#C4785A] text-white'
                            : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Seek Search */}
              <div className="self-end sm:self-auto">
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('trading_sales_search_placeholder', 'Filtrer N° doc, client, NIF...')}
                  shutSize={36}
                  openWidth={280}
                />
              </div>
            </div>
          </div>

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            <UniversalDataCollection
              items={filteredDocs}
              keyExtractor={(d) => d.id}
              columns={columns}
              renderCard={(doc) => (
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      {doc.docNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#C4785A]/10 text-[#C4785A]">
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {doc.clientName}
                  </p>
                  <div className="flex justify-between text-xs font-mono pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <span className="text-neutral-500">{t('trading_sales_col_net_to_pay', 'Net')} :</span>
                    <span className="font-bold text-[#C4785A]">{formatMoney(doc.netToPay)}</span>
                  </div>
                </div>
              )}
              emptyTitle={language === 'ar' ? 'لا توجد معاملات مسجلة' : 'Aucun document commercial trouvé'}
              emptyDescription={
                language === 'ar'
                  ? 'أنشئ أول عرض أسعار، وصل تسليم أو فاتورة تجارية بالنقر على الأزرار أعلاه.'
                  : 'Créez votre premier devis, bon de livraison ou facture fiscale en cliquant sur les boutons ci-dessus.'
              }
            />
          </div>

        </div>

      </div>

      {/* Modals */}
      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialType={composerType}
        editingDoc={editingDoc}
      />

      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCommercialDoc(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={t('trading_sales_delete_title', 'Supprimer la pièce commerciale ?')}
        description={
          language === 'ar'
            ? `هل أنت متأكد من حذف المستند ${deleteTarget?.docNumber} (${deleteTarget?.clientName})؟ هذا الإجراء لا يمكن التراجع عنه.`
            : `Êtes-vous certain de vouloir supprimer le document ${deleteTarget?.docNumber} (${deleteTarget?.clientName}) ? Cette opération est irréversible.`
        }
        confirmLabel={t('action_delete', 'Supprimer définitivement')}
        variant="danger"
      />
    </div>
  );
};
