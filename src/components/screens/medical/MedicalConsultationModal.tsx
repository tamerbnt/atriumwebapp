import React, { useState } from 'react';
import { Stethoscope, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPatient, MedicalConsultation } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface MedicalConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: MedicalPatient[];
  onSave: (cons: MedicalConsultation) => void;
  preselectedPatientId?: string;
}

export const MedicalConsultationModal: React.FC<MedicalConsultationModalProps> = ({
  isOpen,
  onClose,
  patients,
  onSave,
  preselectedPatientId,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [patientId, setPatientId] = useState(preselectedPatientId || (patients[0]?.id || ''));
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bp, setBp] = useState('120/80');
  const [temp, setTemp] = useState('37.0');
  const [weight, setWeight] = useState('70');
  const [heartRate, setHeartRate] = useState('75');
  const [diagnosis, setDiagnosis] = useState('');
  const [fee, setFee] = useState('3000');
  const [copay, setCopay] = useState('600');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === patientId);
    if (!pat) {
      showToast(
        language === 'ar' ? 'يرجى اختيار مريض' : 'Veuillez sélectionner un patient',
        'error'
      );
      return;
    }

    const feeNum = parseFloat(fee) || 3000;
    const copayNum = parseFloat(copay) || 600;

    const created: MedicalConsultation = {
      id: `cons_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_medical',
      branchId: currentBranch?.id || 'branch_medical_main',
      staffId: currentUser?.id || 'staff_01',
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
      createdAt: new Date().toISOString(),
    };

    onSave(created);
    showToast(
      language === 'ar'
        ? 'تم تسجيل الاستشارة وإضافة المريض لقائمة الانتظار'
        : 'Patient admis en salle d\'attente / consultation',
      'success'
    );
    onClose();
  };

  const patientOptions = patients.map((p) => ({
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
          <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1 pr-2">
            <LabelSelect
              label={language === 'ar' ? 'المريض' : 'Patient'}
              value={patientId}
              onChange={setPatientId}
              options={patientOptions}
            />

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
