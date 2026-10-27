import React, { useState } from 'react';
import { Briefcase, Plus, Landmark, Calendar, Phone, CheckCircle2, ShieldCheck, Scale } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LegalMatterModal } from './LegalMatterModal';

export const LegalMattersView: React.FC = () => {
  const { language } = useAtriumStore();
  const { matters, addMatter } = useLegalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);

  const filtered = matters.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.matterNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.courtJurisdiction?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (catFilter !== 'all') return m.category === catFilter;
    return true;
  });

  const activeCount = matters.filter((m) => m.status === 'Active').length;
  const pendingHearingCount = matters.filter((m) => m.status === 'PendingHearing').length;
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الفروع' : 'Toutes les branches' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Civil', label: 'Civil' },
    { value: 'Labor', label: 'Social & Travail' },
    { value: 'Penal', label: 'Pénal' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'ملفات القضايا والموكلين' : 'Dossiers Juridiques & Affaires'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {matters.length} dossiers
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'فهرس القضايا، الجهة القضائية المختصة، الموكلين والأتعاب'
                : 'Contentieux, conseil d\'entreprise, juridictions & conventions d\'honoraires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsMatterModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'ملف جديد' : 'Nouveau Dossier'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'توزيع ملفات القضايا والنزاعات' : 'Répartition du Contentieux & Affaires'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الملفات النشطة، القضايا بانتظار جلسات المحكمة والأتعاب الإجمالية' : 'Dossiers en cours de plaidoirie, audiences fixées et honoraires forfaitaires'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Dossiers Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'ملفات قيد المرافعة والاستشارة' : 'Affaires en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {matters.length} {language === 'ar' ? 'ملف مسجل بالمكتب' : 'dossiers au cabinet'}
              </p>
            </div>
          </div>

          {/* Card 2: En attente d'audience */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'قضايا بانتظار جلسة قادمة' : 'En Attente d\'Audience'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {pendingHearingCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'مدرجة في جدول المحكمة' : 'Inscrites au rôle du tribunal'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'إجمالي الأتعاب المقررة' : 'Masse des Honoraires'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Conventions
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalRetainers, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'ملف مطابق للبحث' : 'dossiers affichés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل القضايا والموكلين' : 'Registre des Affaires & Mandats'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالقضية، الموكل، المحكمة...' : 'Rechercher affaire, client, tribunal...'}
            />
            <FilterSelect
              value={catFilter}
              onChange={setCatFilter}
              options={filterOptions}
            />
          </div>
        </div>

        {/* Matters Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم القضية' : 'N° Dossier'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'موضوع النزاع' : 'Intitulé'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الموكل' : 'Client Mandant'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الجهة القضائية' : 'Juridiction'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الفرع القانوني' : 'Branche'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الأتعاب' : 'Honoraires'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                      {m.matterNumber}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {m.title}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {m.clientName}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">
                      {m.courtJurisdiction || 'Tribunal d\'Alger'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
