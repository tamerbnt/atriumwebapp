import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import type { Dispatch, SetStateAction } from 'react';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import { isSupabaseConfigured, agricultureService, realtimeService, syncCoordinator, subscribeConcurrencyResolutions, runWithConcurrency } from '../../../lib/supabase';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';

function mergeAgriById<T extends { id: string }>(prev: T[], remote: T[]): T[] {
  if (remote.length === 0) return prev;
  const map = new Map<string, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}

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
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_agri_main';
  const activeBusinessId = currentBusinessId || 'biz_agri';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_agri_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      accountId:
        (item as { accountId?: string }).accountId ||
        currentAccountId ||
        (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_agri',
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      staffId: (item as { staffId?: string }).staffId || currentStaffId || '',
    }) as T;

  const [parcels, setParcels] = useState<AgriParcel[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_parcels_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cropCycles, setCropCycles] = useState<AgriCropCycle[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_cycles_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [treatmentLogs, setTreatmentLogs] = useState<AgriTreatmentLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_treatments_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [workers, setWorkers] = useState<AgriWorker[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_workers_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pointages, setPointages] = useState<AgriDailyPointage[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_pointages_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dairyCows, setDairyCows] = useState<AgriDairyCow[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_dairy_cows_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [milkingRecords, setMilkingRecords] = useState<AgriMilkingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_milking_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [weighbridgeTickets, setWeighbridgeTickets] = useState<AgriWeighbridgeTicket[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_weighbridge_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedParcelId, setSelectedParcelId] = useState<string>('parc_01');

  // Persistence hooks (idle-deferred)
  useIdlePersist('atrium_agri_parcels_v2', parcels);
  useIdlePersist('atrium_agri_cycles_v2', cropCycles);
  useIdlePersist('atrium_agri_treatments_v2', treatmentLogs);
  useIdlePersist('atrium_agri_workers_v2', workers);
  useIdlePersist('atrium_agri_pointages_v2', pointages);
  useIdlePersist('atrium_agri_dairy_cows_v2', dairyCows);
  useIdlePersist('atrium_agri_milking_v2', milkingRecords);
  useIdlePersist('atrium_agri_weighbridge_v2', weighbridgeTickets);

  // Hydrate agriculture domain records from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`agriculture:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteParcels,
        remoteCycles,
        remoteTreatments,
        remoteWorkers,
        remotePointages,
        remoteLivestock,
        remoteMilking,
        remoteHarvests,
      ] = await runWithConcurrency(
        [
          () => agricultureService.fetchParcels(activeBranchId),
          () => agricultureService.fetchCropCycles(activeBranchId),
          () => agricultureService.fetchTreatments(activeBranchId),
          () => agricultureService.fetchWorkers(activeBranchId),
          () => agricultureService.fetchPointages(activeBranchId),
          () => agricultureService.fetchLivestock(activeBranchId),
          () => agricultureService.fetchMilkingLogs(activeBranchId),
          () => agricultureService.fetchHarvestTickets(activeBranchId),
        ],
        4
      );
      if (cancelled) return;
      if (remoteParcels.length > 0) setParcels((prev) => mergeAgriById(prev, remoteParcels as AgriParcel[]));
      if (remoteCycles.length > 0) setCropCycles((prev) => mergeAgriById(prev, remoteCycles as AgriCropCycle[]));
      if (remoteTreatments.length > 0) setTreatmentLogs((prev) => mergeAgriById(prev, remoteTreatments as AgriTreatmentLog[]));
      if (remoteWorkers.length > 0) setWorkers((prev) => mergeAgriById(prev, remoteWorkers as AgriWorker[]));
      if (remotePointages.length > 0) setPointages((prev) => mergeAgriById(prev, remotePointages as AgriDailyPointage[]));
      if (remoteLivestock.length > 0) setDairyCows((prev) => mergeAgriById(prev, remoteLivestock as AgriDairyCow[]));
      if (remoteMilking.length > 0) setMilkingRecords((prev) => mergeAgriById(prev, remoteMilking as AgriMilkingRecord[]));
      if (remoteHarvests.length > 0) setWeighbridgeTickets((prev) => mergeAgriById(prev, remoteHarvests as AgriWeighbridgeTicket[]));
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'agri_parcels',
      'agri_crop_cycles',
      'agri_treatments',
      'agri_staff',
      'agri_sales',
      'agri_livestock',
      'agri_milking_logs',
      'agri_harvests',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: Dispatch<SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('agri_parcels', setParcels);
      prune('agri_crop_cycles', setCropCycles);
      prune('agri_treatments', setTreatmentLogs);
      prune('agri_staff', setWorkers);
      prune('agri_sales', setPointages);
      prune('agri_livestock', setDairyCows);
      prune('agri_milking_logs', setMilkingRecords);
      prune('agri_harvests', setWeighbridgeTickets);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('agri_parcels')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchParcels(activeBranchId);
          if (!cancelled && rows.length > 0) setParcels((prev) => mergeAgriById(prev, rows as AgriParcel[]));
        });
      }
      if (changedSet.has('agri_crop_cycles')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchCropCycles(activeBranchId);
          if (!cancelled && rows.length > 0) setCropCycles((prev) => mergeAgriById(prev, rows as AgriCropCycle[]));
        });
      }
      if (changedSet.has('agri_treatments')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchTreatments(activeBranchId);
          if (!cancelled && rows.length > 0) setTreatmentLogs((prev) => mergeAgriById(prev, rows as AgriTreatmentLog[]));
        });
      }
      if (changedSet.has('agri_staff')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchWorkers(activeBranchId);
          if (!cancelled && rows.length > 0) setWorkers((prev) => mergeAgriById(prev, rows as AgriWorker[]));
        });
      }
      if (changedSet.has('agri_sales')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchPointages(activeBranchId);
          if (!cancelled && rows.length > 0) setPointages((prev) => mergeAgriById(prev, rows as AgriDailyPointage[]));
        });
      }
      if (changedSet.has('agri_livestock')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchLivestock(activeBranchId);
          if (!cancelled && rows.length > 0) setDairyCows((prev) => mergeAgriById(prev, rows as AgriDairyCow[]));
        });
      }
      if (changedSet.has('agri_milking_logs')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchMilkingLogs(activeBranchId);
          if (!cancelled && rows.length > 0) setMilkingRecords((prev) => mergeAgriById(prev, rows as AgriMilkingRecord[]));
        });
      }
      if (changedSet.has('agri_harvests')) {
        tasks.push(async () => {
          const rows = await agricultureService.fetchHarvestTickets(activeBranchId);
          if (!cancelled && rows.length > 0) setWeighbridgeTickets((prev) => mergeAgriById(prev, rows as AgriWeighbridgeTicket[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `agriculture:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
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
      if (evt.table === 'agri_parcels') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchParcels(activeBranchId);
          if (!cancelled && rows.length > 0) setParcels((prev) => mergeAgriById(prev, rows as AgriParcel[]));
        });
      } else if (evt.table === 'agri_crop_cycles') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchCropCycles(activeBranchId);
          if (!cancelled && rows.length > 0) setCropCycles((prev) => mergeAgriById(prev, rows as AgriCropCycle[]));
        });
      } else if (evt.table === 'agri_treatments') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchTreatments(activeBranchId);
          if (!cancelled && rows.length > 0) setTreatmentLogs((prev) => mergeAgriById(prev, rows as AgriTreatmentLog[]));
        });
      } else if (evt.table === 'agri_staff') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchWorkers(activeBranchId);
          if (!cancelled && rows.length > 0) setWorkers((prev) => mergeAgriById(prev, rows as AgriWorker[]));
        });
      } else if (evt.table === 'agri_sales') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchPointages(activeBranchId);
          if (!cancelled && rows.length > 0) setPointages((prev) => mergeAgriById(prev, rows as AgriDailyPointage[]));
        });
      } else if (evt.table === 'agri_livestock') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchLivestock(activeBranchId);
          if (!cancelled && rows.length > 0) setDairyCows((prev) => mergeAgriById(prev, rows as AgriDairyCow[]));
        });
      } else if (evt.table === 'agri_milking_logs') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchMilkingLogs(activeBranchId);
          if (!cancelled && rows.length > 0) setMilkingRecords((prev) => mergeAgriById(prev, rows as AgriMilkingRecord[]));
        });
      } else if (evt.table === 'agri_harvests') {
        tasks.push(async () => {
          const rows = await agricultureService.fetchHarvestTickets(activeBranchId);
          if (!cancelled && rows.length > 0) setWeighbridgeTickets((prev) => mergeAgriById(prev, rows as AgriWeighbridgeTicket[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `agriculture:res:${activeBranchId}:${evt.table}`,
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
    parcels,
    cropCycles,
    treatmentLogs,
    workers,
    pointages,
    dairyCows,
    milkingRecords,
    weighbridgeTickets,
  });
  latestRef.current = {
    parcels,
    cropCycles,
    treatmentLogs,
    workers,
    pointages,
    dairyCows,
    milkingRecords,
    weighbridgeTickets,
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

  // Parcel handlers
  const addParcel = (parcel: AgriParcel) => {
    const scoped = withBranch(parcel);
    const snap = cloneSnapshot(scoped);
    setParcels((prev) => [scoped, ...prev]);
    void agricultureService.upsertParcel(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.code || scoped.name,
      summary: pickLocalizedText(language, {
        fr: `Parcelle ${scoped.name} ajoutée`,
        en: `Parcel ${scoped.name} added`,
        ar: `تمت إضافة القطعة ${scoped.name}`,
      }),
      undo: () => {
        setParcels((prev) => prev.filter((p) => p.id !== snap.id));
        void agricultureService.deleteParcel(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setParcels((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_parcels', re.id, currentStaffId)
          .then(() => agricultureService.upsertParcel(re))
          .catch(() => {});
      },
    });
  };

  const updateParcel = (parcel: AgriParcel) => {
    const scoped = withBranch(parcel);
    const existing = latestRef.current.parcels.find((p) => p.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setParcels((prev) => prev.map((p) => (p.id === scoped.id ? scoped : p)));
    void agricultureService.upsertParcel(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.code || nextSnap.name,
        summary: pickLocalizedText(language, {
          fr: `Parcelle ${nextSnap.name} modifiée`,
          en: `Parcel ${nextSnap.name} updated`,
          ar: `تم تعديل القطعة ${nextSnap.name}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setParcels((prev) => prev.map((p) => (p.id === prevCopy.id ? prevCopy : p)));
          void agricultureService.upsertParcel(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setParcels((prev) => prev.map((p) => (p.id === nextCopy.id ? nextCopy : p)));
          void agricultureService.upsertParcel(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteParcel = (id: string) => {
    const idx = latestRef.current.parcels.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.parcels[idx]) : null;
    setParcels((prev) => prev.filter((p) => p.id !== id));
    void agricultureService.deleteParcel(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.code || existing.name,
        summary: pickLocalizedText(language, {
          fr: `Parcelle ${existing.name} supprimée`,
          en: `Parcel ${existing.name} deleted`,
          ar: `تم حذف القطعة ${existing.name}`,
        }),
        undo: () => {
          restoreAt(setParcels, existing, idx);
          void syncCoordinator
            .restoreRow('agri_parcels', existing.id, currentStaffId)
            .then(() => agricultureService.upsertParcel(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setParcels((prev) => prev.filter((p) => p.id !== existing.id));
          void agricultureService.deleteParcel(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Crop cycle handlers
  const addCropCycle = (cycle: AgriCropCycle) => {
    const scoped = withBranch(cycle);
    const snap = cloneSnapshot(scoped);
    const parcelName = latestRef.current.parcels.find((p) => p.id === scoped.parcelId)?.name;
    setCropCycles((prev) => [scoped, ...prev]);
    void agricultureService.upsertCropCycle(scoped, parcelName).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.cropName,
      summary: pickLocalizedText(language, {
        fr: `Cycle cultural ${scoped.cropName} créé`,
        en: `Crop cycle ${scoped.cropName} created`,
        ar: `تم إنشاء الدورة الزراعية ${scoped.cropName}`,
      }),
      undo: () => {
        setCropCycles((prev) => prev.filter((c) => c.id !== snap.id));
        void agricultureService.deleteCropCycle(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setCropCycles((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_crop_cycles', re.id, currentStaffId)
          .then(() => agricultureService.upsertCropCycle(re, parcelName))
          .catch(() => {});
      },
    });
  };

  const updateCropCycle = (cycle: AgriCropCycle) => {
    const scoped = withBranch(cycle);
    const existing = latestRef.current.cropCycles.find((c) => c.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    const parcelName = latestRef.current.parcels.find((p) => p.id === scoped.parcelId)?.name;
    setCropCycles((prev) => prev.map((c) => (c.id === scoped.id ? scoped : c)));
    void agricultureService.upsertCropCycle(scoped, parcelName).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.cropName,
        summary: pickLocalizedText(language, {
          fr: `Cycle cultural ${nextSnap.cropName} modifié`,
          en: `Crop cycle ${nextSnap.cropName} updated`,
          ar: `تم تعديل الدورة الزراعية ${nextSnap.cropName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setCropCycles((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
          void agricultureService.upsertCropCycle(withBranch(prevCopy), parcelName).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setCropCycles((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
          void agricultureService.upsertCropCycle(nextCopy, parcelName).catch(() => {});
        },
      });
    }
  };

  const deleteCropCycle = (id: string) => {
    const idx = latestRef.current.cropCycles.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.cropCycles[idx]) : null;
    const parcelName = existing ? latestRef.current.parcels.find((p) => p.id === existing.parcelId)?.name : undefined;
    setCropCycles((prev) => prev.filter((c) => c.id !== id));
    void agricultureService.deleteCropCycle(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.cropName,
        summary: pickLocalizedText(language, {
          fr: `Cycle cultural ${existing.cropName} supprimé`,
          en: `Crop cycle ${existing.cropName} deleted`,
          ar: `تم حذف الدورة الزراعية ${existing.cropName}`,
        }),
        undo: () => {
          restoreAt(setCropCycles, existing, idx);
          void syncCoordinator
            .restoreRow('agri_crop_cycles', existing.id, currentStaffId)
            .then(() => agricultureService.upsertCropCycle(withBranch(cloneSnapshot(existing)), parcelName))
            .catch(() => {});
        },
        redo: () => {
          setCropCycles((prev) => prev.filter((c) => c.id !== existing.id));
          void agricultureService.deleteCropCycle(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Treatment handlers
  const addTreatmentLog = (treatment: AgriTreatmentLog) => {
    const scopedTreatment = withBranch(treatment);
    const snapTreatment = cloneSnapshot(scopedTreatment);
    const existingCycle =
      scopedTreatment.cropCycleId && scopedTreatment.darDays > 0
        ? latestRef.current.cropCycles.find((c) => c.id === scopedTreatment.cropCycleId)
        : undefined;
    const prevCycleSnap = existingCycle ? cloneSnapshot(existingCycle) : null;
    const updatedCycle: AgriCropCycle | null = existingCycle
      ? {
          ...existingCycle,
          currentPhase: 'treatment_locked',
          activeDarLockoutUntil: scopedTreatment.harvestAllowedDate,
          activePestWarning: `DAR Actif: ${scopedTreatment.commercialProductName} (${scopedTreatment.darDays}j)`,
        }
      : null;
    const nextCycleSnap = updatedCycle ? cloneSnapshot(updatedCycle) : null;
    const parcelName = updatedCycle
      ? latestRef.current.parcels.find((p) => p.id === updatedCycle.parcelId)?.name
      : undefined;

    setTreatmentLogs((prev) => [scopedTreatment, ...prev]);
    void agricultureService.upsertTreatment(scopedTreatment).catch(() => {});
    if (updatedCycle) {
      setCropCycles((prev) => prev.map((c) => (c.id === updatedCycle.id ? updatedCycle : c)));
      void agricultureService.upsertCropCycle(updatedCycle, parcelName).catch(() => {});
    }

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scopedTreatment.commercialProductName,
      summary: pickLocalizedText(language, {
        fr: `Traitement ${scopedTreatment.commercialProductName} enregistré`,
        en: `Treatment ${scopedTreatment.commercialProductName} recorded`,
        ar: `تم تسجيل المعالجة ${scopedTreatment.commercialProductName}`,
      }),
      undo: () => {
        setTreatmentLogs((prev) => prev.filter((t) => t.id !== snapTreatment.id));
        void agricultureService.deleteTreatment(snapTreatment.id, currentStaffId).catch(() => {});
        if (prevCycleSnap) {
          const prevCycleCopy = cloneSnapshot(prevCycleSnap);
          setCropCycles((prev) => prev.map((c) => (c.id === prevCycleCopy.id ? prevCycleCopy : c)));
          void agricultureService.upsertCropCycle(withBranch(prevCycleCopy), parcelName).catch(() => {});
        }
      },
      redo: () => {
        const re = cloneSnapshot(snapTreatment);
        setTreatmentLogs((prev) => (prev.some((t) => t.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_treatments', re.id, currentStaffId)
          .then(() => agricultureService.upsertTreatment(re))
          .catch(() => {});
        if (nextCycleSnap) {
          const nextCycleCopy = cloneSnapshot(nextCycleSnap);
          setCropCycles((prev) => prev.map((c) => (c.id === nextCycleCopy.id ? nextCycleCopy : c)));
          void agricultureService.upsertCropCycle(withBranch(nextCycleCopy), parcelName).catch(() => {});
        }
      },
    });
  };

  const updateTreatmentLog = (treatment: AgriTreatmentLog) => {
    const scoped = withBranch(treatment);
    const existing = latestRef.current.treatmentLogs.find((t) => t.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setTreatmentLogs((prev) => prev.map((t) => (t.id === scoped.id ? scoped : t)));
    void agricultureService.upsertTreatment(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.commercialProductName,
        summary: pickLocalizedText(language, {
          fr: `Traitement ${nextSnap.commercialProductName} modifié`,
          en: `Treatment ${nextSnap.commercialProductName} updated`,
          ar: `تم تعديل المعالجة ${nextSnap.commercialProductName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setTreatmentLogs((prev) => prev.map((t) => (t.id === prevCopy.id ? prevCopy : t)));
          void agricultureService.upsertTreatment(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setTreatmentLogs((prev) => prev.map((t) => (t.id === nextCopy.id ? nextCopy : t)));
          void agricultureService.upsertTreatment(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteTreatmentLog = (id: string) => {
    const idx = latestRef.current.treatmentLogs.findIndex((t) => t.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.treatmentLogs[idx]) : null;
    setTreatmentLogs((prev) => prev.filter((t) => t.id !== id));
    void agricultureService.deleteTreatment(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.commercialProductName,
        summary: pickLocalizedText(language, {
          fr: `Traitement ${existing.commercialProductName} supprimé`,
          en: `Treatment ${existing.commercialProductName} deleted`,
          ar: `تم حذف المعالجة ${existing.commercialProductName}`,
        }),
        undo: () => {
          restoreAt(setTreatmentLogs, existing, idx);
          void syncCoordinator
            .restoreRow('agri_treatments', existing.id, currentStaffId)
            .then(() => agricultureService.upsertTreatment(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setTreatmentLogs((prev) => prev.filter((t) => t.id !== existing.id));
          void agricultureService.deleteTreatment(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Worker handlers
  const addWorker = (worker: AgriWorker) => {
    const scoped = withBranch(worker);
    const snap = cloneSnapshot(scoped);
    setWorkers((prev) => [scoped, ...prev]);
    void agricultureService.upsertWorker(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.fullName,
      summary: pickLocalizedText(language, {
        fr: `Ouvrier ${scoped.fullName} ajouté`,
        en: `Worker ${scoped.fullName} added`,
        ar: `تمت إضافة العامل ${scoped.fullName}`,
      }),
      undo: () => {
        setWorkers((prev) => prev.filter((w) => w.id !== snap.id));
        void agricultureService.deleteWorker(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setWorkers((prev) => (prev.some((w) => w.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_staff', re.id, currentStaffId)
          .then(() => agricultureService.upsertWorker(re))
          .catch(() => {});
      },
    });
  };

  const updateWorker = (worker: AgriWorker) => {
    const scoped = withBranch(worker);
    const existing = latestRef.current.workers.find((w) => w.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setWorkers((prev) => prev.map((w) => (w.id === scoped.id ? scoped : w)));
    void agricultureService.upsertWorker(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.fullName,
        summary: pickLocalizedText(language, {
          fr: `Ouvrier ${nextSnap.fullName} modifié`,
          en: `Worker ${nextSnap.fullName} updated`,
          ar: `تم تعديل العامل ${nextSnap.fullName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setWorkers((prev) => prev.map((w) => (w.id === prevCopy.id ? prevCopy : w)));
          void agricultureService.upsertWorker(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setWorkers((prev) => prev.map((w) => (w.id === nextCopy.id ? nextCopy : w)));
          void agricultureService.upsertWorker(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteWorker = (id: string) => {
    const idx = latestRef.current.workers.findIndex((w) => w.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.workers[idx]) : null;
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    void agricultureService.deleteWorker(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.fullName,
        summary: pickLocalizedText(language, {
          fr: `Ouvrier ${existing.fullName} supprimé`,
          en: `Worker ${existing.fullName} deleted`,
          ar: `تم حذف العامل ${existing.fullName}`,
        }),
        undo: () => {
          restoreAt(setWorkers, existing, idx);
          void syncCoordinator
            .restoreRow('agri_staff', existing.id, currentStaffId)
            .then(() => agricultureService.upsertWorker(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setWorkers((prev) => prev.filter((w) => w.id !== existing.id));
          void agricultureService.deleteWorker(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Pointage handlers
  const addPointage = (pointage: AgriDailyPointage) => {
    const scoped = withBranch(pointage);
    const snap = cloneSnapshot(scoped);
    setPointages((prev) => [scoped, ...prev]);
    void agricultureService.upsertPointage(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.workerName,
      summary: pickLocalizedText(language, {
        fr: `Pointage ${scoped.workerName} (${scoped.date}) enregistré`,
        en: `Attendance ${scoped.workerName} (${scoped.date}) recorded`,
        ar: `تم تسجيل حضور ${scoped.workerName}`,
      }),
      undo: () => {
        setPointages((prev) => prev.filter((p) => p.id !== snap.id));
        void agricultureService.deletePointage(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setPointages((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_sales', `ptg_${re.id}`, currentStaffId)
          .then(() => agricultureService.upsertPointage(re))
          .catch(() => {});
      },
    });
  };

  const updatePointage = (pointage: AgriDailyPointage) => {
    const scoped = withBranch(pointage);
    const existing = latestRef.current.pointages.find((p) => p.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setPointages((prev) => prev.map((p) => (p.id === scoped.id ? scoped : p)));
    void agricultureService.upsertPointage(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.workerName,
        summary: pickLocalizedText(language, {
          fr: `Pointage ${nextSnap.workerName} modifié`,
          en: `Attendance ${nextSnap.workerName} updated`,
          ar: `تم تعديل حضور ${nextSnap.workerName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setPointages((prev) => prev.map((p) => (p.id === prevCopy.id ? prevCopy : p)));
          void agricultureService.upsertPointage(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setPointages((prev) => prev.map((p) => (p.id === nextCopy.id ? nextCopy : p)));
          void agricultureService.upsertPointage(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deletePointage = (id: string) => {
    const idx = latestRef.current.pointages.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.pointages[idx]) : null;
    setPointages((prev) => prev.filter((p) => p.id !== id));
    void agricultureService.deletePointage(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.workerName,
        summary: pickLocalizedText(language, {
          fr: `Pointage ${existing.workerName} supprimé`,
          en: `Attendance ${existing.workerName} deleted`,
          ar: `تم حذف حضور ${existing.workerName}`,
        }),
        undo: () => {
          restoreAt(setPointages, existing, idx);
          void syncCoordinator
            .restoreRow('agri_sales', `ptg_${existing.id}`, currentStaffId)
            .then(() => agricultureService.upsertPointage(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setPointages((prev) => prev.filter((p) => p.id !== existing.id));
          void agricultureService.deletePointage(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Dairy herd handlers
  const addDairyCow = (cow: AgriDairyCow) => {
    const scoped = withBranch(cow);
    const snap = cloneSnapshot(scoped);
    setDairyCows((prev) => [scoped, ...prev]);
    void agricultureService.upsertLivestock(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.earTagNumber,
      summary: pickLocalizedText(language, {
        fr: `Bovin ${scoped.earTagNumber} ajouté`,
        en: `Livestock ${scoped.earTagNumber} added`,
        ar: `تمت إضافة الماشية ${scoped.earTagNumber}`,
      }),
      undo: () => {
        setDairyCows((prev) => prev.filter((c) => c.id !== snap.id));
        void agricultureService.deleteLivestock(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setDairyCows((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_livestock', re.id, currentStaffId)
          .then(() => agricultureService.upsertLivestock(re))
          .catch(() => {});
      },
    });
  };

  const updateDairyCow = (cow: AgriDairyCow) => {
    const scoped = withBranch(cow);
    const existing = latestRef.current.dairyCows.find((c) => c.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setDairyCows((prev) => prev.map((c) => (c.id === scoped.id ? scoped : c)));
    void agricultureService.upsertLivestock(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.earTagNumber,
        summary: pickLocalizedText(language, {
          fr: `Bovin ${nextSnap.earTagNumber} modifié`,
          en: `Livestock ${nextSnap.earTagNumber} updated`,
          ar: `تم تعديل الماشية ${nextSnap.earTagNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setDairyCows((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
          void agricultureService.upsertLivestock(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setDairyCows((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
          void agricultureService.upsertLivestock(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteDairyCow = (id: string) => {
    const idx = latestRef.current.dairyCows.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.dairyCows[idx]) : null;
    setDairyCows((prev) => prev.filter((c) => c.id !== id));
    void agricultureService.deleteLivestock(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.earTagNumber,
        summary: pickLocalizedText(language, {
          fr: `Bovin ${existing.earTagNumber} supprimé`,
          en: `Livestock ${existing.earTagNumber} deleted`,
          ar: `تم حذف الماشية ${existing.earTagNumber}`,
        }),
        undo: () => {
          restoreAt(setDairyCows, existing, idx);
          void syncCoordinator
            .restoreRow('agri_livestock', existing.id, currentStaffId)
            .then(() => agricultureService.upsertLivestock(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setDairyCows((prev) => prev.filter((c) => c.id !== existing.id));
          void agricultureService.deleteLivestock(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Milking record handlers
  const addMilkingRecord = (record: AgriMilkingRecord) => {
    const scoped = withBranch(record);
    const snap = cloneSnapshot(scoped);
    setMilkingRecords((prev) => [scoped, ...prev]);
    void agricultureService.upsertMilkingLog(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: `${scoped.sessionDate} (${scoped.sessionPeriod})`,
      summary: pickLocalizedText(language, {
        fr: `Traite ${scoped.sessionDate} (${scoped.totalTankLiters}L) enregistrée`,
        en: `Milking ${scoped.sessionDate} (${scoped.totalTankLiters}L) recorded`,
        ar: `تم تسجيل الحلب ${scoped.sessionDate}`,
      }),
      undo: () => {
        setMilkingRecords((prev) => prev.filter((m) => m.id !== snap.id));
        void agricultureService.deleteMilkingLog(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setMilkingRecords((prev) => (prev.some((m) => m.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_milking_logs', re.id, currentStaffId)
          .then(() => agricultureService.upsertMilkingLog(re))
          .catch(() => {});
      },
    });
  };

  const deleteMilkingRecord = (id: string) => {
    const idx = latestRef.current.milkingRecords.findIndex((m) => m.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.milkingRecords[idx]) : null;
    setMilkingRecords((prev) => prev.filter((m) => m.id !== id));
    void agricultureService.deleteMilkingLog(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: `${existing.sessionDate} (${existing.sessionPeriod})`,
        summary: pickLocalizedText(language, {
          fr: `Traite ${existing.sessionDate} supprimée`,
          en: `Milking ${existing.sessionDate} deleted`,
          ar: `تم حذف سجل الحلب ${existing.sessionDate}`,
        }),
        undo: () => {
          restoreAt(setMilkingRecords, existing, idx);
          void syncCoordinator
            .restoreRow('agri_milking_logs', existing.id, currentStaffId)
            .then(() => agricultureService.upsertMilkingLog(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setMilkingRecords((prev) => prev.filter((m) => m.id !== existing.id));
          void agricultureService.deleteMilkingLog(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Weighbridge ticket handlers
  const addWeighbridgeTicket = (ticket: AgriWeighbridgeTicket) => {
    const scoped = withBranch(ticket);
    const snap = cloneSnapshot(scoped);
    const fallbackParcelId = selectedParcelId || latestRef.current.parcels[0]?.id || 'parc_01';
    setWeighbridgeTickets((prev) => [scoped, ...prev]);
    void agricultureService.upsertHarvestTicket(scoped, fallbackParcelId).catch(() => {});

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.ticketNumber || scoped.cropDesignation,
      summary: pickLocalizedText(language, {
        fr: `Ticket pont-bascule ${scoped.ticketNumber} créé`,
        en: `Weighbridge ticket ${scoped.ticketNumber} created`,
        ar: `تم إنشاء تذكرة الميزان ${scoped.ticketNumber}`,
      }),
      undo: () => {
        setWeighbridgeTickets((prev) => prev.filter((t) => t.id !== snap.id));
        void agricultureService.deleteHarvestTicket(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setWeighbridgeTickets((prev) => (prev.some((t) => t.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('agri_harvests', re.id, currentStaffId)
          .then(() => agricultureService.upsertHarvestTicket(re, fallbackParcelId))
          .catch(() => {});
      },
    });
  };

  const updateWeighbridgeTicket = (ticket: AgriWeighbridgeTicket) => {
    const scoped = withBranch(ticket);
    const existing = latestRef.current.weighbridgeTickets.find((t) => t.id === scoped.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    const fallbackParcelId = selectedParcelId || latestRef.current.parcels[0]?.id || 'parc_01';
    setWeighbridgeTickets((prev) => prev.map((t) => (t.id === scoped.id ? scoped : t)));
    void agricultureService.upsertHarvestTicket(scoped, fallbackParcelId).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.ticketNumber || nextSnap.cropDesignation,
        summary: pickLocalizedText(language, {
          fr: `Ticket pont-bascule ${nextSnap.ticketNumber} modifié`,
          en: `Weighbridge ticket ${nextSnap.ticketNumber} updated`,
          ar: `تم تعديل تذكرة الميزان ${nextSnap.ticketNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setWeighbridgeTickets((prev) => prev.map((t) => (t.id === prevCopy.id ? prevCopy : t)));
          void agricultureService.upsertHarvestTicket(withBranch(prevCopy), fallbackParcelId).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setWeighbridgeTickets((prev) => prev.map((t) => (t.id === nextCopy.id ? nextCopy : t)));
          void agricultureService.upsertHarvestTicket(nextCopy, fallbackParcelId).catch(() => {});
        },
      });
    }
  };

  const deleteWeighbridgeTicket = (id: string) => {
    const idx = latestRef.current.weighbridgeTickets.findIndex((t) => t.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.weighbridgeTickets[idx]) : null;
    const fallbackParcelId = selectedParcelId || latestRef.current.parcels[0]?.id || 'parc_01';
    setWeighbridgeTickets((prev) => prev.filter((t) => t.id !== id));
    void agricultureService.deleteHarvestTicket(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'agriculture_farming',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.ticketNumber || existing.cropDesignation,
        summary: pickLocalizedText(language, {
          fr: `Ticket pont-bascule ${existing.ticketNumber} supprimé`,
          en: `Weighbridge ticket ${existing.ticketNumber} deleted`,
          ar: `تم حذف تذكرة الميزان ${existing.ticketNumber}`,
        }),
        undo: () => {
          restoreAt(setWeighbridgeTickets, existing, idx);
          void syncCoordinator
            .restoreRow('agri_harvests', existing.id, currentStaffId)
            .then(() => agricultureService.upsertHarvestTicket(withBranch(cloneSnapshot(existing)), fallbackParcelId))
            .catch(() => {});
        },
        redo: () => {
          setWeighbridgeTickets((prev) => prev.filter((t) => t.id !== existing.id));
          void agricultureService.deleteHarvestTicket(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Reset active branch data to empty state
  const resetToSeed = () => {
    const snap = cloneSnapshot(latestRef.current);
    setParcels((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setCropCycles((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setTreatmentLogs((prev) => prev.filter((t) => !belongsToActiveBranch(t)));
    setWorkers((prev) => prev.filter((w) => !belongsToActiveBranch(w)));
    setPointages((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setDairyCows((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setMilkingRecords((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setWeighbridgeTickets((prev) => prev.filter((t) => !belongsToActiveBranch(t)));

    registerUndoEntry({
      vertical: 'agriculture_farming',
      operationType: 'bulk',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données exploitation agricole réinitialisées',
        en: 'Agriculture data reset',
        ar: 'تمت إعادة ضبط بيانات الاستغلال الفلاحي',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setParcels(s.parcels);
        setCropCycles(s.cropCycles);
        setTreatmentLogs(s.treatmentLogs);
        setWorkers(s.workers);
        setPointages(s.pointages);
        setDairyCows(s.dairyCows);
        setMilkingRecords(s.milkingRecords);
        setWeighbridgeTickets(s.weighbridgeTickets);
      },
    });
  };

  const scopedParcels = useMemo(() => parcels.filter(belongsToActiveBranch), [parcels, belongsToActiveBranch]);
  const scopedCropCycles = useMemo(() => cropCycles.filter(belongsToActiveBranch), [cropCycles, belongsToActiveBranch]);
  const scopedTreatmentLogs = useMemo(() => treatmentLogs.filter(belongsToActiveBranch), [treatmentLogs, belongsToActiveBranch]);
  const scopedWorkers = useMemo(() => workers.filter(belongsToActiveBranch), [workers, belongsToActiveBranch]);
  const scopedPointages = useMemo(() => pointages.filter(belongsToActiveBranch), [pointages, belongsToActiveBranch]);
  const scopedDairyCows = useMemo(() => dairyCows.filter(belongsToActiveBranch), [dairyCows, belongsToActiveBranch]);
  const scopedMilkingRecords = useMemo(() => milkingRecords.filter(belongsToActiveBranch), [milkingRecords, belongsToActiveBranch]);
  const scopedWeighbridgeTickets = useMemo(() => weighbridgeTickets.filter(belongsToActiveBranch), [weighbridgeTickets, belongsToActiveBranch]);

  return {
    parcels: scopedParcels,
    cropCycles: scopedCropCycles,
    treatmentLogs: scopedTreatmentLogs,
    workers: scopedWorkers,
    pointages: scopedPointages,
    dairyCows: scopedDairyCows,
    milkingRecords: scopedMilkingRecords,
    weighbridgeTickets: scopedWeighbridgeTickets,
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
    harvestTickets: scopedWeighbridgeTickets,
    livestock: scopedDairyCows,
    addHarvestTicket: addWeighbridgeTicket,
    updateHarvestTicket: updateWeighbridgeTicket,
    deleteHarvestTicket: deleteWeighbridgeTicket,
    addLivestock: addDairyCow,
    updateLivestock: updateDairyCow,
    deleteLivestock: deleteDairyCow,
  };
};
