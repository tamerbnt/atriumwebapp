import { useState, useEffect } from 'react';
import { RealEstateProperty, RealEstateLease, RealEstateInspection } from '../../../types';

const INITIAL_PROPERTIES: RealEstateProperty[] = [
  {
    id: 'prop_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Appartement Haut Standing F4 Hydra',
    propertyType: 'Apartment',
    listingType: 'Rental',
    surfaceM2: 145,
    roomsCount: 4,
    address: 'Résidence Les Pins, Djenane El Malik, Hydra',
    cityWilaya: 'Hydra, Alger',
    priceDzd: 180000,
    ownerName: 'Kamel Boumaza',
    ownerPhone: '0550 11 22 33',
    status: 'Rented',
    amenities: ['Ascenseur', 'Garage souterrain', 'Chauffage central', 'Vue dégagée'],
    createdAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'prop_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Bureaux Open-Space Bab Ezzouar Cyberpark',
    propertyType: 'Office',
    listingType: 'Rental',
    surfaceM2: 280,
    roomsCount: 6,
    address: 'Tour Affaires B, Bab Ezzouar',
    cityWilaya: 'Bab Ezzouar, Alger',
    priceDzd: 450000,
    ownerName: 'Foncière Maghreb SPA',
    ownerPhone: '023 92 00 11',
    status: 'Available',
    amenities: ['Fibre optique', 'Climatisation VRV', 'Accès sécurisé badge', 'Parking 8 places'],
    createdAt: '2026-05-11T09:00:00Z',
  },
  {
    id: 'prop_03',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Villa Coloniale R+1 avec Piscine El Biar',
    propertyType: 'Villa',
    listingType: 'Rental',
    surfaceM2: 360,
    roomsCount: 7,
    address: 'Chemin Mackley, El Biar',
    cityWilaya: 'El Biar, Alger',
    priceDzd: 550000,
    ownerName: 'Dr. Rachid Benyoucef',
    ownerPhone: '0661 22 33 44',
    status: 'Rented',
    amenities: ['Piscine', 'Jardin arboré', 'Bâche à eau 10m³', 'Loge gardien'],
    createdAt: '2026-05-12T10:00:00Z',
  },
  {
    id: 'prop_04',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    title: 'Local Commercial Boulevard Didouche Mourad',
    propertyType: 'Commercial',
    listingType: 'Rental',
    surfaceM2: 95,
    roomsCount: 2,
    address: '144 Boulevard Didouche Mourad',
    cityWilaya: 'Alger Centre',
    priceDzd: 220000,
    ownerName: 'Mourad Hadj-Sadok',
    ownerPhone: '0770 55 66 77',
    status: 'Available',
    amenities: ['Façade vitrée 8m', 'Rideau électrique', 'Sanitaires', 'Compteur triphasé'],
    createdAt: '2026-05-13T11:00:00Z',
  },
];

const INITIAL_LEASES: RealEstateLease[] = [
  {
    id: 'lease_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    propertyId: 'prop_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra',
    tenantName: 'Anis Belhadj',
    tenantPhone: '0555 99 88 77',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monthlyRentDzd: 180000,
    securityDepositDzd: 360000,
    agencyCommissionDzd: 180000,
    status: 'Active',
    paymentFrequency: 'Annual',
  },
  {
    id: 'lease_02',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    propertyId: 'prop_03',
    propertyTitle: 'Villa Coloniale R+1 avec Piscine El Biar',
    tenantName: 'Ambassade ou Société Multinationale',
    tenantPhone: '021 69 00 00',
    startDate: '2025-09-01',
    endDate: '2026-08-31',
    monthlyRentDzd: 550000,
    securityDepositDzd: 1100000,
    agencyCommissionDzd: 550000,
    status: 'Active',
    paymentFrequency: 'Annual',
  },
];

const INITIAL_INSPECTIONS: RealEstateInspection[] = [
  {
    id: 'insp_01',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    branchId: 'branch_realestate_main',
    staffId: 'staff_01',
    leaseId: 'lease_01',
    propertyTitle: 'Appartement Haut Standing F4 Hydra',
    inspectionType: 'Entry',
    inspectionDate: '2026-01-01',
    inspectorName: 'Agence Atrium Immobilier',
    generalCondition: 'Excellent',
    meterReadings: { electricKwh: 14200, gasM3: 450, waterM3: 88 },
    keysDeliveredCount: 4,
    notes: 'Remise des clés complète. Appartement repeint à neuf.',
  },
];

export const useRealEstateData = () => {
  const [properties, setProperties] = useState<RealEstateProperty[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_props');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
    }
  });

  const [leases, setLeases] = useState<RealEstateLease[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_leases');
      return saved ? JSON.parse(saved) : INITIAL_LEASES;
    } catch {
      return INITIAL_LEASES;
    }
  });

  const [inspections, setInspections] = useState<RealEstateInspection[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_realestate_inspections');
      return saved ? JSON.parse(saved) : INITIAL_INSPECTIONS;
    } catch {
      return INITIAL_INSPECTIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_props', JSON.stringify(properties));
    } catch {}
  }, [properties]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_leases', JSON.stringify(leases));
    } catch {}
  }, [leases]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_realestate_inspections', JSON.stringify(inspections));
    } catch {}
  }, [inspections]);

  const addProperty = (prop: RealEstateProperty) => {
    setProperties((prev) => [prop, ...prev]);
  };

  const updateProperty = (prop: RealEstateProperty) => {
    setProperties((prev) => prev.map((p) => (p.id === prop.id ? prop : p)));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
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

  return {
    properties,
    leases,
    inspections,
    addProperty,
    updateProperty,
    deleteProperty,
    addLease,
    updateLease,
    deleteLease,
  };
};

