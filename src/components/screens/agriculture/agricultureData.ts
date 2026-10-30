import { useState, useEffect } from 'react';
import {
  AgriParcel,
  AgriCropCycle,
  AgriTreatmentLog,
  AgriWorker,
  AgriDailyPointage,
  AgriDairyCow,
  AgriMilkingRecord,
  AgriWeighbridgeTicket,
} from '../../../types/index';

export const INITIAL_PARCELS: AgriParcel[] = [
  {
    id: 'parc_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Verger Nord - Orangers Thomson & Navel',
    code: 'P-01',
    tenureType: 'concession_loi_10_03',
    cadastralSection: 'Section 04, Îlot 12',
    cadastralDeedRef: 'Acte Notarié N° 1048/2012',
    surfaceHectares: 14.5,
    irrigationType: 'Drip',
    soilType: 'Argilo-limoneux profond',
    soilPh: 7.6,
    waterSourceId: 'forage_anrh_01',
    waterMeterReadingM3: 42150,
    anrhAnnualQuotaM3: 120000,
    anrhConsumedM3: 78500,
    currentCrop: 'Oranges Thomson & Clémentines',
    plantingDate: '2023-10-15',
    expectedHarvestDate: '2026-11-25',
    status: 'Growing',
    notes: 'Arboriculture irriguée au goutte-à-goutte, fertilisation NPK soluble programmée.',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Bloc Serres Multi-Chapelles Maraîchage',
    code: 'P-02',
    tenureType: 'propriete_melk',
    cadastralSection: 'Section 08, Îlot 03',
    cadastralDeedRef: 'Livret Foncier N° 44109',
    surfaceHectares: 3.5,
    irrigationType: 'Drip',
    soilType: 'Sableux amendé bio-fertilisé',
    soilPh: 6.8,
    waterSourceId: 'bassin_accumulation_01',
    waterMeterReadingM3: 18400,
    anrhAnnualQuotaM3: 40000,
    anrhConsumedM3: 31200,
    currentCrop: 'Tomates Industrielles & Poivrons Doux',
    plantingDate: '2026-02-10',
    expectedHarvestDate: '2026-06-15',
    status: 'Harvesting',
    notes: 'Production sous serre maraîchère, cueillette manuelle quotidienne en cours.',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Oliveraie Sud - Variété Chemlal & Sigoise',
    code: 'P-03',
    tenureType: 'concession_loi_10_03',
    cadastralSection: 'Section 11, Îlot 09',
    cadastralDeedRef: 'Acte Notarié N° 3318/2015',
    surfaceHectares: 22.0,
    irrigationType: 'Drip',
    soilType: 'Calcaire bien drainé',
    soilPh: 8.1,
    waterSourceId: 'forage_anrh_02',
    waterMeterReadingM3: 61300,
    anrhAnnualQuotaM3: 150000,
    anrhConsumedM3: 84000,
    currentCrop: 'Olives à Huile (Chemlal)',
    plantingDate: '2022-03-20',
    expectedHarvestDate: '2026-11-10',
    status: 'Growing',
    notes: 'Destination huilerie moderne avec tranches de maturité contrôlée.',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_04',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Plaine Céréalière - Blé Dur Simeto',
    code: 'P-04',
    tenureType: 'concession_loi_10_03',
    cadastralSection: 'Section 15, Îlot 22',
    cadastralDeedRef: 'Acte Notarié N° 8812/2018',
    surfaceHectares: 35.0,
    irrigationType: 'Pivot',
    soilType: 'Limono-argileux riche',
    soilPh: 7.4,
    waterSourceId: 'pivot_centre_oued_01',
    waterMeterReadingM3: 98000,
    anrhAnnualQuotaM3: 200000,
    anrhConsumedM3: 145000,
    currentCrop: 'Blé Dur (Semences Certifiées)',
    plantingDate: '2025-11-30',
    expectedHarvestDate: '2026-06-30',
    status: 'Growing',
    notes: 'Convention de livraison CCLS prioritaire avec prime de pureté variétale.',
    createdAt: '2026-01-10T08:00:00Z',
  },
];

export const INITIAL_CYCLES: AgriCropCycle[] = [
  {
    id: 'cycle_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_02',
    cropName: 'Tomates Maraîchères',
    variety: 'Marmande & Calvi F1',
    campaignYear: 2026,
    surfaceAllocatedHa: 3.5,
    seedLotNumber: 'INPV-SEM-2026-081',
    seedQuantityKg: 42,
    sowingDate: '2026-02-10',
    projectedHarvestDate: '2026-06-15',
    projectedYieldQtx: 1400,
    actualYieldQtx: 1150,
    currentPhase: 'ready_harvest',
    totalInputCostDzd: 890000,
    totalLaborCostDzd: 420000,
    totalMachineryCostDzd: 180000,
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'cycle_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_01',
    cropName: 'Oranges Thomson & Navel',
    variety: 'Thomson Navel',
    campaignYear: 2026,
    surfaceAllocatedHa: 14.5,
    sowingDate: '2023-10-15',
    projectedHarvestDate: '2026-11-25',
    projectedYieldQtx: 3600,
    currentPhase: 'treatment_locked',
    activeDarLockoutUntil: '2026-05-19',
    activePestWarning: 'Fongicide Cuprocol actif (DAR 7 jours en cours)',
    totalInputCostDzd: 1450000,
    totalLaborCostDzd: 680000,
    totalMachineryCostDzd: 310000,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'cycle_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_04',
    cropName: 'Blé Dur Simeto (CCLS)',
    variety: 'Simeto Certifié',
    campaignYear: 2026,
    surfaceAllocatedHa: 35.0,
    seedLotNumber: 'CCLS-MITIDJA-2025-992',
    seedQuantityKg: 5250,
    sowingDate: '2025-11-30',
    projectedHarvestDate: '2026-06-30',
    projectedYieldQtx: 1575,
    currentPhase: 'vegetative',
    totalInputCostDzd: 2100000,
    totalLaborCostDzd: 540000,
    totalMachineryCostDzd: 890000,
    createdAt: '2025-11-20T08:00:00Z',
  },
];

export const INITIAL_TREATMENTS: AgriTreatmentLog[] = [
  {
    id: 'treat_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_02',
    cropCycleId: 'cycle_01',
    treatmentDate: '2026-05-02',
    commercialProductName: 'Cuprocol 50 WG (Bio)',
    activeIngredient: 'Oxychlorure de Cuivre 500g/kg',
    targetPestDisease: 'Mildiou de la Tomate & Bactériose',
    dosagePerHa: '2.5 kg/ha',
    totalQuantityUsed: 8.75,
    darDays: 7,
    harvestAllowedDate: '2026-05-09',
    operatorName: 'Abdelkader (Chef Culture)',
    safetyGearConfirmed: true,
    notes: 'Pulvérisation par atomiseur tracté le matin sans vent. DAR respecté et expiré.',
    createdAt: '2026-05-02T09:00:00Z',
  },
  {
    id: 'treat_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_01',
    cropCycleId: 'cycle_02',
    treatmentDate: '2026-05-12',
    commercialProductName: 'Soufre Micronisé Soluble',
    activeIngredient: 'Soufre pur 80%',
    targetPestDisease: 'Oïdium et Acariens des agrumes',
    dosagePerHa: '5.0 kg/ha',
    totalQuantityUsed: 72.5,
    darDays: 7,
    harvestAllowedDate: '2026-05-19',
    operatorName: 'Ali M. (Applicateur certifié)',
    safetyGearConfirmed: true,
    notes: 'Traitement préventif suite à hausse de température. Récolte verrouillée jusqu au 19 Mai.',
    createdAt: '2026-05-12T10:00:00Z',
  },
];

export const INITIAL_WORKERS: AgriWorker[] = [
  {
    id: 'wrk_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    fullName: 'Mohamed Belkacem',
    ninOrIdCard: '10982736152431',
    phone: '0550 12 34 56',
    workerType: 'seasonal_piecework',
    defaultDailyRateDzd: 2200,
    defaultPieceRateDzd: 40,
    active: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'wrk_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    fullName: 'Youcef Benali',
    ninOrIdCard: '10483920194832',
    phone: '0661 98 76 54',
    workerType: 'seasonal_piecework',
    defaultDailyRateDzd: 2200,
    defaultPieceRateDzd: 40,
    active: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'wrk_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    fullName: 'Rachid Tadjerouni',
    ninOrIdCard: '11982348576102',
    phone: '0770 45 67 89',
    workerType: 'seasonal_daily',
    defaultDailyRateDzd: 2500,
    defaultPieceRateDzd: 0,
    active: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'wrk_04',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    fullName: 'Kamel Ouali (Conducteur Tracteur)',
    ninOrIdCard: '10582910493821',
    phone: '0540 22 33 44',
    workerType: 'permanent_salary',
    defaultDailyRateDzd: 3200,
    defaultPieceRateDzd: 0,
    active: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
];

export const INITIAL_POINTAGES: AgriDailyPointage[] = [
  {
    id: 'pnt_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    workerId: 'wrk_01',
    workerName: 'Mohamed Belkacem',
    parcelId: 'parc_02',
    parcelName: 'Bloc Serres Multi-Chapelles',
    date: '2026-05-18',
    cratesCollected: 58,
    calculatedWageDzd: 2320,
    cashAdvancePaidDzd: 500,
    netDueDzd: 1820,
    isPaid: true,
    paidAt: '2026-05-18T18:00:00Z',
    supervisorStaffId: 'staff_01',
    createdAt: '2026-05-18T07:00:00Z',
  },
  {
    id: 'pnt_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    workerId: 'wrk_02',
    workerName: 'Youcef Benali',
    parcelId: 'parc_02',
    parcelName: 'Bloc Serres Multi-Chapelles',
    date: '2026-05-18',
    cratesCollected: 64,
    calculatedWageDzd: 2560,
    cashAdvancePaidDzd: 0,
    netDueDzd: 2560,
    isPaid: true,
    paidAt: '2026-05-18T18:00:00Z',
    supervisorStaffId: 'staff_01',
    createdAt: '2026-05-18T07:00:00Z',
  },
  {
    id: 'pnt_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    workerId: 'wrk_03',
    workerName: 'Rachid Tadjerouni',
    parcelId: 'parc_02',
    parcelName: 'Bloc Serres Multi-Chapelles',
    date: '2026-05-18',
    cratesCollected: 0,
    calculatedWageDzd: 2500,
    cashAdvancePaidDzd: 1000,
    netDueDzd: 1500,
    isPaid: false,
    supervisorStaffId: 'staff_01',
    createdAt: '2026-05-18T07:00:00Z',
  },
];

export const INITIAL_DAIRY_COWS: AgriDairyCow[] = [
  {
    id: 'cow_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-10482',
    nameOrNumber: 'La Blanche 01',
    breed: 'Holstein',
    birthDate: '2022-04-10',
    reproStatus: 'Lactation',
    lactationNumber: 2,
    dailyAvgLiters: 28.5,
    isInWithholdingLockout: false,
    motherTag: 'DZ-16-0412',
    sireCode: 'FR-991823',
    notes: 'Haute productrice. Taux protéique excellent, conforme cahier Giplait.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'cow_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-10485',
    nameOrNumber: 'Rouge Montbéliarde',
    breed: 'Montbéliarde',
    birthDate: '2023-01-20',
    reproStatus: 'Lactation',
    lactationNumber: 1,
    dailyAvgLiters: 24.0,
    isInWithholdingLockout: true,
    withholdingLockoutUntil: '2026-05-22',
    withholdingReason: 'Traitement mammite aux pénicillines (Délai d attente 4 jours)',
    motherTag: 'DZ-16-0819',
    notes: 'Lait strictement exclu du tank refroidisseur jusqu au 22 mai inclus.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'cow_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-10490',
    nameOrNumber: 'Génisse Sétifienne',
    breed: 'Fleckvieh',
    birthDate: '2024-02-14',
    reproStatus: 'Gestante',
    lactationNumber: 0,
    dailyAvgLiters: 0,
    isInWithholdingLockout: false,
    motherTag: 'DZ-16-0640',
    notes: 'Gestation confirmée par échographie le 10 mars. Vêlage prévu en octobre.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'cow_04',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-10499',
    nameOrNumber: 'Atlas Rustique',
    breed: 'Brune de l Atlas',
    birthDate: '2021-06-18',
    reproStatus: 'Tarissement',
    lactationNumber: 3,
    dailyAvgLiters: 0,
    isInWithholdingLockout: false,
    notes: 'Période de repos avant 4ème vêlage. Rations riches en fourrage sec.',
    createdAt: '2026-01-15T08:00:00Z',
  },
];

export const INITIAL_MILKING_RECORDS: AgriMilkingRecord[] = [
  {
    id: 'mlk_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    sessionDate: '2026-05-18',
    sessionPeriod: 'morning',
    totalTankLiters: 480,
    rejectedWithholdingLiters: 24,
    conformingLiters: 456,
    tankTemperatureCelsius: 3.8,
    destinationDairy: 'Laiterie Publique Giplait Draa Ben Khedda',
    dairyDeliverySlipNo: 'BL-GIP-2026-4412',
    fatContentMg: 35.4,
    onilSubsidyRateDzd: 12.0,
    onilTotalSubsidyDzd: 5472, // 456 * 12
    operatorStaffId: 'staff_01',
    createdAt: '2026-05-18T07:30:00Z',
  },
  {
    id: 'mlk_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    sessionDate: '2026-05-18',
    sessionPeriod: 'evening',
    totalTankLiters: 420,
    rejectedWithholdingLiters: 24,
    conformingLiters: 396,
    tankTemperatureCelsius: 3.9,
    destinationDairy: 'Laiterie Publique Giplait Draa Ben Khedda',
    dairyDeliverySlipNo: 'BL-GIP-2026-4419',
    fatContentMg: 36.1,
    onilSubsidyRateDzd: 12.0,
    onilTotalSubsidyDzd: 4752, // 396 * 12
    operatorStaffId: 'staff_01',
    createdAt: '2026-05-18T18:45:00Z',
  },
];

export const INITIAL_WEIGHBRIDGE_TICKETS: AgriWeighbridgeTicket[] = [
  {
    id: 'pes_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    ticketNumber: 'PB-2026-0041',
    buyerName: 'Mandataire Gro-Fruits Eucalyptus (Farid B.)',
    truckPlate: '00142-126-16',
    driverName: 'Hakim Benziane',
    cropDesignation: 'Tomates Maraîchères Calibre 1',
    grossWeightKg: 8450,
    truckTareKg: 3200,
    crateCount: 260,
    crateUnitTareKg: 1.8,
    totalCrateTareKg: 468,
    netWeightKg: 4782,
    netWeightQuintaux: 47.82,
    unitPriceDzdPerKg: 75,
    subtotalProduceDzd: 358650,
    paymentMethod: 'cash',
    timbreFiscalDzd: 2500, // Capped at 2500 DZD
    totalAmountDzd: 361150,
    paidAmountDzd: 361150,
    remainingDueDzd: 0,
    destinationWholesaleMarket: 'Marché de Gros des Eucalyptus, Alger',
    date: '2026-05-18',
    createdAt: '2026-05-18T11:30:00Z',
  },
  {
    id: 'pes_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    ticketNumber: 'PB-2026-0042',
    buyerName: 'Coopérative Céréalière CCLS Mitidja',
    truckPlate: '04890-124-09',
    driverName: 'Mustapha Larbi',
    cropDesignation: 'Blé Dur Semences (Livraison CCLS)',
    grossWeightKg: 14200,
    truckTareKg: 4100,
    crateCount: 0,
    crateUnitTareKg: 0,
    totalCrateTareKg: 0,
    netWeightKg: 10100,
    netWeightQuintaux: 101.0,
    unitPriceDzdPerKg: 60,
    subtotalProduceDzd: 606000,
    paymentMethod: 'bank_transfer',
    timbreFiscalDzd: 0, // Bank transfer exempt from Art. 317 timbre
    totalAmountDzd: 606000,
    paidAmountDzd: 606000,
    remainingDueDzd: 0,
    destinationWholesaleMarket: 'Silo CCLS Oued Smar, Alger',
    date: '2026-05-17',
    createdAt: '2026-05-17T15:00:00Z',
  },
];

export const useAgricultureData = () => {
  const [parcels, setParcels] = useState<AgriParcel[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_parcels_v2');
      return saved ? JSON.parse(saved) : INITIAL_PARCELS;
    } catch {
      return INITIAL_PARCELS;
    }
  });

  const [cropCycles, setCropCycles] = useState<AgriCropCycle[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_cycles_v2');
      return saved ? JSON.parse(saved) : INITIAL_CYCLES;
    } catch {
      return INITIAL_CYCLES;
    }
  });

  const [treatmentLogs, setTreatmentLogs] = useState<AgriTreatmentLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_treatments_v2');
      return saved ? JSON.parse(saved) : INITIAL_TREATMENTS;
    } catch {
      return INITIAL_TREATMENTS;
    }
  });

  const [workers, setWorkers] = useState<AgriWorker[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_workers_v2');
      return saved ? JSON.parse(saved) : INITIAL_WORKERS;
    } catch {
      return INITIAL_WORKERS;
    }
  });

  const [pointages, setPointages] = useState<AgriDailyPointage[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_pointages_v2');
      return saved ? JSON.parse(saved) : INITIAL_POINTAGES;
    } catch {
      return INITIAL_POINTAGES;
    }
  });

  const [dairyCows, setDairyCows] = useState<AgriDairyCow[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_dairy_cows_v2');
      return saved ? JSON.parse(saved) : INITIAL_DAIRY_COWS;
    } catch {
      return INITIAL_DAIRY_COWS;
    }
  });

  const [milkingRecords, setMilkingRecords] = useState<AgriMilkingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_milking_v2');
      return saved ? JSON.parse(saved) : INITIAL_MILKING_RECORDS;
    } catch {
      return INITIAL_MILKING_RECORDS;
    }
  });

  const [weighbridgeTickets, setWeighbridgeTickets] = useState<AgriWeighbridgeTicket[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_weighbridge_v2');
      return saved ? JSON.parse(saved) : INITIAL_WEIGHBRIDGE_TICKETS;
    } catch {
      return INITIAL_WEIGHBRIDGE_TICKETS;
    }
  });

  const [selectedParcelId, setSelectedParcelId] = useState<string>('parc_01');

  // Persistence hooks
  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_parcels_v2', JSON.stringify(parcels));
    } catch {}
  }, [parcels]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_cycles_v2', JSON.stringify(cropCycles));
    } catch {}
  }, [cropCycles]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_treatments_v2', JSON.stringify(treatmentLogs));
    } catch {}
  }, [treatmentLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_workers_v2', JSON.stringify(workers));
    } catch {}
  }, [workers]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_pointages_v2', JSON.stringify(pointages));
    } catch {}
  }, [pointages]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_dairy_cows_v2', JSON.stringify(dairyCows));
    } catch {}
  }, [dairyCows]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_milking_v2', JSON.stringify(milkingRecords));
    } catch {}
  }, [milkingRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_weighbridge_v2', JSON.stringify(weighbridgeTickets));
    } catch {}
  }, [weighbridgeTickets]);

  // Parcel handlers
  const addParcel = (parcel: AgriParcel) => {
    setParcels((prev) => [parcel, ...prev]);
  };
  const updateParcel = (parcel: AgriParcel) => {
    setParcels((prev) => prev.map((p) => (p.id === parcel.id ? parcel : p)));
  };
  const deleteParcel = (id: string) => {
    setParcels((prev) => prev.filter((p) => p.id !== id));
  };

  // Crop cycle handlers
  const addCropCycle = (cycle: AgriCropCycle) => {
    setCropCycles((prev) => [cycle, ...prev]);
  };
  const updateCropCycle = (cycle: AgriCropCycle) => {
    setCropCycles((prev) => prev.map((c) => (c.id === cycle.id ? cycle : c)));
  };
  const deleteCropCycle = (id: string) => {
    setCropCycles((prev) => prev.filter((c) => c.id !== id));
  };

  // Treatment handlers
  const addTreatmentLog = (treatment: AgriTreatmentLog) => {
    setTreatmentLogs((prev) => [treatment, ...prev]);
    // If treatment has active DAR, update linked crop cycle
    if (treatment.cropCycleId && treatment.darDays > 0) {
      setCropCycles((prev) =>
        prev.map((c) => {
          if (c.id === treatment.cropCycleId) {
            return {
              ...c,
              currentPhase: 'treatment_locked',
              activeDarLockoutUntil: treatment.harvestAllowedDate,
              activePestWarning: `DAR Actif: ${treatment.commercialProductName} (${treatment.darDays}j)`,
            };
          }
          return c;
        })
      );
    }
  };
  const updateTreatmentLog = (treatment: AgriTreatmentLog) => {
    setTreatmentLogs((prev) => prev.map((t) => (t.id === treatment.id ? treatment : t)));
  };
  const deleteTreatmentLog = (id: string) => {
    setTreatmentLogs((prev) => prev.filter((t) => t.id !== id));
  };

  // Worker handlers
  const addWorker = (worker: AgriWorker) => {
    setWorkers((prev) => [worker, ...prev]);
  };
  const updateWorker = (worker: AgriWorker) => {
    setWorkers((prev) => prev.map((w) => (w.id === worker.id ? worker : w)));
  };
  const deleteWorker = (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
  };

  // Pointage handlers
  const addPointage = (pointage: AgriDailyPointage) => {
    setPointages((prev) => [pointage, ...prev]);
  };
  const updatePointage = (pointage: AgriDailyPointage) => {
    setPointages((prev) => prev.map((p) => (p.id === pointage.id ? pointage : p)));
  };
  const deletePointage = (id: string) => {
    setPointages((prev) => prev.filter((p) => p.id !== id));
  };

  // Dairy herd handlers
  const addDairyCow = (cow: AgriDairyCow) => {
    setDairyCows((prev) => [cow, ...prev]);
  };
  const updateDairyCow = (cow: AgriDairyCow) => {
    setDairyCows((prev) => prev.map((c) => (c.id === cow.id ? cow : c)));
  };
  const deleteDairyCow = (id: string) => {
    setDairyCows((prev) => prev.filter((c) => c.id !== id));
  };

  // Milking record handlers
  const addMilkingRecord = (record: AgriMilkingRecord) => {
    setMilkingRecords((prev) => [record, ...prev]);
  };
  const deleteMilkingRecord = (id: string) => {
    setMilkingRecords((prev) => prev.filter((m) => m.id !== id));
  };

  // Weighbridge ticket handlers
  const addWeighbridgeTicket = (ticket: AgriWeighbridgeTicket) => {
    setWeighbridgeTickets((prev) => [ticket, ...prev]);
  };
  const updateWeighbridgeTicket = (ticket: AgriWeighbridgeTicket) => {
    setWeighbridgeTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
  };
  const deleteWeighbridgeTicket = (id: string) => {
    setWeighbridgeTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset to default seed
  const resetToSeed = () => {
    setParcels(INITIAL_PARCELS);
    setCropCycles(INITIAL_CYCLES);
    setTreatmentLogs(INITIAL_TREATMENTS);
    setWorkers(INITIAL_WORKERS);
    setPointages(INITIAL_POINTAGES);
    setDairyCows(INITIAL_DAIRY_COWS);
    setMilkingRecords(INITIAL_MILKING_RECORDS);
    setWeighbridgeTickets(INITIAL_WEIGHBRIDGE_TICKETS);
  };

  return {
    parcels,
    cropCycles,
    treatmentLogs,
    workers,
    pointages,
    dairyCows,
    milkingRecords,
    weighbridgeTickets,
    selectedParcelId,
    setSelectedParcelId,
    addParcel,
    updateParcel,
    deleteParcel,
    addCropCycle,
    updateCropCycle,
    deleteCropCycle,
    addTreatmentLog,
    updateTreatmentLog,
    deleteTreatmentLog,
    addWorker,
    updateWorker,
    deleteWorker,
    addPointage,
    updatePointage,
    deletePointage,
    addDairyCow,
    updateDairyCow,
    deleteDairyCow,
    addMilkingRecord,
    deleteMilkingRecord,
    addWeighbridgeTicket,
    updateWeighbridgeTicket,
    deleteWeighbridgeTicket,
    resetToSeed,
    // Backwards-compatibility aliases
    harvestTickets: weighbridgeTickets,
    livestock: dairyCows,
    addHarvestTicket: addWeighbridgeTicket,
    updateHarvestTicket: updateWeighbridgeTicket,
    deleteHarvestTicket: deleteWeighbridgeTicket,
    addLivestock: addDairyCow,
    updateLivestock: updateDairyCow,
    deleteLivestock: deleteDairyCow,
  };
};
