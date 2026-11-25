import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  Printer,
  Copy,
  Check,
  Fuel,
  Layers,
  AlertOctagon,
  Minus,
  MapPin,
  Pin,
  Eye,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ContractorDailyLog } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { PrintSheetModal } from '../../modals/PrintSheetModal';
import {
  validateConcreteStrength,
  calculateFuelConsumptionAnomaly,
} from '../../../utils/contractorRules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticModalShell,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ContractorDailyLogsView: React.FC<any> = () => {
  const {
    account,
    language,
    currentBusiness,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      currentUser: s.currentUser,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

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

  const [activeSection, setActiveSection] = useState<'logs' | 'concrete' | 'equipment'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedLogIds, setPinnedLogIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedEquipmentIds, setPinnedEquipmentIds] = useState<Set<string>>(() => new Set<string>());
  const [eqSearchQuery, setEqSearchQuery] = useState('');
  const [eqViewMode, setEqViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isConcreteModalOpen, setIsConcreteModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

  const [selectedLog, setSelectedLog] = useState<ContractorDailyLog | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('fiche');
  const [pvLogToPrint, setPvLogToPrint] = useState<ContractorDailyLog | null>(null);
  const [fuelAuditLog, setFuelAuditLog] = useState<(typeof equipmentLogs)[number] | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Ensoleillé');
  const [tasks, setTasks] = useState('');
  const [equipment, setEquipment] = useState('');
  const [incidents, setIncidents] = useState('');
  const [signature, setSignature] = useState(() => currentUser?.fullName || '');

  const [craftMasons, setCraftMasons] = useState(0);
  const [craftIronworkers, setCraftIronworkers] = useState(0);
  const [craftLaborers, setCraftLaborers] = useState(0);
  const [craftOperators, setCraftOperators] = useState(0);
  const [craftSupervisors, setCraftSupervisors] = useState(0);

  const totalHeadcount = useMemo(
    () => craftMasons + craftIronworkers + craftLaborers + craftOperators + craftSupervisors,
    [craftMasons, craftIronworkers, craftLaborers, craftOperators, craftSupervisors]
  );

  const [pourDate, setPourDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pourElement, setPourElement] = useState('');
  const [pourSupplier, setPourSupplier] = useState('');
  const [pourSlip, setPourSlip] = useState('');
  const [pourVolume, setPourVolume] = useState('');
  const [pourGrade, setPourGrade] = useState('B25');
  const [pourSlump, setPourSlump] = useState('');
  const [pourCylinders, setPourCylinders] = useState('');
  const [pourStrength7D, setPourStrength7D] = useState('');

  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState('Excavator');
  const [eqMatricule, setEqMatricule] = useState('');
  const [eqHours, setEqHours] = useState('');
  const [eqFuelLiters, setEqFuelLiters] = useState('');
  const [eqTheoreticalBurnRate, setEqTheoreticalBurnRate] = useState('');
  const [eqOperator, setEqOperator] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectLogs = useMemo(
    () => dailyLogs.filter((log) => log.projectId === (selectedProject?.id || selectedProjectId)),
    [dailyLogs, selectedProject?.id, selectedProjectId]
  );
  const projectConcretePours = useMemo(
    () =>
      concretePours.filter((cp) => cp.projectId === (selectedProject?.id || selectedProjectId)),
    [concretePours, selectedProject?.id, selectedProjectId]
  );
  const projectEquipmentLogs = useMemo(
    () =>
      equipmentLogs.filter((eq) => eq.projectId === (selectedProject?.id || selectedProjectId)),
    [equipmentLogs, selectedProject?.id, selectedProjectId]
  );

  const avgHeadcount =
    projectLogs.length > 0
      ? Math.round(
          projectLogs.reduce((acc, l) => acc + l.headcountWorkers, 0) / projectLogs.length
        )
      : 0;

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    projectLogs.forEach((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [projectLogs, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: projectLogs.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || projectLogs.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, projectLogs.length, isAr, isEn]);

  const filteredLogs = useMemo(() => {
    return projectLogs.filter((log) => {
      if (weatherFilter !== 'All') {
        const isSunny = log.weather.toLowerCase().includes('ensoleill');
        if (weatherFilter === 'Sunny' && !isSunny) return false;
        if (weatherFilter === 'Adverse' && isSunny) return false;
      }
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(log, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !log.tasksAccomplished.toLowerCase().includes(q) &&
          !log.date.includes(q) &&
          !log.weather.toLowerCase().includes(q) &&
          !log.supervisorSignature.toLowerCase().includes(q) &&
          !(log.incidentsSafety || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [projectLogs, weatherFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const handleTogglePinLog = useCallback(
    (id: string) => {
      setPinnedLogIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast(isAr ? 'تم تحديث التثبيت' : 'Épinglage mis à jour', 'info');
    },
    [isAr]
  );

  const handleTogglePinEquipment = useCallback(
    (id: string) => {
      setPinnedEquipmentIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast(isAr ? 'تم تحديث التثبيت' : 'Épinglage engin mis à jour', 'info');
    },
    [isAr]
  );

  const sortedLogs = useMemo(() => {
    const list = [...filteredLogs];
    list.sort((a, b) => {
      const aPinned = pinnedLogIds.has(a.id);
      const bPinned = pinnedLogIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === 'date') {
        const cmp = a.date.localeCompare(b.date);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'headcount') {
        const cmp = (a.headcountWorkers || 0) - (b.headcountWorkers || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredLogs, pinnedLogIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const sortedEquipmentLogs = useMemo(() => {
    const q = eqSearchQuery.trim().toLowerCase();
    const list = projectEquipmentLogs.filter((log) => {
      if (!q) return true;
      return (
        log.equipmentName.toLowerCase().includes(q) ||
        log.matriculeNumber.toLowerCase().includes(q) ||
        log.operatorName.toLowerCase().includes(q) ||
        log.date.includes(q)
      );
    });
    list.sort((a, b) => {
      const aPinned = pinnedEquipmentIds.has(a.id);
      const bPinned = pinnedEquipmentIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.date.localeCompare(a.date);
    });
    return list;
  }, [projectEquipmentLogs, eqSearchQuery, pinnedEquipmentIds]);

  const handleExportEquipment = useCallback(() => {
    const headers = ['Date', 'Engin', 'Matricule', 'Opérateur', 'Heures (h)', 'Gasoil (L)', 'Ratio Réel (L/h)', 'Norme (L/h)', 'Statut'];
    const rows = sortedEquipmentLogs.map((log) => {
      const anomaly = calculateFuelConsumptionAnomaly(
        log.operatingHours,
        log.fuelAddedLiters,
        log.theoreticalHourlyBurnRate
      );
      return [
        log.date,
        log.equipmentName,
        log.matriculeNumber,
        log.operatorName,
        log.operatingHours,
        log.fuelAddedLiters,
        anomaly.actualRateLph,
        log.theoreticalHourlyBurnRate,
        anomaly.isAnomaly ? `Surconsommation (+${anomaly.variancePercent}%)` : 'Conforme',
      ];
    });
    downloadCsvSafe(`parc_engins_gasoil_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير سجل العتاد' : 'Export CSV parc engins généré', 'info');
  }, [sortedEquipmentLogs, isAr]);

  const activeLog = useMemo(() => {
    if (!selectedLog) return null;
    return projectLogs.find((l) => l.id === selectedLog.id) || selectedLog;
  }, [selectedLog, projectLogs]);

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasks.trim()) {
      showToast(
        isAr ? 'يرجى تدوين الأعمال المنجزة' : 'Veuillez saisir les tâches accomplies',
        'error'
      );
      return;
    }
    const activeAccountId = (selectedProject?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (selectedProject?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const newLog: ContractorDailyLog = {
      id: `log_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      projectId: selectedProject?.id || selectedProjectId,
      date,
      weather,
      headcountWorkers: totalHeadcount,
      equipmentOnSite: equipment
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      tasksAccomplished: tasks.trim(),
      incidentsSafety: incidents.trim(),
      supervisorSignature: signature.trim(),
      createdAt: new Date().toISOString(),
    };
    addDailyLog(newLog);
    setIsLogModalOpen(false);
    setTasks('');
    setSelectedLog(newLog);
  };

  const handleCreateConcretePour = (e: React.FormEvent) => {
    e.preventDefault();
    const volNum = parseFloat(pourVolume);
    const slumpNum = parseFloat(pourSlump);
    const cylNum = parseInt(pourCylinders, 10);
    if (
      !pourElement.trim() ||
      !pourSupplier.trim() ||
      !pourSlip.trim() ||
      isNaN(volNum) ||
      volNum <= 0 ||
      isNaN(slumpNum) ||
      slumpNum < 0 ||
      isNaN(cylNum) ||
      cylNum < 0
    ) {
      showToast(
        isAr
          ? 'يرجى إدخال العنصر والمورد ورقم وصل التسليم والقياسات'
          : 'Veuillez renseigner l’élément, la centrale, le N° BL et des valeurs valides',
        'error'
      );
      return;
    }
    const activeAccountId = (selectedProject?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (selectedProject?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const s7 = parseFloat(pourStrength7D) || 0;
    const targetMpa =
      pourGrade === 'B25' ? 25 : pourGrade === 'B30' ? 30 : pourGrade === 'B35' ? 35 : 20;
    const validation = validateConcreteStrength(s7, targetMpa, 7);
    const newPour = {
      id: `pour_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      projectId: selectedProject?.id || selectedProjectId,
      pourDate,
      elementPoured: pourElement.trim(),
      supplierName: pourSupplier.trim(),
      deliverySlipNumber: pourSlip.trim(),
      volumePouredM3: volNum,
      concreteGrade: pourGrade,
      slumpCm: slumpNum,
      testCylindersTaken: cylNum,
      strength7DaysMpa: s7 > 0 ? s7 : undefined,
      ctcClearanceObtained: validation.isConforming,
      status: validation.isConforming ? 'Passed7D' : 'NonConforming',
      createdAt: new Date().toISOString(),
    };
    addConcretePour(newPour as never);
    setIsConcreteModalOpen(false);
    setPourElement('');
    setPourSlip('');
    setPourVolume('');
    setPourSlump('');
    setPourCylinders('');
    setPourStrength7D('');
  };

  const handleCreateEquipmentLog = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(eqHours);
    const liters = parseFloat(eqFuelLiters);
    const theoreticalRate = parseFloat(eqTheoreticalBurnRate);
    if (
      !eqName.trim() ||
      !eqMatricule.trim() ||
      !eqOperator.trim() ||
      isNaN(h) ||
      h <= 0 ||
      isNaN(liters) ||
      liters < 0 ||
      isNaN(theoreticalRate) ||
      theoreticalRate <= 0
    ) {
      showToast(
        isAr
          ? 'يرجى إدخال بيانات الآلية والساعات والوقود بشكل صحيح'
          : 'Veuillez renseigner l’engin, le matricule, le conducteur et des valeurs valides',
        'error'
      );
      return;
    }
    const activeAccountId = (selectedProject?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (selectedProject?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const anomaly = calculateFuelConsumptionAnomaly(h, liters, theoreticalRate);
    const newLog = {
      id: `eq_log_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
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
    addEquipmentLog(newLog as never);
    setIsEquipmentModalOpen(false);
    setEqHours('');
    setEqFuelLiters('');
  };

  const handleExportLogs = useCallback(() => {
    const headers = ['Date', 'Météo', 'Agence', 'Effectif', 'Travaux Accomplis', 'Superviseur'];
    const rows = sortedLogs.map((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      return [l.date, l.weather, b.name, l.headcountWorkers, l.tasksAccomplished, l.supervisorSignature];
    });
    downloadCsvSafe(
      `journaux_chantier_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير التقارير اليومية' : 'Export CSV des journaux généré', 'info');
  }, [sortedLogs, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (weatherFilter !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [weatherFilter, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (weatherFilter !== 'All') {
      chips.push({
        key: 'weather',
        label: weatherFilter === 'Sunny' ? 'Ensoleillé' : 'Intempéries',
        onRemove: () => setWeatherFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const opt = branchOptions.find((o) => o.value === branchFilter);
      chips.push({
        key: 'branch',
        label: opt?.label || branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [weatherFilter, branchFilter, branchOptions]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setWeatherFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'weather',
        kind: 'segmented',
        label: isAr ? 'حالة الطقس' : isEn ? 'Weather' : 'Conditions Météo',
        value: weatherFilter,
        onChange: setWeatherFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: projectLogs.length },
          {
            value: 'Sunny',
            label: isAr ? 'مشمس' : 'Ensoleillé',
            count: projectLogs.filter((l) => l.weather.toLowerCase().includes('ensoleill')).length,
          },
          {
            value: 'Adverse',
            label: isAr ? 'تقلبات جوية' : 'Intempéries / Vent',
            count: projectLogs.filter((l) => !l.weather.toLowerCase().includes('ensoleill')).length,
          },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المديرية' : isEn ? 'Branch' : 'Agence / Direction',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, weatherFilter, branchFilter, projectLogs, branchOptions]
  );

  const getRowMeta = useCallback(
    (log: ContractorDailyLog): Partial<KineticRowData> => {
      const isSunny = log.weather.toLowerCase().includes('ensoleill');
      const br = resolveRecordBranch(log, branchesById, currentBranch, language);
      return {
        title: log.date,
        subline: `${log.headcountWorkers} ${isAr ? 'عمال' : 'ouvriers'} · ${log.supervisorSignature || 'Chef chantier'}`,
        categoryLabel: log.weather,
        statusLabel: isSunny ? (isAr ? 'مشمس' : 'Ensoleillé') : (isAr ? 'تقلبات' : 'Intempéries'),
        statusVariant: isSunny ? 'active' : 'warning',
        metricPrimary: `${log.headcountWorkers} ${isAr ? 'عامل' : 'ouvr.'}`,
        metricSecondary: log.equipmentOnSite?.length ? `${log.equipmentOnSite.length} engins` : br.name,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedLogIds.has(log.id),
        detailCol1: {
          heading: isAr ? 'التاريخ والطقس' : isEn ? 'Date & Weather' : 'Date & Météo',
          primaryText: log.date,
          secondaryText: log.weather,
          tertiaryText: br.name,
        },
        detailCol2: {
          heading: isAr ? 'الطاقم والمعدات' : isEn ? 'Crew & Equipment' : 'Effectif & Engins',
          primaryText: `${log.headcountWorkers} ${isAr ? 'عامل' : 'ouvriers'}`,
          secondaryText: log.equipmentOnSite?.length ? `${log.equipmentOnSite.length} engins sur site` : 'Aucun engin listé',
        },
        detailCol3: {
          heading: isAr ? 'الإشراف والأشغال' : isEn ? 'Supervision & Works' : 'Visa & Travaux',
          primaryText: log.supervisorSignature || 'Chef chantier',
          secondaryText: log.tasksAccomplished || log.worksSummary || undefined,
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn, pinnedLogIds]
  );

  const getFanActions = useCallback(
    (log: ContractorDailyLog): KineticRowFanAction[] => [
      {
        id: 'print',
        label: isAr ? 'طباعة' : 'PV',
        icon: <Printer size={14} />,
        onClick: () => setPvLogToPrint(log),
      },
      {
        id: 'hse',
        label: 'HSE',
        icon: <ShieldCheck size={14} />,
        disabled: true,
        tooltip: t('feature_not_available_phase2', language),
        onClick: () => {},
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : 'Détacher') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} />,
        onClick: () => handleTogglePinLog(log.id),
      },
    ],
    [isAr, language, pinnedLogIds, handleTogglePinLog]
  );

  const getDetailActions = useCallback(
    (log: ContractorDailyLog): KineticDetailAction[] => [
      {
        id: 'print',
        label: isAr ? 'طباعة PV' : 'Imprimer PV',
        icon: <Printer size={14} />,
        onClick: () => setPvLogToPrint(log),
      },
      {
        id: 'duplicate',
        label: isAr ? 'تكرار' : 'Dupliquer',
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
        },
      },
      {
        id: 'pin',
        label: pinnedLogIds.has(log.id) ? (isAr ? 'إلغاء التثبيت' : 'Détacher') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin size={14} />,
        onClick: () => handleTogglePinLog(log.id),
      },
    ],
    [isAr, addDailyLog, pinnedLogIds, handleTogglePinLog]
  );

  const columns: ColumnDefinition<ContractorDailyLog>[] = useMemo(
    () => [
      {
        key: 'date',
        header: isAr ? 'التاريخ' : 'Date',
        width: '1.2*',
        sortable: true,
        renderCell: (log) => (
          <div className="flex items-center gap-2 tabular-nums font-semibold t-small text-black dark:text-white">
            <Calendar size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{log.date}</span>
          </div>
        ),
      },
      {
        key: 'weather',
        header: isAr ? 'الطقس' : 'Météo',
        width: '1.2*',
        renderCell: (log) => (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 t-small font-semibold flex items-center gap-1 w-max">
            <Sun size={12} />
            {log.weather}
          </span>
        ),
      },
      {
        key: 'headcount',
        header: isAr ? 'العمالة' : 'Effectifs',
        width: '1.1*',
        sortable: true,
        renderCell: (log) => (
          <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 t-small font-semibold flex items-center gap-1 w-max">
            <Users size={12} />
            {log.headcountWorkers} ouvriers
          </span>
        ),
      },
      {
        key: 'tasks',
        header: isAr ? 'الأعمال المنجزة' : 'Travaux Accomplis',
        width: '2.4*',
        renderCell: (log) => (
          <p className="t-cap text-black dark:text-white line-clamp-2 leading-relaxed">
            {log.tasksAccomplished}
          </p>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.3*',
        sortable: true,
        renderCell: (log) => {
          const b = resolveRecordBranch(log, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-1 t-cap text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'supervisor',
        header: isAr ? 'المشرف' : 'Validation HSE',
        width: '1.4*',
        renderCell: (log) => (
          <div className="flex items-center gap-2 t-cap text-black/70 dark:text-white/75">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span className="truncate font-medium">{log.supervisorSignature}</span>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

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
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Calendar size={22} />}
        title={isAr ? 'اليومية' : isEn ? 'Site Log' : 'Journal'}
        primaryAction={{
          label:
            activeSection === 'logs'
              ? isAr ? 'محضر يومي جديد' : 'Nouveau Rapport'
              : activeSection === 'concrete'
              ? isAr ? 'تسجيل صبة خرسانة' : 'Enregistrer Coulée'
              : isAr ? 'تسجيل ساعات ووقود' : 'Pointer Engin & Gasoil',
          onClick: () => {
            if (activeSection === 'logs') setIsLogModalOpen(true);
            else if (activeSection === 'concrete') setIsConcreteModalOpen(true);
            else setIsEquipmentModalOpen(true);
          },
          dataAction: 'add-daily-log-entry',
        }}
        secondaryActions={
          <div className="w-52">
            <FilterSelect
              value={selectedProject?.id || selectedProjectId}
              onChange={setSelectedProjectId}
              options={projectOptions}
            />
          </div>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات التواجد الميداني والأمان الفني'
            : 'Pointages Météo, Béton & Effectifs Chantier'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'التقارير اليومية الموقعة' : 'Rapports Journaliers Signés',
          badgeText: isAr ? 'محضر' : 'Journaux',
          count: projectLogs.length,
          tone: 'terracotta',
          isActive: activeSection === 'logs',
          onToggle: () => setActiveSection('logs'),
        }}
        secondaryCard={{
          label: isAr ? 'صبات الخرسانة المقبولة CTC' : 'Coulées Béton & CTC (CBA 93)',
          badgeText: isAr ? 'خرسانة' : 'Béton',
          count: projectConcretePours.length,
          tone: 'emerald',
          isActive: activeSection === 'concrete',
          onToggle: () => setActiveSection('concrete'),
        }}
        darkCard={{
          label: isAr ? 'العتاد والعمالة المتوسطة' : 'Engins & Effectif Moyen',
          badgeCount: avgHeadcount,
          badgeSuffix: ' ouvriers/j',
          valueCount: projectEquipmentLogs.length,
          valueSuffix: ' engins',
          caption:
            projectEquipmentLogs.filter((eq) => eq.hasOverconsumptionAlert).length > 0
              ? `${projectEquipmentLogs.filter((eq) => eq.hasOverconsumptionAlert).length} alerte(s) surconsommation gasoil`
              : 'Ratios consommation conformes',
        }}
      />

      <div
        data-sq="ctl"
        data-sq-border="solid"
        className="flex items-center gap-1 p-[3px] bg-neutral-100 dark:bg-[#191716] w-fit"
      >
        <button
          type="button"
          onClick={() => setActiveSection('logs')}
          data-sq="thumb"
          data-sq-border="none"
          className={`flex items-center gap-2 px-4 py-2 t-small font-semibold transition-all cursor-pointer ${
            activeSection === 'logs'
              ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
              : 'text-black/70 dark:text-white/75 hover:text-black'
          }`}
        >
          <Calendar size={14} />
          <span>{isAr ? 'محاضر الورشة والحضور' : 'Journaux & Effectifs'}</span>
          <span className="t-cap tabular-nums px-2 py-1 rounded-full bg-neutral-100 dark:bg-[#191716]">
            {projectLogs.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('concrete')}
          data-sq="thumb"
          data-sq-border="none"
          className={`flex items-center gap-2 px-4 py-2 t-small font-semibold transition-all cursor-pointer ${
            activeSection === 'concrete'
              ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
              : 'text-black/70 dark:text-white/75 hover:text-black'
          }`}
        >
          <Layers size={14} />
          <span>{isAr ? 'صبات الخرسانة ومطابقة CTC' : 'Coulées Béton & CTC (CBA 93)'}</span>
          <span className="t-cap tabular-nums px-2 py-1 rounded-full bg-neutral-100 dark:bg-[#191716]">
            {projectConcretePours.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('equipment')}
          data-sq="thumb"
          data-sq-border="none"
          className={`flex items-center gap-2 px-4 py-2 t-small font-semibold transition-all cursor-pointer ${
            activeSection === 'equipment'
              ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
              : 'text-black/70 dark:text-white/75 hover:text-black'
          }`}
        >
          <Fuel size={14} />
          <span>{isAr ? 'ساعات العتاد والوقود' : 'Parc Engins & Gasoil'}</span>
          <span className="t-cap tabular-nums px-2 py-1 rounded-full bg-neutral-100 dark:bg-[#191716]">
            {projectEquipmentLogs.length}
          </span>
        </button>
      </div>

      {activeSection === 'logs' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr ? 'محاضر الورشة اليومية' : 'Journaux & Attachements de Chantier'
            }
            liveRegionText={`${sortedLogs.length} ${isAr ? 'محضر' : 'rapports'}`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr ? 'بحث بالتاريخ، المهام، المشرف...' : 'Rechercher par date, travaux, météo...'
            }
            statusOptions={[
              { value: 'All', label: isAr ? 'الكل' : 'Tous', count: projectLogs.length },
              {
                value: 'Sunny',
                label: isAr ? 'مشمس' : 'Ensoleillé',
                count: projectLogs.filter((l) => l.weather.toLowerCase().includes('ensoleill')).length,
              },
              {
                value: 'Adverse',
                label: isAr ? 'تقلبات' : 'Intempéries',
                count: projectLogs.filter((l) => !l.weather.toLowerCase().includes('ensoleill')).length,
              },
            ]}
            statusValue={weatherFilter}
            onStatusChange={setWeatherFilter}
            hasActiveAdvancedFilters={activeFiltersCount > 0}
            activeFiltersCount={activeFiltersCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={handleExportLogs}
            activeChips={activeChips}
            onResetAllFilters={resetAllFilters}
          />

          <UniversalDataCollection<ContractorDailyLog>
            hideToolbar
            items={sortedLogs}
            keyExtractor={(log) => log.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(k, d) => {
              setSortBy(k);
              setSortDir(d);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(log) => pinnedLogIds.has(log.id)}
            onTogglePin={(log) => handleTogglePinLog(log.id)}
            openItemId={activeLog?.id || null}
            onItemClick={(log, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedLog(log);
              setInspectorTab('fiche');
            }}
            onViewDetails={(log, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedLog(log);
              setInspectorTab('fiche');
            }}
            getRowMeta={getRowMeta}
            getFanActions={getFanActions}
            getDetailActions={getDetailActions}
            customActions={(log) => [
              {
                id: 'print',
                label: isAr ? 'طباعة PV' : 'Imprimer PV',
                icon: <Printer size={14} />,
                onClick: () => setPvLogToPrint(log),
              },
              {
                id: 'hse',
                label: isAr ? 'تأكيد السلامة' : 'Audit HSE',
                icon: <ShieldCheck size={14} />,
                disabled: true,
                tooltip: t('feature_not_available_phase2', language),
                onClick: () => {},
              },
              {
                id: 'duplicate',
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
                },
              },
            ]}
            emptyTitle={isAr ? 'لا توجد تقارير يومية' : 'Aucun journal de chantier'}
            emptyDescription={isAr ? 'سجل أول تقرير يومي للورشة' : 'Créez votre premier rapport journalier'}
            primaryActionLabel={isAr ? 'محضر يومي جديد' : 'Nouveau Rapport'}
            onAddFirstItem={() => setIsLogModalOpen(true)}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          />
        </ScreenPod>
      )}

      {activeSection === 'concrete' && (
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-3 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="t-label font-semibold text-black dark:text-white">
              {isAr
                ? 'سجل صبات الخرسانة ومطابقة المخابر المعتمدة CTC'
                : 'Contrôle des Bétons & Écrasement d’Éprouvettes (CBA 93 / CTC)'}
            </h2>
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
              const targetMpa =
                pour.concreteGrade === 'B25'
                  ? 25
                  : pour.concreteGrade === 'B30'
                  ? 30
                  : pour.concreteGrade === 'B35'
                  ? 35
                  : 20;
              const val7 = pour.strength7DaysMpa
                ? validateConcreteStrength(pour.strength7DaysMpa, targetMpa, 7)
                : null;
              const val28 = pour.strength28DaysMpa
                ? validateConcreteStrength(pour.strength28DaysMpa, targetMpa, 28)
                : null;
              const isLockedFromDeshoring =
                (val7 && !val7.isConforming) || (val28 && !val28.isConforming);
              return (
                <div
                  key={pour.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="bg-white dark:bg-[#22201E] p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="tabular-nums t-small font-semibold text-black dark:text-white flex items-center gap-2">
                        <Calendar size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                        {pour.pourDate}
                      </span>
                      <span className="px-2 py-1 rounded-full t-small font-semibold bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                        {pour.concreteGrade}
                      </span>
                    </div>
                    <h3 className="font-semibold t-label text-black dark:text-white leading-tight">
                      {pour.elementPoured}
                    </h3>
                    <p className="t-cap text-black/55 dark:text-white/55">
                      {pour.supplierName} · BL:{' '}
                      <span className="tabular-nums font-semibold">{pour.deliverySlipNumber}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--atr-divider)] text-center">
                    <div>
                      <span className="t-cap text-black/55 dark:text-white/55 block">
                        Volume
                      </span>
                      <span className="t-small font-semibold tabular-nums text-black dark:text-white">
                        {pour.volumePouredM3} m³
                      </span>
                    </div>
                    <div>
                      <span className="t-cap text-black/55 dark:text-white/55 block">
                        Slump
                      </span>
                      <span className="t-small font-semibold tabular-nums text-black dark:text-white">
                        {pour.slumpCm} cm
                      </span>
                    </div>
                    <div>
                      <span className="t-cap text-black/55 dark:text-white/55 block">
                        Éprouvettes
                      </span>
                      <span className="t-small font-semibold tabular-nums text-black dark:text-white">
                        {pour.testCylindersTaken} cyl.
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between t-cap">
                      <span className="text-black/55 dark:text-white/55">Résistance 7 jours:</span>
                      <span className="tabular-nums font-semibold text-black dark:text-white">
                        {pour.strength7DaysMpa ? `${pour.strength7DaysMpa} MPa` : 'En attente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between t-cap">
                      <span className="text-black/55 dark:text-white/55">Cible f_c28 requise:</span>
                      <span className="tabular-nums font-semibold text-black/70 dark:text-white/75">
                        {targetMpa} MPa
                      </span>
                    </div>
                  </div>
                  {isLockedFromDeshoring ? (
                    <div
                      data-sq="ctl"
                      data-sq-border="solid"
                      style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties}
                      className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 space-y-1"
                    >
                      <div className="flex items-center gap-2 font-semibold t-small">
                        <AlertOctagon size={13} className="text-amber-600 shrink-0" />
                        <span>Alerte CTC : Lockout Décoffrage</span>
                      </div>
                      <p className="t-cap leading-tight">
                        {val7?.requiredAction ||
                          'Maintien des étais obligatoire jusqu au contrôle 28 jours.'}
                      </p>
                    </div>
                  ) : (
                    <div
                      data-sq="ctl"
                      data-sq-border="solid"
                      style={{ '--sq-stroke': 'rgba(16, 185, 129, 0.35)' } as React.CSSProperties}
                      className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 t-small font-semibold"
                    >
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

      {activeSection === 'equipment' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={
              isAr
                ? 'مراقبة العتاد الثقيل واستهلاك الوقود'
                : 'Gestion du Parc Engins & Rapprochement Gasoil'
            }
            liveRegionText={`${sortedEquipmentLogs.length} ${isAr ? 'آلية' : 'relevés'}`}
            language={language}
            searchQuery={eqSearchQuery}
            onSearchChange={setEqSearchQuery}
            searchPlaceholder={
              isAr ? 'بحث بالآلية، الترقيم أو السائق...' : 'Rechercher engin, matricule, opérateur...'
            }
            viewMode={eqViewMode}
            onViewModeChange={setEqViewMode}
            showViewToggle
            onExport={handleExportEquipment}
            extraTrailingControls={
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => setIsEquipmentModalOpen(true)}
                icon={<Plus size={14} />}
              >
                {isAr ? 'تسجيل ساعات ووقود' : 'Nouveau Relevé'}
              </AtriumButton>
            }
            onResetAllFilters={() => setEqSearchQuery('')}
          />

          <UniversalDataCollection
            hideToolbar
            items={sortedEquipmentLogs}
            keyExtractor={(log) => log.id}
            viewMode={eqViewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={eqViewMode === 'grid' ? 'grid' : 'list'}
            isPinned={(log) => pinnedEquipmentIds.has(log.id)}
            onTogglePin={(log) => handleTogglePinEquipment(log.id)}
            columns={[
              {
                key: 'date',
                header: isAr ? 'التاريخ' : 'Date',
                width: '1.1*',
                renderCell: (log) => (
                  <span className="tabular-nums font-semibold t-small text-black dark:text-white">
                    {log.date}
                  </span>
                ),
              },
              {
                key: 'equipmentName',
                header: isAr ? 'الآلية والترقيم' : 'Engin & Matricule',
                width: '2.2*',
                renderCell: (log) => (
                  <div className="min-w-0">
                    <div className="font-semibold t-small text-black dark:text-white truncate">
                      {log.equipmentName}
                    </div>
                    <div className="t-cap text-black/55 dark:text-white/55 tabular-nums truncate">
                      {log.matriculeNumber}
                    </div>
                  </div>
                ),
              },
              {
                key: 'operatorName',
                header: isAr ? 'السائق' : 'Opérateur',
                width: '1.3*',
                renderCell: (log) => (
                  <span className="t-cap text-black/75 dark:text-white/75 truncate">
                    {log.operatorName}
                  </span>
                ),
              },
              {
                key: 'operatingHours',
                header: isAr ? 'الساعات / الوقود' : 'Heures & Gasoil',
                width: '1.4*',
                renderCell: (log) => (
                  <div className="tabular-nums t-cap">
                    <span className="font-semibold text-black dark:text-white">{log.operatingHours} h</span>
                    <span className="text-black/40 dark:text-white/40 mx-1">·</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{log.fuelAddedLiters} L</span>
                  </div>
                ),
              },
              {
                key: 'ratio',
                header: isAr ? 'النسبة والمطابقة' : 'Ratio Réel vs Norme',
                width: '1.8*',
                renderCell: (log) => {
                  const anomaly = calculateFuelConsumptionAnomaly(
                    log.operatingHours,
                    log.fuelAddedLiters,
                    log.theoreticalHourlyBurnRate
                  );
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        className={`tabular-nums font-semibold t-small ${
                          anomaly.isAnomaly ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'
                        }`}
                      >
                        {anomaly.actualRateLph} / {log.theoreticalHourlyBurnRate} L/h
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full t-small font-semibold ${
                          anomaly.isAnomaly
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {anomaly.isAnomaly ? `+${anomaly.variancePercent}%` : 'Conforme'}
                      </span>
                    </div>
                  );
                },
              },
            ]}
            getRowMeta={(log): Partial<KineticRowData> => {
              const anomaly = calculateFuelConsumptionAnomaly(
                log.operatingHours,
                log.fuelAddedLiters,
                log.theoreticalHourlyBurnRate
              );
              const br = resolveRecordBranch(log, branchesById, currentBranch, language);
              return {
                title: log.equipmentName,
                subline: `${log.matriculeNumber} · ${log.date}`,
                avatarText: 'EQ',
                categoryLabel: log.equipmentCategory || 'Engin',
                statusLabel: anomaly.isAnomaly
                  ? `Surconsommation (+${anomaly.variancePercent}%)`
                  : 'Conforme',
                statusVariant: anomaly.isAnomaly ? 'blocked' : 'active',
                metricPrimary: `${log.fuelAddedLiters} L`,
                metricSecondary: `${log.operatingHours} h (${anomaly.actualRateLph} L/h)`,
                branchName: br.name,
                branchCode: br.code,
                isPinned: pinnedEquipmentIds.has(log.id),
                detailCol1: {
                  heading: isAr ? 'الآلية والترقيم' : 'Engin & Matricule',
                  primaryText: `${log.equipmentName} (${log.matriculeNumber})`,
                  secondaryText: `${isAr ? 'السائق' : 'Opérateur'}: ${log.operatorName}`,
                },
                detailCol2: {
                  heading: isAr ? 'الساعات والوقود' : 'Heures & Gasoil',
                  primaryText: `${log.operatingHours} h · ${log.fuelAddedLiters} L`,
                  secondaryText: log.date,
                },
                detailCol3: {
                  heading: isAr ? 'المقارنة التقنية' : 'Ratio L/h & Contrôle',
                  primaryText: `${anomaly.actualRateLph} L/h vs ${log.theoreticalHourlyBurnRate} L/h`,
                  secondaryText: anomaly.isAnomaly ? `Écart +${anomaly.variancePercent}%` : 'Norme respectée',
                },
              };
            }}
            getFanActions={(log): KineticRowFanAction[] => [
              {
                id: 'audit-fuel',
                label: isAr ? 'فحص' : 'Contrôle',
                icon: <Eye size={14} />,
                onClick: () => setFuelAuditLog(log),
              },
              {
                id: 'pin',
                label: pinnedEquipmentIds.has(log.id) ? 'Détacher' : 'Épingler',
                icon: <Pin size={14} />,
                onClick: () => handleTogglePinEquipment(log.id),
              },
            ]}
            getDetailActions={(log): KineticDetailAction[] => [
              {
                id: 'new-log',
                label: isAr ? 'إضافة' : 'Nouveau Relevé',
                icon: <Plus size={14} />,
                onClick: () => setIsEquipmentModalOpen(true),
              },
              {
                id: 'pin',
                label: pinnedEquipmentIds.has(log.id) ? 'Détacher' : 'Épingler',
                icon: <Pin size={14} />,
                onClick: () => handleTogglePinEquipment(log.id),
              },
            ]}
            emptyTitle={isAr ? 'لا توجد سجلات للآليات' : 'Aucun relevé engin'}
            emptyDescription={isAr ? 'أضف أول سجل ساعات ووقود' : 'Enregistrez le premier relevé horaire & gasoil'}
            primaryActionLabel={isAr ? 'تسجيل ساعات ووقود' : 'Nouveau Relevé'}
            onAddFirstItem={() => setIsEquipmentModalOpen(true)}
            onResetFilters={() => setEqSearchQuery('')}
            hasActiveFilters={eqSearchQuery.trim().length > 0}
          />
        </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedLogs.length}
        entityPluralLabel={isAr ? 'محاضر' : 'rapports'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeLog)}
        item={activeLog}
        allItems={sortedLogs}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeLog?.date || ''}
        subtitle={selectedProject ? selectedProject.projectName : 'Chantier BTP'}
        categoryLabel={selectedProject?.projectCode || 'Journal BTP'}
        avatarText="PV"
        branchName={
          activeLog
            ? resolveRecordBranch(activeLog, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeLog?.weather
            ? activeLog.weather.toLowerCase().includes('ensoleill')
              ? isAr ? 'مشمس' : isEn ? 'Sunny' : 'Ensoleillé'
              : activeLog.weather.toLowerCase().includes('vent') || activeLog.weather.toLowerCase().includes('sirocco')
              ? isAr ? 'رياح قوية' : isEn ? 'Windy / Sirocco' : activeLog.weather
              : isAr ? 'تقلبات جوية' : isEn ? 'Adverse Weather' : activeLog.weather
            : undefined
        }
        statusClassName={
          activeLog?.weather.toLowerCase().includes('ensoleill')
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'محضر الأشغال' : 'Fiche Chantier' },
          { id: 'rollcall', label: isAr ? 'تعداد المهن' : 'Effectifs & Engins' },
          { id: 'hse', label: isAr ? 'الأمان' : 'Sécurité HSE' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(log) => setSelectedLog(log)}
        onClose={() => setSelectedLog(null)}
        renderBody={(log, tab) => {
          if (tab === 'rollcall') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={`${log.headcountWorkers} ouvriers`}
                    tone="ok"
                    caption={`Ingénieurs: ${log.workersPresent?.engineers ?? 2} · Spécialistes: ${log.workersPresent?.specializedCrafts ?? 12} · Manœuvres: ${log.workersPresent?.laborers ?? 8}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'العتاد المجند' : 'Engins mobilisés sur site'}>
                  <InspectorCard>
                    {log.equipmentOnSite.map((eq, i) => (
                      <InspectorListItem
                        key={i}
                        title={eq}
                        subtitle={log.date}
                        badge={{ label: 'Opérationnel', tone: 'ok' }}
                        isLast={i === log.equipmentOnSite.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'hse') {
            const checklist = [
              'Port du casque et chaussures de sécurité 100%',
              'Harnais pour travaux en hauteur vérifiés',
              'Balisage périmètre grue à tour conforme',
              'Trousse de premiers secours approvisionnée',
            ];
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'ملاحظات السلامة' : 'Incidents & Constats HSE'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Rapport HSE" value={log.incidentsSafety || 'R.A.S. Aucun incident'} mono={false} />
                    <InspectorKeyValue label="Visa Superviseur" value={log.supervisorSignature} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title="Contrôles réglementaires">
                  <InspectorCard>
                    {checklist.map((item, i) => (
                      <InspectorListItem
                        key={i}
                        title={item}
                        badge={{ label: 'Conforme', tone: 'ok' }}
                        isLast={i === checklist.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: isAr ? 'طباعة' : 'Imprimer PV',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => setPvLogToPrint(log),
                    },
                    {
                      id: 'duplicate',
                      label: isAr ? 'تكرار' : 'Dupliquer',
                      icon: <Copy className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        const dup: ContractorDailyLog = {
                          ...log,
                          id: `log_${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          createdAt: new Date().toISOString(),
                        };
                        addDailyLog(dup);
                        setSelectedLog(dup);
                      },
                    },
                    {
                      id: 'hse',
                      label: 'Audit HSE',
                      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
                      disabled: true,
                      tooltip: t('feature_not_available_phase2', language),
                      onClick: () => {},
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'معلومات المحضر' : 'Détails du Rapport'}>
                <InspectorCard>
                  <InspectorKeyValue label="Date d’exécution" value={log.date} />
                  <InspectorKeyValue label="Météo constatée" value={log.weather} mono={false} />
                  <InspectorKeyValue label="Effectif pointé" value={`${log.headcountWorkers} ouvriers`} tone="ok" />
                  <InspectorKeyValue label="Superviseur" value={log.supervisorSignature} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'الأعمال المنجزة' : 'Travaux accomplis'}>
                <InspectorCard>
                  <InspectorKeyValue label="Synthèse chantier" value={log.tasksAccomplished} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-5 max-h-[90vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-card text-black dark:text-white">
                    {isAr ? 'محضر ورشة يومي وتعداد المهن' : 'Nouveau Rapport Journalier & Pointage'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsLogModalOpen(false)}
                  className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateLog} className="space-y-4">
              <LabelInput
                field="date"
                width="100%"
                height={40}
                corner={12}
                label={isAr ? 'تاريخ التقرير' : 'Date'}
                type="date"
                value={date}
                onChange={setDate}
                required
              />
              <div>
                <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
                  {isAr ? 'الطقس' : 'Météo'}
                </label>
                <LiveSegmentedControl
                  size="md"
                  fullWidth
                  value={weather}
                  onChange={setWeather}
                  options={[
                    { value: 'Ensoleillé', label: 'Ensoleillé' },
                    { value: 'Nuageux', label: 'Nuageux' },
                    { value: 'Pluvieux', label: 'Pluvieux' },
                    { value: 'Venteux / Sirocco', label: 'Venteux' },
                  ]}
                />
              </div>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-neutral-50 dark:bg-[#22201E] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="t-small font-semibold text-black dark:text-white block">
                      {isAr ? 'تعداد العمالة الفورية حسب المهن' : 'Pointage Rapide par Corps d’État'}
                    </span>
                    <span className="t-cap text-black/55 dark:text-white/55">
                      {isAr ? 'انقر على الزر للتعديل السريع' : 'Cliquez sur + ou - pour ajuster'}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 tabular-nums font-semibold t-small">
                    {totalHeadcount} ouvriers
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { label: 'Maçons', value: craftMasons, set: setCraftMasons },
                    { label: 'Ferrailleurs', value: craftIronworkers, set: setCraftIronworkers },
                    { label: 'Manœuvres', value: craftLaborers, set: setCraftLaborers },
                    { label: 'Conduct. Engins', value: craftOperators, set: setCraftOperators },
                    { label: 'Encadrement', value: craftSupervisors, set: setCraftSupervisors },
                  ].map((c) => (
                    <div
                      key={c.label}
                      data-sq="ctl"
                      data-sq-border="solid"
                      className="p-2 bg-white dark:bg-[#191716] flex items-center justify-between"
                    >
                      <div>
                        <span className="t-small font-medium block">{c.label}</span>
                        <span className="t-small tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{c.value}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => c.set((n) => Math.max(0, n - 1))}
                          data-sq="check"
                          data-sq-border="none"
                          className="w-6 h-6 bg-neutral-100 dark:bg-[#2B2825] flex items-center justify-center text-black/70 dark:text-white/75 hover:bg-neutral-200 dark:hover:bg-[#332F2B] cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => c.set((n) => n + 1)}
                          data-sq="check"
                          data-sq-border="none"
                          className="w-6 h-6 bg-neutral-100 dark:bg-[#2B2825] flex items-center justify-center text-black/70 dark:text-white/75 hover:bg-neutral-200 dark:hover:bg-[#332F2B] cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <LabelInput
                field="tasks"
                width="100%"
                height={40}
                corner={12}
                label={isAr ? 'الأعمال المنجزة بالتفصيل' : 'Tâches accomplies et avancement'}
                value={tasks}
                onChange={setTasks}
                placeholder="Ex: Coulage dalle niveau R+3, ferraillage voiles..."
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="equipment"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isAr ? 'العتاد والآليات' : 'Engins mobilisés'}
                  placeholder="Ex: Grue à tour, 2x Toupie béton"
                  value={equipment}
                  onChange={setEquipment}
                />
                <LabelInput
                  field="signature"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isAr ? 'المشرف الموقّع' : 'Superviseur / Ingénieur'}
                  placeholder="Ex: Ing. Mourad Benali"
                  value={signature}
                  onChange={setSignature}
                  required
                />
              </div>
              <LabelInput
                field="incidents"
                width="100%"
                height={40}
                corner={12}
                label={isAr ? 'ملاحظات الأمان' : 'Sécurité HSE & Remarques'}
                placeholder="Ex: R.A.S. Port des EPI vérifié"
                value={incidents}
                onChange={setIncidents}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setIsLogModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </Button>
                <Button tone="accent" size={40} type="submit">
                  {isAr ? 'توقيع المحضر' : 'Valider & Signer'}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={isConcreteModalOpen}
        onClose={() => setIsConcreteModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-card text-black dark:text-white">
                    {isAr
                      ? 'تسجيل صبة خرسانة وعينات مخبرية CTC'
                      : 'Enregistrement Coulée & Prélèvement CTC'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsConcreteModalOpen(false)}
                  className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateConcretePour} className="space-y-4">
              <LabelInput
                field="pourDate"
                width="100%"
                height={40}
                corner={12}
                label={isAr ? 'تاريخ الصبة' : 'Date de coulage'}
                type="date"
                value={pourDate}
                onChange={setPourDate}
                required
              />
              <div>
                <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
                  {isAr ? 'رتبة الخرسانة' : 'Classe du Béton'}
                </label>
                <LiveSegmentedControl
                  size="md"
                  fullWidth
                  value={pourGrade}
                  onChange={setPourGrade}
                  options={[
                    { value: 'B20', label: 'B20' },
                    { value: 'B25', label: 'B25' },
                    { value: 'B30', label: 'B30' },
                    { value: 'B35', label: 'B35' },
                  ]}
                />
              </div>
              <LabelInput
                field="pourElement"
                width="100%"
                height={40}
                corner={12}
                label={isAr ? 'العنصر المصبوب' : 'Élément structural coulé'}
                value={pourElement}
                onChange={setPourElement}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="pourSupplier"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isAr ? 'المورد' : 'Centrale à béton'}
                  placeholder="Ex: Centrale Béton Oued Smar"
                  value={pourSupplier}
                  onChange={setPourSupplier}
                  required
                />
                <LabelInput
                  field="pourSlip"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isAr ? 'رقم وصل التسليم' : 'N° Bon de Livraison'}
                  placeholder="Ex: BL-2026-0412"
                  value={pourSlip}
                  onChange={setPourSlip}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabelInput
                  field="pourVolume"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Volume (m³)"
                  type="number"
                  placeholder="36"
                  value={pourVolume}
                  onChange={setPourVolume}
                  required
                />
                <LabelInput
                  field="pourSlump"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Affaissement (cm)"
                  type="number"
                  placeholder="12"
                  value={pourSlump}
                  onChange={setPourSlump}
                  required
                />
                <LabelInput
                  field="pourCylinders"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Éprouvettes"
                  type="number"
                  placeholder="6"
                  value={pourCylinders}
                  onChange={setPourCylinders}
                  required
                />
              </div>
              <LabelInput
                field="pourStrength7D"
                width="100%"
                height={40}
                corner={12}
                label="Résistance écrasement 7 jours (MPa)"
                type="number"
                placeholder="18.2"
                value={pourStrength7D}
                onChange={setPourStrength7D}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setIsConcreteModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </Button>
                <Button tone="accent" size={40} type="submit">
                  {isAr ? 'تسجيل ومطابقة' : 'Enregistrer Coulée'}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <Fuel size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-card text-black dark:text-white">
                    {isAr ? 'تسجيل ساعات عمل الآلية والوقود' : 'Relevé Compteur Horaire & Plein Gasoil'}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsEquipmentModalOpen(false)}
                  className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateEquipmentLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="eqName"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Désignation Engin"
                  placeholder="Ex: Pelle Hydraulique"
                  value={eqName}
                  onChange={setEqName}
                  required
                />
                <LabelSelect
                  field="eqCategory"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Catégorie"
                  value={eqCategory}
                  onChange={setEqCategory}
                  options={[
                    { value: 'Excavator', label: 'Pelle hydraulique' },
                    { value: 'TowerCrane', label: 'Grue à tour' },
                    { value: 'BackhoeLoader', label: 'Rétrochargeuse' },
                    { value: 'DumpTruck', label: 'Camion benne 8x4' },
                    { value: 'Generator', label: 'Groupe électrogène' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="eqMatricule"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Immatriculation / Matricule"
                  placeholder="Ex: PEL-16-554"
                  value={eqMatricule}
                  onChange={setEqMatricule}
                  required
                />
                <LabelInput
                  field="eqOperator"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Conducteur d’engin"
                  placeholder="Nom du conducteur"
                  value={eqOperator}
                  onChange={setEqOperator}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabelInput
                  field="eqHours"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Heures compteur"
                  type="number"
                  placeholder="8"
                  value={eqHours}
                  onChange={setEqHours}
                  required
                />
                <LabelInput
                  field="eqFuelLiters"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Gasoil servi (L)"
                  type="number"
                  placeholder="130"
                  value={eqFuelLiters}
                  onChange={setEqFuelLiters}
                  required
                />
                <LabelInput
                  field="eqTheoreticalBurnRate"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Norme (L/h)"
                  type="number"
                  placeholder="16"
                  value={eqTheoreticalBurnRate}
                  onChange={setEqTheoreticalBurnRate}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <Button
                  type="button"
                  tone="soft"
                  size={40}
                  onClick={() => setIsEquipmentModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </Button>
                <Button tone="accent" size={40} type="submit">
                  {isAr ? 'حفظ وفحص النسبة' : 'Valider & Contrôler'}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>

      <PrintSheetModal
        isOpen={Boolean(pvLogToPrint)}
        onClose={() => setPvLogToPrint(null)}
        language={language}
        format="a4"
        title={isAr ? 'محضر الورشة اليومي' : isEn ? 'Daily Site Log PV' : 'PV Journalier de Chantier'}
        subtitle={pvLogToPrint ? `${pvLogToPrint.date} · ${selectedProject?.projectName || 'Chantier'}` : undefined}
        pages={
          pvLogToPrint
            ? [
                {
                  id: pvLogToPrint.id,
                  title: isAr
                    ? `محضر أشغال يوم ${pvLogToPrint.date}`
                    : `Procès-Verbal de Chantier — ${pvLogToPrint.date}`,
                  subtitle: `${selectedProject?.projectCode || 'BTP'} · ${selectedProject?.projectName || ''}`,
                  badgeText: pvLogToPrint.weather,
                  sections: [
                    {
                      heading: isAr ? 'المعطيات العامة' : 'Informations Générales',
                      rows: [
                        { label: isAr ? 'التاريخ' : 'Date', value: pvLogToPrint.date },
                        { label: isAr ? 'الحالة الجوية' : 'Météo', value: pvLogToPrint.weather },
                        { label: isAr ? 'إجمالي العمال' : 'Effectif total', value: `${pvLogToPrint.headcountWorkers}` },
                        {
                          label: isAr ? 'تفصيل الطاقم' : 'Répartition effectif',
                          value: `Ingénieurs: ${pvLogToPrint.workersPresent?.engineers ?? 2} · Spécialistes: ${pvLogToPrint.workersPresent?.specializedCrafts ?? 12} · Manœuvres: ${pvLogToPrint.workersPresent?.laborers ?? 8}`,
                        },
                        {
                          label: isAr ? 'العتاد المسخر' : 'Engins mobilisés',
                          value: pvLogToPrint.equipmentOnSite?.join(', ') || '—',
                        },
                      ],
                    },
                    {
                      heading: isAr ? 'الأشغال المنجزة والسلامة' : 'Travaux & Sécurité HSE',
                      rows: [
                        {
                          label: isAr ? 'الأشغال المنجزة' : 'Travaux accomplis',
                          value: pvLogToPrint.tasksAccomplished || pvLogToPrint.worksSummary || '—',
                        },
                        {
                          label: isAr ? 'ملاحظات السلامة' : 'Incidents & HSE',
                          value: pvLogToPrint.incidentsSafety || 'R.A.S.',
                        },
                      ],
                    },
                  ],
                  signatureLeft: isAr ? `رئيس الورشة: ${pvLogToPrint.supervisorSignature}` : `Chef de chantier: ${pvLogToPrint.supervisorSignature}`,
                  signatureRight: isAr ? 'تأشيرة مكتب الدراسات / CTC' : "Visa Maître d'Œuvre / CTC",
                },
              ]
            : []
        }
      />

      <KineticModalShell
        isOpen={Boolean(fuelAuditLog)}
        onClose={() => setFuelAuditLog(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {fuelAuditLog && (() => {
          const audit = calculateFuelConsumptionAnomaly(
            fuelAuditLog.operatingHours,
            fuelAuditLog.fuelAddedLiters,
            fuelAuditLog.theoreticalHourlyBurnRate
          );
          return (
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
                <div className="flex items-center gap-2">
                  <Fuel size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-label text-black dark:text-white">
                    {isAr ? 'تدقيق استهلاك الوقود' : 'Contrôle Ratio Gasoil'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFuelAuditLog(null)}
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 t-cap">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الآلية' : 'Engin'}</span>
                  <span className="font-semibold text-black dark:text-white">
                    {fuelAuditLog.equipmentName} ({fuelAuditLog.matriculeNumber})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الساعات / الكمية' : 'Heures / Gasoil'}</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">
                    {fuelAuditLog.operatingHours} h · {fuelAuditLog.fuelAddedLiters} L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'المعدل الفعلي / المرجعي' : 'Ratio réel vs Norme'}</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">
                    {audit.actualRateLph} L/h vs {fuelAuditLog.theoreticalHourlyBurnRate} L/h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">{isAr ? 'الانحراف' : 'Écart constaté'}</span>
                  <span className={`tabular-nums font-semibold ${audit.isAnomaly ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {audit.variancePercent >= 0 ? `+${audit.variancePercent}%` : `${audit.variancePercent}%`}
                  </span>
                </div>
              </div>
              <div
                className={`p-3 rounded-xl t-small font-semibold ${
                  audit.isAnomaly
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {audit.isAnomaly
                  ? isAr
                    ? `تنبيه: استهلاك زائد للوقود (+${audit.variancePercent}%) يتطلب المراجعة.`
                    : `Anomalie détectée (+${audit.variancePercent}% au-dessus de la norme). Vérifier les bons de carburant.`
                  : isAr
                  ? 'استهلاك مطابق للمعايير الفنية.'
                  : 'Consommation conforme à la norme constructeur.'}
              </div>
              <div className="flex justify-end pt-2 border-t border-[var(--atr-divider)]">
                <Button tone="accent" size={36} onClick={() => setFuelAuditLog(null)}>
                  {isAr ? 'إغلاق' : 'Fermer'}
                </Button>
              </div>
            </div>
          );
        })()}
      </KineticModalShell>
    </div>
  );
};
