import { useState, useEffect } from 'react';
import { LogisticsShipment, LogisticsManifest } from '../../../types';

const INITIAL_SHIPMENTS: LogisticsShipment[] = [
  {
    id: 'ship_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88912',
    merchantName: 'Boutique E-commerce Électro SARL',
    recipientName: 'Abdelkader Meziani',
    recipientPhone: '0555 41 22 33',
    destinationWilaya: '16 - Alger (Kouba)',
    destinationAddress: 'Cité Oasis, Bâtiment 4, Kouba',
    codAmountDzd: 8500,
    shippingFeeDzd: 600,
    weightKg: 1.8,
    status: 'OutForDelivery',
    assignedDriverName: 'Farid (Van 04)',
    createdAt: '2026-05-25T08:00:00Z',
  },
  {
    id: 'ship_02',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    trackingCode: 'ATR-EXP-88913',
    merchantName: 'Cosmétique Bio Alger',
    recipientName: 'Amina Saidi',
    recipientPhone: '0661 99 88 11',
    destinationWilaya: '31 - Oran (Bir El Djir)',
    destinationAddress: 'Résidence El Bahia, Oran',
    codAmountDzd: 14200,
    shippingFeeDzd: 900,
    weightKg: 0.9,
    status: 'Delivered',
    assignedDriverName: 'Hamid (Oran Sud)',
    createdAt: '2026-05-24T09:00:00Z',
  },
];

const INITIAL_MANIFESTS: LogisticsManifest[] = [
  {
    id: 'man_01',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    branchId: 'branch_logistics_main',
    staffId: 'staff_01',
    manifestNumber: 'MAN-2026-041',
    driverName: 'Farid (Van 04)',
    driverPhone: '0550 77 66 55',
    vehiclePlate: '04123-119-16',
    zoneWilaya: 'Alger Est (Kouba, Hussein Dey, El Harrach)',
    shipmentIds: ['ship_01'],
    totalShipmentsCount: 18,
    totalCodExpectedDzd: 145000,
    totalCodCollectedDzd: 110000,
    dispatchDate: '2026-05-25',
    status: 'Dispatched',
    createdAt: '2026-05-25T08:30:00Z',
  },
];

export const useLogisticsData = () => {
  const [shipments, setShipments] = useState<LogisticsShipment[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_shipments');
      return saved ? JSON.parse(saved) : INITIAL_SHIPMENTS;
    } catch {
      return INITIAL_SHIPMENTS;
    }
  });

  const [manifests, setManifests] = useState<LogisticsManifest[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_manifests');
      return saved ? JSON.parse(saved) : INITIAL_MANIFESTS;
    } catch {
      return INITIAL_MANIFESTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_shipments', JSON.stringify(shipments));
    } catch {}
  }, [shipments]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_logistics_manifests', JSON.stringify(manifests));
    } catch {}
  }, [manifests]);

  const addShipment = (shipment: LogisticsShipment) => {
    setShipments((prev) => [shipment, ...prev]);
  };

  const updateShipment = (shipment: LogisticsShipment) => {
    setShipments((prev) => prev.map((s) => (s.id === shipment.id ? shipment : s)));
  };

  const deleteShipment = (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
  };

  const addManifest = (manifest: LogisticsManifest) => {
    setManifests((prev) => [manifest, ...prev]);
  };

  const updateManifest = (manifest: LogisticsManifest) => {
    setManifests((prev) => prev.map((m) => (m.id === manifest.id ? manifest : m)));
  };

  const deleteManifest = (id: string) => {
    setManifests((prev) => prev.filter((m) => m.id !== id));
  };

  const updateShipmentStatus = (id: string, status: LogisticsShipment['status']) => {
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  return {
    shipments,
    manifests,
    addShipment,
    updateShipment,
    deleteShipment,
    addManifest,
    updateManifest,
    deleteManifest,
    updateShipmentStatus,
  };
};

