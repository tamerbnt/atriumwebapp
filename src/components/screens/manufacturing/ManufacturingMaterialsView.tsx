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
  PackageCheck,
  ShoppingCart,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  selectCurrentBusinessConfigFromState,
  selectCurrentUnifiedDocumentsFromState,
  useAtriumActions,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { centimesToDzd } from '../../../utils/money';
import { calculateCmupWeightedAverage } from '../../../utils/manufacturingRules';
import {
  computeMultiOfPurchaseSuggestions,
  computeLateReceiptCmupAdjustment,
  buildLotTraceabilityGraph,
  type MfgPurchaseSuggestion,
} from '../../../utils/manufacturingDepth';
import {
  RawMaterialStockItem,
  MaterialTransferVoucher,
  MfgFinishedGoodsLot,
} from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSelect } from '../../ui/live/LiveSelect';
import {
  UnifiedInvoiceComposerModal,
  type UnifiedInvoiceComposerPrefill,
} from '../../common/invoicing/UnifiedInvoiceComposerModal';
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
  KineticModalShell,
  KineticSlideOverInspector,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useRetainedModalValue,
} from '../../ui/kinetic';

export const ManufacturingMaterialsView: React.FC<any> = () => {
  const { account, language, currentBusiness, currentBusinessConfig, currentBranch, branches, unifiedDocuments, currentUser, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      unifiedDocuments: selectCurrentUnifiedDocumentsFromState(s),
      currentUser: s.currentUser,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    materials,
    vouchers,
    orders,
    boms,
    qcRecords,
    ncrRecords,
    finishedGoods,
    addMaterial,
    updateMaterial,
    addVoucher,
    releaseFinishedGoodsLot,
  } = useManufacturingData();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'vouchers' | 'finished_goods' | 'shortages' | 'traceability'>('inventory');
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
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('m³');
  const [minThreshold, setMinThreshold] = useState('');
  const [unitCostDzd, setUnitCostDzd] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');

  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterialStockItem | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<MaterialTransferVoucher | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>('fiche');

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert'>('BonDeSortie');
  const [voucherMaterialId, setVoucherMaterialId] = useState(materials[0]?.id || '');
  const [voucherQty, setVoucherQty] = useState('');
  const [voucherIncomingUnitCost, setVoucherIncomingUnitCost] = useState('');
  const [voucherOrderId, setVoucherOrderId] = useState('');
  const [voucherRecipient, setVoucherRecipient] = useState('');
  const [voucherNotes, setVoucherNotes] = useState('');
  const [printableVoucher, setPrintableVoucher] = useState<MaterialTransferVoucher | null>(null);
  const [selectedTraceOrderId, setSelectedTraceOrderId] = useState(() => orders[0]?.id || '');
  const [fgDeliveryPrefill, setFgDeliveryPrefill] = useState<{
    lot: MfgFinishedGoodsLot;
    prefill: UnifiedInvoiceComposerPrefill;
  } | null>(null);

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

  const purchaseSuggestions = useMemo(
    () => computeMultiOfPurchaseSuggestions(orders, boms, materials),
    [orders, boms, materials]
  );

  const releasedFgCount = useMemo(
    () => finishedGoods.filter((f) => f.releaseStatus === 'Released').length,
    [finishedGoods]
  );

  const lateReceiptPreview = useMemo(() => {
    if (voucherType !== 'BonDeReception') return null;
    const mat = materials.find((m) => m.id === voucherMaterialId) || materials[0];
    const qty = parseFloat(voucherQty);
    if (!mat || !Number.isFinite(qty) || qty <= 0) return null;
    const parsedIncoming = parseFloat(voucherIncomingUnitCost);
    const incomingCostDzd = Number.isFinite(parsedIncoming) && parsedIncoming >= 0 ? parsedIncoming : mat.unitCostPmpDzd;
    return computeLateReceiptCmupAdjustment({
      material: mat,
      incomingQty: qty,
      incomingUnitCostDzd: incomingCostDzd,
      vouchers,
      activeOrders: orders,
    });
  }, [voucherType, voucherMaterialId, voucherQty, voucherIncomingUnitCost, materials, vouchers, orders]);

  const traceOrder = useMemo(
    () => orders.find((o) => o.id === selectedTraceOrderId) || orders[0] || null,
    [orders, selectedTraceOrderId]
  );

  const traceGraph = useMemo(() => {
    if (!traceOrder) return null;
    return buildLotTraceabilityGraph({
      order: traceOrder,
      materials,
      vouchers,
      qcRecords,
      ncrRecords,
      finishedGoodsLots: finishedGoods,
      unifiedDocuments,
    });
  }, [traceOrder, materials, vouchers, qcRecords, ncrRecords, finishedGoods, unifiedDocuments]);

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
    setStock('');
    setUnit('m³');
    setMinThreshold('');
    setUnitCostDzd('');
    setWarehouseLocation('');
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
    setWarehouseLocation(m.warehouseLocation || '');
    setIsMaterialModalOpen(true);
  }, []);

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = parseFloat(stock);
    const threshNum = parseFloat(minThreshold);
    const costNum = parseFloat(unitCostDzd);
    if (!Number.isFinite(stockNum) || stockNum < 0 || !Number.isFinite(costNum) || costNum < 0) {
      showToast(isAr ? 'يرجى إدخال كمية وسعر صحيحين' : 'Veuillez saisir un stock et un coût PMP valides', 'error');
      return;
    }
    const safeThresh = Number.isFinite(threshNum) && threshNum >= 0 ? threshNum : 0;
    const activeAccountId = (materialToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (materialToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    if (materialToEdit) {
      const updated: RawMaterialStockItem = {
        ...materialToEdit,
        sku,
        name,
        category,
        currentStock: stockNum,
        availableStock: Math.max(0, stockNum - materialToEdit.allocatedStock),
        reorderThreshold: safeThresh,
        unit,
        unitCostPmpDzd: costNum,
        totalValuationDzd: stockNum * costNum,
        warehouseLocation,
      };
      updateMaterial(updated);
      if (selectedMaterial?.id === updated.id) setSelectedMaterial(updated);
    } else {
      const newItem: RawMaterialStockItem = {
        id: `raw_${Date.now()}`,
        accountId: activeAccountId,
        businessId: currentBusiness?.id || currentBranch?.businessId || '',
        branchId: activeBranchId,
        staffId: currentUser?.id || '',
        sku,
        name,
        category,
        currentStock: stockNum,
        allocatedStock: 0,
        availableStock: stockNum,
        reorderThreshold: safeThresh,
        unit,
        unitCostPmpDzd: costNum,
        totalValuationDzd: stockNum * costNum,
        warehouseLocation,
        createdAt: new Date().toISOString(),
      };
      addMaterial(newItem);
    }
    setIsMaterialModalOpen(false);
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.id === voucherMaterialId) || materials[0];
    if (!mat) return;
    const qty = parseFloat(voucherQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast(isAr ? 'يرجى إدخال كمية صالحة' : 'Veuillez saisir une quantité valide', 'error');
      return;
    }
    const activeAccountId = (currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const parsedIncoming = voucherType === 'BonDeReception' ? parseFloat(voucherIncomingUnitCost) : NaN;
    const unitCost =
      Number.isFinite(parsedIncoming) && parsedIncoming >= 0 ? parsedIncoming : mat.unitCostPmpDzd;
    const totalVal = qty * unitCost;
    const linkedOrder = voucherOrderId ? orders.find((o) => o.id === voucherOrderId) : undefined;
    const prefix = voucherType === 'BonDeSortie' ? 'BSM' : voucherType === 'BonDeReception' ? 'BR' : 'BT';
    const newVoucher: MaterialTransferVoucher = {
      id: `v_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      voucherNumber: `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      voucherType,
      orderId: linkedOrder?.id,
      orderNumber: linkedOrder?.orderNumber,
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
    runUndoBatch(
      {
        vertical: 'manufacturing_production',
        operationType: 'create',
        branchId: activeBranchId,
        summary: isAr
          ? `إصدار سند ${newVoucher.voucherNumber}`
          : isEn
          ? `Voucher ${newVoucher.voucherNumber} (${mat.name})`
          : `Bon ${newVoucher.voucherNumber} (${mat.name})`,
        entityLabel: newVoucher.voucherNumber,
        toastType: 'success',
      },
      () => {
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
      }
    );
    setIsVoucherModalOpen(false);
    setVoucherQty('');
    setVoucherIncomingUnitCost('');
    setVoucherOrderId('');
    setVoucherRecipient('');
    setVoucherNotes('');
    setPrintableVoucher(newVoucher);
  };

  const handleRestockFromSuggestion = useCallback(
    (s: MfgPurchaseSuggestion) => {
      const mat = materials.find((m) => m.id === s.materialId);
      if (!mat) return;
      const activeAccountId = (currentBranch?.accountId || account?.id || '').trim();
      const activeBranchId = (currentBranch?.id || '').trim();
      if (!activeAccountId || !activeBranchId) {
        showToast({
          type: 'error',
          title: t('tenant_context_missing_title', language),
          message: t('tenant_context_missing_msg', language),
        });
        return;
      }
      const qty = Math.max(1, s.suggestedOrderQuantity);
      const unitCost = centimesToDzd(s.estimatedUnitCostCentimes);
      const newVoucher: MaterialTransferVoucher = {
        id: `v_reappro_${Date.now()}`,
        accountId: activeAccountId,
        businessId: currentBusiness?.id || currentBranch?.businessId || '',
        branchId: activeBranchId,
        staffId: currentUser?.id || '',
        voucherNumber: `BR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        voucherType: 'BonDeReception',
        recipientStaffName: currentUser?.fullName || 'Magasinier Principal',
        transferDate: new Date().toISOString(),
        items: [
          {
            materialId: mat.id,
            materialName: mat.name,
            quantity: qty,
            unit: mat.unit,
            unitCostDzd: unitCost,
            lotNumber: mat.supplierLotNumber || `IMP-${new Date().getFullYear()}`,
          },
        ],
        totalValueDzd: qty * unitCost,
        notes:
          s.impactedOrderNumbers.length > 0
            ? `Réapprovisionnement multi-OF: ${s.impactedOrderNumbers.join(', ')}`
            : 'Réapprovisionnement seuil sécurité',
      };
      runUndoBatch(
        {
          vertical: 'manufacturing_production',
          operationType: 'create',
          branchId: activeBranchId,
          summary: isAr
            ? `تموين ${mat.name} (${qty} ${mat.unit})`
            : isEn
            ? `Restocked ${mat.name} (${qty} ${mat.unit})`
            : `Réapprovisionnement BR ${mat.name} (+${qty} ${mat.unit})`,
          entityLabel: newVoucher.voucherNumber,
          toastType: 'success',
        },
        () => {
          const newCmup = calculateCmupWeightedAverage(mat.currentStock, mat.unitCostPmpDzd, qty, unitCost);
          const newQty = mat.currentStock + qty;
          updateMaterial({
            ...mat,
            currentStock: newQty,
            availableStock: Math.max(0, newQty - mat.allocatedStock),
            unitCostPmpDzd: newCmup,
            totalValuationDzd: newQty * newCmup,
          });
          addVoucher(newVoucher);
        }
      );
      setPrintableVoucher(newVoucher);
    },
    [materials, currentBranch, account?.id, currentBusiness?.id, currentUser?.id, currentUser?.fullName, language, isAr, isEn, updateMaterial, addVoucher]
  );

  const handleOpenFgInvoice = useCallback(
    (lot: MfgFinishedGoodsLot, docType: 'bl' | 'facture') => {
      const unitPriceHt = Math.max(100, Math.round(centimesToDzd(lot.unitCmupCentimes) * 1.25));
      const remainingQty = Math.max(1, lot.qtyProduced - lot.qtyDelivered);
      const linkedOrder = orders.find((o) => o.id === lot.orderId);
      setFgDeliveryPrefill({
        lot,
        prefill: {
          docType,
          sourceVertical: 'manufacturing_production',
          partyName: linkedOrder?.clientName || 'Client Atelier',
          sourceEntityType: 'manufacturing_order',
          sourceEntityId: lot.orderId,
          notesTop: `${docType === 'bl' ? 'Bon de Livraison' : 'Facture'} Lot PF ${lot.lotNumber} · ${lot.orderNumber}`,
          items: [
            {
              description: `${lot.productName} — Lot ${lot.lotNumber} (${lot.orderNumber})`,
              isService: false,
              quantity: remainingQty,
              unit: lot.unit || 'Unité',
              unitPriceHt,
              tvaPercent: 19,
              discountPercent: 0,
            },
          ],
        },
      });
    },
    [orders]
  );

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
            <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0">
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75">
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
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : v.voucherType === 'BonDeReception'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
            }`}
          >
            {v.voucherType === 'BonDeSortie' ? 'BSM (Sortie)' : v.voucherType === 'BonDeReception' ? 'BR (Réception)' : 'BT (Transfert)'}
          </span>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const retainedPrintableVoucher = useRetainedModalValue(printableVoucher);

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
                setActiveSubTab(val as typeof activeSubTab);
                setSortBy(val === 'inventory' ? 'name' : 'voucherNumber');
              }}
              options={[
                { value: 'inventory', label: isAr ? 'مخزون' : 'Stock', count: materials.length },
                { value: 'vouchers', label: isAr ? 'سندات' : isEn ? 'Vouchers' : 'Bons', count: vouchers.length },
                { value: 'finished_goods', label: isAr ? 'منتجات تامة' : isEn ? 'FG Lots' : 'Lots PF', count: finishedGoods.length },
                { value: 'shortages', label: isAr ? 'نواقص' : isEn ? 'Shortages' : 'Manquants', count: purchaseSuggestions.length },
                { value: 'traceability', label: isAr ? 'تتبع' : isEn ? 'Traceability' : 'Traçabilité', count: orders.length },
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
        {(activeSubTab === 'inventory' || activeSubTab === 'vouchers') && (
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
        )}

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
                <div data-sq="tile-lg" data-sq-border="none" className="w-16 h-16 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-dialog font-semibold mb-3">
                  <Boxes size={28} />
                </div>
                <h3 className="t-label font-semibold text-black dark:text-white text-center truncate max-w-[200px]">{m.name}</h3>
                <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold mt-0.5">{m.sku}</span>
                <div className="w-full pt-3 mt-3 border-t border-[var(--atr-divider)] t-cap flex justify-between">
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
        ) : activeSubTab === 'vouchers' ? (
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
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : v.voucherType === 'BonDeReception'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
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
        ) : activeSubTab === 'finished_goods' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 t-cap text-black/60 dark:text-white/65">
                <PackageCheck size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>
                  {isAr
                    ? `${finishedGoods.length} دفعة منتجات تامة (${releasedFgCount} محررة للتسليم)`
                    : isEn
                    ? `${finishedGoods.length} finished goods lots (${releasedFgCount} QC released)`
                    : `${finishedGoods.length} lots produits finis PFG (${releasedFgCount} libérés CQ pour BL/FAC)`}
                </span>
              </div>
            </div>
            {finishedGoods.length === 0 ? (
              <div data-sq="card" data-sq-border="solid" className="p-8 text-center text-black/55 dark:text-white/60 t-cap bg-[#FAF7F4]/60 dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
                {isAr ? 'لا توجد دفعات منتجات تامة بعد' : 'Aucun lot produit fini (PFG) enregistré.'}
              </div>
            ) : (
              <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                <table className="w-full text-left rtl:text-right t-cap">
                  <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                    <tr>
                      <th className="py-2.5 px-3">{isAr ? 'رقم الدفعة' : 'Lot PFG'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المنتج / OF' : 'Produit Finis & OF'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'الكمية' : 'Qté Produite'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'التكلفة CMUP' : 'Coût CMUP / u'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'المخزن' : 'Magasin'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'حالة الجودة' : 'Statut CQ'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'إجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                    {finishedGoods.map((lot) => (
                      <tr key={lot.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                        <td className="py-2.5 px-3 font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                          {lot.lotNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-black dark:text-white">{lot.productName}</div>
                          <div className="t-small text-black/55 dark:text-white/55">{lot.orderNumber} · {lot.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-black dark:text-white">
                          {lot.qtyProduced - lot.qtyDelivered} / {lot.qtyProduced} {lot.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-black dark:text-white">
                          {formatMoney(centimesToDzd(lot.unitCmupCentimes), language)}
                        </td>
                        <td className="py-2.5 px-3 text-black/70 dark:text-white/75">{lot.warehouseLocation || 'Magasin PF'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full t-small font-semibold ${
                              lot.releaseStatus === 'Released'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : lot.releaseStatus === 'Shipped'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {lot.releaseStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {lot.releaseStatus === 'Quarantine' ? (
                              <AtriumButton
                                type="button"
                                size="sm"
                                variant="secondary"
                                icon={<CheckCircle2 size={13} />}
                                onClick={() => {
                                  releaseFinishedGoodsLot({
                                    fgId: lot.id,
                                    inspectorName: currentUser?.fullName || 'Responsable CQ',
                                    qcInspectionId: lot.qcInspectionId,
                                  });
                                }}
                              >
                                {isAr ? 'تحرير CQ' : isEn ? 'Release QC' : 'Libérer CQ'}
                              </AtriumButton>
                            ) : (
                              <>
                                <AtriumButton
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  icon={<FileText size={13} />}
                                  onClick={() => handleOpenFgInvoice(lot, 'bl')}
                                >
                                  BL (6.1)
                                </AtriumButton>
                                <AtriumButton
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  icon={<FileText size={13} />}
                                  onClick={() => handleOpenFgInvoice(lot, 'facture')}
                                >
                                  FAC
                                </AtriumButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeSubTab === 'shortages' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 t-cap text-black/60 dark:text-white/65">
                <ShoppingCart size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>
                  {isAr
                    ? `${purchaseSuggestions.length} احتياج تموين عبر أوامر التصنيع النشطة`
                    : isEn
                    ? `${purchaseSuggestions.length} aggregated material shortage(s) across active MOs`
                    : `${purchaseSuggestions.length} suggestion(s) d'achat agrégées multi-OF`}
                </span>
              </div>
            </div>
            {purchaseSuggestions.length === 0 ? (
              <div data-sq="card" data-sq-border="solid" className="p-8 text-center text-emerald-700 dark:text-emerald-300 t-cap bg-emerald-50/60 dark:bg-emerald-950/25 [--sq-stroke:var(--sq-stroke-card)]">
                {isAr ? 'جميع المواد الأولية متوفرة لتغطية أوامر التصنيع والحد الأدنى.' : 'Aucune rupture multi-OF ni alerte seuil détectée.'}
              </div>
            ) : (
              <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                <table className="w-full text-left rtl:text-right t-cap">
                  <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                    <tr>
                      <th className="py-2.5 px-3">{isAr ? 'المادة' : 'Matière Première'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'المتاح / العتبة' : 'Dispo / Seuil'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'الاحتياج OFs' : 'Besoin Multi-OF'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'النقص / المقترح' : 'Manquant / À Commander'}</th>
                      <th className="py-2.5 px-3">{isAr ? 'الأوامر المتأثرة' : 'OF Impactés'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'التقدير' : 'Budget Est.'}</th>
                      <th className="py-2.5 px-3 text-right">{isAr ? 'تموين' : 'Réappro'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                    {purchaseSuggestions.map((s) => (
                      <tr key={s.materialId} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-black dark:text-white">{s.materialName}</div>
                          <div className="t-small text-black/55 dark:text-white/55 flex items-center gap-1.5">
                            <span>{s.sku}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded t-small font-semibold ${
                                s.urgency === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : s.urgency === 'high'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-[#F3EDE7] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
                              }`}
                            >
                              {s.urgency}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-semibold text-black dark:text-white">{s.availableStock}</span>
                          <span className="text-black/55 dark:text-white/55"> / {s.reorderThreshold} {s.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-black dark:text-white">
                          {s.totalRequiredAcrossOfs} {s.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {s.shortageQuantity > 0 ? `-${s.shortageQuantity}` : '0'} → +{s.suggestedOrderQuantity} {s.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {s.impactedOrderNumbers.length > 0 ? (
                            <span className="t-small text-black/75 dark:text-white/75">{s.impactedOrderNumbers.join(', ')}</span>
                          ) : (
                            <span className="t-small text-black/50 dark:text-white/50">Seuil sécurité</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-black dark:text-white">
                          {formatMoney(centimesToDzd(s.estimatedOrderTotalCentimes), language)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <AtriumButton
                            type="button"
                            size="sm"
                            variant="primary"
                            icon={<ShoppingCart size={13} />}
                            onClick={() => handleRestockFromSuggestion(s)}
                          >
                            {isAr ? 'استلام BR' : isEn ? 'Restock BR' : 'Réappro BR'}
                          </AtriumButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 t-cap font-semibold text-black dark:text-white">
                <GitBranch size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>
                  {isAr
                    ? 'سلسلة التتبع الكاملة للدفعة (المورد ← التصنيع ← الجودة ← المنتج التام ← الفاتورة)'
                    : 'Chaîne de Traçabilité Bout-en-Bout (Lots Fournisseurs → OF → CQ/NCR → PFG → BL/FAC)'}
                </span>
              </div>
              <LiveSelect
                size="sm"
                tone="soft"
                className="min-w-[260px]"
                value={selectedTraceOrderId}
                onValueChange={setSelectedTraceOrderId}
                options={orders.map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} · ${o.batchLotNumber || 'LOT'} · ${o.productName}`,
                }))}
                aria-label="Traceability Order Selector"
              />
            </div>

            {traceGraph ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 t-cap">
                <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2">
                  <div className="font-semibold text-black dark:text-white flex items-center justify-between">
                    <span>1. {isAr ? 'المواد الأولية BSM/BR' : 'Lots Matières Amont'}</span>
                    <span className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{traceGraph.upstreamMaterials.length}</span>
                  </div>
                  {traceGraph.upstreamMaterials.length === 0 ? (
                    <p className="t-small text-black/55 dark:text-white/55">Aucun bon BSM/BR lié.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {traceGraph.upstreamMaterials.map((u, idx) => (
                        <div key={idx} className="p-2 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)]">
                          <div className="font-semibold text-black dark:text-white truncate">{u.materialName}</div>
                          <div className="t-small text-black/60 dark:text-white/65 tabular-nums">
                            {u.voucherNumber} · {u.quantity} {u.unit}
                          </div>
                          <div className="t-small text-emerald-700 dark:text-emerald-400 tabular-nums">
                            Lot: {u.supplierLotNumber} {u.onmlCertificateRef ? `· ${u.onmlCertificateRef}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2">
                  <div className="font-semibold text-black dark:text-white flex items-center justify-between">
                    <span>2. {isAr ? 'الجودة & NCR' : 'Contrôles CQ & NCR'}</span>
                    <span className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{traceGraph.qualityGates.length + traceGraph.ncrHolds.length}</span>
                  </div>
                  {traceGraph.qualityGates.map((q, idx) => (
                    <div key={idx} className="p-2 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)]">
                      <div className="font-semibold text-black dark:text-white">{q.inspectionNumber} · {q.verdict}</div>
                      <div className="t-small text-black/60 dark:text-white/65 tabular-nums">
                        +{q.acceptedQuantity} OK / -{q.rejectedQuantity} Rebut
                      </div>
                    </div>
                  ))}
                  {traceGraph.ncrHolds.map((n, idx) => (
                    <div key={idx} className="p-2 rounded bg-amber-50 dark:bg-amber-950/35 border border-amber-400/40">
                      <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <ShieldAlert size={12} /> {n.ncrNumber} ({n.scrappedQuantity} u)
                      </div>
                      <div className="t-small text-amber-700 dark:text-amber-200">
                        {n.cmupAdjustmentHeld ? 'CMUP en attente (Gate 1)' : n.disposition}
                      </div>
                    </div>
                  ))}
                  {traceGraph.qualityGates.length === 0 && traceGraph.ncrHolds.length === 0 && (
                    <p className="t-small text-black/55 dark:text-white/55">Aucun contrôle QC enregistré.</p>
                  )}
                </div>

                <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2">
                  <div className="font-semibold text-black dark:text-white flex items-center justify-between">
                    <span>3. {isAr ? 'المنتجات التامة PFG' : 'Lots Produits Finis'}</span>
                    <span className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{traceGraph.finishedGoodsLots.length}</span>
                  </div>
                  {traceGraph.finishedGoodsLots.length === 0 ? (
                    <p className="t-small text-black/55 dark:text-white/55">Aucun lot PFG généré.</p>
                  ) : (
                    traceGraph.finishedGoodsLots.map((fg) => (
                      <div key={fg.id} className="p-2 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)]">
                        <div className="font-semibold text-black dark:text-white">{fg.lotNumber} · {fg.releaseStatus}</div>
                        <div className="t-small text-black/60 dark:text-white/65 tabular-nums">
                          {fg.qtyProduced} u · CMUP {formatMoney(centimesToDzd(fg.unitCmupCentimes), language)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2">
                  <div className="font-semibold text-black dark:text-white flex items-center justify-between">
                    <span>4. {isAr ? 'التسليم والفوترة 6.1' : 'BL / Factures Aval'}</span>
                    <span className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{traceGraph.downstreamDocuments.length}</span>
                  </div>
                  {traceGraph.downstreamDocuments.length === 0 ? (
                    <p className="t-small text-black/55 dark:text-white/55">Aucun document commercial lié.</p>
                  ) : (
                    traceGraph.downstreamDocuments.map((d) => (
                      <div key={d.id} className="p-2 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)]">
                        <div className="font-semibold text-black dark:text-white">{d.documentNumber} ({d.documentType})</div>
                        <div className="t-small text-black/60 dark:text-white/65 tabular-nums">
                          {d.customerName} · {formatMoney(centimesToDzd(d.totalCentimes), language)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
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
              ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
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
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55 block">
                    Données d'Emplacement & Seuil
                  </span>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Emplacement Rack :</span>
                    <span className="font-semibold text-black dark:text-white">{mat.warehouseLocation || 'Allée A-01'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Stock Physique Total :</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {mat.currentStock} {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Stock Réservé (OFs) :</span>
                    <span className="tabular-nums text-amber-600 font-semibold">
                      {mat.allocatedStock} {mat.unit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
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
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
                  <span className="t-small font-semibold text-black/55 dark:text-white/55 block">
                    Valorisation Comptable PMP
                  </span>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
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
              <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
                <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                  <span className="text-black/55 dark:text-white/55">Date Mouvement :</span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">{v.transferDate?.split('T')[0]}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                  <span className="text-black/55 dark:text-white/55">Matière :</span>
                  <span className="font-semibold text-black dark:text-white">{v.items[0]?.materialName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
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
                <div data-sq="card" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] text-black/70 dark:text-white/75">
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

      <KineticModalShell
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 sm:p-7 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="font-semibold t-card text-black dark:text-white">
              {materialToEdit
                ? isAr ? 'تعديل المادة الأولية' : 'Modifier la Matière Première'
                : isAr ? 'إضافة مادة أولية جديدة' : 'Nouvelle Référence Matière'}
            </h3>
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={() => setIsMaterialModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSaveMaterial} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="matSku"
                label="Code SKU"
                value={sku}
                onChange={setSku}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelSelect
                field="matCategory"
                label={isAr ? 'الصنف الصناعي' : 'Catégorie'}
                value={category}
                onChange={(v) => setCategory(v as RawMaterialStockItem['category'])}
                options={[
                  { value: 'Wood', label: 'Bois & Dérivés' },
                  { value: 'Metals', label: 'Métallurgie & Aciers' },
                  { value: 'Plastics', label: 'Polymères & Plastiques' },
                  { value: 'Chemicals', label: 'Chimie, Peintures & Résines' },
                  { value: 'Textiles', label: 'Textiles & Confection' },
                  { value: 'Hardware', label: 'Quincaillerie & Visserie' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="matName"
              label={isAr ? 'اسم المادة والمواصفات' : 'Désignation de la matière'}
              value={name}
              onChange={setName}
              placeholder="Ex: Bois Chêne Brut Séché 50mm..."
              width="100%"
              height={40}
              corner={12}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelInput
                field="matStock"
                label={isAr ? 'الكمية' : 'Stock Initial'}
                type="number"
                step="any"
                placeholder="10"
                value={stock}
                onChange={setStock}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="matUnit"
                label={isAr ? 'الوحدة' : 'Unité'}
                value={unit}
                onChange={setUnit}
                placeholder="kg, m³, Pièce..."
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="matMinThreshold"
                label={isAr ? 'عتبة التنبيه' : 'Seuil Mini'}
                type="number"
                step="any"
                placeholder="3"
                value={minThreshold}
                onChange={setMinThreshold}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="matUnitCost"
                label={isAr ? 'سعر الوحدة PMP (دج)' : 'Coût Unitaire PMP (DZD)'}
                type="number"
                placeholder="15000"
                value={unitCostDzd}
                onChange={setUnitCostDzd}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="matLocation"
                label={isAr ? 'موقع التخزين (الرف/الممر)' : 'Emplacement Casier'}
                value={warehouseLocation}
                onChange={setWarehouseLocation}
                placeholder="Ex: Rack A-02..."
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsMaterialModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {isAr ? 'حفظ المادة' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 sm:p-7 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="font-semibold t-card text-black dark:text-white">
              {isAr ? 'إصدار سند حركة مخزون (مرسوم 05-468)' : "Émission d'un Bon de Mouvement (Décret 05-468)"}
            </h3>
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={() => setIsVoucherModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="space-y-1.5">
              <label className="t-small font-semibold text-black/70 dark:text-white/75 block">
                {isAr ? 'نوع السند' : 'Type de Bon'}
              </label>
              <LiveSegmentedControl
                value={voucherType}
                onChange={(v) => setVoucherType(v as 'BonDeSortie' | 'BonDeReception' | 'BonDeTransfert')}
                options={[
                  { value: 'BonDeSortie', label: isAr ? 'صرف (BSM)' : 'Sortie (BSM)' },
                  { value: 'BonDeReception', label: isAr ? 'استلام (BR)' : 'Réception (BR)' },
                  { value: 'BonDeTransfert', label: isAr ? 'تحويل (BT)' : 'Transfert (BT)' },
                ]}
                size="sm"
                fullWidth
              />
            </div>
            <LabelSelect
              field="voucherMaterialId"
              label={isAr ? 'المادة الأولية المعنية' : 'Matière Première'}
              value={voucherMaterialId}
              onChange={setVoucherMaterialId}
              options={materials.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.sku} - Stock: ${m.currentStock} ${m.unit})`,
              }))}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="voucherQty"
                label={isAr ? 'الكمية المنقولة' : 'Quantité du Bon'}
                type="number"
                step="any"
                placeholder="1"
                value={voucherQty}
                onChange={setVoucherQty}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="voucherRecipient"
                label={isAr ? 'المستلم / المشغل' : 'Bénéficiaire / Demandeur'}
                placeholder={isAr ? 'اسم المستلم' : 'Nom du bénéficiaire...'}
                value={voucherRecipient}
                onChange={setVoucherRecipient}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
              <LabelInput
                field="voucherNotes"
                label={isAr ? 'سبب التحويل / ملاحظات' : 'Motif / Référence BL Fournisseur'}
                value={voucherNotes}
                onChange={setVoucherNotes}
                placeholder="Ex: Sortie pour OF-2026-0089..."
                width="100%"
                height={40}
                corner={12}
              />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelSelect
                field="voucherOrderId"
                label={isAr ? 'أمر التصنيع المرتبط (اختياري)' : 'Ordre de Fabrication lié (Optionnel)'}
                value={voucherOrderId}
                onChange={setVoucherOrderId}
                options={[
                  { value: '', label: isAr ? '-- بدون ربط --' : '-- Aucun --' },
                  ...orders.map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productName}` })),
                ]}
                width="100%"
                height={40}
                corner={12}
              />
              {voucherType === 'BonDeReception' && (
                <LabelInput
                  field="voucherIncomingUnitCost"
                  label={isAr ? 'سعر الشراء الجديد (دج)' : 'Prix Réception Unitaire (DZD)'}
                  type="number"
                  step="any"
                  placeholder={String(materials.find((m) => m.id === voucherMaterialId)?.unitCostPmpDzd || 0)}
                  value={voucherIncomingUnitCost}
                  onChange={setVoucherIncomingUnitCost}
                  width="100%"
                  height={40}
                  corner={12}
                />
              )}
            </div>
            {lateReceiptPreview && lateReceiptPreview.unitDeltaCentimes !== 0 && (
              <div
                data-testid="mfg-late-receipt-cmup-preview"
                className="p-3 rounded-[var(--r-ctl,12px)] bg-amber-50 dark:bg-amber-950/35 border border-amber-400/50 t-cap space-y-1 text-amber-900 dark:text-amber-200"
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>
                    {isAr ? 'تحديث متوسط التكلفة المرجح CMUP' : 'Recalcul CMUP Réception Tardive'}
                  </span>
                </div>
                <div className="tabular-nums">
                  PMP: {formatMoney(centimesToDzd(lateReceiptPreview.previousCmupCentimes), language)} →{' '}
                  <strong>{formatMoney(centimesToDzd(lateReceiptPreview.newCmupCentimes), language)}</strong>
                </div>
                {lateReceiptPreview.affectedOrders.length > 0 && (
                  <div className="t-small">
                    {lateReceiptPreview.affectedOrders.length}{' '}
                    {isAr ? 'أمر تصنيع سيتأثر بالفرق:' : 'OF actif(s) impacté(s):'}{' '}
                    {lateReceiptPreview.affectedOrders.map((a) => `${a.orderNumber} (${formatMoney(centimesToDzd(a.recalcDeltaCentimes), language)})`).join(', ')}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsVoucherModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {isAr ? 'إصدار وطباعة السند' : 'Valider & Imprimer le Bon'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={Boolean(printableVoucher)}
        onClose={() => setPrintableVoucher(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {retainedPrintableVoucher && (
          <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 sm:p-8 [--sq-stroke:var(--sq-stroke-pop)] space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)]">
              <div className="flex items-center gap-3">
                <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0">
                  <Printer size={20} />
                </div>
                <h3 className="font-semibold t-card text-black dark:text-white">{retainedPrintableVoucher.voucherNumber}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  tone="accent"
                  size={36}
                  leading={<Printer size={14} />}
                  onClick={() => window.print()}
                >
                  {isAr ? 'طباعة' : 'Imprimer'}
                </Button>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setPrintableVoucher(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="printable-document p-6 rounded-[var(--r-card,16px)] bg-white border-2 border-dashed border-black/[0.18] text-black space-y-5 font-sans">
              <div className="flex justify-between items-start border-b border-black/[0.12] pb-4">
                <div>
                  <div className="font-semibold t-label text-black">
                    {currentBusiness?.name || currentBranch?.name || ''}
                  </div>
                  {(currentBusinessConfig?.fiscalProfile?.rc || currentBusinessConfig?.fiscalProfile?.nif || currentBranch?.address) && (
                    <div className="t-small text-black/55 font-medium">
                      {[
                        currentBusinessConfig?.fiscalProfile?.rc ? `RC: ${currentBusinessConfig.fiscalProfile.rc}` : '',
                        currentBusinessConfig?.fiscalProfile?.nif ? `NIF: ${currentBusinessConfig.fiscalProfile.nif}` : '',
                        currentBranch?.address || '',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  )}
                  <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mt-1">
                    {retainedPrintableVoucher.voucherType === 'BonDeSortie'
                      ? 'Bon de Sortie Magasin (BSM)'
                      : retainedPrintableVoucher.voucherType === 'BonDeReception'
                      ? 'Bon de Réception Magasin (BR)'
                      : 'Bon de Transfert Interne (BT)'}
                  </div>
                </div>
                <div className="text-end">
                  <div className="tabular-nums font-semibold t-label text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{retainedPrintableVoucher.voucherNumber}</div>
                  <div className="t-cap text-black/55 mt-0.5">Date : {retainedPrintableVoucher.transferDate?.split('T')[0]}</div>
                </div>
              </div>
              <div className="bg-neutral-50 p-3 rounded-[var(--r-ctl,12px)] border border-black/[0.12] t-cap space-y-1">
                <div className="flex justify-between">
                  <span className="text-black/55">Demandeur / Bénéficiaire :</span>
                  <span className="font-semibold text-black">{retainedPrintableVoucher.recipientStaffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55">Motif de transfert :</span>
                  <span className="font-semibold text-black">{retainedPrintableVoucher.notes || 'Ordre de fabrication'}</span>
                </div>
              </div>
              <table className="w-full t-cap border border-black/[0.12] rounded-[var(--r-ctl-sm,10px)] overflow-hidden">
                <thead className="bg-neutral-100 text-black/75 font-semibold border-b border-black/[0.12]">
                  <tr>
                    <th className="p-2 text-start">Désignation Matière</th>
                    <th className="p-2 text-center w-24">Quantité</th>
                    <th className="p-2 text-end w-28">Prix PMP</th>
                    <th className="p-2 text-end w-28">Total DZD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.10]">
                  {retainedPrintableVoucher.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{item.materialName}</td>
                      <td className="p-2 text-center tabular-nums font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 text-end tabular-nums">{formatMoney(item.unitCostDzd, language)}</td>
                      <td className="p-2 text-end tabular-nums font-semibold">
                        {formatMoney(item.quantity * item.unitCostDzd, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-2 t-small font-semibold text-black">
                <span>Total Mouvement : </span>
                <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(retainedPrintableVoucher.totalValueDzd, language)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-black/[0.12] text-center t-cap">
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
        )}
      </KineticModalShell>

      <UnifiedInvoiceComposerModal
        isOpen={Boolean(fgDeliveryPrefill)}
        onClose={() => setFgDeliveryPrefill(null)}
        prefill={fgDeliveryPrefill?.prefill || null}
        onSaved={() => {
          setFgDeliveryPrefill(null);
        }}
      />
    </div>
  );
};
