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
  showToast,
} from '../../../services/store';
import { calculateArt317Timbre, formatMoney } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
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
      if (current.stage === 'waiting') {
        setActiveStations((prev) => ({
          ...prev,
          [stationKey]: { ...current, stage: 'in_progress', startTime: Date.now() },
        }));
        showToast?.({
          type: 'info',
          title: isRtl ? 'بدء تقديم الخدمة' : 'Prestation Démarrée',
          message: `${current.clientName} — ${current.serviceName}`,
        });
      } else if (current.stage === 'in_progress') {
        setActiveStations((prev) => ({
          ...prev,
          [stationKey]: { ...current, stage: 'completed' },
        }));
        showToast?.({
          type: 'success',
          title: isRtl ? 'اكتملت الخدمة' : 'Prestation Terminée',
          message: isRtl ? 'جاهز للتحصيل السريع' : "Prêt pour l'encaissement rapide",
        });
      } else if (current.stage === 'completed') {
        setCheckoutModalStationKey(stationKey);
      }
    },
    [activeStations, showToast, isRtl]
  );

  const handleConfirmCheckout = useCallback(() => {
    if (!checkoutModalStationKey) return;
    const current = activeStations[checkoutModalStationKey];
    if (!current) return;
    const timbre = paymentMethod === 'cash' ? calculateArt317Timbre(current.servicePriceDzd) : 0;
    const receiptNum = `REC-SAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveStations((prev) => {
      const copy = { ...prev };
      delete copy[checkoutModalStationKey];
      return copy;
    });
    setLastReceipt({
      clientName: current.clientName,
      serviceName: current.serviceName,
      amountDzd: current.servicePriceDzd,
      timbreFiscalDzd: timbre,
      paymentMethod,
      receiptNumber: receiptNum,
    });
    setCheckoutModalStationKey(null);
    showToast?.({
      type: 'success',
      title: isRtl ? 'تم التحصيل بنجاح' : 'Encaissement Réussi',
      message: `${current.clientName} — ${formatMoney(current.servicePriceDzd + timbre, 'DZD')}`,
    });
  }, [checkoutModalStationKey, activeStations, paymentMethod, showToast, isRtl]);

  const handleAddNewClientToStation = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const service = servicesCatalog.find((s) => s.id === selectedServiceId) || servicesCatalog[0];
      const stylist = staff.find((st) => st.id === selectedStylistId) || staff[0];
      setActiveStations((prev) => ({
        ...prev,
        [targetStationId]: {
          clientName: newClientName.trim() || (isRtl ? 'زبون صالون' : 'Client Salon'),
          serviceName: service?.name || 'Prestation Salon',
          servicePriceDzd: service?.price || 1500,
          stylistName: stylist?.fullName || 'Styliste',
          stylistId: stylist?.id || 'stf_01',
          stage: 'waiting',
          startTime: Date.now(),
        },
      }));
      setIsAddClientModalOpen(false);
      setNewClientName('');
      showToast?.({
        type: 'success',
        title: isRtl ? 'تم تثبيت الزبون' : 'Client Installé au Poste',
        message: `${targetStationId.toUpperCase()} — ${service?.name || 'Prestation'}`,
      });
    },
    [servicesCatalog, selectedServiceId, staff, selectedStylistId, targetStationId, newClientName, isRtl, showToast]
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
          <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {isRtl ? 'محطات العمل والخدمة السريعة' : 'Postes de Coiffage & Cabines'}
          </h2>
          <span className="text-xs font-medium text-black/62 dark:text-white/65 flex items-center gap-1.5">
            <Building2 size={13} className="text-[#d4522f]" />
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
                className={`rounded-[20px] border transition-all p-5 flex flex-col justify-between min-h-[290px] shadow-2xs ${
                  !isOccupied
                    ? 'bg-[#FBF8F5] dark:bg-[#1C1B1A] border-dashed border-[#D4C8BC] dark:border-[#3A3734]'
                    : active.stage === 'in_progress'
                    ? 'bg-white dark:bg-[#1C1B1A] border-[#d4522f] ring-2 ring-[#d4522f]/15'
                    : active.stage === 'completed'
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-400 dark:border-emerald-700'
                    : 'bg-white dark:bg-[#1C1B1A] border-[#E6DED6] dark:border-[#3A3734]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/62 dark:text-white/65 font-mono">
                      {ws.id.toUpperCase()} · {branchName}
                    </span>
                    {isOccupied ? (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
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
                      <span className="text-[11px] font-medium text-black/55 dark:text-white/55">
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
                    <h3 className="text-sm font-bold text-black dark:text-white mb-1 hover:text-[#d4522f] transition-colors">{ws.name}</h3>
                    {isOccupied ? (
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold shrink-0">
                            <User size={14} />
                          </div>
                          <span className="font-bold text-black dark:text-white truncate">{active.clientName}</span>
                        </div>
                        <div className="bg-[#F3EDE7] dark:bg-[#262422] rounded-xl p-2.5">
                          <span className="text-[11px] text-black/62 dark:text-white/65 block">
                            {isRtl ? 'الخدمة' : 'Prestation'}
                          </span>
                          <span className="font-semibold text-black dark:text-white">{active.serviceName}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 font-bold">
                          <span>{isRtl ? 'السعر' : 'Tarif'} :</span>
                          <span className="text-[#d4522f] font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-base">
                            {formatMoney(active.servicePriceDzd, 'DZD')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center text-black/55 dark:text-white/55">
                        <Scissors size={26} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">{isRtl ? 'المحطة شاغرة حالياً' : 'Poste disponible'}</p>
                      </div>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-[#E6DED6]/60 dark:border-[#3A3734]">
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStage(ws.id)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                        active.stage === 'waiting'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : active.stage === 'in_progress'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#d4522f] hover:bg-[#b03b1b] text-white'
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
                      className="w-full py-2.5 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] hover:border-[#d4522f] hover:bg-[#d4522f]/5 text-xs font-semibold text-black/75 dark:text-white/80 hover:text-[#d4522f] transition-all flex items-center justify-center gap-1 cursor-pointer"
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
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-black dark:text-white mb-1">
              {isRtl ? 'تحصيل فاتورة الصالون' : 'Encaissement Express Salon'}
            </h3>
            <p className="text-xs text-black/62 dark:text-white/65 mb-4">
              {activeStations[checkoutModalStationKey].clientName} — {activeStations[checkoutModalStationKey].serviceName}
            </p>
            <div className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl p-4 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span>{isRtl ? 'سعر الخدمة' : 'Prestation'}</span>
                <span className="font-mono font-bold">
                  {formatMoney(activeStations[checkoutModalStationKey].servicePriceDzd, 'DZD')}
                </span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>{isRtl ? 'طابع المادة 317' : 'Timbre Art. 317'}</span>
                  <span>+{calculateArt317Timbre(activeStations[checkoutModalStationKey].servicePriceDzd)} DA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-[#3A3734] font-bold text-sm">
                <span>{isRtl ? 'الإجمالي' : 'Total Net'}</span>
                <span className="text-[#d4522f] font-mono">
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
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    paymentMethod === pm
                      ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
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
                className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] dark:bg-[#262422] text-xs font-semibold cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                className="flex-1 py-2.5 rounded-xl bg-[#d4522f] text-white text-xs font-semibold cursor-pointer"
              >
                {isRtl ? 'تأكيد' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-black dark:text-white">
                {isRtl ? 'تسكين زبون' : 'Installer un Client au Fauteuil'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/62 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddNewClientToStation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">{isRtl ? 'محطة العمل' : 'Poste'}</label>
                <select
                  value={targetStationId}
                  onChange={(e) => setTargetStationId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium"
                >
                  {workstationsList.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{isRtl ? 'اسم الزبون' : 'Nom du client'}</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Karim Mansouri"
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{isRtl ? 'الخدمة' : 'Prestation'}</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium"
                >
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatMoney(s.price, 'DZD')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{isRtl ? 'المصففة' : 'Styliste'}</label>
                <select
                  value={selectedStylistId}
                  onChange={(e) => setSelectedStylistId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium"
                >
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] dark:bg-[#262422] text-xs font-semibold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#d4522f] text-white text-xs font-semibold cursor-pointer"
                >
                  {isRtl ? 'تسكين' : 'Installer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white mb-1">
              {isRtl ? 'وصل التحصيل جاهز' : 'Ticket de Caisse Validé'}
            </h3>
            <p className="text-xs mb-4 font-mono font-bold text-[#d4522f]">{lastReceipt.receiptNumber}</p>
            <div className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl p-4 text-xs space-y-2 text-left mb-5">
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-semibold">{lastReceipt.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Service :</span>
                <span className="font-semibold">{lastReceipt.serviceName}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-[#E6DED6] dark:border-[#3A3734]">
                <span>Total :</span>
                <span className="text-[#d4522f] font-mono">
                  {formatMoney(lastReceipt.amountDzd + lastReceipt.timbreFiscalDzd, 'DZD')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLastReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] dark:bg-[#262422] text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setLastReceipt(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#d4522f] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SalonQuickChairKiosk.displayName = 'SalonQuickChairKiosk';
