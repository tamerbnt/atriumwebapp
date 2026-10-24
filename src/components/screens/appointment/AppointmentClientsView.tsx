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
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStylistFilter, setSelectedStylistFilter] = useState('All');
  const [selectedHairFilter, setSelectedHairFilter] = useState('All');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Selection & Pinning State for UniversalDataCollection
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [pinnedClientIds, setPinnedClientIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('spent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Drawer & Modal State
  const [inspectingClient, setInspectingClient] = useState<Member | null>(null);
  const [drawerTab, setDrawerTab] = useState<'diagnostic' | 'formulas' | 'history' | 'preferences'>('diagnostic');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);

  // New formula form in drawer
  const [newFormulaText, setNewFormulaText] = useState('');
  const [newFormulaStylist, setNewFormulaStylist] = useState('');
  const [newFormulaNotes, setNewFormulaNotes] = useState('');

  // Auto-heal empty mock state on mount
  useEffect(() => {
    const salonClients = (members || []).filter(
      (m) => m.facilityId === (currentBranch?.id || 'branch_salon_hydra')
    );
    if (salonClients.length === 0) {
      resetSalonMockData();
    }
  }, [members, currentBranch, resetSalonMockData]);

  // Filtered clients list
  const salonClients = useMemo(() => {
    const targetBranchId = currentBranch?.id || 'branch_salon_hydra';
    return (members || []).filter((m) => {
      const matchBranch = m.facilityId === targetBranchId || (!m.facilityId && targetBranchId === 'branch_salon_hydra');
      if (!matchBranch) return false;

      const seg = m.segmentData || {};
      if (selectedStylistFilter !== 'All' && seg.preferredStylistName !== selectedStylistFilter) {
        return false;
      }
      if (selectedHairFilter !== 'All' && seg.hairType !== selectedHairFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchPhone = (m.phoneNumber || '').toLowerCase().includes(q);
        const matchEmail = (m.email || '').toLowerCase().includes(q);
        const matchFormula = (seg.colorFormulas || []).some((f: any) =>
          f.formula?.toLowerCase().includes(q)
        );
        return matchName || matchPhone || matchEmail || matchFormula;
      }

      return true;
    });
  }, [members, currentBranch, selectedStylistFilter, selectedHairFilter, searchQuery]);

  // Stylists list for filter
  const salonStylists = useMemo(() => {
    return (staff || []).filter((s) => s.isActive);
  }, [staff]);

  // Handlers
  const handleToggleSelectAll = () => {
    if (selectedClientIds.size === salonClients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(salonClients.map((c) => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClientIds(next);
  };

  const handleTogglePin = (id: string) => {
    const next = new Set(pinnedClientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPinnedClientIds(next);
  };

  const handleBatchDelete = () => {
    const count = selectedClientIds.size;
    selectedClientIds.forEach((id) => deleteMember(id));
    setSelectedClientIds(new Set());
    showToast({
      type: 'info',
      title: 'Fiches clientes supprimées',
      message: `${count} dossiers clientes ont été retirés.`,
      category: 'appointment_service',
    });
  };

  const handleBatchSetVIP = () => {
    const count = selectedClientIds.size;
    selectedClientIds.forEach((id) => {
      const client = members.find((m) => m.id === id);
      if (client) {
        updateMember(id, {
          membershipPlanName: 'VIP Salon Lounge',
          segmentData: {
            ...client.segmentData,
            isVip: true,
          },
        });
      }
    });
    setSelectedClientIds(new Set());
    showToast({
      type: 'success',
      title: 'Statut VIP attribué',
      message: `${count} clientes ont été promues au statut VIP Salon.`,
      category: 'appointment_service',
    });
  };

  const handleAddFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingClient || !newFormulaText.trim()) return;

    const currentFormulas = inspectingClient.segmentData?.colorFormulas || [];
    const newFormulaItem = {
      id: `cf_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      stylist: newFormulaStylist || staff[0]?.fullName || 'Sarah Louati',
      formula: newFormulaText.trim(),
      notes: newFormulaNotes.trim() || undefined,
    };

    const updatedSeg = {
      ...inspectingClient.segmentData,
      colorFormulas: [newFormulaItem, ...currentFormulas],
    };

    updateMember(inspectingClient.id, { segmentData: updatedSeg });
    setInspectingClient({ ...inspectingClient, segmentData: updatedSeg });
    setNewFormulaText('');
    setNewFormulaNotes('');

    showToast({
      type: 'success',
      title: 'Formulation enregistrée',
      message: `La nouvelle formule a été ajoutée au dossier de ${inspectingClient.fullName}.`,
      category: 'appointment_service',
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Nom Complet',
      'Téléphone',
      'Email',
      'Styliste Préféré',
      'Type de Cheveux',
      'Longueur',
      'Allergies',
      'Total Visites',
      'Dépenses Totales (DZD)',
    ];

    const rows = salonClients.map((c) => {
      const seg = c.segmentData || {};
      return [
        `"${c.fullName}"`,
        `"${c.phoneNumber || ''}"`,
        `"${c.email || ''}"`,
        `"${seg.preferredStylistName || ''}"`,
        `"${seg.hairType || ''}"`,
        `"${seg.hairLength || ''}"`,
        `"${(seg.allergies || []).join(', ')}"`,
        c.remainingSessions || seg.totalVisits || 0,
        seg.lifetimeSpent || 0,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clientes_salon_hydra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Export CSV réussi',
      message: `${salonClients.length} dossiers clientes exportés avec succès.`,
      category: 'appointment_service',
    });
  };

  // UniversalDataCollection column definitions
  const columns: ColumnDefinition<Member>[] = [
    {
      key: 'fullName',
      header: 'Cliente & Contact',
      sortable: true,
      renderCell: (client) => {
        const seg = client.segmentData || {};
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
              {client.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                  {client.fullName}
                </span>
                {seg.isVip && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-sm">
                    VIP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                <span className="font-mono">{client.phoneNumber}</span>
                {client.email && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[130px]">{client.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'diagnostics',
      header: 'Diagnostic Capillaire & Allergies',
      renderCell: (client) => {
        const seg = client.segmentData || {};
        const allergies = seg.allergies || [];
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
              <span className="font-medium">{seg.hairType || 'Cheveux Lisses'}</span>
              <span>·</span>
              <span className="text-neutral-500">{seg.hairLength || 'Mi-long'}</span>
            </div>
            {allergies.length > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Allergie : {allergies.join(', ')}</span>
              </div>
            ) : (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Cuir chevelu sain</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'formula',
      header: 'Dernière Formulation / Soin',
      renderCell: (client) => {
        const formulas = client.segmentData?.colorFormulas || [];
        const lastFormula = formulas[0];
        if (!lastFormula) {
          return (
            <span className="text-xs text-neutral-400 italic">
              Aucune formule enregistrée
            </span>
          );
        }
        return (
          <div className="max-w-[240px]">
            <div className="text-xs font-mono text-neutral-800 dark:text-neutral-200 truncate">
              {lastFormula.formula}
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
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
      sortable: true,
      renderCell: (client) => {
        const spent = client.segmentData?.lifetimeSpent || 0;
        return (
          <span className="text-xs font-bold text-[#C4785A] tabular-nums">
            {formatMoney(spent)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: (client) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setInspectingClient(client)}
            className="px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Fiche 360°
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Fiches & Diagnostics Clientes
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] border border-[#C4785A]/20">
              {salonClients.length} Clientes
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Dossiers capillaires complets, historique des formulations, alertes allergies et suivi VIP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Pill */}
          <div className="relative">
            <button
              onClick={() => setIsFacilityDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span className="font-semibold">{currentBranch?.name || 'Luxe Spa Hydra'}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Salons & Instituts
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBranch(b.id);
                      setIsFacilityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors ${
                      b.id === currentBranch?.id
                        ? 'text-[#C4785A] font-semibold bg-[#C4785A]/5'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{b.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 1-Click Demo Recharge */}
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => resetSalonMockData()}
            icon={<Sparkles className="w-3.5 h-3.5" />}
            title="Restaurer les 15 dossiers clientes d'Alger"
          >
            Recharger Démo
          </AtriumButton>

          {/* Export CSV */}
          <AtriumButton
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </AtriumButton>

          {/* New Appointment button */}
          <AtriumButton
            variant="primary"
            onClick={() => setIsNewBookingModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Prendre RDV
          </AtriumButton>
        </div>
      </div>

      {/* Filter and Seek Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par cliente, téléphone, allergie, formule..."
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <FilterSelect
            value={selectedStylistFilter}
            onChange={(val) => setSelectedStylistFilter(val?.target?.value ?? String(val))}
            options={[
              { value: 'All', label: 'Toutes les stylistes' },
              ...salonStylists.map((s) => ({ value: s.fullName, label: s.fullName })),
            ]}
          />

          <FilterSelect
            value={selectedHairFilter}
            onChange={(val) => setSelectedHairFilter(val?.target?.value ?? String(val))}
            options={[
              { value: 'All', label: 'Tous types de cheveux' },
              { value: 'Lisse', label: 'Cheveux Lisses' },
              { value: 'Ondulé', label: 'Cheveux Ondulés' },
              { value: 'Bouclé', label: 'Cheveux Bouclés' },
              { value: 'Frisé', label: 'Cheveux Frisés' },
            ]}
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
              onClick={handleBatchSetVIP}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-neutral-900 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Promouvoir VIP</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>

            <button
              onClick={() => setSelectedClientIds(new Set())}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* UniversalDataCollection: Client CRM */}
      <UniversalDataCollection<Member>
        items={salonClients}
        keyExtractor={(client) => client.id}
        columns={columns}
        selectedIds={selectedClientIds}
        onSelectionChange={setSelectedClientIds}
        isPinned={(client) => pinnedClientIds.has(client.id)}
        onTogglePin={(client) => handleTogglePin(client.id)}
        sortBy={sortBy}
        sortDirection={sortDir}
        onSortChange={(key) => {
          if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortBy(key);
            setSortDir('desc');
          }
        }}
        renderCard={(client) => {
          const seg = client.segmentData || {};
          const isPinned = pinnedClientIds.has(client.id);
          const isSelected = selectedClientIds.has(client.id);

          return (
            <div
              key={client.id}
              className={`p-4 rounded-2xl border transition-all relative ${
                isSelected
                  ? 'border-[#C4785A] bg-[#C4785A]/5'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
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
                  onClick={() => handleTogglePin(client.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
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
                  <span className="font-bold text-[#C4785A] tabular-nums">
                    {formatMoney(seg.lifetimeSpent || 0)}
                  </span>
                </div>
              </div>

              {seg.colorFormulas?.[0] && (
                <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate">
                  🧪 {seg.colorFormulas[0].formula}
                </div>
              )}

              <div className="mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {seg.totalVisits || 1} visites
                </span>
                <button
                  onClick={() => setInspectingClient(client)}
                  className="px-3 py-1 text-xs font-semibold text-[#C4785A] hover:bg-[#C4785A]/10 rounded-lg transition-colors"
                >
                  Voir Fiche 360°
                </button>
              </div>
            </div>
          );
        }}
      />

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
                onClick={() => setInspectingClient(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <button
                onClick={() => setDrawerTab('diagnostic')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  drawerTab === 'diagnostic'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Diagnostic & Sécurité
              </button>
              <button
                onClick={() => setDrawerTab('formulas')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  drawerTab === 'formulas'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Formulations Chimiques ({inspectingClient.segmentData?.colorFormulas?.length || 0})
              </button>
              <button
                onClick={() => setDrawerTab('history')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  drawerTab === 'history'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Historique Visites
              </button>
              <button
                onClick={() => setDrawerTab('preferences')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
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
                  {/* Add formula form */}
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

                  {/* List of existing formulas */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Historique des Recettes ({inspectingClient.segmentData?.colorFormulas?.length || 0})
                    </h3>
                    {(inspectingClient.segmentData?.colorFormulas || []).map((f: any) => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="font-mono text-[#C4785A]">{f.formula}</span>
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
                    <span className="text-xs font-bold text-[#C4785A]">
                      Cumul: {formatMoney(inspectingClient.segmentData?.lifetimeSpent || 0)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {appointments
                      .filter((a) => a.clientName === inspectingClient.fullName)
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {apt.serviceName}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {apt.date} à {apt.startTime} · Styliste: {apt.staffName}
                            </span>
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
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
