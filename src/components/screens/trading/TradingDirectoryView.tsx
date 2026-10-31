import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Plus,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  X,
  ExternalLink,
  DollarSign,
  Clock,
  ShieldCheck,
  Home,
  ChevronDown,
  RefreshCw,
  Sparkles,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { B2bClient, B2bSupplier } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { B2bEntityModal } from './B2bEntityModal';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type DirectoryMode = 'clients' | 'suppliers';

export const TradingDirectoryView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    b2bClients,
    b2bSuppliers,
    commercialDocs,
    deleteB2bClient,
    deleteB2bSupplier,
    currentBranch,
    branches,
    switchBranch,
    resetTradingMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [mode, setMode] = useState<DirectoryMode>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Modals
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<B2bClient | B2bSupplier | null>(null);

  // Metrics
  const metrics = useMemo(() => {
    const totalClientDebt = b2bClients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
    const totalCreditLimit = b2bClients.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const totalSupplierDebt = b2bSuppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0);
    const creditUtilization = totalCreditLimit > 0 ? (totalClientDebt / totalCreditLimit) * 100 : 0;
    const overLimitClients = b2bClients.filter((c) => (c.outstandingBalance || 0) > (c.creditLimit || 0)).length;

    return {
      totalClientDebt,
      totalCreditLimit,
      totalSupplierDebt,
      creditUtilization,
      overLimitClients,
    };
  }, [b2bClients, b2bSuppliers]);

  // Filtered lists
  const filteredClients = useMemo(() => {
    return b2bClients.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.companyName.toLowerCase().includes(q);
        const matchesContact = (c.contactName || '').toLowerCase().includes(q);
        const matchesNif = (c.nif || '').toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
      }
      return true;
    });
  }, [b2bClients, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return b2bSuppliers.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.supplierName.toLowerCase().includes(q);
        const matchesContact = (s.contactName || '').toLowerCase().includes(q);
        const matchesNif = (s.nif || '').toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
      }
      return true;
    });
  }, [b2bSuppliers, searchQuery]);

  // Client Columns
  const clientColumns: ColumnDefinition<B2bClient>[] = [
    {
      key: 'company',
      header: t('trading_col_company', 'Raison Sociale & Secteur'),
      minWidth: '220px',
      renderCell: (c) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {c.companyName}
          </span>
          <span className="text-[10px] text-neutral-500">{c.sector || 'Entreprise B2B'}</span>
        </div>
      ),
    },
    {
      key: 'legal',
      header: 'N.I.F. / R.C.',
      width: '180px',
      renderCell: (c) => (
        <div className="text-xs font-mono">
          <span className="block font-medium text-neutral-800 dark:text-neutral-200">
            NIF: {c.nif || 'N/A'}
          </span>
          <span className="text-[10px] text-neutral-400">RC: {c.rc || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('trading_col_contact', 'Interlocuteur'),
      width: '180px',
      renderCell: (c) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
            {c.contactName || 'N/A'}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">{c.phone || c.contactPhone}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: t('trading_col_city', 'Wilaya'),
      width: '100px',
      renderCell: (c) => <span className="text-xs text-neutral-600 dark:text-neutral-400">{c.city}</span>,
    },
    {
      key: 'balance',
      header: t('trading_col_balance', 'Encours / Crédit'),
      width: '160px',
      renderCell: (c) => {
        const isOver = (c.outstandingBalance || 0) > (c.creditLimit || 0);
        return (
          <div className="text-xs font-mono tabular-nums">
            <span className={`font-bold block ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
              {formatMoney(c.outstandingBalance || 0)}
            </span>
            <span className="text-[10px] text-neutral-400">
              Plafond: {formatMoney(c.creditLimit || 0)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      renderCell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingEntity(c);
              setEntityModalOpen(true);
            }}
            title={t('action_edit', 'Modifier')}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
            title={t('action_delete', 'Supprimer')}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Supplier Columns
  const supplierColumns: ColumnDefinition<B2bSupplier>[] = [
    {
      key: 'name',
      header: t('trading_col_supplier', 'Fournisseur Référencé'),
      minWidth: '220px',
      renderCell: (s) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {s.supplierName}
          </span>
          <span className="text-[10px] text-neutral-500">{s.sector || 'Fournisseur'}</span>
        </div>
      ),
    },
    {
      key: 'legal',
      header: 'N.I.F. / R.C.',
      width: '180px',
      renderCell: (s) => (
        <div className="text-xs font-mono">
          <span className="block font-medium text-neutral-800 dark:text-neutral-200">
            NIF: {s.nif || 'N/A'}
          </span>
          <span className="text-[10px] text-neutral-400">RC: {s.rc || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: t('trading_col_contact', 'Contact & Tél'),
      width: '180px',
      renderCell: (s) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
            {s.contactName || 'Standard'}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">{s.phone}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: t('trading_col_city', 'Ville'),
      width: '110px',
      renderCell: (s) => <span className="text-xs text-neutral-600 dark:text-neutral-400">{s.city}</span>,
    },
    {
      key: 'payable',
      header: t('trading_col_debt', 'Dette Fournisseur'),
      width: '150px',
      renderCell: (s) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatMoney(s.outstandingPayable || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      renderCell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingEntity(s);
              setEntityModalOpen(true);
            }}
            title={t('action_edit', 'Modifier')}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(s);
            }}
            title={t('action_delete', 'Supprimer')}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Client Document history for inspector
  const entityHistory = useMemo(() => {
    if (!selectedEntity || mode !== 'clients') return [];
    return commercialDocs.filter((d) => d.clientId === selectedEntity.id);
  }, [selectedEntity, mode, commercialDocs]);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: b2bClients.length > 0 || b2bSuppliers.length > 0,
  });

  if (showSkeleton && ((b2bClients.length === 0 && b2bSuppliers.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_directory_title', 'Répertoire des Partenaires B2B')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {b2bClients.length} {language === 'ar' ? 'عميل' : 'Clients'} • {b2bSuppliers.length} {language === 'ar' ? 'مورد' : 'Fournisseurs'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_directory_subtitle', 'Fiches légales certifiées, suivi des encours, limites de crédit et historique complet')}
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
                  {currentBranch?.name || 'Dépôt Central'}
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
                    {language === 'ar' ? 'المستودعات والفروع' : 'Dépôts & Points de Vente'}
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
              onClick={() => resetTradingMockData && resetTradingMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Réinitialiser les données B2B de test"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo B2B'}</span>
            </button>

            {/* New Entity Action */}
            <AtriumButton
              variant="primary"
              onClick={() => {
                setEditingEntity(null);
                setEntityModalOpen(true);
              }}
              icon={<Plus size={15} />}
            >
              {mode === 'clients'
                ? language === 'ar'
                  ? 'عميل تجاري جديد'
                  : 'Nouveau Client B2B'
                : language === 'ar'
                ? 'مورد جديد'
                : 'Nouveau Fournisseur'}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Clients B2B Référencés */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'العملاء التجاريون المعتمدون' : 'Clients B2B Référencés'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {b2bClients.length} comptes
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {b2bClients.length}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Plafond global: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(metrics.totalCreditLimit)}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Fournisseurs Agréés & Dettes */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'الموردون والمستحقات' : 'Fournisseurs & Dettes Achats'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {b2bSuppliers.length} fournisseurs
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(metrics.totalSupplierDebt)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Clock size={13} className="text-amber-500" />
                  <span>Dettes fournisseurs exigibles sous 30/60j</span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'إجمالي الديون التجارية للعملاء' : 'Encours B2B & Risque Crédit'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  {metrics.creditUtilization.toFixed(0)}% Plafond
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(metrics.totalClientDebt)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
                  <span>
                    {metrics.overLimitClients > 0 ? (
                      <span className="text-[#FB923C] font-semibold">{metrics.overLimitClients} dépassement(s) de plafond</span>
                    ) : (
                      <span className="text-emerald-400">Tous les encours dans les limites</span>
                    )}
                  </span>
                  <span className="font-mono text-stone-300">Total B2B</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar: Left Anchor + Controls Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Title / Icon / Count Anchor */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <Users size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {mode === 'clients'
                    ? t('trading_directory_clients_title', 'Portefeuille Clients')
                    : t('trading_directory_suppliers_title', 'Fournisseurs Référencés')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold font-mono">
                  {mode === 'clients' ? filteredClients.length : filteredSuppliers.length}
                </span>
              </div>
            </div>

            {/* Controls Bar: Segment Tabs + Seek Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Segment Capsules */}
              <div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
                <button
                  type="button"
                  onClick={() => {
                    setMode('clients');
                    setSelectedEntity(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    mode === 'clients'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_directory_tab_clients', 'Clients B2B')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    mode === 'clients' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {b2bClients.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('suppliers');
                    setSelectedEntity(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    mode === 'suppliers'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_directory_tab_suppliers', 'Fournisseurs Référencés')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    mode === 'suppliers' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {b2bSuppliers.length}
                  </span>
                </button>
              </div>

              {/* Seek Search */}
              <div className="self-end sm:self-auto">
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={language === 'ar' ? 'بحث باسم الشركة، المسؤول، NIF...' : 'Rechercher raison sociale, contact, NIF...'}
                  shutSize={36}
                  openWidth={280}
                />
              </div>
            </div>
          </div>

          {/* Grid Layout: Collection Table + 360° Partner Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            
            {/* Table Container */}
            <div
              className={`bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden ${
                selectedEntity ? 'lg:col-span-2' : 'lg:col-span-3'
              }`}
            >
              {mode === 'clients' ? (
                <UniversalDataCollection<B2bClient>
                  items={filteredClients}
                  keyExtractor={(c) => c.id}
                  columns={clientColumns}
                  isLoading={isSyncing || networkMode === 'force_skeleton'}
                  isOffline={networkMode === 'offline'}
                  isTimedOut={isSyncTimeout}
                  lastSyncedAt={lastSyncedAt}
                  onRetrySync={retryCloudSync}
                  onItemClick={(c) => setSelectedEntity(c)}
                  onViewDetails={(c) => setSelectedEntity(c)}
                  onEdit={(c) => {
                    setEditingEntity(c);
                    setEntityModalOpen(true);
                  }}
                  onDelete={(c) => setDeleteTarget(c)}
                  customActions={(c) => [
                    {
                      id: 'doc',
                      label: language === 'ar' ? 'إنشاء مستند' : 'Nouveau Document',
                      icon: <FileText size={13} />,
                      variant: 'primary',
                      onClick: () => {
                        setSelectedEntity(c);
                        setComposerOpen(true);
                      },
                    },
                  ]}
                  renderCard={(c) => {
                    const isOverLimit = (c.outstandingBalance || 0) > (c.creditLimit || 0);

                    return (
                      <div className="flex flex-col justify-between w-full h-full">
                        <div>
                          {/* Header: Avatar + Sector */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-base shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                              {c.companyName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">
                              {c.sector || 'Entreprise B2B'}
                            </span>
                          </div>

                          {/* Company Name & NIF */}
                          <h3 className="font-bold text-base text-neutral-900 dark:text-white line-clamp-1 mb-0.5">
                            {c.companyName}
                          </h3>
                          <div className="text-[11px] font-mono text-neutral-400 mb-3">
                            NIF: {c.nif || 'Non renseigné'} {c.city ? `· ${c.city}` : ''}
                          </div>

                          {/* Encours & Plafond */}
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Encours Dû :</span>
                              <span className={`font-mono font-bold tabular-nums ${isOverLimit ? 'text-rose-600' : 'text-[#C4785A]'}`}>
                                {formatMoney(c.outstandingBalance || 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-neutral-400">
                              <span>Plafond Autorisé :</span>
                              <span className="font-mono tabular-nums">{formatMoney(c.creditLimit || 0)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contact Person Footer */}
                        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                          <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[160px] font-medium">
                            {c.contactName || c.phone || 'Contact Direct'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntity(c);
                              setComposerOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#C4785A]/10 hover:bg-[#C4785A]/20 text-[#C4785A] text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            + Facture/BL
                          </button>
                        </div>
                      </div>
                    );
                  }}
                  emptyTitle={language === 'ar' ? 'لم يتم العثور على عملاء تجاريين' : 'Aucun client B2B trouvé'}
                  emptyDescription={
                    language === 'ar'
                      ? 'أضف أول عميل تجاري بالضغط على زر عميل تجاري جديد أعلاه.'
                      : 'Ajoutez votre premier client commercial en cliquant sur Nouveau Client B2B.'
                  }
                />
              ) : (
                <UniversalDataCollection<B2bSupplier>
                  items={filteredSuppliers}
                  keyExtractor={(s) => s.id}
                  columns={supplierColumns}
                  onItemClick={(s) => setSelectedEntity(s)}
                  onViewDetails={(s) => setSelectedEntity(s)}
                  onEdit={(s) => {
                    setEditingEntity(s);
                    setEntityModalOpen(true);
                  }}
                  onDelete={(s) => setDeleteTarget(s)}
                  customActions={(s) => [
                    {
                      id: 'doc',
                      label: language === 'ar' ? 'أمر شراء' : 'Bon de Commande',
                      icon: <FileText size={13} />,
                      variant: 'primary',
                      onClick: () => {
                        setSelectedEntity(s);
                        setComposerOpen(true);
                      },
                    },
                  ]}
                  renderCard={(s) => (
                    <div className="flex flex-col justify-between w-full h-full">
                      <div>
                        {/* Header: Avatar + Sector */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-base shrink-0 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                            {s.supplierName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]">
                            {s.sector || 'Fournisseur Agréé'}
                          </span>
                        </div>

                        {/* Supplier Name & NIF */}
                        <h3 className="font-bold text-base text-neutral-900 dark:text-white line-clamp-1 mb-0.5">
                          {s.supplierName}
                        </h3>
                        <div className="text-[11px] font-mono text-neutral-400 mb-3">
                          NIF: {s.nif || 'Non renseigné'} {s.city ? `· ${s.city}` : ''}
                        </div>

                        {/* Dettes Achats */}
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Dettes Achats Exigibles :</span>
                            <span className="font-mono font-bold text-amber-600 tabular-nums">
                              {formatMoney(s.outstandingPayable || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>Modalités :</span>
                            <span>{s.paymentTermsDays || 30} jours fin de mois</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Person Footer */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                        <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[160px] font-medium">
                          {s.contactName || s.phone || 'Contact Commercial'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntity(s);
                            setComposerOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          + Bon Commande
                        </button>
                      </div>
                    </div>
                  )}
                  emptyTitle={language === 'ar' ? 'لم يتم العثور على موردين' : 'Aucun fournisseur trouvé'}
                  emptyDescription={
                    language === 'ar'
                      ? 'أضف أول مورد بالضغط على زر مورد جديد أعلاه.'
                      : 'Ajoutez votre premier fournisseur en cliquant sur Nouveau Fournisseur.'
                  }
                />
              )}
            </div>

            {/* 360° Partner Inspector Panel */}
            {selectedEntity && (
              <div className="p-5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C4785A]/15 text-[#C4785A] font-bold uppercase">
                      {mode === 'clients' ? 'Fiche Client B2B' : 'Fiche Fournisseur'}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-1.5">
                      {'companyName' in selectedEntity
                        ? selectedEntity.companyName
                        : (selectedEntity as B2bSupplier).supplierName}
                    </h3>
                    <p className="text-xs text-neutral-500">{selectedEntity.sector}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Legal Algerian Identifiers Box */}
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/60 text-xs font-mono space-y-1.5">
                  <span className="font-bold font-sans text-[11px] text-neutral-600 dark:text-neutral-400 block uppercase">
                    Identifiants Fiscaux Certifiés
                  </span>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">N.I.F. (15 ch) :</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {selectedEntity.nif || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">R.C. N° :</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedEntity.rc || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Art. Imposition :</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedEntity.ai || 'Non renseigné'}
                    </span>
                  </div>
                </div>

                {/* Primary Contact Person */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-neutral-500 text-[10px] block">
                    Contact Direct
                  </span>
                  <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                    <span className="font-semibold">{selectedEntity.contactName || 'Standard'}</span>
                    {selectedEntity && 'contactRole' in selectedEntity && (
                      <span className="text-neutral-400">({(selectedEntity as B2bClient).contactRole})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                    <Phone size={13} className="text-[#C4785A]" />
                    <span>{selectedEntity.phone || 'Non renseigné'}</span>
                  </div>
                </div>

                {/* Financial Terms */}
                {mode === 'clients' && (
                  <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
                    <span className="font-bold font-sans text-[11px] text-neutral-600 dark:text-neutral-400 block uppercase">
                      Encours & Conditions Commerciales
                    </span>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Encours Actuel :</span>
                      <span className="font-bold text-rose-600">
                        {formatMoney((selectedEntity as B2bClient).outstandingBalance || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Plafond Autorisé :</span>
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {formatMoney((selectedEntity as B2bClient).creditLimit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Délai Règlement :</span>
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {(selectedEntity as B2bClient).paymentTermsDays} jours
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Documents History */}
                {mode === 'clients' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">
                        Historique Pièces ({entityHistory.length})
                      </span>
                      <button
                        onClick={() => {
                          setComposerOpen(true);
                        }}
                        className="text-[11px] font-semibold text-[#C4785A] hover:underline"
                      >
                        + Créer document
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {entityHistory.map((d) => (
                        <div
                          key={d.id}
                          className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{d.docNumber}</span>
                          <span className="font-mono font-bold text-[#C4785A]">{formatMoney(d.netToPay)}</span>
                        </div>
                      ))}
                      {entityHistory.length === 0 && (
                        <p className="text-neutral-400 text-[11px] italic">Aucune transaction pour ce client.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      <B2bEntityModal
        isOpen={entityModalOpen}
        onClose={() => setEntityModalOpen(false)}
        entityType={mode === 'clients' ? 'client' : 'supplier'}
        editingEntity={editingEntity}
      />

      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            if (mode === 'clients') {
              deleteB2bClient(deleteTarget.id);
            } else {
              deleteB2bSupplier(deleteTarget.id);
            }
            setDeleteTarget(null);
            setSelectedEntity(null);
          }
        }}
        title="Supprimer la fiche partenaire ?"
        description={`Êtes-vous certain de vouloir supprimer cette fiche ? Cette action retirera les coordonnées associées.`}
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};
