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
import { Button, LiquidButton } from '@/atrium/core';
import {
  StaffMember,
  StaffRole,
  StaffLifecycleStatus,
  RecruitmentLegalType,
  StaffPaymentMethod,
  BusinessCategory,
} from '../../types/index';
import {
  selectCurrentStaffFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
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
  const { createStaffMember, updateStaffMember } = useAtriumActions();
  const { existingStaff, language, currentUser } = useAtriumSelector(
    (s) => ({
      existingStaff: selectCurrentStaffFromState(s),
      language: s.language,
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
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
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s5)]" dir={isAr ? 'rtl' : 'ltr'}>
        {errors.form && (
          <div
            data-sq="card"
            style={{ '--sq-stroke': 'rgba(239,68,68,0.25)' } as React.CSSProperties}
            className="p-[var(--s3)] t-cap bg-red-500/10 text-red-500 flex items-center gap-[var(--s2)]"
          >
            <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Section 1: Identity */}
        <div className="flex flex-col gap-[var(--s4)]">
          <div className="flex items-center gap-[var(--s2)] t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
            <User size={16} strokeWidth={1.5} />
            <span>{isAr ? 'الهوية والدور' : isEn ? 'Identity & Role' : 'Identité & Poste'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4)]">
            <div className="flex flex-col gap-[var(--s1)]">
              <LabelInput
                field={isAr ? 'الاسم الكامل' : isEn ? 'Full Name' : 'Nom Complet'}
                value={fullName}
                onChange={(val) => setFullName(val)}
                required
                prefix={<User size={16} strokeWidth={1.5} className="text-[var(--text-3)]" />}
              />
              {errors.fullName && <p className="t-cap text-red-500">{errors.fullName}</p>}
            </div>

            <div>
              <LabelSelect
                field={isAr ? 'الدور' : isEn ? 'Role' : 'Rôle'}
                value={role}
                options={categoryRoles}
                onChange={(val) => setRole(val as StaffRole)}
                prefix={<Shield size={16} strokeWidth={1.5} className="text-[var(--text-3)]" />}
              />
            </div>

            <div className="flex flex-col gap-[var(--s1)]">
              <LabelInput
                field={isAr ? 'البريد' : isEn ? 'Email' : 'Email'}
                type="email"
                value={email}
                onChange={(val) => setEmail(val)}
                required
                prefix={<Mail size={16} strokeWidth={1.5} className="text-[var(--text-3)]" />}
              />
              {errors.email && <p className="t-cap text-red-500">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-[var(--s1)]">
              <LabelInput
                field={isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                value={phoneNumber}
                onChange={(val) => setPhoneNumber(val)}
                required
                placeholder="0550 12 34 56"
                prefix={<Phone size={16} strokeWidth={1.5} className="text-[var(--text-3)]" />}
              />
              {errors.phoneNumber && <p className="t-cap text-red-500">{errors.phoneNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-[var(--s2)]">
              <LabelInput
                field={isAr ? 'العمر' : isEn ? 'Age' : 'Âge'}
                type="number"
                min={18}
                max={75}
                value={age}
                onChange={(val) => setAge(val)}
              />
              <div className="flex flex-col gap-[var(--s1)]">
                <label className="t-small font-medium text-[var(--text-2)]">
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
          <div data-sq="card" data-sq-border="none" className="p-[var(--s4)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-col gap-[var(--s2)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s3)]">
              <div className="flex items-center gap-[var(--s3)]">
                <div data-sq="tile" data-sq-border="none" className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0">
                  <QrCode size={20} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col gap-[var(--s1)]">
                  <p className="t-small font-semibold text-[var(--text-1)]">
                    {isAr ? 'شارة الدخول' : isEn ? 'Access Badge' : 'Badge Accès'}
                  </p>
                  <p className="t-cap text-[var(--text-2)]">
                    {isAr ? 'لتسجيل الحضور السريع' : isEn ? 'For quick check-in' : 'Pour pointage rapide'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-[var(--s2)] w-full sm:w-auto">
                <div className="w-full sm:w-44">
                  <LabelInput
                    label={isAr ? 'رمز الشارة' : isEn ? 'Badge Code' : 'Code Badge'}
                    value={cardId}
                    onChange={(val) => setCardId(val.toUpperCase())}
                    placeholder="RFID-000000"
                    height={40}
                  />
                </div>
                <Button
                  type="button"
                  tone="accent"
                  size={40}
                  onClick={handleGenerateBadge}
                >
                  {isAr ? 'توليد' : isEn ? 'Gen' : 'Générer'}
                </Button>
              </div>
            </div>
            {errors.cardId && <p className="t-cap text-red-500">{errors.cardId}</p>}
          </div>
        </div>

        {/* Collapsible Advanced Settings & Contractual Dossier */}
        <div className="border-t border-[var(--atr-divider)] pt-[var(--s4)] flex flex-col gap-[var(--s4)]">
          <button
            type="button"
            data-sq="ctl"
            data-sq-border="none"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-[var(--s3)] bg-[#EFE9E2] dark:bg-[#2B2825] hover:bg-[#E7E0D7] dark:hover:bg-[#312D2A] text-start transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-[var(--s3)]">
              <FileText size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
              <span className="t-small font-semibold text-[var(--text-1)]">
                {isAr ? 'خيارات إضافية' : isEn ? 'More Details' : 'Options Avancées'}
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp size={16} strokeWidth={1.5} className="text-[var(--text-2)]" />
            ) : (
              <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--text-2)]" />
            )}
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-[var(--s6)] animate-in fade-in duration-200">
              {/* Contract & Compensation */}
              <div className="flex flex-col gap-[var(--s4)]">
                <div className="flex items-center gap-[var(--s2)] t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                  <CreditCard size={16} strokeWidth={1.5} />
                  <span>{isAr ? 'العقد والراتب' : isEn ? 'Pay & Contract' : 'Contrat & Paie'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s4)]">
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
                      suffix={<span className="t-cap text-[var(--text-2)]">DZD</span>}
                    />
                  </div>

                  <div className="flex flex-col gap-[var(--s1)]">
                    <LabelInput
                      field={isAr ? 'يوم الدفع' : isEn ? 'Pay Day' : 'Jour Paie'}
                      type="number"
                      min={1}
                      max={31}
                      value={paymentDay}
                      onChange={(val) => setPaymentDay(val)}
                    />
                    {errors.paymentDay && <p className="t-cap text-red-500">{errors.paymentDay}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-[var(--s4)]">
                  <div className="flex flex-col gap-[var(--s1)]">
                    <label className="t-small font-medium text-[var(--text-2)]">
                      {isAr ? 'طريقة الدفع' : isEn ? 'Pay Method' : 'Mode Paiement'}
                    </label>
                    <LiveSegmentedControl
                      fullWidth
                      size="md"
                      value={paymentMethod}
                      onValueChange={(val) => setPaymentMethod(val as StaffPaymentMethod)}
                      aria-label={isAr ? 'طريقة الدفع' : isEn ? 'Pay Method' : 'Mode Paiement'}
                      options={[
                        { value: 'ccp', label: isAr ? 'حساب بريدي' : isEn ? 'Postal' : 'CCP Poste' },
                        { value: 'bank_transfer', label: isAr ? 'تحويل بنكي' : isEn ? 'Bank' : 'Virement' },
                        { value: 'cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
                      ]}
                    />
                  </div>

                  {paymentMethod === 'ccp' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3)]">
                      <div className="sm:col-span-2 flex flex-col gap-[var(--s1)]">
                        <LabelInput
                          field={isAr ? 'الحساب البريدي' : isEn ? 'Postal Account' : 'Compte Postal'}
                          value={ccpNumber}
                          onChange={(val) => handleCcpNumberChange(val)}
                          placeholder="0012345678"
                          height={40}
                        />
                        {errors.ccpNumber && <p className="t-cap text-red-500">{errors.ccpNumber}</p>}
                      </div>
                      <div className="flex flex-col gap-[var(--s1)]">
                        <LabelInput
                          field={isAr ? 'المفتاح' : isEn ? 'Key' : 'Clé'}
                          value={ccpKey}
                          onChange={(val) => setCcpKey(val)}
                          placeholder="00"
                          height={40}
                        />
                        {errors.ccpKey && <p className="t-cap text-red-500">{errors.ccpKey}</p>}
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank_transfer' && (
                    <LabelInput
                      field={isAr ? 'الحساب البنكي' : isEn ? 'Bank Account' : 'RIB Bancaire'}
                      value={bankRib}
                      onChange={(val) => setBankRib(val)}
                      placeholder="002 00012 34567890 12"
                      height={40}
                    />
                  )}
                </div>
              </div>

              {/* Multi-Credential Authentication Toggles */}
              <div data-sq="panel" data-sq-border="none" className="flex flex-col gap-[var(--s3)] p-[var(--s4)] bg-[#F5F1EC] dark:bg-[#22201E]">
                <div className="flex items-center gap-[var(--s2)] t-small font-semibold text-[var(--text-1)]">
                  <KeyRound size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                  <span>{isAr ? 'بيانات الدخول' : isEn ? 'Login Access' : 'Accès Connexion'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3)]">
                  <div className="flex flex-col gap-[var(--s1)]">
                    <span className="t-cap font-medium text-[var(--text-2)]">
                      {isAr ? 'البريد' : isEn ? 'Email' : 'Email'}
                    </span>
                    <LiveSegmentedControl
                      fullWidth
                      size="sm"
                      value={canLoginEmail ? 'on' : 'off'}
                      onValueChange={(v) => setCanLoginEmail(v === 'on')}
                      options={[
                        { value: 'on', label: isAr ? 'مفعل' : isEn ? 'On' : 'Oui' },
                        { value: 'off', label: isAr ? 'معطل' : isEn ? 'Off' : 'Non' },
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-[var(--s1)]">
                    <span className="t-cap font-medium text-[var(--text-2)]">
                      {isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                    </span>
                    <LiveSegmentedControl
                      fullWidth
                      size="sm"
                      value={canLoginPhone ? 'on' : 'off'}
                      onValueChange={(v) => setCanLoginPhone(v === 'on')}
                      options={[
                        { value: 'on', label: isAr ? 'مفعل' : isEn ? 'On' : 'Oui' },
                        { value: 'off', label: isAr ? 'معطل' : isEn ? 'Off' : 'Non' },
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-[var(--s1)]">
                    <span className="t-cap font-medium text-[var(--text-2)]">
                      {isAr ? 'رمز سريع' : isEn ? 'Quick PIN' : 'Code PIN'}
                    </span>
                    <LiveSegmentedControl
                      fullWidth
                      size="sm"
                      value={canLoginPin ? 'on' : 'off'}
                      onValueChange={(v) => setCanLoginPin(v === 'on')}
                      options={[
                        { value: 'on', label: isAr ? 'مفعل' : isEn ? 'On' : 'Oui' },
                        { value: 'off', label: isAr ? 'معطل' : isEn ? 'Off' : 'Non' },
                      ]}
                    />
                  </div>
                </div>

                {canLoginPin && (
                  <div className="flex flex-wrap items-center gap-[var(--s3)] pt-[var(--s2)]">
                    <div className="w-36">
                      <LabelInput
                        field={isAr ? 'رمز PIN' : isEn ? 'PIN Code' : 'Code PIN'}
                        value={pinCode}
                        onChange={(val) => setPinCode(val.slice(0, 4))}
                        placeholder="1234"
                        type="text"
                        height={40}
                      />
                    </div>
                    <Button
                      type="button"
                      tone="soft"
                      size={40}
                      onClick={handleGeneratePin}
                      leading={<Sparkles size={16} strokeWidth={1.5} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />}
                    >
                      {isAr ? 'توليد' : isEn ? 'Generate' : 'Générer'}
                    </Button>
                    {errors.pinCode && <p className="t-cap text-red-500">{errors.pinCode}</p>}
                  </div>
                )}
              </div>

              {/* Medical & Emergency Contact */}
              <div className="flex flex-col gap-[var(--s4)]">
                <div className="flex items-center gap-[var(--s2)] t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                  <HeartPulse size={16} strokeWidth={1.5} />
                  <span>{isAr ? 'الطوارئ والصحة' : isEn ? 'Emergency Info' : 'Urgences'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s4)]">
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
              <div className="flex flex-col gap-[var(--s4)]">
                <div className="flex items-center gap-[var(--s2)] t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                  <Building size={16} strokeWidth={1.5} />
                  <span>{getCategoryPropertiesTitle(currentCategory, isAr, isEn)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4)]">
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
        <div className="pt-[var(--s4)] border-t border-[var(--atr-divider)] flex items-center justify-end gap-[var(--s3)]">
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
