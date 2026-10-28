import React, { useState, useMemo } from 'react';
import {
  Key,
  Plus,
  Calendar,
  Home,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  FileText,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { RealEstateLease } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const RealEstateLeasesView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { leases, properties, addLease, updateLease, deleteLease } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['lease_01']));
  const [sortBy, setSortBy] = useState<string>('propertyTitle');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  // 390px Inline Side Inspector
  const [selectedLease, setSelectedLease] = useState<RealEstateLease | null>(() => {
    return leases[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'bail' | 'finance' | 'quittances' | 'notes'>('bail');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const filteredLeases = useMemo(() => {
    return leases.filter((l) => {
      if (statusFilter !== 'All' && l.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProp = l.propertyTitle.toLowerCase().includes(q);
        const matchesTenant = l.tenantName.toLowerCase().includes(q);
        const matchesPhone = l.tenantPhone.includes(q);
        if (!matchesProp && !matchesTenant && !matchesPhone) return false;
      }
      return true;
    });
  }, [leases, statusFilter, searchQuery]);

  // KPIs
  const activeLeases = leases.filter((l) => l.status === 'Active').length;
  const totalDeposits = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);
  const totalMonthlyRent = leases
    .filter((l) => l.status === 'Active')
    .reduce((acc, l) => acc + l.monthlyRentDzd, 0);

  // Actions
  const handlePin = (l: RealEstateLease) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(l.id)) next.delete(l.id);
      else next.add(l.id);
      return next;
    });
    showToast(
      pinnedIds.has(l.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Bail désépinglé')
        : (isAr ? 'تم تثبيت عقد الإيجار' : 'Bail épinglé'),
      'info'
    );
  };

  const handleDelete = (l: RealEstateLease) => {
    deleteLease(l.id);
    if (selectedLease?.id === l.id) {
      setSelectedLease(null);
    }
    showToast(isAr ? 'تم حذف عقد الإيجار' : 'Bail de location supprimé', 'success');
  };

  const handleEmitReceipt = (l: RealEstateLease) => {
    showToast(
      isAr
        ? `تم إصدار مخالصة الإيجار الشهرية للمستأجر ${l.tenantName}`
        : `Quittance de loyer émise pour ${l.tenantName} (${formatMoney(l.monthlyRentDzd)})`,
      'success'
    );
    if (selectedLease?.id === l.id) setActiveTab('quittances');
  };

  const handleRenewLease = (l: RealEstateLease) => {
    const nextStatus: RealEstateLease['status'] = l.status === 'Active' ? 'Terminated' : 'Active';
    const updated: RealEstateLease = {
      ...l,
      status: nextStatus,
    };
    updateLease(updated);
    if (selectedLease?.id === l.id) setSelectedLease(updated);
    showToast(
      nextStatus === 'Active'
        ? (isAr ? 'تم تجديد عقد الكراء' : 'Bail renouvelé avec succès')
        : (isAr ? 'تم إنهاء عقد الكراء' : 'Bail clôturé / résilié'),
      'info'
    );
  };

  const handleExportCsv = () => {
    const headers = ['Bien Immobilier', 'Locataire', 'Téléphone', 'Loyer Mensuel DZD', 'Dépôt Garantie DZD', 'Date Début', 'Date Fin', 'Périodicité', 'Statut'];
    const rows = filteredLeases.map((l) => [
      `"${l.propertyTitle.replace(/"/g, '""')}"`,
      `"${l.tenantName.replace(/"/g, '""')}"`,
      l.tenantPhone,
      l.monthlyRentDzd,
      l.securityDepositDzd,
      l.startDate,
      l.endDate,
      l.paymentFrequency,
      l.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baux_locatifs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير عقود الكراء CSV' : 'Export CSV des baux généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedLease) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ بنود العقد' : 'Clauses particulières enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<RealEstateLease>[] = [
    {
      id: 'propertyTitle',
      header: isAr ? 'العقار المؤجر' : 'Bien Loué',
      accessorKey: 'propertyTitle',
      sortable: true,
      minWidth: '220px',
      cell: (l) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0">
            <Key size={16} />
          </div>
          <div>
            <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 line-clamp-1">
              {l.propertyTitle}
              {pinnedIds.has(l.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              Du {l.startDate} au {l.endDate}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tenantName',
      header: isAr ? 'المستأجر' : 'Locataire & Contact',
      accessorKey: 'tenantName',
      sortable: true,
      minWidth: '170px',
      cell: (l) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {l.tenantName}
          </div>
          <div className="text-[10px] text-neutral-400">
            {l.tenantPhone}
          </div>
        </div>
      ),
    },
    {
      id: 'monthlyRent',
      header: isAr ? 'الإيجار الشهري' : 'Loyer Mensuel',
      accessorKey: 'monthlyRentDzd',
      sortable: true,
      minWidth: '130px',
      cell: (l) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(l.monthlyRentDzd)}
        </div>
      ),
    },
    {
      id: 'securityDeposit',
      header: isAr ? 'الوديعة الضامنة' : 'Caution Déposée',
      accessorKey: 'securityDepositDzd',
      sortable: true,
      minWidth: '130px',
      cell: (l) => (
        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {formatMoney(l.securityDepositDzd)}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut',
      accessorKey: 'status',
      sortable: true,
      minWidth: '110px',
      cell: (l) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            l.status === 'Active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          {l.status === 'Active' ? 'Actif' : 'Clôturé'}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Key size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'عقود الكراء والاتفاقيات' : 'Baux & Contrats de Location'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {leases.length} {isAr ? 'عقد' : 'baux'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة عقود الإيجار السنوية، مواعيد التجديد، والودائع المالية'
                : 'Suivi juridique des baux, échéances de reconduction & dépôts de garantie'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={() => setIsLeaseModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'تحرير عقد كراء' : 'Nouveau Bail'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'التزامات الإيجار والضمانات المالية' : 'Engagements Locatifs & Cautions Déposées'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة سريان العقود، الودائع الضامنة المحتجزة والكتلة الإيجارية الشهرية' : 'Baux en cours, montants des garanties sous séquestre et quittancement'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Baux Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'عقود الإيجار السارية' : 'Baux Actifs en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeLeases}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                100% {isAr ? 'موثقة قانونياً' : 'conformes et signés'}
              </p>
            </div>
          </div>

          {/* Card 2: Dépôts de garantie */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'مجموع الودائع الضامنة (Cautions)' : 'Dépôts de Garantie Séquestrés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalDeposits)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'ودائع في الحساب الضامن' : 'Comptes séquestre agence'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الكتلة الإيجارية الشهرية' : 'Quittancement Mensuel'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Loyers Encaissés
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalMonthlyRent)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {activeLeases} {isAr ? 'إيجار جاري' : 'baux actifs'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="flex items-start gap-4">
        {/* Main Collection Container */}
        <div className="flex-1 min-w-0">
          <UniversalDataCollection<RealEstateLease>
            data={filteredLeases}
            columns={columns}
            keyExtractor={(l) => l.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث بالعقار، المستأجر، الهاتف...' : 'Rechercher par bien, locataire, téléphone...'}
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع العقود' : 'Tous les baux' },
              { value: 'Active', label: 'Baux Actifs' },
              { value: 'Terminated', label: 'Baux Clôturés' },
            ]}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={handlePin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            onItemClick={(l) => {
              setSelectedLease(l);
            }}
            onDelete={handleDelete}
            emptyIcon={<Key size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد عقود كراء' : 'Aucun bail trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بتحرير أول عقد إيجار للبدء' : 'Créez votre premier contrat de bail')
            }
            customActions={[
              {
                id: 'receipt',
                label: isAr ? 'إصدار مخالصة' : 'Quittance de Loyer',
                icon: <FileText size={14} />,
                onClick: handleEmitReceipt,
              },
              {
                id: 'renew',
                label: isAr ? 'تجديد/إنهاء' : 'Reconduire/Résilier',
                icon: <ArrowRight size={14} />,
                onClick: handleRenewLease,
              },
            ]}
            renderGridCard={(l) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {formatMoney(l.monthlyRentDzd)} /mois
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      l.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    {l.status === 'Active' ? 'Actif' : 'Clôturé'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {l.propertyTitle}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    Locataire: {l.tenantName} ({l.tenantPhone})
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span>Période: {l.startDate} → {l.endDate}</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">Caution: {formatMoney(l.securityDepositDzd)}</span>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedLease && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Key size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">
                      Bail {selectedLease.id}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedLease.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {selectedLease.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedLease.propertyTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLease(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleEmitReceipt(selectedLease)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <FileText size={12} />
                {isAr ? 'مخالصة' : 'Quittance'}
              </button>
              <button
                onClick={() => handleRenewLease(selectedLease)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <ArrowRight size={12} />
                {selectedLease.status === 'Active' ? 'Clôturer' : 'Réactiver'}
              </button>
              <button
                onClick={() => handleDelete(selectedLease)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('bail')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'bail'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'العقد' : 'Dossier Bail'}
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'finance'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المالية' : 'Finances'}
              </button>
              <button
                onClick={() => setActiveTab('quittances')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'quittances'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المخالصات' : 'Quittances'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البنود' : 'Clauses'}
              </button>
            </div>

            {/* Tab 1: Dossier Bail */}
            {activeTab === 'bail' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Bien loué:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[190px]">
                      {selectedLease.propertyTitle}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Locataire:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedLease.tenantName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Téléphone:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedLease.tenantPhone}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date d'effet:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedLease.startDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Échéance de fin:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedLease.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Périodicité:</span>
                    <span className="font-semibold text-[#C4785A]">
                      {selectedLease.paymentFrequency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Finance */}
            {activeTab === 'finance' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Loyer mensuel:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedLease.monthlyRentDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Caution de garantie:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">
                      {formatMoney(selectedLease.securityDepositDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Honoraires d'agence:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatMoney(selectedLease.agencyCommissionDzd || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Quittances */}
            {activeTab === 'quittances' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[11px]">
                    <span className="text-neutral-900 dark:text-white">Mois en cours (Payé)</span>
                    <span className="text-emerald-600 font-mono text-[10px]">Règlement validé</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">Quittance N° REC-{selectedLease.id.slice(-4)}-01 émise.</p>
                </div>
                <button
                  onClick={() => handleEmitReceipt(selectedLease)}
                  className="w-full py-2 rounded-xl bg-orange-50 text-[#C4785A] hover:bg-orange-100 font-semibold text-xs"
                >
                  + Émettre nouvelle quittance mensuelle
                </button>
              </div>
            )}

            {/* Tab 4: Clauses */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Clauses particulières, état des lieux d'entrée et interdictions (sous-location, animaux) :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les conditions spécifiques d'entretien chaudière, taxe d'habitation..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Clauses enregistrées'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Lease Modal */}
      <RealEstateLeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        properties={properties}
        onSave={(newLease) => {
          addLease(newLease);
          setSelectedLease(newLease);
          setIsLeaseModalOpen(false);
        }}
      />
    </div>
  );
};
