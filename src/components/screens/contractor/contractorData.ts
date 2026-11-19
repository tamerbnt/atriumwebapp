import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ContractorProject,
  ContractorBoqItem,
  ContractorDailyLog,
  ContractorDgp,
  ContractorServiceOrder,
  ConcretePourRecord,
  SubcontractorAgreement,
  EquipmentLogRecord,
} from '../../../types/index';
import { useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import type { Dispatch, SetStateAction } from 'react';
import { isSupabaseConfigured, contractorService, realtimeService, syncCoordinator, runWithConcurrency } from '../../../lib/supabase';

function mergeContractorById<T extends { id: string }>(prev: T[], remote: T[]): T[] {
  if (remote.length === 0) return prev;
  const map = new Map<string, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}

export const INITIAL_CONTRACTOR_PROJECTS: ContractorProject[] = [
  {
    id: 'proj_btp_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectCode: 'CHANT-2026-08',
    projectName: 'Construction Siège Tertiaire & Bureaux R+5',
    clientName: 'SPA Maghreb Logistique & Services (Marché Privé)',
    siteLocation: 'Zone d\'Activité Chéraga, Alger',
    wilayaNumber: 16,
    contractAmountDzd: 85000000,
    retentionGuaranteePercent: 5,
    retentionAmountDzd: 4250000,
    hasBankCautionReplacement: false,
    startDate: '2026-01-15',
    targetEndDate: '2026-12-20',
    revisedEndDate: '2027-01-10',
    supervisorName: 'Ing. Mourad Benali',
    progressPercent: 48,
    status: 'InProgress',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'proj_btp_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectCode: 'CHANT-2026-14',
    projectName: 'Aménagement Voirie & Réseaux Divers (VRD) Lotissement 120 Lots',
    clientName: 'EURL Promotion Immobilière El Bahia',
    siteLocation: 'Bir El Djir, Oran',
    wilayaNumber: 31,
    contractAmountDzd: 34500000,
    retentionGuaranteePercent: 5,
    retentionAmountDzd: 1725000,
    hasBankCautionReplacement: false,
    startDate: '2026-03-01',
    targetEndDate: '2026-09-30',
    supervisorName: 'Conducteur Travaux Sofiane K.',
    progressPercent: 72,
    status: 'InProgress',
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'proj_btp_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectCode: 'CHANT-2025-22',
    projectName: 'Réhabilitation Hangar Frigorifique & Dallage Industriel Renforcé',
    clientName: 'Coopérative Agro-Alimentaire Mitidja',
    siteLocation: 'Boufarik, Blida',
    wilayaNumber: 9,
    contractAmountDzd: 18200000,
    retentionGuaranteePercent: 5,
    retentionAmountDzd: 910000,
    hasBankCautionReplacement: false,
    startDate: '2025-10-10',
    targetEndDate: '2026-04-15',
    supervisorName: 'Ing. Karim Hamdi',
    progressPercent: 100,
    status: 'ProvisionalHandover',
    createdAt: '2025-10-10T08:00:00Z',
  },
  {
    id: 'proj_btp_04',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectCode: 'CHANT-2026-31',
    projectName: 'Construction Groupe Scolaire 12 Classes & Logements d\'Astreinte',
    clientName: 'Direction du Logement et des Équipements Publics (DLEP BBA)',
    siteLocation: 'Zone Urbaine Nouvelle, Bordj Bou Arréridj',
    wilayaNumber: 34,
    contractAmountDzd: 124000000,
    retentionGuaranteePercent: 5,
    retentionAmountDzd: 6200000,
    hasBankCautionReplacement: true,
    bankCautionReference: 'CAUT-BNA-2026-9941',
    startDate: '2026-02-01',
    targetEndDate: '2027-04-30',
    supervisorName: 'Ing. Abdelkader Mansouri',
    progressPercent: 28,
    status: 'InProgress',
    createdAt: '2026-02-01T08:00:00Z',
  },
];

export const INITIAL_CONTRACTOR_BOQ_ITEMS: ContractorBoqItem[] = [
  {
    id: 'boq_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_01_GROS_OEUVRE',
    lotTitle: 'Gros Œuvre & Fondations',
    itemCode: '01.01',
    designation: 'Terrassement général en grande masse, déblai et évacuation à la décharge publique',
    unit: 'm3',
    plannedQty: 3200,
    executedQty: 3200,
    unitPriceDzd: 1800,
    totalPlannedDzd: 5760000,
    totalExecutedDzd: 5760000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_01_GROS_OEUVRE',
    lotTitle: 'Gros Œuvre & Fondations',
    itemCode: '01.02',
    designation: 'Béton de propreté dosé à 150 kg/m3 sous semelles et longrines (épaisseur 10cm)',
    unit: 'm3',
    plannedQty: 110,
    executedQty: 110,
    unitPriceDzd: 14500,
    totalPlannedDzd: 1595000,
    totalExecutedDzd: 1595000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_01_GROS_OEUVRE',
    lotTitle: 'Gros Œuvre & Fondations',
    itemCode: '01.03',
    designation: 'Béton armé dosé à 350 kg/m3 pour semelles filantes, isolées et longrines de liaison',
    unit: 'm3',
    plannedQty: 540,
    executedQty: 540,
    unitPriceDzd: 22000,
    totalPlannedDzd: 11880000,
    totalExecutedDzd: 11880000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_04',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_01_GROS_OEUVRE',
    lotTitle: 'Gros Œuvre & Fondations',
    itemCode: '01.04',
    designation: 'Béton armé en élévation pour poteaux, poutres et voiles de contreventement RDC à R+5',
    unit: 'm3',
    plannedQty: 780,
    executedQty: 420,
    unitPriceDzd: 26500,
    totalPlannedDzd: 20670000,
    totalExecutedDzd: 11130000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_05',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_01_GROS_OEUVRE',
    lotTitle: 'Gros Œuvre & Fondations',
    itemCode: '01.05',
    designation: 'Planchers corps creux type 16+4 avec hourdis ciment et dalle de compression avec treillis soudé',
    unit: 'm2',
    plannedQty: 2400,
    executedQty: 1200,
    unitPriceDzd: 3800,
    totalPlannedDzd: 9120000,
    totalExecutedDzd: 4560000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_06',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_02_MACONNERIE_ENDUITS',
    lotTitle: 'Maçonnerie & Plâtrerie',
    itemCode: '02.01',
    designation: 'Double cloison extérieure en briques creuses de 10cm et 15cm avec lame d\'air isolante 5cm',
    unit: 'm2',
    plannedQty: 1800,
    executedQty: 650,
    unitPriceDzd: 2400,
    totalPlannedDzd: 4320000,
    totalExecutedDzd: 1560000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_07',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_02_MACONNERIE_ENDUITS',
    lotTitle: 'Maçonnerie & Plâtrerie',
    itemCode: '02.02',
    designation: 'Enduit de mortier de ciment bâtard en 3 couches (gobetis, corps d\'enduit, couche de finition)',
    unit: 'm2',
    plannedQty: 3600,
    executedQty: 1100,
    unitPriceDzd: 1200,
    totalPlannedDzd: 4320000,
    totalExecutedDzd: 1320000,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: 'boq_08',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    lotCode: 'LOT_03_ETANCHEITE',
    lotTitle: 'Étanchéité & Isolation',
    itemCode: '03.01',
    designation: 'Complexe d\'étanchéité multicouche bitumineuse type 36S avec forme de pente et protection gravillon',
    unit: 'm2',
    plannedQty: 620,
    executedQty: 0,
    unitPriceDzd: 4800,
    totalPlannedDzd: 2976000,
    totalExecutedDzd: 0,
    createdAt: '2026-01-16T08:00:00Z',
  },
];

export const INITIAL_CONTRACTOR_DAILY_LOGS: ContractorDailyLog[] = [
  {
    id: 'log_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    date: '2026-05-18',
    logDate: '2026-05-18',
    weather: 'Ensoleillé',
    weatherCondition: 'Sunny',
    temperatureMinC: 18,
    temperatureMaxC: 28,
    hasWorkStoppage: false,
    stoppageHours: 0,
    cacobatphNoticeFiled: false,
    headcountWorkers: 26,
    workforceCount: 26,
    workersPresent: {
      engineers: 2,
      specializedCrafts: 14,
      laborers: 10,
    },
    equipmentOnSite: ['Grue à tour Potain 45m', '2x Camions Toupie 8m3', '1x Pompe à béton automotrice', 'Vibreurs thermiques'],
    tasksAccomplished: 'Coulage plancher dalle pleine niveau R+3 (180 m2). Coffrage et ferraillage des voiles cage ascenseur.',
    worksSummary: 'Coulage dalle R+3 terminé sans incident. Prélèvements d\'éprouvettes béton effectués sous contrôle CTC.',
    incidentsSafety: 'R.A.S. Port des EPI 100% vérifié. Essai affaissement au cône d\'Abrams conforme (14 cm).',
    ctcVisit: true,
    ctcObservationNotes: 'Avis Favorable de coulage émis par l\'ingénieur CTC Alger-Centre (PV N° CTC-2026-0518).',
    isSignedByBet: true,
    supervisorSignature: 'Ing. Mourad Benali',
    createdAt: '2026-05-18T17:30:00Z',
  },
  {
    id: 'log_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    date: '2026-05-17',
    logDate: '2026-05-17',
    weather: 'Venteux / Sirocco',
    weatherCondition: 'SandStorm',
    temperatureMinC: 22,
    temperatureMaxC: 38,
    hasWorkStoppage: true,
    stoppageReason: 'IntemperiesRain',
    stoppageHours: 4,
    cacobatphNoticeFiled: true,
    onmBulletinReference: 'ONM-ALGER-2026-0517-VENT',
    headcountWorkers: 18,
    workforceCount: 18,
    workersPresent: {
      engineers: 2,
      specializedCrafts: 10,
      laborers: 6,
    },
    equipmentOnSite: ['Grue à tour Potain (mise en girouette temporaire)', 'Échafaudages tubulaires'],
    tasksAccomplished: 'Pose du treillis soudé et des gaines électriques encastrées sous plancher R+3. Réception contradictoire ferraillage par BET.',
    worksSummary: 'Arrêt de travail en hauteur dès 13h suite aux rafales de vent dépassant 65 km/h.',
    incidentsSafety: 'Arrêt de travail en hauteur pendant 4h en milieu d\'après-midi pour rafales de vent > 65 km/h.',
    ctcVisit: false,
    isSignedByBet: true,
    supervisorSignature: 'Ing. Mourad Benali',
    createdAt: '2026-05-17T17:00:00Z',
  },
  {
    id: 'log_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    date: '2026-05-16',
    logDate: '2026-05-16',
    weather: 'Ensoleillé',
    weatherCondition: 'Sunny',
    temperatureMinC: 17,
    temperatureMaxC: 26,
    hasWorkStoppage: false,
    stoppageHours: 0,
    cacobatphNoticeFiled: false,
    headcountWorkers: 22,
    workforceCount: 22,
    workersPresent: {
      engineers: 2,
      specializedCrafts: 12,
      laborers: 8,
    },
    equipmentOnSite: ['Grue à tour Potain', 'Bétonnière d\'appoint 350L'],
    tasksAccomplished: 'Ferraillage des poutres principales travée B-C. Livraison de 18 tonnes de rond à béton FeE500 par Tosyali.',
    worksSummary: 'Réception aciers avec certificats d\'analyse d\'usine conformes.',
    incidentsSafety: 'R.A.S. Nettoyage et arrosage du fond de coffrage.',
    ctcVisit: false,
    isSignedByBet: false,
    supervisorSignature: 'Ing. Mourad Benali',
    createdAt: '2026-05-16T17:00:00Z',
  },
];

export const INITIAL_CONTRACTOR_DGPS: ContractorDgp[] = [
  {
    id: 'dgp_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    dgpNumber: 'DGP-01-CHANT-08',
    periodLabel: 'Situation N°01 - Travaux Février 2026',
    grossCompletedDzd: 17640000,
    previousCumulDzd: 0,
    periodGrossDzd: 17640000,
    retentionGuaranteePercent: 5,
    retentionGuaranteeDzd: 882000,
    hasBankCautionReplacement: false,
    advanceAmortizationDzd: 1764000,
    penaltiesDeductedDzd: 0,
    tvaPercent: 19,
    tvaAmountDzd: 2848860,
    netPayableDzd: 17842860,
    status: 'Paid',
    tresorMandatReference: 'MANDAT-TRESOR-16-0412',
    issuedDate: '2026-03-02',
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'dgp_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    dgpNumber: 'DGP-02-CHANT-08',
    periodLabel: 'Situation N°02 - Travaux Avril 2026',
    grossCompletedDzd: 34432000,
    previousCumulDzd: 17640000,
    periodGrossDzd: 16792000,
    retentionGuaranteePercent: 5,
    retentionGuaranteeDzd: 839600,
    hasBankCautionReplacement: false,
    advanceAmortizationDzd: 1679200,
    penaltiesDeductedDzd: 0,
    tvaPercent: 19,
    tvaAmountDzd: 2711864,
    netPayableDzd: 16985064,
    status: 'ApprovedBE',
    tresorMandatReference: 'MANDAT-EN-COURS-16',
    issuedDate: '2026-05-02',
    createdAt: '2026-05-02T11:00:00Z',
  },
  {
    id: 'dgp_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_04',
    dgpNumber: 'DGP-01-CHANT-31',
    periodLabel: 'Situation N°01 - Travaux Terrassements & Fondations Mars 2026',
    grossCompletedDzd: 34720000,
    previousCumulDzd: 0,
    periodGrossDzd: 34720000,
    retentionGuaranteePercent: 5,
    retentionGuaranteeDzd: 0, // Caution Bancaire active
    hasBankCautionReplacement: true,
    advanceAmortizationDzd: 5208000,
    penaltiesDeductedDzd: 0,
    tvaPercent: 19,
    tvaAmountDzd: 6596800,
    netPayableDzd: 36108800,
    status: 'SubmittedClient',
    issuedDate: '2026-04-10',
    createdAt: '2026-04-10T09:00:00Z',
  },
];

export const INITIAL_SERVICE_ORDERS: ContractorServiceOrder[] = [
  {
    id: 'os_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    osNumber: 'OS N° 01/2026',
    osType: 'Commencement',
    effectiveDate: '2026-01-15',
    notificationDate: '2026-01-14',
    reason: 'GeneralStart',
    durationDaysGranted: 340,
    issuerName: 'Bureau d\'Études Technique Arch-Design',
    hasReservationLetter: false,
    status: 'Executed',
    createdAt: '2026-01-14T09:00:00Z',
  },
  {
    id: 'os_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    osNumber: 'OS N° 02/2026',
    osType: 'Suspension',
    effectiveDate: '2026-02-18',
    notificationDate: '2026-02-18',
    reason: 'ObstacleSonelgaz',
    durationDaysGranted: 21,
    issuerName: 'Maître d\'Ouvrage SPA Maghreb Logistique',
    hasReservationLetter: true,
    status: 'Executed',
    createdAt: '2026-02-18T10:00:00Z',
  },
  {
    id: 'os_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    osNumber: 'OS N° 03/2026',
    osType: 'Resumption',
    effectiveDate: '2026-03-11',
    notificationDate: '2026-03-10',
    reason: 'GeneralStart',
    durationDaysGranted: 21,
    issuerName: 'Bureau d\'Études Technique Arch-Design',
    hasReservationLetter: false,
    status: 'Executed',
    createdAt: '2026-03-10T14:00:00Z',
  },
];

export const INITIAL_CONCRETE_POURS: ConcretePourRecord[] = [
  {
    id: 'pour_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    pourDate: '2026-04-12',
    elementPoured: 'Poteaux & Poutres RDC - Bloc Bureaux',
    supplierName: 'Béton Centre SARL (Centrale Oued Smar)',
    deliverySlipNumber: 'BL-BPE-8821',
    volumePouredM3: 42,
    concreteGrade: 'B25',
    slumpCm: 14,
    testCylindersTaken: 6,
    strength7DaysMpa: 19.2,
    strength28DaysMpa: 27.6,
    ctcClearanceObtained: true,
    status: 'Passed28D',
    createdAt: '2026-04-12T16:00:00Z',
  },
  {
    id: 'pour_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    pourDate: '2026-05-18',
    elementPoured: 'Plancher Dalle Pleine Niveau R+3 (180 m2)',
    supplierName: 'Béton Centre SARL (Centrale Oued Smar)',
    deliverySlipNumber: 'BL-BPE-9442',
    volumePouredM3: 48,
    concreteGrade: 'B25',
    slumpCm: 13,
    testCylindersTaken: 6,
    strength7DaysMpa: 18.4,
    ctcClearanceObtained: true,
    status: 'CastPending7D',
    createdAt: '2026-05-18T16:30:00Z',
  },
];

export const INITIAL_SUBCONTRACTORS: SubcontractorAgreement[] = [
  {
    id: 'sub_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    subcontractorName: 'SARL Bitume Sahel Étanchéité',
    tradeType: 'Étanchéité & Isolation Thermique',
    contactPhone: '+213 550 44 22 11',
    contractAmountDzd: 5400000,
    retentionPercent: 10,
    paidAmountDzd: 1800000,
    retentionHeldDzd: 180000,
    progressPercent: 35,
    quitusSigned: false,
    status: 'Active',
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'sub_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    subcontractorName: 'EURL Glass & Profil Menuiserie Alu',
    tradeType: 'Menuiserie Aluminium & Façade Rideau',
    contactPhone: '+213 561 88 99 00',
    contractAmountDzd: 8900000,
    retentionPercent: 5,
    paidAmountDzd: 0,
    retentionHeldDzd: 0,
    progressPercent: 0,
    quitusSigned: false,
    status: 'Active',
    createdAt: '2026-03-01T09:00:00Z',
  },
];

export const INITIAL_EQUIPMENT_LOGS: EquipmentLogRecord[] = [
  {
    id: 'eq_log_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    equipmentName: 'Grue à Tour Potain MDT 178',
    equipmentCategory: 'TowerCrane',
    matriculeNumber: 'GR-16-092',
    operatingHours: 8,
    fuelAddedLiters: 82,
    theoreticalHourlyBurnRate: 10,
    actualHourlyBurnRate: 10.25,
    hasOverconsumptionAlert: false,
    date: '2026-05-18',
    operatorName: 'Hakim Belkacem',
    createdAt: '2026-05-18T18:00:00Z',
  },
  {
    id: 'eq_log_02',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    equipmentName: 'Pelle Hydraulique Caterpillar 320D',
    equipmentCategory: 'Excavator',
    matriculeNumber: 'PEL-09-441',
    operatingHours: 7,
    fuelAddedLiters: 154,
    theoreticalHourlyBurnRate: 16,
    actualHourlyBurnRate: 22.0,
    hasOverconsumptionAlert: true,
    date: '2026-05-18',
    operatorName: 'Kamel Zerrouk',
    createdAt: '2026-05-18T18:00:00Z',
  },
  {
    id: 'eq_log_03',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
    projectId: 'proj_btp_01',
    equipmentName: 'Camion Benne 8x4 Sonacome HD120',
    equipmentCategory: 'DumpTruck',
    matriculeNumber: '00124-116-16',
    operatingHours: 9,
    fuelAddedLiters: 165,
    theoreticalHourlyBurnRate: 18,
    actualHourlyBurnRate: 18.33,
    hasOverconsumptionAlert: false,
    date: '2026-05-17',
    operatorName: 'Rachid Mebarki',
    createdAt: '2026-05-17T18:00:00Z',
  },
];

export const useContractorData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const activeBranchId = currentBranchId || 'branch_contractor_main';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_contractor_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      accountId: (item as { accountId?: string }).accountId || currentAccountId || 'acc_01',
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_contractor',
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      staffId: (item as { staffId?: string }).staffId || currentStaffId || 'staff_01',
    }) as T;

  const [projects, setProjects] = useState<ContractorProject[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_boq');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyLogs, setDailyLogs] = useState<ContractorDailyLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dgps, setDgps] = useState<ContractorDgp[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_dgps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [serviceOrders, setServiceOrders] = useState<ContractorServiceOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_os');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [concretePours, setConcretePours] = useState<ConcretePourRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_concrete');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [subcontractors, setSubcontractors] = useState<SubcontractorAgreement[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_subcontractors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_equipment');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useIdlePersist('atrium_contractor_projects', projects);
  useIdlePersist('atrium_contractor_boq', boqItems);
  useIdlePersist('atrium_contractor_logs', dailyLogs);
  useIdlePersist('atrium_contractor_dgps', dgps);
  useIdlePersist('atrium_contractor_os', serviceOrders);
  useIdlePersist('atrium_contractor_concrete', concretePours);
  useIdlePersist('atrium_contractor_subcontractors', subcontractors);
  useIdlePersist('atrium_contractor_equipment', equipmentLogs);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`contractor:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteProjects,
        remoteBoq,
        remoteLogs,
        remoteDgps,
        remoteOs,
        remotePours,
        remoteSubs,
        remoteEquipment,
      ] = await runWithConcurrency(
        [
          () => contractorService.fetchProjects(activeBranchId),
          () => contractorService.fetchBoqItems(activeBranchId),
          () => contractorService.fetchDailyLogs(activeBranchId),
          () => contractorService.fetchDgps(activeBranchId),
          () => contractorService.fetchServiceOrders(activeBranchId),
          () => contractorService.fetchConcretePours(activeBranchId),
          () => contractorService.fetchSubcontractors(activeBranchId),
          () => contractorService.fetchEquipmentLogs(activeBranchId),
        ],
        4
      );
      if (cancelled) return;
      if (remoteProjects.length > 0) setProjects((prev) => mergeContractorById(prev, remoteProjects as ContractorProject[]));
      if (remoteBoq.length > 0) setBoqItems((prev) => mergeContractorById(prev, remoteBoq as ContractorBoqItem[]));
      if (remoteLogs.length > 0) setDailyLogs((prev) => mergeContractorById(prev, remoteLogs as ContractorDailyLog[]));
      if (remoteDgps.length > 0) setDgps((prev) => mergeContractorById(prev, remoteDgps as ContractorDgp[]));
      if (remoteOs.length > 0) setServiceOrders((prev) => mergeContractorById(prev, remoteOs as ContractorServiceOrder[]));
      if (remotePours.length > 0) setConcretePours((prev) => mergeContractorById(prev, remotePours as ConcretePourRecord[]));
      if (remoteSubs.length > 0) setSubcontractors((prev) => mergeContractorById(prev, remoteSubs as SubcontractorAgreement[]));
      if (remoteEquipment.length > 0) setEquipmentLogs((prev) => mergeContractorById(prev, remoteEquipment as EquipmentLogRecord[]));
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'btp_projects',
      'btp_boq_items',
      'btp_daily_logs',
      'btp_decomptes',
      'btp_subcontractors',
      'btp_equipment',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: Dispatch<SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('btp_projects', setProjects);
      prune('btp_boq_items', setBoqItems);
      prune('btp_daily_logs', setDailyLogs);
      prune('btp_daily_logs', setServiceOrders);
      prune('btp_daily_logs', setConcretePours);
      prune('btp_decomptes', setDgps);
      prune('btp_subcontractors', setSubcontractors);
      prune('btp_equipment', setEquipmentLogs);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('btp_projects')) {
        tasks.push(async () => {
          const rows = await contractorService.fetchProjects(activeBranchId);
          if (!cancelled && rows.length > 0) setProjects((prev) => mergeContractorById(prev, rows as ContractorProject[]));
        });
      }
      if (changedSet.has('btp_boq_items')) {
        tasks.push(async () => {
          const rows = await contractorService.fetchBoqItems(activeBranchId);
          if (!cancelled && rows.length > 0) setBoqItems((prev) => mergeContractorById(prev, rows as ContractorBoqItem[]));
        });
      }
      if (changedSet.has('btp_daily_logs')) {
        tasks.push(
          async () => {
            const rows = await contractorService.fetchDailyLogs(activeBranchId);
            if (!cancelled && rows.length > 0) setDailyLogs((prev) => mergeContractorById(prev, rows as ContractorDailyLog[]));
          },
          async () => {
            const rows = await contractorService.fetchServiceOrders(activeBranchId);
            if (!cancelled && rows.length > 0) setServiceOrders((prev) => mergeContractorById(prev, rows as ContractorServiceOrder[]));
          },
          async () => {
            const rows = await contractorService.fetchConcretePours(activeBranchId);
            if (!cancelled && rows.length > 0) setConcretePours((prev) => mergeContractorById(prev, rows as ConcretePourRecord[]));
          }
        );
      }
      if (changedSet.has('btp_decomptes')) {
        tasks.push(async () => {
          const rows = await contractorService.fetchDgps(activeBranchId);
          if (!cancelled && rows.length > 0) setDgps((prev) => mergeContractorById(prev, rows as ContractorDgp[]));
        });
      }
      if (changedSet.has('btp_subcontractors')) {
        tasks.push(async () => {
          const rows = await contractorService.fetchSubcontractors(activeBranchId);
          if (!cancelled && rows.length > 0) setSubcontractors((prev) => mergeContractorById(prev, rows as SubcontractorAgreement[]));
        });
      }
      if (changedSet.has('btp_equipment')) {
        tasks.push(async () => {
          const rows = await contractorService.fetchEquipmentLogs(activeBranchId);
          if (!cancelled && rows.length > 0) setEquipmentLogs((prev) => mergeContractorById(prev, rows as EquipmentLogRecord[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `contractor:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
  }, [activeBranchId]);

  const addProject = (project: ContractorProject) => {
    const scoped = withBranch(project);
    setProjects((prev) => [scoped, ...prev]);
    void contractorService.upsertProject(scoped).catch(() => {});
  };

  const updateProject = (project: ContractorProject) => {
    const scoped = withBranch(project);
    setProjects((prev) => prev.map((p) => (p.id === scoped.id ? scoped : p)));
    void contractorService.upsertProject(scoped).catch(() => {});
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    void syncCoordinator.softDeleteRow('btp_projects', id, currentStaffId).catch(() => {});
  };

  const addBoqItem = (item: ContractorBoqItem) => {
    const scoped = withBranch(item);
    setBoqItems((prev) => [...prev, scoped]);
    void contractorService.upsertBoqItem(scoped).catch(() => {});
  };

  const updateBoqItem = (item: ContractorBoqItem) => {
    const scoped = withBranch(item);
    setBoqItems((prev) => prev.map((b) => (b.id === scoped.id ? scoped : b)));
    void contractorService.upsertBoqItem(scoped).catch(() => {});
  };

  const deleteBoqItem = (id: string) => {
    setBoqItems((prev) => prev.filter((b) => b.id !== id));
    void syncCoordinator.softDeleteRow('btp_boq_items', id, currentStaffId).catch(() => {});
  };

  const addDailyLog = (log: ContractorDailyLog) => {
    const scoped = withBranch(log);
    setDailyLogs((prev) => [scoped, ...prev]);
    void contractorService.upsertDailyLog(scoped).catch(() => {});
  };

  const addDgp = (dgp: ContractorDgp) => {
    const scoped = withBranch(dgp);
    setDgps((prev) => [scoped, ...prev]);
    void contractorService.upsertDgp(scoped).catch(() => {});
  };

  const updateDgpStatus = (id: string, status: ContractorDgp['status']) => {
    let updated: ContractorDgp | null = null;
    setDgps((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          updated = { ...d, status };
          return updated;
        }
        return d;
      })
    );
    if (updated) {
      void contractorService.upsertDgp(updated).catch(() => {});
    }
  };

  const addServiceOrder = (os: ContractorServiceOrder) => {
    const scoped = withBranch(os);
    setServiceOrders((prev) => [scoped, ...prev]);
    void contractorService.upsertServiceOrder(scoped).catch(() => {});
  };

  const addConcretePour = (pour: ConcretePourRecord) => {
    const scoped = withBranch(pour);
    setConcretePours((prev) => [scoped, ...prev]);
    void contractorService.upsertConcretePour(scoped).catch(() => {});
  };

  const addSubcontractor = (sub: SubcontractorAgreement) => {
    const scoped = withBranch(sub);
    setSubcontractors((prev) => [scoped, ...prev]);
    void contractorService.upsertSubcontractor(scoped).catch(() => {});
  };

  const addEquipmentLog = (log: EquipmentLogRecord) => {
    const scoped = withBranch(log);
    setEquipmentLogs((prev) => [scoped, ...prev]);
    void contractorService.upsertEquipmentLog(scoped).catch(() => {});
  };

  const resetContractorDemoData = () => {
    setProjects((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setBoqItems((prev) => prev.filter((b) => !belongsToActiveBranch(b)));
    setDailyLogs((prev) => prev.filter((l) => !belongsToActiveBranch(l)));
    setDgps((prev) => prev.filter((d) => !belongsToActiveBranch(d)));
    setServiceOrders((prev) => prev.filter((s) => !belongsToActiveBranch(s)));
    setConcretePours((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setSubcontractors((prev) => prev.filter((s) => !belongsToActiveBranch(s)));
    setEquipmentLogs((prev) => prev.filter((e) => !belongsToActiveBranch(e)));
  };

  const scopedProjects = useMemo(() => projects.filter(belongsToActiveBranch), [projects, belongsToActiveBranch]);
  const scopedBoqItems = useMemo(() => boqItems.filter(belongsToActiveBranch), [boqItems, belongsToActiveBranch]);
  const scopedDailyLogs = useMemo(() => dailyLogs.filter(belongsToActiveBranch), [dailyLogs, belongsToActiveBranch]);
  const scopedDgps = useMemo(() => dgps.filter(belongsToActiveBranch), [dgps, belongsToActiveBranch]);
  const scopedServiceOrders = useMemo(() => serviceOrders.filter(belongsToActiveBranch), [serviceOrders, belongsToActiveBranch]);
  const scopedConcretePours = useMemo(() => concretePours.filter(belongsToActiveBranch), [concretePours, belongsToActiveBranch]);
  const scopedSubcontractors = useMemo(() => subcontractors.filter(belongsToActiveBranch), [subcontractors, belongsToActiveBranch]);
  const scopedEquipmentLogs = useMemo(() => equipmentLogs.filter(belongsToActiveBranch), [equipmentLogs, belongsToActiveBranch]);

  return {
    projects: scopedProjects,
    boqItems: scopedBoqItems,
    dailyLogs: scopedDailyLogs,
    dgps: scopedDgps,
    serviceOrders: scopedServiceOrders,
    concretePours: scopedConcretePours,
    subcontractors: scopedSubcontractors,
    equipmentLogs: scopedEquipmentLogs,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    updateProject,
    deleteProject,
    addBoqItem,
    updateBoqItem,
    deleteBoqItem,
    addDailyLog,
    addDgp,
    updateDgpStatus,
    addServiceOrder,
    addConcretePour,
    addSubcontractor,
    addEquipmentLog,
    resetContractorDemoData,
  };
};
