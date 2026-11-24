import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { MedicalPatient } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Button } from '@/atrium/core';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface MedicalPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: MedicalPatient) => void;
  patientToEdit?: MedicalPatient | null;
}

export const MedicalPatientModal: React.FC<MedicalPatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patientToEdit,
}) => {
  const { account, language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
  const [fullName, setFullName] = useState(patientToEdit?.fullName || '');
  const [nationalId, setNationalId] = useState(patientToEdit?.nationalId || '');
  const [phone, setPhone] = useState(patientToEdit?.phone || '');
  const [dob, setDob] = useState(patientToEdit?.dateOfBirth || '1990-01-01');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(patientToEdit?.gender || 'Male');
  const [bloodGroup, setBloodGroup] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>(patientToEdit?.bloodGroup || 'O+');
  const [allergies, setAllergies] = useState(patientToEdit?.allergies?.join(', ') || '');
  const [chronicConditions, setChronicConditions] = useState(patientToEdit?.chronicConditions?.join(', ') || '');
  const [emergencyContact, setEmergencyContact] = useState(patientToEdit?.emergencyContact || '');
  const [emergencyPhone, setEmergencyPhone] = useState(patientToEdit?.emergencyPhone || '');
  const [notes, setNotes] = useState(patientToEdit?.notes || '');
  const retainedPatientToEdit = useRetainedModalValue(isOpen ? patientToEdit ?? null : null);
  const displayPatientToEdit = isOpen ? patientToEdit : retainedPatientToEdit;

  useEffect(() => {
    if (!isOpen) return;
    setFullName(patientToEdit?.fullName || '');
    setNationalId(patientToEdit?.nationalId || '');
    setPhone(patientToEdit?.phone || '');
    setDob(patientToEdit?.dateOfBirth || '1990-01-01');
    setGender(patientToEdit?.gender || 'Male');
    setBloodGroup(patientToEdit?.bloodGroup || 'O+');
    setAllergies(patientToEdit?.allergies?.join(', ') || '');
    setChronicConditions(patientToEdit?.chronicConditions?.join(', ') || '');
    setEmergencyContact(patientToEdit?.emergencyContact || '');
    setEmergencyPhone(patientToEdit?.emergencyPhone || '');
    setNotes(patientToEdit?.notes || '');
  }, [isOpen, patientToEdit]);

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

    const activeAccountId = (patientToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (patientToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const savedPatient: MedicalPatient = {
      id: patientToEdit ? patientToEdit.id : `pat_${Date.now()}`,
      accountId: activeAccountId,
      businessId: patientToEdit?.businessId || currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: patientToEdit?.staffId || currentUser?.id || '',
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
      createdAt: patientToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(savedPatient);
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
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      scrimClassName="bg-black/50"
      ariaLabel={
        displayPatientToEdit
          ? (language === 'ar' ? 'تعديل الملف الطبي' : 'Modifier le Dossier Patient')
          : (language === 'ar' ? 'فتح ملف مريض جديد (EHR)' : 'Nouveau Dossier Patient (EHR)')
      }
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] overflow-y-auto"
      >
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2">
              <div
                data-sq="ctl-sm"
                data-sq-border="none"
                className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
              >
                <UserPlus size={16} />
              </div>
              <h3 className="font-semibold t-label text-black dark:text-white">
                {displayPatientToEdit
                  ? (language === 'ar' ? 'تعديل الملف الطبي' : 'Modifier le Dossier Patient')
                  : (language === 'ar' ? 'فتح ملف مريض جديد (EHR)' : 'Nouveau Dossier Patient (EHR)')}
              </h3>
            </div>
            <button
              type="button"
              aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <LabelInput
              field="fullName"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'الاسم واللقب' : 'Nom & Prénom'}
              value={fullName}
              onChange={setFullName}
              placeholder="Ex: Yacine Belkacemi"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="phone"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'رقم الهاتف' : 'Téléphone'}
                value={phone}
                onChange={setPhone}
                placeholder="0555 12 34 56"
                required
              />
              <LabelInput
                field="nationalId"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'رقم التعريف الوطني / الشفاء' : 'N° Carte Chifa / NIN'}
                value={nationalId}
                onChange={setNationalId}
                placeholder="198816..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="dob"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'تاريخ الميلاد' : 'Date de Naissance'}
                type="date"
                value={dob}
                onChange={setDob}
              />
              <LabelSelect
                field="bloodGroup"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'فصيلة الدم' : 'Groupe Sanguin'}
                value={bloodGroup}
                onChange={(val) => setBloodGroup(val as any)}
                options={bloodOptions}
              />
            </div>

            <div>
              <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
                {language === 'ar' ? 'الجنس' : 'Sexe'}
              </label>
              <LiveSegmentedControl
                fullWidth
                size="md"
                value={gender}
                onChange={(val) => setGender(val as any)}
                options={genderOptions}
                aria-label={language === 'ar' ? 'الجنس' : 'Sexe'}
              />
            </div>

            <LabelInput
              field="allergies"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'الحساسيات الدوائية والغذائية' : 'Allergies connues'}
              value={allergies}
              onChange={setAllergies}
              placeholder="Ex: Pénicilline, Aspirine..."
            />

            <LabelInput
              field="chronicConditions"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'الأمراض المزمنة' : 'Pathologies chroniques'}
              value={chronicConditions}
              onChange={setChronicConditions}
              placeholder="Ex: Diabète, HTA..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="emergencyContact"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'جهة الاتصال في الطوارئ' : 'Contact d\'Urgence'}
                value={emergencyContact}
                onChange={setEmergencyContact}
                placeholder="Ex: Épouse, Frère..."
              />
              <LabelInput
                field="emergencyPhone"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'هاتف الطوارئ' : 'Tél d\'Urgence'}
                value={emergencyPhone}
                onChange={setEmergencyPhone}
                placeholder="0555..."
              />
            </div>

            <LabelInput
              field="notes"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'ملاحظات سريرية' : 'Notes cliniques'}
              value={notes}
              onChange={setNotes}
              placeholder="Observations..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" tone="accent" size={40} leading={<UserPlus size={14} />}>
              {language === 'ar' ? 'حفظ الملف الطبي' : 'Créer le Dossier'}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
