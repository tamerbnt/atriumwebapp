import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { MedicalAppointmentSlot, MedicalPractitioner, MedicalPatient } from '../../../types';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { KineticModalShell } from '../../ui/kinetic';
import { evaluateAppointmentConflict } from '../../../utils/medicalDepth';

interface MedicalAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  practitioners: MedicalPractitioner[];
  patients: MedicalPatient[];
  onSaveAppointment: (
    slot: MedicalAppointmentSlot
  ) => void | { ok: boolean; errorMessage?: string };
  existingAppointments?: MedicalAppointmentSlot[];
  initialDoctorId?: string;
  initialDate?: string;
  initialTime?: string;
}

export const MedicalAppointmentModal: React.FC<MedicalAppointmentModalProps> = ({
  isOpen,
  onClose,
  practitioners,
  patients,
  onSaveAppointment,
  existingAppointments = [],
  initialDoctorId,
  initialDate,
  initialTime,
}) => {
  const [doctorId, setDoctorId] = React.useState(initialDoctorId || practitioners[0]?.id || 'doc_01');
  const [selectedPatientId, setSelectedPatientId] = React.useState('');
  const [patientName, setPatientName] = React.useState('');
  const [patientPhone, setPatientPhone] = React.useState('');
  const [date, setDate] = React.useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = React.useState(initialTime || '09:00');
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [reason, setReason] = React.useState('Consultation de suivi');
  const [urgency, setUrgency] = React.useState<'Normal' | 'Prioritaire'>('Normal');
  const [isEmergencyBypass, setIsEmergencyBypass] = React.useState(false);
  const [emergencyBypassReason, setEmergencyBypassReason] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDoctorId(initialDoctorId || practitioners[0]?.id || 'doc_01');
    setSelectedPatientId('');
    setPatientName('');
    setPatientPhone('');
    setDate(initialDate || new Date().toISOString().slice(0, 10));
    setStartTime(initialTime || '09:00');
    setDurationMinutes(30);
    setReason('Consultation de suivi');
    setUrgency('Normal');
    setIsEmergencyBypass(false);
    setEmergencyBypassReason('');
    setErrorMsg('');
  }, [isOpen, initialDoctorId, initialDate, initialTime, practitioners]);

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId);
    if (pId) {
      const found = patients.find((p) => p.id === pId);
      if (found) {
        setPatientName(found.fullName);
        setPatientPhone(found.phone);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!patientName.trim()) {
      setErrorMsg('Veuillez renseigner le nom du patient.');
      return;
    }
    const doctor = practitioners.find((p) => p.id === doctorId);
    const conflict = evaluateAppointmentConflict({
      doctorId,
      doctorName: doctor?.fullName,
      date,
      startTime,
      durationMinutes,
      existingAppointments,
      isEmergencyBypass,
      emergencyBypassReason,
    });
    if (!conflict.ok) {
      setErrorMsg(
        conflict.errorCode === 'MEDICAL_APPOINTMENT_OVERLAP'
          ? `${conflict.errorMessage} Cochez "Sur-réservation d'urgence" ci-dessous pour forcer l'ajout.`
          : conflict.errorMessage || "Conflit d'horaire détecté."
      );
      return;
    }

    const res = onSaveAppointment({
      id: `apt_${Date.now()}`,
      doctorId,
      doctorName: doctor?.fullName || 'Dr. Praticien',
      patientId: selectedPatientId || undefined,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      date,
      startTime,
      durationMinutes,
      reason: reason.trim(),
      status: 'Booked',
      urgency,
      isEmergencyBypass,
      emergencyBypassReason: isEmergencyBypass ? emergencyBypassReason.trim() : undefined,
    });
    if (res && typeof res === 'object' && res.ok === false) {
      setErrorMsg(res.errorMessage || "Impossible d'enregistrer ce rendez-vous.");
      return;
    }
    onClose();
  };
	return (
		<KineticModalShell
			isOpen={isOpen}
			onClose={onClose}
			maxWidthClass="max-w-lg"
			scrimClassName="bg-black/60"
			ariaLabel="Nouveau Rendez-vous Médical"
		>
			<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[90vh] overflow-y-auto">
<div className="px-6 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between bg-[#F5F1EC] dark:bg-[#22201E]">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-semibold"><Calendar size={20} /></div>
<div>
<h2 className="t-card font-semibold text-black dark:text-white">Nouveau Rendez-vous Médical</h2>
</div>
</div>
<button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={18} /></button>
</div>
<form onSubmit={handleSubmit} className="p-6 space-y-4">
{errorMsg && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="none" className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 t-cap flex items-center gap-2">
<AlertTriangle size={16} />
<span>{errorMsg}</span>
</div>}
<LabelSelect field="doctorId" width="100%" height={40} corner={12} label="Médecin / Spécialiste" value={doctorId} onChange={setDoctorId} options={practitioners.map((p: any) => ({
							value: p.id,
							label: `${p.fullName} (${p.specialty} · ${p.roomNumber})`
						}))} />
<LabelSelect field="selectedPatientId" width="100%" height={40} corner={12} label="Dossier Patient Existant (ou saisir nouveau)" value={selectedPatientId} onChange={handlePatientSelect} options={[{
							value: "",
							label: "— Nouveau patient (saisie libre) —"
						}, ...patients.map((p: any) => ({
							value: p.id,
							label: `${p.fullName} (${p.phone})`
						}))]} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput field="patientName" width="100%" height={40} corner={12} label="Nom & Prénom du Patient" value={patientName} onChange={setPatientName} placeholder="ex: Amina Touati" required />
<LabelInput field="patientPhone" width="100%" height={40} corner={12} label="Téléphone de Contact" value={patientPhone} onChange={setPatientPhone} placeholder="0550 ..." />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput field="date" width="100%" height={40} corner={12} label="Date du RDV" type="date" value={date} onChange={setDate} required />
<LabelInput field="startTime" width="100%" height={40} corner={12} label="Heure de Début" type="time" value={startTime} onChange={setStartTime} required />
</div>
<div>
<label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">Durée du Créneau</label>
<LiveSegmentedControl size="md" fullWidth value={String(durationMinutes)} onChange={(val) => setDurationMinutes(Number(val))} options={[
									{ value: "15", label: "15 min (Contrôle)" },
									{ value: "30", label: "30 min (Standard)" },
									{ value: "45", label: "45 min (Approfondi)" }
								]} />
</div>
<LabelInput field="reason" width="100%" height={40} corner={12} label="Motif du Rendez-vous" value={reason} onChange={setReason} placeholder="ex: Bilan annuel, Consultation cardiologique" required />
<div data-sq="card" data-sq-border="none" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
<div>
<span className="t-small font-semibold text-black dark:text-white block">Niveau de Priorité</span>
<span className="t-cap text-black/55 dark:text-white/55">Normal ou Prioritaire</span>
</div>
<LiveSegmentedControl size="md" value={urgency} onChange={(v) => setUrgency(v as 'Normal' | 'Prioritaire')} options={[
									{ value: "Normal", label: "Normal" },
									{ value: "Prioritaire", label: "Prioritaire" }
								]} />
</div>
<div data-sq="card" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2">
<div className="flex items-center justify-between gap-3">
<span className="t-small font-semibold text-amber-700 dark:text-amber-400">Sur-réservation d'urgence (Bypass de conflit)</span>
<LiveSwitch checked={isEmergencyBypass} onCheckedChange={setIsEmergencyBypass} aria-label="Sur-réservation d'urgence" />
</div>
{isEmergencyBypass && /* @__PURE__ */ <div className="pt-1 animate-in fade-in duration-150">
<LabelInput field="emergencyBypassReason" width="100%" height={40} corner={12} label="Justification Clinique Obligatoire" value={emergencyBypassReason} onChange={setEmergencyBypassReason} placeholder="ex: Détresse respiratoire aiguë, douleur thoracique suspecte..." required />
</div>}
</div>
<div className="pt-3 border-t border-[var(--atr-divider)] flex items-center justify-end gap-2">
<Button tone="soft" size={40} type="button" onClick={onClose}>Annuler</Button>
<Button tone="accent" size={40} type="submit" leading={<Check size={16} />}>Confirmer le Rendez-vous</Button>
</div>
</form>
			</div>
		</KineticModalShell>
	);
};
