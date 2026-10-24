import React, { useState } from 'react';
import { Calendar, Plus, Sun, Users, Truck, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
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
  const [weather, setWeather] = useState('Ensoleillé');
  const [headcount, setHeadcount] = useState('20');
  const [tasks, setTasks] = useState('');
  const [equipment, setEquipment] = useState('Grue à tour, 2x Toupie béton');
  const [incidents, setIncidents] = useState('R.A.S. Port des EPI vérifié');
  const [signature, setSignature] = useState('Ing. Mourad Benali');

  const projectLogs = dailyLogs.filter((log) => log.projectId === selectedProjectId);

  const filteredLogs = projectLogs.filter((log) =>
    log.tasksAccomplished.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.date.includes(searchQuery) ||
    log.weather.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      projectId: selectedProjectId,
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'سجل العمليات اليومية ومحاضر الورشة' : 'Journal de Chantier & Attachements de Travaux'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {projectLogs.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'محاضر الحضور اليومية، الأحوال الجوية، العتاد العامل وملاحظات الأمان'
                : 'Pointages d’effectifs, météo de chantier, engins mobilisés et sécurité'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالتاريخ أو المهام...' : 'Rechercher date ou tâches...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'تقرير يومي جديد' : 'Nouveau Rapport Journalier'}
          </AtriumButton>
        </div>
      </div>

      {/* Project Switcher Bar */}
      <div className="bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-neutral-500 font-medium">{isAr ? 'الورشة:' : 'Chantier:'}</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-medium"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.projectCode} - {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* Daily Logs Timeline */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Calendar size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد تقارير مسجلة لهذه الورشة' : 'Aucun rapport pour ce chantier'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {log.date}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-xs">
                      {log.weather}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1 font-medium">
                      <Users size={13} className="text-[#C4785A]" />
                      <span>{log.headcountWorkers} ouvriers</span>
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400">
                    Signé par: <strong className="text-neutral-800 dark:text-neutral-200">{log.supervisorSignature}</strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">Travaux Réalisés: </span>
                    <span className="text-neutral-900 dark:text-white">{log.tasksAccomplished}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Truck size={13} />
                      <span>Engins:</span>
                    </span>
                    {log.equipmentOnSite.map((eq, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                        {eq}
                      </span>
                    ))}
                  </div>

                  {log.incidentsSafety && (
                    <div className="flex items-center gap-1.5 text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-lg text-[11px]">
                      <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                      <span>{log.incidentsSafety}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'محضر ورشة يومي جديد' : 'Rapport Quotidien de Chantier'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'التاريخ' : 'Date'}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الطقس' : 'Météo'}
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  options={[
                    { value: 'Ensoleillé', label: 'Ensoleillé' },
                    { value: 'Nuageux', label: 'Nuageux' },
                    { value: 'Pluvieux', label: 'Pluvieux' },
                    { value: 'Venteux / Sirocco', label: 'Venteux / Sirocco' },
                  ]}
                />
                <LabelInput
                  label={isAr ? 'عدد العمال' : 'Effectif Ouvriers'}
                  type="number"
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'الأعمال والمهام المنجزة *' : 'Tâches & Travaux Accomplis *'}
                placeholder="Ex: Coulage dalle niveau R+3, ferraillage voiles..."
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                required
              />

              <LabelInput
                label={isAr ? 'العتاد والآليات في الموقع' : 'Engins & Matériel Mobilisé'}
                placeholder="Ex: Grue 45m, 2x Toupie 8m3, Vibreur..."
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              />

              <LabelInput
                label={isAr ? 'الأمن والسلامة والملاحظات' : 'Sécurité & Incidents Éventuels'}
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
              />

              <LabelInput
                label={isAr ? 'المشرف الموقع' : 'Conducteur / Chef de Chantier'}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد المحضر' : 'Signer & Enregistrer'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
