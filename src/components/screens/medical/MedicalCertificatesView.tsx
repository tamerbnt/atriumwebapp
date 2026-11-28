import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  Printer,
  QrCode,
  CheckCircle2,
  X,
  FileBadge,
  AlertTriangle,
  Download,
  Pin,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { useMedicalData } from './medicalData';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { MedicalCertificateRecord } from '../../../types';
import { computeArretDeTravailSchedule } from '../../../utils/medicalDepth';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
  KineticModalShell,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useRetainedModalValue,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'CM').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const MEMBER_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';

export const MedicalCertificatesView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const { certificates, addCertificate, patients, practitioners } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('issueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast({
          type: 'info',
          title: nowPinned ? (isAr ? 'تم التثبيت' : 'Certificat Épinglé') : (isAr ? 'تم إلغاء التثبيت' : 'Certificat Désépinglé'),
          message: nowPinned ? (isAr ? 'تم تثبيت الشهادة بالأعلى' : 'Document maintenu en tête') : (isAr ? 'تمت الإزالة من الأعلى' : 'Document retiré des épinglés'),
        });
        return next;
      });
    },
    [isAr]
  );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [inspectedCert, setInspectedCert] = useState<MedicalCertificateRecord | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePrintCert, setActivePrintCert] = useState<MedicalCertificateRecord | null>(null);

  const [certType, setCertType] = useState<MedicalCertificateRecord['certificateType']>('ArretDeTravail');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState(practitioners[0]?.id || '');
  const [patientEmployer, setPatientEmployer] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 432e6).toISOString().slice(0, 10));
  const [ittDays, setIttDays] = useState(5);
  const [purpose, setPurpose] = useState('Pratique sportive');
  const [clinicalFindings, setClinicalFindings] = useState(
    'Examen clinique compatible avec un repos médical strict.'
  );
  const [certFormError, setCertFormError] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const getCertBranchName = useCallback(
    (cert: MedicalCertificateRecord) => {
      const patient = patients.find((p) => p.id === cert.patientId);
      return resolveRecordBranch(patient || cert, branchesById, currentBranch, language).name;
    },
    [patients, branchesById, currentBranch, language]
  );

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    certificates.forEach((c) => {
      const bName = getCertBranchName(c);
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [certificates, getCertBranchName]);

  const activeCert = useMemo(() => {
    if (!inspectedCert) return null;
    return certificates.find((c) => c.id === inspectedCert.id) || null;
  }, [inspectedCert, certificates]);

  const arretCount = useMemo(
    () => certificates.filter((c) => c.certificateType === 'ArretDeTravail').length,
    [certificates]
  );
  const aptitudeCount = useMemo(
    () => certificates.filter((c) => c.certificateType === 'AptitudePhysique').length,
    [certificates]
  );
  const ittCount = useMemo(
    () => certificates.filter((c) => c.certificateType === 'CertificatDescriptifITT').length,
    [certificates]
  );

  const getCertTypeLabel = useCallback((type: MedicalCertificateRecord['certificateType'] | string) => {
    switch (type) {
      case 'ArretDeTravail':
        return 'Arrêt de Travail (CNAS)';
      case 'AptitudePhysique':
        return 'Aptitude Physique & Sport';
      case 'CertificatDescriptifITT':
        return 'Certificat Descriptif (ITT)';
      case 'LettreOrientation':
        return "Lettre d'Orientation Confrère";
      default:
        return type;
    }
  }, []);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      if (branchFilter !== 'All' && getCertBranchName(c) !== branchFilter) return false;
      if (selectedTypeFilter !== 'all' && c.certificateType !== selectedTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.patientName.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q) ||
          c.qrHash.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [certificates, branchFilter, selectedTypeFilter, searchQuery, getCertBranchName]);

  const sortedCertificates = useMemo(() => {
    const list = [...filteredCertificates];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'patientName') cmp = a.patientName.localeCompare(b.patientName);
      else if (sortBy === 'certificateType') cmp = a.certificateType.localeCompare(b.certificateType);
      else if (sortBy === 'branch') cmp = getCertBranchName(a).localeCompare(getCertBranchName(b));
      else cmp = a.issueDate.localeCompare(b.issueDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredCertificates, pinnedIds, sortBy, sortDir, getCertBranchName]);

  const handleSelectCert = useCallback(
    (cert: MedicalCertificateRecord, opener?: HTMLElement | null) => {
      if (opener) setDrawerOpenerEl(opener);
      setInspectedCert(cert);
      setInspectorTab('overview');
    },
    []
  );

  const handleCreateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    setCertFormError('');
    const patient = patients.find((p) => p.id === selectedPatientId);
    const doctor = practitioners.find((p) => p.id === selectedDoctorId);
    let durationDays: number | undefined;
    let resumptionDate: string | undefined;
    if (certType === 'ArretDeTravail') {
      const schedule = computeArretDeTravailSchedule(startDate, endDate);
      if (!schedule.ok) {
        const msg = schedule.errorMessage || "Dates d'arrêt de travail invalides.";
        setCertFormError(msg);
        showToast({
          type: 'error',
          title: isAr ? 'خطأ في التواريخ' : 'Plage de dates invalide',
          message: msg,
        });
        return;
      }
      durationDays = schedule.durationDays;
      resumptionDate = schedule.resumptionDate;
    }
    const newCert: MedicalCertificateRecord = {
      id: `cert_${Date.now()}`,
      certificateType: certType,
      patientId: selectedPatientId,
      patientName: patient?.fullName || 'Patient',
      patientDob: patient?.dateOfBirth,
      patientEmployer: certType === 'ArretDeTravail' ? patientEmployer : undefined,
      doctorId: selectedDoctorId,
      doctorName: doctor?.fullName || 'Dr. Praticien',
      doctorSpecialty: doctor?.specialty || 'Médecine Générale',
      issueDate: new Date().toISOString().slice(0, 10),
      startDate: certType === 'ArretDeTravail' ? startDate : undefined,
      endDate: certType === 'ArretDeTravail' ? endDate : undefined,
      durationDays: certType === 'ArretDeTravail' ? durationDays : undefined,
      resumptionDate: certType === 'ArretDeTravail' ? resumptionDate : undefined,
      ittDays: certType === 'CertificatDescriptifITT' ? ittDays : undefined,
      purpose:
        certType === 'AptitudePhysique' || certType === 'LettreOrientation'
          ? purpose
          : undefined,
      clinicalFindings,
      qrHash: `CERT-${certType.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}-DZ`,
      isSigned: true,
    };
    addCertificate(newCert);
    setCertFormError('');
    setIsCreateModalOpen(false);
    setInspectedCert(newCert);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Issue Date',
      'Type',
      'Patient',
      'Branch',
      'Doctor',
      'Specialty',
      'Duration / ITT / Purpose',
      'QR Hash',
    ];
    const rows = sortedCertificates.map((c) => [
      c.id,
      c.issueDate,
      getCertTypeLabel(c.certificateType),
      c.patientName,
      getCertBranchName(c),
      c.doctorName,
      c.doctorSpecialty,
      c.certificateType === 'ArretDeTravail'
        ? `${c.durationDays}j (${c.startDate} -> ${c.endDate})`
        : c.certificateType === 'CertificatDescriptifITT'
        ? `${c.ittDays}j ITT`
        : c.purpose || '',
      c.qrHash,
    ]);
    downloadCsvSafe(`medical_certificates_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تم التصدير' : isFr ? 'Export terminé' : 'Export Complete',
      message: isAr ? 'تم تصدير سجل الشهادات' : 'Registre des certificats exporté en CSV',
    });
  }, [sortedCertificates, getCertTypeLabel, getCertBranchName, isAr, isFr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTypeFilter('all');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount =
    (selectedTypeFilter !== 'all' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedTypeFilter !== 'all') {
      chips.push({
        key: 'type',
        label: getCertTypeLabel(selectedTypeFilter),
        onRemove: () => setSelectedTypeFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [selectedTypeFilter, branchFilter, getCertTypeLabel, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'type',
        label: isAr ? 'نوع الشهادة' : isFr ? 'Type de Certificat' : 'Certificate Type',
        value: selectedTypeFilter,
        resetValue: 'all',
        onChange: setSelectedTypeFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'all', label: isAr ? 'الكل' : 'Tous', count: certificates.length },
          { value: 'ArretDeTravail', label: 'Arrêts CNAS', count: arretCount },
          { value: 'AptitudePhysique', label: 'Aptitudes Sport', count: aptitudeCount },
          { value: 'CertificatDescriptifITT', label: 'Certificats ITT', count: ittCount },
          { value: 'LettreOrientation', label: 'Orientation Confrère' },
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
            count: certificates.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
    ],
    [
      selectedTypeFilter,
      branchFilter,
      certificates.length,
      arretCount,
      aptitudeCount,
      ittCount,
      branchCounts,
      isAr,
      isFr,
    ]
  );

  const columns: ColumnDefinition<MedicalCertificateRecord>[] = useMemo(
    () => [
      {
        key: 'issueDate',
        header: isAr ? 'التاريخ' : 'Date Émission',
        sortable: true,
        width: '1.3*',
        renderCell: (cert) => (
          <div className="tabular-nums font-semibold t-small text-black/75 dark:text-white/80">
            {cert.issueDate}
          </div>
        ),
      },
      {
        key: 'certificateType',
        header: isAr ? 'نوع الشهادة' : 'Type de Document',
        sortable: true,
        width: '2.2*',
        renderCell: (cert) => (
          <div>
            <div className="font-semibold t-small text-black dark:text-white">
              {getCertTypeLabel(cert.certificateType)}
            </div>
            <div className="t-cap tabular-nums text-black/55 dark:text-white/55">
              {cert.qrHash}
            </div>
          </div>
        ),
      },
      {
        key: 'patientName',
        header: isAr ? 'المريض' : 'Patient & Praticien',
        sortable: true,
        width: '2.2*',
        renderCell: (cert) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">
              {cert.patientName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {cert.doctorName} · {cert.doctorSpecialty}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        sortable: true,
        width: '1.5*',
        renderCell: (cert) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {getCertBranchName(cert)}
          </span>
        ),
      },
      {
        key: 'details',
        header: isAr ? 'التفاصيل' : 'Détails / Période',
        width: '2.2*',
        renderCell: (cert) => (
          <div className="t-cap">
            {cert.certificateType === 'ArretDeTravail' && (
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                {cert.durationDays}j ({cert.startDate} → {cert.endDate})
              </span>
            )}
            {cert.certificateType === 'CertificatDescriptifITT' && (
              <span className="tabular-nums text-amber-600 font-semibold">ITT: {cert.ittDays} jours</span>
            )}
            {(cert.certificateType === 'AptitudePhysique' ||
              cert.certificateType === 'LettreOrientation') && (
              <span className="text-black/70 dark:text-white/75 truncate block max-w-[180px]">
                Objet: {cert.purpose}
              </span>
            )}
          </div>
        ),
      },
    ],
    [getCertTypeLabel, getCertBranchName, isAr, isFr]
  );

  const retainedActivePrintCert = useRetainedModalValue(activePrintCert);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: certificates.length > 0,
  });

  if (showSkeleton && (certificates.length === 0 || networkMode === 'force_skeleton')) {
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
        icon={<FileBadge size={22} />}
        title={isAr ? 'الشهادات' : language === 'en' ? 'Certificates' : 'Certificats'}
        primaryAction={{
          label: isAr ? 'إصدار شهادة' : 'Établir un Certificat',
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => setIsCreateModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr ? 'نشاط الشهادات الطبية والتوقيع الرقمي' : 'Activité des Certifications Médicales'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'توقف عن العمل CNAS' : 'Arrêts de Travail CNAS',
          badgeText: 'Loi 83-11',
          count: arretCount,
          tone: 'terracotta',
          isActive: selectedTypeFilter === 'ArretDeTravail',
          onToggle: () =>
            setSelectedTypeFilter((prev) =>
              prev === 'ArretDeTravail' ? 'all' : 'ArretDeTravail'
            ),
        }}
        secondaryCard={{
          label: isAr ? 'شهادات الأهلية واللياقة' : 'Aptitudes Physiques',
          badgeText: isAr ? 'رياضة' : 'Sport & Travail',
          count: aptitudeCount,
          tone: 'emerald',
          isActive: selectedTypeFilter === 'AptitudePhysique',
          onToggle: () =>
            setSelectedTypeFilter((prev) =>
              prev === 'AptitudePhysique' ? 'all' : 'AptitudePhysique'
            ),
        }}
        darkCard={{
          label: isAr ? 'إجمالي الشهادات الموقعة' : 'Total Certificats Émis',
          badgeCount: ittCount,
          badgeSuffix: ' ITT',
          valueCount: certificates.length,
          valueSuffix: ' docs',
          caption: isAr ? '100% موقعة ومختومة بالـ QR' : '100% signés, horodatés & QR certifiés',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل الشهادات الطبية' : 'Registre des Certificats Officiels'}
          liveRegionText={`${sortedCertificates.length} ${isAr ? 'شهادة' : 'certificats'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Rechercher patient, médecin, QR hash..."
          statusValue={selectedTypeFilter}
          onStatusChange={setSelectedTypeFilter}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Tous', count: certificates.length },
            { value: 'ArretDeTravail', label: isAr ? 'توقف' : 'Arrêts', count: arretCount },
            { value: 'AptitudePhysique', label: isAr ? 'أهلية' : 'Aptitudes', count: aptitudeCount },
            { value: 'CertificatDescriptifITT', label: 'ITT', count: ittCount },
            { value: 'LettreOrientation', label: isAr ? 'توجيه' : 'Orientation' },
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
          items={sortedCertificates}
          keyExtractor={(c) => c.id}
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
          openItemId={activeCert?.id ?? null}
          onItemClick={handleSelectCert}
          onViewDetails={handleSelectCert}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير' : 'Exporter CSV',
            icon: <Download size={14} />,
            onClick: handleExportCSV,
          }}
          isPinned={(c) => pinnedIds.has(c.id)}
          onTogglePin={(c) => handleTogglePin(c.id)}
          getRowMeta={(cert): KineticRowMeta => ({
            isPinned: pinnedIds.has(cert.id),
            title: cert.patientName,
            subline: `${getCertTypeLabel(cert.certificateType)} · ${cert.qrHash}`,
            avatarText: getInitials2(cert.patientName),
            categoryLabel: getCertTypeLabel(cert.certificateType),
            statusLabel: cert.isSigned ? (isAr ? 'موقّع' : 'Signé QR') : isAr ? 'مسودة' : 'Brouillon',
            statusVariant: cert.isSigned ? 'active' : 'warning',
            metricPrimary:
              cert.certificateType === 'ArretDeTravail'
                ? `${cert.durationDays}j (${cert.startDate})`
                : cert.certificateType === 'CertificatDescriptifITT'
                ? `${cert.ittDays}j ITT`
                : cert.purpose || 'Aptitude',
            metricSecondary: `${cert.doctorName} · ${cert.issueDate}`,
            branchName: getCertBranchName(cert),
            detailCol1: { heading: isAr ? 'الطبيب' : 'Médecin', primaryText: cert.doctorName },
            detailCol2: { heading: isAr ? 'التاريخ' : 'Émission', primaryText: cert.issueDate },
            detailCol3: { heading: 'QR Hash', primaryText: cert.qrHash },
          })}
          getFanActions={(cert): KineticRowFanAction<MedicalCertificateRecord>[] => [
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer size={13} />,
              onClick: () => setActivePrintCert(cert),
            },
            {
              id: 'pin',
              label: pinnedIds.has(cert.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={13} className={pinnedIds.has(cert.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(cert.id),
            },
          ]}
          getDetailActions={(cert): KineticDetailAction[] => [
            {
              id: 'print',
              label: isAr ? 'طباعة الشهادة' : 'Imprimer',
              icon: <Printer size={14} />,
              onClick: () => setActivePrintCert(cert),
            },
            {
              id: 'pin',
              label: pinnedIds.has(cert.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={14} className={pinnedIds.has(cert.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(cert.id),
            },
          ]}
          emptyTitle={isAr ? 'لا توجد شهادات' : 'Aucun certificat émis'}
          emptyDescription="Établissez un nouveau certificat médical conforme CNAS"
          primaryActionLabel="Établir un Certificat"
          onAddFirstItem={() => setIsCreateModalOpen(true)}
          onResetFilters={handleResetFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedCertificates.length}
        entityPluralLabel={isAr ? 'شهادة' : 'certificats'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={!!activeCert}
        item={activeCert}
        allItems={sortedCertificates}
        keyExtractor={(c) => c.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeCert?.patientName || ''}
        subtitle={
          activeCert ? `${getCertTypeLabel(activeCert.certificateType)} · ${activeCert.issueDate}` : ''
        }
        avatarText={activeCert ? getInitials2(activeCert.patientName) : 'CM'}
        avatarColor="#d4522f"
        categoryLabel={isAr ? 'شهادة طبية' : isFr ? 'CERTIFICAT MÉDICAL' : 'MEDICAL CERTIFICATE'}
        branchName={activeCert ? getCertBranchName(activeCert) : ''}
        statusLabel={activeCert?.isSigned ? 'Signé QR' : 'Brouillon'}
        statusClassName={activeCert?.isSigned ? MEMBER_PILL_OK : MEMBER_PILL_WARN}
        tabs={[
          { id: 'overview', label: isAr ? 'التفاصيل' : isFr ? 'Contenu' : 'Overview' },
          { id: 'findings', label: isAr ? 'المعاينة السريرية' : isFr ? 'Constatations' : 'Clinical' },
          { id: 'actions', label: isAr ? 'الطباعة' : isFr ? 'Impression' : 'Print' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(cert) => handleSelectCert(cert)}
        onClose={() => setInspectedCert(null)}
        renderBody={(cert, tab) => (
          <div className="space-y-5">
            {tab === 'overview' && (
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
                        onClick: () => setActivePrintCert(cert),
                      },
                      {
                        id: 'export',
                        label: isAr ? 'تصدير CSV' : 'Exporter CSV',
                        icon: <Download size={15} />,
                        onClick: handleExportCSV,
                      },
                    ]}
                  />
                </InspectorSection>

                <InspectorSection
                  title={isAr ? 'الوثيقة الطبية' : 'Identification du Document'}
                  index={1}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'نوع الشهادة' : 'Type'}
                      value={getCertTypeLabel(cert.certificateType)}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الطبيب الموقع' : 'Médecin Signataire'}
                      value={`${cert.doctorName} (${cert.doctorSpecialty})`}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'تاريخ الإصدار' : 'Date d’émission'}
                      value={cert.issueDate}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'رمز التحقق QR' : 'Référence QR'}
                      value={cert.qrHash}
                      mono
                      isLast={!cert.patientEmployer}
                    />
                    {cert.patientEmployer && (
                      <InspectorKeyValue
                        label={isAr ? 'المستخدم' : 'Employeur'}
                        value={cert.patientEmployer}
                        isLast
                      />
                    )}
                  </InspectorCard>
                </InspectorSection>

                {cert.certificateType === 'ArretDeTravail' && (
                  <InspectorSection
                    title={isAr ? 'فترة التوقف عن العمل' : "Période d'Arrêt CNAS"}
                    index={2}
                  >
                    <InspectorCard>
                      <InspectorKeyValue
                        label={isAr ? 'المدة' : 'Durée'}
                        value={`${cert.durationDays} jours`}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'الفترة' : 'Période'}
                        value={`${cert.startDate} → ${cert.endDate}`}
                        mono
                      />
                      <InspectorKeyValue
                        label={isAr ? 'تاريخ الاستئناف' : 'Reprise effective'}
                        value={cert.resumptionDate || '—'}
                        mono
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                )}

                {cert.certificateType === 'CertificatDescriptifITT' && (
                  <InspectorSection
                    title="Incapacité Totale de Travail"
                    index={2}
                  >
                    <InspectorCard>
                      <InspectorKeyValue label="Durée ITT" value={`${cert.ittDays} jours`} mono isLast />
                    </InspectorCard>
                  </InspectorSection>
                )}
              </>
            )}

            {tab === 'findings' && (
              <InspectorSection
                title={isAr ? 'الملاحظات الطبية والختم الرقمي' : 'Constatations Cliniques & QR'}
                index={0}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'البيان السريري' : 'Constatations'}
                    value={`"${cert.clinicalFindings}"`}
                  />
                  {cert.purpose && (
                    <InspectorKeyValue label={isAr ? 'الغرض' : 'Objet'} value={cert.purpose} />
                  )}
                  <InspectorKeyValue
                    label={isAr ? 'الحالة القانونية' : 'Validité CNAS / MSPRH'}
                    value={cert.isSigned ? 'Signé, horodatée & QR vérifiable' : 'Brouillon'}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'actions' && (
              <InspectorSection
                title={isAr ? 'الطباعة الرسمية' : 'Impression & Archivage'}
                index={0}
              >
                <div className="space-y-2">
                  <InspectorWideButton
                    label={isAr ? 'فتح وطباعة الشهادة الرسمية' : 'Ouvrir & Imprimer Certificat Officiel'}
                    icon={<Printer size={15} />}
                    tone="accent"
                    onClick={() => setActivePrintCert(cert)}
                  />
                  <InspectorWideButton
                    label={isAr ? 'تصدير السجل CSV' : 'Exporter le Registre CSV'}
                    icon={<Download size={15} />}
                    onClick={handleExportCSV}
                  />
                </div>
              </InspectorSection>
            )}
          </div>
        )}
      />

      <KineticModalShell
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between bg-[#F5F1EC] dark:bg-[#22201E]">
                <div className="flex items-center gap-3">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                    <FileBadge size={20} />
                  </div>
                  <h2 className="t-card font-semibold text-black dark:text-white">
                    Établir un Certificat Médical
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

            <form
              onSubmit={handleCreateCertificate}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
                  Type de Certificat
                </label>
                <LiveSegmentedControl
                  size="sm"
                  fullWidth
                  value={certType}
                  onChange={(val) =>
                    setCertType(val as MedicalCertificateRecord['certificateType'])
                  }
                  options={[
                    { value: 'ArretDeTravail', label: 'Arrêt Travail' },
                    { value: 'AptitudePhysique', label: 'Aptitude Sport' },
                    { value: 'CertificatDescriptifITT', label: 'Descriptif ITT' },
                    { value: 'LettreOrientation', label: 'Orientation' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelSelect
                  field="selectedPatientId"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Patient"
                  value={selectedPatientId}
                  onChange={setSelectedPatientId}
                  options={patients.map((p) => ({ value: p.id, label: p.fullName }))}
                />
                <LabelSelect
                  field="selectedDoctorId"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Médecin Signataire"
                  value={selectedDoctorId}
                  onChange={setSelectedDoctorId}
                  options={practitioners.map((p) => ({
                    value: p.id,
                    label: `${p.fullName} (${p.specialty})`,
                  }))}
                />
              </div>

              {certType === 'ArretDeTravail' && (
                <>
                  <LabelInput
                    field="patientEmployer"
                    width="100%"
                    height={40}
                    corner={12}
                    label="Organisme Employeur / Entreprise du Patient"
                    value={patientEmployer}
                    onChange={setPatientEmployer}
                    placeholder="ex: Sonatrach, Ministère, Société privée..."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <LabelInput
                      field="startDate"
                      width="100%"
                      height={40}
                      corner={12}
                      label="Date de Début de l'Arrêt"
                      type="date"
                      value={startDate}
                      onChange={(v) => {
                        setStartDate(v);
                        setCertFormError('');
                      }}
                      required
                    />
                    <LabelInput
                      field="endDate"
                      width="100%"
                      height={40}
                      corner={12}
                      label="Date de Fin (Inclus)"
                      type="date"
                      value={endDate}
                      onChange={(v) => {
                        setEndDate(v);
                        setCertFormError('');
                      }}
                      required
                    />
                  </div>
                  {certFormError && (
                    <div data-sq="ctl" data-sq-border="none" className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 t-cap font-semibold flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{certFormError}</span>
                    </div>
                  )}
                  {(() => {
                    const schedule = computeArretDeTravailSchedule(startDate, endDate);
                    if (!schedule.ok) {
                      return (
                        <div data-sq="ctl" data-sq-border="none" className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 t-cap font-medium flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{schedule.errorMessage}</span>
                        </div>
                      );
                    }
                    const diffDays = schedule.durationDays || 1;
                    if (schedule.requiresCnasControlCommission) {
                      return (
                        <div data-sq="ctl" data-sq-border="none" className="p-3 bg-amber-500/10 text-amber-800 dark:text-amber-300 t-cap space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertTriangle
                              size={14}
                              className="shrink-0 text-amber-600 dark:text-amber-400"
                            />
                            <span>Avertissement Réglementaire CNAS ({diffDays} jours)</span>
                          </div>
                          <p className="t-cap leading-relaxed">
                            Les arrêts de travail de plus de 30 jours consécutifs requièrent une
                            convocation et validation préalable de la commission médicale du contrôle
                            de la sécurité sociale (Art. 17 Loi 83-11). Reprise prévue :{' '}
                            <strong className="tabular-nums">{schedule.resumptionDate}</strong>.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                        Durée calculée : <strong>{diffDays} jour(s)</strong> · Reprise du travail :{' '}
                        <strong>{schedule.resumptionDate}</strong>
                      </div>
                    );
                  })()}
                </>
              )}

              {certType === 'CertificatDescriptifITT' && (
                <LabelInput
                  field="ittDays"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Incapacité Totale de Travail (en jours)"
                  type="number"
                  value={String(ittDays)}
                  onChange={(v) => setIttDays(Number(v))}
                  required
                />
              )}

              {(certType === 'AptitudePhysique' || certType === 'LettreOrientation') && (
                <LabelInput
                  field="purpose"
                  width="100%"
                  height={40}
                  corner={12}
                  label="Objet / Destination du Certificat"
                  value={purpose}
                  onChange={setPurpose}
                  placeholder="ex: Football amateur, Visite d'embauche, Référé pour avis cardiologique"
                  required
                />
              )}

              <LabelTextarea
                field="clinicalFindings"
                width="100%"
                corner={12}
                label="Constatations Cliniques & Mentions Légales"
                value={clinicalFindings}
                onChange={setClinicalFindings}
                rows={3}
                required
              />

              <div className="pt-3 border-t border-[var(--atr-divider)] flex justify-end gap-2 items-center">
                <Button
                  tone="soft"
                  size={40}
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button tone="accent" size={40} type="submit" leading={<CheckCircle2 size={16} />}>
                  Générer le Document Officiel
                </Button>
              </div>
            </form>
          </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={Boolean(activePrintCert)}
        onClose={() => setActivePrintCert(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {retainedActivePrintCert && (
          <div className="printable-document bg-white text-black w-full rounded-[var(--r-panel,28px)] border border-black/[0.14] shadow-2xl p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-[#d4522f] pb-4 flex justify-between items-start">
              <div>
                <h2 className="t-pod font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  {retainedActivePrintCert.doctorName}
                </h2>
                <p className="t-small font-semibold text-black">
                  {retainedActivePrintCert.doctorSpecialty}
                </p>
                <p className="t-cap text-black/55">
                  Polyclinique El-Chifa · 14 Rue Didouche Mourad, Alger
                </p>
              </div>
              <div className="text-right t-cap tabular-nums text-black/55">
                <p className="font-semibold text-black">RÉPUBLIQUE ALGÉRIENNE</p>
                <p>CERTIFICAT MÉDICAL OFFICIEL</p>
              </div>
            </div>

            <div className="text-center my-6">
              <span className="t-label font-semibold px-4 py-2 border-2 border-black/80 rounded-[var(--r-ctl-sm,10px)] inline-block">
                {getCertTypeLabel(retainedActivePrintCert.certificateType)}
              </span>
            </div>

            <div className="space-y-4 t-cap leading-relaxed text-black">
              <p>
                Je soussigné, <strong>{retainedActivePrintCert.doctorName}</strong>, certifie avoir examiné
                ce jour le/la nommé(e) :
              </p>
              <div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-black/[0.12] space-y-1 tabular-nums">
                <p>
                  <strong>Nom &amp; Prénom :</strong> {retainedActivePrintCert.patientName}
                </p>
                {retainedActivePrintCert.patientDob && (
                  <p>
                    <strong>Date de naissance :</strong> {retainedActivePrintCert.patientDob}
                  </p>
                )}
                {retainedActivePrintCert.patientEmployer && (
                  <p>
                    <strong>Employeur :</strong> {retainedActivePrintCert.patientEmployer}
                  </p>
                )}
              </div>
              <p>Et déclare que son état de santé justifie les constatations suivantes :</p>
              <div className="p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-black/[0.12] italic">
                &ldquo;{retainedActivePrintCert.clinicalFindings}&rdquo;
              </div>

              {retainedActivePrintCert.certificateType === 'ArretDeTravail' && (
                <div className="p-3 rounded-[var(--r-ctl,12px)] bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold space-y-1">
                  <p>
                    En conséquence, je prescris un{' '}
                    <strong>ARRÊT DE TRAVAIL DE {retainedActivePrintCert.durationDays} JOURS</strong>.
                  </p>
                  <p className="t-cap font-normal">
                    Période : Du {retainedActivePrintCert.startDate} au {retainedActivePrintCert.endDate} inclus.
                  </p>
                  <p className="t-cap tabular-nums text-emerald-700">
                    Date de reprise effective du travail : {retainedActivePrintCert.resumptionDate}.
                  </p>
                </div>
              )}

              {retainedActivePrintCert.certificateType === 'CertificatDescriptifITT' && (
                <div className="p-3 rounded-[var(--r-ctl,12px)] bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  Incapacité Totale de Travail (ITT) fixée à :{' '}
                  <strong>{retainedActivePrintCert.ittDays} jours</strong>, sous réserve de complications
                  ultérieures.
                </div>
              )}

              <p className="t-cap text-black/55 pt-2">
                Certificat délivré en mains propres à l&apos;intéressé(e) pour faire valoir ce que de
                droit.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-black/[0.12] flex justify-between items-end">
              <div className="flex items-center gap-3">
                <QrCode size={40} className="text-black" />
                <div className="t-cap tabular-nums text-black/55">
                  <p className="font-semibold text-black/75">AUTHENTICITÉ VÉRIFIÉE</p>
                  <p>{retainedActivePrintCert.qrHash}</p>
                </div>
              </div>
              <div className="text-center w-36">
                <span className="t-cap text-black/55 block mb-1">Cachet &amp; Signature</span>
                <div className="w-32 h-16 border-2 border-dashed border-blue-600 rounded-[var(--r-ctl-sm,10px)] p-2 flex flex-col justify-center items-center text-center rotate-[-3deg] text-blue-700 bg-blue-50/50">
                  <span className="t-small font-semibold">
                    {retainedActivePrintCert.doctorName}
                  </span>
                  <span className="t-small font-semibold">
                    {retainedActivePrintCert.doctorSpecialty}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button tone="soft" size={40} type="button" onClick={() => setActivePrintCert(null)}>
                Fermer
              </Button>
              <Button
                tone="accent"
                size={40}
                onClick={() => window.print()}
                leading={<Printer size={15} />}
              >
                Lancer l&apos;Impression
              </Button>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};
