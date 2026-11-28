import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LogisticsShipment,
  LogisticsManifest,
  TransportBag,
  CourierCashDischarge,
  StopDeskInventoryItem,
  MerchantRemittanceBatch,
  LogisticsParcelEvent,
  LogisticsDeliveryPod,
  LogisticsDriverPayout,
  LogisticsVehicleLog,
  LogisticsMerchantFeeInvoice,
  LogisticsCarrierIntegration,
  LogisticsFreightWaybill,
  LogisticsMovingQuote,
  LogisticsColdChainLog,
  LogisticsCustomsDossier,
  LogisticsTowingDispatch,
} from '../../../types';
import { computeAlgerianFiscalStamp, calculateCcpKey } from '../../../utils/logisticsRules';
import { validateRemittanceCcpBatch, buildMerchantFeeInvoiceSummary } from '../../../utils/logisticsDepth';
import { useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import type { Dispatch, SetStateAction } from 'react';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import { isSupabaseConfigured, logisticsService, realtimeService, syncCoordinator, subscribeConcurrencyResolutions, runWithConcurrency } from '../../../lib/supabase';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';

export function nextLogisticsSequentialCode(docKey: string, prefix: string, pad = 5): string {
  const year = new Date().getFullYear();
  let map: Record<string, number> = {};
  try {
    const raw = localStorage.getItem('atrium_logistics_local_seq_v1');
    map = raw ? JSON.parse(raw) : {};
  } catch {
    map = {};
  }
  const current = Number(map[docKey] || 0) + 1;
  map[docKey] = current;
  try {
    localStorage.setItem('atrium_logistics_local_seq_v1', JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
  return `${prefix}-${year}-${String(current).padStart(pad, '0')}`;
}

function mergeLogById<T extends { id: string }>(prev: T[], remote: T[]): T[] {
  if (remote.length === 0) return prev;
  const map = new Map<string, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}

const daysAgoDate = (daysAgo: number): string => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
};

const daysAgoIso = (daysAgo: number, timeUtc = '09:00:00Z'): string => {
  return `${daysAgoDate(daysAgo)}T${timeUtc}`;
};

const INITIAL_SHIPMENTS: LogisticsShipment[] = [
  {
    id: 'ship_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88912',
    merchantName: 'Boutique E-commerce Électro SARL',
    recipientName: 'Abdelkader Meziani',
    recipientPhone: '0555 41 22 33',
    destinationWilaya: '16 - Alger (Kouba)',
    destinationAddress: 'Cité Oasis, Bâtiment 4, Kouba',
    codAmountDzd: 8500,
    shippingFeeDzd: 600,
    stampDutyDzd: computeAlgerianFiscalStamp(8500),
    weightKg: 1.8,
    deliveryMode: 'HomeDelivery',
    dimensionsCm: { length: 25, width: 20, height: 10 },
    bagId: 'bag_01',
    status: 'OutForDelivery',
    assignedDriverName: 'Farid Belhadj (Van 04)',
    createdAt: daysAgoIso(0, '08:00:00Z'),
  },
  {
    id: 'ship_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88913',
    merchantName: 'Cosmétique Bio Alger',
    recipientName: 'Amina Saidi',
    recipientPhone: '0661 99 88 11',
    destinationWilaya: '31 - Oran (Bir El Djir)',
    destinationAddress: 'Résidence El Bahia, Oran',
    codAmountDzd: 14200,
    shippingFeeDzd: 900,
    stampDutyDzd: computeAlgerianFiscalStamp(14200),
    weightKg: 0.9,
    deliveryMode: 'HomeDelivery',
    dimensionsCm: { length: 15, width: 12, height: 8 },
    bagId: 'bag_01',
    status: 'Delivered',
    assignedDriverName: 'Hamid Benali (Oran Sud)',
    createdAt: daysAgoIso(1, '09:00:00Z'),
  },
  {
    id: 'ship_03',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88914',
    merchantName: 'Mode & Tissus Constantine',
    recipientName: 'Karim Bouzid',
    recipientPhone: '0770 12 34 56',
    destinationWilaya: '25 - Constantine (Sidi Mabrouk)',
    destinationAddress: 'Boulevard de l\'ALN, Cité 500 Logts',
    codAmountDzd: 6800,
    shippingFeeDzd: 850,
    stampDutyDzd: computeAlgerianFiscalStamp(6800),
    weightKg: 2.4,
    deliveryMode: 'StopDesk',
    stopDeskShelfCode: 'RACK-B-04',
    pickupOtpCode: '7492',
    bagId: 'bag_02',
    status: 'ReceivedAtHub',
    createdAt: daysAgoIso(0, '07:30:00Z'),
  },
  {
    id: 'ship_04',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88915',
    merchantName: 'Quincaillerie & Outillage Sétif',
    recipientName: 'Youcef Hamdi',
    recipientPhone: '0550 88 77 66',
    destinationWilaya: '19 - Sétif (El Eulma)',
    destinationAddress: 'Rue Dubai, Centre Commercial',
    codAmountDzd: 28500,
    shippingFeeDzd: 1050,
    stampDutyDzd: computeAlgerianFiscalStamp(28500),
    weightKg: 6.2,
    deliveryMode: 'HomeDelivery',
    dimensionsCm: { length: 40, width: 30, height: 25 },
    bagId: 'bag_03',
    status: 'Sorted',
    assignedDriverName: 'Sofiane (Ligne Est)',
    createdAt: daysAgoIso(0, '08:15:00Z'),
  },
  {
    id: 'ship_05',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88916',
    merchantName: 'High-Tech Phone Bab Ezzouar',
    recipientName: 'Lina Cherif',
    recipientPhone: '0672 33 44 55',
    destinationWilaya: '16 - Alger (Hydra)',
    destinationAddress: 'Val d\'Hydra, Villa N° 12',
    codAmountDzd: 45000,
    shippingFeeDzd: 600,
    stampDutyDzd: computeAlgerianFiscalStamp(45000),
    weightKg: 0.5,
    deliveryMode: 'HomeDelivery',
    status: 'OutForDelivery',
    assignedDriverName: 'Farid Belhadj (Van 04)',
    createdAt: daysAgoIso(0, '09:20:00Z'),
  },
  {
    id: 'ship_06',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88917',
    merchantName: 'Artisanat & Décoration Blida',
    recipientName: 'Omar Benyahia',
    recipientPhone: '0560 11 22 88',
    destinationWilaya: '09 - Blida (Ouled Yaich)',
    destinationAddress: 'Cité des Roses, Bât A3',
    codAmountDzd: 5200,
    shippingFeeDzd: 700,
    stampDutyDzd: computeAlgerianFiscalStamp(5200),
    weightKg: 3.1,
    deliveryMode: 'StopDesk',
    stopDeskShelfCode: 'RACK-A-01',
    pickupOtpCode: '3189',
    status: 'ReceivedAtHub',
    createdAt: daysAgoIso(1, '06:50:00Z'),
  },
  {
    id: 'ship_07',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88918',
    merchantName: 'Librairie Universitaire Alger',
    recipientName: 'Pr. Mourad Kaci',
    recipientPhone: '021 77 88 99',
    destinationWilaya: '06 - Béjaïa (El Kseur)',
    destinationAddress: 'Campus Amizour, Faculté des Sciences',
    codAmountDzd: 3400,
    shippingFeeDzd: 850,
    stampDutyDzd: computeAlgerianFiscalStamp(3400),
    weightKg: 4.0,
    deliveryMode: 'HomeDelivery',
    status: 'Postponed',
    returnReasonCode: 'REC_POSTPONED',
    attemptCount: 1,
    assignedDriverName: 'Tariq (Van Béjaïa)',
    createdAt: daysAgoIso(2, '14:10:00Z'),
  },
  {
    id: 'ship_08',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88919',
    merchantName: 'Dattes & Terroir Sud Tolga',
    recipientName: 'Bilal Hadjadj',
    recipientPhone: '0662 55 44 11',
    destinationWilaya: '30 - Ouargla (Hassi Messaoud)',
    destinationAddress: 'Base de Vie CTP N° 8, Zone Industrielle',
    codAmountDzd: 16500,
    shippingFeeDzd: 1350,
    stampDutyDzd: computeAlgerianFiscalStamp(16500),
    weightKg: 8.5,
    deliveryMode: 'StopDesk',
    stopDeskShelfCode: 'RACK-SUD-03',
    pickupOtpCode: '5821',
    bagId: 'bag_04',
    status: 'HubIntake',
    createdAt: daysAgoIso(0, '10:00:00Z'),
  },
  {
    id: 'ship_09',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88920',
    merchantName: 'Chaussures & Maroquinerie Tlemcen',
    recipientName: 'Samir Mansouri',
    recipientPhone: '0771 90 80 70',
    destinationWilaya: '13 - Tlemcen (Mansourah)',
    destinationAddress: 'Boulevard Pasteur, N° 45',
    codAmountDzd: 9800,
    shippingFeeDzd: 850,
    stampDutyDzd: computeAlgerianFiscalStamp(9800),
    weightKg: 1.5,
    deliveryMode: 'HomeDelivery',
    status: 'Returned',
    returnReasonCode: 'REC_REFUSED_DEFECT',
    attemptCount: 3,
    createdAt: daysAgoIso(3, '11:00:00Z'),
  },
  {
    id: 'ship_10',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88921',
    merchantName: 'Bijoux & Accessoires Didouche',
    recipientName: 'Fatma Zohra Bensaada',
    recipientPhone: '0552 14 25 36',
    destinationWilaya: '16 - Alger (Alger Centre)',
    destinationAddress: 'Rue Didouche Mourad, N° 78',
    codAmountDzd: 22000,
    shippingFeeDzd: 600,
    stampDutyDzd: computeAlgerianFiscalStamp(22000),
    weightKg: 0.4,
    deliveryMode: 'HomeDelivery',
    status: 'Delivered',
    assignedDriverName: 'Farid Belhadj (Van 04)',
    createdAt: daysAgoIso(0, '08:45:00Z'),
  },
  {
    id: 'ship_11',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88922',
    merchantName: 'Pièces Auto Express Oued Smar',
    recipientName: 'Khaled Djerba',
    recipientPhone: '0670 45 67 89',
    destinationWilaya: '23 - Annaba (El Bouni)',
    destinationAddress: 'Zone Artisanale, Lot 14',
    codAmountDzd: 36000,
    shippingFeeDzd: 1100,
    stampDutyDzd: computeAlgerianFiscalStamp(36000),
    weightKg: 7.8,
    deliveryMode: 'HomeDelivery',
    dimensionsCm: { length: 45, width: 35, height: 20 },
    bagId: 'bag_02',
    status: 'Sorted',
    createdAt: daysAgoIso(1, '09:50:00Z'),
  },
  {
    id: 'ship_12',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88923',
    merchantName: 'Sahara Equipement Sud',
    recipientName: 'Tahar Ag Othman',
    recipientPhone: '0663 88 11 22',
    destinationWilaya: '11 - Tamanrasset (In Guezzam)',
    destinationAddress: 'Quartier Tahaggart, Centre Ville',
    codAmountDzd: 18500,
    shippingFeeDzd: 1750,
    stampDutyDzd: computeAlgerianFiscalStamp(18500),
    weightKg: 3.5,
    deliveryMode: 'StopDesk',
    stopDeskShelfCode: 'RACK-SUD-01',
    pickupOtpCode: '9012',
    bagId: 'bag_04',
    status: 'HubIntake',
    createdAt: daysAgoIso(2, '11:10:00Z'),
  },
];

const INITIAL_BAGS: TransportBag[] = [
  {
    id: 'bag_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    bagCode: 'BAG-16-ORN-0042',
    originHubWilaya: 16,
    destinationHubWilaya: 31,
    securitySealNumber: 'SL-994821',
    shipmentIds: ['ship_01', 'ship_02'],
    totalItemCount: 2,
    totalWeightKg: 2.7,
    status: 'Sealed',
    sealedAt: daysAgoIso(0, '08:15:00Z'),
  },
  {
    id: 'bag_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    bagCode: 'BAG-16-CST-0019',
    originHubWilaya: 16,
    destinationHubWilaya: 25,
    securitySealNumber: 'SL-884210',
    shipmentIds: ['ship_03', 'ship_11'],
    totalItemCount: 2,
    totalWeightKg: 10.2,
    status: 'InTransit',
    sealedAt: daysAgoIso(0, '07:45:00Z'),
  },
  {
    id: 'bag_03',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    bagCode: 'BAG-16-STF-0033',
    originHubWilaya: 16,
    destinationHubWilaya: 19,
    securitySealNumber: 'SL-771904',
    shipmentIds: ['ship_04'],
    totalItemCount: 1,
    totalWeightKg: 6.2,
    status: 'Open',
  },
  {
    id: 'bag_04',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    bagCode: 'BAG-16-SUD-0005',
    originHubWilaya: 16,
    destinationHubWilaya: 30,
    securitySealNumber: 'SL-662890',
    shipmentIds: ['ship_08', 'ship_12'],
    totalItemCount: 2,
    totalWeightKg: 12.0,
    status: 'Open',
  },
];

const INITIAL_MANIFESTS: LogisticsManifest[] = [
  {
    id: 'man_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    manifestNumber: 'LVR-2026-041',
    driverName: 'Farid Belhadj',
    driverPhone: '0550 77 66 55',
    driverNin: '198416024001928374',
    vehiclePlate: '04123-119-16',
    transportCardNumber: 'CT-2025-16-9921',
    zoneWilaya: 'Alger Est & Centre (Kouba, Hydra, Alger Centre)',
    originHub: 'Hub National Baraki 16',
    destinationHub: 'Dépôt Alger Centre',
    bagIds: ['bag_01'],
    sealNumbers: ['SL-994821'],
    shipmentIds: ['ship_01', 'ship_05', 'ship_10'],
    totalShipmentsCount: 18,
    totalCodExpectedDzd: 145000,
    totalCodCollectedDzd: 110000,
    totalGrossWeightKg: 28.5,
    dispatchDate: daysAgoDate(0),
    status: 'Dispatched',
    createdAt: daysAgoIso(0, '08:30:00Z'),
  },
  {
    id: 'man_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    manifestNumber: 'LVR-2026-042',
    driverName: 'Hamid Benali',
    driverPhone: '0661 22 33 44',
    driverNin: '197931012004819203',
    vehiclePlate: '09812-121-31',
    transportCardNumber: 'CT-2025-31-4012',
    zoneWilaya: 'Ligne Principale Ouest (Oran - Bir El Djir)',
    originHub: 'Hub National Baraki 16',
    destinationHub: 'Hub Régional Oran Es Sénia',
    bagIds: ['bag_01'],
    sealNumbers: ['SL-994821'],
    shipmentIds: ['ship_02'],
    totalShipmentsCount: 32,
    totalCodExpectedDzd: 380000,
    totalCodCollectedDzd: 380000,
    totalGrossWeightKg: 85.0,
    dispatchDate: daysAgoDate(1),
    status: 'Completed',
    createdAt: daysAgoIso(1, '06:00:00Z'),
  },
  {
    id: 'man_03',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    manifestNumber: 'LVR-2026-043',
    driverName: 'Sofiane Merzoug',
    driverPhone: '0770 55 44 33',
    driverNin: '198825001009182341',
    vehiclePlate: '12490-120-25',
    transportCardNumber: 'CT-2025-25-8819',
    zoneWilaya: 'Ligne Est & Hauts Plateaux (Sétif, Constantine)',
    originHub: 'Hub National Baraki 16',
    destinationHub: 'Hub Régional Constantine Zouaghi',
    bagIds: ['bag_02', 'bag_03'],
    sealNumbers: ['SL-884210', 'SL-771904'],
    shipmentIds: ['ship_03', 'ship_04', 'ship_11'],
    totalShipmentsCount: 24,
    totalCodExpectedDzd: 265000,
    totalCodCollectedDzd: 0,
    totalGrossWeightKg: 64.0,
    dispatchDate: daysAgoDate(0),
    status: 'Dispatched',
    createdAt: daysAgoIso(0, '07:15:00Z'),
  },
];

const INITIAL_DISCHARGES: CourierCashDischarge[] = [
  {
    id: 'dech_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    cashierStaffId: 'staff_01',
    courierStaffId: 'staff_driver_01',
    manifestId: 'man_02',
    dischargeNumber: 'DECH-2026-0891',
    deliveredCount: 32,
    returnedCount: 0,
    expectedCodDzd: 380000,
    actualCashTurnedInDzd: 380000,
    discrepancyDzd: 0,
    banknotesCount: {
      note2000: 160,
      note1000: 50,
      note500: 20,
      note200: 0,
      coins: 0,
    },
    courierSignatureConfirmed: true,
    status: 'Clean',
    timestamp: daysAgoIso(1, '18:30:00Z'),
  },
  {
    id: 'dech_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    cashierStaffId: 'staff_01',
    courierStaffId: 'staff_driver_02',
    manifestId: 'man_01',
    dischargeNumber: 'DECH-2026-0892',
    deliveredCount: 12,
    returnedCount: 2,
    expectedCodDzd: 110000,
    actualCashTurnedInDzd: 109000,
    discrepancyDzd: -1000,
    banknotesCount: {
      note2000: 45,
      note1000: 17,
      note500: 4,
      note200: 0,
      coins: 0,
    },
    courierSignatureConfirmed: true,
    status: 'Shortage',
    timestamp: daysAgoIso(0, '17:00:00Z'),
  },
];

const INITIAL_REMITTANCES: MerchantRemittanceBatch[] = [
  {
    id: 'rem_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    batchNumber: 'LOT-CCP-2026-01',
    merchantName: 'Boutique E-commerce Électro SARL',
    ccpAccount: '0012345678',
    ccpKey: calculateCcpKey('0012345678'),
    grossCodDzd: 142000,
    shippingFeesDzd: 8400,
    returnFeesDzd: 800,
    netPayoutDzd: 132800,
    paymentChannel: 'AlgeriePoste_SFP01',
    status: 'Executed',
    executedAt: daysAgoIso(1, '16:00:00Z'),
  },
  {
    id: 'rem_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    batchNumber: 'LOT-CCP-2026-02',
    merchantName: 'Cosmétique Bio Alger',
    ccpAccount: '0023456789',
    ccpKey: calculateCcpKey('0023456789'),
    grossCodDzd: 88500,
    shippingFeesDzd: 5400,
    returnFeesDzd: 0,
    netPayoutDzd: 83100,
    paymentChannel: 'BaridiMob',
    status: 'Approved',
  },
];

const INITIAL_VEHICLE_LOGS: LogisticsVehicleLog[] = [
  {
    id: 'vlog_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    vehiclePlate: '01452-120-16',
    logKind: 'Fuel',
    odometerKm: 142810,
    liters: 68,
    costDzd: 4420,
    providerName: 'Station Naftal Baraki',
    notes: 'Plein Gasoil utilitaire Iveco',
    loggedAt: daysAgoDate(0),
  },
  {
    id: 'vlog_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    vehiclePlate: '12490-120-25',
    logKind: 'Maintenance',
    odometerKm: 204500,
    liters: 0,
    costDzd: 28500,
    providerName: 'Garage Poids Lourds Zouaghi',
    notes: 'Vidange complète + plaquettes freins avant',
    loggedAt: daysAgoDate(2),
  },
];

const INITIAL_CARRIER_INTEGRATIONS: LogisticsCarrierIntegration[] = [
  {
    id: 'int_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    storeName: 'Boutique E-commerce Électro SARL',
    platform: 'WooCommerce',
    webhookUrl: 'https://electro-dz.example/wp-json/wc/v3/webhooks/atrium',
    signingSecretHint: 'whsec_***4f19',
    isActive: true,
    lastSyncedAt: daysAgoIso(0, '09:15:00Z'),
    ordersImportedCount: 142,
  },
  {
    id: 'int_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    storeName: 'Cosmétique Bio Alger',
    platform: 'YouCan',
    webhookUrl: 'https://cosmetique-bio.youcan.shop/api/hooks/shipping',
    signingSecretHint: 'whsec_***8b22',
    isActive: true,
    lastSyncedAt: daysAgoIso(0, '08:40:00Z'),
    ordersImportedCount: 89,
  },
];

const INITIAL_FREIGHT_WAYBILLS: LogisticsFreightWaybill[] = [
  {
    id: 'frt_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    waybillNumber: 'FRT-2026-00001',
    shipperName: 'Complexe Agro-Industriel Béjaïa',
    consigneeName: 'Grossiste Ouest Oran',
    originWilaya: '06 - Béjaïa',
    destinationWilaya: '31 - Oran',
    cargoDescription: '18 Palettes huile raffinée',
    weightTons: 18.5,
    distanceKm: 640,
    ratePerKmDzd: 165,
    fuelSurchargePercent: 8,
    loadingFeeDzd: 6500,
    totalTtcDzd: 143462,
    vehiclePlate: '12490-120-25',
    status: 'InTransit',
    createdAt: daysAgoIso(0, '06:00:00Z'),
  },
];

const INITIAL_MOVING_QUOTES: LogisticsMovingQuote[] = [
  {
    id: 'mov_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    quoteNumber: 'DEV-2026-00001',
    clientName: 'Cabinet Architecture Hydra',
    originAddress: 'Rue Paradou, Hydra, Alger',
    destinationAddress: 'Pépinière El Achour, Alger',
    volumeM3: 24,
    distanceKm: 18,
    originFloor: 3,
    destinationFloor: 1,
    hasElevatorOrigin: false,
    hasElevatorDest: true,
    packingIncluded: true,
    crewSize: 4,
    totalTtcDzd: 120937,
    moveDate: daysAgoDate(-3),
    status: 'Confirmed',
    createdAt: daysAgoIso(1, '11:20:00Z'),
  },
];

const INITIAL_COLD_CHAIN_LOGS: LogisticsColdChainLog[] = [
  {
    id: 'cold_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    vehiclePlate: '08821-121-16',
    cargoType: 'Réactifs Labo & Chaîne Froid',
    recordedTempC: 4.2,
    minAllowedTempC: 2,
    maxAllowedTempC: 8,
    excursionMinutes: 0,
    complianceStatus: 'Compliant',
    requiresQuarantine: false,
    recordedAt: daysAgoIso(0, '09:30:00Z'),
  },
];

const INITIAL_CUSTOMS_DOSSIERS: LogisticsCustomsDossier[] = [
  {
    id: 'cust_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    dossierNumber: 'D10-2026-00001',
    importerName: 'Import Tech Equipment SARL',
    blAwbReference: 'MSCU4918273',
    portName: 'Port d\'Alger (Djenan El Mabrouk)',
    hsCode: '8471.49.00',
    fobValueDzd: 4200000,
    freightDzd: 380000,
    insuranceDzd: 45000,
    customsDutyRatePercent: 15,
    totalPayableDzd: 1697663,
    status: 'Inspecting',
    createdAt: daysAgoIso(1, '14:00:00Z'),
  },
];

const INITIAL_TOWING_DISPATCHES: LogisticsTowingDispatch[] = [
  {
    id: 'tow_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    dispatchNumber: 'TOW-2026-00001',
    callerName: 'Mourad Tlemcani',
    callerPhone: '0551 22 33 44',
    vehicleClass: 'Utilitaire',
    pickupLocation: 'Autoroute Est-Ouest PK 42 (Lakhdaria)',
    dropoffLocation: 'Atelier Renault Rouiba',
    distanceKm: 36,
    isNightOrWeekend: false,
    needsWinchExtraction: true,
    totalDzd: 17400,
    status: 'OnScene',
    createdAt: daysAgoIso(0, '10:10:00Z'),
  },
];

const INITIAL_PARCEL_EVENTS: LogisticsParcelEvent[] = [
  {
    id: 'evt_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    parcelId: 'ship_01',
    trackingCode: 'ATR-EXP-88912',
    status: 'OutForDelivery',
    location: '16 - Alger (Kouba)',
    notes: 'Remis au livreur Farid Belhadj (Tournée matin)',
    notificationChannel: 'sms',
    notificationRecipient: '0555 41 22 33',
    notificationStatus: 'Sent',
    occurredAt: daysAgoIso(0, '08:45:00Z'),
  },
];

const readLocalList = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return isDemoModeEnabled() ? fallback : [];
};

export const useLogisticsData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_logistics_main';
  const activeBusinessId = currentBusinessId || 'biz_logistics';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_logistics_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      accountId:
        (item as { accountId?: string }).accountId ||
        currentAccountId ||
        (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_logistics',
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      staffId: (item as { staffId?: string }).staffId || currentStaffId || '',
    }) as T;

  const [shipments, setShipments] = useState<LogisticsShipment[]>(() => readLocalList('atrium_logistics_shipments_v2', INITIAL_SHIPMENTS));
  const [bags, setBags] = useState<TransportBag[]>(() => readLocalList('atrium_logistics_bags_v2', INITIAL_BAGS));
  const [manifests, setManifests] = useState<LogisticsManifest[]>(() => readLocalList('atrium_logistics_manifests_v2', INITIAL_MANIFESTS));
  const [discharges, setDischarges] = useState<CourierCashDischarge[]>(() => readLocalList('atrium_logistics_discharges_v2', INITIAL_DISCHARGES));
  const [remittances, setRemittances] = useState<MerchantRemittanceBatch[]>(() => readLocalList('atrium_logistics_remittances_v2', INITIAL_REMITTANCES));

  const [settledIds, setSettledIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_settled_ids_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return isDemoModeEnabled() ? ['ship_02'] : [];
  });
  const [parcelEvents, setParcelEvents] = useState<LogisticsParcelEvent[]>(() => readLocalList('atrium_logistics_events_v2', INITIAL_PARCEL_EVENTS));
  const [pods, setPods] = useState<LogisticsDeliveryPod[]>(() => readLocalList('atrium_logistics_pods_v2', []));
  const [driverPayouts, setDriverPayouts] = useState<LogisticsDriverPayout[]>(() => readLocalList('atrium_logistics_driver_payouts_v2', []));
  const [vehicleLogs, setVehicleLogs] = useState<LogisticsVehicleLog[]>(() => readLocalList('atrium_logistics_vehicle_logs_v2', INITIAL_VEHICLE_LOGS));
  const [merchantFeeInvoices, setMerchantFeeInvoices] = useState<LogisticsMerchantFeeInvoice[]>(() => readLocalList('atrium_logistics_merchant_invoices_v2', []));
  const [carrierIntegrations, setCarrierIntegrations] = useState<LogisticsCarrierIntegration[]>(() => readLocalList('atrium_logistics_integrations_v2', INITIAL_CARRIER_INTEGRATIONS));
  const [freightWaybills, setFreightWaybills] = useState<LogisticsFreightWaybill[]>(() => readLocalList('atrium_logistics_freight_waybills_v2', INITIAL_FREIGHT_WAYBILLS));
  const [movingQuotes, setMovingQuotes] = useState<LogisticsMovingQuote[]>(() => readLocalList('atrium_logistics_moving_quotes_v2', INITIAL_MOVING_QUOTES));
  const [coldChainLogs, setColdChainLogs] = useState<LogisticsColdChainLog[]>(() => readLocalList('atrium_logistics_cold_chain_v2', INITIAL_COLD_CHAIN_LOGS));
  const [customsDossiers, setCustomsDossiers] = useState<LogisticsCustomsDossier[]>(() => readLocalList('atrium_logistics_customs_v2', INITIAL_CUSTOMS_DOSSIERS));
  const [towingDispatches, setTowingDispatches] = useState<LogisticsTowingDispatch[]>(() => readLocalList('atrium_logistics_towing_v2', INITIAL_TOWING_DISPATCHES));

  useIdlePersist('atrium_logistics_shipments_v2', shipments);
  useIdlePersist('atrium_logistics_bags_v2', bags);
  useIdlePersist('atrium_logistics_manifests_v2', manifests);
  useIdlePersist('atrium_logistics_discharges_v2', discharges);
  useIdlePersist('atrium_logistics_remittances_v2', remittances);
  useIdlePersist('atrium_logistics_settled_ids_v2', settledIds);
  useIdlePersist('atrium_logistics_events_v2', parcelEvents);
  useIdlePersist('atrium_logistics_pods_v2', pods);
  useIdlePersist('atrium_logistics_driver_payouts_v2', driverPayouts);
  useIdlePersist('atrium_logistics_vehicle_logs_v2', vehicleLogs);
  useIdlePersist('atrium_logistics_merchant_invoices_v2', merchantFeeInvoices);
  useIdlePersist('atrium_logistics_integrations_v2', carrierIntegrations);
  useIdlePersist('atrium_logistics_freight_waybills_v2', freightWaybills);
  useIdlePersist('atrium_logistics_moving_quotes_v2', movingQuotes);
  useIdlePersist('atrium_logistics_cold_chain_v2', coldChainLogs);
  useIdlePersist('atrium_logistics_customs_v2', customsDossiers);
  useIdlePersist('atrium_logistics_towing_v2', towingDispatches);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`logistics:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [remoteShipments, remoteBags, remoteManifests, remoteDischarges, remoteRemittances] =
        await runWithConcurrency(
          [
            () => logisticsService.fetchShipments(activeBranchId),
            () => logisticsService.fetchBags(activeBranchId),
            () => logisticsService.fetchManifests(activeBranchId),
            () => logisticsService.fetchDischarges(activeBranchId),
            () => logisticsService.fetchRemittances(activeBranchId),
          ],
          4
        );
      if (cancelled) return;
      if (remoteShipments.length > 0) setShipments((prev) => mergeLogById(prev, remoteShipments as LogisticsShipment[]));
      if (remoteBags.length > 0) setBags((prev) => mergeLogById(prev, remoteBags as TransportBag[]));
      if (remoteManifests.length > 0) setManifests((prev) => mergeLogById(prev, remoteManifests as LogisticsManifest[]));
      if (remoteDischarges.length > 0) setDischarges((prev) => mergeLogById(prev, remoteDischarges as CourierCashDischarge[]));
      if (remoteRemittances.length > 0) setRemittances((prev) => mergeLogById(prev, remoteRemittances as MerchantRemittanceBatch[]));
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'logistics_parcels',
      'logistics_courier_bags',
      'logistics_fleet',
      'logistics_discharges',
      'logistics_remittances',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: Dispatch<SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('logistics_parcels', setShipments);
      prune('logistics_courier_bags', setBags);
      prune('logistics_fleet', setManifests);
      prune('logistics_discharges', setDischarges);
      prune('logistics_remittances', setRemittances);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('logistics_parcels')) {
        tasks.push(async () => {
          const rows = await logisticsService.fetchShipments(activeBranchId);
          if (!cancelled && rows.length > 0) setShipments((prev) => mergeLogById(prev, rows as LogisticsShipment[]));
        });
      }
      if (changedSet.has('logistics_courier_bags')) {
        tasks.push(async () => {
          const rows = await logisticsService.fetchBags(activeBranchId);
          if (!cancelled && rows.length > 0) setBags((prev) => mergeLogById(prev, rows as TransportBag[]));
        });
      }
      if (changedSet.has('logistics_fleet')) {
        tasks.push(async () => {
          const rows = await logisticsService.fetchManifests(activeBranchId);
          if (!cancelled && rows.length > 0) setManifests((prev) => mergeLogById(prev, rows as LogisticsManifest[]));
        });
      }
      if (changedSet.has('logistics_discharges')) {
        tasks.push(async () => {
          const rows = await logisticsService.fetchDischarges(activeBranchId);
          if (!cancelled && rows.length > 0) setDischarges((prev) => mergeLogById(prev, rows as CourierCashDischarge[]));
        });
      }
      if (changedSet.has('logistics_remittances')) {
        tasks.push(async () => {
          const rows = await logisticsService.fetchRemittances(activeBranchId);
          if (!cancelled && rows.length > 0) setRemittances((prev) => mergeLogById(prev, rows as MerchantRemittanceBatch[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `logistics:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const unsub = subscribeConcurrencyResolutions((evt) => {
      const tasks: Array<() => Promise<void>> = [];
      if (evt.table === 'logistics_parcels') {
        tasks.push(async () => {
          const rows = await logisticsService.fetchShipments(activeBranchId);
          if (!cancelled && rows.length > 0) setShipments((prev) => mergeLogById(prev, rows as LogisticsShipment[]));
        });
      } else if (evt.table === 'logistics_courier_bags') {
        tasks.push(async () => {
          const rows = await logisticsService.fetchBags(activeBranchId);
          if (!cancelled && rows.length > 0) setBags((prev) => mergeLogById(prev, rows as TransportBag[]));
        });
      } else if (evt.table === 'logistics_fleet') {
        tasks.push(async () => {
          const rows = await logisticsService.fetchManifests(activeBranchId);
          if (!cancelled && rows.length > 0) setManifests((prev) => mergeLogById(prev, rows as LogisticsManifest[]));
        });
      } else if (evt.table === 'logistics_discharges') {
        tasks.push(async () => {
          const rows = await logisticsService.fetchDischarges(activeBranchId);
          if (!cancelled && rows.length > 0) setDischarges((prev) => mergeLogById(prev, rows as CourierCashDischarge[]));
        });
      } else if (evt.table === 'logistics_remittances') {
        tasks.push(async () => {
          const rows = await logisticsService.fetchRemittances(activeBranchId);
          if (!cancelled && rows.length > 0) setRemittances((prev) => mergeLogById(prev, rows as MerchantRemittanceBatch[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `logistics:res:${activeBranchId}:${evt.table}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [activeBranchId]);

  const latestRef = useRef({
    shipments,
    bags,
    manifests,
    discharges,
    remittances,
  });
  latestRef.current = {
    shipments,
    bags,
    manifests,
    discharges,
    remittances,
  };

  const restoreAt = <T extends { id: string }>(
    setter: Dispatch<SetStateAction<T[]>>,
    snapshot: T,
    index: number
  ) => {
    const item = cloneSnapshot(snapshot);
    setter((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      const next = [...prev];
      const safeIndex = Math.max(0, Math.min(index, next.length));
      next.splice(safeIndex, 0, item);
      return next;
    });
  };

  const addShipment = (shipment: LogisticsShipment) => {
    const scoped = withBranch(shipment);
    const snap = cloneSnapshot(scoped);
    setShipments((prev) => [scoped, ...prev]);
    void logisticsService.upsertShipment(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.trackingCode,
      summary: pickLocalizedText(language, {
        fr: `Colis ${scoped.trackingCode} créé`,
        en: `Shipment ${scoped.trackingCode} created`,
        ar: `تم إنشاء الطرد ${scoped.trackingCode}`,
      }),
      undo: () => {
        setShipments((prev) => prev.filter((s) => s.id !== snap.id));
        void logisticsService.deleteShipment(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setShipments((prev) => (prev.some((s) => s.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('logistics_parcels', re.id, currentStaffId)
          .then(() => logisticsService.upsertShipment(re))
          .catch(() => {});
      },
    });
  };

  const updateShipment = (shipment: LogisticsShipment) => {
    const scoped = withBranch(shipment);
    const existing = latestRef.current.shipments.find((s) => s.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setShipments((prev) => prev.map((s) => (s.id === scoped.id ? scoped : s)));
    void logisticsService.upsertShipment(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'logistics_delivery',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.trackingCode,
        summary: pickLocalizedText(language, {
          fr: `Colis ${nextSnap.trackingCode} modifié`,
          en: `Shipment ${nextSnap.trackingCode} updated`,
          ar: `تم تعديل الطرد ${nextSnap.trackingCode}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setShipments((prev) => prev.map((s) => (s.id === prevCopy.id ? prevCopy : s)));
          void logisticsService.upsertShipment(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setShipments((prev) => prev.map((s) => (s.id === nextCopy.id ? nextCopy : s)));
          void logisticsService.upsertShipment(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteShipment = (id: string) => {
    const idx = latestRef.current.shipments.findIndex((s) => s.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.shipments[idx]) : null;
    setShipments((prev) => prev.filter((s) => s.id !== id));
    void logisticsService.deleteShipment(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'logistics_delivery',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.trackingCode,
        summary: pickLocalizedText(language, {
          fr: `Colis ${existing.trackingCode} supprimé`,
          en: `Shipment ${existing.trackingCode} deleted`,
          ar: `تم حذف الطرد ${existing.trackingCode}`,
        }),
        undo: () => {
          restoreAt(setShipments, existing, idx);
          void syncCoordinator
            .restoreRow('logistics_parcels', existing.id, currentStaffId)
            .then(() => logisticsService.upsertShipment(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setShipments((prev) => prev.filter((s) => s.id !== existing.id));
          void logisticsService.deleteShipment(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const updateShipmentStatus = (id: string, status: LogisticsShipment['status']) => {
    const existing = latestRef.current.shipments.find((s) => s.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const updated = withBranch({ ...existing, status });
    const nextSnap = cloneSnapshot(updated);
    setShipments((prev) => prev.map((s) => (s.id === id ? updated : s)));
    void logisticsService.upsertShipment(updated).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'status',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: existing.trackingCode,
      summary: pickLocalizedText(language, {
        fr: `Statut colis ${existing.trackingCode} → ${status}`,
        en: `Shipment ${existing.trackingCode} → ${status}`,
        ar: `تحديث حالة الطرد ${existing.trackingCode} → ${status}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setShipments((prev) => prev.map((s) => (s.id === prevCopy.id ? prevCopy : s)));
        void logisticsService.upsertShipment(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setShipments((prev) => prev.map((s) => (s.id === nextCopy.id ? nextCopy : s)));
        void logisticsService.upsertShipment(nextCopy).catch(() => {});
      },
    });
  };

  const addBag = (bag: TransportBag) => {
    const scoped = withBranch(bag);
    const snap = cloneSnapshot(scoped);
    setBags((prev) => [scoped, ...prev]);
    void logisticsService.upsertBag(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.bagCode,
      summary: pickLocalizedText(language, {
        fr: `Sac navette ${scoped.bagCode} créé`,
        en: `Shuttle bag ${scoped.bagCode} created`,
        ar: `تم إنشاء حقيبة النقل ${scoped.bagCode}`,
      }),
      undo: () => {
        setBags((prev) => prev.filter((b) => b.id !== snap.id));
        void logisticsService.deleteBag(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setBags((prev) => (prev.some((b) => b.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('logistics_courier_bags', re.id, currentStaffId)
          .then(() => logisticsService.upsertBag(re))
          .catch(() => {});
      },
    });
  };

  const sealBag = (bagId: string, securitySealNumber: string) => {
    const targetBag = latestRef.current.bags.find((b) => b.id === bagId);
    if (!targetBag) return;
    const prevSnap = cloneSnapshot(targetBag);
    const sealedBag: TransportBag = withBranch({
      ...targetBag,
      securitySealNumber,
      status: 'Sealed',
      sealedAt: new Date().toISOString(),
    });
    const nextSnap = cloneSnapshot(sealedBag);

    setBags((prev) => prev.map((b) => (b.id === bagId ? sealedBag : b)));
    void logisticsService.sealBag(bagId, securitySealNumber, targetBag.shipmentIds || []).catch(() => {});
    void logisticsService.upsertBag(sealedBag).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'status',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: targetBag.bagCode,
      summary: pickLocalizedText(language, {
        fr: `Sac ${targetBag.bagCode} scellé (${securitySealNumber})`,
        en: `Bag ${targetBag.bagCode} sealed (${securitySealNumber})`,
        ar: `تم ختم الحقيبة ${targetBag.bagCode}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setBags((prev) => prev.map((b) => (b.id === prevCopy.id ? prevCopy : b)));
        void logisticsService.upsertBag(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setBags((prev) => prev.map((b) => (b.id === nextCopy.id ? nextCopy : b)));
        void logisticsService.sealBag(nextCopy.id, nextCopy.securitySealNumber, nextCopy.shipmentIds || []).catch(() => {});
        void logisticsService.upsertBag(nextCopy).catch(() => {});
      },
    });
  };

  const addManifest = (manifest: LogisticsManifest) => {
    const scoped = withBranch(manifest);
    const snap = cloneSnapshot(scoped);
    setManifests((prev) => [scoped, ...prev]);
    void logisticsService.upsertManifest(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.manifestNumber,
      summary: pickLocalizedText(language, {
        fr: `Feuille de route ${scoped.manifestNumber} créée`,
        en: `Manifest ${scoped.manifestNumber} created`,
        ar: `تم إنشاء بيان الرحلة ${scoped.manifestNumber}`,
      }),
      undo: () => {
        setManifests((prev) => prev.filter((m) => m.id !== snap.id));
        void logisticsService.deleteManifest(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setManifests((prev) => (prev.some((m) => m.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('logistics_fleet', re.id, currentStaffId)
          .then(() => logisticsService.upsertManifest(re))
          .catch(() => {});
      },
    });
  };

  const updateManifest = (manifest: LogisticsManifest) => {
    const scoped = withBranch(manifest);
    const existing = latestRef.current.manifests.find((m) => m.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setManifests((prev) => prev.map((m) => (m.id === scoped.id ? scoped : m)));
    void logisticsService.upsertManifest(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'logistics_delivery',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.manifestNumber,
        summary: pickLocalizedText(language, {
          fr: `Feuille de route ${nextSnap.manifestNumber} modifiée`,
          en: `Manifest ${nextSnap.manifestNumber} updated`,
          ar: `تم تعديل بيان الرحلة ${nextSnap.manifestNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setManifests((prev) => prev.map((m) => (m.id === prevCopy.id ? prevCopy : m)));
          void logisticsService.upsertManifest(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setManifests((prev) => prev.map((m) => (m.id === nextCopy.id ? nextCopy : m)));
          void logisticsService.upsertManifest(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteManifest = (id: string) => {
    const idx = latestRef.current.manifests.findIndex((m) => m.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.manifests[idx]) : null;
    setManifests((prev) => prev.filter((m) => m.id !== id));
    void logisticsService.deleteManifest(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'logistics_delivery',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.manifestNumber,
        summary: pickLocalizedText(language, {
          fr: `Feuille de route ${existing.manifestNumber} supprimée`,
          en: `Manifest ${existing.manifestNumber} deleted`,
          ar: `تم حذف بيان الرحلة ${existing.manifestNumber}`,
        }),
        undo: () => {
          restoreAt(setManifests, existing, idx);
          void syncCoordinator
            .restoreRow('logistics_fleet', existing.id, currentStaffId)
            .then(() => logisticsService.upsertManifest(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setManifests((prev) => prev.filter((m) => m.id !== existing.id));
          void logisticsService.deleteManifest(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addDischarge = (discharge: CourierCashDischarge) => {
    const scoped = withBranch(discharge);
    const snap = cloneSnapshot(scoped);
    setDischarges((prev) => [scoped, ...prev]);
    void logisticsService.upsertDischarge(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.dischargeNumber,
      summary: pickLocalizedText(language, {
        fr: `Décharge COD ${scoped.dischargeNumber} enregistrée`,
        en: `COD discharge ${scoped.dischargeNumber} recorded`,
        ar: `تم تسجيل تسوية الدفع ${scoped.dischargeNumber}`,
      }),
      undo: () => {
        setDischarges((prev) => prev.filter((d) => d.id !== snap.id));
        void logisticsService.deleteDischarge(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setDischarges((prev) => (prev.some((d) => d.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('logistics_discharges', re.id, currentStaffId)
          .then(() => logisticsService.upsertDischarge(re))
          .catch(() => {});
      },
    });
  };

  const addRemittance = (remittance: MerchantRemittanceBatch) => {
    const scoped = withBranch(remittance);
    const snap = cloneSnapshot(scoped);
    setRemittances((prev) => [scoped, ...prev]);
    void logisticsService.upsertRemittance(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.batchNumber,
      summary: pickLocalizedText(language, {
        fr: `Lot virement ${scoped.batchNumber} créé`,
        en: `Remittance batch ${scoped.batchNumber} created`,
        ar: `تم إنشاء دفعة التحويل ${scoped.batchNumber}`,
      }),
      undo: () => {
        setRemittances((prev) => prev.filter((r) => r.id !== snap.id));
        void logisticsService.deleteRemittance(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setRemittances((prev) => (prev.some((r) => r.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('logistics_remittances', re.id, currentStaffId)
          .then(() => logisticsService.upsertRemittance(re))
          .catch(() => {});
      },
    });
  };

  const executeRemittance = (batchId: string): { ok: boolean; error?: string } => {
    const existing = latestRef.current.remittances.find((r) => r.id === batchId);
    if (!existing) return { ok: false, error: 'Remittance batch not found' };
    const validation = validateRemittanceCcpBatch([existing]);
    if (!validation.isValid) {
      return {
        ok: false,
        error: validation.invalidIssues[0]?.error || 'Invalid CCP checksum',
      };
    }
    const prevSnap = cloneSnapshot(existing);
    const executed: MerchantRemittanceBatch = withBranch({
      ...existing,
      ccpValidated: true,
      status: 'Executed',
      executedAt: new Date().toISOString(),
    });
    const nextSnap = cloneSnapshot(executed);
    setRemittances((prev) => prev.map((r) => (r.id === batchId ? executed : r)));
    void logisticsService.upsertRemittance(executed).catch(() => {});
    void logisticsService.executeRemittanceValidated(batchId, true).catch(() => {});

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'status',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: existing.batchNumber,
      summary: pickLocalizedText(language, {
        fr: `Lot virement ${existing.batchNumber} exécuté`,
        en: `Remittance batch ${existing.batchNumber} executed`,
        ar: `تم تنفيذ دفعة التحويل ${existing.batchNumber}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setRemittances((prev) => prev.map((r) => (r.id === prevCopy.id ? prevCopy : r)));
        void logisticsService.upsertRemittance(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setRemittances((prev) => prev.map((r) => (r.id === nextCopy.id ? nextCopy : r)));
        void logisticsService.upsertRemittance(nextCopy).catch(() => {});
      },
    });
    return { ok: true };
  };

  const depthCtx = useMemo(
    () => ({
      accountId: currentAccountId || (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: activeBusinessId,
      branchId: activeBranchId,
      staffId: currentStaffId,
    }),
    [currentAccountId, activeBusinessId, activeBranchId, currentStaffId]
  );

  const toggleSettledId = (shipmentId: string) => {
    const isAlready = settledIds.includes(shipmentId);
    const next = isAlready
      ? settledIds.filter((id) => id !== shipmentId)
      : [...settledIds, shipmentId];
    setSettledIds(next);
    const target = latestRef.current.shipments.find((s) => s.id === shipmentId);
    if (target) {
      updateShipment({
        ...target,
        isSettled: !isAlready,
        settledAt: !isAlready ? new Date().toISOString() : undefined,
      });
    }
  };

  const addParcelEvent = (ev: Omit<LogisticsParcelEvent, 'id' | 'occurredAt'>) => {
    const record: LogisticsParcelEvent = withBranch({
      ...ev,
      id: `evt_${Date.now()}_${parcelEvents.length}`,
      occurredAt: new Date().toISOString(),
    });
    setParcelEvents((prev) => [record, ...prev]);
    void logisticsService.upsertParcelEvent(record, depthCtx).catch(() => {});
    return record;
  };

  const addDeliveryPod = (podInput: Omit<LogisticsDeliveryPod, 'id' | 'capturedAt'>) => {
    const pod: LogisticsDeliveryPod = withBranch({
      ...podInput,
      id: `pod_${Date.now()}_${pods.length}`,
      capturedAt: new Date().toISOString(),
    });
    setPods((prev) => [pod, ...prev]);
    void logisticsService.upsertDeliveryPod(pod, depthCtx).catch(() => {});

    const existing = latestRef.current.shipments.find((s) => s.id === pod.parcelId);
    if (existing) {
      updateShipment({
        ...existing,
        status: pod.outcome,
        returnReasonCode: pod.reasonCode || existing.returnReasonCode,
        attemptCount: (existing.attemptCount || 0) + 1,
        podSignatureUrl: pod.signatureSvg || existing.podSignatureUrl,
        podGpsLat: pod.gpsLat,
        podGpsLng: pod.gpsLng,
        podSignedAt: pod.capturedAt,
        podSignedBy: pod.recipientSignedName || existing.recipientName,
        assignedDriverName: pod.driverName || existing.assignedDriverName,
      });
    }
    addParcelEvent({
      parcelId: pod.parcelId,
      trackingCode: pod.trackingCode,
      status: pod.outcome,
      location: existing?.destinationWilaya || 'Terrain',
      notes: pod.notes || pod.reasonCode || `POD ${pod.outcome} par ${pod.driverName}`,
      notificationChannel: 'system',
      notificationStatus: 'Sent',
    });
    return pod;
  };

  const addDriverPayout = (p: Omit<LogisticsDriverPayout, 'id' | 'payoutNumber' | 'createdAt'>) => {
    const payout: LogisticsDriverPayout = withBranch({
      ...p,
      id: `lpay_${Date.now()}_${driverPayouts.length}`,
      payoutNumber: nextLogisticsSequentialCode('log_driver_pay', 'LPAY'),
      createdAt: new Date().toISOString(),
    });
    setDriverPayouts((prev) => [payout, ...prev]);
    void logisticsService.upsertDriverPayout(payout, depthCtx).catch(() => {});
    return payout;
  };

  const addVehicleLog = (logInput: Omit<LogisticsVehicleLog, 'id'>) => {
    const log: LogisticsVehicleLog = withBranch({
      ...logInput,
      id: `vlog_${Date.now()}_${vehicleLogs.length}`,
    });
    setVehicleLogs((prev) => [log, ...prev]);
    void logisticsService.upsertVehicleLog(log, depthCtx).catch(() => {});
    return log;
  };

  const issueMerchantFeeInvoice = (params: { merchantName: string; periodLabel: string }) => {
    const summary = buildMerchantFeeInvoiceSummary({
      merchantName: params.merchantName,
      shipments: scopedShipments,
      periodLabel: params.periodLabel,
    });
    const inv: LogisticsMerchantFeeInvoice = withBranch({
      id: `mfi_${Date.now()}_${merchantFeeInvoices.length}`,
      invoiceNumber: nextLogisticsSequentialCode('invoice', 'FAC'),
      merchantName: summary.merchantName,
      periodLabel: summary.periodLabel,
      deliveredCount: summary.deliveredCount,
      returnedCount: summary.returnedCount,
      grossCodDzd: summary.grossCodDzd,
      totalFeesTtcDzd: summary.totalFeesTtcDzd,
      netMerchantPayableDzd: summary.netMerchantPayableDzd,
      scfLines: summary.scfLines,
      status: 'Issued',
      issuedAt: new Date().toISOString().slice(0, 10),
    });
    setMerchantFeeInvoices((prev) => [inv, ...prev]);
    void logisticsService.upsertMerchantFeeInvoice(inv, depthCtx).catch(() => {});
    return inv;
  };

  const addCarrierIntegration = (input: Omit<LogisticsCarrierIntegration, 'id' | 'ordersImportedCount'>) => {
    const item: LogisticsCarrierIntegration = withBranch({
      ...input,
      id: `int_${Date.now()}_${carrierIntegrations.length}`,
      ordersImportedCount: 0,
    });
    setCarrierIntegrations((prev) => [item, ...prev]);
    void logisticsService.upsertCarrierIntegration(item, depthCtx).catch(() => {});
    return item;
  };

  const toggleCarrierIntegration = (id: string) => {
    setCarrierIntegrations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, isActive: !c.isActive };
        void logisticsService.upsertCarrierIntegration(updated, depthCtx).catch(() => {});
        return updated;
      })
    );
  };

  const addFreightWaybill = (input: Omit<LogisticsFreightWaybill, 'id' | 'waybillNumber' | 'createdAt'>) => {
    const item: LogisticsFreightWaybill = withBranch({
      ...input,
      id: `frt_${Date.now()}_${freightWaybills.length}`,
      waybillNumber: nextLogisticsSequentialCode('log_waybill', 'FRT'),
      createdAt: new Date().toISOString(),
    });
    setFreightWaybills((prev) => [item, ...prev]);
    void logisticsService.upsertFreightWaybill(item, depthCtx).catch(() => {});
    return item;
  };

  const addMovingQuote = (input: Omit<LogisticsMovingQuote, 'id' | 'quoteNumber' | 'createdAt'>) => {
    const item: LogisticsMovingQuote = withBranch({
      ...input,
      id: `mov_${Date.now()}_${movingQuotes.length}`,
      quoteNumber: nextLogisticsSequentialCode('quote', 'DEV'),
      createdAt: new Date().toISOString(),
    });
    setMovingQuotes((prev) => [item, ...prev]);
    void logisticsService.upsertMovingQuote(item, depthCtx).catch(() => {});
    return item;
  };

  const addColdChainLog = (input: Omit<LogisticsColdChainLog, 'id' | 'recordedAt'>) => {
    const item: LogisticsColdChainLog = withBranch({
      ...input,
      id: `cold_${Date.now()}_${coldChainLogs.length}`,
      recordedAt: new Date().toISOString(),
    });
    setColdChainLogs((prev) => [item, ...prev]);
    void logisticsService.upsertColdChainLog(item, depthCtx).catch(() => {});
    return item;
  };

  const addCustomsDossier = (input: Omit<LogisticsCustomsDossier, 'id' | 'dossierNumber' | 'createdAt'>) => {
    const item: LogisticsCustomsDossier = withBranch({
      ...input,
      id: `cust_${Date.now()}_${customsDossiers.length}`,
      dossierNumber: nextLogisticsSequentialCode('log_customs', 'D10'),
      createdAt: new Date().toISOString(),
    });
    setCustomsDossiers((prev) => [item, ...prev]);
    void logisticsService.upsertCustomsDossier(item, depthCtx).catch(() => {});
    return item;
  };

  const addTowingDispatch = (input: Omit<LogisticsTowingDispatch, 'id' | 'dispatchNumber' | 'createdAt'>) => {
    const item: LogisticsTowingDispatch = withBranch({
      ...input,
      id: `tow_${Date.now()}_${towingDispatches.length}`,
      dispatchNumber: nextLogisticsSequentialCode('log_towing', 'TOW'),
      createdAt: new Date().toISOString(),
    });
    setTowingDispatches((prev) => [item, ...prev]);
    void logisticsService.upsertTowingDispatch(item, depthCtx).catch(() => {});
    return item;
  };

  const resetLogisticsDemoData = () => {
    const snap = cloneSnapshot(latestRef.current);
    setShipments((prev) => prev.filter((s) => !belongsToActiveBranch(s)));
    setBags((prev) => prev.filter((b) => !belongsToActiveBranch(b)));
    setManifests((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setDischarges((prev) => prev.filter((d) => !belongsToActiveBranch(d)));
    setRemittances((prev) => prev.filter((r) => !belongsToActiveBranch(r)));

    registerUndoEntry({
      vertical: 'logistics_delivery',
      operationType: 'bulk',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données logistiques réinitialisées',
        en: 'Logistics data reset',
        ar: 'تمت إعادة ضبط بيانات اللوجستيك',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setShipments(s.shipments);
        setBags(s.bags);
        setManifests(s.manifests);
        setDischarges(s.discharges);
        setRemittances(s.remittances);
      },
    });
  };

  const scopedShipments = useMemo(() => shipments.filter(belongsToActiveBranch), [shipments, belongsToActiveBranch]);
  const scopedBags = useMemo(() => bags.filter(belongsToActiveBranch), [bags, belongsToActiveBranch]);
  const scopedManifests = useMemo(() => manifests.filter(belongsToActiveBranch), [manifests, belongsToActiveBranch]);
  const scopedDischarges = useMemo(() => discharges.filter(belongsToActiveBranch), [discharges, belongsToActiveBranch]);
  const scopedRemittances = useMemo(() => remittances.filter(belongsToActiveBranch), [remittances, belongsToActiveBranch]);
  const scopedParcelEvents = useMemo(() => parcelEvents.filter(belongsToActiveBranch), [parcelEvents, belongsToActiveBranch]);
  const scopedPods = useMemo(() => pods.filter(belongsToActiveBranch), [pods, belongsToActiveBranch]);
  const scopedDriverPayouts = useMemo(() => driverPayouts.filter(belongsToActiveBranch), [driverPayouts, belongsToActiveBranch]);
  const scopedVehicleLogs = useMemo(() => vehicleLogs.filter(belongsToActiveBranch), [vehicleLogs, belongsToActiveBranch]);
  const scopedMerchantFeeInvoices = useMemo(() => merchantFeeInvoices.filter(belongsToActiveBranch), [merchantFeeInvoices, belongsToActiveBranch]);
  const scopedCarrierIntegrations = useMemo(() => carrierIntegrations.filter(belongsToActiveBranch), [carrierIntegrations, belongsToActiveBranch]);
  const scopedFreightWaybills = useMemo(() => freightWaybills.filter(belongsToActiveBranch), [freightWaybills, belongsToActiveBranch]);
  const scopedMovingQuotes = useMemo(() => movingQuotes.filter(belongsToActiveBranch), [movingQuotes, belongsToActiveBranch]);
  const scopedColdChainLogs = useMemo(() => coldChainLogs.filter(belongsToActiveBranch), [coldChainLogs, belongsToActiveBranch]);
  const scopedCustomsDossiers = useMemo(() => customsDossiers.filter(belongsToActiveBranch), [customsDossiers, belongsToActiveBranch]);
  const scopedTowingDispatches = useMemo(() => towingDispatches.filter(belongsToActiveBranch), [towingDispatches, belongsToActiveBranch]);

  return {
    shipments: scopedShipments,
    bags: scopedBags,
    manifests: scopedManifests,
    discharges: scopedDischarges,
    remittances: scopedRemittances,
    settledIds,
    parcelEvents: scopedParcelEvents,
    pods: scopedPods,
    driverPayouts: scopedDriverPayouts,
    vehicleLogs: scopedVehicleLogs,
    merchantFeeInvoices: scopedMerchantFeeInvoices,
    carrierIntegrations: scopedCarrierIntegrations,
    freightWaybills: scopedFreightWaybills,
    movingQuotes: scopedMovingQuotes,
    coldChainLogs: scopedColdChainLogs,
    customsDossiers: scopedCustomsDossiers,
    towingDispatches: scopedTowingDispatches,
    addShipment,
    updateShipment,
    deleteShipment,
    updateShipmentStatus,
    addBag,
    sealBag,
    addManifest,
    updateManifest,
    deleteManifest,
    addDischarge,
    addRemittance,
    executeRemittance,
    toggleSettledId,
    setSettledIds,
    addParcelEvent,
    addDeliveryPod,
    addDriverPayout,
    addVehicleLog,
    issueMerchantFeeInvoice,
    addCarrierIntegration,
    toggleCarrierIntegration,
    addFreightWaybill,
    addMovingQuote,
    addColdChainLog,
    addCustomsDossier,
    addTowingDispatch,
    resetLogisticsDemoData,
  };
};
