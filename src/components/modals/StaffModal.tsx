import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  HeartPulse,
  KeyRound,
  FileText,
  Sparkles,
  QrCode,
  Building,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect, SelectOption } from '../ui/LabelSelect';
import { AtriumButton } from '../ui/AtriumButton';
import {
  StaffMember,
  StaffRole,
  StaffLifecycleStatus,
  RecruitmentLegalType,
  StaffPaymentMethod,
  BusinessCategory,
} from '../../types/index';
import { useAtriumStore } from '../../services/store';
import { validateStaffCredentials, normalizePhone } from '../../utils/staffRules';
import { calculateCcpKey } from '../../utils/logisticsRules';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffMember | null;
  currentCategory: BusinessCategory | string;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  currentCategory,
}) => {
  const { createStaffMember, updateStaffMember, staff: existingStaff, language, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  // Base Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState<number | string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<StaffRole>('Staff');
  const [cardId, setCardId] = useState('');

  // Advanced / Contractual State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [salary, setSalary] = useState<number | string>(75000);
  const [paymentDay, setPaymentDay] = useState<number | string>(28);
  const [paymentMethod, setPaymentMethod] = useState<StaffPaymentMethod>('ccp');
  const [ccpNumber, setCcpNumber] = useState('');
  const [ccpKey, setCcpKey] = useState('');
  const [bankRib, setBankRib] = useState('');
  const [recruitmentType, setRecruitmentType] = useState<RecruitmentLegalType>('cdi');

  // Multi-Credential Authentication
  const [canLoginEmail, setCanLoginEmail] = useState(true);
  const [canLoginPhone, setCanLoginPhone] = useState(true);
  const [canLoginPin, setCanLoginPin] = useState(true);
  const [pinCode, setPinCode] = useState('');

  // Medical & Emergency
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Category Specific Fields
  const [categorySpecialty, setCategorySpecialty] = useState('');
  const [regulatoryNumber, setRegulatoryNumber] = useState('');

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or Reset Form
  useEffect(() => {
    if (staffToEdit) {
      setFullName(staffToEdit.fullName || '');
      setEmail(staffToEdit.email || '');
      setPassword('');
      setPhoneNumber(staffToEdit.phoneNumber || '');
      setAge(staffToEdit.age ?? '');
      setGender(staffToEdit.gender || 'male');
      setAddress(staffToEdit.address || '');
      setRole(staffToEdit.role || 'Staff');
      setCardId(staffToEdit.cardId || '');

      setSalary(staffToEdit.salary ?? 75000);
      setPaymentDay(staffToEdit.paymentDay ?? 28);
      setPaymentMethod(staffToEdit.paymentMethod || 'ccp');
      setCcpNumber(staffToEdit.ccpNumber || '');
      setCcpKey(staffToEdit.ccpKey || '');
      setBankRib(staffToEdit.bankRib || '');
      setRecruitmentType(staffToEdit.recruitmentType || 'cdi');

      setCanLoginEmail(staffToEdit.canLoginEmail !== false);
      setCanLoginPhone(staffToEdit.canLoginPhone !== false);
      setCanLoginPin(staffToEdit.canLoginPin !== false);
      setPinCode(staffToEdit.pinCode || '');

      setBloodGroup(staffToEdit.bloodGroup || 'O+');
      setEmergencyContactName(staffToEdit.emergencyContactName || '');
      setEmergencyContactPhone(staffToEdit.emergencyContactPhone || '');
      setMedicalNotes(staffToEdit.medicalNotes || '');

      const cp = staffToEdit.categoryProperties || {};
      setRegulatoryNumber(
        cp.orderRegistrationNumber ||
        cp.cacobatphCardNumber ||
        cp.carteProfessionnelleNumber ||
        cp.barAssociationNumber ||
        cp.drivingLicenseCategory ||
        ''
      );
      setCategorySpecialty(
        cp.medicalSpecialty ||
        cp.technicalSpecialty ||
        cp.assignedWorkstationId ||
        cp.assignedBayId ||
        cp.assignedChantierId ||
        cp.assignedParcelId ||
        ''
      );
      setShowAdvanced(true);
    } else {
      // Default creation state
      setFullName('');
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setAge('');
      setGender('male');
      setAddress('');
      setRole(getDefaultRoleForCategory(currentCategory));
      setCardId(generateBadgeCode(currentCategory));

      setSalary(75000);
      setPaymentDay(28);
      setPaymentMethod('ccp');
      setCcpNumber('');
      setCcpKey('');
      setBankRib('');
      setRecruitmentType('cdi');

      setCanLoginEmail(true);
      setCanLoginPhone(true);
      setCanLoginPin(true);
      setPinCode(generateRandomPin());

      setBloodGroup('O+');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setMedicalNotes('');
      setCategorySpecialty('');
      setRegulatoryNumber('');
      setShowAdvanced(false);
    }
    setErrors({});
  }, [staffToEdit, isOpen, currentCategory]);

  // Auto calculate CCP key on ccpNumber change
  const handleCcpNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setCcpNumber(cleaned);
    if (cleaned.length >= 6) {
      const calcKey = calculateCcpKey(cleaned);
      setCcpKey(calcKey);
    }
  };

  const handleGeneratePin = () => {
    setPinCode(generateRandomPin());
  };

  const handleGenerateBadge = () => {
    setCardId(generateBadgeCode(currentCategory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const payload: Partial<StaffMember> = {
      fullName: fullName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      age: age ? Number(age) : undefined,
      gender,
      address: address.trim(),
      role,
      roleRank: getRoleRank(role),
      cardId: cardId.trim(),
      salary: Number(salary) || 0,
      paymentDay: Number(paymentDay) || 28,
      paymentMethod,
      ccpNumber: paymentMethod === 'ccp' ? ccpNumber.trim() : undefined,
      ccpKey: paymentMethod === 'ccp' ? ccpKey.trim() : undefined,
      bankRib: paymentMethod === 'bank_transfer' ? bankRib.trim() : undefined,
      recruitmentType,
      canLoginEmail,
      canLoginPhone,
      canLoginPin,
      pinCode: canLoginPin ? pinCode.trim() : undefined,
      bloodGroup: bloodGroup as any,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      medicalNotes: medicalNotes.trim(),
      categoryProperties: buildCategoryProperties(currentCategory, regulatoryNumber, categorySpecialty),
    };

    // Run deep validation
    const validation = validateStaffCredentials(payload, existingStaff, staffToEdit?.id);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (staffToEdit) {
        updateStaffMember(staffToEdit.id, payload);
      } else {
        createStaffMember({
          ...payload,
          status: 'active',
          isActive: true,
          hireDate: new Date().toISOString().split('T')[0],
          allowedModules: ['all'],
        } as any);
      }
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Une erreur est survenue lors de l\'enregistrement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryRoles = getRolesForCategory(currentCategory);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        staffToEdit
          ? isAr
            ? 'تعديل بيانات الموظف'
            : isEn
            ? 'Edit Staff Member'
            : 'Modifier collaborateur'
          : isAr
          ? 'تسجيل موظف جديد'
          : isEn
          ? 'Create New Staff Member'
          : 'Créer un nouveau collaborateur'
      }
      subtitle={
        isAr
          ? 'التسجيل الشامل لبيانات الهوية، بطاقة العمل، والعقد'
          : isEn
          ? 'Comprehensive identity, attendance badge, and contract setup'
          : 'Fiche d\'identité, badge RFID de pointage et dossier contractuel'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]" dir={isAr ? 'rtl' : 'ltr'}>
        {errors.form && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Section 1: Essentiels & Identité */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
            <User className="w-4 h-4" />
            <span>{isAr ? 'الهوية والوظيفة الأساسية' : isEn ? 'Identity & Core Role' : 'Identité & Poste'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <LabelInput
                field={isAr ? 'الاسم الكامل' : isEn ? 'Full Name' : 'Nom Complet'}
                value={fullName}
                onChange={(val) => setFullName(val)}
                required
                prefix={<User className="w-4 h-4 text-neutral-400" />}
              />
              {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <LabelSelect
                field={isAr ? 'الدور / المنصب' : isEn ? 'Role / Position' : 'Rôle / Fonction'}
                value={role}
                options={categoryRoles}
                onChange={(val) => setRole(val as StaffRole)}
                prefix={<Shield className="w-4 h-4 text-neutral-400" />}
              />
            </div>

            <div>
              <LabelInput
                field={isAr ? 'البريد الإلكتروني' : isEn ? 'Email Address' : 'Adresse Email'}
                type="email"
                value={email}
                onChange={(val) => setEmail(val)}
                required
                prefix={<Mail className="w-4 h-4 text-neutral-400" />}
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <LabelInput
                field={isAr ? 'رقم الهاتف' : isEn ? 'Phone Number' : 'Numéro de Téléphone'}
                value={phoneNumber}
                onChange={(val) => setPhoneNumber(val)}
                required
                placeholder="0550 12 34 56"
                prefix={<Phone className="w-4 h-4 text-neutral-400" />}
              />
              {errors.phoneNumber && <p className="text-[11px] text-red-500 mt-1">{errors.phoneNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <LabelInput
                field={isAr ? 'العمر' : isEn ? 'Age' : 'Âge'}
                type="number"
                min={18}
                max={75}
                value={age}
                onChange={(val) => setAge(val)}
              />
              <LabelSelect
                field={isAr ? 'الجنس' : isEn ? 'Gender' : 'Genre'}
                value={gender}
                options={[
                  { value: 'male', label: isAr ? 'ذكر' : isEn ? 'Male' : 'Homme' },
                  { value: 'female', label: isAr ? 'أنثى' : isEn ? 'Female' : 'Femme' },
                ]}
                onChange={(val) => setGender(val as 'male' | 'female')}
              />
            </div>

            <div>
              <LabelInput
                field={isAr ? 'عنوان الإقامة' : isEn ? 'Address' : 'Adresse / Wilaya'}
                value={address}
                onChange={(val) => setAddress(val)}
                placeholder="Hydra, Alger"
              />
            </div>
          </div>

          {/* Badge RFID / NFC / QR Code */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {isAr ? 'رمز شارة الدخول (RFID / NFC / QR)' : isEn ? 'Access Badge Token (RFID / NFC / QR)' : 'Badge d\'Accès (RFID / NFC / QR)'}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {isAr ? 'يستخدم للتحقق الفوري وتسجيل الحضور والانصراف' : isEn ? 'Used for instant clock-in scanning' : 'Permet le pointage instantané par scanner'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value.toUpperCase())}
                  placeholder="RFID-000000"
                  className="font-mono text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 w-full sm:w-36 focus:outline-hidden focus:border-[#C4785A]"
                />
                <button
                  type="button"
                  onClick={handleGenerateBadge}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[#C4785A] text-white hover:bg-[#b0674b] transition-colors"
                >
                  {isAr ? 'توليد' : isEn ? 'Gen' : 'Générer'}
                </button>
              </div>
            </div>
            {errors.cardId && <p className="text-[11px] text-red-500 mt-1">{errors.cardId}</p>}
          </div>
        </div>

        {/* Collapsible Advanced Settings & Contractual Dossier */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#C4785A]" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {isAr
                  ? 'الملف التعاقدي والمالي والصحي المتقدم'
                  : isEn
                  ? 'Advanced Contractual, Compensation & Medical Dossier'
                  : 'Paramètres avancés, Rémunération & Dossier Médical'}
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6 animate-in fade-in duration-200">
              {/* Contract & Compensation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
                  <CreditCard className="w-4 h-4" />
                  <span>{isAr ? 'العقد والراتب' : isEn ? 'Contract & Compensation' : 'Contrat & Rémunération'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LabelSelect
                    field={isAr ? 'نوع العقد القانوني' : isEn ? 'Legal Contract Type' : 'Type de Contrat'}
                    value={recruitmentType}
                    options={[
                      { value: 'cdi', label: 'CDI (Indéterminé)' },
                      { value: 'cdd', label: 'CDD (Déterminé)' },
                      { value: 'stage', label: 'Stage / PFE' },
                      { value: 'vacataire', label: 'Vacataire / Horaire' },
                      { value: 'prestataire', label: 'Prestataire de service' },
                    ]}
                    onChange={(val) => setRecruitmentType(val as RecruitmentLegalType)}
                  />

                  <div>
                    <LabelInput
                      field={isAr ? 'الراتب الشهري (د.ج)' : isEn ? 'Monthly Salary (DZD)' : 'Salaire Net (DZD)'}
                      type="number"
                      value={salary}
                      onChange={(val) => setSalary(val)}
                      suffix={<span className="text-[11px] text-neutral-400">DZD</span>}
                    />
                  </div>

                  <div>
                    <LabelInput
                      field={isAr ? 'يوم دفع الراتب (1-31)' : isEn ? 'Salary Day (1-31)' : 'Jour de Paie (1-31)'}
                      type="number"
                      min={1}
                      max={31}
                      value={paymentDay}
                      onChange={(val) => setPaymentDay(val)}
                    />
                    {errors.paymentDay && <p className="text-[11px] text-red-500 mt-1">{errors.paymentDay}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelSelect
                    field={isAr ? 'طريقة دفع الراتب' : isEn ? 'Payment Method' : 'Mode de Versement'}
                    value={paymentMethod}
                    options={[
                      { value: 'ccp', label: 'Compte CCP (Algérie Poste)' },
                      { value: 'bank_transfer', label: 'Virement Bancaire (RIB)' },
                      { value: 'cash', label: 'Espèces (Bordereau de caisse)' },
                    ]}
                    onChange={(val) => setPaymentMethod(val as StaffPaymentMethod)}
                  />

                  {paymentMethod === 'ccp' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <LabelInput
                          field={isAr ? 'رقم حساب CCP' : isEn ? 'CCP Account' : 'Numéro Compte CCP'}
                          value={ccpNumber}
                          onChange={(val) => handleCcpNumberChange(val)}
                          placeholder="0012345678"
                        />
                        {errors.ccpNumber && <p className="text-[11px] text-red-500 mt-1">{errors.ccpNumber}</p>}
                      </div>
                      <div>
                        <LabelInput
                          field={isAr ? 'المفتاح' : isEn ? 'Key' : 'Clé'}
                          value={ccpKey}
                          onChange={(val) => setCcpKey(val)}
                          placeholder="00"
                        />
                        {errors.ccpKey && <p className="text-[11px] text-red-500 mt-1">{errors.ccpKey}</p>}
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank_transfer' && (
                    <LabelInput
                      field={isAr ? 'رقم الحساب المصرفي (RIB 20 رقماً)' : isEn ? 'Bank RIB (20 digits)' : 'RIB Bancaire (20 chiffres)'}
                      value={bankRib}
                      onChange={(val) => setBankRib(val)}
                      placeholder="002 00012 34567890 12"
                    />
                  )}
                </div>
              </div>

              {/* Multi-Credential Authentication Toggles */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <KeyRound className="w-4 h-4 text-[#C4785A]" />
                  <span>{isAr ? 'صلاحيات تسجيل الدخول إلى التطبيق' : isEn ? 'App Login Credentials' : 'Moyens de Connexion à l\'Application'}</span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {isAr
                    ? 'حدد الوسائل التي يمكن للموظف استخدامها للدخول إلى منصة أتريوم'
                    : isEn
                    ? 'Select which credentials this staff member can use to sign into Atrium'
                    : 'Activez les identifiants autorisés pour la connexion de ce collaborateur'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={canLoginEmail}
                      onChange={(e) => setCanLoginEmail(e.target.checked)}
                      className="accent-[#C4785A] rounded-sm"
                    />
                    <span>{isAr ? 'البريد وكلمة السر' : isEn ? 'Email & Password' : 'Email & Mot de passe'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={canLoginPhone}
                      onChange={(e) => setCanLoginPhone(e.target.checked)}
                      className="accent-[#C4785A] rounded-sm"
                    />
                    <span>{isAr ? 'رقم الهاتف' : isEn ? 'Phone Number' : 'Numéro de Téléphone'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={canLoginPin}
                      onChange={(e) => setCanLoginPin(e.target.checked)}
                      className="accent-[#C4785A] rounded-sm"
                    />
                    <span>{isAr ? 'رمز PIN السريع (4 أرقام)' : isEn ? 'Fast-Switch PIN (4 Digits)' : 'Code PIN (4 Chiffres)'}</span>
                  </label>
                </div>

                {canLoginPin && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-36">
                      <LabelInput
                        field={isAr ? 'رمز PIN' : isEn ? 'PIN Code' : 'Code PIN'}
                        value={pinCode}
                        onChange={(val) => setPinCode(val.slice(0, 4))}
                        placeholder="1234"
                        type="text"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-xs px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
                      <span>{isAr ? 'توليد PIN عشوائي' : isEn ? 'Generate PIN' : 'Générer PIN'}</span>
                    </button>
                    {errors.pinCode && <p className="text-[11px] text-red-500">{errors.pinCode}</p>}
                  </div>
                )}
              </div>

              {/* Medical & Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
                  <HeartPulse className="w-4 h-4" />
                  <span>{isAr ? 'الملف الصحي وحالات الطوارئ' : isEn ? 'Medical Emergency Dossier' : 'Dossier Médical & Urgences'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LabelSelect
                    field={isAr ? 'فصيلة الدم' : isEn ? 'Blood Group' : 'Groupe Sanguin'}
                    value={bloodGroup}
                    options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                    onChange={(val) => setBloodGroup(val as string)}
                  />

                  <LabelInput
                    field={isAr ? 'اسم جهة اتصال الطوارئ' : isEn ? 'Emergency Contact Name' : 'Contact d\'Urgence (Nom)'}
                    value={emergencyContactName}
                    onChange={(val) => setEmergencyContactName(val)}
                    placeholder="Père, Conjoint, etc."
                  />

                  <LabelInput
                    field={isAr ? 'هاتف الطوارئ' : isEn ? 'Emergency Phone' : 'Téléphone d\'Urgence'}
                    value={emergencyContactPhone}
                    onChange={(val) => setEmergencyContactPhone(val)}
                    placeholder="0661 00 00 00"
                  />
                </div>

                <LabelInput
                  field={isAr ? 'ملاحظات صحية أو حساسية' : isEn ? 'Medical Notes or Allergies' : 'Notes médicales & Contre-indications'}
                  value={medicalNotes}
                  onChange={(val) => setMedicalNotes(val)}
                  placeholder="Allergies, traitement médical régulier, etc."
                />
              </div>

              {/* Category-Specific Operational Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
                  <Building className="w-4 h-4" />
                  <span>{getCategoryPropertiesTitle(currentCategory, isAr, isEn)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabelInput
                    field={getCategoryRegulatoryLabel(currentCategory, isAr, isEn)}
                    value={regulatoryNumber}
                    onChange={(val) => setRegulatoryNumber(val)}
                    placeholder={getCategoryRegulatoryPlaceholder(currentCategory)}
                  />

                  <LabelInput
                    field={getCategoryStationLabel(currentCategory, isAr, isEn)}
                    value={categorySpecialty}
                    onChange={(val) => setCategorySpecialty(val)}
                    placeholder={getCategoryStationPlaceholder(currentCategory)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </button>

          <AtriumButton
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-semibold shadow-md"
          >
            {staffToEdit
              ? isAr
                ? 'حفظ التعديلات'
                : isEn
                ? 'Save Changes'
                : 'Enregistrer les modifications'
              : isAr
              ? 'إنشاء الموظف'
              : isEn
              ? 'Create Staff Member'
              : 'Créer le collaborateur'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

// ==========================================
// Category Role & Properties Helpers
// ==========================================

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateBadgeCode(category: string): string {
  const prefixMap: Record<string, string> = {
    membership_session: 'GYM',
    appointment_service: 'SALON',
    pos_inventory: 'POS',
    medical_clinic: 'MED',
    auto_garage: 'GAR',
    construction_contractor: 'BTP',
    logistics_delivery: 'LOG',
    manufacturing_production: 'MFG',
    agriculture_livestock: 'AGR',
    real_estate: 'IMM',
    trading_commercial: 'TRD',
    education_cohort: 'EDU',
    legal_notary: 'LEG',
    project_milestone: 'AGY',
    rental_booking: 'VEN',
    freelance_solo: 'SOLO',
  };
  const prefix = prefixMap[category] || 'STF';
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RFID-${prefix}-${rand}`;
}

function getDefaultRoleForCategory(category: string): StaffRole {
  switch (category) {
    case 'medical_clinic':
      return 'Doctor';
    case 'auto_garage':
      return 'Technician';
    case 'construction_contractor':
      return 'ChefChantier';
    case 'logistics_delivery':
      return 'Dispatcher';
    case 'manufacturing_production':
      return 'Staff';
    case 'agriculture_livestock':
      return 'ChefCulture';
    case 'real_estate':
      return 'Director';
    case 'trading_commercial':
      return 'Cashier';
    case 'education_cohort':
      return 'Technician';
    case 'legal_notary':
      return 'Associate';
    case 'appointment_service':
      return 'Stylist';
    case 'pos_inventory':
      return 'Cashier';
    default:
      return 'Staff';
  }
}

function getRoleRank(role: string): number {
  const lower = role.toLowerCase();
  if (lower.includes('owner') || lower.includes('gerant') || lower.includes('directeur_general')) return 8;
  if (lower.includes('doctor') || lower.includes('medecin') || lower.includes('conducteur') || lower.includes('partner') || lower.includes('director')) return 4;
  if (lower.includes('manager') || lower.includes('chefatelier') || lower.includes('dispatcher') || lower.includes('chefculture') || lower.includes('projectmanager')) return 3;
  if (lower.includes('cashier') || lower.includes('chefchantier') || lower.includes('stylist')) return 2;
  return 1;
}

function getRolesForCategory(category: string): SelectOption[] {
  switch (category) {
    case 'medical_clinic':
      return [
        { value: 'MedecinChef', label: 'Médecin Chef / Directeur Médical' },
        { value: 'Doctor', label: 'Médecin Spécialiste / Généraliste' },
        { value: 'Manager', label: 'Cadre de Santé / Surveillant Général' },
        { value: 'Technician', label: 'Infirmier / Technicien de Laboratoire' },
        { value: 'Staff', label: 'Secrétaire Médical & Accueil' },
      ];
    case 'auto_garage':
      return [
        { value: 'Owner', label: 'Gérant d\'Atelier / Propriétaire' },
        { value: 'ChefAtelier', label: 'Chef d\'Atelier & Maître Mécanicien' },
        { value: 'Technician', label: 'Technicien Diagnostic OBD & Électricité' },
        { value: 'Staff', label: 'Carrossier / Peintre / Opérateur' },
        { value: 'Cashier', label: 'Réceptionnaire & Facturation' },
      ];
    case 'construction_contractor':
      return [
        { value: 'Owner', label: 'Directeur Général / Gérant BTP' },
        { value: 'ConducteurTravaux', label: 'Conducteur de Travaux Principal' },
        { value: 'ChefChantier', label: 'Chef de Chantier & Encadrement' },
        { value: 'Technician', label: 'Métreur / Ingénieur HSE / Topographe' },
        { value: 'Staff', label: 'Chef d\'Équipe & Ouvrier Qualifié' },
      ];
    case 'logistics_delivery':
      return [
        { value: 'Owner', label: 'Directeur Logistique / Gérant' },
        { value: 'Dispatcher', label: 'Dispatcher & Régulateur de Tournées' },
        { value: 'Manager', label: 'Responsable Flotte & Maintenance' },
        { value: 'Technician', label: 'Chauffeur-Livreur Poids Lourd (EC)' },
        { value: 'Staff', label: 'Opérateur de Quai / Magasinier' },
      ];
    case 'manufacturing_production':
      return [
        { value: 'Owner', label: 'Directeur d\'Usine / Gérant' },
        { value: 'ProductionManager', label: 'Responsable Production & Planning' },
        { value: 'Technician', label: 'Régleur & Opérateur CNC 5-Axes' },
        { value: 'Staff', label: 'Contrôleur Qualité & Finition' },
      ];
    case 'agriculture_livestock':
      return [
        { value: 'Owner', label: 'Exploitant Agricole / Propriétaire' },
        { value: 'ChefCulture', label: 'Chef de Culture & Agronome' },
        { value: 'Technician', label: 'Mécanicien Machinisme & Irrigation' },
        { value: 'Staff', label: 'Ouvrier Agricole & Éleveur' },
      ];
    case 'real_estate':
      return [
        { value: 'Owner', label: 'Directeur d\'Agence Immobilière' },
        { value: 'Director', label: 'Négociateur Immobilier Senior' },
        { value: 'Manager', label: 'Gestionnaire Locatif & Mandats' },
        { value: 'Staff', label: 'Assistant(e) Commercial & Accueil' },
      ];
    case 'trading_commercial':
      return [
        { value: 'Owner', label: 'Directeur Général Négoce / Gérant' },
        { value: 'DirecteurCommercial', label: 'Directeur Commercial & Ventes B2B' },
        { value: 'Manager', label: 'Responsable Dépôt & Logistique' },
        { value: 'Cashier', label: 'Caissier Comptoir & Facturation' },
        { value: 'Staff', label: 'Commercial Terrain / Préparateur' },
      ];
    case 'education_cohort':
      return [
        { value: 'Owner', label: 'Directeur de l\'Institut / Fondateur' },
        { value: 'Technician', label: 'Enseignant / Formateur Titulaire' },
        { value: 'Manager', label: 'Coordinateur Pédagogique' },
        { value: 'Staff', label: 'Secrétariat & Scolarité' },
      ];
    case 'legal_notary':
      return [
        { value: 'Owner', label: 'Avocat Titulaire / Notaire Associé' },
        { value: 'Partner', label: 'Avocat Associé / Premier Clerc' },
        { value: 'Associate', label: 'Avocat Collaborateur / Juriste' },
        { value: 'Staff', label: 'Secrétaire Juridique & Formalités' },
      ];
    case 'project_milestone':
      return [
        { value: 'Owner', label: 'Directeur Général de l\'Agence' },
        { value: 'ProjectManager', label: 'Chef de Projets & Responsable BAT' },
        { value: 'Creative', label: 'Directeur Artistique / Designer Senior' },
        { value: 'Staff', label: 'Talent & Opérateur Événementiel' },
      ];
    case 'appointment_service':
      return [
        { value: 'Owner', label: 'Propriétaire / Salon Manager' },
        { value: 'Stylist', label: 'Styliste & Coloriste Senior' },
        { value: 'Technician', label: 'Nail Artist & Esthéticienne Spa' },
        { value: 'Staff', label: 'Assistant(e) Coiffure & Soins' },
      ];
    case 'pos_inventory':
      return [
        { value: 'Owner', label: 'Gérant de Commerce / Propriétaire' },
        { value: 'Manager', label: 'Responsable Magasin / Superviseur' },
        { value: 'Cashier', label: 'Caissier Encaissant' },
        { value: 'Staff', label: 'Gestionnaire Stock & Réassort' },
      ];
    case 'membership_session':
    default:
      return [
        { value: 'Owner', label: 'Propriétaire / Directeur du Club' },
        { value: 'Manager', label: 'Responsable d\'Exploitation' },
        { value: 'Technician', label: 'Coach Sportif / Entraîneur' },
        { value: 'Cashier', label: 'Réceptionniste Front Desk' },
        { value: 'Staff', label: 'Opérateur Maintenance' },
      ];
  }
}

function getCategoryPropertiesTitle(category: string, isAr: boolean, isEn: boolean): string {
  if (isAr) return 'البيانات المهنية والتراخيص القطاعية';
  if (isEn) return 'Sectoral & Operational Clearances';
  return 'Habilitations & Spécificités Sectorielles';
}

function getCategoryRegulatoryLabel(category: string, isAr: boolean, isEn: boolean): string {
  switch (category) {
    case 'medical_clinic':
      return isAr ? 'رقم التسجيل في مجلس الأطباء' : isEn ? 'Medical Order Number' : 'N° Inscription Ordre des Médecins';
    case 'construction_contractor':
      return isAr ? 'رقم بطاقة CACOBATPH' : isEn ? 'CACOBATPH Card Number' : 'N° Carte CACOBATPH';
    case 'logistics_delivery':
      return isAr ? 'صنف رخصة السياقة' : isEn ? 'Driving License Category' : 'Catégorie Permis & Habilitation';
    case 'real_estate':
      return isAr ? 'رقم البطاقة المهنية العقارية' : isEn ? 'Broker License Number' : 'N° Carte Professionnelle CPI';
    case 'legal_notary':
      return isAr ? 'رقم القيد في نقابة المحامين' : isEn ? 'Bar Association Reg Number' : 'N° Inscription au Barreau';
    default:
      return isAr ? 'الترخيص أو الاعتماد المهني' : isEn ? 'Professional Clearance / ID' : 'Habilitation / Agrément Professionnel';
  }
}

function getCategoryRegulatoryPlaceholder(category: string): string {
  switch (category) {
    case 'medical_clinic':
      return 'CNOM-16/48201';
    case 'construction_contractor':
      return 'CAC-2026-99881';
    case 'logistics_delivery':
      return 'Permis Poids Lourd EC';
    case 'real_estate':
      return 'CPI-16-04289';
    case 'legal_notary':
      return 'BARREAU-ALGER-2012';
    default:
      return 'REF-HAB-001';
  }
}

function getCategoryStationLabel(category: string, isAr: boolean, isEn: boolean): string {
  switch (category) {
    case 'medical_clinic':
      return isAr ? 'التخصص الطبي' : isEn ? 'Medical Specialty' : 'Spécialité Médicale';
    case 'auto_garage':
      return isAr ? 'رقم جسر الرفع أو التخصص' : isEn ? 'Assigned Bay / Specialty' : 'Pont de Levage & Diagnostic';
    case 'construction_contractor':
      return isAr ? 'الورشة المعين بها' : isEn ? 'Assigned Site Code' : 'Chantier d\'Affectation';
    case 'logistics_delivery':
      return isAr ? 'رقم لوحة المركبة المعينة' : isEn ? 'Assigned Vehicle Plate' : 'Immatriculation Véhicule Affecté';
    case 'manufacturing_production':
      return isAr ? 'محطة العمل أو الآلة المعينة' : isEn ? 'Assigned Workstation' : 'Poste de Travail / Machine CNC';
    case 'agriculture_livestock':
      return isAr ? 'القطعة الفلاحية المعينة' : isEn ? 'Assigned Parcel' : 'Parcelle d\'Affectation';
    default:
      return isAr ? 'الموقع أو المحطة التشغيلية' : isEn ? 'Workstation / Station' : 'Poste / Station Opérationnelle';
  }
}

function getCategoryStationPlaceholder(category: string): string {
  switch (category) {
    case 'medical_clinic':
      return 'Pédiatrie, Urgences, etc.';
    case 'auto_garage':
      return 'Pont 1, Électronique OBD';
    case 'construction_contractor':
      return 'CH-2026-CHRG';
    case 'logistics_delivery':
      return '00456-126-16';
    case 'manufacturing_production':
      return 'CNC-5AX-01';
    case 'agriculture_livestock':
      return 'Parcelle A4';
    default:
      return 'Station 1';
  }
}

function buildCategoryProperties(category: string, reg: string, spec: string) {
  const result: any = {};
  if (category === 'medical_clinic') {
    result.orderRegistrationNumber = reg;
    result.medicalSpecialty = spec;
    result.canPrescribe = true;
  } else if (category === 'construction_contractor') {
    result.cacobatphCardNumber = reg;
    result.assignedChantierId = spec;
  } else if (category === 'logistics_delivery') {
    result.drivingLicenseCategory = reg;
    result.assignedVehiclePlate = spec;
  } else if (category === 'manufacturing_production') {
    result.assignedWorkstationId = spec;
    result.machineSafetyClearance = true;
  } else if (category === 'auto_garage') {
    result.assignedBayId = spec;
    result.technicalSpecialty = reg;
  } else if (category === 'real_estate') {
    result.carteProfessionnelleNumber = reg;
    result.canSignMandates = true;
  } else if (category === 'legal_notary') {
    result.barAssociationNumber = reg;
    result.swornClerkClearance = true;
  }
  return result;
}
