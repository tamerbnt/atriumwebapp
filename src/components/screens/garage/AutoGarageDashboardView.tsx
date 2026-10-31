import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Car,
  Plus,
  ClipboardList,
  Boxes,
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Gauge,
  ShieldCheck,
  Zap,
  TrendingUp,
  Receipt,
  Users,
  Layers,
  ArrowUpRight,
  Check,
  Package,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, WorkshopBay, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { AutoOrderModal } from './AutoOrderModal';
import { AutoVehicleModal } from './AutoVehicleModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonDashboardGarage } from '../../ui/skeleton/StructuralSkeletons';

export const AutoGarageDashboardView: React.FC = () => {
  const {
    language,
    setScreen,
    activeGarageRole,
    setActiveGarageRole,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    orders,
    vehicles,
    parts,
    bays,
    fleets,
    invoices,
    addOrder,
    addVehicle,
    updateOrderStatus,
    releaseBay,
  } = useGarageData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0,
  });

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  // Computed High-Level Statistics
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'Delivered'), [orders]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === 'ReadyForPickup'), [orders]);
  const inRepairOrders = useMemo(() => orders.filter((o) => o.status === 'InRepair'), [orders]);
  const waitingApprovalOrders = useMemo(() => orders.filter((o) => o.status === 'WaitingApproval'), [orders]);
  const waitingPartsOrders = useMemo(() => orders.filter((o) => o.status === 'WaitingParts'), [orders]);
  
  const lowStockParts = useMemo(() => parts.filter((p) => p.stockQuantity <= p.minThreshold), [parts]);
  const totalRevenue = useMemo(() => orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0), [orders]);

  if (showSkeleton && (orders.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonDashboardGarage
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
    );
  }

  // Bay Occupancy Rate
  const occupiedBaysCount = useMemo(() => bays.filter((b) => b.isOccupied).length, [bays]);
  const bayOccupancyRate = useMemo(() => Math.round((occupiedBaysCount / (bays.length || 1)) * 100), [occupiedBaysCount, bays]);

  // Total B2B Fleet Receivables
  const totalFleetReceivables = useMemo(
    () => fleets.reduce((acc, f) => acc + f.currentOutstandingDzd, 0),
    [fleets]
  );

  // Cashier Metrics (Daily Collections)
  const totalCashCollected = useMemo(() => {
    return invoices
      .filter((i) => i.isPaid && i.paymentMethod === 'especes')
      .reduce((acc, i) => acc + i.netToPayDzd, 0);
  }, [invoices]);

  const totalCardCollected = useMemo(() => {
    return invoices
      .filter((i) => i.isPaid && i.paymentMethod === 'cib_dahabia')
      .reduce((acc, i) => acc + i.netToPayDzd, 0);
  }, [invoices]);

  const totalTimbreCollected = useMemo(() => {
    return invoices
      .filter((i) => i.isPaid)
      .reduce((acc, i) => acc + (i.timbreFiscal || 0), 0);
  }, [invoices]);

  const unpaidInvoicesCount = useMemo(() => invoices.filter((i) => !i.isPaid).length, [invoices]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Header Strip with Role Status & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Wrench size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'ورشة ميكانيك وصيانة السيارات' : 'Garage Automobile & Atelier'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F1D1B] text-white">
                {activeGarageRole === 'gerant' && (isAr ? 'مدير الورشة' : 'Direction')}
                {activeGarageRole === 'reception' && (isAr ? 'استقبال الزبائن' : 'Réception')}
                {activeGarageRole === 'mecanicien' && (isAr ? 'الورشة والميكانيك' : 'Atelier & Ponts')}
                {activeGarageRole === 'magasinier' && (isAr ? 'مخزن قطع الغيار' : 'Magasin')}
                {activeGarageRole === 'caisse' && (isAr ? 'الصندوق والفوترة' : 'Caisse & DGI')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeGarageRole === 'gerant' &&
                (isAr
                  ? 'متابعة الأداء الإداري والمالي، نسبة إشغال الرافعات، وذمم الأساطيل'
                  : 'Cockpit exécutif : occupation des ponts, marges brutes & encours flottes B2B')}
              {activeGarageRole === 'reception' &&
                (isAr
                  ? 'استقبال المركبات، الفحص التناقضي الأولي، ومتابعة تسليم السيارات'
                  : 'Accueil atelier, fiche d’état contradictoire & validation devis client')}
              {activeGarageRole === 'mecanicien' &&
                (isAr
                  ? 'المهام المعينة على الرافعات، تشخيص الأعطال، وطلب قطع الغيار'
                  : 'Poste technicien : tâches sur ponts, diagnostic OBD-II & réquisitions')}
              {activeGarageRole === 'magasinier' &&
                (isAr
                  ? 'صرف قطع الغيار لأوامر الإصلاح، ومتابعة طلبيات الموردين'
                  : 'Gestionnaire magasin : sorties pièces OR & seuils de réapprovisionnement')}
              {activeGarageRole === 'caisse' &&
                (isAr
                  ? 'تحصيل المدفوعات، تطبيق الطابع الجبائي م.317، وغلق الجلسة اليومية'
                  : 'Comptoir encaissement : factures DGI, droits de timbre & session Z')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeGarageRole !== 'mecanicien' && (
            <AtriumButton
              variant="secondary"
              size="sm"
              onClick={() => setIsVehicleModalOpen(true)}
              icon={<Car size={14} />}
            >
              {isAr ? 'مركبة جديدة' : 'Nouveau Véhicule'}
            </AtriumButton>
          )}

          {(activeGarageRole === 'gerant' || activeGarageRole === 'reception') && (
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'أمر إصلاح جديد (OR)' : 'Nouvel OR (Entrée)'}
            </AtriumButton>
          )}

          {activeGarageRole === 'mecanicien' && (
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setScreen('registrations')}
              icon={<Wrench size={14} />}
            >
              {isAr ? 'الرافعات والمهام' : 'Mes Ordres de Travail'}
            </AtriumButton>
          )}

          {activeGarageRole === 'magasinier' && (
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setScreen('shop')}
              icon={<Package size={14} />}
            >
              {isAr ? 'طلبية مورد' : 'Commande Fournisseur'}
            </AtriumButton>
          )}

          {activeGarageRole === 'caisse' && (
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setScreen('finance')}
              icon={<Receipt size={14} />}
            >
              {isAr ? 'تسجيل دفعة' : 'Encaissement Rapide'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ROLE 1: GERANT (Executive Cockpit) */}
      {/* ------------------------------------------------------------------ */}
      {activeGarageRole === 'gerant' && (
        <>
          {/* Canonical 3-Card Top Metrics Pod Tray */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'مؤشرات الأداء المالي واستغلال طاقة الورشة' : 'Performance Financière & Taux d’Occupation'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'رقم الأعمال الإجمالي، نسبة دوران الرافعات، وذمم أساطيل الشركات'
                  : 'Chiffre d’affaires atelier, saturation des 6 ponts & encours de crédit B2B'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Bay Occupancy */}
              <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    {isAr ? 'نسبة إشغال الرافعات' : 'Taux d’Occupation Ponts'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#C4785A]">
                    {occupiedBaysCount} / {bays.length} occupés
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                    {bayOccupancyRate}%
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#C4785A] h-full" style={{ width: `${bayOccupancyRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Card 2: B2B Fleet Outstanding */}
              <div
                onClick={() => setScreen('finance')}
                className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs cursor-pointer hover:border-[#C4785A]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                    {isAr ? 'مستحقات أساطيل الشركات' : 'Créances Flottes Conventionnées'}
                  </span>
                  <Building2 size={15} className="text-[#C4785A]" />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                    {formatMoney(totalFleetReceivables)}
                  </div>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                    {fleets.length} {isAr ? 'عقود شركات معتمدة' : 'sociétés sous convention DGI'}
                  </p>
                </div>
              </div>

              {/* Card 3: Dark Espresso Anchor Card */}
              <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-300">
                    {isAr ? 'رقم أعمال الورشة التراكمي' : 'Chiffre d’Affaires Réalisé'}
                  </span>
                  <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                    TTC Global
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-mono tabular-nums">
                    {formatMoney(totalRevenue)}
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                    <CheckCircle2 size={11} />
                    {orders.length} {isAr ? 'أوامر إصلاح مسجلة' : 'ordres de travail traités'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Workshop Bay Strip */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#C4785A]" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'مصفوفة الرافعات والبوستات النشطة' : 'Statut Temps-Réel des Postes & Ponts'}
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {bays.length} {isAr ? 'رافعات مرخصة' : 'postes homologués'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bays.map((bay) => {
                const activeOrder = orders.find((o) => o.id === bay.activeOrderId);
                return (
                  <div
                    key={bay.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      bay.isOccupied
                        ? 'bg-white dark:bg-neutral-850 border-orange-200 dark:border-orange-950/60 shadow-xs'
                        : 'bg-white/60 dark:bg-neutral-800/20 border-dashed border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">
                        {bay.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          bay.isOccupied
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {bay.isOccupied ? (isAr ? 'مشغول' : 'Occupé') : (isAr ? 'شاغر' : 'Libre')}
                      </span>
                    </div>

                    {bay.isOccupied && activeOrder ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-mono font-bold text-[#C4785A]">
                          {activeOrder.vehiclePlate} · {activeOrder.orderNumber}
                        </div>
                        <div className="text-neutral-600 dark:text-neutral-300 text-[11px] truncate">
                          {activeOrder.vehicleModel}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400">
                          <span>{bay.assignedTechnicianName || activeOrder.technicianName}</span>
                          <span className="font-bold text-amber-600">{activeOrder.status}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-neutral-400 text-xs">
                        <span>{isAr ? 'جاهز لاستقبال مركبة' : 'Poste disponible'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ROLE 2: RECEPTION (Service Advisor) */}
      {/* ------------------------------------------------------------------ */}
      {activeGarageRole === 'reception' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'طابور الاستقبال والفحص التناقضي' : 'Flux Accueil, Devis & Restitutions'}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {isAr
                  ? 'المركبات الوافدة، أوامر الإصلاح في انتظار موافقة الزبون، والسيارات الجاهزة للتسليم'
                  : 'Fiches contradictoires, accords clients WhatsApp & véhicules prêts à restituer'}
              </p>
            </div>
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'استقبال سيارة جديدة' : 'Nouvelle Entrée Atelier'}
            </AtriumButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'في انتظار موافقة الزبون' : 'Devis en Attente Accord'}</span>
              <div className="text-2xl font-bold font-mono text-amber-600">{waitingApprovalOrders.length}</div>
              <p className="text-[10px] text-neutral-400">À relancer par WhatsApp / Tél</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'قيد العمل على الرافعات' : 'En Cours d’Intervention'}</span>
              <div className="text-2xl font-bold font-mono text-blue-600">{inRepairOrders.length}</div>
              <p className="text-[10px] text-neutral-400">Travaux mécaniques actifs</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'جاهزة للتسليم للزبون' : 'Prêts pour Restitution'}</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">{readyOrders.length}</div>
              <p className="text-[10px] text-neutral-400">Contrôle qualité terminé</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ROLE 3: MECANICIEN (Workshop Technician) */}
      {/* ------------------------------------------------------------------ */}
      {activeGarageRole === 'mecanicien' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'أوامر العمل الخاصة بي على الرافعة' : 'Ordres de Travail Actifs (Poste Mécanique)'}
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Pont 1 & Fosse 4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inRepairOrders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#C4785A]">{order.orderNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {order.status}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {order.vehiclePlate} — {order.vehicleModel}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 italic">
                    "{order.diagnosticNotes}"
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-mono">
                    Temps prévu: {order.laborHoursEstimated || 2.0}h
                  </span>
                  <AtriumButton
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      updateOrderStatus(order.id, 'Testing');
                      showToast(isAr ? 'تم تحويل المركبة للاختبار والمراقبة' : 'OR passé en phase Essai/Contrôle', 'success');
                    }}
                    icon={<Check size={12} />}
                  >
                    {isAr ? 'إنهاء التصليح' : 'Terminer'}
                  </AtriumButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ROLE 4: MAGASINIER (Parts Warehouse Specialist) */}
      {/* ------------------------------------------------------------------ */}
      {activeGarageRole === 'magasinier' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'مستودع قطع الغيار والطلبيات الحرجة' : 'Magasin Pièces : Réquisitions Atelier & Alertes Stock'}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {isAr
                  ? 'متابعة القطع القريبة من النفاد وصرف المستلزمات لميكانيكيي الورشة'
                  : 'Seuils critiques, approvisionnements fournisseurs & sorties pour les ORs'}
              </p>
            </div>
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setScreen('shop')}
              icon={<Package size={14} />}
            >
              {isAr ? 'إدارة المخزن' : 'Accéder au Magasin'}
            </AtriumButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'قطع تحت حد الأمان' : 'Articles en Alerte Seuil'}</span>
              <div className="text-2xl font-bold font-mono text-amber-600">{lowStockParts.length}</div>
              <p className="text-[10px] text-neutral-400">Nécessite bon de commande</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'أوامر بانتظار قطع' : 'OR Bloqués pour Pièces'}</span>
              <div className="text-2xl font-bold font-mono text-red-600">{waitingPartsOrders.length}</div>
              <p className="text-[10px] text-neutral-400">Priorité approvisionnement</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'إجمالي الأصناف بالمخزن' : 'Références Actives'}</span>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">{parts.length}</div>
              <p className="text-[10px] text-neutral-400">Rayonnage indexé A-01 à D-04</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ROLE 5: CAISSE (Cashier & DGI Invoicing) */}
      {/* ------------------------------------------------------------------ */}
      {activeGarageRole === 'caisse' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'صندوق الورشة والفوترة الجبائية DGI' : 'Caisse Journalière & Facturation Conforme DGI'}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {isAr
                  ? 'متابعة مقبوضات اليوم نقداً وبطاقات بنكية، وقسيمة الطابع الجبائي م.317'
                  : 'Totalisations session Z, timbres fiscaux espèces & encaissements'}
              </p>
            </div>
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setScreen('finance')}
              icon={<Receipt size={14} />}
            >
              {isAr ? 'شاشة الفوترة والصندوق' : 'Ouvrir Module Facturation'}
            </AtriumButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'مقبوضات نقداً (Espèces)' : 'Espèces en Tiroir'}</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">{formatMoney(totalCashCollected)}</div>
              <p className="text-[10px] text-neutral-400">Timbre fiscal applicable (1%)</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'مدفوعات CIB / الذهبية' : 'Cartes CIB & Dahabia'}</span>
              <div className="text-2xl font-bold font-mono text-blue-600">{formatMoney(totalCardCollected)}</div>
              <p className="text-[10px] text-neutral-400">Exempté de droit de timbre</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-xs text-neutral-500">{isAr ? 'طابع جبائي محصل (م.317)' : 'Timbre Fiscal Collecté'}</span>
              <div className="text-2xl font-bold font-mono text-[#C4785A]">{formatMoney(totalTimbreCollected)}</div>
              <p className="text-[10px] text-neutral-400">Reversé au Trésor Public DGI</p>
            </div>
          </div>
        </div>
      )}

      {/* Shared Workstation Activity Strip */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'أحدث أوامر الإصلاح في الورشة' : 'Derniers Ordres de Réparation Actifs'}
            </h2>
          </div>
          <AtriumButton
            variant="ghost"
            size="xs"
            onClick={() => setScreen('registrations')}
            icon={<ChevronRight size={14} />}
          >
            {isAr ? 'عرض الكل' : 'Voir tout'}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {orders.slice(0, 6).map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#C4785A]">
                  {order.orderNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.status === 'ReadyForPickup'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : order.status === 'InRepair'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {order.vehiclePlate} — {order.vehicleModel}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {order.clientName}
                </div>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-1 italic">
                "{order.diagnosticNotes}"
              </p>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  {isAr ? 'التقدير' : 'Montant'}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {activeGarageRole === 'mecanicien'
                    ? (isAr ? 'محجوب في وضع الورشة' : '— DZD (Masqué)')
                    : formatMoney(order.finalCostDzd || order.estimatedCostDzd)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSave={addOrder}
        vehicles={vehicles}
      />
      <AutoVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={addVehicle}
      />
    </div>
  );
};
