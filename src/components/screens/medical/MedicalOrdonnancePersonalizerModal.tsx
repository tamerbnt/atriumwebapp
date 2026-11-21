import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Printer,
  FileText,
  Check,
  ShieldCheck,
  Building,
  QrCode,
  Sparkles,
  Palette,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { DoctorOrdonnanceConfig, MedicalPractitioner } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface MedicalOrdonnancePersonalizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  practitioners: MedicalPractitioner[];
  doctorConfigs: Record<string, DoctorOrdonnanceConfig>;
  onSaveConfig: (doctorId: string, config: DoctorOrdonnanceConfig) => void;
  initialDoctorId?: string;
}



export const MedicalOrdonnancePersonalizerModal: React.FC<MedicalOrdonnancePersonalizerModalProps> = ({ isOpen, onClose, practitioners, doctorConfigs, onSaveConfig, initialDoctorId }) => {
	const [selectedDoctorId, setSelectedDoctorId] = React.useState(initialDoctorId || practitioners[0]?.id || "doc_01");
	const [formData, setFormData] = React.useState(() => {
		return doctorConfigs[selectedDoctorId] || {
			doctorId: selectedDoctorId,
			doctorName: "Dr. Médecin Praticien",
			specialtyTitle: "Médecine Générale",
			academicCredentials: "Diplômé de la Faculté de Médecine",
			licenseNumber: "N° d'Ordre: 16/00000",
			cabinetPhone: "023 45 67 89",
			emergencyPhone: "0550 00 00 00",
			clinicAddress: "14 Rue Didouche Mourad, Alger",
			paperFormat: "A5",
			printMode: "full_digital",
			themeAccent: "emerald",
			showWatermark: true,
			footerConsultationHours: "Du Samedi au Jeudi de 08h30 à 16h30",
			footerLegalNotice: "Ne pas dépasser la posologie prescrite · Validité 3 mois",
			digitalStampText: "Dr. Médecin Praticien\nOrdre National N° 16/00000",
			isStampEnabled: true
		};
	});
	const [isSavedToast, setIsSavedToast] = React.useState(false);
	React.useEffect(() => {
		if (doctorConfigs[selectedDoctorId]) setFormData(doctorConfigs[selectedDoctorId]);
		else {
			const doc = practitioners.find((p: any) => p.id === selectedDoctorId);
			setFormData({
				doctorId: selectedDoctorId,
				doctorName: doc?.fullName || "Dr. Médecin Praticien",
				specialtyTitle: doc?.specialty || "Médecine Générale",
				academicCredentials: "Diplômé de la Faculté de Médecine",
				licenseNumber: doc?.licenseNumber || "N° d'Ordre: 16/00000",
				cabinetPhone: doc?.phone || "023 45 67 89",
				emergencyPhone: "0550 00 00 00",
				clinicAddress: "Polyclinique El-Chifa, 14 Rue Didouche Mourad, Alger",
				paperFormat: "A5",
				printMode: "full_digital",
				themeAccent: "emerald",
				showWatermark: true,
				footerConsultationHours: "Du Samedi au Jeudi de 08h30 à 16h30",
				footerLegalNotice: "Ne pas dépasser la posologie prescrite · Validité 3 mois",
				digitalStampText: `${doc?.fullName || "Dr."}\n${doc?.specialty || ""}\n${doc?.licenseNumber || ""}`,
				isStampEnabled: true
			});
		}
	}, [
		selectedDoctorId,
		doctorConfigs,
		practitioners
	]);
	if (!isOpen) return null;
	const handleSave = () => {
		onSaveConfig(selectedDoctorId, formData);
		setIsSavedToast(true);
		setTimeout(() => {
			setIsSavedToast(false);
			onClose();
		}, 900);
	};
	const getAccentColor = (accent: any) => {
		switch (accent) {
			case "emerald": return "#0D9488";
			case "navy": return "#1E3A8A";
			case "burgundy": return "#831843";
			case "obsidian": return "#18181B";
			default: return "#d4522f";
		}
	};
	const currentAccentHex = getAccentColor(formData.themeAccent);
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
<div className="sq-elev-pop w-full max-w-6xl max-h-[92vh] flex flex-col">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full max-h-[92vh] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col overflow-hidden">
<div className="px-6 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between shrink-0 bg-[#F3EDE7] dark:bg-[#22201E]">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Sliders size={20} /></div>
<div>
<div className="flex items-center gap-2">
<h2 className="t-card font-semibold text-black dark:text-white">Studio de Personnalisation d'Ordonnance</h2>
<span className="t-small font-semibold px-2 py-1 rounded-full bg-[#0D9488]/15 text-[#0D9488]">Format A5 & A4</span>
</div>
<p className="t-cap text-black/55 dark:text-white/75">
Configurez l'en-tête, le papier pré-imprimé, le cachet officiel et les mentions légales par médecin
</p>
</div>
</div>
<div className="flex items-center gap-2">
{isSavedToast && /* @__PURE__ */ <span className="t-small font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
<Check size={14} />
{" Modèle enregistré"}
</span>}
<button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X size={18} /></button>
</div>
</div>
<div className="px-6 py-2 bg-neutral-100/70 dark:bg-[#191716] border-b border-[var(--atr-divider)] flex items-center gap-2 overflow-x-auto shrink-0">
<span className="t-small font-semibold text-black/55 dark:text-white/75 shrink-0 mr-1">Médecin:</span>
{practitioners.map((p: any) => {
						const isSelected = p.id === selectedDoctorId;
						return /* @__PURE__ */ <button key={p.id} type="button" data-no-liquid="true" data-sq="ctl-sm" data-sq-border={isSelected ? "solid" : "none"} onClick={() => setSelectedDoctorId(p.id)} className={`px-3 py-2 t-small font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${isSelected ? "bg-white dark:bg-[#2B2825] text-black dark:text-white" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>
<span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
<span>{p.fullName}</span>
<span className="t-cap text-black/55 dark:text-white/55 font-normal">
(
{p.roomNumber}
)
</span>
</button>;
					})}
</div>
<div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
<div className="col-span-12 lg:col-span-6 p-6 overflow-y-auto space-y-5 border-r border-[var(--atr-divider)]">
<div data-sq="card" data-sq-border="solid" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
<span className="t-small font-semibold text-black/70 dark:text-white/75 flex items-center gap-2">
<Printer size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
Format de Papier & Mode d'Impression
</span>
<div className="grid grid-cols-2 gap-3">
<div>
<label className="t-small font-semibold text-black/70 dark:text-white/75 block mb-1">Taille du Papier</label>
<div data-sq="ctl" data-sq-border="solid" className="grid grid-cols-2 gap-1 p-[3px] bg-white dark:bg-[#191716]">
<button type="button" data-no-liquid="true" data-sq="thumb" data-sq-border="none" onClick={() => setFormData({
													...formData,
													paperFormat: "A5"
												})} className={`py-2 t-small font-semibold transition-all cursor-pointer ${formData.paperFormat === "A5" ? "bg-[#d4522f] text-white" : "text-black/70 dark:text-white/75"}`}>A5 (148×210)</button>
<button type="button" data-no-liquid="true" data-sq="thumb" data-sq-border="none" onClick={() => setFormData({
													...formData,
													paperFormat: "A4"
												})} className={`py-2 t-small font-semibold transition-all cursor-pointer ${formData.paperFormat === "A4" ? "bg-[#d4522f] text-white" : "text-black/70 dark:text-white/75"}`}>A4 (210×297)</button>
</div>
</div>
<div>
<label className="t-small font-semibold text-black/70 dark:text-white/75 block mb-1">Support Papier</label>
<div data-sq="ctl" data-sq-border="solid" className="grid grid-cols-2 gap-1 p-[3px] bg-white dark:bg-[#191716]">
<button type="button" data-no-liquid="true" data-sq="thumb" data-sq-border="none" onClick={() => setFormData({
													...formData,
													printMode: "full_digital"
												})} className={`py-2 t-small font-semibold transition-all cursor-pointer ${formData.printMode === "full_digital" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black" : "text-black/70 dark:text-white/75"}`}>En-tête Numérique</button>
<button type="button" data-no-liquid="true" data-sq="thumb" data-sq-border="none" onClick={() => setFormData({
													...formData,
													printMode: "preprinted_paper"
												})} className={`py-2 t-small font-semibold transition-all cursor-pointer ${formData.printMode === "preprinted_paper" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black" : "text-black/70 dark:text-white/75"}`}>Papier Pré-imprimé</button>
</div>
</div>
</div>
{formData.printMode === "preprinted_paper" && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="solid" className="p-3 bg-amber-500/10 [--sq-stroke:rgba(245,158,11,0.3)] text-amber-700 dark:text-amber-300 t-cap">
Mode Pré-imprimé actif: L'en-tête et le logo ne seront pas imprimés pour laisser la place à votre papier à en-tête physique. Seules les données patient et les médicaments seront imprimés avec marges calibrées.
</div>}
</div>
<div className="space-y-3">
<span className="t-small font-semibold text-black/70 dark:text-white/75 flex items-center gap-2">
<Building size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
Identité & Titres Médicaux
</span>
<LabelInput label="Nom et Prénom du Médecin" value={formData.doctorName} onChange={(e) => setFormData({
											...formData,
											doctorName: e.target.value
										})} />
<LabelInput label="Spécialité & Discipline (ex: Cardiologue)" value={formData.specialtyTitle} onChange={(e) => setFormData({
											...formData,
											specialtyTitle: e.target.value
										})} />
<LabelInput label="Titres Académiques & Hospitaliers" value={formData.academicCredentials} onChange={(e) => setFormData({
											...formData,
											academicCredentials: e.target.value
										})} />
<div className="grid grid-cols-2 gap-3">
<LabelInput label="N° Inscription Ordre des Médecins" value={formData.licenseNumber} onChange={(e) => setFormData({
												...formData,
												licenseNumber: e.target.value
											})} />
<LabelInput label="Téléphone Cabinet / Secrétariat" value={formData.cabinetPhone} onChange={(e) => setFormData({
												...formData,
												cabinetPhone: e.target.value
											})} />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Numéro d'Urgence (optionnel)" value={formData.emergencyPhone} onChange={(e) => setFormData({
												...formData,
												emergencyPhone: e.target.value
											})} />
<LabelInput label="Adresse de la Polyclinique" value={formData.clinicAddress} onChange={(e) => setFormData({
												...formData,
												clinicAddress: e.target.value
											})} />
</div>
</div>
<div data-sq="card" data-sq-border="solid" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
<span className="t-small font-semibold text-black/70 dark:text-white/75 flex items-center gap-2">
<Palette size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
Palette de Style & Sécurité
</span>
<div className="flex items-center justify-between">
<div>
<span className="t-small font-semibold text-black/70 dark:text-white/75 block">Couleur d'En-tête Clinique</span>
<span className="t-cap text-black/55 dark:text-white/75">Bandeau de séparation et lettrage médical</span>
</div>
					<div className="flex items-center gap-2">
						{(["emerald", "navy", "burgundy", "obsidian", "terracotta"] as const).map((accent) => (
							<button
								key={accent}
								type="button"
								onClick={() =>
									setFormData({
										...formData,
										themeAccent: accent,
									})
								}
								className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
									formData.themeAccent === accent
										? "scale-110 border-black dark:border-white shadow-xs"
										: "border-transparent opacity-80 hover:opacity-100"
								}`}
								style={{ backgroundColor: getAccentColor(accent) }}
								title={accent}
								aria-label={accent}
							/>
						))}
					</div>
</div>
<div className="flex items-center justify-between pt-2 border-t border-[var(--atr-divider)]">
<span className="t-cap text-black/70 dark:text-white/75">Filigrane Caducée / Armoirie Médicale en arrière-plan</span>
<input type="checkbox" checked={formData.showWatermark} onChange={(e) => setFormData({
												...formData,
												showWatermark: e.target.checked
											})} className="w-4 h-4 rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] accent-[#d4522f] cursor-pointer" />
</div>
<div className="flex items-center justify-between pt-2 border-t border-[var(--atr-divider)]">
<span className="t-cap text-black/70 dark:text-white/75">Afficher le Cachet / Tampon Numérique Officiel</span>
<input type="checkbox" checked={formData.isStampEnabled} onChange={(e) => setFormData({
												...formData,
												isStampEnabled: e.target.checked
											})} className="w-4 h-4 rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] accent-[#d4522f] cursor-pointer" />
</div>
</div>
<div className="space-y-3">
<LabelInput label="Horaires de Consultation (Pied de page)" value={formData.footerConsultationHours} onChange={(e) => setFormData({
										...formData,
										footerConsultationHours: e.target.value
									})} />
<LabelInput label="Mention Légale / Validité Ordonnance" value={formData.footerLegalNotice} onChange={(e) => setFormData({
										...formData,
										footerLegalNotice: e.target.value
									})} />
</div>
</div>
<div className="col-span-12 lg:col-span-6 bg-[#F3EDE7] dark:bg-[#191716] p-6 flex flex-col items-center justify-center overflow-y-auto">
<div className="w-full max-w-[430px] flex items-center justify-between mb-3 t-cap text-black/55 dark:text-white/75">
<span className="font-semibold flex items-center gap-2">
<Eye size={14} className="text-[#0D9488]" />
Aperçu Réel Ordonnance (
{formData.paperFormat}
)
</span>
<span className="t-cap tabular-nums">
{formData.printMode === "preprinted_paper" ? "Mode Papier Pré-imprimé" : "Mode Numérique Complet"}
</span>
</div>
<div className={`printable-document w-full max-w-[430px] bg-white text-black rounded-[var(--r-card,16px)] shadow-xl border border-black/[0.14] dark:border-white/[0.14] p-6 flex flex-col justify-between relative overflow-hidden select-none transition-all ${formData.paperFormat === "A4" ? "min-h-[580px]" : "min-h-[460px]"}`}>
{formData.showWatermark && /* @__PURE__ */ <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none" style={{ color: currentAccentHex }}><FileText size={220} /></div>}
{formData.printMode === "full_digital" ? /* @__PURE__ */ <div className="border-b-2 pb-3" style={{ borderColor: currentAccentHex }}>
<div className="flex justify-between items-start">
<div>
<h3 className="t-card font-semibold tracking-wide" style={{ color: currentAccentHex }}>{formData.doctorName}</h3>
<p className="t-small font-semibold text-black">{formData.specialtyTitle}</p>
<p className="t-cap text-black/55">{formData.academicCredentials}</p>
<p className="t-small tabular-nums font-medium text-black/75 mt-0.5">{formData.licenseNumber}</p>
</div>
<div className="text-right t-cap text-black/55 tabular-nums">
<p className="font-semibold text-black">POLYCLINIQUE EL-CHIFA</p>
<p>{formData.clinicAddress}</p>
<p>{formData.cabinetPhone}</p>
{formData.emergencyPhone && /* @__PURE__ */ <p className="text-red-600">{formData.emergencyPhone}</p>}
</div>
</div>
</div> : /* @__PURE__ */ <div className="h-16 border-b border-dashed border-black/[0.20] flex items-center justify-center t-cap text-black/55 tabular-nums">[ Espace réservé à votre en-tête physique pré-imprimé ]</div>}
<div className="my-3 py-2 px-3 rounded-[var(--r-check,6px)] bg-neutral-50 border border-black/[0.12] t-cap flex justify-between items-center tabular-nums">
<div>
<span className="text-black/55">{"Patient: "}</span>
<span className="font-semibold text-black">Meriem Haddad (31 ans)</span>
</div>
<div>
<span className="text-black/55">{"Alger, le "}</span>
<span className="font-semibold text-black">10 Mai 2026</span>
</div>
</div>
<div className="flex-1 space-y-4 my-2 t-cap">
<div className="text-center">
<span className="t-small italic font-semibold text-black/75">ORDONNANCE</span>
</div>
<div className="space-y-3 font-sans">
<div className="pl-2 border-l-2" style={{ borderColor: currentAccentHex }}>
<div className="font-semibold text-black t-small">1. Metformine 850mg (Comprimés)</div>
<div className="t-cap text-black/75 italic">1 comprimé deux fois par jour au milieu des repas pendant 3 mois.</div>
</div>
<div className="pl-2 border-l-2" style={{ borderColor: currentAccentHex }}>
<div className="font-semibold text-black t-small">2. Gliclazide 30mg (Comprimé LM)</div>
<div className="t-cap text-black/75 italic">1 comprimé le matin au petit-déjeuner pendant 3 mois.</div>
</div>
</div>
</div>
<div className="mt-4 pt-3 border-t border-black/[0.12] flex justify-between items-end">
<div className="flex items-center gap-2">
<div className="w-10 h-10 border border-black/[0.18] rounded-[var(--r-check,6px)] p-1 flex items-center justify-center bg-white"><QrCode size={34} className="text-black" /></div>
<div className="t-cap tabular-nums text-black/55">
<span className="block font-semibold text-black/75">VÉRIFICATION CNAS</span>
<span>SHA: CF-9921-DZ</span>
</div>
</div>
{formData.isStampEnabled && /* @__PURE__ */ <div className="w-32 h-16 border-2 border-dashed border-blue-600 rounded-[var(--r-ctl-sm,10px)] p-2 flex flex-col justify-center items-center text-center rotate-[-3deg] text-blue-700 bg-blue-50/40 select-none">
<span className="t-small font-semibold">{formData.doctorName}</span>
<span className="t-small font-semibold">{formData.specialtyTitle}</span>
<span className="t-cap tabular-nums mt-0.5">{formData.licenseNumber}</span>
</div>}
</div>
{formData.printMode === "full_digital" && /* @__PURE__ */ <div className="mt-3 pt-2 border-t border-black/[0.12] t-cap text-black/55 text-center tabular-nums space-y-0.5">
<p>{formData.footerConsultationHours}</p>
<p className="font-semibold text-black/55">{formData.footerLegalNotice}</p>
</div>}
</div>
</div>
</div>
<div className="px-6 py-4 border-t border-[var(--atr-divider)] flex items-center justify-between shrink-0 bg-[#F3EDE7] dark:bg-[#22201E]">
<AtriumButton variant="ghost" onClick={onClose}>Annuler</AtriumButton>
<AtriumButton variant="primary" onClick={handleSave} icon={<Check size={16} />}>Enregistrer le Modèle d'Ordonnance</AtriumButton>
</div>
</div>
</div>
</div>;
};
