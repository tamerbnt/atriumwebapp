import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  useAtriumStore,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import {
  PMCcpSlip,
  PMExpense,
  PMEquipmentStock,
} from '../../../types/index';
import { CcpSlipModal } from './CcpSlipModal';
import {
  CreditCard,
  Receipt,
  Boxes,
  CheckCircle,
  Printer,
  Eye,
  Download,
  Pin,
  X,
  Wrench,
  PackageCheck,
} from 'lucide-react';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonFinanceAudit } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  KineticFilterModal,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticStatusVariant,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface ProjectComptaViewProps {
  initialTab?: 'payroll' | 'ccp' | 'expenses' | 'stock';
}

const getEquipmentStatusBadge = (
  status: string,
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  if (status === 'in_stock' || status === 'in_warehouse') {
    return {
      label: isAr ? 'في المخزن' : isEn ? 'In Stock' : 'En Stock Agence',
      variant: 'active',
      pillClass:
        'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
    };
  }
  if (status === 'deployed_on_mission') {
    return {
      label: isAr ? 'مُنشر ميدانياً' : isEn ? 'Deployed' : 'Déployé sur Terrain',
      variant: 'info',
      pillClass:
        'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
    };
  }
  if (status === 'in_maintenance' || status === 'under_repair') {
    return {
      label: isAr ? 'قيد الصيانة' : isEn ? 'Maintenance' : 'En Maintenance',
      variant: 'warning',
      pillClass:
        'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
    };
  }
  if (status === 'decommissioned' || status === 'retired_scrapped') {
    return {
      label: isAr ? 'مُستبعد / مُهتلك' : isEn ? 'Decommissioned' : 'Réformé / Amorti',
      variant: 'blocked',
      pillClass:
        'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
    };
  }
  return {
    label: status,
    variant: 'neutral',
    pillClass:
      'bg-[#F3EDE7] dark:bg-neutral-800 text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-neutral-700',
  };
};

export const ProjectComptaView: React.FC<ProjectComptaViewProps> = ({ initialTab }) => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const state = useAtriumStore();
  const {
    currentBranch,
    branches,
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
    batchDeletePmEquipmentStock,
    activePmSubScreen,
    setActivePmSubScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = state;

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTab: 'payroll' | 'ccp' | 'expenses' | 'stock' =
    activePmSubScreen === 'ccp' || initialTab === 'ccp'
      ? 'ccp'
      : activePmSubScreen === 'expenses' || initialTab === 'expenses'
      ? 'expenses'
      : activePmSubScreen === 'stock' || initialTab === 'stock'
      ? 'stock'
      : 'payroll';

  const setActiveTab = useCallback(
    (tab: string) => {
      setActivePmSubScreen(tab);
    },
    [setActivePmSubScreen]
  );

  const [selectedSlip, setSelectedSlip] = useState<PMCcpSlip | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // CCP state
  const [ccpSearch, setCcpSearch] = useState('');
  const [ccpPrintFilter, setCcpPrintFilter] = useState('all');
  const [ccpViewMode, setCcpViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isCcpFilterOpen, setIsCcpFilterOpen] = useState(false);
  const ccpFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedSlipIds, setSelectedSlipIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedSlipIds, setPinnedSlipIds] = useState<Set<string>>(() => new Set<string>());
  const [slipSortBy, setSlipSortBy] = useState('beneficiary');
  const [slipSortDir, setSlipSortDir] = useState<'asc' | 'desc'>('asc');
  const [inspectedSlip, setInspectedSlip] = useState<PMCcpSlip | null>(null);
  const [slipOpenerEl, setSlipOpenerEl] = useState<HTMLElement | null>(null);

  // Expenses state
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');
  const [expenseViewMode, setExpenseViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isExpenseFilterOpen, setIsExpenseFilterOpen] = useState(false);
  const expenseFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedExpense, setInspectedExpense] = useState<PMExpense | null>(null);
  const [expenseOpenerEl, setExpenseOpenerEl] = useState<HTMLElement | null>(null);

  // Stock state
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockViewMode, setStockViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isStockFilterOpen, setIsStockFilterOpen] = useState(false);
  const stockFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedStockIds, setPinnedStockIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedStock, setInspectedStock] = useState<PMEquipmentStock | null>(null);
  const [stockOpenerEl, setStockOpenerEl] = useState<HTMLElement | null>(null);

  const filteredSlips = useMemo(() => {
    const q = ccpSearch.toLowerCase().trim();
    return pmCcpSlips.filter((s) => {
      const matchQ =
        !q ||
        s.beneficiaryName.toLowerCase().includes(q) ||
        s.ccpNumber.includes(q) ||
        s.wilayaName.toLowerCase().includes(q) ||
        s.transactionReference.toLowerCase().includes(q);
      const matchPr =
        ccpPrintFilter === 'all' ||
        (ccpPrintFilter === 'printed' && s.isPrinted) ||
        (ccpPrintFilter === 'to_print' && !s.isPrinted);
      return matchQ && matchPr;
    });
  }, [pmCcpSlips, ccpSearch, ccpPrintFilter]);

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

  const filteredExpenses = useMemo(() => {
    const q = expenseSearch.toLowerCase().trim();
    return pmExpenses
      .filter((e) => {
        const matchQ =
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.projectTitle.toLowerCase().includes(q) ||
          e.declaredByUserName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q);
        const matchSt = expenseStatusFilter === 'all' || e.status === expenseStatusFilter;
        return matchQ && matchSt;
      })
      .sort((a, b) => {
        const aP = pinnedExpenseIds.has(a.id);
        const bP = pinnedExpenseIds.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return 0;
      });
  }, [pmExpenses, expenseSearch, expenseStatusFilter, pinnedExpenseIds]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    return pmEquipmentStock
      .filter((eq) => {
        const matchQ =
          !q ||
          eq.assetCode.toLowerCase().includes(q) ||
          eq.title.toLowerCase().includes(q) ||
          (eq.currentCustodianName || '').toLowerCase().includes(q);
        const matchCat =
          stockCategoryFilter === 'all' ||
          eq.category === stockCategoryFilter ||
          (stockCategoryFilter === 'display_totem' &&
            (eq.category === 'display_stand' || eq.category === 'rollup_base')) ||
          (stockCategoryFilter === 'sound_tech' && eq.category === 'sound_system') ||
          (stockCategoryFilter === 'uniforms' && eq.category === 'uniform');
        return matchQ && matchCat;
      })
      .sort((a, b) => {
        const aP = pinnedStockIds.has(a.id);
        const bP = pinnedStockIds.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return 0;
      });
  }, [pmEquipmentStock, stockSearch, stockCategoryFilter, pinnedStockIds]);

  const activeSlip = useMemo(
    () => (inspectedSlip ? pmCcpSlips.find((s) => s.id === inspectedSlip.id) || inspectedSlip : null),
    [inspectedSlip, pmCcpSlips]
  );
  const activeExpense = useMemo(
    () =>
      inspectedExpense
        ? pmExpenses.find((e) => e.id === inspectedExpense.id) || inspectedExpense
        : null,
    [inspectedExpense, pmExpenses]
  );
  const activeStock = useMemo(
    () =>
      inspectedStock
        ? pmEquipmentStock.find((s) => s.id === inspectedStock.id) || inspectedStock
        : null,
    [inspectedStock, pmEquipmentStock]
  );

  const handleTogglePinSlip = useCallback((slip: PMCcpSlip) => {
    setPinnedSlipIds((prev) => {
      const next = new Set(prev);
      if (next.has(slip.id)) next.delete(slip.id);
      else next.add(slip.id);
      return next;
    });
  }, []);

  const handleTogglePinExpense = useCallback((exp: PMExpense) => {
    setPinnedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exp.id)) next.delete(exp.id);
      else next.add(exp.id);
      return next;
    });
  }, []);

  const handleTogglePinStock = useCallback((eq: PMEquipmentStock) => {
    setPinnedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(eq.id)) next.delete(eq.id);
      else next.add(eq.id);
      return next;
    });
  }, []);

  const handleExportCcpCsv = useCallback(() => {
    const headers = [
      'Bénéficiaire',
      'Numéro CCP',
      'Clé',
      'Wilaya',
      'Montant DZD',
      'Montant en Lettres',
      'Référence',
      'Imprimé',
    ];
    const rows = sortedSlips.map((s) => [
      s.beneficiaryName,
      s.ccpNumber,
      s.ccpKey,
      s.wilayaName,
      s.amountDzd,
      s.amountInWordsFr,
      s.transactionReference,
      s.isPrinted ? 'Oui' : 'Non',
    ]);
    downloadCsvSafe(
      `bordereaux_ccp_sfp01_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير جدول صكوك CCP CSV' : 'Export CSV CCP SFP 01 généré', 'info');
  }, [sortedSlips, isAr]);

  const handleGenerateAllCcpBatch = useCallback(() => {
    const readyBatches = pmPayrollBatches.filter((b) => b.status === 'approved_by_direction');
    readyBatches.forEach((batch) => {
      generatePmCcpSlipsForBatch(batch.id);
    });
    showToast(
      isAr
        ? `تم إصدار ${readyBatches.length} دفعة صكوك CCP SFP 01`
        : `${readyBatches.length} lot(s) de bordereaux CCP générés`,
      'success'
    );
    setActiveTab('ccp');
  }, [pmPayrollBatches, generatePmCcpSlipsForBatch, isAr, setActiveTab]);

  // Kinetic Row Metadata
  const getSlipRowMeta = useCallback(
    (slip: PMCcpSlip): Partial<KineticRowData> => {
      const br = resolveRecordBranch(slip, branchesById, currentBranch, language);
      return {
        title: slip.beneficiaryName,
        subline: `CCP ${slip.ccpNumber} / ${slip.ccpKey} · ${slip.wilayaName}`,
        avatarText: slip.beneficiaryName.slice(0, 2).toUpperCase(),
        categoryLabel: slip.transactionReference,
        statusLabel: slip.isPrinted
          ? isAr
            ? 'تمت الطباعة'
            : isEn
            ? 'Printed'
            : 'Bordereau Imprimé'
          : isAr
          ? 'للطباعة SFP 01'
          : isEn
          ? 'Pending Print'
          : 'À Imprimer (SFP 01)',
        statusVariant: slip.isPrinted ? 'active' : 'warning',
        metricPrimary: formatMoney(slip.amountDzd, 'DZD'),
        metricSecondary: `Clé ${slip.ccpKey}`,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedSlipIds.has(slip.id),
        detailCol1: {
          heading: 'Compte CCP Algérie Poste',
          primaryText: slip.ccpNumber,
          secondaryText: `Clé RIP ${slip.ccpKey}`,
        },
        detailCol2: {
          heading: 'Mandat SFP 01',
          primaryText: slip.transactionReference,
          secondaryText: formatMoney(slip.amountDzd, 'DZD'),
        },
        detailCol3: {
          heading: isAr ? 'المستفيد والولاية' : isEn ? 'Beneficiary' : 'Bénéficiaire & Wilaya',
          primaryText: slip.beneficiaryName,
          secondaryText: `${slip.wilayaName} · ${br.name}`,
        },
      };
    },
    [branchesById, currentBranch, language, pinnedSlipIds, isAr, isEn]
  );

  const getExpenseRowMeta = useCallback(
    (exp: PMExpense): Partial<KineticRowData> => {
      const br = resolveRecordBranch(exp, branchesById, currentBranch, language);
      const isApp = exp.status === 'approved_by_direction' || exp.status === 'audited_and_paid';
      const isRej = exp.status === 'rejected';
      return {
        title: exp.title,
        subline: `${exp.declaredByUserName} · ${exp.projectTitle}`,
        avatarText: exp.category.slice(0, 2).toUpperCase(),
        categoryLabel: exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu Simple',
        statusLabel: isApp
          ? isAr
            ? 'مُصادق عليه'
            : isEn
            ? 'Approved'
            : 'Validé DG'
          : isRej
          ? isAr
            ? 'مرفوض'
            : isEn
            ? 'Rejected'
            : 'Rejeté'
          : isAr
          ? 'قيد الانتظار'
          : isEn
          ? 'Pending'
          : 'En Attente DG',
        statusVariant: isApp ? 'active' : isRej ? 'blocked' : 'warning',
        metricPrimary: formatMoney(exp.amountDzd, 'DZD'),
        metricSecondary: exp.category,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedExpenseIds.has(exp.id),
        detailCol1: {
          heading: isAr ? 'المشروع والمصرح' : isEn ? 'Project & Claimant' : 'Projet & Déclarant',
          primaryText: exp.declaredByUserName,
          secondaryText: exp.projectTitle,
          tertiaryText: br.name,
        },
        detailCol2: {
          heading: isAr ? 'الوثيقة الضريبية' : isEn ? 'Fiscal Proof' : 'Pièce Comptable',
          primaryText: exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu Simple',
          secondaryText: exp.category,
        },
        detailCol3: {
          heading: isAr ? 'المبلغ والاعتماد' : isEn ? 'Amount & Audit' : 'Montant & Visa',
          primaryText: formatMoney(exp.amountDzd, 'DZD'),
          secondaryText: isApp ? (isAr ? 'مُصادق عليه' : 'Validé DG') : isRej ? (isAr ? 'مرفوض' : 'Rejeté') : isAr ? 'قيد الانتظار' : 'En Attente DG',
        },
      };
    },
    [branchesById, currentBranch, language, pinnedExpenseIds, isAr, isEn]
  );

  const getStockRowMeta = useCallback(
    (eq: PMEquipmentStock): Partial<KineticRowData> => {
      const br = resolveRecordBranch(eq, branchesById, currentBranch, language);
      const badge = getEquipmentStatusBadge(eq.currentStatus, language);
      return {
        title: `${eq.assetCode} · ${eq.title}`,
        subline: `${isAr ? 'مُعهد إلى:' : 'Affecté à :'} ${eq.currentCustodianName || 'Agence'}`,
        avatarText: eq.category.slice(0, 2).toUpperCase(),
        categoryLabel: eq.category.replace(/_/g, ' '),
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: formatMoney(eq.acquisitionCostDzd, 'DZD'),
        metricSecondary: eq.conditionReport,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedStockIds.has(eq.id),
        detailCol1: {
          heading: isAr ? 'المعدات والرمز' : isEn ? 'Asset & Code' : 'Équipement & Code',
          primaryText: eq.title,
          secondaryText: `${eq.assetCode} · ${eq.category.replace(/_/g, ' ')}`,
          tertiaryText: br.name,
        },
        detailCol2: {
          heading: isAr ? 'المستلم والحالة' : isEn ? 'Custodian & State' : 'Affectation & État',
          primaryText: eq.currentCustodianName || 'Agence',
          secondaryText: eq.conditionReport,
        },
        detailCol3: {
          heading: isAr ? 'قيمة الاستحواذ' : isEn ? 'Acquisition Cost' : 'Valeur Actif',
          primaryText: formatMoney(eq.acquisitionCostDzd, 'DZD'),
          secondaryText: badge.label,
        },
      };
    },
    [branchesById, currentBranch, language, pinnedStockIds, isAr]
  );

  // Columns
  const ccpColumns = useMemo<ColumnDefinition<PMCcpSlip>[]>(
    () => [
      {
        key: 'beneficiary',
        header: isAr ? 'المستفيد (المنشط)' : isEn ? 'Beneficiary' : 'Bénéficiaire Animateur',
        width: '2.5*',
        minWidth: '220px',
        sortable: true,
        renderCell: (slip) => {
          const isPinned = pinnedSlipIds.has(slip.id);
          return (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Pin"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePinSlip(slip);
                }}
                className={`p-1 transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-[#d4522f] bg-[#d4522f]/10'
                    : 'text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80'
                }`}
                data-sq="ctl-sm"
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="font-semibold text-xs text-black dark:text-white">
                  {slip.beneficiaryName}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[190px]">
                  {slip.wilayaName} · {slip.transactionReference}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'ccp',
        header: isAr ? 'حساب CCP والمفتاح' : isEn ? 'CCP Account' : 'Compte CCP & Clé',
        width: '1.8*',
        minWidth: '170px',
        renderCell: (slip) => (
          <div className="font-mono text-xs text-black/70 dark:text-white/75">
            <span className="font-bold">{slip.ccpNumber}</span> / Clé{' '}
            <span className="font-bold">{slip.ccpKey}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: isAr ? 'المبلغ الصافي دج' : isEn ? 'Net DZD' : 'Montant Net DZD',
        width: '1.5*',
        minWidth: '140px',
        sortable: true,
        align: 'right',
        renderCell: (slip) => (
          <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {formatMoney(slip.amountDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الحوالة' : isEn ? 'Slip Status' : 'Statut Mandat',
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
        header: 'SFP 01',
        width: '1.2*',
        minWidth: '120px',
        align: 'right',
        renderCell: (slip) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSlip(slip);
            }}
            data-sq="ctl-sm"
            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Mandat</span>
          </button>
        ),
      },
    ],
    [pinnedSlipIds, handleTogglePinSlip, isAr, isEn]
  );

  const expenseColumns = useMemo<ColumnDefinition<PMExpense>[]>(
    () => [
      {
        key: 'expense',
        header: isAr ? 'البيان والمصرح' : isEn ? 'Expense & Claimant' : 'Désignation & Déclarant',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (exp) => (
          <div>
            <div className="font-semibold text-xs text-black dark:text-white">{exp.title}</div>
            <div className="text-[11px] text-black/55 dark:text-white/55">
              Par {exp.declaredByUserName} ({exp.declaredByRole}) · {exp.projectTitle}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie',
        width: '1.4*',
        minWidth: '130px',
        renderCell: (exp) => (
          <span className="px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75">
            {exp.category}
          </span>
        ),
      },
      {
        key: 'amount',
        header: isAr ? 'المبلغ دج' : isEn ? 'Amount' : 'Montant DZD',
        width: '1.4*',
        minWidth: '130px',
        align: 'right',
        renderCell: (exp) => (
          <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {formatMoney(exp.amountDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'fiscal',
        header: isAr ? 'الجبائية' : isEn ? 'Fiscal' : 'Fiscalité',
        width: '1.2*',
        minWidth: '110px',
        align: 'center',
        renderCell: (exp) => (
          <span
            className={`text-[11px] font-bold ${
              exp.hasFiscalInvoice ? 'text-emerald-600' : 'text-black/55 dark:text-white/55'
            }`}
          >
            {exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu simple'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: isAr ? 'الوصل' : isEn ? 'Scan' : 'Justificatif',
        width: '0.9*',
        minWidth: '90px',
        align: 'right',
        renderCell: (exp) =>
          exp.receiptPhotoUrl ? (
            <button
              type="button"
              aria-label="Inspecter le scan"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReceiptUrl(exp.receiptPhotoUrl || null);
              }}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer ml-auto"
            >
              <Eye className="w-4 h-4" />
            </button>
          ) : null,
      },
    ],
    [isAr, isEn]
  );

  const stockColumns = useMemo<ColumnDefinition<PMEquipmentStock>[]>(
    () => [
      {
        key: 'code',
        header: isAr ? 'رمز الأصل والتعيين' : isEn ? 'Asset Code' : 'Code Actif & Désignation',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (eq) => (
          <div className="flex items-center gap-2.5">
            <div className="font-mono text-xs font-bold text-[#d4522f]">{eq.assetCode}</div>
            <div>
              <div className="font-semibold text-xs text-black dark:text-white">{eq.title}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
                Affecté à : {eq.currentCustodianName || 'Agence'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: isAr ? 'تكلفة الاقتناء' : isEn ? 'Cost' : 'Coût Acquisition',
        width: '1.5*',
        minWidth: '140px',
        align: 'right',
        renderCell: (eq) => (
          <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {formatMoney(eq.acquisitionCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الأصل' : isEn ? 'Status' : 'État Actif',
        width: '1.5*',
        minWidth: '150px',
        align: 'center',
        renderCell: (eq) => {
          const badge = getEquipmentStatusBadge(eq.currentStatus, language);
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmPayrollBatches.length > 0 || pmCcpSlips.length > 0,
  });

  if (
    showSkeleton &&
    ((pmPayrollBatches.length === 0 && pmCcpSlips.length === 0) || networkMode === 'force_skeleton')
  ) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
        <SkeletonFinanceAudit
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
      </div>
    );
  }

  const totalCcpVolume = pmCcpSlips.reduce((sum, s) => sum + s.amountDzd, 0);
  const approvedExpensesCount = pmExpenses.filter(
    (e) => e.status === 'approved_by_direction'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />

      <ScreenHeaderBar
        icon={<CreditCard size={22} />}
        title={
          activeTab === 'payroll'
            ? isAr
              ? 'الأجور'
              : isEn
              ? 'Payroll'
              : 'Paie'
            : activeTab === 'ccp'
            ? isAr
              ? 'صكوك CCP'
              : isEn
              ? 'CCP Slips'
              : 'Bordereaux CCP'
            : activeTab === 'expenses'
            ? isAr
              ? 'الفواتير'
              : isEn
              ? 'Receipts'
              : 'Frais'
            : isAr
            ? 'المعدات'
            : isEn
            ? 'Equipment'
            : 'Matériel'
        }
        secondaryActions={
          activeTab === 'ccp' ? (
            <button
              type="button"
              onClick={handleExportCcpCsv}
              data-sq="ctl"
              data-sq-border="solid"
              className="h-10 px-3.5 text-xs font-semibold text-black/75 dark:text-white/80 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] hover:bg-[#FBF8F5] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          ) : undefined
        }
        primaryAction={
          pmPayrollBatches.some((b) => b.status === 'approved_by_direction')
            ? {
                label: isAr
                  ? 'إصدار جميع صكوك CCP'
                  : isEn
                  ? 'Generate All CCP Slips'
                  : 'Générer Bordereaux CCP',
                icon: <Printer size={16} />,
                onClick: handleGenerateAllCcpBatch,
                dataAction: 'generate-all-ccp',
              }
            : {
                label: isAr ? 'تصدير صكوك CCP' : isEn ? 'Export CCP CSV' : 'Exporter CCP CSV',
                icon: <Download size={16} />,
                onClick: handleExportCcpCsv,
                dataAction: 'export-ccp-csv',
              }
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'خزينة الوكالة والمدفوعات البريدية CCP SFP 01'
            : isEn
            ? 'Agency Treasury & Algérie Poste Disbursements'
            : 'Trésorerie Agence & Décaissements Postaux'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'حوالات CCP المُصدرة' : isEn ? 'Issued CCP Slips' : 'Bordereaux CCP Émis',
          count: pmCcpSlips.length,
          badgeText: `${pmCcpSlips.filter((s) => s.isPrinted).length} ${
            isAr ? 'مطبوع' : isEn ? 'printed' : 'imprimés'
          }`,
          tone: 'emerald',
          isActive: activeTab === 'ccp',
          onToggle: () => setActiveTab('ccp'),
        }}
        secondaryCard={{
          label: isAr
            ? 'استرداد المشتريات المصادق عليها'
            : isEn
            ? 'Approved Expense Claims'
            : 'Remboursements DG Validés',
          count: approvedExpensesCount,
          badgeText: `/ ${pmExpenses.length} ${isAr ? 'وصل' : isEn ? 'claims' : 'reçus'}`,
          tone: 'terracotta',
          isActive: activeTab === 'expenses',
          onToggle: () => setActiveTab('expenses'),
        }}
        darkCard={{
          label: isAr
            ? 'إجمالي حوالات CCP SFP 01'
            : isEn
            ? 'Total CCP SFP 01 Volume'
            : 'Volume Mandats CCP SFP 01',
          valueCount: totalCcpVolume,
          formatValue: (v) => formatMoney(Math.round(v), 'DZD'),
          badgeCount: pmPayrollBatches.filter((b) => b.status === 'approved_by_direction').length,
          badgePrefix: 'POSTE ALGÉRIE · ',
          badgeSuffix: isAr ? ' دفعات' : ' lots',
          caption: isAr
            ? 'السيولة البريدية للصرف الفعلي'
            : isEn
            ? 'Postal disbursement liquidity ready'
            : 'Liquidité postale décaissement effectif',
        }}
      />

      <ScreenPod>
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-[13.5px] font-semibold text-black dark:text-white">
              {isAr
                ? 'مركز المحاسبة، الأجور وجرد العتاد'
                : isEn
                ? 'Accounting, CCP Payroll & Equipment Inventory'
                : 'Comptabilité Agence, Mandats CCP & Stock Mobilier'}
            </h2>
            <LiveSegmentedControl
              size="sm"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val)}
              options={[
                {
                  value: 'payroll',
                  label: isAr ? 'كشوف الأجور' : isEn ? 'Payroll' : 'Paies Validées DG',
                  count: pmPayrollBatches.filter((b) => b.status === 'approved_by_direction').length,
                },
                {
                  value: 'ccp',
                  label: isAr ? 'صكوك CCP' : isEn ? 'CCP Slips' : 'Bordereaux CCP',
                  count: pmCcpSlips.length,
                },
                {
                  value: 'expenses',
                  label: isAr ? 'المصاريف' : isEn ? 'Expenses' : 'Remboursements',
                  count: approvedExpensesCount,
                },
                {
                  value: 'stock',
                  label: isAr ? 'العتاد' : isEn ? 'Equipment' : 'Stock & Mobilier',
                  count: pmEquipmentStock.length,
                },
              ]}
              aria-label="Project Compta Sub-Tabs"
            />
          </div>

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-5 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">
                    {isAr
                      ? 'إصدار الحوالات البريدية (SFP 01)'
                      : isEn
                      ? 'Postal Mandate Generation'
                      : 'Génération des Mandats Postaux (SFP 01)'}
                  </span>
                  <h3 className="text-lg font-bold text-black dark:text-white mt-0.5 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {isAr ? 'صرف الخزينة البريدية' : isEn ? 'Treasury Release' : 'Déblocage Trésorerie Postale'}
                  </h3>
                </div>
                {pmPayrollBatches.some((b) => b.status === 'approved_by_direction') && (
                  <button
                    type="button"
                    onClick={handleGenerateAllCcpBatch}
                    data-sq="ctl"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    {isAr
                      ? 'إصدار جميع الصكوك ➔'
                      : isEn
                      ? 'Generate All Slips ➔'
                      : 'Générer Tous les Bordereaux CCP ➔'}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {pmPayrollBatches.map((batch) => (
                  <div
                    key={batch.id}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-5 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-black dark:text-white">
                          {batch.batchNumber}
                        </span>
                        <span className="text-black/55 dark:text-white/55">·</span>
                        <span className="text-xs text-black/70 dark:text-white/75 font-semibold">
                          {batch.projectTitle}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            batch.status === 'ccp_generated'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {batch.status === 'ccp_generated'
                            ? 'Bordereaux CCP Prêts'
                            : 'Validé DG — Prêt CCP'}
                        </span>
                      </div>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        Mission {batch.missionCode} · {batch.totalBeneficiaries} animateurs avec
                        numéros CCP et clés vérifiés.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right rtl:text-left">
                        <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                          Montant Global
                        </span>
                        <span className="font-mono font-bold text-lg text-black dark:text-white tabular-nums">
                          {formatMoney(batch.totalAmountDzd, 'DZD')}
                        </span>
                      </div>
                      {batch.status !== 'ccp_generated' && (
                        <button
                          type="button"
                          onClick={() => generatePmCcpSlipsForBatch(batch.id)}
                          data-sq="ctl"
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Générer CCP</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ccp' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'حوالات CCP SFP 01' : isEn ? 'CCP Slips Registry' : 'Registre Bordereaux CCP'}
                liveRegionText={`${sortedSlips.length} bordereaux`}
                language={language}
                searchQuery={ccpSearch}
                onSearchChange={setCcpSearch}
                searchPlaceholder={
                  isAr
                    ? 'بحث بالمنشط أو حساب CCP أو الولاية...'
                    : 'Rechercher par animateur, compte CCP ou wilaya...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pmCcpSlips.length },
                  {
                    value: 'to_print',
                    label: isAr ? 'للطباعة' : 'À Imprimer',
                    count: pmCcpSlips.filter((s) => !s.isPrinted).length,
                  },
                  {
                    value: 'printed',
                    label: isAr ? 'مطبوع' : 'Imprimés',
                    count: pmCcpSlips.filter((s) => s.isPrinted).length,
                  },
                ]}
                statusValue={ccpPrintFilter}
                onStatusChange={setCcpPrintFilter}
                hasActiveAdvancedFilters={ccpPrintFilter !== 'all'}
                activeFiltersCount={ccpPrintFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isCcpFilterOpen}
                filterButtonRef={ccpFilterRef}
                onToggleFilterModal={() => setIsCcpFilterOpen((p) => !p)}
                viewMode={ccpViewMode}
                onViewModeChange={setCcpViewMode}
                onExport={handleExportCcpCsv}
                activeChips={
                  ccpPrintFilter !== 'all'
                    ? [
                        {
                          key: 'print',
                          label: ccpPrintFilter === 'printed' ? 'Imprimés' : 'À Imprimer',
                          onRemove: () => setCcpPrintFilter('all'),
                        },
                      ]
                    : []
                }
                onResetAllFilters={() => {
                  setCcpSearch('');
                  setCcpPrintFilter('all');
                }}
              />

              <UniversalDataCollection<PMCcpSlip>
                hideToolbar
                items={sortedSlips}
                keyExtractor={(s) => s.id}
                viewMode={ccpViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={ccpViewMode}
                columns={ccpColumns}
                sortBy={slipSortBy}
                sortDirection={slipSortDir}
                onSortChange={(key, dir) => {
                  setSlipSortBy(key);
                  setSlipSortDir(dir);
                }}
                selectedIds={selectedSlipIds}
                onSelectionChange={setSelectedSlipIds}
                isPinned={(s) => pinnedSlipIds.has(s.id)}
                onTogglePin={handleTogglePinSlip}
                bulkSecondaryAction={{
                  label: isAr ? 'تحديد كمطبوع' : 'Marquer Imprimés',
                  icon: <Printer size={14} />,
                  onClick: () => {
                    batchMarkPmCcpSlipsPrinted(Array.from(selectedSlipIds));
                    setSelectedSlipIds(new Set<string>());
                  },
                }}
                openItemId={activeSlip?.id || null}
                onItemClick={(s, el) => {
                  if (el) setSlipOpenerEl(el);
                  setInspectedSlip(s);
                }}
                onViewDetails={(s, el) => {
                  if (el) setSlipOpenerEl(el);
                  setInspectedSlip(s);
                }}
                getRowMeta={getSlipRowMeta}
                getFanActions={(slip): KineticRowFanAction[] => [
                  {
                    id: 'print',
                    label: 'Mandat',
                    icon: <Printer size={14} />,
                    onClick: () => setSelectedSlip(slip),
                  },
                ]}
                getDetailActions={(slip): KineticDetailAction[] => [
                  {
                    id: 'print',
                    label: 'Imprimer SFP 01',
                    icon: <Printer size={14} />,
                    onClick: () => setSelectedSlip(slip),
                  },
                ]}
                renderCard={(slip) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-black dark:text-white">
                        <span>{slip.beneficiaryName}</span>
                        <span className="font-mono text-black/55 dark:text-white/55">
                          {slip.wilayaName}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-black/70 dark:text-white/75">
                        CCP : {slip.ccpNumber} / {slip.ccpKey}
                      </div>
                      <p className="text-[11px] text-black/55 dark:text-white/55 truncate">
                        {slip.transactionReference}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">
                        {formatMoney(slip.amountDzd, 'DZD')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlip(slip);
                        }}
                        data-sq="ctl-sm"
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 flex items-center gap-1 cursor-pointer"
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

          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'مصاريف وفواتير الميدان' : isEn ? 'Expense Reimbursements' : 'Remboursements & Factures Terrain'}
                liveRegionText={`${filteredExpenses.length} justificatifs`}
                language={language}
                searchQuery={expenseSearch}
                onSearchChange={setExpenseSearch}
                searchPlaceholder={
                  isAr
                    ? 'بحث بعنوان النفقة أو المصرح...'
                    : 'Rechercher par titre de frais ou déclarant...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : 'Tous', count: pmExpenses.length },
                  {
                    value: 'pending_direction_approval',
                    label: isAr ? 'قيد الانتظار' : 'En Attente',
                  },
                  {
                    value: 'approved_by_direction',
                    label: isAr ? 'مُصادق عليه' : 'Validés DG',
                    count: approvedExpensesCount,
                  },
                ]}
                statusValue={expenseStatusFilter}
                onStatusChange={setExpenseStatusFilter}
                hasActiveAdvancedFilters={expenseStatusFilter !== 'all'}
                activeFiltersCount={expenseStatusFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isExpenseFilterOpen}
                filterButtonRef={expenseFilterRef}
                onToggleFilterModal={() => setIsExpenseFilterOpen((p) => !p)}
                viewMode={expenseViewMode}
                onViewModeChange={setExpenseViewMode}
                onResetAllFilters={() => {
                  setExpenseSearch('');
                  setExpenseStatusFilter('all');
                }}
              />

              <UniversalDataCollection<PMExpense>
                hideToolbar
                items={filteredExpenses}
                keyExtractor={(e) => e.id}
                viewMode={expenseViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={expenseViewMode}
                columns={expenseColumns}
                selectedIds={selectedExpenseIds}
                onSelectionChange={setSelectedExpenseIds}
                isPinned={(e) => pinnedExpenseIds.has(e.id)}
                onTogglePin={handleTogglePinExpense}
                bulkSecondaryAction={{
                  label: isAr ? 'تأكيد الاسترداد' : 'Valider Remboursement',
                  icon: <CheckCircle size={14} />,
                  onClick: () => {
                    batchApprovePmExpenses(Array.from(selectedExpenseIds));
                    setSelectedExpenseIds(new Set<string>());
                  },
                }}
                onBulkDelete={(ids) => {
                  batchDeletePmExpenses(Array.from(ids));
                  setSelectedExpenseIds(new Set<string>());
                }}
                openItemId={activeExpense?.id || null}
                onItemClick={(e, el) => {
                  if (el) setExpenseOpenerEl(el);
                  setInspectedExpense(e);
                }}
                onViewDetails={(e, el) => {
                  if (el) setExpenseOpenerEl(el);
                  setInspectedExpense(e);
                }}
                getRowMeta={getExpenseRowMeta}
                getFanActions={(exp): KineticRowFanAction[] => [
                  ...(exp.status === 'pending_direction_approval'
                    ? [
                        {
                          id: 'approve',
                          label: 'Valider',
                          icon: <CheckCircle size={14} />,
                          onClick: () => approvePmExpense(exp.id),
                        },
                      ]
                    : []),
                  ...(exp.receiptPhotoUrl
                    ? [
                        {
                          id: 'scan',
                          label: 'Reçu',
                          icon: <Eye size={14} />,
                          onClick: () => setSelectedReceiptUrl(exp.receiptPhotoUrl || null),
                        },
                      ]
                    : []),
                ]}
                getDetailActions={(exp): KineticDetailAction[] => [
                  {
                    id: 'inspect',
                    label: isAr ? 'تفاصيل' : isEn ? 'Inspect' : 'Détails',
                    icon: <Eye size={14} />,
                    onClick: () => setInspectedExpense(exp),
                  },
                  ...(exp.status === 'pending_direction_approval'
                    ? [
                        {
                          id: 'approve',
                          label: isAr ? 'اعتماد' : isEn ? 'Approve' : 'Valider',
                          icon: <CheckCircle size={14} />,
                          onClick: () => approvePmExpense(exp.id),
                        },
                      ]
                    : []),
                  ...(exp.receiptPhotoUrl
                    ? [
                        {
                          id: 'scan',
                          label: isAr ? 'الوصل' : isEn ? 'Receipt' : 'Reçu',
                          icon: <Eye size={14} />,
                          onClick: () => setSelectedReceiptUrl(exp.receiptPhotoUrl || null),
                        },
                      ]
                    : []),
                ]}
                renderCard={(exp) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-black/55 dark:text-white/55">
                          {exp.missionCode || exp.projectTitle}
                        </span>
                        <span className="capitalize text-black/55 dark:text-white/55 font-semibold">
                          {exp.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                        {exp.title}
                      </h4>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        Par {exp.declaredByUserName}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#DC2626] tabular-nums">
                        {formatMoney(exp.amountDzd, 'DZD')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.status === 'approved_by_direction'
                            ? 'bg-emerald-100 text-emerald-700'
                            : exp.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {exp.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'جرد العتاد والأصول' : isEn ? 'Agency Equipment Stock' : 'Inventaire Stock & Immobilisations'}
                liveRegionText={`${filteredStock.length} actifs`}
                language={language}
                searchQuery={stockSearch}
                onSearchChange={setStockSearch}
                searchPlaceholder={
                  isAr
                    ? 'بحث برمز الأصل أو الاسم...'
                    : 'Rechercher équipement par code actif ou nom...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: pmEquipmentStock.length },
                  { value: 'counter_desk', label: isAr ? 'منصات' : 'Comptoirs' },
                  { value: 'display_stand', label: isAr ? 'هياكل' : 'Totems' },
                  { value: 'sound_system', label: isAr ? 'صوتيات' : 'Sono' },
                  { value: 'uniform', label: isAr ? 'أزياء' : 'Textiles' },
                ]}
                statusValue={stockCategoryFilter}
                onStatusChange={setStockCategoryFilter}
                hasActiveAdvancedFilters={stockCategoryFilter !== 'all'}
                activeFiltersCount={stockCategoryFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isStockFilterOpen}
                filterButtonRef={stockFilterRef}
                onToggleFilterModal={() => setIsStockFilterOpen((p) => !p)}
                viewMode={stockViewMode}
                onViewModeChange={setStockViewMode}
                onResetAllFilters={() => {
                  setStockSearch('');
                  setStockCategoryFilter('all');
                }}
              />

              <UniversalDataCollection<PMEquipmentStock>
                hideToolbar
                items={filteredStock}
                keyExtractor={(eq) => eq.id}
                viewMode={stockViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={stockViewMode}
                columns={stockColumns}
                selectedIds={selectedStockIds}
                onSelectionChange={setSelectedStockIds}
                isPinned={(eq) => pinnedStockIds.has(eq.id)}
                onTogglePin={handleTogglePinStock}
                onBulkDelete={(ids) => {
                  batchDeletePmEquipmentStock(Array.from(ids));
                  setSelectedStockIds(new Set<string>());
                }}
                openItemId={activeStock?.id || null}
                onItemClick={(eq, el) => {
                  if (el) setStockOpenerEl(el);
                  setInspectedStock(eq);
                }}
                onViewDetails={(eq, el) => {
                  if (el) setStockOpenerEl(el);
                  setInspectedStock(eq);
                }}
                getRowMeta={getStockRowMeta}
                getFanActions={(eq): KineticRowFanAction[] => [
                  {
                    id: 'instock',
                    label: isAr ? 'مخزن' : 'Stock',
                    icon: <PackageCheck size={14} />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_stock'),
                  },
                  {
                    id: 'maint',
                    label: isAr ? 'صيانة' : 'SAV',
                    icon: <Wrench size={14} />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_maintenance'),
                  },
                ]}
                getDetailActions={(eq): KineticDetailAction[] => [
                  {
                    id: 'instock',
                    label: isAr ? 'متوفر بالمخزن' : isEn ? 'In Stock' : 'Mettre en Stock',
                    icon: <PackageCheck size={14} />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_stock'),
                  },
                  {
                    id: 'maint',
                    label: isAr ? 'صيانة' : isEn ? 'Maintenance' : 'Envoyer en SAV',
                    icon: <Wrench size={14} />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_maintenance'),
                  },
                ]}
                renderCard={(eq) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-[#d4522f]">
                        <span>{eq.assetCode}</span>
                        <span className="text-black/55 dark:text-white/55 font-normal">
                          {eq.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                        {eq.title}
                      </h4>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        État : {eq.conditionReport}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">
                        {formatMoney(eq.acquisitionCostDzd, 'DZD')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          getEquipmentStatusBadge(eq.currentStatus, language).pillClass
                        }`}
                      >
                        {getEquipmentStatusBadge(eq.currentStatus, language).label}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      </ScreenPod>

      {/* Filter Modals */}
      <KineticFilterModal
        isOpen={isCcpFilterOpen}
        onClose={() => setIsCcpFilterOpen(false)}
        triggerRef={ccpFilterRef}
        language={language}
        displayCount={sortedSlips.length}
        entityPluralLabel="bordereaux"
        hasActiveFilters={ccpPrintFilter !== 'all'}
        onResetFilters={() => {
          setCcpSearch('');
          setCcpPrintFilter('all');
        }}
        sections={[
          {
            id: 'ccpStatus',
            kind: 'segmented',
            label: 'Statut Impression',
            value: ccpPrintFilter,
            onChange: setCcpPrintFilter,
            options: [
              { value: 'all', label: 'Tous', count: pmCcpSlips.length },
              { value: 'to_print', label: 'À Imprimer' },
              { value: 'printed', label: 'Imprimés' },
            ],
          },
        ]}
      />

      <KineticFilterModal
        isOpen={isExpenseFilterOpen}
        onClose={() => setIsExpenseFilterOpen(false)}
        triggerRef={expenseFilterRef}
        language={language}
        displayCount={filteredExpenses.length}
        entityPluralLabel="justificatifs"
        hasActiveFilters={expenseStatusFilter !== 'all'}
        onResetFilters={() => {
          setExpenseSearch('');
          setExpenseStatusFilter('all');
        }}
        sections={[
          {
            id: 'expStatus',
            kind: 'segmented',
            label: 'Validation Direction',
            value: expenseStatusFilter,
            onChange: setExpenseStatusFilter,
            options: [
              { value: 'all', label: 'Tous', count: pmExpenses.length },
              { value: 'pending_direction_approval', label: 'En Attente' },
              { value: 'approved_by_direction', label: 'Validés DG' },
            ],
          },
        ]}
      />

      <KineticFilterModal
        isOpen={isStockFilterOpen}
        onClose={() => setIsStockFilterOpen(false)}
        triggerRef={stockFilterRef}
        language={language}
        displayCount={filteredStock.length}
        entityPluralLabel="actifs"
        hasActiveFilters={stockCategoryFilter !== 'all'}
        onResetFilters={() => {
          setStockSearch('');
          setStockCategoryFilter('all');
        }}
        sections={[
          {
            id: 'stockCat',
            kind: 'segmented',
            label: 'Catégorie Matériel',
            value: stockCategoryFilter,
            onChange: setStockCategoryFilter,
            options: [
              { value: 'all', label: 'Toutes', count: pmEquipmentStock.length },
              { value: 'counter_desk', label: 'Comptoirs' },
              { value: 'display_stand', label: 'Totems' },
              { value: 'sound_system', label: 'Sono' },
              { value: 'uniform', label: 'Textiles' },
            ],
          },
        ]}
      />

      {/* Slide-Over Inspectors */}
      <KineticSlideOverInspector<PMCcpSlip>
        isOpen={Boolean(activeSlip)}
        item={activeSlip}
        allItems={sortedSlips}
        keyExtractor={(s) => s.id}
        openerElement={slipOpenerEl}
        language={language}
        title={activeSlip?.beneficiaryName || ''}
        subtitle={activeSlip ? `CCP ${activeSlip.ccpNumber} / ${activeSlip.ccpKey}` : undefined}
        categoryLabel={activeSlip?.transactionReference}
        avatarText={(activeSlip?.beneficiaryName || 'CP').slice(0, 2).toUpperCase()}
        statusLabel={
          activeSlip
            ? activeSlip.isPrinted
              ? 'Bordereau Imprimé'
              : 'À Imprimer (SFP 01)'
            : undefined
        }
        onClose={() => setInspectedSlip(null)}
        onSelectItem={(s) => setInspectedSlip(s)}
        renderBody={(slip) => (
          <>
            <InspectorSection index={0}>
              <InspectorBigStat
                value={formatMoney(slip.amountDzd, 'DZD')}
                tone="accent"
                caption={slip.amountInWordsFr}
              />
            </InspectorSection>
            <InspectorSection index={1} title="Coordonnées Postales Algérie Poste">
              <InspectorCard>
                <InspectorKeyValue label="Bénéficiaire" value={slip.beneficiaryName} mono={false} />
                <InspectorKeyValue label="N° Compte CCP" value={slip.ccpNumber} />
                <InspectorKeyValue label="Clé" value={slip.ccpKey} />
                <InspectorKeyValue label="Wilaya" value={slip.wilayaName} mono={false} />
                <InspectorKeyValue label="Référence" value={slip.transactionReference} isLast />
              </InspectorCard>
            </InspectorSection>
            <InspectorSection index={2}>
              <InspectorWideButton
                label="Ouvrir & Imprimer Mandat SFP 01"
                onClick={() => setSelectedSlip(slip)}
              />
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMExpense>
        isOpen={Boolean(activeExpense)}
        item={activeExpense}
        allItems={filteredExpenses}
        keyExtractor={(e) => e.id}
        openerElement={expenseOpenerEl}
        language={language}
        title={activeExpense?.title || ''}
        subtitle={activeExpense?.projectTitle}
        categoryLabel={activeExpense?.category}
        avatarText="EX"
        onClose={() => setInspectedExpense(null)}
        onSelectItem={(e) => setInspectedExpense(e)}
        onDelete={(e) => {
          batchDeletePmExpenses([e.id]);
          setInspectedExpense(null);
        }}
        holdToDelete
        renderBody={(exp) => (
          <>
            <InspectorSection index={0}>
              <InspectorBigStat
                value={formatMoney(exp.amountDzd, 'DZD')}
                tone="accent"
                caption={`${exp.declaredByUserName} · ${
                  exp.hasFiscalInvoice ? 'Facture Fiscale NIF' : 'Reçu Simple'
                }`}
              />
            </InspectorSection>
            <InspectorSection index={1} title="Audit Justificatif">
              <InspectorCard>
                <InspectorKeyValue label="Campagne" value={exp.projectTitle} mono={false} />
                <InspectorKeyValue label="Déclarant" value={exp.declaredByUserName} mono={false} />
                <InspectorKeyValue label="NIF" value={exp.fiscalNif || 'Non applicable'} />
                <InspectorKeyValue label="Statut" value={exp.status} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
            <InspectorSection index={2} title="Actions Comptables">
              <div className="space-y-2">
                {exp.status === 'pending_direction_approval' && (
                  <InspectorWideButton
                    label="Valider le Remboursement"
                    onClick={() => approvePmExpense(exp.id)}
                  />
                )}
                {exp.receiptPhotoUrl && (
                  <InspectorWideButton
                    label="Inspecter Scan Justificatif"
                    onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)}
                  />
                )}
              </div>
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMEquipmentStock>
        isOpen={Boolean(activeStock)}
        item={activeStock}
        allItems={filteredStock}
        keyExtractor={(eq) => eq.id}
        openerElement={stockOpenerEl}
        language={language}
        title={activeStock?.assetCode || ''}
        subtitle={activeStock?.title}
        categoryLabel={activeStock?.category}
        avatarText={(activeStock?.category || 'EQ').slice(0, 2).toUpperCase()}
        statusLabel={
          activeStock ? getEquipmentStatusBadge(activeStock.currentStatus, language).label : undefined
        }
        statusClassName={
          activeStock
            ? getEquipmentStatusBadge(activeStock.currentStatus, language).pillClass
            : undefined
        }
        onClose={() => setInspectedStock(null)}
        onSelectItem={(eq) => setInspectedStock(eq)}
        onDelete={(eq) => {
          batchDeletePmEquipmentStock([eq.id]);
          setInspectedStock(null);
        }}
        holdToDelete
        renderBody={(eq) => (
          <>
            <InspectorSection index={0} title="Actions Statut Matériel">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'in_stock',
                    label: 'En Stock',
                    icon: <PackageCheck className="w-[18px] h-[18px]" />,
                    primary: true,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_stock'),
                  },
                  {
                    id: 'deployed',
                    label: 'Déployé',
                    icon: <Boxes className="w-[18px] h-[18px]" />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'deployed_on_mission'),
                  },
                  {
                    id: 'maint',
                    label: 'Maintenance',
                    icon: <Wrench className="w-[18px] h-[18px]" />,
                    onClick: () => updatePmEquipmentStatus(eq.id, 'in_maintenance'),
                  },
                ]}
              />
            </InspectorSection>
            <InspectorSection index={1}>
              <InspectorBigStat
                value={formatMoney(eq.acquisitionCostDzd, 'DZD')}
                tone="accent"
                caption={`Code QR : ${eq.qrLabelCode} · État : ${eq.conditionReport}`}
              />
            </InspectorSection>
            <InspectorSection index={2} title="Traçabilité Immobilisation">
              <InspectorCard>
                <InspectorKeyValue label="Code Actif" value={eq.assetCode} />
                <InspectorKeyValue label="Détenteur" value={eq.currentCustodianName || 'Agence'} mono={false} />
                <InspectorKeyValue label="État Physique" value={eq.conditionReport} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
            {eq.history && eq.history.length > 0 && (
              <InspectorSection index={3} title="Historique Mouvements">
                <InspectorCard>
                  {eq.history.map((h, idx) => (
                    <InspectorListItem
                      key={`${h.date}-${idx}`}
                      title={h.stage}
                      subtitle={`${h.date} · ${h.detail}`}
                      isLast={idx === (eq.history?.length || 1) - 1}
                    />
                  ))}
                </InspectorCard>
              </InspectorSection>
            )}
          </>
        )}
      />

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

      {selectedReceiptUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="sq-elev-pop max-w-lg w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#d4522f]" />
                  {isAr ? 'وصل الشراء الممسوح' : "Justificatif Fiscal d'Achat"}
                </h3>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedReceiptUrl}
                alt="Scan Justificatif"
                referrerPolicy="no-referrer"
                data-sq="ctl"
                data-sq-border="none"
                className="w-full h-72 object-cover"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl"
                  className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
