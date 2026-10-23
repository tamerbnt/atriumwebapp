import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  CreditCard,
  Building2,
  ChevronDown,
  Sparkles,
  Download,
  CheckCircle2,
  Clock,
  User,
  Scissors,
  ShoppingBag,
  FileText,
  AlertCircle,
  Pin,
  Check,
  X,
  Printer,
  Smartphone,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StylistPayout } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { formatMoney } from '../../../utils/rules';

export const AppointmentFinanceView: React.FC = () => {
  const {
    appointments,
    servicesCatalog,
    staff,
    currentBranch,
    branches,
    switchBranch,
    stylistPayouts,
    updateStylistPayoutStatus,
    resetSalonMockData,
    showToast,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // UniversalDataCollection state
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(new Set());
  const [pinnedPayoutIds, setPinnedPayoutIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('totalPayout');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Payout detail modal
  const [inspectingPayout, setInspectingPayout] = useState<StylistPayout | null>(null);

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!stylistPayouts || stylistPayouts.length === 0 || !appointments || appointments.length === 0) {
      resetSalonMockData();
    }
  }, [stylistPayouts, appointments, resetSalonMockData]);

  // Aggregate financial metrics
  const totalServicesRevenue = useMemo(() => {
    return (stylistPayouts || []).reduce((sum, p) => sum + (p.totalServiceRevenue || 0), 0);
  }, [stylistPayouts]);

  const totalRetailRevenue = useMemo(() => {
    return (stylistPayouts || []).reduce((sum, p) => sum + (p.retailSalesRevenue || 0), 0);
  }, [stylistPayouts]);

  const totalCommissionsDue = useMemo(() => {
    return (stylistPayouts || []).reduce((sum, p) => sum + (p.totalPayout || 0), 0);
  }, [stylistPayouts]);

  const netSalonProfit = Math.max(0, (totalServicesRevenue + totalRetailRevenue) - totalCommissionsDue);

  // Payment methods breakdown for today
  const paymentBreakdown = useMemo(() => {
    let cash = 45000;
    let baridiMob = 68000;
    let cib = 29500;

    (appointments || []).forEach((a) => {
      if (a.isPaid && a.paymentMethod) {
        if (a.paymentMethod === 'Cash') cash += a.price;
        else if (a.paymentMethod === 'BaridiMob') baridiMob += a.price;
        else if (a.paymentMethod === 'Dahabia_CIB' || a.paymentMethod === 'Card') cib += a.price;
      }
    });

    return { cash, baridiMob, cib, total: cash + baridiMob + cib };
  }, [appointments]);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return (stylistPayouts || []).filter((p) => {
      if (selectedStatusFilter !== 'All' && p.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [stylistPayouts, selectedStatusFilter]);

  const handleToggleSelectAll = () => {
    if (selectedPayoutIds.size === filteredPayouts.length) {
      setSelectedPayoutIds(new Set());
    } else {
      setSelectedPayoutIds(new Set(filteredPayouts.map((p) => p.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedPayoutIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPayoutIds(next);
  };

  const handleTogglePin = (id: string) => {
    const next = new Set(pinnedPayoutIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPinnedPayoutIds(next);
  };

  const handleBatchMarkApproved = () => {
    const count = selectedPayoutIds.size;
    selectedPayoutIds.forEach((id) => {
      updateStylistPayoutStatus(id, 'Approved');
    });
    setSelectedPayoutIds(new Set());
  };

  const handleBatchMarkPaid = () => {
    const count = selectedPayoutIds.size;
    selectedPayoutIds.forEach((id) => {
      updateStylistPayoutStatus(id, 'Paid', 'BaridiMob');
    });
    setSelectedPayoutIds(new Set());
  };

  const handleExportCSV = () => {
    const headers = [
      'Styliste',
      'Période Début',
      'Période Fin',
      'Nombre Soins',
      'Recette Soins (DZD)',
      'Taux Comm. (%)',
      'Commission Soins (DZD)',
      'Ventes Revente (DZD)',
      'Comm. Revente (DZD)',
      'Net à Payer (DZD)',
      'Statut',
      'Mode de Paiement',
    ];

    const rows = filteredPayouts.map((p) => [
      `"${p.staffName}"`,
      p.periodStart,
      p.periodEnd,
      p.totalServicesCount,
      p.totalServiceRevenue,
      p.commissionRate,
      p.commissionAmount,
      p.retailSalesRevenue,
      p.retailCommissionAmount,
      p.totalPayout,
      `"${p.status}"`,
      `"${p.paymentMethod || 'Non spécifié'}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `commissions_stylistes_salon_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Bordereaux de commissions exportés',
      message: `${filteredPayouts.length} relevés de commissions exportés en CSV.`,
      category: 'appointment_service',
    });
  };

  // Columns definition for UniversalDataCollection
  const columns: ColumnDefinition<StylistPayout>[] = [
    {
      key: 'staffName',
      header: 'Styliste & Collaborateur',
      sortable: true,
      renderCell: (payout) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
            {payout.staffName.charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-xs text-neutral-900 dark:text-white block">
              {payout.staffName}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              Du {payout.periodStart} au {payout.periodEnd}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'totalServicesCount',
      header: 'Soins Réalisés',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-white tabular-nums block">
            {payout.totalServicesCount} prestations
          </span>
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {formatMoney(payout.totalServiceRevenue)}
          </span>
        </div>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Commission Soins',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            {formatMoney(payout.commissionAmount)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {payout.commissionRate}% de split
          </span>
        </div>
      ),
    },
    {
      key: 'retailCommissionAmount',
      header: 'Revente Produits',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums block">
            {formatMoney(payout.retailCommissionAmount)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {payout.retailSalesCount} articles ({formatMoney(payout.retailSalesRevenue)})
          </span>
        </div>
      ),
    },
    {
      key: 'totalPayout',
      header: 'Net Commission Styliste',
      sortable: true,
      renderCell: (payout) => (
        <span className="text-xs font-bold text-[#C4785A] tabular-nums">
          {formatMoney(payout.totalPayout)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut du Règlement',
      sortable: true,
      renderCell: (payout) => (
        <div className="space-y-0.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
              payout.status === 'Paid'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : payout.status === 'Approved'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {payout.status === 'Paid' ? 'Payé' : payout.status === 'Approved' ? 'Validé' : 'En Attente'}
          </span>
          {payout.paymentMethod && (
            <span className="text-[10px] text-neutral-400 block font-mono">
              via {payout.paymentMethod}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: (payout) => (
        <div className="flex items-center justify-end gap-1.5">
          {payout.status === 'Pending' && (
            <button
              onClick={() => updateStylistPayoutStatus(payout.id, 'Approved')}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors"
            >
              Valider
            </button>
          )}

          {payout.status === 'Approved' && (
            <button
              onClick={() => updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob')}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Régler</span>
            </button>
          )}

          <button
            onClick={() => setInspectingPayout(payout)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="Consulter le bordereau détaillé"
          >
            <FileText className="w-3.5 h-3.5" />
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
              Finances & Commissions Stylistes
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] border border-[#C4785A]/20">
              Comptabilité Salon
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Recettes des soins, répartition des commissions d'équipe, caisse du jour et ventilation des paiements.
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
          <button
            onClick={() => resetSalonMockData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#C4785A] hover:bg-[#C4785A]/10 border border-[#C4785A]/30 rounded-lg transition-colors shadow-xs"
            title="Recharger les données financières et commissions"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recharger Démo</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Recette Brute des Soins</span>
            <Scissors className="w-4 h-4 text-[#C4785A]" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(totalServicesRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span>Prestations réalisées ce mois</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Ventes Produits Revente</span>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(totalRetailRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span>Kérastase, sérums & soins maison</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Commissions Équipe</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(totalCommissionsDue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span className="text-emerald-600 font-semibold">40% à 45%</span>
            <span>de rétrocession stylistes</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-1">
            <span>Marge Nette Institut</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
            {formatMoney(netSalonProfit)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
            <span>Après déduction commissions</span>
          </div>
        </div>
      </div>

      {/* Caisse du Jour & Modes de Paiement Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#C4785A]" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Caisse du Jour & Répartition des Encaissements
            </h3>
          </div>
          <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
            Total Encaissé : {formatMoney(paymentBreakdown.total)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-500 block">Espèces (Tiroir-Caisse)</span>
              <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(paymentBreakdown.cash)}
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
              Cash
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-500 block">BaridiMob (QR Code / PTT)</span>
              <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(paymentBreakdown.baridiMob)}
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
              BaridiMob
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-500 block">TPE Dahabia / Cartes CIB</span>
              <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(paymentBreakdown.cib)}
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">
              CIB / Dahabia
            </span>
          </div>
        </div>
      </div>

      {/* Filter capsules for payouts */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {['All', 'Pending', 'Approved', 'Paid'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedStatusFilter === st
                  ? 'bg-[#C4785A] text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {st === 'All'
                ? 'Toutes les commissions'
                : st === 'Pending'
                ? 'En Attente'
                : st === 'Approved'
                ? 'Validées'
                : 'Réglement Effectué'}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Batch Actions */}
      {selectedPayoutIds.size > 0 && (
        <div className="p-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
              {selectedPayoutIds.size}
            </span>
            <span className="text-xs font-medium">bordereaux stylistes sélectionnés</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchMarkApproved}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valider la Sélection</span>
            </button>

            <button
              onClick={handleBatchMarkPaid}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Marquer comme Réglé</span>
            </button>

            <button
              onClick={() => setSelectedPayoutIds(new Set())}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* UniversalDataCollection: Stylist Payout Ledger */}
      <UniversalDataCollection<StylistPayout>
        items={filteredPayouts}
        keyExtractor={(payout) => payout.id}
        columns={columns}
        selectedIds={selectedPayoutIds}
        onSelectionChange={setSelectedPayoutIds}
        isPinned={(payout) => pinnedPayoutIds.has(payout.id)}
        onTogglePin={(payout) => handleTogglePin(payout.id)}
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
        renderCard={(payout) => {
          const isSelected = selectedPayoutIds.has(payout.id);
          const isPinned = pinnedPayoutIds.has(payout.id);
          return (
            <div
              key={payout.id}
              className={`p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-[#C4785A] bg-[#C4785A]/5'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center">
                    {payout.staffName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">{payout.staffName}</h4>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Du {payout.periodStart} au {payout.periodEnd}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePin(payout.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Prestations ({payout.totalServicesCount})</span>
                  <span className="font-semibold">{formatMoney(payout.totalServiceRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Comm. Soins ({payout.commissionRate}%)</span>
                  <span className="font-semibold text-emerald-600">{formatMoney(payout.commissionAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-900 dark:text-white pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Net Commission:</span>
                  <span className="text-[#C4785A]">{formatMoney(payout.totalPayout)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    payout.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : payout.status === 'Approved'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {payout.status === 'Paid' ? 'Payé' : payout.status === 'Approved' ? 'Validé' : 'En Attente'}
                </span>

                <button
                  onClick={() => setInspectingPayout(payout)}
                  className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Détails
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Payout Slip Inspection Modal */}
      {inspectingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Bordereau de Rétrocession Styliste
                </h3>
                <span className="text-xs text-neutral-500 font-mono">
                  Réf: {inspectingPayout.id}
                </span>
              </div>
              <button
                onClick={() => setInspectingPayout(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <div>
                  <span className="font-bold text-sm text-neutral-900 dark:text-white block">
                    {inspectingPayout.staffName}
                  </span>
                  <span className="text-neutral-400">
                    Période: {inspectingPayout.periodStart} au {inspectingPayout.periodEnd}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#C4785A]/10 text-[#C4785A]">
                  {inspectingPayout.commissionRate}% Split
                </span>
              </div>

              <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Prestations ({inspectingPayout.totalServicesCount}):</span>
                  <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(inspectingPayout.totalServiceRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Commission Soins ({inspectingPayout.commissionRate}%):</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {formatMoney(inspectingPayout.commissionAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Revente Produits ({inspectingPayout.retailSalesCount}):</span>
                  <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(inspectingPayout.retailSalesRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Commission Revente:</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {formatMoney(inspectingPayout.retailCommissionAmount)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#C4785A]/10 border border-[#C4785A]/20 flex items-center justify-between">
                <span className="font-bold text-neutral-900 dark:text-white">Net à Régler :</span>
                <span className="text-base font-extrabold text-[#C4785A] tabular-nums">
                  {formatMoney(inspectingPayout.totalPayout)}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
              <button
                onClick={() => window.print?.()}
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Reçu</span>
              </button>

              {inspectingPayout.status !== 'Paid' ? (
                <button
                  onClick={() => {
                    updateStylistPayoutStatus(inspectingPayout.id, 'Paid', 'BaridiMob');
                    setInspectingPayout(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Confirmer le Paiement
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Règlement Effectué</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
