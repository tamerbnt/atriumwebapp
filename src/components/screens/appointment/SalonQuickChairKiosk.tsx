import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Scissors,
  CheckCircle2,
  Play,
  Check,
  CreditCard,
  Plus,
  User,
  Printer,
  Building2,
  Clock,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentServicesFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  selectCurrentSalonChairStationsFromState,
} from '../../../services/store';
import { SalonChairStation } from '../../../types/index';
import { toValidUuid } from '../../../lib/supabase/index';
import { dzdToCentimes, centimesToDzd } from '../../../utils/money';
import { computeElapsedMinutesFromIso } from '../../../utils/step6Persistence';
import { calculateArt317Timbre, formatMoney } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  KineticEmptyStateMotion,
  KineticModalShell,
  useRetainedModalValue,
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  ListAdvancedMenuButton,
  resolveRecordBranch,
  buildBranchesByIdMap,
} from '../../ui/kinetic';

export const SalonQuickChairKiosk: React.FC = React.memo(() => {
  const {
    appointments,
    servicesCatalog,
    staff,
    branches,
    currentBranch,
    salonChairStations,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      appointments: selectCurrentAppointmentsFromState(s),
      servicesCatalog: selectCurrentServicesFromState(s),
      staff: selectCurrentStaffFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      salonChairStations: selectCurrentSalonChairStationsFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const { updateSalonChairStation, retryCloudSync } = useAtriumActions();
  const isRtl = language === 'ar';

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0 || servicesCatalog.length > 0,
  });

  const [stationFilter, setStationFilter] = useState<'all' | 'occupied' | 'free'>('all');
  const [checkoutModalStationKey, setCheckoutModalStationKey] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [targetStationId, setTargetStationId] = useState('ws_1');
  const [newClientName, setNewClientName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(servicesCatalog[0]?.id || '');
  const [selectedStylistId, setSelectedStylistId] = useState(staff[0]?.id || '');
  const [inspectedStationId, setInspectedStationId] = useState<string | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const workstationsList = useMemo(
    () => [
      { id: 'ws_1', name: isRtl ? 'محطة 1 - حلاقة وقص' : 'Fauteuil 1 - Coupe & Coiffage', type: 'Hair' },
      { id: 'ws_2', name: isRtl ? 'محطة 2 - ذقن وعناية' : 'Fauteuil 2 - Barbe & Soins Visage', type: 'Beard' },
      { id: 'ws_3', name: isRtl ? 'محطة 3 - غسيل وعلاج' : 'Bac Lavage & Traitement Capillaire', type: 'Wash' },
      { id: 'ws_4', name: isRtl ? 'محطة 4 - VIP بريميوم' : 'Cabine VIP & Esthétique', type: 'VIP' },
    ],
    [isRtl]
  );

  const activeStations = useMemo(() => {
    const map: Record<string, SalonChairStation> = {};
    workstationsList.forEach((ws) => {
      const wsUuid = toValidUuid(ws.id);
      const found = salonChairStations.find(
        (st) => st.workstationId === ws.id || st.workstationId === wsUuid
      );
      if (found && found.clientName && found.stage !== 'paid') {
        map[ws.id] = found;
      }
    });
    return map;
  }, [workstationsList, salonChairStations]);

  const hasInProgressChair = useMemo(
    () => Object.values(activeStations).some((st) => st.stage === 'in_progress' && Boolean(st.startTime)),
    [activeStations]
  );

  useEffect(() => {
    if (!hasInProgressChair) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, [hasInProgressChair]);

  const getStationPriceDzd = useCallback((st?: SalonChairStation | null): number => {
    if (!st) return 0;
    if (st.servicePriceCentimes != null) return centimesToDzd(st.servicePriceCentimes);
    return Number(st.servicePriceDzd || 0);
  }, []);

  const metrics = useMemo(() => {
    const occupiedCount = workstationsList.filter((w) => Boolean(activeStations[w.id])).length;
    const freeCount = workstationsList.length - occupiedCount;
    const activeRevenue = Object.values(activeStations).reduce(
      (sum: number, st) => sum + getStationPriceDzd(st),
      0
    );
    return { occupiedCount, freeCount, activeRevenue };
  }, [workstationsList, activeStations, getStationPriceDzd]);

  const inspectedStation = useMemo(
    () => (inspectedStationId ? workstationsList.find((w) => w.id === inspectedStationId) || null : null),
    [inspectedStationId, workstationsList]
  );

  const visibleStations = useMemo(
    () =>
      workstationsList.filter((ws) => {
        const occ = Boolean(activeStations[ws.id]);
        if (stationFilter === 'occupied') return occ;
        if (stationFilter === 'free') return !occ;
        return true;
      }),
    [workstationsList, activeStations, stationFilter]
  );

  const handleAdvanceStage = useCallback(
    (stationKey: string) => {
      const current = activeStations[stationKey];
      const wsMeta = workstationsList.find((w) => w.id === stationKey);
      if (!current) return;
      if (current.stage === 'waiting' || current.stage === 'in_progress') {
        const nextStage = current.stage === 'waiting' ? 'in_progress' : 'completed';
        const nowIso = new Date().toISOString();
        updateSalonChairStation({
          ...current,
          workstationId: current.workstationId || stationKey,
          workstationName: current.workstationName || wsMeta?.name || stationKey,
          stage: nextStage,
          startTime: nextStage === 'in_progress' ? nowIso : current.startTime,
          elapsedMinutes:
            nextStage === 'completed'
              ? computeElapsedMinutesFromIso(current.startTime, Date.now())
              : 0,
        });
      } else if (current.stage === 'completed') {
        setCheckoutModalStationKey(stationKey);
      }
    },
    [activeStations, workstationsList, updateSalonChairStation]
  );

  const handleConfirmCheckout = useCallback(() => {
    if (!checkoutModalStationKey) return;
    const current = activeStations[checkoutModalStationKey];
    const wsMeta = workstationsList.find((w) => w.id === checkoutModalStationKey);
    if (!current) return;
    const priceDzd = getStationPriceDzd(current);
    const timbre = paymentMethod === 'cash' ? calculateArt317Timbre(priceDzd) : 0;
    const nowStamp = new Date();
    const datePart = nowStamp.toISOString().slice(0, 10).replace(/-/g, '');
    const seqPart = String(nowStamp.getTime()).slice(-4);
    const receiptNum = `REC-SAL-${datePart}-${seqPart}`;
    const nextReceipt = {
      clientName: current.clientName,
      serviceName: current.serviceName,
      amountDzd: priceDzd,
      timbreFiscalDzd: timbre,
      paymentMethod,
      receiptNumber: receiptNum,
    };

    updateSalonChairStation({
      workstationId: current.workstationId || checkoutModalStationKey,
      workstationName: current.workstationName || wsMeta?.name || checkoutModalStationKey,
      stage: 'waiting',
      clientName: undefined,
      serviceName: undefined,
      servicePriceDzd: undefined,
      servicePriceCentimes: undefined,
      currentStylistId: undefined,
      currentStylistName: undefined,
      currentAppointmentId: undefined,
      startTime: undefined,
      elapsedMinutes: 0,
    });
    setLastReceipt(nextReceipt);
    setCheckoutModalStationKey(null);
  }, [checkoutModalStationKey, activeStations, workstationsList, getStationPriceDzd, paymentMethod, updateSalonChairStation]);

  const handleAddNewClientToStation = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const service = servicesCatalog.find((s) => s.id === selectedServiceId) || servicesCatalog[0];
      const stylist = staff.find((st) => st.id === selectedStylistId) || staff[0];
      const wsMeta = workstationsList.find((w) => w.id === targetStationId);
      const clientLabel = newClientName.trim() || (isRtl ? 'زبون صالون' : 'Client Salon');
      const priceDzd = Number(service?.price || 1500);
      updateSalonChairStation({
        workstationId: targetStationId,
        workstationName: wsMeta?.name || targetStationId.toUpperCase(),
        clientName: clientLabel,
        serviceName: service?.name || 'Prestation Salon',
        servicePriceDzd: priceDzd,
        servicePriceCentimes: dzdToCentimes(priceDzd),
        currentStylistName: stylist?.fullName || 'Styliste',
        currentStylistId: stylist?.id,
        stage: 'waiting',
        startTime: new Date().toISOString(),
        elapsedMinutes: 0,
      });
      setIsAddClientModalOpen(false);
      setNewClientName('');
    },
    [servicesCatalog, selectedServiceId, staff, selectedStylistId, workstationsList, targetStationId, newClientName, isRtl, updateSalonChairStation]
  );

  const activeCheckoutStation = checkoutModalStationKey
    ? activeStations[checkoutModalStationKey] ?? null
    : null;
  const retainedCheckoutStation = useRetainedModalValue(activeCheckoutStation);
  const retainedReceipt = useRetainedModalValue(lastReceipt);

  if (showSkeleton && (appointments.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <ScreenPod>
          <SkeletonKioskGrid count={4} />
        </ScreenPod>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      <ScreenHeaderBar
        icon={<Scissors size={22} />}
        title={isRtl ? 'المحطات' : language === 'en' ? 'Stations' : 'Fauteuils'}
        primaryAction={{
          label: isRtl ? 'تسكين زبون جديد' : 'Installer un Client',
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => setIsAddClientModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isRtl ? 'متابعة محطات الحلاقة المباشرة' : 'Pilotage des Fauteuils en Direct'}
        language={language}
        primaryCard={{
          label: isRtl ? 'المحطات المشغولة' : 'Fauteuils Occupés',
          badgeText: `/${workstationsList.length} postes`,
          count: metrics.occupiedCount,
          tone: 'emerald',
          isActive: stationFilter === 'occupied',
          onToggle: () => setStationFilter((p) => (p === 'occupied' ? 'all' : 'occupied')),
        }}
        secondaryCard={{
          label: isRtl ? 'المحطات الشاغرة' : 'Fauteuils Libres',
          badgeText: isRtl ? 'متاح' : 'disponibles',
          count: metrics.freeCount,
          tone: 'terracotta',
          isActive: stationFilter === 'free',
          onToggle: () => setStationFilter((p) => (p === 'free' ? 'all' : 'free')),
        }}
        darkCard={{
          label: isRtl ? 'تحصيلات قيد الجلسة' : 'Encours Fauteuils Actifs',
          badgePrefix: '',
          badgeCount: metrics.occupiedCount,
          badgeSuffix: ' en cours',
          valuePrefix: '',
          valueCount: metrics.activeRevenue,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Salon Principal'} · Live Kiosk`,
        }}
      />

      <ScreenPod>
        <div className="flex items-center justify-between gap-2 pb-1">
          <h2 className="t-card font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {isRtl ? 'محطات العمل والخدمة السريعة' : 'Postes de Coiffage & Cabines'}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className="t-small font-medium text-black/62 dark:text-white/65 flex items-center gap-2">
              <Building2 size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              {resolveRecordBranch({}, branchesById, currentBranch, language).name}
            </span>
            <ListAdvancedMenuButton
              language={language}
              canResetFilters={stationFilter !== 'all'}
              onResetAllFilters={() => setStationFilter('all')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleStations.map((ws) => {
            const active = activeStations[ws.id];
            const isOccupied = Boolean(active);
            const branchName = resolveRecordBranch({}, branchesById, currentBranch, language).name;
            return (
              <div
                key={ws.id}
                data-sq="card"
                data-sq-border={!isOccupied ? 'dashed' : 'solid'}
                data-sq-stroke-w={isOccupied && active.stage === 'in_progress' ? 2 : 1}
                style={
                  isOccupied && active.stage === 'in_progress'
                    ? ({ '--sq-stroke': '#d4522f' } as React.CSSProperties)
                    : isOccupied && active.stage === 'completed'
                    ? ({ '--sq-stroke': 'rgba(52, 211, 153, 0.8)' } as React.CSSProperties)
                    : undefined
                }
                className={`border-0 transition-colors duration-200 p-5 flex flex-col justify-between min-h-[290px] ${
                  !isOccupied
                    ? 'bg-[#FBF8F5] dark:bg-[#191716]'
                    : active.stage === 'in_progress'
                    ? 'bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] sq-elev-card sq-elev-card-hover'
                    : active.stage === 'completed'
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 sq-elev-card sq-elev-card-hover'
                    : 'bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] sq-elev-card sq-elev-card-hover'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="t-small font-semibold text-black/62 dark:text-white/65 tabular-nums">
                      {ws.id.toUpperCase()} · {branchName}
                    </span>
                    {isOccupied ? (
                      <span
                        className={`t-small font-semibold px-2.5 py-1 rounded-full ${
                          active.stage === 'waiting'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                            : active.stage === 'in_progress'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {active.stage === 'waiting'
                          ? isRtl ? 'في الانتظار' : 'En Attente'
                          : active.stage === 'in_progress'
                          ? isRtl ? 'قيد الإنجاز' : 'En Cours'
                          : isRtl ? 'مكتمل' : 'Terminé'}
                      </span>
                    ) : (
                      <span className="t-small font-medium text-black/55 dark:text-white/55">
                        {isRtl ? 'شاغر' : 'Libre'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      setDrawerOpenerEl(e.currentTarget);
                      setInspectedStationId(ws.id);
                    }}
                    className="w-full text-left rtl:text-right cursor-pointer"
                  >
                    <h3 className="t-label font-semibold text-black dark:text-white mb-1 hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors">{ws.name}</h3>
                    {isOccupied ? (
                      <div className="mt-4 space-y-2 t-cap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0">
                            <User size={14} />
                          </div>
                          <span className="font-semibold text-black dark:text-white truncate">{active.clientName}</span>
                        </div>
                        <div
                          data-sq="ctl"
                          data-sq-border="none"
                          className="bg-[#F5F1EC] dark:bg-[#191716] p-3"
                        >
                          <span className="t-cap text-black/62 dark:text-white/65 block">
                            {isRtl ? 'الخدمة' : 'Prestation'}
                          </span>
                          <span className="font-semibold text-black dark:text-white">{active.serviceName}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 font-semibold">
                          <span>{isRtl ? 'السعر' : 'Tarif'} :</span>
                          <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums t-body">
                            {formatMoney(getStationPriceDzd(active), 'DZD')}
                          </span>
                        </div>
                        {active.startTime && (
                          <div className="flex items-center justify-between text-black/60 dark:text-white/65 tabular-nums">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{isRtl ? 'المدة' : 'Durée'}</span>
                            </span>
                            <span>
                              {active.stage === 'in_progress'
                                ? `${computeElapsedMinutesFromIso(active.startTime, nowMs)} min`
                                : `${active.elapsedMinutes ?? 0} min`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3">
                        <KineticEmptyStateMotion motionKey={`chair-free-${ws.id}`}>
                          <EmptyState
                            variant="compact"
                            tone="neutral"
                            icon={<Scissors size={20} />}
                            title={isRtl ? 'المحطة شاغرة حالياً' : 'Poste disponible'}
                            description={isRtl ? 'اضغط لتعيين عميل' : 'Cliquez pour affecter un client'}
                          />
                        </KineticEmptyStateMotion>
                      </div>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-[var(--atr-divider)]">
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStage(ws.id)}
                      data-sq="ctl"
                      data-sq-border="none"
                      className={`w-full py-2 px-3 t-small font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        active.stage === 'waiting'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : active.stage === 'in_progress'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[var(--brand-fill,#C9461F)] hover:bg-[#b03b1b] text-white'
                      }`}
                    >
                      {active.stage === 'waiting' ? (
                        <>
                          <Play size={14} />
                          <span>{isRtl ? 'بدء الخدمة' : 'Démarrer'}</span>
                        </>
                      ) : active.stage === 'in_progress' ? (
                        <>
                          <Check size={14} />
                          <span>{isRtl ? 'إنهاء الخدمة' : 'Terminer'}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} />
                          <span>{isRtl ? 'تحصيل الفاتورة' : 'Encaisser'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetStationId(ws.id);
                        setIsAddClientModalOpen(true);
                      }}
                      data-sq="ctl"
                      data-sq-border="none"
                      className="w-full py-2 px-3 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] t-small font-semibold text-black/75 dark:text-white/80 hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>{isRtl ? 'إسناد زبون' : 'Assigner'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScreenPod>

      <KineticSlideOverInspector<any>
        isOpen={inspectedStation !== null}
        item={inspectedStation}
        allItems={visibleStations}
        keyExtractor={(w) => w.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectedStation?.name || ''}
        subtitle={
          inspectedStation && activeStations[inspectedStation.id]
            ? `${activeStations[inspectedStation.id].clientName} · ${activeStations[inspectedStation.id].serviceName}`
            : isRtl ? 'محطة شاغرة' : 'Poste libre prêt pour installation'
        }
        avatarText={inspectedStation ? inspectedStation.id.toUpperCase() : undefined}
        categoryLabel={inspectedStation?.type}
        branchName={resolveRecordBranch({}, branchesById, currentBranch, language).name}
        statusLabel={
          inspectedStation && activeStations[inspectedStation.id]
            ? activeStations[inspectedStation.id].stage === 'completed'
              ? isRtl ? 'مكتمل' : 'Terminé'
              : activeStations[inspectedStation.id].stage === 'in_progress'
              ? isRtl ? 'قيد الإنجاز' : 'En Cours'
              : isRtl ? 'انتظار' : 'En Attente'
            : isRtl ? 'شاغر' : 'Libre'
        }
        statusClassName={
          inspectedStation && activeStations[inspectedStation.id]
            ? activeStations[inspectedStation.id].stage === 'completed'
              ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
              : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white'
        }
        tabs={[
          { id: 'overview', label: isRtl ? 'المحطة' : 'Poste & Statut' },
          { id: 'service', label: isRtl ? 'الخدمة' : 'Prestation' },
          { id: 'checkout', label: isRtl ? 'التحصيل' : 'Encaissement' },
        ]}
        onClose={() => setInspectedStationId(null)}
        onSelectItem={(w) => setInspectedStationId(w.id)}
        renderBody={(ws, activeTab) => {
          const st = activeStations[ws.id];
          if (activeTab === 'service') {
            return (
              <InspectorSection index={0} title={isRtl ? 'تفاصيل الجلسة' : 'Détails prestation'}>
                <InspectorCard>
                  <InspectorKeyValue label="Client" value={st?.clientName || 'Aucun client installé'} mono={false} />
                  <InspectorKeyValue label="Prestation" value={st?.serviceName || '—'} tone="accent" mono={false} />
                  <InspectorKeyValue label="Styliste" value={st?.currentStylistName || '—'} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (activeTab === 'checkout') {
            return (
              <InspectorSection index={0} title={isRtl ? 'قيمة الفاتورة' : 'Encaissement poste'}>
                <InspectorBigStat
                  value={st ? formatMoney(getStationPriceDzd(st), 'DZD') : '0 DA'}
                  tone={st ? 'accent' : 'ok'}
                  action={
                    st
                      ? {
                          label: isRtl ? 'تحصيل الآن' : 'Passer en caisse',
                          onClick: () => {
                            setInspectedStationId(null);
                            setCheckoutModalStationKey(ws.id);
                          },
                        }
                      : undefined
                  }
                />
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isRtl ? 'إجراءات المحطة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    st
                      ? {
                          id: 'advance',
                          label:
                            st.stage === 'waiting'
                              ? 'Démarrer'
                              : st.stage === 'in_progress'
                              ? 'Terminer'
                              : 'Encaisser',
                          icon: <Play className="w-[18px] h-[18px]" />,
                          primary: true,
                          onClick: () => handleAdvanceStage(ws.id),
                        }
                      : {
                          id: 'assign',
                          label: 'Assigner Client',
                          icon: <Plus className="w-[18px] h-[18px]" />,
                          primary: true,
                          onClick: () => {
                            setInspectedStationId(null);
                            setTargetStationId(ws.id);
                            setIsAddClientModalOpen(true);
                          },
                        },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title="Synthèse Poste">
                <InspectorCard>
                  <InspectorKeyValue label="Poste" value={ws.name} mono={false} />
                  <InspectorKeyValue label="Client actif" value={st?.clientName || 'Libre'} mono={false} />
                  <InspectorKeyValue label="Montant en cours" value={st ? formatMoney(getStationPriceDzd(st), 'DZD') : '—'} tone="accent" isLast />
                </InspectorCard>
              </InspectorSection>
              {!st && (
                <InspectorSection index={2}>
                  <InspectorWideButton
                    label="Installer un Client au Fauteuil"
                    icon={<Plus className="w-4 h-4" />}
                    tone="accent"
                    onClick={() => {
                      setInspectedStationId(null);
                      setTargetStationId(ws.id);
                      setIsAddClientModalOpen(true);
                    }}
                  />
                </InspectorSection>
              )}
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={Boolean(activeCheckoutStation)}
        onClose={() => setCheckoutModalStationKey(null)}
        maxWidthClass="max-w-sm"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        {retainedCheckoutStation && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] border-0 [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
          >
            <h3 className="t-card font-semibold text-black dark:text-white">
              {isRtl ? 'تحصيل فاتورة الصالون' : 'Encaissement Express Salon'}
            </h3>
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] border-0 p-4 t-cap space-y-2"
            >
              <div className="flex justify-between font-medium text-black dark:text-white pb-2 border-b border-[var(--atr-divider)]">
                <span>{retainedCheckoutStation.clientName}</span>
                <span className="text-black/62 dark:text-white/65">{retainedCheckoutStation.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'سعر الخدمة' : 'Prestation'}</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(getStationPriceDzd(retainedCheckoutStation), 'DZD')}
                </span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>{isRtl ? 'طابع المادة 317' : 'Timbre Art. 317'}</span>
                  <span>+{calculateArt317Timbre(getStationPriceDzd(retainedCheckoutStation))} DA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[var(--atr-divider)] font-semibold t-label">
                <span>{isRtl ? 'الإجمالي' : 'Total Net'}</span>
                <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                  {formatMoney(
                    getStationPriceDzd(retainedCheckoutStation) +
                      (paymentMethod === 'cash'
                        ? calculateArt317Timbre(getStationPriceDzd(retainedCheckoutStation))
                        : 0),
                    'DZD'
                  )}
                </span>
              </div>
            </div>
            <LiveSegmentedControl
              size="md"
              fullWidth
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: 'cash', label: 'Espèces' },
                { value: 'baridimob', label: 'BaridiMob' },
                { value: 'cib', label: 'CIB' },
              ]}
            />
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button
                type="button"
                tone="soft"
                size={40}
                onClick={() => setCheckoutModalStationKey(null)}
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button
                type="button"
                tone="accent"
                size={40}
                onClick={handleConfirmCheckout}
              >
                {isRtl ? 'تأكيد' : 'Valider'}
              </Button>
            </div>
          </div>
        )}
      </KineticModalShell>

      <KineticModalShell
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] border-0 [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--atr-divider)]">
                <h3 className="t-card font-semibold text-black dark:text-white">
                  {isRtl ? 'تسكين زبون' : 'Installer un Client au Fauteuil'}
                </h3>
                <button
                  type="button"
                  aria-label={isRtl ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/62 dark:text-white/65 cursor-pointer hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddNewClientToStation} className="space-y-4">
                <LabelSelect
                  field="targetStationId"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isRtl ? 'محطة العمل' : 'Poste'}
                  value={targetStationId}
                  onChange={setTargetStationId}
                  options={workstationsList.map((ws) => ({
                    value: ws.id,
                    label: ws.name,
                  }))}
                />
                <LabelInput
                  field="newClientName"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isRtl ? 'اسم الزبون' : 'Nom du client'}
                  required
                  value={newClientName}
                  onChange={setNewClientName}
                  placeholder="Ex: Karim Mansouri"
                />
                <LabelSelect
                  field="selectedServiceId"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isRtl ? 'الخدمة' : 'Prestation'}
                  value={selectedServiceId}
                  onChange={setSelectedServiceId}
                  options={servicesCatalog.map((s) => ({
                    value: s.id,
                    label: `${s.name} — ${formatMoney(s.price, 'DZD')}`,
                  }))}
                />
                <LabelSelect
                  field="selectedStylistId"
                  width="100%"
                  height={40}
                  corner={12}
                  label={isRtl ? 'المصففة' : 'Styliste'}
                  value={selectedStylistId}
                  onChange={setSelectedStylistId}
                  options={staff.map((st) => ({
                    value: st.id,
                    label: st.fullName,
                  }))}
                />
                <div className="pt-3 border-t border-[var(--atr-divider)] flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    tone="soft"
                    size={40}
                    onClick={() => setIsAddClientModalOpen(false)}
                  >
                    {isRtl ? 'إلغاء' : 'Annuler'}
                  </Button>
                  <Button
                    type="submit"
                    tone="accent"
                    size={40}
                  >
                    {isRtl ? 'تسكين' : 'Installer'}
                  </Button>
                </div>
              </form>
            </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={Boolean(lastReceipt)}
        onClose={() => setLastReceipt(null)}
        maxWidthClass="max-w-sm"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        {retainedReceipt && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] border-0 [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 text-center"
          >
            <div
              data-sq="tile-lg"
              data-sq-border="none"
              className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center mb-3"
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 className="t-card font-semibold text-black dark:text-white mb-1">
              {isRtl ? 'وصل التحصيل جاهز' : 'Ticket de Caisse Validé'}
            </h3>
            <p className="t-small mb-4 tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{retainedReceipt.receiptNumber}</p>
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] border-0 p-4 t-cap space-y-2 text-start mb-5"
            >
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-semibold">{retainedReceipt.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Service :</span>
                <span className="font-semibold">{retainedReceipt.serviceName}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-[var(--atr-divider)]">
                <span>Total :</span>
                <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                  {formatMoney(retainedReceipt.amountDzd + retainedReceipt.timbreFiscalDzd, 'DZD')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button
                type="button"
                tone="soft"
                size={40}
                onClick={() => setLastReceipt(null)}
              >
                Fermer
              </Button>
              <Button
                type="button"
                tone="accent"
                size={40}
                leading={<Printer size={14} />}
                onClick={() => {
                  window.print();
                  setLastReceipt(null);
                }}
              >
                Imprimer
              </Button>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
});

SalonQuickChairKiosk.displayName = 'SalonQuickChairKiosk';
