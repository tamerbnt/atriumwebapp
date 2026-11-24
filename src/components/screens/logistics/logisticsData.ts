import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LogisticsShipment,
  LogisticsManifest,
  TransportBag,
  CourierCashDischarge,
  StopDeskInventoryItem,
  MerchantRemittanceBatch,
} from '../../../types';
import { computeAlgerianFiscalStamp, calculateCcpKey } from '../../../utils/logisticsRules';
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

function mergeLogById<T extends { id: string }>(prev: T[], remote: T[]): T[] {
  if (remote.length === 0) return prev;
  const map = new Map<string, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}

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
    createdAt: '2026-05-25T08:00:00Z',
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
    createdAt: '2026-05-24T09:00:00Z',
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
    createdAt: '2026-05-25T07:30:00Z',
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
    createdAt: '2026-05-25T08:15:00Z',
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
    createdAt: '2026-05-25T09:20:00Z',
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
    createdAt: '2026-05-25T06:50:00Z',
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
    createdAt: '2026-05-24T14:10:00Z',
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
    createdAt: '2026-05-25T10:00:00Z',
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
    createdAt: '2026-05-23T11:00:00Z',
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
    createdAt: '2026-05-25T08:45:00Z',
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
    createdAt: '2026-05-25T09:50:00Z',
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
    createdAt: '2026-05-25T11:10:00Z',
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
    sealedAt: '2026-05-25T08:15:00Z',
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
    sealedAt: '2026-05-25T07:45:00Z',
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
    dispatchDate: '2026-05-25',
    status: 'Dispatched',
    createdAt: '2026-05-25T08:30:00Z',
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
    dispatchDate: '2026-05-24',
    status: 'Completed',
    createdAt: '2026-05-24T06:00:00Z',
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
    dispatchDate: '2026-05-25',
    status: 'Dispatched',
    createdAt: '2026-05-25T07:15:00Z',
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
    timestamp: '2026-05-24T18:30:00Z',
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
    timestamp: '2026-05-25T17:00:00Z',
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
    executedAt: '2026-05-24T16:00:00Z',
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

  const [shipments, setShipments] = useState<LogisticsShipment[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_shipments_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bags, setBags] = useState<TransportBag[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_bags_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [manifests, setManifests] = useState<LogisticsManifest[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_manifests_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [discharges, setDischarges] = useState<CourierCashDischarge[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_discharges_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [remittances, setRemittances] = useState<MerchantRemittanceBatch[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_remittances_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useIdlePersist('atrium_logistics_shipments_v2', shipments);
  useIdlePersist('atrium_logistics_bags_v2', bags);
  useIdlePersist('atrium_logistics_manifests_v2', manifests);
  useIdlePersist('atrium_logistics_discharges_v2', discharges);
  useIdlePersist('atrium_logistics_remittances_v2', remittances);

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

  const executeRemittance = (batchId: string) => {
    const existing = latestRef.current.remittances.find((r) => r.id === batchId);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const executed: MerchantRemittanceBatch = withBranch({
      ...existing,
      status: 'Executed',
      executedAt: new Date().toISOString(),
    });
    const nextSnap = cloneSnapshot(executed);
    setRemittances((prev) => prev.map((r) => (r.id === batchId ? executed : r)));
    void logisticsService.upsertRemittance(executed).catch(() => {});

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

  return {
    shipments: scopedShipments,
    bags: scopedBags,
    manifests: scopedManifests,
    discharges: scopedDischarges,
    remittances: scopedRemittances,
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
    resetLogisticsDemoData,
  };
};
