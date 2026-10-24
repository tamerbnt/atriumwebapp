import React, { useState } from 'react';
import { Briefcase, Plus, Landmark, Calendar, Phone } from 'lucide-react';
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
      m.courtJurisdiction.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (catFilter !== 'all') return m.category === catFilter;
    return true;
  });

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الفروع' : 'Toutes les branches' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Civil', label: 'Civil' },
    { value: 'Labor', label: 'Social & Travail' },
    { value: 'Penal', label: 'Pénal' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Briefcase size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'ملفات القضايا والموكلين' : 'Dossiers Juridiques & Affaires'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {matters.length} dossiers
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة الملفات القضائية، الخصوم، ومحاكم الاختصاص'
                : 'Registre des affaires en cours, juridictions, parties adverses & stratégie'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsMatterModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'فتح قضية جديدة' : 'Nouveau Dossier'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث عن قضية، موكل أو محكمة...' : 'Recherche dossier, client, tribunal...'}
            />
            <FilterSelect
              value={catFilter}
              onChange={setCatFilter}
              options={filterOptions}
            />
          </div>
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'ملفات' : 'dossiers trouvés'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((matter) => (
            <div
              key={matter.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#C4785A]">
                  {matter.matterNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {matter.category}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {matter.title}
                </h3>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                  <Landmark size={12} className="shrink-0" />
                  <span className="truncate">{matter.courtJurisdiction}</span>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs space-y-1">
                <div>
                  <span className="text-neutral-400">Client:</span>{' '}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{matter.clientName}</span>
                </div>
                {matter.adversePartyName && (
                  <div>
                    <span className="text-neutral-400">Adverse:</span>{' '}
                    <span className="font-semibold text-rose-600">{matter.adversePartyName}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney(matter.retainerAmountDzd, language)}
                </div>
                {matter.nextHearingDate && (
                  <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                    <Calendar size={11} />
                    <span>Audience: {matter.nextHearingDate}</span>
                  </div>
                )}
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
