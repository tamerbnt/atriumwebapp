import React, { useState } from 'react';
import { HardHat, Building, Calendar, Users, CheckCircle2, Plus, Clock, FileText, ArrowRight } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ContractorProjectModal } from './ContractorProjectModal';

export const ContractorDashboardView: React.FC = () => {
  const { language, setScreen, activeContractorRole } = useAtriumStore();
  const isAr = language === 'ar';
  const { projects, dailyLogs, dgps, addProject, setSelectedProjectId } = useContractorData();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalContractValue = projects.reduce((acc, p) => acc + p.contractAmountDzd, 0);
  const totalRetentionHeld = projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);
  const totalBilledDzd = dgps.reduce((acc, d) => acc + d.periodGrossDzd, 0);
  const activeProjects = projects.filter((p) => p.status === 'InProgress');
  const cautionProjects = projects.filter((p) => p.hasBankCautionReplacement);
  const totalCautionCoveredDzd = cautionProjects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);
  const latestLog = dailyLogs[0];

  // Role metadata mapping
  const roleMeta = {
    gerant: {
      tag: isAr ? 'المدير العام' : 'Gérant / Direction',
      title: isAr ? 'لوحة القيادة والمؤشرات الاستراتيجية' : 'Supervision Direction & Marchés Publics',
      subtitle: isAr
        ? 'متابعة الصفقات المبرمة، الكفالات المصرفية وأوامر الخدمة (OS)'
        : 'Gouvernance globale des marchés Décret 15-247, cautions BNA/CPA et trésorerie',
      actionLabel: isAr ? 'صفقة / ورشة جديدة' : 'Nouveau Chantier',
      actionClick: () => setIsModalOpen(true),
    },
    conducteur: {
      tag: isAr ? 'مدير الأشغال' : 'Conducteur de Travaux',
      title: isAr ? 'لوحة العمليات والتقدم الميداني' : 'Supervision Opérations Chantiers',
      subtitle: isAr
        ? 'متابعة مخططات جانت، زيارات CTC واختبارات كسر الخرسانة والتعاقد من الباطن'
        : 'Avancement physique des lots, contrôles CTC Béton et attachements sous-traitants',
      actionLabel: isAr ? 'جدول الإنجاز DQE' : 'Avancement DQE',
      actionClick: () => setScreen('shop'),
    },
    chef_chantier: {
      tag: isAr ? 'رئيس الورشة' : 'Chef de Chantier',
      title: isAr ? 'مركز قيادة رئيس الورشة (الميدان)' : 'Poste de Commandement Terrain',
      subtitle: isAr
        ? 'تسجيل الحضور اليومي للعمال، دفتر الورشة، وصولات BPE والعتاد'
        : 'Pointage journalier des équipes, météo CACOBATPH, bons de coulage et gasoil',
      actionLabel: isAr ? 'حضور اليوم' : 'Pointage Équipes',
      actionClick: () => setScreen('scheduler'),
    },
    metreur: {
      tag: isAr ? 'مهندس القياس' : 'Métreur & Études',
      title: isAr ? 'مكتب الدراسات وتقدير التكاليف' : 'Cockpit Études de Prix & DQE',
      subtitle: isAr
        ? 'الكشف الكمي والتقديري BPU/DQE، الكشوف التناقضية ومراجعة الأسعار'
        : 'Avant-métrés, bordereaux BPU, attachements contradictoires et révisions des prix',
      actionLabel: isAr ? 'الكشف DQE' : 'Studio DQE',
      actionClick: () => setScreen('shop'),
    },
    comptable: {
      tag: isAr ? 'المحاسب المالي' : 'Comptable Chantier & RAF',
      title: isAr ? 'لوحة الفوترة والكشوف المؤقتة' : 'Facturation BTP & Décomptes 15-247',
      subtitle: isAr
        ? 'إصدار الكشوف المؤقتة، اقتطاع الضمان 5%، ملف CACOBATPH 48h وصندوق الورشة'
        : 'Décomptes Provisoires CCAG, mandats Trésor, dossier intempéries et caisse',
      actionLabel: isAr ? 'كشف جديد (DGP)' : 'Nouveau Décompte',
      actionClick: () => setScreen('finance'),
    },
  };

  const currentRoleKey =
    activeContractorRole === 'conducteur_travaux'
      ? 'conducteur'
      : activeContractorRole === 'daf_metreur'
      ? 'metreur'
      : activeContractorRole || 'gerant';

  const roleInfo = roleMeta[currentRoleKey] || roleMeta.gerant;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <HardHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {roleInfo.title}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {roleInfo.tag}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {roleInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={roleInfo.actionClick}
            icon={<Plus size={14} />}
          >
            {roleInfo.actionLabel}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات أداء الورشات والصفقات' : 'Indicateurs de Pilotage & Conformité BTP'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة الالتزامات التعاقدية، الخرسانة، العمالة المسجلة والكشوف المالية'
              : 'Suivi en temps réel des engagements, ressources chantier et jalons réglementaires'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Portefeuille ou Effectif */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {currentRoleKey === 'chef_chantier'
                ? isAr ? 'العمال الحاضرون اليوم بالورشات' : 'Effectif Présent Aujourd\'hui'
                : isAr ? 'إجمالي قيمة الصفقات المتعاقد عليها' : 'Portefeuille Marchés BTP'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {currentRoleKey === 'chef_chantier'
                  ? `${latestLog?.headcountWorkers || 24} ouvriers`
                  : formatMoney(totalContractValue)}
              </div>
              <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                {currentRoleKey === 'chef_chantier'
                  ? (isAr ? 'بناءون، نجارون، حدادون وعمال' : 'Maçons, coffreurs, ferrailleurs, manœuvres')
                  : `${projects.length} ${isAr ? 'مشاريع وصفقات مسجلة' : 'projets au total'}`}
              </p>
            </div>
          </div>

          {/* Card 2: Chantiers en cours ou Météo / Cautions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {currentRoleKey === 'chef_chantier'
                ? isAr ? 'سجل الطقس وتعويض CACOBATPH' : 'Météo & Alerte CACOBATPH'
                : currentRoleKey === 'gerant'
                ? isAr ? 'الكفالات البنكية المحررة للضمان' : 'Cautions Bancaires Actives'
                : isAr ? 'الورشات النشطة قيد الإنجاز' : 'Chantiers en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {currentRoleKey === 'chef_chantier'
                  ? latestLog?.weather || 'Ensoleillé'
                  : currentRoleKey === 'gerant'
                  ? formatMoney(totalCautionCoveredDzd)
                  : `${activeProjects.length} sites`}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {currentRoleKey === 'chef_chantier'
                  ? (isAr ? 'تأهيل تعويض العطل والبطالة الناجمة عن الطقس' : 'Délai légal de déclaration 48 heures')
                  : currentRoleKey === 'gerant'
                  ? (isAr ? 'كفالات معتمدة BNA / CPA بديلا عن حجز 5%' : 'Garanties BNA/CPA substituant la retenue 5%')
                  : (isAr ? 'متابعة العمليات والمحاضر اليومية' : 'Suivi journalier d\'avancement actif')}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الكشوفات المفوترة (DGP)' : 'Situations Facturées (DGP)'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Décret 15-247
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalBilledDzd)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {formatMoney(totalRetentionHeld)} {isAr ? 'اقتطاع ضمان مسترجع' : 'retenue de garantie réservée'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Avancement des Chantiers Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'نسب الإنجاز الفعلي بالورشات الكبرى' : 'Taux d’Avancement des Chantiers Principaux'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
            {projects.length} sites
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded-md">
                    {p.projectCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'InProgress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {p.projectName}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                    {p.clientName} · {p.siteLocation}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">{isAr ? 'نسبة الإنجاز:' : 'Avancement:'}</span>
                  <span className="font-mono font-bold text-[#C4785A]">{p.progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-[#C4785A] rounded-full transition-all duration-500"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span>{formatMoney(p.contractAmountDzd)}</span>
                  <span>{p.supervisorName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Daily Logs Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'آخر تقارير ورشات العمل المعتمدة' : 'Derniers Rapports de Chantier Signés'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
            {dailyLogs.length} logs
          </span>
        </div>

        <div className="space-y-3">
          {dailyLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-neutral-900 p-4 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-white font-mono">
                    {log.date}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px]">
                    {log.weather}
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    · {log.headcountWorkers} ouvriers sur site
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {log.tasksAccomplished}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">Superviseur</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                  {log.supervisorSignature}
                </span>
              </div>
            </div>
          ))}
        </div>
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
