import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Sun,
  Users,
  Truck,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  Printer,
  Copy,
  Trash2,
  HardHat,
  Eye,
  Check,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorDailyLog } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const ContractorDailyLogsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { dailyLogs, projects, selectedProjectId, setSelectedProjectId, addDailyLog } = useContractorData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ContractorDailyLog | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'engins' | 'hse'>('fiche');

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
    setSelectedLog(newLog);
    showToast(
      isAr ? 'تم توقيع وتسجيل محضر الورشة اليومي' : 'Rapport journalier de chantier validé et archivé',
      'success'
    );
  };

  const getLogActions = (log: ContractorDailyLog): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة المحضر' : 'Consulter Fiche',
      icon: <Eye size={14} />,
      onClick: () => setSelectedLog(log),
    },
    {
      label: isAr ? 'طباعة PV' : 'Imprimer PV',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `جاري طباعة محضر الورشة ليوم ${log.date}`
            : `Génération du PV contradictoire de chantier (${log.date})`,
          'info'
        );
      },
    },
    {
      label: isAr ? 'تأكيد السلامة' : 'Audit HSE',
      icon: <ShieldCheck size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `تم فحص وتأكيد معايير الوقاية والأمان ليوم ${log.date}`
            : `Contrôle de sécurité validé conforme pour la journée du ${log.date}`,
          'success'
        );
      },
    },
    {
      label: isAr ? 'تكرار المحضر' : 'Dupliquer Log',
      icon: <Copy size={14} />,
      onClick: () => {
        const dup: ContractorDailyLog = {
          ...log,
          id: `log_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        };
        addDailyLog(dup);
        setSelectedLog(dup);
        showToast(
          isAr ? 'تم تكرار محضر الورشة لليوم الجديد' : 'Rapport de chantier dupliqué pour aujourd’hui',
          'success'
        );
      },
    },
  ];

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
          <div className="w-56">
            <FilterSelect
              value={selectedProject?.id || selectedProjectId}
              onChange={setSelectedProjectId}
              options={projectOptions}
            />
          </div>
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'محضر يومي جديد' : 'Nouveau Rapport'}
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

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'محاضر وسجلات الورشة اليومية' : 'Registres des Attachements & Météo Chantier'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'بيانات التواجد والعتاد والأمان الميداني' : 'Pointages certifiés d’effectifs, météo et sécurité HSE'}
            </p>
          </div>

          {/* Authentic BTP Daily Log Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع المحاضر' : 'Tous les rapports' },
              { id: 'recent', label: isAr ? 'الأسبوع الحالي' : 'Cette semaine' },
              { id: 'hse_clean', label: isAr ? 'مطابق HSE' : 'HSE Conforme' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 ? '#FCEEE8' : 'transparent',
                  color: idx === 0 ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<ContractorDailyLog>
            title={isAr ? 'محاضر الورشة اليومية' : 'Journaux & Attachements de Chantier'}
            subtitle={selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
            items={projectLogs}
            keyExtractor={(log) => log.id}
            searchPlaceholder={isAr ? 'بحث بالتاريخ، المهام، المشرف...' : 'Rechercher par date, travaux, météo, encadrement...'}
            searchFilter={(log, query) =>
              log.tasksAccomplished.toLowerCase().includes(query.toLowerCase()) ||
              log.date.includes(query) ||
              log.weather.toLowerCase().includes(query.toLowerCase()) ||
              log.supervisorSignature.toLowerCase().includes(query.toLowerCase()) ||
              log.incidentsSafety.toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(log) => setSelectedLog(log)}
            customActions={(log) => getLogActions(log)}
            columns={[
              {
                id: 'date',
                header: isAr ? 'التاريخ' : 'Date',
                width: '130px',
                sortable: true,
                renderCell: (log) => (
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                    <Calendar size={13} className="text-[#C4785A]" />
                    <span>{log.date}</span>
                  </div>
                ),
              },
              {
                id: 'weather',
                header: isAr ? 'الطقس' : 'Météo',
                width: '120px',
                renderCell: (log) => (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1 w-max">
                    <Sun size={12} />
                    {log.weather}
                  </span>
                ),
              },
              {
                id: 'headcount',
                header: isAr ? 'العمالة' : 'Effectifs',
                width: '110px',
                sortable: true,
                renderCell: (log) => (
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 w-max">
                    <Users size={12} />
                    {log.headcountWorkers} ouvriers
                  </span>
                ),
              },
              {
                id: 'tasks',
                header: isAr ? 'الأعمال المنجزة' : 'Travaux Accomplis',
                renderCell: (log) => (
                  <div className="max-w-md">
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-relaxed">
                      {log.tasksAccomplished}
                    </p>
                  </div>
                ),
              },
              {
                id: 'equipment',
                header: isAr ? 'العتاد' : 'Engins sur Site',
                width: '170px',
                renderCell: (log) => (
                  <div className="flex flex-wrap gap-1">
                    {log.equipmentOnSite.slice(0, 2).map((eq, i) => (
                      <span
                        key={i}
                        className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-600 dark:text-neutral-400 font-medium"
                      >
                        {eq}
                      </span>
                    ))}
                    {log.equipmentOnSite.length > 2 && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        +{log.equipmentOnSite.length - 2}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                id: 'supervisor',
                header: isAr ? 'المشرف' : 'Validation HSE',
                width: '160px',
                renderCell: (log) => (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span className="truncate font-medium">{log.supervisorSignature}</span>
                  </div>
                ),
              },
            ]}
            renderCard={(log) => (
              <div className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                      {log.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                      <Sun size={10} />
                      {log.weather}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                    {log.headcountWorkers} ouvriers
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-3 leading-relaxed">
                    {log.tasksAccomplished}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Truck size={12} className="text-neutral-400" />
                    <span>{log.equipmentOnSite.length} engins</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={11} />
                    <span className="truncate max-w-[120px]">{log.supervisorSignature}</span>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedLog && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <HardHat size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedLog.date}
                  </h3>
                  <p className="text-[10px] text-neutral-500">
                    {selectedProject ? selectedProject.projectName : 'Chantier BTP'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('fiche')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'fiche'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'محضر الأشغال' : 'Fiche Chantier'}
              </button>
              <button
                onClick={() => setInspectorTab('engins')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'engins'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'العتاد والعمالة' : 'Effectifs & Engins'}
              </button>
              <button
                onClick={() => setInspectorTab('hse')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'hse'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الأمان والرقابة' : 'Sécurité HSE'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'fiche' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Conditions de Chantier
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Date d'exécution:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedLog.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Météo constatée:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                        {selectedLog.weather}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Superviseur:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedLog.supervisorSignature}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                      Tâches Accomplies & Avancement
                    </span>
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal">
                      {selectedLog.tasksAccomplished}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 size={13} />
                      <span>Rapport Journalier Validé</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Attachement signé par le conducteur de travaux et enregistré au journal légal.
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === 'engins' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Effectif Ouvriers sur Chantier
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Pointage total:</span>
                      <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                        {selectedLog.headcountWorkers} ouvriers
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Chef d'équipe / Maçons:</span>
                      <span className="font-mono">8 ouvriers</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Ferrailleurs / Coffreurs:</span>
                      <span className="font-mono">7 ouvriers</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Conducteurs d'engins:</span>
                      <span className="font-mono">5 ouvriers</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Parc d'Engins Mobilisés ({selectedLog.equipmentOnSite.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedLog.equipmentOnSite.map((eq, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-[#C4785A]" />
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">{eq}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            Opérationnel
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'hse' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Rapport d'Incidents & Sécurité HSE
                    </span>
                    <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {selectedLog.incidentsSafety || 'R.A.S. Aucun incident ou blessure à signaler.'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Checklist Sécurité du Jour
                    </span>
                    <div className="space-y-1.5">
                      {[
                        'Port du casque et chaussures de sécurité 100%',
                        'Harnais pour travaux en hauteur vérifiés',
                        'Balisage périmètre grue à tour conforme',
                        'Trousse de premiers secours approvisionnée',
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800">
                          <Check size={13} className="text-emerald-500 shrink-0" />
                          <span className="text-neutral-700 dark:text-neutral-300 text-[11px]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono block">Signature Numérique Certifiée</span>
                    <p className="font-bold text-xs text-neutral-900 dark:text-white">{selectedLog.supervisorSignature}</p>
                    <span className="text-[9px] text-neutral-500 font-mono">Horodatage SHA-256 · {selectedLog.date} 18:30:00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => {
                  showToast(
                    isAr ? 'جاري طباعة محضر الورشة' : 'Impression du PV de chantier en cours',
                    'success'
                  );
                }}
              >
                {isAr ? 'طباعة محضر الورشة اليومي' : 'Imprimer PV de Chantier'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
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
