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
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';



export const GymFrontDeskKiosk: React.FC<any> = () => {
	const { members, currentBranchId, currentBusinessId, account, currentUser, memberCheckIns, addMemberCheckIn, walkInTickets, addWalkInTicket, language, updateMember, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: members.length > 0
	});
	const isRtl = language === "ar";
	const [scanInput, setScanInput] = React.useState("");
	const [selectedMember, setSelectedMember] = React.useState<any>(null);
	const [lastCheckInResult, setLastCheckInResult] = React.useState<any>(null);
	const [isWalkInModalOpen, setIsWalkInModalOpen] = React.useState(false);
	const [walkInName, setWalkInName] = React.useState("");
	const [walkInPhone, setWalkInPhone] = React.useState("");
	const [walkInAmount, setWalkInAmount] = React.useState("500");
	const [walkInPaymentMethod, setWalkInPaymentMethod] = React.useState("cash");
	const [lastPrintedTicket, setLastPrintedTicket] = React.useState<any>(null);
	const inputRef = React.useRef<any>(null);
	React.useEffect(() => {
		inputRef.current?.focus();
	}, [lastCheckInResult, isWalkInModalOpen]);
	const playChime = (type: any) => {
		try {
			const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			if (type === "success") {
				osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
				osc.frequency.setValueAtTime(880, audioCtx.currentTime + .1);
				gain.gain.setValueAtTime(.2, audioCtx.currentTime);
				gain.gain.exponentialRampToValueAtTime(.01, audioCtx.currentTime + .35);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + .35);
			} else if (type === "warning") {
				osc.frequency.setValueAtTime(440, audioCtx.currentTime);
				osc.frequency.setValueAtTime(440, audioCtx.currentTime + .15);
				gain.gain.setValueAtTime(.2, audioCtx.currentTime);
				gain.gain.exponentialRampToValueAtTime(.01, audioCtx.currentTime + .3);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + .3);
			} else {
				osc.frequency.setValueAtTime(220, audioCtx.currentTime);
				osc.frequency.setValueAtTime(164.81, audioCtx.currentTime + .15);
				gain.gain.setValueAtTime(.3, audioCtx.currentTime);
				gain.gain.exponentialRampToValueAtTime(.01, audioCtx.currentTime + .4);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + .4);
			}
		} catch {}
	};
	const searchResults = React.useMemo(() => {
		if (!scanInput.trim() || scanInput.length < 2) return [];
		const q = scanInput.toLowerCase().trim();
		return members.filter((m) => m.fullName.toLowerCase().includes(q) || m.phoneNumber && m.phoneNumber.includes(q) || m.cardId && m.cardId.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)).slice(0, 5);
	}, [members, scanInput]);
	const handleValidateCheckIn = (member: any) => {
		const now = /* @__PURE__ */ new Date();
		const expiry = member.expirationDate ? new Date(member.expirationDate) : null;
		const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / 864e5) : 999;
		let status = "Granted";
		let message = isRtl ? "تم التحقق من الاشتراك بنجاح" : "Accès validé avec succès";
		if (member.status === "Frozen") {
			status = "Denied_Frozen";
			message = isRtl ? "الاشتراك مجمّد حالياً" : "Abonnement actuellement gelé";
		} else if (member.status === "Expired" || expiry && expiry < now) {
			status = "Denied_Expired";
			message = isRtl ? "الاشتراك منتهي الصلاحية" : "Abonnement expiré";
		} else if (daysUntilExpiry <= 5) {
			status = "Warning_Expiring";
			message = isRtl ? `تنبيه: الاشتراك ينتهي خلال ${daysUntilExpiry} أيام` : `Attention: Expire dans ${daysUntilExpiry} jour(s)`;
		}
		let remainingBefore = member.remainingSessions;
		let remainingAfter = remainingBefore;
		if (remainingBefore !== void 0 && remainingBefore !== null) {
			if (remainingBefore <= 0) {
				status = "Denied_Expired";
				message = isRtl ? "نفدت جميع الحصص المتاحة في الباقة" : "Nombre de séances épuisé";
			} else {
				remainingAfter = remainingBefore - 1;
				updateMember(member.id, {
					remainingSessions: remainingAfter,
					status: remainingAfter === 0 ? "Expired" : member.status
				});
			}
		}
		if (status === "Granted") playChime("success");
		else if (status === "Warning_Expiring") playChime("warning");
		else playChime("error");
		const checkInLog = {
			id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			accountId: account?.id || "acc_01",
			businessId: currentBusinessId || "biz_01",
			branchId: currentBranchId || "branch_gym_main",
			staffId: currentUser?.id || "staff_01",
			memberId: member.id,
			memberName: member.fullName,
			planId: member.membershipPlanId || "standard_plan",
			planName: member.membershipPlanName || "Pass Standard",
			timestamp: (/* @__PURE__ */ new Date()).toISOString(),
			accessStatus: status,
			remainingSessionsBefore: remainingBefore,
			remainingSessionsAfter: remainingAfter,
			checkInMethod: "barcode_scanner"
		};
		addMemberCheckIn(checkInLog as any);
		setLastCheckInResult({
			status,
			message,
			member
		});
		setSelectedMember(member);
		setScanInput("");
	};
	const handleScanSubmit = (e: any) => {
		e.preventDefault();
		if (!scanInput.trim()) return;
		const exactMatch = members.find((m) => m.cardId?.toLowerCase() === scanInput.trim().toLowerCase() || m.id.toLowerCase() === scanInput.trim().toLowerCase() || m.phoneNumber && m.phoneNumber.trim() === scanInput.trim());
		if (exactMatch) handleValidateCheckIn(exactMatch);
		else if (searchResults.length === 1) handleValidateCheckIn(searchResults[0]);
		else if (searchResults.length > 1) {} else {
			playChime("error");
			showToast({
				type: "error",
				title: isRtl ? "لم يتم العثور على المشترك" : "Adhérent introuvable",
				message: isRtl ? "تأكد من رقم البطاقة أو الاسم" : "Aucun membre associé à ce code ou numéro"
			});
		}
	};
	const handleCreateWalkIn = (e: any) => {
		e.preventDefault();
		const amountNum = parseFloat(walkInAmount) || 500;
		const timbre = walkInPaymentMethod === "cash" ? calculateArt317Timbre(amountNum) : 0;
		const ticket = {
			id: `wi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			accountId: account?.id || "acc_01",
			businessId: currentBusinessId || "biz_01",
			branchId: currentBranchId || "branch_gym_main",
			staffId: currentUser?.id || "staff_frontdesk_01",
			ticketNumber: `WI-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`,
			clientName: walkInName.trim() || (isRtl ? "زبون غير مسجل" : "Client Séance Libre"),
			phone: walkInPhone.trim() || void 0,
			amountDzd: amountNum,
			paymentMethod: walkInPaymentMethod,
			timbreFiscalDzd: timbre,
			issuedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		addWalkInTicket(ticket as any);
		setLastPrintedTicket(ticket);
		setIsWalkInModalOpen(false);
		setWalkInName("");
		setWalkInPhone("");
		playChime("success");
		showToast({
			type: "success",
			title: isRtl ? "تم إصدار تذكرة الحصة" : "Pass Séance Émis",
			message: `${ticket.ticketNumber} — ${formatMoney(ticket.amountDzd + ticket.timbreFiscalDzd, "DZD")}`
		});
	};
	if (showSkeleton && (members.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? "rtl" : "ltr"}>
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<div className="p-5 bg-[#FBF8F5] dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-[24px]"><SkeletonKioskGrid count={8} /></div>
</div>;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? "rtl" : "ltr"}>
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6DED6]/80 dark:border-neutral-800/80">
<div className="flex items-center gap-3.5 sm:gap-4">
<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white shrink-0"><Scan size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isRtl ? "كشك الاستقبال ومسح الدخول السريع" : "Kiosk Accueil & Pointage Salle"}
</h1>
</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<button type="button" onClick={() => setIsWalkInModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer">
<Ticket size={16} />
<span>{isRtl ? "بيع تذكرة حصة (Pass)" : "Vendre Pass Séance"}</span>
</button>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 space-y-5">
<div className="bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-[24px] p-5 sm:p-6 shadow-2xs">
<form onSubmit={handleScanSubmit} className="relative">
<label htmlFor="barcodeInput" className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-2">
{isRtl ? "مسح رمز الباركود أو بطاقة RFID أو الاسم" : "Scanner Code-Barres / Badge RFID / Recherche Adhérent"}
</label>
<div className="relative">
<input id="barcodeInput" ref={inputRef} type="text" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder={isRtl ? "امسح الباركود أو ابدأ بالكتابة..." : "Scanner le badge ou taper le nom/téléphone..."} className="w-full h-14 pl-12 pr-28 rounded-2xl border-2 border-[#d4522f]/40 focus:border-[#d4522f] focus:ring-4 focus:ring-[#d4522f]/15 bg-[#FBF8F5] dark:bg-[#262422] text-base font-medium text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 transition-all" dir="ltr" />
<Scan size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4522f]" />
<button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs">{isRtl ? "تحقق" : "Valider"}</button>
</div>
{searchResults.length > 0 && /* @__PURE__ */ <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl shadow-xl overflow-hidden divide-y divide-[#E6DED6]/60 dark:divide-[#3A3734]">
{searchResults.map((m) => /* @__PURE__ */ <div key={m.id} onClick={() => handleValidateCheckIn(m)} className="p-3 hover:bg-[#F3EDE7]/50 dark:hover:bg-[#262422] flex items-center justify-between cursor-pointer transition-colors">
<div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center font-bold text-xs text-[#d4522f]">{m.fullName.charAt(0)}</div>
<div>
<p className="text-xs font-bold text-black dark:text-white">{m.fullName}</p>
<p className="text-[11px] text-black/62 dark:text-white/65">
{m.phoneNumber || m.id}
{" • "}
{m.membershipPlanName || "Pass"}
</p>
</div>
</div>
<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${m.status === "Active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"}`}>{m.status}</span>
</div>)}
</div>}
</form>
{lastCheckInResult && /* @__PURE__ */ <div className={`mt-6 p-5 rounded-2xl border transition-all animate-in fade-in duration-200 ${lastCheckInResult.status === "Granted" ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800" : lastCheckInResult.status === "Warning_Expiring" ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800" : "bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"}`}>
<div className="flex items-start gap-4">
<div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${lastCheckInResult.status === "Granted" ? "bg-emerald-600 text-white" : lastCheckInResult.status === "Warning_Expiring" ? "bg-amber-500 text-white" : "bg-rose-600 text-white"}`}>
{lastCheckInResult.status === "Granted" ? /* @__PURE__ */ <CheckCircle2 size={24} /> : lastCheckInResult.status === "Warning_Expiring" ? /* @__PURE__ */ <AlertTriangle size={24} /> : /* @__PURE__ */ <XCircle size={24} />}
</div>
<div className="flex-1">
<div className="flex items-center justify-between gap-2">
<h3 className="text-base font-bold text-black dark:text-white">{lastCheckInResult.member.fullName}</h3>
<span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${lastCheckInResult.status === "Granted" ? "bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200" : lastCheckInResult.status === "Warning_Expiring" ? "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200" : "bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200"}`}>
{lastCheckInResult.status === "Granted" ? isRtl ? "دخول مسموح" : "ACCÈS AUTORISÉ" : lastCheckInResult.status === "Warning_Expiring" ? isRtl ? "ينتهي قريباً" : "EXPIRATION PROCHE" : isRtl ? "دخول مرفوض" : "ACCÈS REFUSÉ"}
</span>
</div>
<p className="text-xs font-medium text-black/75 dark:text-white/80 mt-1">{lastCheckInResult.message}</p>
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#E6DED6] dark:border-[#3A3734] text-xs">
<div>
<span className="text-black/62 dark:text-white/65 block text-[11px]">{isRtl ? "الاشتراك" : "Formule"}</span>
<span className="font-semibold text-black dark:text-white">{lastCheckInResult.member.membershipPlanName || "Standard"}</span>
</div>
<div>
<span className="text-black/62 dark:text-white/65 block text-[11px]">{isRtl ? "تاريخ الانتهاء" : "Validité jusqu'au"}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">{lastCheckInResult.member.expirationDate || "—"}</span>
</div>
<div>
<span className="text-black/62 dark:text-white/65 block text-[11px]">{isRtl ? "الحصص المتبقية" : "Séances restantes"}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">
{lastCheckInResult.member.remainingSessions !== void 0 ? `${lastCheckInResult.member.remainingSessions} séances` : "Illimité"}
</span>
</div>
</div>
</div>
</div>
</div>}
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
<div className="bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 rounded-[18px] p-4 shadow-2xs flex flex-col justify-between min-h-[108px]">
<span className="text-[11.5px] text-black/68 dark:text-white/72 font-medium block">{isRtl ? "دخول اليوم" : "Check-ins du Jour"}</span>
<span className="text-[28px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-black dark:text-white mt-2 block">{memberCheckIns.length}</span>
</div>
<div className="bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 rounded-[18px] p-4 shadow-2xs flex flex-col justify-between min-h-[108px]">
<span className="text-[11.5px] text-black/68 dark:text-white/72 font-medium block">{isRtl ? "تذاكر الحصة" : "Pass Séance Émis"}</span>
<span className="text-[28px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-[#d4522f] mt-2 block">{walkInTickets.length}</span>
</div>
<div className="bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 rounded-[18px] p-4 shadow-2xs flex flex-col justify-between min-h-[108px]">
<span className="text-[11.5px] text-black/68 dark:text-white/72 font-medium block">{isRtl ? "مشتركون نشطون" : "Adhérents Actifs"}</span>
<span className="text-[28px] leading-none font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-emerald-600 dark:text-emerald-400 mt-2 block">{members.filter((m) => m.status === "Active").length}</span>
</div>
<div className="bg-[#1F1D1B] border border-white/[0.08] rounded-[18px] p-4 shadow-sm text-white flex flex-col justify-between min-h-[108px]">
<span className="text-[11.5px] text-white/75 font-medium block">{isRtl ? "حالة البوابة" : "Portique"}</span>
<span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
<span className="w-2 h-2 rounded-full bg-emerald-400" />
<span>{isRtl ? "متصل" : "Opérationnel"}</span>
</span>
</div>
</div>
</div>
</div>
<div className="bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] rounded-[24px] p-5 shadow-2xs flex flex-col h-[520px]">
<div className="flex items-center justify-between pb-3.5 border-b border-[#E6DED6]/80 dark:border-[#3A3734]">
<h2 className="text-[15px] font-semibold tracking-[-0.015em] rtl:tracking-normal text-black dark:text-white flex items-center gap-2">
<Clock size={16} className="text-[#d4522f]" />
<span>{isRtl ? "سجل الدخول اللحظي" : "Journal des Passages Direct"}</span>
</h2>
<span className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums">
{memberCheckIns.length}
{" "}
{isRtl ? "عمليات" : "enregistrements"}
</span>
</div>
<div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
{memberCheckIns.length === 0 ? /* @__PURE__ */ <div className="h-full flex flex-col items-center justify-center text-center p-6 text-black/62 dark:text-white/65">
<UserCheck size={36} className="text-black/45 dark:text-white/45 mb-2" />
<p className="text-xs font-semibold text-black/75 dark:text-white/80">
{isRtl ? "لا توجد عمليات دخول مسجلة اليوم بعد" : "Aucun passage enregistré aujourd'hui"}
</p>
<p className="text-[11px] text-black/62 dark:text-white/65 mt-1">
{isRtl ? "امسح الباركود للبدء في التسجيل" : "Scannez un badge pour voir les entrées en direct"}
</p>
</div> : memberCheckIns.slice(0, 15).map((log) => /* @__PURE__ */ <div key={log.id} className="p-3 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6]/80 dark:border-[#3A3734] flex items-center justify-between text-xs">
<div className="flex items-center gap-2.5">
<span className={`w-2 h-2 rounded-full shrink-0 ${log.accessStatus === "Granted" ? "bg-emerald-500" : log.accessStatus === "Warning_Expiring" ? "bg-amber-500" : "bg-rose-500"}`} />
<div>
<p className="font-bold text-black dark:text-white">{log.memberName}</p>
<p className="text-[11px] text-black/62 dark:text-white/65">{log.planName}</p>
</div>
</div>
<div className="text-right">
<span className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums block">
{new Date(log.timestamp).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
										second: "2-digit"
									})}
</span>
<span className={`text-[11px] font-semibold ${log.accessStatus === "Granted" ? "text-emerald-600 dark:text-emerald-400" : log.accessStatus === "Warning_Expiring" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>{log.accessStatus}</span>
</div>
</div>)}
</div>
</div>
</div>
{isWalkInModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
<div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center gap-2.5">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center"><Ticket size={20} /></div>
<div>
<h3 className="text-base font-bold text-black dark:text-white">{isRtl ? "إصدار تذكرة حصة منفردة (Pass)" : "Émission Pass Séance Libre"}</h3>
<p className="text-[11px] text-black/62 dark:text-white/65">{isRtl ? "تسجيل دخول الزائر غير المشترك" : "Entrée ponctuelle sans abonnement"}</p>
</div>
</div>
<button type="button" onClick={() => setIsWalkInModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer">✕</button>
</div>
<form onSubmit={handleCreateWalkIn} className="space-y-4">
<div>
<label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">{isRtl ? "اسم الزائر" : "Nom du visiteur"}</label>
<input type="text" required value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder={isRtl ? "محمد بلقاسم" : "Ex: Karim Benali"} className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20" />
</div>
<div>
<label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">{isRtl ? "رقم الهاتف (اختياري)" : "Numéro de téléphone (optionnel)"}</label>
<input type="tel" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} placeholder="0550 12 34 56" className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-medium text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20" dir="ltr" />
</div>
<div>
<label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">{isRtl ? "مبلغ الحصة (د.ج)" : "Tarif de la séance (DZD)"}</label>
<div className="grid grid-cols-3 gap-2 mb-2">
{[
										"500",
										"800",
										"1000"
									].map((amt) => /* @__PURE__ */ <button key={amt} type="button" onClick={() => setWalkInAmount(amt)} className={`py-2 rounded-xl text-xs font-bold font-mono tabular-nums transition-all border cursor-pointer ${walkInAmount === amt ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80"}`}>
{amt}
{" DA"}
</button>)}
</div>
<input type="number" required value={walkInAmount} onChange={(e) => setWalkInAmount(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#D4C8BC] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422] text-xs font-bold font-mono tabular-nums text-black dark:text-white focus:outline-none focus:border-[#d4522f] focus:ring-2 focus:ring-[#d4522f]/20" dir="ltr" />
</div>
<div>
<label className="block text-xs font-semibold text-black/75 dark:text-white/80 mb-1">{isRtl ? "طريقة الدفع" : "Mode de Paiement"}</label>
<div className="grid grid-cols-3 gap-2">
<button type="button" onClick={() => setWalkInPaymentMethod("cash")} className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${walkInPaymentMethod === "cash" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80"}`}>
<Banknote size={14} />
<span>{isRtl ? "نقداً" : "Espèces"}</span>
</button>
<button type="button" onClick={() => setWalkInPaymentMethod("baridimob")} className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${walkInPaymentMethod === "baridimob" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80"}`}>
<span>📱</span>
<span>BaridiMob</span>
</button>
<button type="button" onClick={() => setWalkInPaymentMethod("cib")} className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${walkInPaymentMethod === "cib" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80"}`}>
<CreditCard size={14} />
<span>CIB / EDAHABIA</span>
</button>
</div>
</div>
<div className="pt-2 flex gap-2">
<button type="button" onClick={() => setIsWalkInModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 transition-colors cursor-pointer">{isRtl ? "إلغاء" : "Annuler"}</button>
<button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
<Printer size={14} />
<span>{isRtl ? "تأكيد وطباعة التذكرة" : "Valider & Imprimer"}</span>
</button>
</div>
</form>
</div>
</div>}
{lastPrintedTicket && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1B]/45 backdrop-blur-xs p-4">
<div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
<div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3"><CheckCircle2 size={24} /></div>
<h3 className="text-base font-bold text-black dark:text-white mb-1">{isRtl ? "تذكرة الحصة جاهزة" : "Pass Séance Validé"}</h3>
<p className="text-xs mb-4 font-mono font-bold text-[#d4522f] tabular-nums">{lastPrintedTicket.ticketNumber}</p>
<div className="bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl p-4 text-xs space-y-2 text-left mb-5">
<div className="flex justify-between">
<span className="text-black/62 dark:text-white/65">{isRtl ? "الزبون" : "Client"}</span>
<span className="font-semibold text-black dark:text-white">{lastPrintedTicket.clientName}</span>
</div>
<div className="flex justify-between">
<span className="text-black/62 dark:text-white/65">{isRtl ? "المبلغ" : "Montant"}</span>
<span className="font-bold font-mono tabular-nums text-black dark:text-white">{formatMoney(lastPrintedTicket.amountDzd, "DZD")}</span>
</div>
{lastPrintedTicket.timbreFiscalDzd > 0 && /* @__PURE__ */ <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium tabular-nums">
<span>{isRtl ? "طابع المادة 317" : "Timbre Art. 317"}</span>
<span>
+
{lastPrintedTicket.timbreFiscalDzd}
{" DA"}
</span>
</div>}
<div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-[#3A3734] font-bold">
<span>{isRtl ? "الإجمالي المقبوض" : "Total Reçu"}</span>
<span className="text-[#d4522f] font-mono tabular-nums">
{formatMoney(lastPrintedTicket.amountDzd + lastPrintedTicket.timbreFiscalDzd, "DZD")}
</span>
</div>
</div>
<div className="flex gap-2">
<button type="button" onClick={() => setLastPrintedTicket(null)} className="flex-1 py-2.5 rounded-xl bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 transition-colors cursor-pointer">{isRtl ? "إغلاق" : "Fermer"}</button>
<button type="button" onClick={() => {
									window.print();
									setLastPrintedTicket(null);
								}} className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
<Printer size={14} />
<span>{isRtl ? "طباعة" : "Imprimer"}</span>
</button>
</div>
</div>
</div>}
</div>;
};
