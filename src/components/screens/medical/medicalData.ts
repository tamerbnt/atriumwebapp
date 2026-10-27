import { useState, useEffect } from 'react';
import { MedicalPatient, MedicalConsultation, MedicalPrescription } from '../../../types';

const INITIAL_PATIENTS: MedicalPatient[] = [
  {
    id: 'pat_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
];

const INITIAL_CONSULTATIONS: MedicalConsultation[] = [
  {
    id: 'cons_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
];

const INITIAL_PRESCRIPTIONS: MedicalPrescription[] = [
  {
    id: 'rx_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'staff_01',
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
];

export const useMedicalData = () => {
  const [patients, setPatients] = useState<MedicalPatient[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_patients');
      return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [consultations, setConsultations] = useState<MedicalConsultation[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_consultations');
      return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
    } catch {
      return INITIAL_CONSULTATIONS;
    }
  });

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_prescriptions');
      return saved ? JSON.parse(saved) : INITIAL_PRESCRIPTIONS;
    } catch {
      return INITIAL_PRESCRIPTIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_patients', JSON.stringify(patients));
    } catch {}
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_consultations', JSON.stringify(consultations));
    } catch {}
  }, [consultations]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_prescriptions', JSON.stringify(prescriptions));
    } catch {}
  }, [prescriptions]);

  const addPatient = (patient: MedicalPatient) => {
    setPatients((prev) => [patient, ...prev]);
  };

  const updatePatient = (updated: MedicalPatient) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const addConsultation = (cons: MedicalConsultation) => {
    setConsultations((prev) => [cons, ...prev]);
  };

  const addPrescription = (rx: MedicalPrescription) => {
    setPrescriptions((prev) => [rx, ...prev]);
  };

  const updateConsultationStatus = (id: string, status: MedicalConsultation['status']) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const markConsultationPaid = (id: string) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPaid: true } : c))
    );
  };

  return {
    patients,
    consultations,
    prescriptions,
    addPatient,
    updatePatient,
    deletePatient,
    addConsultation,
    addPrescription,
    updateConsultationStatus,
    markConsultationPaid,
  };
};

