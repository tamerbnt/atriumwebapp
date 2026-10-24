import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMTalent } from '../../../types/index';
import { ALGERIAN_WILAYAS, validateCcpAccount } from '../../../utils/algerianPtt';
import { MobilePhoneSimulator } from './MobilePhoneSimulator';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  Users,
  Search,
  Filter,
  Star,
  CheckCircle,
  Car,
  FileText,
  CreditCard,
  Eye,
  Plus,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  X,
  ExternalLink,
  Download,
  GraduationCap,
  DoorOpen,
  Camera,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Pin,
  Building2,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectRhViewProps {
  initialTab?: 'talents' | 'dossier' | 'portal' | 'walkin';
}

export const ProjectRhView: React.FC<ProjectRhViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmTalents,
    addPmTalent,
    updatePmTalentStatus,
    batchUpdatePmTalentStatus,
    batchDeletePmTalents,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  React.useEffect(() => {
    if (!pmTalents || pmTalents.length === 0) {
      resetPmMockData();
    }
  }, [pmTalents, resetPmMockData]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const activeTab: 'talents' | 'dossier' | 'portal' | 'walkin' =
    activePmSubScreen === 'dossier' || initialTab === 'dossier'
      ? 'dossier'
      : activePmSubScreen === 'portal' || initialTab === 'portal'
      ? 'portal'
      : activePmSubScreen === 'walkin' || initialTab === 'walkin'
      ? 'walkin'
      : 'talents';

  const setActiveTab = (tab: 'talents' | 'dossier' | 'portal' | 'walkin') => {
    setActivePmSubScreen(tab);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('all');
  const [selectedTalent, setSelectedTalent] = useState<PMTalent | null>(pmTalents[0] || null);
  const [selectedTalentIds, setSelectedTalentIds] = useState<Set<string>>(new Set());
  const [pinnedTalentIds, setPinnedTalentIds] = useState<Set<string>>(new Set());
  const [talentSortBy, setTalentSortBy] = useState<string>('talent');
  const [talentSortDir, setTalentSortDir] = useState<'asc' | 'desc'>('asc');

  // Form State for Portal & Walk-in
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [age, setAge] = useState('22');
  const [phone, setPhone] = useState('+213 ');
  const [email, setEmail] = useState('');
  const [wilayaCode, setWilayaCode] = useState('16');
  const [commune, setCommune] = useState('Bab Ezzouar');
  const [hasDriverLicense, setHasDriverLicense] = useState(true);
  const [isVehicleOwner, setIsVehicleOwner] = useState(false);
  const [ccpNumber, setCcpNumber] = useState('0012345678');
  const [ccpKey, setCcpKey] = useState('45');
  const [desiredRoles, setDesiredRoles] = useState(['Animator']);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
  const [formSubmittedSuccess, setFormSubmittedSuccess] = useState(false);

  // Filtered Talents
  const filteredTalents = pmTalents.filter((t) => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.ccpNumber.includes(searchTerm);
    const matchesWilaya = selectedWilaya === 'all' || t.wilayaCode === selectedWilaya;
    return matchesSearch && matchesWilaya;
  });

  const handleCreateTalent = (e: React.FormEvent, source: 'portal' | 'walkin') => {
    e.preventDefault();
    const wilayaObj = ALGERIAN_WILAYAS.find((w) => w.code === wilayaCode);
    const ccpCheck = validateCcpAccount(ccpNumber, ccpKey);

    if (!ccpCheck.isValid) {
      if (showToast) {
        showToast({
          title: t('pm_rh_ccp_error_title'),
          message: t('pm_rh_ccp_error_msg', { error: ccpCheck.error }),
          type: 'warning',
        });
      }
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
      hrNotes: source === 'walkin' ? 'Candidat reçu directement à l\'agence.' : 'Pré-inscription portail en ligne.',
    });

    setFormSubmittedSuccess(true);
    setTimeout(() => {
      setFormSubmittedSuccess(false);
      setFullName('');
      setActiveTab('talents');
    }, 1800);
  };

  const handleExportTalents = () => {
    const headers = ['Nom & Prénom', 'Wilaya', 'Commune', 'Téléphone', 'N° CCP', 'Clé', 'Score Global', 'Statut'];
    const rows = filteredTalents.map((t) => [
      `"${t.fullName.replace(/"/g, '""')}"`,
      `"${t.wilayaName}"`,
      `"${t.commune}"`,
      `"${t.phone}"`,
      `"${t.ccpNumber}"`,
      `"${t.ccpKey}"`,
      t.consolidatedScore,
      t.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vivier_talents_nch_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sortedTalents = React.useMemo(() => {
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
        return talentSortDir === 'asc' ? a.consolidatedScore - b.consolidatedScore : b.consolidatedScore - a.consolidatedScore;
      }
      return 0;
    });
  }, [filteredTalents, pinnedTalentIds, talentSortBy, talentSortDir]);

  const talentColumns: ColumnDefinition<PMTalent>[] = React.useMemo(() => [
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
            className="w-10 h-10 rounded-full object-cover border border-zinc-200 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{talent.fullName}</div>
            <span className="text-[11px] text-zinc-500 truncate block">{talent.phone}</span>
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
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{talent.wilayaName}</div>
          <span className="text-[11px] text-zinc-500">{talent.commune}</span>
        </div>
      ),
    },
    {
      key: 'ccp',
      header: t('pm_rh_col_ccp'),
      width: '1.8*',
      minWidth: '140px',
      renderCell: (talent) => (
        <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
          <div>{talent.ccpNumber}</div>
          <span className="text-[10px] text-zinc-400">Clé: {talent.ccpKey}</span>
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
          <div className="inline-flex items-center gap-1 font-bold text-amber-500 font-mono">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{talent.consolidatedScore}</span>
          </div>
          <span className="text-[10px] text-zinc-400 block font-normal">
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
            <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mr-1">
              Permis B
            </span>
          )}
          {talent.isVehicleOwner && (
            <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              Véhiculé
            </span>
          )}
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_rh_badge_title')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_rh_badge_sub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'talents'
              ? t('pm_rh_title_talents')
              : activeTab === 'dossier'
              ? t('pm_rh_title_dossier', { name: selectedTalent?.fullName || 'Sélection' })
              : activeTab === 'portal'
              ? t('pm_rh_title_portal')
              : t('pm_rh_title_walkin')}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Cyberpark Tower B</div>
                )}
              </div>
            )}
          </div>

          {/* Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger le vivier démo de talents"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          <AtriumButton
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('walkin')}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('pm_rh_btn_new_candidate')}
          </AtriumButton>
          <button
            onClick={handleExportTalents}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t('pm_rh_btn_export_excel')}
          </button>
        </div>
      </div>

      {/* SCREEN 5.1: TALENT POOL DIRECTORY */}
      {activeTab === 'talents' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('pm_rh_search_ph')}
                openWidth={360}
                shutSize={38}
              />

              <FilterSelect
                label="Wilaya"
                value={selectedWilaya}
                onChange={(val) => setSelectedWilaya(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: '58 Wilayas (Toutes)' },
                  { value: '16', label: '16 - Alger' },
                  { value: '31', label: '31 - Oran' },
                  { value: '25', label: '25 - Constantine' },
                  { value: '19', label: '19 - Sétif' },
                  { value: '09', label: '09 - Blida' },
                ]}
              />
            </div>

            <div className="text-xs font-semibold text-zinc-500">
              {t('pm_rh_profiles_found', { count: filteredTalents.length })}
            </div>
          </div>

          {/* Floating Batch Actions Bar */}
          {selectedTalentIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#C4785A]/10 border border-[#C4785A]/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#C4785A]">
                <span>{selectedTalentIds.size} talent(s) sélectionné(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedTalentIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmTalentStatus(Array.from(selectedTalentIds), 'active');
                    setSelectedTalentIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  Activer Profils
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmTalentStatus(Array.from(selectedTalentIds), 'paused');
                    setSelectedTalentIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 rounded-xl transition-colors cursor-pointer"
                >
                  Suspendre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchDeletePmTalents(Array.from(selectedTalentIds));
                    setSelectedTalentIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          )}

          {/* Talents Universal Collection (List view & Grid view with 6-button corner fan) */}
          <UniversalDataCollection<PMTalent>
            items={sortedTalents}
            keyExtractor={(t) => t.id}
            defaultViewMode="list"
            columns={talentColumns}
            sortBy={talentSortBy}
            sortDirection={talentSortDir}
            onSortChange={(key) => {
              if (talentSortBy === key) {
                setTalentSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setTalentSortBy(key);
                setTalentSortDir('asc');
              }
            }}
            renderCard={(talent) => (
              <div className="flex flex-col items-center justify-center w-full">
                <img
                  src={talent.portraitPhotoUrl}
                  alt={talent.fullName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#C4785A] shadow-md mb-4"
                />
                <h3 className="text-[16px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[210px] mb-1 tracking-tight">
                  {talent.fullName}
                </h3>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mb-2 truncate max-w-[200px]">
                  {talent.wilayaName} ({talent.commune})
                </span>

                <div className="flex items-center gap-1 font-bold text-amber-500 font-mono text-sm mb-3">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{talent.consolidatedScore}</span>
                  <span className="text-[11px] text-zinc-400 font-normal ml-1">
                    · {talent.completedMissionsCount} missions
                  </span>
                </div>

                <div className="w-full pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5 text-center">
                  <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                    CCP: {talent.ccpNumber} (Clé: {talent.ccpKey})
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {talent.hasDriverLicense && (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                        Permis B
                      </span>
                    )}
                    {talent.isVehicleOwner && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                        Véhiculé
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            onItemClick={(talent) => {
              setSelectedTalent(talent);
              setActiveTab('dossier');
            }}
            onViewDetails={(talent) => {
              setSelectedTalent(talent);
              setActiveTab('dossier');
            }}
            onTogglePin={(talent) => {
              setPinnedTalentIds((prev) => {
                const next = new Set(prev);
                if (next.has(talent.id)) {
                  next.delete(talent.id);
                  showToast?.({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${talent.fullName} unpinned`,
                  });
                } else {
                  next.add(talent.id);
                  showToast?.({
                    type: 'info',
                    title: 'Pinned',
                    message: `${talent.fullName} pinned to top`,
                  });
                }
                return next;
              });
            }}
            isPinned={(talent) => pinnedTalentIds.has(talent.id)}
            selectedIds={selectedTalentIds}
            onSelectionChange={setSelectedTalentIds}
            emptyTitle={t('pm_rh_no_talents') || 'Aucun talent trouvé'}
            emptyDescription="Essayez de modifier votre filtre par wilaya ou vos termes de recherche."
          />
        </div>
      )}

      {/* SCREEN 5.2: COMPREHENSIVE TALENT DOSSIER 360° */}
      {activeTab === 'dossier' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-4xl mx-auto space-y-6">
          {selectedTalent ? (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedTalent.portraitPhotoUrl}
                    alt={selectedTalent.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C4785A]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedTalent.fullName}
                      </h2>
                      {selectedTalent.isHrVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Vérifié par RH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedTalent.age} ans · Wilaya de {selectedTalent.wilayaName} ({selectedTalent.commune}) · {selectedTalent.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">{t('pm_rh_col_consolidated_score')}</span>
                  <div className="flex items-center gap-1.5 text-xl font-bold font-mono text-amber-500 justify-end">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{selectedTalent.consolidatedScore} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1: Informations Générales */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#C4785A]" />
                    {t('pm_rh_pillar1_title')}
                  </h3>
                  <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                    <p><strong>{t('pm_rh_pillar1_roles')}</strong> {selectedTalent.desiredRoles.join(', ')}</p>
                    <p><strong>{t('pm_rh_pillar1_langs')}</strong> {selectedTalent.languages?.join(', ') || 'Arabe, Français'}</p>
                    <p><strong>{t('pm_rh_pillar1_mobility')}</strong> {selectedTalent.hasDriverLicense ? 'Permis B Oui' : 'Non'} · {selectedTalent.isVehicleOwner ? 'Véhiculé Oui' : 'Non véhicule'}</p>
                  </div>
                </div>

                {/* Pillar 2: Banking & CCP Credentials */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    {t('pm_rh_pillar2_title')}
                  </h3>
                  <div className="text-xs space-y-1 font-mono text-zinc-800 dark:text-zinc-200">
                    <p><strong>{t('pm_rh_pillar2_ccp')}</strong> {selectedTalent.ccpNumber}</p>
                    <p><strong>{t('pm_rh_pillar2_key')}</strong> {selectedTalent.ccpKey}</p>
                    <p className="text-[11px] text-emerald-600 font-sans font-medium">{t('pm_rh_pillar2_verified')}</p>
                  </div>
                </div>

                {/* Pillar 3: Verified Document Vault */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {t('pm_rh_pillar3_title')}
                  </h3>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span>{t('pm_rh_doc_cni')}</span>
                      <span className="text-emerald-600 font-bold text-[10px]">{t('pm_rh_doc_verified')}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span>{t('pm_rh_doc_license')}</span>
                      <span className="text-emerald-600 font-bold text-[10px]">{t('pm_rh_doc_compliant')}</span>
                    </div>
                  </div>
                </div>

                {/* Pillar 4: Mission History & Ratings */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    {t('pm_rh_pillar4_title')}
                  </h3>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p><strong>{t('pm_rh_history_completed')}</strong> {selectedTalent.completedMissionsCount}</p>
                    <p><strong>{t('pm_rh_history_absences')}</strong> {t('pm_rh_history_reliability')}</p>
                    <p><strong>{t('pm_rh_history_hr_notes')}</strong> {selectedTalent.hrNotes || 'Profil sérieux et ponctuel.'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveTab('talents')}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 cursor-pointer"
                >
                  {t('pm_rh_btn_back_pool')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-8">{t('pm_rh_no_talent_selected')}</p>
          )}
        </div>
      )}

      {/* SCREEN 5.3A: PUBLIC CANDIDATE SELF-REGISTRATION (SIMULATOR) */}
      {activeTab === 'portal' && (
        <MobilePhoneSimulator
          title={t('pm_rh_title_portal')}
          subtitle={t('pm_rh_portal_sub')}
          defaultMode="mobile"
        >
          <div className="space-y-4">
            <div className="text-center pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] font-bold text-[#C4785A] uppercase tracking-wide">
                {t('pm_rh_portal_join_title')}
              </span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {t('pm_rh_portal_form_title')}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {t('pm_rh_portal_form_sub')}
              </p>
            </div>

            {formSubmittedSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center">
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
                height={46}
                corner={14}
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
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="Age"
                  label={t('pm_rh_field_age')}
                  type="number"
                  value={age ? String(age) : ''}
                  onChange={(v) => setAge(String(v || ''))}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <LabelSelect
                  field="Wilaya"
                  label={t('pm_rh_field_wilaya')}
                  value={wilayaCode}
                  onChange={(val) => setWilayaCode(typeof val === 'string' ? val : val.target?.value || val)}
                  options={ALGERIAN_WILAYAS.map((w) => ({
                    value: w.code,
                    label: `${w.code} - ${w.nameFr}`,
                  }))}
                  height={46}
                  corner={14}
                  searchable
                />

                <LabelInput
                  field="Commune"
                  label={t('pm_rh_field_commune')}
                  value={commune}
                  onChange={setCommune}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              {/* CCP Info */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">
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
                      height={44}
                      corner={12}
                    />
                  </div>
                  <div>
                    <LabelInput
                      field="Cle"
                      label={t('pm_rh_field_ccp_key')}
                      placeholder="45"
                      value={ccpKey}
                      onChange={setCcpKey}
                      required
                      width="100%"
                      height={44}
                      corner={12}
                    />
                  </div>
                </div>
              </div>

              {/* Selfie / Portrait Upload */}
              <LabelInput
                field="Photo"
                label={t('pm_rh_field_photo_url')}
                type="url"
                value={photoUrl}
                onChange={setPhotoUrl}
                width="100%"
                height={46}
                corner={14}
              />

              <AtriumButton
                type="submit"
                variant="primary"
                className="w-full"
              >
                Envoyer ma Candidature ➔
              </AtriumButton>
            </form>
          </div>
        </MobilePhoneSimulator>
      )}

      {/* SCREEN 5.3B: AGENCY DIRECT WALK-IN INTAKE */}
      {activeTab === 'walkin' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-2xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
              Écran 5.3B · Saisie Express Agence
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Enregistrement Direct d'un Candidat Présent en Agence
            </h2>
            <p className="text-xs text-zinc-500">
              Formulaire express avec validation automatique des pièces d'identité et du compte postal CCP.
            </p>
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
                height={46}
                corner={14}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="Telephone"
                  label={t('pm_rh_field_phone')}
                  type="tel"
                  required
                  placeholder="+213 550 ..."
                  value={phone}
                  onChange={setPhone}
                  width="100%"
                  height={46}
                  corner={14}
                />

                <LabelSelect
                  field="Wilaya"
                  label={t('pm_rh_field_wilaya')}
                  value={wilayaCode}
                  onChange={(val) => setWilayaCode(typeof val === 'string' ? val : val.target?.value || val)}
                  options={ALGERIAN_WILAYAS.map((w) => ({
                    value: w.code,
                    label: `${w.code} - ${w.nameFr}`,
                  }))}
                  height={46}
                  corner={14}
                  searchable
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <LabelInput
                    field="CCP"
                    label={t('pm_rh_field_ccp_hint')}
                    required
                    value={ccpNumber}
                    onChange={setCcpNumber}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
                <div>
                  <LabelInput
                    field="Cle"
                    label={t('pm_rh_field_key_hint')}
                    required
                    value={ccpKey}
                    onChange={setCcpKey}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
              </div>
            </div>

            <AtriumButton
              type="submit"
              variant="primary"
              className="w-full"
            >
              Enregistrer & Valider dans le Vivier RH
            </AtriumButton>
          </form>
        </div>
      )}
    </div>
  );
};
