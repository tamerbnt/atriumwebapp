import React, { useState } from 'react';
import { Building, Plus, MapPin, Calendar, CheckCircle2, Clock, Users, ArrowRight } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { ContractorProjectModal } from './ContractorProjectModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';

export const ContractorSitesView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { projects, addProject, setSelectedProjectId } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = projects.filter((p) => p.status === 'InProgress').length;
  const handoverCount = projects.filter((p) => p.status === 'ProvisionalHandover' || p.status === 'DefinitiveHandover').length;
  const totalContractDzd = projects.reduce((acc, p) => acc + p.contractAmountDzd, 0);
  const totalRetentionDzd = projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);

  const statusOptions = [
    { value: 'all', label: isAr ? 'جميع الحالات' : 'Tous les statuts' },
    { value: 'InProgress', label: isAr ? 'قيد الإنجاز' : 'En Cours' },
    { value: 'ProvisionalHandover', label: isAr ? 'استلام مؤقت' : 'Réception Provisoire' },
    { value: 'DefinitiveHandover', label: isAr ? 'استلام نهائي' : 'Réception Définitive' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Building size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المشاريع والورشات (Chantiers)' : 'Projets & Chantiers en Cours'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projects.length} sites
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة محفظة صفقات البناء، أوامر الخدمة، والمتابعة الهندسية'
                : 'Fiches chantiers, montants contractuels, ordres de service et encadrement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'ورشة جديدة' : 'Nouveau Chantier'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'توزيع الورشات والالتزامات التعاقدية' : 'Suivi Opérationnel & Engagements'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة مراحل التنفيذ، تواريخ التسليم التعاقدية والضمانات البنكية'
              : 'État d\'avancement physique, réceptions provisoires et retenues de garantie'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Chantiers en cours */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الورشات النشطة قيد الإنجاز' : 'Chantiers en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'متابعة دورية مستمرة' : 'Sous suivi conducteur actif'}
              </p>
            </div>
          </div>

          {/* Card 2: Réceptions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الاستلامات المؤقتة والنهائية' : 'Réceptions & Clôtures'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {handoverCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'مشاريع مسلّمة ومرحلة الضمان' : 'Livrés avec PV de réception'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي محفظة الصفقات' : 'Montant Total Engagé'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Marchés BTP
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalContractDzd)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {formatMoney(totalRetentionDzd)} {isAr ? 'ضمان 5%' : 'retenues de garantie'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'فهرس الورشات ومشاريع البناء' : 'Répertoire des Chantiers & Marchés'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالورشة، العميل...' : 'Rechercher chantier, client...'}
              />
            </div>
            <div className="w-44">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
              />
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Building size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد ورشات مطابقة للبحث' : 'Aucun chantier correspondant aux critères'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/60 transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {p.projectCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
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

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 font-medium">{isAr ? 'نسبة الإنجاز:' : 'Avancement:'}</span>
                      <span className="font-mono font-bold text-[#C4785A]">{p.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-[#C4785A] rounded-full transition-all duration-300"
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
