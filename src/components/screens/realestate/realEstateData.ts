import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  RealEstateProperty,
  RealEstateLease,
  RealEstateInspection,
  RealEstateMandate,
  RentalQuittanceRecord,
  BonDeVisiteRecord,
  BuyerDemandProfile,
} from '../../../types';
import { computeRentalTimbreFiscal, calculateMandateCommission } from '../../../utils/realEstateRules';
import { useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import {
  isSupabaseConfigured,
  realEstateService,
  realtimeService,
  syncCoordinator,
  subscribeConcurrencyResolutions,
  runWithConcurrency,
} from '../../../lib/supabase/index';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';

function mergeReById<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  if (!remoteItems || remoteItems.length === 0) return localItems;
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  remoteItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export const INITIAL_PROPERTIES: RealEstateProperty[] = [
  {
    id: 'prop_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    propertyType: 'Apartment',
    listingType: 'Rental',
    surfaceM2: 145,
    roomsCount: 4,
    address: 'Résidence Les Pins, Djenane El Malik, Hydra',
    cityWilaya: 'Hydra, Alger',
    priceDzd: 180000,
    ownerName: 'Kamel Boumaza',
    ownerPhone: '0550 11 22 33',
    ownerNationalId: '109823487129837401',
    status: 'Rented',
    legalTitleType: 'Acte_Individuel_Livret',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1601-2018-0941',
    volumeNumber: 'Vol. 142',
    caseNumber: 'Case 18',
    cadastralSection: 'Section 04',
    cadastralIlot: 'Îlot 22',
    cadastralLot: 'Lot 14',
    hasNegativeCertificate: true,
    hasCertificatConformite: true,
    isEligibleBankMortgage: true,
    mandateId: 'mnd_01',
    mandateNumber: 'MND-2026-HYD-000142',
    amenities: ['Ascenseur', 'Garage souterrain', 'Chauffage central', 'Vue dégagée', 'Citerne 2000L'],
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'prop_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Bureaux Open-Space Tour Affaires Bab Ezzouar',
    propertyType: 'Office',
    listingType: 'Rental',
    surfaceM2: 280,
    roomsCount: 6,
    address: 'Tour Affaires B, Quartier d\'Affaires, Bab Ezzouar',
    cityWilaya: 'Bab Ezzouar, Alger',
    priceDzd: 450000,
    ownerName: 'Foncière Maghreb SPA',
    ownerPhone: '023 92 00 11',
    ownerNationalId: '0019160098234710',
    status: 'Available',
    legalTitleType: 'Acte_Individuel_Livret',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1605-2020-4102',
    volumeNumber: 'Vol. 88',
    caseNumber: 'Case 04',
    cadastralSection: 'Section 12',
    cadastralIlot: 'Îlot 01',
    cadastralLot: 'Lot 08',
    hasNegativeCertificate: true,
    hasCertificatConformite: true,
    isEligibleBankMortgage: true,
    mandateId: 'mnd_02',
    mandateNumber: 'MND-2026-BEZ-000143',
    amenities: ['Fibre optique', 'Climatisation VRV', 'Accès sécurisé badge', 'Parking 8 places', 'Groupe électrogène'],
    createdAt: '2026-02-11T09:00:00Z',
  },
  {
    id: 'prop_03',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    title: 'Villa Coloniale R+1 avec Piscine Chemin Mackley El Biar',
    propertyType: 'Villa',
    listingType: 'Sale',
    surfaceM2: 420,
    roomsCount: 8,
    address: 'Chemin Mackley, El Biar',
    cityWilaya: 'El Biar, Alger',
    priceDzd: 85000000,
    ownerName: 'Dr. Rachid Benyoucef',
    ownerPhone: '0661 22 33 44',
    ownerNationalId: '107293847192837492',
    status: 'Available',
    legalTitleType: 'Acte_Individuel_Livret',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1602-2015-1849',
    volumeNumber: 'Vol. 201',
    caseNumber: 'Case 33',
    cadastralSection: 'Section 08',
    cadastralIlot: 'Îlot 05',
    cadastralLot: 'Lot 01',
    hasNegativeCertificate: true,
    hasCertificatConformite: true,
    isEligibleBankMortgage: true,
    mandateId: 'mnd_03',
    mandateNumber: 'MND-2026-BIA-000144',
    amenities: ['Piscine chauffée', 'Jardin arboré', 'Bâche à eau 12m³', 'Loge gardien', 'Garage 4 voitures'],
    createdAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'prop_04',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    title: 'Local Commercial Boulevard Didouche Mourad',
    propertyType: 'Commercial',
    listingType: 'Rental',
    surfaceM2: 95,
    roomsCount: 2,
    address: '144 Boulevard Didouche Mourad',
    cityWilaya: 'Alger Centre, Alger',
    priceDzd: 220000,
    ownerName: 'Mourad Hadj-Sadok',
    ownerPhone: '0770 55 66 77',
    ownerNationalId: '108192837492019283',
    status: 'Available',
    legalTitleType: 'Acte_Individuel_Livret',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1600-2012-0049',
    volumeNumber: 'Vol. 312',
    caseNumber: 'Case 12',
    hasNegativeCertificate: true,
    hasCertificatConformite: true,
    isEligibleBankMortgage: true,
    mandateId: 'mnd_04',
    mandateNumber: 'MND-2026-ALG-000145',
    amenities: ['Façade vitrée 8m', 'Rideau électrique', 'Sanitaires', 'Compteur triphasé'],
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'prop_05',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Appartement F3 Vue Mer Kouba Croix-de-Bois',
    propertyType: 'Apartment',
    listingType: 'Sale',
    surfaceM2: 88,
    roomsCount: 3,
    address: 'Cité Oasis, Rue des Frères Bachir, Kouba',
    cityWilaya: 'Kouba, Alger',
    priceDzd: 19500000,
    ownerName: 'Héritiers Si Ahmed',
    ownerPhone: '0555 44 33 22',
    ownerNationalId: '109283746192837482',
    status: 'Available',
    legalTitleType: 'Bien_Dans_Indivision',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1604-2016-5591',
    hasNegativeCertificate: true,
    isIndivision: true,
    fridhaNumber: 'FRIDHA-NOT-2025-0819',
    isEligibleBankMortgage: false,
    mandateId: 'mnd_05',
    mandateNumber: 'MND-2026-KOU-000146',
    amenities: ['Vue sur mer', 'Cuisine équipée', 'Interphone', 'Place de stationnement'],
    createdAt: '2026-03-10T14:00:00Z',
  },
  {
    id: 'prop_06',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_03',
    title: 'Terrain Urbain Constructible R+4 Chéraga Bouchaoui',
    propertyType: 'Land',
    listingType: 'Sale',
    surfaceM2: 560,
    roomsCount: 0,
    address: 'Route Nationale 11, Bouchaoui, Chéraga',
    cityWilaya: 'Chéraga, Alger',
    priceDzd: 67200000,
    ownerName: 'Sarl Foncière Sahel',
    ownerPhone: '021 37 11 00',
    ownerNationalId: '0018160019283746',
    status: 'Available',
    legalTitleType: 'Acte_Individuel_Livret',
    hasLivretFoncier: true,
    livretFoncierNumber: 'LF-1609-2021-3901',
    cadastralSection: 'Section 02',
    cadastralIlot: 'Îlot 40',
    cadastralLot: 'Lot 19',
    hasNegativeCertificate: true,
    isEligibleBankMortgage: true,
    mandateId: 'mnd_06',
    mandateNumber: 'MND-2026-CHE-000147',
    amenities: ['Façade 22m', 'Raccordé Eau Gaz Électricité', 'Certificat d\'urbanisme R+4', 'Voie goudronnée 12m'],
    createdAt: '2026-03-15T09:30:00Z',
  },
];

export const INITIAL_MANDATES: RealEstateMandate[] = [
  {
    id: 'mnd_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    negotiatorName: 'Karim Zerrouki',
    mandateNumber: 'MND-2026-HYD-000142',
    mandateType: 'Gestion_Locative',
    status: 'Active',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    propertyAddress: 'Résidence Les Pins, Djenane El Malik, Hydra',
    propertyType: 'Apartment',
    listingType: 'Rental',
    ownerFullName: 'Kamel Boumaza',
    ownerPhone: '0550 11 22 33',
    ownerNationalId: '109823487129837401',
    ownerIdIssueDate: '2020-04-12',
    ownerIdIssueDaira: 'Hydra',
    askingPriceDzd: 180000,
    minimumAcceptablePriceDzd: 160000,
    commissionCalculationMode: 'FlatPercent',
    commissionRatePercent: 7.0, // 7% annual rental management
    commissionEstimatedHtDzd: 151200,
    commissionEstimatedTtcDzd: 179928,
    commissionPayer: 'Seller',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    renewalCount: 1,
    isExclusive: true,
    notes: 'Mandat de gestion locative exclusif avec encaissement mensuel et arrêté trimestriel.',
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'mnd_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    negotiatorName: 'Karim Zerrouki',
    mandateNumber: 'MND-2026-BEZ-000143',
    mandateType: 'Location_Commercial',
    status: 'Active',
    propertyId: 'prop_02',
    propertyTitle: 'Bureaux Open-Space Tour Affaires Bab Ezzouar',
    propertyAddress: 'Tour Affaires B, Quartier d\'Affaires, Bab Ezzouar',
    propertyType: 'Office',
    listingType: 'Rental',
    ownerFullName: 'Foncière Maghreb SPA',
    ownerPhone: '023 92 00 11',
    ownerNationalId: '0019160098234710',
    askingPriceDzd: 450000,
    minimumAcceptablePriceDzd: 420000,
    commissionCalculationMode: 'DecreeTranches',
    commissionEstimatedHtDzd: 450000, // 1 month rent per Decree 09-18
    commissionEstimatedTtcDzd: 535500,
    commissionPayer: 'Split50_50',
    startDate: '2026-02-01',
    endDate: '2026-07-31',
    renewalCount: 0,
    isExclusive: false,
    notes: 'Mandat de location commerciale simple. Bail de 3 ans renouvelable souhaité.',
    createdAt: '2026-01-25T11:00:00Z',
    updatedAt: '2026-01-25T11:00:00Z',
  },
  {
    id: 'mnd_03',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    negotiatorName: 'Yacine Mansouri',
    mandateNumber: 'MND-2026-BIA-000144',
    mandateType: 'Vente_Exclusif',
    status: 'Expiring',
    propertyId: 'prop_03',
    propertyTitle: 'Villa Coloniale R+1 avec Piscine Chemin Mackley El Biar',
    propertyAddress: 'Chemin Mackley, El Biar',
    propertyType: 'Villa',
    listingType: 'Sale',
    ownerFullName: 'Dr. Rachid Benyoucef',
    ownerPhone: '0661 22 33 44',
    ownerNationalId: '107293847192837492',
    ownerIdIssueDate: '2019-06-20',
    ownerIdIssueDaira: 'Bouzareah',
    askingPriceDzd: 85000000,
    minimumAcceptablePriceDzd: 80000000,
    commissionCalculationMode: 'DecreeTranches',
    commissionEstimatedHtDzd: 910000, // 30k + 80k + 800k (1% over 5M)
    commissionEstimatedTtcDzd: 1082900,
    commissionPayer: 'Split50_50',
    startDate: '2026-01-15',
    endDate: '2026-04-15', // Expiring soon!
    renewalCount: 0,
    isExclusive: true,
    notes: 'Mandat exclusif vente. Propriétaire exige discrétion et pré-qualification financière des acquéreurs.',
    createdAt: '2026-01-14T14:30:00Z',
    updatedAt: '2026-01-14T14:30:00Z',
  },
  {
    id: 'mnd_04',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    negotiatorName: 'Yacine Mansouri',
    mandateNumber: 'MND-2026-ALG-000145',
    mandateType: 'Location_Commercial',
    status: 'Active',
    propertyId: 'prop_04',
    propertyTitle: 'Local Commercial Boulevard Didouche Mourad',
    propertyAddress: '144 Boulevard Didouche Mourad',
    propertyType: 'Commercial',
    listingType: 'Rental',
    ownerFullName: 'Mourad Hadj-Sadok',
    ownerPhone: '0770 55 66 77',
    ownerNationalId: '108192837492019283',
    askingPriceDzd: 220000,
    minimumAcceptablePriceDzd: 200000,
    commissionCalculationMode: 'DecreeTranches',
    commissionEstimatedHtDzd: 220000,
    commissionEstimatedTtcDzd: 261800,
    commissionPayer: 'Buyer',
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    renewalCount: 0,
    isExclusive: false,
    notes: 'Droit au bail ou location pure. Emplacement numéro un sur Didouche Mourad.',
    createdAt: '2026-02-28T09:00:00Z',
    updatedAt: '2026-02-28T09:00:00Z',
  },
  {
    id: 'mnd_05',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    negotiatorName: 'Karim Zerrouki',
    mandateNumber: 'MND-2026-KOU-000146',
    mandateType: 'Vente_Simple',
    status: 'Active',
    propertyId: 'prop_05',
    propertyTitle: 'Appartement F3 Vue Mer Kouba Croix-de-Bois',
    propertyAddress: 'Cité Oasis, Rue des Frères Bachir, Kouba',
    propertyType: 'Apartment',
    listingType: 'Sale',
    ownerFullName: 'Héritiers Si Ahmed',
    ownerPhone: '0555 44 33 22',
    ownerNationalId: '109283746192837482',
    askingPriceDzd: 19500000,
    minimumAcceptablePriceDzd: 18500000,
    commissionCalculationMode: 'FlatPercent',
    commissionRatePercent: 1.0,
    commissionEstimatedHtDzd: 195000,
    commissionEstimatedTtcDzd: 232050,
    commissionPayer: 'Buyer',
    startDate: '2026-03-10',
    endDate: '2026-09-10',
    renewalCount: 0,
    isExclusive: false,
    notes: 'Mandat de vente simple avec procuration notariée pour le frère aîné.',
    createdAt: '2026-03-09T16:00:00Z',
    updatedAt: '2026-03-09T16:00:00Z',
  },
  {
    id: 'mnd_06',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_03',
    negotiatorName: 'Amina Benali (Directrice)',
    mandateNumber: 'MND-2026-CHE-000147',
    mandateType: 'Vente_Exclusif',
    status: 'Active',
    propertyId: 'prop_06',
    propertyTitle: 'Terrain Urbain Constructible R+4 Chéraga Bouchaoui',
    propertyAddress: 'Route Nationale 11, Bouchaoui, Chéraga',
    propertyType: 'Land',
    listingType: 'Sale',
    ownerFullName: 'Sarl Foncière Sahel',
    ownerPhone: '021 37 11 00',
    ownerNationalId: '0018160019283746',
    askingPriceDzd: 67200000,
    minimumAcceptablePriceDzd: 65000000,
    commissionCalculationMode: 'DecreeTranches',
    commissionEstimatedHtDzd: 732000, // 30k + 80k + 622k
    commissionEstimatedTtcDzd: 871080,
    commissionPayer: 'Split50_50',
    startDate: '2026-03-15',
    endDate: '2026-09-15',
    renewalCount: 0,
    isExclusive: true,
    notes: 'Terrain avec certificat d\'urbanisme R+4. Idéal pour promotion immobilière ou siège d\'entreprise.',
    createdAt: '2026-03-14T11:20:00Z',
    updatedAt: '2026-03-14T11:20:00Z',
  },
];

export const INITIAL_LEASES: RealEstateLease[] = [
  {
    id: 'lease_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    leaseNumber: 'BAIL-2026-0041',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    tenantName: 'Anis Belhadj (Cadre Dirigeant Sonatrach)',
    tenantPhone: '0555 99 88 77',
    tenantNationalId: '109182938475619283',
    ownerName: 'Kamel Boumaza',
    ownerPhone: '0550 11 22 33',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRentDzd: 180000,
    securityDepositDzd: 360000,
    agencyFeeDzd: 180000,
    agencyManagementRatePercent: 7.0,
    paymentCycle: 'Monthly',
    paymentFrequency: 'Monthly',
    lastPaymentDate: '2026-03-02',
    arrearsDzd: 0,
    status: 'Active',
    createdAt: '2025-12-28T09:00:00Z',
  },
  {
    id: 'lease_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    leaseNumber: 'BAIL-2025-0109',
    propertyId: 'prop_03',
    propertyTitle: 'Villa Coloniale R+1 avec Piscine El Biar',
    tenantName: 'Société Médicale & Laboratoire Phyto-Algérie',
    tenantPhone: '021 69 00 00',
    tenantNationalId: '0015160087192837',
    ownerName: 'Dr. Rachid Benyoucef',
    ownerPhone: '0661 22 33 44',
    startDate: '2025-09-01',
    endDate: '2026-08-31',
    monthlyRentDzd: 550000,
    securityDepositDzd: 1100000,
    agencyFeeDzd: 550000,
    agencyManagementRatePercent: 8.0,
    paymentCycle: 'Quarterly',
    paymentFrequency: 'Quarterly',
    lastPaymentDate: '2025-12-05',
    arrearsDzd: 550000, // 1 month overdue!
    status: 'Active',
    createdAt: '2025-08-25T14:00:00Z',
  },
];

export const INITIAL_QUITTANCES: RentalQuittanceRecord[] = [
  {
    id: 'qtc_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    quittanceNumber: 'QTC-2026-000101',
    leaseId: 'lease_01',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    tenantName: 'Anis Belhadj',
    ownerName: 'Kamel Boumaza',
    periodMonth: 1,
    periodYear: 2026,
    rentAmountDzd: 180000,
    chargesDzd: 10000,
    paymentMethod: 'Cash',
    timbreFiscalDzd: 1900, // 1% of (180k + 10k) rounded up
    totalCollectedDzd: 191900,
    agencyCommissionFeeDzd: 12600, // 7%
    agencyCommissionTvaDzd: 2394, // 19%
    netDisbursedToOwnerDzd: 174006,
    isDisbursedToOwner: true,
    disbursementDate: '2026-01-08',
    paymentDate: '2026-01-02',
    cashierStaffName: 'Yasmine Cherif',
    notes: 'Paiement effectué en espèces à la caisse de l\'agence. Timbre fiscal légal apposé.',
    createdAt: '2026-01-02T10:15:00Z',
  },
  {
    id: 'qtc_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    quittanceNumber: 'QTC-2026-000184',
    leaseId: 'lease_01',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    tenantName: 'Anis Belhadj',
    ownerName: 'Kamel Boumaza',
    periodMonth: 2,
    periodYear: 2026,
    rentAmountDzd: 180000,
    chargesDzd: 10000,
    paymentMethod: 'BaridiMob',
    timbreFiscalDzd: 0, // Exempt via postal electronic transfer!
    totalCollectedDzd: 190000,
    agencyCommissionFeeDzd: 12600,
    agencyCommissionTvaDzd: 2394,
    netDisbursedToOwnerDzd: 174006,
    isDisbursedToOwner: true,
    disbursementDate: '2026-02-09',
    paymentDate: '2026-02-03',
    cashierStaffName: 'Yasmine Cherif',
    notes: 'Reçu via virement BaridiMob RIP 00799999002138491023.',
    createdAt: '2026-02-03T11:30:00Z',
  },
  {
    id: 'qtc_03',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    quittanceNumber: 'QTC-2026-000291',
    leaseId: 'lease_01',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    tenantName: 'Anis Belhadj',
    ownerName: 'Kamel Boumaza',
    periodMonth: 3,
    periodYear: 2026,
    rentAmountDzd: 180000,
    chargesDzd: 10000,
    paymentMethod: 'Cash',
    timbreFiscalDzd: 1900,
    totalCollectedDzd: 191900,
    agencyCommissionFeeDzd: 12600,
    agencyCommissionTvaDzd: 2394,
    netDisbursedToOwnerDzd: 174006,
    isDisbursedToOwner: false, // In escrow pending monthly disbursement
    paymentDate: '2026-03-02',
    cashierStaffName: 'Yasmine Cherif',
    notes: 'Règlement du loyer de Mars 2026. Quittance délivrée.',
    createdAt: '2026-03-02T16:00:00Z',
  },
];

export const INITIAL_VISITS: BonDeVisiteRecord[] = [
  {
    id: 'vis_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    negotiatorName: 'Karim Zerrouki',
    propertyId: 'prop_03',
    propertyTitle: 'Villa Coloniale R+1 avec Piscine Chemin Mackley El Biar',
    propertyAddress: 'Chemin Mackley, El Biar',
    clientFullName: 'Sofiane Medjahed',
    clientPhone: '0550 49 11 22',
    clientNationalId: '109823487192837461',
    visitTimestamp: '2026-03-18T10:30:00Z',
    gpsLatitude: 36.7628,
    gpsLongitude: 3.0319,
    gpsAccuracyMeters: 8,
    signatureSvgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMTAgODAgQyA0MCAxMCwgNjUgMTAgOTAgODAiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+',
    signedOffline: false,
    clientImpression: 'Interested',
    clientFeedbackNotes: 'Client très séduit par le jardin et l\'emplacement. Négociation de prix prévue à 80M DZD.',
    counterOfferDzd: 80000000,
    whatsappConfirmationSent: true,
    createdAt: '2026-03-18T10:32:00Z',
  },
  {
    id: 'vis_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    negotiatorName: 'Yacine Mansouri',
    propertyId: 'prop_04',
    propertyTitle: 'Local Commercial Boulevard Didouche Mourad',
    propertyAddress: '144 Boulevard Didouche Mourad',
    clientFullName: 'Reda Meziane (Gérant Retail Chic)',
    clientPhone: '0771 88 44 22',
    clientNationalId: '108192837461928374',
    visitTimestamp: '2026-03-20T15:00:00Z',
    gpsLatitude: 36.7698,
    gpsLongitude: 3.0588,
    gpsAccuracyMeters: 12,
    signatureSvgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMTAgOTAgQyAyMCAyMCwgODAgMjAgOTAgODAiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+',
    signedOffline: false,
    clientImpression: 'NeedsNegotiation',
    clientFeedbackNotes: 'Demande une franchise de 2 mois de loyer pour les travaux d\'aménagement de la vitrine.',
    counterOfferDzd: 200000,
    whatsappConfirmationSent: true,
    createdAt: '2026-03-20T15:05:00Z',
  },
];

export const INITIAL_INSPECTIONS: RealEstateInspection[] = [
  {
    id: 'insp_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    leaseId: 'lease_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra Djenane El Malik',
    tenantName: 'Anis Belhadj',
    inspectionType: 'Entry',
    type: 'Entry',
    inspectionDate: '2026-01-01',
    inspectorName: 'Karim Zerrouki (Atrium Immobilier)',
    generalCondition: 'Excellent',
    meterReadings: { electricKwh: 14200, gasM3: 450, waterM3: 88 },
    meterElectricityKwh: 14200,
    meterGasM3: 450,
    meterWaterM3: 88,
    keysCount: 4,
    keysDeliveredCount: 4,
    notes: 'Remise des clés complète (2 clés d\'entrée, 1 télécommande garage, 1 clé boîte aux lettres). Appartement repeint à neuf.',
    isSigned: true,
    createdAt: '2026-01-01T12:00:00Z',
  },
];

export const INITIAL_BUYERS: BuyerDemandProfile[] = [
  {
    id: 'buy_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    clientFullName: 'Dr. Tarek Belkacem',
    clientPhone: '0660 33 44 55',
    clientEmail: 'tarek.belkacem@gmail.com',
    targetWilaya: 'Alger',
    targetCommune: 'Hydra',
    propertyType: 'Apartment',
    maxBudgetDzd: 30000000,
    minRooms: 4,
    minSurfaceM2: 130,
    financingType: 'Cash',
    searchUrgency: 'Immediate',
    activeStatus: 'Active',
    notes: 'Recherche F4 standing avec parking sous-sol à Hydra ou El Biar.',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'buy_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_02',
    clientFullName: 'Nadia Bensaid (Investisseur)',
    clientPhone: '0551 77 88 99',
    targetWilaya: 'Alger',
    targetCommune: 'El Biar',
    propertyType: 'Villa',
    maxBudgetDzd: 90000000,
    minRooms: 6,
    minSurfaceM2: 350,
    financingType: 'Cash',
    searchUrgency: 'Within3Months',
    activeStatus: 'Active',
    notes: 'Recherche villa coloniale avec jardin pour résidence principale.',
    createdAt: '2026-03-05T14:00:00Z',
  },
  {
    id: 'buy_03',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_03',
    clientFullName: 'Groupe Agro-Distribution SARL',
    clientPhone: '023 45 67 89',
    targetWilaya: 'Alger',
    targetCommune: 'Bab Ezzouar',
    propertyType: 'Office',
    maxBudgetDzd: 500000,
    minSurfaceM2: 250,
    financingType: 'Cash',
    searchUrgency: 'Immediate',
    activeStatus: 'Active',
    notes: 'Recherche bureaux open-space pour siège régional avec places de stationnement.',
    createdAt: '2026-03-12T11:00:00Z',
  },
];

export const useRealEstateData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_realestate_main';
  const activeBusinessId = currentBusinessId || 'biz_realestate';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_realestate_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_realestate',
      accountId:
        (item as { accountId?: string }).accountId ||
        currentAccountId ||
        (isDemoModeEnabled() ? 'acc_01' : ''),
    }) as T;

  const [properties, setProperties] = useState<RealEstateProperty[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_props_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mandates, setMandates] = useState<RealEstateMandate[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_mandates_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [leases, setLeases] = useState<RealEstateLease[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_leases_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [quittances, setQuittances] = useState<RentalQuittanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_quittances_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [visits, setVisits] = useState<BonDeVisiteRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_visits_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inspections, setInspections] = useState<RealEstateInspection[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_inspections_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [buyers, setBuyers] = useState<BuyerDemandProfile[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_buyers_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useIdlePersist('atrium_realestate_props_v2', properties);
  useIdlePersist('atrium_realestate_mandates_v2', mandates);
  useIdlePersist('atrium_realestate_leases_v2', leases);
  useIdlePersist('atrium_realestate_quittances_v2', quittances);
  useIdlePersist('atrium_realestate_visits_v2', visits);
  useIdlePersist('atrium_realestate_inspections_v2', inspections);
  useIdlePersist('atrium_realestate_buyers_v2', buyers);

  // Hydrate real estate vertical state from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`realestate:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteProps,
        remoteMandates,
        remoteLeases,
        remoteQuittances,
        remoteVisits,
        remoteInspections,
        remoteBuyers,
      ] = await runWithConcurrency(
        [
          () => realEstateService.fetchProperties(activeBranchId),
          () => realEstateService.fetchMandates(activeBranchId),
          () => realEstateService.fetchLeases(activeBranchId),
          () => realEstateService.fetchQuittances(activeBranchId),
          () => realEstateService.fetchBonsDeVisite(activeBranchId),
          () => realEstateService.fetchInspections(activeBranchId),
          () => realEstateService.fetchBuyerDemands(activeBranchId),
        ],
        4
      );

      if (cancelled) return;
      if (Array.isArray(remoteProps) && remoteProps.length > 0) {
        setProperties((prev) => mergeReById(prev, remoteProps as RealEstateProperty[]));
      }
      if (Array.isArray(remoteMandates) && remoteMandates.length > 0) {
        setMandates((prev) => mergeReById(prev, remoteMandates as RealEstateMandate[]));
      }
      if (Array.isArray(remoteLeases) && remoteLeases.length > 0) {
        setLeases((prev) => mergeReById(prev, remoteLeases as RealEstateLease[]));
      }
      if (Array.isArray(remoteQuittances) && remoteQuittances.length > 0) {
        setQuittances((prev) => mergeReById(prev, remoteQuittances as RentalQuittanceRecord[]));
      }
      if (Array.isArray(remoteVisits) && remoteVisits.length > 0) {
        setVisits((prev) => mergeReById(prev, remoteVisits as BonDeVisiteRecord[]));
      }
      if (Array.isArray(remoteInspections) && remoteInspections.length > 0) {
        setInspections((prev) => mergeReById(prev, remoteInspections as RealEstateInspection[]));
      }
      if (Array.isArray(remoteBuyers) && remoteBuyers.length > 0) {
        setBuyers((prev) => mergeReById(prev, remoteBuyers as BuyerDemandProfile[]));
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
      're_properties',
      're_mandates',
      're_leases',
      're_rent_schedules',
      're_visits',
      're_inspections',
      're_leads',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('re_properties', setProperties);
      prune('re_mandates', setMandates);
      prune('re_leases', setLeases);
      prune('re_rent_schedules', setQuittances);
      prune('re_visits', setVisits);
      prune('re_inspections', setInspections);
      prune('re_leads', setBuyers);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('re_properties')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchProperties(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setProperties((prev) => mergeReById(prev, rows as RealEstateProperty[]));
          }
        });
      }
      if (changedSet.has('re_mandates')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchMandates(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMandates((prev) => mergeReById(prev, rows as RealEstateMandate[]));
          }
        });
      }
      if (changedSet.has('re_leases')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchLeases(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setLeases((prev) => mergeReById(prev, rows as RealEstateLease[]));
          }
        });
      }
      if (changedSet.has('re_rent_schedules')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchQuittances(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setQuittances((prev) => mergeReById(prev, rows as RentalQuittanceRecord[]));
          }
        });
      }
      if (changedSet.has('re_visits')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchBonsDeVisite(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVisits((prev) => mergeReById(prev, rows as BonDeVisiteRecord[]));
          }
        });
      }
      if (changedSet.has('re_inspections')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchInspections(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setInspections((prev) => mergeReById(prev, rows as RealEstateInspection[]));
          }
        });
      }
      if (changedSet.has('re_leads')) {
        tasks.push(async () => {
          const rows = await realEstateService.fetchBuyerDemands(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBuyers((prev) => mergeReById(prev, rows as BuyerDemandProfile[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `realestate:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
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
      if (evt.table === 're_properties') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchProperties(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setProperties((prev) => mergeReById(prev, rows as RealEstateProperty[]));
          }
        });
      } else if (evt.table === 're_mandates') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchMandates(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMandates((prev) => mergeReById(prev, rows as RealEstateMandate[]));
          }
        });
      } else if (evt.table === 're_leases') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchLeases(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setLeases((prev) => mergeReById(prev, rows as RealEstateLease[]));
          }
        });
      } else if (evt.table === 're_rent_schedules') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchQuittances(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setQuittances((prev) => mergeReById(prev, rows as RentalQuittanceRecord[]));
          }
        });
      } else if (evt.table === 're_visits') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchBonsDeVisite(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVisits((prev) => mergeReById(prev, rows as BonDeVisiteRecord[]));
          }
        });
      } else if (evt.table === 're_inspections') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchInspections(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setInspections((prev) => mergeReById(prev, rows as RealEstateInspection[]));
          }
        });
      } else if (evt.table === 're_leads') {
        tasks.push(async () => {
          const rows = await realEstateService.fetchBuyerDemands(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBuyers((prev) => mergeReById(prev, rows as BuyerDemandProfile[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `realestate:res:${activeBranchId}:${evt.table}`,
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
    properties,
    mandates,
    leases,
    quittances,
    visits,
    inspections,
    buyers,
  });
  latestRef.current = {
    properties,
    mandates,
    leases,
    quittances,
    visits,
    inspections,
    buyers,
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

  // Operations
  const addProperty = (prop: RealEstateProperty) => {
    const scoped = withBranch(prop);
    const snap = cloneSnapshot(scoped);
    setProperties((prev) => [scoped, ...prev]);
    void realEstateService.upsertProperty(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.title,
      summary: pickLocalizedText(language, {
        fr: `Bien "${scoped.title}" ajouté`,
        en: `Property "${scoped.title}" added`,
        ar: `تمت إضافة العقار "${scoped.title}"`,
      }),
      undo: () => {
        setProperties((prev) => prev.filter((p) => p.id !== snap.id));
        void realEstateService.deleteProperty(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setProperties((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_properties', re.id, currentStaffId)
          .then(() => realEstateService.upsertProperty(re))
          .catch(() => {});
      },
    });
  };

  const updateProperty = (prop: RealEstateProperty) => {
    const scoped = withBranch(prop);
    const existing = latestRef.current.properties.find((p) => p.id === prop.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setProperties((prev) => prev.map((p) => (p.id === prop.id ? scoped : p)));
    void realEstateService.upsertProperty(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.title,
        summary: pickLocalizedText(language, {
          fr: `Bien "${nextSnap.title}" modifié`,
          en: `Property "${nextSnap.title}" updated`,
          ar: `تم تعديل العقار "${nextSnap.title}"`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setProperties((prev) => prev.map((p) => (p.id === prevCopy.id ? prevCopy : p)));
          void realEstateService.upsertProperty(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setProperties((prev) => prev.map((p) => (p.id === nextCopy.id ? nextCopy : p)));
          void realEstateService.upsertProperty(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteProperty = (id: string) => {
    const idx = latestRef.current.properties.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.properties[idx]) : null;
    setProperties((prev) => prev.filter((p) => p.id !== id));
    void realEstateService.deleteProperty(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.title,
        summary: pickLocalizedText(language, {
          fr: `Bien "${existing.title}" supprimé`,
          en: `Property "${existing.title}" deleted`,
          ar: `تم حذف العقار "${existing.title}"`,
        }),
        undo: () => {
          restoreAt(setProperties, existing, idx);
          void syncCoordinator
            .restoreRow('re_properties', existing.id, currentStaffId)
            .then(() => realEstateService.upsertProperty(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setProperties((prev) => prev.filter((p) => p.id !== existing.id));
          void realEstateService.deleteProperty(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addMandate = (mandate: RealEstateMandate) => {
    const scoped = withBranch(mandate);
    const snap = cloneSnapshot(scoped);
    setMandates((prev) => [scoped, ...prev]);
    void realEstateService.upsertMandate(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.mandateNumber,
      summary: pickLocalizedText(language, {
        fr: `Mandat ${scoped.mandateNumber} créé`,
        en: `Mandate ${scoped.mandateNumber} created`,
        ar: `تم إنشاء التفويض ${scoped.mandateNumber}`,
      }),
      undo: () => {
        setMandates((prev) => prev.filter((m) => m.id !== snap.id));
        void realEstateService.deleteMandate(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setMandates((prev) => (prev.some((m) => m.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_mandates', re.id, currentStaffId)
          .then(() => realEstateService.upsertMandate(re))
          .catch(() => {});
      },
    });
  };

  const updateMandate = (mandate: RealEstateMandate) => {
    const scoped = withBranch(mandate);
    const existing = latestRef.current.mandates.find((m) => m.id === mandate.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setMandates((prev) => prev.map((m) => (m.id === mandate.id ? scoped : m)));
    void realEstateService.upsertMandate(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.mandateNumber,
        summary: pickLocalizedText(language, {
          fr: `Mandat ${nextSnap.mandateNumber} modifié`,
          en: `Mandate ${nextSnap.mandateNumber} updated`,
          ar: `تم تعديل التفويض ${nextSnap.mandateNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setMandates((prev) => prev.map((m) => (m.id === prevCopy.id ? prevCopy : m)));
          void realEstateService.upsertMandate(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setMandates((prev) => prev.map((m) => (m.id === nextCopy.id ? nextCopy : m)));
          void realEstateService.upsertMandate(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteMandate = (id: string) => {
    const idx = latestRef.current.mandates.findIndex((m) => m.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.mandates[idx]) : null;
    setMandates((prev) => prev.filter((m) => m.id !== id));
    void realEstateService.deleteMandate(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.mandateNumber,
        summary: pickLocalizedText(language, {
          fr: `Mandat ${existing.mandateNumber} supprimé`,
          en: `Mandate ${existing.mandateNumber} deleted`,
          ar: `تم حذف التفويض ${existing.mandateNumber}`,
        }),
        undo: () => {
          restoreAt(setMandates, existing, idx);
          void syncCoordinator
            .restoreRow('re_mandates', existing.id, currentStaffId)
            .then(() => realEstateService.upsertMandate(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setMandates((prev) => prev.filter((m) => m.id !== existing.id));
          void realEstateService.deleteMandate(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addLease = (lease: RealEstateLease) => {
    const scoped = withBranch(lease);
    const snap = cloneSnapshot(scoped);
    setLeases((prev) => [scoped, ...prev]);
    void realEstateService.upsertLease(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.leaseNumber,
      summary: pickLocalizedText(language, {
        fr: `Bail ${scoped.leaseNumber} créé`,
        en: `Lease ${scoped.leaseNumber} created`,
        ar: `تم إنشاء عقد الإيجار ${scoped.leaseNumber}`,
      }),
      undo: () => {
        setLeases((prev) => prev.filter((l) => l.id !== snap.id));
        void realEstateService.deleteLease(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setLeases((prev) => (prev.some((l) => l.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_leases', re.id, currentStaffId)
          .then(() => realEstateService.upsertLease(re))
          .catch(() => {});
      },
    });
  };

  const updateLease = (lease: RealEstateLease) => {
    const scoped = withBranch(lease);
    const existing = latestRef.current.leases.find((l) => l.id === lease.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setLeases((prev) => prev.map((l) => (l.id === lease.id ? scoped : l)));
    void realEstateService.upsertLease(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.leaseNumber,
        summary: pickLocalizedText(language, {
          fr: `Bail ${nextSnap.leaseNumber} modifié`,
          en: `Lease ${nextSnap.leaseNumber} updated`,
          ar: `تم تعديل عقد الإيجار ${nextSnap.leaseNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setLeases((prev) => prev.map((l) => (l.id === prevCopy.id ? prevCopy : l)));
          void realEstateService.upsertLease(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setLeases((prev) => prev.map((l) => (l.id === nextCopy.id ? nextCopy : l)));
          void realEstateService.upsertLease(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteLease = (id: string) => {
    const idx = latestRef.current.leases.findIndex((l) => l.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.leases[idx]) : null;
    setLeases((prev) => prev.filter((l) => l.id !== id));
    void realEstateService.deleteLease(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'real_estate',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.leaseNumber,
        summary: pickLocalizedText(language, {
          fr: `Bail ${existing.leaseNumber} supprimé`,
          en: `Lease ${existing.leaseNumber} deleted`,
          ar: `تم حذف عقد الإيجار ${existing.leaseNumber}`,
        }),
        undo: () => {
          restoreAt(setLeases, existing, idx);
          void syncCoordinator
            .restoreRow('re_leases', existing.id, currentStaffId)
            .then(() => realEstateService.upsertLease(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setLeases((prev) => prev.filter((l) => l.id !== existing.id));
          void realEstateService.deleteLease(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addQuittance = (quittance: RentalQuittanceRecord) => {
    const scoped = withBranch(quittance);
    const snap = cloneSnapshot(scoped);
    setQuittances((prev) => [scoped, ...prev]);
    void realEstateService.upsertQuittance(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.quittanceNumber,
      summary: pickLocalizedText(language, {
        fr: `Quittance ${scoped.quittanceNumber} émise`,
        en: `Rent receipt ${scoped.quittanceNumber} issued`,
        ar: `تم إصدار وصل الإيجار ${scoped.quittanceNumber}`,
      }),
      undo: () => {
        setQuittances((prev) => prev.filter((q) => q.id !== snap.id));
        void realEstateService.deleteQuittance(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setQuittances((prev) => (prev.some((q) => q.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_rent_schedules', re.id, currentStaffId)
          .then(() => realEstateService.upsertQuittance(re))
          .catch(() => {});
      },
    });
  };

  const addVisit = (visit: BonDeVisiteRecord) => {
    const scoped = withBranch(visit);
    const snap = cloneSnapshot(scoped);
    setVisits((prev) => [scoped, ...prev]);
    void realEstateService.upsertBonDeVisite(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.clientFullName,
      summary: pickLocalizedText(language, {
        fr: `Bon de visite ${scoped.clientFullName} enregistré`,
        en: `Visit slip ${scoped.clientFullName} recorded`,
        ar: `تم تسجيل وصل الزيارة ${scoped.clientFullName}`,
      }),
      undo: () => {
        setVisits((prev) => prev.filter((v) => v.id !== snap.id));
        void realEstateService.deleteBonDeVisite(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setVisits((prev) => (prev.some((v) => v.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_visits', re.id, currentStaffId)
          .then(() => realEstateService.upsertBonDeVisite(re))
          .catch(() => {});
      },
    });
  };

  const addInspection = (insp: RealEstateInspection) => {
    const scoped = withBranch(insp);
    const snap = cloneSnapshot(scoped);
    setInspections((prev) => [scoped, ...prev]);
    void realEstateService.upsertInspection(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.propertyTitle,
      summary: pickLocalizedText(language, {
        fr: `État des lieux (${scoped.tenantName}) enregistré`,
        en: `Inspection (${scoped.tenantName}) recorded`,
        ar: `تم تسجيل معاينة العقار (${scoped.tenantName})`,
      }),
      undo: () => {
        setInspections((prev) => prev.filter((i) => i.id !== snap.id));
        void realEstateService.deleteInspection(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setInspections((prev) => (prev.some((i) => i.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_inspections', re.id, currentStaffId)
          .then(() => realEstateService.upsertInspection(re))
          .catch(() => {});
      },
    });
  };

  const validateInspection = (inspectionId: string) => {
    const existing = latestRef.current.inspections.find((i) => i.id === inspectionId);
    if (!existing || existing.isLocked) return;
    const prevSnap = cloneSnapshot(existing);
    const updated: RealEstateInspection = withBranch({
      ...existing,
      isSigned: true,
      isLocked: true,
      validatedAt: new Date().toISOString(),
      validatedBy: currentStaffId || existing.staffId,
    });
    const nextSnap = cloneSnapshot(updated);
    setInspections((prev) => prev.map((i) => (i.id === inspectionId ? updated : i)));
    void realEstateService.upsertInspection(updated).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'status',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: updated.propertyTitle,
      summary: pickLocalizedText(language, {
        fr: `PV ${updated.propertyTitle} validé et verrouillé`,
        en: `Inspection ${updated.propertyTitle} validated and locked`,
        ar: `تمت مصادقة وقفل معاينة ${updated.propertyTitle}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setInspections((prev) => prev.map((i) => (i.id === prevCopy.id ? prevCopy : i)));
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setInspections((prev) => prev.map((i) => (i.id === nextCopy.id ? nextCopy : i)));
        void realEstateService.upsertInspection(nextCopy).catch(() => {});
      },
    });
  };

  const addBuyer = (buyer: BuyerDemandProfile) => {
    const scoped = withBranch(buyer);
    const snap = cloneSnapshot(scoped);
    setBuyers((prev) => [scoped, ...prev]);
    void realEstateService.upsertBuyerDemand(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.clientFullName,
      summary: pickLocalizedText(language, {
        fr: `Acquéreur ${scoped.clientFullName} ajouté`,
        en: `Buyer demand ${scoped.clientFullName} added`,
        ar: `تمت إضافة طلب المشتري ${scoped.clientFullName}`,
      }),
      undo: () => {
        setBuyers((prev) => prev.filter((b) => b.id !== snap.id));
        void realEstateService.deleteBuyerDemand(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setBuyers((prev) => (prev.some((b) => b.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('re_leads', re.id, currentStaffId)
          .then(() => realEstateService.upsertBuyerDemand(re))
          .catch(() => {});
      },
    });
  };

  // Reset active branch to empty state
  const resetToDemoSeeds = () => {
    const snap = cloneSnapshot(latestRef.current);
    setProperties((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setMandates((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setLeases((prev) => prev.filter((l) => !belongsToActiveBranch(l)));
    setQuittances((prev) => prev.filter((q) => !belongsToActiveBranch(q)));
    setVisits((prev) => prev.filter((v) => !belongsToActiveBranch(v)));
    setInspections((prev) => prev.filter((i) => !belongsToActiveBranch(i)));
    setBuyers((prev) => prev.filter((b) => !belongsToActiveBranch(b)));

    registerUndoEntry({
      vertical: 'real_estate',
      operationType: 'bulk',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données immobilières réinitialisées',
        en: 'Real estate data reset',
        ar: 'تمت إعادة ضبط بيانات العقارات',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setProperties(s.properties);
        setMandates(s.mandates);
        setLeases(s.leases);
        setQuittances(s.quittances);
        setVisits(s.visits);
        setInspections(s.inspections);
        setBuyers(s.buyers);
      },
    });
  };

  const scopedProperties = useMemo(() => properties.filter(belongsToActiveBranch), [properties, belongsToActiveBranch]);
  const scopedMandates = useMemo(() => mandates.filter(belongsToActiveBranch), [mandates, belongsToActiveBranch]);
  const scopedLeases = useMemo(() => leases.filter(belongsToActiveBranch), [leases, belongsToActiveBranch]);
  const scopedQuittances = useMemo(() => quittances.filter(belongsToActiveBranch), [quittances, belongsToActiveBranch]);
  const scopedVisits = useMemo(() => visits.filter(belongsToActiveBranch), [visits, belongsToActiveBranch]);
  const scopedInspections = useMemo(() => inspections.filter(belongsToActiveBranch), [inspections, belongsToActiveBranch]);
  const scopedBuyers = useMemo(() => buyers.filter(belongsToActiveBranch), [buyers, belongsToActiveBranch]);

  return {
    properties: scopedProperties,
    mandates: scopedMandates,
    leases: scopedLeases,
    quittances: scopedQuittances,
    visits: scopedVisits,
    inspections: scopedInspections,
    buyers: scopedBuyers,
    addProperty,
    updateProperty,
    deleteProperty,
    addMandate,
    updateMandate,
    deleteMandate,
    addLease,
    updateLease,
    deleteLease,
    addQuittance,
    addVisit,
    addInspection,
    validateInspection,
    addBuyer,
    resetToDemoSeeds,
  };
};
