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
  Pin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
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
    currentBusinessConfig,
    branches,
    isSyncing,
    networkMode,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode,
      isSyncTimeout: s.isSyncTimeout,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const configuredTvaRate = currentBusinessConfig.defaultTvaRate ?? 19;
  const applyTimbre = currentBusinessConfig.applyTimbreFiscal !== false;
  const workshopHourlyRate = currentBusinessConfig.categorySettings?.workshopHourlyRateDzd ?? 2500;
  const defaultLaborFallback = Math.round(workshopHourlyRate * 1.5);
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
  const [pinnedOrderIds, setPinnedOrderIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedInvoiceIds, setPinnedInvoiceIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleOrderPin = useCallback(
    (id: string) => {
      setPinnedOrderIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast({
          type: 'info',
          title: nowPinned ? (isAr ? 'تم التثبيت' : 'OR Épinglé') : (isAr ? 'تم إلغاء التثبيت' : 'OR Désépinglé'),
          message: nowPinned ? (isAr ? 'تمت إضافة الأمر للأعلى' : 'Ordre prioritaire en tête de liste') : (isAr ? 'تمت الإزالة من الأعلى' : 'Ordre retiré des épinglés'),
        });
        return next;
      });
    },
    [isAr]
  );

  const toggleInvoicePin = useCallback(
    (id: string) => {
      setPinnedInvoiceIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast({
          type: 'info',
          title: nowPinned ? (isAr ? 'تم التثبيت' : 'Facture Épinglée') : (isAr ? 'تم إلغاء التثبيت' : 'Facture Désépinglée'),
          message: nowPinned ? (isAr ? 'تم تثبيت الفاتورة بالأعلى' : 'Facture maintenue en tête') : (isAr ? 'تم إلغاء التثبيت' : 'Facture retirée des épinglés'),
        });
        return next;
      });
    },
    [isAr]
  );

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
      const aPinned = pinnedOrderIds.has(a.id);
      const bPinned = pinnedOrderIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
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
  }, [filteredBillingOrders, pinnedOrderIds, sortBy, sortDir, branchesById, currentBranch, language]);

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

  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices];
    list.sort((a, b) => {
      const aPinned = pinnedInvoiceIds.has(a.id);
      const bPinned = pinnedInvoiceIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
    return list;
  }, [filteredInvoices, pinnedInvoiceIds]);

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
      orderToSettle.laborCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * 0.25 : defaultLaborFallback);
    const partsHt =
      orderToSettle.partsCostDzd || (orderToSettle.finalCostDzd ? orderToSettle.finalCostDzd * 0.75 : 15500);
    const disc = parseFloat(discountAmount) || 0;
    const subtotalHt = Math.max(0, laborHt + partsHt - disc);
    const tva = billingType === 'facture_dgi' ? Math.round(subtotalHt * (configuredTvaRate / 100)) : 0;
    const ttc = subtotalHt + tva;
    const timbre = applyTimbre ? computeAlgerianTimbreFiscal(ttc, paymentMethod) : 0;
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
      tvaRate: billingType === 'facture_dgi' ? configuredTvaRate : 0,
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
    (o: RepairOrder): Partial<KineticRowData> => {
      const settled = o.status === 'Delivered' || Boolean(o.isPaid);
      const br = resolveRecordBranch(o, branchesById, currentBranch, language);
      return {
        isPinned: pinnedOrderIds.has(o.id),
        title: `${o.orderNumber} · ${o.vehiclePlate}`,
        subline: `${o.clientName} · ${o.vehicleModel}`,
        categoryLabel: o.bayName || (isAr ? 'الورشة' : isEn ? 'Workshop' : 'Atelier'),
        statusLabel: settled
          ? isAr ? 'مسوى' : isEn ? 'Settled' : 'Réglé'
          : isAr ? 'قيد التحصيل' : isEn ? 'Pending' : 'À Encaisser',
        statusVariant: settled ? 'active' : 'warning',
        metricPrimary: formatMoney(o.finalCostDzd || o.estimatedCostDzd, language),
        metricSecondary: br.name,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'العميل والمركبة' : isEn ? 'Client & Vehicle' : 'Client & Véhicule',
          primaryText: o.clientName,
          secondaryText: `${o.vehicleModel} · ${o.vehiclePlate}`,
        },
        detailCol2: {
          heading: isAr ? 'التكلفة والوضع' : isEn ? 'Amount & Type' : 'Montant & Type',
          primaryText: formatMoney(o.finalCostDzd || o.estimatedCostDzd, language),
          secondaryText:
            o.clientType === 'corporate_fleet'
              ? isAr ? 'أسطول B2B' : isEn ? 'Fleet B2B' : 'Flotte B2B'
              : isAr ? 'فردي' : isEn ? 'Individual' : 'Particulier',
        },
        detailCol3: {
          heading: isAr ? 'الفرع والورشة' : isEn ? 'Branch & Bay' : 'Succursale & Pont',
          primaryText: br.name,
          secondaryText: o.bayName || o.technicianName || '—',
        },
      };
    },
    [pinnedOrderIds, branchesById, currentBranch, language, isAr, isEn]
  );

  const getOrderFanActions = useCallback(
    (o: RepairOrder): KineticRowFanAction[] => [
      {
        id: 'settle',
        label: o.isPaid || o.status === 'Delivered' ? 'Facturer' : 'Encaisser',
        icon: <CreditCard size={14} />,
        onClick: () => openSettlementModal(o),
      },
      {
        id: 'pin',
        label: pinnedOrderIds.has(o.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} className={pinnedOrderIds.has(o.id) ? 'fill-current' : ''} />,
        onClick: () => toggleOrderPin(o.id),
      },
    ],
    [openSettlementModal, pinnedOrderIds, toggleOrderPin, isAr]
  );

  const getOrderDetailActions = useCallback(
    (o: RepairOrder): KineticDetailAction[] => [
      {
        id: 'settle',
        label: o.isPaid || o.status === 'Delivered' ? 'Rééditer Facture DGI' : 'Encaisser & Facturer',
        icon: <CreditCard size={14} />,
        onClick: () => openSettlementModal(o),
      },
      {
        id: 'pin',
        label: pinnedOrderIds.has(o.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} className={pinnedOrderIds.has(o.id) ? 'fill-current' : ''} />,
        onClick: () => toggleOrderPin(o.id),
      },
    ],
    [openSettlementModal, pinnedOrderIds, toggleOrderPin, isAr]
  );

  const getInvoiceRowMeta = useCallback(
    (inv: GarageInvoice): Partial<KineticRowData> => {
      const br = resolveRecordBranch(inv, branchesById, currentBranch, language);
      return {
        isPinned: pinnedInvoiceIds.has(inv.id),
        title: `${inv.invoiceNumber} · ${inv.clientName}`,
        subline: `${inv.vehiclePlate} · ${inv.orderNumber}`,
        categoryLabel: inv.billingType === 'facture_dgi' ? 'Facture DGI' : 'Bon Caisse',
        statusLabel: inv.billingType === 'facture_dgi' ? `DGI ${inv.tvaRate}%` : 'Bon Caisse',
        statusVariant: inv.billingType === 'facture_dgi' ? 'info' : 'neutral',
        metricPrimary: formatMoney(inv.netToPayDzd, language),
        metricSecondary: br.name,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'العميل والمركبة' : isEn ? 'Client & Vehicle' : 'Client & Véhicule',
          primaryText: inv.clientName,
          secondaryText: `${inv.vehiclePlate} · ${inv.vehicleModel}`,
        },
        detailCol2: {
          heading: isAr ? 'الصافي والرسوم' : isEn ? 'Net & Tax' : 'Net TTC & Timbre',
          primaryText: formatMoney(inv.netToPayDzd, language),
          secondaryText: `TVA ${inv.tvaRate}% · Timbre ${formatMoney(inv.timbreFiscal, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'الدفع والفرع' : isEn ? 'Payment & Branch' : 'Paiement & Succursale',
          primaryText: inv.paymentMethod,
          secondaryText: br.name,
        },
      };
    },
    [pinnedInvoiceIds, branchesById, currentBranch, language, isAr, isEn]
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
      {
        id: 'pin',
        label: pinnedInvoiceIds.has(inv.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} className={pinnedInvoiceIds.has(inv.id) ? 'fill-current' : ''} />,
        onClick: () => toggleInvoicePin(inv.id),
      },
    ],
    [pinnedInvoiceIds, toggleInvoicePin, isAr]
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
      {
        id: 'pin',
        label: pinnedInvoiceIds.has(inv.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} className={pinnedInvoiceIds.has(inv.id) ? 'fill-current' : ''} />,
        onClick: () => toggleInvoicePin(inv.id),
      },
    ],
    [isAr, pinnedInvoiceIds, toggleInvoicePin]
  );

  const orderColumns: ColumnDefinition<RepairOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'N° OR',
        width: '1.2*',
        sortable: true,
        renderCell: (o) => <span className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{o.orderNumber}</span>,
      },
      {
        key: 'vehicle',
        header: isAr ? 'المركبة والترقيم' : 'Véhicule & Immatriculation',
        width: '2*',
        sortable: true,
        renderCell: (o) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block tabular-nums">{o.vehiclePlate}</span>
            <span className="t-cap text-black/55 dark:text-white/55 block truncate">{o.vehicleModel}</span>
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
            <span className="font-medium t-small text-black dark:text-white block truncate">{o.clientName}</span>
            <span className="t-cap text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
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
          return <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">{info.name}</span>;
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
              className={`t-small px-2.5 py-1 rounded-full font-semibold ${
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
          <div className="text-right tabular-nums font-semibold t-small text-black dark:text-white">
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
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0"
            >
              <Receipt size={15} />
            </div>
            <div>
              <span className="tabular-nums font-semibold t-small text-black dark:text-white block">{inv.invoiceNumber}</span>
              <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{inv.orderNumber}</span>
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
            <span className="font-semibold t-small text-black dark:text-white block">{inv.clientName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
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
          return <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">{info.name}</span>;
        },
      },
      {
        key: 'type',
        header: 'Régime Fiscal',
        width: '1.4*',
        renderCell: (inv) => (
          <span
            className={`px-2 py-1 rounded-full t-small font-semibold ${
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
          <div className="text-right tabular-nums">
            <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">{formatMoney(inv.netToPayDzd, language)}</span>
            <span className="t-cap text-black/55 dark:text-white/55">
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
          <div
            data-sq="ctl"
            data-sq-border="solid"
            className="flex items-center gap-1 p-[3px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          >
            <button
              type="button"
              data-no-liquid="true"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => setActiveScreenTab('orders')}
              className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer ${
                activeScreenTab === 'orders'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {isAr ? 'تسوية' : isEn ? 'Orders' : 'Ordres'}
            </button>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => setActiveScreenTab('fleets')}
              className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer ${
                activeScreenTab === 'fleets'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {isAr ? 'أساطيل' : isEn ? 'Fleets' : 'Flottes'}
            </button>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="thumb"
              data-sq-border="none"
              onClick={() => setActiveScreenTab('invoices')}
              className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer ${
                activeScreenTab === 'invoices'
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
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
            isPinned={(o) => pinnedOrderIds.has(o.id)}
            onTogglePin={(o) => toggleOrderPin(o.id)}
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
                <div key={fleet.id} className="sq-elev-card">
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-5 bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                        Contrat B2B Flotte · {fleetBranch.name}
                      </span>
                      <h3 className="font-semibold t-label text-black dark:text-white mt-0.5">{fleet.companyName}</h3>
                      <span className="t-cap text-black/55 dark:text-white/55">{fleet.tradeName}</span>
                    </div>
                    <span
                      data-sq="tile"
                      data-sq-border="none"
                      className="p-2 bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75"
                    >
                      <Building2 size={18} />
                    </span>
                  </div>
                  <div className="space-y-2 t-cap tabular-nums">
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
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex justify-between t-cap tabular-nums">
                      <span className="text-black/55 dark:text-white/55">Encours Actuel :</span>
                      <span className={`font-semibold ${isOverLimit ? 'text-rose-600' : 'text-black dark:text-white'}`}>
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
                    <div className="flex justify-between t-cap text-black/55 dark:text-white/55 tabular-nums">
                      <span>Plafond: {formatMoney(fleet.creditLimitDzd, language)}</span>
                      <span>{percentUsed}% utilisé</span>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      data-no-liquid="true"
                      data-sq="ctl-sm"
                      data-sq-border="none"
                      onClick={() => {
                        showToast({
                          type: 'info',
                          title: fleet.tradeName,
                          message: `Génération du relevé mensuel pour ${fleet.companyName}...`,
                        });
                      }}
                      className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black/70 dark:text-white/75 font-semibold t-small flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>Relevé Mensuel</span>
                    </button>
                  </div>
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
            items={sortedInvoices}
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
            isPinned={(inv) => pinnedInvoiceIds.has(inv.id)}
            onTogglePin={(inv) => toggleInvoicePin(inv.id)}
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
                        tone="accent"
                        label={isAr ? 'تحصيل وإصدار الفاتورة DGI' : 'Encaisser & Facturer (DGI)'}
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => openSettlementModal(o)}
                      />
                    ) : existingInv ? (
                      <InspectorWideButton
                        label={isAr ? 'طباعة الفاتورة' : `Imprimer (${existingInv.invoiceNumber})`}
                        icon={<Printer className="w-4 h-4" />}
                        onClick={() => {
                          setActivePrintInvoice(existingInv);
                          setIsPrintModalOpen(true);
                        }}
                      />
                    ) : (
                      <InspectorWideButton
                        label={isAr ? 'إعادة إصدار فاتورة' : 'Émettre Facture DGI'}
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => openSettlementModal(o)}
                      />
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
                    tone="accent"
                    label={isAr ? 'تحصيل وإصدار الفاتورة DGI' : 'Encaisser & Facturer (DGI)'}
                    icon={<CreditCard className="w-4 h-4" />}
                    onClick={() => openSettlementModal(o)}
                  />
                ) : existingInv ? (
                  <InspectorWideButton
                    label={isAr ? 'طباعة الفاتورة' : `Imprimer (${existingInv.invoiceNumber})`}
                    icon={<Printer className="w-4 h-4" />}
                    onClick={() => {
                      setActivePrintInvoice(existingInv);
                      setIsPrintModalOpen(true);
                    }}
                  />
                ) : (
                  <InspectorWideButton
                    label={isAr ? 'إعادة إصدار فاتورة' : 'Émettre Facture DGI'}
                    icon={<CreditCard className="w-4 h-4" />}
                    onClick={() => openSettlementModal(o)}
                  />
                )}
              </InspectorSection>
            </>
          );
        }}
      />

      {isPaymentModalOpen && orderToSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="sq-elev-pop max-w-lg w-full">
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-5"
          >
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div
                  data-sq="tile"
                  data-sq-border="none"
                  className="w-9 h-9 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center"
                >
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-semibold t-label text-black dark:text-white">
                    {isAr ? 'تسوية المستحقات وإصدار الفاتورة' : 'Règlement Financier & Facturation'}
                  </h3>
                  <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                    {orderToSettle.orderNumber} · {orderToSettle.vehiclePlate}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleExecutePayment} className="space-y-4">
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="grid grid-cols-2 gap-1 p-[3px] bg-neutral-100 dark:bg-neutral-800"
              >
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="thumb"
                  data-sq-border="none"
                  onClick={() => setBillingType('facture_dgi')}
                  className={`py-2 t-small font-semibold transition-all cursor-pointer ${
                    billingType === 'facture_dgi' ? 'bg-[var(--brand-fill,#C9461F)] text-white' : 'text-black/55 dark:text-white/55'
                  }`}
                >
                  Facture DGI (19% TVA)
                </button>
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="thumb"
                  data-sq-border="none"
                  onClick={() => setBillingType('bon_caisse')}
                  className={`py-2 t-small font-semibold transition-all cursor-pointer ${
                    billingType === 'bon_caisse' ? 'bg-[var(--brand-fill,#C9461F)] text-white' : 'text-black/55 dark:text-white/55'
                  }`}
                >
                  Bon de Caisse (Atelier)
                </button>
              </div>
              <div className="space-y-2">
                <label className="t-small font-semibold text-black/70 dark:text-white/75 block">Mode de Paiement</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 t-cap">
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
                      data-no-liquid="true"
                      data-sq="ctl"
                      data-sq-border="solid"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3 border font-semibold text-center transition-all cursor-pointer ${
                        paymentMethod === pm.id
                          ? 'border-[#d4522f] bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                          : 'border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-[#F3EDE7] dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2 t-cap tabular-nums"
              >
                <div className="flex justify-between text-black/55 dark:text-white/55">
                  <span>Main d'œuvre :</span>
                  <span>{formatMoney(orderToSettle.laborCostDzd || defaultLaborFallback, language)}</span>
                </div>
                <div className="flex justify-between text-black/55 dark:text-white/55">
                  <span>Pièces utilisées :</span>
                  <span>{formatMoney(orderToSettle.partsCostDzd || 15500, language)}</span>
                </div>
                {billingType === 'facture_dgi' && configuredTvaRate > 0 && (
                  <div className="flex justify-between text-black/55 dark:text-white/55">
                    <span>TVA Réglementaire ({configuredTvaRate}%) :</span>
                    <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
                      {formatMoney((orderToSettle.finalCostDzd || defaultLaborFallback + 15500) * (configuredTvaRate / 100), language)}
                    </span>
                  </div>
                )}
                {applyTimbre && paymentMethod === 'especes' && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400">
                    <span>Droit de Timbre Fiscal (Espèces) :</span>
                    <span className="font-semibold">
                      {formatMoney(
                        computeAlgerianTimbreFiscal(
                          (orderToSettle.finalCostDzd || defaultLaborFallback + 15500) *
                            (billingType === 'facture_dgi' ? 1 + configuredTvaRate / 100 : 1),
                          'especes'
                        ),
                        language
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 t-label font-semibold text-black dark:text-white">
                  <span>Net à Payer Client :</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                    {formatMoney(
                      (orderToSettle.finalCostDzd || defaultLaborFallback + 15500) *
                        (billingType === 'facture_dgi' ? 1 + configuredTvaRate / 100 : 1) +
                        (applyTimbre && paymentMethod === 'especes'
                          ? computeAlgerianTimbreFiscal(
                              (orderToSettle.finalCostDzd || defaultLaborFallback + 15500) *
                                (billingType === 'facture_dgi' ? 1 + configuredTvaRate / 100 : 1),
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
        </div>
      )}

      {isPrintModalOpen && activePrintInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="printable-document bg-white rounded-[var(--r-panel,28px)] max-w-2xl w-full p-8 shadow-2xl border border-neutral-200 text-black space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4 border-neutral-200">
              <div>
                <h2 className="t-dialog font-semibold text-black">ATRIUM AUTO GARAGE & FLEET DZ</h2>
                <p className="t-cap text-black/55 mt-0.5">Réparation Mécanique, Électricité & Maintenance Flottes B2B</p>
                <div className="t-cap text-black/55 tabular-nums mt-1 space-x-2">
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
                <span className="tabular-nums t-card font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                  {activePrintInvoice.invoiceNumber}
                </span>
                <span className="t-cap text-black/55 block tabular-nums">
                  {new Date(activePrintInvoice.issuedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-[var(--r-card,16px)] bg-neutral-50 t-cap tabular-nums">
              <div>
                <span className="text-black/55 block">Client / Bénéficiaire :</span>
                <span className="font-semibold text-black block t-label">{activePrintInvoice.clientName}</span>
                <span className="text-black/55">{activePrintInvoice.clientPhone}</span>
                {activePrintInvoice.clientNif && (
                  <span className="text-black/55 block">NIF Client: {activePrintInvoice.clientNif}</span>
                )}
              </div>
              <div>
                <span className="text-black/55 block">Véhicule Pris en Charge :</span>
                <span className="font-semibold text-black block t-label">{activePrintInvoice.vehiclePlate}</span>
                <span className="text-black/55">{activePrintInvoice.vehicleModel}</span>
                <span className="text-black/55 block">Réf OR: {activePrintInvoice.orderNumber}</span>
              </div>
            </div>
            <table className="w-full t-cap tabular-nums">
              <thead>
                <tr className="border-b border-neutral-300 text-black/55 text-left">
                  <th className="py-2">Désignation des Prestations & Pièces</th>
                  <th className="py-2 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2">Main d'œuvre mécanique spécialisée & diagnostic</td>
                  <td className="py-2 text-right font-semibold">{activePrintInvoice.laborTotalHt.toLocaleString()} DA</td>
                </tr>
                <tr>
                  <td className="py-2">Pièces de rechange et lubrifiants certifiés conformes</td>
                  <td className="py-2 text-right font-semibold">{activePrintInvoice.partsTotalHt.toLocaleString()} DA</td>
                </tr>
                {activePrintInvoice.discountHt > 0 && (
                  <tr className="text-emerald-700">
                    <td className="py-2">Remise commerciale accordée</td>
                    <td className="py-2 text-right font-semibold">-{activePrintInvoice.discountHt.toLocaleString()} DA</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-t border-neutral-200 pt-3 flex justify-end">
              <div className="w-64 space-y-2 t-cap tabular-nums">
                <div className="flex justify-between text-black/55">
                  <span>Total HT :</span>
                  <span>{activePrintInvoice.subtotalHt.toLocaleString()} DA</span>
                </div>
                {activePrintInvoice.tvaAmount > 0 && (
                  <div className="flex justify-between text-black/55">
                    <span>TVA ({activePrintInvoice.tvaRate}%) :</span>
                    <span>{activePrintInvoice.tvaAmount.toLocaleString()} DA</span>
                  </div>
                )}
                {activePrintInvoice.timbreFiscal > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Timbre Fiscal (Espèces) :</span>
                    <span>{activePrintInvoice.timbreFiscal.toLocaleString()} DA</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-300 t-label font-semibold text-black">
                  <span>Net à Payer :</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{activePrintInvoice.netToPayDzd.toLocaleString()} DA</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] t-cap text-black/75 italic border border-neutral-200">
              Arrêté la présente facture à la somme de : {activePrintInvoice.netToPayDzd.toLocaleString()} Dinars Algériens.
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <div className="text-center w-40 border border-neutral-300 rounded-[var(--r-ctl,12px)] p-2 h-20 t-cap text-black/55">
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
          <div className="sq-elev-pop max-w-md w-full">
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <h3 className="font-semibold t-label text-black dark:text-white flex items-center gap-2">
                <Wallet size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>Point de Caisse Journalier (Z de Caisse)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTillModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 t-cap tabular-nums">
              <div data-sq="card" data-sq-border="none" className="p-3 bg-neutral-50 dark:bg-neutral-800 flex justify-between">
                <span>Total Espèces en Caisse :</span>
                <span className="font-semibold text-emerald-600">
                  {formatMoney(
                    invoices.filter((i) => i.paymentMethod === 'especes').reduce((acc, i) => acc + i.netToPayDzd, 0),
                    language
                  )}
                </span>
              </div>
              <div data-sq="card" data-sq-border="none" className="p-3 bg-neutral-50 dark:bg-neutral-800 flex justify-between">
                <span>Total Cartes CIB / Dahabia :</span>
                <span className="font-semibold text-blue-600">
                  {formatMoney(
                    invoices.filter((i) => i.paymentMethod === 'cib_dahabia').reduce((acc, i) => acc + i.netToPayDzd, 0),
                    language
                  )}
                </span>
              </div>
              <div data-sq="card" data-sq-border="none" className="p-3 bg-neutral-50 dark:bg-neutral-800 flex justify-between">
                <span>Total Chèques & Virements :</span>
                <span className="font-semibold text-black dark:text-white">
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
        </div>
      )}
    </div>
  );
};
