import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPatient } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface MedicalPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: MedicalPatient) => void;
}

export const MedicalPatientModal: React.FC<MedicalPatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('1990-01-01');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>('O+');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      showToast(
        language === 'ar'
          ? 'يرجى كتابة الاسم ورقم الهاتف'
          : 'Veuillez renseigner le nom et le numéro de téléphone',
        'error'
      );
      return;
    }

    const newPatient: MedicalPatient = {
      id: `pat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      fullName: fullName.trim(),
      nationalId: nationalId.trim() || undefined,
      phone: phone.trim(),
      gender,
      dateOfBirth: dob,
      bloodGroup,
      allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
      chronicConditions: chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContact: emergencyContact.trim() || undefined,
      emergencyPhone: emergencyPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSave(newPatient);
    showToast(
      language === 'ar'
        ? 'تم إنشاء الملف الطبي للمريض بنجاح'
        : 'Dossier médical patient créé avec succès',
      'success'
    );
    onClose();
  };

  const genderOptions = [
    { value: 'Male', label: language === 'ar' ? 'ذكر' : 'Homme' },
    { value: 'Female', label: language === 'ar' ? 'أنثى' : 'Femme' },
    { value: 'Other', label: language === 'ar' ? 'آخر' : 'Autre' },
  ];

  const bloodOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <UserPlus size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'فتح ملف مريض جديد (EHR)' : 'Nouveau Dossier Patient (EHR)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1 pr-2">
            <LabelInput
              label={language === 'ar' ? 'الاسم واللقب' : 'Nom & Prénom'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Yacine Belkacemi"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                label={language === 'ar' ? 'رقم الهاتف' : 'Téléphone'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0555 12 34 56"
                required
              />
              <LabelInput
                label={language === 'ar' ? 'رقم التعريف الوطني / الشفاء' : 'N° Carte Chifa / NIN'}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="198816..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelInput
                label={language === 'ar' ? 'تاريخ الميلاد' : 'Date de Naissance'}
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <LabelSelect
                label={language === 'ar' ? 'الجنس' : 'Sexe'}
                value={gender}
                onChange={(val) => setGender(val as any)}
                options={genderOptions}
              />
              <LabelSelect
                label={language === 'ar' ? 'فصيلة الدم' : 'Groupe Sanguin'}
                value={bloodGroup}
                onChange={(val) => setBloodGroup(val as any)}
                options={bloodOptions}
              />
            </div>

            <LabelInput
              label={language === 'ar' ? 'الحساسيات الدوائية والغذائية' : 'Allergies connues'}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex: Pénicilline, Aspirine..."
            />

            <LabelInput
              label={language === 'ar' ? 'الأمراض المزمنة' : 'Pathologies chroniques'}
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
              placeholder="Ex: Diabète, HTA..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                label={language === 'ar' ? 'جهة الاتصال في الطوارئ' : 'Contact d\'Urgence'}
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Ex: Épouse, Frère..."
              />
              <LabelInput
                label={language === 'ar' ? 'هاتف الطوارئ' : 'Tél d\'Urgence'}
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="0555..."
              />
            </div>

            <LabelInput
              label={language === 'ar' ? 'ملاحظات سريرية' : 'Notes cliniques'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<UserPlus size={14} />}>
              {language === 'ar' ? 'حفظ الملف الطبي' : 'Créer le Dossier'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
