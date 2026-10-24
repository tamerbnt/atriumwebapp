import React, { useState } from 'react';
import {
  Activity,
  UserPlus,
  Stethoscope,
  FileText,
  Calendar,
  CreditCard,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Printer,
  ChevronRight,
  ShieldCheck,
  Pill,
  UserCheck,
  HeartPulse,
  Thermometer,
  Eye,
  Trash2,
  Sparkles,
  Download,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { MedicalPatient, MedicalConsultation, MedicalPrescription } from '../../../types/index';

interface MedicalClinicViewProps {
  initialTab?: 'dashboard' | 'queue' | 'patients' | 'prescriptions' | 'billing';
}

export const MedicalClinicView: React.FC<MedicalClinicViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'patients' | 'prescriptions' | 'billing'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTriage, setFilterTriage] = useState<'all' | 'urgent' | 'scheduled' | 'walkin'>('all');

  // Modal States
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedPatientForExam, setSelectedPatientForExam] = useState<MedicalPatient | null>(null);
  const [activeConsultationForRx, setActiveConsultationForRx] = useState<MedicalConsultation | null>(null);

  // Mock State for Medical Clinic (Offline-first & Local Sync)
  const [patients, setPatients] = useState<MedicalPatient[]>([
    {
      id: 'pat_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      fullName: 'Yacine Belkacemi',
      nationalId: '19881601002345',
      phone: '0555 12 34 56',
      gender: 'Male',
      dateOfBirth: '1988-06-14',
      bloodGroup: 'O+',
      allergies: ['Pénicilline', 'Aspirine'],
      chronicConditions: ['Hypertension artérielle'],
      emergencyContact: 'Fatima Belkacemi (Épouse)',
      emergencyPhone: '0555 98 76 54',
      notes: 'Patient régulier. Surveillance tensionnelle mensuelle.',
      createdAt: '2026-05-01T09:00:00Z',
    },
    {
      id: 'pat_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      fullName: 'Meriem Haddad',
      nationalId: '19951604005678',
      phone: '0661 45 78 90',
      gender: 'Female',
      dateOfBirth: '1995-11-20',
      bloodGroup: 'A+',
      allergies: [],
      chronicConditions: ['Diabète Type 2'],
      emergencyContact: 'Karim Haddad (Frère)',
      emergencyPhone: '0661 11 22 33',
      notes: 'Suivi glycémique et fond d\'œil annuel.',
      createdAt: '2026-05-02T10:30:00Z',
    },
    {
      id: 'pat_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      fullName: 'Ahmed Ziane',
      nationalId: '19741603009988',
      phone: '0770 33 44 55',
      gender: 'Male',
      dateOfBirth: '1974-03-08',
      bloodGroup: 'B+',
      allergies: ['Sulfamides'],
      chronicConditions: ['Asthme bronchique'],
      emergencyContact: 'Samia Ziane',
      emergencyPhone: '0770 99 88 77',
      notes: 'Traitement de fond par bronchodilatateur.',
      createdAt: '2026-05-03T11:00:00Z',
    },
  ]);

  const [consultations, setConsultations] = useState<MedicalConsultation[]>([
    {
      id: 'cons_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      patientId: 'pat_01',
      patientName: 'Yacine Belkacemi',
      consultationDate: '2026-05-10T10:00:00Z',
      chiefComplaint: 'Céphalées intenses et vertiges depuis 48h',
      vitals: {
        bloodPressure: '155/95',
        temperatureCelsius: 37.1,
        heartRateBpm: 82,
        weightKg: 84,
        heightCm: 178,
        bmi: 26.5,
        bloodSugarMgDl: 110,
      },
      clinicalExam: 'Auscultation cardiopulmonaire normale. Poussée hypertensive modérée.',
      diagnosis: 'Poussée hypertensive réactionnelle / Céphalées de tension',
      status: 'InWaitingQueue',
      consultationFeeDzd: 3000,
      copayAmountDzd: 600,
      insuranceShareDzd: 2400,
      isPaid: false,
      createdAt: '2026-05-10T09:45:00Z',
    },
    {
      id: 'cons_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      patientId: 'pat_02',
      patientName: 'Meriem Haddad',
      consultationDate: '2026-05-10T11:15:00Z',
      chiefComplaint: 'Bilan de contrôle diabétologique trimestriel',
      vitals: {
        bloodPressure: '120/75',
        temperatureCelsius: 36.8,
        heartRateBpm: 74,
        weightKg: 65,
        heightCm: 164,
        bmi: 24.2,
        bloodSugarMgDl: 138,
      },
      clinicalExam: 'Pouls périphériques présents, pas d\'œdème des membres inférieurs.',
      diagnosis: 'Diabète type 2 équilibré sous antidiabétiques oraux',
      status: 'Completed',
      consultationFeeDzd: 3500,
      copayAmountDzd: 0,
      insuranceShareDzd: 3500,
      isPaid: true,
      createdAt: '2026-05-10T10:30:00Z',
    },
  ]);

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>([
    {
      id: 'rx_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      consultationId: 'cons_02',
      patientId: 'pat_02',
      patientName: 'Meriem Haddad',
      prescriptionDate: '2026-05-10',
      items: [
        {
          drugName: 'Metformine 850mg',
          form: 'Comprimé pelliculé',
          dosage: '850mg',
          frequency: '1 comprimé matin et soir au milieu du repas',
          durationDays: 90,
          instructions: 'Ne pas interrompre sans avis médical.',
        },
        {
          drugName: 'Gliclazide 30mg',
          form: 'Comprimé à libération modifiée',
          dosage: '30mg',
          frequency: '1 comprimé le matin au petit déjeuner',
          durationDays: 90,
          instructions: 'Contrôler la glycémie à jeun 2 fois par semaine.',
        },
      ],
      qrCodeHash: 'MED-RX-2026-9921',
      isSigned: true,
      notes: 'Bilan biologique (HbA1c, Créatinine) à renouveler dans 3 mois.',
      createdAt: '2026-05-10T11:45:00Z',
    },
  ]);

  // Form States
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('1990-01-01');
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newPatientBlood, setNewPatientBlood] = useState<'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'>('O+');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');
  const [newPatientChronic, setNewPatientChronic] = useState('');

  // Consultation Form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [bpValue, setBpValue] = useState('120/80');
  const [tempValue, setTempValue] = useState('37.0');
  const [weightValue, setWeightValue] = useState('70');
  const [diagnosisValue, setDiagnosisValue] = useState('');

  // Filtering
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.nationalId && p.nationalId.includes(searchQuery))
  );

  const filteredConsultations = consultations.filter((c) =>
    c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      showToast('Veuillez renseigner le nom et le numéro de téléphone', 'error');
      return;
    }

    const created: MedicalPatient = {
      id: `pat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      fullName: newPatientName.trim(),
      phone: newPatientPhone.trim(),
      gender: newPatientGender,
      dateOfBirth: newPatientDob,
      bloodGroup: newPatientBlood,
      allergies: newPatientAllergies.split(',').map((s) => s.trim()).filter(Boolean),
      chronicConditions: newPatientChronic.split(',').map((s) => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    setPatients([created, ...patients]);
    setIsPatientModalOpen(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientAllergies('');
    setNewPatientChronic('');
    showToast('Dossier médical patient créé avec succès', 'success');
  };

  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === selectedPatientId);
    if (!pat) {
      showToast('Veuillez sélectionner un patient', 'error');
      return;
    }

    const created: MedicalConsultation = {
      id: `cons_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
      patientId: pat.id,
      patientName: pat.fullName,
      consultationDate: new Date().toISOString(),
      chiefComplaint: complaintText || 'Consultation générale',
      vitals: {
        bloodPressure: bpValue,
        temperatureCelsius: parseFloat(tempValue) || 37.0,
        weightKg: parseFloat(weightValue) || 70,
      },
      diagnosis: diagnosisValue || 'Examen clinique en cours',
      status: 'InWaitingQueue',
      consultationFeeDzd: 3000,
      copayAmountDzd: 600,
      insuranceShareDzd: 2400,
      isPaid: false,
      createdAt: new Date().toISOString(),
    };

    setConsultations([created, ...consultations]);
    setIsConsultationModalOpen(false);
    setComplaintText('');
    setDiagnosisValue('');
    showToast('Patient admis en salle d\'attente / consultation', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Header Strip */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-sm border border-teal-100 dark:border-teal-800">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المركز الطبي والعيادات السريرية' : language === 'fr' ? 'Cabinet Médical & Polyclinique' : 'Medical Clinic & Health Center'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                FacilityType: 18
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'الملف الطبي للمريض (EHR)، قائمة الانتظار، الوصفات الطبية الإلكترونية، والتأمين الصحي'
                : language === 'fr'
                ? 'Dossier Médical (EHR), file d\'attente, ordonnances électroniques & bordereaux CNAS/Chifa'
                : 'Universal Clinical EHR, patient queue, digital prescriptions & health insurance reimbursement'}
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPatientModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus size={15} />
            <span>{language === 'ar' ? 'مريض جديد' : language === 'fr' ? 'Nouveau Patient' : 'New Patient'}</span>
          </button>
          <button
            onClick={() => setIsConsultationModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Stethoscope size={15} />
            <span>{language === 'ar' ? 'فحص / استشارة' : language === 'fr' ? 'Nouvelle Consultation' : 'New Consultation'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <Activity size={15} />
          <span>{language === 'ar' ? 'لوحة القيادة' : language === 'fr' ? 'Tableau de Bord' : 'Dashboard'}</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'queue'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <Clock size={15} />
          <span>{language === 'ar' ? 'قائمة الانتظار السريرية' : language === 'fr' ? 'File d\'Attente & Triage' : 'Clinical Queue'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px]">
            {consultations.filter((c) => c.status === 'InWaitingQueue').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'patients'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <UserCheck size={15} />
          <span>{language === 'ar' ? 'دليل المرضى (EHR)' : language === 'fr' ? 'Dossiers Patients (EHR)' : 'Patients Directory (EHR)'}</span>
          <span className="text-[10px] text-neutral-400">({patients.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'prescriptions'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <Pill size={15} />
          <span>{language === 'ar' ? 'الوصفات الطبية (Ordonnances)' : language === 'fr' ? 'Ordonnances & Soins' : 'Prescriptions'}</span>
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'billing'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
          }`}
        >
          <CreditCard size={15} />
          <span>{language === 'ar' ? 'الفوترة والضمان الاجتماعي' : language === 'fr' ? 'Facturation & Chifa / CNAS' : 'Billing & Insurance'}</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{language === 'ar' ? 'المرضى المسجلون' : language === 'fr' ? 'Total Patients Suivis' : 'Total Registered Patients'}</span>
                  <UserCheck size={16} className="text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {patients.length}
                </div>
                <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1 font-medium">
                  <span>+12% {language === 'ar' ? 'هذا الشهر' : 'ce mois-ci'}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{language === 'ar' ? 'في قاعة الانتظار' : language === 'fr' ? 'En Salle d\'Attente' : 'In Waiting Room'}</span>
                  <Clock size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {consultations.filter((c) => c.status === 'InWaitingQueue').length}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {language === 'ar' ? 'متوسط الانتظار: 14 دقيقة' : 'Temps moyen: 14 min'}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{language === 'ar' ? 'الفحوصات المكتملة اليوم' : language === 'fr' ? 'Consultations du Jour' : 'Today\'s Consultations'}</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {consultations.length}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                  100% {language === 'ar' ? 'سجلات إلكترونية مؤمنة' : 'Dossiers sécurisés'}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
                  <span>{language === 'ar' ? 'مداخيل الفحوصات' : language === 'fr' ? 'Honoraires du Jour' : 'Daily Receipts'}</span>
                  <CreditCard size={16} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2 font-mono">
                  {formatMoney(
                    consultations.reduce((acc, c) => acc + c.consultationFeeDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {language === 'ar' ? 'نقدا + تعويضات الصندوق' : 'Espèces & Part Chifa'}
                </div>
              </div>
            </div>

            {/* Live Queue Banner */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {language === 'ar' ? 'قائمة الفحص النشطة حاليا' : language === 'fr' ? 'Patients Actuellement en Triage / Attente' : 'Active Queue'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('queue')}
                  className="text-xs text-teal-600 hover:underline font-medium flex items-center gap-1"
                >
                  <span>{language === 'ar' ? 'فتح شاشة الانتظار الكاملة' : 'Ouvrir la file complète'}</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {consultations.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                        {c.patientName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {c.patientName}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {c.chiefComplaint}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      {c.vitals?.bloodPressure && (
                        <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                          <HeartPulse size={13} className="text-rose-500" />
                          <span>TA: {c.vitals.bloodPressure}</span>
                        </div>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {c.status === 'Completed'
                          ? language === 'ar' ? 'مكتمل' : 'Terminé'
                          : language === 'ar' ? 'في الانتظار' : 'En Attente'}
                      </span>
                      <button
                        onClick={() => {
                          setActiveConsultationForRx(c);
                          setIsPrescriptionModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Pill size={12} />
                        <span>{language === 'ar' ? 'وصفة' : 'Ordonnance'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            {/* Filter toolbar */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'بحث بالاسم، الهاتف، الرقم الوطني...' : 'Recherche par nom, téléphone, NIN...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>{language === 'ar' ? 'إضافة ملف مريض' : 'Créer Dossier Patient'}</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'ar' ? 'المريض' : 'Patient'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'فصيلة الدم' : 'Groupe Sanguin'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'الحساسيات' : 'Allergies'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'الأمراض المزمنة' : 'Maladies Chroniques'}</th>
                    <th className="py-3 px-4 text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                          <span>{p.fullName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {p.gender === 'Male' ? 'H' : 'F'}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400">NIN: {p.nationalId || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-700 dark:text-neutral-300">{p.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {p.bloodGroup || 'Non renseigné'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.allergies && p.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.allergies.map((a, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Aucune connue</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.chronicConditions && p.chronicConditions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.chronicConditions.map((c, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Néant</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setIsConsultationModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-[11px] font-semibold cursor-pointer"
                        >
                          {language === 'ar' ? 'فحص جديد' : 'Examiner'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'سجل الوصفات الطبية الإلكترونية' : 'Ordonnances Médicales Enregistrées'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'ar'
                    ? 'طباعة بوصفة رسمية ثلاثية اللغات برمز تحقق رقمي QR Code'
                    : 'Impression d\'ordonnance normalisée avec code QR de validation & posologie'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white">{rx.patientName}</div>
                      <div className="text-[11px] text-neutral-400">Date: {rx.prescriptionDate}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {rx.qrCodeHash}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {rx.items.map((item, idx) => (
                      <div key={idx} className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg text-xs space-y-1">
                        <div className="font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
                          <span>{item.drugName}</span>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">{item.durationDays} jours</span>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">{item.frequency}</div>
                        {item.instructions && (
                          <div className="text-[10px] text-neutral-400 italic">Note: {item.instructions}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck size={13} />
                      <span>{language === 'ar' ? 'موقعة رقميا ومطابقة' : 'Signature & Cachet Validés'}</span>
                    </span>
                    <button
                      onClick={() => showToast('Impression de l\'ordonnance envoyée vers l\'imprimante', 'success')}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>{language === 'ar' ? 'طباعة A5' : 'Imprimer A5'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'قاعة الانتظار وغرف الفحص' : 'Salle d\'Attente & Triage Médical'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'ar' ? 'إدارة دور المرضى والعلامات الحيوية قبل الدخول للطبيب' : 'Prise des constantes vitales & appel numérique des patients'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-850">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>1. En Attente ({consultations.filter((c) => c.status === 'InWaitingQueue').length})</span>
                </div>
                <div className="space-y-2">
                  {consultations
                    .filter((c) => c.status === 'InWaitingQueue')
                    .map((c) => (
                      <div key={c.id} className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">{c.patientName}</div>
                        <div className="text-[11px] text-neutral-500 mt-1">{c.chiefComplaint}</div>
                        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                          <span className="text-[10px] text-neutral-400">TA: {c.vitals?.bloodPressure || '--'}</span>
                          <button
                            onClick={() => {
                              const updated = consultations.map((item) =>
                                item.id === c.id ? { ...item, status: 'Completed' as const } : item
                              );
                              setConsultations(updated);
                              showToast('Consultation terminée avec succès', 'success');
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-teal-600 text-white font-semibold cursor-pointer"
                          >
                            Appeler & Clôturer
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-850">
                <div className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                  <Stethoscope size={14} />
                  <span>2. En Examen Clinique (0)</span>
                </div>
                <div className="p-4 text-center text-xs text-neutral-400 italic">
                  Aucun patient en fauteuil actuellement
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-850">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>3. Consultations Clôturées ({consultations.filter((c) => c.status === 'Completed').length})</span>
                </div>
                <div className="space-y-2">
                  {consultations
                    .filter((c) => c.status === 'Completed')
                    .map((c) => (
                      <div key={c.id} className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">{c.patientName}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{c.diagnosis}</div>
                        <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Dossier validé et archivé</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الفوترة الطبية ومطالبات التأمين (CNAS / CASNOS / Chifa)' : 'Facturation Médicale & Télétransmission'}
              </h3>
              <p className="text-xs text-neutral-500">
                {language === 'ar'
                  ? 'تسجيل المدفوعات النقدية ومطالبات الاسترجاع لصناديق الضمان الاجتماعي'
                  : 'Gestion du tiers-payant, tickets modérateurs et bordereaux récapitulatifs'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'ar' ? 'المريض' : 'Patient'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'مبلغ الفحص' : 'Honoraires (DZD)'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'حصة المريض' : 'Part Patient'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'حصة التأمين' : 'Part Chifa / Mutuelle'}</th>
                    <th className="py-3 px-4">{language === 'ar' ? 'الحالة' : 'Règlement'}</th>
                    <th className="py-3 px-4 text-right">{language === 'ar' ? 'إيصال' : 'Quittance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {consultations.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">{c.patientName}</td>
                      <td className="py-3 px-4 font-mono">{formatMoney(c.consultationFeeDzd, 'DZD')}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-300">{formatMoney(c.copayAmountDzd, 'DZD')}</td>
                      <td className="py-3 px-4 font-mono text-teal-600 dark:text-teal-400 font-semibold">{formatMoney(c.insuranceShareDzd, 'DZD')}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {c.isPaid ? 'Réglé' : 'En Attente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => showToast('Reçu fiscal de consultation imprimé', 'success')}
                          className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 text-[11px] font-medium cursor-pointer"
                        >
                          Reçu
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Patient Wizard */}
      {isPatientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-teal-600" />
                <span>Nouveau Dossier Médical Patient (EHR)</span>
              </h2>
              <button
                onClick={() => setIsPatientModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Nom & Prénom du Patient *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="Ex: Yacine Belkacemi"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Numéro de Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    placeholder="0555 12 34 56"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Date de Naissance
                  </label>
                  <input
                    type="date"
                    value={newPatientDob}
                    onChange={(e) => setNewPatientDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">Genre</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Male">Homme</option>
                    <option value="Female">Femme</option>
                    <option value="Other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">Groupe Sanguin</label>
                  <select
                    value={newPatientBlood}
                    onChange={(e) => setNewPatientBlood(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-bold text-rose-600"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Allergies Connues (séparées par une virgule)
                  </label>
                  <input
                    type="text"
                    value={newPatientAllergies}
                    onChange={(e) => setNewPatientAllergies(e.target.value)}
                    placeholder="Pénicilline, AINS, Pollen..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                    Antécédents / Pathologies Chroniques
                  </label>
                  <input
                    type="text"
                    value={newPatientChronic}
                    onChange={(e) => setNewPatientChronic(e.target.value)}
                    placeholder="Diabète, HTA, Asthme..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPatientModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  Enregistrer le Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Consultation */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Stethoscope size={18} className="text-teal-600" />
                <span>Ouvrir une Consultation Médicale</span>
              </h2>
              <button
                onClick={() => setIsConsultationModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConsultation} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Sélectionner le Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                >
                  <option value="">-- Choisir un patient dans le dossier --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phone}) - Grp: {p.bloodGroup || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Motif de Consultation / Symptômes
                </label>
                <input
                  type="text"
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Ex: Douleurs abdominales, fièvre à 38.5°C"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Tension (TA)
                  </label>
                  <input
                    type="text"
                    value={bpValue}
                    onChange={(e) => setBpValue(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Température (°C)
                  </label>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="37.0"
                    className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Poids (Kg)
                  </label>
                  <input
                    type="text"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    placeholder="70"
                    className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Diagnostic Provisoire / Notes
                </label>
                <textarea
                  rows={2}
                  value={diagnosisValue}
                  onChange={(e) => setDiagnosisValue(e.target.value)}
                  placeholder="Examen clinique, hypothèses et conduite à tenir..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsConsultationModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  Valider l'Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Prescription */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Pill size={18} className="text-teal-600" />
                <span>Rédiger une Ordonnance Médicale</span>
              </h2>
              <button
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
              <div className="font-bold text-neutral-900 dark:text-white">
                Patient: {activeConsultationForRx?.patientName || 'Patient Sélectionné'}
              </div>
              <div className="text-neutral-500">
                Diagnostic: {activeConsultationForRx?.diagnosis || 'Consultation courante'}
              </div>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Médicament & Posologie
                </label>
                <input
                  type="text"
                  placeholder="Ex: Paracétamol 1g - 1 cp 3x/jour pendant 5 jours"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 font-semibold mb-1">
                  Consignes Particulières / Examens Complémentaires
                </label>
                <textarea
                  rows={2}
                  placeholder="FNS, CRP et contrôle dans 7 jours si persistance des symptômes."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                QR Hash: MED-{Date.now().toString().slice(-6)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrescriptionModalOpen(false);
                    showToast('Ordonnance signée et ajoutée au dossier patient', 'success');
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  Signer & Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
