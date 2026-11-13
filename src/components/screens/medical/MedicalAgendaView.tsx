import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { MedicalAppointmentModal } from './MedicalAppointmentModal';
import { MedicalAppointmentSlot } from '../../../types';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonSchedulerView } from '../../ui/skeleton/StructuralSkeletons';
import { compactFilterLabel } from '../../../utils/filterLexicon';


export const MedicalAgendaView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const { practitioners, appointments, patients, consultations, addAppointment, updateAppointmentStatus } = useMedicalData();
	const [selectedDate, setSelectedDate] = React.useState("2026-05-10");
	const [selectedDoctorFilter, setSelectedDoctorFilter] = React.useState("all");
	const [slotIntervalMinutes, setSlotIntervalMinutes] = React.useState(30);
	const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
	const [activeSlotData, setActiveSlotData] = React.useState({});
	const activePractitioners = selectedDoctorFilter === "all" ? practitioners : practitioners.filter((p) => p.id === selectedDoctorFilter);
	const timeSlots = [];
	const startHour = 8;
	const endHour = 18;
	for (let h = startHour; h < endHour; h++) {
		const hourStr = h.toString().padStart(2, "0");
		if (slotIntervalMinutes === 15) timeSlots.push(`${hourStr}:00`, `${hourStr}:15`, `${hourStr}:30`, `${hourStr}:45`);
		else if (slotIntervalMinutes === 30) timeSlots.push(`${hourStr}:00`, `${hourStr}:30`);
		else timeSlots.push(`${hourStr}:00`, `${hourStr}:45`);
	}
	const handleOpenBooking = (doctorId: any, time: any) => {
		setActiveSlotData({
			doctorId,
			time
		});
		setIsBookingModalOpen(true);
	};
	const shiftDate = (days: any) => {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + days);
		setSelectedDate(d.toISOString().slice(0, 10));
	};
	const getStatusBadge = (status: any) => {
		switch (status) {
			case "InRoom": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
			case "Arrived": return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
			case "Completed": return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
			case "Cancelled":
			case "NoShow": return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
			default: return "bg-neutral-500/15 text-black/70 dark:text-white/75 border-neutral-500/30";
		}
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: appointments.length > 0 || practitioners.length > 0
	});
	if (showSkeleton && (appointments.length === 0 && practitioners.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonSchedulerView columnsCount={3} hasFacility={false} hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E6DED6] dark:border-neutral-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-bold shadow-xs"><Calendar size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{language === "ar" ? "أجندة مواعيد الأطباء" : "Agenda Multi-Praticiens & Rendez-vous"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488]">Polyclinique</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-1 shadow-2xs">
<button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75" title="Jour précédent"><ChevronLeft size={16} /></button>
<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-2 py-1 text-xs font-semibold font-mono bg-transparent text-black dark:text-white border-0 focus:outline-hidden" />
<button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75" title="Jour suivant"><ChevronRight size={16} /></button>
</div>
<AtriumButton variant="primary" onClick={() => {
							setActiveSlotData({});
							setIsBookingModalOpen(true);
						}} icon={<Plus size={15} />}>Nouveau RDV</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
<button onClick={() => setSelectedDoctorFilter("all")} title={language === "ar" ? `جميع الأطباء (${practitioners.length})` : language === "fr" ? `Tous les Médecins (${practitioners.length})` : `All Doctors (${practitioners.length})`} className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedDoctorFilter === "all" ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs" : "bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-neutral-200 dark:border-neutral-700"}`}>
{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}
</button>
{practitioners.map((doc) => {
						const isSelected = selectedDoctorFilter === doc.id;
						const compactDoc = compactFilterLabel(doc.fullName, undefined, `${doc.fullName} (${doc.roomNumber})`);
						return /* @__PURE__ */ <button key={doc.id} onClick={() => setSelectedDoctorFilter(doc.id)} title={compactDoc.tooltip} className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${isSelected ? "bg-white dark:bg-neutral-700 text-black dark:text-white shadow-xs border-2" : "bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-neutral-200 dark:border-neutral-700"}`} style={{ borderColor: isSelected ? doc.color : void 0 }}>
<span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.color }} />
<span>{compactDoc.label}</span>
</button>;
					})}
</div>
<div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
<span className="text-[11px] text-black/55 dark:text-white/55 px-2 font-medium">Créneau:</span>
{[
						15,
						30,
						45
					].map((interval) => /* @__PURE__ */ <button key={interval} onClick={() => setSlotIntervalMinutes(interval)} className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${slotIntervalMinutes === interval ? "bg-[#d4522f] text-white shadow-2xs" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>
{interval}
m
</button>)}
</div>
</div>
<div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xs">
<div className="grid grid-cols-12 bg-[#F3EDE7] dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
<div className="col-span-1 p-3.5 text-center text-[11px] font-mono font-bold text-black/55 dark:text-white/55 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-800">Heure</div>
<div className="col-span-11 grid" style={{ gridTemplateColumns: `repeat(${activePractitioners.length}, minmax(0, 1fr))` }}>
{activePractitioners.map((doc) => {
							const waitingCount = consultations.filter((c) => c.status === "InWaitingQueue" && c.staffId === doc.id).length;
							return /* @__PURE__ */ <div key={doc.id} className="p-3.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<div>
<div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doc.color }} />
<span className="text-xs font-bold text-black dark:text-white truncate">{doc.fullName}</span>
</div>
<span className="text-[10px] text-black/55 dark:text-white/75 block truncate">
{doc.specialty}
{" · "}
<strong className="text-black/70 dark:text-white/75">{doc.roomNumber}</strong>
</span>
</div>
{waitingCount > 0 && /* @__PURE__ */ <span title={`File d'attente active : ${waitingCount} patient(s)`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
+
{waitingCount * 15}
m
</span>}
</div>;
						})}
</div>
</div>
<div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[600px] overflow-y-auto">
{timeSlots.map((time) => /* @__PURE__ */ <div key={time} className="grid grid-cols-12 min-h-[56px] hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
<div className="col-span-1 p-2 text-center text-xs font-mono font-bold text-black/55 dark:text-white/55 border-r border-neutral-200 dark:border-neutral-800 flex items-center justify-center">{time}</div>
<div className="col-span-11 grid" style={{ gridTemplateColumns: `repeat(${activePractitioners.length}, minmax(0, 1fr))` }}>
{activePractitioners.map((doc) => {
								const matchApt = appointments.find((a) => a.doctorId === doc.id && a.date === selectedDate && a.startTime === time);
								return /* @__PURE__ */ <div key={doc.id} onClick={() => !matchApt && handleOpenBooking(doc.id, time)} className={`p-1.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 relative group ${!matchApt ? "cursor-pointer hover:bg-[#0D9488]/5 transition-colors" : ""}`}>
{matchApt ? /* @__PURE__ */ <div className={`h-full p-2 rounded-xl border flex flex-col justify-between shadow-2xs transition-all ${getStatusBadge(matchApt.status)}`}>
<div>
<div className="flex items-center justify-between gap-1 mb-1">
<span className="font-bold text-xs truncate">{matchApt.patientName}</span>
<span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/50 dark:bg-black/30">{matchApt.status}</span>
</div>
<p className="text-[10px] text-black/70 dark:text-white/75 truncate">{matchApt.reason}</p>
</div>
<div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-black/5 dark:border-white/5 font-mono">
<span>
{matchApt.durationMinutes}
{" min"}
</span>
<div className="flex items-center gap-1">
{matchApt.status === "Booked" && /* @__PURE__ */ <button onClick={(e) => {
															e.stopPropagation();
															updateAppointmentStatus(matchApt.id, "Arrived");
														}} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white" title="Marquer comme arrivé en salle d'attente">Arrivé</button>}
{matchApt.status === "Arrived" && /* @__PURE__ */ <button onClick={(e) => {
															e.stopPropagation();
															updateAppointmentStatus(matchApt.id, "InRoom");
														}} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white" title="Faire entrer en consultation">En Salle</button>}
{matchApt.status === "InRoom" && /* @__PURE__ */ <button onClick={(e) => {
															e.stopPropagation();
															updateAppointmentStatus(matchApt.id, "Completed");
														}} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white" title="Terminer consultation">Terminé</button>}
</div>
</div>
</div> : /* @__PURE__ */ <div className="h-full w-full rounded-lg border border-dashed border-transparent group-hover:border-[#0D9488]/40 flex items-center justify-center text-[10px] text-black/55 dark:text-white/55 opacity-0 group-hover:opacity-100 transition-opacity">+ Réserver</div>}
</div>;
							})}
</div>
</div>)}
</div>
</div>
<MedicalAppointmentModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} practitioners={practitioners} patients={patients} existingAppointments={appointments} onSaveAppointment={addAppointment} initialDoctorId={activeSlotData.doctorId} initialDate={selectedDate} initialTime={activeSlotData.time} />
</div>;
};
