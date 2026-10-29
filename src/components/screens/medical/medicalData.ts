import { useState, useEffect } from 'react';
import {
  MedicalPatient,
  MedicalConsultation,
  MedicalPrescription,
  MedicalPractitioner,
  DoctorOrdonnanceConfig,
  MedicalAppointmentSlot,
  MedicalLabRecord,
  MedicalCertificateRecord,
  ChifaClaimRecord,
  ClinicConsumableItem,
  DailyCashClosure,
} from '../../../types';

export const INITIAL_PRACTITIONERS: MedicalPractitioner[] = [
  {
    id: 'doc_01',
    fullName: 'Dr. Amine Benali',
    specialty: 'Cardiologie & Vasculaire',
    department: 'Médecine Spécialisée',
    licenseNumber: 'OM-ALG-16-04921',
    roomNumber: 'Cabinet 1',
    phone: '0550 11 22 33',
    email: 'dr.benali@atrium-polyclinic.dz',
    commissionRatePercent: 75,
    color: '#0D9488', // Emerald/Teal
    isAvailable: true,
  },
  {
    id: 'doc_02',
    fullName: 'Dr. Samia Mansouri',
    specialty: 'Pédiatrie & Néonatologie',
    department: 'Pédiatrie',
    licenseNumber: 'OM-ALG-16-07812',
    roomNumber: 'Cabinet 2',
    phone: '0555 33 44 55',
    email: 'dr.mansouri@atrium-polyclinic.dz',
    commissionRatePercent: 70,
    color: '#C4785A', // Terracotta
    isAvailable: true,
  },
  {
    id: 'doc_03',
    fullName: 'Dr. Karim Haddad',
    specialty: 'Médecine Générale & Urgences',
    department: 'Médecine Générale',
    licenseNumber: 'OM-ALG-16-01289',
    roomNumber: 'Cabinet 3',
    phone: '0661 77 88 99',
    email: 'dr.haddad@atrium-polyclinic.dz',
    commissionRatePercent: 70,
    color: '#2563EB', // Cobalt
    isAvailable: true,
  },
  {
    id: 'doc_04',
    fullName: 'Dr. Leïla Cherif',
    specialty: 'Gynécologie & Obstétrique',
    department: 'Santé de la Femme',
    licenseNumber: 'OM-ALG-16-08341',
    roomNumber: 'Cabinet 4',
    phone: '0770 44 55 66',
    email: 'dr.cherif@atrium-polyclinic.dz',
    commissionRatePercent: 75,
    color: '#9333EA', // Purple
    isAvailable: true,
  },
  {
    id: 'doc_05',
    fullName: 'Dr. Mourad Slimani',
    specialty: 'Gastro-entérologie & Hépatologie',
    department: 'Médecine Interne',
    licenseNumber: 'OM-ALG-16-05623',
    roomNumber: 'Cabinet 5',
    phone: '0560 88 99 00',
    email: 'dr.slimani@atrium-polyclinic.dz',
    commissionRatePercent: 70,
    color: '#D97706', // Amber
    isAvailable: false,
  },
];

export const DEFAULT_ORDONNANCE_CONFIGS: Record<string, DoctorOrdonnanceConfig> = {
  doc_01: {
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    specialtyTitle: 'Spécialiste en Cardiologie & Maladies Vasculaires',
    academicCredentials: 'Ancien Chef de Clinique · Diplômé de la Faculté de Médecine d\'Alger',
    licenseNumber: 'N° d\'Ordre: 16/04921',
    cabinetPhone: 'Tél: 023 45 67 89 / 0550 11 22 33',
    emergencyPhone: 'Urgences: 0550 11 22 00',
    clinicAddress: 'Polyclinique El-Chifa, 14 Rue Didouche Mourad, Alger',
    paperFormat: 'A5',
    printMode: 'full_digital',
    themeAccent: 'emerald',
    showWatermark: true,
    footerConsultationHours: 'Consultations: Du Samedi au Mercredi de 09h00 à 16h30 (Sur RDV)',
    footerLegalNotice: 'Ne pas dépasser la posologie prescrite · Ordonnance valable 3 mois',
    digitalStampText: 'Dr. Amine BENALI\nSpécialiste en Cardiologie\nOrdre N° 16/04921',
    isStampEnabled: true,
  },
  doc_02: {
    doctorId: 'doc_02',
    doctorName: 'Dr. Samia Mansouri',
    specialtyTitle: 'Spécialiste en Pédiatrie & Suivi du Nourrisson',
    academicCredentials: 'Ancienne Interne des Hôpitaux · DU Nutrition Pédiatrique',
    licenseNumber: 'N° d\'Ordre: 16/07812',
    cabinetPhone: 'Tél: 023 45 67 88 / 0555 33 44 55',
    emergencyPhone: 'Urgences Pédiatriques: 0555 33 44 00',
    clinicAddress: 'Polyclinique El-Chifa, 14 Rue Didouche Mourad, Alger',
    paperFormat: 'A5',
    printMode: 'full_digital',
    themeAccent: 'terracotta',
    showWatermark: true,
    footerConsultationHours: 'Du Samedi au Jeudi de 08h30 à 15h00',
    footerLegalNotice: 'Présenter le carnet de santé à chaque consultation',
    digitalStampText: 'Dr. Samia MANSOURI\nPédiatre · Suivi Néonatal\nOrdre N° 16/07812',
    isStampEnabled: true,
  },
  doc_03: {
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    specialtyTitle: 'Médecin Généraliste & Soins d\'Urgence',
    academicCredentials: 'Diplômé en Médecine Générale · Certifié Urgences Médicales',
    licenseNumber: 'N° d\'Ordre: 16/01289',
    cabinetPhone: 'Tél: 023 45 67 80 / 0661 77 88 99',
    emergencyPhone: 'Garde 24/7: 023 45 67 00',
    clinicAddress: 'Polyclinique El-Chifa, 14 Rue Didouche Mourad, Alger',
    paperFormat: 'A5',
    printMode: 'full_digital',
    themeAccent: 'navy',
    showWatermark: true,
    footerConsultationHours: 'Consultations 6j/7: 08h00 - 18h00',
    footerLegalNotice: 'Ordonnance délivrée en conformité avec la réglementation CNAS',
    digitalStampText: 'Dr. Karim HADDAD\nMédecine Générale & Urgences\nOrdre N° 16/01289',
    isStampEnabled: true,
  },
};

export const INITIAL_PATIENTS: MedicalPatient[] = [
  {
    id: 'pat_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_01',
    fullName: 'Yacine Belkacemi',
    nationalId: '19881601002345',
    phone: '0555 12 34 56',
    gender: 'Male',
    dateOfBirth: '1988-06-14',
    bloodGroup: 'O+',
    allergies: ['Pénicilline', 'Aspirine'],
    chronicConditions: ['Hypertension artérielle (HTA)'],
    chifaCardNumber: 'CHIFA-16-880614-01',
    socialSecurityNumber: '881601002345 12',
    hasChifa100PercentAld: false,
    emergencyContact: 'Fatima Belkacemi (Épouse)',
    emergencyPhone: '0555 98 76 54',
    notes: 'Patient régulier. Surveillance tensionnelle mensuelle requise.',
    vitalsHistory: [
      { date: '2026-03-12', systolic: 160, diastolic: 100, pulseBpm: 88, tempCelsius: 37.0, weightKg: 85, bloodSugarMgDl: 115, spO2Percent: 97 },
      { date: '2026-04-10', systolic: 148, diastolic: 92, pulseBpm: 82, tempCelsius: 36.9, weightKg: 84.5, bloodSugarMgDl: 110, spO2Percent: 98 },
      { date: '2026-05-10', systolic: 135, diastolic: 85, pulseBpm: 76, tempCelsius: 36.8, weightKg: 83.8, bloodSugarMgDl: 105, spO2Percent: 99 },
    ],
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'pat_02',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_03',
    fullName: 'Meriem Haddad',
    nationalId: '19951604005678',
    phone: '0661 45 78 90',
    gender: 'Female',
    dateOfBirth: '1995-11-20',
    bloodGroup: 'A+',
    allergies: [],
    chronicConditions: ['Diabète Type 2 (ALD)'],
    chifaCardNumber: 'CHIFA-16-951120-02',
    socialSecurityNumber: '951604005678 44',
    hasChifa100PercentAld: true, // 100% ALD Exoneration
    emergencyContact: 'Karim Haddad (Frère)',
    emergencyPhone: '0661 11 22 33',
    notes: 'Prise en charge à 100% ALD CNAS. Suivi glycémique et HbA1c trimestriel.',
    vitalsHistory: [
      { date: '2026-02-14', systolic: 125, diastolic: 78, pulseBpm: 72, tempCelsius: 36.7, weightKg: 66, bloodSugarMgDl: 155, spO2Percent: 99 },
      { date: '2026-04-02', systolic: 120, diastolic: 76, pulseBpm: 74, tempCelsius: 36.8, weightKg: 65.5, bloodSugarMgDl: 142, spO2Percent: 98 },
      { date: '2026-05-10', systolic: 118, diastolic: 74, pulseBpm: 70, tempCelsius: 36.7, weightKg: 64.8, bloodSugarMgDl: 128, spO2Percent: 99 },
    ],
    createdAt: '2026-02-01T10:30:00Z',
  },
  {
    id: 'pat_03',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_03',
    fullName: 'Ahmed Ziane',
    nationalId: '19741603009988',
    phone: '0770 33 44 55',
    gender: 'Male',
    dateOfBirth: '1974-03-08',
    bloodGroup: 'B+',
    allergies: ['Sulfamides'],
    chronicConditions: ['Asthme bronchique modéré'],
    chifaCardNumber: 'CHIFA-16-740308-03',
    socialSecurityNumber: '741603009988 78',
    hasChifa100PercentAld: false,
    emergencyContact: 'Samia Ziane',
    emergencyPhone: '0770 99 88 77',
    notes: 'Traitement de fond par bronchodilatateur et corticoïde inhalé.',
    vitalsHistory: [
      { date: '2026-01-20', systolic: 130, diastolic: 82, pulseBpm: 80, tempCelsius: 37.1, weightKg: 78, bloodSugarMgDl: 98, spO2Percent: 95 },
      { date: '2026-05-08', systolic: 128, diastolic: 80, pulseBpm: 76, tempCelsius: 36.9, weightKg: 77.5, bloodSugarMgDl: 94, spO2Percent: 97 },
    ],
    createdAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'pat_04',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_02',
    fullName: 'Rayane Bensemra',
    nationalId: '20211605001234',
    phone: '0560 22 33 44',
    gender: 'Male',
    dateOfBirth: '2021-04-15',
    bloodGroup: 'O+',
    allergies: [],
    chronicConditions: [],
    chifaCardNumber: 'CHIFA-16-890204-P4', // Ayant droit père
    socialSecurityNumber: '890204001234 19',
    hasChifa100PercentAld: false,
    emergencyContact: 'Nadia Bensemra (Mère)',
    emergencyPhone: '0560 22 33 44',
    notes: 'Enfant de 5 ans. Calendrier vaccinal à jour. Suivi de croissance régulier.',
    vitalsHistory: [
      { date: '2026-03-01', systolic: 95, diastolic: 60, pulseBpm: 98, tempCelsius: 37.2, weightKg: 18.2, spO2Percent: 99 },
      { date: '2026-05-10', systolic: 98, diastolic: 62, pulseBpm: 95, tempCelsius: 38.4, weightKg: 18.5, spO2Percent: 98 },
    ],
    createdAt: '2026-03-01T08:30:00Z',
  },
  {
    id: 'pat_05',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_04',
    fullName: 'Khadidja Kaci',
    nationalId: '19921602008765',
    phone: '0671 99 88 11',
    gender: 'Female',
    dateOfBirth: '1992-09-18',
    bloodGroup: 'AB+',
    allergies: ['Iode'],
    chronicConditions: ['Grossesse 28 SA'],
    chifaCardNumber: 'CHIFA-16-920918-05',
    socialSecurityNumber: '921602008765 31',
    hasChifa100PercentAld: true, // Maternité prise en charge 100%
    emergencyContact: 'Sofiane Kaci (Époux)',
    emergencyPhone: '0671 00 11 22',
    notes: 'Suivi prénatal 3ème trimestre. Échographie morphologique normale.',
    vitalsHistory: [
      { date: '2026-02-10', systolic: 110, diastolic: 70, pulseBpm: 76, tempCelsius: 36.6, weightKg: 62, bloodSugarMgDl: 85, spO2Percent: 99 },
      { date: '2026-04-15', systolic: 115, diastolic: 72, pulseBpm: 80, tempCelsius: 36.7, weightKg: 66, bloodSugarMgDl: 88, spO2Percent: 99 },
    ],
    createdAt: '2026-02-10T14:00:00Z',
  },
];

export const INITIAL_CONSULTATIONS: MedicalConsultation[] = [
  {
    id: 'cons_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    doctorSpecialty: 'Cardiologie & Vasculaire',
    cabinetRoom: 'Cabinet 1',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    patientAge: 38,
    consultationDate: '2026-05-10T09:30:00Z',
    chiefComplaint: 'Palpitations et céphalées occipitales au réveil',
    vitals: {
      bloodPressure: '145/90',
      temperatureCelsius: 36.9,
      heartRateBpm: 82,
      weightKg: 84,
      heightCm: 178,
      bmi: 26.5,
      bloodSugarMgDl: 108,
      spO2Percent: 98,
    },
    clinicalExam: 'Bruits du cœur réguliers sans souffle. Pas d\'œdème des membres inférieurs. ECG: Rythme sinusal régulier.',
    diagnosis: 'Poussée d\'hypertension artérielle essentielle sous traitement',
    treatmentPlan: 'Renforcement hygiéno-diététique, ajout d\'un inhibiteur calcique et bilan rénal de contrôle.',
    status: 'InConsultation',
    urgencyLevel: 'Prioritaire',
    ticketNumber: 'T-101',
    ngapCode: 'CS',
    consultationFeeDzd: 3500,
    copayAmountDzd: 700,
    insuranceShareDzd: 2800,
    isPaid: false,
    paymentMethod: 'Cash',
    notes: 'Patient orienté par la médecine du travail.',
    createdAt: '2026-05-10T09:00:00Z',
  },
  {
    id: 'cons_02',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    doctorSpecialty: 'Médecine Générale',
    cabinetRoom: 'Cabinet 3',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    patientAge: 31,
    consultationDate: '2026-05-10T10:15:00Z',
    chiefComplaint: 'Renouvellement ordonnance ALD et contrôle HbA1c',
    vitals: {
      bloodPressure: '118/74',
      temperatureCelsius: 36.7,
      heartRateBpm: 70,
      weightKg: 64.8,
      heightCm: 164,
      bmi: 24.1,
      bloodSugarMgDl: 128,
      spO2Percent: 99,
    },
    clinicalExam: 'Examen des pieds normal (sensibilité conservée au monofilament). Pas d\'acanthosis nigricans.',
    diagnosis: 'Diabète Type 2 bien équilibré sous bithérapie orale',
    treatmentPlan: 'Renouvellement ordonnance 3 mois. Bilan biologique de surveillance.',
    status: 'Completed',
    urgencyLevel: 'Normal',
    ticketNumber: 'T-102',
    ngapCode: 'C',
    consultationFeeDzd: 2500,
    copayAmountDzd: 0, // Exonération ALD 100%
    insuranceShareDzd: 2500,
    isPaid: true,
    paymentMethod: 'ChifaDirect',
    notes: 'Télétransmission Chifa effectuée avec succès.',
    createdAt: '2026-05-10T09:45:00Z',
  },
  {
    id: 'cons_03',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_02',
    doctorName: 'Dr. Samia Mansouri',
    doctorSpecialty: 'Pédiatrie',
    cabinetRoom: 'Cabinet 2',
    patientId: 'pat_04',
    patientName: 'Rayane Bensemra',
    patientAge: 5,
    consultationDate: '2026-05-10T11:00:00Z',
    chiefComplaint: 'Fièvre à 38.5°C et toux quinteuse depuis 48 heures',
    vitals: {
      bloodPressure: '98/62',
      temperatureCelsius: 38.4,
      heartRateBpm: 95,
      weightKg: 18.5,
      heightCm: 110,
      bmi: 15.3,
      spO2Percent: 98,
    },
    clinicalExam: 'Gorge hyperhémiée sans exsudat, tympans congestifs bilatéraux sans bombement, auscultation pulmonaire libre.',
    diagnosis: 'Rhinopharyngite virale aiguë fébrile de l\'enfant',
    treatmentPlan: 'Paracétamol adapté au poids, lavage de nez au sérum physiologique, hydratation abondante.',
    status: 'InWaitingQueue',
    urgencyLevel: 'Urgence',
    ticketNumber: 'T-103',
    ngapCode: 'CS',
    consultationFeeDzd: 3000,
    copayAmountDzd: 600,
    insuranceShareDzd: 2400,
    isPaid: false,
    paymentMethod: 'Cash',
    notes: 'Surveiller la tolérance de la fièvre.',
    createdAt: '2026-05-10T10:30:00Z',
  },
  {
    id: 'cons_04',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    doctorSpecialty: 'Médecine Générale',
    cabinetRoom: 'Cabinet 3',
    patientId: 'pat_03',
    patientName: 'Ahmed Ziane',
    patientAge: 52,
    consultationDate: '2026-05-10T11:30:00Z',
    chiefComplaint: 'Douleurs lombaires aiguës après effort de soulèvement au travail',
    vitals: {
      bloodPressure: '130/80',
      temperatureCelsius: 36.8,
      heartRateBpm: 76,
      weightKg: 77.5,
      heightCm: 175,
      bmi: 25.3,
      spO2Percent: 98,
    },
    clinicalExam: 'Contracture des muscles paravertébraux lombaires, Lasègue bilatéral négatif, pas de déficit moteur.',
    diagnosis: 'Lumbago aigu d\'origine mécanique',
    treatmentPlan: 'Repos relatif, antalgiques palier I, myorelaxant, arrêt de travail de 5 jours.',
    status: 'InWaitingQueue',
    urgencyLevel: 'Normal',
    ticketNumber: 'T-104',
    ngapCode: 'C',
    consultationFeeDzd: 2500,
    copayAmountDzd: 500,
    insuranceShareDzd: 2000,
    isPaid: false,
    paymentMethod: 'Cash',
    notes: 'Délivrance certificat arrêt de travail.',
    createdAt: '2026-05-10T10:50:00Z',
  },
];

export const INITIAL_APPOINTMENTS: MedicalAppointmentSlot[] = [
  {
    id: 'apt_01',
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    patientPhone: '0555 12 34 56',
    date: '2026-05-10',
    startTime: '09:30',
    durationMinutes: 30,
    reason: 'Contrôle Cardiologique & ECG',
    status: 'InRoom',
    urgency: 'Prioritaire',
  },
  {
    id: 'apt_02',
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    patientName: 'Omar Benyahia',
    patientPhone: '0662 33 22 11',
    date: '2026-05-10',
    startTime: '10:30',
    durationMinutes: 30,
    reason: 'Échocardiographie de contrôle',
    status: 'Booked',
    urgency: 'Normal',
  },
  {
    id: 'apt_03',
    doctorId: 'doc_02',
    doctorName: 'Dr. Samia Mansouri',
    patientId: 'pat_04',
    patientName: 'Rayane Bensemra',
    patientPhone: '0560 22 33 44',
    date: '2026-05-10',
    startTime: '11:00',
    durationMinutes: 30,
    reason: 'Fièvre enfant & consultation pédiatrique',
    status: 'Arrived',
    urgency: 'Prioritaire',
  },
  {
    id: 'apt_04',
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    patientPhone: '0661 45 78 90',
    date: '2026-05-10',
    startTime: '10:15',
    durationMinutes: 15,
    reason: 'Renouvellement ordonnance ALD',
    status: 'Completed',
    urgency: 'Normal',
  },
  {
    id: 'apt_05',
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    patientId: 'pat_03',
    patientName: 'Ahmed Ziane',
    patientPhone: '0770 33 44 55',
    date: '2026-05-10',
    startTime: '11:30',
    durationMinutes: 30,
    reason: 'Lumbago & certificat médical',
    status: 'Arrived',
    urgency: 'Normal',
  },
  {
    id: 'apt_06',
    doctorId: 'doc_04',
    doctorName: 'Dr. Leïla Cherif',
    patientId: 'pat_05',
    patientName: 'Khadidja Kaci',
    patientPhone: '0671 99 88 11',
    date: '2026-05-10',
    startTime: '14:00',
    durationMinutes: 30,
    reason: 'Consultation prénatale 28 SA',
    status: 'Booked',
    urgency: 'Normal',
  },
];

export const INITIAL_PRESCRIPTIONS: MedicalPrescription[] = [
  {
    id: 'rx_01',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    doctorSpecialty: 'Médecine Générale',
    consultationId: 'cons_02',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    patientAge: 31,
    prescriptionDate: '2026-05-10',
    items: [
      {
        drugName: 'Metformine 850mg',
        form: 'Comprimé pelliculé',
        dosage: '850mg',
        frequency: '1 comprimé 2 fois par jour au milieu des repas',
        durationDays: 90,
        instructions: 'Traitement de fond continu.',
      },
      {
        drugName: 'Gliclazide 30mg',
        form: 'Comprimé à libération modifiée',
        dosage: '30mg',
        frequency: '1 comprimé le matin au petit déjeuner',
        durationDays: 90,
        instructions: 'Surveiller les signes d\'hypoglycémie.',
      },
      {
        drugName: 'Bandelettes glycémie réactives',
        form: 'Boîte de 50 bandelettes',
        dosage: '1 boîte',
        frequency: 'Autosurveillance 3 fois par semaine',
        durationDays: 90,
      },
    ],
    qrCodeHash: 'MED-RX-2026-0921-CHIFA',
    isSigned: true,
    doctorConfig: DEFAULT_ORDONNANCE_CONFIGS['doc_03'],
    notes: 'Prise en charge intégrale à 100% ALD CNAS. Renouvelable 1 fois.',
    createdAt: '2026-05-10T10:30:00Z',
  },
  {
    id: 'rx_02',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    branchId: 'branch_medical_main',
    staffId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    doctorSpecialty: 'Cardiologie & Vasculaire',
    consultationId: 'cons_01',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    patientAge: 38,
    prescriptionDate: '2026-05-10',
    items: [
      {
        drugName: 'Amlodipine 5mg',
        form: 'Gélule',
        dosage: '5mg',
        frequency: '1 gélule le matin',
        durationDays: 30,
        instructions: 'Prendre à heure fixe.',
      },
      {
        drugName: 'Périndopril 5mg',
        form: 'Comprimé sécable',
        dosage: '5mg',
        frequency: '1 comprimé le matin',
        durationDays: 30,
        instructions: 'Surveillance tensionnelle biquotidienne.',
      },
    ],
    qrCodeHash: 'MED-RX-2026-0922-CARDIO',
    isSigned: true,
    doctorConfig: DEFAULT_ORDONNANCE_CONFIGS['doc_01'],
    notes: 'Attention: Patient allergique à l\'Aspirine et Pénicilline.',
    createdAt: '2026-05-10T09:45:00Z',
  },
];

export const INITIAL_LAB_RECORDS: MedicalLabRecord[] = [
  {
    id: 'lab_01',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    testCategory: 'Biochimie Sanguine',
    date: '2026-05-08',
    status: 'Validé',
    parameters: [
      { name: 'Glycémie à jeun', value: '1.05', unit: 'g/L', min: 0.70, max: 1.10, isAbnormal: false, status: 'normal' },
      { name: 'Créatinine sérique', value: '10.2', unit: 'mg/L', min: 7.0, max: 12.0, isAbnormal: false, status: 'normal' },
      { name: 'Urée sanguine', value: '0.35', unit: 'g/L', min: 0.15, max: 0.45, isAbnormal: false, status: 'normal' },
      { name: 'Clairance MDRD', value: '94', unit: 'mL/min', min: 90, max: 120, isAbnormal: false, status: 'normal' },
    ],
    clinicalConclusion: 'Fonction rénale normale. Absence de retentissement rénal de l\'HTA.',
  },
  {
    id: 'lab_02',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    testCategory: 'Biochimie Sanguine',
    date: '2026-05-05',
    status: 'Validé',
    parameters: [
      { name: 'Hémoglobine glyquée (HbA1c)', value: '7.1', unit: '%', min: 4.0, max: 6.5, isAbnormal: true, status: 'high' },
      { name: 'Glycémie à jeun', value: '1.28', unit: 'g/L', min: 0.70, max: 1.10, isAbnormal: true, status: 'high' },
      { name: 'Cholestérol Total', value: '1.95', unit: 'g/L', min: 1.50, max: 2.00, isAbnormal: false, status: 'normal' },
      { name: 'Triglycérides', value: '1.40', unit: 'g/L', min: 0.50, max: 1.50, isAbnormal: false, status: 'normal' },
      { name: 'Microalbuminurie', value: '14', unit: 'mg/24h', min: 0, max: 30, isAbnormal: false, status: 'normal' },
    ],
    clinicalConclusion: 'HbA1c à 7.1% en nette amélioration (précédent: 7.8%). Absence de microalbuminurie.',
  },
  {
    id: 'lab_03',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    testCategory: 'Imagerie & Échographie',
    date: '2026-04-12',
    status: 'Validé',
    parameters: [
      { name: 'Fraction d\'Éjection VG', value: '62', unit: '%', min: 55, max: 70, isAbnormal: false, status: 'normal' },
      { name: 'Épaisseur Septum Interventriculaire', value: '11.5', unit: 'mm', min: 6.0, max: 11.0, isAbnormal: true, status: 'high' },
    ],
    clinicalConclusion: 'Échocardiographie-Doppler: Hypertrophie ventriculaire gauche débutante concentrique. Fonction systolique conservée.',
    imagingReport: 'Ventricule gauche non dilaté. Cinétique globale et segmentaire conservée. Oreillette gauche de taille normale.',
    imagingModality: 'Échographie Doppler',
  },
];

export const INITIAL_CERTIFICATES: MedicalCertificateRecord[] = [
  {
    id: 'cert_01',
    certificateType: 'ArretDeTravail',
    patientId: 'pat_03',
    patientName: 'Ahmed Ziane',
    patientDob: '1974-03-08',
    patientAddress: 'El Madania, Alger',
    patientEmployer: 'Société Nationale de Travaux Publics',
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    doctorSpecialty: 'Médecine Générale',
    issueDate: '2026-05-10',
    startDate: '2026-05-10',
    endDate: '2026-05-14',
    durationDays: 5,
    resumptionDate: '2026-05-17', // Reprise dimanche
    clinicalFindings: 'Lumbago aigu d\'effort avec contracture musculaire paravertébrale intense nécessitant repos strict.',
    qrHash: 'CERT-ARRET-2026-0041-CNAS',
    isSigned: true,
  },
  {
    id: 'cert_02',
    certificateType: 'AptitudePhysique',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    patientDob: '1988-06-14',
    doctorId: 'doc_01',
    doctorName: 'Dr. Amine Benali',
    doctorSpecialty: 'Cardiologie & Vasculaire',
    issueDate: '2026-05-02',
    purpose: 'Pratique du Football en Loisir',
    clinicalFindings: 'Examen clinique cardiopulmonaire normal au repos. ECG normal. Absence de contre-indication médicale apparente.',
    qrHash: 'CERT-APT-2026-0089',
    isSigned: true,
  },
  {
    id: 'cert_03',
    certificateType: 'LettreOrientation',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    patientDob: '1995-11-20',
    doctorId: 'doc_03',
    doctorName: 'Dr. Karim Haddad',
    doctorSpecialty: 'Médecine Générale',
    issueDate: '2026-05-10',
    purpose: 'Examen du Fond d\'Œil Annuel (Rétinopathie Diabétique)',
    clinicalFindings: 'Patiente diabétique de type 2 suivie depuis 4 ans, HbA1c 7.1%. Merci de bien vouloir réaliser un fond d\'œil de contrôle annuel.',
    qrHash: 'LETTRE-CONF-2026-0012',
    isSigned: true,
  },
];

export const INITIAL_CHIFA_CLAIMS: ChifaClaimRecord[] = [
  {
    id: 'chifa_01',
    claimNumber: 'CF-2026-05-001',
    consultationId: 'cons_02',
    patientId: 'pat_02',
    patientName: 'Meriem Haddad',
    chifaNumber: 'CHIFA-16-951120-02',
    socialSecurityNumber: '951604005678 44',
    ngapCode: 'C',
    totalAmountDzd: 2500,
    chifaCoveragePercent: 100, // 100% ALD
    chifaShareDzd: 2500,
    copayPaidDzd: 0,
    claimDate: '2026-05-10',
    status: 'Submitted',
    batchNumber: 'LOT-CNAS-2026-W19',
  },
  {
    id: 'chifa_02',
    claimNumber: 'CF-2026-05-002',
    consultationId: 'cons_01',
    patientId: 'pat_01',
    patientName: 'Yacine Belkacemi',
    chifaNumber: 'CHIFA-16-880614-01',
    socialSecurityNumber: '881601002345 12',
    ngapCode: 'CS',
    totalAmountDzd: 3500,
    chifaCoveragePercent: 80, // 80% Convention standard
    chifaShareDzd: 2800,
    copayPaidDzd: 700,
    claimDate: '2026-05-10',
    status: 'Pending',
    batchNumber: 'LOT-CNAS-2026-W19',
  },
];

export const INITIAL_CONSUMABLES: ClinicConsumableItem[] = [
  { id: 'c_01', name: 'Seringues stériles 5ml à usage unique', category: 'Injection', currentStock: 240, minStockAlert: 50, unit: 'Unités', unitCostDzd: 25 },
  { id: 'c_02', name: 'Gants d\'examen stériles (Boîte de 100)', category: 'Hygiène & Protection', currentStock: 18, minStockAlert: 5, unit: 'Boîtes', unitCostDzd: 1200 },
  { id: 'c_03', name: 'Sérum physiologique 0.9% 500ml', category: 'Injection', currentStock: 45, minStockAlert: 15, unit: 'Flacons', unitCostDzd: 150 },
  { id: 'c_04', name: 'Kit de suture stérile jetable', category: 'Pansement & Suture', currentStock: 32, minStockAlert: 10, unit: 'Kits', unitCostDzd: 650 },
  { id: 'c_05', name: 'Électrodes adhésives ECG (Paquet 50)', category: 'Diagnostics Rapides', currentStock: 14, minStockAlert: 4, unit: 'Paquets', unitCostDzd: 850 },
  { id: 'c_06', name: 'Gel échographique hypoallergénique 5L', category: 'Diagnostics Rapides', currentStock: 6, minStockAlert: 2, unit: 'Bidons', unitCostDzd: 2200 },
];

export const INITIAL_CASH_CLOSURES: DailyCashClosure[] = [
  {
    id: 'close_01',
    date: '2026-05-09',
    closedByStaffName: 'Nassima (Réceptionniste en chef)',
    openingCashFloatDzd: 15000,
    totalCashCollectedDzd: 42500,
    totalBaridiMobDzd: 12000,
    totalChifaVouchersDzd: 68500,
    actualCashInDrawerDzd: 57500, // 15000 + 42500
    discrepancyDzd: 0,
    notes: 'Caisse équilibrée. Tous les bordereaux Chifa ont été vérifiés.',
    isClosed: true,
  },
];

export const useMedicalData = () => {
  const [practitioners, setPractitioners] = useState<MedicalPractitioner[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_practitioners_v2');
      return saved ? JSON.parse(saved) : INITIAL_PRACTITIONERS;
    } catch {
      return INITIAL_PRACTITIONERS;
    }
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  const [doctorConfigs, setDoctorConfigs] = useState<Record<string, DoctorOrdonnanceConfig>>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_doctor_configs_v2');
      return saved ? JSON.parse(saved) : DEFAULT_ORDONNANCE_CONFIGS;
    } catch {
      return DEFAULT_ORDONNANCE_CONFIGS;
    }
  });

  const [patients, setPatients] = useState<MedicalPatient[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_patients_v2');
      return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [consultations, setConsultations] = useState<MedicalConsultation[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_consultations_v2');
      return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
    } catch {
      return INITIAL_CONSULTATIONS;
    }
  });

  const [appointments, setAppointments] = useState<MedicalAppointmentSlot[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_appointments_v2');
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_prescriptions_v2');
      return saved ? JSON.parse(saved) : INITIAL_PRESCRIPTIONS;
    } catch {
      return INITIAL_PRESCRIPTIONS;
    }
  });

  const [labRecords, setLabRecords] = useState<MedicalLabRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_labs_v2');
      return saved ? JSON.parse(saved) : INITIAL_LAB_RECORDS;
    } catch {
      return INITIAL_LAB_RECORDS;
    }
  });

  const [certificates, setCertificates] = useState<MedicalCertificateRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_certificates_v2');
      return saved ? JSON.parse(saved) : INITIAL_CERTIFICATES;
    } catch {
      return INITIAL_CERTIFICATES;
    }
  });

  const [chifaClaims, setChifaClaims] = useState<ChifaClaimRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_chifa_v2');
      return saved ? JSON.parse(saved) : INITIAL_CHIFA_CLAIMS;
    } catch {
      return INITIAL_CHIFA_CLAIMS;
    }
  });

  const [consumables, setConsumables] = useState<ClinicConsumableItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_consumables_v2');
      return saved ? JSON.parse(saved) : INITIAL_CONSUMABLES;
    } catch {
      return INITIAL_CONSUMABLES;
    }
  });

  const [cashClosures, setCashClosures] = useState<DailyCashClosure[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_cash_closures_v2');
      return saved ? JSON.parse(saved) : INITIAL_CASH_CLOSURES;
    } catch {
      return INITIAL_CASH_CLOSURES;
    }
  });

  // Persistent storage effects
  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_practitioners_v2', JSON.stringify(practitioners));
    } catch {}
  }, [practitioners]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_doctor_configs_v2', JSON.stringify(doctorConfigs));
    } catch {}
  }, [doctorConfigs]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_patients_v2', JSON.stringify(patients));
    } catch {}
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_consultations_v2', JSON.stringify(consultations));
    } catch {}
  }, [consultations]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_appointments_v2', JSON.stringify(appointments));
    } catch {}
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_prescriptions_v2', JSON.stringify(prescriptions));
    } catch {}
  }, [prescriptions]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_labs_v2', JSON.stringify(labRecords));
    } catch {}
  }, [labRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_certificates_v2', JSON.stringify(certificates));
    } catch {}
  }, [certificates]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_chifa_v2', JSON.stringify(chifaClaims));
    } catch {}
  }, [chifaClaims]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_consumables_v2', JSON.stringify(consumables));
    } catch {}
  }, [consumables]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_medical_cash_closures_v2', JSON.stringify(cashClosures));
    } catch {}
  }, [cashClosures]);

  // Actions
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

  const updateConsultationStatus = (id: string, status: MedicalConsultation['status']) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const markConsultationPaid = (id: string, method: 'Cash' | 'BaridiMob' | 'Card' | 'ChifaDirect' = 'Cash') => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPaid: true, paymentMethod: method } : c))
    );
  };

  const addAppointment = (apt: MedicalAppointmentSlot) => {
    setAppointments((prev) => [...prev, apt]);
  };

  const updateAppointmentStatus = (id: string, status: MedicalAppointmentSlot['status']) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const addPrescription = (rx: MedicalPrescription) => {
    setPrescriptions((prev) => [rx, ...prev]);
  };

  const saveDoctorConfig = (doctorId: string, config: DoctorOrdonnanceConfig) => {
    setDoctorConfigs((prev) => ({
      ...prev,
      [doctorId]: config,
    }));
  };

  const addCertificate = (cert: MedicalCertificateRecord) => {
    setCertificates((prev) => [cert, ...prev]);
  };

  const addLabRecord = (lab: MedicalLabRecord) => {
    setLabRecords((prev) => [lab, ...prev]);
  };

  const addChifaClaim = (claim: ChifaClaimRecord) => {
    setChifaClaims((prev) => [claim, ...prev]);
  };

  const addCashClosure = (closure: DailyCashClosure) => {
    setCashClosures((prev) => [closure, ...prev]);
  };

  const resetToDemoData = () => {
    setPractitioners(INITIAL_PRACTITIONERS);
    setDoctorConfigs(DEFAULT_ORDONNANCE_CONFIGS);
    setPatients(INITIAL_PATIENTS);
    setConsultations(INITIAL_CONSULTATIONS);
    setAppointments(INITIAL_APPOINTMENTS);
    setPrescriptions(INITIAL_PRESCRIPTIONS);
    setLabRecords(INITIAL_LAB_RECORDS);
    setCertificates(INITIAL_CERTIFICATES);
    setChifaClaims(INITIAL_CHIFA_CLAIMS);
    setConsumables(INITIAL_CONSUMABLES);
    setCashClosures(INITIAL_CASH_CLOSURES);
  };

  return {
    practitioners,
    selectedDoctorId,
    setSelectedDoctorId,
    doctorConfigs,
    saveDoctorConfig,
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    consultations,
    addConsultation,
    updateConsultationStatus,
    markConsultationPaid,
    appointments,
    addAppointment,
    updateAppointmentStatus,
    prescriptions,
    addPrescription,
    labRecords,
    addLabRecord,
    certificates,
    addCertificate,
    chifaClaims,
    addChifaClaim,
    consumables,
    cashClosures,
    dailyClosures: cashClosures,
    addCashClosure,
    addDailyClosure: addCashClosure,
    updateDoctorConfig: saveDoctorConfig,
    resetToDemoData,
  };
};
