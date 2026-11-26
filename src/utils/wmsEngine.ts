import { centimesToDzd, dzdToCentimes, roundHalfAwayFromZero } from './money';
import type {
  Product,
  WmsConsignmentEntry,
  WmsCycleCountLine,
  WmsLandedCostLine,
  WmsLandedCostMethod,
  WmsNegativeStockPolicy,
  WmsReorderRule,
  WmsSerialNumber,
  WmsStockLot,
  WmsUnitConversion,
} from '../types/index';

export interface FefoAllocationSlice {
  lotId: string;
  lotNumber: string;
  expiryDate?: string;
  quantity: number;
  unitCostCentimes: number;
}

export interface FefoAllocationResult {
  ok: boolean;
  errorCode?:
    | 'INVALID_QUANTITY'
    | 'EXPIRED_LOT_BLOCKED'
    | 'RECALLED_LOT_BLOCKED'
    | 'NEGATIVE_STOCK_BLOCKED'
    | 'INSUFFICIENT_ACTIVE_LOTS';
  errorMessage?: string;
  warningMessage?: string;
  allocations: FefoAllocationSlice[];
  shortfallQty: number;
  totalAllocatedQty: number;
}

export interface ReorderSuggestion {
  ruleId: string;
  productId: string;
  productName: string;
  warehouseId?: string;
  currentAvailableQty: number;
  minQty: number;
  maxQty: number;
  suggestedOrderQty: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  leadTimeDays: number;
}

export interface ConsignmentBalanceSummary {
  partyKey: string;
  partyName: string;
  packagingCode: string;
  packagingName: string;
  issuedQty: number;
  returnedQty: number;
  lostChargedQty: number;
  netOutstandingQty: number;
  netDepositCentimes: number;
}

export function isLotExpiredOnDate(lot: Pick<WmsStockLot, 'expiryDate' | 'recallStatus'>, refDateIso: string): boolean {
  if (lot.recallStatus === 'expired') return true;
  if (!lot.expiryDate) return false;
  const refDay = refDateIso.slice(0, 10);
  return lot.expiryDate.slice(0, 10) < refDay;
}

export function isLotSellable(lot: WmsStockLot, refDateIso: string): { sellable: boolean; reason?: 'expired' | 'recalled' | 'quarantined' } {
  if (lot.recallStatus === 'recalled') return { sellable: false, reason: 'recalled' };
  if (lot.recallStatus === 'quarantined') return { sellable: false, reason: 'quarantined' };
  if (isLotExpiredOnDate(lot, refDateIso)) return { sellable: false, reason: 'expired' };
  return { sellable: true };
}

/**
 * Sorts sellable lots in strict FEFO order: earliest expiryDate first,
 * non-expiring lots after expiring lots, tie-broken by createdAt then id.
 */
export function sortLotsFefo(lots: WmsStockLot[], refDateIso: string): WmsStockLot[] {
  return [...lots]
    .filter((l) => !l.deletedAt && isLotSellable(l, refDateIso).sellable && l.qtyOnHand - l.qtyReserved > 0)
    .sort((a, b) => {
      const aExp = a.expiryDate ? a.expiryDate.slice(0, 10) : '9999-12-31';
      const bExp = b.expiryDate ? b.expiryDate.slice(0, 10) : '9999-12-31';
      if (aExp !== bExp) return aExp.localeCompare(bExp);
      const aCreated = a.createdAt || '';
      const bCreated = b.createdAt || '';
      if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
      return a.id.localeCompare(b.id);
    });
}

/**
 * Pure FEFO stock consumption evaluator supporting:
 * - Explicit lot selection (blocking expired/recalled/quarantined lots)
 * - Automatic FEFO multi-lot picking
 * - Negative stock policy (`block` | `warn` | `allow`)
 */
export function evaluateFefoConsumption(params: {
  lots: WmsStockLot[];
  productOnHandQty: number;
  requestedQty: number;
  refDateIso: string;
  warehouseId?: string;
  explicitLotId?: string;
  negativeStockPolicy: WmsNegativeStockPolicy;
}): FefoAllocationResult {
  const { lots, productOnHandQty, requestedQty, refDateIso, warehouseId, explicitLotId, negativeStockPolicy } = params;
  if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
    return {
      ok: false,
      errorCode: 'INVALID_QUANTITY',
      errorMessage: 'Requested quantity must be greater than zero.',
      allocations: [],
      shortfallQty: 0,
      totalAllocatedQty: 0,
    };
  }

  if (explicitLotId) {
    const lot = lots.find((l) => l.id === explicitLotId && !l.deletedAt);
    if (!lot) {
      return {
        ok: false,
        errorCode: 'INSUFFICIENT_ACTIVE_LOTS',
        errorMessage: 'Selected lot does not exist.',
        allocations: [],
        shortfallQty: requestedQty,
        totalAllocatedQty: 0,
      };
    }
    const check = isLotSellable(lot, refDateIso);
    if (!check.sellable) {
      return {
        ok: false,
        errorCode: check.reason === 'expired' ? 'EXPIRED_LOT_BLOCKED' : 'RECALLED_LOT_BLOCKED',
        errorMessage:
          check.reason === 'expired'
            ? `Lot ${lot.lotNumber} expired on ${lot.expiryDate} and cannot be sold.`
            : `Lot ${lot.lotNumber} is ${check.reason} and blocked from consumption.`,
        allocations: [],
        shortfallQty: requestedQty,
        totalAllocatedQty: 0,
      };
    }
    const available = Math.max(0, lot.qtyOnHand - lot.qtyReserved);
    if (available < requestedQty && negativeStockPolicy === 'block') {
      return {
        ok: false,
        errorCode: 'NEGATIVE_STOCK_BLOCKED',
        errorMessage: `Insufficient quantity on lot ${lot.lotNumber} (available: ${available}, requested: ${requestedQty}).`,
        allocations: [],
        shortfallQty: requestedQty - available,
        totalAllocatedQty: 0,
      };
    }
    const warningMessage =
      available < requestedQty && negativeStockPolicy === 'warn'
        ? `Negative stock warning: lot ${lot.lotNumber} short by ${requestedQty - available}.`
        : undefined;
    return {
      ok: true,
      warningMessage,
      allocations: [
        {
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          quantity: requestedQty,
          unitCostCentimes: lot.unitCostCentimes,
        },
      ],
      shortfallQty: Math.max(0, requestedQty - available),
      totalAllocatedQty: requestedQty,
    };
  }

  const scopedLots = warehouseId ? lots.filter((l) => l.warehouseId === warehouseId) : lots;
  const fefoLots = sortLotsFefo(scopedLots, refDateIso);
  let remaining = requestedQty;
  const allocations: FefoAllocationSlice[] = [];

  for (const lot of fefoLots) {
    if (remaining <= 0) break;
    const avail = Math.max(0, lot.qtyOnHand - lot.qtyReserved);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    allocations.push({
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      expiryDate: lot.expiryDate,
      quantity: take,
      unitCostCentimes: lot.unitCostCentimes,
    });
    remaining = Number((remaining - take).toFixed(4));
  }

  const hasTrackedLots = scopedLots.some((l) => !l.deletedAt);
  const effectiveAvailable = hasTrackedLots
    ? fefoLots.reduce((sum, l) => sum + Math.max(0, l.qtyOnHand - l.qtyReserved), 0)
    : productOnHandQty;

  if (remaining > 0 && hasTrackedLots && negativeStockPolicy === 'block') {
    return {
      ok: false,
      errorCode: 'NEGATIVE_STOCK_BLOCKED',
      errorMessage: `Insufficient active non-expired stock (requested: ${requestedQty}, available: ${effectiveAvailable}).`,
      allocations: [],
      shortfallQty: remaining,
      totalAllocatedQty: 0,
    };
  }

  if (!hasTrackedLots && productOnHandQty < requestedQty && negativeStockPolicy === 'block') {
    return {
      ok: false,
      errorCode: 'NEGATIVE_STOCK_BLOCKED',
      errorMessage: `Negative stock blocked (requested: ${requestedQty}, on hand: ${productOnHandQty}).`,
      allocations: [],
      shortfallQty: requestedQty - productOnHandQty,
      totalAllocatedQty: 0,
    };
  }

  const warningMessage =
    effectiveAvailable < requestedQty && negativeStockPolicy === 'warn'
      ? `Negative stock warning: short by ${Number((requestedQty - effectiveAvailable).toFixed(4))} units.`
      : undefined;

  return {
    ok: true,
    warningMessage,
    allocations,
    shortfallQty: remaining,
    totalAllocatedQty: Number((requestedQty - remaining).toFixed(4)),
  };
}

/**
 * Converts a quantity between units (e.g. carton/pallet <-> piece) using defined conversion rules.
 */
export function convertQuantityUnit(params: {
  quantity: number;
  fromUnit: string;
  toUnit: string;
  conversions: WmsUnitConversion[];
  productId?: string;
}): { ok: boolean; convertedQuantity: number; factor: number; errorMessage?: string } {
  const { quantity, fromUnit, toUnit, conversions, productId } = params;
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  if (!Number.isFinite(quantity)) {
    return { ok: false, convertedQuantity: 0, factor: 1, errorMessage: 'Invalid quantity' };
  }
  if (f === t) {
    return { ok: true, convertedQuantity: quantity, factor: 1 };
  }
  const active = conversions.filter((c) => !c.deletedAt && (!c.productId || !productId || c.productId === productId));
  // Prefer product-specific rule over global rule
  const sorted = [...active].sort((a, b) => (b.productId ? 1 : 0) - (a.productId ? 1 : 0));

  const direct = sorted.find(
    (c) => c.fromUnit.trim().toLowerCase() === f && c.toBaseUnit.trim().toLowerCase() === t
  );
  if (direct) {
    return {
      ok: true,
      factor: direct.conversionFactor,
      convertedQuantity: Number((quantity * direct.conversionFactor).toFixed(6)),
    };
  }
  const inverse = sorted.find(
    (c) => c.fromUnit.trim().toLowerCase() === t && c.toBaseUnit.trim().toLowerCase() === f
  );
  if (inverse && inverse.conversionFactor > 0) {
    const invFactor = 1 / inverse.conversionFactor;
    return {
      ok: true,
      factor: invFactor,
      convertedQuantity: Number((quantity * invFactor).toFixed(6)),
    };
  }
  return {
    ok: false,
    convertedQuantity: quantity,
    factor: 1,
    errorMessage: `No conversion rule defined between "${fromUnit}" and "${toUnit}".`,
  };
}

/**
 * Computes suggested purchase orders for active reorder rules where available stock <= minQty.
 */
export function computeReorderSuggestions(params: {
  rules: WmsReorderRule[];
  products: Product[];
  lots: WmsStockLot[];
  refDateIso: string;
}): ReorderSuggestion[] {
  const { rules, products, lots, refDateIso } = params;
  const suggestions: ReorderSuggestion[] = [];

  for (const rule of rules) {
    if (rule.deletedAt || !rule.isActive) continue;
    const product = products.find((p) => p.id === rule.productId);
    const matchingLots = lots.filter(
      (l) =>
        !l.deletedAt &&
        l.productId === rule.productId &&
        (!rule.warehouseId || l.warehouseId === rule.warehouseId) &&
        isLotSellable(l, refDateIso).sellable
    );
    const lotQty = matchingLots.reduce((sum, l) => sum + Math.max(0, l.qtyOnHand - l.qtyReserved), 0);
    const currentAvailableQty =
      matchingLots.length > 0 ? lotQty : Math.max(0, Number(product?.stockQuantity || 0));

    if (currentAvailableQty <= rule.minQty) {
      const targetQty =
        rule.maxQty > currentAvailableQty
          ? rule.maxQty - currentAvailableQty
          : rule.reorderQty > 0
          ? rule.reorderQty
          : Math.max(1, rule.minQty * 2 - currentAvailableQty);

      suggestions.push({
        ruleId: rule.id,
        productId: rule.productId,
        productName: rule.productName || product?.name || rule.productId,
        warehouseId: rule.warehouseId,
        currentAvailableQty,
        minQty: rule.minQty,
        maxQty: rule.maxQty,
        suggestedOrderQty: Math.ceil(targetQty),
        preferredSupplierId: rule.preferredSupplierId,
        preferredSupplierName: rule.preferredSupplierName,
        leadTimeDays: rule.leadTimeDays,
      });
    }
  }

  return suggestions.sort((a, b) => a.currentAvailableQty - b.currentAvailableQty);
}

/**
 * Computes cycle count line variances accounting for sales executed while counting was open.
 */
export function computeCycleCountVarianceLine(line: WmsCycleCountLine): WmsCycleCountLine {
  const effectiveSystemQty = Number((line.systemQty - (line.activeSalesDeltaQty || 0)).toFixed(4));
  const varianceQty = Number((line.countedQty - effectiveSystemQty).toFixed(4));
  const varianceCentimes = roundHalfAwayFromZero(varianceQty * (line.unitCostCentimes || 0));
  return {
    ...line,
    varianceQty,
    varianceCentimes,
  };
}

/**
 * Allocates landed cost components (freight + customs + insurance + other) across receipt lines
 * in integer centimes, guaranteeing exact sum conservation (remainder centime absorbed on last line).
 */
export function allocateLandedCosts(params: {
  lines: Array<{
    productId: string;
    productName: string;
    lotId?: string;
    lotNumber?: string;
    quantity: number;
    baseUnitCostCentimes: number;
  }>;
  freightCentimes: number;
  customsCentimes: number;
  insuranceCentimes: number;
  otherCentimes: number;
  fxRate?: number;
  method: WmsLandedCostMethod;
}): {
  totalLandedCentimes: number;
  lines: WmsLandedCostLine[];
} {
  const fx = params.fxRate && params.fxRate > 0 ? params.fxRate : 1;
  const totalExtra = roundHalfAwayFromZero(
    (Math.max(0, params.freightCentimes) +
      Math.max(0, params.customsCentimes) +
      Math.max(0, params.insuranceCentimes) +
      Math.max(0, params.otherCentimes)) *
      fx
  );

  if (params.lines.length === 0) {
    return { totalLandedCentimes: totalExtra, lines: [] };
  }

  const weights = params.lines.map((l) => {
    const qty = Math.max(0, l.quantity);
    if (params.method === 'by_quantity') return qty;
    return qty * Math.max(0, l.baseUnitCostCentimes);
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  let remainingExtra = totalExtra;
  const allocatedLines: WmsLandedCostLine[] = params.lines.map((l, idx) => {
    const isLast = idx === params.lines.length - 1;
    let allocatedExtraCentimes = 0;
    if (totalWeight <= 0) {
      allocatedExtraCentimes = isLast
        ? remainingExtra
        : roundHalfAwayFromZero(totalExtra / params.lines.length);
    } else if (isLast) {
      allocatedExtraCentimes = remainingExtra;
    } else {
      allocatedExtraCentimes = roundHalfAwayFromZero((totalExtra * weights[idx]) / totalWeight);
    }
    remainingExtra -= allocatedExtraCentimes;
    const perUnitExtra = l.quantity > 0 ? roundHalfAwayFromZero(allocatedExtraCentimes / l.quantity) : 0;
    return {
      productId: l.productId,
      productName: l.productName,
      lotId: l.lotId,
      lotNumber: l.lotNumber,
      quantity: l.quantity,
      baseUnitCostCentimes: l.baseUnitCostCentimes,
      allocatedExtraCentimes,
      newUnitCostCentimes: l.baseUnitCostCentimes + perUnitExtra,
    };
  });

  return {
    totalLandedCentimes: totalExtra,
    lines: allocatedLines,
  };
}

/**
 * Aggregates net returnable packaging (consignes) balance per party & packaging code.
 */
export function summarizeConsignmentBalances(entries: WmsConsignmentEntry[]): ConsignmentBalanceSummary[] {
  const map = new Map<string, ConsignmentBalanceSummary>();
  for (const e of entries) {
    if (e.deletedAt) continue;
    const partyKey = e.partyId || e.partyName.trim().toLowerCase();
    const mapKey = `${partyKey}::${e.packagingCode.trim().toUpperCase()}`;
    const cur = map.get(mapKey) || {
      partyKey,
      partyName: e.partyName,
      packagingCode: e.packagingCode.trim().toUpperCase(),
      packagingName: e.packagingName,
      issuedQty: 0,
      returnedQty: 0,
      lostChargedQty: 0,
      netOutstandingQty: 0,
      netDepositCentimes: 0,
    };
    const dep = e.totalDepositCentimes || roundHalfAwayFromZero(e.quantity * e.unitDepositCentimes);
    if (e.movementType === 'issued') {
      cur.issuedQty += e.quantity;
      cur.netOutstandingQty += e.quantity;
      cur.netDepositCentimes += dep;
    } else if (e.movementType === 'returned') {
      cur.returnedQty += e.quantity;
      cur.netOutstandingQty -= e.quantity;
      cur.netDepositCentimes -= dep;
    } else if (e.movementType === 'lost_charged') {
      cur.lostChargedQty += e.quantity;
      cur.netOutstandingQty -= e.quantity;
      cur.netDepositCentimes -= dep;
    }
    map.set(mapKey, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.netOutstandingQty - a.netOutstandingQty);
}

/**
 * Validates serial number uniqueness & state transitions.
 */
export function validateSerialAssignment(params: {
  existingSerials: WmsSerialNumber[];
  productId: string;
  serialNumber: string;
}): { ok: boolean; errorMessage?: string } {
  const clean = params.serialNumber.trim();
  if (!clean) {
    return { ok: false, errorMessage: 'Serial number cannot be empty.' };
  }
  const dup = params.existingSerials.find(
    (s) =>
      !s.deletedAt &&
      s.productId === params.productId &&
      s.serialNumber.trim().toLowerCase() === clean.toLowerCase()
  );
  if (dup) {
    return { ok: false, errorMessage: `Duplicate serial number "${clean}" for this product.` };
  }
  return { ok: true };
}

/**
 * Generates deterministic bar widths for clean SVG barcode label rendering (no external library).
 */
export function buildDeterministicBarcodeBars(code: string): Array<{ x: number; w: number }> {
  const safe = (code || '000000').trim() || '000000';
  const bars: Array<{ x: number; w: number }> = [];
  let x = 2;
  // Start guard
  bars.push({ x, w: 2 });
  x += 4;
  bars.push({ x, w: 1 });
  x += 3;

  for (let i = 0; i < safe.length; i++) {
    const ch = safe.charCodeAt(i);
    const b1 = (ch % 3) + 1;
    const gap1 = ((ch >> 2) % 2) + 1;
    const b2 = ((ch >> 3) % 3) + 1;
    const gap2 = ((ch >> 5) % 2) + 1;
    bars.push({ x, w: b1 });
    x += b1 + gap1;
    bars.push({ x, w: b2 });
    x += b2 + gap2;
  }

  // Stop guard
  bars.push({ x, w: 1 });
  x += 3;
  bars.push({ x, w: 2 });
  return bars;
}

export function formatCentimesDzd(centimes: number): string {
  return `${centimesToDzd(centimes).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DA`;
}

export function toCentimesSafe(amountDzd: number): number {
  return dzdToCentimes(amountDzd);
}
