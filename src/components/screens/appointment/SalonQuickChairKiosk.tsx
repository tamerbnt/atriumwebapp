import React, { useState, useMemo, useCallback } from 'react';
import {
  Scissors,
  CheckCircle2,
  Play,
  Check,
  CreditCard,
  Banknote,
  Plus,
  User,
  Printer,
  Building2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentServicesFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { cloneSnapshot, pickLocalizedText, registerUndoEntry } from '../../../services/undoEngine';
import { calculateArt317Timbre, formatMoney } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
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
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const { retryCloudSync } = useAtriumActions();
  const isRtl = language === 'ar';

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0 || servicesCatalog.length > 0,
  });

  const [activeStations, setActiveStations] = useState<Record<string, any>>({});
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

  const metrics = useMemo(() => {
    const occupiedCount = workstationsList.filter((w) => Boolean(activeStations[w.id])).length;
    const freeCount = workstationsList.length - occupiedCount;
    const activeRevenue = Object.values(activeStations).reduce(
      (sum: number, st: any) => sum + Number(st?.servicePriceDzd || 0),
      0
    );
    return { occupiedCount, freeCount, activeRevenue };
  }, [workstationsList, activeStations]);

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
      if (!current) return;
      if (current.stage === 'waiting' || current.stage === 'in_progress') {
        const prevStations = cloneSnapshot(activeStations);
        const nextStage = current.stage === 'waiting' ? 'in_progress' : 'completed';
        const nextStations = {
          ...prevStations,
          [stationKey]: {
            ...current,
            stage: nextStage,
            ...(nextStage === 'in_progress' ? { startTime: Date.now() } : {}),
          },
        };
        setActiveStations(nextStations);
        registerUndoEntry({
          vertical: 'appointment_service',
          operationType: 'status',
          summary: pickLocalizedText(language, {
            en: nextStage === 'in_progress' ? `Started: ${current.clientName}` : `Completed: ${current.clientName}`,
            fr: nextStage === 'in_progress' ? `Prestation démarrée : ${current.clientName}` : `Prestation terminée : ${current.clientName}`,
            ar: nextStage === 'in_progress' ? `بدء الخدمة: ${current.clientName}` : `اكتملت الخدمة: ${current.clientName}`,
          }),
          entityLabel: current.clientName,
          toastType: nextStage === 'in_progress' ? 'info' : 'success',
          undo: () => setActiveStations(cloneSnapshot(prevStations)),
          redo: () => setActiveStations(cloneSnapshot(nextStations)),
        });
      } else if (current.stage === 'completed') {
        setCheckoutModalStationKey(stationKey);
      }
    },
    [activeStations, language]
  );

  const handleConfirmCheckout = useCallback(() => {
    if (!checkoutModalStationKey) return;
    const current = activeStations[checkoutModalStationKey];
    if (!current) return;
    const prevStations = cloneSnapshot(activeStations);
    const prevReceipt = cloneSnapshot(lastReceipt);
    const timbre = paymentMethod === 'cash' ? calculateArt317Timbre(current.servicePriceDzd) : 0;
    const receiptNum = `REC-SAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextStations = { ...prevStations };
    delete nextStations[checkoutModalStationKey];
    const nextReceipt = {
      clientName: current.clientName,
      serviceName: current.serviceName,
      amountDzd: current.servicePriceDzd,
      timbreFiscalDzd: timbre,
      paymentMethod,
      receiptNumber: receiptNum,
    };
    setActiveStations(nextStations);
    setLastReceipt(nextReceipt);
    setCheckoutModalStationKey(null);
    registerUndoEntry({
      vertical: 'appointment_service',
      operationType: 'create',
      summary: pickLocalizedText(language, {
        en: `Chair checkout: ${current.clientName}`,
        fr: `Encaissement réussi : ${current.clientName}`,
        ar: `تم تحصيل الزبون: ${current.clientName}`,
      }),
      entityLabel: current.clientName,
      toastType: 'success',
      undo: () => {
        setActiveStations(cloneSnapshot(prevStations));
        setLastReceipt(cloneSnapshot(prevReceipt));
      },
      redo: () => {
        setActiveStations(cloneSnapshot(nextStations));
        setLastReceipt(cloneSnapshot(nextReceipt));
      },
    });
  }, [checkoutModalStationKey, activeStations, lastReceipt, paymentMethod, language]);

  const handleAddNewClientToStation = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const service = servicesCatalog.find((s) => s.id === selectedServiceId) || servicesCatalog[0];
      const stylist = staff.find((st) => st.id === selectedStylistId) || staff[0];
      const prevStations = cloneSnapshot(activeStations);
      const clientLabel = newClientName.trim() || (isRtl ? 'زبون صالون' : 'Client Salon');
      const nextStations = {
        ...prevStations,
        [targetStationId]: {
          clientName: clientLabel,
          serviceName: service?.name || 'Prestation Salon',
          servicePriceDzd: service?.price || 1500,
          stylistName: stylist?.fullName || 'Styliste',
          stylistId: stylist?.id || 'stf_01',
          stage: 'waiting',
          startTime: Date.now(),
        },
      };
      setActiveStations(nextStations);
      setIsAddClientModalOpen(false);
      setNewClientName('');
      registerUndoEntry({
        vertical: 'appointment_service',
        operationType: 'create',
        summary: pickLocalizedText(language, {
          en: `Assigned ${clientLabel} to ${targetStationId.toUpperCase()}`,
          fr: `Client installé : ${clientLabel} (${targetStationId.toUpperCase()})`,
          ar: `تم تثبيت الزبون ${clientLabel}`,
        }),
        entityLabel: clientLabel,
        toastType: 'success',
        undo: () => setActiveStations(cloneSnapshot(prevStations)),
        redo: () => setActiveStations(cloneSnapshot(nextStations)),
      });
    },
    [servicesCatalog, selectedServiceId, staff, selectedStylistId, activeStations, targetStationId, newClientName, isRtl, language]
  );

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
        <div className="flex items-center justify-between pb-1">
          <h2 className="t-card font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {isRtl ? 'محطات العمل والخدمة السريعة' : 'Postes de Coiffage & Cabines'}
          </h2>
          <span className="t-small font-medium text-black/62 dark:text-white/65 flex items-center gap-2">
            <Building2 size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            {resolveRecordBranch({}, branchesById, currentBranch, language).name}
          </span>
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
                    : !isOccupied
                    ? ({ '--sq-stroke': '#D4C8BC' } as React.CSSProperties)
                    : undefined
                }
                className={`border transition-all p-5 flex flex-col justify-between min-h-[290px] ${
                  !isOccupied
                    ? 'bg-[#FBF8F5] dark:bg-[#1C1B1A] border-[#D4C8BC] dark:border-[#3A3734]'
                    : active.stage === 'in_progress'
                    ? 'bg-white dark:bg-[#1C1B1A] border-[#d4522f]'
                    : active.stage === 'completed'
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-400 dark:border-emerald-700'
                    : 'bg-white dark:bg-[#1C1B1A] border-[#E6DED6] dark:border-[#3A3734]'
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
                            ? 'bg-amber-50 text-amber-700'
                            : active.stage === 'in_progress'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
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
                          className="bg-[#F3EDE7] dark:bg-[#262422] p-3"
                        >
                          <span className="t-cap text-black/62 dark:text-white/65 block">
                            {isRtl ? 'الخدمة' : 'Prestation'}
                          </span>
                          <span className="font-semibold text-black dark:text-white">{active.serviceName}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 font-semibold">
                          <span>{isRtl ? 'السعر' : 'Tarif'} :</span>
                          <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums t-body">
                            {formatMoney(active.servicePriceDzd, 'DZD')}
                          </span>
                        </div>
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

                <div className="pt-4 border-t border-[#E6DED6]/60 dark:border-[#3A3734]">
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
                      data-sq-border="solid"
                      className="w-full py-2 px-3 border border-[#D4C8BC] dark:border-[#3A3734] hover:[--sq-stroke:#d4522f] hover:bg-[#d4522f]/5 t-small font-semibold text-black/75 dark:text-white/80 hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-all flex items-center justify-center gap-1 cursor-pointer"
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
              ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
              : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#F3EDE7] dark:bg-[#262422] text-black dark:text-white border border-[#E6DED6] dark:border-[#3A3734]'
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
                  <InspectorKeyValue label="Styliste" value={st?.stylistName || '—'} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (activeTab === 'checkout') {
            return (
              <InspectorSection index={0} title={isRtl ? 'قيمة الفاتورة' : 'Encaissement poste'}>
                <InspectorBigStat
                  value={st ? formatMoney(st.servicePriceDzd, 'DZD') : '0 DA'}
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
                  <InspectorKeyValue label="Montant en cours" value={st ? formatMoney(st.servicePriceDzd, 'DZD') : '—'} tone="accent" isLast />
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

      {checkoutModalStationKey && activeStations[checkoutModalStationKey] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="sq-elev-pop max-w-sm w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] w-full p-6"
            >
              <h3 className="t-card font-semibold text-black dark:text-white mb-1">
                {isRtl ? 'تحصيل فاتورة الصالون' : 'Encaissement Express Salon'}
              </h3>
              <p className="t-cap text-black/62 dark:text-white/65 mb-4">
                {activeStations[checkoutModalStationKey].clientName} — {activeStations[checkoutModalStationKey].serviceName}
              </p>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] p-4 t-cap space-y-2 mb-4"
              >
              <div className="flex justify-between">
                <span>{isRtl ? 'سعر الخدمة' : 'Prestation'}</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(activeStations[checkoutModalStationKey].servicePriceDzd, 'DZD')}
                </span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>{isRtl ? 'طابع المادة 317' : 'Timbre Art. 317'}</span>
                  <span>+{calculateArt317Timbre(activeStations[checkoutModalStationKey].servicePriceDzd)} DA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-[#3A3734] font-semibold t-label">
                <span>{isRtl ? 'الإجمالي' : 'Total Net'}</span>
                <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                  {formatMoney(
                    activeStations[checkoutModalStationKey].servicePriceDzd +
                      (paymentMethod === 'cash'
                        ? calculateArt317Timbre(activeStations[checkoutModalStationKey].servicePriceDzd)
                        : 0),
                    'DZD'
                  )}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {['cash', 'baridimob', 'cib'].map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  data-sq="ctl"
                  data-sq-border="solid"
                  style={paymentMethod === pm ? ({ '--sq-stroke': '#d4522f' } as React.CSSProperties) : undefined}
                  className={`py-2 px-2 t-small font-semibold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    paymentMethod === pm
                      ? 'border-[#d4522f] bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                      : 'border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80'
                  }`}
                >
                  {pm === 'cash' ? <Banknote size={15} /> : <CreditCard size={15} />}
                  <span>{pm === 'cash' ? 'Espèces' : pm === 'baridimob' ? 'BaridiMob' : 'CIB'}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutModalStationKey(null)}
                data-sq="ctl"
                data-sq-border="none"
                className="flex-1 py-2 bg-[#F3EDE7] dark:bg-[#262422] t-small font-semibold cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                data-sq="ctl"
                data-sq-border="none"
                className="flex-1 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold cursor-pointer"
              >
                {isRtl ? 'تأكيد' : 'Valider'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="sq-elev-pop max-w-md w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="t-card font-semibold text-black dark:text-white">
                  {isRtl ? 'تسكين زبون' : 'Installer un Client au Fauteuil'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/62 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddNewClientToStation} className="space-y-4">
                <div>
                  <label className="block t-small font-semibold mb-1">{isRtl ? 'محطة العمل' : 'Poste'}</label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full h-10 border border-[#D4C8BC] dark:border-[#3A3734] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] bg-[#FBF8F5] dark:bg-[#262422]"
                  >
                    <select
                      value={targetStationId}
                      onChange={(e) => setTargetStationId(e.target.value)}
                      className="w-full h-full px-3 bg-transparent border-0 t-small font-medium outline-none"
                    >
                      {workstationsList.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block t-small font-semibold mb-1">{isRtl ? 'اسم الزبون' : 'Nom du client'}</label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full h-10 border border-[#D4C8BC] dark:border-[#3A3734] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] bg-[#FBF8F5] dark:bg-[#262422]"
                  >
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ex: Karim Mansouri"
                      className="lbi-field px-3 bg-transparent border-0 t-small font-medium outline-none"
                      style={{ paddingInline: '12px' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block t-small font-semibold mb-1">{isRtl ? 'الخدمة' : 'Prestation'}</label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full h-10 border border-[#D4C8BC] dark:border-[#3A3734] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] bg-[#FBF8F5] dark:bg-[#262422]"
                  >
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full h-full px-3 bg-transparent border-0 t-small font-medium outline-none"
                    >
                      {servicesCatalog.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {formatMoney(s.price, 'DZD')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block t-small font-semibold mb-1">{isRtl ? 'المصففة' : 'Styliste'}</label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full h-10 border border-[#D4C8BC] dark:border-[#3A3734] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] bg-[#FBF8F5] dark:bg-[#262422]"
                  >
                    <select
                      value={selectedStylistId}
                      onChange={(e) => setSelectedStylistId(e.target.value)}
                      className="w-full h-full px-3 bg-transparent border-0 t-small font-medium outline-none"
                    >
                      {staff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddClientModalOpen(false)}
                    data-sq="ctl"
                    data-sq-border="none"
                    className="flex-1 py-2 bg-[#F3EDE7] dark:bg-[#262422] t-small font-semibold cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    data-sq="ctl"
                    data-sq-border="none"
                    className="flex-1 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold cursor-pointer"
                  >
                    {isRtl ? 'تسكين' : 'Installer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="sq-elev-pop max-w-sm w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] w-full p-6 text-center"
            >
              <div
                data-sq="tile-lg"
                data-sq-border="none"
                className="w-12 h-12 bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-3"
              >
                <CheckCircle2 size={24} />
              </div>
              <h3 className="t-card font-semibold text-black dark:text-white mb-1">
                {isRtl ? 'وصل التحصيل جاهز' : 'Ticket de Caisse Validé'}
              </h3>
              <p className="t-small mb-4 tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{lastReceipt.receiptNumber}</p>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] p-4 t-cap space-y-2 text-left mb-5"
              >
                <div className="flex justify-between">
                  <span>Client :</span>
                  <span className="font-semibold">{lastReceipt.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service :</span>
                  <span className="font-semibold">{lastReceipt.serviceName}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-[#E6DED6] dark:border-[#3A3734]">
                  <span>Total :</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                    {formatMoney(lastReceipt.amountDzd + lastReceipt.timbreFiscalDzd, 'DZD')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLastReceipt(null)}
                  data-sq="ctl"
                  data-sq-border="none"
                  className="flex-1 py-2 bg-[#F3EDE7] dark:bg-[#262422] t-small font-semibold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setLastReceipt(null);
                  }}
                  data-sq="ctl"
                  data-sq-border="none"
                  className="flex-1 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SalonQuickChairKiosk.displayName = 'SalonQuickChairKiosk';
