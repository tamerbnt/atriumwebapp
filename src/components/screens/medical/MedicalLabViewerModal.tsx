import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  Stethoscope,
  Microscope,
} from 'lucide-react';
import { MedicalLabRecord, MedicalPatient, MedicalPractitioner } from '../../../types';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion, KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface MedicalLabViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: MedicalPatient | null;
  labRecords: MedicalLabRecord[];
  practitioners: MedicalPractitioner[];
  onAddLabRecord: (record: MedicalLabRecord) => void;
}



export const MedicalLabViewerModal: React.FC<MedicalLabViewerModalProps> = ({ isOpen, onClose, patient: rawPatient, labRecords, practitioners, onAddLabRecord }) => {
	const patient = useRetainedModalValue(isOpen ? rawPatient : null);
	const patientLabs = patient ? labRecords.filter((l: any) => l.patientId === patient.id) : [];
	const [activeTab, setActiveTab] = React.useState("list");
	const [testCategory, setTestCategory] = React.useState("Biochimie Sanguine");
	const [doctorId, setDoctorId] = React.useState(practitioners[0]?.id || "");
	const [glycemieVal, setGlycemieVal] = React.useState("1.15");
	const [creatinineVal, setCreatinineVal] = React.useState("9.5");
	const [hbA1cVal, setHbA1cVal] = React.useState("6.8");
	const [crpVal, setCrpVal] = React.useState("4.2");
	const [clinicalConclusion, setClinicalConclusion] = React.useState("Bilan biologique globalement satisfaisant.");
	React.useEffect(() => {
		if (!isOpen) return;
		setActiveTab("list");
		setDoctorId(practitioners[0]?.id || "");
	}, [isOpen, rawPatient?.id]);
	const handleCreateLab = (e: any) => {
		e.preventDefault();
		if (!patient) return;
		const doc = practitioners.find((p: any) => p.id === doctorId);
		const glyNum = parseFloat(glycemieVal) || 1;
		const creatNum = parseFloat(creatinineVal) || 10;
		const hbaNum = parseFloat(hbA1cVal) || 6;
		const crpNum = parseFloat(crpVal) || 3;
		onAddLabRecord({
			id: `lab_${Date.now()}`,
			patientId: patient.id,
			patientName: patient.fullName,
			doctorId,
			doctorName: doc?.fullName || "Dr. Praticien",
			testCategory,
			date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
			status: "Validé",
			parameters: [
				{
					name: "Glycémie à jeun",
					value: glycemieVal,
					unit: "g/L",
					min: .7,
					max: 1.1,
					isAbnormal: glyNum > 1.1 || glyNum < .7,
					status: glyNum > 1.1 ? "high" : glyNum < .7 ? "low" : "normal"
				},
				{
					name: "Créatinine Sérique",
					value: creatinineVal,
					unit: "mg/L",
					min: 7,
					max: 12,
					isAbnormal: creatNum > 12 || creatNum < 7,
					status: creatNum > 12 ? "high" : creatNum < 7 ? "low" : "normal"
				},
				{
					name: "Hémoglobine Glyquée (HbA1c)",
					value: hbA1cVal,
					unit: "%",
					min: 4,
					max: 6.5,
					isAbnormal: hbaNum > 6.5,
					status: hbaNum > 6.5 ? "high" : "normal"
				},
				{
					name: "Protéine C-Réactive (CRP)",
					value: crpVal,
					unit: "mg/L",
					min: 0,
					max: 6,
					isAbnormal: crpNum > 6,
					status: crpNum > 6 ? "high" : "normal"
				}
			],
			clinicalConclusion
		});
		setActiveTab("list");
	};
	return (
		<KineticModalShell
			isOpen={isOpen && Boolean(rawPatient)}
			onClose={onClose}
			maxWidthClass="max-w-3xl"
			scrimClassName="bg-black/60"
			ariaLabel="Dossier Biologique & Imagerie Médicale"
		>
			{patient && (
				<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[88vh] overflow-hidden">
<div className="px-6 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between bg-[#F3EDE7] dark:bg-[#22201E]">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-semibold"><Microscope size={20} /></div>
<div className="flex items-center gap-2">
<h2 className="t-card font-semibold text-black dark:text-white">Dossier Biologique & Imagerie Médicale</h2>
<span className="t-cap tabular-nums px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 text-black/70 dark:text-white/75">{patient.fullName}</span>
</div>
</div>
<div className="flex items-center gap-2">
<LiveSegmentedControl size="sm" value={activeTab} onChange={setActiveTab} options={[
									{ value: "list", label: `Bilans (${patientLabs.length})` },
									{ value: "create", label: "+ Saisir Résultats" }
								]} />
<button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] cursor-pointer"><X size={18} /></button>
</div>
</div>
<div className="p-6 overflow-y-auto flex-1">
{activeTab === "list" ? patientLabs.length > 0 ? /* @__PURE__ */ <div className="space-y-4">
{patientLabs.map((lab: any) => /* @__PURE__ */ <div key={lab.id} data-sq="card" data-sq-border="solid" className="p-5 bg-[#F3EDE7] dark:bg-[#191716] space-y-3">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="font-semibold t-small text-black dark:text-white">{lab.testCategory}</span>
<span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
{"· "}
{lab.date}
</span>
<span className="t-small font-semibold text-[#0D9488]">
{"· "}
{lab.doctorName}
</span>
</div>
<span className="t-small font-semibold tabular-nums px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{lab.status}</span>
</div>
<div data-sq="table" data-sq-border="solid" className="bg-white dark:bg-[#22201E] overflow-hidden">
<table className="w-full t-cap text-left">
<thead>
<tr className="bg-neutral-50 dark:bg-neutral-750 t-cap tabular-nums text-black/55 dark:text-white/55 border-b border-[var(--atr-divider)]">
<th className="py-2 px-3">Paramètre</th>
<th className="py-2 px-3">Valeur Mesurée</th>
<th className="py-2 px-3">Intervalle Normal</th>
<th className="py-2 px-3 text-right">Statut</th>
</tr>
</thead>
<tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
{lab.parameters.map((param: any, i: number) => /* @__PURE__ */ <tr key={i} className="hover:bg-neutral-50/50">
<td className="py-2 px-3 font-sans font-semibold text-black dark:text-white">{param.name}</td>
<td className="py-2 px-3 font-semibold text-black dark:text-white">
{param.value}
{" "}
<span className="t-cap text-black/55 dark:text-white/55 font-normal">{param.unit}</span>
</td>
<td className="py-2 px-3 text-black/55 dark:text-white/55 t-cap">
{param.min}
{" – "}
{param.max}
{" "}
{param.unit}
</td>
<td className="py-2 px-3 text-right">
{param.isAbnormal ? /* @__PURE__ */ <span className="px-2 py-1 rounded-full t-small font-semibold bg-red-500/15 text-red-600 dark:text-red-400">{param.status === "high" ? "ÉLEVÉ ▲" : "BAS ▼"}</span> : /* @__PURE__ */ <span className="px-2 py-1 rounded-full t-small font-semibold text-emerald-600 dark:text-emerald-400">Normal ✓</span>}
</td>
</tr>)}
</tbody>
</table>
</div>
<div className="t-cap text-black/70 dark:text-white/75 italic pt-1">
<strong>{"Conclusion Médicale: "}</strong>
{lab.clinicalConclusion}
</div>
{lab.imagingReport && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="solid" className="p-3 bg-blue-50/60 dark:bg-blue-900/20 [--sq-stroke:#bfdbfe] dark:[--sq-stroke:#1e40af] t-cap text-blue-900 dark:text-blue-300">
<strong>
Rapport d'Imagerie (
{lab.imagingModality}
{"): "}
</strong>
{lab.imagingReport}
</div>}
</div>)}
</div> : <KineticEmptyStateMotion motionKey={`med-lab-empty-${patient.id}`}>
  <EmptyState
    variant="compact"
    tone="neutral"
    icon={<Microscope size={20} />}
    title="Aucun bilan biologique"
    description="Aucun bilan biologique enregistré pour ce patient."
    secondaryAction={{
      label: 'Saisir le premier bilan',
      icon: <Plus size={14} />,
      onClick: () => setActiveTab('create'),
    }}
  />
</KineticEmptyStateMotion> : /* @__PURE__ */ <form onSubmit={handleCreateLab} className="space-y-4">
<div>
<label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">Type de Bilan</label>
<LiveSegmentedControl size="sm" fullWidth value={testCategory} onChange={setTestCategory} options={[
									{ value: "Biochimie Sanguine", label: "Biochimie" },
									{ value: "Hématologie (NFS)", label: "Hématologie NFS" },
									{ value: "Bilan Lipidique", label: "Lipidique" },
									{ value: "Inflammatoire & Cardiaque", label: "Inflammatoire" }
								]} />
</div>
<LabelSelect field="doctorId" width="100%" height={40} corner={12} label="Médecin Prescripteur" value={doctorId} onChange={setDoctorId} options={practitioners.map((p: any) => ({
									value: p.id,
									label: p.fullName
								}))} />
<div data-sq="card" data-sq-border="solid" className="p-4 bg-[#F3EDE7] dark:bg-[#191716] space-y-3">
<span className="t-small font-semibold text-black/70 dark:text-white/75 block">Valeurs Biologiques Mesurées</span>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
<LabelInput field="glycemieVal" width="100%" height={40} corner={12} label="Glycémie (0.7-1.1 g/L)" value={glycemieVal} onChange={setGlycemieVal} />
<LabelInput field="creatinineVal" width="100%" height={40} corner={12} label="Créatinine (7-12 mg/L)" value={creatinineVal} onChange={setCreatinineVal} />
<LabelInput field="hbA1cVal" width="100%" height={40} corner={12} label="HbA1c (4.0-6.5 %)" value={hbA1cVal} onChange={setHbA1cVal} />
<LabelInput field="crpVal" width="100%" height={40} corner={12} label="CRP (< 6.0 mg/L)" value={crpVal} onChange={setCrpVal} />
</div>
</div>
<LabelTextarea field="clinicalConclusion" width="100%" corner={12} label="Conclusion & Interprétation Clinique" value={clinicalConclusion} onChange={setClinicalConclusion} rows={3} required />
<div className="pt-3 border-t border-[var(--atr-divider)] flex justify-end gap-2 items-center">
<Button tone="soft" size={40} type="button" onClick={() => setActiveTab("list")}>Annuler</Button>
<Button tone="accent" size={40} type="submit" leading={<CheckCircle2 size={16} />}>Enregistrer le Bilan</Button>
</div>
</form>}
</div>
				</div>
			)}
		</KineticModalShell>
	);
};
