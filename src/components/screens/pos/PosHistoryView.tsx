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
  Activity,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { StockMovement, Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { Modal } from '../../ui/Modal';

export const PosHistoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    stockMovements,
    sales,
    currentBranch,
    currentUser,
    resetPosMockData,
  } = useAtriumStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set());
  const [pinnedMovementIds, setPinnedMovementIds] = useState<Set<string>>(new Set());
  const [movementSortBy, setMovementSortBy] = useState<string>('date');
  const [movementSortDir, setMovementSortDir] = useState<'asc' | 'desc'>('desc');

  // Filtered stock movements
  const filteredMovements = useMemo(() => {
    return (stockMovements || []).filter((m) => {
      if (movementTypeFilter !== 'all' && m.type !== movementTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.productName.toLowerCase().includes(q) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.createdBy && m.createdBy.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [stockMovements, movementTypeFilter, searchQuery]);

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

    const netUnitsDelta = unitsIn - unitsOut;

    return {
      totalMovements: (stockMovements || []).length,
      unitsIn,
      unitsOut,
      netUnitsDelta,
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
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {m.type === 'Sale'
              ? language === 'ar' ? 'بيع كاشير' : 'Vente POS'
              : isRestock
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
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
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

      {/* TOP METRICS POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF0] dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#C4785A]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              {language === 'ar' ? 'مؤشرات حركة وتدفق المخزون' : 'Indicateurs de Flux & Conformité d’Inventaire'}
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            {currentBranch.name} · Live Registry
          </span>
        </div>

        {/* 4 Cards Grid including Dark Espresso Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Entrées */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {language === 'ar' ? 'الوحدات المضافة' : 'Entrées Physiques (+)'}
                </span>
                <Plus size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                +{movementStats.unitsIn}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 text-[11px] text-neutral-400">
              {language === 'ar' ? 'تموينات وتوريدات المخزن' : 'Réassorts fournisseurs'}
            </div>
          </div>

          {/* Card 2: Sorties */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  {language === 'ar' ? 'الوحدات المخصومة' : 'Sorties Physiques (-)'}
                </span>
                <Minus size={16} className="text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 tracking-tight tabular-nums">
                -{movementStats.unitsOut}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 text-[11px] text-neutral-400">
              {language === 'ar' ? 'مبيعات كاشير وإهلاك' : 'Ventes caisse & pertes'}
            </div>
          </div>

          {/* Card 3: Total Audit Lines */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  {language === 'ar' ? 'إجمالي الحركات' : 'Total Événements'}
                </span>
                <Boxes size={16} className="text-[#C4785A]" />
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
                {movementStats.totalMovements}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 text-[11px] text-neutral-400">
              {language === 'ar' ? 'سجل غير قابل للتعديل' : 'Journal immuable horodaté'}
            </div>
          </div>

          {/* Card 4: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between relative overflow-hidden group">
            {/* Glowing Sparkline Graphic */}
            <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                <path
                  d="M10 50 L35 65 L60 35 L85 45 L110 20 L135 15"
                  stroke="#FB923C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="135" cy="15" r="4" fill="#FB923C" />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  {language === 'ar' ? 'تدقيق الجرد والتسوية' : 'Audit & Ajustements'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                  {movementStats.adjustmentsCount} rectifications
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                {movementStats.netUnitsDelta > 0 ? `+${movementStats.netUnitsDelta}` : movementStats.netUnitsDelta} <span className="text-sm font-medium text-neutral-400">unités nettes</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 mt-3 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Flux net de période</span>
              <span className="text-[#FB923C] font-semibold">Registre certifié</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COLLECTION POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Controls Bar: Title + Seek Search + FilterSelect + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white">
              {language === 'ar' ? 'جدول حركات المخزون والمراجعة' : 'Registre des Mouvements & Traçabilité'}
            </h2>
            <p className="text-xs text-neutral-500">
              {language === 'ar'
                ? 'قائمة مفصلة بكل عملية تغيير في أرصدة المنتجات'
                : 'Historique chronologique des entrées/sorties et ajustements de stock.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-56">
              <Seek
                placeholder={language === 'ar' ? 'بحث في الحركات...' : 'Rechercher un mouvement...'}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <FilterSelect
              value={movementTypeFilter}
              onChange={setMovementTypeFilter}
              options={[
                { value: 'all', label: language === 'ar' ? 'جميع الحركات' : 'Tous les mouvements' },
                { value: 'Sale', label: language === 'ar' ? 'مبيعات كاشير' : 'Ventes Caisse' },
                { value: 'Restock', label: language === 'ar' ? 'تموين واستلام' : 'Réassort Stock' },
                { value: 'Return', label: language === 'ar' ? 'إرجاع زبون' : 'Retour Client' },
                { value: 'Damage', label: language === 'ar' ? 'تالف / خردة' : 'Casse / Dépréciation' },
                { value: 'Adjustment', label: language === 'ar' ? 'تعديل جرد' : 'Ajustement Manuel' },
              ]}
              ariaLabel="Filtrer par type de mouvement"
            />
          </div>
        </div>

        {/* Inset Container hosting UniversalDataCollection */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
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
                      className={`font-mono font-black text-xs tabular-nums ${
                        m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                    {m.productName}
                  </div>
                  {m.reason && (
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {m.reason}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/50 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-mono">{m.previousStock} → {m.newStock}</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
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
            emptyTitle={language === 'ar' ? 'لا توجد حركات مطابقة' : 'Aucun mouvement trouvé'}
            emptyDescription={language === 'ar' ? 'قم بتسجيل مبيعات أو تعديل المخزون' : 'Les transactions et réassorts apparaîtront ici.'}
          />
        </div>
      </div>
    </div>
  );
};
