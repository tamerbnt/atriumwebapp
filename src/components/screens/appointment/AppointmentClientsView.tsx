import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  User,
  Scissors,
  Calendar,
  Plus,
  Star,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Building2,
  Award,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentAppointmentsFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { Member } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
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

interface AppointmentClientsViewProps {
  onAddMember?: () => void;
  onEditMember?: (member: Member) => void;
}

type ClientSegmentFilter = 'all' | 'vip' | 'allergies';

export const AppointmentClientsView: React.FC<AppointmentClientsViewProps> = React.memo(
  ({ onEditMember }) => {
    const {
      members,
      appointments,
      staff,
      branches,
      currentBranch,
      language,
      isSyncing,
      networkMode,
      lastSyncedAt,
      isSyncTimeout,
    } = useAtriumSelector(
      (s) => ({
        members: selectCurrentMembersFromState(s),
        appointments: selectCurrentAppointmentsFromState(s),
        staff: selectCurrentStaffFromState(s),
        branches: s.branches,
        currentBranch: selectCurrentBranchFromState(s),
        language: s.language,
        isSyncing: s.isSyncing,
        networkMode: s.networkMode || 'online',
        lastSyncedAt: s.lastSyncedAt,
        isSyncTimeout: s.isSyncTimeout || false,
      }),
      shallowEqualObjects
    );

    const { updateMember, deleteMember, showToast, retryCloudSync } = useAtriumActions();
    const isAr = language === 'ar';
    const isEn = language === 'en';

    const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
    const [segmentFilter, setSegmentFilter] = useState<ClientSegmentFilter>('all');
    const [selectedStylistFilter, setSelectedStylistFilter] = useState('All');
    const [selectedHairFilter, setSelectedHairFilter] = useState('All');
    const [branchFilter, setBranchFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(() => new Set());
    const [pinnedClientIds, setPinnedClientIds] = useState<Set<string>>(
      () => new Set(['mem_salon_01', 'mem_salon_03'])
    );
    const [inspectingClient, setInspectingClient] = useState<Member | null>(null);
    const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
    const [drawerTab, setDrawerTab] = useState<'diagnostic' | 'formulas' | 'history' | 'preferences'>(
      'diagnostic'
    );
    const [newFormulaText, setNewFormulaText] = useState('');
    const [newFormulaStylist, setNewFormulaStylist] = useState('Sarah Louati');
    const [newFormulaNotes, setNewFormulaNotes] = useState('');

    const filterButtonRef = useRef<HTMLButtonElement | null>(null);
    const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

    const salonClients = useMemo(
      () => members.filter((m) => m.id.startsWith('mem_salon_') || Boolean(m.segmentData?.hairType)),
      [members]
    );

    const salonStylists = useMemo(
      () =>
        staff.length > 0
          ? staff
          : [
              { id: 'st_01', fullName: 'Sarah Louati', role: 'Coloriste Senior' },
              { id: 'st_02', fullName: 'Nadia Belkacem', role: 'Coiffeuse Styliste' },
              { id: 'st_03', fullName: 'Amel Mansouri', role: 'Esthéticienne Cabine' },
              { id: 'st_04', fullName: 'Lyna Cherif', role: 'Nail Artist' },
            ],
      [staff]
    );

    const metrics = useMemo(() => {
      const totalClients = salonClients.length;
      const vipCount = salonClients.filter(
        (c) => c.segmentData?.isVip || c.membershipPlanName === 'VIP'
      ).length;
      const allergiesCount = salonClients.filter(
        (c) => c.segmentData?.allergies && c.segmentData.allergies.length > 0
      ).length;
      const totalFormulasCount = salonClients.reduce(
        (sum, c) => sum + (c.segmentData?.colorFormulas?.length || 0),
        0
      );
      const totalLifetimeSpend = salonClients.reduce(
        (sum, c) => sum + (c.segmentData?.lifetimeSpent || 0),
        0
      );
      const branchCounts = new Map<string, number>();
      salonClients.forEach((c) => {
        const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
        branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
      });
      return {
        totalClients,
        vipCount,
        allergiesCount,
        totalFormulasCount,
        totalLifetimeSpend,
        vipRatio: totalClients > 0 ? Math.round((vipCount / totalClients) * 100) : 0,
        branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
          value: name,
          label: name,
          count,
        })),
      };
    }, [salonClients, branchesById, currentBranch, language]);

    const filteredClients = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      return salonClients.filter((client) => {
        if (
          segmentFilter === 'vip' &&
          !client.segmentData?.isVip &&
          client.membershipPlanName !== 'VIP'
        ) {
          return false;
        }
        if (
          segmentFilter === 'allergies' &&
          (!client.segmentData?.allergies || client.segmentData.allergies.length === 0)
        ) {
          return false;
        }
        if (
          selectedStylistFilter !== 'All' &&
          client.segmentData?.preferredStylistName !== selectedStylistFilter
        ) {
          return false;
        }
        if (selectedHairFilter !== 'All' && client.segmentData?.hairType !== selectedHairFilter) {
          return false;
        }
        if (branchFilter !== 'All') {
          const bName = resolveRecordBranch(client, branchesById, currentBranch, language).name;
          if (bName !== branchFilter) return false;
        }
        if (q) {
          const bName = resolveRecordBranch(client, branchesById, currentBranch, language).name.toLowerCase();
          const matchesName = client.fullName.toLowerCase().includes(q);
          const matchesPhone = (client.phoneNumber || '').toLowerCase().includes(q);
          const matchesAllergies = (client.segmentData?.allergies || []).some((a: string) =>
            a.toLowerCase().includes(q)
          );
          const matchesFormula = (client.segmentData?.colorFormulas || []).some((f: any) =>
            String(f.formula).toLowerCase().includes(q)
          );
          if (!matchesName && !matchesPhone && !matchesAllergies && !matchesFormula && !bName.includes(q)) {
            return false;
          }
        }
        return true;
      });
    }, [
      salonClients,
      segmentFilter,
      selectedStylistFilter,
      selectedHairFilter,
      branchFilter,
      searchQuery,
      branchesById,
      currentBranch,
      language,
    ]);

    const sortedClients = useMemo(() => {
      const sign = sortDir === 'asc' ? 1 : -1;
      return [...filteredClients].sort((a, b) => {
        const aPinned = pinnedClientIds.has(a.id) ? 0 : 1;
        const bPinned = pinnedClientIds.has(b.id) ? 0 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        if (sortBy === 'stylist') {
          return (
            (a.segmentData?.preferredStylistName || '').localeCompare(
              b.segmentData?.preferredStylistName || ''
            ) * sign
          );
        }
        if (sortBy === 'visits') {
          return ((a.segmentData?.totalVisits || 1) - (b.segmentData?.totalVisits || 1)) * sign;
        }
        if (sortBy === 'spent') {
          return ((a.segmentData?.lifetimeSpent || 0) - (b.segmentData?.lifetimeSpent || 0)) * sign;
        }
        if (sortBy === 'branch') {
          const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
          const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
          return ba.localeCompare(bb) * sign;
        }
        return a.fullName.localeCompare(b.fullName) * sign;
      });
    }, [filteredClients, pinnedClientIds, sortBy, sortDir, branchesById, currentBranch, language]);

    const handleResetFilters = useCallback(() => {
      setSegmentFilter('all');
      setSelectedStylistFilter('All');
      setSelectedHairFilter('All');
      setBranchFilter('All');
      setSearchQuery('');
      setIsFilterModalOpen(false);
    }, []);

    const hasActiveAdvancedFilters =
      selectedStylistFilter !== 'All' || selectedHairFilter !== 'All' || branchFilter !== 'All';
    const activeFiltersCount =
      (selectedStylistFilter !== 'All' ? 1 : 0) +
      (selectedHairFilter !== 'All' ? 1 : 0) +
      (branchFilter !== 'All' ? 1 : 0);

    const handleTogglePin = useCallback((idOrItem: any) => {
      const clientId = typeof idOrItem === 'string' ? idOrItem : idOrItem?.id;
      if (!clientId) return;
      setPinnedClientIds((prev) => {
        const next = new Set(prev);
        if (next.has(clientId)) next.delete(clientId);
        else next.add(clientId);
        return next;
      });
    }, []);

    const handleBatchSetVIP = useCallback(() => {
      selectedClientIds.forEach((id) => {
        const client = salonClients.find((c) => c.id === id);
        if (client) {
          updateMember(id, {
            membershipPlanName: 'VIP',
            segmentData: { ...client.segmentData, isVip: true },
          });
        }
      });
      showToast?.({
        type: 'success',
        title: isAr ? 'تم منح VIP' : 'Statut VIP attribué',
        message: `${selectedClientIds.size} ${isAr ? 'عميلة' : 'clientes VIP'}`,
      });
      setSelectedClientIds(new Set());
    }, [selectedClientIds, salonClients, updateMember, showToast, isAr]);

    const handleBatchDelete = useCallback(() => {
      selectedClientIds.forEach((id) => deleteMember(id));
      showToast?.({
        type: 'info',
        title: isAr ? 'تم حذف الملفات' : 'Dossiers supprimés',
        message: `${selectedClientIds.size} ${isAr ? 'ملفات' : 'fiches retirées'}`,
      });
      setSelectedClientIds(new Set());
    }, [selectedClientIds, deleteMember, showToast, isAr]);

    const handleAddFormula = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectingClient || !newFormulaText.trim()) return;
        const updatedFormulas = [
          {
            id: `form_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            formula: newFormulaText.trim(),
            stylist: newFormulaStylist,
            notes: newFormulaNotes.trim() || undefined,
          },
          ...(inspectingClient.segmentData?.colorFormulas || []),
        ];
        const nextSeg = { ...inspectingClient.segmentData, colorFormulas: updatedFormulas };
        updateMember(inspectingClient.id, { segmentData: nextSeg });
        setInspectingClient({ ...inspectingClient, segmentData: nextSeg });
        setNewFormulaText('');
        setNewFormulaNotes('');
        showToast?.({
          type: 'success',
          title: isAr ? 'تم حفظ الوصفة' : 'Formulation enregistrée',
          message: inspectingClient.fullName,
        });
      },
      [inspectingClient, newFormulaText, newFormulaStylist, newFormulaNotes, updateMember, showToast, isAr]
    );

    const handleExportCSV = useCallback(() => {
      const headers = [
        isAr ? 'الاسم الكامل' : 'Nom Complet',
        isAr ? 'الهاتف' : 'Téléphone',
        'Email',
        isAr ? 'نوع الشعر' : 'Type Cheveux',
        isAr ? 'المصففة' : 'Styliste Attitré',
        isAr ? 'الزيارات' : 'Visites',
        isAr ? 'الإجمالي' : 'Total Dépensé (DZD)',
        isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      ];
      const rows = sortedClients.map((c) => [
        c.fullName,
        c.phoneNumber || '',
        c.email || '',
        c.segmentData?.hairType || 'Ondulé',
        c.segmentData?.preferredStylistName || 'Sarah Louati',
        c.segmentData?.totalVisits || 1,
        c.segmentData?.lifetimeSpent || 0,
        resolveRecordBranch(c, branchesById, currentBranch, language).name,
      ]);
      downloadCsvSafe(`atrium-salon-clients-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }, [sortedClients, isAr, isEn, branchesById, currentBranch, language]);

    const statusOptions = useMemo(
      () => [
        { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: salonClients.length },
        { value: 'vip', label: 'VIP', count: metrics.vipCount },
        { value: 'allergies', label: isAr ? 'الحساسيات' : isEn ? 'Alerts' : 'Allergies', count: metrics.allergiesCount },
      ],
      [isAr, isEn, salonClients.length, metrics.vipCount, metrics.allergiesCount]
    );

    const filterSections = useMemo<KineticFilterSection[]>(
      () => [
        {
          id: 'branch',
          label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
          value: branchFilter,
          onChange: setBranchFilter,
          kind: 'tiles',
          columns: 2,
          options: [
            {
              value: 'All',
              label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
              count: salonClients.length,
            },
            ...metrics.branchOptionsWithCounts,
          ],
        },
        {
          id: 'stylist',
          label: isAr ? 'المصففة المفضلة' : isEn ? 'Preferred Stylist' : 'Styliste attitré',
          value: selectedStylistFilter,
          onChange: setSelectedStylistFilter,
          kind: 'tiles',
          columns: 2,
          options: [
            { value: 'All', label: isAr ? 'الجميع' : isEn ? 'All Stylists' : 'Toutes stylistes' },
            ...salonStylists.map((s) => ({ value: s.fullName, label: s.fullName })),
          ],
        },
        {
          id: 'hair',
          label: isAr ? 'نوع الشعر' : isEn ? 'Hair Type' : 'Nature de cheveux',
          value: selectedHairFilter,
          onChange: setSelectedHairFilter,
          kind: 'tiles',
          columns: 2,
          options: [
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous types' },
            { value: 'Lisse', label: 'Lisse' },
            { value: 'Ondulé', label: 'Ondulé' },
            { value: 'Bouclé', label: 'Bouclé' },
            { value: 'Frisé', label: 'Frisé' },
          ],
        },
        {
          id: 'segment',
          label: isAr ? 'التصنيف' : isEn ? 'Segment' : 'Segment',
          value: segmentFilter,
          onChange: (val) => setSegmentFilter(val as ClientSegmentFilter),
          kind: 'segmented',
          options: statusOptions,
        },
      ],
      [
        isAr,
        isEn,
        branchFilter,
        salonClients.length,
        metrics.branchOptionsWithCounts,
        selectedStylistFilter,
        salonStylists,
        selectedHairFilter,
        segmentFilter,
        statusOptions,
      ]
    );

    const activeChips = useMemo<ActiveFilterChip[]>(() => {
      const chips: ActiveFilterChip[] = [];
      if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
      if (selectedStylistFilter !== 'All') {
        chips.push({ key: 'stylist', label: selectedStylistFilter, onRemove: () => setSelectedStylistFilter('All') });
      }
      if (selectedHairFilter !== 'All') {
        chips.push({ key: 'hair', label: selectedHairFilter, onRemove: () => setSelectedHairFilter('All') });
      }
      return chips;
    }, [branchFilter, selectedStylistFilter, selectedHairFilter]);

    const columns: ColumnDefinition<Member>[] = useMemo(
      () => [
        {
          key: 'name',
          header: isAr ? 'الزبونة والهاتف' : isEn ? 'Client & Contact' : 'Cliente & Contact',
          sortable: true,
          renderCell: (client) => {
            const isVip = client.segmentData?.isVip || client.membershipPlanName === 'VIP';
            const hasAllergies = client.segmentData?.allergies && client.segmentData.allergies.length > 0;
            return (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">
                  {client.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13.5px] font-semibold text-black dark:text-white truncate">
                      {client.fullName}
                    </span>
                    {isVip && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        VIP
                      </span>
                    )}
                    {hasAllergies && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-black/62 dark:text-white/65 font-mono truncate block">
                    {client.phoneNumber || '—'}
                  </span>
                </div>
              </div>
            );
          },
        },
        {
          key: 'diagnostic',
          header: isAr ? 'التشخيص والوصفة' : isEn ? 'Diagnostic & Formula' : 'Diagnostic & Formule',
          sortable: false,
          renderCell: (client) => {
            const seg = client.segmentData;
            const lastFormula = seg?.colorFormulas?.[0]?.formula;
            return (
              <div className="min-w-0">
                <span className="text-[12.5px] font-semibold text-black dark:text-white block truncate">
                  {seg?.hairType || 'Ondulé'} · {seg?.hairLength || 'Mi-long'}
                </span>
                <span className="text-[11px] font-mono text-black/62 dark:text-white/65 truncate block">
                  {lastFormula || (seg?.scalpCondition || 'Normal')}
                </span>
              </div>
            );
          },
        },
        {
          key: 'stylist',
          header: isAr ? 'المصففة' : isEn ? 'Stylist' : 'Styliste',
          sortable: true,
          renderCell: (client) => (
            <div className="flex items-center gap-1.5 text-[12.5px] text-black/80 dark:text-white/85 min-w-0">
              <User size={13} className="text-[#d4522f] shrink-0" />
              <span className="truncate font-medium">
                {client.segmentData?.preferredStylistName || 'Sarah Louati'}
              </span>
            </div>
          ),
        },
        {
          key: 'spent',
          header: isAr ? 'الإنفاق التراكمي' : isEn ? 'Spend & Visits' : 'Cumul & Visites',
          sortable: true,
          renderCell: (client) => (
            <div className="tabular-nums">
              <span className="text-[12.5px] font-bold font-mono text-[#d4522f] block">
                {formatMoney(client.segmentData?.lifetimeSpent || 0)}
              </span>
              <span className="text-[11px] text-black/62 dark:text-white/65 block">
                {client.segmentData?.totalVisits || client.remainingSessions || 1} visites
              </span>
            </div>
          ),
        },
        {
          key: 'branch',
          header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
          sortable: true,
          renderCell: (client) => (
            <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
              {resolveRecordBranch(client, branchesById, currentBranch, language).name}
            </span>
          ),
        },
      ],
      [isAr, isEn, branchesById, currentBranch, language]
    );

    const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
      isLoading: isSyncing || networkMode === 'force_skeleton',
      hasCachedData: salonClients.length > 0,
    });

    if (showSkeleton && (salonClients.length === 0 || networkMode === 'force_skeleton')) {
      return (
        <SkeletonCollectionScreen
          kpiCount={3}
          columns={[
            { width: '2.5*', minWidth: '200px' },
            { width: '1.8*', minWidth: '150px' },
            { width: '1.4*', minWidth: '130px' },
            { width: '1.3*', minWidth: '120px' },
            { width: '1.2*', minWidth: '110px' },
          ]}
          viewMode={viewMode}
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          onRetry={retryCloudSync || retry}
        />
      );
    }

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200 relative">
        <ScreenHeaderBar
          icon={<Scissors size={22} />}
          title={isAr ? 'العملاء' : 'Clients'}
          primaryAction={{
            label: isAr ? 'حجز موعد' : isEn ? 'Book Appointment' : 'Prendre RDV',
            icon: <Plus size={15} strokeWidth={2.5} />,
            onClick: () => setIsNewBookingModalOpen(true),
          }}
        />

        <ScreenKpiBanner
          heading={isAr ? 'ملفات الزبونات والوصفات' : isEn ? 'Client Dossiers & VIP Loyalty' : 'Dossiers Clientes & Fidélité VIP'}
          language={language}
          primaryCard={{
            label: isAr ? 'زبونات VIP' : isEn ? 'VIP Lounge Clients' : 'Clientes VIP Lounge',
            badgeText: `↗ ${metrics.vipRatio}% VIP`,
            count: metrics.vipCount,
            tone: 'emerald',
            isActive: segmentFilter === 'vip',
            onToggle: () => setSegmentFilter((p) => (p === 'vip' ? 'all' : 'vip')),
          }}
          secondaryCard={{
            label: isAr ? 'تنبيهات الحساسية' : isEn ? 'Allergy & Safety Alerts' : 'Alertes & Sensibilités',
            badgeText: `${metrics.totalFormulasCount} formules`,
            count: metrics.allergiesCount,
            tone: 'terracotta',
            isActive: segmentFilter === 'allergies',
            onToggle: () => setSegmentFilter((p) => (p === 'allergies' ? 'all' : 'allergies')),
          }}
          darkCard={{
            label: isAr ? 'إجمالي إنفاق الزبونات' : isEn ? 'Lifetime Salon Revenue' : 'Volume Recettes Clientes',
            badgePrefix: '',
            badgeCount: metrics.totalClients,
            badgeSuffix: isAr ? 'ملفات' : 'fiches',
            valuePrefix: '',
            valueCount: metrics.totalLifetimeSpend,
            formatValue: (n) => formatMoney(n),
            caption: `${currentBranch?.name || 'Luxe Spa'} · ${isAr ? 'سجل الصالون' : 'Dossiers Salon'}`,
          }}
        />

        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'سجل الزبونات والتشخيص' : isEn ? 'Client Directory' : 'Dossiers Clientes & Diagnostics'}
            liveRegionText={`${sortedClients.length} clientes`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={
              isAr
                ? 'بحث بالاسم، الهاتف، الوصفة أو الفرع...'
                : isEn
                ? 'Search client, phone, formula, branch...'
                : 'Rechercher cliente, tel, formule, branche...'
            }
            statusOptions={statusOptions}
            statusValue={segmentFilter}
            onStatusChange={(v) => setSegmentFilter(v as ClientSegmentFilter)}
            hasActiveAdvancedFilters={hasActiveAdvancedFilters}
            activeFiltersCount={activeFiltersCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
            onExport={handleExportCSV}
            activeChips={activeChips}
            onResetAllFilters={handleResetFilters}
          />

          <UniversalDataCollection<Member>
            data={sortedClients}
            columns={columns}
            keyExtractor={(c) => c.id}
            viewMode={viewMode}
            hideToolbar
            openItemId={inspectingClient?.id ?? null}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            selectedIds={selectedClientIds}
            onSelectionChange={setSelectedClientIds}
            pinnedIds={pinnedClientIds}
            onPinToggle={handleTogglePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            onItemClick={(client, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectingClient(client);
            }}
            onViewDetails={(client, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectingClient(client);
            }}
            onEdit={(client, opener) => {
              if (onEditMember) onEditMember(client);
              else {
                setDrawerOpenerEl(opener || null);
                setInspectingClient(client);
              }
            }}
            onDelete={(client) => {
              deleteMember(client.id);
              if (inspectingClient?.id === client.id) setInspectingClient(null);
              showToast?.({ type: 'info', title: isAr ? 'تم الحذف' : 'Dossier retiré', message: client.fullName });
            }}
            bulkSecondaryAction={{
              label: isAr ? 'ترقية VIP' : 'Promouvoir VIP',
              icon: <Star size={13} />,
              onClick: handleBatchSetVIP,
              variant: 'warning',
            }}
            onBulkDelete={handleBatchDelete}
            emptyTitle={isAr ? 'لا توجد زبونات' : 'Aucun dossier cliente trouvé'}
            emptyDescription={isAr ? 'جرب تعديل الفلاتر' : 'Ajustez vos critères de recherche ou filtres.'}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveAdvancedFilters || segmentFilter !== 'all' || searchQuery.trim().length > 0}
          />
        </ScreenPod>

        <KineticFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          triggerRef={filterButtonRef}
          language={language}
          displayCount={sortedClients.length}
          entityPluralLabel={isAr ? 'زبونات' : 'clientes'}
          hasActiveFilters={hasActiveAdvancedFilters}
          onResetFilters={handleResetFilters}
          sections={filterSections}
        />

        <KineticSlideOverInspector<Member>
          isOpen={inspectingClient !== null}
          item={inspectingClient}
          allItems={sortedClients}
          keyExtractor={(c) => c.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={inspectingClient?.fullName || ''}
          subtitle={inspectingClient ? `${inspectingClient.phoneNumber || ''} · ${inspectingClient.email || 'Salon'}` : undefined}
          avatarText={inspectingClient ? inspectingClient.fullName.charAt(0).toUpperCase() : undefined}
          branchName={
            inspectingClient
              ? resolveRecordBranch(inspectingClient, branchesById, currentBranch, language).name
              : undefined
          }
          statusLabel={inspectingClient?.segmentData?.isVip ? 'VIP LOUNGE' : 'Standard'}
          statusClassName={
            inspectingClient?.segmentData?.isVip
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }
          onClose={() => setInspectingClient(null)}
          onSelectItem={(c) => setInspectingClient(c)}
          onEdit={onEditMember ? (c) => onEditMember(c) : undefined}
          holdToDelete={{
            label: isAr ? 'حذف' : 'Supprimer',
            onDelete: (c) => {
              deleteMember(c.id);
              setInspectingClient(null);
            },
          }}
          renderBody={(client) => (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-1 border-b border-[#E6DED6] dark:border-[#3A3734] pb-2 overflow-x-auto">
                {[
                  { id: 'diagnostic', label: 'Diagnostic' },
                  { id: 'formulas', label: `Formules (${client.segmentData?.colorFormulas?.length || 0})` },
                  { id: 'history', label: 'Visites' },
                  { id: 'preferences', label: 'Préférences' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                      drawerTab === tab.id
                        ? 'bg-[#d4522f]/12 text-[#d4522f]'
                        : 'text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {drawerTab === 'diagnostic' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-white">
                      Fiche Morpho-Capillaire
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">Nature cheveux</span>
                        <span className="font-semibold text-black dark:text-white">
                          {client.segmentData?.hairType || 'Ondulé'}
                        </span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">Longueur</span>
                        <span className="font-semibold text-black dark:text-white">
                          {client.segmentData?.hairLength || 'Long'}
                        </span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">Cuir Chevelu</span>
                        <span className="font-semibold text-black dark:text-white">
                          {client.segmentData?.scalpCondition || 'Sensible'}
                        </span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">Patch Test</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          {client.segmentData?.patchTestDate || '2026-09-15'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-rose-600 font-bold">
                      <AlertTriangle size={14} />
                      <span>Alertes & Allergies</span>
                    </div>
                    {client.segmentData?.allergies && client.segmentData.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {client.segmentData.allergies.map((all: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold">
                            ⚠️ {all}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-black/62 dark:text-white/65">Aucune allergie déclarée.</p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'formulas' && (
                <div className="space-y-4">
                  <form
                    onSubmit={handleAddFormula}
                    className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-3"
                  >
                    <LabelInput
                      field="Formula"
                      label="Formule exacte (dosages, oxydant, patine)"
                      value={newFormulaText}
                      onChange={setNewFormulaText}
                      placeholder="Ex: Base 6.1 (40g) + Oxy 20vol"
                      width="100%"
                      height={42}
                      corner={12}
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <LabelSelect
                        field="Stylist"
                        label="Styliste"
                        value={newFormulaStylist}
                        onChange={(val) => setNewFormulaStylist(typeof val === 'string' ? val : String(val))}
                        options={salonStylists.map((s) => ({ value: s.fullName, label: s.fullName }))}
                        height={42}
                        corner={12}
                      />
                      <LabelInput
                        field="Notes"
                        label="Temps de pose"
                        value={newFormulaNotes}
                        onChange={setNewFormulaNotes}
                        placeholder="Pose: 35 min"
                        width="100%"
                        height={42}
                        corner={12}
                      />
                    </div>
                    <AtriumButton type="submit" variant="primary" size="sm">
                      Enregistrer la Formule
                    </AtriumButton>
                  </form>
                  <div className="space-y-2">
                    {(client.segmentData?.colorFormulas || []).map((f: any) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734]"
                      >
                        <div className="flex justify-between font-semibold">
                          <span className="font-mono text-[#d4522f]">{f.formula}</span>
                          <span className="font-mono text-black/55 dark:text-white/55">{f.date}</span>
                        </div>
                        <div className="text-[11px] text-black/62 dark:text-white/65 mt-1">
                          Styliste: {f.stylist} {f.notes ? `· ${f.notes}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === 'history' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-black/62 dark:text-white/65 uppercase">Prestations</span>
                    <span className="font-mono text-[#d4522f]">
                      {formatMoney(client.segmentData?.lifetimeSpent || 0)}
                    </span>
                  </div>
                  {appointments
                    .filter((a) => a.clientName === client.fullName)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between"
                      >
                        <div>
                          <span className="font-semibold block">{apt.serviceName}</span>
                          <span className="text-[11px] text-black/62 dark:text-white/65">
                            {apt.date} à {apt.startTime} · {apt.staffName}
                          </span>
                        </div>
                        <span className="font-mono font-bold">{formatMoney(apt.price)}</span>
                      </div>
                    ))}
                </div>
              )}

              {drawerTab === 'preferences' && (
                <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Coffee size={15} className="text-amber-600" />
                    <span className="text-black/62 dark:text-white/65">Boisson:</span>
                    <span className="font-semibold">{client.segmentData?.preferredDrink || 'Café noir'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-[#d4522f]" />
                    <span className="text-black/62 dark:text-white/65">Styliste:</span>
                    <span className="font-semibold">
                      {client.segmentData?.preferredStylistName || 'Sarah Louati'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-[#d4522f]" />
                    <span className="text-black/62 dark:text-white/65">Branche:</span>
                    <span className="font-semibold">
                      {resolveRecordBranch(client, branchesById, currentBranch, language).name}
                    </span>
                  </div>
                </div>
              )}

              <AtriumButton
                type="button"
                variant="primary"
                icon={<Calendar size={14} />}
                className="w-full justify-center"
                onClick={() => {
                  setInspectingClient(null);
                  setIsNewBookingModalOpen(true);
                }}
              >
                {isAr ? 'برمجة موعد عناية' : isEn ? 'Schedule Treatment' : 'Programmer un Soin'}
              </AtriumButton>
            </div>
          )}
        />

        {isNewBookingModalOpen && (
          <AppointmentModal
            isOpen={isNewBookingModalOpen}
            onClose={() => setIsNewBookingModalOpen(false)}
          />
        )}
      </div>
    );
  }
);

AppointmentClientsView.displayName = 'AppointmentClientsView';
