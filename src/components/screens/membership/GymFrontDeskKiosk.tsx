import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Scan,
  UserCheck,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Clock,
  Printer,
  Search,
  CheckCircle2,
  Ticket,
  Calendar,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Member, MemberCheckInLog, WalkInTicket } from '../../../types/index';
import { calculateArt317Timbre, formatMoney } from '../../../utils/rules';

export const GymFrontDeskKiosk: React.FC = () => {
  const {
    members,
    currentBranchId,
    currentBusinessId,
    account,
    currentUser,
    memberCheckIns,
    addMemberCheckIn,
    walkInTickets,
    addWalkInTicket,
    language,
    updateMember,
  } = useAtriumStore();

  const isRtl = language === 'ar';
  const [scanInput, setScanInput] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [lastCheckInResult, setLastCheckInResult] = useState<{
    status: 'Granted' | 'Warning_Expiring' | 'Denied_Expired' | 'Denied_Frozen';
    message: string;
    member: Member;
  } | null>(null);

  // Walk-in ticket state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInAmount, setWalkInAmount] = useState('500');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<'cash' | 'baridimob' | 'cib'>('cash');
  const [lastPrintedTicket, setLastPrintedTicket] = useState<WalkInTicket | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus scan input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastCheckInResult, isWalkInModalOpen]);

  // Audio synthesizer chime for access feedback
  const playChime = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
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
    } catch {
      // Audio not supported or blocked
    }
  };

  // Filter members by query
  const searchResults = useMemo(() => {
    if (!scanInput.trim() || scanInput.length < 2) return [];
    const q = scanInput.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.phoneNumber && m.phoneNumber.includes(q)) ||
        (m.cardId && m.cardId.toLowerCase().includes(q)) ||
        m.id.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [members, scanInput]);

  // Execute Check-In verification
  const handleValidateCheckIn = (member: Member) => {
    const now = new Date();
    const expiry = member.expirationDate ? new Date(member.expirationDate) : null;
    const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;

    let status: 'Granted' | 'Warning_Expiring' | 'Denied_Expired' | 'Denied_Frozen' = 'Granted';
    let message = isRtl ? 'تم التحقق من الاشتراك بنجاح' : 'Accès validé avec succès';

    if (member.status === 'Frozen') {
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

    // Handle session pack decrement
    let remainingBefore = member.remainingSessions;
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

    // Play feedback tone
    if (status === 'Granted') playChime('success');
    else if (status === 'Warning_Expiring') playChime('warning');
    else playChime('error');

    // Create traceable log
    const checkInLog: MemberCheckInLog = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      accountId: account?.id || 'acc_01',
      businessId: currentBusinessId || 'biz_01',
      branchId: currentBranchId || 'branch_gym_main',
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

    addMemberCheckIn(checkInLog);
    setLastCheckInResult({ status, message, member });
    setSelectedMember(member);
    setScanInput('');
  };

  // Submit scan form
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Check exact match by cardId or member ID
    const exactMatch = members.find(
      (m) =>
        m.cardId?.toLowerCase() === scanInput.trim().toLowerCase() ||
        m.id.toLowerCase() === scanInput.trim().toLowerCase() ||
        (m.phoneNumber && m.phoneNumber.trim() === scanInput.trim())
    );

    if (exactMatch) {
      handleValidateCheckIn(exactMatch);
    } else if (searchResults.length === 1) {
      handleValidateCheckIn(searchResults[0]);
    } else if (searchResults.length > 1) {
      // Keep results open for manual click
    } else {
      playChime('error');
      showToast({
        type: 'error',
        title: isRtl ? 'لم يتم العثور على المشترك' : 'Adhérent introuvable',
        message: isRtl ? 'تأكد من رقم البطاقة أو الاسم' : 'Aucun membre associé à ce code ou numéro',
      });
    }
  };

  // Generate walk-in ticket
  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(walkInAmount) || 500;
    const timbre = walkInPaymentMethod === 'cash' ? calculateArt317Timbre(amountNum) : 0;

    const ticket: WalkInTicket = {
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

    addWalkInTicket(ticket);
    setLastPrintedTicket(ticket);
    setIsWalkInModalOpen(false);
    setWalkInName('');
    setWalkInPhone('');
    playChime('success');

    showToast({
      type: 'success',
      title: isRtl ? 'تم إصدار تذكرة الحصة' : 'Pass Séance Émis',
      message: `${ticket.ticketNumber} — ${formatMoney(ticket.amountDzd + ticket.timbreFiscalDzd, 'DZD')}`,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center text-xl shrink-0">
            <Scan size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isRtl ? 'كشك الاستقبال ومسح الدخول السريع' : 'Kiosk Accueil & Pointage Salle'}</span>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                {isRtl ? 'مباشر' : 'Live Kiosk'}
              </span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isRtl
                ? 'تحقق فوري من البطاقات والتذاكر في أقل من 3 ثوانٍ'
                : 'Validation instantanée des abonnements et vente des pass séance'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWalkInModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Ticket size={16} />
            <span>{isRtl ? 'بيع تذكرة حصة (Pass)' : 'Vendre Pass Séance'}</span>
          </button>
        </div>
      </div>

      {/* Main Barcode & Search Trigger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Scan & Active Resolution */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
            <form onSubmit={handleScanSubmit} className="relative">
              <label
                htmlFor="barcodeInput"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2"
              >
                {isRtl ? 'مسح رمز الباركود أو بطاقة RFID أو الاسم' : 'Scanner Code-Barres / Badge RFID / Recherche Adhérent'}
              </label>
              <div className="relative">
                <input
                  id="barcodeInput"
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder={isRtl ? 'امسح الباركود أو ابدأ بالكتابة...' : 'Scanner le badge ou taper le nom/téléphone...'}
                  className="w-full h-14 pl-12 pr-28 rounded-2xl border-2 border-[#C4785A]/40 focus:border-[#C4785A] focus:ring-4 focus:ring-[#C4785A]/15 bg-neutral-50 dark:bg-neutral-800/60 text-base font-medium text-neutral-900 dark:text-white transition-all"
                  dir="ltr"
                />
                <Scan
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C4785A]"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {isRtl ? 'تحقق' : 'Valider'}
                </button>
              </div>

              {/* Autocomplete dropdown if typing */}
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                  {searchResults.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleValidateCheckIn(m)}
                      className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-[#C4785A]">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">{m.fullName}</p>
                          <p className="text-2xs text-neutral-500">{m.phoneNumber || m.id} • {m.membershipPlanName || 'Pass'}</p>
                        </div>
                      </div>
                      <span
                        className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                          m.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {/* Live Scan Result Callout */}
            {lastCheckInResult && (
              <div
                className={`mt-6 p-5 rounded-2xl border transition-all animate-in fade-in duration-200 ${
                  lastCheckInResult.status === 'Granted'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : lastCheckInResult.status === 'Warning_Expiring'
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        {lastCheckInResult.member.fullName}
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          lastCheckInResult.status === 'Granted'
                            ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                            : lastCheckInResult.status === 'Warning_Expiring'
                            ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                            : 'bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {lastCheckInResult.status === 'Granted'
                          ? isRtl ? 'دخول مسموح' : 'ACCÈS AUTORISÉ'
                          : lastCheckInResult.status === 'Warning_Expiring'
                          ? isRtl ? 'ينتهي قريباً' : 'EXPIRATION PROCHE'
                          : isRtl ? 'دخول مرفوض' : 'ACCÈS REFUSÉ'}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-1">
                      {lastCheckInResult.message}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-2xs">{isRtl ? 'الاشتراك' : 'Formule'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {lastCheckInResult.member.membershipPlanName || 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-2xs">{isRtl ? 'تاريخ الانتهاء' : 'Validité jusqu\'au'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {lastCheckInResult.member.expirationDate || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-2xs">{isRtl ? 'الحصص المتبقية' : 'Séances restantes'}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
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
          </div>

          {/* Quick Access Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs">
              <span className="text-2xs text-neutral-500 font-semibold block uppercase">
                {isRtl ? 'دخول اليوم' : 'Check-ins du Jour'}
              </span>
              <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1 block">
                {memberCheckIns.length}
              </span>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs">
              <span className="text-2xs text-neutral-500 font-semibold block uppercase">
                {isRtl ? 'تذاكر الحصة' : 'Pass Séance Émis'}
              </span>
              <span className="text-xl font-bold font-mono text-[#C4785A] mt-1 block">
                {walkInTickets.length}
              </span>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs">
              <span className="text-2xs text-neutral-500 font-semibold block uppercase">
                {isRtl ? 'مشتركون نشطون' : 'Adhérents Actifs'}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                {members.filter((m) => m.status === 'Active').length}
              </span>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs">
              <span className="text-2xs text-neutral-500 font-semibold block uppercase">
                {isRtl ? 'حالة البوابة' : 'Portique'}
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isRtl ? 'متصل' : 'Opérationnel'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Live Check-In Feed */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-[#C4785A]" />
              <span>{isRtl ? 'سجل الدخول اللحظي' : 'Journal des Passages Direct'}</span>
            </h3>
            <span className="text-2xs text-neutral-400 font-mono">
              {memberCheckIns.length} {isRtl ? 'عمليات' : 'enregistrements'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
            {memberCheckIns.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <UserCheck size={36} className="text-neutral-300 mb-2 opacity-50" />
                <p className="text-xs font-medium">
                  {isRtl ? 'لا توجد عمليات دخول مسجلة اليوم بعد' : 'Aucun passage enregistré aujourd\'hui'}
                </p>
                <p className="text-2xs text-neutral-400 mt-1">
                  {isRtl ? 'امسح الباركود للبدء في التسجيل' : 'Scannez un badge pour voir les entrées en direct'}
                </p>
              </div>
            ) : (
              memberCheckIns.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        log.accessStatus === 'Granted'
                          ? 'bg-emerald-500'
                          : log.accessStatus === 'Warning_Expiring'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{log.memberName}</p>
                      <p className="text-2xs text-neutral-500">{log.planName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xs text-neutral-400 font-mono block">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span
                      className={`text-2xs font-semibold ${
                        log.accessStatus === 'Granted'
                          ? 'text-emerald-600'
                          : log.accessStatus === 'Warning_Expiring'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {log.accessStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Walk-in Pass Modal */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {isRtl ? 'إصدار تذكرة حصة منفردة (Pass)' : 'Émission Pass Séance Libre'}
                  </h3>
                  <p className="text-2xs text-neutral-500">
                    {isRtl ? 'تسجيل دخول الزائر غير المشترك' : 'Entrée ponctuelle sans abonnement'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isRtl ? 'اسم الزائر' : 'Nom du visiteur'}
                </label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder={isRtl ? 'محمد بلقاسم' : 'Ex: Karim Benali'}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isRtl ? 'رقم الهاتف (اختياري)' : 'Numéro de téléphone (optionnel)'}
                </label>
                <input
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="0550 12 34 56"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:ring-2 focus:ring-[#C4785A]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isRtl ? 'مبلغ الحصة (د.ج)' : 'Tarif de la séance (DZD)'}
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['500', '800', '1000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWalkInAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                        walkInAmount === amt
                          ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
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
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold font-mono focus:ring-2 focus:ring-[#C4785A]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isRtl ? 'طريقة الدفع' : 'Mode de Paiement'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      walkInPaymentMethod === 'cash'
                        ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <Banknote size={14} />
                    <span>{isRtl ? 'نقداً' : 'Espèces'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('baridimob')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      walkInPaymentMethod === 'baridimob'
                        ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <span>📱</span>
                    <span>BaridiMob</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInPaymentMethod('cib')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      walkInPaymentMethod === 'cib'
                        ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>CIB / EDAHABIA</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  {isRtl ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>{isRtl ? 'تأكيد وطباعة التذكرة' : 'Valider & Imprimer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Preview Modal */}
      {lastPrintedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              {isRtl ? 'تذكرة الحصة جاهزة' : 'Pass Séance Validé'}
            </h3>
            <p className="text-xs text-neutral-500 mb-4 font-mono font-bold text-[#C4785A]">
              {lastPrintedTicket.ticketNumber}
            </p>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 text-xs space-y-2 text-left mb-5">
              <div className="flex justify-between">
                <span className="text-neutral-400">{isRtl ? 'الزبون' : 'Client'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{lastPrintedTicket.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">{isRtl ? 'المبلغ' : 'Montant'}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-white">
                  {formatMoney(lastPrintedTicket.amountDzd, 'DZD')}
                </span>
              </div>
              {lastPrintedTicket.timbreFiscalDzd > 0 && (
                <div className="flex justify-between text-2xs text-amber-600 font-medium">
                  <span>{isRtl ? 'طابع المادة 317' : 'Timbre Art. 317'}</span>
                  <span>+{lastPrintedTicket.timbreFiscalDzd} DA</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 font-bold">
                <span>{isRtl ? 'الإجمالي المقبوض' : 'Total Reçu'}</span>
                <span className="text-[#C4785A] font-mono">
                  {formatMoney(lastPrintedTicket.amountDzd + lastPrintedTicket.timbreFiscalDzd, 'DZD')}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLastPrintedTicket(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                {isRtl ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setLastPrintedTicket(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
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
};
