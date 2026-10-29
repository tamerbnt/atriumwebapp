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

export const MedicalOrdonnancePersonalizerModal: React.FC<MedicalOrdonnancePersonalizerModalProps> = ({
  isOpen,
  onClose,
  practitioners,
  doctorConfigs,
  onSaveConfig,
  initialDoctorId,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    initialDoctorId || practitioners[0]?.id || 'doc_01'
  );

  const [formData, setFormData] = useState<DoctorOrdonnanceConfig>(() => {
    return (
      doctorConfigs[selectedDoctorId] || {
        doctorId: selectedDoctorId,
        doctorName: 'Dr. Médecin Praticien',
        specialtyTitle: 'Médecine Générale',
        academicCredentials: 'Diplômé de la Faculté de Médecine',
        licenseNumber: 'N° d\'Ordre: 16/00000',
        cabinetPhone: '023 45 67 89',
        emergencyPhone: '0550 00 00 00',
        clinicAddress: '14 Rue Didouche Mourad, Alger',
        paperFormat: 'A5',
        printMode: 'full_digital',
        themeAccent: 'emerald',
        showWatermark: true,
        footerConsultationHours: 'Du Samedi au Jeudi de 08h30 à 16h30',
        footerLegalNotice: 'Ne pas dépasser la posologie prescrite · Validité 3 mois',
        digitalStampText: 'Dr. Médecin Praticien\nOrdre National N° 16/00000',
        isStampEnabled: true,
      }
    );
  });

  const [isSavedToast, setIsSavedToast] = useState(false);

  // Sync form data when selected doctor changes
  useEffect(() => {
    if (doctorConfigs[selectedDoctorId]) {
      setFormData(doctorConfigs[selectedDoctorId]);
    } else {
      const doc = practitioners.find((p) => p.id === selectedDoctorId);
      setFormData({
        doctorId: selectedDoctorId,
        doctorName: doc?.fullName || 'Dr. Médecin Praticien',
        specialtyTitle: doc?.specialty || 'Médecine Générale',
        academicCredentials: 'Diplômé de la Faculté de Médecine',
        licenseNumber: doc?.licenseNumber || 'N° d\'Ordre: 16/00000',
        cabinetPhone: doc?.phone || '023 45 67 89',
        emergencyPhone: '0550 00 00 00',
        clinicAddress: 'Polyclinique El-Chifa, 14 Rue Didouche Mourad, Alger',
        paperFormat: 'A5',
        printMode: 'full_digital',
        themeAccent: 'emerald',
        showWatermark: true,
        footerConsultationHours: 'Du Samedi au Jeudi de 08h30 à 16h30',
        footerLegalNotice: 'Ne pas dépasser la posologie prescrite · Validité 3 mois',
        digitalStampText: `${doc?.fullName || 'Dr.'}\n${doc?.specialty || ''}\n${doc?.licenseNumber || ''}`,
        isStampEnabled: true,
      });
    }
  }, [selectedDoctorId, doctorConfigs, practitioners]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(selectedDoctorId, formData);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 900);
  };

  const getAccentColor = (accent: DoctorOrdonnanceConfig['themeAccent']) => {
    switch (accent) {
      case 'emerald':
        return '#0D9488';
      case 'navy':
        return '#1E3A8A';
      case 'burgundy':
        return '#831843';
      case 'obsidian':
        return '#18181B';
      case 'terracotta':
      default:
        return '#C4785A';
    }
  };

  const currentAccentHex = getAccentColor(formData.themeAccent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl max-h-[92vh] rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-[#F8F9FA] dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Studio de Personnalisation d'Ordonnance
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488]">
                  Format A5 & A4
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configurez l'en-tête, le papier pré-imprimé, le cachet officiel et les mentions légales par médecin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSavedToast && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check size={14} /> Modèle enregistré
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Doctor Tab Switcher */}
        <div className="px-6 py-2.5 bg-neutral-100/70 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
            Médecin:
          </span>
          {practitioners.map((p) => {
            const isSelected = p.id === selectedDoctorId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedDoctorId(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs border border-neutral-300 dark:border-neutral-600'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.fullName}</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                  ({p.roomNumber})
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Split Layout: Left Form (45%) | Right Live Document Preview (55%) */}
        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* Left Configuration Panel */}
          <div className="col-span-12 lg:col-span-6 p-6 overflow-y-auto space-y-5 border-r border-neutral-200 dark:border-neutral-800">
            {/* 1. Paper Format & Mode Section */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Printer size={14} className="text-[#C4785A]" />
                Format de Papier & Mode d'Impression
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* A5 vs A4 */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                    Taille du Papier
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paperFormat: 'A5' })}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        formData.paperFormat === 'A5'
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      A5 (148×210)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paperFormat: 'A4' })}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        formData.paperFormat === 'A4'
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      A4 (210×297)
                    </button>
                  </div>
                </div>

                {/* Digital vs Pre-printed Paper */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                    Support Papier
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, printMode: 'full_digital' })}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                        formData.printMode === 'full_digital'
                          ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      En-tête Numérique
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, printMode: 'preprinted_paper' })}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                        formData.printMode === 'preprinted_paper'
                          ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Papier Pré-imprimé
                    </button>
                  </div>
                </div>
              </div>

              {formData.printMode === 'preprinted_paper' && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px]">
                  Mode Pré-imprimé actif: L'en-tête et le logo ne seront pas imprimés pour laisser la place à votre papier à en-tête physique. Seules les données patient et les médicaments seront imprimés avec marges calibrées.
                </div>
              )}
            </div>

            {/* 2. Doctor Identity & Credentials */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Building size={14} className="text-[#C4785A]" />
                Identité & Titres Médicaux
              </span>

              <LabelInput
                label="Nom et Prénom du Médecin"
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              />

              <LabelInput
                label="Spécialité & Discipline (ex: Cardiologue)"
                value={formData.specialtyTitle}
                onChange={(e) => setFormData({ ...formData, specialtyTitle: e.target.value })}
              />

              <LabelInput
                label="Titres Académiques & Hospitaliers"
                value={formData.academicCredentials}
                onChange={(e) => setFormData({ ...formData, academicCredentials: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="N° Inscription Ordre des Médecins"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
                <LabelInput
                  label="Téléphone Cabinet / Secrétariat"
                  value={formData.cabinetPhone}
                  onChange={(e) => setFormData({ ...formData, cabinetPhone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Numéro d'Urgence (optionnel)"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                />
                <LabelInput
                  label="Adresse de la Polyclinique"
                  value={formData.clinicAddress}
                  onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                />
              </div>
            </div>

            {/* 3. Aesthetic Color Accent & Watermark */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Palette size={14} className="text-[#C4785A]" />
                Palette de Style & Sécurité
              </span>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Couleur d'En-tête Clinique
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Bandeau de séparation et lettrage médical
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(['emerald', 'navy', 'burgundy', 'obsidian', 'terracotta'] as const).map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => setFormData({ ...formData, themeAccent: accent })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        formData.themeAccent === accent ? 'scale-110 border-neutral-900 dark:border-white shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: getAccentColor(accent) }}
                      title={accent}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-700 dark:text-neutral-300">
                  Filigrane Caducée / Armoirie Médicale en arrière-plan
                </span>
                <input
                  type="checkbox"
                  checked={formData.showWatermark}
                  onChange={(e) => setFormData({ ...formData, showWatermark: e.target.checked })}
                  className="w-4 h-4 rounded text-[#C4785A] accent-[#C4785A] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-xs text-neutral-700 dark:text-neutral-300">
                  Afficher le Cachet / Tampon Numérique Officiel
                </span>
                <input
                  type="checkbox"
                  checked={formData.isStampEnabled}
                  onChange={(e) => setFormData({ ...formData, isStampEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#C4785A] accent-[#C4785A] cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Footer & Legal Notice */}
            <div className="space-y-3">
              <LabelInput
                label="Horaires de Consultation (Pied de page)"
                value={formData.footerConsultationHours}
                onChange={(e) => setFormData({ ...formData, footerConsultationHours: e.target.value })}
              />

              <LabelInput
                label="Mention Légale / Validité Ordonnance"
                value={formData.footerLegalNotice}
                onChange={(e) => setFormData({ ...formData, footerLegalNotice: e.target.value })}
              />
            </div>
          </div>

          {/* Right Live Document Preview */}
          <div className="col-span-12 lg:col-span-6 bg-neutral-100 dark:bg-neutral-950 p-6 flex flex-col items-center justify-center overflow-y-auto">
            <div className="w-full max-w-[430px] flex items-center justify-between mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye size={14} className="text-[#0D9488]" />
                Aperçu Réel Ordonnance ({formData.paperFormat})
              </span>
              <span className="text-[11px] font-mono">
                {formData.printMode === 'preprinted_paper' ? 'Mode Papier Pré-imprimé' : 'Mode Numérique Complet'}
              </span>
            </div>

            {/* The Scaled Paper Sheet Canvas */}
            <div
              className={`w-full max-w-[430px] bg-white text-neutral-900 rounded-lg shadow-xl border border-neutral-300 dark:border-neutral-700 p-6 flex flex-col justify-between relative overflow-hidden select-none transition-all ${
                formData.paperFormat === 'A4' ? 'min-h-[580px]' : 'min-h-[460px]'
              }`}
            >
              {/* Optional Caduceus Watermark */}
              {formData.showWatermark && (
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none"
                  style={{ color: currentAccentHex }}
                >
                  <FileText size={220} />
                </div>
              )}

              {/* Header Section */}
              {formData.printMode === 'full_digital' ? (
                <div className="border-b-2 pb-3" style={{ borderColor: currentAccentHex }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-extrabold uppercase tracking-wide" style={{ color: currentAccentHex }}>
                        {formData.doctorName}
                      </h3>
                      <p className="text-[11px] font-semibold text-neutral-800">{formData.specialtyTitle}</p>
                      <p className="text-[9px] text-neutral-500">{formData.academicCredentials}</p>
                      <p className="text-[9px] font-mono font-medium text-neutral-600 mt-0.5">{formData.licenseNumber}</p>
                    </div>

                    <div className="text-right text-[9px] text-neutral-500 font-mono">
                      <p className="font-bold text-neutral-800">POLYCLINIQUE EL-CHIFA</p>
                      <p>{formData.clinicAddress}</p>
                      <p>{formData.cabinetPhone}</p>
                      {formData.emergencyPhone && <p className="text-red-600">{formData.emergencyPhone}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-16 border-b border-dashed border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                  [ Espace réservé à votre en-tête physique pré-imprimé ]
                </div>
              )}

              {/* Patient Metadata Strip */}
              <div className="my-3 py-1.5 px-3 rounded bg-neutral-50 border border-neutral-200 text-[10px] flex justify-between items-center font-mono">
                <div>
                  <span className="text-neutral-500">Patient: </span>
                  <span className="font-bold text-neutral-900">Meriem Haddad (31 ans)</span>
                </div>
                <div>
                  <span className="text-neutral-500">Alger, le </span>
                  <span className="font-bold text-neutral-900">10 Mai 2026</span>
                </div>
              </div>

              {/* Prescription Body Text */}
              <div className="flex-1 space-y-4 my-2 text-xs">
                <div className="text-center">
                  <span className="text-xs font-serif italic tracking-widest uppercase font-bold text-neutral-700">
                    ORDONNANCE
                  </span>
                </div>

                <div className="space-y-3 font-sans">
                  <div className="pl-2 border-l-2" style={{ borderColor: currentAccentHex }}>
                    <div className="font-bold text-neutral-900 text-[11px]">1. Metformine 850mg (Comprimés)</div>
                    <div className="text-[10px] text-neutral-600 italic">
                      1 comprimé deux fois par jour au milieu des repas pendant 3 mois.
                    </div>
                  </div>

                  <div className="pl-2 border-l-2" style={{ borderColor: currentAccentHex }}>
                    <div className="font-bold text-neutral-900 text-[11px]">2. Gliclazide 30mg (Comprimé LM)</div>
                    <div className="text-[10px] text-neutral-600 italic">
                      1 comprimé le matin au petit-déjeuner pendant 3 mois.
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature & Digital Stamp Area */}
              <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-end">
                {/* QR Code Verification */}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 border border-neutral-300 rounded p-0.5 flex items-center justify-center bg-white">
                    <QrCode size={34} className="text-neutral-800" />
                  </div>
                  <div className="text-[8px] font-mono text-neutral-400">
                    <span className="block font-bold text-neutral-600">VÉRIFICATION CNAS</span>
                    <span>SHA: CF-9921-DZ</span>
                  </div>
                </div>

                {/* Simulated Digital Stamp */}
                {formData.isStampEnabled && (
                  <div className="w-32 h-16 border-2 border-dashed border-blue-600 rounded-lg p-1.5 flex flex-col justify-center items-center text-center rotate-[-3deg] text-blue-700 bg-blue-50/40 select-none">
                    <span className="text-[8px] font-black uppercase tracking-wider">{formData.doctorName}</span>
                    <span className="text-[7px] font-bold">{formData.specialtyTitle}</span>
                    <span className="text-[6.5px] font-mono mt-0.5">{formData.licenseNumber}</span>
                  </div>
                )}
              </div>

              {/* Footer Legal & Hours */}
              {formData.printMode === 'full_digital' && (
                <div className="mt-3 pt-2 border-t text-[8px] text-neutral-400 text-center font-mono space-y-0.5">
                  <p>{formData.footerConsultationHours}</p>
                  <p className="font-semibold text-neutral-500">{formData.footerLegalNotice}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-[#F8F9FA] dark:bg-neutral-800/40">
          <AtriumButton
            variant="ghost"
            onClick={onClose}
          >
            Annuler
          </AtriumButton>

          <AtriumButton
            variant="primary"
            onClick={handleSave}
            icon={<Check size={16} />}
          >
            Enregistrer le Modèle d'Ordonnance
          </AtriumButton>
        </div>
      </div>
    </div>
  );
};
