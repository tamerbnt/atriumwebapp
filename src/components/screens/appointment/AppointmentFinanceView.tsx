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
  Banknote,
  Coins,
  Wallet,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StylistPayout } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
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
  const [searchQuery, setSearchQuery] = useState('');

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.staffName.toLowerCase().includes(q) ||
          p.periodStart.toLowerCase().includes(q) ||
          p.periodEnd.toLowerCase().includes(q) ||
          (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [stylistPayouts, selectedStatusFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = [
      'Styliste',
      'Période Début',
      'Période Fin',
      'Soins Réalisés',
      'Recette Soins (DZD)',
      'Taux Soins (%)',
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
      width: '2.5*',
      minWidth: '200px',
      sortable: true,
      renderCell: (payout) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center shrink-0">
            {payout.staffName.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-neutral-900 dark:text-white block truncate">
              {payout.staffName}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono block">
              Du {payout.periodStart} au {payout.periodEnd}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'totalServicesCount',
      header: 'Soins Réalisés',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-white tabular-nums block">
            {payout.totalServicesCount} soins
          </span>
          <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
            {formatMoney(payout.totalServiceRevenue)}
          </span>
        </div>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Part Prestations',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            {formatMoney(payout.commissionAmount)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {payout.commissionRate}% commission
          </span>
        </div>
      ),
    },
    {
      key: 'retailCommissionAmount',
      header: 'Revente Produits',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums block">
            {formatMoney(payout.retailCommissionAmount)}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {payout.retailSalesCount} articles
          </span>
        </div>
      ),
    },
    {
      key: 'totalPayout',
      header: 'Net Commission Styliste',
      width: '1.8*',
      minWidth: '140px',
      sortable: true,
      renderCell: (payout) => (
        <div className="text-xs">
          <span className="font-extrabold text-sm text-[#C4785A] tabular-nums font-mono block">
            {formatMoney(payout.totalPayout)}
          </span>
          <span className="text-[10px] text-neutral-400">
            {payout.paymentMethod ? `Via ${payout.paymentMethod}` : 'En attente virement'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (payout) => {
        const isPaid = payout.status === 'Paid';
        const isApproved = payout.status === 'Approved';

        return (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaid
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isApproved
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isPaid ? 'Payé' : isApproved ? 'Approuvé' : 'En Attente'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '1.4*',
      minWidth: '110px',
      renderCell: (payout) => (
        <div className="flex items-center justify-end gap-1.5">
          {payout.status === 'Pending' && (
            <button
              type="button"
              onClick={() => updateStylistPayoutStatus(payout.id, 'Approved')}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors cursor-pointer"
            >
              Valider
            </button>
          )}

          {payout.status === 'Approved' && (
            <button
              type="button"
              onClick={() => updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob')}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Régler</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setInspectingPayout(payout)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Consulter le bordereau"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <DollarSign className="text-[#C4785A]" size={26} />
              <span>Finances & Commissions Stylistes</span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {currentBranch?.name || 'Luxe Spa Hydra'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Recettes des soins, répartition des commissions d'équipe, caisse du jour et ventilation des paiements.
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
            <Wallet size={18} className="text-[#C4785A]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Synthèse Financière & Répartition des Bénéfices
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            Clôture Période en Cours
          </span>
        </div>

        {/* 3-Card Canonical Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Recette Soins & Revente */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Recette Brute Soins
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                  +{formatMoney(totalRetailRevenue)} revente
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
              {formatMoney(totalServicesRevenue)}
            </div>
          </div>

          {/* Card 2: Bénéfice Net Institut */}
          <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  Bénéfice Net Institut
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  Net Salon
                </span>
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatMoney(netSalonProfit)}
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="bg-[#1F1D1B] rounded-[20px] p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
            {/* Glowing Sparkline Graphic */}
            <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                <path
                  d="M10 60 L35 45 L60 52 L85 20 L110 32 L135 10"
                  stroke="#FB923C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="135" cy="10" r="4" fill="#FB923C" />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-300">
                  Cagnotte Stylistes
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                  {stylistPayouts.length} stylistes
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                {formatMoney(totalCommissionsDue)}
              </div>
            </div>

            <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Total commissions dues</span>
              <span className="text-[#FB923C] font-semibold">Validation requise</span>
            </div>
          </div>
        </div>
      </div>

      {/* TENDER BREAKDOWN POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F3] dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <CreditCard size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Ventilation des Modes de Règlement
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                Encaissements comptoir salon, paiements BaridiMob et terminaux TPE Satim
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={17} className="text-emerald-500" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  Paiements Espèces (DZD)
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {paymentBreakdown.total > 0 ? `${Math.round((paymentBreakdown.cash / paymentBreakdown.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(paymentBreakdown.cash)}
            </div>
            <div className="text-[11px] text-neutral-400">
              Encaissé au comptoir accueil
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={17} className="text-[#C4785A]" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  BaridiMob & Virement RIP
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {paymentBreakdown.total > 0 ? `${Math.round((paymentBreakdown.baridiMob / paymentBreakdown.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(paymentBreakdown.baridiMob)}
            </div>
            <div className="text-[11px] text-neutral-400">
              Paiements instantanés confirmés
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={17} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  Cartes CIB & Edahabia
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {paymentBreakdown.total > 0 ? `${Math.round((paymentBreakdown.cib / paymentBreakdown.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(paymentBreakdown.cib)}
            </div>
            <div className="text-[11px] text-neutral-400">
              TPE SATIM monétique bancaire
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COLLECTION POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white">
              Bordereaux de Commissions & Payouts Stylistes
            </h2>
            <p className="text-xs text-neutral-500">
              Relevés individuels de prestations, ventes de cosmétiques et validation des règlements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-60">
              <Seek
                placeholder="Rechercher un styliste..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            {/* Filter Tabs */}
            <div className="bg-white dark:bg-neutral-800 p-0.5 rounded-[12px] border border-[#E9EEF0] dark:border-neutral-700 flex items-center shadow-2xs">
              {(['All', 'Pending', 'Approved', 'Paid'] as const).map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setSelectedStatusFilter(statusKey)}
                  className={`px-3 py-1 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                    selectedStatusFilter === statusKey
                      ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {statusKey === 'All'
                    ? 'Tous'
                    : statusKey === 'Pending'
                    ? 'En Attente'
                    : statusKey === 'Approved'
                    ? 'Approuvés'
                    : 'Payés'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inset Container hosting UniversalDataCollection */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
          <UniversalDataCollection<StylistPayout>
            items={filteredPayouts}
            keyExtractor={(p) => p.id}
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
            renderCard={(payout) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center">
                        {payout.staffName.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">
                        {payout.staffName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        payout.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : payout.status === 'Approved'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-500 mt-2">
                    <div className="flex justify-between">
                      <span>Prestations ({payout.totalServicesCount}) :</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(payout.totalServiceRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Commission ({payout.commissionRate}%) :</span>
                      <span className="font-mono">{formatMoney(payout.commissionAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Total Net :</span>
                  <span className="font-mono font-black text-sm text-[#C4785A]">
                    {formatMoney(payout.totalPayout)}
                  </span>
                </div>
              </div>
            )}
            selectedIds={selectedPayoutIds}
            onSelectionChange={setSelectedPayoutIds}
            isPinned={(p) => pinnedPayoutIds.has(p.id)}
            onTogglePin={(p) => {
              setPinnedPayoutIds((prev) => {
                const next = new Set(prev);
                if (next.has(p.id)) next.delete(p.id);
                else next.add(p.id);
                return next;
              });
            }}
            emptyTitle="Aucun bordereau trouvé"
            emptyDescription="Les commissions générées apparaîtront ici."
          />
        </div>
      </div>

      {/* INSPECT PAYOUT MODAL */}
      {inspectingPayout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Bordereau Styliste · {inspectingPayout.staffName}
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Du {inspectingPayout.periodStart} au {inspectingPayout.periodEnd}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPayout(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Recette Prestations :</span>
                  <span className="font-bold">{formatMoney(inspectingPayout.totalServiceRevenue)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Part Soins ({inspectingPayout.commissionRate}%) :</span>
                  <span className="font-bold">+{formatMoney(inspectingPayout.commissionAmount)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Part Revente ({inspectingPayout.retailCommissionRate}%) :</span>
                  <span className="font-bold">+{formatMoney(inspectingPayout.retailCommissionAmount)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between text-sm font-black text-[#C4785A]">
                  <span>NET COMMISSION :</span>
                  <span>{formatMoney(inspectingPayout.totalPayout)}</span>
                </div>
              </div>

              <div className="text-[11px] text-neutral-400">
                Statut actuel : <strong className="text-neutral-700 dark:text-neutral-300">{inspectingPayout.status}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectingPayout(null)}
                className="h-9 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
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
