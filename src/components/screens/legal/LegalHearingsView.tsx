import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Scale,
  Gavel,
  FileText,
  CheckCircle2,
  Pin,
  Trash2,
  X,
  Check,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LegalHearing } from '../../../types';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
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

const extractStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as { target?: { value?: unknown }; value?: unknown };
    if (obj.target?.value !== undefined) return String(obj.target.value);
    if (obj.value !== undefined) return String(obj.value);
  }
  return String(v ?? '');
};

export const LegalHearingsView: React.FC<any> = () => {
  const {
    language,
    activeLegalRole,
    currentBusiness,
    currentBranch,
    currentUser,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    hearings,
    matters,
    deadlines,
    addHearing,
    updateHearing,
    deleteHearing,
    addCPCADeadline,
  } = useLegalData();

  const { showSkeleton, isTimedOut, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: hearings.length > 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [codeFilter, setCodeFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [hybridView, setHybridView] = useState<'docket' | 'register'>('docket');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['hear_01']));
  const [sortBy, setSortBy] = useState<string>('hearingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isCpcaModalOpen, setIsCpcaModalOpen] = useState(false);
  const [isNewHearingModalOpen, setIsNewHearingModalOpen] = useState(false);

  const [selectedHearing, setSelectedHearing] = useState<LegalHearing | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>('audience');

  const [formMatterId, setFormMatterId] = useState(matters[0]?.id || '');
  const [formHearingDate, setFormHearingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formHearingTime, setFormHearingTime] = useState('09:30');
  const [formCourtName, setFormCourtName] = useState("Tribunal de Sidi M'Hamed");
  const [formCourtRoom, setFormCourtRoom] = useState('Salle 04');
  const [formChamber, setFormChamber] = useState('Chambre Commerciale');
  const [formBenchJudge, setFormBenchJudge] = useState('Président Benalia');
  const [formPurpose, setFormPurpose] = useState('Plaidoirie sur le fond & communication de pièces');
  const [formPostponementCode, setFormPostponementCode] = useState('RPP');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeHearing = useMemo(() => {
    if (!selectedHearing) return null;
    return hearings.find((h) => h.id === selectedHearing.id) || selectedHearing;
  }, [selectedHearing, hearings]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    hearings.forEach((h) => {
      const b = resolveRecordBranch(h, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [hearings, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: hearings.length },
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
        count: branchCounts.get(currentBranch.id) || hearings.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, hearings.length, isAr, isEn]);

  const filteredHearings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = hearings.filter((h) => {
      if (filterCategory === 'Scheduled' && h.isCompleted) return false;
      if (filterCategory === 'Completed' && !h.isCompleted) return false;
      if (filterCategory === 'Postponed' && h.status !== 'Postponed') return false;
      if (codeFilter !== 'All' && (h.postponementCode || '') !== codeFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(h, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (q) {
        const match =
          (h.matterNumber || '').toLowerCase().includes(q) ||
          (h.matterTitle || '').toLowerCase().includes(q) ||
          (h.courtName || '').toLowerCase().includes(q) ||
          (h.benchJudge || '').toLowerCase().includes(q) ||
          (h.purpose || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'courtName') {
        cmp = (a.courtName || '').localeCompare(b.courtName || '');
      } else {
        cmp = (a.hearingDate || '').localeCompare(b.hearingDate || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    hearings,
    filterCategory,
    codeFilter,
    branchFilter,
    searchQuery,
    sortBy,
    sortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const totalScheduled = useMemo(() => hearings.filter((h) => !h.isCompleted).length, [hearings]);
  const totalPostponed = useMemo(
    () => hearings.filter((h) => h.status === 'Postponed').length,
    [hearings]
  );
  const totalCriticalDeadlines = useMemo(
    () => deadlines.filter((d) => d.status === 'approaching' || d.status === 'critical').length,
    [deadlines]
  );
  const totalCompleted = useMemo(() => hearings.filter((h) => h.isCompleted).length, [hearings]);

  const handleCreateHearing = (e: React.FormEvent) => {
    e.preventDefault();
    const matter = matters.find((m) => m.id === formMatterId);
    const newH: LegalHearing = {
      id: `hear_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterId: formMatterId,
      matterNumber: matter?.matterNumber || 'DOS-2026-AUTO',
      matterTitle: matter?.title || 'Dossier Contentieux',
      matterTitleAr: matter?.titleAr,
      hearingDate: formHearingDate,
      hearingTime: formHearingTime,
      courtName: formCourtName,
      courtRoom: formCourtRoom,
      chamber: formChamber,
      benchJudge: formBenchJudge,
      purpose: formPurpose,
      purposeAr: isAr ? 'مرافعة وتبادل المذكرات' : undefined,
      resultSummary: "En cours d'instruction",
      postponementCode: formPostponementCode,
      isCompleted: false,
      status: 'Scheduled',
    };
    addHearing(newH);
    showToast(
      isAr ? 'تمت إضافة الجلسة القضائية بنجاح' : 'Audience judiciaire programmée avec succès',
      'success'
    );
    setIsNewHearingModalOpen(false);
  };

  const togglePin = useCallback((h: LegalHearing) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(h.id)) next.delete(h.id);
      else next.add(h.id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    downloadCsvSafe(
      'atrium-legal-hearings.csv',
      ['Date', 'Heure', 'N° Dossier', 'Intitulé', 'Juridiction', 'Chambre', 'Salle', 'Code', 'Statut', 'Branche'],
      filteredHearings.map((h) => [
        h.hearingDate,
        h.hearingTime || '',
        h.matterNumber || '',
        h.matterTitle || '',
        h.courtName || '',
        h.chamber || '',
        h.courtRoom || '',
        h.postponementCode || '',
        h.isCompleted ? 'Plaidée' : 'Fixée',
        resolveRecordBranch(h, branchesById, currentBranch, language).name,
      ])
    );
    showToast(isAr ? 'تم تصدير سجل الجلسات' : 'Export des audiences généré', 'success');
  }, [filteredHearings, branchesById, currentBranch, language, isAr]);

  const hearingColumns: ColumnDefinition<LegalHearing>[] = useMemo(
    () => [
      {
        key: 'hearingDate',
        header: isAr ? 'تاريخ وساعة الجلسة' : 'Date, Heure & Salle',
        width: '2.3*',
        sortable: true,
        renderCell: (h) => (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black dark:text-white truncate">
                  {h.hearingDate} {h.hearingTime ? `à ${h.hearingTime}` : ''}
                </span>
                {pinnedIds.has(h.id) && (
                  <span className="text-[10px] text-amber-500 font-bold shrink-0">★ VIP</span>
                )}
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 font-mono mt-0.5 truncate">
                {h.courtRoom || "Salle d'Audience"} · {h.chamber || 'Chambre'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'courtName',
        header: isAr ? 'المحكمة وهيئة الحكم' : 'Juridiction & Siège',
        width: '2.4*',
        sortable: true,
        renderCell: (h) => (
          <div className="text-xs min-w-0">
            <div className="font-semibold text-black dark:text-white truncate">{h.courtName}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5 truncate">
              {h.benchJudge || 'Président de Chambre'}
            </div>
          </div>
        ),
      },
      {
        key: 'matter',
        header: isAr ? 'رقم القضية والموضوع' : 'Dossier & Objet Litige',
        width: '2.4*',
        renderCell: (h) => (
          <div className="text-xs min-w-0">
            <div className="font-bold font-mono text-[#d4522f] truncate">{h.matterNumber}</div>
            <div className="text-black/70 dark:text-white/75 truncate text-[11px] mt-0.5">
              {isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع / المكتب' : isEn ? 'Branch' : 'Branche',
        width: '1.6*',
        sortable: true,
        renderCell: (h) => {
          const br = resolveRecordBranch(h, branchesById, currentBranch, language);
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
        header: isAr ? 'الوضعية والكود' : 'Statut & Renvoi',
        width: '1.6*',
        renderCell: (h) => {
          const isDone = Boolean(h.isCompleted);
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block text-center ${
                  isDone
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                }`}
              >
                {isDone ? (isAr ? 'تمت' : 'Plaidée') : isAr ? 'مبرمجة' : 'Fixée'}
              </span>
              {h.postponementCode && (
                <span className="text-[10px] font-mono font-bold text-black/55 dark:text-white/55 text-center">
                  Code: {h.postponementCode}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [isAr, isEn, pinnedIds, branchesById, currentBranch, language]
  );

  const getCustomActions = useCallback(
    (h: LegalHearing) => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل الجلسة' : 'Fiche Audience',
        icon: <FileText size={14} />,
        onClick: () => setSelectedHearing(h),
      },
      {
        id: 'renvoi',
        label: isAr ? 'تأجيل الجلسة (RPP)' : 'Reporter (Renvoi)',
        icon: <Clock size={14} />,
        onClick: () => {
          updateHearing({
            ...h,
            postponementCode: 'RPP',
            status: 'Postponed',
            resultSummary: 'Renvoi accordé pour production de pièces adverses',
          });
          showToast(
            isAr ? 'تم تسجيل تأجيل الجلسة (RPP)' : 'Renvoi pour pièces (RPP) enregistré',
            'info'
          );
        },
      },
      {
        id: 'plead',
        label: isAr ? 'تمت المرافعة' : 'Déclarer Plaidée',
        icon: <Gavel size={14} />,
        onClick: () => {
          updateHearing({
            ...h,
            isCompleted: true,
            status: 'Attended',
            resultSummary: 'Plaidée sur le fond. En attente de délibéré.',
          });
          showToast(isAr ? 'تم تسجيل مرافعة القضية' : 'Audience plaidée avec succès', 'success');
        },
      },
      {
        id: 'delibere',
        label: isAr ? 'حجز للمداولة' : 'Mise en Délibéré',
        icon: <CheckCircle2 size={14} />,
        onClick: () => {
          updateHearing({
            ...h,
            postponementCode: 'DELIB',
            resultSummary: 'Affaire mise en délibéré pour prononcé de jugement',
          });
          showToast(isAr ? 'تم حجز القضية للمداولة' : 'Affaire mise en délibéré', 'success');
        },
      },
    ],
    [isAr, updateHearing]
  );

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'وضعية الجلسة' : "Statut de l'Audience",
        value: filterCategory,
        onChange: setFilterCategory,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'Scheduled', label: isAr ? 'مبرمجة' : 'Fixées' },
          { value: 'Postponed', label: isAr ? 'مؤجلة' : 'Renvois' },
          { value: 'Completed', label: isAr ? 'منتهية' : 'Plaidées' },
        ],
      },
      {
        id: 'code',
        label: isAr ? 'رمز التأجيل' : 'Code Renvoi',
        value: codeFilter,
        onChange: setCodeFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: hearings.length },
          {
            value: 'RPP',
            label: 'RPP (Pièces)',
            count: hearings.filter((h) => h.postponementCode === 'RPP').length,
          },
          {
            value: 'RPO',
            label: 'RPO (Observations)',
            count: hearings.filter((h) => h.postponementCode === 'RPO').length,
          },
          {
            value: 'DELIB',
            label: 'DELIB (Délibéré)',
            count: hearings.filter((h) => h.postponementCode === 'DELIB').length,
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
    ],
    [isAr, isEn, filterCategory, codeFilter, branchFilter, hearings, branchOptions]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterCategory !== 'All') {
      chips.push({
        key: 'status',
        label: filterCategory,
        onRemove: () => setFilterCategory('All'),
      });
    }
    if (codeFilter !== 'All') {
      chips.push({
        key: 'code',
        label: codeFilter,
        onRemove: () => setCodeFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const lbl = branchOptions.find((o) => o.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: lbl,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterCategory, codeFilter, branchFilter, branchOptions]);

  const activeAdvancedCount =
    (filterCategory !== 'All' ? 1 : 0) +
    (codeFilter !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('All');
    setCodeFilter('All');
    setBranchFilter('All');
  }, []);

  const hasAnyFilters = Boolean(searchQuery.trim()) || activeChips.length > 0;

  if (showSkeleton && (hearings.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  const hearingsByDate = filteredHearings.reduce<Record<string, LegalHearing[]>>((acc, h) => {
    const key = h.hearingDate || 'Non datée';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const screenTitle =
    activeLegalRole === 'notaire_titulaire'
      ? isAr
        ? 'الشهر العقاري'
        : isEn
        ? 'Registry'
        : 'Foncier'
      : activeLegalRole === 'expert_comptable'
      ? isAr
        ? 'المواعيد'
        : isEn
        ? 'Tax Dates'
        : 'Échéances'
      : activeLegalRole === 'secretaire_caisse'
      ? isAr
        ? 'التبليغ'
        : isEn
        ? 'Service Log'
        : 'Courrier'
      : isAr
      ? 'الجلسات'
      : isEn
      ? 'Hearings'
      : 'Audiences';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Scale size={22} />}
        title={screenTitle}
        subtitle={
          isAr
            ? 'رول الجلسات اليومي ومتابعة الآجال الإجرائية CPCA'
            : 'Rôle des audiences judiciaires & délais péremptoires CPCA'
        }
        secondaryActions={
          <AtriumButton
            variant="outline"
            onClick={() => setIsCpcaModalOpen(true)}
            className="flex items-center gap-2 text-xs"
            icon={<Clock size={15} />}
          >
            <span>{isAr ? 'حساب ميعاد CPCA' : 'Calculer Délai CPCA'}</span>
          </AtriumButton>
        }
        primaryAction={{
          label: isAr ? 'برمجة جلسة جديدة' : 'Nouvelle Audience',
          onClick: () => setIsNewHearingModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الرول والآجال القانونية' : "Indicateurs d'Audiencier & Délais CPCA"}
        language={language}
        primaryCard={{
          label: isAr ? 'الجلسات المبرمجة' : 'Audiences Fixées',
          badgeText: isAr ? 'مدرجة بالرول' : 'Fixées',
          count: totalScheduled,
          isActive: filterCategory === 'Scheduled',
          onToggle: () =>
            setFilterCategory((prev) => (prev === 'Scheduled' ? 'All' : 'Scheduled')),
          tone: 'emerald',
        }}
        secondaryCard={{
          label: isAr ? 'جلسات مؤجلة (Renvois)' : 'Audiences Renvoyées',
          badgeText: isAr ? 'تأجيل' : 'renvois',
          count: totalPostponed,
          isActive: filterCategory === 'Postponed',
          onToggle: () =>
            setFilterCategory((prev) => (prev === 'Postponed' ? 'All' : 'Postponed')),
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr ? 'قضايا نوقشت / قيد المداولة' : 'Affaires Plaidées & Délibérés',
          badgeCount: totalCriticalDeadlines,
          badgePrefix: '',
          badgeSuffix: isAr ? 'مواعيد CPCA' : 'délais CPCA',
          valueCount: totalCompleted,
          valuePrefix: '',
          caption: isAr
            ? 'في انتظار النطق بالحكم · مراقبة المادة 336'
            : 'En délibéré · Péremption Art. 336 surveillée',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            hybridView === 'docket'
              ? isAr
                ? 'رول الجلسات اليومي'
                : "Rôle d'Audience par Date"
              : isAr
              ? 'السجل الشامل للجلسات'
              : 'Registre Complet des Audiences'
          }
          liveRegionText={`${filteredHearings.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث برقم القضية، المحكمة، القاضي...'
              : 'Rechercher par dossier, juridiction, juge...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
            { value: 'Scheduled', label: isAr ? 'مبرمجة' : isEn ? 'Scheduled' : 'Fixées' },
            { value: 'Postponed', label: isAr ? 'مؤجلة' : isEn ? 'Postponed' : 'Renvois' },
            { value: 'Completed', label: isAr ? 'منتهية' : isEn ? 'Completed' : 'Plaidées' },
          ]}
          statusValue={filterCategory}
          onStatusChange={setFilterCategory}
          hasActiveAdvancedFilters={activeAdvancedCount > 0}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          showViewToggle={hybridView === 'register'}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          extraTrailingControls={
            <LiveSegmentedControl
              value={hybridView}
              onValueChange={(val) => setHybridView(val as 'docket' | 'register')}
              size="md"
              options={[
                {
                  id: 'docket',
                  label: isAr ? 'الجلسات' : isEn ? 'Docket' : 'Rôle',
                  tooltip: isAr ? 'رول الجلسات اليومي' : "Rôle d'Audience",
                },
                {
                  id: 'register',
                  label: isAr ? 'السجل' : isEn ? 'Registry' : 'Registre',
                  tooltip: isAr ? 'الجدول الشامل للجلسات' : 'Registre UDC complet',
                },
              ]}
            />
          }
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        {hybridView === 'docket' ? (
          <div className="space-y-5">
            {Object.keys(hearingsByDate).length === 0 ? (
              <div className="p-12 text-center bg-white/70 dark:bg-neutral-900/40 rounded-[22px] border border-dashed border-[#E6DED6] dark:border-[#33302D]">
                <Gavel size={36} className="mx-auto text-black/55 dark:text-white/55 mb-3" />
                <p className="text-sm font-semibold text-black/75 dark:text-white/80">
                  {isAr
                    ? 'لا توجد جلسات قضائية مطابقة لمعايير البحث'
                    : "Aucune audience inscrite à l'audiencier"}
                </p>
                <p className="text-xs text-black/55 dark:text-white/55 mt-1">
                  {isAr
                    ? 'قم ببرمجة جلسة جديدة أو تعديل معايير التصفية'
                    : 'Cliquez sur "Nouvelle Audience" pour inscrire une date.'}
                </p>
              </div>
            ) : (
              Object.entries(hearingsByDate).map(([date, dateHearings]) => (
                <div
                  key={date}
                  className="bg-white/80 dark:bg-neutral-900/40 rounded-[22px] p-5 border border-[#E6DED6] dark:border-[#33302D] space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-[#d4522f]" />
                      <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                        {isAr ? `جلسة يوم ${date}` : `Audience du ${date}`}
                      </h3>
                      <span className="text-xs bg-[#d4522f]/15 text-[#d4522f] font-bold px-2 py-0.5 rounded-md">
                        {dateHearings.length} {isAr ? 'قضايا' : 'dossiers'}
                      </span>
                    </div>
                    <span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                      {dateHearings[0]?.courtName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {dateHearings.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        data-no-liquid="true"
                        onClick={(e) => {
                          setSelectedHearing(h);
                          setDrawerOpenerEl(e.currentTarget);
                        }}
                        className={`w-full text-left rtl:text-right p-4 rounded-2xl bg-white dark:bg-neutral-800 border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          activeHearing?.id === h.id
                            ? 'border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm'
                            : 'border-[#E6DED6] dark:border-neutral-700 hover:border-[#d4522f]/50'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                            <span className="text-xs font-mono font-black">
                              {h.hearingTime || '09:00'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#d4522f] font-mono shrink-0">
                                {h.matterNumber}
                              </span>
                              <span className="text-black/55 dark:text-white/55">·</span>
                              <span className="text-xs font-bold text-black dark:text-white truncate">
                                {isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}
                              </span>
                            </div>
                            <div className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{h.courtRoom}</span>
                              <span>·</span>
                              <span>{h.chamber}</span>
                              <span>·</span>
                              <span className="font-medium text-black/70 dark:text-white/75">
                                {h.benchJudge}
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={10} className="text-[#d4522f]" />
                                {resolveRecordBranch(h, branchesById, currentBranch, language).name}
                              </span>
                            </div>
                            <div className="text-[11px] text-black/70 dark:text-white/75 mt-1 font-medium">
                              {isAr ? 'الهدف: ' : 'Démarche : '}
                              {h.purpose}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {h.postponementCode && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75">
                              {h.postponementCode}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              h.isCompleted
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {h.isCompleted ? (isAr ? 'تمت' : 'Plaidée') : isAr ? 'مبرمجة' : 'Fixée'}
                          </span>
                          <ArrowRight size={14} className="text-black/45 dark:text-white/45" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <UniversalDataCollection<LegalHearing>
            hideToolbar
            data={filteredHearings}
            keyExtractor={(h) => h.id}
            columns={hearingColumns}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteHearing(id));
              setSelectedIds(new Set());
              showToast(
                isAr ? 'تم حذف الجلسات المحددة' : `${ids.size} audience(s) retirée(s)`,
                'info'
              );
            }}
            isPinned={(h) => pinnedIds.has(h.id)}
            onTogglePin={togglePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
            openItemId={activeHearing?.id ?? null}
            onItemClick={(h, el) => {
              setSelectedHearing(h);
              setDrawerOpenerEl(el || null);
            }}
            onViewDetails={(h, el) => {
              setSelectedHearing(h);
              setDrawerOpenerEl(el || null);
            }}
            onDelete={(h) => {
              deleteHearing(h.id);
              if (activeHearing?.id === h.id) setSelectedHearing(null);
              showToast(isAr ? 'تم حذف الجلسة' : 'Audience retirée du rôle', 'info');
            }}
            customActions={getCustomActions}
            renderCard={(h) => (
              <div className="space-y-2 text-left rtl:text-right">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#d4522f] font-mono">
                    {h.matterNumber}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      h.isCompleted
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {h.isCompleted ? (isAr ? 'تمت' : 'Plaidée') : isAr ? 'مبرمجة' : 'Fixée'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-black dark:text-white truncate">
                  {isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}
                </h3>
                <div className="text-[11px] text-black/55 dark:text-white/55 pt-1 flex items-center justify-between">
                  <span>{h.hearingDate}</span>
                  <span className="font-mono text-black/55 dark:text-white/55">
                    {h.courtRoom}
                  </span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد جلسات' : 'Aucune audience enregistrée'}
            emptyDescription={
              isAr
                ? 'قم ببرمجة جلسة جديدة أو تعديل البحث.'
                : 'Inscrivez une audience ou réinitialisez les filtres.'
            }
            primaryActionLabel={isAr ? 'برمجة جلسة جديدة' : 'Nouvelle Audience'}
            onAddFirstItem={() => setIsNewHearingModalOpen(true)}
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
        displayCount={filteredHearings.length}
        entityPluralLabel={isAr ? 'جلسة' : 'audiences'}
        hasActiveFilters={hasAnyFilters}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<LegalHearing>
        isOpen={Boolean(activeHearing)}
        item={activeHearing}
        allItems={filteredHearings}
        keyExtractor={(h) => h.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={
          activeHearing
            ? isAr && activeHearing.matterTitleAr
              ? activeHearing.matterTitleAr
              : activeHearing.matterTitle || activeHearing.matterNumber || 'Audience'
            : ''
        }
        subtitle={`${activeHearing?.matterNumber || ''} · ${activeHearing?.hearingDate || ''} ${
          activeHearing?.hearingTime ? `à ${activeHearing.hearingTime}` : ''
        }`}
        avatarText={activeHearing?.postponementCode || 'AU'}
        branchName={
          activeHearing
            ? resolveRecordBranch(activeHearing, branchesById, currentBranch, language).name
            : ''
        }
        statusLabel={
          activeHearing?.isCompleted
            ? isAr
              ? 'تمت المرافعة'
              : 'Plaidée'
            : isAr
            ? 'مبرمجة'
            : 'Fixée'
        }
        tabs={[
          { id: 'audience', label: isAr ? 'الجلسة' : 'Audience' },
          { id: 'procedure', label: isAr ? 'الدعوى' : 'Dossier' },
          { id: 'delais', label: isAr ? 'المواعيد' : 'Délais CPCA' },
          { id: 'notes', label: isAr ? 'القرارات' : 'Renvoi' },
        ]}
        activeTab={activeInspectorTab}
        onTabChange={setActiveInspectorTab}
        onSelectItem={(h) => setSelectedHearing(h)}
        onClose={() => setSelectedHearing(null)}
        onDelete={(h) => {
          deleteHearing(h.id);
          showToast(isAr ? 'تم حذف الجلسة' : 'Audience retirée du rôle', 'info');
        }}
        holdToDelete
        renderBody={(h, tab) => {
          if (tab === 'procedure') {
            return (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                    {isAr ? 'رقم القضية والموضوع' : 'N° Dossier & Intitulé'}
                  </div>
                  <div className="font-mono font-bold text-[#d4522f] mt-1">{h.matterNumber}</div>
                  <div className="font-semibold text-black dark:text-white mt-1">
                    {isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                    {isAr ? 'الهدف من الجلسة' : 'Démarche Procédurale'}
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 mt-1 text-black/75 dark:text-white/80">
                    {h.purpose || 'Plaidoirie sur le fond'}
                  </div>
                </div>
              </div>
            );
          }
          if (tab === 'delais') {
            return (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock size={14} />
                    <span>{isAr ? 'رادار المواعيد القانونية CPCA' : 'Régime Péremptoire CPCA'}</span>
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    {isAr
                      ? 'طبقا للمادة 336 من قانون الإجراءات المدنية والإدارية، ميعاد الاستئناف محدد بـ 30 يوما مع مراعاة أيام العطل.'
                      : 'Sous réserve de notification par huissier selon CPCA Art. 336 (30 jours) avec prorogation Art. 405.'}
                  </p>
                </div>
                <AtriumButton
                  variant="outline"
                  onClick={() => setIsCpcaModalOpen(true)}
                  className="w-full text-xs flex items-center justify-center gap-2"
                >
                  <Scale size={14} />
                  <span>{isAr ? 'فتح حاسبة الآجال' : "Calculer Délai d'Appel"}</span>
                </AtriumButton>
              </div>
            );
          }
          if (tab === 'notes') {
            return (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                    {isAr ? 'قرار المحكمة ورمز التأجيل' : 'Décision / Code Renvoi'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-sm bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-black dark:text-white">
                      {h.postponementCode || 'RPP'}
                    </span>
                    <span className="text-black/60 dark:text-white/65">
                      {h.postponementCode === 'RPP'
                        ? isAr
                          ? 'تأجيل لتبادل الوثائق'
                          : 'Renvoi pour pièces'
                        : h.postponementCode === 'RPO'
                        ? isAr
                          ? 'تأجيل للإدلاء بالملاحظات'
                          : 'Renvoi pour observations'
                        : isAr
                        ? 'مداولة'
                        : 'En délibéré'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                    {isAr ? 'ملاحظات المحامي' : 'Consignes & Compte-rendu'}
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 mt-1 text-black/75 dark:text-white/80">
                    {h.resultSummary || "En attente d'audience."}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                  {isAr ? 'المحكمة والهيئة القضائية' : 'Juridiction & Siège'}
                </div>
                <div className="font-bold text-black dark:text-white mt-1">{h.courtName}</div>
                <div className="text-black/55 dark:text-white/55 mt-0.5">
                  {h.chamber} · {h.courtRoom}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700">
                <div>
                  <div className="text-[10px] text-black/55 dark:text-white/55">
                    {isAr ? 'تاريخ الجلسة' : "Date d'Audience"}
                  </div>
                  <div className="font-bold font-mono text-black dark:text-white mt-0.5">
                    {h.hearingDate}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-black/55 dark:text-white/55">
                    {isAr ? 'ساعة النداء' : "Heure d'Appel"}
                  </div>
                  <div className="font-bold font-mono text-[#d4522f] mt-0.5">
                    {h.hearingTime || '09:30'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">
                  {isAr ? 'القاضي رئيس الجلسة' : 'Magistrat du Siège'}
                </div>
                <div className="font-semibold text-black dark:text-white mt-1">
                  {h.benchJudge || 'Président de Chambre'}
                </div>
              </div>
              <div className="pt-2 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center gap-2">
                <AtriumButton
                  variant="primary"
                  onClick={() => {
                    updateHearing({
                      ...h,
                      isCompleted: true,
                      status: 'Attended',
                      resultSummary: 'Audience plaidée. Cause entendue.',
                    });
                    showToast(
                      isAr ? 'تم تسجيل مرافعة القضية' : 'Audience validée plaidée',
                      'success'
                    );
                  }}
                  className="flex-1 text-xs"
                  icon={<Check size={14} />}
                >
                  {isAr ? 'تمت المرافعة' : 'Plaidée'}
                </AtriumButton>
                <AtriumButton
                  variant="outline"
                  onClick={() => {
                    updateHearing({
                      ...h,
                      postponementCode: 'RPP',
                      status: 'Postponed',
                      resultSummary: 'Renvoi sollicité pour communication de nouvelles pièces',
                    });
                    showToast(
                      isAr ? 'تم تسجيل التأجيل (RPP)' : 'Renvoi RPP accordé',
                      'info'
                    );
                  }}
                  className="flex-1 text-xs"
                  icon={<Clock size={14} />}
                >
                  {isAr ? 'تأجيل RPP' : 'Renvoi RPP'}
                </AtriumButton>
              </div>
            </div>
          );
        }}
      />

      <CpcaDeadlineModal
        isOpen={isCpcaModalOpen}
        onClose={() => setIsCpcaModalOpen(false)}
        matters={matters}
        onSaveDeadline={(dl) => {
          addCPCADeadline(dl);
          showToast(
            isAr ? 'تم حفظ وحساب الميعاد الإجرائي بنجاح' : 'Délai CPCA armé et synchronisé',
            'success'
          );
        }}
      />

      {isNewHearingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-lg w-full p-6 shadow-xl border border-[#E6DED6] dark:border-neutral-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Gavel size={20} className="text-[#d4522f]" />
                <h3 className="text-base font-bold text-black dark:text-white">
                  {isAr
                    ? 'برمجة جلسة جديدة برول المحكمة'
                    : 'Inscrire une Audience Judiciaire'}
                </h3>
              </div>
              <button
                type="button"
                data-no-liquid="true"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsNewHearingModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHearing} className="space-y-4">
              <LabelSelect
                label={isAr ? 'ملف القضية المعنية' : 'Dossier Contentieux Associé'}
                value={formMatterId}
                onChange={(val) => setFormMatterId(extractStr(val))}
                options={matters.map((m) => ({
                  value: m.id,
                  label: `${m.matterNumber} - ${m.title}`,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'تاريخ الجلسة' : "Date d'Audience"}
                  type="date"
                  value={formHearingDate}
                  onChange={(e) => setFormHearingDate(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'ساعة النداء' : "Heure d'Appel"}
                  type="time"
                  value={formHearingTime}
                  onChange={(e) => setFormHearingTime(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'المحكمة / المجلس' : 'Juridiction / Tribunal'}
                  value={formCourtName}
                  onChange={(e) => setFormCourtName(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'قاعة الجلسة' : "Salle d'Audience"}
                  value={formCourtRoom}
                  onChange={(e) => setFormCourtRoom(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الغرفة المختصة' : 'Chambre / Section'}
                  value={formChamber}
                  onChange={(e) => setFormChamber(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'القاضي رئيس الجلسة' : 'Président du Siège'}
                  value={formBenchJudge}
                  onChange={(e) => setFormBenchJudge(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'الهدف الإجرائي من الجلسة' : 'Démarche & Objet (Plaidoirie, RPP, etc.)'}
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                required
              />

              <LabelSelect
                label={isAr ? 'رمز التأجيل الافتراضي' : 'Code de Renvoi Initiale'}
                value={formPostponementCode}
                onChange={(val) => setFormPostponementCode(extractStr(val))}
                options={[
                  { value: 'RPP', label: 'RPP - Renvoi Pour Pièces' },
                  { value: 'RPO', label: 'RPO - Renvoi Pour Observations' },
                  { value: 'DELIB', label: 'DELIB - Mise en Délibéré' },
                  { value: 'JUG', label: 'JUG - Rendu de Jugement' },
                ]}
              />

              <div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-end gap-3">
                <AtriumButton
                  variant="outline"
                  type="button"
                  onClick={() => setIsNewHearingModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تسجيل وحفظ برول المحكمة' : 'Inscrire au Rôle'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
