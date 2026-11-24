import React, { useState, useEffect } from 'react';
import { Stethoscope, X, UserCheck, AlertTriangle } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { MedicalPatient, MedicalConsultation } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
    (s) => ({
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
  const [bp, setBp] = useState('120/80');
  const [temp, setTemp] = useState('37.0');
  const [weight, setWeight] = useState('70');
  const [heartRate, setHeartRate] = useState('75');
  const [urgency, setUrgency] = useState<'Normal' | 'Prioritaire' | 'Urgence'>('Normal');
  const [diagnosis, setDiagnosis] = useState('');
  const [fee, setFee] = useState('3000');
  const [copay, setCopay] = useState('600');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPatientId(patient?.id || preselectedPatientId || effectivePatients[0]?.id || '');
    setDoctorId('auto');
    setChiefComplaint('');
    setBp('120/80');
    setTemp('37.0');
    setWeight('70');
    setHeartRate('75');
    setUrgency('Normal');
    setDiagnosis('');
    setFee('3000');
    setCopay('600');
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

    const feeNum = parseFloat(fee) || 3000;
    const copayNum = parseFloat(copay) || 600;

    const created: MedicalConsultation = {
      id: `cons_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: assignedDoc?.id || currentUser?.id || 'staff_01',
      patientId: pat.id,
      patientName: pat.fullName,
      consultationDate: new Date().toISOString(),
      chiefComplaint: chiefComplaint || 'Consultation générale',
      vitals: {
        bloodPressure: bp,
        temperatureCelsius: parseFloat(temp) || 37.0,
        weightKg: parseFloat(weight) || 70,
        heartRateBpm: parseInt(heartRate) || 75,
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
        branchId: currentBranch?.id || 'branch_medical_main',
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
      <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5">
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

          <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1 pr-2">
            <LabelSelect
              label={language === 'ar' ? 'المريض' : 'Patient'}
              value={patientId}
              onChange={setPatientId}
              options={patientOptions}
            />

            <LabelSelect
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
            <div data-sq="card" data-sq-border="none" className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
              <span className="t-small font-semibold text-black dark:text-white">
                {language === 'ar' ? 'درجة الإلحاح / الفرز' : 'Priorité Triage'}
              </span>
              <div className="flex items-center gap-2">
                {(['Normal', 'Prioritaire', 'Urgence'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    onClick={() => setUrgency(lvl)}
                    className={`px-2.5 py-1 t-small font-semibold transition-all cursor-pointer ${
                      urgency === lvl
                        ? lvl === 'Urgence'
                          ? 'bg-rose-600 text-white'
                          : lvl === 'Prioritaire'
                          ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                          : 'bg-[#0D9488] text-white'
                        : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <LabelInput
              label={language === 'ar' ? 'سبب الاستشارة / الشكوى الرئيسية' : 'Motif de consultation / Plainte'}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Ex: Fièvre, céphalées, renouvellement..."
              required
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <LabelInput
                label={language === 'ar' ? 'ضغط الدم (TA)' : 'Tension (TA)'}
                value={bp}
                onChange={(e) => setBp(e.target.value)}
                placeholder="120/80"
              />
              <LabelInput
                label={language === 'ar' ? 'الحرارة (°C)' : 'Temp (°C)'}
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
              />
              <LabelInput
                label={language === 'ar' ? 'الوزن (kg)' : 'Poids (kg)'}
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <LabelInput
                label={language === 'ar' ? 'النبض (bpm)' : 'Pouls (bpm)'}
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
              />
            </div>

            <LabelInput
              label={language === 'ar' ? 'التشخيص الأولي' : 'Diagnostic préliminaire'}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ex: Rhinopharyngite aiguë..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                label={language === 'ar' ? 'أتعاب الكشف (د.ج)' : 'Tarif consultation (DA)'}
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
              <LabelInput
                label={language === 'ar' ? 'حصة المريض / الدفع المباشر (د.ج)' : 'Ticket modérateur patient (DA)'}
                type="number"
                value={copay}
                onChange={(e) => setCopay(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Stethoscope size={14} />}>
              {language === 'ar' ? 'إحالة إلى غرفة الفحص' : 'Admettre en consultation'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
