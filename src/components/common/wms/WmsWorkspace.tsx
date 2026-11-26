import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Barcode,
  Boxes,
  ClipboardCheck,
  Layers,
  PackageCheck,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Ship,
  Truck,
} from 'lucide-react';
import {
  selectCurrentProductsFromState,
  selectCurrentWarehousesFromState,
  selectCurrentWmsBinsFromState,
  selectCurrentWmsConsignmentEntriesFromState,
  selectCurrentWmsCycleCountsFromState,
  selectCurrentWmsLandedCostAllocationsFromState,
  selectCurrentWmsNegativeStockPolicyFromState,
  selectCurrentWmsReorderRulesFromState,
  selectCurrentWmsSerialNumbersFromState,
  selectCurrentWmsStockLotsFromState,
  selectCurrentWmsStockTransfersFromState,
  selectCurrentWmsUnitConversionsFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import type {
  WmsConsignmentMovementType,
  WmsLandedCostMethod,
  WmsLotRecallStatus,
  WmsNegativeStockPolicy,
  WmsSerialStatus,
} from '../../../types/index';
import {
  allocateLandedCosts,
  computeReorderSuggestions,
  convertQuantityUnit,
  formatCentimesDzd,
  isLotExpiredOnDate,
  sortLotsFefo,
  summarizeConsignmentBalances,
} from '../../../utils/wmsEngine';
import { dzdToCentimes } from '../../../utils/money';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ScreenPod } from '../../ui/kinetic';
import { WmsBarcodePrintModal, type BarcodeLabelTarget } from './WmsBarcodePrintModal';

type WmsTabId = 'lots' | 'bins_serials' | 'transfers_counts' | 'rules_landed' | 'consignment';

export const WmsWorkspace: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const {
    products,
    warehouses,
    b2bSuppliers,
    crmParties,
    negativeStockPolicy,
    bins,
    lots,
    serials,
    conversions,
    reorderRules,
    cycleCounts,
    transfers,
    landedCosts,
    consignmentEntries,
  } = useAtriumSelector(
    (s) => ({
      products: selectCurrentProductsFromState(s),
      warehouses: selectCurrentWarehousesFromState(s),
      b2bSuppliers: s.b2bSuppliers || [],
      crmParties: s.crmParties || [],
      negativeStockPolicy: selectCurrentWmsNegativeStockPolicyFromState(s),
      bins: selectCurrentWmsBinsFromState(s),
      lots: selectCurrentWmsStockLotsFromState(s),
      serials: selectCurrentWmsSerialNumbersFromState(s),
      conversions: selectCurrentWmsUnitConversionsFromState(s),
      reorderRules: selectCurrentWmsReorderRulesFromState(s),
      cycleCounts: selectCurrentWmsCycleCountsFromState(s),
      transfers: selectCurrentWmsStockTransfersFromState(s),
      landedCosts: selectCurrentWmsLandedCostAllocationsFromState(s),
      consignmentEntries: selectCurrentWmsConsignmentEntriesFromState(s),
    }),
    shallowEqualObjects
  );

  const {
    setWmsNegativeStockPolicy,
    upsertWmsBin,
    upsertWmsStockLot,
    setWmsLotRecallStatus,
    consumeWmsStockAtomic,
    registerWmsSerialNumber,
    updateWmsSerialStatus,
    upsertWmsUnitConversion,
    upsertWmsReorderRule,
    createPurchaseOrdersFromReorderSuggestions,
    createWmsCycleCount,
    updateWmsCycleCountLine,
    postWmsCycleCount,
    createWmsStockTransfer,
    transitionWmsStockTransfer,
    createLandedCostAllocation,
    applyLandedCostAllocation,
    recordWmsConsignmentEntry,
  } = useAtriumActions();

  const [activeTab, setActiveTab] = useState<WmsTabId>('lots');
  const [printTarget, setPrintTarget] = useState<BarcodeLabelTarget | null>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultProductId = products[0]?.id || '';
  const defaultWarehouseId = warehouses[0]?.id || '';

  // Lot creation form
  const [lotProductId, setLotProductId] = useState('');
  const [lotWarehouseId, setLotWarehouseId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [lotExpiry, setLotExpiry] = useState('');
  const [lotQty, setLotQty] = useState('25');
  const [lotCostDzd, setLotCostDzd] = useState('1200');
  const [lotSupplier, setLotSupplier] = useState('');

  // FEFO atomic consumption test/dispatch form
  const [consumeProductId, setConsumeProductId] = useState('');
  const [consumeQty, setConsumeQty] = useState('5');
  const [consumeUnit, setConsumeUnit] = useState('');
  const [consumeRef, setConsumeRef] = useState('DISP-001');
  const [lastConsumeMsg, setLastConsumeMsg] = useState<string | null>(null);

  // Bins & Serials form
  const [binWarehouseId, setBinWarehouseId] = useState('');
  const [binCode, setBinCode] = useState('');
  const [binName, setBinName] = useState('');
  const [binZone, setBinZone] = useState('Zone A');
  const [serialProductId, setSerialProductId] = useState('');
  const [serialValue, setSerialValue] = useState('');
  const [serialLotId, setSerialLotId] = useState('');

  // Transfers & Cycle Counts form
  const [trfFromWh, setTrfFromWh] = useState('');
  const [trfToWh, setTrfToWh] = useState('');
  const [trfProductId, setTrfProductId] = useState('');
  const [trfLotId, setTrfLotId] = useState('');
  const [trfQty, setTrfQty] = useState('10');
  const [trfCarrier, setTrfCarrier] = useState('');
  const [ccWarehouseId, setCcWarehouseId] = useState('');

  // Reorder, Conversions & Landed Cost form
  const [rrProductId, setRrProductId] = useState('');
  const [rrMin, setRrMin] = useState('10');
  const [rrMax, setRrMax] = useState('50');
  const [rrQty, setRrQty] = useState('40');
  const [rrSupplier, setRrSupplier] = useState('');
  const [convProductId, setConvProductId] = useState('');
  const [convFrom, setConvFrom] = useState('carton');
  const [convTo, setConvTo] = useState('piece');
  const [convFactor, setConvFactor] = useState('12');
  const [lcRef, setLcRef] = useState('IMP-2026-01');
  const [lcMethod, setLcMethod] = useState<WmsLandedCostMethod>('by_value');
  const [lcFreightDzd, setLcFreightDzd] = useState('45000');
  const [lcCustomsDzd, setLcCustomsDzd] = useState('82000');
  const [lcInsuranceDzd, setLcInsuranceDzd] = useState('8500');
  const [lcFxRate, setLcFxRate] = useState('1');
  const [lcLotId, setLcLotId] = useState('');

  // Consignment form
  const [conPartyName, setConPartyName] = useState('');
  const [conPkgCode, setConPkgCode] = useState('CASIER-24');
  const [conPkgName, setConPkgName] = useState('Casier Plastique 24');
  const [conType, setConType] = useState<WmsConsignmentMovementType>('issued');
  const [conQty, setConQty] = useState('20');
  const [conDepositDzd, setConDepositDzd] = useState('500');
  const [conRefDoc, setConRefDoc] = useState('');

  const effLotProductId = lotProductId || defaultProductId;
  const effConsumeProductId = consumeProductId || defaultProductId;
  const effSerialProductId = serialProductId || defaultProductId;
  const effTrfProductId = trfProductId || defaultProductId;
  const effRrProductId = rrProductId || defaultProductId;

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
      })),
    [products]
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: `${w.name} (${w.code})`,
      })),
    [warehouses]
  );

  const fefoSortedLots = useMemo(() => sortLotsFefo(lots, todayIso), [lots, todayIso]);
  const nonSellableLots = useMemo(
    () =>
      lots.filter(
        (l) => l.recallStatus !== 'active' || isLotExpiredOnDate(l, todayIso) || l.qtyOnHand <= 0
      ),
    [lots, todayIso]
  );

  const reorderSuggestions = useMemo(
    () =>
      computeReorderSuggestions({
        rules: reorderRules,
        products,
        lots,
        refDateIso: todayIso,
      }),
    [reorderRules, products, lots, todayIso]
  );

  const consignmentBalances = useMemo(
    () => summarizeConsignmentBalances(consignmentEntries),
    [consignmentEntries]
  );

  const landedCostPreview = useMemo(() => {
    const targetLot = lots.find((l) => l.id === lcLotId) || lots[0];
    const prod = products.find((p) => p.id === (targetLot?.productId || defaultProductId));
    if (!prod && !targetLot) return null;
    const sampleLines = targetLot
      ? [
          {
            productId: targetLot.productId,
            productName: targetLot.productName,
            lotId: targetLot.id,
            lotNumber: targetLot.lotNumber,
            quantity: Math.max(1, targetLot.qtyOnHand),
            baseUnitCostCentimes: targetLot.unitCostCentimes || dzdToCentimes(prod?.cost?.amount ?? prod?.costPrice ?? 1000),
          },
        ]
      : [
          {
            productId: prod!.id,
            productName: prod!.name,
            quantity: Math.max(1, prod!.stockQuantity || 10),
            baseUnitCostCentimes: dzdToCentimes(prod!.cost?.amount ?? prod!.costPrice ?? 1000),
          },
        ];
    return allocateLandedCosts({
      lines: sampleLines,
      freightCentimes: dzdToCentimes(Number(lcFreightDzd || 0)),
      customsCentimes: dzdToCentimes(Number(lcCustomsDzd || 0)),
      insuranceCentimes: dzdToCentimes(Number(lcInsuranceDzd || 0)),
      otherCentimes: 0,
      fxRate: Number(lcFxRate || 1),
      method: lcMethod,
    });
  }, [lots, lcLotId, products, defaultProductId, lcFreightDzd, lcCustomsDzd, lcInsuranceDzd, lcFxRate, lcMethod]);

  const handleCreateLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effLotProductId || !lotNumber.trim()) return;
    upsertWmsStockLot({
      productId: effLotProductId,
      warehouseId: lotWarehouseId || defaultWarehouseId || undefined,
      lotNumber: lotNumber.trim(),
      expiryDate: lotExpiry || undefined,
      qtyOnHand: Number(lotQty || 0),
      unitCostCentimes: dzdToCentimes(Number(lotCostDzd || 0)),
      supplierName: lotSupplier.trim() || undefined,
    });
    setLotNumber('');
  };

  const handleFefoConsume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effConsumeProductId) return;
    const res = consumeWmsStockAtomic({
      productId: effConsumeProductId,
      quantity: Number(consumeQty || 1),
      unit: consumeUnit.trim() || undefined,
      referenceDoc: consumeRef.trim() || 'WMS-DISP',
    });
    if (res.ok) {
      setLastConsumeMsg(
        res.allocations.length > 0
          ? res.allocations.map((a) => `${a.lotNumber}: -${a.quantity}`).join(', ')
          : L(`Deducted ${res.convertedBaseQty} units`, `Déduit ${res.convertedBaseQty} u`, `تم خصم ${res.convertedBaseQty} وحدة`)
      );
    } else {
      setLastConsumeMsg(res.errorMessage || res.errorCode || 'Blocked');
    }
  };

  const handleCreateBin = (e: React.FormEvent) => {
    e.preventDefault();
    const whId = binWarehouseId || defaultWarehouseId;
    if (!whId || !binCode.trim() || !binName.trim()) return;
    upsertWmsBin({
      warehouseId: whId,
      code: binCode.trim(),
      name: binName.trim(),
      zone: binZone.trim() || undefined,
    });
    setBinCode('');
    setBinName('');
  };

  const handleCreateSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effSerialProductId || !serialValue.trim()) return;
    const res = registerWmsSerialNumber({
      productId: effSerialProductId,
      serialNumber: serialValue.trim(),
      warehouseId: defaultWarehouseId || undefined,
      lotId: serialLotId || undefined,
    });
    if (res.ok) setSerialValue('');
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effTrfProductId) return;
    const prod = products.find((p) => p.id === effTrfProductId);
    const chosenLot = lots.find((l) => l.id === trfLotId);
    createWmsStockTransfer({
      fromWarehouseId: trfFromWh || warehouses[0]?.id,
      toWarehouseId: trfToWh || warehouses[1]?.id || warehouses[0]?.id,
      carrierName: trfCarrier.trim() || undefined,
      items: [
        {
          productId: effTrfProductId,
          productName: prod?.name || effTrfProductId,
          sku: prod?.sku,
          lotId: chosenLot?.id,
          lotNumber: chosenLot?.lotNumber,
          quantity: Math.max(1, Number(trfQty || 1)),
          unitCostCentimes: chosenLot?.unitCostCentimes || dzdToCentimes(prod?.cost?.amount ?? prod?.costPrice ?? 0),
        },
      ],
    });
  };

  const handleCreateReorderRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effRrProductId) return;
    upsertWmsReorderRule({
      productId: effRrProductId,
      warehouseId: defaultWarehouseId || undefined,
      minQty: Number(rrMin || 0),
      maxQty: Number(rrMax || 0),
      reorderQty: Number(rrQty || 0),
      preferredSupplierName: rrSupplier.trim() || b2bSuppliers[0]?.supplierName || undefined,
    });
  };

  const handleCreateConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convFrom.trim() || !convTo.trim()) return;
    upsertWmsUnitConversion({
      productId: convProductId || undefined,
      fromUnit: convFrom.trim(),
      toBaseUnit: convTo.trim(),
      conversionFactor: Math.max(0.001, Number(convFactor || 1)),
    });
  };

  const handleApplyLandedCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!landedCostPreview) return;
    createLandedCostAllocation({
      referenceNumber: lcRef.trim() || `IMP-${Date.now().toString().slice(-4)}`,
      method: lcMethod,
      fxRate: Number(lcFxRate || 1),
      freightCentimes: dzdToCentimes(Number(lcFreightDzd || 0)),
      customsCentimes: dzdToCentimes(Number(lcCustomsDzd || 0)),
      insuranceCentimes: dzdToCentimes(Number(lcInsuranceDzd || 0)),
      otherCentimes: 0,
      lines: landedCostPreview.lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        lotId: l.lotId,
        lotNumber: l.lotNumber,
        quantity: l.quantity,
        baseUnitCostCentimes: l.baseUnitCostCentimes,
      })),
      applyImmediately: true,
    });
  };

  const handleRecordConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    const partyName = conPartyName.trim() || crmParties[0]?.displayName || 'Client Emballages';
    if (!conPkgCode.trim() || !conPkgName.trim()) return;
    recordWmsConsignmentEntry({
      partyName,
      packagingCode: conPkgCode.trim(),
      packagingName: conPkgName.trim(),
      movementType: conType,
      quantity: Math.max(1, Number(conQty || 1)),
      unitDepositCentimes: dzdToCentimes(Number(conDepositDzd || 0)),
      referenceDoc: conRefDoc.trim() || undefined,
    });
    setConRefDoc('');
  };

  return (
    <div data-testid="wms-workspace" className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* WMS Header Bar + Negative Stock Policy */}
      <ScreenPod>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2.5">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-9 h-9 bg-[#FCEEE8] dark:bg-[#2B2825] flex items-center justify-center text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]"
            >
              <Boxes size={18} />
            </div>
            <div>
              <h3 className="t-small font-bold text-black dark:text-white">
                {t('phase2_wms_title', L('Shared Warehouse & FEFO Inventory (WMS)', 'Entrepôt Partagé & Traçabilité FEFO (WMS)', 'المستودع المشترك وتتبع الصلاحية FEFO'))}
              </h3>
              <p className="t-cap text-black/60 dark:text-white/65">
                {t('phase2_wms_subtitle', L('Lots & expiry FEFO, bins, serials, cycle counts, in-transit transfers, landed cost & returnable crates.', 'Lots FEFO, emplacements, numéros de série, inventaires, transferts en transit, coût de revient & consignes.', 'الدفعات وتاريخ الانتهاء، الرفوف، الأرقام التسلسلية، الجرد، التحويلات وتكلفة الاستيراد والتعبئة المرتجعة.'))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-cap font-semibold text-black/65 dark:text-white/70">
              {t('phase2_wms_neg_policy', L('Negative Stock Policy:', 'Politique stock négatif :', 'سياسة المخزون السالب:'))}
            </span>
            {(['block', 'warn', 'allow'] as WmsNegativeStockPolicy[]).map((pol) => (
              <AtriumButton
                key={pol}
                size="xs"
                variant={negativeStockPolicy === pol ? 'primary' : 'secondary'}
                onClick={() => setWmsNegativeStockPolicy(pol)}
              >
                {pol === 'block'
                  ? L('Block', 'Bloquer', 'منع')
                  : pol === 'warn'
                  ? L('Warn', 'Alerter', 'تحذير')
                  : L('Allow', 'Autoriser', 'سماح')}
              </AtriumButton>
            ))}
          </div>
        </div>

        <div className="pt-4 overflow-x-auto pb-1 -mx-1 px-1">
          <div className="min-w-max">
            <LiveSegmentedControl
            size="sm"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as WmsTabId)}
            options={[
              {
                value: 'lots',
                label: t('phase2_wms_tab_lots', L('Lots & FEFO', 'Lots & FEFO', 'الدفعات وFEFO')),
                icon: <Layers size={14} />,
                count: lots.length,
              },
              {
                value: 'bins_serials',
                label: t('phase2_wms_tab_bins_serials', L('Bins & Serials', 'Emplacements & Séries', 'الرفوف والتسلسل')),
                icon: <Barcode size={14} />,
                count: bins.length + serials.length,
              },
              {
                value: 'transfers_counts',
                label: t('phase2_wms_tab_transfers_counts', L('Transfers & Counts', 'Transferts & Inventaires', 'التحويلات والجرد')),
                icon: <ArrowLeftRight size={14} />,
                count: transfers.length + cycleCounts.length,
              },
              {
                value: 'rules_landed',
                label: t('phase2_wms_tab_rules_landed', L('Reorder, Units & Landed Cost', 'Réassort, Unités & Approche', 'التموين والوحدات والتكلفة')),
                icon: <Ship size={14} />,
                count: reorderSuggestions.length,
              },
              {
                value: 'consignment',
                label: t('phase2_wms_tab_consignment', L('Returnable Packaging', 'Emballages Consignés', 'العبوات المرتجعة')),
                icon: <RefreshCw size={14} />,
                count: consignmentBalances.length,
              },
            ]}
            aria-label="WMS Sub-navigation"
          />
          </div>
        </div>
      </ScreenPod>

      {/* TAB 1: LOTS & FEFO */}
      {activeTab === 'lots' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <ScreenPod>
              <form onSubmit={handleCreateLot} className="space-y-3">
                <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                  <Plus size={15} />
                  <span>{L('Register Lot / Batch', 'Enregistrer un Lot / Batch', 'تسجيل دفعة / مخزون')}</span>
                </div>
                <LabelSelect
                  label={L('Product', 'Article', 'المنتج')}
                  value={effLotProductId}
                  options={productOptions}
                  onChange={setLotProductId}
                />
                {warehouseOptions.length > 0 && (
                  <LabelSelect
                    label={L('Warehouse', 'Dépôt', 'المستودع')}
                    value={lotWarehouseId || defaultWarehouseId}
                    options={warehouseOptions}
                    onChange={setLotWarehouseId}
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabelInput
                    field="lotNumber"
                    label={L('Lot Code', 'N° de Lot', 'رمز الدفعة')}
                    value={lotNumber}
                    onChange={setLotNumber}
                    placeholder="LOT-2026-A1"
                    required
                  />
                  <LabelInput
                    field="expiryDate"
                    label={L('Expiry Date', 'Date Expiration', 'تاريخ الانتهاء')}
                    type="date"
                    value={lotExpiry}
                    onChange={setLotExpiry}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabelInput
                    field="qtyOnHand"
                    label={L('Quantity', 'Quantité', 'الكمية')}
                    type="number"
                    min={0}
                    step="0.01"
                    value={lotQty}
                    onChange={setLotQty}
                    required
                  />
                  <LabelInput
                    field="unitCostDzd"
                    label={L('Unit Cost (DZD)', 'Coût Unitaire (DA)', 'تكلفة الوحدة (دج)')}
                    type="number"
                    min={0}
                    step="0.01"
                    value={lotCostDzd}
                    onChange={setLotCostDzd}
                  />
                </div>
                <LabelInput
                  field="supplierName"
                  label={L('Supplier (optional)', 'Fournisseur (optionnel)', 'المورد (اختياري)')}
                  value={lotSupplier}
                  onChange={setLotSupplier}
                />
                <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                  {L('Save Lot', 'Enregistrer le Lot', 'حفظ الدفعة')}
                </AtriumButton>
              </form>
            </ScreenPod>

            <ScreenPod>
              <form onSubmit={handleFefoConsume} className="space-y-3">
                <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                  <PackageCheck size={15} />
                  <span>{L('Atomic FEFO Stock Dispatch', 'Sortie Stock Atomique FEFO', 'إخراج مخزون FEFO')}</span>
                </div>
                <LabelSelect
                  label={L('Product', 'Article', 'المنتج')}
                  value={effConsumeProductId}
                  options={productOptions}
                  onChange={setConsumeProductId}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <LabelInput
                    field="consumeQty"
                    label={L('Qty', 'Qté', 'الكمية')}
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={consumeQty}
                    onChange={setConsumeQty}
                  />
                  <LabelInput
                    field="consumeUnit"
                    label={L('Unit (opt)', 'Unité', 'الوحدة')}
                    value={consumeUnit}
                    onChange={setConsumeUnit}
                    placeholder="carton"
                  />
                  <LabelInput
                    field="consumeRef"
                    label={L('Ref Doc', 'Réf Doc', 'المرجع')}
                    value={consumeRef}
                    onChange={setConsumeRef}
                  />
                </div>
                <AtriumButton type="submit" variant="secondary" size="sm" icon={<PackageCheck size={14} />}>
                  {L('Consume FEFO', 'Déduire selon FEFO', 'خصم وفق FEFO')}
                </AtriumButton>
                {lastConsumeMsg && (
                  <div className="p-2.5 text-xs font-mono bg-[#FAF7F4] dark:bg-[#2B2825] border border-[var(--atr-divider)] rounded-[var(--r-card,8px)]">
                    {lastConsumeMsg}
                  </div>
                )}
              </form>
            </ScreenPod>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <ScreenPod>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <span className="t-small font-bold text-black dark:text-white">
                  {L('Active FEFO Pick Queue (Earliest Expiry First)', 'File FEFO Active (Date Proche en Premier)', 'قائمة السحب FEFO (الأقرب انتهاءً أولاً)')}
                </span>
                <span className="t-cap font-mono text-black/60 dark:text-white/60">
                  {fefoSortedLots.length} {L('sellable lots', 'lots disponibles', 'دفعة متاحة')}
                </span>
              </div>
              {fefoSortedLots.length === 0 ? (
                <div className="py-6 text-center t-small text-black/55 dark:text-white/55">
                  {L('No active lots yet. Register a lot on the left to enable FEFO expiry tracking.', 'Aucun lot actif. Enregistrez un lot à gauche pour activer le suivi FEFO.', 'لا توجد دفعات نشطة بعد.')}
                </div>
              ) : (
                <div className="divide-y divide-[var(--atr-divider)]">
                  {fefoSortedLots.map((lot) => (
                    <div key={lot.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold t-small text-black dark:text-white truncate">
                          {lot.productName} · <span className="font-mono">{lot.lotNumber}</span>
                        </div>
                        <div className="t-cap text-black/60 dark:text-white/60 font-mono">
                          {L('Qty', 'Qté', 'الكمية')}: {lot.qtyOnHand} · {L('Cost', 'Coût', 'التكلفة')}: {formatCentimesDzd(lot.unitCostCentimes)}
                          {lot.expiryDate ? ` · EXP ${lot.expiryDate}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AtriumButton
                          size="xs"
                          variant="secondary"
                          icon={<Barcode size={13} />}
                          onClick={() =>
                            setPrintTarget({
                              code: `${lot.sku || lot.productId.slice(0, 8)}-${lot.lotNumber}`,
                              productName: lot.productName,
                              sku: lot.sku,
                              lotNumber: lot.lotNumber,
                              expiryDate: lot.expiryDate,
                              unitCostCentimes: lot.unitCostCentimes,
                            })
                          }
                        >
                          {L('Label', 'Étiquette', 'ملصق')}
                        </AtriumButton>
                        <AtriumButton
                          size="xs"
                          variant="secondary"
                          icon={<ShieldAlert size={13} />}
                          onClick={() => setWmsLotRecallStatus(lot.id, 'quarantined', 'Manual quarantine')}
                        >
                          {L('Quarantine', 'Quarantaine', 'حجر')}
                        </AtriumButton>
                        <AtriumButton
                          size="xs"
                          variant="secondary"
                          onClick={() => setWmsLotRecallStatus(lot.id, 'recalled', 'Quality recall')}
                        >
                          {L('Recall', 'Rappel Lot', 'استرجاع')}
                        </AtriumButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {nonSellableLots.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--atr-divider)]">
                  <div className="t-cap font-semibold text-[#B8321C] dark:text-[#FF8D7A] mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{L('Blocked / Expired / Recalled Lots', 'Lots Bloqués / Expirés / Rappelés', 'دفعات محظورة / منتهية / مسترجعة')}</span>
                  </div>
                  <div className="space-y-2">
                    {nonSellableLots.map((lot) => (
                      <div key={lot.id} className="p-2.5 bg-[#FDE4DF]/50 dark:bg-[#3D1E1A]/40 rounded-[var(--r-card,8px)] flex items-center justify-between gap-2">
                        <div className="t-cap font-mono text-black dark:text-white">
                          {lot.lotNumber} ({lot.productName}) · <strong>{lot.recallStatus}</strong>
                          {lot.expiryDate ? ` · EXP ${lot.expiryDate}` : ''}
                        </div>
                        {lot.recallStatus !== 'active' && (
                          <AtriumButton
                            size="xs"
                            variant="secondary"
                            onClick={() => setWmsLotRecallStatus(lot.id, 'active')}
                          >
                            {L('Release', 'Réactiver', 'تفعيل')}
                          </AtriumButton>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScreenPod>
          </div>
        </div>
      )}

      {/* TAB 2: BINS & SERIALS */}
      {activeTab === 'bins_serials' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ScreenPod>
            <form onSubmit={handleCreateBin} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white">
                {L('Warehouse Bins / Locations', 'Emplacements / Rayons (Bins)', 'مواقع الرفوف في المستودع')}
              </div>
              {warehouseOptions.length > 0 && (
                <LabelSelect
                  label={L('Warehouse', 'Dépôt', 'المستودع')}
                  value={binWarehouseId || defaultWarehouseId}
                  options={warehouseOptions}
                  onChange={setBinWarehouseId}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <LabelInput
                  field="binCode"
                  label={L('Bin Code', 'Code Bin', 'رمز الرف')}
                  value={binCode}
                  onChange={setBinCode}
                  placeholder="A-01-02"
                  required
                />
                <LabelInput
                  field="binName"
                  label={L('Label', 'Libellé', 'التسمية')}
                  value={binName}
                  onChange={setBinName}
                  placeholder="Allée A Rack 1"
                  required
                />
                <LabelInput
                  field="binZone"
                  label={L('Zone', 'Zone', 'المنطقة')}
                  value={binZone}
                  onChange={setBinZone}
                />
              </div>
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Add Bin', 'Ajouter Emplacement', 'إضافة رف')}
              </AtriumButton>
            </form>
            <div className="pt-3 divide-y divide-[var(--atr-divider)]">
              {bins.map((b) => (
                <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold">{b.code} — {b.name}</span>
                  <span className="text-black/60 dark:text-white/60">{b.zone || '-'}</span>
                </div>
              ))}
              {bins.length === 0 && (
                <p className="py-4 t-cap text-black/55 dark:text-white/55">
                  {L('No bins configured yet.', 'Aucun emplacement configuré.', 'لا توجد رفوف مسجلة.')}
                </p>
              )}
            </div>
          </ScreenPod>

          <ScreenPod>
            <form onSubmit={handleCreateSerial} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white">
                {L('Serial Number Tracking', 'Suivi Numéros de Série', 'تتبع الأرقام التسلسلية')}
              </div>
              <LabelSelect
                label={L('Product', 'Article', 'المنتج')}
                value={effSerialProductId}
                options={productOptions}
                onChange={setSerialProductId}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <LabelInput
                  field="serialValue"
                  label={L('Serial Number', 'N° de Série', 'الرقم التسلسلي')}
                  value={serialValue}
                  onChange={setSerialValue}
                  placeholder="SN-2026-0001"
                  required
                />
                <LabelSelect
                  label={L('Lot (optional)', 'Lot (optionnel)', 'الدفعة (اختياري)')}
                  value={serialLotId}
                  options={[{ value: '', label: '-' }, ...lots.map((l) => ({ value: l.id, label: l.lotNumber }))]}
                  onChange={setSerialLotId}
                />
              </div>
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Register Serial', 'Enregistrer N° Série', 'تسجيل الرقم التسلسلي')}
              </AtriumButton>
            </form>
            <div className="pt-3 divide-y divide-[var(--atr-divider)]">
              {serials.map((sn) => (
                <div key={sn.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-mono font-semibold">{sn.serialNumber}</div>
                    <div className="text-black/60 dark:text-white/60">{sn.productName} · {sn.status}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      icon={<Barcode size={12} />}
                      onClick={() =>
                        setPrintTarget({
                          code: sn.serialNumber,
                          productName: sn.productName,
                          serialNumber: sn.serialNumber,
                        })
                      }
                    >
                      {L('Label', 'Étiquette', 'ملصق')}
                    </AtriumButton>
                    {(['in_stock', 'sold', 'returned', 'damaged'] as WmsSerialStatus[]).map((st) => (
                      <AtriumButton
                        key={st}
                        size="xs"
                        variant={sn.status === st ? 'primary' : 'secondary'}
                        onClick={() => updateWmsSerialStatus(sn.id, st)}
                      >
                        {st}
                      </AtriumButton>
                    ))}
                  </div>
                </div>
              ))}
              {serials.length === 0 && (
                <p className="py-4 t-cap text-black/55 dark:text-white/55">
                  {L('No serial numbers registered.', 'Aucun numéro de série enregistré.', 'لا توجد أرقام تسلسلية مسجلة.')}
                </p>
              )}
            </div>
          </ScreenPod>
        </div>
      )}

      {/* TAB 3: TRANSFERS IN TRANSIT & CYCLE COUNTS */}
      {activeTab === 'transfers_counts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ScreenPod>
            <form onSubmit={handleCreateTransfer} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                <Truck size={15} />
                <span>{L('Inter-Warehouse Transfer in Transit', 'Transfert Inter-Dépôts en Transit', 'التحويل بين المستودعات')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <LabelSelect
                  label={L('From Warehouse', 'Dépôt Source', 'من مستودع')}
                  value={trfFromWh || warehouses[0]?.id || ''}
                  options={warehouseOptions}
                  onChange={setTrfFromWh}
                />
                <LabelSelect
                  label={L('To Warehouse', 'Dépôt Cible', 'إلى مستودع')}
                  value={trfToWh || warehouses[1]?.id || warehouses[0]?.id || ''}
                  options={warehouseOptions}
                  onChange={setTrfToWh}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <LabelSelect
                  label={L('Product', 'Article', 'المنتج')}
                  value={effTrfProductId}
                  options={productOptions}
                  onChange={setTrfProductId}
                />
                <LabelSelect
                  label={L('Source Lot', 'Lot Source', 'الدفعة')}
                  value={trfLotId}
                  options={[{ value: '', label: '-' }, ...lots.map((l) => ({ value: l.id, label: l.lotNumber }))]}
                  onChange={setTrfLotId}
                />
                <LabelInput
                  field="trfQty"
                  label={L('Qty', 'Qté', 'الكمية')}
                  type="number"
                  min={1}
                  value={trfQty}
                  onChange={setTrfQty}
                />
              </div>
              <LabelInput
                field="trfCarrier"
                label={L('Carrier / Driver', 'Transporteur / Chauffeur', 'الناقل / السائق')}
                value={trfCarrier}
                onChange={setTrfCarrier}
              />
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Create Transfer', 'Créer Transfert', 'إنشاء تحويل')}
              </AtriumButton>
            </form>
            <div className="pt-3 space-y-2">
              {transfers.map((trf) => (
                <div key={trf.id} className="p-3 bg-[#FAF7F4] dark:bg-[#2B2825] rounded-[var(--r-card,8px)] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <div className="font-mono font-bold">{trf.transferNumber} · {trf.status}</div>
                    <div className="text-black/65 dark:text-white/65">
                      {trf.fromWarehouseName || '-'} → {trf.toWarehouseName || '-'} ({trf.items[0]?.quantity || 0} u)
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {trf.status === 'draft' && (
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => transitionWmsStockTransfer(trf.id, 'dispatch')}
                      >
                        {L('Dispatch', 'Expédier (Transit)', 'شحن')}
                      </AtriumButton>
                    )}
                    {(trf.status === 'in_transit' || trf.status === 'partial') && (
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => transitionWmsStockTransfer(trf.id, 'receive')}
                      >
                        {L('Receive', 'Réceptionner', 'استلام')}
                      </AtriumButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScreenPod>

          <ScreenPod>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                <ClipboardCheck size={15} />
                <span>{L('Cycle Counts & Variance Posting', 'Inventaires Tournants & Écarts', 'الجرد الدوري وترحيل الفروقات')}</span>
              </div>
              <div className="flex items-center gap-2">
                {warehouseOptions.length > 0 && (
                  <div className="w-44">
                    <LabelSelect
                      label={L('Warehouse', 'Dépôt', 'المستودع')}
                      value={ccWarehouseId}
                      options={[{ value: '', label: L('All Warehouses', 'Tous', 'الكل') }, ...warehouseOptions]}
                      onChange={setCcWarehouseId}
                    />
                  </div>
                )}
                <AtriumButton
                  size="sm"
                  variant="primary"
                  icon={<Plus size={14} />}
                  onClick={() => createWmsCycleCount({ warehouseId: ccWarehouseId || undefined })}
                >
                  {L('Start Count', 'Démarrer Inventaire', 'بدء الجرد')}
                </AtriumButton>
              </div>
            </div>
            <div className="pt-3 space-y-3">
              {cycleCounts.map((cc) => (
                <div key={cc.id} className="p-3 bg-[#FAF7F4] dark:bg-[#2B2825] rounded-[var(--r-card,8px)] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold">
                      {cc.countNumber} · {cc.status} · Δ {cc.totalVarianceUnits} u ({formatCentimesDzd(cc.totalVarianceCentimes)})
                    </div>
                    {cc.status !== 'posted' && cc.status !== 'cancelled' && (
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => postWmsCycleCount(cc.id)}
                      >
                        {L('Post Variance', 'Valider Écarts', 'ترحيل الفروقات')}
                      </AtriumButton>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {cc.lines.map((line) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-center text-xs bg-white dark:bg-[#1E1C1A] p-2 rounded-[var(--r-check,6px)]">
                        <div className="col-span-5 truncate">
                          <span className="font-semibold">{line.productName}</span>
                          {line.lotNumber && <span className="text-black/55 dark:text-white/55 font-mono"> · {line.lotNumber}</span>}
                        </div>
                        <div className="col-span-2 font-mono text-black/65 dark:text-white/65">
                          Sys: {line.systemQty}{line.activeSalesDeltaQty ? ` (-${line.activeSalesDeltaQty})` : ''}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            disabled={cc.status === 'posted'}
                            value={line.countedQty}
                            onChange={(e) =>
                              updateWmsCycleCountLine({
                                cycleCountId: cc.id,
                                lineId: line.id,
                                countedQty: Number(e.target.value || 0),
                              })
                            }
                            aria-label={`Counted qty for ${line.productName}`}
                            className="w-full px-2 py-1 text-xs font-mono border border-stone-300 dark:border-stone-700 bg-transparent rounded-[var(--r-check,6px)]"
                          />
                        </div>
                        <div className="col-span-2 font-mono text-end font-semibold">
                          Δ {line.varianceQty}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScreenPod>
        </div>
      )}

      {/* TAB 4: REORDER RULES, UNIT CONVERSIONS & LANDED COST */}
      {activeTab === 'rules_landed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ScreenPod>
            <form onSubmit={handleCreateReorderRule} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white">
                {L('Reorder Rules (Min / Max)', 'Règles de Réassort (Min/Max)', 'قواعد إعادة التموين')}
              </div>
              <LabelSelect
                label={L('Product', 'Article', 'المنتج')}
                value={effRrProductId}
                options={productOptions}
                onChange={setRrProductId}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <LabelInput field="rrMin" label="Min" type="number" value={rrMin} onChange={setRrMin} />
                <LabelInput field="rrMax" label="Max" type="number" value={rrMax} onChange={setRrMax} />
                <LabelInput field="rrQty" label={L('Std Qty', 'Qté Std', 'الكمية')} type="number" value={rrQty} onChange={setRrQty} />
              </div>
              <LabelInput
                field="rrSupplier"
                label={L('Preferred Supplier', 'Fournisseur Préféré', 'المورد المفضل')}
                value={rrSupplier}
                onChange={setRrSupplier}
              />
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Save Rule', 'Enregistrer Règle', 'حفظ القاعدة')}
              </AtriumButton>
            </form>
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="t-cap font-bold">{L('Suggested Purchases', 'Suggestions Achats', 'اقتراحات الشراء')} ({reorderSuggestions.length})</span>
                {reorderSuggestions.length > 0 && (
                  <AtriumButton
                    size="xs"
                    variant="primary"
                    onClick={() => createPurchaseOrdersFromReorderSuggestions(reorderSuggestions)}
                  >
                    {L('Create Draft PO(s)', 'Générer BC Brouillon', 'إنشاء طلب شراء')}
                  </AtriumButton>
                )}
              </div>
              {reorderSuggestions.map((s) => (
                <div key={s.ruleId} className="p-2 bg-[#FCEFD2]/60 dark:bg-[#3A2E14]/50 rounded-[var(--r-check,6px)] text-xs">
                  <div className="font-semibold">{s.productName}</div>
                  <div className="font-mono text-black/70 dark:text-white/70">
                    {L('Avail', 'Dispo', 'متاح')}: {s.currentAvailableQty} / Min {s.minQty} → +{s.suggestedOrderQty} u
                  </div>
                </div>
              ))}
            </div>
          </ScreenPod>

          <ScreenPod>
            <form onSubmit={handleCreateConversion} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                <Scale size={15} />
                <span>{L('Unit Conversions (Piece / Carton / Pallet)', 'Conversions d’Unités', 'تحويل الوحدات')}</span>
              </div>
              <LabelSelect
                label={L('Product (or Global)', 'Article (ou Global)', 'المنتج (أو عام)')}
                value={convProductId}
                options={[{ value: '', label: L('Global Rule', 'Règle Globale', 'قاعدة عامة') }, ...productOptions]}
                onChange={setConvProductId}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <LabelInput field="convFrom" label={L('From Unit', 'Unité Source', 'من وحدة')} value={convFrom} onChange={setConvFrom} />
                <LabelInput field="convTo" label={L('Base Unit', 'Unité Base', 'إلى وحدة')} value={convTo} onChange={setConvTo} />
                <LabelInput field="convFactor" label={L('Factor', 'Facteur', 'المعامل')} type="number" step="0.01" value={convFactor} onChange={setConvFactor} />
              </div>
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Save Conversion', 'Enregistrer Conversion', 'حفظ التحويل')}
              </AtriumButton>
            </form>
            <div className="pt-3 space-y-1.5 text-xs">
              {conversions.map((c) => {
                const check = convertQuantityUnit({
                  quantity: 2,
                  fromUnit: c.fromUnit,
                  toUnit: c.toBaseUnit,
                  conversions,
                  productId: c.productId,
                });
                return (
                  <div key={c.id} className="p-2 bg-[#FAF7F4] dark:bg-[#2B2825] rounded-[var(--r-check,6px)] flex justify-between font-mono">
                    <span>1 {c.fromUnit} = {c.conversionFactor} {c.toBaseUnit}</span>
                    <span className="text-black/55 dark:text-white/55">2 {c.fromUnit} → {check.convertedQuantity} {c.toBaseUnit}</span>
                  </div>
                );
              })}
            </div>
          </ScreenPod>

          <ScreenPod>
            <form onSubmit={handleApplyLandedCost} className="space-y-3 pb-4 border-b border-[var(--atr-divider)]">
              <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                <Ship size={15} />
                <span>{L('Landed Cost Allocation', 'Coût d’Approche (Fret & Douane)', 'توزيع تكاليف الاستيراد')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <LabelInput field="lcRef" label={L('Import Ref', 'Réf Dossier', 'المرجع')} value={lcRef} onChange={setLcRef} />
                <LabelSelect
                  label={L('Method', 'Méthode', 'الطريقة')}
                  value={lcMethod}
                  options={[
                    { value: 'by_value', label: L('By Value', 'Par Valeur', 'حسب القيمة') },
                    { value: 'by_quantity', label: L('By Quantity', 'Par Quantité', 'حسب الكمية') },
                  ]}
                  onChange={(v) => setLcMethod(v as WmsLandedCostMethod)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <LabelInput field="lcFreight" label={L('Freight (DA)', 'Fret (DA)', 'الشحن')} type="number" value={lcFreightDzd} onChange={setLcFreightDzd} />
                <LabelInput field="lcCustoms" label={L('Customs (DA)', 'Douane (DA)', 'الجمارك')} type="number" value={lcCustomsDzd} onChange={setLcCustomsDzd} />
                <LabelInput field="lcInsurance" label={L('Insurance (DA)', 'Assurance (DA)', 'التأمين')} type="number" value={lcInsuranceDzd} onChange={setLcInsuranceDzd} />
                <LabelInput field="lcFx" label="FX Rate" type="number" step="0.01" value={lcFxRate} onChange={setLcFxRate} />
              </div>
              {lots.length > 0 && (
                <LabelSelect
                  label={L('Target Lot', 'Lot Cible', 'الدفعة المستهدفة')}
                  value={lcLotId || lots[0]?.id || ''}
                  options={lots.map((l) => ({ value: l.id, label: `${l.lotNumber} (${l.productName})` }))}
                  onChange={setLcLotId}
                />
              )}
              {landedCostPreview && (
                <div className="p-2 bg-[#FAF7F4] dark:bg-[#2B2825] rounded-[var(--r-check,6px)] text-xs font-mono">
                  {L('Total Landed', 'Total Frais', 'الإجمالي')}: {formatCentimesDzd(landedCostPreview.totalLandedCentimes)}
                  {landedCostPreview.lines[0] && (
                    <div>
                      {L('New Unit Cost', 'Nouveau Coût U.', 'التكلفة الجديدة')}: {formatCentimesDzd(landedCostPreview.lines[0].newUnitCostCentimes)}
                    </div>
                  )}
                </div>
              )}
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Allocate & Apply to Lots', 'Appliquer au Coût des Lots', 'تطبيق على تكلفة الدفعات')}
              </AtriumButton>
            </form>
            <div className="pt-3 space-y-1.5 text-xs">
              {landedCosts.map((a) => (
                <div key={a.id} className="p-2 bg-[#FAF7F4] dark:bg-[#2B2825] rounded-[var(--r-check,6px)] flex items-center justify-between">
                  <span className="font-mono">{a.referenceNumber} · {formatCentimesDzd(a.totalLandedCentimes)}</span>
                  {a.status === 'draft' ? (
                    <AtriumButton size="xs" variant="secondary" onClick={() => applyLandedCostAllocation(a.id)}>
                      {L('Apply', 'Appliquer', 'تطبيق')}
                    </AtriumButton>
                  ) : (
                    <span className="text-[#0B7A45] dark:text-[#4ADE80] font-semibold">{a.status}</span>
                  )}
                </div>
              ))}
            </div>
          </ScreenPod>
        </div>
      )}

      {/* TAB 5: RETURNABLE PACKAGING / CONSIGNMENT LEDGER */}
      {activeTab === 'consignment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <ScreenPod>
              <form onSubmit={handleRecordConsignment} className="space-y-3">
                <div className="font-semibold t-small text-black dark:text-white">
                  {L('Record Returnable Packaging Movement', 'Mouvement Emballage Consigné', 'حركة عبوات مرتجعة')}
                </div>
                <LabelInput
                  field="conPartyName"
                  label={L('Partner / Client', 'Client / Partenaire', 'العميل / الشريك')}
                  value={conPartyName}
                  onChange={setConPartyName}
                  placeholder="SARL Atlas Distribution"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <LabelInput field="conPkgCode" label={L('Packaging Code', 'Code Emballage', 'رمز العبوة')} value={conPkgCode} onChange={setConPkgCode} required />
                  <LabelInput field="conPkgName" label={L('Description', 'Désignation', 'الوصف')} value={conPkgName} onChange={setConPkgName} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <LabelSelect
                    label={L('Movement', 'Mouvement', 'الحركة')}
                    value={conType}
                    options={[
                      { value: 'issued', label: L('Issued', 'Sortie Consigne', 'إخراج') },
                      { value: 'returned', label: L('Returned', 'Retour', 'إرجاع') },
                      { value: 'lost_charged', label: L('Lost / Billed', 'Perdu Facturé', 'تالف/مفوتر') },
                    ]}
                    onChange={(v) => setConType(v as WmsConsignmentMovementType)}
                  />
                  <LabelInput field="conQty" label={L('Qty', 'Qté', 'الكمية')} type="number" min={1} value={conQty} onChange={setConQty} />
                  <LabelInput field="conDep" label={L('Deposit (DA)', 'Caution (DA)', 'الضمان')} type="number" min={0} value={conDepositDzd} onChange={setConDepositDzd} />
                </div>
                <LabelInput field="conRef" label={L('Doc Ref', 'Réf BL/Facture', 'مرجع الوثيقة')} value={conRefDoc} onChange={setConRefDoc} />
                <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                  {L('Record Movement', 'Enregistrer', 'تسجيل الحركة')}
                </AtriumButton>
              </form>
            </ScreenPod>
          </div>

          <div className="lg:col-span-7">
            <ScreenPod>
              <div className="font-semibold t-small text-black dark:text-white pb-3 border-b border-[var(--atr-divider)]">
                {L('Net Outstanding Consignments by Partner', 'Soldes Emballages Consignés par Tiers', 'أرصدة العبوات المرتجعة حسب العميل')}
              </div>
              {consignmentBalances.length === 0 ? (
                <p className="py-6 text-center t-small text-black/55 dark:text-white/55">
                  {L('No consignment movements recorded yet.', 'Aucun emballage consigné enregistré.', 'لا توجد حركات عبوات مرتجعة.')}
                </p>
              ) : (
                <div className="divide-y divide-[var(--atr-divider)]">
                  {consignmentBalances.map((row) => (
                    <div key={`${row.partyKey}_${row.packagingCode}`} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-black dark:text-white">{row.partyName}</div>
                        <div className="font-mono text-black/60 dark:text-white/60">
                          {row.packagingCode} · {row.packagingName} (Out: {row.issuedQty}, Ret: {row.returnedQty}, Lost: {row.lostChargedQty})
                        </div>
                      </div>
                      <div className="text-end font-mono">
                        <div className="font-bold text-black dark:text-white">{row.netOutstandingQty} u</div>
                        <div className="text-[#BF431F] dark:text-[#FF8F63]">{formatCentimesDzd(row.netDepositCentimes)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScreenPod>
          </div>
        </div>
      )}

      <WmsBarcodePrintModal
        isOpen={Boolean(printTarget)}
        onClose={() => setPrintTarget(null)}
        target={printTarget}
      />
    </div>
  );
};
