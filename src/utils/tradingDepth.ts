import type {
  B2bClient,
  CommercialDocItem,
  CommercialDocType,
  CommercialDocument,
  Product,
  StaffMember,
  StockMovementVoucher,
  TradingDeliveryRound,
  TradingDeliveryStop,
  TradingPriceList,
  TradingPriceTier,
} from '../types/index';
import {
  addCentimes,
  centimesToDzd,
  dzdToCentimes,
  roundHalfAwayFromZero,
} from './money';
import { calculateCommercialTotals } from './rules';
import { absorbRoundingOrFxDelta, type ScfPostingDraft } from './scfAccountingEngine';

const CREDIT_BLOCKING_DOC_TYPES: CommercialDocType[] = ['commande', 'bl', 'facture'];
const MANAGER_OVERRIDE_ROLES = new Set([
  'owner',
  'manager',
  'admin',
  'director',
  'gerant',
  'agencydirector',
  'super_admin',
]);

// ============================================================================
// 1. Client Price Tiers & Effective-Dated Price Lists
// ============================================================================

export interface ResolvedTierPriceResult {
  unitPriceHt: number;
  discountPercent: number;
  matchedPriceListId?: string;
  matchedPriceListName?: string;
  matchedTier?: TradingPriceTier;
  effectiveFrom?: string;
  isTierApplied: boolean;
}

export function resolveClientTierPrice(params: {
  priceLists: TradingPriceList[];
  clientTier?: TradingPriceTier;
  productId?: string;
  docDate?: string;
  qty?: number;
  fallbackUnitPriceHt: number;
  fallbackDiscountPercent?: number;
}): ResolvedTierPriceResult {
  const {
    priceLists,
    clientTier = 'standard',
    productId,
    docDate = new Date().toISOString().slice(0, 10),
    qty = 1,
    fallbackUnitPriceHt,
    fallbackDiscountPercent = 0,
  } = params;

  if (!productId || !Array.isArray(priceLists) || priceLists.length === 0) {
    return {
      unitPriceHt: fallbackUnitPriceHt,
      discountPercent: fallbackDiscountPercent,
      isTierApplied: false,
    };
  }

  const normalizedDate = docDate.slice(0, 10);
  const matchingLists = priceLists
    .filter((pl) => {
      if (!pl.isActive) return false;
      if ((pl.tier || 'standard') !== clientTier) return false;
      const from = (pl.effectiveFrom || '').slice(0, 10);
      const to = pl.effectiveTo ? pl.effectiveTo.slice(0, 10) : '';
      if (from && normalizedDate < from) return false;
      if (to && normalizedDate > to) return false;
      return (pl.items || []).some((it) => it.productId === productId);
    })
    .sort((a, b) => (b.effectiveFrom || '').localeCompare(a.effectiveFrom || ''));

  for (const list of matchingLists) {
    const candidates = (list.items || [])
      .filter((it) => it.productId === productId && (it.minQty == null || qty >= it.minQty))
      .sort((a, b) => (b.minQty || 0) - (a.minQty || 0));

    if (candidates.length > 0) {
      const chosen = candidates[0];
      return {
        unitPriceHt: Number(chosen.unitPriceHt),
        discountPercent:
          chosen.discountPercent != null ? Number(chosen.discountPercent) : fallbackDiscountPercent,
        matchedPriceListId: list.id,
        matchedPriceListName: list.name,
        matchedTier: list.tier,
        effectiveFrom: list.effectiveFrom,
        isTierApplied: true,
      };
    }
  }

  return {
    unitPriceHt: fallbackUnitPriceHt,
    discountPercent: fallbackDiscountPercent,
    isTierApplied: false,
  };
}

// ============================================================================
// 2. Hard Credit Limit Enforcement + Manager PIN Override
// ============================================================================

export interface ManagerPinOverrideValidation {
  valid: boolean;
  staffId?: string;
  staffName?: string;
  reason?: string;
  errorCode?: 'MISSING_REASON' | 'INVALID_PIN' | 'NOT_AUTHORIZED_ROLE';
}

export function verifyManagerPinOverride(params: {
  staffList: StaffMember[];
  pinCode?: string;
  reason?: string;
  businessId?: string;
  branchId?: string;
}): ManagerPinOverrideValidation {
  const cleanReason = (params.reason || '').trim();
  if (cleanReason.length < 3) {
    return { valid: false, errorCode: 'MISSING_REASON' };
  }
  const cleanPin = (params.pinCode || '').trim();
  if (!cleanPin) {
    return { valid: false, errorCode: 'INVALID_PIN' };
  }

  const scopedStaff = (params.staffList || []).filter((s) => {
    if (s.status && s.status !== 'active') return false;
    if (params.businessId && s.businessId && s.businessId !== params.businessId) return false;
    if (params.branchId && s.branchId && s.branchId !== params.branchId) return false;
    return true;
  });

  const pinMatched = scopedStaff.filter((s) => (s.pinCode || '').trim() === cleanPin);
  if (pinMatched.length === 0) {
    return { valid: false, errorCode: 'INVALID_PIN' };
  }

  const authorized = pinMatched.find((s) =>
    MANAGER_OVERRIDE_ROLES.has(String(s.role || '').toLowerCase().trim())
  );
  if (!authorized) {
    return { valid: false, errorCode: 'NOT_AUTHORIZED_ROLE' };
  }

  return {
    valid: true,
    staffId: authorized.id,
    staffName: authorized.fullName || 'Manager',
    reason: cleanReason,
  };
}

export interface CreditExposureEvaluation {
  creditLimitDzd: number;
  currentBalanceDzd: number;
  openOrdersExposureDzd: number;
  proposedDocDzd: number;
  projectedExposureDzd: number;
  excessDzd: number;
  exceedsLimit: boolean;
  blocked: boolean;
  overrideApplied: boolean;
  overrideStaffId?: string;
  overrideStaffName?: string;
  overrideReason?: string;
  errorCode?: 'CREDIT_LIMIT_EXCEEDED' | 'MISSING_REASON' | 'INVALID_PIN' | 'NOT_AUTHORIZED_ROLE';
}

export function evaluateClientCreditExposure(params: {
  client?: B2bClient | null;
  docType: CommercialDocType;
  newDocTotalDzd: number;
  newStatus?: CommercialDocument['status'];
  existingDocs: CommercialDocument[];
  excludeDocId?: string;
  staffList?: StaffMember[];
  managerPin?: string;
  overrideReason?: string;
  existingOverride?: {
    staffId?: string;
    staffName?: string;
    reason?: string;
    previousTotalDzd?: number;
  };
}): CreditExposureEvaluation {
  const {
    client,
    docType,
    newDocTotalDzd,
    newStatus = 'Validated',
    existingDocs,
    excludeDocId,
    staffList = [],
    managerPin,
    overrideReason,
    existingOverride,
  } = params;

  const limitCentimes = dzdToCentimes(Math.max(0, Number(client?.creditLimit || 0)));
  const currentBalanceCentimes = dzdToCentimes(Math.max(0, Number(client?.outstandingBalance || 0)));
  const proposedCentimes = dzdToCentimes(Math.max(0, Number(newDocTotalDzd || 0)));

  const isExempt =
    !client ||
    limitCentimes <= 0 ||
    !CREDIT_BLOCKING_DOC_TYPES.includes(docType) ||
    newStatus === 'Canceled' ||
    newStatus === 'Paid';

  // Open orders / unbilled BLs count toward pending credit commitment unless excluded
  const openOrdersCentimes = (existingDocs || [])
    .filter((d) => {
      if (!client || d.clientId !== client.id) return false;
      if (excludeDocId && d.id === excludeDocId) return false;
      if (d.status === 'Canceled' || d.status === 'Paid' || d.status === 'Draft') return false;
      return d.type === 'commande' || d.type === 'bl';
    })
    .reduce((sum, d) => addCentimes(sum, dzdToCentimes(Number(d.netToPay || d.totalTtc || 0))), 0);

  const projectedCentimes = addCentimes(currentBalanceCentimes, openOrdersCentimes, proposedCentimes);
  const excessCentimes = Math.max(0, projectedCentimes - limitCentimes);

  if (isExempt || excessCentimes === 0) {
    return {
      creditLimitDzd: centimesToDzd(limitCentimes),
      currentBalanceDzd: centimesToDzd(currentBalanceCentimes),
      openOrdersExposureDzd: centimesToDzd(openOrdersCentimes),
      proposedDocDzd: centimesToDzd(proposedCentimes),
      projectedExposureDzd: centimesToDzd(projectedCentimes),
      excessDzd: 0,
      exceedsLimit: false,
      blocked: false,
      overrideApplied: false,
    };
  }

  // If editing an existing overridden doc without increasing its total, keep prior override
  if (
    excludeDocId &&
    existingOverride?.staffId &&
    existingOverride?.reason &&
    existingOverride.previousTotalDzd != null &&
    proposedCentimes <= dzdToCentimes(existingOverride.previousTotalDzd) &&
    !managerPin
  ) {
    return {
      creditLimitDzd: centimesToDzd(limitCentimes),
      currentBalanceDzd: centimesToDzd(currentBalanceCentimes),
      openOrdersExposureDzd: centimesToDzd(openOrdersCentimes),
      proposedDocDzd: centimesToDzd(proposedCentimes),
      projectedExposureDzd: centimesToDzd(projectedCentimes),
      excessDzd: centimesToDzd(excessCentimes),
      exceedsLimit: true,
      blocked: false,
      overrideApplied: true,
      overrideStaffId: existingOverride.staffId,
      overrideStaffName: existingOverride.staffName,
      overrideReason: existingOverride.reason,
    };
  }

  if (managerPin || overrideReason) {
    const check = verifyManagerPinOverride({
      staffList,
      pinCode: managerPin,
      reason: overrideReason,
      businessId: client?.businessId,
      branchId: client?.branchId,
    });
    if (check.valid) {
      return {
        creditLimitDzd: centimesToDzd(limitCentimes),
        currentBalanceDzd: centimesToDzd(currentBalanceCentimes),
        openOrdersExposureDzd: centimesToDzd(openOrdersCentimes),
        proposedDocDzd: centimesToDzd(proposedCentimes),
        projectedExposureDzd: centimesToDzd(projectedCentimes),
        excessDzd: centimesToDzd(excessCentimes),
        exceedsLimit: true,
        blocked: false,
        overrideApplied: true,
        overrideStaffId: check.staffId,
        overrideStaffName: check.staffName,
        overrideReason: check.reason,
      };
    }

    return {
      creditLimitDzd: centimesToDzd(limitCentimes),
      currentBalanceDzd: centimesToDzd(currentBalanceCentimes),
      openOrdersExposureDzd: centimesToDzd(openOrdersCentimes),
      proposedDocDzd: centimesToDzd(proposedCentimes),
      projectedExposureDzd: centimesToDzd(projectedCentimes),
      excessDzd: centimesToDzd(excessCentimes),
      exceedsLimit: true,
      blocked: true,
      overrideApplied: false,
      errorCode: check.errorCode,
    };
  }

  return {
    creditLimitDzd: centimesToDzd(limitCentimes),
    currentBalanceDzd: centimesToDzd(currentBalanceCentimes),
    openOrdersExposureDzd: centimesToDzd(openOrdersCentimes),
    proposedDocDzd: centimesToDzd(proposedCentimes),
    projectedExposureDzd: centimesToDzd(projectedCentimes),
    excessDzd: centimesToDzd(excessCentimes),
    exceedsLimit: true,
    blocked: true,
    overrideApplied: false,
    errorCode: 'CREDIT_LIMIT_EXCEEDED',
  };
}

// ============================================================================
// 3. Partial BL -> Facture / Devis -> BL Conversion
// ============================================================================

export interface ConvertibleLineInfo {
  item: CommercialDocItem;
  alreadyConvertedQty: number;
  remainingQty: number;
}

export function computeRemainingConvertibleItems(params: {
  sourceDoc: CommercialDocument;
  targetType: CommercialDocType;
}): ConvertibleLineInfo[] {
  const { sourceDoc, targetType } = params;
  return (sourceDoc.items || []).map((item) => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const already = Math.max(
      0,
      Number(
        item.convertedQty ??
          (targetType === 'facture' ? item.invoicedQty : item.deliveredQty) ??
          0
      )
    );
    return {
      item,
      alreadyConvertedQty: Math.min(qty, already),
      remainingQty: Math.max(0, qty - already),
    };
  });
}

export interface PartialDocConversionResult {
  ok: boolean;
  errorCode?: 'NO_CONVERTIBLE_LINES' | 'EXCEEDS_REMAINING_QTY';
  updatedSourceItems: CommercialDocItem[];
  updatedSourceStatus: CommercialDocument['status'];
  childItems: CommercialDocItem[];
  totals: ReturnType<typeof calculateCommercialTotals>;
}

export function applyPartialDocConversion(params: {
  sourceDoc: CommercialDocument;
  targetType: CommercialDocType;
  lineQuantities?: Record<string, number>;
}): PartialDocConversionResult {
  const { sourceDoc, targetType, lineQuantities } = params;
  const convertible = computeRemainingConvertibleItems({ sourceDoc, targetType });
  const childItems: CommercialDocItem[] = [];
  const updatedSourceItems: CommercialDocItem[] = [];
  let hasRemaining = false;

  for (const row of convertible) {
    const { item, alreadyConvertedQty, remainingQty } = row;
    const requested =
      lineQuantities && Object.prototype.hasOwnProperty.call(lineQuantities, item.id)
        ? Math.max(0, Number(lineQuantities[item.id] || 0))
        : remainingQty;

    if (requested > remainingQty + 1e-6) {
      return {
        ok: false,
        errorCode: 'EXCEEDS_REMAINING_QTY',
        updatedSourceItems: sourceDoc.items,
        updatedSourceStatus: sourceDoc.status,
        childItems: [],
        totals: calculateCommercialTotals({ items: [] }),
      };
    }

    const nextConverted = alreadyConvertedQty + requested;
    if (nextConverted < item.quantity - 1e-6) {
      hasRemaining = true;
    }

    updatedSourceItems.push({
      ...item,
      convertedQty: nextConverted,
      ...(targetType === 'facture'
        ? { invoicedQty: nextConverted }
        : { deliveredQty: nextConverted }),
    });

    if (requested > 0) {
      const lineHt =
        Math.round(requested * Number(item.unitPriceHt || 0) * (1 - Number(item.discountPercent || 0) / 100) * 100) /
        100;
      const lineTtc = Math.round(lineHt * (1 + Number(item.tvaPercent || 0) / 100) * 100) / 100;
      childItems.push({
        ...item,
        quantity: requested,
        convertedQty: 0,
        deliveredQty: 0,
        invoicedQty: 0,
        totalHt: lineHt,
        totalTtc: lineTtc,
      });
    }
  }

  if (childItems.length === 0) {
    return {
      ok: false,
      errorCode: 'NO_CONVERTIBLE_LINES',
      updatedSourceItems: sourceDoc.items,
      updatedSourceStatus: sourceDoc.status,
      childItems: [],
      totals: calculateCommercialTotals({ items: [] }),
    };
  }

  const totals = calculateCommercialTotals({
    items: childItems,
    generalDiscountPercent: sourceDoc.generalDiscountPercent || 0,
    guaranteeRetentionPercent:
      targetType === 'facture' ? sourceDoc.guaranteeRetentionPercent || 0 : 0,
    paymentMethod: sourceDoc.paymentMethod,
  });

  const updatedSourceStatus: CommercialDocument['status'] = hasRemaining
    ? 'Partial'
    : targetType === 'bl'
      ? 'Delivered'
      : 'Validated';

  return {
    ok: true,
    updatedSourceItems,
    updatedSourceStatus,
    childItems,
    totals,
  };
}

// ============================================================================
// 4. Avoir <= Linked Invoice Validation
// ============================================================================

export interface AvoirValidationResult {
  valid: boolean;
  parentInvoiceTotalDzd: number;
  priorAvoirsDzd: number;
  remainingCreditableDzd: number;
  requestedAvoirDzd: number;
  errorCode?: 'AVOIR_EXCEEDS_INVOICE' | 'PARENT_NOT_FOUND';
}

export function validateAvoirAgainstInvoice(params: {
  parentInvoice?: CommercialDocument | null;
  existingDocs: CommercialDocument[];
  newAvoirDocId?: string;
  newAvoirAmountTtcDzd: number;
}): AvoirValidationResult {
  const { parentInvoice, existingDocs, newAvoirDocId, newAvoirAmountTtcDzd } = params;
  const requestedCentimes = dzdToCentimes(Math.max(0, Number(newAvoirAmountTtcDzd || 0)));

  if (!parentInvoice) {
    return {
      valid: false,
      parentInvoiceTotalDzd: 0,
      priorAvoirsDzd: 0,
      remainingCreditableDzd: 0,
      requestedAvoirDzd: centimesToDzd(requestedCentimes),
      errorCode: 'PARENT_NOT_FOUND',
    };
  }

  const parentCentimes = dzdToCentimes(Math.max(0, Number(parentInvoice.totalTtc || 0)));
  const priorCentimes = (existingDocs || [])
    .filter((d) => {
      if (newAvoirDocId && d.id === newAvoirDocId) return false;
      if (d.status === 'Canceled') return false;
      return d.linkedDocId === parentInvoice.id && (d.type === 'avoir' || d.type === 'retour');
    })
    .reduce((sum, d) => addCentimes(sum, dzdToCentimes(Number(d.totalTtc || 0))), 0);

  const remainingCentimes = Math.max(0, parentCentimes - priorCentimes);
  const valid = requestedCentimes <= remainingCentimes;

  return {
    valid,
    parentInvoiceTotalDzd: centimesToDzd(parentCentimes),
    priorAvoirsDzd: centimesToDzd(priorCentimes),
    remainingCreditableDzd: centimesToDzd(remainingCentimes),
    requestedAvoirDzd: centimesToDzd(requestedCentimes),
    ...(valid ? {} : { errorCode: 'AVOIR_EXCEEDS_INVOICE' as const }),
  };
}

// ============================================================================
// 5. Per-Depot Stock Map & Voucher Availability Guard (BE / BS / BT)
// ============================================================================

export function getProductStockInDepot(
  product: Pick<Product, 'stockQuantity' | 'depotStockMap'>,
  depotId: string,
  defaultDepotId?: string
): number {
  const map = product.depotStockMap;
  if (map && Object.keys(map).length > 0) {
    return Math.max(0, Number(map[depotId] ?? 0));
  }
  if (!defaultDepotId || depotId === defaultDepotId) {
    return Math.max(0, Number(product.stockQuantity ?? 0));
  }
  return 0;
}

export interface DepotStockAvailabilityCheck {
  ok: boolean;
  errorCode?:
    | 'INVALID_TRANSFER_DEPOTS'
    | 'INSUFFICIENT_DEPOT_STOCK'
    | 'PRODUCT_NOT_FOUND'
    | 'EMPTY_ITEMS';
  shortages: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export function validateDepotVoucherAvailability(params: {
  voucherType: StockMovementVoucher['type'];
  depotSourceId: string;
  depotTargetId?: string;
  items: Array<{ productId: string; productName?: string; quantity: number }>;
  products: Product[];
  defaultDepotId?: string;
}): DepotStockAvailabilityCheck {
  const { voucherType, depotSourceId, depotTargetId, items, products, defaultDepotId } = params;
  if (!items || items.length === 0) {
    return { ok: false, errorCode: 'EMPTY_ITEMS', shortages: [] };
  }
  if (voucherType === 'transfert' && (!depotSourceId || !depotTargetId || depotSourceId === depotTargetId)) {
    return { ok: false, errorCode: 'INVALID_TRANSFER_DEPOTS', shortages: [] };
  }

  const shortages: DepotStockAvailabilityCheck['shortages'] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return {
        ok: false,
        errorCode: 'PRODUCT_NOT_FOUND',
        shortages: [
          {
            productId: item.productId,
            productName: item.productName || item.productId,
            requested: item.quantity,
            available: 0,
          },
        ],
      };
    }

    if (voucherType === 'sortie' || voucherType === 'transfert') {
      const available = getProductStockInDepot(product, depotSourceId, defaultDepotId);
      if (item.quantity > available) {
        shortages.push({
          productId: product.id,
          productName: product.name,
          requested: item.quantity,
          available,
        });
      }
    }
  }

  if (shortages.length > 0) {
    return { ok: false, errorCode: 'INSUFFICIENT_DEPOT_STOCK', shortages };
  }
  return { ok: true, shortages: [] };
}

export function applyDepotStockVoucherToProducts(params: {
  voucher: Pick<StockMovementVoucher, 'type' | 'depotSourceId' | 'depotTargetId' | 'items'>;
  products: Product[];
  defaultDepotId?: string;
}): Product[] {
  const { voucher, products, defaultDepotId } = params;
  return products.map((product) => {
    const line = (voucher.items || []).find((i) => i.productId === product.id);
    if (!line || line.quantity <= 0) return product;

    const currentMap: Record<string, number> =
      product.depotStockMap && Object.keys(product.depotStockMap).length > 0
        ? { ...product.depotStockMap }
        : { [defaultDepotId || voucher.depotSourceId]: Math.max(0, Number(product.stockQuantity || 0)) };

    const srcQty = Math.max(0, Number(currentMap[voucher.depotSourceId] ?? 0));

    if (voucher.type === 'entree') {
      currentMap[voucher.depotSourceId] = srcQty + line.quantity;
      return {
        ...product,
        depotStockMap: currentMap,
        stockQuantity: Math.max(0, Number(product.stockQuantity || 0)) + line.quantity,
      };
    }

    if (voucher.type === 'sortie') {
      currentMap[voucher.depotSourceId] = Math.max(0, srcQty - line.quantity);
      return {
        ...product,
        depotStockMap: currentMap,
        stockQuantity: Math.max(0, Number(product.stockQuantity || 0) - line.quantity),
      };
    }

    // transfert preserves total global stockQuantity while updating source & destination depots
    if (voucher.depotTargetId) {
      const dstQty = Math.max(0, Number(currentMap[voucher.depotTargetId] ?? 0));
      currentMap[voucher.depotSourceId] = Math.max(0, srcQty - line.quantity);
      currentMap[voucher.depotTargetId] = dstQty + line.quantity;
    }
    return {
      ...product,
      depotStockMap: currentMap,
    };
  });
}

// ============================================================================
// 6. Retenue de Garantie Release Lifecycle + SCF Posting
// ============================================================================

export interface GuaranteeReleaseValidation {
  ok: boolean;
  errorCode?: 'NO_GUARANTEE_HELD' | 'INVALID_RELEASE_AMOUNT' | 'EXCEEDS_HELD_GUARANTEE';
  heldDzd: number;
  alreadyReleasedDzd: number;
  remainingHeldDzd: number;
  nextReleasedDzd: number;
  nextStatus: 'none' | 'held' | 'released';
}

export function validateGuaranteeRetentionRelease(params: {
  doc: CommercialDocument;
  releaseAmountDzd: number;
}): GuaranteeReleaseValidation {
  const heldCentimes = dzdToCentimes(Math.max(0, Number(params.doc.guaranteeRetentionAmount || 0)));
  const alreadyCentimes = dzdToCentimes(Math.max(0, Number(params.doc.guaranteeReleasedAmount || 0)));
  const releaseCentimes = dzdToCentimes(Number(params.releaseAmountDzd || 0));

  if (heldCentimes <= 0) {
    return {
      ok: false,
      errorCode: 'NO_GUARANTEE_HELD',
      heldDzd: 0,
      alreadyReleasedDzd: 0,
      remainingHeldDzd: 0,
      nextReleasedDzd: 0,
      nextStatus: 'none',
    };
  }

  const remainingCentimes = Math.max(0, heldCentimes - alreadyCentimes);
  if (releaseCentimes <= 0) {
    return {
      ok: false,
      errorCode: 'INVALID_RELEASE_AMOUNT',
      heldDzd: centimesToDzd(heldCentimes),
      alreadyReleasedDzd: centimesToDzd(alreadyCentimes),
      remainingHeldDzd: centimesToDzd(remainingCentimes),
      nextReleasedDzd: centimesToDzd(alreadyCentimes),
      nextStatus: 'held',
    };
  }

  if (releaseCentimes > remainingCentimes) {
    return {
      ok: false,
      errorCode: 'EXCEEDS_HELD_GUARANTEE',
      heldDzd: centimesToDzd(heldCentimes),
      alreadyReleasedDzd: centimesToDzd(alreadyCentimes),
      remainingHeldDzd: centimesToDzd(remainingCentimes),
      nextReleasedDzd: centimesToDzd(alreadyCentimes),
      nextStatus: 'held',
    };
  }

  const nextReleasedCentimes = alreadyCentimes + releaseCentimes;
  const nextStatus = nextReleasedCentimes >= heldCentimes ? 'released' : 'held';
  return {
    ok: true,
    heldDzd: centimesToDzd(heldCentimes),
    alreadyReleasedDzd: centimesToDzd(alreadyCentimes),
    remainingHeldDzd: centimesToDzd(heldCentimes - nextReleasedCentimes),
    nextReleasedDzd: centimesToDzd(nextReleasedCentimes),
    nextStatus,
  };
}

export function buildPostingForGuaranteeRelease(params: {
  doc: CommercialDocument;
  releaseAmountDzd: number;
  paymentMethod?: string;
  reference?: string;
  releaseDate?: string;
}): ScfPostingDraft {
  const { doc, releaseAmountDzd, paymentMethod = 'Virement bancaire', reference, releaseDate } = params;
  const amountCentimes = dzdToCentimes(Math.max(0, releaseAmountDzd));
  const isCash = paymentMethod.toLowerCase().includes('esp') || paymentMethod.toLowerCase().includes('cash');
  const treasuryCode = isCash ? '530000' : '512000';
  const treasuryLabel = isCash ? 'Caisse centrale' : 'Banques comptes courants';

  return {
    journalCode: isCash ? 'CA' : 'BQ',
    entryDate: releaseDate || new Date().toISOString().slice(0, 10),
    pieceRef: reference || `RG-${doc.docNumber}`,
    libelle: `Libération retenue de garantie · ${doc.docNumber} · ${doc.clientName}`,
    sourceVertical: 'trading_commercial',
    sourceEventType: 'payment',
    sourceDocId: doc.id,
    idempotencyKey: `trading_guarantee_release:${doc.id}:${amountCentimes}:${releaseDate || ''}`,
    currency: 'DZD',
    fxRate: 1,
    lines: absorbRoundingOrFxDelta([
      {
        accountCode: treasuryCode,
        accountLabel: treasuryLabel,
        partyId: doc.clientId,
        partyName: doc.clientName,
        debitCentimes: amountCentimes,
        creditCentimes: 0,
      },
      {
        accountCode: '411000',
        accountLabel: 'Clients',
        partyId: doc.clientId,
        partyName: doc.clientName,
        debitCentimes: 0,
        creditCentimes: amountCentimes,
      },
    ]),
  };
}

// ============================================================================
// 7. Field Sales Rep Commissions & Delivery Rounds
// ============================================================================

export function calculateTradingRepCommissionDzd(basisAmountDzd: number, rateBps: number): number {
  const safeBasisCentimes = dzdToCentimes(Math.max(0, Number(basisAmountDzd || 0)));
  const clampedBps = Math.max(0, Math.min(10000, roundHalfAwayFromZero(Number(rateBps || 0))));
  const commissionCentimes = roundHalfAwayFromZero((safeBasisCentimes * clampedBps) / 10000);
  return centimesToDzd(commissionCentimes);
}

export function reconcileDeliveryRoundStops(stops: TradingDeliveryStop[]): {
  totalExpectedDzd: number;
  totalCollectedDzd: number;
  varianceDzd: number;
  deliveredCount: number;
  totalStops: number;
} {
  let expectedCentimes = 0;
  let collectedCentimes = 0;
  let deliveredCount = 0;

  for (const stop of stops || []) {
    expectedCentimes = addCentimes(expectedCentimes, dzdToCentimes(Math.max(0, Number(stop.expectedAmountDzd || 0))));
    collectedCentimes = addCentimes(collectedCentimes, dzdToCentimes(Math.max(0, Number(stop.collectedAmountDzd || 0))));
    if (stop.status === 'delivered' || stop.status === 'partial') {
      deliveredCount += 1;
    }
  }

  return {
    totalExpectedDzd: centimesToDzd(expectedCentimes),
    totalCollectedDzd: centimesToDzd(collectedCentimes),
    varianceDzd: centimesToDzd(collectedCentimes - expectedCentimes),
    deliveredCount,
    totalStops: (stops || []).length,
  };
}

export function computeDeliveryRoundMetrics(round: TradingDeliveryRound) {
  return reconcileDeliveryRoundStops(round.stops || []);
}
