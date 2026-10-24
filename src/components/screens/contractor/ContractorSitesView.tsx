import React, { useState } from 'react';
import { HardHat, Plus, MapPin, Calendar, Building, CheckCircle2, Clock } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useContractorData } from './contractorData';
import { ContractorProjectModal } from './ContractorProjectModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const ContractorSitesView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { projects, addProject, setSelectedProjectId } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Building size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'المشاريع والورشات (Chantiers)' : 'Projets & Chantiers en Cours'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {projects.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'إدارة محفظة صفقات البناء، أوامر الخدمة، والمتابعة الهندسية'
                : 'Fiches chantiers, montants contractuels, ordres de service et encadrement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالورشة، العميل...' : 'Rechercher chantier, client...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'ورشة جديدة' : 'Nouveau Chantier'}
          </AtriumButton>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-neutral-500 font-medium mr-1">{isAr ? 'الحالة:' : 'Statut:'}</span>
        {[
          { key: 'all', label: isAr ? 'الكل' : 'Tous' },
          { key: 'InProgress', label: isAr ? 'قيد الإنجاز' : 'En Cours' },
          { key: 'ProvisionalHandover', label: isAr ? 'استلام مؤقت' : 'Réception Provisoire' },
          { key: 'Completed', label: isAr ? 'مكتمل' : 'Clôturé' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              statusFilter === f.key
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sites Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProjects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Building size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد ورشات مطابقة للبحث' : 'Aucun chantier correspondant'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-[#C4785A]/50 transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {p.projectCode}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'InProgress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                      {p.projectName}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-1">
                      {p.clientName}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl">
                    <MapPin size={14} className="shrink-0 text-[#C4785A]" />
                    <span className="truncate">{p.siteLocation}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 font-medium">{isAr ? 'نسبة الإنجاز:' : 'Avancement:'}</span>
                      <span className="font-mono font-bold text-[#C4785A]">{p.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-[#C4785A] rounded-full"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Montant Marché</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(p.contractAmountDzd)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Conducteur</div>
                    <div className="font-medium text-neutral-700 dark:text-neutral-300 mt-0.5 truncate max-w-[120px]">
                      {p.supervisorName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <ContractorProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(newProj) => {
          addProject(newProj);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
