import { useState, useEffect } from 'react';
import {
  LogisticsShipment,
  LogisticsManifest,
  TransportBag,
  CourierCashDischarge,
  StopDeskInventoryItem,
  MerchantRemittanceBatch,
} from '../../../types';
import { computeAlgerianFiscalStamp, calculateCcpKey } from '../../../utils/logisticsRules';

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
  const [shipments, setShipments] = useState<LogisticsShipment[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_shipments_v2');
      return saved ? JSON.parse(saved) : INITIAL_SHIPMENTS;
    } catch {
      return INITIAL_SHIPMENTS;
    }
  });

  const [bags, setBags] = useState<TransportBag[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_bags_v2');
      return saved ? JSON.parse(saved) : INITIAL_BAGS;
    } catch {
      return INITIAL_BAGS;
    }
  });

  const [manifests, setManifests] = useState<LogisticsManifest[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_manifests_v2');
      return saved ? JSON.parse(saved) : INITIAL_MANIFESTS;
    } catch {
      return INITIAL_MANIFESTS;
    }
  });

  const [discharges, setDischarges] = useState<CourierCashDischarge[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_discharges_v2');
      return saved ? JSON.parse(saved) : INITIAL_DISCHARGES;
    } catch {
      return INITIAL_DISCHARGES;
    }
  });

  const [remittances, setRemittances] = useState<MerchantRemittanceBatch[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_remittances_v2');
      return saved ? JSON.parse(saved) : INITIAL_REMITTANCES;
    } catch {
      return INITIAL_REMITTANCES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_shipments_v2', JSON.stringify(shipments));
    } catch {}
  }, [shipments]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_bags_v2', JSON.stringify(bags));
    } catch {}
  }, [bags]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_manifests_v2', JSON.stringify(manifests));
    } catch {}
  }, [manifests]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_discharges_v2', JSON.stringify(discharges));
    } catch {}
  }, [discharges]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_remittances_v2', JSON.stringify(remittances));
    } catch {}
  }, [remittances]);

  const addShipment = (shipment: LogisticsShipment) => {
    setShipments((prev) => [shipment, ...prev]);
  };

  const updateShipment = (shipment: LogisticsShipment) => {
    setShipments((prev) => prev.map((s) => (s.id === shipment.id ? shipment : s)));
  };

  const deleteShipment = (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
  };

  const updateShipmentStatus = (id: string, status: LogisticsShipment['status']) => {
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const addBag = (bag: TransportBag) => {
    setBags((prev) => [bag, ...prev]);
  };

  const sealBag = (bagId: string, securitySealNumber: string) => {
    setBags((prev) =>
      prev.map((b) =>
        b.id === bagId
          ? {
              ...b,
              securitySealNumber,
              status: 'Sealed',
              sealedAt: new Date().toISOString(),
            }
          : b
      )
    );
  };

  const addManifest = (manifest: LogisticsManifest) => {
    setManifests((prev) => [manifest, ...prev]);
  };

  const updateManifest = (manifest: LogisticsManifest) => {
    setManifests((prev) => prev.map((m) => (m.id === manifest.id ? manifest : m)));
  };

  const deleteManifest = (id: string) => {
    setManifests((prev) => prev.filter((m) => m.id !== id));
  };

  const addDischarge = (discharge: CourierCashDischarge) => {
    setDischarges((prev) => [discharge, ...prev]);
  };

  const addRemittance = (remittance: MerchantRemittanceBatch) => {
    setRemittances((prev) => [remittance, ...prev]);
  };

  const executeRemittance = (batchId: string) => {
    setRemittances((prev) =>
      prev.map((r) =>
        r.id === batchId
          ? { ...r, status: 'Executed', executedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const resetLogisticsDemoData = () => {
    setShipments(INITIAL_SHIPMENTS);
    setBags(INITIAL_BAGS);
    setManifests(INITIAL_MANIFESTS);
    setDischarges(INITIAL_DISCHARGES);
    setRemittances(INITIAL_REMITTANCES);
    try {
      localStorage.setItem('atrium_logistics_shipments_v2', JSON.stringify(INITIAL_SHIPMENTS));
      localStorage.setItem('atrium_logistics_bags_v2', JSON.stringify(INITIAL_BAGS));
      localStorage.setItem('atrium_logistics_manifests_v2', JSON.stringify(INITIAL_MANIFESTS));
      localStorage.setItem('atrium_logistics_discharges_v2', JSON.stringify(INITIAL_DISCHARGES));
      localStorage.setItem('atrium_logistics_remittances_v2', JSON.stringify(INITIAL_REMITTANCES));
    } catch {}
  };

  return {
    shipments,
    bags,
    manifests,
    discharges,
    remittances,
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
