import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ManufacturingBom,
  ManufacturingOrder,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  QualityInspectionRecord,
  MfgNcrRecord,
  WorkstationSessionLog,
  MfgAlertRecord,
  MfgFinishedGoodsLot,
  MfgMachineAsset,
  MfgMachineMaintenanceLog,
  MfgCuttingPlan,
  MfgPieceRateEntry,
} from '../../../types';
import { buildScrapNcrArtifacts } from '../../../utils/step5Actions';
import {
  isBomLockedByOrders,
  captureBomSnapshot,
  forkBomNewVersion,
  applySessionToMachineRuntime,
  computePieceRateEarnings,
  formatMfgSequentialCode,
  computeLateReceiptCmupAdjustment,
  optimizeLinearBarCutting1D,
} from '../../../utils/manufacturingDepth';
import { dzdToCentimes, roundHalfAwayFromZero } from '../../../utils/money';
import {
  useAtriumSelector,
  getAtriumActions,
  addNotification,
  showToast,
} from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import {
  isSupabaseConfigured,
  manufacturingService,
  realtimeService,
  syncCoordinator,
  subscribeConcurrencyResolutions,
  runWithConcurrency,
} from '../../../lib/supabase/index';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';

function mergeMfgById<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  if (!remoteItems || remoteItems.length === 0) return localItems;
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  remoteItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export const INITIAL_BOMS: ManufacturingBom[] = [
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
      { rawProductId: 'raw_03', rawProductName: 'Piètement Acier Poudré Noir', quantity: 2, unit: 'Pièce', unitCostDzd: 15000 },
      { rawProductId: 'raw_04', rawProductName: 'Vernis Polyuréthane Mat', quantity: 3, unit: 'Litre', unitCostDzd: 3200 },
    ],
    routingSteps: [
      { id: 'step_01_1', stepNumber: 1, workCenterId: 'wc_decoupe', workCenterName: 'Atelier Découpe Bois', operationName: 'Dégauchissage & Rabotage CNC', setupTimeMinutes: 45, runTimePerUnitMinutes: 180, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 3500 },
      { id: 'step_01_2', stepNumber: 2, workCenterId: 'wc_assemblage', workCenterName: 'Atelier Ébénisterie', operationName: 'Assemblage Rainure & Languette', setupTimeMinutes: 30, runTimePerUnitMinutes: 240, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 2200 },
      { id: 'step_01_3', stepNumber: 3, workCenterId: 'wc_finition', workCenterName: 'Cabine Peinture & Vernis', operationName: 'Application 3 Couches Vernis Mat', setupTimeMinutes: 60, runTimePerUnitMinutes: 120, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 4000 },
    ],
    estimatedCostDzd: 120600,
    isActive: true,
    status: 'Active',
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
      { rawProductId: 'raw_05', rawProductName: 'Granulés Polypropylène Vierge', quantity: 35, unit: 'kg', unitCostDzd: 420 },
      { rawProductId: 'raw_02', rawProductName: 'Tube Acier Rectangulaire 60x40', quantity: 10, unit: 'Pièce', unitCostDzd: 2800 },
      { rawProductId: 'raw_08', rawProductName: 'Visserie & Fixations Zinguées', quantity: 40, unit: 'Lot', unitCostDzd: 150 },
    ],
    routingSteps: [
      { id: 'step_02_1', stepNumber: 1, workCenterId: 'wc_injection', workCenterName: 'Presse Injection Plastique 350T', operationName: 'Moulage Coque PP Monobloc', setupTimeMinutes: 60, runTimePerUnitMinutes: 8, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 5500 },
      { id: 'step_02_2', stepNumber: 2, workCenterId: 'wc_cintrage', workCenterName: 'Cintreuse Tube CNC', operationName: 'Formage Châssis Piétement', setupTimeMinutes: 20, runTimePerUnitMinutes: 12, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 3200 },
    ],
    estimatedCostDzd: 48700,
    isActive: true,
    status: 'Active',
    createdAt: '2026-05-16T09:00:00Z',
  },
  {
    id: 'bom_03',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    finishedProductId: 'prod_porte_01',
    finishedProductName: 'Porte Blindée Acier A2P 210x90cm (Sur-Mesure MTO)',
    bomCode: 'BOM-DOOR-02',
    batchYield: 1,
    unit: 'Unité',
    standardLaborHours: 24,
    components: [
      { rawProductId: 'raw_02', rawProductName: 'Tube Acier Rectangulaire 60x40', quantity: 18, unit: 'Mètre', unitCostDzd: 2800 },
      { rawProductId: 'raw_08', rawProductName: 'Visserie & Fixations Zinguées', quantity: 1, unit: 'Lot', unitCostDzd: 8500 },
      { rawProductId: 'raw_04', rawProductName: 'Vernis Polyuréthane Mat', quantity: 2, unit: 'Litre', unitCostDzd: 3200 },
    ],
    routingSteps: [
      { id: 'step_03_1', stepNumber: 1, workCenterId: 'wc_chaudronnerie', workCenterName: 'Atelier Métallerie & Soudure', operationName: 'Découpe Laser & Soudage MIG/MAG', setupTimeMinutes: 60, runTimePerUnitMinutes: 360, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 4800 },
      { id: 'step_03_2', stepNumber: 2, workCenterId: 'wc_serrurerie', workCenterName: 'Poste Ajustage Serrurerie', operationName: 'Pose Serrure 5 Points & Blindage', setupTimeMinutes: 30, runTimePerUnitMinutes: 180, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 3000 },
    ],
    estimatedCostDzd: 95000,
    isActive: true,
    status: 'Active',
    createdAt: '2026-05-18T10:30:00Z',
  },
  {
    id: 'bom_04',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    finishedProductId: 'prod_textile_01',
    finishedProductName: 'Blouson de Travail Haute Visibilité Bicolor (Textile)',
    bomCode: 'BOM-TEXT-05',
    batchYield: 25,
    unit: 'Lot de 25',
    standardLaborHours: 35,
    components: [
      { rawProductId: 'raw_06', rawProductName: 'Tissu Coton/Polyester Haute Visibilité', quantity: 45, unit: 'Mètre', unitCostDzd: 950 },
      { rawProductId: 'raw_07', rawProductName: 'Bande Réfléchissante 50mm 3M', quantity: 50, unit: 'Mètre', unitCostDzd: 280 },
    ],
    routingSteps: [
      { id: 'step_04_1', stepNumber: 1, workCenterId: 'wc_matelassage', workCenterName: 'Table de Coupe Automatique', operationName: 'Matelassage & Patronage CAO', setupTimeMinutes: 45, runTimePerUnitMinutes: 25, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 2500 },
      { id: 'step_04_2', stepNumber: 2, workCenterId: 'wc_piquage', workCenterName: 'Ligne Piqueuses Industrielles', operationName: 'Assemblage & Pose Bandes Rétro', setupTimeMinutes: 30, runTimePerUnitMinutes: 45, operatorRateDzdPerHour: 1200, machineRateDzdPerHour: 1800 },
    ],
    estimatedCostDzd: 56750,
    isActive: true,
    status: 'Active',
    createdAt: '2026-05-20T11:00:00Z',
  },
];

export const INITIAL_ORDERS: ManufacturingOrder[] = [
  {
    id: 'of_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0089',
    bomId: 'bom_01',
    productName: 'Table Réunion Chêne Massif 3.2m',
    targetQuantity: 4,
    actualQuantityProduced: 2,
    quantityProduced: 2,
    scrapQuantity: 0,
    assignedStation: 'Poste 03 - Découpe & Usinage CNC',
    batchLotNumber: 'LOT-202610-0089',
    startDate: '2026-05-18T08:00:00Z',
    dueDate: '2026-05-28T17:00:00Z',
    status: 'InProduction',
    totalMaterialCostDzd: 241200,
    totalLaborCostDzd: 80000,
    totalCostDzd: 321200,
    clientName: 'Banque Nationale d\'Algérie (BNA)',
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
    targetQuantity: 100,
    actualQuantityProduced: 100,
    quantityProduced: 100,
    scrapQuantity: 3,
    assignedStation: 'Presse Injection Plastique 350T',
    batchLotNumber: 'LOT-202610-0090',
    startDate: '2026-05-12T07:30:00Z',
    dueDate: '2026-05-16T17:00:00Z',
    status: 'Completed',
    totalMaterialCostDzd: 487000,
    totalLaborCostDzd: 125000,
    totalCostDzd: 612000,
    clientName: 'Ministère de l\'Enseignement Supérieur',
    createdAt: '2026-05-12T07:30:00Z',
  },
  {
    id: 'of_03',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0091',
    bomId: 'bom_03',
    productName: 'Porte Blindée Acier A2P 210x90cm (Sur-Mesure MTO)',
    targetQuantity: 6,
    actualQuantityProduced: 0,
    quantityProduced: 0,
    scrapQuantity: 0,
    assignedStation: 'Atelier Métallerie & Soudure',
    batchLotNumber: 'LOT-202610-0091',
    startDate: '2026-05-25T08:00:00Z',
    dueDate: '2026-06-05T17:00:00Z',
    status: 'Planned',
    totalMaterialCostDzd: 380000,
    totalLaborCostDzd: 190000,
    totalCostDzd: 570000,
    clientName: 'Résidence Les Palmiers - Hydra',
    createdAt: '2026-05-21T09:15:00Z',
  },
  {
    id: 'of_04',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0092',
    bomId: 'bom_04',
    productName: 'Blouson de Travail Haute Visibilité Bicolor (Textile)',
    targetQuantity: 150,
    actualQuantityProduced: 75,
    quantityProduced: 75,
    scrapQuantity: 2,
    assignedStation: 'Ligne Piqueuses Industrielles',
    batchLotNumber: 'LOT-202610-0092',
    startDate: '2026-05-19T07:00:00Z',
    dueDate: '2026-05-30T16:00:00Z',
    status: 'InProduction',
    totalMaterialCostDzd: 340500,
    totalLaborCostDzd: 180000,
    totalCostDzd: 520500,
    clientName: 'Sonatrach DP Hassi Messaoud',
    createdAt: '2026-05-19T07:00:00Z',
  },
  {
    id: 'of_05',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0093',
    bomId: 'bom_02',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    targetQuantity: 40,
    actualQuantityProduced: 40,
    quantityProduced: 40,
    scrapQuantity: 1,
    assignedStation: 'Presse Injection Plastique 350T',
    batchLotNumber: 'LOT-202610-0093',
    startDate: '2026-05-22T08:00:00Z',
    dueDate: '2026-05-24T17:00:00Z',
    status: 'QC_Pending',
    totalMaterialCostDzd: 194800,
    totalLaborCostDzd: 50000,
    totalCostDzd: 244800,
    clientName: 'Startup Incubator Cyberparc Sidi Abdellah',
    createdAt: '2026-05-22T08:00:00Z',
  },
  {
    id: 'of_06',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    orderNumber: 'OF-2026-0094',
    bomId: 'bom_01',
    productName: 'Table Réunion Chêne Massif 3.2m',
    targetQuantity: 1,
    actualQuantityProduced: 1,
    quantityProduced: 1,
    scrapQuantity: 0,
    assignedStation: 'Cabine Peinture & Vernis',
    batchLotNumber: 'LOT-202610-0094',
    startDate: '2026-05-10T08:00:00Z',
    dueDate: '2026-05-15T17:00:00Z',
    status: 'Completed',
    totalMaterialCostDzd: 120600,
    totalLaborCostDzd: 40000,
    totalCostDzd: 160600,
    clientName: 'Cabinet Notarial Maître Benali',
    createdAt: '2026-05-10T08:00:00Z',
  },
];

export const INITIAL_RAW_MATERIALS: RawMaterialStockItem[] = [
  {
    id: 'raw_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-WD-01',
    name: 'Bois Chêne Brut Séché 50mm',
    category: 'Wood',
    currentStock: 14.8,
    allocatedStock: 1.8,
    availableStock: 13.0,
    reorderThreshold: 4.0,
    unit: 'm³',
    unitCostPmpDzd: 180000,
    totalValuationDzd: 2664000,
    warehouseLocation: 'Dépôt Bois - Rack A-01',
    supplierLotNumber: 'IMP-2026-CHN-44',
    createdAt: '2026-05-01T08:00:00Z',
  },
  {
    id: 'raw_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-STL-01',
    name: 'Tube Acier Rectangulaire 60x40',
    category: 'Metals',
    currentStock: 280,
    allocatedStock: 108,
    availableStock: 172,
    reorderThreshold: 80,
    unit: 'Mètre',
    unitCostPmpDzd: 2800,
    totalValuationDzd: 784000,
    warehouseLocation: 'Parc Métaux - Allée B-04',
    supplierLotNumber: 'EL-HADJAR-2026-08',
    onmlCertificateRef: 'ONML-MET-092-2026',
    createdAt: '2026-05-02T08:00:00Z',
  },
  {
    id: 'raw_03',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-STL-02',
    name: 'Piètement Acier Poudré Noir',
    category: 'Metals',
    currentStock: 24,
    allocatedStock: 8,
    availableStock: 16,
    reorderThreshold: 10,
    unit: 'Pièce',
    unitCostPmpDzd: 15000,
    totalValuationDzd: 360000,
    warehouseLocation: 'Allée C - Rayon 02',
    supplierLotNumber: 'LOT-STL-2026-02',
    createdAt: '2026-05-03T08:00:00Z',
  },
  {
    id: 'raw_04',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-CHM-01',
    name: 'Vernis Polyuréthane Mat',
    category: 'Chemicals',
    currentStock: 48,
    allocatedStock: 12,
    availableStock: 36,
    reorderThreshold: 15,
    unit: 'Litre',
    unitCostPmpDzd: 3200,
    totalValuationDzd: 153600,
    warehouseLocation: 'Dépôt Chimique Sécurisé D-01',
    supplierLotNumber: 'CHM-VRN-2026-99',
    createdAt: '2026-05-04T08:00:00Z',
  },
  {
    id: 'raw_05',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-PLS-01',
    name: 'Granulés Polypropylène Vierge',
    category: 'Plastics',
    currentStock: 1850,
    allocatedStock: 350,
    availableStock: 1500,
    reorderThreshold: 600,
    unit: 'kg',
    unitCostPmpDzd: 420,
    totalValuationDzd: 777000,
    warehouseLocation: 'Silo Matières Polymères P-02',
    supplierLotNumber: 'ENIP-PP-2026-311',
    createdAt: '2026-05-05T08:00:00Z',
  },
  {
    id: 'raw_06',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-TXT-01',
    name: 'Tissu Coton/Polyester Haute Visibilité',
    category: 'Textiles',
    currentStock: 620,
    allocatedStock: 270,
    availableStock: 350,
    reorderThreshold: 150,
    unit: 'Mètre',
    unitCostPmpDzd: 950,
    totalValuationDzd: 589000,
    warehouseLocation: 'Magasin Confection T-01',
    supplierLotNumber: 'TEXALG-2026-HV4',
    createdAt: '2026-05-06T08:00:00Z',
  },
  {
    id: 'raw_07',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-TXT-02',
    name: 'Bande Réfléchissante 50mm 3M',
    category: 'Textiles',
    currentStock: 450,
    allocatedStock: 300,
    availableStock: 150,
    reorderThreshold: 100,
    unit: 'Mètre',
    unitCostPmpDzd: 280,
    totalValuationDzd: 126000,
    warehouseLocation: 'Magasin Confection T-02',
    supplierLotNumber: '3M-SCOTCH-2026',
    createdAt: '2026-05-07T08:00:00Z',
  },
  {
    id: 'raw_08',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    sku: 'RAW-HDW-01',
    name: 'Visserie & Fixations Zinguées',
    category: 'Hardware',
    currentStock: 120,
    allocatedStock: 40,
    availableStock: 80,
    reorderThreshold: 30,
    unit: 'Lot',
    unitCostPmpDzd: 150,
    totalValuationDzd: 18000,
    warehouseLocation: 'Casier Quincaillerie Q-03',
    supplierLotNumber: 'BOUFARIK-VIS-26',
    createdAt: '2026-05-08T08:00:00Z',
  },
];

export const INITIAL_VOUCHERS: MaterialTransferVoucher[] = [
  {
    id: 'v_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    voucherNumber: 'BSM-2026-0042',
    voucherType: 'BonDeSortie',
    orderId: 'of_01',
    orderNumber: 'OF-2026-0089',
    recipientStaffName: 'M. Karim Bouzid (Opérateur CNC)',
    transferDate: '2026-05-18T08:30:00Z',
    items: [
      { materialId: 'raw_01', materialName: 'Bois Chêne Brut Séché 50mm', quantity: 1.8, unit: 'm³', unitCostDzd: 180000, lotNumber: 'IMP-2026-CHN-44' },
      { materialId: 'raw_03', materialName: 'Piètement Acier Poudré Noir', quantity: 8, unit: 'Pièce', unitCostDzd: 15000, lotNumber: 'LOT-STL-2026-02' },
    ],
    totalValueDzd: 444000,
    notes: 'Sortie matière autorisée sous Décret 05-468 pour OF-2026-0089',
  },
  {
    id: 'v_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    voucherNumber: 'BR-2026-0019',
    voucherType: 'BonDeReception',
    recipientStaffName: 'M. Amine Toumi (Magasinier Principal)',
    transferDate: '2026-05-14T10:15:00Z',
    items: [
      { materialId: 'raw_05', materialName: 'Granulés Polypropylène Vierge', quantity: 1000, unit: 'kg', unitCostDzd: 420, lotNumber: 'ENIP-PP-2026-311' },
    ],
    totalValueDzd: 420000,
    notes: 'Réception conforme BL Fournisseur ENIP Skikda N° 99182. Pesée au pont bascule validée.',
  },
  {
    id: 'v_03',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    voucherNumber: 'BSM-2026-0043',
    voucherType: 'BonDeSortie',
    orderId: 'of_04',
    orderNumber: 'OF-2026-0092',
    recipientStaffName: 'Mme Fatima Mansouri (Chef Coupe)',
    transferDate: '2026-05-19T07:45:00Z',
    items: [
      { materialId: 'raw_06', materialName: 'Tissu Coton/Polyester Haute Visibilité', quantity: 270, unit: 'Mètre', unitCostDzd: 950, lotNumber: 'TEXALG-2026-HV4' },
      { materialId: 'raw_07', materialName: 'Bande Réfléchissante 50mm 3M', quantity: 300, unit: 'Mètre', unitCostDzd: 280, lotNumber: '3M-SCOTCH-2026' },
    ],
    totalValueDzd: 340500,
    notes: 'Sortie matière pour commande Sonatrach DP. Conforme fiche technique.',
  },
  {
    id: 'v_04',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    voucherNumber: 'BT-2026-0008',
    voucherType: 'BonDeTransfert',
    recipientStaffName: 'M. Rachid Larbi (Chef Atelier Métallerie)',
    transferDate: '2026-05-20T14:00:00Z',
    items: [
      { materialId: 'raw_02', materialName: 'Tube Acier Rectangulaire 60x40', quantity: 60, unit: 'Mètre', unitCostDzd: 2800, lotNumber: 'EL-HADJAR-2026-08' },
    ],
    totalValueDzd: 168000,
    notes: 'Transfert magasin central vers atelier soudure.',
  },
];

export const INITIAL_QC_RECORDS: QualityInspectionRecord[] = [
  {
    id: 'qc_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    inspectionNumber: 'QC-2026-00084',
    orderId: 'of_02',
    orderNumber: 'OF-2026-0090',
    batchLotNumber: 'LOT-202610-0090',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    sampleSize: 10,
    inspectedQuantity: 100,
    acceptedQuantity: 97,
    rejectedQuantity: 3,
    verdict: 'Accepted',
    checkpoints: [
      { parameter: 'Résistance charge statique assise (120kg)', nominalValue: '120 kg', tolerance: '+/- 5 kg', measuredValue: '135 kg (OK)', passed: true },
      { parameter: 'Épaisseur coque injectée', nominalValue: '4.5 mm', tolerance: '+/- 0.3 mm', measuredValue: '4.6 mm', passed: true },
      { parameter: 'Adhérence peinture poudre époxy piètement', nominalValue: 'Classe 0 ISO 2409', tolerance: 'Sans éclat', measuredValue: 'Conforme', passed: true },
    ],
    inspectorName: 'Ing. Sofiane Mokrani (CQ & Métrologie)',
    inspectionDate: '2026-05-16T15:30:00Z',
    certificateOfConformityGenerated: true,
    notes: 'Lot certifié conforme aux normes IANOR NA 1620 et ISO 9001. Prêt pour expédition client.',
  },
  {
    id: 'qc_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    inspectionNumber: 'QC-2026-00085',
    orderId: 'of_06',
    orderNumber: 'OF-2026-0094',
    batchLotNumber: 'LOT-202610-0094',
    productName: 'Table Réunion Chêne Massif 3.2m',
    sampleSize: 1,
    inspectedQuantity: 1,
    acceptedQuantity: 1,
    rejectedQuantity: 0,
    verdict: 'Accepted',
    checkpoints: [
      { parameter: 'Planéité plateau chêne massif', nominalValue: '3200 x 1200 mm', tolerance: '+/- 1.5 mm', measuredValue: '0.8 mm flèche max', passed: true },
      { parameter: 'Taux humidité bois séché', nominalValue: '< 10%', tolerance: '8-11%', measuredValue: '9.2%', passed: true },
      { parameter: 'Brillance vernis polyuréthane mat', nominalValue: '15 Gloss', tolerance: '+/- 3 Gloss', measuredValue: '14 Gloss', passed: true },
    ],
    inspectorName: 'Ing. Sofiane Mokrani (CQ & Métrologie)',
    inspectionDate: '2026-05-15T16:00:00Z',
    certificateOfConformityGenerated: true,
    notes: 'Finition artisanale haut de gamme validée. Visa apposé.',
  },
  {
    id: 'qc_03',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    inspectionNumber: 'QC-2026-00086',
    orderId: 'of_05',
    orderNumber: 'OF-2026-0093',
    batchLotNumber: 'LOT-202610-0093',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    sampleSize: 5,
    inspectedQuantity: 40,
    acceptedQuantity: 39,
    rejectedQuantity: 1,
    verdict: 'Quarantined',
    checkpoints: [
      { parameter: 'Aspect visuel état de surface', nominalValue: 'Sans bavure', tolerance: 'Aspect A', measuredValue: 'Micro-retassure sur 1 pièce', passed: false },
      { parameter: 'Stabilité 4 patins au sol', nominalValue: '4 appuis plans', tolerance: '< 1mm', measuredValue: 'Conforme', passed: true },
    ],
    inspectorName: 'Ing. Sofiane Mokrani (CQ & Métrologie)',
    inspectionDate: '2026-05-24T11:00:00Z',
    certificateOfConformityGenerated: false,
    notes: 'Mise en quarantaine partielle pour contrôle température buse injection.',
  },
];

export const INITIAL_MFG_MACHINES: MfgMachineAsset[] = [
  {
    id: 'wc_decoupe',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    code: 'CNC-01',
    name: 'Centre Usinage CNC 5 Axes (Bois & Alu)',
    department: 'Découpe & Usinage',
    machineType: 'CNC 5 Axes',
    hourlyCostDzd: 3500,
    status: 'Running',
    currentOrderCode: 'OF-2026-0089',
    runningHours: 238,
    cycleCount: 1480,
    maintenanceIntervalHours: 250,
    maintenanceIntervalDays: 90,
    lastMaintenanceDate: '2026-03-01',
    nextMaintenanceDueDate: '2026-06-01',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'wc_injection',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    code: 'INJ-350T',
    name: 'Presse Injection Plastique 350T',
    department: 'Plasturgie',
    machineType: 'Presse Hydraulique',
    hourlyCostDzd: 5500,
    status: 'Idle',
    runningHours: 512,
    cycleCount: 14200,
    maintenanceIntervalHours: 500,
    maintenanceIntervalDays: 60,
    lastMaintenanceDate: '2026-02-15',
    nextMaintenanceDueDate: '2026-04-16',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'wc_piquage',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    code: 'TEX-LINE-02',
    name: 'Ligne Piqueuses Industrielles Double Entraînement',
    department: 'Confection Textile',
    machineType: 'Piqueuse',
    hourlyCostDzd: 1800,
    status: 'Running',
    currentOrderCode: 'OF-2026-0092',
    runningHours: 145,
    cycleCount: 3800,
    maintenanceIntervalHours: 300,
    maintenanceIntervalDays: 90,
    lastMaintenanceDate: '2026-04-01',
    nextMaintenanceDueDate: '2026-07-01',
    createdAt: '2026-01-10T08:00:00Z',
  },
];

export const INITIAL_MFG_MAINTENANCE: MfgMachineMaintenanceLog[] = [
  {
    id: 'mnt_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    ticketNumber: 'MNT-2026-00001',
    machineId: 'wc_injection',
    machineName: 'Presse Injection Plastique 350T',
    maintenanceType: 'Preventive',
    triggerReason: 'Seuil 500h dépassé (512h)',
    runtimeHoursAtService: 512,
    cycleCountAtService: 14200,
    scheduledDate: '2026-05-25',
    technicianName: 'Rafik Benali (Électromécanicien)',
    costCentimes: 1_850_000,
    status: 'Overdue',
    checklistNotes: 'Vidange huile hydraulique ISO VG46, contrôle clapets buse & graissage colonnes.',
    createdAt: '2026-05-20T09:00:00Z',
  },
];

export const INITIAL_MFG_ALERTS: MfgAlertRecord[] = [
  {
    id: 'andn_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    alertNumber: 'ANDN-2026-00001',
    alertType: 'MaintenanceDue',
    severity: 'warning',
    workstationId: 'wc_injection',
    workstationName: 'Presse Injection Plastique 350T',
    raisedByName: 'Système GMAO',
    notifiedRoles: ['gerant', 'chef_atelier'],
    message: 'Presse Injection 350T : intervalle préventif 500h atteint (512h). Révision requise.',
    status: 'Open',
    createdAt: '2026-05-24T08:15:00Z',
  },
];

export const INITIAL_FINISHED_GOODS: MfgFinishedGoodsLot[] = [
  {
    id: 'pfg_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    lotNumber: 'PFG-2026-00001',
    sku: 'FIN-CHAIR-04',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    orderId: 'of_02',
    orderNumber: 'OF-2026-0090',
    qcInspectionId: 'qc_01',
    qtyProduced: 100,
    qtyReserved: 0,
    qtyDelivered: 0,
    unit: 'Unité',
    unitCmupCentimes: 612_000,
    warehouseLocation: 'Magasin PF - Travée A',
    releaseStatus: 'Released',
    producedAt: '2026-05-16T15:00:00Z',
    releasedAt: '2026-05-16T15:30:00Z',
    releasedBy: 'Ing. Sofiane Mokrani (CQ & Métrologie)',
    notes: 'Lot certifié IANOR NA 1620 — Prêt pour expédition BL/FAC.',
    createdAt: '2026-05-16T15:00:00Z',
  },
  {
    id: 'pfg_02',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    lotNumber: 'PFG-2026-00002',
    sku: 'FIN-CHAIR-04',
    productName: 'Chaise Ergonomique Coque Polypropylène',
    orderId: 'of_05',
    orderNumber: 'OF-2026-0093',
    qcInspectionId: 'qc_03',
    qtyProduced: 39,
    qtyReserved: 0,
    qtyDelivered: 0,
    unit: 'Unité',
    unitCmupCentimes: 612_000,
    warehouseLocation: 'Zone Quarantaine CQ',
    releaseStatus: 'Quarantine',
    producedAt: '2026-05-24T10:30:00Z',
    notes: 'En attente de validation CQ finale suite micro-retassure.',
    createdAt: '2026-05-24T10:30:00Z',
  },
];

export const INITIAL_SESSION_LOGS: WorkstationSessionLog[] = [
  {
    id: 'wsl_01',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    branchId: 'branch_manufacturing_main',
    staffId: 'staff_01',
    operatorStaffId: 'staff_01',
    operatorName: 'Karim Belkacem (Opérateur CNC)',
    pinVerified: true,
    pinVerifiedAt: '2026-05-24T08:00:00Z',
    ppeChecklist: { glasses: true, gloves: true, shoes: true, helmet: true },
    ppeVerified: true,
    ppeVerifiedAt: '2026-05-24T08:01:00Z',
    workCenterId: 'wc_decoupe',
    workCenterName: 'Centre Usinage CNC 5 Axes (Bois & Alu)',
    orderId: 'of_01',
    orderNumber: 'OF-2026-0089',
    stepNumber: 1,
    operationName: 'Dégauchissage & Rabotage CNC',
    startTime: '2026-05-24T08:02:00Z',
    endTime: '2026-05-24T12:02:00Z',
    durationSeconds: 14400,
    pauseDurationSeconds: 0,
    goodQuantity: 2,
    scrapQuantity: 0,
    pieceRateCentimes: 250_000,
    status: 'Submitted',
    createdAt: '2026-05-24T12:02:00Z',
  },
];

export const INITIAL_CUTTING_PLANS: MfgCuttingPlan[] = (() => {
  const parts = [
    { id: 'part_1', label: 'Montant Dormant 2150mm', lengthMm: 2150, quantity: 6 },
    { id: 'part_2', label: 'Traverse Basse 950mm', lengthMm: 950, quantity: 6 },
  ];
  const layoutResult = optimizeLinearBarCutting1D({
    stockLengthMm: 6000,
    kerfMm: 4,
    parts,
    minReusableOffcutMm: 500,
  });
  return [
    {
      id: 'cut_01',
      accountId: 'acc_01',
      businessId: 'biz_manufacturing',
      branchId: 'branch_manufacturing_main',
      staffId: 'staff_01',
      planNumber: 'CUT-2026-00001',
      title: 'Débit Profilé Aluminium Série 60 — Lot Hydra',
      tradeCategory: 'Aluminum',
      cuttingMode: '1d_linear',
      stockLengthMm: 6000,
      stockWidthMm: 120,
      kerfMm: 4,
      parts,
      layoutResult,
      stockUnitsRequired: layoutResult.stockUnitsRequired,
      wastePercent: layoutResult.wastePercent,
      reusableOffcuts: layoutResult.reusableOffcutsSummary,
      unitPriceCentimes: 185_000,
      createdAt: '2026-05-24T09:00:00Z',
    },
  ];
})();

export const useManufacturingData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_manufacturing_main';
  const activeBusinessId = currentBusinessId || 'biz_manufacturing';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_manufacturing_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_manufacturing',
      accountId:
        (item as { accountId?: string }).accountId ||
        currentAccountId ||
        (isDemoModeEnabled() ? 'acc_01' : ''),
    }) as T;

  const [boms, setBoms] = useState<ManufacturingBom[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_boms');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<ManufacturingOrder[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [materials, setMaterials] = useState<RawMaterialStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_raw_materials_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [vouchers, setVouchers] = useState<MaterialTransferVoucher[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_vouchers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [qcRecords, setQcRecords] = useState<QualityInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_qc_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [ncrRecords, setNcrRecords] = useState<MfgNcrRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_ncr_records_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<MfgAlertRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_alerts_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [finishedGoods, setFinishedGoods] = useState<MfgFinishedGoodsLot[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_finished_goods_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [machines, setMachines] = useState<MfgMachineAsset[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_machines_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MfgMachineMaintenanceLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_maintenance_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sessionLogs, setSessionLogs] = useState<WorkstationSessionLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_session_logs_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cuttingPlans, setCuttingPlans] = useState<MfgCuttingPlan[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_cutting_plans_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // LocalStorage synchronizers (idle-deferred)
  useIdlePersist('atrium_mfg_boms', boms);
  useIdlePersist('atrium_mfg_orders', orders);
  useIdlePersist('atrium_mfg_raw_materials_v2', materials);
  useIdlePersist('atrium_mfg_vouchers', vouchers);
  useIdlePersist('atrium_mfg_qc_records', qcRecords);
  useIdlePersist('atrium_mfg_ncr_records_v1', ncrRecords);
  useIdlePersist('atrium_mfg_alerts_v2', alerts);
  useIdlePersist('atrium_mfg_finished_goods_v2', finishedGoods);
  useIdlePersist('atrium_mfg_machines_v2', machines);
  useIdlePersist('atrium_mfg_maintenance_v2', maintenanceLogs);
  useIdlePersist('atrium_mfg_session_logs_v2', sessionLogs);
  useIdlePersist('atrium_mfg_cutting_plans_v2', cuttingPlans);

  // Hydrate manufacturing vertical state from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`manufacturing:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteBoms,
        remoteOrders,
        remoteMaterials,
        remoteVouchers,
        remoteQc,
        remoteNcrs,
        remoteAlerts,
        remoteFinishedGoods,
        remoteMachines,
        remoteMaintenance,
        remoteSessions,
        remoteCuttingPlans,
      ] = await runWithConcurrency(
        [
          () => manufacturingService.fetchBoms(activeBranchId),
          () => manufacturingService.fetchOrders(activeBranchId),
          () => manufacturingService.fetchRawMaterials(activeBranchId),
          () => manufacturingService.fetchMaterialVouchers(activeBranchId),
          () => manufacturingService.fetchQcInspections(activeBranchId),
          () => manufacturingService.fetchNcrRecords(activeBranchId),
          () => manufacturingService.fetchAlerts(activeBranchId),
          () => manufacturingService.fetchFinishedGoods(activeBranchId),
          () => manufacturingService.fetchMachines(activeBranchId),
          () => manufacturingService.fetchMaintenanceLogs(activeBranchId),
          () => manufacturingService.fetchSessionLogs(activeBranchId),
          () => manufacturingService.fetchCuttingPlans(activeBranchId),
        ],
        4
      );

      if (cancelled) return;
      if (Array.isArray(remoteBoms) && remoteBoms.length > 0) {
        setBoms((prev) => mergeMfgById(prev, remoteBoms as ManufacturingBom[]));
      }
      if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
        setOrders((prev) => mergeMfgById(prev, remoteOrders as ManufacturingOrder[]));
      }
      if (Array.isArray(remoteMaterials) && remoteMaterials.length > 0) {
        setMaterials((prev) => mergeMfgById(prev, remoteMaterials as RawMaterialStockItem[]));
      }
      if (Array.isArray(remoteVouchers) && remoteVouchers.length > 0) {
        setVouchers((prev) => mergeMfgById(prev, remoteVouchers as MaterialTransferVoucher[]));
      }
      if (Array.isArray(remoteQc) && remoteQc.length > 0) {
        setQcRecords((prev) => mergeMfgById(prev, remoteQc as QualityInspectionRecord[]));
      }
      if (Array.isArray(remoteNcrs) && remoteNcrs.length > 0) {
        setNcrRecords((prev) => mergeMfgById(prev, remoteNcrs as MfgNcrRecord[]));
      }
      if (Array.isArray(remoteAlerts) && remoteAlerts.length > 0) {
        setAlerts((prev) => mergeMfgById(prev, remoteAlerts as MfgAlertRecord[]));
      }
      if (Array.isArray(remoteFinishedGoods) && remoteFinishedGoods.length > 0) {
        setFinishedGoods((prev) => mergeMfgById(prev, remoteFinishedGoods as MfgFinishedGoodsLot[]));
      }
      if (Array.isArray(remoteMachines) && remoteMachines.length > 0) {
        setMachines((prev) => mergeMfgById(prev, remoteMachines as MfgMachineAsset[]));
      }
      if (Array.isArray(remoteMaintenance) && remoteMaintenance.length > 0) {
        setMaintenanceLogs((prev) => mergeMfgById(prev, remoteMaintenance as MfgMachineMaintenanceLog[]));
      }
      if (Array.isArray(remoteSessions) && remoteSessions.length > 0) {
        setSessionLogs((prev) => mergeMfgById(prev, remoteSessions as WorkstationSessionLog[]));
      }
      if (Array.isArray(remoteCuttingPlans) && remoteCuttingPlans.length > 0) {
        setCuttingPlans((prev) => mergeMfgById(prev, remoteCuttingPlans as MfgCuttingPlan[]));
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
      'mfg_bom_recipes',
      'mfg_bom_ingredients',
      'mfg_orders',
      'mfg_raw_materials',
      'mfg_material_vouchers',
      'mfg_qc_inspections',
      'mfg_ncr_records',
      'mfg_alerts',
      'mfg_finished_goods',
      'mfg_workstations',
      'mfg_machine_maintenance',
      'mfg_workstation_logs',
      'mfg_cutting_plans',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('mfg_bom_recipes', setBoms);
      prune('mfg_orders', setOrders);
      prune('mfg_raw_materials', setMaterials);
      prune('mfg_material_vouchers', setVouchers);
      prune('mfg_qc_inspections', setQcRecords);
      prune('mfg_ncr_records', setNcrRecords);
      prune('mfg_alerts', setAlerts);
      prune('mfg_finished_goods', setFinishedGoods);
      prune('mfg_workstations', setMachines);
      prune('mfg_machine_maintenance', setMaintenanceLogs);
      prune('mfg_workstation_logs', setSessionLogs);
      prune('mfg_cutting_plans', setCuttingPlans);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('mfg_bom_recipes') || changedSet.has('mfg_bom_ingredients')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchBoms(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBoms((prev) => mergeMfgById(prev, rows as ManufacturingBom[]));
          }
        });
      }
      if (changedSet.has('mfg_orders')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchOrders(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setOrders((prev) => mergeMfgById(prev, rows as ManufacturingOrder[]));
          }
        });
      }
      if (changedSet.has('mfg_raw_materials')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchRawMaterials(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMaterials((prev) => mergeMfgById(prev, rows as RawMaterialStockItem[]));
          }
        });
      }
      if (changedSet.has('mfg_material_vouchers')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMaterialVouchers(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVouchers((prev) => mergeMfgById(prev, rows as MaterialTransferVoucher[]));
          }
        });
      }
      if (changedSet.has('mfg_qc_inspections')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchQcInspections(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setQcRecords((prev) => mergeMfgById(prev, rows as QualityInspectionRecord[]));
          }
        });
      }
      if (changedSet.has('mfg_ncr_records')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchNcrRecords(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setNcrRecords((prev) => mergeMfgById(prev, rows as MfgNcrRecord[]));
          }
        });
      }
      if (changedSet.has('mfg_alerts')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchAlerts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setAlerts((prev) => mergeMfgById(prev, rows as MfgAlertRecord[]));
          }
        });
      }
      if (changedSet.has('mfg_finished_goods')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchFinishedGoods(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setFinishedGoods((prev) => mergeMfgById(prev, rows as MfgFinishedGoodsLot[]));
          }
        });
      }
      if (changedSet.has('mfg_workstations')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMachines(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMachines((prev) => mergeMfgById(prev, rows as MfgMachineAsset[]));
          }
        });
      }
      if (changedSet.has('mfg_machine_maintenance')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMaintenanceLogs(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMaintenanceLogs((prev) => mergeMfgById(prev, rows as MfgMachineMaintenanceLog[]));
          }
        });
      }
      if (changedSet.has('mfg_workstation_logs')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchSessionLogs(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setSessionLogs((prev) => mergeMfgById(prev, rows as WorkstationSessionLog[]));
          }
        });
      }
      if (changedSet.has('mfg_cutting_plans')) {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchCuttingPlans(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setCuttingPlans((prev) => mergeMfgById(prev, rows as MfgCuttingPlan[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `manufacturing:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
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
      if (evt.table === 'mfg_bom_recipes' || evt.table === 'mfg_bom_ingredients') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchBoms(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setBoms((prev) => mergeMfgById(prev, rows as ManufacturingBom[]));
          }
        });
      } else if (evt.table === 'mfg_orders') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchOrders(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setOrders((prev) => mergeMfgById(prev, rows as ManufacturingOrder[]));
          }
        });
      } else if (evt.table === 'mfg_raw_materials') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchRawMaterials(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMaterials((prev) => mergeMfgById(prev, rows as RawMaterialStockItem[]));
          }
        });
      } else if (evt.table === 'mfg_material_vouchers') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMaterialVouchers(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setVouchers((prev) => mergeMfgById(prev, rows as MaterialTransferVoucher[]));
          }
        });
      } else if (evt.table === 'mfg_qc_inspections') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchQcInspections(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setQcRecords((prev) => mergeMfgById(prev, rows as QualityInspectionRecord[]));
          }
        });
      } else if (evt.table === 'mfg_alerts') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchAlerts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setAlerts((prev) => mergeMfgById(prev, rows as MfgAlertRecord[]));
          }
        });
      } else if (evt.table === 'mfg_finished_goods') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchFinishedGoods(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setFinishedGoods((prev) => mergeMfgById(prev, rows as MfgFinishedGoodsLot[]));
          }
        });
      } else if (evt.table === 'mfg_workstations') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMachines(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMachines((prev) => mergeMfgById(prev, rows as MfgMachineAsset[]));
          }
        });
      } else if (evt.table === 'mfg_machine_maintenance') {
        tasks.push(async () => {
          const rows = await manufacturingService.fetchMaintenanceLogs(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setMaintenanceLogs((prev) => mergeMfgById(prev, rows as MfgMachineMaintenanceLog[]));
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `manufacturing:res:${activeBranchId}:${evt.table}`,
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
    boms,
    orders,
    materials,
    vouchers,
    qcRecords,
    ncrRecords,
    alerts,
    finishedGoods,
    machines,
    maintenanceLogs,
    sessionLogs,
    cuttingPlans,
  });
  latestRef.current = {
    boms,
    orders,
    materials,
    vouchers,
    qcRecords,
    ncrRecords,
    alerts,
    finishedGoods,
    machines,
    maintenanceLogs,
    sessionLogs,
    cuttingPlans,
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

  // Order CRUD
  const addOrder = (order: ManufacturingOrder) => {
    const matchedBom = latestRef.current.boms.find((b) => b.id === order.bomId);
    const enriched: ManufacturingOrder = {
      ...order,
      bomCode: order.bomCode || matchedBom?.bomCode,
      pinnedBomVersion: order.pinnedBomVersion ?? matchedBom?.version ?? 1,
      bomSnapshot: order.bomSnapshot || (matchedBom ? captureBomSnapshot(matchedBom) : undefined),
    };
    const scoped = withBranch(enriched);
    const snap = cloneSnapshot(scoped);
    setOrders((prev) => [scoped, ...prev]);
    void manufacturingService.upsertOrder(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Ordre de fabrication ${scoped.orderNumber} créé`,
        en: `Production order ${scoped.orderNumber} created`,
        ar: `تم إنشاء أمر التصنيع ${scoped.orderNumber}`,
      }),
      undo: () => {
        setOrders((prev) => prev.filter((o) => o.id !== snap.id));
        void manufacturingService.deleteOrder(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setOrders((prev) => (prev.some((o) => o.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('mfg_orders', re.id, currentStaffId)
          .then(() => manufacturingService.upsertOrder(re))
          .catch(() => {});
      },
    });
  };

  const updateOrder = (order: ManufacturingOrder) => {
    const scoped = withBranch(order);
    const existing = latestRef.current.orders.find((o) => o.id === order.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? scoped : o)));
    void manufacturingService.upsertOrder(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.orderNumber,
        summary: pickLocalizedText(language, {
          fr: `Ordre ${nextSnap.orderNumber} modifié`,
          en: `Production order ${nextSnap.orderNumber} updated`,
          ar: `تم تعديل أمر التصنيع ${nextSnap.orderNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setOrders((prev) => prev.map((o) => (o.id === prevCopy.id ? prevCopy : o)));
          void manufacturingService.upsertOrder(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setOrders((prev) => prev.map((o) => (o.id === nextCopy.id ? nextCopy : o)));
          void manufacturingService.upsertOrder(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deleteOrder = (id: string) => {
    const idx = latestRef.current.orders.findIndex((o) => o.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.orders[idx]) : null;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    void manufacturingService.deleteOrder(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.orderNumber,
        summary: pickLocalizedText(language, {
          fr: `Ordre ${existing.orderNumber} supprimé`,
          en: `Production order ${existing.orderNumber} deleted`,
          ar: `تم حذف أمر التصنيع ${existing.orderNumber}`,
        }),
        undo: () => {
          restoreAt(setOrders, existing, idx);
          void syncCoordinator
            .restoreRow('mfg_orders', existing.id, currentStaffId)
            .then(() => manufacturingService.upsertOrder(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setOrders((prev) => prev.filter((o) => o.id !== existing.id));
          void manufacturingService.deleteOrder(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const updateOrderStatus = (id: string, status: ManufacturingOrder['status']) => {
    const existing = latestRef.current.orders.find((o) => o.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const next = withBranch({ ...existing, status });
    const nextSnap = cloneSnapshot(next);
    setOrders((prev) => prev.map((o) => (o.id === id ? next : o)));
    void manufacturingService.upsertOrder(next).catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'status',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: existing.orderNumber,
      summary: pickLocalizedText(language, {
        fr: `Statut OF ${existing.orderNumber} → ${status}`,
        en: `Order ${existing.orderNumber} → ${status}`,
        ar: `تحديث حالة التصنيع ${existing.orderNumber} → ${status}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setOrders((prev) => prev.map((o) => (o.id === prevCopy.id ? prevCopy : o)));
        void manufacturingService.upsertOrder(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setOrders((prev) => prev.map((o) => (o.id === nextCopy.id ? nextCopy : o)));
        void manufacturingService.upsertOrder(nextCopy).catch(() => {});
      },
    });
  };

  // BOM CRUD
  const addBom = (bom: ManufacturingBom) => {
    const scoped = withBranch(bom);
    const snap = cloneSnapshot(scoped);
    setBoms((prev) => [scoped, ...prev]);
    void manufacturingService.upsertBom(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.bomCode,
      summary: pickLocalizedText(language, {
        fr: `Nomenclature ${scoped.bomCode} créée`,
        en: `BOM ${scoped.bomCode} created`,
        ar: `تم إنشاء قائمة المواد ${scoped.bomCode}`,
      }),
      undo: () => {
        setBoms((prev) => prev.filter((b) => b.id !== snap.id));
        void manufacturingService.deleteBom(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setBoms((prev) => (prev.some((b) => b.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('mfg_bom_recipes', re.id, currentStaffId)
          .then(() => manufacturingService.upsertBom(re))
          .catch(() => {});
      },
    });
  };

  const forkBom = (sourceBom: ManufacturingBom, updates: Partial<ManufacturingBom>) => {
    const { archivedSource, nextBom } = forkBomNewVersion(sourceBom, updates);
    const scopedArchived = withBranch(archivedSource);
    const scopedNext = withBranch(nextBom);
    setBoms((prev) => [
      scopedNext,
      ...prev.map((b) => (b.id === scopedArchived.id ? scopedArchived : b)),
    ]);
    void manufacturingService.forkBomVersion(scopedArchived.id, scopedNext).catch(() => {});
    showToast({
      type: 'info',
      title: pickLocalizedText(language, {
        fr: `Nomenclature révisée (v${scopedNext.version})`,
        en: `BOM forked (v${scopedNext.version})`,
        ar: `تم إنشاء نسخة جديدة (${scopedNext.version})`,
      }),
      message: pickLocalizedText(language, {
        fr: `${scopedNext.bomCode} verrouillée sur OF actifs — nouvelle version v${scopedNext.version} créée.`,
        en: `${scopedNext.bomCode} locked by active orders — forked to v${scopedNext.version}.`,
        ar: `النسخة السابقة مقفلة بأوامر تصنيع نشطة — تم إنشاء النسخة v${scopedNext.version}.`,
      }),
    });
    return scopedNext;
  };

  const updateBom = (bom: ManufacturingBom) => {
    const existing = latestRef.current.boms.find((b) => b.id === bom.id);
    if (existing && isBomLockedByOrders(existing.id, latestRef.current.orders)) {
      return forkBom(existing, bom);
    }

    const scoped = withBranch(bom);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setBoms((prev) => prev.map((b) => (b.id === bom.id ? scoped : b)));
    void manufacturingService.upsertBom(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.bomCode,
        summary: pickLocalizedText(language, {
          fr: `Nomenclature ${nextSnap.bomCode} modifiée`,
          en: `BOM ${nextSnap.bomCode} updated`,
          ar: `تم تعديل قائمة المواد ${nextSnap.bomCode}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setBoms((prev) => prev.map((b) => (b.id === prevCopy.id ? prevCopy : b)));
          void manufacturingService.upsertBom(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setBoms((prev) => prev.map((b) => (b.id === nextCopy.id ? nextCopy : b)));
          void manufacturingService.upsertBom(nextCopy).catch(() => {});
        },
      });
    }
    return scoped;
  };

  const deleteBom = (id: string) => {
    const idx = latestRef.current.boms.findIndex((b) => b.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.boms[idx]) : null;
    setBoms((prev) => prev.filter((b) => b.id !== id));
    void manufacturingService.deleteBom(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'delete',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: existing.bomCode,
        summary: pickLocalizedText(language, {
          fr: `Nomenclature ${existing.bomCode} supprimée`,
          en: `BOM ${existing.bomCode} deleted`,
          ar: `تم حذف قائمة المواد ${existing.bomCode}`,
        }),
        undo: () => {
          restoreAt(setBoms, existing, idx);
          void syncCoordinator
            .restoreRow('mfg_bom_recipes', existing.id, currentStaffId)
            .then(() => manufacturingService.upsertBom(withBranch(cloneSnapshot(existing))))
            .catch(() => {});
        },
        redo: () => {
          setBoms((prev) => prev.filter((b) => b.id !== existing.id));
          void manufacturingService.deleteBom(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  // Raw Materials CRUD
  const addMaterial = (mat: RawMaterialStockItem) => {
    const scoped = withBranch(mat);
    const snap = cloneSnapshot(scoped);
    setMaterials((prev) => [scoped, ...prev]);
    void manufacturingService.upsertRawMaterial(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.name,
      summary: pickLocalizedText(language, {
        fr: `Matière première ${scoped.name} ajoutée`,
        en: `Raw material ${scoped.name} added`,
        ar: `تمت إضافة المادة الخام ${scoped.name}`,
      }),
      undo: () => {
        setMaterials((prev) => prev.filter((m) => m.id !== snap.id));
        void syncCoordinator.softDeleteRow('mfg_raw_materials', snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setMaterials((prev) => (prev.some((m) => m.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('mfg_raw_materials', re.id, currentStaffId)
          .then(() => manufacturingService.upsertRawMaterial(re))
          .catch(() => {});
      },
    });
  };

  const updateMaterial = (mat: RawMaterialStockItem) => {
    const scoped = withBranch(mat);
    const existing = latestRef.current.materials.find((m) => m.id === mat.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setMaterials((prev) => prev.map((m) => (m.id === mat.id ? scoped : m)));
    void manufacturingService.upsertRawMaterial(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.name,
        summary: pickLocalizedText(language, {
          fr: `Matière ${nextSnap.name} mise à jour`,
          en: `Raw material ${nextSnap.name} updated`,
          ar: `تم تحديث المادة الخام ${nextSnap.name}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setMaterials((prev) => prev.map((m) => (m.id === prevCopy.id ? prevCopy : m)));
          void manufacturingService.upsertRawMaterial(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setMaterials((prev) => prev.map((m) => (m.id === nextCopy.id ? nextCopy : m)));
          void manufacturingService.upsertRawMaterial(nextCopy).catch(() => {});
        },
      });
    }
  };

  // Transfer Vouchers CRUD
  const addVoucher = (voucher: MaterialTransferVoucher) => {
    const scoped = withBranch(voucher);
    const snap = cloneSnapshot(scoped);
    setVouchers((prev) => [scoped, ...prev]);
    void manufacturingService.processMaterialVoucher(scoped).catch(() => {});

    if (scoped.voucherType === 'BonDeReception') {
      for (const item of scoped.items || []) {
        const mat = latestRef.current.materials.find((m) => m.id === item.materialId);
        if (!mat) continue;
        const cmupCheck = computeLateReceiptCmupAdjustment({
          material: mat,
          incomingQty: item.quantity,
          incomingUnitCostDzd: item.unitCostDzd,
          vouchers: latestRef.current.vouchers,
          activeOrders: latestRef.current.orders,
        });
        if (cmupCheck.hasMaterialDeltaWarning) {
          const deltaMap = new Map(
            cmupCheck.affectedOrders.map((a) => [a.orderId, a.recalcDeltaCentimes])
          );
          setOrders((prev) =>
            prev.map((o) => {
              const delta = deltaMap.get(o.id);
              if (!delta) return o;
              const nextOrder = {
                ...o,
                cmupRecalcDeltaCentimes: (o.cmupRecalcDeltaCentimes || 0) + delta,
                updatedAt: new Date().toISOString(),
              };
              void manufacturingService.upsertOrder(nextOrder).catch(() => {});
              return nextOrder;
            })
          );
          showToast({
            type: 'warning',
            title: pickLocalizedText(language, {
              fr: `Recalcul CMUP tardif (${mat.name})`,
              en: `Late-Receipt CMUP Adjustment (${mat.name})`,
              ar: `إعادة حساب التكلفة المرجحة المتأخرة (${mat.name})`,
            }),
            message: pickLocalizedText(language, {
              fr: `${cmupCheck.affectedOrders.length} OF actif(s) impacté(s) par la variation de coût unitaire.`,
              en: `${cmupCheck.affectedOrders.length} active order(s) impacted by unit cost change.`,
              ar: `تأثرت ${cmupCheck.affectedOrders.length} أوامر تصنيع بتغير سعر الشراء.`,
            }),
          });
        }
      }
    }

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.voucherNumber,
      summary: pickLocalizedText(language, {
        fr: `Bon matière ${scoped.voucherNumber} enregistré`,
        en: `Material voucher ${scoped.voucherNumber} recorded`,
        ar: `تم تسجيل سند المواد ${scoped.voucherNumber}`,
      }),
      undo: () => {
        setVouchers((prev) => prev.filter((v) => v.id !== snap.id));
        void syncCoordinator.softDeleteRow('mfg_material_vouchers', snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setVouchers((prev) => (prev.some((v) => v.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('mfg_material_vouchers', re.id, currentStaffId)
          .then(() => manufacturingService.processMaterialVoucher(re))
          .catch(() => {});
      },
    });
  };

  // Quality Inspections CRUD
  const addQcRecord = (record: QualityInspectionRecord) => {
    const scoped = withBranch(record);
    const snap = cloneSnapshot(scoped);
    setQcRecords((prev) => [scoped, ...prev]);
    void manufacturingService.upsertQcInspection(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scoped.inspectionNumber,
      summary: pickLocalizedText(language, {
        fr: `Contrôle qualité ${scoped.inspectionNumber} ajouté`,
        en: `QC inspection ${scoped.inspectionNumber} added`,
        ar: `تمت إضافة فحص الجودة ${scoped.inspectionNumber}`,
      }),
      undo: () => {
        setQcRecords((prev) => prev.filter((q) => q.id !== snap.id));
        void syncCoordinator.softDeleteRow('mfg_qc_inspections', snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setQcRecords((prev) => (prev.some((q) => q.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('mfg_qc_inspections', re.id, currentStaffId)
          .then(() => manufacturingService.upsertQcInspection(re))
          .catch(() => {});
      },
    });
  };

  const updateQcRecord = (record: QualityInspectionRecord) => {
    const scoped = withBranch(record);
    const existing = latestRef.current.qcRecords.find((q) => q.id === record.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setQcRecords((prev) => prev.map((q) => (q.id === record.id ? scoped : q)));
    void manufacturingService.upsertQcInspection(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'manufacturing_production',
        operationType: 'edit',
        businessId: activeBusinessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.inspectionNumber,
        summary: pickLocalizedText(language, {
          fr: `Contrôle qualité ${nextSnap.inspectionNumber} modifié`,
          en: `QC inspection ${nextSnap.inspectionNumber} updated`,
          ar: `تم تعديل فحص الجودة ${nextSnap.inspectionNumber}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setQcRecords((prev) => prev.map((q) => (q.id === prevCopy.id ? prevCopy : q)));
          void manufacturingService.upsertQcInspection(withBranch(prevCopy)).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setQcRecords((prev) => prev.map((q) => (q.id === nextCopy.id ? nextCopy : q)));
          void manufacturingService.upsertQcInspection(nextCopy).catch(() => {});
        },
      });
    }
  };

  // Gate 1 Condition #2: Record Scrapped QC + MfgNcrRecord ONLY; hold all stock/WIP/CMUP valuation adjustments.
  const recordScrapWithNcr = (input: {
    orderId: string;
    orderNumber: string;
    batchLotNumber: string;
    productName: string;
    inspectorName: string;
    scrappedQuantity: number;
    reason: string;
    notes?: string;
  }) => {
    const seq = latestRef.current.ncrRecords.length + 1;
    const year = new Date().getFullYear();
    const { qcRecord, ncrRecord } = buildScrapNcrArtifacts({
      ncrId: `ncr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      qcId: `qc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ncrNumber: `NCR-${year}-${String(seq).padStart(4, '0')}`,
      inspectionNumber: `QC-REB-${year}-${String(seq).padStart(4, '0')}`,
      accountId: currentAccountId || (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: currentBusinessId || 'biz_manufacturing',
      branchId: activeBranchId,
      staffId: currentStaffId || '',
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      batchLotNumber: input.batchLotNumber,
      productName: input.productName,
      inspectorName: input.inspectorName,
      scrappedQuantity: input.scrappedQuantity,
      reason: input.reason,
      notes: input.notes,
      inspectionDate: new Date().toISOString().slice(0, 10),
    });

    const scopedQc = withBranch(qcRecord) as QualityInspectionRecord;
    const scopedNcr = withBranch(ncrRecord) as MfgNcrRecord;
    setQcRecords((prev) => [scopedQc, ...prev]);
    setNcrRecords((prev) => [scopedNcr, ...prev]);
    void manufacturingService
      .recordScrapWithNcr({ qcRecord: scopedQc, ncrRecord: scopedNcr })
      .catch(() => {});

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: scopedNcr.ncrNumber,
      summary: pickLocalizedText(language, {
        fr: `Rebut & NCR ${scopedNcr.ncrNumber} enregistrés (${scopedNcr.scrappedQuantity} U · CMUP en attente)`,
        en: `Scrap & NCR ${scopedNcr.ncrNumber} recorded (${scopedNcr.scrappedQuantity} U · CMUP held)`,
        ar: `تم تسجيل الإتلاف وتقرير ${scopedNcr.ncrNumber} (تعديل التكلفة معلق)`,
      }),
      undo: () => {
        setQcRecords((prev) => prev.filter((q) => q.id !== scopedQc.id));
        setNcrRecords((prev) => prev.filter((n) => n.id !== scopedNcr.id));
        void syncCoordinator.softDeleteRow('mfg_ncr_records', scopedNcr.id, currentStaffId).catch(() => {});
        void syncCoordinator.softDeleteRow('mfg_qc_inspections', scopedQc.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        setQcRecords((prev) => (prev.some((q) => q.id === scopedQc.id) ? prev : [scopedQc, ...prev]));
        setNcrRecords((prev) => (prev.some((n) => n.id === scopedNcr.id) ? prev : [scopedNcr, ...prev]));
        void manufacturingService
          .recordScrapWithNcr({ qcRecord: scopedQc, ncrRecord: scopedNcr })
          .catch(() => {});
      },
    });

    return { qcRecord: scopedQc, ncrRecord: scopedNcr };
  };

  // Workstation Session Logging + Runtime Hours + Piece-Rate Payroll Bridge
  const logWorkstationSession = (
    log: WorkstationSessionLog,
    ratePerPieceCentimes?: number
  ) => {
    const scopedLog = withBranch(log);
    setSessionLogs((prev) => [scopedLog, ...prev]);
    void manufacturingService.upsertSessionLog(scopedLog).catch(() => {});

    const targetMachine = latestRef.current.machines.find(
      (m) => m.id === scopedLog.workCenterId || m.name === scopedLog.workCenterName
    );
    if (targetMachine) {
      const updatedMachine = applySessionToMachineRuntime(
        targetMachine,
        scopedLog.durationSeconds,
        scopedLog.goodQuantity + scopedLog.scrapQuantity
      );
      setMachines((prev) => prev.map((m) => (m.id === updatedMachine.id ? updatedMachine : m)));
      void manufacturingService.upsertMachine(updatedMachine).catch(() => {});
    }

    const targetOrder = latestRef.current.orders.find(
      (o) => o.id === scopedLog.orderId || o.orderNumber === scopedLog.orderNumber
    );
    if (targetOrder) {
      const hourlyRateDzd = targetMachine?.hourlyCostDzd || 2800;
      const addedLaborCentimes = roundHalfAwayFromZero(
        dzdToCentimes(hourlyRateDzd) * (Math.max(0, scopedLog.durationSeconds) / 3600)
      );
      const nextProduced = (targetOrder.actualQuantityProduced || targetOrder.quantityProduced || 0) + scopedLog.goodQuantity;
      const nextScrap = (targetOrder.scrapQuantity || targetOrder.quantityScrapped || 0) + scopedLog.scrapQuantity;
      const nextStatus: ManufacturingOrder['status'] =
        nextProduced >= targetOrder.targetQuantity ? 'QC_Pending' : 'InProduction';
      const updatedOrder: ManufacturingOrder = {
        ...targetOrder,
        actualQuantityProduced: nextProduced,
        quantityProduced: nextProduced,
        scrapQuantity: nextScrap,
        quantityScrapped: nextScrap,
        actualLaborCostCentimes: (targetOrder.actualLaborCostCentimes || 0) + addedLaborCentimes,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      void manufacturingService.upsertOrder(updatedOrder).catch(() => {});
    }

    const effectiveRate = ratePerPieceCentimes ?? scopedLog.pieceRateCentimes ?? targetOrder?.unitPieceRateCentimes ?? 0;
    let pieceEntry: MfgPieceRateEntry | null = null;
    if (scopedLog.goodQuantity > 0 && effectiveRate > 0) {
      const grossCentimes = computePieceRateEarnings({
        goodUnits: scopedLog.goodQuantity,
        ratePerPieceCentimes: effectiveRate,
      });
      const periodMonth = (scopedLog.endTime || scopedLog.startTime || new Date().toISOString()).slice(0, 7);
      pieceEntry = withBranch<MfgPieceRateEntry>({
        id: `mpr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountId: scopedLog.accountId,
        businessId: scopedLog.businessId,
        branchId: scopedLog.branchId,
        staffId: scopedLog.operatorStaffId || scopedLog.staffId,
        operatorStaffId: scopedLog.operatorStaffId || scopedLog.staffId,
        operatorName: scopedLog.operatorName,
        workstationLogId: scopedLog.id,
        orderId: scopedLog.orderId,
        orderNumber: scopedLog.orderNumber,
        periodMonth,
        goodUnits: scopedLog.goodQuantity,
        scrapUnits: scopedLog.scrapQuantity,
        ratePerPieceCentimes: effectiveRate,
        grossAmountCentimes: grossCentimes,
        status: 'accrued',
        createdAt: new Date().toISOString(),
      });
      getAtriumActions().recordMfgPieceRateEntry(pieceEntry);
    }

    return { log: scopedLog, pieceEntry };
  };

  // Persistent Andon & Shopfloor Alerts (mfg_alerts)
  const triggerAndonAlert = (input: {
    alertType: MfgAlertRecord['alertType'];
    severity: MfgAlertRecord['severity'];
    workstationId?: string;
    workstationName?: string;
    orderId?: string;
    orderNumber?: string;
    raisedByName: string;
    raisedByStaffId?: string;
    message: string;
  }) => {
    const alertNumber = formatMfgSequentialCode(
      'ANDN',
      latestRef.current.alerts.map((a) => a.alertNumber)
    );
    const alert = withBranch<MfgAlertRecord>({
      id: `andn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: currentAccountId || '',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      staffId: currentStaffId || '',
      alertNumber,
      alertType: input.alertType,
      severity: input.severity,
      workstationId: input.workstationId,
      workstationName: input.workstationName,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      raisedByStaffId: input.raisedByStaffId || currentStaffId,
      raisedByName: input.raisedByName,
      notifiedRoles: ['gerant', 'chef_atelier'],
      message: input.message,
      status: 'Open',
      createdAt: new Date().toISOString(),
    });
    setAlerts((prev) => [alert, ...prev]);
    void manufacturingService.triggerAndonAlert(alert).catch(() => {});

    addNotification({
      title: `${alert.alertNumber} — ${input.workstationName || input.orderNumber || 'Atelier'}`,
      message: `${input.message} (Gérant & Chef Atelier notifiés)`,
      type: input.severity === 'critical' ? 'error' : 'warning',
      category: 'alert',
      targetScreen: 'mfg_workstation',
    });

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'create',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      entityLabel: alert.alertNumber,
      summary: pickLocalizedText(language, {
        fr: `Alerte Andon ${alert.alertNumber} déclenchée`,
        en: `Andon alert ${alert.alertNumber} triggered`,
        ar: `تم تفعيل تنبيه أندون ${alert.alertNumber}`,
      }),
      undo: () => {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        void syncCoordinator.softDeleteRow('mfg_alerts', alert.id, currentStaffId).catch(() => {});
      },
    });
    return alert;
  };

  const resolveAndonAlert = (
    alertId: string,
    action: 'acknowledge' | 'resolve',
    actorName: string,
    resolutionNotes?: string
  ) => {
    const nowIso = new Date().toISOString();
    const nextStatus: MfgAlertRecord['status'] = action === 'acknowledge' ? 'Acknowledged' : 'Resolved';
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: nextStatus,
              acknowledgedBy: a.acknowledgedBy || actorName,
              acknowledgedAt: a.acknowledgedAt || nowIso,
              resolvedBy: nextStatus === 'Resolved' ? actorName : a.resolvedBy,
              resolvedAt: nextStatus === 'Resolved' ? nowIso : a.resolvedAt,
              resolutionNotes: resolutionNotes || a.resolutionNotes,
              updatedAt: nowIso,
            }
          : a
      )
    );
    void manufacturingService
      .resolveAndonAlert({ alertId, action, actorName, resolutionNotes })
      .catch(() => {});
  };

  // Finished Goods Stock Lots & QC Release
  const produceFinishedGoodsFromOrder = (params: {
    order: ManufacturingOrder;
    qtyProduced?: number;
    warehouseLocation?: string;
    qcInspectionId?: string;
    releaseImmediately?: boolean;
    releasedBy?: string;
  }) => {
    const { order, warehouseLocation = 'Magasin PF - Travée A', qcInspectionId, releaseImmediately, releasedBy } = params;
    const qty = Math.max(1, params.qtyProduced ?? order.actualQuantityProduced ?? order.targetQuantity ?? 1);
    const totalCostCentimes = dzdToCentimes(order.totalCostDzd || 0);
    const unitCmupCentimes = roundHalfAwayFromZero(totalCostCentimes / qty);
    const lotNumber = formatMfgSequentialCode(
      'PFG',
      latestRef.current.finishedGoods.map((f) => f.lotNumber)
    );
    const lot = withBranch<MfgFinishedGoodsLot>({
      id: `pfg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: currentAccountId || '',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      staffId: currentStaffId || '',
      lotNumber,
      sku: order.bomCode ? `FIN-${order.bomCode.replace('BOM-', '')}` : `FIN-${order.orderNumber}`,
      productName: order.productName,
      orderId: order.id,
      orderNumber: order.orderNumber,
      qcInspectionId,
      qtyProduced: qty,
      qtyReserved: 0,
      qtyDelivered: 0,
      unit: 'Unité',
      unitCmupCentimes,
      warehouseLocation,
      releaseStatus: releaseImmediately ? 'Released' : 'Quarantine',
      producedAt: new Date().toISOString(),
      releasedAt: releaseImmediately ? new Date().toISOString() : undefined,
      releasedBy: releaseImmediately ? releasedBy || 'Responsable CQ' : undefined,
      createdAt: new Date().toISOString(),
    });
    setFinishedGoods((prev) => [lot, ...prev]);
    void manufacturingService.upsertFinishedGoodsLot(lot).catch(() => {});
    return lot;
  };

  const releaseFinishedGoodsLot = (params: {
    fgId: string;
    inspectorName: string;
    qcInspectionId?: string;
  }) => {
    const nowIso = new Date().toISOString();
    setFinishedGoods((prev) =>
      prev.map((lot) =>
        lot.id === params.fgId
          ? {
              ...lot,
              releaseStatus: 'Released',
              qcInspectionId: params.qcInspectionId || lot.qcInspectionId,
              releasedBy: params.inspectorName,
              releasedAt: nowIso,
              updatedAt: nowIso,
            }
          : lot
      )
    );
    void manufacturingService.releaseFinishedGoodsLot(params).catch(() => {});
  };

  // Machine & Preventive Maintenance Management
  const upsertMachine = (machine: MfgMachineAsset) => {
    const scoped = withBranch(machine);
    setMachines((prev) => {
      const exists = prev.some((m) => m.id === scoped.id);
      return exists ? prev.map((m) => (m.id === scoped.id ? scoped : m)) : [scoped, ...prev];
    });
    void manufacturingService.upsertMachine(scoped).catch(() => {});
    return scoped;
  };

  const scheduleMaintenanceTicket = (input: {
    machine: MfgMachineAsset;
    maintenanceType: MfgMachineMaintenanceLog['maintenanceType'];
    triggerReason: string;
    scheduledDate: string;
    technicianName?: string;
    costDzd?: number;
    checklistNotes?: string;
  }) => {
    const ticketNumber = formatMfgSequentialCode(
      'MNT',
      latestRef.current.maintenanceLogs.map((l) => l.ticketNumber)
    );
    const ticket = withBranch<MfgMachineMaintenanceLog>({
      id: `mnt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: currentAccountId || '',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      staffId: currentStaffId || '',
      ticketNumber,
      machineId: input.machine.id,
      machineName: input.machine.name,
      maintenanceType: input.maintenanceType,
      triggerReason: input.triggerReason,
      runtimeHoursAtService: input.machine.runningHours,
      cycleCountAtService: input.machine.cycleCount,
      scheduledDate: input.scheduledDate,
      technicianName: input.technicianName,
      costCentimes: dzdToCentimes(input.costDzd || 0),
      status: 'Scheduled',
      checklistNotes: input.checklistNotes,
      createdAt: new Date().toISOString(),
    });
    setMaintenanceLogs((prev) => [ticket, ...prev]);
    void manufacturingService.upsertMaintenanceLog(ticket).catch(() => {});
    return ticket;
  };

  const completeMaintenanceTicket = (params: {
    maintenanceId: string;
    technicianName: string;
    costCentimes?: number;
    notes?: string;
  }) => {
    const today = new Date().toISOString().split('T')[0];
    const ticket = latestRef.current.maintenanceLogs.find((l) => l.id === params.maintenanceId);
    setMaintenanceLogs((prev) =>
      prev.map((l) =>
        l.id === params.maintenanceId
          ? {
              ...l,
              status: 'Completed',
              completedDate: today,
              technicianName: params.technicianName || l.technicianName,
              costCentimes: params.costCentimes ?? l.costCentimes,
              checklistNotes: params.notes || l.checklistNotes,
              updatedAt: new Date().toISOString(),
            }
          : l
      )
    );
    if (ticket) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id !== ticket.machineId) return m;
          const nextDue = new Date();
          nextDue.setDate(nextDue.getDate() + Math.max(1, m.maintenanceIntervalDays || 90));
          return {
            ...m,
            lastMaintenanceDate: today,
            nextMaintenanceDueDate: nextDue.toISOString().split('T')[0],
            status: m.status === 'Maintenance' ? 'Idle' : m.status,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
    void manufacturingService.completeMachineMaintenance(params).catch(() => {});
  };

  // Cutting Plans (Textile / Wood / Aluminum / Marble)
  const saveCuttingPlan = (planInput: Omit<MfgCuttingPlan, 'id' | 'planNumber' | 'accountId' | 'businessId' | 'branchId' | 'staffId' | 'createdAt'> & { id?: string; planNumber?: string }) => {
    const planNumber =
      planInput.planNumber ||
      formatMfgSequentialCode(
        'CUT',
        latestRef.current.cuttingPlans.map((p) => p.planNumber)
      );
    const plan = withBranch<MfgCuttingPlan>({
      id: planInput.id || `cut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: currentAccountId || '',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      staffId: currentStaffId || '',
      planNumber,
      title: planInput.title,
      tradeCategory: planInput.tradeCategory,
      cuttingMode: planInput.cuttingMode,
      stockLengthMm: planInput.stockLengthMm,
      stockWidthMm: planInput.stockWidthMm,
      kerfMm: planInput.kerfMm,
      parts: planInput.parts,
      layoutResult: planInput.layoutResult,
      stockUnitsRequired: planInput.stockUnitsRequired,
      wastePercent: planInput.wastePercent,
      reusableOffcuts: planInput.reusableOffcuts,
      linkedQuoteId: planInput.linkedQuoteId,
      unitPriceCentimes: planInput.unitPriceCentimes,
      createdAt: new Date().toISOString(),
    });
    setCuttingPlans((prev) => {
      const exists = prev.some((p) => p.id === plan.id);
      return exists ? prev.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...prev];
    });
    void manufacturingService.upsertCuttingPlan(plan).catch(() => {});
    return plan;
  };

  const resetManufacturingDemoData = () => {
    const snap = cloneSnapshot(latestRef.current);
    setBoms((prev) => prev.filter((b) => !belongsToActiveBranch(b)));
    setOrders((prev) => prev.filter((o) => !belongsToActiveBranch(o)));
    setMaterials((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setVouchers((prev) => prev.filter((v) => !belongsToActiveBranch(v)));
    setQcRecords((prev) => prev.filter((q) => !belongsToActiveBranch(q)));
    setNcrRecords((prev) => prev.filter((n) => !belongsToActiveBranch(n)));
    setAlerts((prev) => prev.filter((a) => !belongsToActiveBranch(a)));
    setFinishedGoods((prev) => prev.filter((f) => !belongsToActiveBranch(f)));
    setMachines((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setMaintenanceLogs((prev) => prev.filter((l) => !belongsToActiveBranch(l)));
    setSessionLogs((prev) => prev.filter((s) => !belongsToActiveBranch(s)));
    setCuttingPlans((prev) => prev.filter((p) => !belongsToActiveBranch(p)));

    registerUndoEntry({
      vertical: 'manufacturing_production',
      operationType: 'bulk',
      businessId: activeBusinessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données usine réinitialisées',
        en: 'Manufacturing data reset',
        ar: 'تمت إعادة ضبط بيانات التصنيع',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setBoms(s.boms);
        setOrders(s.orders);
        setMaterials(s.materials);
        setVouchers(s.vouchers);
        setQcRecords(s.qcRecords);
        setNcrRecords(s.ncrRecords);
        setAlerts(s.alerts);
        setFinishedGoods(s.finishedGoods);
        setMachines(s.machines);
        setMaintenanceLogs(s.maintenanceLogs);
        setSessionLogs(s.sessionLogs);
        setCuttingPlans(s.cuttingPlans);
      },
    });
  };

  const scopedBoms = useMemo(() => boms.filter(belongsToActiveBranch), [boms, belongsToActiveBranch]);
  const scopedOrders = useMemo(() => orders.filter(belongsToActiveBranch), [orders, belongsToActiveBranch]);
  const scopedMaterials = useMemo(() => materials.filter(belongsToActiveBranch), [materials, belongsToActiveBranch]);
  const scopedVouchers = useMemo(() => vouchers.filter(belongsToActiveBranch), [vouchers, belongsToActiveBranch]);
  const scopedQcRecords = useMemo(() => qcRecords.filter(belongsToActiveBranch), [qcRecords, belongsToActiveBranch]);
  const scopedNcrRecords = useMemo(() => ncrRecords.filter(belongsToActiveBranch), [ncrRecords, belongsToActiveBranch]);
  const scopedAlerts = useMemo(() => alerts.filter(belongsToActiveBranch), [alerts, belongsToActiveBranch]);
  const scopedFinishedGoods = useMemo(() => finishedGoods.filter(belongsToActiveBranch), [finishedGoods, belongsToActiveBranch]);
  const scopedMachines = useMemo(() => machines.filter(belongsToActiveBranch), [machines, belongsToActiveBranch]);
  const scopedMaintenanceLogs = useMemo(() => maintenanceLogs.filter(belongsToActiveBranch), [maintenanceLogs, belongsToActiveBranch]);
  const scopedSessionLogs = useMemo(() => sessionLogs.filter(belongsToActiveBranch), [sessionLogs, belongsToActiveBranch]);
  const scopedCuttingPlans = useMemo(() => cuttingPlans.filter(belongsToActiveBranch), [cuttingPlans, belongsToActiveBranch]);

  return {
    boms: scopedBoms,
    orders: scopedOrders,
    materials: scopedMaterials,
    vouchers: scopedVouchers,
    qcRecords: scopedQcRecords,
    ncrRecords: scopedNcrRecords,
    alerts: scopedAlerts,
    finishedGoods: scopedFinishedGoods,
    machines: scopedMachines,
    maintenanceLogs: scopedMaintenanceLogs,
    sessionLogs: scopedSessionLogs,
    cuttingPlans: scopedCuttingPlans,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addBom,
    updateBom,
    forkBom,
    deleteBom,
    addMaterial,
    updateMaterial,
    addVoucher,
    addQcRecord,
    updateQcRecord,
    recordScrapWithNcr,
    logWorkstationSession,
    triggerAndonAlert,
    resolveAndonAlert,
    produceFinishedGoodsFromOrder,
    releaseFinishedGoodsLot,
    upsertMachine,
    scheduleMaintenanceTicket,
    completeMaintenanceTicket,
    saveCuttingPlan,
    resetManufacturingDemoData,
  };
};
