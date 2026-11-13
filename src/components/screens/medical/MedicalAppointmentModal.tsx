import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Check,
  AlertTriangle,
  Stethoscope,
} from 'lucide-react';
import { MedicalAppointmentSlot, MedicalPractitioner, MedicalPatient } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface MedicalAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  practitioners: MedicalPractitioner[];
  patients: MedicalPatient[];
  onSaveAppointment: (slot: MedicalAppointmentSlot) => void;
  existingAppointments?: MedicalAppointmentSlot[];
  initialDoctorId?: string;
  initialDate?: string;
  initialTime?: string;
}



const import_jsx_runtime = require_jsx_runtime();

const MedicalAppointmentModal = ({ isOpen, onClose, practitioners, patients, onSaveAppointment, existingAppointments = [], initialDoctorId, initialDate, initialTime }) => {
	const [doctorId, setDoctorId] = React.useState(initialDoctorId || practitioners[0]?.id || "doc_01");
	const [selectedPatientId, setSelectedPatientId] = React.useState("");
	const [patientName, setPatientName] = React.useState("");
	const [patientPhone, setPatientPhone] = React.useState("");
	const [date, setDate] = React.useState(initialDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [startTime, setStartTime] = React.useState(initialTime || "09:00");
	const [durationMinutes, setDurationMinutes] = React.useState(30);
	const [reason, setReason] = React.useState("Consultation de suivi");
	const [urgency, setUrgency] = React.useState("Normal");
	const [isEmergencyBypass, setIsEmergencyBypass] = React.useState(false);
	const [emergencyBypassReason, setEmergencyBypassReason] = React.useState("");
	const [errorMsg, setErrorMsg] = React.useState("");
	if (!isOpen) return null;
	const handlePatientSelect = (pId: any) => {
		setSelectedPatientId(pId);
		if (pId) {
			const found = patients.find((p) => p.id === pId);
			if (found) {
				setPatientName(found.fullName);
				setPatientPhone(found.phone);
			}
		}
	};
	const toMinutes = (timeStr: any) => {
		const [h, m] = timeStr.split(":").map(Number);
		return (h || 0) * 60 + (m || 0);
	};
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (!patientName.trim()) {
			setErrorMsg("Veuillez renseigner le nom du patient.");
			return;
		}
		const doctor = practitioners.find((p) => p.id === doctorId);
		const newStart = toMinutes(startTime);
		const newEnd = newStart + durationMinutes;
		const conflictingSlot = existingAppointments.find((apt) => {
			if (apt.date !== date || apt.doctorId !== doctorId) return false;
			if (apt.status === "Cancelled" || apt.status === "NoShow") return false;
			const aptStart = toMinutes(apt.startTime);
			const aptEnd = aptStart + (apt.durationMinutes || 30);
			return Math.max(newStart, aptStart) < Math.min(newEnd, aptEnd);
		});
		if (conflictingSlot && !isEmergencyBypass) {
			setErrorMsg(`Conflit d'horaire détecté : ${doctor?.fullName || "Le médecin"} a déjà un rendez-vous avec ${conflictingSlot.patientName} de ${conflictingSlot.startTime} à ${Math.floor((toMinutes(conflictingSlot.startTime) + (conflictingSlot.durationMinutes || 30)) / 60).toString().padStart(2, "0")}:${((toMinutes(conflictingSlot.startTime) + (conflictingSlot.durationMinutes || 30)) % 60).toString().padStart(2, "0")}. Cochez "Sur-réservation d'urgence" ci-dessous pour forcer l'ajout.`);
			return;
		}
		if (conflictingSlot && isEmergencyBypass && !emergencyBypassReason.trim()) {
			setErrorMsg("Veuillez renseigner un motif clinique justifiant la sur-réservation d'urgence.");
			return;
		}
		onSaveAppointment({
			id: `apt_${Date.now()}`,
			doctorId,
			doctorName: doctor?.fullName || "Dr. Praticien",
			patientId: selectedPatientId || void 0,
			patientName: patientName.trim(),
			patientPhone: patientPhone.trim(),
			date,
			startTime,
			durationMinutes,
			reason: reason.trim(),
			status: "Booked",
			urgency,
			isEmergencyBypass,
			emergencyBypassReason: isEmergencyBypass ? emergencyBypassReason.trim() : void 0
		});
		onClose();
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
<div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
<div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-[#F3EDE7] dark:bg-neutral-800/40">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-bold"><Calendar size={20} /></div>
<div>
<h2 className="text-base font-bold text-neutral-900 dark:text-white">Nouveau Rendez-vous Médical</h2>
</div>
</div>
<button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={18} /></button>
</div>
<form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
{errorMsg && /* @__PURE__ */ <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
<AlertTriangle size={16} />
<span>{errorMsg}</span>
</div>}
<LabelSelect label="Médecin / Spécialiste" value={doctorId} onChange={(val) => setDoctorId(val)} options={practitioners.map((p) => ({
							value: p.id,
							label: `${p.fullName} (${p.specialty} · ${p.roomNumber})`
						}))} />
<LabelSelect label="Dossier Patient Existant (ou saisir nouveau)" value={selectedPatientId} onChange={handlePatientSelect} options={[{
							value: "",
							label: "— Nouveau patient (saisie libre) —"
						}, ...patients.map((p) => ({
							value: p.id,
							label: `${p.fullName} (${p.phone})`
						}))]} />
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Nom & Prénom du Patient" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="ex: Amina Touati" required />
<LabelInput label="Téléphone de Contact" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="0550 ..." />
</div>
<div className="grid grid-cols-3 gap-3">
<LabelInput label="Date du RDV" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
<LabelInput label="Heure de Début" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
<LabelSelect label="Durée du Créneau" value={String(durationMinutes)} onChange={(val) => setDurationMinutes(Number(val))} options={[
									{
										value: "15",
										label: "15 min (Contrôle)"
									},
									{
										value: "30",
										label: "30 min (Standard)"
									},
									{
										value: "45",
										label: "45 min (Approfondi)"
									}
								]} />
</div>
<LabelInput label="Motif du Rendez-vous" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex: Bilan annuel, Consultation cardiologique" required />
<div className="flex items-center justify-between p-3 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
<div>
<span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">Niveau de Priorité</span>
<span className="text-[11px] text-neutral-500">Normal ou Prioritaire</span>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => setUrgency("Normal")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${urgency === "Normal" ? "bg-[#0D9488] text-white shadow-xs" : "text-neutral-600 dark:text-neutral-400"}`}>Normal</button>
<button type="button" onClick={() => setUrgency("Prioritaire")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${urgency === "Prioritaire" ? "bg-[#d4522f] text-white shadow-xs" : "text-neutral-600 dark:text-neutral-400"}`}>Prioritaire</button>
</div>
</div>
<div className="p-3 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2">
<label className="flex items-center gap-2.5 cursor-pointer select-none">
<input type="checkbox" checked={isEmergencyBypass} onChange={(e) => setIsEmergencyBypass(e.target.checked)} className="w-4 h-4 rounded text-[#d4522f] accent-[#d4522f] cursor-pointer" />
<span className="text-xs font-bold text-amber-700 dark:text-amber-400">Sur-réservation d'urgence (Bypass de conflit)</span>
</label>
{isEmergencyBypass && /* @__PURE__ */ <div className="pt-1 animate-in fade-in duration-150">
<LabelInput label="Justification Clinique Obligatoire" value={emergencyBypassReason} onChange={(e) => setEmergencyBypassReason(e.target.value)} placeholder="ex: Détresse respiratoire aiguë, douleur thoracique suspecte..." required />
</div>}
</div>
<div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<AtriumButton variant="ghost" type="button" onClick={onClose}>Annuler</AtriumButton>
<AtriumButton variant="primary" type="submit" icon={<Check size={16} />}>Confirmer le Rendez-vous</AtriumButton>
</div>
</form>
</div>
</div>;
};
