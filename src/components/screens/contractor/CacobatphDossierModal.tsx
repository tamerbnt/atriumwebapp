import React, { useState } from 'react';
import { Cloud, Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, Users, Calendar, Download } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ContractorProject, ContractorDailyLog } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface CacobatphDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ContractorProject;
  dailyLog?: ContractorDailyLog | null;
}

export const CacobatphDossierModal: React.FC<CacobatphDossierModalProps> = ({
  isOpen,
  onClose,
  project,
  dailyLog,
}) => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

  const [onmBulletin, setOnmBulletin] = useState(dailyLog?.onmBulletinReference || 'ONM-METEO-DZ-2026-8841');
  const [stoppageHours, setStoppageHours] = useState(String(dailyLog?.stoppageHours || 5));
  const [weatherType, setWeatherType] = useState('HeavyRain');
  const [workerCount, setWorkerCount] = useState('24');
  const [cacobatphCenter, setCacobatphCenter] = useState('Agence Régionale Alger Centre');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleValidateDossier = () => {
    if (!onmBulletin.trim()) {
      showToast(
        isAr
          ? 'يرجى إدخال رقم النشرة الجوية الرسمية للديوان الوطني للأرصاد'
          : 'Le numéro de bulletin météo ONM est obligatoire pour la CACOBATPH',
        'error'
      );
      return;
    }
    showToast(
      isAr
        ? 'تم اعتماد ملف التعويض عن سوء الأحوال الجوية CACOBATPH بنجاح'
        : 'Dossier CACOBATPH 48h validé avec succès pour transmission',
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 my-8">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
              <Cloud size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                {isAr
                  ? 'ملف التصريح بالتوقف عن العمل بسبب سوء الأحوال الجوية (CACOBATPH)'
                  : 'Dossier d\'Arrêt Intempéries CACOBATPH (Délai Légal 48h)'}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Décret Exécutif n° 97-47 & Réglementation Chômage-Intempéries BTPH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>
              {isAr ? 'طباعة الملف' : 'Imprimer Bordereau'}
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 48-Hour Legal Countdown Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 print:hidden">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
            <div className="font-bold">
              {isAr ? 'تنبيه الأجل القانوني: 48 ساعة من تاريخ توقف الأشغال' : 'Délai d\'urgence : Déclaration obligatoire sous 48 heures'}
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {isAr
                ? 'يجب إيداع هذا الملف لدى صندوق CACOBATPH مرفقا بالنشرة الرسمية للأرصاد الجوية (ONM) لتعويض أجور العمال.'
                : 'Tout retard au-delà de 48h entraîne la forclusion et la perte des indemnités chômage-intempéries dues aux travailleurs.'}
            </p>
          </div>
        </div>

        {/* Printable Official Sheet */}
        <div className="p-5 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white text-neutral-900 text-xs space-y-5 font-sans">
          {/* Header */}
          <div className="text-center space-y-1 border-b border-neutral-300 pb-3">
            <p className="font-bold text-xs uppercase tracking-wide">
              CAISSE NATIONALE DES CONGÉS PAYÉS ET DU CHÔMAGE-INTEMPÉRIES DU BTPH
            </p>
            <p className="text-[10px] text-neutral-600 font-semibold">
              الصندوق الوطني للعطل المدفوعة الأجر والبطالة الناجمة عن سوء الأحوال الجوية لقطاعات البناء والأشغال العمومية
            </p>
            <div className="text-xs font-bold text-[#C4785A] pt-1">
              DÉCLARATION D'ARRÊT DE CHANTIER POUR INTEMPÉRIES
            </div>
          </div>

          {/* Form details */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="space-y-1 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="font-bold text-neutral-600 uppercase text-[10px]">Chantier & Entreprise</span>
              <div className="font-bold text-neutral-900">{project?.projectName || 'Chantier Réalisation'}</div>
              <div>Lieu: {project?.siteLocation || 'Alger'} (Wilaya {project?.wilayaNumber || 16})</div>
              <div>Agence CACOBATPH: {cacobatphCenter}</div>
            </div>

            <div className="space-y-1 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="font-bold text-neutral-600 uppercase text-[10px]">Justificatif Météorologique</span>
              <div>Date d'arrêt: {dailyLog?.date || new Date().toISOString().split('T')[0]}</div>
              <div className="font-semibold text-blue-700">Durée d'interruption: {stoppageHours} heures consécutives</div>
              <div className="font-mono text-neutral-800">N° Bulletin ONM: {onmBulletin}</div>
            </div>
          </div>

          {/* Interactive Input Form (Non-printed edits) */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                label="N° Bulletin Météorologique ONM"
                value={onmBulletin}
                onChange={(e) => setOnmBulletin(e.target.value)}
                required
              />
              <LabelInput
                label="Heures d'arrêt de travail"
                type="number"
                value={stoppageHours}
                onChange={(e) => setStoppageHours(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                label="Nombre d'ouvriers indemnisables"
                type="number"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
              />
              <LabelInput
                label="Agence régionale CACOBATPH"
                value={cacobatphCenter}
                onChange={(e) => setCacobatphCenter(e.target.value)}
              />
            </div>
          </div>

          {/* Worker muster sample */}
          <div className="space-y-1.5">
            <span className="font-bold text-neutral-700 text-[11px] flex items-center gap-1.5">
              <Users size={14} />
              État nominatif sommaire des travailleurs en chômage-intempéries ({workerCount} déclarés)
            </span>
            <table className="w-full border-collapse border border-neutral-300 text-[10px]">
              <thead>
                <tr className="bg-neutral-100 font-bold text-neutral-700">
                  <th className="border border-neutral-300 p-1.5 text-left">N° Immatriculation CNAS</th>
                  <th className="border border-neutral-300 p-1.5 text-left">Nom & Prénom</th>
                  <th className="border border-neutral-300 p-1.5 text-left">Qualification</th>
                  <th className="border border-neutral-300 p-1.5 text-center">Heures</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-neutral-300 p-1.5 font-mono">16-7844-0912-14</td>
                  <td className="border border-neutral-300 p-1.5 font-medium">Bensalem Ahmed</td>
                  <td className="border border-neutral-300 p-1.5">Coffreur Boiseur Qualifié</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">{stoppageHours}h</td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-1.5 font-mono">16-8120-4491-08</td>
                  <td className="border border-neutral-300 p-1.5 font-medium">Messaoudi Karim</td>
                  <td className="border border-neutral-300 p-1.5">Ferrailleur Chef d'Équipe</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">{stoppageHours}h</td>
                </tr>
                <tr>
                  <td className="border border-neutral-300 p-1.5 font-mono">16-9055-1234-90</td>
                  <td className="border border-neutral-300 p-1.5 font-medium">Zitouni Mustapha</td>
                  <td className="border border-neutral-300 p-1.5">Conducteur d'Engin / Grutier</td>
                  <td className="border border-neutral-300 p-1.5 text-center font-mono">{stoppageHours}h</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Signatures Strip */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-300 text-center text-[10px]">
            <div className="p-2 border border-neutral-200 rounded-lg h-24 flex flex-col justify-between">
              <span className="font-bold text-neutral-600 uppercase">Pour l'Entreprise de BTPH</span>
              <p className="text-[9px] text-neutral-400">Nom, Signature & Cachet de l'Employeur</p>
            </div>
            <div className="p-2 border border-neutral-200 rounded-lg h-24 flex flex-col justify-between">
              <span className="font-bold text-neutral-600 uppercase">Visa de l'Inspection du Travail / BET</span>
              <p className="text-[9px] text-neutral-400">Confirmation de l'arrêt effectif des travaux</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800 print:hidden">
          <AtriumButton variant="outline" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Fermer'}
          </AtriumButton>
          <AtriumButton variant="primary" onClick={handleValidateDossier} icon={<CheckCircle2 size={15} />}>
            {isAr ? 'اعتماد وإرسال إلى CACOBATPH' : 'Valider & Enregistrer Dossier'}
          </AtriumButton>
        </div>
      </div>
    </div>
  );
};
