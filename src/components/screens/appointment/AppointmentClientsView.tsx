import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Sparkles,
  Scissors,
  Calendar,
  CreditCard,
  Plus,
  Building2,
  ChevronDown,
  Download,
  Trash2,
  Star,
  Pin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Coffee,
  X,
  Edit2,
  Send,
  Heart,
  Droplet,
  Home,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Member } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';

interface AppointmentClientsViewProps {
  onAddMember?: () => void;
  onEditMember?: (member: Member) => void;
}

type ClientSegmentFilter = 'all' | 'vip' | 'allergies';

export const AppointmentClientsView: React.FC<AppointmentClientsViewProps> = ({
  onAddMember,
  onEditMember,
}) => {
  const {
    members,
    appointments,
    staff,
    currentBranch,
    branches,
    switchBranch,
    addMember,
    updateMember,
    deleteMember,
    resetSalonMockData,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<ClientSegmentFilter>('all');
  const [selectedStylistFilter, setSelectedStylistFilter] = useState<string>('All');
  const [selectedHairFilter, setSelectedHairFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected & pinned sets
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [pinnedClientIds, setPinnedClientIds] = useState<Set<string>>(new Set(['mem_salon_01', 'mem_salon_03']));

  // Slide-over 360° Inspector
  const [inspectingClient, setInspectingClient] = useState<Member | null>(null);
  const [drawerTab, setDrawerTab] = useState<'diagnostic' | 'formulas' | 'history' | 'preferences'>('diagnostic');

  // New color formula form in drawer
  const [newFormulaText, setNewFormulaText] = useState('');
  const [newFormulaStylist, setNewFormulaStylist] = useState('Sarah Louati');
  const [newFormulaNotes, setNewFormulaNotes] = useState('');

  // Ensure salon mock data is populated
  useEffect(() => {
    if (!members || members.length === 0 || !members.some((m) => m.id.startsWith('mem_salon_'))) {
      resetSalonMockData();
    }
  }, [members, resetSalonMockData]);

  // Salon-specific clients
  const salonClients = useMemo(() => {
    return (members || []).filter(
      (m) => m.id.startsWith('mem_salon_') || m.segmentData?.hairType
    );
  }, [members]);

  // Stylists list
  const salonStylists = useMemo(() => {
    return staff || [
      { id: 'st_01', fullName: 'Sarah Louati', role: 'Coloriste Senior' },
      { id: 'st_02', fullName: 'Nadia Belkacem', role: 'Coiffeuse Styliste' },
      { id: 'st_03', fullName: 'Amel Mansouri', role: 'Esthéticienne Cabine' },
      { id: 'st_04', fullName: 'Lyna Cherif', role: 'Nail Artist' },
    ];
  }, [staff]);

  // Metrics
  const metrics = useMemo(() => {
    const totalClients = salonClients.length;
    const vipCount = salonClients.filter((c) => c.segmentData?.isVip || c.membershipPlanName === 'VIP').length;
    const allergiesCount = salonClients.filter((c) => c.segmentData?.allergies && c.segmentData.allergies.length > 0).length;
    const totalFormulasCount = salonClients.reduce((sum, c) => sum + (c.segmentData?.colorFormulas?.length || 0), 0);
    const totalLifetimeSpend = salonClients.reduce((sum, c) => sum + (c.segmentData?.lifetimeSpent || 0), 0);
    const vipRatio = totalClients > 0 ? Math.round((vipCount / totalClients) * 100) : 0;

    return {
      totalClients,
      vipCount,
      allergiesCount,
      totalFormulasCount,
      totalLifetimeSpend,
      vipRatio,
    };
  }, [salonClients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return salonClients.filter((client) => {
      // Segment filter
      if (segmentFilter === 'vip' && !client.segmentData?.isVip && client.membershipPlanName !== 'VIP') {
        return false;
      }
      if (segmentFilter === 'allergies' && (!client.segmentData?.allergies || client.segmentData.allergies.length === 0)) {
        return false;
      }

      // Stylist filter
      if (selectedStylistFilter !== 'All') {
        if (client.segmentData?.preferredStylistName !== selectedStylistFilter) {
          return false;
        }
      }

      // Hair type filter
      if (selectedHairFilter !== 'All') {
        if (client.segmentData?.hairType !== selectedHairFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = client.fullName.toLowerCase().includes(q);
        const matchesPhone = (client.phoneNumber || '').toLowerCase().includes(q);
        const matchesAllergies = (client.segmentData?.allergies || []).some((a: string) => a.toLowerCase().includes(q));
        const matchesFormula = (client.segmentData?.colorFormulas || []).some((f: any) => f.formula.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesAllergies && !matchesFormula) {
          return false;
        }
      }

      return true;
    });
  }, [salonClients, segmentFilter, selectedStylistFilter, selectedHairFilter, searchQuery]);

  const handleTogglePin = (clientId: string) => {
    setPinnedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const handleBatchSetVIP = () => {
    selectedClientIds.forEach((id) => {
      const client = salonClients.find((c) => c.id === id);
      if (client) {
        updateMember(id, {
          membershipPlanName: 'VIP',
          segmentData: {
            ...client.segmentData,
            isVip: true,
          },
        });
      }
    });
    showToast({
      type: 'success',
      title: 'Statut VIP attribué',
      message: `${selectedClientIds.size} clientes ont été promues au statut VIP Lounge.`,
      category: 'appointment_service',
    });
    setSelectedClientIds(new Set());
  };

  const handleBatchDelete = () => {
    selectedClientIds.forEach((id) => {
      deleteMember(id);
    });
    showToast({
      type: 'info',
      title: 'Dossiers supprimés',
      message: `${selectedClientIds.size} fiches clientes ont été retirées.`,
      category: 'appointment_service',
    });
    setSelectedClientIds(new Set());
  };

  const handleAddFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingClient || !newFormulaText.trim()) return;

    const newFormula = {
      id: `form_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      formula: newFormulaText.trim(),
      stylist: newFormulaStylist,
      notes: newFormulaNotes.trim() || undefined,
    };

    const currentFormulas = inspectingClient.segmentData?.colorFormulas || [];
    const updatedFormulas = [newFormula, ...currentFormulas];

    updateMember(inspectingClient.id, {
      segmentData: {
        ...inspectingClient.segmentData,
        colorFormulas: updatedFormulas,
      },
    });

    setInspectingClient({
      ...inspectingClient,
      segmentData: {
        ...inspectingClient.segmentData,
        colorFormulas: updatedFormulas,
      },
    });

    setNewFormulaText('');
    setNewFormulaNotes('');

    showToast({
      type: 'success',
      title: 'Formulation enregistrée',
      message: `La recette technique a été ajoutée au dossier de ${inspectingClient.fullName}.`,
      category: 'appointment_service',
    });
  };

  const handleExportCSV = () => {
    const headers = ['Nom Complet', 'Téléphone', 'Email', 'Type Cheveux', 'Longueur', 'Styliste Attitré', 'Visites', 'Dépense Cumulée (DZD)', 'Allergies'];
    const rows = filteredClients.map((c) => [
      `"${c.fullName}"`,
      `"${c.phoneNumber || ''}"`,
      `"${c.email || ''}"`,
      `"${c.segmentData?.hairType || 'Ondulé'}"`,
      `"${c.segmentData?.hairLength || 'Mi-long'}"`,
      `"${c.segmentData?.preferredStylistName || 'Sarah Louati'}"`,
      c.segmentData?.totalVisits || 1,
      c.segmentData?.lifetimeSpent || 0,
      `"${(c.segmentData?.allergies || []).join('; ')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Salon_Clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Table Columns
  const columns: ColumnDefinition<Member>[] = [
    {
      key: 'name',
      header: 'Cliente & Contact',
      minWidth: '220px',
      sortable: true,
      renderCell: (client) => {
        const isVip = client.segmentData?.isVip || client.membershipPlanName === 'VIP';
        const hasAllergies = client.segmentData?.allergies && client.segmentData.allergies.length > 0;

        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
              {client.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                  {client.fullName}
                </span>
                {isVip && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    VIP
                  </span>
                )}
                {hasAllergies && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Alerte</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono truncate">
                {client.phoneNumber || 'Sans téléphone'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'diagnostic',
      header: 'Diagnostic Capillaire',
      minWidth: '180px',
      renderCell: (client) => {
        const seg = client.segmentData;
        const hairType = seg?.hairType || 'Ondulé';
        const hairLength = seg?.hairLength || 'Mi-long';
        return (
          <div className="text-xs">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
              {hairType} · {hairLength}
            </span>
            <span className="text-[10px] text-neutral-400">
              Cuir: {seg?.scalpCondition || 'Sensible'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'formula',
      header: 'Dernière Formule',
      minWidth: '200px',
      renderCell: (client) => {
        const formulas = client.segmentData?.colorFormulas;
        if (!formulas || formulas.length === 0) {
          return <span className="text-[11px] text-neutral-400 italic">Aucune formule</span>;
        }
        const lastFormula = formulas[0];
        return (
          <div className="text-xs">
            <span className="font-mono text-neutral-900 dark:text-neutral-100 font-semibold block truncate max-w-[200px]">
              {lastFormula.formula}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <span>{lastFormula.date}</span>
              <span>·</span>
              <span>{lastFormula.stylist}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'stylist',
      header: 'Styliste Attitré',
      width: '160px',
      sortable: true,
      renderCell: (client) => {
        const stylistName = client.segmentData?.preferredStylistName || 'Sarah Louati';
        return (
          <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
            <User className="w-3.5 h-3.5 text-[#C4785A]" />
            <span className="font-medium">{stylistName}</span>
          </div>
        );
      },
    },
    {
      key: 'visits',
      header: 'Visites',
      width: '110px',
      sortable: true,
      renderCell: (client) => {
        const visits = client.segmentData?.totalVisits || client.remainingSessions || 1;
        return (
          <span className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
            {visits} visites
          </span>
        );
      },
    },
    {
      key: 'spent',
      header: 'Total Dépensé (DZD)',
      width: '150px',
      sortable: true,
      renderCell: (client) => {
        const spent = client.segmentData?.lifetimeSpent || 0;
        return (
          <span className="text-xs font-bold font-mono text-[#C4785A] tabular-nums">
            {formatMoney(spent)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      renderCell: (client) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => setInspectingClient(client)}
            className="px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-[#C4785A] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-lg transition-colors cursor-pointer"
          >
            Fiche 360°
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Scissors size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  Fiches & Diagnostics Clientes
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {salonClients.length} Clientes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Dossiers capillaires complets, historique des formulations, alertes allergies et suivi VIP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Luxe Spa Hydra'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Salons & Instituts
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left rtl:text-right text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      {b.id === currentBranch?.id && <span className="text-[#C4785A] text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Data Reset */}
            <button
              type="button"
              onClick={() => resetSalonMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Restaurer les 15 dossiers clientes d'Alger"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>Démo Salon</span>
            </button>

            {/* Export CSV */}
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              icon={<Download size={14} className="text-[#C4785A]" />}
            >
              Export CSV
            </AtriumButton>

            {/* New Appointment button */}
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setIsNewBookingModalOpen(true)}
              icon={<Plus size={15} />}
            >
              Prendre RDV
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Dossiers Clientes Actives */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Fiches & Dossiers VIP
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {metrics.vipCount} clientes VIP
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {metrics.totalClients}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Star size={13} className="text-amber-500" />
                  <span>{metrics.vipRatio}% de clientes régulières VIP</span>
                </div>
              </div>
            </div>

            {/* Card 2: Formulations Chimiques & Alertes */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Formulations & Sécurité
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {metrics.totalFormulasCount} recettes
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {metrics.totalFormulasCount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  {metrics.allergiesCount > 0 ? (
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      {metrics.allergiesCount} dossier(s) avec alertes allergies
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Tolérances cutanées validées
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="bg-[#1F1D1B] rounded-[20px] p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  Volume Recettes Clientes Globales
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  Dossiers Salon
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(metrics.totalLifetimeSpend)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Award size={12} className="text-[#FB923C]" />
                    <span>Cumul historique prestations & soins</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Standardized Collection Toolbar: Left Anchor + Right Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Anchor: Icon + Title + Count Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <Scissors size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  Dossiers Clientes & Diagnostics
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {filteredClients.length}
                </span>
              </div>
            </div>

            {/* Right Controls: Segment Tabs + FilterSelects + Seek Search */}
            <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
              {/* Segment Filter Capsules */}
              <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSegmentFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    segmentFilter === 'all'
                      ? 'bg-[#C4785A] text-white shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>Toutes</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    segmentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {salonClients.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSegmentFilter('vip')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    segmentFilter === 'vip'
                      ? 'bg-[#C4785A] text-white shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>VIP</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    segmentFilter === 'vip' ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {metrics.vipCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSegmentFilter('allergies')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    segmentFilter === 'allergies'
                      ? 'bg-[#C4785A] text-white shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>Allergies</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    segmentFilter === 'allergies' ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {metrics.allergiesCount}
                  </span>
                </button>
              </div>

              <FilterSelect
                value={selectedStylistFilter}
                onChange={(val) => setSelectedStylistFilter(val?.target?.value ?? String(val))}
                options={[
                  { value: 'All', label: 'Toutes stylistes' },
                  ...salonStylists.map((s) => ({ value: s.fullName, label: s.fullName })),
                ]}
              />

              <FilterSelect
                value={selectedHairFilter}
                onChange={(val) => setSelectedHairFilter(val?.target?.value ?? String(val))}
                options={[
                  { value: 'All', label: 'Tous cheveux' },
                  { value: 'Lisse', label: 'Lisses' },
                  { value: 'Ondulé', label: 'Ondulés' },
                  { value: 'Bouclé', label: 'Bouclés' },
                  { value: 'Frisé', label: 'Frisés' },
                ]}
              />

              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Filtrer cliente, tel, allergie..."
                shutSize={34}
                openWidth={220}
              />
            </div>
          </div>

          {/* Floating Batch Action Toolbar */}
          {selectedClientIds.size > 0 && (
            <div className="p-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
                  {selectedClientIds.size}
                </span>
                <span className="text-xs font-medium">dossiers clientes sélectionnés</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchSetVIP}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-neutral-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Promouvoir VIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            <UniversalDataCollection<Member>
              items={filteredClients}
              keyExtractor={(c) => c.id}
              defaultViewMode="list"
              columns={columns}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              onItemClick={(c) => setInspectingClient(c)}
              onViewDetails={(c) => setInspectingClient(c)}
              onEdit={(c) => (onEditMember ? onEditMember(c) : setInspectingClient(c))}
              onDelete={(c) => {
                if (window.confirm(`Supprimer le dossier de ${c.fullName} ?`)) {
                  deleteMember(c.id);
                  if (inspectingClient?.id === c.id) setInspectingClient(null);
                }
              }}
              customActions={(c) => [
                {
                  id: 'book',
                  label: 'Prendre RDV',
                  icon: <Calendar size={13} />,
                  variant: 'primary',
                  onClick: () => {
                    setInspectingClient(c);
                    setIsNewBookingModalOpen(true);
                  },
                },
              ]}
              selectedIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
              isPinned={(c) => pinnedClientIds.has(c.id)}
              onTogglePin={(c) => handleTogglePin(c.id)}
              emptyTitle="Aucun dossier cliente trouvé"
              emptyDescription="Aucune cliente ne correspond aux filtres de recherche sélectionnés."
              renderCard={(client) => {
                const isPinned = pinnedClientIds.has(client.id);
                const seg = client.segmentData || {};
                return (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isPinned
                        ? 'border-[#C4785A] bg-[#C4785A]/5'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-sm flex items-center justify-center">
                          {client.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-neutral-900 dark:text-white">
                            {client.fullName}
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-mono">{client.phoneNumber}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(client.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-700">
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                        <span>Styliste attitré:</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {seg.preferredStylistName || 'Sarah Louati'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                        <span>Diagnostic:</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {seg.hairType || 'Ondulé'} · {seg.hairLength || 'Mi-long'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Total Dépensé:</span>
                        <span className="font-bold text-[#C4785A] tabular-nums font-mono">
                          {formatMoney(seg.lifetimeSpent || 0)}
                        </span>
                      </div>
                    </div>

                    {seg.colorFormulas?.[0] && (
                      <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-700/60 rounded-xl text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate">
                        🧪 {seg.colorFormulas[0].formula}
                      </div>
                    )}

                    <div className="mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">
                        {seg.totalVisits || 1} visites
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectingClient(client)}
                        className="px-3 py-1 text-xs font-semibold text-[#C4785A] hover:bg-[#C4785A]/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Voir Fiche 360°
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          </div>

        </div>

      </div>

      {/* 360° Client Slide-Over Drawer */}
      {inspectingClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#C4785A]/20 text-[#C4785A] text-lg font-bold flex items-center justify-center">
                  {inspectingClient.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                      {inspectingClient.fullName}
                    </h2>
                    {inspectingClient.segmentData?.isVip && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        VIP LOUNGE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {inspectingClient.phoneNumber} · {inspectingClient.email || 'Sans email'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingClient(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <button
                type="button"
                onClick={() => setDrawerTab('diagnostic')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'diagnostic'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Diagnostic & Sécurité
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('formulas')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'formulas'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Formulations Chimiques ({inspectingClient.segmentData?.colorFormulas?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('history')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'history'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Historique Visites
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('preferences')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'preferences'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Préférences
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerTab === 'diagnostic' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                      Fiche Morpho-Capillaire
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Nature des cheveux</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {inspectingClient.segmentData?.hairType || 'Ondulé'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Longueur</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {inspectingClient.segmentData?.hairLength || 'Long'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Cuir Chevelu</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {inspectingClient.segmentData?.scalpCondition || 'Sensible'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[11px]">Test de Tolérance (Patch)</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Validé ({inspectingClient.segmentData?.patchTestDate || '2026-09-15'})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alertes & Contre-indications Cosmétiques</span>
                    </div>
                    {inspectingClient.segmentData?.allergies && inspectingClient.segmentData.allergies.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {inspectingClient.segmentData.allergies.map((all: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-lg"
                          >
                            ⚠️ {all}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        Aucune allergie cutanée ou sensibilité déclarée par la cliente.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'formulas' && (
                <div className="space-y-5">
                  <form onSubmit={handleAddFormula} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                      Ajouter une Formulation Réalisée
                    </h3>
                    <div className="space-y-3">
                      <LabelInput
                        label="Formule exacte (Dosages, tubes, oxydant, patine)"
                        value={newFormulaText}
                        onChange={(e) => setNewFormulaText(e.target.value)}
                        placeholder="Ex: Base 6.1 (40g) + Oxy 20vol (40g) + Dialight 9.11"
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <LabelSelect
                          label="Styliste"
                          value={newFormulaStylist}
                          onChange={(val) => setNewFormulaStylist(val?.target?.value ?? String(val))}
                          options={staff.map((s) => ({ value: s.fullName, label: s.fullName }))}
                        />
                        <LabelInput
                          label="Temps de pose / Remarques"
                          value={newFormulaNotes}
                          onChange={(e) => setNewFormulaNotes(e.target.value)}
                          placeholder="Pose: 35 min"
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      <AtriumButton
                        type="submit"
                        variant="primary"
                        size="sm"
                      >
                        Enregistrer la Formule
                      </AtriumButton>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Historique des Recettes ({inspectingClient.segmentData?.colorFormulas?.length || 0})
                    </h3>
                    {(inspectingClient.segmentData?.colorFormulas || []).map((f: any) => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="font-mono text-[#C4785A] font-bold">{f.formula}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">{f.date}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                          <span>Styliste: {f.stylist}</span>
                          {f.notes && <span className="italic">{f.notes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Prestations Effectuées au Salon
                    </h3>
                    <span className="text-xs font-bold font-mono text-[#C4785A]">
                      Cumul: {formatMoney(inspectingClient.segmentData?.lifetimeSpent || 0)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {appointments
                      .filter((a) => a.clientName === inspectingClient.fullName)
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-between text-xs shadow-2xs"
                        >
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {apt.serviceName}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {apt.date} à {apt.startTime} · Styliste: {apt.staffName}
                            </span>
                          </div>
                          <span className="font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                            {formatMoney(apt.price)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {drawerTab === 'preferences' && (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Confort & Accueil Salon
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span className="text-neutral-500">Boisson Préférée:</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {inspectingClient.segmentData?.preferredDrink || 'Café noir sans sucre'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#C4785A]" />
                      <span className="text-neutral-500">Styliste Dédié:</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {inspectingClient.segmentData?.preferredStylistName || 'Sarah Louati'}
                      </span>
                    </div>
                    {inspectingClient.notes && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-[11px] text-neutral-400 block mb-1">Notes d'accueil</span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 italic">
                          "{inspectingClient.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">
                ID: {inspectingClient.id}
              </span>
              <AtriumButton
                variant="primary"
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5" />}
                onClick={() => {
                  setInspectingClient(null);
                  setIsNewBookingModalOpen(true);
                }}
              >
                Programmer un Soin
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isNewBookingModalOpen && (
        <AppointmentModal
          isOpen={isNewBookingModalOpen}
          onClose={() => setIsNewBookingModalOpen(false)}
        />
      )}
    </div>
  );
};
