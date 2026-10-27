import { useState, useEffect } from 'react';
import { ManufacturingBom, ManufacturingOrder } from '../../../types';

const INITIAL_BOMS: ManufacturingBom[] = [
  {
    id: 'bom_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    finishedProductId: 'prod_table_01',
    finishedProductName: 'Table Réunion Chêne Massif 3.2m',
    bomCode: 'BOM-TAB-01',
    batchYield: 1,
    unit: 'Unité',
    standardLaborHours: 18,
    components: [
      { rawProductId: 'raw_01', rawProductName: 'Bois Chêne Brut Séché 50mm', quantity: 0.45, unit: 'm³', unitCostDzd: 180000 },
      { rawProductId: 'raw_02', rawProductName: 'Piètement Acier Poudré Noir', quantity: 2, unit: 'Pièce', unitCostDzd: 15000 },
      { rawProductId: 'raw_03', rawProductName: 'Vernis Polyuréthane Mat', quantity: 3, unit: 'Litre', unitCostDzd: 3200 },
    ],
    estimatedCostDzd: 120600,
    isActive: true,
    createdAt: '2026-05-15T08:00:00Z',
  },
  {
    id: 'bom_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    finishedProductId: 'prod_chaise_01',
    finishedProductName: 'Chaise Ergonomique Coque Polypropylène',
    bomCode: 'BOM-CHAIR-04',
    batchYield: 10,
    unit: 'Lot de 10',
    standardLaborHours: 12,
    components: [
      { rawProductId: 'raw_04', rawProductName: 'Granulés Polypropylène Vierge', quantity: 35, unit: 'kg', unitCostDzd: 420 },
      { rawProductId: 'raw_05', rawProductName: 'Structure Tubulaire Chromée', quantity: 10, unit: 'Pièce', unitCostDzd: 2800 },
      { rawProductId: 'raw_06', rawProductName: 'Visserie & Patins Haute Densité', quantity: 40, unit: 'Lot', unitCostDzd: 150 },
    ],
    estimatedCostDzd: 48700,
    isActive: true,
    createdAt: '2026-05-16T09:00:00Z',
  },
];

const INITIAL_ORDERS: ManufacturingOrder[] = [
  {
    id: 'of_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0089',
    bomId: 'bom_01',
    productName: 'Table Réunion Chêne Massif 3.2m',
    targetQuantity: 2,
    actualQuantityProduced: 1,
    batchLotNumber: 'LOT-2026-05A',
    startDate: '2026-05-18T08:00:00Z',
    dueDate: '2026-05-25T17:00:00Z',
    status: 'InProduction',
    totalMaterialCostDzd: 120000,
    totalLaborCostDzd: 40000,
    totalCostDzd: 160000,
    createdAt: '2026-05-18T08:00:00Z',
  },
  {
    id: 'of_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0090',
    bomId: 'bom_02',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    targetQuantity: 50,
    actualQuantityProduced: 50,
    batchLotNumber: 'LOT-2026-05B',
    startDate: '2026-05-12T07:30:00Z',
    dueDate: '2026-05-16T17:00:00Z',
    status: 'Completed',
    totalMaterialCostDzd: 350000,
    totalLaborCostDzd: 125000,
    totalCostDzd: 475000,
    createdAt: '2026-05-12T07:30:00Z',
  },
];

export const useManufacturingData = () => {
  const [boms, setBoms] = useState<ManufacturingBom[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_boms');
      return saved ? JSON.parse(saved) : INITIAL_BOMS;
    } catch {
      return INITIAL_BOMS;
    }
  });

  const [orders, setOrders] = useState<ManufacturingOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_mfg_boms', JSON.stringify(boms));
    } catch {}
  }, [boms]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_mfg_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  const addOrder = (order: ManufacturingOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  const updateOrder = (order: ManufacturingOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const addBom = (bom: ManufacturingBom) => {
    setBoms((prev) => [bom, ...prev]);
  };

  const updateBom = (bom: ManufacturingBom) => {
    setBoms((prev) => prev.map((b) => (b.id === bom.id ? bom : b)));
  };

  const deleteBom = (id: string) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
  };

  const updateOrderStatus = (id: string, status: ManufacturingOrder['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return {
    boms,
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    addBom,
    updateBom,
    deleteBom,
    updateOrderStatus,
  };
};

