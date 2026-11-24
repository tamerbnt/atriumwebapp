import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  selectCurrentBranchFromState,
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentPmTalentsFromState,
  useAtriumActions,
} from '../../../services/store';
import { registerUndoEntry } from '../../../services/undoEngine';
import { PMTalent } from '../../../types/index';
import { ALGERIAN_WILAYAS, validateCcpAccount } from '../../../utils/algerianPtt';
import { MobilePhoneSimulator } from './MobilePhoneSimulator';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
import { useTranslation } from '../../../utils/useTranslation';
import {
  Users,
  Star,
  CheckCircle,
  Car,
  FileText,
  CreditCard,
  Plus,
  ExternalLink,
  Download,
  Pin,
  Phone,
  MapPin,
  ShieldCheck,
  PauseCircle,
} from 'lucide-react';
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
  InspectorProgressBar,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  KineticStatusVariant,
  ListAdvancedMenuButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface ProjectRhViewProps {
  initialTab?: 'talents' | 'dossier' | 'portal' | 'walkin';
}

const getTalentStatusBadge = (
  status: PMTalent['status'],
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  if (status === 'active') {
    return {
      label: isAr ? 'نشط' : 'Actif',
      variant: 'active',
      pillClass:
        'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]',
    };
  }
  if (status === 'paused') {
    return {
      label: isAr ? 'موقوف مؤقتاً' : 'En pause',
      variant: 'warning',
      pillClass:
        'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]',
    };
  }
  if (status === 'blacklisted') {
    return {
      label: isAr ? 'محظور' : 'Bloqué',
      variant: 'blocked',
      pillClass:
        'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]',
    };
  }
  return {
    label: isAr ? 'قيد المراجعة' : 'En révision',
    variant: 'info',
    pillClass:
      'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC]',
  };
};

export const ProjectRhView: React.FC<ProjectRhViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { currentBranch, branches, pmTalents, activePmSubScreen, isSyncing, networkMode, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      pmTalents: selectCurrentPmTalentsFromState(s),
      activePmSubScreen: s.activePmSubScreen || 'dashboard',
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const {
    addPmTalent,
    updatePmTalentStatus,
    batchUpdatePmTalentStatus,
    batchDeletePmTalents,
    setActivePmSubScreen,
    retryCloudSync,
  } = useAtriumActions();
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTab =
    activePmSubScreen === 'dossier' || initialTab === 'dossier'
      ? 'dossier'
      : activePmSubScreen === 'portal' || initialTab === 'portal'
      ? 'portal'
      : activePmSubScreen === 'walkin' || initialTab === 'walkin'
      ? 'walkin'
      : 'talents';

  const setActiveTab = useCallback(
    (tab: string) => {
      setActivePmSubScreen(tab);
    },
    [setActivePmSubScreen]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mobilityFilter, setMobilityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  const [selectedTalent, setSelectedTalent] = useState<PMTalent | null>(pmTalents[0] || null);
  const [inspectedTalent, setInspectedTalent] = useState<PMTalent | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState('overview');
  const [notesByTalent, setNotesByTalent] = useState<Record<string, string>>({});

  const [selectedTalentIds, setSelectedTalentIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedTalentIds, setPinnedTalentIds] = useState<Set<string>>(() => new Set<string>());
  const [talentSortBy, setTalentSortBy] = useState('talent');
  const [talentSortDir, setTalentSortDir] = useState<'asc' | 'desc'>('asc');

  const [fullName, setFullName] = useState('');
  const [gender] = useState<'Male' | 'Female'>('Female');
  const [age, setAge] = useState('22');
  const [phone, setPhone] = useState('+213 ');
  const [email] = useState('');
  const [wilayaCode, setWilayaCode] = useState('16');
  const [commune, setCommune] = useState('Bab Ezzouar');
  const [hasDriverLicense] = useState(true);
  const [isVehicleOwner] = useState(false);
  const [ccpNumber, setCcpNumber] = useState('0012345678');
  const [ccpKey, setCcpKey] = useState('45');
  const [desiredRoles] = useState(['Animator']);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  );
  const [formSubmittedSuccess, setFormSubmittedSuccess] = useState(false);

  const activeInspectedTalent = useMemo(() => {
    if (!inspectedTalent) return null;
    return pmTalents.find((item) => item.id === inspectedTalent.id) || null;
  }, [inspectedTalent, pmTalents]);

  const activeCount = useMemo(
    () => pmTalents.filter((item) => item.status === 'active').length,
    [pmTalents]
  );

  const filteredTalents = useMemo(() => {
    return pmTalents.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.phone.includes(searchTerm) ||
        item.ccpNumber.includes(searchTerm) ||
        item.wilayaName.toLowerCase().includes(q);
      const matchesWilaya = selectedWilaya === 'all' || item.wilayaCode === selectedWilaya;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesMobility =
        mobilityFilter === 'All' ||
        (mobilityFilter === 'license' && item.hasDriverLicense) ||
        (mobilityFilter === 'vehicle' && item.isVehicleOwner);
      return matchesSearch && matchesWilaya && matchesStatus && matchesMobility;
    });
  }, [pmTalents, searchTerm, selectedWilaya, statusFilter, mobilityFilter]);

  const sortedTalents = useMemo(() => {
    return [...filteredTalents].sort((a, b) => {
      const aPinned = pinnedTalentIds.has(a.id);
      const bPinned = pinnedTalentIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (talentSortBy === 'talent') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return talentSortDir === 'asc' ? cmp : -cmp;
      }
      if (talentSortBy === 'score') {
        return talentSortDir === 'asc'
          ? a.consolidatedScore - b.consolidatedScore
          : b.consolidatedScore - a.consolidatedScore;
      }
      return 0;
    });
  }, [filteredTalents, pinnedTalentIds, talentSortBy, talentSortDir]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (selectedWilaya !== 'all') c += 1;
    if (statusFilter !== 'All') c += 1;
    if (mobilityFilter !== 'All') c += 1;
    return c;
  }, [selectedWilaya, statusFilter, mobilityFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: getTalentStatusBadge(statusFilter as PMTalent['status'], language).label,
        onRemove: () => setStatusFilter('All'),
      });
    }
    if (selectedWilaya !== 'all') {
      const w = ALGERIAN_WILAYAS.find((item) => item.code === selectedWilaya);
      chips.push({
        key: 'wilaya',
        label: w ? `${w.code} - ${w.nameFr}` : selectedWilaya,
        onRemove: () => setSelectedWilaya('all'),
      });
    }
    if (mobilityFilter !== 'All') {
      chips.push({
        key: 'mobility',
        label: mobilityFilter === 'vehicle' ? 'Véhiculé' : 'Permis B',
        onRemove: () => setMobilityFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, selectedWilaya, mobilityFilter, language]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedWilaya('all');
    setStatusFilter('All');
    setMobilityFilter('All');
  }, []);

  const wilayaFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    pmTalents.forEach((item) => {
      counts.set(item.wilayaCode, (counts.get(item.wilayaCode) || 0) + 1);
    });
    return [
      { value: 'all', label: isAr ? 'الكل (58 ولاية)' : 'Toutes (58 Wilayas)', count: pmTalents.length },
      { value: '16', label: '16 - Alger', count: counts.get('16') || 0 },
      { value: '31', label: '31 - Oran', count: counts.get('31') || 0 },
      { value: '25', label: '25 - Constantine', count: counts.get('25') || 0 },
      { value: '19', label: '19 - Sétif', count: counts.get('19') || 0 },
      { value: '09', label: '09 - Blida', count: counts.get('09') || 0 },
    ];
  }, [pmTalents, isAr]);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة الحساب' : 'Statut Animateur',
        value: statusFilter,
        resetValue: 'All',
        onChange: setStatusFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: pmTalents.length },
          { value: 'active', label: isAr ? 'نشط' : 'Actifs', count: activeCount },
          {
            value: 'paused',
            label: isAr ? 'موقوف' : 'En pause',
            count: pmTalents.filter((x) => x.status === 'paused').length,
          },
          {
            value: 'in_review',
            label: isAr ? 'مراجعة' : 'Révision',
            count: pmTalents.filter((x) => x.status === 'in_review').length,
          },
        ],
      },
      {
        id: 'mobility',
        kind: 'segmented',
        label: isAr ? 'التنقل' : 'Mobilité Terrain',
        value: mobilityFilter,
        resetValue: 'All',
        onChange: setMobilityFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'license', label: 'Permis B' },
          { value: 'vehicle', label: 'Véhiculé' },
        ],
      },
      {
        id: 'wilaya',
        kind: 'tiles',
        label: isAr ? 'الولاية' : 'Wilaya',
        value: selectedWilaya,
        resetValue: 'all',
        onChange: setSelectedWilaya,
        options: wilayaFilterOptions,
      },
    ],
    [isAr, statusFilter, mobilityFilter, selectedWilaya, pmTalents, activeCount, wilayaFilterOptions]
  );

  const handleTogglePin = useCallback((talent: PMTalent) => {
    setPinnedTalentIds((prev) => {
      const next = new Set(prev);
      const wasPinned = next.has(talent.id);
      if (wasPinned) next.delete(talent.id);
      else next.add(talent.id);
      showToast(
        wasPinned ? `${talent.fullName} désépinglé` : `${talent.fullName} épinglé en tête`,
        'info'
      );
      return next;
    });
  }, []);

  const handleSelectTalent = useCallback((talent: PMTalent, originEl?: HTMLElement | null) => {
    if (originEl) setDrawerOpenerEl(originEl);
    setSelectedTalent(talent);
    setInspectedTalent(talent);
    setInspectorTab('overview');
  }, []);

  const handleCreateTalent = (e: React.FormEvent, source: 'portal' | 'walkin') => {
    e.preventDefault();
    const wilayaObj = ALGERIAN_WILAYAS.find((w) => w.code === wilayaCode);
    const ccpCheck = validateCcpAccount(ccpNumber, ccpKey);
    if (!ccpCheck.isValid) {
      showToast({
        title: t('pm_rh_ccp_error_title'),
        message: t('pm_rh_ccp_error_msg', { error: ccpCheck.error }),
        type: 'warning',
      });
      return;
    }
    addPmTalent({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      fullName,
      gender,
      birthDate: '2002-01-01',
      age: Number(age) || 22,
      phone,
      email: email || undefined,
      wilayaCode,
      wilayaName: wilayaObj?.nameFr || 'Alger',
      commune,
      hasDriverLicense,
      isVehicleOwner,
      desiredRoles,
      languages: ['Arabic', 'French'],
      portraitPhotoUrl: photoUrl,
      ccpNumber,
      ccpKey,
      initialHrScore: 4.5,
      averageMissionRating: 4.8,
      completedMissionsCount: 0,
      absencesCount: 0,
      isHrVerified: source === 'walkin',
      status: 'active',
      hrNotes:
        source === 'walkin'
          ? "Candidat reçu directement à l'agence."
          : 'Pré-inscription portail en ligne.',
    });
    setFormSubmittedSuccess(true);
    setTimeout(() => {
      setFormSubmittedSuccess(false);
      setFullName('');
      setActiveTab('talents');
    }, 1500);
  };

  const handleExportTalents = useCallback(() => {
    const headers = [
      'Nom & Prénom',
      'Wilaya',
      'Commune',
      'Téléphone',
      'N° CCP',
      'Clé',
      'Score Global',
      'Statut',
    ];
    const rows = sortedTalents.map((item) => [
      item.fullName,
      item.wilayaName,
      item.commune,
      item.phone,
      item.ccpNumber,
      item.ccpKey,
      item.consolidatedScore,
      item.status,
    ]);
    downloadCsvSafe(
      `repertoire_equipe_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast('Répertoire équipe exporté en CSV', 'info');
  }, [sortedTalents]);

  const talentColumns = useMemo<ColumnDefinition<PMTalent>[]>(
    () => [
      {
        key: 'talent',
        header: t('pm_rh_col_talent'),
        width: '2.5*',
        minWidth: '220px',
        sortable: true,
        renderCell: (talent) => (
          <div className="flex items-center gap-3">
            <img
              src={talent.portraitPhotoUrl}
              alt={talent.fullName}
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover shrink-0 bg-[#F3EDE7] dark:bg-[#2B2825]"
            />
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{talent.fullName}</div>
              <span className="t-cap text-black/55 dark:text-white/55 truncate block">
                {talent.phone}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'location',
        header: t('pm_rh_col_location'),
        width: '1.8*',
        minWidth: '140px',
        renderCell: (talent) => (
          <div>
            <div className="font-semibold text-black dark:text-white">{talent.wilayaName}</div>
            <span className="t-cap text-black/55 dark:text-white/55">{talent.commune}</span>
          </div>
        ),
      },
      {
        key: 'ccp',
        header: t('pm_rh_col_ccp'),
        width: '1.8*',
        minWidth: '140px',
        renderCell: (talent) => (
          <div className="tabular-nums font-semibold text-black/70 dark:text-white/75">
            <div>{talent.ccpNumber}</div>
            <span className="t-cap text-black/55 dark:text-white/55">Clé: {talent.ccpKey}</span>
          </div>
        ),
      },
      {
        key: 'score',
        header: t('pm_rh_col_consolidated_score'),
        width: '1.5*',
        minWidth: '130px',
        sortable: true,
        renderCell: (talent) => (
          <div className="text-center">
            <div className="inline-flex items-center gap-1 font-semibold text-amber-500 tabular-nums">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{talent.consolidatedScore}</span>
            </div>
            <span className="t-cap text-black/55 dark:text-white/55 block font-normal">
              {talent.completedMissionsCount} missions
            </span>
          </div>
        ),
      },
      {
        key: 'mobility',
        header: t('pm_rh_col_mobility'),
        width: '1.5*',
        minWidth: '120px',
        renderCell: (talent) => (
          <div className="space-y-0.5">
            {talent.hasDriverLicense && (
              <span className="inline-block px-2 py-1 rounded-[var(--r-check,6px)] bg-[#F3EDE7] dark:bg-[#2B2825] t-small font-semibold text-black/70 dark:text-white/75 mr-1">
                Permis B
              </span>
            )}
            {talent.isVehicleOwner && (
              <span className="inline-block px-2 py-1 rounded-[var(--r-check,6px)] bg-blue-100 dark:bg-blue-950/60 t-small font-semibold text-blue-700 dark:text-blue-300">
                Véhiculé
              </span>
            )}
          </div>
        ),
      },
    ],
    [t]
  );

  const getRowMeta = useCallback(
    (talent: PMTalent): KineticRowMeta => {
      const badge = getTalentStatusBadge(talent.status, language);
      const branch = resolveRecordBranch(talent, branchesById, currentBranch, language);
      return {
        title: talent.fullName,
        subline: `${talent.wilayaName} (${talent.commune}) · ${talent.phone}`,
        avatarText: talent.fullName
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        categoryLabel: talent.desiredRoles[0] || 'Animateur',
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: `★ ${talent.consolidatedScore}`,
        metricSecondary: `CCP ${talent.ccpNumber} (${talent.ccpKey})`,
        branchName: branch.name,
        isPinned: pinnedTalentIds.has(talent.id),
        detailCol1: {
          heading: 'Compte CCP PTT',
          primaryText: `${talent.ccpNumber} · Clé ${talent.ccpKey}`,
        },
        detailCol2: {
          heading: 'Mobilité',
          primaryText: `${talent.hasDriverLicense ? 'Permis B' : 'Sans permis'} · ${
            talent.isVehicleOwner ? 'Véhiculé' : 'Non véhiculé'
          }`,
        },
        detailCol3: {
          heading: 'Missions',
          primaryText: `${talent.completedMissionsCount} réalisées`,
        },
      };
    },
    [language, branchesById, currentBranch, pinnedTalentIds]
  );

  const getFanActions = useCallback(
    (talent: PMTalent): KineticRowFanAction<PMTalent>[] => [
      {
        id: 'dossier',
        label: 'Dossier',
        icon: <FileText size={13} />,
        onClick: () => {
          setSelectedTalent(talent);
          setActiveTab('dossier');
        },
      },
      {
        id: 'toggle',
        label: talent.status === 'active' ? 'Suspendre' : 'Activer',
        icon: talent.status === 'active' ? <PauseCircle size={13} /> : <CheckCircle size={13} />,
        onClick: () => {
          const next = talent.status === 'active' ? 'paused' : 'active';
          updatePmTalentStatus(talent.id, next);
        },
      },
      {
        id: 'pin',
        label: pinnedTalentIds.has(talent.id) ? 'Détacher' : 'Épingler',
        icon: <Pin size={13} />,
        onClick: () => handleTogglePin(talent),
      },
    ],
    [pinnedTalentIds, updatePmTalentStatus, handleTogglePin, setActiveTab]
  );

  const getDetailActions = useCallback(
    (talent: PMTalent): KineticDetailAction[] => [
      {
        id: 'dossier',
        label: 'Dossier Complet',
        icon: <FileText size={14} />,
        onClick: () => {
          setSelectedTalent(talent);
          setInspectedTalent(null);
          setActiveTab('dossier');
        },
      },
      {
        id: 'toggle',
        label: talent.status === 'active' ? 'Suspendre' : 'Activer',
        icon: <CheckCircle size={14} />,
        onClick: () => {
          const next = talent.status === 'active' ? 'paused' : 'active';
          updatePmTalentStatus(talent.id, next);
        },
      },
    ],
    [updatePmTalentStatus, setActiveTab]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmTalents.length > 0,
  });

  if (showSkeleton && (pmTalents.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '140px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.2*', minWidth: '110px' },
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
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Users size={22} />}
        title={
          activeTab === 'talents'
            ? t('pm_rh_title_talents')
            : activeTab === 'dossier'
            ? t('pm_rh_title_dossier', { name: selectedTalent?.fullName || 'Sélection' })
            : activeTab === 'portal'
            ? t('pm_rh_title_portal')
            : t('pm_rh_title_walkin')
        }
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="md"
            icon={<Download size={15} />}
            onClick={handleExportTalents}
          >
            {t('pm_rh_btn_export_excel')}
          </AtriumButton>
        }
        primaryAction={{
          label: t('pm_rh_btn_new_candidate'),
          onClick: () => setActiveTab('walkin'),
          dataAction: 'add-talent',
        }}
      />

      <div className="flex border-b border-[var(--atr-divider)] gap-1 overflow-x-auto">
        {[
          { id: 'talents', label: isAr ? 'دليل الفريق' : isEn ? 'Team Pool' : 'Répertoire Équipe', icon: Users, count: pmTalents.length },
          {
            id: 'dossier',
            label: selectedTalent ? `Dossier: ${selectedTalent.fullName}` : 'Dossier Candidat',
            icon: FileText,
          },
          { id: 'portal', label: isAr ? 'بوابة التسجيل' : isEn ? 'Mobile Portal' : 'Portail Candidature Mobile', icon: ExternalLink },
          { id: 'walkin', label: isAr ? 'تسجيل حضوري' : isEn ? 'Walk-In Intake' : 'Enrôlement Walk-In', icon: Plus },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 border-b-2 font-medium t-small whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                  : 'border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-1 rounded-full t-small tabular-nums font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ScreenKpiBanner
        heading={isAr ? 'الموارد البشرية والطاقم الميداني' : isEn ? 'Human Resources & Field Pool' : 'Ressources Humaines & Équipe Terrain'}
        language={language}
        primaryCard={{
          label: isAr ? 'الطاقم النشط والمتاح' : isEn ? 'Active Profiles' : 'Profils Actifs & Disponibles',
          badgeText: isAr ? 'موثق إدارياً' : 'Certifiés RH',
          count: activeCount,
          tone: 'emerald',
          isActive: statusFilter === 'active' && activeTab === 'talents',
          onToggle: () => {
            setActiveTab('talents');
            setStatusFilter((prev) => (prev === 'active' ? 'All' : 'active'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'إجمالي المسجلين' : isEn ? 'Total Enrolled' : 'Total Enrôlé (58 Wilayas)',
          badgeText: isAr ? 'متوقف' : 'en pause',
          count: pmTalents.filter((x) => x.status === 'paused').length,
          formatValue: () => String(pmTalents.length),
          tone: 'terracotta',
          isActive: statusFilter === 'paused' && activeTab === 'talents',
          onToggle: () => {
            setActiveTab('talents');
            setStatusFilter((prev) => (prev === 'paused' ? 'All' : 'paused'));
          },
        }}
        darkCard={{
          label: isAr ? 'شبكة الأجور CCP' : isEn ? 'Banked Payroll Grid' : 'Grille Paie Bancarisée CCP',
          badgeCount: 1,
          badgePrefix: 'PTT SFP 0',
          badgeSuffix: '',
          valueCount: 100,
          valuePrefix: '',
          valueSuffix: '%',
          caption: isAr ? 'حسابات ومفاتيح CCP موثقة' : 'Comptes CCP & Clés RIP vérifiés',
        }}
      />

      {activeTab === 'talents' && (
        <>
          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'قاعدة بيانات المنشطين والمضيفين' : isEn ? 'Talent Directory' : 'Répertoire des Animateurs & Hôtesses'}
              liveRegionText={`${sortedTalents.length} profils`}
              language={language}
              searchQuery={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder={t('pm_rh_search_ph')}
              statusOptions={[
                { value: 'All', label: isAr ? 'الكل' : 'Tous', count: pmTalents.length },
                { value: 'active', label: isAr ? 'نشط' : 'Actifs', count: activeCount },
                {
                  value: 'paused',
                  label: isAr ? 'موقوف' : 'En pause',
                  count: pmTalents.filter((x) => x.status === 'paused').length,
                },
              ]}
              statusValue={statusFilter}
              onStatusChange={setStatusFilter}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterBtnRef}
              onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle
              onExport={handleExportTalents}
              activeChips={activeChips}
              onResetAllFilters={resetFilters}
            />

            <UniversalDataCollection<PMTalent>
              hideToolbar
              items={sortedTalents}
              keyExtractor={(item) => item.id}
              viewMode={viewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
              columns={talentColumns}
              sortBy={talentSortBy}
              sortDirection={talentSortDir}
              onSortChange={(key, dir) => {
                setTalentSortBy(key);
                setTalentSortDir(dir);
              }}
              selectedIds={selectedTalentIds}
              onSelectionChange={setSelectedTalentIds}
              openItemId={activeInspectedTalent?.id ?? null}
              isPinned={(item) => pinnedTalentIds.has(item.id)}
              onTogglePin={handleTogglePin}
              onItemClick={handleSelectTalent}
              onViewDetails={handleSelectTalent}
              bulkSecondaryAction={{
                label: 'Activer Profils',
                icon: <CheckCircle size={14} />,
                onClick: (ids) => {
                  batchUpdatePmTalentStatus(Array.from(ids), 'active');
                  setSelectedTalentIds(new Set<string>());
                },
              }}
              onBulkDelete={(ids) => {
                batchDeletePmTalents(Array.from(ids));
                setSelectedTalentIds(new Set<string>());
                if (activeInspectedTalent && ids.has(activeInspectedTalent.id)) {
                  setInspectedTalent(null);
                }
              }}
              getRowMeta={getRowMeta}
              getFanActions={getFanActions}
              getDetailActions={getDetailActions}
              emptyTitle={t('pm_rh_no_talents') || 'Aucun talent trouvé'}
              emptyDescription="Essayez de modifier votre filtre par wilaya ou vos termes de recherche."
              primaryActionLabel={t('pm_rh_btn_new_candidate')}
              onAddFirstItem={() => setActiveTab('walkin')}
              onResetFilters={resetFilters}
              hasActiveFilters={searchTerm.length > 0 || activeFiltersCount > 0}
              renderCard={(talent) => (
                <div className="flex flex-col items-center justify-center w-full">
                  <img
                    src={talent.portraitPhotoUrl}
                    alt={talent.fullName}
                    width={96}
                    height={96}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 rounded-full object-cover shadow-md mb-4 bg-[#F3EDE7] dark:bg-[#2B2825]"
                  />
                  <h3 className="t-card font-semibold text-black dark:text-white truncate max-w-[210px] mb-1">
                    {talent.fullName}
                  </h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full t-small font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75 mb-2 truncate max-w-[200px]">
                    {talent.wilayaName} ({talent.commune})
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-amber-500 tabular-nums t-label mb-3">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{talent.consolidatedScore}</span>
                    <span className="t-cap text-black/55 dark:text-white/55 font-normal ml-1">
                      · {talent.completedMissionsCount} missions
                    </span>
                  </div>
                  <div className="w-full pt-3 border-t border-[var(--atr-divider)] t-cap space-y-2 text-center">
                    <div className="tabular-nums text-black/70 dark:text-white/75 t-cap">
                      CCP: {talent.ccpNumber} (Clé: {talent.ccpKey})
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {talent.hasDriverLicense && (
                        <span className="px-2 py-1 rounded-[var(--r-check,6px)] bg-[#F3EDE7] dark:bg-[#2B2825] t-small font-semibold text-black/70 dark:text-white/75">
                          Permis B
                        </span>
                      )}
                      {talent.isVehicleOwner && (
                        <span className="px-2 py-1 rounded-[var(--r-check,6px)] bg-blue-100 dark:bg-blue-950/60 t-small font-semibold text-blue-700 dark:text-blue-300">
                          Véhiculé
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </ScreenPod>

          <KineticFilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            triggerRef={filterBtnRef}
            language={language}
            displayCount={sortedTalents.length}
            entityPluralLabel={isAr ? 'مواهب' : 'talents'}
            hasActiveFilters={activeFiltersCount > 0}
            onResetFilters={resetFilters}
            sections={filterSections}
          />
        </>
      )}

      {activeTab === 'dossier' && (
        <ScreenPod>
          <div className="flex items-center justify-end px-1">
            <ListAdvancedMenuButton language={language} />
          </div>
          <div className="sq-elev-card max-w-4xl mx-auto">
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-6 bg-white dark:bg-[#22201E] space-y-6"
            >
              {selectedTalent ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--atr-divider)]">
                    <div className="flex items-center gap-4">
                      <div
                        data-sq="card"
                        data-sq-border="none"
                        className="w-16 h-16 shrink-0 bg-[#F3EDE7] dark:bg-[#2B2825] overflow-hidden"
                      >
                        <img
                          src={selectedTalent.portraitPhotoUrl}
                          alt={selectedTalent.fullName}
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="t-dialog font-semibold text-black dark:text-white">
                            {selectedTalent.fullName}
                          </h2>
                          {selectedTalent.isHrVerified && (
                            <span className="px-2 py-1 rounded-full bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] t-small font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Vérifié par RH
                            </span>
                          )}
                        </div>
                        <p className="t-cap text-black/55 dark:text-white/55 mt-0.5">
                          {selectedTalent.age} ans · Wilaya de {selectedTalent.wilayaName} ({selectedTalent.commune}) · {selectedTalent.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="t-cap text-black/55 dark:text-white/55 block">
                        {t('pm_rh_col_consolidated_score')}
                      </span>
                      <div className="flex items-center gap-2 t-dialog font-semibold tabular-nums text-amber-500 justify-end">
                        <Star className="w-5 h-5 fill-amber-400" />
                        <span>{selectedTalent.consolidatedScore} / 5.0</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      data-sq="ctl"
                      data-sq-border="none"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#191716] space-y-2"
                    >
                      <h3 className="t-small font-semibold text-black dark:text-white tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                        {t('pm_rh_pillar1_title')}
                      </h3>
                      <div className="t-cap space-y-1 text-black/70 dark:text-white/75">
                        <p>
                          <strong>{t('pm_rh_pillar1_roles')}</strong>{' '}
                          {selectedTalent.desiredRoles.join(', ')}
                        </p>
                        <p>
                          <strong>{t('pm_rh_pillar1_langs')}</strong>{' '}
                          {selectedTalent.languages?.join(', ') || 'Arabe, Français'}
                        </p>
                        <p>
                          <strong>{t('pm_rh_pillar1_mobility')}</strong>{' '}
                          {selectedTalent.hasDriverLicense ? 'Permis B Oui' : 'Non'} ·{' '}
                          {selectedTalent.isVehicleOwner ? 'Véhiculé Oui' : 'Non véhicule'}
                        </p>
                      </div>
                    </div>
                    <div
                      data-sq="ctl"
                      data-sq-border="none"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#191716] space-y-2"
                    >
                      <h3 className="t-small font-semibold text-black dark:text-white tracking-wide flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        {t('pm_rh_pillar2_title')}
                      </h3>
                      <div className="t-cap space-y-1 tabular-nums text-black dark:text-white">
                        <p>
                          <strong>{t('pm_rh_pillar2_ccp')}</strong> {selectedTalent.ccpNumber}
                        </p>
                        <p>
                          <strong>{t('pm_rh_pillar2_key')}</strong> {selectedTalent.ccpKey}
                        </p>
                        <p className="t-small text-emerald-600 font-sans font-medium">
                          {t('pm_rh_pillar2_verified')}
                        </p>
                      </div>
                    </div>
                    <div
                      data-sq="ctl"
                      data-sq-border="none"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#191716] space-y-2"
                    >
                      <h3 className="t-small font-semibold text-black dark:text-white tracking-wide flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        {t('pm_rh_pillar3_title')}
                      </h3>
                      <div className="t-cap space-y-2">
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="none"
                          className="flex items-center justify-between p-2 bg-white dark:bg-[#2B2825]"
                        >
                          <span>{t('pm_rh_doc_cni')}</span>
                          <span className="text-emerald-600 font-semibold t-small">
                            {t('pm_rh_doc_verified')}
                          </span>
                        </div>
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="none"
                          className="flex items-center justify-between p-2 bg-white dark:bg-[#2B2825]"
                        >
                          <span>{t('pm_rh_doc_license')}</span>
                          <span className="text-emerald-600 font-semibold t-small">
                            {t('pm_rh_doc_compliant')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      data-sq="ctl"
                      data-sq-border="none"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#191716] space-y-2"
                    >
                      <h3 className="t-small font-semibold text-black dark:text-white tracking-wide flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        {t('pm_rh_pillar4_title')}
                      </h3>
                      <div className="t-cap text-black/70 dark:text-white/75 space-y-1">
                        <p>
                          <strong>{t('pm_rh_history_completed')}</strong>{' '}
                          {selectedTalent.completedMissionsCount}
                        </p>
                        <p>
                          <strong>{t('pm_rh_history_absences')}</strong>{' '}
                          {t('pm_rh_history_reliability')}
                        </p>
                        <p>
                          <strong>{t('pm_rh_history_hr_notes')}</strong>{' '}
                          {selectedTalent.hrNotes || 'Profil sérieux et ponctuel.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('talents')}
                      data-sq="ctl"
                      data-sq-border="none"
                      className="px-4 py-2 t-small font-semibold text-black/70 dark:text-white/75 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] transition-colors cursor-pointer"
                    >
                      {t('pm_rh_btn_back_pool')}
                    </button>
                  </div>
                </div>
              ) : (
                <KineticEmptyStateMotion motionKey="pm-rh-no-talent">
                  <EmptyState
                    variant="island"
                    icon={<Users />}
                    title={t('pm_rh_no_talent_selected')}
                    primaryAction={{
                      label: t('pm_rh_btn_back_pool'),
                      onClick: () => setActiveTab('talents'),
                    }}
                  />
                </KineticEmptyStateMotion>
              )}
            </div>
          </div>
        </ScreenPod>
      )}

      {activeTab === 'portal' && (
        <ScreenPod>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="t-pod text-[var(--text-1)] dark:text-white">
              {t('pm_rh_title_portal')}
            </h2>
            <ListAdvancedMenuButton language={language} />
          </div>
          <MobilePhoneSimulator
            title={t('pm_rh_title_portal')}
            subtitle={t('pm_rh_portal_sub')}
            defaultMode="mobile"
          >
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-[var(--atr-divider)]">
                <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tracking-wide">
                  {t('pm_rh_portal_join_title')}
                </span>
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {t('pm_rh_portal_form_title')}
                </h3>
                <p className="t-cap text-black/55 dark:text-white/55">
                  {t('pm_rh_portal_form_sub')}
                </p>
              </div>
              {formSubmittedSuccess && (
                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="p-3 bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] t-small font-semibold text-center"
                >
                  {t('pm_rh_portal_success')}
                </div>
              )}
              <form onSubmit={(e) => handleCreateTalent(e, 'portal')} className="space-y-3">
                <LabelInput
                  field="Nom"
                  label={t('pm_rh_field_fullname')}
                  value={fullName}
                  onChange={setFullName}
                  required
                  placeholder={t('pm_rh_field_fullname_ph')}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="Telephone"
                    label={t('pm_rh_field_phone')}
                    type="tel"
                    required
                    placeholder="+213 661 ..."
                    value={phone}
                    onChange={setPhone}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <LabelInput
                    field="Age"
                    label={t('pm_rh_field_age')}
                    type="number"
                    value={age}
                    onChange={(v) => setAge(String(v || ''))}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LabelSelect
                    field="Wilaya"
                    label={t('pm_rh_field_wilaya')}
                    value={wilayaCode}
                    onChange={setWilayaCode}
                    options={ALGERIAN_WILAYAS.map((w) => ({
                      value: w.code,
                      label: `${w.code} - ${w.nameFr}`,
                    }))}
                    height={40}
                    corner={12}
                    searchable
                  />
                  <LabelInput
                    field="Commune"
                    label={t('pm_rh_field_commune')}
                    value={commune}
                    onChange={setCommune}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
                >
                  <span className="t-small font-semibold text-black dark:text-white block">
                    {t('pm_compta_tab_ccp')}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <LabelInput
                        field="CCP"
                        label={t('pm_rh_field_ccp')}
                        placeholder="0012345678"
                        value={ccpNumber}
                        onChange={setCcpNumber}
                        required
                        width="100%"
                        height={40}
                        corner={12}
                      />
                    </div>
                    <LabelInput
                      field="Cle"
                      label={t('pm_rh_field_ccp_key')}
                      placeholder="45"
                      value={ccpKey}
                      onChange={setCcpKey}
                      required
                      width="100%"
                      height={40}
                      corner={12}
                    />
                  </div>
                </div>
                <LabelInput
                  field="Photo"
                  label={t('pm_rh_field_photo_url')}
                  type="url"
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <AtriumButton type="submit" variant="primary" className="w-full">
                  Envoyer ma Candidature →
                </AtriumButton>
              </form>
            </div>
          </MobilePhoneSimulator>
        </ScreenPod>
      )}

      {activeTab === 'walkin' && (
        <ScreenPod>
          <div className="sq-elev-card max-w-2xl mx-auto">
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-6 bg-white dark:bg-[#22201E] space-y-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tracking-wide">
                    Saisie Express Agence
                  </span>
                  <h2 className="t-dialog font-semibold text-black dark:text-white mt-1">
                    Enregistrement Direct d&apos;un Candidat Présent en Agence
                  </h2>
                </div>
                <ListAdvancedMenuButton language={language} />
              </div>
              <form onSubmit={(e) => handleCreateTalent(e, 'walkin')} className="space-y-4">
                <div className="space-y-3">
                  <LabelInput
                    field="Nom"
                    label={t('pm_rh_field_candidate_name')}
                    required
                    placeholder={t('pm_rh_field_fullname_ph')}
                    value={fullName}
                    onChange={setFullName}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <LabelInput
                      field="Telephone"
                      label={t('pm_rh_field_phone')}
                      type="tel"
                      required
                      placeholder="+213 550 ..."
                      value={phone}
                      onChange={setPhone}
                      width="100%"
                      height={40}
                      corner={12}
                    />
                    <LabelSelect
                      field="Wilaya"
                      label={t('pm_rh_field_wilaya')}
                      value={wilayaCode}
                      onChange={setWilayaCode}
                      options={ALGERIAN_WILAYAS.map((w) => ({
                        value: w.code,
                        label: `${w.code} - ${w.nameFr}`,
                      }))}
                      height={40}
                      corner={12}
                      searchable
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <LabelInput
                        field="CCP"
                        label={t('pm_rh_field_ccp_hint')}
                        required
                        value={ccpNumber}
                        onChange={setCcpNumber}
                        width="100%"
                        height={40}
                        corner={12}
                      />
                    </div>
                    <LabelInput
                      field="Cle"
                      label={t('pm_rh_field_key_hint')}
                      required
                      value={ccpKey}
                      onChange={setCcpKey}
                      width="100%"
                      height={40}
                      corner={12}
                    />
                  </div>
                </div>
                <AtriumButton type="submit" variant="primary" className="w-full">
                  Enregistrer dans le Répertoire
                </AtriumButton>
              </form>
            </div>
          </div>
        </ScreenPod>
      )}

      <KineticSlideOverInspector<PMTalent>
        isOpen={Boolean(activeInspectedTalent)}
        item={activeInspectedTalent}
        allItems={sortedTalents}
        keyExtractor={(item) => item.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeInspectedTalent?.fullName || ''}
        subtitle={
          activeInspectedTalent
            ? `${activeInspectedTalent.wilayaName} (${activeInspectedTalent.commune}) · ${activeInspectedTalent.phone}`
            : ''
        }
        categoryLabel={activeInspectedTalent?.desiredRoles[0] || 'Animateur'}
        avatarText={
          activeInspectedTalent
            ? activeInspectedTalent.fullName
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'RH'
        }
        branchName={
          activeInspectedTalent
            ? resolveRecordBranch(activeInspectedTalent, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeInspectedTalent
            ? getTalentStatusBadge(activeInspectedTalent.status, language).label
            : undefined
        }
        statusClassName={
          activeInspectedTalent
            ? getTalentStatusBadge(activeInspectedTalent.status, language).pillClass
            : undefined
        }
        tabs={[
          { id: 'overview', label: isAr ? 'الملف' : 'Profil & Mobilité' },
          { id: 'ccp', label: 'CCP PTT SFP 01' },
          { id: 'history', label: isAr ? 'الأداء' : 'Historique' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(item) => handleSelectTalent(item)}
        onClose={() => setInspectedTalent(null)}
        renderBody={(talent, tab) => {
          const ccpCheck = validateCcpAccount(talent.ccpNumber, talent.ccpKey);
          const scorePct = Math.min(100, Math.round((talent.consolidatedScore / 5) * 100));

          if (tab === 'ccp') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={`${talent.ccpNumber} / ${talent.ccpKey}`}
                    tone={ccpCheck.isValid ? 'ok' : 'danger'}
                    caption={ccpCheck.isValid ? 'Clé RIP Poste Algérie vérifiée' : ccpCheck.error}
                  />
                </InspectorSection>
                <InspectorSection index={1} title="Pièces Administratives">
                  <InspectorCard>
                    <InspectorListItem
                      title={t('pm_rh_doc_cni')}
                      badge={{ label: 'Vérifiée', tone: 'ok' }}
                    />
                    <InspectorListItem
                      title={t('pm_rh_doc_license')}
                      badge={{
                        label: talent.hasDriverLicense ? 'Permis B OK' : 'Non requis',
                        tone: talent.hasDriverLicense ? 'ok' : 'neutral',
                      }}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'history') {
            return (
              <InspectorSection index={0} title="Performance Missions Terrain">
                <InspectorCard>
                  <InspectorKeyValue label="Missions Réalisées" value={`${talent.completedMissionsCount}`} />
                  <InspectorKeyValue label="Note Moyenne Missions" value={`${talent.averageMissionRating} / 5.0`} tone="ok" />
                  <InspectorKeyValue label="Absences Injustifiées" value={`${talent.absencesCount}`} tone={talent.absencesCount > 0 ? 'warn' : 'ok'} isLast />
                  <InspectorProgressBar percent={scorePct} tone="ok" animateKey={talent.id} />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title="Actions Rapides">
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'toggle',
                      label: talent.status === 'active' ? 'Suspendre' : 'Activer',
                      icon: talent.status === 'active' ? <PauseCircle className="w-[18px] h-[18px]" /> : <CheckCircle className="w-[18px] h-[18px]" />,
                      primary: talent.status !== 'active',
                      onClick: () => {
                        const next = talent.status === 'active' ? 'paused' : 'active';
                        updatePmTalentStatus(talent.id, next);
                      },
                    },
                    {
                      id: 'dossier',
                      label: 'Dossier 4 Piliers',
                      icon: <FileText className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        setSelectedTalent(talent);
                        setInspectedTalent(null);
                        setActiveTab('dossier');
                      },
                    },
                    {
                      id: 'pin',
                      label: pinnedTalentIds.has(talent.id) ? 'Détacher' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(talent),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={`★ ${talent.consolidatedScore} / 5.0`}
                  tone="accent"
                  caption={`${talent.completedMissionsCount} missions validées · ${talent.isHrVerified ? 'Vérifié RH' : 'En vérification'}`}
                />
              </InspectorSection>

              <InspectorSection index={2} title="Coordonnées & Mobilité">
                <InspectorCard>
                  <InspectorKeyValue label="Wilaya" value={`${talent.wilayaName} (${talent.commune})`} icon={<MapPin size={14} />} mono={false} />
                  <InspectorKeyValue label="Téléphone" value={talent.phone} icon={<Phone size={14} />} copyText={talent.phone} />
                  <InspectorKeyValue label="Rôles" value={talent.desiredRoles.join(', ')} mono={false} />
                  <InspectorKeyValue label="Permis & Véhicule" value={`${talent.hasDriverLicense ? 'Permis B' : 'Sans permis'} · ${talent.isVehicleOwner ? 'Véhiculé' : 'Non véhiculé'}`} icon={<Car size={14} />} mono={false} />
                  <InspectorKeyValue label="Validation RH" value={talent.isHrVerified ? 'Conforme' : 'En attente'} icon={<ShieldCheck size={14} />} tone={talent.isHrVerified ? 'ok' : 'warn'} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={3} title="Notes Évaluation RH">
                <InspectorNotesField
                  value={notesByTalent[talent.id] ?? talent.hrNotes ?? ''}
                  onSave={(next) => {
                    const hasPrev = Object.prototype.hasOwnProperty.call(notesByTalent, talent.id);
                    const prevVal = notesByTalent[talent.id];
                    setNotesByTalent((prev) => ({ ...prev, [talent.id]: next }));
                    registerUndoEntry({
                      vertical: 'project_milestone',
                      operationType: 'edit',
                      summary: `Note RH : ${talent.fullName}`,
                      entityLabel: talent.fullName,
                      branchId: talent.facilityId || currentBranch?.id,
                      undo: () => {
                        setNotesByTalent((prev) => {
                          if (!hasPrev) {
                            const copy = { ...prev };
                            delete copy[talent.id];
                            return copy;
                          }
                          return { ...prev, [talent.id]: prevVal };
                        });
                      },
                      redo: () => {
                        setNotesByTalent((prev) => ({ ...prev, [talent.id]: next }));
                      },
                    });
                  }}
                />
              </InspectorSection>

              <InspectorSection index={4}>
                <InspectorWideButton
                  label="Ouvrir le Dossier Administratif Complet"
                  icon={<FileText size={15} />}
                  tone="dark"
                  onClick={() => {
                    setSelectedTalent(talent);
                    setInspectedTalent(null);
                    setActiveTab('dossier');
                  }}
                />
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
};
