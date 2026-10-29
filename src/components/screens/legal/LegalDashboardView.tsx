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
  CheckCircle2,
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات القضايا والودائع القانونية' : 'Contentieux Actif & Séquestre Juridique'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة ملفات الموكلين، جدول الجلسات القضائية وأرصدة الودائع المحمية' : 'Dossiers au rôle, calendrier des audiences et fonds séquestre CARPA'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Dossiers Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'القضايا والملفات الجارية' : 'Dossiers Actifs au Rôle'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeMatters}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {matters.length} {language === 'ar' ? 'ملف إجمالي مسجل' : 'affaires enregistrées'}
              </p>
            </div>
          </div>

          {/* Card 2: Audiences & Délais */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'جلسات المحاكم القادمة' : 'Audiences Programmées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {upcomingHearings}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {hearings.length} {language === 'ar' ? 'جلسة مبرمجة' : 'dates d\'audience'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'حساب الودائع (Séquestre)' : 'Séquestre CARPA Clients'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Fonds Protégés
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalTrustEscrow, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {formatMoney(totalRetainers, language)} {language === 'ar' ? 'أتعاب مقبوضة' : 'honoraires perçus'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'الملفات القضائية النشطة بالمكتب' : 'Affaires & Contentieux en Cours'}
            </h2>
          </div>
          <AtriumButton
            variant="ghost"
            size="xs"
            onClick={() => setScreen('members')}
            icon={<ChevronRight size={14} />}
          >
            {language === 'ar' ? 'عرض الكل' : 'Voir tout'}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {matters.slice(0, 6).map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#C4785A]">
                  {m.matterNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.status === 'PendingHearing'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : m.status === 'Active'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {m.title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {m.clientName} • {m.courtJurisdiction || 'Tribunal'}
                </div>
              </div>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  {m.category}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatMoney(m.retainerAmountDzd, language)}
                </span>
              </div>
            </div>
          ))}
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
