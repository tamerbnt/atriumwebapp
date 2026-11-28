import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  B2bClient,
  CommercialDocument,
  Product,
  StaffMember,
  TradingPriceList,
} from '../types/index';
import {
  applyDepotStockVoucherToProducts,
  applyPartialDocConversion,
  buildPostingForGuaranteeRelease,
  calculateTradingRepCommissionDzd,
  computeRemainingConvertibleItems,
  evaluateClientCreditExposure,
  getProductStockInDepot,
  reconcileDeliveryRoundStops,
  resolveClientTierPrice,
  validateAvoirAgainstInvoice,
  validateDepotVoucherAvailability,
  validateGuaranteeRetentionRelease,
  verifyManagerPinOverride,
} from './tradingDepth';

const makeClient = (overrides: Partial<B2bClient> = {}): B2bClient => ({
  id: 'cli_1',
  accountId: 'tenant_1',
  businessId: 'biz_1',
  branchId: 'br_1',
  tenantId: 'tenant_1',
  facilityId: 'br_1',
  companyName: 'SARL Atlas Distribution',
  email: 'contact@atlas.dz',
  phone: '0550000001',
  address: 'Zone Industrielle Rouiba',
  city: 'Alger',
  country: 'Algérie',
  rc: '16/00-123456B20',
  nif: '000016000000001',
  nis: '000016000000002',
  ai: '16000000003',
  contactName: 'Karim Mansouri',
  priceTier: 'wholesale',
  creditLimit: 500000,
  outstandingBalance: 350000,
  paymentTermsDays: 30,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod_1',
  accountId: 'tenant_1',
  businessId: 'biz_1',
  branchId: 'br_1',
  tenantId: 'tenant_1',
  facilityId: 'br_1',
  name: 'Ciment CPJ 42.5 50kg',
  description: 'Ciment CPJ',
  price: { amount: 850, currency: 'DZD' },
  cost: { amount: 680, currency: 'DZD' },
  stockQuantity: 120,
  sku: 'CIM-425',
  unit: 'sac',
  taxRate: 19,
  category: 'General',
  reorderLevel: 20,
  isActive: true,
  isPinned: false,
  depotStockMap: { dep_main: 100, dep_oran: 20 },
  ...overrides,
});

const makeStaff = (): StaffMember[] => [
  {
    id: 'stf_mgr',
    tenantId: 'tenant_1',
    facilityId: 'br_1',
    businessId: 'biz_1',
    branchId: 'br_1',
    fullName: 'Nabil Gérant',
    role: 'manager',
    roleRank: 2,
    pinCode: '4589',
    email: 'nabil@atlas.dz',
    phoneNumber: '0550111222',
    hireDate: '2025-01-01',
    salary: 80000,
    paymentDay: 28,
    isActive: true,
    allowedModules: ['all'],
    status: 'active',
  },
  {
    id: 'stf_rep',
    tenantId: 'tenant_1',
    facilityId: 'br_1',
    businessId: 'biz_1',
    branchId: 'br_1',
    fullName: 'Yacine Commercial',
    role: 'staff',
    roleRank: 4,
    pinCode: '1111',
    email: 'yacine@atlas.dz',
    phoneNumber: '0550333444',
    hireDate: '2025-02-01',
    salary: 55000,
    paymentDay: 28,
    isActive: true,
    allowedModules: ['trading'],
    status: 'active',
  },
];

const makeDoc = (overrides: Partial<CommercialDocument> = {}): CommercialDocument => ({
  id: 'doc_1',
  accountId: 'tenant_1',
  businessId: 'biz_1',
  branchId: 'br_1',
  tenantId: 'tenant_1',
  facilityId: 'br_1',
  type: 'bl',
  docNumber: 'BL-2026-0001',
  clientId: 'cli_1',
  clientName: 'SARL Atlas Distribution',
  depotId: 'dep_main',
  date: '2026-11-15',
  paymentMethod: 'Virement bancaire',
  paymentTerms: '30 jours',
  status: 'Delivered',
  items: [
    {
      id: 'line_1',
      productId: 'prod_1',
      description: 'Ciment CPJ 42.5',
      isService: false,
      quantity: 100,
      unit: 'sac',
      unitPriceHt: 800,
      tvaPercent: 19,
      discountPercent: 0,
      totalHt: 80000,
      totalTtc: 95200,
    },
    {
      id: 'line_2',
      productId: 'prod_2',
      description: 'Fer à béton T12',
      isService: false,
      quantity: 50,
      unit: 'barre',
      unitPriceHt: 1200,
      tvaPercent: 19,
      discountPercent: 0,
      totalHt: 60000,
      totalTtc: 71400,
    },
  ],
  totalHtRaw: 140000,
  generalDiscountPercent: 0,
  totalHtFinal: 140000,
  totalTva: 26600,
  timbreFiscal: 0,
  totalTtc: 166600,
  guaranteeRetentionPercent: 0,
  guaranteeRetentionAmount: 0,
  netToPay: 166600,
  currency: 'DZD',
  includeStampSignature: true,
  createdAt: '2026-11-15T10:00:00Z',
  updatedAt: '2026-11-15T10:00:00Z',
  ...overrides,
});

describe('tradingDepth (7.8 trading_commercial)', () => {
  it('1. resolves effective-dated tier prices with minQty breaks and ignores expired/future lists', () => {
    const lists: TradingPriceList[] = [
      {
        id: 'pl_old',
        tenantId: 'tenant_1',
        facilityId: 'br_1',
        name: 'Gros Q1',
        tier: 'wholesale',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
        isActive: true,
        items: [{ id: 'i1', productId: 'prod_1', unitPriceHt: 790, minQty: 1 }],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'pl_curr',
        tenantId: 'tenant_1',
        facilityId: 'br_1',
        name: 'Gros Q4',
        tier: 'wholesale',
        effectiveFrom: '2026-10-01',
        isActive: true,
        items: [
          { id: 'i2', productId: 'prod_1', unitPriceHt: 775, minQty: 1 },
          { id: 'i3', productId: 'prod_1', unitPriceHt: 740, minQty: 50, discountPercent: 2 },
        ],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'pl_future',
        tenantId: 'tenant_1',
        facilityId: 'br_1',
        name: 'Gros 2027',
        tier: 'wholesale',
        effectiveFrom: '2027-01-01',
        isActive: true,
        items: [{ id: 'i4', productId: 'prod_1', unitPriceHt: 900, minQty: 1 }],
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    const smallQty = resolveClientTierPrice({
      priceLists: lists,
      clientTier: 'wholesale',
      productId: 'prod_1',
      docDate: '2026-11-20',
      qty: 10,
      fallbackUnitPriceHt: 850,
    });
    assert.equal(smallQty.isTierApplied, true);
    assert.equal(smallQty.unitPriceHt, 775);
    assert.equal(smallQty.matchedPriceListId, 'pl_curr');

    const bulkQty = resolveClientTierPrice({
      priceLists: lists,
      clientTier: 'wholesale',
      productId: 'prod_1',
      docDate: '2026-11-20',
      qty: 60,
      fallbackUnitPriceHt: 850,
    });
    assert.equal(bulkQty.unitPriceHt, 740);
    assert.equal(bulkQty.discountPercent, 2);

    const stdTier = resolveClientTierPrice({
      priceLists: lists,
      clientTier: 'standard',
      productId: 'prod_1',
      docDate: '2026-11-20',
      qty: 60,
      fallbackUnitPriceHt: 850,
    });
    assert.equal(stdTier.isTierApplied, false);
    assert.equal(stdTier.unitPriceHt, 850);
  });

  it('2. blocks credit limit overruns on orders/BL/invoices and enforces manager PIN + reason override', () => {
    const client = makeClient({ creditLimit: 500000, outstandingBalance: 380000 });
    const staffList = makeStaff();
    const openOrder = makeDoc({
      id: 'ord_open',
      type: 'commande',
      status: 'Validated',
      totalTtc: 70000,
      netToPay: 70000,
    });

    // Devis is never blocked
    const devisEval = evaluateClientCreditExposure({
      client,
      docType: 'devis',
      newDocTotalDzd: 200000,
      existingDocs: [openOrder],
    });
    assert.equal(devisEval.blocked, false);

    // 380k + 70k + 100k = 550k > 500k -> blocked
    const blockedEval = evaluateClientCreditExposure({
      client,
      docType: 'commande',
      newDocTotalDzd: 100000,
      existingDocs: [openOrder],
      staffList,
    });
    assert.equal(blockedEval.blocked, true);
    assert.equal(blockedEval.exceedsLimit, true);
    assert.equal(blockedEval.excessDzd, 50000);
    assert.equal(blockedEval.errorCode, 'CREDIT_LIMIT_EXCEEDED');

    // Non-manager PIN fails
    const nonMgr = verifyManagerPinOverride({
      staffList,
      pinCode: '1111',
      reason: 'Client VIP régulier',
    });
    assert.equal(nonMgr.valid, false);
    assert.equal(nonMgr.errorCode, 'NOT_AUTHORIZED_ROLE');

    // Manager PIN + reason succeeds with audit metadata
    const overridden = evaluateClientCreditExposure({
      client,
      docType: 'commande',
      newDocTotalDzd: 100000,
      existingDocs: [openOrder],
      staffList,
      managerPin: '4589',
      overrideReason: 'Chèque certifié déposé en agence',
    });
    assert.equal(overridden.blocked, false);
    assert.equal(overridden.overrideApplied, true);
    assert.equal(overridden.overrideStaffId, 'stf_mgr');

    // Editing an already-overridden doc and INCREASING total re-blocks unless re-authorized
    const reblockedOnEdit = evaluateClientCreditExposure({
      client,
      docType: 'commande',
      newDocTotalDzd: 150000,
      excludeDocId: 'ord_open',
      existingDocs: [openOrder],
      staffList,
      existingOverride: {
        staffId: 'stf_mgr',
        staffName: 'Nabil Gérant',
        reason: 'Initial approval',
        previousTotalDzd: 70000,
      },
    });
    assert.equal(reblockedOnEdit.blocked, true);
  });

  it('3. converts BL partially across multiple Factures, tracks remaining quantities, and blocks over-conversion', () => {
    const bl = makeDoc({ type: 'bl', status: 'Delivered' });

    const firstPass = applyPartialDocConversion({
      sourceDoc: bl,
      targetType: 'facture',
      lineQuantities: { line_1: 60, line_2: 0 },
    });
    assert.equal(firstPass.ok, true);
    assert.equal(firstPass.updatedSourceStatus, 'Partial');
    assert.equal(firstPass.childItems.length, 1);
    assert.equal(firstPass.childItems[0].quantity, 60);
    assert.equal(firstPass.totals.totalHtFinal, 48000);

    const updatedBl: CommercialDocument = {
      ...bl,
      status: firstPass.updatedSourceStatus,
      items: firstPass.updatedSourceItems,
    };

    const remainingBeforeSecond = computeRemainingConvertibleItems({
      sourceDoc: updatedBl,
      targetType: 'facture',
    });
    assert.equal(remainingBeforeSecond[0].remainingQty, 40);
    assert.equal(remainingBeforeSecond[1].remainingQty, 50);

    // Over-conversion attempt rejected
    const overPass = applyPartialDocConversion({
      sourceDoc: updatedBl,
      targetType: 'facture',
      lineQuantities: { line_1: 45 },
    });
    assert.equal(overPass.ok, false);
    assert.equal(overPass.errorCode, 'EXCEEDS_REMAINING_QTY');

    // Final exact remaining pass completes source doc
    const secondPass = applyPartialDocConversion({
      sourceDoc: updatedBl,
      targetType: 'facture',
      lineQuantities: { line_1: 40, line_2: 50 },
    });
    assert.equal(secondPass.ok, true);
    assert.equal(secondPass.updatedSourceStatus, 'Validated');
    assert.equal(secondPass.childItems.length, 2);
  });

  it('4. prevents cumulative Avoirs from exceeding parent Facture total', () => {
    const invoice = makeDoc({
      id: 'fac_1',
      type: 'facture',
      docNumber: 'FAC-2026-0010',
      totalTtc: 100000,
    });
    const priorAvoir = makeDoc({
      id: 'av_1',
      type: 'avoir',
      linkedDocId: 'fac_1',
      totalTtc: 65000,
      status: 'Validated',
    });

    const tooMuch = validateAvoirAgainstInvoice({
      parentInvoice: invoice,
      existingDocs: [invoice, priorAvoir],
      newAvoirAmountTtcDzd: 40000,
    });
    assert.equal(tooMuch.valid, false);
    assert.equal(tooMuch.remainingCreditableDzd, 35000);
    assert.equal(tooMuch.errorCode, 'AVOIR_EXCEEDS_INVOICE');

    const okAvoir = validateAvoirAgainstInvoice({
      parentInvoice: invoice,
      existingDocs: [invoice, priorAvoir],
      newAvoirAmountTtcDzd: 35000,
    });
    assert.equal(okAvoir.valid, true);
    assert.equal(okAvoir.remainingCreditableDzd, 35000);
  });

  it('5. blocks BS/BT exceeding per-depot stock while preserving global stock on BT transfers', () => {
    const prod = makeProduct({ stockQuantity: 120, depotStockMap: { dep_main: 100, dep_oran: 20 } });
    assert.equal(getProductStockInDepot(prod, 'dep_oran', 'dep_main'), 20);

    const badTransfer = validateDepotVoucherAvailability({
      voucherType: 'transfert',
      depotSourceId: 'dep_oran',
      depotTargetId: 'dep_main',
      items: [{ productId: prod.id, quantity: 30 }],
      products: [prod],
      defaultDepotId: 'dep_main',
    });
    assert.equal(badTransfer.ok, false);
    assert.equal(badTransfer.errorCode, 'INSUFFICIENT_DEPOT_STOCK');
    assert.equal(badTransfer.shortages[0].available, 20);

    const goodTransfer = validateDepotVoucherAvailability({
      voucherType: 'transfert',
      depotSourceId: 'dep_main',
      depotTargetId: 'dep_oran',
      items: [{ productId: prod.id, quantity: 25 }],
      products: [prod],
      defaultDepotId: 'dep_main',
    });
    assert.equal(goodTransfer.ok, true);

    const [afterTransfer] = applyDepotStockVoucherToProducts({
      voucher: {
        type: 'transfert',
        depotSourceId: 'dep_main',
        depotTargetId: 'dep_oran',
        items: [{ productId: prod.id, productName: prod.name, quantity: 25, unitCostDzd: 680, unit: 'sac' }],
      },
      products: [prod],
      defaultDepotId: 'dep_main',
    });
    assert.equal(afterTransfer.depotStockMap?.dep_main, 75);
    assert.equal(afterTransfer.depotStockMap?.dep_oran, 45);
    assert.equal(afterTransfer.stockQuantity, 120);
  });

  it('6. validates Retenue de Garantie partial & final releases without exceeding held retention and builds balanced SCF posting', () => {
    const invoice = makeDoc({
      id: 'fac_rg',
      type: 'facture',
      docNumber: 'FAC-2026-0099',
      totalTtc: 200000,
      guaranteeRetentionPercent: 10,
      guaranteeRetentionAmount: 20000,
      guaranteeRetentionStatus: 'held',
      guaranteeReleasedAmount: 0,
    });

    const partial = validateGuaranteeRetentionRelease({ doc: invoice, releaseAmountDzd: 8000 });
    assert.equal(partial.ok, true);
    assert.equal(partial.nextStatus, 'held');
    assert.equal(partial.remainingHeldDzd, 12000);

    const updatedInv: CommercialDocument = {
      ...invoice,
      guaranteeReleasedAmount: partial.nextReleasedDzd,
      guaranteeRetentionStatus: partial.nextStatus,
    };

    const overRelease = validateGuaranteeRetentionRelease({ doc: updatedInv, releaseAmountDzd: 15000 });
    assert.equal(overRelease.ok, false);
    assert.equal(overRelease.errorCode, 'EXCEEDS_HELD_GUARANTEE');

    const finalRelease = validateGuaranteeRetentionRelease({ doc: updatedInv, releaseAmountDzd: 12000 });
    assert.equal(finalRelease.ok, true);
    assert.equal(finalRelease.nextStatus, 'released');

    const scfDraft = buildPostingForGuaranteeRelease({
      doc: invoice,
      releaseAmountDzd: 12000,
      paymentMethod: 'Virement bancaire',
      releaseDate: '2026-11-27',
    });
    assert.equal(scfDraft.lines[0].accountCode, '512000');
    assert.equal(scfDraft.lines[0].debitCentimes, 1200000);
    assert.equal(scfDraft.lines[1].accountCode, '411000');
    assert.equal(scfDraft.lines[1].creditCentimes, 1200000);
  });

  it('7. calculates rep commissions in integer centimes and reconciles delivery round stops', () => {
    // 145,250.50 DZD at 250 bps (2.5%) = 3,631.2625 -> 3,631.26 DZD
    const commission = calculateTradingRepCommissionDzd(145250.5, 250);
    assert.equal(commission, 3631.26);

    const metrics = reconcileDeliveryRoundStops([
      {
        id: 's1',
        clientId: 'c1',
        clientName: 'Client A',
        expectedAmountDzd: 50000,
        collectedAmountDzd: 50000,
        status: 'delivered',
      },
      {
        id: 's2',
        clientId: 'c2',
        clientName: 'Client B',
        expectedAmountDzd: 30000,
        collectedAmountDzd: 20000,
        status: 'partial',
      },
      {
        id: 's3',
        clientId: 'c3',
        clientName: 'Client C',
        expectedAmountDzd: 15000,
        collectedAmountDzd: 0,
        status: 'failed',
      },
    ]);
    assert.equal(metrics.totalExpectedDzd, 95000);
    assert.equal(metrics.totalCollectedDzd, 70000);
    assert.equal(metrics.varianceDzd, -25000);
    assert.equal(metrics.deliveredCount, 2);
    assert.equal(metrics.totalStops, 3);
  });
});
