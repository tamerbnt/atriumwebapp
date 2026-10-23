import React, { useState, useMemo } from 'react';
import {
  History,
  Boxes,
  ArrowDownUp,
  Receipt,
  Download,
  Filter,
  CheckCircle2,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  Printer,
  Calendar,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { StockMovement, Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { FilterSelect } from '../../ui/FilterSelect';
import { Modal } from '../../ui/Modal';

export const PosHistoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    stockMovements,
    sales,
    currentBranch,
    receiptConfig,
    currentUser,
    resetPosMockData,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<'stock' | 'audit'>('stock');

  // Filters for stock movements
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set());
  const [pinnedMovementIds, setPinnedMovementIds] = useState<Set<string>>(new Set());
  const [movementSortBy, setMovementSortBy] = useState<string>('date');
  const [movementSortDir, setMovementSortDir] = useState<'asc' | 'desc'>('desc');

  // Receipt modal
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // Filtered stock movements
  const filteredMovements = useMemo(() => {
    return (stockMovements || []).filter((m) => {
      if (movementTypeFilter !== 'all' && m.type !== movementTypeFilter) {
        return false;
      }
      return true;
    });
  }, [stockMovements, movementTypeFilter]);

  // Sorted stock movements
  const sortedMovements = useMemo(() => {
    return [...filteredMovements].sort((a, b) => {
      const aPinned = pinnedMovementIds.has(a.id);
      const bPinned = pinnedMovementIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (movementSortBy === 'date') {
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return movementSortDir === 'asc' ? cmp : -cmp;
      }
      if (movementSortBy === 'product') {
        const cmp = a.productName.localeCompare(b.productName);
        return movementSortDir === 'asc' ? cmp : -cmp;
      }
      if (movementSortBy === 'qty') {
        const cmp = a.quantity - b.quantity;
        return movementSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredMovements, pinnedMovementIds, movementSortBy, movementSortDir]);

  // Movement KPIs
  const movementStats = useMemo(() => {
    let unitsIn = 0;
    let unitsOut = 0;
    let adjustmentsCount = 0;

    (stockMovements || []).forEach((m) => {
      if (m.quantity > 0) unitsIn += m.quantity;
      else unitsOut += Math.abs(m.quantity);
      if (m.type === 'Adjustment') adjustmentsCount++;
    });

    return {
      totalMovements: (stockMovements || []).length,
      unitsIn,
      unitsOut,
      adjustmentsCount,
    };
  }, [stockMovements]);

  // Columns for Stock Movements UniversalDataCollection
  const movementColumns: ColumnDefinition<StockMovement>[] = useMemo(() => [
    {
      key: 'product',
      header: language === 'ar' ? 'المنتج / الصنف' : 'Article / Produit',
      width: '2.5*',
      minWidth: '180px',
      sortable: true,
      renderCell: (m) => (
        <div className="min-w-0">
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
            {m.productName}
          </div>
          <div className="text-[10px] text-neutral-400 truncate">
            {m.reason || 'Mouvement régulier'}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: language === 'ar' ? 'نوع الحركة' : 'Type Mouvement',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (m) => {
        const isRestock = m.type === 'Restock' || m.type === 'Initial';
        const isSale = m.type === 'Sale';
        const isReturn = m.type === 'Return';
        const isDamage = m.type === 'Damage';

        return (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isRestock
                ? 'text-emerald-600 dark:text-emerald-400'
                : isSale
                ? 'text-neutral-700 dark:text-neutral-300'
                : isReturn
                ? 'text-blue-600 dark:text-blue-400'
                : isDamage
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-neutral-500'
            }`}
          >
            {m.type === 'Sale'
              ? language === 'ar' ? 'بيع كاشير' : 'Vente Caisse'
              : m.type === 'Restock'
              ? language === 'ar' ? 'تموين / رصيد' : 'Réassort Stock'
              : m.type === 'Return'
              ? language === 'ar' ? 'إرجاع زبون' : 'Retour Client'
              : m.type === 'Damage'
              ? language === 'ar' ? 'تالف / خردة' : 'Perte / Casse'
              : m.type}
          </span>
        );
      },
    },
    {
      key: 'qty',
      header: language === 'ar' ? 'الكمية' : 'Quantité',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (m) => (
        <span
          className={`font-mono font-black text-xs tabular-nums ${
            m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    {
      key: 'transition',
      header: language === 'ar' ? 'الرصيد (قبل ← بعد)' : 'Évolution (Avant → Après)',
      width: '1.8*',
      minWidth: '140px',
      renderCell: (m) => (
        <span className="font-mono text-xs text-neutral-500 tabular-nums">
          {m.previousStock} → <span className="font-bold text-neutral-900 dark:text-white">{m.newStock}</span>
        </span>
      ),
    },
    {
      key: 'user',
      header: language === 'ar' ? 'المسؤول' : 'Opérateur',
      width: '1.5*',
      minWidth: '130px',
      renderCell: (m) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate block">
          {m.createdBy || 'Staff'}
        </span>
      ),
    },
    {
      key: 'date',
      header: language === 'ar' ? 'الوقت والتاريخ' : 'Horodatage',
      width: '1.5*',
      minWidth: '140px',
      sortable: true,
      renderCell: (m) => (
        <span className="text-xs text-neutral-400 font-mono">
          {new Date(m.createdAt).toLocaleString()}
        </span>
      ),
    },
  ], [language]);

  const handleExportMovementsCSV = () => {
    const headers = ['Product', 'Type', 'Quantity Change', 'Previous Stock', 'New Stock', 'Reason', 'Operator', 'Timestamp'];
    const rows = filteredMovements.map((m) => [
      `"${m.productName}"`,
      `"${m.type}"`,
      m.quantity,
      m.previousStock,
      m.newStock,
      `"${m.reason || ''}"`,
      `"${m.createdBy || ''}"`,
      `"${new Date(m.createdAt).toLocaleString()}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Movements_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <History className="text-[#C4785A]" size={26} />
              <span>
                {language === 'ar' ? 'سجل التدقيق وحركات المخزون' : language === 'fr' ? 'Journal d’Audit & Mouvements de Stock' : 'Audit Trail & Stock History'}
              </span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {movementStats.totalMovements} {language === 'ar' ? 'حركة مسجلة' : 'événements'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'تتبع تاريخي لجميع حركات دخول وخروج الأصناف، المبيعات المباشرة، التعديلات اليدوية، وتسجيل المشغلين'
              : 'Traçabilité complète des réassorts, ventes au comptoir, retours clients et pertes avec horodatage certifié.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={resetPosMockData}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Sparkles size={14} className="text-[#C4785A]" />
            <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportMovementsCSV}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download size={14} />
            <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Movement KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {language === 'ar' ? 'إجمالي الحركات' : 'Total Événements Audit'}
          </div>
          <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
            {movementStats.totalMovements}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'حركات مخزون موثقة' : 'Mouvements tracés en base'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            {language === 'ar' ? 'الوحدات المضافة (+)' : 'Entrées Physiques (+)'}
          </div>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{movementStats.unitsIn}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'تموينات وتوريدات' : 'Réassorts fournisseurs'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600">
            {language === 'ar' ? 'الوحدات المخصومة (-)' : 'Sorties Physiques (-)'}
          </div>
          <div className="text-xl font-black font-mono text-red-600 dark:text-red-400 tabular-nums">
            -{movementStats.unitsOut}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'مبيعات كاشير وإهلاك' : 'Ventes caisse & pertes'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4785A]">
            {language === 'ar' ? 'تعديلات يدوية' : 'Ajustements Manuels'}
          </div>
          <div className="text-xl font-black font-mono text-[#C4785A] tabular-nums">
            {movementStats.adjustmentsCount}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'تصحيحات جرد يدوي' : 'Pointages d’inventaire'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect
          label={language === 'ar' ? 'نوع الحركة' : 'Type de mouvement'}
          value={movementTypeFilter}
          onChange={(val) => setMovementTypeFilter(typeof val === 'string' ? val : val.target?.value || val)}
          options={[
            { value: 'all', label: language === 'ar' ? 'جميع الحركات' : 'Tous les mouvements' },
            { value: 'Sale', label: language === 'ar' ? 'مبيعات كاشير' : 'Ventes Caisse' },
            { value: 'Restock', label: language === 'ar' ? 'تموين واستلام' : 'Réassort Stock' },
            { value: 'Return', label: language === 'ar' ? 'إرجاع زبون' : 'Retour Client' },
            { value: 'Damage', label: language === 'ar' ? 'تالف / خردة' : 'Casse / Dépréciation' },
            { value: 'Adjustment', label: language === 'ar' ? 'تعديل جرد' : 'Ajustement Manuel' },
          ]}
        />
      </div>

      {/* UniversalDataCollection: Stock Movements */}
      <UniversalDataCollection<StockMovement>
        items={sortedMovements}
        keyExtractor={(m) => m.id}
        defaultViewMode="list"
        columns={movementColumns}
        sortBy={movementSortBy}
        sortDirection={movementSortDir}
        onSortChange={(key) => {
          if (movementSortBy === key) {
            setMovementSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setMovementSortBy(key);
            setMovementSortDir('asc');
          }
        }}
        renderCard={(m) => (
          <div className="flex flex-col justify-between h-full space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  {m.type}
                </span>
                <span
                  className={`font-mono font-black text-sm tabular-nums ${
                    m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </span>
              </div>
              <div className="font-bold text-xs text-neutral-900 dark:text-white">
                {m.productName}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                {m.reason || 'Mouvement régulier'}
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex justify-between items-center">
              <span>{m.previousStock} → <strong>{m.newStock}</strong></span>
              <span className="font-mono text-[10px] text-neutral-400">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}
        selectedIds={selectedMovementIds}
        onSelectionChange={setSelectedMovementIds}
        isPinned={(m) => pinnedMovementIds.has(m.id)}
        onTogglePin={(m) => {
          setPinnedMovementIds((prev) => {
            const next = new Set(prev);
            if (next.has(m.id)) next.delete(m.id);
            else next.add(m.id);
            return next;
          });
        }}
        emptyTitle={language === 'ar' ? 'لا توجد حركات مطابقة' : 'Aucun mouvement répertorié'}
        emptyDescription={language === 'ar' ? 'لم يتم تسجيل أي حركة مخزون تطابق الفلاتر المحددة' : 'Effectuez des ventes ou des réassorts pour alimenter le journal.'}
      />
    </div>
  );
};
