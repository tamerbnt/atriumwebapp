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

  const handleToggleSelectAll = () => {
    if (selectedHistoryIds.size === historyAppointments.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(historyAppointments.map((a) => a.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedHistoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedHistoryIds(next);
  };

  const handleTogglePin = (id: string) => {
    const next = new Set(pinnedHistoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPinnedHistoryIds(next);
  };

  const handleBatchDelete = () => {
    const count = selectedHistoryIds.size;
    batchDeleteAppointments(Array.from(selectedHistoryIds));
    setSelectedHistoryIds(new Set());
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Heure',
      'Cliente',
      'Téléphone',
      'Prestation',
      'Styliste',
      'Formule / Remarques',
      'Mode de Règlement',
      'Montant Encaissé (DZD)',
    ];

    const rows = historyAppointments.map((a) => [
      `"${a.date}"`,
      `"${a.startTime}"`,
      `"${a.clientName}"`,
      `"${a.clientPhone}"`,
      `"${a.serviceName}"`,
      `"${a.staffName}"`,
      `"${(a.colorFormula || a.notes || '').replace(/"/g, '""')}"`,
      `"${a.paymentMethod || 'Espèces'}"`,
      a.price,
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historique_soins_salon_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Historique des soins exporté',
      message: `${historyAppointments.length} fiches d'historique exportées en CSV.`,
      category: 'appointment_service',
    });
  };

  // Columns definition for UniversalDataCollection
  const columns: ColumnDefinition<Appointment>[] = [
    {
      key: 'date',
      header: 'Date & Horodatage',
      sortable: true,
      renderCell: (apt) => (
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center font-mono shrink-0">
            <span className="text-[11px] font-bold text-neutral-900 dark:text-white leading-tight">
              {apt.startTime}
            </span>
            <span className="text-[9px] text-neutral-400">{apt.durationMinutes}m</span>
          </div>
          <div>
            <span className="font-semibold text-xs text-neutral-900 dark:text-white block font-mono">
              {apt.date}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">Réf: {apt.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Cliente',
      sortable: true,
      renderCell: (apt) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-white block">
            {apt.clientName}
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">{apt.clientPhone}</span>
        </div>
      ),
    },
    {
      key: 'serviceName',
      header: 'Prestation Réalisée',
      sortable: true,
      renderCell: (apt) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-xs text-neutral-900 dark:text-white block">
            {apt.serviceName}
          </span>
          {apt.chairName && (
            <span className="text-[10px] text-neutral-500 block truncate max-w-[200px]">
              {apt.chairName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'colorFormula',
      header: 'Formule & Protocole Appliqué',
      renderCell: (apt) => (
        <div className="max-w-[220px]">
          {apt.colorFormula ? (
            <span className="text-xs font-mono text-[#C4785A] line-clamp-1">
              🧪 {apt.colorFormula}
            </span>
          ) : apt.notes ? (
            <span className="text-xs text-neutral-500 italic line-clamp-1">
              "{apt.notes}"
            </span>
          ) : (
            <span className="text-xs text-neutral-400 italic">Protocole standard</span>
          )}
        </div>
      ),
    },
    {
      key: 'staffName',
      header: 'Styliste Attribué',
      sortable: true,
      renderCell: (apt) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <User className="w-3.5 h-3.5 text-[#C4785A]" />
          <span className="font-medium">{apt.staffName}</span>
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Règlement',
      sortable: true,
      renderCell: (apt) => {
        const method = apt.paymentMethod || 'Cash';
        const methodLabels: Record<string, string> = {
          Cash: 'Espèces',
          BaridiMob: 'BaridiMob',
          Dahabia_CIB: 'CIB / Dahabia',
          Card: 'Carte Bancaire',
        };
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {methodLabels[method] || method}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Montant Encaissé',
      sortable: true,
      renderCell: (apt) => (
        <span className="text-xs font-bold text-[#C4785A] tabular-nums">
          {formatMoney(apt.price)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Reçu',
      renderCell: (apt) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setReceiptAppointment(apt)}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
            title="Consulter et réimprimer le reçu de caisse"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Ticket</span>
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
              Historique des Soins & Archive Salon
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] border border-[#C4785A]/20">
              {historyAppointments.length} Soins Archivés
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Journal complet des prestations effectuées, traçabilité des formules de coloration et réimpression des reçus.
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
            title="Restaurer l'historique complet des soins d'Alger"
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
        </div>
      </div>

      {/* Filter and Seek Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par cliente, soin, styliste, formule..."
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterSelect
            value={selectedMethodFilter}
            onChange={(val) => setSelectedMethodFilter(val?.target?.value ?? String(val))}
            options={[
              { value: 'All', label: 'Tous les modes de règlement' },
              { value: 'Cash', label: 'Espèces' },
              { value: 'BaridiMob', label: 'BaridiMob' },
              { value: 'Dahabia_CIB', label: 'CIB / Dahabia' },
            ]}
          />
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {selectedHistoryIds.size > 0 && (
        <div className="p-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
              {selectedHistoryIds.size}
            </span>
            <span className="text-xs font-medium">soins archivés sélectionnés</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer l'archive</span>
            </button>

            <button
              onClick={() => setSelectedHistoryIds(new Set())}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* UniversalDataCollection */}
      <UniversalDataCollection<Appointment>
        items={historyAppointments}
        keyExtractor={(apt) => apt.id}
        columns={columns}
        selectedIds={selectedHistoryIds}
        onSelectionChange={setSelectedHistoryIds}
        isPinned={(apt) => pinnedHistoryIds.has(apt.id)}
        onTogglePin={(apt) => handleTogglePin(apt.id)}
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
        renderCard={(apt) => {
          const isSelected = selectedHistoryIds.has(apt.id);
          const isPinned = pinnedHistoryIds.has(apt.id);

          return (
            <div
              key={apt.id}
              className={`p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-[#C4785A] bg-[#C4785A]/5'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {apt.startTime}
                  </span>
                  <span className="text-[11px] text-neutral-400">· {apt.date}</span>
                </div>

                <button
                  onClick={() => handleTogglePin(apt.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-xs text-neutral-900 dark:text-white mb-0.5">
                {apt.clientName}
              </h4>
              <p className="text-[11px] text-[#C4785A] font-semibold">{apt.serviceName}</p>

              {apt.colorFormula && (
                <p className="text-[10px] font-mono text-neutral-600 dark:text-neutral-300 mt-1 truncate">
                  🧪 {apt.colorFormula}
                </p>
              )}

              <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="font-bold text-[#C4785A]">{formatMoney(apt.price)}</span>
                <button
                  onClick={() => setReceiptAppointment(apt)}
                  className="px-2 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Ticket</span>
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Detailed Printable Thermal / A4 Receipt Modal */}
      {receiptAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden font-mono text-xs">
            {/* Header with Close */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                Reçu de Caisse Salon
              </span>
              <button
                onClick={() => setReceiptAppointment(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Paper Simulation */}
            <div className="p-6 space-y-4 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-neutral-300 dark:border-neutral-700">
                <h3 className="font-bold text-sm tracking-widest uppercase">
                  LUXE BEAUTY LOUNGE
                </h3>
                <p className="text-[10px] text-neutral-500">
                  22 Rue Djenane El Malik, Hydra, Alger
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tél : +213 23 48 90 12 · NIF : 001916012345678
                </p>
              </div>

              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-neutral-300 dark:border-neutral-700">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Ticket N° :</span>
                  <span className="font-bold">{receiptAppointment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date & Heure :</span>
                  <span>{receiptAppointment.date} {receiptAppointment.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cliente :</span>
                  <span className="font-semibold">{receiptAppointment.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Styliste :</span>
                  <span>{receiptAppointment.staffName}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 pb-3 border-b border-dashed border-neutral-300 dark:border-neutral-700">
                <div className="flex justify-between font-bold text-xs">
                  <span>{receiptAppointment.serviceName}</span>
                  <span className="tabular-nums">{formatMoney(receiptAppointment.price)}</span>
                </div>
                <div className="text-[10px] text-neutral-500">
                  Durée : {receiptAppointment.durationMinutes} minutes
                </div>
                {receiptAppointment.colorFormula && (
                  <div className="text-[10px] text-[#C4785A] pt-1 font-mono">
                    Formule: {receiptAppointment.colorFormula}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-sm font-black">
                  <span>TOTAL TTC :</span>
                  <span className="tabular-nums text-[#C4785A]">
                    {formatMoney(receiptAppointment.price)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Mode de paiement :</span>
                  <span>{receiptAppointment.paymentMethod || 'Espèces'}</span>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] text-neutral-400">
                Merci de votre visite · Saha Chribatkoum
              </div>
            </div>

            {/* Print action footer */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
              <AtriumButton
                variant="primary"
                className="w-full"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print?.()}
              >
                Imprimer le Reçu
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
