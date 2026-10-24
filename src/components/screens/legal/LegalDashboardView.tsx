import React, { useState } from 'react';
import {
  Scale,
  Briefcase,
  Plus,
  Calendar,
  Lock,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';

export const LegalDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { matters, hearings, addMatter } = useLegalData();

  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);

  const activeMatters = matters.filter((m) => m.status === 'Active' || m.status === 'PendingHearing').length;
  const upcomingHearings = hearings.filter((h) => !h.isCompleted).length;
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);
  const totalTrustEscrow = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Scale size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مكتب المحاماة والاستشارات القانونية' : 'Cabinet d\'Avocats & Conseil Juridique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 22
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة القضايا والملفات القضائية، مواعيد الجلسات، وحسابات الودائع (Séquestre)'
                : 'Gestion du contentieux, audiences & délais légaux, coffre-fort et compte séquestre CARPA'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsMatterModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'ملف قضية جديد' : 'Nouveau Dossier'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'القضايا الجارية' : 'Dossiers actifs'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {activeMatters}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {language === 'ar' ? 'قيد المتابعة' : 'En cours'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'الجلسات القادمة' : 'Audiences programmées'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
                {upcomingHearings}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'جلسة' : 'audiences'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'حساب الودائع (Séquestre)' : 'Fonds séquestre clients'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
                {formatMoney(totalTrustEscrow, language)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'الأتعاب المحصلة' : 'Honoraires facturés'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(totalRetainers, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Matters overview */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أحدث ملفات القضايا' : 'Derniers Dossiers en Instance'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('members')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض كل القضايا' : 'Tous les dossiers'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {matters.map((matter) => (
              <div key={matter.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#C4785A]">
                      {matter.matterNumber}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {matter.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Client: {matter.clientName} · Juridiction: {matter.courtJurisdiction}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {matter.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(matter.retainerAmountDzd, language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LegalMatterModal
        isOpen={isMatterModalOpen}
        onClose={() => setIsMatterModalOpen(false)}
        onSave={addMatter}
      />
    </div>
  );
};
