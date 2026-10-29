import React, { useState } from 'react';
import { Stethoscope, X, UserCheck, AlertTriangle } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPatient, MedicalConsultation } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useMedicalData } from './medicalData';

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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
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

  if (!isOpen) return null;

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

    // Auto-deplete standard consultation consumable
    depleteForAct('C');

    onSave(created);
    showToast(
      language === 'ar'
        ? `تم تسجيل المريض وتوجيهه إلى ${assignedDoc?.roomNumber || 'العيادة'}`
        : `Patient admis et orienté vers ${assignedDoc?.fullName} (${assignedDoc?.roomNumber})`,
      'success'
    );
    onClose();
  };

  const patientOptions = effectivePatients.map((p) => ({
    value: p.id,
    label: `${p.fullName} (${p.phone})`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Stethoscope size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'فحص واستشارة جديدة' : 'Nouvelle Consultation & Triage'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
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
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {language === 'ar' ? 'درجة الإلحاح / الفرز' : 'Priorité Triage'}
              </span>
              <div className="flex items-center gap-1.5">
                {(['Normal', 'Prioritaire', 'Urgence'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setUrgency(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      urgency === lvl
                        ? lvl === 'Urgence'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : lvl === 'Prioritaire'
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'bg-[#0D9488] text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Stethoscope size={14} />}>
              {language === 'ar' ? 'إحالة إلى غرفة الفحص' : 'Admettre en consultation'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
