import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Percent,
  Printer,
  Award,
  Package,
  Wrench,
  DollarSign,
  Eye,
  Check,
  X,
  Share2,
  Clock,
  Layers,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrder } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const ManufacturingQcView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { orders, updateOrder } = useManufacturingData();

  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'cq' | 'metrologie' | 'couts'>('cq');

  const handleReleaseLot = (order: ManufacturingOrder) => {
    const updated: ManufacturingOrder = {
      ...order,
      status: 'Completed',
    };
    if (updateOrder) {
      updateOrder(updated);
    }
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated);
    }
    showToast(
      isAr
        ? `تم اعتماد وتحرير الدفعة ${order.orderNumber} كدفعة مطابقة للمواصفات ISO 9001`
        : `Lot ${order.orderNumber} libéré et certifié conforme ISO 9001`,
      'success'
    );
  };

  const getQcActions = (order: ManufacturingOrder): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الفحص' : 'Consulter CQ',
      icon: <Eye size={14} />,
      onClick: () => setSelectedOrder(order),
    },
    {
      label: isAr ? 'تحرير الدفعة' : 'Libérer Lot',
      icon: <Check size={14} />,
      onClick: () => handleReleaseLot(order),
    },
    {
      label: isAr ? 'شهادة المطابقة' : 'Certificat ISO',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `جاري طباعة شهادة المطابقة للدفعة ${order.orderNumber}...`
            : `Certificat de conformité émis pour ${order.orderNumber}`,
          'success'
        );
      },
    },
    {
      label: isAr ? 'تسجيل تالف' : 'Signaler Rebut',
      icon: <AlertCircle size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `تم تسجيل تقرير عدم مطابقة للدفعة ${order.orderNumber}`
            : `Fiche de non-conformité ouverte pour le lot ${order.orderNumber}`,
          'info'
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'مراقبة الجودة والتكاليف الصناعية' : 'Contrôle Qualité & Coûts de Revient'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Norme ISO 9001
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'فحص المطابقة، رصد نسبة التالف (Scrap Rate)، وإصدار شهادات المطابقة'
                : 'Conformité dimensionnelle, taux de rebut atelier & validation fin de chaîne'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(isAr ? 'طباعة تقرير مراقبة الجودة' : 'Impression du rapport qualité', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'تقرير الجودة' : 'Rapport Qualité'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات المطابقة ونسب الفاقد' : 'Indicateurs de Conformité & Maîtrise des Rebuts'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة الجودة عند نهاية الخط، التالف المعياري والامتثال لدفتر الشروط' : 'Contrôles dimensionnels libératoires et pourcentage de scrap maîtrisé'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Taux de Conformité */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'معدل المطابقة للمواصفات' : 'Taux de Conformité Moyen'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                98.8%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'مطابق لشهادة الجودة ISO 9001' : 'Conforme aux tolérances ISO'}
              </p>
            </div>
          </div>

          {/* Card 2: Taux de Rebut (Scrap) */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'نسبة الفاقد / التالف (Scrap)' : 'Taux de Rebut (Scrap)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                1.2%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'ضمن الحدود الآمنة المقبولة' : 'Inférieur au seuil max (2%)'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'شهادات الإفراج عن الدفعات' : 'Libération des Lots'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Contrôle 100%
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {orders.length} {isAr ? 'دفعة مفحوصة ومطابقة' : 'lots inspectés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'سجل الفحص المخبري ومراقبة الجودة (QC / ISO)' : 'Registre des Contrôles Qualité Libératoires (AQL)'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'فحص المقاسات المترولوجية، اختبارات التحمل، وتصاريح إطلاق الدفعات' : 'Inspection dimensionnelle, tests destructifs, conformité ISO 9001 et libération'}
            </p>
          </div>

          {/* Authentic Manufacturing QC Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع الدفعات' : 'Tous les lots' },
              { id: 'libere', label: isAr ? 'دفعات مطابقة' : 'Lots libérés' },
              { id: 'quarantaine', label: isAr ? 'في الحجر' : 'En quarantaine' },
            ].map((tab, idx) => (
              <button
                key={tab.id}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === 0 ? '#FCEEE8' : 'transparent',
                  color: idx === 0 ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Collection Area + 390px Inspector Drawer */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<ManufacturingOrder>
            title={isAr ? 'سجل الفحص والاختبارات' : 'Registre des Contrôles Qualité Libératoires'}
            subtitle={isAr ? 'تتبع الدفعات والمطابقة للمواصفات' : 'Inspection dimensionnelle, tests de résistance et libération'}
            items={orders}
            keyExtractor={(o) => o.id}
            searchPlaceholder={isAr ? 'بحث بالمنتج أو رقم الدفعة...' : 'Rechercher OF, article, lot, conformité...'}
            searchFilter={(o, query) =>
              o.productName.toLowerCase().includes(query.toLowerCase()) ||
              o.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
              (o.batchLotNumber || '').toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(o) => setSelectedOrder(o)}
            customActions={(o) => getQcActions(o)}
            columns={[
              {
                id: 'orderNumber',
                header: isAr ? 'رقم OF' : 'N° OF',
                width: '130px',
                sortable: true,
                renderCell: (o) => (
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded border border-[#C4785A]/20">
                    {o.orderNumber}
                  </span>
                ),
              },
              {
                id: 'product',
                header: isAr ? 'المنتج & الدفعة' : 'Article Fabriqué & Lot',
                renderCell: (o) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {o.productName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Lot: {o.batchLotNumber || 'LOT-2026-STD'}
                    </span>
                  </div>
                ),
              },
              {
                id: 'qty',
                header: isAr ? 'الكمية' : 'Quantité',
                width: '120px',
                sortable: true,
                renderCell: (o) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {o.actualQuantityProduced || o.targetQuantity} pcs
                  </span>
                ),
              },
              {
                id: 'conformity',
                header: isAr ? 'المطابقة' : 'Conformité',
                width: '120px',
                renderCell: () => (
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    98.8%
                  </span>
                ),
              },
              {
                id: 'unitCost',
                header: isAr ? 'تكلفة الوحدة' : 'Coût Unitaire',
                width: '140px',
                sortable: true,
                renderCell: (o) => {
                  const qty = o.actualQuantityProduced || o.targetQuantity || 1;
                  const unitCost = Math.round(o.totalCostDzd / qty);
                  return (
                    <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {formatMoney(unitCost, language)}
                    </span>
                  );
                },
              },
              {
                id: 'status',
                header: isAr ? 'قرار CQ' : 'Décision CQ',
                width: '140px',
                renderCell: (o) => (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {o.status === 'Completed' ? (isAr ? 'مقبول ومعتمد' : 'Libéré Conforme') : (isAr ? 'قيد الفحص' : 'En Contrôle')}
                  </span>
                ),
              },
            ]}
            renderCard={(o) => {
              const qty = o.actualQuantityProduced || o.targetQuantity || 1;
              const unitCost = Math.round(o.totalCostDzd / qty);
              return (
                <div className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                      {o.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      98.8% Conforme
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                      {o.productName}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      Lot: {o.batchLotNumber || 'LOT-2026-STD'} · {qty} pcs
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Coût Unitaire</span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {formatMoney(unitCost, language)}
                      </span>
                    </div>
                    <span className="text-emerald-600 font-bold text-xs">
                      Libéré ✓
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedOrder && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <Award size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    Lot: {selectedOrder.batchLotNumber || 'LOT-2026-05'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('cq')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'cq'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'فحص الجودة' : 'Contrôle CQ'}
              </button>
              <button
                onClick={() => setInspectorTab('metrologie')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'metrologie'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'القياس والتفاوت' : 'Métrologie'}
              </button>
              <button
                onClick={() => setInspectorTab('couts')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'couts'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'التكلفة والتالف' : 'Coûts & Scrap'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'cq' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Statut Libération du Lot</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ISO 9001
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      98.8% Conforme
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Échantillonnage AQL 1.5 validé par le laboratoire de métrologie interne.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Spécifications de Fabrication
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Désignation:</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{selectedOrder.productName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Taille du Lot:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {selectedOrder.actualQuantityProduced || selectedOrder.targetQuantity} unités
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Inspecteur Responsable:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">Ing. Sami Mansour (CQ)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Libération du Lot</span>
                      <span className="text-[10px] text-neutral-500">Autoriser l'expédition vers stock fini</span>
                    </div>
                    <button
                      onClick={() => handleReleaseLot(selectedOrder)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white transition-colors"
                    >
                      Libérer ✓
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === 'metrologie' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Rapport Dimensionnel & Tolérances
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span>Cote Critique Longueur (±0.5mm):</span>
                        <span className="font-mono font-bold text-emerald-600">+0.12mm (OK)</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span>Épaisseur & Planéité (±0.2mm):</span>
                        <span className="font-mono font-bold text-emerald-600">-0.05mm (OK)</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span>Adhérence Finition / Revêtement:</span>
                        <span className="font-mono font-bold text-emerald-600">Grade 5B (Parfait)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {inspectorTab === 'couts' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Décomposition Coût de Revient
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Matières Premières:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(selectedOrder.totalMaterialCostDzd, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Main d'Œuvre Directe:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(selectedOrder.totalLaborCostDzd, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <span className="font-semibold text-neutral-900 dark:text-white">Coût Total Lot:</span>
                      <span className="font-mono font-bold text-[#C4785A]">
                        {formatMoney(selectedOrder.totalCostDzd, language)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => {
                  showToast(
                    isAr ? 'جاري طباعة شهادة الجودة' : 'Génération du certificat officiel ISO',
                    'success'
                  );
                }}
              >
                {isAr ? 'طباعة شهادة المطابقة ISO' : 'Imprimer Certificat de Conformité'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

