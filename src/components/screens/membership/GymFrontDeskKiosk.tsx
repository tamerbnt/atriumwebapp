import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Scan,
  UserCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Printer,
  CheckCircle2,
  Ticket,
  CreditCard,
  Banknote,
  Building2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentMemberCheckInsFromState,
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
  InspectorProgressBar,
  InspectorListItem,
  buildBranchesByIdMap,
  resolveRecordBranch,
} from '../../ui/kinetic';

export const GymFrontDeskKiosk: React.FC = React.memo(() => {
  const {
    members,
    branches,
    currentBranch,
    currentBranchId,
    currentBusinessId,
    account,
    currentUser,
    memberCheckIns,
    walkInTickets,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      members: selectCurrentMembersFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      currentBranchId: s.currentBranchId,
      currentBusinessId: s.currentBusinessId,
      account: s.account,
      currentUser: s.currentUser,
      memberCheckIns: selectCurrentMemberCheckInsFromState(s),
      walkInTickets: s.walkInTickets,
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const {
    addMemberCheckIn,
    addWalkInTicket,
    updateMember,
    retryCloudSync,
  } = useAtriumActions();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0,
  });

  const isRtl = language === 'ar';
  const [scanInput, setScanInput] = useState('');
  const [logFilter, setLogFilter] = useState<'All' | 'Granted' | 'Alert'>('All');
  const [lastCheckInResult, setLastCheckInResult] = useState<any>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInAmount, setWalkInAmount] = useState('500');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState('cash');
  const [lastPrintedTicket, setLastPrintedTicket] = useState<any>(null);
  const [inspectedLogId, setInspectedLogId] = useState<string | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [lastCheckInResult, isWalkInModalOpen]);

  const playChime = useCallback((type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(164.81, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {}
  }, []);

  const searchResults = useMemo(() => {
    if (!scanInput.trim() || scanInput.length < 2) return [];
    const q = scanInput.toLowerCase().trim();
    return members
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          (m.phoneNumber && m.phoneNumber.includes(q)) ||
          (m.cardId && m.cardId.toLowerCase().includes(q)) ||
          m.id.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [members, scanInput]);

  const handleValidateCheckIn = useCallback(
    (member: any) => {
      const now = new Date();
      const expiry = member.expirationDate ? new Date(member.expirationDate) : null;
      const daysUntilExpiry = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / 864e5)
        : 999;

      let status = 'Granted';
      let message = isRtl ? 'تم التحقق من الاشتراك بنجاح' : 'Accès validé avec succès';

      if (member.status === 'Frozen' || member.status === 'Suspended') {
        status = 'Denied_Frozen';
        message = isRtl ? 'الاشتراك مجمّد حالياً' : 'Abonnement actuellement gelé';
      } else if (member.status === 'Expired' || (expiry && expiry < now)) {
        status = 'Denied_Expired';
        message = isRtl ? 'الاشتراك منتهي الصلاحية' : 'Abonnement expiré';
      } else if (daysUntilExpiry <= 5) {
        status = 'Warning_Expiring';
        message = isRtl
          ? `تنبيه: الاشتراك ينتهي خلال ${daysUntilExpiry} أيام`
          : `Attention: Expire dans ${daysUntilExpiry} jour(s)`;
      }

      const remainingBefore = member.remainingSessions;
      let remainingAfter = remainingBefore;
      if (remainingBefore !== undefined && remainingBefore !== null) {
        if (remainingBefore <= 0) {
          status = 'Denied_Expired';
          message = isRtl ? 'نفدت جميع الحصص المتاحة في الباقة' : 'Nombre de séances épuisé';
        } else {
          remainingAfter = remainingBefore - 1;
          updateMember(member.id, {
            remainingSessions: remainingAfter,
            status: remainingAfter === 0 ? 'Expired' : member.status,
          });
        }
      }

      if (status === 'Granted') playChime('success');
      else if (status === 'Warning_Expiring') playChime('warning');
      else playChime('error');

      const checkInLog = {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        accountId: account?.id || 'acc_01',
        businessId: currentBusinessId || 'biz_01',
        branchId: currentBranchId || member.branchId || 'branch_gym_main',
        staffId: currentUser?.id || 'staff_01',
        memberId: member.id,
        memberName: member.fullName,
        planId: member.membershipPlanId || 'standard_plan',
        planName: member.membershipPlanName || 'Pass Standard',
        timestamp: new Date().toISOString(),
        accessStatus: status,
        remainingSessionsBefore: remainingBefore,
        remainingSessionsAfter: remainingAfter,
        checkInMethod: 'barcode_scanner',
      };

      addMemberCheckIn(checkInLog as any);
      setLastCheckInResult({ status, message, member });
      setScanInput('');
    },
    [account, currentBusinessId, currentBranchId, currentUser, isRtl, playChime, updateMember, addMemberCheckIn]
  );

  const handleScanSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!scanInput.trim()) return;
      const trimmed = scanInput.trim();
      const exactMatch = members.find(
        (m) =>
          m.cardId?.toLowerCase() === trimmed.toLowerCase() ||
          m.id.toLowerCase() === trimmed.toLowerCase() ||
          (m.phoneNumber && m.phoneNumber.trim() === trimmed)
      );
      if (exactMatch) handleValidateCheckIn(exactMatch);
      else if (searchResults.length === 1) handleValidateCheckIn(searchResults[0]);
      else if (searchResults.length === 0) {
        playChime('error');
        showToast?.({
          type: 'error',
          title: isRtl ? 'لم يتم العثور على المشترك' : 'Adhérent introuvable',
          message: isRtl ? 'تأكد من رقم البطاقة أو الاسم' : 'Aucun membre associé à ce code ou numéro',
        });
      }
    },
    [scanInput, members, searchResults, handleValidateCheckIn, playChime, showToast, isRtl]
  );

  const handleCreateWalkIn = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const amountNum = parseFloat(walkInAmount) || 500;
      const timbre = walkInPaymentMethod === 'cash' ? calculateArt317Timbre(amountNum) : 0;
      const ticket = {
        id: `wi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        accountId: account?.id || 'acc_01',
        businessId: currentBusinessId || 'biz_01',
        branchId: currentBranchId || 'branch_gym_main',
        staffId: currentUser?.id || 'staff_frontdesk_01',
        ticketNumber: `WI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: walkInName.trim() || (isRtl ? 'زبون غير مسجل' : 'Client Séance Libre'),
        phone: walkInPhone.trim() || undefined,
        amountDzd: amountNum,
        paymentMethod: walkInPaymentMethod,
        timbreFiscalDzd: timbre,
        issuedAt: new Date().toISOString(),
      };
      addWalkInTicket(ticket as any);
      setLastPrintedTicket(ticket);
      setIsWalkInModalOpen(false);
      setWalkInName('');
      setWalkInPhone('');
      playChime('success');
      showToast?.({
        type: 'success',
        title: isRtl ? 'تم إصدار تذكرة الحصة' : 'Pass Séance Émis',
        message: `${ticket.ticketNumber} — ${formatMoney(ticket.amountDzd + ticket.timbreFiscalDzd, 'DZD')}`,
      });
    },
    [walkInAmount, walkInPaymentMethod, account, currentBusinessId, currentBranchId, currentUser, walkInName, walkInPhone, isRtl, addWalkInTicket, playChime, showToast]
  );

  const { activeMembersCount, grantedLogsCount, alertLogsCount, visibleLogs } = useMemo(() => {
    const active = members.filter((m) => m.status === 'Active').length;
    const granted = memberCheckIns.filter((l) => l.accessStatus === 'Granted').length;
    const alerts = memberCheckIns.filter((l) => l.accessStatus !== 'Granted').length;
    const filtered = memberCheckIns.filter((l) => {
      if (logFilter === 'Granted') return l.accessStatus === 'Granted';
      if (logFilter === 'Alert') return l.accessStatus !== 'Granted';
      return true;
    });
    return {
      activeMembersCount: active,
      grantedLogsCount: granted,
      alertLogsCount: alerts,
      visibleLogs: filtered.slice(0, 20),
    };
  }, [members, memberCheckIns, logFilter]);

  const inspectedLog = useMemo(
    () => (inspectedLogId ? visibleLogs.find((l) => l.id === inspectedLogId) || null : null),
    [inspectedLogId, visibleLogs]
  );
  const inspectedMember = useMemo(
    () => (inspectedLog ? members.find((m) => m.id === inspectedLog.memberId) || null : null),
    [inspectedLog, members]
  );

  if (showSkeleton && (members.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <ScreenPod>
          <SkeletonKioskGrid count={8} />
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
        icon={<Scan size={22} />}
        title={isRtl ? 'الاستقبال' : language === 'en' ? 'Front Desk' : 'Accueil'}
        primaryAction={{
          label: isRtl ? 'بيع تذكرة حصة (Pass)' : 'Vendre Pass Séance',
          icon: <Ticket size={16} />,
          onClick: () => setIsWalkInModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isRtl ? 'بوابة الدخول وتدفق الاستقبال' : language === 'en' ? 'Access Control & Check-Ins' : 'Contrôle d’Accès & Passages Directs'}
        language={language}
        primaryCard={{
          label: isRtl ? 'دخول اليوم المقبول' : language === 'en' ? 'Granted Check-Ins' : 'Passages Validés',
          badgeText: `↗ ${memberCheckIns.length} total`,
          count: grantedLogsCount,
          tone: 'emerald',
          isActive: logFilter === 'Granted',
          onToggle: () => setLogFilter((p) => (p === 'Granted' ? 'All' : 'Granted')),
        }}
        secondaryCard={{
          label: isRtl ? 'تنبيهات ورفض البوابة' : language === 'en' ? 'Expiring & Denied' : 'Alertes & Refus Portique',
          badgeText: isRtl ? 'تنبيهات' : 'alertes',
          count: alertLogsCount,
          tone: 'terracotta',
          isActive: logFilter === 'Alert',
          onToggle: () => setLogFilter((p) => (p === 'Alert' ? 'All' : 'Alert')),
        }}
        darkCard={{
          label: isRtl ? 'المشتركون النشطون' : language === 'en' ? 'Active Members' : 'Adhérents Actifs',
          badgePrefix: '',
          badgeCount: walkInTickets.length,
          badgeSuffix: isRtl ? 'تذاكر' : 'pass',
          valuePrefix: '',
          valueCount: activeMembersCount,
          caption: `${currentBranch?.name || 'Portique'} · ${isRtl ? 'متصل' : 'Opérationnel'}`,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScreenPod>
            <form onSubmit={handleScanSubmit} className="relative space-y-3">
              <label
                htmlFor="barcodeInput"
                className="block text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white"
              >
                {isRtl
                  ? 'مسح رمز الباركود أو بطاقة RFID أو الاسم'
                  : 'Scanner Code-Barres / Badge RFID / Recherche Adhérent'}
              </label>
              <div className="relative">
                <input
                  id="barcodeInput"
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder={
                    isRtl
                      ? 'امسح الباركود أو ابدأ بالكتابة...'
                      : 'Scanner le badge ou taper le nom/téléphone...'
                  }
                  className="w-full h-14 pl-12 pr-28 rounded-2xl border-2 border-[#d4522f]/40 focus:border-[#d4522f] focus:ring-4 focus:ring-[#d4522f]/15 bg-white dark:bg-[#262422] text-base font-medium text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 transition-all"
                  dir="ltr"
                />
                <Scan size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4522f]" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  {isRtl ? 'تحقق' : 'Valider'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl shadow-xl overflow-hidden divide-y divide-[#E6DED6]/60 dark:divide-[#3A3734]">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleValidateCheckIn(m)}
                      className="w-full text-left rtl:text-right p-3 hover:bg-[#F3EDE7]/50 dark:hover:bg-[#262422] flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center font-bold text-xs text-[#d4522f]">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black dark:text-white">{m.fullName}</p>
                          <p className="text-[11px] text-black/62 dark:text-white/65">
                            {m.phoneNumber || m.id} • {m.membershipPlanName || 'Pass'} •{' '}
                            {resolveRecordBranch(m, branchesById, currentBranch, language).name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          m.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {lastCheckInResult && (
              <div
                className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-200 ${
                  lastCheckInResult.status === 'Granted'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : lastCheckInResult.status === 'Warning_Expiring'
                    ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      lastCheckInResult.status === 'Granted'
                        ? 'bg-emerald-600 text-white'
                        : lastCheckInResult.status === 'Warning_Expiring'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {lastCheckInResult.status === 'Granted' ? (
                      <CheckCircle2 size={24} />
                    ) : lastCheckInResult.status === 'Warning_Expiring' ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <XCircle size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-black dark:text-white">
                        {lastCheckInResult.member.fullName}
                      </h3>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          lastCheckInResult.status === 'Granted'
                            ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                            : lastCheckInResult.status === 'Warning_Expiring'
                            ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                            : 'bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {lastCheckInResult.status === 'Granted'
                          ? isRtl ? 'دخول مسموح' : 'ACCÈS AUTORISÉ'
                          : lastCheckInResult.status === 'Warning_Expiring'
                          ? isRtl ? 'ينتهي قريباً' : 'EXPIRATION PROCHE'
                          : isRtl ? 'دخول مرفوض' : 'ACCÈS REFUSÉ'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-black/75 dark:text-white/80 mt-1">
                      {lastCheckInResult.message}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#E6DED6] dark:border-[#3A3734] text-xs">
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">
                          {isRtl ? 'الاشتراك' : 'Formule'}
                        </span>
                        <span className="font-semibold text-black dark:text-white">
                          {lastCheckInResult.member.membershipPlanName || 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">
                          {isRtl ? 'الفرع' : 'Branche'}
                        </span>
                        <span className="font-semibold text-black dark:text-white">
                          {resolveRecordBranch(lastCheckInResult.member, branchesById, currentBranch, language).name}
                        </span>
                      </div>
                      <div>
                        <span className="text-black/62 dark:text-white/65 block text-[11px]">
                          {isRtl ? 'الحصص المتبقية' : 'Séances restantes'}
                        </span>
                        <span className="font-semibold text-black dark:text-white tabular-nums">
                          {lastCheckInResult.member.remainingSessions !== undefined
                            ? `${lastCheckInResult.member.remainingSessions} séances`
                            : 'Illimité'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScreenPod>
        </div>

        <ScreenPod className="flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6]/80 dark:border-[#3A3734]">
            <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-[#d4522f]" />
              <span>{isRtl ? 'سجل الدخول اللحظي' : 'Journal des Passages Direct'}</span>
            </h2>
            <span className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums">
              {visibleLogs.length} {isRtl ? 'عمليات' : 'entrées'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {visibleLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-black/62 dark:text-white/65">
                <UserCheck size={36} className="text-black/45 dark:text-white/45 mb-2" />
                <p className="text-xs font-semibold text-black/75 dark:text-white/80">
                  {isRtl ? 'لا توجد عمليات دخول مسجلة اليوم بعد' : "Aucun passage enregistré aujourd'hui"}
                </p>
                <p className="text-[11px] text-black/62 dark:text-white/65 mt-1">
                  {isRtl ? 'امسح الباركود للبدء في التسجيل' : 'Scannez un badge pour voir les entrées en direct'}
                </p>
              </div>
            ) : (
              visibleLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={(e) => {
                    setDrawerOpenerEl(e.currentTarget);
                    setInspectedLogId(log.id);
                  }}
                  className="w-full text-left rtl:text-right p-3 rounded-2xl bg-white dark:bg-[#262422] border border-[#E6DED6]/80 dark:border-[#3A3734] hover:border-[#d4522f]/50 flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        log.accessStatus === 'Granted'
                          ? 'bg-emerald-500'
                          : log.accessStatus === 'Warning_Expiring'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-black dark:text-white truncate">{log.memberName}</p>
                      <p className="text-[11px] text-black/62 dark:text-white/65 truncate flex items-center gap-1">
                        <span>{log.planName}</span>
                        <span>·</span>
                        <Building2 size={10} className="inline shrink-0" />
                        <span>{resolveRecordBranch(log, branchesById, currentBranch, language).name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums block">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        log.accessStatus === 'Granted'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : log.accessStatus === 'Warning_Expiring'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {log.accessStatus}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScreenPod>
      </div>

      <KineticSlideOverInspector<any>
        isOpen={inspectedLog !== null}
        item={inspectedLog}
        allItems={visibleLogs}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectedLog?.memberName || ''}
        subtitle={
          inspectedLog
            ? `${inspectedLog.planName} · ${new Date(inspectedLog.timestamp).toLocaleTimeString()}`
            : undefined
        }
        avatarText={inspectedLog ? inspectedLog.memberName.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={inspectedLog?.planName}
        branchName={
          inspectedLog
            ? resolveRecordBranch(inspectedLog, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          inspectedLog
            ? inspectedLog.accessStatus === 'Granted'
              ? isRtl ? 'دخول مسموح' : 'Accordé'
              : inspectedLog.accessStatus === 'Warning_Expiring'
              ? isRtl ? 'ينتهي قريباً' : 'Expire bientôt'
              : isRtl ? 'مرفوض' : 'Refusé'
            : undefined
        }
        statusClassName={
          inspectedLog?.accessStatus === 'Granted'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : inspectedLog?.accessStatus === 'Warning_Expiring'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
        }
        tabs={[
          { id: 'overview', label: isRtl ? 'المرور الحالي' : 'Passage & Accès' },
          { id: 'plan', label: isRtl ? 'الاشتراك' : 'Forfait & Séances' },
          { id: 'history', label: isRtl ? 'سجل البوابة' : 'Historique portique' },
        ]}
        onClose={() => setInspectedLogId(null)}
        onSelectItem={(l) => setInspectedLogId(l.id)}
        renderBody={(log, activeTab) => {
          const memberLogs = visibleLogs.filter((v) => v.memberId === log.memberId);
          const remaining = inspectedMember?.remainingSessions ?? log.remainingSessionsAfter ?? 12;
          const pct = Math.min(100, Math.round((remaining / 30) * 100));

          if (activeTab === 'plan') {
            return (
              <InspectorSection index={0} title={isRtl ? 'تفاصيل الاشتراك' : 'Détails du forfait'}>
                <InspectorCard>
                  <InspectorKeyValue label={isRtl ? 'الباقة' : 'Formule'} value={log.planName} tone="accent" mono={false} />
                  <InspectorKeyValue
                    label={isRtl ? 'الحصص المتبقية' : 'Séances restantes'}
                    value={`${remaining}`}
                    tone={remaining <= 3 ? 'danger' : 'ok'}
                  />
                  <InspectorKeyValue
                    label={isRtl ? 'الهاتف' : 'Téléphone'}
                    value={inspectedMember?.phoneNumber || '—'}
                    copyText={inspectedMember?.phoneNumber}
                    isLast
                  />
                  <InspectorProgressBar percent={pct} tone={remaining <= 3 ? 'danger' : 'ok'} />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (activeTab === 'history') {
            return (
              <InspectorSection index={0} title={isRtl ? 'آخر عمليات الدخول' : 'Passages récents'}>
                <InspectorCard>
                  {(memberLogs.length > 0 ? memberLogs.slice(0, 5) : [log]).map((entry, idx, arr) => (
                    <InspectorListItem
                      key={entry.id}
                      title={entry.planName}
                      subtitle={new Date(entry.timestamp).toLocaleString()}
                      badge={{
                        label: entry.accessStatus === 'Granted' ? (isRtl ? 'مقبول' : 'Accepté') : (isRtl ? 'تنبيه' : 'Alerte'),
                        tone: entry.accessStatus === 'Granted' ? 'ok' : 'danger',
                      }}
                      isLast={idx === arr.length - 1}
                    />
                  ))}
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isRtl ? 'إجراءات البوابة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 're-checkin',
                      label: isRtl ? 'تسجيل دخول' : 'Re-pointer',
                      icon: <UserCheck className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => {
                        if (inspectedMember) handleValidateCheckIn(inspectedMember);
                      },
                    },
                    {
                      id: 'walkin',
                      label: isRtl ? 'تذكرة' : 'Pass séance',
                      icon: <Ticket className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        setInspectedLogId(null);
                        setIsWalkInModalOpen(true);
                      },
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isRtl ? 'تفاصيل المسح' : 'Contrôle d’accès'}>
                <InspectorCard>
                  <InspectorKeyValue label="Badge ID" value={inspectedMember?.cardId || log.memberId} />
                  <InspectorKeyValue label={isRtl ? 'الطريقة' : 'Méthode'} value={log.checkInMethod || 'RFID / Barcode'} mono={false} />
                  <InspectorKeyValue label={isRtl ? 'التوقيت' : 'Horodatage'} value={new Date(log.timestamp).toLocaleTimeString()} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    {isRtl ? 'إصدار تذكرة حصة منفردة (Pass)' : 'Émission Pass Séance Libre'}
                  </h3>
                  <p className="text-[11px] text-black/62 dark:text-white/65">
                    {isRtl ? 'تسجيل دخول الزائر غير المشترك' : 'Entrée ponctuelle sans abonnement'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">
                  {isRtl ? 'اسم الزائر' : 'Nom du visiteur'}
                </label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder={isRtl ? 'محمد بلقاسم' : 'Ex: Karim Benali'}
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">
                  {isRtl ? 'رقم الهاتف (اختياري)' : 'Numéro de téléphone (optionnel)'}
                </label>
                <input
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="0550 12 34 56"
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">
                  {isRtl ? 'مبلغ الحصة (د.ج)' : 'Tarif de la séance (DZD)'}
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['500', '800', '1000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWalkInAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono tabular-nums transition-all border cursor-pointer ${
                        walkInAmount === amt
                          ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                          : 'border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80'
                      }`}
                    >
                      {amt} DA
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  value={walkInAmount}
                  onChange={(e) => setWalkInAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-bold font-mono tabular-nums text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">
                  {isRtl ? 'طريقة الدفع' : 'Mode de Paiement'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      walkInPaymentMethod === 'cash'
                        ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                        : 'border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80'
                    }`}
                  >
                    <Banknote size={14} />
                    <span>{isRtl ? 'نقداً' : 'Espèces'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('baridimob')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      walkInPaymentMethod === 'baridimob'
                        ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                        : 'border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80'
                    }`}
                  >
                    <span>BaridiMob</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('cib')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      walkInPaymentMethod === 'cib'
                        ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                        : 'border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>CIB</span>
                  </button>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{isRtl ? 'تأكيد وطباعة التذكرة' : 'Valider & Imprimer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lastPrintedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white mb-1">
              {isRtl ? 'تذكرة الحصة جاهزة' : 'Pass Séance Validé'}
            </h3>
            <p className="text-xs mb-4 font-mono font-bold text-[#d4522f] tabular-nums">
              {lastPrintedTicket.ticketNumber}
            </p>
            <div className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl p-4 text-xs space-y-2 text-left mb-5">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">{isRtl ? 'الزبون' : 'Client'}</span>
                <span className="font-semibold text-black dark:text-white">
                  {lastPrintedTicket.clientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">{isRtl ? 'المبلغ' : 'Montant'}</span>
                <span className="font-bold font-mono tabular-nums text-black dark:text-white">
                  {formatMoney(lastPrintedTicket.amountDzd, 'DZD')}
                </span>
              </div>
              {lastPrintedTicket.timbreFiscalDzd > 0 && (
                <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                  <span>{isRtl ? 'طابع المادة 317' : 'Timbre Art. 317'}</span>
                  <span>+{lastPrintedTicket.timbreFiscalDzd} DA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-[#3A3734] font-bold">
                <span>{isRtl ? 'الإجمالي المقبوض' : 'Total Reçu'}</span>
                <span className="text-[#d4522f] font-mono tabular-nums">
                  {formatMoney(lastPrintedTicket.amountDzd + lastPrintedTicket.timbreFiscalDzd, 'DZD')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLastPrintedTicket(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 transition-colors cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setLastPrintedTicket(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={14} />
                <span>{isRtl ? 'طباعة' : 'Imprimer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

GymFrontDeskKiosk.displayName = 'GymFrontDeskKiosk';
