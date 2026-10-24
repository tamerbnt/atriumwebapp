import React, { useState } from 'react';
import {
  Truck,
  Package,
  QrCode,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { LogisticsShipment, LogisticsManifest } from '../../../types/index';

export const LogisticsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shipments' | 'manifests' | 'cod'>('dashboard');

  const [shipments, setShipments] = useState<LogisticsShipment[]>([
    {
      id: 'ship_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
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
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
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
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold shadow-sm border border-cyan-100 dark:border-cyan-800">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الخدمات اللوجستية وتوصيل الطرود' : 'Messagerie Express & Logistique Colis'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                FacilityType: 23
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Bordereaux AWB, feuilles de route chauffeurs, tri en hub et réconciliation du Cash-on-Delivery (COD)
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Bordereau d\'expédition AWB généré', 'success')}
          className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Nouveau Colis (AWB)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'}`}
        >
          <Truck size={15} />
          <span>Dispatch Hub</span>
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'shipments' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-neutral-500'}`}
        >
          <Package size={15} />
          <span>Colis & Expéditions ({shipments.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Colis en Cours de Livraison</div>
            <div className="text-2xl font-bold font-mono mt-1 text-cyan-600">
              {shipments.filter((s) => s.status === 'OutForDelivery').length}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Total COD à Réconcilier</div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {formatMoney(
                shipments.reduce((acc, s) => acc + s.codAmountDzd, 0),
                'DZD'
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="text-neutral-500 text-xs">Taux de Livraison Réussie</div>
            <div className="text-2xl font-bold font-mono mt-1 text-blue-600">98.4%</div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold">Colis & Envois Récents</h3>
          {shipments.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="text-xs font-bold font-mono text-cyan-700 dark:text-cyan-400">{s.trackingCode} — {s.recipientName}</div>
                <div className="text-[11px] text-neutral-500">
                  Dest: {s.destinationWilaya} · Marchand: {s.merchantName}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold">{formatMoney(s.codAmountDzd, 'DZD')} COD</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                  {s.status}
                </span>
                <button
                  onClick={() => showToast('Étiquette thermique AWB imprimée', 'success')}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs"
                >
                  Étiquette
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
