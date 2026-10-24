import React, { useState } from 'react';
import {
  Factory,
  Layers,
  Cog,
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingBom, ManufacturingOrder } from '../../../types/index';

export const ManufacturingView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'bom' | 'materials'>('dashboard');

  const [boms, setBoms] = useState<ManufacturingBom[]>([
    {
      id: 'bom_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
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
  ]);

  const [orders, setOrders] = useState<ManufacturingOrder[]>([
    {
      id: 'of_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: 'OF-2026-0038',
      bomId: 'bom_01',
      productName: 'Table Réunion Chêne Massif 3.2m',
      targetQuantity: 4,
      actualQuantityProduced: 4,
      batchLotNumber: 'LOT-2026-W19-01',
      startDate: '2026-05-12',
      dueDate: '2026-05-18',
      status: 'InProduction',
      totalMaterialCostDzd: 482400,
      totalLaborCostDzd: 90000,
      totalCostDzd: 572400,
      createdAt: '2026-05-12T08:00:00Z',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-800">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'التصنيع والإنتاج وورشات التركيب' : 'Manufacture & Production Industrielle'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                FacilityType: 21
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Ordres de fabrication (OF), nomenclatures BOM, postes de travail et calcul du coût de revient
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Assistant de création d\'Ordre de Fabrication (OF) ouvert', 'success')}
          className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Nouvel Ordre de Fabrication (OF)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'}`}
        >
          <Factory size={15} />
          <span>Tableau Usine</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'orders' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'}`}
        >
          <Cog size={15} />
          <span>Ordres de Fabrication ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'bom' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'}`}
        >
          <Layers size={15} />
          <span>Nomenclatures BOM ({boms.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">OF en Cours d'Usinage</div>
            <div className="text-2xl font-bold font-mono mt-1 text-orange-600">
              {orders.filter((o) => o.status === 'InProduction').length}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Nomenclatures Actives</div>
            <div className="text-2xl font-bold font-mono mt-1">{boms.length}</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Valorisation WIP en Atelier</div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {formatMoney(
                orders.reduce((acc, o) => acc + o.totalCostDzd, 0),
                'DZD'
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold">Ordres de Fabrication Actifs (OF)</h3>
          {orders.map((o) => (
            <div key={o.id} className="py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="text-xs font-bold">{o.orderNumber} — {o.productName} ({o.targetQuantity} unités)</div>
                <div className="text-[11px] text-neutral-500 font-mono">Lot: {o.batchLotNumber} · Échéance: {o.dueDate}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                  {o.status}
                </span>
                <span className="font-mono font-bold text-xs">{formatMoney(o.totalCostDzd, 'DZD')}</span>
                <button
                  onClick={() => showToast('Bon d\'entrée produit fini généré', 'success')}
                  className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs font-medium"
                >
                  Clôturer OF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
