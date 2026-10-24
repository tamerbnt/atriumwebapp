import React, { useState, useEffect } from 'react';
import {
  Factory,
  Layers,
  Cog,
  Boxes,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Play,
  RotateCcw,
  Check,
  TrendingUp,
  FileText,
  Percent,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingBom, ManufacturingOrder } from '../../../types/index';

interface ManufacturingViewProps {
  initialTab?: 'dashboard' | 'orders' | 'bom' | 'materials' | 'qc';
}

export const ManufacturingView: React.FC<ManufacturingViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'bom' | 'materials' | 'qc'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderForQc, setSelectedOrderForQc] = useState<ManufacturingOrder | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<ManufacturingOrder | null>(null);

  // Mock State
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
    {
      id: 'bom_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
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
    {
      id: 'of_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: 'OF-2026-0039',
      bomId: 'bom_02',
      productName: 'Chaise Ergonomique Coque Polypropylène',
      targetQuantity: 50,
      actualQuantityProduced: 50,
      batchLotNumber: 'LOT-2026-W19-02',
      startDate: '2026-05-14',
      dueDate: '2026-05-19',
      status: 'QC',
      totalMaterialCostDzd: 243500,
      totalLaborCostDzd: 45000,
      totalCostDzd: 288500,
      createdAt: '2026-05-14T08:00:00Z',
    },
  ]);

  // Form states for BOM Modal
  const [bomName, setBomName] = useState('');
  const [bomCode, setBomCode] = useState('');
  const [bomYield, setBomYield] = useState('1');
  const [bomHours, setBomHours] = useState('10');
  const [bomRawMaterial, setBomRawMaterial] = useState('');
  const [bomRawQty, setBomRawQty] = useState('1');
  const [bomRawCost, setBomRawCost] = useState('5000');

  // Form states for OF Modal
  const [ofBomId, setOfBomId] = useState(boms[0]?.id || '');
  const [ofQty, setOfQty] = useState('5');
  const [ofStartDate, setOfStartDate] = useState('2026-06-01');
  const [ofDueDate, setOfDueDate] = useState('2026-06-08');

  // QC Form States
  const [qcGoodQty, setQcGoodQty] = useState('48');
  const [qcScrapQty, setQcScrapQty] = useState('2');
  const [qcInspector, setQcInspector] = useState('Ing. Mustapha Belhadj');
  const [qcNotes, setQcNotes] = useState('Tolérances dimensionnelles et résistance conformes à la norme.');

  const handleCreateBom = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(bomRawQty) || 1;
    const unitCost = parseFloat(bomRawCost) || 1000;
    const estCost = qty * unitCost;

    const createdBom: ManufacturingBom = {
      id: `bom_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      finishedProductId: `prod_${Date.now()}`,
      finishedProductName: bomName,
      bomCode: bomCode || `BOM-${Date.now().toString().slice(-4)}`,
      batchYield: parseInt(bomYield, 10) || 1,
      unit: 'Unité',
      standardLaborHours: parseFloat(bomHours) || 8,
      components: [
        {
          rawProductId: `raw_${Date.now()}`,
          rawProductName: bomRawMaterial || 'Composant Principal',
          quantity: qty,
          unit: 'Unité',
          unitCostDzd: unitCost,
        },
      ],
      estimatedCostDzd: estCost,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setBoms([createdBom, ...boms]);
    setIsBomModalOpen(false);
    setBomName('');
    showToast({
      type: 'success',
      title: isAr ? 'تم حفظ قائمة المكونات' : 'Nomenclature BOM Enregistrée',
      message: `${createdBom.finishedProductName} (${createdBom.bomCode}) ajoutée.`,
    });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBom = boms.find((b) => b.id === ofBomId) || boms[0];
    const qty = parseInt(ofQty, 10) || 1;
    const matCost = selectedBom.estimatedCostDzd * qty;
    const laborCost = selectedBom.standardLaborHours * qty * 1500; // 1500 DZD/h

    const createdOrder: ManufacturingOrder = {
      id: `of_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: `OF-2026-${String(orders.length + 40).padStart(4, '0')}`,
      bomId: selectedBom.id,
      productName: selectedBom.finishedProductName,
      targetQuantity: qty,
      actualQuantityProduced: 0,
      batchLotNumber: `LOT-2026-W22-${String(orders.length + 1).padStart(2, '0')}`,
      startDate: ofStartDate,
      dueDate: ofDueDate,
      status: 'Scheduled',
      totalMaterialCostDzd: matCost,
      totalLaborCostDzd: laborCost,
      totalCostDzd: matCost + laborCost,
      createdAt: new Date().toISOString(),
    };

    setOrders([createdOrder, ...orders]);
    setIsOrderModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم إطلاق أمر التصنيع' : 'Ordre de Fabrication (OF) Lancé',
      message: `${createdOrder.orderNumber} - ${createdOrder.productName} planifié.`,
    });
  };

  const handleAdvanceOrderStatus = (orderId: string) => {
    setOrders(
      orders.map((o) => {
        if (o.id !== orderId) return o;
        const nextStatus: Record<string, ManufacturingOrder['status']> = {
          Scheduled: 'MaterialsIssued',
          MaterialsIssued: 'InProduction',
          InProduction: 'QC',
          QC: 'Completed',
        };
        const updated = nextStatus[o.status] || o.status;
        return { ...o, status: updated };
      })
    );
    showToast({
      type: 'info',
      title: 'Poste de Travail Validé',
      message: 'Progression de fabrication mise à jour.',
    });
  };

  const handleCompleteQc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForQc) return;

    setOrders(
      orders.map((o) =>
        o.id === selectedOrderForQc.id
          ? {
              ...o,
              status: 'Completed',
              actualQuantityProduced: parseInt(qcGoodQty, 10) || o.targetQuantity,
            }
          : o
      )
    );

    setSelectedOrderForQc(null);
    showToast({
      type: 'success',
      title: isAr ? 'تمت مراقبة الجودة واستلام المنتجات' : 'Lot Conforme & Entrée en Stock',
      message: `${qcGoodQty} unités réceptionnées au dépôt de produits finis.`,
    });
  };

  // Metrics
  const activeOrdersCount = orders.filter((o) => o.status === 'InProduction' || o.status === 'QC').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'Completed').length;
  const totalValuationWipDzd = orders
    .filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled')
    .reduce((acc, o) => acc + o.totalCostDzd, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-800">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isAr ? 'التصنيع والإنتاج وورشات التركيب' : 'Manufacture & Production Industrielle'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                FacilityType: 21
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'أوامر التصنيع (OF)، قوائم المكونات BOM، مسارات الورشة، مراقبة الجودة وحساب التكلفة الحقيقية'
                : 'Ordres de fabrication (OF), nomenclatures BOM, postes de travail et calcul du coût de revient'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBomModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Layers size={15} />
            <span>{isAr ? 'قائمة مكونات جديدة' : '+ Nouvelle BOM'}</span>
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'أمر تصنيع جديد' : '+ Nouvel Ordre (OF)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Factory size={15} />
          <span>{isAr ? 'لوحة الورشة' : 'Tableau Usine'}</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'orders' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Cog size={15} />
          <span>{isAr ? `أوامر التصنيع (${orders.length})` : `Ordres de Fabrication (${orders.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'bom' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Layers size={15} />
          <span>{isAr ? `قوائم المكونات (${boms.length})` : `Nomenclatures BOM (${boms.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'materials' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Boxes size={15} />
          <span>{isAr ? 'المواد الأولية والمخرجات' : 'Sorties Matières'}</span>
        </button>
        <button
          onClick={() => setActiveTab('qc')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'qc' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <ShieldCheck size={15} />
          <span>{isAr ? 'مراقبة الجودة والتكاليف' : 'Qualité & Coûts'}</span>
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'أوامر التصنيع قيد التنفيذ' : 'Ordres en Cours (WIP)'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-orange-600">{activeOrdersCount}</div>
                <div className="text-[11px] text-neutral-400 mt-1">Sur postes atelier</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'قيمة الإنتاج الجاري' : 'Valeur En-Cours (DZD)'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-blue-600">
                  {formatMoney(totalValuationWipDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Matières + Main d'œuvre</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'أوامر مكتملة ومخزنة' : 'Ordres Livrés au Stock'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">{completedOrdersCount}</div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">Contrôle qualité 100%</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'نصيب الفاقد الصناعي' : 'Taux de Rebut / Scrap'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-amber-600">1.8%</div>
                <div className="text-[11px] text-neutral-400 mt-1">Conforme au standard (&lt;3%)</div>
              </div>
            </div>

            {/* Shop Floor Progress Section */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Cog size={16} className="text-orange-600" />
                  <span>{isAr ? 'متابعة مسارات الورشة وأوامر التصنيع' : 'Postes de Travail & Gammes en Cours'}</span>
                </h3>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                          {o.orderNumber}
                        </span>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">{o.productName}</span>
                        <span className="text-xs text-neutral-500 font-mono">({o.batchLotNumber})</span>
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-3">
                        <span>Quantité: <strong>{o.targetQuantity} unités</strong></span>
                        <span>·</span>
                        <span>Échéance: {o.dueDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Workstation Badge */}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {o.status === 'Scheduled' && '📅 Planifié (En attente)'}
                        {o.status === 'MaterialsIssued' && '📦 Matières Sorties'}
                        {o.status === 'InProduction' && '⚙️ En Usinage / Assemblage'}
                        {o.status === 'QC' && '🔬 Contrôle Qualité (Laboratoire)'}
                        {o.status === 'Completed' && '✅ Terminé & Stocké'}
                      </span>

                      {o.status !== 'Completed' && o.status !== 'QC' && (
                        <button
                          onClick={() => handleAdvanceOrderStatus(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 text-orange-700 dark:text-orange-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRight size={13} />
                          <span>Avancer Étape</span>
                        </button>
                      )}

                      {o.status === 'QC' && (
                        <button
                          onClick={() => setSelectedOrderForQc(o)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <ShieldCheck size={13} />
                          <span>Valider QC & Entrée Stock</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrderForPrint(o)}
                        className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>Fiche OF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCTION ORDERS (OF)                                             */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((o) => (
                <div key={o.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                      {o.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Lot: {o.batchLotNumber}</span>
                  </div>

                  <div className="text-sm font-bold text-neutral-900 dark:text-white">{o.productName}</div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono text-center text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400">Quantité Cible</div>
                      <div className="font-bold text-orange-600 mt-0.5">{o.targetQuantity}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Coût Matières</div>
                      <div className="font-bold mt-0.5">{formatMoney(o.totalMaterialCostDzd, 'DZD')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Coût Total OF</div>
                      <div className="font-bold text-emerald-600 mt-0.5">{formatMoney(o.totalCostDzd, 'DZD')}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Période: {o.startDate} au {o.dueDate}</span>
                    <button
                      onClick={() => setSelectedOrderForPrint(o)}
                      className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Imprimer Bon OF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BILL OF MATERIALS (BOM)                                            */}
        {/* ========================================================================= */}
        {activeTab === 'bom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boms.map((b) => (
                <div key={b.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      {b.bomCode}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">
                      Coût Standard: {formatMoney(b.estimatedCostDzd, 'DZD')}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-neutral-900 dark:text-white">{b.finishedProductName}</div>
                  <div className="text-xs text-neutral-500">
                    Rendement lot: <strong>{b.batchYield} {b.unit}</strong> · Main d'œuvre: {b.standardLaborHours}h
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Composants & Matières</div>
                    {b.components.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800 font-mono">
                        <span className="text-neutral-700 dark:text-neutral-300 font-sans">{comp.rawProductName}</span>
                        <span>
                          {comp.quantity} {comp.unit} × {formatMoney(comp.unitCostDzd, 'DZD')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MATERIALS ISSUE                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'materials' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Boxes size={16} className="text-orange-600" />
              <span>Bons de Sortie Matières Premières & Traçabilité</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Déstockage automatique des composants au coût unitaire moyen pondéré (PAMP) dès le lancement en fabrication.
            </p>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold">BSM-2026-0089 — Bois Chêne Brut Séché 50mm</div>
                  <div className="text-neutral-500">Pour Ordre: OF-2026-0038 · Quantité: 1.8 m³</div>
                </div>
                <div className="font-mono font-bold text-orange-600">324,000 DZD</div>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold">BSM-2026-0090 — Piètement Acier Poudré Noir</div>
                  <div className="text-neutral-500">Pour Ordre: OF-2026-0038 · Quantité: 8 pièces</div>
                </div>
                <div className="font-mono font-bold text-orange-600">120,000 DZD</div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: QC & COSTING                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'qc' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Rapports de Contrôle Qualité & Entrées Produits Finis</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Chaque lot fait l'objet d'un essai de charge, contrôle dimensionnel et émission d'un Bon d'Entrée Produit Fini certifié.
              </p>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold">Lot LOT-2026-W19-02 — Chaises Ergonomiques (50 unités)</div>
                    <div className="text-emerald-600 font-semibold">Inspecteur: Ing. Mustapha Belhadj · Statut: Conforme</div>
                  </div>
                  <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    REÇU EN STOCK
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOUVELLE BOM                                                     */}
      {/* ========================================================================= */}
      {isBomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-orange-600" />
                <span>Nouvelle Nomenclature / Recette (BOM)</span>
              </h2>
              <button onClick={() => setIsBomModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateBom} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Désignation Produit Fini *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Armoire Métallique 2 Portes"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Code BOM</label>
                  <input
                    type="text"
                    placeholder="BOM-ARM-01"
                    value={bomCode}
                    onChange={(e) => setBomCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Heures Main d'Œuvre / Lot</label>
                  <input
                    type="number"
                    value={bomHours}
                    onChange={(e) => setBomHours(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 space-y-2">
                <div className="font-semibold text-neutral-900 dark:text-white">Composant / Ingrédient Principal</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Matière (Tôle d'acier 15/10ème)"
                      value={bomRawMaterial}
                      onChange={(e) => setBomRawMaterial(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Coût unitaire"
                      value={bomRawCost}
                      onChange={(e) => setBomRawCost(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsBomModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-orange-600 text-white rounded font-medium">
                  Enregistrer la BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOUVEL ORDRE DE FABRICATION (OF)                                 */}
      {/* ========================================================================= */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Cog size={18} className="text-orange-600" />
                <span>Lancer un Ordre de Fabrication (OF)</span>
              </h2>
              <button onClick={() => setIsOrderModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Sélectionner la Nomenclature (BOM) *</label>
                <select
                  value={ofBomId}
                  onChange={(e) => setOfBomId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bomCode} — {b.finishedProductName} ({formatMoney(b.estimatedCostDzd, 'DZD')}/unité)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Quantité Cible *</label>
                  <input
                    required
                    type="number"
                    value={ofQty}
                    onChange={(e) => setOfQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date Lancement</label>
                  <input
                    type="date"
                    value={ofStartDate}
                    onChange={(e) => setOfStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Échéance Fin</label>
                  <input
                    type="date"
                    value={ofDueDate}
                    onChange={(e) => setOfDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 text-[11px] leading-relaxed">
                Le lancement générera automatiquement le Bon de Sortie Matières (BSM) correspondant et réservera les heures machines sur les postes de travail.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-orange-600 text-white rounded font-medium">
                  Lancer la Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QC & RECEPTION                                                   */}
      {/* ========================================================================= */}
      {selectedOrderForQc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Validation Contrôle Qualité & Entrée Stock</span>
              </h2>
              <button onClick={() => setSelectedOrderForQc(null)}>✕</button>
            </div>

            <form onSubmit={handleCompleteQc} className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono">
                <div>Ordre: <strong>{selectedOrderForQc.orderNumber}</strong></div>
                <div>Produit: <strong>{selectedOrderForQc.productName}</strong></div>
                <div>Lot: <strong>{selectedOrderForQc.batchLotNumber}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Unités Conformes Reçues *</label>
                  <input
                    required
                    type="number"
                    value={qcGoodQty}
                    onChange={(e) => setQcGoodQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Unités Rebutées (Scrap)</label>
                  <input
                    type="number"
                    value={qcScrapQty}
                    onChange={(e) => setQcScrapQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono text-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Inspecteur Qualité</label>
                <input
                  type="text"
                  value={qcInspector}
                  onChange={(e) => setQcInspector(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Observations Laboratoire</label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setSelectedOrderForQc(null)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium">
                  Valider Bon d'Entrée Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINTABLE FICHE OF                                               */}
      {/* ========================================================================= */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-neutral-200 space-y-6 text-xs">
            <div className="border-b-2 border-neutral-900 pb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-black tracking-wider uppercase">
                  {currentBusiness?.name || 'ATRIUM MANUFACTURE INDUSTRIELLE'}
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Fiche de Suivi de Fabrication & Ordre de Travail Atelier
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-orange-600">
                  {selectedOrderForPrint.orderNumber}
                </div>
                <div className="text-[10px] text-neutral-400">Lot: {selectedOrderForPrint.batchLotNumber}</div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
              <div className="text-sm font-bold">{selectedOrderForPrint.productName}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Quantité demandée: <strong>{selectedOrderForPrint.targetQuantity} unités</strong></div>
                <div>Délai impératif: <strong>{selectedOrderForPrint.dueDate}</strong></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold uppercase tracking-wider text-[11px]">Visa des Postes de Travail</div>
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 text-[11px]">
                <div className="p-2.5 flex justify-between">
                  <span>Poste 1: Découpe / Usinage brut</span>
                  <span className="font-mono text-neutral-400">[ Visa Opérateur: _______ ]</span>
                </div>
                <div className="p-2.5 flex justify-between">
                  <span>Poste 2: Assemblage mécanique & soudure</span>
                  <span className="font-mono text-neutral-400">[ Visa Opérateur: _______ ]</span>
                </div>
                <div className="p-2.5 flex justify-between">
                  <span>Poste 3: Finition, ponçage & traitement surface</span>
                  <span className="font-mono text-neutral-400">[ Visa Opérateur: _______ ]</span>
                </div>
                <div className="p-2.5 flex justify-between">
                  <span>Poste 4: Contrôle qualité & mise en carton</span>
                  <span className="font-mono text-neutral-400">[ Visa Contrôleur: _______ ]</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button onClick={() => setSelectedOrderForPrint(null)} className="px-4 py-2 border rounded-lg font-medium">
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast({
                    type: 'success',
                    title: 'Fiche OF Imprimée',
                    message: 'Bon de fabrication prêt pour le chef d\'atelier.',
                  });
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Imprimer la Fiche</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
