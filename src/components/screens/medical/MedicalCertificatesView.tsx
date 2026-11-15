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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { MedicalCertificateRecord } from '../../../types';
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
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const MedicalCertificatesView: React.FC<any> = () => {
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

  const { certificates, addCertificate, patients, practitioners } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [sortBy, setSortBy] = useState<string>('issueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());

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
      let cmp = 0;
      if (sortBy === 'patientName') cmp = a.patientName.localeCompare(b.patientName);
      else if (sortBy === 'certificateType') cmp = a.certificateType.localeCompare(b.certificateType);
      else if (sortBy === 'branch') cmp = getCertBranchName(a).localeCompare(getCertBranchName(b));
      else cmp = a.issueDate.localeCompare(b.issueDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredCertificates, sortBy, sortDir, getCertBranchName]);

  const handleSelectCert = useCallback(
    (cert: MedicalCertificateRecord, opener?: HTMLElement | null) => {
      if (opener) setDrawerOpenerEl(opener);
      setInspectedCert(cert);
    },
    []
  );

  const handleCreateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === selectedPatientId);
    const doctor = practitioners.find((p) => p.id === selectedDoctorId);
    let durationDays = 1;
    let resumptionDate = '';
    if (certType === 'ArretDeTravail') {
      const s = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - s.getTime());
      durationDays = Math.ceil(diffTime / 864e5) + 1;
      const r = new Date(end);
      r.setDate(r.getDate() + 1);
      if (r.getDay() === 5) r.setDate(r.getDate() + 2);
      else if (r.getDay() === 6) r.setDate(r.getDate() + 1);
      resumptionDate = r.toISOString().slice(0, 10);
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
    setIsCreateModalOpen(false);
    setInspectedCert(newCert);
    showToast({
      type: 'success',
      title: 'Certificat Officiel',
      message: `${getCertTypeLabel(certType)} généré pour ${newCert.patientName}`,
    });
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
          <div className="font-mono font-semibold text-xs text-black/75 dark:text-white/80">
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
            <div className="font-semibold text-xs text-black dark:text-white">
              {getCertTypeLabel(cert.certificateType)}
            </div>
            <div className="text-[11px] font-mono text-black/55 dark:text-white/55">
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
            <div className="font-bold text-xs text-black dark:text-white truncate">
              {cert.patientName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
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
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {getCertBranchName(cert)}
          </span>
        ),
      },
      {
        key: 'details',
        header: isAr ? 'التفاصيل' : 'Détails / Période',
        width: '2.2*',
        renderCell: (cert) => (
          <div className="text-xs">
            {cert.certificateType === 'ArretDeTravail' && (
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {cert.durationDays}j ({cert.startDate} → {cert.endDate})
              </span>
            )}
            {cert.certificateType === 'CertificatDescriptifITT' && (
              <span className="font-mono text-amber-600 font-bold">ITT: {cert.ittDays} jours</span>
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
        subtitle={`Conforme CNAS · ${certificates.length} ${isAr ? 'وثيقة' : 'certificats émis'}`}
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
          data={sortedCertificates}
          keyExtractor={(c) => c.id}
          defaultViewMode={viewMode}
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
          customActions={(cert) => [
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer size={13} />,
              variant: 'primary',
              onClick: () => setActivePrintCert(cert),
            },
          ]}
          renderCard={(cert) => (
            <div className="flex flex-col w-full space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#d4522f] truncate">
                  {getCertTypeLabel(cert.certificateType)}
                </span>
                <span className="font-mono text-[10px] text-black/55 dark:text-white/55">
                  {cert.issueDate}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-black dark:text-white truncate">
                  {cert.patientName}
                </h4>
                <p className="text-[11px] text-black/55 dark:text-white/55 truncate">
                  {cert.doctorName} · {cert.doctorSpecialty}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 text-xs">
                {cert.certificateType === 'ArretDeTravail' && (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {cert.durationDays} jours ({cert.startDate} → {cert.endDate})
                  </span>
                )}
                {cert.certificateType === 'CertificatDescriptifITT' && (
                  <span className="font-mono text-amber-600 font-bold">
                    ITT: {cert.ittDays} jours
                  </span>
                )}
                {(cert.certificateType === 'AptitudePhysique' ||
                  cert.certificateType === 'LettreOrientation') && (
                  <span className="text-black/70 dark:text-white/75 truncate block">
                    Objet: {cert.purpose}
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] font-mono text-black/55 dark:text-white/55">
                <span>{cert.qrHash}</span>
                <span className="text-emerald-600 font-bold">Signé ✓</span>
              </div>
            </div>
          )}
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
        avatarText={activeCert?.patientName?.charAt(0).toUpperCase() || 'C'}
        avatarColor="#0D9488"
        branchName={activeCert ? getCertBranchName(activeCert) : ''}
        statusLabel={activeCert?.isSigned ? 'Signé QR' : 'Brouillon'}
        tabs={[
          { id: 'overview', label: isAr ? 'التفاصيل' : 'Contenu' },
          { id: 'actions', label: isAr ? 'الطباعة' : 'Impression' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(cert) => handleSelectCert(cert)}
        onClose={() => setInspectedCert(null)}
        renderBody={(cert, tab) => (
          <div className="space-y-4 text-xs">
            {tab === 'overview' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Médecin Signataire :</span>
                    <span className="font-bold text-black dark:text-white">{cert.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Spécialité :</span>
                    <span className="font-semibold text-black dark:text-white">
                      {cert.doctorSpecialty}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Référence QR :</span>
                    <span className="font-mono font-bold text-[#d4522f]">{cert.qrHash}</span>
                  </div>
                  {cert.patientEmployer && (
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">Employeur :</span>
                      <span className="font-semibold text-black dark:text-white">
                        {cert.patientEmployer}
                      </span>
                    </div>
                  )}
                </div>

                {cert.certificateType === 'ArretDeTravail' && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold">Arrêt de travail : {cert.durationDays} jours</div>
                    <div className="font-mono text-[11px]">
                      Du {cert.startDate} au {cert.endDate} · Reprise : {cert.resumptionDate}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 italic text-black/80 dark:text-white/80">
                  &ldquo;{cert.clinicalFindings}&rdquo;
                </div>
              </div>
            )}

            {tab === 'actions' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActivePrintCert(cert)}
                  className="w-full p-3.5 rounded-xl bg-[#d4522f] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#b0674b] transition-colors cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Ouvrir &amp; Imprimer Certificat Officiel</span>
                </button>
              </div>
            )}
          </div>
        )}
      />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-[#33302D] flex items-center justify-between bg-[#F3EDE7] dark:bg-[#141312]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold">
                  <FileBadge size={20} />
                </div>
                <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  Établir un Certificat Médical
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 cursor-pointer"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateCertificate}
              className="p-6 space-y-4 overflow-y-auto max-h-[75vh]"
            >
              <LabelSelect
                label="Type de Certificat"
                value={certType}
                onChange={(val) =>
                  setCertType(
                    extractStr(val) as MedicalCertificateRecord['certificateType']
                  )
                }
                options={[
                  {
                    value: 'ArretDeTravail',
                    label: "Certificat d'Arrêt de Travail (CNAS)",
                  },
                  {
                    value: 'AptitudePhysique',
                    label: "Certificat d'Aptitude Physique & Sport",
                  },
                  {
                    value: 'CertificatDescriptifITT',
                    label: 'Certificat Médical Descriptif (avec ITT)',
                  },
                  {
                    value: 'LettreOrientation',
                    label: "Lettre d'Orientation / Liaison Confrère",
                  },
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Patient"
                  value={selectedPatientId}
                  onChange={(val) => setSelectedPatientId(extractStr(val))}
                  options={patients.map((p) => ({ value: p.id, label: p.fullName }))}
                />
                <LabelSelect
                  label="Médecin Signataire"
                  value={selectedDoctorId}
                  onChange={(val) => setSelectedDoctorId(extractStr(val))}
                  options={practitioners.map((p) => ({
                    value: p.id,
                    label: `${p.fullName} (${p.specialty})`,
                  }))}
                />
              </div>

              {certType === 'ArretDeTravail' && (
                <>
                  <LabelInput
                    label="Organisme Employeur / Entreprise du Patient"
                    value={patientEmployer}
                    onChange={(e) => setPatientEmployer(e.target.value)}
                    placeholder="ex: Sonatrach, Ministère, Société privée..."
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <LabelInput
                      label="Date de Début de l'Arrêt"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                    <LabelInput
                      label="Date de Fin (Inclus)"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  {(() => {
                    const diffDays =
                      Math.ceil(
                        Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) /
                          864e5
                      ) + 1;
                    if (diffDays > 30) {
                      return (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle
                              size={14}
                              className="shrink-0 text-amber-600 dark:text-amber-400"
                            />
                            <span>Avertissement Réglementaire CNAS ({diffDays} jours)</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Les arrêts de travail de plus de 30 jours consécutifs requièrent une
                            convocation et validation préalable de la commission médicale du contrôle
                            de la sécurité sociale (Art. 17 Loi 83-11).
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                        Durée calculée de l&apos;arrêt : <strong>{diffDays} jour(s)</strong>
                      </div>
                    );
                  })()}
                </>
              )}

              {certType === 'CertificatDescriptifITT' && (
                <LabelInput
                  label="Incapacité Totale de Travail (en jours)"
                  type="number"
                  value={String(ittDays)}
                  onChange={(e) => setIttDays(Number(e.target.value))}
                  required
                />
              )}

              {(certType === 'AptitudePhysique' || certType === 'LettreOrientation') && (
                <LabelInput
                  label="Objet / Destination du Certificat"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ex: Football amateur, Visite d'embauche, Référé pour avis cardiologique"
                  required
                />
              )}

              <div>
                <label className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-1">
                  Constatations Cliniques &amp; Mentions Légales
                </label>
                <textarea
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F3EDE7] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <AtriumButton
                  variant="ghost"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit" icon={<CheckCircle2 size={16} />}>
                  Générer le Document Officiel
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {activePrintCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-black w-full max-w-xl rounded-[28px] border border-neutral-300 shadow-2xl p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-[#d4522f] pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black uppercase text-[#d4522f] font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  {activePrintCert.doctorName}
                </h2>
                <p className="text-xs font-semibold text-black">
                  {activePrintCert.doctorSpecialty}
                </p>
                <p className="text-[10px] text-black/55">
                  Polyclinique El-Chifa · 14 Rue Didouche Mourad, Alger
                </p>
              </div>
              <div className="text-right text-[10px] font-mono text-black/55">
                <p className="font-bold text-black">RÉPUBLIQUE ALGÉRIENNE</p>
                <p>CERTIFICAT MÉDICAL OFFICIEL</p>
              </div>
            </div>

            <div className="text-center my-6">
              <span className="text-sm font-bold uppercase tracking-widest px-4 py-1.5 border-2 border-neutral-800 rounded-lg inline-block">
                {getCertTypeLabel(activePrintCert.certificateType)}
              </span>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-black">
              <p>
                Je soussigné, <strong>{activePrintCert.doctorName}</strong>, certifie avoir examiné
                ce jour le/la nommé(e) :
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1 font-mono">
                <p>
                  <strong>Nom &amp; Prénom :</strong> {activePrintCert.patientName}
                </p>
                {activePrintCert.patientDob && (
                  <p>
                    <strong>Date de naissance :</strong> {activePrintCert.patientDob}
                  </p>
                )}
                {activePrintCert.patientEmployer && (
                  <p>
                    <strong>Employeur :</strong> {activePrintCert.patientEmployer}
                  </p>
                )}
              </div>
              <p>Et déclare que son état de santé justifie les constatations suivantes :</p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 italic">
                &ldquo;{activePrintCert.clinicalFindings}&rdquo;
              </div>

              {activePrintCert.certificateType === 'ArretDeTravail' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold space-y-1">
                  <p>
                    En conséquence, je prescris un{' '}
                    <strong>ARRÊT DE TRAVAIL DE {activePrintCert.durationDays} JOURS</strong>.
                  </p>
                  <p className="text-[11px] font-normal">
                    Période : Du {activePrintCert.startDate} au {activePrintCert.endDate} inclus.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700">
                    Date de reprise effective du travail : {activePrintCert.resumptionDate}.
                  </p>
                </div>
              )}

              {activePrintCert.certificateType === 'CertificatDescriptifITT' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  Incapacité Totale de Travail (ITT) fixée à :{' '}
                  <strong>{activePrintCert.ittDays} jours</strong>, sous réserve de complications
                  ultérieures.
                </div>
              )}

              <p className="text-[11px] text-black/55 pt-2">
                Certificat délivré en mains propres à l&apos;intéressé(e) pour faire valoir ce que de
                droit.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-between items-end">
              <div className="flex items-center gap-3">
                <QrCode size={40} className="text-black" />
                <div className="text-[10px] font-mono text-black/55">
                  <p className="font-bold text-black/75">AUTHENTICITÉ VÉRIFIÉE</p>
                  <p>{activePrintCert.qrHash}</p>
                </div>
              </div>
              <div className="text-center w-36">
                <span className="text-[10px] text-black/55 block mb-1">Cachet &amp; Signature</span>
                <div className="w-32 h-16 border-2 border-dashed border-blue-600 rounded-lg p-1.5 flex flex-col justify-center items-center text-center rotate-[-3deg] text-blue-700 bg-blue-50/50">
                  <span className="text-[10px] font-black uppercase">
                    {activePrintCert.doctorName}
                  </span>
                  <span className="text-[10px] font-bold">
                    {activePrintCert.doctorSpecialty}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <AtriumButton variant="secondary" onClick={() => setActivePrintCert(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={() => window.print()}
                icon={<Printer size={15} />}
              >
                Lancer l&apos;Impression
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
