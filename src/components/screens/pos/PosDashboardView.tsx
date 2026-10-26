import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  Coins,
  ArrowRight,
  Printer,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Plus,
  PlayCircle,
  FileText,
  Home,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  ShieldCheck,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Sale, Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Modal } from '../../ui/Modal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

type SalesFilterMode = 'all' | 'today' | 'refunded';

export const PosDashboardView: React.FC<PosDashboardViewProps> = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    products,
    sales,
    parkedOrders,
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    refundSale,
    resumeParkedOrder,
    resetPosMockData,
    receiptConfig,
    currentUser,
  } = useAtriumStore();

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer Request / Avoir');
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(new Set());
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<SalesFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'Tous' | 'Ventes' | 'Avoirs'>('Tous');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const posTips = useMemo(() => [
    {
      step: '1/4',
      title: language === 'ar' ? 'إغلاق الصندوق اليومي (Rapport Z)' : 'Clôture de Caisse & Rapport Z',
      desc: language === 'ar' ? 'قم بإنشاء وطباعة تقرير Z عند نهاية اليوم لمطابقة المبالغ النقدية وإرسال الحسابات.' : 'Générez et imprimez le rapport fiscal Z en fin de journée pour certifier le solde réel du tiroir-caisse.',
      btnLabel: language === 'ar' ? 'فتح تقرير Z' : 'Générer le Rapport Z',
      action: () => setIsZReportOpen(true),
    },
    {
      step: '2/4',
      title: language === 'ar' ? 'استئناف التذاكر المعلقة' : 'Gestion des Tickets en Pause',
      desc: language === 'ar' ? 'لديك طلبات معلقة بانتظار استكمال التسديد لتفادي طوابير الانتظار عند الصندوق.' : 'Reprenez les paniers mis en attente pour fluidifier la file sans perdre les articles scannés.',
      btnLabel: language === 'ar' ? 'Consulter les Paniers' : 'Voir les Paniers',
      action: () => setScreen('registrations'),
    },
    {
      step: '3/4',
      title: language === 'ar' ? 'تنبيهات انخفاض المخزون' : 'Réassort & Articles Critiques',
      desc: language === 'ar' ? 'توجد أصناف وصلت إلى حد إعادة الطلب. قم بإصدار طلب تموين جديد للمورد.' : 'Plusieurs références ont atteint le seuil d’alerte. Déclenchez un bon de commande fournisseur.',
      btnLabel: language === 'ar' ? 'فحص المخزون' : 'Vérifier l’Inventaire',
      action: () => setScreen('scheduler'),
    },
    {
      step: '4/4',
      title: language === 'ar' ? 'فتح جلسة بيع سريعة' : 'Mode Caisse Tactile',
      desc: language === 'ar' ? 'استخدم قارئ الباركود والاختصارات السريعة لتسريع عمليات البيع في ساعات الذروة.' : 'Basculez sur la caisse tactile pour accélérer les encaissements au comptoir avec douchette.',
      btnLabel: language === 'ar' ? 'Accéder à la Caisse' : 'Lancer la Caisse',
      action: () => setScreen('shop'),
    },
  ], [language, setScreen]);

  // Filter sales for current branch or retail
  const branchSales = useMemo(() => {
    return sales.filter(
      (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
    );
  }, [sales, currentBranch.id]);

  // Today's sales
  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => s.createdAt.startsWith(today));
  }, [branchSales]);

  // Hourly velocity distribution (08:00 - 23:00)
  const hourlySalesVelocity = useMemo(() => {
    const buckets = Array(10).fill(0);
    todaySales.forEach((s) => {
      const hour = new Date(s.createdAt).getHours();
      const bucketIdx = Math.min(9, Math.max(0, Math.floor(((hour - 8) / 14) * 10)));
      buckets[bucketIdx] += s.totalAmount > 0 ? 1 : 0;
    });
    const max = Math.max(...buckets, 1);
    return [20, 35, 55, 90, 85, 100, 65, 45, 25, 15].map((defaultHeight, idx) => {
      if (todaySales.length > 0 && buckets[idx] > 0) {
        return Math.max(15, Math.round((buckets[idx] / max) * 100));
      }
      return defaultHeight;
    });
  }, [todaySales]);

  // Recent activity sales for right bottom pod
  const recentActivitySales = useMemo(() => {
    return branchSales.filter((s) => {
      if (activityFilter === 'Ventes') return s.status !== 'Refunded';
      if (activityFilter === 'Avoirs') return s.status === 'Refunded';
      return true;
    }).slice(0, 5);
  }, [branchSales, activityFilter]);

  // Calculate POS metrics
  const posKpis = useMemo(() => {
    const activeTodaySales = todaySales.filter((s) => s.status !== 'Refunded');
    const totalTodayRevenue = activeTodaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalTransactions = activeTodaySales.length;
    const avgTicket = totalTransactions > 0 ? Math.round(totalTodayRevenue / totalTransactions) : 0;

    // Inventory metrics
    let totalStockUnits = 0;
    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.stockQuantity;
      inventoryRetailValue += p.price.amount * p.stockQuantity;
      const cost = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
      inventoryCostValue += cost * p.stockQuantity;
      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      } else if (p.stockQuantity <= (p.reorderLevel || 5)) {
        lowStockCount++;
      }
    });

    // Tender breakdown
    let cashVolume = 0;
    let cardVolume = 0;
    let baridiMobVolume = 0;
    let splitVolume = 0;

    activeTodaySales.forEach((s) => {
      if (s.paymentMethod === 'Cash') cashVolume += s.totalAmount;
      else if (s.paymentMethod === 'Card') cardVolume += s.totalAmount;
      else if (s.paymentMethod === 'BankTransfer' || (s.paymentMethod as string) === 'BaridiMob') baridiMobVolume += s.totalAmount;
      else if (s.paymentMethod === 'Split') splitVolume += s.totalAmount;
      else cashVolume += s.totalAmount;
    });

    const expectedCashInDrawer = 15000 + cashVolume;

    return {
      totalTodayRevenue,
      totalTransactions,
      avgTicket,
      totalStockUnits,
      inventoryRetailValue,
      inventoryCostValue,
      lowStockCount,
      outOfStockCount,
      cashVolume,
      cardVolume,
      baridiMobVolume,
      splitVolume,
      expectedCashInDrawer,
    };
  }, [todaySales, products]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    branchSales.forEach((s) => {
      if (s.status === 'Refunded') return;
      s.items.forEach((it) => {
        const existing = map.get(it.productId) || { name: it.productName, units: 0, revenue: 0 };
        existing.units += it.quantity;
        existing.revenue += it.totalPrice;
        map.set(it.productId, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
  }, [branchSales]);

  // Filtered sales for table
  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => {
      if (filterMode === 'today' && !s.createdAt.startsWith(today)) return false;
      if (filterMode === 'refunded' && s.status !== 'Refunded') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesCust = (s.memberName || '').toLowerCase().includes(q);
        const matchesPhone = (s.customerPhone || '').toLowerCase().includes(q);
        if (!matchesId && !matchesCust && !matchesPhone) return false;
      }
      return true;
    });
  }, [branchSales, filterMode, searchQuery]);

  // Sales Table Columns
  const salesColumns: ColumnDefinition<Sale>[] = useMemo(() => [
    {
      key: 'id',
      header: language === 'ar' ? 'رقم الوصل' : 'Ticket #',
      width: '140px',
      sortable: true,
      renderCell: (s) => (
        <div>
          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white block">
            #{s.id.slice(-6).toUpperCase()}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: language === 'ar' ? 'الزبون / العميل' : language === 'fr' ? 'Client' : 'Customer',
      minWidth: '170px',
      sortable: true,
      renderCell: (s) => (
        <div>
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
            {s.memberName || t('shop_receipt_walkin')}
          </div>
          {s.customerPhone && (
            <div className="text-[10px] text-neutral-400 font-mono truncate">
              {s.customerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'المحتويات' : language === 'fr' ? 'Articles' : 'Items',
      minWidth: '200px',
      renderCell: (s) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {s.items.slice(0, 2).map((it, idx) => (
            <span
              key={idx}
              className="text-[11px] text-neutral-600 dark:text-neutral-300 font-medium bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
            >
              {it.quantity}x {it.productName.split('(')[0].trim()}
            </span>
          ))}
          {s.items.length > 2 && (
            <span className="text-[10px] font-bold text-neutral-400">
              +{s.items.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'tender',
      header: language === 'ar' ? 'طريقة الدفع' : language === 'fr' ? 'Règlement' : 'Tender',
      width: '130px',
      sortable: true,
      renderCell: (s) => {
        const isCash = s.paymentMethod === 'Cash';
        const isCard = s.paymentMethod === 'Card';
        const label =
          isCash
            ? language === 'ar' ? 'نقداً (DZD)' : 'Espèces (DZD)'
            : isCard
            ? 'CIB / Edahabia'
            : s.paymentMethod;

        return (
          <div className="flex items-center gap-1.5 text-xs">
            {isCash ? (
              <Banknote size={14} className="text-emerald-500 shrink-0" />
            ) : isCard ? (
              <CreditCard size={14} className="text-blue-500 shrink-0" />
            ) : (
              <Coins size={14} className="text-[#C4785A] shrink-0" />
            )}
            <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المبلغ الصافي' : language === 'fr' ? 'Total Payé' : 'Total Net',
      width: '140px',
      sortable: true,
      renderCell: (s) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(s.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : 'Statut',
      width: '120px',
      sortable: true,
      renderCell: (s) => {
        const isRefunded = s.status === 'Refunded';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isRefunded
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {isRefunded
              ? language === 'ar' ? 'مسترجع (Avoir)' : 'Remboursé'
              : language === 'ar' ? 'مسدد' : 'Encaissé'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      renderCell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSaleForReceipt(s);
            }}
            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1 cursor-pointer transition-colors"
            title="Ticket Thermique 80mm"
          >
            <Printer size={13} className="text-[#C4785A]" />
            <span>{language === 'ar' ? 'وصل' : 'Reçu'}</span>
          </button>
          {s.status !== 'Refunded' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSaleForRefund(s);
              }}
              className="h-8 px-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
              title="Refund / Avoir"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      ),
    },
  ], [language, t]);

  const handleConfirmRefund = () => {
    if (!selectedSaleForRefund) return;
    refundSale(selectedSaleForRefund.id, refundReason);
    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم استرجاع الوصل بنجاح' : 'Vente Remboursée (Avoir)',
      message: `Vente #${selectedSaleForRefund.id.slice(-6).toUpperCase()} remboursée. Motif: ${refundReason}`,
      category: 'pos_inventory',
    });
    setSelectedSaleForRefund(null);
  };

  const handleExportSalesCSV = () => {
    const headers = ['Receipt #', 'Date & Time', 'Customer', 'Tender Method', 'Cashier', 'Subtotal (DA)', 'Discount (DA)', 'Total Paid (DA)', 'Status'];
    const rows = branchSales.map((s) => [
      `"#${s.id.slice(-8).toUpperCase()}"`,
      `"${new Date(s.createdAt).toLocaleString()}"`,
      `"${s.memberName || 'Walk-in'}"`,
      `"${s.paymentMethod}"`,
      `"${s.cashierName || 'Cashier Desk'}"`,
      s.subtotal || s.totalAmount,
      s.discountAmount || 0,
      s.totalAmount,
      `"${s.status || 'Completed'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POS_Sales_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Thermal Receipt Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-receipt-container, #pos-thermal-receipt-container * {
            visibility: visible !important;
          }
          #pos-thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            font-size: 11px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'لوحة قيادة المتجر والمبيعات' : language === 'fr' ? 'Tableau de Bord Caisse & Point de Vente' : 'Retail POS & Sales Command'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  {language === 'ar' ? 'الصندوق مفتوح' : 'Caisse Ouverte'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'مراقبة المبيعات الحية، رصيد الصندوق، المخزون الحرج، وإصدار وصلي 80 مم للزبائن'
                  : 'Flux d’encaissements en temps réel, réconciliation du tiroir-caisse, valorisation du stock et audit des tickets.'}
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
                  {currentBranch?.name || 'Magasin Principal'}
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
                    {language === 'ar' ? 'فروع ونقاط البيع' : 'Points de Vente & Magasins'}
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
              onClick={resetPosMockData}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Recharger Démo POS"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo POS'}</span>
            </button>

            {/* Daily Z-Report Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<FileText size={14} className="text-[#C4785A]" />}
              onClick={() => setIsZReportOpen(true)}
            >
              {language === 'ar' ? 'تقرير Z' : 'Rapport Z'}
            </AtriumButton>

            {/* Access Register */}
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setScreen('shop')}
            >
              {language === 'ar' ? 'شاشة الصندوق (POS)' : 'Accéder à la Caisse'}
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Two-Column Pod Canvas matching Master Desktop Specification (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ================= LEFT COLUMN (~38% - lg:col-span-5) ================= */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            {/* 1. Summary Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'ملخص المبيعات' : 'Résumé des Encaissements'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar'
                      ? 'متابعة وتيرة العمليات والنشاط المالي.'
                      : 'Suivi du débit horaire et volume des tickets.'}
                  </p>
                </div>

                <div className="px-3 py-1 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 rounded-[12px] text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'يومي' : 'Journalier'}</span>
                  <ChevronDown size={12} className="text-neutral-400" />
                </div>
              </div>

              {/* Inset Floating White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4">
                {/* Section A: Two Metric Columns with 1px Vertical Divider */}
                <div className="grid grid-cols-2 gap-4 divide-x rtl:divide-x-reverse divide-[#EDF1F3] dark:divide-neutral-700">
                  {/* Left Metric: Transactions count */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-[#FCEEE8] dark:bg-neutral-700 flex items-center justify-center text-[#C4785A]">
                        <Receipt size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'تذاكر اليوم' : 'Tickets Encaissés'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {posKpis.totalTransactions}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold tabular-nums">
                        /40 obj
                      </span>
                    </div>
                  </div>

                  {/* Right Metric: Today Revenue */}
                  <div className="pl-4 rtl:pl-0 rtl:pr-4 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                        <ShoppingBag size={10} />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {language === 'ar' ? 'مبيعات اليوم' : 'Volume Jour'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-neutral-900 dark:text-white font-mono truncate">
                        {formatMoney(posKpis.totalTodayRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: Sales Velocity Histogram (10 capsule bars 08:00 - 23:00) */}
                <div className="pt-2">
                  <div className="h-[110px] w-full flex items-end justify-between gap-1.5 px-1">
                    {hourlySalesVelocity.map((height, idx) => {
                      const isPeak = height >= 75;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                          <div
                            style={{ height: `${height}%` }}
                            className={`w-full rounded-full transition-all duration-300 ${
                              isPeak
                                ? 'bg-[#C4785A] opacity-90 group-hover:opacity-100'
                                : 'bg-[#E8DFD8] dark:bg-neutral-700 opacity-60 group-hover:opacity-85'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-neutral-400 pt-2 px-1">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>20:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Average Ticket */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'متوسط السلة' : 'Panier Moyen'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ↗ +5.4%
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                  {formatMoney(posKpis.avgTicket)}
                </div>
              </div>

              {/* Tile 2: Cash Ratio */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between h-[110px]">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
                    {language === 'ar' ? 'نسبة الدفع نقداً' : 'Part Espèces'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                    ● En Direct
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cashVolume / posKpis.totalTodayRevenue) * 100)}%`
                    : '100%'}
                </div>
              </div>
            </div>

            {/* 3. Sleek Prompt Banner (Atrium Tips Card) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] font-bold bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] px-2 py-0.5 rounded-full uppercase">
                    STEP {posTips[currentTipIndex].step}
                  </span>
                  <span className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-200">
                    {posTips[currentTipIndex].title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : posTips.length - 1))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft size={13} className="rtl:rotate-180" />
                  </button>
                  <span className="text-[10px] font-medium">{posTips[currentTipIndex].step}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTipIndex((prev) => (prev < posTips.length - 1 ? prev + 1 : 0))
                    }
                    className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {posTips[currentTipIndex].desc}
              </p>

              <button
                type="button"
                onClick={posTips[currentTipIndex].action}
                className="w-full h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#FBE5DC] text-[#C4785A] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{posTips[currentTipIndex].btnLabel}</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% - lg:col-span-7) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            {/* 1. Activity Pod Tray (Top) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              <div>
                <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'نشاط الصندوق والسيولة' : 'Activité Caisse & Trésorerie'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar'
                    ? 'متابعة تدفق المقبوضات ومطابقة درج النقود.'
                    : 'Suivi opérationnel des encaissements et réconciliation du tiroir.'}
                </p>
              </div>

              {/* 3 Inset Activity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Gross Revenue Today */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'مبيعات اليوم' : 'Chiffre du Jour'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">
                      {posKpis.totalTransactions} tickets
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono relative z-10">
                    {formatMoney(posKpis.totalTodayRevenue)}
                  </div>

                  {/* Sparkline Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-emerald-500/15 dark:text-emerald-500/10"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 35 Q 20 15, 40 25 T 80 10 T 100 18 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 35 Q 20 15, 40 25 T 80 10 T 100 18"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Card 2: Stock Alerts & Ruptures */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs relative overflow-hidden h-[155px] flex flex-col justify-between">
                  <div className="relative z-10">
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block truncate">
                      {language === 'ar' ? 'قيمة المخزون والتنبيهات' : 'Stock & Ruptures'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      posKpis.lowStockCount > 0
                        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}>
                      {posKpis.lowStockCount > 0 ? `${posKpis.lowStockCount} alertes réassort` : 'Stock Nominal'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono relative z-10">
                    {formatMoney(posKpis.inventoryRetailValue)}
                  </div>

                  {/* Sparkline Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-purple-500/15 dark:text-purple-500/10"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 30 Q 30 5, 60 20 T 100 5 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 30 Q 30 5, 60 20 T 100 5"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Drawer Cash */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 border border-neutral-800 text-white relative overflow-hidden h-[155px] flex flex-col justify-between shadow-sm">
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-300 block truncate">
                      {language === 'ar' ? 'رصيد درج النقود المتوقع' : 'Tiroir-Caisse & Espèces'}
                    </span>
                    <span className="text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 px-2 py-0.5 rounded-full inline-block mt-1">
                      Session Active
                    </span>
                  </div>
                  <div className="text-xl font-black text-white tabular-nums font-mono relative z-10">
                    {formatMoney(posKpis.expectedCashInDrawer)}
                  </div>

                  {/* Sparkline Amber Graphic Background */}
                  <svg
                    className="absolute bottom-0 left-0 right-0 w-full h-[76px] pointer-events-none text-[#F59E0B]/15"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 25 Q 35 35, 70 12 T 100 20 L 100 40 L 0 40 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M0 25 Q 35 35, 70 12 T 100 20"
                      fill="none"
                      stroke="#FB923C"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 2. Recent Activity Pod Tray (Bottom - Fills Remaining Height) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'النشاط الأخير ومبيعات اليوم' : 'Derniers Encaissements & Tickets'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'ar'
                      ? 'متابعة سريعة للتذاكر الصادرة وإصدار وصولات 80 مم.'
                      : 'Tickets émis en direct au comptoir de vente.'}
                  </p>
                </div>

                {/* Filter Capsule Group */}
                <div className="bg-white dark:bg-neutral-800 p-0.5 rounded-[10px] border border-[#E9EEF0] dark:border-neutral-700 flex items-center shadow-2xs">
                  {(['Tous', 'Ventes', 'Avoirs'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActivityFilter(filter)}
                      className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                        activityFilter === filter
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {filter === 'Tous' ? (language === 'ar' ? 'الكل' : 'Tous') : filter === 'Ventes' ? (language === 'ar' ? 'مبيعات' : 'Ventes') : (language === 'ar' ? 'مسترجعة' : 'Avoirs')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Headers Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700/60 px-4 py-2 text-[11px] font-semibold text-neutral-400 flex items-center">
                <span className="w-[32%] truncate">
                  {language === 'ar' ? 'التذكرة والزبون' : 'TICKET & CLIENT'}
                </span>
                <span className="w-[28%] truncate">
                  {language === 'ar' ? 'المحتويات وطريقة الدفع' : 'ARTICLES & RÈGLEMENT'}
                </span>
                <span className="w-[22%] text-right rtl:text-left truncate">
                  {language === 'ar' ? 'المبلغ الصافي' : 'TOTAL PAYÉ'}
                </span>
                <span className="w-[18%] text-right rtl:text-left truncate">
                  {language === 'ar' ? 'إجراءات' : 'ACTIONS'}
                </span>
              </div>

              {/* Activity Rows List */}
              <div className="space-y-2 flex-1">
                {recentActivitySales.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-neutral-800/40 rounded-[16px] border border-[#E9EEF0] dark:border-neutral-800 space-y-2 my-auto">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mx-auto text-neutral-400">
                      <Receipt size={18} />
                    </div>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {language === 'ar' ? 'لا توجد مبيعات مسجلة' : 'Aucun ticket pour ce filtre'}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {language === 'ar' ? 'ستظهر المعاملات المكتملة هنا تلقائياً.' : 'Les tickets encaissés apparaîtront ici.'}
                    </p>
                  </div>
                ) : (
                  recentActivitySales.map((sale) => {
                    const isRefunded = sale.status === 'Refunded';
                    return (
                      <div
                        key={sale.id}
                        className="bg-white dark:bg-neutral-800 rounded-[12px] p-3 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#C4785A]/40 transition-colors"
                      >
                        {/* Col 1: Ticket + Customer */}
                        <div className="w-[32%] min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                              #{sale.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate">
                            {sale.memberName || 'Client de Passage'}
                          </div>
                        </div>

                        {/* Col 2: Articles & Payment */}
                        <div className="w-[28%] min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                              {sale.items.length} {sale.items.length > 1 ? 'articles' : 'article'}
                            </span>
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                              {sale.paymentMethod}
                            </span>
                          </div>
                        </div>

                        {/* Col 3: Total */}
                        <div className="w-[22%] text-right rtl:text-left pr-2">
                          <span className={`font-mono font-bold text-xs ${
                            isRefunded ? 'text-rose-600 line-through' : 'text-[#C4785A]'
                          }`}>
                            {formatMoney(sale.totalAmount)}
                          </span>
                        </div>

                        {/* Col 4: Actions (Print & Refund) */}
                        <div className="w-[18%] flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForReceipt(sale)}
                            className="p-1.5 text-neutral-400 hover:text-[#C4785A] hover:bg-[#FCEEE8] dark:hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors"
                            title="Reçu thermique 80mm"
                          >
                            <Printer size={14} />
                          </button>
                          {!isRefunded && (
                            <button
                              type="button"
                              onClick={() => setSelectedSaleForRefund(sale)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                              title="Avoir / Remboursement"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Operational Pod Section: Payment Breakdown, Parked Tickets & Fast Navigation */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'التفصيل العملياتي والتذاكر المعلقة' : 'Opérations de Caisse & Paniers en Attente'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {language === 'ar' ? 'متابعة طرق التسديد واستئناف التذاكر المحفوظة مؤقتاً' : 'Ventilation par mode de règlement et accès direct au grand livre des ventes.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportSalesCSV}
                className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 cursor-pointer transition-colors shadow-2xs"
              >
                <FileText size={13} />
                <span>{language === 'ar' ? 'تصدير CSV' : 'Export Grand Livre'}</span>
              </button>

              <AtriumButton
                variant="outline"
                size="sm"
                onClick={() => setScreen('registrations')}
                icon={<Receipt size={14} className="text-[#C4785A]" />}
              >
                {language === 'ar' ? 'سجل المبيعات الكامل' : 'Grand Livre des Tickets'}
              </AtriumButton>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Tender Breakdown (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-3 gap-3">
              {/* Cash */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Banknote size={13} className="text-emerald-500" />
                  <span>{language === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cashVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cashVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* Card */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <CreditCard size={13} className="text-blue-500" />
                  <span>CIB / Edahabia</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cardVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cardVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* BaridiMob */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Coins size={13} className="text-[#C4785A]" />
                  <span>BaridiMob / Mix</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.baridiMobVolume + posKpis.splitVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round(((posKpis.baridiMobVolume + posKpis.splitVolume) / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Parked Tickets (5 cols) */}
            <div className="lg:col-span-5 p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'التذاكر المعلقة' : 'Paniers en Pause'}
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {parkedOrders.length}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {parkedOrders.length > 0 ? `${parkedOrders[0].referenceName} · ${formatMoney(parkedOrders[0].totalAmount)}` : 'Aucun ticket mis en pause'}
                </p>
              </div>

              {parkedOrders.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    resumeParkedOrder(parkedOrders[0].id);
                    setScreen('shop');
                  }}
                  className="h-8 px-3 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-xs"
                >
                  <PlayCircle size={13} />
                  <span>Reprendre</span>
                </button>
              ) : (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => setScreen('shop')}
                  icon={<Plus size={13} />}
                >
                  Vente
                </AtriumButton>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: Thermal Receipt Reprint Slip */}
      {selectedSaleForReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForReceipt(null)}
          title={language === 'ar' ? 'معاينة وصل الدفع 80 مم' : 'Ticket de Caisse 80mm'}
          subtitle={`Ticket #${selectedSaleForReceipt.id.slice(-8).toUpperCase()}`}
        >
          <div className="space-y-4" dir="ltr">
            {/* Printable Thermal Receipt Slip Container */}
            <div
              id="pos-thermal-receipt-container"
              className="mx-auto max-w-[340px] bg-white text-black p-4 rounded-xl border border-neutral-300 font-mono text-[11px] leading-relaxed shadow-xs"
            >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase tracking-wider">
                  {receiptConfig.headerTitle || currentBranch.name}
                </div>
                {receiptConfig.subHeader && (
                  <div className="text-[10px] text-neutral-600">{receiptConfig.subHeader}</div>
                )}
                <div className="text-[9px] text-neutral-500">
                  {receiptConfig.address || currentBranch.address || '8 Rue Didouche Mourad, Alger'}
                </div>
                {receiptConfig.phone && (
                  <div className="text-[9px] text-neutral-500">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="text-[9px] font-bold text-neutral-600">NIF/RC: {receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2 text-[10px] border-b border-dashed border-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>TICKET: #{selectedSaleForReceipt.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAISSIER: {selectedSaleForReceipt.cashierName || currentUser?.fullName || 'Caissier'}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleTimeString()}</span>
                </div>
                {selectedSaleForReceipt.memberName && (
                  <div className="flex justify-between font-bold">
                    <span>CLIENT:</span>
                    <span>{selectedSaleForReceipt.memberName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400 text-[11px]">
                {selectedSaleForReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>TOTAL PAYÉ</span>
                  <span>{formatMoney(selectedSaleForReceipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-0.5">
                  <span>MODE DE PAIEMENT :</span>
                  <span className="font-bold">{selectedSaleForReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center space-y-1">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white text-[7px] flex items-center justify-center tracking-widest">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="text-[10px] font-bold">
                  {receiptConfig.footerMessage || 'Merci pour votre visite !'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 px-4 text-xs font-bold text-white bg-[#C4785A] rounded-full cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                <span>{language === 'ar' ? 'طباعة الوصل' : 'Imprimer Ticket 80mm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="h-10 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Refund Confirmation */}
      {selectedSaleForRefund && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForRefund(null)}
          title={language === 'ar' ? 'تأكيد استرجاع الوصل (Avoir)' : 'Confirmer le Remboursement (Avoir)'}
          subtitle={`Ticket #${selectedSaleForRefund.id.slice(-8).toUpperCase()} · ${formatMoney(selectedSaleForRefund.totalAmount)}`}
        >
          <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <p className="text-xs text-neutral-500">
              {language === 'ar'
                ? 'سيتم إعادة الأصناف تلقائياً إلى المخزون وتسجيل حركة إرجاع في سجل التدقيق.'
                : 'Les articles seront automatiquement réintégrés dans l’inventaire physique avec traçabilité complète.'}
            </p>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                {language === 'ar' ? 'سبب الإرجاع / الملاحظة' : 'Motif de retour / avoir'}
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForRefund(null)}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-xl hover:bg-neutral-100 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
              <AtriumButton
                variant="danger"
                onClick={handleConfirmRefund}
                size="md"
              >
                {language === 'ar' ? 'تأكيد الاسترجاع' : 'Valider le Remboursement'}
              </AtriumButton>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Daily Z-Report Closeout Preview */}
      {isZReportOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsZReportOpen(false)}
          title={language === 'ar' ? 'تقرير Z اليومي - إغلاق الصندوق' : 'Rapport Z · Clôture Journalière'}
          subtitle={`Session ${new Date().toISOString().split('T')[0]} · ${currentBranch.name}`}
        >
          <div className="space-y-4 font-mono text-xs leading-relaxed" dir="ltr">
            <div className="p-4 bg-white text-black rounded-xl border border-neutral-300 space-y-2">
              <div className="text-center font-bold pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase">RAPPORT Z - CLÔTURE DE CAISSE</div>
                <div className="text-[10px] text-neutral-600">{currentBranch.name}</div>
                <div className="text-[10px] text-neutral-500">{new Date().toLocaleString()}</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="flex justify-between">
                  <span>COMMANDES RÉGLÉES :</span>
                  <span className="font-bold">{posKpis.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>CHIFFRE D’AFFAIRES BRUT :</span>
                  <span className="font-bold">{formatMoney(posKpis.totalTodayRevenue)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>PANIER MOYEN :</span>
                  <span>{formatMoney(posKpis.avgTicket)}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="font-bold text-[10px] text-neutral-500 uppercase">VENTILATION PAR TICKET :</div>
                <div className="flex justify-between">
                  <span>ESPÈCES :</span>
                  <span className="font-bold">{formatMoney(posKpis.cashVolume)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARTE CIB / EDAHABIA :</span>
                  <span className="font-bold">{formatMoney(posKpis.cardVolume)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BARIDIMOB / VIREMENT :</span>
                  <span className="font-bold">{formatMoney(posKpis.baridiMobVolume + posKpis.splitVolume)}</span>
                </div>
              </div>

              <div className="pt-1 text-[10px] text-center text-neutral-600">
                SIGNATURE CAISSIER / RESPONSABLE MAGASIN
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Printer size={14} />
                <span>Imprimer Rapport Z</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZReportOpen(false)}
                className="h-10 px-4 rounded-full text-neutral-500 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
