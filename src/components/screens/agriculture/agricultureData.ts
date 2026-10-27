import { useState, useEffect } from 'react';
import {
  AgriParcel,
  AgriLivestock,
  AgriTreatmentLog,
  AgriHarvestTicket,
} from '../../../types/index';

const INITIAL_PARCELS: AgriParcel[] = [
  {
    id: 'parc_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Verger Nord - Orangers Thomson & Navel',
    surfaceHectares: 14.5,
    irrigationType: 'Drip',
    soilType: 'Argilo-limoneux profond',
    currentCrop: 'Oranges Thomson & Clémentines',
    plantingDate: '2023-10-15',
    expectedHarvestDate: '2026-11-25',
    status: 'Growing',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Bloc Serres Multi-Chapelles Maraîchage',
    surfaceHectares: 3.5,
    irrigationType: 'Drip',
    soilType: 'Sableux amendé bio-fertilisé',
    currentCrop: 'Tomates Industrielles & Poivrons Doux',
    plantingDate: '2026-02-10',
    expectedHarvestDate: '2026-06-15',
    status: 'Harvesting',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_03',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Oliveraie Sud - Variété Chemlal & Sigoise',
    surfaceHectares: 22.0,
    irrigationType: 'Drip',
    soilType: 'Calcaire bien drainé',
    currentCrop: 'Olives à Huile (Chemlal)',
    plantingDate: '2022-03-20',
    expectedHarvestDate: '2026-11-10',
    status: 'Growing',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'parc_04',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    name: 'Plaine Céréalière - Blé Dur Simeto',
    surfaceHectares: 35.0,
    irrigationType: 'Pivot',
    soilType: 'Limono-argileux riche',
    currentCrop: 'Blé Dur (Semences Certifiées)',
    plantingDate: '2025-11-30',
    expectedHarvestDate: '2026-06-30',
    status: 'Growing',
    createdAt: '2026-01-10T08:00:00Z',
  },
];

const INITIAL_TREATMENTS: AgriTreatmentLog[] = [
  {
    id: 'treat_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_02',
    treatmentDate: '2026-05-02',
    commercialProductName: 'Cuprocol 50 WG (Bio)',
    activeIngredient: 'Oxychlorure de Cuivre 500g/kg',
    targetPestDisease: 'Mildiou de la Tomate & Bactériose',
    dosagePerHa: '2.5 kg/ha',
    darDays: 7,
    harvestAllowedDate: '2026-05-09',
    operatorName: 'Abdelkader (Chef Culture)',
    notes: 'Pulvérisation par atomiseur tracté le matin sans vent. DAR respecté.',
    createdAt: '2026-05-02T09:00:00Z',
  },
  {
    id: 'treat_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    parcelId: 'parc_01',
    treatmentDate: '2026-05-12',
    commercialProductName: 'Soufre Micronisé Soluble',
    activeIngredient: 'Soufre pur 80%',
    targetPestDisease: 'Oïdium et Acariens des agrumes',
    dosagePerHa: '5.0 kg/ha',
    darDays: 5,
    harvestAllowedDate: '2026-05-17',
    operatorName: 'Ali M.',
    notes: 'Traitement préventif suite à hausse de température.',
    createdAt: '2026-05-12T10:00:00Z',
  },
];

const INITIAL_HARVEST: AgriHarvestTicket[] = [
  {
    id: 'pes_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    ticketNumber: 'PES-2026-018',
    parcelId: 'parc_02',
    cropDesignation: 'Tomates Maraîchères Calibre 1',
    vehiclePlate: '00142-126-16',
    driverName: 'Hakim Benziane',
    grossWeightKg: 8450,
    tareWeightKg: 3200,
    netWeightKg: 5250,
    cratesCount: 260,
    unitPriceDzdPerKg: 75,
    totalGrossDzd: 393750,
    mandataireFeePercent: 6,
    netFarmPayoutDzd: 370125,
    destinationWholesaleMarket: 'Marché de Gros des Eucalyptus, Alger',
    date: '2026-05-15',
    createdAt: '2026-05-15T07:30:00Z',
  },
  {
    id: 'pes_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    ticketNumber: 'PES-2026-019',
    parcelId: 'parc_02',
    cropDesignation: 'Poivrons Doux Verts',
    vehiclePlate: '04890-124-09',
    driverName: 'Mustapha Larbi',
    grossWeightKg: 6100,
    tareWeightKg: 3150,
    netWeightKg: 2950,
    cratesCount: 195,
    unitPriceDzdPerKg: 110,
    totalGrossDzd: 324500,
    mandataireFeePercent: 6,
    netFarmPayoutDzd: 305030,
    destinationWholesaleMarket: 'Marché de Gros Bougara, Blida',
    date: '2026-05-17',
    createdAt: '2026-05-17T08:00:00Z',
  },
];

const INITIAL_LIVESTOCK: AgriLivestock[] = [
  {
    id: 'cow_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-0942',
    species: 'Bovine',
    breed: 'Holstein Frisonne Prime',
    gender: 'Female',
    birthDate: '2022-04-10',
    healthStatus: 'Healthy',
    dailyProductionLiters: 28.5,
    notes: 'Lactation 2ème cycle. Vaccination fièvre aphteuse à jour.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'cow_02',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-0945',
    species: 'Bovine',
    breed: 'Montbéliarde',
    gender: 'Female',
    birthDate: '2023-01-20',
    healthStatus: 'Healthy',
    dailyProductionLiters: 24.0,
    notes: 'Très bonne adaptabilité chaleur. Insémination artificielle validée.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'sheep_01',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    branchId: 'branch_agri_main',
    staffId: 'staff_01',
    earTagNumber: 'DZ-16-1801',
    species: 'Ovine',
    breed: 'Ouled Djellal',
    gender: 'Female',
    birthDate: '2024-03-12',
    healthStatus: 'Healthy',
    notes: 'Brebis reproductrice saine.',
    createdAt: '2026-01-15T08:00:00Z',
  },
];

export const useAgricultureData = () => {
  const [parcels, setParcels] = useState<AgriParcel[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_parcels');
      return saved ? JSON.parse(saved) : INITIAL_PARCELS;
    } catch {
      return INITIAL_PARCELS;
    }
  });

  const [treatmentLogs, setTreatmentLogs] = useState<AgriTreatmentLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_treatments');
      return saved ? JSON.parse(saved) : INITIAL_TREATMENTS;
    } catch {
      return INITIAL_TREATMENTS;
    }
  });

  const [harvestTickets, setHarvestTickets] = useState<AgriHarvestTicket[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_harvest');
      return saved ? JSON.parse(saved) : INITIAL_HARVEST;
    } catch {
      return INITIAL_HARVEST;
    }
  });

  const [livestock, setLivestock] = useState<AgriLivestock[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_agri_livestock');
      return saved ? JSON.parse(saved) : INITIAL_LIVESTOCK;
    } catch {
      return INITIAL_LIVESTOCK;
    }
  });

  const [selectedParcelId, setSelectedParcelId] = useState<string>('parc_02');

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_parcels', JSON.stringify(parcels));
    } catch {}
  }, [parcels]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_treatments', JSON.stringify(treatmentLogs));
    } catch {}
  }, [treatmentLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_harvest', JSON.stringify(harvestTickets));
    } catch {}
  }, [harvestTickets]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_agri_livestock', JSON.stringify(livestock));
    } catch {}
  }, [livestock]);

  const addParcel = (parcel: AgriParcel) => {
    setParcels((prev) => [parcel, ...prev]);
  };

  const updateParcel = (parcel: AgriParcel) => {
    setParcels((prev) => prev.map((p) => (p.id === parcel.id ? parcel : p)));
  };

  const deleteParcel = (id: string) => {
    setParcels((prev) => prev.filter((p) => p.id !== id));
  };

  const addTreatmentLog = (treatment: AgriTreatmentLog) => {
    setTreatmentLogs((prev) => [treatment, ...prev]);
  };

  const updateTreatmentLog = (treatment: AgriTreatmentLog) => {
    setTreatmentLogs((prev) => prev.map((t) => (t.id === treatment.id ? treatment : t)));
  };

  const deleteTreatmentLog = (id: string) => {
    setTreatmentLogs((prev) => prev.filter((t) => t.id !== id));
  };

  const addHarvestTicket = (ticket: AgriHarvestTicket) => {
    setHarvestTickets((prev) => [ticket, ...prev]);
  };

  const updateHarvestTicket = (ticket: AgriHarvestTicket) => {
    setHarvestTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
  };

  const deleteHarvestTicket = (id: string) => {
    setHarvestTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const addLivestock = (animal: AgriLivestock) => {
    setLivestock((prev) => [animal, ...prev]);
  };

  const updateLivestock = (animal: AgriLivestock) => {
    setLivestock((prev) => prev.map((a) => (a.id === animal.id ? animal : a)));
  };

  const deleteLivestock = (id: string) => {
    setLivestock((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    parcels,
    treatmentLogs,
    harvestTickets,
    livestock,
    selectedParcelId,
    setSelectedParcelId,
    addParcel,
    updateParcel,
    deleteParcel,
    addTreatmentLog,
    updateTreatmentLog,
    deleteTreatmentLog,
    addHarvestTicket,
    updateHarvestTicket,
    deleteHarvestTicket,
    addLivestock,
    updateLivestock,
    deleteLivestock,
  };
};
