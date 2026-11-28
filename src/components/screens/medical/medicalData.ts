import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  MedicalChifaBordereau,
  MedicalDoctorPayout,
} from '../../../types';
import {
  atriumActions,
  showToast,
  useAtriumSelector,
} from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import {
  cloneSnapshot,
  pickLocalizedText,
  registerUndoEntry,
} from '../../../services/undoEngine';
import {
  isSupabaseConfigured,
  medicalService,
  realtimeService,
  syncCoordinator,
  subscribeConcurrencyResolutions,
  runWithConcurrency,
} from '../../../lib/supabase/index';
import { isDemoModeEnabled } from '../../../lib/supabase/tenantContext';
import {
  NgapActDefinition,
  NGAP_ACT_DEFINITIONS,
  aggregatePractitionerTurnovers,
  buildChifaBordereauBatch,
  buildChifaSettlementScfDraft,
  buildDoctorPayoutScfDraft,
  consumeConsumableFefo,
  evaluateAppointmentConflict,
  getNgapActDefinition,
  restockConsumableLot,
} from '../../../utils/medicalDepth';

function mergeMedicalById<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  if (!remoteItems || remoteItems.length === 0) return localItems;
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  remoteItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

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
    color: '#d4522f', // Terracotta
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
  {
    id: 'c_01',
    itemCode: 'CON_02',
    name: 'Seringues stériles 5ml à usage unique',
    category: 'Injection',
    currentStock: 240,
    currentStockUnits: 240,
    minStockAlert: 50,
    reorderThresholdUnits: 50,
    unit: 'Unités',
    unitCostDzd: 25,
    lotNumber: 'LOT-SRG-26A',
    expiryDate: '2027-06-30',
    lots: [
      { lotNumber: 'LOT-SRG-26A', expiryDate: '2027-06-30', quantity: 140, receivedAt: '2026-01-15', unitCostDzd: 25 },
      { lotNumber: 'LOT-SRG-26B', expiryDate: '2027-12-31', quantity: 100, receivedAt: '2026-04-01', unitCostDzd: 25 },
    ],
  },
  {
    id: 'c_02',
    itemCode: 'CON_01',
    name: 'Gants d\'examen stériles (Boîte de 100)',
    category: 'Hygiène & Protection',
    currentStock: 18,
    currentStockUnits: 18,
    minStockAlert: 5,
    reorderThresholdUnits: 5,
    unit: 'Boîtes',
    unitCostDzd: 1200,
    lotNumber: 'LOT-GNT-26A',
    expiryDate: '2027-09-30',
    lots: [
      { lotNumber: 'LOT-GNT-26A', expiryDate: '2027-09-30', quantity: 18, receivedAt: '2026-02-10', unitCostDzd: 1200 },
    ],
  },
  {
    id: 'c_03',
    itemCode: 'CON_03',
    name: 'Sérum physiologique 0.9% 500ml',
    category: 'Injection',
    currentStock: 45,
    currentStockUnits: 45,
    minStockAlert: 15,
    reorderThresholdUnits: 15,
    unit: 'Flacons',
    unitCostDzd: 150,
    lotNumber: 'LOT-PHY-26C',
    expiryDate: '2027-04-15',
    lots: [
      { lotNumber: 'LOT-PHY-26C', expiryDate: '2027-04-15', quantity: 45, receivedAt: '2026-03-01', unitCostDzd: 150 },
    ],
  },
  {
    id: 'c_04',
    itemCode: 'CON_06',
    name: 'Kit de suture stérile jetable',
    category: 'Pansement & Suture',
    currentStock: 32,
    currentStockUnits: 32,
    minStockAlert: 10,
    reorderThresholdUnits: 10,
    unit: 'Kits',
    unitCostDzd: 650,
    lotNumber: 'LOT-SUT-26B',
    expiryDate: '2028-01-31',
    lots: [
      { lotNumber: 'LOT-SUT-26B', expiryDate: '2028-01-31', quantity: 32, receivedAt: '2026-02-20', unitCostDzd: 650 },
    ],
  },
  {
    id: 'c_05',
    itemCode: 'CON_04',
    name: 'Électrodes adhésives ECG (Paquet 50)',
    category: 'Diagnostics Rapides',
    currentStock: 14,
    currentStockUnits: 14,
    minStockAlert: 4,
    reorderThresholdUnits: 4,
    unit: 'Paquets',
    unitCostDzd: 850,
    lotNumber: 'LOT-ECG-26A',
    expiryDate: '2027-05-30',
    lots: [
      { lotNumber: 'LOT-ECG-26A', expiryDate: '2027-05-30', quantity: 14, receivedAt: '2026-01-25', unitCostDzd: 850 },
    ],
  },
  {
    id: 'c_06',
    itemCode: 'CON_05',
    name: 'Gel échographique hypoallergénique 5L',
    category: 'Diagnostics Rapides',
    currentStock: 6,
    currentStockUnits: 6,
    minStockAlert: 2,
    reorderThresholdUnits: 2,
    unit: 'Bidons',
    unitCostDzd: 2200,
    lotNumber: 'LOT-GEL-26A',
    expiryDate: '2027-08-31',
    lots: [
      { lotNumber: 'LOT-GEL-26A', expiryDate: '2027-08-31', quantity: 6, receivedAt: '2026-03-10', unitCostDzd: 2200 },
    ],
  },
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
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const storeStaff = useAtriumSelector((s) => s.staff);
  const language = useAtriumSelector((s) => s.language);
  const activeBranchId = currentBranchId || 'branch_medical_main';
  const medCtx = useMemo(
    () => ({
      accountId: currentAccountId || (isDemoModeEnabled() ? 'acc_01' : ''),
      businessId: currentBusinessId || 'biz_medical',
      branchId: activeBranchId,
      staffId: currentStaffId || '',
    }),
    [currentAccountId, currentBusinessId, activeBranchId, currentStaffId]
  );
  const belongsToActiveBranch = useCallback(
    (item: unknown) => {
      const rec = item as { branchId?: string; facilityId?: string } | null | undefined;
      return (rec?.branchId || rec?.facilityId || 'branch_medical_main') === activeBranchId;
    },
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      businessId: (item as { businessId?: string }).businessId || medCtx.businessId,
      accountId: (item as { accountId?: string }).accountId || medCtx.accountId,
    }) as T;

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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [consultations, setConsultations] = useState<MedicalConsultation[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_consultations_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appointments, setAppointments] = useState<MedicalAppointmentSlot[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_appointments_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_prescriptions_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [labRecords, setLabRecords] = useState<MedicalLabRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_labs_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [certificates, setCertificates] = useState<MedicalCertificateRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_certificates_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chifaClaims, setChifaClaims] = useState<ChifaClaimRecord[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_chifa_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [consumables, setConsumables] = useState<ClinicConsumableItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_consumables_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cashClosures, setCashClosures] = useState<DailyCashClosure[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_cash_closures_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chifaBordereaux, setChifaBordereaux] = useState<MedicalChifaBordereau[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_bordereaux_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [doctorPayouts, setDoctorPayouts] = useState<MedicalDoctorPayout[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_doctor_payouts_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [ngapActs, setNgapActs] = useState<NgapActDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_medical_ngap_acts_v2');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...NGAP_ACT_DEFINITIONS];
    } catch {
      return [...NGAP_ACT_DEFINITIONS];
    }
  });

  // Persistent storage effects (idle-deferred, skip initial mount)
  useIdlePersist('atrium_medical_practitioners_v2', practitioners);
  useIdlePersist('atrium_medical_doctor_configs_v2', doctorConfigs);
  useIdlePersist('atrium_medical_patients_v2', patients);
  useIdlePersist('atrium_medical_consultations_v2', consultations);
  useIdlePersist('atrium_medical_appointments_v2', appointments);
  useIdlePersist('atrium_medical_prescriptions_v2', prescriptions);
  useIdlePersist('atrium_medical_labs_v2', labRecords);
  useIdlePersist('atrium_medical_certificates_v2', certificates);
  useIdlePersist('atrium_medical_chifa_v2', chifaClaims);
  useIdlePersist('atrium_medical_consumables_v2', consumables);
  useIdlePersist('atrium_medical_cash_closures_v2', cashClosures);
  useIdlePersist('atrium_medical_bordereaux_v2', chifaBordereaux);
  useIdlePersist('atrium_medical_doctor_payouts_v2', doctorPayouts);
  useIdlePersist('atrium_medical_ngap_acts_v2', ngapActs);

  // Hydrate medical vertical state from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`medical:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remotePractitioners,
        remoteConfigs,
        remotePatients,
        remoteConsultations,
        remoteAppointments,
        remotePrescriptions,
        remoteLabs,
        remoteCerts,
        remoteChifa,
        remoteConsumables,
        remoteClosures,
        remoteBordereaux,
        remoteDoctorPayouts,
        remoteNgapActs,
      ] = await runWithConcurrency(
        [
          () => medicalService.fetchPractitioners(activeBranchId),
          () => medicalService.fetchOrdonnanceConfigs(activeBranchId),
          () => medicalService.fetchPatients(activeBranchId),
          () => medicalService.fetchConsultations(activeBranchId),
          () => medicalService.fetchAppointments(activeBranchId),
          () => medicalService.fetchPrescriptions(activeBranchId),
          () => medicalService.fetchLabRecords(activeBranchId),
          () => medicalService.fetchCertificates(activeBranchId),
          () => medicalService.fetchChifaClaims(activeBranchId),
          () => medicalService.fetchConsumables(activeBranchId),
          () => medicalService.fetchCashClosures(activeBranchId),
          () => medicalService.fetchChifaBordereaux(activeBranchId),
          () => medicalService.fetchDoctorPayouts(activeBranchId),
          () => medicalService.fetchNgapActs(activeBranchId),
        ],
        4
      );

      if (cancelled) return;
      if (Array.isArray(remotePractitioners) && remotePractitioners.length > 0) {
        setPractitioners((prev) => mergeMedicalById(prev, remotePractitioners as MedicalPractitioner[]));
      }
      if (remoteConfigs && typeof remoteConfigs === 'object' && Object.keys(remoteConfigs).length > 0) {
        setDoctorConfigs((prev) => ({ ...prev, ...(remoteConfigs as Record<string, DoctorOrdonnanceConfig>) }));
      }
      if (Array.isArray(remotePatients) && remotePatients.length > 0) {
        setPatients((prev) => mergeMedicalById(prev, remotePatients as MedicalPatient[]));
      }
      if (Array.isArray(remoteConsultations) && remoteConsultations.length > 0) {
        setConsultations((prev) => mergeMedicalById(prev, remoteConsultations as MedicalConsultation[]));
      }
      if (Array.isArray(remoteAppointments) && remoteAppointments.length > 0) {
        setAppointments((prev) => mergeMedicalById(prev, remoteAppointments as MedicalAppointmentSlot[]));
      }
      if (Array.isArray(remotePrescriptions) && remotePrescriptions.length > 0) {
        setPrescriptions((prev) => mergeMedicalById(prev, remotePrescriptions as MedicalPrescription[]));
      }
      if (Array.isArray(remoteLabs) && remoteLabs.length > 0) {
        setLabRecords((prev) => mergeMedicalById(prev, remoteLabs as MedicalLabRecord[]));
      }
      if (Array.isArray(remoteCerts) && remoteCerts.length > 0) {
        setCertificates((prev) => mergeMedicalById(prev, remoteCerts as MedicalCertificateRecord[]));
      }
      if (Array.isArray(remoteChifa) && remoteChifa.length > 0) {
        setChifaClaims((prev) => mergeMedicalById(prev, remoteChifa as ChifaClaimRecord[]));
      }
      if (Array.isArray(remoteConsumables) && remoteConsumables.length > 0) {
        setConsumables((prev) => mergeMedicalById(prev, remoteConsumables as ClinicConsumableItem[]));
      }
      if (Array.isArray(remoteClosures) && remoteClosures.length > 0) {
        setCashClosures((prev) => mergeMedicalById(prev, remoteClosures as DailyCashClosure[]));
      }
      if (Array.isArray(remoteBordereaux) && remoteBordereaux.length > 0) {
        setChifaBordereaux((prev) => mergeMedicalById(prev, remoteBordereaux as MedicalChifaBordereau[]));
      }
      if (Array.isArray(remoteDoctorPayouts) && remoteDoctorPayouts.length > 0) {
        setDoctorPayouts((prev) => mergeMedicalById(prev, remoteDoctorPayouts as MedicalDoctorPayout[]));
      }
      if (Array.isArray(remoteNgapActs) && remoteNgapActs.length > 0) {
        setNgapActs(remoteNgapActs as NgapActDefinition[]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  // Live Realtime updates for medical_* tables without full-branch polling
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'medical_staff',
      'medical_departments',
      'medical_patients',
      'medical_appointments',
      'medical_consultations',
      'medical_consumables',
      'medical_invoices',
      'medical_chifa_bordereaux',
      'medical_doctor_payouts',
      'medical_cash_closures',
      'medical_ngap_acts',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('medical_staff', setPractitioners);
      prune('medical_patients', setPatients);
      prune('medical_appointments', setAppointments);
      prune('medical_consultations', setConsultations);
      prune('medical_consultations', setPrescriptions);
      prune('medical_consultations', setLabRecords);
      prune('medical_consultations', setCertificates);
      prune('medical_consumables', setConsumables);
      prune('medical_invoices', setChifaClaims);
      prune('medical_invoices', setCashClosures);
      prune('medical_cash_closures', setCashClosures);
      prune('medical_chifa_bordereaux', setChifaBordereaux);
      prune('medical_doctor_payouts', setDoctorPayouts);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('medical_staff')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchPractitioners(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setPractitioners((prev) => mergeMedicalById(prev, rows as MedicalPractitioner[]));
          }
        });
      }
      if (changedSet.has('medical_departments')) {
        tasks.push(async () => {
          const configs = await medicalService.fetchOrdonnanceConfigs(activeBranchId);
          if (!cancelled && configs && typeof configs === 'object' && Object.keys(configs).length > 0) {
            setDoctorConfigs((prev) => ({ ...prev, ...(configs as Record<string, DoctorOrdonnanceConfig>) }));
          }
        });
      }
      if (changedSet.has('medical_patients')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchPatients(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setPatients((prev) => mergeMedicalById(prev, rows as MedicalPatient[]));
          }
        });
      }
      if (changedSet.has('medical_appointments')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchAppointments(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setAppointments((prev) => mergeMedicalById(prev, rows as MedicalAppointmentSlot[]));
          }
        });
      }
      if (changedSet.has('medical_consultations')) {
        tasks.push(
          async () => {
            const rows = await medicalService.fetchConsultations(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setConsultations((prev) => mergeMedicalById(prev, rows as MedicalConsultation[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchPrescriptions(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setPrescriptions((prev) => mergeMedicalById(prev, rows as MedicalPrescription[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchLabRecords(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setLabRecords((prev) => mergeMedicalById(prev, rows as MedicalLabRecord[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchCertificates(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setCertificates((prev) => mergeMedicalById(prev, rows as MedicalCertificateRecord[]));
            }
          }
        );
      }
      if (changedSet.has('medical_consumables')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchConsumables(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setConsumables((prev) => mergeMedicalById(prev, rows as ClinicConsumableItem[]));
          }
        });
      }
      if (changedSet.has('medical_invoices')) {
        tasks.push(
          async () => {
            const rows = await medicalService.fetchChifaClaims(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setChifaClaims((prev) => mergeMedicalById(prev, rows as ChifaClaimRecord[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchCashClosures(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setCashClosures((prev) => mergeMedicalById(prev, rows as DailyCashClosure[]));
            }
          }
        );
      }
      if (changedSet.has('medical_chifa_bordereaux')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchChifaBordereaux(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setChifaBordereaux((prev) => mergeMedicalById(prev, rows as MedicalChifaBordereau[]));
          }
        });
      }
      if (changedSet.has('medical_doctor_payouts')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchDoctorPayouts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setDoctorPayouts((prev) => mergeMedicalById(prev, rows as MedicalDoctorPayout[]));
          }
        });
      }
      if (changedSet.has('medical_cash_closures')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchCashClosures(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setCashClosures((prev) => mergeMedicalById(prev, rows as DailyCashClosure[]));
          }
        });
      }
      if (changedSet.has('medical_ngap_acts')) {
        tasks.push(async () => {
          const rows = await medicalService.fetchNgapActs(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setNgapActs(rows as NgapActDefinition[]);
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `medical:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const unsub = subscribeConcurrencyResolutions((evt) => {
      const tasks: Array<() => Promise<void>> = [];
      if (evt.table === 'medical_staff') {
        tasks.push(async () => {
          const rows = await medicalService.fetchPractitioners(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setPractitioners((prev) => mergeMedicalById(prev, rows as MedicalPractitioner[]));
          }
        });
      } else if (evt.table === 'medical_departments') {
        tasks.push(async () => {
          const configs = await medicalService.fetchOrdonnanceConfigs(activeBranchId);
          if (!cancelled && configs && typeof configs === 'object' && Object.keys(configs).length > 0) {
            setDoctorConfigs((prev) => ({ ...prev, ...(configs as Record<string, DoctorOrdonnanceConfig>) }));
          }
        });
      } else if (evt.table === 'medical_patients') {
        tasks.push(async () => {
          const rows = await medicalService.fetchPatients(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setPatients((prev) => mergeMedicalById(prev, rows as MedicalPatient[]));
          }
        });
      } else if (evt.table === 'medical_appointments') {
        tasks.push(async () => {
          const rows = await medicalService.fetchAppointments(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setAppointments((prev) => mergeMedicalById(prev, rows as MedicalAppointmentSlot[]));
          }
        });
      } else if (evt.table === 'medical_consultations') {
        tasks.push(
          async () => {
            const rows = await medicalService.fetchConsultations(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setConsultations((prev) => mergeMedicalById(prev, rows as MedicalConsultation[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchPrescriptions(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setPrescriptions((prev) => mergeMedicalById(prev, rows as MedicalPrescription[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchLabRecords(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setLabRecords((prev) => mergeMedicalById(prev, rows as MedicalLabRecord[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchCertificates(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setCertificates((prev) => mergeMedicalById(prev, rows as MedicalCertificateRecord[]));
            }
          }
        );
      } else if (evt.table === 'medical_consumables') {
        tasks.push(async () => {
          const rows = await medicalService.fetchConsumables(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setConsumables((prev) => mergeMedicalById(prev, rows as ClinicConsumableItem[]));
          }
        });
      } else if (evt.table === 'medical_invoices') {
        tasks.push(
          async () => {
            const rows = await medicalService.fetchChifaClaims(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setChifaClaims((prev) => mergeMedicalById(prev, rows as ChifaClaimRecord[]));
            }
          },
          async () => {
            const rows = await medicalService.fetchCashClosures(activeBranchId);
            if (!cancelled && Array.isArray(rows) && rows.length > 0) {
              setCashClosures((prev) => mergeMedicalById(prev, rows as DailyCashClosure[]));
            }
          }
        );
      } else if (evt.table === 'medical_chifa_bordereaux') {
        tasks.push(async () => {
          const rows = await medicalService.fetchChifaBordereaux(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setChifaBordereaux((prev) => mergeMedicalById(prev, rows as MedicalChifaBordereau[]));
          }
        });
      } else if (evt.table === 'medical_doctor_payouts') {
        tasks.push(async () => {
          const rows = await medicalService.fetchDoctorPayouts(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setDoctorPayouts((prev) => mergeMedicalById(prev, rows as MedicalDoctorPayout[]));
          }
        });
      } else if (evt.table === 'medical_cash_closures') {
        tasks.push(async () => {
          const rows = await medicalService.fetchCashClosures(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setCashClosures((prev) => mergeMedicalById(prev, rows as DailyCashClosure[]));
          }
        });
      } else if (evt.table === 'medical_ngap_acts') {
        tasks.push(async () => {
          const rows = await medicalService.fetchNgapActs(activeBranchId);
          if (!cancelled && Array.isArray(rows) && rows.length > 0) {
            setNgapActs(rows as NgapActDefinition[]);
          }
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `medical:res:${activeBranchId}:${evt.table}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [activeBranchId]);

  const [isEmergencyAlarmActive, setIsEmergencyAlarmActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('atrium_medical_emergency_v2') === 'true';
    } catch {
      return false;
    }
  });

  useIdlePersist('atrium_medical_emergency_v2', isEmergencyAlarmActive);

  const latestRef = useRef({
    practitioners,
    doctorConfigs,
    patients,
    consultations,
    appointments,
    prescriptions,
    labRecords,
    certificates,
    chifaClaims,
    consumables,
    cashClosures,
    chifaBordereaux,
    doctorPayouts,
    ngapActs,
    isEmergencyAlarmActive,
  });
  latestRef.current = {
    practitioners,
    doctorConfigs,
    patients,
    consultations,
    appointments,
    prescriptions,
    labRecords,
    certificates,
    chifaClaims,
    consumables,
    cashClosures,
    chifaBordereaux,
    doctorPayouts,
    ngapActs,
    isEmergencyAlarmActive,
  };

  const restoreAt = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    snapshot: T,
    index: number
  ) => {
    const item = cloneSnapshot(snapshot);
    setter((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      const next = [...prev];
      const safeIndex = Math.max(0, Math.min(index, next.length));
      next.splice(safeIndex, 0, item);
      return next;
    });
  };

  // Actions
  const addPatient = (patient: MedicalPatient) => {
    const scoped = withBranch(patient);
    const snap = cloneSnapshot(scoped);
    setPatients((prev) => [scoped, ...prev]);
    void medicalService.upsertPatient(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.fullName,
      summary: pickLocalizedText(language, {
        fr: `Patient ${scoped.fullName} ajouté`,
        en: `Patient ${scoped.fullName} added`,
        ar: `تمت إضافة المريض ${scoped.fullName}`,
      }),
      undo: () => {
        setPatients((prev) => prev.filter((p) => p.id !== snap.id));
        void medicalService.deletePatient(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setPatients((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_patients', re.id, currentStaffId)
          .then(() => medicalService.upsertPatient(re))
          .catch(() => {});
      },
    });
  };

  const updatePatient = (updated: MedicalPatient) => {
    const scoped = withBranch(updated);
    const existing = latestRef.current.patients.find((p) => p.id === updated.id);
    const prevSnap = existing ? cloneSnapshot(existing) : null;
    const nextSnap = cloneSnapshot(scoped);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? scoped : p)));
    void medicalService.upsertPatient(scoped).catch(() => {});

    if (prevSnap) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'edit',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: nextSnap.fullName,
        summary: pickLocalizedText(language, {
          fr: `Dossier patient ${nextSnap.fullName} modifié`,
          en: `Patient ${nextSnap.fullName} updated`,
          ar: `تم تعديل ملف المريض ${nextSnap.fullName}`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setPatients((prev) => prev.map((p) => (p.id === prevCopy.id ? prevCopy : p)));
          void medicalService.upsertPatient(prevCopy).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setPatients((prev) => prev.map((p) => (p.id === nextCopy.id ? nextCopy : p)));
          void medicalService.upsertPatient(nextCopy).catch(() => {});
        },
      });
    }
  };

  const deletePatient = (id: string) => {
    const idx = latestRef.current.patients.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.patients[idx]) : null;
    setPatients((prev) => prev.filter((p) => p.id !== id));
    void medicalService.deletePatient(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'delete',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.fullName,
        summary: pickLocalizedText(language, {
          fr: `Patient ${existing.fullName} supprimé`,
          en: `Patient ${existing.fullName} deleted`,
          ar: `تم حذف المريض ${existing.fullName}`,
        }),
        undo: () => {
          restoreAt(setPatients, existing, idx);
          void syncCoordinator
            .restoreRow('medical_patients', existing.id, currentStaffId)
            .then(() => medicalService.upsertPatient(cloneSnapshot(existing)))
            .catch(() => {});
        },
        redo: () => {
          setPatients((prev) => prev.filter((p) => p.id !== existing.id));
          void medicalService.deletePatient(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const deletePractitioner = (id: string) => {
    const idx = latestRef.current.practitioners.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.practitioners[idx]) : null;
    setPractitioners((prev) => prev.filter((p) => p.id !== id));
    void medicalService.deletePractitioner(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'delete',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.fullName,
        summary: pickLocalizedText(language, {
          fr: `Praticien ${existing.fullName} supprimé`,
          en: `Practitioner ${existing.fullName} deleted`,
          ar: `تم حذف الطبيب ${existing.fullName}`,
        }),
        undo: () => {
          restoreAt(setPractitioners, existing, idx);
          void syncCoordinator
            .restoreRow('medical_staff', existing.id, currentStaffId)
            .catch(() => {});
        },
        redo: () => {
          setPractitioners((prev) => prev.filter((p) => p.id !== existing.id));
          void medicalService.deletePractitioner(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addConsultation = (cons: MedicalConsultation) => {
    const scoped = withBranch(cons);
    const snap = cloneSnapshot(scoped);
    setConsultations((prev) => [scoped, ...prev]);
    void medicalService.upsertConsultation(scoped).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.patientName,
      summary: pickLocalizedText(language, {
        fr: `Consultation ${scoped.ticketNumber || ''} (${scoped.patientName}) ajoutée`.trim(),
        en: `Consultation ${scoped.ticketNumber || ''} (${scoped.patientName}) added`.trim(),
        ar: `تمت إضافة استشارة (${scoped.patientName})`,
      }),
      undo: () => {
        setConsultations((prev) => prev.filter((c) => c.id !== snap.id));
        void medicalService.deleteConsultation(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setConsultations((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_consultations', re.id, currentStaffId)
          .then(() => medicalService.upsertConsultation(re))
          .catch(() => {});
      },
    });
  };

  const deleteConsultation = (id: string) => {
    const idx = latestRef.current.consultations.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.consultations[idx]) : null;
    setConsultations((prev) => prev.filter((c) => c.id !== id));
    void medicalService.deleteConsultation(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'delete',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.patientName,
        summary: pickLocalizedText(language, {
          fr: `Consultation ${existing.ticketNumber || ''} (${existing.patientName}) supprimée`.trim(),
          en: `Consultation ${existing.ticketNumber || ''} (${existing.patientName}) deleted`.trim(),
          ar: `تم حذف استشارة (${existing.patientName})`,
        }),
        undo: () => {
          restoreAt(setConsultations, existing, idx);
          void syncCoordinator
            .restoreRow('medical_consultations', existing.id, currentStaffId)
            .then(() => medicalService.upsertConsultation(cloneSnapshot(existing)))
            .catch(() => {});
        },
        redo: () => {
          setConsultations((prev) => prev.filter((c) => c.id !== existing.id));
          void medicalService.deleteConsultation(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const updateConsultationStatus = (id: string, status: MedicalConsultation['status']) => {
    const existing = latestRef.current.consultations.find((c) => c.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const next = withBranch({ ...existing, status });
    const nextSnap = cloneSnapshot(next);
    setConsultations((prev) => prev.map((c) => (c.id === id ? next : c)));
    void medicalService.upsertConsultation(next).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'status',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: existing.patientName,
      summary: pickLocalizedText(language, {
        fr: `Statut consultation ${existing.patientName} → ${status}`,
        en: `Consultation status ${existing.patientName} → ${status}`,
        ar: `تحديث حالة استشارة ${existing.patientName} → ${status}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setConsultations((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
        void medicalService.upsertConsultation(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setConsultations((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
        void medicalService.upsertConsultation(nextCopy).catch(() => {});
      },
    });
  };

  const markConsultationPaid = (id: string, method: 'Cash' | 'BaridiMob' | 'Card' | 'ChifaDirect' = 'Cash') => {
    const existing = latestRef.current.consultations.find((c) => c.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const next = withBranch({ ...existing, isPaid: true, paymentMethod: method });
    const nextSnap = cloneSnapshot(next);
    setConsultations((prev) => prev.map((c) => (c.id === id ? next : c)));
    void medicalService.upsertConsultation(next).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'status',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: existing.patientName,
      summary: pickLocalizedText(language, {
        fr: `Encaissement consultation ${existing.patientName} (${method})`,
        en: `Consultation ${existing.patientName} marked paid (${method})`,
        ar: `تم تحصيل رسوم استشارة ${existing.patientName}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setConsultations((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
        void medicalService.upsertConsultation(withBranch(prevCopy)).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setConsultations((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
        void medicalService.upsertConsultation(nextCopy).catch(() => {});
      },
    });
  };

  const addAppointment = (apt: MedicalAppointmentSlot) => {
    const scoped = withBranch(apt);
    const conflict = evaluateAppointmentConflict({
      doctorId: scoped.doctorId,
      doctorName: scoped.doctorName,
      date: scoped.date,
      startTime: scoped.startTime,
      durationMinutes: scoped.durationMinutes,
      existingAppointments: latestRef.current.appointments.filter(belongsToActiveBranch),
      isEmergencyBypass: scoped.isEmergencyBypass,
      emergencyBypassReason: scoped.emergencyBypassReason,
    });
    if (!conflict.ok) {
      showToast({
        type: 'error',
        title: pickLocalizedText(language, {
          fr: 'Conflit de rendez-vous',
          en: 'Appointment Conflict',
          ar: 'تعارض في الموعد',
        }),
        message: conflict.errorMessage || 'Créneau déjà occupé',
      });
      return {
        ok: false as const,
        errorCode: conflict.errorCode,
        errorMessage: conflict.errorMessage,
      };
    }

    const snap = cloneSnapshot(scoped);
    setAppointments((prev) => [...prev, scoped]);
    void medicalService.upsertAppointment(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.patientName,
      summary: pickLocalizedText(language, {
        fr: `RDV médical ${scoped.patientName} (${scoped.startTime}) créé`,
        en: `Appointment ${scoped.patientName} (${scoped.startTime}) created`,
        ar: `تم حجز موعد ${scoped.patientName} (${scoped.startTime})`,
      }),
      undo: () => {
        setAppointments((prev) => prev.filter((a) => a.id !== snap.id));
        void medicalService.deleteAppointment(snap.id, currentStaffId).catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setAppointments((prev) => (prev.some((a) => a.id === re.id) ? prev : [...prev, re]));
        void syncCoordinator
          .restoreRow('medical_appointments', re.id, currentStaffId)
          .then(() => medicalService.upsertAppointment(re, medCtx))
          .catch(() => {});
      },
    });

    return { ok: true as const, slot: scoped };
  };

  const updateAppointmentStatus = (id: string, status: MedicalAppointmentSlot['status']) => {
    const existing = latestRef.current.appointments.find((a) => a.id === id);
    if (!existing) return;
    const prevSnap = cloneSnapshot(existing);
    const next = { ...existing, status };
    const nextSnap = cloneSnapshot(next);
    setAppointments((prev) => prev.map((a) => (a.id === id ? next : a)));
    void medicalService.upsertAppointment(next, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'status',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: existing.patientName,
      summary: pickLocalizedText(language, {
        fr: `Statut RDV ${existing.patientName} → ${status}`,
        en: `Appointment ${existing.patientName} → ${status}`,
        ar: `تحديث موعد ${existing.patientName} → ${status}`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setAppointments((prev) => prev.map((a) => (a.id === prevCopy.id ? prevCopy : a)));
        void medicalService.upsertAppointment(prevCopy, medCtx).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(nextSnap);
        setAppointments((prev) => prev.map((a) => (a.id === nextCopy.id ? nextCopy : a)));
        void medicalService.upsertAppointment(nextCopy, medCtx).catch(() => {});
      },
    });
  };

  const deleteAppointment = (id: string) => {
    const idx = latestRef.current.appointments.findIndex((a) => a.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.appointments[idx]) : null;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    void medicalService.deleteAppointment(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'delete',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.patientName,
        summary: pickLocalizedText(language, {
          fr: `RDV médical ${existing.patientName} supprimé`,
          en: `Appointment ${existing.patientName} deleted`,
          ar: `تم حذف موعد ${existing.patientName}`,
        }),
        undo: () => {
          restoreAt(setAppointments, existing, idx);
          void syncCoordinator
            .restoreRow('medical_appointments', existing.id, currentStaffId)
            .then(() => medicalService.upsertAppointment(cloneSnapshot(existing), medCtx))
            .catch(() => {});
        },
        redo: () => {
          setAppointments((prev) => prev.filter((a) => a.id !== existing.id));
          void medicalService.deleteAppointment(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const addPrescription = (rx: MedicalPrescription) => {
    const scoped = withBranch(rx);
    const snap = cloneSnapshot(scoped);
    setPrescriptions((prev) => [scoped, ...prev]);
    void medicalService.upsertPrescription(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.patientName,
      summary: pickLocalizedText(language, {
        fr: `Ordonnance ${scoped.patientName} créée`,
        en: `Prescription for ${scoped.patientName} created`,
        ar: `تم إنشاء وصفة طبية للمريض ${scoped.patientName}`,
      }),
      undo: () => {
        setPrescriptions((prev) => prev.filter((r) => r.id !== snap.id));
        void syncCoordinator
          .softDeleteRow('medical_consultations', `rx_${snap.id}`, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setPrescriptions((prev) => (prev.some((r) => r.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_consultations', `rx_${re.id}`, currentStaffId)
          .then(() => medicalService.upsertPrescription(re, medCtx))
          .catch(() => {});
      },
    });
  };

  const saveDoctorConfig = (doctorId: string, config: DoctorOrdonnanceConfig) => {
    const prevCfg = latestRef.current.doctorConfigs[doctorId]
      ? cloneSnapshot(latestRef.current.doctorConfigs[doctorId])
      : undefined;
    const nextCfg = cloneSnapshot(config);
    setDoctorConfigs((prev) => ({
      ...prev,
      [doctorId]: config,
    }));
    void medicalService.upsertOrdonnanceConfig(config, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'edit',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: config.doctorName,
      summary: pickLocalizedText(language, {
        fr: `Modèle ordonnance ${config.doctorName} enregistré`,
        en: `Prescription header for ${config.doctorName} saved`,
        ar: `تم حفظ إعدادات وصفة ${config.doctorName}`,
      }),
      undo: () => {
        setDoctorConfigs((prev) => {
          const copy = { ...prev };
          if (prevCfg) {
            copy[doctorId] = cloneSnapshot(prevCfg);
            void medicalService.upsertOrdonnanceConfig(cloneSnapshot(prevCfg), medCtx).catch(() => {});
          } else {
            delete copy[doctorId];
          }
          return copy;
        });
      },
      redo: () => {
        const re = cloneSnapshot(nextCfg);
        setDoctorConfigs((prev) => ({ ...prev, [doctorId]: re }));
        void medicalService.upsertOrdonnanceConfig(re, medCtx).catch(() => {});
      },
    });
  };

  const addCertificate = (cert: MedicalCertificateRecord) => {
    const scoped = withBranch(cert);
    const snap = cloneSnapshot(scoped);
    setCertificates((prev) => [scoped, ...prev]);
    void medicalService.upsertCertificate(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.patientName,
      summary: pickLocalizedText(language, {
        fr: `Certificat médical ${scoped.patientName} émis`,
        en: `Medical certificate for ${scoped.patientName} issued`,
        ar: `تم إصدار شهادة طبية للمريض ${scoped.patientName}`,
      }),
      undo: () => {
        setCertificates((prev) => prev.filter((c) => c.id !== snap.id));
        void syncCoordinator
          .softDeleteRow('medical_consultations', `cert_${snap.id}`, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setCertificates((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_consultations', `cert_${re.id}`, currentStaffId)
          .then(() => medicalService.upsertCertificate(re, medCtx))
          .catch(() => {});
      },
    });
  };

  const addLabRecord = (lab: MedicalLabRecord) => {
    const scoped = withBranch(lab);
    const snap = cloneSnapshot(scoped);
    setLabRecords((prev) => [scoped, ...prev]);
    void medicalService.upsertLabRecord(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.patientName,
      summary: pickLocalizedText(language, {
        fr: `Bilan labo ${scoped.testCategory} (${scoped.patientName}) ajouté`,
        en: `Lab record ${scoped.testCategory} (${scoped.patientName}) added`,
        ar: `تمت إضافة تحليل مخبري (${scoped.patientName})`,
      }),
      undo: () => {
        setLabRecords((prev) => prev.filter((l) => l.id !== snap.id));
        void syncCoordinator
          .softDeleteRow('medical_consultations', `lab_${snap.id}`, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setLabRecords((prev) => (prev.some((l) => l.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_consultations', `lab_${re.id}`, currentStaffId)
          .then(() => medicalService.upsertLabRecord(re, medCtx))
          .catch(() => {});
      },
    });
  };

  const addChifaClaim = (claim: ChifaClaimRecord) => {
    const scoped = withBranch(claim);
    const snap = cloneSnapshot(scoped);
    setChifaClaims((prev) => [scoped, ...prev]);
    void medicalService.upsertChifaClaim(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.claimNumber,
      summary: pickLocalizedText(language, {
        fr: `Bordereau Chifa ${scoped.claimNumber} enregistré`,
        en: `Chifa claim ${scoped.claimNumber} created`,
        ar: `تم تسجيل ملف شفاء ${scoped.claimNumber}`,
      }),
      undo: () => {
        setChifaClaims((prev) => prev.filter((c) => c.id !== snap.id));
        void syncCoordinator
          .softDeleteRow('medical_invoices', `chifa_${snap.id}`, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setChifaClaims((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_invoices', `chifa_${re.id}`, currentStaffId)
          .then(() => medicalService.upsertChifaClaim(re, medCtx))
          .catch(() => {});
      },
    });
  };

  const addCashClosure = (closure: DailyCashClosure) => {
    const scoped = withBranch(closure);
    const snap = cloneSnapshot(scoped);
    setCashClosures((prev) => [scoped, ...prev]);
    void medicalService.upsertCashClosure(scoped, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: scoped.date || scoped.id,
      summary: pickLocalizedText(language, {
        fr: `Clôture caisse médicale ${scoped.date || ''} enregistrée`.trim(),
        en: `Medical cash closure ${scoped.date || ''} saved`.trim(),
        ar: `تم تسجيل إغلاق الصندوق الطبي ${scoped.date || ''}`.trim(),
      }),
      undo: () => {
        setCashClosures((prev) => prev.filter((c) => c.id !== snap.id));
        void syncCoordinator
          .softDeleteRow('medical_invoices', `close_${snap.id}`, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(snap);
        setCashClosures((prev) => (prev.some((c) => c.id === re.id) ? prev : [re, ...prev]));
        void syncCoordinator
          .restoreRow('medical_invoices', `close_${re.id}`, currentStaffId)
          .then(() => medicalService.upsertCashClosure(re, medCtx))
          .catch(() => {});
      },
    });
  };

  const toggleEmergencyAlarm = (overrideState?: boolean) => {
    const prevVal = latestRef.current.isEmergencyAlarmActive;
    const nextVal = typeof overrideState === 'boolean' ? overrideState : !prevVal;
    if (prevVal === nextVal) return;
    setIsEmergencyAlarmActive(nextVal);

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'status',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: 'Urgence',
      summary: pickLocalizedText(language, {
        fr: nextVal ? 'Alerte urgence clinique activée' : 'Alerte urgence clinique désactivée',
        en: nextVal ? 'Clinic emergency alarm activated' : 'Clinic emergency alarm cleared',
        ar: nextVal ? 'تم تفعيل إنذار الطوارئ' : 'تم إيقاف إنذار الطوارئ',
      }),
      undo: () => setIsEmergencyAlarmActive(prevVal),
      redo: () => setIsEmergencyAlarmActive(nextVal),
    });
  };

  const applyDepleteConsumable = (
    itemCode: string,
    quantity: number,
    referenceDate?: string
  ) => {
    const existing = latestRef.current.consumables.find(
      (item) => (item.itemCode === itemCode || item.id === itemCode) && belongsToActiveBranch(item)
    ) || latestRef.current.consumables.find(
      (item) => item.itemCode === itemCode || item.id === itemCode
    );
    if (!existing) {
      return {
        ok: false as const,
        errorCode: 'MEDICAL_CONSUMABLE_NOT_FOUND',
        errorMessage: `Consommable introuvable (${itemCode}).`,
        matchedPrev: null as ClinicConsumableItem | null,
        matchedNext: null as ClinicConsumableItem | null,
      };
    }
    const fefo = consumeConsumableFefo({
      item: existing,
      quantity,
      referenceDate,
    });
    if (!fefo.ok || !fefo.updatedItem) {
      return {
        ok: false as const,
        errorCode: fefo.errorCode,
        errorMessage: fefo.errorMessage,
        matchedPrev: null as ClinicConsumableItem | null,
        matchedNext: null as ClinicConsumableItem | null,
      };
    }

    const matchedPrev = cloneSnapshot(existing);
    const matchedNext = cloneSnapshot(withBranch(fefo.updatedItem));
    setConsumables((prev) =>
      prev.map((item) => (item.id === existing.id ? matchedNext : item))
    );
    void medicalService
      .consumeSupplyFefo(existing.id, quantity, referenceDate, existing.version)
      .catch(() => {});

    return {
      ok: true as const,
      deductedLots: fefo.deductedLots || [],
      matchedPrev: matchedPrev as ClinicConsumableItem | null,
      matchedNext: matchedNext as ClinicConsumableItem | null,
    };
  };

  const depleteConsumable = (itemCode: string, quantity: number, referenceDate?: string) => {
    const res = applyDepleteConsumable(itemCode, quantity, referenceDate);
    if (!res.ok) {
      showToast({
        type: 'error',
        title: pickLocalizedText(language, {
          fr: 'Sortie FEFO bloquée',
          en: 'FEFO Depletion Blocked',
          ar: 'تم حظر صرف المستلزم',
        }),
        message: res.errorMessage || 'Stock indisponible',
      });
      return {
        ok: false as const,
        errorCode: res.errorCode,
        errorMessage: res.errorMessage,
      };
    }

    const prevSnap = res.matchedPrev;
    const matchedNext = res.matchedNext;
    if (prevSnap && matchedNext) {
      const nextSnap = matchedNext;
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'edit',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: prevSnap.name,
        summary: pickLocalizedText(language, {
          fr: `Sortie FEFO ${prevSnap.name} (-${quantity})`,
          en: `FEFO depleted: ${prevSnap.name} (-${quantity})`,
          ar: `تم خصم ${prevSnap.name} (-${quantity})`,
        }),
        undo: () => {
          const prevCopy = cloneSnapshot(prevSnap);
          setConsumables((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
          void medicalService.upsertConsumable(prevCopy, medCtx).catch(() => {});
        },
        redo: () => {
          const nextCopy = cloneSnapshot(nextSnap);
          setConsumables((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
          void medicalService.upsertConsumable(nextCopy, medCtx).catch(() => {});
        },
      });
    }
    return {
      ok: true as const,
      deductedLots: res.deductedLots,
    };
  };

  const restockConsumable = (
    itemCode: string,
    quantity: number,
    options?: { lotNumber?: string; expiryDate?: string; receivedAt?: string }
  ) => {
    const existing = latestRef.current.consumables.find(
      (item) => (item.itemCode === itemCode || item.id === itemCode) && belongsToActiveBranch(item)
    ) || latestRef.current.consumables.find(
      (item) => item.itemCode === itemCode || item.id === itemCode
    );
    if (!existing) return { ok: false as const };
    const prevSnap = cloneSnapshot(existing);
    const defaultLot = `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;
    const defaultExpiry = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    const updatedItem = withBranch(
      restockConsumableLot({
        item: existing,
        quantity,
        lotNumber: options?.lotNumber?.trim() || defaultLot,
        expiryDate: options?.expiryDate?.trim() || defaultExpiry,
        receivedAt: options?.receivedAt,
      })
    );
    const capturedNext = cloneSnapshot(updatedItem);
    setConsumables((prev) =>
      prev.map((item) => (item.id === existing.id ? updatedItem : item))
    );
    void medicalService.upsertConsumable(capturedNext, medCtx).catch(() => {});

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'edit',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: prevSnap.name,
      summary: pickLocalizedText(language, {
        fr: `Réapprovisionnement ${prevSnap.name} (+${quantity})`,
        en: `Restocked ${prevSnap.name} (+${quantity})`,
        ar: `تم تزويد ${prevSnap.name} (+${quantity})`,
      }),
      undo: () => {
        const prevCopy = cloneSnapshot(prevSnap);
        setConsumables((prev) => prev.map((c) => (c.id === prevCopy.id ? prevCopy : c)));
        void medicalService.upsertConsumable(prevCopy, medCtx).catch(() => {});
      },
      redo: () => {
        const nextCopy = cloneSnapshot(capturedNext);
        setConsumables((prev) => prev.map((c) => (c.id === nextCopy.id ? nextCopy : c)));
        void medicalService.upsertConsumable(nextCopy, medCtx).catch(() => {});
      },
    });
    return { ok: true as const, item: capturedNext };
  };

  const depleteForAct = (actCode: string, referenceDate?: string) => {
    const prevConsumables = cloneSnapshot(latestRef.current.consumables);
    const customAct = latestRef.current.ngapActs.find((a) => a.code === actCode);
    const actDef = customAct || getNgapActDefinition(actCode);
    const depletedItems: ClinicConsumableItem[] = [];
    const blockedErrors: string[] = [];

    actDef.linkedConsumables.forEach((req) => {
      const exists = prevConsumables.some(
        (item) => item.itemCode === req.itemCode || item.id === req.itemCode
      );
      if (!exists) return;
      const res = applyDepleteConsumable(req.itemCode, req.quantity, referenceDate);
      if (res.ok && res.matchedNext) {
        depletedItems.push(res.matchedNext);
      } else if (!res.ok && res.errorMessage) {
        blockedErrors.push(res.errorMessage);
      }
    });

    if (blockedErrors.length > 0) {
      showToast({
        type: 'warning',
        title: pickLocalizedText(language, {
          fr: 'Alerte consommables FEFO',
          en: 'FEFO Supply Warning',
          ar: 'تنبيه مخزون المستلزمات',
        }),
        message: blockedErrors[0],
      });
    }

    if (depletedItems.length === 0) return;

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'bulk',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: actCode,
      summary: pickLocalizedText(language, {
        fr: `Consommables FEFO déduits pour acte ${actCode}`,
        en: `FEFO consumables deducted for act ${actCode}`,
        ar: `تم خصم المستلزمات للعمل الطبي ${actCode}`,
      }),
      undo: () => {
        const prevList = cloneSnapshot(prevConsumables);
        setConsumables(prevList);
        prevList.forEach((item) => {
          void medicalService.upsertConsumable(item, medCtx).catch(() => {});
        });
      },
    });
  };

  const transmitChifaBordereau = (params?: {
    periodMonth?: string;
    cnasCenterCode?: string;
    claimIds?: string[];
  }) => {
    const branchClaims = latestRef.current.chifaClaims.filter(belongsToActiveBranch);
    const targetClaims =
      params?.claimIds && params.claimIds.length > 0
        ? branchClaims.filter((c) => params.claimIds!.includes(c.id))
        : branchClaims.filter(
            (c) => !(c.isTransmitted ?? c.status === 'Submitted') && c.status !== 'Reimbursed'
          );

    const batchRes = buildChifaBordereauBatch({
      accountId: medCtx.accountId || 'acc_01',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      claims: targetClaims,
      periodMonth: params?.periodMonth,
      cnasCenterCode: params?.cnasCenterCode,
      transmitted: true,
    });

    if (!batchRes.ok || !batchRes.bordereau) {
      const msg =
        targetClaims.length === 0 && branchClaims.length > 0
          ? pickLocalizedText(language, {
              fr: 'Toutes les fiches Chifa actives ont déjà été télétransmises.',
              en: 'All active Chifa claims have already been transmitted.',
              ar: 'تم إرسال جميع ملفات شفاء النشطة مسبقاً.',
            })
          : batchRes.errorMessage || 'Aucune fiche Chifa à télétransmettre.';
      showToast({
        type: 'warning',
        title: 'Télétransmission CNAS',
        message: msg,
      });
      return {
        ok: false as const,
        errorCode: batchRes.errorCode || 'MEDICAL_BORDEREAU_EMPTY',
        errorMessage: msg,
      };
    }

    const bordereau = batchRes.bordereau;
    const prevClaimsSnap = cloneSnapshot(targetClaims);
    const transmittedDate = new Date().toISOString().slice(0, 10);
    const claimIdSet = new Set(bordereau.claimIds);
    const updatedClaims = targetClaims.map((cl) => ({
      ...cl,
      status: 'Submitted' as const,
      isTransmitted: true,
      submissionDate: cl.submissionDate || transmittedDate,
      batchNumber: bordereau.bordereauNumber,
      bordereauNumber: bordereau.bordereauNumber,
    }));

    setChifaBordereaux((prev) => [bordereau, ...prev]);
    setChifaClaims((prev) =>
      prev.map((cl) => {
        if (!claimIdSet.has(cl.id)) return cl;
        return updatedClaims.find((u) => u.id === cl.id) || cl;
      })
    );

    void medicalService.transmitChifaBordereau(bordereau).catch(() => {});
    updatedClaims.forEach((cl) => {
      void medicalService.upsertChifaClaim(cl, medCtx).catch(() => {});
    });

    showToast({
      type: 'success',
      title: 'Télétransmission CNAS',
      message: pickLocalizedText(language, {
        fr: `Bordereau ${bordereau.bordereauNumber} transmis (${bordereau.claimsCount} dossiers).`,
        en: `Bordereau ${bordereau.bordereauNumber} transmitted (${bordereau.claimsCount} claims).`,
        ar: `تم إرسال جدول ${bordereau.bordereauNumber} (${bordereau.claimsCount} ملفات).`,
      }),
    });

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: bordereau.bordereauNumber,
      summary: pickLocalizedText(language, {
        fr: `Bordereau Chifa ${bordereau.bordereauNumber} télétransmis`,
        en: `Chifa bordereau ${bordereau.bordereauNumber} transmitted`,
        ar: `تم إرسال جدول شفاء ${bordereau.bordereauNumber}`,
      }),
      undo: () => {
        const prevClaims = cloneSnapshot(prevClaimsSnap);
        setChifaBordereaux((prev) => prev.filter((b) => b.id !== bordereau.id));
        setChifaClaims((prev) =>
          prev.map((cl) => prevClaims.find((p) => p.id === cl.id) || cl)
        );
        void syncCoordinator
          .softDeleteRow('medical_chifa_bordereaux', bordereau.id, currentStaffId)
          .catch(() => {});
        prevClaims.forEach((cl) => {
          void medicalService.upsertChifaClaim(cl, medCtx).catch(() => {});
        });
      },
      redo: () => {
        setChifaBordereaux((prev) =>
          prev.some((b) => b.id === bordereau.id) ? prev : [bordereau, ...prev]
        );
        setChifaClaims((prev) =>
          prev.map((cl) => updatedClaims.find((u) => u.id === cl.id) || cl)
        );
        void medicalService.transmitChifaBordereau(bordereau).catch(() => {});
        updatedClaims.forEach((cl) => {
          void medicalService.upsertChifaClaim(cl, medCtx).catch(() => {});
        });
      },
    });

    return { ok: true as const, bordereau };
  };

  const settleChifaBordereau = (bordereauId: string, settlementReference?: string) => {
    const existing = latestRef.current.chifaBordereaux.find((b) => b.id === bordereauId);
    if (!existing) {
      return { ok: false as const, errorMessage: 'Bordereau introuvable.' };
    }
    if (existing.status === 'Reimbursed' || existing.status === 'Settled') {
      return { ok: false as const, errorMessage: 'Bordereau déjà encaissé.' };
    }

    const prevSnap = cloneSnapshot(existing);
    const ref = settlementReference?.trim() || `VIR-CNAS-${existing.bordereauNumber}`;
    const settledAt = new Date().toISOString();
    let updated: MedicalChifaBordereau = {
      ...existing,
      status: 'Reimbursed',
      reimbursedAt: settledAt,
      settlementReference: ref,
      updatedAt: settledAt,
    };

    const scfDraft = buildChifaSettlementScfDraft({
      bordereau: updated,
      settlementDate: settledAt.slice(0, 10),
      settlementReference: ref,
    });
    const scfRes =
      updated.totalCnasCentimes > 0 && medCtx.businessId && activeBranchId
        ? atriumActions.postManualJournalEntry({
            ...scfDraft,
            silentSuccessToast: true,
          })
        : { ok: false as const, entry: undefined };

    if (scfRes.ok && scfRes.entry) {
      updated = { ...updated, journalEntryId: scfRes.entry.id };
    }

    const claimIdSet = new Set(updated.claimIds || []);
    const prevClaimsSnap = cloneSnapshot(
      latestRef.current.chifaClaims.filter((c) => claimIdSet.has(c.id))
    );

    setChifaBordereaux((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setChifaClaims((prev) =>
      prev.map((c) =>
        claimIdSet.has(c.id) ? { ...c, status: 'Reimbursed', isTransmitted: true } : c
      )
    );

    void medicalService
      .settleChifaBordereau({
        bordereauId: updated.id,
        settlementReference: ref,
        journalEntryId: updated.journalEntryId,
        expectedVersion: existing.version,
      })
      .catch(() => {});

    prevClaimsSnap.forEach((cl) => {
      void medicalService
        .upsertChifaClaim({ ...cl, status: 'Reimbursed', isTransmitted: true }, medCtx)
        .catch(() => {});
    });

    showToast({
      type: 'success',
      title: 'Remboursement CNAS Encaissé',
      message: pickLocalizedText(language, {
        fr: `Virement CNAS enregistré (${ref}) · Écriture SCF 512000/411000 comptabilisée.`,
        en: `CNAS settlement recorded (${ref}) · SCF entry 512000/411000 posted.`,
        ar: `تم تحصيل تحويل الصندوق الوطني للتأمينات (${ref}).`,
      }),
    });

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'status',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: updated.bordereauNumber,
      summary: pickLocalizedText(language, {
        fr: `Règlement CNAS ${updated.bordereauNumber} encaissé`,
        en: `CNAS bordereau ${updated.bordereauNumber} settled`,
        ar: `تم تحصيل جدول شفاء ${updated.bordereauNumber}`,
      }),
      undo: () => {
        setChifaBordereaux((prev) => prev.map((b) => (b.id === prevSnap.id ? prevSnap : b)));
        setChifaClaims((prev) =>
          prev.map((c) => prevClaimsSnap.find((p) => p.id === c.id) || c)
        );
      },
      redo: () => {
        setChifaBordereaux((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        setChifaClaims((prev) =>
          prev.map((c) =>
            claimIdSet.has(c.id) ? { ...c, status: 'Reimbursed', isTransmitted: true } : c
          )
        );
      },
    });

    return {
      ok: true as const,
      bordereau: updated,
      journalEntryId: scfRes.entry?.id,
    };
  };

  const issueDoctorPayout = (params: {
    practitionerId: string;
    periodMonth?: string;
    paymentMethod?: 'bank_transfer' | 'cash';
    notes?: string;
  }) => {
    const doc =
      latestRef.current.practitioners.find((p) => p.id === params.practitionerId) ||
      scopedPractitioners.find((p) => p.id === params.practitionerId);
    if (!doc) {
      return { ok: false as const, errorMessage: 'Praticien introuvable.' };
    }

    const branchConsults = latestRef.current.consultations.filter(belongsToActiveBranch);
    const branchPayouts = latestRef.current.doctorPayouts.filter(belongsToActiveBranch);
    const [summary] = aggregatePractitionerTurnovers({
      practitioners: [doc],
      consultations: branchConsults,
      payouts: branchPayouts,
      periodMonth: params.periodMonth,
    });

    if (!summary || summary.pendingPayoutCentimes <= 0) {
      const msg = pickLocalizedText(language, {
        fr: `Aucun solde d'honoraires à régler pour ${doc.fullName}.`,
        en: `No pending practitioner payout due for ${doc.fullName}.`,
        ar: `لا توجد مستحقات معلقة للطبيب ${doc.fullName}.`,
      });
      showToast({
        type: 'warning',
        title: 'Rétrocession Honoraires',
        message: msg,
      });
      return { ok: false as const, errorMessage: msg };
    }

    const nowIso = new Date().toISOString();
    let payout: MedicalDoctorPayout = {
      id: `pay_${Date.now()}_${doc.id}`,
      accountId: medCtx.accountId || 'acc_01',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      practitionerId: doc.id,
      practitionerRef: doc.id,
      practitionerName: doc.fullName || doc.name || 'Dr. Praticien',
      periodMonth: summary.periodMonth,
      consultationsCount: summary.consultationsCount,
      grossTurnoverCentimes: summary.grossTurnoverCentimes,
      commissionRateBps: Math.round(summary.commissionRatePercent * 100),
      doctorPayoutCentimes: summary.pendingPayoutCentimes,
      polyclinicShareCentimes: summary.polyclinicShareCentimes,
      status: 'issued',
      issuedAt: nowIso,
      notes: params.notes,
    };

    const scfDraft = buildDoctorPayoutScfDraft({
      payout,
      paymentMethod: params.paymentMethod || 'bank_transfer',
    });
    const scfRes =
      medCtx.businessId && activeBranchId
        ? atriumActions.postManualJournalEntry({
            ...scfDraft,
            silentSuccessToast: true,
          })
        : { ok: false as const, entry: undefined };

    if (scfRes.ok && scfRes.entry) {
      payout = { ...payout, journalEntryId: scfRes.entry.id };
    }

    const payoutSnap = cloneSnapshot(payout);
    setDoctorPayouts((prev) => [payout, ...prev]);
    void medicalService.issuePractitionerPayout(payout, medCtx).catch(() => {});

    showToast({
      type: 'success',
      title: 'Règlement Honoraires Émis',
      message: pickLocalizedText(language, {
        fr: `Rétrocession de ${(payout.doctorPayoutCentimes / 100).toLocaleString()} DZD émise pour ${payout.practitionerName}.`,
        en: `Payout of ${(payout.doctorPayoutCentimes / 100).toLocaleString()} DZD issued for ${payout.practitionerName}.`,
        ar: `تم صرف مستحقات ${(payout.doctorPayoutCentimes / 100).toLocaleString()} دج للطبيب ${payout.practitionerName}.`,
      }),
    });

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'create',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      entityLabel: payout.practitionerName,
      summary: pickLocalizedText(language, {
        fr: `Règlement honoraires ${payout.practitionerName} émis`,
        en: `Practitioner payout ${payout.practitionerName} issued`,
        ar: `تم إصدار مستحقات ${payout.practitionerName}`,
      }),
      undo: () => {
        setDoctorPayouts((prev) => prev.filter((p) => p.id !== payoutSnap.id));
        void syncCoordinator
          .softDeleteRow('medical_doctor_payouts', payoutSnap.id, currentStaffId)
          .catch(() => {});
      },
      redo: () => {
        const re = cloneSnapshot(payoutSnap);
        setDoctorPayouts((prev) => (prev.some((p) => p.id === re.id) ? prev : [re, ...prev]));
        void medicalService.issuePractitionerPayout(re, medCtx).catch(() => {});
      },
    });

    return {
      ok: true as const,
      payout,
      journalEntryId: scfRes.entry?.id,
    };
  };

  const deleteConsumable = (id: string) => {
    const idx = latestRef.current.consumables.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? cloneSnapshot(latestRef.current.consumables[idx]) : null;
    setConsumables((prev) => prev.filter((c) => c.id !== id));
    void medicalService.deleteConsumable(id, currentStaffId).catch(() => {});

    if (existing) {
      registerUndoEntry({
        vertical: 'medical_clinic',
        operationType: 'delete',
        businessId: medCtx.businessId,
        branchId: activeBranchId,
        entityLabel: existing.name,
        summary: pickLocalizedText(language, {
          fr: `Consommable ${existing.name} supprimé`,
          en: `Consumable ${existing.name} deleted`,
          ar: `تم حذف المستلزم ${existing.name}`,
        }),
        undo: () => {
          restoreAt(setConsumables, existing, idx);
          void syncCoordinator
            .restoreRow('medical_consumables', existing.id, currentStaffId)
            .then(() => medicalService.upsertConsumable(cloneSnapshot(existing), medCtx))
            .catch(() => {});
        },
        redo: () => {
          setConsumables((prev) => prev.filter((c) => c.id !== existing.id));
          void medicalService.deleteConsumable(existing.id, currentStaffId).catch(() => {});
        },
      });
    }
  };

  const staffPractitioners = useMemo<MedicalPractitioner[]>(() => {
    const palette = ['#0D9488', '#d4522f', '#2563EB', '#9333EA', '#D97706'];
    return (storeStaff || [])
      .filter((member) => {
        if (!member || member.status === 'terminated' || member.isActive === false) return false;
        const memberBranch = member.branchId || member.facilityId;
        if (memberBranch && memberBranch !== activeBranchId) return false;
        const roleText = String(member.role || '').toLowerCase();
        const isClinicalRole =
          roleText.includes('doctor') ||
          roleText.includes('médecin') ||
          roleText.includes('medecin') ||
          roleText.includes('specialist') ||
          roleText.includes('praticien') ||
          roleText.includes('dentist') ||
          roleText.includes('surgeon') ||
          roleText.includes('généraliste') ||
          roleText.includes('cardiolog') ||
          roleText.includes('pédiatr') ||
          roleText.includes('gynéco');
        return isClinicalRole || Boolean(member.medicalSpecialty) || Boolean(member.orderRegistrationNumber);
      })
      .map((member, idx) => ({
        id: member.id,
        fullName: member.fullName,
        specialty: member.medicalSpecialty || member.technicalSpecialty || String(member.role || 'Médecin'),
        department: 'Cabinet Médical',
        licenseNumber: member.orderRegistrationNumber || 'CNOM-EN-COURS',
        roomNumber: `Cabinet ${idx + 1}`,
        phone: member.phoneNumber || '',
        email: member.email || '',
        commissionRatePercent:
          typeof member.serviceCommissionRate === 'number' && member.serviceCommissionRate > 0
            ? member.serviceCommissionRate
            : 70,
        color: palette[idx % palette.length],
        isAvailable: member.status !== 'on_leave' && member.status !== 'frozen' && member.status !== 'vacation',
        branchId: member.branchId || member.facilityId || activeBranchId,
      }));
  }, [storeStaff, activeBranchId]);

  const scopedPractitioners = useMemo(() => {
    const branchDoctors = practitioners.filter((p) => {
      const rec = p as { branchId?: string; facilityId?: string };
      return !rec.branchId && !rec.facilityId ? true : belongsToActiveBranch(p);
    });
    const mergedMap = new Map<string, MedicalPractitioner>();
    const seenNames = new Set<string>();
    staffPractitioners.forEach((doc) => {
      mergedMap.set(doc.id, doc);
      if (doc.fullName) seenNames.add(doc.fullName.trim().toLowerCase());
    });
    branchDoctors.forEach((doc) => {
      const rec = doc as { branchId?: string; facilityId?: string };
      const normName = (doc.fullName || '').trim().toLowerCase();
      if (!rec.branchId && !rec.facilityId && normName && seenNames.has(normName)) {
        return;
      }
      if (!mergedMap.has(doc.id)) {
        mergedMap.set(doc.id, doc);
      }
    });
    return Array.from(mergedMap.values());
  }, [practitioners, staffPractitioners, belongsToActiveBranch]);
  const scopedPatients = useMemo(() => patients.filter(belongsToActiveBranch), [patients, belongsToActiveBranch]);
  const scopedConsultations = useMemo(() => consultations.filter(belongsToActiveBranch), [consultations, belongsToActiveBranch]);
  const scopedAppointments = useMemo(() => appointments.filter(belongsToActiveBranch), [appointments, belongsToActiveBranch]);
  const scopedPrescriptions = useMemo(() => prescriptions.filter(belongsToActiveBranch), [prescriptions, belongsToActiveBranch]);
  const scopedLabRecords = useMemo(() => labRecords.filter(belongsToActiveBranch), [labRecords, belongsToActiveBranch]);
  const scopedCertificates = useMemo(() => certificates.filter(belongsToActiveBranch), [certificates, belongsToActiveBranch]);
  const scopedChifaClaims = useMemo(() => chifaClaims.filter(belongsToActiveBranch), [chifaClaims, belongsToActiveBranch]);
  const scopedConsumables = useMemo(() => consumables.filter(belongsToActiveBranch), [consumables, belongsToActiveBranch]);
  const scopedCashClosures = useMemo(() => cashClosures.filter(belongsToActiveBranch), [cashClosures, belongsToActiveBranch]);
  const scopedChifaBordereaux = useMemo(() => chifaBordereaux.filter(belongsToActiveBranch), [chifaBordereaux, belongsToActiveBranch]);
  const scopedDoctorPayouts = useMemo(() => doctorPayouts.filter(belongsToActiveBranch), [doctorPayouts, belongsToActiveBranch]);

  const getNextAvailableGeneralist = (): MedicalPractitioner | null => {
    const generalists = scopedPractitioners.filter(
      (p) =>
        p.specialty.toLowerCase().includes('générale') ||
        p.department.toLowerCase().includes('générale')
    );
    if (generalists.length === 0) return scopedPractitioners[0] || null;

    const counts = generalists.map((doc) => {
      const count = scopedConsultations.filter(
        (c) => c.status === 'InWaitingQueue' && c.staffId === doc.id
      ).length;
      return { doc, count };
    });

    counts.sort((a, b) => a.count - b.count);
    return counts[0].doc;
  };

  const resetToDemoData = () => {
    const snap = cloneSnapshot(latestRef.current);
    setPractitioners(INITIAL_PRACTITIONERS);
    setDoctorConfigs(DEFAULT_ORDONNANCE_CONFIGS);
    setPatients((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setConsultations((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setAppointments((prev) => prev.filter((a) => !belongsToActiveBranch(a)));
    setPrescriptions((prev) => prev.filter((r) => !belongsToActiveBranch(r)));
    setLabRecords((prev) => prev.filter((l) => !belongsToActiveBranch(l)));
    setCertificates((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setChifaClaims((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setConsumables((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setCashClosures((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    setChifaBordereaux((prev) => prev.filter((b) => !belongsToActiveBranch(b)));
    setDoctorPayouts((prev) => prev.filter((p) => !belongsToActiveBranch(p)));
    setNgapActs([...NGAP_ACT_DEFINITIONS]);
    setIsEmergencyAlarmActive(false);

    registerUndoEntry({
      vertical: 'medical_clinic',
      operationType: 'bulk',
      businessId: medCtx.businessId,
      branchId: activeBranchId,
      summary: pickLocalizedText(language, {
        fr: 'Données cliniques réinitialisées',
        en: 'Clinic data reset',
        ar: 'تمت إعادة ضبط بيانات العيادة',
      }),
      undo: () => {
        const s = cloneSnapshot(snap);
        setPractitioners(s.practitioners);
        setDoctorConfigs(s.doctorConfigs);
        setPatients(s.patients);
        setConsultations(s.consultations);
        setAppointments(s.appointments);
        setPrescriptions(s.prescriptions);
        setLabRecords(s.labRecords);
        setCertificates(s.certificates);
        setChifaClaims(s.chifaClaims);
        setConsumables(s.consumables);
        setCashClosures(s.cashClosures);
        setChifaBordereaux(s.chifaBordereaux);
        setDoctorPayouts(s.doctorPayouts);
        setNgapActs(s.ngapActs);
        setIsEmergencyAlarmActive(s.isEmergencyAlarmActive);
      },
    });
  };

  return {
    practitioners: scopedPractitioners,
    selectedDoctorId,
    setSelectedDoctorId,
    doctorConfigs,
    saveDoctorConfig,
    patients: scopedPatients,
    addPatient,
    updatePatient,
    deletePatient,
    deletePractitioner,
    consultations: scopedConsultations,
    addConsultation,
    updateConsultationStatus,
    markConsultationPaid,
    deleteConsultation,
    appointments: scopedAppointments,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    prescriptions: scopedPrescriptions,
    addPrescription,
    labRecords: scopedLabRecords,
    addLabRecord,
    certificates: scopedCertificates,
    addCertificate,
    chifaClaims: scopedChifaClaims,
    addChifaClaim,
    chifaBordereaux: scopedChifaBordereaux,
    transmitChifaBordereau,
    settleChifaBordereau,
    doctorPayouts: scopedDoctorPayouts,
    issueDoctorPayout,
    ngapActs,
    consumables: scopedConsumables,
    depleteConsumable,
    restockConsumable,
    depleteForAct,
    deleteConsumable,
    cashClosures: scopedCashClosures,
    dailyClosures: scopedCashClosures,
    addCashClosure,
    addDailyClosure: addCashClosure,
    updateDoctorConfig: saveDoctorConfig,
    isEmergencyAlarmActive,
    toggleEmergencyAlarm,
    getNextAvailableGeneralist,
    resetToDemoData,
  };
};

export interface NgapMedicalAct {
  code: 'C' | 'CS' | 'K' | 'KE' | 'ECG';
  label: string;
  category: string;
  conventionFeeDzd: number;
  cnasReimbursementDzd: number;
  ticketModerateurDzd: number;
  linkedConsumables: string[];
}

export const NGAP_ACTS: NgapMedicalAct[] = [
  {
    code: 'C',
    label: 'Consultation Omnipraticien (Médecine Générale)',
    category: 'Consultation',
    conventionFeeDzd: 2500,
    cnasReimbursementDzd: 2000,
    ticketModerateurDzd: 500,
    linkedConsumables: ['CON_01 (Gants d\'examen stériles)'],
  },
  {
    code: 'CS',
    label: 'Consultation Médecin Spécialiste',
    category: 'Consultation Spécialisée',
    conventionFeeDzd: 3500,
    cnasReimbursementDzd: 2800,
    ticketModerateurDzd: 700,
    linkedConsumables: ['CON_01 (Gants d\'examen stériles)'],
  },
  {
    code: 'K',
    label: 'Acte Technique Ambulatoire / Petite Chirurgie',
    category: 'Chirurgie Mineure',
    conventionFeeDzd: 6000,
    cnasReimbursementDzd: 4800,
    ticketModerateurDzd: 1200,
    linkedConsumables: [
      'CON_01 (Gants stériles)',
      'CON_02 (Seringues 5ml)',
      'CON_03 (Bétadine dermique)',
    ],
  },
  {
    code: 'KE',
    label: 'Échographie & Diagnostic Ultrasonore',
    category: 'Imagerie',
    conventionFeeDzd: 5000,
    cnasReimbursementDzd: 4000,
    ticketModerateurDzd: 1000,
    linkedConsumables: ['CON_05 (Gel échographique haute viscosité)'],
  },
  {
    code: 'ECG',
    label: 'Électrocardiogramme Numérique 12 Dérivations',
    category: 'Exploration Fonctionnelle',
    conventionFeeDzd: 3000,
    cnasReimbursementDzd: 2400,
    ticketModerateurDzd: 600,
    linkedConsumables: ['CON_04 (Électrodes ECG adhésives x6)'],
  },
];
