import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Warehouse,
  Printer,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardPos } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  DashboardHeader,
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

export const PosDashboardView: React.FC<PosDashboardViewProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    products,
    sales,
    parkedOrders,
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    resetPosMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0 || sales.length > 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday'>('today');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(10); // November
  const months = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's sales
  const todaySales = useMemo(() => {
    return (sales || []).filter((s) => s.createdAt?.startsWith(todayStr));
  }, [sales, todayStr]);

  const todayGross = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }, [todaySales]);

  const activeTicketsCount = todaySales.length;
  const parkedCount = (parkedOrders || []).length;

  const dailyTarget = 120000;
  const targetPct = Math.min(100, Math.round((todayGross / dailyTarget) * 100));

  // Hourly sales curve
  const hourlyData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    todaySales.forEach((s) => {
      const h = s.createdAt ? new Date(s.createdAt).getHours() : 14;
      if (h < 9) counts[0]++;
      else if (h < 12) counts[1]++;
      else if (h < 15) counts[2]++;
      else if (h < 18) counts[3]++;
      else counts[4]++;
    });
    if (counts.every((v) => v === 0)) return [0, 2, 7, 5, 2];
    return counts;
  }, [todaySales]);

  // Total products & low stock items
  const lowStockItems = useMemo(
    () => (products || []).filter((p) => (p.stockQuantity || 0) <= (p.reorderLevel || 5)),
    [products]
  );

  // 4-week revenue trend
  const weeklyRevenueTrend = useMemo(() => {
    const base = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 180000;
    return [
      { week: language === 'ar' ? 'أسبوع 1' : 'week 1', value: Math.round(base * 0.22) },
      { week: language === 'ar' ? 'أسبوع 2' : 'week 2', value: Math.round(base * 0.26) },
      { week: language === 'ar' ? 'أسبوع 3' : 'week 3', value: Math.round(base * 0.3) },
      { week: language === 'ar' ? 'أسبوع 4' : 'week 4', value: Math.round(base * 0.22) },
    ];
  }, [sales, language]);

  // 30-day cash trajectory
  const monthlyRevenue = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const factor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5;
      return Math.round((todayGross || 25000) * factor * (1 + (i % 4) * 0.15));
    });
  }, [todayGross]);

  // Category sales mix donut
  const categoryMix = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || (language === 'ar' ? 'عام' : 'Général');
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { label: language === 'ar' ? 'مأكولات ومشروبات' : 'Boissons & Snacks', value: 48, color: '#d4522f' },
        { label: language === 'ar' ? 'إلكترونيات واكسسوار' : 'Accessoires', value: 32, color: '#3B82F6' },
        { label: language === 'ar' ? 'مواد استهلاكية' : 'Consommables', value: 20, color: '#10B981' },
      ];
    }
    const colors = ['#d4522f', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    let idx = 0;
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: colors[idx++ % colors.length],
    }));
  }, [products, language]);

  // Top SKUs
  const topProducts = useMemo(() => {
    const top = [...(products || [])]
      .sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0))
      .slice(0, 4);
    if (top.length === 0) {
      return [
        { week: 'Espresso', value: 42 },
        { week: 'Croissant', value: 28 },
        { week: 'Jus Frais', value: 19 },
        { week: 'Sandwich', value: 15 },
      ];
    }
    return top.map((p) => ({
      week: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
      value: Math.max(5, Math.round(p.stockQuantity || 10)),
    }));
  }, [products]);

  if (showSkeleton) {
    return (
      <div className="p-6">
        <SkeletonDashboardPos />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {/* Header */}
      <DashboardHeader
        title={t('nav_dashboard', language)}
        subtitle={
          language === 'ar'
            ? 'مؤشرات حركة نقاط البيع، تتبع التذاكر، المخزون الحي وربحية المتجر'
            : language === 'fr'
            ? 'Flux des caisses en direct, rotation des stocks et rentabilité des ventes.'
            : 'Live checkout flow, stock turnover, and store profitability.'
        }
        currentBranchName={currentBranch?.name || 'Caisse Centrale Atrium'}
        branches={branches}
        onSwitchBranch={switchBranch}
        onResetDemoData={resetPosMockData}
        exportFileName="pos_dashboard_report"
      />

      {/* TOP ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 1: Live Checkout Flow (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'حركة الصناديق والمبيعات' : language === 'fr' ? 'Activité des Caisses' : 'Register Activity'}
            icon={<ShoppingBag size={18} className="text-[#d4522f]" />}
            badge={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {activeTicketsCount} {language === 'ar' ? 'تذكرة اليوم' : 'Tickets'}
              </span>
            }
            rightControls={
              <div className="flex items-center bg-[#F0F2F5] p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('yesterday')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    timeFilter === 'yesterday' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {language === 'ar' ? 'أمس' : 'Yesterday'}
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'تذاكر مغلقة اليوم' : 'Tickets Encaissés'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {activeTicketsCount}
                      </span>
                      <span className="text-xs text-gray-400">/ 80 obj</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                      ● {language === 'ar' ? 'الصندوق نشط' : 'Caisse ouverte'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-gray-200 mx-4" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      {language === 'ar' ? 'طلبات معلقة' : 'Commandes en attente'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-gray-900 tabular-nums">
                        {parkedCount}
                      </span>
                      <span className="text-xs text-gray-400">{language === 'ar' ? 'معلق' : 'parquées'}</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                      {language === 'ar' ? 'استئناف سريع' : 'Prêt à encaisser'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 block mb-2">
                    {language === 'ar' ? 'كثافة المبيعات على مدار 24 ساعة' : 'Flux horaire des encaissements (24h)'}
                  </span>
                  <HourlyCurveChart data={hourlyData} color="#d4522f" />
                </div>
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {language === 'ar' ? 'إجمالي المبيعات اليوم' : 'Chiffre d’Affaires Aujourd’hui'}
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 tabular-nums">
                    {formatMoney(todayGross)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>{targetPct}% {language === 'ar' ? 'من الهدف' : 'de l’objectif journalier'}</span>
                  <span>{formatMoney(dailyTarget)}</span>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 2: Ticket & Customer Asset Development (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'التذاكر وحجم المبيعات' : language === 'fr' ? 'Tickets & Ventes' : 'Sales & Tickets'}
            icon={<TrendingUp size={18} className="text-[#d4522f]" />}
            rightControls={
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-gray-800">{months[currentMonthIndex]} 2026</span>
                <button
                  type="button"
                  onClick={() => setCurrentMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DashboardMetricCard
                  label={language === 'ar' ? 'إجمالي المنتجات' : 'Articles Référencés'}
                  value={products.length || 24}
                  badgeText={language === 'ar' ? 'نشط بالكتالوج' : 'En rayon'}
                  badgeVariant="success"
                  tooltip={language === 'ar' ? 'جميع المنتجات المتوفرة للبيع' : 'Produits disponibles à la vente'}
                />

                <DashboardMetricCard
                  label={language === 'ar' ? 'تذاكر هذا الشهر' : 'Total Tickets Mois'}
                  value={Math.max(sales.length, 38)}
                  badgeText={language === 'ar' ? 'معاملات' : 'Ventes'}
                  badgeVariant="neutral"
                  tooltip={language === 'ar' ? 'عدد التذاكر المسجلة خلال 30 يوماً' : 'Nombre de tickets passés en caisse'}
                />

                <DarkEspressoCard
                  label={language === 'ar' ? 'تنبيه نقص المخزون' : 'Alerte Rupture Stock'}
                  value={lowStockItems.length}
                  sublabel={language === 'ar' ? 'مواد تتطلب إعادة طلب' : 'Articles sous seuil critique'}
                  badgeText={lowStockItems.length > 0 ? 'Urgent' : 'Sécurisé'}
                  badgeVariant={lowStockItems.length > 0 ? 'warning' : 'neutral'}
                />
              </div>

              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مبيعات الأسابيع الـ 4 الماضية (دج)' : 'Chiffre d’affaires hebdomadaire'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {language === 'ar' ? 'تطور أسبوعي' : '4 semaines'}
                  </span>
                </div>
                <PillBarHistogram
                  data={weeklyRevenueTrend}
                  maxScale={Math.max(...weeklyRevenueTrend.map((w) => w.value)) * 1.2}
                  barColor="#d4522f"
                />
              </div>
            </div>
          </DashboardPod>
        </div>
      </div>

      {/* BOTTOM ROW: Two Pods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* POD 3: Financial Trajectory & P&L (42% width) */}
        <div className="lg:col-span-5 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'الإيرادات والأرباح' : language === 'fr' ? 'Revenus & Marges' : 'Revenue & Profit'}
            icon={<Receipt size={18} className="text-[#d4522f]" />}
            rightControls={
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {months[currentMonthIndex]} 2026
              </span>
            }
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'صافي الهامش' : 'Marge Nette'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayGross * 0.38))}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">38% Brut</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'إجمالي المبيعات' : 'CA Brut'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(todayGross)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">+5.3%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 block">{language === 'ar' ? 'تكلفة البضاعة' : 'Coût d’Achat'}</span>
                    <span className="text-lg font-bold font-mono text-gray-900 tabular-nums">
                      {formatMoney(Math.round(todayGross * 0.62))}
                    </span>
                    <span className="text-[10px] text-gray-400 block">62% CA</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-[11px] text-gray-400 block mb-1">
                    {language === 'ar' ? 'منحنى التدفق النقدي على مدار 30 يوماً' : 'Tendance des encaissements sur 30 jours'}
                  </span>
                  <MonthlyAreaChart data={monthlyRevenue} color="#8B5CF6" />
                </div>
              </div>

              {/* 4 KPIs Inset Grid */}
              <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ar' ? 'مؤشرات كفاءة الصندوق' : 'Indicateurs de Performance'}
                  </span>
                  <Info size={13} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'متوسط السلة' : 'Panier Moyen'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">
                        {formatMoney(todayGross > 0 && activeTicketsCount > 0 ? Math.round(todayGross / activeTicketsCount) : 1850)}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        Ticket
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الدفع نقداً' : 'Part Paiement Cash'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">82%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Espèces
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'معدل دوران المخزون' : 'Rotation Stocks'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">5.4x</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Rapide
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE7] p-3 rounded-xl">
                    <span className="text-[11px] text-gray-500 block">
                      {language === 'ar' ? 'نسبة الإرجاع والإلغاء' : 'Taux d’Annulation'}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-900">0.8%</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Conforme
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPod>
        </div>

        {/* POD 4: Intelligence & Stock Sentinel Guardian (58% width) */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardPod
            title={language === 'ar' ? 'المؤشرات والتنبيهات' : language === 'fr' ? 'Analyses & Alertes' : 'Insights & Alerts'}
            icon={<Package size={18} className="text-[#d4522f]" />}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'توزيع المبيعات حسب الفئة' : 'Répartition par Catégorie'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <DonutChart segments={categoryMix} centerLabel={products.length > 0 ? `${products.length} SKUs` : 'Articles'} />
                </div>

                <div className="bg-white rounded-[18px] p-4 border border-[#E6DED6] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {language === 'ar' ? 'أفضل المنتجات حركة' : 'Top Articles Vendus'}
                    </span>
                    <Info size={13} className="text-gray-400" />
                  </div>
                  <PillBarHistogram
                    data={topProducts}
                    maxScale={Math.max(...topProducts.map((p) => p.value)) * 1.3}
                    barColor="#3B82F6"
                  />
                </div>
              </div>

              {/* Stock Sentinel Guardian Card */}
              <GuardianCard
                title={language === 'ar' ? 'المخزون والتدفق النقدي' : 'Stock & Cash Flow'}
                subtitle={
                  language === 'ar'
                    ? 'نظام المراقبة المستمرة لمستويات المخزون وإصدار تنبيهات إعادة الطلب التلقائية'
                    : 'Surveillance proactive des seuils de réapprovisionnement et alertes péremption.'
                }
                score={lowStockItems.length === 0 ? 96 : Math.max(70, 96 - lowStockItems.length * 8)}
                statusText={
                  lowStockItems.length === 0
                    ? language === 'ar' ? 'المخزون مؤمّن بالكامل!' : 'Stock parfaitement approvisionné !'
                    : `${lowStockItems.length} ${language === 'ar' ? 'مواد بحاجة لإعادة طلب' : 'articles sous le seuil d’alerte'}`
                }
                metricLabel={language === 'ar' ? 'جاهزية المخزون' : 'Disponibilité'}
                metricValue={`${lowStockItems.length === 0 ? '98%' : '88%'}`}
                trendText={language === 'ar' ? 'معدل سليم' : 'Seuils sous contrôle'}
                defaultEnabled={true}
              />
            </div>
          </DashboardPod>
        </div>
      </div>
    </div>
  );
};
