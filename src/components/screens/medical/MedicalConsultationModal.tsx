import React, { useState, useEffect } from 'react';
import { Stethoscope, X, UserCheck, AlertTriangle } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { runUndoBatch } from '../../../services/undoEngine';
import { MedicalPatient, MedicalConsultation } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { useMedicalData } from './medicalData';
import { KineticModalShell } from '../../ui/kinetic';

interface MedicalConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients?: MedicalPatient[];
  patient?: MedicalPatient;
  onSave: (cons: MedicalConsultation) => void;
  preselectedPatientId?: string;
}

export const MedicalConsultationModal: React.FC<MedicalConsultationModalProps> = ({
  isOpen,
  onClose,
  patients = [],
  patient,
  onSave,
  preselectedPatientId,
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
  const { practitioners, getNextAvailableGeneralist, depleteForAct } = useMedicalData();
  const effectivePatients = patient
    ? (patients.some((p) => p.id === patient.id) ? patients : [patient, ...patients])
    : patients;
  const initialPatientId = patient?.id || preselectedPatientId || (effectivePatients[0]?.id || '');
  const [patientId, setPatientId] = useState(initialPatientId);
  const [doctorId, setDoctorId] = useState<string>('auto');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bp, setBp] = useState('');
  const [temp, setTemp] = useState('');
  const [weight, setWeight] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [urgency, setUrgency] = useState<'Normal' | 'Prioritaire' | 'Urgence'>('Normal');
  const [diagnosis, setDiagnosis] = useState('');
  const [fee, setFee] = useState('');
  const [copay, setCopay] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPatientId(patient?.id || preselectedPatientId || effectivePatients[0]?.id || '');
    setDoctorId('auto');
    setChiefComplaint('');
    setBp('');
    setTemp('');
    setWeight('');
    setHeartRate('');
    setUrgency('Normal');
    setDiagnosis('');
    setFee('');
    setCopay('');
    setErrorMessage('');
  }, [isOpen, patient, preselectedPatientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const pat = effectivePatients.find((p) => p.id === patientId) || patient;
    if (!pat) {
      setErrorMessage(language === 'ar' ? 'يرجى اختيار مريض' : 'Veuillez sélectionner un patient');
      return;
    }

    // Strict Inverted Blood Pressure Validation (P_sys > P_dia)
    if (bp.includes('/')) {
      const parts = bp.split('/');
      const sys = parseFloat(parts[0]?.trim());
      const dia = parseFloat(parts[1]?.trim());
      if (!isNaN(sys) && !isNaN(dia)) {
        if (sys <= dia) {
          setErrorMessage(
            language === 'ar'
              ? `خطأ سريري: ضغط الدم الانقباضي (${sys}) يجب أن يكون أكبر قطعاً من الانبساطي (${dia})`
              : `Erreur clinique : La tension systolique (${sys}) doit être strictement supérieure à la diastolique (${dia}) mmHg`
          );
          return;
        }
      }
    }

    // Doctor Resolution: Specific Practitioner or "Next Available Generalist"
    let assignedDoc = practitioners.find((p) => p.id === doctorId);
    if (doctorId === 'auto' || !assignedDoc) {
      assignedDoc = getNextAvailableGeneralist() || practitioners[0];
    }

    const activeAccountId = (pat.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (currentBranch?.id || pat.branchId || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const feeNum = parseFloat(fee);
    const copayNum = copay.trim() === '' ? 0 : parseFloat(copay);
    if (isNaN(feeNum) || feeNum < 0 || isNaN(copayNum) || copayNum < 0) {
      setErrorMessage(
        language === 'ar'
          ? 'يرجى إدخال أتعاب الكشف وحصة المريض بشكل صحيح'
          : 'Veuillez saisir un tarif de consultation valide'
      );
      return;
    }

    const created: MedicalConsultation = {
      id: `cons_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || pat.businessId || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: assignedDoc?.id || currentUser?.id || '',
      patientId: pat.id,
      patientName: pat.fullName,
      consultationDate: new Date().toISOString(),
      chiefComplaint: chiefComplaint || 'Consultation générale',
      vitals: {
        bloodPressure: bp.trim(),
        temperatureCelsius: parseFloat(temp) || 0,
        weightKg: parseFloat(weight) || 0,
        heartRateBpm: parseInt(heartRate, 10) || 0,
      },
      diagnosis: diagnosis || 'Examen clinique en cours',
      status: 'InWaitingQueue',
      consultationFeeDzd: feeNum,
      copayAmountDzd: copayNum,
      insuranceShareDzd: Math.max(0, feeNum - copayNum),
      isPaid: false,
      ticketNumber: `T-${Math.floor(Math.random() * 80) + 101}`,
      notes: urgency !== 'Normal' ? `Priorité: ${urgency}` : undefined,
      createdAt: new Date().toISOString(),
    };

    runUndoBatch(
      {
        vertical: 'medical_clinic',
        operationType: 'create',
        branchId: activeBranchId,
        summary:
          language === 'ar'
            ? `استشارة طبية — ${pat.fullName}`
            : language === 'en'
            ? `Consultation — ${pat.fullName}`
            : `Consultation — ${pat.fullName}`,
        entityLabel: pat.fullName,
        toastType: 'success',
      },
      () => {
        depleteForAct('C');
        onSave(created);
      }
    );
    onClose();
  };

  const patientOptions = effectivePatients.map((p) => ({
    value: p.id,
    label: `${p.fullName} (${p.phone})`,
  }));

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      scrimClassName="bg-black/50"
      ariaLabel={language === 'ar' ? 'فحص واستشارة جديدة' : 'Nouvelle Consultation & Triage'}
    >
      <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2">
              <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                <Stethoscope size={16} />
              </div>
              <h3 className="font-semibold t-label text-black dark:text-white">
                {language === 'ar' ? 'فحص واستشارة جديدة' : 'Nouvelle Consultation & Triage'}
              </h3>
            </div>
            <button
              type="button"
              aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div data-sq="ctl" data-sq-border="none" className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 t-cap flex items-center gap-2 animate-in fade-in">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

          <div className="space-y-3">
            <LabelSelect
              field="patientId"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'المريض' : 'Patient'}
              value={patientId}
              onChange={setPatientId}
              options={patientOptions}
            />

            <LabelSelect
              field="doctorId"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'الطبيب المعالج / التوجيه' : 'Médecin / Affectation Cabinet'}
              value={doctorId}
              onChange={setDoctorId}
              options={[
                { value: 'auto', label: '⭐ Premier Généraliste Disponible (Attente la plus courte)' },
                ...practitioners.map((p) => ({
                  value: p.id,
                  label: `${p.fullName} (${p.specialty} · ${p.roomNumber})`,
                })),
              ]}
            />

            {/* Urgency Level Triage */}
            <div data-sq="card" data-sq-border="none" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
              <span className="t-small font-semibold text-black dark:text-white">
                {language === 'ar' ? 'درجة الإلحاح / الفرز' : 'Priorité Triage'}
              </span>
              <LiveSegmentedControl
                size="sm"
                value={urgency}
                onChange={(v) => setUrgency(v as 'Normal' | 'Prioritaire' | 'Urgence')}
                options={[
                  { value: 'Normal', label: 'Normal' },
                  { value: 'Prioritaire', label: 'Prioritaire' },
                  { value: 'Urgence', label: 'Urgence' },
                ]}
              />
            </div>

            <LabelInput
              field="chiefComplaint"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'سبب الاستشارة / الشكوى الرئيسية' : 'Motif de consultation / Plainte'}
              value={chiefComplaint}
              onChange={setChiefComplaint}
              placeholder="Ex: Fièvre, céphalées, renouvellement..."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <LabelInput
                field="bp"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'ضغط الدم (TA)' : 'Tension (TA)'}
                value={bp}
                onChange={setBp}
                placeholder="120/80"
              />
              <LabelInput
                field="temp"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'الحرارة (°C)' : 'Temp (°C)'}
                type="number"
                step="0.1"
                placeholder="37.0"
                value={temp}
                onChange={setTemp}
              />
              <LabelInput
                field="weight"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'الوزن (kg)' : 'Poids (kg)'}
                type="number"
                placeholder="70"
                value={weight}
                onChange={setWeight}
              />
              <LabelInput
                field="heartRate"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'النبض (bpm)' : 'Pouls (bpm)'}
                type="number"
                placeholder="75"
                value={heartRate}
                onChange={setHeartRate}
              />
            </div>

            <LabelInput
              field="diagnosis"
              width="100%"
              height={40}
              corner={12}
              label={language === 'ar' ? 'التشخيص الأولي' : 'Diagnostic préliminaire'}
              value={diagnosis}
              onChange={setDiagnosis}
              placeholder="Ex: Rhinopharyngite aiguë..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="fee"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'أتعاب الكشف (د.ج)' : 'Tarif consultation (DA)'}
                type="number"
                placeholder="3000"
                value={fee}
                onChange={setFee}
                required
              />
              <LabelInput
                field="copay"
                width="100%"
                height={40}
                corner={12}
                label={language === 'ar' ? 'حصة المريض / الدفع المباشر (د.ج)' : 'Ticket modérateur patient (DA)'}
                type="number"
                placeholder="600"
                value={copay}
                onChange={setCopay}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" tone="accent" size={40} leading={<Stethoscope size={14} />}>
              {language === 'ar' ? 'إحالة إلى غرفة الفحص' : 'Admettre en consultation'}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
