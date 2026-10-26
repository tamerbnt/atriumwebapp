import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  Truck,
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Home,
  RefreshCw,
  Package,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { CommercialDocType, CommercialDocument } from '../../../types';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { StockMovementModal } from './StockMovementModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';

interface TradingDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const TradingDashboardView: React.FC<TradingDashboardViewProps> = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    commercialDocs,
    purchaseDocs,
    products,
    warehouses,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    setScreen,
    convertCommercialDoc,
    resetTradingMockData,
  } = useAtriumStore();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommercialDocType>('devis');
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'Tous' | 'Factures' | 'BL' | 'Mouvements'>('Tous');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Auto-heal empty trading dataset safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && commercialDocs.length === 0 && resetTradingMockData) {
      hasAutoHealed.current = true;
      resetTradingMockData();
    }
  }, [commercialDocs.length, resetTradingMockData]);

  // KPIs
  const stats = useMemo(() => {
    // Invoices
    const invoices = commercialDocs.filter((d) => d.type === 'facture');
    const totalInvoicedHt = invoices.reduce((sum, d) => sum + (d.totalHtFinal || 0), 0);
    const unpaidInvoices = invoices.filter((d) => d.status !== 'Paid');
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    // Unbilled Delivery Slips (BLs without corresponding invoice)
    const unbilledBls = commercialDocs.filter(
      (d) => d.type === 'bl' && d.status === 'Delivered'
    );
    const unbilledBlAmount = unbilledBls.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    // Inventory Valuation
    const totalStockValuation = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );

    // Low stock items
    const lowStockCount = products.filter(
      (p) => (p.stockQuantity || 0) <= (p.reorderLevel || 10)
    ).length;

    // Pending supplier deliveries
    const pendingPurchases = purchaseDocs.filter(
      (p) => p.type === 'po' && p.status === 'Ordered'
    );

    return {
      totalInvoicedHt,
      unpaidInvoicesCount: unpaidInvoices.length,
      totalUnpaidAmount,
      unbilledBlsCount: unbilledBls.length,
      unbilledBlAmount,
      totalStockValuation,
      lowStockCount,
      pendingPurchasesCount: pendingPurchases.length,
      unbilledBls,
    };
  }, [commercialDocs, purchaseDocs, products]);

  const handleOpenComposer = (type: CommercialDocType) => {
    setComposerType(type);
    setComposerOpen(true);
  };

  // 10-bar monthly trading velocity histogram
  const tradingHistogram = [35, 60, 85, 45, 92, 70, 55, 88, 100, 68];

  // Algerian Trading Best Practice Tips
  const tradingTips = [
    {
      step: 'ASTUCE 1/4',
      title: language === 'ar' ? 'التسوية الضريبية والطابع' : language === 'fr' ? 'Timbre Fiscal & Espèces' : 'Fiscal Stamp & Cash Rules',
      text: language === 'ar'
        ? 'وفق قانون المالية، تخضع الفواتير المسددة نقداً لرسم الطابع بنسبة 1% بحد أقصى 10,000 دج.'
        : language === 'fr'
        ? 'En vertu du code des impôts, les factures en espèces appliquent le timbre fiscal à 1% plafonné à 10 000 DZD.'
        : 'Under local fiscal law, cash transactions require a 1% fiscal stamp capped at 10,000 DZD.',
      btnLabel: language === 'ar' ? 'مراجعة الفواتير' : language === 'fr' ? 'Gérer les Factures' : 'Manage Invoices',
      action: () => setScreen('trading_sales'),
    },
    {
      step: 'ASTUCE 2/4',
      title: language === 'ar' ? 'تتبع وصولات الاستلام BL' : language === 'fr' ? 'Transfert de Propriété (BL)' : 'Proof of Delivery (BL)',
      text: language === 'ar'
        ? 'يضمن وصل التسليم الموقع انتقال المسؤولية القانونية للبضاعة ويسمح بإصدار الفاتورة الفورية.'
        : language === 'fr'
        ? 'Le Bon de Livraison émargé atteste du transfert de propriété matériel avant facturation finale.'
        : 'Signed delivery notes establish legal title transfer before definitive fiscal invoicing.',
      btnLabel: language === 'ar' ? 'عرض وصولات التسليم' : language === 'fr' ? 'Voir Bons de Livraison' : 'View Delivery Notes',
      action: () => setScreen('trading_sales'),
    },
    {
      step: 'ASTUCE 3/4',
      title: language === 'ar' ? 'احتياطي الضمان 5%' : language === 'fr' ? 'Retenue de Garantie (5%)' : 'Warranty Retention (5%)',
      text: language === 'ar'
        ? 'تطبق المشاريع الرسمية خصم 5% كضمان حسن التنفيذ حتى الاستلام النهائي للأشغال أو التجهيزات.'
        : language === 'fr'
        ? 'Sur les marchés publics, 5% du montant HT peut être retenu jusqu\'au PV de réception définitive.'
        : 'Commercial contracts can deduct 5% warranty holdback until final project signoff.',
      btnLabel: language === 'ar' ? 'متابعة المستحقات' : language === 'fr' ? 'Grand Livre & Créances' : 'Finance & Ledger',
      action: () => setScreen('trading_finance'),
    },
    {
      step: 'ASTUCE 4/4',
      title: language === 'ar' ? 'الجرد المستمر بين المستودعات' : language === 'fr' ? 'Mouvements Inter-Dépôts' : 'Inter-Warehouse Transfers',
      text: language === 'ar'
        ? 'استعمل وصولات التحويل لضبط حركة المخزون بين واد السمار وبراقي دون إحداث عجز وهمي.'
        : language === 'fr'
        ? 'Émettez des bons de transfert pour préserver la traçabilité des stocks entre Oued Smar et Baraki.'
        : 'Use transfer vouchers to keep real-time multi-depot stock audit trails completely balanced.',
      btnLabel: language === 'ar' ? 'حركة المخزون' : language === 'fr' ? 'Inventaire Dépôts' : 'Warehouse Inventory',
      action: () => setScreen('trading_inventory'),
    },
  ];

  const currentTip = tradingTips[currentTipIndex];

  // Filtered recent documents
  const filteredRecentDocs = useMemo(() => {
    return commercialDocs.filter((d) => {
      if (activityFilter === 'Factures') return d.type === 'facture';
      if (activityFilter === 'BL') return d.type === 'bl';
      if (activityFilter === 'Mouvements') return d.type === 'avoir' || d.type === 'commande';
      return true;
    });
  }, [commercialDocs, activityFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Outer Workspace Panel (Desktop Spec: CornerRadius 28px, 1px CardBorderBrush) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Row 0 — Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_dash_title')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {t('trading_dash_wholesale_tag')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_dash_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill: Atrium Central ▾ */}
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

              {/* Facility Dropdown Menu */}
              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'المستودعات والفروع' : 'Dépôts & Points de Vente'}
                  </div>
                  {businesses.map((biz) => {
                    const isCurrent = biz.id === currentBusinessId;
                    const matchingBranch = branches.find((b) => b.businessId === biz.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(biz.id);
                          if (matchingBranch) switchBranch(matchingBranch.id);
                          setIsFacilityDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seed Demo Data Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={resetTradingMockData}
              title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
            >
              <span className="hidden sm:inline">
                {language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}
              </span>
            </AtriumButton>

            {/* Quick Actions Primary CTA ToggleButton with Floating Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="h-10 px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer select-none"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}</span>
              </button>

              {/* Floating Popup Menu matching Desktop Spec Section 2.2 */}
              {isQuickActionsOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'إجراءات تجارية فورية' : 'Documents & Opérations'}
                  </div>

                  {/* 1. New Invoice */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      handleOpenComposer('facture');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <span>{t('trading_dash_btn_new_invoice')}</span>
                  </button>

                  {/* 2. New Quote (Devis) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      handleOpenComposer('devis');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                      <Plus size={16} />
                    </div>
                    <span>{t('trading_dash_btn_new_devis')}</span>
                  </button>

                  {/* 3. New Delivery Slip (BL) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      handleOpenComposer('bl');
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <Truck size={16} />
                    </div>
                    <span>{t('trading_dash_btn_new_bl')}</span>
                  </button>

                  {/* 4. Stock Movement */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setStockModalOpen(true);
                    }}
                    className="w-full h-10 px-2 rounded-xl flex items-center gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                  >
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] flex items-center justify-center shrink-0">
                      <Boxes size={16} />
                    </div>
                    <span>{t('trading_inventory_new_movement')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Critical Alert Banner: Unbilled Delivery Slips (BLs) */}
        {stats.unbilledBlsCount > 0 && (
          <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-stone-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {t('trading_dash_unbilled_bl_alert_title', { count: stats.unbilledBlsCount })}
                </h3>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 mt-0.5">
                  {t('trading_dash_unbilled_bl_alert_desc', { amount: formatMoney(stats.unbilledBlAmount) })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setScreen('trading_sales')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{t('trading_dash_view_bls')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Row 1 — Two-Column Pod Canvas (~38% Left / ~62% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ================= LEFT COLUMN (~38% / 5 cols) ================= */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 2.4.1 Summary Pod Tray (top left) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              {/* Pod Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'حركة المبيعات والفوترة' : language === 'fr' ? 'Synthèse Commerciale' : 'Sales & Invoicing Velocity'}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {language === 'ar' ? 'حجم الفواتير المنفذة مقابل أذونات الخروج' : language === 'fr' ? 'Chiffre HT facturé et bons de livraison émis' : 'Invoiced turnover and delivery slip volume'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                  Mensuel
                </span>
              </div>

              {/* Inset White Card */}
              <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
                {/* Top Metrics Split with Hairline Divider */}
                <div className="grid grid-cols-2 divide-x divide-neutral-100 dark:divide-neutral-700/50 rtl:divide-x-reverse">
                  {/* Left Metric: CA HT */}
                  <div className="pr-3 rtl:pr-0 rtl:pl-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-[18px] h-[18px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={10} />
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {t('trading_dash_turnover_ht')}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                      {formatMoney(stats.totalInvoicedHt)}
                    </div>
                  </div>

                  {/* Right Metric: BLs count */}
                  <div className="pl-3 rtl:pl-0 rtl:pr-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-[18px] h-[18px] rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                        <Truck size={10} />
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        Bons Livraison
                      </span>
                    </div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                      {commercialDocs.filter((d) => d.type === 'bl').length} <span className="text-xs font-normal text-neutral-400">BLs</span>
                    </div>
                  </div>
                </div>

                {/* 10 rounded capsule bars representing monthly trading velocity */}
                <div className="pt-2">
                  <div className="flex items-end justify-between gap-1.5 h-[110px] px-1">
                    {tradingHistogram.map((val, idx) => {
                      const isPeak = val >= 85;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div
                            style={{ height: `${val}%` }}
                            className={`w-full max-w-[18px] rounded-full transition-all duration-300 ${
                              isPeak
                                ? 'bg-[#C4785A] group-hover:bg-[#b3684a]'
                                : 'bg-[#EADFD8] dark:bg-neutral-700 group-hover:bg-[#dfd0c7]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 pt-2 px-1 border-t border-neutral-100 dark:border-neutral-700/40">
                    <span>S1</span>
                    <span>S2</span>
                    <span>S3</span>
                    <span>S4</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.4.2 Dual Compact KPI Tiles */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: Unbilled BLs Alert */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    BLs Non-Facturés
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${stats.unbilledBlsCount > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                    {stats.unbilledBlsCount} en attente
                  </span>
                </div>
                <div>
                  <span className="text-[20px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {formatMoney(stats.unbilledBlAmount)}
                  </span>
                </div>
              </div>

              {/* Tile 2: Low Stock Warnings */}
              <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    Articles en Rupture
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${stats.lowStockCount > 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700'}`}>
                    {stats.lowStockCount} alertes
                  </span>
                </div>
                <div>
                  <span className="text-[20px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {stats.lowStockCount} <span className="text-xs text-neutral-400 font-normal">produits</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2.4.3 Sleek Prompt Banner (Atrium Commercial Tips Card) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[18px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              {/* Row 0: Header with badge and carousel controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-[#C4785A]/15 text-[#C4785A] uppercase tracking-wide">
                    {currentTip.step}
                  </span>
                  <span className="text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-200">
                    Conseil Gestion Commerciale
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : tradingTips.length - 1))}
                    className="p-1 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={13} className="rtl:rotate-180" />
                  </button>
                  <span className="tabular-nums">{currentTipIndex + 1}/{tradingTips.length}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev < tradingTips.length - 1 ? prev + 1 : 0))}
                    className="p-1 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>

              {/* Row 1: Title */}
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {currentTip.title}
              </h3>

              {/* Row 2: Supporting Copy */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {currentTip.text}
              </p>

              {/* Row 3: Action Button */}
              <button
                type="button"
                onClick={currentTip.action}
                className="w-full h-9 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 hover:border-[#C4785A] text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{currentTip.btnLabel}</span>
                <ChevronRight size={13} className="text-[#C4785A] rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~62% / 7 cols) ================= */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            
            {/* 2.5.1 Activity Pod Tray (top right) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5">
              {/* Pod Header */}
              <div>
                <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'مؤشرات الأداء المالي والمخزون' : 'Activité & Trésorerie'}
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'السيولة المستحقة، دوران المخزون والذمم المدينة' : 'Suivi des créances clients, valorisation des dépôts et chiffre réalisé'}
                </p>
              </div>

              {/* 3 Inset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Revenue Today (White Card) */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[155px] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0 35 Q 25 10, 50 25 T 100 8 L 100 40 L 0 40 Z" fill="currentColor" className="text-[#C4785A]" />
                      <path d="M0 35 Q 25 10, 50 25 T 100 8" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#C4785A]" />
                    </svg>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      {t('trading_dash_turnover_ht')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ↗ Facturé
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[20px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight block">
                      {formatMoney(stats.totalInvoicedHt)}
                    </span>
                  </div>
                </div>

                {/* Card 2: Total Stock Valuation (White Card) */}
                <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs h-[155px] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-20 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0 30 Q 30 5, 60 20 T 100 5 L 100 40 L 0 40 Z" fill="currentColor" className="text-blue-500" />
                      <path d="M0 30 Q 30 5, 60 20 T 100 5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500" />
                    </svg>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                      {t('trading_dash_stock_value')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {warehouses.length} Dépôts
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[20px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight block">
                      {formatMoney(stats.totalStockValuation)}
                    </span>
                  </div>
                </div>

                {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) — Créances Clients Impayées */}
                <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm h-[155px] relative overflow-hidden flex flex-col justify-between text-white">
                  <div className="absolute inset-x-0 bottom-0 h-[76px] opacity-25 pointer-events-none">
                    <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0 25 Q 35 35, 70 15 T 100 20 L 100 40 L 0 40 Z" fill="currentColor" className="text-[#FB923C]" />
                      <path d="M0 25 Q 35 35, 70 15 T 100 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#FB923C]" />
                    </svg>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[11px] font-medium text-neutral-300 block mb-1">
                      {t('trading_dash_receivables')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
                      {stats.unpaidInvoicesCount} Impayés
                    </span>
                  </div>
                  <div className="relative z-10">
                    <span className="text-[20px] font-bold text-white tabular-nums tracking-tight block font-mono">
                      {formatMoney(stats.totalUnpaidAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.5.2 Recent Activity Pod Tray (bottom right) */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-4 lg:p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3.5 flex-1 flex flex-col justify-between">
              <div>
                {/* Pod Tray Header with Filter Segment Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                      {t('trading_dash_recent_docs')}
                    </h2>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {t('trading_dash_recent_docs_sub')}
                    </p>
                  </div>

                  {/* Filter segmented pills */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs self-start sm:self-auto">
                    {(['Tous', 'Factures', 'BL', 'Mouvements'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActivityFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activityFilter === filter
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] shadow-2xs'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inset Column Headers Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-[12px] px-4 py-2 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between text-[11px] font-bold text-neutral-400 mb-2">
                  <div className="flex-1">Document & Partenaire</div>
                  <div className="w-28 text-right">Montant TTC</div>
                  <div className="w-24 text-right">Actions</div>
                </div>

                {/* Rows List */}
                <div className="space-y-2">
                  {filteredRecentDocs.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white dark:bg-neutral-800 rounded-[12px] p-3 border border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/40 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            doc.type === 'facture'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : doc.type === 'bl'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : doc.type === 'devis'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {doc.type.toUpperCase().slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                              {doc.docNumber}
                            </span>
                            <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate max-w-[160px]">
                              {doc.clientName}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>{doc.date}</span>
                            <span>•</span>
                            <span>{doc.items.length} article(s)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums block">
                            {formatMoney(doc.netToPay)}
                          </span>
                          <span
                            className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              doc.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : doc.status === 'Delivered'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : doc.status === 'Validated'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPrintDoc(doc)}
                            title="Imprimer / PDF officiel"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                          >
                            <FileText size={15} />
                          </button>
                          {doc.type === 'devis' && (
                            <button
                              type="button"
                              onClick={() => convertCommercialDoc(doc.id, 'bl')}
                              title="Convertir en Bon de Livraison"
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              BL
                            </button>
                          )}
                          {doc.type === 'bl' && doc.status === 'Delivered' && (
                            <button
                              type="button"
                              onClick={() => convertCommercialDoc(doc.id, 'facture')}
                              title="Convertir en Facture"
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Facturer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredRecentDocs.length === 0 && (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      Aucun document dans cette catégorie.
                    </div>
                  )}
                </div>
              </div>

              {/* View all documents button */}
              <button
                type="button"
                onClick={() => setScreen('trading_sales')}
                className="w-full h-10 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 hover:border-[#C4785A] text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
              >
                <span>Accéder au Cycle Complet des Ventes</span>
                <ArrowRight size={14} className="text-[#C4785A] rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialType={composerType}
      />

      <StockMovementModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
      />

      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />
    </div>
  );
};
