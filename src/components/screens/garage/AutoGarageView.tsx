import React, { useState } from 'react';
import {
  Wrench,
  Car,
  ClipboardList,
  Boxes,
  CreditCard,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Fuel,
  Gauge,
  User,
  Phone,
  Sparkles,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { GarageVehicle, GarageWorkOrder } from '../../../types/index';

interface AutoGarageViewProps {
  initialTab?: 'dashboard' | 'orders' | 'vehicles' | 'parts' | 'billing';
}

export const AutoGarageView: React.FC<AutoGarageViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'vehicles' | 'parts' | 'billing'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<GarageWorkOrder | null>(null);

  // Mock State
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([
    {
      id: 'veh_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      licensePlate: '01234-118-16',
      vin: 'VF1BZ0A0H48923412',
      brand: 'Renault',
      model: 'Clio 4 1.5 dCi',
      year: 2018,
      engineType: 'Diesel dCi 85cv',
      color: 'Gris Titanium',
      ownerName: 'Mourad Cherif',
      ownerPhone: '0550 44 33 22',
      currentOdometer: 142500,
      createdAt: '2026-05-05T08:00:00Z',
    },
    {
      id: 'veh_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      licensePlate: '09876-121-16',
      vin: 'WVWZZZ3CZWE098765',
      brand: 'Volkswagen',
      model: 'Golf 7 2.0 TDI GTD',
      year: 2021,
      engineType: 'Diesel TDI 184cv',
      color: 'Blanc Pur',
      ownerName: 'Sofiane Benali',
      ownerPhone: '0662 88 99 00',
      currentOdometer: 78900,
      createdAt: '2026-05-06T09:30:00Z',
    },
    {
      id: 'veh_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      licensePlate: '15432-119-09',
      vin: 'VF30U9HD8BS045612',
      brand: 'Peugeot',
      model: '301 1.6 HDi',
      year: 2019,
      engineType: 'Diesel HDi 92cv',
      color: 'Noir Perla',
      ownerName: 'Transport Express EURL',
      ownerPhone: '023 88 12 44',
      currentOdometer: 215000,
      createdAt: '2026-05-07T10:00:00Z',
    },
  ]);

  const [orders, setOrders] = useState<GarageWorkOrder[]>([
    {
      id: 'ord_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: 'OR-2026-0142',
      vehicleId: 'veh_01',
      vehiclePlate: '01234-118-16',
      vehicleModel: 'Renault Clio 4',
      clientName: 'Mourad Cherif',
      clientPhone: '0550 44 33 22',
      intakeOdometer: 142500,
      fuelLevelFraction: '1/2',
      intakeNotes: 'Bruit de claquement avant droit au freinage + Révision vidange 140.000 km.',
      status: 'InRepair',
      assignedTechnicianName: 'Khaled (Mécano Chef)',
      partsTotalDzd: 18500,
      laborTotalDzd: 7000,
      totalAmountDzd: 25500,
      isPaid: false,
      startDate: '2026-05-10T08:30:00Z',
      createdAt: '2026-05-10T08:30:00Z',
    },
    {
      id: 'ord_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: 'OR-2026-0143',
      vehicleId: 'veh_02',
      vehiclePlate: '09876-121-16',
      vehicleModel: 'VW Golf 7',
      clientName: 'Sofiane Benali',
      clientPhone: '0662 88 99 00',
      intakeOdometer: 78900,
      fuelLevelFraction: '3/4',
      intakeNotes: 'Remplacement kit distribution + pompe à eau + courroie accessoires.',
      status: 'Ready',
      assignedTechnicianName: 'Rabah (Spécialiste VAG)',
      partsTotalDzd: 42000,
      laborTotalDzd: 14000,
      totalAmountDzd: 56000,
      isPaid: true,
      startDate: '2026-05-09T09:00:00Z',
      completedDate: '2026-05-10T11:00:00Z',
      createdAt: '2026-05-09T09:00:00Z',
    },
  ]);

  // Form states
  const [selectedVehId, setSelectedVehId] = useState('');
  const [orderClientName, setOrderClientName] = useState('');
  const [orderClientPhone, setOrderClientPhone] = useState('');
  const [orderOdometer, setOrderOdometer] = useState('100000');
  const [orderFuel, setOrderFuel] = useState('1/2');
  const [orderComplaint, setOrderComplaint] = useState('');

  // Vehicle Form states
  const [newPlate, setNewPlate] = useState('');
  const [newVin, setNewVin] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2020');
  const [newOwner, setNewOwner] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.vehiclePlate.includes(searchQuery) ||
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === selectedVehId);
    if (!veh) {
      showToast('Veuillez sélectionner un véhicule enregistré', 'error');
      return;
    }

    const created: GarageWorkOrder = {
      id: `ord_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      orderNumber: `OR-2026-${(orders.length + 101).toString()}`,
      vehicleId: veh.id,
      vehiclePlate: veh.licensePlate,
      vehicleModel: `${veh.brand} ${veh.model}`,
      clientName: orderClientName || veh.ownerName,
      clientPhone: orderClientPhone || veh.ownerPhone,
      intakeOdometer: parseInt(orderOdometer, 10) || veh.currentOdometer,
      fuelLevelFraction: orderFuel,
      intakeNotes: orderComplaint || 'Diagnostic général',
      status: 'Intake',
      partsTotalDzd: 0,
      laborTotalDzd: 5000,
      totalAmountDzd: 5000,
      isPaid: false,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setOrders([created, ...orders]);
    setIsOrderModalOpen(false);
    setOrderComplaint('');
    showToast('Ordre de réparation (OR) créé avec succès', 'success');
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim() || !newBrand.trim() || !newModel.trim()) {
      showToast('Veuillez remplir les informations obligatoires du véhicule', 'error');
      return;
    }

    const created: GarageVehicle = {
      id: `veh_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      licensePlate: newPlate.trim(),
      vin: newVin.trim() || `VIN-${Date.now().toString().slice(-8)}`,
      brand: newBrand.trim(),
      model: newModel.trim(),
      year: parseInt(newYear, 10) || 2020,
      engineType: 'Essence / Diesel',
      ownerName: newOwner.trim() || 'Client Garage',
      ownerPhone: newOwnerPhone.trim() || '0550 00 00 00',
      currentOdometer: 100000,
      createdAt: new Date().toISOString(),
    };

    setVehicles([created, ...vehicles]);
    setIsVehicleModalOpen(false);
    setNewPlate('');
    setNewBrand('');
    setNewModel('');
    showToast('Véhicule enregistré au parc', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm border border-amber-100 dark:border-amber-800">
            <Wrench size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'ورشة تصليح وصيانة السيارات' : language === 'fr' ? 'Atelier & Garage Automobile' : 'Auto Garage & Fleet Maintenance'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                FacilityType: 19
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'أوامر التصليح (OR)، تتبع رقم الهيكل (VIN)، قطع الغيار ومصنعية اليد العاملة'
                : 'Ordres de réparation (OR), registre VIN/Châssis, magasin de pièces et forfaits horaires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Car size={15} />
            <span>{language === 'ar' ? 'مركبة جديدة' : 'Nouveau Véhicule'}</span>
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>{language === 'ar' ? 'أمر تصليح جديد (OR)' : 'Nouvel Ordre de Réparation (OR)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <Gauge size={15} />
          <span>{language === 'ar' ? 'لوحة الورشة' : 'Tableau de Bord Atelier'}</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <ClipboardList size={15} />
          <span>{language === 'ar' ? 'أوامر التصليح (OR)' : 'Ordres de Réparation (OR)'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
            {orders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'vehicles'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <Car size={15} />
          <span>{language === 'ar' ? 'سجل المركبات والأسطول' : 'Parc & Registre Châssis (VIN)'}</span>
          <span className="text-[10px] text-neutral-400">({vehicles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'billing'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <CreditCard size={15} />
          <span>{language === 'ar' ? 'الفواتير وسندات الخروج' : 'Facturation & Bons de Sortie'}</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 text-xs">
                  <span>{language === 'ar' ? 'سيارات في الورشة' : 'Véhicules en Réparation'}</span>
                  <Wrench size={16} className="text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {orders.filter((o) => o.status === 'InRepair' || o.status === 'Intake').length}
                </div>
                <div className="text-[11px] text-amber-600 mt-1 font-medium">
                  3 ponts élévateurs occupés / 4
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 text-xs">
                  <span>{language === 'ar' ? 'جاهزة للتسليم' : 'Prêts pour Livraison'}</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {orders.filter((o) => o.status === 'Ready').length}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                  Contrôle qualité validé
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 text-xs">
                  <span>{language === 'ar' ? 'إجمالي المركبات المسجلة' : 'Parc Véhicules Client'}</span>
                  <Car size={16} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {vehicles.length}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  100% avec historique d'entretien
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 text-xs">
                  <span>{language === 'ar' ? 'رقم أعمال التصليح' : 'Chiffre d\'Affaires Réparations'}</span>
                  <CreditCard size={16} className="text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {formatMoney(
                    orders.reduce((acc, o) => acc + o.totalAmountDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-teal-600 mt-1 font-medium">
                  Pièces consommées + Main d'œuvre
                </div>
              </div>
            </div>

            {/* Active Repair Orders List */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-600" />
                <span>{language === 'ar' ? 'أوامر التصليح الجارية على المنصات' : 'Ordres de Réparation Actifs'}</span>
              </h3>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {orders.map((o) => (
                  <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs font-mono text-neutral-700 dark:text-neutral-300">
                        {o.orderNumber.split('-')[2]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <span>{o.vehicleModel}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300">
                            {o.vehiclePlate}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Client: {o.clientName} ({o.clientPhone}) · {o.intakeNotes}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <div className="font-mono font-bold text-neutral-900 dark:text-white">
                          {formatMoney(o.totalAmountDzd, 'DZD')}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Pièces: {formatMoney(o.partsTotalDzd, 'DZD')} · MO: {formatMoney(o.laborTotalDzd, 'DZD')}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          o.status === 'Ready'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {o.status === 'Ready' ? 'Prêt à Livrer' : 'En Réparation'}
                      </span>

                      <button
                        onClick={() => showToast(`Bon de sortie généré pour ${o.orderNumber}`, 'success')}
                        className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-medium cursor-pointer"
                      >
                        Bon de Sortie
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Recherche par N° OR, matricule, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Créer Ordre de Réparation</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">N° OR</th>
                    <th className="py-3 px-4">Véhicule & Immatriculation</th>
                    <th className="py-3 px-4">Client & Contact</th>
                    <th className="py-3 px-4">Kilométrage & Carburant</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Montant Total</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-white">{o.vehicleModel}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{o.vehiclePlate}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{o.clientName}</div>
                        <div className="text-[11px] text-neutral-400">{o.clientPhone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>{o.intakeOdometer.toLocaleString()} km</div>
                        <div className="text-neutral-400">Jauge: {o.fuelLevelFraction}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {formatMoney(o.totalAmountDzd, 'DZD')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => showToast(`Impression devis/facture OR ${o.orderNumber}`, 'success')}
                          className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[11px] font-medium cursor-pointer"
                        >
                          Devis / Facture
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'سجل المركبات والأسطول المتعامل مع الورشة' : 'Registre des Véhicules & Châssis (VIN)'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Traçabilité complète des entretiens par matricule et numéro de série VIN
                </p>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Ajouter Véhicule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">
                      {v.licensePlate}
                    </span>
                    <span className="text-[11px] text-neutral-500">{v.year}</span>
                  </div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-white">
                    {v.brand} {v.model}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                    VIN: {v.vin}
                  </div>
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Propriétaire: {v.ownerName}</span>
                    <span className="font-mono font-semibold">{v.currentOdometer.toLocaleString()} km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Factures d'Atelier & Bons de Sortie Véhicule
            </h3>
            <p className="text-xs text-neutral-500">
              Garantie de réparation, détail pièces & main d'œuvre certifié
            </p>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {orders.map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      Facture {o.orderNumber} — {o.vehicleModel} ({o.vehiclePlate})
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Client: {o.clientName} · Pièces: {formatMoney(o.partsTotalDzd, 'DZD')} · Main d'œuvre: {formatMoney(o.laborTotalDzd, 'DZD')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm">
                      {formatMoney(o.totalAmountDzd, 'DZD')}
                    </span>
                    <button
                      onClick={() => showToast('Certificat de garantie et facture imprimés', 'success')}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>Imprimer Facture A4</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: New Work Order */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Wrench size={18} className="text-amber-600" />
                <span>Créer un Ordre de Réparation (OR)</span>
              </h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-neutral-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Sélectionner le Véhicule dans le Parc *
                </label>
                <select
                  required
                  value={selectedVehId}
                  onChange={(e) => {
                    setSelectedVehId(e.target.value);
                    const v = vehicles.find((item) => item.id === e.target.value);
                    if (v) {
                      setOrderClientName(v.ownerName);
                      setOrderClientPhone(v.ownerPhone);
                      setOrderOdometer(v.currentOdometer.toString());
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                >
                  <option value="">-- Choisir véhicule par matricule / modèle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} — {v.brand} {v.model} ({v.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Kilométrage Compteur *
                  </label>
                  <input
                    type="number"
                    required
                    value={orderOdometer}
                    onChange={(e) => setOrderOdometer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Niveau Carburant (Jauge)
                  </label>
                  <select
                    value={orderFuel}
                    onChange={(e) => setOrderFuel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-bold text-amber-600"
                  >
                    <option value="Réserve">Réserve</option>
                    <option value="1/4">1/4 Plein</option>
                    <option value="1/2">1/2 Plein</option>
                    <option value="3/4">3/4 Plein</option>
                    <option value="Plein">Plein 100%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Travaux Demandés / Déclaration Client *
                </label>
                <textarea
                  required
                  rows={3}
                  value={orderComplaint}
                  onChange={(e) => setOrderComplaint(e.target.value)}
                  placeholder="Ex: Révision complète vidange filtres, plaquettes de frein avant, bruit train roulant..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  Émettre l'Ordre de Réparation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Car size={18} className="text-amber-600" />
                <span>Enregistrer un Véhicule au Parc</span>
              </h2>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-neutral-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Numéro d'Immatriculation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 01234-120-16"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Numéro de Série Châssis (VIN)
                  </label>
                  <input
                    type="text"
                    placeholder="17 caractères VIN"
                    value={newVin}
                    onChange={(e) => setNewVin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    placeholder="Renault, Peugeot, Toyota..."
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Clio, 208, Hilux..."
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Nom du Propriétaire / Société
                  </label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Téléphone Contact
                  </label>
                  <input
                    type="tel"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  Enregistrer Véhicule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
