import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  Stethoscope,
  Microscope,
} from 'lucide-react';
import { MedicalLabRecord, MedicalPatient, MedicalPractitioner } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface MedicalLabViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: MedicalPatient;
  labRecords: MedicalLabRecord[];
  practitioners: MedicalPractitioner[];
  onAddLabRecord: (record: MedicalLabRecord) => void;
}

export const MedicalLabViewerModal: React.FC<MedicalLabViewerModalProps> = ({
  isOpen,
  onClose,
  patient,
  labRecords,
  practitioners,
  onAddLabRecord,
}) => {
  const patientLabs = labRecords.filter((l) => l.patientId === patient.id);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // New Lab Form State
  const [testCategory, setTestCategory] = useState<MedicalLabRecord['testCategory']>('Biochimie Sanguine');
  const [doctorId, setDoctorId] = useState(practitioners[0]?.id || '');
  const [glycemieVal, setGlycemieVal] = useState('1.15');
  const [creatinineVal, setCreatinineVal] = useState('9.5');
  const [hbA1cVal, setHbA1cVal] = useState('6.8');
  const [crpVal, setCrpVal] = useState('4.2');
  const [clinicalConclusion, setClinicalConclusion] = useState('Bilan biologique globalement satisfaisant.');

  if (!isOpen) return null;

  const handleCreateLab = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = practitioners.find((p) => p.id === doctorId);

    const glyNum = parseFloat(glycemieVal) || 1.0;
    const creatNum = parseFloat(creatinineVal) || 10;
    const hbaNum = parseFloat(hbA1cVal) || 6.0;
    const crpNum = parseFloat(crpVal) || 3.0;

    const newLab: MedicalLabRecord = {
      id: `lab_${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId,
      doctorName: doc?.fullName || 'Dr. Praticien',
      testCategory,
      date: new Date().toISOString().slice(0, 10),
      status: 'Validé',
      parameters: [
        {
          name: 'Glycémie à jeun',
          value: glycemieVal,
          unit: 'g/L',
          min: 0.7,
          max: 1.1,
          isAbnormal: glyNum > 1.1 || glyNum < 0.7,
          status: glyNum > 1.1 ? 'high' : glyNum < 0.7 ? 'low' : 'normal',
        },
        {
          name: 'Créatinine Sérique',
          value: creatinineVal,
          unit: 'mg/L',
          min: 7.0,
          max: 12.0,
          isAbnormal: creatNum > 12.0 || creatNum < 7.0,
          status: creatNum > 12.0 ? 'high' : creatNum < 7.0 ? 'low' : 'normal',
        },
        {
          name: 'Hémoglobine Glyquée (HbA1c)',
          value: hbA1cVal,
          unit: '%',
          min: 4.0,
          max: 6.5,
          isAbnormal: hbaNum > 6.5,
          status: hbaNum > 6.5 ? 'high' : 'normal',
        },
        {
          name: 'Protéine C-Réactive (CRP)',
          value: crpVal,
          unit: 'mg/L',
          min: 0,
          max: 6.0,
          isAbnormal: crpNum > 6.0,
          status: crpNum > 6.0 ? 'high' : 'normal',
        },
      ],
      clinicalConclusion,
    };

    onAddLabRecord(newLab);
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-[#F8F9FA] dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center font-bold">
              <Microscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Dossier Biologique & Imagerie Médicale
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                  {patient.fullName}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Suivi des bilans sanguins, biochimie, NFS et rapports échographiques
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-200/80 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Bilans ({patientLabs.length})
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                + Saisir Résultats
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'list' ? (
            patientLabs.length > 0 ? (
              <div className="space-y-4">
                {patientLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white">
                          {lab.testCategory}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">· {lab.date}</span>
                        <span className="text-[10px] font-semibold text-[#0D9488]">· {lab.doctorName}</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {lab.status}
                      </span>
                    </div>

                    {/* Parameters Table */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-750 text-[10px] font-mono uppercase text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                            <th className="py-2 px-3">Paramètre</th>
                            <th className="py-2 px-3">Valeur Mesurée</th>
                            <th className="py-2 px-3">Intervalle Normal</th>
                            <th className="py-2 px-3 text-right">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 font-mono">
                          {lab.parameters.map((param, i) => (
                            <tr key={i} className="hover:bg-neutral-50/50">
                              <td className="py-2 px-3 font-sans font-semibold text-neutral-800 dark:text-neutral-200">
                                {param.name}
                              </td>
                              <td className="py-2 px-3 font-bold text-neutral-900 dark:text-white">
                                {param.value} <span className="text-[10px] text-neutral-400 font-normal">{param.unit}</span>
                              </td>
                              <td className="py-2 px-3 text-neutral-500 text-[11px]">
                                {param.min} – {param.max} {param.unit}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {param.isAbnormal ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
                                    {param.status === 'high' ? 'ÉLEVÉ ▲' : 'BAS ▼'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Normal ✓
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-xs text-neutral-600 dark:text-neutral-300 italic pt-1">
                      <strong>Conclusion Médicale: </strong>
                      {lab.clinicalConclusion}
                    </div>

                    {lab.imagingReport && (
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300">
                        <strong>Rapport d'Imagerie ({lab.imagingModality}): </strong>
                        {lab.imagingReport}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-neutral-400 space-y-2">
                <Microscope size={36} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                <p className="text-xs">Aucun bilan biologique enregistré pour ce patient.</p>
                <AtriumButton variant="secondary" size="sm" onClick={() => setActiveTab('create')}>
                  Saisir le premier bilan
                </AtriumButton>
              </div>
            )
          ) : (
            <form onSubmit={handleCreateLab} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Type de Bilan"
                  value={testCategory}
                  onChange={(val) => setTestCategory(val as any)}
                  options={[
                    { value: 'Biochimie Sanguine', label: 'Biochimie Sanguine' },
                    { value: 'Hématologie (NFS)', label: 'Hématologie (NFS)' },
                    { value: 'Bilan Lipidique', label: 'Bilan Lipidique' },
                    { value: 'Inflammatoire & Cardiaque', label: 'Inflammatoire & Cardiaque' },
                  ]}
                />
                <LabelSelect
                  label="Médecin Prescripteur"
                  value={doctorId}
                  onChange={(val) => setDoctorId(val)}
                  options={practitioners.map((p) => ({ value: p.id, label: p.fullName }))}
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  Valeurs Biologiques Mesurées
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LabelInput
                    label="Glycémie (0.7-1.1 g/L)"
                    value={glycemieVal}
                    onChange={(e) => setGlycemieVal(e.target.value)}
                  />
                  <LabelInput
                    label="Créatinine (7-12 mg/L)"
                    value={creatinineVal}
                    onChange={(e) => setCreatinineVal(e.target.value)}
                  />
                  <LabelInput
                    label="HbA1c (4.0-6.5 %)"
                    value={hbA1cVal}
                    onChange={(e) => setHbA1cVal(e.target.value)}
                  />
                  <LabelInput
                    label="CRP (< 6.0 mg/L)"
                    value={crpVal}
                    onChange={(e) => setCrpVal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Conclusion & Interprétation Clinique
                </label>
                <textarea
                  value={clinicalConclusion}
                  onChange={(e) => setClinicalConclusion(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F8F9FA] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <AtriumButton variant="ghost" type="button" onClick={() => setActiveTab('list')}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit" icon={<CheckCircle2 size={16} />}>
                  Enregistrer le Bilan
                </AtriumButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
