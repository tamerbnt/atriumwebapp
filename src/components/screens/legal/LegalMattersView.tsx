import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Scale,
  Calendar,
  Edit,
  BookOpen,
  Gavel,
  Printer,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { LegalMatter, NotaryDeed } from '../../../types';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatterModal } from './LegalMatterModal';
import { NotaryDeedModal } from '../../modals/NotaryDeedModal';
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

export const LegalMattersView: React.FC<any> = () => {
  const {
    language,
    activeLegalRole,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const isNotary = activeLegalRole === 'notaire_titulaire';

  const {
    matters,
    notaryDeeds,
    addMatter,
    updateMatter,
    deleteMatter,
    addNotaryDeed,
  } = useLegalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [kpiStatusFilter, setKpiStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['mat_01', 'deed_01']));
  const [sortBy, setSortBy] = useState<string>('matterNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isMatterModalOpen, setIsMatterModalOpen] = useState(false);
  const [matterToEdit, setMatterToEdit] = useState<LegalMatter | null>(null);
  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);

  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [selectedDeed, setSelectedDeed] = useState<NotaryDeed | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeMatter = useMemo(() => {
    if (!selectedMatter) return null;
    return matters.find((m) => m.id === selectedMatter.id) || selectedMatter;
  }, [selectedMatter, matters]);

  const activeDeed = useMemo(() => {
    if (!selectedDeed) return null;
    return notaryDeeds.find((d) => d.id === selectedDeed.id) || selectedDeed;
  }, [selectedDeed, notaryDeeds]);

  const activeDataset = isNotary ? notaryDeeds : matters;

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    activeDataset.forEach((item) => {
      const b = resolveRecordBranch(item, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [activeDataset, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: activeDataset.length },
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
        count: branchCounts.get(currentBranch.id) || activeDataset.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, activeDataset.length, isAr, isEn]);

  const filteredDeeds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = notaryDeeds.filter((d) => {
      if (filterCategory !== 'All' && d.actType !== filterCategory) return false;
      if (kpiStatusFilter === 'Published' && d.status !== 'publie_conservation') return false;
      if (kpiStatusFilter === 'Pending' && d.status === 'publie_conservation') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(d, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (q) {
        const matches =
          d.repertoireNumber.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.parties.vendorName.toLowerCase().includes(q) ||
          d.parties.purchaserName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'tarifs') {
        cmp = a.transactionValueDzd - b.transactionValueDzd;
      } else {
        cmp = a.repertoireNumber.localeCompare(b.repertoireNumber);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    notaryDeeds,
    filterCategory,
    kpiStatusFilter,
    branchFilter,
    searchQuery,
    sortBy,
    sortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const filteredMatters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = matters.filter((m) => {
      if (filterCategory !== 'All' && m.category !== filterCategory) return false;
      if (kpiStatusFilter === 'Active' && m.status !== 'Active') return false;
      if (kpiStatusFilter === 'PendingHearing' && m.status !== 'PendingHearing') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (q) {
        const matches =
          m.matterNumber.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          m.clientName.toLowerCase().includes(q) ||
          (m.courtJurisdiction || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'retainer') {
        cmp = a.retainerAmountDzd - b.retainerAmountDzd;
      } else {
        cmp = a.matterNumber.localeCompare(b.matterNumber);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    matters,
    filterCategory,
    kpiStatusFilter,
    branchFilter,
    searchQuery,
    sortBy,
    sortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const togglePin = useCallback((item: { id: string }) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const notaryColumns: ColumnDefinition<NotaryDeed>[] = useMemo(
    () => [
      {
        key: 'repertoireNumber',
        header: isAr ? 'رقم الفهرس الرسمي' : 'N° au Répertoire & Intitulé',
        width: '3.2*',
        sortable: true,
        renderCell: (d) => (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black dark:text-white truncate">
                  {isAr && d.titleAr ? d.titleAr : d.title}
                </span>
                {pinnedIds.has(d.id) && (
                  <span className="text-[10px] text-amber-500 font-bold shrink-0">★ VIP</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                <span className="font-bold text-[#d4522f]">{d.repertoireNumber}</span>
                <span>·</span>
                <span>{d.actType.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'parties',
        header: isAr ? 'الأطراف الموقعة (NIN)' : 'Parties Contractantes (NIN)',
        width: '2.5*',
        renderCell: (d) => (
          <div className="text-xs min-w-0">
            <div className="font-medium text-black dark:text-white truncate">
              {d.parties.vendorName} {'➔'} {d.parties.purchaserName}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5 truncate">
              NIN: {d.parties.purchaserNin}
            </div>
          </div>
        ),
      },
      {
        key: 'tarifs',
        header: isAr ? 'المعاملة والتعريفة (08-243)' : 'Valeur & Honoraires',
        width: '2*',
        sortable: true,
        renderCell: (d) => (
          <div className="text-xs">
            <div className="font-bold font-mono text-black dark:text-white tabular-nums">
              {formatMoney(d.transactionValueDzd, language)}
            </div>
            <div className="text-[10px] font-mono text-[#d4522f] mt-0.5">
              HT: {formatMoney(d.financials.honorairesHtDzd, language)}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche',
        width: '1.6*',
        sortable: true,
        renderCell: (d) => {
          const br = resolveRecordBranch(d, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
              <span className="truncate">{br.name}</span>
            </span>
          );
        },
      },
      {
        key: 'status',
        header: isAr ? 'الشهر العقاري' : 'Conservation',
        width: '1.8*',
        renderCell: (d) => {
          const isPublished = d.status === 'publie_conservation';
          return (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                isPublished
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              }`}
            >
              {isPublished
                ? `Publié (${d.conservationVolume || 'Vol.'})`
                : isAr
                ? 'في انتظار النشر'
                : 'En attente'}
            </span>
          );
        },
      },
    ],
    [language, isAr, isEn, pinnedIds, branchesById, currentBranch]
  );

  const matterColumns: ColumnDefinition<LegalMatter>[] = useMemo(
    () => [
      {
        key: 'matterNumber',
        header: isAr ? 'رقم القضية / الموضوع' : 'Dossier & Objet du Litige',
        width: '3*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
              <Gavel size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black dark:text-white truncate">
                  {isAr && m.titleAr ? m.titleAr : m.title}
                </span>
                {pinnedIds.has(m.id) && (
                  <span className="text-[10px] text-amber-500 font-bold shrink-0">★ VIP</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                <span className="font-bold text-[#d4522f]">{m.matterNumber}</span>
                <span>·</span>
                <span>{m.category}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'court',
        header: isAr ? 'المحكمة والغرفة' : 'Juridiction & Chambre',
        width: '2.2*',
        renderCell: (m) => (
          <div className="text-xs min-w-0">
            <div className="font-semibold text-black dark:text-white truncate">
              {m.courtJurisdiction}
            </div>
            {m.nextHearingDate && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                <Calendar size={10} />
                <span>
                  {isAr ? 'جلسة: ' : 'Audience : '}
                  {m.nextHearingDate}
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الموكل والطرف الخصم' : 'Client & Partie Adverse',
        width: '2.2*',
        renderCell: (m) => (
          <div className="text-xs min-w-0">
            <div className="font-medium text-black dark:text-white truncate">
              {isAr && m.clientNameAr ? m.clientNameAr : m.clientName}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55 truncate mt-0.5">
              c/ {m.adversePartyName || 'N/A'}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche',
        width: '1.6*',
        sortable: true,
        renderCell: (m) => {
          const br = resolveRecordBranch(m, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-black/75 dark:text-white/80 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
              <span className="truncate">{br.name}</span>
            </span>
          );
        },
      },
      {
        key: 'retainer',
        header: isAr ? 'الأتعاب والوديعة (دج)' : 'Honoraires & CARPA',
        width: '1.8*',
        sortable: true,
        renderCell: (m) => (
          <div className="text-xs font-mono tabular-nums">
            <div className="font-bold text-black dark:text-white">
              {formatMoney(m.retainerAmountDzd, language)}
            </div>
            <div className="text-[10px] text-[#d4522f] mt-0.5">
              CARPA: {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
            </div>
          </div>
        ),
      },
    ],
    [language, isAr, isEn, pinnedIds, branchesById, currentBranch]
  );

  const handleExportCsv = useCallback(() => {
    if (isNotary) {
      downloadCsvSafe(
        'atrium-notary-deeds.csv',
        [
          'Répertoire',
          'Type Acte',
          'Intitulé',
          'Vendeur',
          'Acquéreur',
          'Valeur DZD',
          'Honoraires HT',
          'Statut',
          'Branche',
        ],
        filteredDeeds.map((d) => [
          d.repertoireNumber,
          d.actType,
          d.title,
          d.parties.vendorName,
          d.parties.purchaserName,
          d.transactionValueDzd,
          d.financials.honorairesHtDzd,
          d.status,
          resolveRecordBranch(d, branchesById, currentBranch, language).name,
        ])
      );
    } else {
      downloadCsvSafe(
        'atrium-legal-matters.csv',
        [
          'N° Dossier',
          'Catégorie',
          'Intitulé',
          'Client',
          'Partie Adverse',
          'Juridiction',
          'Prochaine Audience',
          'Honoraires DZD',
          'CARPA DZD',
          'Statut',
          'Branche',
        ],
        filteredMatters.map((m) => [
          m.matterNumber,
          m.category,
          m.title,
          m.clientName,
          m.adversePartyName || '',
          m.courtJurisdiction || '',
          m.nextHearingDate || '',
          m.retainerAmountDzd,
          m.trustEscrowBalanceDzd || 0,
          m.status,
          resolveRecordBranch(m, branchesById, currentBranch, language).name,
        ])
      );
    }
    showToast(isAr ? 'تم تصدير السجل بنجاح' : 'Export CSV généré avec succès', 'success');
  }, [isNotary, filteredDeeds, filteredMatters, branchesById, currentBranch, language, isAr]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    if (isNotary) {
      return [
        {
          id: 'actType',
          label: isAr ? 'نوع العقد الرسمي' : "Type d'Acte Authentique",
          value: filterCategory,
          onChange: setFilterCategory,
          resetValue: 'All',
          kind: 'tiles',
          columns: 2,
          options: [
            { value: 'All', label: isAr ? 'كل العقود' : 'Tous les Actes', count: notaryDeeds.length },
            {
              value: 'vente_immobiliere',
              label: isAr ? 'بيع عقاري' : 'Ventes Immobilières',
              count: notaryDeeds.filter((d) => d.actType === 'vente_immobiliere').length,
            },
            {
              value: 'bail_commercial',
              label: isAr ? 'إيجار تجاري' : 'Baux Commerciaux',
              count: notaryDeeds.filter((d) => d.actType === 'bail_commercial').length,
            },
            {
              value: 'fredha',
              label: isAr ? 'فرائض شرعية' : 'Actes de Frédha',
              count: notaryDeeds.filter((d) => d.actType === 'fredha').length,
            },
            {
              value: 'statuts_societe',
              label: isAr ? 'تأسيس شركات' : 'Statuts Sociétés',
              count: notaryDeeds.filter((d) => d.actType === 'statuts_societe').length,
            },
          ],
        },
        {
          id: 'branch',
          label: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche / Étude',
          value: branchFilter,
          onChange: setBranchFilter,
          resetValue: 'All',
          kind: 'tiles',
          columns: 2,
          options: branchOptions,
        },
      ];
    }

    return [
      {
        id: 'category',
        label: isAr ? 'طبيعة النزاع' : 'Branche du Droit',
        value: filterCategory,
        onChange: setFilterCategory,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous les Dossiers', count: matters.length },
          {
            value: 'Commercial',
            label: isAr ? 'تجاري' : 'Commercial',
            count: matters.filter((m) => m.category === 'Commercial').length,
          },
          {
            value: 'Civil',
            label: isAr ? 'مدني وعقاري' : 'Civil & Immobilier',
            count: matters.filter((m) => m.category === 'Civil').length,
          },
          {
            value: 'Labor',
            label: isAr ? 'عمالي' : 'Droit Social',
            count: matters.filter((m) => m.category === 'Labor').length,
          },
          {
            value: 'Penal',
            label: isAr ? 'جزائي' : 'Pénal',
            count: matters.filter((m) => m.category === 'Penal').length,
          },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche / Cabinet',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ];
  }, [isNotary, isAr, isEn, filterCategory, branchFilter, notaryDeeds, matters, branchOptions]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterCategory !== 'All') {
      chips.push({
        key: 'category',
        label: filterCategory,
        onRemove: () => setFilterCategory('All'),
      });
    }
    if (kpiStatusFilter !== 'All') {
      chips.push({
        key: 'kpiStatus',
        label: kpiStatusFilter,
        onRemove: () => setKpiStatusFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const label = branchOptions.find((o) => o.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterCategory, kpiStatusFilter, branchFilter, branchOptions]);

  const activeAdvancedCount =
    (filterCategory !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('All');
    setKpiStatusFilter('All');
    setBranchFilter('All');
  }, []);

  const hasAnyFilters =
    Boolean(searchQuery.trim()) || activeChips.length > 0;

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: matters.length > 0 || notaryDeeds.length > 0,
  });

  if (
    showSkeleton &&
    ((matters.length === 0 && notaryDeeds.length === 0) || networkMode === 'force_skeleton')
  ) {
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
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const publishedDeedsCount = notaryDeeds.filter((d) => d.status === 'publie_conservation').length;
  const pendingDeedsCount = notaryDeeds.length - publishedDeedsCount;
  const totalNotaryHonoraires = notaryDeeds.reduce(
    (acc, d) => acc + (d.financials?.honorairesHtDzd || 0),
    0
  );

  const activeMattersCount = matters.filter((m) => m.status === 'Active').length;
  const pendingHearingCount = matters.filter((m) => m.status === 'PendingHearing').length;
  const totalCarpaTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);

  const headerTitle = isNotary
    ? isAr
      ? 'العقود'
      : isEn
      ? 'Deeds'
      : 'Actes'
    : activeLegalRole === 'secretaire_caisse'
    ? isAr
      ? 'العملاء'
      : 'Clients'
    : isAr
    ? 'القضايا'
    : isEn
    ? 'Cases'
    : 'Dossiers';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={isNotary ? <BookOpen size={22} /> : <Scale size={22} />}
        title={headerTitle}
        subtitle={`${activeLegalRole.replace('_', ' ').toUpperCase()} · ${
          isNotary
            ? isAr
              ? 'فهرس العقود الرسمية والتعريفة الموثقة'
              : 'Répertoire des Actes & Décret 08-243'
            : isAr
            ? 'متابعة القضايا، المحاكم، والودائع CARPA'
            : 'Contentieux, Juridictions & Séquestre CARPA'
        }`}
        primaryAction={{
          label: isNotary
            ? isAr
              ? 'عقد رسمي في الفهرس'
              : 'Nouvel Acte au Répertoire'
            : isAr
            ? 'فتح ملف قضية'
            : 'Nouveau Dossier',
          onClick: () => {
            if (isNotary) {
              setIsNotaryModalOpen(true);
            } else {
              setMatterToEdit(null);
              setIsMatterModalOpen(true);
            }
          },
        }}
      />

      {isNotary ? (
        <ScreenKpiBanner
          heading={isAr ? 'مؤشرات الفهرس التوثيقي' : 'Indicateurs du Répertoire Notarial'}
          language={language}
          primaryCard={{
            label: isAr ? 'عقود مشهرة بالمحافظة' : 'Actes Publiés Conservation',
            badgeText: isAr ? 'مشهر رسمياً' : 'Publiés CF',
            count: publishedDeedsCount,
            isActive: kpiStatusFilter === 'Published',
            onToggle: () =>
              setKpiStatusFilter((prev) => (prev === 'Published' ? 'All' : 'Published')),
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'بانتظار الإشهار والتسجيل' : 'En Attente Publication',
            badgeText: isAr ? 'قيد الإجراء' : 'en cours',
            count: pendingDeedsCount,
            isActive: kpiStatusFilter === 'Pending',
            onToggle: () => setKpiStatusFilter((prev) => (prev === 'Pending' ? 'All' : 'Pending')),
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'أتعاب التوثيق (مرسوم 08-243)' : 'Honoraires Décret 08-243',
            badgeCount: notaryDeeds.length,
            badgePrefix: '',
            badgeSuffix: isAr ? 'عقد' : 'actes',
            valueCount: totalNotaryHonoraires,
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'إجمالي التعريفة الصافية (HT)' : 'Total honoraires HT répertoriés',
          }}
        />
      ) : (
        <ScreenKpiBanner
          heading={isAr ? 'مؤشرات ملفات المكتب' : 'Portefeuille Contentieux & CARPA'}
          language={language}
          primaryCard={{
            label: isAr ? 'قضايا جارية' : 'Dossiers Actifs',
            badgeText: isAr ? 'قيد المتابعة' : 'En cours',
            count: activeMattersCount,
            isActive: kpiStatusFilter === 'Active',
            onToggle: () => setKpiStatusFilter((prev) => (prev === 'Active' ? 'All' : 'Active')),
            tone: 'emerald',
          }}
          secondaryCard={{
            label: isAr ? 'قضايا في انتظار الجلسة' : "En Attente d'Audience",
            badgeText: isAr ? 'مبرمجة' : 'fixées',
            count: pendingHearingCount,
            isActive: kpiStatusFilter === 'PendingHearing',
            onToggle: () =>
              setKpiStatusFilter((prev) => (prev === 'PendingHearing' ? 'All' : 'PendingHearing')),
            tone: 'terracotta',
          }}
          darkCard={{
            label: isAr ? 'رصيد حساب الحراسة CARPA' : 'Fonds Séquestres CARPA',
            badgeCount: matters.length,
            badgePrefix: '',
            badgeSuffix: isAr ? 'ملفات' : 'dossiers',
            valueCount: totalCarpaTrust,
            valuePrefix: '',
            formatValue: (v) => formatMoney(v, language),
            caption: isAr ? 'ودائع الموكلين المضمونة' : 'Fonds mandants sous séquestre',
          }}
        />
      )}

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isNotary
              ? isAr
                ? 'سجل العقود الرسمية'
                : 'Répertoire des Actes'
              : isAr
              ? 'سجل القضايا الجارية'
              : 'Registre des Dossiers'
          }
          liveRegionText={`${isNotary ? filteredDeeds.length : filteredMatters.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isNotary
              ? isAr
                ? 'بحث في الفهرس، الأطراف، أو رقم العقد...'
                : 'Rechercher au répertoire, partie, référence...'
              : isAr
              ? 'بحث في القضايا، الموكلين، أو المحكمة...'
              : 'Rechercher une affaire, client, juridiction...'
          }
          statusOptions={
            isNotary
              ? [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous' },
                  { value: 'vente_immobiliere', label: isAr ? 'عقار' : 'Ventes' },
                  { value: 'bail_commercial', label: isAr ? 'إيجار' : 'Baux' },
                  { value: 'fredha', label: isAr ? 'فرائض' : 'Frédha' },
                ]
              : [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous' },
                  { value: 'Commercial', label: isAr ? 'تجاري' : 'Commercial' },
                  { value: 'Civil', label: isAr ? 'مدني' : 'Civil' },
                  { value: 'Labor', label: isAr ? 'عمالي' : 'Social' },
                  { value: 'Penal', label: isAr ? 'جزائي' : 'Pénal' },
                ]
          }
          statusValue={filterCategory}
          onStatusChange={setFilterCategory}
          hasActiveAdvancedFilters={activeAdvancedCount > 0}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        {isNotary ? (
          <UniversalDataCollection<NotaryDeed>
            hideToolbar
            data={filteredDeeds}
            keyExtractor={(d) => d.id}
            defaultViewMode={viewMode}
            columns={notaryColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(d) => pinnedIds.has(d.id)}
            onTogglePin={togglePin}
            openItemId={activeDeed?.id ?? null}
            onItemClick={(d, el) => {
              setSelectedMatter(null);
              setSelectedDeed(d);
              setDrawerOpenerEl(el || null);
              setActiveTab('decompte');
            }}
            onViewDetails={(d, el) => {
              setSelectedMatter(null);
              setSelectedDeed(d);
              setDrawerOpenerEl(el || null);
              setActiveTab('decompte');
            }}
            customActions={(d) => [
              {
                id: 'print_grosse',
                label: isAr ? 'طباعة النسخة الرسمية' : 'Imprimer Grosse',
                icon: <Printer size={14} />,
                onClick: () => {
                  showToast(
                    isAr
                      ? `جاري طباعة النسخة الرسمية للعقد ${d.repertoireNumber}`
                      : `Impression Grosse Authentique (${d.repertoireNumber})`,
                    'info'
                  );
                },
              },
            ]}
            renderCard={(d) => (
              <div className="space-y-3 text-left rtl:text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {d.repertoireNumber}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    {d.status === 'publie_conservation' ? 'Publié' : 'Signé'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-black dark:text-white line-clamp-2">
                  {isAr && d.titleAr ? d.titleAr : d.title}
                </h4>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-black/55 dark:text-white/55">
                    {resolveRecordBranch(d, branchesById, currentBranch, language).name}
                  </span>
                  <span className="font-bold font-mono text-black dark:text-white tabular-nums">
                    {formatMoney(d.transactionValueDzd, language)}
                  </span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد عقود مطابقة' : 'Aucun acte répertorié'}
            emptyDescription={
              isAr
                ? 'أضف عقداً رسمياً جديداً أو أعد ضبط المرشحات.'
                : 'Inscrivez un nouvel acte au répertoire ou réinitialisez les filtres.'
            }
            primaryActionLabel={isAr ? 'عقد رسمي جديد' : 'Nouvel Acte'}
            onAddFirstItem={() => setIsNotaryModalOpen(true)}
            hasActiveFilters={hasAnyFilters}
            onResetFilters={resetAllFilters}
          />
        ) : (
          <UniversalDataCollection<LegalMatter>
            hideToolbar
            data={filteredMatters}
            keyExtractor={(m) => m.id}
            defaultViewMode={viewMode}
            columns={matterColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteMatter(id));
              setSelectedIds(new Set());
              showToast(
                isAr ? 'تم حذف الملفات المحددة' : `${ids.size} dossier(s) supprimé(s)`,
                'info'
              );
            }}
            isPinned={(m) => pinnedIds.has(m.id)}
            onTogglePin={togglePin}
            openItemId={activeMatter?.id ?? null}
            onItemClick={(m, el) => {
              setSelectedDeed(null);
              setSelectedMatter(m);
              setDrawerOpenerEl(el || null);
              setActiveTab('fiche');
            }}
            onViewDetails={(m, el) => {
              setSelectedDeed(null);
              setSelectedMatter(m);
              setDrawerOpenerEl(el || null);
              setActiveTab('fiche');
            }}
            onEdit={(m) => {
              setMatterToEdit(m);
              setIsMatterModalOpen(true);
            }}
            onDelete={(m) => {
              deleteMatter(m.id);
              if (activeMatter?.id === m.id) setSelectedMatter(null);
              showToast(isAr ? 'تم حذف ملف القضية' : 'Dossier supprimé', 'info');
            }}
            renderCard={(m) => (
              <div className="space-y-3 text-left rtl:text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    {m.matterNumber}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#d4522f]/15 text-[#d4522f]">
                    {m.category}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-black dark:text-white line-clamp-2">
                  {isAr && m.titleAr ? m.titleAr : m.title}
                </h4>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between text-xs gap-2">
                  <span className="text-[10px] text-black/55 dark:text-white/55 truncate">
                    {m.clientName}
                  </span>
                  <span className="font-bold font-mono text-black dark:text-white shrink-0 tabular-nums">
                    {formatMoney(m.retainerAmountDzd, language)}
                  </span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد قضايا مطابقة' : 'Aucun dossier juridique'}
            emptyDescription={
              isAr
                ? 'افتح ملف قضية جديدة أو أعد ضبط معايير البحث.'
                : 'Ouvrez un nouveau dossier ou modifiez les filtres.'
            }
            primaryActionLabel={isAr ? 'فتح ملف قضية' : 'Nouveau Dossier'}
            onAddFirstItem={() => {
              setMatterToEdit(null);
              setIsMatterModalOpen(true);
            }}
            hasActiveFilters={hasAnyFilters}
            onResetFilters={resetAllFilters}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={isNotary ? filteredDeeds.length : filteredMatters.length}
        entityPluralLabel={
          isNotary
            ? isAr
              ? 'عقد'
              : 'actes'
            : isAr
            ? 'قضية'
            : 'dossiers'
        }
        hasActiveFilters={hasAnyFilters}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      {isNotary ? (
        <KineticSlideOverInspector<NotaryDeed>
          isOpen={Boolean(activeDeed)}
          item={activeDeed}
          allItems={filteredDeeds}
          keyExtractor={(d) => d.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={
            activeDeed ? (isAr && activeDeed.titleAr ? activeDeed.titleAr : activeDeed.title) : ''
          }
          subtitle={activeDeed?.repertoireNumber}
          avatarText={activeDeed ? activeDeed.repertoireNumber.slice(-2) : 'AC'}
          branchName={
            activeDeed
              ? resolveRecordBranch(activeDeed, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel={
            activeDeed?.status === 'publie_conservation'
              ? 'Publié Conservation'
              : 'En attente publication'
          }
          tabs={[
            { id: 'decompte', label: isAr ? 'التعريفة 08-243' : 'Décompte 08-243' },
            { id: 'parties', label: isAr ? 'الأطراف' : 'Parties' },
            { id: 'cadastre', label: isAr ? 'الشهر العقاري' : 'Cadastre' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectItem={(d) => setSelectedDeed(d)}
          onClose={() => setSelectedDeed(null)}
          renderBody={(d, tab) => {
            if (tab === 'parties') {
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-700/70 space-y-1">
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">
                      {isAr ? 'البائع / المتنازل' : 'Vendeur / Cédant'}
                    </span>
                    <span className="font-semibold text-black dark:text-white block">
                      {d.parties.vendorName}
                    </span>
                    <span className="text-[10px] font-mono text-black/55 dark:text-white/55 block">
                      NIN: {d.parties.vendorNin}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-700/70 space-y-1">
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">
                      {isAr ? 'المشتري / المستفيد' : 'Acquéreur / Bénéficiaire'}
                    </span>
                    <span className="font-semibold text-black dark:text-white block">
                      {d.parties.purchaserName}
                    </span>
                    <span className="text-[10px] font-mono text-black/55 dark:text-white/55 block">
                      NIN: {d.parties.purchaserNin}
                    </span>
                  </div>
                </div>
              );
            }
            if (tab === 'cadastre') {
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-900/40 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black/60 dark:text-white/60">Volume Conservation</span>
                      <span className="font-mono font-bold text-black dark:text-white">
                        {d.conservationVolume || 'En instance'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60 dark:text-white/60">Numéro</span>
                      <span className="font-mono font-bold text-black dark:text-white">
                        {d.conservationNumber || '—'}
                      </span>
                    </div>
                    {d.cadastralReference && (
                      <div className="flex justify-between">
                        <span className="text-black/60 dark:text-white/60">Commune / Section</span>
                        <span className="font-semibold text-black dark:text-white">
                          {d.cadastralReference.commune} · Sec {d.cadastralReference.section}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-900/40 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                  <span className="font-bold text-black dark:text-white block">
                    {isAr
                      ? 'التعريفة الرسمية (المرسوم 08-243):'
                      : 'Décompte Légal Décret 08-243 :'}
                  </span>
                  <div className="flex justify-between text-black/70 dark:text-white/75">
                    <span>{isAr ? 'مبلغ المعاملة' : 'Valeur Transaction'}</span>
                    <span className="font-bold font-mono text-black dark:text-white">
                      {formatMoney(d.transactionValueDzd, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-black/70 dark:text-white/75">
                    <span>{isAr ? 'أتعاب التوثيق الخام' : 'Honoraires Notaire HT'}</span>
                    <span className="font-bold font-mono text-black dark:text-white">
                      {formatMoney(d.financials.honorairesHtDzd, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-black/70 dark:text-white/75">
                    <span>{isAr ? 'الرسم 19% TVA' : 'TVA (19%)'}</span>
                    <span className="font-bold font-mono text-[#d4522f]">
                      +{formatMoney(d.financials.tvaAmountDzd, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-black/70 dark:text-white/75">
                    <span>{isAr ? 'حقوق التسجيل والشهر' : 'Enregistrement & Publicité'}</span>
                    <span className="font-bold font-mono text-black dark:text-white">
                      +
                      {formatMoney(
                        d.financials.droitsEnregistrementDzd + d.financials.droitsPubliciteDzd,
                        language
                      )}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold text-black dark:text-white">
                    <span>{isAr ? 'إجمالي الوديعة المطلوبة' : 'Total Provision Due'}</span>
                    <span className="text-[#d4522f] font-mono">
                      {formatMoney(d.financials.totalProvisionClientDzd, language)}
                    </span>
                  </div>
                </div>
                <AtriumButton
                  variant="secondary"
                  className="w-full justify-center"
                  icon={<Printer size={14} />}
                  onClick={() => {
                    showToast(
                      isAr
                        ? 'جاري طباعة النسخة الرسمية للعقد'
                        : "Impression de la Grosse d'Acte Authentique",
                      'info'
                    );
                  }}
                >
                  {isAr ? 'طباعة النسخة الرسمية' : 'Imprimer Grosse Authentique'}
                </AtriumButton>
              </div>
            );
          }}
        />
      ) : (
        <KineticSlideOverInspector<LegalMatter>
          isOpen={Boolean(activeMatter)}
          item={activeMatter}
          allItems={filteredMatters}
          keyExtractor={(m) => m.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={
            activeMatter
              ? isAr && activeMatter.titleAr
                ? activeMatter.titleAr
                : activeMatter.title
              : ''
          }
          subtitle={`${activeMatter?.matterNumber || ''} · ${activeMatter?.courtJurisdiction || ''}`}
          avatarText={activeMatter ? activeMatter.clientName.slice(0, 2).toUpperCase() : 'LG'}
          branchName={
            activeMatter
              ? resolveRecordBranch(activeMatter, branchesById, currentBranch, language).name
              : ''
          }
          statusLabel={activeMatter?.category}
          tabs={[
            { id: 'fiche', label: isAr ? 'الملف' : 'Dossier' },
            { id: 'parties', label: isAr ? 'الأطراف' : 'Parties' },
            { id: 'carpa', label: 'CARPA' },
            { id: 'strategie', label: isAr ? 'الاستراتيجية' : 'Stratégie' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectItem={(m) => setSelectedMatter(m)}
          onClose={() => setSelectedMatter(null)}
          onDelete={(m) => {
            deleteMatter(m.id);
            showToast(isAr ? 'تم حذف القضية' : 'Dossier supprimé', 'info');
          }}
          holdToDelete
          renderBody={(m, tab) => {
            if (tab === 'parties') {
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-900/40 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        {isAr ? 'الموكل' : 'Client'}
                      </span>
                      <span className="font-bold text-black dark:text-white">{m.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        {isAr ? 'الهاتف' : 'Téléphone'}
                      </span>
                      <span className="font-mono text-black dark:text-white">
                        {m.clientPhone || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">NIN/NIF</span>
                      <span className="font-mono text-black dark:text-white">
                        {m.clientNinOrNif || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        {isAr ? 'الطرف الخصم' : 'Partie Adverse'}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {m.adversePartyName || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            if (tab === 'carpa') {
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-900/40 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        {isAr ? 'الأتعاب المتفق عليها' : 'Convention Retainer'}
                      </span>
                      <span className="font-bold font-mono text-[#d4522f]">
                        {formatMoney(m.retainerAmountDzd, language)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">
                        {isAr ? 'رصيد حساب الحراسة' : 'Solde CARPA'}
                      </span>
                      <span className="font-bold font-mono text-emerald-600">
                        {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            if (tab === 'strategie') {
              return (
                <div className="space-y-3 text-xs">
                  <span className="font-bold text-black/70 dark:text-white/75 block">
                    {isAr ? 'ملاحظات المحامي والاستراتيجية:' : 'Stratégie du Cabinet :'}
                  </span>
                  <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700 text-black/75 dark:text-white/80 leading-relaxed">
                    {m.notes ||
                      (isAr ? 'لا توجد ملاحظات مسجلة حالياً.' : 'Aucune note stratégique enregistrée.')}
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-900/40 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'الموكل' : 'Client'}
                    </span>
                    <span className="font-bold text-black dark:text-white">{m.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'المحكمة المختصة' : 'Juridiction'}
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {m.courtJurisdiction}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'الجلسة القادمة' : 'Prochaine Audience'}
                    </span>
                    <span className="font-mono font-bold text-[#d4522f]">
                      {m.nextHearingDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'الأتعاب' : 'Honoraires'}
                    </span>
                    <span className="font-bold font-mono text-black dark:text-white">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </span>
                  </div>
                </div>
                <AtriumButton
                  variant="secondary"
                  className="w-full justify-center"
                  icon={<Edit size={14} />}
                  onClick={() => {
                    setMatterToEdit(m);
                    setIsMatterModalOpen(true);
                  }}
                >
                  {isAr ? 'تعديل ملف القضية' : 'Modifier le Dossier'}
                </AtriumButton>
              </div>
            );
          }}
        />
      )}

      {isMatterModalOpen && (
        <LegalMatterModal
          isOpen={isMatterModalOpen}
          onClose={() => setIsMatterModalOpen(false)}
          onSave={matterToEdit ? updateMatter : addMatter}
          matterToEdit={matterToEdit}
        />
      )}

      {isNotaryModalOpen && (
        <NotaryDeedModal
          isOpen={isNotaryModalOpen}
          onClose={() => setIsNotaryModalOpen(false)}
          nextIndex={notaryDeeds.length + 1}
          onSaveDeed={addNotaryDeed}
        />
      )}
    </div>
  );
};
