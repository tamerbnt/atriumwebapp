import React, { useState, useMemo } from 'react';
import {
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Activity,
  Dumbbell,
  CheckCircle2,
  Calendar,
  Search,
  Zap,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney, calculateDaysRemaining } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { ActionNode } from '../../ui/ActionNode';
import { Seek } from '../../ui/Seek';

interface MembershipDashboardViewProps {
  onAddMember?: () => void;
}

export const MembershipDashboardView: React.FC<MembershipDashboardViewProps> = ({
  onAddMember,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    members,
    plans,
    sales,
    schedule,
    currentBusiness,
    currentBranch,
    setScreen,
    selectMember,
  } = useAtriumStore();

  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // Scoped metrics
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'Active'),
    [members]
  );

  const expiringSoonMembers = useMemo(() => {
    return members.filter((m) => {
      if (m.status !== 'Active') return false;
      const days = calculateDaysRemaining(false, m.expirationDate);
      return days > 0 && days <= 7;
    });
  }, [members]);

  const expiredMembers = useMemo(
    () => members.filter((m) => m.status === 'Expired'),
    [members]
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const todayClasses = useMemo(() => {
    const dayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    return schedule.filter((s) => s.dayOfWeek === normalizedDay);
  }, [schedule]);

  const todayCheckinsCount = useMemo(() => {
    // Recent check-in simulations or logs
    return Math.max(14, Math.round(activeMembers.length * 0.35));
  }, [activeMembers.length]);

  const monthlyRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const filteredMembers = useMemo(() => {
    if (!searchMemberQuery.trim()) return [];
    const q = searchMemberQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.cardId?.toLowerCase().includes(q) ||
          m.phoneNumber?.includes(q)
      )
      .slice(0, 5);
  }, [members, searchMemberQuery]);

  const handleSimulateCheckin = (member: (typeof members)[0]) => {
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تسجيل الدخول' : language === 'fr' ? 'Accès autorisé' : 'Access Granted',
      message: `${member.fullName} · ${member.membershipPlanName || 'Standard Pass'} (RFID: ${member.cardId || 'TAG-OK'})`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Quick Check-in */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Dumbbell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                  {currentBusiness.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {language === 'ar' ? 'نادي رياضي واشتراكات' : language === 'fr' ? 'Club & Abonnements' : 'Membership Club'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {language === 'ar' ? 'بوابات RFID وإدارة المشتركين' : language === 'fr' ? 'Contrôle d\'accès RFID & Suivi des adhérents' : 'RFID Turnstiles & Member Pass Control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Seek
              value={searchMemberQuery}
              onChange={setSearchMemberQuery}
              placeholder={
                language === 'ar'
                  ? 'بحث سريع أو مسح بطاقة RFID...'
                  : language === 'fr'
                  ? 'Recherche rapide ou badge RFID...'
                  : 'Quick lookup or RFID badge scan...'
              }
              openWidth={340}
              shutSize={38}
            />

            {onAddMember && (
              <button
                type="button"
                onClick={onAddMember}
                className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>{language === 'ar' ? 'اشتراك جديد' : language === 'fr' ? 'Nouvel Adhérent' : 'New Member'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Dropdown Results */}
        {filteredMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              {language === 'ar' ? 'نتائج بطاقات المشتركين المطابقة' : language === 'fr' ? 'Résultats correspondants' : 'Matching Member Cards'}
            </span>
            {filteredMembers.map((mem) => (
              <div
                key={mem.id}
                className="py-2 flex items-center justify-between text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/50 px-2 rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${mem.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white">{mem.fullName}</span>
                    <span className="text-neutral-400 text-[11px] ml-2">RFID: {mem.cardId || 'N/A'} · {mem.membershipPlanName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateCheckin(mem)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    {language === 'ar' ? 'تسجيل دخول' : language === 'fr' ? 'Valider entrée' : 'Check In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectMember(mem.id);
                      setScreen('members');
                    }}
                    className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'المشتركون النشطون' : language === 'fr' ? 'Adhérents Actifs' : 'Active Members'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
              {activeMembers.length}
            </span>
            <span className="text-[11px] text-neutral-400">
              / {members.length} {language === 'ar' ? 'إجمالي' : language === 'fr' ? 'total' : 'total'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {Math.round((activeMembers.length / (members.length || 1)) * 100)}% {language === 'ar' ? 'معدل النشاط' : language === 'fr' ? 'taux d\'activité' : 'retention rate'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'دخول البوابات اليوم' : language === 'fr' ? 'Passages Portique Aujourd\'hui' : 'Today\'s Turnstile Check-ins'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
              {todayCheckinsCount}
            </span>
            <span className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'حضور' : language === 'fr' ? 'visites' : 'scans'}
            </span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{language === 'ar' ? 'بوابة RFID متصلة' : language === 'fr' ? 'Portique RFID actif' : 'RFID Reader Connected'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'تنتهي خلال 7 أيام' : language === 'fr' ? 'Expire dans 7 jours' : 'Expiring Soon (7d)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">
              {expiringSoonMembers.length}
            </span>
            <span className="text-[11px] text-amber-600 font-semibold">
              {language === 'ar' ? 'تجديد مطلوب' : language === 'fr' ? 'À renouveler' : 'Renewals due'}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {expiredMembers.length} {language === 'ar' ? 'منتهي الصلاحية' : language === 'fr' ? 'déjà expirés' : 'already expired'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مبيعات المتجر والاشتراكات' : language === 'fr' ? 'Revenus Abonnements & Pro-Shop' : 'Monthly Club Revenue'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(monthlyRevenue, language)}
            </span>
          </div>
          <div className="text-[11px] text-[#C4785A] font-semibold mt-1">
            {sales.length} {language === 'ar' ? 'عملية سداد مسجلة' : language === 'fr' ? 'règlements enregistrés' : 'processed payments'}
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Classes & Expiring Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes Scheduled Today */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'حصص اليوم التدريبية' : language === 'fr' ? 'Séances programmées aujourd\'hui' : 'Today\'s Fitness Classes'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {todayClasses.length} {language === 'ar' ? 'حصص مجدولة بالقاعات الرياضية' : language === 'fr' ? 'séances prévues en salle' : 'sessions scheduled across studios'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreen('scheduler')}
              className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض الجدول الأسبوعي' : language === 'fr' ? 'Planning complet' : 'Full Timetable'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {todayClasses.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                {language === 'ar' ? 'لا توجد حصص مجدولة لهذا اليوم' : language === 'fr' ? 'Aucune séance programmée aujourd\'hui' : 'No fitness classes scheduled today'}
              </div>
            ) : (
              todayClasses.map((cls) => (
                <div key={cls.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                      <span>{cls.startTime}</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                        {cls.title}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {cls.trainerOrStaff || 'Coach'} · {cls.roomOrArea || 'Studio A'} · {cls.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-500">
                      {cls.enrolledCount || 0} / {cls.capacity} {language === 'ar' ? 'مشترك' : language === 'fr' ? 'places' : 'spots'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {cls.category || 'All Levels'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiring Soon Sidebar Card */}
        <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'تنبيهات التجديد' : language === 'fr' ? 'Alertes renouvellement' : 'Renewal Radar'}
            </h2>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {language === 'ar'
              ? 'مشتركون تنتهي اشتراكاتهم قريبا، تواصل معهم لتجديد العضوية.'
              : language === 'fr'
              ? 'Adhérents dont l\'abonnement arrive à échéance cette semaine.'
              : 'Members whose subscriptions expire within 7 days.'}
          </p>

          <div className="space-y-2.5">
            {expiringSoonMembers.slice(0, 5).map((mem) => {
              const days = calculateDaysRemaining(false, mem.expirationDate);
              return (
                <div
                  key={mem.id}
                  onClick={() => {
                    selectMember(mem.id);
                    setScreen('members');
                  }}
                  className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      {mem.fullName}
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300">
                      {mem.membershipPlanName || 'Plan'} · {mem.phoneNumber || 'No phone'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 tabular-nums">
                    {days} {language === 'ar' ? 'أيام' : language === 'fr' ? 'j' : 'days'}
                  </span>
                </div>
              );
            })}

            {expiringSoonMembers.length === 0 && (
              <div className="py-6 text-center text-xs text-neutral-400">
                {language === 'ar' ? 'لا توجد اشتراكات تنتهي قريباً' : language === 'fr' ? 'Aucun abonnement à échéance imminente' : 'No memberships expiring soon'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
