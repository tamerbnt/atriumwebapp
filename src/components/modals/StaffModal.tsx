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
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { Button, LiquidButton } from '@/atrium';
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
      setCcpKey(String(calcKey).padStart(2, '0'));
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

  const categoryRoles = getRolesForCategory(currentCategory, isAr, isEn);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        staffToEdit
          ? isAr
            ? 'تعديل موظف'
            : isEn
            ? 'Edit Staff'
            : 'Modifier Membre'
          : isAr
          ? 'موظف جديد'
          : isEn
          ? 'New Staff'
          : 'Nouveau Membre'
      }
      subtitle={
        isAr
          ? 'الهوية، الشارة والعقد'
          : isEn
          ? 'Identity, badge & contract'
          : 'Identité, badge & contrat'
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

        {/* Section 1: Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[#d4522f]">
            <User className="w-4 h-4" />
            <span>{isAr ? 'الهوية والدور' : isEn ? 'Identity & Role' : 'Identité & Poste'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <LabelInput
                field={isAr ? 'الاسم الكامل' : isEn ? 'Full Name' : 'Nom Complet'}
                value={fullName}
                onChange={(val) => setFullName(val)}
                required
                prefix={<User className="w-4 h-4 text-black/50 dark:text-white/50" />}
              />
              {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <LabelSelect
                field={isAr ? 'الدور' : isEn ? 'Role' : 'Rôle'}
                value={role}
                options={categoryRoles}
                onChange={(val) => setRole(val as StaffRole)}
                prefix={<Shield className="w-4 h-4 text-black/50 dark:text-white/50" />}
              />
            </div>

            <div>
              <LabelInput
                field={isAr ? 'البريد' : isEn ? 'Email' : 'Email'}
                type="email"
                value={email}
                onChange={(val) => setEmail(val)}
                required
                prefix={<Mail className="w-4 h-4 text-black/50 dark:text-white/50" />}
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <LabelInput
                field={isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                value={phoneNumber}
                onChange={(val) => setPhoneNumber(val)}
                required
                placeholder="0550 12 34 56"
                prefix={<Phone className="w-4 h-4 text-black/50 dark:text-white/50" />}
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
              <div>
                <label className="block text-[11px] font-bold text-black/70 dark:text-white/70 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mb-1">
                  {isAr ? 'الجنس' : isEn ? 'Gender' : 'Genre'}
                </label>
                <LiveSegmentedControl
                  fullWidth
                  size="md"
                  value={gender}
                  options={[
                    { value: 'male', label: isAr ? 'ذكر' : isEn ? 'Male' : 'Homme' },
                    { value: 'female', label: isAr ? 'أنثى' : isEn ? 'Female' : 'Femme' },
                  ]}
                  onValueChange={(val) => setGender(val as 'male' | 'female')}
                  aria-label={isAr ? 'الجنس' : isEn ? 'Gender' : 'Genre'}
                />
              </div>
            </div>

            <div>
              <LabelInput
                field={isAr ? 'العنوان' : isEn ? 'Address' : 'Adresse'}
                value={address}
                onChange={(val) => setAddress(val)}
                placeholder="Hydra, Alger"
              />
            </div>
          </div>

          {/* Access Badge */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-black dark:text-white">
                    {isAr ? 'شارة الدخول' : isEn ? 'Access Badge' : 'Badge Accès'}
                  </p>
                  <p className="text-[11px] text-black/60 dark:text-white/60">
                    {isAr ? 'لتسجيل الحضور السريع' : isEn ? 'For quick check-in' : 'Pour pointage rapide'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value.toUpperCase())}
                  placeholder="RFID-000000"
                  className="font-mono text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white placeholder:text-black/45 dark:placeholder:text-white/45 w-full sm:w-36 focus:outline-hidden focus:border-[#d4522f]"
                />
                <button
                  type="button"
                  onClick={handleGenerateBadge}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[#d4522f] text-white hover:bg-[#b0674b] transition-colors"
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
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left rtl:text-right transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#d4522f]" />
              <span className="text-xs font-semibold text-black dark:text-white">
                {isAr ? 'خيارات إضافية' : isEn ? 'More Details' : 'Options Avancées'}
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-black/60 dark:text-white/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-black/60 dark:text-white/60" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6 animate-in fade-in duration-200">
              {/* Contract & Compensation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[#d4522f]">
                  <CreditCard className="w-4 h-4" />
                  <span>{isAr ? 'العقد والراتب' : isEn ? 'Pay & Contract' : 'Contrat & Paie'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LabelSelect
                    field={isAr ? 'نوع العقد' : isEn ? 'Contract Type' : 'Type Contrat'}
                    value={recruitmentType}
                    options={[
                      { value: 'cdi', label: isAr ? 'دائم' : isEn ? 'Permanent' : 'Permanent (CDI)' },
                      { value: 'cdd', label: isAr ? 'محدد المدة' : isEn ? 'Fixed Term' : 'Durée Fixe (CDD)' },
                      { value: 'stage', label: isAr ? 'تربص' : isEn ? 'Intern' : 'Stagiaire' },
                      { value: 'vacataire', label: isAr ? 'بالساعة' : isEn ? 'Hourly' : 'Horaire' },
                      { value: 'prestataire', label: isAr ? 'متعاقد' : isEn ? 'Contractor' : 'Prestataire' },
                    ]}
                    onChange={(val) => setRecruitmentType(val as RecruitmentLegalType)}
                  />

                  <div>
                    <LabelInput
                      field={isAr ? 'الراتب الشهري' : isEn ? 'Monthly Pay' : 'Salaire Net'}
                      type="number"
                      value={salary}
                      onChange={(val) => setSalary(val)}
                      suffix={<span className="text-[11px] text-black/55 dark:text-white/55">DZD</span>}
                    />
                  </div>

                  <div>
                    <LabelInput
                      field={isAr ? 'يوم الدفع' : isEn ? 'Pay Day' : 'Jour Paie'}
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
                    field={isAr ? 'طريقة الدفع' : isEn ? 'Pay Method' : 'Mode Paiement'}
                    value={paymentMethod}
                    options={[
                      { value: 'ccp', label: isAr ? 'حساب بريدي' : isEn ? 'Postal Account' : 'Compte Postal' },
                      { value: 'bank_transfer', label: isAr ? 'تحويل بنكي' : isEn ? 'Bank Transfer' : 'Virement Bancaire' },
                      { value: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
                    ]}
                    onChange={(val) => setPaymentMethod(val as StaffPaymentMethod)}
                  />

                  {paymentMethod === 'ccp' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <LabelInput
                          field={isAr ? 'الحساب البريدي' : isEn ? 'Postal Account' : 'Compte Postal'}
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
                      field={isAr ? 'الحساب البنكي' : isEn ? 'Bank Account' : 'RIB Bancaire'}
                      value={bankRib}
                      onChange={(val) => setBankRib(val)}
                      placeholder="002 00012 34567890 12"
                    />
                  )}
                </div>
              </div>

              {/* Multi-Credential Authentication Toggles */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
                  <KeyRound className="w-4 h-4 text-[#d4522f]" />
                  <span>{isAr ? 'بيانات الدخول' : isEn ? 'Login Access' : 'Accès Connexion'}</span>
                </div>
                <p className="text-[11px] text-black/60 dark:text-white/60">
                  {isAr
                    ? 'طرق تسجيل الدخول المتاحة'
                    : isEn
                    ? 'Allowed sign-in methods'
                    : 'Méthodes de connexion actives'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs text-black dark:text-white">
                    <input
                      type="checkbox"
                      checked={canLoginEmail}
                      onChange={(e) => setCanLoginEmail(e.target.checked)}
                      className="accent-[#d4522f] rounded-sm"
                    />
                    <span>{isAr ? 'البريد' : isEn ? 'Email' : 'Email'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs text-black dark:text-white">
                    <input
                      type="checkbox"
                      checked={canLoginPhone}
                      onChange={(e) => setCanLoginPhone(e.target.checked)}
                      className="accent-[#d4522f] rounded-sm"
                    />
                    <span>{isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer text-xs text-black dark:text-white">
                    <input
                      type="checkbox"
                      checked={canLoginPin}
                      onChange={(e) => setCanLoginPin(e.target.checked)}
                      className="accent-[#d4522f] rounded-sm"
                    />
                    <span>{isAr ? 'رمز سريع' : isEn ? 'Quick PIN' : 'Code PIN'}</span>
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
                      className="text-xs px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-black dark:text-white flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#d4522f]" />
                      <span>{isAr ? 'توليد' : isEn ? 'Generate' : 'Générer'}</span>
                    </button>
                    {errors.pinCode && <p className="text-[11px] text-red-500">{errors.pinCode}</p>}
                  </div>
                )}
              </div>

              {/* Medical & Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[#d4522f]">
                  <HeartPulse className="w-4 h-4" />
                  <span>{isAr ? 'الطوارئ والصحة' : isEn ? 'Emergency Info' : 'Urgences'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LabelSelect
                    field={isAr ? 'فصيلة الدم' : isEn ? 'Blood Type' : 'Groupe Sanguin'}
                    value={bloodGroup}
                    options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                    onChange={(val) => setBloodGroup(val as string)}
                  />

                  <LabelInput
                    field={isAr ? 'جهة الطوارئ' : isEn ? 'Emergency Contact' : 'Contact Urgence'}
                    value={emergencyContactName}
                    onChange={(val) => setEmergencyContactName(val)}
                    placeholder={isAr ? 'اسم القريب' : isEn ? 'Contact name' : 'Nom'}
                  />

                  <LabelInput
                    field={isAr ? 'هاتف الطوارئ' : isEn ? 'Emergency Phone' : 'Tél Urgence'}
                    value={emergencyContactPhone}
                    onChange={(val) => setEmergencyContactPhone(val)}
                    placeholder="0661 00 00 00"
                  />
                </div>

                <LabelInput
                  field={isAr ? 'ملاحظات صحية' : isEn ? 'Health Notes' : 'Notes Santé'}
                  value={medicalNotes}
                  onChange={(val) => setMedicalNotes(val)}
                  placeholder={isAr ? 'حساسية أو علاج...' : isEn ? 'Allergies, notes...' : 'Allergies, notes...'}
                />
              </div>

              {/* Category-Specific Operational Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-[#d4522f]">
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
          <Button
            type="button"
            tone="soft"
            onClick={onClose}
          >
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </Button>

          <LiquidButton
            kind={staffToEdit ? 'confirm' : 'create'}
            type="submit"
            disabled={isSubmitting}
            labels={{
              idle: staffToEdit
                ? isAr
                  ? 'حفظ'
                  : isEn
                  ? 'Save'
                  : 'Enregistrer'
                : isAr
                ? 'إضافة'
                : isEn
                ? 'Add Staff'
                : 'Ajouter',
            }}
          />
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

function getRolesForCategory(category: string, isAr: boolean, isEn: boolean): SelectOption[] {
  const tr = (ar: string, en: string, fr: string) => (isAr ? ar : isEn ? en : fr);
  switch (category) {
    case 'medical_clinic':
      return [
        { value: 'MedecinChef', label: tr('رئيس الأطباء', 'Chief Doctor', 'Médecin Chef') },
        { value: 'Doctor', label: tr('طبيب', 'Doctor', 'Médecin') },
        { value: 'Manager', label: tr('مدير صحة', 'Health Manager', 'Cadre Santé') },
        { value: 'Technician', label: tr('ممرض / مخبري', 'Nurse / Lab', 'Infirmier / Labo') },
        { value: 'Staff', label: tr('سكرتارية طبية', 'Reception', 'Secrétaire') },
      ];
    case 'auto_garage':
      return [
        { value: 'Owner', label: tr('مدير الورشة', 'Shop Owner', 'Gérant') },
        { value: 'ChefAtelier', label: tr('رئيس الورشة', 'Head Mechanic', 'Chef Atelier') },
        { value: 'Technician', label: tr('فني تشخيص', 'Diagnostic Tech', 'Technicien Diag') },
        { value: 'Staff', label: tr('هيكل وطلاء', 'Body & Paint', 'Carrossier') },
        { value: 'Cashier', label: tr('استقبال ودفع', 'Front Desk', 'Réceptionnaire') },
      ];
    case 'construction_contractor':
      return [
        { value: 'Owner', label: tr('المدير العام', 'Director', 'Directeur') },
        { value: 'ConducteurTravaux', label: tr('مهندس أشغال', 'Site Lead', 'Conducteur Travaux') },
        { value: 'ChefChantier', label: tr('رئيس ورشة', 'Site Chief', 'Chef Chantier') },
        { value: 'Technician', label: tr('مهندس / مساح', 'Engineer', 'Ingénieur / Métreur') },
        { value: 'Staff', label: tr('عامل مؤهل', 'Field Worker', 'Ouvrier') },
      ];
    case 'logistics_delivery':
      return [
        { value: 'Owner', label: tr('مدير النقل', 'Logistics Lead', 'Directeur') },
        { value: 'Dispatcher', label: tr('منسق رحلات', 'Dispatcher', 'Dispatcheur') },
        { value: 'Manager', label: tr('مسؤول الأسطول', 'Fleet Manager', 'Resp. Flotte') },
        { value: 'Technician', label: tr('سائق موزع', 'Driver', 'Chauffeur') },
        { value: 'Staff', label: tr('أمين مخزن', 'Dock Staff', 'Magasinier') },
      ];
    case 'manufacturing_production':
      return [
        { value: 'Owner', label: tr('مدير المصنع', 'Plant Owner', 'Directeur') },
        { value: 'ProductionManager', label: tr('مدير الإنتاج', 'Prod. Manager', 'Resp. Production') },
        { value: 'Technician', label: tr('مشغل آلة', 'Machine Op', 'Opérateur') },
        { value: 'Staff', label: tr('مراقب جودة', 'Quality Check', 'Contrôle Qualité') },
      ];
    case 'agriculture_livestock':
      return [
        { value: 'Owner', label: tr('صاحب المزرعة', 'Farm Owner', 'Exploitant') },
        { value: 'ChefCulture', label: tr('رئيس مزرعة', 'Agronomist', 'Chef Culture') },
        { value: 'Technician', label: tr('تقني ري', 'Machinery Tech', 'Technicien') },
        { value: 'Staff', label: tr('عامل فلاحي', 'Farm Worker', 'Ouvrier') },
      ];
    case 'real_estate':
      return [
        { value: 'Owner', label: tr('مدير الوكالة', 'Agency Owner', 'Directeur') },
        { value: 'Director', label: tr('مستشار عقاري', 'Broker', 'Négociateur') },
        { value: 'Manager', label: tr('مدير الإيجار', 'Lease Manager', 'Gestionnaire') },
        { value: 'Staff', label: tr('مساعد تجاري', 'Assistant', 'Assistant') },
      ];
    case 'trading_commercial':
      return [
        { value: 'Owner', label: tr('المدير العام', 'Owner', 'Gérant') },
        { value: 'DirecteurCommercial', label: tr('مدير المبيعات', 'Sales Lead', 'Dir. Commercial') },
        { value: 'Manager', label: tr('مسؤول المخزن', 'Depot Lead', 'Resp. Dépôt') },
        { value: 'Cashier', label: tr('أمين الصندوق', 'Cashier', 'Caissier') },
        { value: 'Staff', label: tr('مندوب مبيعات', 'Sales Rep', 'Commercial') },
      ];
    case 'education_cohort':
      return [
        { value: 'Owner', label: tr('مدير المعهد', 'Director', 'Directeur') },
        { value: 'Technician', label: tr('أستاذ / مكون', 'Instructor', 'Formateur') },
        { value: 'Manager', label: tr('منسق تعليمي', 'Coordinator', 'Coordinateur') },
        { value: 'Staff', label: tr('أمانة المعهد', 'Admin Desk', 'Secrétariat') },
      ];
    case 'legal_notary':
      return [
        { value: 'Owner', label: tr('محامي / موثق', 'Lead Counsel', 'Titulaire') },
        { value: 'Partner', label: tr('شريك', 'Partner', 'Associé') },
        { value: 'Associate', label: tr('متعاون', 'Associate', 'Collaborateur') },
        { value: 'Staff', label: tr('أمانة قانونية', 'Legal Clerk', 'Secrétaire') },
      ];
    case 'project_milestone':
      return [
        { value: 'Owner', label: tr('مدير الوكالة', 'Agency Lead', 'Directeur') },
        { value: 'ProjectManager', label: tr('مدير مشاريع', 'Project Lead', 'Chef Projet') },
        { value: 'Creative', label: tr('مصمم إبداعي', 'Art Director', 'Dir. Artistique') },
        { value: 'Staff', label: tr('عضو فريق', 'Team Staff', 'Opérateur') },
      ];
    case 'appointment_service':
      return [
        { value: 'Owner', label: tr('مدير الصالون', 'Salon Owner', 'Gérant') },
        { value: 'Stylist', label: tr('مصفف شعر', 'Stylist', 'Styliste') },
        { value: 'Technician', label: tr('تجميل وعناية', 'Esthetician', 'Esthéticienne') },
        { value: 'Staff', label: tr('مساعد', 'Assistant', 'Assistant') },
      ];
    case 'pos_inventory':
      return [
        { value: 'Owner', label: tr('صاحب المتجر', 'Shop Owner', 'Gérant') },
        { value: 'Manager', label: tr('مدير المتجر', 'Store Lead', 'Responsable') },
        { value: 'Cashier', label: tr('أمين الصندوق', 'Cashier', 'Caissier') },
        { value: 'Staff', label: tr('أمين المخزن', 'Stock Clerk', 'Gestionnaire Stock') },
      ];
    case 'membership_session':
    default:
      return [
        { value: 'Owner', label: tr('مدير النادي', 'Club Owner', 'Directeur') },
        { value: 'Manager', label: tr('مدير العمليات', 'Manager', 'Responsable') },
        { value: 'Technician', label: tr('مدرب رياضي', 'Coach', 'Coach Sportif') },
        { value: 'Cashier', label: tr('استقبال', 'Front Desk', 'Réceptionniste') },
        { value: 'Staff', label: tr('صيانة', 'Maintenance', 'Maintenance') },
      ];
  }
}

function getCategoryPropertiesTitle(category: string, isAr: boolean, isEn: boolean): string {
  if (isAr) return 'البيانات المهنية';
  if (isEn) return 'Role Details';
  return 'Détails Métier';
}

function getCategoryRegulatoryLabel(category: string, isAr: boolean, isEn: boolean): string {
  switch (category) {
    case 'medical_clinic':
      return isAr ? 'رقم المجلس' : isEn ? 'Medical ID' : 'N° Ordre';
    case 'construction_contractor':
      return isAr ? 'رقم الاعتماد' : isEn ? 'Worker Card' : 'N° Carte Pro';
    case 'logistics_delivery':
      return isAr ? 'صنف الرخصة' : isEn ? 'License Class' : 'Catégorie Permis';
    case 'real_estate':
      return isAr ? 'البطاقة المهنية' : isEn ? 'Broker ID' : 'Carte Pro';
    case 'legal_notary':
      return isAr ? 'رقم النقابة' : isEn ? 'Bar Number' : 'N° Barreau';
    default:
      return isAr ? 'الترخيص المهني' : isEn ? 'License ID' : 'Agrément Pro';
  }
}

function getCategoryRegulatoryPlaceholder(category: string): string {
  switch (category) {
    case 'medical_clinic':
      return 'CNOM-16/48201';
    case 'construction_contractor':
      return 'PRO-2026-99881';
    case 'logistics_delivery':
      return 'Permis EC';
    case 'real_estate':
      return 'CPI-16-04289';
    case 'legal_notary':
      return 'BAR-2012';
    default:
      return 'REF-001';
  }
}

function getCategoryStationLabel(category: string, isAr: boolean, isEn: boolean): string {
  switch (category) {
    case 'medical_clinic':
      return isAr ? 'التخصص' : isEn ? 'Specialty' : 'Spécialité';
    case 'auto_garage':
      return isAr ? 'المحطة' : isEn ? 'Work Bay' : 'Poste / Pont';
    case 'construction_contractor':
      return isAr ? 'الموقع' : isEn ? 'Site Code' : 'Chantier';
    case 'logistics_delivery':
      return isAr ? 'لوحة المركبة' : isEn ? 'Vehicle Plate' : 'Matricule Véhicule';
    case 'manufacturing_production':
      return isAr ? 'محطة العمل' : isEn ? 'Workstation' : 'Poste Travail';
    case 'agriculture_livestock':
      return isAr ? 'القطعة' : isEn ? 'Parcel' : 'Parcelle';
    default:
      return isAr ? 'المحطة' : isEn ? 'Station' : 'Poste';
  }
}

function getCategoryStationPlaceholder(category: string): string {
  switch (category) {
    case 'medical_clinic':
      return 'Pédiatrie';
    case 'auto_garage':
      return 'Pont 1, Diag';
    case 'construction_contractor':
      return 'CH-2026-CHRG';
    case 'logistics_delivery':
      return '00456-126-16';
    case 'manufacturing_production':
      return 'CNC-01';
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
