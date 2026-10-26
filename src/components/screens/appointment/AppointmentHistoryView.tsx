import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Sparkles,
  Printer,
  Download,
  Building2,
  ChevronDown,
  User,
  Scissors,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Pin,
  Trash2,
  FileText,
  Search,
  RefreshCw,
  X,
  History,
  Activity,
  Award,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Appointment } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';

export const AppointmentHistoryView: React.FC = () => {
  const {
    appointments,
    currentBranch,
    branches,
    switchBranch,
    deleteAppointment,
    batchDeleteAppointments,
    resetSalonMockData,
    showToast,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('All');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // UniversalDataCollection state
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [pinnedHistoryIds, setPinnedHistoryIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Receipt Modal
  const [receiptAppointment, setReceiptAppointment] = useState<Appointment | null>(null);

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!appointments || appointments.length === 0) {
      resetSalonMockData();
    }
  }, [appointments, resetSalonMockData]);

  // Completed & historical appointments
  const historyAppointments = useMemo(() => {
    return (appointments || []).filter((a) => {
      if (selectedMethodFilter !== 'All' && a.paymentMethod !== selectedMethodFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = a.clientName.toLowerCase().includes(q);
        const matchService = a.serviceName.toLowerCase().includes(q);
        const matchStaff = a.staffName.toLowerCase().includes(q);
        const matchFormula = (a.colorFormula || '').toLowerCase().includes(q);
        return matchClient || matchService || matchStaff || matchFormula;
      }
      return true;
    });
  }, [appointments, selectedMethodFilter, searchQuery]);

  // History KPIs
  const historyStats = useMemo(() => {
    const list = appointments || [];
    const totalCount = list.length;
    const completedCount = list.filter((a) => a.status === 'Completed').length;
    const totalRevenue = list.filter((a) => a.status === 'Completed').reduce((sum, a) => sum + (a.price || 0), 0);
    const formulasCount = list.filter((a) => a.colorFormula && a.colorFormula.trim().length > 0).length;

    return {
      totalCount,
      completedCount,
      totalRevenue,
      formulasCount,
    };
  }, [appointments]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Heure',
      'Client',
      'Téléphone',
      'Prestation',
      'Styliste',
      'Fauteuil / Cabine',
      'Tarif (DZD)',
      'Statut',
      'Mode de Paiement',
      'Formule Technique',
    ];

    const rows = historyAppointments.map((a) => [
      a.date,
      a.startTime,
      `"${a.clientName}"`,
      `"${a.clientPhone || ''}"`,
      `"${a.serviceName}"`,
      `"${a.staffName}"`,
      `"${a.chairId || 'Non assigné'}"`,
      a.price,
      `"${a.status}"`,
      `"${a.paymentMethod || 'Non payé'}"`,
      `"${a.colorFormula || ''}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historique_RendezVous_${currentBranch?.name || 'Salon'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Historique exporté',
      message: `${historyAppointments.length} rendez-vous exportés en CSV.`,
      category: 'appointment_service',
    });
  };

  // Columns for UniversalDataCollection
  const columns: ColumnDefinition<Appointment>[] = [
    {
      key: 'date',
      header: 'Date & Créneau',
      width: '1.6*',
      minWidth: '140px',
      sortable: true,
      renderCell: (apt) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-white font-mono block">
            {apt.date}
          </span>
          <span className="text-[11px] text-[#C4785A] font-bold font-mono">
            {apt.startTime} ({apt.durationMinutes}m)
          </span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client & Coordonnées',
      width: '2.5*',
      minWidth: '200px',
      sortable: true,
      renderCell: (apt) => (
        <div className="min-w-0">
          <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
            {apt.clientName}
          </span>
          {apt.clientPhone && (
            <span className="text-[10px] text-neutral-400 font-mono block">
              {apt.clientPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'serviceName',
      header: 'Prestation & Technique',
      width: '2.5*',
      minWidth: '200px',
      sortable: true,
      renderCell: (apt) => (
        <div className="min-w-0">
          <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block truncate">
            {apt.serviceName}
          </span>
          {apt.colorFormula && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono block truncate">
              🧪 {apt.colorFormula}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'staffName',
      header: 'Styliste',
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (apt) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate block">
          {apt.staffName}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Tarif & Règlement',
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (apt) => (
        <div className="text-xs">
          <span className="font-bold font-mono text-neutral-900 dark:text-white tabular-nums block">
            {formatMoney(apt.price)}
          </span>
          <span className="text-[10px] text-neutral-400">
            {apt.paymentMethod ? apt.paymentMethod : 'Non payé'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '1.2*',
      minWidth: '100px',
      sortable: true,
      renderCell: (apt) => {
        const isCompleted = apt.status === 'Completed';
        const isInChair = apt.status === 'InChair';

        return (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isInChair
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
            }`}
          >
            {isCompleted ? 'Terminé' : isInChair ? 'En Fauteuil' : 'Confirmé'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '1.2*',
      minWidth: '80px',
      renderCell: (apt) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setReceiptAppointment(apt)}
            className="p-1.5 text-neutral-400 hover:text-[#C4785A] hover:bg-[#FCEEE8] dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Ticket Thermique 80mm"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer le rendez-vous de ${apt.clientName} ?`)) {
                deleteAppointment(apt.id);
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <History className="text-[#C4785A]" size={26} />
              <span>Historique & Traçabilité des Rendez-vous</span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {historyStats.completedCount} Soins Réalisés
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Recherche plein texte, formules de coloration enregistrées et édition des reçus thermiques 80mm.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />}
            onClick={() => resetSalonMockData()}
          >
            Recharger Démo
          </AtriumButton>

          <AtriumButton
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </AtriumButton>
        </div>
      </div>

      {/* TOP METRICS POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF0] dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#C4785A]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Registre d'Audit & Performances Historiques
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            {currentBranch?.name || 'Salon'} · Base Certifiée
          </span>
        </div>

        {/* 3-Card Canonical Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Completed Soins */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Soins Clôturés
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  Sur {historyStats.totalCount} rés.
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {historyStats.completedCount} <span className="text-xs font-normal text-neutral-400">prestations</span>
            </div>
          </div>

          {/* Card 2: Cumulative Revenue & Formules */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Recette Réalisée
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  {historyStats.formulasCount} formules
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(historyStats.totalRevenue)}
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="bg-[#1F1D1B] rounded-[20px] p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
            {/* Glowing Sparkline Graphic */}
            <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                <path
                  d="M10 65 L35 50 L60 55 L85 25 L110 30 L135 12"
                  stroke="#FB923C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="135" cy="12" r="4" fill="#FB923C" />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-300">
                  Audit & Conformité
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                  Certifié 100%
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                {historyStats.completedCount} <span className="text-xs font-normal text-neutral-400">reçus édités</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Support Reçus 80mm</span>
              <span className="text-[#FB923C] font-semibold">Horodatage certifié</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COLLECTION POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Controls Bar: Title + Seek Search + FilterSelect */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white">
              Registre Chronologique des Prestations
            </h2>
            <p className="text-xs text-neutral-500">
              Historique complet des visites clientes avec formules et détails de règlement.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-64">
              <Seek
                placeholder="Rechercher client, formule, soin..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <FilterSelect
              value={selectedMethodFilter}
              onChange={setSelectedMethodFilter}
              options={[
                { value: 'All', label: 'Tous les paiements' },
                { value: 'Cash', label: 'Espèces' },
                { value: 'BaridiMob', label: 'BaridiMob' },
                { value: 'Dahabia_CIB', label: 'Carte CIB / Edahabia' },
                { value: 'Card', label: 'Carte bancaire' },
              ]}
              ariaLabel="Filtrer par mode de paiement"
            />
          </div>
        </div>

        {/* Inset Container hosting UniversalDataCollection */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
          <UniversalDataCollection<Appointment>
            items={historyAppointments}
            keyExtractor={(a) => a.id}
            defaultViewMode="list"
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key) => {
              if (sortBy === key) {
                setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy(key);
                setSortDir('asc');
              }
            }}
            renderCard={(apt) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {apt.date} · {apt.startTime}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        apt.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-neutral-900 dark:text-white">
                    {apt.clientName}
                  </div>
                  <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                    {apt.serviceName}
                  </div>

                  {apt.colorFormula && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono mt-1 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg">
                      🧪 {apt.colorFormula}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{apt.staffName}</span>
                  <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {formatMoney(apt.price)}
                  </span>
                </div>
              </div>
            )}
            selectedIds={selectedHistoryIds}
            onSelectionChange={setSelectedHistoryIds}
            isPinned={(a) => pinnedHistoryIds.has(a.id)}
            onTogglePin={(a) => {
              setPinnedHistoryIds((prev) => {
                const next = new Set(prev);
                if (next.has(a.id)) next.delete(a.id);
                else next.add(a.id);
                return next;
              });
            }}
            emptyTitle="Aucun historique trouvé"
            emptyDescription="Les rendez-vous terminés apparaîtront ici."
          />
        </div>
      </div>

      {/* RECEIPT MODAL 80mm */}
      {receiptAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="text-center font-mono text-xs border-b border-dashed border-neutral-300 dark:border-neutral-700 pb-3">
              <div className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                {currentBranch?.name || 'LUXE SPA HYDRA'}
              </div>
              <div className="text-[10px] text-neutral-500">Institut de Coiffure & Beauté</div>
              <div className="text-[9px] text-neutral-400 mt-1">{new Date().toLocaleString()}</div>
            </div>

            <div className="font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Client :</span>
                <span className="font-bold text-neutral-900 dark:text-white">{receiptAppointment.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Soin :</span>
                <span className="font-bold text-neutral-900 dark:text-white">{receiptAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Styliste :</span>
                <span>{receiptAppointment.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mode :</span>
                <span>{receiptAppointment.paymentMethod || 'Espèces'}</span>
              </div>

              {receiptAppointment.colorFormula && (
                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] text-neutral-600 dark:text-neutral-300">
                  Formule: {receiptAppointment.colorFormula}
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-700 flex justify-between font-black text-sm">
                <span>TOTAL PAYÉ :</span>
                <span>{formatMoney(receiptAppointment.price)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>Imprimer 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptAppointment(null)}
                className="h-9 px-4 rounded-full text-neutral-500 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
