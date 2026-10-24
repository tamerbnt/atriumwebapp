import React, { useState } from 'react';
import { Calendar, Plus, Clock, Landmark, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث في الجلسات أو المحاكم...' : 'Recherche audience, tribunal, juge...'}
          />
        </div>

        <div className="space-y-4">
          {filtered.map((hearing) => (
            <div
              key={hearing.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex flex-col items-center justify-center text-xs font-bold font-mono">
                    <Calendar size={13} />
                    <span className="text-[10px]">{hearing.hearingTime}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {hearing.courtName}
                    </h3>
                    <div className="text-xs text-neutral-500">
                      Date: <span className="font-semibold">{hearing.hearingDate}</span> · Juge: {hearing.benchJudge}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {hearing.resultSummary}
                </span>
              </div>

              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Affaire: {hearing.matterTitle}
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg">
                <span className="font-semibold text-neutral-500 mr-1">Objet:</span>
                {hearing.purpose}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
