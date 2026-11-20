import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileCheck,
  Plus,
  Printer,
  Key,
  Zap,
  Flame,
  Droplets,
  Check,
  Share2,
  MapPin,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { RealEstateInspection, BonDeVisiteRecord } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { BonDeVisiteModal } from './BonDeVisiteModal';
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
  InspectorBigStat,
  InspectorListItem,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const RealEstateInspectionsView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { inspections, visits, properties, addVisit } = useRealEstateData();

  const [mainTab, setMainTab] = useState<'inspections' | 'visits'>('inspections');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [impressionFilter, setImpressionFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('inspectionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isBonDeVisiteModalOpen, setIsBonDeVisiteModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<RealEstateInspection | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<BonDeVisiteRecord | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('constat');
  const [visitTab, setVisitTab] = useState<string>('visite');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const entryCount = useMemo(
    () => inspections.filter((i) => i.inspectionType === 'MoveIn' || i.inspectionType === 'Entry').length,
    [inspections]
  );
  const exitCount = useMemo(
    () => inspections.filter((i) => i.inspectionType === 'MoveOut' || i.inspectionType === 'Exit').length,
    [inspections]
  );

  const activeRecords = mainTab === 'inspections' ? inspections : visits;

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    activeRecords.forEach((rec) => {
      const b = resolveRecordBranch(rec, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [activeRecords, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: activeRecords.length },
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
        count: branchCounts.get(currentBranch.id) || activeRecords.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, activeRecords.length, isAr, isEn]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      const isEntry = insp.inspectionType === 'MoveIn' || insp.inspectionType === 'Entry';
      const isExit = insp.inspectionType === 'MoveOut' || insp.inspectionType === 'Exit';
      if (filterType === 'entry' && !isEntry) return false;
      if (filterType === 'exit' && !isExit) return false;
      if (filterType === 'damages' && insp.generalCondition === 'Good' && !insp.notes?.toLowerCase().includes('dégât')) {
        return false;
      }
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(insp, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(insp, branchesById, currentBranch, language);
        const matches =
          insp.propertyTitle.toLowerCase().includes(q) ||
          (insp.inspectorName || '').toLowerCase().includes(q) ||
          (insp.notes || '').toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [inspections, filterType, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedInspections = useMemo(() => {
    const list = [...filteredInspections];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'property') cmp = a.propertyTitle.localeCompare(b.propertyTitle);
      else if (sortBy === 'inspectionDate') cmp = a.inspectionDate.localeCompare(b.inspectionDate);
      else if (sortBy === 'inspector') cmp = (a.inspectorName || '').localeCompare(b.inspectorName || '');
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredInspections, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (impressionFilter !== 'All' && v.clientImpression !== impressionFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        const matches =
          v.clientFullName.toLowerCase().includes(q) ||
          v.propertyTitle.toLowerCase().includes(q) ||
          v.negotiatorName.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [visits, impressionFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const handlePrintInspection = useCallback(
    (title: string) => {
      showToast(
        isAr
          ? 'جاري تجهيز محضر معاينة الأماكن للطباعة...'
          : `Impression du procès-verbal d'état des lieux (${title})...`,
        'info'
      );
      if (typeof window !== 'undefined') window.print();
    },
    [isAr]
  );

  const handleTogglePin = useCallback((item: { id: string }) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    if (mainTab === 'inspections') {
      const headers = ['ID', 'Bien Immobilier', 'Type', 'Date', 'Inspecteur', 'Agence / Branche', 'Élec (kWh)', 'Gaz (m³)', 'Clés', 'État'];
      const rows = sortedInspections.map((insp) => {
        const b = resolveRecordBranch(insp, branchesById, currentBranch, language);
        return [
          insp.id,
          insp.propertyTitle,
          insp.inspectionType || insp.type || 'Entry',
          insp.inspectionDate,
          insp.inspectorName || '',
          b.name,
          insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0,
          insp.meterReadings?.gasM3 || insp.meterGasM3 || 0,
          insp.keysDeliveredCount || insp.keysCount || 4,
          insp.generalCondition,
        ];
      });
      downloadCsvSafe(`etats_des_lieux_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const headers = ['ID', 'Acquéreur', 'Téléphone', 'Bien Visité', 'Négociateur', 'Agence / Branche', 'Date Visite', 'Impression', 'Contre-Offre DZD'];
      const rows = filteredVisits.map((v) => {
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        return [
          v.id,
          v.clientFullName,
          v.clientPhone,
          v.propertyTitle,
          v.negotiatorName,
          b.name,
          v.visitTimestamp.slice(0, 10),
          v.clientImpression || 'Interested',
          v.counterOfferDzd || 0,
        ];
      });
      downloadCsvSafe(`bons_de_visite_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
    showToast(isAr ? 'تم التصدير بنجاح' : 'Export CSV généré avec succès', 'info');
  }, [mainTab, sortedInspections, filteredVisits, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (branchFilter !== 'All') c++;
    if (mainTab === 'visits' && impressionFilter !== 'All') c++;
    return c;
  }, [branchFilter, mainTab, impressionFilter]);

  const hasAnyFilters =
    filterType !== 'all' || impressionFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setImpressionFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (mainTab === 'inspections' && filterType !== 'all') {
      chips.push({ key: 'type', label: filterType, onRemove: () => setFilterType('all') });
    }
    if (mainTab === 'visits' && impressionFilter !== 'All') {
      chips.push({ key: 'impression', label: impressionFilter, onRemove: () => setImpressionFilter('All') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [mainTab, filterType, impressionFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const secs: KineticFilterSection[] = [];
    if (mainTab === 'visits') {
      secs.push({
        id: 'impression',
        label: isAr ? 'انطباع الزيارة' : 'Impression Visite',
        value: impressionFilter,
        onChange: setImpressionFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: visits.length },
          { value: 'Interested', label: 'Intéressé', count: visits.filter((v) => v.clientImpression === 'Interested').length },
          { value: 'NeedsNegotiation', label: 'Négociation', count: visits.filter((v) => v.clientImpression === 'NeedsNegotiation').length },
          { value: 'OfferSubmitted', label: 'Offre Ferme', count: visits.filter((v) => v.clientImpression === 'OfferSubmitted').length },
        ],
      });
    }
    secs.push({
      id: 'branch',
      label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Agence / Branche',
      value: branchFilter,
      onChange: setBranchFilter,
      kind: 'tiles',
      columns: 2,
      options: branchOptions,
    });
    return secs;
  }, [mainTab, impressionFilter, branchFilter, visits, branchOptions, isAr, isEn]);

  const inspectionColumns: ColumnDefinition<RealEstateInspection>[] = useMemo(
    () => [
      {
        key: 'property',
        header: isAr ? 'العقار' : 'Bien Immobilier',
        width: '2.6*',
        sortable: true,
        renderCell: (insp) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block truncate">{insp.propertyTitle}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">Date: {insp.inspectionDate}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: isAr ? 'النوع' : 'Type Constat',
        width: '1.3*',
        renderCell: (insp) => {
          const isEntry = insp.inspectionType === 'MoveIn' || insp.inspectionType === 'Entry';
          return (
            <span
              className={`t-small font-semibold px-2.5 py-1 rounded-full ${
                isEntry
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isEntry ? (isAr ? 'معاينة دخول' : 'Entrée') : isAr ? 'معاينة خروج' : 'Sortie'}
            </span>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (insp) => {
          const b = resolveRecordBranch(insp, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'inspector',
        header: isAr ? 'الخبير المعاين' : 'Inspecteur Mandataire',
        width: '1.8*',
        sortable: true,
        renderCell: (insp) => <span className="t-small font-medium text-black dark:text-white truncate">{insp.inspectorName}</span>,
      },
      {
        key: 'meters',
        header: isAr ? 'العدادات (سونلغاز / سيال)' : 'Index Compteurs',
        width: '1.8*',
        renderCell: (insp) => (
          <div className="tabular-nums t-cap text-black/55 dark:text-white/55 space-y-0.5">
            <div>
              Élec:{' '}
              <strong className="text-black dark:text-white">
                {insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0} kWh
              </strong>
            </div>
            <div>
              Gaz:{' '}
              <strong className="text-black dark:text-white">
                {insp.meterReadings?.gasM3 || insp.meterGasM3 || 0} m³
              </strong>
            </div>
          </div>
        ),
      },
      {
        key: 'keys',
        header: isAr ? 'المفاتيح' : 'Clés',
        width: '1.1*',
        renderCell: (insp) => (
          <span className="t-small font-semibold text-emerald-600 flex items-center gap-1">
            <Key size={12} />
            <span>{insp.keysDeliveredCount || insp.keysCount || 4} clés</span>
          </span>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const visitColumns: ColumnDefinition<BonDeVisiteRecord>[] = useMemo(
    () => [
      {
        key: 'client',
        header: isAr ? 'الزائر / المشتري' : 'Acquéreur / Visiteur',
        width: '2.2*',
        renderCell: (v) => (
          <div>
            <div className="font-semibold t-small text-black dark:text-white truncate">{v.clientFullName}</div>
            <div className="t-cap tabular-nums text-black/55 dark:text-white/55">{v.clientPhone}</div>
          </div>
        ),
      },
      {
        key: 'property',
        header: isAr ? 'العقار المزار' : 'Bien Visité',
        width: '2.6*',
        renderCell: (v) => (
          <div>
            <div className="font-semibold t-small text-black dark:text-white truncate">{v.propertyTitle}</div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">{v.propertyAddress}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (v) => {
          const b = resolveRecordBranch(v, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'gps',
        header: 'GPS & Négociateur',
        width: '1.8*',
        renderCell: (v) => (
          <div className="t-cap">
            <div className="font-medium text-black dark:text-white truncate">{v.negotiatorName}</div>
            <div className="t-cap tabular-nums text-emerald-600 dark:text-emerald-400">
              {v.gpsLatitude?.toFixed(4)}° N, {v.gpsLongitude?.toFixed(4)}° E
            </div>
          </div>
        ),
      },
      {
        key: 'impression',
        header: isAr ? 'النتيجة' : 'Impression & Offre',
        width: '1.8*',
        renderCell: (v) => (
          <div>
            <span className="inline-flex px-2 py-1 rounded-full t-small font-semibold bg-[#d4522f]/12 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
              {v.clientImpression || 'Interested'}
            </span>
            {v.counterOfferDzd && (
              <div className="t-small tabular-nums font-semibold text-black dark:text-white mt-0.5">
                {formatMoney(v.counterOfferDzd, language)}
              </div>
            )}
          </div>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: inspections.length > 0 || visits.length > 0,
  });

  if (showSkeleton && (inspections.length === 0 && visits.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
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

  const activeInspBranch = selectedInspection ? resolveRecordBranch(selectedInspection, branchesById, currentBranch, language) : null;
  const activeVisitBranch = selectedVisit ? resolveRecordBranch(selectedVisit, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<FileCheck size={22} />}
        title={isAr ? 'المعاينة' : 'Inspections & Visites'}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            <LiveSegmentedControl
              size="sm"
              value={mainTab}
              onValueChange={(v) => setMainTab(v as 'inspections' | 'visits')}
              options={[
                { value: 'inspections', label: isAr ? 'محاضر تسليم الأماكن' : 'États des Lieux', count: inspections.length },
                { value: 'visits', label: isAr ? 'وصولات المعاينة GPS' : 'Bons de Visite', count: visits.length },
              ]}
              aria-label="Mode Mémorial"
            />
            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePrintInspection('Ensemble')}
              icon={<Printer size={14} />}
            >
              {isAr ? 'طباعة محضر معاينة' : 'Imprimer Constat'}
            </AtriumButton>
          </div>
        }
        primaryAction={{
          label: isAr ? 'وصل معاينة جديد' : 'Nouveau Bon de Visite',
          onClick: () => setIsBonDeVisiteModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'إحصائيات المعاينة وسلامة العقارات' : 'Registre des Constats & Visites Certifiées'}
        language={language}
        primaryCard={{
          label: isAr ? 'محاضر المعاينة' : 'États des Lieux',
          badgeText: isAr ? 'موقعة حضورياً' : `${entryCount} entrées · ${exitCount} sorties`,
          count: inspections.length,
          tone: 'emerald',
          isActive: mainTab === 'inspections',
          onToggle: () => setMainTab('inspections'),
        }}
        secondaryCard={{
          label: isAr ? 'وصولات المعاينة GPS' : 'Bons de Visite GPS',
          badgeText: isAr ? 'موثقة بالخريطة' : 'Signature tactile',
          count: visits.length,
          tone: 'terracotta',
          isActive: mainTab === 'visits',
          onToggle: () => setMainTab('visits'),
        }}
        darkCard={{
          label: isAr ? 'الامتثال القانوني للمعاينة' : 'Conformité Réglementaire',
          badgeCount: inspections.length + visits.length,
          badgePrefix: '',
          badgeSuffix: isAr ? ' ملف' : ' actes',
          valueCount: 100,
          valuePrefix: '',
          valueSuffix: '%',
          caption: isAr ? 'محاضر وبيانات عدادات مؤرشفة' : 'Procès-verbaux & GPS archivés légalement',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            mainTab === 'inspections'
              ? isAr ? 'محاضر تسليم واستلام الأماكن' : "Registre des États des Lieux d'Entrée & Sortie"
              : isAr ? 'وصولات المعاينة الرقمية' : 'Bons de Visite Numériques & GPS'
          }
          liveRegionText={`${mainTab === 'inspections' ? sortedInspections.length : filteredVisits.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            mainTab === 'inspections'
              ? isAr ? 'بحث بالعقار، الخبير المعاين...' : 'Rechercher bien, inspecteur, notes...'
              : isAr ? 'بحث بالمشتري، العقار، المفاوض...' : 'Rechercher visiteur, bien, négociateur...'
          }
          statusOptions={
            mainTab === 'inspections'
              ? [
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: inspections.length },
                  { value: 'entry', label: isAr ? 'دخول' : 'Entrant', count: entryCount },
                  { value: 'exit', label: isAr ? 'خروج' : 'Sortant', count: exitCount },
                  { value: 'damages', label: isAr ? 'أضرار' : 'Sinistre' },
                ]
              : [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous', count: visits.length },
                  { value: 'Interested', label: 'Intéressés', count: visits.filter((v) => v.clientImpression === 'Interested').length },
                  { value: 'NeedsNegotiation', label: 'Négo.', count: visits.filter((v) => v.clientImpression === 'NeedsNegotiation').length },
                ]
          }
          statusValue={mainTab === 'inspections' ? filterType : impressionFilter}
          onStatusChange={mainTab === 'inspections' ? setFilterType : setImpressionFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        {mainTab === 'inspections' ? (
          <UniversalDataCollection
            hideToolbar
            items={sortedInspections}
            keyExtractor={(insp) => insp.id}
            defaultViewMode="list"
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={inspectionColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(insp) => pinnedIds.has(insp.id)}
            onTogglePin={handleTogglePin}
            openItemId={selectedInspection?.id}
            onItemClick={(insp, el) => {
              setSelectedVisit(null);
              setSelectedInspection(insp);
              setDrawerOpenerEl(el || null);
              setInspectorTab('constat');
            }}
            onViewDetails={(insp, el) => {
              setSelectedVisit(null);
              setSelectedInspection(insp);
              setDrawerOpenerEl(el || null);
              setInspectorTab('constat');
            }}
            getRowMeta={(insp): Partial<KineticRowData> => {
              const bInfo = resolveRecordBranch(insp, branchesById, currentBranch, language);
              const isEntry = insp.inspectionType === 'MoveIn' || insp.inspectionType === 'Entry';
              return {
                title: insp.propertyTitle,
                subline: `${insp.inspectionDate} · ${insp.inspectorName || ''}`,
                avatarText: isEntry ? 'EN' : 'SO',
                avatarColor: '#d4522f',
                categoryLabel: isEntry ? (isAr ? 'دخول' : 'Entrée') : isAr ? 'خروج' : 'Sortie',
                branchName: bInfo.name,
                branchCode: bInfo.code,
                isPinned: pinnedIds.has(insp.id),
                statusLabel: insp.generalCondition || 'Conforme',
                statusVariant: isEntry ? 'active' : 'warning',
                metricPrimary: `${insp.keysDeliveredCount || insp.keysCount || 4} clés`,
                metricSecondary: `${insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0} kWh`,
                detailCol1: { heading: isAr ? 'الخبير' : 'Inspecteur', primaryText: insp.inspectorName || '—' },
                detailCol2: { heading: 'Élec', primaryText: `${insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 0} kWh` },
                detailCol3: { heading: 'Gaz', primaryText: `${insp.meterReadings?.gasM3 || insp.meterGasM3 || 0} m³` },
              };
            }}
            getFanActions={(insp): KineticRowFanAction[] => [
              {
                id: 'print',
                label: isAr ? 'طباعة PV' : 'Imprimer PV',
                icon: <Printer size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handlePrintInspection(insp.propertyTitle);
                },
              },
              {
                id: 'validate',
                label: isAr ? 'التحقق' : 'Valider',
                icon: <Check size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  showToast(
                    isAr
                      ? `تم تأكيد مطابقة محضر المعاينة لعقار ${insp.propertyTitle}`
                      : `État des lieux validé conforme pour ${insp.propertyTitle}`,
                    'success'
                  );
                },
              },
              {
                id: 'inspect',
                label: isAr ? 'عرض' : 'Détails',
                icon: <Eye size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedVisit(null);
                  setSelectedInspection(insp);
                  setDrawerOpenerEl(e.currentTarget);
                  setInspectorTab('constat');
                },
              },
            ]}
            getDetailActions={(insp): KineticDetailAction[] => [
              {
                id: 'print',
                label: isAr ? 'طباعة PV' : 'Imprimer PV',
                icon: <Printer size={14} />,
                onClick: () => handlePrintInspection(insp.propertyTitle),
              },
              {
                id: 'validate',
                label: isAr ? 'التحقق والمطابقة' : 'Valider État',
                icon: <Check size={14} />,
                onClick: () =>
                  showToast(
                    isAr
                      ? `تم تأكيد مطابقة محضر المعاينة لعقار ${insp.propertyTitle}`
                      : `État des lieux validé conforme pour ${insp.propertyTitle}`,
                    'success'
                  ),
              },
              {
                id: 'share',
                label: isAr ? 'مشاركة المحضر' : 'Partager PV',
                icon: <Share2 size={14} />,
                onClick: () =>
                  showToast(
                    isAr ? 'تم نسخ رابط محضر المعاينة الرقمي' : 'Lien du PV d’état des lieux copié',
                    'success'
                  ),
              },
            ]}
            emptyTitle={isAr ? 'لا توجد محاضر معاينة' : 'Aucun état des lieux'}
            emptyDescription={isAr ? 'أعد ضبط المرشحات أو أضف معاينة جديدة' : 'Modifiez vos filtres pour afficher les constats'}
            onResetFilters={resetAllFilters}
            hasActiveFilters={hasAnyFilters}
          />
        ) : (
          <UniversalDataCollection
            hideToolbar
            items={filteredVisits}
            keyExtractor={(v) => v.id}
            defaultViewMode="list"
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={visitColumns}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            openItemId={selectedVisit?.id}
            onItemClick={(v, el) => {
              setSelectedInspection(null);
              setSelectedVisit(v);
              setDrawerOpenerEl(el || null);
              setVisitTab('visite');
            }}
            onViewDetails={(v, el) => {
              setSelectedInspection(null);
              setSelectedVisit(v);
              setDrawerOpenerEl(el || null);
              setVisitTab('visite');
            }}
            getRowMeta={(v): Partial<KineticRowData> => {
              const bInfo = resolveRecordBranch(v, branchesById, currentBranch, language);
              return {
                title: v.clientFullName,
                subline: `${v.propertyTitle} · ${v.clientPhone}`,
                avatarText: (v.clientFullName || 'BV').slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: v.negotiatorName,
                branchName: bInfo.name,
                branchCode: bInfo.code,
                statusLabel: v.clientImpression || 'Interested',
                statusVariant: v.clientImpression === 'OfferSubmitted' ? 'active' : 'info',
                metricPrimary: v.counterOfferDzd ? formatMoney(v.counterOfferDzd, language) : v.visitTimestamp.slice(0, 10),
                metricSecondary: `${v.gpsLatitude?.toFixed(3)}°N`,
                detailCol1: { heading: isAr ? 'المفاوض' : 'Négociateur', primaryText: v.negotiatorName },
                detailCol2: { heading: 'GPS', primaryText: `${v.gpsLatitude?.toFixed(4)}°N, ${v.gpsLongitude?.toFixed(4)}°E` },
                detailCol3: { heading: isAr ? 'التاريخ' : 'Date', primaryText: v.visitTimestamp.slice(0, 10) },
              };
            }}
            getFanActions={(v): KineticRowFanAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'عرض' : 'Détails',
                icon: <Eye size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedInspection(null);
                  setSelectedVisit(v);
                  setDrawerOpenerEl(e.currentTarget);
                  setVisitTab('visite');
                },
              },
            ]}
            getDetailActions={(v): KineticDetailAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'تفاصيل الزيارة' : 'Fiche Visite GPS',
                icon: <Eye size={14} />,
                onClick: () => {
                  setSelectedInspection(null);
                  setSelectedVisit(v);
                  setVisitTab('visite');
                },
              },
            ]}
            emptyTitle={isAr ? 'لا توجد وصولات معاينة' : 'Aucun bon de visite'}
            emptyDescription={isAr ? 'سجل أول زيارة رقمية موثقة بالـ GPS' : 'Créez un premier bon de visite numérique avec GPS'}
            primaryActionLabel={isAr ? 'وصل معاينة جديد' : 'Nouveau Bon de Visite'}
            onAddFirstItem={() => setIsBonDeVisiteModalOpen(true)}
            onResetFilters={resetAllFilters}
            hasActiveFilters={hasAnyFilters}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={mainTab === 'inspections' ? sortedInspections.length : filteredVisits.length}
        entityPluralLabel={mainTab === 'inspections' ? (isAr ? 'محضر' : 'constats') : isAr ? 'زيارة' : 'visites'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setImpressionFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(selectedInspection)}
        item={selectedInspection}
        allItems={sortedInspections}
        keyExtractor={(i) => i.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedInspection?.propertyTitle || ''}
        subtitle={selectedInspection ? `${selectedInspection.inspectionDate} · ${selectedInspection.inspectorName}` : ''}
        avatarText="ED"
        avatarColor="#d4522f"
        branchName={activeInspBranch?.name}
        statusLabel={selectedInspection?.generalCondition || 'Conforme'}
        statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]"
        tabs={[
          { id: 'constat', label: isAr ? 'المحضر والمفاتيح' : 'Constat & Clés' },
          { id: 'compteurs', label: isAr ? 'العدادات' : 'Compteurs' },
          { id: 'pieces', label: isAr ? 'حالة الغرف' : 'Pièces' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(insp) => setSelectedInspection(insp)}
        onClose={() => setSelectedInspection(null)}
        renderBody={(insp, tab) => (
          <div className="space-y-4">
            <InspectorSection index={0}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: isAr ? 'طباعة المحضر' : 'Imprimer PV',
                    icon: <Printer size={16} />,
                    primary: true,
                    onClick: () => handlePrintInspection(insp.propertyTitle),
                  },
                  {
                    id: 'share',
                    label: isAr ? 'مشاركة' : 'Partager',
                    icon: <Share2 size={16} />,
                    onClick: () =>
                      showToast(
                        isAr ? 'تم نسخ رابط محضر المعاينة الرقمي' : 'Lien du PV d’état des lieux copié',
                        'success'
                      ),
                  },
                ]}
              />
            </InspectorSection>

            {tab === 'constat' && (
              <>
                <InspectorSection index={1} title={isAr ? 'بيانات المحضر' : 'Informations sur le Constat'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Bien concerné" value={insp.propertyTitle} mono={false} />
                    <InspectorKeyValue label="Date de visite" value={insp.inspectionDate} />
                    <InspectorKeyValue label="Inspecteur agence" value={insp.inspectorName || '—'} mono={false} />
                    <InspectorKeyValue
                      label="Trousseau de clés"
                      value={`${insp.keysDeliveredCount || insp.keysCount || 4} clés remises`}
                      tone="ok"
                      isLast={!insp.notes}
                    />
                    {insp.notes && <InspectorKeyValue label="Observations" value={insp.notes} mono={false} isLast />}
                  </InspectorCard>
                </InspectorSection>
              </>
            )}

            {tab === 'compteurs' && (
              <InspectorSection index={1} title={isAr ? 'قراءة العدادات' : 'Index Compteurs Énergétiques'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label="Électricité (Sonelgaz)"
                    icon={<Zap size={14} className="text-amber-500" />}
                    value={`${insp.meterReadings?.electricKwh || insp.meterElectricityKwh || 14200} kWh`}
                  />
                  <InspectorKeyValue
                    label="Gaz Naturel"
                    icon={<Flame size={14} className="text-orange-500" />}
                    value={`${insp.meterReadings?.gasM3 || insp.meterGasM3 || 450} m³`}
                  />
                  <InspectorKeyValue
                    label="Eau (Seaal)"
                    icon={<Droplets size={14} className="text-blue-500" />}
                    value={`${insp.meterReadings?.waterM3 || insp.meterWaterM3 || 88} m³`}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'pieces' && (
              <InspectorSection index={1} title={isAr ? 'حالة الغرف' : 'État par Pièce & Équipements'}>
                <InspectorCard>
                  {[
                    { room: 'Salon & Salle à Manger', condition: 'Parfait', note: 'Murs et sols sans impact' },
                    { room: 'Cuisine Équipée', condition: 'Bon', note: 'Hotte et plaques testées fonctionnelles' },
                    { room: 'Chambre Principale', condition: 'Très Bon', note: 'Placards muraux propres' },
                    { room: 'Salle de Bain / Sanitaires', condition: 'Bon', note: 'Robinetterie et évacuations sans fuite' },
                  ].map((roomItem, i, arr) => (
                    <InspectorListItem
                      key={i}
                      title={roomItem.room}
                      subtitle={roomItem.note}
                      badge={{ label: roomItem.condition, tone: 'ok' }}
                      isLast={i === arr.length - 1}
                    />
                  ))}
                </InspectorCard>
              </InspectorSection>
            )}
          </div>
        )}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(selectedVisit)}
        item={selectedVisit}
        allItems={filteredVisits}
        keyExtractor={(v) => v.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedVisit?.clientFullName || ''}
        subtitle={selectedVisit?.propertyTitle}
        avatarText={(selectedVisit?.clientFullName || 'BV').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={activeVisitBranch?.name}
        statusLabel={selectedVisit?.clientImpression || 'Interested'}
        statusClassName="bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]"
        tabs={[
          { id: 'visite', label: 'Bon de Visite' },
          { id: 'offre', label: 'Offre & Feedback' },
          { id: 'gps', label: 'GPS & Signature' },
        ]}
        activeTab={visitTab}
        onTabChange={setVisitTab}
        onSelectItem={(v) => setSelectedVisit(v)}
        onClose={() => setSelectedVisit(null)}
        renderBody={(v, tab) => (
          <div className="space-y-4">
            <InspectorSection index={0}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: isAr ? 'طباعة الوصل' : 'Imprimer Bon',
                    icon: <Printer size={16} />,
                    primary: true,
                    onClick: () => handlePrintInspection(v.propertyTitle),
                  },
                  {
                    id: 'share',
                    label: isAr ? 'مشاركة' : 'Partager GPS',
                    icon: <Share2 size={16} />,
                    onClick: () => showToast(isAr ? 'تم نسخ إحداثيات الزيارة' : 'Bon de visite GPS partagé', 'success'),
                  },
                ]}
              />
            </InspectorSection>

            {tab === 'visite' && (
              <InspectorSection index={1} title={isAr ? 'بيانات الزائر' : 'Identité Visiteur & Bien'}>
                <InspectorCard>
                  <InspectorKeyValue label="Visiteur" value={v.clientFullName} mono={false} />
                  <InspectorKeyValue label="Téléphone" value={v.clientPhone} copyText={v.clientPhone} />
                  <InspectorKeyValue label="CNI" value={v.clientNationalId} copyText={v.clientNationalId} />
                  <InspectorKeyValue label="Bien visité" value={v.propertyTitle} mono={false} />
                  <InspectorKeyValue label="Négociateur" value={v.negotiatorName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'offre' && (
              <>
                {v.counterOfferDzd && (
                  <InspectorSection index={1} title={isAr ? 'العرض المالي' : 'Contre-Offre Client'}>
                    <InspectorBigStat
                      value={formatMoney(v.counterOfferDzd, language)}
                      tone="accent"
                      caption={v.clientImpression || 'Interested'}
                    />
                  </InspectorSection>
                )}
                <InspectorSection index={2} title={isAr ? 'الانطباع والملاحظات' : 'Feedback & Notes'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Impression" value={v.clientImpression || 'Interested'} mono={false} isLast={!v.clientFeedbackNotes} />
                    {v.clientFeedbackNotes && <InspectorKeyValue label="Notes" value={v.clientFeedbackNotes} mono={false} isLast />}
                  </InspectorCard>
                </InspectorSection>
              </>
            )}

            {tab === 'gps' && (
              <InspectorSection index={1} title={isAr ? 'التوثيق الجغرافي' : 'Géolocalisation & Signature'}>
                <InspectorCard>
                  <InspectorKeyValue label="Coordonnées GPS" value={`${v.gpsLatitude}° N, ${v.gpsLongitude}° E`} tone="ok" />
                  <InspectorKeyValue label="Horodatage" value={new Date(v.visitTimestamp).toLocaleString()} isLast />
                </InspectorCard>
                {v.signatureSvgData && (
                  <div data-sq="card" data-sq-border="solid" className="mt-3 p-3 bg-white dark:bg-[#1C1B1A] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734]">
                    <div className="t-small font-semibold text-black/60 dark:text-white/60 mb-2">Signature Certifiée</div>
                    <img src={v.signatureSvgData} alt="Signature acquéreur" className="h-24 mx-auto object-contain" />
                  </div>
                )}
              </InspectorSection>
            )}
          </div>
        )}
      />

      {isBonDeVisiteModalOpen && (
        <BonDeVisiteModal
          isOpen={isBonDeVisiteModalOpen}
          onClose={() => setIsBonDeVisiteModalOpen(false)}
          properties={properties}
          onSave={(visit) => {
            addVisit(visit);
            showToast(
              isAr ? 'تم توثيق وصل المعاينة بنجاح' : 'Bon de visite certifié avec géolocalisation',
              'success'
            );
            setIsBonDeVisiteModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
