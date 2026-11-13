import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Clock,
  CheckCircle2,
  Play,
  Check,
  CreditCard,
  Banknote,
  Plus,
  User,
  Sparkles,
  Printer,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Appointment, SalonChairStage, SalonChairStation } from '../../../types/index';
import { calculateArt317Timbre, formatMoney } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';



export const SalonQuickChairKiosk: React.FC<any> = () => {
	const { appointments, servicesCatalog, salonWorkstations, staff, currentBranchId, currentBusinessId, account, currentUser, language, updateAppointmentStatus, checkoutAppointment, createAppointment, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const isRtl = language === "ar";
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: appointments.length > 0 || servicesCatalog.length > 0
	});
	const [activeStations, setActiveStations] = React.useState({});
	const [checkoutModalStationKey, setCheckoutModalStationKey] = React.useState<any>(null);
	const [paymentMethod, setPaymentMethod] = React.useState("cash");
	const [lastReceipt, setLastReceipt] = React.useState<any>(null);
	const [isAddClientModalOpen, setIsAddClientModalOpen] = React.useState(false);
	const [targetStationId, setTargetStationId] = React.useState("ws_1");
	const [newClientName, setNewClientName] = React.useState("");
	const [newClientPhone, setNewClientPhone] = React.useState("");
	const [selectedServiceId, setSelectedServiceId] = React.useState(servicesCatalog[0]?.id || "");
	const [selectedStylistId, setSelectedStylistId] = React.useState(staff[0]?.id || "");
	const handleAdvanceStage = (stationKey: any) => {
		const current = activeStations[stationKey];
		if (!current) return;
		if (current.stage === "waiting") {
			setActiveStations((prev) => ({
				...prev,
				[stationKey]: {
					...current,
					stage: "in_progress",
					startTime: Date.now()
				}
			}));
			showToast({
				type: "info",
				title: isRtl ? "بدء تقديم الخدمة" : "Prestation Démarrée",
				message: `${current.clientName} — ${current.serviceName}`
			});
		} else if (current.stage === "in_progress") {
			setActiveStations((prev) => ({
				...prev,
				[stationKey]: {
					...current,
					stage: "completed"
				}
			}));
			showToast({
				type: "success",
				title: isRtl ? "اكتملت الخدمة" : "Prestation Terminée",
				message: isRtl ? "جاهز للتحصيل السريع" : "Prêt pour l'encaissement rapide"
			});
		} else if (current.stage === "completed") setCheckoutModalStationKey(stationKey);
	};
	const handleConfirmCheckout = () => {
		if (!checkoutModalStationKey) return;
		const current = activeStations[checkoutModalStationKey];
		if (!current) return;
		const timbre = paymentMethod === "cash" ? calculateArt317Timbre(current.servicePriceDzd) : 0;
		const receiptNum = `REC-SAL-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
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
			receiptNumber: receiptNum
		});
		setCheckoutModalStationKey(null);
		showToast({
			type: "success",
			title: isRtl ? "تم التحصيل بنجاح" : "Encaissement Réussi",
			message: `${current.clientName} — ${formatMoney(current.servicePriceDzd + timbre, "DZD")}`
		});
	};
	const handleAddNewClientToStation = (e: any) => {
		e.preventDefault();
		const service = servicesCatalog.find((s) => s.id === selectedServiceId) || servicesCatalog[0];
		const stylist = staff.find((st) => st.id === selectedStylistId) || staff[0];
		setActiveStations((prev) => ({
			...prev,
			[targetStationId]: {
				clientName: newClientName.trim() || (isRtl ? "زبون صالون" : "Client Salon"),
				serviceName: service?.name || "Prestation Salon",
				servicePriceDzd: service?.price || 1500,
				stylistName: stylist?.fullName || "Styliste",
				stylistId: stylist?.id || "stf_01",
				stage: "waiting",
				startTime: Date.now()
			}
		}));
		setIsAddClientModalOpen(false);
		setNewClientName("");
		setNewClientPhone("");
		showToast({
			type: "success",
			title: isRtl ? "تم تثبيت الزبون في المحطة" : "Client Installé au Poste",
			message: `${targetStationId.toUpperCase()} — ${service?.name}`
		});
	};
	const workstationsList = [
		{
			id: "ws_1",
			name: isRtl ? "محطة 1 - حلاقة وقص" : "Fauteuil 1 - Coupe & Coiffage",
			type: "Hair"
		},
		{
			id: "ws_2",
			name: isRtl ? "محطة 2 - ذقن وعناية" : "Fauteuil 2 - Barbe & Soins Visage",
			type: "Beard"
		},
		{
			id: "ws_3",
			name: isRtl ? "محطة 3 - غسيل وعلاج" : "Bac Lavage & Traitement Capillaire",
			type: "Wash"
		},
		{
			id: "ws_4",
			name: isRtl ? "محطة 4 - VIP بريميوم" : "Cabine VIP & Esthétique",
			type: "VIP"
		}
	];
	if (showSkeleton && (appointments.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir={isRtl ? "rtl" : "ltr"}>
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl"><SkeletonKioskGrid count={4} /></div>
</div>;
	return /* @__PURE__ */ <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir={isRtl ? "rtl" : "ltr"}>
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs">
<div className="flex items-center gap-3.5">
<div className="w-12 h-12 rounded-2xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center text-xl shrink-0"><Scissors size={24} /></div>
<div>
<h1 className="text-[36px] sm:text-[48px] rtl:text-[30px] rtl:sm:text-[36px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white flex items-center gap-2">
<span>
{isRtl ? "كشك محطات العمل والصالون السريع" : "Kiosk Fauteuils & Suivi Postes Salon"}
</span>
<span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">{isRtl ? "نشط" : "Live Floor"}</span>
</h1>
</div>
</div>
<button type="button" onClick={() => setIsAddClientModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer">
<Plus size={16} />
<span>{isRtl ? "تسكين زبون جديد" : "Installer un Client"}</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
{workstationsList.map((ws) => {
					const active = activeStations[ws.id];
					const isOccupied = !!active;
					return /* @__PURE__ */ <div key={ws.id} className={`rounded-3xl border transition-all p-5 flex flex-col justify-between min-h-[300px] shadow-xs ${!isOccupied ? "bg-neutral-50/60 dark:bg-neutral-800/20 border-dashed border-neutral-300 dark:border-neutral-700" : active.stage === "in_progress" ? "bg-white dark:bg-neutral-900 border-[#d4522f] ring-2 ring-[#d4522f]/15 shadow-sm" : active.stage === "completed" ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-400 dark:border-emerald-700" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"}`}>
<div>
<div className="flex items-center justify-between mb-3">
<span className="text-2xs font-bold uppercase tracking-wider text-neutral-400 font-mono">{ws.id.toUpperCase()}</span>
{isOccupied ? /* @__PURE__ */ <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${active.stage === "waiting" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400" : active.stage === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 animate-pulse" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"}`}>
{active.stage === "waiting" ? isRtl ? "في الانتظار" : "En Attente" : active.stage === "in_progress" ? isRtl ? "قيد الإنجاز" : "En Cours" : isRtl ? "مكتمل" : "Terminé"}
</span> : /* @__PURE__ */ <span className="text-2xs font-medium text-neutral-400">{isRtl ? "شاغر" : "Libre"}</span>}
</div>
<h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">{ws.name}</h3>
{isOccupied ? /* @__PURE__ */ <div className="mt-4 space-y-2">
<div className="flex items-center gap-2">
<div className="w-7 h-7 rounded-full bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0"><User size={14} /></div>
<span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{active.clientName}</span>
</div>
<div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-2.5 text-xs">
<span className="text-2xs text-neutral-400 block">{isRtl ? "الخدمة" : "Prestation"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200">{active.serviceName}</span>
</div>
<div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
<span>
{isRtl ? "الحلاق / الأخصائي" : "Styliste"}
:
</span>
<span className="font-semibold text-neutral-700 dark:text-neutral-300">{active.stylistName}</span>
</div>
<div className="flex items-center justify-between text-xs font-bold pt-1">
<span>
{isRtl ? "السعر" : "Tarif"}
:
</span>
<span className="text-[#d4522f] font-mono text-sm">{formatMoney(active.servicePriceDzd, "DZD")}</span>
</div>
</div> : /* @__PURE__ */ <div className="py-10 text-center text-neutral-400">
<Scissors size={28} className="mx-auto mb-2 opacity-30" />
<p className="text-xs">{isRtl ? "المحطة شاغرة حالياً" : "Poste disponible"}</p>
</div>}
</div>
<div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
{isOccupied ? /* @__PURE__ */ <button type="button" onClick={() => handleAdvanceStage(ws.id)} className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${active.stage === "waiting" ? "bg-blue-600 hover:bg-blue-700 text-white" : active.stage === "in_progress" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-[#d4522f] hover:bg-[#b03b1b] text-white"}`}>
{active.stage === "waiting" ? /* @__PURE__ */ <>
<Play size={14} />
<span>{isRtl ? "بدء الخدمة" : "Démarrer"}</span>
</> : active.stage === "in_progress" ? /* @__PURE__ */ <>
<Check size={14} />
<span>{isRtl ? "إنهاء الخدمة" : "Terminer"}</span>
</> : /* @__PURE__ */ <>
<CreditCard size={14} />
<span>{isRtl ? "تحصيل الفاتورة" : "Encaisser"}</span>
</>}
</button> : /* @__PURE__ */ <button type="button" onClick={() => {
									setTargetStationId(ws.id);
									setIsAddClientModalOpen(true);
								}} className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-[#d4522f] hover:bg-[#d4522f]/5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[#d4522f] transition-all flex items-center justify-center gap-1 cursor-pointer">
<Plus size={14} />
<span>{isRtl ? "إسناد زبون" : "Assigner"}</span>
</button>}
</div>
</div>;
				})}
</div>
{checkoutModalStationKey && activeStations[checkoutModalStationKey] && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
<div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
<h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">{isRtl ? "تحصيل فاتورة الصالون السريعة" : "Encaissement Express Salon"}</h3>
<p className="text-xs text-neutral-500 mb-4">
{activeStations[checkoutModalStationKey].clientName}
{" — "}
{activeStations[checkoutModalStationKey].serviceName}
</p>
<div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 text-xs space-y-2 mb-4">
<div className="flex justify-between">
<span className="text-neutral-400">{isRtl ? "سعر الخدمة" : "Prestation"}</span>
<span className="font-mono font-bold text-neutral-900 dark:text-white">{formatMoney(activeStations[checkoutModalStationKey].servicePriceDzd, "DZD")}</span>
</div>
{paymentMethod === "cash" && /* @__PURE__ */ <div className="flex justify-between text-2xs text-amber-600 font-medium">
<span>{isRtl ? "طابع المادة 317" : "Timbre Art. 317"}</span>
<span>
+
{calculateArt317Timbre(activeStations[checkoutModalStationKey].servicePriceDzd)}
{" DA"}
</span>
</div>}
<div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 font-bold text-sm">
<span>{isRtl ? "الإجمالي للدفع" : "Total Net"}</span>
<span className="text-[#d4522f] font-mono">
{formatMoney(activeStations[checkoutModalStationKey].servicePriceDzd + (paymentMethod === "cash" ? calculateArt317Timbre(activeStations[checkoutModalStationKey].servicePriceDzd) : 0), "DZD")}
</span>
</div>
</div>
<div className="space-y-2 mb-5">
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{isRtl ? "طريقة التحصيل" : "Mode de Règlement"}</label>
<div className="grid grid-cols-3 gap-2">
<button type="button" onClick={() => setPaymentMethod("cash")} className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${paymentMethod === "cash" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
<Banknote size={16} />
<span>{isRtl ? "نقداً" : "Espèces"}</span>
</button>
<button type="button" onClick={() => setPaymentMethod("baridimob")} className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${paymentMethod === "baridimob" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
<span className="text-base">📱</span>
<span>BaridiMob</span>
</button>
<button type="button" onClick={() => setPaymentMethod("cib")} className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${paymentMethod === "cib" ? "border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]" : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
<CreditCard size={16} />
<span>CIB</span>
</button>
</div>
</div>
<div className="flex gap-2">
<button type="button" onClick={() => setCheckoutModalStationKey(null)} className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{isRtl ? "إلغاء" : "Annuler"}</button>
<button type="button" onClick={handleConfirmCheckout} className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5">
<Check size={14} />
<span>{isRtl ? "تأكيد وقبض" : "Valider"}</span>
</button>
</div>
</div>
</div>}
{isAddClientModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
<div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
<div className="flex items-center justify-between mb-4">
<h3 className="text-base font-bold text-neutral-900 dark:text-white">{isRtl ? "تسكين زبون في محطة العمل" : "Installer un Client au Fauteuil"}</h3>
<button type="button" onClick={() => setIsAddClientModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">✕</button>
</div>
<form onSubmit={handleAddNewClientToStation} className="space-y-4">
<div>
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{isRtl ? "محطة العمل" : "Poste de travail"}</label>
<select value={targetStationId} onChange={(e) => setTargetStationId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium">
{workstationsList.map((ws) => /* @__PURE__ */ <option key={ws.id} value={ws.id}>{ws.name}</option>)}
</select>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{isRtl ? "اسم الزبون" : "Nom du client"}</label>
<input type="text" required value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder={isRtl ? "كريم منصوري" : "Ex: Karim Mansouri"} className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium focus:ring-2 focus:ring-[#d4522f]" />
</div>
<div>
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{isRtl ? "الخدمة المطلوبة" : "Prestation"}</label>
<select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium">
{servicesCatalog.map((s) => /* @__PURE__ */ <option key={s.id} value={s.id}>
{s.name}
{" — "}
{formatMoney(s.price, "DZD")}
</option>)}
</select>
</div>
<div>
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{isRtl ? "الحلاق / الأخصائي المعين" : "Styliste Assigné"}</label>
<select value={selectedStylistId} onChange={(e) => setSelectedStylistId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium">
{staff.map((st) => /* @__PURE__ */ <option key={st.id} value={st.id}>{st.fullName}</option>)}
</select>
</div>
<div className="pt-2 flex gap-2">
<button type="button" onClick={() => setIsAddClientModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{isRtl ? "إلغاء" : "Annuler"}</button>
<button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5">
<Check size={14} />
<span>{isRtl ? "تسكين وبدء" : "Installer au Poste"}</span>
</button>
</div>
</form>
</div>
</div>}
{lastReceipt && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
<div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
<div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3"><CheckCircle2 size={24} /></div>
<h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">{isRtl ? "وصل التحصيل جاهز" : "Ticket de Caisse Validé"}</h3>
<p className="text-xs text-neutral-500 mb-4 font-mono font-bold text-[#d4522f]">{lastReceipt.receiptNumber}</p>
<div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 text-xs space-y-2 text-left mb-5">
<div className="flex justify-between">
<span className="text-neutral-400">{isRtl ? "الزبون" : "Client"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200">{lastReceipt.clientName}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-400">{isRtl ? "الخدمة" : "Service"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200">{lastReceipt.serviceName}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-400">{isRtl ? "المبلغ" : "Montant"}</span>
<span className="font-bold font-mono text-neutral-900 dark:text-white">{formatMoney(lastReceipt.amountDzd, "DZD")}</span>
</div>
{lastReceipt.timbreFiscalDzd > 0 && /* @__PURE__ */ <div className="flex justify-between text-2xs text-amber-600 font-medium">
<span>{isRtl ? "طابع المادة 317" : "Timbre Art. 317"}</span>
<span>
+
{lastReceipt.timbreFiscalDzd}
{" DA"}
</span>
</div>}
<div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 font-bold">
<span>{isRtl ? "الإجمالي المقبوض" : "Total Reçu"}</span>
<span className="text-[#d4522f] font-mono">{formatMoney(lastReceipt.amountDzd + lastReceipt.timbreFiscalDzd, "DZD")}</span>
</div>
</div>
<div className="flex gap-2">
<button type="button" onClick={() => setLastReceipt(null)} className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{isRtl ? "إغلاق" : "Fermer"}</button>
<button type="button" onClick={() => {
									window.print();
									setLastReceipt(null);
								}} className="flex-1 py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5">
<Printer size={14} />
<span>{isRtl ? "طباعة" : "Imprimer"}</span>
</button>
</div>
</div>
</div>}
</div>;
};

export { Award as _, AppointmentHistoryView_exports as a, AppointmentClientsView_exports as c, Smartphone as d, Scissors as f, Banknote as g, History as h, AppointmentScheduleView_exports as i, AppointmentModal as l, Pen as m, AppointmentStaffView_exports as n, AppointmentFinanceView_exports as o, Play as p, AppointmentServicesView_exports as r, AppointmentDashboardView_exports as s, SalonQuickChairKiosk_exports as t, Star as u };
