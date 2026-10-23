import React, { useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Scissors,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

export const AppointmentFinanceView: React.FC = () => {
  const { language } = useTranslation();
  const { appointments, staff, currentBranch } = useAtriumStore();

  const completedApts = useMemo(() => {
    return appointments.filter((a) => a.status === 'Completed');
  }, [appointments]);

  const totalRevenue = useMemo(() => {
    return completedApts.reduce((sum, a) => sum + (a.price || 0), 0);
  }, [completedApts]);

  const totalCommissions = useMemo(() => {
    // Standard 25% salon technician commission
    return Math.round(totalRevenue * 0.25);
  }, [totalRevenue]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <CreditCard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مالية الصالون وعمولات المصففين' : language === 'fr' ? 'Finances Salon & Commissions Stylistes' : 'Salon Revenue & Stylist Commissions'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {language === 'ar' ? 'متابعة إيرادات الخدمات ونسب عمولات مصففي الشعر' : language === 'fr' ? 'Suivi des recettes prestations et des pourcentages par coiffeur' : 'Service revenue and stylist commissions'}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Recettes Prestations</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums mt-1 block">
              {formatMoney(totalRevenue, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{completedApts.length} soins complétés</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Commissions Stylistes (25%)</span>
            <span className="text-xl font-black text-[#C4785A] tabular-nums mt-1 block">
              {formatMoney(totalCommissions, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Part variable collaborateurs</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Marge Nette Salon</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {formatMoney(totalRevenue - totalCommissions, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Après commissions</span>
          </div>
        </div>
      </div>

      {/* Stylist Breakdown */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Performance & Rémunération Stylistes ({staff.length})
          </h2>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
          {staff.map((st) => {
            const count = appointments.filter((a) => a.staffName === st.fullName || a.staffId === st.id).length;
            const rev = appointments
              .filter((a) => a.staffName === st.fullName || a.staffId === st.id)
              .reduce((sum, a) => sum + (a.price || 0), 0);
            return (
              <div key={st.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold">
                    {st.fullName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      {st.fullName}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {st.role} · {count} prestations réalisées
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-neutral-900 dark:text-white tabular-nums text-sm block">
                    {formatMoney(rev, language)}
                  </span>
                  <span className="text-[11px] text-[#C4785A] font-semibold">
                    Commission: {formatMoney(Math.round(rev * 0.25), language)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
