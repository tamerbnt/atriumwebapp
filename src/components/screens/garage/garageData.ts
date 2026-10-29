import { useState, useEffect } from 'react';

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
  technicianChecklist?: Array<{ id: string; label: string; done: boolean }>;
  billingType?: 'bon_caisse' | 'facture_dgi';
  isPaid?: boolean;
  invoiceId?: string;
}

export interface VehicleAsset {
  id: string;
  accountId?: string;
  businessId?: string;
  branchId?: string;
  staffId?: string;
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
  dailyAvgKm?: number;
  carteGriseNumber?: string;
  notes?: string;
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
  supplierName?: string;
  compatibility?: string[];
  createdAt?: string;
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
  const [orders, setOrders] = useState<RepairOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_orders_v2');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [vehicles, setVehicles] = useState<VehicleAsset[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_vehicles_v2');
      return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  const [parts, setParts] = useState<SparePart[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_parts_v2');
      return saved ? JSON.parse(saved) : INITIAL_PARTS;
    } catch {
      return INITIAL_PARTS;
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
      return saved ? JSON.parse(saved) : INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  // LocalStorage synchronizations
  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_orders_v2', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_vehicles_v2', JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_parts_v2', JSON.stringify(parts));
    } catch {}
  }, [parts]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_bays_v2', JSON.stringify(bays));
    } catch {}
  }, [bays]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_fleets_v2', JSON.stringify(fleets));
    } catch {}
  }, [fleets]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_invoices_v2', JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  // Order Mutations
  const addOrder = (order: RepairOrder) => {
    setOrders((prev) => [order, ...prev]);
    // If assigned to a bay, lock that bay
    if (order.assignedBayId) {
      setBays((prevBays) =>
        prevBays.map((b) =>
          b.id === order.assignedBayId ? { ...b, isOccupied: true, activeOrderId: order.id } : b
        )
      );
    }
  };

  const updateOrder = (order: RepairOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setBays((prevBays) =>
      prevBays.map((b) => (b.activeOrderId === id ? { ...b, isOccupied: false, activeOrderId: undefined } : b))
    );
  };

  const updateOrderStatus = (id: string, status: RepairOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        // If delivered or ready, optionally release bay
        if (status === 'Delivered' && o.assignedBayId) {
          setBays((prevBays) =>
            prevBays.map((b) =>
              b.id === o.assignedBayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b
            )
          );
        }
        return { ...o, status };
      })
    );
  };

  // Bay Assignment
  const assignBayToOrder = (orderId: string, bayId: string) => {
    const targetBay = bays.find((b) => b.id === bayId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, assignedBayId: bayId, bayName: targetBay?.name } : o
      )
    );
    setBays((prev) =>
      prev.map((b) => {
        if (b.id === bayId) return { ...b, isOccupied: true, activeOrderId: orderId };
        if (b.activeOrderId === orderId) return { ...b, isOccupied: false, activeOrderId: undefined };
        return b;
      })
    );
  };

  const releaseBay = (bayId: string) => {
    setBays((prev) =>
      prev.map((b) => (b.id === bayId ? { ...b, isOccupied: false, activeOrderId: undefined } : b))
    );
  };

  // Vehicle Mutations
  const addVehicle = (vehicle: VehicleAsset) => {
    setVehicles((prev) => [vehicle, ...prev]);
  };

  const updateVehicle = (vehicle: VehicleAsset) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? vehicle : v)));
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  // Spare Part Mutations & Requisition
  const addPart = (part: SparePart) => {
    setParts((prev) => [part, ...prev]);
  };

  const updatePart = (part: SparePart) => {
    setParts((prev) => prev.map((p) => (p.id === part.id ? part : p)));
  };

  const deletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const requisitionPartToOrder = (orderId: string, partId: string, quantity = 1) => {
    const part = parts.find((p) => p.id === partId);
    if (!part || part.stockQuantity < quantity) return false;

    // Deduct warehouse stock
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - quantity) } : p
      )
    );

    // Append line to repair order
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const existingLine = o.partsUsed.find((line) => line.partId === partId);
        let updatedParts: RequisitionedPartLine[];
        if (existingLine) {
          updatedParts = o.partsUsed.map((line) =>
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
            ...o.partsUsed,
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
        const finalCost = (o.laborCostDzd || 0) + newPartsCost;

        return {
          ...o,
          partsUsed: updatedParts,
          partsCostDzd: newPartsCost,
          finalCostDzd: finalCost,
        };
      })
    );

    return true;
  };

  // Fleet Mutations
  const addFleet = (fleet: CorporateFleetAccount) => {
    setFleets((prev) => [fleet, ...prev]);
  };

  const updateFleet = (fleet: CorporateFleetAccount) => {
    setFleets((prev) => prev.map((f) => (f.id === fleet.id ? fleet : f)));
  };

  const deleteFleet = (id: string) => {
    setFleets((prev) => prev.filter((f) => f.id !== id));
  };

  // Invoicing Mutations
  const createInvoice = (inv: GarageInvoice) => {
    setInvoices((prev) => [inv, ...prev]);
    // Mark order as paid or invoiced
    setOrders((prev) =>
      prev.map((o) =>
        o.id === inv.orderId
          ? {
              ...o,
              isPaid: inv.isPaid,
              billingType: inv.billingType,
              invoiceId: inv.id,
            }
          : o
      )
    );
  };

  const markInvoicePaid = (id: string) => {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, isPaid: true } : i)));
  };

  // Reset demo data
  const resetGarageDemoData = () => {
    setOrders(INITIAL_ORDERS);
    setVehicles(INITIAL_VEHICLES);
    setParts(INITIAL_PARTS);
    setBays(INITIAL_BAYS);
    setFleets(INITIAL_FLEETS);
    setInvoices(INITIAL_INVOICES);
    localStorage.removeItem('atrium_garage_orders_v2');
    localStorage.removeItem('atrium_garage_vehicles_v2');
    localStorage.removeItem('atrium_garage_parts_v2');
    localStorage.removeItem('atrium_garage_bays_v2');
    localStorage.removeItem('atrium_garage_fleets_v2');
    localStorage.removeItem('atrium_garage_invoices_v2');
  };

  return {
    orders,
    vehicles,
    parts,
    bays,
    fleets,
    invoices,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    assignBayToOrder,
    releaseBay,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addPart,
    updatePart,
    deletePart,
    requisitionPartToOrder,
    addFleet,
    updateFleet,
    deleteFleet,
    createInvoice,
    markInvoicePaid,
    resetGarageDemoData,
  };
};
