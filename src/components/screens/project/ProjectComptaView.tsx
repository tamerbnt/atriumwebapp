import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCcpSlip, PMExpense, PMEquipmentStock, PMPayrollBatch } from '../../../types/index';
import { CcpSlipModal } from './CcpSlipModal';
import {
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Boxes,
  CheckCircle,
  AlertCircle,
  Printer,
  Eye,
  Lock,
  Download,
  Filter,
  Search,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Check,
  Tag,
  History,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  X,
} from 'lucide-react';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface ProjectComptaViewProps {
  initialTab?: 'payroll' | 'ccp' | 'expenses' | 'stock';
}

export const ProjectComptaView: React.FC<ProjectComptaViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmPayrollBatches,
    pmCcpSlips,
    pmExpenses,
    pmEquipmentStock,
    generatePmCcpSlipsForBatch,
    markPmCcpSlipPrinted,
    batchMarkPmCcpSlipsPrinted,
    approvePmExpense,
    batchApprovePmExpenses,
    batchDeletePmExpenses,
    updatePmEquipmentStatus,
    batchUpdatePmEquipmentStatus,
    batchDeletePmEquipmentStock,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!pmPayrollBatches || pmPayrollBatches.length === 0) {
      resetPmMockData();
    }
  }, [pmPayrollBatches, resetPmMockData]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const activeTab: 'payroll' | 'ccp' | 'expenses' | 'stock' =
    activePmSubScreen === 'ccp' || initialTab === 'ccp'
      ? 'ccp'
      : activePmSubScreen === 'expenses' || initialTab === 'expenses'
      ? 'expenses'
      : activePmSubScreen === 'stock' || initialTab === 'stock'
      ? 'stock'
      : 'payroll';

  const setActiveTab = (tab: 'payroll' | 'ccp' | 'expenses' | 'stock') => {
    setActivePmSubScreen(tab);
  };

  const [selectedSlip, setSelectedSlip] = useState<PMCcpSlip | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedStockAssetId, setSelectedStockAssetId] = useState<string>(
    pmEquipmentStock[0]?.id || 'eq_00'
  );
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');
  const [batchGeneratedSuccess, setBatchGeneratedSuccess] = useState(false);

  // CCP Slips Collection State
  const [ccpSearch, setCcpSearch] = useState('');
  const [selectedSlipIds, setSelectedSlipIds] = useState<Set<string>>(new Set());
  const [pinnedSlipIds, setPinnedSlipIds] = useState<Set<string>>(new Set());
  const [slipSortBy, setSlipSortBy] = useState('beneficiary');
  const [slipSortDir, setSlipSortDir] = useState<'asc' | 'desc'>('asc');

  // Expenses Collection State
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(new Set());

  // Stock Collection State
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());
  const [pinnedStockIds, setPinnedStockIds] = useState<Set<string>>(new Set());

  // Filtered & Sorted CCP Slips
  const filteredSlips = useMemo(() => {
    return pmCcpSlips.filter((s) => {
      const q = ccpSearch.toLowerCase().trim();
      return (
        !q ||
        s.beneficiaryName.toLowerCase().includes(q) ||
        s.ccpNumber.includes(q) ||
        s.wilayaName.toLowerCase().includes(q) ||
        s.transactionReference.toLowerCase().includes(q)
      );
    });
  }, [pmCcpSlips, ccpSearch]);

  const sortedSlips = useMemo(() => {
    return [...filteredSlips].sort((a, b) => {
      const aPinned = pinnedSlipIds.has(a.id);
      const bPinned = pinnedSlipIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (slipSortBy === 'beneficiary') {
        const cmp = a.beneficiaryName.localeCompare(b.beneficiaryName);
        return slipSortDir === 'asc' ? cmp : -cmp;
      }
      if (slipSortBy === 'amount') {
        return slipSortDir === 'asc' ? a.amountDzd - b.amountDzd : b.amountDzd - a.amountDzd;
      }
      return 0;
    });
  }, [filteredSlips, pinnedSlipIds, slipSortBy, slipSortDir]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return pmExpenses.filter((e) => {
      const q = expenseSearch.toLowerCase().trim();
      return (
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.projectTitle.toLowerCase().includes(q) ||
        e.declaredByUserName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [pmExpenses, expenseSearch]);

  // Filtered Stock
  const filteredStock = useMemo(() => {
    return pmEquipmentStock.filter((eq) => {
      const q = stockSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        eq.assetCode.toLowerCase().includes(q) ||
        eq.title.toLowerCase().includes(q) ||
        eq.currentCustodianName?.toLowerCase().includes(q);
      const matchCat = stockCategoryFilter === 'all' || eq.category === stockCategoryFilter;
      return matchQ && matchCat;
    });
  }, [pmEquipmentStock, stockSearch, stockCategoryFilter]);

  // CCP Column Definitions
  const ccpColumns: ColumnDefinition<PMCcpSlip>[] = useMemo(
    () => [
      {
        key: 'beneficiary',
        header: 'Bénéficiaire Animateur',
        width: '2.5*',
        minWidth: '220px',
        sortable: true,
        renderCell: (slip) => {
          const isPinned = pinnedSlipIds.has(slip.id);
          return (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedSlipIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(slip.id)) next.delete(slip.id);
                    else next.add(slip.id);
                    return next;
                  });
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-zinc-300 hover:text-zinc-500'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  {slip.beneficiaryName}
                </div>
                <div className="text-[11px] text-zinc-500 truncate max-w-[190px]">
                  {slip.wilayaName} · {slip.transactionReference}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'ccp',
        header: 'Compte CCP & Clé',
        width: '1.8*',
        minWidth: '170px',
        renderCell: (slip) => (
          <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
            <span className="font-bold">{slip.ccpNumber}</span> / Clé <span className="font-bold">{slip.ccpKey}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Montant Net DZD',
        width: '1.5*',
        minWidth: '140px',
        sortable: true,
        align: 'right',
        renderCell: (slip) => (
          <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(slip.amountDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut Mandat',
        width: '1.3*',
        minWidth: '130px',
        align: 'center',
        renderCell: (slip) => (
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              slip.isPrinted
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {slip.isPrinted ? 'Bordereau Imprimé' : 'À Imprimer (SFP 01)'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Imprimer SFP 01',
        width: '1.2*',
        minWidth: '130px',
        align: 'right',
        renderCell: (slip) => (
          <button
            type="button"
            onClick={() => setSelectedSlip(slip)}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Mandat</span>
          </button>
        ),
      },
    ],
    [pinnedSlipIds]
  );

  // Expense Column Definitions
  const expenseColumns: ColumnDefinition<PMExpense>[] = useMemo(
    () => [
      {
        key: 'expense',
        header: 'Désignation & Déclarant',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (exp) => (
          <div>
            <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              {exp.title}
            </div>
            <div className="text-[11px] text-zinc-400">
              Par {exp.declaredByUserName} ({exp.declaredByRole}) · {exp.projectTitle}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Catégorie',
        width: '1.5*',
        minWidth: '140px',
        renderCell: (exp) => (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {exp.category}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Montant DZD',
        width: '1.5*',
        minWidth: '140px',
        align: 'right',
        renderCell: (exp) => (
          <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(exp.amountDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'fiscal',
        header: 'Fiscalité',
        width: '1.2*',
        minWidth: '120px',
        align: 'center',
        renderCell: (exp) => (
          <span className={`text-[11px] font-bold ${exp.hasFiscalInvoice ? 'text-emerald-600' : 'text-zinc-400'}`}>
            {exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu simple'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Justificatif',
        width: '1*',
        minWidth: '100px',
        align: 'right',
        renderCell: (exp) => (
          <button
            type="button"
            onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer ml-auto"
            title="Inspecter le scan"
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  );

  // Equipment Stock Column Definitions
  const stockColumns: ColumnDefinition<PMEquipmentStock>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code Actif & Désignation',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (eq) => (
          <div className="flex items-center gap-2.5">
            <div className="font-mono text-xs font-bold text-[#C4785A]">
              {eq.assetCode}
            </div>
            <div>
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{eq.title}</div>
              <div className="text-[11px] text-zinc-500 font-mono">Affecté à : {eq.currentCustodianName || 'Agence'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Coût Acquisition',
        width: '1.5*',
        minWidth: '140px',
        align: 'right',
        renderCell: (eq) => (
          <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(eq.acquisitionCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'État Actif',
        width: '1.5*',
        minWidth: '150px',
        align: 'center',
        renderCell: (eq) => {
          const map: Record<string, { label: string; bg: string; text: string }> = {
            in_warehouse: { label: 'En Stock Agence', bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300', text: '' },
            deployed_on_mission: { label: 'Déployé sur Terrain', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', text: '' },
            under_repair: { label: 'En Maintenance', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', text: '' },
            retired_scrapped: { label: 'Réformé / Amorti', bg: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300', text: '' },
          };
          const b = map[eq.currentStatus] || { label: eq.currentStatus, bg: 'bg-zinc-100 text-zinc-700' };
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${b.bg}`}>
              {b.label}
            </span>
          );
        },
      },
    ],
    []
  );

  const handleExportCcpCsv = () => {
    const headers = ['Bénéficiaire', 'Numéro CCP', 'Clé', 'Wilaya', 'Montant DZD', 'Montant en Lettres', 'Référence', 'Imprimé'];
    const rows = sortedSlips.map((s) => [
      `"${s.beneficiaryName.replace(/"/g, '""')}"`,
      `"${s.ccpNumber}"`,
      `"${s.ccpKey}"`,
      `"${s.wilayaName}"`,
      s.amountDzd,
      `"${s.amountInWordsFr}"`,
      `"${s.transactionReference}"`,
      s.isPrinted ? 'Oui' : 'Non',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bordereaux_ccp_sfp01_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateAllCcpBatch = () => {
    const pendingBatches = pmPayrollBatches.filter((b) => b.status === 'approved_by_direction');
    pendingBatches.forEach((batch) => {
      generatePmCcpSlipsForBatch(batch.id);
    });
    setBatchGeneratedSuccess(true);
    setTimeout(() => {
      setBatchGeneratedSuccess(false);
      setActiveTab('ccp');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header with Facility Dropdown & Demo Data */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Comptabilité & Trésorerie
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Décaissements & Mandats CCP SFP 01</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'payroll'
              ? 'Lots de Paie Validés DG'
              : activeTab === 'ccp'
              ? 'Bordereaux CCP SFP 01 (Algérie Poste)'
              : activeTab === 'expenses'
              ? 'Remboursements Achats & Frais'
              : 'Traçabilité Stock & Immobilisations'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Cyberpark Tower B</div>
                )}
              </div>
            )}
          </div>

          {/* Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger les données comptables et bordereaux CCP"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          {activeTab === 'ccp' && (
            <button
              onClick={handleExportCcpCsv}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'payroll', label: 'Paies Validées DG', icon: CreditCard, count: pmPayrollBatches.filter((b) => b.status === 'approved_by_direction').length },
          { id: 'ccp', label: 'Bordereaux CCP SFP 01', icon: Printer, count: pmCcpSlips.length },
          { id: 'expenses', label: 'Remboursements Achats', icon: Receipt, count: pmExpenses.filter((e) => e.status === 'approved_by_direction').length },
          { id: 'stock', label: 'Stock & Mobilier', icon: Boxes, count: pmEquipmentStock.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#C4785A] text-[#C4785A]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAIES VALIDEES DG */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
                Génération des Mandats Postaux (Slide 10)
              </span>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Déblocage Trésorerie Postale
              </h2>
              <p className="text-xs text-zinc-500">
                Chaque lot validé par la Direction Générale génère les bordereaux officiels SFP 01 avec montant en toutes lettres.
              </p>
            </div>

            {pmPayrollBatches.some((b) => b.status === 'approved_by_direction') && (
              <button
                type="button"
                onClick={handleGenerateAllCcpBatch}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                Générer Tous les Bordereaux CCP ➔
              </button>
            )}
          </div>

          <div className="space-y-3">
            {pmPayrollBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {batch.batchNumber}
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
                      {batch.projectTitle}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      batch.status === 'ccp_generated'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {batch.status === 'ccp_generated' ? 'Bordereaux CCP Prêts' : 'Validé DG — Prêt CCP'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Mission {batch.missionCode} · {batch.totalBeneficiaries} animateurs avec numéros CCP et clés vérifiés.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block uppercase font-medium">Montant Global</span>
                    <span className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatMoney(batch.totalAmountDzd, 'DZD')}
                    </span>
                  </div>
                  {batch.status !== 'ccp_generated' && (
                    <button
                      type="button"
                      onClick={() => generatePmCcpSlipsForBatch(batch.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Générer CCP
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BORDEREAUX CCP SFP 01 (UniversalDataCollection) */}
      {activeTab === 'ccp' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <Seek
              value={ccpSearch}
              onChange={setCcpSearch}
              placeholder="Rechercher par animateur, compte CCP ou wilaya..."
              openWidth={360}
              shutSize={38}
            />
            <span className="text-xs text-zinc-500 font-semibold">
              {filteredSlips.length} bordereau(x) prêt(s) pour Algérie Poste
            </span>
          </div>

          {selectedSlipIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#DC2626]">
                <span>{selectedSlipIds.size} mandat(s) postal(aux) sélectionné(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedSlipIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchMarkPmCcpSlipsPrinted(Array.from(selectedSlipIds));
                    setSelectedSlipIds(new Set());
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Marquer Imprimés
                </button>
              </div>
            </div>
          )}

          <UniversalDataCollection<PMCcpSlip>
            items={sortedSlips}
            keyExtractor={(s) => s.id}
            defaultViewMode="list"
            columns={ccpColumns}
            sortBy={slipSortBy}
            sortDirection={slipSortDir}
            onSortChange={(key) => {
              if (slipSortBy === key) {
                setSlipSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSlipSortBy(key);
                setSlipSortDir('asc');
              }
            }}
            selectedIds={selectedSlipIds}
            onSelectionChange={setSelectedSlipIds}
            renderCard={(slip) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <span>{slip.beneficiaryName}</span>
                    <span className="font-mono text-zinc-400">{slip.wilayaName}</span>
                  </div>
                  <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    CCP : {slip.ccpNumber} / {slip.ccpKey}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {slip.transactionReference}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">
                    {formatMoney(slip.amountDzd, 'DZD')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSlip(slip)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    Mandat
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: REMBOURSEMENTS ACHATS (UniversalDataCollection) */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <Seek
              value={expenseSearch}
              onChange={setExpenseSearch}
              placeholder="Rechercher par titre de frais ou déclarant..."
              openWidth={360}
              shutSize={38}
            />
            {selectedExpenseIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchApprovePmExpenses(Array.from(selectedExpenseIds));
                    setSelectedExpenseIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  Valider Remboursement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchDeletePmExpenses(Array.from(selectedExpenseIds));
                    setSelectedExpenseIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            )}
          </div>

          <UniversalDataCollection<PMExpense>
            items={filteredExpenses}
            keyExtractor={(e) => e.id}
            defaultViewMode="list"
            columns={expenseColumns}
            selectedIds={selectedExpenseIds}
            onSelectionChange={setSelectedExpenseIds}
            renderCard={(exp) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-400">{exp.missionCode || exp.projectTitle}</span>
                    <span className="capitalize text-zinc-500 font-semibold">{exp.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {exp.title}
                  </h4>
                  <p className="text-xs text-zinc-500">Par {exp.declaredByUserName}</p>
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">
                    {formatMoney(exp.amountDzd, 'DZD')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    exp.status === 'approved_by_direction'
                      ? 'bg-emerald-100 text-emerald-700'
                      : exp.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {exp.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 4: STOCK & MOBILIER (UniversalDataCollection) */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={stockSearch}
                onChange={setStockSearch}
                placeholder="Rechercher équipement par code actif ou nom..."
                openWidth={360}
                shutSize={38}
              />
              <FilterSelect
                label="Catégorie"
                value={stockCategoryFilter}
                onChange={(val) => setStockCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: 'Toutes les catégories' },
                  { value: 'counter_desk', label: 'Comptoirs & Stands' },
                  { value: 'display_totem', label: 'Totems & Structures' },
                  { value: 'sound_tech', label: 'Sono & Électronique' },
                  { value: 'uniforms', label: 'Textiles Agence' },
                ]}
              />
            </div>

            <div className="text-xs text-zinc-500 font-semibold">
              {filteredStock.length} actif(s) en inventaire
            </div>
          </div>

          <UniversalDataCollection<PMEquipmentStock>
            items={filteredStock}
            keyExtractor={(eq) => eq.id}
            defaultViewMode="list"
            columns={stockColumns}
            selectedIds={selectedStockIds}
            onSelectionChange={setSelectedStockIds}
            renderCard={(eq) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#C4785A]">
                    <span>{eq.assetCode}</span>
                    <span className="text-zinc-500 font-normal">{eq.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {eq.title}
                  </h4>
                  <p className="text-xs text-zinc-500">État : {eq.conditionReport}</p>
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatMoney(eq.acquisitionCostDzd, 'DZD')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 capitalize">
                    {eq.currentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* CCP Slip SFP 01 Official Modal Preview */}
      {selectedSlip && (
        <CcpSlipModal
          isOpen={Boolean(selectedSlip)}
          onClose={() => setSelectedSlip(null)}
          slip={selectedSlip}
          onMarkPrinted={() => {
            markPmCcpSlipPrinted(selectedSlip.id);
            setSelectedSlip(null);
          }}
        />
      )}

      {/* Receipt Scan Inspection Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C4785A]" />
                Justificatif Fiscal d'Achat
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={selectedReceiptUrl} alt="Scan Justificatif" className="w-full h-72 object-cover rounded-xl" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer"
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
