import { centimesToDzd, dzdToCentimes, roundHalfAwayFromZero } from './money';
import type {
  PosCustomerCreditEntry,
  PosFloorTable,
  PosKitchenOrder,
  PosKitchenOrderDelta,
  PosKitchenOrderItem,
  PosOpticalPrescription,
  PosSelectedModifier,
  PosSubRole,
  Product,
  ProductRecipeIngredient,
  ProductVariant,
  WmsNegativeStockPolicy,
  WmsStockLot,
} from '../types/index';

export function buildPosLineKey(params: {
  productId: string;
  variantId?: string;
  modifiers?: PosSelectedModifier[];
  pluCode?: string;
}): string {
  const modPart = [...(params.modifiers || [])]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join(',');
  return [
    params.productId,
    params.variantId || 'base',
    modPart || 'nomod',
    params.pluCode || 'std',
  ].join('::');
}

/**
 * Snapshots price + variant + selected modifiers at the moment an order line is created/sent
 * so subsequent catalog edits never retroactively mutate historical or in-flight kitchen tickets.
 */
export function snapshotPosOrderLine(params: {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  modifiers?: PosSelectedModifier[];
  weightKg?: number;
  notes?: string;
}): PosKitchenOrderItem {
  const { product, variant } = params;
  const modifiers = (params.modifiers || []).map((m) => ({ ...m }));
  const baseUnitPriceDzd =
    variant && variant.priceDzd != null ? Number(variant.priceDzd) : Number(product.price?.amount || 0);
  const modifiersUnitDeltaDzd = modifiers.reduce((sum, m) => sum + Number(m.priceDeltaDzd || 0), 0);
  const unitPriceDzd = Math.max(
    0,
    centimesToDzd(dzdToCentimes(baseUnitPriceDzd) + dzdToCentimes(modifiersUnitDeltaDzd))
  );
  const effectiveQty =
    params.weightKg != null && params.weightKg > 0 ? Number(params.weightKg) : Math.max(0.001, Number(params.quantity || 1));
  const lineTotalDzd = centimesToDzd(roundHalfAwayFromZero(dzdToCentimes(unitPriceDzd) * effectiveQty));

  return {
    lineKey: buildPosLineKey({
      productId: product.id,
      variantId: variant?.id,
      modifiers,
      pluCode: product.pluCode,
    }),
    productId: product.id,
    productName: product.name,
    quantity: effectiveQty,
    baseUnitPriceDzd,
    modifiersUnitDeltaDzd,
    unitPriceDzd,
    lineTotalDzd,
    variantId: variant?.id,
    variantLabel: variant?.label,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
    weightKg: params.weightKg,
    pluCode: product.pluCode,
    notes: params.notes,
  };
}

/**
 * Computes explicit kitchen delta items comparing next order lines against the last sent kitchen snapshot.
 */
export function computeKitchenOrderDelta(params: {
  previousSnapshot: PosKitchenOrderItem[];
  nextItems: PosKitchenOrderItem[];
}): {
  deltas: PosKitchenOrderDelta[];
  hasChanges: boolean;
} {
  const prevMap = new Map<string, PosKitchenOrderItem>();
  for (const item of params.previousSnapshot) {
    const existing = prevMap.get(item.lineKey);
    if (existing) {
      prevMap.set(item.lineKey, { ...existing, quantity: existing.quantity + item.quantity });
    } else {
      prevMap.set(item.lineKey, { ...item });
    }
  }

  const nextMap = new Map<string, PosKitchenOrderItem>();
  for (const item of params.nextItems) {
    const existing = nextMap.get(item.lineKey);
    if (existing) {
      nextMap.set(item.lineKey, { ...existing, quantity: existing.quantity + item.quantity });
    } else {
      nextMap.set(item.lineKey, { ...item });
    }
  }

  const deltas: PosKitchenOrderDelta[] = [];

  for (const [key, nextItem] of nextMap.entries()) {
    const prevItem = prevMap.get(key);
    const modSummary = (nextItem.modifiers || []).map((m) => m.optionName).join(', ') || undefined;
    if (!prevItem) {
      deltas.push({
        lineKey: key,
        productId: nextItem.productId,
        productName: nextItem.productName,
        changeType: 'added',
        previousQty: 0,
        newQty: nextItem.quantity,
        deltaQty: nextItem.quantity,
        variantLabel: nextItem.variantLabel,
        modifiersSummary: modSummary,
      });
    } else if (Math.abs(nextItem.quantity - prevItem.quantity) > 1e-6) {
      const diff = Number((nextItem.quantity - prevItem.quantity).toFixed(4));
      deltas.push({
        lineKey: key,
        productId: nextItem.productId,
        productName: nextItem.productName,
        changeType: diff > 0 ? 'increased' : 'decreased',
        previousQty: prevItem.quantity,
        newQty: nextItem.quantity,
        deltaQty: diff,
        variantLabel: nextItem.variantLabel,
        modifiersSummary: modSummary,
      });
    }
  }

  for (const [key, prevItem] of prevMap.entries()) {
    if (!nextMap.has(key)) {
      const modSummary = (prevItem.modifiers || []).map((m) => m.optionName).join(', ') || undefined;
      deltas.push({
        lineKey: key,
        productId: prevItem.productId,
        productName: prevItem.productName,
        changeType: 'removed',
        previousQty: prevItem.quantity,
        newQty: 0,
        deltaQty: -prevItem.quantity,
        variantLabel: prevItem.variantLabel,
        modifiersSummary: modSummary,
      });
    }
  }

  return {
    deltas,
    hasChanges: deltas.length > 0,
  };
}

/**
 * Computes raw ingredient BOM consumption deltas.
 * Positive `deltaQty` depletes ingredient stock; negative `deltaQty` restores ingredient stock.
 */
export function computeRecipeIngredientDeltas(params: {
  products: Product[];
  lineDeltas: Array<{ productId: string; deltaQty: number }>;
}): Array<{
  ingredientProductId: string;
  ingredientName: string;
  deltaQuantity: number;
  unit: string;
}> {
  const byProduct = new Map(params.products.map((p) => [p.id, p]));
  const aggregated = new Map<
    string,
    { ingredientProductId: string; ingredientName: string; deltaQuantity: number; unit: string }
  >();

  for (const line of params.lineDeltas) {
    if (!line.deltaQty || Math.abs(line.deltaQty) < 1e-6) continue;
    const prod = byProduct.get(line.productId);
    const bom: ProductRecipeIngredient[] = Array.isArray(prod?.recipeBom) ? prod!.recipeBom : [];
    for (const ing of bom) {
      if (!ing.ingredientProductId || ing.quantityPerUnit <= 0) continue;
      const qtyChange = Number((ing.quantityPerUnit * line.deltaQty).toFixed(4));
      const existing = aggregated.get(ing.ingredientProductId);
      if (existing) {
        existing.deltaQuantity = Number((existing.deltaQuantity + qtyChange).toFixed(4));
      } else {
        aggregated.set(ing.ingredientProductId, {
          ingredientProductId: ing.ingredientProductId,
          ingredientName: ing.ingredientName,
          deltaQuantity: qtyChange,
          unit: ing.unit || 'pcs',
        });
      }
    }
  }

  return Array.from(aggregated.values()).filter((entry) => Math.abs(entry.deltaQuantity) > 1e-6);
}

export function getEffectiveProductOrVariantStock(product: Product, variantId?: string): number {
  if (variantId && Array.isArray(product.variants)) {
    const found = product.variants.find((v) => v.id === variantId);
    if (found) return Number(found.stockQuantity || 0);
  }
  return Number(product.stockQuantity || 0);
}

export function evaluatePosVariantAndStock(params: {
  product: Product;
  variantId?: string;
  requestedQty: number;
  alreadyInCartQty?: number;
  negativeStockPolicy: WmsNegativeStockPolicy;
}): {
  allowed: boolean;
  warning: boolean;
  reason?: 'PRODUCT_INACTIVE' | 'VARIANT_INACTIVE' | 'INSUFFICIENT_STOCK';
  availableQty: number;
  shortfallQty: number;
} {
  const { product, variantId, requestedQty, negativeStockPolicy } = params;
  const alreadyQty = Number(params.alreadyInCartQty || 0);

  if (!product.isActive) {
    return { allowed: false, warning: false, reason: 'PRODUCT_INACTIVE', availableQty: 0, shortfallQty: requestedQty };
  }

  if (variantId && Array.isArray(product.variants)) {
    const v = product.variants.find((item) => item.id === variantId);
    if (v && !v.isActive) {
      return { allowed: false, warning: false, reason: 'VARIANT_INACTIVE', availableQty: 0, shortfallQty: requestedQty };
    }
  }

  // Made-to-order recipe dishes without direct shelf stock pass through unless explicit shelf tracking exists
  const hasRecipeOnly = Array.isArray(product.recipeBom) && product.recipeBom.length > 0 && product.stockQuantity <= 0 && !variantId;
  if (hasRecipeOnly) {
    return { allowed: true, warning: false, availableQty: 9999, shortfallQty: 0 };
  }

  const availableQty = getEffectiveProductOrVariantStock(product, variantId);
  const totalWanted = alreadyQty + requestedQty;
  const shortfallQty = Math.max(0, Number((totalWanted - availableQty).toFixed(4)));

  if (shortfallQty <= 0) {
    return { allowed: true, warning: false, availableQty, shortfallQty: 0 };
  }

  if (negativeStockPolicy === 'block') {
    return {
      allowed: false,
      warning: false,
      reason: 'INSUFFICIENT_STOCK',
      availableQty,
      shortfallQty,
    };
  }

  return {
    allowed: true,
    warning: negativeStockPolicy === 'warn',
    reason: 'INSUFFICIENT_STOCK',
    availableQty,
    shortfallQty,
  };
}

export function validateTableTransfer(params: {
  order: PosKitchenOrder;
  targetTable: PosFloorTable;
  allOrders?: PosKitchenOrder[];
}): { valid: boolean; reason?: 'ORDER_CLOSED' | 'SAME_TABLE' | 'TARGET_TABLE_OCCUPIED' } {
  const { order, targetTable, allOrders = [] } = params;
  if (order.kdsStatus === 'settled' || order.kdsStatus === 'voided') {
    return { valid: false, reason: 'ORDER_CLOSED' };
  }
  if (order.tableId && order.tableId === targetTable.id) {
    return { valid: false, reason: 'SAME_TABLE' };
  }

  const activeOccupier = allOrders.find(
    (o) =>
      o.id !== order.id &&
      o.tableId === targetTable.id &&
      o.kdsStatus !== 'settled' &&
      o.kdsStatus !== 'voided'
  );
  if (
    activeOccupier ||
    (targetTable.status === 'occupied' && targetTable.currentOrderId && targetTable.currentOrderId !== order.id)
  ) {
    return { valid: false, reason: 'TARGET_TABLE_OCCUPIED' };
  }

  return { valid: true };
}

export interface SplitBillShareInput {
  id: string;
  label: string;
  paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Credit';
  customAmountDzd?: number;
  itemTotalDzd?: number;
}

export interface SplitBillComputedShare {
  id: string;
  label: string;
  paymentMethod: 'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Credit';
  amountCentimes: number;
  amountDzd: number;
}

/**
 * Splits a POS bill + optional tip across N diners/methods in integer centimes with exact remainder conservation.
 */
export function computeSplitBillShares(params: {
  billSubtotalDzd: number;
  discountDzd?: number;
  taxDzd?: number;
  deliveryFeeDzd?: number;
  tipDzd?: number;
  mode: 'equal' | 'by_items' | 'custom';
  splitCount?: number;
  shares?: SplitBillShareInput[];
}): {
  totalPayableCentimes: number;
  totalPayableDzd: number;
  tipCentimes: number;
  shares: SplitBillComputedShare[];
  isBalanced: boolean;
  differenceCentimes: number;
} {
  const baseCentimes = Math.max(
    0,
    dzdToCentimes(params.billSubtotalDzd) -
      dzdToCentimes(params.discountDzd || 0) +
      dzdToCentimes(params.taxDzd || 0) +
      dzdToCentimes(params.deliveryFeeDzd || 0)
  );
  const tipCentimes = Math.max(0, dzdToCentimes(params.tipDzd || 0));
  const totalPayableCentimes = baseCentimes + tipCentimes;

  const computed: SplitBillComputedShare[] = [];

  if (params.mode === 'equal') {
    const count = Math.max(1, Math.min(20, Math.round(params.splitCount || params.shares?.length || 2)));
    const floorEach = Math.floor(totalPayableCentimes / count);
    let remainder = totalPayableCentimes - floorEach * count;

    for (let i = 0; i < count; i++) {
      const shareTemplate = params.shares?.[i];
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      const amtCentimes = floorEach + extra;
      computed.push({
        id: shareTemplate?.id || `split_${i + 1}`,
        label: shareTemplate?.label || `Guest ${i + 1}`,
        paymentMethod: shareTemplate?.paymentMethod || 'Cash',
        amountCentimes: amtCentimes,
        amountDzd: centimesToDzd(amtCentimes),
      });
    }
  } else if (params.mode === 'by_items') {
    const inputShares = params.shares || [];
    const itemSumCentimes = inputShares.reduce((s, sh) => s + Math.max(0, dzdToCentimes(sh.itemTotalDzd || 0)), 0);
    let allocatedTip = 0;

    inputShares.forEach((sh, idx) => {
      const itemCentimes = Math.max(0, dzdToCentimes(sh.itemTotalDzd || 0));
      let tipShare = 0;
      if (tipCentimes > 0) {
        if (idx === inputShares.length - 1) {
          tipShare = Math.max(0, tipCentimes - allocatedTip);
        } else if (itemSumCentimes > 0) {
          tipShare = Math.round((tipCentimes * itemCentimes) / itemSumCentimes);
          allocatedTip += tipShare;
        }
      }
      const totalShareCentimes = itemCentimes + tipShare;
      computed.push({
        id: sh.id,
        label: sh.label,
        paymentMethod: sh.paymentMethod,
        amountCentimes: totalShareCentimes,
        amountDzd: centimesToDzd(totalShareCentimes),
      });
    });
  } else {
    for (const sh of params.shares || []) {
      const amt = Math.max(0, dzdToCentimes(sh.customAmountDzd || 0));
      computed.push({
        id: sh.id,
        label: sh.label,
        paymentMethod: sh.paymentMethod,
        amountCentimes: amt,
        amountDzd: centimesToDzd(amt),
      });
    }
  }

  const allocatedTotal = computed.reduce((s, c) => s + c.amountCentimes, 0);
  const differenceCentimes = totalPayableCentimes - allocatedTotal;

  return {
    totalPayableCentimes,
    totalPayableDzd: centimesToDzd(totalPayableCentimes),
    tipCentimes,
    shares: computed,
    isBalanced: computed.length > 0 && differenceCentimes === 0,
    differenceCentimes,
  };
}

export interface ParsedScaleScan {
  matched: boolean;
  mode: 'scale_weight_ean13' | 'scale_price_ean13' | 'plu_multiplier' | 'none';
  pluCode?: string;
  weightKg?: number;
  priceDzd?: number;
}

/**
 * Parses retail scale EAN-13 barcodes (`20`-`24` weight-embedded, `25`-`29` price-embedded)
 * or direct manual `PLU*WEIGHT` strings (e.g. `104*1.35`).
 */
export function parseScaleBarcodeOrPlu(rawInput: string): ParsedScaleScan {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return { matched: false, mode: 'none' };

  const starMatch = trimmed.match(/^([A-Za-z0-9]{1,12})\*(\d+(?:[.,]\d+)?)$/);
  if (starMatch) {
    const weight = Number(starMatch[2].replace(',', '.'));
    if (Number.isFinite(weight) && weight > 0) {
      return {
        matched: true,
        mode: 'plu_multiplier',
        pluCode: starMatch[1],
        weightKg: Number(weight.toFixed(3)),
      };
    }
  }

  if (/^\d{13}$/.test(trimmed)) {
    const prefix = Number(trimmed.slice(0, 2));
    const plu = trimmed.slice(2, 7);
    const valDigits = Number(trimmed.slice(7, 12));
    if (prefix >= 20 && prefix <= 24) {
      const weightKg = Number((valDigits / 1000).toFixed(3));
      if (weightKg > 0) {
        return {
          matched: true,
          mode: 'scale_weight_ean13',
          pluCode: plu,
          weightKg,
        };
      }
    }
    if (prefix >= 25 && prefix <= 29) {
      const priceDzd = Number(valDigits.toFixed(2));
      if (priceDzd > 0) {
        return {
          matched: true,
          mode: 'scale_price_ean13',
          pluCode: plu,
          priceDzd,
        };
      }
    }
  }

  return { matched: false, mode: 'none' };
}

export function classifyProductExpiry(params: {
  product: Product;
  lots?: WmsStockLot[];
  todayIso?: string;
  warningDays?: number;
}): {
  status: 'expired' | 'expiring_soon' | 'ok' | 'none';
  earliestExpiryDate?: string;
  daysRemaining?: number;
} {
  const todayIso = (params.todayIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const warnDays = params.warningDays ?? 30;
  const candidateDates: string[] = [];

  if (params.product.expiryDate) {
    candidateDates.push(params.product.expiryDate.slice(0, 10));
  }
  for (const lot of params.lots || []) {
    if (lot.productId === params.product.id && lot.qtyOnHand > 0 && lot.expiryDate && lot.recallStatus === 'active') {
      candidateDates.push(lot.expiryDate.slice(0, 10));
    }
  }

  if (candidateDates.length === 0) {
    return { status: 'none' };
  }

  candidateDates.sort();
  const earliest = candidateDates[0];
  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  const expMs = Date.parse(`${earliest}T00:00:00Z`);
  const daysRemaining = Math.round((expMs - todayMs) / 86_400_000);

  if (daysRemaining < 0) {
    return { status: 'expired', earliestExpiryDate: earliest, daysRemaining };
  }
  if (daysRemaining <= warnDays) {
    return { status: 'expiring_soon', earliestExpiryDate: earliest, daysRemaining };
  }
  return { status: 'ok', earliestExpiryDate: earliest, daysRemaining };
}

export interface CustomerCarnetSummary {
  customerKey: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  totalChargedCentimes: number;
  totalRepaidCentimes: number;
  currentBalanceCentimes: number;
  currentBalanceDzd: number;
  creditLimitCentimes: number;
  creditLimitDzd: number;
  overLimit: boolean;
  entryCount: number;
  lastActivityAt?: string;
}

export function summarizeCustomerCarnetBalance(
  entries: PosCustomerCreditEntry[]
): CustomerCarnetSummary[] {
  const grouped = new Map<string, CustomerCarnetSummary>();

  for (const entry of entries) {
    const key = entry.customerId || entry.customerName.trim().toLowerCase();
    const existing = grouped.get(key) || {
      customerKey: key,
      customerId: entry.customerId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      totalChargedCentimes: 0,
      totalRepaidCentimes: 0,
      currentBalanceCentimes: 0,
      currentBalanceDzd: 0,
      creditLimitCentimes: entry.creditLimitCentimes || 5_000_000,
      creditLimitDzd: centimesToDzd(entry.creditLimitCentimes || 5_000_000),
      overLimit: false,
      entryCount: 0,
      lastActivityAt: entry.occurredAt,
    };

    if (entry.entryType === 'repayment') {
      existing.totalRepaidCentimes += Math.max(0, entry.amountCentimes || 0);
      existing.currentBalanceCentimes -= Math.max(0, entry.amountCentimes || 0);
    } else if (entry.entryType === 'charge') {
      existing.totalChargedCentimes += Math.max(0, entry.amountCentimes || 0);
      existing.currentBalanceCentimes += Math.max(0, entry.amountCentimes || 0);
    } else {
      existing.currentBalanceCentimes += entry.amountCentimes || 0;
    }

    if (entry.creditLimitCentimes > 0) {
      existing.creditLimitCentimes = entry.creditLimitCentimes;
      existing.creditLimitDzd = centimesToDzd(entry.creditLimitCentimes);
    }
    if (!existing.customerPhone && entry.customerPhone) {
      existing.customerPhone = entry.customerPhone;
    }
    if (!existing.lastActivityAt || entry.occurredAt > existing.lastActivityAt) {
      existing.lastActivityAt = entry.occurredAt;
    }
    existing.entryCount += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((summary) => {
      const clampedBal = Math.max(0, summary.currentBalanceCentimes);
      return {
        ...summary,
        currentBalanceCentimes: clampedBal,
        currentBalanceDzd: centimesToDzd(clampedBal),
        overLimit: summary.creditLimitCentimes > 0 && clampedBal > summary.creditLimitCentimes,
      };
    })
    .sort((a, b) => b.currentBalanceCentimes - a.currentBalanceCentimes);
}

export function validateOpticalPrescription(
  rx: Partial<PosOpticalPrescription>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!rx.customerName || !rx.customerName.trim()) {
    errors.push('CUSTOMER_NAME_REQUIRED');
  }
  const checkAxis = (val: number | undefined, eye: string) => {
    if (val != null && (!Number.isFinite(val) || val < 0 || val > 180)) {
      errors.push(`${eye}_AXIS_OUT_OF_RANGE`);
    }
  };
  const checkSphere = (val: number | undefined, eye: string) => {
    if (val != null && (!Number.isFinite(val) || val < -25 || val > 25)) {
      errors.push(`${eye}_SPHERE_OUT_OF_RANGE`);
    }
  };
  checkAxis(rx.odAxis, 'OD');
  checkAxis(rx.osAxis, 'OS');
  checkSphere(rx.odSphere, 'OD');
  checkSphere(rx.osSphere, 'OS');
  if (rx.pdMm != null && (!Number.isFinite(rx.pdMm) || rx.pdMm < 40 || rx.pdMm > 85)) {
    errors.push('PD_MM_OUT_OF_RANGE');
  }
  return { valid: errors.length === 0, errors };
}

export type PosOperationalAction =
  | 'take_order'
  | 'send_to_kitchen'
  | 'transfer_table'
  | 'advance_kds_status'
  | 'collect_payment'
  | 'record_carnet'
  | 'void_order';

export function canPerformPosActionBySubRole(
  subRole: PosSubRole,
  action: PosOperationalAction,
  pinVerified = false
): { allowed: boolean; requiresPin: boolean; reason?: string } {
  if (action === 'void_order') {
    if (!pinVerified) {
      return { allowed: false, requiresPin: true, reason: 'MANAGER_PIN_REQUIRED' };
    }
    return { allowed: true, requiresPin: true };
  }

  if (subRole === 'cashier') {
    return { allowed: true, requiresPin: false };
  }

  if (subRole === 'waiter') {
    const ok = action === 'take_order' || action === 'send_to_kitchen' || action === 'transfer_table';
    return ok
      ? { allowed: true, requiresPin: false }
      : { allowed: false, requiresPin: false, reason: 'WAITER_ROLE_RESTRICTED' };
  }

  // Kitchen sub-role
  const ok = action === 'advance_kds_status';
  return ok
    ? { allowed: true, requiresPin: false }
    : { allowed: false, requiresPin: false, reason: 'KITCHEN_ROLE_RESTRICTED' };
}
