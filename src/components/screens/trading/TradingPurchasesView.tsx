import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Boxes,
  Clock,
  Printer,
  X,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { PurchaseDocument, CommercialDocument } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

type PurchaseTab = 'all' | 'po' | 'br' | 'facture_fournisseur';
type StatusFilter = 'all' | 'Ordered' | 'Received';

export const TradingPurchasesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    purchaseDocs,
    b2bSuppliers,
    warehouses,
    products,
    createPurchaseDoc,
    receivePurchaseDoc,
    currentBusiness,
    currentBranchId,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<PurchaseTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [inspectingDoc, setInspectingDoc] = useState<PurchaseDocument | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [supplierId, setSupplierId] = useState(b2bSuppliers[0]?.id || '');
  const [depotId, setDepotId] = useState(warehouses[0]?.id || 'depot_01');
  const [deliveryExpectedDate, setDeliveryExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([
    {
      id: 'po_it_1',
      productId: products[0]?.id || '',
      description: products[0]?.name || '',
      orderedQty: 10,
      receivedQty: 0,
      unit: products[0]?.unit || 'pcs',
      unitCostHt: products[0]?.cost?.amount || 1000,
      tvaPercent: 19,
      totalHt: (products[0]?.cost?.amount || 1000) * 10,
    },
  ]);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const commercialDocFromPurchase = useCallback(
    (p: PurchaseDocument): CommercialDocument => ({
      id: p.id,
      type: p.type === 'po' ? 'commande' : 'bl',
      docNumber: p.docNumber,
      clientId: p.supplierId,
      clientName: p.supplierName,
      depotId: p.depotId,
      depotName: p.depotName,
      date: p.orderDate,
      dueDate: p.deliveryExpectedDate,
      paymentMethod: 'Virement bancaire',
      paymentTerms: '30 jours',
      status: p.status === 'Received' ? 'Delivered' : 'Validated',
      items: p.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        description: it.description,
        isService: false,
        quantity: it.orderedQty,
        unit: it.unit,
        unitPriceHt: it.unitCostHt,
        tvaPercent: it.tvaPercent,
        totalHt: it.totalHt,
        totalTtc: it.totalHt * (1 + it.tvaPercent / 100),
      })),
      totalHtRaw: p.totalHt,
      generalDiscountPercent: 0,
      totalHtFinal: p.totalHt,
      totalTva: p.totalTva,
      timbreFiscal: 0,
      totalTtc: p.totalTtc,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionAmount: 0,
      netToPay: p.totalTtc,
      currency: p.currency,
      notesTop: p.notes,
      includeStampSignature: true,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tenantId: p.tenantId,
      facilityId: p.facilityId,
    }),
    []
  );

  const metrics = useMemo(() => {
    const totalPurchasesTtc = purchaseDocs.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const pendingPoList = purchaseDocs.filter((p) => p.type === 'po' && p.status === 'Ordered');
    const pendingPoTtc = pendingPoList.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const receivedBrList = purchaseDocs.filter((p) => p.type === 'br' || p.status === 'Received');
    const receivedBrTtc = receivedBrList.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const receivedRatio = purchaseDocs.length > 0 ? (receivedBrList.length / purchaseDocs.length) * 100 : 100;

    const branchCounts = new Map<string, number>();
    purchaseDocs.forEach((doc) => {
      const bName = resolveRecordBranch(doc, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });

    return {
      totalPurchasesTtc,
      pendingPoCount: pendingPoList.length,
      pendingPoTtc,
      receivedBrCount: receivedBrList.length,
      receivedBrTtc,
      receivedRatio,
      branchCounts,
    };
  }, [purchaseDocs, branchesById, currentBranch, language]);

  const tabCounts = useMemo(
    () => ({
      all: purchaseDocs.length,
      po: purchaseDocs.filter((p) => p.type === 'po').length,
      br: purchaseDocs.filter((p) => p.type === 'br').length,
      facture_fournisseur: purchaseDocs.filter((p) => p.type === 'facture_fournisseur').length,
    }),
    [purchaseDocs]
  );

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return purchaseDocs.filter((p) => {
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name.toLowerCase();
        if (
          !p.docNumber.toLowerCase().includes(q) &&
          !p.supplierName.toLowerCase().includes(q) &&
          !bName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [purchaseDocs, activeTab, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      const ap = pinnedIds.has(a.id);
      const bp = pinnedIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      let cmp = 0;
      if (sortBy === 'docNumber') cmp = a.docNumber.localeCompare(b.docNumber);
      else if (sortBy === 'supplier') cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortBy === 'totalTtc') cmp = (a.totalTtc || 0) - (b.totalTtc || 0);
      else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = (a.orderDate || '').localeCompare(b.orderDate || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDocs, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = b2bSuppliers.find((s) => s.id === supplierId) || b2bSuppliers[0];
    const dep = warehouses.find((w) => w.id === depotId) || warehouses[0];
    const docNumber = `PO-${new Date().getFullYear()}-${(
      purchaseDocs.filter((p) => p.type === 'po').length + 1
    )
      .toString()
      .padStart(4, '0')}`;
    const totalHt = poItems.reduce((sum, it) => sum + (it.totalHt || 0), 0);
    const totalTva = totalHt * 0.19;
    createPurchaseDoc({
      tenantId: currentBusiness?.id || 'acc_01',
      facilityId: currentBranchId || 'fac_01',
      type: 'po',
      docNumber,
      supplierId: sup?.id || 'sup_01',
      supplierName: sup?.supplierName || 'Fournisseur',
      depotId: dep?.id || 'depot_01',
      depotName: dep?.name,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryExpectedDate: deliveryExpectedDate || undefined,
      status: 'Ordered',
      items: poItems,
      totalHt,
      totalTva,
      totalTtc: totalHt + totalTva,
      currency: 'DZD',
      notes: poNotes.trim() || undefined,
    });
    setIsPoModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم إنشاء أمر الشراء' : 'Commande PO créée',
      message: `${docNumber} · ${sup?.supplierName || 'Fournisseur'}`,
    });
  };

  const handleExportCsv = useCallback(() => {
    const headers = [
      'N° Document',
      'Type',
      'Date',
      'Fournisseur',
      'Dépôt',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      'Total TTC',
      'Statut',
    ];
    const rows = sortedDocs.map((doc) => [
      doc.docNumber,
      doc.type.toUpperCase(),
      doc.orderDate,
      doc.supplierName,
      doc.depotName || 'Dépôt Central',
      resolveRecordBranch(doc, branchesById, currentBranch, language).name,
      doc.totalTtc || 0,
      doc.status,
    ]);
    downloadCsvSafe(`atrium-trading-purchases-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedDocs, isAr, isEn, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: purchaseDocs.length },
      ...Array.from(metrics.branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
      {
        id: 'status',
        label: isAr ? 'حالة الاستلام' : isEn ? 'Receipt Status' : 'Statut réception',
        value: statusFilter,
        onChange: (val) => setStatusFilter(val as StatusFilter),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'Ordered', label: isAr ? 'قيد الطلب' : isEn ? 'Ordered' : 'Commandé' },
          { value: 'Received', label: isAr ? 'مستلم' : isEn ? 'Received' : 'Réceptionné' },
        ],
      },
    ];
  }, [branchFilter, statusFilter, metrics.branchCounts, purchaseDocs.length, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `${isAr ? 'الحالة' : isEn ? 'Status' : 'Statut'}: ${statusFilter}`,
        onRemove: () => setStatusFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, statusFilter, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const columns: ColumnDefinition<PurchaseDocument>[] = useMemo(
    () => [
      {
        key: 'docNumber',
        header: t('trading_sales_col_doc_num', 'N° Document'),
        width: '180px',
        sortable: true,
        renderCell: (doc) => {
          const badgeColor =
            doc.type === 'po'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
              : doc.type === 'br'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400';
          return (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${badgeColor}`}>
                {doc.type === 'po' ? 'PO' : doc.type === 'br' ? 'BR' : 'FF'}
              </span>
              <span className="font-mono font-bold text-xs text-black dark:text-white">{doc.docNumber}</span>
            </div>
          );
        },
      },
      {
        key: 'orderDate',
        header: t('trading_purchases_col_order_delivery', 'Date Commande'),
        width: '125px',
        sortable: true,
        renderCell: (doc) => (
          <span className="text-xs font-mono text-black/70 dark:text-white/75">{doc.orderDate}</span>
        ),
      },
      {
        key: 'supplier',
        header: t('trading_purchases_col_supplier', 'Fournisseur Référencé'),
        minWidth: '200px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{doc.supplierName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              {t('trading_sales_col_depot', 'Dépôt')}: {doc.depotName || 'Dépôt Central'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        sortable: true,
        renderCell: (doc) => {
          const b = resolveRecordBranch(doc, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'totalTtc',
        header: t('trading_composer_total_ttc', 'Montant Total TTC'),
        width: '140px',
        sortable: true,
        renderCell: (doc) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(doc.totalTtc)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('trading_sales_col_status', 'Statut'),
        width: '120px',
        renderCell: (doc) => {
          const isReceived = doc.status === 'Received';
          return (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold inline-block ${
                isReceived
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {isReceived
                ? isAr
                  ? 'تم الاستلام'
                  : 'Réceptionné'
                : isAr
                ? 'قيد الطلب'
                : 'Commandé'}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        width: '175px',
        renderCell: (doc) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPrintDoc(commercialDocFromPurchase(doc));
              }}
              aria-label={t('action_print', 'Imprimer')}
              title={t('action_print', 'Imprimer')}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-[#d4522f] hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer size={14} />
            </button>
            {doc.type === 'po' && doc.status === 'Ordered' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  receivePurchaseDoc(doc.id);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>{t('trading_purchases_receive_stock', 'Réceptionner à quai')}</span>
              </button>
            )}
            {doc.type === 'br' && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {t('trading_purchases_received_badge', 'Stock incrémenté')}
              </span>
            )}
          </div>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language, commercialDocFromPurchase, receivePurchaseDoc]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: purchaseDocs.length > 0,
  });

  if (showSkeleton && (purchaseDocs.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '150px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Truck size={22} />}
        title={t('trading_purchases_title', 'Achats')}
        subtitle={`${purchaseDocs.length} ${isAr ? 'طلب واستلام' : isEn ? 'purchase documents' : 'commandes & réceptions'}`}
        primaryAction={{
          label: t('trading_purchases_new_po', 'Créer Bon de Commande Achat (PO)'),
          icon: <Plus size={15} />,
          onClick: () => setIsPoModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات التموين والمشتريات' : isEn ? 'Procurement Metrics' : 'Indicateurs Approvisionnement'}
        language={language}
        primaryCard={{
          label: isAr ? 'طلبيات الشراء قيد التنفيذ' : "Commandes d'Achat (PO) Ouvertes",
          count: metrics.pendingPoTtc,
          formatValue: (v) => formatMoney(v),
          badgeText: `(${metrics.pendingPoCount} ${isAr ? 'جارية' : 'en cours'})`,
          tone: 'terracotta',
          title: isAr ? 'في انتظار الاستلام بالمستودع' : 'En attente de livraison quai fournisseur',
          isActive: statusFilter === 'Ordered',
          onToggle: () => setStatusFilter((prev) => (prev === 'Ordered' ? 'all' : 'Ordered')),
        }}
        secondaryCard={{
          label: isAr ? 'الاستلامات الفعلية بالمستودع' : 'Bons de Réception à Quai (BR)',
          count: metrics.receivedBrTtc,
          formatValue: (v) => formatMoney(v),
          badgeText: `${metrics.receivedBrCount} ${isAr ? 'استلامات' : 'réceptions'}`,
          tone: 'emerald',
          title: isAr ? 'تمت إضافة المخزون' : 'Stock incrémenté dans les dépôts désignés',
          isActive: statusFilter === 'Received',
          onToggle: () => setStatusFilter((prev) => (prev === 'Received' ? 'all' : 'Received')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي تعهدات الشراء TTC' : 'Total Engagements Achats',
          valueCount: metrics.totalPurchasesTtc,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: Math.round(metrics.receivedRatio),
          badgePrefix: '',
          badgeSuffix: isAr ? '% مستلم' : '% Livré',
          caption: isAr ? 'تدفقات التموين متعدد المستودعات (TTC)' : 'Flux réapprovisionnement multi-dépôts (TTC)',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('trading_purchases_docs_register', 'Registre des Achats')}
          liveRegionText={`${sortedDocs.length} ${isAr ? 'مستند' : 'pièces'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برقم المستند، المورد...' : 'Rechercher document, fournisseur...'}
          statusOptions={[
            { value: 'all', label: t('trading_purchases_tab_all', 'Toutes'), count: tabCounts.all },
            { value: 'po', label: t('trading_purchases_tab_po', 'Commandes'), count: tabCounts.po },
            { value: 'br', label: t('trading_purchases_tab_br', 'Réceptions'), count: tabCounts.br },
            {
              value: 'facture_fournisseur',
              label: t('trading_purchases_tab_bills', 'Factures'),
              count: tabCounts.facture_fournisseur,
            },
          ]}
          statusValue={activeTab}
          onStatusChange={(val) => setActiveTab(val as PurchaseTab)}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setStatusFilter('all');
            setActiveTab('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<PurchaseDocument>
          hideToolbar
          data={sortedDocs}
          keyExtractor={(d) => d.id}
          viewMode={viewMode}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          openItemId={inspectingDoc?.id ?? null}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          pinnedIds={pinnedIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(doc, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(doc);
          }}
          onViewDetails={(doc, el) => {
            setDrawerOpenerEl(el || null);
            setInspectingDoc(doc);
          }}
          renderCard={(doc) => {
            const branchInfo = resolveRecordBranch(doc, branchesById, currentBranch, language);
            return (
              <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl space-y-2 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-black dark:text-white">{doc.docNumber}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 uppercase font-bold">
                      {doc.type}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black dark:text-white truncate">{doc.supplierName}</p>
                  <p className="text-[11px] text-black/55 dark:text-white/60 mt-1 flex items-center gap-1.5">
                    <Building2 size={11} className="text-[#d4522f]" />
                    <span>{branchInfo.name}</span>
                  </p>
                </div>
                <div className="flex justify-between text-xs font-mono pt-2 border-t border-neutral-100 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">{doc.orderDate}</span>
                  <span className="font-bold text-[#d4522f] tabular-nums">{formatMoney(doc.totalTtc)}</span>
                </div>
              </div>
            );
          }}
          emptyTitle={isAr ? 'لا توجد طلبيات شراء' : "Aucune commande d'achat"}
          emptyDescription={
            isAr
              ? 'أنشئ أول طلب شراء للموردين.'
              : "Créez votre première commande d'achat fournisseur en cliquant sur le bouton ci-dessus."
          }
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedDocs.length}
        entityPluralLabel={isAr ? 'مستندات شراء' : isEn ? 'purchase orders' : "pièces d'achat"}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setStatusFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<PurchaseDocument>
        isOpen={!!inspectingDoc}
        item={inspectingDoc}
        allItems={sortedDocs}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingDoc?.docNumber || ''}
        subtitle={inspectingDoc ? `${inspectingDoc.supplierName} · ${inspectingDoc.orderDate}` : undefined}
        avatarText={inspectingDoc ? inspectingDoc.type.toUpperCase() : 'PO'}
        branchName={
          inspectingDoc ? resolveRecordBranch(inspectingDoc, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingDoc?.status}
        onClose={() => setInspectingDoc(null)}
        onSelectItem={(doc) => setInspectingDoc(doc)}
        renderBody={(doc) => (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-neutral-800/50 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Fournisseur :</span>
                <span className="font-bold text-black dark:text-white">{doc.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Dépôt cible :</span>
                <span className="font-medium text-black dark:text-white">{doc.depotName || 'Dépôt Central'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-neutral-700">
                <span className="text-black/55 dark:text-white/60">Total HT :</span>
                <span className="font-mono font-semibold tabular-nums">{formatMoney(doc.totalHt)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#d4522f]">
                <span>Total TTC :</span>
                <span className="font-mono tabular-nums">{formatMoney(doc.totalTtc)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-black/55 dark:text-white/60">
                Articles ({doc.items.length})
              </span>
              {doc.items.map((it) => (
                <div
                  key={it.id}
                  className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700 flex justify-between items-center text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-black dark:text-white truncate">{it.description}</p>
                    <span className="text-[11px] font-mono text-black/55 dark:text-white/60">
                      {it.orderedQty} {it.unit} × {formatMoney(it.unitCostHt)}
                    </span>
                  </div>
                  <span className="font-mono font-bold tabular-nums">{formatMoney(it.totalHt)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrintDoc(commercialDocFromPurchase(doc))}
                className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>{t('action_print', 'Imprimer')}</span>
              </button>
              {doc.type === 'po' && doc.status === 'Ordered' && (
                <button
                  type="button"
                  onClick={() => receivePurchaseDoc(doc.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{t('trading_purchases_receive_stock', 'Réceptionner')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      />

      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                <Truck size={18} className="text-[#d4522f]" />
                <span>Nouvelle Commande d'Achat Fournisseur (PO)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                aria-label="Fermer"
                className="p-1 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Fournisseur *"
                  value={supplierId}
                  onChange={(val) => setSupplierId(typeof val === 'string' ? val : val?.target?.value || '')}
                  options={b2bSuppliers.map((s) => ({ value: s.id, label: s.supplierName }))}
                />
                <LabelSelect
                  label="Dépôt de Destination *"
                  value={depotId}
                  onChange={(val) => setDepotId(typeof val === 'string' ? val : val?.target?.value || '')}
                  options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  type="date"
                  label="Date de Livraison Souhaitée"
                  value={deliveryExpectedDate}
                  onChange={(e) => setDeliveryExpectedDate(e.target.value)}
                />
                <LabelInput
                  label="Observations / Mention Bon de Pesée"
                  placeholder="Ex: Livraison par semi-remorque citerne..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <label className="font-semibold text-black/70 dark:text-white/75">Article Commandé :</label>
                {poItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <LabelSelect
                        label="Article"
                        value={it.productId}
                        onChange={(val) => {
                          const prodId = typeof val === 'string' ? val : val?.target?.value || '';
                          const prod = products.find((p) => p.id === prodId);
                          if (!prod) return;
                          setPoItems([
                            {
                              id: `po_it_${Date.now()}`,
                              productId: prod.id,
                              description: prod.name,
                              orderedQty: it.orderedQty || 10,
                              receivedQty: 0,
                              unit: prod.unit || 'pcs',
                              unitCostHt: prod.cost?.amount || 1000,
                              tvaPercent: 19,
                              totalHt: (prod.cost?.amount || 1000) * (it.orderedQty || 10),
                            },
                          ]);
                        }}
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.name} (${formatMoney(p.cost?.amount || 1000)})`,
                        }))}
                      />
                    </div>
                    <div>
                      <LabelInput
                        type="number"
                        min={1}
                        label="Quantité"
                        value={it.orderedQty}
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0;
                          setPoItems([{ ...it, orderedQty: q, totalHt: q * it.unitCostHt }]);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsPoModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  Valider la Commande (PO)
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <CommercialDocPrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} document={printDoc} />
    </div>
  );
};
