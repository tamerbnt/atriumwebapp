import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Pill,
  Printer,
  FileText,
  CheckCircle2,
  QrCode,
  Download,
  Pin,
  X,
  ShieldCheck,
  Plus,
  Settings,
  ShieldAlert,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPrescription, DoctorOrdonnanceConfig } from '../../../types';
import { useMedicalData, NGAP_ACTS } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { MedicalOrdonnancePersonalizerModal } from './MedicalOrdonnancePersonalizerModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorListItem,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'RX').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';

export const MedicalPrescriptionsView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    prescriptions,
    patients,
    practitioners,
    doctorConfigs,
    updateDoctorConfig,
    addPrescription,
    depleteForAct,
  } = useMedicalData();

  const [activeMainTab, setActiveMainTab] = useState<'prescriptions' | 'ngap'>('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'recent' | 'multi'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [doctorFilter, setDoctorFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('prescriptionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['rx_01']));
  const [pinnedNgapCodes, setPinnedNgapCodes] = useState<Set<string>>(() => new Set<string>());
  const [ngapSearch, setNgapSearch] = useState('');
  const [ngapViewMode, setNgapViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [inspectedRx, setInspectedRx] = useState<MedicalPrescription | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('posologie');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false);
  const [activeDoctorId] = useState(practitioners[0]?.id || 'dr_01');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [compPatientId, setCompPatientId] = useState(patients[0]?.id || '');
  const [compDoctorId, setCompDoctorId] = useState(practitioners[0]?.id || 'dr_01');
  const [compItems, setCompItems] = useState([
    {
      drugName: 'Paracétamol 1g',
      form: 'Comprimé',
      dosage: '1 comprimé',
      frequency: '3 fois par jour',
      durationDays: 5,
      instructions: 'Prendre pendant les repas si douleur ou fièvre',
    },
  ]);
  const [compNotes, setCompNotes] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeRx = useMemo(() => {
    if (!inspectedRx) return null;
    return prescriptions.find((rx) => rx.id === inspectedRx.id) || null;
  }, [inspectedRx, prescriptions]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    prescriptions.forEach((rx) => {
      const bName = resolveRecordBranch(rx, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [prescriptions, branchesById, currentBranch, language]);

  const checkDrugAllergy = (drugName: string, patientAllergies: string[]) => {
    const lowerDrug = drugName.toLowerCase();
    for (const allergy of patientAllergies) {
      const lowerAllergy = allergy.toLowerCase();
      if (
        (lowerAllergy.includes('pénicilline') || lowerAllergy.includes('penicilline')) &&
        (lowerDrug.includes('amoxicilline') ||
          lowerDrug.includes('augmentin') ||
          lowerDrug.includes('clamoxyl') ||
          lowerDrug.includes('ampicilline'))
      ) {
        return `Contre-indication majeure : Patient allergique à la ${allergy}. Risque de choc anaphylactique avec ${drugName}.`;
      }
      if (
        lowerAllergy.includes('aspirine') &&
        (lowerDrug.includes('aspirin') ||
          lowerDrug.includes('aspégic') ||
          lowerDrug.includes('kardegic') ||
          lowerDrug.includes('acide acétylsalicylique'))
      ) {
        return `Contre-indication : Patient allergique à l'${allergy}. Prescription déconseillée.`;
      }
      if (
        (lowerAllergy.includes('ains') || lowerAllergy.includes('anti-inflammatoire')) &&
        (lowerDrug.includes('ibuprofène') ||
          lowerDrug.includes('voltarène') ||
          lowerDrug.includes('kétoprofène') ||
          lowerDrug.includes('bi-profenid'))
      ) {
        return `Contre-indication : Allergie aux AINS déclarée.`;
      }
      if (lowerDrug.includes(lowerAllergy)) {
        return `Alerte allergie déclarée pour : ${allergy}.`;
      }
    }
    return null;
  };

  const selectedPatientForComp = useMemo(
    () => patients.find((p) => p.id === compPatientId),
    [patients, compPatientId]
  );

  const allergyAlerts = useMemo(() => {
    if (!selectedPatientForComp?.allergies) return [];
    const alerts: string[] = [];
    compItems.forEach((it) => {
      const warning = checkDrugAllergy(it.drugName, selectedPatientForComp.allergies || []);
      if (warning) alerts.push(warning);
    });
    return alerts;
  }, [selectedPatientForComp, compItems]);

  const recentCount = useMemo(
    () =>
      prescriptions.filter(
        (rx) => (Date.now() - new Date(rx.prescriptionDate).getTime()) / 864e5 <= 14
      ).length,
    [prescriptions]
  );
  const multiCount = useMemo(
    () => prescriptions.filter((rx) => rx.items.length >= 3).length,
    [prescriptions]
  );
  const totalDrugsPrescribed = useMemo(
    () => prescriptions.reduce((acc, rx) => acc + rx.items.length, 0),
    [prescriptions]
  );

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(rx, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (doctorFilter !== 'All' && rx.prescribingDoctorId !== doctorFilter) return false;
      if (filterStatus === 'multi' && rx.items.length < 3) return false;
      if (
        filterStatus === 'recent' &&
        (Date.now() - new Date(rx.prescriptionDate).getTime()) / 864e5 > 14
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPatient = rx.patientName.toLowerCase().includes(q);
        const matchesHash = rx.qrCodeHash.toLowerCase().includes(q);
        const matchesDrug = rx.items.some((item) => item.drugName.toLowerCase().includes(q));
        if (!matchesPatient && !matchesHash && !matchesDrug) return false;
      }
      return true;
    });
  }, [
    prescriptions,
    branchFilter,
    doctorFilter,
    filterStatus,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedPrescriptions = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      if (sortBy === 'patientName') {
        const cmp = a.patientName.localeCompare(b.patientName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = a.prescriptionDate.localeCompare(b.prescriptionDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast({
        type: 'info',
        title: isAr ? 'تم التحديث' : isFr ? 'Épinglage' : 'Pin Updated',
        message: isAr ? 'تم تحديث التثبيت' : 'Ordonnance épinglée',
      });
    },
    [isAr, isFr]
  );

  const handleTogglePinNgap = useCallback(
    (code: string) => {
      setPinnedNgapCodes((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      });
      showToast({
        type: 'info',
        title: isAr ? 'تم التحديث' : 'Nomenclature NGAP',
        message: isAr ? 'تم تحديث التثبيت' : `Acte ${code} mis à jour`,
      });
    },
    [isAr]
  );

  const sortedNgapActs = useMemo(() => {
    const q = ngapSearch.trim().toLowerCase();
    const list = NGAP_ACTS.filter((act) => {
      if (!q) return true;
      return (
        act.code.toLowerCase().includes(q) ||
        act.label.toLowerCase().includes(q) ||
        act.category.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const ap = pinnedNgapCodes.has(a.code);
      const bp = pinnedNgapCodes.has(b.code);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return a.code.localeCompare(b.code);
    });
    return list;
  }, [ngapSearch, pinnedNgapCodes]);

  const handleSelectRx = useCallback((rx: MedicalPrescription, opener?: HTMLElement | null) => {
    if (opener) setDrawerOpenerEl(opener);
    setInspectedRx(rx);
    setActiveTab('posologie');
  }, []);

  const handlePrint = useCallback(
    (_rx: MedicalPrescription) => {
      showToast({
        type: 'info',
        title: isAr ? 'الطباعة' : 'Impression Ordonnance',
        message: isAr
          ? 'جاري تجهيز الوصفة الطبية للطباعة...'
          : 'Génération du document ordonnancier sécurisé...',
      });
      window.print();
    },
    [isAr]
  );

  const handleSaveComposer = () => {
    if (!selectedPatientForComp) {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ' : 'Patient manquant',
        message: 'Veuillez sélectionner un patient valide',
      });
      return;
    }
    if (allergyAlerts.length > 0 && !overrideConfirmed) {
      showToast({
        type: 'error',
        title: 'Contre-indication',
        message: 'Veuillez valider le déblocage médical de sécurité contre-indication',
      });
      return;
    }
    if (compItems.length === 0) {
      showToast({
        type: 'error',
        title: 'Prescription vide',
        message: 'Veuillez prescrire au moins une spécialité',
      });
      return;
    }
    const doc = practitioners.find((p) => p.id === compDoctorId);
    const newRx: MedicalPrescription = {
      id: `rx_${Date.now()}`,
      branchId: currentBranch?.id || selectedPatientForComp.branchId || 'br_main',
      patientId: selectedPatientForComp.id,
      patientName: selectedPatientForComp.fullName,
      prescriptionDate: new Date().toISOString().slice(0, 10),
      items: compItems,
      notes: compNotes || undefined,
      qrCodeHash: `ALG-ORD-${Math.floor(1e5 + Math.random() * 9e5)}`,
      prescribingDoctorId: compDoctorId,
      prescribingDoctorName: doc ? doc.fullName || doc.name || 'Dr. Praticien' : 'Dr. Amina Benali',
    };
    addPrescription(newRx);
    setInspectedRx(newRx);
    setIsComposerOpen(false);
    showToast({
      type: 'success',
      title: 'Ordonnance Chifa',
      message: 'Nouvelle ordonnance certifiée Chifa générée',
    });
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Date',
      'Patient',
      'Doctor',
      'Branch',
      'QR Hash',
      'Medications Count',
      'Drugs',
    ];
    const rows = sortedPrescriptions.map((rx) => [
      rx.id,
      rx.prescriptionDate,
      rx.patientName,
      rx.prescribingDoctorName || rx.doctorName || 'Dr. Polyclinique',
      resolveRecordBranch(rx, branchesById, currentBranch, language).name,
      rx.qrCodeHash,
      rx.items.length,
      rx.items.map((it) => `${it.drugName} (${it.dosage})`).join(' | '),
    ]);
    downloadCsvSafe(`medical_prescriptions_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تم التصدير' : isFr ? 'Export terminé' : 'Export Complete',
      message: isAr ? 'تم تصدير سجل الوصفات' : 'Export des ordonnances CSV terminé',
    });
  }, [sortedPrescriptions, branchesById, currentBranch, language, isAr, isFr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('all');
    setBranchFilter('All');
    setDoctorFilter('All');
  }, []);

  const activeFiltersCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (doctorFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterStatus !== 'all') {
      chips.push({
        key: 'status',
        label: filterStatus === 'multi' ? 'Polymédic (≥3)' : 'Récentes (<14j)',
        onRemove: () => setFilterStatus('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (doctorFilter !== 'All') {
      const doc = practitioners.find((p) => p.id === doctorFilter);
      chips.push({
        key: 'doctor',
        label: doc?.fullName || doctorFilter,
        onRemove: () => setDoctorFilter('All'),
      });
    }
    return chips;
  }, [filterStatus, branchFilter, doctorFilter, practitioners, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'فئة الوصفة' : isFr ? 'Filtrer les Ordonnances' : 'Prescription Scope',
        value: filterStatus,
        resetValue: 'all',
        onChange: (val) => setFilterStatus(val as 'all' | 'recent' | 'multi'),
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: prescriptions.length },
          { value: 'recent', label: isAr ? 'حديثة' : 'Récentes', count: recentCount },
          { value: 'multi', label: isAr ? 'متعددة' : 'Polymédic', count: multiCount },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / العيادة' : isFr ? 'Branche / Clinique' : 'Branch / Clinic',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الفروع' : isFr ? 'Toutes' : 'All Branches',
            count: prescriptions.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'doctor',
        label: isAr ? 'الطبيب الموصي' : isFr ? 'Médecin Prescripteur' : 'Prescribing Doctor',
        value: doctorFilter,
        onChange: setDoctorFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الأطباء' : isFr ? 'Tous les médecins' : 'All Doctors',
            count: practitioners.length,
          },
          ...practitioners.map((doc) => ({
            value: doc.id,
            label: doc.fullName,
            sublabel: doc.specialty,
          })),
        ],
      },
    ],
    [
      filterStatus,
      branchFilter,
      doctorFilter,
      prescriptions.length,
      recentCount,
      multiCount,
      branchCounts,
      practitioners,
      isAr,
      isFr,
    ]
  );

  const currentDoctorConfig: DoctorOrdonnanceConfig = useMemo(() => {
    const base = doctorConfigs[activeDoctorId];
    if (base) return base;
    return {
      doctorId: activeDoctorId,
      doctorName: 'Dr. Amina Benali',
      specialtyTitle: 'Spécialiste en Cardiologie & Maladies Vasculaires',
      academicCredentials: "Ancienne Interne des Hôpitaux d'Alger - CES Cardiologie",
      qualifications: "Ancienne Interne des Hôpitaux d'Alger - CES Cardiologie",
      clinicAddress: '14, Boulevard des Martyrs, Alger Centre',
      licenseNumber: '16/4820-DZ',
      councilOrderNumber: '16/4820-DZ',
      cabinetPhone: '021 74 88 90',
      emergencyPhone: '0550 12 34 56',
      paperFormat: 'A5',
      paperSize: 'A5',
      printMode: 'full_digital',
      themeAccent: 'navy',
      accentColor: '#1e3a8a',
      usePreprintedStationery: false,
      digitalStampUrl: 'CACHET OFFICIEL AGRÉÉ MSPRH',
      digitalStampText: 'CACHET OFFICIEL AGRÉÉ MSPRH',
      isStampEnabled: true,
      showWatermark: true,
      footerConsultationHours: 'Dim-Jeu 08:30-17:30',
      footerLegalNotice: 'Polyclinique El-Chifa',
    };
  }, [doctorConfigs, activeDoctorId]);

  const columns: ColumnDefinition<MedicalPrescription>[] = useMemo(
    () => [
      {
        key: 'patientName',
        header: isAr ? 'المريض / الرمز' : 'Patient & Référence',
        sortable: true,
        width: '2.5*',
        renderCell: (rx) => {
          const isPinned = pinnedIds.has(rx.id);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div
                data-sq="tile"
                data-sq-border="solid"
                className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800"
              >
                <Pill size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                  {rx.patientName}
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">PIN</span>}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 font-mono truncate">
                  {rx.qrCodeHash} · {rx.prescriptionDate}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'doctor',
        header: isAr ? 'الطبيب المعالج' : 'Praticien',
        width: '1.8*',
        renderCell: (rx) => (
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block">
            {rx.prescribingDoctorName || rx.doctorName || 'Dr. Polyclinique'}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.5*',
        sortable: true,
        renderCell: (rx) => (
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {resolveRecordBranch(rx, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'itemsCount',
        header: isAr ? 'الأدوية الموصوفة' : 'Médicaments',
        width: '1.4*',
        renderCell: (rx) => (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 font-mono">
            {rx.items.length} {isAr ? 'مستحضرات' : 'spécialités'}
          </span>
        ),
      },
      {
        key: 'security',
        header: isAr ? 'الأمان والتحقق' : 'Signature & QR',
        width: '1.4*',
        renderCell: () => (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <QrCode size={13} className="shrink-0" />
            <span className="font-mono text-[11px]">Certifié Chifa</span>
          </div>
        ),
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isFr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: prescriptions.length > 0,
  });

  if (showSkeleton && (prescriptions.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Pill size={20} />}
        title={isAr ? 'الوصفات' : language === 'en' ? 'Prescriptions' : 'Ordonnances'}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="flex bg-neutral-200/80 dark:bg-neutral-800 p-[3px] text-xs font-semibold"
            >
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => setActiveMainTab('prescriptions')}
                className={`px-3 py-1.5 transition-all cursor-pointer ${
                  activeMainTab === 'prescriptions'
                    ? 'bg-white dark:bg-neutral-700 text-black dark:text-white font-bold'
                    : 'text-black/70 dark:text-white/75'
                }`}
              >
                {isAr ? 'الوصفات الطبية' : 'Ordonnances'}
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => setActiveMainTab('ngap')}
                className={`px-3 py-1.5 transition-all cursor-pointer ${
                  activeMainTab === 'ngap'
                    ? 'bg-white dark:bg-neutral-700 text-[#d4522f] font-bold'
                    : 'text-black/70 dark:text-white/75'
                }`}
              >
                {isAr ? 'دليل الفحوصات NGAP' : 'Nomenclature NGAP'}
              </button>
            </div>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="ctl"
              data-sq-border="solid"
              onClick={() => setIsPersonalizerOpen(true)}
              className="px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black/70 dark:text-white hover:border-[#d4522f] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Settings size={14} className="text-[#d4522f]" />
              <span>{isAr ? 'تخصيص الأوردونونس' : 'Studio Ordonnance'}</span>
            </button>
          </div>
        }
        primaryAction={{
          label: isAr ? 'وصفة جديدة' : isFr ? 'Nouvelle Ordonnance' : 'New Prescription',
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => setIsComposerOpen(true),
        }}
      />

      {activeMainTab === 'ngap' ? (
        <ScreenPod>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <Stethoscope size={16} className="text-[#d4522f]" />
                <span>
                  {isAr
                    ? 'دليل الفحوصات والأعمال الطبية (NGAP)'
                    : 'Nomenclature Générale des Actes Professionnels (NGAP)'}
                </span>
              </h3>
              <p className="text-xs text-black/55 dark:text-white/55">
                {isAr
                  ? 'التعريفات الرسمية للضمان الاجتماعي، حصص الصندوق والتغذية التلقائية للمستهلكات'
                  : 'Codification officielle CNAS/CASNOS, tarifs conventionnés, ticket modérateur et dépréciation du stock'}
              </p>
            </div>
            <ScreenCollectionToolbar
              title={isAr ? 'دليل الأعمال NGAP' : 'Codification Officielle NGAP'}
              liveRegionText={`${sortedNgapActs.length} actes`}
              language={language}
              searchQuery={ngapSearch}
              onSearchChange={setNgapSearch}
              searchPlaceholder={
                isAr ? 'بحث بالكود أو نوع الفحص...' : 'Rechercher code NGAP, libellé, catégorie...'
              }
              viewMode={ngapViewMode}
              onViewModeChange={setNgapViewMode}
              showViewToggle
              onExport={() => {
                const headers = ['Code NGAP', 'Libellé', 'Catégorie', 'Tarif Conv. (DA)', 'Part CNAS (80%)', 'Ticket Mod. (DA)', 'Consommables'];
                const rows = sortedNgapActs.map((act) => [
                  act.code,
                  act.label,
                  act.category,
                  act.conventionFeeDzd,
                  act.cnasReimbursementDzd,
                  act.ticketModerateurDzd,
                  act.linkedConsumables.join(' | '),
                ]);
                downloadCsvSafe(`nomenclature_ngap_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
                showToast({ type: 'info', title: 'Export NGAP', message: 'Nomenclature NGAP exportée en CSV' });
              }}
              onResetAllFilters={() => setNgapSearch('')}
            />

            <UniversalDataCollection
              hideToolbar
              items={sortedNgapActs}
              keyExtractor={(act) => act.code}
              viewMode={ngapViewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={ngapViewMode === 'grid' ? 'grid' : 'list'}
              isPinned={(act) => pinnedNgapCodes.has(act.code)}
              onTogglePin={(act) => handleTogglePinNgap(act.code)}
              columns={[
                {
                  key: 'code',
                  header: 'Code NGAP',
                  width: '1.0*',
                  renderCell: (act) => (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d4522f]/10 border border-[#d4522f]/20 font-mono font-bold text-xs text-[#d4522f]">
                      {act.code}
                    </span>
                  ),
                },
                {
                  key: 'label',
                  header: "Libellé de l'Acte",
                  width: '2.2*',
                  renderCell: (act) => (
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-black dark:text-white truncate">{act.label}</div>
                      <div className="text-[11px] text-black/55 dark:text-white/55 truncate">{act.category}</div>
                    </div>
                  ),
                },
                {
                  key: 'conventionFeeDzd',
                  header: 'Tarif Conv.',
                  width: '1.2*',
                  renderCell: (act) => (
                    <span className="font-mono font-bold text-xs text-black dark:text-white">
                      {act.conventionFeeDzd.toLocaleString()} DA
                    </span>
                  ),
                },
                {
                  key: 'cnasReimbursementDzd',
                  header: 'Part CNAS (80%)',
                  width: '1.3*',
                  renderCell: (act) => (
                    <span className="font-mono text-xs text-emerald-600 font-semibold">
                      {act.cnasReimbursementDzd.toLocaleString()} DA
                    </span>
                  ),
                },
                {
                  key: 'ticketModerateurDzd',
                  header: 'Ticket Mod.',
                  width: '1.1*',
                  renderCell: (act) => (
                    <span className="font-mono text-xs text-black/70 dark:text-white/75">
                      {act.ticketModerateurDzd.toLocaleString()} DA
                    </span>
                  ),
                },
                {
                  key: 'linkedConsumables',
                  header: 'Consommables Déduits',
                  width: '1.8*',
                  renderCell: (act) => (
                    <div className="flex flex-wrap gap-1">
                      {act.linkedConsumables.map((c, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75 font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ),
                },
              ]}
              getRowMeta={(act): KineticRowMeta => ({
                title: act.label,
                subline: `${act.code} · ${act.category}`,
                avatarText: act.code.slice(0, 2).toUpperCase(),
                categoryLabel: act.category,
                statusLabel: 'Conventionné CNAS',
                statusVariant: 'active',
                metricPrimary: `${act.conventionFeeDzd.toLocaleString()} DA`,
                metricSecondary: `CNAS ${act.cnasReimbursementDzd.toLocaleString()} DA · TM ${act.ticketModerateurDzd.toLocaleString()} DA`,
                isPinned: pinnedNgapCodes.has(act.code),
                detailCol1: {
                  heading: 'Code NGAP & Catégorie',
                  primaryText: act.code,
                  secondaryText: act.category,
                },
                detailCol2: {
                  heading: 'Tarif / CNAS / TM',
                  primaryText: `${act.conventionFeeDzd.toLocaleString()} DA`,
                  secondaryText: `CNAS ${act.cnasReimbursementDzd.toLocaleString()} DA · TM ${act.ticketModerateurDzd.toLocaleString()} DA`,
                },
                detailCol3: {
                  heading: 'Consommables déduits',
                  primaryText: act.linkedConsumables.join(', ') || 'Aucun consommable lié',
                },
              })}
              getFanActions={(act): KineticRowFanAction[] => [
                {
                  id: 'deplete',
                  label: 'Consommer',
                  icon: <CheckCircle2 size={13} />,
                  onClick: () => {
                    depleteForAct(act.code);
                    showToast({
                      type: 'success',
                      title: 'Consommables NGAP',
                      message: `Consommables déduits avec succès pour acte [${act.code}]`,
                    });
                  },
                },
                {
                  id: 'pin',
                  label: pinnedNgapCodes.has(act.code) ? 'Détacher' : 'Épingler',
                  icon: <Pin size={13} />,
                  onClick: () => handleTogglePinNgap(act.code),
                },
              ]}
              getDetailActions={(act): KineticDetailAction[] => [
                {
                  id: 'deplete',
                  label: 'Consommer',
                  icon: <CheckCircle2 size={14} />,
                  onClick: () => {
                    depleteForAct(act.code);
                    showToast({
                      type: 'success',
                      title: 'Consommables NGAP',
                      message: `Consommables déduits avec succès pour acte [${act.code}]`,
                    });
                  },
                },
                {
                  id: 'pin',
                  label: pinnedNgapCodes.has(act.code) ? 'Détacher' : 'Épingler',
                  icon: <Pin size={14} />,
                  onClick: () => handleTogglePinNgap(act.code),
                },
              ]}
              emptyTitle="Aucun acte NGAP"
              emptyDescription="Aucun acte ne correspond à votre recherche"
              onResetFilters={() => setNgapSearch('')}
              hasActiveFilters={ngapSearch.trim().length > 0}
            />
          </div>
        </ScreenPod>
      ) : (
        <>
          <ScreenKpiBanner
            heading={
              isAr
                ? 'مؤشرات الوصفات الطبية والسلامة الدوائية'
                : 'Indicateurs de Prescription & Sécurisation Pharmacologique'
            }
            language={language}
            primaryCard={{
              label: isAr ? 'وصفات متعددة الأدوية' : 'Ordonnances Polymédic (≥3)',
              badgeText: '≥3 lignes',
              count: multiCount,
              tone: 'terracotta',
              isActive: filterStatus === 'multi',
              onToggle: () =>
                setFilterStatus((prev) => (prev === 'multi' ? 'all' : 'multi')),
            }}
            secondaryCard={{
              label: isAr ? 'وصفات حديثة (<14 يوم)' : 'Ordonnances Récentes (<14j)',
              badgeText: isAr ? 'حديثة' : 'Récentes',
              count: recentCount,
              tone: 'emerald',
              isActive: filterStatus === 'recent',
              onToggle: () =>
                setFilterStatus((prev) => (prev === 'recent' ? 'all' : 'recent')),
            }}
            darkCard={{
              label: isAr ? 'التأمين والصيدليات' : 'Sécurité & Chifa',
              badgeCount: totalDrugsPrescribed,
              badgeSuffix: isAr ? ' دواء' : ' lignes',
              valueCount: 100,
              valueSuffix: '%',
              caption: `${prescriptions.length} ${
                isAr ? 'وصفة موثقة بـ QR' : 'ordonnances validées QR'
              }`,
            }}
          />

          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'أرشيف الوصفات الطبية' : 'Registre des Ordonnances Médicales'}
              liveRegionText={`${sortedPrescriptions.length} ${isAr ? 'وصفة' : 'ordonnances'}`}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={
                isAr
                  ? 'بحث بمريض، دواء أو كود QR...'
                  : 'Rechercher patient, médicament ou QR code...'
              }
              statusValue={filterStatus}
              onStatusChange={(val) => setFilterStatus(val as 'all' | 'recent' | 'multi')}
              statusOptions={[
                {
                  value: 'all',
                  label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All',
                  count: prescriptions.length,
                },
                {
                  value: 'recent',
                  label: isAr ? 'حديثة' : isFr ? 'Récentes' : 'Recent',
                  count: recentCount,
                },
                {
                  value: 'multi',
                  label: isAr ? 'متعددة' : isFr ? 'Polymédic' : 'Multi',
                  count: multiCount,
                },
              ]}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterButtonRef}
              onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle
              onExport={handleExportCSV}
              activeChips={activeChips}
              onResetAllFilters={handleResetFilters}
            />

            <UniversalDataCollection
              hideToolbar
              items={sortedPrescriptions}
              keyExtractor={(rx) => rx.id}
              viewMode={viewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
              columns={columns}
              sortBy={sortBy}
              sortDirection={sortDir}
              onSortChange={(key, dir) => {
                setSortBy(key);
                setSortDir(dir);
              }}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              isPinned={(rx) => pinnedIds.has(rx.id)}
              onTogglePin={(rx) => handleTogglePin(rx.id)}
              openItemId={activeRx?.id ?? null}
              onItemClick={handleSelectRx}
              onViewDetails={handleSelectRx}
              bulkSecondaryAction={{
                label: isAr ? 'تصدير' : 'Exporter CSV',
                icon: <Download size={14} />,
                onClick: handleExportCSV,
              }}
              getRowMeta={(rx): KineticRowMeta => ({
                title: rx.patientName,
                subline: `${rx.qrCodeHash} · ${rx.prescribingDoctorName || rx.doctorName || 'Dr. Polyclinique'}`,
                avatarText: getInitials2(rx.patientName),
                categoryLabel: 'Chifa',
                statusLabel: 'Certifié Chifa',
                statusVariant: 'active',
                metricPrimary: `${rx.items.length} ${isAr ? 'أدوية' : 'spécialités'}`,
                metricSecondary: `${rx.items[0]?.drugName || 'Ordonnance'} · ${rx.prescriptionDate}`,
                isPinned: pinnedIds.has(rx.id),
                detailCol1: {
                  heading: isAr ? 'الطبيب' : 'Prescripteur',
                  primaryText: rx.prescribingDoctorName || rx.doctorName || 'Dr. Polyclinique',
                },
                detailCol2: { heading: 'Date', primaryText: rx.prescriptionDate },
                detailCol3: { heading: 'QR Hash', primaryText: rx.qrCodeHash },
              })}
              getFanActions={(rx): KineticRowFanAction<MedicalPrescription>[] => [
                {
                  id: 'print',
                  label: isAr ? 'طباعة' : 'Imprimer',
                  icon: <Printer size={13} />,
                  onClick: () => handlePrint(rx),
                },
                {
                  id: 'fiche',
                  label: isAr ? 'معاينة' : 'Aperçu',
                  icon: <FileText size={13} />,
                  onClick: () => handleSelectRx(rx),
                },
                {
                  id: 'pin',
                  label: pinnedIds.has(rx.id) ? 'Détacher' : 'Épingler',
                  icon: <Pin size={13} />,
                  onClick: () => handleTogglePin(rx.id),
                },
              ]}
              getDetailActions={(rx): KineticDetailAction[] => [
                {
                  id: 'print',
                  label: isAr ? 'طباعة' : 'Imprimer',
                  icon: <Printer size={14} />,
                  onClick: () => handlePrint(rx),
                },
                {
                  id: 'studio',
                  label: 'Studio',
                  icon: <Settings size={14} />,
                  onClick: () => setIsPersonalizerOpen(true),
                },
              ]}
              emptyTitle={isAr ? 'لا توجد وصفات' : 'Aucune ordonnance émise'}
              emptyDescription={
                isAr
                  ? 'قم بإنشاء فحص لتحرير وصفة'
                  : 'Prescrivez une ordonnance depuis un dossier patient'
              }
              primaryActionLabel={isAr ? 'وصفة جديدة' : 'Nouvelle Ordonnance'}
              onAddFirstItem={() => setIsComposerOpen(true)}
              onResetFilters={handleResetFilters}
              hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
            />
          </ScreenPod>

          <KineticFilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            triggerRef={filterButtonRef}
            language={language}
            displayCount={sortedPrescriptions.length}
            entityPluralLabel={isAr ? 'وصفة' : 'ordonnances'}
            hasActiveFilters={activeFiltersCount > 0}
            onResetFilters={handleResetFilters}
            sections={filterSections}
          />

          <KineticSlideOverInspector
            isOpen={!!activeRx}
            item={activeRx}
            allItems={sortedPrescriptions}
            keyExtractor={(rx) => rx.id}
            openerElement={drawerOpenerEl}
            language={language}
            title={activeRx?.patientName || ''}
            subtitle={activeRx ? `Réf: ${activeRx.qrCodeHash} · ${activeRx.prescriptionDate}` : ''}
            avatarText={activeRx ? getInitials2(activeRx.patientName) : 'RX'}
            avatarColor="#d4522f"
            categoryLabel={isAr ? 'وصفة طبية' : isFr ? 'ORDONNANCE CHIFA' : 'PRESCRIPTION'}
            branchName={
              activeRx
                ? resolveRecordBranch(activeRx, branchesById, currentBranch, language).name
                : ''
            }
            statusLabel={
              activeRx ? `${activeRx.items.length} ${isAr ? 'أدوية' : 'spécialités'}` : ''
            }
            statusClassName={MEMBER_PILL_OK}
            tabs={[
              { id: 'posologie', label: isAr ? 'الجرعات' : isFr ? 'Posologie' : 'Dosage' },
              { id: 'apercu', label: isAr ? 'الورق/الطباعة' : isFr ? 'Papier / Studio' : 'Studio' },
              { id: 'actions', label: isAr ? 'الأمان والإجراءات' : isFr ? 'QR & Actions' : 'QR & Actions' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectItem={(rx) => handleSelectRx(rx)}
            onClose={() => setInspectedRx(null)}
            renderBody={(rx, tab) => (
              <div className="space-y-5">
                {tab === 'posologie' && (
                  <>
                    <InspectorSection
                      title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}
                      index={0}
                    >
                      <InspectorQuickActions
                        actions={[
                          {
                            id: 'print',
                            label: isAr ? 'طباعة' : 'Imprimer PDF',
                            icon: <Printer size={15} />,
                            onClick: () => handlePrint(rx),
                          },
                          {
                            id: 'pin',
                            label: pinnedIds.has(rx.id) ? 'Détacher' : 'Épingler',
                            icon: <Pin size={15} />,
                            onClick: () => handleTogglePin(rx.id),
                          },
                          {
                            id: 'studio',
                            label: 'Studio',
                            icon: <Settings size={15} />,
                            onClick: () => setIsPersonalizerOpen(true),
                          },
                        ]}
                      />
                    </InspectorSection>

                    <InspectorSection
                      title={`Spécialités délivrées (${rx.items.length})`}
                      index={1}
                    >
                      <InspectorCard>
                        {rx.items.map((item, idx) => (
                          <InspectorListItem
                            key={idx}
                            title={`${idx + 1}. ${item.drugName}`}
                            subtitle={`${item.dosage} · ${item.frequency}${
                              item.instructions ? ` — "${item.instructions}"` : ''
                            }`}
                            metaRight={`${item.durationDays}j`}
                            isLast={idx === rx.items.length - 1}
                          />
                        ))}
                      </InspectorCard>
                    </InspectorSection>

                    {rx.notes && (
                      <InspectorSection
                        title="Recommandation Médicale"
                        index={2}
                      >
                        <InspectorCard>
                          <InspectorKeyValue label="Note" value={rx.notes} isLast />
                        </InspectorCard>
                      </InspectorSection>
                    )}
                  </>
                )}

                {tab === 'apercu' && (
                  <InspectorSection
                    title="Aperçu Papeterie & Studio"
                    index={0}
                  >
                    <InspectorCard>
                      <InspectorKeyValue
                        label="Format Document"
                        value={`${currentDoctorConfig.paperSize || currentDoctorConfig.paperFormat} · ${
                          currentDoctorConfig.usePreprintedStationery
                            ? 'Papier Pré-imprimé'
                            : 'Papier Vierge'
                        }`}
                        mono
                        isLast
                      />
                    </InspectorCard>
                    <div className="mt-2.5">
                      <InspectorWideButton
                        label="Configurer le Studio Ordonnance"
                        icon={<Settings size={14} />}
                        onClick={() => setIsPersonalizerOpen(true)}
                      />
                    </div>
                    <div
                      className={`printable-document mt-3 p-4 rounded-[var(--r-card,16px)] border bg-white text-black shadow-sm relative overflow-hidden text-[11px] font-sans ${
                        currentDoctorConfig.usePreprintedStationery
                          ? 'border-dashed border-amber-300'
                          : 'border-neutral-200'
                      }`}
                      style={{ minHeight: '340px' }}
                    >
                      {currentDoctorConfig.usePreprintedStationery ? (
                        <div className="border border-dashed border-amber-400 bg-amber-50/60 rounded-[var(--r-ctl-sm,10px)] p-2 text-center text-amber-800 text-[10px] mb-4">
                          <strong>Mode Papier En-tête Pré-imprimé Actif :</strong> L&apos;en-tête et le
                          pied de page sont masqués pour impression directe sur votre papeterie
                          physique d&apos;imprimerie.
                        </div>
                      ) : (
                        <div
                          className="border-b-2 pb-2 mb-3"
                          style={{ borderColor: currentDoctorConfig.accentColor || '#1e3a8a' }}
                        >
                          <div
                            className="font-bold text-sm"
                            style={{ color: currentDoctorConfig.accentColor || '#1e3a8a' }}
                          >
                            {currentDoctorConfig.doctorName}
                          </div>
                          <div className="text-[10px] text-black/75 font-medium">
                            {currentDoctorConfig.specialtyTitle}
                          </div>
                          <div className="text-[10px] text-black/55">
                            {currentDoctorConfig.qualifications ||
                              currentDoctorConfig.academicCredentials}{' '}
                            · N° Ordre:{' '}
                            {currentDoctorConfig.councilOrderNumber ||
                              currentDoctorConfig.licenseNumber}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline mb-4 text-[10px] bg-neutral-50 p-2 rounded-[var(--r-ctl-sm,10px)] border border-neutral-100">
                        <div>
                          Patient(e):{' '}
                          <strong className="text-xs uppercase">{rx.patientName}</strong>
                        </div>
                        <div className="font-mono text-black/55">Le : {rx.prescriptionDate}</div>
                      </div>
                      <div className="space-y-2 mb-6">
                        <div className="font-serif italic font-bold text-xs underline mb-1">
                          Ordonnance :
                        </div>
                        {rx.items.map((it, idx) => (
                          <div key={idx} className="pl-2 border-l-2 border-neutral-200 text-[11px]">
                            <div className="font-bold text-black">
                              - {it.drugName} ({it.dosage})
                            </div>
                            <div className="text-[10px] text-black/55 font-mono">
                              {it.frequency} pendant {it.durationDays} jours
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-end pt-4 border-t border-neutral-100 mt-6">
                        <div className="flex items-center gap-2">
                          <QrCode size={36} className="text-black/75" />
                          <div className="text-[10px] font-mono text-black/55 leading-tight">
                            ORD-CHIFA
                            <br />
                            {rx.qrCodeHash}
                          </div>
                        </div>
                        <div className="border border-rose-600 rounded-[var(--r-ctl-sm,10px)] p-1.5 text-center text-rose-700 rotate-[-4deg] opacity-85 text-[10px] font-mono leading-tight">
                          <div className="font-bold text-[10px]">
                            {currentDoctorConfig.digitalStampUrl ||
                              currentDoctorConfig.digitalStampText ||
                              'CACHET OFFICIEL'}
                          </div>
                          <div>{currentDoctorConfig.doctorName}</div>
                          <div>
                            {currentDoctorConfig.councilOrderNumber ||
                              currentDoctorConfig.licenseNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                  </InspectorSection>
                )}

                {tab === 'actions' && (
                  <>
                    <InspectorSection
                      title="Certification & Code QR Chifa"
                      index={0}
                    >
                      <div
                        data-sq="empty"
                        data-sq-border="dashed"
                        data-sq-stroke-w={2}
                        className="p-5 bg-white dark:bg-neutral-800 border-2 border-dashed border-[#d4522f]/40 flex flex-col items-center justify-center space-y-2.5 text-center mb-3"
                      >
                        <QrCode size={72} className="text-[#d4522f]" />
                        <div>
                          <div className="font-mono font-bold text-xs text-black dark:text-white">
                            {rx.qrCodeHash}
                          </div>
                          <span className="text-[10px] text-black/55 dark:text-white/55">
                            Signature numérique certifiée par l&apos;Ordre des Médecins
                          </span>
                        </div>
                      </div>
                      <InspectorCard>
                        <InspectorKeyValue
                          label="Conformité"
                          value="Chifa / CNAS Validée"
                        />
                        <InspectorKeyValue
                          label="Praticien"
                          value={rx.prescribingDoctorName || rx.doctorName || 'Dr. Polyclinique'}
                          isLast
                        />
                      </InspectorCard>
                    </InspectorSection>

                    <InspectorSection
                      title="Actions & Délivrance"
                      index={1}
                    >
                      <div className="space-y-2.5">
                        <InspectorWideButton
                          label="Imprimer ordonnance PDF"
                          icon={<Printer size={15} />}
                          tone="accent"
                          onClick={() => handlePrint(rx)}
                        />
                        <InspectorWideButton
                          label={pinnedIds.has(rx.id) ? 'Détacher' : 'Épingler au dossier'}
                          icon={<Pin size={15} />}
                          onClick={() => handleTogglePin(rx.id)}
                        />
                        <InspectorWideButton
                          label="Renouveler / Dupliquer traitement"
                          icon={<FileText size={15} />}
                          onClick={() =>
                            showToast({
                              type: 'success',
                              title: 'Renouvellement',
                              message: 'Ordonnance dupliquée avec succès',
                            })
                          }
                        />
                      </div>
                    </InspectorSection>
                  </>
                )}
              </div>
            )}
          />
        </>
      )}

      {isPersonalizerOpen && (
        <MedicalOrdonnancePersonalizerModal
          isOpen={isPersonalizerOpen}
          practitioners={practitioners}
          doctorConfigs={doctorConfigs}
          initialDoctorId={activeDoctorId}
          onSaveConfig={(docId, updated) => {
            updateDoctorConfig(docId, updated);
            setIsPersonalizerOpen(false);
            showToast({
              type: 'success',
              title: 'Studio Ordonnance',
              message: "Paramètres de l'ordonnance enregistrés",
            });
          }}
          onClose={() => setIsPersonalizerOpen(false)}
        />
      )}

      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="sq-elev-pop w-full max-w-2xl">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-850">
                <div className="flex items-center gap-2.5">
                  <div
                    data-sq="tile"
                    data-sq-border="none"
                    className="w-9 h-9 bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center"
                  >
                    <Pill size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-black dark:text-white">
                      Nouvelle Prescription Médicale Sécurisée
                    </h3>
                    <p className="text-[11px] text-black/55 dark:text-white/55">
                      Contrôle automatique des contre-indications et posologies Chifa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase mb-1">
                      Médecin Prescripteur
                    </label>
                    <div
                      data-sq="ctl"
                      data-sq-border="solid"
                      className="border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                    >
                      <select
                        value={compDoctorId}
                        onChange={(e) => setCompDoctorId(e.target.value)}
                        className="lbi-field w-full px-3 py-2 bg-transparent border-0 text-black dark:text-white"
                      >
                        {practitioners.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.fullName || doc.name} ({doc.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase mb-1">
                      Patient Destinataire
                    </label>
                    <div
                      data-sq="ctl"
                      data-sq-border="solid"
                      className="border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                    >
                      <select
                        value={compPatientId}
                        onChange={(e) => {
                          setCompPatientId(e.target.value);
                          setOverrideConfirmed(false);
                        }}
                        className="lbi-field w-full px-3 py-2 bg-transparent border-0 text-black dark:text-white"
                      >
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} (NSS: {p.nationalId || 'Chifa OK'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              {selectedPatientForComp && (
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-black/55 dark:text-white/55 uppercase font-semibold">
                      Vigilances du dossier
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black dark:text-white">
                        {selectedPatientForComp.bloodGroup || 'O+'} · {selectedPatientForComp.phone}
                      </span>
                    </div>
                  </div>
                  <div>
                    {selectedPatientForComp.allergies &&
                    selectedPatientForComp.allergies.length > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                        ⚠️ Allergies : {selectedPatientForComp.allergies.join(', ')}
                      </span>
                    ) : (
                      <span className="text-black/55 dark:text-white/55 text-[11px]">
                        Aucune allergie connue
                      </span>
                    )}
                  </div>
                </div>
              )}

              {allergyAlerts.length > 0 && (
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  data-sq-stroke-w={2}
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/80 text-rose-800 dark:text-rose-300 space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldAlert size={16} className="text-rose-600 animate-pulse" />
                    <span>ALERTE DE SÉCURITÉ PHARMACOLOGIQUE (CONTRE-INDICATION SÉVÈRE)</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px]">
                    {allergyAlerts.map((alt, i) => (
                      <li key={i} className="font-medium">
                        {alt}
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 pt-1 font-semibold text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConfirmed}
                      onChange={(e) => setOverrideConfirmed(e.target.checked)}
                      className="rounded-[var(--r-check,6px)] text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Je confirme en tant que médecin responsable avoir évalué le bénéfice/risque et
                      autorise la délivrance.
                    </span>
                  </label>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase">
                    Lignes de Prescription ({compItems.length})
                  </label>
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    onClick={() =>
                      setCompItems((prev) => [
                        ...prev,
                        {
                          drugName: '',
                          form: 'Comprimé',
                          dosage: '1 cp',
                          frequency: '2 fois par jour',
                          durationDays: 7,
                          instructions: 'Après repas',
                        },
                      ])
                    }
                    className="px-2.5 py-1 bg-[#d4522f] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} />
                    <span>Ajouter Médicament</span>
                  </button>
                </div>

                {compItems.map((item, idx) => (
                  <div
                    key={idx}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black/55 dark:text-white/55 text-xs w-4">
                        {idx + 1}.
                      </span>
                      <div
                        data-sq="ctl-sm"
                        data-sq-border="solid"
                        className="flex-1 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                      >
                        <input
                          type="text"
                          placeholder="Nom de spécialité / DCI (ex: Augmentin 1g, Inexium 20mg)..."
                          value={item.drugName}
                          onChange={(e) => {
                            const updated = [...compItems];
                            updated[idx] = { ...updated[idx], drugName: e.target.value };
                            setCompItems(updated);
                          }}
                          className="lbi-field w-full px-2.5 py-1.5 bg-transparent border-0 text-xs font-semibold"
                        />
                      </div>
                      {compItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCompItems(compItems.filter((_, i) => i !== idx))}
                          className="p-1 text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
                          aria-label="Supprimer ligne"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-black/55 dark:text-white/55">
                          Dosage
                        </label>
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="solid"
                          className="border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                        >
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) => {
                              const updated = [...compItems];
                              updated[idx] = { ...updated[idx], dosage: e.target.value };
                              setCompItems(updated);
                            }}
                            className="lbi-field w-full px-2 py-1 bg-transparent border-0 text-[11px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-black/55 dark:text-white/55">
                          Fréquence / Prise
                        </label>
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="solid"
                          className="border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                        >
                          <input
                            type="text"
                            value={item.frequency}
                            onChange={(e) => {
                              const updated = [...compItems];
                              updated[idx] = { ...updated[idx], frequency: e.target.value };
                              setCompItems(updated);
                            }}
                            className="lbi-field w-full px-2 py-1 bg-transparent border-0 text-[11px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-black/55 dark:text-white/55">
                          Durée (Jours)
                        </label>
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="solid"
                          className="border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                        >
                          <input
                            type="number"
                            value={item.durationDays}
                            onChange={(e) => {
                              const updated = [...compItems];
                              updated[idx] = {
                                ...updated[idx],
                                durationDays: parseInt(e.target.value, 10) || 1,
                              };
                              setCompItems(updated);
                            }}
                            className="lbi-field w-full px-2 py-1 bg-transparent border-0 text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase mb-1">
                  Recommandations au Patient
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                >
                  <textarea
                    value={compNotes}
                    onChange={(e) => setCompNotes(e.target.value)}
                    rows={2}
                    placeholder="Conseils hygiéno-diététiques, hydratation, repos..."
                    className="lbi-field w-full p-2.5 bg-transparent border-0 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-850">
              <span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                Code QR sécurisé généré automatiquement
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="ctl-sm"
                  data-sq-border="solid"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<ShieldCheck size={14} />}
                  onClick={handleSaveComposer}
                >
                  <span>Signer &amp; Valider l&apos;Ordonnance</span>
                </AtriumButton>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
