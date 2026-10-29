import { useState, useEffect } from 'react';
import {
  ManufacturingBom,
  ManufacturingOrder,
  RawMaterialStockItem,
  MaterialTransferVoucher,
  QualityInspectionRecord,
} from '../../../types';

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

  const [materials, setMaterials] = useState<RawMaterialStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_raw_materials_v2');
      return saved ? JSON.parse(saved) : INITIAL_RAW_MATERIALS;
    } catch {
      return INITIAL_RAW_MATERIALS;
    }
  });

  const [vouchers, setVouchers] = useState<MaterialTransferVoucher[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_vouchers');
      return saved ? JSON.parse(saved) : INITIAL_VOUCHERS;
    } catch {
      return INITIAL_VOUCHERS;
    }
  });

  const [qcRecords, setQcRecords] = useState<QualityInspectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_qc_records');
      return saved ? JSON.parse(saved) : INITIAL_QC_RECORDS;
    } catch {
      return INITIAL_QC_RECORDS;
    }
  });

  // LocalStorage synchronizers
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

  useEffect(() => {
    try {
      localStorage.setItem('atrium_mfg_raw_materials_v2', JSON.stringify(materials));
    } catch {}
  }, [materials]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_mfg_vouchers', JSON.stringify(vouchers));
    } catch {}
  }, [vouchers]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_mfg_qc_records', JSON.stringify(qcRecords));
    } catch {}
  }, [qcRecords]);

  // Order CRUD
  const addOrder = (order: ManufacturingOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  const updateOrder = (order: ManufacturingOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOrderStatus = (id: string, status: ManufacturingOrder['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  // BOM CRUD
  const addBom = (bom: ManufacturingBom) => {
    setBoms((prev) => [bom, ...prev]);
  };

  const updateBom = (bom: ManufacturingBom) => {
    setBoms((prev) => prev.map((b) => (b.id === bom.id ? bom : b)));
  };

  const deleteBom = (id: string) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
  };

  // Raw Materials CRUD
  const addMaterial = (mat: RawMaterialStockItem) => {
    setMaterials((prev) => [mat, ...prev]);
  };

  const updateMaterial = (mat: RawMaterialStockItem) => {
    setMaterials((prev) => prev.map((m) => (m.id === mat.id ? mat : m)));
  };

  // Transfer Vouchers CRUD
  const addVoucher = (voucher: MaterialTransferVoucher) => {
    setVouchers((prev) => [voucher, ...prev]);
  };

  // Quality Inspections CRUD
  const addQcRecord = (record: QualityInspectionRecord) => {
    setQcRecords((prev) => [record, ...prev]);
  };

  const updateQcRecord = (record: QualityInspectionRecord) => {
    setQcRecords((prev) => prev.map((q) => (q.id === record.id ? record : q)));
  };

  return {
    boms,
    orders,
    materials,
    vouchers,
    qcRecords,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addBom,
    updateBom,
    deleteBom,
    addMaterial,
    updateMaterial,
    addVoucher,
    addQcRecord,
    updateQcRecord,
  };
};
