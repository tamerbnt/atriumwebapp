import React, { useState, useMemo } from 'react';
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
  Fuel,
  Activity,
  Layers,
  AlertOctagon,
  Minus,
  Info,
  Clock,
  Building2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorDailyLog, ConcretePourRecord, EquipmentLogRecord } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import {
  validateConcreteStrength,
  calculateFuelConsumptionAnomaly,
} from '../../../utils/contractorRules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const ContractorDailyLogsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser, activeContractorRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    dailyLogs,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    addDailyLog,
    concretePours,
    addConcretePour,
    equipmentLogs,
    addEquipmentLog,
  } = useContractorData();

  // Active view section: 'logs' | 'concrete' | 'equipment'
  const [activeSection, setActiveSection] = useState<'logs' | 'concrete' | 'equipment'>('logs');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isConcreteModalOpen, setIsConcreteModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ContractorDailyLog | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'rollcall' | 'engins' | 'hse'>('fiche');

  // Daily Log Form states with trade roll-call
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState<ContractorDailyLog['weather']>('Ensoleillé');
  const [tasks, setTasks] = useState('');
  const [equipment, setEquipment] = useState('Grue à tour, 2x Toupie béton');
  const [incidents, setIncidents] = useState('R.A.S. Port des EPI vérifié');
  const [signature, setSignature] = useState('Ing. Mourad Benali');

  // Trade roll-call counts
  const [craftMasons, setCraftMasons] = useState(8);
  const [craftIronworkers, setCraftIronworkers] = useState(6);
  const [craftLaborers, setCraftLaborers] = useState(5);
  const [craftOperators, setCraftOperators] = useState(3);
  const [craftSupervisors, setCraftSupervisors] = useState(2);

  const totalHeadcount = useMemo(
    () => craftMasons + craftIronworkers + craftLaborers + craftOperators + craftSupervisors,
    [craftMasons, craftIronworkers, craftLaborers, craftOperators, craftSupervisors]
  );

  // Concrete Pour Form states
  const [pourDate, setPourDate] = useState(new Date().toISOString().split('T')[0]);
  const [pourElement, setPourElement] = useState('');
  const [pourSupplier, setPourSupplier] = useState('Centrale Béton Oued Smar SARL');
  const [pourSlip, setPourSlip] = useState('');
  const [pourVolume, setPourVolume] = useState('36');
  const [pourGrade, setPourGrade] = useState<'B15' | 'B20' | 'B25' | 'B30' | 'B35'>('B25');
  const [pourSlump, setPourSlump] = useState('12');
  const [pourCylinders, setPourCylinders] = useState('6');
  const [pourStrength7D, setPourStrength7D] = useState('18.2');

  // Equipment Log Form states
  const [eqName, setEqName] = useState('Pelle Hydraulique Caterpillar 320D');
  const [eqCategory, setEqCategory] = useState<'Excavator' | 'TowerCrane' | 'BackhoeLoader' | 'DumpTruck' | 'Generator'>('Excavator');
  const [eqMatricule, setEqMatricule] = useState('PEL-16-554');
  const [eqHours, setEqHours] = useState('8');
  const [eqFuelLiters, setEqFuelLiters] = useState('130');
  const [eqTheoreticalBurnRate, setEqTheoreticalBurnRate] = useState('16');
  const [eqOperator, setEqOperator] = useState('Kamel Zerrouk');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectLogs = dailyLogs.filter((log) => log.projectId === (selectedProject?.id || selectedProjectId));
  const projectConcretePours = concretePours.filter((cp) => cp.projectId === (selectedProject?.id || selectedProjectId));
  const projectEquipmentLogs = equipmentLogs.filter((eq) => eq.projectId === (selectedProject?.id || selectedProjectId));

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
      headcountWorkers: totalHeadcount,
      equipmentOnSite: equipment.split(',').map((e) => e.trim()).filter(Boolean),
      tasksAccomplished: tasks.trim(),
      incidentsSafety: incidents.trim(),
      supervisorSignature: signature.trim(),
      createdAt: new Date().toISOString(),
    };

    addDailyLog(newLog);
    setIsLogModalOpen(false);
    setTasks('');
    setSelectedLog(newLog);
    showToast(
      isAr ? 'تم توقيع وتسجيل محضر الورشة اليومي مع تعداد العمال' : 'Rapport journalier de chantier & pointage validés',
      'success'
    );
  };

  const handleCreateConcretePour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pourElement.trim() || !pourSlip.trim()) {
      showToast(isAr ? 'يرجى إدخال العنصر ورقم وصل التسليم' : 'Veuillez renseigner l’élément et le numéro de BL', 'error');
      return;
    }

    const s7 = parseFloat(pourStrength7D) || 0;
    const targetMpa = pourGrade === 'B25' ? 25 : pourGrade === 'B30' ? 30 : pourGrade === 'B35' ? 35 : 20;
    const validation = validateConcreteStrength(s7, targetMpa, 7);

    const newPour: ConcretePourRecord = {
      id: `pour_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProject?.id || selectedProjectId,
      pourDate,
      elementPoured: pourElement.trim(),
      supplierName: pourSupplier.trim(),
      deliverySlipNumber: pourSlip.trim(),
      volumePouredM3: parseFloat(pourVolume) || 24,
      concreteGrade: pourGrade,
      slumpCm: parseFloat(pourSlump) || 12,
      testCylindersTaken: parseInt(pourCylinders, 10) || 6,
      strength7DaysMpa: s7 > 0 ? s7 : undefined,
      ctcClearanceObtained: validation.isConforming,
      status: validation.isConforming ? 'Passed7D' : 'NonConforming',
      createdAt: new Date().toISOString(),
    };

    addConcretePour(newPour);
    setIsConcreteModalOpen(false);
    setPourElement('');
    setPourSlip('');
    showToast(
      validation.isConforming
        ? (isAr ? 'تم تسجيل صبة الخرسانة ومطابقتها للمواصفات' : 'Coulée de béton enregistrée conforme au contrôle 7 jours')
        : (isAr ? 'تنبيه CTC: الخرسانة تحتاج فحص 28 يوم قبل إزالة الدعائم' : 'Alerte CTC: Maintien des étais requis jusqu au contrôle 28 jours'),
      validation.isConforming ? 'success' : 'warning'
    );
  };

  const handleCreateEquipmentLog = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(eqHours) || 1;
    const liters = parseFloat(eqFuelLiters) || 0;
    const theoreticalRate = parseFloat(eqTheoreticalBurnRate) || 15;
    const anomaly = calculateFuelConsumptionAnomaly(h, liters, theoreticalRate);

    const newLog: EquipmentLogRecord = {
      id: `eq_log_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProject?.id || selectedProjectId,
      equipmentName: eqName.trim(),
      equipmentCategory: eqCategory,
      matriculeNumber: eqMatricule.trim(),
      operatingHours: h,
      fuelAddedLiters: liters,
      theoreticalHourlyBurnRate: theoreticalRate,
      actualHourlyBurnRate: anomaly.actualRateLph,
      hasOverconsumptionAlert: anomaly.isAnomaly,
      date: new Date().toISOString().split('T')[0],
      operatorName: eqOperator.trim(),
      createdAt: new Date().toISOString(),
    };

    addEquipmentLog(newLog);
    setIsEquipmentModalOpen(false);
    showToast(
      anomaly.isAnomaly
        ? (isAr ? 'تم تسجيل الآلية مع تنبيه استهلاك غير طبيعي للوقود' : 'Pointage enregistré avec alerte surconsommation gasoil')
        : (isAr ? 'تم تسجيل ساعات عمل الآلية والوقود' : 'Heures et consommation gasoil enregistrées avec succès'),
      anomaly.isAnomaly ? 'warning' : 'success'
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

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: dailyLogs.length > 0,
  });

  if (showSkeleton && (dailyLogs.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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
                {activeSection === 'logs'
                  ? `${projectLogs.length} rapports`
                  : activeSection === 'concrete'
                  ? `${projectConcretePours.length} coulées`
                  : `${projectEquipmentLogs.length} engins`}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'محاضر الحضور اليومية، صبات الخرسانة ومطابقة CTC، استهلاك عتاد الورشة والوقود'
                : 'Pointages d’effectifs, coulage béton & contrôle CTC, suivi engins et gasoil'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <FilterSelect
              value={selectedProject?.id || selectedProjectId}
              onChange={setSelectedProjectId}
              options={projectOptions}
            />
          </div>

          {activeSection === 'logs' && (
            <AtriumButton
              variant="primary"
              onClick={() => setIsLogModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'محضر يومي جديد' : 'Nouveau Rapport'}
            </AtriumButton>
          )}

          {activeSection === 'concrete' && (
            <AtriumButton
              variant="primary"
              onClick={() => setIsConcreteModalOpen(true)}
              icon={<Layers size={14} />}
            >
              {isAr ? 'تسجيل صبة خرسانة' : 'Enregistrer Coulée'}
            </AtriumButton>
          )}

          {activeSection === 'equipment' && (
            <AtriumButton
              variant="primary"
              onClick={() => setIsEquipmentModalOpen(true)}
              icon={<Fuel size={14} />}
            >
              {isAr ? 'تسجيل ساعات ووقود' : 'Pointer Engin & Gasoil'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* Domain Navigation Strip: Switch between Logs, Concrete Pour, Equipment Reconciliation */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-2xl w-fit border border-neutral-200/80 dark:border-neutral-800">
        <button
          onClick={() => setActiveSection('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'logs'
              ? 'bg-white dark:bg-neutral-800 text-[#C4785A] shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Calendar size={14} />
          <span>{isAr ? 'محاضر الورشة والحضور' : 'Journaux & Effectifs'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700">
            {projectLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('concrete')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'concrete'
              ? 'bg-white dark:bg-neutral-800 text-[#C4785A] shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Layers size={14} />
          <span>{isAr ? 'صبات الخرسانة ومطابقة CTC' : 'Coulées Béton & CTC (CBA 93)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700">
            {projectConcretePours.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('equipment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'equipment'
              ? 'bg-white dark:bg-neutral-800 text-[#C4785A] shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Fuel size={14} />
          <span>{isAr ? 'ساعات العتاد والوقود' : 'Parc Engins & Gasoil'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700">
            {projectEquipmentLogs.length}
          </span>
        </button>
      </div>

      {/* Canonical Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات التواجد الميداني والأمان الفني' : 'Pointages Météo, Béton & Effectifs Chantier'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Card 1: Rapports signés */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
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
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متوسط العمالة اليومية' : 'Effectif Moyen sur Site'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {avgHeadcount} <span className="text-xs font-sans font-normal text-neutral-500">ouvriers</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'توزيع المهن المتخصصة' : 'Pointage 5 corps d’état'}
              </p>
            </div>
          </div>

          {/* Card 3: Suivi Béton & CTC */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'صبات الخرسانة المقبولة' : 'Contrôle Éprouvettes CTC'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {projectConcretePours.filter((cp) => cp.status === 'Passed7D' || cp.status === 'Passed28D').length}
                <span className="text-xs font-sans font-normal text-neutral-400"> / {projectConcretePours.length}</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} />
                {isAr ? 'مقاومة الضغط مطابقة CBA 93' : 'Conformité écrasement f_c28'}
              </p>
            </div>
          </div>

          {/* Card 4: Dark Espresso Anchor Card - Engins & Carburant */}
          <div className="p-4 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'العتاد & الوقود' : 'Engins & Suivi Gasoil'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                100% Opérationnel
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {projectEquipmentLogs.length} <span className="text-xs font-sans font-normal text-neutral-300">engins pointés</span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-0.5 flex items-center gap-1 font-medium">
                <Fuel size={11} className="text-amber-400" />
                {projectEquipmentLogs.filter((eq) => eq.hasOverconsumptionAlert).length > 0 ? (
                  <span className="text-amber-400 font-bold">
                    {projectEquipmentLogs.filter((eq) => eq.hasOverconsumptionAlert).length} alerte(s) surconsommation
                  </span>
                ) : (
                  <span>Ratios consommation conformes</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: DAILY LOGS VIEW */}
      {activeSection === 'logs' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'محاضر وسجلات الورشة اليومية' : 'Registres des Attachements & Météo Chantier'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr ? 'بيانات التواجد والعتاد والأمان الميداني' : 'Pointages certifiés d’effectifs, météo et sécurité HSE'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FCEEE8] text-[#C4785A]">
                {isAr ? 'جميع المحاضر المعتمدة' : 'Attachements Contradictoires'}
              </span>
            </div>
          </div>

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
                    width: '120px',
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
                <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2 overflow-x-auto">
                  <button
                    onClick={() => setInspectorTab('fiche')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 whitespace-nowrap ${
                      inspectorTab === 'fiche'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'محضر الأشغال' : 'Fiche Chantier'}
                  </button>
                  <button
                    onClick={() => setInspectorTab('rollcall')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 whitespace-nowrap ${
                      inspectorTab === 'rollcall'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'تعداد المهن' : 'Pointage Métiers'}
                  </button>
                  <button
                    onClick={() => setInspectorTab('engins')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 whitespace-nowrap ${
                      inspectorTab === 'engins'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'العتاد' : 'Engins'}
                  </button>
                  <button
                    onClick={() => setInspectorTab('hse')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 whitespace-nowrap ${
                      inspectorTab === 'hse'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {isAr ? 'الأمان' : 'Sécurité HSE'}
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

                  {inspectorTab === 'rollcall' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                            Total Ouvriers Pointés
                          </span>
                          <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                            {selectedLog.headcountWorkers} présents
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                          Ventilation par Corps d’État
                        </span>
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">Maçons & Coffreurs</span>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">8 ouvriers</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">Ferrailleurs (Armatures)</span>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">6 ouvriers</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">Manœuvres & Terrassiers</span>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">5 ouvriers</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">Conducteurs d’Engins</span>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">3 opérateurs</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">Encadrement & Topo</span>
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">2 ingénieurs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectorTab === 'engins' && (
                    <div className="space-y-4">
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
      )}

      {/* SECTION 2: CONCRETE POURS & CTC CLEARANCE (CBA 93) */}
      {activeSection === 'concrete' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'سجل صبات الخرسانة ومطابقة المخابر المعتمدة CTC' : 'Contrôle des Bétons & Écrasement d’Éprouvettes (CBA 93 / CTC)'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr ? 'تتبع مقاومة الضغط عند 7 و28 يوما مع قفل فك الدعائم التلقائي' : 'Traçabilité des bons de livraison, affaissement au cône d’Abrams et seuils de décoffrage'}
              </p>
            </div>

            <AtriumButton
              variant="primary"
              onClick={() => setIsConcreteModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'صبة خرسانة جديدة' : 'Nouvelle Coulée'}
            </AtriumButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectConcretePours.map((pour) => {
              const targetMpa = pour.concreteGrade === 'B25' ? 25 : pour.concreteGrade === 'B30' ? 30 : pour.concreteGrade === 'B35' ? 35 : 20;
              const val7 = pour.strength7DaysMpa ? validateConcreteStrength(pour.strength7DaysMpa, targetMpa, 7) : null;
              const val28 = pour.strength28DaysMpa ? validateConcreteStrength(pour.strength28DaysMpa, targetMpa, 28) : null;
              const isLockedFromDeshoring = (val7 && !val7.isConforming) || (val28 && !val28.isConforming);

              return (
                <div
                  key={pour.id}
                  className="bg-white dark:bg-neutral-850 rounded-[20px] p-4 border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#C4785A]" />
                        {pour.pourDate}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/15 text-[#C4785A]">
                        {pour.concreteGrade}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                      {pour.elementPoured}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {pour.supplierName} · BL: <span className="font-mono font-semibold">{pour.deliverySlipNumber}</span>
                    </p>
                  </div>

                  {/* Technical Concrete Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-neutral-100 dark:border-neutral-800 text-center">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'الحجم' : 'Volume'}</span>
                      <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                        {pour.volumePouredM3} m³
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'الهبوط' : 'Slump'}</span>
                      <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                        {pour.slumpCm} cm
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'العينات' : 'Éprouvettes'}</span>
                      <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                        {pour.testCylindersTaken} cyl.
                      </span>
                    </div>
                  </div>

                  {/* Compression Strengths */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Résistance 7 jours:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {pour.strength7DaysMpa ? `${pour.strength7DaysMpa} MPa` : 'En attente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Cible f_c28 requise:</span>
                      <span className="font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                        {targetMpa} MPa
                      </span>
                    </div>
                  </div>

                  {/* CTC Security Warning Badge */}
                  {isLockedFromDeshoring ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <AlertOctagon size={13} className="text-amber-600 shrink-0" />
                        <span>Alerte CTC : Lockout Décoffrage</span>
                      </div>
                      <p className="text-[10px] leading-tight">
                        {val7?.requiredAction || 'Maintien des étais obligatoire jusqu au contrôle 28 jours.'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] font-semibold">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>Conforme · Visa CTC accordé</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: EQUIPMENT HOURS & FUEL RECONCILIATION */}
      {activeSection === 'equipment' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'مراقبة العتاد الثقيل واستهلاك الوقود' : 'Gestion du Parc Engins & Rapprochement Gasoil'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr ? 'رصد ساعات العمل وكشف سرقة أو تبذير الوقود بنسبة تتجاوز 25%' : 'Compteurs horaires, consommation unitaire L/h et détection d’anomalie carburant'}
              </p>
            </div>

            <AtriumButton
              variant="primary"
              onClick={() => setIsEquipmentModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'تسجيل ساعات ووقود' : 'Nouveau Relevé'}
            </AtriumButton>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-neutral-850 rounded-[20px] border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Engin & Matricule</th>
                  <th className="py-3 px-4 font-semibold">Opérateur</th>
                  <th className="py-3 px-4 font-semibold text-right">Heures Travail</th>
                  <th className="py-3 px-4 font-semibold text-right">Gasoil Ajouté</th>
                  <th className="py-3 px-4 font-semibold text-right">Ratio Réel</th>
                  <th className="py-3 px-4 font-semibold text-right">Ratio Constructeur</th>
                  <th className="py-3 px-4 font-semibold">Statut Contrôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {projectEquipmentLogs.map((log) => {
                  const anomaly = calculateFuelConsumptionAnomaly(
                    log.operatingHours,
                    log.fuelAddedLiters,
                    log.theoreticalHourlyBurnRate
                  );

                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-neutral-900 dark:text-white">
                        {log.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 dark:text-white">{log.equipmentName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{log.matriculeNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                        {log.operatorName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        {log.operatingHours} h
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {log.fuelAddedLiters} L
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={anomaly.isAnomaly ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}>
                          {anomaly.actualRateLph} L/h
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-500">
                        {log.theoreticalHourlyBurnRate} L/h
                      </td>
                      <td className="py-3 px-4">
                        {anomaly.isAnomaly ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold w-fit">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>Surconsommation (+{anomaly.variancePercent}%)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold w-fit">
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span>Conforme</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW DAILY LOG WITH TRADE ROLL-CALL STEPPER */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-xl shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'محضر ورشة يومي وتعداد المهن' : 'Nouveau Rapport Journalier & Pointage'}
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
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

              {/* 1-Click Trade Roll-Call Steppers */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      {isAr ? 'تعداد العمالة الفورية حسب المهن' : 'Pointage Rapide par Corps d’État'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {isAr ? 'انقر على الزر للتعديل السريع' : 'Cliquez sur + ou - pour ajuster les effectifs'}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                    {totalHeadcount} ouvriers
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Stepper 1: Maçons */}
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium block">Maçons</span>
                      <span className="text-xs font-mono font-bold text-[#C4785A]">{craftMasons}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCraftMasons((c) => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftMasons((c) => c + 1)}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 2: Ferrailleurs */}
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium block">Ferrailleurs</span>
                      <span className="text-xs font-mono font-bold text-[#C4785A]">{craftIronworkers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCraftIronworkers((c) => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftIronworkers((c) => c + 1)}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 3: Manœuvres */}
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium block">Manœuvres</span>
                      <span className="text-xs font-mono font-bold text-[#C4785A]">{craftLaborers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCraftLaborers((c) => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftLaborers((c) => c + 1)}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 4: Conducteurs Engins */}
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium block">Conduct. Engins</span>
                      <span className="text-xs font-mono font-bold text-[#C4785A]">{craftOperators}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCraftOperators((c) => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftOperators((c) => c + 1)}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 5: Encadrement */}
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium block">Encadrement</span>
                      <span className="text-xs font-mono font-bold text-[#C4785A]">{craftSupervisors}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCraftSupervisors((c) => Math.max(0, c - 1))}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftSupervisors((c) => c + 1)}
                        className="w-6 h-6 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <LabelInput
                label={isAr ? 'الأعمال المنجزة بالتفصيل' : 'Tâches accomplies et avancement'}
                value={tasks}
                onChange={setTasks}
                placeholder="Ex: Coulage dalle niveau R+3, ferraillage voiles..."
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'العتاد والآليات (مفصولة بفاصلة)' : 'Engins mobilisés'}
                  value={equipment}
                  onChange={setEquipment}
                  placeholder="Grue à tour, 2x Toupies..."
                />
                <LabelInput
                  label={isAr ? 'المشرف الموقّع' : 'Superviseur / Ingénieur'}
                  value={signature}
                  onChange={setSignature}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'ملاحظات الأمان وحوادث الورشة' : 'Sécurité HSE & Remarques'}
                value={incidents}
                onChange={setIncidents}
                placeholder="R.A.S. Port des EPI vérifié..."
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsLogModalOpen(false)}>
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

      {/* MODAL 2: NEW CONCRETE POUR & CTC SAMPLE REGISTRATION */}
      {isConcreteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تسجيل صبة خرسانة وعينات مخبرية CTC' : 'Enregistrement Coulée & Prélèvement CTC'}
                </h3>
              </div>
              <button
                onClick={() => setIsConcreteModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateConcretePour} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'تاريخ الصبة' : 'Date de coulage'}
                  type="date"
                  value={pourDate}
                  onChange={setPourDate}
                  required
                />
                <LabelSelect
                  label={isAr ? 'رتبة الخرسانة' : 'Classe du Béton'}
                  value={pourGrade}
                  onChange={(v) => setPourGrade(v as any)}
                  options={[
                    { value: 'B20', label: 'B20 (Gros béton / Fondations légères)' },
                    { value: 'B25', label: 'B25 (Structure poteaux / poutres standard)' },
                    { value: 'B30', label: 'B30 (Voiles et planchers fortement armés)' },
                    { value: 'B35', label: 'B35 (Haute résistance / Radiers lourds)' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'العنصر المصبوب' : 'Élément structural coulé'}
                value={pourElement}
                onChange={setPourElement}
                placeholder="Ex: Plancher dalle pleine niveau R+3"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'المورد / المحطة' : 'Centrale à béton'}
                  value={pourSupplier}
                  onChange={setPourSupplier}
                  required
                />
                <LabelInput
                  label={isAr ? 'رقم وصل التسليم (BL)' : 'N° Bon de Livraison'}
                  value={pourSlip}
                  onChange={setPourSlip}
                  placeholder="BL-BPE-8841"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الحجم (م3)' : 'Volume (m³)'}
                  type="number"
                  value={pourVolume}
                  onChange={setPourVolume}
                  required
                />
                <LabelInput
                  label={isAr ? 'الهبوط (سم)' : 'Affaissement (cm)'}
                  type="number"
                  value={pourSlump}
                  onChange={setPourSlump}
                  required
                />
                <LabelInput
                  label={isAr ? 'عدد الأسطوانات' : 'Éprouvettes'}
                  type="number"
                  value={pourCylinders}
                  onChange={setPourCylinders}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'مقاومة 7 أيام الأولية (MPa)' : 'Résistance écrasement 7 jours (MPa)'}
                type="number"
                value={pourStrength7D}
                onChange={setPourStrength7D}
                placeholder="Ex: 18.2"
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsConcreteModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تسجيل ومطابقة' : 'Enregistrer Coulée'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EQUIPMENT HOURS & FUEL CONSUMPTION */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Fuel size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تسجيل ساعات عمل الآلية والوقود' : 'Relevé Compteur Horaire & Plein Gasoil'}
                </h3>
              </div>
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEquipmentLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الآلية' : 'Désignation Engin'}
                  value={eqName}
                  onChange={setEqName}
                  required
                />
                <LabelSelect
                  label={isAr ? 'صنف الآلية' : 'Catégorie'}
                  value={eqCategory}
                  onChange={(v) => setEqCategory(v as any)}
                  options={[
                    { value: 'Excavator', label: 'Pelle hydraulique' },
                    { value: 'TowerCrane', label: 'Grue à tour' },
                    { value: 'BackhoeLoader', label: 'Rétrochargeuse' },
                    { value: 'DumpTruck', label: 'Camion benne 8x4' },
                    { value: 'Generator', label: 'Groupe électrogène' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رقم اللوحة / التسجيل' : 'Immatriculation / Matricule'}
                  value={eqMatricule}
                  onChange={setEqMatricule}
                  required
                />
                <LabelInput
                  label={isAr ? 'السائق / المشغل' : 'Conducteur d’engin'}
                  value={eqOperator}
                  onChange={setEqOperator}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الساعات المنجزة' : 'Heures compteur'}
                  type="number"
                  value={eqHours}
                  onChange={setEqHours}
                  required
                />
                <LabelInput
                  label={isAr ? 'الوقود المعبأ (لتر)' : 'Gasoil servi (L)'}
                  type="number"
                  value={eqFuelLiters}
                  onChange={setEqFuelLiters}
                  required
                />
                <LabelInput
                  label={isAr ? 'المعيار (لتر/س)' : 'Norme (L/h)'}
                  type="number"
                  value={eqTheoreticalBurnRate}
                  onChange={setEqTheoreticalBurnRate}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsEquipmentModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'حفظ وفحص النسبة' : 'Valider & Contrôler'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
