import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Boxes,
  Plus,
  AlertCircle,
  Printer,
  FileText,
  Warehouse,
  X,
  MapPin,
  Eye,
  Edit,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { calculateCmupWeightedAverage } from '../../../utils/manufacturingRules';
import { RawMaterialStockItem, MaterialTransferVoucher } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as { target?: { value?: unknown }; value?: unknown };
    if (obj.target?.value !== undefined) return String(obj.target.value);
    if (obj.value !== undefined) return String(obj.value);
  }
  return String(v ?? '');
};

export const ManufacturingMaterialsView: React.FC<any> = () => {
  const { language, currentBranch, branches, currentUser, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { materials, vouchers, addMaterial, updateMaterial, addVoucher } = useManufacturingData();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'vouchers'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockAlertFilter, setStockAlertFilter] = useState<string>('All');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['raw_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<RawMaterialStockItem | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RawMaterialStockItem['category']>('Wood');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('m³');
  const [minThreshold, setMinThreshold] = useState('3');
  const [unitCostDzd, setUnitCostDzd] = useState('180000');
  const [warehouseLocation, setWarehouseLocation] = useState('Dépôt Bois - Rack A-01');

  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterialStockItem | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<MaterialTransferVoucher | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>('fiche');

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert'>('BonDeSortie');
  const [voucherMaterialId, setVoucherMaterialId] = useState(materials[0]?.id || '');
  const [voucherQty, setVoucherQty] = useState('1');
  const [voucherRecipient, setVoucherRecipient] = useState('M. Karim Bouzid (Opérateur)');
  const [voucherNotes, setVoucherNotes] = useState('Sortie pour Ordre de Fabrication OF-2026-0089');
  const [printableVoucher, setPrintableVoucher] = useState<MaterialTransferVoucher | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeMaterial = useMemo(() => {
    if (!selectedMaterial) return null;
    return materials.find((m) => m.id === selectedMaterial.id) || selectedMaterial;
  }, [selectedMaterial, materials]);

  const activeVoucher = useMemo(() => {
    if (!selectedVoucher) return null;
    return vouchers.find((v) => v.id === selectedVoucher.id) || selectedVoucher;
  }, [selectedVoucher, vouchers]);

  const totalValuation = useMemo(
    () => materials.reduce((acc, m) => acc + m.currentStock * m.unitCostPmpDzd, 0),
    [materials]
  );
  const lowStockCount = useMemo(
    () => materials.filter((m) => m.currentStock <= m.reorderThreshold).length,
    [materials]
  );

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    const source = activeSubTab === 'inventory' ? materials : vouchers;
    source.forEach((item) => {
      const b = resolveRecordBranch(item, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [activeSubTab, materials, vouchers, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const total = activeSubTab === 'inventory' ? materials.length : vouchers.length;
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: total },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || total,
      });
    }
    return opts;
  }, [activeSubTab, materials.length, vouchers.length, branches, currentBranch, branchCounts, isAr, isEn]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (stockAlertFilter === 'Low' && m.currentStock > m.reorderThreshold) return false;
      if (stockAlertFilter === 'Normal' && m.currentStock <= m.reorderThreshold) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        const matches =
          m.sku.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.warehouseLocation?.toLowerCase().includes(q) ?? false) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [materials, categoryFilter, stockAlertFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedMaterials = useMemo(() => {
    const list = [...filteredMaterials];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'stock') cmp = a.currentStock - b.currentStock;
      else if (sortBy === 'valuation') {
        cmp = a.currentStock * a.unitCostPmpDzd - b.currentStock * b.unitCostPmpDzd;
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredMaterials, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (voucherTypeFilter !== 'All' && v.voucherType !== voucherTypeFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        const matName = v.items[0]?.materialName || '';
        const matches =
          v.voucherNumber.toLowerCase().includes(q) ||
          matName.toLowerCase().includes(q) ||
          (v.recipientStaffName || '').toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [vouchers, voucherTypeFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedVouchers = useMemo(() => {
    const list = [...filteredVouchers];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'voucherNumber') cmp = a.voucherNumber.localeCompare(b.voucherNumber);
      else if (sortBy === 'totalValueDzd') cmp = a.totalValueDzd - b.totalValueDzd;
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else {
        cmp = (b.transferDate || '').localeCompare(a.transferDate || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredVouchers, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setMaterialToEdit(null);
    setSku(`RAW-ALG-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('Wood');
    setStock('10');
    setUnit('m³');
    setMinThreshold('3');
    setUnitCostDzd('15000');
    setWarehouseLocation('Dépôt Central A-01');
    setIsMaterialModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((m: RawMaterialStockItem) => {
    setMaterialToEdit(m);
    setSku(m.sku);
    setName(m.name);
    setCategory(m.category);
    setStock(String(m.currentStock));
    setUnit(m.unit);
    setMinThreshold(String(m.reorderThreshold));
    setUnitCostDzd(String(m.unitCostPmpDzd));
    setWarehouseLocation(m.warehouseLocation || 'Dépôt Central A-01');
    setIsMaterialModalOpen(true);
  }, []);

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = parseFloat(stock) || 0;
    const threshNum = parseFloat(minThreshold) || 1;
    const costNum = parseFloat(unitCostDzd) || 0;
    if (materialToEdit) {
      const updated: RawMaterialStockItem = {
        ...materialToEdit,
        sku,
        name,
        category,
        currentStock: stockNum,
        availableStock: Math.max(0, stockNum - materialToEdit.allocatedStock),
        reorderThreshold: threshNum,
        unit,
        unitCostPmpDzd: costNum,
        totalValuationDzd: stockNum * costNum,
        warehouseLocation,
      };
      updateMaterial(updated);
      if (selectedMaterial?.id === updated.id) setSelectedMaterial(updated);
      showToast(isAr ? 'تم تحديث بطاقة المادة الأولية' : 'Fiche matière première mise à jour', 'success');
    } else {
      const newItem: RawMaterialStockItem = {
        id: `raw_${Date.now()}`,
        accountId: 'acc_01',
        businessId: 'biz_manufacturing',
        branchId: currentBranch?.id || 'branch_manufacturing_main',
        staffId: currentUser?.id || 'staff_01',
        sku,
        name,
        category,
        currentStock: stockNum,
        allocatedStock: 0,
        availableStock: stockNum,
        reorderThreshold: threshNum,
        unit,
        unitCostPmpDzd: costNum,
        totalValuationDzd: stockNum * costNum,
        warehouseLocation,
        createdAt: new Date().toISOString(),
      };
      addMaterial(newItem);
      showToast(isAr ? 'تمت إضافة المادة الأولية بنجاح' : 'Nouvelle matière première enregistrée', 'success');
    }
    setIsMaterialModalOpen(false);
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.id === voucherMaterialId) || materials[0];
    if (!mat) return;
    const qty = parseFloat(voucherQty) || 1;
    const unitCost = mat.unitCostPmpDzd;
    const totalVal = qty * unitCost;
    const prefix = voucherType === 'BonDeSortie' ? 'BSM' : voucherType === 'BonDeReception' ? 'BR' : 'BT';
    const newVoucher: MaterialTransferVoucher = {
      id: `v_${Date.now()}`,
      accountId: 'acc_01',
      businessId: 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      voucherNumber: `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      voucherType,
      recipientStaffName: voucherRecipient,
      transferDate: new Date().toISOString(),
      items: [
        {
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unit: mat.unit,
          unitCostDzd: unitCost,
          lotNumber: mat.supplierLotNumber || 'LOT-2026',
        },
      ],
      totalValueDzd: totalVal,
      notes: voucherNotes,
    };
    if (voucherType === 'BonDeSortie') {
      const updatedStock = Math.max(0, mat.currentStock - qty);
      updateMaterial({
        ...mat,
        currentStock: updatedStock,
        availableStock: Math.max(0, updatedStock - mat.allocatedStock),
        totalValuationDzd: updatedStock * mat.unitCostPmpDzd,
      });
    } else if (voucherType === 'BonDeReception') {
      const newCmup = calculateCmupWeightedAverage(mat.currentStock, mat.unitCostPmpDzd, qty, unitCost);
      const newQty = mat.currentStock + qty;
      updateMaterial({
        ...mat,
        currentStock: newQty,
        availableStock: newQty - mat.allocatedStock,
        unitCostPmpDzd: newCmup,
        totalValuationDzd: newQty * newCmup,
      });
    }
    addVoucher(newVoucher);
    setIsVoucherModalOpen(false);
    setPrintableVoucher(newVoucher);
    showToast(
      isAr
        ? `تم إصدار السند ${newVoucher.voucherNumber} وفق المرسوم 05-468`
        : `Bon ${newVoucher.voucherNumber} enregistré selon le Décret 05-468`,
      'success'
    );
  };

  const handleTogglePin = useCallback((m: RawMaterialStockItem) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }, []);

  const handleSelectMaterial = useCallback((m: RawMaterialStockItem, openerEl?: HTMLElement | null) => {
    setSelectedMaterial(m);
    setDrawerOpenerEl(openerEl || null);
    setActiveDrawerTab('fiche');
  }, []);

  const handleSelectVoucher = useCallback((v: MaterialTransferVoucher, openerEl?: HTMLElement | null) => {
    setSelectedVoucher(v);
    setDrawerOpenerEl(openerEl || null);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (activeSubTab === 'inventory') {
      const headers = ['SKU', 'Matière', 'Catégorie', 'Branche', 'Dispo', 'Total', 'Unité', 'PMP (DZD)', 'Valeur (DZD)', 'Emplacement'];
      const rows = sortedMaterials.map((m) => {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        return [
          m.sku,
          m.name,
          m.category,
          b.name,
          m.availableStock ?? m.currentStock,
          m.currentStock,
          m.unit,
          m.unitCostPmpDzd,
          m.currentStock * m.unitCostPmpDzd,
          m.warehouseLocation || '',
        ];
      });
      downloadCsvSafe(`manufacturing_materials_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const headers = ['N° Bon', 'Type', 'Branche', 'Matière', 'Quantité', 'Bénéficiaire', 'Date', 'Valeur (DZD)'];
      const rows = sortedVouchers.map((v) => {
        const b = resolveRecordBranch(v, branchesById, currentBranch, language);
        return [
          v.voucherNumber,
          v.voucherType,
          b.name,
          v.items[0]?.materialName || '',
          `${v.items[0]?.quantity || 0} ${v.items[0]?.unit || ''}`,
          v.recipientStaffName,
          v.transferDate?.split('T')[0] || '',
          v.totalValueDzd,
        ];
      });
      downloadCsvSafe(`manufacturing_vouchers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
    showToast(isAr ? 'تم تصدير البيانات بنجاح' : 'Export CSV terminé', 'info');
  }, [activeSubTab, sortedMaterials, sortedVouchers, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (activeSubTab === 'inventory' && categoryFilter !== 'All') c++;
    if (activeSubTab === 'inventory' && stockAlertFilter !== 'All') c++;
    if (activeSubTab === 'vouchers' && voucherTypeFilter !== 'All') c++;
    if (branchFilter !== 'All') c++;
    return c;
  }, [activeSubTab, categoryFilter, stockAlertFilter, voucherTypeFilter, branchFilter]);

  const hasAnyFilters =
    searchQuery.trim().length > 0 ||
    branchFilter !== 'All' ||
    (activeSubTab === 'inventory' ? categoryFilter !== 'All' || stockAlertFilter !== 'All' : voucherTypeFilter !== 'All');

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStockAlertFilter('All');
    setVoucherTypeFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (activeSubTab === 'inventory') {
      if (categoryFilter !== 'All') {
        chips.push({ key: 'cat', label: categoryFilter, onRemove: () => setCategoryFilter('All') });
      }
      if (stockAlertFilter !== 'All') {
        chips.push({
          key: 'stockAlert',
          label: stockAlertFilter === 'Low' ? (isAr ? 'تنبيه مخزون' : 'Sous seuil') : isAr ? 'مخزون آمن' : 'Normal',
          onRemove: () => setStockAlertFilter('All'),
        });
      }
    } else if (voucherTypeFilter !== 'All') {
      chips.push({ key: 'vtype', label: voucherTypeFilter, onRemove: () => setVoucherTypeFilter('All') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [activeSubTab, categoryFilter, stockAlertFilter, voucherTypeFilter, branchFilter, branchOptions, isAr]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchSec: KineticFilterSection = {
      id: 'branch',
      label: isAr ? 'المصنع / المخزن' : isEn ? 'Branch' : 'Dépôt / Branche',
      value: branchFilter,
      onChange: setBranchFilter,
      kind: 'tiles',
      columns: 2,
      options: branchOptions,
    };

    if (activeSubTab === 'vouchers') {
      return [
        {
          id: 'vtype',
          label: isAr ? 'نوع السند' : 'Type de Bon (Décret 05-468)',
          value: voucherTypeFilter,
          onChange: setVoucherTypeFilter,
          kind: 'segmented',
          options: [
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: vouchers.length },
            { value: 'BonDeSortie', label: 'BSM', count: vouchers.filter((v) => v.voucherType === 'BonDeSortie').length },
            { value: 'BonDeReception', label: 'BR', count: vouchers.filter((v) => v.voucherType === 'BonDeReception').length },
            { value: 'BonDeTransfert', label: 'BT', count: vouchers.filter((v) => v.voucherType === 'BonDeTransfert').length },
          ],
        },
        branchSec,
      ];
    }

    return [
      {
        id: 'category',
        label: isAr ? 'الصنف الصناعي' : 'Catégorie Matière',
        value: categoryFilter,
        onChange: setCategoryFilter,
        kind: 'tiles',
        columns: 3,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: materials.length },
          { value: 'Wood', label: isAr ? 'خشب' : 'Bois', count: materials.filter((m) => m.category === 'Wood').length },
          { value: 'Metals', label: isAr ? 'معادن' : 'Métaux', count: materials.filter((m) => m.category === 'Metals').length },
          { value: 'Plastics', label: isAr ? 'بلاستيك' : 'Plastiques', count: materials.filter((m) => m.category === 'Plastics').length },
          { value: 'Chemicals', label: isAr ? 'كيمياء' : 'Chimie', count: materials.filter((m) => m.category === 'Chemicals').length },
          { value: 'Textiles', label: 'Textiles', count: materials.filter((m) => m.category === 'Textiles').length },
          { value: 'Hardware', label: 'Quincaillerie', count: materials.filter((m) => m.category === 'Hardware').length },
        ],
      },
      {
        id: 'stockAlert',
        label: isAr ? 'مستوى المخزون' : 'Alerte Seuil',
        value: stockAlertFilter,
        onChange: setStockAlertFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: materials.length },
          { value: 'Low', label: isAr ? 'تحت العتبة' : 'Sous seuil', count: lowStockCount },
          { value: 'Normal', label: isAr ? 'آمن' : 'Normal', count: materials.length - lowStockCount },
        ],
      },
      branchSec,
    ];
  }, [
    activeSubTab,
    branchFilter,
    branchOptions,
    voucherTypeFilter,
    vouchers,
    categoryFilter,
    materials,
    stockAlertFilter,
    lowStockCount,
    isAr,
    isEn,
  ]);

  const materialColumns: ColumnDefinition<RawMaterialStockItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: isAr ? 'المادة الأولية / الرمز' : 'Matière Première & SKU',
        width: '3.2*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-3 min-w-0">
            <div data-sq="tile" data-sq-border="solid" className="w-10 h-10 bg-[#FCEEE8] dark:bg-neutral-800 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0 border border-[#F5E2D8] dark:border-neutral-700 [--sq-stroke:#F5E2D8] dark:[--sq-stroke:#404040]">
              <Boxes size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold t-small text-black dark:text-white truncate">{m.name}</div>
              <div className="flex items-center gap-2 t-cap text-black/55 dark:text-white/55 tabular-nums mt-0.5">
                <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{m.sku}</span>
                <span>•</span>
                <span className="truncate">{m.warehouseLocation || 'Allée A-01'}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'stock',
        header: isAr ? 'المخزون المتاح / الإجمالي' : 'Stock (Dispo / Total)',
        width: '2.2*',
        sortable: true,
        renderCell: (m) => {
          const isLow = m.currentStock <= m.reorderThreshold;
          return (
            <div>
              <div className="flex items-center gap-2 tabular-nums t-small font-semibold text-black dark:text-white">
                <span>{m.availableStock ?? m.currentStock}</span>
                <span className="text-black/55 dark:text-white/55 font-sans font-normal">
                  / {m.currentStock} {m.unit}
                </span>
              </div>
              <div className="t-cap mt-0.5">
                {isLow ? (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle size={10} /> {isAr ? 'تحت العتبة الحرجة' : 'Seuil Réappro atteint'}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Stock normal</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'المخزن' : isEn ? 'Branch' : 'Dépôt',
        width: '1.8*',
        sortable: true,
        renderCell: (mat) => {
          const b = resolveRecordBranch(mat, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'valuation',
        header: isAr ? 'سعر الوحدة PMP / القيمة' : 'Coût PMP / Valeur Dépôt',
        width: '2.2*',
        sortable: true,
        renderCell: (m) => (
          <div>
            <div className="tabular-nums t-small font-semibold text-black dark:text-white">
              {formatMoney(m.currentStock * m.unitCostPmpDzd, language)}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums mt-0.5">
              PMP: {formatMoney(m.unitCostPmpDzd, language)} / {m.unit}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: isAr ? 'الصنف' : 'Catégorie',
        width: '1.6*',
        renderCell: (m) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-neutral-200 dark:border-neutral-700">
            {m.category}
          </span>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const voucherColumns: ColumnDefinition<MaterialTransferVoucher>[] = useMemo(
    () => [
      {
        key: 'voucherNumber',
        header: isAr ? 'رقم السند' : 'N° Bon & Type',
        width: '2.0*',
        sortable: true,
        renderCell: (v) => (
          <div>
            <div className="tabular-nums t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{v.voucherNumber}</div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">{v.transferDate?.split('T')[0]}</div>
          </div>
        ),
      },
      {
        key: 'material',
        header: isAr ? 'المادة والمستلم' : 'Matière & Bénéficiaire',
        width: '3.0*',
        renderCell: (v) => (
          <div>
            <div className="t-small font-semibold text-black dark:text-white truncate">{v.items[0]?.materialName || '-'}</div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {v.items[0]?.quantity} {v.items[0]?.unit} · {v.recipientStaffName}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'المخزن' : isEn ? 'Branch' : 'Dépôt',
        width: '1.8*',
        sortable: true,
        renderCell: (v) => {
          const b = resolveRecordBranch(v, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'totalValueDzd',
        header: isAr ? 'القيمة' : 'Valeur Mouvement',
        width: '1.8*',
        sortable: true,
        renderCell: (v) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">{formatMoney(v.totalValueDzd, language)}</span>
        ),
      },
      {
        key: 'type',
        header: isAr ? 'النوع' : 'Régime',
        width: '1.4*',
        renderCell: (v) => (
          <span
            className={`t-small font-semibold px-2 py-1 rounded-full ${
              v.voucherType === 'BonDeSortie'
                ? 'bg-amber-100 text-amber-800'
                : v.voucherType === 'BonDeReception'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {v.voucherType === 'BonDeSortie' ? 'BSM (Sortie)' : v.voucherType === 'BonDeReception' ? 'BR (Réception)' : 'BT (Transfert)'}
          </span>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: materials.length > 0,
  });

  if (showSkeleton && (materials.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
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

  const activeBranchInfo =
    activeSubTab === 'inventory'
      ? activeMaterial
        ? resolveRecordBranch(activeMaterial, branchesById, currentBranch, language)
        : null
      : activeVoucher
      ? resolveRecordBranch(activeVoucher, branchesById, currentBranch, language)
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Warehouse size={22} />}
        title={isAr ? 'المواد' : isEn ? 'Materials' : 'Matières'}
        subtitle={
          isAr
            ? `${materials.length} مادة أولية · ${vouchers.length} سند حركة 05-468`
            : `${materials.length} références PMP · ${vouchers.length} bons Décret 05-468`
        }
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            <LiveSegmentedControl
              size="md"
              value={activeSubTab}
              onValueChange={(val) => {
                setActiveSubTab(val as 'inventory' | 'vouchers');
                setSortBy(val === 'inventory' ? 'name' : 'voucherNumber');
              }}
              options={[
                { value: 'inventory', label: isAr ? 'مخزون' : 'Stock', count: materials.length },
                { value: 'vouchers', label: isAr ? 'سندات' : isEn ? 'Vouchers' : 'Bons', count: vouchers.length },
              ]}
              aria-label="Manufacturing Materials Subtab"
            />
            <AtriumButton type="button" variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => setIsVoucherModalOpen(true)}>
              <span>{isAr ? 'سند صرف / استلام BSM' : 'Nouveau Bon BSM / BR'}</span>
            </AtriumButton>
          </div>
        }
        primaryAction={{
          label: isAr ? 'مادة أولية جديدة' : 'Nouvelle Matière',
          onClick: handleOpenAdd,
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات المخزون والامتثال للمرسوم 05-468' : 'Valorisation PMP & Traçabilité Décret 05-468'}
        language={language}
        primaryCard={{
          label: isAr ? 'المواد تحت العتبة الحرجة' : 'Alertes Réapprovisionnement',
          badgeText: isAr ? 'تتطلب تمويناً' : 'Sous sécurité',
          count: lowStockCount,
          tone: 'terracotta',
          isActive: activeSubTab === 'inventory' && stockAlertFilter === 'Low',
          onToggle: () => {
            setActiveSubTab('inventory');
            setStockAlertFilter((prev) => (prev === 'Low' ? 'All' : 'Low'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'سجل السندات الموقعة' : 'Bons BSM / BR / BT',
          badgeText: isAr ? 'المرسوم 05-468' : 'Mouvements',
          count: vouchers.length,
          tone: 'emerald',
          isActive: activeSubTab === 'vouchers',
          onToggle: () => setActiveSubTab((prev) => (prev === 'vouchers' ? 'inventory' : 'vouchers')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي قيمة المخزون PMP' : 'Valeur Totale du Dépôt (PMP)',
          badgeCount: materials.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'صنف' : 'réf.',
          valueCount: Math.round(totalValuation),
          valuePrefix: '',
          valueSuffix: ' DA',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'حساب المتوسط المرجح للتكلفة' : 'Coût Moyen Unitaire Pondéré',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeSubTab === 'inventory'
              ? isAr ? 'دليل المواد الأولية' : 'Catalogue Matières Premières'
              : isAr ? 'سجل السندات الرسمية (المرسوم التنفيذي 05-468)' : 'Registre Officiel des Bons (Décret 05-468)'
          }
          liveRegionText={
            activeSubTab === 'inventory'
              ? `${sortedMaterials.length} ${isAr ? 'مادة' : 'références'}`
              : `${sortedVouchers.length} ${isAr ? 'سند' : 'bons'}`
          }
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeSubTab === 'inventory'
              ? isAr ? 'بحث بالاسم، الرمز، أو الرف...' : 'Recherche SKU, matière, casier...'
              : isAr ? 'بحث برقم السند أو المستلم...' : 'Recherche N° bon, bénéficiaire...'
          }
          statusOptions={
            activeSubTab === 'inventory'
              ? [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous', count: materials.length },
                  { value: 'Low', label: isAr ? 'تحت العتبة' : 'Alerte', count: lowStockCount },
                  { value: 'Normal', label: isAr ? 'آمن' : 'Normal', count: materials.length - lowStockCount },
                ]
              : [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous', count: vouchers.length },
                  { value: 'BonDeSortie', label: 'BSM', count: vouchers.filter((v) => v.voucherType === 'BonDeSortie').length },
                  { value: 'BonDeReception', label: 'BR', count: vouchers.filter((v) => v.voucherType === 'BonDeReception').length },
                ]
          }
          statusValue={activeSubTab === 'inventory' ? stockAlertFilter : voucherTypeFilter}
          onStatusChange={activeSubTab === 'inventory' ? setStockAlertFilter : setVoucherTypeFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        {activeSubTab === 'inventory' ? (
          <UniversalDataCollection
            hideToolbar
            data={sortedMaterials}
            keyExtractor={(m) => m.id}
            defaultViewMode={viewMode}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={materialColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isPinned={(m) => pinnedIds.has(m.id)}
            onTogglePin={handleTogglePin}
            openItemId={activeMaterial?.id}
            onItemClick={handleSelectMaterial}
            onViewDetails={handleSelectMaterial}
            onEdit={handleOpenEdit}
            getRowMeta={(m): Partial<KineticRowData> => {
              const bInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
              const isLow = m.currentStock <= m.reorderThreshold;
              const stockVal = m.totalValuationDzd || Math.round(m.currentStock * m.unitCostPmpDzd);
              return {
                title: m.name,
                subline: `${m.sku} · ${m.category}`,
                avatarText: (m.sku || m.name || 'MT').slice(0, 3).toUpperCase(),
                avatarColor: isLow ? '#DC2626' : '#d4522f',
                categoryLabel: m.category,
                statusLabel: isLow ? (isAr ? 'مخزون منخفض' : 'Sous Seuil') : isAr ? 'متوفر' : 'Optimal',
                statusVariant: isLow ? 'warning' : 'active',
                metricPrimary: `${m.currentStock} ${m.unit}`,
                metricSecondary: `PMP ${formatMoney(m.unitCostPmpDzd, language)}`,
                branchName: bInfo.name,
                branchCode: bInfo.code,
                isPinned: pinnedIds.has(m.id),
                detailCol1: {
                  heading: isAr ? 'المادة والتصنيف' : isEn ? 'Material & SKU' : 'Matière & Réf',
                  primaryText: m.name,
                  secondaryText: `${m.sku} · ${m.category}`,
                  tertiaryText: bInfo.name,
                },
                detailCol2: {
                  heading: isAr ? 'المخزون وحد الطلب' : isEn ? 'Stock & Threshold' : 'Stock & Seuil Alerte',
                  primaryText: `${m.currentStock} ${m.unit}`,
                  secondaryText: `${isAr ? 'حد التنبيه:' : 'Seuil min:'} ${m.reorderThreshold} ${m.unit}`,
                  tertiaryText: m.warehouseLocation || undefined,
                },
                detailCol3: {
                  heading: isAr ? 'التقييم (PMP)' : isEn ? 'Valuation (PMP)' : 'Valorisation PMP',
                  primaryText: formatMoney(stockVal, language),
                  secondaryText: `${formatMoney(m.unitCostPmpDzd, language)} / ${m.unit}`,
                },
              };
            }}
            getFanActions={(m): KineticRowFanAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
                icon: <Eye className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleSelectMaterial(m, e.currentTarget);
                },
              },
              {
                id: 'edit',
                label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                icon: <Edit className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleOpenEdit(m);
                },
              },
              {
                id: 'bsm',
                label: 'Bon BSM',
                icon: <FileText className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  setVoucherMaterialId(m.id);
                  setIsVoucherModalOpen(true);
                },
              },
            ]}
            getDetailActions={(m): KineticDetailAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'فتح البطاقة' : isEn ? 'Open' : 'Fiche Matière',
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => handleSelectMaterial(m),
              },
              {
                id: 'bsm',
                label: 'Bon BSM',
                icon: <FileText className="w-3.5 h-3.5" />,
                onClick: () => {
                  setVoucherMaterialId(m.id);
                  setIsVoucherModalOpen(true);
                },
              },
              {
                id: 'edit',
                label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                icon: <Edit className="w-3.5 h-3.5" />,
                onClick: () => handleOpenEdit(m),
              },
            ]}
            customActions={(m) => [
              {
                id: 'bsm',
                label: 'Bon BSM',
                icon: <FileText size={13} />,
                variant: 'primary',
                onClick: () => {
                  setVoucherMaterialId(m.id);
                  setIsVoucherModalOpen(true);
                },
              },
            ]}
            renderCard={(m) => (
              <div className="flex flex-col items-center justify-center w-full">
                <div data-sq="tile-lg" data-sq-border="solid" className="w-16 h-16 bg-[#FCEEE8] dark:bg-neutral-800 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-dialog font-semibold mb-3 border border-[#F5E2D8] dark:border-neutral-700 [--sq-stroke:#F5E2D8] dark:[--sq-stroke:#404040]">
                  <Boxes size={28} />
                </div>
                <h3 className="t-label font-semibold text-black dark:text-white text-center truncate max-w-[200px]">{m.name}</h3>
                <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold mt-0.5">{m.sku}</span>
                <div className="w-full pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 t-cap flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Stock :</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">
                    {m.currentStock} {m.unit}
                  </span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد مواد مطابقة' : 'Aucune matière trouvée'}
            emptyDescription={isAr ? 'أضف أول مادة أولية للمخزن' : 'Enregistrez votre première matière première'}
            primaryActionLabel={isAr ? 'مادة جديدة' : 'Nouvelle Matière'}
            onAddFirstItem={handleOpenAdd}
            onResetFilters={resetAllFilters}
            hasActiveFilters={hasAnyFilters}
          />
        ) : (
          <UniversalDataCollection
            hideToolbar
            data={sortedVouchers}
            keyExtractor={(v) => v.id}
            defaultViewMode={viewMode}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            columns={voucherColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(key, dir) => {
              setSortBy(key);
              setSortDir(dir);
            }}
            openItemId={activeVoucher?.id}
            onItemClick={handleSelectVoucher}
            onViewDetails={handleSelectVoucher}
            getRowMeta={(v): Partial<KineticRowData> => {
              const bInfo = resolveRecordBranch(v, branchesById, currentBranch, language);
              const firstItem = v.items[0];
              const typeCode = v.voucherType === 'BonDeSortie' ? 'BSM' : v.voucherType === 'BonDeReception' ? 'BR' : 'BT';
              return {
                title: v.voucherNumber,
                subline: firstItem ? `${firstItem.materialName} · ${firstItem.quantity} ${firstItem.unit}` : v.transferDate,
                avatarText: typeCode,
                avatarColor: v.voucherType === 'BonDeSortie' ? '#D97706' : v.voucherType === 'BonDeReception' ? '#059669' : '#2563EB',
                categoryLabel: typeCode,
                statusLabel: v.transferDate,
                statusVariant: v.voucherType === 'BonDeSortie' ? 'warning' : v.voucherType === 'BonDeReception' ? 'active' : 'info',
                metricPrimary: formatMoney(v.totalValueDzd, language),
                metricSecondary: firstItem ? `${firstItem.quantity} ${firstItem.unit}` : undefined,
                branchName: bInfo.name,
                branchCode: bInfo.code,
                detailCol1: {
                  heading: isAr ? 'السند والتاريخ' : isEn ? 'Voucher & Date' : 'Bon & Date',
                  primaryText: `${v.voucherNumber} (${typeCode})`,
                  secondaryText: v.transferDate,
                  tertiaryText: bInfo.name,
                },
                detailCol2: {
                  heading: isAr ? 'المادة والكمية' : isEn ? 'Material & Qty' : 'Matière & Quantité',
                  primaryText: firstItem?.materialName || '—',
                  secondaryText: firstItem ? `${firstItem.quantity} ${firstItem.unit}` : undefined,
                },
                detailCol3: {
                  heading: isAr ? 'القيمة والمستلم' : isEn ? 'Value & Recipient' : 'Valeur & Bénéficiaire',
                  primaryText: formatMoney(v.totalValueDzd, language),
                  secondaryText: v.recipientStaffName || v.orderNumber || v.notes || undefined,
                },
              };
            }}
            getFanActions={(v): KineticRowFanAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
                icon: <Eye className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleSelectVoucher(v, e.currentTarget);
                },
              },
              {
                id: 'print',
                label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
                icon: <Printer className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  setPrintableVoucher(v);
                },
              },
            ]}
            getDetailActions={(v): KineticDetailAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'فتح السند' : isEn ? 'Open' : 'Détails Bon',
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => handleSelectVoucher(v),
              },
              {
                id: 'print',
                label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
                icon: <Printer className="w-3.5 h-3.5" />,
                onClick: () => setPrintableVoucher(v),
              },
            ]}
            customActions={(v) => [
              {
                id: 'print',
                label: isAr ? 'طباعة' : 'Imprimer',
                icon: <Printer size={13} />,
                variant: 'primary',
                onClick: () => setPrintableVoucher(v),
              },
            ]}
            renderCard={(v) => (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="tabular-nums t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{v.voucherNumber}</span>
                  <span
                    className={`t-small font-semibold px-2 py-1 rounded-full ${
                      v.voucherType === 'BonDeSortie'
                        ? 'bg-amber-100 text-amber-800'
                        : v.voucherType === 'BonDeReception'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {v.voucherType === 'BonDeSortie' ? 'BSM' : v.voucherType === 'BonDeReception' ? 'BR' : 'BT'}
                  </span>
                </div>
                <div className="t-small font-semibold text-black dark:text-white truncate">{v.items[0]?.materialName}</div>
                <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                  {v.items[0]?.quantity} {v.items[0]?.unit} • {formatMoney(v.totalValueDzd, language)}
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد سندات مطابقة' : 'Aucun bon trouvé'}
            emptyDescription={isAr ? 'أصدر أول سند حركة مخزون' : 'Émettez un premier bon BSM, BR ou BT'}
            primaryActionLabel={isAr ? 'إصدار سند جديد' : 'Nouveau Bon'}
            onAddFirstItem={() => setIsVoucherModalOpen(true)}
            onResetFilters={resetAllFilters}
            hasActiveFilters={hasAnyFilters}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeSubTab === 'inventory' ? sortedMaterials.length : sortedVouchers.length}
        entityPluralLabel={activeSubTab === 'inventory' ? (isAr ? 'مادة' : 'matières') : isAr ? 'سند' : 'bons'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setCategoryFilter('All');
          setStockAlertFilter('All');
          setVoucherTypeFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      {activeSubTab === 'inventory' ? (
        <KineticSlideOverInspector
          isOpen={Boolean(activeMaterial)}
          item={activeMaterial}
          allItems={sortedMaterials}
          keyExtractor={(m) => m.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={activeMaterial?.name || ''}
          subtitle={activeMaterial ? `${activeMaterial.sku} · ${activeMaterial.category}` : ''}
          avatarText={activeMaterial?.sku?.slice(0, 3) || 'MAT'}
          branchName={activeBranchInfo?.name}
          statusLabel={
            activeMaterial && activeMaterial.currentStock <= activeMaterial.reorderThreshold
              ? isAr ? 'تحت العتبة' : 'Seuil Alerte'
              : isAr ? 'متاح' : 'Normal'
          }
          statusClassName={
            activeMaterial && activeMaterial.currentStock <= activeMaterial.reorderThreshold
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
          }
          tabs={[
            { id: 'fiche', label: isAr ? 'بيانات المخزون' : 'Stock & Casier' },
            { id: 'valuation', label: isAr ? 'التقييم PMP' : 'Valorisation PMP' },
          ]}
          activeTab={activeDrawerTab}
          onTabChange={setActiveDrawerTab}
          onSelectItem={(m) => handleSelectMaterial(m)}
          onClose={() => setSelectedMaterial(null)}
          renderBody={(mat, tab) => (
            <div className="space-y-4 t-cap">
              <div className="flex items-center gap-2 flex-wrap">
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<FileText size={13} />}
                  onClick={() => {
                    setVoucherMaterialId(mat.id);
                    setIsVoucherModalOpen(true);
                  }}
                >
                  {isAr ? 'إصدار سند BSM' : 'Émettre Bon BSM'}
                </AtriumButton>
                <AtriumButton type="button" variant="outline" size="sm" onClick={() => handleOpenEdit(mat)}>
                  {isAr ? 'تعديل البطاقة' : 'Modifier Fiche'}
                </AtriumButton>
              </div>

              {tab === 'fiche' && (
                <div data-sq="card" data-sq-border="solid" className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55 block">
                    Données d'Emplacement & Seuil
                  </span>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-black/55 dark:text-white/55">Emplacement Rack :</span>
                    <span className="font-semibold text-black dark:text-white">{mat.warehouseLocation || 'Allée A-01'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-black/55 dark:text-white/55">Stock Physique Total :</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {mat.currentStock} {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-black/55 dark:text-white/55">Stock Réservé (OFs) :</span>
                    <span className="tabular-nums text-amber-600 font-semibold">
                      {mat.allocatedStock} {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-black/55 dark:text-white/55">Stock Net Disponible :</span>
                    <span className="tabular-nums text-emerald-600 font-semibold">
                      {mat.availableStock} {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/55 dark:text-white/55">Seuil Réappro :</span>
                    <span className="tabular-nums font-semibold text-black/70 dark:text-white/75">
                      {mat.reorderThreshold} {mat.unit}
                    </span>
                  </div>
                </div>
              )}

              {tab === 'valuation' && (
                <div data-sq="card" data-sq-border="solid" className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55 block">
                    Valorisation Comptable PMP
                  </span>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-black/55 dark:text-white/55">Coût Unitaire PMP :</span>
                    <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {formatMoney(mat.unitCostPmpDzd, language)} / {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 font-semibold t-label">
                    <span className="text-black dark:text-white">Valeur Totale :</span>
                    <span className="tabular-nums text-black dark:text-white">
                      {formatMoney(mat.currentStock * mat.unitCostPmpDzd, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        />
      ) : (
        <KineticSlideOverInspector
          isOpen={Boolean(activeVoucher)}
          item={activeVoucher}
          allItems={sortedVouchers}
          keyExtractor={(v) => v.id}
          openerElement={drawerOpenerEl}
          language={language}
          title={activeVoucher?.voucherNumber || ''}
          subtitle={activeVoucher?.recipientStaffName || ''}
          avatarText="BON"
          branchName={activeBranchInfo?.name}
          statusLabel={activeVoucher?.voucherType || 'BSM'}
          onSelectItem={(v) => handleSelectVoucher(v)}
          onClose={() => setSelectedVoucher(null)}
          renderBody={(v) => (
            <div className="space-y-4 t-cap">
              <div data-sq="card" data-sq-border="solid" className="bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">Date Mouvement :</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">{v.transferDate?.split('T')[0]}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">Matière :</span>
                  <span className="font-semibold text-black dark:text-white">{v.items[0]?.materialName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">Quantité :</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">
                    {v.items[0]?.quantity} {v.items[0]?.unit}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-black/55 dark:text-white/55">Valeur Totale :</span>
                  <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(v.totalValueDzd, language)}</span>
                </div>
              </div>
              {v.notes && (
                <div data-sq="card" data-sq-border="solid" className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-black/70 dark:text-white/75">
                  {v.notes}
                </div>
              )}
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Printer size={13} />}
                className="w-full justify-center"
                onClick={() => setPrintableVoucher(v)}
              >
                {isAr ? 'معاينة وطباعة السند' : 'Imprimer Bon Décret 05-468'}
              </AtriumButton>
            </div>
          )}
        />
      )}

      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-lg w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 sm:p-7 border border-neutral-200 dark:border-neutral-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {materialToEdit
                    ? isAr ? 'تعديل المادة الأولية' : 'Modifier la Matière Première'
                    : isAr ? 'إضافة مادة أولية جديدة' : 'Nouvelle Référence Matière'}
                </h3>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput label="Code SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
                <LabelSelect
                  label={isAr ? 'الصنف الصناعي' : 'Catégorie'}
                  value={category}
                  onChange={(v) => setCategory(extractStr(v) as RawMaterialStockItem['category'])}
                  options={[
                    { value: 'Wood', label: 'Bois & Dérivés' },
                    { value: 'Metals', label: 'Métallurgie & Aciers' },
                    { value: 'Plastics', label: 'Polymères & Plastiques' },
                    { value: 'Chemicals', label: 'Chimie, Peintures & Résines' },
                    { value: 'Textiles', label: 'Textiles & Confection' },
                    { value: 'Hardware', label: 'Quincaillerie & Visserie' },
                  ]}
                />
              </div>
              <LabelInput
                label={isAr ? 'اسم المادة والمواصفات' : 'Désignation de la matière'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bois Chêne Brut Séché 50mm..."
                required
              />
              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية' : 'Stock Initial'}
                  type="number"
                  step="any"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'الوحدة' : 'Unité'}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, m³, Pièce..."
                  required
                />
                <LabelInput
                  label={isAr ? 'عتبة التنبيه' : 'Seuil Mini'}
                  type="number"
                  step="any"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'سعر الوحدة PMP (دج)' : 'Coût Unitaire PMP (DZD)'}
                  type="number"
                  value={unitCostDzd}
                  onChange={(e) => setUnitCostDzd(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'موقع التخزين (الرف/الممر)' : 'Emplacement Casier'}
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  placeholder="Ex: Rack A-02..."
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton type="button" variant="secondary" onClick={() => setIsMaterialModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary">
                  {isAr ? 'حفظ المادة' : 'Enregistrer'}
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-lg w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 sm:p-7 border border-neutral-200 dark:border-neutral-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {isAr ? 'إصدار سند حركة مخزون (مرسوم 05-468)' : "Émission d'un Bon de Mouvement (Décret 05-468)"}
                </h3>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <LabelSelect
                label={isAr ? 'نوع السند' : 'Type de Bon'}
                value={voucherType}
                onChange={(v) => setVoucherType(extractStr(v) as 'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert')}
                options={[
                  { value: 'BonDeSortie', label: 'Bon de Sortie Magasin (BSM) vers Atelier' },
                  { value: 'BonDeReception', label: 'Bon de Réception Fournisseur (BR) avec calcul PMP' },
                  { value: 'BonDeTransfert', label: 'Bon de Transfert Inter-Dépôts (BT)' },
                ]}
              />
              <LabelSelect
                label={isAr ? 'المادة الأولية المعنية' : 'Matière Première'}
                value={voucherMaterialId}
                onChange={(v) => setVoucherMaterialId(extractStr(v))}
                options={materials.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.sku} - Stock: ${m.currentStock} ${m.unit})`,
                }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية المنقولة' : 'Quantité du Bon'}
                  type="number"
                  step="any"
                  value={voucherQty}
                  onChange={(e) => setVoucherQty(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'المستلم / المشغل' : 'Bénéficiaire / Demandeur'}
                  value={voucherRecipient}
                  onChange={(e) => setVoucherRecipient(e.target.value)}
                  required
                />
              </div>
              <LabelInput
                label={isAr ? 'سبب التحويل / رقم أمر التصنيع' : 'Motif / N° Ordre de Fabrication lié'}
                value={voucherNotes}
                onChange={(e) => setVoucherNotes(e.target.value)}
                placeholder="Ex: Sortie pour OF-2026-0089..."
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton type="button" variant="secondary" onClick={() => setIsVoucherModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary">
                  {isAr ? 'إصدار وطباعة السند' : 'Valider & Imprimer le Bon'}
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {printableVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-xl w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold t-card text-black dark:text-white">{printableVoucher.voucherNumber}</h3>
                    <p className="t-cap text-black/55 dark:text-white/55">
                      Document officiel d'inventaire • Décret exécutif N° 05-468
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[var(--brand-fill,#C9461F)] hover:bg-[#b03b1b] text-white t-small font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer size={14} />
                    <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={isAr ? 'إغلاق' : 'Fermer'}
                    onClick={() => setPrintableVoucher(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="printable-document p-6 rounded-[var(--r-card,16px)] bg-white border-2 border-dashed border-neutral-300 text-black space-y-5 font-sans">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <div className="font-semibold t-label text-black">ATRIUM MANUFACTURE & ATELIER PME</div>
                    <div className="t-small text-black/55 font-medium">RC: 16/00-0988421 • NIF: 001916010044589 • Alger</div>
                    <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mt-1">
                      {printableVoucher.voucherType === 'BonDeSortie'
                        ? 'Bon de Sortie Magasin (BSM)'
                        : printableVoucher.voucherType === 'BonDeReception'
                        ? 'Bon de Réception Magasin (BR)'
                        : 'Bon de Transfert Interne (BT)'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-semibold t-label text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{printableVoucher.voucherNumber}</div>
                    <div className="t-cap text-black/55 mt-0.5">Date : {printableVoucher.transferDate?.split('T')[0]}</div>
                  </div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-[var(--r-ctl,12px)] border border-neutral-200 t-cap space-y-1">
                  <div className="flex justify-between">
                    <span className="text-black/55">Demandeur / Bénéficiaire :</span>
                    <span className="font-semibold text-black">{printableVoucher.recipientStaffName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55">Motif de transfert :</span>
                    <span className="font-semibold text-black">{printableVoucher.notes || 'Ordre de fabrication'}</span>
                  </div>
                </div>
                <table className="w-full t-cap border border-neutral-200 rounded-[var(--r-ctl-sm,10px)] overflow-hidden">
                <thead className="bg-neutral-100 text-black/75 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="p-2 text-left">Désignation Matière</th>
                    <th className="p-2 text-center w-24">Quantité</th>
                    <th className="p-2 text-right w-28">Prix PMP</th>
                    <th className="p-2 text-right w-28">Total DZD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {printableVoucher.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{item.materialName}</td>
                      <td className="p-2 text-center tabular-nums font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 text-right tabular-nums">{formatMoney(item.unitCostDzd, language)}</td>
                      <td className="p-2 text-right tabular-nums font-semibold">
                        {formatMoney(item.quantity * item.unitCostDzd, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-2 t-small font-semibold text-black">
                <span>Total Mouvement : </span>
                <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(printableVoucher.totalValueDzd, language)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t text-center t-cap">
                <div>
                  <span className="text-black/55 t-cap block">Visa Magasinier (Émetteur)</span>
                  <div className="h-10 flex items-center justify-center text-black/75 italic">M. Amine T.</div>
                </div>
                <div>
                  <span className="text-black/55 t-cap block">Visa Réceptionnaire (Atelier)</span>
                  <div className="h-10 flex items-center justify-center text-black/75 italic">M. Karim B.</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
