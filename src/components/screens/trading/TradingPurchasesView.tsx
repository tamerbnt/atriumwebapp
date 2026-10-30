import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Boxes,
  FileText,
  Clock,
  Printer,
  Calendar,
  Trash2,
  AlertCircle,
  X,
  Home,
  ChevronDown,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { PurchaseDocument, PurchaseDocType, CommercialDocument } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { useTranslation } from '../../../utils/useTranslation';

type PurchaseTab = 'all' | 'po' | 'br' | 'facture_fournisseur';

export const TradingPurchasesView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
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
    switchBranch,
    resetTradingMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<PurchaseTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  const commercialDocFromPurchase = (p: PurchaseDocument): CommercialDocument => ({
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
  });

  // Metrics
  const metrics = useMemo(() => {
    const totalPurchasesTtc = purchaseDocs.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const pendingPoList = purchaseDocs.filter((p) => p.type === 'po' && p.status === 'Ordered');
    const pendingPoTtc = pendingPoList.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const receivedBrList = purchaseDocs.filter((p) => p.type === 'br' || p.status === 'Received');
    const receivedBrTtc = receivedBrList.reduce((sum, p) => sum + (p.totalTtc || 0), 0);

    const receivedRatio = purchaseDocs.length > 0 ? (receivedBrList.length / purchaseDocs.length) * 100 : 100;

    return {
      totalPurchasesTtc,
      pendingPoCount: pendingPoList.length,
      pendingPoTtc,
      receivedBrCount: receivedBrList.length,
      receivedBrTtc,
      receivedRatio,
    };
  }, [purchaseDocs]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: purchaseDocs.length,
      po: purchaseDocs.filter((p) => p.type === 'po').length,
      br: purchaseDocs.filter((p) => p.type === 'br').length,
      facture_fournisseur: purchaseDocs.filter((p) => p.type === 'facture_fournisseur').length,
    };
  }, [purchaseDocs]);

  // New PO state
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

  const filteredDocs = useMemo(() => {
    return purchaseDocs.filter((p) => {
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = p.docNumber.toLowerCase().includes(q);
        const matchesSup = p.supplierName.toLowerCase().includes(q);
        if (!matchesNum && !matchesSup) return false;
      }
      return true;
    });
  }, [purchaseDocs, activeTab, searchQuery]);

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = b2bSuppliers.find((s) => s.id === supplierId) || b2bSuppliers[0];
    const dep = warehouses.find((w) => w.id === depotId) || warehouses[0];
    const year = new Date().getFullYear();
    const count = purchaseDocs.filter((p) => p.type === 'po').length + 1;
    const docNumber = `PO-${year}-${count.toString().padStart(4, '0')}`;

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

  const columns: ColumnDefinition<PurchaseDocument>[] = [
    {
      key: 'docNumber',
      header: t('trading_sales_col_doc_num', 'N° Document'),
      width: '180px',
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
            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {doc.docNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'orderDate',
      header: t('trading_purchases_col_order_delivery', 'Date Commande'),
      width: '130px',
      renderCell: (doc) => (
        <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
          {doc.orderDate}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: t('trading_purchases_col_supplier', 'Fournisseur Référencé'),
      minWidth: '220px',
      renderCell: (doc) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {doc.supplierName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {t('trading_sales_col_depot', 'Dépôt')} : {doc.depotName || 'Dépôt Central'}
          </span>
        </div>
      ),
    },
    {
      key: 'itemsCount',
      header: language === 'ar' ? 'البنود' : 'Lignes',
      width: '100px',
      renderCell: (doc) => (
        <span className="text-xs font-mono text-neutral-500">
          {doc.items.length} {language === 'ar' ? 'بند' : 'article(s)'}
        </span>
      ),
    },
    {
      key: 'totalTtc',
      header: t('trading_composer_total_ttc', 'Montant Total TTC'),
      width: '150px',
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatMoney(doc.totalTtc)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('trading_sales_col_status', 'Statut'),
      width: '130px',
      renderCell: (doc) => {
        const isReceived = doc.status === 'Received';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
              isReceived
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {isReceived
              ? language === 'ar' ? 'تم الاستلام' : 'Réceptionné'
              : language === 'ar' ? 'قيد الطلب' : 'Commandé'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '170px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPrintDoc(commercialDocFromPurchase(doc))}
            title={t('action_print', 'Imprimer')}
            className="p-1.5 text-neutral-400 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={14} />
          </button>

          {doc.type === 'po' && doc.status === 'Ordered' && (
            <button
              onClick={() => receivePurchaseDoc(doc.id)}
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
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_purchases_title', 'Cycle des Achats & Réceptions Fournisseurs')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {purchaseDocs.length} {language === 'ar' ? 'طلب واستلام' : 'commandes & réceptions'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_purchases_subtitle', 'Approvisionnement, bons de commande d\'achat (PO) et entrée automatique en stock à quai (BR)')}
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

            {/* Create PO Button */}
            <AtriumButton
              variant="primary"
              onClick={() => setIsPoModalOpen(true)}
              icon={<Plus size={15} />}
            >
              {t('trading_purchases_new_po', 'Créer Bon de Commande Achat (PO)')}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Commandes Fournisseurs en Cours */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'طلبيات الشراء قيد التنفيذ' : 'Commandes d\'Achat (PO) Ouvertes'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {metrics.pendingPoCount} en cours
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(metrics.pendingPoTtc)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Clock size={13} className="text-blue-500" />
                  <span>En attente de livraison quai fournisseur</span>
                </div>
              </div>
            </div>

            {/* Card 2: Réceptions à Quai Effectuées */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'الاستلامات الفعلية بالمستودع' : 'Bons de Réception à Quai (BR)'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {metrics.receivedBrCount} réceptions
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(metrics.receivedBrTtc)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Stock incrémenté dans les dépôts désignés</span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'إجمالي تعهدات الشراء TTC' : 'Total Engagements Achats'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  {metrics.receivedRatio.toFixed(0)}% Livré
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(metrics.totalPurchasesTtc)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Boxes size={12} className="text-[#FB923C]" />
                    <span>Flux réapprovisionnement multi-dépôts</span>
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
                <Truck size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t('trading_purchases_docs_register', 'Registre des Achats')}
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
                    { key: 'all', label: t('trading_purchases_tab_all', 'Toutes les Pièces'), count: tabCounts.all },
                    { key: 'po', label: t('trading_purchases_tab_po', 'Commandes (PO)'), count: tabCounts.po },
                    { key: 'br', label: t('trading_purchases_tab_br', 'Réceptions (BR)'), count: tabCounts.br },
                    { key: 'facture_fournisseur', label: t('trading_purchases_tab_bills', 'Factures Fournisseurs'), count: tabCounts.facture_fournisseur },
                  ] as const
                ).map((item) => {
                  const isSelected = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? 'bg-[#C4785A] text-white'
                            : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                        }`}
                      >
                        {item.count}
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
                  placeholder={language === 'ar' ? 'بحث برقم المستند، المورد...' : 'Rechercher document, fournisseur...'}
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
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              renderCard={(doc) => (
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2">
                  <span className="font-mono font-bold text-xs">{doc.docNumber}</span>
                  <p className="text-xs font-semibold">{doc.supplierName}</p>
                  <div className="flex justify-between text-xs font-mono pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <span className="text-neutral-500">TTC :</span>
                    <span className="font-bold text-[#C4785A]">{formatMoney(doc.totalTtc)}</span>
                  </div>
                </div>
              )}
              emptyTitle={language === 'ar' ? 'لا توجد طلبيات شراء' : 'Aucune commande d\'achat'}
              emptyDescription={
                language === 'ar'
                  ? 'أنشئ أول طلب شراء للموردين بالضغط على الزر أعلاه.'
                  : 'Créez votre première commande d\'achat fournisseur en cliquant sur le bouton ci-dessus.'
              }
            />
          </div>

        </div>

      </div>

      {/* PO Creation Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Truck size={18} className="text-[#C4785A]" />
                <span>Nouvelle Commande d'Achat Fournisseur (PO)</span>
              </h2>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Fournisseur *"
                  value={supplierId}
                  onChange={(val) => setSupplierId(typeof val === 'string' ? val : val?.target?.value || val)}
                  options={b2bSuppliers.map((s) => ({
                    value: s.id,
                    label: s.supplierName,
                  }))}
                />

                <LabelSelect
                  label="Dépôt de Destination *"
                  value={depotId}
                  onChange={(val) => setDepotId(typeof val === 'string' ? val : val?.target?.value || val)}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.code} — ${w.name}`,
                  }))}
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

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Article Commandé :
                </label>
                {poItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <LabelSelect
                        label="Article"
                        value={it.productId}
                        onChange={(val) => {
                          const prodId = typeof val === 'string' ? val : val?.target?.value || val;
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
                        min="1"
                        label="Quantité"
                        value={it.orderedQty}
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0;
                          setPoItems([
                            {
                              ...it,
                              orderedQty: q,
                              totalHt: q * it.unitCostHt,
                            },
                          ]);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPoModalOpen(false)}
                >
                  Annuler
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  type="submit"
                >
                  Valider la Commande (PO)
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable A4 Modal */}
      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />
    </div>
  );
};
