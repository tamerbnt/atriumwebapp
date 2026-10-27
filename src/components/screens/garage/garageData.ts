import { useState, useEffect } from 'react';

export interface RepairOrder {
  id: string;
  orderNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientName: string;
  clientPhone: string;
  intakeDate: string;
  diagnosticNotes: string;
  status: 'Diagnostic' | 'WaitingParts' | 'InRepair' | 'Testing' | 'ReadyForPickup' | 'Delivered';
  estimatedCostDzd: number;
  finalCostDzd: number;
  partsUsed: Array<{ partId: string; name: string; quantity: number; unitPriceDzd: number }>;
  technicianName: string;
}

export interface VehicleAsset {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
  ownerName: string;
  ownerPhone: string;
  mileageKm: number;
  lastServiceDate?: string;
}

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  category: 'Filtration' | 'Freinage' | 'Suspension' | 'Moteur' | 'Électrique' | 'Huiles & Fluides';
  stockQuantity: number;
  minThreshold: number;
  buyingPriceDzd: number;
  sellingPriceDzd: number;
  locationBin: string;
}

const INITIAL_ORDERS: RepairOrder[] = [
  {
    id: 'ro_01',
    orderNumber: 'OR-2026-0042',
    vehiclePlate: '16-118-2045',
    vehicleModel: 'Renault Clio 4 (1.5 dCi)',
    clientName: 'Sofiane Mansouri',
    clientPhone: '0550 44 22 11',
    intakeDate: '2026-05-10T08:30:00Z',
    diagnosticNotes: 'Bruit de claquement à l\'avant droit au freinage. Disques voilés suspectés.',
    status: 'InRepair',
    estimatedCostDzd: 18500,
    finalCostDzd: 19200,
    partsUsed: [
      { partId: 'p_01', name: 'Jeu de Plaquettes Avant', quantity: 1, unitPriceDzd: 4500 },
      { partId: 'p_02', name: 'Disques de Frein Ventilés (Paire)', quantity: 1, unitPriceDzd: 11000 },
    ],
    technicianName: 'Karim (Chef Atelier)',
  },
  {
    id: 'ro_02',
    orderNumber: 'OR-2026-0043',
    vehiclePlate: '09-122-8765',
    vehicleModel: 'Peugeot 208 (1.2 PureTech)',
    clientName: 'Nadia Boubekeur',
    clientPhone: '0661 78 90 12',
    intakeDate: '2026-05-11T09:00:00Z',
    diagnosticNotes: 'Voyant moteur allumé. Ratés d\'allumage cylindre 2.',
    status: 'Diagnostic',
    estimatedCostDzd: 12000,
    finalCostDzd: 0,
    partsUsed: [],
    technicianName: 'Amine (Électricien)',
  },
  {
    id: 'ro_03',
    orderNumber: 'OR-2026-0041',
    vehiclePlate: '31-115-4433',
    vehicleModel: 'Toyota Hilux 4x4 (2.4 D-4D)',
    clientName: 'SARL Atlas Travaux',
    clientPhone: '0770 12 34 56',
    intakeDate: '2026-05-09T14:00:00Z',
    diagnosticNotes: 'Vidange générale 80 000 km + Remplacement tous filtres.',
    status: 'ReadyForPickup',
    estimatedCostDzd: 28000,
    finalCostDzd: 28000,
    partsUsed: [
      { partId: 'p_03', name: 'Huile Synthèse 5W30 5L', quantity: 2, unitPriceDzd: 7500 },
      { partId: 'p_04', name: 'Filtre à Huile + Gazole', quantity: 1, unitPriceDzd: 5500 },
    ],
    technicianName: 'Farid (Mécanicien)',
  },
];

const INITIAL_VEHICLES: VehicleAsset[] = [
  {
    id: 'veh_01',
    plateNumber: '16-118-2045',
    brand: 'Renault',
    model: 'Clio 4',
    year: 2018,
    vin: 'VF15R240A59123456',
    ownerName: 'Sofiane Mansouri',
    ownerPhone: '0550 44 22 11',
    mileageKm: 142000,
  },
  {
    id: 'veh_02',
    plateNumber: '09-122-8765',
    brand: 'Peugeot',
    model: '208',
    year: 2020,
    vin: 'VF3CCZM6HMT098765',
    ownerName: 'Nadia Boubekeur',
    ownerPhone: '0661 78 90 12',
    mileageKm: 68500,
  },
  {
    id: 'veh_03',
    plateNumber: '31-115-4433',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2019,
    vin: 'MR0FR22G901554433',
    ownerName: 'SARL Atlas Travaux',
    ownerPhone: '0770 12 34 56',
    mileageKm: 185000,
  },
];

const INITIAL_PARTS: SparePart[] = [
  {
    id: 'p_01',
    sku: 'BRK-PLQ-01',
    name: 'Plaquettes de Frein Avant',
    category: 'Freinage',
    stockQuantity: 14,
    minThreshold: 5,
    buyingPriceDzd: 3200,
    sellingPriceDzd: 4500,
    locationBin: 'Rayon B-02',
  },
  {
    id: 'p_02',
    sku: 'BRK-DSC-02',
    name: 'Disques de Frein Ventilés (Paire)',
    category: 'Freinage',
    stockQuantity: 6,
    minThreshold: 4,
    buyingPriceDzd: 8000,
    sellingPriceDzd: 11000,
    locationBin: 'Rayon B-04',
  },
  {
    id: 'p_03',
    sku: 'OIL-5W30-05',
    name: 'Huile Synthèse 5W30 5L',
    category: 'Huiles & Fluides',
    stockQuantity: 28,
    minThreshold: 10,
    buyingPriceDzd: 5800,
    sellingPriceDzd: 7500,
    locationBin: 'Rack Lubrifiants',
  },
  {
    id: 'p_04',
    sku: 'FLT-KIT-09',
    name: 'Kit Filtres Révision Complète',
    category: 'Filtration',
    stockQuantity: 3,
    minThreshold: 5,
    buyingPriceDzd: 3800,
    sellingPriceDzd: 5500,
    locationBin: 'Rayon A-01',
  },
];

export const useGarageData = () => {
  const [orders, setOrders] = useState<RepairOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [vehicles, setVehicles] = useState<VehicleAsset[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_vehicles');
      return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  const [parts, setParts] = useState<SparePart[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_garage_parts');
      return saved ? JSON.parse(saved) : INITIAL_PARTS;
    } catch {
      return INITIAL_PARTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_vehicles', JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_garage_parts', JSON.stringify(parts));
    } catch {}
  }, [parts]);

  const addOrder = (order: RepairOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  const updateOrder = (order: RepairOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const addVehicle = (vehicle: VehicleAsset) => {
    setVehicles((prev) => [vehicle, ...prev]);
  };

  const updateVehicle = (vehicle: VehicleAsset) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? vehicle : v)));
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const addPart = (part: SparePart) => {
    setParts((prev) => [part, ...prev]);
  };

  const updatePart = (part: SparePart) => {
    setParts((prev) => prev.map((p) => (p.id === part.id ? part : p)));
  };

  const deletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateOrderStatus = (id: string, status: RepairOrder['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return {
    orders,
    vehicles,
    parts,
    addOrder,
    updateOrder,
    deleteOrder,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addPart,
    updatePart,
    deletePart,
    updateOrderStatus,
  };
};

