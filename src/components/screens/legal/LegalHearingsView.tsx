import React, { useState } from 'react';
import { Calendar, Plus, Clock, Landmark, CheckCircle2, ShieldCheck, Scale } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const LegalHearingsView: React.FC = () => {
  const { language } = useAtriumStore();
  const { hearings } = useLegalData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = hearings.filter(
    (h) =>
      (h.matterTitle?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (h.courtName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (h.benchJudge?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const pendingHearings = hearings.filter((h) => !h.isCompleted).length;
  const completedHearings = hearings.filter((h) => h.isCompleted).length;
  const uniqueCourts = new Set(hearings.map((h) => h.courtName)).size;

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الجلسات والمواعيد القضائية' : 'Rôle des Audiences & Délais Légaux'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {hearings.length} audiences
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'جدول الجلسات بالمحاكم والمجالس القضائية، المداولات وتبليغ المذكرات'
                : 'Calendrier des plaidoiries, composition de la cour & suivi des délibérés'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => showToast(language === 'ar' ? 'إضافة جلسة جديدة قريباً' : 'Ajout d\'audience disponible', 'info')}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'جلسة جديدة' : 'Nouvelle Audience'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مواعيد الجلسات والآجال الإجرائية' : 'Calendrier Judiciaire & Délais Légaux'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة جدول المرافعات أمام الغرف، مواعيد تبادل المذكرات والأحكام' : 'Audiences fixées, délibérés en attente et juridictions couvertes'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Audiences à venir */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'جلسات قادمة مبرمجة' : 'Audiences à Venir'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {pendingHearings}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {completedHearings} {language === 'ar' ? 'جلسة تمت المرافعة فيها' : 'audiences plaidées'}
              </p>
            </div>
          </div>

          {/* Card 2: Juridictions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'المحاكم والمجالس المغطاة' : 'Tribunaux & Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {uniqueCourts}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'مجالس قضاء ومحاكم ابتدائية' : 'Juridictions civiles & commerciales'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'احترام الآجال القانونية' : 'Respect des Délais Légaux'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% SLA
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'جلسة مدرجة بالجدول' : 'audiences au rôle'}
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
            <Calendar size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'جدول الجلسات والمرافعات' : 'Rôle Général des Audiences'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالجلسة، المحكمة، القاضي...' : 'Recherche audience, tribunal, juge...'}
            />
          </div>
        </div>

        {/* Hearings Cards Container */}
        <div className="space-y-3.5">
          {filtered.map((hearing) => (
            <div
              key={hearing.id}
              className="p-5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#C4785A]">
                    {hearing.hearingDate} {hearing.hearingTime ? `• ${hearing.hearingTime}` : ''}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                    {hearing.courtName}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  {hearing.matterTitle}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {hearing.courtRoom ? `Salle: ${hearing.courtRoom} • ` : ''}Président: {hearing.benchJudge || 'Non assigné'}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    hearing.isCompleted
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {hearing.isCompleted ? (language === 'ar' ? 'تمت المرافعة' : 'Plaidée') : (language === 'ar' ? 'قادمة' : 'À Venir')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
