import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Download,
  Building2,
  Check,
  ChevronDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  UserCheck,
  Sparkles,
  Receipt,
  Tag,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { formatMoney } from '../../utils/rules';

export const AnalyticsScreen: React.FC = () => {
  const {
    currentBranch,
    currentBusiness,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    members,
    sales,
    products,
  } = useAtriumStore();

  const isPOS = currentBusiness.category === 'pos_inventory';
  const isSalon = currentBusiness.category === 'appointment_service';

  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days' | 'This Month' | 'Year'>('30 Days');
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'>('Wed');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Dynamic Live Financial & Sales Aggregations
  const totalGrossRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const totalTransactions = useMemo(() => sales.length, [sales]);

  const avgBasket = useMemo(() => {
    return totalTransactions > 0 ? Math.round(totalGrossRevenue / totalTransactions) : 0;
  }, [totalGrossRevenue, totalTransactions]);

  const totalCustomers = useMemo(() => members.length, [members]);

  // Payment Tender breakdown
  const tenderStats = useMemo(() => {
    const cashTotal = sales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const cardTotal = sales
      .filter((s) => s.paymentMethod === 'Card')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const otherTotal = sales
      .filter((s) => s.paymentMethod !== 'Cash' && s.paymentMethod !== 'Card')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const safeTotal = totalGrossRevenue || 1;
    const cashPct = Math.round((cashTotal / safeTotal) * 100);
    const cardPct = Math.round((cardTotal / safeTotal) * 100);
    const otherPct = Math.max(0, 100 - cashPct - cardPct);

    return {
      cashTotal,
      cardTotal,
      otherTotal,
      cashPct,
      cardPct,
      otherPct,
    };
  }, [sales, totalGrossRevenue]);

  // Top Selling Products dynamically ranked from sales line items
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.productName]) {
          map[it.productName] = { name: it.productName, quantity: 0, revenue: 0 };
        }
        map[it.productName].quantity += it.quantity;
        map[it.productName].revenue += it.totalPrice;
      });
    });

    const list = Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);

    if (list.length > 0) return list;

    // Fallback to top products if no sales registered yet
    return products.slice(0, 4).map((p) => ({
      name: p.name,
      quantity: p.stockQuantity,
      revenue: p.price.amount * 4,
    }));
  }, [sales, products]);

  // Dynamic Hourly Register Volume
  const hours = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
  ];

  const hourlyHeights = useMemo(() => {
    const hourSlots = [8, 9, 10, 11, 12, 14, 16, 17, 18, 19];
    const counts = hourSlots.map((targetHour) => {
      return sales.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getHours() === targetHour;
      }).length;
    });

    const maxCount = Math.max(...counts, 1);
    const hasAnySales = counts.some((c) => c > 0);

    if (hasAnySales) {
      return counts.map((c) => (c > 0 ? Math.min(100, Math.max(25, Math.round((c / maxCount) * 100))) : 18));
    }

    // Default curve when zero sales registered
    return [25, 40, 60, 72, 85, 60, 45, 80, 90, 50];
  }, [sales]);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value,Period\n' +
      `Gross Revenue,${totalGrossRevenue} DZD,${timeRange}\n` +
      `Total Transactions,${totalTransactions},${timeRange}\n` +
      `Average Basket,${avgBasket} DZD,${timeRange}\n` +
      `Active Customers,${totalCustomers},${timeRange}\n` +
      `Cash Tender Total,${tenderStats.cashTotal} DZD,${timeRange}\n` +
      `Card Tender Total,${tenderStats.cardTotal} DZD,${timeRange}\n` +
      `Other Tender Total,${tenderStats.otherTotal} DZD,${timeRange}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-analytics-${timeRange.toLowerCase().replace(' ', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Facility Analytics
            </h1>
            <span className="text-[10px] font-bold tracking-wider text-[#C4785A] bg-[#C4785A]/10 px-2.5 py-1 rounded-full uppercase">
              Live Intel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Key operational metrics, footfall trends, and revenue intelligence.
          </p>
        </div>

        {/* Right Toolbar: Facility Pill + Time Range + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Facility Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-9 px-3.5 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Building2 size={14} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Main Facility'}
              </span>
              <ChevronDown
                size={13}
                className={`text-neutral-500 transition-transform ${isFacilityDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Facility
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
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

          {/* Time Range Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
              className="h-9 px-3.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 cursor-pointer shadow-2xs hover:border-[#D5DFE3]"
            >
              <Calendar size={13} className="text-neutral-400" />
              <span>{timeRange}</span>
              <ChevronDown size={12} className="text-neutral-400" />
            </button>

            {isTimeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {(['Today', '7 Days', '30 Days', 'This Month', 'Year'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setTimeRange(range);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-1.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      timeRange === range
                        ? 'font-bold text-[#C4785A] bg-[#FDF4F0] dark:bg-neutral-700'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    <span>{range}</span>
                    {timeRange === range && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Report CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 hover:text-[#C4785A] hover:border-[#C4785A]/40 transition-colors cursor-pointer shadow-2xs"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Main KPI Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Footfall / Transactions */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              {isPOS ? 'Total POS Transactions' : 'Total Footfall'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {isPOS ? <Receipt size={15} /> : <UserCheck size={15} />}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
              {isPOS ? `${totalTransactions}` : '1,482'}
              {isPOS && <span className="text-xs font-normal text-neutral-400 ml-1">tickets</span>}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                {isPOS ? 'Live' : '+14.2%'}
              </span>
              <span className="text-neutral-400">{isPOS ? 'Settled transactions' : `vs prev ${timeRange.toLowerCase()}`}</span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              Gross Sales Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[#C4785A] flex items-center justify-center">
              <CreditCard size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
              {formatMoney(totalGrossRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                Real-time
              </span>
              <span className="text-neutral-400">from register ledger</span>
            </div>
          </div>
        </div>

        {/* Member Retention Rate / Customers */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              {isPOS ? 'Customer Accounts' : 'Retention & Renewals'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
              {isPOS ? `${totalCustomers}` : '91.8%'}
              {isPOS && <span className="text-xs font-normal text-neutral-400 ml-1">clients</span>}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                Active
              </span>
              <span className="text-neutral-400">{isPOS ? 'Directory profiles' : 'churn reduced'}</span>
            </div>
          </div>
        </div>

        {/* Average Basket / Spend */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              {isPOS ? 'Average Basket (Ticket)' : 'Avg Member Spend'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight font-mono">
              {formatMoney(avgBasket)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                Per order
              </span>
              <span className="text-neutral-400">average spend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Hourly Flow & Occupancy (7 cols) + Revenue Breakdown & Top Services (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Hourly Flow & Occupancy Gauge (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Hourly Traffic Flow Card */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {isPOS ? 'Hourly Register Sales Distribution' : 'Hourly Peak Traffic & Density'}
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {isPOS ? 'Transaction throughput and peak buying hours across the day.' : 'Visitor distribution across operating hours.'}
                </p>
              </div>

              {/* Day of Week Selector */}
              <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center gap-0.5 text-[11px] font-semibold shadow-2xs overflow-x-auto">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    style={{
                      backgroundColor: selectedDay === day ? '#FDF4F0' : 'transparent',
                      color: selectedDay === day ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                      selectedDay === day ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Pillar Bar Chart */}
            <div className="pt-2">
              <div className="h-44 flex items-end justify-between gap-2.5 px-2 pt-4">
                {hourlyHeights.map((height, i) => {
                  const isPeak = height >= 80;
                  const barColor = isPeak ? '#C4785A' : height >= 50 ? '#E59E80' : '#EADCD2';
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                      title={`${hours[i]}: ${height}% activity relative to peak`}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded-md bg-neutral-900 text-white text-[10px] font-mono pointer-events-none z-10 whitespace-nowrap shadow-md">
                        {hours[i]} · {height}% volume
                      </div>
                      <div
                        style={{
                          height: `${height}%`,
                          backgroundColor: barColor,
                        }}
                        className="w-full rounded-full transition-all group-hover:opacity-90 group-hover:scale-y-102"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 px-2 pt-2 font-mono border-t border-[#EDF1F3] dark:border-neutral-700/60 mt-1">
                {hours.map((h, i) => (
                  <span key={i} className={i % 2 === 0 ? 'inline' : 'hidden sm:inline'}>
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Occupancy Legend & Stats */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#EDF1F3] dark:border-neutral-700/60">
              <div className="text-center p-2 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Peak Hour</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">14:00 - 18:00</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Avg Checkout</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">45 seconds</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Register Status</span>
                <span className="text-xs font-bold text-emerald-600">Active Online</span>
              </div>
            </div>
          </div>

          {/* Member Attendance / Customer Repeat Rate */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-3 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isPOS ? 'Customer Order Frequency Distribution' : 'Member Attendance Regularity'}
            </h3>
            <div className="space-y-2.5">
              {[
                { label: isPOS ? 'Frequent Shoppers (3+ orders/month)' : 'High Frequency (4-6 visits/week)', pct: 45, count: Math.max(1, Math.round(totalCustomers * 0.45)), color: 'bg-emerald-500' },
                { label: isPOS ? 'Occasional Regulars (1-2 orders/month)' : 'Moderate Frequency (2-3 visits/week)', pct: 32, count: Math.max(1, Math.round(totalCustomers * 0.32)), color: 'bg-[#C4785A]' },
                { label: isPOS ? 'One-time Walk-in Guests' : 'Weekend Regulars (1-2 visits/week)', pct: 18, count: Math.max(1, Math.round(totalCustomers * 0.18)), color: 'bg-blue-500' },
                { label: isPOS ? 'Lapsed Customers (>60 days)' : 'At Risk / Inactive (<1 visit/month)', pct: 5, count: Math.max(0, Math.round(totalCustomers * 0.05)), color: 'bg-rose-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                      {item.pct}% ({item.count})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Revenue Breakdown + Best Sellers (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Revenue Distribution Card */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isPOS ? 'Payment Tender Breakdown' : 'Revenue Breakdown'}
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {isPOS ? 'Settlement breakdown by tender method.' : 'Income segmentation across revenue channels.'}
              </p>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-3.5 w-full rounded-full flex overflow-hidden gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${tenderStats.cashPct}%` }} title={`Cash: ${tenderStats.cashPct}%`} />
              <div className="h-full rounded-full bg-[#C4785A] transition-all" style={{ width: `${tenderStats.cardPct}%` }} title={`Card/TPE: ${tenderStats.cardPct}%`} />
              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${tenderStats.otherPct}%` }} title={`Split/Other: ${tenderStats.otherPct}%`} />
            </div>

            {/* Legend Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Cash Tender
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums font-mono">
                    {formatMoney(tenderStats.cashTotal)}
                  </span>
                  <span className="text-[10px] text-neutral-400">{tenderStats.cashPct}% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#C4785A]" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Card / TPE Electronic
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums font-mono">
                    {formatMoney(tenderStats.cardTotal)}
                  </span>
                  <span className="text-[10px] text-neutral-400">{tenderStats.cardPct}% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Split / Account Balance
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums font-mono">
                    {formatMoney(tenderStats.otherTotal)}
                  </span>
                  <span className="text-[10px] text-neutral-400">{tenderStats.otherPct}% of total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products Dynamically Ranked from Sales */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-3 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#C4785A]" />
                <span>Top Selling Products & Drivers</span>
              </h3>
              <span className="text-[11px] text-neutral-400">Live Volume</span>
            </div>

            <div className="space-y-2">
              {topSellingProducts.map((prod, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-[14px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                      {prod.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {prod.quantity} units sold
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#C4785A] block tabular-nums font-mono">
                      {formatMoney(prod.revenue)}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-sm">
                      {i === 0 ? 'Top Seller' : i === 1 ? 'High Margin' : 'Steady Mover'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
