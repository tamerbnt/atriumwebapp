import React, { useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Download,
  Calendar,
  ArrowUpRight,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

export const MembershipFinanceView: React.FC = () => {
  const { language } = useTranslation();
  const { sales, members, staff, currentBusiness, currentBranch } = useAtriumStore();

  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const totalPayroll = useMemo(() => {
    return staff.reduce((sum, st) => sum + (st.salary || 0), 0);
  }, [staff]);

  const netBalance = totalRevenue - totalPayroll;

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
                {language === 'ar' ? 'المالية ورواتب المدربين' : language === 'fr' ? 'Finances & Rémunérations Coachs' : 'Club Finance & Coach Payroll'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {language === 'ar' ? 'متابعة إيرادات الاشتراكات وسجلات الرواتب' : language === 'fr' ? 'Revenus des abonnements et masse salariale' : 'Subscription revenue and trainer payroll'}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Total Recettes</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums mt-1 block">
              {formatMoney(totalRevenue, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{sales.length} transactions</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Salaires Coachs & Staff</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {formatMoney(totalPayroll, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{staff.length} collaborateurs</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Solde Net d'Exploitation</span>
            <span className={`text-xl font-black tabular-nums mt-1 block ${netBalance >= 0 ? 'text-[#C4785A]' : 'text-rose-600'}`}>
              {formatMoney(netBalance, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Marge opérationnelle</span>
          </div>
        </div>
      </div>

      {/* Staff & Coach Payroll Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Équipe & Entraîneurs du Club ({staff.length})
          </h2>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
          {staff.map((st) => (
            <div key={st.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300">
                  {st.fullName.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">
                    {st.fullName}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {st.role} · Jour de paie: {st.paymentDay || 28} du mois
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-neutral-900 dark:text-white tabular-nums text-sm block">
                  {formatMoney(st.salary || 0, language)}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">Actif</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
