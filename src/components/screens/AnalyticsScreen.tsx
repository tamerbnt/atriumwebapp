import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { formatMoney } from '../../utils/rules';

export const AnalyticsScreen: React.FC = () => {
  const {
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    members,
    sales,
    products,
  } = useAtriumStore();

  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days' | 'This Month' | 'Year'>('30 Days');
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'>('Wed');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Hourly traffic profile data for selected day
  const hourlyData: Record<string, number[]> = {
    Mon: [20, 35, 55, 68, 85, 60, 42, 88, 92, 50],
    Tue: [25, 40, 60, 72, 80, 58, 45, 84, 90, 52],
    Wed: [38, 55, 75, 70, 95, 62, 40, 78, 85, 48],
    Thu: [30, 48, 68, 74, 88, 65, 48, 82, 88, 55],
    Fri: [45, 62, 80, 85, 98, 70, 55, 94, 96, 60],
    Sat: [50, 70, 90, 92, 85, 65, 50, 72, 65, 40],
    Sun: [15, 25, 40, 50, 60, 45, 30, 40, 35, 20],
  };

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

  const currentDayHeights = hourlyData[selectedDay] || hourlyData.Wed;

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value,Period\n' +
      `Total Footfall,1482,${timeRange}\n` +
      `Gross Revenue,348500 DZD,${timeRange}\n` +
      `Active Members,${members.length},${timeRange}\n` +
      `Retention Rate,91.8%,${timeRange}\n` +
      `Average Spend,4250 DZD,${timeRange}\n`;

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
        {/* Footfall / Check-ins */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              Total Footfall
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              1,482
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                +14.2%
              </span>
              <span className="text-neutral-400">vs prev {timeRange.toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              Gross Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[#C4785A] flex items-center justify-center">
              <CreditCard size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              348,500 <span className="text-xs font-bold text-neutral-400">DA</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                +22.4%
              </span>
              <span className="text-neutral-400">target pace 110%</span>
            </div>
          </div>
        </div>

        {/* Member Retention Rate */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              Retention & Renewals
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              91.8%
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                +3.1%
              </span>
              <span className="text-neutral-400">churn reduced</span>
            </div>
          </div>
        </div>

        {/* Average Member Value */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
              Avg Member Spend
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              4,250 <span className="text-xs font-bold text-neutral-400">DA</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={12} />
                +8.7%
              </span>
              <span className="text-neutral-400">basket expansion</span>
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
                  Hourly Peak Traffic & Density
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Visitor distribution across operating hours.
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
                {currentDayHeights.map((height, i) => {
                  const isPeak = height >= 85;
                  const barColor = isPeak ? '#C4785A' : height >= 60 ? '#E59E80' : '#EADCD2';
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                      title={`${hours[i]}: ${Math.round((height / 100) * 80)} visitors (${height}% occupancy)`}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded-md bg-neutral-900 text-white text-[10px] font-mono pointer-events-none z-10 whitespace-nowrap shadow-md">
                        {Math.round((height / 100) * 80)} pax ({height}%)
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
                <span className="text-xs font-bold text-neutral-900 dark:text-white">18:00 - 19:30</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Avg Dwell Time</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">74 minutes</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Capacity Util.</span>
                <span className="text-xs font-bold text-[#C4785A]">88% of limit</span>
              </div>
            </div>
          </div>

          {/* Member Attendance Frequency Distribution */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-3 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Member Attendance Regularity
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'High Frequency (4-6 visits/week)', pct: 45, count: 68, color: 'bg-emerald-500' },
                { label: 'Moderate Frequency (2-3 visits/week)', pct: 28, count: 42, color: 'bg-[#C4785A]' },
                { label: 'Weekend Regulars (1-2 visits/week)', pct: 17, count: 26, color: 'bg-blue-500' },
                { label: 'At Risk / Inactive (<1 visit/month)', pct: 10, count: 15, color: 'bg-rose-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.label}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
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
                Revenue Breakdown
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Income segmentation across revenue channels.
              </p>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-3.5 w-full rounded-full flex overflow-hidden gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-[#C4785A]" style={{ width: '65%' }} title="Memberships: 65%" />
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '22%' }} title="POS Retail: 22%" />
              <div className="h-full rounded-full bg-blue-500" style={{ width: '13%' }} title="Services & Drop-ins: 13%" />
            </div>

            {/* Legend Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#C4785A]" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Membership Subscriptions
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums">
                    226,525 DA
                  </span>
                  <span className="text-[10px] text-neutral-400">65% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    POS Shop & Retail
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums">
                    76,670 DA
                  </span>
                  <span className="text-[10px] text-neutral-400">22% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Walk-in Drop-ins & Passes
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums">
                    45,305 DA
                  </span>
                  <span className="text-[10px] text-neutral-400">13% of total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Retail Products */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-3 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Top Selling POS Products
              </h3>
              <span className="text-[11px] text-neutral-400">Volume</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Mineral Water 500ml', sales: '142 units', revenue: '14,200 DA', tag: 'Fast Mover' },
                { name: 'Gold Whey Protein 2kg', sales: '28 units', revenue: '196,000 DA', tag: 'High Margin' },
                { name: 'Creatine Monohydrate 300g', sales: '35 units', revenue: '52,500 DA', tag: 'Top Growth' },
                { name: 'Protein Bar Crisp', sales: '88 units', revenue: '26,400 DA', tag: 'Counter Sale' },
              ].map((prod, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-[14px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                      {prod.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">{prod.sales}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block tabular-nums">
                      {prod.revenue}
                    </span>
                    <span className="text-[9px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-1.5 py-0.5 rounded-sm">
                      {prod.tag}
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
