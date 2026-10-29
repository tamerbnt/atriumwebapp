import { useState, useEffect } from 'react';
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
  const [properties, setProperties] = useState<RealEstateProperty[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_props_v2');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
    }
  });

  const [mandates, setMandates] = useState<RealEstateMandate[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_mandates_v2');
      return saved ? JSON.parse(saved) : INITIAL_MANDATES;
    } catch {
      return INITIAL_MANDATES;
    }
  });

  const [leases, setLeases] = useState<RealEstateLease[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_leases_v2');
      return saved ? JSON.parse(saved) : INITIAL_LEASES;
    } catch {
      return INITIAL_LEASES;
    }
  });

  const [quittances, setQuittances] = useState<RentalQuittanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_quittances_v2');
      return saved ? JSON.parse(saved) : INITIAL_QUITTANCES;
    } catch {
      return INITIAL_QUITTANCES;
    }
  });

  const [visits, setVisits] = useState<BonDeVisiteRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_visits_v2');
      return saved ? JSON.parse(saved) : INITIAL_VISITS;
    } catch {
      return INITIAL_VISITS;
    }
  });

  const [inspections, setInspections] = useState<RealEstateInspection[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_inspections_v2');
      return saved ? JSON.parse(saved) : INITIAL_INSPECTIONS;
    } catch {
      return INITIAL_INSPECTIONS;
    }
  });

  const [buyers, setBuyers] = useState<BuyerDemandProfile[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_buyers_v2');
      return saved ? JSON.parse(saved) : INITIAL_BUYERS;
    } catch {
      return INITIAL_BUYERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_props_v2', JSON.stringify(properties));
    } catch {}
  }, [properties]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_mandates_v2', JSON.stringify(mandates));
    } catch {}
  }, [mandates]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_leases_v2', JSON.stringify(leases));
    } catch {}
  }, [leases]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_quittances_v2', JSON.stringify(quittances));
    } catch {}
  }, [quittances]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_visits_v2', JSON.stringify(visits));
    } catch {}
  }, [visits]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_inspections_v2', JSON.stringify(inspections));
    } catch {}
  }, [inspections]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_buyers_v2', JSON.stringify(buyers));
    } catch {}
  }, [buyers]);

  // Operations
  const addProperty = (prop: RealEstateProperty) => {
    setProperties((prev) => [prop, ...prev]);
  };

  const updateProperty = (prop: RealEstateProperty) => {
    setProperties((prev) => prev.map((p) => (p.id === prop.id ? prop : p)));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const addMandate = (mandate: RealEstateMandate) => {
    setMandates((prev) => [mandate, ...prev]);
  };

  const updateMandate = (mandate: RealEstateMandate) => {
    setMandates((prev) => prev.map((m) => (m.id === mandate.id ? mandate : m)));
  };

  const deleteMandate = (id: string) => {
    setMandates((prev) => prev.filter((m) => m.id !== id));
  };

  const addLease = (lease: RealEstateLease) => {
    setLeases((prev) => [lease, ...prev]);
  };

  const updateLease = (lease: RealEstateLease) => {
    setLeases((prev) => prev.map((l) => (l.id === lease.id ? lease : l)));
  };

  const deleteLease = (id: string) => {
    setLeases((prev) => prev.filter((l) => l.id !== id));
  };

  const addQuittance = (quittance: RentalQuittanceRecord) => {
    setQuittances((prev) => [quittance, ...prev]);
  };

  const addVisit = (visit: BonDeVisiteRecord) => {
    setVisits((prev) => [visit, ...prev]);
  };

  const addInspection = (insp: RealEstateInspection) => {
    setInspections((prev) => [insp, ...prev]);
  };

  const addBuyer = (buyer: BuyerDemandProfile) => {
    setBuyers((prev) => [buyer, ...prev]);
  };

  // Reset to initial demo seeds
  const resetToDemoSeeds = () => {
    setProperties(INITIAL_PROPERTIES);
    setMandates(INITIAL_MANDATES);
    setLeases(INITIAL_LEASES);
    setQuittances(INITIAL_QUITTANCES);
    setVisits(INITIAL_VISITS);
    setInspections(INITIAL_INSPECTIONS);
    setBuyers(INITIAL_BUYERS);
  };

  return {
    properties,
    mandates,
    leases,
    quittances,
    visits,
    inspections,
    buyers,
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
    addBuyer,
    resetToDemoSeeds,
  };
};
