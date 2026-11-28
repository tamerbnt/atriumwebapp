import {
  addCentimes,
  centimesToDzd,
  dzdToCentimes,
  percentOfCentimes,
  roundHalfAwayFromZero,
  subtractCentimes,
} from './money';
import type {
  ChifaClaimRecord,
  ClinicConsumableItem,
  MedicalAppointmentSlot,
  MedicalChifaBordereau,
  MedicalConsumableLot,
  MedicalConsultation,
  MedicalDoctorPayout,
  MedicalPatient,
  MedicalPractitioner,
  MedicalPrescriptionItem,
  ScfJournalCode,
  ScfPostingEventType,
} from '../types';
import type { ScfLineDraftInput } from './scfAccountingEngine';

export interface NgapActDefinition {
  code: 'C' | 'CS' | 'K' | 'KE' | 'ECG' | 'AMI';
  label: string;
  category: string;
  conventionFeeDzd: number;
  cnasReimbursementDzd: number;
  ticketModerateurDzd: number;
  linkedConsumables: Array<{ itemCode: string; label: string; quantity: number }>;
}

export const NGAP_ACT_DEFINITIONS: readonly NgapActDefinition[] = [
  {
    code: 'C',
    label: 'Consultation Omnipraticien (Médecine Générale)',
    category: 'Consultation',
    conventionFeeDzd: 2500,
    cnasReimbursementDzd: 2000,
    ticketModerateurDzd: 500,
    linkedConsumables: [{ itemCode: 'CON_01', label: "Gants d'examen stériles", quantity: 1 }],
  },
  {
    code: 'CS',
    label: 'Consultation Médecin Spécialiste',
    category: 'Consultation Spécialisée',
    conventionFeeDzd: 3500,
    cnasReimbursementDzd: 2800,
    ticketModerateurDzd: 700,
    linkedConsumables: [{ itemCode: 'CON_01', label: "Gants d'examen stériles", quantity: 1 }],
  },
  {
    code: 'K',
    label: 'Acte Technique Ambulatoire / Petite Chirurgie',
    category: 'Chirurgie Mineure',
    conventionFeeDzd: 6000,
    cnasReimbursementDzd: 4800,
    ticketModerateurDzd: 1200,
    linkedConsumables: [
      { itemCode: 'CON_01', label: 'Gants stériles', quantity: 1 },
      { itemCode: 'CON_02', label: 'Seringues 5ml', quantity: 1 },
      { itemCode: 'CON_03', label: 'Sérum physiologique / antiseptique', quantity: 1 },
    ],
  },
  {
    code: 'KE',
    label: 'Échographie & Diagnostic Ultrasonore',
    category: 'Imagerie',
    conventionFeeDzd: 5000,
    cnasReimbursementDzd: 4000,
    ticketModerateurDzd: 1000,
    linkedConsumables: [{ itemCode: 'CON_05', label: 'Gel échographique', quantity: 1 }],
  },
  {
    code: 'ECG',
    label: 'Électrocardiogramme Numérique 12 Dérivations',
    category: 'Exploration Fonctionnelle',
    conventionFeeDzd: 3000,
    cnasReimbursementDzd: 2400,
    ticketModerateurDzd: 600,
    linkedConsumables: [{ itemCode: 'CON_04', label: 'Électrodes ECG adhésives', quantity: 6 }],
  },
  {
    code: 'AMI',
    label: 'Acte Infirmier / Injection & Soins',
    category: 'Soins Infirmiers',
    conventionFeeDzd: 1500,
    cnasReimbursementDzd: 1200,
    ticketModerateurDzd: 300,
    linkedConsumables: [{ itemCode: 'CON_02', label: 'Seringues stériles 5ml', quantity: 1 }],
  },
] as const;

export function getNgapActDefinition(code?: string): NgapActDefinition {
  const found = NGAP_ACT_DEFINITIONS.find((a) => a.code === code);
  return found || NGAP_ACT_DEFINITIONS[0];
}

export interface NgapFeeSplitResult {
  ngapCode: NgapActDefinition['code'];
  totalFeeCentimes: number;
  copayCentimes: number;
  insuranceShareCentimes: number;
  totalFeeDzd: number;
  copayDzd: number;
  insuranceShareDzd: number;
  coveragePercent: 0 | 80 | 100;
}

export function computeNgapFeeSplit(params: {
  ngapCode?: NgapActDefinition['code'];
  customFeeDzd?: number;
  hasChifa100PercentAld?: boolean;
  isChifaInsured?: boolean;
}): NgapFeeSplitResult {
  const def = getNgapActDefinition(params.ngapCode);
  const rawFeeDzd =
    typeof params.customFeeDzd === 'number' && Number.isFinite(params.customFeeDzd) && params.customFeeDzd >= 0
      ? params.customFeeDzd
      : def.conventionFeeDzd;
  const totalFeeCentimes = dzdToCentimes(rawFeeDzd);

  let coveragePercent: 0 | 80 | 100 = 80;
  if (params.hasChifa100PercentAld) {
    coveragePercent = 100;
  } else if (params.isChifaInsured === false) {
    coveragePercent = 0;
  }

  const insuranceShareCentimes =
    coveragePercent === 100
      ? totalFeeCentimes
      : coveragePercent === 80
      ? percentOfCentimes(totalFeeCentimes, 80)
      : 0;
  const copayCentimes = subtractCentimes(totalFeeCentimes, insuranceShareCentimes);

  return {
    ngapCode: def.code,
    totalFeeCentimes,
    copayCentimes,
    insuranceShareCentimes,
    totalFeeDzd: centimesToDzd(totalFeeCentimes),
    copayDzd: centimesToDzd(copayCentimes),
    insuranceShareDzd: centimesToDzd(insuranceShareCentimes),
    coveragePercent,
  };
}

export interface ClinicalBpValidationResult {
  isValid: boolean;
  systolic?: number;
  diastolic?: number;
  errorCode?: 'MEDICAL_INVALID_BP_FORMAT' | 'MEDICAL_INVALID_BP_INVERTED';
  errorMessage?: string;
}

export function validateSystolicDiastolic(systolic: number, diastolic: number): ClinicalBpValidationResult {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic <= 0 || diastolic <= 0 || systolic > 350 || diastolic > 250) {
    return {
      isValid: false,
      errorCode: 'MEDICAL_INVALID_BP_FORMAT',
      errorMessage: 'Valeurs de tension artérielle invalides.',
    };
  }
  if (systolic <= diastolic) {
    return {
      isValid: false,
      systolic,
      diastolic,
      errorCode: 'MEDICAL_INVALID_BP_INVERTED',
      errorMessage: `Erreur clinique : La tension systolique (${systolic}) doit être strictement supérieure à la diastolique (${diastolic}) mmHg`,
    };
  }
  return { isValid: true, systolic, diastolic };
}

export function validateClinicalVitalsBp(bpStr?: string): ClinicalBpValidationResult {
  const clean = (bpStr || '').trim();
  if (!clean) return { isValid: true };
  if (!clean.includes('/')) {
    return {
      isValid: false,
      errorCode: 'MEDICAL_INVALID_BP_FORMAT',
      errorMessage: 'Format attendu pour la tension artérielle : Sys/Dia (ex: 120/80).',
    };
  }
  const parts = clean.split('/');
  const sys = Number(parts[0]?.trim());
  const dia = Number(parts[1]?.trim());
  return validateSystolicDiastolic(sys, dia);
}

export interface ArretDeTravailScheduleResult {
  ok: boolean;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  resumptionDate?: string;
  requiresCnasControlCommission?: boolean;
  errorCode?: 'MEDICAL_INVALID_CERT_RANGE';
  errorMessage?: string;
}

export function computeArretDeTravailSchedule(
  startDate: string,
  endDate: string
): ArretDeTravailScheduleResult {
  const startIso = (startDate || '').trim().slice(0, 10);
  const endIso = (endDate || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) {
    return {
      ok: false,
      errorCode: 'MEDICAL_INVALID_CERT_RANGE',
      errorMessage: "Dates de début et de fin d'arrêt de travail invalides.",
    };
  }
  const startMs = Date.parse(`${startIso}T00:00:00Z`);
  const endMs = Date.parse(`${endIso}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return {
      ok: false,
      errorCode: 'MEDICAL_INVALID_CERT_RANGE',
      errorMessage: "La date de fin de l'arrêt de travail doit être postérieure ou égale à la date de début.",
    };
  }
  const durationDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  const resume = new Date(endMs);
  resume.setUTCDate(resume.getUTCDate() + 1);
  // Algerian workweek: Friday (5) and Saturday (6) are weekend -> shift to Sunday
  if (resume.getUTCDay() === 5) {
    resume.setUTCDate(resume.getUTCDate() + 2);
  } else if (resume.getUTCDay() === 6) {
    resume.setUTCDate(resume.getUTCDate() + 1);
  }
  return {
    ok: true,
    startDate: startIso,
    endDate: endIso,
    durationDays,
    resumptionDate: resume.toISOString().slice(0, 10),
    requiresCnasControlCommission: durationDays > 30,
  };
}

const ALLERGY_CROSS_REACTIVITY_RULES: Array<{
  allergyKeywords: string[];
  drugKeywords: string[];
  severity: 'severe' | 'moderate';
  message: (allergy: string, drug: string) => string;
}> = [
  {
    allergyKeywords: ['penicilline', 'pénicilline', 'penicillin', 'beta-lactamine', 'bêta-lactamine', 'amoxicilline'],
    drugKeywords: [
      'amoxicilline',
      'augmentin',
      'clamoxyl',
      'ampicilline',
      'penicilline',
      'pénicilline',
      'oxacilline',
      'cloxacilline',
      'cefuroxime',
      'ceftriaxone',
      'cefixime',
      'céfixime',
      'oroken',
    ],
    severity: 'severe',
    message: (allergy, drug) =>
      `Contre-indication majeure : Patient allergique à ${allergy}. Risque anaphylactique avec ${drug}.`,
  },
  {
    allergyKeywords: ['aspirine', 'aspirin', 'salicyle', 'salicylé', 'salicylate'],
    drugKeywords: ['aspirin', 'aspirine', 'aspegic', 'aspégic', 'kardegic', 'acetylsalicylique', 'acétylsalicylique'],
    severity: 'severe',
    message: (allergy, drug) =>
      `Contre-indication : Patient allergique à l'${allergy}. Prescription de ${drug} déconseillée.`,
  },
  {
    allergyKeywords: ['ains', 'anti-inflammatoire', 'nsaid'],
    drugKeywords: [
      'ibuprofene',
      'ibuprofène',
      'ibuprofen',
      'voltarene',
      'voltarène',
      'diclofenac',
      'diclofénac',
      'ketoprofene',
      'kétoprofène',
      'bi-profenid',
      'profenid',
      'profénid',
      'naproxene',
      'naproxène',
      'piroxicam',
      'celecoxib',
      'célécoxib',
    ],
    severity: 'severe',
    message: (_allergy, drug) =>
      `Contre-indication : Allergie aux AINS déclarée (${drug}).`,
  },
  {
    allergyKeywords: ['sulfamide', 'sulfonamide', 'bactrim', 'cotrimoxazole'],
    drugKeywords: ['bactrim', 'cotrimoxazole', 'sulfamethoxazole', 'sulfaméthoxazole', 'sulfadiazine'],
    severity: 'severe',
    message: (allergy, drug) =>
      `Contre-indication sévère aux sulfamides (${allergy}) pour ${drug}.`,
  },
  {
    allergyKeywords: ['macrolide', 'azithromycine', 'erythromycine', 'érythromycine'],
    drugKeywords: ['azithromycine', 'zithromax', 'erythromycine', 'érythromycine', 'clarithromycine', 'spiramycine', 'rovamycine'],
    severity: 'moderate',
    message: (allergy, drug) =>
      `Alerte macrolides (${allergy}) détectée pour ${drug}.`,
  },
  {
    allergyKeywords: ['quinolone', 'fluoroquinolone', 'ciprofloxacine'],
    drugKeywords: ['ciprofloxacine', 'ofloxacine', 'levofloxacine', 'lévofloxacine', 'moxifloxacine'],
    severity: 'severe',
    message: (allergy, drug) =>
      `Contre-indication fluoroquinolones (${allergy}) pour ${drug}.`,
  },
];

function normalizeClinicalTerm(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface PrescriptionSafetyEvaluation {
  ok: boolean;
  alerts: string[];
  warnings: string[];
  requiresOverride: boolean;
  errorCode?:
    | 'MEDICAL_RX_EMPTY'
    | 'MEDICAL_RX_INVALID_ITEM'
    | 'MEDICAL_ALLERGY_OVERRIDE_REQUIRED'
    | 'MEDICAL_ALLERGY_REASON_REQUIRED';
  errorMessage?: string;
}

export function evaluatePrescriptionAllergySafety(params: {
  items: MedicalPrescriptionItem[];
  patientAllergies?: string[];
  overrideConfirmed?: boolean;
  overrideReason?: string;
}): PrescriptionSafetyEvaluation {
  const items = Array.isArray(params.items) ? params.items : [];
  if (items.length === 0) {
    return {
      ok: false,
      alerts: [],
      warnings: [],
      requiresOverride: false,
      errorCode: 'MEDICAL_RX_EMPTY',
      errorMessage: 'Veuillez prescrire au moins une spécialité pharmaceutique.',
    };
  }

  for (const item of items) {
    if (!item.drugName || !item.drugName.trim() || Number(item.durationDays || 0) <= 0) {
      return {
        ok: false,
        alerts: [],
        warnings: [],
        requiresOverride: false,
        errorCode: 'MEDICAL_RX_INVALID_ITEM',
        errorMessage: 'Chaque ligne de prescription doit mentionner un médicament et une durée positive.',
      };
    }
  }

  const warnings: string[] = [];
  const seenDrugs = new Set<string>();
  for (const item of items) {
    const norm = normalizeClinicalTerm(item.drugName);
    if (seenDrugs.has(norm)) {
      warnings.push(`Doublon potentiel dans l'ordonnance : ${item.drugName}`);
    }
    seenDrugs.add(norm);
  }

  const allergies = (params.patientAllergies || []).filter((a) => Boolean(a && a.trim()));
  const alerts: string[] = [];

  for (const item of items) {
    const normDrug = normalizeClinicalTerm(item.drugName);
    for (const rawAllergy of allergies) {
      const normAllergy = normalizeClinicalTerm(rawAllergy);
      let matched = false;
      for (const rule of ALLERGY_CROSS_REACTIVITY_RULES) {
        const allergyHit = rule.allergyKeywords.some((kw) => normAllergy.includes(normalizeClinicalTerm(kw)));
        const drugHit = rule.drugKeywords.some((kw) => normDrug.includes(normalizeClinicalTerm(kw)));
        if (allergyHit && drugHit) {
          alerts.push(rule.message(rawAllergy, item.drugName));
          matched = true;
          break;
        }
      }
      if (!matched && normAllergy.length >= 3 && normDrug.includes(normAllergy)) {
        alerts.push(`Alerte allergie déclarée pour : ${rawAllergy} (${item.drugName}).`);
      }
    }
  }

  const uniqueAlerts = Array.from(new Set(alerts));
  const requiresOverride = uniqueAlerts.length > 0;
  if (requiresOverride && !params.overrideConfirmed) {
    return {
      ok: false,
      alerts: uniqueAlerts,
      warnings,
      requiresOverride: true,
      errorCode: 'MEDICAL_ALLERGY_OVERRIDE_REQUIRED',
      errorMessage: 'Confirmation médicale obligatoire suite à une contre-indication allergique.',
    };
  }
  if (requiresOverride && params.overrideConfirmed && !(params.overrideReason || '').trim()) {
    return {
      ok: false,
      alerts: uniqueAlerts,
      warnings,
      requiresOverride: true,
      errorCode: 'MEDICAL_ALLERGY_REASON_REQUIRED',
      errorMessage: 'Veuillez saisir le motif clinique justifiant la dérogation allergique.',
    };
  }

  return {
    ok: true,
    alerts: uniqueAlerts,
    warnings,
    requiresOverride,
  };
}

function toMinutesOfDay(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '09:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatMinutesOfDay(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export interface AppointmentConflictResult {
  ok: boolean;
  conflictingSlot?: MedicalAppointmentSlot;
  errorCode?: 'MEDICAL_APPOINTMENT_OVERLAP' | 'MEDICAL_BYPASS_REASON_REQUIRED';
  errorMessage?: string;
}

export function evaluateAppointmentConflict(params: {
  doctorId: string;
  doctorName?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
  existingAppointments: MedicalAppointmentSlot[];
  isEmergencyBypass?: boolean;
  emergencyBypassReason?: string;
}): AppointmentConflictResult {
  const newStart = toMinutesOfDay(params.startTime);
  const newEnd = newStart + Math.max(5, Number(params.durationMinutes || 30));
  const normDocName = normalizeClinicalTerm(params.doctorName || '');

  const conflict = (params.existingAppointments || []).find((apt) => {
    if (params.excludeAppointmentId && apt.id === params.excludeAppointmentId) return false;
    if (apt.date !== params.date) return false;
    if (apt.status === 'Cancelled' || apt.status === 'NoShow') return false;
    const sameDoc =
      (params.doctorId && apt.doctorId === params.doctorId) ||
      (normDocName && normalizeClinicalTerm(apt.doctorName) === normDocName);
    if (!sameDoc) return false;

    const aptStart = toMinutesOfDay(apt.startTime);
    const aptEnd = aptStart + Math.max(5, Number(apt.durationMinutes || 30));
    return Math.max(newStart, aptStart) < Math.min(newEnd, aptEnd);
  });

  if (!conflict) {
    return { ok: true };
  }

  if (!params.isEmergencyBypass) {
    const endFormatted = formatMinutesOfDay(
      toMinutesOfDay(conflict.startTime) + Math.max(5, Number(conflict.durationMinutes || 30))
    );
    return {
      ok: false,
      conflictingSlot: conflict,
      errorCode: 'MEDICAL_APPOINTMENT_OVERLAP',
      errorMessage: `Conflit d'horaire : ${conflict.doctorName} a déjà un rendez-vous avec ${conflict.patientName} de ${conflict.startTime} à ${endFormatted}.`,
    };
  }

  if (!(params.emergencyBypassReason || '').trim()) {
    return {
      ok: false,
      conflictingSlot: conflict,
      errorCode: 'MEDICAL_BYPASS_REASON_REQUIRED',
      errorMessage: "Veuillez renseigner un motif clinique justifiant la sur-réservation d'urgence.",
    };
  }

  return { ok: true, conflictingSlot: conflict };
}

export interface ConsumableExpirySummary {
  validStockUnits: number;
  expiredStockUnits: number;
  expiredLots: MedicalConsumableLot[];
  expiringSoonLots: MedicalConsumableLot[];
  nearestValidExpiryDate?: string;
}

export function getNormalizedConsumableLots(item: ClinicConsumableItem): MedicalConsumableLot[] {
  if (Array.isArray(item.lots) && item.lots.length > 0) {
    return item.lots
      .map((l) => ({
        lotNumber: String(l.lotNumber || 'LOT-STD').trim(),
        expiryDate: l.expiryDate ? String(l.expiryDate).slice(0, 10) : '',
        quantity: Math.max(0, Number(l.quantity || 0)),
        receivedAt: l.receivedAt,
        unitCostDzd: l.unitCostDzd,
      }))
      .filter((l) => l.quantity > 0 || l.lotNumber.length > 0);
  }
  const qty = Math.max(0, Number(item.currentStockUnits ?? item.currentStock ?? 0));
  if (qty <= 0 && !item.lotNumber) return [];
  return [
    {
      lotNumber: item.lotNumber || 'LOT-INIT',
      expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : '',
      quantity: qty,
      unitCostDzd: item.unitCostDzd,
    },
  ];
}

export function evaluateConsumableExpiryAlerts(
  item: ClinicConsumableItem,
  referenceDate = new Date().toISOString().slice(0, 10)
): ConsumableExpirySummary {
  const refMs = Date.parse(`${referenceDate.slice(0, 10)}T00:00:00Z`);
  const lots = getNormalizedConsumableLots(item).filter((l) => l.quantity > 0);
  const expiredLots: MedicalConsumableLot[] = [];
  const expiringSoonLots: MedicalConsumableLot[] = [];
  let validStockUnits = 0;
  let expiredStockUnits = 0;
  let nearestValidExpiryDate: string | undefined;

  const sorted = [...lots].sort((a, b) =>
    (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31')
  );

  for (const lot of sorted) {
    if (lot.expiryDate) {
      const expMs = Date.parse(`${lot.expiryDate}T00:00:00Z`);
      if (Number.isFinite(expMs) && Number.isFinite(refMs) && expMs < refMs) {
        expiredLots.push(lot);
        expiredStockUnits += lot.quantity;
        continue;
      }
      if (
        Number.isFinite(expMs) &&
        Number.isFinite(refMs) &&
        expMs - refMs <= 30 * 86_400_000
      ) {
        expiringSoonLots.push(lot);
      }
      if (!nearestValidExpiryDate) {
        nearestValidExpiryDate = lot.expiryDate;
      }
    }
    validStockUnits += lot.quantity;
  }

  return {
    validStockUnits,
    expiredStockUnits,
    expiredLots,
    expiringSoonLots,
    nearestValidExpiryDate,
  };
}

export interface FefoConsumeResult {
  ok: boolean;
  updatedItem?: ClinicConsumableItem;
  deductedLots?: Array<{ lotNumber: string; expiryDate?: string; qty: number }>;
  errorCode?:
    | 'MEDICAL_INVALID_CONSUME_QTY'
    | 'MEDICAL_BATCH_EXPIRED'
    | 'MEDICAL_INSUFFICIENT_UNEXPIRED_STOCK';
  errorMessage?: string;
}

export function consumeConsumableFefo(params: {
  item: ClinicConsumableItem;
  quantity: number;
  referenceDate?: string;
}): FefoConsumeResult {
  const qty = Number(params.quantity || 0);
  const referenceDate = (params.referenceDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      ok: false,
      errorCode: 'MEDICAL_INVALID_CONSUME_QTY',
      errorMessage: 'La quantité consommée doit être strictement positive.',
    };
  }

  const expiry = evaluateConsumableExpiryAlerts(params.item, referenceDate);
  if (expiry.validStockUnits <= 0 && expiry.expiredStockUnits > 0) {
    return {
      ok: false,
      errorCode: 'MEDICAL_BATCH_EXPIRED',
      errorMessage: `Lot périmé détecté pour ${params.item.name} — consommation bloquée.`,
    };
  }
  if (expiry.validStockUnits < qty) {
    return {
      ok: false,
      errorCode: 'MEDICAL_INSUFFICIENT_UNEXPIRED_STOCK',
      errorMessage: `Stock non périmé insuffisant pour ${params.item.name} (disponible: ${expiry.validStockUnits}, demandé: ${qty}).`,
    };
  }

  const lots = getNormalizedConsumableLots(params.item);
  const sorted = [...lots].sort(
    (a, b) =>
      (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31') ||
      a.lotNumber.localeCompare(b.lotNumber)
  );

  let remaining = qty;
  const nextLots: MedicalConsumableLot[] = [];
  const deductedLots: Array<{ lotNumber: string; expiryDate?: string; qty: number }> = [];

  for (const lot of sorted) {
    if (lot.quantity <= 0) continue;
    const isExpired = Boolean(lot.expiryDate && lot.expiryDate < referenceDate);
    if (isExpired) {
      nextLots.push({ ...lot });
      continue;
    }
    if (remaining > 0) {
      if (lot.quantity <= remaining) {
        deductedLots.push({
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate || undefined,
          qty: lot.quantity,
        });
        remaining -= lot.quantity;
      } else {
        deductedLots.push({
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate || undefined,
          qty: remaining,
        });
        nextLots.push({
          ...lot,
          quantity: Number((lot.quantity - remaining).toFixed(4)),
        });
        remaining = 0;
      }
    } else {
      nextLots.push({ ...lot });
    }
  }

  const remainingTotal = Math.max(
    0,
    nextLots.reduce((acc, l) => acc + l.quantity, 0)
  );
  const firstActiveLot = nextLots.find(
    (l) => l.quantity > 0 && (!l.expiryDate || l.expiryDate >= referenceDate)
  );

  return {
    ok: true,
    deductedLots,
    updatedItem: {
      ...params.item,
      lots: nextLots,
      lotNumber: firstActiveLot?.lotNumber || params.item.lotNumber,
      expiryDate: firstActiveLot?.expiryDate || params.item.expiryDate,
      currentStock: remainingTotal,
      currentStockUnits: remainingTotal,
    },
  };
}

export function restockConsumableLot(params: {
  item: ClinicConsumableItem;
  quantity: number;
  lotNumber: string;
  expiryDate?: string;
  receivedAt?: string;
}): ClinicConsumableItem {
  const qty = Math.max(0, Number(params.quantity || 0));
  if (qty <= 0) {
    throw new Error('MEDICAL_INVALID_RESTOCK_QTY');
  }
  const cleanLot = (params.lotNumber || '').trim() || `LOT-${Date.now().toString().slice(-6)}`;
  const cleanExpiry = params.expiryDate ? params.expiryDate.slice(0, 10) : '';
  const receivedAt = params.receivedAt || new Date().toISOString().slice(0, 10);

  const existingLots = getNormalizedConsumableLots(params.item);
  const matchIdx = existingLots.findIndex(
    (l) => l.lotNumber === cleanLot && (l.expiryDate || '') === cleanExpiry
  );
  const nextLots = existingLots.map((l) => ({ ...l }));
  if (matchIdx >= 0) {
    nextLots[matchIdx].quantity += qty;
  } else {
    nextLots.push({
      lotNumber: cleanLot,
      expiryDate: cleanExpiry,
      quantity: qty,
      receivedAt,
      unitCostDzd: params.item.unitCostDzd,
    });
  }

  nextLots.sort(
    (a, b) =>
      (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31') ||
      a.lotNumber.localeCompare(b.lotNumber)
  );

  const nextTotal = nextLots.reduce((acc, l) => acc + l.quantity, 0);
  const firstValid = nextLots.find((l) => l.quantity > 0);
  return {
    ...params.item,
    lots: nextLots,
    lotNumber: firstValid?.lotNumber || cleanLot,
    expiryDate: firstValid?.expiryDate || cleanExpiry || undefined,
    currentStock: nextTotal,
    currentStockUnits: nextTotal,
  };
}

export interface PractitionerTurnoverSummary {
  practitioner: MedicalPractitioner;
  periodMonth: string;
  consultationsCount: number;
  grossTurnoverCentimes: number;
  commissionRatePercent: number;
  doctorPayoutCentimes: number;
  polyclinicShareCentimes: number;
  alreadyPaidCentimes: number;
  pendingPayoutCentimes: number;
}

export function aggregatePractitionerTurnovers(params: {
  practitioners: MedicalPractitioner[];
  consultations: MedicalConsultation[];
  payouts?: MedicalDoctorPayout[];
  periodMonth?: string;
}): PractitionerTurnoverSummary[] {
  const periodMonth = (params.periodMonth || '').slice(0, 7);
  const payouts = params.payouts || [];

  return params.practitioners.map((doc) => {
    const normDocName = normalizeClinicalTerm(doc.fullName || doc.name || '');
    const matchingConsults = params.consultations.filter((c) => {
      if (c.status === 'Cancelled') return false;
      if (periodMonth && !(c.consultationDate || '').startsWith(periodMonth)) return false;
      return (
        c.staffId === doc.id ||
        (normDocName && normalizeClinicalTerm(c.doctorName || '') === normDocName)
      );
    });

    const grossTurnoverCentimes = matchingConsults.reduce(
      (sum, c) => addCentimes(sum, dzdToCentimes(Number(c.consultationFeeDzd || 0))),
      0
    );
    const ratePercent = Math.max(0, Math.min(100, Number(doc.commissionRatePercent ?? doc.commissionPercent ?? 70)));
    const doctorPayoutCentimes = percentOfCentimes(grossTurnoverCentimes, ratePercent);
    const polyclinicShareCentimes = subtractCentimes(grossTurnoverCentimes, doctorPayoutCentimes);

    const alreadyPaidCentimes = payouts
      .filter(
        (p) =>
          (p.practitionerId === doc.id || p.practitionerRef === doc.id) &&
          (!periodMonth || p.periodMonth === periodMonth)
      )
      .reduce((sum, p) => addCentimes(sum, roundHalfAwayFromZero(p.doctorPayoutCentimes)), 0);

    const pendingPayoutCentimes = Math.max(
      0,
      subtractCentimes(doctorPayoutCentimes, alreadyPaidCentimes)
    );

    return {
      practitioner: doc,
      periodMonth: periodMonth || new Date().toISOString().slice(0, 7),
      consultationsCount: matchingConsults.length,
      grossTurnoverCentimes,
      commissionRatePercent: ratePercent,
      doctorPayoutCentimes,
      polyclinicShareCentimes,
      alreadyPaidCentimes,
      pendingPayoutCentimes,
    };
  });
}

export interface MedicalScfDraftOutput {
  journalCode: ScfJournalCode;
  entryDate: string;
  pieceRef: string;
  libelle: string;
  sourceVertical: 'medical_clinic';
  sourceEventType: ScfPostingEventType;
  sourceDocId: string;
  idempotencyKey: string;
  currency: 'DZD';
  fxRate: number;
  lines: ScfLineDraftInput[];
}

export function buildDoctorPayoutScfDraft(params: {
  payout: MedicalDoctorPayout;
  paymentMethod?: 'bank_transfer' | 'cash';
}): MedicalScfDraftOutput {
  const bankOrCashCode = params.paymentMethod === 'cash' ? '530000' : '512000';
  const bankOrCashLabel =
    params.paymentMethod === 'cash' ? 'Caisse centrale' : 'Banques comptes courants';
  const journalCode: ScfJournalCode = params.paymentMethod === 'cash' ? 'CA' : 'BQ';

  return {
    journalCode,
    entryDate: (params.payout.issuedAt || new Date().toISOString()).slice(0, 10),
    pieceRef: `HON-${params.payout.periodMonth}-${params.payout.id.slice(-6).toUpperCase()}`,
    libelle: `Rétrocession honoraires — ${params.payout.practitionerName} (${params.payout.periodMonth})`,
    sourceVertical: 'medical_clinic',
    sourceEventType: 'payment',
    sourceDocId: params.payout.id,
    idempotencyKey: `med:payout:${params.payout.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: [
      {
        accountCode: '631000',
        accountLabel: 'Rémunérations & rétrocessions médecins',
        partyName: params.payout.practitionerName,
        debitCentimes: params.payout.doctorPayoutCentimes,
        creditCentimes: 0,
      },
      {
        accountCode: bankOrCashCode,
        accountLabel: bankOrCashLabel,
        partyName: params.payout.practitionerName,
        debitCentimes: 0,
        creditCentimes: params.payout.doctorPayoutCentimes,
      },
    ],
  };
}

export interface BuildChifaBordereauResult {
  ok: boolean;
  bordereau?: MedicalChifaBordereau;
  errorCode?: 'MEDICAL_BORDEREAU_EMPTY';
  errorMessage?: string;
}

export function buildChifaBordereauBatch(params: {
  id?: string;
  accountId: string;
  businessId: string;
  branchId: string;
  claims: ChifaClaimRecord[];
  periodMonth?: string;
  cnasCenterCode?: string;
  bordereauNumber?: string;
  transmitted?: boolean;
}): BuildChifaBordereauResult {
  const claims = (params.claims || []).filter(Boolean);
  if (claims.length === 0) {
    return {
      ok: false,
      errorCode: 'MEDICAL_BORDEREAU_EMPTY',
      errorMessage: 'Aucune fiche Chifa à télétransmettre.',
    };
  }

  let totalFeeCentimes = 0;
  let totalCnasCentimes = 0;
  let totalCopayCentimes = 0;

  for (const cl of claims) {
    const feeCentimes = dzdToCentimes(Number(cl.totalAmountDzd || 0));
    const cnasCentimes = dzdToCentimes(Number(cl.cnasShareDzd ?? cl.chifaShareDzd ?? 0));
    const copayCentimes = dzdToCentimes(Number(cl.ticketModerateurDzd ?? cl.copayPaidDzd ?? 0));
    totalFeeCentimes = addCentimes(totalFeeCentimes, feeCentimes);
    totalCnasCentimes = addCentimes(totalCnasCentimes, cnasCentimes);
    totalCopayCentimes = addCentimes(totalCopayCentimes, copayCentimes);
  }

  const periodMonth = params.periodMonth || new Date().toISOString().slice(0, 7);
  const nowIso = new Date().toISOString();
  const id = params.id || `bor_${Date.now()}`;
  const bordereauNumber =
    params.bordereauNumber || `BOR-${periodMonth.replace('-', '')}-${String(claims.length).padStart(3, '0')}`;

  return {
    ok: true,
    bordereau: {
      id,
      accountId: params.accountId,
      businessId: params.businessId,
      branchId: params.branchId,
      bordereauNumber,
      periodMonth,
      cnasCenterCode: params.cnasCenterCode || '1601',
      status: params.transmitted ? 'Transmitted' : 'Draft',
      claimsCount: claims.length,
      totalFeeCentimes,
      totalCnasCentimes,
      totalCopayCentimes,
      claimIds: claims.map((c) => c.id),
      transmittedAt: params.transmitted ? nowIso : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };
}

export function buildChifaSettlementScfDraft(params: {
  bordereau: MedicalChifaBordereau;
  settlementDate?: string;
  settlementReference?: string;
}): MedicalScfDraftOutput {
  const entryDate = (params.settlementDate || new Date().toISOString()).slice(0, 10);
  const ref = params.settlementReference?.trim() || params.bordereau.bordereauNumber;
  return {
    journalCode: 'BQ',
    entryDate,
    pieceRef: ref,
    libelle: `Virement CNAS Chifa — ${params.bordereau.bordereauNumber} (${params.bordereau.claimsCount} dossiers)`,
    sourceVertical: 'medical_clinic',
    sourceEventType: 'payment',
    sourceDocId: params.bordereau.id,
    idempotencyKey: `med:chifa-settle:${params.bordereau.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: [
      {
        accountCode: '512000',
        accountLabel: 'Banques comptes courants',
        partyName: `CNAS Centre ${params.bordereau.cnasCenterCode}`,
        debitCentimes: params.bordereau.totalCnasCentimes,
        creditCentimes: 0,
      },
      {
        accountCode: '411000',
        accountLabel: 'Créances Tiers-Payant CNAS',
        partyName: `CNAS Centre ${params.bordereau.cnasCenterCode}`,
        debitCentimes: 0,
        creditCentimes: params.bordereau.totalCnasCentimes,
      },
    ],
  };
}

export interface MedicalDailyCashSummary {
  expectedCashCentimes: number;
  expectedCashDzd: number;
  totalCashCollectedCentimes: number;
  totalBaridiMobCentimes: number;
  totalCardCentimes: number;
  totalChifaDirectCentimes: number;
  totalChifaVouchersCentimes: number;
  countedCashCentimes: number;
  discrepancyCentimes: number;
  discrepancyDzd: number;
  status: 'balanced' | 'variance_flagged';
  paidConsultationsCount: number;
}

export function reconcileMedicalDailyCash(params: {
  consultations: MedicalConsultation[];
  targetDate?: string;
  countedCashDzd?: number;
  openingFloatDzd?: number;
}): MedicalDailyCashSummary {
  const filterDate = params.targetDate ? params.targetDate.slice(0, 10) : '';
  const paidConsultations = (params.consultations || []).filter((c) => {
    if (!c.isPaid || c.status === 'Cancelled') return false;
    if (filterDate && !(c.consultationDate || '').startsWith(filterDate)) return false;
    return true;
  });

  let cashCollectedCentimes = 0;
  let baridiMobCentimes = 0;
  let cardCentimes = 0;
  let chifaDirectCentimes = 0;
  let chifaVouchersCentimes = 0;

  for (const c of paidConsultsOrEmpty(paidConsultations)) {
    const copayDzd = Number.isFinite(c.copayAmountDzd) ? Math.max(0, c.copayAmountDzd) : 0;
    const copayCentimes = dzdToCentimes(copayDzd);
    const insCentimes = dzdToCentimes(
      Number.isFinite(c.insuranceShareDzd) ? Math.max(0, c.insuranceShareDzd) : 0
    );
    chifaVouchersCentimes = addCentimes(chifaVouchersCentimes, insCentimes);

    const method = c.paymentMethod || 'Cash';
    if (method === 'BaridiMob') {
      baridiMobCentimes = addCentimes(baridiMobCentimes, copayCentimes);
    } else if (method === 'Card') {
      cardCentimes = addCentimes(cardCentimes, copayCentimes);
    } else if (method === 'ChifaDirect') {
      chifaDirectCentimes = addCentimes(chifaDirectCentimes, copayCentimes);
    } else {
      cashCollectedCentimes = addCentimes(cashCollectedCentimes, copayCentimes);
    }
  }

  const openingCentimes = dzdToCentimes(Math.max(0, Number(params.openingFloatDzd || 0)));
  const expectedCashCentimes = addCentimes(openingCentimes, cashCollectedCentimes);
  const countedCashCentimes = dzdToCentimes(Math.max(0, Number(params.countedCashDzd ?? centimesToDzd(expectedCashCentimes))));
  const discrepancyCentimes = subtractCentimes(countedCashCentimes, expectedCashCentimes);

  return {
    expectedCashCentimes,
    expectedCashDzd: centimesToDzd(expectedCashCentimes),
    totalCashCollectedCentimes: cashCollectedCentimes,
    totalBaridiMobCentimes: baridiMobCentimes,
    totalCardCentimes: cardCentimes,
    totalChifaDirectCentimes: chifaDirectCentimes,
    totalChifaVouchersCentimes: chifaVouchersCentimes,
    countedCashCentimes,
    discrepancyCentimes,
    discrepancyDzd: centimesToDzd(discrepancyCentimes),
    status: discrepancyCentimes === 0 ? 'balanced' : 'variance_flagged',
    paidConsultationsCount: paidConsultations.length,
  };
}

function paidConsultsOrEmpty(list: MedicalConsultation[]): MedicalConsultation[] {
  return Array.isArray(list) ? list : [];
}

export function resolvePatientChifaCoverageRate(patient?: MedicalPatient | null): 80 | 100 {
  return patient?.hasChifa100PercentAld ? 100 : 80;
}
