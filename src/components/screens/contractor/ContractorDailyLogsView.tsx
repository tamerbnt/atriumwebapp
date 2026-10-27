import React, { useState } from 'react';
import { Calendar, Plus, Sun, Users, Truck, AlertTriangle, ShieldCheck, CheckCircle2, X, HardHat } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorDailyLog } from '../../../types';

export const ContractorDailyLogsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { dailyLogs, projects, selectedProjectId, setSelectedProjectId, addDailyLog } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<ContractorDailyLog['weather']>('Ensoleillé');
  const [headcount, setHeadcount] = useState('20');
  const [tasks, setTasks] = useState('');
  const [equipment, setEquipment] = useState('Grue à tour, 2x Toupie béton');
  const [incidents, setIncidents] = useState('R.A.S. Port des EPI vérifié');
  const [signature, setSignature] = useState('Ing. Mourad Benali');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectLogs = dailyLogs.filter((log) => log.projectId === (selectedProject?.id || selectedProjectId));

  const filteredLogs = projectLogs.filter((log) =>
    log.tasksAccomplished.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.date.includes(searchQuery) ||
    log.weather.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgHeadcount = projectLogs.length > 0
    ? Math.round(projectLogs.reduce((acc, l) => acc + l.headcountWorkers, 0) / projectLogs.length)
    : 0;

  const totalEquipmentCount = projectLogs.reduce((acc, l) => acc + l.equipmentOnSite.length, 0);

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasks.trim()) {
      showToast(isAr ? 'يرجى تدوين الأعمال المنجزة' : 'Veuillez saisir les tâches accomplies', 'error');
      return;
    }

    const newLog: ContractorDailyLog = {
      id: `log_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProject?.id || selectedProjectId,
      date,
      weather,
      headcountWorkers: parseInt(headcount, 10) || 15,
      equipmentOnSite: equipment.split(',').map((e) => e.trim()),
      tasksAccomplished: tasks.trim(),
      incidentsSafety: incidents.trim(),
      supervisorSignature: signature.trim(),
      createdAt: new Date().toISOString(),
    };

    addDailyLog(newLog);
    setIsModalOpen(false);
    setTasks('');
    showToast(
      isAr ? 'تم توقيع وتسجيل محضر الورشة اليومي' : 'Rapport journalier de chantier validé',
      'success'
    );
  };

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
                {isAr ? 'سجل العمليات اليومية ومحاضر الورشة' : 'Journal de Chantier & Attachements de Travaux'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projectLogs.length} rapports
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'محاضر الحضور اليومية، الأحوال الجوية، العتاد العامل وملاحظات الأمان'
                : 'Pointages d’effectifs, météo de chantier, engins mobilisés et sécurité'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'تقرير يومي جديد' : 'Nouveau Rapport Journalier'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التواجد الميداني والأمان' : 'Pointages Météo & Effectifs Chantier'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Rapports signés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'التقارير اليومية الموقعة' : 'Rapports Journaliers Signés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {projectLogs.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'محاضر رسمية معتمدة' : 'Attachements contradictoires'}
              </p>
            </div>
          </div>

          {/* Card 2: Effectif Moyen */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متوسط العمالة اليومية' : 'Effectif Moyen sur Site'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {avgHeadcount} <span className="text-sm font-sans font-normal text-neutral-500">ouvriers</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'التزام بقواعد السلامة' : 'Présence et pointage quotidien'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'العتاد الثقيل & الأمان' : 'Engins & Sécurité HSE'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% EPI Vérifié
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {totalEquipmentCount} <span className="text-sm font-sans font-normal text-neutral-300">engins mobilisés</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <ShieldCheck size={11} />
                {isAr ? 'لا توجد حوادث عمل مسجلة' : 'Contrôles périodiques conformes'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'أرشيف محاضر ورشات العمل' : 'Historique des Journaux de Chantier'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <FilterSelect
                value={selectedProject?.id || selectedProjectId}
                onChange={setSelectedProjectId}
                options={projectOptions}
              />
            </div>
            <div className="w-52">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالتاريخ، المهام...' : 'Filtrer tâche, météo...'}
              />
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Calendar size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد تقارير مسجلة لهذا المشروع' : 'Aucun rapport journalier pour ce chantier'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      {log.date}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1">
                      <Sun size={12} />
                      {log.weather}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-medium flex items-center gap-1">
                      <Users size={12} />
                      {log.headcountWorkers} ouvriers
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Signé par: <strong className="text-neutral-800 dark:text-neutral-200">{log.supervisorSignature}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                      Travaux & Tâches Accomplies
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                      {log.tasksAccomplished}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                        Engins & Matériel Mobilisé
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {log.equipmentOnSite.map((eq, i) => (
                          <span
                            key={i}
                            className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md text-[11px] text-neutral-600 dark:text-neutral-400"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                        Sécurité & Incidents HSE
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-400 text-[11px] mt-0.5">
                        {log.incidentsSafety}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'محضر ورشة يومي جديد' : 'Nouveau Rapport Journalier de Chantier'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'تاريخ التقرير' : 'Date'}
                  type="date"
                  value={date}
                  onChange={setDate}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الطقس' : 'Météo'}
                  value={weather}
                  onChange={(v) => setWeather(v as ContractorDailyLog['weather'])}
                  options={[
                    { value: 'Ensoleillé', label: '☀️ Ensoleillé' },
                    { value: 'Nuageux', label: '⛅ Nuageux' },
                    { value: 'Pluvieux', label: '🌧️ Pluvieux' },
                    { value: 'Venteux / Sirocco', label: '💨 Venteux / Sirocco' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'عدد العمال بالورشة' : 'Nombre d’Ouvriers'}
                  type="number"
                  value={headcount}
                  onChange={setHeadcount}
                  required
                />
                <LabelInput
                  label={isAr ? 'المشرف الموقّع' : 'Conducteur / Ingénieur'}
                  value={signature}
                  onChange={setSignature}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'الأعمال المنجزة بالتفصيل' : 'Tâches accomplies et avancement'}
                value={tasks}
                onChange={setTasks}
                placeholder="Ex: Coulage dalle niveau R+3, ferraillage voiles..."
                required
              />

              <LabelInput
                label={isAr ? 'العتاد والآليات (مفصولة بفاصلة)' : 'Engins et équipements sur place'}
                value={equipment}
                onChange={setEquipment}
                placeholder="Grue à tour, 2x Toupies, Nacelle..."
              />

              <LabelInput
                label={isAr ? 'ملاحظات الأمان وحوادث الورشة' : 'Sécurité HSE & Remarques'}
                value={incidents}
                onChange={setIncidents}
                placeholder="R.A.S. Port des EPI vérifié..."
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'توقيع المحضر' : 'Valider & Signer'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
