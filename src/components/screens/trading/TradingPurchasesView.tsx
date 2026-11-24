import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentPurchaseDocsFromState,
  selectCurrentWarehousesFromState,
  selectCurrentProductsFromState,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { PurchaseDocument, CommercialDocument } from '../../../types';
import { formatMoney, localizeStatus } from '../../../utils/rules';
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
  KineticModalShell,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';

type PurchaseTab = 'all' | 'po' | 'br' | 'facture_fournisseur';
type StatusFilter = 'all' | 'Ordered' | 'Received';
type DrawerTab = 'commande' | 'lignes' | 'reception';

export const TradingPurchasesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { purchaseDocs, b2bSuppliers, warehouses, products, currentBusiness, currentBranchId, currentBranch, branches, isSyncing, networkMode, lastSyncedAt, isSyncTimeout } = useAtriumSelector(
    (s) => ({
      purchaseDocs: selectCurrentPurchaseDocsFromState(s),
      b2bSuppliers: s.b2bSuppliers || [],
      warehouses: selectCurrentWarehousesFromState(s),
      products: selectCurrentProductsFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranchId: s.currentBranchId,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );
  const { createPurchaseDoc, receivePurchaseDoc, retryCloudSync } = useAtriumActions();

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
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('commande');
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
              <span className={`px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold tabular-nums ${badgeColor}`}>
                {doc.type === 'po' ? 'PO' : doc.type === 'br' ? 'BR' : 'FF'}
              </span>
              <span className="tabular-nums font-semibold t-small text-black dark:text-white">{doc.docNumber}</span>
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
          <span className="t-cap tabular-nums text-black/70 dark:text-white/75">{doc.orderDate}</span>
        ),
      },
      {
        key: 'supplier',
        header: t('trading_purchases_col_supplier', 'Fournisseur Référencé'),
        minWidth: '200px',
        sortable: true,
        renderCell: (doc) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{doc.supplierName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
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
              className={`px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold inline-block ${
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
                data-sq="ctl-sm"
                data-sq-border="none"
                className="px-2.5 py-1 t-small font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>{t('trading_purchases_receive_stock', 'Réceptionner à quai')}</span>
              </button>
            )}
            {doc.type === 'br' && (
              <span className="t-small tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
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
          items={sortedDocs}
          keyExtractor={(d) => d.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode="list"
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
          getRowMeta={(doc) => {
            const isReceived = doc.status === 'Received';
            const branchInfo = resolveRecordBranch(doc, branchesById, currentBranch, language);
            return {
              title: doc.docNumber,
              subline: `${doc.supplierName} · ${doc.orderDate}`,
              avatarText: doc.type === 'po' ? 'PO' : doc.type === 'br' ? 'BR' : 'FF',
              avatarColor: '#d4522f',
              categoryLabel: doc.type.toUpperCase(),
              statusLabel: localizeStatus(doc.status, language),
              statusVariant: isReceived ? 'active' : 'warning',
              metricPrimary: formatMoney(doc.totalTtc),
              metricSecondary: doc.depotName || 'Dépôt Central',
              branchName: branchInfo.name,
              isPinned: pinnedIds.has(doc.id),
              detailCol1: { heading: 'Fournisseur', primaryText: doc.supplierName },
              detailCol2: { heading: 'Dépôt', primaryText: doc.depotName || 'Dépôt Central' },
              detailCol3: { heading: 'Date', primaryText: doc.orderDate },
            };
          }}
          getFanActions={(doc) => {
            const actions = [
              {
                id: 'print',
                label: t('action_print', 'Imprimer'),
                icon: <Printer size={14} />,
                onClick: () => setPrintDoc(commercialDocFromPurchase(doc)),
              },
            ];
            if (doc.type === 'po' && doc.status === 'Ordered') {
              actions.push({
                id: 'receive',
                label: t('trading_purchases_receive_stock', 'Réceptionner'),
                icon: <CheckCircle2 size={14} />,
                onClick: () => receivePurchaseDoc(doc.id),
              });
            }
            return actions;
          }}
          getDetailActions={(doc) => {
            const actions = [
              {
                id: 'print',
                label: t('action_print', 'Imprimer'),
                icon: <Printer size={13} />,
                onClick: () => setPrintDoc(commercialDocFromPurchase(doc)),
              },
            ];
            if (doc.type === 'po' && doc.status === 'Ordered') {
              actions.push({
                id: 'receive',
                label: t('trading_purchases_receive_stock', 'Réceptionner'),
                icon: <CheckCircle2 size={13} />,
                onClick: () => receivePurchaseDoc(doc.id),
              });
            }
            return actions;
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
        avatarText={inspectingDoc ? (inspectingDoc.type === 'po' ? 'PO' : inspectingDoc.type === 'br' ? 'BR' : 'FF') : 'PO'}
        avatarColor="#d4522f"
        branchName={
          inspectingDoc ? resolveRecordBranch(inspectingDoc, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingDoc ? localizeStatus(inspectingDoc.status, language) : undefined}
        statusClassName={inspectingDoc?.status === 'Received' ? STATUS_PILL_OK : STATUS_PILL_WARN}
        tabs={[
          { id: 'commande', label: isAr ? 'الطلب' : isEn ? 'Order' : 'Commande' },
          { id: 'lignes', label: isAr ? 'البنود' : isEn ? 'Items' : 'Articles' },
          { id: 'reception', label: isAr ? 'الاستلام' : isEn ? 'Receipt' : 'Réception' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onClose={() => setInspectingDoc(null)}
        onSelectItem={(doc) => setInspectingDoc(doc)}
        renderBody={(doc, tab) => {
          if (tab === 'lignes') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`Articles (${doc.items.length})`}>
                  <InspectorCard>
                    {doc.items.map((it, idx) => (
                      <InspectorListItem
                        key={it.id}
                        title={it.description}
                        subtitle={`${it.orderedQty} ${it.unit} × ${formatMoney(it.unitCostHt)}`}
                        metaRight={formatMoney(it.totalHt)}
                        isLast={idx === doc.items.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'reception') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Logistique & Quai">
                  <InspectorCard>
                    <InspectorKeyValue label="Dépôt cible" value={doc.depotName || 'Dépôt Central'} />
                    <InspectorKeyValue label="Date commande" value={doc.orderDate} mono />
                    <InspectorKeyValue
                      label="Livraison prévue"
                      value={doc.deliveryExpectedDate || 'Sous 48h'}
                      mono
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
                {doc.type === 'po' && doc.status === 'Ordered' && (
                  <InspectorWideButton
                    label={t('trading_purchases_receive_stock', 'Réceptionner à quai')}
                    icon={<CheckCircle2 size={14} />}
                    tone="accent"
                    onClick={() => receivePurchaseDoc(doc.id)}
                  />
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: t('action_print', 'Imprimer'),
                    icon: <Printer size={15} />,
                    onClick: () => setPrintDoc(commercialDocFromPurchase(doc)),
                  },
                  ...(doc.type === 'po' && doc.status === 'Ordered'
                    ? [
                        {
                          id: 'receive',
                          label: t('trading_purchases_receive_stock', 'Réceptionner'),
                          icon: <CheckCircle2 size={15} />,
                          primary: true,
                          onClick: () => receivePurchaseDoc(doc.id),
                        },
                      ]
                    : []),
                ]}
              />
              <InspectorSection index={0} title="Synthèse Achat">
                <InspectorBigStat
                  value={formatMoney(doc.totalTtc)}
                  tone="accent"
                  caption={`Total TTC · ${doc.supplierName}`}
                />
                <InspectorCard>
                  <InspectorKeyValue label="Fournisseur" value={doc.supplierName} />
                  <InspectorKeyValue label="Dépôt cible" value={doc.depotName || 'Dépôt Central'} />
                  <InspectorKeyValue label="Total HT" value={formatMoney(doc.totalHt)} mono />
                  <InspectorKeyValue label="TVA" value={formatMoney(doc.totalTva)} mono isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticModalShell
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        maxWidthClass="max-w-2xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        >
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h2 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>Nouvelle Commande d'Achat Fournisseur (PO)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                aria-label="Fermer"
                data-sq="ctl-sm"
                data-sq-border="none"
                className="p-1 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePo} className="space-y-4 t-cap">
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
              <div className="space-y-2 pt-2 border-t border-[var(--atr-divider)]">
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
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsPoModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  Valider la Commande (PO)
                </AtriumButton>
              </div>
            </form>
        </div>
      </KineticModalShell>

      <CommercialDocPrintModal isOpen={!!printDoc} onClose={() => setPrintDoc(null)} document={printDoc} />
    </div>
  );
};
