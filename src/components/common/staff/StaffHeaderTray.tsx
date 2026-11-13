import React from 'react';
import { Users, Clock, DollarSign, TrendingUp, ShieldCheck, Lock } from 'lucide-react';
import { formatMoney } from '../../../utils/rules';

interface StaffHeaderTrayProps {
  totalStaffCount: number;
  activeCount: number;
  onLeaveCount: number;
  frozenCount: number;
  presentPercentage: number;
  todayPresentCount: number;
  totalMonthlyPayroll: number;
  isOwnerViewer: boolean;
  metricLabel: string | { labelFr: string; labelEn: string; labelAr: string; unit?: string };
  language: string;
  categoryTitle?: string;
}

export const StaffHeaderTray: React.FC<StaffHeaderTrayProps> = ({
  totalStaffCount,
  activeCount,
  onLeaveCount,
  frozenCount,
  presentPercentage,
  todayPresentCount,
  totalMonthlyPayroll,
  isOwnerViewer,
  metricLabel,
  language,
  categoryTitle,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const resolvedMetricLabel =
    typeof metricLabel === 'string'
      ? metricLabel
      : isAr
      ? metricLabel?.labelAr
      : isEn
      ? metricLabel?.labelEn
      : metricLabel?.labelFr;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Dark Espresso Anchor Card */}
      <div className="bg-[#1F1D1B] text-white p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold tracking-wider uppercase text-neutral-400 font-['Barlow_Condensed']">
            {categoryTitle || (isAr ? 'الفريق' : isEn ? 'Team' : 'Effectif')}
          </span>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#d4522f]">
            <Users size={16} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold tracking-tight text-white mb-1">
            {totalStaffCount}
            <span className="text-xs font-normal text-neutral-400 ms-2">
              {isAr ? 'موظف' : isEn ? 'staff' : 'agents'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {activeCount} {isAr ? 'نشط' : isEn ? 'active' : 'actifs'}
            </span>
            <span>·</span>
            <span className="text-amber-300">
              {onLeaveCount} {isAr ? 'عطلة' : isEn ? 'leave' : 'congé'}
            </span>
            {frozenCount > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-400">
                  {frozenCount} {isAr ? 'موقوف' : isEn ? 'paused' : 'gelé'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI 1: Active In-Service Count */}
      <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">
            {isAr ? 'النشطون' : isEn ? 'Active' : 'En Poste'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={15} />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {activeCount}
            <span className="text-xs font-normal text-neutral-500 ms-1.5">
              / {totalStaffCount}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {Math.round((activeCount / (totalStaffCount || 1)) * 100)}% {isAr ? 'متاح' : isEn ? 'ready' : 'dispo'}
          </p>
        </div>
      </div>

      {/* KPI 2: Today's Shift Attendance Rate */}
      <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">
            {isAr ? 'الحضور' : isEn ? 'Attendance' : 'Présence'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock size={15} />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white flex items-baseline gap-2">
            <span>{presentPercentage}%</span>
            <span className="text-xs font-normal text-neutral-500">
              ({todayPresentCount} {isAr ? 'حاضر' : isEn ? 'present' : 'présents'})
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, presentPercentage))}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI 3: Monthly Payroll / Mass (Strict RBAC Masked for non-owners) */}
      <div className="bg-[#F3EDE7] dark:bg-[#1C1C1E] p-5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">
            {isOwnerViewer
              ? isAr
                ? 'الرواتب'
                : isEn
                ? 'Payroll'
                : 'Paie'
              : isAr
              ? 'الأداء'
              : isEn
              ? 'Score'
              : 'Performance'}
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            {isOwnerViewer ? <DollarSign size={15} /> : <TrendingUp size={15} />}
          </div>
        </div>
        <div>
          {isOwnerViewer ? (
            <>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(totalMonthlyPayroll)}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {isAr ? 'الدفع: 28' : isEn ? 'Payout: 28th' : 'Virement le 28'}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Lock size={16} className="text-neutral-400" />
                <span className="text-base text-neutral-500 font-normal">
                  {isAr ? 'مقيد' : isEn ? 'Restricted' : 'Confidentiel'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {resolvedMetricLabel}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
