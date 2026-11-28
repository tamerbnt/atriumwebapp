import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { atriumActions, useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import {
  isSupabaseConfigured,
  garageService,
  realtimeService,
  syncCoordinator,
  subscribeConcurrencyResolutions,
  runWithConcurrency,
} from '../../../lib/supabase/index';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';
import type { GarageTechCommission } from '../../../types';
import {
  captureQuoteUnitPricesSnapshot,
  computeFlatRateLaborLine,
  createSupplierPurchaseOrder,
  evaluateBayAssignment,
  prepareWorkOrderReopenWithCreditNote,
  receivePurchaseOrderGoods,
  startTechTimeLog,
  stopTechTimeLog,
  transferVehicleOwnership,
  type BodyShopInsuranceClaim,
  type DetailingPackage,
  type FlatRateLaborItem,
  type GarageEstimatePhoto,
  type GaragePlateFormat,
  type GaragePurchaseOrderLine,
  type GaragePurchaseOrderRecord,
  type GarageSupplierRecord,
  type GarageVehicleType,
  type InspectionCenterPv,
  type OrderLaborLine,
  type TechnicianTimeLog,
  type TireStorageEntry,
  type VehicleOwnershipHistoryEntry,
} from '../../../utils/garageDepth';

export type {
  BodyShopInsuranceClaim,
  DetailingPackage,
  FlatRateLaborItem,
  GarageEstimatePhoto,
  GaragePlateFormat,
  GaragePurchaseOrderLine,
  GaragePurchaseOrderRecord,
  GarageSupplierRecord,
  GarageVehicleType,
  InspectionCenterPv,
  OrderLaborLine,
  TechnicianTimeLog,
  TireStorageEntry,
  VehicleOwnershipHistoryEntry,
};

const GARAGE_SYNC_EVENT = 'atrium-garage-sync';

function emitGarageSync(key: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GARAGE_SYNC_EVENT, { detail: { key } }));
  }
}

function mergeGarageById<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  if (!remoteItems || remoteItems.length === 0) return localItems;
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  remoteItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export interface DamageMarker {
  id: string;
  view: 'front' | 'rear' | 'left' | 'right' | 'roof' | 'glass';
  xPercent: number; // 0 to 100 on schematic canvas
  yPercent: number;
  damageType: 'scratch' | 'dent' | 'crack' | 'missing_part' | 'paint_chip';
  severity: 'minor' | 'moderate' | 'severe';
  notes?: string;
}

export interface WorkshopBay {
  id: string;
  branchId: string;
  bayNumber: number;
  name: string;
  bayType: 'lift_2post' | 'lift_4post' | 'pit' | 'diagnostic_electric' | 'wash_prep';
  maxTonnage: number;
  isOccupied: boolean;
  activeOrderId?: string;
  assignedTechnicianName?: string;
  version?: number;
}

export interface CorporateFleetAccount {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  companyName: string;
  tradeName: string;
  contactPerson: string;
  phone: string;
  email: string;
  nif: string; // 15 digits
  nis: string;
  rcNumber: string;
  articleImposition: string;
  creditLimitDzd: number;
  currentOutstandingDzd: number;
  paymentTermsDays: number; // 30, 45, 60
  negotiatedHourlyRateDzd: number;
  partsDiscountPercent: number;
  activeVehicleCount: number;
  contractActive: boolean;
  version?: number;
}

export interface RequisitionedPartLine {
  id: string;
  partId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPriceDzd: number;
  totalPriceDzd: number;
  issuedAt?: string;
}

export interface RepairOrder {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  orderNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientName: string;
  clientPhone: string;
  clientType?: 'individual' | 'corporate_fleet';
  fleetId?: string;
  fleetName?: string;
  intakeDate: string;
  promisedDate?: string;
  diagnosticNotes: string;
  status: 'Intake' | 'Diagnostic' | 'WaitingApproval' | 'WaitingParts' | 'InRepair' | 'Testing' | 'ReadyForPickup' | 'Delivered';
  estimatedCostDzd: number;
  finalCostDzd: number;
  laborHoursEstimated?: number;
  laborHoursActual?: number;
  hourlyRateDzd?: number;
  laborCostDzd?: number;
  partsCostDzd?: number;
  partsUsed: RequisitionedPartLine[];
  technicianName: string;
  assignedBayId?: string;
  bayName?: string;
  fuelLevel?: '0' | '25' | '50' | '75' | '100';
  inOdometerKm?: number;
  isVehicleDirty?: boolean;
  damageMarkers?: DamageMarker[];
  clientSignatureSvg?: string;
  clientCrmPartyId?: string;
  technicianChecklist?: Array<{ id: string; label: string; done: boolean }>;
  laborLines?: OrderLaborLine[];
  mileageOverrideReason?: string;
  estimateStatus?: 'draft' | 'sent' | 'approved' | 'rejected';
  estimateApprovedAt?: string;
  estimateApprovedBy?: string;
  estimatePhotos?: GarageEstimatePhoto[];
  quoteUnitPricesSnapshot?: Record<string, number>;
  detailingPackageId?: string;
  isLockedInvoiced?: boolean;
  reopenCreditNoteId?: string;
  reopenCreditNoteNumber?: string;
  reopenReason?: string;
  reopenedAt?: string;
  unifiedDocumentId?: string;
  journalEntryId?: string;
  billingType?: 'bon_caisse' | 'facture_dgi';
  isPaid?: boolean;
  invoiceId?: string;
  version?: number;
}

export interface VehicleAsset {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  crmPartyId?: string;
  vehicleType?: GarageVehicleType;
  plateFormat?: GaragePlateFormat;
  plateNumber: string; // e.g. "00142-118-16"
  brand: string;
  model: string;
  year: number;
  vin: string;
  fuelType?: 'Diesel' | 'Essence' | 'GPL' | 'Hybride';
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  isFleet?: boolean;
  fleetId?: string;
  fleetName?: string;
  mileageKm: number;
  lastServiceKm?: number;
  lastServiceDate?: string;
  nextServiceKm?: number;
  nextServiceDate?: string;
  dailyAvgKm?: number;
  techControlExpiry?: string;
  insuranceExpiry?: string;
  carteGriseNumber?: string;
  ownershipHistory?: VehicleOwnershipHistoryEntry[];
  notes?: string;
  version?: number;
}

export interface SparePart {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
  sku: string;
  oemReference?: string;
  name: string;
  brand?: string;
  category: 'Filtration' | 'Freinage' | 'Suspension' | 'Moteur' | 'Électrique' | 'Huiles & Fluides';
  stockQuantity: number;
  minThreshold: number;
  buyingPriceDzd: number;
  sellingPriceDzd: number;
  locationBin: string; // e.g. "Rayon B-02"
  unit?: 'piece' | 'litre' | 'jeu' | 'kit';
  supplierId?: string;
  supplierName?: string;
  defaultWarrantyMonths?: number;
  compatibility?: string[];
  createdAt?: string;
  version?: number;
}

export interface GarageInvoice {
  id: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  invoiceNumber: string; // e.g. "FAC-2026-00128" or "BC-2026-00431"
  orderId: string;
  orderNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientType: 'individual' | 'corporate_fleet';
  clientNif?: string;
  clientNis?: string;
  clientRc?: string;
  clientAi?: string;
  billingType: 'facture_dgi' | 'bon_caisse';
  paymentMethod: 'especes' | 'cib_dahabia' | 'cheque' | 'virement';
  laborTotalHt: number;
  partsTotalHt: number;
  discountHt: number;
  subtotalHt: number;
  tvaRate: number; // 19%
  tvaAmount: number;
  totalTtc: number;
  timbreFiscal: number;
  netToPayDzd: number;
  issuedAt: string;
  isPaid: boolean;
  version?: number;
}

export interface GarageCashClosure {
  id: string;
  branchId: string;
  businessId: string;
  accountId: string;
  zNumber: string;
  closedAt: string;
  closedBy: string;
  cashTotalDzd: number;
  cardTotalDzd: number;
  transferTotalDzd: number;
  checkTotalDzd: number;
  timbreFiscalTotalDzd: number;
  grandTotalDzd: number;
  invoiceCount: number;
}

// ----------------------------------------------------------------------
// Algerian Initial Seed Data
// ----------------------------------------------------------------------

export const INITIAL_BAYS: WorkshopBay[] = [
  {
    id: 'bay_01',
    branchId: 'branch_garage_main',
    bayNumber: 1,
    name: 'Pont 1 (2 Colonnes - 4.0T)',
    bayType: 'lift_2post',
    maxTonnage: 4.0,
    isOccupied: true,
    activeOrderId: 'ro_01',
    assignedTechnicianName: 'Karim (Chef Atelier)',
  },
  {
    id: 'bay_02',
    branchId: 'branch_garage_main',
    bayNumber: 2,
    name: 'Pont 2 (2 Colonnes - 3.5T)',
    bayType: 'lift_2post',
    maxTonnage: 3.5,
    isOccupied: false,
    assignedTechnicianName: 'Farid (Mécanicien)',
  },
  {
    id: 'bay_03',
    branchId: 'branch_garage_main',
    bayNumber: 3,
    name: 'Pont 3 (4 Colonnes - 5.0T VU/Flottes)',
    bayType: 'lift_4post',
    maxTonnage: 5.0,
    isOccupied: true,
    activeOrderId: 'ro_03',
    assignedTechnicianName: 'Farid (Mécanicien)',
  },
  {
    id: 'bay_04',
    branchId: 'branch_garage_main',
    bayNumber: 4,
    name: 'Pont 4 (Fosse Rapide - Vidange & Filtres)',
    bayType: 'pit',
    maxTonnage: 6.0,
    isOccupied: false,
    assignedTechnicianName: 'Yassine (Technicien Entretien)',
  },
  {
    id: 'bay_05',
    branchId: 'branch_garage_main',
    bayNumber: 5,
    name: 'Baie 5 (Électronique & Valise OBD-II)',
    bayType: 'diagnostic_electric',
    maxTonnage: 3.0,
    isOccupied: true,
    activeOrderId: 'ro_02',
    assignedTechnicianName: 'Amine (Électricien Auto)',
  },
  {
    id: 'bay_06',
    branchId: 'branch_garage_main',
    bayNumber: 6,
    name: 'Baie 6 (Contrôle Qualité & Lavage Sortie)',
    bayType: 'wash_prep',
    maxTonnage: 3.5,
    isOccupied: false,
  },
];

export const INITIAL_FLEETS: CorporateFleetAccount[] = [
  {
    id: 'fleet_01',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    companyName: 'SARL Logistique Express Algérie',
    tradeName: 'Express Colis DZ',
    contactPerson: 'Mourad Benali (Dir. Logistique)',
    phone: '0560 11 22 33',
    email: 'm.benali@express-dz.com',
    nif: '001916012345678',
    nis: '00191601234',
    rcNumber: '16/00-1234567B19',
    articleImposition: '16123456789',
    creditLimitDzd: 600000,
    currentOutstandingDzd: 185000,
    paymentTermsDays: 30,
    negotiatedHourlyRateDzd: 2000,
    partsDiscountPercent: 10,
    activeVehicleCount: 16,
    contractActive: true,
  },
  {
    id: 'fleet_02',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    companyName: 'EURL Maghreb Pharma Distribution',
    tradeName: 'PharmaDist Blida',
    contactPerson: 'Dr. Samy Oualid',
    phone: '0661 44 55 66',
    email: 'direction@pharmadist.dz',
    nif: '001816098765432',
    nis: '00181609876',
    rcNumber: '09/00-9876543B18',
    articleImposition: '09098765432',
    creditLimitDzd: 450000,
    currentOutstandingDzd: 92000,
    paymentTermsDays: 45,
    negotiatedHourlyRateDzd: 2200,
    partsDiscountPercent: 8,
    activeVehicleCount: 11,
    contractActive: true,
  },
  {
    id: 'fleet_03',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    companyName: 'SARL Atlas Travaux BTP',
    tradeName: 'Atlas BTP Oran',
    contactPerson: 'Ing. Rachid Meziani',
    phone: '0770 12 34 56',
    email: 'contact@atlas-btp.dz',
    nif: '001531011223344',
    nis: '00153101122',
    rcNumber: '31/00-4455667B15',
    articleImposition: '31445566778',
    creditLimitDzd: 350000,
    currentOutstandingDzd: 28000,
    paymentTermsDays: 30,
    negotiatedHourlyRateDzd: 2100,
    partsDiscountPercent: 5,
    activeVehicleCount: 7,
    contractActive: true,
  },
];

export const INITIAL_VEHICLES: VehicleAsset[] = [
  {
    id: 'veh_01',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '00142-118-16',
    brand: 'Renault',
    model: 'Clio 4 (1.5 dCi 85ch)',
    year: 2018,
    vin: 'VF15R240A59123456',
    fuelType: 'Diesel',
    ownerName: 'Sofiane Mansouri',
    ownerPhone: '0550 44 22 11',
    ownerEmail: 'sofiane.mansouri@gmail.com',
    isFleet: false,
    mileageKm: 142500,
    lastServiceKm: 135000,
    lastServiceDate: '2026-01-15',
    nextServiceKm: 145000,
    dailyAvgKm: 45,
    carteGriseNumber: 'CG-16-992144',
  },
  {
    id: 'veh_02',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '09845-120-09',
    brand: 'Peugeot',
    model: '208 (1.2 PureTech 82ch)',
    year: 2020,
    vin: 'VF3CCZM6HMT098765',
    fuelType: 'Essence',
    ownerName: 'Nadia Boubekeur',
    ownerPhone: '0661 78 90 12',
    ownerEmail: 'nadia.boubekeur@yahoo.fr',
    isFleet: false,
    mileageKm: 68500,
    lastServiceKm: 60000,
    lastServiceDate: '2025-11-20',
    nextServiceKm: 70000,
    dailyAvgKm: 35,
    carteGriseNumber: 'CG-09-551209',
  },
  {
    id: 'veh_03',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '11245-115-31',
    brand: 'Toyota',
    model: 'Hilux Double Cabine 4x4 (2.4 D-4D)',
    year: 2019,
    vin: 'MR0FR22G901554433',
    fuelType: 'Diesel',
    ownerName: 'SARL Atlas Travaux BTP',
    ownerPhone: '0770 12 34 56',
    ownerEmail: 'contact@atlas-btp.dz',
    isFleet: true,
    fleetId: 'fleet_03',
    fleetName: 'SARL Atlas Travaux BTP',
    mileageKm: 185200,
    lastServiceKm: 175000,
    lastServiceDate: '2026-02-10',
    nextServiceKm: 185000,
    dailyAvgKm: 110,
    carteGriseNumber: 'CG-31-881231',
  },
  {
    id: 'veh_04',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '03412-119-16',
    brand: 'Peugeot',
    model: 'Partner Fourgonnette (1.6 HDi 90ch)',
    year: 2019,
    vin: 'VF37B9HN0KJ034129',
    fuelType: 'Diesel',
    ownerName: 'SARL Logistique Express Algérie',
    ownerPhone: '0560 11 22 33',
    ownerEmail: 'm.benali@express-dz.com',
    isFleet: true,
    fleetId: 'fleet_01',
    fleetName: 'SARL Logistique Express Algérie',
    mileageKm: 215400,
    lastServiceKm: 205000,
    lastServiceDate: '2026-03-01',
    nextServiceKm: 215000,
    dailyAvgKm: 140,
    carteGriseNumber: 'CG-16-120044',
  },
  {
    id: 'veh_05',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '05521-121-16',
    brand: 'Dacia',
    model: 'Duster 4x2 (1.5 dCi 110ch)',
    year: 2021,
    vin: 'UU1HSDMC665521098',
    fuelType: 'Diesel',
    ownerName: 'EURL Maghreb Pharma Distribution',
    ownerPhone: '0661 44 55 66',
    ownerEmail: 'direction@pharmadist.dz',
    isFleet: true,
    fleetId: 'fleet_02',
    fleetName: 'EURL Maghreb Pharma Distribution',
    mileageKm: 94200,
    lastServiceKm: 85000,
    lastServiceDate: '2026-02-18',
    nextServiceKm: 95000,
    dailyAvgKm: 90,
    carteGriseNumber: 'CG-16-774411',
  },
  {
    id: 'veh_06',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    plateNumber: '08123-117-16',
    brand: 'Volkswagen',
    model: 'Golf 7 (2.0 TDI 143ch)',
    year: 2017,
    vin: 'WVWZZZAUZHP081234',
    fuelType: 'Diesel',
    ownerName: 'Kamel Zerrouki',
    ownerPhone: '0555 88 99 00',
    ownerEmail: 'kamel.zerrouki@gmail.com',
    isFleet: false,
    mileageKm: 162000,
    lastServiceKm: 150000,
    lastServiceDate: '2025-12-05',
    nextServiceKm: 160000,
    dailyAvgKm: 50,
    carteGriseNumber: 'CG-16-339912',
  },
];

export const INITIAL_PARTS: SparePart[] = [
  {
    id: 'p_01',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'BRK-PLQ-01',
    oemReference: '410602192R',
    name: 'Jeu de Plaquettes de Frein Avant',
    brand: 'Ferodo / Valeo',
    category: 'Freinage',
    stockQuantity: 14,
    minThreshold: 5,
    buyingPriceDzd: 3200,
    sellingPriceDzd: 4500,
    locationBin: 'Rayon B-02',
    unit: 'jeu',
    supplierName: 'Comptoir Pièces Bab Ezzouar',
    compatibility: ['Clio 4', 'Captur 1', 'Duster 1.5 dCi', 'Sandero 2'],
  },
  {
    id: 'p_02',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'BRK-DSC-02',
    oemReference: '402063149R',
    name: 'Disques de Frein Avant Ventilés (Paire)',
    brand: 'Brembo',
    category: 'Freinage',
    stockQuantity: 6,
    minThreshold: 4,
    buyingPriceDzd: 8000,
    sellingPriceDzd: 11000,
    locationBin: 'Rayon B-04',
    unit: 'jeu',
    supplierName: 'Comptoir Pièces Bab Ezzouar',
    compatibility: ['Clio 4 1.5 dCi', 'Megane 3', 'Duster'],
  },
  {
    id: 'p_03',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'OIL-5W30-05',
    oemReference: 'TOTAL-QUARTZ-INEO',
    name: 'Huile Synthèse 5W30 C3 (Bidon 5L)',
    brand: 'TotalEnergies Quartz',
    category: 'Huiles & Fluides',
    stockQuantity: 28,
    minThreshold: 10,
    buyingPriceDzd: 5800,
    sellingPriceDzd: 7500,
    locationBin: 'Rack Lubrifiants A-01',
    unit: 'litre',
    supplierName: 'Sarl Lubrifiants Algérie Oued Smar',
    compatibility: ['Universel Diesel FAP', 'Renault dCi', 'Peugeot HDi', 'VAG TDI'],
  },
  {
    id: 'p_04',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'FLT-OIL-RN-01',
    oemReference: '152085758R',
    name: 'Filtre à Huile dCi',
    brand: 'Purflux',
    category: 'Filtration',
    stockQuantity: 19,
    minThreshold: 8,
    buyingPriceDzd: 850,
    sellingPriceDzd: 1400,
    locationBin: 'Rayon A-01',
    unit: 'piece',
    supplierName: 'Comptoir Pièces Bab Ezzouar',
    compatibility: ['1.5 dCi Renault', 'Dacia', 'Nissan'],
  },
  {
    id: 'p_05',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'FLT-AIR-PSA-02',
    oemReference: '1444TV',
    name: 'Filtre à Air Moteur HDi / PureTech',
    brand: 'Mann Filter',
    category: 'Filtration',
    stockQuantity: 11,
    minThreshold: 6,
    buyingPriceDzd: 1100,
    sellingPriceDzd: 1800,
    locationBin: 'Rayon A-03',
    unit: 'piece',
    supplierName: 'Comptoir Pièces Bab Ezzouar',
    compatibility: ['208', '308', 'Partner 1.6 HDi', 'C3'],
  },
  {
    id: 'p_06',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'KIT-DIST-RN-01',
    oemReference: '119A02283R',
    name: 'Kit de Distribution + Pompe à Eau',
    brand: 'Gates / INA',
    category: 'Distribution' as any,
    stockQuantity: 3,
    minThreshold: 3,
    buyingPriceDzd: 16500,
    sellingPriceDzd: 22000,
    locationBin: 'Rayon C-01 (Armoire Sécurisée)',
    unit: 'kit',
    supplierName: 'Auto Parts Distribution Alger',
    compatibility: ['Clio 4 1.5 dCi', 'Duster dCi', 'Symbol dCi'],
  },
  {
    id: 'p_07',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'BAT-70AH-01',
    oemReference: 'VARTA-E39',
    name: 'Batterie 12V 70Ah 760A AGM Start&Stop',
    brand: 'Varta Silver Dynamic',
    category: 'Électrique',
    stockQuantity: 5,
    minThreshold: 4,
    buyingPriceDzd: 19500,
    sellingPriceDzd: 25000,
    locationBin: 'Zone Batteries Neuves',
    unit: 'piece',
    supplierName: 'Accumulateurs Algérie SPA',
    compatibility: ['Véhicules Start-Stop récents', 'Peugeot', 'Renault', 'VW'],
  },
  {
    id: 'p_08',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    sku: 'AMORT-AV-RN-01',
    oemReference: '543028475R',
    name: 'Amortisseurs Avant Gaz (Paire)',
    brand: 'Monroe Original',
    category: 'Suspension',
    stockQuantity: 4,
    minThreshold: 3,
    buyingPriceDzd: 14000,
    sellingPriceDzd: 18500,
    locationBin: 'Rayon D-02',
    unit: 'jeu',
    supplierName: 'Comptoir Pièces Bab Ezzouar',
    compatibility: ['Renault Clio 4', 'Captur'],
  },
];

export const INITIAL_ORDERS: RepairOrder[] = [
  {
    id: 'ro_01',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    orderNumber: 'OR-2026-0042',
    vehiclePlate: '00142-118-16',
    vehicleModel: 'Renault Clio 4 (1.5 dCi 85ch)',
    clientName: 'Sofiane Mansouri',
    clientPhone: '0550 44 22 11',
    clientType: 'individual',
    intakeDate: '2026-05-10T08:30:00Z',
    promisedDate: '2026-05-11T17:00:00Z',
    diagnosticNotes: 'Bruit de claquement à l\'avant droit au freinage appuyé. Disques voilés suspectés et plaquettes en fin de vie.',
    status: 'InRepair',
    estimatedCostDzd: 18500,
    finalCostDzd: 19500,
    laborHoursEstimated: 1.5,
    laborHoursActual: 1.5,
    hourlyRateDzd: 2500,
    laborCostDzd: 3750,
    partsCostDzd: 15500,
    partsUsed: [
      { id: 'req_01', partId: 'p_01', name: 'Jeu de Plaquettes de Frein Avant', sku: 'BRK-PLQ-01', quantity: 1, unitPriceDzd: 4500, totalPriceDzd: 4500 },
      { id: 'req_02', partId: 'p_02', name: 'Disques de Frein Avant Ventilés (Paire)', sku: 'BRK-DSC-02', quantity: 1, unitPriceDzd: 11000, totalPriceDzd: 11000 },
    ],
    technicianName: 'Karim (Chef Atelier)',
    assignedBayId: 'bay_01',
    bayName: 'Pont 1 (2 Colonnes - 4.0T)',
    fuelLevel: '50',
    inOdometerKm: 142500,
    isVehicleDirty: false,
    damageMarkers: [
      { id: 'dmg_01', view: 'right', xPercent: 72, yPercent: 48, damageType: 'scratch', severity: 'minor', notes: 'Rayure aile arrière droite superficielle' },
      { id: 'dmg_02', view: 'front', xPercent: 30, yPercent: 65, damageType: 'paint_chip', severity: 'minor', notes: 'Impact gravillon pare-choc avant' },
    ],
    technicianChecklist: [
      { id: 'chk_01', label: 'Purge et niveau liquide de frein DOT4', done: true },
      { id: 'chk_02', label: 'Contrôle serrage au couple (110 Nm)', done: true },
      { id: 'chk_03', label: 'Essai dynamique et rodage sur banc', done: false },
    ],
    billingType: 'bon_caisse',
    isPaid: false,
  },
  {
    id: 'ro_02',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    orderNumber: 'OR-2026-0043',
    vehiclePlate: '09845-120-09',
    vehicleModel: 'Peugeot 208 (1.2 PureTech 82ch)',
    clientName: 'Nadia Boubekeur',
    clientPhone: '0661 78 90 12',
    clientType: 'individual',
    intakeDate: '2026-05-11T09:00:00Z',
    promisedDate: '2026-05-12T12:00:00Z',
    diagnosticNotes: 'Voyant moteur allumé orange. Ratés d\'allumage cylindre 2 en côte. Diagnostic OBD requis.',
    status: 'Diagnostic',
    estimatedCostDzd: 12000,
    finalCostDzd: 0,
    laborHoursEstimated: 1.0,
    laborHoursActual: 0.5,
    hourlyRateDzd: 2500,
    laborCostDzd: 2500,
    partsCostDzd: 0,
    partsUsed: [],
    technicianName: 'Amine (Électricien Auto)',
    assignedBayId: 'bay_05',
    bayName: 'Baie 5 (Électronique & Valise OBD-II)',
    fuelLevel: '75',
    inOdometerKm: 68500,
    isVehicleDirty: true,
    damageMarkers: [
      { id: 'dmg_03', view: 'left', xPercent: 45, yPercent: 55, damageType: 'dent', severity: 'moderate', notes: 'Légère bosse porte conducteur' },
    ],
    technicianChecklist: [
      { id: 'chk_04', label: 'Lecture codes défauts calculateurs (DTC P0302)', done: true },
      { id: 'chk_05', label: 'Test bobine crayon & bougies allumage', done: false },
    ],
    billingType: 'facture_dgi',
    isPaid: false,
  },
  {
    id: 'ro_03',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    orderNumber: 'OR-2026-0041',
    vehiclePlate: '11245-115-31',
    vehicleModel: 'Toyota Hilux 4x4 (2.4 D-4D)',
    clientName: 'SARL Atlas Travaux BTP',
    clientPhone: '0770 12 34 56',
    clientType: 'corporate_fleet',
    fleetId: 'fleet_03',
    fleetName: 'SARL Atlas Travaux BTP',
    intakeDate: '2026-05-09T14:00:00Z',
    promisedDate: '2026-05-10T12:00:00Z',
    diagnosticNotes: 'Entretien périodique 185 000 km contractuel : Vidange générale 100% synthèse + Remplacement filtre huile et filtre gasoil + Graissage cardans.',
    status: 'ReadyForPickup',
    estimatedCostDzd: 26000,
    finalCostDzd: 26500,
    laborHoursEstimated: 2.0,
    laborHoursActual: 2.0,
    hourlyRateDzd: 2100, // Negotiated fleet rate
    laborCostDzd: 4200,
    partsCostDzd: 22300,
    partsUsed: [
      { id: 'req_03', partId: 'p_03', name: 'Huile Synthèse 5W30 C3 (Bidon 5L)', sku: 'OIL-5W30-05', quantity: 2, unitPriceDzd: 7125, totalPriceDzd: 14250 }, // with 5% fleet discount
      { id: 'req_04', partId: 'p_04', name: 'Filtre à Huile dCi/D-4D', sku: 'FLT-OIL-RN-01', quantity: 1, unitPriceDzd: 1330, totalPriceDzd: 1330 },
      { id: 'req_05', partId: 'p_05', name: 'Filtre à Air Moteur HDi/Hilux', sku: 'FLT-AIR-PSA-02', quantity: 1, unitPriceDzd: 1710, totalPriceDzd: 1710 },
    ],
    technicianName: 'Farid (Mécanicien)',
    assignedBayId: 'bay_03',
    bayName: 'Pont 3 (4 Colonnes - 5.0T VU/Flottes)',
    fuelLevel: '50',
    inOdometerKm: 185200,
    isVehicleDirty: true,
    damageMarkers: [
      { id: 'dmg_04', view: 'rear', xPercent: 50, yPercent: 70, damageType: 'dent', severity: 'moderate', notes: 'Hayon arrière utilitaire enfoncé (usage chantier)' },
    ],
    technicianChecklist: [
      { id: 'chk_06', label: 'Remplacement joint bouchon vidange cuivre', done: true },
      { id: 'chk_07', label: 'Remise à zéro indicateur de maintenance T-Oil', done: true },
      { id: 'chk_08', label: 'Contrôle pression 5 pneus et roue de secours', done: true },
    ],
    billingType: 'facture_dgi',
    isPaid: true,
    invoiceId: 'inv_01',
  },
  {
    id: 'ro_04',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    orderNumber: 'OR-2026-0044',
    vehiclePlate: '03412-119-16',
    vehicleModel: 'Peugeot Partner (1.6 HDi 90ch)',
    clientName: 'SARL Logistique Express Algérie',
    clientPhone: '0560 11 22 33',
    clientType: 'corporate_fleet',
    fleetId: 'fleet_01',
    fleetName: 'SARL Logistique Express Algérie',
    intakeDate: '2026-05-11T11:00:00Z',
    promisedDate: '2026-05-12T16:00:00Z',
    diagnosticNotes: 'Pédale embrayage molle et patinage en 3ème vitesse. Kit embrayage et butée hydraulique à remplacer.',
    status: 'WaitingParts',
    estimatedCostDzd: 42000,
    finalCostDzd: 0,
    laborHoursEstimated: 4.5,
    laborHoursActual: 0,
    hourlyRateDzd: 2000, // Fleet negotiated rate
    laborCostDzd: 9000,
    partsCostDzd: 33000,
    partsUsed: [],
    technicianName: 'Karim (Chef Atelier)',
    assignedBayId: 'bay_02',
    bayName: 'Pont 2 (2 Colonnes - 3.5T)',
    fuelLevel: '25',
    inOdometerKm: 215400,
    damageMarkers: [],
    billingType: 'facture_dgi',
    isPaid: false,
  },
];

export const INITIAL_INVOICES: GarageInvoice[] = [
  {
    id: 'inv_01',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    branchId: 'branch_garage_main',
    staffId: 'stf_01',
    invoiceNumber: 'FAC-2026-00128',
    orderId: 'ro_03',
    orderNumber: 'OR-2026-0041',
    vehiclePlate: '11245-115-31',
    vehicleModel: 'Toyota Hilux 4x4 (2.4 D-4D)',
    clientId: 'fleet_03',
    clientName: 'SARL Atlas Travaux BTP',
    clientPhone: '0770 12 34 56',
    clientType: 'corporate_fleet',
    clientNif: '001531011223344',
    clientNis: '00153101122',
    clientRc: '31/00-4455667B15',
    clientAi: '31445566778',
    billingType: 'facture_dgi',
    paymentMethod: 'virement',
    laborTotalHt: 4200,
    partsTotalHt: 17290,
    discountHt: 1000,
    subtotalHt: 20490,
    tvaRate: 19.0,
    tvaAmount: 3893.1,
    totalTtc: 24383.1,
    timbreFiscal: 0, // No timbre on bank transfer
    netToPayDzd: 24383.1,
    issuedAt: '2026-05-10T14:30:00Z',
    isPaid: true,
  },
];

export const INITIAL_GARAGE_SUPPLIERS: GarageSupplierRecord[] = [
  {
    id: 'sup_gar_01',
    branchId: 'branch_garage_main',
    name: 'SARL AutoPièces El Harrach',
    phone: '0550 88 12 34',
    wilaya: 'Alger',
    specialty: 'Freinage, Filtration & Embrayage',
    nif: '001616088991122',
    rcNumber: '16/00-2233445B17',
    paymentTermsDays: 30,
    balanceDzd: 0,
  },
  {
    id: 'sup_gar_02',
    branchId: 'branch_garage_main',
    name: 'EURL Naftal Lubrifiants & Batteries',
    phone: '0661 33 44 55',
    wilaya: 'Blida',
    specialty: 'Huiles Synthétiques & Liquides',
    nif: '001409033445566',
    rcNumber: '09/00-5566778B14',
    paymentTermsDays: 45,
    balanceDzd: 0,
  },
  {
    id: 'sup_gar_03',
    branchId: 'branch_garage_main',
    name: 'SPA Pneumatiques & Jantes DZ',
    phone: '0770 91 22 40',
    wilaya: 'Oran',
    specialty: 'Pneumatiques Tourisme & Poids Lourds',
    nif: '001731077889900',
    rcNumber: '31/00-7788990B17',
    paymentTermsDays: 30,
    balanceDzd: 0,
  },
];

export const INITIAL_FLAT_RATE_LABOR: FlatRateLaborItem[] = [
  {
    id: 'fr_01',
    branchId: 'branch_garage_main',
    code: 'BAR-VID-01',
    label: 'Vidange Moteur + Remplacement 3 Filtres',
    category: 'Entretien Périodique',
    standardHours: 1.0,
    hourlyRateDzd: 2500,
    isActive: true,
  },
  {
    id: 'fr_02',
    branchId: 'branch_garage_main',
    code: 'BAR-FRN-02',
    label: 'Remplacement Disques & Plaquettes Avant + Purge',
    category: 'Freinage',
    standardHours: 1.5,
    hourlyRateDzd: 2500,
    isActive: true,
  },
  {
    id: 'fr_03',
    branchId: 'branch_garage_main',
    code: 'BAR-EMB-03',
    label: 'Dépose Boîte & Kit Embrayage + Butée',
    category: 'Transmission',
    standardHours: 4.5,
    hourlyRateDzd: 2800,
    isActive: true,
  },
  {
    id: 'fr_04',
    branchId: 'branch_garage_main',
    code: 'BAR-DIAG-04',
    label: 'Diagnostic Électronique Complet Valise OBD-II',
    category: 'Électronique',
    standardHours: 1.0,
    hourlyRateDzd: 3000,
    isActive: true,
  },
  {
    id: 'fr_05',
    branchId: 'branch_garage_main',
    code: 'BAR-DST-05',
    label: 'Remplacement Kit Distribution & Pompe à Eau',
    category: 'Moteur',
    standardHours: 3.5,
    hourlyRateDzd: 3000,
    isActive: true,
  },
  {
    id: 'fr_06',
    branchId: 'branch_garage_main',
    code: 'BAR-GEO-06',
    label: 'Contrôle Géométrie / Parallélisme 3D + Équilibrage',
    category: 'Pneumatiques',
    standardHours: 1.0,
    hourlyRateDzd: 2500,
    isActive: true,
  },
];

export const INITIAL_DETAILING_PACKAGES: DetailingPackage[] = [
  {
    id: 'det_01',
    branchId: 'branch_garage_main',
    code: 'DET-EXP',
    name: 'Lavage Intérieur/Extérieur Express + Cire',
    tier: 'express',
    durationMinutes: 60,
    priceDzd: 3500,
    includedSteps: ['Prélavage mousse active', 'Aspiration habitacle', 'Dressing plastiques & pneus'],
    isActive: true,
  },
  {
    id: 'det_02',
    branchId: 'branch_garage_main',
    code: 'DET-STD',
    name: 'Rénovation Intérieure Shampouineuse + Polissage 1 Passe',
    tier: 'standard',
    durationMinutes: 240,
    priceDzd: 14000,
    includedSteps: ['Décontamination ferreuse', 'Injection-extraction sièges & moquettes', 'Polissage lustrage brillant'],
    isActive: true,
  },
  {
    id: 'det_03',
    branchId: 'branch_garage_main',
    code: 'DET-CER',
    name: 'Traitement Protection Céramique 9H (3 ans)',
    tier: 'ceramic',
    durationMinutes: 480,
    priceDzd: 45000,
    includedSteps: ['Correction vernis 2 passes', 'Dégraissage IPA', 'Pose céramique 9H carrosserie & jantes'],
    isActive: true,
  },
  {
    id: 'det_04',
    branchId: 'branch_garage_main',
    code: 'DET-PPF',
    name: 'Film Protection Carrosserie PPF Face Avant',
    tier: 'ppf',
    durationMinutes: 360,
    priceDzd: 68000,
    includedSteps: ['Préparation carrosserie', 'Pose film polyuréthane auto-cicatrisant', 'Finition bords invisibles'],
    isActive: true,
  },
];

// ----------------------------------------------------------------------
// Algerian Fiscal & Mileage Math Pure Utilities
// ----------------------------------------------------------------------

export const computeAlgerianTimbreFiscal = (totalTtc: number, paymentMethod: string): number => {
  // Article 317 du Code du Timbre Algérien: Droit de timbre uniquement sur les paiements en espèces (Cash)
  if (paymentMethod !== 'especes') {
    return 0;
  }
  if (totalTtc <= 0) return 0;
  
  // Tranches du droit de timbre : 1% avec minimum légal et arrondi standard DGI
  const stamp = Math.ceil(totalTtc * 0.01);
  return Math.min(stamp, 10000); // Plafond légal standard
};

export const calculateEstimatedMileage = (
  lastKm: number,
  lastDateStr?: string,
  dailyAvgKm = 45
): number => {
  if (!lastDateStr) return lastKm;
  const lastDate = new Date(lastDateStr).getTime();
  const now = Date.now();
  const daysDiff = Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)));
  return lastKm + daysDiff * dailyAvgKm;
};

// ----------------------------------------------------------------------
// Universal useGarageData React Hook
// ----------------------------------------------------------------------

export const useGarageData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_garage_main';
  const garageCtx = useMemo(
    () => ({
      accountId: currentAccountId || (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: currentBusinessId || 'biz_garage',
      branchId: activeBranchId,
      staffId: currentStaffId || '',
    }),
    [currentAccountId, currentBusinessId, activeBranchId, currentStaffId]
  );
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_garage_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      businessId: (item as { businessId?: string }).businessId || garageCtx.businessId,
      accountId: (item as { accountId?: string }).accountId || garageCtx.accountId,
    }) as T;

  const [orders, setOrders] = useState<RepairOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_orders_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [vehicles, setVehicles] = useState<VehicleAsset[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_vehicles_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [parts, setParts] = useState<SparePart[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_parts_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bays, setBays] = useState<WorkshopBay[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_bays_v2');
      return saved ? JSON.parse(saved) : INITIAL_BAYS;
    } catch {
      return INITIAL_BAYS;
    }
  });

  const [fleets, setFleets] = useState<CorporateFleetAccount[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_fleets_v2');
      return saved ? JSON.parse(saved) : INITIAL_FLEETS;
    } catch {
      return INITIAL_FLEETS;
    }
  });

  const [invoices, setInvoices] = useState<GarageInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_invoices_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cashClosures, setCashClosures] = useState<GarageCashClosure[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_closures_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [suppliers, setSuppliers] = useState<GarageSupplierRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_suppliers_v1');
      return saved ? JSON.parse(saved) : INITIAL_GARAGE_SUPPLIERS;
    } catch {
      return INITIAL_GARAGE_SUPPLIERS;
    }
  });

  const [purchaseOrders, setPurchaseOrders] = useState<GaragePurchaseOrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_pos_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [flatRateCatalog, setFlatRateCatalog] = useState<FlatRateLaborItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_flat_rates_v1');
      return saved ? JSON.parse(saved) : INITIAL_FLAT_RATE_LABOR;
    } catch {
      return INITIAL_FLAT_RATE_LABOR;
    }
  });

  const [timeLogs, setTimeLogs] = useState<TechnicianTimeLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_time_logs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [claims, setClaims] = useState<BodyShopInsuranceClaim[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_claims_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inspectionPvs, setInspectionPvs] = useState<InspectionCenterPv[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_inspections_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [detailingPackages, setDetailingPackages] = useState<DetailingPackage[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_detailing_v1');
      return saved ? JSON.parse(saved) : INITIAL_DETAILING_PACKAGES;
    } catch {
      return INITIAL_DETAILING_PACKAGES;
    }
  });

  const [tireStorage, setTireStorage] = useState<TireStorageEntry[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_tire_storage_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const techCommissions = useAtriumSelector((s) => s.garageTechCommissions) || [];

  // LocalStorage synchronizations (idle-deferred)
  useIdlePersist('atrium_garage_orders_v2', orders);
  useIdlePersist('atrium_garage_vehicles_v2', vehicles);
  useIdlePersist('atrium_garage_parts_v2', parts);
  useIdlePersist('atrium_garage_bays_v2', bays);
  useIdlePersist('atrium_garage_fleets_v2', fleets);
  useIdlePersist('atrium_garage_invoices_v2', invoices);
  useIdlePersist('atrium_garage_closures_v1', cashClosures);
  useIdlePersist('atrium_garage_suppliers_v1', suppliers);
  useIdlePersist('atrium_garage_pos_v1', purchaseOrders);
  useIdlePersist('atrium_garage_flat_rates_v1', flatRateCatalog);
  useIdlePersist('atrium_garage_time_logs_v1', timeLogs);
  useIdlePersist('atrium_garage_claims_v1', claims);
  useIdlePersist('atrium_garage_inspections_v1', inspectionPvs);
  useIdlePersist('atrium_garage_detailing_v1', detailingPackages);
  useIdlePersist('atrium_garage_tire_storage_v1', tireStorage);

  // Cross-component garage sync listener (keeps Vehicles/Orders/Parts/Billing views live-synced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSync = (evt: Event) => {
      const key = (evt as CustomEvent<{ key?: string }>).detail?.key;
      try {
        if (!key || key === 'atrium_garage_orders_v2') {
          const s = localStorage.getItem('atrium_garage_orders_v2');
          if (s) setOrders(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_vehicles_v2') {
          const s = localStorage.getItem('atrium_garage_vehicles_v2');
          if (s) setVehicles(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_parts_v2') {
          const s = localStorage.getItem('atrium_garage_parts_v2');
          if (s) setParts(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_bays_v2') {
          const s = localStorage.getItem('atrium_garage_bays_v2');
          if (s) setBays(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_invoices_v2') {
          const s = localStorage.getItem('atrium_garage_invoices_v2');
          if (s) setInvoices(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_pos_v1') {
          const s = localStorage.getItem('atrium_garage_pos_v1');
          if (s) setPurchaseOrders(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_time_logs_v1') {
          const s = localStorage.getItem('atrium_garage_time_logs_v1');
          if (s) setTimeLogs(JSON.parse(s));
        }
        if (!key || key === 'atrium_garage_tire_storage_v1') {
          const s = localStorage.getItem('atrium_garage_tire_storage_v1');
          if (s) setTireStorage(JSON.parse(s));
        }
      } catch {
        // ignore malformed cache
      }
    };
    window.addEventListener(GARAGE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(GARAGE_SYNC_EVENT, handleSync);
  }, []);

  // Hydrate garage vertical state from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`garage:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteOrders,
        remoteVehicles,
        remoteParts,
        remoteBays,
        remoteFleets,
        remoteInvoices,
        remoteSuppliers,
        remotePos,
        remoteFlatRates,
        remoteTimeLogs,
        remoteClaims,
        remotePvs,
        remoteDetailing,
        remoteTires,
      ] = await runWithConcurrency(
        [
          () => garageService.fetchWorkOrders(activeBranchId),
          () => garageService.fetchVehicles(activeBranchId),
          () => garageService.fetchParts(activeBranchId),
          () => garageService.fetchBays(activeBranchId),
          () => garageService.fetchFleetAccounts(activeBranchId),
          () => garageService.fetchInvoices(activeBranchId),
          () => garageService.fetchSuppliers(activeBranchId),
          () => garageService.fetchPurchaseOrders(activeBranchId),
          () => garageService.fetchFlatRateLabor(activeBranchId),
          () => garageService.fetchTechTimeLogs(activeBranchId),
          () => garageService.fetchInsuranceClaims(activeBranchId),
          () => garageService.fetchInspectionPvs(activeBranchId),
          () => garageService.fetchDetailingPackages(activeBranchId),
          () => garageService.fetchTireStorage(activeBranchId),
        ],
        4
      );

      if (cancelled) return;
      if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
        setOrders((prev) => mergeGarageById(prev, remoteOrders as RepairOrder[]));
      }
      if (Array.isArray(remoteVehicles) && remoteVehicles.length > 0) {
        setVehicles((prev) => mergeGarageById(prev, remoteVehicles as VehicleAsset[]));
      }
      if (Array.isArray(remoteParts) && remoteParts.length > 0) {
        setParts((prev) => mergeGarageById(prev, remoteParts as SparePart[]));
      }
      if (Array.isArray(remoteBays) && remoteBays.length > 0) {
        setBays((prev) => mergeGarageById(prev, remoteBays as WorkshopBay[]));
      }
      if (Array.isArray(remoteFleets) && remoteFleets.length > 0) {
        setFleets((prev) => mergeGarageById(prev, remoteFleets as CorporateFleetAccount[]));
      }
      if (Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
        setInvoices((prev) => mergeGarageById(prev, remoteInvoices as GarageInvoice[]));
      }
      if (Array.isArray(remoteSuppliers) && remoteSuppliers.length > 0) {
        setSuppliers((prev) => mergeGarageById(prev, remoteSuppliers as GarageSupplierRecord[]));
      }
      if (Array.isArray(remotePos) && remotePos.length > 0) {
        setPurchaseOrders((prev) => mergeGarageById(prev, remotePos as GaragePurchaseOrderRecord[]));
      }
      if (Array.isArray(remoteFlatRates) && remoteFlatRates.length > 0) {
        setFlatRateCatalog((prev) => mergeGarageById(prev, remoteFlatRates as FlatRateLaborItem[]));
      }
      if (Array.isArray(remoteTimeLogs) && remoteTimeLogs.length > 0) {
        setTimeLogs((prev) => mergeGarageById(prev, remoteTimeLogs as TechnicianTimeLog[]));
      }
      if (Array.isArray(remoteClaims) && remoteClaims.length > 0) {
        setClaims((prev) => mergeGarageById(prev, remoteClaims as BodyShopInsuranceClaim[]));
      }
      if (Array.isArray(remotePvs) && remotePvs.length > 0) {
        setInspectionPvs((prev) => mergeGarageById(prev, remotePvs as InspectionCenterPv[]));
      }
      if (Array.isArray(remoteDetailing) && remoteDetailing.length > 0) {
        setDetailingPackages((prev) => mergeGarageById(prev, remoteDetailing as DetailingPackage[]));
      }
      if (Array.isArray(remoteTires) && remoteTires.length > 0) {
        setTireStorage((prev) => mergeGarageById(prev, remoteTires as TireStorageEntry[]));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'garage_work_orders',
      'garage_vehicles',
      'garage_parts',
      'garage_bays',
      'garage_fleet_contracts',
      'garage_invoices',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('garage_work_orders', setOrders);
      prune('garage_vehicles', setVehicles);
      prune('garage_parts', setParts);
      prune('garage_bays', setBays);
      prune('garage_fleet_contracts', setFleets);
      prune('garage_invoices', setInvoices);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('garage_work_orders')) {
        tasks.push(async () => {
          const rows = await garageService.fetchWorkOrders(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setOrders((prev) => mergeGarageById(prev, rows as RepairOrder[]));
          }
        });
      }
      if (changedSet.has('garage_vehicles')) {
        tasks.push(async () => {
          const rows = await garageService.fetchVehicles(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVehicles((prev) => mergeGarageById(prev, rows as VehicleAsset[]));
          }
        });
      }
      if (changedSet.has('garage_parts')) {
        tasks.push(async () => {
          const rows = await garageService.fetchParts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setParts((prev) => mergeGarageById(prev, rows as SparePart[]));
          }
        });
      }
      if (changedSet.has('garage_bays')) {
        tasks.push(async () => {
          const rows = await garageService.fetchBays(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBays((prev) => mergeGarageById(prev, rows as WorkshopBay[]));
          }
        });
      }
      if (changedSet.has('garage_fleet_contracts')) {
        tasks.push(async () => {
          const rows = await garageService.fetchFleetAccounts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setFleets((prev) => mergeGarageById(prev, rows as CorporateFleetAccount[]));
          }
        });
      }
      if (changedSet.has('garage_invoices')) {
        tasks.push(async () => {
          const rows = await garageService.fetchInvoices(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setInvoices((prev) => mergeGarageById(prev, rows as GarageInvoice[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `garage:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
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
      if (evt.table === 'garage_work_orders') {
        tasks.push(async () => {
          const rows = await garageService.fetchWorkOrders(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setOrders((prev) => mergeGarageById(prev, rows as RepairOrder[]));
          }
        });
      } else if (evt.table === 'garage_vehicles') {
        tasks.push(async () => {
          const rows = await garageService.fetchVehicles(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVehicles((prev) => mergeGarageById(prev, rows as VehicleAsset[]));
          }
        });
      } else if (evt.table === 'garage_parts') {
        tasks.push(async () => {
          const rows = await garageService.fetchParts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setParts((prev) => mergeGarageById(prev, rows as SparePart[]));
          }
        });
      } else if (evt.table === 'garage_bays') {
        tasks.push(async () => {
          const rows = await garageService.fetchBays(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBays((prev) => mergeGarageById(prev, rows as WorkshopBay[]));
          }
        });
      } else if (evt.table === 'garage_fleet_contracts') {
        tasks.push(async () => {
          const rows = await garageService.fetchFleetAccounts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setFleets((prev) => mergeGarageById(prev, rows as CorporateFleetAccount[]));
          }
        });
      } else if (evt.table === 'garage_invoices') {
        tasks.push(async () => {
          const rows = await garageService.fetchInvoices(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setInvoices((prev) => mergeGarageById(prev, rows as GarageInvoice[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `garage:res:${activeBranchId}:${evt.table}`,
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
    orders,
    vehicles,
    parts,
    bays,
    fleets,
    invoices,
    suppliers,
    purchaseOrders,
    flatRateCatalog,
    timeLogs,
    claims,
    inspectionPvs,
    detailingPackages,
    tireStorage,
  });
  latestRef.current = {
    orders,
    vehicles,
    parts,
    bays,
    fleets,
    invoices,
    suppliers,
    purchaseOrders,
    flatRateCatalog,
    timeLogs,
    claims,
    inspectionPvs,
    detailingPackages,
    tireStorage,
  };

  const restoreAt = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
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

  // Order Mutations
  const addOrder = (order: RepairOrder) => {
    const scopedOrder = withBranch(order);
    const snap = cloneSnapshot(scopedOrder);
    const prevBays = scopedOrder.assignedBayId ? cloneSnapshot(latestRef.current.bays) : null;

    setOrders((prev) => [scopedOrder, ...prev]);
    void garageService.upsertWorkOrder(scopedOrder, garageCtx).catch(() => {});
    if (scopedOrder.assignedBayId) {
      setBays((prevBaysState) =>
        prevBaysState.map((b) =>
          b.id === scopedOrder.assignedBayId ? { ...b, isOccupied: true, activeOrderId: scopedOrder.id } : b
        )
      );
      void garageService.assignBay(scopedOrder.assignedBayId, scopedOrder.id, scopedOrder.technicianName || '').catch(() => {});
    }

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scopedOrder.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Ordre de réparation ${scopedOrder.orderNumber} créé`,
        en: `Repair order ${scopedOrder.orderNumber} created`,
        ar: `تم إنشاء أمر الإصلاح ${scopedOrder.orderNumber}`,
      }),
      undo: () => {
        setOrders((prev) => prev.filter((o) => o.id !== snap.id));
        if (prevBays) {
          setBays(cloneSnapshot(prevBays));
        }
        void garageService.deleteWorkOrder(snap.id, currentStaffId).catch(() => {});
        if (snap.assignedBayId) {
          void garageService.releaseBay(snap.assignedBayId).catch(() => {});
        }
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setOrders((prev) => (prev.some((o) => o.id === re.id) ? prev : [re, ...prev]));
        if (re.assignedBayId) {
          setBays((prevBaysState) =>
            prevBaysState.map((b) =>
              b.id === re.assignedBayId ? { ...b, isOccupied: true, activeOrderId: re.id } : b
            )
          );
          void garageService.assignBay(re.assignedBayId, re.id, re.technicianName || '').catch(() => {});
        }
        void syncCoordinator
          .restoreRow('garage_work_orders', re.id, currentStaffId)
          .then(() => garageService.upsertWorkOrder(re, garageCtx))
          .catch(() => {});
      },
    });
  };

  const updateOrder = (order: RepairOrder) => {
    const scopedOrder = withBranch(order);
    const existing = latestRef.current.orders.find((o) => o.id === order.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scopedOrder);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? scopedOrder : o)));
    void garageService.upsertWorkOrder(scopedOrder, garageCtx).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'edit',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.orderNumber,
        summary: pickLocalizedText(language, {
          fr: `Ordre ${nextSnap.orderNumber} modifié`,
          en: `Repair order ${nextSnap.orderNumber} updated`,
          ar: `تم تعديل أمر الإصلاح ${nextSnap.orderNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setOrders((prev) => prev.map((o) => (o.id === prevCopy.id ? prevCopy : o)));
          void garageService.upsertWorkOrder(withBranch(prevCopy), garageCtx).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setOrders((prev) => prev.map((o) => (o.id === nextCopy.id ? nextCopy : o)));
          void garageService.upsertWorkOrder(nextCopy, garageCtx).catch(() => {});
        },
      });
    }
  };

  const deleteOrder = (id: string) => {
    const idx = latestRef.current.orders.findIndex((o) => o.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.orders[idx]) : null;
    const prevBays = cloneSnapshot(latestRef.current.bays);

    setOrders((prev) => prev.filter((o) => o.id !== id));
    setBays((prevBaysState) =>
      prevBaysState.map((b) => (b.activeOrderId === id ? { ...b, isOccupied: false, activeOrderId: undefined } : b))
    );
    void garageService.deleteWorkOrder(id, currentStaffId).catch(() => {});
    if (existing?.assignedBayId) {
      void garageService.releaseBay(existing.assignedBayId).catch(() => {});
    }

    if (existing) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'delete',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.orderNumber,
        summary: pickLocalizedText(language, {
          fr: `Ordre ${existing.orderNumber} supprimé`,
          en: `Repair order ${existing.orderNumber} deleted`,
          ar: `تم حذف أمر الإصلاح ${existing.orderNumber}`,
        }),
        undo: () => {
          restoreAt(setOrders, existing, idx);
          setBays(cloneSnapshot(prevBays));
          void syncCoordinator
            .restoreRow('garage_work_orders', existing.id, currentStaffId)
            .then(() => garageService.upsertWorkOrder(withBranch(cloneSnapshot(existing)), garageCtx))
            .catch(() => {});
          if (existing.assignedBayId) {
            void garageService
              .assignBay(existing.assignedBayId, existing.id, existing.technicianName || '')
              .catch(() => {});
          }
        },
        redo: () => {
          setOrders((prev) => prev.filter((o) => o.id !== existing.id));
          setBays((prevBaysState) =>
            prevBaysState.map((b) =>
              b.activeOrderId === existing.id ? { ...b, isOccupied: false, activeOrderId: undefined } : b
            )
          );
          void garageService.deleteWorkOrder(existing.id, currentStaffId).catch(() => {});
          if (existing.assignedBayId) {
            void garageService.releaseBay(existing.assignedBayId).catch(() => {});
          }
        },
      });
    }
  };

  const updateOrderStatus = (id: string, status: RepairOrder['status']) => {
    const existing = latestRef.current.orders.find((o) => o.id === id);
    if (!existing) return;
    const prevOrder = cloneSnapshot(existing);
    const prevBays = cloneSnapshot(latestRef.current.bays);
    const nextOrder = withBranch({ ...existing, status });
    const nextSnap = cloneSnapshot(nextOrder);

    setOrders((prev) => prev.map((o) => (o.id === id ? nextOrder : o)));
    if (status === 'Delivered' && existing.assignedBayId) {
      setBays((prevBaysState) =>
        prevBaysState.map((b) =>
          b.id === existing.assignedBayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b
        )
      );
      void garageService.releaseBay(existing.assignedBayId).catch(() => {});
    }
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'status',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: existing.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Statut ordre ${existing.orderNumber} → ${status}`,
        en: `Order ${existing.orderNumber} → ${status}`,
        ar: `تحديث حالة الأمر ${existing.orderNumber} → ${status}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevOrder);
        setOrders((prev) => prev.map((o) => (o.id === prevCopy.id ? prevCopy : o)));
        setBays(cloneSnapshot(prevBays));
        void garageService.upsertWorkOrder(withBranch(prevCopy), garageCtx).catch(() => {});
        if (status === 'Delivered' && prevCopy.assignedBayId) {
          void garageService
            .assignBay(prevCopy.assignedBayId, prevCopy.id, prevCopy.technicianName || '')
            .catch(() => {});
        }
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setOrders((prev) => prev.map((o) => (o.id === nextCopy.id ? nextCopy : o)));
        if (status === 'Delivered' && nextCopy.assignedBayId) {
          setBays((prevBaysState) =>
            prevBaysState.map((b) =>
              b.id === nextCopy.assignedBayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b
            )
          );
          void garageService.releaseBay(nextCopy.assignedBayId).catch(() => {});
        }
        void garageService.upsertWorkOrder(nextCopy, garageCtx).catch(() => {});
      },
    });
  };

  // Bay Assignment (guarded against occupied double-assignment)
  const assignBayToOrder = (
    orderId: string,
    bayId: string
  ): { ok: boolean; errorMessage?: string } => {
    const targetBay = latestRef.current.bays.find((b) => b.id === bayId);
    const targetOrder = latestRef.current.orders.find((o) => o.id === orderId);
    if (!targetOrder) return { ok: false, errorMessage: 'Ordre de réparation introuvable.' };

    const guard = evaluateBayAssignment({ bay: targetBay, workOrderId: orderId });
    if (!guard.ok) {
      return { ok: false, errorMessage: guard.errorMessage };
    }

    const prevOrder = cloneSnapshot(targetOrder);
    const prevBays = cloneSnapshot(latestRef.current.bays);
    const nextOrder = withBranch({ ...targetOrder, assignedBayId: bayId, bayName: targetBay?.name });

    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    setBays((prev) =>
      prev.map((b) => {
        if (b.id === bayId) return { ...b, isOccupied: true, activeOrderId: orderId };
        if (b.activeOrderId === orderId) return { ...b, isOccupied: false, activeOrderId: undefined };
        return b;
      })
    );
    emitGarageSync('atrium_garage_orders_v2');
    emitGarageSync('atrium_garage_bays_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
    void garageService.assignBay(bayId, orderId, targetOrder.technicianName || '').catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'status',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: targetOrder.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Pont ${targetBay?.name || bayId} affecté à ${targetOrder.orderNumber}`,
        en: `Bay ${targetBay?.name || bayId} assigned to ${targetOrder.orderNumber}`,
        ar: `تم تخصيص المحطة لطلب ${targetOrder.orderNumber}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevOrder);
        setOrders((prev) => prev.map((o) => (o.id === prevCopy.id ? prevCopy : o)));
        setBays(cloneSnapshot(prevBays));
        void garageService.upsertWorkOrder(withBranch(prevCopy), garageCtx).catch(() => {});
        void garageService.releaseBay(bayId).catch(() => {});
        if (prevCopy.assignedBayId) {
          void garageService
            .assignBay(prevCopy.assignedBayId, prevCopy.id, prevCopy.technicianName || '')
            .catch(() => {});
        }
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextOrder);
        setOrders((prev) => prev.map((o) => (o.id === nextCopy.id ? nextCopy : o)));
        setBays((prev) =>
          prev.map((b) => {
            if (b.id === bayId) return { ...b, isOccupied: true, activeOrderId: orderId };
            if (b.activeOrderId === orderId) return { ...b, isOccupied: false, activeOrderId: undefined };
            return b;
          })
        );
        void garageService.upsertWorkOrder(nextCopy, garageCtx).catch(() => {});
        void garageService.assignBay(bayId, orderId, targetOrder.technicianName || '').catch(() => {});
      },
    });
    return { ok: true };
  };

  const releaseBay = (bayId: string) => {
    const existingBay = latestRef.current.bays.find((b) => b.id === bayId);
    const prevBay = existingBay ? cloneSnapshot(existingBay) : null;
    setBays((prev) =>
      prev.map((b) => (b.id === bayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b))
    );
    void garageService.releaseBay(bayId).catch(() => {});

    if (prevBay) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'status',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: prevBay.name,
        summary: pickLocalizedText(language, {
          fr: `Pont ${prevBay.name} libéré`,
          en: `Bay ${prevBay.name} released`,
          ar: `تم تحرير المحطة ${prevBay.name}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevBay);
          setBays((prev) => prev.map((b) => (b.id === prevCopy.id ? prevCopy : b)));
          if (prevCopy.isOccupied && prevCopy.activeOrderId) {
            void garageService
              .assignBay(prevCopy.id, prevCopy.activeOrderId, prevCopy.assignedTechnicianName || '')
              .catch(() => {});
          }
        },
        redo: () => {
          setBays((prev) =>
            prev.map((b) => (b.id === bayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b))
          );
          void garageService.releaseBay(bayId).catch(() => {});
        },
      });
    }
  };

  // Vehicle Mutations
  const addVehicle = (vehicle: VehicleAsset) => {
    const scoped = withBranch(vehicle);
    const snap = cloneSnapshot(scoped);
    setVehicles((prev) => [scoped, ...prev]);
    void garageService.upsertVehicle(scoped, garageCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.plateNumber,
      summary: pickLocalizedText(language, {
        fr: `Véhicule ${scoped.plateNumber} ajouté`,
        en: `Vehicle ${scoped.plateNumber} added`,
        ar: `تمت إضافة المركبة ${scoped.plateNumber}`,
      }),
      undo: () => {
        setVehicles((prev) => prev.filter((v) => v.id !== snap.id));
        void garageService.deleteVehicle(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setVehicles((prev) => (prev.some((v) => v.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('garage_vehicles', re.id, currentStaffId)
          .then(() => garageService.upsertVehicle(re, garageCtx))
          .catch(() => {});
      },
    });
  };

  const updateVehicle = (vehicle: VehicleAsset) => {
    const scoped = withBranch(vehicle);
    const existing = latestRef.current.vehicles.find((v) => v.id === vehicle.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? scoped : v)));
    void garageService.upsertVehicle(scoped, garageCtx).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'edit',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.plateNumber,
        summary: pickLocalizedText(language, {
          fr: `Véhicule ${nextSnap.plateNumber} modifié`,
          en: `Vehicle ${nextSnap.plateNumber} updated`,
          ar: `تم تعديل المركبة ${nextSnap.plateNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setVehicles((prev) => prev.map((v) => (v.id === prevCopy.id ? prevCopy : v)));
          void garageService.upsertVehicle(withBranch(prevCopy), garageCtx).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setVehicles((prev) => prev.map((v) => (v.id === nextCopy.id ? nextCopy : v)));
          void garageService.upsertVehicle(nextCopy, garageCtx).catch(() => {});
        },
      });
    }
  };

  const deleteVehicle = (id: string) => {
    const idx = latestRef.current.vehicles.findIndex((v) => v.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.vehicles[idx]) : null;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    void garageService.deleteVehicle(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'delete',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.plateNumber,
        summary: pickLocalizedText(language, {
          fr: `Véhicule ${existing.plateNumber} supprimé`,
          en: `Vehicle ${existing.plateNumber} deleted`,
          ar: `تم حذف المركبة ${existing.plateNumber}`,
        }),
        undo: () => {
          restoreAt(setVehicles, existing, idx);
          void syncCoordinator
            .restoreRow('garage_vehicles', existing.id, currentStaffId)
            .then(() => garageService.upsertVehicle(withBranch(cloneSnapshot(existing)), garageCtx))
            .catch(() => {});
        },
        redo: () => {
          setVehicles((prev) => prev.filter((v) => v.id !== existing.id));
          void garageService.deleteVehicle(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Spare Part Mutations & Requisition
  const addPart = (part: SparePart) => {
    const scoped = withBranch(part);
    const snap = cloneSnapshot(scoped);
    setParts((prev) => [scoped, ...prev]);
    void garageService.upsertPart(scoped, garageCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.name,
      summary: pickLocalizedText(language, {
        fr: `Pièce ${scoped.name} ajoutée`,
        en: `Spare part ${scoped.name} added`,
        ar: `تمت إضافة قطعة الغيار ${scoped.name}`,
      }),
      undo: () => {
        setParts((prev) => prev.filter((p) => p.id !== snap.id));
        void garageService.deletePart(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setParts((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('garage_parts', re.id, currentStaffId)
          .then(() => garageService.upsertPart(re, garageCtx))
          .catch(() => {});
      },
    });
  };

  const updatePart = (part: SparePart) => {
    const scoped = withBranch(part);
    const existing = latestRef.current.parts.find((p) => p.id === part.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setParts((prev) => prev.map((p) => (p.id === part.id ? scoped : p)));
    void garageService.upsertPart(scoped, garageCtx).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'edit',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.name,
        summary: pickLocalizedText(language, {
          fr: `Pièce ${nextSnap.name} modifiée`,
          en: `Spare part ${nextSnap.name} updated`,
          ar: `تم تعديل قطعة الغيار ${nextSnap.name}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setParts((prev) => prev.map((p) => (p.id === prevCopy.id ? prevCopy : p)));
          void garageService.upsertPart(withBranch(prevCopy), garageCtx).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setParts((prev) => prev.map((p) => (p.id === nextCopy.id ? nextCopy : p)));
          void garageService.upsertPart(nextCopy, garageCtx).catch(() => {});
        },
      });
    }
  };

  const deletePart = (id: string) => {
    const idx = latestRef.current.parts.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.parts[idx]) : null;
    setParts((prev) => prev.filter((p) => p.id !== id));
    void garageService.deletePart(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'delete',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.name,
        summary: pickLocalizedText(language, {
          fr: `Pièce ${existing.name} supprimée`,
          en: `Spare part ${existing.name} deleted`,
          ar: `تم حذف قطعة الغيار ${existing.name}`,
        }),
        undo: () => {
          restoreAt(setParts, existing, idx);
          void syncCoordinator
            .restoreRow('garage_parts', existing.id, currentStaffId)
            .then(() => garageService.upsertPart(withBranch(cloneSnapshot(existing)), garageCtx))
            .catch(() => {});
        },
        redo: () => {
          setParts((prev) => prev.filter((p) => p.id !== existing.id));
          void garageService.deletePart(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const requisitionPartToOrder = (orderId: string, partId: string, quantity = 1) => {
    const part = latestRef.current.parts.find((p) => p.id === partId);
    const targetOrder = latestRef.current.orders.find((o) => o.id === orderId);
    if (!part || !targetOrder || part.stockQuantity < quantity) return false;

    const prevPartSnap = cloneSnapshot(part);
    const prevOrderSnap = cloneSnapshot(targetOrder);
    const nextStock = Math.max(0, part.stockQuantity - quantity);
    const nextPartSnap = cloneSnapshot(withBranch({ ...part, stockQuantity: nextStock }));

    const existingLine = targetOrder.partsUsed.find((line) => line.partId === partId);
    let updatedParts: RequisitionedPartLine[];
    if (existingLine) {
      updatedParts = targetOrder.partsUsed.map((line) =>
        line.partId === partId
          ? {
              ...line,
              quantity: line.quantity + quantity,
              totalPriceDzd: (line.quantity + quantity) * line.unitPriceDzd,
            }
          : line
      );
    } else {
      updatedParts = [
        ...targetOrder.partsUsed,
        {
          id: `req_${Date.now()}`,
          partId: part.id,
          name: part.name,
          sku: part.sku,
          quantity,
          unitPriceDzd: part.sellingPriceDzd,
          totalPriceDzd: quantity * part.sellingPriceDzd,
          issuedAt: new Date().toISOString(),
        },
      ];
    }

    const newPartsCost = updatedParts.reduce((acc, p) => acc + p.totalPriceDzd, 0);
    const finalCost = (targetOrder.laborCostDzd || 0) + newPartsCost;
    const nextOrder = withBranch({
      ...targetOrder,
      partsUsed: updatedParts,
      partsCostDzd: newPartsCost,
      finalCostDzd: finalCost,
    });
    const nextOrderSnap = cloneSnapshot(nextOrder);

    setParts((prev) => prev.map((p) => (p.id === partId ? nextPartSnap : p)));
    void garageService.upsertPart(nextPartSnap, garageCtx).catch(() => {});
    void garageService.requisitionPart(orderId, partId, quantity).catch(() => {});

    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'edit',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: targetOrder.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Pièce ${part.name} (×${quantity}) imputée à ${targetOrder.orderNumber}`,
        en: `Part ${part.name} (×${quantity}) issued to ${targetOrder.orderNumber}`,
        ar: `تم صرف ${part.name} (×${quantity}) للأمر ${targetOrder.orderNumber}`,
      }),
      undo: () => {
        const prevPartCopy = cloneSnapshot(prevPartSnap);
        const prevOrderCopy = cloneSnapshot(prevOrderSnap);
        setParts((prev) => prev.map((p) => (p.id === prevPartCopy.id ? prevPartCopy : p)));
        setOrders((prev) => prev.map((o) => (o.id === prevOrderCopy.id ? prevOrderCopy : o)));
        void garageService.upsertPart(withBranch(prevPartCopy), garageCtx).catch(() => {});
        void garageService.upsertWorkOrder(withBranch(prevOrderCopy), garageCtx).catch(() => {});
      },
      redo: () => {
        const nextPartCopy = cloneSnapshot(nextPartSnap);
        const nextOrderCopy = cloneSnapshot(nextOrderSnap);
        setParts((prev) => prev.map((p) => (p.id === nextPartCopy.id ? nextPartCopy : p)));
        setOrders((prev) => prev.map((o) => (o.id === nextOrderCopy.id ? nextOrderCopy : o)));
        void garageService.upsertPart(nextPartCopy, garageCtx).catch(() => {});
        void garageService.upsertWorkOrder(nextOrderCopy, garageCtx).catch(() => {});
      },
    });

    return true;
  };

  // Fleet Mutations
  const addFleet = (fleet: CorporateFleetAccount) => {
    const scoped = withBranch(fleet);
    const snap = cloneSnapshot(scoped);
    setFleets((prev) => [scoped, ...prev]);
    void garageService.upsertFleetAccount(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.companyName,
      summary: pickLocalizedText(language, {
        fr: `Flotte ${scoped.companyName} ajoutée`,
        en: `Fleet ${scoped.companyName} added`,
        ar: `تمت إضافة الأسطول ${scoped.companyName}`,
      }),
      undo: () => {
        setFleets((prev) => prev.filter((f) => f.id !== snap.id));
        void garageService.deleteFleetAccount(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setFleets((prev) => (prev.some((f) => f.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('garage_fleet_contracts', re.id, currentStaffId)
          .then(() => garageService.upsertFleetAccount(re))
          .catch(() => {});
      },
    });
  };

  const updateFleet = (fleet: CorporateFleetAccount) => {
    const scoped = withBranch(fleet);
    const existing = latestRef.current.fleets.find((f) => f.id === fleet.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setFleets((prev) => prev.map((f) => (f.id === fleet.id ? scoped : f)));
    void garageService.upsertFleetAccount(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'edit',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.companyName,
        summary: pickLocalizedText(language, {
          fr: `Flotte ${nextSnap.companyName} modifiée`,
          en: `Fleet ${nextSnap.companyName} updated`,
          ar: `تم تعديل الأسطول ${nextSnap.companyName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setFleets((prev) => prev.map((f) => (f.id === prevCopy.id ? prevCopy : f)));
          void garageService.upsertFleetAccount(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setFleets((prev) => prev.map((f) => (f.id === nextCopy.id ? nextCopy : f)));
          void garageService.upsertFleetAccount(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteFleet = (id: string) => {
    const idx = latestRef.current.fleets.findIndex((f) => f.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.fleets[idx]) : null;
    setFleets((prev) => prev.filter((f) => f.id !== id));
    void garageService.deleteFleetAccount(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'auto_garage',
        operationType: 'delete',
        businessId: garageCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.companyName,
        summary: pickLocalizedText(language, {
          fr: `Flotte ${existing.companyName} supprimée`,
          en: `Fleet ${existing.companyName} deleted`,
          ar: `تم حذف الأسطول ${existing.companyName}`,
        }),
        undo: () => {
          restoreAt(setFleets, existing, idx);
          void syncCoordinator
            .restoreRow('garage_fleet_contracts', existing.id, currentStaffId)
            .then(() => garageService.upsertFleetAccount(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setFleets((prev) => prev.filter((f) => f.id !== existing.id));
          void garageService.deleteFleetAccount(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Invoicing Mutations
  const createInvoice = (inv: GarageInvoice) => {
    const scopedInv = withBranch(inv);
    const invSnap = cloneSnapshot(scopedInv);
    const linkedOrder = latestRef.current.orders.find((o) => o.id === scopedInv.orderId);
    const prevOrderSnap = linkedOrder ? cloneSnapshot(linkedOrder) : null;

    setInvoices((prev) => [scopedInv, ...prev]);
    void garageService.upsertInvoice(scopedInv).catch(() => {});
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== scopedInv.orderId) return o;
        const next = {
          ...o,
          isPaid: scopedInv.isPaid,
          billingType: scopedInv.billingType,
          invoiceId: scopedInv.id,
          isLockedInvoiced: true,
        };
        void garageService.upsertWorkOrder(withBranch(next), garageCtx).catch(() => {});
        return next;
      })
    );
    emitGarageSync('atrium_garage_invoices_v2');
    emitGarageSync('atrium_garage_orders_v2');

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scopedInv.invoiceNumber,
      summary: pickLocalizedText(language, {
        fr: `Facture ${scopedInv.invoiceNumber} générée`,
        en: `Invoice ${scopedInv.invoiceNumber} generated`,
        ar: `تم إنشاء الفاتورة ${scopedInv.invoiceNumber}`,
      }),
      undo: () => {
        setInvoices((prev) => prev.filter((i) => i.id !== invSnap.id));
        void garageService.deleteInvoice(invSnap.id, currentStaffId).catch(() => {});
        if (prevOrderSnap) {
          const prevOrderCopy = cloneSnapshot(prevOrderSnap);
          setOrders((prev) => prev.map((o) => (o.id === prevOrderCopy.id ? prevOrderCopy : o)));
          void garageService.upsertWorkOrder(withBranch(prevOrderCopy), garageCtx).catch(() => {});
        }
      },
      redo: () => {
        const re = cloneSnapshot(invSnap);
        setInvoices((prev) => (prev.some((i) => i.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('garage_invoices', re.id, currentStaffId)
          .then(() => garageService.upsertInvoice(re))
          .catch(() => {});
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== re.orderId) return o;
            const next = { ...o, isPaid: re.isPaid, billingType: re.billingType, invoiceId: re.id };
            void garageService.upsertWorkOrder(withBranch(next), garageCtx).catch(() => {});
            return next;
          })
        );
      },
    });
  };

  const markInvoicePaid = (id: string) => {
    const existing = latestRef.current.invoices.find((i) => i.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const next = withBranch({ ...existing, isPaid: true });
    const nextSnap = cloneSnapshot(next);
    setInvoices((prev) => prev.map((i) => (i.id === id ? next : i)));
    void garageService.upsertInvoice(next).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'status',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: existing.invoiceNumber,
      summary: pickLocalizedText(language, {
        fr: `Facture ${existing.invoiceNumber} encaissée`,
        en: `Invoice ${existing.invoiceNumber} marked paid`,
        ar: `تم تحصيل الفاتورة ${existing.invoiceNumber}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setInvoices((prev) => prev.map((i) => (i.id === prevCopy.id ? prevCopy : i)));
        void garageService.upsertInvoice(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setInvoices((prev) => prev.map((i) => (i.id === nextCopy.id ? nextCopy : i)));
        void garageService.upsertInvoice(nextCopy).catch(() => {});
      },
    });
  };

  // Reset active branch data to empty state
  const resetGarageDemoData = () => {
    const snap = cloneSnapshot(latestRef.current);
    setOrders((prev) => prev.filter((o) => !belongsToActiveBranch(o)));
    setVehicles((prev) => prev.filter((v) => !belongsToActiveBranch(v)));
    setParts((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setInvoices((prev) => prev.filter((i) => !belongsToActiveBranch(i)));
    if (activeBranchId === 'branch_garage_main') {
      setBays(INITIAL_BAYS);
      setFleets(INITIAL_FLEETS);
    }

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'bulk',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données atelier réinitialisées',
        en: 'Workshop data reset',
        ar: 'تمت إعادة ضبط بيانات الورشة',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setOrders(s.orders);
        setVehicles(s.vehicles);
        setParts(s.parts);
        setInvoices(s.invoices);
        setBays(s.bays);
        setFleets(s.fleets);
      },
    });
  };

  const closeCashRegisterZ = (): GarageCashClosure => {
    const activeInvoices = latestRef.current.invoices.filter(belongsToActiveBranch);
    const paidInvoices = activeInvoices.filter((i) => i.isPaid);
    const cashTotalDzd = paidInvoices.filter((i) => i.paymentMethod === 'especes').reduce((s, i) => s + i.netToPayDzd, 0);
    const cardTotalDzd = paidInvoices.filter((i) => i.paymentMethod === 'cib_dahabia').reduce((s, i) => s + i.netToPayDzd, 0);
    const transferTotalDzd = paidInvoices.filter((i) => i.paymentMethod === 'virement').reduce((s, i) => s + i.netToPayDzd, 0);
    const checkTotalDzd = paidInvoices.filter((i) => i.paymentMethod === 'cheque').reduce((s, i) => s + i.netToPayDzd, 0);
    const timbreFiscalTotalDzd = paidInvoices.reduce((s, i) => s + i.timbreFiscal, 0);
    const seq = cashClosures.filter(belongsToActiveBranch).length + 1;
    const zNumber = `Z-GAR-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
    const closure: GarageCashClosure = {
      id: `gar_z_${Date.now()}`,
      branchId: activeBranchId,
      businessId: garageCtx.businessId,
      accountId: garageCtx.accountId,
      zNumber,
      closedAt: new Date().toISOString(),
      closedBy: currentStaffId || 'Gérant',
      cashTotalDzd,
      cardTotalDzd,
      transferTotalDzd,
      checkTotalDzd,
      timbreFiscalTotalDzd,
      grandTotalDzd: cashTotalDzd + cardTotalDzd + transferTotalDzd + checkTotalDzd,
      invoiceCount: paidInvoices.length,
    };

    setCashClosures((prev) => [closure, ...prev]);

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'create',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: zNumber,
      summary: pickLocalizedText(language, {
        fr: `Clôture caisse ${zNumber} enregistrée (${closure.grandTotalDzd.toLocaleString()} DA)`,
        en: `Register Z closure ${zNumber} recorded (${closure.grandTotalDzd.toLocaleString()} DA)`,
        ar: `تم إقفال الصندوق ${zNumber} (${closure.grandTotalDzd.toLocaleString()} دج)`,
      }),
      undo: () => {
        setCashClosures((prev) => prev.filter((c) => c.id !== closure.id));
      },
      redo: () => {
        setCashClosures((prev) => (prev.some((c) => c.id === closure.id) ? prev : [closure, ...prev]));
      },
    });

    return closure;
  };

  // Phase 3 Step 10 (7.10) Depth Actions
  const transferVehicleOwner = (
    vehicleId: string,
    params: {
      newOwnerName: string;
      newOwnerPhone: string;
      newOwnerEmail?: string;
      newFleetId?: string;
      newFleetName?: string;
      reason: string;
      odometerAtTransferKm?: number;
    }
  ) => {
    const existing = latestRef.current.vehicles.find((v) => v.id === vehicleId);
    if (!existing) throw new Error('VEHICLE_NOT_FOUND');
    const prevSnap = cloneSnapshot(existing);
    const { updatedVehicle } = transferVehicleOwnership({
      vehicle: existing,
      ...params,
    });
    const scoped = withBranch(updatedVehicle);
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? scoped : v)));
    emitGarageSync('atrium_garage_vehicles_v2');
    void garageService.upsertVehicle(scoped, garageCtx).catch(() => {});
    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'edit',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.plateNumber,
      summary: pickLocalizedText(language, {
        fr: `Cession véhicule ${scoped.plateNumber} → ${scoped.ownerName}`,
        en: `Vehicle ${scoped.plateNumber} transferred → ${scoped.ownerName}`,
        ar: `نقل ملكية المركبة ${scoped.plateNumber} ← ${scoped.ownerName}`,
      }),
      undo: () => {
        setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? prevSnap : v)));
        void garageService.upsertVehicle(withBranch(prevSnap), garageCtx).catch(() => {});
      },
      redo: () => {
        setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? scoped : v)));
        void garageService.upsertVehicle(scoped, garageCtx).catch(() => {});
      },
    });
    return scoped;
  };

  const approveWorkOrderEstimate = (orderId: string, approvedBy: string) => {
    const existing = latestRef.current.orders.find((o) => o.id === orderId);
    if (!existing) return null;
    const prevSnap = cloneSnapshot(existing);
    const snapshot = captureQuoteUnitPricesSnapshot(existing.partsUsed);
    const nextOrder = withBranch({
      ...existing,
      estimateStatus: 'approved' as const,
      estimateApprovedAt: new Date().toISOString(),
      estimateApprovedBy: approvedBy.trim() || 'Client',
      quoteUnitPricesSnapshot: snapshot,
      status: existing.status === 'WaitingApproval' ? ('InRepair' as const) : existing.status,
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'status',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: nextOrder.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Devis ${nextOrder.orderNumber} approuvé`,
        en: `Estimate ${nextOrder.orderNumber} approved`,
        ar: `تمت الموافقة على عرض السعر ${nextOrder.orderNumber}`,
      }),
      undo: () => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? prevSnap : o)));
        void garageService.upsertWorkOrder(withBranch(prevSnap), garageCtx).catch(() => {});
      },
      redo: () => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
        void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
      },
    });
    return nextOrder;
  };

  const attachEstimatePhoto = (orderId: string, photo: GarageEstimatePhoto) => {
    const existing = latestRef.current.orders.find((o) => o.id === orderId);
    if (!existing) return;
    const nextOrder = withBranch({
      ...existing,
      estimatePhotos: [photo, ...(existing.estimatePhotos || [])],
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
  };

  const removeEstimatePhoto = (orderId: string, photoId: string) => {
    const existing = latestRef.current.orders.find((o) => o.id === orderId);
    if (!existing) return;
    const nextOrder = withBranch({
      ...existing,
      estimatePhotos: (existing.estimatePhotos || []).filter((p) => p.id !== photoId),
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
  };

  const addFlatRateLaborLine = (
    orderId: string,
    item: FlatRateLaborItem,
    technicianStaffId?: string,
    technicianName?: string
  ) => {
    const existing = latestRef.current.orders.find((o) => o.id === orderId);
    if (!existing) return null;
    const fleet = existing.fleetId
      ? latestRef.current.fleets.find((f) => f.id === existing.fleetId)
      : undefined;
    const line = computeFlatRateLaborLine({
      item,
      fleetNegotiatedHourlyRateDzd: fleet?.negotiatedHourlyRateDzd,
      technicianStaffId,
      technicianName: technicianName || existing.technicianName,
    });
    const nextLines = [...(existing.laborLines || []), line];
    const laborHoursActual = nextLines.reduce((s, l) => s + l.hours, 0);
    const laborCostDzd = nextLines.reduce((s, l) => s + l.totalDzd, 0);
    const partsCostDzd = existing.partsUsed.reduce((s, p) => s + p.totalPriceDzd, 0);
    const nextOrder = withBranch({
      ...existing,
      laborLines: nextLines,
      laborHoursActual,
      laborCostDzd,
      partsCostDzd,
      finalCostDzd: laborCostDzd + partsCostDzd,
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
    return nextOrder;
  };

  const startWorkOrderTimer = (params: {
    orderId: string;
    technicianStaffId?: string;
    technicianName: string;
    taskLabel: string;
    commissionRateBps?: number;
  }) => {
    const order = latestRef.current.orders.find((o) => o.id === params.orderId);
    if (!order) return null;
    const log = startTechTimeLog({
      branchId: activeBranchId,
      workOrderId: order.id,
      orderNumber: order.orderNumber,
      technicianStaffId: params.technicianStaffId,
      technicianName: params.technicianName,
      taskLabel: params.taskLabel,
      commissionRateBps: params.commissionRateBps,
    });
    setTimeLogs((prev) => [log, ...prev]);
    emitGarageSync('atrium_garage_time_logs_v1');
    void garageService.upsertTechTimeLog(log, garageCtx).catch(() => {});
    return log;
  };

  const stopWorkOrderTimer = (logId: string, hourlyRateOverrideDzd?: number) => {
    const log = latestRef.current.timeLogs.find((l) => l.id === logId);
    if (!log || log.status !== 'running') return null;
    const order = latestRef.current.orders.find((o) => o.id === log.workOrderId);
    const hourlyRateDzd = hourlyRateOverrideDzd ?? order?.hourlyRateDzd ?? 2500;
    const { completedLog, commissionRecord } = stopTechTimeLog({
      log,
      hourlyRateDzd,
      accountId: garageCtx.accountId,
      businessId: garageCtx.businessId,
    });
    setTimeLogs((prev) => prev.map((l) => (l.id === logId ? completedLog : l)));
    emitGarageSync('atrium_garage_time_logs_v1');
    void garageService.upsertTechTimeLog(completedLog, garageCtx).catch(() => {});
    atriumActions.recordGarageTechCommission(commissionRecord);
    return { completedLog, commissionRecord };
  };

  const applyDetailingPackage = (orderId: string, pkg: DetailingPackage) => {
    const existing = latestRef.current.orders.find((o) => o.id === orderId);
    if (!existing) return null;
    const pkgLine: OrderLaborLine = {
      id: `lab_det_${Date.now()}`,
      flatRateCode: pkg.code,
      label: `Detailing · ${pkg.name}`,
      hours: Number((pkg.durationMinutes / 60).toFixed(2)),
      hourlyRateDzd: pkg.priceDzd,
      totalDzd: pkg.priceDzd,
      technicianName: existing.technicianName,
    };
    const nextLines = [...(existing.laborLines || []), pkgLine];
    const laborCostDzd = nextLines.reduce((s, l) => s + l.totalDzd, 0);
    const partsCostDzd = existing.partsUsed.reduce((s, p) => s + p.totalPriceDzd, 0);
    const nextOrder = withBranch({
      ...existing,
      detailingPackageId: pkg.id,
      laborLines: nextLines,
      laborCostDzd,
      finalCostDzd: laborCostDzd + partsCostDzd,
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? nextOrder : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.upsertWorkOrder(nextOrder, garageCtx).catch(() => {});
    return nextOrder;
  };

  const addSupplier = (supplier: Omit<GarageSupplierRecord, 'id' | 'branchId'>) => {
    const record: GarageSupplierRecord = {
      ...supplier,
      id: `sup_gar_${Date.now()}`,
      branchId: activeBranchId,
    };
    setSuppliers((prev) => [record, ...prev]);
    void garageService.upsertSupplier(record, garageCtx).catch(() => {});
    return record;
  };

  const createPurchaseOrder = (params: {
    supplierId: string;
    supplierName: string;
    items: GaragePurchaseOrderLine[];
    warrantyMonths?: number;
    notes?: string;
    status?: 'Draft' | 'Ordered';
  }) => {
    const po = createSupplierPurchaseOrder({
      branchId: activeBranchId,
      existingPoNumbers: latestRef.current.purchaseOrders.map((p) => p.poNumber),
      ...params,
    });
    setPurchaseOrders((prev) => [po, ...prev]);
    emitGarageSync('atrium_garage_pos_v1');
    void garageService.upsertPurchaseOrder(po, garageCtx).catch(() => {});
    return po;
  };

  const receivePurchaseOrderWithBl = (params: {
    poId: string;
    deliveryNoteNumber: string;
    receivedByName: string;
    receivedLines?: GaragePurchaseOrderLine[];
  }) => {
    const po = latestRef.current.purchaseOrders.find((p) => p.id === params.poId);
    if (!po) throw new Error('GARAGE_PO_NOT_FOUND');
    const prevPartsSnap = cloneSnapshot(latestRef.current.parts);
    const prevPoSnap = cloneSnapshot(po);
    const { updatedPo, stockAdjustments } = receivePurchaseOrderGoods({
      po,
      deliveryNoteNumber: params.deliveryNoteNumber,
      receivedByName: params.receivedByName,
      receivedLines: params.receivedLines,
    });

    setPurchaseOrders((prev) => prev.map((p) => (p.id === po.id ? updatedPo : p)));
    setParts((prev) =>
      prev.map((part) => {
        const adj = stockAdjustments.find((a) => a.partId === part.id);
        if (!adj) return part;
        const nextPart = withBranch({
          ...part,
          stockQuantity: part.stockQuantity + adj.addedQty,
          buyingPriceDzd: adj.newBuyingPriceDzd > 0 ? adj.newBuyingPriceDzd : part.buyingPriceDzd,
          supplierId: po.supplierId || part.supplierId,
          supplierName: po.supplierName || part.supplierName,
        });
        void garageService.upsertPart(nextPart, garageCtx).catch(() => {});
        return nextPart;
      })
    );
    emitGarageSync('atrium_garage_pos_v1');
    emitGarageSync('atrium_garage_parts_v2');
    void garageService.receivePurchaseOrder(po.id, params.deliveryNoteNumber, params.receivedByName, params.receivedLines).catch(() => {});

    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'edit',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: updatedPo.poNumber,
      summary: pickLocalizedText(language, {
        fr: `Réception BL ${updatedPo.deliveryNoteNumber} (${updatedPo.poNumber}) enregistrée`,
        en: `Goods receipt BL ${updatedPo.deliveryNoteNumber} (${updatedPo.poNumber}) completed`,
        ar: `تم استلام وصل التسليم ${updatedPo.deliveryNoteNumber} للطلب ${updatedPo.poNumber}`,
      }),
      undo: () => {
        setPurchaseOrders((prev) => prev.map((p) => (p.id === po.id ? prevPoSnap : p)));
        setParts(prevPartsSnap);
      },
      redo: () => {
        setPurchaseOrders((prev) => prev.map((p) => (p.id === po.id ? updatedPo : p)));
      },
    });
    return { updatedPo, stockAdjustments };
  };

  const upsertInsuranceClaim = (claim: BodyShopInsuranceClaim) => {
    const scoped: BodyShopInsuranceClaim = { ...claim, branchId: claim.branchId || activeBranchId };
    setClaims((prev) => {
      const idx = prev.findIndex((c) => c.id === scoped.id);
      return idx >= 0 ? prev.map((c) => (c.id === scoped.id ? scoped : c)) : [scoped, ...prev];
    });
    void garageService.upsertInsuranceClaim(scoped, garageCtx).catch(() => {});
    return scoped;
  };

  const createInspectionPv = (pv: InspectionCenterPv) => {
    const scoped: InspectionCenterPv = { ...pv, branchId: pv.branchId || activeBranchId };
    setInspectionPvs((prev) => [scoped, ...prev.filter((p) => p.id !== scoped.id)]);
    void garageService.upsertInspectionPv(scoped, garageCtx).catch(() => {});
    return scoped;
  };

  const upsertTireStorageEntry = (entry: TireStorageEntry) => {
    const scoped: TireStorageEntry = { ...entry, branchId: entry.branchId || activeBranchId };
    setTireStorage((prev) => {
      const idx = prev.findIndex((t) => t.id === scoped.id);
      return idx >= 0 ? prev.map((t) => (t.id === scoped.id ? scoped : t)) : [scoped, ...prev];
    });
    emitGarageSync('atrium_garage_tire_storage_v1');
    void garageService.upsertTireStorage(scoped, garageCtx).catch(() => {});
    return scoped;
  };

  const reopenInvoicedWorkOrder = (params: {
    orderId: string;
    creditNoteId: string;
    creditNoteNumber: string;
    reason: string;
  }) => {
    const existing = latestRef.current.orders.find((o) => o.id === params.orderId);
    if (!existing) throw new Error('GARAGE_WORK_ORDER_NOT_FOUND');
    const prevSnap = cloneSnapshot(existing);
    const updated = withBranch(
      prepareWorkOrderReopenWithCreditNote({
        order: existing,
        creditNoteId: params.creditNoteId,
        creditNoteNumber: params.creditNoteNumber,
        reason: params.reason,
      })
    );
    setOrders((prev) => prev.map((o) => (o.id === existing.id ? updated : o)));
    emitGarageSync('atrium_garage_orders_v2');
    void garageService.reopenWorkOrderWithCreditNote(existing.id, params.creditNoteId, params.reason).catch(() => {});
    void garageService.upsertWorkOrder(updated, garageCtx).catch(() => {});
    registerUndoEntry({
      vertical: 'auto_garage',
      operationType: 'status',
      businessId: garageCtx.businessId,
      branchId: activeBranchId,
      entityLabel: updated.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `OR ${updated.orderNumber} réouvert suite à Avoir ${params.creditNoteNumber}`,
        en: `Work order ${updated.orderNumber} reopened via Credit Note ${params.creditNoteNumber}`,
        ar: `إعادة فتح أمر الإصلاح ${updated.orderNumber} بإشعار دائن ${params.creditNoteNumber}`,
      }),
      undo: () => {
        setOrders((prev) => prev.map((o) => (o.id === existing.id ? prevSnap : o)));
        void garageService.upsertWorkOrder(withBranch(prevSnap), garageCtx).catch(() => {});
      },
      redo: () => {
        setOrders((prev) => prev.map((o) => (o.id === existing.id ? updated : o)));
        void garageService.upsertWorkOrder(updated, garageCtx).catch(() => {});
      },
    });
    return updated;
  };

  const scopedOrders = useMemo(() => orders.filter(belongsToActiveBranch), [orders, belongsToActiveBranch]);
  const scopedVehicles = useMemo(() => vehicles.filter(belongsToActiveBranch), [vehicles, belongsToActiveBranch]);
  const scopedParts = useMemo(() => parts.filter(belongsToActiveBranch), [parts, belongsToActiveBranch]);
  const scopedBays = useMemo(() => bays.filter(belongsToActiveBranch), [bays, belongsToActiveBranch]);
  const scopedFleets = useMemo(() => fleets.filter(belongsToActiveBranch), [fleets, belongsToActiveBranch]);
  const scopedInvoices = useMemo(() => invoices.filter(belongsToActiveBranch), [invoices, belongsToActiveBranch]);
  const scopedCashClosures = useMemo(() => cashClosures.filter(belongsToActiveBranch), [cashClosures, belongsToActiveBranch]);
  const scopedSuppliers = useMemo(() => suppliers.filter(belongsToActiveBranch), [suppliers, belongsToActiveBranch]);
  const scopedPurchaseOrders = useMemo(() => purchaseOrders.filter(belongsToActiveBranch), [purchaseOrders, belongsToActiveBranch]);
  const scopedFlatRateCatalog = useMemo(() => flatRateCatalog.filter(belongsToActiveBranch), [flatRateCatalog, belongsToActiveBranch]);
  const scopedTimeLogs = useMemo(() => timeLogs.filter(belongsToActiveBranch), [timeLogs, belongsToActiveBranch]);
  const scopedClaims = useMemo(() => claims.filter(belongsToActiveBranch), [claims, belongsToActiveBranch]);
  const scopedInspectionPvs = useMemo(() => inspectionPvs.filter(belongsToActiveBranch), [inspectionPvs, belongsToActiveBranch]);
  const scopedDetailingPackages = useMemo(() => detailingPackages.filter(belongsToActiveBranch), [detailingPackages, belongsToActiveBranch]);
  const scopedTireStorage = useMemo(() => tireStorage.filter(belongsToActiveBranch), [tireStorage, belongsToActiveBranch]);
  const scopedTechCommissions = useMemo(
    () => (techCommissions || []).filter((c) => (c.branchId || 'branch_garage_main') === activeBranchId),
    [techCommissions, activeBranchId]
  );

  return {
    orders: scopedOrders,
    vehicles: scopedVehicles,
    parts: scopedParts,
    bays: scopedBays,
    fleets: scopedFleets,
    invoices: scopedInvoices,
    cashClosures: scopedCashClosures,
    suppliers: scopedSuppliers,
    purchaseOrders: scopedPurchaseOrders,
    flatRateCatalog: scopedFlatRateCatalog,
    timeLogs: scopedTimeLogs,
    techCommissions: scopedTechCommissions,
    claims: scopedClaims,
    inspectionPvs: scopedInspectionPvs,
    detailingPackages: scopedDetailingPackages,
    tireStorage: scopedTireStorage,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    assignBayToOrder,
    releaseBay,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    transferVehicleOwner,
    addPart,
    updatePart,
    deletePart,
    requisitionPartToOrder,
    addSupplier,
    createPurchaseOrder,
    receivePurchaseOrderWithBl,
    approveWorkOrderEstimate,
    attachEstimatePhoto,
    removeEstimatePhoto,
    addFlatRateLaborLine,
    startWorkOrderTimer,
    stopWorkOrderTimer,
    applyDetailingPackage,
    upsertInsuranceClaim,
    createInspectionPv,
    upsertTireStorageEntry,
    reopenInvoicedWorkOrder,
    addFleet,
    updateFleet,
    deleteFleet,
    createInvoice,
    markInvoicePaid,
    closeCashRegisterZ,
    resetGarageDemoData,
  };
};
