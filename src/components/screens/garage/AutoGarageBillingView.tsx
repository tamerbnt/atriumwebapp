import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  CreditCard,
  Printer,
  CheckCircle2,
  Receipt,
  X,
  Building2,
  FileText,
  Wallet,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import {
  useGarageData,
  RepairOrder,
  GarageInvoice,
  computeAlgerianTimbreFiscal,
} from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AutoGarageBillingView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode,
      isSyncTimeout: s.isSyncTimeout,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { orders, fleets, invoices, updateOrder, createInvoice } = useGarageData();

  const [activeScreenTab, setActiveScreenTab] = useState<'orders' | 'fleets' | 'invoices'>('orders');
  const [billingFilter, setBillingFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [inspectedOrder, setInspectedOrder] = useState<RepairOrder | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('facturation');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderToSettle, setOrderToSettle] = useState<RepairOrder | null>(null);
  const [billingType, setBillingType] = useState<'facture_dgi' | 'bon_caisse'>('facture_dgi');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'cib_dahabia' | 'cheque' | 'virement'>('especes');
  const [discountAmount, setDiscountAmount] = useState('0');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<GarageInvoice | null>(null);
  const [isTillModalOpen, setIsTillModalOpen] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeOrder = useMemo(() => {
    if (!inspectedOrder) return null;
    return orders.find((o) => o.id === inspectedOrder.id) || inspectedOrder;
  }, [inspectedOrder, orders]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const bName = resolveRecordBranch(o, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [orders, branchesById, currentBranch, language]);

  const settledOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'Delivered' || o.isPaid).length,
    [orders]
  );
  const pendingOrdersCount = orders.length - settledOrdersCount;

  const totalOrdersAmount = useMemo(
    () => orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0),
    [orders]
  );
  const settledAmount = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'Delivered' || o.isPaid)
        .reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0),
    [orders]
  );
  const corporateFleetArTotal = useMemo(
    () => fleets.reduce((acc, f) => acc + f.currentOutstandingDzd, 0),
    [fleets]
  );
  const timbreTotal = useMemo(
    () => invoices.reduce((acc, i) => acc + (i.timbreFiscal || 0), 0),
    [invoices]
  );

  const filteredBillingOrders = useMemo(() => {
    return orders.filter((o) => {
      const isSettled = o.status === 'Delivered' || Boolean(o.isPaid);
      if (billingFilter === 'settled' && !isSettled) return false;
      if (billingFilter === 'pending' && isSettled) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(o, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (clientTypeFilter !== 'All') {
        const cType = o.clientType || 'individual';
        if (cType !== clientTypeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.vehiclePlate.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.vehicleModel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, billingFilter, branchFilter, clientTypeFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedBillingOrders = useMemo(() => {
    const list = [...filteredBillingOrders];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'orderNumber') {
        cmp = a.orderNumber.localeCompare(b.orderNumber);
      } else if (sortBy === 'vehicle') {
        cmp = a.vehiclePlate.localeCompare(b.vehiclePlate);
      } else if (sortBy === 'client') {
        cmp = a.clientName.localeCompare(b.clientName);
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'amount') {
        cmp = (a.finalCostDzd || a.estimatedCostDzd) - (b.finalCostDzd || b.estimatedCostDzd);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredBillingOrders, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          inv.vehiclePlate.toLowerCase().includes(q) ||
          inv.orderNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const openSettlementModal = useCallback((order: RepairOrder) => {
    setOrderToSettle(order);
    setBillingType(order.billingType === 'bon_caisse' ? 'bon_caisse' : 'facture_dgi');
    setDiscountAmount('0');
    setIsPaymentModalOpen(true);
  }, []);

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToSettle) return;
    const laborHt =
      orderToSettle.laborCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * 0.25 : 3750);
    const partsHt =
      orderToSettle.partsCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * 0.75 : 15500);
    const disc = parseFloat(discountAmount) || 0;
    const subtotalHt = Math.max(0, laborHt + partsHt - disc);
    const tva = billingType === 'facture_dgi' ? Math.round(subtotalHt * 0.19) : 0;
    const ttc = subtotalHt + tva;
    const timbre = computeAlgerianTimbreFiscal(ttc, paymentMethod);
    const net = ttc + timbre;
    const newInvoice: GarageInvoice = {
      id: `inv_${Date.now()}`,
      accountId: orderToSettle.accountId || 'acc_01',
      businessId: orderToSettle.businessId || 'biz_garage',
      branchId: orderToSettle.branchId || currentBranch?.id || 'branch_garage_main',
      staffId: orderToSettle.staffId || 'stf_01',
      invoiceNumber:
        billingType === 'facture_dgi'
          ? `FAC-2026-${Math.floor(1000 + Math.random() * 9000)}`
          : `BC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: orderToSettle.id,
      orderNumber: orderToSettle.orderNumber,
      vehiclePlate: orderToSettle.vehiclePlate,
      vehicleModel: orderToSettle.vehicleModel,
      clientId: orderToSettle.fleetId || 'client_01',
      clientName: orderToSettle.clientName,
      clientPhone: orderToSettle.clientPhone,
      clientType: orderToSettle.clientType || 'individual',
      clientNif: orderToSettle.clientType === 'corporate_fleet' ? '001916012345678' : undefined,
      clientNis: orderToSettle.clientType === 'corporate_fleet' ? '00191601234' : undefined,
      billingType,
      paymentMethod,
      laborTotalHt: laborHt,
      partsTotalHt: partsHt,
      discountHt: disc,
      subtotalHt,
      tvaRate: billingType === 'facture_dgi' ? 19 : 0,
      tvaAmount: tva,
      totalTtc: ttc,
      timbreFiscal: timbre,
      netToPayDzd: net,
      issuedAt: new Date().toISOString(),
      isPaid: true,
    };
    createInvoice(newInvoice);
    const updatedOrder: RepairOrder = {
      ...orderToSettle,
      status: 'Delivered',
      finalCostDzd: net,
      isPaid: true,
      billingType,
      invoiceId: newInvoice.id,
    };
    updateOrder(updatedOrder);
    if (inspectedOrder?.id === updatedOrder.id) setInspectedOrder(updatedOrder);
    setIsPaymentModalOpen(false);
    setActivePrintInvoice(newInvoice);
    setIsPrintModalOpen(true);
    showToast({
      type: 'success',
      title: newInvoice.invoiceNumber,
      message: isAr
        ? `تم تسجيل التحصيل المالي (${formatMoney(net, language)}) وطباعة الفاتورة`
        : `Règlement enregistré (${formatMoney(net, language)}) & Facture émise`,
    });
  };

  const handleExportCsv = useCallback(() => {
    if (activeScreenTab === 'invoices') {
      const headers = ['Invoice', 'Order', 'Client', 'Plate', 'Branch', 'Type', 'TVA 19%', 'Timbre', 'Net DZD'];
      const rows = filteredInvoices.map((inv) => {
        const b = resolveRecordBranch(inv, branchesById, currentBranch, language);
        return [
          inv.invoiceNumber,
          inv.orderNumber,
          inv.clientName,
          inv.vehiclePlate,
          b.name,
          inv.billingType,
          String(inv.tvaAmount),
          String(inv.timbreFiscal),
          String(inv.netToPayDzd),
        ];
      });
      downloadCsvSafe(`factures_garage_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const headers = ['OR', 'Plate', 'Vehicle', 'Client', 'Type', 'Branch', 'Status', 'Total DZD'];
      const rows = sortedBillingOrders.map((o) => {
        const b = resolveRecordBranch(o, branchesById, currentBranch, language);
        return [
          o.orderNumber,
          o.vehiclePlate,
          o.vehicleModel,
          o.clientName,
          o.clientType || 'individual',
          b.name,
          o.status,
          String(o.finalCostDzd || o.estimatedCostDzd),
        ];
      });
      downloadCsvSafe(`caisse_garage_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
    showToast({
      type: 'info',
      title: isAr ? 'تصدير CSV' : 'Export CSV',
      message: isAr ? 'تم تصدير البيانات المحاسبية' : 'Export comptable généré',
    });
  }, [activeScreenTab, filteredInvoices, sortedBillingOrders, branchesById, currentBranch, language, isAr]);

  const getOrderRowMeta = useCallback(
    (o: RepairOrder): KineticRowData => {
      const settled = o.status === 'Delivered' || Boolean(o.isPaid);
      const br = resolveRecordBranch(o, branchesById, currentBranch, language);
      return {
        primary: `${o.orderNumber} · ${o.vehiclePlate}`,
        secondary: `${o.clientName} · ${o.vehicleModel}`,
        meta: `${formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)} · ${br.name}`,
        badge: settled
          ? { label: isAr ? 'مسوى' : 'Réglé', tone: 'ok' }
          : { label: isAr ? 'قيد التحصيل' : 'À Encaisser', tone: 'warn' },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  const getOrderFanActions = useCallback(
    (o: RepairOrder): KineticRowFanAction[] => [
      {
        id: 'settle',
        label: o.isPaid || o.status === 'Delivered' ? 'Facturer' : 'Encaisser',
        icon: <CreditCard size={14} />,
        onClick: () => openSettlementModal(o),
      },
    ],
    [openSettlementModal]
  );

  const getOrderDetailActions = useCallback(
    (o: RepairOrder): KineticDetailAction[] => [
      {
        id: 'settle',
        label: o.isPaid || o.status === 'Delivered' ? 'Rééditer Facture DGI' : 'Encaisser & Facturer',
        icon: <CreditCard size={14} />,
        onClick: () => openSettlementModal(o),
      },
    ],
    [openSettlementModal]
  );

  const getInvoiceRowMeta = useCallback(
    (inv: GarageInvoice): KineticRowData => {
      const br = resolveRecordBranch(inv, branchesById, currentBranch, language);
      return {
        primary: `${inv.invoiceNumber} · ${inv.clientName}`,
        secondary: `${inv.vehiclePlate} · ${inv.orderNumber}`,
        meta: `${formatMoney(inv.netToPayDzd, language)} · ${br.name}`,
        badge:
          inv.billingType === 'facture_dgi'
            ? { label: 'DGI 19%', tone: 'info' }
            : { label: 'Bon Caisse', tone: 'neutral' },
      };
    },
    [branchesById, currentBranch, language]
  );

  const getInvoiceFanActions = useCallback(
    (inv: GarageInvoice): KineticRowFanAction[] => [
      {
        id: 'print',
        label: 'Imprimer',
        icon: <Printer size={14} />,
        onClick: () => {
          setActivePrintInvoice(inv);
          setIsPrintModalOpen(true);
        },
      },
    ],
    []
  );

  const getInvoiceDetailActions = useCallback(
    (inv: GarageInvoice): KineticDetailAction[] => [
      {
        id: 'print',
        label: isAr ? 'طباعة الفاتورة' : 'Imprimer Facture',
        icon: <Printer size={14} />,
        onClick: () => {
          setActivePrintInvoice(inv);
          setIsPrintModalOpen(true);
        },
      },
    ],
    [isAr]
  );

  const orderColumns: ColumnDefinition<RepairOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'N° OR',
        width: '1.2*',
        sortable: true,
        renderCell: (o) => <span className="font-mono font-bold text-xs text-[#d4522f]">{o.orderNumber}</span>,
      },
      {
        key: 'vehicle',
        header: isAr ? 'المركبة والترقيم' : 'Véhicule & Immatriculation',
        width: '2*',
        sortable: true,
        renderCell: (o) => (
          <div>
            <span className="font-semibold text-xs text-black dark:text-white block font-mono">{o.vehiclePlate}</span>
            <span className="text-[11px] text-black/55 dark:text-white/55 block truncate">{o.vehicleModel}</span>
          </div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الزبون / الحساب' : 'Client & Compte',
        width: '2*',
        sortable: true,
        renderCell: (o) => (
          <div>
            <span className="font-medium text-xs text-black dark:text-white block truncate">{o.clientName}</span>
            <span className="text-[11px] text-[#d4522f]">
              {o.clientType === 'corporate_fleet' ? `Flotte: ${o.fleetName}` : 'Particulier'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : 'Succursale',
        width: '1.4*',
        sortable: true,
        renderCell: (o) => {
          const info = resolveRecordBranch(o, branchesById, currentBranch, language);
          return <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">{info.name}</span>;
        },
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut Règlement',
        width: '1.3*',
        renderCell: (o) => {
          const settled = o.status === 'Delivered' || Boolean(o.isPaid);
          return (
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                settled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {settled ? (isAr ? 'مسوى' : 'Réglé & Livré') : isAr ? 'قيد التحصيل' : 'À Encaisser'}
            </span>
          );
        },
      },
      {
        key: 'amount',
        header: isAr ? 'المبلغ الإجمالي' : 'Montant TTC',
        width: '1.4*',
        sortable: true,
        renderCell: (o) => (
          <div className="text-right font-mono font-black text-xs text-black dark:text-white">
            {formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
          </div>
        ),
      },
    ],
    [isAr, branchesById, currentBranch, language]
  );

  const invoiceColumns: ColumnDefinition<GarageInvoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        header: 'N° Facture / BC',
        width: '1.6*',
        renderCell: (inv) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Receipt size={15} />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-black dark:text-white block">{inv.invoiceNumber}</span>
              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{inv.orderNumber}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الزبون والمركبة' : 'Client & Véhicule',
        width: '2.2*',
        renderCell: (inv) => (
          <div>
            <span className="font-semibold text-xs text-black dark:text-white block">{inv.clientName}</span>
            <span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
              {inv.vehiclePlate} · {inv.vehicleModel}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : 'Succursale',
        width: '1.4*',
        sortable: true,
        renderCell: (inv) => {
          const info = resolveRecordBranch(inv, branchesById, currentBranch, language);
          return <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">{info.name}</span>;
        },
      },
      {
        key: 'type',
        header: 'Régime Fiscal',
        width: '1.4*',
        renderCell: (inv) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              inv.billingType === 'facture_dgi'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75'
            }`}
          >
            {inv.billingType === 'facture_dgi' ? 'Facture Fiscale DGI' : 'Bon de Caisse'}
          </span>
        ),
      },
      {
        key: 'net',
        header: 'Net Payé',
        width: '1.6*',
        renderCell: (inv) => (
          <div className="text-right font-mono">
            <span className="text-xs font-black text-[#d4522f] block">{formatMoney(inv.netToPayDzd, language)}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">
              TVA: {formatMoney(inv.tvaAmount, language)} · Timbre: {formatMoney(inv.timbreFiscal, language)}
            </span>
          </div>
        ),
      },
    ],
    [isAr, branchesById, currentBranch, language]
  );

  const hasAdvancedFilters = branchFilter !== 'All' || clientTypeFilter !== 'All';
  const activeAdvancedCount = (branchFilter !== 'All' ? 1 : 0) + (clientTypeFilter !== 'All' ? 1 : 0);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'billingStatus',
        label: isAr ? 'حالة التحصيل' : 'Statut Règlement',
        value: billingFilter,
        onChange: setBillingFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous', count: orders.length },
          { value: 'pending', label: isAr ? 'قيد التحصيل' : 'À Encaisser', count: pendingOrdersCount },
          { value: 'settled', label: isAr ? 'محصّلة' : 'Réglés', count: settledOrdersCount },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / الصندوق' : isEn ? 'Branch' : 'Succursale',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes', count: orders.length },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'clientType',
        label: isAr ? 'نوع الحساب' : 'Type Client',
        value: clientTypeFilter,
        onChange: setClientTypeFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'individual', label: 'Particuliers' },
          { value: 'corporate_fleet', label: 'Flottes B2B' },
        ],
      },
    ],
    [isAr, isEn, billingFilter, branchFilter, clientTypeFilter, orders.length, pendingOrdersCount, settledOrdersCount, branchCounts]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (billingFilter !== 'all') {
      chips.push({
        key: 'billing',
        label: billingFilter === 'settled' ? 'Réglés' : 'À Encaisser',
        onRemove: () => setBillingFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Succursale'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (clientTypeFilter !== 'All') {
      chips.push({
        key: 'clientType',
        label: clientTypeFilter === 'corporate_fleet' ? 'Flotte B2B' : 'Particulier',
        onRemove: () => setClientTypeFilter('All'),
      });
    }
    return chips;
  }, [billingFilter, branchFilter, clientTypeFilter, isAr]);

  const handleResetAllFilters = useCallback(() => {
    setSearchQuery('');
    setBillingFilter('all');
    setBranchFilter('All');
    setClientTypeFilter('All');
  }, []);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0 || invoices.length > 0,
  });

  if (showSkeleton && (orders.length === 0 && invoices.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn={false}
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<CreditCard size={26} />}
        title={isAr ? 'الفوترة' : isEn ? 'Billing' : 'Caisse'}
        secondaryActions={
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveScreenTab('orders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeScreenTab === 'orders'
                  ? 'bg-[#d4522f] text-white shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {isAr ? 'تسوية' : isEn ? 'Orders' : 'Ordres'}
            </button>
            <button
              type="button"
              onClick={() => setActiveScreenTab('fleets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeScreenTab === 'fleets'
                  ? 'bg-[#d4522f] text-white shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {isAr ? 'أساطيل' : isEn ? 'Fleets' : 'Flottes'}
            </button>
            <button
              type="button"
              onClick={() => setActiveScreenTab('invoices')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeScreenTab === 'invoices'
                  ? 'bg-[#d4522f] text-white shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {isAr ? 'فواتير' : isEn ? 'Invoices' : 'Factures'} ({invoices.length})
            </button>
          </div>
        }
        primaryAction={{
          label: isAr ? 'حالة الصندوق (Z Caisse)' : 'Point de Caisse (Z)',
          icon: <Wallet size={15} />,
          onClick: () => setIsTillModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'المؤشرات المالية والضريبية DGI' : isEn ? 'Billing & DGI Tax KPIs' : 'Trésorerie Caisse & Fiscalité DGI'}
        language={language}
        primaryCard={{
          label: isAr ? 'أوامر محصّلة ومغلقة' : isEn ? 'Settled Orders' : 'Ordres Réglés & Livrés',
          badgeText: isAr ? 'محصّل' : 'Encaissés',
          count: settledOrdersCount,
          isActive: billingFilter === 'settled',
          onToggle: () => {
            setActiveScreenTab('orders');
            setBillingFilter((prev) => (prev === 'settled' ? 'all' : 'settled'));
          },
          tone: 'emerald',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        secondaryCard={{
          label: isAr ? 'مستحقات قيد التحصيل' : isEn ? 'Pending Collection' : 'En Attente Règlement',
          badgeText: isAr ? 'مستحق' : 'À Encaisser',
          count: pendingOrdersCount,
          isActive: billingFilter === 'pending',
          onToggle: () => {
            setActiveScreenTab('orders');
            setBillingFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
          },
          tone: 'terracotta',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        darkCard={{
          label: isAr ? 'إجمالي المداخيل والديون B2B' : isEn ? 'Revenue & B2B Receivables' : 'Chiffre Encaissé & Encours B2B',
          badgeCount: timbreTotal,
          badgeSuffix: ' DA timbre',
          valueCount: settledAmount,
          valueSuffix: ' DA',
          caption: `${isAr ? 'ديون أساطيل B2B:' : 'Créances Flottes B2B:'} ${formatMoney(corporateFleetArTotal, language)} · ${isAr ? 'الإجمالي المتوقع:' : 'Total OR:'} ${formatMoney(totalOrdersAmount, language)}`,
        }}
      />

      {activeScreenTab === 'orders' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'أوامر التصليح للتسوية' : 'Ordres de Réparation à Encaisser'}
            language={language}
            liveRegionText={`${sortedBillingOrders.length} ${isAr ? 'أمر' : 'OR'}`}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr ? 'البحث عن مركبة أو أمر للتسوية...' : 'Recherche véhicule, client ou N° OR...'
            }
            statusValue={billingFilter}
            onStatusChange={setBillingFilter}
            statusOptions={[
              { value: 'all', label: isAr ? 'الكل' : 'Tous', count: orders.length },
              { value: 'pending', label: isAr ? 'قيد التحصيل' : 'À Encaisser', count: pendingOrdersCount },
              { value: 'settled', label: isAr ? 'محصّلة' : 'Réglés', count: settledOrdersCount },
            ]}
            hasActiveAdvancedFilters={hasAdvancedFilters}
            activeFiltersCount={activeAdvancedCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle
            onExport={handleExportCsv}
            activeChips={activeChips}
            onResetAllFilters={handleResetAllFilters}
          />

          <UniversalDataCollection
            hideToolbar
            items={sortedBillingOrders}
            keyExtractor={(o) => o.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            columns={orderColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
            openItemId={activeOrder?.id || null}
            onItemClick={(order, el) => {
              setDrawerOpenerEl(el || null);
              setInspectedOrder(order);
              setInspectorTab('facturation');
            }}
            onViewDetails={(order, el) => {
              setDrawerOpenerEl(el || null);
              setInspectedOrder(order);
              setInspectorTab('facturation');
            }}
            getRowMeta={getOrderRowMeta}
            getFanActions={getOrderFanActions}
            getDetailActions={getOrderDetailActions}
            customActions={(order) => [
              {
                id: 'settle',
                label: order.isPaid || order.status === 'Delivered' ? 'Facturer' : 'Encaisser',
                icon: <CreditCard size={13} />,
                variant: 'primary',
                onClick: () => openSettlementModal(order),
              },
            ]}
          />
        </ScreenPod>
      )}

      {activeScreenTab === 'fleets' && (
        <ScreenPod>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fleets.map((fleet) => {
              const percentUsed = Math.min(100, Math.round((fleet.currentOutstandingDzd / fleet.creditLimitDzd) * 100));
              const isOverLimit = fleet.currentOutstandingDzd > fleet.creditLimitDzd;
              const fleetBranch = resolveRecordBranch(fleet, branchesById, currentBranch, language);
              return (
                <div
                  key={fleet.id}
                  className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#d4522f] uppercase tracking-wider block">
                        Contrat B2B Flotte · {fleetBranch.name}
                      </span>
                      <h3 className="font-bold text-sm text-black dark:text-white mt-0.5">{fleet.companyName}</h3>
                      <span className="text-xs text-black/55 dark:text-white/55">{fleet.tradeName}</span>
                    </div>
                    <span className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75">
                      <Building2 size={18} />
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-black/55 dark:text-white/55">
                      <span>NIF / NIS :</span>
                      <span className="font-semibold text-black dark:text-white">{fleet.nif}</span>
                    </div>
                    <div className="flex justify-between text-black/55 dark:text-white/55">
                      <span>Véhicules sous contrat :</span>
                      <span className="font-semibold text-black dark:text-white">
                        {fleet.activeVehicleCount} utilitaires
                      </span>
                    </div>
                    <div className="flex justify-between text-black/55 dark:text-white/55">
                      <span>Délai de paiement :</span>
                      <span className="font-semibold text-black dark:text-white">
                        {fleet.paymentTermsDays} jours fin de mois
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-black/55 dark:text-white/55">Encours Actuel :</span>
                      <span className={`font-black ${isOverLimit ? 'text-rose-600' : 'text-black dark:text-white'}`}>
                        {formatMoney(fleet.currentOutstandingDzd, language)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        style={{ width: `${percentUsed}%` }}
                        className={`h-full rounded-full transition-all ${
                          isOverLimit ? 'bg-rose-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-[#d4522f]'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-black/55 dark:text-white/55 font-mono">
                      <span>Plafond: {formatMoney(fleet.creditLimitDzd, language)}</span>
                      <span>{percentUsed}% utilisé</span>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast({
                          type: 'info',
                          title: fleet.tradeName,
                          message: `Génération du relevé mensuel pour ${fleet.companyName}...`,
                        });
                      }}
                      className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black/70 dark:text-white/75 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>Relevé Mensuel</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScreenPod>
      )}

      {activeScreenTab === 'invoices' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'سجل الفواتير الصادرة' : 'Factures & Bons de Caisse Émis'}
            language={language}
            liveRegionText={`${filteredInvoices.length} ${isAr ? 'فاتورة' : 'factures'}`}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الفاتورة، الزبون، الترقيم...' : 'Rechercher N° facture, client, matricule...'}
            hasActiveAdvancedFilters={branchFilter !== 'All'}
            activeFiltersCount={branchFilter !== 'All' ? 1 : 0}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle
            onExport={handleExportCsv}
            activeChips={
              branchFilter !== 'All'
                ? [
                    {
                      key: 'branch',
                      label: `${isAr ? 'الفرع' : 'Succursale'}: ${branchFilter}`,
                      onRemove: () => setBranchFilter('All'),
                    },
                  ]
                : []
            }
            onResetAllFilters={handleResetAllFilters}
          />

          <UniversalDataCollection
            hideToolbar
            items={filteredInvoices}
            keyExtractor={(inv) => inv.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            columns={invoiceColumns}
            onItemClick={(inv) => {
              setActivePrintInvoice(inv);
              setIsPrintModalOpen(true);
            }}
            getRowMeta={getInvoiceRowMeta}
            getFanActions={getInvoiceFanActions}
            getDetailActions={getInvoiceDetailActions}
            customActions={(inv) => [
              {
                id: 'print',
                label: 'Imprimer',
                icon: <Printer size={13} />,
                variant: 'primary',
                onClick: () => {
                  setActivePrintInvoice(inv);
                  setIsPrintModalOpen(true);
                },
              },
            ]}
          />
        </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeScreenTab === 'invoices' ? filteredInvoices.length : sortedBillingOrders.length}
        entityPluralLabel={activeScreenTab === 'invoices' ? 'factures' : 'ordres de réparation'}
        hasActiveFilters={billingFilter !== 'all' || hasAdvancedFilters}
        onResetFilters={handleResetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeOrder)}
        item={activeOrder}
        allItems={sortedBillingOrders}
        keyExtractor={(o) => o.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeOrder ? `${activeOrder.orderNumber} · ${activeOrder.vehiclePlate}` : ''}
        subtitle={activeOrder ? `${activeOrder.clientName} · ${activeOrder.vehicleModel}` : ''}
        categoryLabel={
          activeOrder?.clientType === 'corporate_fleet'
            ? activeOrder.fleetName || 'Flotte B2B'
            : isAr
            ? 'زبون فردي'
            : 'Particulier'
        }
        avatarText={activeOrder?.orderNumber.slice(-2) || 'OR'}
        branchName={activeOrder ? resolveRecordBranch(activeOrder, branchesById, currentBranch, language).name : ''}
        statusLabel={
          activeOrder?.isPaid || activeOrder?.status === 'Delivered'
            ? isAr
              ? 'مسوى'
              : 'Réglé'
            : isAr
            ? 'قيد التحصيل'
            : 'À Encaisser'
        }
        statusClassName={
          activeOrder?.isPaid || activeOrder?.status === 'Delivered'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'facturation', label: isAr ? 'الفوترة' : 'Facturation' },
          { id: 'client', label: isAr ? 'الزبون' : 'Client & Atelier' },
          { id: 'actions', label: isAr ? 'التسوية' : 'Règlement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(item) => setInspectedOrder(item)}
        onClose={() => setInspectedOrder(null)}
        renderBody={(o, tab) => {
          const settled = o.status === 'Delivered' || Boolean(o.isPaid);
          const labor = o.laborCostDzd || 3750;
          const partsCost = o.partsCostDzd || 15500;
          const existingInv = o.invoiceId ? invoices.find((i) => i.id === o.invoiceId) : null;

          if (tab === 'client') {
            return (
              <InspectorSection index={0} title={isAr ? 'معلومات الحساب والورشة' : 'Compte Client & Atelier'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label="Compte Client"
                    value={o.clientType === 'corporate_fleet' ? `Flotte B2B (${o.fleetName})` : 'Particulier'}
                    mono={false}
                  />
                  <InspectorKeyValue label="Nom Client" value={o.clientName} mono={false} />
                  <InspectorKeyValue label="Téléphone" value={o.clientPhone} />
                  <InspectorKeyValue label="Véhicule" value={`${o.vehiclePlate} · ${o.vehicleModel}`} />
                  <InspectorKeyValue label="Technicien" value={o.technicianName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجراءات التحصيل' : 'Actions de Caisse'}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'settle',
                        label: settled ? 'Rééditer DGI' : 'Encaisser DGI',
                        icon: <CreditCard className="w-[18px] h-[18px]" />,
                        primary: true,
                        onClick: () => openSettlementModal(o),
                      },
                      ...(existingInv
                        ? [
                            {
                              id: 'print',
                              label: 'Imprimer',
                              icon: <Printer className="w-[18px] h-[18px]" />,
                              onClick: () => {
                                setActivePrintInvoice(existingInv);
                                setIsPrintModalOpen(true);
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'تأكيد الفاتورة' : 'Document Fiscal'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label="Régime"
                      value={existingInv?.billingType === 'bon_caisse' ? 'Bon de Caisse' : 'Facture DGI (19% TVA)'}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label="N° Facture"
                      value={existingInv?.invoiceNumber || 'Non émise'}
                      tone={existingInv ? 'ok' : 'warn'}
                      isLast
                    />
                  </InspectorCard>
                  <div className="mt-3">
                    {!settled ? (
                      <InspectorWideButton
                        variant="accent"
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => openSettlementModal(o)}
                      >
                        {isAr ? 'تحصيل وإصدار الفاتورة DGI' : 'Encaisser & Facturer (DGI)'}
                      </InspectorWideButton>
                    ) : existingInv ? (
                      <InspectorWideButton
                        icon={<Printer className="w-4 h-4" />}
                        onClick={() => {
                          setActivePrintInvoice(existingInv);
                          setIsPrintModalOpen(true);
                        }}
                      >
                        {isAr ? 'طباعة الفاتورة' : `Imprimer (${existingInv.invoiceNumber})`}
                      </InspectorWideButton>
                    ) : (
                      <InspectorWideButton
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => openSettlementModal(o)}
                      >
                        {isAr ? 'إعادة إصدار فاتورة' : 'Émettre Facture DGI'}
                      </InspectorWideButton>
                    )}
                  </div>
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                  tone={settled ? 'ok' : 'accent'}
                  caption={settled ? 'Règlement soldé & livré' : 'Montant atelier TTC en attente d’encaissement'}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفصيل الفاتورة' : 'Décompte Atelier HT'}>
                <InspectorCard>
                  <InspectorKeyValue label="Main d'œuvre HT" value={formatMoney(labor, language)} />
                  <InspectorKeyValue label="Pièces utilisées HT" value={formatMoney(partsCost, language)} />
                  <InspectorKeyValue
                    label="Total Atelier"
                    value={formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                    tone="accent"
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2}>
                {!settled ? (
                  <InspectorWideButton
                    variant="accent"
                    icon={<CreditCard className="w-4 h-4" />}
                    onClick={() => openSettlementModal(o)}
                  >
                    {isAr ? 'تحصيل وإصدار الفاتورة DGI' : 'Encaisser & Facturer (DGI)'}
                  </InspectorWideButton>
                ) : existingInv ? (
                  <InspectorWideButton
                    icon={<Printer className="w-4 h-4" />}
                    onClick={() => {
                      setActivePrintInvoice(existingInv);
                      setIsPrintModalOpen(true);
                    }}
                  >
                    {isAr ? 'طباعة الفاتورة' : `Imprimer (${existingInv.invoiceNumber})`}
                  </InspectorWideButton>
                ) : (
                  <InspectorWideButton
                    icon={<CreditCard className="w-4 h-4" />}
                    onClick={() => openSettlementModal(o)}
                  >
                    {isAr ? 'إعادة إصدار فاتورة' : 'Émettre Facture DGI'}
                  </InspectorWideButton>
                )}
              </InspectorSection>
            </>
          );
        }}
      />

      {isPaymentModalOpen && orderToSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black dark:text-white">
                    {isAr ? 'تسوية المستحقات وإصدار الفاتورة' : 'Règlement Financier & Facturation'}
                  </h3>
                  <span className="text-xs text-black/55 dark:text-white/55 font-mono">
                    {orderToSettle.orderNumber} · {orderToSettle.vehiclePlate}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleExecutePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBillingType('facture_dgi')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    billingType === 'facture_dgi' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/55 dark:text-white/55'
                  }`}
                >
                  Facture DGI (19% TVA)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType('bon_caisse')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    billingType === 'bon_caisse' ? 'bg-[#d4522f] text-white shadow-xs' : 'text-black/55 dark:text-white/55'
                  }`}
                >
                  Bon de Caisse (Atelier)
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black/70 dark:text-white/75 block">Mode de Paiement</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(
                    [
                      { id: 'especes', label: 'Espèces (Cash)' },
                      { id: 'cib_dahabia', label: 'Carte CIB/Dahabia' },
                      { id: 'cheque', label: 'Chèque' },
                      { id: 'virement', label: 'Virement' },
                    ] as const
                  ).map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                        paymentMethod === pm.id
                          ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                          : 'border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-black/55 dark:text-white/55">
                  <span>Main d'œuvre :</span>
                  <span>{formatMoney(orderToSettle.laborCostDzd || 3750, language)}</span>
                </div>
                <div className="flex justify-between text-black/55 dark:text-white/55">
                  <span>Pièces utilisées :</span>
                  <span>{formatMoney(orderToSettle.partsCostDzd || 15500, language)}</span>
                </div>
                {billingType === 'facture_dgi' && (
                  <div className="flex justify-between text-black/55 dark:text-white/55">
                    <span>TVA Réglementaire (19%) :</span>
                    <span className="text-[#d4522f] font-bold">
                      {formatMoney((orderToSettle.finalCostDzd || 19250) * 0.19, language)}
                    </span>
                  </div>
                )}
                {paymentMethod === 'especes' && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400">
                    <span>Droit de Timbre Fiscal (Espèces) :</span>
                    <span className="font-bold">
                      {formatMoney(
                        computeAlgerianTimbreFiscal(
                          (orderToSettle.finalCostDzd || 19250) * (billingType === 'facture_dgi' ? 1.19 : 1),
                          'especes'
                        ),
                        language
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-sm font-black text-black dark:text-white">
                  <span>Net à Payer Client :</span>
                  <span className="text-[#d4522f]">
                    {formatMoney(
                      (orderToSettle.finalCostDzd || 19250) * (billingType === 'facture_dgi' ? 1.19 : 1) +
                        (paymentMethod === 'especes'
                          ? computeAlgerianTimbreFiscal(
                              (orderToSettle.finalCostDzd || 19250) * (billingType === 'facture_dgi' ? 1.19 : 1),
                              'especes'
                            )
                          : 0),
                      language
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" icon={<CheckCircle2 size={15} />}>
                  Valider l'Encaissement & Imprimer
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPrintModalOpen && activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-neutral-200 text-black space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4 border-neutral-200">
              <div>
                <h2 className="text-xl font-black tracking-tight text-black">ATRIUM AUTO GARAGE & FLEET DZ</h2>
                <p className="text-xs text-black/55 mt-0.5">Réparation Mécanique, Électricité & Maintenance Flottes B2B</p>
                <div className="text-[10px] text-black/55 font-mono mt-1 space-x-2">
                  <span>RC: 16/00-0987654B20</span>
                  <span>·</span>
                  <span>NIF: 002016012345678</span>
                  <span>·</span>
                  <span>NIS: 00201601234</span>
                  <span>·</span>
                  <span>AI: 16012345678</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-black text-[#d4522f] block">
                  {activePrintInvoice.invoiceNumber}
                </span>
                <span className="text-xs text-black/55 block font-mono">
                  {new Date(activePrintInvoice.issuedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 text-xs font-mono">
              <div>
                <span className="text-black/55 block">Client / Bénéficiaire :</span>
                <span className="font-bold text-black block text-sm">{activePrintInvoice.clientName}</span>
                <span className="text-black/55">{activePrintInvoice.clientPhone}</span>
                {activePrintInvoice.clientNif && (
                  <span className="text-black/55 block">NIF Client: {activePrintInvoice.clientNif}</span>
                )}
              </div>
              <div>
                <span className="text-black/55 block">Véhicule Pris en Charge :</span>
                <span className="font-bold text-black block text-sm">{activePrintInvoice.vehiclePlate}</span>
                <span className="text-black/55">{activePrintInvoice.vehicleModel}</span>
                <span className="text-black/55 block">Réf OR: {activePrintInvoice.orderNumber}</span>
              </div>
            </div>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-300 text-black/55 text-left">
                  <th className="py-2">Désignation des Prestations & Pièces</th>
                  <th className="py-2 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2.5">Main d'œuvre mécanique spécialisée & diagnostic</td>
                  <td className="py-2.5 text-right font-bold">{activePrintInvoice.laborTotalHt.toLocaleString()} DA</td>
                </tr>
                <tr>
                  <td className="py-2.5">Pièces de rechange et lubrifiants certifiés conformes</td>
                  <td className="py-2.5 text-right font-bold">{activePrintInvoice.partsTotalHt.toLocaleString()} DA</td>
                </tr>
                {activePrintInvoice.discountHt > 0 && (
                  <tr className="text-emerald-700">
                    <td className="py-2.5">Remise commerciale accordée</td>
                    <td className="py-2.5 text-right font-bold">-{activePrintInvoice.discountHt.toLocaleString()} DA</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t border-neutral-200 pt-3 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-black/55">
                  <span>Total HT :</span>
                  <span>{activePrintInvoice.subtotalHt.toLocaleString()} DA</span>
                </div>
                {activePrintInvoice.tvaAmount > 0 && (
                  <div className="flex justify-between text-black/55">
                    <span>TVA (19%) :</span>
                    <span>{activePrintInvoice.tvaAmount.toLocaleString()} DA</span>
                  </div>
                )}
                {activePrintInvoice.timbreFiscal > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Timbre Fiscal (Espèces) :</span>
                    <span>{activePrintInvoice.timbreFiscal.toLocaleString()} DA</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-300 text-sm font-black text-black">
                  <span>Net à Payer :</span>
                  <span className="text-[#d4522f]">{activePrintInvoice.netToPayDzd.toLocaleString()} DA</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-black/75 font-serif italic border border-neutral-200">
              Arrêté la présente facture à la somme de : {activePrintInvoice.netToPayDzd.toLocaleString()} Dinars Algériens.
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <div className="text-center w-40 border border-neutral-300 rounded-xl p-2 h-20 text-[10px] text-black/55">
                Cachet de l'Atelier
              </div>
              <div className="flex items-center gap-2">
                <AtriumButton variant="secondary" onClick={() => setIsPrintModalOpen(false)}>
                  Fermer
                </AtriumButton>
                <AtriumButton variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>
                  Imprimer Document
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <Wallet size={16} className="text-[#d4522f]" />
                <span>Point de Caisse Journalier (Z de Caisse)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTillModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="text-black/55 dark:text-white/55 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
                <span>Total Espèces en Caisse :</span>
                <span className="font-bold text-emerald-600">
                  {formatMoney(
                    invoices.filter((i) => i.paymentMethod === 'especes').reduce((acc, i) => acc + i.netToPayDzd, 0),
                    language
                  )}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
                <span>Total Cartes CIB / Dahabia :</span>
                <span className="font-bold text-blue-600">
                  {formatMoney(
                    invoices.filter((i) => i.paymentMethod === 'cib_dahabia').reduce((acc, i) => acc + i.netToPayDzd, 0),
                    language
                  )}
                </span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex justify-between">
                <span>Total Chèques & Virements :</span>
                <span className="font-bold text-black dark:text-white">
                  {formatMoney(
                    invoices
                      .filter((i) => i.paymentMethod === 'cheque' || i.paymentMethod === 'virement')
                      .reduce((acc, i) => acc + i.netToPayDzd, 0),
                    language
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton variant="secondary" onClick={() => setIsTillModalOpen(false)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={() => {
                  showToast({
                    type: 'success',
                    title: 'Z de Caisse',
                    message: 'Session de caisse clôturée et rapport Z imprimé',
                  });
                  setIsTillModalOpen(false);
                }}
              >
                Clôturer la Caisse (Z)
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
