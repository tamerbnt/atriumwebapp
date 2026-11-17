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
  Eye,
  Trash2,
  Phone,
  Edit2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentAppointmentsFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  showToast,
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
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

    const { updateMember, deleteMember, retryCloudSync } = useAtriumActions();
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

    const getRowMeta = useCallback(
      (client: Member): Partial<KineticRowData> => {
        const isVip = Boolean(client.segmentData?.isVip || client.membershipPlanName === 'VIP');
        const hasAllergies = Boolean(client.segmentData?.allergies && client.segmentData.allergies.length > 0);
        const branch = resolveRecordBranch(client, branchesById, currentBranch, language);
        const lastFormula = client.segmentData?.colorFormulas?.[0]?.formula;
        return {
          subline: `${client.phoneNumber || '—'} · ${client.segmentData?.preferredStylistName || 'Sarah Louati'}`,
          categoryLabel: isVip ? 'VIP LOUNGE' : client.segmentData?.hairType || 'Standard',
          statusLabel: hasAllergies
            ? isAr ? 'حساسية' : isEn ? 'Allergy Alert' : 'Alerte Allergie'
            : isVip
            ? 'VIP'
            : isAr ? 'نشطة' : isEn ? 'Active' : 'Active',
          statusVariant: hasAllergies ? 'blocked' : isVip ? 'warning' : 'active',
          metricPrimary: formatMoney(client.segmentData?.lifetimeSpent || 0),
          metricSecondary: `${client.segmentData?.totalVisits || 1} ${isAr ? 'زيارات' : 'visites'}`,
          detailCol1: {
            heading: isAr ? 'بيانات الاتصال' : isEn ? 'Contact & Branch' : 'Contact & Salon',
            primaryText: client.phoneNumber || '—',
            secondaryText: client.email || '—',
            tertiaryText: branch.name,
          },
          detailCol2: {
            heading: isAr ? 'التشخيص والوصفة' : isEn ? 'Diagnostic & Formula' : 'Diagnostic Capillaire',
            primaryText: `${client.segmentData?.hairType || 'Ondulé'} · ${client.segmentData?.hairLength || 'Mi-long'}`,
            secondaryText: lastFormula || client.segmentData?.scalpCondition || 'Cuir chevelu normal',
          },
          detailCol3: {
            heading: isAr ? 'المصففة والتنبيهات' : isEn ? 'Stylist & Alerts' : 'Styliste & Préférences',
            primaryText: client.segmentData?.preferredStylistName || 'Sarah Louati',
            secondaryText: hasAllergies
              ? `⚠️ ${client.segmentData?.allergies?.join(', ')}`
              : client.segmentData?.preferredDrink || 'Café noir',
          },
        };
      },
      [branchesById, currentBranch, language, isAr, isEn]
    );

    const getFanActions = useCallback(
      (client: Member): KineticRowFanAction[] => [
        {
          id: 'book',
          label: isAr ? 'حجز موعد' : isEn ? 'Book' : 'Prendre RDV',
          icon: <Calendar className="w-[15px] h-[15px]" />,
          onClick: () => setIsNewBookingModalOpen(true),
        },
        {
          id: 'view',
          label: isAr ? 'معاينة' : isEn ? 'Inspect' : 'Dossier',
          icon: <Eye className="w-[15px] h-[15px]" />,
          onClick: (e) => {
            setDrawerOpenerEl(e.currentTarget);
            setInspectingClient(client);
          },
        },
        {
          id: 'del',
          label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
          icon: <Trash2 className="w-[15px] h-[15px]" />,
          isDanger: true,
          onClick: () => {
            deleteMember(client.id);
            if (inspectingClient?.id === client.id) setInspectingClient(null);
            showToast?.({ type: 'info', title: isAr ? 'تم الحذف' : 'Dossier retiré', message: client.fullName });
          },
        },
      ],
      [isAr, isEn, deleteMember, inspectingClient?.id]
    );

    const getDetailActions = useCallback(
      (client: Member): KineticDetailAction[] => [
        {
          id: 'view',
          label: isAr ? 'فتح الملف' : isEn ? 'Open Dossier' : 'Fiche complète',
          icon: <Eye className="w-3.5 h-3.5" />,
          onClick: () => setInspectingClient(client),
        },
        {
          id: 'book',
          label: isAr ? 'حجز جديد' : isEn ? 'New Booking' : 'Nouveau RDV',
          icon: <Calendar className="w-3.5 h-3.5 text-[#096b40]" />,
          onClick: () => setIsNewBookingModalOpen(true),
        },
      ],
      [isAr, isEn]
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
            items={sortedClients}
            columns={columns}
            getRowMeta={getRowMeta}
            getFanActions={getFanActions}
            getDetailActions={getDetailActions}
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
          avatarText={inspectingClient ? inspectingClient.fullName.slice(0, 2).toUpperCase() : undefined}
          categoryLabel={inspectingClient?.segmentData?.hairType || 'Salon'}
          branchName={
            inspectingClient
              ? resolveRecordBranch(inspectingClient, branchesById, currentBranch, language).name
              : undefined
          }
          statusLabel={inspectingClient?.segmentData?.isVip ? 'VIP LOUNGE' : 'Standard'}
          statusClassName={
            inspectingClient?.segmentData?.isVip
              ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
              : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
          }
          tabs={[
            { id: 'overview', label: isAr ? 'التشخيص' : isEn ? 'Diagnostic' : 'Diagnostic & Accueil' },
            { id: 'formulas', label: isAr ? 'الوصفات' : isEn ? 'Formulas' : 'Formules Couleur' },
            { id: 'history', label: isAr ? 'الزيارات' : isEn ? 'Visits' : 'Visites & Notes' },
          ]}
          onClose={() => setInspectingClient(null)}
          onSelectItem={(c) => setInspectingClient(c)}
          holdToDelete
          deleteLabel={isAr ? 'حذف' : 'Supprimer'}
          onDelete={(c) => {
            deleteMember(c.id);
            setInspectingClient(null);
          }}
          renderBody={(client, activeTab) => {
            const clientAppointments = appointments.filter((a) => a.clientName === client.fullName);
            const allergies = client.segmentData?.allergies || [];
            const formulas = client.segmentData?.colorFormulas || [];
            const branchName = resolveRecordBranch(client, branchesById, currentBranch, language).name;

            if (activeTab === 'formulas') {
              return (
                <>
                  <InspectorSection index={0} title={isAr ? 'إضافة وصفة صبغة' : isEn ? 'Add Color Formula' : 'Nouvelle formulation'}>
                    <InspectorCard className="py-3.5">
                      <form onSubmit={handleAddFormula} className="space-y-3 py-1">
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
                    </InspectorCard>
                  </InspectorSection>

                  <InspectorSection index={1} title={`Historique formules (${formulas.length})`}>
                    <InspectorCard>
                      {formulas.length === 0 ? (
                        <InspectorListItem title="Aucune formulation enregistrée" subtitle="Ajoutez le dosage couleur ci-dessus" isLast />
                      ) : (
                        formulas.map((f: any, idx: number, arr: any[]) => (
                          <InspectorListItem
                            key={f.id}
                            title={f.formula}
                            subtitle={`${f.date} · Styliste: ${f.stylist}${f.notes ? ` · ${f.notes}` : ''}`}
                            badge={{ label: 'Tech', tone: 'warn' }}
                            isLast={idx === arr.length - 1}
                          />
                        ))
                      )}
                    </InspectorCard>
                  </InspectorSection>
                </>
              );
            }

            if (activeTab === 'history') {
              return (
                <>
                  <InspectorSection index={0} title="Cumul Dépenses">
                    <InspectorBigStat
                      value={formatMoney(client.segmentData?.lifetimeSpent || 0)}
                      tone="accent"
                      actionLabel={isAr ? 'برمجة موعد' : isEn ? 'Schedule Visit' : 'Programmer un Soin'}
                      onAction={() => {
                        setInspectingClient(null);
                        setIsNewBookingModalOpen(true);
                      }}
                    />
                  </InspectorSection>

                  <InspectorSection index={1} title={`Historique prestations (${clientAppointments.length})`}>
                    <InspectorCard>
                      {clientAppointments.length === 0 ? (
                        <InspectorListItem title="Aucun rendez-vous récent" subtitle="Premier dossier enregistré" isLast />
                      ) : (
                        clientAppointments.slice(0, 6).map((apt, idx, arr) => (
                          <InspectorListItem
                            key={apt.id}
                            title={apt.serviceName}
                            subtitle={`${apt.date} à ${apt.startTime} · ${apt.staffName}`}
                            trailing={formatMoney(apt.price)}
                            isLast={idx === arr.length - 1}
                          />
                        ))
                      )}
                    </InspectorCard>
                  </InspectorSection>

                  <InspectorSection index={2} title="Notes & Préférences">
                    <InspectorNotesField
                      value={client.notes || ''}
                      placeholder="Ajouter une préférence boisson, protocole cuir chevelu..."
                      onSave={(txt) => {
                        updateMember(client.id, { notes: txt });
                        showToast?.({ type: 'success', title: 'Notes enregistrées', message: client.fullName });
                      }}
                    />
                  </InspectorSection>
                </>
              );
            }

            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'book',
                        label: isAr ? 'حجز موعد' : isEn ? 'Book Care' : 'Nouveau Soin',
                        icon: <Calendar className="w-[18px] h-[18px]" />,
                        primary: true,
                        onClick: () => {
                          setInspectingClient(null);
                          setIsNewBookingModalOpen(true);
                        },
                      },
                      ...(onEditMember
                        ? [
                            {
                              id: 'edit',
                              label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                              icon: <Edit2 className="w-[18px] h-[18px]" />,
                              onClick: () => {
                                setInspectingClient(null);
                                onEditMember(client);
                              },
                            },
                          ]
                        : []),
                      {
                        id: 'vip',
                        label: client.segmentData?.isVip ? 'Retirer VIP' : 'Passer VIP',
                        icon: <Star className="w-[18px] h-[18px] text-amber-500" />,
                        onClick: () => {
                          const nextVip = !client.segmentData?.isVip;
                          const nextSeg = { ...client.segmentData, isVip: nextVip };
                          updateMember(client.id, {
                            membershipPlanName: nextVip ? 'VIP' : 'Standard',
                            segmentData: nextSeg,
                          });
                          setInspectingClient({ ...client, segmentData: nextSeg });
                        },
                      },
                      {
                        id: 'call',
                        label: isAr ? 'نسخ الهاتف' : isEn ? 'Copy Phone' : 'Copier Tél.',
                        icon: <Phone className="w-[18px] h-[18px]" />,
                        onClick: () => {
                          navigator.clipboard?.writeText(client.phoneNumber || '');
                          showToast?.({ type: 'success', title: 'Copié', message: client.phoneNumber || '—' });
                        },
                      },
                    ]}
                  />
                </InspectorSection>

                <InspectorSection index={1} title="Fiche Morpho-Capillaire">
                  <InspectorCard>
                    <InspectorKeyValue label="Nature cheveux" value={client.segmentData?.hairType || 'Ondulé'} mono={false} />
                    <InspectorKeyValue label="Longueur" value={client.segmentData?.hairLength || 'Long'} mono={false} />
                    <InspectorKeyValue label="Cuir chevelu" value={client.segmentData?.scalpCondition || 'Sensible'} mono={false} />
                    <InspectorKeyValue label="Patch Test" value={client.segmentData?.patchTestDate || '2026-09-15'} tone="ok" isLast />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection index={2} title="Préférences & Alertes">
                  <InspectorCard>
                    <InspectorKeyValue
                      label="Styliste attitrée"
                      value={client.segmentData?.preferredStylistName || 'Sarah Louati'}
                      mono={false}
                      tone="accent"
                    />
                    <InspectorKeyValue
                      label="Boisson préférée"
                      icon={<Coffee className="w-[15px] h-[15px]" />}
                      value={client.segmentData?.preferredDrink || 'Café noir'}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label="Allergies"
                      icon={<AlertTriangle className="w-[15px] h-[15px]" />}
                      value={allergies.length > 0 ? allergies.join(', ') : 'Aucune déclarée'}
                      tone={allergies.length > 0 ? 'danger' : 'ok'}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label="Branche"
                      icon={<Building2 className="w-[15px] h-[15px]" />}
                      value={branchName}
                      mono={false}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }}
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
